package com.tripexpanse.tripsync.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class AnalyticsResponse {
    private BigDecimal totalExpense;
    private Map<String, BigDecimal> categoryBreakdown;
    private Map<String, BigDecimal> memberSpend;
    private Map<String, BigDecimal> memberShare;
    private String topSpenderName;
    private BigDecimal topSpenderAmount;
    private List<DailySpendDTO> dailySpending;

    public AnalyticsResponse() {}

    public AnalyticsResponse(BigDecimal totalExpense,
                             Map<String, BigDecimal> categoryBreakdown,
                             Map<String, BigDecimal> memberSpend,
                             Map<String, BigDecimal> memberShare,
                             String topSpenderName,
                             BigDecimal topSpenderAmount,
                             List<DailySpendDTO> dailySpending) {
        this.totalExpense = totalExpense;
        this.categoryBreakdown = categoryBreakdown;
        this.memberSpend = memberSpend;
        this.memberShare = memberShare;
        this.topSpenderName = topSpenderName;
        this.topSpenderAmount = topSpenderAmount;
        this.dailySpending = dailySpending;
    }

    // Getters and Setters
    public BigDecimal getTotalExpense() {
        return totalExpense;
    }

    public void setTotalExpense(BigDecimal totalExpense) {
        this.totalExpense = totalExpense;
    }

    public Map<String, BigDecimal> getCategoryBreakdown() {
        return categoryBreakdown;
    }

    public void setCategoryBreakdown(Map<String, BigDecimal> categoryBreakdown) {
        this.categoryBreakdown = categoryBreakdown;
    }

    public Map<String, BigDecimal> getMemberSpend() {
        return memberSpend;
    }

    public void setMemberSpend(Map<String, BigDecimal> memberSpend) {
        this.memberSpend = memberSpend;
    }

    public Map<String, BigDecimal> getMemberShare() {
        return memberShare;
    }

    public void setMemberShare(Map<String, BigDecimal> memberShare) {
        this.memberShare = memberShare;
    }

    public String getTopSpenderName() {
        return topSpenderName;
    }

    public void setTopSpenderName(String topSpenderName) {
        this.topSpenderName = topSpenderName;
    }

    public BigDecimal getTopSpenderAmount() {
        return topSpenderAmount;
    }

    public void setTopSpenderAmount(BigDecimal topSpenderAmount) {
        this.topSpenderAmount = topSpenderAmount;
    }

    public List<DailySpendDTO> getDailySpending() {
        return dailySpending;
    }

    public void setDailySpending(List<DailySpendDTO> dailySpending) {
        this.dailySpending = dailySpending;
    }
}
