package com.chotomua.backend.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtService {

    private final Key signingKey;
    private final long expirationMinutes;

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    public JwtService(
            @Value("${jwt.secret:}") String secret,
            @Value("${jwt.expiration-minutes}") long expirationMinutes
    ) {
        this.signingKey = signingKey(secret);
        this.expirationMinutes = expirationMinutes;
    }

    /**
     * The configured secret, or, when none is set, a random key for this run only: no well-known
     * fallback secret exists for anyone to sign tokens with. A secret shorter than 32 bytes is
     * rejected by Keys.hmacShaKeyFor, so the app fails at startup rather than signing weakly.
     */
    private static Key signingKey(String secret) {
        if (secret == null || secret.isBlank()) {
            log.warn("JWT_SECRET is not set: signing tokens with a random key for this run only. "
                    + "Logins will not survive a restart; set JWT_SECRET to keep them.");
            byte[] random = new byte[64];
            new SecureRandom().nextBytes(random);
            return Keys.hmacShaKeyFor(random);
        }
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(UUID userId, String role, String department) {
        Instant now = Instant.now();
        var builder = Jwts.builder()
                .subject(userId.toString())
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)));
        if (department != null) {
            builder.claim("department", department);
        }
        return builder.signWith(signingKey).compact();
    }

    /**
     * Returns the parsed claims, or null if the token is missing, expired, or has an invalid signature.
     */
    public Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                    .verifyWith((javax.crypto.SecretKey) signingKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
