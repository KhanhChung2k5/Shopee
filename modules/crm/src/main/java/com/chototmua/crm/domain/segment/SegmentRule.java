package com.chototmua.crm.domain.segment;

import java.util.List;
import java.util.UUID;

/**
 * Luật preset của một phân khúc — không phải engine rule đầy đủ.
 * {@code preset} chỉ nhận {@code age}, {@code rfm} hoặc {@code category}.
 */
public record SegmentRule(
        String preset,
        String bucket,
        String rfmSegment,
        UUID categoryId,
        String categoryName,
        List<String> categoryNames,
        List<String> presets,
        List<String> buckets,
        List<String> rfmSegments
) {
}
