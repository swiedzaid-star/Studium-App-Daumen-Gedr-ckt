/* Offline-Speicher: App-Dateien immer frisch aus dem Netz, ohne Netz aus dem Speicher. */
var CACHE='studium-v2';var HASHED=/\/data-[a-z]+\.[0-9a-f]{8}\.js$/;
var CORE=['./','index.html','manifest.json','icon-180.png','icon-192.png','icon-512.png','icon.svg','sky.svg','scene-studium-light.svg','scene-studium-dark.svg'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var req=e.request;if(req.method!=='GET')return;var u=new URL(req.url);
  var ext=/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.host);
  if(ext){ /* Formel-Bibliothek und Schriften: einmal laden, dann aus dem Speicher */
    e.respondWith(caches.match(req).then(function(hit){return hit||fetch(req).then(function(res){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)});return res})}));return}
  if(u.origin!==location.origin)return;
  if(HASHED.test(u.pathname)){ /* Inhalt-Dateien mit Hash: einmal laden, dann immer aus dem Speicher */
    e.respondWith(caches.match(req).then(function(hit){return hit||fetch(req).then(function(res){if(res.ok){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)})}return res})}));return}
  e.respondWith(fetch(req).then(function(res){if(res.ok){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)})}return res})
    .catch(function(){return caches.match(req,{ignoreSearch:true}).then(function(hit){return hit||caches.match('index.html')})}));
});
self.addEventListener('message',function(e){var keep=e.data&&e.data.keep;if(!keep)return; /* alte Inhalt-Dateien aufräumen */
  caches.open(CACHE).then(function(c){c.keys().then(function(ks){ks.forEach(function(r){var u=new URL(r.url);if(HASHED.test(u.pathname)&&keep.indexOf(u.pathname.split('/').pop())<0)c.delete(r)})})})});
