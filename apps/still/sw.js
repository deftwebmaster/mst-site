const CACHE='still-shell-v2';
const ASSETS=['./','./index.html','./style.css','./app.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./apple-touch-icon.png'];
// cache:'reload' skips the browser's HTTP cache, so a new version never precaches a stale file.
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS.map(u=>new Request(u,{cache:'reload'})))))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('still-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
// A new version waits until the page offers "Refresh" and the person accepts, so nobody is switched mid-reflection.
self.addEventListener('message',e=>{if(e.data==='skip-waiting')self.skipWaiting()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;const nav=e.request.mode==='navigate';e.respondWith(caches.match(nav?'./index.html':e.request,{ignoreSearch:nav}).then(cached=>cached||fetch(e.request).catch(()=>Response.error())))});
