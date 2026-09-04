package com.jidnesh.jobtracker.status;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StatusEventRepository extends JpaRepository<StatusEvent, UUID> {

    List<StatusEvent> findAllByApplicationIdOrderByOccurredAtAsc(UUID applicationId);
}
