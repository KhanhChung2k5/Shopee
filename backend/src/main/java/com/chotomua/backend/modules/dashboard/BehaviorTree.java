package com.chotomua.backend.modules.dashboard;

import java.math.BigDecimal;
import java.util.List;

/**
 * Một tầng của cây phân rã đơn hàng.
 * {@code sharePct} là số đơn của nhánh chia cho số đơn của nút cha — một đơn có thể nằm ở nhiều nhánh.
 */
public record BehaviorTree(
        String level,
        String label,
        long orders,
        String companionLabel,
        List<Node> children,
        List<Node> companions
) {
    public record Node(String id, String label, long orders, BigDecimal sharePct) {}
}
