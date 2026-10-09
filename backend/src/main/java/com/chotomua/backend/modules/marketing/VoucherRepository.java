package com.chotomua.backend.modules.marketing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoucherRepository extends JpaRepository<Voucher, UUID> {
    List<Voucher> findAllByOrderByCodeAsc();
    Optional<Voucher> findByCodeIgnoreCase(String code);
    List<Voucher> findByPromotionProgramId(UUID promotionProgramId);
    boolean existsByPromotionProgramId(UUID promotionProgramId);
}
