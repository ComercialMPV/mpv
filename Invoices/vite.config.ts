import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
   alias: {
      '@': path.resolve(__dirname, './src'),  // @ → src/
    },
  },
  // Support Capacitor on mobile devices
  server: {
    host: true,
    port: 5173,
    strictPort: false,
  },
  // Use relative base path for Capacitor file:// protocol
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
});
