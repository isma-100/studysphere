// src/components/DMInbox.jsx
// Floating DM inbox panel — shows all conversations, opens individual chats

import { useState, useRef, useEffect } from 'react'
import { useDM } from '../context/DMContext'
import { useAuth } from '../context/AuthContext'
import './DMInbox.css'

const GRADIENTS = [
  ['#00d4c8','#4a7cf7'],['#8b5cf6','#4a7cf7'],['#f59e0b','#f43f5e'],
  ['#10b981','#4a7cf7'],['#f43f5e','#8b5cf6'],['#00d4c8','#10b981'],
]
function avatarGrad(id='') {
  const n = id.split('').reduce((a,c) => a+c.charCodeAt(0), 0)
  const [a,b] = GRADIENTS[n % GRADIENTS.length]
  return `linear-gradient(135deg,${a},${b})`
}
function initials(name='') { return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?' }
function dname(u) { return u?.full_name || u?.email?.split('@')[0] || 'Unknown' }
function fmtTime(ts) {
  const d = new Date(ts), now = new Date()
  const diff = now - d
  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff/60000)}m`
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h`
  return d.toLocaleDateString([],{month:'short',day:'numeric'})
}

export default function DMInbox({ onOpenDM }) {
  const { conversations, totalUnread } = useDM()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const ref  = useRef(null)

  // Close on outside click
  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const convList = Object.values(conversations).sort((a,b) => {
    const aLast = a.messages.at(-1)?.created_at || ''
    const bLast = b.messages.at(-1)?.created_at || ''
    return bLast.localeCompare(aLast)
  })

  return (
    <div className="dmi-root" ref={ref}>
      {/* Inbox trigger button */}
      <button className="dmi-trigger" onClick={() => setOpen(v=>!v)} title="Direct Messages">
        <span className="dmi-icon">💬</span>
        <span className="dmi-label">Messages</span>
        {totalUnread > 0 && <span className="dmi-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>}
      </button>

      {/* Inbox panel */}
      {open && (
        <div className="dmi-panel">
          <div className="dmi-header">
            <span className="dmi-title">Direct Messages</span>
            {totalUnread > 0 && <span className="dmi-total-badge">{totalUnread} unread</span>}
          </div>

          {convList.length === 0 ? (
            <div className="dmi-empty">
              <div className="dmi-empty-icon">💬</div>
              <p>No messages yet.</p>
              <p className="dmi-empty-sub">Open a group and click 💬 next to a member to start a DM.</p>
            </div>
          ) : (
            <div className="dmi-list">
              {convList.map(conv => {
                const other   = conv.otherUser
                const lastMsg = conv.messages.at(-1)
                const isMe    = lastMsg?.sender_id === user.id
                return (
                  <button key={conv.channelId} className={`dmi-conv${conv.unread > 0 ? ' unread' : ''}`}
                    onClick={() => { onOpenDM(conv); setOpen(false) }}>
                    <div className="dmi-av" style={{ background: avatarGrad(other?.id||'') }}>
                      {initials(dname(other))}
                    </div>
                    <div className="dmi-conv-info">
                      <div className="dmi-conv-top">
                        <span className="dmi-conv-name">{dname(other)}</span>
                        {lastMsg && <span className="dmi-conv-time">{fmtTime(lastMsg.created_at)}</span>}
                      </div>
                      {lastMsg && (
                        <div className="dmi-conv-preview">
                          {isMe && <span className="dmi-you">You: </span>}
                          {lastMsg.content.slice(0,45)}{lastMsg.content.length > 45 ? '…' : ''}
                        </div>
                      )}
                    </div>
                    {conv.unread > 0 && <span className="dmi-unread-dot">{conv.unread}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
