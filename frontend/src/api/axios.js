// src/api/axios.js
import axios from "axios";
import API_BASE_URL from "./config";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // ✅ زدنا الوقت من 30 ثانية إلى 60 ثانية (لانتظار استيقاظ السيرفر)
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true // ✅ مهم لإرسال الكوكيز والتوكن
});

// ✅ interceptor لإضافة التوكن تلقائياً لكل الطلبات
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ interceptor لمعالجة الأخطاء بشكل مركزي + إعادة المحاولة التلقائية
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // 🔄 إعادة المحاولة التلقائية إذا كان الخطأ بسبب الوقت أو الشبكة
    // ولم تتم المحاولة من قبل (!config.__retry)
    if (
      (error.code === 'ECONNABORTED' || 
       error.message?.includes('timeout') ||
       error.message?.includes('Network Error')) && 
      !config.__retry
    ) {
      config.__retry = true; // نضع علامة أن هذه محاولة ثانية
      
      console.log('🔄 الشبكة بطيئة، جاري إعادة المحاولة تلقائياً...');
      
      // ننتظر 2 ثانية قبل إعادة المحاولة
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // نعيد إرسال الطلب نفسه
      return api(config);
    }

    // معالجة خطأ 401 (جلسة منتهية)
    if (error.response?.status === 401) {
      console.warn('⚠️ جلسة غير صالحة، يرجى إعادة الدخول');
      // اختياري: تنظيف الجلسة وتوجيه المستخدم
      // localStorage.removeItem('token');
      // window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;