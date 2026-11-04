package com.chotomua.backend.modules.crm.application.report;

import com.chotomua.backend.modules.crm.application.campaign.CampaignProductTargetStore;
import com.chotomua.backend.modules.crm.application.campaign.CampaignStore;
import com.chotomua.backend.modules.crm.application.exception.CampaignNotFoundException;
import com.chotomua.backend.modules.crm.application.notification.NotificationStore;
import com.chotomua.backend.modules.crm.domain.campaign.Campaign;
import com.chotomua.backend.modules.crm.domain.campaign.CampaignProductTarget;
import com.chotomua.backend.modules.crm.domain.notification.AppNotification;
import com.chotomua.backend.modules.crm.port.IdentityPort;
import com.chotomua.backend.modules.crm.port.OrderPort;
import com.chotomua.backend.modules.crm.port.ProductPort;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderLine;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderView;
import com.chotomua.backend.modules.crm.port.dto.ProductFilter;
import com.chotomua.backend.modules.crm.port.dto.ProductView;
import com.chotomua.backend.modules.crm.web.dto.CampaignFunnelResponse;
import com.chotomua.backend.modules.crm.web.dto.ReportBucket;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Phễu: nhắm tới → đã vào hộp thư → đã đọc → mua trong cửa sổ chiến dịch.
 * "Mua" là đơn đặt trong cửa sổ chiến dịch và đã giao: đơn đặt trước chiến dịch không phải do chiến dịch mang lại.
 * Có sản phẩm mục tiêu thì đơn phải chứa sản phẩm đó; không có thì là bất kỳ đơn nào.
 * Chỉ tính thư do chính chiến dịch gửi ({@code campaignId}); không ghi {@code campaign_id} lên đơn.
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
        Set<UUID> recipients = notifications.recipientIds(NotificationStore.SCOPE_CAMPAIGN, campaign.id());
        Set<UUID> sentUsers = new LinkedHashSet<>();
        int opened = 0;
        for (UUID userId : recipients) {
            String status = inboxStatus(userId, campaign.id());
            if (status != null) {
                sentUsers.add(userId);
                if (STATUS_READ.equals(status)) {
                    opened += 1;
                }
            }
        }
        Set<UUID> targetProducts = resolveProductIds(productTargets.find(campaignId).orElse(null));
        int converted = 0;
        for (UUID userId : sentUsers) {
            if (boughtInWindow(userId, targetProducts, from, to)) {
                converted += 1;
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
                opened,
                converted,
                rate,
                List.copyOf(targetProducts),
                stages(targeted, sent, opened, converted));
    }

    /** Tầng biểu đồ: mẫu số là số người được nhắm. */
    private static List<ReportBucket> stages(int targeted, int sent, int opened, int converted) {
        return List.of(
                new ReportBucket("targeted", "Nhắm", targeted, CustomerReportService.percent(targeted, targeted)),
                new ReportBucket("sent", "Đã gửi", sent, CustomerReportService.percent(sent, targeted)),
                new ReportBucket("opened", "Đã đọc", opened, CustomerReportService.percent(opened, targeted)),
                new ReportBucket("converted", "Mua sau chiến dịch", converted, CustomerReportService.percent(converted, targeted)));
    }

    /**
     * Trạng thái thư của chiến dịch trong hộp thư khách: {@code read} nếu đã mở, {@code sent} nếu mới vào hộp thư,
     * {@code null} nếu chưa phát (còn lịch).
     */
    private String inboxStatus(UUID userId, UUID campaignId) {
        String best = null;
        for (AppNotification note : notifications.findByUser(userId)) {
            if (!campaignId.equals(note.campaignId())) {
                continue;
            }
            if (STATUS_READ.equals(note.status())) {
                return STATUS_READ;
            }
            if (STATUS_SENT.equals(note.status())) {
                best = STATUS_SENT;
            }
        }
        return best;
    }

    /** Đơn đã giao, đặt trong cửa sổ; có sản phẩm mục tiêu thì đơn phải chứa ít nhất một sản phẩm đó. */
    private boolean boughtInWindow(UUID userId, Set<UUID> targetProducts, Instant from, Instant to) {
        List<DeliveredOrderView> delivered = orders.listDeliveredOrders(userId);
        if (delivered == null) {
            return false;
        }
        for (DeliveredOrderView order : delivered) {
            if (!CampaignConversionWindow.contains(order.placedAt(), from, to)) {
                continue;
            }
            if (targetProducts.isEmpty()) {
                return true;
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

}
