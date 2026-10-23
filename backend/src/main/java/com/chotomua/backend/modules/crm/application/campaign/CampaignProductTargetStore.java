package com.chotomua.backend.modules.crm.application.campaign;

import com.chotomua.backend.modules.crm.domain.campaign.CampaignProductTarget;

import java.util.Optional;
import java.util.UUID;

/** Kho gắn sản phẩm vào chiến dịch — in-memory, không DDL. */
public interface CampaignProductTargetStore {

    void save(CampaignProductTarget target);

    Optional<CampaignProductTarget> find(UUID campaignId);

    void delete(UUID campaignId);
}
