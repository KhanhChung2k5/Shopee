package com.chototmua.crm.adapter.fake;

import com.chototmua.crm.application.profile.CustomerProfileService;
import com.chototmua.crm.config.CrmDemoActors;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.port.dto.CustomerFilter;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.DeliveredOrderLine;
import com.chototmua.crm.port.dto.DeliveredOrderView;
import com.chototmua.crm.port.dto.StaffDepartment;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Gieo khách, nhân viên và đơn đã giao để thử giao diện / API khi chạy hồ sơ {@code crm-fake}.
 * Bài kiểm tra tự {@code reset()} nên không phụ thuộc dữ liệu này.
 */
@Component
@Profile("crm-fake")
@Order(100)
public class CrmFakeDataSeeder implements ApplicationRunner {

    static final UUID CUSTOMER_AN = UUID.fromString("aaaa1111-1111-1111-1111-111111111111");
    static final UUID CUSTOMER_BINH = UUID.fromString("bbbb2222-2222-2222-2222-222222222222");
    static final UUID CUSTOMER_CHAU = UUID.fromString("cccc3333-3333-3333-3333-333333333333");
    static final UUID CUSTOMER_DUNG = UUID.fromString("dddd4444-4444-4444-4444-444444444444");
    static final UUID CUSTOMER_EM = UUID.fromString("eeee5555-5555-5555-5555-555555555555");
    static final UUID CUSTOMER_PHONG = UUID.fromString("ffff6666-6666-6666-6666-666666666666");
    static final UUID CUSTOMER_LINH = UUID.fromString("77777777-7777-7777-7777-777777777777");

    private static final UUID CATEGORY_CONTROLLER = UUID.fromString("01010101-0000-0000-0000-000000000001");
    private static final UUID CATEGORY_DISC = UUID.fromString("01010101-0000-0000-0000-000000000002");
    private static final UUID PRODUCT_DUALSENSE = UUID.fromString("02020202-0000-0000-0000-000000000001");
    private static final UUID PRODUCT_FIFA = UUID.fromString("02020202-0000-0000-0000-000000000002");
    private static final UUID PRODUCT_SWITCH_PRO = UUID.fromString("02020202-0000-0000-0000-000000000003");
    private static final UUID PRODUCT_ELDEN = UUID.fromString("02020202-0000-0000-0000-000000000004");
    private static final UUID PRODUCT_GOW = UUID.fromString("02020202-0000-0000-0000-000000000005");
    private static final UUID PRODUCT_ZELDA = UUID.fromString("02020202-0000-0000-0000-000000000006");
    private static final UUID PRODUCT_MARIO = UUID.fromString("02020202-0000-0000-0000-000000000007");

    private final FakeIdentityPort identity;
    private final FakeOrderPort orders;
    private final FakeProductPort products;
    private final CustomerProfileService profiles;

    public CrmFakeDataSeeder(
            FakeIdentityPort identity,
            FakeOrderPort orders,
            FakeProductPort products,
            CustomerProfileService profiles
    ) {
        this.identity = identity;
        this.orders = orders;
        this.products = products;
        this.profiles = profiles;
    }

    @Override
    public void run(ApplicationArguments args) {
        identity.seedStaff(CrmDemoActors.ADMIN_ID, StaffDepartment.ADMIN);
        identity.seedStaff(CrmDemoActors.CRM_ID, StaffDepartment.CRM);
        identity.seedStaff(CrmDemoActors.CS_ID, StaffDepartment.CS);
        identity.seedStaff(CrmDemoActors.SALES_ID, StaffDepartment.SALES);

        if (!identity.findCustomers(new CustomerFilter(null, null), true).isEmpty()) {
            return;
        }

        identity.seedCustomer(
                CUSTOMER_AN,
                "Nguyễn Văn An",
                "an.nguyen@example.com",
                "0901111111",
                "male",
                LocalDate.of(1998, 5, 12),
                CustomerStatus.ACTIVE);
        identity.seedCustomer(
                CUSTOMER_BINH,
                "Trần Thị Bình",
                "binh.tran@example.com",
                "0902222222",
                "female",
                LocalDate.of(2003, 8, 20),
                CustomerStatus.ACTIVE);
        identity.seedCustomer(
                CUSTOMER_CHAU,
                "Lê Minh Châu",
                "chau.le@example.com",
                "0903333333",
                "female",
                LocalDate.of(1987, 3, 3),
                CustomerStatus.LOCKED);
        identity.seedCustomer(
                CUSTOMER_DUNG,
                "Phạm Quốc Dũng",
                "dung.pham@example.com",
                "0904444444",
                "male",
                LocalDate.of(2010, 11, 1),
                CustomerStatus.ACTIVE);
        identity.seedCustomer(
                CUSTOMER_EM,
                "Hoàng Thị Em",
                "em.hoang@example.com",
                "0905555555",
                "female",
                LocalDate.of(1972, 6, 15),
                CustomerStatus.ACTIVE);
        identity.seedCustomer(
                CUSTOMER_PHONG,
                "Võ Văn Phong",
                "phong.vo@example.com",
                "0906666666",
                "male",
                LocalDate.of(1995, 9, 9),
                CustomerStatus.DELETED);
        identity.seedCustomer(
                CUSTOMER_LINH,
                "Đặng Mỹ Linh",
                "linh.dang@example.com",
                "0907777777",
                "female",
                LocalDate.of(1999, 1, 22),
                CustomerStatus.ACTIVE);

        identity.seedAddress(
                UUID.fromString("a1000001-0000-4000-8000-000000000001"),
                CUSTOMER_AN,
                "Nguyễn Văn An",
                "0901111111",
                "12 Nguyễn Huệ, Q.1, TP.HCM",
                true);
        identity.seedAddress(
                UUID.fromString("a1000001-0000-4000-8000-000000000002"),
                CUSTOMER_BINH,
                "Trần Thị Bình",
                "0902222222",
                "45 Võ Văn Tần, Q.3, TP.HCM",
                true);
        identity.seedAddress(
                UUID.fromString("a1000001-0000-4000-8000-000000000003"),
                CUSTOMER_CHAU,
                "Lê Minh Châu",
                "0903333333",
                "8 Lê Lợi, Q.1, TP.HCM",
                true);
        identity.seedAddress(
                UUID.fromString("a1000001-0000-4000-8000-000000000004"),
                CUSTOMER_DUNG,
                "Phạm Quốc Dũng",
                "0904444444",
                "90 Nguyễn Văn Linh, Q.7, TP.HCM",
                true);
        identity.seedAddress(
                UUID.fromString("a1000001-0000-4000-8000-000000000005"),
                CUSTOMER_EM,
                "Hoàng Thị Em",
                "0905555555",
                "15 Hùng Vương, Huế",
                true);
        identity.seedAddress(
                UUID.fromString("a1000001-0000-4000-8000-000000000006"),
                CUSTOMER_PHONG,
                "Võ Văn Phong",
                "0906666666",
                "22 Lý Thường Kiệt, Q.10, TP.HCM",
                true);
        identity.seedAddress(
                UUID.fromString("a1000001-0000-4000-8000-000000000007"),
                CUSTOMER_LINH,
                "Đặng Mỹ Linh",
                "0907777777",
                "5 Bà Triệu, Hoàn Kiếm, Hà Nội",
                true);

        products.seedActive(PRODUCT_DUALSENSE);
        products.seedActive(PRODUCT_FIFA);
        products.seedActive(PRODUCT_SWITCH_PRO);
        products.seedActive(PRODUCT_ELDEN);
        products.seedActive(PRODUCT_GOW);
        products.seedActive(PRODUCT_ZELDA);
        products.seedActive(PRODUCT_MARIO);

        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.fromString("aaaa0001-0000-0000-0000-000000000001"),
                CUSTOMER_AN,
                new BigDecimal("1890000"),
                Instant.parse("2026-08-01T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        PRODUCT_DUALSENSE,
                        CATEGORY_CONTROLLER,
                        "Tay cầm",
                        new BigDecimal("1890000")))));
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.fromString("aaaa0002-0000-0000-0000-000000000002"),
                CUSTOMER_AN,
                new BigDecimal("990000"),
                Instant.parse("2026-08-20T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        PRODUCT_FIFA,
                        CATEGORY_DISC,
                        "Đĩa game",
                        new BigDecimal("990000"),
                        "Thể thao"))));
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.fromString("bbbb0001-0000-0000-0000-000000000001"),
                CUSTOMER_BINH,
                new BigDecimal("1290000"),
                Instant.parse("2026-09-01T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        PRODUCT_FIFA,
                        CATEGORY_DISC,
                        "Đĩa game",
                        new BigDecimal("1290000"),
                        "Thể thao"))));
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.fromString("dddd0001-0000-0000-0000-000000000001"),
                CUSTOMER_DUNG,
                new BigDecimal("1590000"),
                Instant.parse("2026-09-10T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        PRODUCT_SWITCH_PRO,
                        CATEGORY_CONTROLLER,
                        "Tay cầm",
                        new BigDecimal("1590000")))));
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.fromString("ffff0001-0000-0000-0000-000000000001"),
                CUSTOMER_PHONG,
                new BigDecimal("450000"),
                Instant.parse("2026-07-15T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        PRODUCT_FIFA,
                        CATEGORY_DISC,
                        "Đĩa game",
                        new BigDecimal("450000"),
                        "Thể thao"))));
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.fromString("bbbb0002-0000-0000-0000-000000000002"),
                CUSTOMER_BINH,
                new BigDecimal("1100000"),
                Instant.parse("2026-09-12T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        PRODUCT_ELDEN,
                        CATEGORY_DISC,
                        "Đĩa game",
                        new BigDecimal("1100000"),
                        "Nhập vai"))));
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.fromString("cccc0001-0000-0000-0000-000000000001"),
                CUSTOMER_CHAU,
                new BigDecimal("890000"),
                Instant.parse("2026-08-18T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        PRODUCT_GOW,
                        CATEGORY_DISC,
                        "Đĩa game",
                        new BigDecimal("890000"),
                        "Hành động"))));
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.fromString("eeee0001-0000-0000-0000-000000000001"),
                CUSTOMER_EM,
                new BigDecimal("1200000"),
                Instant.parse("2026-07-02T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        PRODUCT_ZELDA,
                        CATEGORY_DISC,
                        "Đĩa game",
                        new BigDecimal("1200000"),
                        "Phiêu lưu"))));
        orders.seedDeliveredOrder(new DeliveredOrderView(
                UUID.fromString("77770001-0000-0000-0000-000000000001"),
                CUSTOMER_LINH,
                new BigDecimal("790000"),
                Instant.parse("2026-09-05T10:00:00Z"),
                List.of(new DeliveredOrderLine(
                        PRODUCT_MARIO,
                        CATEGORY_DISC,
                        "Đĩa game",
                        new BigDecimal("790000"),
                        "Đua xe"))));

        for (CustomerView customer : identity.findCustomers(new CustomerFilter(null, null), true)) {
            profiles.recalculate(customer.id());
        }
    }
}
