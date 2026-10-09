package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.PromotionProgramRequest;
import com.chotomua.backend.modules.marketing.dto.PromotionProgramResponse;
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
@RequestMapping("/marketing/programs")
public class PromotionProgramController {

    private final PromotionProgramService service;

    public PromotionProgramController(PromotionProgramService service) {
        this.service = service;
    }

    @GetMapping
    public List<PromotionProgramResponse> list() {
        return service.list();
    }

    @PostMapping
    public ResponseEntity<PromotionProgramResponse> create(@Valid @RequestBody PromotionProgramRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    public PromotionProgramResponse update(@PathVariable UUID id, @Valid @RequestBody PromotionProgramRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
