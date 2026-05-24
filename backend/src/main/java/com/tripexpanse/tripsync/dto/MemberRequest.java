package com.tripexpanse.tripsync.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class MemberRequest {

    @NotBlank(message = "Member email is required")
    @Email(message = "Must be a valid email address")
    private String email;

    public MemberRequest() {}

    public MemberRequest(String email) {
        this.email = email;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}
