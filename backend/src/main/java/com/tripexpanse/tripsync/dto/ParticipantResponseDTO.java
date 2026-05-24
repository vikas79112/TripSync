package com.tripexpanse.tripsync.dto;

import com.tripexpanse.tripsync.entity.ExpenseParticipant;
import java.math.BigDecimal;
import java.util.UUID;

public class ParticipantResponseDTO {
    private UUID userId;
    private String name;
    private String email;
    private BigDecimal shareAmount;

    public ParticipantResponseDTO() {}

    public ParticipantResponseDTO(ExpenseParticipant ep) {
        this.userId = ep.getUser().getId();
        this.name = ep.getUser().getName();
        this.email = ep.getUser().getEmail();
        this.shareAmount = ep.getShareAmount();
    }

    public ParticipantResponseDTO(UUID userId, String name, String email, BigDecimal shareAmount) {
        this.userId = userId;
        this.name = name;
        this.email = email;
        this.shareAmount = shareAmount;
    }

    // Getters and Setters
    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public BigDecimal getShareAmount() {
        return shareAmount;
    }

    public void setShareAmount(BigDecimal shareAmount) {
        this.shareAmount = shareAmount;
    }
}
