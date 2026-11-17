package com.chototmua.crm.application.segment;

import java.util.UUID;

/**
 * Nguồn nhãn RFM cho preset phân khúc.
 * Ưu tiên {@code CustomerProfileCRM.rfmSegment} sau khi tính lại.
 */
public interface RfmSegmentSource {

    /** Nhãn RFM hiện tại của khách (hồ sơ CRM hoặc tính từ đơn). */
    String rfmSegment(UUID userId);
}
