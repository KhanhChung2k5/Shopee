package com.chotomua.backend.modules.crm.web.dto;

import java.util.List;
import java.util.UUID;

/** Chọn sản phẩm gợi ý để đẩy hộp thư. Rỗng hoặc thiếu thì dùng {@code limit}. */
public record RecommendationPushRequest(List<UUID> productIds) {
}
