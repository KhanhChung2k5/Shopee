package com.chotomua.backend.modules.marketing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PromotionProgramRepository extends JpaRepository<PromotionProgram, UUID> {
    List<PromotionProgram> findAllByOrderByStartAtDesc();
    Optional<PromotionProgram> findByCodeIgnoreCase(String code);
}
