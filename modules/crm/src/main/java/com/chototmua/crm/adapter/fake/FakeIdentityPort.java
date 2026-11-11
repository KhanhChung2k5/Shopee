package com.chototmua.crm.adapter.fake;

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
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * Bản giả lập trong bộ nhớ, dùng đến khi nhóm xuất bộ chuyển đổi danh tính thật.
 * Hồ sơ {@code crm-fake} để môi trường chạy thật không nhặt nhầm bean này.
 */
@Component
@Profile("crm-fake")
public class FakeIdentityPort implements IdentityPort {

    private final Map<UUID, CustomerView> customers = new LinkedHashMap<>();
    private final Map<UUID, String> departmentByActorId = new LinkedHashMap<>();
    private final Map<UUID, AddressView> addresses = new LinkedHashMap<>();

    /** Gắn nhân viên với phòng ban để kiểm tra quyền. */
    public UUID seedStaff(String department) {
        return seedStaff(UUID.randomUUID(), department);
    }

    /** Gắn đúng mã nhân viên (dùng khi thử REST với tài khoản giả). */
    public UUID seedStaff(UUID actorId, String department) {
        departmentByActorId.put(actorId, department);
        return actorId;
    }

    /** Tạo sẵn một khách với trạng thái cho trước. */
    public CustomerView seedCustomer(String fullName, String gender, LocalDate dob, String status) {
        UUID id = UUID.randomUUID();
        return seedCustomer(id, fullName, id + "@seed.local", "0900000000", gender, dob, status);
    }

    /** Tạo sẵn khách với mã và hồ sơ đủ để demo giao diện. */
    public CustomerView seedCustomer(
            UUID id,
            String fullName,
            String email,
            String phone,
            String gender,
            LocalDate dob,
            String status
    ) {
        CustomerView view = new CustomerView(id, fullName, email, phone, gender, dob, status);
        customers.put(id, view);
        return view;
    }

    /** Gieo địa chỉ giao hàng cho khách đã có trong bộ nhớ. */
    public AddressView seedAddress(
            UUID id,
            UUID customerId,
            String recipientName,
            String phone,
            String fullAddress,
            boolean isDefault
    ) {
        getCustomer(customerId);
        if (isDefault) {
            clearDefaultFor(customerId);
        }
        AddressView view = new AddressView(id, customerId, recipientName, phone, fullAddress, isDefault);
        addresses.put(id, view);
        return view;
    }

    /** Xóa dữ liệu giả giữa các bài kiểm tra để không lẫn trạng thái. */
    public void reset() {
        customers.clear();
        departmentByActorId.clear();
        addresses.clear();
    }

    @Override
    public CustomerView createCustomer(CreateCustomerCommand command) {
        UUID id = UUID.randomUUID();
        CustomerView created = new CustomerView(
                id,
                command.fullName(),
                command.email(),
                command.phone(),
                command.gender(),
                command.dob(),
                CustomerStatus.ACTIVE);
        customers.put(id, created);
        return created;
    }

    @Override
    public CustomerView updateCustomer(UUID customerId, CreateCustomerCommand command) {
        CustomerView current = getCustomer(customerId);
        assertNotDeleted(current, "Không thể sửa khách hàng đã xóa. Hãy khôi phục trước.");
        CustomerView updated = new CustomerView(
                current.id(),
                command.fullName(),
                command.email(),
                command.phone(),
                command.gender(),
                command.dob(),
                current.status());
        customers.put(customerId, updated);
        return updated;
    }

    @Override
    public void softDeleteCustomer(UUID customerId) {
        CustomerView current = getCustomer(customerId);
        // Đã xóa là trạng thái cuối — giữ trong bộ nhớ để « Hiện đã xóa » còn thấy.
        replace(current, CustomerStatus.DELETED);
    }

    @Override
    public void restoreCustomer(UUID customerId) {
        CustomerView current = getCustomer(customerId);
        if (!CustomerStatus.DELETED.equals(current.status())) {
            throw new InvalidCustomerStatusException("Chỉ khôi phục được khách hàng đã xóa mềm.");
        }
        replace(current, CustomerStatus.ACTIVE);
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
        replace(current, CustomerStatus.LOCKED);
    }

    @Override
    public void unlock(UUID customerId) {
        CustomerView current = getCustomer(customerId);
        assertNotDeleted(current, "Không thể mở khóa khách hàng đã xóa. Dùng khôi phục (chỉ quản trị viên).");
        if (!CustomerStatus.LOCKED.equals(current.status())) {
            throw new InvalidCustomerStatusException("Chỉ mở khóa được tài khoản đang bị khóa.");
        }
        replace(current, CustomerStatus.ACTIVE);
    }

    @Override
    public List<CustomerView> findCustomers(CustomerFilter filter, boolean includeDeleted) {
        return customers.values().stream()
                .filter(customer -> includeDeleted || !CustomerStatus.DELETED.equals(customer.status()))
                .filter(customer -> matchesStatus(customer, filter))
                .filter(customer -> matchesSearch(customer, filter))
                .toList();
    }

    @Override
    public CustomerView getCustomer(UUID customerId) {
        CustomerView found = customers.get(customerId);
        if (found == null) {
            throw new CustomerNotFoundException(customerId);
        }
        return found;
    }

    @Override
    public List<AddressView> listAddresses(UUID customerId) {
        getCustomer(customerId);
        List<AddressView> rows = new ArrayList<>();
        for (AddressView address : addresses.values()) {
            if (customerId.equals(address.userId())) {
                rows.add(address);
            }
        }
        rows.sort(Comparator
                .comparing(AddressView::isDefault).reversed()
                .thenComparing(address -> address.recipientName() == null ? "" : address.recipientName()));
        return rows;
    }

    @Override
    public AddressView createAddress(UUID customerId, UpsertAddressCommand command) {
        CustomerView customer = getCustomer(customerId);
        assertNotDeleted(customer, "Không thể thêm địa chỉ cho khách hàng đã xóa. Hãy khôi phục trước.");
        UUID id = UUID.randomUUID();
        boolean makeDefault = command.isDefault() || listAddresses(customerId).isEmpty();
        if (makeDefault) {
            clearDefaultFor(customerId);
        }
        AddressView created = new AddressView(
                id,
                customerId,
                command.recipientName(),
                command.phone(),
                command.fullAddress(),
                makeDefault);
        addresses.put(id, created);
        return created;
    }

    @Override
    public AddressView updateAddress(UUID customerId, UUID addressId, UpsertAddressCommand command) {
        CustomerView customer = getCustomer(customerId);
        assertNotDeleted(customer, "Không thể sửa địa chỉ của khách hàng đã xóa. Hãy khôi phục trước.");
        AddressView current = addresses.get(addressId);
        if (current == null || !customerId.equals(current.userId())) {
            throw new AddressNotFoundException(addressId);
        }
        boolean makeDefault = command.isDefault();
        if (makeDefault) {
            clearDefaultFor(customerId);
        } else if (current.isDefault() && listAddresses(customerId).size() == 1) {
            makeDefault = true;
        }
        AddressView updated = new AddressView(
                addressId,
                customerId,
                command.recipientName(),
                command.phone(),
                command.fullAddress(),
                makeDefault);
        addresses.put(addressId, updated);
        return updated;
    }

    private void clearDefaultFor(UUID customerId) {
        for (Map.Entry<UUID, AddressView> entry : addresses.entrySet()) {
            AddressView address = entry.getValue();
            if (customerId.equals(address.userId()) && address.isDefault()) {
                entry.setValue(new AddressView(
                        address.id(),
                        address.userId(),
                        address.recipientName(),
                        address.phone(),
                        address.fullAddress(),
                        false));
            }
        }
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
        String department = departmentByActorId.get(actorId);
        if (department == null) {
            throw new CrmForbiddenException("Không xác định được nhân viên thực hiện thao tác.");
        }
        return department;
    }

    private void assertNotDeleted(CustomerView customer, String message) {
        if (CustomerStatus.DELETED.equals(customer.status())) {
            throw new InvalidCustomerStatusException(message);
        }
    }

    private void replace(CustomerView current, String status) {
        customers.put(current.id(), new CustomerView(
                current.id(),
                current.fullName(),
                current.email(),
                current.phone(),
                current.gender(),
                current.dob(),
                status));
    }

    private static boolean matchesStatus(CustomerView customer, CustomerFilter filter) {
        if (filter == null || filter.status() == null || filter.status().isBlank()) {
            return true;
        }
        return filter.status().equals(customer.status());
    }

    private static boolean matchesSearch(CustomerView customer, CustomerFilter filter) {
        if (filter == null || filter.search() == null || filter.search().isBlank()) {
            return true;
        }
        String needle = filter.search().toLowerCase(Locale.ROOT);
        return contains(customer.fullName(), needle)
                || contains(customer.email(), needle)
                || contains(customer.phone(), needle);
    }

    private static boolean contains(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
    }
}
