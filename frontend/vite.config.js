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
  
  // ✅ إعدادات البناء لـ Vercel
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  },
  
  // ✅ إعدادات الخادم المحلي (للتطوير فقط - لن تؤثر على الإنتاج)
  server: {
    port: 5173,
    // ⚠️ هذا البروكسي يعمل فقط في التطوير المحلي (localhost)
    // في الإنتاج (Vercel) يتم استخدام VITE_API_URL من ملف .env
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // ✅ إضافة: تجاهل البروكسي إذا كان في إنتاج
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('proxy error', err)
          })
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url)
          })
        }
      }
    }
  },
  
  // ✅ ضمان عمل المسارات في الإنتاج (مهم لـ Vercel)
  base: '/',
  
  // ✅ إضافة: تحسينات لـ Vercel
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext'
    }
  }
})