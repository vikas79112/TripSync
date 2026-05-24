package com.tripexpanse.tripsync.controller;

import com.tripexpanse.tripsync.dto.ExpenseRequest;
import com.tripexpanse.tripsync.dto.ExpenseResponse;
import com.tripexpanse.tripsync.security.CustomUserDetails;
import com.tripexpanse.tripsync.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    @PostMapping("/trips/{tripId}/expenses")
    public ResponseEntity<ExpenseResponse> addExpense(
            @PathVariable("tripId") UUID tripId,
            @Valid @RequestBody ExpenseRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        ExpenseResponse expense = expenseService.addExpense(tripId, request, currentUser);
        return new ResponseEntity<>(expense, HttpStatus.CREATED);
    }

    @GetMapping("/trips/{tripId}/expenses")
    public ResponseEntity<List<ExpenseResponse>> getTripExpenses(
            @PathVariable("tripId") UUID tripId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        List<ExpenseResponse> expenses = expenseService.getExpensesForTrip(tripId, currentUser);
        return ResponseEntity.ok(expenses);
    }

    @PutMapping("/expenses/{expenseId}")
    public ResponseEntity<ExpenseResponse> updateExpense(
            @PathVariable("expenseId") UUID expenseId,
            @Valid @RequestBody ExpenseRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        ExpenseResponse expense = expenseService.updateExpense(expenseId, request, currentUser);
        return ResponseEntity.ok(expense);
    }

    @DeleteMapping("/expenses/{expenseId}")
    public ResponseEntity<Void> deleteExpense(
            @PathVariable("expenseId") UUID expenseId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        expenseService.deleteExpense(expenseId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
