package com.chototmua.crm.application.profile;

import com.chototmua.crm.domain.profile.CustomerProfileCRM;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Kho hồ sơ CRM trong bộ nhớ. Không có thao tác xóa từng hồ sơ —
 * khóa hoặc xóa mềm khách không được xóa cứng profile.
 */
@Component
@Profile("crm-fake")
public class InMemoryProfileStore implements ProfileStore {

    private final Map<UUID, CustomerProfileCRM> profiles = new LinkedHashMap<>();

    /** Xóa hết hồ sơ — dùng giữa các bài kiểm thử. */
    public synchronized void clear() {
        profiles.clear();
    }

    public synchronized void save(CustomerProfileCRM profile) {
        profiles.put(profile.userId(), profile);
    }

    public synchronized Optional<CustomerProfileCRM> find(UUID userId) {
        return Optional.ofNullable(profiles.get(userId));
    }
}
