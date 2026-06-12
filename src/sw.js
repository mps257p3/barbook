import { clientsClaim } from 'workbox-core'
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst, NetworkOnly } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

self.skipWaiting()
clientsClaim()

// ── Precache (equivalente ao generateSW anterior) ──
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA fallback — /api e /.well-known nunca caem no index.html
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html'), {
  denylist: [/^\/\.well-known\//, /^\/api\//, /^\/share-target/],
}))

// ── Runtime caching (replica o runtimeCaching do generateSW) ──
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({ cacheName: 'google-fonts', plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })] })
)
registerRoute(/\/\.well-known\//, new NetworkOnly())
registerRoute(
  /\/bg\//,
  new NetworkFirst({ cacheName: 'bg-images', plugins: [new ExpirationPlugin({ maxEntries: 15, maxAgeSeconds: 60 * 60 * 24 * 7 })] })
)

// ── Web Share Target ──
// O Android envia um POST multipart para /share-target com as imagens
// compartilhadas; guardamos no cache e redirecionamos para o app, que lê
// ?share=pending e recupera os arquivos (ver OnTheRocks em App.jsx).
registerRoute(
  ({ url }) => url.pathname === '/share-target',
  async ({ event }) => {
    try {
      const formData = await event.request.formData()
      const files = formData.getAll('images').filter(f => f && f.size > 0)
      if (files.length > 0) {
        const cache = await caches.open('otr-share-target')
        await cache.put('/shared-count', new Response(String(files.length)))
        await Promise.all(files.map((file, i) =>
          cache.put(`/shared-image-${i}`, new Response(file, { headers: { 'Content-Type': file.type || 'image/jpeg' } }))
        ))
        return Response.redirect('/?share=pending', 303)
      }
    } catch (e) {
      console.error('share-target error', e)
    }
    return Response.redirect('/', 303)
  },
  'POST'
)
