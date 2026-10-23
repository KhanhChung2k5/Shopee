package com.chotomua.backend.modules.crm.port;

import java.util.Optional;
import java.util.UUID;

/**
 * Tra người đang thao tác (nhân viên hoặc khách) để ghi nhật ký bằng tên thật thay vì UUID.
 * Trả {@link Optional#empty()} nếu không tìm thấy — khi đó nhật ký dùng nhãn tài khoản demo.
 */
public interface ActorDirectory {

    Optional<Actor> find(UUID userId);

    /** {@code login} = email (hoặc SĐT nếu không có email), {@code label} = họ tên. */
    record Actor(String login, String label) {
    }
}
