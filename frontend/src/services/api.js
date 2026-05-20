import axios from 'axios'

// =========================
// 🌐 تحديد رابط الـ Backend
// =========================
const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL

  // لو موجود في البيئة (Vercel / Netlify)
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim()
  }

  // fallback للإنتاج الحقيقي
  return 'https://nasab-tree-1.onrender.com'
}

const API_URL = getApiUrl()

// ✅ تم التعديل: عرض الرابط الأساسي فقط (بدون تكرار /api)
console.log('🔗 API Base URL:', API_URL)

// =========================
// Axios Instance
// =========================
const api = axios.create({
  // ✅ تم التعديل: نستخدم API_URL كما هي، ونضيف /api في كل دالة لاحقاً
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 15000
})

// =========================
// 🔐 إضافة التوكن تلقائياً
// =========================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('🔐 Token attached')
    }

    return config
  },
  (error) => {
    console.error('❌ Request error:', error)
    return Promise.reject(error)
  }
)

// =========================
// 🔴 معالجة الأخطاء
// =========================
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.error || error.message
    })

    // إذا انتهت الجلسة
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      setTimeout(() => {
        window.location.href = '/login'
      }, 800)
    }

    return Promise.reject(error)
  }
)

// =========================
// 📌 API FUNCTIONS
// =========================
// ✅ ملاحظة: جميع المسارات الآن تبدأ بـ /api/ لأن baseURL لم تعد تحتوي عليه

// تسجيل الدخول
export const login = (phone, password) => {
  return api.post('/api/auth/login', {
    phone,
    password
  })
}

// التسجيل
export const register = (data) => {
  return api.post('/api/auth/register', data)
}

// بيانات المستخدم
export const getMe = () => {
  return api.get('/api/auth/me')
}

// الشجرة
export const getFamilyTree = () => {
  return api.get('/api/tree')
}

// إضافة شخص
export const addPersonDirect = (data) => {
  return api.post('/api/tree/persons', data)
}

// تحديث الحالة
export const updateStatusDirect = (personId, status) => {
  return api.patch(`/api/tree/persons/${personId}/status`, { status })
}

// حذف شخص
export const deletePersonDirect = (personId) => {
  return api.delete(`/api/tree/persons/${personId}`)
}

// إرسال طلب
export const submitRequest = (type, personData) => {
  return api.post('/api/requests/submit', {
    type,
    personData
  })
}

// الطلبات المعلقة
export const getPendingRequests = () => {
  return api.get('/api/requests/pending')
}

// معالجة الطلب
export const processRequest = (requestId, action, note) => {
  return api.patch(`/api/requests/${requestId}/process`, {
    action,
    admin_note: note
  })
}

export default api