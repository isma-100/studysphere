// src/pages/GroupDetailPage.jsx
import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import './GroupDetail.css'

export default function GroupDetailPage() {
  const { id }      = useParams()
  const { user }    = useAuth()
  const navigate    = useNavigate()

  const [group,     setGroup]     = useState(null)
  const [members,   setMembers]   = useState([])
  const [isMember,  setIsMember]  = useState(false)
  const [isAdmin,   setIsAdmin]   = useState(false)
  const [joining,   setJoining]   = useState(false)
  const [leaving,   setLeaving]   = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')

  useEffect(() => { fetchGroup() }, [id])

  async function fetchGroup() {
    setLoading(true)
    const { data, error } = await supabase
      .from('groups')
      .select(`
        id, name, description, is_online, max_members, created_at,
        subjects ( name, color, icon ),
        users!groups_creator_id_fkey ( id, full_name, email ),
        group_members (
          user_id, role, joined_at,
          users ( id, full_name, email, avatar_url )
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) { setLoading(false); return }

    setGroup(data)
    setMembers(data.group_members || [])

    const me = data.group_members?.find(m => m.user_id === user.id)
    setIsMember(!!me)
    setIsAdmin(me?.role === 'admin')
    setLoading(false)
  }

  async function handleJoin() {
    setJoining(true); setError('')
    const memberCount = members.length
    if (memberCount >= group.max_members) {
      setError('This group is full.'); setJoining(false); return
    }
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: id, user_id: user.id, role: 'member' })

    if (error) { setError(error.message); setJoining(false); return }
    await fetchGroup()
    setJoining(false)
  }

  async function handleLeave() {
    if (!window.confirm('Are you sure you want to leave this group?')) return
    setLeaving(true)
    await supabase.from('group_members').delete()
      .eq('group_id', id).eq('user_id', user.id)
    setLeaving(false)
    navigate('/dashboard')
  }

  function timeAgo(ts) {
    const d = Math.floor((Date.now() - new Date(ts)) / 86400000)
    if (d === 0) return 'today'
    if (d === 1) return 'yesterday'
    if (d < 30)  return `${d} days ago`
    return new Date(ts).toLocaleDateString()
  }

  if (loading) return (
    <AppLayout>
      <div className="page-wrap">
        <div className="full-spinner"><div className="spinner" /><p>Loading group...</p></div>
      </div>
    </AppLayout>
  )

  if (!group) return (
    <AppLayout>
      <div className="page-wrap">
        <div className="app-card empty-state">
          <div className="es-icon">😕</div>
          <h3>Group not found</h3>
          <p>This group may have been deleted or the link is wrong.</p>
          <Link to="/browse" className="browse-create-btn" style={{ marginTop: '1rem', display: 'inline-flex' }}>
            ← Back to browse
          </Link>
        </div>
      </div>
    </AppLayout>
  )

  const subject     = group.subjects
  const memberCount = members.length
  const isFull      = memberCount >= group.max_members
  const creator     = group.users

  return (
    <AppLayout>
      <div className="page-wrap">

        {/* Back link */}
        <Link to="/browse" className="gd-back">← Back to browse</Link>

        {/* Hero card */}
        <div className="gd-hero app-card">
          <div className="gd-hero-bar" style={{ background: subject?.color || '#4a7cf7' }} />
          <div className="gd-hero-body">
            <div className="gd-hero-top">
              <div className="gd-hero-icon" style={{ background: subject?.color ? subject.color + '20' : '#eff4ff' }}>
                {subject?.icon || '📚'}
              </div>
              <div className="gd-hero-badges">
                <span className={`badge ${group.is_online ? 'badge-teal' : 'badge-blue'}`}>
                  {group.is_online ? '🌐 Online' : '📍 In-person'}
                </span>
                {isFull && <span className="badge badge-amber">🔒 Full</span>}
                {isAdmin && <span className="badge badge-green">⭐ Admin</span>}
              </div>
            </div>

            <h1 className="gd-name">{group.name}</h1>
            {subject && <div className="gd-subject">{subject.icon} {subject.name}</div>}
            {group.description && <p className="gd-desc">{group.description}</p>}

            <div className="gd-meta-row">
              <div className="gd-meta-item">
                <span className="gd-meta-icon">👥</span>
                <span>{memberCount} / {group.max_members} members</span>
              </div>
              <div className="gd-meta-item">
                <span className="gd-meta-icon">📅</span>
                <span>Created {timeAgo(group.created_at)}</span>
              </div>
              {creator && (
                <div className="gd-meta-item">
                  <span className="gd-meta-icon">👤</span>
                  <span>By {creator.full_name || creator.email}</span>
                </div>
              )}
            </div>

            {/* Capacity bar */}
            <div className="gd-capacity">
              <div className="gd-cap-bar-bg">
                <div
                  className="gd-cap-bar-fill"
                  style={{
                    width: `${(memberCount / group.max_members) * 100}%`,
                    background: isFull ? '#f43f5e' : subject?.color || '#00d4c8'
                  }}
                />
              </div>
              <span className="gd-cap-label">
                {group.max_members - memberCount} spot{group.max_members - memberCount !== 1 ? 's' : ''} remaining
              </span>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
                borderRadius: 10, padding: '0.65rem 1rem',
                fontSize: '0.82rem', color: '#f43f5e', fontWeight: 500,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Action buttons */}
            <div className="gd-actions">
              {!isMember ? (
                <button
                  className="gd-btn-join"
                  onClick={handleJoin}
                  disabled={joining || isFull}
                >
                  {joining
                    ? <><span className="spinner" style={{ borderTopColor: '#0a0f1e', width: 16, height: 16 }} /> Joining...</>
                    : isFull ? '🔒 Group is full' : '＋ Join this group'
                  }
                </button>
              ) : (
                <div className="gd-member-actions">
                  <div className="gd-joined-badge">✅ You're a member</div>
                  <button
                    className="gd-btn-leave"
                    onClick={handleLeave}
                    disabled={leaving}
                  >
                    {leaving ? 'Leaving...' : 'Leave group'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Members list */}
        <div className="gd-section">
          <h2 className="gd-section-title">
            Members <span className="gd-section-count">{memberCount}</span>
          </h2>
          <div className="gd-members-grid">
            {members.map(m => {
              const u        = m.users
              const name     = u?.full_name || u?.email?.split('@')[0] || 'Unknown'
              const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
              return (
                <div key={m.user_id} className="gd-member-card app-card">
                  <div className="gm-avatar"
                    style={{ background: m.role === 'admin' ? 'linear-gradient(135deg,#00d4c8,#4a7cf7)' : 'linear-gradient(135deg,#8b5cf6,#4a7cf7)' }}
                  >
                    {initials}
                  </div>
                  <div className="gm-info">
                    <div className="gm-name">{name}</div>
                    <div className="gm-joined">Joined {timeAgo(m.joined_at)}</div>
                  </div>
                  {m.role === 'admin' && <span className="badge badge-teal">Admin</span>}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
