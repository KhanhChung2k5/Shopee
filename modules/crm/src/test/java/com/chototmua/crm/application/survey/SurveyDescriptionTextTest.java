package com.chototmua.crm.application.survey;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Đối tượng đã chọn nằm trong description vì schema không có bảng riêng. */
class SurveyDescriptionTextTest {

    @Test
    void audienceRoundTripsBesidePlainDescription() {
        UUID segmentId = UUID.fromString("cccc3333-3333-3333-3333-333333333333");
        String stored = SurveyDescriptionText.encode("Ghi chú nội bộ", List.of(segmentId));

        SurveyDescriptionText.Decoded decoded = SurveyDescriptionText.decode(stored);

        assertThat(decoded.description()).isEqualTo("Ghi chú nội bộ");
        assertThat(decoded.segmentIds()).containsExactly(segmentId);
    }

    @Test
    void plainDescriptionStaysPlain() {
        assertThat(SurveyDescriptionText.encode("Chỉ mô tả", List.of())).isEqualTo("Chỉ mô tả");
        assertThat(SurveyDescriptionText.decode("Chỉ mô tả").segmentIds()).isEmpty();
        assertThat(SurveyDescriptionText.decode("Chỉ mô tả").description()).isEqualTo("Chỉ mô tả");
    }
}
