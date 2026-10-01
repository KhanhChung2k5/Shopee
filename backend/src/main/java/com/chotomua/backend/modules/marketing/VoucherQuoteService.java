package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.dto.VoucherQuoteRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherQuoteResponse;
import java.math.BigDecimal;
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

    public VoucherQuoteService(VoucherRepository vouchers, PromotionProgramRepository programs, UserRepository users) {
        this.vouchers = vouchers;
        this.programs = programs;
        this.users = users;
    }

    /** Quote only. Checkout must call the same rules using its own server-side subtotal. */
    @Transactional(readOnly = true)
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
        if (now.isBefore(program.getStartAt()) || !now.isBefore(program.getEndAt())
                || (voucher.getExpiresAt() != null && !now.isBefore(voucher.getExpiresAt()))) {
            throw new IllegalArgumentException("Voucher chưa có hiệu lực hoặc đã hết hạn");
        }
        String requiredTier = program.getTargetLoyaltyTier();
        if (requiredTier != null && (user.getLoyaltyTier() == null
                || !requiredTier.equalsIgnoreCase(user.getLoyaltyTier()))) {
            throw new IllegalArgumentException("Voucher không áp dụng cho hạng thành viên này");
        }

        BigDecimal discount = "percentage".equals(voucher.getType())
                ? subtotal.multiply(voucher.getValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : voucher.getValue();
        discount = discount.min(subtotal);
        return new VoucherQuoteResponse(voucher.getId(), voucher.getCode(), subtotal, discount,
                subtotal.subtract(discount));
    }
}
