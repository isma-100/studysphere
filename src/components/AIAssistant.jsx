// src/components/AIAssistant.jsx
// Floating AI panel inside group chat — /ask, /quiz, /explain
import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import './AIAssistant.css'

const MODES = {
  ask:     { icon:'🎓', label:'Ask Tutor',  color:'#4a7cf7', placeholder:'Ask anything about this topic…' },
  quiz:    { icon:'📝', label:'Quiz Me',    color:'#8b5cf6', placeholder:'Topic to quiz you on (or leave blank for recent chat)…' },
  explain: { icon:'💡', label:'Explain',    color:'#f59e0b', placeholder:'Paste a concept, term, or YouTube URL to explain…' },
}

function TypingDots() {
  return (
    <div className="ai-typing">
      <span/><span/><span/>
    </div>
  )
}

export default function AIAssistant({ groupId, groupName, subject, recentMessages = [] }) {
  const { user } = useAuth()
  const [open,    setOpen]    = useState(false)
  const [mode,    setMode]    = useState('ask')
  const [input,   setInput]   = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' })
  }, [history, loading])

  async function handleSubmit() {
    const q = input.trim()
    if (!q && mode !== 'quiz') return
    setInput('')
    const userMsg = { role:'user', text: q || `Quiz me on ${subject || 'recent topics'}` }
    setHistory(h => [...h, userMsg])
    setLoading(true)

    // Build prompt based on mode
    const recentCtx = recentMessages.slice(-15)
      .map(m => `${m.sender_name || 'Member'}: ${m.content}`)
      .join('\n')

    let systemPrompt = `You are StudySphere's AI study assistant embedded in a group called "${groupName}" studying "${subject || 'general topics'}". Be helpful, clear, encouraging, and concise. Use markdown formatting sparingly.`

    let userPrompt = ''
    if (mode === 'ask') {
      userPrompt = `The student asks: "${q}"\n\nRecent group chat context:\n${recentCtx}\n\nAnswer the question as a knowledgeable tutor. Keep it under 200 words unless a longer explanation is truly needed.`
    } else if (mode === 'quiz') {
      const topic = q || `topics from this recent group chat:\n${recentCtx}`
      userPrompt = `Generate a short quiz (3-5 questions) on: ${topic}\n\nFormat: numbered questions with multiple choice options (A/B/C/D). After all questions, add "---ANSWERS---" with the correct answers and brief explanations. Make it appropriately challenging.`
    } else if (mode === 'explain') {
      const isYouTube = q.includes('youtube.com') || q.includes('youtu.be')
      if (isYouTube) {
        userPrompt = `A student shared this YouTube link: ${q}\n\nBased on the URL, make your best guess about the video topic and explain the likely subject matter clearly. Note you can't watch the video but offer a helpful explanation of what the topic likely covers, and suggest 2-3 key concepts they should look out for.`
      } else {
        userPrompt = `Explain this concept clearly for a student: "${q}"\n\nContext: They're studying ${subject || 'this topic'} in the group "${groupName}".\n\nGive a clear explanation with: 1) a simple definition, 2) a real-world example, 3) why it matters. Keep it under 250 words.`
      }
    }

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role:'user', content: userPrompt }]
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Sorry, I had trouble with that. Try again!'
      setHistory(h => [...h, { role:'ai', text: reply, mode }])

      // Log to DB (best-effort)
      supabase.from('ai_messages').insert({
        group_id: groupId, user_id: user.id,
        prompt: q || `quiz:${subject}`, response: reply, mode
      }).then(() => {})

    } catch(err) {
      setHistory(h => [...h, { role:'ai', text:'⚠️ Connection error. Please try again.', mode:'ask' }])
    }
    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  // Format AI response with basic markdown
  function renderText(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^(\d+)\. /gm, '<br/><strong>$1.</strong> ')
      .replace(/^- /gm, '<br/>• ')
      .replace(/---ANSWERS---/g, '<hr/><strong>✅ Answers</strong><br/>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <>
      {/* Trigger button */}
      <button className={`ai-trigger${open?' active':''}`} onClick={() => setOpen(o=>!o)} title="AI Study Assistant">
        <span className="ai-trigger-icon">🤖</span>
        <span className="ai-trigger-label">AI Assistant</span>
      </button>

      {/* Panel */}
      {open && (
        <div className="ai-panel">
          <div className="ai-panel-header">
            <div className="ai-header-left">
              <span className="ai-h-icon">🤖</span>
              <div>
                <div className="ai-h-title">AI Study Assistant</div>
                <div className="ai-h-sub">{groupName}</div>
              </div>
            </div>
            <button className="ai-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Mode tabs */}
          <div className="ai-modes">
            {Object.entries(MODES).map(([key, m]) => (
              <button key={key}
                className={`ai-mode-btn${mode===key?' active':''}`}
                style={mode===key ? {background:m.color+'18', borderColor:m.color+'50', color:m.color} : {}}
                onClick={() => { setMode(key); inputRef.current?.focus() }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {/* Chat history */}
          <div className="ai-history">
            {history.length === 0 && (
              <div className="ai-welcome">
                <div className="ai-welcome-icon">✨</div>
                <p>Hi! I'm your AI study assistant for <strong>{groupName}</strong>.</p>
                <div className="ai-suggestions">
                  {mode==='ask'  && ['What is a derivative?','Explain Big O notation','How does photosynthesis work?'].map(s=>(
                    <button key={s} className="ai-sugg" onClick={()=>{setInput(s);inputRef.current?.focus()}}>{s}</button>
                  ))}
                  {mode==='quiz'  && ['Quiz me on everything','Quiz me on key formulas','Make it hard'].map(s=>(
                    <button key={s} className="ai-sugg" onClick={()=>{setInput(s);inputRef.current?.focus()}}>{s}</button>
                  ))}
                  {mode==='explain' && ['Recursion','Neural networks','Supply and demand'].map(s=>(
                    <button key={s} className="ai-sugg" onClick={()=>{setInput(s);inputRef.current?.focus()}}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {history.map((msg, i) => (
              <div key={i} className={`ai-msg ai-msg-${msg.role}`}>
                {msg.role === 'ai' && (
                  <div className="ai-msg-avatar" style={{background: MODES[msg.mode]?.color+'20'}}>
                    {MODES[msg.mode]?.icon || '🤖'}
                  </div>
                )}
                <div className={`ai-bubble ai-bubble-${msg.role}`}
                  dangerouslySetInnerHTML={msg.role==='ai' ? {__html: renderText(msg.text)} : undefined}>
                  {msg.role === 'user' ? msg.text : undefined}
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-msg ai-msg-ai">
                <div className="ai-msg-avatar">🤖</div>
                <div className="ai-bubble ai-bubble-ai"><TypingDots /></div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div className="ai-input-row">
            <textarea ref={inputRef}
              className="ai-input"
              value={input}
              onChange={e=>setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={MODES[mode].placeholder}
              rows={2}
              disabled={loading}
            />
            <button className="ai-send"
              onClick={handleSubmit}
              disabled={loading || (!input.trim() && mode !== 'quiz')}
              style={{background: MODES[mode].color}}>
              {loading ? <span className="ai-spin"/> : '↑'}
            </button>
          </div>
          <div className="ai-footer">Powered by Claude · ⌨️ Enter to send</div>
        </div>
      )}
    </>
  )
}
