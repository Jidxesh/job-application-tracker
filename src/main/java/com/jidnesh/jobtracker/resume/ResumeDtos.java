package com.jidnesh.jobtracker.resume;

import com.fasterxml.jackson.annotation.JsonPropertyDescription;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public class ResumeDtos {

    public record AnalyzeRequest(
        @NotBlank @Size(max = 50_000) String resumeText,
        @Size(max = 20_000) String jobDescription,
        boolean includeAi
    ) {}

    public record ExtractResponse(String text) {}

    public record AnalyzeResponse(
        AtsReport ats,
        AiReview ai,
        String aiError
    ) {}

    /** Deterministic, rule-based ATS compatibility report. */
    public record AtsReport(
        int score,
        int wordCount,
        List<String> sectionsFound,
        KeywordMatch keywords,
        List<Category> categories
    ) {}

    public record Category(String name, int score, int max, List<String> feedback) {}

    public record KeywordMatch(int matchPercent, List<String> matched, List<String> missing) {}

    /** Claude's structured review. Field descriptions become the JSON schema sent to the API. */
    public record AiReview(
        @JsonPropertyDescription("Overall resume quality for the target role, 0-100")
        int overallScore,
        @JsonPropertyDescription("Two or three sentence assessment of how well the resume fits the role")
        String summary,
        @JsonPropertyDescription("What the resume already does well")
        List<String> strengths,
        @JsonPropertyDescription("Specific, actionable changes, most impactful first")
        List<String> improvements,
        @JsonPropertyDescription("Skills or keywords the job asks for that the resume does not show")
        List<String> missingSkills,
        @JsonPropertyDescription("Weak bullets from the resume rewritten to be stronger and quantified")
        List<BulletRewrite> bulletRewrites,
        @JsonPropertyDescription("Anything likely to confuse an applicant tracking system parser")
        List<String> atsWarnings
    ) {}

    public record BulletRewrite(
        @JsonPropertyDescription("The bullet exactly as written in the resume")
        String original,
        @JsonPropertyDescription("The improved bullet. Do not invent numbers; use [X] placeholders where a metric is needed")
        String improved
    ) {}
}
