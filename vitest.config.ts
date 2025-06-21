/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // @ts-ignore
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    testTimeout: 30000, // 30秒に増加
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})