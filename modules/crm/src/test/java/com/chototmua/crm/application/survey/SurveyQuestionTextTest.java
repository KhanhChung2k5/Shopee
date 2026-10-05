package com.chototmua.crm.application.survey;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Lựa chọn trắc nghiệm nằm trong question_text vì schema không có bảng option. */
class SurveyQuestionTextTest {

    @Test
    void choiceRoundTripsThroughQuestionTextJson() {
        String stored = SurveyQuestionText.encode(
                "Bạn thích dòng nào?",
                "multiple_choice",
                List.of("Xbox", "PlayStation"));

        SurveyQuestionText.Decoded decoded = SurveyQuestionText.decode(stored, "multiple_choice");

        assertThat(decoded.questionText()).isEqualTo("Bạn thích dòng nào?");
        assertThat(decoded.options()).containsExactly("Xbox", "PlayStation");
    }

    @Test
    void plainTextQuestionStaysPlain() {
        String stored = SurveyQuestionText.encode("Góp ý", "text", List.of());
        assertThat(stored).isEqualTo("Góp ý");
        assertThat(SurveyQuestionText.decode(stored, "text").options()).isEmpty();
    }
}
