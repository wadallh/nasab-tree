// src/api/axios.js
import axios from "axios";
import API_BASE_URL from "./config";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 ثانية
  headers: {
    'Content-Type': 'application/json',
  }
});

// ✅ interceptor لإضافة التوكن تلقائياً لكل الطلبات
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // أو من مكان تخزين الجلسة
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ interceptor لمعالجة الأخطاء بشكل مركزي
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // توجيه لتسجيل الدخول أو تنظيف الجلسة
      console.warn('⚠️ جلسة غير صالحة، يرجى إعادة الدخول');
    }
    return Promise.reject(error);
  }
);

export default api;