import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // SSE stream — dedicated entry to disable response buffering
      '/api/v1/notifications/stream': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        // Disable proxy response buffering so SSE chunks flow immediately
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache';
            proxyRes.headers['x-accel-buffering'] = 'no';
          });
        }
      },
      // All other API calls
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      },
      // Static file serving (PDFs etc.)
      '/static': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

