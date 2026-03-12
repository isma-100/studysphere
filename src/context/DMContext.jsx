// src/context/DMContext.jsx
// Global DM context — real-time, optimistic, both-sides delivery

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './AuthContext'

const DMContext = createContext({})
export const useDM = () => useContext(DMContext)

function playBeep() {
  try {
    const ctx  = new (window.AudioContext||window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime+0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.3)
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.3)
  } catch(e) {}
}

export function DMProvider({ children }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState({})
  const [totalUnread,   setTotalUnread]   = useState(0)
  const [activeConvId,  setActiveConvId]  = useState(null)
  const channelRef    = useRef(null)
  const activeConvRef = useRef(null)

  useEffect(() => {
    const total = Object.values(conversations).reduce((s,c)=>s+(c.unread||0),0)
    setTotalUnread(total)
  }, [conversations])

  useEffect(() => { activeConvRef.current = activeConvId }, [activeConvId])

  useEffect(() => {
    if (!user) return
    loadAllConversations()
    subscribeToIncoming()
    // Listen for messages injected from DMWindow's per-channel subscription
    window.addEventListener('dm-incoming', handleDMIncoming)
    return () => {
      channelRef.current?.unsubscribe()
      window.removeEventListener('dm-incoming', handleDMIncoming)
    }
  }, [user?.id])

  // Inject a message coming from DMWindow's channel subscription
  function handleDMIncoming(e) {
    const { channelId, message, otherUser } = e.detail
    setConversations(prev => {
      const conv = prev[channelId] || { messages:[], otherUser, unread:0, channelId }
      // Avoid duplicates
      if (conv.messages.some(m => m.id === message.id)) return prev
      const isActive = activeConvRef.current === channelId
      return {
        ...prev,
        [channelId]: {
          ...conv,
          otherUser: otherUser || conv.otherUser,
          messages: [...conv.messages, message],
          unread: isActive ? 0 : (conv.unread||0)+1,
        }
      }
    })
  }

  async function loadAllConversations() {
    const { data } = await supabase
      .from('direct_messages')
      .select(`id, channel_id, content, created_at, sender_id, receiver_id,
        sender:users!direct_messages_sender_id_fkey(id,full_name,email),
        receiver:users!direct_messages_receiver_id_fkey(id,full_name,email)`)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending:true })
    if (!data) return
    const convMap = {}
    for (const msg of data) {
      const cid   = msg.channel_id
      const other = msg.sender_id===user.id ? msg.receiver : msg.sender
      if (!convMap[cid]) convMap[cid] = { messages:[], otherUser:other, unread:0, channelId:cid }
      convMap[cid].messages.push(msg)
    }
    setConversations(convMap)
  }

  // Subscribe to incoming DMs where I am the receiver (for notifications + unread badge)
  function subscribeToIncoming() {
    channelRef.current?.unsubscribe()
    const ch = supabase
      .channel(`dm-inbox-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema:'public', table:'direct_messages',
        filter: `receiver_id=eq.${user.id}`,
      }, async (payload) => {
        const msg = payload.new
        const { data: sender } = await supabase
          .from('users').select('id,full_name,email').eq('id', msg.sender_id).single()
        const enriched = { ...msg, sender, receiver:{ id:user.id } }
        const cid = msg.channel_id

        setConversations(prev => {
          const conv = prev[cid] || { messages:[], otherUser:sender, unread:0, channelId:cid }
          if (conv.messages.some(m => m.id===msg.id)) return prev
          const isActive = activeConvRef.current===cid
          return {
            ...prev,
            [cid]: {
              ...conv,
              otherUser: sender,
              messages: [...conv.messages, enriched],
              unread: isActive ? 0 : (conv.unread||0)+1,
            }
          }
        })
        if (activeConvRef.current !== cid) {
          playBeep()
          showNotification(sender, msg.content)
        }
      })
      .subscribe()
    channelRef.current = ch
  }

  function showNotification(sender, content) {
    if (!('Notification' in window)) return
    if (Notification.permission==='granted') {
      new Notification(`💬 ${sender?.full_name||sender?.email?.split('@')[0]||'Someone'}`, {
        body: content, icon:'/favicon.ico',
      })
    } else if (Notification.permission!=='denied') {
      Notification.requestPermission()
    }
  }

  function openConversation(channelId) {
    setActiveConvId(channelId)
    setConversations(prev => ({
      ...prev,
      [channelId]: { ...(prev[channelId]||{}), unread:0 }
    }))
  }

  function closeConversation() { setActiveConvId(null) }

  async function sendDM(channelId, receiverId, content) {
    if (!content?.trim()) return
    const tempId  = `temp-${Date.now()}`
    const tempMsg = {
      id: tempId, channel_id:channelId,
      sender_id:user.id, receiver_id:receiverId,
      content:content.trim(),
      created_at: new Date().toISOString(),
      sender:{ id:user.id, full_name:user.user_metadata?.full_name, email:user.email },
    }
    // Show immediately
    setConversations(prev => {
      const conv = prev[channelId]||{ messages:[], unread:0, channelId }
      return { ...prev, [channelId]:{ ...conv, messages:[...conv.messages, tempMsg] } }
    })
    // Persist
    const { data, error } = await supabase
      .from('direct_messages')
      .insert({ channel_id:channelId, sender_id:user.id, receiver_id:receiverId, content:content.trim() })
      .select(`id,channel_id,content,created_at,sender_id,receiver_id,
        sender:users!direct_messages_sender_id_fkey(id,full_name,email)`)
      .single()

    // Replace temp with real
    setConversations(prev => {
      const conv = prev[channelId]; if (!conv) return prev
      if (error) return { ...prev, [channelId]:{ ...conv, messages:conv.messages.filter(m=>m.id!==tempId) } }
      return { ...prev, [channelId]:{ ...conv, messages:conv.messages.map(m=>m.id===tempId?data:m) } }
    })
  }

  function getOrCreateConv(channelId, otherUser) {
    setConversations(prev => {
      if (prev[channelId]) return prev
      return { ...prev, [channelId]:{ messages:[], otherUser, unread:0, channelId } }
    })
    return conversations[channelId]||{ messages:[], otherUser, unread:0, channelId }
  }

  return (
    <DMContext.Provider value={{
      conversations, totalUnread, activeConvId,
      openConversation, closeConversation,
      sendDM, getOrCreateConv, loadAllConversations,
    }}>
      {children}
    </DMContext.Provider>
  )
}
