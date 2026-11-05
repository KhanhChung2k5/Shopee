package com.chotomua.backend.modules.order;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
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
 * A delivered, paid order gets an invoice with the VAT inside its total split out; the buyer reads it, a stranger
 * cannot; sales reissue it for a company and the old one stays as cancelled. Rolled back; the invoice number
 * sequence (not transactional) is put back afterwards so no number is skipped on the shared database.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class InvoiceFlowTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private InvoiceService invoices;

    private final UUID buyer = UUID.randomUUID();
    private final UUID salesUser = UUID.randomUUID();
    private final UUID warehouseUser = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();
    private Map<String, Object> sequenceBefore;

    @BeforeEach
    void seedDeliveredPaidOrder() {
        sequenceBefore = jdbc.queryForMap("SELECT last_value, is_called FROM invoice_no_seq");
        UUID variant = jdbc.queryForObject("SELECT id FROM product_variants LIMIT 1", UUID.class);
        jdbc.update("INSERT INTO users (id, role, email, password_hash, full_name) VALUES (?, 'buyer', ?, 'x', 'Người mua thử')",
                buyer, "invoice-buyer-" + buyer + "@example.com");
        for (Object[] staff : new Object[][] {{salesUser, "sales"}, {warehouseUser, "warehouse"}}) {
            jdbc.update("INSERT INTO users (id, role, email, password_hash, full_name) VALUES (?, 'staff', ?, 'x', 'NV thử')",
                    staff[0], "invoice-staff-" + staff[0] + "@example.com");
            jdbc.update("INSERT INTO employees (id, user_id, department) VALUES (?, ?, ?)", UUID.randomUUID(), staff[0], staff[1]);
        }
        UUID address = UUID.randomUUID();
        jdbc.update("INSERT INTO addresses (id, user_id, recipient_name, phone, full_address) VALUES (?, ?, 'A', '0900000000', 'HCM')",
                address, buyer);
        jdbc.update("INSERT INTO orders (id, user_id, address_id, shipping_address_snapshot, subtotal_amount, total_amount, status, "
                + "recipient_name_snapshot, recipient_phone_snapshot) VALUES (?, ?, ?, '1 Lê Lợi, Q.1, HCM', 1100000, 1100000, 'delivered', 'Nguyễn A', '0911111111')",
                orderId, buyer, address);
        jdbc.update("INSERT INTO order_items (id, order_id, variant_id, quantity, unit_price, line_total, product_name_snapshot) "
                + "VALUES (?, ?, ?, 2, 550000, 1100000, 'Tay cầm thử')", UUID.randomUUID(), orderId, variant);
        jdbc.update("INSERT INTO payments (id, order_id, user_id, purpose, method, amount, status, paid_at) "
                + "VALUES (?, ?, ?, 'checkout', 'cod', 1100000, 'paid', now())", UUID.randomUUID(), orderId, buyer);
    }

    @AfterEach
    void putTheSequenceBack() {
        jdbc.queryForObject("SELECT setval('invoice_no_seq', ?, ?)", Long.class,
                ((Number) sequenceBefore.get("last_value")).longValue(), sequenceBefore.get("is_called"));
    }

    @Test
    void deliveredPaidOrderGetsAnInvoiceTheBuyerCanRead() throws Exception {
        Invoice invoice = invoices.issueIfDue(orderId).orElseThrow();
        assertThat(invoice.getInvoiceNo()).matches("HD\\d{6}");
        assertThat(invoice.getTotalAmount()).isEqualByComparingTo("1100000");
        assertThat(invoice.getPreTaxAmount()).isEqualByComparingTo("1000000");
        assertThat(invoice.getVatAmount()).isEqualByComparingTo("100000");
        assertThat(invoice.getBuyerName()).isEqualTo("Nguyễn A");
        // A second delivery event does not issue a second invoice.
        assertThat(invoices.issueIfDue(orderId).orElseThrow().getId()).isEqualTo(invoice.getId());

        mockMvc.perform(get("/orders/" + orderId + "/invoice").with(as(buyer, "ROLE_BUYER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.current.invoiceNo").value(invoice.getInvoiceNo()))
                .andExpect(jsonPath("$.current.lines[0].quantity").value(2))
                .andExpect(jsonPath("$.current.vatRate").value(10));
        mockMvc.perform(get("/orders/" + orderId + "/invoice").with(as(UUID.randomUUID(), "ROLE_BUYER")))
                .andExpect(status().isNotFound());
    }

    @Test
    void salesReissueForACompanyAndTheOldInvoiceIsKeptAsCancelled() throws Exception {
        Invoice first = invoices.issueIfDue(orderId).orElseThrow();
        String company = """
                {"buyerName":"Nguyễn A","buyerCompany":"Công ty TNHH Thử","buyerTaxCode":"0312345678",
                 "buyerAddress":"12 Nguyễn Huệ, Q.1, HCM","reason":"Khách yêu cầu xuất hoá đơn công ty"}
                """;
        mockMvc.perform(post("/orders/" + orderId + "/invoice/reissue").with(as(warehouseUser, "ROLE_STAFF", "DEPT_WAREHOUSE"))
                        .contentType(MediaType.APPLICATION_JSON).content(company))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/orders/" + orderId + "/invoice/reissue").with(as(salesUser, "ROLE_STAFF", "DEPT_SALES"))
                        .contentType(MediaType.APPLICATION_JSON).content(company.replace("0312345678", "12345")))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/orders/" + orderId + "/invoice/reissue").with(as(salesUser, "ROLE_STAFF", "DEPT_SALES"))
                        .contentType(MediaType.APPLICATION_JSON).content(company))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.buyerCompany").value("Công ty TNHH Thử"))
                .andExpect(jsonPath("$.replacesInvoiceId").value(first.getId().toString()));

        mockMvc.perform(get("/orders/" + orderId + "/invoice").with(as(salesUser, "ROLE_STAFF", "DEPT_SALES")))
                .andExpect(jsonPath("$.current.buyerTaxCode").value("0312345678"))
                .andExpect(jsonPath("$.cancelled[0].invoiceNo").value(first.getInvoiceNo()))
                .andExpect(jsonPath("$.cancelled[0].cancelReason").value("Khách yêu cầu xuất hoá đơn công ty"));
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM invoices WHERE order_id = ? AND status = 'issued'", Integer.class, orderId))
                .isEqualTo(1);
    }

    @Test
    void anUnpaidOrderGetsNoInvoice() {
        jdbc.update("UPDATE payments SET status = 'pending', paid_at = NULL WHERE order_id = ?", orderId);
        assertThat(invoices.issueIfDue(orderId)).isEmpty();
    }

    private static RequestPostProcessor as(UUID userId, String... authorities) {
        return authentication(new UsernamePasswordAuthenticationToken(userId.toString(), null,
                Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList()));
    }
}
