// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Auth.css'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form,     setForm]     = useState({ email: '', password: '' })
  const [errors,   setErrors]   = useState({})
  const [apiError, setApiError] = useState('')
  const [loading,  setLoading]  = useState(false)

  // Click-outside to go home
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') navigate('/') }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function handleChange(e) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
    setErrors(p => ({ ...p, [e.target.name]: '' }))
    setApiError('')
  }

  function validate() {
    const errs = {}
    if (!form.email.trim()) errs.email    = 'Email is required'
    if (!form.password)     errs.password = 'Password is required'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true); setApiError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: form.email, password: form.password,
    })
    setLoading(false)
    if (error) setApiError('Invalid email or password. Please try again.')
    else navigate('/dashboard')
  }

  return (
    <div className="auth-root" onClick={() => navigate('/')}>
      <div className="auth-glow" />
      <div className="auth-dots" />
      <div className="auth-shape auth-shape-1" />
      <div className="auth-shape auth-shape-2" />
      <div className="auth-topline" />

      {/* stop click-outside from firing inside the card */}
      <div className="auth-card" onClick={e => e.stopPropagation()}>

        {/* ── Close button ── */}
        <button className="auth-close" onClick={() => navigate('/')} title="Close (Esc)">✕</button>

        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon">🌐</div>
          <div className="auth-logo-text">Study<em>Sphere</em></div>
        </Link>

        <h1 className="auth-heading">Welcome back 👋</h1>
        <p className="auth-sub">Log in to continue learning with your group.</p>

        {apiError && (
          <div className="auth-error" style={{ marginBottom: '1rem' }}>
            <span>⚠️</span> {apiError}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email"
              className={`form-input${errors.email ? ' error' : ''}`}
              placeholder="alex@email.com" value={form.email}
              onChange={handleChange} autoComplete="email" autoFocus />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <label className="form-label" htmlFor="password">Password</label>
              <Link to="/forgot-password" style={{ fontSize:'0.75rem', color:'#00d4c8', textDecoration:'none', fontWeight:600 }}>
                Forgot password?
              </Link>
            </div>
            <input id="password" name="password" type="password"
              className={`form-input${errors.password ? ' error' : ''}`}
              placeholder="Your password" value={form.password}
              onChange={handleChange} autoComplete="current-password" />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Logging in...</> : 'Log in →'}
          </button>
        </form>

        <div className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up free</Link>
        </div>
      </div>
    </div>
  )
}
