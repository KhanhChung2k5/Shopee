package com.chotomua.backend.modules.order;

import com.chotomua.backend.modules.identity.Employee;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.order.dto.RefundRequest;
import com.chotomua.backend.modules.order.dto.RefundResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RefundService {
 private final RefundReturnRepository refunds; private final OrderItemRepository items; private final OrderRepository orders; private final EmployeeRepository employees; private final UserRepository users; private final WalletTransactionRepository transactions;
 public RefundService(RefundReturnRepository refunds, OrderItemRepository items, OrderRepository orders, EmployeeRepository employees, UserRepository users, WalletTransactionRepository transactions) { this.refunds=refunds; this.items=items; this.orders=orders; this.employees=employees; this.users=users; this.transactions=transactions; }
 @Transactional public RefundResponse request(UUID userId, RefundRequest request) {
  OrderItem item=items.findById(request.orderItemId()).orElseThrow(()->new NoSuchElementException("Không tìm thấy dòng hàng")); Order order=orders.findByIdAndUserId(item.getOrderId(),userId).orElseThrow(()->new NoSuchElementException("Không tìm thấy đơn hàng"));
  if (!"delivered".equals(order.getStatus())) throw new IllegalStateException("Chỉ có thể yêu cầu hoàn tiền sau khi đơn đã giao");
  if (refunds.findByOrderItemId(item.getId()).stream().anyMatch(r->!"rejected".equals(r.getStatus()))) throw new IllegalStateException("Dòng hàng đã có yêu cầu hoàn tiền");
  return RefundResponse.from(refunds.save(new RefundReturn(item.getId(), request.reason())));
 }
 @Transactional public RefundResponse approve(UUID staffUserId, UUID refundId) { RefundReturn refund=refunds.findById(refundId).orElseThrow(()->new NoSuchElementException("Không tìm thấy yêu cầu hoàn tiền")); if(!"requested".equals(refund.getStatus())) throw new IllegalStateException("Yêu cầu đã được xử lý"); Employee employee=requireCsOrAdmin(staffUserId); OrderItem item=items.findById(refund.getOrderItemId()).orElseThrow(); Order order=orders.findById(item.getOrderId()).orElseThrow(); User buyer=users.findByIdForUpdate(order.getUserId()).orElseThrow(); BigDecimal amount=item.getLineTotal().subtract(order.getDiscountAmount().multiply(item.getLineTotal()).divide(order.getSubtotalAmount(),2,java.math.RoundingMode.HALF_UP)); WalletTransaction tx=transactions.save(WalletTransaction.refund(buyer.getId(),order.getId(),amount)); buyer.setWalletBalance(buyer.getWalletBalance().add(amount)); refund.approve(employee.getId(),tx.getId(),amount); return RefundResponse.from(refund); }
 @Transactional public RefundResponse reject(UUID staffUserId, UUID refundId) { RefundReturn r=refunds.findById(refundId).orElseThrow(()->new NoSuchElementException("Không tìm thấy yêu cầu hoàn tiền")); if(!"requested".equals(r.getStatus())) throw new IllegalStateException("Yêu cầu đã được xử lý"); r.reject(requireCsOrAdmin(staffUserId).getId()); return RefundResponse.from(r); }
 @Transactional(readOnly=true) public List<RefundResponse> list() { return refunds.findAllByOrderByRequestedAtDesc().stream().map(RefundResponse::from).toList(); }
 private Employee requireCsOrAdmin(UUID id) { Employee e=employees.findByUserId(id).orElseThrow(()->new AccessDeniedException("Không tìm thấy nhân viên")); if(!"cs".equals(e.getDepartment())&&!"admin".equals(e.getDepartment())) throw new AccessDeniedException("Chỉ CS hoặc Admin được xử lý hoàn tiền"); return e; }
}
