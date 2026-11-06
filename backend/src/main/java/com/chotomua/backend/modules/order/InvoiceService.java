package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.identity.Employee;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.order.dto.InvoiceResponse;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sales invoices. One is issued by the system when an order is delivered and paid; sales or admin may cancel it and
 * issue a replacement made out to the buyer's company. Numbers come from one sequence: HD000001, HD000002…
 */
@Service
public class InvoiceService {

    /** Vietnamese tax code: 10 digits, or 10 digits and a 3-digit branch suffix. */
    private static final Pattern TAX_CODE = Pattern.compile("\\d{10}(-\\d{3})?");

    private final InvoiceRepository invoices;
    private final OrderRepository orders;
    private final OrderItemRepository items;
    private final CheckoutPaymentService payments;
    private final UserRepository users;
    private final EmployeeRepository employees;

    public InvoiceService(InvoiceRepository invoices, OrderRepository orders, OrderItemRepository items,
                          CheckoutPaymentService payments, UserRepository users, EmployeeRepository employees) {
        this.invoices = invoices;
        this.orders = orders;
        this.items = items;
        this.payments = payments;
        this.users = users;
        this.employees = employees;
    }

    /** Issues the invoice of a delivered, paid order; does nothing if it already has one or is not there yet. */
    @Transactional
    public Optional<Invoice> issueIfDue(UUID orderId) {
        Order order = orders.findById(orderId).orElseThrow();
        if (!"delivered".equals(order.getStatus())) return Optional.empty();
        Optional<Payment> payment = payments.checkoutPaymentOf(orderId);
        if (payment.isEmpty() || !"paid".equals(payment.get().getStatus())) return Optional.empty();
        Optional<Invoice> existing = invoices.findByOrderIdAndStatus(orderId, Invoice.ISSUED);
        if (existing.isPresent()) return existing;
        User user = users.findById(order.getUserId()).orElseThrow();
        String name = order.getRecipientNameSnapshot() != null && !order.getRecipientNameSnapshot().isBlank()
                ? order.getRecipientNameSnapshot() : user.getFullName() == null ? "Khách hàng" : user.getFullName();
        Invoice.Buyer buyer = new Invoice.Buyer(name, null, null, order.getShippingAddressSnapshot(), user.getEmail(),
                order.getRecipientPhoneSnapshot() != null ? order.getRecipientPhoneSnapshot() : user.getPhone());
        return Optional.of(invoices.save(new Invoice(nextNumber(), order, buyer, payment.get().getMethod(), null, null)));
    }

    /** The order's valid invoice and the cancelled ones; a buyer only sees their own order's. */
    @Transactional(readOnly = true)
    public InvoiceResponse.ForOrder forOrder(UUID orderId, UUID viewerId, boolean viewerIsStaff) {
        Order order = orders.findById(orderId).orElseThrow(() -> new NoSuchElementException("Không tìm thấy đơn hàng"));
        if (!viewerIsStaff && !order.getUserId().equals(viewerId)) throw new NoSuchElementException("Không tìm thấy đơn hàng");
        List<OrderItem> lines = items.findByOrderId(orderId);
        List<Invoice> all = invoices.findByOrderIdOrderByIssuedAtDesc(orderId);
        InvoiceResponse current = all.stream().filter(i -> Invoice.ISSUED.equals(i.getStatus())).findFirst()
                .map(i -> InvoiceResponse.from(i, lines)).orElse(null);
        List<InvoiceResponse> cancelled = all.stream().filter(i -> Invoice.CANCELLED.equals(i.getStatus()))
                .map(i -> InvoiceResponse.from(i, lines)).toList();
        return new InvoiceResponse.ForOrder(current, cancelled);
    }

    /** Sales cancel the valid invoice and issue a replacement with the buyer details given. */
    @Transactional
    public InvoiceResponse reissue(UUID orderId, UUID employeeUserId, ReissueRequest request) {
        Employee employee = employees.findByUserId(employeeUserId).orElseThrow(() -> new AccessDeniedException("Không tìm thấy nhân viên"));
        if (!"sales".equals(employee.getDepartment())) {
            throw new AccessDeniedException("Chỉ nhân viên bán hàng được lập lại hoá đơn");
        }
        Invoice old = invoices.findByOrderIdAndStatus(orderId, Invoice.ISSUED)
                .orElseThrow(() -> new IllegalStateException("Đơn chưa có hoá đơn để lập lại"));
        String buyerName = required(request.buyerName(), "Tên người mua");
        String company = blankToNull(request.buyerCompany());
        String taxCode = blankToNull(request.buyerTaxCode());
        if (taxCode != null && !TAX_CODE.matcher(taxCode).matches()) {
            throw new IllegalArgumentException("Mã số thuế gồm 10 chữ số (hoặc 10 chữ số kèm -xxx cho chi nhánh)");
        }
        if (company != null && taxCode == null) throw new IllegalArgumentException("Hoá đơn công ty cần mã số thuế");
        String reason = required(request.reason(), "Lý do lập lại");
        old.cancel(employee.getId(), reason);
        invoices.saveAndFlush(old); // the unique index allows one valid invoice per order
        Order order = orders.findById(orderId).orElseThrow();
        Invoice.Buyer buyer = new Invoice.Buyer(buyerName, company, taxCode,
                blankToNull(request.buyerAddress()) != null ? request.buyerAddress().trim() : old.getBuyerAddress(),
                blankToNull(request.buyerEmail()) != null ? request.buyerEmail().trim() : old.getBuyerEmail(),
                old.getBuyerPhone());
        Invoice replacement = invoices.save(new Invoice(nextNumber(), order, buyer, old.getPaymentMethod(), employee.getId(), old.getId()));
        return InvoiceResponse.from(replacement, items.findByOrderId(orderId));
    }

    public record ReissueRequest(String buyerName, String buyerCompany, String buyerTaxCode, String buyerAddress,
                                 String buyerEmail, String reason) {
    }

    private String nextNumber() {
        return "HD" + String.format("%06d", invoices.nextNumber());
    }

    private static String required(String value, String label) {
        String v = blankToNull(value);
        if (v == null) throw new IllegalArgumentException(label + " không được để trống");
        return v;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
