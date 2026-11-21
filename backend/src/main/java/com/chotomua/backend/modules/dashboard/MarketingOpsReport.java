package com.chotomua.backend.modules.dashboard;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Hiệu quả khuyến mãi, voucher và chiến dịch.
 * "Có khuyến mãi" chỉ tính promotion_product_applications và promotion_invoice_applications.
 * Voucher được thống kê riêng đầy đủ: lượt dùng, hạn mức, tỷ lệ dùng, tổng giảm và doanh thu tạo ra.
 */
public record MarketingOpsReport(
        LocalDate from,
        LocalDate to,
        PromoSide withPromotion,
        PromoSide withoutPromotion,
        BigDecimal promotionDiscount,
        BigDecimal discountPerPromoOrder,
        long voucherOrders,
        BigDecimal voucherRevenue,
        BigDecimal voucherDiscount,
        List<Mechanism> mechanisms,
        List<FlashSale> flashSales,
        List<TierEffect> tiers,
        List<VoucherUse> vouchers,
        List<CampaignRow> campaigns
) {
    /** Doanh thu = total_amount của đơn không huỷ. */
    public record PromoSide(long orders, BigDecimal revenue) {}

    /** Tách đơn có giảm sản phẩm, giảm hoá đơn, hoặc cả hai. */
    public record Mechanism(String key, String label, long orders, BigDecimal revenue, BigDecimal discount) {}

    /** Flash sale: sold_qty / limit_qty trên promotion_product_details có flash_price. */
    public record FlashSale(
            String programName,
            String productName,
            String sku,
            int soldQty,
            Integer limitQty,
            BigDecimal soldPct,
            BigDecimal flashPrice
    ) {}

    /** Hiệu quả khuyến mãi theo phân khúc RFM hiện tại của khách đặt đơn. */
    public record TierEffect(String tier, long orders, BigDecimal revenue, BigDecimal discount) {}

    /** Thống kê voucher chi tiết: mã, loại, giá trị, lượt dùng / hạn mức, doanh thu và tiền giảm trên đơn. */
    public record VoucherUse(
            String code,
            String type,
            BigDecimal value,
            long uses,
            long orders,
            Integer usageLimit,
            BigDecimal redemptionPct,
            BigDecimal revenue,
            BigDecimal discountAmount,
            Instant expiresAt
    ) {}

    /**
     * Phễu: thành viên segment → thư đã gửi/đã đọc → người mua đơn đã giao trong cửa sổ chiến dịch.
     * Doanh thu là tổng total_amount của các đơn đó.
     */
    public record CampaignRow(
            UUID id,
            String name,
            Instant windowFrom,
            Instant windowTo,
            boolean assumedEnd,
            long targeted,
            long sent,
            long opened,
            long converted,
            BigDecimal openRatePct,
            BigDecimal buyRatePct,
            BigDecimal revenue
    ) {}
}
