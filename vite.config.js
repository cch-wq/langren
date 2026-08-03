import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 3000,
    proxy: {
      // 本地开发：把 /api 请求转发到 wrangler pages dev（端口 8788）
      '/api': {
        target: 'http://localhost:8788',
        changeOrigin: true
      }
    }
  },
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
