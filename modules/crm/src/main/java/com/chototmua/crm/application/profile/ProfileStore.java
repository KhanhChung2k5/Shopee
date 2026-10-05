package com.chototmua.crm.application.profile;

import com.chototmua.crm.domain.profile.CustomerProfileCRM;

import java.util.Optional;
import java.util.UUID;

/** Kho hồ sơ CRM: cột trên {@code users} khi chạy PostgreSQL, bộ nhớ khi kiểm thử. */
public interface ProfileStore {

    /** Ghi đè hồ sơ theo {@code userId}. */
    void save(CustomerProfileCRM profile);

    /** Hồ sơ CRM đã tính; trống nếu chưa recalculate. */
    Optional<CustomerProfileCRM> find(UUID userId);
}
