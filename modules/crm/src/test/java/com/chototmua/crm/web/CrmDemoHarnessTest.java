package com.chototmua.crm.web;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.config.CrmDemoActors;
import com.chototmua.crm.port.dto.StaffDepartment;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Bản chạy thử: trang HTML + Basic Auth tên đăng nhập (admin/crm/cs).
 */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class CrmDemoHarnessTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @BeforeEach
    void setUp() {
        identity.reset();
        identity.seedStaff(CrmDemoActors.ADMIN_ID, StaffDepartment.ADMIN);
        identity.seedStaff(CrmDemoActors.CRM_ID, StaffDepartment.CRM);
        identity.seedStaff(CrmDemoActors.CS_ID, StaffDepartment.CS);
        identity.seedStaff(CrmDemoActors.SALES_ID, StaffDepartment.SALES);
    }

    @Test
    void demoPageIsPublic() throws Exception {
        mockMvc.perform(get("/index.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("crm-customer-demo")));
    }

    @Test
    void reportDemoPageIsPublic() throws Exception {
        mockMvc.perform(get("/reports.html"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("crm-report-demo")));
    }

    @Test
    void adminBasicAuthCanGetCustomerReport() throws Exception {
        mockMvc.perform(get("/api/crm/reports/customers").with(httpBasic("admin", "admin")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.age").isArray())
                .andExpect(jsonPath("$.gender").isArray())
                .andExpect(jsonPath("$.interests").isArray());
    }

    @Test
    void adminBasicAuthCanListCustomers() throws Exception {
        mockMvc.perform(get("/api/customers").with(httpBasic("admin", "admin")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    void customerServiceBasicAuthIsForbiddenOnCreate() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .with(httpBasic("cs", "cs"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Nguyen Van A",
                                  "email": "a@example.com",
                                  "gender": "male",
                                  "dob": "1998-05-01"
                                }
                                """))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value(containsString("quyền")));
    }
}
