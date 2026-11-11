package com.chototmua.crm.web.customer;

import com.chototmua.crm.application.customer.CustomerAccountService;
import com.chototmua.crm.port.dto.AddressView;
import com.chototmua.crm.port.dto.CustomerFilter;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.web.CurrentActor;
import com.chototmua.crm.web.ResourceLocation;
import com.chototmua.crm.web.dto.CreateCustomerRequest;
import com.chototmua.crm.web.dto.CustomerDetailResponse;
import com.chototmua.crm.web.dto.CustomerListResponse;
import com.chototmua.crm.web.dto.PatchCustomerRequest;
import com.chototmua.crm.web.dto.UpsertAddressRequest;
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
public class CustomerController {

    private final CustomerAccountService customers;
    private final CurrentActor currentActor;

    public CustomerController(CustomerAccountService customers, CurrentActor currentActor) {
        this.customers = customers;
        this.currentActor = currentActor;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('admin', 'crm', 'cs')")
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
    @PreAuthorize("hasAnyAuthority('admin', 'crm')")
    public ResponseEntity<CustomerView> create(@Valid @RequestBody CreateCustomerRequest request) {
        CustomerView created = customers.create(currentActor.requireUserId(), request.toCommand());
        return ResponseEntity
                .created(ResourceLocation.of("/api/customers/" + created.id()))
                .body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('admin', 'crm')")
    public CustomerView update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateCustomerRequest request
    ) {
        return customers.update(currentActor.requireUserId(), id, request.toCommand());
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('admin', 'crm')")
    public CustomerView patch(
            @PathVariable UUID id,
            @Valid @RequestBody PatchCustomerRequest request
    ) {
        return customers.applyStatus(currentActor.requireUserId(), id, request.status());
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAuthority('admin')")
    public CustomerView restore(@PathVariable UUID id) {
        return customers.restore(currentActor.requireUserId(), id);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('admin', 'crm', 'cs')")
    public CustomerDetailResponse detail(@PathVariable UUID id) {
        return customers.detail(currentActor.requireUserId(), id);
    }

    @PostMapping("/{id}/addresses")
    @PreAuthorize("hasAnyAuthority('admin', 'crm')")
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
    @PreAuthorize("hasAnyAuthority('admin', 'crm')")
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
