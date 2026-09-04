package com.jidnesh.jobtracker.application;

import com.jidnesh.jobtracker.status.Status;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    Optional<Application> findByIdAndUserId(UUID id, UUID userId);

    List<Application> findAllByUserIdOrderByAppliedOnDesc(UUID userId);

    List<Application> findAllByUserIdAndCurrentStatusOrderByAppliedOnDesc(UUID userId, Status status);

    long countByUserIdAndCurrentStatus(UUID userId, Status status);
}
