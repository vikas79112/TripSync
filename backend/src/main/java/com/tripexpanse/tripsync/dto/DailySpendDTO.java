package com.tripexpanse.tripsync.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class DailySpendDTO {
    private LocalDate date;
    private BigDecimal amount;

    public DailySpendDTO() {}

    public DailySpendDTO(LocalDate date, BigDecimal amount) {
        this.date = date;
        this.amount = amount;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }
}
