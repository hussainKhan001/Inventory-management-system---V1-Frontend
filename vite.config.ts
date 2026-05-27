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
    build: {
      // Increase warning threshold to avoid noise
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Heavy PDF/Excel/AI libs — load only when actually used
            if (id.includes('jspdf') || id.includes('jspdf-autotable')) return 'chunk-pdf';
            if (id.includes('xlsx'))           return 'chunk-xlsx';
            if (id.includes('@google/genai'))  return 'chunk-genai';

            // Charting — only on Dashboard
            if (id.includes('recharts') || id.includes('d3-'))  return 'chunk-charts';

            // Animation — shared but separate from main
            if (id.includes('motion') || id.includes('framer-motion')) return 'chunk-motion';

            // Core React runtime
            if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react';

            // Everything else from node_modules
            if (id.includes('node_modules')) return 'vendor-misc';
          },
        },
      },
    },
  };
});
