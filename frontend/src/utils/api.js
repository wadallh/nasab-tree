import axios from 'axios'

// 🔒 رابط ثابت ومضمون 100%
const API_BASE = import.meta.env.VITE_API_URL || window.location.origin

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
})

// إضافة التوكن تلقائياً
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// معالجة الأخطاء
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// دوال API
export const login = (fullName, phone) => api.post('/auth/login', { full_name: fullName, phone })
export const getFamilyTree = () => api.get('/tree')
export const addPersonDirect = (data) => api.post('/tree/persons', data)
export const updateStatusDirect = (personId, status) => api.patch(`/tree/persons/${personId}/status`, { status })
export const deletePersonDirect = (personId) => api.delete(`/tree/persons/${personId}`)
export const submitRequest = (type, personData) => api.post('/requests/submit', { type, personData })
export const getPendingRequests = () => api.get('/requests/pending')
export const processRequest = (requestId, action, note) => api.patch(`/requests/${requestId}/process`, { action, admin_note: note })

export default api