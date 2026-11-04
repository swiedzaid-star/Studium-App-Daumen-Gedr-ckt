/* Lädt den Kern (klein) und danach die Fach-Dateien parallel. Erst wenn alles da ist, startet die App.
   Die Fach-Dateien tragen einen Inhalts-Hash im Namen: Nach einem Update lädt nur neu, was sich geändert hat. */
(function(){
  'use strict';
  var core=document.currentScript&&document.currentScript.getAttribute('data-core');
  var ver=(document.currentScript&&document.currentScript.src.match(/v=(\d+)/)||[])[1]||'';
  var main=document.getElementById('main');
  function note(t){var el=document.getElementById('bootnote');if(el)el.textContent=t}
  function load(src){return new Promise(function(ok,bad){var s=document.createElement('script');s.src=src;s.async=true;s.onload=function(){ok(src)};s.onerror=function(){bad(new Error('Laden fehlgeschlagen: '+src))};document.head.appendChild(s)})}
  function start(){
    var D=window.DATA,P=window.DATA_PART||{};
    D.mods.forEach(function(m){var part=P[m.id]||{};m.lectures=part.lectures||[];m.tasks=part.tasks||[];m.formulas=part.formulas||[]});
    try{if(sel&&navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.controller.postMessage({keep:[core].concat(sel.map(function(k){return (D.files||{})[k]}).filter(Boolean))})}catch(e){} /* Service Worker hält nur die gewählten */
    return load('taskgen.js?v='+ver).then(function(){return load('app.js?v='+ver)});
  }
  function fail(e){if(main)main.innerHTML='<section class="sec"><div class="card empty">Die Inhalte konnten nicht geladen werden.<br><small>'+String(e&&e.message||e).replace(/</g,'&lt;')+'</small><br><br><button class="btn" onclick="location.reload()">Noch einmal versuchen</button></div></section>'}
  /* Nur die gewählten Fächer laden (S.mods im Lernstand). Ohne Auswahl nichts: die App entscheidet nach dem ersten Sync
     (Auswahl vom Server, Bestands-Übernahme oder Onboarding) und lädt dann nach (ensureMods). */
  var sel=null;try{var st=JSON.parse(localStorage.getItem('studium-v1')||'{}');if(Array.isArray(st.mods))sel=st.mods}catch(e){}
  load(core).then(function(){
    var D=window.DATA||{},files=D.files||{},vers=(((D.katalog||{}).mods)||[]).filter(function(k){return k.versteckt&&window.__zeigeVersteckt!==1}).map(function(k){return k.id}),
      ids=Object.keys(files).filter(function(id){return !!sel&&sel.indexOf(id)>=0&&vers.indexOf(id)<0}),n=0; /* Auftrag 13: versteckte Fächer nicht laden */ /* Befund 67: Bestandsgeräte ohne Auswahl laden erst nach dem Sync (startGate), nicht vorab alle Fächer */
    note('Inhalte laden … 0/'+ids.length);
    return Promise.all(ids.map(function(id){return load(files[id]).then(function(){n++;note('Inhalte laden … '+n+'/'+ids.length)})}));
  }).then(start).catch(fail);
})();
