package com.chotomua.backend.modules.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.chotomua.backend.common.security.JwtService;
import com.chotomua.backend.modules.identity.dto.AuthResponse;
import com.chotomua.backend.modules.identity.dto.LoginRequest;
import com.chotomua.backend.modules.identity.dto.RegisterRequest;
import io.jsonwebtoken.Claims;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Uses the REAL BCryptPasswordEncoder and JwtService — only the repositories
 * (database access) are mocked — so this actually exercises password hashing
 * and JWT generation/verification, not just that AuthService calls some mock.
 */
class AuthServiceTest {

    private UserRepository userRepository;
    private EmployeeRepository employeeRepository;
    private PasswordEncoder passwordEncoder;
    private JwtService jwtService;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        employeeRepository = mock(EmployeeRepository.class);
        passwordEncoder = new BCryptPasswordEncoder();
        jwtService = new JwtService("unit-test-secret-key-must-be-long-enough-for-hmac-sha", 60);
        authService = new AuthService(userRepository, employeeRepository, passwordEncoder, jwtService);
    }

    @Test
    void register_hashesPasswordAndReturnsValidToken() {
        RegisterRequest request = new RegisterRequest("new@test.com", "0900000000", "plainPassword123", "New User");
        when(userRepository.existsByEmail("new@test.com")).thenReturn(false);
        when(userRepository.existsByPhone("0900000000")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User saved = invocation.getArgument(0);
            setId(saved, UUID.randomUUID()); // simulate the id JPA would assign on real persist
            return saved;
        });

        AuthResponse response = authService.register(request);

        assertThat(response.token()).isNotBlank();
        assertThat(response.role()).isEqualTo("buyer");

        Claims claims = jwtService.parseClaims(response.token());
        assertThat(claims).isNotNull();
        assertThat(claims.get("role", String.class)).isEqualTo("buyer");
    }

    @Test
    void register_rejectsDuplicateEmail() {
        RegisterRequest request = new RegisterRequest("dup@test.com", null, "plainPassword123", "Dup User");
        when(userRepository.existsByEmail("dup@test.com")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email");
    }

    @Test
    void login_withCorrectPassword_returnsTokenWithMatchingSubject() {
        User user = new User("buyer", passwordEncoder.encode("correctPassword"));
        user.setEmail("login@test.com");
        setId(user, UUID.randomUUID());

        when(userRepository.findByEmail("login@test.com")).thenReturn(Optional.of(user));
        when(employeeRepository.findByUserId(user.getId())).thenReturn(Optional.empty());

        AuthResponse response = authService.login(new LoginRequest("login@test.com", "correctPassword"));

        Claims claims = jwtService.parseClaims(response.token());
        assertThat(claims.getSubject()).isEqualTo(user.getId().toString());
    }

    @Test
    void login_withWrongPassword_throwsBadCredentials() {
        User user = new User("buyer", passwordEncoder.encode("correctPassword"));
        user.setEmail("login2@test.com");
        setId(user, UUID.randomUUID());

        when(userRepository.findByEmail("login2@test.com")).thenReturn(Optional.of(user));
        when(userRepository.findByPhone("login2@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("login2@test.com", "wrongPassword")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void login_lockedAccount_throwsBadCredentials() {
        User user = new User("buyer", passwordEncoder.encode("correctPassword"));
        user.setEmail("locked@test.com");
        user.setStatus("locked");
        setId(user, UUID.randomUUID());

        when(userRepository.findByEmail("locked@test.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("locked@test.com", "correctPassword")))
                .isInstanceOf(BadCredentialsException.class);
    }

    /** User.id has no public setter (DB-generated) — tests set it via reflection to simulate a persisted row. */
    private static void setId(User user, UUID id) {
        try {
            var field = User.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
