/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  // @ts-expect-error — Vitest 2.x augments vite@5; project uses vite@8 — runtime compatible
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    typecheck: {
      tsconfig: './tsconfig.vitest.json',
    },
  },
})
