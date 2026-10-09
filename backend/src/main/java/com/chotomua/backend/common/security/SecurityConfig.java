package com.chotomua.backend.common.security;

import java.util.List;
import org.springframework.http.HttpMethod;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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
 */
@Configuration
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
                .requestMatchers("/health", "/auth/register", "/auth/login").permitAll()
                // Published product discovery is available to shoppers without a JWT.
                .requestMatchers(HttpMethod.GET, "/api/products", "/api/products/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/catalog/categories", "/api/catalog/categories/**")
                    .permitAll()
                .requestMatchers("/api/catalog/warehouses/**", "/api/catalog/goods-receipts/**",
                    "/api/catalog/inventory/**")
                    .hasAnyAuthority("DEPT_WAREHOUSE", "DEPT_ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/catalog/product-variants",
                    "/api/catalog/product-variants/**")
                    .hasAnyAuthority("DEPT_SALES", "DEPT_WAREHOUSE", "DEPT_ADMIN")
                .requestMatchers("/api/catalog/categories/**", "/api/catalog/products/**",
                    "/api/catalog/product-variants/**").hasAnyAuthority("DEPT_SALES", "DEPT_ADMIN")
                // Only staff in the "admin" department may create internal employee accounts.
                .requestMatchers("/employees/**").hasAuthority("DEPT_ADMIN")
                // CRM "Khách hàng" admin page — admin-only, same as employee management.
                .requestMatchers("/customers/**").hasAuthority("DEPT_ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(loginRateLimitFilter, JwtAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Vite dev server origins (web + admin run from the same React app).
        config.setAllowedOrigins(List.of("http://localhost:5173", "http://127.0.0.1:5173"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
