package com.chotomua.backend.modules.crm.web.audit;

import com.chotomua.backend.modules.crm.application.audit.OperationActionCatalog;
import com.chotomua.backend.modules.crm.application.audit.OperationLogRecorder;
import com.chotomua.backend.modules.crm.config.CrmDemoActors;
import com.chotomua.backend.modules.crm.domain.audit.OperationLog;
import com.chotomua.backend.modules.crm.port.ActorDirectory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

/**
 * Ghi thao tác làm thay đổi dữ liệu sau khi API trả lời.
 * Chạy trong DispatcherServlet nên vẫn đọc được người đang đăng nhập.
 */
@Component
public class OperationLogInterceptor implements HandlerInterceptor {

    private final OperationLogRecorder recorder;
    private final ActorDirectory actors;

    public OperationLogInterceptor(OperationLogRecorder recorder, ActorDirectory actors) {
        this.recorder = recorder;
        this.actors = actors;
    }

    @Override
    public void afterCompletion(
            HttpServletRequest request,
            HttpServletResponse response,
            Object handler,
            Exception ex
    ) {
        String path = pathOf(request);
        if (OperationActionCatalog.skip(request.getMethod(), path)) {
            return;
        }
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            return;
        }
        int status = response.getStatus();
        String outcome = status >= 200 && status < 400 ? "success" : "failed";
        String department = departmentOf(authentication);
        String name = authentication.getName();
        UUID actorId = CrmDemoActors.resolve(name);
        // Real accounts: email + full name from users; demo/test accounts fall back to their fixed labels.
        Optional<ActorDirectory.Actor> actor = actors.find(actorId);
        recorder.record(new OperationLog(
                UUID.randomUUID(),
                actorId,
                actor.map(ActorDirectory.Actor::login).orElseGet(() -> CrmDemoActors.loginOf(name)),
                actor.map(ActorDirectory.Actor::label).orElseGet(() -> CrmDemoActors.labelOf(name)),
                department,
                OperationActionCatalog.describe(request.getMethod(), path),
                request.getMethod().toUpperCase(),
                path,
                status,
                outcome,
                Instant.now()));
    }

    /**
     * Backend JWTs carry ROLE_STAFF + DEPT_{X} for staff and ROLE_BUYER for customers;
     * the log stores the bare department ("cs", "sales"…) or "customer".
     */
    private static String departmentOf(Authentication authentication) {
        List<String> authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();
        return authorities.stream()
                .filter(authority -> authority.startsWith("DEPT_"))
                .map(authority -> authority.substring("DEPT_".length()).toLowerCase(Locale.ROOT))
                .findFirst()
                .orElse(authorities.contains("ROLE_BUYER") ? "customer" : "");
    }

    private static String pathOf(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String context = request.getContextPath();
        if (context != null && !context.isEmpty() && uri.startsWith(context)) {
            uri = uri.substring(context.length());
        }
        int query = uri.indexOf('?');
        if (query >= 0) {
            uri = uri.substring(0, query);
        }
        return uri;
    }
}
