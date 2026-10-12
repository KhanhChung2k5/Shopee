package com.chotomua.backend.modules.catalog;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.JsonNodeFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/** Public product discovery endpoints; internal CRUD remains under /api/catalog/products. */
@RestController
@RequestMapping("/api/products")
@Transactional(readOnly = true)
public class PublicProductController {

    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final InventoryStockRepository stocks;
    private final CategoryRepository categories;

    public PublicProductController(ProductRepository products, ProductVariantRepository variants,
                                   InventoryStockRepository stocks, CategoryRepository categories) {
        this.products = products;
        this.variants = variants;
        this.stocks = stocks;
        this.categories = categories;
    }

    @GetMapping
    public PageResponse<ProductSummary> list(
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) String brandName,
            @RequestParam(required = false) String productType,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("page must be >= 0 and size must be between 1 and 100.");
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<Product> result = categoryId == null
                ? products.findPublishedProducts(null, normalize(brandName), normalize(productType),
                        normalize(search), pageable)
                : products.findPublishedProductsInCategories(categoryTree(categoryId), normalize(brandName),
                        normalize(productType), normalize(search), pageable);
        List<UUID> productIds = result.getContent().stream().map(Product::getId).toList();
        Map<UUID, List<ProductVariant>> variantsByProduct = productIds.isEmpty() ? Map.of()
                : variants.findByProduct_IdInAndStatus(productIds, "active").stream()
                    .collect(Collectors.groupingBy(variant -> variant.getProduct().getId()));
        List<ProductSummary> content = result.getContent().stream()
                .map(product -> ProductSummary.from(product,
                        variantsByProduct.getOrDefault(product.getId(), List.of())))
                .toList();
        return new PageResponse<>(content, result.getNumber(),
                result.getSize(), result.getTotalElements(), result.getTotalPages());
    }

    @GetMapping("/{id}")
    public ProductDetails get(@PathVariable UUID id) {
        Product product = products.findByIdAndStatus(id, "published")
                .orElseThrow(() -> new CatalogNotFoundException("Published product not found: " + id));

        List<ProductVariant> activeVariants = variants.findByProduct_IdAndStatus(id, "active");
        List<UUID> variantIds = activeVariants.stream().map(ProductVariant::getId).toList();
        Map<UUID, Integer> availableByVariant = variantIds.isEmpty() ? Map.of()
                : stocks.findAvailabilityByVariantIds(variantIds).stream().collect(Collectors.toMap(
                        InventoryStockRepository.VariantAvailability::getVariantId,
                        availability -> availability.getAvailableQuantity() == null
                                ? 0 : Math.toIntExact(availability.getAvailableQuantity())));

        List<VariantDetails> variantDetails = activeVariants.stream()
                .map(variant -> VariantDetails.from(variant,
                        availableByVariant.getOrDefault(variant.getId(), 0)))
                .toList();
        return ProductDetails.from(product, variantDetails);
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) return "";
        return value.trim();
    }

    private Set<UUID> categoryTree(UUID rootId) {
        Set<UUID> result = new LinkedHashSet<>();
        Deque<UUID> pending = new ArrayDeque<>();
        result.add(rootId);
        pending.add(rootId);
        while (!pending.isEmpty()) {
            UUID parentId = pending.removeFirst();
            for (Category child : categories.findByParent_Id(parentId)) {
                UUID childId = child.getId();
                if (childId != null && result.add(childId)) pending.addLast(childId);
            }
        }
        return result;
    }

    public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
    }

    public record ProductSummary(UUID id, UUID categoryId, String name, String brandName,
                                 String productType, JsonNode platforms, JsonNode imageUrls,
                                 BigDecimal price, BigDecimal comparePrice) {
        static ProductSummary from(Product product, List<ProductVariant> variants) {
            ProductVariant lowest = variants.stream()
                    .min(java.util.Comparator.comparing(ProductVariant::getPrice)).orElse(null);
            return new ProductSummary(product.getId(),
                    product.getCategory() == null ? null : product.getCategory().getId(), product.getName(),
                    product.getBrandName(), product.getProductType(), product.getPlatforms(),
                    displayImages(product, lowest),
                    lowest == null ? null : lowest.getPrice(), lowest == null ? null : lowest.getComparePrice());
        }

        private static JsonNode displayImages(Product product, ProductVariant lowest) {
            JsonNode productImages = product.getImageUrls();
            if (productImages != null && productImages.isArray() && productImages.size() > 0) {
                return productImages;
            }
            if (lowest != null && lowest.getImageUrl() != null && !lowest.getImageUrl().isBlank()) {
                return JsonNodeFactory.instance.arrayNode().add(lowest.getImageUrl());
            }
            return productImages;
        }
    }

    public record ProductDetails(UUID id, UUID categoryId, String name, String brandName, String description,
                                 String productType, JsonNode platforms, String publisher, String genre,
                                 String ageRating, LocalDate releaseDate, String connectionType,
                                 Integer warrantyMonths, String originCountry, JsonNode imageUrls, List<VariantDetails> variants) {
        static ProductDetails from(Product product, List<VariantDetails> variants) {
            return new ProductDetails(product.getId(),
                    product.getCategory() == null ? null : product.getCategory().getId(), product.getName(),
                    product.getBrandName(), product.getDescription(), product.getProductType(),
                    product.getPlatforms(), product.getPublisher(), product.getGenre(), product.getAgeRating(),
                    product.getReleaseDate(), product.getConnectionType(), product.getWarrantyMonths(),
                    product.getOriginCountry(), product.getImageUrls(), variants);
        }
    }

    public record VariantDetails(UUID id, String sku, JsonNode attributes, BigDecimal price,
                                 BigDecimal comparePrice, String imageUrl, int availableQuantity) {
        static VariantDetails from(ProductVariant variant, int availableQuantity) {
            return new VariantDetails(variant.getId(), variant.getSku(), variant.getAttributes(),
                    variant.getPrice(), variant.getComparePrice(), variant.getImageUrl(), availableQuantity);
        }
    }
}
