package com.chototmua.crm.adapter.fake;

import com.chototmua.crm.port.ProductPort;
import com.chototmua.crm.port.dto.ProductFilter;
import com.chototmua.crm.port.dto.ProductView;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Bản giả lập danh mục: mặc định không có sản phẩm cho đến khi bài kiểm tra gieo dữ liệu.
 */
@Component
@Profile("crm-fake")
public class FakeProductPort implements ProductPort {

    private final Map<UUID, Boolean> activeById = new HashMap<>();
    private final Map<UUID, ProductView> catalog = new LinkedHashMap<>();
    private final List<Sale> sales = new ArrayList<>();

    /** Đánh dấu sản phẩm đang bán. */
    public void seedActive(UUID productId) {
        activeById.put(productId, true);
    }

    /** Đánh dấu sản phẩm ngừng bán. */
    public void seedInactive(UUID productId) {
        activeById.put(productId, false);
    }

    /** Gieo một sản phẩm vào catalog giả (dùng search / find / topSellers). */
    public void seed(ProductView product) {
        catalog.put(product.id(), product);
        if ("published".equalsIgnoreCase(product.status())) {
            activeById.put(product.id(), true);
        } else {
            activeById.put(product.id(), false);
        }
    }

    /** Ghi nhận lượt bán để tính topSellers trên fake. */
    public void seedSale(UUID productId, Instant at, int quantity) {
        sales.add(new Sale(productId, at, quantity));
    }

    /** Xóa dữ liệu giả giữa các bài kiểm tra. */
    public void reset() {
        activeById.clear();
        catalog.clear();
        sales.clear();
    }

    @Override
    public boolean existsActive(UUID productId) {
        return Boolean.TRUE.equals(activeById.get(productId));
    }

    @Override
    public Optional<ProductView> find(UUID productId) {
        return Optional.ofNullable(catalog.get(productId));
    }

    @Override
    public List<ProductView> search(ProductFilter filter) {
        ProductFilter criteria = filter == null
                ? new ProductFilter(null, null, null, null, null, null, null, false)
                : filter;
        return catalog.values().stream()
                .filter(product -> matches(product, criteria))
                .sorted(Comparator.comparing(ProductView::name, Comparator.nullsLast(String::compareToIgnoreCase))
                        .thenComparing(ProductView::id))
                .toList();
    }

    @Override
    public List<ProductView> topSellers(Instant from, Instant to, int limit) {
        if (limit <= 0) {
            return List.of();
        }
        Map<UUID, Integer> soldByProduct = sales.stream()
                .filter(sale -> inRange(sale.at(), from, to))
                .collect(Collectors.groupingBy(
                        Sale::productId,
                        Collectors.summingInt(Sale::quantity)));
        return soldByProduct.entrySet().stream()
                .filter(entry -> catalog.containsKey(entry.getKey()))
                .sorted(Comparator.<Map.Entry<UUID, Integer>>comparingInt(Map.Entry::getValue).reversed()
                        .thenComparing(entry -> catalog.get(entry.getKey()).name(), Comparator.nullsLast(String::compareToIgnoreCase))
                        .thenComparing(Map.Entry::getKey))
                .limit(limit)
                .map(entry -> catalog.get(entry.getKey()))
                .toList();
    }

    private static boolean matches(ProductView product, ProductFilter filter) {
        if (filter.keyword() != null) {
            String needle = filter.keyword().toLowerCase(Locale.ROOT);
            boolean inName = containsIgnoreCase(product.name(), needle);
            boolean inBrand = containsIgnoreCase(product.brandName(), needle);
            if (!inName && !inBrand) {
                return false;
            }
        }
        if (filter.productType() != null
                && !filter.productType().equalsIgnoreCase(nullToEmpty(product.productType()))) {
            return false;
        }
        if (filter.categoryId() != null && !filter.categoryId().equals(product.categoryId())) {
            return false;
        }
        if (filter.genre() != null && !filter.genre().equalsIgnoreCase(nullToEmpty(product.genre()))) {
            return false;
        }
        if (filter.platform() != null) {
            boolean hasPlatform = product.platforms().stream()
                    .anyMatch(platform -> filter.platform().equalsIgnoreCase(platform));
            if (!hasPlatform) {
                return false;
            }
        }
        if (filter.priceMin() != null && !priceAtLeast(product.price(), filter.priceMin())) {
            return false;
        }
        if (filter.priceMax() != null && !priceAtMost(product.price(), filter.priceMax())) {
            return false;
        }
        return !filter.publishedOnly() || "published".equalsIgnoreCase(product.status());
    }

    private static boolean inRange(Instant at, Instant from, Instant to) {
        if (at == null) {
            return false;
        }
        if (from != null && at.isBefore(from)) {
            return false;
        }
        return to == null || !at.isAfter(to);
    }

    private static boolean containsIgnoreCase(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private static boolean priceAtLeast(BigDecimal price, BigDecimal min) {
        return price != null && price.compareTo(min) >= 0;
    }

    private static boolean priceAtMost(BigDecimal price, BigDecimal max) {
        return price != null && price.compareTo(max) <= 0;
    }

    private record Sale(UUID productId, Instant at, int quantity) {
    }
}
