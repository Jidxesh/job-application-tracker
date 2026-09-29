package com.jidnesh.jobtracker.resume;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AtsAnalyzerTest {

    AtsAnalyzer analyzer = new AtsAnalyzer();

    static final String GOOD_RESUME = """
        Jane Doe
        jane@example.com | +1 555 123 4567 | linkedin.com/in/janedoe

        Summary
        Backend engineer with 5 years building Java and Spring Boot services on AWS.

        Experience
        Senior Software Engineer, Acme Corp
        - Built a Spring Boot payments API handling 2M requests per day on AWS
        - Reduced p99 latency by 40% by introducing Redis caching
        - Led migration of 12 services from EC2 to Kubernetes
        - Mentored 4 junior engineers through code review and pairing

        Education
        B.Sc. Computer Science, State University

        Skills
        Java, Spring Boot, PostgreSQL, Docker, Kubernetes, AWS, Redis
        """;

    static final String JOB = """
        We are hiring a backend engineer. You will build Java microservices with Spring Boot.
        Experience with Kubernetes, Kafka and PostgreSQL required. Kafka experience is a must.
        Spring Boot and Kubernetes on AWS. Java, Java, Java.
        """;

    @Test
    @DisplayName("finds standard sections and contact details")
    void sectionsAndContact() {
        var report = analyzer.analyze(GOOD_RESUME, null);

        assertThat(report.sectionsFound()).contains("Summary", "Experience", "Education", "Skills");
        assertThat(report.keywords()).isNull();
        var contact = report.categories().stream().filter(c -> c.name().equals("Contact information")).findFirst().orElseThrow();
        assertThat(contact.score()).isEqualTo(contact.max());
    }

    @Test
    @DisplayName("matches job description keywords and reports the missing ones")
    void keywordMatch() {
        var report = analyzer.analyze(GOOD_RESUME, JOB);

        assertThat(report.keywords()).isNotNull();
        assertThat(report.keywords().matched()).contains("java", "spring boot", "kubernetes", "postgresql");
        assertThat(report.keywords().missing()).contains("kafka");
        assertThat(report.keywords().matched()).doesNotContain("experience", "the", "we");
    }

    @Test
    @DisplayName("a weak, unstructured resume scores lower than a strong one")
    void weakResumeScoresLower() {
        String weak = """
            I am a developer. I worked on many things and I like my job.
            - Responsible for fixing bugs
            - Worked on the website
            """;
        int weakScore = analyzer.analyze(weak, JOB).score();
        int goodScore = analyzer.analyze(GOOD_RESUME, JOB).score();

        assertThat(weakScore).isLessThan(goodScore);
        assertThat(goodScore).isBetween(0, 100);
    }

    @Test
    @DisplayName("keyword matching respects word boundaries and simple plurals")
    void termMatching() {
        assertThat(AtsAnalyzer.containsTerm("built rest apis in go", "api")).isTrue();
        assertThat(AtsAnalyzer.containsTerm("javascript developer", "java")).isFalse();
        assertThat(AtsAnalyzer.containsTerm("c++ and c#", "c++")).isTrue();
        assertThat(AtsAnalyzer.containsTerm("spring-boot services", "spring boot")).isTrue();
    }
}
