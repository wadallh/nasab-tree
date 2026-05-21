// src/api/axios.js
import axios from "axios";
import API_BASE_URL from "./config";

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // ✅ 60 ثانية لانتظار استيقاظ السيرفر
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true // ✅ مهم لإرسال الكوكيز والتوكن
});

// ✅ إضافة التوكن تلقائياً لكل الطلبات
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ✅ معالجة الأخطاء بشكل مركزي + إعادة المحاولة الذكية
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // 🔄 إعادة المحاولة التلقائية للطلبات الآمنة فقط (لا تُسبب تكرار عمليات)
    const isRetryableMethod = ['get', 'head', 'options', 'put', 'delete'].includes(config.method?.toLowerCase());
    
    if (
      isRetryableMethod &&
      (error.code === 'ECONNABORTED' || 
       error.message?.includes('timeout') ||
       error.message?.includes('Network Error')) && 
      !config.__retry
    ) {
      config.__retry = true;
      
      console.log(`🔄 إعادة محاولة لـ ${config.method?.toUpperCase()} ${config.url} بعد تأخير الشبكة...`);
      
      // تأخير عشوائي بين 1-3 ثواني لتجنب ازدحام الطلبات
      const delay = Math.floor(Math.random() * 2000) + 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return api(config);
    }

    // ⚠️ معالجة خطأ 401 (جلسة منتهية أو توكن غير صالح)
    if (error.response?.status === 401) {
      console.warn('⚠️ جلسة غير صالحة، يرجى إعادة الدخول');
      // اختياري: تنظيف الجلسة وتوجيه المستخدم
      // localStorage.removeItem('token');
      // sessionStorage.removeItem('token');
      // window.location.href = '/login';
    }

    // 📝 تسجيل الأخطاء الأخرى للتتبع
    if (error.response) {
      console.error(`❌ خطأ ${error.response.status}: ${config.method?.toUpperCase()} ${config.url}`);
    } else if (error.request) {
      console.error('❌ لم يصل رد من السيرفر:', config.method?.toUpperCase(), config.url);
    } else {
      console.error('❌ خطأ في إعداد الطلب:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;