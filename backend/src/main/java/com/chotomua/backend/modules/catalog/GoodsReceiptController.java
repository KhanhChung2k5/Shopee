package com.chotomua.backend.modules.catalog;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import com.chotomua.backend.common.config.CacheConfig;
import com.chotomua.backend.modules.identity.Employee;
import com.chotomua.backend.modules.identity.EmployeeRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/catalog/goods-receipts")
public class GoodsReceiptController {

    private final GoodsReceiptRepository receipts;
    private final EmployeeRepository employees;
    private final WarehouseRepository warehouses;
    private final ProductVariantRepository variants;
    private final InventoryStockService inventoryStockService;

    public GoodsReceiptController(GoodsReceiptRepository receipts, EmployeeRepository employees,
                                  WarehouseRepository warehouses, ProductVariantRepository variants,
                                  InventoryStockService inventoryStockService) {
        this.receipts = receipts;
        this.employees = employees;
        this.warehouses = warehouses;
        this.variants = variants;
        this.inventoryStockService = inventoryStockService;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<GoodsReceiptResponse> list() {
        return receipts.findAllByOrderByReceivedAtDesc().stream().map(GoodsReceiptResponse::from).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public GoodsReceiptResponse get(@PathVariable UUID id) {
        return GoodsReceiptResponse.from(find(id));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public GoodsReceiptResponse create(@Valid @RequestBody CreateGoodsReceiptRequest request,
                                       Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        Employee employee = employees.findByUserId(userId)
                .orElseThrow(() -> new CatalogNotFoundException("Không tìm thấy hồ sơ nhân viên của tài khoản hiện tại."));
        Warehouse warehouse = warehouses.findById(request.warehouseId())
                .orElseThrow(() -> new CatalogNotFoundException("Không tìm thấy kho: " + request.warehouseId()));

        String code = "GR-" + LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE) + "-"
                + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        GoodsReceipt receipt = new GoodsReceipt(code, employee, warehouse, trimToNull(request.supplierName()));
        for (GoodsReceiptItemRequest itemRequest : request.items()) {
            ProductVariant variant = variants.findById(itemRequest.variantId())
                    .orElseThrow(() -> new CatalogNotFoundException(
                            "Không tìm thấy biến thể sản phẩm: " + itemRequest.variantId()));
            if (!"active".equals(variant.getStatus())) {
                throw new IllegalArgumentException("Không thể nhập kho cho biến thể đang ngừng bán: " + variant.getSku());
            }
            receipt.addItem(new GoodsReceiptItem(variant, itemRequest.quantity(), itemRequest.unitCost()));
        }
        return GoodsReceiptResponse.from(receipts.save(receipt));
    }

    @CacheEvict(cacheNames = {CacheConfig.PUBLIC_PRODUCTS, CacheConfig.PUBLIC_PRODUCT, CacheConfig.TOP_SELLERS}, allEntries = true)
    @PostMapping("/{id}/approve")
    @Transactional
    public GoodsReceiptResponse approve(@PathVariable UUID id, Authentication authentication) {
        GoodsReceipt receipt = receipts.findByIdForUpdate(id)
                .orElseThrow(() -> new CatalogNotFoundException("Không tìm thấy phiếu nhập: " + id));
        Employee approver = requireDecider(receipt, authentication);
        List<InventoryStockService.ImportLine> importLines = receipt.getItems().stream()
                .map(item -> new InventoryStockService.ImportLine(item.getVariant(), item.getQuantity()))
                .toList();
        inventoryStockService.importForReceipt(receipt.getId(), receipt.getWarehouse(), importLines);
        receipt.decide("approved", approver);
        return GoodsReceiptResponse.from(receipts.save(receipt));
    }

    @PostMapping("/{id}/reject")
    @Transactional
    public GoodsReceiptResponse reject(@PathVariable UUID id, Authentication authentication) {
        GoodsReceipt receipt = receipts.findByIdForUpdate(id)
                .orElseThrow(() -> new CatalogNotFoundException("Không tìm thấy phiếu nhập: " + id));
        receipt.decide("rejected", requireDecider(receipt, authentication));
        return GoodsReceiptResponse.from(receipts.save(receipt));
    }

    /** Segregation of duties: a pending receipt is approved or rejected by someone other than the employee who drew it up. */
    private Employee requireDecider(GoodsReceipt receipt, Authentication authentication) {
        requirePending(receipt);
        Employee decider = employees.findByUserId(UUID.fromString(authentication.getName()))
                .orElseThrow(() -> new CatalogNotFoundException("Không tìm thấy hồ sơ nhân viên của tài khoản hiện tại."));
        if (decider.getId().equals(receipt.getEmployee().getId())) {
            throw new IllegalArgumentException("Người lập phiếu không được tự duyệt hoặc từ chối phiếu nhập của mình.");
        }
        return decider;
    }

    private GoodsReceipt find(UUID id) {
        return receipts.findById(id)
                .orElseThrow(() -> new CatalogNotFoundException("Không tìm thấy phiếu nhập: " + id));
    }

    private void requirePending(GoodsReceipt receipt) {
        if (!"pending".equals(receipt.getStatus())) {
            throw new IllegalArgumentException("Chỉ phiếu nhập đang chờ duyệt mới được duyệt hoặc từ chối.");
        }
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    public record CreateGoodsReceiptRequest(
            @NotNull UUID warehouseId,
            @Size(max = 255) String supplierName,
            @NotEmpty List<@Valid GoodsReceiptItemRequest> items) {
    }

    public record GoodsReceiptItemRequest(
            @NotNull UUID variantId,
            @NotNull @Positive Integer quantity,
            @NotNull @DecimalMin("0.0") BigDecimal unitCost) {
    }

    public record GoodsReceiptResponse(UUID id, String code, UUID employeeId, UUID warehouseId,
                                       String warehouseName, String supplierName, String status,
                                       OffsetDateTime receivedAt, BigDecimal totalCost,
                                       List<GoodsReceiptItemResponse> items, UUID createdByUserId, String createdByName,
                                       String decidedByName, OffsetDateTime decidedAt) {
        static GoodsReceiptResponse from(GoodsReceipt receipt) {
            List<GoodsReceiptItemResponse> items = receipt.getItems().stream()
                    .map(GoodsReceiptItemResponse::from).toList();
            BigDecimal total = items.stream().map(GoodsReceiptItemResponse::lineTotal)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            Employee decider = receipt.getDecidedBy();
            return new GoodsReceiptResponse(receipt.getId(), receipt.getCode(), receipt.getEmployee().getId(),
                    receipt.getWarehouse().getId(), receipt.getWarehouse().getName(), receipt.getSupplierName(),
                    receipt.getStatus(), receipt.getReceivedAt(), total, items,
                    receipt.getEmployee().getUser() == null ? null : receipt.getEmployee().getUser().getId(), nameOf(receipt.getEmployee()),
                    decider == null ? null : nameOf(decider), receipt.getDecidedAt());
        }

        private static String nameOf(Employee employee) {
            return employee.getUser() == null ? null : employee.getUser().getFullName();
        }
    }

    public record GoodsReceiptItemResponse(UUID id, UUID variantId, String sku, String productName, Integer quantity,
                                            BigDecimal unitCost, BigDecimal lineTotal) {
        static GoodsReceiptItemResponse from(GoodsReceiptItem item) {
            return new GoodsReceiptItemResponse(item.getId(), item.getVariant().getId(), item.getVariant().getSku(),
                    item.getVariant().getProduct().getName(), item.getQuantity(), item.getUnitCost(), item.getLineTotal());
        }
    }
}
