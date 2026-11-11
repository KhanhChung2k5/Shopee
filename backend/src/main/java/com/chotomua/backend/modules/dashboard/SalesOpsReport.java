package com.chotomua.backend.modules.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Doanh thu và vận hành đơn trong kỳ (đơn tính theo ngày tạo, giờ Việt Nam).
 * GMV = subtotal; doanh thu thuần sản phẩm = subtotal − discount; số thu = total (gồm phí ship).
 * Tiền hoàn không bị trừ vào doanh thu. YoY so doanh thu thuần với cùng kỳ năm trước.
 */
public record SalesOpsReport(
        LocalDate from,
        LocalDate to,
        BigDecimal gmv,
        BigDecimal netProduct,
        BigDecimal collected,
        BigDecimal refundedAmount,
        long refundCount,
        long orders,
        BigDecimal aov,
        long deliveredOrders,
        long refundedOrders,
        BigDecimal refundRatePct,
        BigDecimal priorNetProduct,
        BigDecimal yoyPct,
        List<Month> months,
        List<ProductType> byProductType,
        List<PaymentSlice> payments,
        List<RefundReason> refundReasons,
        List<Stage> stages
) {
    /** Một tháng: ba lớp tiền và AOV = trung bình total_amount của đơn không huỷ. */
    public record Month(
            String month,
            BigDecimal gmv,
            BigDecimal netProduct,
            BigDecimal collected,
            long orders,
            BigDecimal aov
    ) {}

    /** Giá trị hàng theo loại (line_total, chưa phân bổ giảm giá hoá đơn). AOV = giá trị loại đó / số đơn có loại đó. */
    public record ProductType(String productType, BigDecimal merchandise, long orders, BigDecimal aov) {}

    /** Một ô method × status của payments checkout. */
    public record PaymentSlice(String method, String status, long count, BigDecimal amount) {}

    /** Hoàn đã chuyển (status = refunded), gom theo kind và nguyên văn reason. */
    public record RefundReason(String kind, String reason, long count, BigDecimal amount) {}

    /** Thời gian trung bình giữa hai mốc sớm nhất trên order_status_histories, chỉ đơn đã giao. */
    public record Stage(String fromStatus, String toStatus, BigDecimal avgHours, long orders) {}
}
