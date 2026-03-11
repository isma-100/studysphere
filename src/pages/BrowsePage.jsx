// src/pages/BrowsePage.jsx
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import SmartMatch from '../components/SmartMatch'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import AppLayout from '../components/AppLayout'
import './Browse.css'

export default function BrowsePage() {
  const { user } = useAuth()
  const [userGroups, setUserGroups] = useState([])
  const [profile, setProfile] = useState(null)
  const [groups,   setGroups]   = useState([])
  const [subjects, setSubjects] = useState([])
  const [search,   setSearch]   = useState('')
  const [subject,  setSubject]  = useState('all')
  const [mode,     setMode]     = useState('all') // all | online | inperson
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { fetchSubjects(); fetchUserData() }, [])
  useEffect(() => { fetchGroups() }, [search, subject, mode])

  async function fetchUserData() {
    if (!user) return
    const { data: gm } = await supabase.from('group_members').select('group_id, groups(id,name)').eq('user_id', user.id)
    if (gm) setUserGroups(gm)
    const { data: prof } = await supabase.from('users').select('full_name, bio').eq('id', user.id).single()
    if (prof) setProfile(prof)
  }

  async function fetchSubjects() {
    const { data } = await supabase.from('subjects').select('id, name, icon, color').order('name')
    if (data) setSubjects(data)
  }

  async function fetchGroups() {
    setLoading(true)
    let query = supabase
      .from('groups')
      .select(`id, name, description, is_online, created_at,
        subjects ( id, name, color, icon ),
        group_members ( count )`)
      .order('created_at', { ascending: false })

    if (search.trim())   query = query.ilike('name', `%${search.trim()}%`)
    if (subject !== 'all') query = query.eq('subject_id', subject)
    if (mode === 'online')   query = query.eq('is_online', true)
    if (mode === 'inperson') query = query.eq('is_online', false)

    const { data } = await query.limit(30)
    if (data) setGroups(data)
    setLoading(false)
  }

  return (
    <AppLayout>
      <div className="page-wrap">

        {/* Header */}
        <div className="page-header">
          <div className="page-eyebrow">Discover</div>
          <h1 className="page-title">Browse Study Groups</h1>
          <p className="page-sub">Find your perfect study squad — filter by subject or search by name.</p>
        </div>

        {/* Search + filters */}
        <div className="browse-controls">
          {/* Search */}
          <div className="browse-search-wrap">
            <span className="bs-icon">🔍</span>
            <input
              className="browse-search"
              placeholder="Search groups..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="bs-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* Mode toggle */}
          <div className="mode-toggle">
            {[
              { key: 'all',      label: 'All'        },
              { key: 'online',   label: '🌐 Online'  },
              { key: 'inperson', label: '📍 In-person' },
            ].map(m => (
              <button
                key={m.key}
                className={`mt-btn${mode === m.key ? ' active' : ''}`}
                onClick={() => setMode(m.key)}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* AI Smart Match */}
        <SmartMatch groups={groups} userGroups={userGroups} userProfile={profile || {}} />

        {/* Subject filter pills */}
        <div className="subject-pills">
          <button
            className={`sp-pill${subject === 'all' ? ' active' : ''}`}
            onClick={() => setSubject('all')}
          >
            All subjects
          </button>
          {subjects.map(s => (
            <button
              key={s.id}
              className={`sp-pill${subject === s.id ? ' active' : ''}`}
              onClick={() => setSubject(s.id)}
              style={subject === s.id ? { borderColor: s.color, color: s.color, background: s.color + '15' } : {}}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="browse-meta">
          {loading ? 'Loading...' : `${groups.length} group${groups.length !== 1 ? 's' : ''} found`}
          {(search || subject !== 'all' || mode !== 'all') && (
            <button className="clear-filters" onClick={() => { setSearch(''); setSubject('all'); setMode('all') }}>
              Clear filters ✕
            </button>
          )}
        </div>

        {/* Groups grid */}
        {loading ? (
          <div className="full-spinner"><div className="spinner" /><p>Finding groups...</p></div>
        ) : groups.length === 0 ? (
          <div className="app-card empty-state">
            <div className="es-icon">😕</div>
            <h3>No groups found</h3>
            <p>Try a different search or filter — or create the first group for this subject!</p>
            <Link to="/groups/create" className="browse-create-btn" style={{ marginTop: '1.25rem', display: 'inline-flex' }}>
              ＋ Create a group
            </Link>
          </div>
        ) : (
          <div className="browse-grid">
            {groups.map(g => <BrowseCard key={g.id} group={g} />)}
          </div>
        )}

      </div>
    </AppLayout>
  )
}

function BrowseCard({ group }) {
  const subject     = group.subjects
  const memberCount = group.group_members?.[0]?.count ?? 0

  return (
    <Link to={`/groups/${group.id}`} className="browse-card app-card">
      <div className="bc-color-bar" style={{ background: subject?.color || '#4a7cf7' }} />
      <div className="bc-body">
        <div className="bc-top">
          <div className="bc-icon" style={{ background: subject?.color ? subject.color + '20' : '#eff4ff' }}>
            {subject?.icon || '📚'}
          </div>
          <span className={`badge ${group.is_online ? 'badge-teal' : 'badge-blue'}`}>
            {group.is_online ? '🌐 Online' : '📍 In-person'}
          </span>
        </div>
        <div className="bc-name">{group.name}</div>
        {subject && <div className="bc-subject">{subject.icon} {subject.name}</div>}
        {group.description && (
          <div className="bc-desc">
            {group.description.slice(0, 100)}{group.description.length > 100 ? '…' : ''}
          </div>
        )}
        <div className="bc-footer">
          <span className="bc-members">👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
          <span className="bc-join">Join →</span>
        </div>
      </div>
    </Link>
  )
}
