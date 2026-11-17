package com.chototmua.crm.adapter.fake;

import com.chototmua.crm.application.conversation.SupportDirectory;
import com.chototmua.crm.config.CrmDemoActors;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Danh bạ và chi nhánh giả lập, khớp tài khoản demo. */
@Component
@Profile("crm-fake")
public class FakeSupportDirectory implements SupportDirectory {

    private static final Map<UUID, SupportAgent> AGENTS = Map.of(
            CrmDemoActors.ADMIN_ID, new SupportAgent(CrmDemoActors.ADMIN_ID, "Quản trị viên", "admin"),
            CrmDemoActors.CRM_ID, new SupportAgent(CrmDemoActors.CRM_ID, "Quản lý CRM", "crm"),
            CrmDemoActors.CS_ID, new SupportAgent(CrmDemoActors.CS_ID, "Minh", "cs"));

    private static final Map<UUID, String> BRANCHES = Map.of(
            CrmDemoActors.CUSTOMER_AN_ID, "Chi nhánh Quận 1",
            CrmDemoActors.CUSTOMER_BINH_ID, "Chi nhánh Thủ Đức",
            CrmDemoActors.CUSTOMER_DUNG_ID, "Chi nhánh Bình Thạnh",
            CrmDemoActors.CUSTOMER_LINH_ID, "Chi nhánh Quận 3");

    @Override
    public List<SupportAgent> listAgents() {
        return List.of(
                AGENTS.get(CrmDemoActors.CS_ID),
                AGENTS.get(CrmDemoActors.CRM_ID),
                AGENTS.get(CrmDemoActors.ADMIN_ID));
    }

    @Override
    public String branchOf(UUID userId) {
        return BRANCHES.getOrDefault(userId, "—");
    }

    @Override
    public String nameOf(UUID userId) {
        SupportAgent agent = AGENTS.get(userId);
        return agent == null ? null : agent.fullName();
    }

    @Override
    public String departmentOf(UUID userId) {
        SupportAgent agent = AGENTS.get(userId);
        return agent == null ? null : agent.department();
    }
}
