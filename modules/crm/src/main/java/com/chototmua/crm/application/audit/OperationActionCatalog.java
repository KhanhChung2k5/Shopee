package com.chototmua.crm.application.audit;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Đổi phương thức và đường dẫn API thành câu tiếng Việt cho trang nhật ký.
 * Quy tắc cụ thể hơn đứng trước.
 */
public final class OperationActionCatalog {

    private static final String ID =
            "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

    private static final List<Rule> RULES = List.of(
            rule("POST", "/api/customers/" + ID + "/addresses", "Thêm địa chỉ khách hàng"),
            rule("PUT", "/api/customers/" + ID + "/addresses/" + ID, "Cập nhật địa chỉ khách hàng"),
            rule("POST", "/api/customers/" + ID + "/restore", "Khôi phục khách hàng"),
            rule("PATCH", "/api/customers/" + ID, "Đổi trạng thái khách hàng"),
            rule("PUT", "/api/customers/" + ID, "Cập nhật khách hàng"),
            rule("POST", "/api/customers", "Tạo khách hàng"),
            rule("PUT", "/api/campaigns/" + ID, "Cập nhật chiến dịch"),
            rule("DELETE", "/api/campaigns/" + ID, "Xóa chiến dịch"),
            rule("POST", "/api/campaigns", "Tạo chiến dịch"),
            rule("POST", "/api/segments/" + ID + "/refresh", "Làm mới phân khúc"),
            rule("PUT", "/api/segments/" + ID, "Cập nhật phân khúc"),
            rule("DELETE", "/api/segments/" + ID, "Xóa phân khúc"),
            rule("POST", "/api/segments", "Tạo phân khúc"),
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

    /** Bỏ qua lượt đọc, sức khỏe, nhật ký và tín hiệu đang nhập. */
    public static boolean skip(String method, String path) {
        if (path == null || !path.startsWith("/api/")) {
            return true;
        }
        if (path.startsWith("/api/crm/audit-logs") || path.startsWith("/api/crm/health")) {
            return true;
        }
        if (path.endsWith("/typing")) {
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
