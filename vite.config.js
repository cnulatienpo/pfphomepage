import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'pfp-theme': path.resolve(__dirname, './pfp-theme'),
      'pfp-theme/engine': path.resolve(__dirname, './pfp-theme/engine'),
      'pfp-theme/components': path.resolve(__dirname, './pfp-theme/components'),
      'pfp-theme/fontmaker': path.resolve(__dirname, './pfp-theme/fontmaker'),
      '@engine': path.resolve(__dirname, './pfp-theme/engine'),
      '@components': path.resolve(__dirname, './pfp-theme/components'),
      '@fontmaker': path.resolve(__dirname, './pfp-theme/fontmaker'),
    }
  },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { outDir: 'dist/client', assetsDir: 'assets' },
  esbuild: {
    jsx: 'automatic'
  }
})
