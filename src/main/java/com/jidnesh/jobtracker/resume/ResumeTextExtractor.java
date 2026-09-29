package com.jidnesh.jobtracker.resume;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Locale;

/**
 * Pulls plain text out of an uploaded resume so the ATS and AI checks can read it.
 * Text is what an ATS actually sees, so if extraction comes back empty the resume
 * would be just as unreadable to a real applicant tracking system.
 */
@Component
public class ResumeTextExtractor {

    static final int MAX_PAGES = 10;

    public String extract(String filename, byte[] bytes) {
        String name = filename == null ? "" : filename.toLowerCase(Locale.ROOT);
        if (name.endsWith(".txt") || name.endsWith(".md")) {
            return new String(bytes, java.nio.charset.StandardCharsets.UTF_8).strip();
        }
        if (!name.endsWith(".pdf") && !looksLikePdf(bytes)) {
            throw new IllegalArgumentException("Upload a PDF (or .txt) file.");
        }
        return extractPdf(bytes);
    }

    private String extractPdf(byte[] bytes) {
        try (PDDocument doc = Loader.loadPDF(bytes)) {
            if (doc.getNumberOfPages() > MAX_PAGES) {
                throw new IllegalArgumentException(
                    "That PDF has " + doc.getNumberOfPages() + " pages. A resume should be " + MAX_PAGES + " pages or fewer.");
            }
            PDFTextStripper stripper = new PDFTextStripper();
            stripper.setSortByPosition(true);
            String text = normalize(stripper.getText(doc));
            if (text.isBlank()) {
                throw new IllegalArgumentException(
                    "No text found in that PDF. It is probably a scanned image, which most ATS can't read either. "
                        + "Export your resume as a text-based PDF from Word or Google Docs.");
            }
            return text;
        } catch (InvalidPasswordException ex) {
            throw new IllegalArgumentException("That PDF is password-protected. Remove the password and try again.");
        } catch (IOException ex) {
            throw new IllegalArgumentException("Couldn't read that file as a PDF.");
        }
    }

    /** Tidies common PDF extraction artifacts: non-breaking spaces, trailing spaces, runs of blank lines. */
    static String normalize(String raw) {
        return raw.replace(' ', ' ')
            .replaceAll("[ \\t]+\\r?\\n", "\n")
            .replaceAll("\\n{3,}", "\n\n")
            .strip();
    }

    private static boolean looksLikePdf(byte[] bytes) {
        return bytes.length >= 5 && bytes[0] == '%' && bytes[1] == 'P' && bytes[2] == 'D' && bytes[3] == 'F';
    }
}
