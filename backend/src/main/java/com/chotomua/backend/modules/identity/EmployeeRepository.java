package com.chotomua.backend.modules.identity;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

// Repository for Employee
public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    // Find an employee by user ID

    Optional<Employee> findByUserId(UUID userId);

    // Check if an employee exists by user ID
    boolean existsByUserId(UUID userId);

    // Count the number of employees by department
    long countByDepartment(String department);
}
