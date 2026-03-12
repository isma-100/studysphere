// src/components/DMWindow.jsx
// Floating DM chat window
// — reads live data from DMContext (instant optimistic updates)
// — also subscribes to its own Supabase channel so BOTH sides get real-time delivery

import { useEffect, useRef, useState } from 'react'
import { useDM } from '../context/DMContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../supabaseClient'
import './DMWindow.css'

const GRADIENTS = [
  ['#00d4c8','#4a7cf7'],['#8b5cf6','#4a7cf7'],['#f59e0b','#f43f5e'],
  ['#10b981','#4a7cf7'],['#f43f5e','#8b5cf6'],['#00d4c8','#10b981'],
]
function avatarGrad(id='') {
  const n = id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)
  const [a,b] = GRADIENTS[n % GRADIENTS.length]
  return `linear-gradient(135deg,${a},${b})`
}
function initials(name='') { return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?' }
function dname(u) { return u?.full_name||u?.email?.split('@')[0]||'Unknown' }
function fmtTime(ts) { return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }

export default function DMWindow({ conv: initialConv, onClose }) {
  const { conversations, sendDM, openConversation } = useDM()
  const { user } = useAuth()
  const [input, setInput]   = useState('')
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const subRef    = useRef(null)

  const channelId = initialConv?.channelId
  const otherUser = initialConv?.otherUser

  // Always read the freshest messages from context
  const liveConv  = conversations[channelId] || initialConv || { messages:[] }
  const messages  = liveConv.messages || []

  useEffect(() => {
    if (!channelId) return
    openConversation(channelId)
    subscribeToChannel()
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior:'instant' })
      inputRef.current?.focus()
    }, 50)
    return () => subRef.current?.unsubscribe()
  }, [channelId])

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [messages.length])

  // Subscribe to ALL messages in this channel (both directions)
  // This means the sender also sees their own message confirmed in real-time
  // and the receiver gets it instantly even if DMContext inbox missed it
  function subscribeToChannel() {
    subRef.current?.unsubscribe()
    subRef.current = supabase
      .channel(`dm-window-${channelId}`)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'direct_messages',
        filter: `channel_id=eq.${channelId}`,
      }, async (payload) => {
        const msg = payload.new
        // Skip if it's our own message — already handled optimistically
        if (msg.sender_id === user.id) return

        // Fetch sender info for the incoming message
        const { data: sender } = await supabase
          .from('users').select('id,full_name,email').eq('id', msg.sender_id).single()

        const enriched = { ...msg, sender }

        // Inject into the conversation in DMContext
        openConversation(channelId) // mark as read since window is open
        // We use a custom event to push the message into DMContext
        // since we can't call setConversations directly here
        window.dispatchEvent(new CustomEvent('dm-incoming', {
          detail: { channelId, message: enriched, otherUser: sender }
        }))
      })
      .subscribe()
  }

  async function handleSend() {
    if (!input.trim()) return
    const text = input
    setInput('')
    await sendDM(channelId, otherUser?.id, text)
  }

  function handleKey(e) {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="dmw-root">

      {/* Header */}
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

      {/* Messages */}
      <div className="dmw-messages">
        {messages.length === 0 && (
          <div className="dmw-empty">Start the conversation! 👋</div>
        )}
        {messages.map((msg, i) => {
          const isMe   = msg.sender_id === user.id
          const prev   = messages[i-1]
          const showAv = !isMe && (!prev || prev.sender_id !== msg.sender_id)
          const isTemp = String(msg.id).startsWith('temp-')
          return (
            <div key={msg.id} className={`dmw-msg${isMe?' me':''}${isTemp?' sending':''}`}>
              {!isMe && (
                <div className="dmw-msg-av-col">
                  {showAv
                    ? <div className="dmw-msg-av" style={{ background: avatarGrad(msg.sender_id) }}>
                        {initials(dname(msg.sender))}
                      </div>
                    : <div className="dmw-msg-av-space"/>
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
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
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
          className={`dmw-send${input.trim()?' ready':''}`}
          onClick={handleSend}
          disabled={!input.trim()}
        >↑</button>
      </div>

    </div>
  )
}
