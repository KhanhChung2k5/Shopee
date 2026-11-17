package com.chototmua.crm.web.dto;

import java.math.BigDecimal;

/** Một nhóm trong biểu đồ tỷ lệ (tuổi hoặc giới tính). */
public record ReportBucket(
        String bucket,
        String label,
        long count,
        BigDecimal percent
) {
}
