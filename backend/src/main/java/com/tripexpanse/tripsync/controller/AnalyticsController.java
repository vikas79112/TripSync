package com.tripexpanse.tripsync.controller;

import com.tripexpanse.tripsync.dto.AnalyticsResponse;
import com.tripexpanse.tripsync.security.CustomUserDetails;
import com.tripexpanse.tripsync.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping
    public ResponseEntity<AnalyticsResponse> getAnalytics(
            @PathVariable("tripId") UUID tripId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        AnalyticsResponse response = analyticsService.getAnalytics(tripId, currentUser);
        return ResponseEntity.ok(response);
    }
}
