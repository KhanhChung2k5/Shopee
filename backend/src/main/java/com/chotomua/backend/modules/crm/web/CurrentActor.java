package com.chotomua.backend.modules.crm.web;

import com.chotomua.backend.modules.crm.application.exception.CrmForbiddenException;
import com.chotomua.backend.modules.crm.config.CrmDemoActors;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Đọc mã người dùng đang đăng nhập từ ngữ cảnh bảo mật.
 * Bản giả nhận tên nhân viên, tên khách demo ({@code an}, {@code binh}, …) hoặc UUID;
 * teammate JWT có thể giữ UUID trong {@code getName()}.
 */
@Component
public class CurrentActor {

    public UUID requireUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getName())) {
            throw new CrmForbiddenException("Bạn chưa đăng nhập.");
        }
        UUID userId = CrmDemoActors.resolve(authentication.getName());
        if (userId == null) {
            throw new CrmForbiddenException("Không xác định được nhân viên thực hiện thao tác.");
        }
        return userId;
    }
}
