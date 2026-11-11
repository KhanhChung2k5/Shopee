package com.chototmua.crm.web.customer;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Hợp đồng REST vòng đời khách: quản trị và quản lý CRM được thêm/khóa/xóa;
 * chỉ quản trị viên khôi phục khách đã xóa.
 */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
@SuppressWarnings("null")
class CustomerControllerTest {

    private static final String ADMIN_ID = "11111111-1111-1111-1111-111111111111";
    private static final String CRM_ID = "22222222-2222-2222-2222-222222222222";
    private static final String CS_ID = "33333333-3333-3333-3333-333333333333";
    private static final String GUEST_ID = "44444444-4444-4444-4444-444444444444";

    private static final String CREATE_BODY = """
            {
              "fullName": "Nguyen Van A",
              "email": "a@example.com",
              "phone": "0901111111",
              "gender": "male",
              "dob": "1998-05-01"
            }
            """;

    private static final String UPDATE_BODY = """
            {
              "fullName": "Nguyen Van B",
              "email": "b@example.com",
              "phone": "0902222222",
              "gender": "female",
              "dob": "1999-06-15"
            }
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private FakeIdentityPort identity;

    @BeforeEach
    void setUp() {
        identity.reset();
        identity.seedStaff(UUID.fromString(ADMIN_ID), StaffDepartment.ADMIN);
        identity.seedStaff(UUID.fromString(CRM_ID), StaffDepartment.CRM);
        identity.seedStaff(UUID.fromString(CS_ID), StaffDepartment.CS);
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void adminCanCreateLockUnlockAndSoftDelete() throws Exception {
        String id = createCustomerAndReturnId();

        mockMvc.perform(patch("/api/customers/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"locked\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(CustomerStatus.LOCKED));

        mockMvc.perform(patch("/api/customers/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"active\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(CustomerStatus.ACTIVE));

        mockMvc.perform(patch("/api/customers/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"deleted\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(CustomerStatus.DELETED));
    }

    @Test
    @WithMockUser(username = CRM_ID, authorities = "crm")
    void crmManagerCanCreateLockUnlockAndSoftDelete() throws Exception {
        String id = createCustomerAndReturnId();

        mockMvc.perform(patch("/api/customers/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"locked\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(CustomerStatus.LOCKED));

        mockMvc.perform(patch("/api/customers/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"active\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(CustomerStatus.ACTIVE));

        mockMvc.perform(patch("/api/customers/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"deleted\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(CustomerStatus.DELETED));
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "cs")
    void customerServiceStaffIsForbiddenOnCreateLockUnlockSoftDelete() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value(containsString("quyền")));

        CustomerView existing = identity.seedCustomer(
                "Tran Thi B", "female", LocalDate.of(2002, 1, 15), CustomerStatus.ACTIVE);

        mockMvc.perform(patch("/api/customers/" + existing.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"locked\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/customers/" + existing.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"active\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/customers/" + existing.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Tran Thi B Updated",
                                  "email": "b2@example.com",
                                  "phone": "0909999999",
                                  "gender": "female",
                                  "dob": "2002-01-15"
                                }
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/customers/" + existing.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"deleted\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = GUEST_ID, authorities = "customer")
    void endCustomerIsForbiddenOnMutations() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").isString());
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void softDeletedCustomerIsHiddenUntilIncludeDeletedAndAdminCanRestore() throws Exception {
        CustomerView existing = identity.seedCustomer(
                "Le Van C", "male", LocalDate.of(2000, 12, 12), CustomerStatus.ACTIVE);

        mockMvc.perform(patch("/api/customers/" + existing.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"deleted\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(CustomerStatus.DELETED));

        mockMvc.perform(get("/api/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));

        mockMvc.perform(get("/api/customers").param("includeDeleted", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(existing.id().toString()))
                .andExpect(jsonPath("$.data[0].status").value(CustomerStatus.DELETED));

        mockMvc.perform(post("/api/customers/" + existing.id() + "/restore"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(CustomerStatus.ACTIVE));

        mockMvc.perform(get("/api/customers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].id").value(existing.id().toString()))
                .andExpect(jsonPath("$.data[0].status").value(CustomerStatus.ACTIVE));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void adminCanRestoreDeletedCustomerViaPatchActive() throws Exception {
        CustomerView existing = identity.seedCustomer(
                "Pham Van D", "male", LocalDate.of(1999, 4, 4), CustomerStatus.DELETED);

        mockMvc.perform(patch("/api/customers/" + existing.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"active\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(CustomerStatus.ACTIVE));
    }

    @Test
    @WithMockUser(username = CRM_ID, authorities = "crm")
    void crmManagerCannotRestoreDeletedCustomer() throws Exception {
        CustomerView existing = identity.seedCustomer(
                "Le Van C", "male", LocalDate.of(2000, 12, 12), CustomerStatus.DELETED);

        mockMvc.perform(post("/api/customers/" + existing.id() + "/restore"))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/customers/" + existing.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"active\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.message").value(containsString("quản trị")));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void createRejectsBlankNameWithVietnameseMessage() throws Exception {
        mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"\",\"email\":\"a@example.com\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.message").value(containsString("không hợp lệ")));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void adminCanUpdateCustomerProfile() throws Exception {
        String id = createCustomerAndReturnId();

        mockMvc.perform(put("/api/customers/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nguyen Van B"))
                .andExpect(jsonPath("$.email").value("b@example.com"))
                .andExpect(jsonPath("$.phone").value("0902222222"))
                .andExpect(jsonPath("$.gender").value("female"))
                .andExpect(jsonPath("$.dob").value("1999-06-15"))
                .andExpect(jsonPath("$.status").value(CustomerStatus.ACTIVE));
    }

    @Test
    @WithMockUser(username = CRM_ID, authorities = "crm")
    void crmManagerCanUpdateCustomerProfile() throws Exception {
        CustomerView existing = identity.seedCustomer(
                "Tran Thi B", "female", LocalDate.of(2002, 1, 15), CustomerStatus.LOCKED);

        mockMvc.perform(put("/api/customers/" + existing.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Nguyen Van B"))
                .andExpect(jsonPath("$.status").value(CustomerStatus.LOCKED));
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void cannotUpdateDeletedCustomer() throws Exception {
        CustomerView existing = identity.seedCustomer(
                "Gone", "male", LocalDate.of(1988, 3, 3), CustomerStatus.DELETED);

        mockMvc.perform(put("/api/customers/" + existing.id())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(UPDATE_BODY))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.error.message").value(containsString("xóa")));
    }

    @Test
    @WithMockUser(username = CS_ID, authorities = "cs")
    void customerServiceCanViewDetailAndAddressesButCannotMutateAddress() throws Exception {
        CustomerView existing = identity.seedCustomer(
                "Tran Thi B", "female", LocalDate.of(2002, 1, 15), CustomerStatus.ACTIVE);
        UUID addressId = UUID.fromString("a1000001-0000-4000-8000-000000000099");
        identity.seedAddress(addressId, existing.id(), "Tran Thi B", "0902222222", "45 Vo Van Tan", true);

        mockMvc.perform(get("/api/customers/" + existing.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customer.fullName").value("Tran Thi B"))
                .andExpect(jsonPath("$.addresses.length()").value(1))
                .andExpect(jsonPath("$.addresses[0].fullAddress").value("45 Vo Van Tan"));

        mockMvc.perform(post("/api/customers/" + existing.id() + "/addresses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "recipientName": "Tran Thi B",
                                  "phone": "0902222222",
                                  "fullAddress": "1 Le Loi",
                                  "isDefault": true
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = ADMIN_ID, authorities = "admin")
    void adminCanCreateAndUpdateCustomerAddress() throws Exception {
        String customerId = createCustomerAndReturnId();

        String createdBody = mockMvc.perform(post("/api/customers/" + customerId + "/addresses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "recipientName": "Nguyen Van A",
                                  "phone": "0901111111",
                                  "fullAddress": "12 Nguyen Hue, Q.1",
                                  "isDefault": true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fullAddress").value("12 Nguyen Hue, Q.1"))
                .andExpect(jsonPath("$.isDefault").value(true))
                .andReturn()
                .getResponse()
                .getContentAsString();
        int idStart = createdBody.indexOf("\"id\":\"") + 6;
        String addressId = createdBody.substring(idStart, idStart + 36);

        mockMvc.perform(put("/api/customers/" + customerId + "/addresses/" + addressId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "recipientName": "Nguyen Van A",
                                  "phone": "0901111111",
                                  "fullAddress": "99 Pasteur, Q.1",
                                  "isDefault": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullAddress").value("99 Pasteur, Q.1"));
    }

    private String createCustomerAndReturnId() throws Exception {
        String body = mockMvc.perform(post("/api/customers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(CREATE_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(CustomerStatus.ACTIVE))
                .andExpect(jsonPath("$.dob").value("1998-05-01"))
                .andExpect(jsonPath("$.gender").value("male"))
                .andReturn()
                .getResponse()
                .getContentAsString();
        int idStart = body.indexOf("\"id\":\"") + 6;
        return body.substring(idStart, idStart + 36);
    }
}
