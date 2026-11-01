package com.chotomua.backend.modules.identity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Accounts an end-to-end test registers on the real (shared) database. These tests go through real HTTP,
 * so nothing rolls back on its own — remove them after each test (employees, addresses and carts cascade).
 */
final class E2eAccounts {

    private final List<String> emails = new ArrayList<>();

    String newEmail(String prefix) {
        String email = prefix + UUID.randomUUID() + "@example.com";
        emails.add(email);
        return email;
    }

    void deleteAll(JdbcTemplate jdbc) {
        for (String email : emails) {
            jdbc.update("DELETE FROM users WHERE email = ?", email);
        }
        emails.clear();
    }
}
