package com.chotomua.backend.modules.identity;

import com.chotomua.backend.modules.identity.dto.EmployeeRequest;
import com.chotomua.backend.modules.identity.dto.EmployeeResponse;
import com.chotomua.backend.modules.identity.dto.EmployeeUpdateRequest;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EmployeeService {

    private static final Set<String> VALID_DEPARTMENTS = Set.of("sales", "warehouse", "admin", "cs");

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public EmployeeService(EmployeeRepository employeeRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<EmployeeResponse> listAll() {
        return employeeRepository.findAll().stream()
                .map(EmployeeResponse::from)
                .toList();
    }

    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        requireValidDepartment(request.department());
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

    @Transactional
    public EmployeeResponse update(UUID employeeId, EmployeeUpdateRequest request) {
        requireValidDepartment(request.department());
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhân viên"));

        boolean leavingAdminDepartment = "admin".equals(employee.getDepartment()) && !"admin".equals(request.department());
        if (leavingAdminDepartment && employeeRepository.countByDepartment("admin") <= 1) {
            throw new IllegalArgumentException(
                    "Không thể chuyển nhân viên admin cuối cùng sang bộ phận khác — hệ thống sẽ không còn ai quản lý được nhân viên. "
                            + "Hãy tạo/chuyển thêm 1 admin khác trước.");
        }

        employee.setDepartment(request.department());
        employee.setPosition(request.position());
        employee.setBaseSalary(request.baseSalary());
        return EmployeeResponse.from(employee);
    }

    private void requireValidDepartment(String department) {
        if (!VALID_DEPARTMENTS.contains(department)) {
            throw new IllegalArgumentException("department không hợp lệ: phải là sales/warehouse/admin/cs");
        }
    }
}
