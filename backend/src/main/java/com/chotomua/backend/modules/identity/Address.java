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
import java.util.UUID;

@Entity
@Table(name = "addresses")
public class Address {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "recipient_name", nullable = false)
    private String recipientName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "full_address", nullable = false, length = 500)
    private String fullAddress;

    @Column(name = "is_default", nullable = false)
    private boolean isDefault = false;

    protected Address() {
    }

    public Address(User user, String recipientName, String phone, String fullAddress) {
        this.user = user;
        this.recipientName = recipientName;
        this.phone = phone;
        this.fullAddress = fullAddress;
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getFullAddress() {
        return fullAddress;
    }

    public void setFullAddress(String fullAddress) {
        this.fullAddress = fullAddress;
    }

    public boolean isDefault() {
        return isDefault;
    }

    public void setDefault(boolean isDefault) {
        this.isDefault = isDefault;
    }
}
