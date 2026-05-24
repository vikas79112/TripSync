package com.tripexpanse.tripsync.dto;

import com.tripexpanse.tripsync.entity.ExpenseCategory;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ExpenseRequest {

    @NotBlank(message = "Expense title is required")
    private String title;

    @NotNull(message = "Expense amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be at least 0.01")
    private BigDecimal amount;

    @NotNull(message = "Category is required")
    private ExpenseCategory category;

    private UUID paidById; // If null, the logged-in user is assumed

    private String notes;
    
    private LocalDateTime expenseDate;

    private String clientExpenseId;

    private boolean splitEqually = true;

    // List of user IDs for equal splitting
    private List<UUID> participantIds;

    // List of custom user shares for unequal splitting
    private List<ParticipantShareDTO> customShares;

    public ExpenseRequest() {}

    public ExpenseRequest(String title, BigDecimal amount, ExpenseCategory category, UUID paidById, String notes, LocalDateTime expenseDate, boolean splitEqually, List<UUID> participantIds, List<ParticipantShareDTO> customShares) {
        this.title = title;
        this.amount = amount;
        this.category = category;
        this.paidById = paidById;
        this.notes = notes;
        this.expenseDate = expenseDate;
        this.splitEqually = splitEqually;
        this.participantIds = participantIds;
        this.customShares = customShares;
    }

    // Getters and Setters
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

    public UUID getPaidById() {
        return paidById;
    }

    public void setPaidById(UUID paidById) {
        this.paidById = paidById;
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

    public boolean isSplitEqually() {
        return splitEqually;
    }

    public void setSplitEqually(boolean splitEqually) {
        this.splitEqually = splitEqually;
    }

    public List<UUID> getParticipantIds() {
        return participantIds;
    }

    public void setParticipantIds(List<UUID> participantIds) {
        this.participantIds = participantIds;
    }

    public List<ParticipantShareDTO> getCustomShares() {
        return customShares;
    }

    public void setCustomShares(List<ParticipantShareDTO> customShares) {
        this.customShares = customShares;
    }

    public String getClientExpenseId() {
        return clientExpenseId;
    }

    public void setClientExpenseId(String clientExpenseId) {
        this.clientExpenseId = clientExpenseId;
    }
}
