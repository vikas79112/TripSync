package com.tripexpanse.tripsync.dto;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public class TripRequest {

    @NotBlank(message = "Trip name is required")
    private String name;

    @NotBlank(message = "Destination is required")
    private String destination;

    private String description;
    private LocalDate startDate;
    private LocalDate endDate;

    public TripRequest() {}

    public TripRequest(String name, String destination, String description, LocalDate startDate, LocalDate endDate) {
        this.name = name;
        this.destination = destination;
        this.description = description;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }
}
