package com.chotomua.backend.modules.marketing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
    private UUID orderId;

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
        orderId = order;
        jdbc.update("INSERT INTO orders (id, user_id, address_id, shipping_address_snapshot, subtotal_amount, total_amount, status) "
                + "VALUES (?, ?, ?, 'HCM', 100000, 100000, 'delivered')", order, buyer, address);
        // Reviews are open for 30 days from delivery, which the order's status history records.
        jdbc.update("INSERT INTO order_status_histories (id, order_id, status, changed_at) VALUES (?, ?, 'delivered', now())",
                UUID.randomUUID(), order);
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
    void buyerSeesChangesAndRemovesTheirReviewWithinTheWindow() throws Exception {
        mockMvc.perform(get("/reviews/mine").param("orderId", orderId.toString()).with(buyerAuth()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lines[0].canReview").value(true))
                .andExpect(jsonPath("$.lines[0].review").doesNotExist());
        String reviewId = JsonPath.read(mockMvc.perform(post("/reviews").with(buyerAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderItemId\":\"%s\",\"rating\":5,\"comment\":\"Tốt\"}".formatted(orderItem)))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");

        // After a reload the page knows the line is reviewed and offers to change it, not to review it again.
        mockMvc.perform(get("/reviews/mine").param("orderId", orderId.toString()).with(buyerAuth()))
                .andExpect(jsonPath("$.lines[0].canReview").value(false))
                .andExpect(jsonPath("$.lines[0].canEdit").value(true))
                .andExpect(jsonPath("$.lines[0].review.id").value(reviewId));
        mockMvc.perform(put("/reviews/" + reviewId).with(buyerAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderItemId\":\"%s\",\"rating\":2,\"comment\":\"Đổi ý: pin yếu\"}".formatted(orderItem)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(2))
                .andExpect(jsonPath("$.comment").value("Đổi ý: pin yếu"));
        mockMvc.perform(delete("/reviews/" + reviewId).with(buyerAuth())).andExpect(status().isNoContent());
        mockMvc.perform(get("/reviews/mine").param("orderId", orderId.toString()).with(buyerAuth()))
                .andExpect(jsonPath("$.lines[0].canReview").value(true));
    }

    @Test
    void anotherBuyerCannotChangeAReview() throws Exception {
        String reviewId = JsonPath.read(mockMvc.perform(post("/reviews").with(buyerAuth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderItemId\":\"%s\",\"rating\":5}".formatted(orderItem)))
                .andReturn().getResponse().getContentAsString(), "$.id");
        UUID stranger = UUID.randomUUID();
        mockMvc.perform(put("/reviews/" + reviewId).with(as(stranger, "ROLE_BUYER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderItemId\":\"%s\",\"rating\":1}".formatted(orderItem)))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/reviews/" + reviewId).with(as(stranger, "ROLE_BUYER"))).andExpect(status().isForbidden());
        mockMvc.perform(post("/reviews").with(as(stranger, "ROLE_BUYER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"orderItemId\":\"%s\",\"rating\":1}".formatted(orderItem)))
                .andExpect(status().isForbidden());
    }

    @Test
    void noReviewMoreThan30DaysAfterDeliveryOrOnALineSentBack() throws Exception {
        String body = "{\"orderItemId\":\"%s\",\"rating\":4}".formatted(orderItem);
        jdbc.update("UPDATE order_status_histories SET changed_at = now() - interval '31 days' WHERE order_id = ?", orderId);
        mockMvc.perform(post("/reviews").with(buyerAuth()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Đã quá 30 ngày kể từ khi nhận hàng"));

        jdbc.update("UPDATE order_status_histories SET changed_at = now() WHERE order_id = ?", orderId);
        entityManager.clear(); // the test shares one persistence context; forget the history row read above
        jdbc.update("INSERT INTO refund_returns (id, order_id, order_item_id, kind, status, requested_at) VALUES (?, ?, ?, 'return', 'requested', now())",
                UUID.randomUUID(), orderId, orderItem);
        mockMvc.perform(post("/reviews").with(buyerAuth()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Sản phẩm đã yêu cầu trả hàng nên không đánh giá được"));
        mockMvc.perform(get("/reviews/mine").param("orderId", orderId.toString()).with(buyerAuth()))
                .andExpect(jsonPath("$.lines[0].canReview").value(false))
                .andExpect(jsonPath("$.lines[0].blockedReason").value("Sản phẩm đã yêu cầu trả hàng nên không đánh giá được"));
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
