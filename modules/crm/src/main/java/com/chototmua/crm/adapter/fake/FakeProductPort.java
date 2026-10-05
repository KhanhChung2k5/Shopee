package com.chototmua.crm.adapter.fake;

import com.chototmua.crm.port.ProductPort;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Bản giả lập danh mục: mặc định không có sản phẩm đang bán cho đến khi bài kiểm tra gieo dữ liệu.
 */
@Component
@Profile("crm-fake")
public class FakeProductPort implements ProductPort {

    private final Map<UUID, Boolean> activeById = new HashMap<>();

    /** Đánh dấu sản phẩm đang bán. */
    public void seedActive(UUID productId) {
        activeById.put(productId, true);
    }

    /** Đánh dấu sản phẩm ngừng bán. */
    public void seedInactive(UUID productId) {
        activeById.put(productId, false);
    }

    @Override
    public boolean existsActive(UUID productId) {
        return Boolean.TRUE.equals(activeById.get(productId));
    }
}
