package com.chototmua.crm.config;

import java.util.UUID;

/**
 * Tài khoản thử nghiệm cố định (Basic Auth) khi hồ sơ {@code crm-fake} hoặc {@code crm-db}.
 * Tên đăng nhập map sang UUID để {@code CurrentActor} và cổng danh tính khớp nhau.
 * Khách dùng cùng UUID đã gieo trong seed, mật khẩu trùng tên đăng nhập.
 */
public final class CrmDemoActors {

    public static final UUID ADMIN_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    public static final UUID CRM_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    public static final UUID CS_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    public static final UUID SALES_ID = UUID.fromString("55555555-5555-5555-5555-555555555555");

    public static final UUID CUSTOMER_AN_ID = UUID.fromString("aaaa1111-1111-1111-1111-111111111111");
    public static final UUID CUSTOMER_BINH_ID = UUID.fromString("bbbb2222-2222-2222-2222-222222222222");
    public static final UUID CUSTOMER_CHAU_ID = UUID.fromString("cccc3333-3333-3333-3333-333333333333");
    public static final UUID CUSTOMER_DUNG_ID = UUID.fromString("dddd4444-4444-4444-4444-444444444444");
    public static final UUID CUSTOMER_PHONG_ID = UUID.fromString("ffff6666-6666-6666-6666-666666666666");
    public static final UUID CUSTOMER_LINH_ID = UUID.fromString("77777777-7777-7777-7777-777777777777");

    public static final String ADMIN_LOGIN = "admin";
    public static final String CRM_LOGIN = "crm";
    public static final String CS_LOGIN = "cs";
    public static final String SALES_LOGIN = "sales";

    public static final String CUSTOMER_AN_LOGIN = "an";
    public static final String CUSTOMER_BINH_LOGIN = "binh";
    public static final String CUSTOMER_CHAU_LOGIN = "chau";
    public static final String CUSTOMER_DUNG_LOGIN = "dung";
    public static final String CUSTOMER_PHONG_LOGIN = "phong";
    public static final String CUSTOMER_LINH_LOGIN = "linh";

    private CrmDemoActors() {
        // Chỉ chứa hằng số, không tạo đối tượng.
    }

    /**
     * Đổi tên đăng nhập demo hoặc chuỗi UUID thành mã người dùng.
     * Trả về null nếu không nhận ra.
     */
    public static UUID resolve(String name) {
        if (name == null || name.isBlank() || "anonymousUser".equals(name)) {
            return null;
        }
        return switch (name) {
            case ADMIN_LOGIN -> ADMIN_ID;
            case CRM_LOGIN -> CRM_ID;
            case CS_LOGIN -> CS_ID;
            case SALES_LOGIN -> SALES_ID;
            case CUSTOMER_AN_LOGIN -> CUSTOMER_AN_ID;
            case CUSTOMER_BINH_LOGIN -> CUSTOMER_BINH_ID;
            case CUSTOMER_CHAU_LOGIN -> CUSTOMER_CHAU_ID;
            case CUSTOMER_DUNG_LOGIN -> CUSTOMER_DUNG_ID;
            case CUSTOMER_PHONG_LOGIN -> CUSTOMER_PHONG_ID;
            case CUSTOMER_LINH_LOGIN -> CUSTOMER_LINH_ID;
            default -> parseUuid(name);
        };
    }

    /** Tên đăng nhập demo tương ứng, hoặc chính chuỗi đầu vào nếu không nhận ra. */
    public static String loginOf(String name) {
        UUID id = resolve(name);
        if (id == null) {
            return name == null ? "" : name;
        }
        if (ADMIN_ID.equals(id)) {
            return ADMIN_LOGIN;
        }
        if (CRM_ID.equals(id)) {
            return CRM_LOGIN;
        }
        if (CS_ID.equals(id)) {
            return CS_LOGIN;
        }
        if (SALES_ID.equals(id)) {
            return SALES_LOGIN;
        }
        if (CUSTOMER_AN_ID.equals(id)) {
            return CUSTOMER_AN_LOGIN;
        }
        if (CUSTOMER_BINH_ID.equals(id)) {
            return CUSTOMER_BINH_LOGIN;
        }
        if (CUSTOMER_CHAU_ID.equals(id)) {
            return CUSTOMER_CHAU_LOGIN;
        }
        if (CUSTOMER_DUNG_ID.equals(id)) {
            return CUSTOMER_DUNG_LOGIN;
        }
        if (CUSTOMER_PHONG_ID.equals(id)) {
            return CUSTOMER_PHONG_LOGIN;
        }
        if (CUSTOMER_LINH_ID.equals(id)) {
            return CUSTOMER_LINH_LOGIN;
        }
        return name;
    }

    /** Nhãn hiển thị trên nhật ký thao tác. */
    public static String labelOf(String name) {
        UUID id = resolve(name);
        if (ADMIN_ID.equals(id)) {
            return "Quản trị viên";
        }
        if (CRM_ID.equals(id)) {
            return "CRM Manager";
        }
        if (CS_ID.equals(id)) {
            return "CSKH";
        }
        if (SALES_ID.equals(id)) {
            return "NV Kinh doanh";
        }
        if (CUSTOMER_AN_ID.equals(id)) {
            return "Nguyễn Văn An";
        }
        if (CUSTOMER_BINH_ID.equals(id)) {
            return "Trần Thị Bình";
        }
        if (CUSTOMER_CHAU_ID.equals(id)) {
            return "Lê Minh Châu";
        }
        if (CUSTOMER_DUNG_ID.equals(id)) {
            return "Phạm Quốc Dũng";
        }
        if (CUSTOMER_PHONG_ID.equals(id)) {
            return "Võ Văn Phong";
        }
        if (CUSTOMER_LINH_ID.equals(id)) {
            return "Đặng Mỹ Linh";
        }
        return loginOf(name);
    }

    private static UUID parseUuid(String name) {
        try {
            return UUID.fromString(name);
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
