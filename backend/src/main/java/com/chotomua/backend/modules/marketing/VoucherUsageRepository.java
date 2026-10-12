package com.chotomua.backend.modules.marketing;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VoucherUsageRepository extends JpaRepository<VoucherUsage, UUID> {
}
