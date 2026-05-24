package com.tripexpanse.tripsync.service;

import com.tripexpanse.tripsync.dto.DisputeRequest;
import com.tripexpanse.tripsync.dto.DisputeResponse;
import com.tripexpanse.tripsync.entity.*;
import com.tripexpanse.tripsync.exception.ApiException;
import com.tripexpanse.tripsync.exception.ResourceNotFoundException;
import com.tripexpanse.tripsync.exception.UnauthorizedException;
import com.tripexpanse.tripsync.repository.*;
import com.tripexpanse.tripsync.security.CustomUserDetails;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DisputeService {

    private final DisputeRepository disputeRepository;
    private final ExpenseRepository expenseRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public DisputeService(DisputeRepository disputeRepository,
                          ExpenseRepository expenseRepository,
                          GroupMemberRepository groupMemberRepository,
                          UserRepository userRepository,
                          NotificationRepository notificationRepository,
                          SimpMessagingTemplate messagingTemplate) {
        this.disputeRepository = disputeRepository;
        this.expenseRepository = expenseRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public DisputeResponse raiseDispute(UUID expenseId, DisputeRequest request, CustomUserDetails currentUser) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        TripGroup trip = expense.getTripGroup();
        if (trip.getStatus() == TripStatus.SETTLED) {
            throw new ApiException("Cannot dispute expenses on a settled trip");
        }

        // Validate membership
        boolean isMember = groupMemberRepository.existsByTripGroupIdAndUserId(trip.getId(), currentUser.getId());
        if (!isMember) {
            throw new UnauthorizedException("You must be a member of this trip to dispute expenses");
        }

        if (expense.getIsDisputed()) {
            throw new ApiException("This expense is already disputed");
        }

        User user = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Dispute dispute = new Dispute(expense, user, request.getReason());
        Dispute savedDispute = disputeRepository.save(dispute);

        // Update expense status
        expense.setIsDisputed(true);
        expenseRepository.save(expense);

        // Create Notifications
        List<GroupMember> allMembers = groupMemberRepository.findByTripGroupId(trip.getId());
        String notificationMsg = currentUser.getName() + " flagged expense: '" + expense.getTitle() + "' in trip '" + trip.getName() + "'. Reason: " + request.getReason();
        for (GroupMember gm : allMembers) {
            if (!gm.getUser().getId().equals(currentUser.getId())) {
                Notification notification = new Notification(gm.getUser(), trip, notificationMsg, NotificationType.EXPENSE_DISPUTED);
                notificationRepository.save(notification);
            }
        }

        // WebSocket Broadcast
        try {
            messagingTemplate.convertAndSend("/topic/trip/" + trip.getId(), java.util.Map.of(
                "type", "DISPUTE_RAISED",
                "tripId", trip.getId().toString(),
                "expenseId", expense.getId().toString(),
                "disputeId", savedDispute.getId().toString()
            ));
        } catch (Exception ex) {
            System.err.println("Failed to send WebSocket notification for DISPUTE_RAISED: " + ex.getMessage());
        }

        return new DisputeResponse(savedDispute);
    }

    @Transactional
    public DisputeResponse resolveDispute(UUID disputeId, CustomUserDetails currentUser) {
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Dispute not found"));

        Expense expense = dispute.getExpense();
        TripGroup trip = expense.getTripGroup();

        if (dispute.getStatus() == DisputeStatus.RESOLVED) {
            throw new ApiException("Dispute is already resolved");
        }

        // Validate that currentUser is either: expense creator/payer OR trip leader
        boolean isPayer = expense.getPaidBy().getId().equals(currentUser.getId());
        GroupMember memberRecord = groupMemberRepository.findByTripGroupIdAndUserId(trip.getId(), currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this trip"));
        boolean isLeader = memberRecord.getRole() == GroupMemberRole.LEADER;

        if (!isPayer && !isLeader) {
            throw new UnauthorizedException("Only the expense creator or trip leader can resolve disputes");
        }

        dispute.setStatus(DisputeStatus.RESOLVED);
        dispute.setResolvedAt(LocalDateTime.now());
        Dispute savedDispute = disputeRepository.save(dispute);

        // Update expense status
        expense.setIsDisputed(false);
        expenseRepository.save(expense);

        // Notify dispute raiser
        String resolveMsg = currentUser.getName() + " resolved the dispute for expense: '" + expense.getTitle() + "'.";
        Notification notification = new Notification(dispute.getRaisedBy(), trip, resolveMsg, NotificationType.DISPUTE_RESOLVED);
        notificationRepository.save(notification);

        // WebSocket Broadcast
        try {
            messagingTemplate.convertAndSend("/topic/trip/" + trip.getId(), java.util.Map.of(
                "type", "DISPUTE_RESOLVED",
                "tripId", trip.getId().toString(),
                "expenseId", expense.getId().toString(),
                "disputeId", savedDispute.getId().toString()
            ));
        } catch (Exception ex) {
            System.err.println("Failed to send WebSocket notification for DISPUTE_RESOLVED: " + ex.getMessage());
        }

        return new DisputeResponse(savedDispute);
    }

    @Transactional(readOnly = true)
    public List<DisputeResponse> getDisputesForTrip(UUID tripId, CustomUserDetails currentUser) {
        // Validate membership
        boolean isMember = groupMemberRepository.existsByTripGroupIdAndUserId(tripId, currentUser.getId());
        if (!isMember) {
            throw new UnauthorizedException("You are not a member of this trip group");
        }

        return disputeRepository.findByExpenseTripGroupIdOrderByCreatedAtDesc(tripId)
                .stream()
                .map(DisputeResponse::new)
                .collect(Collectors.toList());
    }
}
