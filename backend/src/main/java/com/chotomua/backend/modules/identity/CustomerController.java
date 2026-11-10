package com.chotomua.backend.modules.identity;

import com.chotomua.backend.modules.crm.port.OrderPort;
import com.chotomua.backend.modules.identity.dto.CustomerResponse;
import com.chotomua.backend.modules.identity.dto.CustomerStatusUpdateRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.transaction.annotation.Transactional;

/** CS/admin read/status-management view over buyer accounts (CRM "Khách hàng" page). */
@RestController
@RequestMapping("/customers")
public class CustomerController {
    // Repository for User
    private final UserRepository userRepository;
    // Unfinished orders / refunds of a buyer (shared with the CRM customer service)
    private final OrderPort orders;
    // Keeps CRM segments in step with the new status (optional so slim test contexts still start)
    private com.chotomua.backend.modules.crm.application.CrmOrderEvents crmEvents;
    // Constructor for CustomerController
    public CustomerController(UserRepository userRepository, OrderPort orders) {
        this.userRepository = userRepository;
        this.orders = orders;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setCrmEvents(com.chotomua.backend.modules.crm.application.CrmOrderEvents crmEvents) {
        this.crmEvents = crmEvents;
    }

    // Orders and addresses for the customer detail view (optional so slim test contexts still start)
    private com.chotomua.backend.modules.order.OrderService orderService;
    private AddressRepository addresses;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setOrderService(com.chotomua.backend.modules.order.OrderService orderService) {
        this.orderService = orderService;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setAddresses(AddressRepository addresses) {
        this.addresses = addresses;
    }

    /** One customer with addresses and every order (status, payment, total) — CS / admin, like the rest of /customers. */
    @GetMapping("/{id}/detail")
    @Transactional(readOnly = true)
    public com.chotomua.backend.modules.identity.dto.CustomerDetailResponse detail(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .filter(u -> "buyer".equals(u.getRole()))
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy khách hàng"));
        return com.chotomua.backend.modules.identity.dto.CustomerDetailResponse.of(user,
                addresses == null ? List.of() : addresses.findByUserId(id),
                orderService == null ? List.of() : orderService.listForCustomer(id));
    }

    // List all customers
    @GetMapping
    @Transactional(readOnly = true)
    public List<CustomerResponse> list() {
        return userRepository.findByRoleOrderByCreatedAtDesc("buyer").stream()
                .map(CustomerResponse::from)
                .toList();
    }

    // Update the status of a customer
    @PatchMapping("/{id}/status")
    @Transactional
    public CustomerResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody CustomerStatusUpdateRequest request) {
        // Find the user by ID
        User user = userRepository.findById(id)
                // Check if the user is a buyer
                .filter(u -> "buyer".equals(u.getRole()))
                // If the user is not a buyer, throw an exception
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy khách hàng"));
        // A soft-deleted account only comes back through POST /api/customers/{id}/restore (admin only, audited)
        if ("deleted".equals(user.getStatus()) && !"deleted".equals(request.status())) {
            throw new IllegalStateException("Khách hàng đã bị xoá. Dùng chức năng Khôi phục để mở lại tài khoản.");
        }
        // Locking or deleting a buyer mid-order would strand the delivery or the money still owed to them
        if (("locked".equals(request.status()) || "deleted".equals(request.status())) && !request.status().equals(user.getStatus())) {
            OrderPort.OpenWork open = orders.openWork(id);
            if (open.any()) {
                throw new IllegalStateException("Không thể " + ("locked".equals(request.status()) ? "khóa" : "xóa")
                        + " khách đang có " + open.describe() + ". Hãy xử lý xong trước.");
            }
        }
        // Update the status of the user
        boolean changed = !request.status().equals(user.getStatus());
        user.setStatus(request.status());
        if (changed && crmEvents != null) crmEvents.onCustomerStatusChanged(id);
        return CustomerResponse.from(user);
    }
}
