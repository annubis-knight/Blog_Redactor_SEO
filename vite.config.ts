import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// NFR-CFG-APP-PORTS — ports applicatifs figés (back 3400, front 5400).
// Surchargeables via PORT / VITE_PORT pour tests Playwright multi-instances.
const BACKEND_PORT = Number(process.env.PORT) || 3400
const FRONTEND_PORT = Number(process.env.VITE_PORT) || 5400

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  server: {
    port: FRONTEND_PORT,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
        timeout: 0,
      },
    },
  },
  preview: {
    port: FRONTEND_PORT,
    strictPort: true,
  },
})
