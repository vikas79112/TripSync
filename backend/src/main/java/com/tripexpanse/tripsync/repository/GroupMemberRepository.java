package com.tripexpanse.tripsync.repository;

import com.tripexpanse.tripsync.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {
    List<GroupMember> findByTripGroupId(UUID tripId);
    Optional<GroupMember> findByTripGroupIdAndUserId(UUID tripId, UUID userId);
    boolean existsByTripGroupIdAndUserId(UUID tripId, UUID userId);
    void deleteByTripGroupIdAndUserId(UUID tripId, UUID userId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM GroupMember gm WHERE gm.tripGroup.id = :tripId")
    void deleteByTripGroupId(@org.springframework.data.repository.query.Param("tripId") UUID tripId);
}
