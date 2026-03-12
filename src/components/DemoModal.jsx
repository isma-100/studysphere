// src/components/DemoModal.jsx
// Animated app demo — shows full journey in ~12 seconds
// Loops automatically, closes on backdrop click or X button

import { useEffect, useState, useRef } from 'react'
import './DemoModal.css'

// All scenes in the demo
const SCENES = [
  {
    id: 'signup',
    label: '01 — Sign Up',
    icon: '✍️',
    title: 'Create your free account',
    duration: 2200,
  },
  {
    id: 'browse',
    label: '02 — Browse Groups',
    icon: '🔍',
    title: 'Find the perfect study group',
    duration: 2200,
  },
  {
    id: 'chat',
    label: '03 — Group Chat',
    icon: '💬',
    title: 'Chat and share knowledge',
    duration: 2400,
  },
  {
    id: 'ai',
    label: '04 — AI Tutor',
    icon: '🤖',
    title: 'Get instant AI help',
    duration: 2400,
  },
  {
    id: 'dm',
    label: '05 — Direct Message',
    icon: '💌',
    title: 'Message members privately',
    duration: 2000,
  },
  {
    id: 'session',
    label: '06 — Study Sessions',
    icon: '📅',
    title: 'Schedule and join sessions',
    duration: 2000,
  },
]

export default function DemoModal({ onClose }) {
  const [scene,    setScene]    = useState(0)
  const [progress, setProgress] = useState(0)
  const [typing,   setTyping]   = useState(0)
  const timerRef   = useRef(null)
  const progressRef = useRef(null)

  const current = SCENES[scene]

  // Advance scenes automatically
  useEffect(() => {
    setProgress(0)
    setTyping(0)
    clearInterval(timerRef.current)
    clearInterval(progressRef.current)

    // Animate typing counter for chat/ai scenes
    if (['chat','ai','signup'].includes(current.id)) {
      let t = 0
      timerRef.current = setInterval(() => {
        t += 1
        setTyping(t)
        if (t >= 20) clearInterval(timerRef.current)
      }, 60)
    }

    // Progress bar
    const dur = current.duration
    const step = 50
    let elapsed = 0
    progressRef.current = setInterval(() => {
      elapsed += step
      setProgress(Math.min((elapsed / dur) * 100, 100))
      if (elapsed >= dur) {
        clearInterval(progressRef.current)
        setScene(s => (s + 1) % SCENES.length)
      }
    }, step)

    return () => {
      clearInterval(timerRef.current)
      clearInterval(progressRef.current)
    }
  }, [scene])

  // Close on Escape
  useEffect(() => {
    const fn = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [])

  return (
    <div className="dm-backdrop" onClick={onClose}>
      <div className="dm-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="dm-header">
          <div className="dm-header-left">
            <div className="dm-logo">🌐 <span>Study<em>Sphere</em></span></div>
            <div className="dm-scene-label">{current.label}</div>
          </div>
          <button className="dm-close" onClick={onClose}>✕</button>
        </div>

        {/* Scene dots */}
        <div className="dm-dots">
          {SCENES.map((s, i) => (
            <button
              key={s.id}
              className={`dm-dot${i === scene ? ' active' : i < scene ? ' done' : ''}`}
              onClick={() => setScene(i)}
              title={s.label}
            />
          ))}
        </div>

        {/* Progress bar */}
        <div className="dm-progress-bar">
          <div className="dm-progress-fill" style={{ width: `${((scene / SCENES.length) + (progress / 100 / SCENES.length)) * 100}%` }} />
        </div>

        {/* Scene content */}
        <div className="dm-stage">
          {current.id === 'signup'  && <SceneSignup  typing={typing} />}
          {current.id === 'browse'  && <SceneBrowse  />}
          {current.id === 'chat'    && <SceneChat    typing={typing} />}
          {current.id === 'ai'      && <SceneAI      typing={typing} />}
          {current.id === 'dm'      && <SceneDM      />}
          {current.id === 'session' && <SceneSession />}
        </div>

        {/* Caption */}
        <div className="dm-caption">
          <span className="dm-caption-icon">{current.icon}</span>
          <span className="dm-caption-text">{current.title}</span>
        </div>

      </div>
    </div>
  )
}

/* ── SCENE: Sign Up ── */
function SceneSignup({ typing }) {
  const name = 'Ismail Said'.slice(0, typing)
  return (
    <div className="scene-signup">
      <div className="scene-card">
        <div className="sc-logo">🌐 StudySphere</div>
        <div className="sc-title">Create your account</div>
        <div className="sc-field">
          <div className="sc-label">Full name</div>
          <div className="sc-input">
            {name}<span className="cursor">|</span>
          </div>
        </div>
        <div className="sc-field">
          <div className="sc-label">Email</div>
          <div className="sc-input filled">ismail@example.com</div>
        </div>
        <div className="sc-field">
          <div className="sc-label">Password</div>
          <div className="sc-input filled">••••••••</div>
        </div>
        <div className="sc-btn">Get started free →</div>
        <div className="sc-note">Already have an account? <span>Log in</span></div>
      </div>
    </div>
  )
}

/* ── SCENE: Browse Groups ── */
function SceneBrowse() {
  return (
    <div className="scene-browse">
      <div className="sb-header">
        <div className="sb-title">Browse Groups</div>
        <div className="sb-search">🔍 Search groups…</div>
      </div>
      <div className="sb-cards">
        {[
          { icon:'⚗️', name:'Chemistry Masters', sub:'Chemistry', members:4,  color:'#f59e0b' },
          { icon:'💻', name:'Web Dev Wizards',   sub:'Web Dev',   members:7,  color:'#4a7cf7' },
          { icon:'🧬', name:'Biology Squad',     sub:'Biology',   members:3,  color:'#10b981' },
          { icon:'📐', name:'Calculus Crew',     sub:'Calculus',  members:5,  color:'#8b5cf6' },
        ].map((g, i) => (
          <div key={g.name} className={`sb-card a${i+1}`}>
            <div className="sb-card-icon" style={{ background: g.color+'22', color: g.color }}>{g.icon}</div>
            <div className="sb-card-info">
              <div className="sb-card-name">{g.name}</div>
              <div className="sb-card-sub">{g.sub} · {g.members} members</div>
            </div>
            <div className="sb-join">Join →</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── SCENE: Group Chat ── */
function SceneChat({ typing }) {
  const draft = 'Anyone understand equilibrium?'.slice(0, typing * 2)
  const msgs = [
    { av:'AK', bg:'#00b5aa', name:'Amina K',  text:'Welcome everyone! 👋',              me:false },
    { av:'TJ', bg:'#f59e0b', name:'Tunde J',  text:'Hi! Ready to study chemistry 🔥',  me:false },
    { av:'ME', bg:'#4a7cf7', name:'You',       text:'Just joined, this is awesome!',    me:true  },
  ]
  return (
    <div className="scene-chat">
      <div className="sc-chat-header">
        <div className="scc-dot" style={{ background:'#f59e0b' }}/>
        <div className="scc-name">⚗️ Chemistry Masters</div>
        <div className="scc-members">4 online</div>
      </div>
      <div className="sc-chat-msgs">
        {msgs.map((m,i) => (
          <div key={i} className={`scm-row${m.me?' me':''}`}>
            {!m.me && <div className="scm-av" style={{ background:m.bg }}>{m.av}</div>}
            <div className="scm-col">
              {!m.me && <div className="scm-name">{m.name}</div>}
              <div className={`scm-bubble${m.me?' me':''}`}>{m.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="sc-chat-input">
        <div className="sci-text">{draft}{draft.length < 28 && <span className="cursor">|</span>}</div>
        <div className="sci-send">↑</div>
      </div>
    </div>
  )
}

/* ── SCENE: AI Tutor ── */
function SceneAI({ typing }) {
  const response = 'Chemical equilibrium is when forward and reverse reactions occur at equal rates…'.slice(0, typing * 3)
  return (
    <div className="scene-ai">
      <div className="sc-chat-header">
        <div className="scc-dot" style={{ background:'#00d4c8' }}/>
        <div className="scc-name">⚗️ Chemistry Masters</div>
        <div className="scc-members">AI Active</div>
      </div>
      <div className="sc-chat-msgs">
        <div className="scm-row me">
          <div className="scm-col">
            <div className="scm-bubble me">@ai explain — what is chemical equilibrium?</div>
          </div>
        </div>
        <div className="sc-ai-bubble">
          <div className="sc-ai-label">✦ AI Study Assistant</div>
          <div className="sc-ai-text">
            {response}<span className="cursor">|</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── SCENE: Direct Message ── */
function SceneDM() {
  return (
    <div className="scene-dm">
      <div className="sdm-sidebar">
        <div className="sdm-title">Direct Messages</div>
        {[
          { av:'AK', bg:'#00b5aa', name:'Amina K',    last:'See you in the session!', unread:2 },
          { av:'TJ', bg:'#f59e0b', name:'Tunde J',    last:'Thanks for the notes 🙏', unread:0 },
          { av:'PR', bg:'#8b5cf6', name:'Priya R',    last:'Can you share the file?',  unread:1 },
        ].map((c,i) => (
          <div key={i} className={`sdm-conv${i===0?' active':''}`}>
            <div className="sdm-av" style={{ background:c.bg }}>{c.av}</div>
            <div className="sdm-info">
              <div className="sdm-name">{c.name}</div>
              <div className="sdm-last">{c.last}</div>
            </div>
            {c.unread > 0 && <div className="sdm-badge">{c.unread}</div>}
          </div>
        ))}
      </div>
      <div className="sdm-window">
        <div className="sdmw-header">
          <div className="sdmw-av" style={{ background:'#00b5aa' }}>AK</div>
          <div className="sdmw-name">Amina K</div>
        </div>
        <div className="sdmw-msgs">
          <div className="sdmw-msg"><div className="sdmw-bubble">Hey! Great session today 🙌</div></div>
          <div className="sdmw-msg me"><div className="sdmw-bubble me">Thanks! Same time next week?</div></div>
          <div className="sdmw-msg"><div className="sdmw-bubble">See you in the session! ✓✓</div></div>
        </div>
      </div>
    </div>
  )
}

/* ── SCENE: Study Session ── */
function SceneSession() {
  return (
    <div className="scene-session">
      <div className="ss-header">📅 Upcoming Sessions</div>
      <div className="ss-card active-card">
        <div className="ss-card-top">
          <div className="ss-badge">Today · 8:00 PM</div>
          <div className="ss-tag">⚗️ Chemistry</div>
        </div>
        <div className="ss-card-title">Equilibrium Deep Dive</div>
        <div className="ss-card-sub">📍 Online · 4 attending</div>
        <div className="ss-rsvp">
          <div className="ss-rsvp-btn active">✓ Going</div>
          <div className="ss-rsvp-btn">? Maybe</div>
          <div className="ss-rsvp-btn">✗ Can't</div>
        </div>
      </div>
      <div className="ss-card">
        <div className="ss-card-top">
          <div className="ss-badge upcoming">Tomorrow · 3:00 PM</div>
          <div className="ss-tag">💻 Web Dev</div>
        </div>
        <div className="ss-card-title">React Hooks Workshop</div>
        <div className="ss-card-sub">📍 Online · 6 attending</div>
      </div>
    </div>
  )
}
