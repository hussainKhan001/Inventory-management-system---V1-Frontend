import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
      // Single React instance across all vendor libraries — prevents
      // "Cannot read properties of undefined (reading 'memo')" class of errors
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-hot-toast'],
    },
    build: {
      // Let Vite handle chunking automatically.
      // Manual chunk splitting was causing React 19 initialization-order
      // errors: vendor-misc would call into vendor-react before React's
      // internal fiber state had finished setting up (e.g. "Cannot set
      // properties of undefined (setting 'Activity')").
      // resolve.dedupe above already ensures a single React instance, which
      // is all that is needed to prevent duplicate-React runtime crashes.
      chunkSizeWarningLimit: 1000,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  };
});
