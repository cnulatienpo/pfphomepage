import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const desiredRoot = '/pfpprojects/pfphomepage/pfp-theme';
const projectRoot = fs.existsSync(desiredRoot) ? desiredRoot : __dirname;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@engine': path.resolve(projectRoot, 'engine'),
      '@components': path.resolve(projectRoot, 'components'),
      '@fontmaker': path.resolve(projectRoot, 'fontmaker'),
    },
  },
});
