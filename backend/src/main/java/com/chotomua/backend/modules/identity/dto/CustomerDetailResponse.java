package com.chotomua.backend.modules.identity.dto;

import com.chotomua.backend.modules.identity.Address;
import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.order.dto.OrderSummaryResponse;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * One customer for the staff "Khách hàng" page: the account, membership and CRM figures, addresses and every order.
 * {@code deliveredSpend} is what the customer really paid: delivered orders, less what was refunded on them.
 */
public record CustomerDetailResponse(
        CustomerResponse customer,
        String loyaltyTier,
        Integer loyaltyBalance,
        String rfmSegment,
        LocalDate lastPurchaseAt,
        OffsetDateTime createdAt,
        OffsetDateTime lastLoginAt,
        BigDecimal deliveredSpend,
        List<AddressView> addresses,
        List<OrderSummaryResponse> orders
) {
    public record AddressView(UUID id, String recipientName, String phone, String fullAddress, boolean isDefault) {
        static AddressView from(Address address) {
            return new AddressView(address.getId(), address.getRecipientName(), address.getPhone(), address.getFullAddress(),
                    address.isDefault());
        }
    }

    public static CustomerDetailResponse of(User user, List<Address> addresses, List<OrderSummaryResponse> orders) {
        BigDecimal spend = orders.stream().filter(o -> "delivered".equals(o.status()))
                .map(o -> o.totalAmount().subtract(o.refundedAmount() == null ? BigDecimal.ZERO : o.refundedAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new CustomerDetailResponse(CustomerResponse.from(user), user.getLoyaltyTier(), user.getLoyaltyBalance(),
                user.getRfmSegment(), user.getLastPurchaseAt(), user.getCreatedAt(), user.getLastLoginAt(), spend,
                addresses.stream().map(AddressView::from).toList(), orders);
    }
}
