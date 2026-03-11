// src/components/SessionScheduler.jsx
// Shows upcoming sessions + create form inside group chat
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import './SessionScheduler.css'

function fmtDate(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = d - now
  const isToday = d.toDateString() === now.toDateString()
  const isTomorrow = d.toDateString() === new Date(now.getTime()+86400000).toDateString()
  const time = d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
  if (isToday)    return `Today at ${time}`
  if (isTomorrow) return `Tomorrow at ${time}`
  return d.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'}) + ` at ${time}`
}

function timeUntil(ts) {
  const diff = new Date(ts) - Date.now()
  if (diff < 0)           return 'started'
  if (diff < 3600000)     return `in ${Math.floor(diff/60000)}m`
  if (diff < 86400000)    return `in ${Math.floor(diff/3600000)}h`
  return `in ${Math.floor(diff/86400000)}d`
}

export default function SessionScheduler({ groupId }) {
  const { user } = useAuth()
  const [sessions,  setSessions]  = useState([])
  const [showForm,  setShowForm]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [rsvps,     setRsvps]     = useState({}) // sessionId → status
  const [form, setForm] = useState({
    title:'', description:'', start_time:'', end_time:'', location:'online'
  })

  useEffect(() => { loadSessions() }, [groupId])

  async function loadSessions() {
    setLoading(true)
    const { data } = await supabase
      .from('sessions')
      .select(`*, users(full_name,email), session_rsvps(user_id,status)`)
      .eq('group_id', groupId)
      .gte('start_time', new Date(Date.now() - 3600000).toISOString()) // include just-started
      .order('start_time', { ascending: true })
      .limit(10)

    if (data) {
      setSessions(data)
      // Build my RSVP map
      const myRsvps = {}
      data.forEach(s => {
        const mine = s.session_rsvps?.find(r => r.user_id === user.id)
        if (mine) myRsvps[s.id] = mine.status
      })
      setRsvps(myRsvps)
    }
    setLoading(false)
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.start_time) return
    setSaving(true)
    const { data, error } = await supabase.from('sessions').insert({
      group_id:   groupId,
      creator_id: user.id,
      title:      form.title.trim(),
      description:form.description.trim() || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time:   form.end_time ? new Date(form.end_time).toISOString() : null,
      location:   form.location.trim() || 'online',
    }).select().single()

    if (data) {
      // Auto-RSVP creator as going
      await supabase.from('session_rsvps').insert({ session_id:data.id, user_id:user.id, status:'going' })
      // Schedule browser notification
      scheduleNotification(data)
      setForm({ title:'', description:'', start_time:'', end_time:'', location:'online' })
      setShowForm(false)
      await loadSessions()
    }
    setSaving(false)
  }

  async function handleRsvp(sessionId, status) {
    const prev = rsvps[sessionId]
    setRsvps(r => ({ ...r, [sessionId]: status }))
    await supabase.from('session_rsvps').upsert({
      session_id: sessionId, user_id: user.id, status
    }, { onConflict: 'session_id,user_id' })
    await loadSessions()
  }

  async function handleDelete(sessionId) {
    await supabase.from('sessions').delete().eq('id', sessionId).eq('creator_id', user.id)
    setSessions(s => s.filter(x => x.id !== sessionId))
  }

  function scheduleNotification(session) {
    if (!('Notification' in window)) return
    Notification.requestPermission().then(perm => {
      if (perm !== 'granted') return
      const msUntil = new Date(session.start_time) - Date.now() - 300000 // 5min before
      if (msUntil > 0 && msUntil < 86400000) {
        setTimeout(() => {
          new Notification(`⏰ Starting in 5 min: ${session.title}`, {
            body: `Your study session is about to begin!`,
            icon: '/favicon.svg'
          })
        }, msUntil)
      }
    })
  }

  const goingCount = (s) => s.session_rsvps?.filter(r=>r.status==='going').length || 0

  return (
    <div className="sched-wrap">
      <div className="sched-header">
        <div className="sched-title">
          <span>📅</span> Upcoming Sessions
          {sessions.length > 0 && <span className="sched-badge">{sessions.length}</span>}
        </div>
        <button className="sched-add-btn" onClick={() => setShowForm(f=>!f)}>
          {showForm ? '✕ Cancel' : '＋ Schedule'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="sched-form">
          <input className="sched-input" placeholder="Session title *"
            value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} maxLength={80}/>
          <textarea className="sched-input sched-textarea" placeholder="What will you cover? (optional)"
            value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2}/>
          <div className="sched-row">
            <div className="sched-field">
              <label className="sched-label">Start time *</label>
              <input type="datetime-local" className="sched-input"
                value={form.start_time} onChange={e=>setForm(f=>({...f,start_time:e.target.value}))}
                min={new Date().toISOString().slice(0,16)}/>
            </div>
            <div className="sched-field">
              <label className="sched-label">End time</label>
              <input type="datetime-local" className="sched-input"
                value={form.end_time} onChange={e=>setForm(f=>({...f,end_time:e.target.value}))}/>
            </div>
          </div>
          <input className="sched-input" placeholder="Location (default: online)"
            value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))}/>
          <button className="sched-create-btn" onClick={handleCreate}
            disabled={saving||!form.title.trim()||!form.start_time}>
            {saving ? 'Creating…' : '📅 Create Session'}
          </button>
        </div>
      )}

      {/* Sessions list */}
      {loading ? (
        <div className="sched-loading">Loading sessions…</div>
      ) : sessions.length === 0 ? (
        <div className="sched-empty">
          <span>📆</span>
          <p>No upcoming sessions.<br/>Schedule one to keep the group on track!</p>
        </div>
      ) : (
        <div className="sched-list">
          {sessions.map(s => {
            const myRsvp = rsvps[s.id]
            const isPast = new Date(s.start_time) < Date.now()
            const isCreator = s.creator_id === user.id
            return (
              <div key={s.id} className={`sched-item${isPast?' past':''}`}>
                <div className="si-left">
                  <div className="si-time-badge">
                    <div className="si-date">{fmtDate(s.start_time)}</div>
                    {!isPast && <div className="si-countdown">{timeUntil(s.start_time)}</div>}
                  </div>
                  <div className="si-info">
                    <div className="si-title">{s.title}</div>
                    {s.description && <div className="si-desc">{s.description}</div>}
                    <div className="si-meta">
                      <span>📍 {s.location}</span>
                      <span>· 👥 {goingCount(s)} going</span>
                      {s.end_time && <span>· ⏱ {Math.round((new Date(s.end_time)-new Date(s.start_time))/60000)}m</span>}
                    </div>
                  </div>
                </div>
                <div className="si-right">
                  {!isPast && (
                    <div className="si-rsvp-btns">
                      {['going','maybe','not_going'].map(status => (
                        <button key={status}
                          className={`si-rsvp${myRsvp===status?' active':''}`}
                          onClick={() => handleRsvp(s.id, status)}
                          title={status==='not_going'?"Can't go":status.charAt(0).toUpperCase()+status.slice(1)}>
                          {status==='going'?'✓':status==='maybe'?'?':'✗'}
                        </button>
                      ))}
                    </div>
                  )}
                  {isCreator && (
                    <button className="si-delete" onClick={()=>handleDelete(s.id)} title="Delete session">🗑</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
