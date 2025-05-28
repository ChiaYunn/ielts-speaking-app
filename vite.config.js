// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/ielts-speaking-app/', // ✅ 根據你的 repo 名稱
  plugins: [vue()]
})
