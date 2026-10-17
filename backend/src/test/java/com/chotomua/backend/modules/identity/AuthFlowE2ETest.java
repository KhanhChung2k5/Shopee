package com.chotomua.backend.modules.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import tools.jackson.databind.ObjectMapper;

/**
 * KAN-176: full HTTP round-trip against a real running server + real DB
 * (Neon) — register a brand-new account, log in with the returned
 * credentials, then call an endpoint that requires an authenticated
 * "buyer" (/users/me) and confirm it succeeds.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuthFlowE2ETest {

    @LocalServerPort
    private int port;

    private final HttpClient http = HttpClient.newHttpClient();
    private final ObjectMapper json = new ObjectMapper();

    private String baseUrl() {
        return "http://localhost:" + port;
    }

    @Test
    void registerThenLoginThenCallProtectedBuyerEndpoint() throws Exception {
        String email = "e2e-" + UUID.randomUUID() + "@example.com";
        String password = "abc12345";

        HttpResponse<String> registerResponse = postJson("/auth/register", Map.of(
                "email", email,
                "password", password,
                "fullName", "E2E Test User"
        ), null);
        assertThat(registerResponse.statusCode()).isEqualTo(201);
        Map<String, Object> registerBody = json.readValue(registerResponse.body(), Map.class);
        assertThat(registerBody).containsEntry("role", "buyer");

        HttpResponse<String> loginResponse = postJson("/auth/login",
                Map.of("emailOrPhone", email, "password", password), null);
        assertThat(loginResponse.statusCode()).isEqualTo(200);
        Map<String, Object> loginBody = json.readValue(loginResponse.body(), Map.class);
        String token = (String) loginBody.get("token");
        assertThat(token).isNotBlank();

        HttpResponse<String> meResponse = getJson("/users/me", token);
        assertThat(meResponse.statusCode()).isEqualTo(200);
        Map<String, Object> meBody = json.readValue(meResponse.body(), Map.class);
        assertThat(meBody).containsEntry("fullName", "E2E Test User");
    }

    @Test
    void protectedEndpointRejectsRequestsWithoutToken() throws Exception {
        HttpResponse<String> response = getJson("/users/me", null);
        assertThat(response.statusCode()).isEqualTo(403);
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
