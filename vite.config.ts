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
      includeAssets: [
        'icon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-192x192.svg',
        'pwa-512x512.svg'
      ],
      workbox: {
        maximumFileSizeToCacheInBytes: 5000000
      },
      manifest: {
        name: 'Stock Snowball - 매일의 작은 투자가 만드는 눈덩이',
        short_name: 'Snowball',
        description: '매일의 작은 투자가 거대한 자산의 눈덩이로 성장할 수 있도록 돕는 자동 매수 계산기',
        lang: 'ko',
        theme_color: '#0A1628',
        background_color: '#0A1628',
        display: 'standalone',
        orientation: 'portrait',
        categories: ['finance', 'utilities'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
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
