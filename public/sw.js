/**
 * 自注销 Service Worker
 * 用于清除旧版本应用残留的 sw.js 注册
 * 浏览器加载此文件后会自动注销 Service Worker，之后不再请求 /sw.js
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
