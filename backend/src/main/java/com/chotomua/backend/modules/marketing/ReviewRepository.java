package com.chotomua.backend.modules.marketing;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface ReviewRepository extends JpaRepository<Review,UUID>{ Optional<Review> findByOrderItemId(UUID id); List<Review> findByOrderItemIdIn(List<UUID> ids); }
