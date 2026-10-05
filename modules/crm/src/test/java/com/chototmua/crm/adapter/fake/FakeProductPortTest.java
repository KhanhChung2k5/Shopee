package com.chototmua.crm.adapter.fake;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Kiểm tra bản giả lập danh mục: chỉ sản phẩm đang bán mới được tính là tồn tại. */
class FakeProductPortTest {

    private FakeProductPort products;

    @BeforeEach
    void setUp() {
        products = new FakeProductPort();
    }

    @Test
    void unknownProductIsNotActive() {
        assertThat(products.existsActive(UUID.randomUUID())).isFalse();
    }

    @Test
    void seededActiveProductExists() {
        UUID id = UUID.randomUUID();
        products.seedActive(id);
        assertThat(products.existsActive(id)).isTrue();
    }

    @Test
    void seededInactiveProductDoesNotExistAsActive() {
        UUID id = UUID.randomUUID();
        products.seedInactive(id);
        assertThat(products.existsActive(id)).isFalse();
    }
}
