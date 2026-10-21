const PREFIX='daily-meetings-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+'v3';
const ASSETS=['./','./index.html','./style.css','./app.js','./schedule.js','./manifest.webmanifest','./icon.svg','./icons/icon-192.png','./icons/icon-512.png','./schedule-scan.jpeg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(fetch(event.request).then(response=>response).catch(async()=>await caches.match(event.request)||(event.request.mode==='navigate'?await caches.match(new URL('./index.html',self.registration.scope)):Response.error())));});
