// Push notification handlers — loaded by VitePWA via workbox importScripts

self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Pi Finance', {
      body: data.body ?? '',
      icon: data.icon ?? '/android-chrome-192x192.png',
      badge: data.badge ?? '/android-chrome-192x192.png',
      data: data.data ?? {},
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
