import { useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import client from '../api/client';

const RESUME_KEY = 'resumeText';

const scoreColor = (pct) =>
  pct >= 75 ? 'var(--offer)' : pct >= 50 ? 'var(--assessment)' : 'var(--rejected)';

const RING_STOPS = {
  good: ['#10b981', '#22d3ee'],
  ok: ['#f59e0b', '#f97316'],
  low: ['#f43f5e', '#a855f7'],
};
const band = (pct) => (pct >= 75 ? 'good' : pct >= 50 ? 'ok' : 'low');
const GRADE = { good: 'Strong', ok: 'Needs polish', low: 'Needs work' };

const STEPS_ATS = ['Parsing sections', 'Matching keywords', 'Checking formatting'];
const STEPS_AI = [...STEPS_ATS, 'Asking Claude for a recruiter review', 'Drafting bullet rewrites', 'Almost there'];

// Animates a number from 0 up to `target`; jumps straight there if the user prefers reduced motion.
function useCountUp(target, duration = 1100) {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduced) return;
    let frame;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduced]);
  return reduced ? target : value;
}

function ScoreRing({ score, label }) {
  const id = useId();
  const value = useCountUp(Math.max(0, Math.min(100, score)));
  const b = band(score);
  const r = 46;
  const circumference = 2 * Math.PI * r;
  return (
    <div>
      <div className="score-ring">
        <svg width="108" height="108" viewBox="0 0 108 108">
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={RING_STOPS[b][0]} />
              <stop offset="100%" stopColor={RING_STOPS[b][1]} />
            </linearGradient>
          </defs>
          <circle cx="54" cy="54" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
          <circle cx="54" cy="54" r={r} fill="none" stroke={`url(#${id})`} strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circumference} strokeDashoffset={circumference * (1 - value / 100)}
                  style={{ filter: `drop-shadow(0 0 6px ${RING_STOPS[b][0]}88)` }} />
        </svg>
        <div className="score-ring-value">{value}</div>
      </div>
      <div className="score-caption">
        <div className="stat-label">{label}</div>
        <div className="score-grade" style={{ color: RING_STOPS[b][0] }}>{GRADE[b]}</div>
      </div>
    </div>
  );
}

// Cycles through progress messages while the request is in flight.
function Analyzing({ withAi }) {
  const steps = withAi ? STEPS_AI : STEPS_ATS;
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), withAi ? 5000 : 350);
    return () => clearInterval(t);
  }, [steps.length, withAi]);
  return (
    <div className="card card-glow analyzing fade-in">
      <div className="spinner" />
      <div style={{ flex: 1 }}>
        <strong>{steps[i]}…</strong>
        <div className="cell-muted" style={{ fontSize: 13 }}>
          {withAi ? 'The AI review usually takes 20–40 seconds.' : 'This only takes a moment.'}
        </div>
        <div className="progress"><div className="progress-fill" style={{ width: `${((i + 1) / steps.length) * 92}%` }} /></div>
      </div>
    </div>
  );
}

function Bar({ score, max }) {
  const pct = max ? Math.round((score / max) * 100) : 0;
  return (
    <div className="bar"><div className="bar-fill" style={{ width: `${pct}%`, background: scoreColor(pct), color: scoreColor(pct) }} /></div>
  );
}

function List({ items }) {
  if (!items?.length) return <p className="cell-muted" style={{ margin: 0, fontSize: 14 }}>None.</p>;
  return <ul className="plain-list">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
}

export default function ResumeAnalyzer() {
  const [params] = useSearchParams();
  const appId = params.get('app');

  const [resume, setResume] = useState(() => {
    try { return localStorage.getItem(RESUME_KEY) ?? ''; } catch { return ''; }
  });
  const [job, setJob] = useState('');
  const [includeAi, setIncludeAi] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const resultsRef = useRef(null);

  // Bring fresh results into view once an analysis finishes.
  useEffect(() => {
    if (result) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  // Coming from an application: prefill the job description from its role and notes.
  useEffect(() => {
    if (!appId) return;
    client.get(`/api/applications/${appId}`)
      .then(({ data }) => setJob((prev) => prev || [`${data.roleTitle} at ${data.company}`, data.notes].filter(Boolean).join('\n\n')))
      .catch(() => {});
  }, [appId]);

  useEffect(() => {
    try { localStorage.setItem(RESUME_KEY, resume); } catch { /* storage unavailable */ }
  }, [resume]);

  const loadFile = async (file) => {
    if (!file) return;
    setError(null);
    if (/\.(txt|md)$/i.test(file.name)) {
      setResume(await file.text());
      setFileName(file.name);
      return;
    }
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      setError('Upload your resume as a PDF (or .txt).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('That PDF is over 5 MB. Export a smaller copy and try again.');
      return;
    }
    setExtracting(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await client.post('/api/resume/extract', body);
      setResume(data.text);
      setFileName(file.name);
    } catch (err) {
      setError(err.response?.status === 404
        ? 'PDF upload isn\'t available on the server yet. Try again after the backend finishes deploying.'
        : err.response?.data?.error ?? 'Could not read that PDF');
    } finally {
      setExtracting(false);
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    loadFile(e.dataTransfer.files?.[0]);
  };

  const analyze = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { data } = await client.post('/api/resume/analyze', {
        resumeText: resume, jobDescription: job || null, includeAi,
      });
      setResult(data);
    } catch (err) {
      const fields = err.response?.data?.fields;
      setError(fields ? Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join(', ')
        : err.response?.data?.error ?? 'Could not analyze resume');
    } finally {
      setBusy(false);
    }
  };

  const ats = result?.ats;
  const ai = result?.ai;

  return (
    <div className="page">
      {appId && <Link to={`/applications/${appId}`} className="back">← Back to application</Link>}

      <div className="page-head">
        <h1>Resume <span className="gradient-text">analyzer</span></h1>
        <p>See how your resume reads to applicant tracking systems, and get AI feedback tailored to the job.</p>
      </div>

      <form onSubmit={analyze} className="card card-glow">
        <div className="resume-inputs">
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Resume *</label>
            <label
              className={`dropzone${dragging ? ' dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input type="file" accept=".pdf,application/pdf,.txt,.md,text/plain"
                     onChange={(e) => { loadFile(e.target.files?.[0]); e.target.value = ''; }}
                     style={{ display: 'none' }} />
              <span className="dropzone-icon" aria-hidden="true">{extracting ? '⏳' : fileName ? '✅' : '📄'}</span>
              <strong>{extracting ? 'Reading PDF…' : fileName ?? 'Upload resume PDF'}</strong>
              <span>{fileName ? 'Click to upload a different file' : 'Click or drag & drop · max 5 MB'}</span>
            </label>
            <textarea value={resume} onChange={(e) => setResume(e.target.value)} required rows={11}
                      placeholder="…or paste your resume text here" />
            {fileName && (
              <div className="cell-muted" style={{ fontSize: 12, marginTop: 6 }}>
                This is the text an ATS will see. If parts are missing or jumbled, your PDF layout may confuse real ATS too.
              </div>
            )}
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Job description (recommended)</label>
            <textarea value={job} onChange={(e) => setJob(e.target.value)} rows={16}
                      placeholder="Paste the job posting to get a keyword match score…" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 18, flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-muted)' }}>
            <input type="checkbox" checked={includeAi} onChange={(e) => setIncludeAi(e.target.checked)} />
            ✨ Include AI review <span style={{ opacity: 0.7 }}>(~30s)</span>
          </label>
          <button type="submit" className="btn-primary" disabled={busy || extracting || !resume.trim()}>
            {busy ? 'Analyzing…' : 'Analyze resume →'}
          </button>
        </div>
      </form>

      {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}

      {busy && <Analyzing withAi={includeAi} />}

      {ats && !busy && (
        <div ref={resultsRef} className="fade-in" style={{ scrollMarginTop: 80 }}>
          <div className="section-title">Results</div>
          <div className="card card-glow results-hero">
            <div className="score-rings">
              <ScoreRing score={ats.score} label="ATS score" />
              {ai && <ScoreRing score={ai.overallScore} label="AI score" />}
              {ats.keywords && <ScoreRing score={ats.keywords.matchPercent} label="Keyword match" />}
            </div>
            <div style={{ flex: 1, minWidth: 220, fontSize: 14, color: 'var(--text-muted)' }}>
              <div className="chips" style={{ marginTop: 0 }}>
                <span className="chip">📝 {ats.wordCount} words</span>
                {ats.sectionsFound.map((sec) => <span key={sec} className="chip">✓ {sec}</span>)}
                {!ats.sectionsFound.length && <span className="chip chip-missing">No sections detected</span>}
              </div>
              {ai && <p style={{ color: 'var(--text)', marginBottom: 0, lineHeight: 1.6 }}>{ai.summary}</p>}
            </div>
          </div>

          {ats.keywords && (
            <>
              <div className="section-title">Keywords from the job description</div>
              <div className="card">
                <div className="field-label">Missing ({ats.keywords.missing.length})</div>
                <div className="chips" style={{ marginTop: 0, marginBottom: 18 }}>
                  {ats.keywords.missing.map((k) => <span key={k} className="chip chip-missing">{k}</span>)}
                  {!ats.keywords.missing.length && <span className="cell-muted">Nothing missing 🎉</span>}
                </div>
                <div className="field-label">Found ({ats.keywords.matched.length})</div>
                <div className="chips" style={{ marginTop: 0 }}>
                  {ats.keywords.matched.map((k) => <span key={k} className="chip chip-found">{k}</span>)}
                </div>
              </div>
            </>
          )}

          <div className="section-title">ATS checks</div>
          <div className="check-grid">
            {ats.categories.filter((c) => c.max > 0).map((c) => (
              <div className="card" key={c.name} style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ fontSize: 14 }}>{c.name}</strong>
                  <span className="cell-muted" style={{ fontSize: 13 }}>{c.score}/{c.max}</span>
                </div>
                <Bar score={c.score} max={c.max} />
                <List items={c.feedback} />
              </div>
            ))}
          </div>

          {result.aiError && <p className="error" style={{ marginTop: 24 }}>{result.aiError}</p>}

          {ai && (
            <>
              <div className="section-title">AI review</div>
              <div className="check-grid">
                <div className="card" style={{ padding: 20 }}>
                  <strong style={{ fontSize: 14 }}>💪 Strengths</strong>
                  <List items={ai.strengths} />
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <strong style={{ fontSize: 14 }}>🛠️ Improvements</strong>
                  <List items={ai.improvements} />
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <strong style={{ fontSize: 14 }}>🧩 Missing skills</strong>
                  <List items={ai.missingSkills} />
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <strong style={{ fontSize: 14 }}>⚠️ ATS warnings</strong>
                  <List items={ai.atsWarnings} />
                </div>
              </div>

              {ai.bulletRewrites?.length > 0 && (
                <>
                  <div className="section-title">✨ Suggested bullet rewrites</div>
                  <div className="card" style={{ padding: 0 }}>
                    {ai.bulletRewrites.map((b, i) => (
                      <div key={i} className="rewrite">
                        <div className="rewrite-before">{b.original}</div>
                        <div className="rewrite-after">{b.improved}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
