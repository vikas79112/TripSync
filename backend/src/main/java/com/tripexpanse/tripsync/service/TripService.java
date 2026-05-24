package com.tripexpanse.tripsync.service;

import com.tripexpanse.tripsync.dto.MemberRequest;
import com.tripexpanse.tripsync.dto.MemberResponse;
import com.tripexpanse.tripsync.dto.TripRequest;
import com.tripexpanse.tripsync.dto.TripResponse;
import com.tripexpanse.tripsync.entity.*;
import com.tripexpanse.tripsync.exception.ApiException;
import com.tripexpanse.tripsync.exception.ResourceNotFoundException;
import com.tripexpanse.tripsync.exception.UnauthorizedException;
import com.tripexpanse.tripsync.repository.DisputeRepository;
import com.tripexpanse.tripsync.repository.ExpenseParticipantRepository;
import com.tripexpanse.tripsync.repository.ExpenseRepository;
import com.tripexpanse.tripsync.repository.SettlementRepository;
import com.tripexpanse.tripsync.repository.GroupMemberRepository;
import com.tripexpanse.tripsync.repository.NotificationRepository;
import com.tripexpanse.tripsync.repository.TripGroupRepository;
import com.tripexpanse.tripsync.repository.UserRepository;
import com.tripexpanse.tripsync.security.CustomUserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TripService {

    private final TripGroupRepository tripGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final DisputeRepository disputeRepository;
    private final ExpenseParticipantRepository expenseParticipantRepository;
    private final ExpenseRepository expenseRepository;
    private final SettlementRepository settlementRepository;

    public TripService(TripGroupRepository tripGroupRepository,
                       GroupMemberRepository groupMemberRepository,
                       UserRepository userRepository,
                       NotificationRepository notificationRepository,
                       SimpMessagingTemplate messagingTemplate,
                       DisputeRepository disputeRepository,
                       ExpenseParticipantRepository expenseParticipantRepository,
                       ExpenseRepository expenseRepository,
                       SettlementRepository settlementRepository) {
        this.tripGroupRepository = tripGroupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
        this.disputeRepository = disputeRepository;
        this.expenseParticipantRepository = expenseParticipantRepository;
        this.expenseRepository = expenseRepository;
        this.settlementRepository = settlementRepository;
    }

    @Transactional
    public TripResponse createTrip(TripRequest request, CustomUserDetails currentUser) {
        User creator = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Logged-in user not found"));

        TripGroup trip = new TripGroup(
                request.getName(),
                request.getDestination(),
                request.getDescription(),
                request.getStartDate(),
                request.getEndDate(),
                creator
        );

        TripGroup savedTrip = tripGroupRepository.save(trip);

        // Add creator as LEADER
        GroupMember leader = new GroupMember(savedTrip, creator, GroupMemberRole.LEADER);
        groupMemberRepository.save(leader);

        MemberResponse leaderResponse = new MemberResponse(leader);
        return new TripResponse(savedTrip, List.of(leaderResponse));
    }

    @Transactional(readOnly = true)
    public List<TripResponse> getTripsForUser(CustomUserDetails currentUser) {
        return tripGroupRepository.findTripsByUserId(currentUser.getId())
                .stream()
                .map(trip -> {
                    List<MemberResponse> members = groupMemberRepository.findByTripGroupId(trip.getId())
                            .stream()
                            .map(MemberResponse::new)
                            .collect(Collectors.toList());
                    return new TripResponse(trip, members);
                })
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TripResponse getTripDetails(UUID tripId, CustomUserDetails currentUser) {
        TripGroup trip = tripGroupRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip group not found"));

        // Validate membership
        boolean isMember = groupMemberRepository.existsByTripGroupIdAndUserId(tripId, currentUser.getId());
        if (!isMember) {
            throw new UnauthorizedException("You are not a member of this trip group");
        }

        List<MemberResponse> members = groupMemberRepository.findByTripGroupId(tripId)
                .stream()
                .map(MemberResponse::new)
                .collect(Collectors.toList());

        return new TripResponse(trip, members);
    }

    @Transactional
    public MemberResponse addMemberToTrip(UUID tripId, MemberRequest request, CustomUserDetails currentUser) {
        TripGroup trip = tripGroupRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip group not found"));

        if (trip.getStatus() == TripStatus.SETTLED) {
            throw new ApiException("Cannot add members to a settled trip");
        }

        // Validate that current user is a member of the trip to add someone
        boolean isCurrentMember = groupMemberRepository.existsByTripGroupIdAndUserId(tripId, currentUser.getId());
        if (!isCurrentMember) {
            throw new UnauthorizedException("You must be a member of this trip to invite others");
        }

        User newUser = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User with email '" + request.getEmail() + "' is not registered in TripSync"));

        // Check if user is already a member
        boolean isAlreadyMember = groupMemberRepository.existsByTripGroupIdAndUserId(tripId, newUser.getId());
        if (isAlreadyMember) {
            throw new ApiException("User is already a member of this trip");
        }

        GroupMember newMember = new GroupMember(trip, newUser, GroupMemberRole.MEMBER);
        GroupMember savedMember = groupMemberRepository.save(newMember);

        // Create notification for the newly added member
        String inviteMessage = currentUser.getName() + " added you to the trip group '" + trip.getName() + "'.";
        Notification notification = new Notification(newUser, trip, inviteMessage, NotificationType.MEMBER_ADDED);
        notificationRepository.save(notification);

        // WebSocket broadcast
        try {
            messagingTemplate.convertAndSend("/topic/trip/" + tripId, java.util.Map.of(
                "type", "MEMBER_ADDED",
                "tripId", tripId.toString(),
                "member", new MemberResponse(savedMember)
            ));
            messagingTemplate.convertAndSend("/queue/notifications", java.util.Map.of(
                "type", "MEMBER_ADDED",
                "tripId", tripId.toString(),
                "userId", newUser.getId().toString(),
                "message", inviteMessage
            ));
        } catch (Exception ex) {
            System.err.println("Failed to send WebSocket notification for MEMBER_ADDED: " + ex.getMessage());
        }

        return new MemberResponse(savedMember);
    }

    @Transactional
    public void removeMemberFromTrip(UUID tripId, UUID userId, CustomUserDetails currentUser) {
        TripGroup trip = tripGroupRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip group not found"));

        if (trip.getStatus() == TripStatus.SETTLED) {
            throw new ApiException("Cannot modify members in a settled trip");
        }

        // Only the LEADER of the trip can remove members
        GroupMember currentMemberRecord = groupMemberRepository.findByTripGroupIdAndUserId(tripId, currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this trip"));

        if (currentMemberRecord.getRole() != GroupMemberRole.LEADER) {
            throw new UnauthorizedException("Only the trip leader can remove members");
        }

        if (currentUser.getId().equals(userId)) {
            throw new ApiException("Trip leader cannot leave or remove themselves directly");
        }

        boolean exists = groupMemberRepository.existsByTripGroupIdAndUserId(tripId, userId);
        if (!exists) {
            throw new ResourceNotFoundException("User is not a member of this trip");
        }

        groupMemberRepository.deleteByTripGroupIdAndUserId(tripId, userId);

        // WebSocket broadcast
        try {
            messagingTemplate.convertAndSend("/topic/trip/" + tripId, java.util.Map.of(
                "type", "MEMBER_REMOVED",
                "tripId", tripId.toString(),
                "userId", userId.toString()
            ));
        } catch (Exception ex) {
            System.err.println("Failed to send WebSocket notification for MEMBER_REMOVED: " + ex.getMessage());
        }
    }

    @Transactional
    public void deleteTrip(UUID tripId, CustomUserDetails currentUser) {
        TripGroup trip = tripGroupRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip group not found"));

        // Only the LEADER of the trip can delete it
        GroupMember currentMemberRecord = groupMemberRepository.findByTripGroupIdAndUserId(tripId, currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this trip"));

        if (currentMemberRecord.getRole() != GroupMemberRole.LEADER) {
            throw new UnauthorizedException("Only the trip leader can delete this trip");
        }

        // 1. Delete Disputes associated with the trip's expenses
        disputeRepository.deleteByExpenseTripGroupId(tripId);

        // 2. Delete ExpenseParticipants associated with the trip's expenses
        expenseParticipantRepository.deleteByExpenseTripGroupId(tripId);

        // 3. Delete Expenses associated with the trip
        expenseRepository.deleteByTripGroupId(tripId);

        // 4. Delete Settlements associated with the trip
        settlementRepository.deleteByTripGroupId(tripId);

        // 5. Delete Notifications associated with the trip
        notificationRepository.deleteByTripGroupId(tripId);

        // 6. Delete GroupMembers associated with the trip
        groupMemberRepository.deleteByTripGroupId(tripId);

        // 7. Delete the TripGroup itself
        tripGroupRepository.delete(trip);

        // WebSocket broadcast
        try {
            messagingTemplate.convertAndSend("/topic/trip/" + tripId, java.util.Map.of(
                "type", "TRIP_DELETED",
                "tripId", tripId.toString()
            ));
        } catch (Exception ex) {
            System.err.println("Failed to send WebSocket notification for TRIP_DELETED: " + ex.getMessage());
        }
    }
}
