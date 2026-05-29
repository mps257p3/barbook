import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import os from 'node:os'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  cacheDir: `${os.homedir()}/.vite-cache/on-the-rocks`,
  build: { emptyOutDir: false },
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [
    {
      name: 'copy-dot-dirs',
      apply: 'build',
      closeBundle() {
        if (fs.existsSync('public/.well-known')) {
          fs.mkdirSync('dist/.well-known', { recursive: true });
          for (const f of fs.readdirSync('public/.well-known'))
            fs.copyFileSync(`public/.well-known/${f}`, `dist/.well-known/${f}`);
        }
      }
    },
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
          { src: 'Icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'Icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'Icon.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' }
        ]
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['bg/**'],
        navigateFallbackDenylist: [/^\/\.well-known\//, /^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60*60*24*365 } }
          },
          {
            urlPattern: /\/\.well-known\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/bg\//,
            handler: 'NetworkFirst',
            options: { cacheName: 'bg-images', expiration: { maxEntries: 15, maxAgeSeconds: 60*60*24*7 } }
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
