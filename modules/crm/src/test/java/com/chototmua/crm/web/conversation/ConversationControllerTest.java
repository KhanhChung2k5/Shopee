package com.chototmua.crm.web.conversation;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
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

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Ticket và live chat dùng chung Conversation. F5 (GET lại) vẫn còn tin.
 */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class ConversationControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String CRM_ID = "22222222-2222-2222-2222-222222222222";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final String AN_ID = "aaaa1111-1111-1111-1111-111111111111";
    private static final String BINH_ID = "bbbb2222-2222-2222-2222-222222222222";
    private static final UUID ORDER_ID = UUID.fromString("aaaa0001-0000-0000-0000-000000000099");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private FakeOrderPort orders;

    @Autowired
    private InMemoryConversationStore conversations;

    @Autowired
    private AgentPresence presence;

    @BeforeEach
    void setUp() {
        identity.reset();
        orders.reset();
        conversations.clear();
        presence.clear();
        identity.seedStaff(UUID.fromString(ADMIN_ID), "admin");
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
        identity.seedCustomer(
                UUID.fromString(BINH_ID),
                "Trần Thị Bình",
                "binh@example.com",
                "0902222222",
                "female",
                LocalDate.of(2003, 8, 20),
                CustomerStatus.ACTIVE);
        orders.seedOrder(UUID.fromString(AN_ID), ORDER_ID);
    }

    @Test
    void doesNotUseASeparateSupportTicketType() {
        assertThatThrownBy(() -> Class.forName("com.chototmua.crm.domain.conversation.SupportTicket"))
                .isInstanceOf(ClassNotFoundException.class);
    }

    @Test
    @WithMockUser(username = AN_ID, authorities = "customer")
    void appendMessageThenReloadStillHasTheThread() throws Exception {
        String id = create("ticket", "Tay cầm bị trôi analog");

        mockMvc.perform(get("/api/conversations/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("ticket"))
                .andExpect(jsonPath("$.messages[*].content", hasItem("Tay cầm bị trôi analog")))
                .andExpect(jsonPath("$.messages[*].content", hasItem(containsString("Nhân viên CSKH sẽ phản hồi"))));

        mockMvc.perform(post("/api/conversations/" + id + "/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"content":"Mình gửi thêm ảnh sản phẩm."}
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/conversations/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[*].content", hasItem("Tay cầm bị trôi analog")))
                .andExpect(jsonPath("$.messages[*].content", hasItem("Mình gửi thêm ảnh sản phẩm.")));
    }

    @Test
    @WithMockUser(username = AN_ID, authorities = "customer")
    void createsBothChatAndTicket() throws Exception {
        mockMvc.perform(post("/api/conversations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"chat","content":"Mình cần hỏi tồn kho"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("chat"))
                .andExpect(jsonPath("$.mode").value("ticket"));

        mockMvc.perform(post("/api/conversations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"ticket","orderId":"%s","content":"Khiếu nại đơn"}
                                """.formatted(ORDER_ID)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.type").value("ticket"))
                .andExpect(jsonPath("$.topicLabel").value("Khiếu nại"));
    }

    @Test
    @WithMockUser(username = AN_ID, authorities = "customer")
    void unknownOrderIsRejected() throws Exception {
        mockMvc.perform(post("/api/conversations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"ticket","orderId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","content":"Sai đơn"}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("INVALID_CONVERSATION"));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "sales")
    void salesCannotListConversations() throws Exception {
        mockMvc.perform(get("/api/conversations"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("FORBIDDEN"));
    }

    @Test
    @WithMockUser(username = AN_ID, authorities = "customer")
    void customerDoesNotSeeAnotherCustomersThread() throws Exception {
        String id = create("ticket", "Việc của An");
        mockMvc.perform(get("/api/conversations/" + id).with(user(BINH_ID, "customer")))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "cs")
    void internalNoteStaysHiddenFromTheCustomer() throws Exception {
        String id = openAsAn("ticket", "Cần hỗ trợ bảo hành");
        mockMvc.perform(post("/api/conversations/" + id + "/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"kind":"internal","content":"Khách đã gọi lần 2, ưu tiên đổi máy."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[*].kind", hasItem("internal")));

        mockMvc.perform(get("/api/conversations/" + id).with(user(AN_ID, "customer")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.messages[*].content", not(hasItem("Khách đã gọi lần 2, ưu tiên đổi máy."))))
                .andExpect(jsonPath("$.messages[*].kind", not(hasItem("internal"))));
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "cs")
    void convertingToLiveChatAddsTheHandoffDivider() throws Exception {
        String id = openAsAn("ticket", "Agent chưa online lúc mở");
        mockMvc.perform(post("/api/conversations/" + id + "/live"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.type").value("chat"))
                .andExpect(jsonPath("$.channelLabel").value("Live chat"))
                .andExpect(jsonPath("$.messages[*].content", hasItem("Đã chuyển cho nhân viên hỗ trợ")));
    }

    @Test
    @WithMockUser(username = AN_ID, authorities = "customer")
    void customerRatesAfterTheCaseIsClosed() throws Exception {
        String id = create("ticket", "Muốn đánh giá sau khi xong");
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/conversations/" + id)
                        .with(user(CS_ID, "cs"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"closed"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("closed"));

        mockMvc.perform(post("/api/conversations/" + id + "/csat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"score":5}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.csatScore").value(5));
    }

    private String create(String type, String content) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/conversations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"%s","content":"%s"}
                                """.formatted(type, content)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(created.getResponse().getContentAsString(), "$.id");
    }

    private String openAsAn(String type, String content) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/conversations")
                        .with(user(AN_ID, "customer"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"type":"%s","content":"%s"}
                                """.formatted(type, content)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(created.getResponse().getContentAsString(), "$.id");
    }

    private static org.springframework.test.web.servlet.request.RequestPostProcessor user(String id, String authority) {
        return org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user(id)
                .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority(authority));
    }
}
