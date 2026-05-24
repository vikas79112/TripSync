package com.tripexpanse.tripsync.service;

import com.tripexpanse.tripsync.dto.SettlementResponse;
import com.tripexpanse.tripsync.dto.UserResponse;
import com.tripexpanse.tripsync.entity.*;
import com.tripexpanse.tripsync.exception.ApiException;
import com.tripexpanse.tripsync.exception.ResourceNotFoundException;
import com.tripexpanse.tripsync.exception.UnauthorizedException;
import com.tripexpanse.tripsync.repository.*;
import com.tripexpanse.tripsync.security.CustomUserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.messaging.simp.SimpMessagingTemplate;

@Service
public class SettlementService {

    private final TripGroupRepository tripGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseParticipantRepository expenseParticipantRepository;
    private final SettlementRepository settlementRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public SettlementService(TripGroupRepository tripGroupRepository,
                             GroupMemberRepository groupMemberRepository,
                             ExpenseRepository expenseRepository,
                             ExpenseParticipantRepository expenseParticipantRepository,
                             SettlementRepository settlementRepository,
                             UserRepository userRepository,
                             NotificationRepository notificationRepository,
                             SimpMessagingTemplate messagingTemplate) {
        this.tripGroupRepository = tripGroupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.expenseRepository = expenseRepository;
        this.expenseParticipantRepository = expenseParticipantRepository;
        this.settlementRepository = settlementRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @Transactional(readOnly = true)
    public List<SettlementResponse> getSettlements(UUID tripId, CustomUserDetails currentUser) {
        TripGroup trip = tripGroupRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip group not found"));

        // Validate membership
        boolean isMember = groupMemberRepository.existsByTripGroupIdAndUserId(tripId, currentUser.getId());
        if (!isMember) {
            throw new UnauthorizedException("You are not a member of this trip group");
        }

        if (trip.getStatus() == TripStatus.SETTLED) {
            // Retrieve actual recorded settlements
            return settlementRepository.findByTripGroupId(tripId)
                    .stream()
                    .map(SettlementResponse::new)
                    .collect(Collectors.toList());
        } else {
            // Dynamic projected settlements
            return calculateDynamicSettlements(trip);
        }
    }

    @Transactional
    public List<SettlementResponse> settleTrip(UUID tripId, CustomUserDetails currentUser) {
        TripGroup trip = tripGroupRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip group not found"));

        // Validate that current user is the LEADER of the trip
        GroupMember memberRecord = groupMemberRepository.findByTripGroupIdAndUserId(tripId, currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this trip"));

        if (memberRecord.getRole() != GroupMemberRole.LEADER) {
            throw new UnauthorizedException("Only the trip leader can end the trip and generate settlements");
        }

        if (trip.getStatus() == TripStatus.SETTLED) {
            throw new ApiException("This trip group is already settled");
        }

        // 1. Calculate the final settlements
        List<SettlementResponse> dynamicSettlements = calculateDynamicSettlements(trip);

        // 2. Mark trip as SETTLED
        trip.setStatus(TripStatus.SETTLED);
        tripGroupRepository.save(trip);

        // 3. Clear out old settlements if any exist (precaution)
        settlementRepository.deleteByTripGroupId(tripId);

        // 4. Save settlements in the database
        List<SettlementResponse> savedResponses = new ArrayList<>();
        for (SettlementResponse ds : dynamicSettlements) {
            User debtor = userRepository.findById(ds.getDebtor().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Debtor not found"));
            User creditor = userRepository.findById(ds.getCreditor().getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Creditor not found"));

            Settlement settlement = new Settlement(trip, debtor, creditor, ds.getAmount());
            Settlement savedSettlement = settlementRepository.save(settlement);
            savedResponses.add(new SettlementResponse(savedSettlement));
        }

        // 5. Notify all members
        List<GroupMember> allMembers = groupMemberRepository.findByTripGroupId(tripId);
        String settleMsg = currentUser.getName() + " has ended the trip '" + trip.getName() + "' and generated final settlements.";
        for (GroupMember gm : allMembers) {
            if (!gm.getUser().getId().equals(currentUser.getId())) {
                Notification notification = new Notification(gm.getUser(), trip, settleMsg, NotificationType.TRIP_SETTLED);
                notificationRepository.save(notification);
            }
        }

        // WebSocket broadcast
        try {
            messagingTemplate.convertAndSend("/topic/trip/" + tripId, java.util.Map.of(
                "type", "TRIP_SETTLED",
                "tripId", tripId.toString()
            ));
        } catch (Exception ex) {
            System.err.println("Failed to send WebSocket notification for TRIP_SETTLED: " + ex.getMessage());
        }

        return savedResponses;
    }

    @Transactional
    public SettlementResponse markAsPaid(UUID settlementId, CustomUserDetails currentUser) {
        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new ResourceNotFoundException("Settlement not found"));

        TripGroup trip = settlement.getTripGroup();

        // Validate membership in the trip group
        boolean isMember = groupMemberRepository.existsByTripGroupIdAndUserId(trip.getId(), currentUser.getId());
        if (!isMember) {
            throw new UnauthorizedException("You are not a member of this trip group");
        }

        // Debtor, creditor, or leader can mark as paid
        boolean isDebtor = settlement.getDebtor().getId().equals(currentUser.getId());
        boolean isCreditor = settlement.getCreditor().getId().equals(currentUser.getId());
        GroupMember memberRecord = groupMemberRepository.findByTripGroupIdAndUserId(trip.getId(), currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("You are not a member of this trip"));
        boolean isLeader = memberRecord.getRole() == GroupMemberRole.LEADER;

        if (!isDebtor && !isCreditor && !isLeader) {
            throw new UnauthorizedException("Only the debtor, creditor, or trip leader can mark a settlement as PAID");
        }

        if (settlement.getStatus() == SettlementStatus.PAID) {
            throw new ApiException("Settlement is already marked as PAID");
        }

        settlement.setStatus(SettlementStatus.PAID);
        settlement.setSettledAt(LocalDateTime.now());
        Settlement savedSettlement = settlementRepository.save(settlement);

        // Notify the relevant counterparty
        User receiver = isDebtor ? settlement.getCreditor() : settlement.getDebtor();
        String paymentMessage = currentUser.getName() + " marked the settlement payment of " + settlement.getAmount() + " as PAID.";
        Notification notification = new Notification(receiver, trip, paymentMessage, NotificationType.DISPUTE_RESOLVED); // reusable type or custom info
        notificationRepository.save(notification);

        // WebSocket broadcast
        try {
            messagingTemplate.convertAndSend("/topic/trip/" + trip.getId(), java.util.Map.of(
                "type", "SETTLEMENT_PAID",
                "tripId", trip.getId().toString(),
                "settlementId", settlementId.toString(),
                "paymentMessage", paymentMessage
            ));
        } catch (Exception ex) {
            System.err.println("Failed to send WebSocket notification for SETTLEMENT_PAID: " + ex.getMessage());
        }

        return new SettlementResponse(savedSettlement);
    }

    private List<SettlementResponse> calculateDynamicSettlements(TripGroup trip) {
        UUID tripId = trip.getId();

        // 1. Fetch all members and map them
        List<GroupMember> members = groupMemberRepository.findByTripGroupId(tripId);
        Map<UUID, User> userMap = members.stream()
                .collect(Collectors.toMap(m -> m.getUser().getId(), GroupMember::getUser));

        Map<UUID, BigDecimal> balances = new HashMap<>();
        for (GroupMember m : members) {
            balances.put(m.getUser().getId(), BigDecimal.ZERO);
        }

        // 2. Add full amounts paid by each user to their balance
        List<Expense> expenses = expenseRepository.findByTripGroupIdOrderByExpenseDateDesc(tripId);
        for (Expense e : expenses) {
            // Skip disputed expenses if any? Wait, the prompt says "track expenses, automatically calculate balances"
            // Usually, disputed expenses are still included unless specified, but to keep it correct and robust, let's include them.
            UUID payerId = e.getPaidBy().getId();
            if (balances.containsKey(payerId)) {
                balances.put(payerId, balances.get(payerId).add(e.getAmount()));
            }
        }

        // 3. Subtract the share amounts from each user's balance
        List<ExpenseParticipant> participants = expenseParticipantRepository.findByTripGroupId(tripId);
        for (ExpenseParticipant ep : participants) {
            UUID userId = ep.getUser().getId();
            if (balances.containsKey(userId)) {
                balances.put(userId, balances.get(userId).subtract(ep.getShareAmount()));
            }
        }

        // Helper class to encapsulate balance tracking during greedy matching
        class UserBalance {
            User user;
            BigDecimal balance;

            UserBalance(User user, BigDecimal balance) {
                this.user = user;
                this.balance = balance;
            }
        }

        List<UserBalance> debtors = new ArrayList<>();
        List<UserBalance> creditors = new ArrayList<>();

        for (Map.Entry<UUID, BigDecimal> entry : balances.entrySet()) {
            BigDecimal balance = entry.getValue().setScale(2, RoundingMode.HALF_UP);
            User user = userMap.get(entry.getKey());

            if (balance.compareTo(BigDecimal.ZERO) < 0) {
                debtors.add(new UserBalance(user, balance));
            } else if (balance.compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(new UserBalance(user, balance));
            }
        }

        List<SettlementResponse> settlements = new ArrayList<>();
        int maxIterations = members.size() * 2;
        int iterations = 0;

        // Greedy matching loop
        while (!debtors.isEmpty() && !creditors.isEmpty() && iterations < maxIterations) {
            iterations++;

            // Sort debtors: largest debt (most negative) first (e.g. -50 comes before -20)
            debtors.sort(Comparator.comparing(a -> a.balance));

            // Sort creditors: largest credit (most positive) first (e.g. 50 comes before 20)
            creditors.sort((a, b) -> b.balance.compareTo(a.balance));

            UserBalance D = debtors.get(0);
            UserBalance C = creditors.get(0);

            BigDecimal debtAmount = D.balance.abs();
            BigDecimal creditAmount = C.balance;

            BigDecimal paymentAmount = debtAmount.min(creditAmount);

            if (paymentAmount.compareTo(BigDecimal.valueOf(0.01)) >= 0) {
                settlements.add(new SettlementResponse(
                        tripId,
                        new UserResponse(D.user),
                        new UserResponse(C.user),
                        paymentAmount,
                        SettlementStatus.PENDING
                ));
            }

            D.balance = D.balance.add(paymentAmount);
            C.balance = C.balance.subtract(paymentAmount);

            // Use 0.009 threshold to guard against rounding micro-errors
            if (D.balance.abs().compareTo(BigDecimal.valueOf(0.009)) < 0) {
                debtors.remove(0);
            }
            if (C.balance.compareTo(BigDecimal.valueOf(0.009)) < 0) {
                creditors.remove(0);
            }
        }

        return settlements;
    }
}
