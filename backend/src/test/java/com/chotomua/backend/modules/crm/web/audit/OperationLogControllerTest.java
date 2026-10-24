package com.chotomua.backend.modules.crm.web.audit;

import com.chotomua.backend.BackendApplication;
import com.chotomua.backend.modules.crm.adapter.fake.FakeIdentityPort;
import com.chotomua.backend.modules.crm.application.audit.InMemoryOperationLogStore;
import com.chotomua.backend.modules.crm.port.dto.StaffDepartment;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Nhật ký thao tác: chỉ quản trị viên xem được.
 * Thao tác thành công và bị từ chối đều được ghi.
 */
@SpringBootTest(classes = BackendApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class OperationLogControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String CS_LEAD_ID = "22222222-2222-2222-2222-222222222222";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String SALES_ID = "55555555-5555-5555-5555-555555555555";

    private static final String CREATE_BODY = """
            {
              "fullName": "Nguyen Van A",
              "email": "a-log@example.com",
              "phone": "0908881111",
              "gender": "male",
              "dob": "1998-05-01"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @Autowired
    private InMemoryOperationLogStore logs;

    @BeforeEach
    void setUp() {
        identity.reset();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(CS_LEAD_ID), StaffDepartment.CS);
        identity.seedStaff(UUID.fromString(CS_ID), StaffDepartment.CS);
        identity.seedStaff(UUID.fromString(SALES_ID), StaffDepartment.SALES);
        logs.clear();
    }

    @Test
    void adminSeesSuccessfulAndDeniedActions() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .with(user(SALES_ID).authorities(new SimpleGrantedAuthority("DEPT_SALES")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/customers")
                        .with(user(ADMIN_ID).authorities(new SimpleGrantedAuthority("DEPT_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/crm/audit-logs")
                        .with(user(ADMIN_ID).authorities(new SimpleGrantedAuthority("DEPT_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagination.totalItems").value(2))
                .andExpect(jsonPath("$.data[0].action").value("Tạo khách hàng"))
                .andExpect(jsonPath("$.data[0].outcome").value("success"))
                .andExpect(jsonPath("$.data[0].actorLabel").value("Quản trị viên"))
                .andExpect(jsonPath("$.data[1].action").value("Tạo khách hàng"))
                .andExpect(jsonPath("$.data[1].outcome").value("failed"))
                .andExpect(jsonPath("$.data[1].actorLabel").value("NV Kinh doanh"))
                .andExpect(jsonPath("$.data[1].statusCode").value(403));
    }

    @Test
    void adminCanFilterByOutcome() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .with(user(SALES_ID).authorities(new SimpleGrantedAuthority("DEPT_SALES")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/crm/audit-logs")
                        .param("outcome", "failed")
                        .param("q", "khách")
                        .with(user(ADMIN_ID).authorities(new SimpleGrantedAuthority("DEPT_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagination.totalItems").value(1))
                .andExpect(jsonPath("$.data[0].outcome").value("failed"))
                .andExpect(jsonPath("$.data[0].action", containsString("khách")));
    }

    @Test
    void adminCanCombineActorDepartmentAndActionFilters() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .with(user(SALES_ID).authorities(new SimpleGrantedAuthority("DEPT_SALES")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/customers")
                        .with(user(ADMIN_ID).authorities(new SimpleGrantedAuthority("DEPT_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/crm/audit-logs")
                        .param("actor", "sales")
                        .param("department", "sales")
                        .param("action", "Tạo khách hàng")
                        .param("outcome", "failed")
                        .with(user(ADMIN_ID).authorities(new SimpleGrantedAuthority("DEPT_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pagination.totalItems").value(1))
                .andExpect(jsonPath("$.data[0].actorLogin").value("sales"))
                .andExpect(jsonPath("$.data[0].department").value("sales"))
                .andExpect(jsonPath("$.data[0].action").value("Tạo khách hàng"))
                .andExpect(jsonPath("$.data[0].outcome").value("failed"));

        mockMvc.perform(get("/api/crm/audit-logs/filters")
                        .with(user(ADMIN_ID).authorities(new SimpleGrantedAuthority("DEPT_ADMIN"))))
                .andExpect(status().isOk())
                // only people who actually appear in the log: sales acted above, cs never did
                .andExpect(jsonPath("$.actors[*].login", hasItem("sales")))
                .andExpect(jsonPath("$.actors[*].login", org.hamcrest.Matchers.not(hasItem("cs"))))
                .andExpect(jsonPath("$.departments", hasItem("cs")))
                .andExpect(jsonPath("$.actions", hasItem("Tạo khách hàng")));
    }

    @Test
    void crmManagerIsForbidden() throws Exception {
        mockMvc.perform(get("/api/crm/audit-logs")
                        .with(user(CS_LEAD_ID).authorities(new SimpleGrantedAuthority("DEPT_CS"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerSupportIsForbidden() throws Exception {
        mockMvc.perform(get("/api/crm/audit-logs")
                        .with(user(CS_ID).authorities(new SimpleGrantedAuthority("DEPT_CS"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void salesIsForbidden() throws Exception {
        mockMvc.perform(get("/api/crm/audit-logs")
                        .with(user(SALES_ID).authorities(new SimpleGrantedAuthority("DEPT_SALES"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousIsRejected() throws Exception {
        // The shared backend security chain answers unauthenticated calls with 403 (no auth entry point).
        mockMvc.perform(get("/api/crm/audit-logs"))
                .andExpect(status().isForbidden());
    }
}
