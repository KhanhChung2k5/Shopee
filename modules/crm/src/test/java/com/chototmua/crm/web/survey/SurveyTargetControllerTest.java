package com.chototmua.crm.web.survey;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeProductPort;
import com.chototmua.crm.application.survey.InMemorySurveyStore;
import com.chototmua.crm.application.survey.InMemorySurveyTargetStore;
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
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** REST gắn sản phẩm vào khảo sát. Quyền admin/crm/cs; sales và khách 403. */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class SurveyTargetControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";
    private static final String GUEST_ID = "44444444-4444-4444-4444-444444444444";
    private static final String DUALSENSE = "02020202-0000-0000-0000-000000000001";
    private static final String FIFA = "02020202-0000-0000-0000-000000000002";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private FakeProductPort products;

    @Autowired
    private InMemorySurveyStore surveys;

    @Autowired
    private InMemorySurveyTargetStore targets;

    @BeforeEach
    void setUp() {
        identity.reset();
        products.reset();
        surveys.clear();
        targets.clear();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
        products.seed(new ProductView(
                UUID.fromString(DUALSENSE), "Tay cầm DualSense", "Sony", "controller",
                UUID.fromString("01010101-0000-0000-0000-000000000001"), "Tay cầm",
                null, List.of("PS5"), new BigDecimal("1890000"), "published"));
        products.seed(new ProductView(
                UUID.fromString(FIFA), "Đĩa EA FC 25", "EA", "game_disc",
                UUID.fromString("01010101-0000-0000-0000-000000000002"), "Đĩa game",
                "Thể thao", List.of("PS5"), new BigDecimal("990000"), "published"));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void putAndGetRoundTripOnCrmPath() throws Exception {
        String surveyId = createDraft();
        mockMvc.perform(put("/api/crm/surveys/" + surveyId + "/product-target")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productIds":["02020202-0000-0000-0000-000000000001"],
                                 "filter":{"productType":"game_disc","publishedOnly":true}}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productIds", hasSize(1)))
                .andExpect(jsonPath("$.productIds[0]").value(DUALSENSE))
                .andExpect(jsonPath("$.filter.productType").value("game_disc"))
                .andExpect(jsonPath("$.resolvedProductIds", containsInAnyOrder(DUALSENSE, FIFA)));

        mockMvc.perform(get("/api/surveys/" + surveyId + "/product-target"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productIds[0]").value(DUALSENSE))
                .andExpect(jsonPath("$.resolvedProductIds", containsInAnyOrder(DUALSENSE, FIFA)));
    }

    @Test
    @WithMockUser(username = SALES_ID, authorities = "sales")
    void salesStaffIsForbidden() throws Exception {
        mockMvc.perform(put("/api/crm/surveys/" + UUID.randomUUID() + "/product-target")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"productIds":["02020202-0000-0000-0000-000000000001"]}
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    @Test
    @WithMockUser(username = GUEST_ID, authorities = "customer")
    void endCustomerIsForbidden() throws Exception {
        mockMvc.perform(get("/api/crm/surveys/" + UUID.randomUUID() + "/product-target"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message", containsString("quyền")));
    }

    private String createDraft() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/surveys")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Khảo sát theo sản phẩm"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        return created.getResponse().getContentAsString()
                .replaceAll("(?s).*\"id\"\\s*:\\s*\"([^\"]+)\".*", "$1");
    }
}
