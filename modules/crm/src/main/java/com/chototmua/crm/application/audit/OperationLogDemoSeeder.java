package com.chototmua.crm.application.audit;

import com.chototmua.crm.config.CrmDemoActors;
import com.chototmua.crm.domain.audit.OperationLog;
import com.chototmua.crm.port.dto.StaffDepartment;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

/**
 * Vài dòng mẫu khi nhật ký còn trống, để trang quản trị có gì để xem ngay.
 * Không ghi đè nếu đã có thao tác thật.
 */
@Component
@Order(500)
public class OperationLogDemoSeeder implements ApplicationRunner {

    private final OperationLogStore store;

    public OperationLogDemoSeeder(OperationLogStore store) {
        this.store = store;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!store.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        List<OperationLog> samples = List.of(
                sample(
                        "a0100001-0000-4000-8000-000000000001",
                        CrmDemoActors.ADMIN_ID,
                        CrmDemoActors.ADMIN_LOGIN,
                        "Quản trị viên",
                        StaffDepartment.ADMIN,
                        "Tạo chiến dịch",
                        "POST",
                        "/api/campaigns",
                        201,
                        "success",
                        now.minus(35, ChronoUnit.MINUTES)),
                sample(
                        "a0100001-0000-4000-8000-000000000002",
                        CrmDemoActors.CS_ID,
                        CrmDemoActors.CS_LOGIN,
                        "CSKH",
                        StaffDepartment.CS,
                        "Gửi tin nhắn hội thoại",
                        "POST",
                        "/api/conversations/b1000001-0000-4000-8000-000000000001/messages",
                        201,
                        "success",
                        now.minus(2, ChronoUnit.HOURS)),
                sample(
                        "a0100001-0000-4000-8000-000000000003",
                        CrmDemoActors.SALES_ID,
                        CrmDemoActors.SALES_LOGIN,
                        "NV Kinh doanh",
                        StaffDepartment.SALES,
                        "Tạo khách hàng",
                        "POST",
                        "/api/customers",
                        403,
                        "failed",
                        now.minus(3, ChronoUnit.HOURS)),
                sample(
                        "a0100001-0000-4000-8000-000000000004",
                        CrmDemoActors.CRM_ID,
                        CrmDemoActors.CRM_LOGIN,
                        "CRM Manager",
                        StaffDepartment.CRM,
                        "Đổi trạng thái khách hàng",
                        "PATCH",
                        "/api/customers/aaaa1111-1111-1111-1111-111111111111",
                        200,
                        "success",
                        now.minus(5, ChronoUnit.HOURS)),
                sample(
                        "a0100001-0000-4000-8000-000000000005",
                        CrmDemoActors.ADMIN_ID,
                        CrmDemoActors.ADMIN_LOGIN,
                        "Quản trị viên",
                        StaffDepartment.ADMIN,
                        "Khôi phục khách hàng",
                        "POST",
                        "/api/customers/ffff6666-6666-6666-6666-666666666666/restore",
                        200,
                        "success",
                        now.minus(1, ChronoUnit.DAYS))
        );
        for (OperationLog sample : samples) {
            store.append(sample);
        }
    }

    private static OperationLog sample(
            String id,
            UUID actorId,
            String login,
            String label,
            String department,
            String action,
            String method,
            String path,
            int status,
            String outcome,
            Instant occurredAt
    ) {
        return new OperationLog(
                UUID.fromString(id),
                actorId,
                login,
                label,
                department,
                action,
                method,
                path,
                status,
                outcome,
                occurredAt);
    }
}
