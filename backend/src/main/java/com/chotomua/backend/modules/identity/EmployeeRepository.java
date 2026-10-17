package com.chotomua.backend.modules.identity;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {

    Optional<Employee> findByUserId(UUID userId);

    boolean existsByUserId(UUID userId);

    long countByDepartment(String department);
}
