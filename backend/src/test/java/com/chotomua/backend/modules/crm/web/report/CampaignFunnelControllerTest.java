package com.chotomua.backend.modules.crm.web.report;

import com.chotomua.backend.BackendApplication;
import com.chotomua.backend.modules.crm.adapter.fake.FakeIdentityPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeOrderPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeProductPort;
import com.chotomua.backend.modules.crm.application.campaign.InMemoryCampaignProductTargetStore;
import com.chotomua.backend.modules.crm.application.campaign.InMemoryCampaignStore;
import com.chotomua.backend.modules.crm.application.notification.InMemoryNotificationStore;
import com.chotomua.backend.modules.crm.application.segment.InMemorySegmentStore;
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
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Hợp đồng REST funnel chiến dịch: admin / crm / cs được xem; sales và khách 403.
 * Đơn delivered sau startAt chứa sản phẩm mục tiêu mới vào tầng mua.
 */
@SpringBootTest(classes = BackendApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class CampaignFunnelControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String CS_LEAD_ID = "22222222-2222-2222-2222-222222222222";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final String GUEST_ID = "44444444-4444-4444-4444-444444444444";
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
        identity.seedStaff(UUID.fromString(CS_LEAD_ID), StaffDepartment.CS);
        identity.seedStaff(UUID.fromString(CS_ID), StaffDepartment.CS);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
        products.seed(new ProductView(
                PRODUCT_DUALSENSE, "Tay cầm DualSense", "Sony", "controller",
                CATEGORY_PAD, "Tay cầm", null, List.of("PS5"),
                new BigDecimal("1890000"), "published"));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "DEPT_ADMIN")
    void purchaseAfterStartAtAppearsInConvertedStage() throws Exception {
        CustomerView buyer = identity.seedCustomer(
                "An", "male", LocalDate.now().minusYears(20), CustomerStatus.ACTIVE);
        seedDelivered(buyer.id(), Instant.parse("2026-09-01T10:00:00Z"));
        String campaignId = createProductCampaign("2026-10-01T08:00:00Z");
        seedDelivered(buyer.id(), Instant.parse("2026-10-05T10:00:00Z"));

        mockMvc.perform(get("/api/crm/reports/campaigns/" + campaignId + "/funnel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.campaignId").value(campaignId))
                .andExpect(jsonPath("$.convertible").value(true))
                .andExpect(jsonPath("$.targeted").value(1))
                .andExpect(jsonPath("$.sent").value(1))
                .andExpect(jsonPath("$.converted").value(1))
                .andExpect(jsonPath("$.conversionRate").value(100.00))
                .andExpect(jsonPath("$.productIds", hasSize(1)))
                .andExpect(jsonPath("$.stages[2].bucket").value("converted"))
                .andExpect(jsonPath("$.stages[2].count").value(1));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "DEPT_SALES")
    void purchaseBeforeStartAtIsNotConverted() throws Exception {
        CustomerView buyer = identity.seedCustomer(
                "Binh", "female", LocalDate.now().minusYears(22), CustomerStatus.ACTIVE);
        seedDelivered(buyer.id(), Instant.parse("2026-09-01T10:00:00Z"));
        String campaignId = createProductCampaign("2026-10-01T08:00:00Z");

        mockMvc.perform(get("/api/crm/reports/campaigns/" + campaignId + "/funnel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(1))
                .andExpect(jsonPath("$.converted").value(0))
                .andExpect(jsonPath("$.conversionRate").value(0.0));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "DEPT_SALES")
    void salesStaffCanReadFunnel() throws Exception {
        CustomerView buyer = identity.seedCustomer(
                "Chau", "female", LocalDate.now().minusYears(21), CustomerStatus.ACTIVE);
        seedDelivered(buyer.id(), Instant.parse("2026-09-01T10:00:00Z"));
        String campaignId = createProductCampaign("2026-10-01T08:00:00Z");

        mockMvc.perform(get("/api/crm/reports/campaigns/" + campaignId + "/funnel"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targeted").value(1));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "DEPT_ADMIN")
    void unknownCampaignReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/crm/reports/campaigns/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/funnel"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.message", containsString("chiến dịch")));
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "DEPT_CS")
    void customerServiceStaffIsForbiddenOnCampaignFunnel() throws Exception {
        mockMvc.perform(get("/api/crm/reports/campaigns/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/funnel"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value(containsString("quyền")));
    }

    @Test
    @WithMockUser(username = GUEST_ID, authorities = "ROLE_BUYER")
    void endCustomerIsForbiddenOnCampaignFunnel() throws Exception {
        mockMvc.perform(get("/api/crm/reports/campaigns/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/funnel"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value(containsString("quyền")));
    }

    private String createProductCampaign(String startAt) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/campaigns")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Người đã mua","segmentIds":[],"content":"Cảm ơn",
                                 "startAt":"%s",
                                 "productIds":["02020202-0000-0000-0000-000000000001"]}
                                """.formatted(startAt)))
                .andExpect(status().isCreated())
                .andReturn();
        return created.getResponse().getContentAsString()
                .replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");
    }

    private void seedDelivered(UUID userId, Instant deliveredAt) {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                new BigDecimal("1890000"),
                deliveredAt,
                List.of(new DeliveredOrderLine(
                        PRODUCT_DUALSENSE, CATEGORY_PAD, "Tay cầm", new BigDecimal("1890000")))));
    }
}
