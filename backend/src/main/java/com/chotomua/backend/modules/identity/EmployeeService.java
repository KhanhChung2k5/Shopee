package com.chotomua.backend.modules.identity;

import com.chotomua.backend.modules.identity.dto.EmployeeRequest;
import com.chotomua.backend.modules.identity.dto.EmployeeResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmployeeService {

    private static final java.util.Set<String> VALID_DEPARTMENTS =
            java.util.Set.of("sales", "warehouse", "admin", "cs");

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public EmployeeService(EmployeeRepository employeeRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        if (!VALID_DEPARTMENTS.contains(request.department())) {
            throw new IllegalArgumentException("department không hợp lệ: phải là sales/warehouse/admin/cs");
        }
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }
        if (request.phone() != null && userRepository.existsByPhone(request.phone())) {
            throw new IllegalArgumentException("Số điện thoại đã được sử dụng");
        }

        User user = new User("staff", passwordEncoder.encode(request.password()));
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setFullName(request.fullName());
        user = userRepository.save(user);

        Employee employee = new Employee(user, request.department());
        employee.setPosition(request.position());
        employee.setBaseSalary(request.baseSalary());
        employee = employeeRepository.save(employee);

        return EmployeeResponse.from(employee);
    }
}
