// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import LandingPage        from './pages/LandingPage'
import SignUpPage         from './pages/SignUpPage'
import LoginPage          from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage  from './pages/ResetPasswordPage'
import DashboardPage      from './pages/DashboardPage'
import BrowsePage         from './pages/BrowsePage'
import CreateGroupPage    from './pages/CreateGroupPage'
import GroupDetailPage    from './pages/GroupDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"                element={<LandingPage />} />
          <Route path="/signup"          element={<SignUpPage />} />
          <Route path="/login"           element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password"  element={<ResetPasswordPage />} />
          <Route path="/dashboard"       element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/browse"          element={<ProtectedRoute><BrowsePage /></ProtectedRoute>} />
          <Route path="/groups/create"   element={<ProtectedRoute><CreateGroupPage /></ProtectedRoute>} />
          <Route path="/groups/:id"      element={<ProtectedRoute><GroupDetailPage /></ProtectedRoute>} />
          <Route path="*"                element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
