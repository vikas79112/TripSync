package com.tripexpanse.tripsync.dto;

import com.tripexpanse.tripsync.entity.Dispute;
import com.tripexpanse.tripsync.entity.DisputeStatus;
import java.time.LocalDateTime;
import java.util.UUID;

public class DisputeResponse {
    private UUID id;
    private UUID expenseId;
    private String expenseTitle;
    private UserResponse raisedBy;
    private String reason;
    private DisputeStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

    public DisputeResponse() {}

    public DisputeResponse(Dispute dispute) {
        this.id = dispute.getId();
        this.expenseId = dispute.getExpense().getId();
        this.expenseTitle = dispute.getExpense().getTitle();
        this.raisedBy = new UserResponse(dispute.getRaisedBy());
        this.reason = dispute.getReason();
        this.status = dispute.getStatus();
        this.createdAt = dispute.getCreatedAt();
        this.resolvedAt = dispute.getResolvedAt();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getExpenseId() {
        return expenseId;
    }

    public void setExpenseId(UUID expenseId) {
        this.expenseId = expenseId;
    }

    public String getExpenseTitle() {
        return expenseTitle;
    }

    public void setExpenseTitle(String expenseTitle) {
        this.expenseTitle = expenseTitle;
    }

    public UserResponse getRaisedBy() {
        return raisedBy;
    }

    public void setRaisedBy(UserResponse raisedBy) {
        this.raisedBy = raisedBy;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public DisputeStatus getStatus() {
        return status;
    }

    public void setStatus(DisputeStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getResolvedAt() {
        return resolvedAt;
    }

    public void setResolvedAt(LocalDateTime resolvedAt) {
        this.resolvedAt = resolvedAt;
    }
}
