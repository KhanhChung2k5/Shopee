package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.dto.AvailableVoucherResponse;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoucherDiscoveryService {

    private final VoucherRepository vouchers;
    private final PromotionProgramRepository programs;
    private final UserRepository users;

    public VoucherDiscoveryService(VoucherRepository vouchers, PromotionProgramRepository programs,
                                   UserRepository users) {
        this.vouchers = vouchers;
        this.programs = programs;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<AvailableVoucherResponse> availableFor(UUID userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy tài khoản"));
        Map<UUID, PromotionProgram> programsById = programs.findAll().stream()
                .collect(Collectors.toMap(PromotionProgram::getId, Function.identity()));
        OffsetDateTime now = OffsetDateTime.now();

        return vouchers.findAllByOrderByCodeAsc().stream()
                .filter(voucher -> {
                    PromotionProgram program = programsById.get(voucher.getPromotionProgramId());
                    return program != null && VoucherEligibility.isActive(voucher, program, now)
                            && VoucherEligibility.allowsTier(program, user.getLoyaltyTier());
                })
                .map(voucher -> AvailableVoucherResponse.from(voucher, programsById.get(voucher.getPromotionProgramId())))
                .toList();
    }
}
