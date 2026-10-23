package com.chotomua.backend.modules.crm.e2e;

import com.chotomua.backend.BackendApplication;
import com.chotomua.backend.modules.crm.adapter.fake.FakeIdentityPort;
import com.chotomua.backend.modules.crm.application.conversation.AgentPresence;
import com.chotomua.backend.modules.crm.application.conversation.InMemoryConversationStore;
import com.chotomua.backend.modules.crm.port.dto.CustomerStatus;
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
import java.util.UUID;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * E2E p5-21 — one support ticket through its whole life, each step played by the real role
 * with backend-style JWT authorities: customer opens → CS picks it up → CS escalates to the
 * CS lead → lead resolves and closes → customer rates. The assignment history must keep both
 * agents, and the customer must never see internal notes.
 */
@SpringBootTest(classes = BackendApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class SupportTicketEscalationE2ETest {

    private static final UUID CUSTOMER = UUID.fromString("aaaa1111-1111-1111-1111-111111111111");
    private static final UUID CS_AGENT = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID CS_LEAD = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SALES = UUID.fromString("55555555-5555-5555-5555-555555555555");

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
        identity.seedStaff(ADMIN, StaffDepartment.ADMIN);
        identity.seedStaff(CS_AGENT, StaffDepartment.CS);
        identity.seedStaff(CS_LEAD, StaffDepartment.CS);
        identity.seedStaff(SALES, StaffDepartment.SALES);
        identity.seedCustomer(CUSTOMER, "Nguyễn Văn An", "an@example.com", "0901111111", "male",
                LocalDate.of(1998, 5, 12), CustomerStatus.ACTIVE);
    }

    @Test
    void ticketIsOpenedPickedUpEscalatedClosedAndRatedWithFullAssignmentHistory() throws Exception {
        // 1. Customer opens a ticket from the storefront support page.
        String body = mockMvc.perform(post("/api/conversations").with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"ticket","topic":"hoi_don","content":"Đơn của mình bao giờ giao vậy shop?"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.topic").value("hoi_don"))
                .andReturn().getResponse().getContentAsString();
        String id = JsonPath.read(body, "$.id");

        // 2. It shows up in the customer's own list and in the CS queue, unassigned.
        mockMvc.perform(get("/api/conversations").with(customer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].id").value(id));
        mockMvc.perform(get("/api/conversations").with(staff(CS_AGENT, "DEPT_CS")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id", hasItem(id)));

        // 3. The CS agent replies (which assigns them) and leaves an internal note.
        mockMvc.perform(post("/api/conversations/" + id + "/messages").with(staff(CS_AGENT, "DEPT_CS"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"kind":"public","content":"Dạ em kiểm tra đơn cho anh ngay ạ."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignments", hasSize(1)))
                .andExpect(jsonPath("$.assignments[0].employeeId").value(CS_AGENT.toString()))
                .andExpect(jsonPath("$.assignments[0].current").value(true));
        mockMvc.perform(post("/api/conversations/" + id + "/messages").with(staff(CS_AGENT, "DEPT_CS"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"kind":"internal","content":"Đơn kẹt ở kho HN, cần trưởng nhóm duyệt đổi kho."}
                                """))
                .andExpect(status().isOk());

        // 4. The customer sees the public reply but never the internal note.
        mockMvc.perform(get("/api/conversations/" + id).with(customer()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[*].content", hasItem("Dạ em kiểm tra đơn cho anh ngay ạ.")))
                .andExpect(jsonPath("$.messages[*].kind", everyItem(not("internal"))));

        // 5. Sales staff cannot step into a support conversation.
        mockMvc.perform(post("/api/conversations/" + id + "/escalate").with(staff(SALES, "DEPT_SALES"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"employeeId\":\"%s\"}".formatted(CS_LEAD)))
                .andExpect(status().isForbidden());

        // 6. The agent escalates to the CS lead: the old assignment is kept, the lead becomes current.
        mockMvc.perform(post("/api/conversations/" + id + "/escalate").with(staff(CS_AGENT, "DEPT_CS"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"employeeId\":\"%s\"}".formatted(CS_LEAD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assigneeId").value(CS_LEAD.toString()))
                .andExpect(jsonPath("$.assignments", hasSize(2)))
                .andExpect(jsonPath("$.assignments[0].employeeId").value(CS_AGENT.toString()))
                .andExpect(jsonPath("$.assignments[0].current").value(false))
                .andExpect(jsonPath("$.assignments[1].employeeId").value(CS_LEAD.toString()))
                .andExpect(jsonPath("$.assignments[1].current").value(true));

        // 7. The lead answers and closes the ticket — no new assignment row for the current owner.
        mockMvc.perform(post("/api/conversations/" + id + "/messages").with(staff(CS_LEAD, "DEPT_CS"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"kind":"public","content":"Đơn đã chuyển kho HCM, giao trong hôm nay ạ."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignments", hasSize(2)));
        mockMvc.perform(patch("/api/conversations/" + id).with(staff(CS_LEAD, "DEPT_CS"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"closed\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("closed"));

        // 8. The customer rates the support (CSAT).
        mockMvc.perform(post("/api/conversations/" + id + "/csat").with(customer())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"score\":5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.csatScore").value(5));

        // 9. Afterwards an admin still sees the full hand-over history.
        mockMvc.perform(get("/api/conversations/" + id).with(staff(ADMIN, "DEPT_ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("closed"))
                .andExpect(jsonPath("$.assignments", hasSize(2)))
                .andExpect(jsonPath("$.assignments[*].employeeId", hasItem(CS_AGENT.toString())))
                .andExpect(jsonPath("$.assignments[*].employeeId", hasItem(CS_LEAD.toString())))
                .andExpect(jsonPath("$.messages[*].kind", hasItem("internal")));
    }

    private static RequestPostProcessor customer() {
        return user(CUSTOMER.toString()).authorities(new SimpleGrantedAuthority("ROLE_BUYER"));
    }

    private static RequestPostProcessor staff(UUID id, String department) {
        return user(id.toString()).authorities(
                new SimpleGrantedAuthority("ROLE_STAFF"), new SimpleGrantedAuthority(department));
    }
}
