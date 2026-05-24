package com.tripexpanse.tripsync.service;

import com.tripexpanse.tripsync.dto.*;
import com.tripexpanse.tripsync.entity.*;
import com.tripexpanse.tripsync.exception.ApiException;
import com.tripexpanse.tripsync.exception.ResourceNotFoundException;
import com.tripexpanse.tripsync.exception.UnauthorizedException;
import com.tripexpanse.tripsync.repository.*;
import com.tripexpanse.tripsync.security.CustomUserDetails;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseParticipantRepository expenseParticipantRepository;
    private final TripGroupRepository tripGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public ExpenseService(ExpenseRepository expenseRepository,
                          ExpenseParticipantRepository expenseParticipantRepository,
                          TripGroupRepository tripGroupRepository,
                          GroupMemberRepository groupMemberRepository,
                          UserRepository userRepository,
                          NotificationRepository notificationRepository,
                          SimpMessagingTemplate messagingTemplate) {
        this.expenseRepository = expenseRepository;
        this.expenseParticipantRepository = expenseParticipantRepository;
        this.tripGroupRepository = tripGroupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional
    public ExpenseResponse addExpense(UUID tripId, ExpenseRequest request, CustomUserDetails currentUser) {
        TripGroup trip = tripGroupRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip group not found"));

        if (trip.getStatus() == TripStatus.SETTLED) {
            throw new ApiException("Cannot add expenses to a settled trip");
        }

        // Deduplication Check
        if (request.getClientExpenseId() != null && !request.getClientExpenseId().trim().isEmpty()) {
            java.util.Optional<Expense> existing = expenseRepository.findByClientExpenseId(request.getClientExpenseId());
            if (existing.isPresent()) {
                List<ExpenseParticipant> participants = expenseParticipantRepository.findByExpenseId(existing.get().getId());
                List<ParticipantResponseDTO> participantDtos = participants.stream()
                        .map(ParticipantResponseDTO::new)
                        .collect(Collectors.toList());
                return new ExpenseResponse(existing.get(), participantDtos);
            }
        }

        // Validate that current user is a member of the trip
        boolean isCurrentUserMember = groupMemberRepository.existsByTripGroupIdAndUserId(tripId, currentUser.getId());
        if (!isCurrentUserMember) {
            throw new UnauthorizedException("You must be a member of this trip to add expenses");
        }

        // Determine who paid
        User paidByUser;
        if (request.getPaidById() != null) {
            paidByUser = userRepository.findById(request.getPaidById())
                    .orElseThrow(() -> new ResourceNotFoundException("Payer user not found"));
            boolean isPayerMember = groupMemberRepository.existsByTripGroupIdAndUserId(tripId, paidByUser.getId());
            if (!isPayerMember) {
                throw new ApiException("Payer must be a member of this trip");
            }
        } else {
            paidByUser = userRepository.findById(currentUser.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Logged-in user not found"));
        }

        Expense expense = new Expense(
                trip,
                request.getTitle(),
                request.getAmount(),
                request.getCategory(),
                paidByUser,
                request.getNotes(),
                request.getExpenseDate() != null ? request.getExpenseDate() : LocalDateTime.now()
        );
        if (request.getClientExpenseId() != null && !request.getClientExpenseId().trim().isEmpty()) {
            expense.setClientExpenseId(request.getClientExpenseId());
        }

        Expense savedExpense = expenseRepository.save(expense);
        List<ExpenseParticipant> savedParticipants = new ArrayList<>();

        if (request.isSplitEqually()) {
            List<UUID> participantIds = request.getParticipantIds();
            
            // If no specific participants provided, default to all members of the trip
            if (participantIds == null || participantIds.isEmpty()) {
                participantIds = groupMemberRepository.findByTripGroupId(tripId)
                        .stream()
                        .map(m -> m.getUser().getId())
                        .collect(Collectors.toList());
            }

            int K = participantIds.size();
            if (K == 0) {
                throw new ApiException("An expense must have at least one participant");
            }

            BigDecimal totalAmount = request.getAmount();
            BigDecimal standardShare = totalAmount.divide(BigDecimal.valueOf(K), 2, RoundingMode.HALF_UP);
            BigDecimal cumulativeShare = standardShare.multiply(BigDecimal.valueOf(K - 1));
            BigDecimal lastShare = totalAmount.subtract(cumulativeShare); // Exact difference to match total amount!

            for (int i = 0; i < K; i++) {
                UUID participantId = participantIds.get(i);
                User participantUser = userRepository.findById(participantId)
                        .orElseThrow(() -> new ResourceNotFoundException("Participant user not found: " + participantId));
                
                // Confirm membership
                if (!groupMemberRepository.existsByTripGroupIdAndUserId(tripId, participantId)) {
                    throw new ApiException("Participant must be a member of the trip: " + participantUser.getName());
                }

                BigDecimal share = (i == K - 1) ? lastShare : standardShare;
                ExpenseParticipant ep = new ExpenseParticipant(savedExpense, participantUser, share);
                savedParticipants.add(expenseParticipantRepository.save(ep));
            }
        } else {
            // Custom splits (unequal splitting)
            List<ParticipantShareDTO> customShares = request.getCustomShares();
            if (customShares == null || customShares.isEmpty()) {
                throw new ApiException("Custom splits require a list of user shares");
            }

            BigDecimal sum = BigDecimal.ZERO;
            for (ParticipantShareDTO shareDto : customShares) {
                sum = sum.add(shareDto.getShareAmount());
            }

            if (sum.compareTo(request.getAmount()) != 0) {
                throw new ApiException("The sum of custom shares (" + sum + ") must exactly match the expense total (" + request.getAmount() + ")");
            }

            for (ParticipantShareDTO shareDto : customShares) {
                User participantUser = userRepository.findById(shareDto.getUserId())
                        .orElseThrow(() -> new ResourceNotFoundException("Participant user not found: " + shareDto.getUserId()));
                
                if (!groupMemberRepository.existsByTripGroupIdAndUserId(tripId, shareDto.getUserId())) {
                    throw new ApiException("Participant must be a member of the trip: " + participantUser.getName());
                }

                ExpenseParticipant ep = new ExpenseParticipant(savedExpense, participantUser, shareDto.getShareAmount());
                savedParticipants.add(expenseParticipantRepository.save(ep));
            }
        }

        // Notify other members of the trip about the new expense
        List<GroupMember> otherMembers = groupMemberRepository.findByTripGroupId(tripId);
        String expenseNotificationMsg = paidByUser.getName() + " added a new expense: '" + expense.getTitle() + "' of " + expense.getAmount() + " in trip '" + trip.getName() + "'.";
        for (GroupMember gm : otherMembers) {
            if (!gm.getUser().getId().equals(paidByUser.getId())) {
                Notification notification = new Notification(gm.getUser(), trip, expenseNotificationMsg, NotificationType.EXPENSE_ADDED);
                notificationRepository.save(notification);
            }
        }

        List<ParticipantResponseDTO> participantDtos = savedParticipants.stream()
                .map(ParticipantResponseDTO::new)
                .collect(Collectors.toList());

        // WebSocket broadcast
        try {
            messagingTemplate.convertAndSend("/topic/trip/" + tripId, java.util.Map.of(
                "type", "EXPENSE_ADDED",
                "tripId", tripId.toString(),
                "expenseId", savedExpense.getId().toString()
            ));
        } catch (Exception ex) {
            System.err.println("Failed to send WebSocket notification: " + ex.getMessage());
        }

        return new ExpenseResponse(savedExpense, participantDtos);
    }

    @Transactional(readOnly = true)
    public List<ExpenseResponse> getExpensesForTrip(UUID tripId, CustomUserDetails currentUser) {
        // Validate membership
        boolean isMember = groupMemberRepository.existsByTripGroupIdAndUserId(tripId, currentUser.getId());
        if (!isMember) {
            throw new UnauthorizedException("You are not a member of this trip");
        }

        return expenseRepository.findByTripGroupIdOrderByExpenseDateDesc(tripId)
                .stream()
                .map(expense -> {
                    List<ParticipantResponseDTO> participants = expenseParticipantRepository.findByExpenseId(expense.getId())
                            .stream()
                            .map(ParticipantResponseDTO::new)
                            .collect(Collectors.toList());
                    return new ExpenseResponse(expense, participants);
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public ExpenseResponse updateExpense(UUID expenseId, ExpenseRequest request, CustomUserDetails currentUser) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        TripGroup trip = expense.getTripGroup();
        if (trip.getStatus() == TripStatus.SETTLED) {
            throw new ApiException("Cannot modify expenses in a settled trip");
        }

        // Only the payer or trip leader or the expense creator can edit the expense details.
        // For simplicity and transparency, let's allow the user who created it (which is paidBy) OR the Trip Leader to edit.
        boolean isPayer = expense.getPaidBy().getId().equals(currentUser.getId());
        GroupMember memberRecord = groupMemberRepository.findByTripGroupIdAndUserId(trip.getId(), currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this trip"));
        boolean isLeader = memberRecord.getRole() == GroupMemberRole.LEADER;

        if (!isPayer && !isLeader) {
            throw new UnauthorizedException("You are not authorized to edit this expense (only payer or trip leader can edit)");
        }

        expense.setTitle(request.getTitle());
        expense.setAmount(request.getAmount());
        expense.setCategory(request.getCategory());
        expense.setNotes(request.getNotes());
        if (request.getExpenseDate() != null) {
            expense.setExpenseDate(request.getExpenseDate());
        }

        // Determine Payer
        if (request.getPaidById() != null) {
            User payer = userRepository.findById(request.getPaidById())
                    .orElseThrow(() -> new ResourceNotFoundException("Payer user not found"));
            if (!groupMemberRepository.existsByTripGroupIdAndUserId(trip.getId(), payer.getId())) {
                throw new ApiException("Payer must be a member of this trip");
            }
            expense.setPaidBy(payer);
        }

        Expense savedExpense = expenseRepository.save(expense);

        // Delete old splits
        expenseParticipantRepository.deleteByExpenseId(expenseId);
        List<ExpenseParticipant> savedParticipants = new ArrayList<>();

        if (request.isSplitEqually()) {
            List<UUID> participantIds = request.getParticipantIds();
            if (participantIds == null || participantIds.isEmpty()) {
                participantIds = groupMemberRepository.findByTripGroupId(trip.getId())
                        .stream()
                        .map(m -> m.getUser().getId())
                        .collect(Collectors.toList());
            }

            int K = participantIds.size();
            BigDecimal totalAmount = request.getAmount();
            BigDecimal standardShare = totalAmount.divide(BigDecimal.valueOf(K), 2, RoundingMode.HALF_UP);
            BigDecimal cumulativeShare = standardShare.multiply(BigDecimal.valueOf(K - 1));
            BigDecimal lastShare = totalAmount.subtract(cumulativeShare);

            for (int i = 0; i < K; i++) {
                UUID pId = participantIds.get(i);
                User participantUser = userRepository.findById(pId)
                        .orElseThrow(() -> new ResourceNotFoundException("Participant user not found: " + pId));
                
                if (!groupMemberRepository.existsByTripGroupIdAndUserId(trip.getId(), pId)) {
                    throw new ApiException("Participant must be a member of the trip: " + participantUser.getName());
                }

                BigDecimal share = (i == K - 1) ? lastShare : standardShare;
                ExpenseParticipant ep = new ExpenseParticipant(savedExpense, participantUser, share);
                savedParticipants.add(expenseParticipantRepository.save(ep));
            }
        } else {
            List<ParticipantShareDTO> customShares = request.getCustomShares();
            if (customShares == null || customShares.isEmpty()) {
                throw new ApiException("Custom splits require a list of user shares");
            }

            BigDecimal sum = BigDecimal.ZERO;
            for (ParticipantShareDTO sDto : customShares) {
                sum = sum.add(sDto.getShareAmount());
            }

            if (sum.compareTo(request.getAmount()) != 0) {
                throw new ApiException("The sum of custom shares (" + sum + ") must exactly match the expense total (" + request.getAmount() + ")");
            }

            for (ParticipantShareDTO sDto : customShares) {
                User participantUser = userRepository.findById(sDto.getUserId())
                        .orElseThrow(() -> new ResourceNotFoundException("Participant user not found: " + sDto.getUserId()));
                
                if (!groupMemberRepository.existsByTripGroupIdAndUserId(trip.getId(), sDto.getUserId())) {
                    throw new ApiException("Participant must be a member of the trip: " + participantUser.getName());
                }

                ExpenseParticipant ep = new ExpenseParticipant(savedExpense, participantUser, sDto.getShareAmount());
                savedParticipants.add(expenseParticipantRepository.save(ep));
            }
        }

        List<ParticipantResponseDTO> participantDtos = savedParticipants.stream()
                .map(ParticipantResponseDTO::new)
                .collect(Collectors.toList());

        // WebSocket broadcast
        try {
            messagingTemplate.convertAndSend("/topic/trip/" + trip.getId(), java.util.Map.of(
                "type", "EXPENSE_UPDATED",
                "tripId", trip.getId().toString(),
                "expenseId", savedExpense.getId().toString()
            ));
        } catch (Exception ex) {
            System.err.println("Failed to send WebSocket notification: " + ex.getMessage());
        }

        return new ExpenseResponse(savedExpense, participantDtos);
    }

    @Transactional
    public void deleteExpense(UUID expenseId, CustomUserDetails currentUser) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new ResourceNotFoundException("Expense not found"));

        TripGroup trip = expense.getTripGroup();
        if (trip.getStatus() == TripStatus.SETTLED) {
            throw new ApiException("Cannot delete expenses in a settled trip");
        }

        boolean isPayer = expense.getPaidBy().getId().equals(currentUser.getId());
        GroupMember memberRecord = groupMemberRepository.findByTripGroupIdAndUserId(trip.getId(), currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this trip"));
        boolean isLeader = memberRecord.getRole() == GroupMemberRole.LEADER;

        if (!isPayer && !isLeader) {
            throw new UnauthorizedException("You are not authorized to delete this expense (only payer or trip leader can delete)");
        }

        // Delete splits first, then expense
        expenseParticipantRepository.deleteByExpenseId(expenseId);
        expenseRepository.delete(expense);

        // WebSocket broadcast
        try {
            messagingTemplate.convertAndSend("/topic/trip/" + trip.getId(), java.util.Map.of(
                "type", "EXPENSE_DELETED",
                "tripId", trip.getId().toString(),
                "expenseId", expenseId.toString()
            ));
        } catch (Exception ex) {
            System.err.println("Failed to send WebSocket notification: " + ex.getMessage());
        }
    }
}
