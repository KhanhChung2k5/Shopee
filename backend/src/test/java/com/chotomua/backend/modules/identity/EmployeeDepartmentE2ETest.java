package com.chotomua.backend.modules.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import tools.jackson.databind.ObjectMapper;

/**
 * KAN-177: admin creates a department=warehouse employee, that employee logs
 * in, and the resulting JWT only grants warehouse-level access — it must be
 * rejected from the admin-only /employees management route. Seeds its own
 * admin account directly via the repositories (there is no bootstrap/seed
 * admin in the DB) so the whole chain runs against the real server + DB.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class EmployeeDepartmentE2ETest {

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmployeeRepository employeeRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();

    private String baseUrl() {
        return "http://localhost:" + port;
    }

    @Test
    void warehouseEmployeeCannotAccessAdminOnlyEmployeeRoute() throws Exception {
        String adminEmail = "e2e-admin-" + UUID.randomUUID() + "@example.com";
        String adminPassword = "admin1234";
        User adminUser = new User("staff", passwordEncoder.encode(adminPassword));
        adminUser.setEmail(adminEmail);
        adminUser.setFullName("E2E Admin");
        adminUser = userRepository.save(adminUser);
        employeeRepository.save(new Employee(adminUser, "admin"));

        String adminToken = login(adminEmail, adminPassword);

        String warehouseEmail = "e2e-warehouse-" + UUID.randomUUID() + "@example.com";
        String warehousePassword = "warehouse1234";
        HttpResponse<String> createResponse = postJson("/employees", Map.of(
                "email", warehouseEmail,
                "password", warehousePassword,
                "fullName", "E2E Warehouse Staff",
                "department", "warehouse"
        ), adminToken);
        assertThat(createResponse.statusCode()).isEqualTo(201);
        Map<String, Object> createBody = json.readValue(createResponse.body(), Map.class);
        assertThat(createBody).containsEntry("department", "warehouse");

        String warehouseToken = login(warehouseEmail, warehousePassword);

        HttpResponse<String> listAsWarehouse = getJson("/employees", warehouseToken);
        assertThat(listAsWarehouse.statusCode()).isEqualTo(403);

        HttpResponse<String> meAsWarehouse = getJson("/users/me", warehouseToken);
        assertThat(meAsWarehouse.statusCode()).isEqualTo(200);

        HttpResponse<String> listAsAdmin = getJson("/employees", adminToken);
        assertThat(listAsAdmin.statusCode()).isEqualTo(200);
        List<?> employees = json.readValue(listAsAdmin.body(), List.class);
        assertThat(employees).isNotEmpty();
    }

    private String login(String emailOrPhone, String password) throws Exception {
        HttpResponse<String> response = postJson("/auth/login",
                Map.of("emailOrPhone", emailOrPhone, "password", password), null);
        assertThat(response.statusCode()).isEqualTo(200);
        Map<String, Object> body = json.readValue(response.body(), Map.class);
        return (String) body.get("token");
    }

    private HttpResponse<String> postJson(String path, Map<String, Object> body, String bearerToken) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (bearerToken != null) {
            builder.header("Authorization", "Bearer " + bearerToken);
        }
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> getJson(String path, String bearerToken) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder().uri(URI.create(baseUrl() + path)).GET();
        if (bearerToken != null) {
            builder.header("Authorization", "Bearer " + bearerToken);
        }
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
