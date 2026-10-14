package com.chotomua.backend.modules.marketing;
import com.chotomua.backend.modules.identity.User;
import com.chotomua.backend.modules.identity.UserRepository;
import com.chotomua.backend.modules.order.Order;
import java.math.RoundingMode;
import org.springframework.stereotype.Service;
@Service public class LoyaltyAwardService {
 private final UserRepository users; private final LoyaltyTransactionRepository tx;
 public LoyaltyAwardService(UserRepository users,LoyaltyTransactionRepository tx){this.users=users;this.tx=tx;}
 public void award(Order order){ if(tx.existsByOrderId(order.getId())) return; int points=order.getTotalAmount().divide(new java.math.BigDecimal("10000"),0,RoundingMode.DOWN).intValue(); if(points<=0)return; User u=users.findByIdForUpdate(order.getUserId()).orElseThrow(); u.setLoyaltyBalance(u.getLoyaltyBalance()+points); tx.save(new LoyaltyTransaction(u.getId(),order.getId(),points,"Đơn hàng đã giao")); }
}
