import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import TreeViewer from './components/TreeViewer'
import ChangePassword from './pages/ChangePassword'


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tree" element={<TreeViewer />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
             <Route path="/change-password" element={<ChangePassword />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App