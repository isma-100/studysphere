// src/pages/SignUpPage.jsx
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Auth.css'

function getStrength(pw) {
  if (!pw) return { score:0, label:'', color:'' }
  let score = 0
  if (pw.length >= 8)          score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  const map = [
    { label:'',          color:'transparent', width:'0%'   },
    { label:'Weak',      color:'#f43f5e',     width:'25%'  },
    { label:'Fair',      color:'#f59e0b',     width:'50%'  },
    { label:'Good',      color:'#00d4c8',     width:'75%'  },
    { label:'Strong 💪', color:'#10b981',     width:'100%' },
  ]
  return { score, ...map[score] }
}

export default function SignUpPage() {
  const navigate = useNavigate()
  const [form,     setForm]     = useState({ fullName:'', email:'', password:'' })
  const [errors,   setErrors]   = useState({})
  const [apiError, setApiError] = useState('')
  const [success,  setSuccess]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const strength = getStrength(form.password)

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
    if (!form.fullName.trim())               errs.fullName = 'Full name is required'
    if (!form.email.trim())                  errs.email    = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.password)                      errs.password = 'Password is required'
    else if (form.password.length < 6)       errs.password = 'Must be at least 6 characters'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true); setApiError('')
    const { error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.fullName } }
    })
    setLoading(false)
    if (error) setApiError(error.message)
    else { setSuccess(true); setTimeout(() => navigate('/login'), 2500) }
  }

  return (
    <div className="auth-root" onClick={() => navigate('/')}>
      <div className="auth-glow" />
      <div className="auth-dots" />
      <div className="auth-shape auth-shape-1" />
      <div className="auth-shape auth-shape-2" />
      <div className="auth-topline" />

      <div className="auth-card" onClick={e => e.stopPropagation()}>

        {/* ── Close button ── */}
        <button className="auth-close" onClick={() => navigate('/')} title="Close (Esc)">✕</button>

        <Link to="/" className="auth-logo">
          <div className="auth-logo-icon">🌐</div>
          <div className="auth-logo-text">Study<em>Sphere</em></div>
        </Link>

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-sub">Join 2,400+ learners already studying together.</p>

        {success && (
          <div className="auth-success">
            <span>✅</span>
            <div><strong>You're in!</strong> Check your email to confirm your account. Redirecting to login...</div>
          </div>
        )}

        {apiError && (
          <div className="auth-error" style={{ marginBottom:'1rem' }}>
            <span>⚠️</span> {apiError}
          </div>
        )}

        {!success && (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full Name</label>
              <input id="fullName" name="fullName" type="text"
                className={`form-input${errors.fullName ? ' error' : ''}`}
                placeholder="Alex Johnson" value={form.fullName}
                onChange={handleChange} autoComplete="name" />
              {errors.fullName && <span className="field-error">{errors.fullName}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email"
                className={`form-input${errors.email ? ' error' : ''}`}
                placeholder="alex@email.com" value={form.email}
                onChange={handleChange} autoComplete="email" />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password"
                className={`form-input${errors.password ? ' error' : ''}`}
                placeholder="Min. 6 characters" value={form.password}
                onChange={handleChange} autoComplete="new-password" />
              {errors.password && <span className="field-error">{errors.password}</span>}
              {form.password && (
                <div className="pw-strength">
                  <div className="pw-bar-bg">
                    <div className="pw-bar-fill" style={{ width:strength.width, background:strength.color }} />
                  </div>
                  <span className="pw-label" style={{ color:strength.color }}>{strength.label}</span>
                </div>
              )}
            </div>

            <button className="auth-btn" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Creating account...</> : 'Create account →'}
            </button>
          </form>
        )}

        <div className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  )
}
