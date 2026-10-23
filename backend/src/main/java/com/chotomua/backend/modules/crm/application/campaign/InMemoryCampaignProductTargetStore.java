package com.chotomua.backend.modules.crm.application.campaign;

import com.chotomua.backend.modules.crm.domain.campaign.CampaignProductTarget;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Gắn sản phẩm vào chiến dịch trong bộ nhớ. Mất khi restart — đúng SPEC mở rộng. */
@Component
public class InMemoryCampaignProductTargetStore implements CampaignProductTargetStore {

    private final Map<UUID, CampaignProductTarget> targets = new LinkedHashMap<>();

    /** Xóa hết — dùng giữa các bài kiểm thử. */
    public synchronized void clear() {
        targets.clear();
    }

    @Override
    public synchronized void save(CampaignProductTarget target) {
        targets.put(target.campaignId(), target);
    }

    @Override
    public synchronized Optional<CampaignProductTarget> find(UUID campaignId) {
        return Optional.ofNullable(targets.get(campaignId));
    }

    @Override
    public synchronized void delete(UUID campaignId) {
        targets.remove(campaignId);
    }
}
