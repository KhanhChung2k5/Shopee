package com.chotomua.backend.modules.identity;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    List<User> findByRoleOrderByCreatedAtDesc(String role);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") UUID id);

    /**
     * Status, role and (for staff) department as stored now — what JwtAuthenticationFilter authorizes each
     * request with, so a lock or a department change applies without waiting for the token to expire.
     */
    @Query("select u.status as status, u.role as role, e.department as department "
            + "from User u left join Employee e on e.user = u where u.id = :id")
    Optional<AccessView> findAccessById(@Param("id") UUID id);

    interface AccessView {
        String getStatus();

        String getRole();

        String getDepartment();
    }
}
