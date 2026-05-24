package com.tripexpanse.tripsync.service;

import com.tripexpanse.tripsync.dto.AnalyticsResponse;
import com.tripexpanse.tripsync.dto.DailySpendDTO;
import com.tripexpanse.tripsync.entity.*;
import com.tripexpanse.tripsync.exception.ResourceNotFoundException;
import com.tripexpanse.tripsync.exception.UnauthorizedException;
import com.tripexpanse.tripsync.repository.*;
import com.tripexpanse.tripsync.security.CustomUserDetails;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final TripGroupRepository tripGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseParticipantRepository expenseParticipantRepository;

    public AnalyticsService(TripGroupRepository tripGroupRepository,
                            GroupMemberRepository groupMemberRepository,
                            ExpenseRepository expenseRepository,
                            ExpenseParticipantRepository expenseParticipantRepository) {
        this.tripGroupRepository = tripGroupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.expenseRepository = expenseRepository;
        this.expenseParticipantRepository = expenseParticipantRepository;
    }

    @Transactional(readOnly = true)
    public AnalyticsResponse getAnalytics(UUID tripId, CustomUserDetails currentUser) {
        TripGroup trip = tripGroupRepository.findById(tripId)
                .orElseThrow(() -> new ResourceNotFoundException("Trip group not found"));

        // Validate membership
        boolean isMember = groupMemberRepository.existsByTripGroupIdAndUserId(tripId, currentUser.getId());
        if (!isMember) {
            throw new UnauthorizedException("You are not a member of this trip group");
        }

        List<Expense> expenses = expenseRepository.findByTripGroupIdOrderByExpenseDateDesc(tripId);
        List<GroupMember> members = groupMemberRepository.findByTripGroupId(tripId);
        List<ExpenseParticipant> participants = expenseParticipantRepository.findByTripGroupId(tripId);

        // 1. Total expense
        BigDecimal totalExpense = expenses.stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);

        // 2. Category breakdown
        Map<String, BigDecimal> categoryBreakdown = new HashMap<>();
        for (ExpenseCategory cat : ExpenseCategory.values()) {
            categoryBreakdown.put(cat.name(), BigDecimal.ZERO);
        }
        for (Expense e : expenses) {
            String catName = e.getCategory().name();
            categoryBreakdown.put(catName, categoryBreakdown.getOrDefault(catName, BigDecimal.ZERO).add(e.getAmount()));
        }

        // 3. Member spending (contributions) and Member shares
        Map<String, BigDecimal> memberSpend = new HashMap<>();
        Map<String, BigDecimal> memberShare = new HashMap<>();

        for (GroupMember m : members) {
            String name = m.getUser().getName();
            memberSpend.put(name, BigDecimal.ZERO);
            memberShare.put(name, BigDecimal.ZERO);
        }

        for (Expense e : expenses) {
            String payerName = e.getPaidBy().getName();
            memberSpend.put(payerName, memberSpend.getOrDefault(payerName, BigDecimal.ZERO).add(e.getAmount()));
        }

        for (ExpenseParticipant ep : participants) {
            String userName = ep.getUser().getName();
            memberShare.put(userName, memberShare.getOrDefault(userName, BigDecimal.ZERO).add(ep.getShareAmount()));
        }

        // Round all amounts
        memberSpend.replaceAll((k, v) -> v.setScale(2, RoundingMode.HALF_UP));
        memberShare.replaceAll((k, v) -> v.setScale(2, RoundingMode.HALF_UP));
        categoryBreakdown.replaceAll((k, v) -> v.setScale(2, RoundingMode.HALF_UP));

        // 4. Top spender
        String topSpenderName = "No one";
        BigDecimal topSpenderAmount = BigDecimal.ZERO;
        for (Map.Entry<String, BigDecimal> entry : memberSpend.entrySet()) {
            if (entry.getValue().compareTo(topSpenderAmount) > 0) {
                topSpenderName = entry.getKey();
                topSpenderAmount = entry.getValue();
            }
        }

        // 5. Daily spending trends
        Map<LocalDate, BigDecimal> dailyMap = new TreeMap<>(); // Sorted naturally by date!
        for (Expense e : expenses) {
            LocalDate date = e.getExpenseDate().toLocalDate();
            dailyMap.put(date, dailyMap.getOrDefault(date, BigDecimal.ZERO).add(e.getAmount()));
        }

        List<DailySpendDTO> dailySpending = dailyMap.entrySet().stream()
                .map(entry -> new DailySpendDTO(entry.getKey(), entry.getValue().setScale(2, RoundingMode.HALF_UP)))
                .collect(Collectors.toList());

        return new AnalyticsResponse(
                totalExpense,
                categoryBreakdown,
                memberSpend,
                memberShare,
                topSpenderName,
                topSpenderAmount,
                dailySpending
        );
    }
}
