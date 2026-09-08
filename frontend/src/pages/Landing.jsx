import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const els = ref.current?.querySelectorAll('.reveal');
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add('in')),
      { threshold: 0.18, rootMargin: '0px 0px -80px 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return ref;
}

const Badge = ({ s, children }) => <span className={`badge badge-${s}`}>{children}</span>;

export default function Landing() {
  const root = useReveal();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing" ref={root}>
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <span className="landing-logo">Job Tracker</span>
        <Link to="/login"><button>Sign in</button></Link>
      </nav>

      <header className="hero">
        <div className="hero-glow" />
        <h1 className="rise rise-1">Every application has a story.</h1>
        <p className="hero-sub rise rise-2">
          Most trackers overwrite the status and lose it. This one keeps the
          whole progression — every stage, every date, every note.
        </p>
        <div className="hero-cta rise rise-3">
          <Link to="/login"><button className="btn-primary">Try the demo</button></Link>
          <a href="https://github.com/Jidxesh/job-application-tracker" target="_blank" rel="noreferrer">
            <button>View source</button>
          </a>
        </div>
        <span className="scroll-hint">Scroll</span>
      </header>

      <section className="band">
        <div className="reveal">
          <div className="eyebrow">The problem</div>
          <h2>A status field only tells you where something ended.</h2>
        </div>
        <p className="lead reveal reveal-d1">
          Set an application to “Rejected” in a spreadsheet and you've erased the
          fact that it got to the final round. Two weeks later you can't remember
          which companies moved fast, where you keep stalling, or what you wrote
          after that interview.
        </p>
      </section>

      <section className="band">
        <div className="reveal">
          <div className="eyebrow">The model</div>
          <h2>Status changes are events, not edits.</h2>
          <p className="lead">
            Each move appends an immutable record. Nothing is overwritten, so the
            timeline is the truth and the current status is just the latest entry.
          </p>
          <div className="pipeline">
            <span className="pipe-step"><Badge s="applied">Applied</Badge></span>
            <span className="pipe-step pipeline-arrow">→</span>
            <span className="pipe-step"><Badge s="online_assessment">Online assessment</Badge></span>
            <span className="pipe-step pipeline-arrow">→</span>
            <span className="pipe-step"><Badge s="interview">Interview</Badge></span>
            <span className="pipe-step pipeline-arrow">→</span>
            <span className="pipe-step"><Badge s="offer">Offer</Badge></span>
          </div>
        </div>
      </section>

      <section className="band sticky-wrap">
        <div className="split">
          <div className="sticky-side reveal">
            <div className="eyebrow">Under the hood</div>
            <h2>Built like something that has to hold up.</h2>
          </div>
          <div className="reveal reveal-d1">
            <div className="feature-item">
              <h3>Event-sourced history</h3>
              <p>
                The event log is the source of truth. The current status is a
                denormalized read optimization, written in the same transaction so
                the two can never disagree.
              </p>
            </div>
            <div className="feature-item">
              <h3>Validated transitions</h3>
              <p>
                Moves are checked against a transition table, not scattered
                conditionals. Interview → Applied is rejected with a 409. Rejected
                and Withdrawn are terminal.
              </p>
            </div>
            <div className="feature-item">
              <h3>Ownership in the query</h3>
              <p>
                Every repository method takes a user id. There is no bare findById
                on an application, so one user's request for another's data returns
                404 rather than leaking that it exists.
              </p>
            </div>
            <div className="feature-item">
              <h3>Stateless auth</h3>
              <p>
                JWTs signed with HMAC-SHA and no server session, so the API survives
                container restarts and scales sideways.
              </p>
            </div>
            <div className="chips">
              {['Java 21', 'Spring Boot 4', 'Spring Security 7', 'PostgreSQL', 'React', 'Vite', 'Docker'].map((t) => (
                <span className="chip" key={t}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="closer">
        <div className="reveal">
          <h2 style={{ margin: '0 auto 20px', maxWidth: '20ch' }}>See it with real data.</h2>
          <p className="lead" style={{ margin: '0 auto 30px' }}>
            The demo account is pre-loaded with applications across every stage.
          </p>
          <Link to="/login"><button className="btn-primary" style={{ padding: '13px 30px', fontSize: 15 }}>Open the demo</button></Link>
        </div>
      </section>

      <footer className="landing-footer">
        Built by <a href="https://github.com/Jidxesh" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Jidnesh Chavan</a>
      </footer>
    </div>
  );
}
