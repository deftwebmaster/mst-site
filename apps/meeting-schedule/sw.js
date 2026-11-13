// Bump VERSION when icons or the scan image change. Edits to the HTML, CSS, JS, and
// manifest are picked up automatically: the app checks for them when it opens online.
const VERSION='v7';
const PREFIX='daily-meetings-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+VERSION;
const CORE=['./','./index.html','./style.css','./app.js','./schedule.js','./storage.js','./manifest.webmanifest'];
const STATIC=['./icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-any-192.png','./icons/icon-any-512.png','./schedule-scan.jpeg'];

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll([...CORE,...STATIC].map(u=>new Request(u,{cache:'reload'}))))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

// Download every core file; replace the saved copy only if all succeed and something changed,
// so the app never runs with a mix of old and new files.
async function refresh(){
 const cache=await caches.open(CACHE);
 const fresh=await Promise.all(CORE.map(async url=>{const res=await fetch(url,{cache:'no-cache'});if(!res.ok)throw Error(url);return [url,res];}));
 let changed=false;
 for(const [url,res] of fresh){const old=await cache.match(url);if(!old||await old.text()!==await res.clone().text()){changed=true;break;}}
 if(!changed)return false;
 await Promise.all(fresh.map(([url,res])=>cache.put(url,res)));
 return true;
}
self.addEventListener('message',event=>{
 if(event.data==='SKIP_WAITING')self.skipWaiting();
 if(event.data==='CHECK_FOR_UPDATES')event.waitUntil(refresh().then(changed=>{if(changed)event.source?.postMessage('APP_UPDATED');}).catch(()=>{}));
});

// Cache first: opens instantly, even on weak Wi-Fi or offline.
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const hit=await cache.match(req,{ignoreSearch:req.mode==='navigate'})||(req.mode==='navigate'?await cache.match('./index.html'):undefined);
  return hit||fetch(req);
 })());
});
