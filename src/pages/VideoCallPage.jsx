// src/pages/VideoCallPage.jsx
// Daily.co embedded video call — full screen share, camera, mic controls
// Each group gets its own persistent room

import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import './VideoCall.css'

export default function VideoCallPage() {
  const { id }   = useParams()   // group id
  const { user } = useAuth()
  const navigate = useNavigate()

  const [group,       setGroup]       = useState(null)
  const [roomUrl,     setRoomUrl]     = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [callActive,  setCallActive]  = useState(false)
  const [error,       setError]       = useState('')
  const [apiKey,      setApiKey]      = useState('')
  const iframeRef = useRef(null)

  useEffect(() => { loadGroup() }, [id])

  async function loadGroup() {
    const { data } = await supabase
      .from('groups')
      .select('id, name, subjects(name, icon, color)')
      .eq('id', id).single()
    if (data) setGroup(data)

    // Check if room_url already stored for this group
    const { data: settings } = await supabase
      .from('group_settings')
      .select('daily_room_url, daily_api_key_hint')
      .eq('group_id', id).single()

    if (settings?.daily_room_url) setRoomUrl(settings.daily_room_url)
    setLoading(false)
  }

  // Create a Daily.co room via their API
  async function createRoom() {
    if (!apiKey.trim()) { setError('Please enter your Daily.co API key first.'); return }
    setLoading(true); setError('')
    try {
      const roomName = `studysphere-group-${id}`.slice(0, 40)
      const res = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          name: roomName,
          properties: {
            enable_screenshare: true,
            enable_chat: true,
            enable_knocking: false,
            max_participants: 20,
            start_video_off: false,
            start_audio_off: false,
            lang: 'en',
          }
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create room')
      }
      const room = await res.json()

      // Save to DB so group always uses same room
      await supabase.from('group_settings').upsert({
        group_id: id,
        daily_room_url: room.url,
        daily_api_key_hint: apiKey.slice(0,8) + '...',
      }, { onConflict: 'group_id' })

      setRoomUrl(room.url)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  function joinCall() {
    setCallActive(true)
    // Request notification permission for when someone joins
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  function leaveCall() {
    setCallActive(false)
    if (iframeRef.current) {
      // Reload iframe to reset the call
      iframeRef.current.src = iframeRef.current.src
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="vc-loading"><div className="spinner"/><p>Setting up call...</p></div>
    </AppLayout>
  )

  const subject = group?.subjects

  return (
    <AppLayout>
      <div className="vc-shell">

        {/* Header */}
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
            <button className="vc-leave-btn" onClick={leaveCall}>
              📵 Leave call
            </button>
          )}
        </div>

        {/* Main area */}
        {!roomUrl ? (
          // ── SETUP SCREEN ──
          <div className="vc-setup">
            <div className="vc-setup-card">
              <div className="vc-setup-icon">📹</div>
              <h2 className="vc-setup-title">Start a Video Call</h2>
              <p className="vc-setup-sub">
                StudySphere uses <strong>Daily.co</strong> for video calls — free for up to 200 minutes/month.
                You need a free API key to create rooms.
              </p>

              <div className="vc-steps">
                <div className="vc-step">
                  <span className="vc-step-n">1</span>
                  <div>Go to <a href="https://dashboard.daily.co/u/signup" target="_blank" rel="noreferrer">daily.co/signup</a> — it's free</div>
                </div>
                <div className="vc-step">
                  <span className="vc-step-n">2</span>
                  <div>In your Daily dashboard → <strong>Developers → API keys</strong> → copy your key</div>
                </div>
                <div className="vc-step">
                  <span className="vc-step-n">3</span>
                  <div>Paste it below to create a permanent room for this group</div>
                </div>
              </div>

              {error && <div className="vc-error">⚠️ {error}</div>}

              <div className="vc-key-row">
                <input
                  className="vc-key-input"
                  type="password"
                  placeholder="Paste your Daily.co API key…"
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && createRoom()}
                />
                <button className="vc-create-btn" onClick={createRoom} disabled={!apiKey.trim() || loading}>
                  {loading ? <span className="spinner" style={{ borderTopColor: '#0a0f1e', width: 16, height: 16 }} /> : 'Create room →'}
                </button>
              </div>
              <p className="vc-key-note">
                🔒 Your API key is only used once to create the room and is never stored in full.
                After that, the room URL is saved and anyone in the group can join without a key.
              </p>
            </div>
          </div>
        ) : !callActive ? (
          // ── JOIN SCREEN ──
          <div className="vc-join">
            <div className="vc-join-card">
              <div className="vc-join-icon">🎥</div>
              <h2 className="vc-join-title">{group?.name} — Video Room</h2>
              <p className="vc-join-sub">
                Full video, audio, screen sharing and chat. Share this link with your group members.
              </p>

              <div className="vc-features">
                <div className="vc-feat">📹 HD Video</div>
                <div className="vc-feat">🎤 Audio</div>
                <div className="vc-feat">🖥️ Screen Share</div>
                <div className="vc-feat">💬 In-call Chat</div>
                <div className="vc-feat">👤 Up to 20 people</div>
                <div className="vc-feat">🔗 Persistent room</div>
              </div>

              <button className="vc-join-btn" onClick={joinCall}>
                🎥 Join video call
              </button>

              <div className="vc-room-url">
                Room: <a href={roomUrl} target="_blank" rel="noreferrer">{roomUrl}</a>
              </div>
            </div>
          </div>
        ) : (
          // ── ACTIVE CALL ──
          <div className="vc-call-wrap">
            <iframe
              ref={iframeRef}
              className="vc-iframe"
              src={`${roomUrl}?userName=${encodeURIComponent(user.user_metadata?.full_name || user.email)}`}
              allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
              title="Video Call"
            />
          </div>
        )}
      </div>
    </AppLayout>
  )
}
