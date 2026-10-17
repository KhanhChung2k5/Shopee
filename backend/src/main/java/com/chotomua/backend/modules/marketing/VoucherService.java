package com.chotomua.backend.modules.marketing;

import com.chotomua.backend.modules.marketing.dto.VoucherRequest;
import com.chotomua.backend.modules.marketing.dto.VoucherResponse;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class VoucherService {

    private static final BigDecimal MAX_AMOUNT = new BigDecimal("9999999999.99");

    private final VoucherRepository vouchers;
    private final PromotionProgramRepository programs;

    public VoucherService(VoucherRepository vouchers, PromotionProgramRepository programs) {
        this.vouchers = vouchers;
        this.programs = programs;
    }

    @Transactional(readOnly = true)
    public List<VoucherResponse> list() {
        return vouchers.findAllByOrderByCodeAsc().stream().map(VoucherResponse::from).toList();
    }

    @Transactional
    public VoucherResponse create(VoucherRequest request) {
        validate(request);
        String code = normalizedCode(request.code());
        ensureCodeAvailable(code, null);
        return VoucherResponse.from(vouchers.save(new Voucher(request, code)));
    }

    @Transactional
    public VoucherResponse update(UUID id, VoucherRequest request) {
        Voucher voucher = requireVoucher(id);
        validate(request);
        String code = normalizedCode(request.code());
        ensureCodeAvailable(code, id);
        voucher.update(request, code);
        return VoucherResponse.from(voucher);
    }

    @Transactional
    public void delete(UUID id) {
        vouchers.delete(requireVoucher(id));
    }

    private void validate(VoucherRequest request) {
        PromotionProgram program = programs.findById(request.promotionProgramId())
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy chương trình"));
        BigDecimal value = request.value();
        if (value == null || value.signum() <= 0 || value.scale() > 2 || value.compareTo(MAX_AMOUNT) > 0) {
            throw new IllegalArgumentException("Giá trị voucher phải lớn hơn 0 và tối đa 2 chữ số thập phân");
        }
        if (!"percentage".equals(request.type()) && !"fixed_amount".equals(request.type())) {
            throw new IllegalArgumentException("Loại voucher không hợp lệ");
        }
        if ("percentage".equals(request.type()) && value.compareTo(BigDecimal.valueOf(100)) > 0) {
            throw new IllegalArgumentException("Voucher giảm phần trăm không thể vượt 100%");
        }
        if (request.expiresAt() != null && request.expiresAt().isBefore(program.getStartAt())) {
            throw new IllegalArgumentException("Hạn dùng voucher không thể trước ngày bắt đầu chương trình");
        }
    }

    private Voucher requireVoucher(UUID id) {
        return vouchers.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy voucher"));
    }

    private void ensureCodeAvailable(String code, UUID currentId) {
        vouchers.findByCodeIgnoreCase(code).ifPresent(existing -> {
            if (currentId == null || !currentId.equals(existing.getId())) {
                throw new IllegalArgumentException("Mã voucher đã tồn tại");
            }
        });
    }

    private static String normalizedCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }
}
