package com.chototmua.crm.application.campaign;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Đến giờ thì đưa thông báo đã lên lịch vào hộp thư khách. */
@Component
public class CampaignScheduler {

    private final CampaignService campaigns;

    public CampaignScheduler(CampaignService campaigns) {
        this.campaigns = campaigns;
    }

    /** Mỗi 15 giây gọi {@link CampaignService#dispatchDue()}. */
    @Scheduled(fixedDelay = 15000)
    public void dispatch() {
        campaigns.dispatchDue();
    }
}
