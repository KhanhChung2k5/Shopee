package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Comparator;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Tier 2 of checkout pricing — invoice-level promotions (promotion_invoice_details): of the programs running
 * now and open to the buyer's tier, the single one giving the biggest discount on the goods subtotal.
 * Applied after SKU prices and before the voucher.
 */
@Service
public class InvoicePromotionService {

    private final PromotionInvoiceDetailRepository details;
    private final PromotionProgramRepository programs;
    private final UserRepository users;

    public InvoicePromotionService(PromotionInvoiceDetailRepository details, PromotionProgramRepository programs,
                                   UserRepository users) {
        this.details = details;
        this.programs = programs;
        this.users = users;
    }

    public record InvoiceDiscount(UUID detailId, BigDecimal amount, String programName) {
    }

    @Transactional(readOnly = true)
    public Optional<InvoiceDiscount> best(UUID userId, BigDecimal subtotal) {
        if (subtotal == null || subtotal.signum() <= 0) return Optional.empty();
        OffsetDateTime now = OffsetDateTime.now();
        String tier = users.findById(userId).map(User::getLoyaltyTier).orElse(null);
        Map<UUID, PromotionProgram> running = programs.findAll().stream()
                .filter(program -> !now.isBefore(program.getStartAt()) && now.isBefore(program.getEndAt()))
                .filter(program -> VoucherEligibility.allowsTier(program, tier))
                .collect(Collectors.toMap(PromotionProgram::getId, Function.identity()));
        return details.findAllByOrderByPromotionProgramIdAsc().stream()
                .filter(detail -> running.containsKey(detail.getPromotionProgramId()))
                .map(detail -> new InvoiceDiscount(detail.getId(), amountOf(detail, subtotal),
                        running.get(detail.getPromotionProgramId()).getName()))
                .filter(discount -> discount.amount().signum() > 0)
                .max(Comparator.comparing(InvoiceDiscount::amount));
    }

    private static BigDecimal amountOf(PromotionInvoiceDetail detail, BigDecimal subtotal) {
        BigDecimal amount = detail.getDiscountAmount() != null
                ? detail.getDiscountAmount()
                : detail.getDiscountPercent() == null ? BigDecimal.ZERO
                : subtotal.multiply(detail.getDiscountPercent()).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
        return amount.min(subtotal).setScale(2, RoundingMode.HALF_UP);
    }
}
