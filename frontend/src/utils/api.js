import axios from 'axios'

// 🔒 الحل الجذري: رابط ثابت ومضمون 100% - لا يعتمد على أي متغير بيئة
// هذا السطر يضمن أن كل الطلبات تذهب لـ Render مباشرة
const API_BASE = 'https://nasab-tree.onrender.com'

// ✅ تشخيص فوري في الـ Console لتأكيد الرابط المستخدم
console.log('🚀 API CLIENT INITIALIZED')
console.log('🔗 API_BASE (Hardcoded):', API_BASE)
console.log('🔗 Full Base URL:', `${API_BASE}/api`)
console.log('🌐 Expected Login URL:', `${API_BASE}/api/auth/login`)

const api = axios.create({
  // ✅ نستخدم الرابط الثابت مباشرة
  baseURL: `${API_BASE}/api`,
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  // ✅ مهلة زمنية كافية للطلبات (15 ثانية)
  timeout: 15000,
  // ✅ تسجيل تفاصيل الطلب قبل الإرسال للتأكد من المسار
  transformRequest: [(data, headers) => {
    console.log('📤 Outgoing Request:', {
      baseURL: `${API_BASE}/api`,
      url: headers?.url,
      method: headers?.method,
      fullURL: `${API_BASE}/api${headers?.url || ''}`
    })
    return JSON.stringify(data)
  }]
})

// 🟢 إضافة التوكن تلقائياً لكل طلب
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('✅ Token attached:', token.substring(0, 20) + '...')
    } else {
      console.log('ℹ️ No token (public request)')
    }
    
    // 🔍 تسجيل URL الكامل النهائي للطلب (هذه أهم معلومة للتشخيص)
    const finalURL = config.baseURL + config.url
    console.log('🎯 FINAL REQUEST URL:', finalURL)
    
    // ⚠️ تحذير إذا كان الرابط يذهب للمكان الخطأ
    if (finalURL.includes('netlify.app') || finalURL.includes('vercel.app')) {
      console.error('❌ CRITICAL: Request is going to frontend host instead of Render!')
      console.error('🔧 Check: Is API_BASE hardcoded correctly?')
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
    console.log('✅ Response received:', {
      url: response.config.url,
      status: response.status,
      from: response.config.baseURL
    })
    return response
  },
  error => {
    console.error('❌ API Error Details:', {
      requestedURL: error.config?.baseURL + error.config?.url,
      expectedBase: `${API_BASE}/api`,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.error || error.message,
      data: error.response?.data
    })
    
    // معالجة خطأ 401 (غير مصرح)
    if (error.response?.status === 401) {
      console.warn('🔑 Token expired/invalid - clearing storage')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      // إعادة التوجيه الآمنة
      setTimeout(() => {
        window.location.href = '/login'
      }, 1000)
    }
    
    return Promise.reject(error)
  }
)

// =========================
// 📦 دوال API (جاهزة للاستخدام)
// =========================

// تسجيل الدخول
export const login = (fullName, phone) => {
  console.log('🔐 Login attempt:', { fullName, phone })
  return api.post('/auth/login', { full_name: fullName, phone })
}

// جلب شجرة العائلة
export const getFamilyTree = () => {
  console.log('🌳 Fetching family tree...')
  return api.get('/tree')
}

// إضافة شخص جديد
export const addPersonDirect = (data) => {
  console.log('➕ Adding person:', data)
  return api.post('/tree/persons', data)
}

// تعديل حالة شخص
export const updateStatusDirect = (personId, status) => {
  console.log('✏️ Updating status:', { personId, status })
  return api.patch(`/tree/persons/${personId}/status`, { status })
}

// حذف شخص
export const deletePersonDirect = (personId) => {
  console.log('🗑️ Deleting person:', personId)
  return api.delete(`/tree/persons/${personId}`)
}

// تقديم طلب جديد
export const submitRequest = (type, personData) => {
  console.log('📝 Submitting request:', { type, personData })
  return api.post('/requests/submit', { type, personData })
}

// جلب الطلبات المعلقة
export const getPendingRequests = () => {
  console.log('📋 Fetching pending requests...')
  return api.get('/requests/pending')
}

// معالجة طلب (موافقة/رفض)
export const processRequest = (requestId, action, note) => {
  console.log('⚙️ Processing request:', { requestId, action, note })
  return api.patch(`/requests/${requestId}/process`, { action, admin_note: note })
}

export default api