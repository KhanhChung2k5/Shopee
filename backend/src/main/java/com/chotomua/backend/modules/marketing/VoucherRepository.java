package com.chotomua.backend.modules.marketing;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoucherRepository extends JpaRepository<Voucher, UUID> {
    List<Voucher> findAllByOrderByCodeAsc();
    Optional<Voucher> findByCodeIgnoreCase(String code);
    List<Voucher> findByPromotionProgramId(UUID promotionProgramId);
    boolean existsByPromotionProgramId(UUID promotionProgramId);

    /** Checkout holds the voucher row so two buyers cannot both take the last use of a limited code. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Voucher v where v.id = :id")
    Optional<Voucher> findByIdForUpdate(@Param("id") UUID id);
}
