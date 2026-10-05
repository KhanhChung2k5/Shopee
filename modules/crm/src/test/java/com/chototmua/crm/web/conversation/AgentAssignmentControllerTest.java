package com.chototmua.crm.web.conversation;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.application.conversation.AgentPresence;
import com.chototmua.crm.application.conversation.InMemoryConversationStore;
import com.chototmua.crm.port.dto.CustomerStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import com.jayway.jsonpath.JsonPath;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.LocalDate;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Gán và escalate giữ đủ lịch sử AgentAssignment, chỉ một dòng đang phụ trách.
 */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class AgentAssignmentControllerTest {

    private static final String CRM_ID = "22222222-2222-2222-2222-222222222222";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final String AN_ID = "aaaa1111-1111-1111-1111-111111111111";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private InMemoryConversationStore conversations;

    @Autowired
    private AgentPresence presence;

    @BeforeEach
    void setUp() {
        identity.reset();
        conversations.clear();
        presence.clear();
        identity.seedStaff(UUID.fromString(CRM_ID), "crm");
        identity.seedStaff(UUID.fromString(CS_ID), "cs");
        identity.seedStaff(UUID.fromString(SALES_ID), "sales");
        identity.seedCustomer(
                UUID.fromString(AN_ID),
                "Nguyễn Văn An",
                "an@example.com",
                "0901111111",
                "male",
                LocalDate.of(1998, 5, 12),
                CustomerStatus.ACTIVE);
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "cs")
    void firstReplyAssignsTheCurrentAgent() throws Exception {
        String id = openTicket();
        mockMvc.perform(post("/api/conversations/" + id + "/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Em nhận ca này."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignments", hasSize(1)))
                .andExpect(jsonPath("$.assignments[0].current").value(true))
                .andExpect(jsonPath("$.assignments[0].employeeId").value(CS_ID));
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "cs")
    void escalateKeepsThePreviousAgentInHistory() throws Exception {
        String id = openTicket();
        mockMvc.perform(post("/api/conversations/" + id + "/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Em nhận ca này."}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/conversations/" + id + "/escalate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"employeeId":"%s"}
                                """.formatted(CRM_ID)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignments", hasSize(2)))
                .andExpect(jsonPath("$.assignments[0].employeeId").value(CS_ID))
                .andExpect(jsonPath("$.assignments[0].current").value(false))
                .andExpect(jsonPath("$.assignments[1].employeeId").value(CRM_ID))
                .andExpect(jsonPath("$.assignments[1].current").value(true))
                .andExpect(jsonPath("$.assigneeId").value(CRM_ID));

        mockMvc.perform(get("/api/conversations/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignments", hasSize(2)))
                .andExpect(jsonPath("$.assignments[0].employeeId").value(CS_ID));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "sales")
    void salesCannotEscalate() throws Exception {
        String id = openTicket();
        mockMvc.perform(post("/api/conversations/" + id + "/escalate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"employeeId":"%s"}
                                """.formatted(CRM_ID)))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = AN_ID, authorities = "customer")
    void customerCannotEscalate() throws Exception {
        String id = openTicket();
        mockMvc.perform(post("/api/conversations/" + id + "/escalate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"employeeId":"%s"}
                                """.formatted(CS_ID)))
                .andExpect(status().isForbidden());
    }

    private String openTicket() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/conversations")
                        .with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors
                                .user(AN_ID)
                                .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("customer")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"ticket","content":"Cần chuyển người xử lý"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(created.getResponse().getContentAsString(), "$.id");
    }
}
