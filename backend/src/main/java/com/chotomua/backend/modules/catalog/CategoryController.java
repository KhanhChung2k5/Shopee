package com.chotomua.backend.modules.catalog;

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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/catalog/categories")
public class CategoryController {

    private final CategoryRepository categories;

    public CategoryController(CategoryRepository categories) {
        this.categories = categories;
    }

    @GetMapping
    public List<CategoryResponse> list() {
        return categories.findAll().stream().map(CategoryResponse::from).toList();
    }

    @GetMapping("/{id}")
    public CategoryResponse get(@PathVariable UUID id) {
        return CategoryResponse.from(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse create(@Valid @RequestBody CategoryRequest request) {
        String slug = request.slug().trim();
        if (categories.existsBySlug(slug)) {
            throw new org.springframework.dao.DuplicateKeyException("Category slug already exists.");
        }
        Category category = new Category(request.name().trim(), slug);
        category.setParent(parent(request.parentId()));
        return CategoryResponse.from(categories.save(category));
    }

    @PutMapping("/{id}")
    public CategoryResponse update(@PathVariable UUID id, @Valid @RequestBody CategoryRequest request) {
        Category category = find(id);
        String slug = request.slug().trim();
        if (categories.existsBySlugAndIdNot(slug, id)) {
            throw new org.springframework.dao.DuplicateKeyException("Category slug already exists.");
        }
        if (id.equals(request.parentId())) {
            throw new IllegalArgumentException("A category cannot be its own parent.");
        }
        category.setName(request.name().trim());
        category.setSlug(slug);
        category.setParent(parent(request.parentId()));
        return CategoryResponse.from(categories.save(category));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        categories.delete(find(id));
    }

    private Category find(UUID id) {
        return categories.findById(id)
                .orElseThrow(() -> new CatalogNotFoundException("Category not found: " + id));
    }

    private Category parent(UUID id) {
        if (id == null) return null;
        return categories.findById(id)
                .orElseThrow(() -> new CatalogNotFoundException("Parent category not found: " + id));
    }

    public record CategoryRequest(
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 255) String slug,
            UUID parentId) {
    }

    public record CategoryResponse(UUID id, String name, String slug, UUID parentId) {
        static CategoryResponse from(Category category) {
            return new CategoryResponse(category.getId(), category.getName(), category.getSlug(),
                    category.getParent() == null ? null : category.getParent().getId());
        }
    }
}
