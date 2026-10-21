package com.chototmua.crm.web.dto;

import java.util.List;
import java.util.UUID;

/** Giá trị có thật trong catalog để đổ vào ô chọn của bộ lọc nâng cao. */
public record ProductFacetsResponse(
        List<String> productTypes,
        List<String> genres,
        List<String> platforms,
        List<CategoryOption> categories
) {
    public record CategoryOption(UUID id, String name) {
    }
}
