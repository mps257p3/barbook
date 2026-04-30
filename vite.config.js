import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['Icon.png'],
      manifest: {
        name: 'On the Rocks',
        short_name: 'On the Rocks',
        description: 'Seu guia de coquetéis clássicos',
        theme_color: '#0A0906',
        background_color: '#0A0906',
        display: 'standalone',
        orientation: 'portrait',
        id: '/',
        start_url: '/',
        screenshots: [
          { src: 'Icon.png', sizes: '1024x1024', type: 'image/png', form_factor: 'narrow' }
        ],
        icons: [
          { src: 'Icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60*60*24*365 } }
          }
        ]
      }
    })
  ],
  server: {
    allowedHosts: true,
    proxy: {
      '/api/anthropic': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/anthropic/, ''),
      }
    }
  }
})
