// src/pages/GroupChatPage.jsx
// Phase 4 UPGRADED — attachments, YouTube embeds, reactions,
// edit/delete, message search, DMs between group members

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import './GroupChat.css'

const GRADIENTS = [
  ['#00d4c8','#4a7cf7'],['#8b5cf6','#4a7cf7'],['#f59e0b','#f43f5e'],
  ['#10b981','#4a7cf7'],['#f43f5e','#8b5cf6'],['#00d4c8','#10b981'],
  ['#4a7cf7','#8b5cf6'],['#f59e0b','#10b981'],
]
const QUICK_REACTIONS = ['👍','❤️','😂','😮','😢','🔥']

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
  if(d.toDateString()===now.toDateString()) return 'Today'
  if(d.toDateString()===yest.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})
}
function getYouTubeId(text){
  const m=text.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/)
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

export default function GroupChatPage(){
  const{id}=useParams()
  const{user}=useAuth()
  const navigate=useNavigate()

  const[group,setGroup]=useState(null)
  const[members,setMembers]=useState([])
  const[messages,setMessages]=useState([])
  const[input,setInput]=useState('')
  const[loading,setLoading]=useState(true)
  const[sending,setSending]=useState(false)
  const[isMember,setIsMember]=useState(false)
  const[showMembers,setShowMembers]=useState(true)
  const[atBottom,setAtBottom]=useState(true)
  const[newCount,setNewCount]=useState(0)
  const[searchOpen,setSearchOpen]=useState(false)
  const[searchQuery,setSearchQuery]=useState('')
  const[editingId,setEditingId]=useState(null)
  const[editText,setEditText]=useState('')
  const[reactionFor,setReactionFor]=useState(null)
  const[uploading,setUploading]=useState(false)
  const[uploadPrev,setUploadPrev]=useState(null)
  const[dmTarget,setDmTarget]=useState(null)
  const[dmMessages,setDmMessages]=useState([])
  const[dmInput,setDmInput]=useState('')

  const bottomRef=useRef(null)
  const scrollRef=useRef(null)
  const inputRef=useRef(null)
  const fileRef=useRef(null)
  const chanRef=useRef(null)
  const dmChanRef=useRef(null)

  useEffect(()=>{loadGroup()},[id])
  useEffect(()=>{if(atBottom){scrollToBottom('smooth');setNewCount(0)}},[messages])
  useEffect(()=>{if(dmTarget)loadDMs(dmTarget)},[dmTarget])
  useEffect(()=>{
    const fn=e=>{if(e.key==='Escape'){setReactionFor(null);setSearchOpen(false)}}
    window.addEventListener('keydown',fn)
    return()=>window.removeEventListener('keydown',fn)
  },[])

  async function loadGroup(){
    setLoading(true)
    const{data:g}=await supabase.from('groups')
      .select(`id,name,is_online,subjects(name,color,icon),group_members(user_id,role,joined_at,users(id,full_name,email))`)
      .eq('id',id).single()
    if(!g){navigate('/browse');return}
    setGroup(g);setMembers(g.group_members||[])
    setIsMember(!!g.group_members?.find(m=>m.user_id===user.id))
    const{data:msgs}=await supabase.from('messages')
      .select(`id,content,created_at,sender_id,attachment_url,attachment_name,attachment_type,edited_at,reactions,users(full_name,email)`)
      .eq('group_id',id).order('created_at',{ascending:true}).limit(200)
    if(msgs)setMessages(msgs)
    setLoading(false)
    setTimeout(()=>scrollToBottom('instant'),100)
    subscribe()
  }

  function subscribe(){
    chanRef.current?.unsubscribe()
    const ch=supabase.channel(`gc-${id}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`group_id=eq.${id}`},
        async p=>{
          const{data:s}=await supabase.from('users').select('full_name,email').eq('id',p.new.sender_id).single()
          const nm={...p.new,users:s}
          setMessages(prev=>prev.find(m=>m.id===nm.id)?prev:[...prev,nm])
          setAtBottom(prev=>{if(!prev&&p.new.sender_id!==user.id)setNewCount(c=>c+1);return prev})
        })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'messages',filter:`group_id=eq.${id}`},
        p=>{setMessages(prev=>prev.map(m=>m.id===p.new.id?{...m,...p.new}:m))})
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'messages',filter:`group_id=eq.${id}`},
        p=>{setMessages(prev=>prev.filter(m=>m.id!==p.old.id))})
      .subscribe()
    chanRef.current=ch
  }

  async function loadDMs(member){
    const cid=dmChanId(user.id,member.user_id)
    const{data}=await supabase.from('direct_messages')
      .select(`id,content,created_at,sender_id,users(full_name,email)`)
      .eq('channel_id',cid).order('created_at',{ascending:true}).limit(100)
    if(data)setDmMessages(data)
    dmChanRef.current?.unsubscribe()
    const ch=supabase.channel(`dm-${cid}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'direct_messages',filter:`channel_id=eq.${cid}`},
        async p=>{
          const{data:s}=await supabase.from('users').select('full_name,email').eq('id',p.new.sender_id).single()
          setDmMessages(prev=>[...prev,{...p.new,users:s}])
        })
      .subscribe()
    dmChanRef.current=ch
  }

  function scrollToBottom(b='smooth'){bottomRef.current?.scrollIntoView({behavior:b})}
  function handleScroll(){
    const el=scrollRef.current;if(!el)return
    const dist=el.scrollHeight-el.scrollTop-el.clientHeight
    const at=dist<80;setAtBottom(at);if(at)setNewCount(0)
  }

  async function sendMessage(){
    const text=input.trim()
    if((!text&&!uploadPrev)||sending||!isMember)return
    setSending(true);setInput('')
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

  async function sendDm(){
    if(!dmInput.trim()||!dmTarget)return
    const text=dmInput.trim();setDmInput('')
    const cid=dmChanId(user.id,dmTarget.user_id)
    await supabase.from('direct_messages').insert({channel_id:cid,sender_id:user.id,receiver_id:dmTarget.user_id,content:text})
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
    return{...item,isFirst:!prev||prev.type==='divider'||prev.sender_id!==item.sender_id}
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
              </div>
            </div>
          </div>
          <div className="ch-right">
            <button className={`ch-icon-btn${searchOpen?' active':''}`} onClick={()=>setSearchOpen(v=>!v)} title="Search">🔍</button>
            <button className={`ch-icon-btn${showMembers?' active':''}`} onClick={()=>setShowMembers(v=>!v)} title="Members">👥 {mc}</button>
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

        {/* BODY */}
        <div className="chat-body">
          <div className="chat-main">
            <div className="chat-scroll" ref={scrollRef} onScroll={handleScroll}>

              {!searchQuery&&(
                <div className="chat-welcome">
                  <div className="cw-icon" style={{background:subject?.color?subject.color+'22':'#eff4ff'}}>{subject?.icon||'📚'}</div>
                  <h2 className="cw-title">Welcome to <strong>{group.name}</strong></h2>
                  <p className="cw-sub">{isMember?'The beginning of your group conversation. Say hello! 👋':'Join to start chatting.'}</p>
                </div>
              )}

              {items.map((item,idx)=>{
                if(item.type==='divider')return(
                  <div key={`d${idx}`} className="date-divider">
                    <div className="dd-line"/><span className="dd-label">{item.label}</span><div className="dd-line"/>
                  </div>
                )
                const isMe=item.sender_id===user.id
                const name=dname(item.users)
                const reacts=item.reactions||{}
                const hasReacts=Object.values(reacts).some(a=>a.length>0)

                return(
                  <div key={item.id} className={`msg-row${item.isFirst?' msg-first':' msg-cont'}`}>
                    <div className="msg-av-col">
                      {item.isFirst
                        ?<div className="msg-av" style={{background:avatarGrad(item.sender_id)}}>{initials(name)}</div>
                        :<div className="msg-av-spacer"><span className="msg-hover-time">{fmtTime(item.created_at)}</span></div>
                      }
                    </div>
                    <div className="msg-content">
                      {item.isFirst&&(
                        <div className="msg-meta">
                          <span className={`msg-name${isMe?' msg-name-me':''}`}>{isMe?'You':name}</span>
                          <span className="msg-time">{fmtTime(item.created_at)}</span>
                          {item.edited_at&&<span className="msg-edited">(edited)</span>}
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
                    <div className="msg-actions">
                      <button className="ma-btn" onClick={()=>setReactionFor(reactionFor===item.id?null:item.id)} title="React">😊</button>
                      {isMe&&!editingId&&(
                        <>
                          <button className="ma-btn" onClick={()=>{setEditingId(item.id);setEditText(item.content||'')}} title="Edit">✏️</button>
                          <button className="ma-btn ma-del" onClick={()=>deleteMessage(item.id)} title="Delete">🗑️</button>
                        </>
                      )}
                    </div>
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

            {isMember?(
              <div className="chat-input-wrap">
                <div className="chat-input-box">
                  <div className="my-av" style={{background:avatarGrad(user.id)}}>
                    {initials(user.user_metadata?.full_name||user.email)}
                  </div>
                  <textarea ref={inputRef} className="chat-input"
                    placeholder={`Message ${group.name}…`}
                    value={input} onChange={e=>setInput(e.target.value)}
                    onKeyDown={handleKeyDown} rows={1} maxLength={2000} disabled={sending||uploading}/>
                  <input ref={fileRef} type="file" hidden
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                    onChange={handleFilePick}/>
                  <button className="attach-btn" onClick={()=>fileRef.current?.click()} title="Attach file" disabled={uploading}>
                    {uploading?<span className="spinner" style={{width:14,height:14,borderTopColor:'#00d4c8'}}/>:'📎'}
                  </button>
                  <button className={`chat-send${(input.trim()||uploadPrev)?' ready':''}`}
                    onClick={sendMessage} disabled={(!input.trim()&&!uploadPrev)||sending||uploading}>
                    {sending?<span className="spinner" style={{width:14,height:14,borderTopColor:'white'}}/>:'↑'}
                  </button>
                </div>
                <div className="chat-input-hint"><kbd>Enter</kbd> send · <kbd>Shift+Enter</kbd> new line · 📎 attach files (max 50 MB)</div>
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
              <div className="mp-header">Members<span className="mp-count">{mc}</span></div>
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
                      {!isMe&&<button className="mp-dm-btn" onClick={()=>setDmTarget(m)} title={`DM ${name}`}>💬</button>}
                    </div>
                  )
                })}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* DM MODAL */}
      {dmTarget&&(
        <div className="dm-overlay" onClick={()=>{setDmTarget(null);dmChanRef.current?.unsubscribe()}}>
          <div className="dm-modal" onClick={e=>e.stopPropagation()}>
            <div className="dm-header">
              <div className="dm-av" style={{background:avatarGrad(dmTarget.user_id)}}>{initials(dname(dmTarget.users))}</div>
              <div><div className="dm-name">{dname(dmTarget.users)}</div><div className="dm-sub">Direct Message</div></div>
              <button className="dm-close" onClick={()=>{setDmTarget(null);dmChanRef.current?.unsubscribe()}}>✕</button>
            </div>
            <div className="dm-messages">
              {dmMessages.length===0&&<div className="dm-empty">No messages yet. Say hello 👋</div>}
              {dmMessages.map(m=>{
                const isMe=m.sender_id===user.id
                return(
                  <div key={m.id} className={`dm-msg${isMe?' dm-me':''}`}>
                    {!isMe&&<div className="dm-msg-av" style={{background:avatarGrad(m.sender_id)}}>{initials(dname(m.users))}</div>}
                    <div className="dm-bubble">{m.content}</div>
                    <span className="dm-time">{fmtTime(m.created_at)}</span>
                  </div>
                )
              })}
            </div>
            <div className="dm-input-row">
              <input className="dm-input" placeholder="Type a message…" value={dmInput}
                onChange={e=>setDmInput(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();sendDm()}}}
                autoFocus/>
              <button className={`dm-send${dmInput.trim()?' ready':''}`} onClick={sendDm} disabled={!dmInput.trim()}>↑</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
