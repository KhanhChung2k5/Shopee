package com.chotomua.backend.modules.crm.application.campaign;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.chotomua.backend.modules.crm.adapter.fake.FakeIdentityPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeOrderPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeProductPort;
import com.chotomua.backend.modules.crm.application.exception.InvalidCampaignException;
import com.chotomua.backend.modules.crm.application.exception.SurveyNotFoundException;
import com.chotomua.backend.modules.crm.application.notification.InMemoryNotificationStore;
import com.chotomua.backend.modules.crm.application.segment.InMemorySegmentStore;
import com.chotomua.backend.modules.crm.application.survey.InMemorySurveyStore;
import com.chotomua.backend.modules.crm.domain.segment.CustomerSegment;
import com.chotomua.backend.modules.crm.domain.segment.SegmentMember;
import com.chotomua.backend.modules.crm.domain.segment.SegmentRule;
import com.chotomua.backend.modules.crm.domain.survey.Survey;
import com.chotomua.backend.modules.crm.domain.survey.SurveyQuestion;
import com.chotomua.backend.modules.crm.port.dto.CustomerStatus;
import com.chotomua.backend.modules.crm.port.dto.CustomerView;
import com.chotomua.backend.modules.crm.port.dto.StaffDepartment;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** A campaign can only carry a survey a customer can actually answer. */
class CampaignSurveyRulesTest {

    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private final FakeIdentityPort identity = new FakeIdentityPort();
    private final InMemorySegmentStore segments = new InMemorySegmentStore();
    private final InMemorySurveyStore surveys = new InMemorySurveyStore();
    private final InMemoryNotificationStore notifications = new InMemoryNotificationStore();
    private final CampaignService campaigns = new CampaignService(identity, new FakeOrderPort(), new FakeProductPort(),
            segments, new InMemoryCampaignStore(), new InMemoryCampaignProductTargetStore(), notifications, surveys);
    private UUID segmentId;
    private CustomerView customer;

    @BeforeEach
    void setUp() {
        identity.seedStaff(ADMIN, StaffDepartment.SALES);
        customer = identity.seedCustomer("An", "male", LocalDate.of(1998, 5, 12), CustomerStatus.ACTIVE);
        segmentId = UUID.randomUUID();
        Instant at = Instant.now();
        segments.save(new CustomerSegment(segmentId, "VIP",
                        new SegmentRule(null, null, null, null, null, null, null, null, null), at),
                List.of(new SegmentMember(segmentId, customer.id(), at)));
    }

    private UUID survey(String status, boolean withQuestion) {
        UUID id = UUID.randomUUID();
        surveys.save(new Survey(id, ADMIN, "Hài lòng?", null, status, Instant.now()), withQuestion
                ? List.of(new SurveyQuestion(UUID.randomUUID(), id, "Chấm điểm", SurveyQuestion.RATING, List.of(), 1))
                : List.of());
        return id;
    }

    private void send(UUID surveyId, Instant startAt) {
        campaigns.send(ADMIN, "Khảo sát", List.of(segmentId), "Mời bạn góp ý", surveyId, startAt, null, null, null);
    }

    @Test
    void anUnknownOrEmptySurveyCannotBeSent() {
        assertThatThrownBy(() -> send(UUID.randomUUID(), null)).isInstanceOf(SurveyNotFoundException.class);
        UUID empty = survey(Survey.DRAFT, false);
        assertThatThrownBy(() -> send(empty, null))
                .isInstanceOf(InvalidCampaignException.class)
                .hasMessageContaining("chưa có câu hỏi");
        assertThat(notifications.findByUser(customer.id())).isEmpty();
    }

    @Test
    void aSurveyArchivedBeforeTheScheduledTimeIsNotDelivered() {
        UUID surveyId = survey(Survey.SENT, true);
        send(surveyId, Instant.now().plus(1, ChronoUnit.SECONDS));
        surveys.save(new Survey(surveyId, ADMIN, "Hài lòng?", null, Survey.CLOSED, Instant.now()), surveys.questionsOf(surveyId));

        try {
            Thread.sleep(1100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        campaigns.dispatchDue();

        assertThat(notifications.findByUser(customer.id())).isEmpty();
    }
}
