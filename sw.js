/*! © 2026 Elitrack. Tous droits réservés. Code, design et méthodes d'analyse protégés par le droit d'auteur (CPI art. L.122-4, L.335-2). Toute copie, reproduction ou réutilisation sans accord écrit est interdite. Version 20261019-0153. */
"use strict";
const V='elitrack-20261019-0153';
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(V).then(c=>c.addAll(['./','index.html','icone.svg','manifest.json'])).catch(()=>{}));});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
const r=e.request,u=new URL(r.url);
if(r.method!=='GET'||u.origin!==self.location.origin)return;
const fresh=r.mode==='navigate'||/\.json$/.test(u.pathname);
if(/[?&]v=/.test(u.search)||/\.(woff2|png)$/.test(u.pathname)){
e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok&&res.type==='basic'){const c=res.clone();caches.open(V).then(x=>x.put(r,c)).catch(()=>{});}return res;})));
return;
}
e.respondWith(fetch(fresh?new Request(r.url,{cache:'no-cache',credentials:'same-origin'}):r).then(res=>{if(res.ok&&res.type==='basic'){const c=res.clone();caches.open(V).then(x=>x.put(r,c)).catch(()=>{});}return res;})
.catch(()=>caches.match(r,{ignoreSearch:r.mode==='navigate'}).then(m=>m||(r.mode==='navigate'?caches.match('index.html'):null)).then(m=>m||Response.error())));
});
