package com.chototmua.crm.web.profile;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
import com.chototmua.crm.application.profile.InMemoryProfileStore;
import com.chototmua.crm.domain.profile.RfmClassifier;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.port.dto.StaffDepartment;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
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
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Hợp đồng REST hồ sơ CRM: tính lại từ đơn đã giao; sales và khách 403.
 */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class CustomerProfileControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final String GUEST_ID = "44444444-4444-4444-4444-444444444444";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private FakeOrderPort orders;

    @Autowired
    private InMemoryProfileStore profiles;

    @BeforeEach
    void setUp() {
        identity.reset();
        orders.reset();
        profiles.clear();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(CS_ID), StaffDepartment.CS);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void recalculateThenGetReturnsDeliveredTotals() throws Exception {
        CustomerView customer = identity.seedCustomer(
                "An", "male", LocalDate.of(1998, 5, 12), CustomerStatus.ACTIVE);
        seedDelivered(customer.id(), "1890000", "2026-08-01T10:00:00Z");

        mockMvc.perform(get("/api/crm/profiles/" + customer.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOrders").value(0))
                .andExpect(jsonPath("$.ltv").value(0))
                .andExpect(jsonPath("$.rfmSegment").value(RfmClassifier.LOST))
                .andExpect(jsonPath("$.calculatedAt").value(nullValue()));

        mockMvc.perform(post("/api/crm/profiles/" + customer.id() + "/recalculate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("An"))
                .andExpect(jsonPath("$.totalOrders").value(1))
                .andExpect(jsonPath("$.ltv").value(1890000))
                .andExpect(jsonPath("$.rfmSegment").value(expectedLabel("2026-08-01T10:00:00Z", 1, "1890000")));

        mockMvc.perform(get("/api/crm/profiles/" + customer.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOrders").value(1))
                .andExpect(jsonPath("$.ltv").value(1890000))
                .andExpect(jsonPath("$.rfmSegment").value(expectedLabel("2026-08-01T10:00:00Z", 1, "1890000")));
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "cs")
    void customerServiceStaffCanRecalculate() throws Exception {
        CustomerView customer = identity.seedCustomer(
                "Binh", "female", LocalDate.of(2003, 8, 20), CustomerStatus.ACTIVE);

        mockMvc.perform(post("/api/crm/profiles/" + customer.id() + "/recalculate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalOrders").value(0))
                .andExpect(jsonPath("$.rfmSegment").value(RfmClassifier.LOST));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "sales")
    void salesStaffIsForbidden() throws Exception {
        mockMvc.perform(post("/api/crm/profiles/" + UUID.randomUUID() + "/recalculate"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    @Test
    @WithMockUser(username = GUEST_ID, authorities = "customer")
    void endCustomerIsForbidden() throws Exception {
        mockMvc.perform(get("/api/crm/profiles/" + UUID.randomUUID()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void missingCustomerIsNotFound() throws Exception {
        mockMvc.perform(post("/api/crm/profiles/" + UUID.randomUUID() + "/recalculate"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.message", containsString("Không tìm thấy khách hàng")));
    }

    private static String expectedLabel(String deliveredAt, int orders, String amount) {
        int days = (int) Math.max(ChronoUnit.DAYS.between(Instant.parse(deliveredAt), Instant.now()), 0);
        return RfmClassifier.segment(days, orders, new BigDecimal(amount));
    }

    private void seedDelivered(UUID userId, String amount, String deliveredAt) {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                new BigDecimal(amount),
                Instant.parse(deliveredAt),
                List.of(new DeliveredOrderLine(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        "Tay cầm",
                        new BigDecimal(amount)))));
    }
}
