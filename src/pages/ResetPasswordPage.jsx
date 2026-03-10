// src/pages/ResetPasswordPage.jsx
// User lands here after clicking the link in their email.
// Supabase automatically handles the token in the URL.

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Auth.css'

function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '', width: '0%' }
  let score = 0
  if (pw.length >= 8)              score++
  if (/[A-Z]/.test(pw))            score++
  if (/[0-9]/.test(pw))            score++
  if (/[^A-Za-z0-9]/.test(pw))     score++
  const map = [
    { label: '',          color: 'transparent', width: '0%'   },
    { label: 'Weak',      color: '#f43f5e',      width: '25%'  },
    { label: 'Fair',      color: '#f59e0b',      width: '50%'  },
    { label: 'Good',      color: '#00d4c8',      width: '75%'  },
    { label: 'Strong 💪', color: '#10b981',      width: '100%' },
  ]
  return { score, ...map[score] }
}

export default function ResetPasswordPage() {
  const navigate = useNavigate()

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [errors, setErrors]       = useState({})
  const [apiError, setApiError]   = useState('')
  const [success, setSuccess]     = useState(false)
  const [loading, setLoading]     = useState(false)

  const strength = getStrength(password)

  function validate() {
    const errs = {}
    if (!password)                errs.password = 'Password is required'
    else if (password.length < 6) errs.password = 'Must be at least 6 characters'
    if (!confirm)                 errs.confirm  = 'Please confirm your password'
    else if (confirm !== password) errs.confirm = 'Passwords do not match'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    setApiError('')

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setApiError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
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

        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon">🌐</div>
          <div className="auth-logo-text">Study<em>Sphere</em></div>
        </Link>

        {!success ? (
          <>
            <h1 className="auth-heading">Set new password</h1>
            <p className="auth-sub">Choose a strong password for your account.</p>

            {apiError && (
              <div className="auth-error" style={{ marginBottom: '1rem' }}>
                <span>⚠️</span> {apiError}
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>

              {/* New password */}
              <div className="form-group">
                <label className="form-label" htmlFor="password">New Password</label>
                <input
                  id="password" type="password"
                  className={`form-input${errors.password ? ' error' : ''}`}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value)
                    setErrors(p => ({ ...p, password: '' }))
                  }}
                  autoComplete="new-password"
                  autoFocus
                />
                {errors.password && <span className="field-error">{errors.password}</span>}
                {password && (
                  <div className="pw-strength">
                    <div className="pw-bar-bg">
                      <div className="pw-bar-fill" style={{ width: strength.width, background: strength.color }} />
                    </div>
                    <span className="pw-label" style={{ color: strength.color }}>{strength.label}</span>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="form-group">
                <label className="form-label" htmlFor="confirm">Confirm Password</label>
                <input
                  id="confirm" type="password"
                  className={`form-input${errors.confirm ? ' error' : ''}`}
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={e => {
                    setConfirm(e.target.value)
                    setErrors(p => ({ ...p, confirm: '' }))
                  }}
                  autoComplete="new-password"
                />
                {errors.confirm && <span className="field-error">{errors.confirm}</span>}
              </div>

              <button className="auth-btn" type="submit" disabled={loading}>
                {loading
                  ? <><span className="spinner" /> Updating password...</>
                  : 'Update password →'
                }
              </button>

            </form>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>🔐</div>
            <h1 className="auth-heading" style={{ marginBottom: '0.75rem' }}>Password updated!</h1>
            <p className="auth-sub">Your password has been changed successfully.</p>
            <div className="auth-success">
              <span>✅</span>
              <div>Redirecting you to login...</div>
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
