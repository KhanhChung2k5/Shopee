package com.chotomua.backend.modules.identity;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AddressRepository extends JpaRepository<Address, UUID> {

    List<Address> findByUserId(UUID userId);

    /** Addresses with their owner loaded in the same query — staff order lists show both, for many orders at once. */
    @org.springframework.data.jpa.repository.Query("select a from Address a join fetch a.user where a.id in :ids")
    List<Address> findAllWithUserByIdIn(@org.springframework.data.repository.query.Param("ids") java.util.Collection<UUID> ids);
}
