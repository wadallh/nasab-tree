import axios from 'axios'

// 🔍 تشخيص متغير البيئة (مهم جداً!)
const envUrl = import.meta.env.VITE_API_URL
console.log('🔍 DEBUG - import.meta.env.VITE_API_URL:', envUrl)
console.log('🔍 DEBUG - typeof:', typeof envUrl)
console.log('🔍 DEBUG - isEmpty:', !envUrl || envUrl.trim() === '')

// ✅ دالة ذكية لتحديد رابط الـ Backend مع تشخيص مفصل
const getApiUrl = () => {
  // 1. حاول قراءة متغير البيئة من Vite
  const url = import.meta.env.VITE_API_URL
  
  // 2. إذا وُجد المتغير وليس فارغاً، استخدمه
  if (url && typeof url === 'string' && url.trim() !== '') {
    console.log('✅ Using VITE_API_URL from env:', url.trim())
    return url.trim()
  }
  
  // 3. إذا لم يوجد، استخدم رابط الإنتاج الافتراضي (Render)
  console.log('⚠️ VITE_API_URL not found, using fallback:', 'https://nasab-tree.onrender.com')
  return 'https://nasab-tree.onrender.com'
}

// ✅ احصل على الرابط النهائي
const API_URL = getApiUrl()
console.log('🔗 Final API Base URL:', `${API_URL}/api`)

const api = axios.create({
  // ✅ دمج الرابط مع /api بشكل صحيح
  baseURL: `${API_URL}/api`,
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // ✅ إضافة مهلة زمنية للطلبات (10 ثواني)
  timeout: 10000,
  // ✅ تسجيل تفاصيل الطلب للتشخيص
  transformRequest: [(data, headers) => {
    console.log('📤 Request:', {
      url: `${API_URL}/api${headers?.url || ''}`,
      method: headers?.method,
      data
    })
    return JSON.stringify(data)
  }]
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
    
    // 🔍 تسجيل URL الكامل للطلب
    console.log('🌐 Full Request URL:', config.baseURL + config.url)
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
    console.log('✅ Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    })
    return response
  },
  error => {
    console.error('❌ API Error:', {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + error.config?.url,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.error,
      data: error.response?.data
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