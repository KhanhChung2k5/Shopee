package com.chototmua.crm.application.report;

import com.chototmua.crm.application.campaign.CampaignProductTargetStore;
import com.chototmua.crm.application.campaign.CampaignService;
import com.chototmua.crm.application.campaign.CampaignStore;
import com.chototmua.crm.application.exception.CampaignNotFoundException;
import com.chototmua.crm.application.notification.NotificationStore;
import com.chototmua.crm.domain.campaign.Campaign;
import com.chototmua.crm.domain.campaign.CampaignProductTarget;
import com.chototmua.crm.domain.notification.AppNotification;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.ProductPort;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.port.dto.ProductFilter;
import com.chototmua.crm.port.dto.ProductView;
import com.chototmua.crm.web.dto.CampaignFunnelResponse;
import com.chototmua.crm.web.dto.ReportBucket;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Funnel suy ra từ thông báo đã tạo và đơn {@code delivered} trong cửa sổ chiến dịch.
 * Không đọc click inbox, không ghi {@code campaign_id} lên đơn.
 */
@Service
public class CampaignFunnelService {

    private static final String STATUS_SENT = "sent";
    private static final String STATUS_READ = "read";

    private final IdentityPort identity;
    private final OrderPort orders;
    private final ProductPort products;
    private final CampaignStore campaigns;
    private final CampaignProductTargetStore productTargets;
    private final NotificationStore notifications;

    public CampaignFunnelService(
            IdentityPort identity,
            OrderPort orders,
            ProductPort products,
            CampaignStore campaigns,
            CampaignProductTargetStore productTargets,
            NotificationStore notifications
    ) {
        this.identity = identity;
        this.orders = orders;
        this.products = products;
        this.campaigns = campaigns;
        this.productTargets = productTargets;
        this.notifications = notifications;
    }

    /** Quản trị, quản lý CRM và CSKH được xem. */
    public CampaignFunnelResponse build(UUID actorId, UUID campaignId) {
        identity.requireMarketingStaff(actorId);
        Campaign campaign = campaigns.find(campaignId)
                .orElseThrow(() -> new CampaignNotFoundException(campaignId));
        Instant from = CampaignConversionWindow.from(campaign);
        Instant to = CampaignConversionWindow.to(campaign);
        Reference reference = referenceOf(campaign);
        Set<UUID> recipients = notifications.recipientIds(reference.type(), reference.id());
        Set<UUID> sentUsers = new LinkedHashSet<>();
        for (UUID userId : recipients) {
            if (inboxDelivered(userId, reference)) {
                sentUsers.add(userId);
            }
        }
        Set<UUID> targetProducts = resolveProductIds(productTargets.find(campaignId).orElse(null));
        int converted = 0;
        if (!targetProducts.isEmpty()) {
            for (UUID userId : sentUsers) {
                if (boughtTargetInWindow(userId, targetProducts, from, to)) {
                    converted += 1;
                }
            }
        }
        int targeted = recipients.size();
        int sent = sentUsers.size();
        BigDecimal rate = CustomerReportService.percent(converted, sent);
        return new CampaignFunnelResponse(
                campaign.id(),
                campaign.name(),
                from,
                to,
                !targetProducts.isEmpty(),
                targeted,
                sent,
                converted,
                rate,
                List.copyOf(targetProducts),
                stages(targeted, sent, converted));
    }

    /** Tầng biểu đồ: mẫu số là số người được nhắm. */
    private static List<ReportBucket> stages(int targeted, int sent, int converted) {
        return List.of(
                new ReportBucket("targeted", "Nhắm", targeted, CustomerReportService.percent(targeted, targeted)),
                new ReportBucket("sent", "Đã gửi", sent, CustomerReportService.percent(sent, targeted)),
                new ReportBucket("converted", "Mua sau chiến dịch", converted, CustomerReportService.percent(converted, targeted)));
    }

    /** Thư đã vào hộp thư ({@code sent} hoặc {@code read}), không tính lịch. */
    private boolean inboxDelivered(UUID userId, Reference reference) {
        for (AppNotification note : notifications.findByUser(userId)) {
            if (!reference.type().equals(note.referenceType()) || !reference.id().equals(note.referenceId())) {
                continue;
            }
            if (STATUS_SENT.equals(note.status()) || STATUS_READ.equals(note.status())) {
                return true;
            }
        }
        return false;
    }

    /** Đơn đã giao trong cửa sổ và có ít nhất một sản phẩm mục tiêu. */
    private boolean boughtTargetInWindow(UUID userId, Set<UUID> targetProducts, Instant from, Instant to) {
        List<DeliveredOrderView> delivered = orders.listDeliveredOrders(userId);
        if (delivered == null) {
            return false;
        }
        for (DeliveredOrderView order : delivered) {
            if (!CampaignConversionWindow.contains(order.deliveredAt(), from, to)) {
                continue;
            }
            if (order.lines() == null) {
                continue;
            }
            for (DeliveredOrderLine line : order.lines()) {
                if (line.productId() != null && targetProducts.contains(line.productId())) {
                    return true;
                }
            }
        }
        return false;
    }

    /** Cùng quy tắc resolve lúc gửi: id cụ thể hợp kết quả bộ lọc. */
    private Set<UUID> resolveProductIds(CampaignProductTarget target) {
        if (target == null) {
            return Set.of();
        }
        Set<UUID> ids = new LinkedHashSet<>();
        if (target.productIds() != null) {
            ids.addAll(target.productIds());
        }
        ProductFilter filter = target.filter();
        if (filter != null && !filter.isUnconstrained()) {
            for (ProductView product : products.search(filter)) {
                ids.add(product.id());
            }
        }
        return ids;
    }

    /** Khảo sát thì thư neo {@code surveyId}; không thì neo chính chiến dịch. */
    private static Reference referenceOf(Campaign campaign) {
        if (campaign.surveyId() == null) {
            return new Reference(CampaignService.REFERENCE_CAMPAIGN, campaign.id());
        }
        return new Reference(CampaignService.REFERENCE_SURVEY, campaign.surveyId());
    }

    private record Reference(String type, UUID id) {
    }
}
