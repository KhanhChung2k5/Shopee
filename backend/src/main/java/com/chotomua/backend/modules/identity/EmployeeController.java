package com.chotomua.backend.modules.identity;

import com.chotomua.backend.modules.identity.dto.EmployeeRequest;
import com.chotomua.backend.modules.identity.dto.EmployeeResponse;
import com.chotomua.backend.modules.identity.dto.EmployeeUpdateRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Access restricted to DEPT_ADMIN — enforced in SecurityConfig, not here. */
@RestController
@RequestMapping("/employees")
public class EmployeeController {

    // Repository for Employee
    private final EmployeeService employeeService;
    // Constructor for EmployeeController

    public EmployeeController(EmployeeService employeeService) {
        this.employeeService = employeeService;
    }

    // List all employees
    @GetMapping
    public List<EmployeeResponse> list() {
        return employeeService.listAll();
    }

    // Create a new employee
    @PostMapping
    public ResponseEntity<EmployeeResponse> create(@Valid @RequestBody EmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.create(request));
    }

    // Update an existing employee
    @PatchMapping("/{id}")
    public EmployeeResponse update(@PathVariable UUID id, @Valid @RequestBody EmployeeUpdateRequest request) {
        // Update the employee
        return employeeService.update(id, request);
    }
}
