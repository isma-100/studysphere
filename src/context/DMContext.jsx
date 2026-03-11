// src/context/DMContext.jsx
// Global DM context — handles real-time delivery, unread counts, sound

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from './AuthContext'

const DMContext = createContext({})
export const useDM = () => useContext(DMContext)

// Tiny notification beep using Web Audio API (no external file needed)
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.3)
  } catch (e) { /* browser blocked audio */ }
}

export function DMProvider({ children }) {
  const { user } = useAuth()

  // conversations: { [channelId]: { messages:[], otherUser:{}, unread:0 } }
  const [conversations, setConversations] = useState({})
  const [totalUnread,   setTotalUnread]   = useState(0)
  const [activeConvId,  setActiveConvId]  = useState(null) // currently open DM
  const channelRef = useRef(null)

  // Recompute total unread whenever conversations change
  useEffect(() => {
    const total = Object.values(conversations).reduce((sum, c) => sum + (c.unread || 0), 0)
    setTotalUnread(total)
  }, [conversations])

  // Subscribe to ALL incoming DMs for this user
  useEffect(() => {
    if (!user) return
    loadAllConversations()
    subscribeToIncoming()
    return () => channelRef.current?.unsubscribe()
  }, [user])

  async function loadAllConversations() {
    const { data } = await supabase
      .from('direct_messages')
      .select(`id, channel_id, content, created_at, sender_id, receiver_id,
        sender:users!direct_messages_sender_id_fkey(id, full_name, email),
        receiver:users!direct_messages_receiver_id_fkey(id, full_name, email)`)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: true })

    if (!data) return

    const convMap = {}
    for (const msg of data) {
      const cid = msg.channel_id
      const other = msg.sender_id === user.id ? msg.receiver : msg.sender
      if (!convMap[cid]) convMap[cid] = { messages: [], otherUser: other, unread: 0, channelId: cid }
      convMap[cid].messages.push(msg)
    }
    setConversations(convMap)
  }

  function subscribeToIncoming() {
    channelRef.current?.unsubscribe()
    const ch = supabase
      .channel(`dm-inbox-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
        filter: `receiver_id=eq.${user.id}`,
      }, async (payload) => {
        const msg = payload.new
        // Fetch sender info
        const { data: sender } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', msg.sender_id)
          .single()

        const enriched = { ...msg, sender, receiver: { id: user.id } }
        const cid = msg.channel_id

        setConversations(prev => {
          const conv = prev[cid] || { messages: [], otherUser: sender, unread: 0, channelId: cid }
          const isActive = activeConvRef.current === cid
          return {
            ...prev,
            [cid]: {
              ...conv,
              otherUser: sender,
              messages: [...conv.messages, enriched],
              unread: isActive ? 0 : (conv.unread || 0) + 1,
            }
          }
        })

        // Sound + browser notification if window not focused or DM not open
        if (activeConvRef.current !== cid) {
          playBeep()
          showBrowserNotification(sender, msg.content)
        }
      })
      .subscribe()
    channelRef.current = ch
  }

  // Keep a ref to activeConvId so the subscription closure can read it
  const activeConvRef = useRef(null)
  useEffect(() => { activeConvRef.current = activeConvId }, [activeConvId])

  function showBrowserNotification(sender, content) {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') {
      new Notification(`💬 ${sender?.full_name || sender?.email?.split('@')[0] || 'Someone'}`, {
        body: content,
        icon: '/favicon.ico',
      })
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission()
    }
  }

  // Open a conversation — clears its unread count
  function openConversation(channelId) {
    setActiveConvId(channelId)
    setConversations(prev => ({
      ...prev,
      [channelId]: { ...(prev[channelId] || {}), unread: 0 }
    }))
  }

  function closeConversation() {
    setActiveConvId(null)
  }

  // Send a DM and optimistically add it to state
  async function sendDM(channelId, receiverId, content) {
    if (!content.trim()) return
    const tempMsg = {
      id: `temp-${Date.now()}`,
      channel_id: channelId,
      sender_id: user.id,
      receiver_id: receiverId,
      content,
      created_at: new Date().toISOString(),
      sender: { id: user.id, full_name: user.user_metadata?.full_name, email: user.email },
    }
    // Optimistic update
    setConversations(prev => {
      const conv = prev[channelId] || { messages: [], unread: 0, channelId }
      return { ...prev, [channelId]: { ...conv, messages: [...conv.messages, tempMsg] } }
    })

    const { data, error } = await supabase.from('direct_messages').insert({
      channel_id: channelId,
      sender_id: user.id,
      receiver_id: receiverId,
      content: content.trim(),
    }).select(`id, channel_id, content, created_at, sender_id, receiver_id,
        sender:users!direct_messages_sender_id_fkey(id, full_name, email)`).single()

    if (!error && data) {
      // Replace temp message with real one
      setConversations(prev => {
        const conv = prev[channelId]
        return {
          ...prev,
          [channelId]: {
            ...conv,
            messages: conv.messages.map(m => m.id === tempMsg.id ? { ...data } : m)
          }
        }
      })
    }
  }

  // Get or create a conversation by channelId + otherUser
  function getOrCreateConv(channelId, otherUser) {
    if (!conversations[channelId]) {
      setConversations(prev => ({
        ...prev,
        [channelId]: { messages: [], otherUser, unread: 0, channelId }
      }))
    }
    return conversations[channelId] || { messages: [], otherUser, unread: 0 }
  }

  return (
    <DMContext.Provider value={{
      conversations,
      totalUnread,
      activeConvId,
      openConversation,
      closeConversation,
      sendDM,
      getOrCreateConv,
      loadAllConversations,
    }}>
      {children}
    </DMContext.Provider>
  )
}
