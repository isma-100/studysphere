// src/pages/ProfilePage.jsx
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import './ProfilePage.css'

const AVATAR_GRADIENTS = [
  { id:'teal',    label:'Teal',    value:'linear-gradient(135deg,#00d4c8,#4a7cf7)' },
  { id:'violet',  label:'Violet',  value:'linear-gradient(135deg,#8b5cf6,#4a7cf7)' },
  { id:'amber',   label:'Amber',   value:'linear-gradient(135deg,#f59e0b,#f43f5e)' },
  { id:'green',   label:'Green',   value:'linear-gradient(135deg,#10b981,#4a7cf7)' },
  { id:'rose',    label:'Rose',    value:'linear-gradient(135deg,#f43f5e,#8b5cf6)' },
  { id:'ocean',   label:'Ocean',   value:'linear-gradient(135deg,#00d4c8,#10b981)' },
  { id:'blue',    label:'Blue',    value:'linear-gradient(135deg,#4a7cf7,#8b5cf6)' },
  { id:'sunrise', label:'Sunrise', value:'linear-gradient(135deg,#f59e0b,#10b981)' },
]

function initials(name='') { return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?' }

export default function ProfilePage() {
  const { user } = useAuth()
  const [profile,  setProfile]  = useState(null)
  const [form,     setForm]     = useState({ full_name:'', username:'', bio:'' })
  const [gradient, setGradient] = useState('teal')
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [stats,    setStats]    = useState({ groups:0, messages:0 })
  const [myGroups, setMyGroups] = useState([])

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
    if (data) {
      setProfile(data)
      setForm({ full_name: data.full_name||'', username: data.username||'', bio: data.bio||'' })
      setGradient(data.avatar_gradient || 'teal')
    }
    // Stats
    const [{ count: gc }, { count: mc }] = await Promise.all([
      supabase.from('group_members').select('*', { count:'exact', head:true }).eq('user_id', user.id),
      supabase.from('messages').select('*', { count:'exact', head:true }).eq('sender_id', user.id),
    ])
    setStats({ groups: gc||0, messages: mc||0 })
    // My groups
    const { data: gm } = await supabase.from('group_members')
      .select('groups(id,name,subjects(name,color,icon),group_members(count))')
      .eq('user_id', user.id).limit(6)
    if (gm) setMyGroups(gm.map(g=>g.groups).filter(Boolean))
    setLoading(false)
  }

  async function handleSave() {
    if (!form.full_name.trim()) return
    setSaving(true)
    await supabase.from('users').update({
      full_name: form.full_name.trim(),
      username:  form.username.trim() || null,
      bio:       form.bio.trim() || null,
      avatar_gradient: gradient,
    }).eq('id', user.id)
    // Also update auth metadata for display name
    await supabase.auth.updateUser({ data: { full_name: form.full_name.trim() } })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const grad = AVATAR_GRADIENTS.find(g=>g.id===gradient)?.value || AVATAR_GRADIENTS[0].value
  const name = form.full_name || profile?.full_name || user?.email?.split('@')[0] || 'You'

  if (loading) return (
    <AppLayout>
      <div className="page-wrap">
        <div className="prof-skel-wrap">
          {[1,2,3].map(i=><div key={i} className="skel-block" style={{height: i===1?120:48, borderRadius:16}}/>)}
        </div>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="page-wrap prof-wrap">

        {/* ── HERO ── */}
        <div className="prof-hero">
          <div className="prof-av-big" style={{background:grad}}>{initials(name)}</div>
          <div className="prof-hero-info">
            <h1 className="prof-name">{name}</h1>
            {profile?.username && <div className="prof-handle">@{profile.username}</div>}
            {profile?.bio && <p className="prof-bio-display">{profile.bio}</p>}
            <div className="prof-stats">
              <div className="prof-stat"><span className="ps-val">{stats.groups}</span><span className="ps-label">Groups</span></div>
              <div className="prof-stat-div"/>
              <div className="prof-stat"><span className="ps-val">{stats.messages}</span><span className="ps-label">Messages</span></div>
              <div className="prof-stat-div"/>
              <div className="prof-stat"><span className="ps-val">{new Date(user.created_at).toLocaleDateString([],{month:'short',year:'numeric'})}</span><span className="ps-label">Joined</span></div>
            </div>
          </div>
        </div>

        <div className="prof-grid">

          {/* ── EDIT FORM ── */}
          <div className="prof-card">
            <div className="prof-card-title">Edit Profile</div>

            {saved && <div className="prof-saved">✅ Profile saved!</div>}

            <div className="prof-field">
              <label className="prof-label">Full Name</label>
              <input className="prof-input" value={form.full_name}
                onChange={e=>setForm(p=>({...p,full_name:e.target.value}))}
                placeholder="Your full name" maxLength={60}/>
            </div>
            <div className="prof-field">
              <label className="prof-label">Username <span className="prof-optional">optional</span></label>
              <div className="prof-input-prefix">
                <span className="pip-at">@</span>
                <input className="prof-input pip-inp" value={form.username}
                  onChange={e=>setForm(p=>({...p,username:e.target.value.replace(/[^a-z0-9_]/g,'')}))}
                  placeholder="yourhandle" maxLength={30}/>
              </div>
            </div>
            <div className="prof-field">
              <label className="prof-label">Bio <span className="prof-optional">optional</span></label>
              <textarea className="prof-input prof-textarea" value={form.bio}
                onChange={e=>setForm(p=>({...p,bio:e.target.value}))}
                placeholder="Tell your study group what you're about…" maxLength={200} rows={3}/>
              <div className="prof-char-count">{form.bio.length}/200</div>
            </div>

            {/* Avatar colour */}
            <div className="prof-field">
              <label className="prof-label">Avatar Colour</label>
              <div className="av-picker">
                {AVATAR_GRADIENTS.map(g=>(
                  <button key={g.id} className={`av-swatch${gradient===g.id?' selected':''}`}
                    style={{background:g.value}} onClick={()=>setGradient(g.id)}
                    title={g.label}>
                    {gradient===g.id && <span className="av-check">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            <button className="prof-save-btn" onClick={handleSave} disabled={saving||!form.full_name.trim()}>
              {saving ? <><span className="spinner" style={{width:14,height:14}}/> Saving…</> : 'Save changes'}
            </button>
          </div>

          {/* ── MY GROUPS ── */}
          <div className="prof-card">
            <div className="prof-card-title">My Groups <span className="prof-count">{stats.groups}</span></div>
            {myGroups.length === 0 ? (
              <div className="prof-empty">
                <div className="pe-icon">📚</div>
                <p>You haven't joined any groups yet.</p>
                <a href="/browse" className="pe-link">Browse groups →</a>
              </div>
            ) : (
              <div className="prof-groups">
                {myGroups.map(g=>(
                  <a key={g.id} href={`/groups/${g.id}`} className="pg-item">
                    <div className="pg-dot" style={{background:g.subjects?.color||'#4a7cf7'}}/>
                    <div className="pg-info">
                      <div className="pg-name">{g.subjects?.icon} {g.name}</div>
                      <div className="pg-sub">{g.group_members?.[0]?.count||0} members</div>
                    </div>
                    <span className="pg-arrow">→</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
