package com.chototmua.crm.port;

import java.util.UUID;

/**
 * Cổng sang danh mục sản phẩm (nhóm B).
 * CRM chỉ hỏi sản phẩm còn bán — không tạo/sửa/xóa sản phẩm.
 */
public interface ProductPort {

    /** True khi sản phẩm tồn tại và đang bán. */
    boolean existsActive(UUID productId);
}
