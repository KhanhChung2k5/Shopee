package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.PromotionProgramRequest;
import com.chotomua.backend.modules.marketing.dto.PromotionProgramResponse;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PromotionProgramService {

    private final PromotionProgramRepository programs;
    private final VoucherRepository vouchers;

    public PromotionProgramService(PromotionProgramRepository programs, VoucherRepository vouchers) {
        this.programs = programs;
        this.vouchers = vouchers;
    }

    @Transactional(readOnly = true)
    public List<PromotionProgramResponse> list() {
        return programs.findAllByOrderByStartAtDesc().stream().map(PromotionProgramResponse::from).toList();
    }

    @Transactional
    public PromotionProgramResponse create(PromotionProgramRequest request) {
        validateDates(request);
        String code = normalizedCode(request.code());
        ensureCodeAvailable(code, null);
        return PromotionProgramResponse.from(programs.save(new PromotionProgram(request, code)));
    }

    @Transactional
    public PromotionProgramResponse update(UUID id, PromotionProgramRequest request) {
        validateDates(request);
        PromotionProgram program = requireProgram(id);
        String code = normalizedCode(request.code());
        ensureCodeAvailable(code, id);
        boolean invalidatesVoucher = vouchers.findByPromotionProgramId(id).stream()
                .anyMatch(voucher -> voucher.getExpiresAt() != null && voucher.getExpiresAt().isBefore(request.startAt()));
        if (invalidatesVoucher) {
            throw new IllegalArgumentException("Ngày bắt đầu mới nằm sau hạn dùng của voucher hiện có");
        }
        program.update(request, code);
        return PromotionProgramResponse.from(program);
    }

    @Transactional
    public void delete(UUID id) {
        PromotionProgram program = requireProgram(id);
        if (vouchers.existsByPromotionProgramId(id)) {
            throw new IllegalArgumentException("Xóa voucher của chương trình trước khi xóa chương trình");
        }
        programs.delete(program);
    }

    private PromotionProgram requireProgram(UUID id) {
        return programs.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy chương trình"));
    }

    private void ensureCodeAvailable(String code, UUID currentId) {
        programs.findByCodeIgnoreCase(code).ifPresent(existing -> {
            if (currentId == null || !currentId.equals(existing.getId())) {
                throw new IllegalArgumentException("Mã chương trình đã tồn tại");
            }
        });
    }

    private static void validateDates(PromotionProgramRequest request) {
        if (request.startAt() == null || request.endAt() == null || !request.endAt().isAfter(request.startAt())) {
            throw new IllegalArgumentException("Thời gian kết thúc phải sau thời gian bắt đầu");
        }
    }

    private static String normalizedCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }
}
