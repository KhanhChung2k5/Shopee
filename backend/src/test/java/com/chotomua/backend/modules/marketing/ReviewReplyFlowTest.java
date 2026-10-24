package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import jakarta.persistence.EntityManager;
import java.util.Arrays;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

/**
 * Buyer reviews a delivered item → it shows up in the staff "unreplied" list → a CS employee replies →
 * the reply is persisted and the review leaves the unreplied list. Runs in a rolled-back transaction,
 * so the shared database is left untouched.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReviewReplyFlowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EntityManager entityManager;

    private final UUID buyer = UUID.randomUUID();
    private final UUID csUser = UUID.randomUUID();
    private UUID orderItem;

    @BeforeEach
    void seedDeliveredOrderAndCsEmployee() {
        UUID variant = jdbc.queryForObject("SELECT id FROM product_variants LIMIT 1", UUID.class);
        jdbc.update("INSERT INTO users (id, role, email, password_hash, full_name) VALUES (?, 'buyer', ?, 'x', 'Người mua thử')",
                buyer, "review-buyer-" + buyer + "@example.com");
        jdbc.update("INSERT INTO users (id, role, email, password_hash, full_name) VALUES (?, 'staff', ?, 'x', 'CSKH thử')",
                csUser, "review-cs-" + csUser + "@example.com");
        jdbc.update("INSERT INTO employees (id, user_id, department) VALUES (?, ?, 'cs')", UUID.randomUUID(), csUser);
        UUID address = UUID.randomUUID();
        jdbc.update("INSERT INTO addresses (id, user_id, recipient_name, phone, full_address) VALUES (?, ?, 'A', '0900000000', 'HCM')",
                address, buyer);
        UUID order = UUID.randomUUID();
        jdbc.update("INSERT INTO orders (id, user_id, address_id, shipping_address_snapshot, subtotal_amount, total_amount, status) "
                + "VALUES (?, ?, ?, 'HCM', 100000, 100000, 'delivered')", order, buyer, address);
        orderItem = UUID.randomUUID();
        jdbc.update("INSERT INTO order_items (id, order_id, variant_id, quantity, unit_price, line_total, product_name_snapshot) "
                + "VALUES (?, ?, ?, 1, 100000, 100000, 'Tay cầm thử')", orderItem, order, variant);
    }

    @Test
    void csRepliesToABuyerReviewAndTheReplyIsSaved() throws Exception {
        String created = mockMvc.perform(post("/reviews").with(buyerAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderItemId\":\"%s\",\"rating\":4,\"comment\":\"Giao nhanh, hộp hơi móp\"}".formatted(orderItem)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String reviewId = JsonPath.read(created, "$.id");

        mockMvc.perform(get("/reviews/manage").param("unreplied", "true").with(staff("DEPT_CS")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", hasItem(reviewId)))
                .andExpect(jsonPath("$[?(@.id == '%s')].productName".formatted(reviewId), hasItem("Tay cầm thử")))
                .andExpect(jsonPath("$[?(@.id == '%s')].buyerName".formatted(reviewId), hasItem("Người mua thử")));

        mockMvc.perform(patch("/reviews/" + reviewId + "/reply").with(staff("DEPT_CS"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"replyText\":\"  Shop xin lỗi, lần sau sẽ đóng gói kỹ hơn ạ.  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.replyText").value("Shop xin lỗi, lần sau sẽ đóng gói kỹ hơn ạ."));

        entityManager.flush(); // the test transaction holds the JPA write until flushed
        assertThat(jdbc.queryForObject("SELECT reply_text FROM reviews WHERE id = ?", String.class, UUID.fromString(reviewId)))
                .isEqualTo("Shop xin lỗi, lần sau sẽ đóng gói kỹ hơn ạ.");
        mockMvc.perform(get("/reviews/manage").param("unreplied", "true").with(staff("DEPT_CS")))
                .andExpect(jsonPath("$[*].id", not(hasItem(reviewId))));
        mockMvc.perform(get("/reviews/manage").with(staff("DEPT_CS")))
                .andExpect(jsonPath("$[?(@.id == '%s')].repliedByName".formatted(reviewId), hasItem("CSKH thử")));
    }

    @Test
    void buyersAndWarehouseStaffCannotOpenTheModerationList() throws Exception {
        mockMvc.perform(get("/reviews/manage").with(buyerAuth())).andExpect(status().isForbidden());
        mockMvc.perform(get("/reviews/manage").with(staff("DEPT_WAREHOUSE"))).andExpect(status().isForbidden());
    }

    private RequestPostProcessor buyerAuth() {
        return as(buyer, "ROLE_BUYER");
    }

    private RequestPostProcessor staff(String department) {
        return as(csUser, "ROLE_STAFF", department);
    }

    /** Same shape as the JWT filter: the principal is the user id string. */
    private static RequestPostProcessor as(UUID userId, String... authorities) {
        return authentication(new UsernamePasswordAuthenticationToken(userId.toString(), null,
                Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList()));
    }
}
