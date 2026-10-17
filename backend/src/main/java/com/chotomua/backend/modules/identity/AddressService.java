package com.chotomua.backend.modules.identity;

import com.chotomua.backend.modules.identity.dto.AddressRequest;
import com.chotomua.backend.modules.identity.dto.AddressResponse;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    public AddressService(AddressRepository addressRepository, UserRepository userRepository) {
        this.addressRepository = addressRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public List<AddressResponse> listForUser(UUID userId) {
        return addressRepository.findByUserId(userId).stream()
                .map(AddressResponse::from)
                .toList();
    }

    @Transactional
    public AddressResponse create(UUID userId, AddressRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy user"));

        if (request.isDefault()) {
            clearExistingDefault(userId);
        }

        Address address = new Address(user, request.recipientName(), request.phone(), request.fullAddress());
        address.setDefault(request.isDefault());
        return AddressResponse.from(addressRepository.save(address));
    }

    @Transactional
    public AddressResponse update(UUID userId, UUID addressId, AddressRequest request) {
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

    @Transactional
    public void delete(UUID userId, UUID addressId) {
        Address address = requireOwnedByUser(userId, addressId);
        addressRepository.delete(address);
    }

    private Address requireOwnedByUser(UUID userId, UUID addressId) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy địa chỉ"));
        if (!address.getUser().getId().equals(userId)) {
            throw new NoSuchElementException("Không tìm thấy địa chỉ");
        }
        return address;
    }

    private void clearExistingDefault(UUID userId) {
        addressRepository.findByUserId(userId).stream()
                .filter(Address::isDefault)
                .forEach(a -> a.setDefault(false));
    }
}
