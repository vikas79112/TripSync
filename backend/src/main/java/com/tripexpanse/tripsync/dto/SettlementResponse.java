package com.tripexpanse.tripsync.dto;

import com.tripexpanse.tripsync.entity.Settlement;
import com.tripexpanse.tripsync.entity.SettlementStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class SettlementResponse {
    private UUID id;
    private UUID tripId;
    private UserResponse debtor;
    private UserResponse creditor;
    private BigDecimal amount;
    private SettlementStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime settledAt;

    public SettlementResponse() {}

    public SettlementResponse(Settlement settlement) {
        this.id = settlement.getId();
        this.tripId = settlement.getTripGroup().getId();
        this.debtor = new UserResponse(settlement.getDebtor());
        this.creditor = new UserResponse(settlement.getCreditor());
        this.amount = settlement.getAmount();
        this.status = settlement.getStatus();
        this.createdAt = settlement.getCreatedAt();
        this.settledAt = settlement.getSettledAt();
    }

    public SettlementResponse(UUID tripId, UserResponse debtor, UserResponse creditor, BigDecimal amount, SettlementStatus status) {
        this.tripId = tripId;
        this.debtor = debtor;
        this.creditor = creditor;
        this.amount = amount;
        this.status = status;
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getTripId() {
        return tripId;
    }

    public void setTripId(UUID tripId) {
        this.tripId = tripId;
    }

    public UserResponse getDebtor() {
        return debtor;
    }

    public void setDebtor(UserResponse debtor) {
        this.debtor = debtor;
    }

    public UserResponse getCreditor() {
        return creditor;
    }

    public void setCreditor(UserResponse creditor) {
        this.creditor = creditor;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public SettlementStatus getStatus() {
        return status;
    }

    public void setStatus(SettlementStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getSettledAt() {
        return settledAt;
    }

    public void setSettledAt(LocalDateTime settledAt) {
        this.settledAt = settledAt;
    }
}
