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

    /**
     * A locked / soft-deleted account loses its still-valid token, and a staff member moved to another
     * department loses the old department's rights, within this long.
     */
    private static final long ACCESS_CACHE_MS = 30_000;

    private static final Access NO_ACCESS = new Access(false, null, null);

    private final JwtService jwtService;
    private final UserRepository users;
    private final Map<String, CachedAccess> accessCache = new ConcurrentHashMap<>();

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository users) {
        this.jwtService = jwtService;
        this.users = users;
    }

    private record Access(boolean active, String role, String department) {
    }

    private record CachedAccess(Access access, long expiresAt) {
    }

    /**
     * The account's status, role and department as stored now, not as written into the token at login:
     * a token stays valid for hours, so trusting its claims would let a locked account keep working, or a
     * staff member moved out of admin keep admin rights (e.g. issuing anyone a temporary password).
     */
    private Access currentAccess(Claims claims) {
        String userId = claims.getSubject();
        long now = System.currentTimeMillis();
        CachedAccess cached = accessCache.get(userId);
        if (cached != null && cached.expiresAt() > now) return cached.access();
        Access access;
        try {
            access = users.findAccessById(UUID.fromString(userId))
                    .map(view -> new Access("active".equals(view.getStatus()), view.getRole(), view.getDepartment()))
                    .orElse(NO_ACCESS);
        } catch (IllegalArgumentException notAUuid) {
            // test/demo principals that are not user ids keep their token's claims; the authorization rules decide
            access = new Access(true, claims.get("role", String.class), claims.get("department", String.class));
        }
        accessCache.put(userId, new CachedAccess(access, now + ACCESS_CACHE_MS));
        return access;
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
            Access access = claims == null ? NO_ACCESS : currentAccess(claims);
            if (access.active() && access.role() != null) {
                String userId = claims.getSubject();

                List<GrantedAuthority> authorities = new ArrayList<>();
                authorities.add(new SimpleGrantedAuthority("ROLE_" + access.role().toUpperCase()));
                if (access.department() != null) {
                    authorities.add(new SimpleGrantedAuthority("DEPT_" + access.department().toUpperCase()));
                }

                var authentication = new UsernamePasswordAuthenticationToken(userId, null, authorities);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        filterChain.doFilter(request, response);
    }
}
