package com.chotomua.backend.modules.crm.adapter.jdbc;

import com.chotomua.backend.BackendApplication;
import com.chotomua.backend.modules.crm.port.ActorDirectory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

/** Read-only check against the real schema: the lookup query matches the users table. */
@SpringBootTest(classes = BackendApplication.class)
class JdbcActorDirectoryTest {

    @Autowired
    private ActorDirectory directory;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void findsAnExistingUserByIdWithEmailAndName() {
        var rows = jdbc.queryForList("SELECT id, email, phone, full_name FROM users WHERE email IS NOT NULL LIMIT 1");
        assumeTrue(!rows.isEmpty(), "no users in this database");
        Map<String, Object> row = rows.get(0);

        var actor = directory.find((UUID) row.get("id"));

        assertThat(directory).isInstanceOf(JdbcActorDirectory.class);
        assertThat(actor).isPresent();
        assertThat(actor.get().login()).isEqualTo(row.get("email"));
        String name = (String) row.get("full_name");
        assertThat(actor.get().label()).isEqualTo(name == null || name.isBlank() ? row.get("email") : name);
    }

    @Test
    void unknownIdIsEmpty() {
        assertThat(directory.find(UUID.randomUUID())).isEmpty();
        assertThat(directory.find(null)).isEmpty();
    }
}
