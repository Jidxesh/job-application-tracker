package com.jidnesh.jobtracker.application;

import com.jidnesh.jobtracker.status.Status;
import com.jidnesh.jobtracker.status.StatusService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/applications")
public class ApplicationController {

    private final ApplicationService service;
    private final StatusService statusService;

    public ApplicationController(ApplicationService service, StatusService statusService) {
        this.service = service;
        this.statusService = statusService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicationDtos.ApplicationResponse create(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody ApplicationDtos.CreateRequest req) {
        return ApplicationDtos.ApplicationResponse.from(service.create(userId, req));
    }

    @GetMapping
    public List<ApplicationDtos.ApplicationResponse> list(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(required = false) Status status) {
        return service.list(userId, status).stream()
            .map(ApplicationDtos.ApplicationResponse::from)
            .toList();
    }

    @GetMapping("/summary")
    public Map<Status, Long> summary(@AuthenticationPrincipal UUID userId) {
        return service.summary(userId);
    }

    @GetMapping("/{id}")
    public ApplicationDtos.ApplicationResponse get(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id) {
        return ApplicationDtos.ApplicationResponse.from(service.get(userId, id));
    }

    @PutMapping("/{id}")
    public ApplicationDtos.ApplicationResponse update(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id,
            @Valid @RequestBody ApplicationDtos.UpdateRequest req) {
        return ApplicationDtos.ApplicationResponse.from(service.update(userId, id, req));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        service.delete(userId, id);
    }

    @PostMapping("/{id}/status")
    public ApplicationDtos.StatusEventResponse transition(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id,
            @Valid @RequestBody ApplicationDtos.TransitionRequest req) {
        return ApplicationDtos.StatusEventResponse.from(
            statusService.transition(userId, id, req.status(), req.note(), req.occurredAt()));
    }

    @GetMapping("/{id}/timeline")
    public List<ApplicationDtos.StatusEventResponse> timeline(
            @AuthenticationPrincipal UUID userId,
            @PathVariable UUID id) {
        return statusService.timeline(userId, id).stream()
            .map(ApplicationDtos.StatusEventResponse::from)
            .toList();
    }
}
