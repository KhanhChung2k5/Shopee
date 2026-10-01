package com.chotomua.backend.modules.order;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, UUID> {

    List<WalletTransaction> findByUserIdOrderByCreatedAtDescIdDesc(UUID userId);
}
