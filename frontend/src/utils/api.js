import axios from 'axios'

// ✅ دالة ذكية لتحديد رابط الـ Backend
const getApiUrl = () => {
  // 1. أولاً: حاول قراءة متغير البيئة من Vite
  const envUrl = import.meta.env.VITE_API_URL
  
  // 2. إذا وُجد المتغير، استخدمه (سواء كان localhost أو Render)
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.trim()
  }
  
  // 3. إذا لم يوجد، استخدم رابط الإنتاج الافتراضي (Render)
  return 'https://nasab-tree.onrender.com'
}

// ✅ احصل على الرابط النهائي
const API_URL = getApiUrl()

console.log('🔗 API Base URL:', `${API_URL}/api`)

const api = axios.create({
  // ✅ دمج الرابط مع /api بشكل صحيح
  baseURL: `${API_URL}/api`,
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // ✅ إضافة مهلة زمنية للطلبات (10 ثواني)
  timeout: 10000
})

// 🟢 إضافة التوكن لكل طلب تلقائياً
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('✅ Token attached:', token.substring(0, 30) + '...')
    } else {
      console.warn('⚠️ No token found in localStorage')
    }
    return config
  },
  error => {
    console.error('❌ Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// 🔴 معالجة الاستجابات والأخطاء
api.interceptors.response.use(
  response => {
    console.log('✅ Response:', response.config.url, response.status)
    return response
  },
  error => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.error
    })
    
    if (error.response?.status === 401) {
      console.error('🔑 Token expired or invalid! Clearing storage...')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // إعادة التوجيه لصفحة التسجيل بعد ثانية واحدة
      setTimeout(() => {
        window.location.href = '/register'
      }, 1000)
    }
    
    return Promise.reject(error)
  }
)

// =========================
// دوال API
// =========================

// تسجيل الدخول
export const login = (fullName, phone) => {
  console.log('📥 Login request:', { fullName, phone })
  return api.post('/auth/login', { full_name: fullName, phone })
}

// جلب الشجرة
export const getFamilyTree = () => {
  console.log('🌳 Fetching tree...')
  return api.get('/tree')
}

// إضافة شخص
export const addPersonDirect = (data) => api.post('/tree/persons', data)

// تعديل حالة
export const updateStatusDirect = (personId, status) => 
  api.patch(`/tree/persons/${personId}/status`, { status })

// حذف شخص
export const deletePersonDirect = (personId) => 
  api.delete(`/tree/persons/${personId}`)

// تقديم طلب
export const submitRequest = (type, personData) => 
  api.post('/requests/submit', { type, personData })

// جلب الطلبات المعلقة
export const getPendingRequests = () => api.get('/requests/pending')

// معالجة الطلب
export const processRequest = (requestId, action, note) => 
  api.patch(`/requests/${requestId}/process`, { action, admin_note: note })

export default api