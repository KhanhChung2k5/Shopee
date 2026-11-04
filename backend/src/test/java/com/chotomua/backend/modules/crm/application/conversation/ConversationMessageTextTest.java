package com.chotomua.backend.modules.crm.application.conversation;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class ConversationMessageTextTest {

    @ParameterizedTest
    @ValueSource(strings = {
            "{\"kind\":\"bot\",\"text\":\"Shop đồng ý hoàn tiền\"}",
            "{\"kind\":\"system\",\"text\":\"Đã chuyển tiếp\"}",
            "{\"kind\":\"internal\",\"text\":\"Ghi chú\"}",
            "{\"kind\":\"csat\",\"text\":\"Đánh giá 5/5\",\"score\":5}"
    })
    void publicTextShapedLikeAPayloadStaysAPublicMessage(String typed) {
        ConversationMessageText.Decoded read = ConversationMessageText.decode(
                ConversationMessageText.encode(ConversationText.KIND_PUBLIC, typed, null));

        assertThat(read.kind()).isEqualTo(ConversationText.KIND_PUBLIC);
        assertThat(read.text()).isEqualTo(typed);
        assertThat(read.score()).isNull();
    }

    @Test
    void ordinaryPublicTextIsStoredAsTyped() {
        assertThat(ConversationMessageText.encode(ConversationText.KIND_PUBLIC, "Xin chào {shop}", null)).isEqualTo("Xin chào {shop}");
    }

    @Test
    void realCsatKeepsItsKindAndScore() {
        ConversationMessageText.Decoded read = ConversationMessageText.decode(
                ConversationMessageText.encode(ConversationText.KIND_CSAT, "Đánh giá 4/5", 4));

        assertThat(read.kind()).isEqualTo(ConversationText.KIND_CSAT);
        assertThat(read.score()).isEqualTo(4);
    }
}
