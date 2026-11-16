package com.chototmua.crm.web.survey;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.application.campaign.InMemoryCampaignStore;
import com.chototmua.crm.application.notification.InMemoryNotificationStore;
import com.chototmua.crm.application.segment.InMemorySegmentStore;
import com.chototmua.crm.application.survey.InMemorySurveyStore;
import com.chototmua.crm.config.CrmDemoActors;
import com.chototmua.crm.domain.segment.CustomerSegment;
import com.chototmua.crm.domain.segment.SegmentMember;
import com.chototmua.crm.domain.segment.SegmentRule;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.StaffDepartment;
import com.jayway.jsonpath.JsonPath;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Gửi khảo sát qua campaign in-app, khách nộp, thống kê.
 * Khách khóa hoặc đã xóa không nhận thư. Không gọi SMTP.
 */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class SurveyParticipationControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final UUID AN_ID = CrmDemoActors.CUSTOMER_AN_ID;
    private static final UUID BINH_ID = CrmDemoActors.CUSTOMER_BINH_ID;
    private static final UUID LINH_ID = CrmDemoActors.CUSTOMER_LINH_ID;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private InMemorySurveyStore surveys;

    @Autowired
    private InMemorySegmentStore segments;

    @Autowired
    private InMemoryCampaignStore campaigns;

    @Autowired
    private InMemoryNotificationStore notifications;

    @BeforeEach
    void setUp() {
        identity.reset();
        surveys.clear();
        segments.clear();
        campaigns.clear();
        notifications.clear();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(CS_ID), StaffDepartment.CS);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void lockedAndDeletedAreLeftOutOfTheSurveyAudience() throws Exception {
        identity.seedCustomer(AN_ID, "An", "an@seed.local", "0901111111", "male",
                LocalDate.of(2004, 3, 1), CustomerStatus.ACTIVE);
        UUID lockedId = UUID.fromString("cccc3333-3333-3333-3333-333333333331");
        UUID deletedId = UUID.fromString("dddd4444-4444-4444-4444-444444444441");
        identity.seedCustomer(lockedId, "Khách khóa", "locked@seed.local", "0901000002", "male",
                LocalDate.of(1990, 1, 1), CustomerStatus.LOCKED);
        identity.seedCustomer(deletedId, "Khách xóa", "deleted@seed.local", "0901000003", "female",
                LocalDate.of(1992, 1, 1), CustomerStatus.DELETED);
        UUID segmentId = segmentOf(AN_ID, lockedId, deletedId);
        String surveyId = createSurveyWithQuestion("Bạn thấy giao hàng thế nào?");

        mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(campaignBody(segmentId, surveyId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.channel").value("in_app"))
                .andExpect(jsonPath("$.referenceType").value("survey"))
                .andExpect(jsonPath("$.referenceId").value(surveyId))
                .andExpect(jsonPath("$.sentCount").value(1))
                .andExpect(jsonPath("$.skipped", hasSize(2)))
                .andExpect(jsonPath("$.skipped[?(@.status=='locked')]", hasSize(1)))
                .andExpect(jsonPath("$.skipped[?(@.status=='deleted')]", hasSize(1)));

        mockMvc.perform(get("/api/surveys/" + surveyId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("sent"));

        mockMvc.perform(get("/api/notifications").param("userId", AN_ID.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(1)))
                .andExpect(jsonPath("$.notifications[0].referenceType").value("survey"))
                .andExpect(jsonPath("$.notifications[0].channel").value("in_app"));
        mockMvc.perform(get("/api/notifications").param("userId", lockedId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(0)));
        mockMvc.perform(get("/api/notifications").param("userId", deletedId.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notifications", hasSize(0)));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void oneOfTwoInvitationsSubmittedIsFiftyPercentWithoutMail() throws Exception {
        identity.seedCustomer(AN_ID, "An", "an@seed.local", "0901111111", "male",
                LocalDate.of(2004, 3, 1), CustomerStatus.ACTIVE);
        identity.seedCustomer(BINH_ID, "Bình", "binh@seed.local", "0902222222", "female",
                LocalDate.of(2003, 5, 2), CustomerStatus.ACTIVE);
        identity.seedCustomer(LINH_ID, "Linh", "linh@seed.local", "0903333333", "female",
                LocalDate.of(2001, 8, 8), CustomerStatus.ACTIVE);
        UUID segmentId = segmentOf(AN_ID, BINH_ID);
        CreatedSurvey survey = createSurvey("Sau giao hàng");

        mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(campaignBody(segmentId, survey.id())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.channel").value("in_app"))
                .andExpect(jsonPath("$.sentCount").value(2))
                .andExpect(jsonPath("$.skipped", hasSize(0)));

        String body = """
                {"answers":[{"questionId":"%s","answerText":"Giao nhanh"}]}
                """.formatted(survey.questionId());

        mockMvc.perform(get("/api/surveys/" + survey.id() + "/sheet"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/surveys/" + survey.id() + "/sheet").with(httpBasic("an", "an")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitted").value(false))
                .andExpect(jsonPath("$.questions", hasSize(1)))
                .andExpect(jsonPath("$.questions[0].questionText").value("Sau giao hàng"));

        mockMvc.perform(get("/api/surveys/" + survey.id() + "/sheet").with(httpBasic("linh", "linh")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.message", containsString("không nằm trong danh sách")));

        mockMvc.perform(post("/api/surveys/" + survey.id() + "/responses")
                        .with(httpBasic("linh", "linh"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.message", containsString("không nằm trong danh sách")));

        mockMvc.perform(post("/api/surveys/" + survey.id() + "/responses")
                        .with(httpBasic("an", "an"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.surveyId").value(survey.id()))
                .andExpect(jsonPath("$.userId").value(AN_ID.toString()));

        mockMvc.perform(post("/api/surveys/" + survey.id() + "/responses")
                        .with(httpBasic("an", "an"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.message", containsString("đã gửi")));

        mockMvc.perform(get("/api/surveys/" + survey.id() + "/sheet").with(httpBasic("an", "an")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitted").value(true))
                .andExpect(jsonPath("$.answers[0].answerText").value("Giao nhanh"));

        mockMvc.perform(get("/api/surveys/" + survey.id() + "/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invitedCount").value(2))
                .andExpect(jsonPath("$.submittedCount").value(1))
                .andExpect(jsonPath("$.completionPercent").value(50))
                .andExpect(jsonPath("$.questions", hasSize(1)))
                .andExpect(jsonPath("$.questions[0].answerCount").value(1))
                .andExpect(jsonPath("$.questions[0].texts[0]").value("Giao nhanh"));

        mockMvc.perform(get("/api/surveys/" + survey.id() + "/stats").with(httpBasic("cs", "cs")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completionPercent").value(50));

        mockMvc.perform(get("/api/surveys/" + survey.id() + "/stats").with(httpBasic("an", "an")))
                .andExpect(status().isForbidden());

        assertThrows(ClassNotFoundException.class,
                () -> Class.forName("org.springframework.mail.javamail.JavaMailSender"));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "sales")
    void salesCannotReadStats() throws Exception {
        mockMvc.perform(get("/api/surveys/" + UUID.randomUUID() + "/stats"))
                .andExpect(status().isForbidden());
    }

    private UUID segmentOf(UUID... userIds) {
        UUID segmentId = UUID.randomUUID();
        Instant added = Instant.parse("2026-09-01T00:00:00Z");
        List<SegmentMember> members = java.util.Arrays.stream(userIds)
                .map(userId -> new SegmentMember(segmentId, userId, added))
                .toList();
        segments.save(new CustomerSegment(
                segmentId,
                "Nhóm gửi khảo sát",
                new SegmentRule(null, null, null, null, null, null, null, null, null),
                added), members);
        return segmentId;
    }

    private String createSurveyWithQuestion(String questionText) throws Exception {
        return createSurvey(questionText).id();
    }

    private CreatedSurvey createSurvey(String questionText) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Hài lòng sau mua","description":"Một câu"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        String surveyId = JsonPath.read(created.getResponse().getContentAsString(), "$.id");
        MvcResult withQuestion = mockMvc.perform(post("/api/surveys/" + surveyId + "/questions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"questionText":"%s","answerType":"text"}
                                """.formatted(questionText)))
                .andExpect(status().isOk())
                .andReturn();
        String questionId = JsonPath.read(withQuestion.getResponse().getContentAsString(), "$.questions[0].id");
        return new CreatedSurvey(surveyId, questionId);
    }

    private static String campaignBody(UUID segmentId, String surveyId) {
        return """
                {"name":"Gửi khảo sát","segmentIds":["%s"],"content":"Bạn có 1 khảo sát mới","surveyId":"%s"}
                """.formatted(segmentId, surveyId);
    }

    private record CreatedSurvey(String id, String questionId) {
    }
}
