package com.chototmua.crm.web.report;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
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
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Hợp đồng REST báo cáo nhân khẩu: admin / crm / cs được xem; sales và khách 403.
 */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class CustomerReportControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String CRM_ID = "22222222-2222-2222-2222-222222222222";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final String GUEST_ID = "44444444-4444-4444-4444-444444444444";
    private static final UUID CATEGORY_CONTROLLER = UUID.fromString("01010101-0000-0000-0000-000000000001");
    private static final UUID CATEGORY_DISC = UUID.fromString("01010101-0000-0000-0000-000000000002");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private FakeOrderPort orders;

    @BeforeEach
    void setUp() {
        identity.reset();
        orders.reset();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(CRM_ID), StaffDepartment.CRM);
        identity.seedStaff(UUID.fromString(CS_ID), StaffDepartment.CS);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
        seedThreeCustomerFixture();
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void threeCustomersProduceExpectedAgePercents() throws Exception {
        mockMvc.perform(get("/api/crm/reports/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCustomers").value(3))
                .andExpect(jsonPath("$.age[?(@.bucket=='UNDER_18')].count").value(1))
                .andExpect(jsonPath("$.age[?(@.bucket=='UNDER_18')].percent").value(33.33))
                .andExpect(jsonPath("$.age[?(@.bucket=='18–24')].count").value(1))
                .andExpect(jsonPath("$.age[?(@.bucket=='18–24')].percent").value(33.33))
                .andExpect(jsonPath("$.age[?(@.bucket=='25–34')].count").value(1))
                .andExpect(jsonPath("$.age[?(@.bucket=='25–34')].percent").value(33.33))
                .andExpect(jsonPath("$.interests[0].categoryName").value("Tay cầm"))
                .andExpect(jsonPath("$.interests[0].percent").value(66.67))
                .andExpect(jsonPath("$.interests[1].categoryName").value("Đĩa game"))
                .andExpect(jsonPath("$.interests[1].percent").value(33.33));
    }

    @Test
    @WithMockUser(username = CRM_ID, authorities = "crm")
    void missingGenderGoesToUnknownBucket() throws Exception {
        mockMvc.perform(get("/api/crm/reports/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gender[?(@.bucket=='male')].count").value(1))
                .andExpect(jsonPath("$.gender[?(@.bucket=='female')].count").value(1))
                .andExpect(jsonPath("$.gender[?(@.bucket=='unknown')].count").value(1))
                .andExpect(jsonPath("$.gender[?(@.bucket=='unknown')].percent").value(33.33));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void adminCanGetCustomerReport() throws Exception {
        mockMvc.perform(get("/api/crm/reports/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.age", hasSize(6)))
                .andExpect(jsonPath("$.gender", hasSize(3)));
    }

    @Test
    @WithMockUser(username = CRM_ID, authorities = "crm")
    void crmManagerCanGetCustomerReport() throws Exception {
        mockMvc.perform(get("/api/crm/reports/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCustomers").value(3));
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "cs")
    void customerServiceStaffCanGetCustomerReport() throws Exception {
        mockMvc.perform(get("/api/crm/reports/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalCustomers").value(3));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "sales")
    void salesStaffIsForbiddenOnCustomerReport() throws Exception {
        mockMvc.perform(get("/api/crm/reports/customers"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value(containsString("quyền")));
    }

    @Test
    @WithMockUser(username = GUEST_ID, authorities = "customer")
    void endCustomerIsForbiddenOnCustomerReport() throws Exception {
        mockMvc.perform(get("/api/crm/reports/customers"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value(containsString("quyền")));
    }

    private void seedThreeCustomerFixture() {
        LocalDate today = LocalDate.now();
        CustomerView under18 = identity.seedCustomer(
                "Tre", "male", today.minusYears(10), CustomerStatus.ACTIVE);
        CustomerView young = identity.seedCustomer(
                "Tre Vua", "female", today.minusYears(20), CustomerStatus.ACTIVE);
        CustomerView adult = identity.seedCustomer(
                "Trung", null, today.minusYears(30), CustomerStatus.ACTIVE);

        seedLine(under18.id(), CATEGORY_CONTROLLER, "Tay cầm");
        seedLine(young.id(), CATEGORY_CONTROLLER, "Tay cầm");
        seedLine(adult.id(), CATEGORY_DISC, "Đĩa game");
    }

    private void seedLine(UUID userId, UUID categoryId, String categoryName) {
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.randomUUID(),
                userId,
                BigDecimal.TEN,
                Instant.parse("2026-08-01T10:00:00Z"),
                List.of(new DeliveredOrderLine(UUID.randomUUID(), categoryId, categoryName, BigDecimal.TEN))));
    }
}
