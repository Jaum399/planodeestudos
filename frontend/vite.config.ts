import { defineConfig, splitVendorChunkPlugin } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), splitVendorChunkPlugin()],
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Cada chunk abaixo de 500 KB inline, acima vira arquivo separado com hash
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Agrupa dependências pesadas em chunks dedicados para máximo cache-hit
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/axios') || id.includes('node_modules/date-fns') || id.includes('node_modules/framer-motion')) {
            return 'vendor-utils';
          }
        },
      },
    },
  },
})
