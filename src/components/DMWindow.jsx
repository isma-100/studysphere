// src/components/DMWindow.jsx
// Floating DM chat window — always reads live data from DMContext
// so messages appear instantly without needing to close/reopen

import { useEffect, useRef, useState } from 'react'
import { useDM } from '../context/DMContext'
import { useAuth } from '../context/AuthContext'
import './DMWindow.css'

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
function fmtTime(ts) { return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }

export default function DMWindow({ conv: initialConv, onClose }) {
  // ── KEY FIX: read live conversation from context, not from the stale prop ──
  // initialConv gives us channelId + otherUser to identify the conversation.
  // After that we always read messages from `conversations[channelId]` so any
  // optimistic update or incoming realtime message appears immediately.
  const { conversations, sendDM, openConversation } = useDM()
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const channelId = initialConv?.channelId
  const otherUser = initialConv?.otherUser

  // Always get the freshest version of this conversation from context
  const liveConv = conversations[channelId] || initialConv || { messages: [] }
  const messages = liveConv.messages || []

  // Mark conversation as open (clears unread) and focus input
  useEffect(() => {
    if (channelId) openConversation(channelId)
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      inputRef.current?.focus()
    }, 50)
  }, [channelId])

  // Auto-scroll to bottom whenever a new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    if (!input.trim()) return
    const text = input
    setInput('') // clear immediately so it feels instant
    await sendDM(channelId, otherUser?.id, text)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="dmw-root">

      {/* ── Header ── */}
      <div className="dmw-header">
        <div className="dmw-av" style={{ background: avatarGrad(otherUser?.id||'') }}>
          {initials(dname(otherUser))}
        </div>
        <div className="dmw-hinfo">
          <div className="dmw-name">{dname(otherUser)}</div>
          <div className="dmw-status">Direct Message</div>
        </div>
        <button className="dmw-close" onClick={onClose} title="Close">✕</button>
      </div>

      {/* ── Messages ── */}
      <div className="dmw-messages">
        {messages.length === 0 && (
          <div className="dmw-empty">Start the conversation! 👋</div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user.id
          const prev = messages[i - 1]
          const showAv = !isMe && (!prev || prev.sender_id !== msg.sender_id)
          const isTemp = String(msg.id).startsWith('temp-')
          return (
            <div key={msg.id} className={`dmw-msg${isMe ? ' me' : ''}${isTemp ? ' sending' : ''}`}>
              {!isMe && (
                <div className="dmw-msg-av-col">
                  {showAv
                    ? <div className="dmw-msg-av" style={{ background: avatarGrad(msg.sender_id) }}>
                        {initials(dname(msg.sender))}
                      </div>
                    : <div className="dmw-msg-av-space" />
                  }
                </div>
              )}
              <div className="dmw-bubble-col">
                <div className="dmw-bubble">{msg.content}</div>
                <div className="dmw-time">
                  {fmtTime(msg.created_at)}
                  {isMe && <span className="dmw-tick">{isTemp ? ' ○' : ' ✓'}</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="dmw-input-row">
        <input
          ref={inputRef}
          className="dmw-input"
          placeholder={`Message ${dname(otherUser)}…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          maxLength={2000}
        />
        <button
          className={`dmw-send${input.trim() ? ' ready' : ''}`}
          onClick={handleSend}
          disabled={!input.trim()}
        >↑</button>
      </div>

    </div>
  )
}
