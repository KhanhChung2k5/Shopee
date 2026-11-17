package com.chototmua.crm.web.catalog;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
import com.chototmua.crm.adapter.fake.FakeProductPort;
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

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** REST đọc catalog cho UI Admin. Quyền admin/crm/cs; sales và khách 403. */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class ProductCatalogControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final UUID CAT_CONTROLLER = UUID.fromString("01010101-0000-0000-0000-000000000001");
    private static final UUID CAT_DISC = UUID.fromString("01010101-0000-0000-0000-000000000002");
    private static final UUID DUALSENSE = UUID.fromString("02020202-0000-0000-0000-000000000001");
    private static final UUID FIFA = UUID.fromString("02020202-0000-0000-0000-000000000002");
    private static final UUID RETIRED = UUID.fromString("02020202-0000-0000-0000-000000000009");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private FakeProductPort products;

    @Autowired
    private FakeOrderPort orders;

    private CustomerView activeBuyer;

    @BeforeEach
    void setUp() {
        identity.reset();
        products.reset();
        orders.reset();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
        products.seed(new ProductView(
                DUALSENSE, "Tay cầm DualSense", "Sony", "controller",
                CAT_CONTROLLER, "Tay cầm", null, List.of("PS5"), new BigDecimal("1890000"), "published"));
        products.seed(new ProductView(
                FIFA, "Đĩa EA FC 25", "EA", "game_disc",
                CAT_DISC, "Đĩa game", "Thể thao", List.of("PS5", "PS4"), new BigDecimal("990000"), "published"));
        products.seed(new ProductView(
                RETIRED, "Đĩa cũ", "EA", "game_disc",
                CAT_DISC, "Đĩa game", "Đua xe", List.of("PS3"), new BigDecimal("100000"), "archived"));
        activeBuyer = identity.seedCustomer("Trần Thị Bình", "female", LocalDate.of(2003, 8, 20), CustomerStatus.ACTIVE);
        CustomerView lockedBuyer = identity.seedCustomer("Lê Minh Châu", "female", LocalDate.of(1987, 3, 3), CustomerStatus.LOCKED);
        orders.seedDeliveredOrder(order(activeBuyer.id(), "2026-09-01T10:00:00Z", FIFA));
        orders.seedDeliveredOrder(order(lockedBuyer.id(), "2026-09-02T10:00:00Z", FIFA));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void searchDefaultsToPublishedAndFiltersByType() throws Exception {
        mockMvc.perform(get("/api/crm/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.products", hasSize(2)));

        mockMvc.perform(get("/api/crm/products").param("productType", "game_disc").param("keyword", "ea"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.products[0].id").value(FIFA.toString()));

        mockMvc.perform(get("/api/crm/products").param("publishedOnly", "false").param("genre", "Đua xe"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.products[0].id").value(RETIRED.toString()));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void lookupReturnsKnownProductsAndSkipsUnknownIds() throws Exception {
        mockMvc.perform(get("/api/crm/products/lookup")
                        .param("ids", FIFA + "," + UUID.randomUUID() + "," + DUALSENSE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.products[0].id").value(FIFA.toString()))
                .andExpect(jsonPath("$.products[1].id").value(DUALSENSE.toString()));

        mockMvc.perform(get("/api/crm/products/lookup"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void facetsListOnlyPublishedValues() throws Exception {
        mockMvc.perform(get("/api/crm/products/facets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productTypes", contains("controller", "game_disc")))
                .andExpect(jsonPath("$.genres", contains("Thể thao")))
                .andExpect(jsonPath("$.platforms", contains("PS4", "PS5")))
                .andExpect(jsonPath("$.categories", hasSize(2)));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void audiencePreviewCountsOnlyActiveBuyers() throws Exception {
        mockMvc.perform(post("/api/crm/products/audience-preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"filter\":{\"productType\":\"game_disc\",\"publishedOnly\":true}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productCount").value(1))
                .andExpect(jsonPath("$.activeBuyerCount").value(1));

        mockMvc.perform(post("/api/crm/products/audience-preview")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productCount").value(0))
                .andExpect(jsonPath("$.activeBuyerCount").value(0));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void deliveredOrdersListProductIds() throws Exception {
        mockMvc.perform(get("/api/crm/customers/" + activeBuyer.id() + "/delivered-orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.orders", hasSize(1)))
                .andExpect(jsonPath("$.orders[0].productIds[0]").value(FIFA.toString()));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "sales")
    void salesStaffIsForbidden() throws Exception {
        mockMvc.perform(get("/api/crm/products"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    private static DeliveredOrderView order(UUID userId, String deliveredAt, UUID productId) {
        return new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                new BigDecimal("990000"),
                Instant.parse(deliveredAt),
                List.of(new DeliveredOrderLine(productId, CAT_DISC, "Đĩa game", new BigDecimal("990000"), "Thể thao")));
    }
}
