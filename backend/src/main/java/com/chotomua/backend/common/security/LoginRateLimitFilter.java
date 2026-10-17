package com.chotomua.backend.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Caps FAILED /auth/login attempts per client IP to slow down brute-force
 * password guessing. Only non-2xx responses count against the limit — a burst
 * of legitimate successful logins (e.g. several teammates behind the same
 * office NAT, or rapid dev/test iteration) must never trip it. In-memory
 * sliding window — fine for a single backend instance; would need a shared
 * store (e.g. Redis) if the app is ever scaled to multiple instances.
 */
@Component
public class LoginRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final long WINDOW_MILLIS = 60_000;

    private final ConcurrentHashMap<String, Deque<Long>> failuresByIp = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (!("POST".equalsIgnoreCase(request.getMethod()) && "/auth/login".equals(request.getRequestURI()))) {
            chain.doFilter(request, response);
            return;
        }

        String ip = clientIp(request);
        long now = System.currentTimeMillis();
        Deque<Long> failures = failuresByIp.computeIfAbsent(ip, k -> new ArrayDeque<>());

        synchronized (failures) {
            while (!failures.isEmpty() && now - failures.peekFirst() > WINDOW_MILLIS) {
                failures.pollFirst();
            }
            if (failures.size() >= MAX_FAILED_ATTEMPTS) {
                writeTooManyRequests(response);
                return;
            }
        }

        chain.doFilter(request, response);

        if (response.getStatus() >= 400) {
            synchronized (failures) {
                failures.addLast(now);
            }
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void writeTooManyRequests(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        String json = """
                {"timestamp":"%s","status":429,"error":"Too Many Requests","message":"Quá nhiều lần đăng nhập thất bại, vui lòng thử lại sau 1 phút"}""".formatted(Instant.now());
        response.getWriter().write(json);
    }
}
