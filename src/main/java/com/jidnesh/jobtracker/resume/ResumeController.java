package com.jidnesh.jobtracker.resume;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/resume")
public class ResumeController {

    private final AtsAnalyzer atsAnalyzer;
    private final AiResumeReviewer aiReviewer;

    public ResumeController(AtsAnalyzer atsAnalyzer, AiResumeReviewer aiReviewer) {
        this.atsAnalyzer = atsAnalyzer;
        this.aiReviewer = aiReviewer;
    }

    @PostMapping("/analyze")
    public ResumeDtos.AnalyzeResponse analyze(@Valid @RequestBody ResumeDtos.AnalyzeRequest req) {
        ResumeDtos.AtsReport ats = atsAnalyzer.analyze(req.resumeText(), req.jobDescription());

        if (!req.includeAi()) {
            return new ResumeDtos.AnalyzeResponse(ats, null, null);
        }
        if (!aiReviewer.isEnabled()) {
            return new ResumeDtos.AnalyzeResponse(ats, null,
                "AI review is not configured on the server (ANTHROPIC_API_KEY is not set).");
        }
        try {
            return new ResumeDtos.AnalyzeResponse(ats, aiReviewer.review(req.resumeText(), req.jobDescription()), null);
        } catch (AiResumeReviewer.AiReviewException ex) {
            // The ATS report is still useful on its own, so degrade instead of failing the request.
            return new ResumeDtos.AnalyzeResponse(ats, null, ex.getMessage());
        }
    }
}
