// src/api/config.js
// نستخدم متغير البيئة إذا وجد، أو الرابط الافتراضي
const API_BASE_URL = import.meta.env?.VITE_API_URL || "https://nasab-tree.onrender.com/api";

export default API_BASE_URL;