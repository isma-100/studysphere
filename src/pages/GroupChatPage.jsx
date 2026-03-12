// src/pages/GroupChatPage.jsx
// Phase 7 — AI Study Assistant (@ai commands) + Session Scheduler

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useDM } from '../context/DMContext'
import AppLayout from '../components/AppLayout'
import SessionScheduler from '../components/SessionScheduler'
import AIAssistant from '../components/AIAssistant'
import './GroupChat.css'

const GRADIENTS = [
  ['#00d4c8','#4a7cf7'],['#8b5cf6','#4a7cf7'],['#f59e0b','#f43f5e'],
  ['#10b981','#4a7cf7'],['#f43f5e','#8b5cf6'],['#00d4c8','#10b981'],
  ['#4a7cf7','#8b5cf6'],['#f59e0b','#10b981'],
]
const QUICK_REACTIONS = ['👍','❤️','😂','😮','😢','🔥']
const AI_COMMANDS = [
  { cmd: '@ai ask',   desc: 'Ask a subject question' },
  { cmd: '@ai quiz',  desc: 'Generate a quiz from recent topics' },
  { cmd: '@ai explain', desc: 'Explain the last YouTube link' },
]

function avatarGrad(id=''){
  const n=id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)
  const [a,b]=GRADIENTS[n%GRADIENTS.length]
  return `linear-gradient(135deg,${a},${b})`
}
function initials(name=''){return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()||'?'}
function fmtTime(ts){return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
function fmtDateLabel(ts){
  const d=new Date(ts),now=new Date(),yest=new Date(now)
  yest.setDate(now.getDate()-1)
  if(d.toDateString()===now.toDateString())return 'Today'
  if(d.toDateString()===yest.toDateString())return 'Yesterday'
  return d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})
}
function getYouTubeId(text){
  const m=text?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
  return m?m[1]:null
}
const URL_RE=/https?:\/\/[^\s]+/g
function isImg(n=''){return/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(n)}
function isVid(n=''){return/\.(mp4|mov|webm|ogg)$/i.test(n)}
function fileIcon(n=''){
  if(isImg(n))return'🖼️';if(isVid(n))return'🎬'
  if(/\.pdf$/i.test(n))return'📄';if(/\.xlsx?$/i.test(n))return'📊'
  if(/\.pptx?$/i.test(n))return'📑';return'📎'
}
function groupByDate(msgs){
  const out=[];let last=null
  for(const m of msgs){
    const lbl=fmtDateLabel(m.created_at)
    if(lbl!==last){out.push({type:'divider',label:lbl});last=lbl}
    out.push({type:'msg',...m})
  }
  return out
}
async function uploadFile(file,groupId){
  const ext=file.name.split('.').pop()
  const path=`${groupId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const {error}=await supabase.storage.from('chat-attachments').upload(path,file)
  if(error)throw error
  const {data}=supabase.storage.from('chat-attachments').getPublicUrl(path)
  return{url:data.publicUrl,name:file.name,type:file.type}
}
function dmChanId(a,b){return[a,b].sort().join('__')}

// ── AI command detector ──
function parseAICommand(text) {
  const t = text.trim().toLowerCase()
  if (t.startsWith('@ai quiz'))   return { type:'quiz',    rest: text.slice(8).trim() }
  if (t.startsWith('@ai explain')) return { type:'explain', rest: text.slice(11).trim() }
  if (t.startsWith('@ai ask'))    return { type:'ask',     rest: text.slice(7).trim() }
  if (t.startsWith('@ai '))       return { type:'ask',     rest: text.slice(4).trim() }
  return null
}

async function callAI(command, messages, group) {
  const recentMsgs = messages.slice(-20).map(m =>
    `${m.users?.full_name||'User'}: ${m.content||'(attachment)'}`
  ).join('\n')

  const lastYtLink = messages.slice().reverse().find(m => getYouTubeId(m.content||''))
  const ytId = lastYtLink ? getYouTubeId(lastYtLink.content) : null

  let prompt = ''
  const subject = group.subjects?.name || 'General'

  if (command.type === 'quiz') {
    prompt = `You are a study assistant for a "${subject}" study group on StudySphere.

Recent conversation:
${recentMsgs}

Generate a fun 3-question multiple-choice quiz based on the topics discussed. Format exactly like:
**Quick Quiz! 📝**

**Q1: [question]**
A) [option]  B) [option]  C) [option]  D) [option]
✅ Answer: [letter] — [brief explanation]

**Q2: [question]**
...

Keep it educational and encouraging!`
  } else if (command.type === 'explain' && ytId) {
    prompt = `You are a study assistant for a "${subject}" study group. A student shared this YouTube video: https://youtube.com/watch?v=${ytId}

Without seeing the video, explain what studying "${subject}" typically involves, what key concepts are commonly covered, and give 3-5 study tips for mastering this subject. Be helpful, specific, and encouraging.

Format your response with clear sections and keep it concise.`
  } else {
    prompt = `You are StudySphere's AI study assistant embedded in a "${subject}" study group chat. You help students understand concepts, answer questions, and learn effectively.

Recent group conversation:
${recentMsgs}

Student's question: ${command.rest || 'Can you help us study?'}

Answer helpfully and concisely. Use emojis sparingly. If relevant, mention what they should look up or practice next. Max 3 paragraphs.`
  }

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    return '⚠️ AI is not configured. Add VITE_ANTHROPIC_API_KEY to your .env file to enable the AI tutor.'
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('AI API error:', err)
    return `⚠️ AI error (${res.status}): ${err?.error?.message || 'Please try again.'}`
  }

  const data = await res.json()
  return data.content?.[0]?.text || 'Sorry, I could not generate a response.'
}

export default function GroupChatPage(){
  const{id}=useParams()
  const{user}=useAuth()
  const navigate=useNavigate()
  const { getOrCreateConv, openConversation } = useDM()

  const[group,setGroup]=useState(null)
  const[members,setMembers]=useState([])
  const[messages,setMessages]=useState([])
  const[input,setInput]=useState('')
  const[loading,setLoading]=useState(true)
  const[sending,setSending]=useState(false)
  const[isMember,setIsMember]=useState(false)
  const[showMembers,setShowMembers]=useState(false)
  const[showScheduler,setShowScheduler]=useState(false)
  const[editingId,setEditingId]=useState(null)
  const[editText,setEditText]=useState('')
  const[uploadPrev,setUploadPrev]=useState(null)
  const[uploading,setUploading]=useState(false)
  const[reactionFor,setReactionFor]=useState(null)
  const[atBottom,setAtBottom]=useState(true)
  const[newCount,setNewCount]=useState(0)
  const[searchOpen,setSearchOpen]=useState(false)
  const[searchQuery,setSearchQuery]=useState('')
  const[dmTarget,setDmTarget]=useState(null)
  const[dmInput,setDmInput]=useState('')
  // AI state
  const[aiTyping,setAiTyping]=useState(false)
  const[showAiHint,setShowAiHint]=useState(false)

  const scrollRef=useRef()
  const bottomRef=useRef()
  const inputRef=useRef()
  const fileRef=useRef()

  useEffect(()=>{loadGroup()},[id])
  useEffect(()=>{
    if(!group)return
    loadMessages()
    const sub=supabase.channel(`group-${id}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'messages',filter:`group_id=eq.${id}`},
        payload=>{
          if(payload.eventType==='INSERT'){
            setMessages(prev=>{
              if(prev.find(m=>m.id===payload.new.id))return prev
              return[...prev,payload.new]
            })
            if(!atBottom)setNewCount(p=>p+1)
          }
          if(payload.eventType==='UPDATE')setMessages(prev=>prev.map(m=>m.id===payload.new.id?{...m,...payload.new}:m))
          if(payload.eventType==='DELETE')setMessages(prev=>prev.filter(m=>m.id!==payload.old.id))
        })
      .subscribe()
    return()=>{supabase.removeChannel(sub)}
  },[group])

  useEffect(()=>{if(atBottom)scrollToBottom('smooth')},[messages])
  useEffect(()=>{document.addEventListener('click',()=>setReactionFor(null));return()=>document.removeEventListener('click',()=>setReactionFor(null))},[])

  async function loadGroup(){
    const{data:g}=await supabase.from('groups')
      .select('id,name,description,is_online,max_members,subjects(id,name,color,icon)')
      .eq('id',id).single()
    if(!g){navigate('/browse');return}
    setGroup(g)
    const{data:mem}=await supabase.from('group_members')
      .select('user_id,role,joined_at,users(id,full_name,email,avatar_url)')
      .eq('group_id',id)
    if(mem){
      setMembers(mem)
      setIsMember(mem.some(m=>m.user_id===user.id))
    }
  }

  async function loadMessages(){
    const{data}=await supabase.from('messages')
      .select('id,content,created_at,sender_id,attachment_url,attachment_name,attachment_type,edited_at,reactions,is_ai,users(id,full_name,email)')
      .eq('group_id',id).order('created_at',{ascending:true}).limit(200)
    if(data)setMessages(data)
    setLoading(false)
    setTimeout(()=>scrollToBottom('instant'),50)
  }

  function handleOpenDM(member){
    const cid=dmChanId(user.id,member.user_id)
    const conv=getOrCreateConv(cid,member.users)
    openConversation(cid)
    setDmTarget({conv,member})
  }

  function scrollToBottom(b='smooth'){bottomRef.current?.scrollIntoView({behavior:b})}
  function handleScroll(){
    const el=scrollRef.current;if(!el)return
    const dist=el.scrollHeight-el.scrollTop-el.clientHeight
    const at=dist<80;setAtBottom(at);if(at)setNewCount(0)
  }

  // Handle @ai commands
  async function sendMessage(){
    const text=input.trim()
    if((!text&&!uploadPrev)||sending||!isMember)return
    setSending(true);setInput('');setShowAiHint(false)

    const aiCmd = text ? parseAICommand(text) : null

    if(aiCmd){
      // Post user's @ai message first
      await supabase.from('messages').insert({group_id:id,sender_id:user.id,content:text,reactions:{}})
      setSending(false)
      // Show AI typing indicator
      setAiTyping(true)
      try{
        const aiResponse = await callAI(aiCmd, messages, group)
        // Insert AI response as special message with is_ai flag
        await supabase.from('messages').insert({
          group_id:id,
          sender_id:user.id, // still uses user's ID (RLS), but marked as AI
          content:`🤖 **StudySphere AI**\n\n${aiResponse}`,
          reactions:{},
          is_ai:true,
        })
      }catch(e){
        await supabase.from('messages').insert({
          group_id:id,sender_id:user.id,
          content:'🤖 **StudySphere AI**\n\nSorry, I had trouble connecting. Please try again!',
          reactions:{},is_ai:true,
        })
      }
      setAiTyping(false)
      return
    }

    let att={}
    if(uploadPrev){
      try{
        setUploading(true)
        const r=await uploadFile(uploadPrev.file,id)
        att={attachment_url:r.url,attachment_name:r.name,attachment_type:r.type}
        setUploadPrev(null)
      }catch(e){console.error(e)}
      setUploading(false)
    }
    await supabase.from('messages').insert({group_id:id,sender_id:user.id,content:text||'',reactions:{},...att})
    setSending(false);inputRef.current?.focus()
  }

  function handleInputChange(e){
    const val=e.target.value
    setInput(val)
    setShowAiHint(val.startsWith('@ai') || val === '@')
  }

  function handleKeyDown(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}

  async function submitEdit(msgId){
    if(!editText.trim())return
    await supabase.from('messages').update({content:editText.trim(),edited_at:new Date().toISOString()}).eq('id',msgId)
    setEditingId(null);setEditText('')
  }

  async function deleteMessage(msgId){
    if(!window.confirm('Delete this message?'))return
    await supabase.from('messages').delete().eq('id',msgId)
  }

  async function addReaction(msgId,emoji){
    setReactionFor(null)
    const msg=messages.find(m=>m.id===msgId);if(!msg)return
    const reactions={...(msg.reactions||{})}
    const users=reactions[emoji]||[]
    if(users.includes(user.id)){
      reactions[emoji]=users.filter(u=>u!==user.id)
      if(!reactions[emoji].length)delete reactions[emoji]
    }else{reactions[emoji]=[...users,user.id]}
    await supabase.from('messages').update({reactions}).eq('id',msgId)
  }

  function handleFilePick(e){
    const file=e.target.files?.[0];if(!file)return
    if(file.size>50*1024*1024){alert('Max file size is 50 MB');return}
    const previewUrl=(isImg(file.name)||isVid(file.name))?URL.createObjectURL(file):null
    setUploadPrev({file,previewUrl});e.target.value=''
  }

  async function handleJoin(){
    await supabase.from('group_members').insert({group_id:id,user_id:user.id,role:'member'})
    setIsMember(true);await loadGroup()
  }

  function dname(u){return u?.full_name||u?.email?.split('@')[0]||'Unknown'}

  function renderAtt(msg){
    if(!msg.attachment_url)return null
    const name=msg.attachment_name||'file'
    if(isImg(name))return(
      <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="att-img-wrap">
        <img src={msg.attachment_url} alt={name} className="att-img"/>
      </a>
    )
    if(isVid(name))return(
      <video className="att-video" controls preload="metadata">
        <source src={msg.attachment_url}/>
      </video>
    )
    return(
      <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="att-file">
        <span className="att-file-icon">{fileIcon(name)}</span>
        <span className="att-file-name">{name}</span>
        <span className="att-file-dl">↓ Download</span>
      </a>
    )
  }

  function renderContent(msg){
    const text=msg.content
    if(!text)return null
    // AI messages — render with special styling (markdown-lite)
    if(msg.is_ai){
      const body = text.replace(/^🤖 \*\*StudySphere AI\*\*\n\n/,'')
      const lines = body.split('\n').map((line,i) => {
        if(line.startsWith('**')&&line.endsWith('**'))
          return<div key={i} className="ai-heading">{line.slice(2,-2)}</div>
        if(line.match(/^\*\*Q\d+:/))
          return<div key={i} className="ai-question">{line.replace(/\*\*/g,'')}</div>
        if(line.startsWith('✅'))
          return<div key={i} className="ai-answer">{line}</div>
        if(line.trim()==='')return<div key={i} style={{height:6}}/>
        return<div key={i} className="ai-line">{line.replace(/\*\*(.*?)\*\*/g,(_,t)=>t)}</div>
      })
      return<div className="ai-msg-body">{lines}</div>
    }
    const ytId=getYouTubeId(text)
    if(ytId)return(
      <div>
        <div className="msg-text">{text}</div>
        <div className="yt-wrap">
          <iframe className="yt-frame"
            src={`https://www.youtube.com/embed/${ytId}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen title="YouTube"/>
        </div>
      </div>
    )
    const parts=text.split(URL_RE)
    const urls=text.match(URL_RE)||[]
    if(urls.length){
      const nodes=[]
      parts.forEach((p,i)=>{
        nodes.push(<span key={`t${i}`}>{p}</span>)
        if(urls[i])nodes.push(<a key={`u${i}`} href={urls[i]} target="_blank" rel="noreferrer" className="msg-link">{urls[i]}</a>)
      })
      return<div className="msg-text">{nodes}</div>
    }
    return<div className="msg-text">{text}</div>
  }

  const filtered=searchQuery.trim()
    ?messages.filter(m=>m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    :messages

  const items=groupByDate(filtered).map((item,idx,arr)=>{
    if(item.type==='divider')return item
    const prev=arr[idx-1]
    return{...item,isFirst:!prev||prev.type==='divider'||prev.sender_id!==item.sender_id||item.is_ai}
  })

  if(loading)return(
    <AppLayout>
      <div className="chat-loading"><div className="spinner"/><p>Loading chat...</p></div>
    </AppLayout>
  )

  const subject=group?.subjects
  const mc=members.length

  return(
    <AppLayout>
      <div className="chat-shell">

        {/* HEADER */}
        <div className="chat-header">
          <div className="ch-left">
            <Link to="/browse" className="ch-back">←</Link>
            <div className="ch-dot" style={{background:subject?.color||'#4a7cf7'}}/>
            <div>
              <div className="ch-name">{subject?.icon} {group.name}</div>
              <div className="ch-meta">
                <span className="ch-green-dot"/>
                <span>{mc} member{mc!==1?'s':''}</span>
                <span className="ch-sep">·</span>
                <span className={group.is_online?'ch-teal':'ch-blue'}>{group.is_online?'🌐 Online':'📍 In-person'}</span>
                <span className="ch-sep">·</span>
                <span className="ch-subject-tag" style={{background:subject?.color+'18',color:subject?.color}}>{subject?.name}</span>
              </div>
            </div>
          </div>
          <div className="ch-right">
            <Link to={`/groups/${id}/call`} className="ch-icon-btn ch-call-btn" title="Start video call">📹 Call</Link>
            <button className={`ch-icon-btn${showScheduler?' active':''}`} onClick={()=>setShowScheduler(v=>!v)} title="Sessions">📅</button>
            <button className={`ch-icon-btn${searchOpen?' active':''}`} onClick={()=>setSearchOpen(v=>!v)} title="Search">🔍</button>
            <button className={`ch-icon-btn${showMembers?' active':''}`} onClick={()=>setShowMembers(v=>!v)} title="Members">👥 {mc}</button>
            <AIAssistant groupId={id} groupName={group.name} subject={subject?.name} recentMessages={messages.slice(-20).map(m=>({content:m.content,sender_name:m.users?.full_name}))} />
          </div>
        </div>

        {/* SEARCH BAR */}
        {searchOpen&&(
          <div className="search-bar">
            <span>🔍</span>
            <input autoFocus className="search-bar-inp" placeholder="Search messages…"
              value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
            {searchQuery&&<button className="search-clear" onClick={()=>setSearchQuery('')}>✕</button>}
            <span className="search-results">{filtered.length} result{filtered.length!==1?'s':''}</span>
          </div>
        )}

        {/* SESSION SCHEDULER PANEL */}
        {showScheduler&&<SessionScheduler groupId={id} isMember={isMember}/>}

        {/* BODY */}
        <div className="chat-body">
          <div className="chat-main">
            <div className="chat-scroll" ref={scrollRef} onScroll={handleScroll}>

              {!searchQuery&&(
                <div className="chat-welcome">
                  <div className="cw-icon" style={{background:subject?.color?subject.color+'22':'#eff4ff'}}>{subject?.icon||'📚'}</div>
                  <h2 className="cw-title">Welcome to <strong>{group.name}</strong></h2>
                  <p className="cw-sub">{isMember?<>The beginning of your study space. Say hello! 👋 Type <code>@ai</code> to ask the AI tutor.</>:'Join to start chatting.'}</p>
                </div>
              )}

              {items.map((item,idx)=>{
                if(item.type==='divider')return(
                  <div key={`d${idx}`} className="date-divider">
                    <div className="dd-line"/><span className="dd-label">{item.label}</span><div className="dd-line"/>
                  </div>
                )
                const isMe=item.sender_id===user.id
                const isAI=item.is_ai
                const name=dname(item.users)
                const reacts=item.reactions||{}
                const hasReacts=Object.values(reacts).some(a=>a.length>0)

                return(
                  <div key={item.id} className={`msg-row${item.isFirst?' msg-first':' msg-cont'}${isAI?' msg-ai-row':''}`}>
                    <div className="msg-av-col">
                      {item.isFirst
                        ?isAI
                          ?<div className="msg-av ai-av">✦</div>
                          :<div className="msg-av" style={{background:avatarGrad(item.sender_id)}}>{initials(name)}</div>
                        :<div className="msg-av-spacer"><span className="msg-hover-time">{fmtTime(item.created_at)}</span></div>
                      }
                    </div>
                    <div className={`msg-content${isAI?' ai-content-wrap':''}`}>
                      {item.isFirst&&(
                        <div className="msg-meta">
                          {isAI
                            ?<span className="msg-name ai-name">✦ StudySphere AI</span>
                            :<span className={`msg-name${isMe?' msg-name-me':''}`}>{isMe?'You':name}</span>
                          }
                          <span className="msg-time">{fmtTime(item.created_at)}</span>
                          {item.edited_at&&!isAI&&<span className="msg-edited">(edited)</span>}
                        </div>
                      )}
                      {editingId===item.id?(
                        <div className="edit-wrap">
                          <textarea className="edit-inp" value={editText}
                            onChange={e=>setEditText(e.target.value)}
                            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submitEdit(item.id)}if(e.key==='Escape')setEditingId(null)}}
                            autoFocus rows={2}/>
                          <div className="edit-actions">
                            <button className="edit-save" onClick={()=>submitEdit(item.id)}>Save</button>
                            <button className="edit-cancel" onClick={()=>setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ):(
                        <>{renderContent(item)}{renderAtt(item)}</>
                      )}
                      {hasReacts&&(
                        <div className="reactions-row">
                          {Object.entries(reacts).map(([emoji,users])=>
                            users.length>0&&(
                              <button key={emoji} className={`reaction-chip${users.includes(user.id)?' mine':''}`}
                                onClick={()=>addReaction(item.id,emoji)}>
                                {emoji}<span>{users.length}</span>
                              </button>
                            )
                          )}
                        </div>
                      )}
                    </div>
                    {!isAI&&(
                      <div className="msg-actions">
                        <button className="ma-btn" onClick={()=>setReactionFor(reactionFor===item.id?null:item.id)} title="React">😊</button>
                        {isMe&&!editingId&&(
                          <>
                            <button className="ma-btn" onClick={()=>{setEditingId(item.id);setEditText(item.content||'')}} title="Edit">✏️</button>
                            <button className="ma-btn ma-del" onClick={()=>deleteMessage(item.id)} title="Delete">🗑️</button>
                          </>
                        )}
                      </div>
                    )}
                    {reactionFor===item.id&&(
                      <div className="reaction-picker" onClick={e=>e.stopPropagation()}>
                        {QUICK_REACTIONS.map(e=>(
                          <button key={e} className="rp-emoji" onClick={()=>addReaction(item.id,e)}>{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* AI typing indicator */}
              {aiTyping&&(
                <div className="msg-row msg-first msg-ai-row">
                  <div className="msg-av-col"><div className="msg-av ai-av">✦</div></div>
                  <div className="msg-content ai-content-wrap">
                    <div className="msg-meta"><span className="msg-name ai-name">✦ StudySphere AI</span></div>
                    <div className="ai-typing"><span/><span/><span/></div>
                  </div>
                </div>
              )}

              {filtered.length===0&&searchQuery&&(
                <div className="chat-empty">No messages match "<strong>{searchQuery}</strong>"</div>
              )}
              <div ref={bottomRef}/>
            </div>

            {!atBottom&&(
              <button className="jump-btn" onClick={()=>{scrollToBottom();setNewCount(0)}}>
                {newCount>0?<><span className="jump-badge">{newCount}</span>new message{newCount>1?'s':''} ↓</>:'↓ Jump to bottom'}
              </button>
            )}

            {uploadPrev&&(
              <div className="upload-preview">
                {uploadPrev.previewUrl&&isImg(uploadPrev.file.name)
                  ?<img src={uploadPrev.previewUrl} className="up-thumb" alt="preview"/>
                  :<span className="up-file-icon">{fileIcon(uploadPrev.file.name)}</span>
                }
                <span className="up-name">{uploadPrev.file.name}</span>
                <button className="up-remove" onClick={()=>setUploadPrev(null)}>✕</button>
              </div>
            )}

            {/* @ai command hint */}
            {showAiHint&&isMember&&(
              <div className="ai-hint-panel">
                <div className="ai-hint-title">✦ AI Study Assistant</div>
                {AI_COMMANDS.map(c=>(
                  <button key={c.cmd} className="ai-hint-cmd" onClick={()=>{setInput(c.cmd+' ');setShowAiHint(false);inputRef.current?.focus()}}>
                    <code>{c.cmd}</code><span>{c.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {isMember?(
              <div className="chat-input-wrap">
                <div className="chat-input-box">
                  <div className="my-av" style={{background:avatarGrad(user.id)}}>
                    {initials(user.user_metadata?.full_name||user.email)}
                  </div>
                  <textarea ref={inputRef} className="chat-input"
                    placeholder={`Message ${group.name}… or type @ai to ask the AI tutor`}
                    value={input} onChange={handleInputChange}
                    onKeyDown={handleKeyDown} rows={1} maxLength={2000} disabled={sending||uploading||aiTyping}/>
                  <input ref={fileRef} type="file" hidden
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFilePick}/>
                  <button className="attach-btn" onClick={()=>fileRef.current?.click()} title="Attach file" disabled={uploading}>
                    {uploading?<span className="spinner" style={{width:14,height:14,borderTopColor:'#00d4c8'}}/>:'📎'}
                  </button>
                  <button className={`chat-send${(input.trim()||uploadPrev)?' ready':''}`}
                    onClick={sendMessage} disabled={(!input.trim()&&!uploadPrev)||sending||uploading||aiTyping}>
                    {sending||aiTyping?<span className="spinner" style={{width:14,height:14,borderTopColor:'white'}}/>:'↑'}
                  </button>
                </div>
                <div className="chat-input-hint"><kbd>Enter</kbd> send · <kbd>Shift+Enter</kbd> new line · 📎 attach · <kbd>@ai</kbd> AI tutor</div>
              </div>
            ):(
              <div className="chat-join-bar">
                <p>You're not a member of this group yet.</p>
                <button className="chat-join-btn" onClick={handleJoin}>＋ Join to chat</button>
              </div>
            )}
          </div>

          {showMembers&&(
            <aside className="members-panel">
              <div className="mp-header">
                Members <span className="mp-count">{mc}</span>
                <button className="mp-close-btn" onClick={()=>setShowMembers(false)} title="Close">✕</button>
              </div>
              <div className="mp-list">
                {members.map(m=>{
                  const name=dname(m.users)
                  const isMe=m.user_id===user.id
                  return(
                    <div key={m.user_id} className="mp-member">
                      <div className="mp-av" style={{background:avatarGrad(m.user_id)}}>{initials(name)}</div>
                      <div className="mp-info">
                        <div className="mp-name">{isMe?'You':name}</div>
                        {m.role==='admin'&&<div className="mp-role">Admin</div>}
                      </div>
                      {!isMe&&(
                        <button className="mp-dm-btn" onClick={()=>handleOpenDM(m)} title={`Message ${name}`}>
                          💬 DM
                        </button>
                      )}
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
