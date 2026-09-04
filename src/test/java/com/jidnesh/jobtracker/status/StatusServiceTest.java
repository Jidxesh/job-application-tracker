package com.jidnesh.jobtracker.status;

import com.jidnesh.jobtracker.application.Application;
import com.jidnesh.jobtracker.application.ApplicationRepository;
import com.jidnesh.jobtracker.exception.InvalidTransitionException;
import com.jidnesh.jobtracker.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StatusServiceTest {

    @Mock ApplicationRepository applications;
    @Mock StatusEventRepository events;
    @InjectMocks StatusService service;

    UUID userId;
    UUID appId;
    Application app;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        appId = UUID.randomUUID();
        app = new Application();
        app.setUserId(userId);
        app.setCurrentStatus(Status.APPLIED);
    }

    @Test
    @DisplayName("valid transition saves an event and updates current status")
    void validTransitionWritesBoth() {
        when(applications.findByIdAndUserId(appId, userId)).thenReturn(Optional.of(app));

        service.transition(userId, appId, Status.INTERVIEW, "Round 1", null);

        ArgumentCaptor<StatusEvent> captor = ArgumentCaptor.forClass(StatusEvent.class);
        verify(events).save(captor.capture());

        assertThat(captor.getValue().getStatus()).isEqualTo(Status.INTERVIEW);
        assertThat(captor.getValue().getApplicationId()).isEqualTo(appId);
        assertThat(app.getCurrentStatus()).isEqualTo(Status.INTERVIEW);
        verify(applications).save(app);
    }

    @Test
    @DisplayName("illegal transition throws and writes nothing")
    void illegalTransitionWritesNothing() {
        app.setCurrentStatus(Status.INTERVIEW);
        when(applications.findByIdAndUserId(appId, userId)).thenReturn(Optional.of(app));

        assertThatThrownBy(() -> service.transition(userId, appId, Status.APPLIED, null, null))
            .isInstanceOf(InvalidTransitionException.class)
            .hasMessageContaining("Cannot move from INTERVIEW to APPLIED");

        verify(events, never()).save(any());
        verify(applications, never()).save(any());
        assertThat(app.getCurrentStatus()).isEqualTo(Status.INTERVIEW);
    }

    @Test
    @DisplayName("terminal status cannot transition further")
    void rejectedIsTerminal() {
        app.setCurrentStatus(Status.REJECTED);
        when(applications.findByIdAndUserId(appId, userId)).thenReturn(Optional.of(app));

        assertThatThrownBy(() -> service.transition(userId, appId, Status.INTERVIEW, null, null))
            .isInstanceOf(InvalidTransitionException.class);

        verify(events, never()).save(any());
    }

    @Test
    @DisplayName("another user's application is not found")
    void otherUsersApplicationIsNotFound() {
        UUID attacker = UUID.randomUUID();
        when(applications.findByIdAndUserId(appId, attacker)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.transition(attacker, appId, Status.INTERVIEW, null, null))
            .isInstanceOf(NotFoundException.class);

        verify(events, never()).save(any());
    }
}
