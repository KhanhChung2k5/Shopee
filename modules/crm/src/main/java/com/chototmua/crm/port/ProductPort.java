package com.chototmua.crm.port;

import com.chototmua.crm.port.dto.ProductFilter;
import com.chototmua.crm.port.dto.ProductView;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Cổng sang danh mục sản phẩm (nhóm B).
 * CRM chỉ hỏi sản phẩm còn bán / lọc catalog — không tạo/sửa/xóa sản phẩm.
 */
public interface ProductPort {

    /** True khi sản phẩm tồn tại và đang bán. */
    boolean existsActive(UUID productId);

    /** Một sản phẩm theo mã; không thấy thì empty. */
    Optional<ProductView> find(UUID productId);

    /** Lọc catalog theo từng tiêu chí (và kết hợp). Tiêu chí trống thì bỏ qua. */
    List<ProductView> search(ProductFilter filter);

    /**
     * Sản phẩm bán chạy trong khoảng thời gian, xếp theo số lượng đã bán giảm dần.
     * Chỉ đọc đơn {@code delivered}.
     */
    List<ProductView> topSellers(Instant from, Instant to, int limit);
}
