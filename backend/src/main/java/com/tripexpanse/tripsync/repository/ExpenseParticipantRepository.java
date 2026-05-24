package com.tripexpanse.tripsync.repository;

import com.tripexpanse.tripsync.entity.ExpenseParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExpenseParticipantRepository extends JpaRepository<ExpenseParticipant, UUID> {
    List<ExpenseParticipant> findByExpenseId(UUID expenseId);
    void deleteByExpenseId(UUID expenseId);

    @Query("SELECT ep FROM ExpenseParticipant ep WHERE ep.expense.tripGroup.id = :tripId")
    List<ExpenseParticipant> findByTripGroupId(@Param("tripId") UUID tripId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM ExpenseParticipant ep WHERE ep.expense.tripGroup.id = :tripId")
    void deleteByExpenseTripGroupId(@Param("tripId") UUID tripId);
}
