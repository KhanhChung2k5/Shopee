package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.VoucherRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoucherService {

    private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");
    /** Same values as products.product_type. */
    static final java.util.Set<String> PRODUCT_TYPES = java.util.Set.of("game_disc", "controller", "accessory");

    private final VoucherRepository vouchers;
    private final PromotionProgramRepository programs;

    public VoucherService(VoucherRepository vouchers, PromotionProgramRepository programs) {
        this.vouchers = vouchers;
        this.programs = programs;
    }

    @Transactional(readOnly = true)
    public List<VoucherResponse> list() {
        java.util.Map<UUID, Long> used = usages == null ? java.util.Map.of() : usages.activeUsesByVoucher();
        return vouchers.findAllByOrderByCodeAsc().stream()
                .map(voucher -> VoucherResponse.from(voucher, used.getOrDefault(voucher.getId(), 0L)))
                .toList();
    }

    @Transactional
    public VoucherResponse create(VoucherRequest request) {
        validate(request);
        String code = normalizedCode(request.code());
        ensureCodeAvailable(code, null);
        return VoucherResponse.from(vouchers.save(new Voucher(request, code)));
    }

    @Transactional
    public VoucherResponse update(UUID id, VoucherRequest request) {
        Voucher voucher = requireVoucher(id);
        validate(request);
        String code = normalizedCode(request.code());
        ensureCodeAvailable(code, id);
        if (usages != null && usages.existsByVoucherId(id) && changesTerms(voucher, request, code)) {
            // Orders already priced with these terms; changing them would leave the campaign impossible to audit.
            throw new IllegalArgumentException(
                    "Voucher đã có đơn sử dụng — chỉ được đổi hạn dùng và tổng lượt dùng; muốn đổi điều kiện hãy tạo voucher mới");
        }
        voucher.update(request, code);
        return VoucherResponse.from(voucher, usages == null ? 0 : usages.countActiveUses(id));
    }

    /** Optional so the focused unit tests keep their two-argument constructor. */
    private VoucherUsageRepository usages;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setUsages(VoucherUsageRepository usages) {
        this.usages = usages;
    }

    @Transactional
    public void delete(UUID id) {
        Voucher voucher = requireVoucher(id);
        // Orders keep a record of the voucher they used; end it instead (an expiry date in the past).
        if (usages != null && usages.existsByVoucherId(id)) {
            throw new IllegalArgumentException("Voucher đã được dùng cho đơn hàng nên không xoá được — hãy đặt hạn dùng để ngừng phát hành");
        }
        vouchers.delete(voucher);
    }

    private void validate(VoucherRequest request) {
        PromotionProgram program = programs.findById(request.promotionProgramId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy chương trình"));
        BigDecimal value = request.value();
        if (value == null || value.signum() <= 0 || value.scale() > 2 || value.compareTo(MAX_AMOUNT) > 0) {
            throw new IllegalArgumentException("Giá trị voucher phải lớn hơn 0 và tối đa 2 chữ số thập phân");
        }
        if (!"percentage".equals(request.type()) && !"fixed_amount".equals(request.type())) {
            throw new IllegalArgumentException("Loại voucher không hợp lệ");
        }
        if ("percentage".equals(request.type()) && value.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Voucher giảm phần trăm không thể vượt 100%");
        }
        if (request.expiresAt() != null && request.expiresAt().isBefore(program.getStartAt())) {
            throw new IllegalArgumentException("Hạn dùng voucher không thể trước ngày bắt đầu chương trình");
        }
        if (request.expiresAt() != null && request.expiresAt().isAfter(program.getEndAt())) {
            throw new IllegalArgumentException("Hạn dùng voucher không thể sau ngày kết thúc chương trình");
        }
        if (request.targetProductTypes() != null && !PRODUCT_TYPES.containsAll(request.targetProductTypes())) {
            throw new IllegalArgumentException("Loại sản phẩm không hợp lệ (game_disc, controller, accessory)");
        }
        validateLimits(request);
    }

    /** Whether the request touches anything other than the expiry date and the total number of uses. */
    static boolean changesTerms(Voucher voucher, VoucherRequest request, String code) {
        java.util.List<String> types = request.targetProductTypes() == null ? java.util.List.of()
                : java.util.List.copyOf(new java.util.LinkedHashSet<>(request.targetProductTypes()));
        return !voucher.getPromotionProgramId().equals(request.promotionProgramId())
                || !voucher.getCode().equals(code)
                || !voucher.getType().equals(request.type())
                || !sameAmount(voucher.getValue(), request.value())
                || !new java.util.HashSet<>(voucher.getTargetProductTypes()).equals(new java.util.HashSet<>(types))
                || !sameAmount(voucher.getMinOrderAmount(), request.minOrderAmount())
                || !sameAmount(voucher.getMaxDiscountAmount(), request.maxDiscountAmount())
                || voucher.isNewCustomersOnly() != Boolean.TRUE.equals(request.newCustomersOnly());
    }

    static boolean sameAmount(BigDecimal a, BigDecimal b) {
        return a == null ? b == null : b != null && a.compareTo(b) == 0;
    }

    private static void validateLimits(VoucherRequest request) {
        BigDecimal minOrder = request.minOrderAmount();
        if (minOrder != null && (minOrder.signum() <= 0 || minOrder.scale() > 2 || minOrder.compareTo(MAX_AMOUNT) > 0)) {
            throw new IllegalArgumentException("Đơn tối thiểu phải lớn hơn 0 và tối đa 2 chữ số thập phân");
        }
        BigDecimal maxDiscount = request.maxDiscountAmount();
        if (maxDiscount != null) {
            if (!"percentage".equals(request.type())) {
                throw new IllegalArgumentException("Giảm tối đa chỉ dùng cho voucher giảm phần trăm");
            }
            if (maxDiscount.signum() <= 0 || maxDiscount.scale() > 2 || maxDiscount.compareTo(MAX_AMOUNT) > 0) {
                throw new IllegalArgumentException("Giảm tối đa phải lớn hơn 0 và tối đa 2 chữ số thập phân");
            }
        }
        // A fixed voucher worth more than the minimum order would hand out goods for free.
        if ("fixed_amount".equals(request.type()) && minOrder != null && request.value().compareTo(minOrder) > 0) {
            throw new IllegalArgumentException("Voucher giảm số tiền không thể lớn hơn đơn tối thiểu");
        }
        if (request.usageLimit() != null && request.usageLimit() <= 0) {
            throw new IllegalArgumentException("Tổng lượt dùng phải lớn hơn 0");
        }
    }

    private Voucher requireVoucher(UUID id) {
        return vouchers.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy voucher"));
    }

    private void ensureCodeAvailable(String code, UUID currentId) {
        vouchers.findByCodeIgnoreCase(code).ifPresent(existing -> {
            if (currentId == null || !currentId.equals(existing.getId())) {
                throw new IllegalArgumentException("Mã voucher đã tồn tại");
            }
        });
    }

    private static String normalizedCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }
}
