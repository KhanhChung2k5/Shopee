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
@RequestMapping("/api/catalog/warehouses")
public class WarehouseController {

    private final WarehouseRepository warehouses;

    public WarehouseController(WarehouseRepository warehouses) {
        this.warehouses = warehouses;
    }

    @GetMapping
    public List<WarehouseResponse> list() {
        return warehouses.findAll().stream().map(WarehouseResponse::from).toList();
    }

    @GetMapping("/{id}")
    public WarehouseResponse get(@PathVariable UUID id) {
        return WarehouseResponse.from(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WarehouseResponse create(@Valid @RequestBody WarehouseRequest request) {
        Warehouse warehouse = new Warehouse(request.name().trim());
        warehouse.setAddress(trimToNull(request.address()));
        return WarehouseResponse.from(warehouses.save(warehouse));
    }

    @PutMapping("/{id}")
    public WarehouseResponse update(@PathVariable UUID id, @Valid @RequestBody WarehouseRequest request) {
        Warehouse warehouse = find(id);
        warehouse.setName(request.name().trim());
        warehouse.setAddress(trimToNull(request.address()));
        return WarehouseResponse.from(warehouses.save(warehouse));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        warehouses.delete(find(id));
    }

    private Warehouse find(UUID id) {
        return warehouses.findById(id)
                .orElseThrow(() -> new CatalogNotFoundException("Warehouse not found: " + id));
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record WarehouseRequest(
            @NotBlank @Size(max = 255) String name,
            @Size(max = 500) String address) {
    }

    public record WarehouseResponse(UUID id, String name, String address) {
        static WarehouseResponse from(Warehouse warehouse) {
            return new WarehouseResponse(warehouse.getId(), warehouse.getName(), warehouse.getAddress());
        }
    }
}
