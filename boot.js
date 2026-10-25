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
    try{if(navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.controller.postMessage({keep:[core].concat(Object.keys(D.files||{}).map(function(k){return D.files[k]}))})}catch(e){}
    return load('taskgen.js?v='+ver).then(function(){return load('app.js?v='+ver)});
  }
  function fail(e){if(main)main.innerHTML='<section class="sec"><div class="card empty">Die Inhalte konnten nicht geladen werden.<br><small>'+String(e&&e.message||e).replace(/</g,'&lt;')+'</small><br><br><button class="btn" onclick="location.reload()">Noch einmal versuchen</button></div></section>'}
  load(core).then(function(){
    var D=window.DATA||{},files=D.files||{},ids=Object.keys(files),n=0;
    note('Inhalte laden … 0/'+ids.length);
    return Promise.all(ids.map(function(id){return load(files[id]).then(function(){n++;note('Inhalte laden … '+n+'/'+ids.length)})}));
  }).then(start).catch(fail);
})();
