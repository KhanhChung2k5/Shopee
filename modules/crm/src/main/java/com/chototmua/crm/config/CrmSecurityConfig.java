package com.chototmua.crm.config;

import com.chototmua.crm.web.dto.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Bảo mật REST tạm trong module CRM (chưa có JWT nhóm).
 * Tắt CSRF vì client gọi API bằng token, không form phiên.
 * Teammate có thể thay chuỗi lọc bằng JWT khi ghép apps/api.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class CrmSecurityConfig {

    private final ObjectMapper objectMapper;

    public CrmSecurityConfig(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Bean
    SecurityFilterChain crmSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/crm/health").permitAll()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().permitAll())
                .httpBasic(basic -> basic.authenticationEntryPoint(writeUnauthorized()))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(writeUnauthorized())
                        .accessDeniedHandler(writeForbidden()));
        return http.build();
    }

    private AccessDeniedHandler writeForbidden() {
        return (request, response, denied) ->
                writeJson(response, 403, "FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
    }

    private AuthenticationEntryPoint writeUnauthorized() {
        return (request, response, exception) ->
                writeJson(response, 401, "UNAUTHORIZED", "Bạn chưa đăng nhập.");
    }

    private void writeJson(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), ApiErrorResponse.of(code, message));
    }
}
