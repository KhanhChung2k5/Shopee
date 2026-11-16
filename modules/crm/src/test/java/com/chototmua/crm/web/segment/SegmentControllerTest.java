package com.chototmua.crm.web.segment;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
import com.chototmua.crm.application.segment.InMemorySegmentStore;
import com.chototmua.crm.port.dto.CustomerStatus;
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

import java.time.LocalDate;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Hợp đồng REST phân khúc: preset tuổi, loại khách khóa/xóa, quyền story 4–7.
 */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class SegmentControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String CRM_ID = "22222222-2222-2222-2222-222222222222";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final String GUEST_ID = "44444444-4444-4444-4444-444444444444";

    private static final String AGE_BODY = """
            {"name":"18–24","ruleDefinition":{"preset":"age","bucket":"18–24"}}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private FakeOrderPort orders;

    @Autowired
    private InMemorySegmentStore segments;

    @BeforeEach
    void setUp() {
        identity.reset();
        orders.reset();
        segments.clear();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(CRM_ID), StaffDepartment.CRM);
        identity.seedStaff(UUID.fromString(CS_ID), StaffDepartment.CS);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
        seedAgeFixture();
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void agePresetReturnsOnlyTheYoungActiveCustomer() throws Exception {
        mockMvc.perform(post("/api/segments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(AGE_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("18–24"))
                .andExpect(jsonPath("$.ruleDefinition.preset").value("age"))
                .andExpect(jsonPath("$.ruleDefinition.bucket").value("18–24"))
                .andExpect(jsonPath("$.memberCount").value(1))
                .andExpect(jsonPath("$.members", hasSize(1)))
                .andExpect(jsonPath("$.members[0].fullName").value("Tre Vua"))
                .andExpect(jsonPath("$.members[?(@.fullName=='Khoa')]", hasSize(0)))
                .andExpect(jsonPath("$.members[?(@.fullName=='Xoa')]", hasSize(0)));
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "cs")
    void customerServiceStaffCanCreateASegment() throws Exception {
        mockMvc.perform(post("/api/segments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(AGE_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.memberCount").value(1));
    }

    @Test
    @WithMockUser(username = CRM_ID, authorities = "crm")
    void crmManagerCanListTheSegmentJustCreated() throws Exception {
        String body = mockMvc.perform(post("/api/segments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(AGE_BODY))
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getContentAsString();

        mockMvc.perform(get("/api/segments"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.segments", hasSize(1)))
                .andExpect(jsonPath("$.segments[0].members[0].fullName").value("Tre Vua"));

        String id = body.replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");
        mockMvc.perform(delete("/api/segments/" + id))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/segments/" + id))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error.message", containsString("phân khúc")));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "sales")
    void salesStaffIsForbidden() throws Exception {
        mockMvc.perform(post("/api/segments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(AGE_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    @Test
    @WithMockUser(username = GUEST_ID, authorities = "customer")
    void endCustomerIsForbidden() throws Exception {
        mockMvc.perform(get("/api/segments"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void unknownPresetReturnsVietnameseValidationError() throws Exception {
        mockMvc.perform(post("/api/segments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Sai","ruleDefinition":{"preset":"voucher"}}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.code").value("INVALID_RULE"))
                .andExpect(jsonPath("$.error.message", containsString("age")));
    }

    private void seedAgeFixture() {
        LocalDate today = LocalDate.now();
        identity.seedCustomer("Tre", "male", today.minusYears(10), CustomerStatus.ACTIVE);
        identity.seedCustomer("Tre Vua", "female", today.minusYears(20), CustomerStatus.ACTIVE);
        identity.seedCustomer("Trung", null, today.minusYears(30), CustomerStatus.ACTIVE);
        identity.seedCustomer("Khoa", "male", today.minusYears(20), CustomerStatus.LOCKED);
        identity.seedCustomer("Xoa", "female", today.minusYears(20), CustomerStatus.DELETED);
    }
}
