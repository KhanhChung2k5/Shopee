package com.chototmua.crm.application.conversation;

import java.util.List;
import java.util.UUID;

/** Danh bạ nhân viên hỗ trợ và chi nhánh khách — không thêm bảng mới. */
public interface SupportDirectory {

    /** Nhân viên CSKH / CRM / admin có thể nhận hội thoại. */
    List<SupportAgent> listAgents();

    /** Chi nhánh gắn khách (hiện trên panel CSKH). */
    String branchOf(UUID userId);

    /** Tên hiển thị; {@code null} nếu không biết. */
    String nameOf(UUID userId);

    /** Phòng ban, hoặc null nếu không phải nhân viên. */
    String departmentOf(UUID userId);

    /** Một dòng danh bạ: mã user, tên, phòng ban. */
    record SupportAgent(UUID userId, String fullName, String department) {
    }
}
