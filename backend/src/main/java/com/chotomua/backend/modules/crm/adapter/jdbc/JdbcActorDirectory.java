package com.chotomua.backend.modules.crm.adapter.jdbc;

import com.chotomua.backend.modules.crm.port.ActorDirectory;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Họ tên + email người thao tác, đọc từ bảng {@code users} dùng chung. */
@Component
@Profile("!crm-fake")
public class JdbcActorDirectory implements ActorDirectory {

    private final JdbcTemplate jdbc;

    public JdbcActorDirectory(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<Actor> find(UUID userId) {
        if (userId == null) {
            return Optional.empty();
        }
        List<Actor> rows = jdbc.query(
                "SELECT email, phone, full_name FROM users WHERE id = ?",
                (rs, rowNum) -> {
                    String email = rs.getString("email");
                    String login = email != null && !email.isBlank() ? email : rs.getString("phone");
                    String name = rs.getString("full_name");
                    return new Actor(
                            login == null ? userId.toString() : login,
                            name == null || name.isBlank() ? (login == null ? userId.toString() : login) : name);
                },
                userId);
        return rows.stream().findFirst();
    }
}
