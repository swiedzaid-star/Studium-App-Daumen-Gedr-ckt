/* TaskGen: Aufgaben mit immer neuen Zahlen.
   Eine Aufgabe mit "gen" bekommt bei jedem Start neue Werte:
   gen = {
     vars:  { name: [w1, w2, ...] (Liste: einer davon) | {"min":..,"max":..,"step":..,"not":[..]} (Bereich) },
     let:   { name: "Ausdruck", ... }   (der Reihe nach ausgerechnet, darf vars und frühere let nutzen)
     check: "Ausdruck"                    (muss true sein, sonst neu würfeln)
   }
   Platzhalter in q, a, short, options:  {{Ausdruck}}  oder  {{Ausdruck:2}} (2 Nachkommastellen, Text)  oder  {{Ausdruck:2t}} (für TeX, Komma als {,})
   Ohne Stellen: bis zu 4 Nachkommastellen, Nullen am Ende weg. Ist das Ergebnis ein Text (z. B. frac(3,4)), wird er direkt eingesetzt.
*/
(function(root){
  function gcd(a,b){a=Math.abs(Math.round(a));b=Math.abs(Math.round(b));while(b){var t=b;b=a%b;a=t}return a||1}
  function rnd(x,n){var p=Math.pow(10,n||0);return Math.round(x*p)/p}
  var H={
    PI:Math.PI,pi:Math.PI,E:Math.E,sqrt:Math.sqrt,abs:Math.abs,pow:Math.pow,exp:Math.exp,ln:Math.log,log10:function(x){return Math.log(x)/Math.LN10},
    log2:function(x){return Math.log(x)/Math.LN2},log:function(x,b){return b?Math.log(x)/Math.log(b):Math.log(x)},floor:Math.floor,ceil:Math.ceil,min:Math.min,max:Math.max,
    round:rnd,sign:Math.sign,gcd:gcd,lcm:function(a,b){return Math.abs(a*b)/gcd(a,b)},
    sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,atan2:Math.atan2,
    sind:function(d){return Math.sin(d*Math.PI/180)},cosd:function(d){return Math.cos(d*Math.PI/180)},tand:function(d){return Math.tan(d*Math.PI/180)},
    asind:function(x){return Math.asin(x)*180/Math.PI},acosd:function(x){return Math.acos(x)*180/Math.PI},atand:function(x){return Math.atan(x)*180/Math.PI},atan2d:function(y,x){return Math.atan2(y,x)*180/Math.PI},
    fact:function(n){var r=1;for(var i=2;i<=n;i++)r*=i;return r},
    binom:function(n,k){var r=1;for(var i=1;i<=k;i++)r=r*(n-k+i)/i;return Math.round(r)},
    isInt:function(x){return Math.abs(x-Math.round(x))<1e-9},
    /* gekürzter Bruch als TeX: frac(6,8) -> \frac{3}{4}; ganze Zahl -> 3; negatives Vorzeichen vorn */
    frac:function(p,q){if(q<0){p=-p;q=-q}var g=gcd(p,q);p=Math.round(p/g);q=Math.round(q/g);if(q===1)return String(p).replace('-','-');return (p<0?'-':'')+'\\frac{'+Math.abs(p)+'}{'+q+'}'},
    /* ungekürzter Bruch als TeX: fracR(6,8) -> \frac{6}{8} */
    fracR:function(p,q){return (p*q<0?'-':'')+'\\frac{'+Math.abs(p)+'}{'+Math.abs(q)+'}'},
    /* Bruch als Text: 3/4 */
    fracT:function(p,q){if(q<0){p=-p;q=-q}var g=gcd(p,q);p=Math.round(p/g);q=Math.round(q/g);return q===1?String(p):p+'/'+q},
    /* Vorzeichen-Helfer für schöne Terme: sgn(3) -> "+ 3", sgn(-3) -> "- 3"; pm(3) -> "+3", pm(-3) -> "-3" */
    sgn:function(x){return (x<0?'- ':'+ ')+fmt(Math.abs(x),null,true)},
    pm:function(x){return (x<0?'-':'+')+fmt(Math.abs(x),null,true)},
    /* Koeffizient vor Variable: coef(1,'x') -> 'x', coef(-1,'x') -> '-x', coef(3,'x') -> '3x' */
    coef:function(c,v){return c===1?v:c===-1?'-'+v:fmt(c,null,true)+v},
    num:function(x,n){return fmt(x,n,false)},tex:function(x,n){return fmt(x,n,true)},
    pick:function(){return arguments[Math.floor(Math.random()*arguments.length)]}
  };
  function fmt(x,dec,isTex){
    if(typeof x==='string')return x;if(typeof x==='boolean')return x?'ja':'nein';
    if(!isFinite(x))return String(x);
    var s;if(dec==null){var r=Math.round(x*1e4)/1e4;s=String(r);if(/e/.test(s))s=r.toFixed(6).replace(/0+$/,'').replace(/\.$/,'')}else s=(Math.round(x*Math.pow(10,dec))/Math.pow(10,dec)).toFixed(dec);
    if(s==='-0')s='0';
    var parts=s.split('.'),ip=parts[0],neg=ip[0]==='-';if(neg)ip=ip.slice(1);
    if(ip.length>4)ip=ip.replace(/\B(?=(\d{3})+(?!\d))/g,isTex?'\\,':'\u2009');
    var out=(neg?'-':'')+ip+(parts[1]?(isTex?'{,}':',')+parts[1]:'');
    return out}
  var cache={};
  function ev(expr,scope){var keys=Object.keys(H).concat(Object.keys(scope)),ck=keys.join(',')+'|'+expr,fn=cache[ck];
    if(!fn)fn=cache[ck]=new Function(keys.join(','),'return ('+expr+');');
    return fn.apply(null,keys.map(function(k){return k in scope?scope[k]:H[k]}))}
  function pickVar(spec){
    if(Array.isArray(spec))return spec[Math.floor(Math.random()*spec.length)];
    if(spec&&spec.list)return spec.list[Math.floor(Math.random()*spec.list.length)];
    if(spec&&spec.min!=null)return range(spec.min,spec.max,spec.step||1,spec.not||[]);
    return spec}
  function range(a,b,st,not){for(var k=0;k<50;k++){var n=Math.floor((b-a)/st+1e-9)+1,v=a+st*Math.floor(Math.random()*n);v=Math.round(v*1e9)/1e9;if(not.indexOf(v)<0)return v}return a}
  function fill(str,sc){if(str==null)return str;return String(str).replace(/\{\{([\s\S]+?)\}\}/g,function(_,inner){var m=inner.match(/^([\s\S]*?)(?::(\d+)(t?))?$/),expr=m[1],dec=m[2]!=null?+m[2]:null,isTex=!!m[3];
      var v=ev(expr,sc);if(typeof v==='number'&&!isFinite(v))throw new Error('nicht endlich: '+expr);if(v===undefined)throw new Error('undefiniert: '+expr);return fmt(v,dec,isTex)})}
  function instance(t,tries){var g=t.gen;if(!g)return null;tries=tries||60;var last;
    for(var k=0;k<tries;k++){try{var sc={};Object.keys(g.vars||{}).forEach(function(n){sc[n]=pickVar(g.vars[n])});
      Object.keys(g.let||{}).forEach(function(n){sc[n]=ev(g.let[n],sc)});
      if(g.check&&!ev(g.check,sc))continue;
      var out={q:fill(t.q,sc),a:fill(t.a,sc),short:fill(t.short,sc)};
      if(t.options){out.options=t.options.map(function(o){return fill(o,sc)});var seen={},dup=false;out.options.forEach(function(o){if(seen[o])dup=true;seen[o]=1});if(dup)continue}
      out.vars=sc;return out}catch(e){last=e}}
    if(last&&root.console)console.warn('TaskGen',t.id,last&&last.message);return null}
  root.TaskGen={instance:instance,fmt:fmt,fill:fill,ev:ev,H:H};
})(typeof window!=='undefined'?window:globalThis);
