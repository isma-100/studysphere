// src/pages/DashboardPage.jsx
// Placeholder — we'll build the full dashboard in Phase 3
// For now it confirms auth is working and lets you log out

import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0f1e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      flexDirection: 'column', gap: '1.5rem', padding: '2rem',
      textAlign: 'center',
    }}>
      {/* Glow */}
      <div style={{
        position: 'fixed', width: 600, height: 400, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(0,212,200,0.07), transparent 70%)',
        top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        pointerEvents: 'none',
      }} />

      <div style={{ fontSize: '3rem' }}>🎉</div>

      <h1 style={{
        color: 'white', fontWeight: 800, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
        letterSpacing: '-0.04em', lineHeight: 1.1, position: 'relative',
      }}>
        You're in,{' '}
        <span style={{ color: '#00d4c8' }}>
          {user?.user_metadata?.full_name?.split(' ')[0] || 'friend'}!
        </span>
      </h1>

      <p style={{
        color: 'rgba(255,255,255,0.4)', fontSize: '1rem',
        maxWidth: 420, lineHeight: 1.7, position: 'relative',
      }}>
        Auth is working perfectly. 🔐<br />
        The full dashboard is coming in <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Phase 3</strong> — study groups, browse, join, everything.
      </p>

      <div style={{
        background: 'rgba(0,212,200,0.07)',
        border: '1px solid rgba(0,212,200,0.15)',
        borderRadius: 14, padding: '1rem 1.5rem',
        color: 'rgba(255,255,255,0.5)', fontSize: '0.83rem',
        position: 'relative',
      }}>
        Logged in as <strong style={{ color: '#00d4c8' }}>{user?.email}</strong>
      </div>

      <button
        onClick={handleLogout}
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, padding: '0.75rem 2rem',
          color: 'rgba(255,255,255,0.6)', fontFamily: 'inherit',
          fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
          transition: 'all 0.2s', position: 'relative',
        }}
        onMouseOver={e => { e.target.style.color = 'white'; e.target.style.borderColor = 'rgba(255,255,255,0.2)' }}
        onMouseOut={e => { e.target.style.color = 'rgba(255,255,255,0.6)'; e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
      >
        Log out
      </button>
    </div>
  )
}
