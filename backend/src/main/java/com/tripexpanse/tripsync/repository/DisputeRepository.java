package com.tripexpanse.tripsync.repository;

import com.tripexpanse.tripsync.entity.Dispute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DisputeRepository extends JpaRepository<Dispute, UUID> {
    List<Dispute> findByExpenseTripGroupIdOrderByCreatedAtDesc(UUID tripId);
    Optional<Dispute> findByExpenseId(UUID expenseId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM Dispute d WHERE d.expense.tripGroup.id = :tripId")
    void deleteByExpenseTripGroupId(@org.springframework.data.repository.query.Param("tripId") UUID tripId);
}
