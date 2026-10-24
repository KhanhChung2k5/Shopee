package com.chotomua.backend.common.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import com.chotomua.backend.modules.identity.UserRepository;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads the Bearer JWT (if present), and on success populates the SecurityContext
 * with authorities ROLE_{BUYER|STAFF} and, for staff, DEPT_{SALES|WAREHOUSE|ADMIN|CS}.
 * No token, or an invalid one, simply leaves the request unauthenticated — the
 * downstream authorization rules in SecurityConfig decide whether that's allowed.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** A locked / soft-deleted account loses its still-valid token within this long. */
    private static final long STATUS_CACHE_MS = 30_000;

    private final JwtService jwtService;
    private final UserRepository users;
    private final Map<String, CachedStatus> statusCache = new ConcurrentHashMap<>();

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository users) {
        this.jwtService = jwtService;
        this.users = users;
    }

    private record CachedStatus(boolean active, long expiresAt) {
    }

    /** Login already refuses inactive accounts; this also stops tokens issued before the account was locked. */
    private boolean isActive(String userId) {
        long now = System.currentTimeMillis();
        CachedStatus cached = statusCache.get(userId);
        if (cached != null && cached.expiresAt() > now) return cached.active();
        boolean active;
        try {
            active = users.findStatusById(UUID.fromString(userId)).map("active"::equals).orElse(false);
        } catch (IllegalArgumentException notAUuid) {
            active = true; // test/demo principals that are not user ids are left to the authorization rules
        }
        statusCache.put(userId, new CachedStatus(active, now + STATUS_CACHE_MS));
        return active;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            Claims claims = jwtService.parseClaims(header.substring(7));
            if (claims != null && isActive(claims.getSubject())) {
                String userId = claims.getSubject();
                String role = claims.get("role", String.class);
                String department = claims.get("department", String.class);

                List<GrantedAuthority> authorities = new ArrayList<>();
                authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase()));
                if (department != null) {
                    authorities.add(new SimpleGrantedAuthority("DEPT_" + department.toUpperCase()));
                }

                var authentication = new UsernamePasswordAuthenticationToken(userId, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        filterChain.doFilter(request, response);
    }
}
