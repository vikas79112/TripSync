package com.tripexpanse.tripsync.repository;

import com.tripexpanse.tripsync.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, UUID> {
    
    @Query("SELECT e FROM Expense e JOIN FETCH e.paidBy WHERE e.tripGroup.id = :tripId ORDER BY e.expenseDate DESC")
    List<Expense> findByTripGroupIdOrderByExpenseDateDesc(@Param("tripId") UUID tripId);

    @Query("SELECT e FROM Expense e JOIN FETCH e.paidBy WHERE e.tripGroup.id = :tripId")
    List<Expense> findByTripGroupId(@Param("tripId") UUID tripId);

    java.util.Optional<Expense> findByClientExpenseId(String clientExpenseId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM Expense e WHERE e.tripGroup.id = :tripId")
    void deleteByTripGroupId(@Param("tripId") UUID tripId);
}
