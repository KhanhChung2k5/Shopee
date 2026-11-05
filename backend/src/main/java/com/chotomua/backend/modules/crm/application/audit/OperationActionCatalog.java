package com.chotomua.backend.modules.crm.application.audit;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Đổi phương thức và đường dẫn API thành câu tiếng Việt cho trang nhật ký.
 * Nhật ký ghi mọi thao tác ghi dữ liệu (không chỉ {@code /api}): khóa/xóa khách, đổi trạng thái đơn,
 * hoàn tiền, xác nhận thanh toán, nhân viên, khuyến mãi, kho… là bằng chứng kiểm soát nội bộ.
 * Quy tắc cụ thể hơn đứng trước.
 */
public final class OperationActionCatalog {

    private static final String ID =
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

    private static final List<Rule> RULES = List.of(
            rule("PATCH", "/customers/" + ID + "/status", "Đổi trạng thái khách hàng"),
            rule("POST", "/customers/" + ID + "/temporary-password", "Cấp mật khẩu tạm cho khách hàng"),
            rule("POST", "/users/me/password", "Đổi mật khẩu"),
            rule("PATCH", "/orders/" + ID + "/status", "Đổi trạng thái đơn hàng"),
            rule("PATCH", "/orders/" + ID + "/payment-received", "Xác nhận đã nhận thanh toán"),
            rule("PATCH", "/orders/" + ID + "/shipping-info", "Cập nhật thông tin giao hàng"),
            rule("PATCH", "/orders/" + ID + "/tracking", "Cập nhật mã vận đơn"),
            rule("PATCH", "/orders/" + ID + "/delivery-failed", "Báo giao hàng thất bại"),
            rule("POST", "/orders", "Đặt đơn hàng"),
            rule("POST", "/refund-returns", "Gửi yêu cầu hoàn tiền"),
            rule("PATCH", "/refund-returns/" + ID + "/bank-account", "Khai tài khoản nhận hoàn tiền"),
            rule("PATCH", "/refund-returns/" + ID + "/approve", "Duyệt yêu cầu hoàn tiền"),
            rule("PATCH", "/refund-returns/" + ID + "/reject", "Từ chối yêu cầu hoàn tiền"),
            rule("PATCH", "/refund-returns/" + ID + "/received", "Ghi nhận đã nhận hàng hoàn"),
            rule("PATCH", "/refund-returns/" + ID + "/refunded", "Ghi nhận đã chuyển tiền hoàn"),
            rule("POST", "/employees", "Tạo nhân viên"),
            rule("PATCH", "/employees/" + ID, "Cập nhật nhân viên"),
            rule("PATCH", "/employees/" + ID + "/status", "Khoá hoặc mở khoá nhân viên"),
            rule("PATCH", "/reviews/" + ID + "/reply", "Phản hồi đánh giá"),
            rule("POST", "/reviews", "Viết đánh giá sản phẩm"),
            rule("PUT", "/reviews/" + ID, "Sửa đánh giá sản phẩm"),
            rule("DELETE", "/reviews/" + ID, "Xoá đánh giá sản phẩm"),
            rule("POST", "/orders/" + ID + "/invoice/reissue", "Lập lại hoá đơn"),
            rule("POST", "/marketing/vouchers", "Tạo voucher"),
            rule("PUT", "/marketing/vouchers/" + ID, "Sửa voucher"),
            rule("DELETE", "/marketing/vouchers/" + ID, "Xóa voucher"),
            rule("POST", "/marketing/programs", "Tạo chương trình khuyến mãi"),
            rule("PUT", "/marketing/programs/" + ID, "Sửa chương trình khuyến mãi"),
            rule("DELETE", "/marketing/programs/" + ID, "Xóa chương trình khuyến mãi"),
            rule("POST", "/marketing/(product|invoice)-discounts", "Tạo ưu đãi"),
            rule("PUT", "/marketing/(product|invoice)-discounts/" + ID, "Sửa ưu đãi"),
            rule("DELETE", "/marketing/(product|invoice)-discounts/" + ID, "Xóa ưu đãi"),
            rule("POST", "/api/catalog/goods-receipts/" + ID + "/approve", "Duyệt phiếu nhập"),
            rule("POST", "/api/catalog/goods-receipts/" + ID + "/reject", "Từ chối phiếu nhập"),
            rule("POST", "/api/catalog/goods-receipts", "Lập phiếu nhập"),
            rule("PUT", "/api/catalog/inventory/stocks/" + ID + "/" + ID, "Điều chỉnh tồn kho"),
            rule("POST", "/api/catalog/inventory/exports", "Xuất kho"),
            rule("POST", "/api/catalog/products", "Tạo sản phẩm"),
            rule("PUT", "/api/catalog/products/" + ID, "Sửa sản phẩm"),
            rule("DELETE", "/api/catalog/products/" + ID, "Xóa sản phẩm"),
            rule("POST", "/api/catalog/product-variants", "Tạo biến thể sản phẩm"),
            rule("PUT", "/api/catalog/product-variants/" + ID, "Sửa biến thể / giá bán"),
            rule("DELETE", "/api/catalog/product-variants/" + ID, "Xóa biến thể sản phẩm"),
            rule("POST", "/api/surveys/" + ID + "/publish", "Phát hành khảo sát"),
            rule("POST", "/api/customers/" + ID + "/addresses", "Thêm địa chỉ khách hàng"),
            rule("PUT", "/api/customers/" + ID + "/addresses/" + ID, "Cập nhật địa chỉ khách hàng"),
            rule("POST", "/api/customers/" + ID + "/restore", "Khôi phục khách hàng"),
            rule("PATCH", "/api/customers/" + ID, "Đổi trạng thái khách hàng"),
            rule("PUT", "/api/customers/" + ID, "Cập nhật khách hàng"),
            rule("POST", "/api/customers", "Tạo khách hàng"),
            rule("PUT", "/api/campaigns/" + ID, "Cập nhật chiến dịch"),
            rule("DELETE", "/api/campaigns/" + ID, "Xóa chiến dịch"),
            rule("POST", "/api/campaigns", "Tạo chiến dịch"),
            rule("POST", "/api/notifications/" + ID + "/read", "Mở thư hộp thư"),
            rule("POST", "/api/segments/" + ID + "/refresh", "Làm mới phân khúc"),
            rule("PUT", "/api/segments/" + ID, "Cập nhật phân khúc"),
            rule("DELETE", "/api/segments/" + ID, "Xóa phân khúc"),
            rule("POST", "/api/segments", "Tạo phân khúc"),
            rule("PUT", "/api/crm/surveys/" + ID + "/product-target", "Gắn sản phẩm vào khảo sát"),
            rule("PUT", "/api/surveys/" + ID + "/product-target", "Gắn sản phẩm vào khảo sát"),
            rule("POST", "/api/crm/orders/" + ID + "/delivered", "Gửi khảo sát khi đơn giao"),
            rule("POST", "/api/crm/customers/" + ID + "/recommendations/notify", "Đẩy gợi ý vào hộp thư"),
            rule("POST", "/api/customers/" + ID + "/recommendations/notify", "Đẩy gợi ý vào hộp thư"),
            rule("POST", "/api/surveys/" + ID + "/questions", "Thêm câu hỏi khảo sát"),
            rule("PUT", "/api/surveys/" + ID + "/questions/" + ID, "Sửa câu hỏi khảo sát"),
            rule("DELETE", "/api/surveys/" + ID + "/questions/" + ID, "Xóa câu hỏi khảo sát"),
            rule("POST", "/api/surveys/" + ID + "/archive", "Lưu trữ khảo sát"),
            rule("POST", "/api/surveys/" + ID + "/inbox", "Gửi khảo sát vào hộp thư"),
            rule("POST", "/api/surveys/" + ID + "/responses", "Gửi phản hồi khảo sát"),
            rule("PUT", "/api/surveys/" + ID, "Cập nhật khảo sát"),
            rule("DELETE", "/api/surveys/" + ID, "Xóa khảo sát"),
            rule("POST", "/api/surveys", "Tạo khảo sát"),
            rule("POST", "/api/conversations/presence", "Cập nhật trạng thái trực"),
            rule("POST", "/api/conversations/" + ID + "/messages", "Gửi tin nhắn hội thoại"),
            rule("POST", "/api/conversations/" + ID + "/live", "Chuyển hội thoại sang trực tuyến"),
            rule("POST", "/api/conversations/" + ID + "/escalate", "Leo thang hội thoại"),
            rule("POST", "/api/conversations/" + ID + "/csat", "Gửi đánh giá hội thoại"),
            rule("PATCH", "/api/conversations/" + ID, "Cập nhật hội thoại"),
            rule("POST", "/api/conversations", "Mở hội thoại"),
            rule("POST", "/api/crm/profiles/" + ID + "/recalculate", "Tính lại hồ sơ CRM")
    );

    private OperationActionCatalog() {
    }

    /** Danh sách thao tác đã đặt tên, dùng cho bộ lọc dropdown. */
    public static List<String> knownActions() {
        return RULES.stream()
                .map(Rule::action)
                .distinct()
                .sorted()
                .toList();
    }

    /**
     * Bỏ qua lượt đọc, sức khỏe, nhật ký, đăng nhập, và tín hiệu không phải thao tác nghiệp vụ:
     * đang nhập / đang trực (gửi định kỳ), giỏ hàng, xem trước đơn và báo giá voucher.
     */
    public static boolean skip(String method, String path) {
        if (path == null || path.isBlank() || path.equals("/error")) {
            return true;
        }
        if (path.startsWith("/api/crm/audit-logs") || path.startsWith("/api/crm/health") || path.startsWith("/auth/")) {
            return true;
        }
        if (path.endsWith("/typing") || path.equals("/api/conversations/presence")
                || path.startsWith("/cart-items") || path.equals("/orders/preview") || path.equals("/vouchers/quote")) {
            return true;
        }
        String verb = method == null ? "" : method.toUpperCase();
        return !(verb.equals("POST") || verb.equals("PUT") || verb.equals("PATCH") || verb.equals("DELETE"));
    }

    public static String describe(String method, String path) {
        String verb = method == null ? "" : method.toUpperCase();
        String normalized = normalize(path);
        for (Rule rule : RULES) {
            if (rule.method.equals(verb) && rule.path.matcher(normalized).matches()) {
                return rule.action;
            }
        }
        return verb + " " + normalized;
    }

    private static String normalize(String path) {
        if (path == null || path.isBlank()) {
            return "";
        }
        String value = path;
        int query = value.indexOf('?');
        if (query >= 0) {
            value = value.substring(0, query);
        }
        if (value.length() > 1 && value.endsWith("/")) {
            value = value.substring(0, value.length() - 1);
        }
        return value;
    }

    private static Rule rule(String method, String path, String action) {
        return new Rule(method, Pattern.compile("^" + path + "$"), action);
    }

    private record Rule(String method, Pattern path, String action) {
    }
}
