package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.profile.CustomerProfileService;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Nạp phần seed còn lại (khách, đơn, sản phẩm, khảo sát) vào CSDL đã có người dùng.
 * Bỏ qua dòng trùng khóa. Không ghi đè hồ sơ khách vốn đã có trong database nhóm.
 */
@Component
@Profile("crm-db")
public class CrmDemoRemainderLoader {

    private static final String DONE_MARKER = "44000001-0000-4000-8000-000000000001";

    private static final String CUSTOMER_ROLE_ID = "00000000-0000-0000-0000-000000000001";
    private static final String STAFF_ROLE_ID = "00000000-0000-0000-0000-000000000002";

    private final JdbcTemplate jdbc;
    private final CustomerProfileService profiles;

    public CrmDemoRemainderLoader(JdbcTemplate jdbc, CustomerProfileService profiles) {
        this.jdbc = jdbc;
        this.profiles = profiles;
    }

    public void load() {
        if (count("SELECT COUNT(*) FROM goods_receipts WHERE id = ?", UUID.fromString(DONE_MARKER)) > 0) {
            return;
        }
        String sql = adapt(readSeed());
        for (String statement : statements(sql)) {
            String trimmed = statement.strip();
            if (trimmed.isEmpty() || !trimmed.regionMatches(true, 0, "INSERT", 0, 6)) {
                continue;
            }
            executeInsert(trimmed);
        }
        refreshDemoProfiles();
    }

    private String adapt(String sql) {
        sql = cutStatement(sql, "INSERT INTO roles");
        if (columnExists("cart_items", "user_id") && !columnExists("cart_items", "cart_id")) {
            sql = cutStatement(sql, "INSERT INTO carts");
            sql = sql.replace(
                    "INSERT INTO cart_items (id, cart_id, variant_id, quantity, is_selected)",
                    "INSERT INTO cart_items (id, user_id, variant_id, quantity, is_selected)");
            sql = sql.replace(
                    "'61000001-0000-4000-8000-000000000001'",
                    "'77777777-7777-7777-7777-777777777777'");
            sql = sql.replace(
                    "'61000001-0000-4000-8000-000000000002'",
                    "'c1000001-0000-4000-8000-000000000015'");
            sql = sql.replace(
                    "'61000001-0000-4000-8000-000000000003'",
                    "'c1000001-0000-4000-8000-000000000023'");
            sql = sql.replace(
                    "'61000001-0000-4000-8000-000000000004'",
                    "'c1000001-0000-4000-8000-000000000028'");
            sql = sql.replace(
                    "'61000001-0000-4000-8000-000000000005'",
                    "'c1000001-0000-4000-8000-000000000031'");
        }
        sql = cutFrom(sql, "-- Hồ sơ CRM", "WHERE u.id = s.user_id;");
        if (!columnExists("users", "role_id")) {
            sql = sql.replace("role_id", "role");
            sql = sql.replace("'" + STAFF_ROLE_ID + "'", "'staff'");
            sql = sql.replace("'" + CUSTOMER_ROLE_ID + "'", "'buyer'");
        }
        return sql.replace(
                "WHERE o.status = 'delivered'",
                "WHERE o.status = 'delivered'\n  AND NOT EXISTS (SELECT 1 FROM loyalty_transactions lt WHERE lt.order_id = o.id)");
    }

    private void executeInsert(String sql) {
        try {
            jdbc.update(withConflict(sql));
        } catch (DataAccessException batchError) {
            List<String> rows = splitValueRows(sql);
            if (rows.size() < 2) {
                throw batchError;
            }
            DataAccessException first = null;
            int failed = 0;
            for (String row : rows) {
                try {
                    jdbc.update(withConflict(row));
                } catch (DataAccessException rowError) {
                    failed++;
                    if (first == null) {
                        first = rowError;
                    }
                }
            }
            if (failed == rows.size()) {
                throw first;
            }
        }
    }

    private static List<String> statements(String sql) {
        List<String> result = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inString = false;
        boolean inLineComment = false;
        boolean inBlock = false;
        for (int i = 0; i < sql.length(); i++) {
            char ch = sql.charAt(i);
            char next = i + 1 < sql.length() ? sql.charAt(i + 1) : '\0';
            if (inLineComment) {
                if (ch == '\n') {
                    inLineComment = false;
                }
                continue;
            }
            if (inBlock) {
                if (ch == '*' && next == '/') {
                    inBlock = false;
                    i++;
                }
                continue;
            }
            if (inString) {
                current.append(ch);
                if (ch == '\'' && next == '\'') {
                    current.append(next);
                    i++;
                } else if (ch == '\'') {
                    inString = false;
                }
                continue;
            }
            if (ch == '-' && next == '-') {
                inLineComment = true;
                i++;
                continue;
            }
            if (ch == '/' && next == '*') {
                inBlock = true;
                i++;
                continue;
            }
            if (ch == '\'') {
                inString = true;
                current.append(ch);
                continue;
            }
            if (ch == ';') {
                String statement = current.toString().strip();
                if (!statement.isEmpty()) {
                    result.add(statement);
                }
                current.setLength(0);
                continue;
            }
            current.append(ch);
        }
        return result;
    }

    private static String withConflict(String sql) {
        String trimmed = sql.strip();
        if (trimmed.toUpperCase().contains("ON CONFLICT")) {
            return trimmed;
        }
        return trimmed + " ON CONFLICT (id) DO NOTHING";
    }

    private void refreshDemoProfiles() {
        List<UUID> ids = jdbc.query("""
                SELECT u.id
                FROM users u
                WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u.id)
                  AND (
                    u.id::text LIKE 'c1000001-0000-4000-8000-%'
                    OR u.id IN (
                        'aaaa1111-1111-1111-1111-111111111111'::uuid,
                        'bbbb2222-2222-2222-2222-222222222222'::uuid,
                        'cccc3333-3333-3333-3333-333333333333'::uuid,
                        'dddd4444-4444-4444-4444-444444444444'::uuid,
                        'eeee5555-5555-5555-5555-555555555555'::uuid,
                        'ffff6666-6666-6666-6666-666666666666'::uuid,
                        '77777777-7777-7777-7777-777777777777'::uuid
                    )
                  )
                """, (rs, rowNum) -> rs.getObject("id", UUID.class));
        for (UUID id : ids) {
            profiles.recalculate(id);
        }
    }

    private static List<String> splitValueRows(String sql) {
        int valuesAt = indexOfValues(sql);
        if (valuesAt < 0) {
            return List.of();
        }
        String prefix = sql.substring(0, valuesAt).strip() + " VALUES ";
        String body = sql.substring(valuesAt + "VALUES".length()).strip();
        List<String> tuples = new ArrayList<>();
        int depth = 0;
        boolean inString = false;
        int start = -1;
        for (int i = 0; i < body.length(); i++) {
            char ch = body.charAt(i);
            if (inString) {
                if (ch == '\'' && i + 1 < body.length() && body.charAt(i + 1) == '\'') {
                    i++;
                } else if (ch == '\'') {
                    inString = false;
                }
                continue;
            }
            if (ch == '\'') {
                inString = true;
            } else if (ch == '(') {
                if (depth == 0) {
                    start = i;
                }
                depth++;
            } else if (ch == ')') {
                depth--;
                if (depth == 0 && start >= 0) {
                    tuples.add(body.substring(start, i + 1));
                    start = -1;
                }
            }
        }
        List<String> rows = new ArrayList<>();
        for (String tuple : tuples) {
            rows.add(prefix + tuple);
        }
        return rows;
    }

    private static int indexOfValues(String sql) {
        boolean inString = false;
        String upper = sql.toUpperCase();
        for (int i = 0; i <= sql.length() - 6; i++) {
            char ch = sql.charAt(i);
            if (inString) {
                if (ch == '\'' && i + 1 < sql.length() && sql.charAt(i + 1) == '\'') {
                    i++;
                } else if (ch == '\'') {
                    inString = false;
                }
                continue;
            }
            if (ch == '\'') {
                inString = true;
            } else if (upper.startsWith("VALUES", i)) {
                return i;
            }
        }
        return -1;
    }

    private static String cutStatement(String sql, String startToken) {
        int start = sql.indexOf(startToken);
        if (start < 0) {
            return sql;
        }
        int end = sql.indexOf(';', start);
        if (end < 0) {
            return sql;
        }
        return sql.substring(0, start) + sql.substring(end + 1);
    }

    private static String cutFrom(String sql, String startToken, String endToken) {
        int start = sql.indexOf(startToken);
        if (start < 0) {
            return sql;
        }
        int end = sql.indexOf(endToken, start);
        if (end < 0) {
            return sql;
        }
        return sql.substring(0, start) + sql.substring(end + endToken.length());
    }

    private static String readSeed() {
        try {
            return new String(
                    new ClassPathResource("db/seed/crm-demo.sql").getInputStream().readAllBytes(),
                    StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new IllegalStateException("Không đọc được file seed demo.", exception);
        }
    }

    private boolean columnExists(String table, String column) {
        return count("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
                """, table, column) > 0;
    }

    private int count(String sql, Object... args) {
        Integer value = jdbc.queryForObject(sql, Integer.class, args);
        return value == null ? 0 : value;
    }
}
