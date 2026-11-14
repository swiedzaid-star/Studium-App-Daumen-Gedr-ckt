/* Offline-Speicher: App-Dateien immer frisch aus dem Netz, ohne Netz aus dem Speicher. */
var CACHE='studium-v2';var HASHED=/\/data-[a-z0-9-]+\.[0-9a-f]{8}\.js$/; /* auch data-<fach>-f.<hash>.js (Formel-Teile, Auftrag 81) */
var CORE=['./','index.html','manifest.json','icon-180.png','icon-192.png','icon-512.png','icon-maskable-192.png','icon-maskable-512.png','icon-mono-192.png','favicon-32.png','favicon-16.png','icon.svg','sky.svg','scene-studium-light.svg','scene-studium-dark.svg'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(CORE)}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var req=e.request;if(req.method!=='GET')return;var u=new URL(req.url);
  var ext=/cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.host);
  if(ext){ /* Formel-Bibliothek und Schriften: einmal laden, dann aus dem Speicher */
    e.respondWith(caches.match(req).then(function(hit){return hit||fetch(req).then(function(res){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)});return res})}));return}
  if(u.origin!==location.origin)return;
  if(HASHED.test(u.pathname)){ /* Inhalt-Dateien mit Hash: einmal laden, dann immer aus dem Speicher */
    e.respondWith(caches.match(req).then(function(hit){return hit||fetch(req).then(function(res){if(res.ok){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)})}return res})}));return}
  var noStore=req.cache==='no-store'||u.searchParams.has('t'); /* Update-Prüfung (index.html?t=…): nie speichern, sonst wächst der Speicher endlos */
  e.respondWith(fetch(req).then(function(res){if(res.ok&&!noStore){var cp=res.clone();caches.open(CACHE).then(function(c){c.put(req,cp)})}return res})
    .catch(function(){return caches.match(req,{ignoreSearch:true}).then(function(hit){return hit||caches.match('index.html')})}));
});
/* Nachrichten der App:
   keep = Liste der gebrauchten Inhalt-Dateien → alte aufräumen, fehlende nachholen;
   warm = Adressen, die die Seite schon geladen hat, bevor der Service Worker lief (erster Besuch) → in den Speicher holen.
   So ist die App schon nach dem ersten Laden offline vollständig (Auftrag 81). */
function holen(c,url){return fetch(url).then(function(res){if(res.ok)return c.put(url,res)}).catch(function(){})}
self.addEventListener('message',function(e){var keep=e.data&&e.data.keep,warm=e.data&&e.data.warm;if(!keep&&!warm)return;
  e.waitUntil(caches.open(CACHE).then(function(c){var jobs=[];
    if(keep)jobs.push(c.keys().then(function(ks){var have={};
      ks.forEach(function(r){var u=new URL(r.url),n=u.pathname.split('/').pop();if(!HASHED.test(u.pathname))return;if(keep.indexOf(n)<0)c.delete(r);else have[n]=1});
      return Promise.all(keep.filter(function(n){return !have[n]&&HASHED.test('/'+n)}).map(function(n){return holen(c,n)}))}));
    if(warm)jobs.push(Promise.all(warm.filter(function(u){return String(u).indexOf(self.location.origin+'/')===0}).map(function(u){return c.match(u).then(function(hit){if(!hit)return holen(c,u)})})));
    return Promise.all(jobs)}))});
