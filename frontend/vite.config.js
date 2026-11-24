import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const raw = env.VITE_API_URL?.trim().replace(/\/+$/, '').replace(/\/api$/, '')
  const apiTarget = raw || 'http://127.0.0.1:8000'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/auth': { target: apiTarget, changeOrigin: true },
        '/admin': {
          target: apiTarget,
          changeOrigin: true,
          bypass(req) {
            if (req.headers?.accept?.includes('text/html')) {
              return '/index.html'
            }
          },
        },
        '/health': { target: apiTarget, changeOrigin: true },
        '/announcements': { target: apiTarget, changeOrigin: true },
        '/wishlist': {
          target: apiTarget,
          changeOrigin: true,
          bypass(req) {
            if (req.headers?.accept?.includes('text/html')) {
              return '/index.html'
            }
          },
        },
        '/cart': {
          target: apiTarget,
          changeOrigin: true,
          bypass(req) {
            if (req.headers?.accept?.includes('text/html')) {
              return '/index.html'
            }
          },
        },
        '/products/categories': { target: apiTarget, changeOrigin: true },
        '/products/slug': { target: apiTarget, changeOrigin: true },
        '/products': {
          target: apiTarget,
          changeOrigin: true,
          bypass(req) {
            const path = req.url?.split('?')[0] ?? ''
            if (path === '/products' || /^\/products\/\d+$/.test(path)) {
              return
            }
            if (req.headers?.accept?.includes('text/html')) {
              return '/index.html'
            }
            return
          },
        },
      },
    },
  }
})