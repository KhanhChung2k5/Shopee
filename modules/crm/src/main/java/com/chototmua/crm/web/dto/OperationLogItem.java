package com.chototmua.crm.web.dto;

import com.chototmua.crm.domain.audit.OperationLog;

import java.time.Instant;
import java.util.UUID;

/** Một dòng nhật ký trả về cho trang quản trị. */
public record OperationLogItem(
        UUID id,
        UUID actorId,
        String actorLogin,
        String actorLabel,
        String department,
        String action,
        String httpMethod,
        String path,
        int statusCode,
        String outcome,
        Instant occurredAt
) {
    public static OperationLogItem from(OperationLog log) {
        return new OperationLogItem(
                log.id(),
                log.actorId(),
                log.actorLogin(),
                log.actorLabel(),
                log.department(),
                log.action(),
                log.httpMethod(),
                log.path(),
                log.statusCode(),
                log.outcome(),
                log.occurredAt());
    }
}
