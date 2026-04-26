// SEON Hub Service Worker
// - PWA 설치 대응 (skipWaiting + clients.claim)
// - Web Push 수신 / 클릭 핸들러

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'SEON Hub', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'SEON Hub';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    data: payload.data || { url: payload.url || '/' },
    tag: payload.tag,
    renotify: Boolean(payload.tag),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return null;
    })
  );
});

self.addEventListener('fetch', () => {
  // passthrough — 개발 환경에서 캐시 간섭 방지
});
