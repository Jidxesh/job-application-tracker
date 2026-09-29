package com.jidnesh.jobtracker.resume;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Rule-based ATS compatibility check. Deterministic and free to run, so it works without an API key
 * and gives the same score for the same input. Scores are the sum of weighted categories, normalized
 * to 0-100; the keyword category only counts when a job description is supplied.
 */
@Component
public class AtsAnalyzer {

    static final int KEYWORD_LIMIT = 25;

    private static final Map<String, Pattern> SECTIONS = new LinkedHashMap<>();
    static {
        SECTIONS.put("Summary", Pattern.compile("^(professional |career )?(summary|profile|objective|about me)$"));
        SECTIONS.put("Experience", Pattern.compile(
            "^(professional |work |relevant )?(experience|employment( history)?|work history)$"));
        SECTIONS.put("Education", Pattern.compile("^(education|academic background|academics)$"));
        SECTIONS.put("Skills", Pattern.compile(
            "^(technical |core |key )?(skills|competencies|technologies|tech stack)( & tools| and tools)?$"));
        SECTIONS.put("Projects", Pattern.compile("^(personal |key |academic )?projects$"));
        SECTIONS.put("Certifications", Pattern.compile("^(certifications?|licenses( & certifications)?|awards)$"));
    }

    private static final Pattern EMAIL = Pattern.compile("[\\w.+-]+@[\\w-]+\\.[\\w.-]+");
    private static final Pattern PHONE = Pattern.compile("(\\+?\\d[\\d\\s().-]{7,}\\d)");
    private static final Pattern PROFILE_LINK = Pattern.compile(
        "(linkedin\\.com|github\\.com|gitlab\\.com|portfolio|behance\\.net|https?://)", Pattern.CASE_INSENSITIVE);
    private static final Pattern BULLET = Pattern.compile("^\\s*[-•*▪◦●·‣>]\\s+(.*)$");
    private static final Pattern METRIC = Pattern.compile("\\d|%|\\$|€|£|₹");
    private static final Pattern PRONOUN = Pattern.compile("\\b(i|me|my|mine|myself)\\b");
    private static final Pattern TOKEN = Pattern.compile("[a-z0-9][a-z0-9+#./-]*");
    // Emoji, icons and other symbols that PDF-to-text parsers often mangle.
    private static final Pattern ODD_SYMBOL = Pattern.compile("[\\p{So}\\p{Cn}\\x{1F000}-\\x{1FAFF}]");

    private static final Set<String> ACTION_VERBS = Set.copyOf(List.of(
        "achieved", "architected", "automated", "built", "championed", "collaborated", "created", "cut",
        "decreased", "delivered", "deployed", "designed", "developed", "drove", "enabled", "engineered",
        "established", "executed", "expanded", "generated", "grew", "guided", "implemented", "improved",
        "increased", "initiated", "integrated", "introduced", "launched", "led", "managed", "mentored",
        "migrated", "modernized", "negotiated", "optimized", "orchestrated", "organized", "owned",
        "pioneered", "planned", "presented", "produced", "reduced", "refactored", "resolved", "restructured",
        "revamped", "saved", "scaled", "shipped", "simplified", "spearheaded", "streamlined", "tested",
        "trained", "transformed", "tripled", "doubled", "wrote", "analyzed", "coordinated", "maintained",
        "researched", "authored", "accelerated", "secured", "debugged", "containerized"));

    private static final List<String> WEAK_OPENERS = List.of(
        "responsible for", "worked on", "helped", "assisted", "duties included", "tasked with", "involved in");

    /** Multi-word skills that should be matched as a phrase even if they appear only once in a posting. */
    private static final List<String> KNOWN_PHRASES = List.of(
        "spring boot", "machine learning", "deep learning", "data science", "data structures", "data analysis",
        "data engineering", "computer science", "computer vision", "natural language processing", "react native",
        "rest api", "restful api", "system design", "distributed systems", "unit testing",
        "test automation", "project management", "product management",
        "google cloud", "microsoft azure", "power bi", "ruby on rails", "large language models",
        "generative ai", "big data", "object oriented", "version control", "cloud computing", "problem solving",
        "stakeholder management", "customer success", "business analysis", "financial modeling", "user research",
        "ux design", "ui design", "a/b testing", "sql server", "event driven", "infrastructure as code");

    private static final Set<String> STOPWORDS = Set.copyOf(List.of(
        "a", "about", "above", "across", "after", "all", "also", "an", "and", "any", "are", "as", "at", "be",
        "been", "being", "both", "but", "by", "can", "could", "do", "does", "each", "either", "etc", "for",
        "from", "has", "have", "how", "if", "in", "into", "is", "it", "its", "may", "more", "most", "must",
        "not", "of", "on", "or", "other", "our", "out", "over", "per", "plus", "should", "so", "some",
        "such", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "those",
        "through", "to", "under", "up", "us", "use", "using", "via", "was", "we", "well", "were", "what",
        "when", "where", "which", "while", "who", "will", "with", "within", "would", "you", "your",
        // Job-posting filler that is never a meaningful ATS keyword on its own.
        "ability", "able", "apply", "benefits", "candidate", "candidates", "company", "strong", "excellent",
        "good", "great", "experience", "experienced", "years", "year", "work", "working", "role", "team",
        "teams", "join", "looking", "opportunity", "including", "include", "includes", "preferred",
        "required", "requirements", "responsibilities", "qualifications", "skills", "knowledge", "understanding",
        "familiarity", "familiar", "plus", "new", "help", "ensure", "across", "within", "based", "bonus",
        "equal", "employer", "salary", "position", "job", "day", "time", "full", "part", "remote", "hybrid",
        "office", "etc.", "e.g.", "i.e.", "one", "two", "three", "least", "minimum", "ideal", "ideally",
        "environment", "make", "build", "support", "like", "want", "need", "you'll", "we're", "who",
        "communication", "self", "highly", "fast", "paced", "passion", "passionate", "love", "every",
        "engineer", "engineers", "developer", "developers", "senior", "junior", "hiring", "members", "member",
        "looking", "seeking", "responsible", "will", "things", "various", "related", "relevant", "degree"));

    public ResumeDtos.AtsReport analyze(String resumeText, String jobDescription) {
        String resume = resumeText == null ? "" : resumeText;
        String lower = resume.toLowerCase(Locale.ROOT);
        List<String> lines = resume.lines().map(String::strip).filter(l -> !l.isEmpty()).toList();
        int wordCount = countWords(resume);

        List<ResumeDtos.Category> categories = new ArrayList<>();
        ResumeDtos.KeywordMatch keywords = null;

        if (jobDescription != null && !jobDescription.isBlank()) {
            keywords = matchKeywords(lower, jobDescription);
            categories.add(keywordCategory(keywords));
        }

        List<String> sectionsFound = detectSections(lines);
        categories.add(sectionCategory(sectionsFound));
        categories.add(contactCategory(resume));
        categories.add(impactCategory(lines));
        categories.add(lengthCategory(wordCount));
        categories.add(formattingCategory(resume, lower, lines));

        int earned = categories.stream().mapToInt(ResumeDtos.Category::score).sum();
        int max = categories.stream().mapToInt(ResumeDtos.Category::max).sum();
        int score = max == 0 ? 0 : Math.round(earned * 100f / max);

        return new ResumeDtos.AtsReport(score, wordCount, sectionsFound, keywords, categories);
    }

    // ---- Keywords (40) ----

    ResumeDtos.KeywordMatch matchKeywords(String resumeLower, String jobDescription) {
        List<String> keywords = extractKeywords(jobDescription);
        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        for (String kw : keywords) {
            (containsTerm(resumeLower, kw) ? matched : missing).add(kw);
        }
        int percent = keywords.isEmpty() ? 0 : Math.round(matched.size() * 100f / keywords.size());
        return new ResumeDtos.KeywordMatch(percent, matched, missing);
    }

    /** Most frequent meaningful terms in the job description: repeated two-word phrases first, then single words. */
    List<String> extractKeywords(String jobDescription) {
        List<String> tokens = new ArrayList<>();
        Matcher m = TOKEN.matcher(jobDescription.toLowerCase(Locale.ROOT));
        while (m.find()) {
            String t = m.group().replaceAll("[./-]+$", "");
            tokens.add(t);
        }

        Map<String, Integer> unigrams = new LinkedHashMap<>();
        Map<String, Integer> bigrams = new LinkedHashMap<>();
        for (int i = 0; i < tokens.size(); i++) {
            String t = tokens.get(i);
            if (!isKeywordToken(t)) continue;
            unigrams.merge(t, 1, Integer::sum);
            if (i + 1 < tokens.size() && isKeywordToken(tokens.get(i + 1))) {
                bigrams.merge(t + " " + tokens.get(i + 1), 1, Integer::sum);
            }
        }

        String jdLower = jobDescription.toLowerCase(Locale.ROOT);
        Set<String> result = new LinkedHashSet<>();
        KNOWN_PHRASES.stream()
            .filter(p -> containsTerm(jdLower, p))
            .forEach(result::add);
        // Words already covered by a known phrase ("spring", "boot") would double-count, so skip them.
        Set<String> phraseWords = new HashSet<>();
        result.forEach(p -> phraseWords.addAll(List.of(p.split(" "))));

        bigrams.entrySet().stream()
            .filter(e -> e.getValue() >= 2)
            .sorted((a, b) -> b.getValue() - a.getValue())
            .limit(8)
            .forEach(e -> result.add(e.getKey()));
        unigrams.entrySet().stream()
            .sorted((a, b) -> b.getValue() - a.getValue())
            .map(Map.Entry::getKey)
            .filter(w -> !phraseWords.contains(w))
            .forEach(w -> { if (result.size() < KEYWORD_LIMIT) result.add(w); });
        return new ArrayList<>(result);
    }

    private static boolean isKeywordToken(String t) {
        if (t.length() < 2 && !t.equals("c") && !t.equals("r")) return false;
        if (t.chars().allMatch(Character::isDigit)) return false;
        return !STOPWORDS.contains(t);
    }

    static boolean containsTerm(String haystackLower, String term) {
        if (termPattern(term).matcher(haystackLower).find()) return true;
        // Tolerate simple plurals in either direction ("api" vs "apis").
        if (term.endsWith("s") && term.length() > 3) {
            return termPattern(term.substring(0, term.length() - 1)).matcher(haystackLower).find();
        }
        return termPattern(term + "s").matcher(haystackLower).find();
    }

    private static Pattern termPattern(String term) {
        String body = Pattern.quote(term).replace(" ", "\\E[\\s-]+\\Q");
        return Pattern.compile("(?<![a-z0-9+#])" + body + "(?![a-z0-9+#])");
    }

    private ResumeDtos.Category keywordCategory(ResumeDtos.KeywordMatch k) {
        List<String> feedback = new ArrayList<>();
        int total = k.matched().size() + k.missing().size();
        if (total == 0) {
            feedback.add("Couldn't find distinctive keywords in the job description.");
            return new ResumeDtos.Category("Keyword match", 0, 0, feedback);
        }
        int score = Math.round(40f * k.matched().size() / total);
        feedback.add(k.matched().size() + " of " + total + " key terms from the job description appear in your resume.");
        if (!k.missing().isEmpty()) {
            feedback.add("Work in the missing terms where they're true for you — ATS ranking is largely literal matching.");
        }
        if (k.matchPercent() < 60) {
            feedback.add("Aim for at least 60–70% keyword coverage for roles you really want.");
        }
        return new ResumeDtos.Category("Keyword match", score, 40, feedback);
    }

    // ---- Sections (20) ----

    List<String> detectSections(List<String> lines) {
        List<String> found = new ArrayList<>();
        for (String line : lines) {
            if (line.length() > 40) continue;
            String heading = line.toLowerCase(Locale.ROOT).replaceAll("[^a-z& ]", " ").replaceAll("\\s+", " ").strip();
            SECTIONS.forEach((name, pattern) -> {
                if (!found.contains(name) && pattern.matcher(heading).matches()) found.add(name);
            });
        }
        return found;
    }

    private ResumeDtos.Category sectionCategory(List<String> found) {
        Map<String, Integer> points = Map.of(
            "Experience", 5, "Education", 5, "Skills", 5, "Summary", 3, "Projects", 1, "Certifications", 1);
        int score = found.stream().mapToInt(s -> points.getOrDefault(s, 0)).sum();
        List<String> feedback = new ArrayList<>();
        for (String required : List.of("Experience", "Education", "Skills")) {
            if (!found.contains(required)) {
                feedback.add("No \"" + required + "\" heading found. ATS parsers look for standard section names.");
            }
        }
        if (!found.contains("Summary")) {
            feedback.add("Consider a 2–3 line Summary at the top tailored to the role.");
        }
        if (feedback.isEmpty()) feedback.add("All the standard sections are present and clearly labelled.");
        return new ResumeDtos.Category("Standard sections", Math.min(score, 20), 20, feedback);
    }

    // ---- Contact (10) ----

    private ResumeDtos.Category contactCategory(String resume) {
        int score = 0;
        List<String> feedback = new ArrayList<>();
        if (EMAIL.matcher(resume).find()) score += 4; else feedback.add("Add an email address.");
        if (PHONE.matcher(resume).find()) score += 3; else feedback.add("Add a phone number.");
        if (PROFILE_LINK.matcher(resume).find()) score += 3; else feedback.add("Add a LinkedIn, GitHub or portfolio link.");
        if (feedback.isEmpty()) feedback.add("Email, phone and a profile link are all present.");
        else feedback.add("Keep contact details in the main body, not a header/footer — many ATS skip those.");
        return new ResumeDtos.Category("Contact information", score, 10, feedback);
    }

    // ---- Impact (15) ----

    private ResumeDtos.Category impactCategory(List<String> lines) {
        List<String> bullets = new ArrayList<>();
        for (String line : lines) {
            Matcher m = BULLET.matcher(line);
            if (m.matches()) bullets.add(m.group(1).strip());
        }
        List<String> feedback = new ArrayList<>();
        if (bullets.isEmpty()) {
            feedback.add("No bullet points found. Describe each role with 3–6 bullets starting with \"-\" or \"•\".");
            return new ResumeDtos.Category("Impact & achievements", 0, 15, feedback);
        }

        int quantified = 0;
        int actionLed = 0;
        List<String> weak = new ArrayList<>();
        for (String b : bullets) {
            String lower = b.toLowerCase(Locale.ROOT);
            if (METRIC.matcher(b).find()) quantified++;
            String first = lower.split("[\\s,]+", 2)[0];
            if (ACTION_VERBS.contains(first)) actionLed++;
            if (WEAK_OPENERS.stream().anyMatch(lower::startsWith) && weak.size() < 3) weak.add(b);
        }
        float qRatio = (float) quantified / bullets.size();
        float aRatio = (float) actionLed / bullets.size();
        int score = Math.round(8 * Math.min(1f, qRatio / 0.5f)) + Math.round(7 * Math.min(1f, aRatio / 0.6f));

        feedback.add(quantified + " of " + bullets.size() + " bullets include a number or metric.");
        if (qRatio < 0.5f) feedback.add("Quantify more results — %, $, time saved, users, scale.");
        feedback.add(actionLed + " of " + bullets.size() + " bullets start with a strong action verb.");
        if (aRatio < 0.6f) feedback.add("Lead bullets with verbs like Built, Led, Reduced, Shipped, Automated.");
        for (String w : weak) feedback.add("Weak phrasing: \"" + truncate(w, 80) + "\"");
        return new ResumeDtos.Category("Impact & achievements", score, 15, feedback);
    }

    // ---- Length (5) ----

    private ResumeDtos.Category lengthCategory(int words) {
        int score;
        String note;
        if (words >= 400 && words <= 1000) {
            score = 5;
            note = words + " words — a good length (roughly 1–2 pages).";
        } else if (words >= 250 && words < 400) {
            score = 3;
            note = words + " words — a little thin. Add detail on impact and scope.";
        } else if (words > 1000 && words <= 1400) {
            score = 3;
            note = words + " words — on the long side. Trim older or less relevant roles.";
        } else {
            score = words < 250 ? 1 : 0;
            note = words + " words — " + (words < 250 ? "too short to rank well." : "too long; aim for under 1000.");
        }
        return new ResumeDtos.Category("Length", score, 5, List.of(note));
    }

    // ---- Formatting (10) ----

    private ResumeDtos.Category formattingCategory(String resume, String lower, List<String> lines) {
        int score = 10;
        List<String> feedback = new ArrayList<>();

        long pronouns = PRONOUN.matcher(lower).results().count();
        if (pronouns > 2) {
            score -= 3;
            feedback.add("Found " + pronouns + " first-person pronouns (I, me, my). Drop them — write \"Built X\", not \"I built X\".");
        }
        long tableMarks = resume.chars().filter(c -> c == '|' || c == '\t').count();
        if (tableMarks > 6) {
            score -= 3;
            feedback.add("Looks like tables or multi-column layout. Many ATS read these out of order; use a single column.");
        }
        long symbols = ODD_SYMBOL.matcher(resume).results().count();
        if (symbols > 0) {
            score -= 2;
            feedback.add("Contains " + symbols + " icon/emoji characters. Replace them with plain text labels.");
        }
        long longLines = lines.stream().filter(l -> countWords(l) > 40).count();
        if (longLines > 0) {
            score -= 2;
            feedback.add(longLines + " line(s) run over 40 words. Break dense paragraphs into short bullets.");
        }
        if (feedback.isEmpty()) feedback.add("Clean, plain-text friendly formatting.");
        return new ResumeDtos.Category("ATS-friendly formatting", Math.max(score, 0), 10, feedback);
    }

    private static int countWords(String s) {
        String t = s.strip();
        return t.isEmpty() ? 0 : t.split("\\s+").length;
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }
}
