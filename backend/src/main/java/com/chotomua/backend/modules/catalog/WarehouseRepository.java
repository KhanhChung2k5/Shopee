package com.chotomua.backend.modules.catalog;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WarehouseRepository extends JpaRepository<Warehouse, UUID> {
}
