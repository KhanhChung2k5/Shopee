package com.chototmua.crm.web;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Điểm kiểm tra sống của module CRM — không cần đăng nhập.
 */
@RestController
@RequestMapping("/api/crm")
public class CrmHealthController {

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("module", "crm", "status", "up");
    }
}
