// src/pages/NotificationsPage.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import './NotificationsPage.css'

function fmtRelTime(ts) {
  const diff = Date.now() - new Date(ts)
  if (diff < 60000)    return 'just now'
  if (diff < 3600000)  return `${Math.floor(diff/60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`
  if (diff < 604800000)return `${Math.floor(diff/86400000)}d ago`
  return new Date(ts).toLocaleDateString([],{month:'short',day:'numeric'})
}

const TYPE_META = {
  new_message:  { icon:'💬', color:'#4a7cf7', label:'New message' },
  new_member:   { icon:'👋', color:'#10b981', label:'New member'  },
  group_join:   { icon:'🎉', color:'#00b5aa', label:'Joined group' },
  dm_received:  { icon:'📩', color:'#8b5cf6', label:'Direct message' },
  mention:      { icon:'@',  color:'#f59e0b', label:'Mention'     },
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const [notifs,  setNotifs]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState('all')

  useEffect(() => { loadNotifications() }, [])

  async function loadNotifications() {
    setLoading(true)

    // Build notifications from real data
    const results = []

    // Recent messages in my groups
    const { data: memberships } = await supabase
      .from('group_members').select('group_id, groups(id,name,subjects(icon,color))').eq('user_id', user.id)

    if (memberships?.length) {
      const groupIds = memberships.map(m=>m.group_id)
      const groupMap = Object.fromEntries(memberships.map(m=>[m.group_id, m.groups]))

      const { data: msgs } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id, group_id, users(full_name, email)')
        .in('group_id', groupIds)
        .neq('sender_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      msgs?.forEach(m => {
        const grp = groupMap[m.group_id]
        const senderName = m.users?.full_name || m.users?.email?.split('@')[0] || 'Someone'
        results.push({
          id: `msg-${m.id}`, type: 'new_message',
          title: `${senderName} in ${grp?.name}`,
          body: m.content?.slice(0,80) || '(attachment)',
          ts: m.created_at, read: false,
          link: `/groups/${m.group_id}`,
          groupIcon: grp?.subjects?.icon,
          groupColor: grp?.subjects?.color,
        })
      })

      // New members joining my groups
      const { data: newMembers } = await supabase
        .from('group_members')
        .select('user_id, joined_at, group_id, users(full_name, email)')
        .in('group_id', groupIds)
        .neq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(10)

      newMembers?.forEach(m => {
        const grp = groupMap[m.group_id]
        const name = m.users?.full_name || m.users?.email?.split('@')[0] || 'Someone'
        results.push({
          id: `mem-${m.user_id}-${m.group_id}`, type: 'new_member',
          title: `${name} joined ${grp?.name}`,
          body: 'Say hello to your new study buddy!',
          ts: m.joined_at, read: false,
          link: `/groups/${m.group_id}`,
          groupIcon: grp?.subjects?.icon,
          groupColor: grp?.subjects?.color,
        })
      })
    }

    // DMs received
    const { data: dms } = await supabase
      .from('direct_messages')
      .select('id, content, created_at, sender_id, users!direct_messages_sender_id_fkey(full_name, email)')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    dms?.forEach(d => {
      const name = d.users?.full_name || d.users?.email?.split('@')[0] || 'Someone'
      results.push({
        id: `dm-${d.id}`, type: 'dm_received',
        title: `${name} sent you a message`,
        body: d.content?.slice(0,80),
        ts: d.created_at, read: false,
        link: null,
      })
    })

    // Sort by time
    results.sort((a,b) => new Date(b.ts) - new Date(a.ts))
    setNotifs(results.slice(0, 40))
    setLoading(false)
  }

  const filtered = filter === 'all' ? notifs : notifs.filter(n => n.type === filter)
  const unreadCount = notifs.length

  return (
    <AppLayout>
      <div className="page-wrap notif-wrap">
        <div className="page-header">
          <div className="page-eyebrow">Activity</div>
          <div style={{display:'flex',alignItems:'center',gap:'1rem'}}>
            <h1 className="page-title">Notifications</h1>
            {unreadCount > 0 && <span className="notif-total-badge">{unreadCount}</span>}
          </div>
          <p className="page-sub">Everything happening across your study groups.</p>
        </div>

        {/* Filters */}
        <div className="notif-filters">
          {[
            {id:'all',       label:'All'},
            {id:'new_message', label:'💬 Messages'},
            {id:'new_member',  label:'👋 Members'},
            {id:'dm_received', label:'📩 DMs'},
          ].map(f=>(
            <button key={f.id} className={`notif-filter${filter===f.id?' active':''}`}
              onClick={()=>setFilter(f.id)}>
              {f.label}
              {f.id==='all' && <span className="nf-count">{notifs.length}</span>}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="notif-skel-list">
            {[1,2,3,4,5].map(i=>(
              <div key={i} className="notif-skel-item">
                <div className="skel" style={{width:40,height:40,borderRadius:12,flexShrink:0}}/>
                <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
                  <div className="skel" style={{height:14,width:'60%',borderRadius:6}}/>
                  <div className="skel" style={{height:12,width:'80%',borderRadius:6}}/>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="notif-empty">
            <div className="ne-icon">🔔</div>
            <h3>All caught up!</h3>
            <p>{filter === 'all' ? "You don't have any notifications yet. Join some groups to get started!" : `No ${filter.replace('_',' ')} notifications.`}</p>
            {filter === 'all' && <Link to="/browse" className="ne-cta">Browse groups →</Link>}
          </div>
        ) : (
          <div className="notif-list">
            {filtered.map((n, idx) => {
              const meta = TYPE_META[n.type] || TYPE_META.new_message
              const Inner = (
                <div className="notif-item" key={n.id}>
                  <div className="ni-icon-wrap" style={{background: meta.color+'18', border:`1.5px solid ${meta.color}30`}}>
                    <span className="ni-icon">{n.groupIcon || meta.icon}</span>
                  </div>
                  <div className="ni-body">
                    <div className="ni-title">{n.title}</div>
                    {n.body && <div className="ni-preview">{n.body}</div>}
                  </div>
                  <div className="ni-right">
                    <div className="ni-time">{fmtRelTime(n.ts)}</div>
                    <div className="ni-type-badge" style={{background:meta.color+'15',color:meta.color}}>{meta.label}</div>
                  </div>
                </div>
              )
              return n.link
                ? <Link key={n.id} to={n.link} style={{textDecoration:'none'}}>{Inner}</Link>
                : <div key={n.id}>{Inner}</div>
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
