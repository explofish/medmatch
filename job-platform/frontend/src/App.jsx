import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Jobs from './pages/Jobs'
import JobDetail from './pages/JobDetail'
import Profile from './pages/Profile'
import Applications from './pages/Applications'
import Matches from './pages/Matches'
import PostJob from './pages/PostJob'
import Dashboard from './pages/Dashboard'

function App() {
  const { isAuthenticated, user } = useAuthStore()

  // Protected route component
  const ProtectedRoute = ({ children, allowedTypes }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />
    }
    if (allowedTypes && !allowedTypes.includes(user?.userType)) {
      return <Navigate to="/" />
    }
    return children
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        
        <Route path="profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        
        <Route path="applications" element={
          <ProtectedRoute allowedTypes={['graduate']}>
            <Applications />
          </ProtectedRoute>
        } />
        
        <Route path="matches" element={
          <ProtectedRoute allowedTypes={['graduate']}>
            <Matches />
          </ProtectedRoute>
        } />
        
        <Route path="post-job" element={
          <ProtectedRoute allowedTypes={['employer']}>
            <PostJob />
          </ProtectedRoute>
        } />
        
        <Route path="dashboard" element={
          <ProtectedRoute allowedTypes={['employer']}>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Route>
    </Routes>
  )
}

export default App
