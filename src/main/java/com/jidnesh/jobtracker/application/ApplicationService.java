package com.jidnesh.jobtracker.application;

import com.jidnesh.jobtracker.exception.NotFoundException;
import com.jidnesh.jobtracker.status.Status;
import com.jidnesh.jobtracker.status.StatusEvent;
import com.jidnesh.jobtracker.status.StatusEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ApplicationService {

    private final ApplicationRepository applications;
    private final StatusEventRepository events;

    public ApplicationService(ApplicationRepository applications, StatusEventRepository events) {
        this.applications = applications;
        this.events = events;
    }

    @Transactional
    public Application create(UUID userId, ApplicationDtos.CreateRequest req) {
        Application app = new Application();
        app.setUserId(userId);
        app.setCompany(req.company());
        app.setRoleTitle(req.roleTitle());
        app.setLocation(req.location());
        app.setSource(req.source());
        app.setAppliedOn(req.appliedOn());
        app.setNotes(req.notes());
        app.setCurrentStatus(Status.APPLIED);
        applications.save(app);

        StatusEvent first = new StatusEvent();
        first.setApplicationId(app.getId());
        first.setStatus(Status.APPLIED);
        first.setNote("Application created");
        first.setOccurredAt(Instant.now());
        events.save(first);

        return app;
    }

    @Transactional(readOnly = true)
    public List<Application> list(UUID userId, Status status) {
        return status == null
            ? applications.findAllByUserIdOrderByAppliedOnDesc(userId)
            : applications.findAllByUserIdAndCurrentStatusOrderByAppliedOnDesc(userId, status);
    }

    @Transactional(readOnly = true)
    public Application get(UUID userId, UUID id) {
        return applications.findByIdAndUserId(id, userId)
            .orElseThrow(() -> new NotFoundException("Application not found: " + id));
    }

    @Transactional
    public Application update(UUID userId, UUID id, ApplicationDtos.UpdateRequest req) {
        Application app = get(userId, id);
        app.setCompany(req.company());
        app.setRoleTitle(req.roleTitle());
        app.setLocation(req.location());
        app.setSource(req.source());
        app.setAppliedOn(req.appliedOn());
        app.setNotes(req.notes());
        return applications.save(app);
    }

    @Transactional
    public void delete(UUID userId, UUID id) {
        Application app = get(userId, id);
        applications.delete(app);
    }

    @Transactional(readOnly = true)
    public Map<Status, Long> summary(UUID userId) {
        Map<Status, Long> counts = new EnumMap<>(Status.class);
        for (Status s : Status.values()) {
            counts.put(s, applications.countByUserIdAndCurrentStatus(userId, s));
        }
        return counts;
    }
}
