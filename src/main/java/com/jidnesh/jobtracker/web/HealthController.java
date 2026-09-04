package com.jidnesh.jobtracker.web;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class HealthController {

    private final JdbcTemplate jdbc;

    public HealthController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping("/health")
    public Map<String, Object> health() {
        Integer one = jdbc.queryForObject("select 1", Integer.class);
        return Map.of(
            "status", "up",
            "db", (one != null && one == 1) ? "reachable" : "down",
            "time", Instant.now().toString()
        );
    }
}
