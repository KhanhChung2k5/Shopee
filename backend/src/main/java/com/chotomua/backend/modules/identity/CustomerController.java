package com.chotomua.backend.modules.identity;

import com.chotomua.backend.modules.crm.port.OrderPort;
import com.chotomua.backend.modules.identity.dto.CustomerResponse;
import com.chotomua.backend.modules.identity.dto.CustomerStatusUpdateRequest;
import com.chotomua.backend.modules.identity.dto.TemporaryPasswordResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
    public CustomerController(UserRepository userRepository, OrderPort orders, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.orders = orders;
        this.passwordEncoder = passwordEncoder;
    }

    private final PasswordEncoder passwordEncoder;

    /**
     * A customer who cannot log in (forgot the password, or the account was created by staff) gets a temporary one
     * from CS, who checks who they are first: the shop has no email or SMS to verify a reset by itself. It replaces the
     * old password, is returned this one time only, and the customer changes it on the profile page.
     */
    @PostMapping("/{id}/temporary-password")
    @Transactional
    public TemporaryPasswordResponse issueTemporaryPassword(@PathVariable UUID id) {
        User user = userRepository.findById(id)
                .filter(u -> "buyer".equals(u.getRole()))
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy khách hàng"));
        if (!"active".equals(user.getStatus())) {
            throw new IllegalStateException("Chỉ cấp mật khẩu tạm cho tài khoản đang hoạt động.");
        }
        String password = TemporaryPasswords.generate();
        user.setPasswordHash(passwordEncoder.encode(password));
        return new TemporaryPasswordResponse(password);
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setCrmEvents(com.chotomua.backend.modules.crm.application.CrmOrderEvents crmEvents) {
        this.crmEvents = crmEvents;
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
        boolean changed = !request.status().equals(user.getStatus());
        user.setStatus(request.status());
        if (changed && crmEvents != null) crmEvents.onCustomerStatusChanged(id);
        return CustomerResponse.from(user);
    }
}
