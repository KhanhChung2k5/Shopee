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

// EmployeeService is a service for managing employees
@Service
public class EmployeeService {

    // Valid departments
    private static final Set<String> VALID_DEPARTMENTS = Set.of("sales", "warehouse", "admin", "cs");

    // Repository for Employee
    private final EmployeeRepository employeeRepository;
    // Repository for User
    private final UserRepository userRepository;
    // Password encoder
    private final PasswordEncoder passwordEncoder;

    // Constructor for EmployeeService
    public EmployeeService(EmployeeRepository employeeRepository, UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // List all employees
    @Transactional(readOnly = true)
    public List<EmployeeResponse> listAll() {
        return employeeRepository.findAll().stream()
                .map(EmployeeResponse::from)
                .toList();
    }

    // Create a new employee
    @Transactional
    public EmployeeResponse create(EmployeeRequest request) {
        requireValidDepartment(request.department());
        // Check if the email is already in use
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }
        // Check if the phone is already in use
            if (request.phone() != null && userRepository.existsByPhone(request.phone())) {
            throw new IllegalArgumentException("Số điện thoại đã được sử dụng");
        }
        // Create a new user
        User user = new User("staff", passwordEncoder.encode(request.password()));
        // Set the email
        user.setEmail(request.email());
        // Set the phone
        user.setPhone(request.phone());
        // Set the full name
        user.setFullName(request.fullName());
        // Save the user
        user = userRepository.save(user);

        // Create a new employee
        Employee employee = new Employee(user, request.department());
        // Set the position
        employee.setPosition(request.position());
        employee.setBaseSalary(request.baseSalary());
        employee = employeeRepository.save(employee);
        // Return the employee response
        return EmployeeResponse.from(employee);
    }

    // Update an existing employee
    @Transactional
    public EmployeeResponse update(UUID employeeId, EmployeeUpdateRequest request) {
        requireValidDepartment(request.department());
        // Find the employee by ID
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhân viên"));
        // Check if the employee is leaving the admin department
        boolean leavingAdminDepartment = "admin".equals(employee.getDepartment()) && !"admin".equals(request.department());
        // Check if the employee is the last admin
        if (leavingAdminDepartment && "active".equals(employee.getUser().getStatus()) && activeAdminCount() <= 1) {
            throw new IllegalArgumentException(
                    "Không thể chuyển nhân viên admin cuối cùng sang bộ phận khác — hệ thống sẽ không còn ai quản lý được nhân viên. "
                            + "Hãy tạo/chuyển thêm 1 admin khác trước.");
        }
        // Update the employee
        employee.setDepartment(request.department());
        // Set the position
        employee.setPosition(request.position());
        // Set the base salary
        employee.setBaseSalary(request.baseSalary());
        // Return the employee response
        return EmployeeResponse.from(employee);
    }

    // Lock or unlock a staff account: a locked account can't log in and its current token stops working
    @Transactional
    public EmployeeResponse updateStatus(UUID actorUserId, UUID employeeId, String status) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhân viên"));
        User user = employee.getUser();
        if (status.equals(user.getStatus())) {
            return EmployeeResponse.from(employee);
        }
        if ("deleted".equals(user.getStatus())) {
            throw new IllegalArgumentException("Tài khoản nhân viên này đã bị xoá.");
        }
        if ("locked".equals(status)) {
            if (user.getId().equals(actorUserId)) {
                throw new IllegalArgumentException("Không thể tự khoá tài khoản đang đăng nhập.");
            }
            if ("admin".equals(employee.getDepartment()) && activeAdminCount() <= 1) {
                throw new IllegalArgumentException(
                        "Không thể khoá quản trị viên cuối cùng còn hoạt động — hệ thống sẽ không còn ai quản lý được nhân viên.");
            }
        }
        user.setStatus(status);
        return EmployeeResponse.from(employee);
    }

    /**
     * Admin gives a staff member who forgot their password a temporary one (shown once, only the hash is stored);
     * the staff member changes it on the profile page. Admin's own password goes through the normal change instead.
     */
    @Transactional
    public String issueTemporaryPassword(UUID actorUserId, UUID employeeId) {
        Employee employee = employeeRepository.findById(employeeId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy nhân viên"));
        User user = employee.getUser();
        if (user.getId().equals(actorUserId)) {
            throw new IllegalArgumentException("Hãy tự đổi mật khẩu của mình trong trang tài khoản.");
        }
        if (!"active".equals(user.getStatus())) {
            throw new IllegalStateException("Chỉ cấp mật khẩu tạm cho tài khoản đang hoạt động.");
        }
        String password = TemporaryPasswords.generate();
        user.setPasswordHash(passwordEncoder.encode(password));
        return password;
    }

    private long activeAdminCount() {
        return employeeRepository.countByDepartmentAndUser_Status("admin", "active");
    }

    // Require a valid department
    private void requireValidDepartment(String department) {
        if (!VALID_DEPARTMENTS.contains(department)) {
            // Throw an exception if the department is not valid
            throw new IllegalArgumentException("department không hợp lệ: phải là sales/warehouse/admin/cs");
        }
    }
}
