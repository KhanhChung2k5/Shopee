package com.chotomua.backend.modules.order;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByOrderIdAndStatus(UUID orderId, String status);

    List<Invoice> findByOrderIdOrderByIssuedAtDesc(UUID orderId);

    @Query(value = "SELECT nextval('invoice_no_seq')", nativeQuery = true)
    long nextNumber();
}
