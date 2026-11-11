package com.chototmua.crm.application.audit;

import com.chototmua.crm.config.CrmDemoActors;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.dto.StaffDepartment;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeSet;
import java.util.UUID;

/** Đọc nhật ký thao tác. Chỉ quản trị viên. */
@Service
public class OperationLogService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 50;

    private static final List<OperationLogActorOption> DEMO_ACTORS = List.of(
            new OperationLogActorOption(CrmDemoActors.ADMIN_LOGIN, "Quản trị viên", StaffDepartment.ADMIN),
            new OperationLogActorOption(CrmDemoActors.CRM_LOGIN, "CRM Manager", StaffDepartment.CRM),
            new OperationLogActorOption(CrmDemoActors.CS_LOGIN, "CSKH", StaffDepartment.CS),
            new OperationLogActorOption(CrmDemoActors.SALES_LOGIN, "NV Kinh doanh", StaffDepartment.SALES)
    );

    private final OperationLogStore store;
    private final IdentityPort identity;

    public OperationLogService(OperationLogStore store, IdentityPort identity) {
        this.store = store;
        this.identity = identity;
    }

    public OperationLogPage list(
            UUID actorId,
            String text,
            String actorLogin,
            String department,
            String action,
            String outcome,
            int page,
            int pageSize
    ) {
        identity.requireSystemAdmin(actorId);
        int current = Math.max(page, 1);
        int size = pageSize <= 0 ? DEFAULT_PAGE_SIZE : Math.min(pageSize, MAX_PAGE_SIZE);
        return store.search(new OperationLogQuery(
                trim(text),
                trim(actorLogin),
                normalizeDepartment(department),
                trim(action),
                normalizeOutcome(outcome),
                current,
                size));
    }

    public OperationLogFacets facets(UUID actorId) {
        identity.requireSystemAdmin(actorId);
        OperationLogFacets stored = store.facets();
        Map<String, OperationLogActorOption> actors = new LinkedHashMap<>();
        for (OperationLogActorOption option : DEMO_ACTORS) {
            actors.put(option.login(), option);
        }
        for (OperationLogActorOption option : stored.actors()) {
            actors.put(option.login(), option);
        }
        TreeSet<String> departments = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        departments.addAll(List.of(
                StaffDepartment.ADMIN,
                StaffDepartment.CRM,
                StaffDepartment.CS,
                StaffDepartment.SALES));
        departments.addAll(stored.departments());
        TreeSet<String> actions = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
        actions.addAll(OperationActionCatalog.knownActions());
        actions.addAll(stored.actions());
        return new OperationLogFacets(
                actors.values().stream()
                        .sorted(Comparator.comparing(OperationLogActorOption::label, String.CASE_INSENSITIVE_ORDER))
                        .toList(),
                new ArrayList<>(departments),
                new ArrayList<>(actions));
    }

    private static String normalizeOutcome(String outcome) {
        if (outcome == null) {
            return "";
        }
        String value = outcome.trim().toLowerCase(Locale.ROOT);
        if ("success".equals(value) || "failed".equals(value)) {
            return value;
        }
        return "";
    }

    private static String normalizeDepartment(String department) {
        if (department == null) {
            return "";
        }
        return department.trim().toLowerCase(Locale.ROOT);
    }

    private static String trim(String value) {
        return value == null ? "" : value.trim();
    }
}
