package com.chototmua.crm.application.segment;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Sau khi khách và hồ sơ đã có, bổ sung phân khúc mặc định cho từng nhãn RFM.
 */
@Component
@Order(200)
public class RfmDefaultSegmentSeeder implements ApplicationRunner {

    private final SegmentService segments;

    public RfmDefaultSegmentSeeder(SegmentService segments) {
        this.segments = segments;
    }

    /** Gọi {@link SegmentService#ensureRfmDefaults()} khi ứng dụng khởi động. */
    @Override
    public void run(ApplicationArguments args) {
        segments.ensureRfmDefaults();
    }
}
