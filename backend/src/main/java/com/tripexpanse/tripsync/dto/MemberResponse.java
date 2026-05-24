package com.tripexpanse.tripsync.dto;

import com.tripexpanse.tripsync.entity.GroupMember;
import com.tripexpanse.tripsync.entity.GroupMemberRole;
import java.time.LocalDateTime;
import java.util.UUID;

public class MemberResponse {
    private UUID userId;
    private String email;
    private String name;
    private String avatarUrl;
    private GroupMemberRole role;
    private LocalDateTime joinedAt;

    public MemberResponse() {}

    public MemberResponse(GroupMember member) {
        this.userId = member.getUser().getId();
        this.email = member.getUser().getEmail();
        this.name = member.getUser().getName();
        this.avatarUrl = member.getUser().getAvatarUrl();
        this.role = member.getRole();
        this.joinedAt = member.getJoinedAt();
    }

    public MemberResponse(UUID userId, String email, String name, String avatarUrl, GroupMemberRole role, LocalDateTime joinedAt) {
        this.userId = userId;
        this.email = email;
        this.name = name;
        this.avatarUrl = avatarUrl;
        this.role = role;
        this.joinedAt = joinedAt;
    }

    // Getters and Setters
    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public GroupMemberRole getRole() {
        return role;
    }

    public void setRole(GroupMemberRole role) {
        this.role = role;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(LocalDateTime joinedAt) {
        this.joinedAt = joinedAt;
    }
}
