'use strict';
// Bump RELEASE and the CSS/JS query versions in index.html together.
const RELEASE = '2.1';
const PREFIX = `rent-tracker:${encodeURIComponent(self.registration.scope)}:`;
const CACHE = `${PREFIX}${RELEASE}`;
const BASE = self.registration.scope;
const FILES = ['./', 'index.html', 'style.css?v=2.1', 'app.js?v=2.1',
  'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png',
  'icons/icon-512.png', 'icons/icon-maskable-512.png'].map(p => new URL(p, BASE).href);

self.addEventListener('install', event => {
  // Installation fails atomically if any shell file is unavailable. Do not take
  // over existing pages until the user chooses Update app.
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    FILES.map(url => new Request(url, { cache: 'reload' }))
  )));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // Only this deployment's caches. Leave the old unscoped v1 cache alone:
    // another Rent Tracker installation on this origin may still need it.
    await Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Never cache unrelated paths, third-party traffic, exports, or backups.
  const navigation = event.request.mode === 'navigate' &&
    (url.pathname === new URL(BASE).pathname || url.pathname === new URL('index.html', BASE).pathname);
  if (!navigation && !FILES.includes(url.href)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(navigation ? new URL('index.html', BASE).href : event.request);
    if (cached) return cached;
    // Normal shell requests are precached. A missing cache should fail clearly
    // offline and can recover online, without independently mutating a release.
    try { return await fetch(event.request); }
    catch { return new Response('Offline files are unavailable. Reopen Rent Tracker while online.', {status:503,headers:{'Content-Type':'text/plain'}}); }
  })());
});
