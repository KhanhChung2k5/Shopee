package com.chotomua.backend.modules.crm.application.profile;

import com.chotomua.backend.modules.crm.application.segment.SegmentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 20:00 giờ Việt Nam mỗi ngày, cùng việc nút « Tính lại tất cả ».
 * Lịch nằm trong tiến trình: server tắt đúng giờ thì lần đó mất, không chạy bù khi mở lại.
 */
@Component
public class ProfileRecalculateScheduler {

    private static final Logger log = LoggerFactory.getLogger(ProfileRecalculateScheduler.class);

    private final CustomerProfileService profiles;
    private final SegmentService segments;

    public ProfileRecalculateScheduler(CustomerProfileService profiles, SegmentService segments) {
        this.profiles = profiles;
        this.segments = segments;
    }

    @Scheduled(cron = "0 0 20 * * *", zone = "Asia/Ho_Chi_Minh")
    public void recalculateNightly() {
        int done = profiles.recalculateAll();
        segments.refreshAll();
        log.info("Đã tính lại {} hồ sơ CRM và làm mới thành viên phân khúc lúc 20:00", done);
    }
}
