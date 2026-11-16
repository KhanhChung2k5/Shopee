package com.chototmua.crm.application.campaign;

import com.chototmua.crm.domain.campaign.Campaign;
import com.chototmua.crm.domain.campaign.CampaignTarget;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Kho chiến dịch trong bộ nhớ. Không viết SQL mới. */
@Component
@Profile("crm-fake")
public class InMemoryCampaignStore implements CampaignStore {

    private final Map<UUID, Campaign> campaigns = new LinkedHashMap<>();
    private final Map<UUID, List<CampaignTarget>> targets = new LinkedHashMap<>();

    /** Xóa hết bản ghi — dùng giữa các bài kiểm thử. */
    public synchronized void clear() {
        campaigns.clear();
        targets.clear();
    }

    @Override
    public synchronized void delete(UUID id) {
        campaigns.remove(id);
        targets.remove(id);
    }

    @Override
    public synchronized void save(Campaign campaign, List<CampaignTarget> campaignTargets) {
        campaigns.put(campaign.id(), campaign);
        targets.put(campaign.id(), List.copyOf(campaignTargets));
    }

    @Override
    public synchronized Optional<Campaign> find(UUID id) {
        return Optional.ofNullable(campaigns.get(id));
    }

    /** Sắp xếp theo {@code startAt} giảm dần. */
    @Override
    public synchronized List<Campaign> findAll() {
        List<Campaign> rows = new ArrayList<>(campaigns.values());
        rows.sort((left, right) -> {
            Instant leftStart = left.startAt() == null ? Instant.EPOCH : left.startAt();
            Instant rightStart = right.startAt() == null ? Instant.EPOCH : right.startAt();
            return rightStart.compareTo(leftStart);
        });
        return List.copyOf(rows);
    }

    @Override
    public synchronized List<CampaignTarget> targetsOf(UUID campaignId) {
        return List.copyOf(targets.getOrDefault(campaignId, List.of()));
    }
}
