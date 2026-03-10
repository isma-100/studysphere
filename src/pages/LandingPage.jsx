// src/pages/LandingPage.jsx
import './LandingPage.css'

const STATS = [
  { n: '2,400+', l: 'Active learners' },
  { n: '340',    l: 'Study groups' },
  { n: '80+',    l: 'Subjects' },
  { n: '4.9★',   l: 'Avg rating' },
]

const STEPS = [
  { num: '01', icon: '✍️', title: 'Create your profile',    desc: 'Add your subjects, availability, and learning goals in under 2 minutes.' },
  { num: '02', icon: '🔍', title: 'Find your group',         desc: 'Browse or search groups by subject, level, and schedule. Join with one click.' },
  { num: '03', icon: '🚀', title: 'Start learning together', desc: 'Chat, schedule sessions, share resources, and track your goals — all in one place.' },
]

const SUBJECTS = [
  { label: '🐍 Python',           s: 's1' }, { label: '📐 Calculus',         s: 's3' },
  { label: '🇪🇸 Spanish',         s: 's4' }, { label: '🎨 UI/UX Design',     s: 's2' },
  { label: '🧬 Biology',          s: 's6' }, { label: '💼 Business',         s: 's1' },
  { label: '⚛️ Physics',          s: 's3' }, { label: '🇫🇷 French',          s: 's4' },
  { label: '📊 Data Science',     s: 's2' }, { label: '✍️ Creative Writing', s: 's5' },
  { label: '🎵 Music Theory',     s: 's6' }, { label: '📜 History',          s: 's1' },
  { label: '🧪 Chemistry',        s: 's3' }, { label: '💻 Web Dev',          s: 's2' },
  { label: '🇩🇪 German',          s: 's4' }, { label: '📷 Photography',      s: 's5' },
  { label: '📈 Economics',        s: 's6' }, { label: '🧠 Psychology',       s: 's1' },
  { label: '+ many more',         s: 's0' },
]

const TESTIMONIALS = [
  { stars: '★★★★★', quote: '"I was struggling with calculus alone for months. Found a group on StudySphere and passed my exam two weeks later. Night and day difference."', name: 'Layla Hassan', role: 'University student, Cairo',        initials: 'L', bg: '#00b5aa' },
  { stars: '★★★★★', quote: '"The scheduling feature is a game changer. Our Python group meets every Tuesday and it auto-syncs to my Google Calendar. So smooth."',         name: 'Marcus Chen',  role: 'Self-taught developer, Singapore', initials: 'M', bg: '#4a7cf7' },
  { stars: '★★★★★', quote: '"I\'ve tried so many learning apps. StudySphere is the only one where I actually made real friends. We study Spanish together every weekend."', name: 'Priya Nair',   role: 'Language learner, London',         initials: 'P', bg: '#8b5cf6' },
]

const PROOF_AVS = [
  { i: 'A', bg: '#4a7cf7' }, { i: 'M', bg: '#00b5aa' },
  { i: 'P', bg: '#8b5cf6' }, { i: 'R', bg: '#f59e0b' }, { i: 'K', bg: '#f43f5e' },
]

export default function LandingPage() {
  return (
    <div className="lp-root">

      {/* NAV */}
      <nav className="lp-nav">
        <a className="nav-logo" href="#">
          <div className="logo-icon">🌐</div>
          <div className="logo-wordmark">Study<em>Sphere</em></div>
        </a>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#subjects">Subjects</a></li>
        </ul>
        <div className="nav-actions">
          <button className="btn-nav-ghost">Log in</button>
          <button className="btn-nav-cta">Get started free</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-glow" />
        <div className="hero-dots" />
        <div className="hero-shape hs1" />
        <div className="hero-shape hs2" />
        <div className="hero-shape hs3" />
        <div className="hero-line" />
        <div className="hero-badge a1">
          <span className="badge-ping" />
          Now open to everyone — students &amp; self-learners
        </div>
        <h1 className="hero-title a2">
          The smarter way<br />
          to <span className="shimmer-text">learn together</span>
        </h1>
        <p className="hero-sub a3">
          Find study groups that match your subjects, pace, and schedule.
          Real people. Real accountability. Real progress.
        </p>
        <div className="hero-btns a4">
          <button className="btn-hero-main">
            Find your study group <span className="btn-arrow">→</span>
          </button>
          <button className="btn-hero-ghost">▷ &nbsp;See how it works</button>
        </div>
        <div className="hero-proof a5">
          <div className="proof-avs">
            {PROOF_AVS.map((av) => (
              <div key={av.i} className="proof-av" style={{ background: av.bg }}>{av.i}</div>
            ))}
          </div>
          <div className="proof-text"><strong>2,400+</strong> learners studying together</div>
          <div className="proof-sep" />
          <div className="proof-stars">★★★★★</div>
          <div className="proof-text"><strong>4.9</strong> rated</div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-strip">
        <div className="stats-inner">
          {STATS.map((s) => (
            <div key={s.l} className="stat-col">
              <div className="stat-n">{s.n}</div>
              <div className="stat-l">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="features-inner">
          <div className="sec-header">
            <div className="sec-tag">Features</div>
            <h2 className="sec-title">Built for focused<br />learners</h2>
            <p className="sec-sub">More than a chat room. A complete platform for serious studying.</p>
          </div>
          <div className="feat-grid">

            <div className="fc blue c5">
              <div className="fi blue">🔍</div>
              <div className="ft">Smart Group Matching</div>
              <div className="fd">Filter by subject, level, and availability. Find your perfect study squad — not just any random group.</div>
              <div className="fc-mock">
                <div className="mock-topbar">
                  <div className="mtb-dot" style={{ background: '#ff5f57' }} />
                  <div className="mtb-dot" style={{ background: '#ffbd2e' }} />
                  <div className="mtb-dot" style={{ background: '#28ca41' }} />
                </div>
                <div className="mock-content">
                  <div className="ml" style={{ width: '75%', background: '#dbe4ff' }} />
                  <div style={{ display: 'flex', gap: 5, margin: '8px 0' }}>
                    <span className="mock-pill" style={{ background: '#eff4ff', color: '#4a7cf7' }}>Python</span>
                    <span className="mock-pill" style={{ background: '#f5f0ff', color: '#8b5cf6' }}>Beginner</span>
                    <span className="mock-pill" style={{ background: '#e6fffe', color: '#00b5aa' }}>Online</span>
                  </div>
                  <div className="ml" style={{ width: '50%', background: '#dbe4ff' }} />
                </div>
              </div>
            </div>

            <div className="fc teal c4">
              <div className="fi teal">💬</div>
              <div className="ft">Real-time Chat</div>
              <div className="fd">Every group has its own live room. Share resources, ask questions, stay in sync.</div>
              <div className="fc-mock" style={{ marginTop: '1.25rem' }}>
                <div className="mock-content chat-mock-body">
                  <div className="chat-msg-left">
                    <div className="chat-av" style={{ background: '#00b5aa' }} />
                    <div className="chat-bub chat-bub-left">Did you solve Q3? 🤔</div>
                  </div>
                  <div className="chat-msg-right">
                    <div className="chat-av" style={{ background: '#4a7cf7' }} />
                    <div className="chat-bub chat-bub-right">Yes! Check this →</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="fc violet c3">
              <div className="fi violet">🎯</div>
              <div className="ft">Goal Tracking</div>
              <div className="fd">Set targets and watch your progress grow session by session.</div>
              <div className="fc-stat" style={{ color: '#8b5cf6' }}>87<span style={{ fontSize: '1.4rem', color: '#8892aa' }}>%</span></div>
              <div style={{ fontSize: '0.75rem', color: '#8892aa', fontWeight: 500 }}>avg goal completion</div>
            </div>

            <div className="fc amber c7">
              <div className="fi amber">📅</div>
              <div className="ft">Session Scheduling + Calendar Sync</div>
              <div className="fd">Plan study sessions inside your group, set reminders, and sync everything directly to Google Calendar. Never miss a session again.</div>
            </div>

            <div className="fc rose c5">
              <div className="fi rose">👤</div>
              <div className="ft">Rich Learning Profiles</div>
              <div className="fd">Showcase your subjects, set your weekly availability, and track goals — your profile is your learning identity.</div>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" id="how">
        <div className="how-noise" />
        <div className="how-glow-bg" />
        <div className="how-inner">
          <div className="sec-header">
            <div className="sec-tag teal-tag">Simple process</div>
            <h2 className="sec-title white-title">Up and studying<br />in minutes</h2>
            <p className="sec-sub dim-sub">No complicated onboarding. Just sign up, find your people, and start.</p>
          </div>
          <div className="steps-row">
            {STEPS.map((s, i) => (
              <div key={s.num} style={{ display: 'contents' }}>
                <div className="step-box">
                  <div className="step-num-tag">Step {s.num}</div>
                  <div className="step-ico">{s.icon}</div>
                  <div className="step-title">{s.title}</div>
                  <div className="step-desc">{s.desc}</div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="step-conn"><div className="conn-line" /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SUBJECTS */}
      <section className="subjects" id="subjects">
        <div className="subjects-inner">
          <div className="sec-tag">80+ Subjects</div>
          <h2 className="sec-title">Whatever you're learning,<br />there's a group for it</h2>
          <div className="subj-grid">
            {SUBJECTS.map((s) => (
              <div key={s.label} className={`sp ${s.s}`}>{s.label}</div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="test-inner">
          <div className="sec-tag">Testimonials</div>
          <h2 className="sec-title">Learners love<br />StudySphere</h2>
          <div className="test-grid">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="tc">
                <div className="tc-stars">{t.stars}</div>
                <div className="tc-quote">{t.quote}</div>
                <div className="tc-footer-row">
                  <div className="tc-av" style={{ background: t.bg }}>{t.initials}</div>
                  <div>
                    <div className="tc-name">{t.name}</div>
                    <div className="tc-role">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-section">
        <div className="cta-box">
          <div className="cta-bg-glow" />
          <div className="cta-dots" />
          <div className="cta-badge">✦ Free forever to start</div>
          <h2 className="cta-title">Ready to learn<br /><em>better together?</em></h2>
          <p className="cta-sub">Join 2,400+ learners already making real progress on StudySphere.<br />No credit card required.</p>
          <button className="btn-cta-main">Join StudySphere free 🚀</button>
          <div className="cta-note">Takes less than 2 minutes to get started</div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer">
        <div className="f-logo">Study<em>Sphere</em></div>
        <div className="f-copy">© 2026 StudySphere · Built for learners everywhere</div>
        <div className="f-links">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>

    </div>
  )
}
