package com.chotomua.backend.modules.identity;

import com.chotomua.backend.modules.identity.dto.AddressRequest;
import com.chotomua.backend.modules.identity.dto.AddressResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** All endpoints act only on the caller's own addresses — userId comes from the JWT, never the URL. */
@RestController
@RequestMapping("/addresses")
public class AddressController {

    private final AddressService addressService;

    public AddressController(AddressService addressService) {
        this.addressService = addressService;
    }

    @GetMapping
    public List<AddressResponse> list(Authentication authentication) {
        return addressService.listForUser(currentUserId(authentication));
    }

    @PostMapping
    public ResponseEntity<AddressResponse> create(Authentication authentication, @Valid @RequestBody AddressRequest request) {
        AddressResponse created = addressService.create(currentUserId(authentication), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public AddressResponse update(Authentication authentication, @PathVariable UUID id, @Valid @RequestBody AddressRequest request) {
        return addressService.update(currentUserId(authentication), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable UUID id) {
        addressService.delete(currentUserId(authentication), id);
        return ResponseEntity.noContent().build();
    }

    private UUID currentUserId(Authentication authentication) {
        return UUID.fromString((String) authentication.getPrincipal());
    }
}
