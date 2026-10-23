package com.chototmua.crm.application.catalog;

import com.chototmua.crm.application.exception.CustomerNotFoundException;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.ProductPort;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.port.dto.ProductFilter;
import com.chototmua.crm.port.dto.ProductView;
import com.chototmua.crm.web.dto.AudiencePreviewResponse;
import com.chototmua.crm.web.dto.DeliveredOrderSummary;
import com.chototmua.crm.web.dto.ProductFacetsResponse;
import com.chototmua.crm.web.dto.ProductListResponse;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.UUID;

/**
 * Lớp đọc cho giao diện CRM: tìm sản phẩm, gợi ý bộ lọc, ước tính người mua, đơn đã giao.
 * Chỉ đọc qua cổng — không ghi catalog hay đơn hàng.
 */
@Service
public class ProductCatalogService {

    /** Số dòng tối đa trả về một lần tìm kiếm để màn hình không bị quá tải. */
    public static final int MAX_RESULTS = 200;

    private final IdentityPort identity;
    private final ProductPort products;
    private final OrderPort orders;

    public ProductCatalogService(IdentityPort identity, ProductPort products, OrderPort orders) {
        this.identity = identity;
        this.products = products;
        this.orders = orders;
    }

    /** Tìm sản phẩm theo bộ lọc, cắt tại {@link #MAX_RESULTS}. */
    public ProductListResponse search(UUID actorId, ProductFilter filter) {
        identity.requireAudienceReader(actorId);
        List<ProductView> all = products.search(filter);
        List<ProductView> page = all.size() > MAX_RESULTS ? all.subList(0, MAX_RESULTS) : all;
        return new ProductListResponse(List.copyOf(page), all.size());
    }

    /** Tra tên các sản phẩm đã gắn theo id; id không còn trong catalog thì bỏ qua. */
    public ProductListResponse lookup(UUID actorId, Collection<UUID> ids) {
        identity.requireAudienceReader(actorId);
        List<ProductView> found = new java.util.ArrayList<>();
        if (ids != null) {
            for (UUID id : new LinkedHashSet<>(ids)) {
                if (id != null) {
                    products.find(id).ifPresent(found::add);
                }
            }
        }
        return new ProductListResponse(List.copyOf(found), found.size());
    }

    /** Giá trị có thật trong catalog đang bán, dùng cho ô chọn của bộ lọc. */
    public ProductFacetsResponse facets(UUID actorId) {
        identity.requireAudienceReader(actorId);
        List<ProductView> published = products.search(
                new ProductFilter(null, null, null, null, null, null, null, true));
        Set<String> types = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        Set<String> genres = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        Set<String> platforms = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        Map<UUID, ProductFacetsResponse.CategoryOption> categories = new LinkedHashMap<>();
        for (ProductView product : published) {
            addIfPresent(types, product.productType());
            addIfPresent(genres, product.genre());
            product.platforms().forEach(platform -> addIfPresent(platforms, platform));
            if (product.categoryId() != null) {
                categories.putIfAbsent(
                        product.categoryId(),
                        new ProductFacetsResponse.CategoryOption(product.categoryId(), product.categoryName()));
            }
        }
        List<ProductFacetsResponse.CategoryOption> sortedCategories = categories.values().stream()
                .sorted(Comparator.comparing(
                        ProductFacetsResponse.CategoryOption::name,
                        Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();
        return new ProductFacetsResponse(
                List.copyOf(types), List.copyOf(genres), List.copyOf(platforms), sortedCategories);
    }

    /**
     * Ước tính: bao nhiêu sản phẩm khớp và bao nhiêu khách đang hoạt động từng mua chúng.
     * Cùng cách resolve với lúc gửi chiến dịch (id cụ thể ∪ kết quả lọc).
     */
    public AudiencePreviewResponse audiencePreview(UUID actorId, Collection<UUID> productIds, ProductFilter filter) {
        identity.requireAudienceReader(actorId);
        Set<UUID> resolved = new LinkedHashSet<>();
        if (productIds != null) {
            for (UUID id : productIds) {
                if (id != null) {
                    resolved.add(id);
                }
            }
        }
        if (filter != null && !filter.isUnconstrained()) {
            products.search(filter).forEach(product -> resolved.add(product.id()));
        }
        if (resolved.isEmpty()) {
            return new AudiencePreviewResponse(0, 0);
        }
        int activeBuyers = 0;
        for (UUID buyerId : orders.findBuyersOfProducts(resolved)) {
            try {
                if ("active".equalsIgnoreCase(identity.getCustomer(buyerId).status())) {
                    activeBuyers++;
                }
            } catch (CustomerNotFoundException ignored) {
                // Người mua không còn trên cổng danh tính — không tính.
            }
        }
        return new AudiencePreviewResponse(resolved.size(), activeBuyers);
    }

    /** Các đơn đã giao của một khách, để chọn khi chạy hook demo. */
    public List<DeliveredOrderSummary> deliveredOrders(UUID actorId, UUID userId) {
        identity.requireAudienceReader(actorId);
        return orders.listDeliveredOrders(userId).stream()
                .sorted(Comparator.comparing(
                        DeliveredOrderView::deliveredAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(order -> new DeliveredOrderSummary(
                        order.orderId(),
                        order.userId(),
                        order.totalAmount(),
                        order.deliveredAt(),
                        order.lines().stream()
                                .map(DeliveredOrderLine::productId)
                                .distinct()
                                .toList()))
                .toList();
    }

    private static void addIfPresent(Set<String> target, String value) {
        if (value != null && !value.isBlank()) {
            target.add(value.trim());
        }
    }
}
