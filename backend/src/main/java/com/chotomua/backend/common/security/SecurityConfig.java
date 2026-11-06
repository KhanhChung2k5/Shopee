package com.chotomua.backend.common.security;

import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * JWT-based stateless security (Phase 1 / P1). Requests carry
 * "Authorization: Bearer <token>" (see JwtAuthenticationFilter); there is no
 * session/cookie state. Authorities are ROLE_BUYER / ROLE_STAFF and, for
 * staff, DEPT_SALES / DEPT_WAREHOUSE / DEPT_ADMIN / DEPT_CS.
 *
 * CRM APIs (/api/customers, /api/segments, /api/campaigns, /api/surveys,
 * /api/conversations, /api/notifications, /api/crm/**) only require a login
 * here; the department rules live on each CRM controller as @PreAuthorize
 * (see docs/phan-quyen-he-thong.md, mục 2.1), hence @EnableMethodSecurity.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final LoginRateLimitFilter loginRateLimitFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter, LoginRateLimitFilter loginRateLimitFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.loginRateLimitFilter = loginRateLimitFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/health", "/api/crm/health", "/auth/register", "/auth/login", "/flash-sales").permitAll()
                // Spring's error page: without this every unhandled server error reached the client as a bare 403.
                .requestMatchers("/error").permitAll()
                // Public storefront discovery, while catalog management stays staff-only.
                .requestMatchers(HttpMethod.GET, "/api/products", "/api/products/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/catalog/categories", "/api/catalog/categories/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/reviews", "/reviews/product/*", "/api/products/top-sellers").permitAll()
                // Sales only reads warehouse names (order panel shows which warehouse an order ships from).
                // Phân quyền theo docs/phan-quyen-he-thong.md: admin chỉ quản trị tài khoản + nhật ký, không làm nghiệp vụ.
                .requestMatchers(HttpMethod.GET, "/api/catalog/warehouses", "/api/catalog/warehouses/**")
                .hasAnyAuthority("DEPT_SALES", "DEPT_WAREHOUSE")
                .requestMatchers("/api/catalog/warehouses/**", "/api/catalog/goods-receipts/**", "/api/catalog/inventory/**")
                .hasAuthority("DEPT_WAREHOUSE")
                // Kho chỉ xem sản phẩm / biến thể (để biết biến thể khi nhập hàng); bán hàng quản lý catalog.
                .requestMatchers(HttpMethod.GET, "/api/catalog/products", "/api/catalog/products/**",
                        "/api/catalog/product-variants", "/api/catalog/product-variants/**")
                .hasAnyAuthority("DEPT_SALES", "DEPT_WAREHOUSE")
                .requestMatchers("/api/catalog/categories/**", "/api/catalog/products/**", "/api/catalog/product-variants/**")
                .hasAuthority("DEPT_SALES")
                .requestMatchers("/cart-items", "/cart-items/**").hasRole("BUYER")
                .requestMatchers(HttpMethod.POST, "/orders").hasRole("BUYER")
                .requestMatchers(HttpMethod.POST, "/orders/preview").hasRole("BUYER")
                // Nhân viên xem đơn: bán hàng, kho, CSKH (CSKH chỉ xem để tra cứu khi khách hỏi).
                .requestMatchers(HttpMethod.GET, "/orders/**").hasAnyAuthority("ROLE_BUYER", "DEPT_SALES", "DEPT_WAREHOUSE", "DEPT_CS")
                .requestMatchers(HttpMethod.PATCH, "/orders/*/status").hasAnyAuthority("ROLE_BUYER", "DEPT_SALES")
                .requestMatchers(
                        HttpMethod.PATCH,
                        "/orders/*/shipping-info",
                        "/orders/*/tracking",
                        "/orders/*/delivery-failed"
                ).hasAuthority("DEPT_WAREHOUSE")
                .requestMatchers(HttpMethod.PATCH, "/orders/*/payment-received").hasAuthority("DEPT_SALES")
                // Hoá đơn: khách xem hoá đơn đơn của mình, nhân viên xem hoá đơn (GET /orders/** ở trên); lập lại chỉ bán hàng.
                .requestMatchers(HttpMethod.POST, "/orders/*/invoice/reissue").hasAuthority("DEPT_SALES")
                // Hoàn tiền: khách gửi yêu cầu / khai tài khoản nhận; CSKH duyệt và ghi nhận đã chuyển trả.
                .requestMatchers(HttpMethod.POST, "/refund-returns").hasRole("BUYER")
                .requestMatchers(HttpMethod.GET, "/refund-returns/quote").hasRole("BUYER")
                .requestMatchers(HttpMethod.PATCH, "/refund-returns/*/bank-account").hasRole("BUYER")
                .requestMatchers("/refund-returns", "/refund-returns/**").hasAuthority("DEPT_CS")
                // Only staff in the "admin" department may create internal employee accounts.
                .requestMatchers("/employees/**").hasAuthority("DEPT_ADMIN")
                // CRM "Khách hàng" admin page — do CS phụ trách (theo docs/phan-quyen-he-thong.md).
                .requestMatchers("/customers/**").hasAuthority("DEPT_CS")
                .requestMatchers("/vouchers", "/vouchers/**").hasAuthority("ROLE_BUYER")
                .requestMatchers("/loyalty", "/loyalty/**").hasAuthority("ROLE_BUYER")
                .requestMatchers(HttpMethod.POST, "/reviews").hasRole("BUYER")
                .requestMatchers(HttpMethod.GET, "/reviews/mine").hasRole("BUYER")
                .requestMatchers(HttpMethod.PUT, "/reviews/*").hasRole("BUYER")
                .requestMatchers(HttpMethod.DELETE, "/reviews/*").hasRole("BUYER")
                .requestMatchers(HttpMethod.PATCH, "/reviews/*/reply").hasAuthority("DEPT_CS")
                .requestMatchers(HttpMethod.GET, "/reviews/manage").hasAuthority("DEPT_CS")
                .requestMatchers("/marketing", "/marketing/**").hasAuthority("DEPT_SALES")
                // Báo cáo quản trị: doanh thu / lợi nhuận cho kinh doanh, nhập–xuất–tồn cho kho.
                .requestMatchers(HttpMethod.GET, "/api/reports/revenue").hasAuthority("DEPT_SALES")
                .requestMatchers(HttpMethod.GET, "/api/reports/inventory").hasAuthority("DEPT_WAREHOUSE")
                .requestMatchers("/api/reports/**").denyAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(loginRateLimitFilter, JwtAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Vite may select a different free development port (for example when
        // another preview is already using 5173), so allow localhost origins
        // on any port in development. Production must use explicit origins.
        config.setAllowedOriginPatterns(List.of("http://localhost:*", "http://127.0.0.1:*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
