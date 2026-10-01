package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.InvoiceDiscountRequest;
import com.chotomua.backend.modules.marketing.dto.InvoiceDiscountResponse;
import com.chotomua.backend.modules.marketing.dto.ProductDiscountRequest;
import com.chotomua.backend.modules.marketing.dto.ProductDiscountResponse;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PromotionDetailService {

    private static final BigDecimal MAX_MONEY = new BigDecimal("9999999999.99");

    private final PromotionProgramRepository programs;
    private final PromotionProductDetailRepository productDetails;
    private final PromotionInvoiceDetailRepository invoiceDetails;
    private final EntityManager entityManager;

    public PromotionDetailService(PromotionProgramRepository programs, PromotionProductDetailRepository productDetails,
                                  PromotionInvoiceDetailRepository invoiceDetails, EntityManager entityManager) {
        this.programs = programs;
        this.productDetails = productDetails;
        this.invoiceDetails = invoiceDetails;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<ProductDiscountResponse> listProductDiscounts() {
        return productDetails.findAllByOrderByPromotionProgramIdAscVariantIdAsc().stream()
                .map(ProductDiscountResponse::from).toList();
    }

    @Transactional
    public ProductDiscountResponse createProductDiscount(ProductDiscountRequest request) {
        validateProductDiscount(request);
        ensureProgramAndVariantExist(request.promotionProgramId(), request.variantId());
        ensureProductDiscountUnique(request, null);
        return ProductDiscountResponse.from(productDetails.save(new PromotionProductDetail(request)));
    }

    @Transactional
    public ProductDiscountResponse updateProductDiscount(UUID id, ProductDiscountRequest request) {
        PromotionProductDetail detail = requireProductDiscount(id);
        if (detail.getSoldQty() > 0) {
            throw new IllegalArgumentException("Ưu đãi đã có lượt bán; không thể sửa");
        }
        validateProductDiscount(request);
        ensureProgramAndVariantExist(request.promotionProgramId(), request.variantId());
        ensureProductDiscountUnique(request, id);
        detail.update(request);
        return ProductDiscountResponse.from(detail);
    }

    @Transactional
    public void deleteProductDiscount(UUID id) {
        PromotionProductDetail detail = requireProductDiscount(id);
        if (detail.getSoldQty() > 0) {
            throw new IllegalArgumentException("Ưu đãi đã có lượt bán; không thể xóa");
        }
        productDetails.delete(detail);
    }

    @Transactional(readOnly = true)
    public List<InvoiceDiscountResponse> listInvoiceDiscounts() {
        return invoiceDetails.findAllByOrderByPromotionProgramIdAsc().stream()
                .map(InvoiceDiscountResponse::from).toList();
    }

    @Transactional
    public InvoiceDiscountResponse createInvoiceDiscount(InvoiceDiscountRequest request) {
        validateInvoiceDiscount(request);
        ensureProgramExists(request.promotionProgramId());
        return InvoiceDiscountResponse.from(invoiceDetails.save(new PromotionInvoiceDetail(request)));
    }

    @Transactional
    public InvoiceDiscountResponse updateInvoiceDiscount(UUID id, InvoiceDiscountRequest request) {
        PromotionInvoiceDetail detail = requireInvoiceDiscount(id);
        validateInvoiceDiscount(request);
        ensureProgramExists(request.promotionProgramId());
        detail.update(request);
        return InvoiceDiscountResponse.from(detail);
    }

    @Transactional
    public void deleteInvoiceDiscount(UUID id) {
        invoiceDetails.delete(requireInvoiceDiscount(id));
    }

    private void ensureProgramAndVariantExist(UUID programId, UUID variantId) {
        ensureProgramExists(programId);
        Number count = (Number) entityManager.createNativeQuery("select count(*) from product_variants where id = :id")
                .setParameter("id", variantId)
                .getSingleResult();
        if (count.longValue() == 0) {
            throw new NoSuchElementException("Không tìm thấy biến thể sản phẩm");
        }
    }

    private void ensureProgramExists(UUID programId) {
        if (!programs.existsById(programId)) {
            throw new NoSuchElementException("Không tìm thấy chương trình");
        }
    }

    private void ensureProductDiscountUnique(ProductDiscountRequest request, UUID currentId) {
        boolean duplicate = productDetails.findByPromotionProgramIdAndVariantId(
                request.promotionProgramId(), request.variantId()).stream()
                .anyMatch(existing -> currentId == null || !currentId.equals(existing.getId()));
        if (duplicate) {
            throw new IllegalArgumentException("SKU đã có ưu đãi trong chương trình này");
        }
    }

    private PromotionProductDetail requireProductDiscount(UUID id) {
        return productDetails.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy ưu đãi sản phẩm"));
    }

    private PromotionInvoiceDetail requireInvoiceDiscount(UUID id) {
        return invoiceDetails.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy ưu đãi hóa đơn"));
    }

    private static void validateProductDiscount(ProductDiscountRequest request) {
        if ((request.discountPercent() == null) == (request.flashPrice() == null)) {
            throw new IllegalArgumentException("Chọn đúng một kiểu giảm: phần trăm hoặc giá flash sale");
        }
        if (request.discountPercent() != null) {
            validatePercent(request.discountPercent());
            if (request.limitQty() != null) {
                throw new IllegalArgumentException("Giới hạn số lượng chỉ dùng cho flash sale");
            }
        } else {
            validateMoney(request.flashPrice());
            if (request.limitQty() == null || request.limitQty() <= 0) {
                throw new IllegalArgumentException("Flash sale phải có giới hạn số lượng lớn hơn 0");
            }
        }
    }

    private static void validateInvoiceDiscount(InvoiceDiscountRequest request) {
        if ((request.discountAmount() == null) == (request.discountPercent() == null)) {
            throw new IllegalArgumentException("Chọn đúng một kiểu giảm: số tiền hoặc phần trăm");
        }
        if (request.discountAmount() != null) {
            validateMoney(request.discountAmount());
        } else {
            validatePercent(request.discountPercent());
        }
    }

    private static void validateMoney(BigDecimal amount) {
        if (amount.signum() <= 0 || amount.scale() > 2 || amount.compareTo(MAX_MONEY) > 0) {
            throw new IllegalArgumentException("Số tiền phải lớn hơn 0, trong giới hạn và tối đa 2 chữ số thập phân");
        }
    }

    private static void validatePercent(BigDecimal percent) {
        if (percent.signum() <= 0 || percent.scale() > 2 || percent.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Phần trăm giảm phải từ 0,01 đến 100");
        }
    }
}
