// src/pages/ForgotPasswordPage.jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Auth.css'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [emailError, setEmailError] = useState('')
  const [apiError, setApiError]   = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  function validate() {
    if (!email.trim())                    return 'Email is required'
    if (!/\S+@\S+\.\S+/.test(email))     return 'Enter a valid email'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setEmailError(err); return }

    setLoading(true)
    setApiError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setLoading(false)

    if (error) {
      setApiError(error.message)
    } else {
      setSuccess(true)
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-glow" />
      <div className="auth-dots" />
      <div className="auth-shape auth-shape-1" />
      <div className="auth-shape auth-shape-2" />
      <div className="auth-topline" />

      <div className="auth-card">

        {/* Logo */}
        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon">🌐</div>
          <div className="auth-logo-text">Study<em>Sphere</em></div>
        </Link>

        {!success ? (
          <>
            <h1 className="auth-heading">Forgot password?</h1>
            <p className="auth-sub">
              No worries — enter your email and we'll send you a reset link.
            </p>

            {apiError && (
              <div className="auth-error" style={{ marginBottom: '1rem' }}>
                <span>⚠️</span> {apiError}
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className={`form-input${emailError ? ' error' : ''}`}
                  placeholder="alex@email.com"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value)
                    setEmailError('')
                    setApiError('')
                  }}
                  autoComplete="email"
                  autoFocus
                />
                {emailError && <span className="field-error">{emailError}</span>}
              </div>

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading
                  ? <><span className="spinner" /> Sending...</>
                  : 'Send reset link →'
                }
              </button>

            </form>
          </>
        ) : (
          /* ── Success state ── */
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>📬</div>
            <h1 className="auth-heading" style={{ marginBottom: '0.75rem' }}>
              Check your inbox
            </h1>
            <p className="auth-sub" style={{ marginBottom: '1.5rem' }}>
              We sent a password reset link to{' '}
              <strong style={{ color: '#00d4c8' }}>{email}</strong>.
              <br />Check your spam folder if you don't see it.
            </p>
            <div className="auth-success">
              <span>✅</span>
              <div>Reset email sent! The link expires in <strong>1 hour</strong>.</div>
            </div>
          </div>
        )}

        <div className="auth-switch">
          <Link to="/login">← Back to login</Link>
        </div>

      </div>
    </div>
  )
}
