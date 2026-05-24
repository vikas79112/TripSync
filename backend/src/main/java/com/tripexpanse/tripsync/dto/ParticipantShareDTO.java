package com.tripexpanse.tripsync.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public class ParticipantShareDTO {

    @NotNull
    private UUID userId;

    @NotNull
    private BigDecimal shareAmount;

    public ParticipantShareDTO() {}

    public ParticipantShareDTO(UUID userId, BigDecimal shareAmount) {
        this.userId = userId;
        this.shareAmount = shareAmount;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public BigDecimal getShareAmount() {
        return shareAmount;
    }

    public void setShareAmount(BigDecimal shareAmount) {
        this.shareAmount = shareAmount;
    }
}
