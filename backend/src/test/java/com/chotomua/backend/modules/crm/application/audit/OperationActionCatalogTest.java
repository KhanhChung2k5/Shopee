package com.chotomua.backend.modules.crm.application.audit;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/** The audit log keeps every business write, wherever its endpoint lives, and none of the background noise. */
class OperationActionCatalogTest {

    private static final String ID = "3c9d5361-c1d0-5d68-8965-8dea8d30dd93";

    @Test
    void writesOutsideTheApiPrefixAreLoggedWithAReadableAction() {
        assertThat(OperationActionCatalog.skip("PATCH", "/customers/" + ID + "/status")).isFalse();
        assertThat(OperationActionCatalog.describe("PATCH", "/customers/" + ID + "/status")).isEqualTo("Đổi trạng thái khách hàng");
        assertThat(OperationActionCatalog.describe("PATCH", "/refund-returns/" + ID + "/refunded")).isEqualTo("Ghi nhận đã chuyển tiền hoàn");
        assertThat(OperationActionCatalog.describe("PATCH", "/orders/" + ID + "/payment-received")).isEqualTo("Xác nhận đã nhận thanh toán");
        assertThat(OperationActionCatalog.describe("POST", "/api/catalog/goods-receipts/" + ID + "/approve")).isEqualTo("Duyệt phiếu nhập");
    }

    @Test
    void readsHeartbeatsCartAndLoginAreSkipped() {
        assertThat(OperationActionCatalog.skip("GET", "/orders")).isTrue();
        assertThat(OperationActionCatalog.skip("POST", "/api/conversations/presence")).isTrue();
        assertThat(OperationActionCatalog.skip("POST", "/api/conversations/" + ID + "/typing")).isTrue();
        assertThat(OperationActionCatalog.skip("POST", "/cart-items")).isTrue();
        assertThat(OperationActionCatalog.skip("POST", "/auth/login")).isTrue();
        assertThat(OperationActionCatalog.skip("POST", "/orders/preview")).isTrue();
        assertThat(OperationActionCatalog.skip("POST", "/orders")).isFalse();
    }
}
