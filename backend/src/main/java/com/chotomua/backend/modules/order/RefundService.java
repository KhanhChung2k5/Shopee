package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.catalog.InventoryStockService;
import com.chotomua.backend.modules.identity.Employee;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.marketing.LoyaltyAwardService;
import com.chotomua.backend.modules.order.dto.RefundBankAccountRequest;
import com.chotomua.backend.modules.order.dto.RefundResponse;
import com.chotomua.backend.modules.order.dto.RefundReturnRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Refunds are paid back by hand: the buyer gives a bank account, CS transfers the money and records the
 * transaction code. Two sources — a delivered line sent back (CS approves or rejects it), and a bank-transfer
 * order the shop had already been paid for that then got cancelled (owed in full, approved from the start).
 */
@Service
public class RefundService {

    /** How long after delivery a buyer may still send a line back. */
    static final Duration RETURN_WINDOW = Duration.ofDays(7);

    private final RefundReturnRepository refunds;
    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final OrderStatusHistoryRepository history;
    private final EmployeeRepository employees;
    private final UserRepository users;
    private final CheckoutPaymentService payments;
    private final LoyaltyAwardService loyalty;

    /** Optional so unit tests run without CRM: recalculates LTV / RFM once money has gone back. */
    private com.chotomua.backend.modules.crm.application.CrmOrderEvents crmOrderEvents;

    /** Optional so unit tests run without the catalog: returned goods fit for sale go back into stock. */
    private InventoryStockService inventoryStockService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setInventoryStockService(InventoryStockService inventoryStockService) {
        this.inventoryStockService = inventoryStockService;
    }

    /** Optional so unit tests run without a database: prices a return the way the order was discounted. */
    private OrderDiscountLookup discountLookup;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setDiscountLookup(OrderDiscountLookup discountLookup) {
        this.discountLookup = discountLookup;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    void setCrmOrderEvents(com.chotomua.backend.modules.crm.application.CrmOrderEvents crmOrderEvents) {
        this.crmOrderEvents = crmOrderEvents;
    }

    public RefundService(RefundReturnRepository refunds, OrderRepository orders, OrderItemRepository items,
                         OrderStatusHistoryRepository history, EmployeeRepository employees, UserRepository users,
                         CheckoutPaymentService payments, LoyaltyAwardService loyalty) {
        this.refunds = refunds;
        this.orders = orders;
        this.items = items;
        this.history = history;
        this.employees = employees;
        this.users = users;
        this.payments = payments;
        this.loyalty = loyalty;
    }

    /** What sending this line back would refund, before the buyer asks — same rules as {@link #requestReturn}. */
    @Transactional(readOnly = true)
    public RefundQuoteResponse quoteReturn(UUID buyerId, UUID orderItemId) {
        OrderItem item = items.findById(orderItemId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy sản phẩm trong đơn"));
        Order order = orders.findByIdAndUserId(item.getOrderId(), buyerId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy đơn hàng"));
        ReturnRefundCalculator.Result result = priceReturn(order, item);
        return new RefundQuoteResponse(item.getId(), item.getLineTotal(), result.amount(), result.lostDiscount());
    }

    public record RefundQuoteResponse(UUID orderItemId, BigDecimal lineTotal, BigDecimal refundAmount,
                                      BigDecimal lostDiscount) {
    }

    @Transactional
    public RefundResponse requestReturn(UUID buyerId, RefundReturnRequest request) {
        OrderItem item = items.findById(request.orderItemId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy sản phẩm trong đơn"));
        Order order = orders.findByIdAndUserId(item.getOrderId(), buyerId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy đơn hàng"));
        // Two returns of one buyer are priced one after the other: each sees the lines the other gave back.
        if (users != null) users.findByIdForUpdate(buyerId);
        if (!OrderStatus.DELIVERED.value().equals(order.getStatus())) {
            throw new IllegalStateException("Chỉ có thể yêu cầu hoàn tiền sau khi đơn đã giao");
        }
        OffsetDateTime deliveredAt = deliveredAt(order.getId());
        if (deliveredAt != null && deliveredAt.plus(RETURN_WINDOW).isBefore(OffsetDateTime.now())) {
            throw new IllegalStateException("Đã quá " + RETURN_WINDOW.toDays() + " ngày kể từ khi nhận hàng, không thể yêu cầu hoàn tiền");
        }
        if (refunds.findByOrderItemId(item.getId()).stream().anyMatch(r -> !"rejected".equals(r.getStatus()))) {
            throw new IllegalStateException("Sản phẩm này đã có yêu cầu hoàn tiền");
        }
        RefundReturn refund = RefundReturn.forReturn(order.getId(), item.getId(), request.reason().trim(),
                priceReturn(order, item).amount());
        refund.setBankAccount(request.bankName().trim(), request.bankAccountNo().trim(), request.bankAccountName().trim());
        return toResponse(refunds.save(refund), false);
    }

    /** Called when an order is cancelled after the shop had received the buyer's transfer. */
    @Transactional
    public void openForCancelledOrder(Order order, BigDecimal paidAmount, String reason) {
        boolean alreadyOpen = refunds.findByOrderIdOrderByRequestedAtAsc(order.getId()).stream()
                .anyMatch(r -> RefundReturn.CANCELLATION.equals(r.getKind()));
        if (alreadyOpen) return;
        refunds.save(RefundReturn.forCancellation(order.getId(), reason, paidAmount));
    }

    @Transactional
    public RefundResponse updateBankAccount(UUID buyerId, UUID refundId, RefundBankAccountRequest request) {
        RefundReturn refund = requireRefund(refundId);
        orders.findByIdAndUserId(refund.getOrderId(), buyerId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy yêu cầu hoàn tiền"));
        if (!"requested".equals(refund.getStatus()) && !"approved".equals(refund.getStatus())) {
            throw new IllegalStateException("Yêu cầu hoàn tiền đã được xử lý, không thể đổi tài khoản nhận");
        }
        refund.setBankAccount(request.bankName().trim(), request.bankAccountNo().trim(), request.bankAccountName().trim());
        return toResponse(refund, false);
    }

    /** Money already sent back, per order — for order lists and revenue. */
    @Transactional(readOnly = true)
    public java.util.Map<UUID, BigDecimal> refundedTotals(java.util.Collection<UUID> orderIds) {
        if (orderIds.isEmpty()) return java.util.Map.of();
        java.util.Map<UUID, BigDecimal> totals = new java.util.HashMap<>();
        for (RefundReturn refund : refunds.findByOrderIdInAndStatus(orderIds, "refunded")) {
            totals.merge(refund.getOrderId(), refund.getRefundAmount(), BigDecimal::add);
        }
        return totals;
    }

    @Transactional(readOnly = true)
    public List<RefundResponse> forOrder(UUID orderId, boolean withCustomer) {
        return toResponses(refunds.findByOrderIdOrderByRequestedAtAsc(orderId), withCustomer);
    }

    @Transactional(readOnly = true)
    public List<RefundResponse> listForStaff(UUID staffUserId, String status) {
        requireCsOrAdmin(staffUserId);
        List<RefundReturn> found = status == null || status.isBlank()
                ? refunds.findAllByOrderByRequestedAtDesc()
                : refunds.findByStatusOrderByRequestedAtDesc(status.trim());
        return toResponses(found, true);
    }

    @Transactional
    public RefundResponse approve(UUID staffUserId, UUID refundId) {
        Employee employee = requireCsOrAdmin(staffUserId);
        RefundReturn refund = requireRequested(refundId);
        refund.approve(employee.getId());
        return toResponse(refund, true);
    }

    @Transactional
    public RefundResponse reject(UUID staffUserId, UUID refundId, String note) {
        Employee employee = requireCsOrAdmin(staffUserId);
        RefundReturn refund = requireRequested(refundId);
        if (RefundReturn.CANCELLATION.equals(refund.getKind())) {
            throw new IllegalStateException("Đơn đã huỷ sau khi khách thanh toán — bắt buộc hoàn tiền");
        }
        if (note == null || note.isBlank()) throw new IllegalArgumentException("Phải nhập lý do từ chối");
        refund.reject(employee.getId(), note.trim());
        return toResponse(refund, true);
    }

    /**
     * The returned goods reached the shop. Fit to sell again: they go back into the warehouse the order shipped
     * from (or the one given) as a "return" stock movement. Damaged: only the receipt is recorded.
     */
    @Transactional
    public RefundResponse receiveReturn(UUID staffUserId, UUID refundId, boolean restock, UUID warehouseId) {
        Employee employee = requireCsOrAdmin(staffUserId);
        RefundReturn refund = requireRefund(refundId);
        if (!RefundReturn.RETURN.equals(refund.getKind())) {
            throw new IllegalStateException("Chỉ yêu cầu trả hàng mới có hàng hoàn về");
        }
        if (!"approved".equals(refund.getStatus())) {
            throw new IllegalStateException("Chỉ nhận hàng hoàn cho yêu cầu đã duyệt");
        }
        if (refund.getReceivedAt() != null) throw new IllegalStateException("Đã ghi nhận nhận hàng hoàn trước đó");
        UUID target = null;
        if (restock) {
            target = warehouseId != null ? warehouseId
                    : orders.findById(refund.getOrderId()).map(Order::getWarehouseId).orElse(null);
            if (target == null) throw new IllegalArgumentException("Phải chọn kho nhập lại hàng hoàn");
            OrderItem item = items.findById(refund.getOrderItemId())
                    .orElseThrow(() -> new NoSuchElementException("Không tìm thấy sản phẩm trong đơn"));
            if (inventoryStockService != null) {
                inventoryStockService.restockReturn(refund.getId(), target,
                        new InventoryStockService.ExportLine(item.getVariantId(), item.getQuantity()));
            }
        }
        refund.markReceived(employee.getId(), target);
        return toResponse(refund, true);
    }

    /** CS has transferred the money back: record the bank transaction code and settle payment + loyalty. */
    @Transactional
    public RefundResponse markRefunded(UUID staffUserId, UUID refundId, String transferRef) {
        Employee employee = requireCsOrAdmin(staffUserId);
        RefundReturn refund = requireRefund(refundId);
        if (!"approved".equals(refund.getStatus())) {
            throw new IllegalStateException("Chỉ ghi nhận đã hoàn tiền cho yêu cầu đã duyệt");
        }
        if (RefundReturn.RETURN.equals(refund.getKind()) && refund.getReceivedAt() == null) {
            throw new IllegalStateException("Chưa nhận được hàng khách trả — ghi nhận nhận hàng hoàn trước khi hoàn tiền");
        }
        if (!refund.hasBankAccount()) {
            throw new IllegalStateException("Khách chưa cung cấp tài khoản ngân hàng nhận tiền");
        }
        if (transferRef == null || transferRef.isBlank()) {
            throw new IllegalArgumentException("Phải nhập mã giao dịch chuyển khoản");
        }
        refund.markRefunded(employee.getId(), transferRef.trim());
        BigDecimal refundedSoFar = refunds.findByOrderIdOrderByRequestedAtAsc(refund.getOrderId()).stream()
                .filter(r -> "refunded".equals(r.getStatus()))
                .map(RefundReturn::getRefundAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        payments.recordRefunded(refund.getOrderId(), refundedSoFar);
        Optional<Order> order = orders.findById(refund.getOrderId());
        if (RefundReturn.RETURN.equals(refund.getKind()) && loyalty != null) {
            order.ifPresent(o -> loyalty.revoke(o, refund.getRefundAmount()));
        }
        if (crmOrderEvents != null) order.ifPresent(o -> crmOrderEvents.onOrderRefunded(o.getUserId()));
        return toResponse(refund, true);
    }

    /**
     * Prices a returned line against the lines already sent back (requests not rejected): the voucher's share only
     * on the lines it covered, and a discount the goods kept no longer qualify for comes off the refund.
     */
    private ReturnRefundCalculator.Result priceReturn(Order order, OrderItem item) {
        if (discountLookup == null) {
            BigDecimal amount = amountFor(order, item);
            return new ReturnRefundCalculator.Result(amount, BigDecimal.ZERO);
        }
        OrderDiscountLookup.Breakdown breakdown = discountLookup.forOrder(order);
        java.util.Map<UUID, String> types = discountLookup.productTypes(order.getId());
        List<ReturnRefundCalculator.Line> lines = items.findByOrderId(order.getId()).stream()
                .map(line -> new ReturnRefundCalculator.Line(line.getId(), line.getLineTotal(),
                        breakdown.covers(types.get(line.getId()))))
                .toList();
        List<UUID> returned = refunds.findByOrderIdOrderByRequestedAtAsc(order.getId()).stream()
                .filter(r -> RefundReturn.RETURN.equals(r.getKind()) && !"rejected".equals(r.getStatus()))
                .map(RefundReturn::getOrderItemId)
                .filter(id -> id != null && !id.equals(item.getId()))
                .toList();
        return ReturnRefundCalculator.refund(lines, returned, item.getId(), breakdown.discounts());
    }

    /** The line's share of what the buyer actually paid: line total minus its part of the order discount. */
    static BigDecimal amountFor(Order order, OrderItem item) {
        BigDecimal line = item.getLineTotal();
        BigDecimal subtotal = order.getSubtotalAmount();
        BigDecimal discount = order.getDiscountAmount() == null ? BigDecimal.ZERO : order.getDiscountAmount();
        if (subtotal == null || subtotal.signum() <= 0 || discount.signum() <= 0) return line;
        BigDecimal share = discount.multiply(line).divide(subtotal, 0, RoundingMode.HALF_UP);
        return line.subtract(share).max(BigDecimal.ZERO);
    }

    private OffsetDateTime deliveredAt(UUID orderId) {
        return history.findByOrderIdOrderByChangedAtAsc(orderId).stream()
                .filter(h -> OrderStatus.DELIVERED.value().equals(h.getStatus()))
                .map(OrderStatusHistory::getChangedAt)
                .reduce((first, second) -> second)
                .orElse(null);
    }

    private RefundReturn requireRefund(UUID refundId) {
        return refunds.findById(refundId).orElseThrow(() -> new NoSuchElementException("Không tìm thấy yêu cầu hoàn tiền"));
    }

    private RefundReturn requireRequested(UUID refundId) {
        RefundReturn refund = requireRefund(refundId);
        if (!"requested".equals(refund.getStatus())) throw new IllegalStateException("Yêu cầu đã được xử lý");
        return refund;
    }

    private Employee requireCsOrAdmin(UUID staffUserId) {
        Employee employee = employees.findByUserId(staffUserId)
                .orElseThrow(() -> new AccessDeniedException("Không tìm thấy nhân viên"));
        if (!"cs".equals(employee.getDepartment())) {
            throw new AccessDeniedException("Chỉ CSKH hoặc Admin được xử lý hoàn tiền");
        }
        return employee;
    }

    /** A list of refunds with their lines, orders and buyers loaded in three queries — not three per refund. */
    private List<RefundResponse> toResponses(List<RefundReturn> list, boolean withCustomer) {
        if (list.isEmpty()) return List.of();
        java.util.Map<UUID, OrderItem> itemById = new java.util.HashMap<>();
        items.findAllById(list.stream().map(RefundReturn::getOrderItemId).filter(java.util.Objects::nonNull).distinct().toList())
                .forEach(item -> itemById.put(item.getId(), item));
        java.util.Map<UUID, User> buyerByOrder = new java.util.HashMap<>();
        if (withCustomer) {
            List<Order> found = orders.findAllById(list.stream().map(RefundReturn::getOrderId).distinct().toList());
            java.util.Map<UUID, User> userById = new java.util.HashMap<>();
            users.findAllById(found.stream().map(Order::getUserId).distinct().toList()).forEach(u -> userById.put(u.getId(), u));
            found.forEach(order -> buyerByOrder.put(order.getId(), userById.get(order.getUserId())));
        }
        return list.stream().map(refund -> {
            OrderItem item = refund.getOrderItemId() == null ? null : itemById.get(refund.getOrderItemId());
            User buyer = buyerByOrder.get(refund.getOrderId());
            return RefundResponse.from(refund, item == null ? null : item.getProductNameSnapshot(), item == null ? null : item.getQuantity(),
                    buyer == null ? null : buyer.getFullName(), buyer == null ? null : buyer.getEmail());
        }).toList();
    }

    private RefundResponse toResponse(RefundReturn refund, boolean withCustomer) {
        Optional<OrderItem> item = refund.getOrderItemId() == null ? Optional.empty() : items.findById(refund.getOrderItemId());
        String customerName = null;
        String customerEmail = null;
        if (withCustomer) {
            Optional<User> buyer = orders.findById(refund.getOrderId()).flatMap(order -> users.findById(order.getUserId()));
            customerName = buyer.map(User::getFullName).orElse(null);
            customerEmail = buyer.map(User::getEmail).orElse(null);
        }
        return RefundResponse.from(refund, item.map(OrderItem::getProductNameSnapshot).orElse(null),
                item.map(OrderItem::getQuantity).orElse(null), customerName, customerEmail);
    }
}
