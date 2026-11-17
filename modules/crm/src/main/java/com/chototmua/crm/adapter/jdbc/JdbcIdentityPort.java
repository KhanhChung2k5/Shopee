package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.exception.AddressNotFoundException;
import com.chototmua.crm.application.exception.CrmForbiddenException;
import com.chototmua.crm.application.exception.CustomerNotFoundException;
import com.chototmua.crm.application.exception.InvalidCustomerStatusException;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.dto.AddressView;
import com.chototmua.crm.port.dto.CreateCustomerCommand;
import com.chototmua.crm.port.dto.CustomerFilter;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.StaffDepartment;
import com.chototmua.crm.port.dto.UpsertAddressCommand;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Đọc và ghi khách trên bảng {@code users}. Nhân viên (có dòng {@code employees}) không nằm trong danh sách khách.
 */
@Component
@Profile("crm-db")
public class JdbcIdentityPort implements IdentityPort {

    private static final String PASSWORD_PLACEHOLDER = "seed-not-for-login";

    private static final String CUSTOMER_COLUMNS = """
            SELECT u.id, u.full_name, u.email, u.phone, u.gender, u.dob, u.status
            FROM users u
            WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = u.id)
            """;

    private final JdbcTemplate jdbc;
    private final boolean roleById;

    public JdbcIdentityPort(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.roleById = columnExists("users", "role_id");
    }

    @Override
    public CustomerView createCustomer(CreateCustomerCommand command) {
        UUID id = UUID.randomUUID();
        try {
            if (roleById) {
                jdbc.update("""
                        INSERT INTO users (id, role_id, phone, email, password_hash, status, full_name, gender, dob)
                        VALUES (?, (SELECT id FROM roles WHERE name = 'customer'), ?, ?, ?, ?, ?, ?, ?)
                        """,
                        id,
                        blankToNull(command.phone()),
                        blankToNull(command.email()),
                        PASSWORD_PLACEHOLDER,
                        CustomerStatus.ACTIVE,
                        command.fullName(),
                        blankToNull(command.gender()),
                        toDate(command.dob()));
            } else {
                jdbc.update("""
                        INSERT INTO users (id, role, phone, email, password_hash, status, full_name, gender, dob)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        id,
                        customerRoleName(),
                        blankToNull(command.phone()),
                        blankToNull(command.email()),
                        PASSWORD_PLACEHOLDER,
                        CustomerStatus.ACTIVE,
                        command.fullName(),
                        blankToNull(command.gender()),
                        toDate(command.dob()));
            }
        } catch (DataIntegrityViolationException exception) {
            throw new InvalidCustomerStatusException("Email hoặc số điện thoại đã được dùng.");
        }
        return getCustomer(id);
    }

    @Override
    public CustomerView updateCustomer(UUID customerId, CreateCustomerCommand command) {
        CustomerView current = getCustomer(customerId);
        assertNotDeleted(current, "Không thể sửa khách hàng đã xóa. Hãy khôi phục trước.");
        try {
            jdbc.update("""
                    UPDATE users
                    SET full_name = ?, email = ?, phone = ?, gender = ?, dob = ?
                    WHERE id = ?
                    """,
                    command.fullName(),
                    blankToNull(command.email()),
                    blankToNull(command.phone()),
                    blankToNull(command.gender()),
                    toDate(command.dob()),
                    customerId);
        } catch (DataIntegrityViolationException exception) {
            throw new InvalidCustomerStatusException("Email hoặc số điện thoại đã được dùng.");
        }
        return getCustomer(customerId);
    }

    @Override
    public void softDeleteCustomer(UUID customerId) {
        getCustomer(customerId);
        setStatus(customerId, CustomerStatus.DELETED);
    }

    @Override
    public void restoreCustomer(UUID customerId) {
        CustomerView current = getCustomer(customerId);
        if (!CustomerStatus.DELETED.equals(current.status())) {
            throw new InvalidCustomerStatusException("Chỉ khôi phục được khách hàng đã xóa mềm.");
        }
        setStatus(customerId, CustomerStatus.ACTIVE);
    }

    @Override
    public void lock(UUID customerId) {
        CustomerView current = getCustomer(customerId);
        assertNotDeleted(current, "Không thể khóa khách hàng đã xóa.");
        if (CustomerStatus.LOCKED.equals(current.status())) {
            return;
        }
        if (!CustomerStatus.ACTIVE.equals(current.status())) {
            throw new InvalidCustomerStatusException("Chỉ khóa được tài khoản đang hoạt động.");
        }
        setStatus(customerId, CustomerStatus.LOCKED);
    }

    @Override
    public void unlock(UUID customerId) {
        CustomerView current = getCustomer(customerId);
        assertNotDeleted(current, "Không thể mở khóa khách hàng đã xóa. Dùng khôi phục (chỉ quản trị viên).");
        if (!CustomerStatus.LOCKED.equals(current.status())) {
            throw new InvalidCustomerStatusException("Chỉ mở khóa được tài khoản đang bị khóa.");
        }
        setStatus(customerId, CustomerStatus.ACTIVE);
    }

    @Override
    public List<CustomerView> findCustomers(CustomerFilter filter, boolean includeDeleted) {
        StringBuilder sql = new StringBuilder(CUSTOMER_COLUMNS);
        List<Object> args = new ArrayList<>();
        if (!includeDeleted) {
            sql.append(" AND u.status <> ?");
            args.add(CustomerStatus.DELETED);
        }
        if (filter != null && filter.status() != null && !filter.status().isBlank()) {
            sql.append(" AND u.status = ?");
            args.add(filter.status());
        }
        if (filter != null && filter.search() != null && !filter.search().isBlank()) {
            sql.append(" AND (lower(coalesce(u.full_name, '')) LIKE ? OR lower(coalesce(u.email, '')) LIKE ? OR lower(coalesce(u.phone, '')) LIKE ?)");
            String needle = "%" + filter.search().toLowerCase(Locale.ROOT) + "%";
            args.add(needle);
            args.add(needle);
            args.add(needle);
        }
        sql.append(" ORDER BY u.created_at");
        return jdbc.query(sql.toString(), (rs, rowNum) -> mapCustomer(rs), args.toArray());
    }

    @Override
    public CustomerView getCustomer(UUID customerId) {
        List<CustomerView> found = jdbc.query(
                CUSTOMER_COLUMNS + " AND u.id = ?",
                (rs, rowNum) -> mapCustomer(rs),
                customerId);
        if (found.isEmpty()) {
            throw new CustomerNotFoundException(customerId);
        }
        return found.getFirst();
    }

    @Override
    public List<AddressView> listAddresses(UUID customerId) {
        getCustomer(customerId);
        return jdbc.query("""
                SELECT id, user_id, recipient_name, phone, full_address, is_default
                FROM addresses
                WHERE user_id = ?
                ORDER BY is_default DESC, recipient_name
                """,
                (rs, rowNum) -> mapAddress(rs),
                customerId);
    }

    @Override
    public AddressView createAddress(UUID customerId, UpsertAddressCommand command) {
        CustomerView customer = getCustomer(customerId);
        assertNotDeleted(customer, "Không thể thêm địa chỉ cho khách hàng đã xóa. Hãy khôi phục trước.");
        UUID id = UUID.randomUUID();
        boolean makeDefault = command.isDefault() || listAddresses(customerId).isEmpty();
        if (makeDefault) {
            clearDefaultAddresses(customerId);
        }
        jdbc.update("""
                INSERT INTO addresses (id, user_id, recipient_name, phone, full_address, is_default)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                id,
                customerId,
                command.recipientName(),
                command.phone(),
                command.fullAddress(),
                makeDefault);
        return getAddress(customerId, id);
    }

    @Override
    public AddressView updateAddress(UUID customerId, UUID addressId, UpsertAddressCommand command) {
        CustomerView customer = getCustomer(customerId);
        assertNotDeleted(customer, "Không thể sửa địa chỉ của khách hàng đã xóa. Hãy khôi phục trước.");
        AddressView current = getAddress(customerId, addressId);
        boolean makeDefault = command.isDefault();
        if (makeDefault) {
            clearDefaultAddresses(customerId);
        } else if (current.isDefault() && listAddresses(customerId).size() == 1) {
            makeDefault = true;
        }
        int updated = jdbc.update("""
                UPDATE addresses
                SET recipient_name = ?, phone = ?, full_address = ?, is_default = ?
                WHERE id = ? AND user_id = ?
                """,
                command.recipientName(),
                command.phone(),
                command.fullAddress(),
                makeDefault,
                addressId,
                customerId);
        if (updated == 0) {
            throw new AddressNotFoundException(addressId);
        }
        return getAddress(customerId, addressId);
    }

    private AddressView getAddress(UUID customerId, UUID addressId) {
        List<AddressView> found = jdbc.query("""
                SELECT id, user_id, recipient_name, phone, full_address, is_default
                FROM addresses
                WHERE id = ? AND user_id = ?
                """,
                (rs, rowNum) -> mapAddress(rs),
                addressId,
                customerId);
        if (found.isEmpty()) {
            throw new AddressNotFoundException(addressId);
        }
        return found.getFirst();
    }

    private void clearDefaultAddresses(UUID customerId) {
        jdbc.update("UPDATE addresses SET is_default = false WHERE user_id = ?", customerId);
    }

    private static AddressView mapAddress(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new AddressView(
                rs.getObject("id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getString("recipient_name"),
                rs.getString("phone"),
                rs.getString("full_address"),
                rs.getBoolean("is_default"));
    }

    @Override
    public void requireCustomerAdmin(UUID actorId) {
        String department = requireKnownStaff(actorId);
        if (!StaffDepartment.ADMIN.equals(department) && !StaffDepartment.CRM.equals(department)) {
            throw new CrmForbiddenException(
                    "Chỉ quản trị viên hoặc quản lý CRM được thực hiện thao tác này.");
        }
    }

    @Override
    public void requireAdmin(UUID actorId) {
        String department = requireKnownStaff(actorId);
        if (!StaffDepartment.ADMIN.equals(department)) {
            throw new CrmForbiddenException("Chỉ quản trị viên được khôi phục khách hàng đã xóa.");
        }
    }

    @Override
    public void requireSystemAdmin(UUID actorId) {
        String department = requireKnownStaff(actorId);
        if (!StaffDepartment.ADMIN.equals(department)) {
            throw new CrmForbiddenException("Chỉ quản trị viên được xem nhật ký thao tác.");
        }
    }

    @Override
    public void requireCrmStaff(UUID actorId) {
        String department = requireKnownStaff(actorId);
        boolean allowed = StaffDepartment.ADMIN.equals(department)
                || StaffDepartment.CRM.equals(department)
                || StaffDepartment.CS.equals(department);
        if (!allowed) {
            throw new CrmForbiddenException(
                    "Chỉ nhân viên CSKH, quản lý CRM hoặc quản trị viên được thực hiện thao tác này.");
        }
    }

    private String requireKnownStaff(UUID actorId) {
        List<String> departments = jdbc.query(
                "SELECT department FROM employees WHERE user_id = ?",
                (rs, rowNum) -> rs.getString("department"),
                actorId);
        if (departments.isEmpty()) {
            throw new CrmForbiddenException("Không xác định được nhân viên thực hiện thao tác.");
        }
        return departments.getFirst();
    }

    private void setStatus(UUID customerId, String status) {
        jdbc.update("UPDATE users SET status = ? WHERE id = ?", status, customerId);
    }

    private static void assertNotDeleted(CustomerView customer, String message) {
        if (CustomerStatus.DELETED.equals(customer.status())) {
            throw new InvalidCustomerStatusException(message);
        }
    }

    private static CustomerView mapCustomer(java.sql.ResultSet rs) throws java.sql.SQLException {
        Date dob = rs.getDate("dob");
        return new CustomerView(
                rs.getObject("id", UUID.class),
                rs.getString("full_name"),
                rs.getString("email"),
                rs.getString("phone"),
                rs.getString("gender"),
                dob == null ? null : dob.toLocalDate(),
                rs.getString("status"));
    }

    private String customerRoleName() {
        List<String> found = jdbc.query("""
                SELECT role
                FROM users
                WHERE role IS NOT NULL
                  AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.user_id = users.id)
                GROUP BY role
                ORDER BY COUNT(*) DESC
                LIMIT 1
                """,
                (rs, rowNum) -> rs.getString(1));
        if (!found.isEmpty()) {
            return found.getFirst();
        }
        return "buyer";
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

    private static Date toDate(LocalDate dob) {
        return dob == null ? null : Date.valueOf(dob);
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }
}
