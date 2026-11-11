package com.chototmua.crm.domain.profile;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class RfmClassifierTest {

    @Test
    void championsNeedHighScoresOnAllThree() {
        assertThat(RfmClassifier.segment(10, 8, new BigDecimal("8000000")))
                .isEqualTo(RfmClassifier.CHAMPIONS);
    }

    @Test
    void loyalExcludesChampions() {
        assertThat(RfmClassifier.segment(20, 8, new BigDecimal("2000000")))
                .isEqualTo(RfmClassifier.LOYAL);
    }

    @Test
    void loyalWinsTheOverlapWithAtRisk() {
        assertThat(RfmClassifier.segment(100, 4, new BigDecimal("2000000")))
                .isEqualTo(RfmClassifier.LOYAL);
    }

    @Test
    void atRiskIsLapsedHighValue() {
        assertThat(RfmClassifier.segment(200, 5, new BigDecimal("5000000")))
                .isEqualTo(RfmClassifier.AT_RISK);
    }

    @Test
    void potentialIsRecentButSmall() {
        assertThat(RfmClassifier.segment(15, 1, new BigDecimal("200000")))
                .isEqualTo(RfmClassifier.POTENTIAL);
    }

    @Test
    void lostIsLowOnAllThree() {
        assertThat(RfmClassifier.segment(null, 0, BigDecimal.ZERO))
                .isEqualTo(RfmClassifier.LOST);
    }

    @Test
    void unmatchedScoresStayOther() {
        assertThat(RfmClassifier.segment(10, 8, new BigDecimal("100000")))
                .isEqualTo(RfmClassifier.OTHER);
    }
}
