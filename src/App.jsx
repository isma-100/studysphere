// src/App.jsx
// Full routing setup with auth protection.
// Install react-router-dom first if you haven't:
//   npm install react-router-dom

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import LandingPage   from './pages/LandingPage'
import SignUpPage    from './pages/SignUpPage'
import LoginPage     from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/"       element={<LandingPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login"  element={<LoginPage />} />

          {/* Protected routes — must be logged in */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          {/* Catch-all → home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
