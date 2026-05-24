package com.tripexpanse.tripsync.controller;

import com.tripexpanse.tripsync.dto.DisputeRequest;
import com.tripexpanse.tripsync.dto.DisputeResponse;
import com.tripexpanse.tripsync.security.CustomUserDetails;
import com.tripexpanse.tripsync.service.DisputeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class DisputeController {

    private final DisputeService disputeService;

    public DisputeController(DisputeService disputeService) {
        this.disputeService = disputeService;
    }

    @PostMapping("/expenses/{expenseId}/disputes")
    public ResponseEntity<DisputeResponse> raiseDispute(
            @PathVariable("expenseId") UUID expenseId,
            @Valid @RequestBody DisputeRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        DisputeResponse dispute = disputeService.raiseDispute(expenseId, request, currentUser);
        return new ResponseEntity<>(dispute, HttpStatus.CREATED);
    }

    @PutMapping("/disputes/{disputeId}/resolve")
    public ResponseEntity<DisputeResponse> resolveDispute(
            @PathVariable("disputeId") UUID disputeId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        DisputeResponse dispute = disputeService.resolveDispute(disputeId, currentUser);
        return ResponseEntity.ok(dispute);
    }

    @GetMapping("/trips/{tripId}/disputes")
    public ResponseEntity<List<DisputeResponse>> getTripDisputes(
            @PathVariable("tripId") UUID tripId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        List<DisputeResponse> disputes = disputeService.getDisputesForTrip(tripId, currentUser);
        return ResponseEntity.ok(disputes);
    }
}
