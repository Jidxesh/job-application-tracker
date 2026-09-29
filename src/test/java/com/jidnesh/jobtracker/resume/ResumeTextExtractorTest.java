package com.jidnesh.jobtracker.resume;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ResumeTextExtractorTest {

    ResumeTextExtractor extractor = new ResumeTextExtractor();

    @Test
    @DisplayName("extracts text from a text-based PDF")
    void extractsPdfText() throws IOException {
        byte[] pdf = pdf(1, "Jane Doe", "Experience", "- Built a payments API");

        String text = extractor.extract("resume.pdf", pdf);

        assertThat(text).contains("Jane Doe", "Experience", "- Built a payments API");
    }

    @Test
    @DisplayName("rejects a PDF with no extractable text, like a scanned image")
    void rejectsImageOnlyPdf() throws IOException {
        byte[] pdf = pdf(1);

        assertThatThrownBy(() -> extractor.extract("scan.pdf", pdf))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("No text found");
    }

    @Test
    @DisplayName("rejects overly long PDFs, non-PDF files and corrupt PDFs")
    void rejectsBadInput() throws IOException {
        byte[] longPdf = pdf(ResumeTextExtractor.MAX_PAGES + 1, "x");
        assertThatThrownBy(() -> extractor.extract("long.pdf", longPdf)).hasMessageContaining("pages");
        assertThatThrownBy(() -> extractor.extract("resume.docx", new byte[] {1, 2, 3})).hasMessageContaining("PDF");
        assertThatThrownBy(() -> extractor.extract("broken.pdf", "not a pdf".getBytes())).hasMessageContaining("Couldn't read");
    }

    @Test
    @DisplayName("passes plain text files through")
    void plainText() {
        assertThat(extractor.extract("resume.txt", "  hello\n".getBytes(StandardCharsets.UTF_8))).isEqualTo("hello");
    }

    private static byte[] pdf(int pages, String... lines) throws IOException {
        try (PDDocument doc = new PDDocument(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            for (int p = 0; p < pages; p++) {
                PDPage page = new PDPage();
                doc.addPage(page);
                if (lines.length == 0) continue;
                try (PDPageContentStream cs = new PDPageContentStream(doc, page)) {
                    cs.beginText();
                    cs.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                    cs.newLineAtOffset(72, 720);
                    for (String line : lines) {
                        cs.showText(line);
                        cs.newLineAtOffset(0, -16);
                    }
                    cs.endText();
                }
            }
            doc.save(out);
            return out.toByteArray();
        }
    }
}
