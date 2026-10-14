package com.chotomua.backend.modules.marketing;
import com.chotomua.backend.modules.order.ProductVariantSnapshot;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
@Service public class FlashSaleCheckoutService {
 private final PromotionProductDetailRepository details; private final PromotionProgramRepository programs;
 public FlashSaleCheckoutService(PromotionProductDetailRepository details, PromotionProgramRepository programs){this.details=details;this.programs=programs;}
 public ProductVariantSnapshot apply(UUID variantId,int quantity,ProductVariantSnapshot base){
  var now=OffsetDateTime.now();
  for(var d:details.findByVariantId(variantId)){ var p=programs.findById(d.getPromotionProgramId()).orElse(null); if(p!=null && d.getFlashPrice()!=null && !now.isBefore(p.getStartAt()) && now.isBefore(p.getEndAt())) { d.reserveFlashQuantity(quantity); return new ProductVariantSnapshot(variantId,d.getFlashPrice(),base.productName(),base.attributesJson(),base.availableQuantity()); }}
  return base;
 }
}
