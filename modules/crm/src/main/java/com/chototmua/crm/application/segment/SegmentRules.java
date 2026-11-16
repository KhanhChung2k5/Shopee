package com.chototmua.crm.application.segment;

import com.chototmua.crm.application.exception.InvalidSegmentRuleException;
import com.chototmua.crm.application.report.AgeBucket;
import com.chototmua.crm.domain.profile.RfmClassifier;
import com.chototmua.crm.domain.segment.SegmentRule;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/** Đọc và ghi {@code ruleDefinition} JSON của ba preset. Không chạy engine rule tổng quát. */
public final class SegmentRules {

    public static final String AGE = "age";
    public static final String RFM = "rfm";
    public static final String CATEGORY = "category";
    public static final String ALL = "all";
    public static final List<String> CATEGORY_NAMES = List.of(
            "Tay cầm", "Đĩa game", "Phụ kiện", "Tai nghe", "Máy chơi game", "Bàn phím");

    private SegmentRules() {
        // Tiện ích tĩnh, không tạo đối tượng.
    }

    /** Đọc JSON rule; thiếu/sai preset thì 422. */
    public static SegmentRule parse(Map<String, Object> raw) {
        if (raw == null || raw.isEmpty()) {
            throw new InvalidSegmentRuleException("Thiếu ruleDefinition. Cần preset age, rfm hoặc category.");
        }
        List<String> presets = presetsOf(raw);
        if (presets.isEmpty()) {
            throw new InvalidSegmentRuleException("ruleDefinition.preset phải là age, rfm hoặc category.");
        }
        String bucket = null;
        List<String> buckets = List.of();
        String rfmSegment = null;
        List<String> rfmSegments = List.of();
        UUID categoryId = null;
        String categoryName = null;
        List<String> categoryNames = List.of();
        if (presets.contains(AGE)) {
            buckets = ageBuckets(raw);
            bucket = buckets.get(0);
        }
        if (presets.contains(RFM)) {
            rfmSegments = rfmLabels(raw);
            rfmSegment = rfmSegments.get(0);
        }
        if (presets.contains(CATEGORY)) {
            categoryId = categoryId(raw.get("categoryId"));
            categoryNames = categoryNameList(raw);
            categoryName = categoryNames.isEmpty() ? null : categoryNames.get(0);
            if (categoryId == null && categoryNames.isEmpty()) {
                throw new InvalidSegmentRuleException("Preset category cần categoryId hoặc categoryNames.");
            }
        }
        return new SegmentRule(
                presets.get(0),
                bucket,
                rfmSegment,
                categoryId,
                categoryName,
                categoryNames,
                presets,
                buckets,
                rfmSegments);
    }

    /** Ghi lại JSON API từ {@link SegmentRule} (một hoặc nhiều preset). */
    public static Map<String, Object> toDefinition(SegmentRule rule) {
        Map<String, Object> definition = new LinkedHashMap<>();
        List<String> presets = rule.presets() == null || rule.presets().isEmpty()
                ? List.of(rule.preset())
                : rule.presets();
        if (presets.size() == 1) {
            definition.put("preset", presets.get(0));
        } else {
            definition.put("presets", presets);
        }
        if (presets.contains(AGE)) {
            List<String> buckets = rule.buckets() == null || rule.buckets().isEmpty()
                    ? List.of(rule.bucket())
                    : rule.buckets();
            definition.put(buckets.size() == 1 ? "bucket" : "buckets", buckets.size() == 1 ? buckets.get(0) : buckets);
        }
        if (presets.contains(RFM)) {
            List<String> labels = rule.rfmSegments() == null || rule.rfmSegments().isEmpty()
                    ? List.of(rule.rfmSegment())
                    : rule.rfmSegments();
            definition.put(labels.size() == 1 ? "segment" : "segments", labels.size() == 1 ? labels.get(0) : labels);
        }
        if (presets.contains(CATEGORY)) {
            if (rule.categoryId() != null) {
                definition.put("categoryId", rule.categoryId().toString());
            }
            if (rule.categoryNames() != null && !rule.categoryNames().isEmpty()) {
                definition.put("categoryNames", rule.categoryNames());
            }
            if (rule.categoryName() != null) {
                definition.put("categoryName", rule.categoryName());
            }
        }
        return Map.copyOf(definition);
    }

    /** Danh sách preset từ {@code presets} hoặc {@code preset}. */
    private static List<String> presetsOf(Map<String, Object> raw) {
        List<String> presets = new ArrayList<>();
        for (String value : stringList(raw.get("presets"))) {
            addPreset(presets, value);
        }
        if (presets.isEmpty()) {
            addPreset(presets, text(raw.get("preset")));
        }
        if (presets.isEmpty()) {
            throw new InvalidSegmentRuleException(
                    "Preset không hỗ trợ. Chỉ nhận age, rfm hoặc category.");
        }
        return List.copyOf(presets);
    }

    /** Chuẩn hóa và chống trùng preset. */
    private static void addPreset(List<String> presets, String value) {
        if (value == null) {
            return;
        }
        String normalized = value.toLowerCase(Locale.ROOT);
        if (!AGE.equals(normalized) && !RFM.equals(normalized) && !CATEGORY.equals(normalized)) {
            throw new InvalidSegmentRuleException(
                    "Preset không hỗ trợ. Chỉ nhận age, rfm hoặc category.");
        }
        if (!presets.contains(normalized)) {
            presets.add(normalized);
        }
    }

    /** Rule chỉ tuổi (giữ cho tương thích nội bộ). */
    private static SegmentRule age(Map<String, Object> raw) {
        String bucket = normalizeAgeBucket(text(raw.get("bucket")));
        if (bucket == null) {
            throw new InvalidSegmentRuleException(
                    "Nhóm tuổi không hợp lệ. Dùng all, UNDER_18, 18–24, 25–34, 35–44, 45+ hoặc UNKNOWN.");
        }
        return new SegmentRule(AGE, bucket, null, null, null, List.of(), List.of(AGE), List.of(bucket), List.of());
    }

    /** Nhóm tuổi từ {@code buckets} hoặc {@code bucket}. */
    private static List<String> ageBuckets(Map<String, Object> raw) {
        List<String> buckets = new ArrayList<>();
        for (String value : stringList(raw.get("buckets"))) {
            String bucket = normalizeAgeBucket(value);
            if (bucket == null) {
                throw new InvalidSegmentRuleException(
                        "Nhóm tuổi không hợp lệ. Dùng all, UNDER_18, 18–24, 25–34, 35–44, 45+ hoặc UNKNOWN.");
            }
            if (!buckets.contains(bucket)) {
                buckets.add(bucket);
            }
        }
        if (buckets.isEmpty()) {
            String bucket = normalizeAgeBucket(text(raw.get("bucket")));
            if (bucket == null) {
                throw new InvalidSegmentRuleException(
                        "Nhóm tuổi không hợp lệ. Dùng all, UNDER_18, 18–24, 25–34, 35–44, 45+ hoặc UNKNOWN.");
            }
            buckets.add(bucket);
        }
        return List.copyOf(buckets);
    }

    /** Rule chỉ RFM (tương thích nội bộ). */
    private static SegmentRule rfm(Map<String, Object> raw) {
        String label = text(raw.get("segment"));
        if (label == null) {
            label = text(raw.get("rfmSegment"));
        }
        if (ALL.equalsIgnoreCase(label)) {
            label = ALL;
        }
        if (label == null || !(ALL.equals(label) || RfmClassifier.LABELS.contains(label))) {
            throw new InvalidSegmentRuleException(
                    "Nhãn RFM không hợp lệ. Nhận all, champions, loyal, potential, at_risk, lost hoặc other.");
        }
        return new SegmentRule(RFM, null, label, null, null, List.of(), List.of(RFM), List.of(), List.of(label));
    }

    /** Nhãn RFM từ {@code segments} / {@code segment} / {@code rfmSegment}. */
    private static List<String> rfmLabels(Map<String, Object> raw) {
        List<String> labels = new ArrayList<>();
        List<String> rawLabels = stringList(raw.get("segments"));
        if (rawLabels.isEmpty()) {
            String label = text(raw.get("segment"));
            if (label == null) {
                label = text(raw.get("rfmSegment"));
            }
            if (label != null) {
                rawLabels = List.of(label);
            }
        }
        if (rawLabels.isEmpty()) {
            throw new InvalidSegmentRuleException(
                    "Nhãn RFM không hợp lệ. Nhận all, champions, loyal, potential, at_risk, lost hoặc other.");
        }
        for (String value : rawLabels) {
            String label = ALL.equalsIgnoreCase(value) ? ALL : value;
            if (!(ALL.equals(label) || RfmClassifier.LABELS.contains(label))) {
                throw new InvalidSegmentRuleException(
                        "Nhãn RFM không hợp lệ. Nhận all, champions, loyal, potential, at_risk, lost hoặc other.");
            }
            if (!labels.contains(label)) {
                labels.add(label);
            }
        }
        return List.copyOf(labels);
    }

    /** Rule chỉ danh mục (tương thích nội bộ). */
    private static SegmentRule category(Map<String, Object> raw) {
        UUID categoryId = categoryId(raw.get("categoryId"));
        List<String> names = categoryNames(raw.get("categoryNames"));
        if (names.isEmpty()) {
            String categoryName = text(raw.get("categoryName"));
            if (categoryName != null) {
                names = List.of(categoryName);
            }
        }
        if (categoryId == null && names.isEmpty()) {
            throw new InvalidSegmentRuleException("Preset category cần categoryId hoặc categoryNames.");
        }
        for (String name : names) {
            if (!CATEGORY_NAMES.contains(name)) {
                throw new InvalidSegmentRuleException(
                        "Danh mục không có sẵn. Chọn Tay cầm, Đĩa game, Phụ kiện, Tai nghe, Máy chơi game hoặc Bàn phím.");
            }
        }
        String first = names.isEmpty() ? null : names.get(0);
        return new SegmentRule(CATEGORY, null, null, categoryId, first, List.copyOf(names), List.of(CATEGORY), List.of(), List.of());
    }

    /** Chuỗi hoặc mảng JSON → danh sách không trùng. */
    private static List<String> stringList(Object value) {
        if (value instanceof String text) {
            String trimmed = text.trim();
            return trimmed.isEmpty() ? List.of() : List.of(trimmed);
        }
        if (!(value instanceof List<?> rawValues)) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        for (Object rawValue : rawValues) {
            String item = text(rawValue);
            if (item != null && !values.contains(item)) {
                values.add(item);
            }
        }
        return values;
    }

    /** Tên danh mục hợp lệ trên cửa hàng. */
    private static List<String> categoryNameList(Map<String, Object> raw) {
        List<String> names = categoryNames(raw.get("categoryNames"));
        if (names.isEmpty()) {
            String categoryName = text(raw.get("categoryName"));
            if (categoryName != null) {
                names = List.of(categoryName);
            }
        }
        for (String name : names) {
            if (!CATEGORY_NAMES.contains(name)) {
                throw new InvalidSegmentRuleException(
                        "Danh mục không có sẵn. Chọn Tay cầm, Đĩa game, Phụ kiện, Tai nghe, Máy chơi game hoặc Bàn phím.");
            }
        }
        return names;
    }

    /** Đọc mảng {@code categoryNames}. */
    private static List<String> categoryNames(Object value) {
        if (!(value instanceof List<?> rawNames)) {
            return List.of();
        }
        List<String> names = new ArrayList<>();
        for (Object rawName : rawNames) {
            String name = text(rawName);
            if (name != null && !names.contains(name)) {
                names.add(name);
            }
        }
        return List.copyOf(names);
    }

    /**
     * Nhận mã hoặc nhãn của {@link AgeBucket}. Gạch ngang thường {@code 18-24} được đổi thành gạch dài {@code 18–24}.
     */
    static String normalizeAgeBucket(String raw) {
        if (raw == null) {
            return null;
        }
        if (ALL.equalsIgnoreCase(raw)) {
            return ALL;
        }
        String hyphenAsEnDash = raw.replace('-', '–');
        for (AgeBucket bucket : AgeBucket.values()) {
            if (bucket.code().equalsIgnoreCase(raw)
                    || bucket.label().equalsIgnoreCase(raw)
                    || bucket.code().equals(hyphenAsEnDash)) {
                return bucket.code();
            }
        }
        return null;
    }

    /** Parse UUID danh mục hoặc 422. */
    private static UUID categoryId(Object value) {
        String raw = text(value);
        if (raw == null) {
            return null;
        }
        try {
            return UUID.fromString(raw);
        } catch (IllegalArgumentException exception) {
            throw new InvalidSegmentRuleException("categoryId không phải UUID hợp lệ.", exception);
        }
    }

    /** Cắt khoảng trắng; trống → {@code null}. */
    private static String text(Object value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.toString().trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
