const CACHE = 'progress-ladder-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// ── REST TIMER NOTIFICATION ───────────────────────────────────────────
let restTimerTimeout = null;

self.addEventListener('message', e => {
  if (!e.data) return;

  if (e.data.type === 'scheduleRest') {
    // Cancel any existing scheduled notification
    if (restTimerTimeout) { clearTimeout(restTimerTimeout); restTimerTimeout = null; }
    const delay = e.data.endEpoch - Date.now();
    if (delay <= 0) return;
    restTimerTimeout = setTimeout(() => {
      self.registration.showNotification('Rest Over — Back to Work! 💪', {
        body: 'Your rest timer has finished.',
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-96.png',
        tag: 'rest-timer',
        renotify: true,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 400],
      });
      restTimerTimeout = null;
    }, delay);
  }

  if (e.data.type === 'cancelRest') {
    if (restTimerTimeout) { clearTimeout(restTimerTimeout); restTimerTimeout = null; }
    self.registration.getNotifications({ tag: 'rest-timer' })
      .then(notifs => notifs.forEach(n => n.close()));
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('./');
    })
  );
});
