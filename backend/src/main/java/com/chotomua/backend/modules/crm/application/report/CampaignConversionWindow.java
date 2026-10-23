package com.chotomua.backend.modules.crm.application.report;

import com.chotomua.backend.modules.crm.domain.campaign.Campaign;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Cửa sổ suy ra đơn “mua sau chiến dịch”.
 * Có {@code endAt} thì dùng đúng khoảng gửi; không thì 30 ngày kể từ {@code startAt}.
 */
public final class CampaignConversionWindow {

    /** Số ngày mặc định khi chiến dịch không ghi ngày kết thúc. */
    public static final int DEFAULT_DAYS = 30;

    private CampaignConversionWindow() {
    }

    /** Mốc mở cửa sổ: {@code startAt}, thiếu thì {@link Instant#EPOCH}. */
    public static Instant from(Campaign campaign) {
        Instant start = campaign.startAt();
        return start == null ? Instant.EPOCH : start;
    }

    /** Mốc đóng: {@code endAt} hoặc {@code startAt + 30 ngày}. */
    public static Instant to(Campaign campaign) {
        if (campaign.endAt() != null) {
            return campaign.endAt();
        }
        return from(campaign).plus(DEFAULT_DAYS, ChronoUnit.DAYS);
    }

    /** Inclusive hai đầu. Thiếu mốc hoặc thiếu ngày giao thì không khớp. */
    public static boolean contains(Instant deliveredAt, Instant from, Instant to) {
        if (deliveredAt == null || from == null || to == null) {
            return false;
        }
        return !deliveredAt.isBefore(from) && !deliveredAt.isAfter(to);
    }
}
