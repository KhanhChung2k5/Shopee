package com.chototmua.crm.adapter.fake;

import com.chototmua.crm.application.conversation.ConversationStore;
import com.chototmua.crm.application.conversation.ConversationText;
import com.chototmua.crm.config.CrmDemoActors;
import com.chototmua.crm.domain.conversation.AgentAssignment;
import com.chototmua.crm.domain.conversation.Conversation;
import com.chototmua.crm.domain.conversation.ConversationMessage;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Vài hội thoại mẫu cho bàn CSKH khi chạy hồ sơ {@code crm-fake}.
 * Bài kiểm tra xóa kho trước mỗi ca nên không phụ thuộc dữ liệu này.
 */
@Component
@Profile("crm-fake")
@Order(400)
public class CrmFakeConversationSeeder implements ApplicationRunner {

    private static final UUID OPEN_TICKET = UUID.fromString("b1000001-0000-4000-8000-000000000001");
    private static final UUID CLOSED_TICKET = UUID.fromString("b1000001-0000-4000-8000-000000000007");
    private static final UUID BINH_TICKET = UUID.fromString("b1000001-0000-4000-8000-000000000002");
    private static final UUID ORDER_AN = UUID.fromString("aaaa0001-0000-0000-0000-000000000001");

    private final ConversationStore store;

    public CrmFakeConversationSeeder(ConversationStore store) {
        this.store = store;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!store.listAll().isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        // An · low · còn hạn (SLA 24h)
        seed(
                OPEN_TICKET,
                CrmDemoActors.CUSTOMER_AN_ID,
                ORDER_AN,
                ConversationText.TYPE_TICKET,
                "khieu_nai",
                ConversationText.STATUS_OPEN,
                ConversationText.PRIORITY_LOW,
                now.minus(2, ChronoUnit.HOURS),
                CrmDemoActors.CS_ID,
                "Mình muốn hỏi tình trạng đơn và bảo hành.",
                false);
        seed(
                CLOSED_TICKET,
                CrmDemoActors.CUSTOMER_AN_ID,
                null,
                ConversationText.TYPE_TICKET,
                "bao_hanh",
                ConversationText.STATUS_CLOSED,
                ConversationText.PRIORITY_NORMAL,
                now.minus(10, ChronoUnit.DAYS),
                CrmDemoActors.CS_ID,
                "Lần trước tay cầm không nhận sạc. Shop đã đổi máy mới.",
                false);
        // Bình · normal · sắp hết hạn (SLA 4h, còn ~10 phút)
        seed(
                BINH_TICKET,
                CrmDemoActors.CUSTOMER_BINH_ID,
                null,
                ConversationText.TYPE_TICKET,
                "hoi_don",
                ConversationText.STATUS_IN_PROGRESS,
                ConversationText.PRIORITY_NORMAL,
                now.minus(230, ChronoUnit.MINUTES),
                CrmDemoActors.CRM_ID,
                "Đơn đĩa game của mình giao chậm hơn dự kiến.",
                false);
        // Dũng · high · vượt SLA (SLA 1h)
        seed(
                UUID.fromString("b1000001-0000-4000-8000-000000000003"),
                CrmDemoActors.CUSTOMER_DUNG_ID,
                null,
                ConversationText.TYPE_TICKET,
                "khieu_nai",
                ConversationText.STATUS_OPEN,
                ConversationText.PRIORITY_HIGH,
                now.minus(2, ChronoUnit.DAYS),
                CrmDemoActors.CS_ID,
                "Tay cầm DualSense bị trôi analog sau 3 ngày. Mình muốn đổi bảo hành.",
                true);
        // Linh · normal · sắp hết hạn
        seed(
                UUID.fromString("b1000001-0000-4000-8000-000000000005"),
                CrmDemoActors.CUSTOMER_LINH_ID,
                null,
                ConversationText.TYPE_TICKET,
                "hoi_don",
                ConversationText.STATUS_IN_PROGRESS,
                ConversationText.PRIORITY_NORMAL,
                now.minus(230, ChronoUnit.MINUTES),
                CrmDemoActors.CS_ID,
                "Đơn hàng của mình sắp tới hạn giao, shop xác nhận giúp mình với.",
                false);
    }

    private void seed(
            UUID id,
            UUID customerId,
            UUID orderId,
            String type,
            String topic,
            String status,
            String priority,
            Instant openedAt,
            UUID assigneeId,
            String customerText,
            boolean withBot
    ) {
        store.save(new Conversation(
                id,
                customerId,
                orderId,
                type,
                "web",
                topic,
                status,
                priority,
                openedAt,
                openedAt.plus(2, ChronoUnit.MINUTES)));
        store.appendMessage(new ConversationMessage(
                UUID.randomUUID(),
                id,
                customerId,
                ConversationText.KIND_PUBLIC,
                customerText,
                null,
                openedAt));
        if (withBot) {
            store.appendMessage(new ConversationMessage(
                    UUID.randomUUID(),
                    id,
                    customerId,
                    ConversationText.KIND_BOT,
                    ConversationText.BOT_GREETING,
                    null,
                    openedAt.plus(1, ChronoUnit.MINUTES)));
        } else if (ConversationText.STATUS_CLOSED.equals(status)) {
            store.appendMessage(new ConversationMessage(
                    UUID.randomUUID(),
                    id,
                    assigneeId,
                    ConversationText.KIND_PUBLIC,
                    "Em đã xử lý xong và đóng yêu cầu.",
                    null,
                    openedAt.plus(2, ChronoUnit.MINUTES)));
        } else {
            store.appendMessage(new ConversationMessage(
                    UUID.randomUUID(),
                    id,
                    assigneeId,
                    ConversationText.KIND_PUBLIC,
                    "Em đang kiểm tra với kho và sẽ phản hồi sớm.",
                    null,
                    openedAt.plus(30, ChronoUnit.MINUTES)));
        }
        store.replaceCurrentAssignment(id, new AgentAssignment(
                UUID.randomUUID(),
                id,
                assigneeId,
                true,
                openedAt));
    }
}
