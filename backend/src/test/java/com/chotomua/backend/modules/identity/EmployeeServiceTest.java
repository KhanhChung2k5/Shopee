package com.chotomua.backend.modules.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.dto.EmployeeUpdateRequest;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class EmployeeServiceTest {

    private EmployeeRepository employeeRepository;
    private UserRepository userRepository;
    private EmployeeService employeeService;

    @BeforeEach
    void setUp() {
        employeeRepository = mock(EmployeeRepository.class);
        userRepository = mock(UserRepository.class);
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        employeeService = new EmployeeService(employeeRepository, userRepository, passwordEncoder);
    }

    @Test
    void update_rejectsMovingLastAdminOutOfAdminDepartment() {
        Employee lastAdmin = employeeOf("admin");
        when(employeeRepository.findById(lastAdmin.getId())).thenReturn(Optional.of(lastAdmin));
        when(employeeRepository.countByDepartment("admin")).thenReturn(1L);

        assertThatThrownBy(() -> employeeService.update(lastAdmin.getId(), new EmployeeUpdateRequest("sales", null, null)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("admin cuối cùng");
    }

    @Test
    void update_allowsMovingAdminOutWhenAnotherAdminRemains() {
        Employee admin = employeeOf("admin");
        when(employeeRepository.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(employeeRepository.countByDepartment("admin")).thenReturn(2L);

        var response = employeeService.update(admin.getId(), new EmployeeUpdateRequest("sales", "Sales Rep", null));

        assertThat(response.department()).isEqualTo("sales");
    }

    @Test
    void update_allowsChangingNonAdminDepartmentsFreely() {
        Employee sales = employeeOf("sales");
        when(employeeRepository.findById(sales.getId())).thenReturn(Optional.of(sales));

        var response = employeeService.update(sales.getId(), new EmployeeUpdateRequest("warehouse", null, null));

        assertThat(response.department()).isEqualTo("warehouse");
    }

    private static Employee employeeOf(String department) {
        User user = new User("staff", "hash");
        setId(user, UUID.randomUUID());
        user.setEmail(department + "@test.com");
        user.setFullName("Test " + department);

        Employee employee = new Employee(user, department);
        setId(employee, UUID.randomUUID());
        return employee;
    }

    private static void setId(Object entity, UUID id) {
        try {
            var field = entity.getClass().getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
