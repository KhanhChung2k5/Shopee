package com.chototmua.crm.application.audit;

import com.chototmua.crm.domain.audit.OperationLog;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Nhật ký trong bộ nhớ cho hồ sơ {@code crm-fake} và bài kiểm tra. */
@Component
@Profile("crm-fake")
public class InMemoryOperationLogStore implements OperationLogStore {

    private final List<OperationLog> rows = new ArrayList<>();

    /** Xóa hết — dùng giữa các bài kiểm thử. */
    public synchronized void clear() {
        rows.clear();
    }

    @Override
    public synchronized void append(OperationLog log) {
        rows.add(log);
    }

    @Override
    public synchronized boolean isEmpty() {
        return rows.isEmpty();
    }

    @Override
    public synchronized OperationLogPage search(OperationLogQuery query) {
        List<OperationLog> matched = rows.stream()
                .filter(row -> matchesExact(row.actorLogin(), query.actorLogin()))
                .filter(row -> matchesExact(row.department(), query.department()))
                .filter(row -> matchesExact(row.action(), query.action()))
                .filter(row -> matchesExact(row.outcome(), query.outcome()))
                .filter(row -> matchesText(row, query.text()))
                .sorted(Comparator.comparing(OperationLog::occurredAt).reversed())
                .toList();
        int from = Math.min((query.page() - 1) * query.pageSize(), matched.size());
        int to = Math.min(from + query.pageSize(), matched.size());
        return new OperationLogPage(
                List.copyOf(matched.subList(from, to)),
                query.page(),
                query.pageSize(),
                matched.size());
    }

    @Override
    public synchronized OperationLogFacets facets() {
        Map<String, OperationLogActorOption> actors = new LinkedHashMap<>();
        Map<String, String> departments = new LinkedHashMap<>();
        Map<String, String> actions = new LinkedHashMap<>();
        rows.stream()
                .sorted(Comparator.comparing(OperationLog::occurredAt).reversed())
                .forEach(row -> {
                    if (row.actorLogin() != null && !row.actorLogin().isBlank()) {
                        actors.putIfAbsent(
                                row.actorLogin(),
                                new OperationLogActorOption(
                                        row.actorLogin(),
                                        row.actorLabel() == null ? row.actorLogin() : row.actorLabel(),
                                        row.department() == null ? "" : row.department()));
                    }
                    if (row.department() != null && !row.department().isBlank()) {
                        departments.putIfAbsent(row.department(), row.department());
                    }
                    if (row.action() != null && !row.action().isBlank()) {
                        actions.putIfAbsent(row.action(), row.action());
                    }
                });
        return new OperationLogFacets(
                List.copyOf(actors.values()),
                departments.values().stream().sorted().toList(),
                actions.values().stream().sorted().toList());
    }

    private static boolean matchesExact(String value, String expected) {
        return expected == null || expected.isBlank() || expected.equals(value);
    }

    private static boolean matchesText(OperationLog row, String text) {
        if (text == null || text.isBlank()) {
            return true;
        }
        String needle = text.toLowerCase(Locale.ROOT);
        return contains(row.action(), needle)
                || contains(row.path(), needle)
                || contains(row.actorLabel(), needle)
                || contains(row.actorLogin(), needle)
                || contains(row.department(), needle);
    }

    private static boolean contains(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
    }
}
