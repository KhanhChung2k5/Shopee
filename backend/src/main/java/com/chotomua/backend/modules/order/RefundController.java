package com.chotomua.backend.modules.order;
import com.chotomua.backend.modules.order.dto.RefundRequest;
import com.chotomua.backend.modules.order.dto.RefundResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/refund-returns")
public class RefundController {
 private final RefundService service; public RefundController(RefundService service){this.service=service;}
 @PostMapping public ResponseEntity<RefundResponse> request(Authentication a,@Valid @RequestBody RefundRequest r){return ResponseEntity.status(HttpStatus.CREATED).body(service.request(UUID.fromString((String)a.getPrincipal()),r));}
 @GetMapping public List<RefundResponse> list(){return service.list();}
 @PatchMapping("/{id}/approve") public RefundResponse approve(Authentication a,@PathVariable UUID id){return service.approve(UUID.fromString((String)a.getPrincipal()),id);}
 @PatchMapping("/{id}/reject") public RefundResponse reject(Authentication a,@PathVariable UUID id){return service.reject(UUID.fromString((String)a.getPrincipal()),id);}
}
