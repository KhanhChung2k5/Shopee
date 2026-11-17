package com.chototmua.crm.application.survey;

import com.chototmua.crm.adapter.fake.FakeIdentityPort;
import com.chototmua.crm.adapter.fake.FakeOrderPort;
import com.chototmua.crm.adapter.fake.FakeProductPort;
import com.chototmua.crm.application.notification.InMemoryNotificationStore;
import com.chototmua.crm.domain.notification.AppNotification;
import com.chototmua.crm.domain.survey.Survey;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.port.dto.ProductView;
import com.chototmua.crm.port.dto.StaffDepartment;
import com.chototmua.crm.web.dto.OrderDeliveredSurveyResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Hook đơn delivered: đúng 1 notification, chống trùng, loại locked/deleted, không khớp thì 0. */
class OrderDeliveredSurveyDispatcherTest {

    private static final Instant NOW = Instant.parse("2026-10-17T08:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);
    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID PRODUCT = UUID.fromString("02020202-0000-0000-0000-000000000001");
    private static final UUID OTHER = UUID.fromString("02020202-0000-0000-0000-000000000002");
    private static final UUID CAT = UUID.fromString("01010101-0000-0000-0000-000000000001");

    private FakeIdentityPort identity;
    private FakeOrderPort orders;
    private FakeProductPort products;
    private InMemorySurveyStore surveys;
    private InMemorySurveyTargetStore targets;
    private InMemoryNotificationStore notifications;
    private SurveyTargetService targetService;
    private OrderDeliveredSurveyDispatcher dispatcher;
    private UUID surveyId;
    private UUID orderId;
    private CustomerView customer;

    @BeforeEach
    void setUp() {
        identity = new FakeIdentityPort();
        orders = new FakeOrderPort();
        products = new FakeProductPort();
        surveys = new InMemorySurveyStore();
        targets = new InMemorySurveyTargetStore();
        notifications = new InMemoryNotificationStore();
        targetService = new SurveyTargetService(identity, products, surveys, targets);
        dispatcher = new OrderDeliveredSurveyDispatcher(
                identity, orders, surveys, targetService, notifications, CLOCK);
        identity.seedStaff(ADMIN, StaffDepartment.ADMIN);
        products.seed(new ProductView(
                PRODUCT, "Tay cầm DualSense", "Sony", "controller",
                CAT, "Tay cầm", null, List.of("PS5"), new BigDecimal("1890000"), "published"));
        products.seed(new ProductView(
                OTHER, "Đĩa EA FC 25", "EA", "game_disc",
                CAT, "Đĩa game", "Thể thao", List.of("PS5"), new BigDecimal("990000"), "published"));
        customer = identity.seedCustomer(
                "An", "male", LocalDate.of(1998, 5, 12), CustomerStatus.ACTIVE);
        surveyId = UUID.randomUUID();
        orderId = UUID.randomUUID();
        surveys.save(new Survey(surveyId, ADMIN, "Sau giao hàng", "Góp ý", Survey.DRAFT, NOW), List.of());
        targetService.set(ADMIN, surveyId, List.of(PRODUCT), null);
        orders.seedDeliveredOrder(new DeliveredOrderView(
                orderId,
                customer.id(),
                new BigDecimal("1890000"),
                NOW,
                List.of(new DeliveredOrderLine(PRODUCT, CAT, "Tay cầm", new BigDecimal("1890000")))));
    }

    @Test
    void matchingActiveCustomerReceivesOneSurveyNotification() {
        OrderDeliveredSurveyResponse first = dispatcher.dispatch(ADMIN, customer.id(), orderId);

        assertThat(first.sentCount()).isEqualTo(1);
        assertThat(first.surveyIds()).containsExactly(surveyId);
        List<AppNotification> inbox = notifications.findByUser(customer.id());
        assertThat(inbox).hasSize(1);
        assertThat(inbox.getFirst().referenceType()).isEqualTo("survey");
        assertThat(inbox.getFirst().referenceId()).isEqualTo(surveyId);
        assertThat(inbox.getFirst().channel()).isEqualTo("in_app");
        assertThat(surveys.find(surveyId)).hasValueSatisfying(survey ->
                assertThat(survey.status()).isEqualTo(Survey.SENT));

        OrderDeliveredSurveyResponse second = dispatcher.dispatch(ADMIN, customer.id(), orderId);
        assertThat(second.sentCount()).isZero();
        assertThat(notifications.findByUser(customer.id())).hasSize(1);
    }

    @Test
    void lockedOrDeletedCustomerReceivesNothing() {
        CustomerView locked = identity.seedCustomer(
                "Khoa", "male", LocalDate.of(1990, 1, 1), CustomerStatus.LOCKED);
        CustomerView deleted = identity.seedCustomer(
                "Xoa", "female", LocalDate.of(1991, 1, 1), CustomerStatus.DELETED);
        UUID lockedOrder = UUID.randomUUID();
        UUID deletedOrder = UUID.randomUUID();
        orders.seedDeliveredOrder(order(lockedOrder, locked.id(), PRODUCT));
        orders.seedDeliveredOrder(order(deletedOrder, deleted.id(), PRODUCT));

        assertThat(dispatcher.dispatch(ADMIN, locked.id(), lockedOrder).sentCount()).isZero();
        assertThat(dispatcher.dispatch(ADMIN, deleted.id(), deletedOrder).sentCount()).isZero();
        assertThat(notifications.findByUser(locked.id())).isEmpty();
        assertThat(notifications.findByUser(deleted.id())).isEmpty();
    }

    @Test
    void unmatchedProductSendsNothing() {
        UUID otherOrder = UUID.randomUUID();
        orders.seedDeliveredOrder(order(otherOrder, customer.id(), OTHER));

        assertThat(dispatcher.dispatch(ADMIN, customer.id(), otherOrder).sentCount()).isZero();
        assertThat(notifications.findByUser(customer.id())).isEmpty();
    }

    @Test
    void closedSurveyIsSkipped() {
        surveys.save(new Survey(surveyId, ADMIN, "Sau giao hàng", "Góp ý", Survey.CLOSED, NOW), List.of());

        assertThat(dispatcher.dispatch(ADMIN, customer.id(), orderId).sentCount()).isZero();
        assertThat(notifications.findByUser(customer.id())).isEmpty();
    }

    private static DeliveredOrderView order(UUID orderId, UUID userId, UUID productId) {
        return new DeliveredOrderView(
                orderId,
                userId,
                BigDecimal.TEN,
                NOW,
                List.of(new DeliveredOrderLine(productId, CAT, "Tay cầm", BigDecimal.TEN)));
    }
}
