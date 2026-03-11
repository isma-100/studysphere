// src/components/DMWindow.jsx
// Floating DM chat window — real-time, optimistic, sound on receive

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

export default function DMWindow({ conv, onClose }) {
  const { sendDM, openConversation } = useDM()
  const { user } = useAuth()
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  const other = conv.otherUser
  const channelId = conv.channelId

  useEffect(() => {
    openConversation(channelId)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50)
    inputRef.current?.focus()
  }, [channelId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv.messages?.length])

  async function handleSend() {
    if (!input.trim()) return
    const text = input; setInput('')
    await sendDM(channelId, other?.id, text)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const messages = conv.messages || []

  return (
    <div className="dmw-root">
      {/* Header */}
      <div className="dmw-header">
        <div className="dmw-av" style={{ background: avatarGrad(other?.id||'') }}>
          {initials(dname(other))}
        </div>
        <div className="dmw-hinfo">
          <div className="dmw-name">{dname(other)}</div>
          <div className="dmw-status">Direct Message</div>
        </div>
        <button className="dmw-close" onClick={onClose} title="Close">✕</button>
      </div>

      {/* Messages */}
      <div className="dmw-messages">
        {messages.length === 0 && (
          <div className="dmw-empty">Start the conversation! 👋</div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === user.id
          const prev = messages[i - 1]
          const showAv = !isMe && (!prev || prev.sender_id !== msg.sender_id)
          return (
            <div key={msg.id} className={`dmw-msg${isMe ? ' me' : ''}`}>
              {!isMe && (
                <div className="dmw-msg-av-col">
                  {showAv
                    ? <div className="dmw-msg-av" style={{ background: avatarGrad(msg.sender_id) }}>{initials(dname(msg.sender))}</div>
                    : <div className="dmw-msg-av-space" />
                  }
                </div>
              )}
              <div className="dmw-bubble-col">
                <div className="dmw-bubble">{msg.content}</div>
                <div className="dmw-time">{fmtTime(msg.created_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="dmw-input-row">
        <input
          ref={inputRef}
          className="dmw-input"
          placeholder={`Message ${dname(other)}…`}
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
