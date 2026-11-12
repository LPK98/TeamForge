import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute, PublicOnlyRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ProjectsPage from './pages/ProjectsPage'
import TasksPage from './pages/TasksPage'
import TeamMembersPage from './pages/TeamMembersPage'
import ActivityPage from './pages/ActivityPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'
import GitHubRepositoriesPage from './pages/GitHubRepositoriesPage'
import GitHubRepositoryDetailsPage from './pages/GitHubRepositoryDetailsPage'
import { applyTheme, getThemePreference } from './theme'

applyTheme(getThemePreference())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProtectedRoute><App /></ProtectedRoute>} />
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
          <Route path="/projects" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
          <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectsPage /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/tasks/:taskId" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/team-members" element={<ProtectedRoute><TeamMembersPage /></ProtectedRoute>} />
          <Route path="/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/github/repositories" element={<ProtectedRoute><GitHubRepositoriesPage /></ProtectedRoute>} />
          <Route path="/github/repositories/:owner/:name" element={<ProtectedRoute><GitHubRepositoryDetailsPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
