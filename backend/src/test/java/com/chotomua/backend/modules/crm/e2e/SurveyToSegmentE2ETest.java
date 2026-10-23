package com.chotomua.backend.modules.crm.e2e;

import com.chotomua.backend.BackendApplication;
import com.chotomua.backend.modules.crm.adapter.fake.FakeIdentityPort;
import com.chotomua.backend.modules.crm.application.campaign.InMemoryCampaignStore;
import com.chotomua.backend.modules.crm.application.notification.InMemoryNotificationStore;
import com.chotomua.backend.modules.crm.application.segment.InMemorySegmentStore;
import com.chotomua.backend.modules.crm.application.survey.InMemorySurveyStore;
import com.chotomua.backend.modules.crm.port.dto.CustomerStatus;
import com.chotomua.backend.modules.crm.port.dto.CustomerView;
import com.chotomua.backend.modules.crm.port.dto.StaffDepartment;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * E2E p5-35 — create survey → send to a segment → customers answer → stats are right.
 * Sales builds the segment, CS builds and sends the survey, customers answer from their
 * notification inbox, and the statistics are checked number by number.
 */
@SpringBootTest(classes = BackendApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class SurveyToSegmentE2ETest {

    private static final UUID CS = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID SALES = UUID.fromString("55555555-5555-5555-5555-555555555555");

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

    private CustomerView an;
    private CustomerView binh;
    private CustomerView chau;
    private CustomerView dung;

    @BeforeEach
    void setUp() {
        identity.reset();
        surveys.clear();
        segments.clear();
        campaigns.clear();
        notifications.clear();
        identity.seedStaff(CS, StaffDepartment.CS);
        identity.seedStaff(SALES, StaffDepartment.SALES);
        LocalDate today = LocalDate.now();
        an = identity.seedCustomer("An", "male", today.minusYears(20), CustomerStatus.ACTIVE);
        binh = identity.seedCustomer("Bình", "female", today.minusYears(22), CustomerStatus.ACTIVE);
        chau = identity.seedCustomer("Châu", "female", today.minusYears(21), CustomerStatus.LOCKED);
        dung = identity.seedCustomer("Dũng", "male", today.minusYears(35), CustomerStatus.ACTIVE);
    }

    @Test
    void surveySentToSegmentIsAnsweredAndStatsMatchTheAnswers() throws Exception {
        // 1. Sales builds the "18–24" segment; CS may read it but not create one.
        mockMvc.perform(post("/api/segments").with(staff(CS, "DEPT_CS"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(segmentBody()))
                .andExpect(status().isForbidden());
        String segment = mockMvc.perform(post("/api/segments").with(staff(SALES, "DEPT_SALES"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(segmentBody()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String segmentId = JsonPath.read(segment, "$.id");
        List<String> memberIds = JsonPath.read(segment, "$.members[*].userId");
        // Only active 18–24s: Dũng is too old, Châu is locked and is left out of the segment itself.
        org.assertj.core.api.Assertions.assertThat(memberIds)
                .containsExactlyInAnyOrder(an.id().toString(), binh.id().toString());
        mockMvc.perform(get("/api/segments").with(staff(CS, "DEPT_CS")))
                .andExpect(status().isOk());

        // 2. CS creates a survey with one question of each answer type.
        String survey = mockMvc.perform(post("/api/surveys").with(staff(CS, "DEPT_CS"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Trải nghiệm giao hàng","description":"Mất 1 phút","segmentIds":[]}
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String surveyId = JsonPath.read(survey, "$.id");
        addQuestion(surveyId, """
                {"questionText":"Chấm điểm tốc độ giao hàng","answerType":"rating","options":[]}
                """);
        addQuestion(surveyId, """
                {"questionText":"Bạn biết shop qua đâu?","answerType":"multiple_choice","options":["Facebook","TikTok","Bạn bè"]}
                """);
        String withQuestions = addQuestion(surveyId, """
                {"questionText":"Góp ý thêm","answerType":"text","options":[]}
                """);
        List<String> questionIds = JsonPath.read(withQuestions, "$.questions[*].id");
        org.assertj.core.api.Assertions.assertThat(questionIds).hasSize(3);

        // 3. CS sends it to the segment: both members are invited, nobody skipped.
        mockMvc.perform(post("/api/surveys/" + surveyId + "/inbox").with(staff(CS, "DEPT_CS"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"segmentIds\":[\"%s\"]}".formatted(segmentId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sentCount").value(2))
                .andExpect(jsonPath("$.skipped", hasSize(0)))
                .andExpect(jsonPath("$.survey.status").value("sent"));

        // 4. Each invited customer finds the invitation in their notification inbox.
        for (CustomerView invited : List.of(an, binh)) {
            mockMvc.perform(get("/api/notifications").with(customer(invited)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.notifications", hasSize(1)))
                    .andExpect(jsonPath("$.notifications[0].referenceType").value("survey"))
                    .andExpect(jsonPath("$.notifications[0].referenceId").value(surveyId));
        }
        for (CustomerView outsider : List.of(chau, dung)) {
            mockMvc.perform(get("/api/notifications").with(customer(outsider)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.notifications", hasSize(0)));
        }

        // 5. Both invited customers answer; an outsider cannot even open the sheet.
        mockMvc.perform(get("/api/surveys/" + surveyId + "/sheet").with(customer(an)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitted").value(false))
                .andExpect(jsonPath("$.questions", hasSize(3)));
        submit(surveyId, an, questionIds, "5", "Facebook", "Giao rất nhanh");
        submit(surveyId, binh, questionIds, "4", "TikTok", "Đóng gói kỹ");
        mockMvc.perform(get("/api/surveys/" + surveyId + "/sheet").with(customer(an)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitted").value(true));
        mockMvc.perform(get("/api/surveys/" + surveyId + "/sheet").with(customer(dung)))
                .andExpect(status().isUnprocessableEntity());

        // 6. CS reads the stats: 2 invited, 2 answered, 100%, and per-question tallies.
        mockMvc.perform(get("/api/surveys/" + surveyId + "/stats").with(staff(SALES, "DEPT_SALES")))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/surveys/" + surveyId + "/stats").with(staff(CS, "DEPT_CS")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invitedCount").value(2))
                .andExpect(jsonPath("$.submittedCount").value(2))
                .andExpect(jsonPath("$.completionPercent").value(100))
                .andExpect(jsonPath("$.questions", hasSize(3)))
                .andExpect(jsonPath("$.questions[0].answerCount").value(2))
                .andExpect(jsonPath("$.questions[0].buckets[?(@.value=='5')].count").value(containsInAnyOrder(1)))
                .andExpect(jsonPath("$.questions[0].buckets[?(@.value=='4')].count").value(containsInAnyOrder(1)))
                .andExpect(jsonPath("$.questions[1].buckets[?(@.value=='Facebook')].count").value(containsInAnyOrder(1)))
                .andExpect(jsonPath("$.questions[1].buckets[?(@.value=='TikTok')].count").value(containsInAnyOrder(1)))
                .andExpect(jsonPath("$.questions[2].texts").value(containsInAnyOrder("Giao rất nhanh", "Đóng gói kỹ")));
    }

    private static String segmentBody() {
        return """
                {"name":"Game thủ 18–24","ruleDefinition":{"preset":"age","bucket":"18–24"}}
                """;
    }

    private String addQuestion(String surveyId, String body) throws Exception {
        return mockMvc.perform(post("/api/surveys/" + surveyId + "/questions").with(staff(CS, "DEPT_CS"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private void submit(String surveyId, CustomerView who, List<String> questionIds,
                        String rating, String channel, String comment) throws Exception {
        mockMvc.perform(post("/api/surveys/" + surveyId + "/responses").with(customer(who))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"answers":[
                                  {"questionId":"%s","answerText":"%s"},
                                  {"questionId":"%s","answerText":"%s"},
                                  {"questionId":"%s","answerText":"%s"}]}
                                """.formatted(questionIds.get(0), rating, questionIds.get(1), channel,
                                questionIds.get(2), comment)))
                .andExpect(status().is2xxSuccessful());
    }

    private static RequestPostProcessor customer(CustomerView who) {
        return user(who.id().toString()).authorities(new SimpleGrantedAuthority("ROLE_BUYER"));
    }

    private static RequestPostProcessor staff(UUID id, String department) {
        return user(id.toString()).authorities(
                new SimpleGrantedAuthority("ROLE_STAFF"), new SimpleGrantedAuthority(department));
    }
}
