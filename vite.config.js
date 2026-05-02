import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
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
        skipWaiting: true,
        clientsClaim: true,
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
        rewrite: () => '/v1/messages',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
      }
    }
  }
  }
})
