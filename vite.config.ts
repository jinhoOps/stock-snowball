import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/stock-snowball/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.svg', 'pwa-192x192.svg', 'pwa-512x512.svg'],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000
      },
      manifest: {
        name: 'Stock Snowball',
        short_name: 'Snowball',
        description: 'Daily investment growth calculator with high precision',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('rxdb') || id.includes('rxjs') || id.includes('dexie')) return 'vendor-rxdb';
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('@visx')) return 'vendor-visx';
            return 'vendor';
          }
          if (id.includes('src/data/indices')) {
            return 'historical-data';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
