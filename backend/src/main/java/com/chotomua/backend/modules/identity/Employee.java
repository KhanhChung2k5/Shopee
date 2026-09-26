package com.chotomua.backend.modules.identity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Employee is linked 1-1 to User via user_id but does NOT inherit from it —
 * per the lecturer's requirement (see crm-ecommerce-class-diagram.md v9 notes),
 * an employee has its own independent PK and is a separate row, not a subtype.
 */
@Entity
@Table(name = "employees")
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    // sales | warehouse | admin | cs
    @Column(nullable = false, length = 20)
    private String department;

    @Column(length = 100)
    private String position;

    @Column(name = "hired_at")
    private OffsetDateTime hiredAt;

    protected Employee() {
    }

    public Employee(User user, String department) {
        this.user = user;
        this.department = department;
    }

    public UUID getId() {
        return id;
    }

    public User getUser() {
        return user;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public OffsetDateTime getHiredAt() {
        return hiredAt;
    }

    public void setHiredAt(OffsetDateTime hiredAt) {
        this.hiredAt = hiredAt;
    }
}
