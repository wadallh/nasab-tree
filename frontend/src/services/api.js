// src/services/api.js
// ✅ هذا الملف الآن يعتمد على النظام الموحد لـ API
// تم حذف التكرار وجعل كل المسارات تدار من ملف واحد: ../api/axios

import api from '../api/axios' // ✅ استيراد مثيل axios الموحد

// =========================
// 📌 API FUNCTIONS
// =========================
// ✅ ملاحظة هامة: جميع المسارات الآن نسبية (بدون /api/) 
// لأن baseURL في ملف config.js يحتوي على /api مسبقاً
// مثال: '/auth/login' + baseURL '.../api' = '.../api/auth/login' ✅

// -------------------------
// 🔐 المصادقة (Auth)
// -------------------------

// تسجيل الدخول
export const login = (phone, password) => {
  return api.post('/auth/login', { phone, password })
}

// التسجيل
export const register = (data) => {
  return api.post('/auth/register', data)
}

// بيانات المستخدم الحالي
export const getMe = () => {
  return api.get('/auth/me')
}

// -------------------------
// 🌳 إدارة الشجرة (Tree)
// -------------------------

// جلب الشجرة العائلية
export const getFamilyTree = () => {
  return api.get('/tree')
}

// إضافة شخص مباشر (للمشرفين)
export const addPersonDirect = (data) => {
  return api.post('/tree/persons', data)
}

// تحديث حالة شخص (حي/متوفي/شهيد)
export const updateStatusDirect = (personId, status) => {
  return api.patch(`/tree/persons/${personId}/status`, { status })
}

// حذف شخص
export const deletePersonDirect = (personId) => {
  return api.delete(`/tree/persons/${personId}`)
}

// -------------------------
// 📋 إدارة الطلبات (Requests)
// -------------------------

// إرسال طلب جديد (إضافة/تعديل)
export const submitRequest = (type, personData) => {
  return api.post('/requests/submit', { type, personData })
}

// جلب الطلبات المعلقة للمراجعة
export const getPendingRequests = () => {
  return api.get('/requests/pending')
}

// معالجة طلب (موافقة/رفض)
export const processRequest = (requestId, action, note) => {
  return api.patch(`/requests/${requestId}/process`, {
    action,
    admin_note: note
  })
}

// -------------------------
// 🔄 دوال إضافية مستقبلية
// -------------------------
// يمكن إضافة أي دالة جديدة بنفس النمط:
// export const myNewFunction = (params) => api.get('/my/endpoint', { params })

export default api