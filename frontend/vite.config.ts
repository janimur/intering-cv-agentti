/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    // Vite 8 käyttää LightningCSS:ää oletuksena, mutta Tailwind v3 vaatii PostCSS:n
    transformer: 'postcss',
  },
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
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    typecheck: {
      tsconfig: './tsconfig.vitest.json',
    },
  },
})
