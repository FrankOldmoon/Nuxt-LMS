/**
 * Self-unregistering Service Worker
 * Clears the sw.js registration left by old app versions
 * The browser auto-unregisters the Service Worker after loading this file and stops requesting /sw.js
 */
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.navigate(client.url))
        }),
      ),
  )
})
