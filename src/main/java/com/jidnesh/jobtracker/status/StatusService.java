package com.jidnesh.jobtracker.status;

import com.jidnesh.jobtracker.application.Application;
import com.jidnesh.jobtracker.application.ApplicationRepository;
import com.jidnesh.jobtracker.exception.InvalidTransitionException;
import com.jidnesh.jobtracker.exception.NotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class StatusService {

    private static final Map<Status, Set<Status>> ALLOWED = Map.of(
        Status.APPLIED,           EnumSet.of(Status.ONLINE_ASSESSMENT, Status.INTERVIEW, Status.REJECTED, Status.WITHDRAWN),
        Status.ONLINE_ASSESSMENT, EnumSet.of(Status.INTERVIEW, Status.REJECTED, Status.WITHDRAWN),
        Status.INTERVIEW,         EnumSet.of(Status.INTERVIEW, Status.OFFER, Status.REJECTED, Status.WITHDRAWN),
        Status.OFFER,             EnumSet.of(Status.REJECTED, Status.WITHDRAWN),
        Status.REJECTED,          EnumSet.noneOf(Status.class),
        Status.WITHDRAWN,         EnumSet.noneOf(Status.class)
    );

    private final ApplicationRepository applications;
    private final StatusEventRepository events;

    public StatusService(ApplicationRepository applications, StatusEventRepository events) {
        this.applications = applications;
        this.events = events;
    }

    @Transactional
    public StatusEvent transition(UUID userId, UUID applicationId, Status target, String note, Instant occurredAt) {
        Application app = applications.findByIdAndUserId(applicationId, userId)
            .orElseThrow(() -> new NotFoundException("Application not found: " + applicationId));

        Status current = app.getCurrentStatus();
        if (!ALLOWED.getOrDefault(current, Set.of()).contains(target)) {
            throw new InvalidTransitionException(
                "Cannot move from " + current + " to " + target);
        }

        StatusEvent event = new StatusEvent();
        event.setApplicationId(applicationId);
        event.setStatus(target);
        event.setNote(note);
        event.setOccurredAt(occurredAt != null ? occurredAt : Instant.now());
        events.save(event);

        app.setCurrentStatus(target);
        applications.save(app);

        return event;
    }

    @Transactional(readOnly = true)
    public List<StatusEvent> timeline(UUID userId, UUID applicationId) {
        applications.findByIdAndUserId(applicationId, userId)
            .orElseThrow(() -> new NotFoundException("Application not found: " + applicationId));

        return events.findAllByApplicationIdOrderByOccurredAtAsc(applicationId);
    }
}
