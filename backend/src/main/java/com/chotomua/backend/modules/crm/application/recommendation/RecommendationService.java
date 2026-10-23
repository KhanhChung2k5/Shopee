package com.chotomua.backend.modules.crm.application.recommendation;

import com.chotomua.backend.modules.crm.application.campaign.CampaignService;
import com.chotomua.backend.modules.crm.application.exception.CrmForbiddenException;
import com.chotomua.backend.modules.crm.application.notification.NotificationStore;
import com.chotomua.backend.modules.crm.domain.notification.AppNotification;
import com.chotomua.backend.modules.crm.domain.recommendation.Recommendation;
import com.chotomua.backend.modules.crm.domain.recommendation.RecommendationReason;
import com.chotomua.backend.modules.crm.port.IdentityPort;
import com.chotomua.backend.modules.crm.port.OrderPort;
import com.chotomua.backend.modules.crm.port.ProductPort;
import com.chotomua.backend.modules.crm.port.dto.CustomerStatus;
import com.chotomua.backend.modules.crm.port.dto.CustomerView;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderLine;
import com.chotomua.backend.modules.crm.port.dto.DeliveredOrderView;
import com.chotomua.backend.modules.crm.port.dto.ProductFilter;
import com.chotomua.backend.modules.crm.port.dto.ProductView;
import com.chotomua.backend.modules.crm.web.dto.RecommendationItemResponse;
import com.chotomua.backend.modules.crm.web.dto.RecommendationListResponse;
import com.chotomua.backend.modules.crm.web.dto.RecommendationPushResponse;
import com.chotomua.backend.modules.crm.web.dto.SkippedRecipientResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Gợi ý sản phẩm theo hành vi mua. Port chỉ đọc catalog/đơn; không ghi loyalty.
 * Khách chưa có đơn delivered → bán chạy 90 ngày. Có đơn → chuỗi máy→tay cầm→đĩa + mua chung.
 */
@Service
public class RecommendationService {

    public static final int DEFAULT_LIMIT = 10;
    public static final int MAX_LIMIT = 50;
    public static final int LOOKBACK_DAYS = 90;
    public static final String TYPE_ACCESSORY = "accessory";
    public static final String TYPE_CONTROLLER = "controller";
    public static final String TYPE_GAME_DISC = "game_disc";
    public static final String STATUS_PUBLISHED = "published";

    private final IdentityPort identity;
    private final OrderPort orders;
    private final ProductPort products;
    private final NotificationStore notifications;
    private final Clock clock;

    @Autowired
    public RecommendationService(
            IdentityPort identity,
            OrderPort orders,
            ProductPort products,
            NotificationStore notifications
    ) {
        this(identity, orders, products, notifications, Clock.systemDefaultZone());
    }

    /** Cho phép kiểm thử gắn {@link Clock} cố định. */
    RecommendationService(
            IdentityPort identity,
            OrderPort orders,
            ProductPort products,
            NotificationStore notifications,
            Clock clock
    ) {
        this.identity = identity;
        this.orders = orders;
        this.products = products;
        this.notifications = notifications;
        this.clock = clock;
    }

    /** REST: nhân viên CRM xem mọi khách; khách chỉ xem của mình. */
    @Transactional(readOnly = true)
    public RecommendationListResponse list(UUID actorId, UUID userId, int limit) {
        authorizeView(actorId, userId);
        identity.getCustomer(userId);
        return toResponse(userId, recommend(userId, limit));
    }

    /**
     * Năm nhánh quy tắc. Kết quả xác định: cùng fixture → cùng thứ tự.
     * Loại sản phẩm đã sở hữu và hàng không {@code published}.
     */
    public List<Recommendation> recommend(UUID userId, int limit) {
        int cap = normalizeLimit(limit);
        List<DeliveredOrderView> delivered = orders.listDeliveredOrders(userId);
        if (delivered.isEmpty()) {
            return take(bestSellers(Set.of()), RecommendationReason.NEW_CUSTOMER_BEST_SELLER, cap);
        }
        Ownership owned = ownership(delivered);
        List<Recommendation> merged = new ArrayList<>();
        Set<UUID> seen = new LinkedHashSet<>();
        if (owned.hasType(TYPE_ACCESSORY) && !owned.hasType(TYPE_CONTROLLER)) {
            append(merged, seen, owned.productIds, controllers(), RecommendationReason.ACCESSORY_NEEDS_CONTROLLER, cap);
        }
        if (owned.hasType(TYPE_ACCESSORY) && owned.hasType(TYPE_CONTROLLER) && !owned.hasType(TYPE_GAME_DISC)) {
            append(merged, seen, owned.productIds, bestSellerDiscs(owned.productIds), RecommendationReason.CONSOLE_NEEDS_GAME_DISC, cap);
        }
        if (owned.hasType(TYPE_GAME_DISC)) {
            append(merged, seen, owned.productIds, sameGenreDiscs(owned), RecommendationReason.SAME_GENRE_GAME_DISC, cap);
        }
        append(merged, seen, owned.productIds, coPurchased(owned.productIds, cap), RecommendationReason.CO_PURCHASE, cap);
        return List.copyOf(merged);
    }

    /** Đẩy gợi ý một khách vào hộp thư in-app. Khách khóa/đã xóa không nhận. */
    @Transactional
    public RecommendationPushResponse pushToCustomer(UUID actorId, UUID userId, int limit) {
        return pushToCustomer(actorId, userId, limit, List.of());
    }

    /**
     * Đẩy các sản phẩm đã chọn. {@code productIds} rỗng thì lấy {@code limit} gợi ý đầu.
     * Id không nằm trong gợi ý hiện tại bị bỏ qua.
     */
    @Transactional
    public RecommendationPushResponse pushToCustomer(UUID actorId, UUID userId, int limit, List<UUID> productIds) {
        identity.requireCrmStaff(actorId);
        CustomerView customer = identity.getCustomer(userId);
        UUID referenceId = UUID.randomUUID();
        Instant now = Instant.now(clock);
        List<SkippedRecipientResponse> skipped = new ArrayList<>();
        int sent = deliver(customer, pick(recommend(userId, pickLimit(limit, productIds)), productIds), referenceId, now, skipped);
        return new RecommendationPushResponse(referenceId, CampaignService.REFERENCE_CAMPAIGN, sent, List.copyOf(skipped));
    }

    private int deliver(
            CustomerView customer,
            List<Recommendation> items,
            UUID referenceId,
            Instant now,
            List<SkippedRecipientResponse> skipped
    ) {
        if (!CustomerStatus.ACTIVE.equals(customer.status())) {
            skipped.add(new SkippedRecipientResponse(customer.id(), customer.fullName(), customer.status()));
            return 0;
        }
        if (items.isEmpty()) {
            return 0;
        }
        notifications.append(List.of(new AppNotification(
                UUID.randomUUID(),
                customer.id(),
                CampaignService.REFERENCE_CAMPAIGN,
                referenceId,
                CampaignService.CHANNEL_IN_APP,
                contentOf(items),
                CampaignService.STATUS_SENT,
                now)));
        return 1;
    }

    private void authorizeView(UUID actorId, UUID userId) {
        if (actorId.equals(userId)) {
            return;
        }
        try {
            identity.requireCrmStaff(actorId);
        } catch (CrmForbiddenException exception) {
            throw new CrmForbiddenException("Bạn không có quyền xem gợi ý của khách khác.");
        }
    }

    private List<ProductView> bestSellers(Set<UUID> exclude) {
        Instant to = Instant.now(clock);
        Instant from = to.minus(LOOKBACK_DAYS, ChronoUnit.DAYS);
        List<ProductView> ranked = new ArrayList<>();
        for (ProductView product : products.topSellers(from, to, fetchSize())) {
            if (eligible(product, exclude, Set.of())) {
                ranked.add(product);
            }
        }
        return ranked;
    }

    private List<ProductView> controllers() {
        return products.search(publishedType(TYPE_CONTROLLER));
    }

    private List<ProductView> bestSellerDiscs(Set<UUID> exclude) {
        LinkedHashSet<UUID> already = new LinkedHashSet<>();
        List<ProductView> ranked = new ArrayList<>();
        for (ProductView product : bestSellers(exclude)) {
            if (TYPE_GAME_DISC.equalsIgnoreCase(nullToEmpty(product.productType()))) {
                ranked.add(product);
                already.add(product.id());
            }
        }
        for (ProductView product : products.search(publishedType(TYPE_GAME_DISC))) {
            if (eligible(product, exclude, already)) {
                ranked.add(product);
                already.add(product.id());
            }
        }
        return ranked;
    }

    private List<ProductView> sameGenreDiscs(Ownership owned) {
        LinkedHashSet<UUID> already = new LinkedHashSet<>();
        List<ProductView> ranked = new ArrayList<>();
        for (String genre : owned.genres) {
            for (ProductView product : products.search(publishedGenreDisc(genre))) {
                if (eligible(product, owned.productIds, already)) {
                    ranked.add(product);
                    already.add(product.id());
                }
            }
        }
        return ranked;
    }

    private List<ProductView> coPurchased(Set<UUID> ownedIds, int limit) {
        List<ProductView> ranked = new ArrayList<>();
        for (UUID productId : orders.coPurchasedProducts(ownedIds, fetchSize(limit))) {
            Optional<ProductView> found = products.find(productId);
            if (found.isEmpty()) {
                continue;
            }
            ProductView product = found.get();
            if (eligible(product, ownedIds, idsOf(ranked))) {
                ranked.add(product);
            }
        }
        return ranked;
    }

    private Ownership ownership(List<DeliveredOrderView> delivered) {
        Set<UUID> productIds = new LinkedHashSet<>();
        Set<String> types = new LinkedHashSet<>();
        Set<String> genres = new LinkedHashSet<>();
        for (DeliveredOrderView order : delivered) {
            for (DeliveredOrderLine line : order.lines()) {
                productIds.add(line.productId());
                Optional<ProductView> found = products.find(line.productId());
                if (found.isPresent()) {
                    ProductView product = found.get();
                    String type = blankToNull(product.productType());
                    if (type != null) {
                        types.add(type.toLowerCase(Locale.ROOT));
                    }
                    String genre = firstNonBlank(line.genre(), product.genre());
                    if (genre != null) {
                        genres.add(genre);
                    }
                } else if (blankToNull(line.genre()) != null) {
                    genres.add(line.genre().trim());
                }
            }
        }
        return new Ownership(productIds, types, genres);
    }

    private static void append(
            List<Recommendation> out,
            Set<UUID> seen,
            Set<UUID> owned,
            List<ProductView> candidates,
            RecommendationReason reason,
            int limit
    ) {
        for (ProductView product : candidates) {
            if (out.size() >= limit) {
                return;
            }
            if (!eligible(product, owned, seen)) {
                continue;
            }
            seen.add(product.id());
            out.add(new Recommendation(product, reason));
        }
    }

    private static List<Recommendation> take(List<ProductView> candidates, RecommendationReason reason, int limit) {
        List<Recommendation> out = new ArrayList<>();
        append(out, new LinkedHashSet<>(), Set.of(), candidates, reason, limit);
        return List.copyOf(out);
    }

    private static boolean eligible(ProductView product, Set<UUID> owned, Set<UUID> seen) {
        if (product == null || product.id() == null) {
            return false;
        }
        if (owned.contains(product.id()) || seen.contains(product.id())) {
            return false;
        }
        return STATUS_PUBLISHED.equalsIgnoreCase(nullToEmpty(product.status()));
    }

    private static RecommendationListResponse toResponse(UUID userId, List<Recommendation> items) {
        List<RecommendationItemResponse> rows = items.stream()
                .map(RecommendationService::toItem)
                .toList();
        return new RecommendationListResponse(userId, rows);
    }

    private static RecommendationItemResponse toItem(Recommendation row) {
        ProductView product = row.product();
        return new RecommendationItemResponse(
                product.id(),
                product.name(),
                product.brandName(),
                product.productType(),
                product.categoryName(),
                product.genre(),
                product.platforms(),
                product.price(),
                row.reason().name(),
                row.reason().label());
    }

    private static String contentOf(List<Recommendation> items) {
        StringBuilder text = new StringBuilder("Gợi ý dành cho bạn: ");
        for (int i = 0; i < items.size(); i++) {
            Recommendation row = items.get(i);
            if (i > 0) {
                text.append("; ");
            }
            text.append(row.product().name())
                    .append(" (")
                    .append(row.reason().label())
                    .append(")");
        }
        text.append(".");
        return text.toString();
    }

    private static int pickLimit(int limit, List<UUID> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return limit;
        }
        return MAX_LIMIT;
    }

    private static List<Recommendation> pick(List<Recommendation> items, List<UUID> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            return items;
        }
        Set<UUID> wanted = new LinkedHashSet<>(productIds);
        List<Recommendation> chosen = new ArrayList<>();
        for (Recommendation row : items) {
            if (wanted.contains(row.product().id())) {
                chosen.add(row);
            }
        }
        return List.copyOf(chosen);
    }

    private int fetchSize() {
        return fetchSize(MAX_LIMIT);
    }

    private static int fetchSize(int limit) {
        return Math.max(limit * 3, 20);
    }

    static int normalizeLimit(int limit) {
        if (limit < 1) {
            return DEFAULT_LIMIT;
        }
        return Math.min(limit, MAX_LIMIT);
    }

    private static ProductFilter publishedType(String productType) {
        return new ProductFilter(null, productType, null, null, null, null, null, true);
    }

    private static ProductFilter publishedGenreDisc(String genre) {
        return new ProductFilter(null, TYPE_GAME_DISC, null, genre, null, null, null, true);
    }

    private static Set<UUID> idsOf(List<ProductView> products) {
        Set<UUID> ids = new LinkedHashSet<>();
        for (ProductView product : products) {
            ids.add(product.id());
        }
        return ids;
    }

    private static String firstNonBlank(String first, String second) {
        String left = blankToNull(first);
        return left != null ? left : blankToNull(second);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private record Ownership(Set<UUID> productIds, Set<String> types, Set<String> genres) {
        boolean hasType(String type) {
            return types.contains(type.toLowerCase(Locale.ROOT));
        }
    }
}
