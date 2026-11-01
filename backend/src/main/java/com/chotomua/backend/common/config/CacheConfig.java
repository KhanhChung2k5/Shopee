package com.chotomua.backend.common.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * In-memory read cache (per backend instance) for data that changes rarely, so repeated page loads stop going to
 * Supabase. Every write that changes the data evicts its cache; the time limits only bound how stale a value can get
 * when the change happened elsewhere (another backend instance, or stock moved by an order).
 *
 * Never cached: carts, prices and stock at checkout, orders, payments, refunds, vouchers in use, chat, notifications —
 * anything a money or stock decision is made on is always read fresh.
 *
 * The test suite switches this off (app.cache.enabled=false) so tests never see each other's cached reads.
 */
@Configuration
@EnableCaching
@ConditionalOnProperty(name = "app.cache.enabled", havingValue = "true", matchIfMissing = true)
public class CacheConfig {

    /** Category tree — changes only when staff edits categories (evicted then). */
    public static final String CATEGORIES = "categories";
    /** Warehouse list — changes only when staff edits warehouses (evicted then). */
    public static final String WAREHOUSES = "warehouses";
    /** Storefront product list / detail. They show stock, so they are kept only briefly; checkout always re-checks stock. */
    public static final String PUBLIC_PRODUCTS = "publicProducts";
    public static final String PUBLIC_PRODUCT = "publicProduct";
    /** "Bán chạy" ranking — a few minutes behind is fine. */
    public static final String TOP_SELLERS = "topSellers";
    /** CRM customer report — heavy to build, a summary that may lag a couple of minutes. */
    public static final String CRM_CUSTOMER_REPORT = "crmCustomerReport";

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager();
        manager.registerCustomCache(CATEGORIES, build(Duration.ofHours(1), 50));
        manager.registerCustomCache(WAREHOUSES, build(Duration.ofHours(1), 20));
        manager.registerCustomCache(PUBLIC_PRODUCTS, build(Duration.ofSeconds(30), 500));
        manager.registerCustomCache(PUBLIC_PRODUCT, build(Duration.ofSeconds(30), 1000));
        manager.registerCustomCache(TOP_SELLERS, build(Duration.ofMinutes(5), 20));
        manager.registerCustomCache(CRM_CUSTOMER_REPORT, build(Duration.ofMinutes(2), 5));
        return manager;
    }

    private static com.github.benmanes.caffeine.cache.Cache<Object, Object> build(Duration ttl, long maxEntries) {
        return Caffeine.newBuilder().expireAfterWrite(ttl).maximumSize(maxEntries).build();
    }
}
