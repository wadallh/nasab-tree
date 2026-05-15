import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import TreeViewer from './components/TreeViewer'
import ChangePassword from './pages/ChangePassword'

// 🔐 مكون حماية المسارات (يُعيد التوجيه إذا لم يكن المستخدم مسجلاً)
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  
  if (!token) {
    return <Navigate to="/register" replace />
  }
  
  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🔓 مسارات عامة (مفتوحة للجميع) */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* 🔐 مسارات محمية (مغلّفة بـ ProtectedRoute) */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tree" 
          element={
            <ProtectedRoute>
              <TreeViewer />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/change-password" 
          element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } 
        />
        
        {/* 🏠 الصفحة الرئيسية: تُوجّه إلى /register */}
        <Route path="/" element={<Navigate to="/register" replace />} />
        
        {/* ❌ أي مسار غير معروف يُوجّه إلى /register */}
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App