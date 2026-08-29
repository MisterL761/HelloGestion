const CACHE_NAME = 'hello-gestion-v1';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(self.clients.claim());
});

self.addEventListener('push', (e) => {
    let data = {};
    try { data = e.data ? e.data.json() : {}; } catch { /* ignore */ }

    const title   = data.title || 'Hello Gestion';
    const body    = data.body  || '';
    const icon    = data.icon  || '/hello-gestion/assets/icon-192.png';
    const badge   = data.badge || '/hello-gestion/assets/icon-192.png';
    const url     = data.url   || '/hello-gestion/';
    const tag     = data.tag   || 'hello-gestion';

    e.waitUntil(
        self.registration.showNotification(title, {
            body,
            icon,
            badge,
            tag,
            data: { url },
            vibrate: [200, 100, 200],
            requireInteraction: data.requireInteraction || false,
        })

    );
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();
    const url = e.notification.data?.url || '/hello-gestion/';
    e.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
            for (const win of wins) {
                if (win.url.includes('/hello-gestion') && 'focus' in win) {
                    win.navigate(url);
                    return win.focus();
                }
            }
            if (self.clients.openWindow) return self.clients.openWindow(url);
        })
    );
});



