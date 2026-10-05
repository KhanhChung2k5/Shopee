package com.chototmua.crm.web.audit;

import com.chototmua.crm.application.audit.OperationActionCatalog;
import com.chototmua.crm.application.audit.OperationLogRecorder;
import com.chototmua.crm.config.CrmDemoActors;
import com.chototmua.crm.domain.audit.OperationLog;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Instant;
import java.util.UUID;

/**
 * Ghi thao tác làm thay đổi dữ liệu sau khi API trả lời.
 * Chạy trong DispatcherServlet nên vẫn đọc được người đang đăng nhập.
 */
@Component
public class OperationLogInterceptor implements HandlerInterceptor {

    private final OperationLogRecorder recorder;

    public OperationLogInterceptor(OperationLogRecorder recorder) {
        this.recorder = recorder;
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
        String department = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("");
        recorder.record(new OperationLog(
                UUID.randomUUID(),
                CrmDemoActors.resolve(authentication.getName()),
                CrmDemoActors.loginOf(authentication.getName()),
                CrmDemoActors.labelOf(authentication.getName()),
                department,
                OperationActionCatalog.describe(request.getMethod(), path),
                request.getMethod().toUpperCase(),
                path,
                status,
                outcome,
                Instant.now()));
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
