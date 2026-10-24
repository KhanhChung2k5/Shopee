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
import org.springframework.security.core.context.SecurityContextHolder;

/** A token issued before the account was locked or soft-deleted no longer authenticates. */
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
        when(users.findStatusById(active)).thenReturn(Optional.of("active"));
        when(users.findStatusById(locked)).thenReturn(Optional.of("locked"));

        filter.doFilter(request(jwt.generateToken(active, "buyer", null)), new MockHttpServletResponse(), new MockFilterChain());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo(active.toString());

        SecurityContextHolder.clearContext();
        filter.doFilter(request(jwt.generateToken(locked, "buyer", null)), new MockHttpServletResponse(), new MockFilterChain());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    private static MockHttpServletRequest request(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/orders");
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }
}
