package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.conversation.SupportDirectory;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/** Nhân viên hỗ trợ và địa chỉ mặc định trên bảng nhóm. */
@Component
@Profile("crm-db")
public class JdbcSupportDirectory implements SupportDirectory {

    private final JdbcTemplate jdbc;

    public JdbcSupportDirectory(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<SupportAgent> listAgents() {
        return jdbc.query("""
                SELECT u.id, u.full_name, e.department
                FROM employees e
                JOIN users u ON u.id = e.user_id
                WHERE e.department IN ('admin', 'crm', 'cs')
                ORDER BY CASE e.department WHEN 'cs' THEN 0 WHEN 'crm' THEN 1 ELSE 2 END, u.full_name
                """, (rs, rowNum) -> new SupportAgent(
                rs.getObject("id", UUID.class),
                rs.getString("full_name"),
                rs.getString("department")));
    }

    @Override
    public String branchOf(UUID userId) {
        List<String> rows = jdbc.query("""
                SELECT full_address
                FROM addresses
                WHERE user_id = ?
                ORDER BY is_default DESC
                LIMIT 1
                """, (rs, rowNum) -> rs.getString("full_address"), userId);
        if (rows.isEmpty() || rows.get(0) == null || rows.get(0).isBlank()) {
            return "—";
        }
        return rows.get(0);
    }

    @Override
    public String nameOf(UUID userId) {
        List<String> rows = jdbc.query(
                "SELECT full_name FROM users WHERE id = ?",
                (rs, rowNum) -> rs.getString("full_name"),
                userId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Override
    public String departmentOf(UUID userId) {
        List<String> rows = jdbc.query(
                "SELECT department FROM employees WHERE user_id = ?",
                (rs, rowNum) -> rs.getString("department"),
                userId);
        return rows.isEmpty() ? null : rows.get(0);
    }
}
