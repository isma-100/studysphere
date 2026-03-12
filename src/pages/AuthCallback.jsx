// src/pages/AuthCallback.jsx
// Handles auth redirects from Supabase email links
// Catches expired OTP errors and shows a friendly message with resend option
// Add this route to App.jsx:  <Route path="/auth/callback" element={<AuthCallback />} />

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Auth.css'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status,  setStatus]  = useState('loading') // loading | success | expired | error
  const [email,   setEmail]   = useState('')
  const [resent,  setResent]  = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    // Parse the hash fragment from the URL
    const hash   = window.location.hash
    const params = new URLSearchParams(hash.replace('#', '?'))
    const error  = params.get('error')
    const errCode = params.get('error_code')

    if (error === 'access_denied' && errCode === 'otp_expired') {
      setStatus('expired')
      return
    }
    if (error) {
      setStatus('error')
      return
    }

    // No error — Supabase will handle the session automatically
    // Just wait for the session to be established then redirect
    const { data } = await supabase.auth.getSession()
    if (data?.session) {
      setStatus('success')
      setTimeout(() => navigate('/dashboard'), 1000)
    } else {
      // Give Supabase a moment to process the token
      setTimeout(async () => {
        const { data: d2 } = await supabase.auth.getSession()
        if (d2?.session) {
          setStatus('success')
          navigate('/dashboard')
        } else {
          setStatus('error')
        }
      }, 1500)
    }
  }

  async function handleResend() {
    if (!email.trim()) return
    setSending(true)
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${siteUrl}/auth/callback` }
    })
    setSending(false)
    if (!error) setResent(true)
  }

  return (
    <div className="auth-root">
      <div className="auth-glow"/>
      <div className="auth-dots"/>

      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-logo">🌐 StudySphere</div>

        {status === 'loading' && (
          <>
            <div className="auth-title">Signing you in…</div>
            <div style={{ display:'flex', justifyContent:'center', marginTop:'1.5rem' }}>
              <div className="spinner" style={{ width:28, height:28, border:'3px solid #e8eaf2', borderTopColor:'#00d4c8', borderRadius:'50%', animation:'spin .8s linear infinite' }}/>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="auth-title">✅ You're in!</div>
            <p style={{ color:'#8892aa', textAlign:'center', marginTop:'.5rem' }}>Redirecting to your dashboard…</p>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="auth-title">Link expired</div>
            <p style={{ color:'#8892aa', textAlign:'center', lineHeight:1.7, marginTop:'.5rem' }}>
              Your confirmation link has expired. Enter your email below and we'll send you a fresh one.
            </p>
            {!resent ? (
              <div style={{ marginTop:'1.25rem', display:'flex', flexDirection:'column', gap:'.75rem' }}>
                <input
                  className="auth-input"
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && handleResend()}
                />
                <button className="auth-btn" onClick={handleResend} disabled={sending||!email.trim()}>
                  {sending ? 'Sending…' : '📧 Resend confirmation email'}
                </button>
                <button className="auth-link-btn" onClick={() => navigate('/login')}>
                  Back to login
                </button>
              </div>
            ) : (
              <div style={{ marginTop:'1.25rem', textAlign:'center' }}>
                <div style={{ fontSize:'2rem' }}>📬</div>
                <p style={{ color:'#10b981', fontWeight:700, marginTop:'.5rem' }}>New link sent!</p>
                <p style={{ color:'#8892aa', fontSize:'.85rem', marginTop:'.25rem' }}>Check your inbox and click the link within 24 hours.</p>
                <button className="auth-link-btn" style={{ marginTop:'1rem' }} onClick={() => navigate('/login')}>
                  Back to login
                </button>
              </div>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <div className="auth-title">Something went wrong</div>
            <p style={{ color:'#8892aa', textAlign:'center', marginTop:'.5rem' }}>
              The link didn't work. Please try signing up or logging in again.
            </p>
            <div style={{ display:'flex', gap:'.75rem', marginTop:'1.25rem' }}>
              <button className="auth-btn" style={{ flex:1 }} onClick={() => navigate('/signup')}>Sign up</button>
              <button className="auth-btn" style={{ flex:1, background:'#f0f2f8', color:'#0a0f1e', boxShadow:'none' }} onClick={() => navigate('/login')}>Log in</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
