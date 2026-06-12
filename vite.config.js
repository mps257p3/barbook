import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import os from 'node:os'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  cacheDir: `${os.homedir()}/.vite-cache/on-the-rocks`,
  // limpa builds antigos — sem isso o precache do PWA acumula bundles obsoletos
  build: { emptyOutDir: true },
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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
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
        ],
        share_target: {
          action: '/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [{ name: 'images', accept: ['image/*'] }]
          }
        }
      },
      // runtime caching, navigation fallback e share-target vivem em src/sw.js
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        globIgnores: ['bg/**']
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
