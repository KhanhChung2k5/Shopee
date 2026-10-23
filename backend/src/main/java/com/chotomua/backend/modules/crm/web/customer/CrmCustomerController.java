package com.chotomua.backend.modules.crm.web.customer;

import com.chotomua.backend.modules.crm.application.customer.CustomerAccountService;
import com.chotomua.backend.modules.crm.port.dto.AddressView;
import com.chotomua.backend.modules.crm.port.dto.CustomerFilter;
import com.chotomua.backend.modules.crm.port.dto.CustomerView;
import com.chotomua.backend.modules.crm.web.CurrentActor;
import com.chotomua.backend.modules.crm.web.ResourceLocation;
import com.chotomua.backend.modules.crm.web.dto.CreateCustomerRequest;
import com.chotomua.backend.modules.crm.web.dto.CustomerDetailResponse;
import com.chotomua.backend.modules.crm.web.dto.CustomerListResponse;
import com.chotomua.backend.modules.crm.web.dto.PatchCustomerRequest;
import com.chotomua.backend.modules.crm.web.dto.UpsertAddressRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * REST vòng đời khách. Nghiệp vụ ở service — controller chỉ dịch HTTP.
 * Câu chuyện 1–3: quản trị và quản lý CRM. Khôi phục khách đã xóa: chỉ quản trị viên.
 */
@RestController
@RequestMapping("/api/customers")
public class CrmCustomerController {

    private final CustomerAccountService customers;
    private final CurrentActor currentActor;

    public CrmCustomerController(CustomerAccountService customers, CurrentActor currentActor) {
        this.customers = customers;
        this.currentActor = currentActor;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('DEPT_ADMIN', 'DEPT_CS')")
    public CustomerListResponse list(
            @RequestParam(defaultValue = "false") boolean includeDeleted,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        return customers.list(
                currentActor.requireUserId(),
                new CustomerFilter(status, search),
                includeDeleted,
                page,
                pageSize);
    }

    @PostMapping
    @PreAuthorize("hasAnyAuthority('DEPT_ADMIN', 'DEPT_CS')")
    public ResponseEntity<CustomerView> create(@Valid @RequestBody CreateCustomerRequest request) {
        CustomerView created = customers.create(currentActor.requireUserId(), request.toCommand());
        return ResponseEntity
                .created(ResourceLocation.of("/api/customers/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('DEPT_ADMIN', 'DEPT_CS')")
    public CustomerView update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCustomerRequest request
    ) {
        return customers.update(currentActor.requireUserId(), id, request.toCommand());
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('DEPT_ADMIN', 'DEPT_CS')")
    public CustomerView patch(
            @PathVariable UUID id,
            @Valid @RequestBody PatchCustomerRequest request
    ) {
        return customers.applyStatus(currentActor.requireUserId(), id, request.status());
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('DEPT_ADMIN')")
    public CustomerView restore(@PathVariable UUID id) {
        return customers.restore(currentActor.requireUserId(), id);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('DEPT_ADMIN', 'DEPT_CS')")
    public CustomerDetailResponse detail(@PathVariable UUID id) {
        return customers.detail(currentActor.requireUserId(), id);
    }

    @PostMapping("/{id}/addresses")
    @PreAuthorize("hasAnyAuthority('DEPT_ADMIN', 'DEPT_CS')")
    public ResponseEntity<AddressView> createAddress(
            @PathVariable UUID id,
            @Valid @RequestBody UpsertAddressRequest request
    ) {
        AddressView created = customers.createAddress(
                currentActor.requireUserId(),
                id,
                request.toCommand());
        return ResponseEntity
                .created(ResourceLocation.of("/api/customers/" + id + "/addresses/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}/addresses/{addressId}")
    @PreAuthorize("hasAnyAuthority('DEPT_ADMIN', 'DEPT_CS')")
    public AddressView updateAddress(
            @PathVariable UUID id,
            @PathVariable UUID addressId,
            @Valid @RequestBody UpsertAddressRequest request
    ) {
        return customers.updateAddress(
                currentActor.requireUserId(),
                id,
                addressId,
                request.toCommand());
    }
}
