// src/pages/GroupChatPage.jsx
// Phase 4 — Real-time group chat (Slack/Discord flat style)
// Full page layout: header | members sidebar | chat area

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import './GroupChat.css'

// ── Stable colour per user (from their id string) ──
const AVATAR_GRADIENTS = [
  ['#00d4c8','#4a7cf7'], ['#8b5cf6','#4a7cf7'], ['#f59e0b','#f43f5e'],
  ['#10b981','#4a7cf7'], ['#f43f5e','#8b5cf6'], ['#00d4c8','#10b981'],
  ['#4a7cf7','#8b5cf6'], ['#f59e0b','#10b981'],
]
function avatarGradient(userId = '') {
  const n = userId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const [a, b] = AVATAR_GRADIENTS[n % AVATAR_GRADIENTS.length]
  return `linear-gradient(135deg,${a},${b})`
}
function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}
function formatTime(ts) {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
function formatDateLabel(ts) {
  const d   = new Date(ts)
  const now = new Date()
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === now.toDateString())       return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
}

// ── Group messages by date for dividers ──
function groupByDate(msgs) {
  const groups = []
  let lastDate = null
  for (const msg of msgs) {
    const label = formatDateLabel(msg.created_at)
    if (label !== lastDate) {
      groups.push({ type: 'divider', label })
      lastDate = label
    }
    groups.push({ type: 'msg', ...msg })
  }
  return groups
}

export default function GroupChatPage() {
  const { id }   = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [group,        setGroup]        = useState(null)
  const [members,      setMembers]      = useState([])
  const [messages,     setMessages]     = useState([])
  const [input,        setInput]        = useState('')
  const [loading,      setLoading]      = useState(true)
  const [sending,      setSending]      = useState(false)
  const [isMember,     setIsMember]     = useState(false)
  const [showMembers,  setShowMembers]  = useState(true)
  const [atBottom,     setAtBottom]     = useState(true)
  const [newMsgCount,  setNewMsgCount]  = useState(0)

  const bottomRef    = useRef(null)
  const scrollRef    = useRef(null)
  const inputRef     = useRef(null)
  const channelRef   = useRef(null)

  // ── Initial load ──
  useEffect(() => {
    loadGroup()
    return () => { channelRef.current?.unsubscribe() }
  }, [id])

  async function loadGroup() {
    setLoading(true)

    // Fetch group + members
    const { data: g } = await supabase
      .from('groups')
      .select(`
        id, name, is_online,
        subjects ( name, color, icon ),
        group_members (
          user_id, role, joined_at,
          users ( id, full_name, email )
        )
      `)
      .eq('id', id)
      .single()

    if (!g) { navigate('/browse'); return }

    setGroup(g)
    setMembers(g.group_members || [])
    const me = g.group_members?.find(m => m.user_id === user.id)
    setIsMember(!!me)

    // Fetch last 100 messages
    const { data: msgs } = await supabase
      .from('messages')
      .select(`id, content, created_at, sender_id, users ( full_name, email )`)
      .eq('group_id', id)
      .order('created_at', { ascending: true })
      .limit(100)

    if (msgs) setMessages(msgs)
    setLoading(false)

    // Subscribe to new messages
    subscribeToMessages()

    // Scroll to bottom after render
    setTimeout(() => scrollToBottom('instant'), 100)
  }

  function subscribeToMessages() {
    channelRef.current?.unsubscribe()
    const channel = supabase
      .channel(`group-chat-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `group_id=eq.${id}`,
      }, async (payload) => {
        // Fetch the sender info for the new message
        const { data: sender } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', payload.new.sender_id)
          .single()

        const newMsg = { ...payload.new, users: sender }

        setMessages(prev => {
          // dedupe
          if (prev.find(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })

        // If scrolled up, show badge instead of forcing scroll
        setAtBottom(prev => {
          if (!prev && payload.new.sender_id !== user.id) {
            setNewMsgCount(c => c + 1)
          }
          return prev
        })
      })
      .subscribe()

    channelRef.current = channel
  }

  // ── Auto-scroll when messages change & user is at bottom ──
  useEffect(() => {
    if (atBottom) {
      scrollToBottom('smooth')
      setNewMsgCount(0)
    }
  }, [messages])

  function scrollToBottom(behavior = 'smooth') {
    bottomRef.current?.scrollIntoView({ behavior })
  }

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    const isAtBottom = distFromBottom < 80
    setAtBottom(isAtBottom)
    if (isAtBottom) setNewMsgCount(0)
  }

  // ── Send message ──
  async function sendMessage() {
    const text = input.trim()
    if (!text || sending || !isMember) return
    setSending(true)
    setInput('')
    inputRef.current?.focus()

    const { error } = await supabase.from('messages').insert({
      group_id:  id,
      sender_id: user.id,
      content:   text,
    })

    if (error) {
      setInput(text) // restore on error
      console.error(error)
    }
    setSending(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Join group ──
  async function handleJoin() {
    const { error } = await supabase
      .from('group_members')
      .insert({ group_id: id, user_id: user.id, role: 'member' })
    if (!error) {
      setIsMember(true)
      await loadGroup()
    }
  }

  if (loading) return (
    <AppLayout>
      <div className="chat-loading">
        <div className="spinner" />
        <p>Loading chat...</p>
      </div>
    </AppLayout>
  )

  if (!group) return null

  const subject      = group.subjects
  const memberCount  = members.length
  const displayName  = n => n?.full_name || n?.email?.split('@')[0] || 'Unknown'
  const items        = groupByDate(messages)

  // Group consecutive messages from same sender (for Slack-style compact grouping)
  const renderedItems = items.map((item, idx) => {
    if (item.type === 'divider') return item
    const prev = items[idx - 1]
    const isFirst = !prev || prev.type === 'divider' || prev.sender_id !== item.sender_id
    return { ...item, isFirst }
  })

  return (
    <AppLayout>
      <div className="chat-shell">

        {/* ── CHAT HEADER ── */}
        <div className="chat-header">
          <div className="ch-left">
            <Link to="/browse" className="ch-back">←</Link>
            <div className="ch-subject-dot" style={{ background: subject?.color || '#4a7cf7' }} />
            <div>
              <div className="ch-name">
                {subject?.icon} {group.name}
              </div>
              <div className="ch-meta">
                <span className="ch-online-dot" />
                <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                <span className="ch-sep">·</span>
                <span className={group.is_online ? 'ch-tag-teal' : 'ch-tag-blue'}>
                  {group.is_online ? '🌐 Online group' : '📍 In-person group'}
                </span>
              </div>
            </div>
          </div>
          <div className="ch-right">
            <button
              className={`ch-members-btn${showMembers ? ' active' : ''}`}
              onClick={() => setShowMembers(v => !v)}
              title="Toggle members list"
            >
              👥 {memberCount}
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="chat-body">

          {/* ── MESSAGES AREA ── */}
          <div className="chat-main">
            <div
              className="chat-scroll"
              ref={scrollRef}
              onScroll={handleScroll}
            >
              {/* Welcome banner */}
              <div className="chat-welcome">
                <div className="cw-icon" style={{ background: subject?.color ? subject.color + '22' : '#eff4ff' }}>
                  {subject?.icon || '📚'}
                </div>
                <h2 className="cw-title">Welcome to <strong>{group.name}</strong></h2>
                <p className="cw-sub">
                  This is the beginning of the {group.name} group chat.
                  {isMember ? ' Say hello! 👋' : ' Join to start chatting.'}
                </p>
              </div>

              {/* Messages */}
              {renderedItems.map((item, idx) => {
                if (item.type === 'divider') return (
                  <div key={`d-${idx}`} className="date-divider">
                    <div className="dd-line" />
                    <div className="dd-label">{item.label}</div>
                    <div className="dd-line" />
                  </div>
                )

                const isMe     = item.sender_id === user.id
                const name     = displayName(item.users)
                const grad     = avatarGradient(item.sender_id)

                return (
                  <div
                    key={item.id}
                    className={`msg-row${item.isFirst ? ' msg-first' : ' msg-cont'}`}
                  >
                    {/* Avatar (only on first in group) */}
                    <div className="msg-av-col">
                      {item.isFirst ? (
                        <div className="msg-av" style={{ background: grad }}>
                          {initials(name)}
                        </div>
                      ) : (
                        <div className="msg-av-spacer">
                          <span className="msg-hover-time">{formatTime(item.created_at)}</span>
                        </div>
                      )}
                    </div>

                    <div className="msg-content">
                      {item.isFirst && (
                        <div className="msg-meta">
                          <span className={`msg-name${isMe ? ' msg-name-me' : ''}`}>{isMe ? 'You' : name}</span>
                          <span className="msg-time">{formatTime(item.created_at)}</span>
                        </div>
                      )}
                      <div className={`msg-bubble${isMe ? ' msg-me' : ''}`}>
                        {item.content}
                      </div>
                    </div>
                  </div>
                )
              })}

              {messages.length === 0 && (
                <div className="chat-empty">
                  <p>No messages yet — be the first to say something! 👋</p>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Jump to bottom button */}
            {!atBottom && (
              <button
                className="jump-btn"
                onClick={() => { scrollToBottom(); setNewMsgCount(0) }}
              >
                {newMsgCount > 0
                  ? <><span className="jump-badge">{newMsgCount}</span> new message{newMsgCount > 1 ? 's' : ''} ↓</>
                  : '↓ Jump to bottom'
                }
              </button>
            )}

            {/* ── INPUT AREA ── */}
            {isMember ? (
              <div className="chat-input-wrap">
                <div className="chat-input-box">
                  <div className="my-av" style={{ background: avatarGradient(user.id) }}>
                    {initials(user.user_metadata?.full_name || user.email)}
                  </div>
                  <textarea
                    ref={inputRef}
                    className="chat-input"
                    placeholder={`Message ${group.name}…`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    maxLength={2000}
                    disabled={sending}
                  />
                  <button
                    className={`chat-send${input.trim() ? ' ready' : ''}`}
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    title="Send (Enter)"
                  >
                    {sending ? <span className="spinner" style={{ width: 14, height: 14, borderTopColor: 'white' }} /> : '↑'}
                  </button>
                </div>
                <div className="chat-input-hint">
                  Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
                </div>
              </div>
            ) : (
              <div className="chat-join-bar">
                <p>You're not a member of this group yet.</p>
                <button className="chat-join-btn" onClick={handleJoin}>
                  ＋ Join to chat
                </button>
              </div>
            )}
          </div>

          {/* ── MEMBERS SIDEBAR ── */}
          {showMembers && (
            <aside className="members-panel">
              <div className="mp-header">
                Members <span className="mp-count">{memberCount}</span>
              </div>
              <div className="mp-list">
                {members.map(m => {
                  const name = displayName(m.users)
                  return (
                    <div key={m.user_id} className="mp-member">
                      <div className="mp-av" style={{ background: avatarGradient(m.user_id) }}>
                        {initials(name)}
                      </div>
                      <div className="mp-info">
                        <div className="mp-name">
                          {m.user_id === user.id ? 'You' : name}
                        </div>
                        {m.role === 'admin' && <div className="mp-role">Admin</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </aside>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
