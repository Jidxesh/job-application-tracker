package com.jidnesh.jobtracker.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import com.jidnesh.jobtracker.status.Status;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "applications")
@Getter
@Setter
@NoArgsConstructor
public class Application {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String company;

    @Column(nullable = false)
    private String roleTitle;

    private String location;

    private String source;

    private LocalDate appliedOn;

    @Enumerated(EnumType.STRING)
    private Status currentStatus;

    @Column(length = 2000)
    private String notes;

    private Instant createdAt;

    private Instant updatedAt;
}
