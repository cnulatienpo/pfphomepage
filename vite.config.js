import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { outDir: 'dist/client', assetsDir: 'assets' },
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, 'assets'),
      '@src': path.resolve(__dirname, 'src'),
      '@packages': path.resolve(__dirname, 'packages')
    }
  },
  esbuild: {
    jsx: 'automatic'
  }
})
