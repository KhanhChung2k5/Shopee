package com.chototmua.crm.web.catalog;

import com.chototmua.crm.application.catalog.ProductCatalogService;
import com.chototmua.crm.port.dto.ProductFilter;
import com.chototmua.crm.web.CurrentActor;
import com.chototmua.crm.web.dto.AudiencePreviewResponse;
import com.chototmua.crm.web.dto.DeliveredOrderSummary;
import com.chototmua.crm.web.dto.ProductFacetsResponse;
import com.chototmua.crm.web.dto.ProductListResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Đường đọc cho màn Admin CRM: danh mục sản phẩm, bộ lọc và đơn đã giao.
 * Chỉ GET/POST đọc — không tạo, sửa hay xóa sản phẩm. Quản trị, quản lý CRM và CSKH.
 */
@RestController
@RequestMapping("/api/crm")
@PreAuthorize("hasAnyAuthority('admin', 'sales', 'cs')")
public class ProductCatalogController {

    private final ProductCatalogService catalog;
    private final CurrentActor currentActor;

    public ProductCatalogController(ProductCatalogService catalog, CurrentActor currentActor) {
        this.catalog = catalog;
        this.currentActor = currentActor;
    }

    @GetMapping("/products")
    public ProductListResponse search(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String productType,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String genre,
            @RequestParam(required = false) String platform,
            @RequestParam(required = false) BigDecimal priceMin,
            @RequestParam(required = false) BigDecimal priceMax,
            @RequestParam(defaultValue = "true") boolean publishedOnly
    ) {
        ProductFilter filter = new ProductFilter(
                keyword, productType, categoryId, genre, platform, priceMin, priceMax, publishedOnly);
        return catalog.search(currentActor.requireUserId(), filter);
    }

    /** Tra tên sản phẩm theo danh sách id (dùng khi mở lại mục tiêu đã lưu). */
    @GetMapping("/products/lookup")
    public ProductListResponse lookup(@RequestParam(required = false) List<UUID> ids) {
        return catalog.lookup(currentActor.requireUserId(), ids);
    }

    @GetMapping("/products/facets")
    public ProductFacetsResponse facets() {
        return catalog.facets(currentActor.requireUserId());
    }

    /** Ước tính người mua cho tập sản phẩm (id cụ thể ∪ bộ lọc). Không ghi gì. */
    @PostMapping("/products/audience-preview")
    public AudiencePreviewResponse audiencePreview(@RequestBody(required = false) AudiencePreviewRequest request) {
        AudiencePreviewRequest body = request == null ? new AudiencePreviewRequest(null, null) : request;
        return catalog.audiencePreview(currentActor.requireUserId(), body.productIds(), body.filter());
    }

    @GetMapping("/customers/{userId}/delivered-orders")
    public Map<String, List<DeliveredOrderSummary>> deliveredOrders(@PathVariable UUID userId) {
        return Map.of("orders", catalog.deliveredOrders(currentActor.requireUserId(), userId));
    }

    /** Thân yêu cầu ước tính người mua. */
    public record AudiencePreviewRequest(List<UUID> productIds, ProductFilter filter) {
    }
}
