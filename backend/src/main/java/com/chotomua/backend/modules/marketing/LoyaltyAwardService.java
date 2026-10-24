package com.chotomua.backend.modules.marketing;
import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.order.Order;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;
@Service public class LoyaltyAwardService {
 private final UserRepository users; private final LoyaltyTransactionRepository tx;
 public LoyaltyAwardService(UserRepository users,LoyaltyTransactionRepository tx){this.users=users;this.tx=tx;}
 public void award(Order order){ if(tx.existsByOrderId(order.getId())) return; int points=order.getTotalAmount().divide(new java.math.BigDecimal("10000"),0,RoundingMode.DOWN).intValue(); if(points<=0)return; User u=users.findByIdForUpdate(order.getUserId()).orElseThrow(); long earned=tx.sumEarnedPoints(u.getId())+points; u.setLoyaltyBalance(u.getLoyaltyBalance()+points); u.setLoyaltyTier(LoyaltyTier.forPoints(earned).code()); tx.save(new LoyaltyTransaction(u.getId(),order.getId(),points,"Đơn hàng đã giao")); }
 /** Goods sent back and refunded: take back the points that money earned (never more than the order still holds). */
 public void revoke(Order order, java.math.BigDecimal refundAmount){ long held=tx.sumPointsForOrder(order.getId()); int points=(int)Math.min(held, refundAmount.divide(new java.math.BigDecimal("10000"),0,RoundingMode.DOWN).longValue()); if(points<=0)return; User u=users.findByIdForUpdate(order.getUserId()).orElseThrow(); u.setLoyaltyBalance(Math.max(0,u.getLoyaltyBalance()-points)); long earned=tx.sumEarnedPoints(u.getId())-points; u.setLoyaltyTier(LoyaltyTier.forPoints(Math.max(0,earned)).code()); tx.save(new LoyaltyTransaction(u.getId(),order.getId(),-points,"Hoàn tiền sản phẩm trả lại")); }
}
