// src/components/AppLayout.jsx
// Shared layout for all interior app pages.
// Dark nav + light content area, sidebar navigation.

import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import './AppLayout.css'

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⚡', label: 'Dashboard'  },
  { path: '/browse',    icon: '🔍', label: 'Browse'     },
  { path: '/profile',   icon: '👤', label: 'My Profile' },
]

export default function AppLayout({ children }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Learner'
  const initials    = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div className="app-shell">

      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        {/* Logo */}
        <Link to="/" className="sidebar-logo">
          <div className="sidebar-logo-icon">🌐</div>
          <div className="sidebar-logo-text">Study<em>Sphere</em></div>
        </Link>

        {/* Nav links */}
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-link${location.pathname === item.path ? ' active' : ''}`}
            >
              <span className="sl-icon">{item.icon}</span>
              <span className="sl-label">{item.label}</span>
              {location.pathname === item.path && <span className="sl-pip" />}
            </Link>
          ))}
        </nav>

        {/* Create group CTA */}
        <Link to="/groups/create" className="sidebar-create-btn">
          <span>＋</span> New Group
        </Link>

        {/* Spacer */}
        <div className="sidebar-spacer" />

        {/* User block at bottom */}
        <div className="sidebar-user">
          <div className="su-avatar">{initials}</div>
          <div className="su-info">
            <div className="su-name">{displayName}</div>
            <div className="su-email">{user?.email}</div>
          </div>
          <button
            className="su-logout"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Log out"
          >
            {loggingOut ? '...' : '→'}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="app-main">
        {children}
      </main>

    </div>
  )
}
