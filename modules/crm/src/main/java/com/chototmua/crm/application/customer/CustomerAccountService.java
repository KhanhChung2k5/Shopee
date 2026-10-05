package com.chototmua.crm.application.customer;

import com.chototmua.crm.application.exception.InvalidCustomerStatusException;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.dto.AddressView;
import com.chototmua.crm.port.dto.CreateCustomerCommand;
import com.chototmua.crm.port.dto.CustomerFilter;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.UpsertAddressCommand;
import com.chototmua.crm.web.dto.CustomerDetailResponse;
import com.chototmua.crm.web.dto.CustomerListResponse;
import com.chototmua.crm.web.dto.PaginationResponse;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * Nghiệp vụ vòng đời khách. Không viết thẳng kho User — mọi ghi đều qua cổng danh tính.
 */
@Service
public class CustomerAccountService {

    private static final int MAX_PAGE_SIZE = 100;

    private final IdentityPort identity;

    /** Mọi thao tác khách đi qua {@link IdentityPort}, không ghi thẳng bảng user. */
    public CustomerAccountService(IdentityPort identity) {
        this.identity = identity;
    }

    /** Câu chuyện 1: thêm khách. Chỉ quản trị / quản lý CRM. */
    public CustomerView create(UUID actorId, CreateCustomerCommand command) {
        identity.requireCustomerAdmin(actorId);
        return identity.createCustomer(command);
    }

    /** Sửa hồ sơ (tên, email, SĐT, giới tính, ngày sinh). Admin và quản lý CRM. */
    public CustomerView update(UUID actorId, UUID customerId, CreateCustomerCommand command) {
        identity.requireCustomerAdmin(actorId);
        return identity.updateCustomer(customerId, command);
    }

    /** Khóa tài khoản đang hoạt động. */
    public CustomerView lock(UUID actorId, UUID customerId) {
        identity.requireCustomerAdmin(actorId);
        identity.lock(customerId);
        return identity.getCustomer(customerId);
    }

    /** Mở khóa tài khoản đang bị khóa. */
    public CustomerView unlock(UUID actorId, UUID customerId) {
        identity.requireCustomerAdmin(actorId);
        identity.unlock(customerId);
        return identity.getCustomer(customerId);
    }

    /** Câu chuyện 2: xóa mềm. */
    public CustomerView softDelete(UUID actorId, UUID customerId) {
        identity.requireCustomerAdmin(actorId);
        identity.softDeleteCustomer(customerId);
        return identity.getCustomer(customerId);
    }

    /** Khôi phục khách đã xóa về đang hoạt động — chỉ quản trị viên. */
    public CustomerView restore(UUID actorId, UUID customerId) {
        identity.requireAdmin(actorId);
        identity.restoreCustomer(customerId);
        return identity.getCustomer(customerId);
    }

    /**
     * Áp trạng thái từ PATCH.
     * {@code deleted} → {@code active} chỉ quản trị viên (khôi phục); quản lý CRM bị 403.
     */
    public CustomerView applyStatus(UUID actorId, UUID customerId, String status) {
        if (CustomerStatus.LOCKED.equals(status)) {
            return lock(actorId, customerId);
        }
        if (CustomerStatus.ACTIVE.equals(status)) {
            CustomerView current = identity.getCustomer(customerId);
            if (CustomerStatus.DELETED.equals(current.status())) {
                return restore(actorId, customerId);
            }
            return unlock(actorId, customerId);
        }
        if (CustomerStatus.DELETED.equals(status)) {
            return softDelete(actorId, customerId);
        }
        throw new InvalidCustomerStatusException("Trạng thái khách hàng không hợp lệ.");
    }

    /** Liệt kê; CSKH được xem (câu chuyện 4–7) nhưng không được sửa. */
    public CustomerListResponse list(
            UUID actorId,
            CustomerFilter filter,
            boolean includeDeleted,
            int page,
            int pageSize
    ) {
        identity.requireCrmStaff(actorId);
        List<CustomerView> all = identity.findCustomers(filter, includeDeleted);
        int safePage = Math.max(page, 1);
        int safeSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);
        int from = Math.min((safePage - 1) * safeSize, all.size());
        int to = Math.min(from + safeSize, all.size());
        long total = all.size();
        int totalPages = safeSize == 0 ? 0 : (int) Math.ceil(total / (double) safeSize);
        return new CustomerListResponse(
                all.subList(from, to),
                new PaginationResponse(safePage, safeSize, total, totalPages));
    }

    /** Xem hồ sơ + địa chỉ. Admin / CRM / CSKH đều xem được. */
    public CustomerDetailResponse detail(UUID actorId, UUID customerId) {
        identity.requireCrmStaff(actorId);
        return new CustomerDetailResponse(
                identity.getCustomer(customerId),
                identity.listAddresses(customerId));
    }

    /** Thêm địa chỉ. Chỉ Admin / CRM Manager. */
    public AddressView createAddress(UUID actorId, UUID customerId, UpsertAddressCommand command) {
        identity.requireCustomerAdmin(actorId);
        return identity.createAddress(customerId, command);
    }

    /** Sửa địa chỉ. Chỉ Admin / CRM Manager. */
    public AddressView updateAddress(
            UUID actorId,
            UUID customerId,
            UUID addressId,
            UpsertAddressCommand command
    ) {
        identity.requireCustomerAdmin(actorId);
        return identity.updateAddress(customerId, addressId, command);
    }
}
