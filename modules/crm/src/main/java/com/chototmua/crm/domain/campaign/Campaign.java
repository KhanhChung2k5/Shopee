package com.chototmua.crm.domain.campaign;

import java.time.Instant;
import java.util.UUID;

/**
 * Chiến dịch chăm sóc trong ứng dụng. Kênh luôn {@code in_app} — không gửi thư.
 * {@code surveyId} có thì thông báo trỏ tới khảo sát; không có cột riêng trên bảng {@code campaigns}.
 */
public record Campaign(
        UUID id,
        String name,
        String channel,
        Instant startAt,
        Instant endAt,
        UUID surveyId
) {
}
