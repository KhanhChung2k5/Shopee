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

    /** "150.000 ₫" — the way amounts read on the shop pages (NumberFormat is not thread-safe, so one per call). */
    static String vnd(BigDecimal amount) {
        java.text.NumberFormat format = java.text.NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN"));
        format.setMaximumFractionDigits(0);
        return format.format(amount);
    }

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
        return evaluate(userId, request, false);
    }

    /**
     * The same rules while placing an order: the voucher row stays locked until the order commits, so the last use
     * of a limited code goes to one buyer only.
     */
    @Transactional
    public VoucherQuoteResponse quoteForCheckout(UUID userId, VoucherQuoteRequest request) {
        return evaluate(userId, request, true);
    }

    private VoucherQuoteResponse evaluate(UUID userId, VoucherQuoteRequest request, boolean lock) {
        BigDecimal subtotal = request.subtotal();
        if (subtotal == null || subtotal.signum() <= 0 || subtotal.scale() > 2
                || subtotal.compareTo(new BigDecimal("9999999999.99")) > 0) {
            throw new IllegalArgumentException("Tạm tính phải lớn hơn 0 và tối đa 2 chữ số thập phân");
        }

        Voucher voucher = vouchers.findByCodeIgnoreCase(request.code().trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy voucher"));
        if (lock) {
            voucher = vouchers.findByIdForUpdate(voucher.getId()).orElse(voucher);
        }
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
        if (voucher.isNewCustomersOnly() && usages.hasPlacedOrder(userId)) {
            throw new IllegalArgumentException("Voucher chỉ dành cho khách hàng mới (đơn hàng đầu tiên)");
        }
        if (usages.hasActiveUse(voucher.getId(), userId)) {
            throw new IllegalArgumentException("Bạn đã sử dụng voucher này");
        }
        if (voucher.getUsageLimit() != null && usages.countActiveUses(voucher.getId()) >= voucher.getUsageLimit()) {
            throw new IllegalArgumentException("Voucher đã hết lượt sử dụng");
        }

        BigDecimal eligible = eligibleSubtotal(voucher, subtotal, request.items());
        BigDecimal goods = minimumOrderBase(voucher, subtotal, request.items());
        if (voucher.getMinOrderAmount() != null && goods.compareTo(voucher.getMinOrderAmount()) < 0) {
            throw new IllegalArgumentException("Voucher áp dụng cho đơn từ " + vnd(voucher.getMinOrderAmount())
                    + (voucher.getTargetProductTypes().isEmpty() ? "" : " (tính trên sản phẩm phù hợp)")
                    + ", còn thiếu " + vnd(voucher.getMinOrderAmount().subtract(goods)));
        }
        BigDecimal discount = "percentage".equals(voucher.getType())
                ? eligible.multiply(voucher.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : voucher.getValue();
        if (voucher.getMaxDiscountAmount() != null) {
            discount = discount.min(voucher.getMaxDiscountAmount());
        }
        discount = discount.min(eligible);
        return new VoucherQuoteResponse(voucher.getId(), voucher.getCode(), subtotal, discount,
                subtotal.subtract(discount), eligible);
    }

    /**
     * What a voucher's minimum order is measured against: the value of its lines before the invoice promotion, the
     * same figure the buyer sees as "Tạm tính" and the refund rules use. {@code subtotal} has that promotion taken off.
     */
    private static BigDecimal minimumOrderBase(Voucher voucher, BigDecimal subtotal, List<VoucherQuoteRequest.Item> items) {
        if (items == null || items.isEmpty()) {
            return subtotal;
        }
        return items.stream()
                .filter(item -> voucher.getTargetProductTypes().isEmpty()
                        || VoucherEligibility.coversProductType(voucher, item.productType()))
                .map(VoucherQuoteRequest.Item::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
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
