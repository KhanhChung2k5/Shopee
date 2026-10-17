package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.InvoiceDiscountRequest;
import com.chotomua.backend.modules.marketing.dto.InvoiceDiscountResponse;
import com.chotomua.backend.modules.marketing.dto.ProductDiscountRequest;
import com.chotomua.backend.modules.marketing.dto.ProductDiscountResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/marketing")
public class PromotionDetailController {

    private final PromotionDetailService service;

    public PromotionDetailController(PromotionDetailService service) {
        this.service = service;
    }

    @GetMapping("/product-discounts")
    public List<ProductDiscountResponse> listProductDiscounts() {
        return service.listProductDiscounts();
    }

    @PostMapping("/product-discounts")
    public ResponseEntity<ProductDiscountResponse> createProductDiscount(@Valid @RequestBody ProductDiscountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createProductDiscount(request));
    }

    @PutMapping("/product-discounts/{id}")
    public ProductDiscountResponse updateProductDiscount(@PathVariable UUID id, @Valid @RequestBody ProductDiscountRequest request) {
        return service.updateProductDiscount(id, request);
    }

    @DeleteMapping("/product-discounts/{id}")
    public ResponseEntity<Void> deleteProductDiscount(@PathVariable UUID id) {
        service.deleteProductDiscount(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/invoice-discounts")
    public List<InvoiceDiscountResponse> listInvoiceDiscounts() {
        return service.listInvoiceDiscounts();
    }

    @PostMapping("/invoice-discounts")
    public ResponseEntity<InvoiceDiscountResponse> createInvoiceDiscount(@Valid @RequestBody InvoiceDiscountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createInvoiceDiscount(request));
    }

    @PutMapping("/invoice-discounts/{id}")
    public InvoiceDiscountResponse updateInvoiceDiscount(@PathVariable UUID id, @Valid @RequestBody InvoiceDiscountRequest request) {
        return service.updateInvoiceDiscount(id, request);
    }

    @DeleteMapping("/invoice-discounts/{id}")
    public ResponseEntity<Void> deleteInvoiceDiscount(@PathVariable UUID id) {
        service.deleteInvoiceDiscount(id);
        return ResponseEntity.noContent().build();
    }
}
