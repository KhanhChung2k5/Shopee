package com.chotomua.backend.modules.crm.web.survey;

import com.chotomua.backend.BackendApplication;
import com.chotomua.backend.modules.crm.adapter.fake.FakeIdentityPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeOrderPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeProductPort;
import com.chotomua.backend.modules.crm.application.notification.InMemoryNotificationStore;
import com.chotomua.backend.modules.crm.application.survey.InMemorySurveyStore;
import com.chotomua.backend.modules.crm.application.survey.InMemorySurveyTargetStore;
import com.chotomua.backend.modules.crm.application.survey.OrderDeliveredSurveyDispatcher;
import com.chotomua.backend.modules.crm.port.dto.CustomerStatus;
import com.chotomua.backend.modules.crm.port.dto.CustomerView;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderLine;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderView;
import com.chotomua.backend.modules.crm.port.dto.ProductView;
import com.chotomua.backend.modules.crm.port.dto.StaffDepartment;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Hook REST đơn delivered. Không gọi SMTP. Sales 403. */
@SpringBootTest(classes = BackendApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class OrderDeliveredSurveyControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final UUID PRODUCT = UUID.fromString("02020202-0000-0000-0000-000000000001");
    private static final UUID CAT = UUID.fromString("01010101-0000-0000-0000-000000000001");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private FakeProductPort products;

    @Autowired
    private FakeOrderPort orders;

    @Autowired
    private InMemorySurveyStore surveys;

    @Autowired
    private InMemorySurveyTargetStore targets;

    @Autowired
    private InMemoryNotificationStore notifications;

    @Autowired
    private OrderDeliveredSurveyDispatcher dispatcher;

    @BeforeEach
    void setUp() {
        identity.reset();
        products.reset();
        orders.reset();
        surveys.clear();
        targets.clear();
        notifications.clear();
        dispatcher.clear();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
        products.seed(new ProductView(
                PRODUCT, "Tay cầm DualSense", "Sony", "controller",
                CAT, "Tay cầm", null, List.of("PS5"), new BigDecimal("1890000"), "published"));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "DEPT_ADMIN")
    void hookSendsInAppSurveyAndDoesNotLoadMailSender() throws Exception {
        CustomerView customer = identity.seedCustomer(
                "An", "male", LocalDate.of(1998, 5, 12), CustomerStatus.ACTIVE);
        String surveyId = createDraft();
        mockMvc.perform(put("/api/crm/surveys/" + surveyId + "/product-target")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productIds":["02020202-0000-0000-0000-000000000001"]}
                                """))
                .andExpect(status().isOk());
        UUID orderId = UUID.randomUUID();
        orders.seedDeliveredOrder(new DeliveredOrderView(
                orderId,
                customer.id(),
                new BigDecimal("1890000"),
                Instant.parse("2026-10-01T10:00:00Z"),
                List.of(new DeliveredOrderLine(PRODUCT, CAT, "Tay cầm", new BigDecimal("1890000")))));

        mockMvc.perform(post("/api/crm/orders/" + orderId + "/delivered")
                        .param("userId", customer.id().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sentCount").value(1))
                .andExpect(jsonPath("$.surveyIds[0]").value(surveyId));

        mockMvc.perform(post("/api/crm/orders/" + orderId + "/delivered")
                        .param("userId", customer.id().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sentCount").value(0));

        assertThrows(ClassNotFoundException.class,
                () -> Class.forName("org.springframework.mail.javamail.JavaMailSender"));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "DEPT_SALES")
    void salesStaffIsForbidden() throws Exception {
        mockMvc.perform(post("/api/crm/orders/" + UUID.randomUUID() + "/delivered")
                        .param("userId", UUID.randomUUID().toString()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    private String createDraft() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Khảo sát sau giao"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        return created.getResponse().getContentAsString()
                .replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");
    }
}
