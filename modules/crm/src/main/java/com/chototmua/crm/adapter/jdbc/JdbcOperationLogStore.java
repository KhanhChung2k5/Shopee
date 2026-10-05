package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.audit.OperationLogActorOption;
import com.chototmua.crm.application.audit.OperationLogFacets;
import com.chototmua.crm.application.audit.OperationLogPage;
import com.chototmua.crm.application.audit.OperationLogQuery;
import com.chototmua.crm.application.audit.OperationLogStore;
import com.chototmua.crm.domain.audit.OperationLog;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Nhật ký trên bảng {@code operation_logs}. */
@Component
@Profile("crm-db")
public class JdbcOperationLogStore implements OperationLogStore {

    private static final String FILTER_WHERE = """
            WHERE (? = '' OR actor_login = ?)
              AND (? = '' OR department = ?)
              AND (? = '' OR action = ?)
              AND (? = '' OR outcome = ?)
              AND (? = '' OR action ILIKE ? OR path ILIKE ? OR actor_label ILIKE ? OR actor_login ILIKE ?)
            """;

    private final JdbcTemplate jdbc;

    public JdbcOperationLogStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void append(OperationLog log) {
        jdbc.update("""
                INSERT INTO operation_logs
                    (id, actor_id, actor_login, actor_label, department, action,
                     http_method, path, status_code, outcome, occurred_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                log.id(),
                log.actorId(),
                log.actorLogin(),
                log.actorLabel(),
                log.department(),
                log.action(),
                log.httpMethod(),
                log.path(),
                log.statusCode(),
                log.outcome(),
                Timestamp.from(log.occurredAt()));
    }

    @Override
    public boolean isEmpty() {
        Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM operation_logs", Integer.class);
        return count == null || count == 0;
    }

    @Override
    public OperationLogPage search(OperationLogQuery query) {
        List<Object> filters = bindFilters(query);
        Integer total = jdbc.queryForObject(
                "SELECT COUNT(*) FROM operation_logs " + FILTER_WHERE,
                Integer.class,
                filters.toArray());
        long totalItems = total == null ? 0 : total;

        List<Object> pageArgs = new ArrayList<>(filters);
        pageArgs.add(query.pageSize());
        pageArgs.add((query.page() - 1) * query.pageSize());
        List<OperationLog> data = jdbc.query("""
                SELECT id, actor_id, actor_login, actor_label, department, action,
                       http_method, path, status_code, outcome, occurred_at
                FROM operation_logs
                """ + FILTER_WHERE + """
                ORDER BY occurred_at DESC
                LIMIT ? OFFSET ?
                """, (rs, rowNum) -> new OperationLog(
                rs.getObject("id", UUID.class),
                rs.getObject("actor_id", UUID.class),
                rs.getString("actor_login"),
                rs.getString("actor_label"),
                rs.getString("department"),
                rs.getString("action"),
                rs.getString("http_method"),
                rs.getString("path"),
                rs.getInt("status_code"),
                rs.getString("outcome"),
                rs.getTimestamp("occurred_at").toInstant()), pageArgs.toArray());
        return new OperationLogPage(data, query.page(), query.pageSize(), totalItems);
    }

    @Override
    public OperationLogFacets facets() {
        List<OperationLogActorOption> actors = jdbc.query("""
                SELECT DISTINCT ON (actor_login) actor_login, actor_label, department
                FROM operation_logs
                WHERE actor_login IS NOT NULL AND actor_login <> ''
                ORDER BY actor_login, occurred_at DESC
                """, (rs, rowNum) -> new OperationLogActorOption(
                rs.getString("actor_login"),
                rs.getString("actor_label"),
                rs.getString("department")));
        List<String> departments = jdbc.query("""
                SELECT DISTINCT department
                FROM operation_logs
                WHERE department IS NOT NULL AND department <> ''
                ORDER BY department
                """, (rs, rowNum) -> rs.getString("department"));
        List<String> actions = jdbc.query("""
                SELECT DISTINCT action
                FROM operation_logs
                WHERE action IS NOT NULL AND action <> ''
                ORDER BY action
                """, (rs, rowNum) -> rs.getString("action"));
        return new OperationLogFacets(actors, departments, actions);
    }

    private static List<Object> bindFilters(OperationLogQuery query) {
        String actor = blankToEmpty(query.actorLogin());
        String department = blankToEmpty(query.department());
        String action = blankToEmpty(query.action());
        String outcome = blankToEmpty(query.outcome());
        String text = blankToEmpty(query.text());
        String pattern = "%" + text + "%";
        List<Object> filters = new ArrayList<>();
        filters.add(actor);
        filters.add(actor);
        filters.add(department);
        filters.add(department);
        filters.add(action);
        filters.add(action);
        filters.add(outcome);
        filters.add(outcome);
        filters.add(text);
        filters.add(pattern);
        filters.add(pattern);
        filters.add(pattern);
        filters.add(pattern);
        return filters;
    }

    private static String blankToEmpty(String value) {
        return value == null ? "" : value.trim();
    }
}
