package com.chotomua.backend.modules.crm.web.recommendation;

import com.chotomua.backend.BackendApplication;
import com.chotomua.backend.modules.crm.adapter.fake.FakeIdentityPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeOrderPort;
import com.chotomua.backend.modules.crm.adapter.fake.FakeProductPort;
import com.chotomua.backend.modules.crm.application.notification.InMemoryNotificationStore;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * REST gợi ý: admin/crm/cs xem mọi khách; khách chỉ xem của mình; sales 403.
 */
@SpringBootTest(classes = BackendApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class RecommendationControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final String GUEST_ID = "44444444-4444-4444-4444-444444444444";
    private static final String OTHER_ID = "bbbb2222-2222-2222-2222-222222222222";

    private static final UUID CAT_DISC = UUID.fromString("01010101-0000-0000-0000-000000000002");
    private static final UUID ELDEN = UUID.fromString("02020202-0000-0000-0000-000000000004");
    private static final UUID FIFA = UUID.fromString("02020202-0000-0000-0000-000000000002");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private FakeOrderPort orders;

    @Autowired
    private FakeProductPort products;

    @Autowired
    private InMemoryNotificationStore notifications;

    @BeforeEach
    void setUp() {
        identity.reset();
        orders.reset();
        products.reset();
        notifications.clear();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(CS_ID), StaffDepartment.CS);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
        identity.seedCustomer(
                UUID.fromString(GUEST_ID), "An", "an@test.local", "0901111111",
                "male", LocalDate.of(1998, 5, 12), CustomerStatus.ACTIVE);
        identity.seedCustomer(
                UUID.fromString(OTHER_ID), "Binh", "binh@test.local", "0902222222",
                "female", LocalDate.of(2000, 1, 1), CustomerStatus.ACTIVE);
        products.seed(new ProductView(
                ELDEN, "Đĩa Elden Ring", "Bandai Namco", "game_disc",
                CAT_DISC, "Đĩa game", "Nhập vai", List.of("PS5"),
                new BigDecimal("1190000"), "published"));
        products.seed(new ProductView(
                FIFA, "Đĩa EA FC 25", "EA", "game_disc",
                CAT_DISC, "Đĩa game", "Thể thao", List.of("PS5"),
                new BigDecimal("990000"), "published"));
        Instant soldAt = Instant.now().minus(30, ChronoUnit.DAYS);
        products.seedSale(ELDEN, soldAt, 8);
        products.seedSale(FIFA, soldAt, 3);
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "DEPT_ADMIN")
    void adminGetsBestSellersForCustomerWithoutOrders() throws Exception {
        mockMvc.perform(get("/api/crm/customers/" + GUEST_ID + "/recommendations?limit=2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(GUEST_ID))
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.items[0].productId").value(ELDEN.toString()))
                .andExpect(jsonPath("$.items[0].reason").value("NEW_CUSTOMER_BEST_SELLER"))
                .andExpect(jsonPath("$.items[0].reasonLabel", containsString("bán chạy")))
                .andExpect(jsonPath("$.items[1].productId").value(FIFA.toString()));
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "DEPT_CS")
    void customerServiceCanReadRecommendations() throws Exception {
        mockMvc.perform(get("/api/customers/" + GUEST_ID + "/recommendations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].productId").value(ELDEN.toString()));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "DEPT_SALES")
    void salesStaffIsForbidden() throws Exception {
        mockMvc.perform(get("/api/crm/customers/" + GUEST_ID + "/recommendations"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    @Test
    @WithMockUser(username = GUEST_ID, authorities = "ROLE_BUYER")
    void customerCanReadOwnRecommendations() throws Exception {
        mockMvc.perform(get("/api/crm/customers/" + GUEST_ID + "/recommendations?limit=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(GUEST_ID))
                .andExpect(jsonPath("$.items", hasSize(1)));
    }

    @Test
    @WithMockUser(username = GUEST_ID, authorities = "ROLE_BUYER")
    void customerCannotReadAnotherCustomersRecommendations() throws Exception {
        mockMvc.perform(get("/api/crm/customers/" + OTHER_ID + "/recommendations"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    @Test
    @WithMockUser(username = GUEST_ID, authorities = "ROLE_BUYER")
    void customerCannotPushNotifications() throws Exception {
        mockMvc.perform(post("/api/crm/customers/" + GUEST_ID + "/recommendations/notify"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "DEPT_ADMIN")
    void adminCanPushRecommendationToInbox() throws Exception {
        mockMvc.perform(post("/api/crm/customers/" + GUEST_ID + "/recommendations/notify?limit=2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sentCount").value(1))
                .andExpect(jsonPath("$.referenceType").value("campaign"))
                .andExpect(jsonPath("$.skipped", hasSize(0)));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "DEPT_ADMIN")
    void adminCanPushSelectedProducts() throws Exception {
        mockMvc.perform(post("/api/crm/customers/" + GUEST_ID + "/recommendations/notify")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"productIds\":[\"" + FIFA + "\"]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sentCount").value(1));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "DEPT_ADMIN")
    void sameGenreRuleShowsOnRestAfterPurchase() throws Exception {
        CustomerView customer = identity.getCustomer(UUID.fromString(GUEST_ID));
        products.seed(new ProductView(
                UUID.fromString("02020202-0000-0000-0000-000000000008"),
                "Đĩa NBA 2K", "2K", "game_disc",
                CAT_DISC, "Đĩa game", "Thể thao", List.of("PS5"),
                new BigDecimal("890000"), "published"));
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                customer.id(),
                new BigDecimal("990000"),
                Instant.parse("2026-09-10T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        FIFA, CAT_DISC, "Đĩa game", new BigDecimal("990000"), "Thể thao"))));

        mockMvc.perform(get("/api/crm/customers/" + GUEST_ID + "/recommendations?limit=1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].productId").value("02020202-0000-0000-0000-000000000008"))
                .andExpect(jsonPath("$.items[0].reason").value("SAME_GENRE_GAME_DISC"));
    }
}
