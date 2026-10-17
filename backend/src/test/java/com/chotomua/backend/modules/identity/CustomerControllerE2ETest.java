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
 * Covers the CRM "Khách hàng" admin endpoints added when real buyer data
 * replaced the hardcoded mock customer list: GET /customers is admin-only
 * and reflects real users; PATCH .../status persists the lock/soft-delete
 * action that AdminCustomersPage performs.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class CustomerControllerE2ETest {

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
    void adminCanListAndLockRealCustomerButBuyerCannot() throws Exception {
        String adminEmail = "e2e-admin-" + UUID.randomUUID() + "@example.com";
        String adminPassword = "admin1234";
        User adminUser = new User("staff", passwordEncoder.encode(adminPassword));
        adminUser.setEmail(adminEmail);
        adminUser.setFullName("E2E Admin");
        adminUser = userRepository.save(adminUser);
        employeeRepository.save(new Employee(adminUser, "admin"));
        String adminToken = login(adminEmail, adminPassword);

        String buyerEmail = "e2e-" + UUID.randomUUID() + "@example.com";
        String buyerPassword = "abc12345";
        HttpResponse<String> registerResponse = postJson("/auth/register", Map.of(
                "email", buyerEmail, "password", buyerPassword, "fullName", "E2E Real Customer"
        ), null);
        assertThat(registerResponse.statusCode()).isEqualTo(201);
        String buyerId = (String) json.readValue(registerResponse.body(), Map.class).get("userId");
        String buyerToken = login(buyerEmail, buyerPassword);

        // A buyer may not browse the customer list — admin-only.
        HttpResponse<String> listAsBuyer = getJson("/customers", buyerToken);
        assertThat(listAsBuyer.statusCode()).isEqualTo(403);

        HttpResponse<String> listAsAdmin = getJson("/customers", adminToken);
        assertThat(listAsAdmin.statusCode()).isEqualTo(200);
        List<Map> customers = json.readValue(listAsAdmin.body(), List.class);
        assertThat(customers).anySatisfy(c -> {
            assertThat(c.get("id")).isEqualTo(buyerId);
            assertThat(c.get("fullName")).isEqualTo("E2E Real Customer");
            assertThat(c.get("status")).isEqualTo("active");
            assertThat(((Number) c.get("totalOrders")).intValue()).isZero();
        });

        HttpResponse<String> lockResponse = patchJson("/customers/" + buyerId + "/status",
                Map.of("status", "locked"), adminToken);
        assertThat(lockResponse.statusCode()).isEqualTo(200);
        assertThat(json.readValue(lockResponse.body(), Map.class)).containsEntry("status", "locked");

        // Locked accounts can no longer log in (AuthService checks status == "active").
        HttpResponse<String> loginAfterLock = postJson("/auth/login",
                Map.of("emailOrPhone", buyerEmail, "password", buyerPassword), null);
        assertThat(loginAfterLock.statusCode()).isEqualTo(401);
    }

    private String login(String emailOrPhone, String password) throws Exception {
        HttpResponse<String> response = postJson("/auth/login",
                Map.of("emailOrPhone", emailOrPhone, "password", password), null);
        assertThat(response.statusCode()).isEqualTo(200);
        return (String) json.readValue(response.body(), Map.class).get("token");
    }

    private HttpResponse<String> postJson(String path, Map<String, Object> body, String bearerToken) throws Exception {
        return send("POST", path, body, bearerToken);
    }

    private HttpResponse<String> patchJson(String path, Map<String, Object> body, String bearerToken) throws Exception {
        return send("PATCH", path, body, bearerToken);
    }

    private HttpResponse<String> getJson(String path, String bearerToken) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder().uri(URI.create(baseUrl() + path)).GET();
        if (bearerToken != null) builder.header("Authorization", "Bearer " + bearerToken);
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> send(String method, String path, Map<String, Object> body, String bearerToken) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(baseUrl() + path))
                .header("Content-Type", "application/json")
                .method(method, HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (bearerToken != null) builder.header("Authorization", "Bearer " + bearerToken);
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }
}
