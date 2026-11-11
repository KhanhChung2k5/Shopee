package com.chototmua.crm.web.dto;

import com.chototmua.crm.application.audit.OperationLogFacets;

import java.util.List;

/** Giá trị dùng cho các dropdown lọc nhật ký. */
public record OperationLogFacetsResponse(
        List<OperationLogActorOptionResponse> actors,
        List<String> departments,
        List<String> actions
) {
    public static OperationLogFacetsResponse from(OperationLogFacets facets) {
        return new OperationLogFacetsResponse(
                facets.actors().stream().map(OperationLogActorOptionResponse::from).toList(),
                facets.departments(),
                facets.actions());
    }
}
