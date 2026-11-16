// LEGACY (MattST) — keep this file at ./sw.js with the same cache PREFIX so existing
// Home Screen installs keep updating. Bump VERSION when icons or the scan image change.
// Edits to the HTML, CSS, JS, and manifest are picked up automatically when the app opens online.
// v9: schedule-only version with the "moved to ManicZone" banner.
const VERSION='v9';
const PREFIX='daily-meetings-'+encodeURIComponent(self.registration.scope)+'-';
const CACHE=PREFIX+VERSION;
const CORE=['./','./index.html','./style.css','./app.js','./schedule.js','./storage.js','./manifest.webmanifest'];
const STATIC=['./icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-any-192.png','./icons/icon-any-512.png','./icons/new-app-icon.png','./schedule-scan.jpeg'];
// storage.js is no longer used by this version but must stay deployed: older service workers still
// on residents' phones re-download every CORE file and skip the update entirely if any one is missing.

// Safari won't open a page from a saved response that came through a redirect (some hosts
// redirect index.html to /), so store a plain copy of anything that was redirected.
async function clean(res){
 if(!res.redirected)return res;
 return new Response(await res.blob(),{status:res.status,statusText:res.statusText,headers:res.headers});
}
async function fetchClean(url,cacheMode){const res=await fetch(url,{cache:cacheMode});if(!res.ok)throw Error(url);return clean(res);}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);
 const all=[...CORE,...STATIC],responses=await Promise.all(all.map(u=>fetchClean(u,'reload')));
 await Promise.all(responses.map((res,i)=>cache.put(all[i],res)));
 // Take over right away so existing installs see the migration banner without an extra tap.
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

// Download every core file; replace the saved copy only if all succeed and something changed,
// so the app never runs with a mix of old and new files.
async function refresh(){
 const cache=await caches.open(CACHE);
 const fresh=await Promise.all(CORE.map(async url=>[url,await fetchClean(url,'no-cache')]));
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
