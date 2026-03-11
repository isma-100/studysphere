// src/components/SmartMatch.jsx
// AI-powered group recommendations shown on Browse + Dashboard
import { useState } from 'react'
import { Link } from 'react-router-dom'
import './SmartMatch.css'

export default function SmartMatch({ groups = [], userGroups = [], userProfile = {} }) {
  const [matches,  setMatches]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState(null)

  async function findMatches() {
    if (loading || groups.length === 0) return
    setLoading(true); setError(null)

    const joined = userGroups.map(g => g.name || g.groups?.name).filter(Boolean)
    const available = groups.filter(g => !userGroups.find(ug => (ug.id||ug.group_id) === g.id))

    if (available.length === 0) {
      setMatches([])
      setDone(true)
      setLoading(false)
      return
    }

    const prompt = `You are StudySphere's smart matching AI. A user wants group recommendations.

User profile:
- Name: ${userProfile.full_name || 'Learner'}
- Bio: ${userProfile.bio || 'No bio yet'}
- Already in: ${joined.join(', ') || 'no groups yet'}

Available groups (pick the best 3):
${available.slice(0, 20).map((g, i) =>
  `${i+1}. "${g.name}" — Subject: ${g.subjects?.name || 'General'} — ${g.group_members?.[0]?.count || 0} members — "${g.description?.slice(0,80) || 'No description'}"`
).join('\n')}

Return ONLY valid JSON array with exactly 3 objects (or fewer if less are available):
[
  {
    "id": "the group id here",
    "name": "group name",
    "reason": "One compelling sentence why this group is perfect for this user. Be specific and encouraging.",
    "match_score": 92
  }
]
Only return the JSON array. No other text.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:500,
          messages:[{ role:'user', content:prompt }]
        })
      })
      const data = await res.json()
      const text = data.content?.[0]?.text || '[]'
      const clean = text.replace(/```json|```/g,'').trim()
      const parsed = JSON.parse(clean)
      // Enrich with full group data
      const enriched = parsed.map(m => {
        const full = available.find(g => g.id === m.id || g.name === m.name)
        return { ...m, ...full, reason: m.reason, match_score: m.match_score }
      }).filter(m => m.id)
      setMatches(enriched)
      setDone(true)
    } catch(e) {
      setError('Could not load recommendations. Try again!')
    }
    setLoading(false)
  }

  if (!done && !loading) {
    return (
      <div className="sm-prompt">
        <div className="sm-prompt-left">
          <div className="sm-icon">✨</div>
          <div>
            <div className="sm-prompt-title">AI Group Matching</div>
            <div className="sm-prompt-sub">Get personalised group recommendations based on your profile</div>
          </div>
        </div>
        <button className="sm-find-btn" onClick={findMatches}>Find my groups →</button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="sm-loading">
        <div className="sm-loading-inner">
          <div className="sm-spinner"/>
          <span>AI is analysing {groups.length} groups for you…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return <div className="sm-error">{error} <button onClick={findMatches}>Retry</button></div>
  }

  if (matches.length === 0) {
    return (
      <div className="sm-empty">
        <div>🎉 You're already in all the best groups! <Link to="/groups/create">Create a new one?</Link></div>
      </div>
    )
  }

  return (
    <div className="sm-results">
      <div className="sm-results-header">
        <span className="sm-results-icon">✨</span>
        <span className="sm-results-title">AI Picks For You</span>
        <button className="sm-refresh" onClick={() => { setDone(false); setMatches([]) }}>↺ Refresh</button>
      </div>
      <div className="sm-cards">
        {matches.map(g => (
          <div key={g.id} className="sm-card">
            <div className="sm-card-top">
              <div className="sm-subj-tag" style={{background:g.subjects?.color+'18',color:g.subjects?.color||'#4a7cf7'}}>
                {g.subjects?.icon} {g.subjects?.name||'General'}
              </div>
              <div className="sm-score">
                <div className="sm-score-fill" style={{width:`${g.match_score||80}%`}}/>
                <span className="sm-score-label">{g.match_score||'~80'}% match</span>
              </div>
            </div>
            <div className="sm-card-name">{g.name}</div>
            <div className="sm-card-reason">"{g.reason}"</div>
            <div className="sm-card-meta">
              <span>👥 {g.group_members?.[0]?.count||0} members</span>
              <span>{g.is_online ? '🌐 Online' : '📍 In-person'}</span>
            </div>
            <Link to={`/groups/${g.id}`} className="sm-join-btn">View group →</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
