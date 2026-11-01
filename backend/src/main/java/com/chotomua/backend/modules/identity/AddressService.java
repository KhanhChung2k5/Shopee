package com.chotomua.backend.modules.identity;

import org.springframework.dao.DataIntegrityViolationException;
import com.chotomua.backend.modules.identity.dto.AddressRequest;
import com.chotomua.backend.modules.identity.dto.AddressResponse;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// AddressService is a service for managing addresses for a user
@Service
public class AddressService {

    // Repository for Address
    private final AddressRepository addressRepository;
    // Repository for User
    private final UserRepository userRepository;

    // Constructor for AddressService
    public AddressService(AddressRepository addressRepository, UserRepository userRepository) {
        this.addressRepository = addressRepository;
        this.userRepository = userRepository;
    }

    // List all addresses for a user
    @Transactional(readOnly = true)
    public List<AddressResponse> listForUser(UUID userId) {
        // Find all addresses for the user
        // Map the addresses to AddressResponse
        // Return the list of AddressResponse
        return addressRepository.findByUserId(userId).stream()
                .map(AddressResponse::from)
                .toList();
    }

    // Create a new address for a user
    @Transactional
    public AddressResponse create(UUID userId, AddressRequest request) {
        // Find the user
        // If the user is not found, throw an exception
        // If the user is found, create a new address
        // Clear existing default address if requested
        // Set the default address if requested
        // Save the address
        // Return the AddressResponse
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy user"));

        // Clear existing default address if requested
        if (request.isDefault()) {
            clearExistingDefault(userId);
        }

        // Create a new address
        Address address = new Address(user, request.recipientName(), request.phone(), request.fullAddress());
        // Set the default address if requested
        address.setDefault(request.isDefault());
        return AddressResponse.from(addressRepository.save(address));
    }

    // Update an existing address for a user
    @Transactional
    public AddressResponse update(UUID userId, UUID addressId, AddressRequest request) {
        // Find the address
        // If the address is not found, throw an exception
        // If the address is found, update the address
        // Clear existing default address if requested
        // Set the default address if requested
        // Save the address
        // Return the AddressResponse
        Address address = requireOwnedByUser(userId, addressId);

        if (request.isDefault() && !address.isDefault()) {
            clearExistingDefault(userId);
        }

        address.setRecipientName(request.recipientName());
        address.setPhone(request.phone());
        address.setFullAddress(request.fullAddress());
        address.setDefault(request.isDefault());
        return AddressResponse.from(address);
    }

    // Delete an existing address for a user
    @Transactional
    public void delete(UUID userId, UUID addressId) {
        Address address = requireOwnedByUser(userId, addressId);
        try {
            addressRepository.delete(address);
            addressRepository.flush();
        } catch (DataIntegrityViolationException usedByAnOrder) {
            throw new IllegalStateException("Địa chỉ này đã được dùng cho đơn hàng nên không xoá được. "
                    + "Bạn có thể sửa nội dung địa chỉ hoặc chọn địa chỉ khác làm mặc định.");
        }
    }

    // Require an address to be owned by a user
    private Address requireOwnedByUser(UUID userId, UUID addressId) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy địa chỉ"));
        if (!address.getUser().getId().equals(userId)) {
            throw new NoSuchElementException("Không tìm thấy địa chỉ");
        }
        return address;
    }

    // Clear existing default address for a user
    private void clearExistingDefault(UUID userId) {
        addressRepository.findByUserId(userId).stream()
                .filter(Address::isDefault)
                .forEach(a -> a.setDefault(false));
    }
}
