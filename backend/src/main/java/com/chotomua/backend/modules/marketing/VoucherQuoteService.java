package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.dto.VoucherQuoteRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherQuoteResponse;
import java.math.BigDecimal;
import java.util.stream.Collectors;
import java.util.List;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoucherQuoteService {

    private final VoucherRepository vouchers;
    private final PromotionProgramRepository programs;
    private final UserRepository users;
    private final VoucherUsageRepository usages;

    public VoucherQuoteService(VoucherRepository vouchers, PromotionProgramRepository programs, UserRepository users,
                               VoucherUsageRepository usages) {
        this.vouchers = vouchers;
        this.programs = programs;
        this.users = users;
        this.usages = usages;
    }

    /** Quote only. Checkout must call the same rules using its own server-side subtotal. */
    // An unusable voucher is an answer, not a failure: it must not doom the caller's transaction (order preview).
    @Transactional(readOnly = true, noRollbackFor = {IllegalArgumentException.class, NoSuchElementException.class})
    public VoucherQuoteResponse quote(UUID userId, VoucherQuoteRequest request) {
        BigDecimal subtotal = request.subtotal();
        if (subtotal == null || subtotal.signum() <= 0 || subtotal.scale() > 2
                || subtotal.compareTo(new BigDecimal("9999999999.99")) > 0) {
            throw new IllegalArgumentException("Tạm tính phải lớn hơn 0 và tối đa 2 chữ số thập phân");
        }

        Voucher voucher = vouchers.findByCodeIgnoreCase(request.code().trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy voucher"));
        PromotionProgram program = programs.findById(voucher.getPromotionProgramId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy chương trình"));
        User user = users.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài khoản"));

        OffsetDateTime now = OffsetDateTime.now();
        if (!VoucherEligibility.isActive(voucher, program, now)) {
            throw new IllegalArgumentException("Voucher chưa có hiệu lực hoặc đã hết hạn");
        }
        if (!VoucherEligibility.allowsTier(program, user.getLoyaltyTier())) {
            LoyaltyTier minimum = LoyaltyTier.fromCode(program.getTargetLoyaltyTier()).orElseThrow();
            throw new IllegalArgumentException("Voucher chỉ dành cho thành viên hạng " + minimum.label() + " trở lên");
        }
        if (usages.hasActiveUse(voucher.getId(), userId)) {
            throw new IllegalArgumentException("Bạn đã sử dụng voucher này");
        }

        BigDecimal eligible = eligibleSubtotal(voucher, subtotal, request.items());
        BigDecimal discount = "percentage".equals(voucher.getType())
                ? eligible.multiply(voucher.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : voucher.getValue();
        discount = discount.min(eligible);
        return new VoucherQuoteResponse(voucher.getId(), voucher.getCode(), subtotal, discount,
                subtotal.subtract(discount), eligible);
    }

    /** The part of the order a voucher may discount: everything, or only the lines of its product types. */
    private static BigDecimal eligibleSubtotal(Voucher voucher, BigDecimal subtotal, List<VoucherQuoteRequest.Item> items) {
        if (voucher.getTargetProductTypes().isEmpty()) {
            return subtotal;
        }
        String allowed = voucher.getTargetProductTypes().stream().map(VoucherQuoteService::typeLabel)
                .collect(Collectors.joining(", "));
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("Voucher chỉ áp dụng cho " + allowed + " — cần thông tin sản phẩm trong giỏ");
        }
        BigDecimal eligible = items.stream()
                .filter(item -> VoucherEligibility.coversProductType(voucher, item.productType()))
                .map(VoucherQuoteRequest.Item::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (eligible.signum() <= 0) {
            throw new IllegalArgumentException("Voucher chỉ áp dụng cho " + allowed + ", giỏ hàng chưa có sản phẩm phù hợp");
        }
        return eligible.min(subtotal);
    }

    static String typeLabel(String productType) {
        return switch (productType) {
            case "game_disc" -> "đĩa game";
            case "controller" -> "tay cầm";
            case "accessory" -> "phụ kiện";
            default -> productType;
        };
    }
}
