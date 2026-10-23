package com.chotomua.backend.modules.crm.application.report;

import com.chotomua.backend.modules.crm.domain.campaign.Campaign;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Cửa sổ mua sau chiến dịch: endAt hoặc 30 ngày kể từ startAt. */
class CampaignConversionWindowTest {

    private static final Instant START = Instant.parse("2026-10-01T08:00:00Z");

    @Test
    void usesEndAtWhenPresent() {
        Campaign campaign = campaign(START, START.plus(7, ChronoUnit.DAYS));
        assertThat(CampaignConversionWindow.from(campaign)).isEqualTo(START);
        assertThat(CampaignConversionWindow.to(campaign)).isEqualTo(START.plus(7, ChronoUnit.DAYS));
    }

    @Test
    void defaultsToThirtyDaysWhenEndAtMissing() {
        Campaign campaign = campaign(START, null);
        assertThat(CampaignConversionWindow.to(campaign))
                .isEqualTo(START.plus(CampaignConversionWindow.DEFAULT_DAYS, ChronoUnit.DAYS));
    }

    @Test
    void containsIsInclusiveOnBothEnds() {
        Instant from = START;
        Instant to = START.plus(7, ChronoUnit.DAYS);
        assertThat(CampaignConversionWindow.contains(from, from, to)).isTrue();
        assertThat(CampaignConversionWindow.contains(to, from, to)).isTrue();
        assertThat(CampaignConversionWindow.contains(from.minusSeconds(1), from, to)).isFalse();
        assertThat(CampaignConversionWindow.contains(to.plusSeconds(1), from, to)).isFalse();
        assertThat(CampaignConversionWindow.contains(null, from, to)).isFalse();
    }

    private static Campaign campaign(Instant startAt, Instant endAt) {
        return new Campaign(UUID.randomUUID(), "Thử", "in_app", startAt, endAt, null);
    }
}
