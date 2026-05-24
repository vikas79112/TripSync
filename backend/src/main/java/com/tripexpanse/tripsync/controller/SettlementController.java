package com.tripexpanse.tripsync.controller;

import com.tripexpanse.tripsync.dto.SettlementResponse;
import com.tripexpanse.tripsync.security.CustomUserDetails;
import com.tripexpanse.tripsync.service.SettlementService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping
public class SettlementController {

    private final SettlementService settlementService;

    public SettlementController(SettlementService settlementService) {
        this.settlementService = settlementService;
    }

    @GetMapping("/trips/{tripId}/settlements")
    public ResponseEntity<List<SettlementResponse>> getSettlements(
            @PathVariable("tripId") UUID tripId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        List<SettlementResponse> settlements = settlementService.getSettlements(tripId, currentUser);
        return ResponseEntity.ok(settlements);
    }

    @PostMapping("/trips/{tripId}/settle")
    public ResponseEntity<List<SettlementResponse>> settleTrip(
            @PathVariable("tripId") UUID tripId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        List<SettlementResponse> settlements = settlementService.settleTrip(tripId, currentUser);
        return ResponseEntity.ok(settlements);
    }

    @PostMapping("/settlements/{settlementId}/pay")
    public ResponseEntity<SettlementResponse> markAsPaid(
            @PathVariable("settlementId") UUID settlementId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        SettlementResponse response = settlementService.markAsPaid(settlementId, currentUser);
        return ResponseEntity.ok(response);
    }
}
