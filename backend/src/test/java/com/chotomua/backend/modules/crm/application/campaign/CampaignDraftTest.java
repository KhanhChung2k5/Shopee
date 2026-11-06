package com.chotomua.backend.modules.crm.application.campaign;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.chotomua.backend.modules.crm.adapter.fake.FakeIdentityPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeOrderPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeProductPort;
import com.chotomua.backend.modules.crm.application.exception.CampaignNotFoundException;
import com.chotomua.backend.modules.crm.application.exception.CrmForbiddenException;
import com.chotomua.backend.modules.crm.application.exception.InvalidCampaignException;
import com.chotomua.backend.modules.crm.application.notification.InMemoryNotificationStore;
import com.chotomua.backend.modules.crm.application.segment.InMemorySegmentStore;
import com.chotomua.backend.modules.crm.application.survey.InMemorySurveyStore;
import com.chotomua.backend.modules.crm.domain.segment.CustomerSegment;
import com.chotomua.backend.modules.crm.domain.segment.SegmentMember;
import com.chotomua.backend.modules.crm.domain.segment.SegmentRule;
import com.chotomua.backend.modules.crm.port.dto.CustomerStatus;
import com.chotomua.backend.modules.crm.port.dto.CustomerView;
import com.chotomua.backend.modules.crm.port.dto.StaffDepartment;
import com.chotomua.backend.modules.crm.web.dto.CampaignResponse;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** A draft campaign reaches no customer until it is sent; sending it honours a planned time still ahead. */
class CampaignDraftTest {

    private static final UUID SALES = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private final FakeIdentityPort identity = new FakeIdentityPort();
    private final InMemorySegmentStore segments = new InMemorySegmentStore();
    private final InMemoryNotificationStore notifications = new InMemoryNotificationStore();
    private final InMemoryCampaignStore store = new InMemoryCampaignStore();
    private final CampaignService campaigns = new CampaignService(identity, new FakeOrderPort(), new FakeProductPort(),
            segments, store, new InMemoryCampaignProductTargetStore(), notifications, new InMemorySurveyStore());
    private UUID segmentId;
    private CustomerView customer;

    @BeforeEach
    void setUp() {
        identity.seedStaff(SALES, StaffDepartment.SALES);
        customer = identity.seedCustomer("An", "male", LocalDate.of(1998, 5, 12), CustomerStatus.ACTIVE);
        segmentId = UUID.randomUUID();
        Instant at = Instant.now();
        segments.save(new CustomerSegment(segmentId, "VIP",
                        new SegmentRule(null, null, null, null, null, null, null, null, null), at),
                List.of(new SegmentMember(segmentId, customer.id(), at)));
    }

    @Test
    void aDraftKeepsItsContentButReachesNobody() {
        CampaignResponse draft = campaigns.saveDraft(SALES, "Ưu đãi", List.of(segmentId), "Giảm 10%", null);

        assertThat(draft.deliveryStatus()).isEqualTo(CampaignService.DELIVERY_DRAFT);
        assertThat(draft.content()).isEqualTo("Giảm 10%");
        assertThat(draft.sentCount()).isZero();
        assertThat(campaigns.list(SALES).campaigns()).extracting(CampaignResponse::deliveryStatus).containsExactly("draft");
        assertThat(campaigns.inbox(customer.id(), null).notifications()).isEmpty();
        assertThat(campaigns.inbox(SALES, null).notifications()).isEmpty();
    }

    @Test
    void editingADraftChangesItsTextScheduleAndSegments() {
        UUID id = campaigns.saveDraft(SALES, "Ưu đãi", List.of(), "Bản cũ", null).id();
        Instant later = Instant.now().plus(2, ChronoUnit.DAYS);

        CampaignResponse edited = campaigns.update(SALES, id, "Ưu đãi cuối tuần", "Bản mới", later, List.of(segmentId));

        assertThat(edited.name()).isEqualTo("Ưu đãi cuối tuần");
        assertThat(edited.content()).isEqualTo("Bản mới");
        assertThat(edited.startAt()).isEqualTo(later);
        assertThat(edited.segmentIds()).containsExactly(segmentId);
        assertThat(edited.deliveryStatus()).isEqualTo("draft");
    }

    @Test
    void sendingADraftDeliversItAndRemovesTheDraft() {
        UUID id = campaigns.saveDraft(SALES, "Ưu đãi", List.of(segmentId), "Giảm 10%", null).id();

        CampaignResponse sent = campaigns.sendDraft(SALES, id);

        assertThat(sent.deliveryStatus()).isEqualTo(CampaignService.DELIVERY_SENT);
        assertThat(sent.sentCount()).isEqualTo(1);
        assertThat(campaigns.inbox(customer.id(), null).notifications()).hasSize(1);
        assertThatThrownBy(() -> campaigns.get(SALES, id)).isInstanceOf(CampaignNotFoundException.class);
        assertThat(campaigns.list(SALES).campaigns()).hasSize(1);
    }

    @Test
    void aDraftWithAFutureTimeIsScheduledWhenSent() {
        Instant later = Instant.now().plus(1, ChronoUnit.DAYS);
        UUID id = campaigns.saveDraft(SALES, "Ưu đãi", List.of(segmentId), "Giảm 10%", later).id();

        CampaignResponse sent = campaigns.sendDraft(SALES, id);

        assertThat(sent.deliveryStatus()).isEqualTo(CampaignService.DELIVERY_SCHEDULED);
        assertThat(campaigns.inbox(customer.id(), null).notifications()).isEmpty();
    }

    @Test
    void aDraftWithoutAudienceCannotBeSentAndAnotherDepartmentCannotDraft() {
        UUID id = campaigns.saveDraft(SALES, "Ưu đãi", List.of(), "Giảm 10%", null).id();
        assertThatThrownBy(() -> campaigns.sendDraft(SALES, id)).isInstanceOf(InvalidCampaignException.class);

        UUID cs = UUID.randomUUID();
        identity.seedStaff(cs, StaffDepartment.CS);
        assertThatThrownBy(() -> campaigns.saveDraft(cs, "X", List.of(), "Y", null)).isInstanceOf(CrmForbiddenException.class);
    }

    @Test
    void anAlreadySentCampaignIsNotADraft() {
        UUID id = campaigns.send(SALES, "Gửi luôn", List.of(segmentId), "Nội dung", null, null, null, null, null).id();
        assertThatThrownBy(() -> campaigns.sendDraft(SALES, id))
                .isInstanceOf(InvalidCampaignException.class)
                .hasMessageContaining("không phải bản nháp");
    }
}
