import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so the build works on any sub-path, file:// and static hosting.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { port: 5173, host: true },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1200 },
});
