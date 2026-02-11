import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: { 
    outDir: 'dist/client', 
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        devnotes: resolve(__dirname, 'dev-notes.html')
      }
    }
  },
  esbuild: {
    jsx: 'automatic'
  }
})
