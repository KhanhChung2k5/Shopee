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
    // Constructor for CustomerController
    public CustomerController(UserRepository userRepository, OrderPort orders) {
        this.userRepository = userRepository;
        this.orders = orders;
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
            throw new IllegalStateException("Khách hàng đã xoá mềm. Chỉ quản trị viên được khôi phục bằng chức năng Khôi phục.");
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
        user.setStatus(request.status());
        return CustomerResponse.from(user);
    }
}
