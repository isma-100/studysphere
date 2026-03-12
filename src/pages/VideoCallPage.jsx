// src/pages/VideoCallPage.jsx
import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import './VideoCall.css'

export default function VideoCallPage() {
  const { id }   = useParams()
  const { user } = useAuth()

  const [group,      setGroup]      = useState(null)
  const [roomUrl,    setRoomUrl]    = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [callActive, setCallActive] = useState(false)
  const [error,      setError]      = useState('')
  const [saving,     setSaving]     = useState(false)
  // Setup mode: 'choose' | 'url' | 'apikey'
  const [setupMode,  setSetupMode]  = useState('choose')
  const [manualUrl,  setManualUrl]  = useState('')
  const [apiKey,     setApiKey]     = useState('')
  const iframeRef = useRef(null)

  useEffect(() => { loadGroup() }, [id])

  async function loadGroup() {
    const { data: g } = await supabase
      .from('groups').select('id,name,subjects(name,icon,color)').eq('id', id).single()
    if (g) setGroup(g)

    const { data: settings } = await supabase
      .from('group_settings').select('daily_room_url').eq('group_id', id).single()

    if (settings?.daily_room_url) setRoomUrl(settings.daily_room_url)
    setLoading(false)
  }

  // Option A — user pastes a Daily.co room URL directly
  async function saveManualUrl() {
    const url = manualUrl.trim()
    if (!url) { setError('Please paste a room URL first.'); return }
    if (!url.includes('daily.co') && !url.startsWith('https://')) {
      setError('Please enter a valid Daily.co room URL (e.g. https://yourname.daily.co/room-name)')
      return
    }
    setSaving(true); setError('')
    await supabase.from('group_settings').upsert(
      { group_id: id, daily_room_url: url },
      { onConflict: 'group_id' }
    )
    setRoomUrl(url)
    setSaving(false)
  }

  // Option B — use API key to auto-create a room
  async function createRoomWithKey() {
    if (!apiKey.trim()) { setError('Please enter your Daily.co API key.'); return }
    setSaving(true); setError('')
    try {
      const roomName = `studysphere-${id}`.slice(0, 40)
      const res = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          name: roomName,
          properties: {
            enable_screenshare: true,
            enable_chat: true,
            max_participants: 20,
          }
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `API error ${res.status}`)
      }
      const room = await res.json()
      await supabase.from('group_settings').upsert(
        { group_id: id, daily_room_url: room.url },
        { onConflict: 'group_id' }
      )
      setRoomUrl(room.url)
    } catch (e) {
      setError(`Could not create room: ${e.message}`)
    }
    setSaving(false)
  }

  function joinCall() { setCallActive(true) }
  function leaveCall() { setCallActive(false) }

  const subject = group?.subjects

  if (loading) return (
    <AppLayout>
      <div className="vc-loading"><div className="spinner"/><p>Setting up call...</p></div>
    </AppLayout>
  )

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
            <button className="vc-leave-btn" onClick={leaveCall}>📵 Leave call</button>
          )}
        </div>

        {/* ── NO ROOM YET → SETUP ── */}
        {!roomUrl ? (
          <div className="vc-setup">
            <div className="vc-setup-card">
              <div className="vc-setup-icon">📹</div>
              <h2 className="vc-setup-title">Set Up Video Calls</h2>
              <p className="vc-setup-sub">
                StudySphere uses <strong>Daily.co</strong> for free HD video calls.
                This only needs to be set up once — after that, everyone in the group can join with one click.
              </p>

              {error && <div className="vc-error">⚠️ {error}</div>}

              {/* Choose method */}
              {setupMode === 'choose' && (
                <div className="vc-choose">
                  <button className="vc-option-btn" onClick={() => setSetupMode('url')}>
                    <span className="vob-icon">🔗</span>
                    <div>
                      <div className="vob-title">Paste a room URL</div>
                      <div className="vob-sub">Already have a Daily.co room? Paste the link directly — easiest option</div>
                    </div>
                  </button>
                  <button className="vc-option-btn" onClick={() => setSetupMode('apikey')}>
                    <span className="vob-icon">🔑</span>
                    <div>
                      <div className="vob-title">Create with API key</div>
                      <div className="vob-sub">Auto-create a room using your Daily.co API key</div>
                    </div>
                  </button>
                </div>
              )}

              {/* Option A — Paste URL */}
              {setupMode === 'url' && (
                <div className="vc-method">
                  <button className="vc-back-method" onClick={() => { setSetupMode('choose'); setError('') }}>← Back</button>
                  <div className="vc-steps">
                    <div className="vc-step"><span className="vc-step-n">1</span>
                      <div>Go to <a href="https://dashboard.daily.co/rooms" target="_blank" rel="noreferrer"><strong>dashboard.daily.co/rooms</strong></a> (free signup)</div>
                    </div>
                    <div className="vc-step"><span className="vc-step-n">2</span>
                      <div>Click <strong>Create room</strong> → copy the room URL</div>
                    </div>
                    <div className="vc-step"><span className="vc-step-n">3</span>
                      <div>Paste it below — looks like: <code>https://yourname.daily.co/room-name</code></div>
                    </div>
                  </div>
                  <div className="vc-key-row">
                    <input className="vc-key-input" type="url"
                      placeholder="https://yourname.daily.co/your-room"
                      value={manualUrl} onChange={e => { setManualUrl(e.target.value); setError('') }}
                      onKeyDown={e => e.key === 'Enter' && saveManualUrl()} />
                    <button className="vc-create-btn" onClick={saveManualUrl} disabled={!manualUrl.trim() || saving}>
                      {saving ? '⏳' : 'Save →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Option B — API Key */}
              {setupMode === 'apikey' && (
                <div className="vc-method">
                  <button className="vc-back-method" onClick={() => { setSetupMode('choose'); setError('') }}>← Back</button>
                  <div className="vc-steps">
                    <div className="vc-step"><span className="vc-step-n">1</span>
                      <div>Go to <a href="https://dashboard.daily.co/u/signup" target="_blank" rel="noreferrer"><strong>daily.co/signup</strong></a> — free</div>
                    </div>
                    <div className="vc-step"><span className="vc-step-n">2</span>
                      <div>Dashboard → <strong>Developers → API keys</strong> → copy your key</div>
                    </div>
                    <div className="vc-step"><span className="vc-step-n">3</span>
                      <div>Paste it below — a room is created automatically</div>
                    </div>
                  </div>
                  <div className="vc-key-row">
                    <input className="vc-key-input" type="password"
                      placeholder="Paste your Daily.co API key…"
                      value={apiKey} onChange={e => { setApiKey(e.target.value); setError('') }}
                      onKeyDown={e => e.key === 'Enter' && createRoomWithKey()} />
                    <button className="vc-create-btn" onClick={createRoomWithKey} disabled={!apiKey.trim() || saving}>
                      {saving ? '⏳' : 'Create room →'}
                    </button>
                  </div>
                  <p className="vc-key-note">🔒 Your key is only used once to create the room and is never stored.</p>
                </div>
              )}
            </div>
          </div>

        ) : !callActive ? (
          /* ── JOIN SCREEN ── */
          <div className="vc-join">
            <div className="vc-join-card">
              <div className="vc-join-icon">🎥</div>
              <h2 className="vc-join-title">{group?.name} — Video Room</h2>
              <p className="vc-join-sub">Full video, audio, screen share and chat.</p>
              <div className="vc-features">
                <div className="vc-feat">📹 HD Video</div>
                <div className="vc-feat">🎤 Audio</div>
                <div className="vc-feat">🖥️ Screen Share</div>
                <div className="vc-feat">💬 In-call Chat</div>
                <div className="vc-feat">👤 Up to 20 people</div>
                <div className="vc-feat">🔗 Persistent room</div>
              </div>
              <button className="vc-join-btn" onClick={joinCall}>🎥 Join video call</button>
              <div className="vc-room-url">
                Room: <a href={roomUrl} target="_blank" rel="noreferrer">{roomUrl}</a>
              </div>
              <button className="vc-reset-btn" onClick={async () => {
                await supabase.from('group_settings').update({ daily_room_url: null }).eq('group_id', id)
                setRoomUrl(null); setSetupMode('choose')
              }}>Change room URL</button>
            </div>
          </div>

        ) : (
          /* ── ACTIVE CALL ── */
          <div className="vc-call-wrap">
            <iframe ref={iframeRef} className="vc-iframe"
              src={`${roomUrl}?userName=${encodeURIComponent(user.user_metadata?.full_name || user.email)}`}
              allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
              title="Video Call" />
          </div>
        )}
      </div>
    </AppLayout>
  )
}
