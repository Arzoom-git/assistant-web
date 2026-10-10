// 先拿快取秒開，同時在背景更新快取；新版要下一次打開才會看到。
const CACHE = 'assistant-0.9.6';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

// GitHub Pages 會讓瀏覽器快取 10 分鐘；更新時一律跟伺服器確認，才不會把舊版存進新版的快取
const fresh = req => fetch(req, { cache: 'no-cache' });

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => fresh(f).then(r => {
    if (!r.ok) throw new Error(f + ' ' + r.status);
    return c.put(f, r);
  })))));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 緋的推播（早安簡報等）：顯示通知；點了打開緋（已經開著就切過去）
self.addEventListener('push', e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (x) { m = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(m.title || '緋', { body: m.body || '', icon: 'icon-192.png', badge: 'icon-192.png', tag: m.tag || 'assistant', data: { url: m.url || './' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope) && 'focus' in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(e.request, { ignoreSearch: true }).then(hit => {
    const net = fresh(e.request.url)
      .then(r => { if (r.ok) c.put(e.request, r.clone()); return r; })
      .catch(() => hit);
    return hit || net;
  })));
});
