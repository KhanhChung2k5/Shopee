package com.chotomua.backend.modules.crm.application.campaign;

import com.chotomua.backend.modules.crm.domain.campaign.Campaign;
import com.chotomua.backend.modules.crm.domain.campaign.CampaignTarget;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Kho chiến dịch: bảng {@code campaigns} khi chạy PostgreSQL, bộ nhớ khi kiểm thử. */
public interface CampaignStore {

    /** Ghi chiến dịch và danh sách phân khúc đích (thay thế đích cũ). */
    void save(Campaign campaign, List<CampaignTarget> targets);

    /** Tìm theo mã; trống nếu đã xóa. */
    Optional<Campaign> find(UUID id);

    /** Mọi chiến dịch, thường mới nhất trước. */
    List<Campaign> findAll();

    /** Phân khúc được gắn với chiến dịch. */
    List<CampaignTarget> targetsOf(UUID campaignId);

    /** Có chiến dịch nào nhắm tới phân khúc này không (để không xóa mất lịch sử nhắm đối tượng). */
    default boolean usesSegment(UUID segmentId) {
        return findAll().stream().anyMatch(campaign ->
                targetsOf(campaign.id()).stream().anyMatch(target -> target.segmentId().equals(segmentId)));
    }

    /** Xóa chiến dịch và đích; không đụng hộp thư (lớp dịch vụ xóa thông báo riêng). */
    void delete(UUID id);
}
