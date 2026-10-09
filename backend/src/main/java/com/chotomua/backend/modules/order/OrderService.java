package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.identity.Address;
import com.chotomua.backend.modules.identity.AddressRepository;
import com.chotomua.backend.modules.identity.Employee;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import com.chotomua.backend.modules.order.dto.OrderCreateRequest;
import com.chotomua.backend.modules.order.dto.OrderDetailResponse;
import com.chotomua.backend.modules.order.dto.OrderResponse;
import com.chotomua.backend.modules.order.dto.OrderShippingInfoRequest;
import com.chotomua.backend.modules.order.dto.OrderShippingResponse;
import com.chotomua.backend.modules.order.dto.OrderStatusUpdateRequest;
import com.chotomua.backend.modules.order.dto.OrderStatusUpdateResponse;
import com.chotomua.backend.modules.order.dto.OrderSummaryResponse;
import com.chotomua.backend.modules.order.dto.OrderTrackingUpdateRequest;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private static final BigDecimal NO_DISCOUNT = BigDecimal.ZERO;
    private static final BigDecimal FREE_SHIPPING = BigDecimal.ZERO;

    private final CartItemRepository cartItemRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final AddressRepository addressRepository;
    private final EmployeeRepository employeeRepository;
    private final ProductVariantLookup productVariantLookup;
    private final WarehouseLookup warehouseLookup;

    public OrderService(
            CartItemRepository cartItemRepository,
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            OrderStatusHistoryRepository orderStatusHistoryRepository,
            AddressRepository addressRepository,
            EmployeeRepository employeeRepository,
            ProductVariantLookup productVariantLookup,
            WarehouseLookup warehouseLookup
    ) {
        this.cartItemRepository = cartItemRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.addressRepository = addressRepository;
        this.employeeRepository = employeeRepository;
        this.productVariantLookup = productVariantLookup;
        this.warehouseLookup = warehouseLookup;
    }

    /**
     * Creates one order from all selected cart rows. Prices and product data are always loaded
     * server-side. Payment/promotion logic belongs to P4 and can replace the zero discount later.
     */
    @Transactional
    public OrderResponse createFromSelectedCart(UUID userId, OrderCreateRequest request) {
        Address address = requireOwnedAddress(userId, request.addressId());
        List<CartItem> selectedItems = cartItemRepository
                .findByUserIdAndIsSelectedTrueOrderByUpdatedAtAsc(userId);
        if (selectedItems.isEmpty()) {
            throw new IllegalArgumentException("Giỏ hàng chưa có sản phẩm nào được chọn");
        }

        List<CheckoutLine> lines = selectedItems.stream()
                .map(this::toCheckoutLine)
                .toList();
        BigDecimal subtotal = lines.stream()
                .map(CheckoutLine::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal total = subtotal.subtract(NO_DISCOUNT).add(FREE_SHIPPING);

        Order order = orderRepository.save(new Order(
                userId,
                address.getId(),
                address.getFullAddress(),
                subtotal,
                NO_DISCOUNT,
                FREE_SHIPPING,
                total
        ));

        List<OrderItem> orderItems = new ArrayList<>(lines.size());
        for (CheckoutLine line : lines) {
            ProductVariantSnapshot variant = line.variant();
            orderItems.add(new OrderItem(
                    order.getId(),
                    variant.variantId(),
                    line.quantity(),
                    variant.unitPrice(),
                    variant.productName(),
                    variant.attributesJson()
            ));
        }
        List<OrderItem> savedItems = orderItemRepository.saveAll(orderItems);

        orderStatusHistoryRepository.save(new OrderStatusHistory(
                order.getId(),
                OrderStatus.PENDING.value(),
                userId,
                "buyer",
                "Tạo đơn hàng"
        ));
        cartItemRepository.deleteAll(selectedItems);

        return OrderResponse.from(order, savedItems);
    }

    @Transactional
    public OrderStatusUpdateResponse updateStatusForBuyer(
            UUID userId,
            UUID orderId,
            OrderStatusUpdateRequest request
    ) {
        String requestedStatus = OrderStatus.normalize(request.status());
        if (!OrderStatus.CANCEL_REQUESTED.value().equals(requestedStatus)) {
            throw new AccessDeniedException("Buyer chỉ được phép hủy đơn hàng");
        }
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(this::orderNotFound);
        return applyStatusChange(order, requestedStatus, userId, "buyer", request.reason());
    }

    @Transactional
    public OrderStatusUpdateResponse updateStatusForEmployeeUser(
            UUID employeeUserId,
            UUID orderId,
            OrderStatusUpdateRequest request
    ) {
        Employee employee = requireEmployee(employeeUserId);
        if (!employee.getDepartment().equals("sales") && !employee.getDepartment().equals("admin")) {
            throw new AccessDeniedException("Bộ phận hiện tại không có quyền xác nhận hoặc hủy đơn hàng");
        }
        String requestedStatus = OrderStatus.normalize(request.status());
        if (!OrderStatus.CONFIRMED.value().equals(requestedStatus)
                && !OrderStatus.CANCELLED.value().equals(requestedStatus)) {
            throw new IllegalArgumentException("API này chỉ hỗ trợ xác nhận hoặc hủy đơn hàng");
        }
        Order order = orderRepository.findById(orderId)
                .orElseThrow(this::orderNotFound);
        return applyStatusChange(order, requestedStatus, employeeUserId, "employee", request.reason());
    }

    @Transactional
    public OrderShippingResponse updateShippingInfo(
            UUID employeeUserId,
            UUID orderId,
            OrderShippingInfoRequest request
    ) {
        Employee employee = requireShippingEmployee(employeeUserId);
        Order order = orderRepository.findById(orderId).orElseThrow(this::orderNotFound);
        requireShippingOwnership(order, employee);
        if (!OrderStatus.CONFIRMED.value().equals(order.getStatus())) {
            throw new IllegalStateException("Chỉ đơn đã xác nhận mới được đóng gói");
        }
        if (!ShipmentStatus.PENDING.value().equals(order.getShipmentStatus())
                && !ShipmentStatus.PACKED.value().equals(order.getShipmentStatus())) {
            throw new IllegalStateException("Không thể thay đổi thông tin đóng gói ở trạng thái hiện tại");
        }
        if (!warehouseLookup.existsById(request.warehouseId())) {
            throw new NoSuchElementException("Không tìm thấy kho xuất hàng");
        }

        order.setEmployeeId(employee.getId());
        order.setWarehouseId(request.warehouseId());
        order.setShippingProviderName(request.shippingProviderName().trim());
        order.setShipmentStatus(ShipmentStatus.PACKED.value());
        return OrderShippingResponse.from(orderRepository.save(order));
    }

    @Transactional
    public OrderShippingResponse updateTracking(
            UUID employeeUserId,
            UUID orderId,
            OrderTrackingUpdateRequest request
    ) {
        Employee employee = requireShippingEmployee(employeeUserId);
        Order order = orderRepository.findById(orderId).orElseThrow(this::orderNotFound);
        requireShippingOwnership(order, employee);
        requireShippingInfo(order);

        String requestedShipmentStatus = ShipmentStatus.normalize(request.shipmentStatus());
        validateShipmentTransition(order.getStatus(), order.getShipmentStatus(), requestedShipmentStatus);
        order.setTrackingNo(request.trackingNo().trim());
        order.setShipmentStatus(requestedShipmentStatus);

        String nextOrderStatus = switch (requestedShipmentStatus) {
            case "shipping" -> OrderStatus.SHIPPING.value();
            case "delivered" -> OrderStatus.DELIVERED.value();
            default -> throw new IllegalArgumentException(
                    "API tracking chỉ hỗ trợ trạng thái shipping hoặc delivered"
            );
        };
        order.setStatus(nextOrderStatus);
        Order saved = orderRepository.save(order);
        orderStatusHistoryRepository.save(new OrderStatusHistory(
                order.getId(),
                nextOrderStatus,
                employeeUserId,
                "employee",
                "Cập nhật trạng thái giao hàng"
        ));
        return OrderShippingResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<OrderSummaryResponse> listForBuyer(UUID userId, String requestedStatus) {
        String status = OrderStatus.normalize(requestedStatus);
        List<Order> orders = status == null
                ? orderRepository.findByUserIdOrderByCreatedAtDesc(userId)
                : orderRepository.findByUserIdAndStatusOrderByCreatedAtDesc(userId, status);
        return toSummaries(orders);
    }

    @Transactional(readOnly = true)
    public OrderDetailResponse getForBuyer(UUID userId, UUID orderId) {
        Order order = orderRepository.findByIdAndUserId(orderId, userId)
                .orElseThrow(this::orderNotFound);
        return toDetail(order);
    }

    @Transactional(readOnly = true)
    public List<OrderSummaryResponse> listForEmployeeUser(UUID employeeUserId, String requestedStatus) {
        UUID employeeId = requireEmployee(employeeUserId).getId();
        String status = OrderStatus.normalize(requestedStatus);
        List<Order> orders = status == null
                ? orderRepository.findByEmployeeIdOrderByCreatedAtDesc(employeeId)
                : orderRepository.findByEmployeeIdAndStatusOrderByCreatedAtDesc(employeeId, status);
        return toSummaries(orders);
    }

    @Transactional(readOnly = true)
    public OrderDetailResponse getForEmployeeUser(UUID employeeUserId, UUID orderId) {
        UUID employeeId = requireEmployee(employeeUserId).getId();
        Order order = orderRepository.findByIdAndEmployeeId(orderId, employeeId)
                .orElseThrow(this::orderNotFound);
        return toDetail(order);
    }

    private List<OrderSummaryResponse> toSummaries(List<Order> orders) {
        return orders.stream()
                .map(order -> OrderSummaryResponse.from(
                        order,
                        orderItemRepository.countByOrderId(order.getId())
                ))
                .toList();
    }

    private OrderDetailResponse toDetail(Order order) {
        return OrderDetailResponse.from(
                order,
                orderItemRepository.findByOrderId(order.getId()),
                orderStatusHistoryRepository.findByOrderIdOrderByChangedAtAsc(order.getId())
        );
    }

    private Employee requireEmployee(UUID employeeUserId) {
        return employeeRepository.findByUserId(employeeUserId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hồ sơ nhân viên"));
    }

    private Employee requireShippingEmployee(UUID employeeUserId) {
        Employee employee = requireEmployee(employeeUserId);
        if (!employee.getDepartment().equals("warehouse") && !employee.getDepartment().equals("admin")) {
            throw new AccessDeniedException("Bộ phận hiện tại không có quyền cập nhật giao hàng");
        }
        return employee;
    }

    private void requireShippingOwnership(Order order, Employee employee) {
        boolean admin = employee.getDepartment().equals("admin");
        if (!admin && order.getEmployeeId() != null && !order.getEmployeeId().equals(employee.getId())) {
            throw new AccessDeniedException("Đơn hàng đang được nhân viên khác xử lý");
        }
    }

    private void requireShippingInfo(Order order) {
        if (order.getEmployeeId() == null
                || order.getWarehouseId() == null
                || order.getShippingProviderName() == null
                || order.getShippingProviderName().isBlank()) {
            throw new IllegalStateException("Đơn hàng chưa có đủ thông tin đóng gói và vận chuyển");
        }
    }

    private void validateShipmentTransition(
            String currentOrderStatus,
            String currentShipmentStatus,
            String requestedShipmentStatus
    ) {
        boolean allowed = OrderStatus.CONFIRMED.value().equals(currentOrderStatus)
                && ShipmentStatus.PACKED.value().equals(currentShipmentStatus)
                && ShipmentStatus.SHIPPING.value().equals(requestedShipmentStatus);
        allowed = allowed || OrderStatus.SHIPPING.value().equals(currentOrderStatus)
                && ShipmentStatus.SHIPPING.value().equals(currentShipmentStatus)
                && ShipmentStatus.DELIVERED.value().equals(requestedShipmentStatus);
        if (!allowed) {
            throw new IllegalStateException(
                    "Không thể chuyển đơn " + currentOrderStatus + "/" + currentShipmentStatus
                            + " sang trạng thái giao hàng " + requestedShipmentStatus
            );
        }
    }

    private NoSuchElementException orderNotFound() {
        return new NoSuchElementException("Không tìm thấy đơn hàng");
    }

    private OrderStatusUpdateResponse applyStatusChange(
            Order order,
            String requestedStatus,
            UUID changedBy,
            String changedByType,
            String rawReason
    ) {
        String previousStatus = order.getStatus();
        validateStatusTransition(previousStatus, requestedStatus);
        String reason = normalizeReason(rawReason);
        if ((OrderStatus.CANCEL_REQUESTED.value().equals(requestedStatus)
                || OrderStatus.CANCELLED.value().equals(requestedStatus)) && reason == null) {
            throw new IllegalArgumentException("Phải nhập lý do khi hủy đơn hàng");
        }

        order.setStatus(requestedStatus);
        orderRepository.save(order);
        OrderStatusHistory history = orderStatusHistoryRepository.save(new OrderStatusHistory(
                order.getId(),
                requestedStatus,
                changedBy,
                changedByType,
                reason
        ));
        return OrderStatusUpdateResponse.from(order.getId(), previousStatus, requestedStatus, history);
    }

    private void validateStatusTransition(String currentStatus, String requestedStatus) {
        boolean allowed = OrderStatus.PENDING.value().equals(currentStatus)
                && (OrderStatus.CONFIRMED.value().equals(requestedStatus)
                || OrderStatus.CANCEL_REQUESTED.value().equals(requestedStatus)
                || OrderStatus.CANCELLED.value().equals(requestedStatus));
        allowed = allowed || OrderStatus.CONFIRMED.value().equals(currentStatus)
                && (OrderStatus.CANCEL_REQUESTED.value().equals(requestedStatus)
                || OrderStatus.CANCELLED.value().equals(requestedStatus));
        allowed = allowed || OrderStatus.CANCEL_REQUESTED.value().equals(currentStatus)
                && OrderStatus.CANCELLED.value().equals(requestedStatus);
        if (!allowed) {
            throw new IllegalStateException(
                    "Không thể chuyển trạng thái đơn hàng từ " + currentStatus + " sang " + requestedStatus
            );
        }
    }

    private String normalizeReason(String rawReason) {
        if (rawReason == null || rawReason.isBlank()) {
            return null;
        }
        return rawReason.trim();
    }

    private Address requireOwnedAddress(UUID userId, UUID addressId) {
        Address address = addressRepository.findById(addressId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy địa chỉ giao hàng"));
        if (!address.getUser().getId().equals(userId)) {
            // Do not disclose whether another user's address exists.
            throw new NoSuchElementException("Không tìm thấy địa chỉ giao hàng");
        }
        return address;
    }

    private CheckoutLine toCheckoutLine(CartItem item) {
        ProductVariantSnapshot variant = productVariantLookup.findActiveById(item.getVariantId())
                .orElseThrow(() -> new NoSuchElementException(
                        "Không tìm thấy biến thể sản phẩm đang hoạt động: " + item.getVariantId()
                ));
        BigDecimal lineTotal = variant.unitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
        return new CheckoutLine(variant, item.getQuantity(), lineTotal);
    }

    private record CheckoutLine(
            ProductVariantSnapshot variant,
            int quantity,
            BigDecimal lineTotal
    ) {
    }
}
