package com.chotomua.backend.modules.identity;

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

/** Admin-only read/status-management view over buyer accounts (CRM "Khách hàng" page). */
@RestController
@RequestMapping("/customers")
public class CustomerController {

    private final UserRepository userRepository;

    public CustomerController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<CustomerResponse> list() {
        return userRepository.findByRoleOrderByCreatedAtDesc("buyer").stream()
                .map(CustomerResponse::from)
                .toList();
    }

    @PatchMapping("/{id}/status")
    @Transactional
    public CustomerResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody CustomerStatusUpdateRequest request) {
        User user = userRepository.findById(id)
                .filter(u -> "buyer".equals(u.getRole()))
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy khách hàng"));
        user.setStatus(request.status());
        return CustomerResponse.from(user);
    }
}
