package com.chotomua.backend.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.chotomua.backend.modules.identity.UserRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * A token is authorized with the account as it is stored now: one issued before the account was locked
 * no longer authenticates, and one issued before a department change no longer carries the old department.
 */
class JwtAuthenticationFilterStatusTest {

    private final JwtService jwt = new JwtService("test-secret-that-is-long-enough-for-hs256-signing-0123456789", 60);
    private final UserRepository users = mock(UserRepository.class);
    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(jwt, users);

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void activeAccountIsAuthenticatedLockedOneIsNot() throws Exception {
        UUID active = UUID.randomUUID();
        UUID locked = UUID.randomUUID();
        when(users.findAccessById(active)).thenReturn(Optional.of(access("active", "buyer", null)));
        when(users.findAccessById(locked)).thenReturn(Optional.of(access("locked", "buyer", null)));

        filter.doFilter(request(jwt.generateToken(active, "buyer", null)), new MockHttpServletResponse(), new MockFilterChain());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo(active.toString());

        SecurityContextHolder.clearContext();
        filter.doFilter(request(jwt.generateToken(locked, "buyer", null)), new MockHttpServletResponse(), new MockFilterChain());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void staffMovedOutOfAdminLosesAdminRightsBeforeTheirTokenExpires() throws Exception {
        UUID staff = UUID.randomUUID();
        // Logged in while in admin, then an admin moved them to sales.
        String tokenIssuedAsAdmin = jwt.generateToken(staff, "staff", "admin");
        when(users.findAccessById(staff)).thenReturn(Optional.of(access("active", "staff", "sales")));

        filter.doFilter(request(tokenIssuedAsAdmin), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(authorities()).contains("ROLE_STAFF", "DEPT_SALES").doesNotContain("DEPT_ADMIN");
    }

    @Test
    void deletedAccountIsNotAuthenticated() throws Exception {
        UUID gone = UUID.randomUUID();
        when(users.findAccessById(gone)).thenReturn(Optional.empty());

        filter.doFilter(request(jwt.generateToken(gone, "staff", "admin")), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    private static java.util.List<String> authorities() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        return auth.getAuthorities().stream().map(GrantedAuthority::getAuthority).toList();
    }

    private static UserRepository.AccessView access(String status, String role, String department) {
        return new UserRepository.AccessView() {
            @Override
            public String getStatus() {
                return status;
            }

            @Override
            public String getRole() {
                return role;
            }

            @Override
            public String getDepartment() {
                return department;
            }
        };
    }

    private static MockHttpServletRequest request(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/orders");
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }
}
