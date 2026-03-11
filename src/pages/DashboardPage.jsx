// src/pages/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import './Dashboard.css'

export default function DashboardPage() {
  const { user } = useAuth()
  const [myGroups,      setMyGroups]      = useState([])
  const [suggested,     setSuggested]     = useState([])
  const [stats,         setStats]         = useState({ groups: 0, messages: 0, sessions: 0 })
  const [activity,      setActivity]      = useState([])
  const [loading,       setLoading]       = useState(true)

  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || 'there'

  useEffect(() => {
    fetchAll()
  }, [user])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchMyGroups(), fetchStats(), fetchActivity()])
    setLoading(false)
  }

  async function fetchMyGroups() {
    const { data } = await supabase
      .from('group_members')
      .select(`
        group_id,
        role,
        joined_at,
        groups (
          id, name, description, is_online,
          subjects ( name, color, icon ),
          group_members ( count )
        )
      `)
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(6)

    if (data) {
      const groups = data.map(d => ({ ...d.groups, myRole: d.role, joinedAt: d.joined_at }))
      setMyGroups(groups)

      // Fetch suggested: groups NOT joined by this user
      const joinedIds = groups.map(g => g.id)
      const { data: sugg } = await supabase
        .from('groups')
        .select(`id, name, description, is_online, subjects ( name, color, icon ), group_members ( count )`)
        .not('id', 'in', joinedIds.length ? `(${joinedIds.join(',')})` : '(null)')
        .limit(3)
      if (sugg) setSuggested(sugg)
    }
  }

  async function fetchStats() {
    const [{ count: groups }, { count: messages }] = await Promise.all([
      supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender_id', user.id),
    ])
    setStats({ groups: groups || 0, messages: messages || 0 })
  }

  async function fetchActivity() {
    const { data } = await supabase
      .from('messages')
      .select(`content, created_at, groups ( name )`)
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    if (data) setActivity(data)
  }

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts)
    const m = Math.floor(diff / 60000)
    if (m < 1)  return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  if (loading) return (
    <AppLayout>
      <div className="page-wrap">
        <div className="full-spinner"><div className="spinner" /><p>Loading your dashboard...</p></div>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="page-wrap">

        {/* ── WELCOME HEADER ── */}
        <div className="dash-header">
          <div>
            <div className="page-eyebrow">Dashboard</div>
            <h1 className="page-title">
              Welcome back, <span className="dash-name">{displayName}</span> 👋
            </h1>
            <p className="page-sub">Here's what's happening with your study groups.</p>
          </div>
          <Link to="/browse" className="dash-browse-btn">
            Browse groups →
          </Link>
        </div>

        {/* ── STATS ROW ── */}
        <div className="dash-stats">
          <div className="ds-card">
            <div className="ds-icon" style={{ background: 'rgba(0,212,200,0.1)', color: '#00b5aa' }}>⚡</div>
            <div>
              <div className="ds-num">{stats.groups}</div>
              <div className="ds-label">Groups joined</div>
            </div>
          </div>
          <div className="ds-card">
            <div className="ds-icon" style={{ background: 'rgba(74,124,247,0.1)', color: '#4a7cf7' }}>💬</div>
            <div>
              <div className="ds-num">{stats.messages}</div>
              <div className="ds-label">Messages sent</div>
            </div>
          </div>
          <div className="ds-card">
            <div className="ds-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>🎯</div>
            <div>
              <div className="ds-num">—</div>
              <div className="ds-label">Sessions attended</div>
            </div>
          </div>
        </div>

        {/* ── MY GROUPS ── */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">My Groups</h2>
            <Link to="/browse" className="dash-see-all">See all →</Link>
          </div>

          {myGroups.length === 0 ? (
            <div className="app-card empty-state">
              <div className="es-icon">🔍</div>
              <h3>No groups yet</h3>
              <p>Browse and join a study group to get started!</p>
              <Link to="/browse" className="dash-browse-btn" style={{ marginTop: '1.25rem', display: 'inline-flex' }}>
                Browse groups →
              </Link>
            </div>
          ) : (
            <div className="group-grid">
              {myGroups.map(g => (
                <GroupCard key={g.id} group={g} badge={g.myRole === 'admin' ? 'admin' : null} />
              ))}
            </div>
          )}
        </div>

        {/* ── BOTTOM ROW: suggested + activity ── */}
        <div className="dash-bottom">

          {/* Suggested */}
          <div className="dash-section" style={{ flex: 1 }}>
            <div className="dash-section-header">
              <h2 className="dash-section-title">Suggested for you</h2>
            </div>
            {suggested.length === 0 ? (
              <div className="app-card empty-state" style={{ padding: '2rem' }}>
                <p>No suggestions right now.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {suggested.map(g => (
                  <SuggestedCard key={g.id} group={g} />
                ))}
              </div>
            )}
          </div>

          {/* Activity feed */}
          <div className="dash-section dash-activity">
            <div className="dash-section-header">
              <h2 className="dash-section-title">Recent activity</h2>
            </div>
            {activity.length === 0 ? (
              <div className="app-card empty-state" style={{ padding: '2rem' }}>
                <p>No activity yet. Send a message in a group!</p>
              </div>
            ) : (
              <div className="activity-feed app-card" style={{ padding: '0.5rem 0' }}>
                {activity.map((a, i) => (
                  <div key={i} className="activity-item">
                    <div className="act-dot" />
                    <div className="act-content">
                      <div className="act-text">
                        You said <em>"{a.content.slice(0, 40)}{a.content.length > 40 ? '…' : ''}"</em>
                      </div>
                      <div className="act-meta">
                        {a.groups?.name} · {timeAgo(a.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  )
}

/* ── Group Card ── */
function GroupCard({ group, badge }) {
  const memberCount = group.group_members?.[0]?.count ?? 0
  const subject     = group.subjects

  return (
    <Link to={`/groups/${group.id}`} className="group-card app-card">
      {/* Subject color bar */}
      <div className="gc-bar" style={{ background: subject?.color || '#4a7cf7' }} />
      <div className="gc-body">
        <div className="gc-top">
          <div className="gc-icon" style={{ background: subject?.color ? subject.color + '22' : '#eff4ff' }}>
            {subject?.icon || '📚'}
          </div>
          <div className="gc-badges">
            {badge && <span className="badge badge-amber">⭐ {badge}</span>}
            <span className={`badge ${group.is_online ? 'badge-teal' : 'badge-blue'}`}>
              {group.is_online ? '🌐 Online' : '📍 In-person'}
            </span>
          </div>
        </div>
        <div className="gc-name">{group.name}</div>
        {subject && <div className="gc-subject">{subject.icon} {subject.name}</div>}
        {group.description && (
          <div className="gc-desc">
            {group.description.slice(0, 80)}{group.description.length > 80 ? '…' : ''}
          </div>
        )}
        <div className="gc-footer">
          <span className="gc-members">👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          <span className="gc-arrow">→</span>
        </div>
      </div>
    </Link>
  )
}

/* ── Suggested Card ── */
function SuggestedCard({ group }) {
  const subject     = group.subjects
  const memberCount = group.group_members?.[0]?.count ?? 0

  return (
    <Link to={`/groups/${group.id}`} className="suggested-card app-card">
      <div className="sc-icon" style={{ background: subject?.color ? subject.color + '22' : '#eff4ff' }}>
        {subject?.icon || '📚'}
      </div>
      <div className="sc-info">
        <div className="sc-name">{group.name}</div>
        <div className="sc-meta">
          {subject?.name} · {memberCount} members ·{' '}
          <span style={{ color: group.is_online ? '#00b5aa' : '#4a7cf7' }}>
            {group.is_online ? 'Online' : 'In-person'}
          </span>
        </div>
      </div>
      <div className="sc-arrow">→</div>
    </Link>
  )
}
