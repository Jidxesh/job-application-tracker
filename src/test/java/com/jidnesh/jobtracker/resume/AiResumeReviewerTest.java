package com.jidnesh.jobtracker.resume;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class AiResumeReviewerTest {

    @Test
    @DisplayName("sends a structured-output request and parses the typed review")
    void roundTrip() throws Exception {
        AtomicReference<String> body = new AtomicReference<>();
        AtomicReference<String> beta = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        String review = "{\\\"overallScore\\\":72,\\\"summary\\\":\\\"ok\\\",\\\"strengths\\\":[\\\"a\\\"],\\\"improvements\\\":[\\\"b\\\"],\\\"missingSkills\\\":[\\\"kafka\\\"],\\\"bulletRewrites\\\":[{\\\"original\\\":\\\"x\\\",\\\"improved\\\":\\\"y\\\"}],\\\"atsWarnings\\\":[]}";
        String resp = "{\"id\":\"msg_1\",\"type\":\"message\",\"role\":\"assistant\",\"model\":\"claude-opus-5-5\",\"stop_reason\":\"end_turn\",\"stop_sequence\":null,\"usage\":{\"input_tokens\":1,\"output_tokens\":1},\"content\":[{\"type\":\"text\",\"text\":\"" + review + "\"}]}";
        server.createContext("/v1/messages", ex -> {
            body.set(new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            beta.set(ex.getRequestHeaders().getFirst("anthropic-beta"));
            byte[] b = resp.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().add("content-type", "application/json");
            ex.sendResponseHeaders(200, b.length);
            ex.getResponseBody().write(b);
            ex.close();
        });
        server.start();
        try {
            var r = new AiResumeReviewer("test-key", "claude-opus-5-5", "http://127.0.0.1:" + server.getAddress().getPort());
            var out = r.review("resume text", "job text");
            assertThat(out.overallScore()).isEqualTo(72);
            assertThat(out.missingSkills()).containsExactly("kafka");
            assertThat(out.bulletRewrites()).hasSize(1);
            assertThat(body.get()).contains("\"output_config\"", "<job_description>", "\"fallbacks\":\"default\"");
            assertThat(beta.get()).isEqualTo("server-side-fallback-2026-07-01");
        } finally {
            server.stop(0);
        }
    }

    @Test
    @DisplayName("is disabled without an API key")
    void disabledWithoutKey() {
        assertThat(new AiResumeReviewer("", "claude-opus-5-5", "https://api.anthropic.com").isEnabled()).isFalse();
    }
}
