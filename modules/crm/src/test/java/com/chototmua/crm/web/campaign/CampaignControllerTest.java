package com.chototmua.crm.web.campaign;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
import com.chototmua.crm.adapter.fake.FakeProductPort;
import com.chototmua.crm.application.campaign.InMemoryCampaignProductTargetStore;
import com.chototmua.crm.application.campaign.InMemoryCampaignStore;
import com.chototmua.crm.application.notification.InMemoryNotificationStore;
import com.chototmua.crm.application.segment.InMemorySegmentStore;
import com.chototmua.crm.domain.segment.CustomerSegment;
import com.chototmua.crm.domain.segment.SegmentMember;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.port.dto.ProductView;
import com.chototmua.crm.port.dto.StaffDepartment;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Chiến dịch in-app: lọc khách khóa/đã xóa, khách đọc hộp thư, không SMTP.
 */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class CampaignControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final String ACTIVE_ID = "aaaa1111-1111-1111-1111-111111111111";
    private static final String OTHER_ID = "bbbb2222-2222-2222-2222-222222222222";
    private static final UUID PRODUCT_DUALSENSE = UUID.fromString("02020202-0000-0000-0000-000000000001");
    private static final UUID CATEGORY_PAD = UUID.fromString("01010101-0000-0000-0000-000000000001");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private InMemorySegmentStore segments;

    @Autowired
    private InMemoryCampaignStore campaigns;

    @Autowired
    private InMemoryNotificationStore notifications;

    @Autowired
    private FakeOrderPort orders;

    @Autowired
    private FakeProductPort products;

    @Autowired
    private InMemoryCampaignProductTargetStore productTargets;

    private UUID segmentId;

    @BeforeEach
    void setUp() {
        identity.reset();
        segments.clear();
        campaigns.clear();
        notifications.clear();
        orders.reset();
        products.reset();
        productTargets.clear();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(CS_ID), StaffDepartment.CS);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
        products.seed(new ProductView(
                PRODUCT_DUALSENSE, "Tay cầm DualSense", "Sony", "controller",
                CATEGORY_PAD, "Tay cầm", null, List.of("PS5"),
                new BigDecimal("1890000"), "published"));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void sendSkipsLockedAndDeletedEvenWhenTheyRemainSegmentMembers() throws Exception {
        LocalDate young = LocalDate.now().minusYears(20);
        CustomerView active = identity.seedCustomer(
                UUID.fromString(ACTIVE_ID), "An", "an@seed.local", "0901111111", "male", young, CustomerStatus.ACTIVE);
        CustomerView soonLocked = identity.seedCustomer(
                "Sap Khoa", "female", young, CustomerStatus.ACTIVE);
        CustomerView locked = identity.seedCustomer("Khoa", "male", young, CustomerStatus.LOCKED);
        CustomerView deleted = identity.seedCustomer("Xoa", "female", young, CustomerStatus.DELETED);
        segmentId = createAgeSegment();
        identity.lock(soonLocked.id());
        keepStaleMembers(segmentId, locked.id(), deleted.id());

        mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(campaignBody(segmentId, null, "Ưu đãi trong app")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.channel").value("in_app"))
                .andExpect(jsonPath("$.referenceType").value("campaign"))
                .andExpect(jsonPath("$.sentCount").value(1))
                .andExpect(jsonPath("$.skipped", hasSize(3)))
                .andExpect(jsonPath("$.skipped[?(@.fullName=='An')]", hasSize(0)))
                .andExpect(jsonPath("$.skipped[?(@.status=='locked')]", hasSize(2)))
                .andExpect(jsonPath("$.skipped[?(@.status=='deleted')]", hasSize(1)));

        mockMvc.perform(get("/api/notifications").param("userId", active.id().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)))
                .andExpect(jsonPath("$.notifications[0].content").value("Ưu đãi trong app"))
                .andExpect(jsonPath("$.notifications[0].referenceType").value("campaign"))
                .andExpect(jsonPath("$.notifications[0].channel").value("in_app"));
    }

    @Test
    @WithMockUser(username = ACTIVE_ID, authorities = "customer")
    void customerReadsOnlyTheirOwnInbox() throws Exception {
        notifications.append(List.of(new com.chototmua.crm.domain.notification.AppNotification(
                UUID.randomUUID(),
                UUID.fromString(ACTIVE_ID),
                "campaign",
                UUID.randomUUID(),
                "in_app",
                "Chào An",
                "sent",
                Instant.parse("2026-09-24T03:00:00Z"))));
        notifications.append(List.of(new com.chototmua.crm.domain.notification.AppNotification(
                UUID.randomUUID(),
                UUID.fromString(OTHER_ID),
                "campaign",
                UUID.randomUUID(),
                "in_app",
                "Không phải của An",
                "sent",
                Instant.parse("2026-09-24T03:00:00Z"))));

        mockMvc.perform(get("/api/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)))
                .andExpect(jsonPath("$.notifications[0].content").value("Chào An"))
                .andExpect(jsonPath("$.notifications[0].userId").value(ACTIVE_ID));
    }

    @Test
    void customerLoginReadsOwnInboxAndCannotOpenStaffList() throws Exception {
        notifications.append(List.of(new com.chototmua.crm.domain.notification.AppNotification(
                UUID.randomUUID(),
                UUID.fromString(OTHER_ID),
                "survey",
                UUID.randomUUID(),
                "in_app",
                "Khảo sát cho Bình",
                "sent",
                Instant.parse("2026-09-24T04:00:00Z"))));

        mockMvc.perform(get("/api/notifications").with(httpBasic("binh", "binh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)))
                .andExpect(jsonPath("$.notifications[0].content").value("Khảo sát cho Bình"))
                .andExpect(jsonPath("$.notifications[0].referenceType").value("survey"))
                .andExpect(jsonPath("$.notifications[0].userId").value(OTHER_ID));

        mockMvc.perform(get("/api/customers").with(httpBasic("binh", "binh")))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerMarksOwnLetterReadAndCannotOpenSomeoneElse() throws Exception {
        UUID ownId = UUID.fromString("0a0a0a0a-0000-4000-8000-000000000001");
        UUID otherId = UUID.fromString("0a0a0a0a-0000-4000-8000-000000000002");
        notifications.append(List.of(new com.chototmua.crm.domain.notification.AppNotification(
                ownId,
                UUID.fromString(OTHER_ID),
                "campaign",
                UUID.randomUUID(),
                "in_app",
                "Ưu đãi cho Bình",
                "sent",
                Instant.parse("2026-09-24T04:00:00Z"))));
        notifications.append(List.of(new com.chototmua.crm.domain.notification.AppNotification(
                otherId,
                UUID.fromString(ACTIVE_ID),
                "campaign",
                UUID.randomUUID(),
                "in_app",
                "Ưu đãi cho An",
                "sent",
                Instant.parse("2026-09-24T04:00:00Z"))));

        mockMvc.perform(post("/api/notifications/" + ownId + "/read").with(httpBasic("binh", "binh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(ownId.toString()))
                .andExpect(jsonPath("$.status").value("read"));

        mockMvc.perform(post("/api/notifications/" + ownId + "/read").with(httpBasic("binh", "binh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("read"));

        mockMvc.perform(post("/api/notifications/" + otherId + "/read").with(httpBasic("binh", "binh")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("người khác")));

        mockMvc.perform(get("/api/notifications").with(httpBasic("binh", "binh")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications[0].status").value("read"));
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "cs")
    void surveySendUsesSurveyReferenceAndSkipsMail() throws Exception {
        LocalDate young = LocalDate.now().minusYears(20);
        identity.seedCustomer(
                UUID.fromString(ACTIVE_ID), "An", "an@seed.local", "0901111111", "male", young, CustomerStatus.ACTIVE);
        segmentId = createAgeSegment();
        String surveyId = "99999999-9999-9999-9999-999999999999";

        MvcResult created = mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(campaignBody(segmentId, surveyId, "Bạn có 1 khảo sát mới")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.referenceType").value("survey"))
                .andExpect(jsonPath("$.referenceId").value(surveyId))
                .andExpect(jsonPath("$.channel").value("in_app"))
                .andExpect(jsonPath("$.sentCount").value(1))
                .andReturn();

        String campaignId = created.getResponse().getContentAsString()
                .replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");
        mockMvc.perform(get("/api/campaigns/" + campaignId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.referenceType").value("survey"))
                .andExpect(jsonPath("$.sentCount").value(1));

        mockMvc.perform(get("/api/notifications").param("userId", ACTIVE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications[0].referenceType").value("survey"))
                .andExpect(jsonPath("$.notifications[0].referenceId").value(surveyId));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void renameAndDeleteUpdatesTheCustomerInbox() throws Exception {
        LocalDate young = LocalDate.now().minusYears(20);
        identity.seedCustomer(
                UUID.fromString(ACTIVE_ID), "An", "an@seed.local", "0901111111", "male", young, CustomerStatus.ACTIVE);
        segmentId = createAgeSegment();
        MvcResult created = mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(campaignBody(segmentId, null, "Bản nháp")))
                .andExpect(status().isCreated())
                .andReturn();
        String campaignId = created.getResponse().getContentAsString()
                .replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");

        mockMvc.perform(put("/api/campaigns/" + campaignId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Tên đã sửa","content":"Nội dung đã sửa"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Tên đã sửa"))
                .andExpect(jsonPath("$.content").value("Nội dung đã sửa"))
                .andExpect(jsonPath("$.sentCount").value(1));

        mockMvc.perform(get("/api/notifications").param("userId", ACTIVE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications[0].content").value("Nội dung đã sửa"));

        mockMvc.perform(delete("/api/campaigns/" + campaignId))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/campaigns/" + campaignId))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/notifications").param("userId", ACTIVE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(0)));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void futureScheduleStaysOutOfTheInboxUntilDue() throws Exception {
        LocalDate young = LocalDate.now().minusYears(20);
        identity.seedCustomer(
                UUID.fromString(ACTIVE_ID), "An", "an@seed.local", "0901111111", "male", young, CustomerStatus.ACTIVE);
        segmentId = createAgeSegment();
        Instant later = Instant.now().plus(2, ChronoUnit.HOURS);

        mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(campaignBody(segmentId, null, "Hẹn giờ")
                                .replace("}", ",\"startAt\":\"" + later + "\"}")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.deliveryStatus").value("scheduled"))
                .andExpect(jsonPath("$.sentCount").value(0));

        mockMvc.perform(get("/api/notifications").param("userId", ACTIVE_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(0)));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void recipientListShowsTenThenTheRest() throws Exception {
        LocalDate young = LocalDate.now().minusYears(20);
        for (int index = 1; index <= 11; index++) {
            identity.seedCustomer("Khach " + index, "male", young, CustomerStatus.ACTIVE);
        }
        segmentId = createAgeSegment();
        MvcResult created = mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(campaignBody(segmentId, null, "Danh sach")))
                .andExpect(status().isCreated())
                .andReturn();
        String campaignId = created.getResponse().getContentAsString()
                .replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");

        mockMvc.perform(get("/api/campaigns/" + campaignId + "/recipients").param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(11))
                .andExpect(jsonPath("$.recipients", hasSize(10)));
        mockMvc.perform(get("/api/campaigns/" + campaignId + "/recipients")
                        .param("offset", "10")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recipients", hasSize(1)));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void sendUnionsSegmentMembersAndProductBuyers() throws Exception {
        LocalDate young = LocalDate.now().minusYears(20);
        LocalDate older = LocalDate.now().minusYears(40);
        CustomerView inSegment = identity.seedCustomer(
                UUID.fromString(ACTIVE_ID), "An", "an@seed.local", "0901111111", "male", young, CustomerStatus.ACTIVE);
        CustomerView buyer = identity.seedCustomer(
                UUID.fromString(OTHER_ID), "Binh", "binh@seed.local", "0902222222", "female", older, CustomerStatus.ACTIVE);
        CustomerView lockedBuyer = identity.seedCustomer("Khoa", "male", older, CustomerStatus.LOCKED);
        segmentId = createAgeSegment();
        seedDelivered(buyer.id());
        seedDelivered(lockedBuyer.id());

        mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Tay cầm","segmentIds":["%s"],"content":"Ưu đãi DualSense",
                                 "productIds":["02020202-0000-0000-0000-000000000001"]}
                                """.formatted(segmentId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sentCount").value(2))
                .andExpect(jsonPath("$.productIds[0]").value(PRODUCT_DUALSENSE.toString()))
                .andExpect(jsonPath("$.skipped", hasSize(1)))
                .andExpect(jsonPath("$.skipped[0].status").value("locked"));

        mockMvc.perform(get("/api/notifications").param("userId", inSegment.id().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)));
        mockMvc.perform(get("/api/notifications").param("userId", buyer.id().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)));
        mockMvc.perform(get("/api/notifications").param("userId", lockedBuyer.id().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(0)));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void sendWithProductTargetOnlyDoesNotRequireSegment() throws Exception {
        LocalDate young = LocalDate.now().minusYears(20);
        CustomerView buyer = identity.seedCustomer(
                UUID.fromString(ACTIVE_ID), "An", "an@seed.local", "0901111111", "male", young, CustomerStatus.ACTIVE);
        seedDelivered(buyer.id());

        mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Người đã mua","segmentIds":[],"content":"Cảm ơn",
                                 "productIds":["02020202-0000-0000-0000-000000000001"]}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sentCount").value(1))
                .andExpect(jsonPath("$.segmentIds", hasSize(0)));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void sendWithoutSegmentOrProductIsRejected() throws Exception {
        mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Trống","segmentIds":[],"content":"Không ai"}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.message", containsString("phân khúc hoặc một sản phẩm")));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "sales")
    void salesStaffCannotSend() throws Exception {
        mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Sale","segmentIds":["aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],"content":"Không"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    private UUID createAgeSegment() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/segments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"18–24","ruleDefinition":{"preset":"age","bucket":"18–24"}}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        String id = result.getResponse().getContentAsString()
                .replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");
        return UUID.fromString(id);
    }

    private void keepStaleMembers(UUID currentSegmentId, UUID lockedId, UUID deletedId) {
        CustomerSegment segment = segments.find(currentSegmentId).orElseThrow();
        List<SegmentMember> members = new ArrayList<>(segments.membersOf(currentSegmentId));
        Instant now = Instant.now();
        members.add(new SegmentMember(currentSegmentId, lockedId, now));
        members.add(new SegmentMember(currentSegmentId, deletedId, now));
        segments.save(segment, members);
    }

    private static String campaignBody(UUID currentSegmentId, String surveyId, String content) {
        String surveyField = surveyId == null ? "" : ",\"surveyId\":\"" + surveyId + "\"";
        return """
                {"name":"Chăm sóc 18–24","segmentIds":["%s"],"content":"%s"%s}
                """.formatted(currentSegmentId, content, surveyField);
    }

    private void seedDelivered(UUID userId) {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                new BigDecimal("1890000"),
                Instant.parse("2026-09-01T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        PRODUCT_DUALSENSE, CATEGORY_PAD, "Tay cầm", new BigDecimal("1890000")))));
    }
}
