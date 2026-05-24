package com.tripexpanse.tripsync.repository;

import com.tripexpanse.tripsync.entity.TripGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TripGroupRepository extends JpaRepository<TripGroup, UUID> {
    
    @Query("SELECT tg FROM TripGroup tg JOIN GroupMember gm ON tg.id = gm.tripGroup.id WHERE gm.user.id = :userId ORDER BY tg.createdAt DESC")
    List<TripGroup> findTripsByUserId(@Param("userId") UUID userId);
}
