package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.profile.CustomerProfileService;
import com.chototmua.crm.config.CrmDemoActors;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.dto.CustomerFilter;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.StaffDepartment;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.init.ResourceDatabasePopulator;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * Gieo dữ liệu demo vào PostgreSQL khi bảng {@code users} còn trống.
 * Không chạy lại seed đầy đủ nếu đã có dòng — sửa trên DB được giữ.
 * CSDL nhóm thường đã có người dùng khác và không dùng bảng {@code roles},
 * nên vẫn bảo đảm bốn tài khoản đăng nhập giao diện có dòng {@code employees}.
 * Thiếu dòng này thì API báo không xác định được nhân viên.
 */
@Component
@Profile("crm-db")
@Order(0)
public class CrmDatabaseSeeder implements ApplicationRunner {

    private static final String PASSWORD_PLACEHOLDER = "seed-not-for-login";

    private final JdbcTemplate jdbc;
    private final IdentityPort identity;
    private final CustomerProfileService profiles;
    private final CrmDemoRemainderLoader remainder;

    public CrmDatabaseSeeder(
            JdbcTemplate jdbc,
            IdentityPort identity,
            CustomerProfileService profiles,
            CrmDemoRemainderLoader remainder
    ) {
        this.jdbc = jdbc;
        this.identity = identity;
        this.profiles = profiles;
        this.remainder = remainder;
    }

    @Override
    public void run(ApplicationArguments args) {
        Integer users = jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
        if (users != null && users > 0) {
            ensureDemoStaff();
            remainder.load();
            refreshDemoConversationSla();
            return;
        }
        ResourceDatabasePopulator populator = new ResourceDatabasePopulator();
        populator.addScript(new ClassPathResource("db/seed/crm-demo.sql"));
        populator.setContinueOnError(false);
        populator.execute(jdbc.getDataSource());
        for (CustomerView customer : identity.findCustomers(new CustomerFilter(null, null), true)) {
            profiles.recalculate(customer.id());
        }
        refreshDemoConversationSla();
    }

    /**
     * Làm mới timestamp ticket demo cố định để SLA (1h/4h/24h) không bị đỏ hàng loạt sau vài ngày.
     * Chỉ đụng 6 mã b1000001-* của seed — không đụng hội thoại thật.
     */
    private void refreshDemoConversationSla() {
        if (count("SELECT COUNT(*) FROM conversations WHERE id = ?", UUID.fromString("b1000001-0000-4000-8000-000000000001")) == 0) {
            return;
        }
        try {
            jdbc.update("""
                    UPDATE conversations SET
                      priority = CASE id
                        WHEN 'b1000001-0000-4000-8000-000000000001'::uuid THEN 'low'
                        WHEN 'b1000001-0000-4000-8000-000000000002'::uuid THEN 'normal'
                        WHEN 'b1000001-0000-4000-8000-000000000003'::uuid THEN 'high'
                        WHEN 'b1000001-0000-4000-8000-000000000004'::uuid THEN 'low'
                        WHEN 'b1000001-0000-4000-8000-000000000005'::uuid THEN 'normal'
                        WHEN 'b1000001-0000-4000-8000-000000000006'::uuid THEN 'high'
                        ELSE priority
                      END,
                      status = CASE id
                        WHEN 'b1000001-0000-4000-8000-000000000003'::uuid THEN 'open'
                        WHEN 'b1000001-0000-4000-8000-000000000006'::uuid THEN 'closed'
                        ELSE status
                      END,
                      channel = CASE id
                        WHEN 'b1000001-0000-4000-8000-000000000001'::uuid THEN 'web|khieu_nai'
                        WHEN 'b1000001-0000-4000-8000-000000000002'::uuid THEN 'web|hoi_don'
                        WHEN 'b1000001-0000-4000-8000-000000000003'::uuid THEN 'web|khieu_nai'
                        WHEN 'b1000001-0000-4000-8000-000000000004'::uuid THEN 'web|bao_hanh'
                        WHEN 'b1000001-0000-4000-8000-000000000005'::uuid THEN 'web|hoi_don'
                        WHEN 'b1000001-0000-4000-8000-000000000006'::uuid THEN 'web|khieu_nai'
                        ELSE channel
                      END,
                      last_message_at = CASE id
                        WHEN 'b1000001-0000-4000-8000-000000000001'::uuid THEN now() - interval '1 hours'
                        WHEN 'b1000001-0000-4000-8000-000000000002'::uuid THEN now() - interval '50 minutes'
                        WHEN 'b1000001-0000-4000-8000-000000000003'::uuid THEN now() - interval '2 days'
                        WHEN 'b1000001-0000-4000-8000-000000000004'::uuid THEN now() - interval '3 hours'
                        WHEN 'b1000001-0000-4000-8000-000000000005'::uuid THEN now() - interval '30 minutes'
                        WHEN 'b1000001-0000-4000-8000-000000000006'::uuid THEN now() - interval '5 days'
                        ELSE last_message_at
                      END
                    WHERE id IN (
                      'b1000001-0000-4000-8000-000000000001'::uuid,
                      'b1000001-0000-4000-8000-000000000002'::uuid,
                      'b1000001-0000-4000-8000-000000000003'::uuid,
                      'b1000001-0000-4000-8000-000000000004'::uuid,
                      'b1000001-0000-4000-8000-000000000005'::uuid,
                      'b1000001-0000-4000-8000-000000000006'::uuid
                    )
                    """);
            jdbc.update("""
                    UPDATE conversation_messages SET sent_at = CASE id
                      WHEN 'b2000001-0000-4000-8000-000000000001'::uuid THEN now() - interval '2 hours'
                      WHEN 'b2000001-0000-4000-8000-000000000002'::uuid THEN now() - interval '1 hours'
                      WHEN 'b2000001-0000-4000-8000-000000000003'::uuid THEN now() - interval '50 minutes'
                      WHEN 'b2000001-0000-4000-8000-000000000004'::uuid THEN now() - interval '40 minutes'
                      WHEN 'b2000001-0000-4000-8000-000000000005'::uuid THEN now() - interval '2 days'
                      WHEN 'b2000001-0000-4000-8000-000000000006'::uuid THEN now() - interval '2 days' + interval '30 minutes'
                      WHEN 'b2000001-0000-4000-8000-000000000007'::uuid THEN now() - interval '3 hours'
                      WHEN 'b2000001-0000-4000-8000-000000000008'::uuid THEN now() - interval '2 hours'
                      WHEN 'b2000001-0000-4000-8000-000000000009'::uuid THEN now() - interval '3 hours 50 minutes'
                      WHEN 'b2000001-0000-4000-8000-000000000010'::uuid THEN now() - interval '30 minutes'
                      WHEN 'b2000001-0000-4000-8000-000000000011'::uuid THEN now() - interval '6 days'
                      WHEN 'b2000001-0000-4000-8000-000000000012'::uuid THEN now() - interval '5 days'
                      ELSE sent_at
                    END
                    WHERE id IN (
                      'b2000001-0000-4000-8000-000000000001'::uuid,
                      'b2000001-0000-4000-8000-000000000002'::uuid,
                      'b2000001-0000-4000-8000-000000000003'::uuid,
                      'b2000001-0000-4000-8000-000000000004'::uuid,
                      'b2000001-0000-4000-8000-000000000005'::uuid,
                      'b2000001-0000-4000-8000-000000000006'::uuid,
                      'b2000001-0000-4000-8000-000000000007'::uuid,
                      'b2000001-0000-4000-8000-000000000008'::uuid,
                      'b2000001-0000-4000-8000-000000000009'::uuid,
                      'b2000001-0000-4000-8000-000000000010'::uuid,
                      'b2000001-0000-4000-8000-000000000011'::uuid,
                      'b2000001-0000-4000-8000-000000000012'::uuid
                    )
                    """);
        } catch (DataAccessException ignored) {
            // Schema nhóm thiếu bảng hội thoại thì bỏ qua.
        }
    }

    private void ensureDemoStaff() {
        boolean roleById = columnExists("users", "role_id");
        UUID roleId = roleById ? staffRoleId() : null;
        String roleName = roleById ? null : staffRoleName();
        boolean salaryRequired = requiredColumn("employees", "base_salary");
        ensureStaff(
                CrmDemoActors.ADMIN_ID,
                UUID.fromString("e1111111-1111-1111-1111-111111111111"),
                roleId,
                roleName,
                salaryRequired,
                "0900000001",
                "admin@chototmua.local",
                "Quản trị viên",
                StaffDepartment.ADMIN,
                "Quản trị");
        ensureStaff(
                CrmDemoActors.CRM_ID,
                UUID.fromString("e2222222-2222-2222-2222-222222222222"),
                roleId,
                roleName,
                salaryRequired,
                "0900000002",
                "crm@chototmua.local",
                "Quản lý CRM",
                StaffDepartment.CRM,
                "Quản lý CRM");
        ensureStaff(
                CrmDemoActors.CS_ID,
                UUID.fromString("e3333333-3333-3333-3333-333333333333"),
                roleId,
                roleName,
                salaryRequired,
                "0900000003",
                "cs@chototmua.local",
                "Minh",
                StaffDepartment.CS,
                "CSKH");
        jdbc.update(
                "UPDATE users SET full_name = ? WHERE id = ? AND full_name <> ?",
                "Minh",
                CrmDemoActors.CS_ID,
                "Minh");
        ensureStaff(
                CrmDemoActors.SALES_ID,
                UUID.fromString("e5555555-5555-5555-5555-555555555555"),
                roleId,
                roleName,
                salaryRequired,
                "0900000005",
                "sales@chototmua.local",
                "Nhân viên kinh doanh",
                StaffDepartment.SALES,
                "Kinh doanh");
    }

    private void ensureStaff(
            UUID userId,
            UUID employeeId,
            UUID roleId,
            String roleName,
            boolean salaryRequired,
            String phone,
            String email,
            String fullName,
            String department,
            String position
    ) {
        if (count("SELECT COUNT(*) FROM employees WHERE user_id = ?", userId) > 0) {
            return;
        }
        try {
            if (count("SELECT COUNT(*) FROM users WHERE id = ?", userId) == 0) {
                insertDemoUser(userId, roleId, roleName, phone, email, fullName);
            }
            UUID id = count("SELECT COUNT(*) FROM employees WHERE id = ?", employeeId) > 0
                    ? UUID.randomUUID()
                    : employeeId;
            if (salaryRequired) {
                jdbc.update("""
                        INSERT INTO employees (id, user_id, department, position, base_salary, hired_at)
                        VALUES (?, ?, ?, ?, 0, now())
                        """,
                        id,
                        userId,
                        department,
                        position);
            } else {
                jdbc.update("""
                        INSERT INTO employees (id, user_id, department, position, hired_at)
                        VALUES (?, ?, ?, ?, now())
                        """,
                        id,
                        userId,
                        department,
                        position);
            }
        } catch (DataAccessException exception) {
            throw new IllegalStateException(
                    "Không gắn được nhân viên demo " + department + ". Ràng buộc: " + checkDefinitions("employees")
                            + " " + checkDefinitions("users"),
                    exception);
        }
    }

    private void insertDemoUser(UUID userId, UUID roleId, String roleName, String phone, String email, String fullName) {
        String useEmail = count("SELECT COUNT(*) FROM users WHERE email = ?", email) > 0
                ? "demo-" + userId.toString().substring(0, 8) + "@chototmua.local"
                : email;
        String usePhone = count("SELECT COUNT(*) FROM users WHERE phone = ?", phone) > 0 ? null : phone;
        if (roleId != null) {
            jdbc.update("""
                    INSERT INTO users (id, role_id, phone, email, password_hash, status, full_name)
                    VALUES (?, ?, ?, ?, ?, 'active', ?)
                    """,
                    userId,
                    roleId,
                    usePhone,
                    useEmail,
                    PASSWORD_PLACEHOLDER,
                    fullName);
            return;
        }
        jdbc.update("""
                INSERT INTO users (id, role, phone, email, password_hash, status, full_name)
                VALUES (?, ?, ?, ?, ?, 'active', ?)
                """,
                userId,
                roleName,
                usePhone,
                useEmail,
                PASSWORD_PLACEHOLDER,
                fullName);
    }

    private String staffRoleName() {
        List<String> found = jdbc.query("""
                SELECT u.role
                FROM users u
                JOIN employees e ON e.user_id = u.id
                WHERE u.role IS NOT NULL
                LIMIT 1
                """,
                (rs, rowNum) -> rs.getString(1));
        if (!found.isEmpty()) {
            return found.getFirst();
        }
        return "staff";
    }

    private UUID staffRoleId() {
        List<UUID> found = jdbc.query(
                "SELECT id FROM roles WHERE name = 'staff'",
                (rs, rowNum) -> rs.getObject("id", UUID.class));
        if (!found.isEmpty()) {
            return found.getFirst();
        }
        UUID id = UUID.fromString("00000000-0000-0000-0000-000000000002");
        if (count("SELECT COUNT(*) FROM roles WHERE id = ?", id) > 0) {
            id = UUID.randomUUID();
        }
        jdbc.update("INSERT INTO roles (id, name) VALUES (?, 'staff')", id);
        return id;
    }

    private boolean columnExists(String table, String column) {
        Integer found = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
                """,
                Integer.class,
                table,
                column);
        return found != null && found > 0;
    }

    private boolean requiredColumn(String table, String column) {
        List<Boolean> required = jdbc.query("""
                SELECT is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
                """,
                (rs, rowNum) -> "NO".equals(rs.getString("is_nullable")) && rs.getString("column_default") == null,
                table,
                column);
        return !required.isEmpty() && required.getFirst();
    }

    private String checkDefinitions(String table) {
        List<String> defs = jdbc.query("""
                SELECT pg_get_constraintdef(c.oid)
                FROM pg_constraint c
                JOIN pg_class t ON t.oid = c.conrelid
                JOIN pg_namespace n ON n.oid = t.relnamespace
                WHERE n.nspname = 'public' AND t.relname = ? AND c.contype = 'c'
                """,
                (rs, rowNum) -> rs.getString(1),
                table);
        return defs.isEmpty() ? "(không có)" : String.join("; ", defs);
    }

    private int count(String sql, Object arg) {
        Integer value = jdbc.queryForObject(sql, Integer.class, arg);
        return value == null ? 0 : value;
    }
}
