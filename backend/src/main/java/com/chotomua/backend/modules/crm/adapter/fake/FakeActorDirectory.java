package com.chotomua.backend.modules.crm.adapter.fake;

import com.chotomua.backend.modules.crm.port.ActorDirectory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

/** Bản giả: không có bảng users — nhật ký rơi về nhãn tài khoản demo ({@code CrmDemoActors}). */
@Component
@Profile("crm-fake")
public class FakeActorDirectory implements ActorDirectory {

    @Override
    public Optional<Actor> find(UUID userId) {
        return Optional.empty();
    }
}
