import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import client from '../api/client';

const RESUME_KEY = 'resumeText';

const scoreColor = (pct) =>
  pct >= 75 ? 'var(--offer)' : pct >= 50 ? 'var(--assessment)' : 'var(--rejected)';

function ScoreRing({ score, label }) {
  const deg = Math.max(0, Math.min(100, score)) * 3.6;
  return (
    <div style={{ textAlign: 'center' }}>
      <div className="score-ring" style={{ background: `conic-gradient(${scoreColor(score)} ${deg}deg, var(--border) 0deg)` }}>
        <div className="score-ring-inner">{score}</div>
      </div>
      <div className="stat-label" style={{ marginTop: 8 }}>{label}</div>
    </div>
  );
}

function Bar({ score, max }) {
  const pct = max ? Math.round((score / max) * 100) : 0;
  return (
    <div className="bar"><div className="bar-fill" style={{ width: `${pct}%`, background: scoreColor(pct) }} /></div>
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
      <Link to={appId ? `/applications/${appId}` : '/'} className="back">
        ← {appId ? 'Back to application' : 'All applications'}
      </Link>

      <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 6px' }}>Resume analyzer</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 26px' }}>
        Check how your resume reads to applicant tracking systems, and get AI feedback tailored to the job.
      </p>

      <form onSubmit={analyze} className="card">
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
              <strong>{extracting ? 'Reading PDF…' : fileName ? `✓ ${fileName}` : 'Upload resume PDF'}</strong>
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
            <input type="checkbox" checked={includeAi} onChange={(e) => setIncludeAi(e.target.checked)} style={{ width: 'auto' }} />
            Include AI review (takes ~30s)
          </label>
          <button type="submit" className="btn-primary" disabled={busy || extracting || !resume.trim()}>
            {busy ? 'Analyzing…' : 'Analyze resume'}
          </button>
        </div>
      </form>

      {error && <p className="error" style={{ marginTop: 16 }}>{error}</p>}

      {ats && (
        <>
          <div className="section-title">Results</div>
          <div className="card" style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'center' }}>
            <ScoreRing score={ats.score} label="ATS score" />
            {ai && <ScoreRing score={ai.overallScore} label="AI score" />}
            {ats.keywords && <ScoreRing score={ats.keywords.matchPercent} label="Keyword match" />}
            <div style={{ flex: 1, minWidth: 200, fontSize: 14, color: 'var(--text-muted)' }}>
              <div>{ats.wordCount} words</div>
              <div>Sections: {ats.sectionsFound.length ? ats.sectionsFound.join(', ') : 'none detected'}</div>
              {ai && <p style={{ color: 'var(--text)', marginBottom: 0 }}>{ai.summary}</p>}
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
                  <strong style={{ fontSize: 14 }}>Strengths</strong>
                  <List items={ai.strengths} />
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <strong style={{ fontSize: 14 }}>Improvements</strong>
                  <List items={ai.improvements} />
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <strong style={{ fontSize: 14 }}>Missing skills</strong>
                  <List items={ai.missingSkills} />
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <strong style={{ fontSize: 14 }}>ATS warnings</strong>
                  <List items={ai.atsWarnings} />
                </div>
              </div>

              {ai.bulletRewrites?.length > 0 && (
                <>
                  <div className="section-title">Suggested bullet rewrites</div>
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
        </>
      )}
    </div>
  );
}
