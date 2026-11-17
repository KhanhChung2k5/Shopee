package com.chototmua.crm.web.dto;

import java.util.List;

public record ConversationListResponse(
        List<ConversationSummaryResponse> items,
        boolean agentOnline
) {
}
