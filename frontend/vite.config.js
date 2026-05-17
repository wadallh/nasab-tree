import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'شجرة النسب',
        short_name: 'النسب',
        description: 'نظام إدارة شجرة العائلة',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        dir: 'rtl',
        lang: 'ar',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  // ✅ إعدادات البناء الصريحة لـ Vercel
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false, // تقليل حجم الملفات للإنتاج
    rollupOptions: {
      output: {
        manualChunks: undefined // منع تقسيم الكود لضمان تحميل كل شيء
      }
    }
  },
  // ✅ إعدادات الخادم المحلي (للتطوير فقط)
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  // ✅ ضمان عمل المسارات في الإنتاج
  base: '/'
})