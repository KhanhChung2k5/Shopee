package com.chototmua.crm.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

/**
 * Đăng nhập Basic cho bản chạy thử.
 * Nhân viên: admin / crm / cs / sales. Khách nhận thư: an / binh / linh / dung,
 * kèm chau (khóa) và phong (đã xóa) để đối chiếu hộp thư trống.
 * Mật khẩu trùng tên đăng nhập. Không dùng khi teammate ghép JWT trên apps/api.
 */
@Configuration
@Profile({"crm-fake", "crm-db"})
public class CrmFakeAuthConfig {

    @Bean
    UserDetailsService crmDemoUsers() {
        return new InMemoryUserDetailsManager(
                staff(CrmDemoActors.ADMIN_LOGIN, "admin"),
                staff(CrmDemoActors.CRM_LOGIN, "crm"),
                staff(CrmDemoActors.CS_LOGIN, "cs"),
                staff(CrmDemoActors.SALES_LOGIN, "sales"),
                customer(CrmDemoActors.CUSTOMER_AN_LOGIN),
                customer(CrmDemoActors.CUSTOMER_BINH_LOGIN),
                customer(CrmDemoActors.CUSTOMER_LINH_LOGIN),
                customer(CrmDemoActors.CUSTOMER_DUNG_LOGIN),
                customer(CrmDemoActors.CUSTOMER_CHAU_LOGIN),
                customer(CrmDemoActors.CUSTOMER_PHONG_LOGIN));
    }

    private static UserDetails staff(String login, String authority) {
        return User.withUsername(login)
                .password("{noop}" + login)
                .authorities(authority)
                .build();
    }

    private static UserDetails customer(String login) {
        return User.withUsername(login)
                .password("{noop}" + login)
                .authorities("customer")
                .build();
    }
}
