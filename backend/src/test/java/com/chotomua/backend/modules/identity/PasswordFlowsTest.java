package com.chotomua.backend.modules.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.dto.ChangePasswordRequest;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class PasswordFlowsTest {

    private final PasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final UUID id = UUID.randomUUID();
    private UserRepository users;
    private User user;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        user = new User("buyer", encoder.encode("Oldpass123"));
        when(users.findById(id)).thenReturn(Optional.of(user));
    }

    private void change(String current, String next) {
        new UserController(users, encoder).changePassword(
                new UsernamePasswordAuthenticationToken(id.toString(), null), new ChangePasswordRequest(current, next));
    }

    @Test
    void changePasswordReplacesTheHash() {
        change("Oldpass123", "Newpass456");

        assertThat(encoder.matches("Newpass456", user.getPasswordHash())).isTrue();
    }

    @Test
    void changePasswordRefusesAWrongCurrentPassword() {
        assertThatThrownBy(() -> change("wrong", "Newpass456")).hasMessageContaining("không đúng");
        assertThat(encoder.matches("Oldpass123", user.getPasswordHash())).isTrue();
    }

    @Test
    void changePasswordRefusesTheSamePassword() {
        assertThatThrownBy(() -> change("Oldpass123", "Oldpass123")).hasMessageContaining("phải khác");
    }

    @RepeatedTest(50)
    void generatedPasswordsMeetThePasswordRules() {
        assertThat(TemporaryPasswords.generate()).hasSize(12).matches("^(?=.*[A-Za-z])(?=.*\\d).+$");
    }
}
