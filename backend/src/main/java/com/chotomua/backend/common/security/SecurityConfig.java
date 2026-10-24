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
                // Public storefront discovery, while catalog management stays staff-only.
                .requestMatchers(HttpMethod.GET, "/api/products", "/api/products/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/catalog/categories", "/api/catalog/categories/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/reviews", "/api/products/top-sellers").permitAll()
                .requestMatchers("/api/catalog/warehouses/**", "/api/catalog/goods-receipts/**", "/api/catalog/inventory/**")
                .hasAnyAuthority("DEPT_WAREHOUSE", "DEPT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/catalog/product-variants", "/api/catalog/product-variants/**")
                .hasAnyAuthority("DEPT_SALES", "DEPT_WAREHOUSE", "DEPT_ADMIN")
                .requestMatchers("/api/catalog/categories/**", "/api/catalog/products/**", "/api/catalog/product-variants/**")
                .hasAnyAuthority("DEPT_SALES", "DEPT_ADMIN")
                .requestMatchers("/cart-items", "/cart-items/**").hasRole("BUYER")
                .requestMatchers(HttpMethod.POST, "/orders").hasRole("BUYER")
                .requestMatchers(HttpMethod.GET, "/orders/**").hasAnyRole("BUYER", "STAFF")
                .requestMatchers(HttpMethod.PATCH, "/orders/*/status").hasAnyRole("BUYER", "STAFF")
                .requestMatchers(
                        HttpMethod.PATCH,
                        "/orders/*/shipping-info",
                        "/orders/*/tracking"
                ).hasRole("STAFF")
                // Only staff in the "admin" department may create internal employee accounts.
                .requestMatchers("/employees/**").hasAuthority("DEPT_ADMIN")
                // CRM "Khách hàng" admin page — do CS phụ trách (theo docs/phan-quyen-he-thong.md).
                .requestMatchers("/customers/**").hasAnyAuthority("DEPT_CS", "DEPT_ADMIN")
                .requestMatchers("/wallet", "/wallet/**").hasAuthority("ROLE_BUYER")
                .requestMatchers("/vouchers", "/vouchers/**").hasAuthority("ROLE_BUYER")
                .requestMatchers("/loyalty", "/loyalty/**").hasAuthority("ROLE_BUYER")
                .requestMatchers(HttpMethod.POST, "/reviews").hasRole("BUYER")
                .requestMatchers(HttpMethod.PATCH, "/reviews/*/reply").hasAnyAuthority("DEPT_SALES", "DEPT_CS", "DEPT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/reviews/manage").hasAnyAuthority("DEPT_SALES", "DEPT_CS", "DEPT_ADMIN")
                .requestMatchers("/marketing", "/marketing/**").hasAnyAuthority("DEPT_SALES", "DEPT_ADMIN")
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
