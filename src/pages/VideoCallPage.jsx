// src/pages/VideoCallPage.jsx
// Uses Jitsi Meet — 100% free, no account needed, no payment required
// Anyone in the group can join instantly with one click

import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import './VideoCall.css'

export default function VideoCallPage() {
  const { id }   = useParams()   // group id from URL
  const { user } = useAuth()

  const [group,      setGroup]      = useState(null)
  const [callActive, setCallActive] = useState(false)
  const [loading,    setLoading]    = useState(true)

  // We generate a unique room name from the group id
  // Same group always gets same room — persistent and shareable
  const roomName = `studysphere-${id}`.replace(/[^a-zA-Z0-9-]/g, '-')
  const jitsiUrl = `https://meet.jit.si/${roomName}`

  // The full iframe URL includes the user's display name
  const userName = encodeURIComponent(
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'
  )
  const iframeSrc = `${jitsiUrl}#userInfo.displayName="${userName}"&config.startWithAudioMuted=false&config.startWithVideoMuted=false`

  useEffect(() => { loadGroup() }, [id])

  async function loadGroup() {
    const { data } = await supabase
      .from('groups')
      .select('id, name, subjects(name, icon, color)')
      .eq('id', id).single()
    if (data) setGroup(data)
    setLoading(false)
  }

  const subject = group?.subjects

  if (loading) return (
    <AppLayout>
      <div className="vc-loading">
        <div className="spinner"/>
        <p>Setting up call...</p>
      </div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="vc-shell">

        {/* ── HEADER ── */}
        <div className="vc-header">
          <div className="vc-header-left">
            <Link to={`/groups/${id}`} className="vc-back">← Back to chat</Link>
            <div className="vc-dot" style={{ background: subject?.color || '#4a7cf7' }} />
            <div>
              <div className="vc-group-name">{subject?.icon} {group?.name}</div>
              <div className="vc-sub">Video Call</div>
            </div>
          </div>
          {callActive && (
            <button className="vc-leave-btn" onClick={() => setCallActive(false)}>
              📵 Leave call
            </button>
          )}
        </div>

        {/* ── JOIN SCREEN — shown before call starts ── */}
        {!callActive ? (
          <div className="vc-join">
            <div className="vc-join-card">
              <div className="vc-join-icon">🎥</div>
              <h2 className="vc-join-title">{group?.name} — Video Room</h2>
              <p className="vc-join-sub">
                Free HD video call powered by <strong>Jitsi Meet</strong> —
                no account needed, no payment, works instantly.
                Share the link below with your group members so they can join too.
              </p>

              {/* Feature badges */}
              <div className="vc-features">
                <div className="vc-feat">📹 HD Video</div>
                <div className="vc-feat">🎤 Audio</div>
                <div className="vc-feat">🖥️ Screen Share</div>
                <div className="vc-feat">💬 In-call Chat</div>
                <div className="vc-feat">✋ Raise Hand</div>
                <div className="vc-feat">🔒 Encrypted</div>
                <div className="vc-feat">👤 Up to 50 people</div>
                <div className="vc-feat">🆓 Always free</div>
              </div>

              {/* Shareable room link */}
              <div className="vc-share-box">
                <div className="vc-share-label">📎 Share this link with your group:</div>
                <div className="vc-share-row">
                  <div className="vc-share-url">{jitsiUrl}</div>
                  <button className="vc-copy-btn" onClick={() => {
                    navigator.clipboard.writeText(jitsiUrl)
                    // briefly show copied feedback
                    const btn = document.querySelector('.vc-copy-btn')
                    if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => btn.textContent = 'Copy', 2000) }
                  }}>Copy</button>
                </div>
              </div>

              <button className="vc-join-btn" onClick={() => setCallActive(true)}>
                🎥 Join video call
              </button>
            </div>
          </div>

        ) : (
          /* ── ACTIVE CALL — Jitsi embedded full screen ── */
          <div className="vc-call-wrap">
            <iframe
              className="vc-iframe"
              src={iframeSrc}
              allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
              title="Video Call"
            />
          </div>
        )}

      </div>
    </AppLayout>
  )
}
