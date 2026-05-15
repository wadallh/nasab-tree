// frontend/src/components/ProtectedRoute.jsx
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  
  // ✅ تحقق من وجود توكن المستخدم (مخزن في localStorage)
  const token = localStorage.getItem('token');
  
  // إذا لم يكن هناك توكن، أعد توجيهه لتسجيل الدخول
  if (!token) {
    return <Navigate to="/register" state={{ from: location }} replace />;
  }
  
  // إذا كان هناك توكن، اسمح بالدخول للصفحة المطلوبة
  return children;
};

export default ProtectedRoute;