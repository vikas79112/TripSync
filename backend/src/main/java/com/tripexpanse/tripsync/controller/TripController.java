package com.tripexpanse.tripsync.controller;

import com.tripexpanse.tripsync.dto.MemberRequest;
import com.tripexpanse.tripsync.dto.MemberResponse;
import com.tripexpanse.tripsync.dto.TripRequest;
import com.tripexpanse.tripsync.dto.TripResponse;
import com.tripexpanse.tripsync.security.CustomUserDetails;
import com.tripexpanse.tripsync.service.TripService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/trips")
public class TripController {

    private final TripService tripService;

    public TripController(TripService tripService) {
        this.tripService = tripService;
    }

    @PostMapping
    public ResponseEntity<TripResponse> createTrip(
            @Valid @RequestBody TripRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        TripResponse trip = tripService.createTrip(request, currentUser);
        return new ResponseEntity<>(trip, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<TripResponse>> getMyTrips(
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        List<TripResponse> trips = tripService.getTripsForUser(currentUser);
        return ResponseEntity.ok(trips);
    }

    @GetMapping("/{tripId}")
    public ResponseEntity<TripResponse> getTripDetails(
            @PathVariable("tripId") UUID tripId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        TripResponse trip = tripService.getTripDetails(tripId, currentUser);
        return ResponseEntity.ok(trip);
    }

    @PostMapping("/{tripId}/members")
    public ResponseEntity<MemberResponse> addMember(
            @PathVariable("tripId") UUID tripId,
            @Valid @RequestBody MemberRequest request,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        MemberResponse member = tripService.addMemberToTrip(tripId, request, currentUser);
        return new ResponseEntity<>(member, HttpStatus.CREATED);
    }

    @DeleteMapping("/{tripId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable("tripId") UUID tripId,
            @PathVariable("userId") UUID userId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        tripService.removeMemberFromTrip(tripId, userId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{tripId}")
    public ResponseEntity<Void> deleteTrip(
            @PathVariable("tripId") UUID tripId,
            @AuthenticationPrincipal CustomUserDetails currentUser) {
        tripService.deleteTrip(tripId, currentUser);
        return ResponseEntity.noContent().build();
    }
}
