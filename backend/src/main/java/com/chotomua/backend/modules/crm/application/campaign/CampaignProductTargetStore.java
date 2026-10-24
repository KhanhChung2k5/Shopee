package com.chotomua.backend.modules.crm.application.campaign;

import com.chotomua.backend.modules.crm.domain.campaign.CampaignProductTarget;

import java.util.Optional;
import java.util.UUID;

/** Kho gắn sản phẩm vào chiến dịch — bảng {@code campaign_product_targets} (V6); bản in-memory chỉ cho test. */
public interface CampaignProductTargetStore {

    void save(CampaignProductTarget target);

    Optional<CampaignProductTarget> find(UUID campaignId);

    void delete(UUID campaignId);
}
