package com.jidnesh.jobtracker.application;

import com.jidnesh.jobtracker.status.Status;
import com.jidnesh.jobtracker.status.StatusEvent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public class ApplicationDtos {

    public record CreateRequest(
        @NotBlank String company,
        @NotBlank String roleTitle,
        String location,
        String source,
        LocalDate appliedOn,
        String notes
    ) {}

    public record UpdateRequest(
        @NotBlank String company,
        @NotBlank String roleTitle,
        String location,
        String source,
        LocalDate appliedOn,
        String notes
    ) {}

    public record TransitionRequest(
        @NotNull Status status,
        String note,
        Instant occurredAt
    ) {}

    public record ApplicationResponse(
        UUID id,
        String company,
        String roleTitle,
        String location,
        String source,
        LocalDate appliedOn,
        Status currentStatus,
        String notes,
        Instant createdAt,
        Instant updatedAt
    ) {
        public static ApplicationResponse from(Application a) {
            return new ApplicationResponse(
                a.getId(), a.getCompany(), a.getRoleTitle(), a.getLocation(),
                a.getSource(), a.getAppliedOn(), a.getCurrentStatus(),
                a.getNotes(), a.getCreatedAt(), a.getUpdatedAt());
        }
    }

    public record StatusEventResponse(UUID id, Status status, String note, Instant occurredAt) {
        public static StatusEventResponse from(StatusEvent e) {
            return new StatusEventResponse(e.getId(), e.getStatus(), e.getNote(), e.getOccurredAt());
        }
    }
}
