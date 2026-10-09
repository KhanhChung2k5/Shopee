package com.chotomua.backend.modules.catalog;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.node.ArrayNode;
import tools.jackson.databind.node.JsonNodeFactory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/catalog/products")
public class ProductController {

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final ProductImageStorage imageStorage;

    public ProductController(ProductRepository products, CategoryRepository categories,
                             ProductImageStorage imageStorage) {
        this.products = products;
        this.categories = categories;
        this.imageStorage = imageStorage;
    }

    @GetMapping
    public List<ProductResponse> list() {
        return products.findAll().stream().map(ProductResponse::from).toList();
    }

    @GetMapping("/{id}")
    public ProductResponse get(@PathVariable UUID id) {
        return ProductResponse.from(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse create(@Valid @RequestBody ProductRequest request) {
        Product product = new Product(request.name().trim());
        apply(product, request);
        return ProductResponse.from(products.save(product));
    }

    @PutMapping("/{id}")
    public ProductResponse update(@PathVariable UUID id, @Valid @RequestBody ProductRequest request) {
        Product product = find(id);
        product.setName(request.name().trim());
        apply(product, request);
        return ProductResponse.from(products.save(product));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        products.delete(find(id));
    }

    @PostMapping("/{id}/images")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponse uploadImages(@PathVariable UUID id, @RequestPart("files") List<MultipartFile> files)
            throws IOException {
        Product product = find(id);
        if (files.isEmpty()) {
            throw new IllegalArgumentException("At least one image file is required.");
        }
        ArrayNode imageUrls = product.getImageUrls() instanceof ArrayNode existing
                ? existing.deepCopy() : JsonNodeFactory.instance.arrayNode();
        for (MultipartFile file : files) {
            imageUrls.add(imageStorage.store(file));
        }
        product.setImageUrls(imageUrls);
        return ProductResponse.from(products.save(product));
    }

    private Product find(UUID id) {
        return products.findById(id)
                .orElseThrow(() -> new CatalogNotFoundException("Product not found: " + id));
    }

    private void apply(Product product, ProductRequest request) {
        product.setCategory(request.categoryId() == null ? null : categories.findById(request.categoryId())
                .orElseThrow(() -> new CatalogNotFoundException("Category not found: " + request.categoryId())));
        product.setBrandName(request.brandName());
        product.setDescription(request.description());
        product.setStatus(request.status() == null ? "draft" : request.status());
        product.setProductType(request.productType() == null ? "accessory" : request.productType());
        product.setPlatforms(request.platforms());
        product.setPublisher(request.publisher());
        product.setGenre(request.genre());
        product.setAgeRating(request.ageRating());
        product.setReleaseDate(request.releaseDate());
        product.setConnectionType(request.connectionType());
        product.setWarrantyMonths(request.warrantyMonths());
        product.setOriginCountry(request.originCountry());
        if (request.imageUrls() != null) {
            ArrayNode urls = JsonNodeFactory.instance.arrayNode();
            request.imageUrls().forEach(urls::add);
            product.setImageUrls(urls);
        }
    }

    public record ProductRequest(
            @NotBlank @Size(max = 255) String name,
            UUID categoryId,
            @Size(max = 255) String brandName,
            String description,
            @jakarta.validation.constraints.Pattern(regexp = "draft|published") @Size(max = 20) String status,
            @jakarta.validation.constraints.Pattern(regexp = "game_disc|controller|accessory")
            @Size(max = 20) String productType,
            JsonNode platforms,
            @Size(max = 255) String publisher,
            @Size(max = 100) String genre,
            @Size(max = 10) String ageRating,
            LocalDate releaseDate,
            @jakarta.validation.constraints.Pattern(regexp = "wired|wireless|bluetooth")
            @Size(max = 20) String connectionType,
            @jakarta.validation.constraints.PositiveOrZero Integer warrantyMonths,
            @Size(max = 100) String originCountry,
            List<@Size(max = 500) String> imageUrls) {
    }

    public record ProductResponse(UUID id, UUID categoryId, String brandName, String name,
                                  String description, String status, String productType, JsonNode platforms,
                                  String publisher, String genre, String ageRating, LocalDate releaseDate,
                                  String connectionType, Integer warrantyMonths, String originCountry, JsonNode imageUrls) {
        static ProductResponse from(Product product) {
            return new ProductResponse(product.getId(),
                    product.getCategory() == null ? null : product.getCategory().getId(),
                    product.getBrandName(), product.getName(), product.getDescription(), product.getStatus(),
                    product.getProductType(), product.getPlatforms(), product.getPublisher(), product.getGenre(),
                    product.getAgeRating(), product.getReleaseDate(), product.getConnectionType(),
                    product.getWarrantyMonths(), product.getOriginCountry(), product.getImageUrls());
        }
    }
}
