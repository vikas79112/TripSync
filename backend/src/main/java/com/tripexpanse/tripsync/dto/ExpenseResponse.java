package com.tripexpanse.tripsync.dto;

import com.tripexpanse.tripsync.entity.Expense;
import com.tripexpanse.tripsync.entity.ExpenseCategory;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ExpenseResponse {
    private UUID id;
    private String title;
    private BigDecimal amount;
    private ExpenseCategory category;
    private UserResponse paidBy;
    private String notes;
    private LocalDateTime expenseDate;
    private Boolean isDisputed;
    private LocalDateTime createdAt;
    private List<ParticipantResponseDTO> participants;

    public ExpenseResponse() {}

    public ExpenseResponse(Expense expense) {
        this.id = expense.getId();
        this.title = expense.getTitle();
        this.amount = expense.getAmount();
        this.category = expense.getCategory();
        this.paidBy = new UserResponse(expense.getPaidBy());
        this.notes = expense.getNotes();
        this.expenseDate = expense.getExpenseDate();
        this.isDisputed = expense.getIsDisputed();
        this.createdAt = expense.getCreatedAt();
    }

    public ExpenseResponse(Expense expense, List<ParticipantResponseDTO> participants) {
        this(expense);
        this.participants = participants;
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public ExpenseCategory getCategory() {
        return category;
    }

    public void setCategory(ExpenseCategory category) {
        this.category = category;
    }

    public UserResponse getPaidBy() {
        return paidBy;
    }

    public void setPaidBy(UserResponse paidBy) {
        this.paidBy = paidBy;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getExpenseDate() {
        return expenseDate;
    }

    public void setExpenseDate(LocalDateTime expenseDate) {
        this.expenseDate = expenseDate;
    }

    public Boolean getIsDisputed() {
        return isDisputed;
    }

    public void setIsDisputed(Boolean disputed) {
        isDisputed = disputed;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<ParticipantResponseDTO> getParticipants() {
        return participants;
    }

    public void setParticipants(List<ParticipantResponseDTO> participants) {
        this.participants = participants;
    }
}
