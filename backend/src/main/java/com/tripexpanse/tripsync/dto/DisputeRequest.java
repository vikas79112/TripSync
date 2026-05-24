package com.tripexpanse.tripsync.dto;

import jakarta.validation.constraints.NotBlank;

public class DisputeRequest {
    @NotBlank(message = "Reason is required to raise a dispute")
    private String reason;

    public DisputeRequest() {}

    public DisputeRequest(String reason) {
        this.reason = reason;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
