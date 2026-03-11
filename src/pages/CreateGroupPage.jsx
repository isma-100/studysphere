// src/pages/CreateGroupPage.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import './CreateGroup.css'

export default function CreateGroupPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [subjects, setSubjects] = useState([])
  const [form, setForm] = useState({
    name: '', description: '', subject_id: '',
    max_members: 10, is_online: true,
  })
  const [errors,   setErrors]   = useState({})
  const [loading,  setLoading]  = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    supabase.from('subjects').select('id, name, icon, color').order('name')
      .then(({ data }) => { if (data) setSubjects(data) })
  }, [])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
    setErrors(p => ({ ...p, [name]: '' }))
    setApiError('')
  }

  function validate() {
    const errs = {}
    if (!form.name.trim())       errs.name       = 'Group name is required'
    if (form.name.length > 60)   errs.name       = 'Name must be under 60 characters'
    if (!form.subject_id)        errs.subject_id = 'Please choose a subject'
    if (form.max_members < 2)    errs.max_members = 'Minimum 2 members'
    if (form.max_members > 100)  errs.max_members = 'Maximum 100 members'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)

    // 1. Create the group
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .insert({
        name:        form.name.trim(),
        description: form.description.trim() || null,
        subject_id:  form.subject_id,
        creator_id:  user.id,
        max_members: parseInt(form.max_members),
        is_online:   form.is_online,
      })
      .select()
      .single()

    if (groupErr) { setApiError(groupErr.message); setLoading(false); return }

    // 2. Auto-join creator as admin
    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id, role: 'admin' })

    if (memberErr) { setApiError(memberErr.message); setLoading(false); return }

    // 3. Navigate to the new group
    navigate(`/groups/${group.id}`)
  }

  const selectedSubject = subjects.find(s => s.id === parseInt(form.subject_id))

  return (
    <AppLayout>
      <div className="page-wrap" style={{ maxWidth: 640 }}>

        <div className="page-header">
          <div className="page-eyebrow">Groups</div>
          <h1 className="page-title">Create a Study Group</h1>
          <p className="page-sub">Set up your group and start inviting learners.</p>
        </div>

        {apiError && (
          <div className="cg-error">
            <span>⚠️</span> {apiError}
          </div>
        )}

        <form className="cg-form" onSubmit={handleSubmit} noValidate>

          {/* Name */}
          <div className="cg-field">
            <label className="cg-label" htmlFor="name">
              Group Name <span className="cg-req">*</span>
            </label>
            <input
              id="name" name="name" type="text"
              className={`cg-input${errors.name ? ' error' : ''}`}
              placeholder="e.g. Python Beginners Study Club"
              value={form.name}
              onChange={handleChange}
              maxLength={60}
            />
            <div className="cg-input-footer">
              {errors.name
                ? <span className="cg-field-err">{errors.name}</span>
                : <span />
              }
              <span className="cg-char-count">{form.name.length}/60</span>
            </div>
          </div>

          {/* Description */}
          <div className="cg-field">
            <label className="cg-label" htmlFor="description">
              Description <span className="cg-optional">(optional)</span>
            </label>
            <textarea
              id="description" name="description"
              className="cg-input cg-textarea"
              placeholder="What will your group study? What's the level? What's the vibe?"
              value={form.description}
              onChange={handleChange}
              rows={3}
              maxLength={300}
            />
            <div className="cg-input-footer">
              <span />
              <span className="cg-char-count">{form.description.length}/300</span>
            </div>
          </div>

          {/* Subject */}
          <div className="cg-field">
            <label className="cg-label" htmlFor="subject_id">
              Subject <span className="cg-req">*</span>
            </label>
            <div className="cg-select-wrap">
              {selectedSubject && (
                <span className="cg-select-icon">{selectedSubject.icon}</span>
              )}
              <select
                id="subject_id" name="subject_id"
                className={`cg-input cg-select${errors.subject_id ? ' error' : ''}${selectedSubject ? ' has-icon' : ''}`}
                value={form.subject_id}
                onChange={handleChange}
              >
                <option value="">— Choose a subject —</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                ))}
              </select>
            </div>
            {errors.subject_id && <span className="cg-field-err">{errors.subject_id}</span>}
          </div>

          {/* Two column: max members + online toggle */}
          <div className="cg-row">
            <div className="cg-field">
              <label className="cg-label" htmlFor="max_members">Max Members</label>
              <input
                id="max_members" name="max_members" type="number"
                className={`cg-input${errors.max_members ? ' error' : ''}`}
                value={form.max_members}
                onChange={handleChange}
                min={2} max={100}
              />
              {errors.max_members && <span className="cg-field-err">{errors.max_members}</span>}
            </div>

            <div className="cg-field">
              <label className="cg-label">Meeting Format</label>
              <div className="cg-toggle-row">
                <button
                  type="button"
                  className={`cg-toggle-btn${form.is_online ? ' active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, is_online: true }))}
                >
                  🌐 Online
                </button>
                <button
                  type="button"
                  className={`cg-toggle-btn${!form.is_online ? ' active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, is_online: false }))}
                >
                  📍 In-person
                </button>
              </div>
            </div>
          </div>

          {/* Preview card */}
          {form.name && (
            <div className="cg-preview">
              <div className="cgp-label">Preview</div>
              <div className="cgp-card">
                <div className="cgp-bar" style={{ background: selectedSubject?.color || '#4a7cf7' }} />
                <div className="cgp-body">
                  <div className="cgp-icon" style={{ background: selectedSubject?.color ? selectedSubject.color + '22' : '#eff4ff' }}>
                    {selectedSubject?.icon || '📚'}
                  </div>
                  <div className="cgp-name">{form.name || 'Your group name'}</div>
                  {selectedSubject && <div className="cgp-sub">{selectedSubject.icon} {selectedSubject.name}</div>}
                  <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.25rem' }}>
                    <span className={`badge ${form.is_online ? 'badge-teal' : 'badge-blue'}`}>
                      {form.is_online ? '🌐 Online' : '📍 In-person'}
                    </span>
                    <span className="badge badge-muted">👥 Max {form.max_members}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <button className="cg-submit" type="submit" disabled={loading}>
            {loading
              ? <><span className="spinner" style={{ borderTopColor: '#0a0f1e' }} /> Creating...</>
              : '＋ Create group'
            }
          </button>

        </form>
      </div>
    </AppLayout>
  )
}
