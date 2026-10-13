import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // pdfjs ships an ESM worker; keep it from being pre-bundled oddly.
  optimizeDeps: { exclude: ['pdfjs-dist'] },
});
