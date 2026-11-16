package com.chotomua.backend.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.Test;

/** No well-known fallback secret: without JWT_SECRET each run signs with its own random key. */
class JwtServiceSecretTest {

    @Test
    void withoutASecretEachRunSignsWithItsOwnKey() {
        JwtService thisRun = new JwtService("", 60);
        JwtService anotherRun = new JwtService("", 60);
        String token = thisRun.generateToken(UUID.randomUUID(), "staff", "admin");

        assertThat(thisRun.parseClaims(token)).isNotNull();
        assertThat(anotherRun.parseClaims(token)).isNull();
    }

    @Test
    void aConfiguredSecretIsSharedAcrossRuns() {
        String secret = "test-secret-that-is-long-enough-for-hs256-signing-0123456789";
        String token = new JwtService(secret, 60).generateToken(UUID.randomUUID(), "buyer", null);

        assertThat(new JwtService(secret, 60).parseClaims(token)).isNotNull();
    }

    @Test
    void aSecretTooShortToSignSafelyStopsStartup() {
        assertThatThrownBy(() -> new JwtService("short", 60)).isInstanceOf(RuntimeException.class);
    }
}
