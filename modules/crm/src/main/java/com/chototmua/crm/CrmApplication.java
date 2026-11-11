package com.chototmua.crm;

import com.chototmua.crm.config.DotEnvLoader;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

/**
 * Chạy module CRM độc lập để thử REST + giao diện giả lập.
 * Hồ sơ {@code crm-db}: PostgreSQL từ {@code .env} (Neon) hoặc mặc định local.
 * Hồ sơ {@code crm-fake}: cổng trong bộ nhớ, dùng cho bài kiểm tra.
 */
@SpringBootApplication
@EnableScheduling
public class CrmApplication {

    public static void main(String[] args) {
        // PostgreSQL 16 không nhận tên cũ Asia/Saigon mà Windows vẫn gửi lúc mở kết nối.
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        DotEnvLoader.load();
        SpringApplication.run(CrmApplication.class, args);
    }
}
