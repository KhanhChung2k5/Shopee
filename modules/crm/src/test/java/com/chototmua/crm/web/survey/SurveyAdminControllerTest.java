package com.chototmua.crm.web.survey;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.application.notification.InMemoryNotificationStore;
import com.chototmua.crm.application.segment.InMemorySegmentStore;
import com.chototmua.crm.application.survey.InMemorySurveyStore;
import com.chototmua.crm.domain.segment.CustomerSegment;
import com.chototmua.crm.domain.segment.SegmentMember;
import com.chototmua.crm.domain.segment.SegmentRule;
import com.chototmua.crm.port.dto.CustomerStatus;
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

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tạo khảo sát và câu hỏi. Chưa gửi. Quyền story 6: admin, crm, cs.
 */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class SurveyAdminControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String CRM_ID = "22222222-2222-2222-2222-222222222222";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final String GUEST_ID = "44444444-4444-4444-4444-444444444444";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private InMemorySurveyStore surveys;

    @Autowired
    private InMemorySegmentStore segments;

    @Autowired
    private InMemoryNotificationStore notifications;

    @BeforeEach
    void setUp() {
        identity.reset();
        surveys.clear();
        segments.clear();
        notifications.clear();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(CRM_ID), StaffDepartment.CRM);
        identity.seedStaff(UUID.fromString(CS_ID), StaffDepartment.CS);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void adminCreatesSurveyWithTextAndChoiceQuestions() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Khảo sát sau mua","description":"Hai câu demo"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("draft"))
                .andExpect(jsonPath("$.title").value("Khảo sát sau mua"))
                .andExpect(jsonPath("$.questions", hasSize(0)))
                .andReturn();

        String surveyId = created.getResponse().getContentAsString()
                .replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");

        mockMvc.perform(post("/api/surveys/" + surveyId + "/questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionText":"Bạn muốn shop cải thiện điều gì?","answerType":"text"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questions", hasSize(1)))
                .andExpect(jsonPath("$.questions[0].answerType").value("text"))
                .andExpect(jsonPath("$.questions[0].sortOrder").value(1));

        mockMvc.perform(post("/api/surveys/" + surveyId + "/questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionText":"Bạn thích dòng tay cầm nào?","answerType":"multiple_choice","options":["Xbox","PlayStation"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questions", hasSize(2)))
                .andExpect(jsonPath("$.questions[1].answerType").value("multiple_choice"))
                .andExpect(jsonPath("$.questions[1].questionText").value("Bạn thích dòng tay cầm nào?"))
                .andExpect(jsonPath("$.questions[1].options", hasSize(2)))
                .andExpect(jsonPath("$.questions[1].options[0]").value("Xbox"))
                .andExpect(jsonPath("$.questions[1].sortOrder").value(2));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void choiceWithoutOptionsIsRejected() throws Exception {
        String surveyId = createDraft();
        mockMvc.perform(post("/api/surveys/" + surveyId + "/questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionText":"Chọn một","answerType":"multiple_choice"}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("INVALID_SURVEY"))
                .andExpect(jsonPath("$.error.message", containsString("hai lựa chọn")));
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "cs")
    void customerServiceStaffCanCreateASurvey() throws Exception {
        mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"CSKH hỏi thăm"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("draft"));
    }

    @Test
    @WithMockUser(username = CRM_ID, authorities = "crm")
    void crmManagerCanListTheSurveyJustCreated() throws Exception {
        String surveyId = createDraft();
        mockMvc.perform(get("/api/surveys"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.surveys", hasSize(1)))
                .andExpect(jsonPath("$.surveys[0].title").value("Khảo sát sau mua"));
        mockMvc.perform(delete("/api/surveys/" + surveyId))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/surveys/" + surveyId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.message", containsString("khảo sát")));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void archiveKeepsQuestionsAndBlocksFurtherEdits() throws Exception {
        String surveyId = createDraft();
        mockMvc.perform(post("/api/surveys/" + surveyId + "/questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionText":"Bạn hài lòng chứ?","answerType":"text"}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/surveys/" + surveyId + "/archive"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("closed"))
                .andExpect(jsonPath("$.questions", hasSize(1)))
                .andExpect(jsonPath("$.questions[0].questionText").value("Bạn hài lòng chứ?"));

        mockMvc.perform(post("/api/surveys/" + surveyId + "/questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionText":"Câu thêm sau khi lưu trữ","answerType":"text"}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.message", containsString("bản nháp")));

        mockMvc.perform(delete("/api/surveys/" + surveyId))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.message", containsString("lưu trữ")));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void sendPutsSurveyInActiveCustomerInboxWithoutCampaign() throws Exception {
        String surveyId = createDraft();
        UUID activeId = UUID.fromString("aaaa1111-1111-1111-1111-111111111111");
        UUID lockedId = UUID.fromString("bbbb2222-2222-2222-2222-222222222222");
        UUID segmentId = UUID.fromString("cccc3333-3333-3333-3333-333333333333");
        identity.seedCustomer(activeId, "Trần Thị Bình", "binh@seed.local", "0901000001", "female",
                LocalDate.of(2002, 1, 1), CustomerStatus.ACTIVE);
        identity.seedCustomer(lockedId, "Khách khóa", "locked@seed.local", "0901000002", "male",
                LocalDate.of(1990, 1, 1), CustomerStatus.LOCKED);
        segments.save(
                new CustomerSegment(segmentId, "18–24", new SegmentRule(
                        null, null, null, null, null, null, null, null, null), Instant.parse("2026-01-01T00:00:00Z")),
                List.of(
                        new SegmentMember(segmentId, activeId, Instant.parse("2026-01-01T00:00:00Z")),
                        new SegmentMember(segmentId, lockedId, Instant.parse("2026-01-01T00:00:00Z"))));

        mockMvc.perform(post("/api/surveys/" + surveyId + "/inbox")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"segmentIds":["cccc3333-3333-3333-3333-333333333333"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.survey.status").value("sent"))
                .andExpect(jsonPath("$.sentCount").value(1))
                .andExpect(jsonPath("$.skipped", hasSize(1)));

        mockMvc.perform(get("/api/notifications").param("userId", activeId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)))
                .andExpect(jsonPath("$.notifications[0].referenceType").value("survey"))
                .andExpect(jsonPath("$.notifications[0].referenceId").value(surveyId));

        mockMvc.perform(get("/api/campaigns"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.campaigns", hasSize(0)));

        mockMvc.perform(delete("/api/surveys/" + surveyId))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/surveys/" + surveyId))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/notifications").param("userId", activeId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(0)));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void keepsChosenAudienceAndDescriptionAfterSend() throws Exception {
        String surveyId = createDraft();
        UUID segmentId = UUID.fromString("cccc3333-3333-3333-3333-333333333333");
        identity.seedCustomer(UUID.fromString("aaaa1111-1111-1111-1111-111111111111"), "Trần Thị Bình",
                "binh@seed.local", "0901000001", "female", LocalDate.of(2002, 1, 1), CustomerStatus.ACTIVE);
        segments.save(
                new CustomerSegment(segmentId, "18–24", new SegmentRule(
                        null, null, null, null, null, null, null, null, null), Instant.parse("2026-01-01T00:00:00Z")),
                List.of(new SegmentMember(segmentId, UUID.fromString("aaaa1111-1111-1111-1111-111111111111"),
                        Instant.parse("2026-01-01T00:00:00Z"))));

        mockMvc.perform(put("/api/surveys/" + surveyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Khảo sát sau mua","description":"Ghi chú nội bộ","segmentIds":["cccc3333-3333-3333-3333-333333333333"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("draft"))
                .andExpect(jsonPath("$.description").value("Ghi chú nội bộ"))
                .andExpect(jsonPath("$.segmentIds", hasSize(1)))
                .andExpect(jsonPath("$.segmentIds[0]").value(segmentId.toString()));

        mockMvc.perform(post("/api/surveys/" + surveyId + "/inbox")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"segmentIds":["cccc3333-3333-3333-3333-333333333333"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.survey.status").value("sent"))
                .andExpect(jsonPath("$.survey.segmentIds[0]").value(segmentId.toString()));

        mockMvc.perform(put("/api/surveys/" + surveyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Khảo sát sau mua","description":"Đã sửa sau khi gửi","segmentIds":["cccc3333-3333-3333-3333-333333333333"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("sent"))
                .andExpect(jsonPath("$.description").value("Đã sửa sau khi gửi"))
                .andExpect(jsonPath("$.segmentIds[0]").value(segmentId.toString()));

        mockMvc.perform(get("/api/surveys/" + surveyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.description").value("Đã sửa sau khi gửi"))
                .andExpect(jsonPath("$.segmentIds[0]").value(segmentId.toString()));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void saveRewritesInboxLetterAndResendKeepsASingleNotice() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Khảo sát sau mua","description":"Lần đầu"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        String surveyId = created.getResponse().getContentAsString()
                .replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");
        UUID activeId = UUID.fromString("aaaa1111-1111-1111-1111-111111111111");
        UUID segmentId = UUID.fromString("cccc3333-3333-3333-3333-333333333333");
        identity.seedCustomer(activeId, "Trần Thị Bình", "binh@seed.local", "0901000001", "female",
                LocalDate.of(2002, 1, 1), CustomerStatus.ACTIVE);
        segments.save(
                new CustomerSegment(segmentId, "18–24", new SegmentRule(
                        null, null, null, null, null, null, null, null, null), Instant.parse("2026-01-01T00:00:00Z")),
                List.of(new SegmentMember(segmentId, activeId, Instant.parse("2026-01-01T00:00:00Z"))));

        mockMvc.perform(post("/api/surveys/" + surveyId + "/inbox")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"segmentIds":["cccc3333-3333-3333-3333-333333333333"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sentCount").value(1));

        MvcResult firstInbox = mockMvc.perform(get("/api/notifications").param("userId", activeId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)))
                .andExpect(jsonPath("$.notifications[0].content").value("Khảo sát sau mua — Lần đầu"))
                .andReturn();
        String noticeId = firstInbox.getResponse().getContentAsString()
                .replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");

        mockMvc.perform(put("/api/surveys/" + surveyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Khảo sát sau mua","description":"Lần sửa","segmentIds":["cccc3333-3333-3333-3333-333333333333"]}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/notifications").param("userId", activeId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)))
                .andExpect(jsonPath("$.notifications[0].id").value(noticeId))
                .andExpect(jsonPath("$.notifications[0].content").value("Khảo sát sau mua — Lần sửa"));

        mockMvc.perform(post("/api/surveys/" + surveyId + "/inbox")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"segmentIds":["cccc3333-3333-3333-3333-333333333333"]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sentCount").value(1));

        mockMvc.perform(get("/api/notifications").param("userId", activeId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)))
                .andExpect(jsonPath("$.notifications[0].id").value(noticeId))
                .andExpect(jsonPath("$.notifications[0].content").value("Khảo sát sau mua — Lần sửa"));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "sales")
    void salesStaffIsForbidden() throws Exception {
        mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Không được"}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    @Test
    @WithMockUser(username = GUEST_ID, authorities = "customer")
    void endCustomerIsForbidden() throws Exception {
        mockMvc.perform(get("/api/surveys"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    private String createDraft() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Khảo sát sau mua"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        return created.getResponse().getContentAsString()
                .replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");
    }
}
