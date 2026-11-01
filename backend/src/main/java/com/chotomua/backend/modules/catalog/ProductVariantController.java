package com.chotomua.backend.modules.catalog;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import com.chotomua.backend.common.config.CacheConfig;
import tools.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/api/catalog/product-variants")
public class ProductVariantController {

    /**
     * SKU convention: upper-case blocks joined by dashes, read left to right as platform – kind – item – version,
     * e.g. PS5-GAME-SPIDERMAN2, PS5-CTL-DS-EDGE, PS5-ACC-COVER-RED. Kind is GAME (game disc), CTL (controller) or ACC (accessory).
     */
    static final String SKU_PATTERN = "[A-Za-z0-9]+(-[A-Za-z0-9]+){2,}";
    static final String SKU_MESSAGE = "SKU gồm các khối chữ in hoa/số nối bằng dấu gạch ngang: NỀN TẢNG-LOẠI-TÊN, ví dụ PS5-GAME-SPIDERMAN2";

    private final ProductVariantRepository variants;
    private final ProductRepository products;

    public ProductVariantController(ProductVariantRepository variants, ProductRepository products) {
        this.variants = variants;
        this.products = products;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ProductVariantResponse> list() {
        return variants.findAllByOrderBySkuAsc().stream().map(ProductVariantResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ProductVariantResponse get(@PathVariable UUID id) {
        return ProductVariantResponse.from(find(id));
    }

    @CacheEvict(cacheNames = {CacheConfig.PUBLIC_PRODUCTS, CacheConfig.PUBLIC_PRODUCT, CacheConfig.TOP_SELLERS}, allEntries = true)
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductVariantResponse create(@Valid @RequestBody ProductVariantRequest request) {
        Product product = products.findById(request.productId())
                .orElseThrow(() -> new CatalogNotFoundException("Không tìm thấy sản phẩm: " + request.productId()));
        String sku = normalizeSku(request.sku());
        if (variants.existsBySkuIgnoreCase(sku)) throw new IllegalArgumentException("Mã SKU " + sku + " đã được dùng cho sản phẩm khác.");
        ProductVariant variant = new ProductVariant(product, sku, request.price());
        apply(variant, request);
        return ProductVariantResponse.from(variants.save(variant));
    }

    @CacheEvict(cacheNames = {CacheConfig.PUBLIC_PRODUCTS, CacheConfig.PUBLIC_PRODUCT, CacheConfig.TOP_SELLERS}, allEntries = true)
    @PutMapping("/{id}")
    @Transactional
    public ProductVariantResponse update(@PathVariable UUID id,
                                         @Valid @RequestBody ProductVariantRequest request) {
        ProductVariant variant = find(id);
        Product product = products.findById(request.productId())
                .orElseThrow(() -> new CatalogNotFoundException("Không tìm thấy sản phẩm: " + request.productId()));
        variant.setProduct(product);
        String sku = normalizeSku(request.sku());
        if (variants.existsBySkuIgnoreCaseAndIdNot(sku, id)) throw new IllegalArgumentException("Mã SKU " + sku + " đã được dùng cho sản phẩm khác.");
        variant.setSku(sku);
        variant.setPrice(request.price());
        apply(variant, request);
        return ProductVariantResponse.from(variants.save(variant));
    }

    @CacheEvict(cacheNames = {CacheConfig.PUBLIC_PRODUCTS, CacheConfig.PUBLIC_PRODUCT, CacheConfig.TOP_SELLERS}, allEntries = true)
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        variants.delete(find(id));
    }

    private ProductVariant find(UUID id) {
        return variants.findById(id)
                .orElseThrow(() -> new CatalogNotFoundException("Không tìm thấy biến thể sản phẩm: " + id));
    }

    private static String normalizeSku(String sku) {
        return sku.trim().toUpperCase(Locale.ROOT);
    }

    private void apply(ProductVariant variant, ProductVariantRequest request) {
        variant.setAttributes(request.attributes());
        variant.setComparePrice(request.comparePrice());
        variant.setImageUrl(request.imageUrl());
        variant.setStatus(request.status() == null ? "active" : request.status());
    }

    public record ProductVariantRequest(
            @NotNull UUID productId,
            @NotBlank @Size(max = 100) @jakarta.validation.constraints.Pattern(regexp = SKU_PATTERN, message = SKU_MESSAGE) String sku,
            JsonNode attributes,
            @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal price,
            @DecimalMin(value = "0.0", inclusive = true) BigDecimal comparePrice,
            @Size(max = 500) String imageUrl,
            @jakarta.validation.constraints.Pattern(regexp = "active|inactive") @Size(max = 20) String status) {
    }

    public record ProductVariantResponse(UUID id, UUID productId, String productName, String sku, JsonNode attributes,
                                         BigDecimal price, BigDecimal comparePrice, String imageUrl, String status) {
        static ProductVariantResponse from(ProductVariant variant) {
            return new ProductVariantResponse(variant.getId(), variant.getProduct().getId(), variant.getProduct().getName(),
                    variant.getSku(), variant.getAttributes(), variant.getPrice(), variant.getComparePrice(),
                    variant.getImageUrl(), variant.getStatus());
        }
    }
}
