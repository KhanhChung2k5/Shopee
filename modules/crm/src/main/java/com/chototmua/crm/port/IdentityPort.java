package com.chototmua.crm.port;

import com.chototmua.crm.port.dto.AddressView;
import com.chototmua.crm.port.dto.CreateCustomerCommand;
import com.chototmua.crm.port.dto.CustomerFilter;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.UpsertAddressCommand;

import java.util.List;
import java.util.UUID;

/**
 * Cổng sang phân hệ danh tính (nhóm A). CRM không tiêm kho User trực tiếp.
 * {@code requireCustomerAdmin}: quản trị hoặc quản lý CRM (câu chuyện 1–3).
 * {@code requireCrmStaff}: quản trị, quản lý CRM hoặc CSKH (câu chuyện 4–7).
 */
public interface IdentityPort {

    /** Tạo khách mới; trạng thái ban đầu là đang hoạt động. */
    CustomerView createCustomer(CreateCustomerCommand command);

    /** Cập nhật hồ sơ; giữ nguyên trạng thái. Không sửa khách đã xóa. */
    CustomerView updateCustomer(UUID customerId, CreateCustomerCommand command);

    /** Xóa mềm: chuyển sang {@code deleted}, không xóa cứng. */
    void softDeleteCustomer(UUID customerId);

    /** Khôi phục khách đã xóa mềm về {@code active}. Chỉ quản trị viên gọi. */
    void restoreCustomer(UUID customerId);

    /** Khóa tài khoản đang hoạt động. */
    void lock(UUID customerId);

    /** Mở khóa tài khoản đang bị khóa. Khách đã xóa thì không đi đường này. */
    void unlock(UUID customerId);

    /**
     * Liệt kê khách. Mặc định ẩn bản ghi đã xóa;
     * {@code includeDeleted=true} khi giao diện bật « Hiện đã xóa ».
     */
    List<CustomerView> findCustomers(CustomerFilter filter, boolean includeDeleted);

    /** Lấy một khách; không thấy thì báo không tìm thấy. */
    CustomerView getCustomer(UUID customerId);

    /** Liệt kê địa chỉ giao hàng của khách (mặc định trước). */
    List<AddressView> listAddresses(UUID customerId);

    /** Thêm địa chỉ mới cho khách. Không thêm khi khách đã xóa. */
    AddressView createAddress(UUID customerId, UpsertAddressCommand command);

    /** Cập nhật địa chỉ thuộc khách. Không sửa khi khách đã xóa. */
    AddressView updateAddress(UUID customerId, UUID addressId, UpsertAddressCommand command);

    /** Câu chuyện 1–3: chỉ quản trị hoặc quản lý CRM. CSKH phải bị từ chối. */
    void requireCustomerAdmin(UUID actorId);

    /** Khôi phục khách đã xóa: chỉ quản trị viên hệ thống. */
    void requireAdmin(UUID actorId);

    /** Nhật ký thao tác: chỉ quản trị viên hệ thống. */
    void requireSystemAdmin(UUID actorId);

    /** Câu chuyện 4–7: quản trị, quản lý CRM hoặc CSKH. */
    void requireCrmStaff(UUID actorId);
}
