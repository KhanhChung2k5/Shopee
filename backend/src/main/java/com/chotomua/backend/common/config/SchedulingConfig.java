package com.chotomua.backend.common.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Turns on the @Scheduled jobs: the 20:00 CRM profile recalculation and the campaign dispatcher that
 * delivers scheduled notifications when they fall due. Without this (lost when the standalone CRM app was
 * merged in) neither ever ran. The test suite switches it off so background jobs don't race assertions.
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class SchedulingConfig {
}
