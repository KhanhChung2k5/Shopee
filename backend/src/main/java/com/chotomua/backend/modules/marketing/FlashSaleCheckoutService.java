package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.order.ProductVariantSnapshot;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Tier 1 of checkout pricing — the price of each SKU line (promotion_product_details):
 * a running Flash Sale price wins; otherwise the best "% off" SKU discount; otherwise list price.
 * Only programs inside their dates and open to the buyer's loyalty tier count. Invoice-level discounts
 * ({@link InvoicePromotionService}) and the voucher are applied on top, in that order, by OrderService.
 */
@Service
public class FlashSaleCheckoutService {

    private final PromotionProductDetailRepository details;
    private final PromotionProgramRepository programs;
    private final UserRepository users;

    @Autowired
    public FlashSaleCheckoutService(PromotionProductDetailRepository details, PromotionProgramRepository programs,
                                    UserRepository users) {
        this.details = details;
        this.programs = programs;
        this.users = users;
    }

    /** Tests that do not care about tiers (buyer treated as bronze). */
    FlashSaleCheckoutService(PromotionProductDetailRepository details, PromotionProgramRepository programs) {
        this(details, programs, null);
    }

    /** Price a line at checkout and take the flash-sale quantity it uses. */
    public ProductVariantSnapshot apply(UUID variantId, int quantity, ProductVariantSnapshot base) {
        return apply(null, variantId, quantity, base, true);
    }

    /**
     * @param reserve true when the order is really being placed (locks the rows and counts sold_qty);
     *                false for a checkout preview, which must not change anything.
     */
    public ProductVariantSnapshot apply(UUID userId, UUID variantId, int quantity, ProductVariantSnapshot base, boolean reserve) {
        OffsetDateTime now = OffsetDateTime.now();
        String tier = userId == null || users == null ? null : users.findById(userId).map(User::getLoyaltyTier).orElse(null);
        List<Candidate> active = (reserve ? details.findByVariantId(variantId) : details.readByVariantId(variantId)).stream()
                .map(detail -> programs.findById(detail.getPromotionProgramId())
                        .filter(program -> !now.isBefore(program.getStartAt()) && now.isBefore(program.getEndAt()))
                        .filter(program -> VoucherEligibility.allowsTier(program, tier))
                        .map(program -> new Candidate(detail, program)))
                .flatMap(Optional::stream)
                .toList();

        Optional<Candidate> flash = active.stream()
                .filter(c -> c.detail().getFlashPrice() != null && c.detail().getFlashPrice().compareTo(base.unitPrice()) < 0)
                .min(Comparator.comparing(c -> c.detail().getFlashPrice()));
        if (flash.isPresent()) {
            PromotionProductDetail detail = flash.get().detail();
            if (reserve) {
                detail.reserveFlashQuantity(quantity); // throws "hết số lượng" past limit_qty
            } else if (detail.getLimitQty() != null && detail.getSoldQty() + quantity > detail.getLimitQty()) {
                throw new IllegalStateException("Flash Sale đã hết số lượng ưu đãi");
            }
            return base.withPromotion(detail.getFlashPrice(),
                    new ProductVariantSnapshot.Promotion(detail.getId(), true, base.unitPrice(), flash.get().program().getName()));
        }

        Optional<Candidate> percent = active.stream()
                .filter(c -> c.detail().getDiscountPercent() != null && c.detail().getDiscountPercent().signum() > 0)
                .max(Comparator.comparing(c -> c.detail().getDiscountPercent()));
        if (percent.isPresent()) {
            BigDecimal pct = percent.get().detail().getDiscountPercent().min(BigDecimal.valueOf(100));
            BigDecimal price = base.unitPrice().multiply(BigDecimal.valueOf(100).subtract(pct))
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP).setScale(2, RoundingMode.UNNECESSARY);
            return base.withPromotion(price,
                    new ProductVariantSnapshot.Promotion(percent.get().detail().getId(), false, base.unitPrice(), percent.get().program().getName()));
        }
        return base;
    }

    /** A cancelled order gives its flash-sale units back to the promotion. */
    public void releaseFlash(UUID detailId, int quantity) {
        details.findById(detailId).ifPresent(detail -> detail.releaseFlashQuantity(quantity));
    }

    private record Candidate(PromotionProductDetail detail, PromotionProgram program) {
    }
}
