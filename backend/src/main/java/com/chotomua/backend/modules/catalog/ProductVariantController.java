package com.chotomua.backend.modules.catalog;

import tools.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
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
import java.util.UUID;

@RestController
@RequestMapping("/api/catalog/product-variants")
public class ProductVariantController {

    private final ProductVariantRepository variants;
    private final ProductRepository products;

    public ProductVariantController(ProductVariantRepository variants, ProductRepository products) {
        this.variants = variants;
        this.products = products;
    }

    @GetMapping
    public List<ProductVariantResponse> list() {
        return variants.findAll().stream().map(ProductVariantResponse::from).toList();
    }

    @GetMapping("/{id}")
    public ProductVariantResponse get(@PathVariable UUID id) {
        return ProductVariantResponse.from(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductVariantResponse create(@Valid @RequestBody ProductVariantRequest request) {
        Product product = products.findById(request.productId())
                .orElseThrow(() -> new CatalogNotFoundException("Product not found: " + request.productId()));
        ProductVariant variant = new ProductVariant(product, request.sku().trim(), request.price());
        apply(variant, request);
        return ProductVariantResponse.from(variants.save(variant));
    }

    @PutMapping("/{id}")
    public ProductVariantResponse update(@PathVariable UUID id,
                                         @Valid @RequestBody ProductVariantRequest request) {
        ProductVariant variant = find(id);
        Product product = products.findById(request.productId())
                .orElseThrow(() -> new CatalogNotFoundException("Product not found: " + request.productId()));
        variant.setProduct(product);
        variant.setSku(request.sku().trim());
        variant.setPrice(request.price());
        apply(variant, request);
        return ProductVariantResponse.from(variants.save(variant));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        variants.delete(find(id));
    }

    private ProductVariant find(UUID id) {
        return variants.findById(id)
                .orElseThrow(() -> new CatalogNotFoundException("Product variant not found: " + id));
    }

    private void apply(ProductVariant variant, ProductVariantRequest request) {
        variant.setAttributes(request.attributes());
        variant.setComparePrice(request.comparePrice());
        variant.setImageUrl(request.imageUrl());
        variant.setStatus(request.status() == null ? "active" : request.status());
    }

    public record ProductVariantRequest(
            @NotNull UUID productId,
            @NotBlank @Size(max = 100) String sku,
            JsonNode attributes,
            @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal price,
            @DecimalMin(value = "0.0", inclusive = true) BigDecimal comparePrice,
            @Size(max = 500) String imageUrl,
            @jakarta.validation.constraints.Pattern(regexp = "active|inactive") @Size(max = 20) String status) {
    }

    public record ProductVariantResponse(UUID id, UUID productId, String sku, JsonNode attributes,
                                         BigDecimal price, BigDecimal comparePrice, String imageUrl, String status) {
        static ProductVariantResponse from(ProductVariant variant) {
            return new ProductVariantResponse(variant.getId(), variant.getProduct().getId(), variant.getSku(),
                    variant.getAttributes(), variant.getPrice(), variant.getComparePrice(), variant.getImageUrl(),
                    variant.getStatus());
        }
    }
}
