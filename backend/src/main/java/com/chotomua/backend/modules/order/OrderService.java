package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.identity.Address;
import com.chotomua.backend.modules.identity.AddressRepository;
import com.chotomua.backend.modules.identity.Employee;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import com.chotomua.backend.modules.marketing.VoucherQuoteService;
import com.chotomua.backend.modules.crm.application.CrmOrderEvents;
import com.chotomua.backend.modules.catalog.InventoryStockService;
import com.chotomua.backend.modules.marketing.LoyaltyAwardService;
import com.chotomua.backend.modules.marketing.FlashSaleCheckoutService;
import com.chotomua.backend.modules.marketing.InvoicePromotionService;
import com.chotomua.backend.modules.marketing.PromotionInvoiceApplication;
import com.chotomua.backend.modules.marketing.PromotionInvoiceApplicationRepository;
import com.chotomua.backend.modules.marketing.PromotionProductApplication;
import com.chotomua.backend.modules.marketing.PromotionProductApplicationRepository;
import com.chotomua.backend.modules.marketing.VoucherUsage;
import com.chotomua.backend.modules.marketing.VoucherUsageRepository;
import com.chotomua.backend.modules.marketing.dto.VoucherQuoteRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherQuoteResponse;
import com.chotomua.backend.modules.order.dto.OrderCreateRequest;
import com.chotomua.backend.modules.order.dto.OrderCustomerResponse;
import com.chotomua.backend.modules.order.dto.OrderItemResponse;
import com.chotomua.backend.modules.order.dto.OrderPaymentResponse;
import com.chotomua.backend.modules.order.dto.RefundResponse;
import com.chotomua.backend.modules.order.dto.OrderPreviewResponse;
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
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {

    private static final BigDecimal FREE_SHIPPING = BigDecimal.ZERO;

    private final CartItemRepository cartItemRepository;
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository orderStatusHistoryRepository;
    private final AddressRepository addressRepository;
    private final EmployeeRepository employeeRepository;
    private final ProductVariantLookup productVariantLookup;
    private final WarehouseLookup warehouseLookup;
    private final VoucherQuoteService voucherQuoteService;
    private final VoucherUsageRepository voucherUsageRepository;
    private final CheckoutPaymentService checkoutPaymentService;
    private final LoyaltyAwardService loyaltyAwardService;
    private final FlashSaleCheckoutService flashSaleCheckoutService;
    /** Optional so the focused unit-test constructors below keep working without CRM. */
    private CrmOrderEvents crmOrderEvents;

    @Autowired(required = false)
    void setCrmOrderEvents(CrmOrderEvents crmOrderEvents) {
        this.crmOrderEvents = crmOrderEvents;
    }

    /** Optional for the same reason: stock leaves the warehouse when an order is packed, and comes back if it is cancelled. */
    private InventoryStockService inventoryStockService;

    @Autowired(required = false)
    void setInventoryStockService(InventoryStockService inventoryStockService) {
        this.inventoryStockService = inventoryStockService;
    }

    /** Invoice-level promotions and the records of which promotions priced an order. */
    private InvoicePromotionService invoicePromotionService;
    private PromotionProductApplicationRepository productApplications;
    private PromotionInvoiceApplicationRepository invoiceApplications;

    @Autowired(required = false)
    void setPromotionRecords(InvoicePromotionService invoicePromotionService,
                             PromotionProductApplicationRepository productApplications,
                             PromotionInvoiceApplicationRepository invoiceApplications) {
        this.invoicePromotionService = invoicePromotionService;
        this.productApplications = productApplications;
        this.invoiceApplications = invoiceApplications;
    }

    /** Optional: refunds owed when an already-paid order is cancelled, and the refunds shown on an order. */
    private RefundService refundService;

    @Autowired(required = false)
    void setRefundService(RefundService refundService) {
        this.refundService = refundService;
    }

    @Autowired
    public OrderService(
            CartItemRepository cartItemRepository,
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            OrderStatusHistoryRepository orderStatusHistoryRepository,
            AddressRepository addressRepository,
            EmployeeRepository employeeRepository,
            ProductVariantLookup productVariantLookup,
            WarehouseLookup warehouseLookup,
            VoucherQuoteService voucherQuoteService,
            VoucherUsageRepository voucherUsageRepository,
            CheckoutPaymentService checkoutPaymentService, LoyaltyAwardService loyaltyAwardService, FlashSaleCheckoutService flashSaleCheckoutService
    ) {
        this.cartItemRepository = cartItemRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.orderStatusHistoryRepository = orderStatusHistoryRepository;
        this.addressRepository = addressRepository;
        this.employeeRepository = employeeRepository;
        this.productVariantLookup = productVariantLookup;
        this.warehouseLookup = warehouseLookup;
        this.voucherQuoteService = voucherQuoteService;
        this.voucherUsageRepository = voucherUsageRepository;
        this.checkoutPaymentService = checkoutPaymentService;
        this.loyaltyAwardService = loyaltyAwardService;
        this.flashSaleCheckoutService = flashSaleCheckoutService;
    }

    /** Compatibility constructor for focused unit tests that do not exercise payment persistence. */
    public OrderService(CartItemRepository cartItemRepository, OrderRepository orderRepository,
            OrderItemRepository orderItemRepository, OrderStatusHistoryRepository orderStatusHistoryRepository,
            AddressRepository addressRepository, EmployeeRepository employeeRepository,
            ProductVariantLookup productVariantLookup, WarehouseLookup warehouseLookup,
            VoucherQuoteService voucherQuoteService, VoucherUsageRepository voucherUsageRepository) {
        this(cartItemRepository, orderRepository, orderItemRepository, orderStatusHistoryRepository, addressRepository,
                employeeRepository, productVariantLookup, warehouseLookup, voucherQuoteService, voucherUsageRepository, null, null, null);
    }

    /**
     * Creates one order from all selected cart rows. Prices and product data are always loaded
     * server-side. A voucher is quoted again against this trusted subtotal before the order is saved.
     */
    /**
     * What the selected cart costs right now, priced exactly as {@link #createFromSelectedCart} would —
     * but without reserving flash-sale units or saving anything. Feeds the checkout summary.
     */
    @Transactional(readOnly = true)
    public OrderPreviewResponse previewSelectedCart(UUID userId, String voucherCode) {
        CartPricing pricing = priceSelectedCart(userId, voucherCode, false);
        List<OrderPreviewResponse.Line> lines = new ArrayList<>();
        for (int i = 0; i < pricing.lines().size(); i++) {
            CheckoutLine line = pricing.lines().get(i);
            ProductVariantSnapshot v = line.variant();
            ProductVariantSnapshot.Promotion promo = v.promotion();
            lines.add(new OrderPreviewResponse.Line(pricing.items().get(i).getId(), v.variantId(), v.productName(),
                    line.quantity(), promo == null ? v.unitPrice() : promo.listPrice(), v.unitPrice(), line.lineTotal(),
                    promo == null ? null : promo.flash() ? "flash" : "percent", promo == null ? null : promo.programName()));
        }
        return new OrderPreviewResponse(lines, pricing.subtotal(), pricing.invoiceAmount(),
                pricing.invoice() == null ? null : pricing.invoice().programName(),
                pricing.voucher() == null ? (voucherCode == null || voucherCode.isBlank() ? null : voucherCode.trim()) : pricing.voucher().code(),
                pricing.voucher() == null ? BigDecimal.ZERO : pricing.voucher().discountAmount(),
                pricing.voucherError(), FREE_SHIPPING, pricing.total());
    }

    /**
     * Creates one order from all selected cart rows. Prices and product data are always loaded server-side and
     * layered: SKU promotion per line, then the best invoice promotion, then the voucher on what is left.
     */
    @Transactional
    public OrderResponse createFromSelectedCart(UUID userId, OrderCreateRequest request) {
        Address address = requireOwnedAddress(userId, request.addressId());
        CartPricing pricing = priceSelectedCart(userId, request.voucherCode(), true);
        List<CartItem> selectedItems = pricing.items();
        List<CheckoutLine> lines = pricing.lines();
        BigDecimal subtotal = pricing.subtotal();
        VoucherQuoteResponse voucherQuote = pricing.voucher();
        BigDecimal discount = pricing.invoiceAmount().add(voucherQuote == null ? BigDecimal.ZERO : voucherQuote.discountAmount());
        BigDecimal total = pricing.total();

        Order order = orderRepository.save(new Order(
                userId,
                address.getId(),
                address.getFullAddress(),
                subtotal,
                discount,
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
        recordPromotions(order, lines, savedItems, pricing.invoice());

        orderStatusHistoryRepository.save(new OrderStatusHistory(
                order.getId(),
                OrderStatus.PENDING.value(),
                userId,
                "buyer",
                "Tạo đơn hàng"
        ));
        if (voucherQuote != null) {
            voucherUsageRepository.save(new VoucherUsage(voucherQuote.voucherId(), userId, order.getId()));
        }
        if (checkoutPaymentService != null) {
            checkoutPaymentService.record(order.getId(), request.paymentMethod(), total);
        }
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

        if (inventoryStockService != null) {
            // Re-packing from another warehouse first returns what the earlier packing took out.
            if (ShipmentStatus.PACKED.value().equals(order.getShipmentStatus())) {
                inventoryStockService.returnForOrder(order.getId());
            }
            List<InventoryStockService.ExportLine> lines = orderItemRepository.findByOrderId(order.getId()).stream()
                    .map(item -> new InventoryStockService.ExportLine(item.getVariantId(), item.getQuantity()))
                    .toList();
            try {
                inventoryStockService.exportForOrder(order.getId(), request.warehouseId(), lines);
            } catch (IllegalArgumentException notEnough) {
                throw new IllegalStateException("Kho đã chọn không đủ hàng để đóng gói đơn này");
            }
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
        if ("delivered".equals(nextOrderStatus) && checkoutPaymentService != null) checkoutPaymentService.settleOnDelivery(saved.getId());
        if ("delivered".equals(nextOrderStatus) && loyaltyAwardService != null) loyaltyAwardService.award(saved);
        if ("delivered".equals(nextOrderStatus) && crmOrderEvents != null) crmOrderEvents.onOrderDelivered(saved.getUserId(), saved.getId());
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
    /**
     * Staff order board: sales, warehouse and admin see every order (sales must see new ones to confirm
     * them; an order only gets an employee once it is packed), each with who placed it.
     */
    public List<OrderSummaryResponse> listForEmployeeUser(UUID employeeUserId, String requestedStatus) {
        requireOrderViewEmployee(employeeUserId);
        String status = OrderStatus.normalize(requestedStatus);
        List<Order> orders = status == null
                ? orderRepository.findAllByOrderByCreatedAtDesc()
                : orderRepository.findByStatusOrderByCreatedAtDesc(status);
        Map<UUID, OrderCustomerResponse> customers = customersByAddress(orders);
        return orders.stream()
                .map(order -> OrderSummaryResponse.from(order, orderItemRepository.countByOrderId(order.getId()),
                        customers.get(order.getAddressId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public OrderDetailResponse getForEmployeeUser(UUID employeeUserId, UUID orderId) {
        requireOrderViewEmployee(employeeUserId);
        Order order = orderRepository.findById(orderId).orElseThrow(this::orderNotFound);
        return OrderDetailResponse.from(order, itemsWithImages(order),
                orderStatusHistoryRepository.findByOrderIdOrderByChangedAtAsc(order.getId()),
                customersByAddress(List.of(order)).get(order.getAddressId()), paymentOf(order), refundsOf(order, true));
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
        return OrderDetailResponse.from(order, itemsWithImages(order),
                orderStatusHistoryRepository.findByOrderIdOrderByChangedAtAsc(order.getId()), null, paymentOf(order),
                refundsOf(order, false));
    }

    /** order_items keeps no image of its own, so show the variant's current picture. */
    private List<OrderItemResponse> itemsWithImages(Order order) {
        return orderItemRepository.findByOrderId(order.getId()).stream()
                .map(item -> OrderItemResponse.from(item, productVariantLookup == null ? null
                        : productVariantLookup.findCartProductById(item.getVariantId())
                                .map(CartProductSnapshot::imageUrl).orElse(null)))
                .toList();
    }

    /** Account + recipient behind each order, through the delivery address the buyer picked. */
    private Map<UUID, OrderCustomerResponse> customersByAddress(List<Order> orders) {
        List<UUID> addressIds = orders.stream().map(Order::getAddressId).filter(java.util.Objects::nonNull).distinct().toList();
        if (addressIds.isEmpty()) return Map.of();
        Map<UUID, OrderCustomerResponse> result = new java.util.HashMap<>();
        for (Address address : addressRepository.findAllById(addressIds)) {
            var user = address.getUser();
            result.put(address.getId(), new OrderCustomerResponse(user.getId(), user.getFullName(), user.getEmail(),
                    user.getPhone(), address.getRecipientName(), address.getPhone()));
        }
        return result;
    }

    private Employee requireEmployee(UUID employeeUserId) {
        return employeeRepository.findByUserId(employeeUserId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy hồ sơ nhân viên"));
    }

    private Employee requireOrderViewEmployee(UUID employeeUserId) {
        Employee employee = requireEmployee(employeeUserId);
        if (!employee.getDepartment().equals("sales") && !employee.getDepartment().equals("warehouse")
                && !employee.getDepartment().equals("admin")) {
            throw new AccessDeniedException("Bộ phận hiện tại không có quyền xem đơn hàng");
        }
        return employee;
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
        if (OrderStatus.CANCELLED.value().equals(requestedStatus)) {
            if (inventoryStockService != null) inventoryStockService.returnForOrder(order.getId()); // no-op unless packed
            undoCheckout(order, reason);
        }
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
        // A buyer's cancel request is either accepted (cancelled) or turned down (confirmed — the order goes ahead).
        allowed = allowed || OrderStatus.CANCEL_REQUESTED.value().equals(currentStatus)
                && (OrderStatus.CANCELLED.value().equals(requestedStatus)
                || OrderStatus.CONFIRMED.value().equals(requestedStatus));
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

    private CartPricing priceSelectedCart(UUID userId, String voucherCode, boolean placing) {
        List<CartItem> selectedItems = cartItemRepository.findByUserIdAndIsSelectedTrueOrderByUpdatedAtAsc(userId);
        if (selectedItems.isEmpty()) {
            throw new IllegalArgumentException("Giỏ hàng chưa có sản phẩm nào được chọn");
        }
        List<CheckoutLine> lines = selectedItems.stream().map(item -> toCheckoutLine(userId, item, placing)).toList();
        BigDecimal subtotal = lines.stream().map(CheckoutLine::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add);

        InvoicePromotionService.InvoiceDiscount invoice = invoicePromotionService == null ? null
                : invoicePromotionService.best(userId, subtotal).orElse(null);
        BigDecimal invoiceAmount = invoice == null ? BigDecimal.ZERO : invoice.amount();

        VoucherQuoteResponse voucherQuote = null;
        String voucherError = null;
        if (voucherCode != null && !voucherCode.isBlank()) {
            List<VoucherQuoteRequest.Item> quoteItems = lines.stream()
                    .map(line -> new VoucherQuoteRequest.Item(line.variant().productType(), line.lineTotal()))
                    .toList();
            try {
                voucherQuote = voucherQuoteService.quote(userId,
                        new VoucherQuoteRequest(voucherCode, subtotal.subtract(invoiceAmount), quoteItems));
            } catch (IllegalArgumentException | NoSuchElementException e) {
                if (placing) throw e;
                voucherError = e.getMessage();
            }
        }
        BigDecimal voucherAmount = voucherQuote == null ? BigDecimal.ZERO : voucherQuote.discountAmount();
        BigDecimal total = subtotal.subtract(invoiceAmount).subtract(voucherAmount).max(BigDecimal.ZERO).add(FREE_SHIPPING);
        return new CartPricing(selectedItems, lines, subtotal, invoice, invoiceAmount, voucherQuote, voucherError, total);
    }

    /** Remember which promotions priced the order — needed to give flash-sale units back if it is cancelled. */
    private void recordPromotions(Order order, List<CheckoutLine> lines, List<OrderItem> savedItems,
                                  InvoicePromotionService.InvoiceDiscount invoice) {
        if (productApplications != null) {
            for (int i = 0; i < lines.size() && i < savedItems.size(); i++) {
                ProductVariantSnapshot.Promotion promo = lines.get(i).variant().promotion();
                if (promo == null) continue;
                BigDecimal perUnit = promo.listPrice().subtract(lines.get(i).variant().unitPrice());
                productApplications.save(new PromotionProductApplication(savedItems.get(i).getId(), promo.detailId(),
                        perUnit.multiply(BigDecimal.valueOf(lines.get(i).quantity()))));
            }
        }
        if (invoice != null && invoiceApplications != null) {
            invoiceApplications.save(new PromotionInvoiceApplication(order.getId(), invoice.detailId(), invoice.amount()));
        }
    }

    /**
     * Cancelled: an uncollected payment is voided; money the shop already received (a confirmed bank transfer)
     * becomes a refund to send back. Flash-sale units go back to the promotion.
     */
    private void undoCheckout(Order order, String reason) {
        if (checkoutPaymentService != null) {
            checkoutPaymentService.cancelForOrder(order.getId());
            openRefundIfPaid(order, reason);
        }
        if (productApplications != null && flashSaleCheckoutService != null) {
            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
            Map<UUID, Integer> quantityByItem = new java.util.HashMap<>();
            items.forEach(item -> quantityByItem.put(item.getId(), item.getQuantity()));
            for (PromotionProductApplication application : productApplications.findByOrderItemIdIn(quantityByItem.keySet())) {
                flashSaleCheckoutService.releaseFlash(application.getPromotionProductDetailId(),
                        quantityByItem.getOrDefault(application.getOrderItemId(), 0));
            }
        }
    }

    private void openRefundIfPaid(Order order, String reason) {
        if (refundService == null) return;
        checkoutPaymentService.checkoutPaymentOf(order.getId())
                .filter(payment -> "paid".equals(payment.getStatus()))
                .ifPresent(payment -> refundService.openForCancelledOrder(order, payment.getAmount(), reason));
    }

    /**
     * Sales confirms the buyer's bank transfer arrived. If the order was already cancelled by then,
     * the money is owed back straight away.
     */
    @Transactional
    public OrderPaymentResponse confirmTransferReceived(UUID employeeUserId, UUID orderId) {
        Employee employee = requireEmployee(employeeUserId);
        if (!employee.getDepartment().equals("sales") && !employee.getDepartment().equals("admin")) {
            throw new AccessDeniedException("Bộ phận hiện tại không có quyền xác nhận thanh toán");
        }
        Order order = orderRepository.findById(orderId).orElseThrow(this::orderNotFound);
        if (checkoutPaymentService == null) throw new IllegalStateException("Chưa cấu hình thanh toán");
        checkoutPaymentService.confirmTransferReceived(order.getId());
        if (OrderStatus.CANCELLED.value().equals(order.getStatus())) {
            openRefundIfPaid(order, "Khách chuyển khoản sau khi đơn đã huỷ");
        }
        return paymentOf(order);
    }

    private List<RefundResponse> refundsOf(Order order, boolean withCustomer) {
        return refundService == null ? List.of() : refundService.forOrder(order.getId(), withCustomer);
    }

    private OrderPaymentResponse paymentOf(Order order) {
        return checkoutPaymentService == null ? null : checkoutPaymentService.checkoutPaymentOf(order.getId())
                .map(p -> new OrderPaymentResponse(p.getMethod(), p.getStatus(), p.getAmount(), p.getPaidAt()))
                .orElse(null);
    }

    private CheckoutLine toCheckoutLine(UUID userId, CartItem item, boolean placing) {
        ProductVariantSnapshot variant = productVariantLookup.findActiveById(item.getVariantId())
                .orElseThrow(() -> new NoSuchElementException(
                        "Không tìm thấy biến thể sản phẩm đang hoạt động: " + item.getVariantId()
                ));
        if (item.getQuantity() > variant.availableQuantity()) {
            throw new IllegalStateException(
                    "Số lượng sản phẩm trong giỏ vượt tồn kho. Hiện chỉ còn "
                            + variant.availableQuantity() + " sản phẩm: " + variant.productName()
            );
        }
        if (flashSaleCheckoutService != null) {
            variant = flashSaleCheckoutService.apply(userId, item.getVariantId(), item.getQuantity(), variant, placing);
        }
        BigDecimal lineTotal = variant.unitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
        return new CheckoutLine(variant, item.getQuantity(), lineTotal);
    }

    private record CartPricing(
            List<CartItem> items,
            List<CheckoutLine> lines,
            BigDecimal subtotal,
            InvoicePromotionService.InvoiceDiscount invoice,
            BigDecimal invoiceAmount,
            VoucherQuoteResponse voucher,
            String voucherError,
            BigDecimal total
    ) {
    }

    private record CheckoutLine(
            ProductVariantSnapshot variant,
            int quantity,
            BigDecimal lineTotal
    ) {
    }
}
