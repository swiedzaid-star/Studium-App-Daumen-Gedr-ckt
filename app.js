/* Studium-App · läuft komplett im Browser, Fortschritt in localStorage */
(function(){
'use strict';
var D = window.DATA || {mods:[],studium:{},symbols:{}};
var main = document.getElementById('main');
var layer = document.getElementById('layer');

/* ---------- Hilfen ---------- */
function $(s,r){return (r||document).querySelector(s)}
function $$(s,r){return [].slice.call((r||document).querySelectorAll(s))}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function wrapTables(h){return String(h==null?'':h).replace(/<table/g,'<div class="scroll"><table').replace(/<\/table>/g,'</table></div>')}
function mx(s){s=String(s==null?'':s).trim();return /\\\(|\\\[/.test(s)?texSafe(s):'\\('+texSafe(s)+'\\)'}
function texSafe(s){return String(s==null?'':s).replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t}return a}
function uniq(a){return a.filter(function(x,i){return a.indexOf(x)===i})}
var reduceMotion=false;
try{reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}

/* ---------- Speicher ---------- */
(function(){try{['studium-v1','device','studium-sync','handoff-seen'].forEach(function(k){var o=String.fromCharCode(122,97,105,100,45)+k;if(localStorage.getItem(k)===null&&localStorage.getItem(o)!==null){localStorage.setItem(k,localStorage.getItem(o))}})}catch(e){}})();
var KEY='studium-v1', S;
var DEVID=(function(){try{var d=localStorage.getItem('device');if(!d){d=Math.random().toString(36).slice(2,10);localStorage.setItem('device',d)}return d}catch(e){return 'x'}})(),DEVNAME=/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)?'Handy':'Laptop';
var SYNCKEY='studium-sync',SY;try{SY=JSON.parse(localStorage.getItem(SYNCKEY))||{}}catch(e){SY={}}
var AUTHKEY='studium-auth',AUTH;try{AUTH=JSON.parse(localStorage.getItem(AUTHKEY))||{}}catch(e){AUTH={}}
try{S=JSON.parse(localStorage.getItem(KEY))||{}}catch(e){S={}}
var SECTIONS=['done','tasks','cards','diag','plans','quiz','rules','todos','days','haeppchen','kr','ui','read','sym','nach','mast'],SCALARS=['xp','name','theme'];
SECTIONS.forEach(function(k){S[k]=S[k]||{}});S._ts=S._ts||{};S._v=2;
/* Zeitstempel je Schlüssel: Beim Speichern wird jeder Abschnitt mit dem letzten Stand verglichen; was sich geändert hat, bekommt
   S._ts[abschnitt][schluessel]=jetzt. Damit kann der Sync später Gerät für Gerät zusammenführen, ohne dass Altes Neues überschreibt. */
var SNAP={};function snapInit(){SECTIONS.forEach(function(sec){var o=S[sec],sn=SNAP[sec]={};Object.keys(o).forEach(function(k){sn[k]=JSON.stringify(o[k])})});SNAP._s={};SCALARS.forEach(function(k){SNAP._s[k]=JSON.stringify(S[k])})}
function stamp(){var now=Date.now();SECTIONS.forEach(function(sec){var o=S[sec]||{},sn=SNAP[sec]||(SNAP[sec]={}),ts=S._ts[sec]=S._ts[sec]||{};
  Object.keys(o).forEach(function(k){var j=JSON.stringify(o[k]);if(sn[k]!==j){sn[k]=j;ts[k]=now}});
  Object.keys(sn).forEach(function(k){if(!(k in o)){delete sn[k];ts[k]=now}})});
  var ts=S._ts._s=S._ts._s||{};SCALARS.forEach(function(k){var j=JSON.stringify(S[k]);if(SNAP._s[k]!==j){SNAP._s[k]=j;ts[k]=now}})}
snapInit();
S.xp=S.xp||0;
function save(){stamp();S._mod=Date.now();try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}if(typeof syLater==='function')syLater()}
if(S.theme)document.documentElement.setAttribute('data-theme',S.theme);

/* ---------- Datum ---------- */
var NOW=new Date(); var TODAY=new Date(NOW.getFullYear(),NOW.getMonth(),NOW.getDate());
var WD=['So','Mo','Di','Mi','Do','Fr','Sa'], WDL=['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
var MON=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
function pd(s){if(!s)return null;var p=String(s).split('-').map(Number);return new Date(p[0],p[1]-1,p[2])}
function ymd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x}
function monday(d){var x=new Date(d);x.setDate(x.getDate()-((x.getDay()+6)%7));return x}
function dd(a,b){return Math.round((b-a)/86400000)}
function fmtD(d){return WD[d.getDay()]+' '+d.getDate()+'.'+(d.getMonth()+1)+'.'}
function fmtDY(d){return fmtD(d)+(d.getFullYear()!==TODAY.getFullYear()?String(d.getFullYear()).slice(2):'')}
function rel(d){var n=dd(TODAY,d);return n===0?'heute':n===1?'morgen':n===-1?'gestern':n>0?'in '+n+' Tagen':'vor '+(-n)+' Tagen'}
function tmin(t){var m=/(\d{1,2}):(\d{2})/.exec(t||'');return m?(+m[1])*60+(+m[2]):null}
var thisMon=monday(TODAY), nextMon=addDays(thisMon,7), lastMon=addDays(thisMon,-7);

/* ---------- Fächer ---------- */
var ORDER=['mathe','stat','bsk','bure','gdm','mech','spa'];
var SHORT={mathe:'Mathe',stat:'Statistik',bsk:'Baustoffkunde',bure:'Buchführung',gdm:'Management',mech:'Mechanik',spa:'Spanisch',studium:'Studium'};
var MODS=[],MOD={};
ORDER.forEach(function(id){var m=(D.mods||[]).find(function(x){return x.id===id});if(m){MODS.push(m);MOD[id]=m}});
(D.mods||[]).forEach(function(m){if(!MOD[m.id]){MODS.push(m);MOD[m.id]=m}});
var TASK={},TERM={},FORM={},TOPIC={},LECT={};
MODS.forEach(function(m){
  ['lectures','topics','tasks','exams','events','weekly','formulas'].forEach(function(k){m[k]=m[k]||[]});
  m.info=m.info||{};
  m.topics.forEach(function(t){TOPIC[t.id]=t;t.mod=m.id});
  m.lectures.forEach(function(l){LECT[l.id]=l;l.mod=m.id;(l.terms||[]).forEach(function(t){t.mod=m.id;t.lecture=l.id;t.key=m.id+':'+t.t;TERM[t.key]=t})});
  m.tasks.forEach(function(t){t.mod=m.id;TASK[t.id]=t});
  m.formulas.forEach(function(f){f.mod=m.id;FORM[f.id]=f});
});
function cls(id){return 'm-'+(id||'studium')}
function termsOf(m){var a=[];m.lectures.forEach(function(l){(l.terms||[]).forEach(function(t){a.push(t)})});return a}
function tasksOfTopic(tid){return MOD[TOPIC[tid]&&TOPIC[tid].mod]?MOD[TOPIC[tid].mod].tasks.filter(function(t){return t.topic===tid}):[]}
function noteHtml(n){return String(n).split(/\n+/).map(function(l){l=l.trim();if(!l)return '';var m=l.match(/^([^:]{2,40}):\s+(.*)$/);return '<p class="note-l">'+(m?'<b class="nl">'+esc(m[1])+':</b> '+esc(m[2]):esc(l))+'</p>'}).join('')}
function topicsOfLecture(l){var ex=l.topics||[];return MOD[l.mod].topics.filter(function(t){return t.lecture===l.id||ex.indexOf(t.id)>=0})}
function lectureDate(t){var l=LECT[t.lecture];return l&&l.date?pd(l.date):null}
function lecHeld(l){var d=pd(l.date);if(!d)return true;if(d<TODAY)return true;if(d>TODAY)return false;var end=tmin((l.time||'').split('–')[1]||'');return end==null?false:(NOW.getHours()*60+NOW.getMinutes())>=end}

/* ---------- Ergebnisse, XP, Serie ---------- */
function res(id){var r=S.tasks[id];return r?r.r:null}
function topicScore(tid){var ts=tasksOfTopic(tid),n=0,s=0;ts.forEach(function(t){var r=res(t.id);if(r!=null){n++;s+=r}});return n?s/n:null}
function activity(xp){var before=level().l;S.xp+=xp||0;S.days[ymd(TODAY)]=(S.days[ymd(TODAY)]||0)+1;save();if(level().l>before){confetti();toast('Level '+level().l+' erreicht!')}}
function streak(){var n=0,d=new Date(TODAY);if(!S.days[ymd(d)])d=addDays(d,-1);while(S.days[ymd(d)]){n++;d=addDays(d,-1)}return n}
function level(){var xp=S.xp,l=1,need=100;while(xp>=need){xp-=need;l++;need=100+l*40}return {l:l,cur:xp,need:need}}

/* ---------- Bereitschaft ---------- */
function termsOfTopic(tid){var m=MOD[TOPIC[tid]&&TOPIC[tid].mod];return m?termsOf(m).filter(function(t){return t.topic===tid}):[]}
function cardScore(ts){if(!ts.length)return null;return ts.filter(function(t){var c=S.cards[t.key];return c&&c.box>=2}).length/ts.length}
function taskReady(ts){if(!ts.length)return null;var s=0;ts.forEach(function(t){var r=res(t.id);s+=r==null?0:r});return s/ts.length}
function topicReady(tid){var a=taskReady(tasksOfTopic(tid)),b=cardScore(termsOfTopic(tid));if(a==null&&b==null)return null;if(a==null)return b;if(b==null)return a;return .7*a+.3*b}
function examReady(x){var v=(x.topics||[]).map(topicReady).filter(function(r){return r!=null});if(!v.length)return null;return v.reduce(function(a,b){return a+b},0)/v.length}
function lectureReady(l){var tk=[];topicsOfLecture(l).forEach(function(t){tk=tk.concat(tasksOfTopic(t.id))});var read=S.read[l.id]?1:0,c=cardScore(l.terms||[]),t=taskReady(tk);var parts=[read];if(c!=null)parts.push(c);if(t!=null)parts.push(t);return {v:parts.reduce(function(a,b){return a+b},0)/parts.length,read:read,cards:c,tasks:t}}
function pct(v){return Math.round((v||0)*100)}
function rbar(v,label){var p=pct(v),c=p<40?'bad':p<75?'warn':'ok';return '<div class="ready"><div class="rl"><span>'+(label||'Bereit')+'</span><b>'+p+' %</b></div><div class="bar '+c+'"><span style="width:'+Math.max(3,p)+'%"></span></div></div>'}

/* ---------- Termine und Fristen ---------- */
var KIND={termin:'Termin',frist:'Frist',klausur:'Klausur',testat:'Testat',ln:'Leistungsnachweis',ha:'Hausaufgabe'};
var EV=null;
function events(){
  if(EV)return EV;var out=[];
  MODS.forEach(function(m){
    m.events.forEach(function(e){if(e.date)out.push(Object.assign({},e,{mod:m.id}))});
    m.exams.forEach(function(x){if(x.date)out.push({id:x.id,mod:m.id,date:x.date,time:x.time,title:x.name,kind:x.kind,place:x.place,note:x.note,exam:true})});
  });
  ((D.studium||{}).events||[]).forEach(function(e){out.push(Object.assign({},e,{mod:'studium'}))});
  out.forEach(function(e){e.d=pd(e.date);e.tm=tmin(e.time)});
  out.sort(function(a,b){return a.d-b.d||((a.tm||0)-(b.tm||0))});
  return EV=out;
}
function isDl(e){return e.kind!=='termin'}
function isPast(e){if(e.d<TODAY)return true;if(+e.d===+TODAY&&e.tm!=null&&!/bis/.test(e.time||'')&&e.kind==='termin'){return NOW.getHours()*60+NOW.getMinutes()>e.tm+60}
  if(+e.d===+TODAY&&e.tm!=null&&/bis|frist/.test((e.time||'')+e.kind)){return NOW.getHours()*60+NOW.getMinutes()>e.tm}return false}
function missed(){return events().filter(function(e){return isDl(e)&&isPast(e)&&!S.done[e.id]})}
function upcoming(){return events().filter(function(e){return isDl(e)&&!isPast(e)&&!S.done[e.id]})}
function freiAt(d,from,to){var y=ymd(d);return ((D.studium&&D.studium.frei)||[]).some(function(f){if(y<f.from||y>f.to)return false;if(!f.time)return true;var t=f.time.split('–'),a=tmin(t[0]),b=tmin(t[1]),x=tmin(from),z=tmin(to);return x<b&&z>a})}
function weeklyOn(d){var out=[],wd=d.getDay();MODS.forEach(function(m){m.weekly.forEach(function(w,i){if(w.wd===wd&&(!w.start||pd(w.start)<=d)&&(!w.end||pd(w.end)>=d)&&!(w.skip&&w.skip.indexOf(ymd(d))>=0)&&!freiAt(d,w.from,w.to))out.push({id:'w-'+m.id+'-'+i+'-'+ymd(d),mod:m.id,title:w.title,time:w.from+'–'+w.to,place:w.place,note:w.note,kind:'termin',weekly:true,d:d,grpKey:w.grpKey,grp:w.grp})})});return out}
function nextExam(m){var a=m.exams.filter(function(x){return x.date&&pd(x.date)>=TODAY}).sort(function(a,b){return pd(a.date)-pd(b.date)});return a[0]||m.exams.find(function(x){return !x.date})||null}

/* ---------- Was steht an? (nächste 36 h) ---------- */
function upcomingSlots(){var out=[],nowMin=NOW.getHours()*60+NOW.getMinutes();
  [0,1,2].forEach(function(off){var d=addDays(TODAY,off);weeklyOn(d).filter(function(w){var G=(S.ui&&S.ui.grp)||{};return !w.grpKey||G[w.grpKey]===w.grp}).forEach(function(w){var st=tmin(w.time);if(off===0&&st!=null&&st+90<nowMin)return;out.push(Object.assign({},w,{start:st,off:off}))});
    events().filter(function(e){return +e.d===+d&&e.kind==='termin'&&!e.weekly}).forEach(function(e){if(off===0&&e.tm!=null&&e.tm+90<nowMin)return;out.push({id:e.id,mod:e.mod,title:e.title,time:e.time,place:e.place,kind:'termin',d:d,start:e.tm,off:off,single:true})})});
  out=out.filter(function(x,i){return x.single||!out.some(function(y){return y.single&&y.mod===x.mod&&y.off===x.off&&y.start===x.start})});
  out.sort(function(a,b){return a.off-b.off||((a.start||0)-(b.start||0))});return out.slice(0,6)}
function prepFor(slot){var m=MOD[slot.mod];if(!m)return null;var title=(slot.title||'').toLowerCase();
  var past=m.lectures.filter(function(l){return pd(l.date)&&lecHeld(l)}).sort(function(a,b){return pd(b.date)-pd(a.date)});
  var last=past[0];if(!last)return null;
  var isEx=/übung|ha |hausaufg|präsenz|frage/.test(title),topics=topicsOfLecture(last),tk=[];topics.forEach(function(t){tk=tk.concat(tasksOfTopic(t.id))});
  var terms=(last.terms||[]).slice(0,8);
  return {lecture:last,tasks:shuffle(tk).slice(0,isEx?6:3),terms:terms,isEx:isEx}}
function slotLabel(sl){return (sl.off===0?'Heute':sl.off===1?'Morgen':WD[sl.d.getDay()])+(sl.time?' '+sl.time.replace(/–.*/,''):'')}

/* ---------- Icons ---------- */
var IC={
 pin:'<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" style="vertical-align:-2px"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/></svg>',
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
 flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
 grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
 x:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
 back:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
 eye:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="3"/></svg>',
 chev:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
 fire:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2c1 4 5 5.5 5 10.5A5 5 0 0 1 7 12.5c0-2 1-3.5 2-4.5.3 1.6 1.2 2.6 2.3 2.6C11 8 11 5 12 2z"/></svg>',
 bolt:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z"/></svg>',
 play:'<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
 timer:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg>'
};
function ck(id,label){var on=!!S.done[id];return '<button class="ck'+(on?' on':'')+'" data-act="done" data-id="'+esc(id)+'" aria-pressed="'+on+'" aria-label="'+esc(label||'erledigt')+'">'+IC.check+'</button>'}

/* ---------- MathJax ---------- */
function wideMath(el){try{(el||document).querySelectorAll('mjx-container:not([display="true"])').forEach(function(m){var p=m.parentElement;if(p&&m.getBoundingClientRect().width>p.clientWidth+1)m.classList.add('mjwide')})}catch(e){}}
function ts(el){try{if(window.MathJax&&MathJax.typesetPromise){if(MathJax.typesetClear)MathJax.typesetClear([el]);MathJax.typesetPromise([el]).then(function(){wideMath(el)}).catch(function(){})}}catch(e){}}
window.__typesetMain=function(){ts(main);if(!layer.hidden)ts(layer)};
setTimeout(function(){if(!(window.MathJax&&MathJax.typesetPromise)){document.body.classList.add('nomj');toast('Formeln werden gerade nur als Text gezeigt (kein Internet?).')}},7000);

/* ---------- Konfetti ---------- */
function confetti(){if(reduceMotion)return;var box=document.createElement('div');box.className='confetti';var cols=['#2448c9','#0b7480','#e2ae62','#6b3fb0','#b0325a','#2f6b1f','#c2410c'];
  for(var i=0;i<36;i++){var s=document.createElement('i');s.style.left=(Math.random()*100)+'%';s.style.background=cols[i%cols.length];s.style.animationDelay=(Math.random()*.25)+'s';s.style.transform='rotate('+(Math.random()*360)+'deg)';box.appendChild(s)}
  document.body.appendChild(box);setTimeout(function(){box.remove()},1600)}
function toast(msg){var t=document.createElement('div');t.className='toast';t.textContent=String(msg);document.body.appendChild(t);setTimeout(function(){t.classList.add('out')},1700);setTimeout(function(){t.remove()},2200)}

/* ================= Router ================= */
var UI={calY:TODAY.getFullYear(),calM:TODAY.getMonth(),calSel:ymd(TODAY),calOff:S.ui.calOff||{},calWeekly:!!S.ui.calWeekly,calGroups:S.ui.calGroups!==false,calView:S.ui.calView||'woche'};
function saveUI(){S.ui.calOff=UI.calOff;S.ui.calWeekly=UI.calWeekly;S.ui.calGroups=UI.calGroups;S.ui.calView=UI.calView;save()}
function isGroupEv(e){return /Präsenzübung|Gruppenübung|Kleingruppe|Tutorium/i.test(e.title||'')}
function calWeeklyOn(d){var G=(S.ui&&S.ui.grp)||{};return weeklyOn(d).filter(function(e){if(UI.calOff[e.mod])return false;if(e.grpKey)return UI.calGroups&&G[e.grpKey]===e.grp;return UI.calGroups||!isGroupEv(e)})}
function grpPicker(){var G=(S.ui&&S.ui.grp)||{},keys={};MODS.forEach(function(m){m.weekly.forEach(function(w){if(w.grpKey){(keys[w.grpKey]=keys[w.grpKey]||{mod:m.id,label:w.grpLabel||'Gruppe',opts:[]}).opts.push(w)}})});
  return Object.keys(keys).map(function(k){var o=keys[k];return '<label class="toggle" style="margin-top:6px;gap:8px"><span>'+esc(SHORT[o.mod])+': '+esc(o.label)+'</span><select data-act="grp" data-k="'+k+'" class="search" style="width:auto;min-height:36px;padding:4px 8px"><option value="">keine gewählt</option>'+o.opts.map(function(w){return '<option value="'+esc(w.grp)+'"'+(G[k]===w.grp?' selected':'')+'>'+esc(w.title)+' · '+WD[w.wd]+' '+w.from+'</option>'}).join('')+'</select></label>'}).join('')}
function go(h){location.hash=h}
function route(keep){try{ensureFixPlans()}catch(e){}
  var y=window.scrollY,h=(location.hash||'#/heute').slice(2),p=h.split('/');
  var v=p[0]||'heute',html='';
  document.body.setAttribute('data-page',v==='fach'&&MOD[p[1]]?'fach':v);['mathe','stat','bsk','bure','gdm','mech','spa','studium'].forEach(function(k){document.body.classList.remove('pg-'+k)});if(v==='fach'&&MOD[p[1]])document.body.classList.add('pg-'+p[1]);if(v==='studium'||v==='symbole')document.body.classList.add('pg-studium');
  try{
    document.body.classList.remove('pg-login');if(!loggedIn()||AUTH.recovery){main.innerHTML=vLogin();document.body.setAttribute('data-page','login');document.body.classList.add('pg-studium','pg-login');window.scrollTo(0,0);return}
    if(v==='heute')html=vHeute();
    else if(v==='kalender')html=vKalender();
    else if(v==='fristen')html=vFristen(p[1]||'bald');
    else if(v==='faecher')html=vFaecher();
    else if(v==='fach'&&MOD[p[1]])html=vFach(MOD[p[1]],p[2]||'woche',p[3]);
    else if(v==='studium')html=vStudium();
    else if(v==='symbole')html=vSymbole();
    else html=vHeute();
  }catch(err){html='<div class="wrap"><p class="empty">Hier ist etwas schiefgelaufen: '+esc(err.message)+'</p></div>';console.error(err)}
  main.innerHTML=html;
  $$('.nav a').forEach(function(a){a.classList.toggle('on',a.getAttribute('data-v')===(v==='fach'||v==='studium'||v==='symbole'?'faecher':v))});
  var nb=$('#navbadge'),mc=missed().length;if(nb){nb.textContent=mc;nb.hidden=!mc}
  window.scrollTo(0,keep?y:0);ts(main);
  var on=$('.tabs .on',main);if(on&&on.scrollIntoView)try{on.scrollIntoView({inline:'center',block:'nearest'})}catch(e){}
  var fc=main.querySelector('.hcard:not(.done)');if(fc)fc.classList.add('focus');
  setTimeout(hideSquirrel,80);
}
window.addEventListener('hashchange',function(){route(false);markLast()});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&e.target&&(e.target.id==='lpw'||e.target.id==='lmail')){var b=$('[data-act=login]');if(b)b.click()}});
/* Weitermachen auf dem anderen Gerät */
var scrollT=null,handoffBusy=false;
function markLast(){if(handoffBusy)return;S.ui.last={h:location.hash||'#/heute',t:Date.now(),dev:DEVID,dn:DEVNAME,y:0};save()}
window.addEventListener('scroll',function(){if(!S.ui.last||S.ui.last.dev!==DEVID||handoffBusy)return;clearTimeout(scrollT);scrollT=setTimeout(function(){var se=document.scrollingElement,max=Math.max(1,se.scrollHeight-innerHeight);S.ui.last.y=Math.round(se.scrollTop/max*1000)/1000;S.ui.last.t=Date.now();save()},1500)},{passive:true});
function checkHandoff(){var L=S.ui&&S.ui.last;if(!L||L.dev===DEVID)return;var seen=0;try{seen=+localStorage.getItem('handoff-seen')||0}catch(e){}
  if(L.t<=seen||Date.now()-L.t>12*3600000)return;try{localStorage.setItem('handoff-seen',String(L.t))}catch(e){}
  if(!layer.hidden)return;handoffBusy=true;
  if((location.hash||'#/heute')!==L.h)location.hash=L.h;
  setTimeout(function(){var se=document.scrollingElement,max=Math.max(1,se.scrollHeight-innerHeight);window.scrollTo(0,(L.y||0)*max);toast('Weiter, wo du am '+(L.dn||'anderen Gerät')+' warst.');setTimeout(function(){handoffBusy=false},800)},400)}
function rerender(){route(true)}
/* ===== Eichhörnchen: versteckt sich auf jeder Seite irgendwo ===== */
var SQSVG="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 120'><ellipse cx='40' cy='64' rx='24' ry='40' transform='rotate(-18 40 64)' fill='#ff8f2e'/><circle cx='56' cy='27' r='15' fill='#ff8f2e'/><ellipse cx='36' cy='66' rx='11' ry='27' transform='rotate(-18 36 66)' fill='#ffd34d' opacity='.6'/><circle cx='57' cy='28' r='6' fill='#ffd34d' opacity='.6'/><ellipse cx='72' cy='84' rx='22' ry='25' fill='#ff6a1a'/><ellipse cx='79' cy='90' rx='12' ry='16' fill='#ffe39a'/><ellipse cx='62' cy='106' rx='11' ry='5' fill='#ff6a1a'/><ellipse cx='86' cy='107' rx='10' ry='5' fill='#ff6a1a'/><path d='M70 34L66 16L80 30Z' fill='#ff6a1a'/><path d='M71 30L69 21L76 29Z' fill='#ff9fb1'/><circle cx='80' cy='48' r='19' fill='#ff6a1a'/><ellipse cx='95' cy='55' rx='9' ry='7' fill='#ffe39a'/><circle cx='103' cy='52' r='2.8' fill='#2a1433'/><circle cx='87' cy='45' r='4.6' fill='#2a1433'/><circle cx='88.6' cy='43.4' r='1.6' fill='#fff'/><ellipse cx='88' cy='57' rx='4' ry='2.6' fill='#ff7f9a' opacity='.8'/><path d='M62 37A18 15 0 0 1 98 37Z' fill='#ffd34d'/><rect x='58' y='34.5' width='44' height='5.5' rx='2.75' fill='#ffbf1f'/><rect x='78' y='23' width='4' height='13' rx='2' fill='#ffbf1f'/><ellipse cx='94' cy='79' rx='7' ry='8.5' fill='#b8642b'/><path d='M86 74Q94 66 102 74Z' fill='#7a3f1d'/><rect x='93' y='66' width='2' height='5' fill='#7a3f1d'/><ellipse cx='90' cy='82' rx='6' ry='4.5' fill='#ff6a1a'/></svg>";
var SQSAY=['Du packst das!','Kleine Häppchen, großer Fortschritt.','Erst verstehen, dann rechnen.','Pause machen ist auch Lernen.','Noch eine Aufgabe, dann Nuss!','Bauen ist Statik – Lernen auch.','Gefunden! Weiter so.','Heute ein Stein, morgen ein Haus.'];
var SQPOS={};
function hideSquirrel(){
  var old=document.querySelector('.sqh');if(old)old.remove();
  var h=location.hash||'#/heute',pos=SQPOS[h];if(!pos)pos=SQPOS[h]={side:Math.random()<.5?'l':'r',f:Math.random()};
  var d=document.createElement('button');d.className='sqh';d.setAttribute('aria-label','Eichhörnchen');d.innerHTML=SQSVG;
  var wrap=main.querySelector('.wrap'),cw=wrap?wrap.getBoundingClientRect().width:800,margin=(innerWidth-cw)/2;
  if(margin>=170){ /* Desktop: im freien Seitenrand, nie über Inhalten */
    var sz=Math.min(150,margin-30);d.classList.add('side');d.style.width=d.style.height=sz+'px';
    d.style.top=(20+pos.f*55)+'vh';d.style[pos.side==='l'?'left':'right']=Math.max(10,(margin-sz)/2)+'px';if(pos.side==='r')d.classList.add('flip');
    document.body.appendChild(d)}
  else{ /* Handy: rechts oben im Kopfbereich, Überschrift bekommt Platz */
    var hd=main.querySelector('.band')||main.querySelector('.top');if(!hd)return;hd.classList.add('has-sq');hd.style.position='relative';d.classList.add('head');hd.appendChild(d)}
}
window.addEventListener('resize',function(){clearTimeout(window.__sqt);window.__sqt=setTimeout(hideSquirrel,150)});
document.addEventListener('click',function(e){var q=e.target.closest&&e.target.closest('.sqh');if(!q)return;e.preventDefault();
  q.classList.remove('hop');void q.offsetWidth;q.classList.add('hop');S.ui.sqn=(S.ui.sqn||0)+1;save();
  toast('🐿️ '+SQSAY[Math.floor(Math.random()*SQSAY.length)]+' <span class="muted small">('+S.ui.sqn+'× gefunden)</span>');
  if(Math.random()<.5){delete SQPOS[location.hash||'#/heute'];setTimeout(hideSquirrel,700)}});


/* ================= HEUTE ================= */
function greet(){var h=NOW.getHours();return h<11?'Guten Morgen':h<17?'Hallo':'Guten Abend'}
function haeppchen(){
  var out=[],used={};
  // 1. Lernplan-Einheit von heute (oder verpasste)
  MODS.forEach(function(m){m.exams.forEach(function(x){var p=S.plans[x.id];if(!p)return;p.sessions.forEach(function(s){if(!p.done[s.id]&&pd(s.date)<=TODAY&&out.length<1){out.push({key:'plan:'+x.id+':'+s.id,mod:m.id,title:s.title?x.name+': '+s.title:s.final?'Abschlusstest '+x.name:(function(){var tn=s.topics.map(function(t){return TOPIC[t]?TOPIC[t].name:t}).join(' + ');return x.name.indexOf(tn)>=0?'Lernplan '+x.name:'Lernplan '+x.name+': '+tn})(),min:s.min||(s.final?20:12),act:'session',exam:x.id,sid:s.id})}})})});
  // 2. Einstufungstest der nächsten Prüfung ohne Test
  if(out.length<1){var best=null;MODS.forEach(function(m){m.exams.forEach(function(x){if(x.date&&pd(x.date)>=TODAY&&dd(TODAY,pd(x.date))<=21&&!S.diag[x.id]&&diagItems(m,x).length&&(!best||pd(x.date)<pd(best.x.date)))best={m:m,x:x}})});
    if(best)out.push({key:'diag:'+best.x.id,mod:best.m.id,title:'Einstufungstest '+best.x.name+' ('+SHORT[best.m.id]+')',min:Math.max(5,Math.round(diagItems(best.m,best.x).length*2)),act:'diag',exam:best.x.id})}
  // 3. Wiederholung im Fach mit der jüngsten Vorlesung
  var recent=null;MODS.forEach(function(m){m.lectures.forEach(function(l){var d=pd(l.date);if(d&&lecHeld(l)&&reviewItems(m).length&&(!recent||d>recent.d))recent={m:m,d:d}})});
  if(recent)out.push({key:'rev:'+recent.m.id,mod:recent.m.id,title:'Wiederholung '+SHORT[recent.m.id],min:12,act:'review'});
  // 4. Fällige Karteikarten
  var due=dueCards();if(due.length)out.push({key:'cards',mod:due[0].mod,title:Math.min(due.length,20)+' Karteikarten wiederholen',min:Math.max(3,Math.round(Math.min(due.length,20)*.4)),act:'cards'});
  // 5. Auffüllen: Wiederholung in einem anderen Fach
  if(out.length<3){MODS.forEach(function(m){if(out.length<3&&!out.some(function(o){return o.mod===m.id})&&reviewItems(m).length)out.push({key:'rev:'+m.id,mod:m.id,title:'Wiederholung '+SHORT[m.id],min:12,act:'review'})})}
  return out.slice(0,3);
}
function hDone(k){return S.haeppchen[ymd(TODAY)]&&S.haeppchen[ymd(TODAY)][k]}
function hMark(k){var d=ymd(TODAY);S.haeppchen[d]=S.haeppchen[d]||{};if(!S.haeppchen[d][k]){S.haeppchen[d][k]=1;save();var hs=haeppchen();if(hs.length&&hs.every(function(h){return hDone(h.key)})){confetti();toast('Alle Häppchen geschafft! +50 XP');activity(50)}}}
function vHeute(){
  var lv=level(),st=streak(),mis=missed(),hs=haeppchen(),doneN=hs.filter(function(h){return hDone(h.key)}).length;
  var weekEnd=addDays(thisMon,7);
  var wk=upcoming().filter(function(e){return e.d<addDays(TODAY,8)}).slice(0,5);
  var h='<div class="wrap top"><div class="eyebrow">'+WDL[TODAY.getDay()]+', '+TODAY.getDate()+'. '+MON[TODAY.getMonth()]+'</div><h1>'+greet()+(S.name?', '+esc(S.name):'')+'</h1>'+(S.name?'':'<div class="card" style="margin-top:12px"><b>Wie heißt du?</b><p class="small muted" style="margin:4px 0 8px">Damit die App dich begrüßt. Wird mit deinen Geräten synchronisiert.</p><div class="btns"><input class="search" id="nm" placeholder="Vorname" autocomplete="given-name" style="flex:1;min-width:0"><button class="btn sm" data-act="setname">Speichern</button></div></div>')+
   '<div class="stats"><span class="stat"><span class="fire">'+IC.fire+'</span><b>'+st+'</b> '+(st===1?'Tag':'Tage')+' Serie</span><span class="stat">'+IC.bolt+'<b>Level '+lv.l+'</b><span class="bar sm"><span style="width:'+Math.round(lv.cur/lv.need*100)+'%"></span></span></span><button class="stat" data-act="theme" data-t="'+(S.theme==='dark'?'light':S.theme==='light'?'auto':'dark')+'" aria-label="Design wechseln">'+(S.theme==='dark'?'☾ Dunkel':S.theme==='light'?'☀ Hell':'◐ Auto')+'</button></div></div>';
  h+='<div class="wrap">';
  var sn=symNew().length;if(sn)h+='<a class="alert newsym" href="#/symbole"><b>'+sn+'</b> neue Symbole und Zeichen aus deinen Unterlagen. Jetzt lernen →</a>';
  if(mis.length)h+='<a class="alert" href="#/fristen/verpasst"><b>'+mis.length+'</b> verpasste '+(mis.length===1?'Frist':'Fristen')+'. Kurz anschauen →</a>';
  h+='<section class="sec"><h2>Deine 3 Häppchen <span class="chip '+(doneN===hs.length&&hs.length?'ok':'acc')+'">'+doneN+'/'+hs.length+'</span></h2>';
  if(!hs.length)h+='<div class="card empty">Heute nichts Offenes. Gönn dir eine Pause.</div>';
  h+='<div class="stack">';
  hs.forEach(function(x,i){var dn=hDone(x.key);
    h+='<div class="hcard '+cls(x.mod)+(dn?' done':'')+'"><div class="hn">'+(dn?IC.check:(i+1))+'</div><div class="grow"><div class="t">'+esc(x.title)+'</div><div class="s">'+SHORT[x.mod]+' · ca. '+x.min+' min</div></div>'+
     (dn?'<span class="chip ok">geschafft</span>':'<button class="btn sm" data-act="h" data-i="'+i+'">'+IC.play+'Los</button>')+'</div>'});
  h+='</div><div class="btns"><button class="btn ghost" data-act="focus">'+IC.timer+' Fokus-Timer starten</button></div></section>';
  var nd=nachDue();if(nd.length)h+='<section class="sec"><h2>Nachbereiten <span class="chip acc">'+nd.length+'</span></h2><div class="list">'+nd.slice(0,4).map(function(l){var d=pd(l.date);return '<div class="item '+cls(l.mod)+'"><span class="dot"></span><span class="grow"><span class="t">'+esc(SHORT[l.mod])+': '+esc(l.title)+'</span><div class="s">'+(d?WDL[d.getDay()]+', '+d.getDate()+'. '+MON[d.getMonth()]:'')+' · Wichtigstes + Abfrage</div></span><button class="btn sm" data-act="nach" data-l="'+l.id+'">Los</button></div>'}).join('')+'</div></section>';
  var sl=upcomingSlots();
  if(sl.length){h+='<section class="sec"><h2>Was ansteht</h2><div class="list">'+sl.map(function(x){var pr=prepFor(x);
    return '<div class="item '+cls(x.mod)+'"><span class="dot"></span><span class="grow"><span class="t">'+esc(SHORT[x.mod]||'')+': '+esc(x.title)+'</span><div class="s">'+slotLabel(x)+(x.place?' · '+esc(x.place):'')+'</div></span>'+(pr?'<button class="btn sm soft" data-act="prep" data-m="'+x.mod+'" data-ex="'+(pr.isEx?1:0)+'">Vorbereiten</button>':'')+'</div>'}).join('')+'</div></section>'}
  h+='<section class="sec"><h2>Nächste 7 Tage <a class="more" href="#/fristen/bald">alle</a></h2>';
  h+=wk.length?'<div class="list">'+wk.map(evRow).join('')+'</div>':'<div class="card empty">Keine Fristen in den nächsten 7 Tagen.</div>';
  h+='<p class="small muted">Uhr: '+String(NOW.getHours()).padStart(2,'0')+':'+String(NOW.getMinutes()).padStart(2,'0')+' · die App nutzt die Zeit deines Geräts.</p>';
  h+='</section>';
  h+='<section class="sec"><h2>Fächer diese Woche</h2><div class="list">';
  MODS.forEach(function(m){var ls=m.lectures.filter(function(l){var d=pd(l.date);return d&&d>=thisMon&&d<weekEnd});var nx=nextExam(m);
    h+='<a class="item '+cls(m.id)+'" href="#/fach/'+m.id+'/woche"><span class="dot"></span><span class="grow"><span class="t">'+esc(SHORT[m.id])+'</span><div class="s">'+(ls.length?'<b class="okc">'+ls.length+' neue Vorlesung'+(ls.length>1?'en':'')+'</b>':'nichts Neues')+(nx&&nx.date?' · '+esc(nx.name)+' '+rel(pd(nx.date)):'')+'</div></span><span class="chev">'+IC.chev+'</span></a>'});
  h+='</div></section></div>';
  return h;
}
function evRow(e){
  var on=!!S.done[e.id],past=isPast(e)&&!on;
  return '<div class="item '+cls(e.mod)+(on?' done':'')+'">'+ck(e.id,e.title)+'<span class="dot"></span><span class="grow"><span class="t">'+esc(e.title)+'</span><span class="s"> · '+esc(SHORT[e.mod]||'')+(e.place?' · '+esc(e.place):'')+'</span></span><span class="r">'+fmtDY(e.d)+(e.time&&e.time.length<=12?'<br>'+esc(e.time):'')+'<br><b class="'+(past?'bad':'')+'">'+rel(e.d)+'</b></span></div>';
}

/* ================= KALENDER ================= */
/* Kalender: Wochenleiste + Tagesansicht (oder Monat) */
function evType(e){var t=e.title||'';
  if(e.exam)return 'Prüfung';if(isDl(e))return 'Frist';
  if(/Präsenzübung|Gruppenübung|Tutorium|Kleingruppe/i.test(t))return 'Präsenzübung';
  if(/Fragestunde/i.test(t))return 'Fragestunde';
  if(/Vortragsübung/i.test(t))return 'Vortragsübung';
  if(/Übung|^U\d|^Ü/i.test(t))return 'Übung';
  if(/Vorlesung|^V\d|Kick-Off|Modul \d|Gastvorlesung|Grundlagen/i.test(t))return 'Vorlesung';
  return 'Termin'}
function planRange(m){ /* Fach mit echtem Semesterplan (>=5 datierte Termine mit Ort): erster und letzter Termin */
  if(m._pr!==undefined)return m._pr;var ds=m.events.filter(function(e){return e.kind==='termin'&&e.date&&e.time&&e.place}).map(function(e){return e.date}).sort();
  return m._pr=ds.length>=5?[ds[0],ds[ds.length-1]]:null}
function dayItems(d){
  var y=ymd(d),evs=events().filter(function(e){return +e.d===+d&&!UI.calOff[e.mod]}),wl=calWeeklyOn(d),out=[];
  evs.forEach(function(e){
    var w=wl.filter(function(x){return x.mod===e.mod&&e.tm!=null&&tmin(x.time)===e.tm})[0];
    var rg=/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/.exec(e.title||''),ty=evType(e);
    var from=e.time&&e.tm!=null?e.time:null,to=null;
    if(w)to=w.time.split('–')[1];else if(rg){from=rg[1];to=rg[2]}else if(from&&/Vorlesung|Übung|Präsenz|Fragestunde/.test(ty))to=mtime(tmin(from)+90);
    out.push({ev:e,mod:e.mod,title:(e.title||'').replace(/\s*\(\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}\)/,''),type:ty,from:from,to:to,place:(w&&w.place&&(w.place.length>(e.place||'').length)?w.place:e.place)||'',note:(e.note||'')+(w&&w.note?(e.note?' · ':'')+w.note:'')});
    if(w)w._used=true});
  wl.forEach(function(w){if(w._used)return;var tt=w.time.split('–'),m=MOD[w.mod],pr=m?planRange(m):null,miss=!!(pr&&y>=pr[0]&&y<=pr[1]&&!/Fragestunde|Präsenzübung|Gruppe/i.test(w.title));
    out.push({mod:w.mod,title:w.title,type:evType(w),from:tt[0],to:tt[1],place:w.place||'',note:w.note||'',weekly:true,miss:miss})});
  out.sort(function(a,b){return (a.from?tmin(a.from):-1)-(b.from?tmin(b.from):-1)});
  out.forEach(function(a){a.clash=out.filter(function(b){return b!==a&&!a.miss&&!b.miss&&a.from&&a.to&&b.from&&b.to&&tmin(a.from)<tmin(b.to)&&tmin(b.from)<tmin(a.to)}).map(function(b){return SHORT[b.mod]+' '+b.type})});
  return out}
function mtime(n){return ('0'+Math.floor(n/60)).slice(-2)+':'+('0'+n%60).slice(-2)}
function dayList(d){
  var it=dayItems(d),real=it.filter(function(a){return !a.miss&&a.to}),h='<section class="sec"><h2>'+(+d===+TODAY?'Heute, ':'')+WDL[d.getDay()]+', '+d.getDate()+'. '+MON[d.getMonth()]+'</h2>';
  if(freiAt(d,'00:00','23:59')&&!it.length)h+='<div class="card empty">Vorlesungsfrei.</div>';
  else if(!it.length)h+='<div class="card empty">Keine Vorlesungen oder Übungen. Freier Tag!</div>';
  else{
    if(real.length)h+='<p class="muted small" style="margin:-4px 0 10px">'+real.length+(real.length===1?' Veranstaltung':' Veranstaltungen')+' · '+real[0].from+' bis '+real.reduce(function(m,a){return tmin(a.to)>tmin(m)?a.to:m},real[0].to)+' Uhr</p>';
    h+='<div class="tl">';var lastEnd=null;
    it.forEach(function(a){
      if(lastEnd!=null&&a.from&&!a.miss){var gap=tmin(a.from)-lastEnd;if(gap>=15)h+='<div class="tl-gap">'+(gap>=60?Math.floor(gap/60)+' h '+(gap%60?gap%60+' min ':''):gap+' min ')+'Pause</div>'}
      if(a.to&&!a.miss)lastEnd=Math.max(lastEnd||0,tmin(a.to));
      var dl=a.ev&&isDl(a.ev);
      h+='<div class="tl-it '+cls(a.mod)+(a.miss?' miss':'')+(a.ev&&S.done[a.ev.id]?' done':'')+'"><div class="tl-t"><b>'+(a.from||'ganztags')+'</b>'+(a.to?'<span>'+a.to+'</span>':'')+'</div><div class="tl-c"><div class="tl-k"><span class="tag">'+esc(a.type)+'</span><span class="tl-m">'+esc(SHORT[a.mod]||'')+'</span></div><div class="t">'+esc(a.title)+'</div>'+(a.place?'<div class="s">'+IC.pin+' '+esc(a.place)+'</div>':'')+(a.note?'<div class="s">'+esc(a.note)+'</div>':'')+(a.miss?'<div class="s warn">Laut Semesterplan heute kein Termin. Bitte im Moodle-Kurs prüfen.</div>':'')+(a.clash.length?'<div class="s warn">Überschneidet sich mit '+esc(a.clash.join(', '))+'</div>':'')+'</div>'+(dl?ck(a.ev.id,a.title):'')+'</div>'});
    h+='</div>'}
  return h+'</section>'}
function vKalender(){
  var view=UI.calView,sel=pd(UI.calSel);
  var h='<div class="wrap top"><div class="eyebrow">Stundenplan und Termine</div><h1>Kalender</h1>';
  h+='<div class="tabs" style="margin-top:12px"><button class="'+(view!=='monat'?'on':'')+'" data-act="calv" data-v="woche">Woche</button><button class="'+(view==='monat'?'on':'')+'" data-act="calv" data-v="monat">Monat</button></div></div><div class="wrap">';
  h+='<div class="filters" style="margin-top:12px">'+MODS.map(function(md){return '<button class="'+cls(md.id)+(UI.calOff[md.id]?' off':'')+'" data-act="calf" data-m="'+md.id+'"><span class="dot"></span>'+esc(SHORT[md.id])+'</button>'}).join('')+'</div>';
  h+='<label class="toggle" style="margin-top:8px"><input type="checkbox" id="calg" data-act="calg"'+(UI.calGroups?' checked':'')+'> Gruppenübungen anzeigen <span class="muted small">(Präsenzübungen)</span></label>';
  if(UI.calGroups)h+=grpPicker();
  if(view==='monat')return h+vMonat()+'</div>';
  var mo=monday(sel);
  h+='<div class="calhead" style="margin-top:12px"><button class="x" data-act="calwk" data-d="-7" aria-label="Vorherige Woche">'+IC.back+'</button><h2>'+fmtRange(mo,addDays(mo,6))+'</h2><button class="x" data-act="calwk" data-d="7" aria-label="Nächste Woche" style="transform:scaleX(-1)">'+IC.back+'</button></div>';
  h+='<div class="wk">';
  for(var i=0;i<7;i++){var d=addDays(mo,i),it=dayItems(d).filter(function(a){return !a.miss});
    h+='<button class="wk-d'+(+d===+TODAY?' today':'')+(ymd(d)===UI.calSel?' sel':'')+(i>4?' we':'')+'" data-act="cald" data-d="'+ymd(d)+'"><span class="wk-w">'+WD[d.getDay()]+'</span><span class="wk-n">'+d.getDate()+'</span><span class="wk-dots">'+it.slice(0,4).map(function(a){return '<i class="'+cls(a.mod)+'"></i>'}).join('')+'</span><span class="wk-c">'+(it.length?it.length:'')+'</span></button>'}
  h+='</div>';
  if(+monday(TODAY)!==+mo||UI.calSel!==ymd(TODAY))h+='<div style="text-align:center;margin-top:8px"><button class="btn ghost sm" data-act="cald" data-d="'+ymd(TODAY)+'">Zurück zu heute</button></div>';
  h+=dayList(sel);
  return h+'</div>'}
function fmtRange(a,b){return a.getDate()+'.'+(a.getMonth()!==b.getMonth()?' '+MON[a.getMonth()].slice(0,3)+'.':'')+' – '+b.getDate()+'. '+MON[b.getMonth()]+' '+b.getFullYear()}
function vMonat(){
  var y=UI.calY,m=UI.calM,first=new Date(y,m,1),start=monday(first),evs=events(),sel=pd(UI.calSel);
  var h='';
  h+='<div class="calhead"><button class="x" data-act="calm" data-d="-1" aria-label="Vorheriger Monat">'+IC.back+'</button><h2>'+MON[m]+' '+y+'</h2><button class="x" data-act="calm" data-d="1" aria-label="Nächster Monat" style="transform:scaleX(-1)">'+IC.back+'</button></div>';
  h+='<div class="cal">'+['Mo','Di','Mi','Do','Fr','Sa','So'].map(function(w){return '<div class="wd">'+w+'</div>'}).join('');
  for(var i=0;i<42;i++){var d=addDays(start,i);if(i>=35&&d.getMonth()!==m)break;
    var de=evs.filter(function(e){return +e.d===+d&&!UI.calOff[e.mod]});
    de=de.concat(calWeeklyOn(d).filter(function(e){return !de.some(function(x){return x.mod===e.mod&&x.kind==='termin'&&x.tm!=null&&x.tm===tmin(e.time)})}));
    h+='<button class="day'+(d.getMonth()!==m?' out':'')+(+d===+TODAY?' today':'')+(ymd(d)===UI.calSel?' sel':'')+'" data-act="cald" data-d="'+ymd(d)+'"><span class="dn">'+d.getDate()+'</span>'+
      de.slice(0,3).map(function(e){return '<span class="ev '+cls(e.mod)+(isDl(e)?' dl':'')+(S.done[e.id]?' done':'')+'"><span class="lbl">'+esc(e.title)+'</span></span>'}).join('')+(de.length>3?'<span class="small muted">+'+(de.length-3)+'</span>':'')+'</button>'}
  h+='</div>';
  h+=dayList(sel);
  return h;
}

/* ================= FRISTEN ================= */
function vFristen(tab){
  var all=events().filter(isDl),list;
  if(tab==='verpasst')list=missed();else if(tab==='erledigt')list=all.filter(function(e){return S.done[e.id]}).reverse();else list=upcoming();
  var noDate=[];if(tab==='bald')MODS.forEach(function(m){m.exams.forEach(function(x){if(!x.date)noDate.push({m:m,x:x})})});
  var h='<div class="wrap top"><div class="eyebrow">Abhaken, wenn erledigt</div><h1>Fristen</h1>';
  h+='<div class="tabs" style="margin-top:12px"><a href="#/fristen/bald" class="'+(tab==='bald'?'on':'')+'">Bevorstehend · '+upcoming().length+'</a><a href="#/fristen/verpasst" class="'+(tab==='verpasst'?'on':'')+'">Verpasst · '+missed().length+'</a><a href="#/fristen/erledigt" class="'+(tab==='erledigt'?'on':'')+'">Erledigt</a></div></div><div class="wrap">';
  if(!list.length)h+='<div class="card empty" style="margin-top:16px">'+(tab==='verpasst'?'Nichts verpasst. Stark!':tab==='erledigt'?'Noch nichts abgehakt.':'Keine offenen Fristen.')+'</div>';
  if(tab==='bald'){var groups=[['Diese Woche',function(e){return e.d<nextMon}],['Nächste Woche',function(e){return e.d>=nextMon&&e.d<addDays(nextMon,7)}],['Später',function(e){return e.d>=addDays(nextMon,7)}]];
    groups.forEach(function(g){var l=list.filter(g[1]);if(!l.length)return;var later=g[0]==='Später';
      h+='<section class="sec"><h2>'+g[0]+' <span class="chip">'+l.length+'</span></h2>'+(later?'<details class="more list"><summary>'+l.length+' Fristen anzeigen</summary>':'<div class="list">')+l.map(evRow).join('')+(later?'</details>':'</div>')+'</section>'});
    if(noDate.length)h+='<section class="sec"><h2>Termin noch offen</h2><div class="list">'+noDate.map(function(o){return '<a class="item '+cls(o.m.id)+'" href="#/fach/'+o.m.id+'/pruefungen/'+o.x.id+'"><span class="dot"></span><span class="grow"><span class="t">'+esc(SHORT[o.m.id])+': '+esc(o.x.name)+'</span><div class="s">'+esc(o.x.note||'')+'</div></span><span class="chev">'+IC.chev+'</span></a>'}).join('')+'</div></section>';
  }else if(list.length)h+='<div class="list" style="margin-top:16px">'+list.map(evRow).join('')+'</div>';
  if(tab==='verpasst'&&list.length)h+='<p class="muted small" style="margin-top:10px">Schon erledigt? Einfach abhaken, dann verschwindet die Frist hier.</p>';
  return h+'</div>';
}

/* ================= FÄCHER ================= */
function vFaecher(){
  var h='<div class="wrap top"><div class="eyebrow">Wintersemester 26/27</div><h1>Fächer</h1></div><div class="wrap"><div class="tiles" style="margin-top:12px">';
  MODS.forEach(function(m){var nx=nextExam(m),er=nx?examReady(nx):null,p=er!=null?pct(er):null;
    h+='<a class="tile '+cls(m.id)+'" href="#/fach/'+m.id+'/woche"><span class="n">'+esc(m.name)+'</span><span class="s">'+(m.lectures.length?m.lectures.length+' Vorlesungen · '+termsOf(m).length+' Begriffe':'noch kein Stoff')+'</span>'+
     (p!=null?'<span class="bar sm on-band"><span style="width:'+p+'%"></span></span>':'')+(nx?'<span class="chip">'+esc(nx.name)+(nx.date?' '+rel(pd(nx.date)):' · Termin offen')+'</span>':'')+'</a>'});
  h+='<a class="tile m-studium" href="#/studium"><span class="n">Mein Studiengang</span><span class="s">Regeln, Fristen, Lernregeln, Einstellungen</span><span class="chip">Studienplan</span></a>';
  h+='<button class="tile m-mathe" data-act="dyn" style="text-align:left"><span class="n">Dynexite-Eingabe</span><span class="s">-1/2, 2*sqrt(3), exp(-2), abs(x) …</span><span class="chip">Testat-Format</span></button>';
  h+='<button class="tile m-mech" data-act="unitsheet" style="text-align:left"><span class="n">Einheiten-Training</span><span class="s">MN → kN → N, m² → mm², N/mm² ↔ MPa</span><span class="chip">3 Stufen</span></button>';
  h+='<a class="tile m-studium" href="#/symbole"><span class="n">Symbole und Zeichen</span><span class="s">Was bedeutet π, Σ, ∀ …?</span><span class="chip">'+symKeys().filter(symKnown).length+' / '+symKeys().length+' gekonnt</span>'+(symNew().length?'<span class="chip newc">'+symNew().length+' neu</span>':'')+'</a>';
  return h+'</div></div>';
}
function modProgress(m){var ts=m.tasks;if(!ts.length)return null;var ok=ts.filter(function(t){return res(t.id)===1}).length;return Math.round(ok/ts.length*100)}

/* ================= FACH ================= */
var FTABS=[['woche','Diese Woche'],['vorlesungen','Vorlesungen'],['karten','Karteikarten'],['formeln','Formeln'],['pruefungen','Prüfungen'],['info','Info']];
function vFach(m,tab,sub){
  var nx=nextExam(m);
  var h='<div class="'+cls(m.id)+'"><div class="band"><div class="wrap"><a class="back" href="#/faecher">'+IC.back+' Fächer</a><h1>'+esc(m.name)+'</h1>'+
   (nx?'<div style="margin-top:8px"><span class="chip">'+esc(nx.name)+': '+(nx.date?fmtDY(pd(nx.date))+' · '+rel(pd(nx.date)):'Termin offen')+'</span></div>':'')+
   '<div class="tabs" style="margin-top:14px">'+FTABS.filter(function(t){return (t[0]!=='formeln'||m.formulas.length)&&(t[0]!=='vorlesungen'||m.lectures.length)&&(t[0]!=='karten'||termsOf(m).length)&&(t[0]!=='pruefungen'||m.exams.length)}).map(function(t){return '<a href="#/fach/'+m.id+'/'+t[0]+'" class="'+(tab===t[0]?'on':'')+'">'+t[1]+'</a>'}).join('')+'</div></div></div><div class="wrap">';
  if(tab==='vorlesungen')h+=sub&&LECT[sub]?vLecture(m,LECT[sub]):vLectures(m);
  else if(tab==='karten')h+=vKarten(m);
  else if(tab==='formeln')h+=vFormeln(m);
  else if(tab==='pruefungen')h+=sub?vExam(m,m.exams.find(function(x){return x.id===sub})):vExams(m);
  else if(tab==='info')h+=vInfo(m);
  else h+=vWoche(m);
  return h+'</div></div>';
}
function lecturesByWeek(m){var a=m.lectures.slice().sort(function(x,y){return (pd(y.date)||0)-(pd(x.date)||0)});
  return {today:a.filter(function(l){var d=pd(l.date);return d&&+d===+TODAY&&!lecHeld(l)}),now:a.filter(function(l){var d=pd(l.date);return d&&d>=thisMon&&d<nextMon&&lecHeld(l)}),last:a.filter(function(l){var d=pd(l.date);return d&&d>=lastMon&&d<thisMon}),old:a.filter(function(l){var d=pd(l.date);return !d||d<lastMon}),future:a.filter(function(l){var d=pd(l.date);return d&&d>=nextMon||(d&&+d===+TODAY&&false)})}}
function lecRow(m,l){var tn=(l.terms||[]).length,d=pd(l.date),lr=lectureReady(l);
  return '<a class="item" href="#/fach/'+m.id+'/vorlesungen/'+l.id+'"><span class="lnum">'+esc(l.nr||'·')+'</span><span class="grow"><span class="t">'+esc(l.title)+'</span><div class="s">'+(d?fmtDY(d)+' · ':'')+tn+' Begriffe</div>'+rbar(lr.v,'Vorbereitet')+'</span><span class="chev">'+IC.chev+'</span></a>'}
function vWoche(m){
  var w=lecturesByWeek(m),h='';
  if(w.today.length)h+='<section class="sec"><h2>Heute</h2><div class="list">'+w.today.map(function(l){return '<a class="item" href="#/fach/'+m.id+'/vorlesungen/'+l.id+'"><span class="lnum">'+esc(l.nr||'·')+'</span><span class="grow"><span class="t">'+esc(l.title)+'</span><div class="s">'+esc(l.time||'')+' · Folien schon da, vorher reinschauen</div></span><span class="chev">'+IC.chev+'</span></a>'}).join('')+'</div></section>';
  var show=w.now.length?w.now:(w.last.length?w.last:w.old.slice(0,1));
  var lbl=w.now.length?'Neu diese Woche':(w.last.length?'Von letzter Woche':'Zuletzt');
  if(!m.lectures.length)h+='<div class="card empty" style="margin-top:16px">Hier gibt es noch keinen Stoff. Sobald die erste Vorlesung war, kommt er hier rein.</div>';
  else h+='<section class="sec"><h2>'+lbl+'</h2><div class="list">'+show.map(function(l){return lecRow(m,l)}).join('')+'</div></section>';
  var rv=reviewItems(m);
  if(rv.length)h+='<section class="sec"><div class="hcard '+cls(m.id)+'"><div class="hn">'+IC.bolt+'</div><div class="grow"><div class="t">Wiederholung</div><div class="s">Nur was du noch nicht kannst · halb letzte Woche, halb davor · ca. 12 min</div></div><button class="btn sm" data-act="review" data-m="'+m.id+'">'+IC.play+'Los</button></div></section>';
  var due=dueCards(m.id);
  if(termsOf(m).length)h+='<section class="sec"><div class="hcard '+cls(m.id)+'"><div class="hn">'+Math.min(due.length,20)+'</div><div class="grow"><div class="t">Karteikarten</div><div class="s">'+(due.length?'Runde von '+Math.min(due.length,20)+' Karten · ca. '+Math.max(3,Math.round(Math.min(due.length,20)*.4))+' min':'alles wiederholt')+'</div></div><button class="btn sm soft" data-act="deck" data-m="'+m.id+'" data-due="1">Lernen</button></div></section>';
  if(m.id==='mathe')h+='<section class="sec"><div class="hcard m-mathe"><div class="hn">'+IC.timer+'</div><div class="grow"><div class="t">Aufwärmen: Kopfrechnen</div><div class="s">20 Fragen ohne Taschenrechner · ca. 5 min'+(S.kr.best?' · Bestzeit '+S.kr.best.r+'/20 in '+fmtSec(S.kr.best.t):'')+'</div></div><button class="btn sm soft" data-act="kr">Start</button></div></section>';
  var nx=nextExam(m);
  if(nx)h+='<section class="sec"><h2>Nächste Prüfung</h2><div class="list">'+examRow(m,nx)+'</div></section>';
  var fr=upcoming().filter(function(e){return e.mod===m.id&&e.d<nextMon&&!(nx&&e.id===nx.id)});
  if(fr.length)h+='<section class="sec"><h2>Fristen diese Woche</h2><div class="list">'+fr.map(evRow).join('')+'</div></section>';
  if(m.todos&&m.todos.length){var open=m.todos.filter(function(t){return !S.todos[t.id]});h+='<section class="sec"><h2>Moodle-To-dos <span class="chip">'+(m.todos.length-open.length)+'/'+m.todos.length+'</span></h2><div class="list">'+open.slice(0,4).map(todoRow).join('')+'</div>'+(open.length>4?'<p class="small"><a href="#/fach/'+m.id+'/info">alle To-dos</a></p>':'')+'</section>'}
  return h;
}
function todoRow(t){var on=!!S.todos[t.id];return '<div class="item'+(on?' done':'')+'"><button class="ck'+(on?' on':'')+'" data-act="todo" data-id="'+esc(t.id)+'" aria-pressed="'+on+'">'+IC.check+'</button><span class="grow"><span class="t">'+esc(t.text)+'</span><div class="s">'+esc(t.group||'')+'</div></span></div>'}
function vLectures(m){
  var w=lecturesByWeek(m),h='';
  if(!m.lectures.length)return '<div class="card empty" style="margin-top:16px">Noch keine Vorlesungen.</div>';
  [['Heute (noch nicht gewesen)',w.today],['Diese Woche',w.now],['Letzte Woche',w.last],['Früher',w.old],['Demnächst',w.future.slice().reverse()]].forEach(function(g,i){if(!g[1].length)return;
    if(g[0]==='Früher'&&(w.now.length||w.last.length))h+='<section class="sec"><details class="more list"><summary>Früher ('+g[1].length+')</summary>'+g[1].map(function(l){return lecRow(m,l)}).join('')+'</details></section>';
    else h+='<section class="sec"><h2>'+g[0]+'</h2><div class="list">'+g[1].map(function(l){return lecRow(m,l)}).join('')+'</div></section>'});
  return h;
}
function vLecture(m,l){
  var d=pd(l.date),lr=lectureReady(l),h='<section class="sec"><a class="back2" href="#/fach/'+m.id+'/vorlesungen">'+IC.back+' Alle Vorlesungen</a><h2 style="font-size:1.5rem;margin-top:8px">'+esc(l.title)+'</h2><p class="muted">'+(d?WDL[d.getDay()]+', '+d.getDate()+'. '+MON[d.getMonth()]+(l.time?' · '+esc(l.time):''):'')+(d&&!lecHeld(l)?' · <b class="okc">kommt noch</b>':'')+'</p>'+
    '<div class="card">'+rbar(lr.v,'Vorbereitet')+'<div class="steps3 mini" style="margin-top:10px">'+
    '<div class="st'+(lr.read?' ok':'')+'"><span class="no">'+(lr.read?IC.check:'1')+'</span><div class="grow"><b>Lesen</b><div class="s muted">Das Wichtigste und die Beispiele</div></div></div>'+
    '<div class="st'+(lr.cards!=null&&lr.cards>=.8?' ok':'')+'"><span class="no">'+(lr.cards!=null&&lr.cards>=.8?IC.check:'2')+'</span><div class="grow"><b>Begriffe</b><div class="s muted">'+(lr.cards==null?'keine':pct(lr.cards)+' % gekonnt')+'</div></div></div>'+
    '<div class="st'+(lr.tasks!=null&&lr.tasks>=.8?' ok':'')+'"><span class="no">'+(lr.tasks!=null&&lr.tasks>=.8?IC.check:'3')+'</span><div class="grow"><b>Üben</b><div class="s muted">'+(lr.tasks==null?'noch keine Aufgaben':pct(lr.tasks)+' % richtig')+'</div></div></div></div></div></section>';
  var tops=topicsOfLecture(l),tk=[];tops.forEach(function(t){tk=tk.concat(tasksOfTopic(t.id))});
  var acts='<div class="btns">'+(tk.length?'<button class="btn" data-act="practice" data-l="'+l.id+'">'+IC.play+' '+Math.min(tk.length,8)+' Aufgaben üben</button>':'')+((l.terms||[]).length>=4?'<button class="btn soft" data-act="quiz" data-l="'+l.id+'">Begriffe-Quiz ('+l.terms.length+')'+(S.quiz[l.id]?' ✓':'')+'</button>':'')+'</div>';
  h+=nachCard(l);
  if(l.story&&l.story.length){
    var vis=l.visuals||[],exs=l.examples||[],exi=0;
    h+='<section class="sec"><h2>Das Wichtigste <span class="chip acc">'+(l.summary||[]).length+' Punkte</span></h2>'+((l.summary||[]).length?'<div class="card"><ul class="summary">'+l.summary.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul></div>':'')+acts+'</section>';
    h+='<section class="sec story"><h2>Schritt für Schritt</h2><p class="small muted">Unterstrichene Begriffe und Formeln antippen. Beispiele Schritt für Schritt aufdecken.</p>'+l.story.map(function(bk){
      if(bk.h!=null)return '<h3 class="sh">'+bk.h+'</h3>';
      if(bk.p!=null)return '<div class="sp">'+bk.p.replace(/<table/g,'<div class="scroll"><table').replace(/<\/table>/g,'</table></div>')+'</div>';
      if(bk.tip!=null)return '<div class="tipbox">'+bk.tip+'</div>';
      if(bk.f!=null){var f=FORM[bk.f];return f?'<div class="flist one">'+fxCard(f)+'</div>':''}
      if(bk.v!=null){var v=vis[bk.v];return v?'<figure class="fig"><div class="ft">'+esc(v.title||'')+'</div>'+v.svg+(v.caption?'<figcaption>'+v.caption+'</figcaption>':'')+'</figure>':''}
      if(bk.ex!=null){var e=typeof bk.ex==='object'?bk.ex:exs[bk.ex];if(!e)return '';var i=exi++;return '<div class="card ex" data-ex="'+i+'"><h3>'+e.title+'</h3><ol class="steps">'+(e.steps||[]).map(function(st,j){return '<li'+(j>0?' hidden':'')+'>'+st+'</li>'}).join('')+'</ol>'+((e.steps||[]).length>1?'<div class="btns"><button class="btn sm soft" data-act="step">Nächster Schritt</button><button class="btn sm ghost" data-act="stepall">Alle zeigen</button></div>':'')+'</div>'}
      return ''}).join('')+'</section>';
  }else if(l.summary&&l.summary.length)h+='<section class="sec"><h2>Das Wichtigste</h2><div class="card"><ul class="summary">'+l.summary.map(function(s){return '<li>'+s+'</li>'}).join('')+'</ul><p class="small muted" style="margin-top:8px">Unterstrichene Begriffe und Formeln antippen.</p></div>'+acts+'</section>';
  if(!(l.story&&l.story.length)&&l.visuals&&l.visuals.length)h+='<section class="sec"><h2>In Bildern</h2><div class="figs">'+l.visuals.map(function(v){return '<figure class="fig"><div class="ft">'+esc(v.title||'')+'</div>'+v.svg+(v.caption?'<figcaption>'+v.caption+'</figcaption>':'')+'</figure>'}).join('')+'</div></section>';
  var fs=(l.formulas||[]).map(function(x){return typeof x==='string'?FORM[x]:null}).filter(Boolean);
  if(fs.length)h+='<section class="sec"><h2>Formeln <span class="chip acc">antippen</span></h2><div class="flist">'+fs.slice(0,6).map(fxCard).join('')+'</div>'+(fs.length>6?'<details class="more list" style="margin-top:10px"><summary>Alle '+fs.length+' Formeln</summary><div class="flist" style="padding:0 12px 12px">'+fs.slice(6).map(fxCard).join('')+'</div></details>':'')+'</section>';
  else if((l.formulas||[]).length)h+='<section class="sec"><h2>Formeln</h2>'+l.formulas.map(function(f){return '<div class="formula">'+f+'</div>'}).join('')+'</section>';
  if(!(l.story&&l.story.length)&&l.examples&&l.examples.length)h+='<section class="sec"><h2>Mit Zahlen</h2><div class="stack">'+l.examples.map(function(e,i){return '<div class="card ex" data-ex="'+i+'"><h3>'+e.title+'</h3><ol class="steps">'+(e.steps||[]).map(function(s,j){return '<li'+(j>0?' hidden':'')+'>'+s+'</li>'}).join('')+'</ol>'+((e.steps||[]).length>1?'<div class="btns"><button class="btn sm soft" data-act="step">Nächster Schritt</button><button class="btn sm ghost" data-act="stepall">Alle zeigen</button></div>':'')+'</div>'}).join('')+'</div></section>';
  if(!S.read[l.id])h+='<section class="sec"><button class="btn block soft" data-act="read" data-l="'+l.id+'">'+IC.check+' Gelesen und verstanden</button></section>';
  if(l.terms&&l.terms.length){var chip=function(t){var c=S.cards[t.key];return '<button class="'+(c&&c.box>=2?'known':'')+'" data-act="term" data-k="'+esc(t.key)+'">'+esc(t.t)+'</button>'};
    h+='<section class="sec"><h2>Begriffe <span class="chip acc">'+l.terms.length+'</span></h2><div class="termchips">'+l.terms.slice(0,12).map(chip).join('')+'</div>'+(l.terms.length>12?'<details class="more list" style="margin-top:10px"><summary>Alle '+l.terms.length+' Begriffe</summary><div class="termchips" style="padding:0 12px 12px">'+l.terms.slice(12).map(chip).join('')+'</div></details>':'')+'</section>'}
  return h;
}
function fxCard(f){return '<button class="fxcard" data-act="fx" data-f="'+esc(f.id)+'"><span class="fxn">'+esc(f.name)+'</span><span class="fxt">'+mx(f.tex)+'</span></button>'}

/* ---------- Formeln ---------- */
function vFormeln(m){
  var fb=(S.ui.fqBest||{})[m.id];var h='<section class="sec"><div class="hcard '+cls(m.id)+'"><div class="hn">?</div><div class="grow"><div class="t">Formel-Quiz</div><div class="s">Symbol, Bedeutung, Einheit, Wirkung · 15 Fragen'+(fb!=null?' · Bestwert '+fb+' %':'')+'</div></div><button class="btn sm" data-act="fquiz" data-m="'+m.id+'">Start</button></div>'+(['mech','bsk','mathe','stat'].indexOf(m.id)>=0?'<button class="btn soft block" style="margin-top:8px" data-act="unitsheet">Einheiten umrechnen üben</button>':'')+(m.id==='mathe'?'<button class="btn soft block" style="margin-top:8px" data-act="dyn">Dynexite-Eingabe üben (Testat-Format)</button>':'')+'</section><section class="sec"><input class="search" id="fsearch" type="search" placeholder="Formel suchen, z. B. pq" aria-label="Formel suchen"><p class="muted small">Tipp auf eine Formel: Du siehst jedes Zeichen einzeln erklärt.</p></section>',seen={};
  var groups=[];m.lectures.forEach(function(l){var fs=m.formulas.filter(function(f){return f.lecture===l.id});if(fs.length)groups.push([l.title,fs]);fs.forEach(function(f){seen[f.id]=1})});
  var rest=m.formulas.filter(function(f){return !seen[f.id]});if(rest.length)groups.push(['Weitere',rest]);
  groups.forEach(function(g,i){h+='<section class="sec fgroup"><details class="more list"'+(i===0?' open':'')+'><summary>'+esc(g[0])+' ('+g[1].length+')</summary><div class="flist" style="padding:0 12px 12px">'+g[1].map(fxCard).join('')+'</div></details></section>'});
  return h;
}
document.addEventListener('input',function(e){if(e.target.id!=='fsearch')return;var q=e.target.value.trim().toLowerCase();
  $$('.fgroup',main).forEach(function(g){var any=false;$$('.fxcard',g).forEach(function(c){var hit=!q||c.textContent.toLowerCase().indexOf(q)>=0;c.hidden=!hit;if(hit)any=true});g.hidden=!any;if(q)g.querySelector('details').open=true})});
function openFormula(id){var f=FORM[id];if(!f)return;
  var h='<div class="'+cls(f.mod)+'"><div class="eyebrow">'+esc(SHORT[f.mod])+' · Formel</div><h2 style="margin-top:4px">'+esc(f.name)+'</h2>'+
   '<div class="fxbig">\\['+texSafe(f.tex)+'\\]</div>'+(f.what?'<p class="lead">'+f.what+'</p>':'')+
   '<h3 style="margin-top:16px">Die Bausteine <span class="chip acc">antippen</span></h3><div class="list parts">'+(f.parts||[]).map(function(p,i){var s=p.ref&&D.symbols[p.ref];
     return '<button class="item" data-act="part" data-f="'+esc(f.id)+'" data-i="'+i+'"><span class="psym">'+mx(p.sym)+'</span><span class="grow"><span class="t">'+esc(p.name)+(p.unit&&p.unit!=='–'?' <span class="chip">'+esc(p.unit)+'</span>':'')+'</span><div class="s">'+(p.d||'')+'</div>'+(p.effect?'<div class="s eff">'+esc(p.effect)+'</div>':'')+'</span>'+(s?'<span class="chev">'+IC.chev+'</span>':'')+'</button>'}).join('')+'</div>'+
   (f.unit?'<p class="small" style="margin-top:10px"><b>Einheit:</b> '+f.unit+'</p>':'')+
   (f.ex?'<div class="card" style="margin-top:12px"><b>Beispiel:</b> '+f.ex+'</div>':'')+'</div>';
  sheet(h,{title:'Formel'});
}
function openPart(fid,i){var f=FORM[fid],p=f&&f.parts[i];if(!p)return;if(p.ref&&D.symbols[p.ref])openSymbol(p.ref,p);
  else sheet('<div class="symcard"><div class="symbig">'+mx(p.sym)+'</div><h2>'+esc(p.name)+'</h2><div class="card ctx"><b>In dieser Formel:</b> '+(p.d||'')+'</div>'+(p.unit?'<div class="card"><b>Einheit:</b> '+esc(p.unit)+'</div>':'')+(p.effect?'<div class="card"><b>Wirkung:</b> '+esc(p.effect)+'</div>':'')+(f.unit?'<div class="card"><b>Einheit der Formel:</b> '+f.unit+'</div>':'')+'</div>',{title:'Baustein'})}
function openSymbol(id,ctx){var s=D.symbols[id];if(!s)return;
  var h='<div class="symcard"><div class="symbig">'+mx(s.tex)+'</div><h2>'+esc(s.name)+'</h2><p class="muted">'+(s.say?'gesprochen: „'+esc(s.say)+'“ · ':'')+esc(s.group)+'</p>'+(s.mod&&!ctx?(s.unit&&s.unit!=='–'?'<div class="card"><b>Einheit:</b> '+esc(s.unit)+'</div>':'')+(s.effect?'<div class="card"><b>Wirkung:</b> '+esc(s.effect)+'</div>':''):'')+
   (ctx?'<div class="card ctx"><b>In dieser Formel:</b> '+esc(ctx.name)+(ctx.d?'. '+ctx.d:'')+(ctx.unit&&ctx.unit!=='–'?'<br><b>Einheit:</b> '+esc(ctx.unit):'')+(ctx.effect?'<br><b>Wirkung:</b> '+esc(ctx.effect):'')+'</div>':'')+
   '<div class="card"><b>Allgemein:</b> '+texSafe(s.d)+'</div>'+(s.val?'<div class="card"><b>Wert:</b> <span class="kpi">'+texSafe(s.val)+'</span></div>':'')+(s.ex?'<div class="card"><b>Beispiel:</b> '+texSafe(s.ex)+'</div>':'')+'</div>';
  sheet(h,{title:'Symbol'});
}
/* ---------- Symbole: Abfrage ---------- */
function symKeys(){return Object.keys(D.symbols||{})}
function symKnown(k){return S.sym[k]===true}
function symNew(){return symKeys().filter(function(k){return D.symbols[k].added&&!symKnown(k)})}
function symChunks(){var by={},order=[];symKeys().forEach(function(k){var g=D.symbols[k].group;if(!by[g]){by[g]=[];order.push(g)}by[g].push(k)});var out=[];
  order.forEach(function(g){var a=by[g],n=Math.ceil(a.length/12),sz=Math.ceil(a.length/n);for(var i=0;i<n;i++)out.push({name:g+(n>1?' '+(i+1):''),keys:a.slice(i*sz,(i+1)*sz)})});return out}

/* Lückenformel: Symbol in einer Formel durch ein Kästchen ersetzen */
var GAPBOX='\\boxed{\\,?\\,}';
function gapTex(tex,sym){var out='',i=0,hit=0,L=sym.length;if(!sym)return null;
  while(i<tex.length){var j=tex.indexOf(sym,i);if(j<0){out+=tex.slice(i);break}
    var pv=j?tex[j-1]:' ',nx=tex[j+L]||' ',a0=sym[0],z=sym[L-1];
    var bad=pv==='\\'||(/[A-Za-z]/.test(a0)&&/[A-Za-z]/.test(pv))||(/[A-Za-z]/.test(z)&&/[A-Za-z]/.test(nx))||((nx==='_'||nx==='^'||nx==="'")&&!/[_^']/.test(sym))||(/^\\[A-Za-z]+$/.test(sym)&&/[A-Za-z]/.test(nx));
    if(bad){out+=tex.slice(i,j+1);i=j+1;continue}
    out+=tex.slice(i,j)+GAPBOX;i=j+L;hit++}
  return hit?out:null}
function symProbe(s){var t=s.tex;if(s.mod)return t;var m=t.match(/^\\mathbb\s?[A-Z]/);if(m)return m[0];m=t.match(/^\\(?!frac|sqrt|vec|bar|tilde|lfloor|underset|text)[A-Za-z]+/);return m?m[0]:null}
var SYMGAP=null;
function symGaps(k){if(!SYMGAP){SYMGAP={};var fs=Object.keys(FORM).map(function(id){return FORM[id]});
  symKeys().forEach(function(key){var s=D.symbols[key],pr=symProbe(s),out=[];if(!pr)return;
    fs.forEach(function(f){if(out.length>=4||(s.mod&&f.mod!==s.mod))return;var g=gapTex(f.tex,pr);if(g&&g.indexOf(pr)<0)out.push({f:f,tex:g})});if(out.length)SYMGAP[key]=out})}
  return SYMGAP[k]||[]}
function symQ(k,kind){var s=D.symbols[k],all=symKeys(),big='<div class="symq">'+mx(s.tex)+'</div>';
  function dis(f){var same=shuffle(all.filter(function(x){return x!==k&&(D.symbols[x].group===s.group||(s.mod&&D.symbols[x].mod===s.mod))})),other=shuffle(all.filter(function(x){return x!==k&&D.symbols[x].group!==s.group}));var seen={},out=[];seen[f(k)]=1;
    same.concat(other).forEach(function(x){var v=f(x);if(out.length<3&&!seen[v]){seen[v]=1;out.push(x)}});return out}
  var sol='<b>'+mx(s.tex)+' = '+esc(s.name)+'</b> '+(s.say?'<span class="muted">(gesprochen: „'+esc(s.say)+'“)</span>':'')+(s.unit&&s.unit!=='–'?' · Einheit: <b>'+esc(s.unit)+'</b>':'')+'<br>'+texSafe(s.d)+(s.ex?'<div class="small muted" style="margin-top:6px">Beispiel: '+texSafe(s.ex)+'</div>':'');
  if(kind==='gap'){var gs=symGaps(k);if(gs.length){var g=gs[Math.floor(Math.random()*gs.length)],w2=dis(function(x){return D.symbols[x].tex}),o2=shuffle([k].concat(w2));
    return {id:'sy:'+k+':g',sym:k,type:'mc',q:'Welches Zeichen gehört in die Lücke?<div class="small muted" style="margin-top:4px">'+esc(g.f.name)+' · '+esc(SHORT[g.f.mod]||'')+'</div><div class="fxbig">\\['+texSafe(g.tex)+'\\]</div>',options:o2.map(function(x){return '<span class="symopt">'+mx(D.symbols[x].tex)+'</span>'}),correct:o2.indexOf(k),a:sol+'<div class="fxbig">\\['+texSafe(g.f.tex)+'\\]</div>'}}kind='name'}
  if(kind==='typed')return {id:'sy:'+k+':t',sym:k,type:'typed',q:'Wie heißt dieses Zeichen?'+big,check:function(x){return typedOk(x,{t:s.name})||(!!s.say&&typedOk(x,{t:s.say}))},expect:s.name,a:sol};
  var w=dis(kind==='sym'?function(x){return D.symbols[x].tex}:kind==='mean'?function(x){return D.symbols[x].d}:function(x){return D.symbols[x].name}),opts=shuffle([k].concat(w)),q,ops;
  if(kind==='sym'){q='Welches Zeichen ist <b>'+esc(s.name)+'</b>?';ops=opts.map(function(x){return '<span class="symopt">'+mx(D.symbols[x].tex)+'</span>'})}
  else if(kind==='mean'){q='Wofür steht dieses Zeichen?'+big;ops=opts.map(function(x){var t=D.symbols[x];return maskTerm(texSafe(t.d.split(/(?<=\.)\s/)[0]),{t:t.name})})}
  else{q='Was ist das für ein Zeichen?'+big;ops=opts.map(function(x){return esc(D.symbols[x].name)})}
  return {id:'sy:'+k+':'+kind,sym:k,type:'mc',q:q,options:ops,correct:opts.indexOf(k),a:sol}}
function symQuestions(keys){var kinds=['name','sym','mean'];var list=shuffle(keys),nT=Math.round(list.length*.3),tI={};shuffle(list.map(function(_,i){return i})).slice(0,nT).forEach(function(i){tI[i]=1});
  return list.map(function(k,i){if(!tI[i]&&symGaps(k).length&&Math.random()<.45)return symQ(k,'gap');return symQ(k,tI[i]?'typed':kinds[Math.floor(Math.random()*3)])})}
function startSymQuiz(mode,arg){var keys,title;
  if(mode==='group'){var c=symChunks()[+arg];keys=c.keys;title=c.name}
  else if(mode==='new'){keys=symNew().slice(0,15);title='Neue Symbole'}
  else if(mode==='open'){keys=shuffle(symKeys().filter(function(k){return !symKnown(k)})).slice(0,15);title='Offene Symbole'}
  else{keys=symKeys();title='Gesamttest Symbole'}
  if(!keys.length){toast('Alles gekonnt!');return}
  var again={};
  runItems(symQuestions(keys),{title:title,mode:'quiz',requeue:function(it){if(again[it.sym]>=2)return null;again[it.sym]=(again[it.sym]||0)+1;return symQ(it.sym,['gap','sym','typed'][again[it.sym]%3])},onEnd:function(r){
    var first={};r.forEach(function(x){if(x.item.sym&&first[x.item.sym]==null)first[x.item.sym]=x.r===1});
    var ks=Object.keys(first),ok=ks.filter(function(k){return first[k]}).length,pct=Math.round(ok/ks.length*100);
    ks.forEach(function(k){S.sym[k]=first[k]});if(mode==='all'){S.ui.symAll=Math.max(S.ui.symAll||0,pct)}save();
    if(pct===100){confetti();activity(40)}
    var wrong=ks.filter(function(k){return !first[k]});
    return '<div class="center"><div class="big">'+pct+' %</div><p>'+ok+' von '+ks.length+' Zeichen beim ersten Versuch richtig. '+(pct===100?'Alle gekonnt!':'Ziel: 100 %. Die falschen wurden direkt wiederholt.')+'</p>'+
     (wrong.length?'<div class="symgrid" style="margin:12px 0">'+wrong.map(function(k){var s=D.symbols[k];return '<div class="symtile"><span class="sg">'+mx(s.tex)+'</span><span class="sn">'+esc(s.name)+'</span></div>'}).join('')+'</div>':'')+
     '<div class="btns" style="justify-content:center">'+(wrong.length?'<button class="btn" data-act="symq" data-mode="open">Offene nochmal</button>':'')+'<button class="btn'+(wrong.length?' ghost':'')+'" data-act="close">Fertig</button></div></div>'}});
}
function vSymbole(){
  var keys=symKeys(),known=keys.filter(symKnown).length,nw=symNew(),chunks=symChunks(),best=S.ui.symAll;
  var h='<div class="m-studium"><div class="band"><div class="wrap"><a class="back" href="#/faecher">'+IC.back+' Fächer</a><h1>Symbole und Zeichen</h1><p style="opacity:.9">Antippen für Bedeutung, Wert und Beispiel. Ziel: alle '+keys.length+' können.</p></div></div><div class="wrap">';
  if(nw.length)h+='<section class="sec"><div class="newsym"><div class="grow"><b>'+nw.length+' neue '+(nw.length===1?'Zeichen':'Symbole und Zeichen')+'</b><div class="small">aus deinen Unterlagen dazugekommen · 15 pro Runde</div></div><button class="btn sm" data-act="symq" data-mode="new">Neue lernen</button></div></section>';
  h+='<section class="sec"><div class="grid2"><div class="card"><div class="muted small">Gekonnt</div><div class="kpi">'+known+' / '+keys.length+'</div><div class="bar ok" style="margin-top:8px"><span style="width:'+Math.round(known/keys.length*100)+'%"></span></div>'+
   '<button class="btn sm block soft" style="margin-top:8px" data-act="symq" data-mode="open"'+(known===keys.length?' disabled':'')+'>Offene üben</button></div>'+
   '<div class="card"><div class="muted small">Gesamttest</div><div class="kpi">'+(best!=null?best+' %':'–')+'</div><div class="small muted">alle '+keys.length+', Ziel 100 %</div><button class="btn sm block" style="margin-top:8px" data-act="symq" data-mode="all">Start</button></div></div></section>';
  h+='<section class="sec"><details class="more list"><summary>Abfrage in kleinen Gruppen ('+chunks.length+')</summary><div class="list">'+chunks.map(function(c,i){var kn=c.keys.filter(symKnown).length,dn=kn===c.keys.length;
    return '<div class="item'+(dn?' done':'')+'"><span class="grow"><span class="t">'+esc(c.name)+'</span><div class="s">'+kn+' / '+c.keys.length+' gekonnt'+(c.keys.some(function(k){return nw.indexOf(k)>=0})?' · <b class="acc-t">neu dabei</b>':'')+'</div></span><button class="btn sm'+(dn?' ghost':'')+'" data-act="symq" data-mode="group" data-arg="'+i+'">Quiz</button></div>'}).join('')+'</div></details></section>';
  var groups={};keys.forEach(function(k){var s=D.symbols[k];(groups[s.group]=groups[s.group]||[]).push(k)});
  Object.keys(groups).forEach(function(g){var sub=/^Formelzeichen|^Einheiten/.test(g),gk=groups[g].filter(symKnown).length,gn=groups[g].filter(function(k){return nw.indexOf(k)>=0}).length;
    h+='<section class="sec">'+(sub?'<details class="more list symdet"><summary>'+esc(g)+' <span class="chip">'+gk+'/'+groups[g].length+'</span>'+(gn?' <span class="chip newc">'+gn+' neu</span>':'')+'</summary>':'<h2>'+esc(g)+' <span class="chip">'+gk+'/'+groups[g].length+'</span></h2>')+'<div class="symgrid'+(sub?' pad':'')+'">'+groups[g].map(function(k){var s=D.symbols[k],isN=nw.indexOf(k)>=0;
    return '<button class="symtile'+(symKnown(k)?' known':'')+(isN?' isnew':'')+'" data-act="sym" data-s="'+k+'">'+(isN?'<span class="nb">neu</span>':symKnown(k)?'<span class="kb">'+IC.check+'</span>':'')+'<span class="sg">'+mx(s.tex)+'</span><span class="sn">'+esc(s.name)+'</span></button>'}).join('')+'</div>'+(sub?'</details>':'')+'</section>'});
  return h+'</div></div>';
}

/* ---------- Karteikarten ---------- */
var BOXDAYS=[0,1,3,7,14,30];
function dueCards(mid){var out=[];MODS.forEach(function(m){if(mid&&m.id!==mid)return;termsOf(m).forEach(function(t){var c=S.cards[t.key];if(!c||!c.due||pd(c.due)<=TODAY)out.push(t)})});return out}
function vKarten(m){
  var all=termsOf(m);if(!all.length)return '<div class="card empty" style="margin-top:16px">Noch keine Begriffe.</div>';
  var due=dueCards(m.id),known=all.filter(function(t){var c=S.cards[t.key];return c&&c.box>=2}).length;
  var full=S.quiz[m.id+':full'];
  var h='<section class="sec"><div class="grid2"><div class="card"><div class="muted small">Gelernt</div><div class="kpi">'+known+' / '+all.length+'</div><div class="bar ok" style="margin-top:8px"><span style="width:'+Math.round(known/all.length*100)+'%"></span></div></div>'+
   '<div class="card"><div class="muted small">Nächste Runde</div><div class="kpi">'+Math.min(due.length,20)+'</div><button class="btn sm block" style="margin-top:8px" data-act="deck" data-m="'+m.id+'" data-due="1"'+(due.length?'':' disabled')+'>Fällige lernen</button></div></div></section>';
  h+='<section class="sec"><div class="hcard '+cls(m.id)+'"><div class="hn">'+(full&&full>=90?IC.check:'%')+'</div><div class="grow"><div class="t">Gesamttest</div><div class="s">30 zufällige Begriffe · bestanden ab 90 %'+(full!=null?' · Bestwert '+full+' %':'')+'</div></div><button class="btn sm" data-act="quiz" data-m="'+m.id+'">Start</button></div></section>';
  h+='<section class="sec"><h2>Quiz in kleinen Gruppen</h2><p class="muted small">Max. 10 Begriffe pro Gruppe. Gekonnt bei 100 %.</p>';
  m.lectures.forEach(function(l){var gs=termGroups(l);if(!gs.length)return;h+='<h3 style="margin:14px 0 6px">'+esc(l.title)+'</h3><div class="list">';
    gs.forEach(function(g,gi){var ok=S.quiz[l.id+':'+gi];h+='<div class="item'+(ok?' done':'')+'"><span class="grow"><span class="t">'+esc(g.name)+'</span><div class="s">'+g.terms.length+' Begriffe'+(ok?' · <b class="okc">gekonnt</b>':'')+'</div></span><button class="btn sm soft" data-act="deckkeys" data-keys="'+esc(g.terms.map(function(t){return t.key}).join('|'))+'">Karten</button>'+(g.terms.length>=4?'<button class="btn sm'+(ok?' ghost':'')+'" data-act="quiz" data-l="'+l.id+'" data-g="'+gi+'">Quiz</button>':'')+'</div>'});
    h+='</div>'});
  h+='</section><section class="sec"><details class="more list"><summary>Alle Begriffe als Liste ('+all.length+')</summary><div class="voklist">'+all.map(function(t){return '<div class="v"><dt>'+t.t+(t.sym?' <span class="sym">'+mx(t.sym)+'</span>':'')+'</dt><dd>'+t.d+'</dd></div>'}).join('')+'</div></details></section>';
  return h;
}
function openTerm(key,deck){var t=TERM[key];if(!t)return;
  var html='<div class="'+cls(t.mod)+'"><div class="flip" data-act="flip"><div class="inner"><div class="face front"><div class="w">'+t.t+'</div>'+(t.sym?'<div class="sy">'+mx(t.sym)+'</div>':'')+'<div class="hint">Tippen zum Umdrehen</div></div>'+
    '<div class="face back"><div class="w2">'+t.t+(t.sym?' <span class="sy">'+mx(t.sym)+'</span>':'')+'</div><div>'+t.d+'</div>'+(t.ex?'<div class="exbox"><b>Beispiel:</b> '+t.ex+'</div>':'')+(t.viz?'<div class="viz">'+t.viz+'</div>':'')+'</div></div></div></div>';
  if(deck)return html;
  sheet(html+'<div class="btns"><button class="btn soft" data-act="cardgrade" data-k="'+esc(key)+'" data-g="1">Wusste ich</button><button class="btn ghost" data-act="cardgrade" data-k="'+esc(key)+'" data-g="0">Nochmal üben</button></div>',{title:'Karteikarte'});
}
function gradeCard(key,ok){var c=S.cards[key]||{box:0};c.box=ok?Math.min(5,(c.box||0)+1):0;c.due=ymd(addDays(TODAY,ok?BOXDAYS[c.box]:0));S.cards[key]=c;activity(ok?2:1)}
function runDeck(list,title,onEnd){
  list=list.slice(0,20);if(!list.length){toast('Keine Karten fällig.');return}
  var i=0,ok=0;
  function draw(){if(i>=list.length){if(onEnd)onEnd(ok,list.length);sheet('<div class="center"><div class="big">'+ok+' / '+list.length+'</div><p>Karten gewusst.</p><div class="btns" style="justify-content:center"><button class="btn" data-act="close">Fertig</button></div></div>',{title:title,replace:true});if(ok===list.length)confetti();rerender();return}
    var t=list[i];sheet('<div class="prog"><span class="small muted">Karte '+(i+1)+' von '+list.length+'</span><div class="bar"><span style="width:'+Math.round(i/list.length*100)+'%"></span></div></div>'+openTerm(t.key,true)+'<div class="grade two"><button class="g0" id="dk0">Nochmal</button><button class="g2" id="dk1">Wusste ich</button></div>',{title:title,replace:true});
    $('#dk0').onclick=function(){gradeCard(t.key,false);i++;draw()};$('#dk1').onclick=function(){gradeCard(t.key,true);ok++;i++;draw()};}
  draw();
}

/* ---------- Quiz für Begriffe ---------- */
function stripHtml(s){var d=document.createElement('div');d.innerHTML=s;return d.textContent||''}
/* ---------- Begriffe-Quiz (schwerer: ähnliche Ablenker, Begriff verdeckt, Eintippen, Beispiele) ---------- */
function plainT(s){return stripHtml(String(s||'').replace(/\\\(|\\\)|\\\[|\\\]/g,'')).trim()}
function normT(s){return plainT(s).toLowerCase().replace(/ß/g,'ss').replace(/[‐-―\-_.,;:!?"'„“()\[\]{}\/\\]/g,' ').replace(/\s+/g,' ').trim()}
function lev(a,b){if(a===b)return 0;var m=a.length,n=b.length,d=[];for(var i=0;i<=m;i++){d[i]=[i]}for(var j=1;j<=n;j++)d[0][j]=j;
  for(i=1;i<=m;i++)for(j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
function termAnswers(t){var full=plainT(t.t),out=[full];full.split(/,|\/|\(|\)|\bbzw\.?|\boder\b|\bund\b|;/).forEach(function(p){p=p.trim();if(p.length>=2)out.push(p)});
  return uniq(out.map(normT).filter(function(x){return x}))}
function typedOk(input,t){var x=normT(input);if(!x)return false;return termAnswers(t).some(function(a){var tol=a.length<=4?0:a.length<=9?1:2;return lev(x,a)<=tol})}
function maskTerm(html,t){var words=plainT(t.t).split(/[\s,\/()\-]+/).filter(function(w){return w.length>=4});var out=html;
  words.forEach(function(w){var stem=w.length>6?w.slice(0,Math.max(4,w.length-3)):w;var re=new RegExp('(^|[^\\wäöüÄÖÜß\\\\])('+stem.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'[\\wäöüÄÖÜß]*)','gi');
    out=out.replace(/(<[^>]*>|\\\(.*?\\\))|([^<\\]+)/g,function(m0,tag,txt){return tag?tag:txt.replace(re,function(_,pre){return pre+'<span class="mask">…</span>'})})});return out}
function similarTerms(t,pool,n){var me=normT(t.t),dd=stripHtml(t.d);
  var cand=pool.filter(function(o){return o.key!==t.key&&stripHtml(o.d)!==dd&&normT(o.t)!==me});
  function score(o){var s=Math.random();if(o.topic&&o.topic===t.topic)s+=3;if(o.lecture===t.lecture)s+=1.5;
    var la=stripHtml(o.d).length,lb=dd.length;s+=1-Math.min(1,Math.abs(la-lb)/Math.max(la,lb,1));if(!!o.sym===!!t.sym)s+=.5;return s}
  return cand.map(function(o){return {o:o,s:score(o)}}).sort(function(a,b){return b.s-a.s}).slice(0,n).map(function(x){return x.o})}
function termQuestions(terms,pool){
  var list=shuffle(terms),nType=Math.round(list.length*.3),typeIdx={};shuffle(list.map(function(_,i){return i}).filter(function(i){return i>0})).slice(0,nType).forEach(function(i){typeIdx[i]=1});
  return list.map(function(t,idx){
    var sol='<b>'+t.t+'</b>'+(t.sym?' '+mx(t.sym):'')+': '+t.d+(t.ex?'<br><span class="muted">Beispiel: '+t.ex+'</span>':'');
    var kinds=['def','term'];if(t.ex&&plainT(t.ex).length>3)kinds.push('ex');
    var kind=typeIdx[idx]?'type':kinds[Math.floor(Math.random()*kinds.length)];
    if(kind==='type')return {id:'q:'+t.key,mod:t.mod,type:'typed',q:'Wie heißt der Fachbegriff?<div class="qdef">'+maskTerm(t.d,t)+'</div>'+(t.ex?'<div class="small muted" style="margin-top:6px">Beispiel: '+maskTerm(t.ex,t)+'</div>':''),termObj:t,a:sol,term:t.key};
    var others=similarTerms(t,pool,4),opts=shuffle([t].concat(others)),q,ops;
    if(kind==='term'){q='Was bedeutet <b>'+t.t+'</b>'+(t.sym?' '+mx(t.sym):'')+'?';ops=opts.map(function(o){return maskTerm(o.d,o)})}
    else if(kind==='ex'){q='Zu welchem Begriff gehört dieses Beispiel?<div class="qdef">'+maskTerm(t.ex,t)+'</div>';ops=opts.map(function(o){return o.t})}
    else{q='Welcher Begriff passt?<div class="qdef">'+maskTerm(t.d,t)+'</div>';ops=opts.map(function(o){return o.t})}
    return {id:'q:'+t.key,mod:t.mod,type:'mc',q:q,options:ops,correct:opts.indexOf(t),a:sol,term:t.key}});
}
function termGroups(l){var by={},order=[];(l.terms||[]).forEach(function(t){var k=t.topic||'x';if(!by[k]){by[k]=[];order.push(k)}by[k].push(t)});var groups=[];
  order.forEach(function(k){var arr=by[k],name=TOPIC[k]?TOPIC[k].name:l.title;for(var i=0;i<arr.length;i+=10){var part=arr.slice(i,i+10);if(part.length<4&&groups.length){groups[groups.length-1].terms=groups[groups.length-1].terms.concat(part)}else groups.push({name:name+(arr.length>10?' '+(Math.floor(i/10)+1):''),terms:part})}});
  return groups}
function startQuiz(opts){
  var m=opts.m?MOD[opts.m]:MOD[LECT[opts.l].mod],pool=termsOf(m),terms,key,need,isGroup=opts.l&&opts.g!=null&&opts.g!=='';
  if(isGroup){var g=termGroups(LECT[opts.l])[+opts.g];terms=g?g.terms:LECT[opts.l].terms;key=opts.l+':'+(+opts.g);need=100}
  else if(opts.l){terms=LECT[opts.l].terms.slice();key=opts.l+':all';need=90}
  else{terms=shuffle(pool).slice(0,30);key=m.id+':full';need=90}
  runItems(termQuestions(terms,pool),{title:isGroup?'Begriffe-Quiz':opts.l?'Quiz: '+LECT[opts.l].title:'Gesamttest '+SHORT[m.id],mode:'quiz',onEnd:function(r){var okN=r.filter(function(x){return x.r===1}).length,pct=Math.round(okN/r.length*100);
    var best=S.quiz[key];
    if(isGroup){if(pct===100){S.quiz[key]=true;if(termGroups(LECT[opts.l]).every(function(_,gi){return S.quiz[opts.l+':'+gi]}))S.quiz[opts.l]=true}}
    else if(opts.l){S.quiz[key]=Math.max(best||0,pct);if(pct>=need)S.quiz[opts.l]=true}
    else S.quiz[key]=Math.max(best||0,pct);save();
    r.forEach(function(x){if(x.item.term)gradeCard(x.item.term,x.r===1)});
    if(pct>=need){confetti();activity(50)}
    var wrong=r.filter(function(x){return x.r<1}).map(function(x){return TERM[x.item.term]}).filter(Boolean);
    window.__quizRedo=wrong;
    return '<div class="center"><div class="big">'+pct+' %</div><p>'+okN+' von '+r.length+' richtig. '+(pct>=need?(isGroup?'Gruppe gekonnt!':'Bestanden!'):'Ziel: '+need+' %.')+'</p>'+
      (wrong.length?'<div class="card" style="text-align:left;margin:12px 0"><b>Nochmal anschauen ('+wrong.length+')</b><ul class="summary">'+wrong.slice(0,12).map(function(t){return '<li><b>'+t.t+'</b>: '+t.d+'</li>'}).join('')+'</ul></div>':'')+
      '<div class="btns" style="justify-content:center">'+(wrong.length?'<button class="btn" data-act="quizredo" data-m="'+m.id+'">Nur die Fehler nochmal</button>':'')+'<button class="btn'+(wrong.length?' ghost':'')+'" data-act="close">Fertig</button></div></div>'}});
}

/* ---------- Aufgaben-Runner ---------- */
function taskItem(t){var g=t.gen&&window.TaskGen?TaskGen.instance(t):null,src=g||t;return {id:t.id,mod:t.mod,type:t.type==='mc'&&t.options?'mc':'open',q:src.q,options:src.options||t.options,correct:t.correct,a:src.a,short:src.short,level:t.level,topic:t.topic,src:t.src,task:t.id,fresh:!!g,raw:t}}
function shuffleOpts(it){if(it.type!=='mc'||!it.options||it.noShuffle)return it;var idx=shuffle(it.options.map(function(_,i){return i}));var c={};for(var k in it)c[k]=it[k];c.options=idx.map(function(i){return it.options[i]});c.correct=idx.indexOf(it.correct);return c}
function runItems(items,o){
  if(!items.length){toast('Hier gibt es noch keine Aufgaben.');return}
  items=(o.keepOrder?items.slice():shuffle(items)).map(shuffleOpts);
  var i=0,results=[],answered=false,cur=null;
  function header(){return '<div class="prog"><span class="small muted">'+esc(o.title)+' · '+Math.min(i+1,items.length)+' / '+items.length+'</span><div class="bar"><span style="width:'+Math.round(i/items.length*100)+'%"></span></div></div>'}
  function draw(){
    if(i>=items.length){var extra=o.onEnd?o.onEnd(results):'';var okN=results.filter(function(x){return x.r===1}).length;
      sheet(header().replace(/width:\d+%/,'width:100%')+(extra||'<div class="center"><div class="big">'+okN+' / '+items.length+'</div><p>richtig</p></div>')+
       (extra?'':'<div class="btns" style="justify-content:center"><button class="btn" data-act="close">Fertig</button></div>')+(results.some(function(x){return x.r<1&&x.item.task})&&o.mode!=='diag'?'<p class="center small"><a href="#" id="redo">Fehler nochmal üben</a></p>':''),{title:o.title,replace:true});
      var rd=$('#redo');if(rd)rd.onclick=function(e){e.preventDefault();runItems(results.filter(function(x){return x.r<1&&x.item.task}).map(function(x){return x.item.raw?taskItem(x.item.raw):x.item}),{title:'Fehler nochmal',mode:'practice'})};
      rerender();return}
    cur=items[i];answered=false;
    var t=cur,meta='<div class="qmeta">'+(t.topic&&TOPIC[t.topic]?'<span class="chip acc">'+esc(TOPIC[t.topic].name)+'</span>':'')+(t.level?'<span class="chip '+(t.level===1?'ok':t.level===2?'warn':'bad')+'">'+['','leicht','mittel','Prüfung'][t.level]+'</span>':'')+(t.fresh?'<span class="chip acc">neue Zahlen</span>':'')+(t.src&&t.src!=='eigene'&&!t.fresh?'<span class="chip">'+esc(t.src)+'</span>':'')+'</div>';
    var body='<div class="qcard '+cls(t.mod)+'">'+meta+'<div class="q">'+wrapTables(t.q)+'</div>';
    if(t.type==='mc')body+='<div class="opts">'+t.options.map(function(op,k){return '<button class="opt" data-k="'+k+'"><span class="k">'+'ABCDEF'[k]+'</span><span>'+op+'</span></button>'}).join('')+'</div>';
    else if(t.type==='typed')body+='<form id="tyf" class="tyf" autocomplete="off"><input id="tyi" class="tyi" type="text"'+(t.inputmode?' inputmode="'+t.inputmode+'"':'')+' placeholder="'+(t.check?'Zahl eintippen':'Begriff eintippen')+'" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="btn" type="submit">Prüfen</button></form><div class="btns"><button class="btn ghost sm" id="skip">Weiß ich nicht</button></div>';
    else body+='<p class="muted small" style="margin-top:12px">Erst auf Papier rechnen. Dann Lösung aufdecken und ehrlich bewerten.</p><div class="btns"><button class="btn" id="show">Lösung zeigen</button><button class="btn ghost" id="skip">Weiß ich nicht</button></div>';
    body+='<div id="after"></div></div>';
    sheet(header()+body,{title:o.title,replace:true});
    if(t.type==='mc')$$('.opt',layer).forEach(function(b){b.onclick=function(){if(answered)return;answered=true;var k=+b.getAttribute('data-k'),ok=k===t.correct;
      $$('.opt',layer).forEach(function(x){x.disabled=true;if(+x.getAttribute('data-k')===t.correct)x.classList.add('right')});if(!ok)b.classList.add('wrong');
      record(ok?1:0);showAfter(ok?'<div class="fb ok">Richtig! +10 XP</div>':'<div class="fb bad">Nicht ganz.</div>',true)}});
    else if(t.type==='typed'){var inp=$('#tyi');setTimeout(function(){try{inp.focus()}catch(e){}},50);
      $('#tyf').onsubmit=function(e){e.preventDefault();if(answered)return;if(!inp.value.trim()){inp.focus();return}answered=true;var ok=t.check?t.check(inp.value):typedOk(inp.value,t.termObj);inp.disabled=true;inp.classList.add(ok?'right':'wrong');$('#tyf button').remove();var sk=$('#skip');if(sk)sk.parentNode.remove();
        record(ok?1:0);showAfter(ok?'<div class="fb ok">Richtig! +10 XP</div>':((t.hint&&t.hint(inp.value))||'')+'<div class="fb bad">Nicht ganz. Gesucht war: <b>'+(t.expect||t.termObj.t)+'</b></div>',true)};
      $('#skip').onclick=function(){if(answered)return;answered=true;var f=$('#tyf');if(f)f.remove();this.parentNode.remove();record(0);showAfter('<div class="fb bad">Kein Problem. Gesucht war: <b>'+(t.expect||t.termObj.t)+'</b></div>',true)}}
    else{$('#show').onclick=function(){showAfter('',false)};$('#skip').onclick=function(){record(0);showAfter('<div class="fb bad">Kein Problem, so lernst du es.</div>',true)}}
    ts(layer);
  }
  function showAfter(fb,doneGrading){var a=$('#after');$$('#show,#skip',layer).forEach(function(b){b.remove()});
    a.innerHTML=fb+'<div class="sol"><b>Lösung</b><div>'+wrapTables(cur.a||'')+'</div>'+(cur.short?'<div class="res">Ergebnis: '+cur.short+'</div>':'')+'</div>'+
     (doneGrading?'<div class="btns"><button class="btn block" id="nx">Weiter</button></div>':'<p class="small muted" style="margin-top:12px">Wie lief es?</p><div class="grade"><button class="g0" data-g="0">Falsch</button><button class="g1" data-g="0.5">Teilweise</button><button class="g2" data-g="1">Richtig</button></div>');
    if(doneGrading)$('#nx').onclick=next;else $$('.grade button',layer).forEach(function(b){b.onclick=function(){record(+b.getAttribute('data-g'));next()}});
    ts(a);var nx=$('#nx');if(nx)nx.focus();}
  function record(r){if(answered===2)return;answered=2;results.push({item:cur,r:r});if(cur.id&&!cur.task){if(r===1)S.mast[cur.id]=Date.now();else delete S.mast[cur.id]}if(o.requeue&&r<1){var nI=o.requeue(cur);if(nI)items.push(nI)}if(cur.task&&o.mode!=='quiz'){var p=S.tasks[cur.task]||{n:0};S.tasks[cur.task]={r:r,t:Date.now(),n:(p.n||0)+1}}activity(r===1?10:r>0?5:2)}
  function next(){i++;draw()}
  draw();
}

/* ---------- Wiederholung ---------- */
function reviewItems(m){
  var withDate=m.tasks.filter(function(t){var tp=TOPIC[t.topic];return tp&&lectureDate(tp)});if(!withDate.length)return [];
  var dates=uniq(withDate.filter(function(t){return lecHeld(LECT[TOPIC[t.topic].lecture])}).map(function(t){return ymd(lectureDate(TOPIC[t.topic]))})).map(pd).sort(function(a,b){return b-a});
  if(!dates.length)return [];
  var lastWeekStart=monday(dates[0]);
  var recent=withDate.filter(function(t){var d=lectureDate(TOPIC[t.topic]);return d>=lastWeekStart&&lecHeld(LECT[TOPIC[t.topic].lecture])});
  var older=withDate.filter(function(t){var d=lectureDate(TOPIC[t.topic]);return d<lastWeekStart});
  function pick(a,n){return shuffle(a).sort(function(x,y){return prio(x)-prio(y)}).slice(0,n)}
  function prio(t){var r=res(t.id);return r==null?1:r<1?0:2}
  var a=pick(recent,older.length?5:10),b=pick(older,10-a.length);if(a.length+b.length<10)a=a.concat(pick(recent.filter(function(t){return a.indexOf(t)<0}),10-a.length-b.length));
  return shuffle(a.concat(b));
}

/* ---------- Prüfungen, Einstufung, Lernplan ---------- */
function diagItems(m,x){var out=[];(x.topics||[]).forEach(function(tid){var d=tasksOfTopic(tid).filter(function(t){return t.diag});d.sort(function(a,b){return a.level-b.level});
  if(d.length>2)d=[d[0],d[d.length-1]];out=out.concat(d)});
  if(out.length>24){var one={};out=out.filter(function(t){if(one[t.topic])return false;one[t.topic]=1;return true})}
  return out}
function examRow(m,x){var p=S.plans[x.id],dg=S.diag[x.id],st;
  if(p){var tot=p.sessions.length,dn=p.sessions.filter(function(s){return p.done[s.id]}).length;st='<span class="chip acc">Plan '+dn+'/'+tot+'</span>'}
  else if(diagItems(m,x).length)st='<span class="chip warn">Test offen</span>';else st='<span class="chip">noch kein Stoff</span>';
  var er=examReady(x);
  return '<a class="item" href="#/fach/'+m.id+'/pruefungen/'+x.id+'"><span class="grow"><span class="kind">'+esc(KIND[x.kind]||x.kind)+'</span><div class="t">'+esc(x.name)+'</div><div class="s">'+(x.date?fmtDY(pd(x.date))+' · '+rel(pd(x.date)):'Termin offen')+'</div>'+(er!=null?rbar(er):'<div style="margin-top:4px">'+st+'</div>')+'</span><span class="chev">'+IC.chev+'</span></a>'}
function vRadar(m){var r=m.radar;if(!r)return '';
  var order={'sehr hoch':0,'hoch':1,'mittel':2,'niedrig':3},cl={'sehr hoch':'rv4','hoch':'rv3','mittel':'rv2','niedrig':'rv1'};
  var items=(r.radar||[]).slice().sort(function(a,b){return (order[a.wahrscheinlichkeit]||9)-(order[b.wahrscheinlichkeit]||9)});
  var h='<section class="sec" id="radar"><h2>Klausur-Radar</h2><p class="muted small" style="margin:-4px 0 10px">Was wahrscheinlich drankommt. Einschätzung aus deinem Stoff, Prüfungsform und öffentlichen Infos, keine Garantie. Stand '+esc(r.stand||'')+'.</p>';
  if(r.pruefungsform)h+='<div class="card"><b>Prüfungsform</b><div class="s" style="margin-top:4px">'+esc(r.pruefungsform)+'</div></div>';
  h+='<div class="list" style="margin-top:12px">'+items.map(function(x){return '<div class="item"><span class="rv '+(cl[x.wahrscheinlichkeit]||'rv2')+'" title="'+esc(x.wahrscheinlichkeit)+'"><i></i><i></i><i></i><i></i></span><span class="grow"><span class="t">'+esc(x.thema)+'</span><div class="s">'+esc(x.warum||'')+(x.aufgabentyp?' · <b>Aufgabentyp:</b> '+esc(x.aufgabentyp):'')+'</div></span><span class="r small">'+esc(x.wahrscheinlichkeit)+'</span></div>'}).join('')+'</div>';
  if(r.fallen&&r.fallen.length)h+='<details class="more card" style="margin-top:12px"><summary><b>Typische Fallen</b> ('+r.fallen.length+')</summary><ul class="steps">'+r.fallen.map(function(t){return '<li>'+esc(t)+'</li>'}).join('')+'</ul></details>';
  if(r.tipps&&r.tipps.length)h+='<details class="more card" style="margin-top:12px"><summary><b>So bereitest du dich vor</b> ('+r.tipps.length+')</summary><ul class="steps">'+r.tipps.map(function(t){return '<li>'+esc(t)+'</li>'}).join('')+'</ul></details>';
  if(r.lehrende&&r.lehrende.length)h+='<details class="more card" style="margin-top:12px"><summary><b>Lehrende</b></summary><ul class="steps">'+r.lehrende.map(function(p){return '<li><b>'+esc(p.name)+'</b>'+(p.rolle?' · '+esc(p.rolle):'')+(p.schwerpunkt?'<div class="s">'+esc(p.schwerpunkt)+'</div>':'')+'</li>'}).join('')+'</ul></details>';
  if(r.altklausuren)h+='<div class="card" style="margin-top:12px"><b>Altklausuren</b><div class="s" style="margin-top:4px">'+esc(r.altklausuren)+'</div></div>';
  if(r.quellen&&r.quellen.length)h+='<details class="more" style="margin-top:10px"><summary class="muted small">Quellen ('+r.quellen.length+')</summary><ul class="small">'+r.quellen.map(function(u){return '<li><a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(u.replace(/^https?:\/\//,'').slice(0,70))+'</a></li>'}).join('')+'</ul></details>';
  return h+'</section>'}
function vExams(m){
  if(!m.exams.length)return '<div class="card empty" style="margin-top:16px">Keine Prüfungen eingetragen.</div>';
  var up=m.exams.filter(function(x){return !x.date||pd(x.date)>=TODAY}).sort(function(a,b){return (a.date?pd(a.date):9e15)-(b.date?pd(b.date):9e15)});
  var past=m.exams.filter(function(x){return x.date&&pd(x.date)<TODAY});
  var h=(m.radar?'<a class="radarlink" href="javascript:void(0)" onclick="document.getElementById(\'radar\').scrollIntoView({behavior:\'smooth\'})">🎯 Klausur-Radar: Was kommt wahrscheinlich dran? ↓</a>':'')+'<section class="sec"><p class="muted">So geht es: <b>1.</b> Einstufungstest machen. <b>2.</b> Du siehst deine Schwächen. <b>3.</b> Dein Lernplan entsteht automatisch.</p></section>';
  h+='<section class="sec"><div class="list">'+up.map(function(x){return examRow(m,x)}).join('')+'</div></section>';
  if(past.length)h+='<section class="sec"><details class="more list"><summary>Vorbei ('+past.length+')</summary>'+past.map(function(x){return examRow(m,x)}).join('')+'</details></section>';
  return h+vRadar(m);
}
function vExam(m,x){
  if(!x)return '<div class="card empty">Nicht gefunden.</div>';
  var di=diagItems(m,x),dg=S.diag[x.id],p=S.plans[x.id];
  var h='<section class="sec"><a class="back2" href="#/fach/'+m.id+'/pruefungen">'+IC.back+' Alle Prüfungen</a><h2 style="font-size:1.5rem;margin-top:8px">'+esc(x.name)+'</h2><p class="muted">'+(x.date?WDL[pd(x.date).getDay()]+', '+pd(x.date).getDate()+'. '+MON[pd(x.date).getMonth()]+(x.time?' · '+esc(x.time):'')+' · <b>'+rel(pd(x.date))+'</b>':'Termin offen')+(x.place?' · '+esc(x.place):'')+'</p>'+(x.note?'<div class="card small">'+noteHtml(x.note)+'</div>':'')+'</section>';
  var er=examReady(x),topicsHtml='';
  if(er!=null){h+='<section class="sec"><div class="card">'+rbar(er,'Bereit für '+esc(x.name))+'<p class="small muted" style="margin:8px 0 0">Rechnet sich aus deinen Übungen (70 %) und gekonnten Begriffen (30 %) je Thema.</p></div></section>';
    topicsHtml='<section class="sec"><details class="more list"><summary>Alle Themen einzeln lernen und üben</summary>'+(x.topics||[]).map(function(tid){var tp=TOPIC[tid],r=topicReady(tid),l=tp&&LECT[tp.lecture];
      return '<div class="item"><span class="grow"><span class="t">'+esc(tp?tp.name:tid)+'</span>'+(r!=null?rbar(r):'<div class="s">noch kein Stoff</div>')+'</span>'+(hasLearn(tid)?'<button class="btn sm ghost" data-act="learn" data-t="'+tid+'">Lesen</button>':l?'<a class="btn sm ghost" href="#/fach/'+m.id+'/vorlesungen/'+l.id+'">Lesen</a>':'')+(tasksOfTopic(tid).length?'<button class="btn sm soft" data-act="ptopic" data-t="'+tid+'">Üben</button>':'')+'</div>'}).join('')+'</details></section>'}
  if(!di.length&&!p){h+='<div class="card empty">Für diese Prüfung gibt es noch keinen Stoff. Sobald die Vorlesungen dazu waren, kommt hier der Einstufungstest.</div>';return h}
  var steps='<div class="steps3"><div class="st'+(dg?' ok':'')+'"><span class="no">'+(dg?IC.check:'1')+'</span><div class="grow"><b>Einstufungstest</b><div class="s muted">'+di.length+' Aufgaben · ca. '+Math.max(5,di.length*2)+' min · ehrlich bewerten</div>'+
     '<div class="btns"><button class="btn sm'+(dg?' ghost':'')+'" data-act="diag" data-x="'+x.id+'">'+(dg?'Nochmal testen':'Test starten')+'</button></div></div></div>'+
   '<div class="st'+(dg?' ok':' dim')+'"><span class="no">'+(dg?IC.check:'2')+'</span><div class="grow"><b>Deine Schwächen</b><div class="s muted">'+(dg?'Stand vom '+fmtD(new Date(dg.t)):'nach dem Test')+'</div></div></div>'+
   '<div class="st'+(p?'':' dim')+'"><span class="no">3</span><div class="grow"><b>Dein Lernplan</b><div class="s muted">'+(p?'läuft':'entsteht automatisch')+'</div></div></div></div>';
  h+='<section class="sec">'+steps+'</section>';
  if(dg){var tps=Object.keys(dg.scores).sort(function(a,b){return dg.scores[a]-dg.scores[b]});
    h+='<section class="sec"><h2>Schwächen und Stärken</h2><div class="card">'+tps.map(function(t){var s=Math.round(dg.scores[t]*100),c=s<50?'bad':s<80?'warn':'ok';return '<div class="topicbar"><span>'+esc(TOPIC[t]?TOPIC[t].name:t)+'</span><span class="bar '+c+'"><span style="width:'+Math.max(4,s)+'%"></span></span><span class="pc">'+s+' %</span></div>'}).join('')+'</div></section>'}
  if(p){var wkEnd=addDays(thisMon,7),now=p.sessions.filter(function(s){return pd(s.date)<wkEnd||!p.done[s.id]&&pd(s.date)<TODAY});if(p.fixed&&now.length<3)now=p.sessions.filter(function(s){return !p.done[s.id]}).slice(0,Math.max(3,now.length));var later=p.sessions.filter(function(s){return now.indexOf(s)<0});
    h+='<section class="sec plan"><h2>Lernplan <span class="chip acc">'+p.sessions.filter(function(s){return p.done[s.id]}).length+'/'+p.sessions.length+'</span></h2><p class="muted small">'+(p.fixed?(x.plannote||'Fester Plan bis zum Termin. Tippe auf ▶ für Lesen + Üben, abhaken wenn fertig.'):'Pro Tag ein Häppchen. Zuerst die schwächsten Themen, gemischt mit Wiederholung.')+'</p>'+
     '<div class="list">'+now.map(function(s){return sessRow(m,x,p,s)}).join('')+'</div>'+(later.length?'<details class="more list" style="margin-top:10px"><summary>Später ('+later.length+')</summary>'+later.map(function(s){return sessRow(m,x,p,s)}).join('')+'</details>':'')+'</section>';}
  return h+topicsHtml;
}
function sessRow(m,x,p,s){var d=pd(s.date),on=!!p.done[s.id],today=+d===+TODAY,over=d<TODAY&&!on;
  var label=s.title?esc(s.title):s.final?'<b>Abschlusstest</b>: Einstufungstest nochmal':s.topics.map(function(t){return esc(TOPIC[t]?TOPIC[t].name:t)}).join(' + ');
  if(s.tag)label='<span class="ptag">'+esc(s.tag)+'</span> '+label;
  return '<div class="item'+(on?' done':'')+(today?' today':'')+'"><button class="ck'+(on?' on':'')+'" data-act="sess" data-x="'+x.id+'" data-s="'+s.id+'" aria-pressed="'+on+'">'+IC.check+'</button><span class="when">'+(today?'Heute':fmtD(d))+'</span><span class="grow"><span class="t">'+label+'</span>'+(s.note?'<div class="s">'+s.note+'</div>':'')+(s.min?'<div class="s">ca. '+s.min+' min'+(!s.final&&s.topics&&s.topics.some(hasLearn)?' · Lesen + Test':'')+'</div>':(!s.final&&s.topics&&s.topics.some(hasLearn)?'<div class="s">Lesen + Test</div>':''))+(over?'<div class="s bad">nachholen</div>':'')+'</span>'+(on?'':'<button class="btn sm" data-act="runsess" data-x="'+x.id+'" data-s="'+s.id+'">'+IC.play+'</button>')+'</div>'}
function fixPlan(x,old){var done=(old&&old.fixed&&old.done)||{};return {created:ymd(TODAY),fixed:x.fixver||1,sessions:x.fixplan.map(function(s,i){return {id:s.id||('f'+i),date:s.d,topics:s.t||[],title:s.title,note:s.note,min:s.min,tag:s.tag,final:!!s.final}}),done:done}}
function ensureFixPlans(){MODS.forEach(function(m){m.exams.forEach(function(x){if(!x.fixplan)return;var p=S.plans[x.id];if(!p||p.fixed!==(x.fixver||1))S.plans[x.id]=fixPlan(x,p)})})}
function makePlan(m,x,scores){if(x.fixplan)return fixPlan(x,S.plans[x.id]);
  var tps=(x.topics||[]).filter(function(t){return tasksOfTopic(t).length});
  var examD=x.date?pd(x.date):addDays(TODAY,21),days=Math.max(1,dd(TODAY,examD));
  var horizon=days>21?14:days,studyDays=Math.max(1,horizon-1);
  var w=tps.map(function(t){return {t:t,w:1-(scores[t]!=null?scores[t]:.5)}}).sort(function(a,b){return b.w-a.w});
  var weak=w.filter(function(o){return o.w>.2}),strong=w.filter(function(o){return o.w<=.2});
  var sumW=weak.reduce(function(s,o){return s+o.w},0)||1,cap=Math.max(weak.length,studyDays-strong.length);
  weak.forEach(function(o){o.n=Math.max(1,Math.round(cap*o.w/sumW))});strong.forEach(function(o){o.n=1});
  var pool=weak.concat(strong).map(function(o){return {t:o.t,n:o.n}}),slots=[],prev=null;
  while(pool.some(function(o){return o.n>0})){pool.sort(function(a,b){return b.n-a.n});var o=pool.find(function(p){return p.n>0&&p.t!==prev})||pool.find(function(p){return p.n>0});slots.push(o.t);o.n--;prev=o.t}
  if(slots.length<studyDays&&slots.length){var base=slots.slice();while(slots.length<studyDays)slots.push(base[slots.length%base.length])}
  var per=Math.min(2,Math.max(1,Math.ceil(slots.length/studyDays))),sessions=[];
  for(var i=0;i<studyDays&&slots.length;i++){var tops=uniq(slots.splice(0,per));sessions.push({id:'s'+i,date:ymd(addDays(TODAY,i)),topics:tops})}
  sessions.push({id:'final',date:ymd(addDays(TODAY,Math.max(0,horizon-1))),final:true,topics:[]});
  return {created:ymd(TODAY),sessions:sessions,done:{}};
}
function avg(o){var k=Object.keys(o);return k.length?k.reduce(function(s,t){return s+o[t]},0)/k.length:0}
function startDiag(xid,isFinal){var m,x;MODS.forEach(function(mm){mm.exams.forEach(function(xx){if(xx.id===xid){m=mm;x=xx}})});if(!x)return;
  if(!isFinal&&S.plans[x.id]&&!confirmReset){/* Nochmal testen: Plan bleibt, Ergebnis wird als neuer Stand gespeichert */}
  runItems(diagItems(m,x).map(taskItem),{title:(isFinal?'Abschlusstest ':'Einstufung ')+x.name,mode:'diag',onEnd:function(r){
    var sc={},n={};r.forEach(function(o){var t=o.item.topic;sc[t]=(sc[t]||0)+o.r;n[t]=(n[t]||0)+1});Object.keys(sc).forEach(function(t){sc[t]=sc[t]/n[t]});
    var old=S.diag[x.id],html;
    if(isFinal||(old&&S.plans[x.id])){var p=S.plans[x.id];if(p){var fin=p.sessions.find(function(z){return z.final});if(fin)p.done[fin.id]=true}
      S.diag[x.id]={t:old?old.t:Date.now(),scores:old?old.scores:sc,after:{t:Date.now(),scores:sc}};
      var a=Math.round(avg(old?old.scores:sc)*100),b=Math.round(avg(sc)*100);
      html='<div class="center"><div class="big">'+b+' %</div><p>'+(old?'Vorher '+a+' % → jetzt '+b+' %. ':'')+(b>=80?'Du bist bereit!':'Die schwachen Themen stehen in deinem Plan.')+'</p>';
    }else{S.diag[x.id]={t:Date.now(),scores:sc};S.plans[x.id]=makePlan(m,x,sc);
      var weak=Object.keys(sc).filter(function(t){return sc[t]<.8}).length;
      html='<div class="center"><div class="big">Fertig!</div><p>'+(weak?weak+' Themen brauchen noch Übung. Dein Lernplan steht.':'Alles sitzt schon gut. Dein Plan hält es frisch.')+'</p>';}
    save();activity(30);confetti();hMark('diag:'+x.id);
    return html+'<div class="btns" style="justify-content:center"><a class="btn" href="#/fach/'+m.id+'/pruefungen/'+x.id+'" data-act="close">Zum Lernplan</a></div></div>'}});
}
var confirmReset=false;

/* ================= Lerntext pro Thema (erst lesen, dann Test) ================= */
function hasLearn(tid){return TOPIC[tid]&&TOPIC[tid].learn&&TOPIC[tid].learn.length}
function renderLearn(blocks){var exi=0;return blocks.map(function(bk){
  if(bk.h!=null)return '<h3 class="sh">'+bk.h+'</h3>';
  if(bk.p!=null)return '<div class="sp">'+String(bk.p).replace(/<table/g,'<div class="scroll"><table').replace(/<\/table>/g,'</table></div>')+'</div>';
  if(bk.tip!=null)return '<div class="tipbox">'+bk.tip+'</div>';
  if(bk.f!=null){var f=FORM[bk.f];return f?'<div class="flist one">'+fxCard(f)+'</div>':''}
  if(bk.ex!=null&&typeof bk.ex==='object'){var e=bk.ex,i=exi++;return '<div class="card ex" data-ex="'+i+'"><h3>'+e.title+'</h3><ol class="steps">'+(e.steps||[]).map(function(st,j){return '<li'+(j>0?' hidden':'')+'>'+st+'</li>'}).join('')+'</ol>'+((e.steps||[]).length>1?'<div class="btns"><button class="btn sm soft" data-act="step">Nächster Schritt</button><button class="btn sm ghost" data-act="stepall">Alle zeigen</button></div>':'')+'</div>'}
  return ''}).join('')}
function learnSheet(tids,opts){opts=opts||{};var ts=tids.filter(hasLearn);if(!ts.length){if(opts.then)opts.then();return}
  var mod=TOPIC[ts[0]].mod;
  var h='<div class="'+cls(mod)+' story">'+(opts.then?'<div class="eyebrow">Schritt 1 von 2 · Lesen</div>':'<div class="eyebrow">'+esc(SHORT[mod]||'')+' · Lerntext</div>')+
   ts.map(function(tid){return '<h2 style="margin-top:6px">'+esc(TOPIC[tid].name)+'</h2>'+renderLearn(TOPIC[tid].learn)}).join('<hr class="sep">')+
   (opts.then?'<div class="btns" style="margin-top:16px"><button class="btn block" id="learnok" data-act="learnok">✓ Gelesen – jetzt der Test</button></div><p class="small muted center">Schritt 2 von 2: Aufgaben nur zu diesem Thema</p>':'')+'</div>';
  sheet(h,{title:opts.title||'Lerntext'});ts.forEach(function(tid){S.read['t:'+tid]=Date.now()});save();
  LEARN_THEN=opts.then||null}
var LEARN_THEN=null;
function runSession(xid,sid){var m,x;MODS.forEach(function(mm){mm.exams.forEach(function(xx){if(xx.id===xid){m=mm;x=xx}})});var p=S.plans[xid];if(!p)return;var s=p.sessions.find(function(z){return z.id===sid});if(!s)return;
  if(s.final&&diagItems(m,x).length){startDiag(xid,true);return}
  if(!s.topics.length){sheet('<div class="'+cls(m.id)+' story"><div class="eyebrow">'+esc(x.name)+' · Lernplan</div><h2>'+esc(s.title||'Aufgabe')+'</h2><div class="sp">'+(s.note||'')+'</div><div class="btns" style="margin-top:16px"><button class="btn block" data-act="sessdone" data-x="'+xid+'" data-s="'+sid+'">✓ Erledigt</button></div></div>',{title:s.title||'Lernplan'});return}
  if(!arguments[2]&&s.topics.some(hasLearn)){learnSheet(s.topics,{title:'Lernplan: '+s.topics.map(function(t){return TOPIC[t].name}).join(' + '),then:function(){runSession(xid,sid,true)}});return}
  var cand=[];s.topics.forEach(function(tid){shuffle(tasksOfTopic(tid)).sort(function(a,b){return (a.level||1)-(b.level||1)}).forEach(function(t){cand.push(taskItem(t))})});
  var items=pickFresh(cand,9,3);if(!items.length&&cand.length)items=cand.slice(0,5);
  var deck=[];s.topics.forEach(function(tid){termsOf(m).forEach(function(t){if(t.topic===tid)deck.push(t)})});
  runItems(items,{title:s.topics.map(function(t){return TOPIC[t].name}).join(' + '),mode:'practice',onEnd:function(r){p.done[sid]=true;save();activity(20);hMark('plan:'+xid+':'+sid);confetti();
    var okN=r.filter(function(o){return o.r===1}).length;return '<div class="center"><div class="big">'+okN+' / '+r.length+'</div><p>Einheit geschafft! +20 XP</p><div class="btns" style="justify-content:center"><button class="btn" data-act="close">Fertig</button></div>'+(deck.length?'<p class="small"><a href="#" data-act="deckkeys" data-keys="'+esc(deck.slice(0,10).map(function(t){return t.key}).join('|'))+'">Noch '+Math.min(deck.length,10)+' Karteikarten dazu</a></p>':'')+'</div>'}});
}

/* ---------- Info ---------- */
function vInfo(m){
  var i=m.info||{},h='<section class="sec"><div class="card"><dl class="facts">'+(i.lehrende?'<dt>Lehrende</dt><dd>'+esc(i.lehrende)+'</dd>':'')+(i.pruefung?'<dt>Prüfung</dt><dd>'+esc(i.pruefung)+'</dd>':'')+'</dl></div></section>';
  if(i.regeln&&i.regeln.length)h+='<section class="sec"><h2>Wichtig</h2><div class="list">'+i.regeln.map(function(r){return '<div class="item"><span class="dot"></span><span class="grow">'+r+'</span></div>'}).join('')+'</div></section>';
  if(m.weekly.length){var wn=['','Mo','Di','Mi','Do','Fr','Sa','So'];h+='<section class="sec"><h2>Jede Woche</h2><div class="list">'+m.weekly.slice().sort(function(a,b){return a.wd-b.wd||tmin(a.from)-tmin(b.from)}).map(function(w){return '<div class="item"><span class="when" style="width:46px;font-weight:700">'+wn[w.wd]+'</span><span class="grow"><span class="t">'+esc(w.title)+'</span><div class="s">'+esc(w.from)+'–'+esc(w.to)+' · '+esc(w.place||'')+(w.note?' · '+esc(w.note):'')+'</div></span></div>'}).join('')+'</div></section>'}
  if(m.todos&&m.todos.length){var g={};m.todos.forEach(function(t){(g[t.group||'To-dos']=g[t.group||'To-dos']||[]).push(t)});Object.keys(g).forEach(function(k){h+='<section class="sec"><h2>'+esc(k)+'</h2><div class="list">'+g[k].map(todoRow).join('')+'</div></section>'})}
  if(i.links&&i.links.length)h+='<section class="sec"><h2>Links</h2><div class="list">'+i.links.map(function(l){return '<a class="item" href="'+esc(l.url)+'" target="_blank" rel="noopener"><span class="grow"><span class="t">'+esc(l.label)+'</span></span><span class="chev">'+IC.chev+'</span></a>'}).join('')+'</div></section>';
  var evs=events().filter(function(e){return e.mod===m.id});
  if(evs.length)h+='<section class="sec"><details class="more list"><summary>Alle Termine ('+evs.length+')</summary>'+evs.map(evRow).join('')+'</details></section>';
  return h;
}

/* ================= STUDIUM ================= */
function vStudium(){
  var st=D.studium||{},h='<div class="m-studium"><div class="band"><div class="wrap"><a class="back" href="#/faecher">'+IC.back+' Fächer</a><h1>Mein Studiengang</h1><p style="opacity:.9">B.Sc. Wirtschaftsingenieurwesen Bau</p></div></div><div class="wrap">';
  if(st.lernregeln)h+='<section class="sec"><h2>Meine Lernregeln</h2><div class="list">'+st.lernregeln.map(function(r){var on=!!S.rules[r.id];return '<div class="item'+(on?' done':'')+'"><button class="ck'+(on?' on':'')+'" data-act="rule" data-id="'+r.id+'">'+IC.check+'</button><span class="grow">'+esc(r.text)+'</span></div>'}).join('')+'</div></section>';
  if(st.regeln)h+='<section class="sec"><h2>Regeln, die du kennen musst</h2><div class="list">'+st.regeln.map(function(r){return '<div class="item"><span class="grow"><span class="t">'+esc(r.titel)+'</span><div class="s">'+esc(r.text)+'</div></span></div>'}).join('')+'</div></section>';
  if(st.plan)h+='<section class="sec"><details class="more list"><summary>Studienplan (alle Semester)</summary><div style="padding:0 14px 14px">'+st.plan.map(function(s){return '<h3 style="margin-top:12px">'+s.sem+'. Semester</h3><div class="scroll"><table class="tt" style="width:100%">'+s.module.map(function(md){return '<tr><td>'+esc(md.name)+(md.note?'<div class="small muted">'+esc(md.note)+'</div>':'')+'</td><td style="width:60px">'+(md.cp!=null?md.cp+' CP':'')+'</td></tr>'}).join('')+'</table></div>'}).join('')+'</div></details></section>';
  if(st.kontakte)h+='<section class="sec"><details class="more list"><summary>Ansprechpartner</summary>'+st.kontakte.map(function(k){return '<div class="item"><span class="grow"><span class="t">'+esc(k.name)+'</span><div class="s">'+esc(k.text)+'</div></span></div>'}).join('')+'</details></section>';
  if(st.links)h+='<section class="sec"><details class="more list"><summary>Wichtige Links</summary>'+st.links.map(function(l){return '<a class="item" href="'+esc(l.url)+'" target="_blank" rel="noopener"><span class="grow">'+esc(l.label)+'</span><span class="chev">'+IC.chev+'</span></a>'}).join('')+'</details></section>';
  var th=S.theme||'auto';
  h+='<section class="sec"><h2>Einstellungen</h2><div class="card"><div class="small muted">Design</div><div class="tabs" style="margin-top:6px">'+[['auto','Automatisch'],['light','Hell'],['dark','Dunkel']].map(function(t){return '<button class="'+(th===t[0]?'on':'')+'" data-act="theme" data-t="'+t[0]+'">'+t[1]+'</button>'}).join('')+'</div>'+
   '</div>'+syncCard()+'<div class="card"><button class="btn sm ghost" data-act="privacy">Datenschutz und Hinweise</button><button class="btn sm ghost" data-act="terms">Nutzungsbedingungen</button><p class="small muted" style="margin:8px 0 0">© 2026 swiedzaid-star. Alle Rechte vorbehalten.</p></div>'+'<div class="card"><div class="small muted">Oder einmalig von Hand übertragen</div><div class="btns"><button class="btn sm soft" data-act="export">Fortschritt kopieren</button></div><textarea class="ans" id="imp" placeholder="Hier den kopierten Fortschritt einfügen"></textarea><div class="btns"><button class="btn sm ghost" data-act="import">Einfügen und übernehmen</button></div><div id="impmsg" class="small"></div></div></section>';
  return h+'<p class="foot">Stand der Inhalte: '+esc((D.meta||{}).built||'')+'</p></div></div>';
}

/* ================= Kopfrechnen ================= */
function fmtSec(s){return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')}
function kopfrechnen(){
  var N=20,qs=[],i=0,right=0,wrong=[],t0=Date.now(),iv=null;
  function rnd(a,b){return a+Math.floor(Math.random()*(b-a+1))}function gcd(a,b){while(b){var t=b;b=a%b;a=t}return a}
  for(var k=0;k<N;k++){var t=rnd(0,2);if(t===0){var a=rnd(2,10),b=rnd(2,10);qs.push(Math.random()<.3?{q:(a*b)+' : '+a,a:String(b)}:{q:a+' · '+b,a:String(a*b)})}
    else if(t===1){var n=Math.random()<.7?rnd(11,20):rnd(2,10);qs.push(Math.random()<.4?{q:'√'+(n*n),a:String(n)}:{q:n+'²',a:String(n*n)})}
    else{var p,q;do{p=rnd(1,11);q=rnd(2,12)}while(gcd(p,q)!==1);var f=rnd(2,9);qs.push({q:'Kürze '+(p*f)+'/'+(q*f),a:p+'/'+q,frac:true})}}
  function draw(){if(i>=N){clearInterval(iv);var s=Math.round((Date.now()-t0)/1000),b=S.kr.best;if(!b||right>b.r||(right===b.r&&s<b.t)){S.kr.best={r:right,t:s};confetti()}save();activity(right*2);
      sheet('<div class="center"><div class="big">'+right+' / '+N+'</div><p>in '+fmtSec(s)+'</p></div>'+(wrong.length?'<div class="card"><b>Nochmal anschauen:</b><br>'+wrong.map(esc).join('<br>')+'</div>':'')+'<div class="btns" style="justify-content:center"><button class="btn" data-act="close">Fertig</button></div>',{title:'Kopfrechnen',replace:true});return}
    sheet('<div class="prog"><span class="small muted">Frage '+(i+1)+' / '+N+' · <span id="krt">0:00</span></span><div class="bar"><span style="width:'+(i/N*100)+'%"></span></div></div><div class="qcard m-mathe center"><div class="krq">'+esc(qs[i].q)+'</div><form id="krf" autocomplete="off"><input class="ans" id="kri" inputmode="'+(qs[i].frac?'text':'numeric')+'" aria-label="Antwort"> <button class="btn">OK</button></form><div id="krfb" class="fb"></div></div>',{title:'Kopfrechnen',replace:true});
    var inp=$('#kri');inp.focus();$('#krf').onsubmit=function(e){e.preventDefault();var v=inp.value.replace(/\s/g,'');if(!v){$('#krfb').textContent='Erst eine Antwort eingeben.';return}
      if(v===qs[i].a)right++;else wrong.push(qs[i].q+' = '+qs[i].a+' (du: '+v+')');i++;draw()}}
  iv=setInterval(function(){var e=$('#krt');if(e)e.textContent=fmtSec(Math.round((Date.now()-t0)/1000));else clearInterval(iv)},500);
  draw();
}

/* ================= Einheiten-Training ================= */
var UNITFAM=[
 {id:'len',name:'Länge',lvl:1,ladder:true,u:[['km',1e3],['m',1],['dm',.1],['cm',.01],['mm',.001]]},
 {id:'area',name:'Fläche',lvl:1,ladder:true,u:[['m²',1],['dm²',1e-2],['cm²',1e-4],['mm²',1e-6]]},
 {id:'force',name:'Kraft',lvl:1,ladder:true,u:[['MN',1e6],['kN',1e3],['N',1]]},
 {id:'mass',name:'Masse',lvl:1,ladder:true,u:[['t',1e3],['kg',1],['g',1e-3]]},
 {id:'vol',name:'Volumen',lvl:2,ladder:true,u:[['m³',1],['dm³',1e-3],['cm³',1e-6],['mm³',1e-9]],extra:[['l',1e-3],['ml',1e-6]]},
 {id:'time',name:'Zeit',lvl:2,u:[['d',86400],['h',3600],['min',60],['s',1]]},
 {id:'stress',name:'Spannung / Druck',lvl:3,u:[['N/mm²',1],['MPa',1],['MN/m²',1],['kN/cm²',10],['N/cm²',.01],['kN/m²',1e-3],['kPa',1e-3],['GPa',1e3],['bar',.1]]},
 {id:'moment',name:'Moment',lvl:3,u:[['kNm',1e6],['Nm',1e3],['kNcm',1e4],['Nmm',1]]},
 {id:'dens',name:'Dichte',lvl:3,u:[['kg/m³',1],['t/m³',1e3],['g/cm³',1e3],['kg/dm³',1e3]]},
 {id:'speed',name:'Geschwindigkeit',lvl:3,u:[['m/s',1],['km/h',1/3.6]]}];
var UNITHINT={stress:'1 N/mm² = 1 MPa = 1 MN/m² · 1 kN/cm² = 10 N/mm² · 1 kN/m² = 1 kPa = 0,001 N/mm² · 1 bar = 0,1 N/mm²',
  moment:'1 kNm = 1000 Nm = 1 000 000 Nmm · 1 kNcm = 10 000 Nmm',dens:'1 g/cm³ = 1 kg/dm³ = 1 t/m³ = 1000 kg/m³',speed:'1 m/s = 3,6 km/h',time:'1 d = 24 h · 1 h = 60 min · 1 min = 60 s',
  vol:'1 l = 1 dm³ · 1 ml = 1 cm³ · jede Stufe ·1000'};
function nfmt(x){if(!isFinite(x))return String(x);var r=Math.round(x*1e10)/1e10;var s=r.toLocaleString('de-DE',{maximumFractionDigits:10,useGrouping:true});return s.replace(/\./g,'\u2009')}
function nparse(s){s=String(s||'').trim().replace(/[\s\u2009\u202f']/g,'').replace(/·|×|\*/g,'*');if(!s)return NaN;
  var m=s.match(/^(.*?)\*?10\^\(?([-−]?\d+)\)?$/);if(m){var b=m[1]===''?1:nparse(m[1]);return b*Math.pow(10,+m[2].replace('−','-'))}
  if(s.indexOf(',')>=0)s=s.replace(/\./g,'').replace(',','.');else if(/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  s=s.replace('−','-');return /^-?\d*\.?\d+(e-?\d+)?$/i.test(s)?parseFloat(s):NaN}
function numOk(input,want){var v=nparse(input);if(isNaN(v))return false;if(want===0)return Math.abs(v)<1e-12;return Math.abs(v-want)/Math.abs(want)<1e-6}
function niceVal(lvl){var r=Math.random(),base;if(lvl===1)base=[1,2,3,4,5,6,8,10,12,15,20,25,50,250][Math.floor(r*14)];
  else base=[1.5,2.5,3.2,0.8,0.45,12.5,7.5,120,0.06,4.2,35,0.25][Math.floor(r*12)];return base}
function ladderPath(fam,a,b){var us=fam.u.map(function(x){return x[0]}),ia=us.indexOf(a),ib=us.indexOf(b);if(ia<0||ib<0)return '';var st=[];
  if(ia<ib){for(var i=ia;i<ib;i++)st.push(us[i]+' → '+us[i+1]+': ·'+nfmt(fam.u[i][1]/fam.u[i+1][1]))}else for(i=ia;i>ib;i--)st.push(us[i]+' → '+us[i-1]+': :'+nfmt(fam.u[i-1][1]/fam.u[i][1]));
  return st.join('<br>')}
function unitItems(lvl,n){var fams=UNITFAM.filter(function(f){return lvl===3?f.lvl>=2:f.lvl<=lvl}),out=[],seen={};
  for(var k=0;out.length<n&&k<400;k++){var f=fams[Math.floor(Math.random()*fams.length)],us=f.u.concat(f.extra||[]);
    var a=us[Math.floor(Math.random()*us.length)],b=us[Math.floor(Math.random()*us.length)];if(a[0]===b[0]||a[1]===b[1]&&lvl<3)continue;
    if(lvl===1){var ia=f.u.indexOf(a),ib=f.u.indexOf(b);if(ia<0||ib<0||Math.abs(ia-ib)>2)continue}
    var v=niceVal(lvl),w=v*a[1]/b[1];if(w>1e9||w<1e-6)continue;w=Math.round(w*1e10)/1e10;if(Math.abs(w*1e4-Math.round(w*1e4))>1e-6)continue;var key=f.id+a[0]+b[0]+v;if(seen[key])continue;seen[key]=1;
    var path=f.ladder&&f.u.indexOf(a)>=0&&f.u.indexOf(b)>=0?ladderPath(f,a[0],b[0]):'';
    var fac=a[1]/b[1];
    out.push({id:'u:'+key,mod:'mech',type:'typed',inputmode:'decimal',q:'<div class="small muted">'+esc(f.name)+'</div><div class="unitq">'+nfmt(v)+' '+a[0]+' = <span class="mask">…</span> '+b[0]+'</div>',
      check:(function(w){return function(x){return numOk(x,w)}})(w),expect:nfmt(w)+' '+b[0],
      a:'<b>'+nfmt(v)+' '+a[0]+' = '+nfmt(w)+' '+b[0]+'</b><br>1 '+a[0]+' = '+nfmt(fac)+' '+b[0]+(path?'<div class="small" style="margin-top:6px">'+path+'</div>':'')+(UNITHINT[f.id]?'<div class="small muted" style="margin-top:6px">'+UNITHINT[f.id]+'</div>':'')})}
  return out}
function unitTraining(lvl){lvl=+lvl||1;
  runItems(unitItems(lvl,12),{title:'Einheiten · '+['','Stufe 1','Stufe 2','Stufe 3'][lvl],mode:'quiz',onEnd:function(r){var ok=r.filter(function(x){return x.r===1}).length,pct=Math.round(ok/r.length*100);
    S.ui.unitBest=S.ui.unitBest||{};S.ui.unitBest[lvl]=Math.max(S.ui.unitBest[lvl]||0,pct);save();if(pct>=90){confetti();activity(40)}
    return '<div class="center"><div class="big">'+pct+' %</div><p>'+ok+' von '+r.length+' richtig.'+(pct>=90&&lvl<3?' Bereit für Stufe '+(lvl+1)+'!':pct<90?' Ziel: 90 %.':' Stark!')+'</p><div class="btns" style="justify-content:center"><button class="btn" data-act="units" data-lvl="'+(pct>=90&&lvl<3?lvl+1:lvl)+'">'+(pct>=90&&lvl<3?'Stufe '+(lvl+1):'Nochmal')+'</button><button class="btn ghost" data-act="close">Fertig</button></div></div>'}})}
function unitSheet(){var b=(S.ui&&S.ui.unitBest)||{};
  var h='<div class="m-mech"><h2>Einheiten umrechnen</h2><p class="muted">12 Aufgaben, jedes Mal neu gemischt. Antwort eintippen, Komma oder Punkt geht beides. Große Zahlen auch als 10^6.</p>'+
   '<figure class="fig"><svg viewBox="0 0 320 120" role="img" aria-label="Treppe Kraft"><g fill="none" stroke="currentColor" stroke-width="2"><path d="M10 30H110V60H210V90H310"/></g><g font-size="15" font-weight="700" fill="currentColor"><text x="45" y="22">MN</text><text x="148" y="52">kN</text><text x="255" y="82">N</text></g><g font-size="11" fill="currentColor" opacity=".7"><text x="66" y="50">·1000</text><text x="166" y="80">·1000</text></g><text x="10" y="114" font-size="11" fill="currentColor" opacity=".7">Treppe runter: mal · Treppe rauf: geteilt</text></svg></figure>'+
   '<div class="list">'+[[1,'Stufe 1','Länge, Fläche, Kraft, Masse · Nachbarstufen'],[2,'Stufe 2','plus Volumen, Liter, Zeit · mehrere Stufen, Kommazahlen'],[3,'Stufe 3','Spannung (N/mm², MPa, kN/cm²), Moment, Dichte, km/h']].map(function(x){
     return '<div class="item"><span class="grow"><span class="t">'+x[1]+'</span><div class="s">'+x[2]+(b[x[0]]!=null?' · Bestwert <b>'+b[x[0]]+' %</b>':'')+'</div></span><button class="btn sm" data-act="units" data-lvl="'+x[0]+'">Start</button></div>'}).join('')+'</div>'+
   '<div class="card" style="margin-top:12px"><b>Merken</b><ul class="summary"><li>Länge: jede Stufe ·10 (km → m ·1000)</li><li>Fläche: jede Stufe ·100</li><li>Volumen: jede Stufe ·1000</li><li>Kraft: MN → kN → N jeweils ·1000</li>'+UNITHINT.stress.split(' · ').map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul></div></div>';
  sheet(h,{title:'Einheiten-Training'})}

/* ================= Formel-Quiz (Bausteine: Bedeutung, Symbol, Einheit, Wirkung) ================= */
function fqPool(m){var fs=m.formulas.filter(function(f){var l=f.lecture&&LECT[f.lecture];return !l||!l.date||lecHeld(l)||pd(l.date)<=addDays(TODAY,7)});return fs.length?fs:m.formulas}
function formulaItems(m,n,only){var fs=only&&only.length?only:fqPool(m),parts=[];fs.forEach(function(f){(f.parts||[]).forEach(function(p){parts.push({f:f,p:p})})});
  var gr=parts.filter(function(x){return x.p.kind?x.p.kind==='größe':!x.p.ref||['frac','sum','sqrt','eq','cdot'].indexOf(x.p.ref)<0});
  function pickDistinct(arr,val,keyf,k){var seen={},out=[];seen[keyf(val)]=1;shuffle(arr).forEach(function(x){var kk=keyf(x);if(out.length<k&&kk&&!seen[kk]){seen[kk]=1;out.push(x)}});return out}
  function mcItem(id,q,right,wrongs,render,sol){var opts=shuffle([right].concat(wrongs));return {id:id,mod:m.id,type:'mc',q:q,options:opts.map(render),correct:opts.indexOf(right),a:sol}}
  function fx(f){return '<div class="fxbig" style="margin-top:8px">\\['+texSafe(f.tex)+'\\]</div>'}
  function solOf(x){var p=x.p;return '<b>'+mx(p.sym)+' = '+esc(p.name)+'</b>'+(p.unit&&p.unit!==''?' · Einheit: <b>'+esc(p.unit)+'</b>':'')+'<br>'+(p.d||'')+(p.effect?'<br><span class="muted">Wirkung: '+esc(p.effect)+'</span>':'')+'<div class="small muted" style="margin-top:6px">Formel: '+esc(x.f.name)+'</div>'}
  var items=[],gens=[
   function(x){var w=pickDistinct(x.f.parts.map(function(p){return {p:p,f:x.f}}).concat(gr),x,function(y){return y.p.name},3);if(w.length<3)return null;
     return mcItem('fq:n:'+x.f.id+x.p.sym,'Was bedeutet '+mx(x.p.sym)+' in dieser Formel?'+fx(x.f),x,w,function(y){return esc(y.p.name)},solOf(x))},
   function(x){var w=pickDistinct(x.f.parts.map(function(p){return {p:p,f:x.f}}).concat(gr),x,function(y){return y.p.sym},3);if(w.length<3)return null;
     return mcItem('fq:s:'+x.f.id+x.p.sym,'Formel <b>'+esc(x.f.name)+'</b>: Welches Symbol steht für <b>'+esc(x.p.name)+'</b>?',x,w,function(y){return mx(y.p.sym)},solOf(x))},
   function(x){if(!x.p.unit||x.p.unit==='–'||/^\\text\{/.test(x.p.sym))return null;var w=pickDistinct(gr.filter(function(y){return y.p.unit&&y.p.unit!=='–'}).concat(UNITFAM[0].u.concat(UNITFAM[1].u,UNITFAM[2].u,UNITFAM[6].u.slice(0,1),[['mm³'],['kNm'],['–']]).map(function(u){return {p:{unit:u[0]},f:x.f}})),x,function(y){return y.p.unit},3);if(w.length<3)return null;
     return mcItem('fq:u:'+x.f.id+x.p.sym,'Welche Einheit hat '+mx(x.p.sym)+' ('+esc(x.p.name)+')?'+fx(x.f),x,w,function(y){return esc(y.p.unit)},solOf(x))},
   function(x){if(!x.p.effect)return null;var w=pickDistinct(gr.filter(function(y){return y.p.effect&&y.f===x.f}).concat(shuffle(gr.filter(function(y){return y.p.effect&&y.f!==x.f})).slice(0,6)),x,function(y){return y.p.effect},3);if(w.length<3)return null;
     return mcItem('fq:e:'+x.f.id+x.p.sym,'Was bewirkt '+mx(x.p.sym)+' ('+esc(x.p.name)+') in dieser Formel?'+fx(x.f),x,w,function(y){return esc(y.p.effect)},solOf(x))},
   function(x){var others=pickDistinct(fs.filter(function(f){return f.topic===x.f.topic}).concat(shuffle(fs)).map(function(f){return {f:f}}),{f:x.f},function(y){return y.f.tex},3);if(others.length<3)return null;
     var opts=shuffle([{f:x.f}].concat(others));return {id:'fq:f:'+x.f.id,mod:m.id,type:'mc',q:'Wie lautet die Formel für <b>'+esc(x.f.name)+'</b>?',options:opts.map(function(y){return mx(y.f.tex)}),correct:opts.findIndex(function(y){return y.f===x.f}),a:'<b>'+esc(x.f.name)+'</b>: '+mx(x.f.tex)+(x.f.what?'<br>'+x.f.what:'')}}];
  var pool=shuffle(gr),used={},gi=0;
  for(var k=0;k<pool.length*3&&items.length<n;k++){var x=pool[k%pool.length],g=gens[gi%gens.length];gi++;if(g===gens[4]&&used['f'+x.f.id])continue;var it=g(x);if(it&&!used[it.id]){used[it.id]=1;if(g===gens[4])used['f'+x.f.id]=1;items.push(it)}}
  return shuffle(items)}
function formulaQuiz(mid){var m=MOD[mid];var it=formulaItems(m,15);if(it.length<4){toast('Für dieses Fach gibt es noch zu wenige Formeln.');return}
  runItems(it,{title:'Formel-Quiz '+SHORT[mid],mode:'quiz',onEnd:function(r){var ok=r.filter(function(x){return x.r===1}).length,pct=Math.round(ok/r.length*100);S.ui.fqBest=S.ui.fqBest||{};S.ui.fqBest[mid]=Math.max(S.ui.fqBest[mid]||0,pct);save();if(pct>=90){confetti();activity(40)}
    return '<div class="center"><div class="big">'+pct+' %</div><p>'+ok+' von '+r.length+' richtig.'+(pct>=90?' Stark!':' Ziel: 90 %.')+'</p><div class="btns" style="justify-content:center"><button class="btn" data-act="fquiz" data-m="'+mid+'">Neue Runde</button><button class="btn ghost" data-act="close">Fertig</button></div></div>'}})}


/* ================= Kurz & frisch: Zeitbudget + nichts Gekonntes wiederholen ================= */
function estMin(it){if(it.task){var lv=it.level||1,open=it.type!=='mc';return open?[0,1.5,3,5][lv]:[0,.75,1.5,3][lv]}if(it.term)return .35;if(/^fq:/.test(it.id||''))return .5;return .5}
function isMastered(it){if(it.task){var r=S.tasks[it.task];return !!(r&&r.r===1)}if(it.term){var c=S.cards[it.term];if(c&&c.box>=2)return true}return !!(S.mast&&S.mast[it.id])}
function lastSeen(it){if(it.task){var r=S.tasks[it.task];return r?r.t||0:0}return (S.mast&&S.mast[it.id])||0}
function pickFresh(items,budget,minN){minN=minN||4;var fresh=items.filter(function(x){return !isMastered(x)}),old=items.filter(isMastered).sort(function(a,b){return lastSeen(a)-lastSeen(b)});
  var out=[],t=0;function add(x){var e=estMin(x);if(t+e>budget&&out.length>=minN)return false;out.push(x);t+=e;return true}
  fresh.forEach(function(x){if(t<budget)add(x)});
  if(out.length<minN)old.forEach(function(x){if(out.length<minN)add(x)});
  out.est=Math.max(1,Math.round(t));out.repeat=out.filter(isMastered).length;return out}
function minsLabel(list,read){return 'ca. '+Math.min(15,Math.round((read||0)+(list.est||0)))+' min'}

function runPrep(m,pr){var l=pr.lecture,cand=[];
  termQuestions(shuffle(l.terms||[]),termsOf(m)).forEach(function(q){cand.push(q)});
  var tk=[];topicsOfLecture(l).forEach(function(tp){tk=tk.concat(tasksOfTopic(tp.id))});shuffle(tk).sort(function(a,b){return (a.level||1)-(b.level||1)}).forEach(function(t){cand.push(taskItem(t))});
  var T=cand.filter(function(x){return x.task}),B=cand.filter(function(x){return !x.task}),mix=[];while(T.length||B.length){if(T.length)mix.push(T.shift());if(B.length)mix.push(B.shift());if(B.length)mix.push(B.shift())}
  var items=pickFresh(mix,pr.isEx?8:6,4);
  var nxt=m.lectures.filter(function(x){var d=pd(x.date);return d&&!lecHeld(x)&&x.summary&&x.summary.length}).sort(function(a,b){return pd(a.date)-pd(b.date)})[0];
  sheet('<div class="'+cls(m.id)+'"><div class="eyebrow">'+esc(SHORT[m.id])+' · Vorbereitung · '+minsLabel(items,3)+'</div><h2 style="margin-top:4px">Kurz auffrischen: '+esc(l.title)+'</h2><p class="muted">Schritt 1: 2–3 Minuten lesen. Schritt 2: kurzer Test, nur mit dem, was du noch nicht sicher kannst.</p>'+
    (nxt?'<div class="card"><b>Was als Nächstes kommt: '+esc(nxt.title)+'</b><ul class="summary">'+nxt.summary.map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul></div>':'')+essentials(l)+
    '<div class="btns" style="margin-top:12px"><button class="btn block" id="prepgo">'+IC.play+' Test starten ('+items.length+' Fragen · '+minsLabel(items)+')</button></div></div>',{title:'Vorbereitung'});
  ts(layer);$('#prepgo').onclick=function(){runItems(items,{title:'Vorbereitung '+SHORT[m.id],mode:'practice',onEnd:function(r){activity(15);r.forEach(function(x){if(x.item.term)gradeCard(x.item.term,x.r===1)});var okN=r.filter(function(o){return o.r===1}).length;
    return '<div class="center"><div class="big">'+okN+' / '+r.length+'</div><p>Bereit für '+esc(SHORT[m.id])+'!</p><div class="btns" style="justify-content:center"><button class="btn" data-act="close">Fertig</button></div></div>'}})}}
/* ================= Nachbereitung nach der Vorlesung ================= */
function nachDue(){var out=[],lim=addDays(TODAY,-7);MODS.forEach(function(m){m.lectures.forEach(function(l){var d=pd(l.date);if(d&&d>=lim&&lecHeld(l)&&!S.nach[l.id])out.push(l)})});
  return out.sort(function(a,b){return pd(b.date)-pd(a.date)})}
function nachCard(l){if(!lecHeld(l))return '';var r=S.nach[l.id];
  return '<section class="sec"><div class="hcard '+cls(l.mod)+(r&&r.pct>=80?' done':'')+'"><div class="hn">'+(r?(r.pct>=80?IC.check:'↻'):'!')+'</div><div class="grow"><div class="t">Nachbereitung</div><div class="s">'+(r?'Zuletzt '+r.pct+' % · nochmal geht immer':'Das Wichtigste nochmal + alles abfragen · ca. 15 min')+'</div></div><button class="btn sm" data-act="nach" data-l="'+l.id+'">'+(r?'Nochmal':'Start')+'</button></div></section>'}
function nachItems(l){var m=MOD[l.mod],items=[];
  termQuestions(shuffle(l.terms||[]),termsOf(m)).forEach(function(q){q.area='Begriffe';items.push(q)});
  var fs=(l.formulas||[]).map(function(id){return FORM[id]}).filter(Boolean);if(!fs.length)fs=m.formulas.filter(function(f){return f.lecture===l.id});
  if(fs.length)formulaItems(m,8,fs).forEach(function(q){q.area='Formeln';items.push(q)});
  var tk=[];topicsOfLecture(l).forEach(function(tp){tk=tk.concat(tasksOfTopic(tp.id))});
  shuffle(tk).sort(function(a,b){return (a.level||1)-(b.level||1)}).forEach(function(t){var q=taskItem(t);q.area='Aufgaben';items.push(q)});
  /* gemischt: je Bereich abwechselnd, damit von allem etwas drin ist */
  var A={},keys=['Aufgaben','Begriffe','Formeln'];items.forEach(function(x){(A[x.area]=A[x.area]||[]).push(x)});var mixed=[],more=true;while(more){more=false;keys.forEach(function(k){if(A[k]&&A[k].length){mixed.push(A[k].shift());more=true}})}
  return pickFresh(mixed,8,5)}
function essentials(l){var fs=(l.formulas||[]).map(function(id){return FORM[id]}).filter(Boolean).slice(0,4);
  return '<div class="card"><b>Das musst du mitnehmen</b><ul class="summary">'+(l.summary||[]).map(function(x){return '<li>'+x+'</li>'}).join('')+'</ul></div>'+
   (fs.length?'<div class="card"><b>Die wichtigsten Formeln</b>'+fs.map(function(f){return '<div class="essf"><div class="small muted">'+esc(f.name)+'</div><div class="fxbig" style="margin-top:4px">\\['+texSafe(f.tex)+'\\]</div>'+(f.what?'<div class="small">'+f.what+'</div>':'')+'</div>'}).join('')+'</div>':'')+
   ((l.terms||[]).length?'<div class="card"><b>Kernbegriffe</b><div class="voklist">'+(l.terms||[]).slice(0,6).map(function(t){return '<div class="v"><dt>'+t.t+(t.sym?' <span class="sym">'+mx(t.sym)+'</span>':'')+'</dt><dd>'+t.d+'</dd></div>'}).join('')+'</div></div>':'')}
function runNach(lid){var l=LECT[lid];if(!l)return;var items=nachItems(l);
  sheet('<div class="'+cls(l.mod)+'"><div class="eyebrow">'+esc(SHORT[l.mod])+' · Nachbereitung</div><h2 style="margin-top:4px">'+esc(l.title)+'</h2><p class="muted">Insgesamt höchstens 10–15 Minuten: erst 2–3 Minuten das Wichtigste lesen, dann ein kurzer Test mit allem, was du noch nicht sicher kannst.</p>'+essentials(l)+
    '<div class="btns" style="margin-top:12px"><button class="btn block" id="nachgo">'+IC.play+' Abfrage starten ('+items.length+' Fragen · '+minsLabel(items)+')</button></div>'+(items.repeat?'<p class="small muted center">'+(items.repeat===items.length?'Alles schon gekonnt – kurze Auffrischung.':items.repeat+' davon zur Auffrischung, der Rest ist neu für dich.')+'</p>':'<p class="small muted center">Nur Fragen, die du noch nicht sicher kannst.</p>')+'</div>',{title:'Nachbereitung'});
  ts(layer);var go=$('#nachgo');if(go)go.onclick=function(){
    runItems(items,{title:'Nachbereitung '+SHORT[l.mod],mode:'practice',onEnd:function(r){
      var A={};r.forEach(function(x){var a=x.item.area||'Aufgaben';A[a]=A[a]||{s:0,n:0};A[a].s+=x.r;A[a].n++;if(x.item.term)gradeCard(x.item.term,x.r===1)});
      var tot=r.reduce(function(a,x){return a+x.r},0)/r.length,pc=Math.round(tot*100);S.nach[l.id]={pct:pc,t:Date.now()};S.read[l.id]=S.read[l.id]||(pc>=60);save();if(pc>=80){confetti();activity(60)}
      var wrong=r.filter(function(x){return x.r<1});window.__nachWrong=wrong.map(function(x){var it=x.item.raw?taskItem(x.item.raw):x.item;it.area=x.item.area;return it});
      return '<div class="center"><div class="big">'+pc+' %</div><p>'+(pc>=80?'Stark! Die Vorlesung sitzt.':pc>=50?'Gute Basis. Schau dir die Lücken unten an.':'Das war noch wackelig. Lies die Punkte unten nochmal in Ruhe.')+'</p></div>'+
       '<div class="grid2">'+Object.keys(A).map(function(k){var p=Math.round(A[k].s/A[k].n*100);return '<div class="card"><div class="muted small">'+k+'</div><div class="kpi">'+p+' %</div><div class="bar '+(p>=80?'ok':'')+'" style="margin-top:6px"><span style="width:'+p+'%"></span></div></div>'}).join('')+'</div>'+
       (wrong.length?'<div class="card" style="margin-top:12px"><b>Deine Lücken ('+wrong.length+')</b><ul class="summary">'+wrong.map(function(x){var it=x.item;return '<li>'+(it.term&&TERM[it.term]?'<b>'+TERM[it.term].t+'</b>: '+TERM[it.term].d:it.area==='Formeln'?it.a:'<b>Aufgabe:</b> '+stripHtml(it.q).slice(0,90)+'… <span class="muted">Ergebnis: '+(it.short||'siehe Lösung')+'</span>')+'</li>'}).join('')+'</ul></div>':'')+
       essentials(l)+
       '<div class="btns" style="justify-content:center;margin-top:12px">'+(wrong.length?'<button class="btn" data-act="nachredo" data-l="'+l.id+'">Lücken nochmal üben</button>':'')+'<button class="btn'+(wrong.length?' ghost':'')+'" data-act="close">Fertig</button></div>'}})}}

/* ================= Dynexite-Eingabe-Training (Merkblatt Mathe I) ================= */
function dynNorm(s){return String(s||'').replace(/\s+/g,'')}
function dynEval(s){s=dynNorm(s);if(!/^[0-9+\-*/().a-z^]*$/.test(s)||/[a-z]/.test(s.replace(/sqrt|exp|ln|abs|sin|cos|tan/g,'')))return NaN;
  try{var js=s.replace(/\^/g,'**').replace(/sqrt/g,'Math.sqrt').replace(/exp/g,'Math.exp').replace(/ln/g,'Math.log').replace(/abs/g,'Math.abs').replace(/sin/g,'Math.sin').replace(/cos/g,'Math.cos').replace(/tan/g,'Math.tan');var v=Function('"use strict";return ('+js+')')();return typeof v==='number'?v:NaN}catch(e){return NaN}}
function dgcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){var t=b;b=a%b;a=t}return a||1}
function dfrac(p,q){if(q<0){p=-p;q=-q}var g=dgcd(p,q);p/=g;q/=g;return q===1?String(p):p+'/'+q}
function dTexFrac(p,q){return q<0?dTexFrac(-p,-q):(p<0?'-':'')+'\\frac{'+Math.abs(p)+'}{'+q+'}'}
function ri(a,b){return a+Math.floor(Math.random()*(b-a+1))}
function rpick(a){return a[Math.floor(Math.random()*a.length)]}
var SQF=[2,3,5,6,7,10,11];
var DYNGEN=[
 function(){var p=ri(1,9)*rpick([1,-1]),q=ri(2,9),k=ri(2,4)*rpick([1,-1]);var P=p*k,Q=q*k;if(dgcd(p,q)!==1)return null;var flip=Math.random()<.5;
   return {tex:'\\frac{'+P+'}{'+Q+'}',ans:dfrac(P,Q),why:'Vollständig kürzen (durch '+Math.abs(k)+'), Minus nach vorn in den Zähler, Nenner positiv. Ganze Zahl ohne /1.',topic:'Brüche'}},
 function(){var a=ri(2,9),b=ri(2,5)*rpick([1,-1]),den=b<0?b:-b;return {tex:'\\frac{'+(a*b)+'}{'+den+'}',ans:dfrac(a*b,den),why:'Das Ergebnis ist eine ganze Zahl: kein Bruch, kein /1, kein +.',topic:'Brüche'}},
 function(){var k=ri(2,6),m=rpick(SQF);return {tex:'\\sqrt{'+(k*k*m)+'}',ans:k+'*sqrt('+m+')',why:'\\('+(k*k*m)+'='+(k*k)+'\\cdot '+m+'\\), also \\(\\sqrt{'+(k*k*m)+'}='+k+'\\sqrt{'+m+'}\\). Zahl vor die Wurzel, mit * verbunden.',topic:'Wurzeln'}},
 function(){var k=ri(2,12);return {tex:'\\sqrt{'+(k*k)+'}',ans:String(k),why:'Die Wurzel geht auf: \\('+k+'^2='+(k*k)+'\\). Also einfach '+k+'.',topic:'Wurzeln'}},
 function(){var a=ri(1,9),b=ri(1,5),c=rpick([2,3,5,7]);var A=a,B=b*c;var g=dgcd(A,B);A/=g;B/=g;var num=(A===1?'':A+'*')+'sqrt('+c+')';var ans=B===1?num:num+'/'+B;
   return {tex:'\\frac{'+a+'}{'+(b===1?'':b+'\\cdot')+'\\sqrt{'+c+'}}',ans:ans,why:'Mit \\(\\sqrt{'+c+'}\\) erweitern: Wurzel kommt in den Zähler, \\(\\sqrt{'+c+'}\\cdot\\sqrt{'+c+'}='+c+'\\). Dann kürzen. Format: Zahl*sqrt(…)/Nenner.',topic:'Wurzeln'}},
 function(){var n=ri(1,9);var f=rpick(['e^{-'+n+'}','\\frac{1}{e^{'+n+'}}']);return {tex:f,ans:'exp(-'+n+')',why:'e hoch etwas immer als exp(…). Und \\(\\frac{1}{e^{'+n+'}}=e^{-'+n+'}\\).',topic:'exp/ln'}},
 function(){var k=ri(-5,6);return rpick([{tex:'\\ln(1)',ans:'0',why:'ln(1) = 0, und Ergebnisse immer ausrechnen.',topic:'exp/ln'},{tex:'\\ln(e^{'+k+'})',ans:String(k),why:'ln und exp heben sich auf: \\(\\ln(e^{'+k+'})='+k+'\\).',topic:'exp/ln'}])},
 function(){var c=ri(1,9),v=rpick(['x','y']);var s=rpick([0,1]);return s?{tex:'|'+v+'|',ans:'abs('+v+')',why:'Betrag immer als abs(…), nie mit |.',topic:'Betrag'}:{tex:'|'+v+'-'+c+'|',ans:'abs('+v+'-'+c+')',why:'Betrag als abs(…), Inhalt in runde Klammern.',topic:'Betrag'}},
 function(){return rpick([{tex:'\\lim_{x\\to\\infty}x^2',ans:'+unendlich',why:'+∞ schreibt man +unendlich (mit Plus!).',topic:'Grenzwerte'},{tex:'\\lim_{x\\to\\infty}(-x^3)',ans:'-unendlich',why:'−∞ schreibt man -unendlich.',topic:'Grenzwerte'},{tex:'\\lim_{x\\to 0}\\frac{1}{x}\\ \\text{(beidseitig)}',ans:'-',why:'Links −∞, rechts +∞: Der Grenzwert existiert nicht. Eingabe: nur ein Minus.',topic:'Grenzwerte'}])},
 function(){var a=ri(2,9),b=ri(2,9);return rpick([{tex:'-'+a+'\\cdot x_2+'+b+'\\cdot x_1',ans:b+'*x1-'+a+'*x2',why:'Variablen aufsteigend sortieren (x1 vor x2), x_1 als x1 schreiben, * zwischen Zahl und Variable.',topic:'Variablen'},{tex:'-1\\cdot x_1',ans:'-x1',why:'Mal −1 wird einfach zu -x1.',topic:'Variablen'},{tex:'-'+a+'+\\sqrt{x}\\cdot '+b,ans:b+'*sqrt(x)-'+a,why:'Vorfaktor vor die Funktion, Konstante dahinter.',topic:'Funktionen'},{tex:'\\sin(\\alpha\\cdot(-'+a+'))',ans:'sin(-'+a+'*alpha)',why:'Zahl vor die Variable, α als alpha, runde Klammern.',topic:'Funktionen'}])}
];
function dynItems(n){var out=[],seen={};for(var k=0;out.length<n&&k<300;k++){var g=DYNGEN[Math.floor(Math.random()*DYNGEN.length)],x=g();if(!x||seen[x.tex])continue;seen[x.tex]=1;
  (function(x){out.push({id:'dyn:'+x.tex,mod:'mathe',type:'typed',inputmode:'text',q:'<div class="small muted">'+esc(x.topic)+' · so tippen, wie Dynexite es will</div><div class="fxbig" style="margin-top:8px">\\['+x.tex+'\\]</div>',
    check:function(inp){return dynNorm(inp)===dynNorm(x.ans)},expect:'<code>'+esc(x.ans)+'</code>',
    hint:function(inp){var a=dynEval(inp),b=dynEval(x.ans);if(!isNaN(a)&&!isNaN(b)&&Math.abs(a-b)<1e-9)return '<div class="fb warn">Der Wert stimmt, aber das Format nicht. In der Prüfung zählt das als falsch!</div>';return ''},
    a:'<p>Richtige Eingabe: <code class="dyn">'+esc(x.ans)+'</code></p><p class="small">'+x.why+'</p>'})})(x)}return out}
function dynTraining(){runItems(dynItems(12),{title:'Eingabe-Training',mode:'quiz',onEnd:function(r){var ok=r.filter(function(x){return x.r===1}).length,pct=Math.round(ok/r.length*100);S.ui.dynBest=Math.max(S.ui.dynBest||0,pct);save();if(pct>=90){confetti();activity(30)}
  return '<div class="center"><div class="big">'+pct+' %</div><p>'+ok+' von '+r.length+' im richtigen Format.</p><div class="btns" style="justify-content:center"><button class="btn" data-act="dyntrain">Neue Runde</button><button class="btn ghost" data-act="close">Fertig</button></div></div>'}})}
function dynSheet(){var b=S.ui.dynBest;
  sheet('<div class="m-mathe"><h2>Dynexite-Eingabe</h2><p class="muted">Im Testat und in der Klausur zählt nur die Eingabe im richtigen Format. Die wichtigsten Eingaberegeln, zusammengefasst nach dem Dynexite-Merkblatt des Instituts:</p>'+
   '<div class="card"><ul class="summary"><li><b>Ganze Zahlen</b> normal: <code>-3</code>, <code>2</code>. Nie <code>+2</code>, <code>2.0</code>, <code>2/1</code>.</li><li><b>Brüche</b> vollständig gekürzt als <code>p/q</code>, Minus in den Zähler: <code>-1/2</code>. Nie <code>3/-6</code> oder <code>-0.5</code>. <b>Nie Dezimalzahlen!</b></li><li><b>Wurzeln</b> vereinfacht: <code>2*sqrt(3)</code> statt <code>sqrt(12)</code>. Nur im Zähler: <code>5*sqrt(2)/6</code>.</li><li><b>e hoch …</b> immer <code>exp(-2)</code>. <b>Betrag</b> <code>abs(x)</code>.</li><li><b>Unendlich</b>: <code>+unendlich</code>, <code>-unendlich</code>. Existiert nicht: <code>-</code>.</li><li><b>Variablen</b> sortiert: <code>10*x1-3*x2</code>, <code>-x1</code>, <code>alpha</code>. Immer <code>*</code> schreiben.</li><li><b>Funktionen</b> mit runden Klammern, Vorfaktor davor, Konstante dahinter: <code>5*sqrt(x)-3</code>, <code>sin(-4*alpha)</code>.</li><li>Alles <b>so weit wie möglich vereinfachen</b>, Klammern nur wenn nötig: <code>x*y*z</code>.</li></ul></div>'+
   '<div class="btns" style="margin-top:12px"><button class="btn block" data-act="dyntrain">'+IC.play+' Training starten (12 Aufgaben)</button></div>'+(b!=null?'<p class="small muted center">Bestwert: '+b+' %</p>':'')+'</div>',{title:'Eingabe-Training'})}

/* ================= Fokus-Timer ================= */
var focusIv=null;
function focusTimer(){
  var mins=S.focusLen||15;
  function pickHtml(){return '<div class="center"><h2>Fokus-Timer</h2><p class="muted">Handy weg, eine Sache, dann Pause.</p><div class="tabs" style="justify-content:center;margin:14px 0">'+[10,15,25].map(function(n){return '<button class="'+(n===mins?'on':'')+'" data-fm="'+n+'">'+n+' min</button>'}).join('')+'</div><button class="btn" id="fgo">'+IC.play+' Start</button></div>'}
  sheet(pickHtml(),{title:'Fokus'});
  function bind(){$$('[data-fm]',layer).forEach(function(b){b.onclick=function(){mins=+b.getAttribute('data-fm');S.focusLen=mins;save();sheet(pickHtml(),{title:'Fokus',replace:true});bind()}});$('#fgo').onclick=run}
  function run(){var end=Date.now()+mins*60000;clearInterval(focusIv);
    sheet('<div class="center"><div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="rbg"/><circle cx="60" cy="60" r="52" class="rfg" id="rfg"/></svg><div class="clock" id="fclk"></div></div><p class="muted">Du schaffst das. Nur bis der Kreis leer ist.</p><button class="btn ghost" data-act="close">Abbrechen</button></div>',{title:'Fokus',replace:true});
    function tick(){var left=Math.max(0,Math.round((end-Date.now())/1000)),c=$('#fclk'),r=$('#rfg');if(!c){clearInterval(focusIv);return}c.textContent=fmtSec(left);r.style.strokeDashoffset=String(326.7*(1-left/(mins*60)));
      if(left<=0){clearInterval(focusIv);activity(15);confetti();sheet('<div class="center"><div class="big">Pause!</div><p>'+mins+' Minuten geschafft. +15 XP. Steh kurz auf, trink was.</p><button class="btn" data-act="close">Fertig</button></div>',{title:'Fokus',replace:true})}}
    tick();focusIv=setInterval(tick,1000)}
  bind();
}

/* ================= Ebene (Sheets) ================= */
var stack=[];
function sheet(html,o){o=o||{};if(o.replace&&stack.length)stack[stack.length-1]={html:html,title:o.title};else stack.push({html:html,title:o.title});drawSheet()}
function drawSheet(){var top=stack[stack.length-1];if(!top){layer.hidden=true;document.body.classList.remove('noscroll');return}
  layer.hidden=false;document.body.classList.add('noscroll');
  layer.innerHTML='<div class="lhead"><div class="wrap"><button class="x" data-act="'+(stack.length>1?'pop':'close')+'" aria-label="'+(stack.length>1?'Zurück':'Schließen')+'">'+(stack.length>1?IC.back:IC.x)+'</button><b class="grow">'+esc(top.title||'')+'</b></div></div><div class="wrap lbody">'+top.html+'</div>';
  layer.scrollTop=0;ts(layer)}
function closeAll(){stack=[];clearInterval(focusIv);drawSheet()}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&stack.length){stack.pop();drawSheet()}});

/* ================= Klicks ================= */
document.addEventListener('change',function(e){var t=e.target;if(t&&t.getAttribute&&t.getAttribute('data-act')==='grp'){S.ui.grp=S.ui.grp||{};S.ui.grp[t.getAttribute('data-k')]=t.value;save();rerender()}});
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-act],b.term,b.fx');if(t&&t.tagName==='SELECT')return;if(!t)return;
  if(t.matches('b.term')){var mid=(t.closest('[class*="m-"]')||{}).className||'';var m=(/m-(\w+)/.exec(mid)||[])[1];var key=findTerm(m,t.textContent);if(key)openTerm(key);else toast('Keine Karte zu „'+esc(t.textContent)+'“');return}
  if(t.matches('b.fx')){openFormula(t.getAttribute('data-f'));return}
  var a=t.getAttribute('data-act');
  if(a==='done'){var id=t.getAttribute('data-id');S.done[id]=!S.done[id];if(S.done[id]){activity(5);if(!reduceMotion)t.classList.add('pop')}save();EV=null;rerender();return}
  if(a==='todo'){var id2=t.getAttribute('data-id');S.todos[id2]=!S.todos[id2];if(S.todos[id2])activity(3);save();rerender();return}
  if(a==='rule'){var r=t.getAttribute('data-id');S.rules[r]=!S.rules[r];save();rerender();return}
  if(a==='learnok'){var f=LEARN_THEN;LEARN_THEN=null;if(f){try{f()}catch(err){console.error(err)}}setTimeout(function(){if(document.getElementById('learnok')){closeAll();toast('Für dieses Thema gibt es gerade keine offenen Aufgaben. Alles gekonnt!');rerender()}},400);return}
  if(a==='setname'){var v=(($('#nm')||{}).value||'').trim().slice(0,30);if(v){S.name=v;save();rerender()}return}
  if(a==='terms'){sheet('<div class="story"><h2>Nutzungsbedingungen</h2><p class="small muted">Stand: 23.10.2026</p><h3 class="sh">1. Angebot</h3><div class="sp">Diese Lern-App ist ein kostenloses, privates Angebot (Betreiber: GitHub-Nutzer swiedzaid-star) für Studierende. Sie ist kein Angebot der RWTH Aachen. Es besteht kein Anspruch auf Verfügbarkeit oder bestimmte Funktionen; die App kann jederzeit geändert oder eingestellt werden.</div><h3 class="sh">2. Keine Gewähr</h3><div class="sp">Inhalte, Termine, Lernpläne und Klausur-Einschätzungen werden sorgfältig erstellt, sind aber ohne Gewähr. Verbindlich sind ausschließlich die Angaben der Hochschule (RWTHonline, Moodle, Lehrstühle). Einschätzungen zu Prüfungen sind Prognosen, keine Zusagen.</div><h3 class="sh">3. Urheberrecht</h3><div class="sp">Texte, Aufgaben, Lösungswege, Grafiken, das Design und das Maskottchen sind urheberrechtlich geschützt. Alle Rechte vorbehalten. Erlaubt ist die Nutzung zum eigenen Lernen. Nicht erlaubt ist ohne schriftliche Zustimmung: Inhalte kopieren, veröffentlichen, weitergeben, verkaufen, automatisiert auslesen (Scraping) oder in andere Apps, Websites oder KI-Trainingsdaten übernehmen.</div><h3 class="sh">4. Haftung</h3><div class="sp">Da die App unentgeltlich ist, haftet der Betreiber nur für Vorsatz und grobe Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit. Für Datenverlust (z. B. durch Löschen der Browserdaten) wird nicht gehaftet; nutze bei Bedarf den Sync oder „Fortschritt kopieren“.</div><h3 class="sh">5. Schlussbestimmungen</h3><div class="sp">Es gilt deutsches Recht. Sollte eine Bestimmung unwirksam sein, bleiben die übrigen wirksam.</div></div>',{title:'Nutzungsbedingungen'});return}
  if(a==='privacy'){sheet('<div class="story"><h2>Datenschutz und Hinweise</h2><h3 class="sh">Was ist das?</h3><div class="sp">Eine private, nicht kommerzielle Lern-App eines Studierenden für das eigene Studium. <b>Kein offizielles Angebot der RWTH Aachen</b> und nicht mit ihr verbunden. Alle Angaben ohne Gewähr; verbindlich sind immer RWTHonline, Moodle und die Lehrstühle.</div><h3 class="sh">Verantwortlich</h3><div class="sp">GitHub-Nutzer <b>swiedzaid-star</b>. Kontakt über das GitHub-Repository dieser App (github.com/swiedzaid-star/Studium-App-Daumen-Gedr-ckt, „Issues“).</div><h3 class="sh">Welche Daten anfallen</h3><div class="sp"><b>Hosting:</b> Die Seite liegt bei GitHub Pages (GitHub Inc., USA). GitHub verarbeitet beim Aufruf technisch nötige Daten wie die IP-Adresse in Server-Logs. Details: GitHub Privacy Statement (docs.github.com, „GitHub General Privacy Statement“).<br><b>Konto und Fortschritt:</b> Die Anmeldung und dein Lernfortschritt laufen über Supabase (Supabase Inc.; Server in Frankfurt, EU). Gespeichert werden E-Mail-Adresse, Passwort (verschlüsselt als Hash), Anmeldezeitpunkte und dein Fortschritt (erledigte Aufgaben, Karteikarten, Pläne, Einstellungen, Vorname, falls angegeben). Zusätzlich liegt eine Kopie im lokalen Speicher deines Browsers, damit die App offline funktioniert. Es gibt keine Registrierung, kein Tracking, keine Werbung und keine Schriften oder Skripte von fremden Servern.</div><h3 class="sh">Deine Rechte</h3><div class="sp">Auskunft, Berichtigung und Löschung deines Kontos samt Fortschritt jederzeit über den Kontakt oben; lokale Daten löschst du über die Browserdaten dieser Seite. Du hast außerdem die Rechte aus der DSGVO (Auskunft, Löschung, Beschwerde bei einer Datenschutz-Aufsichtsbehörde).</div><h3 class="sh">Inhalte</h3><div class="sp">Zusammenfassungen, Erklärungen und Aufgaben sind eigene Texte und eigene Aufgaben (teils angelehnt an Themen und Aufgabentypen der Lehrveranstaltungen). Es werden keine Vorlesungsfolien, Skripte oder Altklausuren der Lehrstühle wiedergegeben. © 2026 swiedzaid-star, alle Rechte vorbehalten (siehe Nutzungsbedingungen). Schriften: Plus Jakarta Sans und JetBrains Mono (SIL Open Font License), Formeln: MathJax (Apache License 2.0), lokal eingebunden.</div></div>',{title:'Datenschutz'});return}
  if(a==='close'){closeAll();rerender();return}
  if(a==='sessdone'){var pp=S.plans[t.getAttribute('data-x')];if(pp){pp.done[t.getAttribute('data-s')]=true;activity(10);save()}closeAll();toast('Abgehakt. Stark!');rerender();return}
  if(a==='pop'){stack.pop();drawSheet();return}
  if(a==='calm'){var dm=+t.getAttribute('data-d');UI.calM+=dm;if(UI.calM<0){UI.calM=11;UI.calY--}if(UI.calM>11){UI.calM=0;UI.calY++}rerender();return}
  if(a==='cald'){UI.calSel=t.getAttribute('data-d');var cd=pd(UI.calSel);UI.calY=cd.getFullYear();UI.calM=cd.getMonth();rerender();return}
  if(a==='calwk'){UI.calSel=ymd(addDays(pd(UI.calSel),+t.getAttribute('data-d')));var cw=pd(UI.calSel);UI.calY=cw.getFullYear();UI.calM=cw.getMonth();rerender();return}
  if(a==='calv'){UI.calView=t.getAttribute('data-v');saveUI();rerender();return}
  if(a==='calf'){var mm=t.getAttribute('data-m');UI.calOff[mm]=!UI.calOff[mm];saveUI();rerender();return}
  if(a==='calw'){UI.calWeekly=t.checked;saveUI();rerender();return}
  if(a==='calg'){UI.calGroups=t.checked;saveUI();rerender();return}
  if(a==='term'){openTerm(t.getAttribute('data-k'));return}
  if(a==='flip'){t.classList.toggle('on');return}
  if(a==='cardgrade'){gradeCard(t.getAttribute('data-k'),t.getAttribute('data-g')==='1');stack.pop();drawSheet();rerender();return}
  if(a==='fx'){openFormula(t.getAttribute('data-f'));return}
  if(a==='part'){openPart(t.getAttribute('data-f'),+t.getAttribute('data-i'));return}
  if(a==='sym'){openSymbol(t.getAttribute('data-s'));return}
  if(a==='step'){var c=t.closest('.ex'),hid=c.querySelector('.steps li[hidden]');if(hid){hid.hidden=false;ts(hid)}if(!c.querySelector('.steps li[hidden]'))t.remove();return}
  if(a==='stepall'){var c2=t.closest('.ex');$$('.steps li',c2).forEach(function(li){li.hidden=false});$$('.btns',c2).forEach(function(b){b.remove()});return}
  if(a==='prep'){var pm=MOD[t.getAttribute('data-m')],pr=prepFor({mod:pm.id,title:t.getAttribute('data-ex')==='1'?'übung':'vorlesung'});if(!pr)return;runPrep(pm,pr);return}
  if(a==='ptopic'){var tid=t.getAttribute('data-t'),ts2=tasksOfTopic(tid).slice().sort(function(a,b){var ra=res(a.id),rb=res(b.id);return ((ra==null?.5:ra)-(rb==null?.5:rb))||(a.level-b.level)});runItems(ts2.slice(0,6).map(taskItem),{title:TOPIC[tid].name,mode:'practice'});return}
  if(a==='read'){S.read[t.getAttribute('data-l')]=true;activity(5);save();rerender();return}
  if(a==='practice'){var l=LECT[t.getAttribute('data-l')],tk=[];topicsOfLecture(l).forEach(function(tp){tk=tk.concat(tasksOfTopic(tp.id))});runItems(shuffle(tk).slice(0,8).map(taskItem),{title:l.title,mode:'practice'});return}
  if(a==='quizredo'){var wr=window.__quizRedo||[];if(wr.length)runItems(termQuestions(wr,termsOf(MOD[t.getAttribute('data-m')])),{title:'Fehler nochmal',mode:'quiz',onEnd:function(r){r.forEach(function(x){if(x.item.term)gradeCard(x.item.term,x.r===1)});var ok=r.filter(function(x){return x.r===1}).length;if(ok===r.length)confetti();return '<div class="center"><div class="big">'+ok+' / '+r.length+'</div><p>'+(ok===r.length?'Jetzt sitzen alle!':'Die falschen kommen in den Karten öfter dran.')+'</p><div class="btns" style="justify-content:center"><button class="btn" data-act="close">Fertig</button></div></div>'}});return}
  if(a==='quiz'){startQuiz({l:t.getAttribute('data-l'),m:t.getAttribute('data-m'),g:t.getAttribute('data-g')});return}
  if(a==='deck'){var lid=t.getAttribute('data-l');if(lid){runDeck(shuffle(LECT[lid].terms),'Karteikarten');return}var md=t.getAttribute('data-m');runDeck(shuffle(t.getAttribute('data-due')?dueCards(md):termsOf(MOD[md])),'Karteikarten '+SHORT[md]);return}
  if(a==='deckkeys'){runDeck(t.getAttribute('data-keys').split('|').map(function(k){return TERM[k]}).filter(Boolean),'Karteikarten');return}
  if(a==='review'){var m3=MOD[t.getAttribute('data-m')];runReview(m3);return}
  if(a==='diag'){startDiag(t.getAttribute('data-x'));return}
  if(a==='learn'){learnSheet([t.getAttribute('data-t')]);return}
  if(a==='runsess'){runSession(t.getAttribute('data-x'),t.getAttribute('data-s'));return}
  if(a==='sess'){var p=S.plans[t.getAttribute('data-x')],sid=t.getAttribute('data-s');if(p){p.done[sid]=!p.done[sid];if(p.done[sid])activity(10);save();rerender()}return}
  if(a==='kr'){kopfrechnen();return}
  if(a==='eye'){var pi=$('#lpw');if(pi){pi.type=pi.type==='password'?'text':'password';t.classList.toggle('on',pi.type==='text')}return}
  if(a==='login'){var em=($('#lmail').value||'').trim(),pw=$('#lpw').value||'';if(!em||!pw){var le=$('#lerr');if(le)le.textContent='E-Mail und Passwort eingeben.';return}t.disabled=true;t.classList.add('busy');login(em,pw).then(function(){toast('Willkommen!');rerender();syncNow(false)}).catch(function(e){t.disabled=false;t.classList.remove('busy');var el=$('#lerr');if(el)el.textContent=/invalid/i.test(e.message)?'E-Mail oder Passwort stimmt nicht.':'Anmeldung fehlgeschlagen: '+e.message});return}
  if(a==='forgot'){var em2=($('#lmail').value||'').trim();if(!em2){toast('Erst die E-Mail eintragen.');return}try{localStorage.setItem('studium-recover',em2)}catch(e){}recover(em2).then(function(){toast('Falls ein Konto existiert, kommt gleich eine E-Mail.')}).catch(function(e){toast('Fehler: '+e.message)});return}
  if(a==='pwset'||a==='pwchange'){var p1=a==='pwset'?($('#pw1').value||''):prompt('Neues Passwort (mind. 12 Zeichen, Groß/Klein, Zahl, Sonderzeichen):'),p2=a==='pwset'?($('#pw2').value||''):p1;if(p1==null)return;if(p1.length<12){toast('Mindestens 12 Zeichen.');return}if(p1!==p2){toast('Die Passwörter stimmen nicht überein.');return}setPassword(p1).then(function(){AUTH.recovery=false;authSave();toast('Passwort gespeichert.');rerender()}).catch(function(e){toast('Fehler: '+e.message)});return}
  if(a==='syncnow'){syncNow(false).then(function(){toast(SY.err?'Problem: '+SY.err:'Synchronisiert.')});return}
  if(a==='logout'){logout();toast('Abgemeldet.');rerender();return}
  if(a==='nach'){runNach(t.getAttribute('data-l'));return}
  if(a==='nachredo'){var its=window.__nachWrong||[];if(its.length)runItems(its,{title:'Lücken nochmal',mode:'practice'});return}
  if(a==='dyn'){dynSheet();return}
  if(a==='dyntrain'){dynTraining();return}
  if(a==='symq'){startSymQuiz(t.getAttribute('data-mode'),t.getAttribute('data-arg'));return}
  if(a==='units'){unitTraining(t.getAttribute('data-lvl'));return}
  if(a==='unitsheet'){unitSheet();return}
  if(a==='fquiz'){formulaQuiz(t.getAttribute('data-m'));return}
  if(a==='focus'){focusTimer();return}
  if(a==='h'){var hs=haeppchen(),x=hs[+t.getAttribute('data-i')];if(!x)return;
    if(x.act==='session')runSession(x.exam,x.sid);else if(x.act==='diag')startDiag(x.exam);else if(x.act==='review'){runReview(MOD[x.mod],x.key)}else if(x.act==='cards'){runDeck(dueCards(),'Fällige Karteikarten',function(){hMark(x.key)})}return}
  if(a==='theme'){var th=t.getAttribute('data-t');S.theme=th==='auto'?null:th;if(S.theme)document.documentElement.setAttribute('data-theme',th);else document.documentElement.removeAttribute('data-theme');save();rerender();return}
  if(a==='export'){var txt=JSON.stringify(S);try{navigator.clipboard.writeText(txt).then(function(){toast('Kopiert! Auf dem anderen Gerät einfügen.')},function(){fallback()})}catch(err){fallback()}function fallback(){var ta=$('#imp');ta.value=txt;ta.select();toast('Text markiert: jetzt kopieren.')}return}
  if(a==='import'){try{var o=JSON.parse($('#imp').value);if(!o||typeof o!=='object')throw 0;S=o;['done','tasks','cards','diag','plans','quiz','rules','todos','days','haeppchen','kr','ui','read','sym','nach','mast'].forEach(function(k){S[k]=S[k]||{}});S.xp=S.xp||0;save();rerender();toast('Fortschritt übernommen.')}catch(err){toast('Das hat nicht geklappt. Bitte den ganzen kopierten Text einfügen.')}return}
});
function runReview(m,hkey){var it=pickFresh(reviewItems(m).map(taskItem),12,4);runItems(it,{title:'Wiederholung '+SHORT[m.id],mode:'practice',onEnd:function(r){hMark(hkey||'rev:'+m.id);activity(20);var okN=r.filter(function(o){return o.r===1}).length;if(okN>=r.length*.8)confetti();return '<div class="center"><div class="big">'+okN+' / '+r.length+'</div><p>Wiederholung geschafft! +20 XP</p><div class="btns" style="justify-content:center"><button class="btn" data-act="close">Fertig</button></div></div>'}})}
function findTerm(m,txt){txt=String(txt||'').trim().toLowerCase();var list=m&&MOD[m]?termsOf(MOD[m]):Object.keys(TERM).map(function(k){return TERM[k]});
  var f=list.find(function(t){return stripHtml(t.t).toLowerCase()===txt})||list.find(function(t){var a=stripHtml(t.t).toLowerCase();return a.indexOf(txt)===0||txt.indexOf(a)===0});return f?f.key:null}

route(false);
setInterval(function(){var n=new Date();if(n.getMinutes()!==NOW.getMinutes()){NOW=n;if((location.hash||'#/heute').indexOf('#/heute')===0&&layer.hidden)rerender()}},30000);

/* Update-Check: neue Version erkennen und Neu-laden anbieten */
var MYVER=(function(){var sc=document.querySelector('script[src*="app.js"]');var m=sc&&sc.getAttribute('src').match(/v=(\d+)/);return m?m[1]:null})(),updShown=false;
function checkUpdate(){if(!MYVER||updShown||!window.fetch)return;fetch('index.html?t='+Date.now(),{cache:'no-store'}).then(function(r){return r.text()}).then(function(h){var m=h.match(/app\.js\?v=(\d+)/);
  if(m&&m[1]!==MYVER){updShown=true;var nav=document.querySelector('.nav');var d=document.createElement('button');d.className='updpill';d.title='Neue Version: tippen zum Laden';d.setAttribute('aria-label','Neue Version laden');d.innerHTML='<span class="ud"></span>↻ Update';(nav||document.body).appendChild(d);
    d.onclick=function(){location.reload()}}}).catch(function(){})}
/* Wenn die App aus dem Hintergrund zurückkommt und gerade nichts offen ist: still neu laden */
document.addEventListener('visibilitychange',function(){if(!document.hidden&&updShown&&layer.hidden)location.reload()});
setTimeout(checkUpdate,4000);setInterval(checkUpdate,5*60000);document.addEventListener('visibilitychange',function(){if(!document.hidden)checkUpdate()});
if('serviceWorker' in navigator&&location.protocol!=='file:'){window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})})}
/* ================= Sync Handy ↔ Laptop (privates GitHub-Gist) ================= */
/* ================= Konto und Sync (Supabase, EU Frankfurt) ================= */
var SB_URL='https://qmbkrqsindnyvqjamsvr.supabase.co',SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtYmtycXNpbmRueXZxamFtc3ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MjkyNTcsImV4cCI6MjEwODUwNTI1N30.FkQVta2pJioXt4bjdKwhNl06FVQVAgS8Bls5JRfwVJU';
function authSave(){try{localStorage.setItem(AUTHKEY,JSON.stringify(AUTH))}catch(e){}}
function sySave(){try{localStorage.setItem(SYNCKEY,JSON.stringify(SY))}catch(e){}}
function loggedIn(){return !!(AUTH.access_token&&AUTH.user)}
function sbFetch(path,opt,noAuth){opt=opt||{};opt.headers=Object.assign({'apikey':SB_KEY,'Content-Type':'application/json'},opt.headers||{});if(!noAuth&&AUTH.access_token)opt.headers['Authorization']='Bearer '+AUTH.access_token;
  return fetch(SB_URL+path,opt).then(function(r){return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null}catch(e){}if(!r.ok){var e=new Error((j&&(j.msg||j.message||j.error_description||j.error))||('Fehler '+r.status));e.status=r.status;throw e}return j})})}
/* Anmeldung aus localStorage neu lesen: ein anderer Tab kann den Refresh-Token schon erneuert haben (Rotation). */
function authReload(){try{var a=JSON.parse(localStorage.getItem(AUTHKEY)||'{}');if(a&&a.access_token)AUTH=a}catch(e){}}
window.addEventListener('storage',function(ev){if(ev.key===AUTHKEY){authReload();if(!loggedIn()){AUTH={};rerender()}}});
function authDrop(msg){AUTH={};authSave();SY.err=msg||'Anmeldung abgelaufen, bitte neu anmelden';sySave();if(layer.hidden)rerender()}
var refreshing=null;
function authRefresh(){authReload();if(!AUTH.refresh_token)return Promise.reject(new Error('nicht angemeldet'));if(refreshing)return refreshing;
  refreshing=sbFetch('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:AUTH.refresh_token})},true).then(function(j){AUTH={access_token:j.access_token,refresh_token:j.refresh_token,exp:(j.expires_at||0)*1000,user:j.user,recovery:AUTH.recovery};authSave()})
    .catch(function(e){ /* 400/401/403 = Refresh-Token ungültig oder abgelaufen: sauber abmelden statt endlos scheitern */
      if(e&&e.status&&e.status<500&&e.status!==429)authDrop();throw e})
    .then(function(v){refreshing=null;return v},function(e){refreshing=null;throw e});
  return refreshing}
function authReady(){authReload();if(!loggedIn())return Promise.reject(new Error('nicht angemeldet'));if(AUTH.exp&&Date.now()>AUTH.exp-60000)return authRefresh();return Promise.resolve()}
/* Anfrage mit Anmeldung: bei 401 einmal erneuern und wiederholen, erst dann abmelden */
function sbAuthed(path,opt){return sbFetch(path,opt).catch(function(e){if(e&&e.status===401&&AUTH.refresh_token)return authRefresh().then(function(){return sbFetch(path,opt)});throw e})}
function login(email,pw){return sbFetch('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:email,password:pw})},true).then(function(j){AUTH={access_token:j.access_token,refresh_token:j.refresh_token,exp:(j.expires_at||0)*1000,user:j.user};authSave()})}
function logout(){var t=AUTH.access_token;AUTH={};authSave();SY={};sySave();if(t)sbFetch('/auth/v1/logout',{method:'POST',headers:{'Authorization':'Bearer '+t}},true).catch(function(){})}
function appUrl(){return location.origin+location.pathname.replace(/index\.html$/,'')}
function recover(email){return sbFetch('/auth/v1/recover?redirect_to='+encodeURIComponent(appUrl()),{method:'POST',body:JSON.stringify({email:email})},true)}
function setPassword(pw){return authReady().then(function(){return sbAuthed('/auth/v1/user',{method:'PUT',body:JSON.stringify({password:pw})})})}
/* Rückkehr vom „Passwort vergessen“-Link. Zwei Formen: #token_hash=…&type=recovery (sicher gegen Mail-Scanner, die App bestätigt den
   Link selbst) oder #access_token=…&type=recovery (Standardvorlage von Supabase). */
(function(){var h=location.hash||'';if(!/type=recovery|token_hash=|access_token=|error_description=/.test(h))return;var q={};h.replace(/^#\/?/,'').split('&').forEach(function(kv){var i=kv.indexOf('=');if(i>0){try{q[decodeURIComponent(kv.slice(0,i))]=decodeURIComponent(kv.slice(i+1))}catch(e){}}});
  history.replaceState(null,'',location.pathname+'#/studium'); /* Token sofort aus der Adresszeile (Verlauf, Screenshots) */
  var bad=function(){setTimeout(function(){toast('Der Link ist ungültig oder abgelaufen. Bitte neu anfordern.')},800)};
  var expect='';try{expect=localStorage.getItem('studium-recover')||''}catch(e){}
  function take(j){var u=j.user;if(!u||!u.email||(expect&&u.email.toLowerCase()!==expect.toLowerCase()))return bad();
    AUTH={access_token:j.access_token,refresh_token:j.refresh_token,exp:j.expires_at?j.expires_at*1000:Date.now()+(+j.expires_in||3600)*1000,user:u,recovery:true};authSave();try{localStorage.removeItem('studium-recover')}catch(e){}rerender()}
  if(q.type!=='recovery'&&!q.error_description)return bad();
  if(q.token_hash){ /* sicherer Weg: der Server bestätigt den Link und liefert Nutzer + Sitzung */
    sbFetch('/auth/v1/verify',{method:'POST',body:JSON.stringify({type:'recovery',token_hash:q.token_hash})},true).then(take).catch(bad)}
  else if(q.access_token){ /* Standardvorlage: Token nur annehmen, wenn der Server ihn als Nutzer dieses Projekts bestätigt */
    sbFetch('/auth/v1/user',{headers:{'Authorization':'Bearer '+q.access_token}},true).then(function(u){take({access_token:q.access_token,refresh_token:q.refresh_token,expires_in:q.expires_in,user:u})}).catch(bad)}
  else if(q.error_description)bad()})();
/* Zusammenführen je Schlüssel: der neuere Zeitstempel gewinnt */
function tsOf(T,sec,k){return (T&&T[sec]&&T[sec][k])||0}
function mergeByTs(L,R){var out={},LT=L._ts||{},RT=R._ts||{},TS={};
  SECTIONS.forEach(function(sec){var a=L[sec]||{},b=R[sec]||{},o={},t={};Object.keys(a).concat(Object.keys(b)).forEach(function(k){if(k in o)return;var ta=tsOf(LT,sec,k),tb=tsOf(RT,sec,k);var useB=(k in b)&&(tb>ta||(!(k in a)&&ta===0));if(useB){if(b[k]!==undefined)o[k]=b[k]}else if(a[k]!==undefined)o[k]=a[k];t[k]=Math.max(ta,tb)});out[sec]=o;TS[sec]=t});
  var sa=LT._s||{},sb=RT._s||{},st={};SCALARS.forEach(function(k){var ta=sa[k]||0,tb=sb[k]||0;out[k]=(k in R)&&(!(k in L)||tb>ta)?R[k]:L[k];st[k]=Math.max(ta,tb)});TS._s=st;
  out._ts=TS;out._v=2;out._mod=Math.max(L._mod||0,R._mod||0);return out}
function applyRemote(R){S=R;SECTIONS.forEach(function(k){S[k]=S[k]||{}});S.xp=S.xp||0;S._ts=S._ts||{};snapInit();
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}if(S.theme)document.documentElement.setAttribute('data-theme',S.theme);if(layer.hidden)rerender()}
var syBusy=false,syTimer=null;
function syncNow(quiet){if(!loggedIn()||syBusy||!navigator.onLine)return Promise.resolve();syBusy=true;var uid=AUTH.user&&AUTH.user.id;
  return authReady().then(function(){return sbAuthed('/rest/v1/progress?select=data,updated_at&user_id=eq.'+uid)}).then(function(rows){
      var R=rows&&rows[0]&&rows[0].data,push=false,fp=JSON.stringify(S._ts||{});stamp();
      if(R&&R._v===2){var M=mergeByTs(S,R);var changedLocal=JSON.stringify(M)!==JSON.stringify(S);var changedRemote=JSON.stringify(M)!==JSON.stringify(R);if(changedLocal){applyRemote(M);if(!quiet)toast('Stand vom anderen Gerät übernommen.')}push=changedRemote}
      else if(R&&!R._v){var M2=mergeByTs(S,Object.assign({},R,{_ts:{}}));applyRemote(M2);push=true}
      else push=true;
      SY.last=Date.now();SY.err=null;sySave();
      if(push)return sbAuthed('/rest/v1/progress',{method:'POST',headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:uid,data:S,updated_at:new Date().toISOString()})})})
  .catch(function(e){if(!loggedIn()){SY.err=SY.err||'Anmeldung abgelaufen, bitte neu anmelden'}else SY.err=(e&&e.status===401)?'Anmeldung abgelaufen, bitte neu anmelden':(e&&/Failed to fetch|NetworkError/.test(String(e.message)))?'kein Internet oder Server nicht erreichbar':String(e.message||e);if(e&&e.status===401&&loggedIn())authDrop();sySave()})
  .then(function(){syBusy=false;var el=$('#systat');if(el)el.innerHTML=syStatus();checkHandoff()})}
function syLater(){if(!loggedIn())return;clearTimeout(syTimer);syTimer=setTimeout(function(){syncNow(true)},4000)}
function syStatus(){if(!loggedIn())return 'Nicht angemeldet';if(SY.err)return '<span class="badc">Problem: '+esc(SY.err)+'</span>';if(!SY.last)return 'Angemeldet, noch nicht synchronisiert';var d=new Date(SY.last);return '<span class="okc">Synchron</span> · zuletzt '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+' Uhr'}
function syncCard(){var u=AUTH.user||{};return '<div class="card"><b>Konto und Geräte-Sync</b><p class="small" style="margin:6px 0">Angemeldet als <b>'+esc(u.email||'')+'</b></p><p class="small" id="systat" style="margin:6px 0">'+syStatus()+'</p><p class="small muted">Fortschritt, Pläne und Einstellungen gleichen sich automatisch ab: beim Öffnen, alle 2 Minuten und kurz nach jeder Änderung. Ohne Internet läuft alles weiter und wird später nachgetragen.</p><div class="btns"><button class="btn sm" data-act="syncnow">Jetzt synchronisieren</button><button class="btn sm ghost" data-act="pwchange">Passwort ändern</button><button class="btn sm ghost" data-act="logout">Abmelden</button></div></div>'}
function vLogin(){var rec=AUTH.recovery,c=(D._counts||{}),nT=0,nF=0;D.mods.forEach(function(m){nT+=(m.tasks||[]).length;nF+=(m.formulas||[]).length});var nM=D.mods.filter(function(m){return m.id!=='spa'&&m.id!=='studium'}).length;
  return '<div class="lg"><div class="lg-sky" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="lg-in">'+
  '<section class="lg-hero"><div class="lg-mark">'+SQSVG+'</div><p class="lg-kick">WiIng Bau · RWTH Aachen · WS 26/27</p><h1>Dein Semester.<br><span>Ein Plan.</span></h1>'+
  '<p class="lg-sub">Vorlesungen als Lerntexte, eigene Aufgaben mit Lösungsweg, Fristen und Lernpläne – auf jedem Gerät derselbe Stand.</p>'+
  '<p class="lg-by">Von RWTH-Studenten für RWTH-Studenten. Gerade: Wirtschaftsingenieurwesen Bau, 1. Semester – weitere Studiengänge folgen.</p>'+
  '<ul class="lg-stats"><li><b>'+nM+'</b><span>Fächer</span></li><li><b>'+nT+'</b><span>Aufgaben</span></li><li><b>'+nF+'</b><span>Formeln</span></li><li><b>∞</b><span>Zufallszahlen</span></li></ul></section>'+
  '<section class="lg-card" aria-label="'+(rec?'Neues Passwort setzen':'Anmelden')+'">'+
  (rec?'<h2>Neues Passwort</h2><p class="small muted">Mindestens 12 Zeichen mit Groß- und Kleinbuchstaben, Zahl und Sonderzeichen.</p>'+
     '<label class="lg-f"><input id="pw1" type="password" placeholder=" " autocomplete="new-password"><span>Neues Passwort</span></label>'+
     '<label class="lg-f"><input id="pw2" type="password" placeholder=" " autocomplete="new-password"><span>Noch einmal</span></label>'+
     '<button class="btn lg-go" data-act="pwset">Speichern '+IC.chev+'</button>'
   :'<h2>Willkommen zurück</h2><p class="small muted">Melde dich an, dann geht es da weiter, wo du aufgehört hast.</p>'+
     '<label class="lg-f"><input id="lmail" type="email" placeholder=" " autocomplete="username" inputmode="email" spellcheck="false"><span>E-Mail</span></label>'+
     '<label class="lg-f"><input id="lpw" type="password" placeholder=" " autocomplete="current-password"><span>Passwort</span><button type="button" class="lg-eye" data-act="eye" aria-label="Passwort anzeigen">'+IC.eye+'</button></label>'+
     '<button class="btn lg-go" data-act="login">Anmelden '+IC.chev+'</button><button class="lg-link" data-act="forgot">Passwort vergessen?</button>')+
  '<p class="small badc" id="lerr" role="alert"></p><p class="lg-foot">Privat. Keine Registrierung. Daten in der EU. <button class="lg-link" data-act="privacy">Datenschutz</button></p></section></div></div>'}
setTimeout(function(){syncNow(true)},1500);setInterval(function(){if(!document.hidden)syncNow(true)},120000);
document.addEventListener('visibilitychange',function(){syncNow(true)});window.addEventListener('online',function(){syncNow(true)});
window.__dbg={S:function(){return S},dynItems:dynItems,dynEval:dynEval,symGaps:symGaps,symKeys:symKeys,D:D,weeklyOn:weeklyOn,pd:pd};
})();
