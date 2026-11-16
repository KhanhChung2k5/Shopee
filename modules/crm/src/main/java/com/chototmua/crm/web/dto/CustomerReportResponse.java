package com.chototmua.crm.web.dto;

import java.util.List;

/**
 * Báo cáo nhân khẩu học: tuổi từ ngày sinh, giới tính từ hồ sơ,
 * sở thích từ danh mục trên đơn đã giao,
 * thể loại game từ trường genre của đĩa đã giao.
 * {@code customers} mang LTV và phân khúc RFM để vẽ histogram và bảng.
 */
public record CustomerReportResponse(
        long totalCustomers,
        List<ReportBucket> age,
        List<ReportBucket> gender,
        List<InterestBucket> interests,
        List<ReportBucket> genres,
        List<ReportFact> facts,
        List<ReportCustomer> customers
) {
}
