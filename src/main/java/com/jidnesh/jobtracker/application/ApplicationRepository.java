package com.jidnesh.jobtracker.application;

import com.jidnesh.jobtracker.status.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ApplicationRepository extends JpaRepository<Application, UUID> {

    Optional<Application> findByIdAndUserId(UUID id, UUID userId);

    List<Application> findAllByUserIdOrderByAppliedOnDesc(UUID userId);

    List<Application> findAllByUserIdAndCurrentStatusOrderByAppliedOnDesc(UUID userId, Status status);

    @Query("select a.currentStatus, count(a) from Application a where a.userId = :userId group by a.currentStatus")
    List<Object[]> countByStatus(UUID userId);
}
