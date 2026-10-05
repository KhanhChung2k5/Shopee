package com.chototmua.crm.application.survey;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Cột {@code surveys.description} không có chỗ riêng cho đối tượng đã chọn.
 * Khi có phân khúc, lưu JSON {@code {"text","segmentIds"}}; khi không có thì giữ nguyên văn mô tả.
 * Điểm mở: teammate thêm bảng đối tượng thì bỏ lớp mã hóa này.
 */
public final class SurveyDescriptionText {

    private static final ObjectMapper JSON = new ObjectMapper();

    /** Tiện ích tĩnh — không tạo đối tượng. */
    private SurveyDescriptionText() {
    }

    /** Khi có phân khúc, gói mô tả + mã phân khúc vào JSON. */
    public static String encode(String description, List<UUID> segmentIds) {
        if (segmentIds == null || segmentIds.isEmpty()) {
            return description;
        }
        try {
            List<String> ids = segmentIds.stream().map(UUID::toString).toList();
            return JSON.writeValueAsString(new Payload(description == null ? "" : description, ids));
        } catch (Exception exception) {
            throw new IllegalStateException("Không mã hóa được đối tượng khảo sát.", exception);
        }
    }

    /** Tách text và segmentIds; mô tả thuần không phải JSON thì giữ nguyên. */
    public static Decoded decode(String stored) {
        if (stored == null || !stored.startsWith("{")) {
            return new Decoded(stored, List.of());
        }
        try {
            JsonNode node = JSON.readTree(stored);
            JsonNode ids = node.get("segmentIds");
            if (ids == null || !ids.isArray()) {
                return new Decoded(stored, List.of());
            }
            List<UUID> segmentIds = new ArrayList<>();
            for (JsonNode id : ids) {
                try {
                    segmentIds.add(UUID.fromString(id.asText()));
                } catch (IllegalArgumentException ignored) {
                    // Bỏ mã không phải UUID, giữ phần còn lại.
                }
            }
            JsonNode text = node.get("text");
            String description = text == null || text.isNull() || text.asText().isEmpty() ? null : text.asText();
            return new Decoded(description, List.copyOf(segmentIds));
        } catch (Exception exception) {
            return new Decoded(stored, List.of());
        }
    }

    /** Mô tả hiển thị và đối tượng đã chọn. */
    public record Decoded(String description, List<UUID> segmentIds) {
    }

    private record Payload(String text, List<String> segmentIds) {
    }
}
