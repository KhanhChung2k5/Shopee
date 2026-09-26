package com.chotomua.backend.modules.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(unique = true, length = 20)
    private String phone;

    @Column(unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    // active | locked | deleted
    @Column(nullable = false, length = 20)
    private String status = "active";

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(length = 20)
    private String gender;

    private LocalDate dob;

    // Gộp từ bảng wallets (v13, quan hệ 1-1 bắt buộc) — xem crm-ecommerce-class-diagram.md
    @Column(name = "wallet_balance", nullable = false, precision = 12, scale = 2)
    private BigDecimal walletBalance = BigDecimal.ZERO;

    // Gộp từ bảng loyalty_points (v13)
    @Column(name = "loyalty_balance", nullable = false)
    private Integer loyaltyBalance = 0;

    @Column(name = "loyalty_tier", length = 50)
    private String loyaltyTier;

    // Gộp từ bảng customer_profiles_crm (v13)
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal ltv = BigDecimal.ZERO;

    @Column(name = "total_orders", nullable = false)
    private Integer totalOrders = 0;

    @Column(name = "last_purchase_at")
    private LocalDate lastPurchaseAt;

    @Column(name = "rfm_segment", length = 50)
    private String rfmSegment;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;

    protected User() {
    }

    public User(Role role, String passwordHash) {
        this.role = role;
        this.passwordHash = passwordHash;
    }

    public UUID getId() {
        return id;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public LocalDate getDob() {
        return dob;
    }

    public void setDob(LocalDate dob) {
        this.dob = dob;
    }

    public BigDecimal getWalletBalance() {
        return walletBalance;
    }

    public void setWalletBalance(BigDecimal walletBalance) {
        this.walletBalance = walletBalance;
    }

    public Integer getLoyaltyBalance() {
        return loyaltyBalance;
    }

    public void setLoyaltyBalance(Integer loyaltyBalance) {
        this.loyaltyBalance = loyaltyBalance;
    }

    public String getLoyaltyTier() {
        return loyaltyTier;
    }

    public void setLoyaltyTier(String loyaltyTier) {
        this.loyaltyTier = loyaltyTier;
    }

    public BigDecimal getLtv() {
        return ltv;
    }

    public void setLtv(BigDecimal ltv) {
        this.ltv = ltv;
    }

    public Integer getTotalOrders() {
        return totalOrders;
    }

    public void setTotalOrders(Integer totalOrders) {
        this.totalOrders = totalOrders;
    }

    public LocalDate getLastPurchaseAt() {
        return lastPurchaseAt;
    }

    public void setLastPurchaseAt(LocalDate lastPurchaseAt) {
        this.lastPurchaseAt = lastPurchaseAt;
    }

    public String getRfmSegment() {
        return rfmSegment;
    }

    public void setRfmSegment(String rfmSegment) {
        this.rfmSegment = rfmSegment;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getLastLoginAt() {
        return lastLoginAt;
    }

    public void setLastLoginAt(OffsetDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }
}
