// src/components/ProtectedRoute.jsx
// Wrap any page that requires login:
//   <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0f1e',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" />
          <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: '1rem', fontSize: '0.875rem' }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
