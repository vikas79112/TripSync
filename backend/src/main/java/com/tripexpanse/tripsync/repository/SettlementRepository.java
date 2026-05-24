package com.tripexpanse.tripsync.repository;

import com.tripexpanse.tripsync.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SettlementRepository extends JpaRepository<Settlement, UUID> {
    List<Settlement> findByTripGroupId(UUID tripId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Settlement s WHERE s.tripGroup.id = :tripId")
    void deleteByTripGroupId(@org.springframework.data.repository.query.Param("tripId") UUID tripId);
}
