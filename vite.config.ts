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
      // Raise threshold — vendor-misc is a cacheable baseline bundle
      chunkSizeWarningLimit: 700,
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

            // Icons — large shared library
            if (id.includes('lucide-react')) return 'chunk-icons';

            // Crypto — heavy utility, only used in specific flows
            if (id.includes('crypto-js')) return 'chunk-crypto';

            // Core React runtime + all direct React consumers must be co-located.
            // Separating them causes "Cannot read properties of undefined (reading 'memo')"
            // in vendor-misc because CJS require('react') evaluates before vendor-react
            // exports are populated in production chunk loading order.
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-hot-toast/') ||
              id.includes('node_modules/goober/') ||          // react-hot-toast dep
              id.includes('node_modules/react-virtuoso/') ||
              id.includes('node_modules/scheduler/') ||
              id.includes('node_modules/use-sync-external-store/')
            ) return 'vendor-react';

            // Everything else from node_modules
            if (id.includes('node_modules')) return 'vendor-misc';
          },
        },
      },
    },
  };
});
