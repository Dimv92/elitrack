/*! © 2026 Elitrack. Tous droits réservés. Code, design et méthodes d'analyse protégés par le droit d'auteur (CPI art. L.122-4, L.335-2). Toute copie, reproduction ou réutilisation sans accord écrit est interdite. Version 20261014-0432. */
"use strict";
(function(root,make){
const m=make();
if(typeof module==='object'&&module.exports)module.exports=m;else Object.assign(root,m);
})(typeof window!=='undefined'?window:this,function(){
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toNum=v=>{if(v==null||v==='')return v==null?v:null;const n=typeof v==='number'?v:typeof v==='string'&&/^\s*-?\d+(\.\d+)?\s*$/.test(v)?+v:NaN;return Number.isFinite(n)?n:null;};
const toStr=v=>v==null?v:typeof v==='string'?v:typeof v==='number'||typeof v==='boolean'?String(v):'';
const nums=(o,keys)=>{if(o&&typeof o==='object')keys.forEach(k=>{if(k in o)o[k]=toNum(o[k]);});return o;};
const strs=(o,keys)=>{if(o&&typeof o==='object')keys.forEach(k=>{if(k in o)o[k]=toStr(o[k]);});return o;};
const arr=(o,k,f)=>{if(o&&k in o)o[k]=Array.isArray(o[k])?o[k].filter(x=>x&&typeof x==='object').map(f):[];};
const obj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const RE_DATE=/^\d{4}-\d{2}-\d{2}$/,RE_TIME=/^\d{1,2}:\d{2}$/,RE_ID=/^[\w.:@+-]{1,80}$/;
function wilson(k,n,z=1.645){
if(!(n>0))return[0,1];
const p=k/n,z2=z*z,d=1+z2/n,c=(p+z2/(2*n))/d,h=z*Math.sqrt(p*(1-p)/n+z2/(4*n*n))/d;
return[Math.max(0,c-h),Math.min(1,c+h)];
}
const trust=(k,n,ref=.5)=>{if(!(n>0))return'';const[lo,hi]=wilson(k,n);return lo>ref?'ok':hi<ref?'bad':'';};
const rateTip=(k,n)=>{if(!(n>0))return'Aucune donnée';const[lo,hi]=wilson(k,n);
return`${k}/${n} : 9 chances sur 10 que le vrai taux soit entre ${Math.round(lo*100)} et ${Math.round(hi*100)} %${n<10?' (trop peu de matchs pour conclure)':''}`;};
function nthStats(nights,max=5){
const o=Array.from({length:max},()=>[0,0]);
(nights||[]).forEach(a=>a.forEach((r,i)=>{const s=o[Math.min(i,max-1)];s[0]++;if(r==='W')s[1]++;}));
return o;
}
function nightLimit(st){for(let i=1;i<st.length;i++)if(st[i][0]>=8&&wilson(st[i][1],st[i][0])[1]<.5)return i;return null;}
function lobbyPlace(D,name){
let n=0,sum=0,mvp=0,top=0;
(D||[]).forEach(d=>{
const pl=d.pl||[],me=pl.find(p=>p.n===name);if(!me||pl.length<2)return;
const place=1+pl.filter(p=>p.sc>me.sc).length;n++;sum+=place;if(place===1)mvp++;
if(!pl.some(p=>p!==me&&p.t===me.t&&p.sc>me.sc))top++;
});
return n?{n,place:sum/n,mvp:mvp/n*100,top:top/n*100}:null;
}
function weaponStats(D,name){
const o={},at=w=>o[w]||(o[w]={w,k:0,d:0,fk:0});
(D||[]).forEach(d=>{
const i=(d.pl||[]).findIndex(p=>p.n===name);if(i<0)return;
const first={};
(d.kills||[]).forEach(k=>{const w=k[8]||'Capacité / autre';
if(k[2]===i)at(w).k++;if(k[3]===i)at(w).d++;
if(!first[k[0]]||k[1]<first[k[0]][1])first[k[0]]=k;});
Object.values(first).forEach(k=>{if(k[2]===i)at(k[8]||'Capacité / autre').fk++;});
});
return Object.values(o).sort((a,b)=>b.k-a.k||b.d-a.d);
}
const smooth=(w,n,p0=.5,k=4)=>(w+k*p0)/(n+k);
function weekStart(iso){const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()-(d.getDay()+6)%7);return isoLoc(d);}
function pAgg(rows){
const o={n:0,w:0,k:0,d:0,a:0,acs:null,kd:null,kda:null,hs:null,kast:null,trade:null};
let acs=0,acsN=0,hs=0,sh=0,ka=0,r=0,tr=0,td=0;
(rows||[]).forEach(({p,win})=>{o.n++;if(win)o.w++;o.k+=p.k||0;o.d+=p.d||0;o.a+=p.a||0;
if(p.acs!=null){acs+=p.acs;acsN++;}if(p.shots){hs+=p.hsN||0;sh+=p.shots;}if(p.rounds){ka+=p.kastR||0;r+=p.rounds;}if(p.traded!=null&&p.d){tr+=p.traded;td+=p.d;}});
if(acsN)o.acs=acs/acsN;if(o.d){o.kd=o.k/o.d;o.kda=(o.k+o.a)/o.d;}if(sh)o.hs=hs/sh*100;if(r)o.kast=ka/r*100;if(td)o.trade=tr/td*100;
return o;
}
function agentPick(st,map,ok=()=>true,minN=5){
if(!st||!st.n)return[];
const g=smooth(st.w,st.n,.5,10),mp=(st.maps||{})[map]||{agents:{}};
return Object.entries(st.agents||{}).filter(([a])=>ok(a)).map(([a,v])=>{
const pa=smooth(v.w,v.n,g,10),x=(mp.agents||{})[a]||{n:0,w:0};
return{a,N:v.n,W:v.w,n:x.n,w:x.w,s:smooth(x.w,x.n,pa,12),sure:v.n>=minN};
}).sort((x,y)=>(y.sure-x.sure)||(y.s-x.s)||(y.N-x.N));
}
function stackStats(list){const o={};(list||[]).forEach(([k,w])=>{const s=o[k]||(o[k]=[0,0]);s[0]++;if(w)s[1]++;});return o;}
const LOBBY_F={sc:p=>p.sc,dmg:p=>p.dmg,kd:p=>p.k-p.d,hs:p=>p.sh>=5?p.hs/p.sh:null};
function lobbyPct(D,name,f='sc'){
const g=LOBBY_F[f];let n=0,s=0;
(D||[]).forEach(d=>{
const pl=d.pl||[],me=pl.find(p=>p.n===name),v=me?g(me):null;if(v==null)return;
const o=pl.filter(p=>p!==me).map(g).filter(x=>x!=null);if(o.length<3)return;
n++;s+=o.reduce((a,x)=>a+(x<v?1:x===v?.5:0),0)/o.length;
});
return n?{n,p:s/n*100}:null;
}
function wellImpact(pairs,cut=60,min=3){
const ok=(pairs||[]).filter(x=>x&&x.acs!=null&&x.s!=null),g=ok.filter(x=>x.s>=cut),b=ok.filter(x=>x.s<cut);
if(g.length<min||b.length<min)return null;
const m=a=>a.reduce((s,x)=>s+x.acs,0)/a.length,G=m(g),B=m(b);
return{good:[g.length,G],bad:[b.length,B],diff:G-B};
}
function habitDays(eves,min=2){
const c=[0,0,0,0,0,0,0];
[...new Set(eves||[])].forEach(e=>{const d=new Date(e+'T12:00:00');if(!isNaN(d))c[(d.getDay()+6)%7]++;});
return c.map((n,i)=>n>=min?i:-1).filter(i=>i>=0);
}
function records(rows){
const o={},put=(k,v,m)=>{if(v!=null&&Number.isFinite(v)&&(!o[k]||v>o[k].v))o[k]={v,m};};
(rows||[]).forEach(({m,p})=>{put('k',p.k,m);put('acs',p.acs,m);put('a',p.a,m);if((p.k||0)>=10)put('kd',p.d?p.k/p.d:p.k,m);});
return o;
}
const stepGoal=(cur,target,step)=>cur==null||!(target>0)?null:cur>=target?target:Math.min(target,Math.round((cur+step)*10)/10);
const HOURS=['Avant 21 h','21 h – 23 h','23 h – 1 h','Après 1 h'];
const hourBucket=t=>{if(!/^\d{1,2}:\d{2}$/.test(t||''))return null;const h=+t.split(':')[0];return h>=6&&h<21?0:h>=21&&h<23?1:h===23||h===0?2:3;};
const divOf=t=>!(t>=3)?-1:t>=27?8:Math.floor((t-3)/3);
function pctRank(v,arr){if(v==null||!arr||!arr.length)return null;let b=0;arr.forEach(x=>{b+=x<v?1:x===v?.5:0;});return b/arr.length*100;}
function benchPct(mine,ref,min=20){
const ok=v=>v!=null&&Number.isFinite(v),m=(mine||[]).filter(ok),r=(ref||[]).filter(ok);
if(!m.length||r.length<min)return null;
return m.reduce((s,v)=>s+pctRank(v,r),0)/m.length;
}
function pDetail(d,i){
const pl=(d&&d.pl)||[],me=pl[i];if(!me)return null;
const byR={};(d.kills||[]).forEach(k=>(byR[k[0]]=byR[k[0]]||[]).push(k));
const tm=j=>pl[j]?pl[j].t:null,sz=t=>pl.filter(p=>p.t===t).length||5,S=()=>({r:0,w:0,k:0,d:0,fk:0,fd:0,kast:0});
const o={r:0,side:{A:S(),D:S()},mk:[0,0,0,0,0,0],cl:{1:[0,0],2:[0,0],3:[0,0],4:[0,0],5:[0,0]},fk:0,fd:0,fkW:0,fdW:0,fdTr:0,fdT:[],surv:0};
(d.rounds||[]).forEach((r,ri)=>{
const ks=(byR[ri]||[]).slice().sort((a,b)=>a[1]-b[1]),won=(me.t===1)===(r.w===1);
const side=r.s==='A'||r.s==='D'?(me.t===1?r.s:r.s==='A'?'D':'A'):null,sd=side?o.side[side]:null;
const kills=ks.filter(k=>k[2]===i&&tm(k[3])!==me.t).length,died=ks.find(k=>k[3]===i),ast=ks.some(k=>(k[9]||[]).includes(i));
const tr=!!(died&&died[2]>=0&&ks.some(k=>k[3]===died[2]&&k[1]>=died[1]&&k[1]-died[1]<=3000));
const f=ks[0],fk=!!(f&&f[2]===i&&tm(f[3])!==me.t),fd=!!(f&&f[3]===i),kast=kills>0||ast||!died||tr;
o.r++;if(!died)o.surv++;o.mk[Math.min(5,kills)]++;
if(fk){o.fk++;if(won)o.fkW++;}
if(fd){o.fd++;if(won)o.fdW++;if(tr)o.fdTr++;o.fdT.push(Math.round(f[1]/1000));}
if(sd){sd.r++;if(won)sd.w++;sd.k+=kills;if(died)sd.d++;if(fk)sd.fk++;if(fd)sd.fd++;if(kast)sd.kast++;}
const al={1:sz(1),0:sz(0)},dead=new Set();
for(const k of ks){revOf(k,dead).forEach(x=>{dead.delete(x);if(tm(x)!=null)al[tm(x)]++;});const v=tm(k[3]);if(v!=null)al[v]--;dead.add(k[3]);
if(al[me.t]===1){const x=al[1-me.t];if(x>=1&&!dead.has(i)){const c=o.cl[Math.min(5,x)];c[0]++;if(won)c[1]++;}break;}}
});
return o;
}
function castRates(rows){
const ok=(rows||[]).filter(x=>x&&Array.isArray(x.c)&&x.c.some(v=>v>0)&&x.r>0);if(!ok.length)return null;
const R=ok.reduce((s,x)=>s+x.r,0),per=[0,1,2,3].map(j=>ok.reduce((s,x)=>s+(x.c[j]||0),0)/R);
return{n:ok.length,r:R,per,tot:per.reduce((a,b)=>a+b,0),ultM:ok.reduce((s,x)=>s+(x.c[3]||0),0)/ok.length};
}
function agentMeta(D,map){
const o={};
(D||[]).filter(d=>d&&d.map===map).forEach(d=>{
const us=(d.rounds||[]).filter(r=>r.w===1).length,them=(d.rounds||[]).length-us;
(d.pl||[]).filter(p=>p.t===0&&p.a).forEach(p=>{const s=o[p.a]||(o[p.a]={a:p.a,n:0,w:0});s.n++;if(them>us)s.w++;});
});
return Object.values(o).sort((a,b)=>b.n-a.n||b.w-a.w);
}
function coverage(strats,maps){
const o={};(maps||[]).forEach(m=>o[m]={atk:0,def:0,pistol:0,retake:0,eco:0});
(strats||[]).forEach(s=>{const c=o[s&&s.map];if(!c)return;const t=s.tags||[],pis=t.includes('pistol'),eco=t.includes('éco')||t.includes('anti-éco');
if(pis)c.pistol++;if(eco)c.eco++;if(t.includes('retake'))c.retake++;
if(!pis&&!eco){if(s.side==='atk')c.atk++;else if(s.side==='def')c.def++;}});
return o;
}
const MOVERS=['j1','j2','j3','j4','j5','enemy'];
function copyPhase(items,from,to,mkId){
const there=new Set((items||[]).filter(it=>it.phase===to&&it.t==='util'&&MOVERS.includes(it.kind)&&it.kind!=='enemy').map(it=>it.kind));
return(items||[]).filter(it=>it.phase===from&&it.t==='util'&&MOVERS.includes(it.kind)&&(it.kind==='enemy'||!there.has(it.kind)))
.map(it=>Object.assign({},it,{id:mkId(),phase:to}));
}
const fromCv=(xf,cx,cy)=>!xf?null:[((cy-30)/940-xf[3])/xf[1],((cx-30)/940-xf[2])/xf[0]];
function nearestRegion(cos,x,y){let b=null,bd=Infinity;(cos||[]).forEach(c=>{const dd=Math.hypot(c[2]-x,c[3]-y);if(dd<bd){bd=dd;b=c;}});return b;}
const GUN={Classic:'pistolet',Shorty:'pistolet',Frenzy:'pistolet',Ghost:'pistolet',Sheriff:'pistolet',Bandit:'pistolet',Stinger:'SMG',Spectre:'SMG',Bucky:'pompe',Judge:'pompe',
Bulldog:'fusil',Guardian:'fusil',Phantom:'fusil',Vandal:'fusil',Marshal:'sniper',Outlaw:'sniper',Operator:'sniper',Ares:'mitrailleuse',Odin:'mitrailleuse'};
const revOf=(k,dead)=>[k[3],k[2]].filter((x,j)=>x>=0&&dead.has(x)&&(!j||(x!==k[3]&&!!GUN[k[8]])));
const DBANDS=[10,25],BAND_FR=['Proche (moins de 10 m)','Moyen (10 à 25 m)','Loin (25 m et plus)'];
function duelStats(D,who){
const o={b:[[0,0],[0,0],[0,0]],all:[0,0],op:[0,0],dw:[],dl:[]};
(D||[]).forEach(d=>{
const pl=(d&&d.pl)||[],i=who(d),me=pl[i];if(!me)return;
const first={};(d.kills||[]).forEach(k=>{if(!first[k[0]]||k[1]<first[k[0]][1])first[k[0]]=k;});
(d.kills||[]).forEach(k=>{
const win=k[2]===i;if(!win&&k[3]!==i)return;
const foe=pl[win?k[3]:k[2]];if(!foe||foe.t===me.t||!GUN[k[8]])return;
o.all[0]++;if(win)o.all[1]++;
if(first[k[0]]===k){o.op[0]++;if(win)o.op[1]++;}
if(k[4]==null||k[6]==null)return;
const m=Math.hypot(k[6]-k[4],k[7]-k[5])/100,b=o.b[m<DBANDS[0]?0:m<DBANDS[1]?1:2];
b[0]++;if(win)b[1]++;(win?o.dw:o.dl).push(m);
});
});
return o;
}
function sensHint(ds,cm){
const t=((ds&&ds.b)||[]).map(([n,w])=>n>=15?trust(w,n):''),close=t[0],far=t[2];
const zone=cm==null?'':cm<30?'haute':cm>75?'basse':'ok';
let dir=0,why=close==='bad'&&far!=='bad'?'proche':far==='bad'&&close!=='bad'?'loin':close==='bad'&&far==='bad'?'partout':'';
if(why==='proche')dir=zone==='haute'?0:1;else if(why==='loin')dir=zone==='basse'?0:-1;
else if(zone==='haute'&&why!=='partout')dir=-1;
return{t,zone,dir,why};
}
const r3=v=>Math.round(v*1000)/1000;
const psaStart=s=>[r3(s*.5),r3(s*1.5)];
const psaStep=(pair,pick)=>{const w=pair[pick],mid=r3((pair[0]+pair[1])/2);return pick?[mid,w]:[w,mid];};
function sensHistPush(hist,old,neu,date){
const H=Array.isArray(hist)?hist.slice():[],ok=x=>x&&x.dpi>0&&x.sens>0,same=(a,b)=>a&&b&&a.dpi===b.dpi&&a.sens===b.sens;
if(!ok(neu)||same(old,neu))return H;
if(!H.length&&ok(old))H.push({d:'',dpi:old.dpi,sens:old.sens});
if(H.length>1&&H[H.length-1].d===date)H.pop();
if(same(H[H.length-1],neu))return H;
H.push({d:H.length?date:'',dpi:neu.dpi,sens:neu.sens});
return H.slice(-20);
}
function sensPeriods(hist,games){
const H=(hist||[]).filter(h=>h&&h.sens>0&&h.dpi>0).slice().sort((a,b)=>String(a.d||'').localeCompare(String(b.d||'')));
const P=H.map((h,i)=>({from:h.d||'',to:H[i+1]?H[i+1].d:'',dpi:h.dpi,sens:h.sens,n:0,hs:0,sh:0,acs:[],k:0,de:0}));
(games||[]).forEach(g=>{const p=P.filter(x=>(!x.from||g.date>=x.from)&&(!x.to||g.date<x.to)).pop();if(!p)return;
p.n++;p.hs+=g.hs||0;p.sh+=g.sh||0;if(g.acs!=null)p.acs.push(g.acs);p.k+=g.k||0;p.de+=g.de||0;});
return P.map(p=>Object.assign(p,{hsP:p.sh>=50?p.hs/p.sh*100:null,acsM:p.acs.length?p.acs.reduce((a,b)=>a+b,0)/p.acs.length:null,kd:p.de?p.k/p.de:null}));
}
function meanCmp(a,b){
const A=(a||[]).filter(Number.isFinite),B=(b||[]).filter(Number.isFinite);if(A.length<2||B.length<2)return null;
const m=x=>x.reduce((s,v)=>s+v,0)/x.length,va=(x,mu)=>x.reduce((s,y)=>s+(y-mu)**2,0)/(x.length-1);
const ma=m(A),mb=m(B),se=Math.sqrt(va(A,ma)/A.length+va(B,mb)/B.length);
return{na:A.length,nb:B.length,ma,mb,diff:mb-ma,z:se?(mb-ma)/se:0};
}
function trialVerdict(before,after,minN=8){
const A=after||[],B=before||[];
if(A.length<minN||B.length<minN)return{v:'attente',need:Math.max(0,minN-A.length)};
const hs=meanCmp(B.map(g=>g.hs),A.map(g=>g.hs)),acs=meanCmp(B.map(g=>g.acs),A.map(g=>g.acs));
const zs=[hs,acs].filter(Boolean).map(x=>x.z),up=zs.some(z=>z>=1.64),down=zs.some(z=>z<=-1.64);
return{v:up&&!down?'mieux':down&&!up?'moins':'pareil',hs,acs};
}
function trainEffect(rows){
const R=(rows||[]).filter(x=>x&&Number.isFinite(x.r)),g=f=>meanCmp(R.filter(x=>f(x)&&!x.tr).map(x=>x.r),R.filter(x=>f(x)&&x.tr).map(x=>x.r));
return{all:g(()=>true),first:g(x=>x.first)};
}
const frList=a=>{a=(a||[]).filter(Boolean);return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' et '+a[a.length-1];};
const JOURS=['lundi','mardi','mercredi','jeudi','vendredi','samedi','dimanche'];
const ridNorm=s=>String(s||'').toLowerCase().replace(/\s+/g,'');
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));
const intIn=(v,a,b,d)=>{const n=toNum(v);return n==null?d:clampN(Math.round(n),a,b);};
const strMax=(v,max)=>typeof v==='string'?v.replace(/[\u0000-\u001f]/g,' ').trim().slice(0,max):'';
const isoLoc=d=>new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
function b64uEnc(bytes){
const b=bytes||[];let s='',i=0;
for(;i+2<b.length;i+=3){const n=b[i]<<16|b[i+1]<<8|b[i+2];s+=B64[n>>18&63]+B64[n>>12&63]+B64[n>>6&63]+B64[n&63];}
if(b.length-i===1){const n=b[i]<<16;s+=B64[n>>18&63]+B64[n>>12&63];}
else if(b.length-i===2){const n=b[i]<<16|b[i+1]<<8;s+=B64[n>>18&63]+B64[n>>12&63]+B64[n>>6&63];}
return s;
}
function b64uDec(s){
if(typeof s!=='string'||!/^[A-Za-z0-9_-]*$/.test(s)||s.length%4===1)return null;
const out=[];let buf=0,bits=0;
for(const ch of s){buf=(buf<<6|B64.indexOf(ch))&0xffffff;bits+=6;if(bits>=8){bits-=8;out.push(buf>>bits&255);}}
return new Uint8Array(out);
}
const utf8=s=>new TextEncoder().encode(String(s));
const fromUtf8=b=>new TextDecoder().decode(b);
const LIC_PLANS=['premium','dieu'],RE_LID=/^[A-Za-z0-9-]{4,40}$/;
const licBody=p=>JSON.stringify({v:1,id:p.id,rid:p.rid,plan:p.plan,iat:p.iat,exp:p.exp||'',who:p.who||''});
const licHead=p=>'PH1.'+b64uEnc(utf8(licBody(p)));
function licParse(code){
const m=/^PH1\.([A-Za-z0-9_-]{10,2000})\.([A-Za-z0-9_-]{40,200})$/.exec(String(code||'').replace(/\s+/g,''));
if(!m)return{err:'format'};
const pb=b64uDec(m[1]),sig=b64uDec(m[2]);if(!pb||!sig)return{err:'format'};
let p;try{p=JSON.parse(fromUtf8(pb));}catch(e){return{err:'format'};}
const bad=!obj(p)||p.v!==1||!RE_LID.test(p.id||'')||typeof p.rid!=='string'||!p.rid||p.rid.length>40||!LIC_PLANS.includes(p.plan)
||!RE_DATE.test(p.iat||'')||(p.exp&&!RE_DATE.test(p.exp))||(p.who!=null&&typeof p.who!=='string')||(p.rid==='*'&&p.plan!=='dieu');
return bad?{err:'format'}:{p,head:'PH1.'+m[1],sig};
}
function licCheck(p,rid,today,revoked){
if(!p)return{ok:false,why:'format'};
if((revoked||[]).includes(p.id))return{ok:false,why:'revoquee'};
if(p.rid!=='*'&&p.rid!==ridNorm(rid))return{ok:false,why:'compte'};
if(p.exp&&p.exp<today)return{ok:false,why:'expiree',exp:p.exp};
return{ok:true,plan:p.plan,exp:p.exp||'',days:p.exp?Math.round((Date.parse(p.exp+'T12:00:00Z')-Date.parse(today+'T12:00:00Z'))/864e5):null};
}
const LIC_WHY={format:'Code incomplet ou mal copié.',signature:'Code non reconnu (il n\'a pas été créé par ce site).',compte:'Ce code est lié à un autre Riot ID.',expiree:'Ce code a expiré.',revoquee:'Ce code a été désactivé.',cle:'Le site n\'a pas encore de clé de vérification (réglage du propriétaire).'};
const LIC_DUR={'1m':['1 mois',1],'3m':['3 mois',3],'6m':['6 mois',6],'1a':['1 an',12],vie:['à vie',0]};
function licExp(iat,dur){
const n=(LIC_DUR[dur]||[])[1];if(!n||!RE_DATE.test(iat||''))return'';
const d=new Date(iat+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+n);return d.toISOString().slice(0,10);
}
const jwkPub=k=>obj(k)&&k.kty==='EC'&&k.crv==='P-256'&&/^[A-Za-z0-9_-]{43}$/.test(k.x||'')&&/^[A-Za-z0-9_-]{43}$/.test(k.y||'')?{kty:'EC',crv:'P-256',x:k.x,y:k.y}:null;
const FEATURES={
profil:{n:'Profil, rang, RR et pic',free:true,core:true},
parties:{n:'Tes dernières parties (stats complètes)',free:true,core:true},
agentsCartes:{n:'Stats par agent et par carte',free:true,core:true},
dernier:{n:'Rapport détaillé de ta dernière partie',free:true},
themeAuto:{n:'Interface aux couleurs de ton agent principal',free:true,core:true},
historique:{n:'Historique long : jusqu\'à 100 parties'},
rapports:{n:'Rapport détaillé de chaque partie (rounds, impact, moments clés)'},
visee:{n:'Visée : duels par distance, armes, piste de sensibilité'},
progression:{n:'Progression : courbe RR, semaines, sessions, limite du soir'},
coach:{n:'Coach : ta place dans tes lobbys + priorités chiffrées + exercices'},
position:{n:'Positionnement optimal : tes meilleurs spots et angles, carte par carte'},
strategie:{n:'Stratégie par carte : plan d\'attaque et de défense, économie, agent conseillé, briefing'},
entrainement:{n:'Entraînement : routine du jour avec minuteur, réflexes, sensibilité, plan de la semaine',free:true},
comparer:{n:'Comparer avec un ami'},
meta:{n:'Méta des agents : tier list globale et carte par carte, corrigée du hasard',free:true},
perso:{n:'Personnalisation complète : fonds, polices, couleurs, effets, disposition'},
partage:{n:'Carte de profil à partager (image)'}
};
const PREM_DEF=Object.keys(FEATURES).filter(k=>!FEATURES[k].free);
function featOn(f,plan,cfg){
const F=FEATURES[f];if(!F)return false;
if(F.core||plan==='premium'||plan==='dieu'||(cfg&&cfg.freeAll))return true;
return!(cfg&&Array.isArray(cfg.premium)?cfg.premium:PREM_DEF).includes(f);
}
const PUB_DEF={format:'prohub-public',version:1,nom:'Elitrack',slogan:'Ton tracker perso, à tes couleurs',proxy:'',licKey:null,editeur:'',
achat:{mensuel:'2,99 €',vie:'14,99 €',lien:'',contact:''},freeAll:false,premium:PREM_DEF,annonce:'',maintenance:false,revoked:[],limite:20,maj:''};
const httpsUrl=(v,max=300)=>typeof v==='string'&&v.length<=max&&/^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[^\s"'<>\\`]*)?$/.test(v.trim())?v.trim().replace(/\/+$/,''):'';
const isGoogle=u=>/^https:\/\/script\.google\.com\//.test(u||'');
function proxyUrl(base,path){
if(!isGoogle(base))return base+path;
const i=path.indexOf('?'),p=(i<0?path:path.slice(0,i)).replace(/^\/+/,''),q=i<0?'':path.slice(i+1);
return`${base}?p=${encodeURIComponent(p)}${q?'&'+q:''}`;
}
function pubCfg(raw,base,lock){
const r=obj(raw)?raw:{},b=Object.assign({},PUB_DEF,base||{}),a=obj(r.achat)?r.achat:{},ba=Object.assign({},PUB_DEF.achat,b.achat||{});
const has=k=>Object.prototype.hasOwnProperty.call(r,k),ha=k=>Object.prototype.hasOwnProperty.call(a,k);
const o={format:'prohub-public',version:1,
nom:has('nom')?strMax(r.nom,40)||PUB_DEF.nom:b.nom,slogan:has('slogan')?strMax(r.slogan,120):b.slogan,
proxy:has('proxy')&&!lock?httpsUrl(r.proxy):b.proxy,licKey:has('licKey')&&!lock?jwkPub(r.licKey):jwkPub(b.licKey),editeur:has('editeur')?strMax(r.editeur,120):b.editeur||'',
achat:{mensuel:ha('mensuel')?strMax(a.mensuel,20):ba.mensuel,vie:ha('vie')?strMax(a.vie,20):ba.vie,lien:ha('lien')?httpsUrl(a.lien):ba.lien,contact:ha('contact')?strMax(a.contact,120):ba.contact},
freeAll:has('freeAll')?r.freeAll===true:!!b.freeAll,
premium:has('premium')&&Array.isArray(r.premium)?[...new Set(r.premium.filter(k=>FEATURES[k]&&!FEATURES[k].core))]:(b.premium||PREM_DEF).slice(),
annonce:has('annonce')?strMax(r.annonce,300):b.annonce,maintenance:has('maintenance')?r.maintenance===true:!!b.maintenance,
revoked:has('revoked')&&Array.isArray(r.revoked)?[...new Set(r.revoked.filter(x=>typeof x==='string'&&RE_LID.test(x)))].slice(0,5000):(b.revoked||[]).slice(),
limite:has('limite')?intIn(r.limite,5,40,20):b.limite,maj:has('maj')&&RE_DATE.test(r.maj||'')?r.maj:b.maj};
return o;
}
const scoreOf=v=>obj(v)?toNum(v.rounds_won??v.won??v.score):toNum(v);
function smRow(sm){
const m=(sm&&sm.meta)||{},s=(sm&&sm.stats)||{},T=(sm&&sm.teams)||{};
if(typeof m.id!=='string'||!/^[0-9a-f-]{36}$/i.test(m.id))return null;
const team=String(s.team||'').toLowerCase(),us=scoreOf(T[team]),them=scoreOf(T[team==='red'?'blue':'red']);
if(!/^(red|blue)$/.test(team)||us==null||them==null)return null;
const sh=s.shots||{},dm=s.damage||{},n=v=>toNum(v)||0,ts=Date.parse(m.started_at)||0;
return{id:m.id.toLowerCase(),ts,date:ts?isoLoc(new Date(ts)):'',map:strMax((m.map||{}).name,20)||'?',season:strMax((m.season||{}).short,12),agent:strMax((s.character||{}).name,20)||'?',
tier:n(s.tier),team,us,them,res:us>them?'W':us<them?'L':'D',r:Math.max(1,us+them),
k:n(s.kills),d:n(s.deaths),a:n(s.assists),sc:n(s.score),hs:n(sh.head),bs:n(sh.body),ls:n(sh.leg),dmg:n(dm.made),rec:n(dm.received)};
}
function rowsAgg(rows){
const o={n:0,w:0,l:0,k:0,d:0,a:0,sc:0,r:0,dmg:0,rec:0,hs:0,sh:0,ls:0};
(rows||[]).forEach(x=>{o.n++;if(x.res==='W')o.w++;if(x.res==='L')o.l++;o.k+=x.k;o.d+=x.d;o.a+=x.a;o.sc+=x.sc;o.r+=x.r;o.dmg+=x.dmg;o.rec+=x.rec;o.hs+=x.hs;o.ls+=x.ls;o.sh+=x.hs+x.bs+x.ls;});
return Object.assign(o,{wr:o.n?o.w/o.n*100:null,kd:o.d?o.k/o.d:o.n?o.k:null,kda:o.d?(o.k+o.a)/o.d:o.n?o.k+o.a:null,acs:o.r?o.sc/o.r:null,adr:o.r?o.dmg/o.r:null,
hsP:o.sh?o.hs/o.sh*100:null,lsP:o.sh?o.ls/o.sh*100:null,dd:o.r?(o.dmg-o.rec)/o.r:null,kpr:o.r?o.k/o.r:null});
}
function aggBy(rows,key){
const g={};(rows||[]).forEach(x=>(g[x[key]]=g[x[key]]||[]).push(x));
return Object.entries(g).map(([k,a])=>Object.assign(rowsAgg(a),{key:k,last:Math.max(...a.map(x=>x.ts))})).sort((a,b)=>b.n-a.n||b.last-a.last);
}
function mainAgent(rows,n=30){const a=aggBy((rows||[]).slice().sort((x,y)=>y.ts-x.ts).slice(0,n),'agent');return a.length?a[0].key:null;}
function sessionsOf(rows,gapH=3){
const S=[];(rows||[]).filter(x=>x.ts).slice().sort((a,b)=>a.ts-b.ts).forEach(x=>{const s=S[S.length-1];
if(s&&x.ts-s[s.length-1].ts<=gapH*36e5)s.push(x);else S.push([x]);});
return S;
}
function serieOf(rows){const a=(rows||[]).slice().sort((x,y)=>y.ts-x.ts).filter(x=>x.res!=='D');let n=0;while(n<a.length&&a[n].res===a[0].res)n++;return a.length?{res:a[0].res,n}:null;}
function v4Detail(md,team,nameOf){
const meta=md.metadata||{},players=md.players||[],idx={};
const pl=players.map((p,i)=>{idx[p.puuid]=i;const st=p.stats||{},ac=p.ability_casts||{};
return{n:nameOf?nameOf(p)||'':'',a:(p.agent||{}).name||'?',t:p.team_id===team?1:0,sc:st.score||0,k:st.kills||0,d:st.deaths||0,as:st.assists||0,
hs:st.headshots||0,sh:(st.headshots||0)+(st.bodyshots||0)+(st.legshots||0),lg:st.legshots||0,dmg:(st.damage||{}).dealt||0,rec:(st.damage||{}).received||0,
c:[ac.grenade||0,ac.ability1||0,ac.ability2||0,ac.ultimate||0],tr:(p.tier||{}).id||0,lv:p.account_level||null};});
const tOf=id=>idx[id]==null?null:pl[idx[id]].t;
const rounds=(md.rounds||[]).filter(r=>!/surrender/i.test((r&&r.result)||'')).sort((a,b)=>a.id-b.id),kAll=(md.kills||[]).filter(k=>k&&k.victim);
const kr=[...new Set(kAll.map(k=>k.round))],off=rounds.length&&kr.length?clampN(rounds[0].id-Math.min(...kr),-1,1):0;
const planter=rounds.map(r=>r.plant&&r.plant.player?tOf(r.plant.player.puuid):null);
const vote=(a,b)=>{let s=0;for(let i=a;i<Math.min(b,rounds.length);i++)if(planter[i]!=null)s+=planter[i]===1?1:-1;return s;};
const v1=vote(0,12)-vote(12,24),s1=v1>=0?'A':'D',s2=s1==='A'?'D':'A';
const sideOf=i=>planter[i]!=null?(planter[i]===1?'A':'D'):v1===0?'?':i<12?s1:i<24?s2:((i-24)%2===0?s1:s2);
const size=t=>pl.filter(p=>p.t===t).length||5;
const snap=(locs,extra)=>[...(locs||[]).filter(x=>x&&x.player&&x.location&&idx[x.player.puuid]!=null).map(x=>[idx[x.player.puuid],Math.round(x.location.x),Math.round(x.location.y)]),...(extra||[])];
const rr=rounds.map((r,i)=>{
const load=t=>(r.stats||[]).filter(s=>s.player&&tOf(s.player.puuid)===t).reduce((a,s)=>a+((s.economy||{}).loadout_value||0),0);
const ks=kAll.filter(k=>k.round+off===r.id).sort((a,b)=>(a.time_in_round_in_ms||0)-(b.time_in_round_in_ms||0)),w=r.winning_team===team?1:0,lose=w?0:1;
const e=r.defuse?'defuse':ks.filter(k=>tOf(k.victim.puuid)===lose).length>=size(lose)?'elim':r.plant?'spike':'time';
const f=ks[0],fs=f?snap(f.player_locations,f.location&&idx[f.victim.puuid]!=null?[[idx[f.victim.puuid],Math.round(f.location.x),Math.round(f.location.y)]]:[]):[];
const pLoc=r.plant&&r.plant.location?[Math.round(r.plant.location.x),Math.round(r.plant.location.y)]:null;
const eco=f=>pl.map((p,j)=>{const s=(r.stats||[]).find(x=>x.player&&idx[x.player.puuid]===j),e=s&&s.economy;return e&&typeof e[f]==='number'?Math.round(e[f]/100):-1;});
return{w,s:sideOf(i),ol:load(1),tl:load(0),p:r.plant?(r.plant.site||'?'):'',pu:planter[i]==null?-1:planter[i],pt:r.plant?r.plant.round_time_in_ms||0:0,df:r.defuse?1:0,e,
fs,pl:pLoc,ps:r.plant?snap(r.plant.player_locations):[],lo:eco('loadout_value'),rm:eco('remaining')};
});
const pos=(k,id)=>{const x=(k.player_locations||[]).find(p=>p.player&&p.player.puuid===id);return x&&x.location?x.location:null;};
const kills=kAll.map(k=>{const ri=rounds.findIndex(r=>r.id===k.round+off),vl=k.location||null,kl=k.killer?pos(k,k.killer.puuid):null;
return[ri,k.time_in_round_in_ms||0,k.killer&&idx[k.killer.puuid]!=null?idx[k.killer.puuid]:-1,idx[k.victim.puuid]??-1,
vl?Math.round(vl.x):null,vl?Math.round(vl.y):null,kl?Math.round(kl.x):null,kl?Math.round(kl.y):null,(k.weapon||{}).name||'',(k.assistants||[]).map(a=>idx[a.puuid]).filter(x=>x!=null),
...sightOf(k,vl,kl,p=>idx[p]==null?null:pl[idx[p]].t)];
}).filter(k=>k[0]>=0&&k[3]>=0);
const t0=Date.parse(meta.started_at)||0;
return{id:String(meta.match_id||'').toLowerCase(),v:7,map:(meta.map||{}).name||'?',date:t0?isoLoc(new Date(t0)):'',ts:t0,rounds:rr,kills,pl};
}
function detTrim(d,n){
if(!d||!Array.isArray(d.rounds)||!(n>0)||d.rounds.length<=n||(d.kills||[]).some(k=>k[0]>=n))return d;
return Object.assign({},d,{rounds:d.rounds.slice(0,n)});
}
const SIGHT_DEG=15,SIGHT_M=30;
function sightOf(k,vl,kl,teamOf){
const L=(k.player_locations||[]).filter(p=>p&&p.player&&p.location&&typeof p.view_radians==='number'),vt=teamOf(k.victim.puuid);
if(!vl||!L.length||vt==null)return[];
const aims=(p,T)=>{if(!T)return false;const dx=T.x-p.location.x,dy=T.y-p.location.y;if(Math.hypot(dx,dy)>SIGHT_M*100)return false;
let a=(p.view_radians-Math.atan2(dy,dx))%(2*Math.PI);if(a>Math.PI)a-=2*Math.PI;if(a<-Math.PI)a+=2*Math.PI;return Math.abs(a)<=SIGHT_DEG*Math.PI/180;};
const kid=k.killer&&k.killer.puuid,al=L.filter(p=>teamOf(p.player.puuid)===vt),en=L.filter(p=>p.player.puuid!==kid&&teamOf(p.player.puuid)!=null&&teamOf(p.player.puuid)!==vt);
const na=al.length?Math.round(Math.min(...al.map(p=>Math.hypot(p.location.x-vl.x,p.location.y-vl.y)))/100):-1;
return[en.filter(p=>aims(p,vl)).length,kl?al.filter(p=>aims(p,kl)).length:-1,na];
}
const grp=(a,f)=>a.reduce((o,x)=>{const k=f(x);(o[k]=o[k]||[]).push(x);return o;},{});
function plLines(d){
const nR=d.rounds.length||1,byR=grp(d.kills,k=>k[0]),tm=i=>d.pl[i]?d.pl[i].t:null;
return d.pl.map((p,i)=>{
let kast=0,fk=0,fd=0,mk=0,trd=0;
for(let r=0;r<nR;r++){
const ks=(byR[r]||[]).slice().sort((a,b)=>a[1]-b[1]),died=ks.find(k=>k[3]===i),kills=ks.filter(k=>k[2]===i&&tm(k[3])!==p.t).length,ast=ks.some(k=>(k[9]||[]).includes(i));
const tr=!!(died&&died[2]>=0&&ks.some(k=>k[3]===died[2]&&k[1]>=died[1]&&k[1]-died[1]<=3000));
if(kills||ast||!died||tr)kast++;if(tr)trd++;if(kills>=3)mk++;
if(ks[0]){if(ks[0][2]===i&&tm(ks[0][3])!==p.t)fk++;if(ks[0][3]===i)fd++;}
}
const KPR=p.k/nR,DPR=p.d/nR,APR=p.as/nR,KAST=kast/nR*100,ADR=p.dmg/nR,imp=2.13*KPR+.42*APR-.41;
return{i,p,kast:KAST,adr:ADR,acs:p.sc/nR,hs:p.sh?p.hs/p.sh*100:null,fk,fd,mk,trd,util:p.c.reduce((a,b)=>a+b,0)/nR,
rating:.0073*KAST+.3591*KPR-.5329*DPR+.2372*imp+.0032*ADR+.1587};
});
}
const BUYK=v=>v<5000?'eco':v<15000?'force':'full';
const lgt=p=>Math.log(p/(1-p)),ilgt=x=>1/(1+Math.exp(-x));
function wpFit(D){
const S={},E={},add=(o,k,w)=>{const c=o[k]||(o[k]=[0,0]);c[0]++;if(w)c[1]++;};
(D||[]).forEach(d=>{const byR=grp(d.kills,k=>k[0]),sz=t=>d.pl.filter(p=>p.t===t).length||5;
d.rounds.forEach((r,i)=>[1,0].forEach(t=>{
const won=(r.w===1)===(t===1);if(i!==0&&i!==12)add(E,BUYK(t===1?r.ol:r.tl)+'|'+BUYK(t===1?r.tl:r.ol),won);
let a=sz(t),b=sz(1-t),pl='n';const dead=new Set(),tt=x=>d.pl[x]?d.pl[x].t:null;add(S,`${a}|${b}|n`,won);
(byR[i]||[]).slice().sort((x,y)=>x[1]-y[1]).forEach(k=>{if(r.pt&&k[1]>r.pt&&pl==='n'&&r.pu>=0)pl=r.pu===t?'u':'t';
revOf(k,dead).forEach(x=>{dead.delete(x);if(tt(x)===t)a++;else if(tt(x)===1-t)b++;});
const v=tt(k[3]);if(v===t)a--;else if(v===1-t)b--;dead.add(k[3]);if(a>0&&b>0)add(S,`${a}|${b}|${pl}`,won);});
}));});
return{S,E};
}
function wpProb(M,a,b,pl,ec){
if(a<=0)return pl==='u'?.3:.01;if(b<=0)return pl==='t'?.7:.99;
const prior=ilgt(.75*(a-b)+(pl==='u'?.9:pl==='t'?-.9:0)),c=M.S[`${a}|${b}|${pl}`]||[0,0],ps=(c[1]+6*prior)/(c[0]+6);
return clampN(ilgt(lgt(clampN(ps,.02,.98))+(ec||0)*(a+b)/10),.01,.99);
}
const ecoL=(M,me,op)=>{const c=M.E[BUYK(me)+'|'+BUYK(op)]||[0,0];return lgt(clampN((c[1]+2)/(c[0]+4),.05,.95));};
function flowOf(d,M){
const byR=grp(d.kills,k=>k[0]),tm=i=>d.pl[i]?d.pl[i].t:null,sz=t=>d.pl.filter(p=>p.t===t).length||5;
return d.rounds.map((r,i)=>{
const ec=i===0||i===12?0:ecoL(M,r.ol,r.tl),ks=(byR[i]||[]).slice().sort((x,y)=>x[1]-y[1]),ev=[];
let a=sz(1),b=sz(0),pl='n',p=wpProb(M,a,b,pl,ec);const p0=p;let mx=p,mn=p;
const plant=()=>{pl=r.pu===1?'u':'t';const np=wpProb(M,a,b,pl,ec);ev.push({cat:'plant',d:np-p,pb:p,pa:np,us:r.pu===1});p=np;};
const rvAt=[],early=new Set(),dead=new Set();{const dd=new Set();ks.forEach((k,j)=>{rvAt[j]=revOf(k,dd);rvAt[j].forEach(x=>dd.delete(x));dd.add(k[3]);});}
ks.forEach((k,j)=>{
if(r.pt&&k[1]>r.pt&&pl==='n'&&r.pu>=0)plant();
const rv=rvAt[j].filter(x=>!early.has(x)),vt=tm(k[3]);
if(vt!=null&&(vt===1?a:b)+rv.filter(x=>tm(x)===vt).length===1)for(let j2=j+1;j2<ks.length;j2++){
const x=rvAt[j2].find(y=>tm(y)===vt&&dead.has(y)&&!early.has(y));if(x!=null){early.add(x);rv.push(x);break;}}
if(rv.length){rv.forEach(x=>{dead.delete(x);if(tm(x)===1)a++;else if(tm(x)===0)b++;});
const np=wpProb(M,a,b,pl,ec);ev.push({cat:'rea',d:np-p,pb:p,pa:np});p=np;mx=Math.max(mx,p);mn=Math.min(mn,p);}
dead.add(k[3]);
const v=tm(k[3]),kt=tm(k[2]),st=`${a}v${b}`,n0=[b,a];if(v===1)a--;else if(v===0)b--;
const np=wpProb(M,a,b,pl,ec),cat=!j?'ouverture':pl==='u'?'post':pl==='t'?'retake':(kt===1&&a===1)||(kt===0&&b===1)?'clutch':ks.slice(0,j).some(q=>q[2]===k[3]&&k[1]-q[1]<=3000)?'trade':'mid';
ev.push({cat,d:np-p,pb:p,pa:np,killer:k[2],victim:k[3],ours:kt===1,st:`${st} → ${a}v${b}`,n0,ms:k[1],t:Math.round(k[1]/1000),w:k[8]||''});
p=np;mx=Math.max(mx,p);mn=Math.min(mn,p);
});
if(r.pt&&pl==='n'&&r.pu>=0)plant();
ev.push({cat:'fin',d:(r.w?1:0)-p,pb:p,pa:r.w?1:0,e:r.e});
return{i,r,p0,ev,mx,mn,thrown:!r.w&&mx>=.75,stolen:!!r.w&&mn<=.25};
});
}
function matchSum(d,M,me){
const F=flowOf(d,M),L=plLines(d),cats={},imp={},mine={};
F.forEach(f=>f.ev.forEach(e=>{cats[e.cat]=(cats[e.cat]||0)+e.d;
if(e.killer!=null){const g=e.ours?e.d:-e.d;imp[e.killer]=(imp[e.killer]||0)+g;imp[e.victim]=(imp[e.victim]||0)-g;
if(e.killer===me)mine[e.cat]=(mine[e.cat]||0)+g;if(e.victim===me)mine[e.cat]=(mine[e.cat]||0)-g;}}));
const exp=F.reduce((s,f)=>s+f.p0,0),won=F.filter(f=>f.r.w).length;
const live=e=>e.cat!=='fin'&&e.pa>.03&&e.pa<.97;
const key=F.flatMap(f=>f.ev.filter(e=>live(e)&&(e.killer===me||e.victim===me)).map(e=>({r:f.i,e}))).sort((x,y)=>Math.abs(y.e.d)-Math.abs(x.e.d)).slice(0,5);
const eco={};F.forEach(f=>{if(f.i===0||f.i===12)return;const k=BUYK(f.r.ol)+'|'+BUYK(f.r.tl),e=eco[k]||(eco[k]={n:0,w:0,x:0});e.n++;e.x+=f.p0;if(f.r.w)e.w++;});
const meP=d.pl[me]||{},place=1+d.pl.filter(p=>p.sc>(meP.sc||0)).length,teamTop=!d.pl.some((p,i)=>i!==me&&p.t===meP.t&&p.sc>meP.sc);
return{F,L,me:L[me]||null,won,exp,cats,imp,myImp:imp[me]||0,mine,key,eco,place,teamTop,thrown:F.filter(f=>f.thrown),stolen:F.filter(f=>f.stolen)};
}
function coachPub(s){
const out=[],P=(s&&s.pct)||{},add=(lvl,k,t,why,fix)=>out.push({lvl,k,t,why,fix});
if(!s||!(s.n>=3))return[{lvl:1,k:'data',t:'Données insuffisantes',why:'Il faut au moins 3 parties détaillées.',fix:'Joue quelques parties puis actualise : l\'analyse se fait toute seule.'}];
if(P.hs!=null&&P.hs<40)add(P.hs<25?3:2,'hs','Placement du viseur (HS %)',`Tu fais mieux que ${Math.round(P.hs)} % des joueurs de tes parties.`,'10 min de Deathmatch « tête seulement » + viseur à hauteur de tête en te déplaçant.');
if(s.op&&s.op[0]>=10&&trust(s.op[1],s.op[0])==='bad')add(3,'op','Duels d\'ouverture',`${s.op[1]}/${s.op[0]} gagnés : nettement moins d'un sur deux.`,'Ne prends plus le premier duel « à sec » : demande une flash ou une info avant, ou laisse l\'ouverture au duelliste.');
if(s.fd!=null&&s.fd>.17)add(2,'fd','Premier mort trop souvent',`${Math.round(s.fd*100)} % des rounds, tu es le premier à mourir.`,'Joue le 2e contact : place-toi derrière un coéquipier pour reprendre son duel (trade).');
if(s.tr!=null&&s.tr<15&&s.n>=5)add(1,'tr','Morts non vengées',`Seulement ${Math.round(s.tr)} % de tes morts sont vengées en 3 s.`,'Reste à portée de tes coéquipiers : un duo à 1-2 s d\'écart gagne plus de duels.');
if(P.dmg!=null&&P.dmg<35)add(2,'dmg','Dégâts par round',`Mieux que ${Math.round(P.dmg)} % de tes lobbys seulement.`,'Utilise tes capacités offensives à chaque round et tire dès que tu vois quelqu\'un (spray contrôlé).');
(s.b||[]).forEach((x,i)=>{if(x&&x[0]>=15&&trust(x[1],x[0])==='bad')add(2,'b'+i,`Duels ${BAND_FR[i].toLowerCase()}`,`${x[1]}/${x[0]} gagnés.`,i===0?'Duels proches : mouvement + crosshair à hauteur de tête, essaie un peu plus de sensibilité.':i===2?'Duels longs : arrête-toi avant de tirer, rafales courtes, essaie un peu moins de sensibilité.':'Duels moyens : tap / rafales de 2-3 balles, contre-strafe avant de tirer.');});
if(!out.length)add(1,'ok','Rien de faible à coup sûr','Tes chiffres sont dans la moyenne ou au-dessus de tes lobbys.','Garde ta routine ; travaille ton meilleur point pour le rendre décisif.');
return out.sort((a,b)=>b.lvl-a.lvl).slice(0,5);
}
const RANK_FR=['Non classé','Fer','Bronze','Argent','Or','Platine','Diamant','Ascendant','Immortel','Radiant'];
const rankOf=t=>!(t>=3)?0:t>=27?9:Math.min(8,Math.floor((t-3)/3)+1);
const ROLES=['Duelist','Initiator','Controller','Sentinel'];
const PG_KEYS=['n','r','k','d','a','sc','dmg','rec','hs','sh','kast','fk','fd','trd','trk','surv','mk','cast','cla','clw',
'b0','b0w','b1','b1w','b2','b2w','imp','io','it','im','ic','ip','ir'];
const CAT_KEY={ouverture:'io',trade:'it',mid:'im',clutch:'ic',post:'ip',retake:'ir'};
function pgAll(d,M){
const pl=(d&&d.pl)||[],rounds=(d&&d.rounds)||[],nR=rounds.length;if(!nR||pl.length<2)return[];
const L=plLines(d),byR=grp(d.kills||[],k=>k[0]),tm=j=>pl[j]?pl[j].t:null,sz=t=>pl.filter(p=>p.t===t).length||5;
const S=pl.map((p,i)=>{const s={};PG_KEYS.forEach(k=>{s[k]=0;});PG_OPT.forEach(k=>{s[k]=0;});const l=L[i];
return Object.assign(s,{n:1,r:nR,k:p.k,d:p.d,a:p.as,sc:p.sc,dmg:p.dmg,rec:p.rec,hs:p.hs,sh:p.sh,kast:Math.round(l.kast*nR/100),fk:l.fk,fd:l.fd,trd:l.trd,mk:l.mk,
cast:(p.c||[]).reduce((a,b)=>a+(b||0),0)});});
rounds.forEach((r,ri)=>{
const ks=(byR[ri]||[]).slice().sort((a,b)=>a[1]-b[1]),dead=new Set(),al={1:sz(1),0:sz(0)},cl={};
ks.forEach((k,j)=>{
const ki=k[2],vi=k[3],kt=tm(ki),vt=tm(vi);revOf(k,dead).forEach(x=>{dead.delete(x);if(tm(x)!=null)al[tm(x)]++;});
if(S[ki]&&kt!=null&&vt!=null&&kt!==vt&&ks.slice(0,j).some(q=>q[2]===vi&&tm(q[3])===kt&&k[1]-q[1]<=3000))S[ki].trk++;
if(S[ki]&&S[vi]&&kt!==vt&&GUN[k[8]]&&k[4]!=null&&k[6]!=null){
const m=Math.hypot(k[6]-k[4],k[7]-k[5])/100,b='b'+(m<DBANDS[0]?0:m<DBANDS[1]?1:2);
S[ki][b]++;S[ki][b+'w']++;S[vi][b]++;}
if(vt!=null){al[vt]--;dead.add(vi);}
[0,1].forEach(t=>{if(cl[t]||al[t]!==1||al[1-t]<1)return;cl[t]=1;
const x=pl.findIndex((p,y)=>p.t===t&&!dead.has(y));if(S[x]){S[x].cla++;if((r.w===1)===(t===1))S[x].clw++;}});
});
S.forEach((s,i)=>{if(!dead.has(i))s.surv++;});
});
const F=flowOf(d,M);
F.forEach(f=>f.ev.forEach(e=>{const c=CAT_KEY[e.cat];if(!c||e.killer==null)return;
[e.killer,e.victim].forEach(x=>{const s=S[x];if(!s)return;const t=tm(x),g=t===1?e.d:-e.d;
s[t===0&&c==='ip'?'ir':t===0&&c==='ir'?'ip':c]+=g;s.imp+=g;});}));
if(rounds.some(r=>Array.isArray(r.fs))){S.forEach(s=>{s.rE=nR;});deathsOf(d,M,F).forEach(e=>{const s=S[e.x];if(!s)return;s['e_'+e.tag]++;if(e.c)s['e_'+e.c]++;});}
if((d.v||0)>=7){S.forEach(s=>{s.r7=nR;});ecoDesync(d).forEach(e=>{const s=S[e.x];if(!s)return;s['e_'+e.k]++;s.dsr++;if(e.w)s.dsw++;});}
return S;
}
const ECO_P=39,ECO_E=20;
const ECO_DEF={
bs:{t:'Tu achètes seul pendant que ton équipe économise',fix:'Quand ton équipe économise, garde ton argent aussi : un achat seul gagne rarement le round et retarde le prochain achat commun.'},
ss:{t:'Tu économises seul alors que ton équipe achète',fix:'Ton équipe achète et tu as les crédits : achète avec elle (au minimum Spectre + bouclier). À 4 armés contre 5, le round part mal.'}
};
function ecoDesync(d){
const pl=(d&&d.pl)||[],byR=grp((d&&d.kills)||[],k=>k[0]),out=[];
((d&&d.rounds)||[]).forEach((r,i)=>{if(i===0||i===12||!Array.isArray(r.lo)||!Array.isArray(r.rm))return;
const dead=new Set((byR[i-1]||[]).map(k=>k[3]));
pl.forEach((p,x)=>{const lo=r.lo[x];if(!(lo>=0))return;
const m=pl.map((q,j)=>j).filter(j=>j!==x&&pl[j].t===p.t&&r.lo[j]>=0);if(m.length<3)return;
const nE=m.filter(j=>r.lo[j]<ECO_E).length,nP=m.filter(j=>r.lo[j]>=ECO_P).length,w=(r.w===1)===(p.t===1);
if(lo>=ECO_P&&nE>=m.length-1&&dead.has(x))out.push({r:i,x,k:'bs',w});
else if(lo<ECO_E&&nP>=m.length-1&&lo+Math.max(0,r.rm[x])>=ECO_P)out.push({r:i,x,k:'ss',w});});
});
return out;
}
function ecoAgg(D){
const me={bs:[],ss:[]},ot={bs:0,ss:0};let rMe=0,rOt=0,n=0,dW=0,dN=0;
(D||[]).forEach(d=>{if((d.v||0)<7)return;const i=(d.pl||[]).findIndex(p=>p.n==='moi'),nR=(d.rounds||[]).length;if(i<0||!nR)return;
n++;rMe+=nR;rOt+=nR*(d.pl.length-1);
ecoDesync(d).forEach(e=>{dN++;if(e.w)dW++;if(e.x===i)me[e.k].push({id:d.id,map:d.map,ts:d.ts,r:e.r,w:e.w});else ot[e.k]++;});});
const rows=Object.keys(ECO_DEF).map(k=>{const a=me[k].length,rate=rMe?a/rMe*100:null,ref=rOt?ot[k]/rOt*100:null,exp=ref==null?null:ref*rMe/100;
const z=exp>0?(a-exp)/Math.sqrt(exp):0;
return{k,t:ECO_DEF[k].t,fix:ECO_DEF[k].fix,n:a,rate,ref,extra:rate!=null&&ref!=null?rate-ref:0,sure:a>=3&&z>=1.645,won:me[k].filter(x=>x.w).length,ex:me[k].sort((x,y)=>y.ts-x.ts).slice(0,4)};});
return{n,rounds:rMe,wr:dN?dW/dN*100:null,dN,rows};
}
function agentAdd(B,d,skip){
B.g=B.g||{};const nR=((d&&d.rounds)||[]).length;if(!nR)return B;
(d.pl||[]).forEach((p,i)=>{if((skip&&skip(p,i))||!p.a||!Array.isArray(p.c))return;const rk=rankOf(p.tr);
[`*|${p.a}`].concat(rk?[`${rk}|${p.a}`]:[]).forEach(key=>{const o=B.g[key]||(B.g[key]={n:0,r:0,c:[0,0,0,0]});o.n++;o.r+=nR;p.c.forEach((v,j)=>{o.c[j]+=v||0;});});});
return B;
}
function agentUse(D,B,rk,agent,min=30){
const G=(D||[]).map(d=>{const p=(d.pl||[]).find(q=>q.n==='moi');return p&&p.a===agent&&Array.isArray(p.c)?{r:d.rounds.length,c:p.c}:null;}).filter(x=>x&&x.r);
if(G.length<3)return null;
const src=Array.isArray(B)?B:[B],ref=r=>{for(const b of src){const o=b&&b.g&&b.g[`${r}|${agent}`];if(o&&o.n>=(b.local?Math.min(min,15):min))return o;}return null;};
const up=rk>=1&&rk<9?rk+1:0,A=rk?ref(rk):null,U=up?ref(up):null,R=G.reduce((s,g)=>s+g.r,0);
const ab=[0,1,2,3].map(j=>{const v=G.reduce((s,g)=>s+(g.c[j]||0),0)/R,m=R/G.length;
const se=Math.sqrt(G.reduce((s,g)=>s+((g.c[j]||0)-v*g.r)**2,0)/(G.length*(G.length-1)))/m;
const a=A?A.c[j]/A.r:null,u=U?U.c[j]/U.r:null,cmp=u!=null?u:a;
return{j,me:v,se,ref:a,up:u,low:cmp!=null&&v<cmp*.8&&(cmp-v)>=1.645*se};});
return{agent,n:G.length,rk,up,ab,refN:A?A.n:0,upN:U?U.n:0};
}
function benchAdd(B,d,M,roleOf,skip,S0){
const S=S0||pgAll(d,M);B.c=B.c||{};B.n=(B.n||0)+1;
S.forEach((s,i)=>{const p=d.pl[i],rk=rankOf(p.tr);if(!rk||(skip&&skip(p,i)))return;const ro=roleOf(p.a),keys=[`${rk}|*`,'*|*'];
if(ROLES.includes(ro))keys.push(`${rk}|${ro}`,`*|${ro}`);
keys.forEach(key=>{const c=B.c[key]||(B.c[key]={});PG_KEYS.concat(PG_OPT).forEach(k=>{c[k]=(c[k]||0)+(s[k]||0);});});});
return agentAdd(B,d,skip);
}
function benchClean(raw){
if(!obj(raw)||raw.format!=='elitrack-bench'||raw.v!==1||!obj(raw.c))return null;
const c={};Object.entries(raw.c).slice(0,100).forEach(([k,v])=>{if(!/^([1-9]|\*)\|(\*|Duelist|Initiator|Controller|Sentinel)$/.test(k)||!obj(v))return;
const o={};for(const f of PG_KEYS){if(typeof v[f]!=='number'||!Number.isFinite(v[f]))return;o[f]=v[f];}
PG_OPT.forEach(f=>{if(typeof v[f]==='number'&&Number.isFinite(v[f])&&v[f]>=0)o[f]=v[f];});if(o.n>=1&&o.r>=1)c[k]=o;});
const g={};Object.entries(obj(raw.g)?raw.g:{}).slice(0,400).forEach(([k,v])=>{if(!/^([1-9]|\*)\|[A-Za-z][A-Za-z/ ]{1,11}$/.test(k)||!obj(v))return;
const N=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;if(N(v.n)&&N(v.r)&&v.n>=1&&v.r>=1&&Array.isArray(v.c)&&v.c.length===4&&v.c.every(N))g[k]={n:v.n,r:v.r,c:v.c.slice()};});
const cnt=(m,re)=>{const o={};Object.entries(obj(m)?m:{}).forEach(([k,v])=>{if(re.test(k)&&Array.isArray(v)&&v.length===2&&v.every(x=>Number.isInteger(x)&&x>=0)&&v[1]<=v[0])o[k]=v;});return o;};
const M=obj(raw.M)?{S:cnt(raw.M.S,/^[1-5]\|[1-5]\|[nut]$/),E:cnt(raw.M.E,/^(eco|force|full)\|(eco|force|full)$/)}:null;
const day=v=>RE_DATE.test(v||'')?v:'';
return{format:'elitrack-bench',v:1,local:false,maj:day(raw.maj),du:day(raw.du),au:day(raw.au),region:strMax(raw.region,10),matches:intIn(raw.matches,0,1e7,0),c,g,M:M&&Object.keys(M.S).length?M:null};
}
function benchRef(B,rk,role,min=40,noRole){
if(Array.isArray(B)){for(const b of B){const r=benchRef(b,rk,role,min,noRole);if(r)return r;}return null;}
const C=(B&&B.c)||{},ok=k=>C[k]&&C[k].n>=(B.local?Math.min(min,25):min)?C[k]:null;
if(role&&ok(`${rk}|${role}`))return{c:C[`${rk}|${role}`],lvl:'exact',src:B};
if(B&&B.local&&!noRole&&role&&ok(`*|${role}`))return{c:C[`*|${role}`],lvl:'role',src:B};
return ok(`${rk}|*`)?{c:C[`${rk}|*`],lvl:'rang',src:B}:null;
}
const MET={imp:['imp','r',1],io:['io','r',1],it:['it','r',1],im:['im','r',1],ic:['ic','r',1],ip:['ip','r',1],ir:['ir','r',1],
opW:['fk',s=>s.fk+s.fd,100],fdr:['fd','r',100],hsP:['hs','sh',100],adr:['dmg','r',1],kast:['kast','r',100],trP:['trd','d',100],trk:['trk','r',100],
surv:['surv','r',100],cast:['cast','r',1],clW:['clw','cla',100],b0W:['b0w','b0',100],b1W:['b1w','b1',100],b2W:['b2w','b2',100]};
Object.keys(ECO_DEF).forEach(k=>{MET['e_'+k]=['e_'+k,'r7',100];});
const metF=f=>typeof f==='function'?f:s=>s[f]||0;
const metV=(c,k)=>{const m=MET[k];if(!c||(typeof m[0]==='string'&&PG_OPT.includes(m[0])&&!(m[0]in c)))return null;const den=metF(m[1])(c);return den>0?metF(m[0])(c)/den*m[2]:null;};
function metSE(G,k){
const m=MET[k],nf=metF(m[0]),df=metF(m[1]),n=(G||[]).length;let N=0,Dn=0;(G||[]).forEach(g=>{N+=nf(g);Dn+=df(g);});
if(!(Dn>0))return{v:null,se:null,n,den:0};
const R=N/Dn;if(n<3)return{v:R*m[2],se:null,n,den:Dn};
const ss=G.reduce((s,g)=>s+(nf(g)-R*df(g))**2,0);
return{v:R*m[2],se:Math.sqrt(ss/(n*(n-1)))/(Dn/n)*m[2],n,den:Dn};
}
function refMix(B,G,rk,k,min,noRole){
const df=metF(MET[k][1]);let W=0,S=0;const lv={};
(G||[]).forEach(g=>{const w=df(g);if(!(w>0))return;const r=benchRef(B,rk,g.ro,min,noRole),v=r?metV(r.c,k):null;if(v==null)return;W+=w;S+=v*w;lv[r.lvl]=1;});
return W>0?{v:S/W,lvl:Object.keys(lv)}:null;
}
const COACH_RULES={
op:{m:'opW',dir:1,min:15,t:'Duels d\'ouverture gagnés',fix:'Ne prends plus le premier duel « à sec » : demande une info ou une flash avant, ou laisse l\'ouverture à ton duelliste.'},
fd:{m:'fdr',dir:-1,min:0,t:'Rounds où tu meurs en premier',fix:'Joue le 2e contact : place-toi juste derrière un coéquipier pour reprendre son duel.'},
hs:{m:'hsP',dir:1,min:200,t:'Balles dans la tête',fix:'10 min de Deathmatch « tête seulement » et viseur toujours à hauteur de tête quand tu te déplaces.'},
adr:{m:'adr',dir:1,min:0,t:'Dégâts par round',fix:'Tire dès que tu vois un ennemi (spray contrôlé) et utilise tes capacités qui font des dégâts.'},
b0:{m:'b0W',dir:1,min:15,t:'Duels proches gagnés (moins de 10 m)',fix:'De près : viseur à hauteur de tête, rafales courtes, bouge entre deux rafales.'},
b1:{m:'b1W',dir:1,min:15,t:'Duels moyens gagnés (10 à 25 m)',fix:'À moyenne distance : contre-strafe avant de tirer, rafales de 2-3 balles.'},
b2:{m:'b2W',dir:1,min:15,t:'Duels de loin gagnés (25 m et plus)',fix:'De loin : arrête-toi complètement, une balle à la fois, ou évite ces duels sans Vandal / Operator.'},
tr:{m:'trP',dir:1,min:20,t:'Tes morts vengées en 3 s',fix:'Reste à 1-2 s d\'un coéquipier et annonce ta position avant un duel : seul, ta mort ne rapporte rien.'},
trk:{m:'trk',dir:1,min:0,t:'Coéquipiers que tu venges',fix:'Quand un allié meurt devant toi, reprends l\'angle tout de suite : le tueur est souvent à découvert ou en train de recharger.'},
clW:{m:'clW',dir:1,min:8,t:'Clutchs gagnés',fix:'En clutch : joue le temps et le spike, isole les duels un par un, pas de peek au hasard.'},
surv:{m:'surv',dir:1,min:0,t:'Rounds où tu survis',fix:'Après ton action, recule et garde ta vie : un joueur vivant compte en post-plant et pour l\'économie.'},
kast:{m:'kast',dir:1,min:0,t:'KAST (kill, assist, survie ou mort vengée)',fix:'Sois utile à chaque round : une assist ou une survie vaut mieux qu\'un duel perdu seul.'},
cast:{m:'cast',dir:1,min:0,t:'Capacités utilisées par round',fix:'Utilise tes capacités à chaque round (info, flash, smoke, piège) : gardées, elles ne servent à rien.'}
};
const COACH_CATS=[
{k:'io',t:'Ouvertures (premier duel du round)',rules:['op','fd','b1','b2','b0','hs'],fix:'Prends tes ouvertures avec une info ou une capacité, jamais à sec.'},
{k:'im',t:'Duels en milieu de round',rules:['hs','adr','b0','b1','b2','cast'],fix:'Joue tes duels avec tes capacités et à la bonne distance pour ton arme.'},
{k:'it',t:'Trades (venger un allié, être vengé)',rules:['tr','trk','kast'],fix:'Joue à deux : reste à portée de reprise de tes coéquipiers.'},
{k:'ic',t:'Clutchs (dernier en vie)',rules:['clW','surv'],fix:'En clutch : le temps et le spike d\'abord, un duel à la fois.'},
{k:'ip',t:'Après votre plant (post-plant)',rules:['surv','kast'],fix:'Après le plant : joue loin du spike, avec tes coéquipiers, et laisse l\'ennemi venir.'},
{k:'ir',t:'Retakes (après leur plant)',rules:['trk','cast','hs'],fix:'En retake : regroupez-vous et entrez ensemble avec vos capacités.'}
];
function coachV2(G,B,rk,opt){
const o=opt||{},min=o.min||40,n=(G||[]).length,Z=1.645;
if(n<3)return{n,cats:[],strong:[],items:[{lvl:1,k:'data',t:'Données insuffisantes',fix:'Il faut au moins 3 parties détaillées : joue quelques parties puis actualise.',causes:[]}]};
const rpg=G.reduce((s,g)=>s+g.r,0)/n,up=rk>=1&&rk<9?rk+1:0;
const cmp=k=>{const me=metSE(G,k),ref=rk?refMix(B,G,rk,k,min):null,hi=up?refMix(B,G,up,k,min,true):null;
return{k,me:me.v,se:me.se,den:me.den,ref:ref?ref.v:null,up:hi?hi.v:null,lvl:ref?ref.lvl:[]};};
const cats=COACH_CATS.map(c=>{const x=cmp(c.k),gap=x.me!=null&&x.ref!=null?x.me-x.ref:null;
return Object.assign(x,{t:c.t,fix:c.fix,rules:c.rules,cost:gap==null?null:-gap*rpg,costUp:x.me!=null&&x.up!=null?(x.up-x.me)*rpg:null,
sure:gap!=null&&x.se!=null&&Math.abs(gap)>=Z*x.se});});
const cause=id=>{const R=COACH_RULES[id],x=cmp(R.m);if(x.me==null||x.ref==null||x.den<R.min||(x.me-x.ref)*R.dir>=0)return null;
const z=x.se==null?0:x.se>0?Math.abs(x.me-x.ref)/x.se:Infinity;return Object.assign(x,{id,t:R.t,fix:R.fix,z,sure:z>=Z});};
const items=cats.filter(c=>c.cost!=null&&c.cost>=.15).map(c=>{const cs=c.rules.map(cause).filter(Boolean).sort((a,b)=>b.z-a.z).slice(0,2);
return{lvl:c.sure?(c.cost>=.5?3:2):1,k:cs[0]?cs[0].id:c.k,cat:c.k,t:c.t,cost:c.cost,costUp:c.costUp,sure:c.sure,causes:cs,fix:cs[0]?cs[0].fix:c.fix};})
.sort((a,b)=>(b.sure-a.sure)||b.cost-a.cost).slice(0,5);
if(!items.length)items.push({lvl:1,k:'ok',t:'Aucune phase ne te coûte de rounds à coup sûr',fix:'Garde ta routine et travaille ton point fort pour en faire une arme.',causes:[]});
const strong=cats.filter(c=>c.cost!=null&&c.cost<=-.15&&c.sure).sort((a,b)=>a.cost-b.cost);
const next=up?RANK_METS.map(([k,t,dir=1])=>{const x=cmp(k);return x.me==null||x.ref==null||x.up==null?null
:Object.assign(x,{t,dir,below:dir>0?x.me<x.up:x.me>x.up,sure:x.se!=null&&Math.abs(x.me-x.up)>=Z*x.se});}).filter(Boolean):[];
return{n,rpg,rk,up,tot:cmp('imp'),cats,items,strong,next};
}
const RANK_METS=[['hsP','Balles dans la tête'],['trP','Tes morts vengées en 3 s'],['trk','Rounds où tu venges un coéquipier'],['cast','Capacités utilisées par round'],
['e_seul','Morts loin de tes coéquipiers (aucun à moins de 15 m), pour 100 rounds',-1]];
const ERR_ISO=15,ERR_TRADE=3000;
const ERR_DEF={
ouvSeul:{t:'Première mort du round, loin de tes coéquipiers',fix:'N\'entre pas seul : avance avec un coéquipier juste derrière toi (1 à 2 secondes), ou après une capacité (flash, info).',
fixD:'Seul sur ton angle, tu meurs en premier : change de position d\'un round à l\'autre et recule après ton premier tir au lieu de rester.'},
ouv:{t:'Première mort du round, non vengée',fix:'Ne prends pas le premier duel sans info ni capacité, et vérifie qu\'un coéquipier peut te venger.'},
post:{t:'Mort après le plant du spike, alors que vous n\'étiez pas en infériorité',fix:'Après le plant, c\'est à eux de venir : reste loin du spike, à couvert, et laisse le temps passer.'},
avant:{t:'Mort alors que ton équipe était plus nombreuse',fix:'Quand vous êtes plus nombreux (4 contre 3, 3 contre 2…), ne cherche pas le duel : restez groupés et laissez-les venir.'},
notr:{t:'Mort non vengée',fix:'Reste assez près d\'un coéquipier pour qu\'il puisse te venger (il doit voir ton tueur dans les 3 secondes). Dis où tu vas avant de sortir.'}
};
const ERR_KEYS=Object.keys(ERR_DEF);
ERR_KEYS.forEach(k=>{MET['e_'+k]=['e_'+k,'rE',100];});
const ERR_CAUSE={
xf:{t:'Pris entre deux ennemis',d:'un deuxième ennemi te visait déjà',fix:'Avant de sortir, bloque un des deux angles (smoke, flash, mur) pour n\'affronter qu\'un ennemi à la fois. Un « jiggle peek » (sortir une demi-seconde puis rentrer) permet de compter les ennemis.'},
seul:{t:'Mort loin de tes coéquipiers (aucun à moins de 15 m)',d:'aucun coéquipier n\'était à moins de 15 m',fix:'Reste à 5-10 m d\'un coéquipier. Au-delà de 25 m, à peine 3 % des morts sont vengées.'},
nocov:{t:'Coéquipier proche, mais qui ne visait pas ton tueur',d:'un coéquipier était proche mais regardait ailleurs',fix:'Avant de sortir, dis « je peek, couvre-moi » : ton coéquipier surveille l\'angle d\'où on peut te tuer. Quand quelqu\'un te couvre, ta mort est vengée 6 fois plus souvent.'}
};
const CAUSE_KEYS=Object.keys(ERR_CAUSE);
const causeOf=k=>!k||k.length<13?null:k[10]>=1?'xf':k[12]<0||k[12]>ERR_ISO?'seul':k[11]===0?'nocov':null;
CAUSE_KEYS.forEach(k=>{MET['e_'+k]=['e_'+k,'r7',100];});
const PG_OPT=['rE','r7','dsr','dsw'].concat(ERR_KEYS.concat(CAUSE_KEYS,Object.keys(ECO_DEF)).map(k=>'e_'+k));
const errSev=c=>c>=.2?3:c>=.1?2:1;
function deathsOf(d,M,F0){
const F=F0||flowOf(d,M),pl=(d&&d.pl)||[],tm=j=>pl[j]?pl[j].t:null,byR=grp((d&&d.kills)||[],k=>k[0]),out=[];
F.forEach(f=>{
const ks=(byR[f.i]||[]).slice().sort((a,b)=>a[1]-b[1]),fs=f.r.fs||[];
f.ev.forEach(e=>{
if(e.victim==null||e.killer==null||!e.n0||e.pb<=.03||e.pb>=.97)return;
const x=e.victim,t=tm(x);if(t==null||tm(e.killer)===t)return;
const cost=t===1?-e.d:e.d,mine=e.n0[t],theirs=e.n0[1-t];
if(ks.some(k=>k[3]===e.killer&&tm(k[2])===t&&k[1]>=e.ms&&k[1]-e.ms<=ERR_TRADE))return;
const side=t===1?f.r.s:f.r.s==='A'?'D':f.r.s==='D'?'A':'?',own=t===1?e.cat==='post':e.cat==='retake';
let tag=null,iso=null;
if(e.cat==='ouverture'){
const me=fs.find(p=>p[0]===x),al=fs.filter(p=>p[0]!==x&&tm(p[0])===t);
if(me&&al.length)iso=Math.min(...al.map(p=>Math.hypot(p[1]-me[1],p[2]-me[2])))/100;
tag=iso!=null&&iso>ERR_ISO?'ouvSeul':'ouv';
}else if(own&&mine>=theirs)tag='post';
else if(mine>theirs&&mine>=2)tag='avant';
else if(mine>=2)tag='notr';
if(!tag)return;
const k=ks.find(q=>q[3]===x&&q[1]===e.ms)||[];
out.push({x,r:f.i,s:side,ms:e.ms,k:e.killer,tag,c:causeOf(k),cost,sev:errSev(cost),iso,vx:k[4]??null,vy:k[5]??null});
});
});
return out;
}
function errLessons(E){
const g={};(E||[]).forEach(e=>{const o=g[e.tag]||(g[e.tag]={tag:e.tag,n:0,cost:0,rounds:[],sides:{},cs:{}});o.n++;o.cost+=e.cost;o.rounds.push(e.r);o.sides[e.s]=(o.sides[e.s]||0)+1;
if(e.c)o.cs[e.c]=(o.cs[e.c]||0)+1;});
return Object.values(g).filter(o=>o.cost>=.1).sort((a,b)=>b.cost-a.cost).slice(0,3)
.map(o=>{const c=Object.entries(o.cs).sort((a,b)=>b[1]-a[1])[0];return Object.assign(o,{cause:c?c[0]:null,causeN:c?c[1]:0});});
}
const errFix=(tag,sides)=>{const D=ERR_DEF[tag];return D.fixD&&sides&&(sides.D||0)>(sides.A||0)?D.fixD:D.fix;};
function errAgg(D,M,Eof){
const me={},ot={},ex={},R={t:[0,0,0,0],c:[0,0,0,0]};let n=0;
const put=(o,key,e,mine,d)=>{const c=o[key]||(o[key]={n:0,cost:0,sides:{}});c.n++;c.cost+=e.cost;c.sides[e.s]=(c.sides[e.s]||0)+1;
if(mine)(ex[key]=ex[key]||[]).push({id:d.id,map:d.map,ts:d.ts,r:e.r,cost:e.cost});};
(D||[]).forEach(d=>{const i=(d.pl||[]).findIndex(p=>p.n==='moi'),nR=(d.rounds||[]).length;if(i<0||!nR)return;
n++;const o=d.pl.length-1,add=x=>{x[0]+=nR;x[1]+=nR*o;x[2]++;x[3]+=o;};add(R.t);if((d.v||0)>=7)add(R.c);
(Eof?Eof(d):deathsOf(d,M)).forEach(e=>{const O=e.x===i?me:ot;put(O,e.tag,e,e.x===i,d);if(e.c)put(O,'c:'+e.c,e,e.x===i,d);});});
const row=(k,key,t,fix,r,cause)=>{const a=me[key]||{n:0,cost:0,sides:{}},b=ot[key]||{n:0,cost:0},rate=r[0]?a.n/r[0]*100:null,ref=r[1]?b.n/r[1]*100:null;
const exp=ref==null?null:ref*r[0]/100,z=exp>0?(a.n-exp)/Math.sqrt(exp):0,cpm=r[2]?a.cost/r[2]:0,cref=r[3]?b.cost/r[3]:0;
return{k,cause,t,fix:fix(a.sides),n:a.n,rate,ref,cpm,cref,extra:cpm-cref,sure:a.n>=3&&z>=1.645,
ex:(ex[key]||[]).sort((x,y)=>y.ts-x.ts||y.cost-x.cost).slice(0,4)};};
const rows=ERR_KEYS.map(k=>row(k,k,ERR_DEF[k].t,s=>errFix(k,s),R.t,false))
.concat(CAUSE_KEYS.map(k=>row(k,'c:'+k,ERR_CAUSE[k].t,()=>ERR_CAUSE[k].fix,R.c,true)));
return{n,n7:R.c[2],rounds:R.t[0],rows:rows.filter(r=>r.n).sort((a,b)=>(b.sure-a.sure)||b.extra-a.extra)};
}
function focusPick(C,A){
const it=(C&&C.items)||[],er=((A&&A.rows)||[]).filter(r=>r.n>=3),mk=(k,dir,t,fix,why)=>({k,dir,t,fix,why});
const fromItem=x=>{const c=x.causes&&x.causes[0],R=c&&COACH_RULES[c.id];return R?mk(R.m,R.dir,R.t,R.fix,x.t):null;};
const L=[];
it.filter(x=>x.sure).forEach(x=>L.push(fromItem(x)));
er.filter(r=>r.sure).forEach(r=>L.push(mk('e_'+r.k,-1,r.t,r.fix,'Erreur qui revient')));
it.filter(x=>!x.sure).forEach(x=>L.push(fromItem(x)));
er.filter(r=>!r.sure&&r.extra>0).forEach(r=>L.push(mk('e_'+r.k,-1,r.t,r.fix,'Erreur qui revient')));
L.push(mk('hsP',1,'Balles dans la tête',COACH_RULES.hs.fix,'Monte avec le rang'),mk('trP',1,'Tes morts vengées en 3 s',COACH_RULES.tr.fix,'Monte avec le rang'));
const seen={};return L.filter(x=>x&&!seen[x.k]&&(seen[x.k]=1));
}
function focusEval(f,G){
if(!f||!MET[f.k])return null;const A=(G||[]).filter(g=>g.ts>=f.since),me=metSE(A,f.k),b=f.base||{};
const diff=me.v!=null&&b.v!=null?(me.v-b.v)*f.dir:null,se=Math.sqrt((me.se||0)**2+(b.se||0)**2);
const st=A.length<3||diff==null?'go':se>0&&diff>=1.645*se?'ok':se>0&&-diff>=1.645*se?'bad':A.length>=10?'flat':'wait';
const ticks=A.slice().sort((x,y)=>x.ts-y.ts).map(g=>{const v=metV(g,f.k);return{id:g.id,ts:g.ts,v,ok:v==null||b.v==null?null:(v-b.v)*f.dir>=0};});
return{st,n:A.length,v:me.v,base:b.v,diff,se,ticks};
}
const focusBase=(f,G)=>{const B=(G||[]).filter(g=>g.ts<f.since).sort((a,b)=>b.ts-a.ts).slice(0,20),x=metSE(B,f.k);return{v:x.v,se:x.se,n:x.n};};
function tiltOf(G,cur,gapH=3){
const L=(G||[]).filter(g=>g.ts&&g.r).slice().sort((a,b)=>a.ts-b.ts);if(L.length<8)return null;
const ipr=g=>g.imp/g.r,fdr=g=>g.fd/g.r,mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const sd=a=>{const m=mean(a);return Math.sqrt(a.reduce((s,x)=>s+(x-m)**2,0)/Math.max(1,a.length-1));};
const C=new Set((cur||[]).map(x=>x.id)),S=L.filter(g=>C.has(g.id)),B=L.filter(g=>!C.has(g.id)).slice(-30);
let ses=null;
if(S.length>=2&&B.length>=6){const m=mean(S.map(ipr)),b=mean(B.map(ipr)),se=sd(B.map(ipr))/Math.sqrt(S.length);
ses={n:S.length,imp:m,base:b,z:se>0?(m-b)/se:0,drop:se>0&&(b-m)>=1.645*se};}
const aL=[],aW=[];for(let i=1;i<L.length;i++){if(L[i].ts-L[i-1].ts>gapH*36e5)continue;(L[i-1].w?aW:aL).push(L[i]);}
let after=null;
if(aL.length>=5&&aW.length>=5){const x=mean(aL.map(fdr)),y=mean(aW.map(fdr)),se=Math.sqrt(sd(aL.map(fdr))**2/aL.length+sd(aW.map(fdr))**2/aW.length);
after={nL:aL.length,nW:aW.length,fdL:x*100,fdW:y*100,sure:se>0&&(x-y)>=1.645*se};}
return{ses,after};
}
const coLabel=c=>!c?'?':c[0]==='Attacker Side'?'Spawn attaque':c[0]==='Defender Side'?'Spawn défense':c[1]==='Site'?`Site ${c[0]}`:`${c[0]} ${c[1]}`;
const coFind=(cos,n)=>(cos||[]).find(c=>coLabel(c)===n)||null;
const coZone=(cos,x,y)=>x==null||y==null||!(cos||[]).length?null:coLabel(nearestRegion(cos,x,y));
const coSite=(cos,z)=>{const c=coFind(cos,z);return!c?'?':/^[A-C]$/.test(c[0])?c[0]:c[0]==='Mid'?'Mid':'Spawn';};
const coPlay=(cos,z)=>{const c=coFind(cos,z);return!!c&&/^([A-C]|Mid)$/.test(c[0]);};
const coSpawn=(cos,atk)=>(cos||[]).find(c=>c[0]===(atk?'Attacker Side':'Defender Side'))||null;
const coSites=cos=>[...new Set((cos||[]).map(c=>c[0]).filter(s=>/^[A-C]$/.test(s)))].sort();
const meOf=d=>((d&&d.pl)||[]).findIndex(p=>p.n==='moi');
const sideT=(r,t)=>r.s!=='A'&&r.s!=='D'?null:t===1?r.s:r.s==='A'?'D':'A';
const ageW=(ts,now,half=45)=>!ts||!now?1:Math.pow(.5,Math.max(0,now-ts)/864e5/half);
const POS_A=8;
const median=a=>{const s=(a||[]).filter(Number.isFinite).sort((x,y)=>x-y);return s.length?s[Math.floor(s.length/2)]:null;};
const tally=a=>{const o={};(a||[]).forEach(k=>{if(k)o[k]=(o[k]||0)+1;});return Object.entries(o).sort((x,y)=>y[1]-x[1]||String(x[0]).localeCompare(String(y[0])));};
const byRound=d=>grp(d.kills||[],k=>k[0]);
function zProp(a,b){const[n1,k1]=a,[n2,k2]=b;if(!(n1>0&&n2>0))return 0;const p=(k1+k2)/(n1+n2),se=Math.sqrt(p*(1-p)*(1/n1+1/n2));return se?(k2/n2-k1/n1)/se:0;}
function posControl(D,map,cos){
const cnt={},sa=coSpawn(cos,true),sd=coSpawn(cos,false),dist=(c,s)=>s?Math.hypot(c[2]-s[2],c[3]-s[3]):1;
(D||[]).filter(d=>d&&d.map===map).forEach(d=>(d.rounds||[]).forEach(r=>(r.fs||[]).forEach(([pi,x,y])=>{
const p=d.pl[pi],sd2=p?sideT(r,p.t):null;if(!sd2)return;const z=coZone(cos,x,y),c=cnt[z]||(cnt[z]={def:0,atk:0});if(sd2==='D')c.def++;else c.atk++;})));
const out={},defBySite={};
Object.entries(cnt).forEach(([z,o])=>{const s=coSite(cos,z);defBySite[s]=(defBySite[s]||0)+o.def;});
(cos||[]).forEach(c=>{
const z=coLabel(c),o=cnt[z]||{def:0,atk:0},da=dist(c,sa),dd=dist(c,sd);
const prior=c[1]==='Site'?.9:/Main|Lobby|Bottom/i.test(c[1])?.25:da/(da+dd),share=(o.def+6*prior)/(o.def+o.atk+6),site=coSite(cos,z);
out[z]={prior,def:o.def,atk:o.atk,share,pop:defBySite[site]?o.def/defBySite[site]:null,siteObs:defBySite[site]||0,kind:c[1]==='Site'||share>=.58?'def':share<=.42?'atk':'mix'};
});
return out;
}
function posDuels(D,map,side,now,post){
const ev=[];
(D||[]).filter(d=>d&&d.map===map).forEach(d=>{
const me=meOf(d);if(me<0)return;const mt=d.pl[me].t,w=ageW(d.ts,now),byR=byRound(d),foe=i=>d.pl[i]&&d.pl[i].t!==mt;
d.rounds.forEach((r,ri)=>{if(sideT(r,mt)!==side)return;(byR[ri]||[]).forEach(k=>{const after=!!(r.pt&&k[1]>r.pt);if(after!==!!post)return;
if(k[2]===me&&foe(k[3])&&k[6]!=null)ev.push({x:k[6],y:k[7],ex:k[4],ey:k[5],win:true,w});
else if(k[3]===me&&foe(k[2])&&k[4]!=null)ev.push({x:k[4],y:k[5],ex:k[6],ey:k[7],win:false,w});});});
});
return ev;
}
function posCluster(pts,R){
let C=[];const avg=a=>a.reduce((s,v)=>s+v,0)/a.length;
for(let pass=0;pass<3;pass++){
const nx=C.map(c=>({x:c.x,y:c.y,m:[]}));
(pts||[]).forEach(p=>{let b=null,bd=R;nx.forEach(c=>{const dd=Math.hypot(c.x-p.x,c.y-p.y);if(dd<bd){bd=dd;b=c;}});if(!b)nx.push(b={x:p.x,y:p.y,m:[]});b.m.push(p);});
C=nx.filter(c=>c.m.length).map(c=>({x:avg(c.m.map(p=>p.x)),y:avg(c.m.map(p=>p.y)),m:c.m}));
}
return C.sort((a,b)=>b.m.length-a.m.length);
}
function posSpots(D,map,side,cos,now,ctl){
const ev=posDuels(D,map,side,now),w=ev.filter(e=>e.win).length,p0=(w+1)/(ev.length+2),C=ctl||posControl(D,map,cos);
return posCluster(ev,400).map(c=>{
const n=c.m.length,k=c.m.filter(e=>e.win).length,nW=c.m.reduce((a,e)=>a+e.w,0),kW=c.m.filter(e=>e.win).reduce((a,e)=>a+e.w,0),sh=(kW+POS_A*p0)/(nW+POS_A);
const en=c.m.filter(e=>e.ex!=null),ks=en.filter(e=>!e.win),z=coZone(cos,c.x,c.y);
const ang=en.length?posCluster(en.map(e=>({x:e.ex,y:e.ey})),800)[0]:null,kc=ks.length>=2?posCluster(ks.map(e=>({x:e.ex,y:e.ey})),800)[0]:null;
const verdict=n>=4&&sh>=Math.max(p0,.5)+.03?['À jouer','ok']:n>=4&&sh<=Math.min(p0,.5)-.03?['À éviter','bad']:['Correct','warn'];
const angZ=a=>{const z0=coZone(cos,a.x,a.y);if(z0!==z||Math.hypot(a.x-c.x,a.y-c.y)<500)return z0;const o=(cos||[]).filter(q=>coLabel(q)!==z&&/^([A-C]|Mid)$/.test(q[0]));return o.length?coLabel(nearestRegion(o,a.x,a.y)):z0;};
return{x:Math.round(c.x),y:Math.round(c.y),n,k,d:n-k,raw:k/n,sh,z,setup:side!=='D'||(C[z]||{}).kind==='def',verdict,
ang:ang&&{x:Math.round(ang.x),y:Math.round(ang.y),z:angZ(ang),n:ang.m.length},dist:en.length?Math.round(median(en.map(e=>Math.hypot(e.ex-e.x,e.ey-e.y)))/100):null,
kc:kc&&{x:Math.round(kc.x),y:Math.round(kc.y),z:coZone(cos,kc.x,kc.y),n:kc.m.length},rel:n>=12?['bonne','ok']:n>=5?['moyenne','warn']:['faible','bad']};
}).filter(s=>s.n>=2).sort((a,b)=>b.sh-a.sh);
}
function posZones(D,map,side,cos,now,ctl){
const C=ctl||posControl(D,map,cos),Z={},O={},mine={K:0,D:0,n:0,w:0},oth={K:0,D:0},at=(o,z)=>o[z]||(o[z]={k:0,d:0,kp:0,dp:0,fk:0,fd:0,n:0,w:0});
(D||[]).filter(d=>d&&d.map===map).forEach(d=>{
const me=meOf(d);if(me<0)return;const tm=i=>d.pl[i]?d.pl[i].t:null,mt=tm(me),byR=byRound(d);
d.rounds.forEach((r,ri)=>{
const mySide=sideT(r,mt);if(!mySide)return;
(byR[ri]||[]).slice().sort((a,b)=>a[1]-b[1]).forEach((k,j)=>{
const post=!!(r.pt&&k[1]>r.pt),ki=k[2],vi=k[3];if(tm(ki)==null||tm(vi)==null||tm(ki)===tm(vi))return;
if(k[6]!=null&&sideT(r,tm(ki))===side){const z=coZone(cos,k[6],k[7]),s=at(ki===me?Z:O,z);if(post)s.kp++;else{s.k++;if(ki===me)mine.K++;else oth.K++;}if(!j)s.fk++;}
if(k[4]!=null&&sideT(r,tm(vi))===side){const z=coZone(cos,k[4],k[5]),s=at(vi===me?Z:O,z);if(post)s.dp++;else{s.d++;if(vi===me)mine.D++;else oth.D++;}if(!j)s.fd++;}
});
if(mySide!==side)return;
mine.n++;if(r.w)mine.w++;
const f=(r.fs||[]).find(x=>x[0]===me);if(f){const s=at(Z,coZone(cos,f[1],f[2]));s.n++;if(r.w)s.w++;}
});
});
const pO=(oth.K+1)/(oth.K+oth.D+2),pM=(mine.K+1)/(mine.K+mine.D+2),wM=mine.n?mine.w/mine.n:.5;
const list=Object.entries(Z).filter(([z])=>coPlay(cos,z)).map(([z,s])=>{
const o=O[z]||{k:0,d:0},base=(o.k+POS_A*pO)/(o.k+o.d+POS_A),ev=s.k+s.d,duel=(s.k+POS_A*base)/(ev+POS_A),pres=(s.w+POS_A*wM)/(s.n+POS_A);
const ct=C[z]||{kind:'mix',share:.5},setup=side==='D'?ct.kind==='def':ct.share<.75,tot=ev+s.n;
const verdict=!setup?['Hors setup','']:ev>=6&&duel>=.5&&(duel>=base+.05||duel>=pM+.04)?['À jouer','ok']:ev>=6&&duel<.5&&(duel<=base-.05||duel<=pM-.04)?['À éviter','bad']:['Correct','warn'];
return Object.assign({},s,{z,site:coSite(cos,z),ev,raw:ev?s.k/ev:null,duel,base,oth:[o.k+o.d,o.k],pres,score:.6*duel+.4*pres,setup,ctl:ct,verdict,
rel:tot>=25?['bonne','ok']:tot>=10?['moyenne','warn']:['faible','bad']});
}).filter(x=>x.ev+x.n+x.kp+x.dp>=3).sort((a,b)=>(b.setup-a.setup)||b.score-a.score);
return{list,mine,pM,pO};
}
function posThreats(D,map,side,who,min){
const pts=[];
(D||[]).filter(d=>d&&d.map===map).forEach(d=>{const me=meOf(d);if(me<0)return;const mt=d.pl[me].t,byR=byRound(d);
d.rounds.forEach((r,ri)=>{if(sideT(r,mt)!==side)return;(byR[ri]||[]).forEach(k=>{if(r.pt&&k[1]>r.pt)return;const v=d.pl[k[3]],kl=d.pl[k[2]];
if(!v||!kl||kl.t===mt||v.t!==mt||k[6]==null||(who==='moi'&&k[3]!==me))return;pts.push({x:k[6],y:k[7]});});});});
return posCluster(pts,450).filter(c=>c.m.length>=(min||2)).map(c=>({x:Math.round(c.x),y:Math.round(c.y),n:c.m.length,z:null}));
}
function posGap(zones){
const Z=(zones||[]).filter(z=>z.setup&&z.ev>=8);if(Z.length<2)return null;
const hi=Z.reduce((a,b)=>b.raw>a.raw?b:a),lo=Z.reduce((a,b)=>b.raw<a.raw?b:a),z=zProp([lo.ev,lo.k],[hi.ev,hi.k]);
return hi.raw-lo.raw>=.2&&z>=1.28?{hi,lo,z}:null;
}
const AT_CELL=300,AT_P=12;
const rgOf=t=>!(t>=3)?0:t<=11?1:t<=20?2:3;
const RG_FR=['','Fer à Argent','Or à Diamant','Ascendant à Radiant'];
function atlasAdd(A,d,cos){
if(!d||!d.map||!(cos||[]).length||!(d.rounds||[]).length)return A;
const m=A[d.map]||(A[d.map]={n:0,r:0,s:{},np:[0,0],g:{1:{},2:{},3:{}},z:{},fsn:{A:0,D:0},L:{},c:{}});
const pl=d.pl||[],tm=i=>pl[i]?pl[i].t:null,tiers=pl.map(p=>p.tr).filter(t=>t>=3),byR=byRound(d);
const rg=rgOf(tiers.length?tiers.reduce((a,b)=>a+b,0)/tiers.length:0);
const zA=(z,side)=>(m.z[z]||(m.z[z]={A:[0,0,0,0,0],D:[0,0,0,0,0]}))[side];
m.n++;
d.rounds.forEach((r,ri)=>{
if(r.s!=='A'&&r.s!=='D')return;m.r++;
const sideOf=t=>sideT(r,t),atkT=r.s==='A'?1:0,atkWon=(r.w===1)===(atkT===1);
if(r.p&&r.pu===atkT&&/^[A-C]$/.test(r.p)){const s=m.s[r.p]||(m.s[r.p]=[0,0]);s[0]++;if(atkWon)s[1]++;if(rg)m.g[rg][r.p]=(m.g[rg][r.p]||0)+1;}
else{m.np[0]++;if(atkWon)m.np[1]++;}
if((r.fs||[]).length){m.fsn.A++;m.fsn.D++;const seen={};
r.fs.forEach(([pi,x,y])=>{const s=sideOf(tm(pi)),z=s?coZone(cos,x,y):null;if(!z||seen[s+z])return;seen[s+z]=1;zA(z,s)[4]++;});}
(byR[ri]||[]).slice().sort((a,b)=>a[1]-b[1]).forEach((k,j)=>{
if(r.pt&&k[1]>r.pt)return;const kt=tm(k[2]),vt=tm(k[3]);if(kt==null||vt==null||kt===vt)return;
const ks=sideOf(kt),vs=sideOf(vt),kz=k[6]!=null?coZone(cos,k[6],k[7]):null,vz=k[4]!=null?coZone(cos,k[4],k[5]):null;
if(kz){const a=zA(kz,ks);a[0]++;if(!j)a[2]++;}
if(vz){const a=zA(vz,vs);a[1]++;if(!j)a[3]++;}
if(!GUN[k[8]]||!kz||!vz)return;
if(!j){const key=ks==='D'?kz+'|'+vz:vz+'|'+kz,l=m.L[key]||(m.L[key]=[0,0]);l[0]++;if(ks==='D')l[1]++;}
[[ks,k[6],k[7],k[4],k[5],1],[vs,k[4],k[5],k[6],k[7],0]].forEach(([s,x,y,ex,ey,w])=>{
const key=`${s}|${Math.floor(x/AT_CELL)}|${Math.floor(y/AT_CELL)}`,c=m.c[key]||(m.c[key]=[0,0,0,0]);c[0]++;c[1]+=w;c[2]+=ex-x;c[3]+=ey-y;});
});
});
return A;
}
const rndAll=o=>JSON.parse(JSON.stringify(o),(k,v)=>typeof v==='number'?Math.round(v):v);
function atlasPack(A,opt){
const o=Object.assign({minCell:25,perSide:70,lines:40},opt),out={};
Object.entries(A||{}).forEach(([map,m])=>{
const L=Object.entries(m.L).filter(([,v])=>v[0]>=5).sort((a,b)=>b[1][0]-a[1][0]).slice(0,o.lines);
const C=[];['A','D'].forEach(s=>{
const all=Object.entries(m.c).filter(([k,v])=>k[0]===s&&v[0]>=o.minCell).map(([k,v])=>{const[,ix,iy]=k.split('|').map(Number);
return[s,Math.round((ix+.5)*AT_CELL),Math.round((iy+.5)*AT_CELL),Math.round(v[0]),Math.min(Math.round(v[0]),Math.round(v[1])),Math.round(v[2]/v[0]),Math.round(v[3]/v[0])];});
const p0=all.reduce((a,c)=>a+c[4],0)/Math.max(1,all.reduce((a,c)=>a+c[3],0)),sh=c=>(c[4]+AT_P*p0)/(c[3]+AT_P);
const keep=new Set([...all.slice().sort((a,b)=>b[3]-a[3]).slice(0,o.perSide),...all.slice().sort((a,b)=>sh(b)-sh(a)).slice(0,Math.round(o.perSide/2))]);
C.push(...keep);
});
out[map]=rndAll({n:m.n,r:m.r,s:m.s,np:m.np,g:m.g,z:m.z,fsn:m.fsn,L:Object.fromEntries(L)});out[map].c=C;
});
return out;
}
function v4Keep(md){
const m=md&&md.metadata,P=md&&Array.isArray(md.players)?md.players:[],q=m?String((m.queue||{}).id||(m.queue||{}).name||''):'';
return!!m&&(!q||/competitive/i.test(q))&&m.is_completed!==false&&P.length===10&&(md.rounds||[]).length>=13&&!P.some(p=>((p.behavior||{}).afk_rounds||0)>=3);
}
const aggNew=()=>({v:1,day:'',matches:0,du:'',au:'',M:{S:{},E:{}},B:{c:{}},A:{},T:metaNew()});
function aggDecay(o,f){
if(Array.isArray(o))o.forEach((v,i)=>{if(typeof v==='number')o[i]=v*f;else if(v&&typeof v==='object')aggDecay(v,f);});
else if(o&&typeof o==='object')Object.keys(o).forEach(k=>{const v=o[k];if(typeof v==='number')o[k]=v*f;else if(v&&typeof v==='object')aggDecay(v,f);});
return o;
}
function aggAge(G,today,half=30){
if(G.day&&today>G.day){const f=Math.pow(.5,(Date.parse(today)-Date.parse(G.day))/864e5/half);aggDecay(G.M,f);aggDecay(G.B,f);aggDecay(G.A,f);if(G.T){aggDecay(G.T.S,f);aggDecay(G.T.Q||{},f);}G.matches*=f;}
G.day=today;return G;
}
function aggMatch(G,md,cosOf,roleOf){
if(!v4Keep(md))return null;
const d=v4Detail(md,md.players[0].team_id,()=>'');if(!d.id||d.kills.length<10)return null;
return aggDetail(G,d,cosOf,roleOf);
}
function aggDetail(G,d,cosOf,roleOf){
const w=wpFit([d]);['S','E'].forEach(k=>Object.entries(w[k]).forEach(([key,v])=>{const c=G.M[k][key]||(G.M[k][key]=[0,0]);c[0]+=v[0];c[1]+=v[1];}));
benchAdd(G.B,d,G.M,roleOf);atlasAdd(G.A,d,cosOf(d.map));metaAdd(G.T||(G.T=metaNew()),d);G.matches++;
if(d.date){if(!G.du||d.date<G.du)G.du=d.date;if(d.date>G.au)G.au=d.date;}
return d;
}
function aggPublish(G,region,today){
const M={S:{},E:{}},c={},meta={v:1,maj:today,region,matches:Math.round(G.matches),du:G.du,au:G.au};
['S','E'].forEach(k=>Object.entries(G.M[k]).forEach(([key,v])=>{const n=Math.round(v[0]);if(n>0)M[k][key]=[n,Math.min(n,Math.round(v[1]))];}));
Object.entries(G.B.c).forEach(([k,v])=>{const o={};Object.keys(v).forEach(f=>{o[f]=Math.round(v[f]*1000)/1000;});c[k]=o;});
const g={},r3=x=>Math.round(x*1000)/1000;Object.entries(G.B.g||{}).forEach(([k,v])=>{if(v.n>=.5)g[k]={n:r3(v.n),r:r3(v.r),c:v.c.map(r3)};});
const T=G.T?metaFit(G.T):null;
return{bench:Object.assign({format:'elitrack-bench'},meta,{c,g,M}),atlas:Object.assign({format:'elitrack-atlas'},meta,{maps:atlasPack(G.A)}),meta:T?Object.assign({format:'elitrack-meta'},meta,T):null};
}
function atlasClean(raw){
if(!obj(raw)||raw.format!=='elitrack-atlas'||raw.v!==1||!obj(raw.maps))return null;
const N=v=>typeof v==='number'&&Number.isFinite(v),arr=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(N),ZN=/^[A-Za-zÀ-ÿ0-9 '-]{1,40}$/,maps={};
Object.entries(raw.maps).slice(0,30).forEach(([map,m])=>{
if(!/^[A-Za-z]{3,12}$/.test(map)||!obj(m)||!N(m.n)||!N(m.r))return;
const s={},g={1:{},2:{},3:{}},z={},L={};
Object.entries(obj(m.s)?m.s:{}).forEach(([k,v])=>{if(/^[A-C]$/.test(k)&&arr(v,2))s[k]=v;});
[1,2,3].forEach(i=>Object.entries(obj(m.g)&&obj(m.g[i])?m.g[i]:{}).forEach(([k,v])=>{if(/^[A-C]$/.test(k)&&N(v))g[i][k]=v;}));
Object.entries(obj(m.z)?m.z:{}).slice(0,80).forEach(([k,v])=>{if(ZN.test(k)&&obj(v)&&arr(v.A,5)&&arr(v.D,5))z[k]={A:v.A,D:v.D};});
Object.entries(obj(m.L)?m.L:{}).slice(0,60).forEach(([k,v])=>{const p=k.split('|');if(p.length===2&&p.every(x=>ZN.test(x))&&arr(v,2))L[k]=v;});
const c=(Array.isArray(m.c)?m.c:[]).slice(0,400).filter(x=>Array.isArray(x)&&x.length===7&&(x[0]==='A'||x[0]==='D')&&x.slice(1).every(N));
maps[map]={n:m.n,r:m.r,s,np:arr(m.np,2)?m.np:[0,0],g,z,fsn:obj(m.fsn)&&N(m.fsn.A)&&N(m.fsn.D)?{A:m.fsn.A,D:m.fsn.D}:{A:0,D:0},L,c};
});
return{format:'elitrack-atlas',v:1,maj:RE_DATE.test(raw.maj||'')?raw.maj:'',region:strMax(raw.region,10),matches:intIn(raw.matches,0,1e7,0),maps};
}
const META_RK='#',META_MIN=30;
const metaNew=()=>({v:1,S:{}});
const xxK=(a,b)=>a<b?a+'|'+b:b+'|'+a;
function metaAdd(T,d,w=1){
const pl=(d&&d.pl)||[],R=(d&&d.rounds)||[];
if(pl.length!==10||[0,1].some(t=>pl.filter(p=>p.t===t&&p.a).length!==5))return T;
const r0=R.filter(r=>r.w===0).length,r1=R.filter(r=>r.w===1).length;if(r0+r1<13)return T;
const x={},tr=[[],[]];pl.forEach(p=>{x[p.a]=(x[p.a]||0)+(p.t?-1:1);if(p.tr>=3)tr[p.t].push(p.tr);});
const av=v=>v.reduce((a,b)=>a+b,0)/v.length,all=tr[0].concat(tr[1]);
if(tr[0].length&&tr[1].length)x[META_RK]=av(tr[0])-av(tr[1]);
const y=(r0-r1)/(2*(r0+r1)),win=r0>r1?1:r0<r1?0:.5,K=Object.keys(x).filter(k=>x[k]),rg=rgOf(all.length?av(all):0);
['*',d.map].concat(rg?['g'+rg]:[]).filter(k=>/^(\*|[A-Za-z]{3,12}|g[1-3])$/.test(k||'')).forEach(sk=>{
const s=T.S[sk]||(T.S[sk]={n:0,w:0,yy:0,xy:{},xx:{},pk:{},rw:{}});s.n++;s.w+=w;s.yy+=w*y*y;
K.forEach((a,i)=>{s.xy[a]=(s.xy[a]||0)+w*x[a]*y;K.slice(i).forEach(b=>{const k=xxK(a,b);s.xx[k]=(s.xx[k]||0)+w*x[a]*x[b];});});
pl.forEach(p=>{s.pk[p.a]=(s.pk[p.a]||0)+w;});
K.forEach(a=>{if(a===META_RK)return;const o=s.rw[a]||(s.rw[a]=[0,0]);o[0]+=w;o[1]+=w*(x[a]>0?win:1-win);});
});
if(rg&&/^[A-Za-z]{3,12}$/.test(d.map||'')){const q=(T.Q=T.Q||{}),k=`${d.map}|${rg}`,s=q[k]||(q[k]={w:0,pk:{}});s.w+=w;pl.forEach(p=>{s.pk[p.a]=(s.pk[p.a]||0)+w;});}
return T;
}
function ftWin(p){
const q=1-p;let s=0,c=1;for(let k=0;k<=11;k++){if(k)c=c*(12+k)/k;s+=c*Math.pow(p,13)*Math.pow(q,k);}
return s+2704156*Math.pow(p*q,12)*(p*p/(p*p+q*q));
}
const normCdf=z=>{const t=1/(1+.2316419*Math.abs(z)),d=.3989423*Math.exp(-z*z/2),p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-p:p;};
function cholSolve(A,B){
const n=A.length,L=A.map(r=>r.map(()=>0));
for(let i=0;i<n;i++)for(let j=0;j<=i;j++){let s=A[i][j];for(let k=0;k<j;k++)s-=L[i][k]*L[j][k];L[i][j]=i===j?Math.sqrt(Math.max(s,1e-12)):s/L[j][j];}
const sol=b=>{const y=b.slice();for(let i=0;i<n;i++){for(let k=0;k<i;k++)y[i]-=L[i][k]*y[k];y[i]/=L[i][i];}for(let i=n-1;i>=0;i--){for(let k=i+1;k<n;k++)y[i]-=L[k][i]*y[k];y[i]/=L[i][i];}return y;};
return{x:B.map(sol),inv:Array.from({length:n},(_,j)=>sol(Array.from({length:n},(_,i)=>+(i===j))))};
}
function metaRidge(s,P,pen,b0){
const xx=(a,b)=>s.xx[xxK(a,b)]||0,B0=Object.entries(b0||{}).filter(([,v])=>v);
const X=P.map(a=>P.map(b=>xx(a,b))),A=X.map((r,i)=>r.map((v,j)=>v+(i===j?pen[i]:0)));
const c=P.map(a=>(s.xy[a]||0)-B0.reduce((t,[k,v])=>t+xx(a,k)*v,0));
const yy=s.yy-2*B0.reduce((t,[k,v])=>t+v*(s.xy[k]||0),0)+B0.reduce((t,[k,v])=>t+B0.reduce((u,[l,z])=>u+v*z*xx(k,l),0),0);
const{x:[b],inv}=cholSolve(A,[c]),n=P.length;
let rss=yy,df=0;for(let i=0;i<n;i++){rss-=2*b[i]*c[i];for(let j=0;j<n;j++){rss+=b[i]*X[i][j]*b[j];df+=inv[i][j]*X[j][i];}}
return{b,inv,rss:Math.max(rss,0),df,w:s.w};
}
const GCV=(w,rss,df)=>w>df?w*rss/((w-df)*(w-df)):Infinity;
function metaFit(T,opt){
const o=Object.assign({grid:[3,10,30,100,300,1000,3000,1e4,3e4,1e5],min:100},opt),S=(T&&T.S)||{},G=S['*'];
if(!G||G.w<o.min)return null;
const A=Object.keys(G.pk).filter(a=>/^[A-Za-z][A-Za-z/ ]{1,11}$/.test(a)).sort(),P=A.concat(G.xx[xxK(META_RK,META_RK)]?[META_RK]:[]),idx=Object.fromEntries(P.map((a,i)=>[a,i]));
const fitG=l=>metaRidge(G,P,P.map(a=>a===META_RK?1e-3:l));
let lg=o.grid[0],best=Infinity;o.grid.forEach(l=>{const f=fitG(l),g=GCV(f.w,f.rss,f.df);if(g<best){best=g;lg=l;}});
const F=fitG(lg),s2=F.rss/Math.max(1,F.w-F.df),bG=Object.fromEntries(P.map((a,i)=>[a,F.b[i]]));
const contrast=(s,b,inv,idxOf,sc)=>{const tot=A.reduce((t,a)=>t+(s.pk[a]||0),0)||1,pi=A.map(a=>(s.pk[a]||0)/tot),m=A.reduce((t,a,i)=>t+pi[i]*b(a),0);
const I=A.map(a=>idxOf[a]),vM=A.reduce((t,a,i)=>t+pi[i]*A.reduce((u,z,j)=>u+pi[j]*inv[I[i]][I[j]],0),0);
return A.map((a,i)=>{const ia=I[i],v=inv[ia][ia]-2*A.reduce((t,z,j)=>t+pi[j]*inv[ia][I[j]],0)+vM;return[b(a)-m,Math.sqrt(Math.max(v,0)*sc)];});};
const row=(s,eff)=>{const out={};A.forEach((a,i)=>{const pk=s.pk[a]||0;if(!pk)return;const r=s.rw[a]||[0,0];
out[a]=[Math.round(eff[i][0]*1e4)/100,Math.round(eff[i][1]*1e4)/100,Math.round(pk/(2*s.w)*1000)/10,Math.round(r[0]),Math.min(Math.round(r[0]),Math.round(r[1]))];});return out;};
const effG=contrast(G,a=>bG[a],F.inv,idx,s2),out={'*':{n:Math.round(G.w),a:row(G,effG)}},lams=[];
[k=>/^[A-Za-z]{3,12}$/.test(k),k=>/^g[1-3]$/.test(k)].forEach(isK=>{
const kids=Object.keys(S).filter(k=>isK(k)&&S[k].w>=20);if(!kids.length)return;
const fitK=(k,l)=>metaRidge(S[k],A,A.map(()=>l),bG);
let lk=o.grid[o.grid.length-1],bk=Infinity;o.grid.forEach(l=>{let W=0,R=0,D=0;kids.forEach(k=>{const f=fitK(k,l);W+=f.w;R+=f.rss;D+=f.df;});const g=GCV(W,R,D);if(g<bk){bk=g;lk=l;}});
kids.forEach(k=>{const s=S[k],f=fitK(k,lk),ix=Object.fromEntries(A.map((a,i)=>[a,i])),d=Object.fromEntries(A.map((a,i)=>[a,f.b[i]]));
const eD=contrast(s,a=>d[a],f.inv,ix,s2),eT=contrast(s,a=>bG[a]+d[a],F.inv,idx,s2);
out[k]={n:Math.round(s.w),a:row(s,eT.map((e,i)=>[e[0],Math.hypot(e[1],eD[i][1])]))};
[1,2,3].forEach(g=>{const q=((T.Q||{})[`${k}|${g}`]);if(q&&q.w>=40)(out[k].h=out[k].h||{})['g'+g]=Object.fromEntries(Object.entries(q.pk).filter(([a])=>A.includes(a)).map(([a,v])=>[a,Math.round(v/(2*q.w)*1000)/10]));});});
lams.push(lk);
});
return{lam:lg,lams,sig:Math.round(Math.sqrt(s2)*1e4)/1e4,rk:P.includes(META_RK)?Math.round(bG[META_RK]*1e4)/100:null,s:out};
}
const metaWin=e=>(ftWin(.5+e/100)-.5)*100;
const META_TIERS=[['S',2],['A',.75],['B',-.75],['C',-2],['D',-Infinity]];
function metaTier(r){
const[e,sd,pk,n,w]=r,dw=metaWin(e),p=sd>0?normCdf(Math.abs(e)/sd):.5;
return{e,sd,dw,pk,n,w,raw:n?w/n:null,t:META_TIERS.find(([,v])=>dw>=v)[0],p,sure:p>=.9?'sur':p>=.75?'prob':'flou',low:n<META_MIN};
}
function metaClean(raw){
if(!obj(raw)||raw.format!=='elitrack-meta'||raw.v!==1||!obj(raw.s)||!obj(raw.s['*']))return null;
const N=v=>typeof v==='number'&&Number.isFinite(v),s={};
Object.entries(raw.s).slice(0,40).forEach(([k,v])=>{if(!/^(\*|[A-Za-z]{3,12}|g[1-3])$/.test(k)||!obj(v)||!N(v.n)||v.n<0||!obj(v.a))return;const a={};
Object.entries(v.a).slice(0,60).forEach(([ag,r])=>{if(/^[A-Za-z][A-Za-z/ ]{1,11}$/.test(ag)&&Array.isArray(r)&&r.length===5&&r.every(N)&&Math.abs(r[0])<50&&r[1]>=0&&r[1]<50&&r[2]>=0&&r[2]<=100&&r[3]>=0&&r[4]>=0&&r[4]<=r[3])a[ag]=r.slice();});
if(!Object.keys(a).length)return;s[k]={n:v.n,a};
if(obj(v.h))['g1','g2','g3'].forEach(g=>{if(!obj(v.h[g]))return;const h={};Object.entries(v.h[g]).slice(0,60).forEach(([ag,p])=>{if(/^[A-Za-z][A-Za-z/ ]{1,11}$/.test(ag)&&N(p)&&p>=0&&p<=100)h[ag]=p;});(s[k].h=s[k].h||{})[g]=h;});});
if(!s['*'])return null;const day=v=>RE_DATE.test(v||'')?v:'';
return{format:'elitrack-meta',v:1,maj:day(raw.maj),du:day(raw.du),au:day(raw.au),region:strMax(raw.region,10),matches:intIn(raw.matches,0,1e7,0),lam:N(raw.lam)?raw.lam:null,rk:N(raw.rk)?raw.rk:null,s};
}
function atlasSites(m,rg){
if(!m)return[];const S=Object.entries(m.s||{}),tot=S.reduce((a,[,v])=>a+v[0],0),G=rg&&m.g?m.g[rg]||{}:null,gt=G?Object.values(G).reduce((a,b)=>a+b,0):0;
return S.map(([s,v])=>({s,n:v[0],w:v[1],share:tot?v[0]/tot:0,win:v[0]?v[1]/v[0]:null,gShare:gt>=30?(G[s]||0)/gt:null})).sort((a,b)=>b.n-a.n);
}
function sitesMe(D,map){
const o={A:{},D:{},nA:0,nD:0},add=(b,s,w)=>{const x=b[s]||(b[s]=[0,0]);x[0]++;if(w)x[1]++;};
(D||[]).filter(d=>d&&(!map||d.map===map)).forEach(d=>{const me=meOf(d);if(me<0)return;const mt=d.pl[me].t;
(d.rounds||[]).forEach(r=>{const side=sideT(r,mt);if(!side)return;const won=(r.w===1)===(mt===1),atkT=side==='A'?mt:1-mt;
if(side==='A')o.nA++;else o.nD++;
if(r.p&&r.pu===atkT&&/^[A-C]$/.test(r.p))add(o[side],r.p,won);});});
const list=side=>{const b=o[side],t=Object.values(b).reduce((a,v)=>a+v[0],0);return Object.entries(b).map(([s,v])=>({s,n:v[0],w:v[1],share:t?v[0]/t:0})).sort((a,b2)=>b2.n-a.n);};
return{A:list('A'),D:list('D'),nA:o.nA,nD:o.nD};
}
function atlasControl(m,cos){
const sa=coSpawn(cos,true),sd=coSpawn(cos,false),dist=(c,s)=>s?Math.hypot(c[2]-s[2],c[3]-s[3]):1,out={};
(cos||[]).forEach(c=>{const z=coLabel(c),v=(m&&m.z[z])||{A:[0,0,0,0,0],D:[0,0,0,0,0]},fs=v.A[4]+v.D[4]>=20;
const def=fs?v.D[4]:v.D[0]+v.D[1],atk=fs?v.A[4]:v.A[0]+v.A[1],da=dist(c,sa),dd=dist(c,sd);
const prior=c[1]==='Site'?.9:/Main|Lobby|Bottom/i.test(c[1])?.25:da/(da+dd),share=(def+6*prior)/(def+atk+6);
out[z]={share,def,atk,kind:c[1]==='Site'||share>=.58?'def':share<=.42?'atk':'mix'};});
return out;
}
function atlasSpots(m,side,cos,ctl){
const C=((m&&m.c)||[]).filter(c=>c[0]===side);if(!C.length)return[];
const p0=C.reduce((a,c)=>a+c[4],0)/Math.max(1,C.reduce((a,c)=>a+c[3],0)),K=ctl||atlasControl(m,cos);
const angZ=(z,ex,ey,d)=>{const z0=coZone(cos,ex,ey);if(z0!==z||d<500)return z0;const o=(cos||[]).filter(q=>coLabel(q)!==z&&/^([A-C]|Mid)$/.test(q[0]));return o.length?coLabel(nearestRegion(o,ex,ey)):z0;};
return C.map(([,x,y,n,w,dx,dy])=>{const z=coZone(cos,x,y),sh=(w+AT_P*p0)/(n+AT_P),ex=x+dx,ey=y+dy,ct=K[z]||{kind:'mix'},d=Math.hypot(dx,dy);
return{x,y,n,w,raw:w/n,sh,p0,z,site:coSite(cos,z),ex,ey,dist:Math.round(d/100),ang:angZ(z,ex,ey,d),
setup:side!=='D'||ct.kind==='def',verdict:n>=30&&sh>=p0+.04?['À jouer','ok']:n>=30&&sh<=p0-.04?['À éviter','bad']:['Correct','warn']};})
.sort((a,b)=>b.sh-a.sh);
}
function atlasZones(m,side,min=20,minR=50){
if(!m)return[];const fsn=(m.fsn||{})[side]||0;
return Object.entries(m.z||{}).map(([z,v])=>{const a=v[side];return{z,k:a[0],d:a[1],fk:a[2],fd:a[3],pres:fsn>=minR?a[4]/fsn:null,rate:a[0]+a[1]?a[0]/(a[0]+a[1]):null,ev:a[0]+a[1]};})
.filter(x=>x.ev>=min||(x.pres||0)>=.05).sort((a,b)=>(b.pres||0)-(a.pres||0)||b.ev-a.ev);
}
function atlasLines(m,side){
if(!m)return[];const E=Object.entries(m.L||{}),tot=E.reduce((a,[,v])=>a+v[0],0);
return E.filter(([k])=>{const[dz,az]=k.split('|');return dz!==az;}).map(([k,v])=>{const[dz,az]=k.split('|');return{me:side==='D'?dz:az,foe:side==='D'?az:dz,n:v[0],share:tot?v[0]/tot:0,rate:side==='D'?v[1]/v[0]:1-v[1]/v[0]};})
.sort((a,b)=>b.n-a.n);
}
function stratIntel(D,map,cos,now){
const I={map,m:0,atk:{n:0,w:0,sites:{},hold:[],fd:[],fdBy:[]},def:{n:0,w:0,sites:{},path:[],fd:[],kills:{},re2:[0,0],re3:[0,0],pt:[]}};
(D||[]).filter(d=>d&&d.map===map).forEach(d=>{
const me=meOf(d);if(me<0)return;I.m++;
const mt=d.pl[me].t,tm=i=>d.pl[i]?d.pl[i].t:null,byR=byRound(d),w0=ageW(d.ts,now,30),siteOf=(x,y)=>{const c=nearestRegion(cos,x,y);return c&&/^[A-C]$/.test(c[0])?c[0]:null;};
const aimed=(r,t)=>{if(r.p&&r.pu>=0&&r.pu===t)return r.p;const z=tally((r.fs||[]).filter(([pi])=>tm(pi)===t).map(([,x,y])=>siteOf(x,y)));return z.length&&z[0][1]>=2?z[0][0]:null;};
d.rounds.forEach((r,ri)=>{
const side=sideT(r,mt);if(!side)return;
const our=mt===1?r.ol:r.tl,their=mt===1?r.tl:r.ol;
const ks=(byR[ri]||[]).slice().sort((a,b)=>a[1]-b[1]),f=ks[0],ourFirst=f&&tm(f[3])===mt,weP=r.pu===mt,wt=w0*((side==='A'?our:their)>=15000?1:.4);
if(side==='A'){
const A=I.atk;A.n++;if(r.w)A.w++;
const s0=aimed(r,mt);
if(s0){const s=A.sites[s0]||(A.sites[s0]={n:0,w:0,cn:0,cw:0,pl:0,tw:[],loc:[],post:[]});s.n+=wt;s.cn++;if(r.w){s.w+=wt;s.cw++;}
if(weP&&r.p===s0){s.pl++;if(r.w){if(r.pt)s.tw.push(r.pt/1000);if(r.pl)s.loc.push(r.pl);(r.ps||[]).forEach(([pi,x,y])=>{if(tm(pi)===mt)s.post.push(coZone(cos,x,y));});}}}
(r.fs||[]).forEach(([pi,x,y])=>{if(tm(pi)!=null&&tm(pi)!==mt)A.hold.push(coZone(cos,x,y));});
if(ourFirst){A.fd.push(coZone(cos,f[4],f[5]));if(f[6]!=null)A.fdBy.push(coZone(cos,f[6],f[7]));}
}else{
const Df=I.def;Df.n++;if(r.w)Df.w++;
const s0=aimed(r,1-mt);
if(s0){const s=Df.sites[s0]||(Df.sites[s0]={n:0,w:0,cn:0,cw:0,t:[]});s.n+=wt;s.cn++;if(r.w){s.w+=wt;s.cw++;}if(r.pu===1-mt&&r.p===s0&&r.pt)s.t.push(r.pt/1000);}
if(r.pu===1-mt&&r.p){if(r.pt)Df.pt.push(r.pt/1000);const alive=d.pl.filter(p=>p.t===mt).length-new Set(ks.filter(k=>k[1]<=r.pt&&tm(k[3])===mt).map(k=>k[3])).size,b=alive>=3?Df.re3:Df.re2;b[0]++;if(r.w)b[1]++;}
(r.fs||[]).forEach(([pi,x,y])=>{if(tm(pi)!=null&&tm(pi)!==mt)Df.path.push(coZone(cos,x,y));});
if(ourFirst)Df.fd.push(coZone(cos,f[4],f[5]));
ks.forEach(k=>{if(tm(k[2])===mt&&tm(k[3])!=null&&tm(k[3])!==mt&&(!r.pt||k[1]<r.pt)&&k[6]!=null){const c=nearestRegion(cos,k[6],k[7]);if(c)(Df.kills[c[0]]=Df.kills[c[0]]||[]).push(coLabel(c));}});
}
});
});
return I;
}
function ecoStats(D){
const o={pis:{A:[0,0],D:[0,0]},bonus:[0,0],afterLoss:[0,0],buy:{}},add=(c,w)=>{c[0]++;if(w)c[1]++;};
(D||[]).forEach(d=>{
const me=meOf(d);if(me<0)return;const mt=d.pl[me].t,R=d.rounds||[],won=r=>(r.w===1)===(mt===1);
R.forEach((r,i)=>{
const side=sideT(r,mt),my=mt===1?r.ol:r.tl,op=mt===1?r.tl:r.ol;
if(i===0||i===12){if(side)add(o.pis[side],won(r));return;}
if((i===1||i===13)&&R[i-1])add(won(R[i-1])?o.bonus:o.afterLoss,won(r));
if(!my||!op)return;const k=BUYK(my)+'|'+BUYK(op);add(o.buy[k]||(o.buy[k]=[0,0]),won(r));
});
});
const sum=keys=>keys.reduce((a,k)=>[a[0]+(o.buy[k]||[0,0])[0],a[1]+(o.buy[k]||[0,0])[1]],[0,0]);
return Object.assign(o,{eco:sum(['eco|eco','eco|force','eco|full']),force:sum(['force|eco','force|force','force|full']),forceFull:sum(['force|full']),fullFull:sum(['full|full']),anti:sum(['full|eco']),fullForce:sum(['full|force'])});
}
function agentsForMap(rows,map){
const st={n:0,w:0,agents:{},maps:{}};
(rows||[]).forEach(r=>{st.n++;if(r.res==='W')st.w++;const a=st.agents[r.agent]||(st.agents[r.agent]={n:0,w:0});a.n++;if(r.res==='W')a.w++;
const m=st.maps[r.map]||(st.maps[r.map]={agents:{}}),x=m.agents[r.agent]||(m.agents[r.agent]={n:0,w:0});x.n++;if(r.res==='W')x.w++;});
return agentPick(st,map,()=>true,4);
}
function rrPlan(hist,tier,rr,target){
const H=(hist||[]).filter(h=>Number.isFinite(h.ch)&&h.ch!==0).slice(-30),G=H.filter(h=>h.ch>0),L=H.filter(h=>h.ch<0);
if(!(tier>=3)||rr==null||!(target>tier)||target>24||tier>=24)return null;
const need=(target-tier)*100-rr,g=G.length?G.reduce((s,h)=>s+h.ch,0)/G.length:null,l=L.length?-L.reduce((s,h)=>s+h.ch,0)/L.length:null;
if(H.length<5||g==null)return{need,n:H.length,few:true};
const p=G.length/H.length,per=p*g-(1-p)*(l||0);
return{need,n:H.length,g,l,p,per,wins:Math.ceil(need/g),games:per>0?Math.ceil(need/per):null};
}
function weekChallenges(rows,now,limit,focus){
const R=(rows||[]).slice().sort((a,b)=>b.ts-a.ts),d0=new Date(now);d0.setHours(0,0,0,0);d0.setDate(d0.getDate()-(d0.getDay()+6)%7);
const W=R.filter(r=>r.ts>=d0.getTime()),B=rowsAgg(R.filter(r=>r.ts<d0.getTime()).slice(0,30)),hsOf=r=>{const s=r.hs+r.bs+r.ls;return s>=20?r.hs/s*100:null;};
const hsT=Math.min(40,Math.max(15,Math.round((B.hsP||18)+2)));
const S=sessionsOf(W),maxS=S.reduce((m,s)=>Math.max(m,s.length),0),lim=limit||5;
const c=(id,t,cur,goal,inv)=>({id,t,cur,goal,done:inv?W.length>0&&cur<=goal:cur>=goal,inv:!!inv});
return[focus&&c('focus',focus.t,focus.cur,focus.goal),
c('hs',`3 parties avec au moins ${hsT} % de tirs à la tête`,W.filter(r=>(hsOf(r)||0)>=hsT).length,3),
c('win','Gagne 5 parties classées',W.filter(r=>r.res==='W').length,5),
c('stop',`Jamais plus de ${lim} parties dans la même session`,maxS,lim,true)].filter(Boolean);
}
function badges(rows,D,hist){
const out={},got=(id,ts)=>{if(ts&&(!out[id]||ts<out[id]))out[id]=ts;},R=(rows||[]).slice().sort((a,b)=>a.ts-b.ts);
let run=0;R.forEach(r=>{run=r.res==='W'?run+1:0;if(run>=5)got('serie5',r.ts);if(run>=10)got('serie10',r.ts);
if(r.k>=30)got('k30',r.ts);if(r.sc/r.r>=300)got('acs300',r.ts);const s=r.hs+r.bs+r.ls;if(s>=40&&r.hs/s>=.35)got('hs35',r.ts);
if(r.k>=15&&(r.d===0||r.k/r.d>=3))got('kd3',r.ts);if(r.res==='W'&&r.them<=3)got('ecrase',r.ts);});
if(R.length>=50)got('p50',R[49].ts);
(D||[]).forEach(d=>{
const me=meOf(d);if(me<0)return;const o=pDetail(d,me);if(!o)return;const ts=d.ts||1;
if(o.mk[5])got('ace',ts);if(o.mk[4]||o.mk[5])got('k4',ts);
if([2,3,4,5].some(n=>o.cl[n][1]))got('cl2',ts);if([3,4,5].some(n=>o.cl[n][1]))got('cl3',ts);
if(o.fk>=5)got('fk5',ts);const pl=d.pl||[],m=pl[me];if(m&&pl.length>=10&&!pl.some(p=>p.sc>m.sc))got('mvp',ts);
});
const H=(hist||[]).slice().sort((a,b)=>a.ts-b.ts);for(let i=1;i<H.length;i++)if(H[i].t>H[i-1].t&&H[i-1].t>=3){got('promo',H[i].ts);break;}
return out;
}
const trLevel=t=>!(t>=3)?1:t<=11?0:t<=17?1:t<=23?2:3;
const TR_FOCUS={hs:['xhair','micro'],op:['peek','strafe'],fd:['peek'],tr:['dm'],dmg:['spray','tracking'],b0:['tracking','switch'],b1:['strafe','flick'],b2:['micro','spray'],
adr:['spray','tracking'],trk:['dm','switch'],clW:['micro','dm'],surv:['peek'],kast:['dm'],cast:[],
io:['peek','strafe'],im:['spray','tracking'],it:['dm'],ic:['micro'],ip:['dm'],ir:['dm','switch'],
up_hsP:['xhair','micro'],up_trP:['dm'],up_trk:['dm','switch'],up_cast:[]};
function trPlaylists(focus,lv,ctx,tool,list){
const t=tool==='kovaaks'?'kovaaks':'aimlab',F=focus||[],L=(list||[]).filter(p=>p.tool===t&&(p.lv||[]).includes(lv));
const score=p=>p.f.filter(k=>F.includes(k)).length*2+(F.length?0:p.f.length*.1);
const main=L.filter(p=>p.use===ctx).sort((a,b)=>score(b)-score(a)||a.min-b.min).slice(0,2);
return[...main,...L.filter(p=>p.use==='test').slice(0,1)];
}
const trFocus=keys=>[...new Set((keys||[]).flatMap(k=>TR_FOCUS[k]||[]))];
function trRoutine(focus,minutes,ctx,drills,role){
const has=k=>!!(drills&&drills[k]),uniq=a=>[...new Set(a.filter(has))],F=(focus||[]).filter(has),RD={Duelist:'r_duel',Controller:'r_ctrl',Initiator:'r_init',Sentinel:'r_sent'};
let L=ctx==='echauffement'?uniq([F[0]||'micro','strafe','dm']):uniq([...F.slice(0,3),RD[role]||'','dm']);
['flick','tracking','spray','switch'].forEach(k=>{if(L.length<(ctx==='echauffement'?3:4)&&has(k)&&!L.includes(k))L.splice(Math.max(0,L.length-1),0,k);});
const M=Math.max(5,Math.min(90,Math.round(minutes)||20));if(M<12&&L.length>2)L=[L[0],L[L.length-1]];
const tot=L.reduce((s,k)=>s+drills[k].base,0)||1,out=L.map(k=>({k,min:Math.max(2,Math.round(drills[k].base*M/tot))}));
const diff=M-out.reduce((s,b)=>s+b.min,0);if(out.length)out[out.length-1].min=Math.max(2,out[out.length-1].min+diff);
return out;
}
function trWeek(focus,playDays,drills){
const pd=playDays||[],F0=(focus||[]).filter(k=>drills&&drills[k]),F=F0.length>=2?F0:[...F0,...['strafe','micro','flick','tracking'].filter(x=>!F0.includes(x)&&drills&&drills[x])].slice(0,F0.length?3:4);
const out=[];let j=0,prog=0,rev=false;
for(let i=0;i<7;i++){
const a=F[j%F.length],b=F[(j+1)%F.length],rk=pd.includes(i);
if(!rev&&(i===2||i===5)){rev=true;out.push([i,'revue',[],rk?30:20,rk]);continue;}
if(prog<4&&(!rk||i%2===0)&&!(i===6&&prog>=3)){prog++;out.push([i,'progression',[a,b],rk?35:25,rk]);j++;continue;}
out.push(rk?[i,'echauffement',[a,'dm'],15,rk]:[i,'repos',[],0,rk]);if(rk)j++;
}
return out;
}
function rxSum(list){
const L=(list||[]).filter(x=>x&&x.ms>50&&x.ms<2000);if(!L.length)return null;
const last=L[L.length-1].ms,usual=median(L.slice(0,-1).slice(-10).map(x=>x.ms)),diff=usual?(last-usual)/usual*100:null;
return{last,usual,diff,n:L.length,best:Math.min(...L.map(x=>x.ms)),state:diff==null?'':diff>=8?'fatigue':diff<=-5?'forme':'normal'};
}
function trStreak(dates,todayIso){
const S=new Set(dates||[]),d=new Date(todayIso+'T12:00:00');if(isNaN(d))return 0;
const iso=x=>x.toISOString().slice(0,10);if(!S.has(iso(d)))d.setDate(d.getDate()-1);
let n=0;while(S.has(iso(d))&&n<3650){n++;d.setDate(d.getDate()-1);}
return n;
}
const hexRgb=h=>{const m=/^#?([0-9a-f]{6})$/i.exec(String(h||'').trim());if(!m)return null;const v=parseInt(m[1],16);return[v>>16&255,v>>8&255,v&255];};
const rgbHex=c=>'#'+c.map(x=>clampN(Math.round(x),0,255).toString(16).padStart(2,'0')).join('');
const mixHex=(a,b,t)=>{const A=hexRgb(a),B=hexRgb(b);return A&&B?rgbHex(A.map((x,i)=>x+(B[i]-x)*t)):a;};
const relLum=h=>{const c=hexRgb(h);if(!c)return 0;const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4;};return.2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2]);};
const contrast=(a,b)=>{const x=relLum(a),y=relLum(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
function readable(c,bg,min=4.5){if(!hexRgb(c))return'#ffffff';let x=c;for(let i=1;i<=20&&contrast(x,bg)<min;i++)x=mixHex(c,'#ffffff',i/20);return x;}
const THEME_DEF={mode:'auto',agent:'',map:'',bg:'auto',blur:0,dark:70,fx:'aucun',accent:'',fontT:'auto',fontB:'systeme',radius:14,density:'confort',cards:'plein',anim:true,streamer:false,blocks:[],hidden:['agents','cartes','records']};
const THEME_ENUM={mode:['auto','dernier','neutre','agent','rang','carte','cartejoueur','perso'],bg:['auto','art','portrait','splash','card','degrade','image'],
fx:['auto','aucun','grain','scan','neon','particules'],fontT:['auto','systeme','marker','teko','bebas','rajdhani','orbitron','oxanium','russo','chakra','exo','anton'],
fontB:['systeme','rajdhani','exo','chakra','oxanium'],density:['confort','compact'],cards:['verre','plein','neon']};
const BLOCKS=['session','kpis','objectif','rr','forme','dernier','defis','agents','cartes','records','succes'];
const THEME_FREE={mode:['auto','dernier','neutre'],keep:['blur','dark','density','anim','streamer']};
function themeClean(raw){
const r=obj(raw)?raw:{},o=JSON.parse(JSON.stringify(THEME_DEF));
Object.entries(THEME_ENUM).forEach(([k,v])=>{if(v.includes(r[k]))o[k]=r[k];});
o.agent=typeof r.agent==='string'&&/^[A-Za-z/ ]{2,12}$/.test(r.agent)?r.agent:'';
o.map=typeof r.map==='string'&&/^[A-Za-z]{3,12}$/.test(r.map)?r.map:'';
o.accent=hexRgb(r.accent)?'#'+String(r.accent).trim().replace('#','').toLowerCase():'';
o.blur=intIn(r.blur,0,20,o.blur);o.dark=intIn(r.dark,30,95,o.dark);o.radius=intIn(r.radius,0,24,o.radius);
o.anim=r.anim!==false;o.streamer=r.streamer===true;
o.blocks=Array.isArray(r.blocks)?[...new Set(r.blocks.filter(b=>BLOCKS.includes(b)))]:[];
o.hidden=Array.isArray(r.hidden)?[...new Set(r.hidden.filter(b=>BLOCKS.includes(b)))]:o.hidden;
return o;
}
function themeFree(t){
const o=JSON.parse(JSON.stringify(THEME_DEF)),c=themeClean(t);
if(THEME_FREE.mode.includes(c.mode))o.mode=c.mode;THEME_FREE.keep.forEach(k=>{o[k]=c[k];});
return o;
}
const themeDiff=t=>{const c=themeClean(t),f=themeFree(c);return Object.keys(c).filter(k=>JSON.stringify(c[k])!==JSON.stringify(f[k]));};
const themeCode=t=>{const c=themeClean(t);return'PHT1.'+b64uEnc(utf8(JSON.stringify(c)));};
function themeParse(code){
const m=/^PHT1\.([A-Za-z0-9_-]{4,3000})$/.exec(String(code||'').replace(/\s+/g,''));if(!m)return null;
const b=b64uDec(m[1]);if(!b)return null;try{return themeClean(JSON.parse(fromUtf8(b)));}catch(e){return null;}
}
return{esc,toNum,
wilson,trust,rateTip,nthStats,nightLimit,lobbyPlace,weaponStats,
smooth,weekStart,pAgg,agentPick,stackStats,lobbyPct,wellImpact,habitDays,records,stepGoal,HOURS,hourBucket,
divOf,pctRank,benchPct,pDetail,castRates,agentMeta,coverage,MOVERS,copyPhase,fromCv,nearestRegion,
GUN,DBANDS,BAND_FR,duelStats,sensHint,psaStart,psaStep,sensHistPush,sensPeriods,meanCmp,trialVerdict,trainEffect,
frList,JOURS,
ridNorm,b64uEnc,b64uDec,utf8,fromUtf8,LIC_PLANS,licBody,licHead,licParse,licCheck,LIC_WHY,LIC_DUR,licExp,jwkPub,
FEATURES,PREM_DEF,featOn,PUB_DEF,httpsUrl,isGoogle,proxyUrl,pubCfg,smRow,rowsAgg,aggBy,mainAgent,sessionsOf,serieOf,
v4Detail,detTrim,plLines,BUYK,wpFit,wpProb,flowOf,matchSum,coachPub,
RANK_FR,rankOf,PG_KEYS,pgAll,benchAdd,benchClean,benchRef,MET,metV,metSE,refMix,COACH_RULES,COACH_CATS,coachV2,RANK_METS,
ERR_DEF,ERR_KEYS,ERR_CAUSE,CAUSE_KEYS,causeOf,sightOf,PG_OPT,ECO_DEF,ecoDesync,ecoAgg,agentAdd,agentUse,deathsOf,errLessons,errFix,errAgg,focusPick,focusEval,focusBase,tiltOf,
coLabel,coFind,coZone,coSite,coPlay,coSpawn,coSites,zProp,posControl,posDuels,posCluster,posSpots,posZones,posThreats,posGap,
rgOf,RG_FR,atlasAdd,atlasPack,atlasClean,v4Keep,aggNew,aggDecay,aggAge,aggMatch,aggDetail,aggPublish,META_RK,META_MIN,META_TIERS,metaNew,metaAdd,ftWin,normCdf,metaFit,metaWin,metaTier,metaClean,atlasSites,sitesMe,atlasControl,atlasSpots,atlasZones,atlasLines,
stratIntel,ecoStats,agentsForMap,rrPlan,weekChallenges,badges,trLevel,TR_FOCUS,trFocus,trPlaylists,trRoutine,trWeek,rxSum,trStreak,
hexRgb,rgbHex,mixHex,relLum,contrast,readable,THEME_DEF,THEME_ENUM,BLOCKS,themeClean,themeFree,themeDiff,themeCode,themeParse};
});
;
"use strict";
const LIC_ALGO={name:'ECDSA',namedCurve:'P-256'},LIC_SIG={name:'ECDSA',hash:'SHA-256'};
const LIC={
ok:()=>!!(window.crypto&&crypto.subtle),
async genKeys(){
const k=await crypto.subtle.generateKey(LIC_ALGO,true,['sign','verify']);
const priv=await crypto.subtle.exportKey('jwk',k.privateKey),pub=jwkPub(await crypto.subtle.exportKey('jwk',k.publicKey));
return{priv:{kty:'EC',crv:'P-256',x:priv.x,y:priv.y,d:priv.d},pub};
},
async sign(privJwk,p){
const key=await crypto.subtle.importKey('jwk',Object.assign({},privJwk,{ext:true,key_ops:['sign']}),LIC_ALGO,false,['sign']);
const head=licHead(p),sig=new Uint8Array(await crypto.subtle.sign(LIC_SIG,key,utf8(head)));
return head+'.'+b64uEnc(sig);
},
async verify(pubJwk,code){
const P=licParse(code);if(P.err)return P;
const pub=jwkPub(pubJwk);if(!pub)return{err:'cle'};
try{
const key=await crypto.subtle.importKey('jwk',Object.assign({},pub,{ext:true,key_ops:['verify']}),LIC_ALGO,false,['verify']);
return await crypto.subtle.verify(LIC_SIG,key,P.sig,utf8(P.head))?{p:P.p}:{err:'signature'};
}catch(e){return{err:'signature'};}
},
async pairOk(privJwk,pubJwk){
try{const p={id:'test-0000',rid:'test#0000',plan:'premium',iat:'2026-01-01',exp:''};return!!(await LIC.verify(pubJwk,await LIC.sign(privJwk,p))).p;}catch(e){return false;}
},
async thumb(pubJwk){
const pub=jwkPub(pubJwk);if(!pub)return'';
const h=new Uint8Array(await crypto.subtle.digest('SHA-256',utf8(pub.x+'.'+pub.y)));
return[...h.slice(0,4)].map(b=>b.toString(16).padStart(2,'0')).join('').toUpperCase();
},
newId:()=>'L-'+[...crypto.getRandomValues(new Uint8Array(6))].map(b=>b.toString(36).padStart(2,'0')).join('').slice(0,10).toUpperCase()
};
;
"use strict";
window.KITS={
Astra:['41fb69c1-4189-7b37-f117-bcaf1e96f1bf','Puits de gravité|ab','Impulsion nova|flash','Nébuleuse|smoke','Forme astrale|ult'],
Breach:['5f8d3a7f-467b-97f3-062c-13acf203c006','Réplique|molly','Point d\'ignition|flash','Ligne de fracture|flash','Onde sismique|ult'],
Brimstone:['9f0d8ba9-4140-b941-57d3-a7ad57c6b417','Balise stimulante|ab','Bombe incendiaire|molly','Frappe fumigène|smoke','Rayon orbital|ult'],
Chamber:['22697a3d-45bf-8dd7-4fec-84a9e28c69d7','Guet-apens|trap','Chasseur de têtes|ab','Rendez-vous|ab','Tour de force|ult'],
Clove:['1dbf2edd-4729-0984-3115-daa5eed44993','Coup de boost|ab','Trouble-fête|molly','Ruse|smoke','Toujours debout|ult'],
Cypher:['117ed9e3-49f3-6512-3ccf-0cada7e3823b','Fil de détente|trap','Cybercage|smoke','Caméra espionne|recon','Vol neural|ult'],
Deadlock:['cc8b64c8-4b25-4ff9-6e7f-37b4da43d235','Disque barrière|wall','Radar ultrason|trap','GravNet|ab','Annihilation|ult'],
Fade:['dade69b4-4f5a-8528-247b-219e5a1facd6','Rôdeur|flash','Capture|ab','Hanteur|recon','Nuit tombante|ult'],
Gekko:['e370fa57-4757-3604-3648-499e1f642d3f','Pogo|molly','Altego|flash','Verti|flash','Mordicus|ult'],
Harbor:['95b78ed7-4637-86d9-7e41-71ba8c293152','Tempête déferlante|flash','Marée haute|wall','Dôme aqueux|smoke','Raz-de-marée|ult'],
Iso:['0e38b510-41a8-5780-5e8f-568b2a4f2d6c','Contingence|wall','Sape|ab','Tir couplé|ab','Duel à huis clos|ult'],
Jett:['add6443a-41bd-e414-f6ad-e58d267f4e95','Averse|smoke','Courant ascendant|ab','Vent arrière|ab','Tempête de lames|ult'],
'KAY/O':['601dbbe7-43ce-be57-2a40-4abd24953621','FRAG/ment|molly','MÉMOIRE/flash|flash','POINT/zéro|recon','CMD/null|ult'],
Killjoy:['1e58de9c-4950-5125-93e9-a0aee9f98746','Essaim de nanites|molly','Bot-alarme|trap','Tourelle|recon','Confinement|ult'],
Miks:['7c8a4701-4de6-9355-b254-e09bc2a34b72','M-pulsion|flash','Harmonisation|ab','Forme d\'onde|smoke','Basse sismique|ult'],
Neon:['bb2a4828-46eb-8cd1-e765-15848195d751','Voie rapide|wall','Éclair relais|flash','Vitesse supérieure|ab','Ultra-vitesse|ult'],
Omen:['8e253930-4c05-31dd-1b6c-968525494517','Voie des ombres|ab','Paranoïa|flash','Voile sombre|smoke','Depuis les ombres|ult'],
Phoenix:['eb93336a-449b-9c1b-0a54-a891f7921d69','Brasier|wall','Mains brûlantes|molly','Balle courbe|flash','Revanche|ult'],
Raze:['f94c3b30-42be-e959-889c-5aa313dba261','Boum Bot|ab','Pack explosif|ab','Grenade gigogne|molly','Bouquet final|ult'],
Reyna:['a3bfb853-43b2-7238-a4f1-ad90e9e46bcc','Œillade|flash','Dévoration|ab','Rebuffade|ab','Impératrice|ult'],
Sage:['569fdd95-4d10-43ab-ca70-79becc718b46','Orbe barrière|wall','Orbe de lenteur|molly','Orbe de soin|ab','Résurrection|ult'],
Skye:['6f2a04ca-43e0-be17-7f36-b3908627744d','Revitalisation|ab','Éclaireur|recon','Guide éclatant|flash','Traqueurs|ult'],
Sova:['320b2a48-4d9b-a075-30f1-1f93a9b638fa','Drone rapace|recon','Électroflèche|molly','Flèche de reconnaissance|recon','Fureur du chasseur|ult'],
Tejo:['b444168c-4e35-8076-db47-ef9bf368f384','Drone furtif|recon','Livraison spéciale|flash','Salve autoguidée|molly','Apocalypse|ult'],
Veto:['92eeef5d-43b5-1d4a-8d03-b3927a09034b','Vortex|ab','Étranglement|trap','Intercepteur|ab','Évolution|ult'],
Viper:['707eab51-4836-f488-046a-cda6bf494859','Morsure du serpent|molly','Nuage de poison|smoke','Écran toxique|wall','Nid de vipères|ult'],
Vyse:['efba5359-4016-a1e5-7626-b1ae76895940','Ronces barbelées|molly','Cisaille|wall','Rose métallique|flash','Jardin d\'acier|ult'],
Waylay:['df1cb487-4902-002e-5c17-d28e83e78588','Saturation|flash','Vitesse lumière|ab','Réfraction|ab','Croisée des chemins|ult'],
Yoru:['7f94d92c-4234-0a36-9646-3a87eb8b5c89','Feinte|ab','Angle mort|flash','Visite surprise|ab','Transfert dimensionnel|ult']
};
;
window.CALLOUTS={"Abyss":[["A","Bridge",5700,-375],["A","Link",2800,-2450],["A","Lobby",3250,3400],["A","Main",3800,1650],["A","Site",4300,-200],["Attacker Side","Spawn",950,4950],["A","Tower",3025,-125],["Mid","Bend",-1700,1075],["B","Link",-2000,-2350],["B","Lobby",-3650,4025],["B","Main",-4450,1525],["B","Nest",-4975,2150],["Mid","Bottom",-400,575],["B","Site",-4425,-1175],["Mid","Catwalk",600,525],["B","Danger",-5850,700],["Defender Side","Spawn",950,-5275],["Mid","Library",-325,-600],["A","Secret",3775,-3850],["A","Security",4900,-2975],["Mid","Top",775,-2375],["B","Tower",-3925,-2500],["A","Vent",1700,-325]],
"Ascent":[["A","Tree",3981,-5939],["A","Lobby",4489,-3014],["A","Main",5322,-4710],["A","Window",4023,-8181],["A","Site",6154,-6626],["Attacker Side","Spawn",60,50],["B","Lobby",-1491,-1390],["B","Main",-1984,-5841],["B","Boat House",-4485,-7763],["Mid","Bottom",1122,-5952],["B","Site",-2344,-7549],["Mid","Catwalk",2316,-4127],["Mid","Cubby",3387,-5130],["Defender Side","Spawn",1995,-9745],["A","Garden",3774,-7551],["Mid","Market",1089,-7363],["Mid","Courtyard",1223,-4587],["Mid","Link",-632,-4280],["Mid","Pizza",1802,-7262],["A","Rafters",6130,-8210],["Mid","Top",2754,-2130],["A","Wine",7359,-4689]],
"Bind":[["A","Exit",7550,5874],["A","Link",6366,-1007],["A","Lobby",6113,3159],["A","Short",7983,804],["A","Site",10748,2664],["A","Teleporter",9432,490],["Attacker Side","Spawn",162,78],["B","Exit",8921,-1763],["B","Hall",12982,-4942],["B","Link",6362,-2621],["B","Fountain",5737,-5390],["B","Long",7667,-6513],["B","Short",7424,-3056],["B","Site",11108,-4831],["B","Teleporter",9028,-7224],["B","Window",8827,-4309],["A","Bath",9107,4450],["Attacker Side","Cave",3920,257],["A","Cubby",8605,175],["Defender Side","Spawn",14642,-1018],["B","Elbow",11213,-7095],["B","Garden",9144,-5598],["A","Lamps",10649,80],["A","Tower",12873,2557]],
"Breeze":[["Mid","Hall",4257,2491],["A","Bridge",8400,3525],["Defender Side","Spawn",8900,3525],["Defender Side","Arches",9400,-1300],["Mid","Wood Doors",4825,2550],["Mid","Pillar",4175,475],["Mid","Top",6175,525],["Mid","Nest",8650,275],["B","Window",2225,-4175],["B","Main",3550,-4450],["B","Elbow",4675,-2900],["B","Site",6450,-5650],["B","Tunnel",6450,-1450],["A","Ramp",7300,2725],["B","Back",7550,-5675],["B","Wall",8550,-3000],["Mid","Cannon",2900,-1850],["Mid","Bottom",1575,475],["A","Lobby",-1250,3400],["A","Shop",2150,4250],["A","Site",4825,6325],["A","Pyramids",5200,5450],["Attacker Side","Spawn",-575,-450]],
"Corrode":[["A","Crane",4458,-3999],["A","Elbow",5583,-2074],["A","Link",1783,-1050],["A","Lobby",4333,2600],["A","Main",5933,1225],["A","Pocket",5583,-799],["A","Site",3458,-1825],["Attacker Side","Spawn",-25,5675],["A","Yard",4333,-800],["B","Arch",-3217,-4400],["B","Elbow",-5592,-2925],["B","Link",-1292,-1825],["B","Lobby",-1667,2775],["B","Main",-2717,750],["Mid","Bottom",133,175],["B","Site",-2717,-1175],["B","Tower",-3517,-2925],["Defender Side","Spawn",8,-5750],["Mid","Stairs",133,-1475],["Mid","Window",133,-3100],["Mid","Top",133,-1825]],
"Fracture":[["Attacker Side","Bridge",13204,-756],["B","Bench",11473,-2897],["B","Arcade",10181,-4179],["B","Tower",9155,-5601],["B","Site",8178,-5942],["B","Generator",8362,-3380],["B","Link",9198,-2741],["B","Canteen",7111,-3138],["A","Link",8578,1302],["Defender Side","Spawn",9156,-677],["B","Main",5967,-5343],["B","Tree",4965,-4109],["B","Tunnel",7402,-4058],["A","Hall",5064,2058],["A","Door",5808,1940],["A","Rope",6639,1053],["A","Main",5879,3451],["A","Site",8126,3374],["A","Drop",9307,2826],["A","Dish",11297,1392],["A","Gate",12962,1565],["Attacker Side","Spawn",4346,-948]],
"Haven":[["A","Garden",3100,-4684],["A","Link",4244,-10716],["A","Lobby",3439,-6260],["A","Long",6210,-6901],["A","Sewer",3453,-7916],["A","Site",6309,-9226],["Attacker Side","Spawn",1742,-2643],["B","Back",1966,-10665],["B","Site",1885,-9231],["C","Link",-88,-10004],["C","Lobby",-1642,-5720],["C","Long",-3357,-5991],["C","Garage",180,-8000],["C","Window",-10,-8993],["C","Site",-2378,-9011],["C","Cubby",-2120,-6562],["Defender Side","Spawn",2946,-12715],["Mid","Doors",151,-6263],["Mid","Courtyard",1822,-6713],["Mid","Window",1950,-5568],["A","Tower",6721,-10473]],
"Icebox":[["B","Garage",-1250,-1425],["A","Belt",-7200,-850],["A","Nest",-6650,900],["A","Pipes",-6150,450],["A","Rafters",-6450,4250],["A","Screen",-5100,3325],["A","Site",-6400,3200],["Attacker Side","Spawn",-3925,-4450],["B","Yellow",2050,-25],["B","Back",251,4269],["B","Cubby",1050,-975],["B","Green",-450,-700],["B","Hall",300,3050],["B","Hut",-1425,4400],["B","Kitchen",-2221,3404],["B","Orange",-632,1700],["B","Site",1725,2575],["B","Snowman",2250,3960],["B","Snow Pile",-1775,2500],["B","Tube",-2300,1275],["Defender Side","Spawn",-3750,7075],["Mid","Blue",-2825,975],["Mid","Boiler",-3375,2925],["Mid","Pallet",-4450,1775],["B","Fence",363,3595]],
"Lotus":[["A","Top",9260,5046],["A","Drop",9516,6093],["A","Site",7736,5557],["A","Hut",7917,5557],["A","Tree",6150,5557],["A","Door",5609,5204],["A","Main",5288,4160],["A","Rubble",4401,4918],["A","Root",4401,3294],["A","Lobby",2686,2927],["C","Lobby",1404,-1577],["B","Pillars",3565,668],["B","Main",4877,-48],["C","Door",4819,-1753],["B","Site",6368,668],["A","Link",6011,2088],["B","Upper",7683,1517],["C","Waterfall",6720,-1994],["C","Link",7504,-1378],["A","Stairs",8258,3861],["C","Mound",3864,-1577],["C","Main",5311,-3148],["C","Bend",5658,-5281],["C","Site",6677,-4266],["C","Hall",7902,-4266],["C","Gravel",8937,-1752],["Defender Side","Spawn",9687,1698],["Attacker Side","Spawn",1401,777]],
"Pearl":[["B","Hall",7496,-4954],["Mid","Doors",4701,597],["Mid","Connector",6047,1800],["Defender Side","Water",7808,1800],["Defender Side","Spawn",11092,379],["A","Flowers",9264,2507],["A","Secret",10458,3832],["A","Dugout",7661,5854],["A","Site",6614,5570],["Defender Side","Records",8973,-1470],["Mid","Top",2075,725],["B","Tunnel",8973,-2155],["B","Tower",8533,-2851],["A","Main",6369,3825],["A","Restaurant",4430,2813],["B","Link",4503,-592],["A","Art",4562,3407],["A","Link",6055,3783],["Mid","Plaza",2750,-325],["Mid","Shops",800,-1450],["B","Club",800,-1450],["B","Ramp",1750,-3800],["B","Main",4050,-4375],["B","Site",5800,-2850],["B","Screen",6260,-5001],["Attacker Side","Spawn",-550,-600]],
"Split":[["A","Back",7345,-7858],["A","Lobby",6814,-2458],["A","Main",6280,-4493],["A","Rafters",5435,-6258],["A","Ramps",4330,-4750],["A","Screens",5649,-8869],["A","Sewer",4863,-2367],["A","Site",6589,-6761],["A","Tower",4637,-6748],["Attacker Side","Spawn",1902,60],["B","Alley",-1158,-8066],["B","Back",-3107,-7417],["B","Link",-28,-2370],["B","Garage",-2191,-3848],["B","Rafters",-637,-6071],["B","Site",-2167,-6265],["B","Stairs",1061,-6761],["B","Tower",169,-5290],["B","Lobby",-1272,-1984],["Defender Side","Spawn",2142,-8965],["Mid","Bottom",1923,-2899],["Mid","Mail",1155,-4809],["Mid","Top",2022,-4597],["Mid","Vent",3155,-5339]],
"Summit":[["Mid","Bottom",7500,5825],["Mid","Top",4025,6525],["A","Lobby",3175,8625],["A","Main",5500,8625],["A","Garden",7675,9925],["A","Site",7675,11600],["A","Art",9525,9925],["A","Cave",9525,12125],["A","Hall",9525,8600],["A","Link",8250,8050],["B","Lobby",5125,3225],["Defender Side","Spawn",12075,6175],["Mid","Window",8700,5825],["B","Gym",10525,3100],["B","Trophy",9075,3675],["B","Tower",10175,1450],["B","Drop",9850,75],["B","Site",8550,1375],["B","Link",7500,3775],["Mid","Fountain",5675,6175],["Mid","Bend",6475,7850],["Mid","Tiles",4961,4234],["B","Main",6500,1850],["Attacker Side","Spawn",1100,-100]],
"Sunset":[["B","Boba",2200,-4800],["Mid","Tiles",-1800,400],["B","Market",-200,-3400],["B","Site",-600,-5850],["B","Main",-2000,-5650],["B","Lobby",-3400,-2600],["Mid","Bottom",-1800,-2025],["Mid","Courtyard",-600,-1200],["A","Lobby",-1800,2000],["A","Main",-400,2200],["A","Link",2200,3000],["A","Site",1000,3200],["A","Elbow",200,4200],["A","Alley",3400,3600],["Defender Side","Spawn",3805,-1989],["Mid","Top",2000,-2000],["Attacker Side","Spawn",-6025,-400]]};
;
"use strict";
const VA='https://media.valorant-api.com';
const TIERS_ID='03621f52-342b-cf4e-4f86-9350a49c6d04';
const ROLE_OF={Iso:'Duelist',Jett:'Duelist',Neon:'Duelist',Phoenix:'Duelist',Raze:'Duelist',Reyna:'Duelist',Waylay:'Duelist',Yoru:'Duelist',
Breach:'Initiator',Fade:'Initiator',Gekko:'Initiator','KAY/O':'Initiator',Skye:'Initiator',Sova:'Initiator',Tejo:'Initiator',
Astra:'Controller',Brimstone:'Controller',Clove:'Controller',Harbor:'Controller',Miks:'Controller',Omen:'Controller',Viper:'Controller',
Chamber:'Sentinel',Cypher:'Sentinel',Deadlock:'Sentinel',Killjoy:'Sentinel',Sage:'Sentinel',Veto:'Sentinel',Vyse:'Sentinel'};
const ROLE_FR={Duelist:'Duelliste',Initiator:'Initiateur',Controller:'Contrôleur',Sentinel:'Sentinelle'};
const AGENT_COL={Iso:'#8a6bff',Jett:'#7fd0ff',Neon:'#2f8cff',Phoenix:'#ff7a2f',Raze:'#ff9a1f',Reyna:'#b44cff',Waylay:'#ffd36b',Yoru:'#3a5cff',
Breach:'#ff6a3d',Fade:'#7d6bd8',Gekko:'#b6ff3b','KAY/O':'#62b8ff',Skye:'#6fd65a',Sova:'#4a8cff',Tejo:'#f0a83c',
Astra:'#c46bff',Brimstone:'#ff8a3d',Clove:'#ff6fae',Harbor:'#19c3d6',Miks:'#7dd3fc',Omen:'#6d5bff',Viper:'#3cff7a',
Chamber:'#e0b84a',Cypher:'#d9dde3',Deadlock:'#9fc3d9',Killjoy:'#ffd400',Sage:'#3fe0c5',Veto:'#6ee7b7',Vyse:'#b38cff'};
const ROLE_STYLE={Duelist:{font:'bebas',fx:'neon'},Initiator:{font:'rajdhani',fx:'scan'},Controller:{font:'orbitron',fx:'particules'},Sentinel:{font:'chakra',fx:'grain'}};
const MAP_ID={Ascent:'7eaecc1b-4337-bbf6-6ab9-04b8f06b3319',Split:'d960549e-485c-e861-8d71-aa9d1aed12a2',Fracture:'b529448b-4d60-346e-e89e-00a4c527a405',
Bind:'2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba',Breeze:'2fb9a4fd-47b8-4e7d-a969-74b4046ebd53',Abyss:'224b0a95-48b9-f703-1bd8-67aca101a61f',
Lotus:'2fe4ed3a-450a-948b-6d6b-e89a78e680a9',Sunset:'92584fbe-486a-b1b2-9faa-39b0f486b498',Pearl:'fd267378-4d1d-484f-ff52-77821ed10dc2',
Summit:'756da597-416b-c0f2-f47b-afbdf28670bc',Icebox:'e2ad5c54-4114-a870-9641-8ea21279579a',Corrode:'1c18ab1f-420d-0d8b-71d0-77ad3c439115',
Haven:'2bee0dc9-4ffe-519b-1cbd-7fbe763a6047'};
const MAP_COL={Ascent:'#e3b26a',Bind:'#e07b39',Haven:'#d6a94a',Split:'#5fc3b3',Icebox:'#7fd1f0',Breeze:'#3fd0c9',Fracture:'#ff6a45',Pearl:'#4a9cff',
Lotus:'#c46ad6',Sunset:'#ff8a4c',Abyss:'#7b8cff',Corrode:'#9bd16a',Summit:'#a0c8ff'};
const TIER_FR=['Fer','Bronze','Argent','Or','Platine','Diamant','Ascendant','Immortel'];
const TIER_COL=['#9a9d9a','#c0844f','#d5dde0','#eccf56','#59c3c9','#c88bf0','#3fd68f','#e0456f','#ffe9a0'];
const tierFr=id=>{id=Math.round(id||0);return id>=27?'Radiant':id>=3?`${TIER_FR[Math.floor((id-3)/3)]} ${(id-3)%3+1}`:'Non classé';};
const tierCol=id=>id>=27?TIER_COL[8]:id>=3?TIER_COL[Math.floor((id-3)/3)]:'#8b93a1';
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMG={
agent:(a,k='displayicon')=>{const x=(window.KITS||{})[a];return x?`${VA}/agents/${x[0]}/${k}.png`:'';},
map:(m,k='splash')=>MAP_ID[m]?`${VA}/maps/${MAP_ID[m]}/${k}.png`:'',
card:(id,k='wideart')=>UUID_RE.test(id||'')?`${VA}/playercards/${id}/${k}.png`:'',
rank:t=>t>=3&&t<=27?`${VA}/competitivetiers/${TIERS_ID}/${Math.round(t)}/largeicon.png`:''
};
const REGIONS=[['eu','Europe'],['na','Amérique du Nord'],['latam','Amérique latine'],['br','Brésil'],['ap','Asie-Pacifique'],['kr','Corée']];
const FONTS={
systeme:{n:'Système',css:'"Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif'},
marker:{n:'Permanent Marker (pinceau)',css:'"Permanent Marker",cursive',local:true},
teko:{n:'Teko (compact)',css:'"Teko","Segoe UI",sans-serif',local:true},
bebas:{n:'Bebas Neue (duelliste)',css:'"Bebas Neue","Segoe UI",sans-serif',g:'Bebas+Neue'},
rajdhani:{n:'Rajdhani (initiateur)',css:'"Rajdhani","Segoe UI",sans-serif',g:'Rajdhani:wght@500;600;700'},
orbitron:{n:'Orbitron (contrôleur)',css:'"Orbitron","Segoe UI",sans-serif',g:'Orbitron:wght@500;700;800'},
chakra:{n:'Chakra Petch (sentinelle)',css:'"Chakra Petch","Segoe UI",sans-serif',g:'Chakra+Petch:wght@500;600;700'},
oxanium:{n:'Oxanium (tech)',css:'"Oxanium","Segoe UI",sans-serif',g:'Oxanium:wght@500;700'},
russo:{n:'Russo One (gras)',css:'"Russo One","Segoe UI",sans-serif',g:'Russo+One'},
exo:{n:'Exo 2 (futuriste)',css:'"Exo 2","Segoe UI",sans-serif',g:'Exo+2:wght@500;700'},
anton:{n:'Anton (affiche)',css:'"Anton","Segoe UI",sans-serif',g:'Anton'}
};
const FX_FR={auto:'Auto (selon ton rôle)',aucun:'Aucun',grain:'Grain',scan:'Lignes d\'écran',neon:'Néon',particules:'Particules'};
const MODE_FR={auto:'Agent principal',dernier:'Dernier agent joué',neutre:'Neutre',agent:'Agent au choix',rang:'Mon rang',carte:'Carte préférée',cartejoueur:'Ma carte de joueur',perso:'Tout à la main'};
const BG_FR={auto:'Auto',art:'Art de l\'agent',portrait:'Portrait de l\'agent',splash:'Image de carte',card:'Ma carte de joueur',degrade:'Dégradé seul',image:'Mon image'};
const BLOCK_FR={kpis:'Chiffres clés',session:'Session du soir',objectif:'Objectif de rang',forme:'Forme récente',rr:'Courbe de RR',agents:'Meilleurs agents',cartes:'Meilleures cartes',records:'Records',dernier:'Dernière partie',defis:'Défis de la semaine',succes:'Succès'};
const ABIL_FR={'Nova Pulse':'Impulsion nova','Gravity Well':'Puits de gravité','Flashpoint':'Point d\'ignition','Fault Line':'Ligne de fracture','Aftershock':'Réplique','Rolling Thunder':'Onde sismique','Stim Beacon':'Balise stimulante','Incendiary':'Bombe incendiaire','Sky Smoke':'Frappe fumigène','Orbital Strike':'Rayon orbital','Rendezvous':'Rendez-vous','Trademark':'Guet-apens','Headhunter':'Chasseur de têtes','Tour De Force':'Tour de force','Pick-me-up':'Coup de boost','Not Dead Yet':'Toujours debout','Meddle':'Trouble-fête','Cyber Cage':'Cybercage','Spycam':'Caméra espionne','Trapwire':'Fil de détente','Neural Theft':'Vol neural','Sonic Sensor':'Radar ultrason','Barrier Mesh':'Disque barrière','Seize':'Capture','Haunt':'Hanteur','Prowler':'Rôdeur','Nightfall':'Nuit tombante','Wingman':'Altego','Dizzy':'Verti','Mosh Pit':'Pogo','Thrash':'Mordicus','High Tide':'Marée haute','Storm Surge':'Tempête déferlante','Cove':'Dôme aqueux','Reckoning':'Raz-de-marée','Undercut':'Sape','Kill Contract':'Duel à huis clos','Double Tap':'Tir couplé','Contingency':'Contingence','Updraft':'Courant ascendant','Tailwind':'Vent arrière','Cloudburst':'Averse','Blade Storm':'Tempête de lames','FLASH/drive':'MÉMOIRE/flash','ZERO/point':'POINT/zéro','NULL/cmd':'CMD/null','Nanoswarm':'Essaim de nanites','ALARMBOT':'Bot-alarme','TURRET':'Tourelle','Lockdown':'Confinement','M-pulse':'M-pulsion','Waveform':'Forme d\'onde','Harmonize':'Harmonisation','Bassquake':'Basse sismique','High Gear':'Vitesse supérieure','Relay Bolt':'Éclair relais','Fast Lane':'Voie rapide','Overdrive':'Ultra-vitesse','Paranoia':'Paranoïa','Dark Cover':'Voile sombre','Shrouded Step':'Voie des ombres','From the Shadows':'Depuis les ombres','Blaze':'Brasier','Hot Hands':'Mains brûlantes','Curveball':'Balle courbe','Run it Back':'Revanche','Blast Pack':'Pack explosif','Paint Shells':'Grenade gigogne','Boom Bot':'Boum Bot','Showstopper':'Bouquet final','Devour':'Dévoration','Dismiss':'Rebuffade','Leer':'Œillade','Empress':'Impératrice','Slow Orb':'Orbe de lenteur','Healing Orb':'Orbe de soin','Barrier Orb':'Orbe barrière','Resurrection':'Résurrection','Trailblazer':'Éclaireur','Guiding Light':'Guide éclatant','Regrowth':'Revitalisation','Seekers':'Traqueurs','Shock Bolt':'Électroflèche','Recon Bolt':'Flèche de reconnaissance','Owl Drone':'Drone rapace','Hunter\'s Fury':'Fureur du chasseur','Guided Salvo':'Salve autoguidée','Special Delivery':'Livraison spéciale','Armageddon':'Apocalypse','Stealth Drone':'Drone furtif','Interceptor':'Intercepteur','Crosscut':'Vortex','Evolution':'Évolution','Chokehold':'Étranglement','Poison Cloud':'Nuage de poison','Toxic Screen':'Écran toxique','Snake Bite':'Morsure du serpent','Viper\'s Pit':'Nid de vipères','Shear':'Cisaille','Arc Rose':'Rose métallique','Razorvine':'Ronces barbelées','Steel Garden':'Jardin d\'acier','Refract':'Réfraction','Saturate':'Saturation','Lightspeed':'Vitesse lumière','Convergent Paths':'Croisée des chemins','FAKEOUT':'Feinte','BLINDSIDE':'Angle mort','GATECRASH':'Visite surprise','DIMENSIONAL DRIFT':'Transfert dimensionnel'};
const wpnFr=w=>!w?'':w==='Melee'?'Couteau':ABIL_FR[w]||ABIL_FR[Object.keys(ABIL_FR).find(k=>k.toLowerCase()===String(w).toLowerCase())]||w;
const CAT_FR={ouverture:'Premiers duels du round',trade:'Trades (échanges de kills en 3 s)',mid:'Milieu de round',clutch:'Clutchs (dernier vivant)',post:'Après le plant de ton équipe',retake:'Reprise du site (retake)',plant:'Plant du spike',rea:'Réanimations',fin:'Fin de round'};
const END_FR={elim:'tous éliminés',spike:'spike explosé',defuse:'spike désamorcé',time:'temps écoulé'};
const BUY_FR={eco:'Éco',force:'Force',full:'Full buy'};
const DRILL={
hs:['Range : 3 × 30 bots « moyen » en visant la tête seulement','Deathmatch : 2 parties en ne tirant qu\'à hauteur de tête','Aim trainer gratuit : 5 min de suivi de cible lente'],
op:['Customs : entraîne les pre-aims des 3 premiers angles de chaque site','Deathmatch : joue les coins, tire au premier pixel visible','Avant chaque ouverture : demande une info ou une flash'],
fd:['Revois 3 de tes premières morts : où étais-tu, qui pouvait te reprendre ?','En ranked : entre en 2e, juste derrière ton duelliste','Joue avec ta capacité de survie prête (mur, dash, smoke)'],
tr:['Reste à 1-2 secondes d\'un coéquipier en entrée','Annonce ta position avant de prendre un duel','Après une mort alliée : reprends le duel tout de suite ou recule'],
dmg:['Utilise tes capacités offensives à chaque round','Range : spray contrôlé 10 balles à 15 m','Tire dès qu\'un ennemi est visible, même à travers une smoke légère'],
b0:['Range : bots qui se déplacent, à moins de 10 m','Deathmatch au Judge / Spectre pour les réflexes de près','Essaie +5 % de sensibilité pendant 8 parties'],
b1:['Range : rafales de 2-3 balles à 15-20 m','Contre-strafe avant chaque tir','Deathmatch Vandal / Phantom en rafales'],
b2:['Range : bots lointains au Vandal, 1 balle à la fois','Arrête-toi complètement avant de tirer de loin','Essaie −5 % de sensibilité pendant 8 parties'],
adr:['Range : spray contrôlé 10 balles à 15 m','Utilise tes capacités qui font des dégâts à chaque round','Deathmatch : tire dès qu\'un ennemi est visible'],
trk:['Deathmatch en duo : reprends l\'ennemi qui vient de tuer ton partenaire','En ranked : reste à 1-2 s derrière ton entry','Après une mort alliée : re-peek tout de suite le même angle'],
clW:['Revois 3 clutchs perdus : as-tu joué le temps et le spike ?','Customs : 1v2 contre bots, isole un duel à la fois','En clutch : coupe le son de l\'équipe et écoute les pas'],
surv:['Après ton kill, recule au lieu de chercher le 2e','Revois 3 morts « inutiles » de fin de round','Joue avec ta capacité de fuite prête'],
kast:['Chaque round : 1 info, 1 assist ou 1 survie','Joue près d\'un coéquipier pour être vengé','Utilise tes capacités avant de prendre un duel'],
cast:['Avant chaque round : prévois où vont tes capacités','Customs : 5 lineups de base de ton agent','Utilise tes capacités dès le premier contact'],
ok:['Garde ta routine : 10 min de Range avant de jouer','Travaille ton point fort pour en faire une arme','Revois une partie gagnée : qu\'as-tu fait de bien ?']
};
const TR_DRILLS={
micro:{n:'Micro-corrections',base:5,set:{aimlab:'Aim Lab : {micro}',kovaaks:'KovaaK\'s : {microK}',range:'Range : cibles fixes, bots en {bots}, une balle par cible'},
drill:'Petites cibles : la précision d\'abord, la vitesse ensuite',why:'On stabilise la précision avant d\'accélérer',goal:'≥ {acc} % de précision ; accélère seulement après 2 essais réussis'},
flick:{n:'Flicks à distances variées',base:6,set:{aimlab:'Aim Lab : {flick}',kovaaks:'KovaaK\'s : « ww3t Valorant » (tailles et distances de Valorant)',range:'Range : bots en {bots}, alterne proche et loin'},
drill:'Change souvent de distance : séries de 60 s, 30 s de repos',why:'Varier la distance transfère mieux en vraie partie',goal:'Note ta précision à chaque série ; vise moins d\'écart entre les séries'},
switch:{n:'Changement de cible',base:5,set:{aimlab:'Aim Lab : « Spidershot 180 » puis « Multishot »',kovaaks:'KovaaK\'s : « voxTargetSwitch » puis « Patbotflick 180 »',range:'Range : plusieurs bots, enchaîne les cibles'},
drill:'Regarde la cible suivante AVANT de tirer sur la précédente',why:'L\'œil guide la main : anticiper fait gagner du temps',goal:'Temps par cible en baisse sur 7 jours'},
tracking:{n:'Suivi de cible',base:4,set:{aimlab:'Aim Lab : « Strafetrack » puis « Motiontrack »',kovaaks:'KovaaK\'s : « Close Long Strafes Invincible » puis « Popcorn Goated Tracking »',range:'Range : suis un bot qui strafe, sans tirer puis en tirant'},
drill:'Suis une cible qui bouge, à hauteur de tête, 2 × 90 s',why:'Les duels proches se gagnent en suivant la cible, pas en flickant',goal:'Précision ≥ ta moyenne des 7 derniers jours'},
xhair:{n:'Placement du viseur',base:5,set:{all:'Partie personnalisée seul sur la carte de ta prochaine partie',aimlab:'Aim Lab : « Headshot VALORANT » (dans « Calm Aim YouTube Routine »), puis partie perso sur la carte du soir'},
drill:'Marche sur la carte en gardant le viseur à hauteur de tête, collé aux angles (pré-visée)',why:'La tête % est le chiffre qui monte le plus d\'un rang à l\'autre (12 % en Fer, 32 % en Radiant dans nos 10 790 profils)',goal:'Ton % de tête en deathmatch juste après'},
strafe:{n:'Contre-strafe + 1re balle',base:5,set:{all:'Range, Vandal ou Phantom, bots en {bots}{strafeBots}, {reps} essais de chaque côté',kovaaks:'KovaaK\'s : « Valorant Peek Practice », puis Range : {reps} essais de chaque côté'},
drill:'Déplace-toi, appuie sur la touche opposée pour t\'arrêter net, tire UNE balle à la tête',why:'Une balle tirée à l\'arrêt part droit : c\'est la base de tous les duels',goal:'≥ {fb} % de 1res balles touchées'},
peek:{n:'Peeks (jiggle et wide swing)',base:5,set:{all:'Range ou partie perso : un bot derrière un angle, Vandal ou Phantom, {reps} peeks',kovaaks:'KovaaK\'s : « Valorant Peek Practice », puis partie perso : {reps} peeks'},
drill:'Petit peek rapide pour l\'info, puis grand peek pré-visé à la tête et tir dès l\'arrêt',why:'Un peek large et pré-visé gagne avant que l\'autre réagisse',goal:'Kill en 1 ou 2 balles dans ≥ {fb} % des peeks'},
spray:{n:'Rafales et spray',base:5,set:{all:'Range : mur ou bot à 10 m puis à 20 m, Vandal puis Phantom'},
drill:'Rafales de 2-3 balles en tirant la souris vers le bas, puis spray de 6 balles contrôlé',why:'Le recul fait monter les balles : il faut compenser vers le bas',goal:'≥ {acc} % des balles dans le corps du bot à 20 m'},
dm:{n:'Deathmatch avec contrainte',base:8,set:{all:'Deathmatch, une seule arme, jamais plus de 3 balles d\'affilée'},
drill:'1re balle à la tête uniquement ; recentre ton viseur à hauteur de tête après chaque kill',why:'Une contrainte transforme le jeu libre en vrai entraînement',goal:'Ton % de tête de la séance contre ta moyenne'},
r_duel:{n:'Duelliste : prendre l\'espace',base:4,set:{all:'Partie perso sur la carte du soir : peek d\'un angle connu, tir, retour à couvert, 20 fois'},drill:'Peek pré-visé puis retour immédiat derrière un mur',why:'Moins de temps exposé = moins de premières morts',goal:'Moins d\'1 seconde exposé par peek'},
r_ctrl:{n:'Contrôleur : smokes de la carte du soir',base:4,set:{all:'Partie perso : pose tes smokes d\'attaque et de retake, chronométré'},drill:'Smokes d\'exécution puis de retake sur 2 sites, de mémoire',why:'Des smokes rapides et propres font réussir les entrées',goal:'Toutes tes smokes posées en moins de 10 s'},
r_init:{n:'Initiateur : flash et info du soir',base:4,set:{all:'Partie perso : flashs et capacités d\'info sur les angles de la carte du soir'},drill:'Flash lancée une demi-seconde avant le peek',why:'Une flash utile aveugle au moment du peek, pas avant',goal:'Bot aveuglé à chaque essai'},
r_sent:{n:'Sentinelle : setup et angle conseillé',base:4,set:{all:'Partie perso : pose ton setup sur ton meilleur spot (onglet Positionnement)'},drill:'Setup complet en moins de 15 s, puis tiens l\'angle conseillé',why:'Un setup rapide laisse le temps de prendre l\'info',goal:'Setup posé en moins de 15 s'}
};
const TR_LEVELS=[
{n:'débutant',bots:'Moyen (Medium)',strafeBots:' immobiles puis qui strafent',acc:80,fb:45,reps:20,micro:'« Microshot »',microK:'« 1wall6targets TE »',flick:'« Sixshot »'},
{n:'intermédiaire',bots:'Difficile (Hard)',strafeBots:' qui strafent',acc:85,fb:55,reps:30,micro:'« Microshot » puis « Microshot VALORANT »',microK:'« 1wall6targets TE » puis « Pasu Reload Smallflicks »',flick:'« Sixshot » puis « Motionshot Speed »'},
{n:'avancé',bots:'Difficile (Hard)',strafeBots:' qui strafent, armure activée',acc:90,fb:65,reps:40,micro:'« Microshot VALORANT » puis « Motionshot Precision »',microK:'« Pasu Reload Smallflicks »',flick:'« Motionshot Speed »'},
{n:'expert',bots:'Très difficile',strafeBots:' qui strafent et ripostent',acc:92,fb:75,reps:50,micro:'« Motionshot Precision »',microK:'« Pasu Reload Smallflicks », vise ton record',flick:'« Motionshot Speed » puis « Spidershot 180 »'}];
const TR_PLAYLISTS=[
{id:'calm',tool:'aimlab',n:'Calm Aim YouTube Routine',by:'Aimlabs',min:6,use:'echauffement',f:['xhair','micro'],lv:[0,1,2,3],why:'Échauffement court : stabilité, première balle à la tête (« Headshot VALORANT »).'},
{id:'ramp',tool:'aimlab',n:'VALORANT Ramp Warmup',by:'VT MINIGOD',min:20,use:'echauffement',f:['micro','flick','tracking','switch'],lv:[1,2,3],why:'Échauffement complet de 20 min avant la ranked.'},
{id:'basics',tool:'aimlab',n:'VALORANT Aim Basics',by:'lowgravity56',min:24,use:'progression',f:['flick','micro','tracking','peek'],lv:[0,1,2],why:'8 tâches de 1 min, 3 fois : flicks, micro-corrections, suivi, ennemis qui strafent et peeks d\'angle.'},
{id:'found',tool:'aimlab',n:'VALORANT Foundations Playlist',by:'Yokai',min:15,use:'progression',f:['micro','flick','tracking'],lv:[0,1],why:'Les bases de la visée de Valorant, pour démarrer.'},
{id:'anti',tool:'aimlab',n:'VT VALORANT Anti Strafing Balanced',by:'Lowgravity56',min:15,use:'progression',f:['tracking','strafe','peek'],lv:[1,2,3],why:'Contre les joueurs qui font A-D : duels proches et moyens.'},
{id:'switchN',tool:'aimlab',n:'Voltaic Speed Switching Novice',by:'Lowgravity56',min:15,use:'progression',f:['switch'],lv:[0,1,2],why:'Enchaîner les cibles vite et proprement (plusieurs ennemis).'},
{id:'smooth',tool:'aimlab',n:'Revosect Smoothness Specific Routine',by:'revosect',min:15,use:'progression',f:['tracking'],lv:[1,2,3],why:'Suivi fluide de la cible, utile pour les sprays et les duels proches.'},
{id:'demon',tool:'aimlab',n:'VT MINIGOD\'s Demon1 2024 Aim Routine Remix',by:'VT MINIGOD',min:25,use:'progression',f:['micro','flick','switch','tracking'],lv:[2,3],why:'Routine de joueur pro, pour les niveaux avancés.'},
{id:'vqr',tool:'aimlab',n:'Voltaic Valorant Quickranking Playlist',by:'Voltaic',min:8,use:'test',f:[],lv:[0,1,2,3],why:'Test de visée en 8 min (clics, suivi, changement de cible) : 4 fois la 1re fois, puis 1 fois par mois.'},
{id:'kwarm',tool:'kovaaks',n:'1wall6targets TE · Pasu Reload Smallflicks · Close Long Strafes Invincible · Popcorn Goated Tracking · Valorant Peek Practice',by:'scénarios, 3 min chacun',min:15,use:'echauffement',f:['micro','tracking','peek'],lv:[0,1,2,3],why:'Échauffement de 15 min : petits flicks, suivi de strafes, peeks.'},
{id:'kswitch',tool:'kovaaks',n:'voxTargetSwitch · Patbotflick 180 · Bounce 180 Tracking',by:'scénarios, 4 min chacun',min:12,use:'progression',f:['switch','tracking'],lv:[1,2,3],why:'Changements de cible et retournements rapides.'},
{id:'ktrack',tool:'kovaaks',n:'Close Long Strafes Invincible · Popcorn Goated Tracking · Air Angelic 4 Voltaic',by:'scénarios, 4 min chacun',min:12,use:'progression',f:['tracking','strafe'],lv:[1,2,3],why:'Suivi de cibles qui strafent : les duels proches.'},
{id:'kclick',tool:'kovaaks',n:'1wall6targets TE · Pasu Reload Smallflicks · ww3t Valorant',by:'scénarios, 4 min chacun',min:12,use:'progression',f:['micro','flick','xhair'],lv:[0,1,2,3],why:'Clics précis sur des cibles à la taille d\'une tête de Valorant.'},
{id:'kbench',tool:'kovaaks',n:'Voltaic Season 5 Benchmarks',by:'Voltaic',min:25,use:'test',f:[],lv:[1,2,3],why:'Test complet (clics, suivi, changement de cible) : toutes les 2 à 4 semaines.'}];
const TOOL_FR={range:'Range du jeu (gratuit)',aimlab:'Aim Lab (gratuit)',kovaaks:'KovaaK\'s'};
const WEEK_FR={progression:'Séance de progression',echauffement:'Échauffement avant la ranked',revue:'Revue de partie',repos:'Repos'};
const BADGES=[['ace','💥','Ace','Les 5 adversaires d\'un round, tout seul'],['k4','🔥','4 kills','4 kills dans un même round'],['cl3','🧊','Clutch 1 contre 3','Gagner un round seul contre 3 ou plus'],
['cl2','❄️','Clutch','Gagner un round seul contre 2 ou plus'],['mvp','👑','MVP','Meilleur score des 10 joueurs'],['fk5','⚡','Ouvreur','5 premiers kills dans une partie'],
['serie5','📈','En feu','5 victoires d\'affilée'],['serie10','🚀','Inarrêtable','10 victoires d\'affilée'],['k30','🎯','30 bombes','30 kills dans une partie'],
['acs300','💎','Carry','300 d\'ACS dans une partie'],['hs35','🧠','Tête chercheuse','35 % de tête sur une partie'],['kd3','🗡️','Intouchable','15 kills et 3 fois plus de kills que de morts'],
['ecrase','🏆','Écrasement','Victoire avec 3 rounds perdus ou moins'],['promo','⬆️','Promotion','Monter d\'une division'],['p50','🎮','Habitué','50 parties classées suivies']];
const GLOSS=[['ACS','Score de combat moyen par round (kills, dégâts, assists). Le chiffre principal du tableau de fin de partie.'],
['ADR','Dégâts moyens infligés par round. Plus fiable que les kills pour juger ton impact.'],['DDΔ','Dégâts donnés moins dégâts reçus, par round. Positif : tu gagnes tes échanges.'],
['K/D','Kills divisés par morts. 1,0 = autant de kills que de morts.'],['KAST','% de rounds où tu as fait un kill, un assist, survécu ou été vengé (3 s). 70 % et plus, c\'est très bien.'],
['Rating','Note globale d\'une partie (formule proche de HLTV 2.0). 1,00 = joueur moyen de la partie.'],['Impact','Rounds gagnés ou perdus par tes kills et tes morts, d\'après les chances de gagner le round avant et après chaque action.'],
['Ouverture','Le premier kill d\'un round. Le gagner donne environ 70 % de chances de gagner le round.'],['Trade','Venger un coéquipier dans les 3 secondes après sa mort.'],
['Clutch','Être le dernier vivant de ton équipe face à un ou plusieurs ennemis.'],['Retake','Reprendre un site après que l\'ennemi a posé le spike.'],
['Spot','Un endroit précis de la carte (à 4 m près) où tu as pris plusieurs duels.'],['Lissé','Taux corrigé quand il y a peu de données : on le tire vers la moyenne pour éviter les conclusions sur 2 ou 3 duels.'],
['Fiabilité','Vert ou rouge seulement quand l\'écart est sûr à 9 chances sur 10 (intervalle de Wilson).'],['eDPI','DPI de la souris × sensibilité du jeu. La plupart des joueurs sont entre 200 et 400.']];
;
"use strict";
const MAP_XF={Ascent:[7e-5,-7e-5,0.813895,0.573242],Split:[7.8e-5,-7.8e-5,0.842188,0.697578],Fracture:[7.8e-5,-7.8e-5,0.556952,1.155886],
Bind:[5.9e-5,-5.9e-5,0.576941,0.967566],Breeze:[7e-5,-7e-5,0.465123,0.833078],Abyss:[8.1e-5,-8.1e-5,0.5,0.5],Lotus:[7.2e-5,-7.2e-5,0.454789,0.917752],
Sunset:[7.8e-5,-7.8e-5,0.5,0.515625],Pearl:[7.8e-5,-7.8e-5,0.480469,0.916016],Summit:[7.5e-5,-7.5e-5,0.047401,0.978891],
Icebox:[7.2e-5,-7.2e-5,0.460214,0.304687],Corrode:[7e-5,-7e-5,0.526158,0.5],Haven:[7.5e-5,-7.5e-5,1.09345,0.642728]};
const cosOf=map=>(window.CALLOUTS||{})[map]||[];
const mapOk=map=>!!(MAP_XF[map]&&cosOf(map).length);
const toCv=(map,x,y)=>{const f=MAP_XF[map];return f?[30+(y*f[0]+f[2])*940,30+(x*f[1]+f[3])*940]:[500,500];};
const coXY=(map,z)=>{const c=coFind(cosOf(map),z);return c?{x:c[2],y:c[3]}:null;};
function mapsOfD(D){const n={};(D||[]).forEach(d=>{if(mapOk(d.map))n[d.map]=(n[d.map]||0)+1;});return Object.entries(n).sort((a,b)=>b[1]-a[1]).map(([map,k])=>({map,n:k}));}
const SIDE_FR={A:'attaque',D:'défense'};
function svgMapHtml(id,map,label){
const src=IMG.map(map,'displayicon'),z=(d,t)=>`<button type="button" class="btn ghost sm" data-act="mvZoom:${id}:${d}" aria-label="${t}">${d>0?'+':d<0?'−':'⟲'}</button>`;
return`<div class="mapbox mv"><svg id="${id}" viewBox="0 0 1000 1000" role="img" aria-label="${esc(label)}"><rect width="1000" height="1000" class="mv-bg"/>${src?`<image href="${src}" x="30" y="30" width="940" height="940" class="mv-img"/>`:''}<g class="mv-l"></g></svg>
    <div class="mv-tip" hidden></div><div class="mv-zoom">${z(1,'Zoomer')}${z(-1,'Dézoomer')}${z(0,'Recentrer la carte')}</div></div>`;
}
const MV_RO=window.ResizeObserver?new ResizeObserver(es=>es.forEach(e=>svgPaint(e.target))):null;
function svgDraw(svg,map,L){
if(!svg)return;svg._m={map,L};svg._v=svg._v||{z:1,cx:500,cy:500};
const im=svg.querySelector('.mv-img');if(im)im.addEventListener('error',()=>{im.remove();svg.querySelector('.mv-l').insertAdjacentHTML('beforebegin','<text x="500" y="500" class="mv-off">Minimap indisponible (hors ligne ?)</text>');},{once:true});
if(MV_RO&&!svg._ro){svg._ro=1;MV_RO.observe(svg);}
svgPaint(svg);
}
function svgPaint(svg){
const M=svg&&svg._m;if(!M||!svg.isConnected)return;const{map,L}=M,u=1000/svg._v.z/Math.max(120,svg.clientWidth||500);
const P=(x,y)=>toCv(map,x,y),f=n=>n.toFixed(1),o=[],tip=t=>t?` data-tip="${esc(t)}"`:'';
const arrow=(a,cls)=>{const[x1,y1]=P(a.x1,a.y1);let[x2,y2]=P(a.x2,a.y2);const len=Math.hypot(x2-x1,y2-y1),mx=(a.max||1e9)*u;if(len<4*u)return'';
if(len>mx){x2=x1+(x2-x1)*mx/len;y2=y1+(y2-y1)*mx/len;}
const an=Math.atan2(y2-y1,x2-x1),h=11*u,hd=s=>`${f(x2-h*Math.cos(an+s))},${f(y2-h*Math.sin(an+s))}`,ln=`x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}"`;
const t=a.thick?1.4:1;
return`<g class="mv-a${cls}${a.cls?' '+a.cls:''}${a.top?' top':''}${a.show?' show':''}" data-k="${a.k}"${tip(a.tip)}><line ${ln} class="o" stroke-width="${f(7*t*u)}"/><line ${ln} class="i" stroke-width="${f(3.5*t*u)}"${a.dash?` stroke-dasharray="${f(9*u)} ${f(6*u)}"`:''}/><path d="M${f(x2)},${f(y2)}L${hd(.45)}L${hd(-.45)}Z" stroke-width="${f(2*u)}"/></g>`;};
const poly=(x,y,pts)=>pts.map(([a,r],i)=>`${i?'L':'M'}${f(x+Math.cos(a)*r*u)},${f(y+Math.sin(a)*r*u)}`).join('')+'Z';
const star=(n,r1,r2)=>Array.from({length:n*2},(_,i)=>[i*Math.PI/n-Math.PI/2,i%2?r2:r1]);
const UT={smoke:(x,y)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(18*u)}"/>`,molly:(x,y)=>`<circle cx="${f(x)}" cy="${f(y)}" r="${f(13*u)}" stroke-dasharray="${f(5*u)} ${f(4*u)}"/>`,
flash:(x,y)=>`<path d="${poly(x,y,star(4,13,4.5))}"/>`,info:(x,y)=>`<rect x="${f(x-9*u)}" y="${f(y-9*u)}" width="${f(18*u)}" height="${f(18*u)}" rx="${f(3*u)}"/>`,
trap:(x,y)=>`<path d="${poly(x,y,[0,1,2].map(i=>[i*2.094-Math.PI/2,13]))}"/>`,spike:(x,y)=>`<path d="${poly(x,y,[0,1,2,3,4,5].map(i=>[i*Math.PI/3,11]))}"/>`,
me:(x,y)=>`<path d="${poly(x,y,star(5,15,6.5))}"/>`};
(L.utils||[]).filter(m=>m.kind==='smoke').forEach(m=>{const[x,y]=P(m.x,m.y);o.push(`<g class="mv-u smoke" data-k="${m.k}"${tip(m.tip)} stroke-width="${f(2.2*u)}">${UT.smoke(x,y)}</g>`);});
(L.rings||[]).forEach(r=>{const[x,y]=P(r.x,r.y);o.push(`<circle class="mv-ring" data-k="${r.k}"${tip(r.tip)} cx="${f(x)}" cy="${f(y)}" r="${f((14+26*Math.min(1,r.pres||0))*u)}" stroke-width="${f(2.5*u)}" stroke-dasharray="${f(6*u)} ${f(4*u)}"/>`);});
(L.lines||[]).forEach(a=>o.push(arrow(a,' line')));
(L.arrows||[]).forEach(a=>o.push(arrow(a,a.bad?' bad':'')));
(L.foes||[]).forEach(t=>{const[x,y]=P(t.x,t.y),s=(8+Math.min(6,(t.size||1)/8))*u;o.push(`<path class="mv-foe${t.low?' low':''}" data-k="${t.k}"${tip(t.tip)} d="M${f(x)},${f(y-s)}L${f(x+s)},${f(y)}L${f(x)},${f(y+s)}L${f(x-s)},${f(y)}Z" stroke-width="${f(2*u)}"/>`);});
(L.utils||[]).filter(m=>m.kind!=='smoke'&&UT[m.kind]).forEach(m=>{const[x,y]=P(m.x,m.y);o.push(`<g class="mv-u ${m.kind}" data-k="${m.k}"${tip(m.tip)} stroke-width="${f(2.2*u)}">${UT[m.kind](x,y)}</g>`);});
const SP=(L.spots||[]).map(s=>{const[x,y]=P(s.x,s.y);return{s,x,y,r:(s.kind==='ok'?12:11)*u};}),SN=L.exact?[]:SP;
for(let it=0;it<8;it++)for(let i=0;i<SN.length;i++)for(let j=i+1;j<SN.length;j++){const a=SN[i],b=SN[j],dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy),need=a.r+b.r+2*u;
if(d>=need)continue;const k=(need-d)/2,ux=d>1e-6?dx/d:1,uy=d>1e-6?dy/d:0;a.x-=ux*k;a.y-=uy*k;b.x+=ux*k;b.y+=uy*k;}
SP.forEach(({s,x,y,r})=>{const c=4.5*u;
const inner=s.kind==='bad'?`<path d="M${f(x-c)},${f(y-c)}L${f(x+c)},${f(y+c)}M${f(x+c)},${f(y-c)}L${f(x-c)},${f(y+c)}" stroke-width="${f(2.6*u)}"/>`:s.num?`<text x="${f(x)}" y="${f(y)}" dy=".35em" font-size="${f(13*u)}">${s.num}</text>`:'';
o.push(`<g class="mv-s ${s.kind}${s.low?' low':''}" data-k="${s.k}"${tip(s.tip)}><circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" stroke-width="${f(2.5*u)}"${s.low?` stroke-dasharray="${f(4*u)} ${f(3*u)}"`:''}/>${inner}</g>`);});
svg.querySelector('.mv-l').innerHTML=o.join('');
const R=svg.closest('[data-link]');if(R&&R._hl)mvHl(R,R._hl,true);
}
function mvHl(R,k,on){
R._hl=on?k:null;
R.querySelectorAll('[data-k]').forEach(e=>e.classList.toggle('hl',!!on&&e.dataset.k===k));
R.querySelectorAll('.mv-l').forEach(g=>g.classList.toggle('has-hl',!!on));
const tp=R.querySelector('.mv-tip'),m=on&&R.querySelector(`.mv-l [data-k="${k}"][data-tip]`);if(!tp)return;
if(!m){tp.hidden=true;return;}
const box=tp.parentNode.getBoundingClientRect(),r=m.getBoundingClientRect(),below=r.top-box.top<56;
tp.textContent=m.dataset.tip;tp.hidden=false;tp.classList.toggle('below',below);
tp.style.left=Math.max(70,Math.min(box.width-70,r.left+r.width/2-box.left))+'px';tp.style.top=(below?r.bottom:r.top)-box.top+'px';
}
;
"use strict";
const PX='ph_';
const ST={
get(k,d){try{const v=localStorage.getItem(PX+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},
set(k,v){try{localStorage.setItem(PX+k,JSON.stringify(v));return true;}catch(e){return false;}},
del(k){try{localStorage.removeItem(PX+k);}catch(e){}}
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const today=()=>{const d=new Date();return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
const splitRiot=r=>{const s=String(r||'').trim(),i=s.lastIndexOf('#');return i>0&&i<s.length-1&&i<=22&&s.length-i<=7?[s.slice(0,i).trim(),s.slice(i+1).trim()]:null;};
const userKey=()=>{try{return localStorage.getItem(PX+'hkey')||((/^(file:|http:\/\/localhost|http:\/\/127\.)/.test(location.href))?localStorage.getItem('psh_hkey')||'':'');}catch(e){return'';}};
const setUserKey=k=>{try{k?localStorage.setItem(PX+'hkey',k.trim()):localStorage.removeItem(PX+'hkey');}catch(e){}};
const API={calls:0};
const apiReady=()=>!!(userKey()||APP.cfg.proxy);
async function apiGet(path,tries=3,opt={}){
const key=userKey(),base=key?'https://api.henrikdev.xyz':APP.cfg.proxy;
if(!base){const e=new Error('Ce site n\'a pas encore son serveur : ajoute ta clé HenrikDev gratuite (Réglages) ou essaie la démo.');e.code='nokey';throw e;}
const lic=!key&&opt.lic&&APP.licCode?`${path.includes('?')?'&':'?'}lic=${encodeURIComponent(APP.licCode)}`:'';
for(let a=0;;a++){
let res,j=null;API.calls++;
const ac=typeof AbortController==='function'?new AbortController():null,tm=ac&&setTimeout(()=>ac.abort(),opt.to||15000);
try{
res=await fetch(key?base+'/valorant'+path:proxyUrl(base,'/valorant'+path+lic),Object.assign(key?{headers:{Authorization:key}}:{},ac?{signal:ac.signal}:{}));
try{j=JSON.parse(await res.text());}catch(e){}
}catch(e){
clearTimeout(tm);if(a<tries-1){statut('Le service répond mal : nouvel essai…');await sleep(a?5000:2000);continue;}
const x=new Error(e&&e.name==='AbortError'?'Le service met trop de temps à répondre. Réessaie dans un instant.':'Pas de connexion internet, ou le service ne répond pas. Réessaie dans un instant.');x.code='net';throw x;
}
clearTimeout(tm);
const st=res.status!==200?res.status:j&&typeof j.status==='number'?j.status:200;
if(st===429&&a<tries-1){
const w=clamp(+(res.headers.get('Retry-After')||(j&&j.retry)||0)||20,5,60);
statut(`Beaucoup de demandes en ce moment : reprise automatique dans ${w} s…`);await sleep(w*1000);continue;
}
if(st>=500&&a<tries-1){statut('Le service répond mal : nouvel essai…');await sleep(a?5000:2000);continue;}
if(j&&j.erreur==='Adresse inconnue.')throw new Error('Le serveur du site est mal installé (ancienne version du code ?). Le propriétaire doit recopier le code du serveur.');
if(st===402){const e=new Error('Cette fonction fait partie de Premium (le serveur a refusé sans code valable pour ce compte).');e.code=402;throw e;}
if(st===404){const e=new Error('Introuvable : vérifie le pseudo, le #tag et la région.');e.code=404;throw e;}
if(st===401||st===403)throw new Error(key?'Ta clé HenrikDev est refusée (incomplète, invalide ou désactivée). Recopie-la en entier dans les réglages.':'Le serveur du site est mal réglé (clé refusée) : réessaie plus tard.');
if(st===429)throw new Error('Trop de demandes : réessaie dans une minute.');
if(st>=400){const e=new Error(`Le service a répondu une erreur (${st}). Réessaie plus tard.`);e.code=st>=500?'net':st;throw e;}
if(!j)throw new Error('Réponse illisible du service. Réessaie plus tard.');
return j;
}
}
const ROWS_MAX=1500,PAGES_MAX=60;
async function loadProfile(riot,region,opt={}){
const sp=splitRiot(riot);if(!sp)throw new Error('Écris ton Riot ID en entier : Pseudo#TAG (exemple : Kebab#EUW).');
const[nm,tg]=sp,rid=ridNorm(riot),all=!!opt.all,old=ST.get('prof:'+rid);
if(!opt.force&&!all&&old&&old.v===2&&Date.now()-old.at<10*6e4)return old;
const q=`${encodeURIComponent(nm)}/${encodeURIComponent(tg)}`,size=20;
const known=old&&old.v===2&&old.puuid&&Date.now()-old.at<7*864e5;
if(!known)statut('Recherche du compte…');
const acc=known?{name:old.name,tag:old.tag,region:old.region,puuid:old.puuid,account_level:old.level,card:old.card}:(await apiGet(`/v2/account/${q}`)).data||{};
const reg=REGIONS.some(r=>r[0]===String(acc.region||'').toLowerCase())?String(acc.region).toLowerCase():region;
statut('Rang, parties et RR…');
let tot=0;
const page=p=>apiGet(`/v1/stored-matches/${reg}/${q}?mode=competitive&size=${size}&page=${p}`,3,{lic:p>1}).then(x=>{const t=toNum((x.results||{}).total);if(t>0)tot=t;return x.data||[];});
const[mmrR,l1,histR]=await Promise.all([
apiGet(`/v3/mmr/${reg}/pc/${q}`).then(x=>x.data||{},e=>{if(e.code!==404)throw e;return{};}),page(1),
apiGet(`/v2/stored-mmr-history/${reg}/pc/${q}`).then(x=>x.data||[],e=>{if(e.code!==404)console.warn(e);return[];})]);
const keep=old&&old.v===2&&Array.isArray(old.rows)?old.rows:[],had=new Set(keep.map(r=>r.id));
const mmr=mmrR,hist=histR,rows=[],seen=new Set(),addL=l=>{let nw=0;l.forEach(sm=>{const r=smRow(sm);if(r&&!seen.has(r.id)){seen.add(r.id);rows.push(r);if(!had.has(r.id))nw++;}});return nw;};
const last=Math.min(PAGES_MAX,tot?Math.ceil(tot/size):all?PAGES_MAX:1);
let nw=addL(l1),full=all;
for(let p=2,l=l1;p<=last&&l.length>=size&&(all||(keep.length&&nw));p++){
statut(`Tes parties classées… (page ${p}/${last})`);await sleep(1200);
try{l=await page(p);}catch(e){full=false;if(e.code===402){toast(e.message,true);break;}if(all||keep.length)break;throw e;}
nw=addL(l);
}
keep.forEach(r=>{if(!seen.has(r.id))rows.push(r);});
const c=mmr.current||{},pk=mmr.peak||{},n=v=>toNum(v);
const prof={v:2,at:Date.now(),rid,name:strCut(acc.name||nm,24),tag:strCut(acc.tag||tg,8),region:reg,puuid:typeof acc.puuid==='string'?acc.puuid:'',level:n(acc.account_level),
card:typeof acc.card==='string'?acc.card:(acc.card||{}).id||'',full:full||!!(old&&old.full),tot,
mmr:{tier:n((c.tier||{}).id)||0,rr:n(c.rr),last:n(c.last_change),elo:n(c.elo),need:n(c.games_needed_for_rating)||0,peak:{tier:n((pk.tier||{}).id)||0,season:strCut((pk.season||{}).short,10)}},
rows:rows.sort((a,b)=>b.ts-a.ts).slice(0,ROWS_MAX),
hist:(Array.isArray(hist)?hist:[]).map(h=>({d:String(h.date||''),ts:Date.parse(h.date)||0,ch:n(h.last_change),elo:n(h.elo),t:n((h.tier||{}).id)||0,mid:String(h.match_id||'').toLowerCase(),map:strCut((h.map||{}).name,20)}))
.filter(h=>h.elo!=null&&h.ts).sort((a,b)=>a.ts-b.ts).slice(-120)};
prof.riot=`${prof.name}#${prof.tag}`;
ST.set('prof:'+rid,prof);statut('');
return prof;
}
const strCut=(v,n)=>String(v??'').replace(/[\u0000-\u001f]/g,'').slice(0,n);
function idb(mode,fn){
return new Promise((res,rej)=>{
const r=indexedDB.open('prohub-public',1);
r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('md'))r.result.createObjectStore('md');};
r.onerror=()=>rej(r.error);
r.onsuccess=()=>{const db=r.result,tx=db.transaction('md',mode),q=fn(tx.objectStore('md'));tx.oncomplete=()=>{res(q&&q.result);db.close();};tx.onerror=()=>{rej(tx.error);db.close();};};
});
}
const mdKey=(prof,id)=>`${prof.demo?'demo':prof.puuid||prof.rid}:${id}`;
const DET={mem:{},miss:new Set()};
const DET_V=7;
const detFix=(prof,d)=>{const r=d&&(prof.rows||[]).find(x=>x.id===d.id);return r?detTrim(d,r.us+r.them):d;};
async function detGet(prof,id,fresh){
const k=mdKey(prof,id),old=x=>fresh&&(x.v||0)<DET_V;if(DET.mem[k]&&!old(DET.mem[k]))return DET.mem[k];
let d=DET.mem[k]||null;if(!d){try{d=await idb('readonly',s=>s.get(k));}catch(e){}}
if(d&&!old(d))return DET.mem[k]=detFix(prof,d);
if(prof.demo)return d?DET.mem[k]=detFix(prof,d):null;
let md=null;try{md=(await apiGet(`/v4/match/${prof.region}/${encodeURIComponent(id)}`,3,{lic:true,to:25000})).data;}catch(e){if(d)return DET.mem[k]=detFix(prof,d);throw e;}
if(!md)return d?DET.mem[k]=detFix(prof,d):null;
const me=(md.players||[]).find(p=>(prof.puuid&&p.puuid===prof.puuid)||ridNorm(`${p.name}#${p.tag}`)===prof.rid);if(!me)return null;
d=v4Detail(md,me.team_id,p=>p===me?'moi':'');
try{await idb('readwrite',s=>s.put(d,k));}catch(e){console.warn('Détail non gardé',e);}
return DET.mem[k]=detFix(prof,d);
}
async function detAll(prof){
const ids=new Set(prof.rows.map(r=>r.id)),out=[];
for(const r of prof.rows){const k=mdKey(prof,r.id);if(DET.mem[k])out.push(DET.mem[k]);}
if(out.length<ids.size&&!prof.demo){
const pre=mdKey(prof,'');
try{const all=await idb('readonly',s=>s.getAll(IDBKeyRange.bound(pre,pre+'￿')));(all||[]).forEach(d=>{const k=mdKey(prof,d.id);if(ids.has(d.id)&&!DET.mem[k]){DET.mem[k]=detFix(prof,d);out.push(DET.mem[k]);}});}catch(e){}
}
return out.sort((a,b)=>b.ts-a.ts);
}
async function detFill(prof,max,onStep){
if(prof.demo||!apiReady())return 0;
const have=new Map((await detAll(prof)).map(d=>[d.id,d.v||0])),todo=prof.rows.slice(0,max).filter((r,j)=>!DET.miss.has(r.id)&&(!have.has(r.id)||have.get(r.id)<6||(j<5&&have.get(r.id)<DET_V)));
let n=0,fail=0;
for(const[i,r]of todo.entries()){
if(i)await sleep(n<3?600:2000);
try{if(await detGet(prof,r.id,have.has(r.id)))n++;else DET.miss.add(r.id);fail=0;if(onStep)await onStep(n,todo.length);}
catch(e){if(e.code===404)DET.miss.add(r.id);else if(++fail>=2||e.code===402||e.code==='nokey'){console.warn('Détail interrompu',e.message);break;}}
}
return n;
}
async function detForget(){DET.mem={};try{await idb('readwrite',s=>{s.clear();return null;});}catch(e){}}
;
"use strict";
function demoProfile(){
let seed=20261011;const rnd=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648,ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const pickW=list=>{const t=list.reduce((s,x)=>s+x[1],0);let r=rnd()*t;for(const[v,w]of list){if((r-=w)<0)return v;}return list[0][0];};
const AG=[['Jett',24],['Reyna',12],['Raze',8],['Omen',6],['Sova',5],['Killjoy',5]],MAPS=['Ascent','Bind','Haven','Lotus','Sunset','Abyss','Corrode'];
const now=Date.now(),rows=[],hist=[];let elo=1150,peak=0,t=now-34*864e5;
for(let i=0;i<60;i++){
t+=ri(2,14)*36e5;if(new Date(t).getHours()<17)t+=5*36e5;if(t>now-36e5)t=now-(60-i)*18e5;
const agent=pickW(AG),map=MAPS[ri(0,MAPS.length-1)],skill=agent==='Jett'?.58:agent==='Reyna'?.55:.47,win=rnd()<skill;
const lose=ri(3,11),us=win?13:lose,them=win?lose:13,r=us+them,k=Math.max(4,Math.round(r*(win?.92:.72)+ri(-4,5))),d=Math.max(5,Math.round(r*(win?.62:.8)+ri(-3,3)));
const sh=k*ri(9,13),hs=Math.round(sh*(agent==='Jett'?.24:.19)+ri(-3,3)),ls=Math.round(sh*.08);
const ch=win?ri(12,22):-ri(14,24);elo=clamp(elo+ch,1000,1390);peak=Math.max(peak,elo);
const id=`de${String(i).padStart(6,'0')}-0000-4000-8000-${String(1e11+i*7919).slice(-12)}`;
rows.push({id,ts:t,date:new Date(t-new Date(t).getTimezoneOffset()*6e4).toISOString().slice(0,10),map,season:'e11a2',agent,tier:Math.floor(elo/100)+3,team:'red',us,them,res:win?'W':'L',r,
k,d,a:ri(2,9),sc:Math.round(r*(k/r*175+70+ri(-15,25))),hs:Math.max(0,hs),bs:Math.max(0,sh-hs-ls),ls,dmg:Math.round(r*(k/r*128+22+ri(-10,18))),rec:Math.round(r*(d/r*125+20+ri(-10,10)))});
hist.push({d:new Date(t).toISOString(),ts:t,ch,elo,t:Math.floor(elo/100)+3,mid:id,map});
}
rows.sort((a,b)=>b.ts-a.ts);
const prof={v:2,demo:true,at:now,rid:'démo#fr1',name:'Démo',tag:'FR1',riot:'Démo#FR1',region:'eu',puuid:'',level:142,card:'e9c8d760-4d06-4037-4882-6bab3610d9ea',full:true,
mmr:{tier:Math.floor(elo/100)+3,rr:elo%100,last:hist[hist.length-1].ch,elo,need:0,peak:{tier:Math.floor(peak/100)+3,season:'e11a2'}},rows,hist};
rows.slice(0,45).forEach(r=>{const d=demoDetail(r,rnd,ri,pickW);DET.mem[mdKey(prof,r.id)]=d;});
return prof;
}
function demoDetail(row,rnd,ri,pickW){
const AGS=['Omen','Sova','Killjoy','Sage','Fade','Raze','Brimstone','Cypher','Skye','Viper','Jett','Reyna','Breach','Clove'];
const W=[['Vandal',30],['Phantom',26],['Operator',5],['Sheriff',6],['Spectre',8],['Ghost',6],['Classic',5],['Judge',3],['Marshal',2],['Outlaw',2]];
const cos=(window.CALLOUTS||{})[row.map]||[],sites=[...new Set(cos.map(c=>c[0]).filter(s=>/^[A-C]$/.test(s)))].sort(),sa=cos.find(c=>c[0]==='Attacker Side'),sd=cos.find(c=>c[0]==='Defender Side');
const dist=(c,s)=>s?Math.hypot(c[2]-s[2],c[3]-s[3]):0,jit=(c,j=320)=>[Math.round(c[2]+(rnd()-.5)*2*j),Math.round(c[3]+(rnd()-.5)*2*j)];
const ATK=/Main|Lobby|Long/i,atkZ=s=>cos.filter(c=>c[0]===s&&c[1]!=='Site'&&(ATK.test(c[1])||dist(c,sa)<dist(c,sd))),defZ=s=>cos.filter(c=>c[0]===s&&(c[1]==='Site'||(!ATK.test(c[1])&&dist(c,sd)<=dist(c,sa))));
const fav=sites.length?sites[row.map.length%sites.length]:null;
const pl=[];for(let i=0;i<10;i++)pl.push({n:i?'':'moi',a:i?AGS[ri(0,AGS.length-1)]:row.agent,t:i<5?1:0,sc:0,k:0,d:0,as:0,hs:0,sh:0,lg:0,dmg:0,rec:0,c:[ri(4,16),ri(6,22),ri(5,18),ri(0,3)],tr:row.tier+ri(-2,2),lv:ri(40,400)});
const nR=row.us+row.them,wins=Array.from({length:nR},(_,i)=>i<row.us?1:0);for(let i=nR-1;i>0;i--){const j=ri(0,i);[wins[i],wins[j]]=[wins[j],wins[i]];}
const rounds=[],kills=[],first=rnd()<.5?'A':'D',meSkill=row.res==='W'?1.2:.95;
for(let r=0;r<nR;r++){
const s=r<12?first:r<24?(first==='A'?'D':'A'):first,w=wins[r],atkT=s==='A'?1:0,winT=w?1:0,loseT=1-winT;
const pis=r===0||r===12,buy=win=>pis?800*5:pickW(win?[[3000,1],[9000,2],[21000,9]]:[[3000,4],[9000,3],[21000,4]])+ri(0,3000);
const S=!sites.length?null:atkT===0&&fav&&rnd()<.6?fav:pickW(sites.map((x,i)=>[x,atkT===1&&i===0?3:2])),pos={};
const away=atkT===0&&fav&&S!==fav;
for(let i=0;i<10;i++){
const atk=(i<5?1:0)===atkT;let c=null;
if(S&&atk){const Z=atkZ(S);c=Z.length?Z[ri(0,Z.length-1)]:sa;}
else if(S){const s2=i===0&&fav?fav:rnd()<.3?sites[ri(0,sites.length-1)]:S,Z=defZ(s2);c=Z.length?Z[ri(0,Z.length-1)]:null;}
pos[i]=c?jit(c):[ri(-4000,4000),ri(-4000,4000)];
}
const meSite=atkT===0&&fav&&(cos.find(c=>c[0]===fav&&c[1]==='Site')||[0,0,1e9,1e9]),boost=meSite&&Math.hypot(pos[0][0]-meSite[2],pos[0][1]-meSite[3])<900?1.7:1;
const alive={1:[0,1,2,3,4],0:[5,6,7,8,9]},seq=[];for(let k=0;k<5;k++)seq.push(loseT);const extra=ri(0,3);for(let k=0;k<extra;k++)seq.splice(ri(0,seq.length-1),0,winT);
const plant=atkT===winT?rnd()<.7:rnd()<.45,pt=plant?ri(35,70)*1000:0;let tm=ri(6,22)*1000,cut=plant&&atkT===winT?ri(3,5):5;
let dead=0;const fs=Object.entries(pos).map(([i,p])=>[+i,p[0],p[1]]);
for(const vt of seq){
if(!alive[vt].length||!alive[1-vt].length||(vt===loseT&&dead>=cut))break;
const pick=L=>{const o=away&&rnd()<.8?L.filter(x=>x!==0):L;return o.length?o[ri(0,o.length-1)]:L[0];},meOk=!away||rnd()<.2;
const killers=alive[1-vt],kk=meOk&&killers.includes(0)&&rnd()<.2*meSkill*boost?0:pick(killers);
const vic=meOk&&alive[vt].includes(0)&&rnd()<.17/boost?0:pick(alive[vt]);if(vic===kk)continue;
alive[vt]=alive[vt].filter(x=>x!==vic);if(vt===loseT)dead++;
const atkK=(kk<5?1:0)===atkT,fix=atkK?pos[vic]:pos[kk],mov=atkK?pos[kk]:pos[vic],L0=Math.hypot(mov[0]-fix[0],mov[1]-fix[1])||1,dd=Math.min(L0,ri(600,3500));
const mp=[Math.round(fix[0]+(mov[0]-fix[0])*dd/L0),Math.round(fix[1]+(mov[1]-fix[1])*dd/L0)],[vx,vy]=atkK?fix:mp,[kx,ky]=atkK?mp:fix;
const wpn=pickW(W),ast=rnd()<.45?alive[1-vt].filter(x=>x!==kk).slice(0,1):[];
kills.push([r,tm,kk,vic,vx,vy,kx,ky,wpn,ast]);
pl[kk].k++;pl[vic].d++;ast.forEach(a=>pl[a].as++);pl[kk].dmg+=ri(140,190);pl[vic].rec+=ri(140,190);
const shots=ri(3,6),hs=rnd()<(kk===0?.55:.45)?ri(1,2):0;pl[kk].sh+=shots;pl[kk].hs+=hs;pl[kk].lg+=rnd()<.3?1:0;
tm+=ri(1,9)*1000;
}
const e=!alive[loseT].length?'elim':plant&&atkT===winT?'spike':plant?'defuse':'time',siteC=S&&cos.find(c=>c[0]===S&&c[1]==='Site');
const ps=plant&&siteC?[...alive[atkT].map(i=>[i,...jit(siteC,650)]),...alive[1-atkT].map(i=>[i,pos[i][0],pos[i][1]])]:[];
rounds.push({w,s,ol:buy(w===1),tl:buy(w!==1),p:plant?S||'A':'',pu:plant?atkT:-1,pt,df:e==='defuse'?1:0,e,fs,pl:plant&&siteC?jit(siteC,250):null,ps});
}
pl.forEach(p=>{p.sc=Math.round(p.k*160+p.as*30+p.dmg/4+ri(400,1200));});
return{id:row.id,v:6,map:row.map,date:row.date,ts:row.ts,rounds,kills,pl,demo:true};
}
;
"use strict";
const TH={draft:null,fonts:new Set(),last:null};
const DEF_ACCENT='#ff2e97';
const themeSaved=()=>themeClean(ST.get('theme',{}));
const canPerso=()=>featOn('perso',APP.plan,APP.cfg);
const themeUsed=()=>TH.draft||(canPerso()?themeSaved():themeFree(themeSaved()));
function bestMap(rows){const a=aggBy(rows||[],'map').filter(x=>MAP_ID[x.key]);const ok=a.filter(x=>x.n>=3).sort((x,y)=>smooth(y.w,y.n)-smooth(x.w,x.n));return(ok[0]||a[0]||{}).key||'';}
function themeCompute(t,prof){
const rows=prof?prof.rows:[],main=mainAgent(rows),last=rows[0]?rows[0].agent:null,tier=prof?prof.mmr.tier:0,has=a=>!!(a&&(window.KITS||{})[a]);
let agent=null,map='',label='',accent='';
if(t.mode==='auto'){agent=has(main)?main:null;label=agent?`${agent}, ton agent principal`:'';}
else if(t.mode==='dernier'){agent=has(last)?last:null;label=agent?`${agent}, ton dernier agent joué`:'';}
else if(t.mode==='agent'){agent=has(t.agent)?t.agent:has(main)?main:null;label=agent?`${agent}, choisi par toi`:'';}
else if(t.mode==='rang'){accent=tier?tierCol(tier):'';agent=has(main)?main:null;label=`ton rang (${tierFr(tier)})`;}
else if(t.mode==='carte'){map=MAP_ID[t.map]?t.map:bestMap(rows);accent=MAP_COL[map]||'';agent=has(main)?main:null;label=map?`ta carte : ${map}`:'';}
else if(t.mode==='cartejoueur'){agent=has(main)?main:null;label='ta carte de joueur';}
else if(t.mode==='perso'){agent=has(t.agent)?t.agent:has(main)?main:null;map=MAP_ID[t.map]?t.map:'';label='tes réglages';}
else label='neutre';
const role=ROLE_OF[agent||main]||null,rs=t.mode==='neutre'?{}:ROLE_STYLE[role]||{};
accent=t.accent||accent||(agent&&t.mode!=='neutre'?AGENT_COL[agent]:'')||DEF_ACCENT;
const bg=mixHex(accent,'#05060a',.94),bg2=mixHex(accent,'#0b0c12',.89);
const card=prof&&prof.card,custom=ST.get('img','');
const src=t.bg!=='auto'?t.bg:t.mode==='carte'?'splash':t.mode==='cartejoueur'?'card':t.mode==='neutre'||t.mode==='rang'?'degrade':t.mode==='perso'&&custom?'image':'art';
const mapBg=map||(MAP_ID[t.map]?t.map:bestMap(rows));
const bgImg=src==='art'?IMG.agent(agent,'background'):src==='portrait'?IMG.agent(agent,'fullportrait'):src==='splash'?IMG.map(mapBg):src==='card'?IMG.card(card,'largeart')
:src==='image'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(custom)?custom:'';
const accT=readable(accent,bg2,4.5);
return{accent,accentT:accT,accent2:mixHex(accT,'#ffffff',.25),onAccent:contrast('#ffffff',accent)>=contrast('#0b0710',accent)?'#ffffff':'#0b0710',
bg,bg2,bgImg,bgSrc:src,portrait:t.mode==='neutre'?'':IMG.agent(agent||main,'fullportrait'),agent,map:mapBg,role,
fontT:t.fontT==='auto'?'teko':t.fontT,fontB:t.fontB,fx:t.fx==='auto'?rs.fx||'aucun':t.fx,
cards:t.cards,radius:t.radius,density:t.density,anim:t.anim,streamer:t.streamer,blur:t.blur,dark:t.dark,label};
}
const LOGO_D='M9 20H45L37 28H17V34H39L31 42H17V48H33L25 56H9Z';
const logoTile=(bg,fg)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="15" fill="${bg}"/><g fill="${fg}" transform="translate(9.6 9.6) scale(.7)"><path d="${LOGO_D}"/><circle cx="51" cy="12" r="4.5"/></g></svg>`;
const rgba=(hex,a)=>{const c=hexRgb(hex)||[0,0,0];return`rgba(${c[0]},${c[1]},${c[2]},${a})`;};
function fontLoad(k){
const f=FONTS[k];if(!f||!f.g||TH.fonts.has(k))return;TH.fonts.add(k);
const l=document.createElement('link');l.rel='stylesheet';l.href=`https://fonts.googleapis.com/css2?family=${f.g}&display=swap`;document.head.appendChild(l);
}
function themeApply(th){
TH.last=th;const S=document.documentElement.style,B=document.body;
[['--accent',th.accent],['--accent-t',th.accentT],['--accent2',th.accent2],['--on-accent',th.onAccent],['--bg',th.bg],['--bg2',th.bg2],
['--card',rgba(th.bg2,th.cards==='plein'?1:.62)],['--card-s',th.bg2],['--soft',rgba(th.accent,.16)],['--glow',rgba(th.accent,.45)],
['--radius',th.radius+'px'],['--bg-blur',th.blur+'px'],['--voile-a',rgba(th.bg,th.dark/100)],['--voile-b',rgba(th.bg,Math.min(1,th.dark/100+.18))],
['--font-t',(FONTS[th.fontT]||FONTS.teko).css],['--font-b',(FONTS[th.fontB]||FONTS.systeme).css]].forEach(([k,v])=>S.setProperty(k,v));
fontLoad(th.fontT);fontLoad(th.fontB);
B.dataset.fx=th.fx;B.dataset.cards=th.cards;B.dataset.density=th.density;B.classList.toggle('no-anim',!th.anim);B.classList.toggle('streamer',th.streamer);
const im=document.querySelector('#fond .img');if(im){im.style.backgroundImage=th.bgImg?`url("${th.bgImg}")`:'none';im.dataset.src=th.bgSrc;}
const mt=document.getElementById('metaTheme');if(mt)mt.content=th.bg;
const fav=document.getElementById('favicon');if(fav&&/^#[0-9a-f]{6}$/i.test(th.accent))fav.href='data:image/svg+xml,'+encodeURIComponent(logoTile(th.accent,th.onAccent));
}
function themeRefresh(){themeApply(themeCompute(themeUsed(),APP.prof));}
function persoOpen(){TH.draft=themeClean(canPerso()?themeSaved():themeFree(themeSaved()));$('#perso').hidden=false;document.body.classList.add('drawer-on');persoRender();setTimeout(()=>{const f=$('#perso [data-pf]');if(f)f.focus();},50);}
function persoClose(){
if($('#perso').hidden)return;
const prem=themeDiff(TH.draft);
if(canPerso())ST.set('theme',TH.draft);else{ST.set('theme',themeFree(TH.draft));if(prem.length)toast('Aperçu terminé : passe Premium pour garder ce thème.',false,{label:'Voir Premium',fn:()=>premiumOpen('perso')});}
TH.draft=null;$('#perso').hidden=true;document.body.classList.remove('drawer-on');themeRefresh();render();
}
function persoSet(k,v){const t=Object.assign({},TH.draft,{[k]:v});TH.draft=themeClean(t);themeRefresh();persoRender();if(APP.prof&&(k==='blocks'||k==='hidden'||k==='streamer'))render();}
const star=f=>canPerso()?'':' <span class="star" title="Premium : aperçu possible">★</span>';
function persoRender(){
const t=TH.draft,th=TH.last||themeCompute(t,APP.prof),prem=!canPerso()?themeDiff(t):[],P=APP.prof;
const chips=(k,list,fr,free)=>`<div class="chips">${list.map(v=>`<button type="button" class="chip${t[k]===v?' on':''}" data-pf="${k}" data-v="${esc(v)}" aria-pressed="${t[k]===v}">${esc(fr[v]||v)}${free&&free.includes(v)?'':star()}</button>`).join('')}</div>`;
const agents=Object.keys(window.KITS||{}).sort();
const used=P?aggBy(P.rows,'agent').map(x=>x.key):[];
const blocks=(t.blocks.length?t.blocks:BLOCKS).concat(BLOCKS.filter(b=>!t.blocks.includes(b)&&t.blocks.length));
$('#persoIn').innerHTML=`
  <div class="drawer-h"><h2>Personnaliser</h2><button class="btn ghost sm" data-act="persoClose" aria-label="Fermer">✕</button></div>
  <p class="muted small">Ton interface : <b>${esc(th.label||'—')}</b>. ${canPerso()?'Tout est enregistré dans ce navigateur.':'Le thème automatique est gratuit. Les réglages ★ sont en aperçu : ils s\'annulent à la fermeture sans Premium.'}</p>
  ${prem.length?`<div class="infobox">Aperçu Premium en cours (${prem.length} réglage${prem.length>1?'s':''}). <button class="btn sm" data-act="premium:perso">Garder ce thème</button></div>`:''}
  <h3>Ton thème</h3>${chips('mode',THEME_ENUM.mode,MODE_FR,['auto','dernier','neutre'])}
  ${t.mode==='agent'||t.mode==='perso'?`<label class="lbl">Agent${star()}</label><div class="agrid">${agents.map(a=>`<button type="button" class="ag${t.agent===a||(!t.agent&&th.agent===a)?' on':''}${used.includes(a)?' joue':''}" data-pf="agent" data-v="${esc(a)}" title="${esc(a)}${used.includes(a)?' (joué)':''}"><img src="${IMG.agent(a)}" alt="${esc(a)}" loading="lazy"></button>`).join('')}</div>`:''}
  ${t.mode==='carte'||t.mode==='perso'||t.bg==='splash'?`<label class="lbl" for="pfMap">Carte${star()}</label><select id="pfMap" data-pf="map"><option value="">Auto : ta meilleure carte</option>${Object.keys(MAP_ID).sort().map(m=>`<option${t.map===m?' selected':''}>${m}</option>`).join('')}</select>`:''}
  <h3>Fond</h3>${chips('bg',THEME_ENUM.bg,BG_FR,['auto'])}
  ${t.bg==='image'?`<div class="row mt8"><label class="btn ghost sm file">Choisir une image${star()}<input type="file" accept="image/png,image/jpeg,image/webp" id="pfImg" hidden></label>${ST.get('img','')?'<button class="btn ghost sm" data-act="imgDel">Retirer mon image</button>':''}</div><p class="note">Réduite automatiquement, gardée seulement dans ce navigateur.</p>`:''}
  <div class="grid g2 mt8"><div><label class="lbl" for="pfBlur">Flou du fond : ${t.blur} px</label><input type="range" id="pfBlur" min="0" max="20" value="${t.blur}" data-pf="blur" data-num="1"></div>
    <div><label class="lbl" for="pfDark">Assombrir : ${t.dark} %</label><input type="range" id="pfDark" min="30" max="95" value="${t.dark}" data-pf="dark" data-num="1"></div></div>
  <h3>Effet</h3>${chips('fx',THEME_ENUM.fx,FX_FR,['auto'])}
  <h3>Couleur</h3><div class="row"><input type="color" id="pfAcc" value="${esc(t.accent||th.accent)}" data-pf="accent" aria-label="Couleur principale">${star()}<button class="btn ghost sm" data-act="accAuto"${t.accent?'':' disabled'}>Couleur auto</button>
    ${P?aggBy(P.rows,'agent').slice(0,5).map(x=>`<button type="button" class="sw" data-pf="accent" data-v="${AGENT_COL[x.key]||''}" title="Couleur de ${esc(x.key)}" style="background:${AGENT_COL[x.key]||'#888'}"></button>`).join(''):''}</div>
  <h3>Polices</h3><label class="lbl" for="pfFt">Titres</label><select id="pfFt" data-pf="fontT">${THEME_ENUM.fontT.map(f=>`<option value="${f}"${t.fontT===f?' selected':''}>${f==='auto'?'Auto (Teko)':FONTS[f].n+(FONTS[f].g?' · Google':'')+(canPerso()?'':' ★')}</option>`).join('')}</select>
  <label class="lbl" for="pfFb">Texte</label><select id="pfFb" data-pf="fontB">${THEME_ENUM.fontB.map(f=>`<option value="${f}"${t.fontB===f?' selected':''}>${FONTS[f].n}${FONTS[f].g?' · Google':''}${f==='systeme'||canPerso()?'':' ★'}</option>`).join('')}</select>
  <h3>Interface</h3>
  <label class="lbl" for="pfRad">Coins arrondis : ${t.radius} px${star()}</label><input type="range" id="pfRad" min="0" max="24" value="${t.radius}" data-pf="radius" data-num="1">
  ${chips('cards',THEME_ENUM.cards,{verre:'Cartes en verre',plein:'Cartes pleines',neon:'Contour néon'},['plein'])}
  <div class="mt8">${chips('density',THEME_ENUM.density,{confort:'Confort',compact:'Compact'},THEME_ENUM.density)}</div>
  <label class="chk mt8"><input type="checkbox" data-pf="anim" ${t.anim?'checked':''}> Animations</label>
  <label class="chk"><input type="checkbox" data-pf="streamer" ${t.streamer?'checked':''}> Mode streamer (cache ton #tag)</label>
  <h3>Blocs de l'accueil${star()}</h3><div class="blocks">${blocks.map((b,i)=>`<div class="blk${t.hidden.includes(b)?' off':''}"><span>${esc(BLOCK_FR[b])}</span>
    <button class="btn ghost sm" data-act="blk:${b}:-1" ${i?'':'disabled'} aria-label="Monter">↑</button><button class="btn ghost sm" data-act="blk:${b}:1" ${i<blocks.length-1?'':'disabled'} aria-label="Descendre">↓</button>
    <button class="btn ghost sm" data-act="blkHide:${b}" aria-label="${t.hidden.includes(b)?'Afficher':'Masquer'}">${t.hidden.includes(b)?'Afficher':'Masquer'}</button></div>`).join('')}</div>
  <h3>Partager ton thème${star()}</h3><p class="note">Un code à donner à tes amis : ils retrouvent ton interface (sans ton image perso).</p>
  <div class="row"><input id="pfCode" value="${esc(themeCode(t))}" readonly aria-label="Code de ton thème"><button class="btn ghost sm" data-act="themeCopy">Copier</button></div>
  <div class="row mt8"><input id="pfImport" placeholder="Colle un code PHT1.…" aria-label="Code de thème à importer"><button class="btn ghost sm" data-act="themeImport">Essayer</button></div>
  <div class="row mt"><button class="btn ghost" data-act="themeReset">Tout remettre par défaut</button><button class="btn" data-act="persoClose">${canPerso()?'Terminé':'Fermer'}</button></div>`;
}
document.addEventListener('input',e=>{
const el=e.target.closest('#perso [data-pf]');if(!el||el.type==='checkbox')return;
if(el.type==='range'){const lb=el.previousElementSibling;TH.draft[el.dataset.pf]=+el.value;themeRefresh();if(lb)lb.textContent=lb.textContent.replace(/[\d]+ (px|%)/,`${el.value} $1`);return;}
if(el.type==='color'){TH.draft.accent=el.value;themeRefresh();}
});
document.addEventListener('change',e=>{
const el=e.target.closest('#perso [data-pf]');if(!el)return;
if(el.type==='checkbox')return persoSet(el.dataset.pf,el.checked);
if(el.type==='range')return persoSet(el.dataset.pf,+el.value);
if(el.tagName==='SELECT'||el.type==='color')return persoSet(el.dataset.pf,el.value);
});
document.addEventListener('change',e=>{if(e.target.id==='pfImg'&&e.target.files[0])imgLoad(e.target.files[0]);});
document.addEventListener('click',e=>{const b=e.target.closest('#perso button[data-pf]');if(b){e.preventDefault();persoSet(b.dataset.pf,b.dataset.v);}});
async function imgLoad(file){
if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>15e6)return toast('Image PNG, JPEG ou WebP de moins de 15 Mo',true);
try{
const bmp=await createImageBitmap(file),sc=Math.min(1,1600/bmp.width),cv=document.createElement('canvas');cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);
cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);let q=.82,url=cv.toDataURL('image/jpeg',q);
while(url.length>1.2e6&&q>.4){q-=.12;url=cv.toDataURL('image/jpeg',q);}
if(!ST.set('img',url))return toast('Image trop lourde pour ce navigateur',true);
persoSet('bg','image');
}catch(e){toast('Image illisible',true);}
}
;
"use strict";
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const rndD=(n,d)=>{const p=10**d,r=Math.sign(n)*Math.round(Math.abs(n)*p*(1+Number.EPSILON))/p;return r||0;};
const fmt=(n,d=1)=>n==null||!Number.isFinite(+n)?'—':rndD(+n,d).toFixed(d).replace('.',',');
const pc0=v=>v==null||!Number.isFinite(+v)?'—':`${rndD(+v,0)} %`;
const sg=(x,d=1)=>{if(x==null||!Number.isFinite(+x))return'—';const s=fmt(Math.abs(x),d);return/^[0,]+$/.test(s)?s:`${x>0?'+':'−'}${s}`;};
const dFr=(ts,o={weekday:'short',day:'numeric',month:'short'})=>{try{return new Date(ts).toLocaleDateString('fr-FR',o);}catch(e){return'';}};
const hFr=ts=>{try{return new Date(ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});}catch(e){return'';}};
const agImg=(a,cls='ag')=>{const u=IMG.agent(a);return u?`<img class="${cls}" src="${u}" alt="${esc(a)}" title="${esc(a)}" loading="lazy">`:`<span class="${cls} ph">${esc(String(a||'?').slice(0,2))}</span>`;};
const lockTag=f=>featOn(f,APP.plan,APP.cfg)?'':' <span class="star" title="Premium">★</span>';
const trendTxt=(a,b,d=1,inv)=>a==null||b==null?'':`<small class="${(a-b)*(inv?-1:1)>=0?'up':'down'}">${a>=b?'▲':'▼'} ${fmt(Math.abs(a-b),d)}</small>`;
const rateCls=(k,n,ref=.5)=>trust(k,n,ref);
const empty=t=>`<p class="muted">${esc(t)}</p>`;
const nPart=(n,w='partie')=>`${n} ${w}${n>1?'s':''}`;
const vndTxt=a=>`${a.w} V${a.n-a.w-a.l?` · ${a.n-a.w-a.l} N`:''} · ${a.l} D`;
const nulTxt=a=>{const n=a.n-a.w-a.l;return n?`${n} nul${n>1?'s':''} · `:'';};
const skel=(lines=3,cls='')=>`<div class="card ${cls}" role="status" aria-busy="true"><span class="sr">Chargement…</span><div class="skel skel-t"></div>${'<div class="skel skel-l"></div>'.repeat(lines)}</div>`;
const stateHtml=(ic,t,p,btn,err)=>`<div class="card state${err?' err':''}"><div class="state-i" aria-hidden="true">${ic}</div><h2>${esc(t)}</h2>${p?`<p>${esc(p)}</p>`:''}${btn?`<button class="btn" data-act="${esc(btn[1])}">${esc(btn[0])}</button>`:''}</div>`;
const verdictHtml=(v,eb,cls='mt')=>`<div class="card hi verdict ${v.cls||''} ${cls}"><div class="verdict-i${v.img?' ag':''}" aria-hidden="true">${v.img||''}</div><div><p class="eyebrow">${eb}</p><h2>${esc(v.h)}</h2><p>${esc(v.p)}</p></div>
  ${(v.facts||[]).length?`<div class="kpis">${v.facts.map(([n,b,s])=>`<div class="kpi"><span>${n}</span>${b}<small>${s}</small></div>`).join('')}</div>`:''}${v.acts?`<div class="acts">${v.acts}</div>`:''}</div>`;
const mbarH=(n,v,max,txt,me)=>`<div class="mbar${me?' me':''}"><span>${esc(n)}</span><i><i style="width:${v==null||!max?0:Math.round(Math.min(1,v/max)*100)}%"></i></i><b>${txt}</b></div>`;
const CH_RO=window.ResizeObserver?new ResizeObserver(es=>es.forEach(e=>{const el=e.target;if(el._ch&&el.isConnected&&Math.abs(el.clientWidth-(el._chw||0))>4){el._chw=el.clientWidth;el.innerHTML=el._ch(el.clientWidth);}})):null;
function chartMount(id,fn){after(()=>{const el=$('#'+id);if(!el)return;el._ch=fn;el._chw=el.clientWidth;el.innerHTML=fn(el.clientWidth||600);if(CH_RO)CH_RO.observe(el);});}
const nTag=(n,unit='rounds',min=10)=>`<span class="n">(${n} ${esc(unit)})</span>${n<min?' <span class="low-b">peu de données</span>':''}`;
const ACT={};
const AFTER=[],after=fn=>AFTER.push(fn);
const runAfter=()=>AFTER.splice(0).forEach(f=>{try{const p=f();if(p&&p.catch)p.catch(e=>console.error(e));}catch(e){console.error(e);}});
function renderLanding(){
const C=APP.cfg,prem=Object.entries(FEATURES).filter(([k])=>!featOn(k,'free',C)),free=Object.entries(FEATURES).filter(([k])=>featOn(k,'free',C));
const wall=['Jett','Reyna','Omen','Sova','Killjoy'];
$('#app').innerHTML=`
  <section class="land"><div class="motif" aria-hidden="true"></div>
    <div class="land-txt">
      <p class="eyebrow">Tracker perso · gratuit · sans compte</p>
      <h1>Tes stats, <em>à tes couleurs</em>.</h1>
      <p class="lead">Entre ton Riot ID : rang, RR, rapports de partie, et surtout <b>où te placer</b>, <b>quelle strat jouer</b> sur chaque carte et <b>comment t'entraîner</b>. L'interface prend les couleurs de ton agent principal.</p>
      <form id="landForm" class="land-form" autocomplete="off">
        <input id="landRiot" placeholder="Pseudo#TAG" aria-label="Ton Riot ID (Pseudo#TAG)" maxlength="30" value="${esc((ST.get('last')||{}).riot||'')}">
        <select id="landReg" aria-label="Région">${REGIONS.map(([v,n])=>`<option value="${v}"${v===((ST.get('last')||{}).region||'eu')?' selected':''}>${n}</option>`).join('')}</select>
        <button class="btn big" type="submit">Voir mon profil</button>
      </form>
      <label class="chk small"><input type="checkbox" id="landOk" ${ST.get('consent')?'checked':''}> C'est mon compte (ou le joueur est d'accord). Mes données restent dans mon navigateur.</label>
      <p class="small muted mt8">Pas encore prêt ? <a href="#" data-act="demo">Voir la démo</a> avec un profil inventé.</p>
    </div>
    <div class="wall" aria-hidden="true">${wall.map((a,i)=>`<img src="img/mur-${a.toLowerCase()}.webp" alt="" width="661" height="600" style="--i:${i};--c:${AGENT_COL[a]}" loading="lazy" decoding="async" fetchpriority="low">`).join('')}</div>
  </section>
  <h2 class="sr">Ce que fait ${esc(C.nom)}</h2>
  <section class="grid g3 feats">
    <div class="card"><h3>${ico('tactique')}Positionnement optimal</h3><p>Tes meilleurs spots, carte par carte, avec l'angle à tenir et d'où on te tue. Comparé aux joueurs de ton niveau, jamais une position intenable.</p></div>
    <div class="card"><h3>${ico('map')}Stratégie par carte</h3><p>Quel site attaquer, où smoker, où te placer en défense, quand tourner, quel agent prendre. Écrit pour TON agent, avec un briefing d'1 minute.</p></div>
    <div class="card"><h3>${ico('entrainement')}Entraînement sur mesure</h3><p>Routine réglée sur ton rang et tes vrais points faibles, minuteur, test de réflexes, sensibilité idéale et plan de la semaine.</p></div>
    <div class="card"><h3>${ico('analyse')}Plus que des chiffres</h3><p>Chaque partie expliquée : rounds gagnés contre attendus, ton impact en rounds, tes duels sur la carte, les moments qui ont tout changé.</p></div>
    <div class="card"><h3>${ico('coach')}Un coach honnête</h3><p>Ta place réelle dans tes lobbys et tes vrais points faibles, seulement quand les chiffres sont sûrs. Objectif de rang, défis et succès.</p></div>
    <div class="card"><h3>${ico('palette')}Ton interface, ton agent</h3><p>Joue Jett ? Tout passe en bleu ciel avec son art en fond. Main Omen ? Violet et fumée. Ça change tout seul avec ton profil.</p></div>
  </section>
  ${pricingHtml()}
  <section class="card faq mt">
    <h2>Questions</h2>
    <details><summary>Où vont mes données ?</summary><p>Nulle part : elles sont gardées dans ton navigateur (stockage local). Pas de compte, pas de base de données, pas de pub. Bouton « Oublier mes données » dans les réglages.</p></details>
    <details><summary>Comment marche Premium ?</summary><p>Tu paies une fois (${esc(C.achat.vie||'—')}) ou par mois (${esc(C.achat.mensuel||'—')}) et tu reçois un code lié à ton Riot ID. Tu le colles dans « J'ai un code » : tout est débloqué, sans compte.</p></details>
    <details><summary>Est-ce que c'est officiel ?</summary><p>Non. ${esc(C.nom)} est un projet de fan, pas approuvé par Riot Games. Les données viennent de l'API communautaire HenrikDev.</p></details>
    <details><summary>Mes stats ne bougent pas ?</summary><p>Les données sont gardées 10 minutes pour ne pas surcharger le service : clique « Actualiser » sur ton profil après une partie.</p></details>
    <details><summary>Est-ce que je peux l'installer comme une appli ?</summary><p>Oui : sur ordinateur, bouton « Installer » dans la barre du haut (Chrome, Edge) ; sur téléphone, menu du navigateur › « Ajouter à l'écran d'accueil ».</p></details>
    <details><summary>Le positionnement et les strats, c'est autorisé ?</summary><p>Oui : tout vient de tes parties terminées, sur toi-même. Rien n'est utilisé pendant une partie et aucun adversaire n'est identifié.</p></details>
  </section>`;
$('#recherche').hidden=true;document.body.classList.remove('has-gnav');heroWatch();
}
function pricingHtml(){
const C=APP.cfg,li=([k,f],on)=>`<li class="${on?'good':'badl'}">${esc(f.n)}</li>`;
const all=Object.entries(FEATURES);
return`<section class="pricing mt" id="offres">
    <div class="card plan"><h3>Gratuit</h3><p class="price">0 €</p><ul class="ul">${all.map(x=>li(x,featOn(x[0],'free',C))).join('')}</ul></div>
    <div class="card plan best"><h3>Premium <span class="pill">tout débloqué</span></h3><p class="price">${esc(C.achat.vie||'—')} <small>à vie</small>${C.achat.mensuel?` <span class="muted small">ou ${esc(C.achat.mensuel)} / mois</span>`:''}</p>
      <ul class="ul">${all.map(x=>li(x,true)).join('')}</ul>
      ${C.freeAll?'<div class="infobox">Lancement : tout est gratuit en ce moment.</div>':`<div class="row mt8">${C.achat.lien?`<a class="btn" href="${esc(C.achat.lien)}" target="_blank" rel="noopener noreferrer">Acheter Premium</a>`:'<span class="muted small">Achat bientôt disponible.</span>'}<button class="btn ghost" data-act="codeAsk">J'ai un code</button></div>`}
      <p class="note">Indique ton Riot ID dans le message du paiement : tu reçois ton code${C.achat.contact?` (contact : ${esc(C.achat.contact)})`:''}. Le code est lié à ton compte.</p></div>
  </section>`;
}
const TABS_P=[['vue','Vue d\'ensemble'],['parties','Parties'],['agents','Agents & cartes'],['position','Positionnement','position'],['strategie','Stratégie','strategie'],['entrainement','Entraînement','entrainement'],
['visee','Visée','visee'],['coach','Coach','coach'],['progression','Progression','progression'],['comparer','Comparer','comparer'],['meta','Méta','meta']];
const TAB_KEYS=TABS_P.map(t=>t[0]);
const GROUPS=[['moi','Moi',['vue','parties','progression']],['analyse','Analyse',['coach','visee','agents','comparer']],['tactique','Tactique',['position','strategie','meta']],['entrainement','Entraînement',['entrainement']]];
const groupOf=k=>GROUPS.find(g=>g[2].includes(k))||GROUPS[0];
const ico=n=>`<svg class="ico" aria-hidden="true"><use href="#i-${n}"/></svg>`;
function navHtml(){
const G=groupOf(APP.tab),P=APP.prof,M=P.mmr,av=IMG.card(P.card,'smallart')||IMG.agent((TH.last||{}).agent);
return`<nav class="gnav" aria-label="Sections du profil">${GROUPS.map(([g,n])=>`<button type="button" data-act="grp:${g}"${G[0]===g?' aria-current="page"':''}>${ico(g)}<span>${n}</span></button>`).join('')}</nav>
    <div class="snav"><div class="tabs" role="tablist" aria-label="${esc(G[1])}"${G[2].length<2?' hidden':''}>${G[2].map(k=>{const[,n,f]=TABS_P.find(t=>t[0]===k);
return`<button role="tab" data-act="tab:${k}" id="tb-${k}" aria-selected="${APP.tab===k}" tabindex="${APP.tab===k?0:-1}">${n}${f?lockTag(f):''}</button>`;}).join('')}</div>
    <div class="navid" aria-hidden="true">${av?`<img src="${av}" alt="">`:''}<b>${esc(P.name)}</b><small>${esc(tierFr(M.tier))}${M.rr!=null?` · ${clamp(M.rr,0,100)} RR`:''}</small></div></div>`;
}
function navRender(){
const n=$('#pnav');if(!n||!APP.prof)return;const had=n.contains(document.activeElement)?document.activeElement.dataset.act:null;
n.innerHTML=navHtml();n.classList.toggle('solo',groupOf(APP.tab)[2].length<2);
if(had){const f=n.querySelector(`[data-act="${had}"]`)||$('#tb-'+APP.tab);if(f)f.focus({preventScroll:true});}
}
let HERO_IO=null;
function heroWatch(){
if(HERO_IO)HERO_IO.disconnect();HERO_IO=null;document.body.classList.remove('hero-off');const h=$('.hero');if(!h||!window.IntersectionObserver)return;
HERO_IO=new IntersectionObserver(([e])=>document.body.classList.toggle('hero-off',!e.isIntersecting),{rootMargin:'-110px 0px 0px 0px'});HERO_IO.observe(h);
}
function renderProfile(){
const P=APP.prof,th=TH.last||themeCompute(themeUsed(),P),M=P.mmr,lic=APP.lic;
$('#recherche').hidden=false;
const rr=M.rr==null?null:clamp(M.rr,0,100),banner=IMG.card(P.card,'wideart')||IMG.agent(th.agent,'background'),bannerM=IMG.card(P.card,'largeart')||banner,av=IMG.card(P.card,'smallart')||IMG.agent(th.agent);
$('#app').innerHTML=`
  ${P.demo?'<div class="infobox demo"><b>Démo</b> : profil inventé, tout est débloqué pour te montrer le site. <a href="#" data-act="accueil">Voir mon vrai profil</a></div>':''}
  <section class="hero" style="--banner:url('${banner}');--banner-m:url('${bannerM}');--rk:${tierCol(M.tier)}">
    <div class="banner"></div><div class="motif" aria-hidden="true"></div>${th.portrait&&matchMedia('(min-width:761px)').matches?`<img class="portrait" src="${th.portrait}" alt="" decoding="async" fetchpriority="low">`:''}
    <div class="hero-in">
      <div class="avatar">${av?`<img src="${av}" alt="">`:''}</div>
      <div class="who">
        <h1 class="pseudo">${esc(P.name)}<span class="tag">#${esc(P.tag)}</span></h1>
        <p class="sub">${P.level?`Niveau ${P.level} · `:''}${esc((REGIONS.find(r=>r[0]===P.region)||['',P.region])[1])}${th.label?` · interface : <b>${esc(th.label)}</b>`:''}</p>
        <div class="rank">${M.tier?`<img src="${IMG.rank(M.tier)}" alt="">`:''}<div>
          <b>${esc(tierFr(M.tier))}</b>${rr!=null?` <span>${rr} RR</span>`:''}${M.last!=null?` <small class="${M.last>=0?'up':'down'}">${sg(M.last,0)}</small>`:''}
          ${rr!=null?`<div class="rrbar" title="${rr} RR sur 100"><i style="width:${rr}%"></i></div>`:M.need?`<p class="small muted">Encore ${nPart(M.need)} de placement</p>`:''}
          ${M.peak.tier?`<p class="small muted">Pic : ${esc(tierFr(M.peak.tier))}${M.peak.season?` (${esc(M.peak.season)})`:''}</p>`:''}</div></div>
      </div>
      <div class="hero-act">
        ${P.demo?'':`<button class="btn ghost sm" data-act="refresh" title="Recharger depuis le service" aria-label="Actualiser">${ico('refresh')}<span class="lbl-m">Actualiser</span></button>`}
        <button class="btn ghost sm" data-act="perso" aria-label="Personnaliser">${ico('palette')}<span class="lbl-m">Personnaliser</span></button>
        <button class="btn ghost sm" data-act="share" title="Image de ton profil à partager" aria-label="Partager">${ico('share')}<span class="lbl-m">Partager</span>${lockTag('partage')}</button>
        ${P.demo?'':`<button class="btn ghost sm" data-act="linkCopy" title="Copier le lien direct vers ce profil" aria-label="Copier le lien">${ico('link')}<span class="lbl-m">Lien</span></button>`}
        ${APP.plan==='free'?'':`<span class="pill prem" title="${lic&&lic.exp?`Jusqu'au ${esc(lic.exp)}`:'À vie'}">★ ${APP.plan==='dieu'?'Mode Dieu':'Premium'}${lic&&lic.days!=null?` · ${lic.days} j`:''}</span>`}
      </div>
    </div>
  </section>
  <div id="pnav" class="pnav${groupOf(APP.tab)[2].length<2?' solo':''}">${navHtml()}</div>
  <div id="tabIn" role="tabpanel" aria-labelledby="tb-${APP.tab}"></div>`;
document.body.classList.add('has-gnav');heroWatch();tabShow();renderTab();
}
function tabShow(){const nav=$('.tabs'),b=$('#tb-'+APP.tab);if(nav&&b)nav.scrollLeft=Math.max(0,b.offsetLeft-(nav.clientWidth-b.clientWidth)/2);}
function renderTab(){
const el=$('#tabIn');if(!el)return;
if(!TAB_KEYS.includes(APP.tab))APP.tab='vue';
const f=(TABS_P.find(t=>t[0]===APP.tab)||[])[2];
AFTER.length=0;
if(f&&!featOn(f,APP.plan,APP.cfg)){el.innerHTML=teaser(f);return;}
if(['position','strategie','entrainement','meta'].includes(APP.tab)&&typeof tabTrain==='undefined'){el.innerHTML=skel(4);lotLoad().then(()=>renderTab(),e=>{el.innerHTML=stateHtml('!','Onglet indisponible',e.message,['Réessayer','retab'],true);});return;}
const V={vue:tabVue,parties:tabParties,agents:tabAgents,position:()=>tabPosition(),strategie:()=>tabStrat(),entrainement:()=>tabTrain(),meta:()=>tabMeta(),visee:tabVisee,progression:tabProg,coach:tabCoach,comparer:tabComparer};
try{el.innerHTML=(['visee','coach','position','strategie','entrainement','progression'].includes(APP.tab)?detPick():'')+(V[APP.tab]||tabVue)();runAfter();}
catch(e){console.error(e);el.innerHTML=`<div class="card">${empty('Affichage impossible : '+e.message)}</div>`;logErr(e);}
if(['visee','coach','vue','position','strategie','entrainement','progression'].includes(APP.tab))detNeed();
if(APP.tab==='meta'&&APP.meta===undefined)metaLoad().then(()=>{if(APP.tab==='meta'&&canRerender())renderTab();});
if(APP.tab==='position'&&(APP.atlas===undefined||!APP.D)){
const P=APP.prof,tab=APP.tab;Promise.all([atlasLoad(),APP.D?null:detLoad(P).then(D=>{if(!APP.D)APP.D=D;})])
.then(()=>{if(APP.prof===P&&APP.tab===tab&&canRerender())renderTab();}).catch(e=>logErr(e));
}
}
const TEASE={visee:['🎯','Tes duels gagnés selon la distance, tes armes, ta précision partie par partie et une piste de sensibilité basée sur tes vrais duels.'],
position:['📍','Tes meilleurs spots sur chaque carte, l\'angle à tenir, les zones où tu perds tes duels et d\'où l\'adversaire te tue. Comparé aux joueurs de ton niveau.'],
strategie:['🗺️','Ton plan d\'attaque et de défense sur chaque carte, écrit pour ton agent : site à jouer, smokes, position, rotation, retake, économie et briefing d\'avant-partie.'],
entrainement:['🏋️','Une routine réglée sur ton rang et tes points faibles, avec minuteur, test de réflexes, sensibilité idéale et plan de la semaine.'],
progression:['📈','Ta courbe de RR complète, tes semaines, et surtout ta limite du soir : à partir de combien de parties tu commences à perdre.'],
coach:['🧠','Ta place réelle dans tes lobbys (mieux que X % des joueurs), tes points faibles sûrs, et les exercices qui vont avec.'],
comparer:['⚔️','Toi contre un ami : victoires, K/D, ACS, précision, agents en commun.'],rapports:['📋','Le rapport de chaque partie.'],historique:['🗂️','Jusqu\'à 100 parties.'],partage:['📸','Une image de ton profil à tes couleurs.'],perso:['🎨','Tout personnaliser.']};
const TEASE_IC={visee:'analyse',position:'tactique',strategie:'map',entrainement:'entrainement',progression:'moi',coach:'coach',comparer:'analyse',rapports:'analyse',historique:'moi',partage:'share',perso:'palette'};
function teaser(f){
const txt=(TEASE[f]||[])[1]||'';
return`<div class="card state"><div class="state-i" aria-hidden="true">${ico(TEASE_IC[f]||'moi')}</div><h2>${esc(FEATURES[f].n)}</h2><p>${esc(txt)}</p>
    <div class="row center"><button class="btn big" data-act="premium:${f}">Débloquer avec Premium</button><button class="btn ghost" data-act="demo">Voir dans la démo</button></div></div>`;
}
function tabVue(){
const P=APP.prof,R=P.rows,t=themeUsed(),order=(t.blocks.length?t.blocks.concat(BLOCKS.filter(b=>!t.blocks.includes(b))):BLOCKS).filter(b=>!t.hidden.includes(b));
if(!R.length)return stateHtml(ico('moi'),'Aucune partie classée récente','Joue une partie classée, puis actualise : tes stats apparaissent ici.',P.demo?null:['Actualiser','refresh']);
const B={kpis:bKpis,session:bSession,objectif:bObjectif,forme:bForme,rr:bRR,agents:bAgents,cartes:bCartes,records:bRecords,dernier:bDernier,defis:bDefis,succes:bSucces};
const hid=t.hidden.filter(b=>B[b]);
return`<div class="vue">${order.filter(b=>B[b]).map(b=>{let h='';try{h=B[b]();}catch(e){console.error(e);logErr(e);}return h?`<div class="blk-${b}">${h}</div>`:'';}).join('')}</div>
    ${hid.length?`<p class="note">Blocs masqués : ${hid.map(b=>esc(BLOCK_FR[b])).join(', ')}. <a href="#" data-act="perso">Les afficher ou changer l'ordre</a></p>`:''}`;
}
function sessionLimit(rows){return nightLimit(nthStats(sessionsOf(rows).map(s=>s.map(r=>r.res))));}
function bSession(){
const P=APP.prof,R=P.rows,ses=sessionsOf(R).pop()||[],cur=ses.length&&Date.now()-ses[ses.length-1].ts<8*36e5?ses:[],lim=sessionLimit(R);
const rrOf=S=>P.hist.filter(h=>h.ts>=S[0].ts-6e4&&h.ts<=S[S.length-1].ts+6e4).reduce((s,h)=>s+(h.ch||0),0);
if(!cur.length){
const L=ses.length?rowsAgg(ses):null,ids=new Set(ses.map(r=>r.id)),SG=(APP.D||[]).length>=3?coachData().G.filter(g=>ids.has(g.id)):[];
const eT=ERR_KEYS.map(k=>[k,SG.reduce((s,g)=>s+(g['e_'+k]||0),0)]).sort((a,b)=>b[1]-a[1])[0],sImp=SG.length?SG.reduce((s,g)=>s+g.imp,0)/SG.length:null;
return verdictHtml({h:'Avant de lancer',p:'Test de réflexes (30 s) puis échauffement de 10 minutes : tu commences la session à ton vrai niveau.',
facts:[['Ta limite',`<b>${lim?`${lim} partie${lim>1?'s':''}`:'—'}</b>`,lim?'par session : au-delà, tu perds nettement plus souvent':'pas de baisse sûre : arrête-toi après 3 défaites d\'affilée'],
L&&['Dernière session',`<b>${L.w} V · ${L.l} D</b>`,`${nulTxt(L)}${esc(dFr(ses[0].ts))}${P.hist.length?` · ${sg(rrOf(ses),0)} RR`:''}${sImp!=null?` · impact ${sg(sImp,1)} round/partie`:''}`],
eT&&eT[1]>=2&&['À corriger ce soir',`<b>${eT[1]}×</b>`,`${esc(ERR_DEF[eT[0]].t.toLowerCase())} à la dernière session`]].filter(Boolean),
acts:'<button class="btn" data-act="warmup">Échauffement 10 min</button><button class="btn ghost" data-act="tab:entrainement">Test de réflexes</button>'},'Ce soir','');
}
const A=rowsAgg(cur),before=rowsAgg(R.filter(r=>r.ts<cur[0].ts).slice(0,30)),rr=rrOf(cur);
const last3=cur.slice(-3),lost3=last3.length===3&&last3.every(r=>r.res==='L'),low=cur.length>=3&&before.acs&&A.acs<before.acs*.85;
const T=(APP.D||[]).length>=8?tiltOf(coachData().G,cur):null,drop=T&&T.ses&&T.ses.drop,aft=T&&T.after&&T.after.sure&&cur[cur.length-1].res==='L'?T.after:null;
const st=lim&&cur.length>=lim?['bad','Stop conseillé',`Tu as atteint ta limite habituelle (${lim} parties) : au-delà, tu perds nettement plus souvent.`]
:lost3?['bad','Pause conseillée','3 défaites d\'affilée : 15 minutes de pause, ou arrête-toi pour ce soir.']
:drop?['foe','Attention : ton jeu baisse',`Tes kills et tes morts rapportent nettement moins de rounds que d'habitude ce soir (${sg(T.ses.imp*20,1)} contre ${sg(T.ses.base*20,1)} round/partie) : pause de 10 min ou fin de session.`]
:low?['foe','Attention',`Tu joues en dessous de ton niveau ce soir (ACS ${fmt(A.acs,0)} contre ${fmt(before.acs,0)} d'habitude).`]
:['ok','Feu vert','Tu peux continuer : rien d\'inquiétant dans cette session.'];
if(aft)st[2]+=` Après une défaite, tu meurs en premier plus souvent (${fmt(aft.fdL,0)} % des rounds contre ${fmt(aft.fdW,0)} %) : joue la prochaine en 2e contact.`;
return verdictHtml({cls:st[0],h:st[1],p:st[2],facts:[['Ce soir',`<b>${A.w} V · ${A.l} D</b>`,`${nulTxt(A)}${cur.length} partie${cur.length>1?'s':''}${lim?` sur ta limite de ${lim}`:''}`],
P.hist.length&&['RR',`<b class="${rr>=0?'up':'down'}">${sg(rr,0)}</b>`,'gagnés ou perdus ce soir'],
!low&&['ACS',`<b>${fmt(A.acs,0)}</b>`,before.acs?`${trendTxt(A.acs,before.acs,0)} par rapport à ton habitude (${fmt(before.acs,0)})`:'score de combat par round']].filter(Boolean)},'Session en cours','');
}
function bObjectif(){
const P=APP.prof,M=P.mmr;if(!(M.tier>=3)||M.tier>=24)return'';
const tg=Math.max(M.tier+1,Math.min(24,+ST.get('goal:'+P.rid,0)||M.tier+1)),p=rrPlan(P.hist,M.tier,M.rr,tg);
const opts=[];for(let t=M.tier+1;t<=24;t++)opts.push(`<option value="${t}"${t===tg?' selected':''}>${esc(tierFr(t))}</option>`);
const done=p?Math.max(0,Math.min(100,100-p.need/((tg-M.tier)*100)*100)):0;
return`<div class="card"><div class="card-h"><h2>Objectif</h2><select data-goal aria-label="Rang visé" class="sel-sm">${opts.join('')}</select></div>
    ${p?`<p>Il te manque <b>${p.need} RR</b> pour ${esc(tierFr(tg))}.</p><div class="bar me"><i style="width:${done}%"></i></div>
      ${p.few?'<p class="note">Il faut au moins 5 parties avec RR pour estimer le nombre de parties.</p>':`<ul class="ul"><li>Au mieux <b>${nPart(p.wins,'victoire')}</b> sans défaite (tu gagnes en moyenne <b>+${Math.round(p.g)} RR</b> par victoire${p.l?`, tu perds −${Math.round(p.l)} par défaite`:''})</li>
      <li>${p.games?`À ton rythme actuel (${Math.round(p.p*100)} % de victoires) : <b>≈ ${nPart(p.games)}</b>`:`<span class="down">À ton rythme actuel (${Math.round(p.p*100)} % de victoires), tu perds du RR</span> : priorité au coach et à l'entraînement`}</li></ul>`}
      <p class="note">Calculé sur tes ${p.n} dernières parties avec RR. Ce n'est pas ton MMR caché, juste tes vrais gains.</p>`:empty('Pas assez de données de RR.')}</div>`;
}
function bDefis(){
const C=weekChallenges(APP.prof.rows,Date.now(),sessionLimit(APP.prof.rows)||5,focusChallenge()),n=C.filter(c=>c.done).length;
return`<div class="card"><div class="card-h"><h2>Défis de la semaine</h2><span class="pill ${n===C.length?'ok':''}">${n}/${C.length}</span></div>
    ${C.map(c=>`<div class="defi${c.done?' done':''}"><span class="defi-i sem ${c.done?'ok':'neutral'}" aria-label="${c.done?'réussi':'en cours'}"></span><div><b>${esc(c.t)}</b>${c.inv?`<small>${c.cur?`plus longue session : ${c.cur} partie${c.cur>1?'s':''}`:'pas encore joué cette semaine'}</small>`:`<div class="bar me"><i style="width:${Math.min(100,c.cur/c.goal*100)}%"></i></div><small>${Math.min(c.cur,c.goal)}/${c.goal}</small>`}</div></div>`).join('')}
    <p class="note">Mesurés tout seuls sur tes parties classées. Le premier suit ton focus du coach. Nouveaux défis chaque lundi.</p></div>`;
}
function bSucces(){
const P=APP.prof,got=badges(P.rows,APP.D||[],P.hist),key='badges:'+P.rid,saved=P.demo?{}:ST.get(key,{});
const all=Object.assign({},saved);Object.entries(got).forEach(([k,ts])=>{if(!all[k]||ts<all[k])all[k]=ts;});if(!P.demo&&JSON.stringify(all)!==JSON.stringify(saved))ST.set(key,all);
const on=BADGES.filter(b=>all[b[0]]),off=BADGES.filter(b=>!all[b[0]]);
const card=([id,ic,nm,how])=>`<div class="badge${all[id]?' on':''}" title="${esc(how)}${all[id]?' · obtenu le '+esc(dFr(all[id],{day:'numeric',month:'short',year:'numeric'})):''}"><span class="badge-i" aria-hidden="true">${ic}</span><b>${esc(nm)}</b><small>${all[id]?esc(dFr(all[id],{day:'numeric',month:'short'})):esc(how)}</small></div>`;
return`<div class="card"><div class="card-h"><h2>Succès</h2><span class="muted small">${on.length}/${BADGES.length} débloqués</span></div>
    ${on.length?`<div class="badges">${on.map(card).join('')}</div>`:'<p class="muted">Pas encore de succès : le premier arrive vite (une série de victoires, un MVP, un ace…).</p>'}
    ${off.length?`<details class="mt8"><summary class="small"><b>À débloquer</b> <span class="muted">(${off.length})</span></summary><div class="badges mt8">${off.map(card).join('')}</div></details>`:''}</div>`;
}
function bKpis(){
const R=APP.prof.rows,h=Math.floor(R.length/2),A=rowsAgg(R),N=rowsAgg(R.slice(0,h)),O=rowsAgg(R.slice(h)),D=APP.D||[],tr=h>=4;
const kast=D.length?D.map(d=>{const l=plLines(d).find(l=>l.p.n==='moi');return l&&{kast:l.kast,r:d.rounds.length};}).filter(Boolean):[],kR=kast.reduce((s,l)=>s+l.r,0);
const tile=(n,v,s,tip)=>`<div class="kpi" title="${esc(tip||'')}"><span>${n}</span><b>${v}</b><small>${s||''}</small></div>`;
return`<div class="card"><div class="card-h"><h2>Chiffres clés</h2><span class="muted small">${A.n} dernières parties classées${tr?` · flèches : tes ${h} plus récentes contre les ${R.length-h} d'avant`:''}</span></div>
  <div class="kpis">
    ${tile('Victoires',pc0(A.wr),`${vndTxt(A)} ${tr?trendTxt(N.wr,O.wr,0):''}`,rateTip(A.w,A.n))}
    ${tile('K/D',fmt(A.kd,2),`${A.k} kills · ${A.d} morts ${tr?trendTxt(N.kd,O.kd,2):''}`)}
    ${tile('ACS',fmt(A.acs,0),`score de combat par round ${tr?trendTxt(N.acs,O.acs,0):''}`)}
    ${tile('Tête',pc0(A.hsP),`des balles touchées ${tr?trendTxt(N.hsP,O.hsP,1):''}`)}
  </div>
  <details class="mt8"><summary class="small"><b>Plus de chiffres</b> <span class="muted">ADR, DDΔ, kills par round, KAST</span></summary><div class="kpis mt8">
    ${tile('ADR',fmt(A.adr,0),`dégâts par round ${tr?trendTxt(N.adr,O.adr,0):''}`)}
    ${tile('DDΔ',sg(A.dd,0),'dégâts donnés − reçus par round','Positif : tu fais plus de dégâts que tu n\'en prends')}
    ${tile('Kills / round',fmt(A.kpr,2),`KDA ${fmt(A.kda,2)}`)}
    ${tile('KAST',kR?pc0(kast.reduce((s,l)=>s+l.kast*l.r,0)/kR):'—',kast.length?`sur ${kast.length} parties détaillées`:'calculé avec le détail des parties')}
  </div></details></div>`;
}
function bForme(){
const R=APP.prof.rows.slice(0,20),s=serieOf(APP.prof.rows);
return`<div class="card"><div class="card-h"><h2>Forme</h2>${s?`<span class="pill ${s.res==='W'?'ok':'bad'}">${s.n} ${s.res==='W'?'victoire':'défaite'}${s.n>1?'s':''} d'affilée</span>`:''}</div>
  <div class="strip">${R.slice().reverse().map(r=>{const t=`${dFr(r.ts)} · ${r.map} · ${r.agent} · ${r.us}-${r.them} · ${r.k}/${r.d}/${r.a}`;return`<i class="${r.res}" title="${esc(t)}" role="img" aria-label="${esc((r.res==='W'?'Victoire':r.res==='L'?'Défaite':'Égalité')+' : '+t)}">${IMG.agent(r.agent)?`<img src="${IMG.agent(r.agent)}" alt="" loading="lazy">`:r.res}</i>`;}).join('')}</div>
  <p class="note">De la plus ancienne (gauche) à la plus récente (droite) · ✓ victoire · ✕ défaite.</p></div>`;
}
function rrSvg(H,w=640,h=170){
if(H.length<2)return empty('Pas assez de parties pour tracer la courbe.');
const L=w<420?62:74,Rt=8,T=10,B=10,xs=H.map((_,i)=>L+i*(w-L-Rt)/(H.length-1)),lo=Math.min(...H.map(x=>x.elo)),hi=Math.max(...H.map(x=>x.elo)),span=Math.max(50,hi-lo);
const y=v=>T+(h-T-B)*(1-(v-lo+span*.05)/(span*1.1)),pts=H.map((x,i)=>`${xs[i].toFixed(1)},${y(x.elo).toFixed(1)}`),r=H.length>60?2.6:3.6;
const divs=[];for(let e=Math.ceil(lo/100)*100;e<=hi;e+=100)divs.push(e);
return`<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="rrsvg" role="img" aria-label="Courbe de RR sur ${H.length} parties : ${sg(H.reduce((s,x)=>s+(x.ch||0),0),0)} RR au total">
    <defs><linearGradient id="rrg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".3"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${divs.map(e=>`<line x1="${L}" x2="${w-Rt}" y1="${y(e).toFixed(1)}" y2="${y(e).toFixed(1)}" class="gl"/><text x="${L-8}" y="${(y(e)+4).toFixed(1)}" class="gt">${esc(tierFr(Math.floor(e/100)+3))}</text>`).join('')}
    <polygon points="${xs[0].toFixed(1)},${h-B} ${pts.join(' ')} ${xs[xs.length-1].toFixed(1)},${h-B}" fill="url(#rrg)"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent-t)" stroke-width="2.5" stroke-linejoin="round"/>
    ${H.map((x,i)=>`<circle cx="${xs[i].toFixed(1)}" cy="${y(x.elo).toFixed(1)}" r="${r}" class="${(x.ch||0)>=0?'pw':'pl'}"><title>${esc(`${dFr(x.ts)} ${x.map?'· '+x.map:''} : ${sg(x.ch,0)} RR (${tierFr(x.t)})`)}</title></circle>`).join('')}
  </svg>`;
}
function bRR(){
const H=APP.prof.hist,full=featOn('progression',APP.plan,APP.cfg),S=full?H:H.slice(-20),net=S.reduce((s,h)=>s+(h.ch||0),0);
if(S.length>=2)chartMount('rrC',w=>rrSvg(S,w,190));
return`<div class="card"><div class="card-h"><h2>RR</h2><span class="muted small">${S.length} dernières parties : <b class="${net>=0?'up':'down'}">${sg(net,0)} RR</b>${full?'':` · <a href="#" data-act="tab:progression">courbe complète ★</a>`}</span></div>
    ${S.length>=2?'<div class="chart" id="rrC" style="height:190px"></div><p class="note">Point plein : victoire · point creux : défaite · survole un point pour le détail.</p>':empty('Pas assez de parties pour tracer la courbe.')}</div>`;
}
function miniAgg(a,img,sub){
return`<div class="mini">${img}<div><b>${esc(a.key)}</b><small>${nPart(a.n)} · <span class="${rateCls(a.w,a.n)||''}" title="${esc(rateTip(a.w,a.n))}">${pc0(a.wr)}</span> · K/D ${fmt(a.kd,2)} · ACS ${fmt(a.acs,0)}</small>${sub||''}</div></div>`;
}
function bAgents(){const A=aggBy(APP.prof.rows,'agent').slice(0,3);return`<div class="card"><div class="card-h"><h2>Tes agents</h2><a href="#" data-act="tab:agents" class="small">Tous</a></div>${A.map(a=>miniAgg(a,agImg(a.key,'ag lg'),`<small class="muted">${esc(ROLE_FR[ROLE_OF[a.key]]||'')}</small>`)).join('')}</div>`;}
function bCartes(){const A=aggBy(APP.prof.rows,'map').slice(0,3);return`<div class="card"><div class="card-h"><h2>Tes cartes</h2><a href="#" data-act="tab:cartes" class="small">Toutes</a></div>${A.map(a=>miniAgg(a,IMG.map(a.key,'listviewicon')?`<img class="mapi" src="${IMG.map(a.key,'listviewicon')}" alt="" loading="lazy">`:'')).join('')}</div>`;}
function bRecords(){
const R=APP.prof.rows,best=(f,min)=>R.filter(min||(()=>true)).reduce((b,r)=>!b||f(r)>f(b)?r:b,null),line=(n,r,v)=>r?`<div class="rec">${agImg(r.agent)}<div><span>${n}</span><b>${v}</b><small>${esc(r.map)} · ${dFr(r.ts)} · ${r.us}-${r.them}</small></div></div>`:'';
const k=best(r=>r.k),a=best(r=>r.sc/r.r),kd=best(r=>r.d?r.k/r.d:r.k,r=>r.k>=10),hs=best(r=>r.hs/Math.max(1,r.hs+r.bs+r.ls),r=>r.hs+r.bs+r.ls>=30);
return`<div class="card"><h2>Records</h2><div class="recs">${line('Kills',k,k&&k.k)}${line('ACS',a,a&&fmt(a.sc/a.r,0))}${line('K/D',kd,kd&&fmt(kd.d?kd.k/kd.d:kd.k,2))}${line('Tête',hs,hs&&pc0(hs.hs/(hs.hs+hs.bs+hs.ls)*100))}</div></div>`;
}
function bDernier(){
const r=APP.prof.rows[0];if(!r)return'';
return`<div class="card last" style="--mbg:url('${IMG.map(r.map,'listviewicon')}')"><div class="card-h"><h2>Dernière partie</h2><span class="muted small">${dFr(r.ts)} à ${hFr(r.ts)}</span></div>
    <div class="lastm">${agImg(r.agent,'ag lg')}<div><b class="score ${r.res}">${r.res==='W'?'Victoire':r.res==='L'?'Défaite':'Égalité'} ${r.us}-${r.them}</b><p>${esc(r.map)} · ${esc(r.agent)} · ${r.k}/${r.d}/${r.a} · ACS ${fmt(r.sc/r.r,0)} · ${pc0(r.hs/Math.max(1,r.hs+r.bs+r.ls)*100)} tête</p></div>
    <button class="btn" data-act="rapport:${r.id}">Voir le rapport${featOn('dernier',APP.plan,APP.cfg)||featOn('rapports',APP.plan,APP.cfg)?'':' ★'}</button></div></div>`;
}
function tabParties(){
const P=APP.prof,F=APP.filt||(APP.filt={a:'',m:'',r:''}),H={};P.hist.forEach(h=>{if(h.mid)H[h.mid]=h;});
const R=P.rows.filter(r=>(!F.a||r.agent===F.a)&&(!F.m||r.map===F.m)&&(!F.r||r.res===F.r)),A=rowsAgg(R);
const opt=(k,list,fr)=>`<select data-filt="${k}" aria-label="${fr}"><option value="">${fr} : ${k==='m'?'toutes':'tous'}</option>${list.map(v=>`<option${F[k]===v?' selected':''}>${esc(v)}</option>`).join('')}</select>`;
const canMore=featOn('historique',APP.plan,APP.cfg),canRep=id=>featOn('rapports',APP.plan,APP.cfg)||(featOn('dernier',APP.plan,APP.cfg)&&id===P.rows[0].id);
return`<div class="card"><div class="card-h"><h2>Parties classées</h2><span class="muted small">${nPart(R.length)} · ${pc0(A.wr)} de victoires · K/D ${fmt(A.kd,2)} · ACS ${fmt(A.acs,0)}</span></div>
  <div class="row filt">${opt('a',[...new Set(P.rows.map(r=>r.agent))].sort(),'Agent')}${opt('m',[...new Set(P.rows.map(r=>r.map))].sort(),'Carte')}
    <select data-filt="r" aria-label="Résultat"><option value="">Résultat : tous</option><option value="W"${F.r==='W'?' selected':''}>Victoires</option><option value="L"${F.r==='L'?' selected':''}>Défaites</option></select></div>
  <div class="mlist">${R.map(r=>{const h=H[r.id],sh=r.hs+r.bs+r.ls;return`<div class="mrow ${r.res}" style="--mbg:url('${IMG.map(r.map,'listviewicon')}')">
    ${agImg(r.agent)}<div><b>${esc(r.map)}</b><small>${dFr(r.ts)} · ${hFr(r.ts)}</small></div>
    <div class="score ${r.res}">${r.us}-${r.them}${h&&h.ch!=null?`<small class="${h.ch>=0?'up':'down'}">${sg(h.ch,0)} RR</small>`:''}</div>
    <div><b>${r.k}/${r.d}/${r.a}</b><small>K/D ${fmt(r.d?r.k/r.d:r.k,2)}</small></div>
    <div class="hide-m"><b>${fmt(r.sc/r.r,0)}</b><small>ACS</small></div><div class="hide-m"><b>${fmt(r.dmg/r.r,0)}</b><small>ADR</small></div><div class="hide-m"><b>${sh?Math.round(r.hs/sh*100):'—'} %</b><small>tête</small></div>
    <button class="btn ghost sm" data-act="rapport:${r.id}">Rapport${canRep(r.id)?'':' ★'}</button></div>`;}).join('')||empty('Aucune partie avec ces filtres.')}</div>
  ${histNote(P,canMore)}</div>`;
}
function histNote(P,canMore){
if(P.demo)return'';
return P.full?`<p class="note">Tout ton historique est là : ${nPart(P.rows.length)} gardées dans ce navigateur. Les nouvelles s'ajoutent toutes seules ; « Sauvegarder mes données » (Réglages) pour les emporter sur un autre appareil.</p>`
:`<div class="row center mt"><button class="btn ghost" data-act="more">${canMore?`Récupérer tout mon historique${P.tot>P.rows.length?` (${P.tot} parties disponibles)`:''}`:'Tout mon historique ★'}</button></div>`;
}
function aggTable(A,first,img){
return`<div class="tbl"><table><thead><tr><th>${first}</th><th>Parties</th><th>Victoires</th><th>K/D</th><th>ACS</th><th>ADR</th><th>Tête</th><th>DDΔ</th></tr></thead><tbody>
  ${A.map(a=>`<tr><td class="nm">${img(a.key)}<b>${esc(a.key)}</b></td><td>${a.n}</td><td><span class="${rateCls(a.w,a.n)||''}" title="${esc(rateTip(a.w,a.n))}">${pc0(a.wr)}</span><div class="bar"><i style="width:${a.wr||0}%"></i></div></td><td>${fmt(a.kd,2)}</td><td>${fmt(a.acs,0)}</td><td>${fmt(a.adr,0)}</td><td>${pc0(a.hsP)}</td><td>${sg(a.dd,0)}</td></tr>`).join('')}</tbody></table></div>`;
}
function tabAgents(){
const A=aggBy(APP.prof.rows,'agent'),roles={};A.forEach(a=>{const r=ROLE_OF[a.key]||'?';roles[r]=(roles[r]||0)+a.n;});
const tot=APP.prof.rows.length||1;
return`<div class="card"><div class="card-h"><h2>Agents</h2><span class="muted small">Couleur du taux de victoire seulement quand l'écart à 50 % est sûr</span></div>
    <div class="roles">${Object.entries(roles).sort((a,b)=>b[1]-a[1]).map(([r,n])=>`<span class="pill">${esc(ROLE_FR[r]||r)} ${Math.round(n/tot*100)} %</span>`).join('')}</div>
    ${aggTable(A,'Agent',a=>agImg(a))}
    ${APP.prof.full?'':`<p class="note">Calculé sur tes ${nPart(tot)} gardées.</p>${histNote(APP.prof,featOn('historique',APP.plan,APP.cfg))}`}
    ${featOn('perso',APP.plan,APP.cfg)?`<p class="note">Astuce : Personnaliser › « Agent au choix » pour mettre l'interface aux couleurs de n'importe quel agent.</p>`:''}</div>
  <h2 class="mt" id="cartes">Cartes</h2>${tabCartes()}
  ${pickTable()}
  <p class="note">Site le plus attaqué carte par carte et tes meilleures zones : <a href="#" data-act="tab:position">Tactique › Positionnement</a> (bloc « Toutes les cartes »).</p>`;
}
function tabCartes(){
const A=aggBy(APP.prof.rows,'map');
return`<div class="maps">${A.map(a=>{const t=rateCls(a.w,a.n);return`<div class="card mapc" style="--mbg:url('${IMG.map(a.key,'listviewicon')}')"><div class="mapc-in"><h3>${esc(a.key)}</h3>
    <b class="${t||''}" title="${esc(rateTip(a.w,a.n))}">${pc0(a.wr)}</b><small>${a.n} partie${a.n>1?'s':''} · ${vndTxt(a)}</small>
    <p class="small">K/D ${fmt(a.kd,2)} · ACS ${fmt(a.acs,0)} · ${pc0(a.hsP)} tête</p>${t==='ok'?'<span class="pill ok">Ta force</span>':t==='bad'?'<span class="pill bad">À travailler</span>':''}</div></div>`;}).join('')}</div>`;
}
function pickTable(){
const R=APP.prof.rows,maps=aggBy(R,'map').filter(m=>m.n>=2);
if(!maps.length)return'';
return`<div class="card mt"><div class="card-h"><h2>Quel agent sur quelle carte ?</h2><span class="muted small">D'après tes résultats, lissés pour ne pas conclure sur 2 parties</span></div><div class="tbl"><table class="small"><thead><tr><th>Carte</th><th>Conseillé</th><th>Ensuite</th></tr></thead><tbody>
    ${maps.map(m=>{const p=agentsForMap(R,m.key);return`<tr><td><b>${esc(m.key)}</b> <small class="muted">${m.n} p.</small></td><td>${p[0]?`<span class="nm">${agImg(p[0].a)} <b>${esc(p[0].a)}</b> <small class="muted">${p[0].n} ici · note ${Math.round(p[0].s*100)} %</small></span>`:'—'}</td><td>${p.slice(1,3).map(x=>`${esc(x.a)} <small class="muted">${Math.round(x.s*100)} %</small>`).join(' · ')||'—'}</td></tr>`;}).join('')}</tbody></table></div></div>`;
}
const canRerender=()=>!(APP.tab==='entrainement'&&typeof RX!=='undefined'&&['wait','go','pause','early'].includes(RX.st));
const detFresh=D=>(D||[]).filter(d=>(d.v||0)>=6).length;
const benchLoad=()=>APP.benchP||(APP.benchP=fetch('bench.json').then(r=>r.ok?r.json():null).then(j=>{APP.bench=j?benchClean(j):null;}).catch(()=>{APP.bench=null;}));
const modelOf=D=>APP.bench&&APP.bench.M?APP.bench.M:wpFit(D);
const DET_CHOIX=[10,25,50,100,0];
const detN=()=>{const v=ST.get('detN',25);return DET_CHOIX.includes(v)?v:25;};
const detWin=P=>detN()?Math.min(detN(),P.rows.length):P.rows.length;
async function detLoad(P){const ids=new Set(P.rows.slice(0,detWin(P)).map(r=>r.id));return(await detAll(P)).filter(d=>ids.has(d.id));}
function detPick(){
const P=APP.prof;if(P.demo)return'';const n=detN(),have=detFresh(APP.D),w=detWin(P);
return`<div class="row detpick" role="group" aria-label="Parties analysées"><span class="muted small">Analyse sur</span>${DET_CHOIX.map(v=>`<button class="btn ${v===n?'':'ghost'} sm" data-act="detN:${v}" aria-pressed="${v===n}">${v?`${v} dernières`:`Tout (${P.rows.length})`}</button>`).join('')}
    <span class="muted small">${have<w?`${have}/${w} prêtes, la suite arrive (1 partie / 2 s)…`:`${nPart(have)} analysée${have>1?'s':''}`}</span></div>`;
}
async function detNeed(){
if(APP.detBusy)return;const P=APP.prof,before=(APP.D||[]).length,bv=detFresh(APP.D);
await benchLoad();APP.D=await detLoad(P);APP.M=modelOf(APP.D);
if((APP.D.length!==before||detFresh(APP.D)!==bv)&&APP.prof===P&&canRerender())return renderTab();
const on=f=>featOn(f,APP.plan,APP.cfg),want=on('position')||on('strategie')||on('visee')||on('coach')||on('entrainement')?detWin(P):0;
if(!want||P.demo||!apiReady()||detFresh(APP.D)>=Math.min(want,P.rows.length)||APP.detTried===P.rid)return;
APP.detBusy=true;APP.detTried=P.rid;
const n=await detFill(P,want,async(i,t)=>{const s=$('#detProg');if(s)s.textContent=`Analyse des parties : ${i}/${t}…`;statut(`Analyse de tes parties en arrière-plan : ${i}/${t}`);
if((i===3||i%20===10)&&i<t&&APP.prof===P){APP.D=await detLoad(P);APP.M=modelOf(APP.D);if(canRerender())renderTab();}});
APP.detBusy=false;statut('');
if(n||detWin(P)!==want){APP.D=await detLoad(P);
APP.M=modelOf(APP.D);if(APP.prof===P&&canRerender())renderTab();}
}
function detMore(){
const P=APP.prof;if(APP.detBusy||P.demo||!apiReady())return;
const i=DET_CHOIX.indexOf(detN());if(!detN()||detWin(P)>=P.rows.length)return toast('Tout ton historique est déjà dans l\'analyse.');
ACT.detN(DET_CHOIX[i+1]);toast('Analyse lancée : 1 partie toutes les 2 secondes, tu peux continuer à naviguer.');
}
const meIdx=d=>d.pl.findIndex(p=>p.n==='moi');
function detWait(min=3){
const D=APP.D||[];
if(D.length>=min)return'';
return`<div class="card"><h2>Analyse en cours</h2><p id="detProg">${APP.prof.demo?'':apiReady()?'Récupération du détail de tes parties (1 toutes les 2 s)…':'Service indisponible.'}</p><p class="note">Il faut au moins ${min} parties détaillées. Elles sont gardées : la prochaine fois, c'est immédiat.</p></div>`;
}
const BAND_V=['proches (moins de 10 m)','à moyenne distance (10 à 25 m)','de loin (25 m et plus)'];
function tabVisee(){
const w=detWait();if(w)return w;
const D=APP.D,ds=duelStats(D,meIdx),W=weaponStats(D,'moi').filter(x=>GUN[x.w]).slice(0,8),R=APP.prof.rows,A=rowsAgg(R),S=ST.get('sens',{dpi:800,sens:.4});
const cm=S.dpi>0&&S.sens>0?2.54*360/(S.dpi*S.sens*.07):null,hint=sensHint(ds,cm);
const hsSeries=R.slice(0,30).reverse().map(r=>{const s=r.hs+r.bs+r.ls;return s?r.hs/s*100:null;}).filter(v=>v!=null);
const dir=hint.dir>0?'un peu plus haute (+5 à 10 %)':hint.dir<0?'un peu plus basse (−5 à 10 %)':'';
const B=ds.b.map((b,i)=>({i,n:b[0],k:b[1],t:b[0]?trust(b[1],b[0],.5):''})),r=x=>x.k/x.n;
const weak=B.filter(x=>x.t==='bad').sort((a,b)=>r(a)-r(b))[0],strong=B.filter(x=>x.t==='ok').sort((a,b)=>r(b)-r(a))[0];
const v=weak?{cls:'bad',h:`Point faible : tes duels ${BAND_V[weak.i]}`,p:'C\'est la distance où tu perds le plus de duels, à coup sûr. La routine de visée la travaille en priorité.'}
:strong?{cls:'ok',h:`Ta force : les duels ${BAND_V[strong.i]}`,p:'Aucune distance faible à coup sûr : entretiens ta visée et garde ta sensibilité.'}
:{cls:'neutral',h:'Aucune distance ne ressort',p:'Tes duels sont équilibrés selon la distance : pas de point faible sûr pour l\'instant.'};
v.facts=[['Duels d\'ouverture',`<b class="${ds.op[0]?trust(ds.op[1],ds.op[0],.5)||'':''}">${ds.op[0]?pc0(ds.op[1]/ds.op[0]*100):'—'}</b>`,`${ds.op[1]}/${ds.op[0]} gagnés (premier duel du round)`],
['Tous les duels',`<b>${ds.all[0]?pc0(ds.all[1]/ds.all[0]*100):'—'}</b>`,`${ds.all[1]}/${ds.all[0]} à l'arme · ${D.length} parties détaillées`]];
v.acts='<button class="btn" data-act="tab:entrainement">Routine de visée avec minuteur</button>';
return`${verdictHtml(v,'Visée','')}
  <div class="grid g2 mt">
  <div class="card"><h2>Duels selon la distance</h2><ul class="plist">${B.map(x=>statRow(esc(BAND_FR[x.i]),x.k,x.n,.5,`${x.k}/${x.n} duels gagnés`)).join('')}</ul>
    <p class="note">Duels à l'arme (capacités exclues). Trait = 50 %. Vert ou rouge seulement si l'écart est sûr.</p></div>
  <div class="card"><h2>Précision</h2><div class="kpis">
    <div class="kpi"><span>Tête</span><b>${pc0(A.hsP)}</b><small>des balles touchées</small></div><div class="kpi"><span>Corps</span><b>${pc0(A.sh?(A.sh-A.hs-A.ls)/A.sh*100:null)}</b></div><div class="kpi"><span>Jambes</span><b>${pc0(A.lsP)}</b><small class="${A.lsP>12?'down':''}">${A.lsP>12?'viseur trop bas':'normal'}</small></div></div>
    <p class="lbl mt">Tête % sur tes ${hsSeries.length} dernières parties <small class="muted">(trait pointillé : ta moyenne)</small></p>${spark(hsSeries)}</div>
  <div class="card"><h2>Armes</h2><div class="tbl"><table><thead><tr><th>Arme</th><th>Kills</th><th>Morts</th><th>K/D</th><th>1er kill</th></tr></thead><tbody>
    ${W.map(x=>`<tr><td><b>${esc(wpnFr(x.w))}</b> <small class="muted">${esc(GUN[x.w]||'')}</small></td><td>${x.k}</td><td>${x.d}</td><td class="${x.k+x.d>=10?(x.k>=x.d?'up':'down'):''}">${fmt(x.d?x.k/x.d:x.k,2)}</td><td>${x.fk}</td></tr>`).join('')||'<tr><td colspan="5">—</td></tr>'}</tbody></table></div></div>
  <div class="card"><h2>Sensibilité</h2>
    <p>Un tour complet = <b>${cm?fmt(cm,1)+' cm':'—'}</b> de tapis${cm?` (eDPI ${Math.round(S.dpi*S.sens)})`:''}. ${hint.zone==='haute'?'C\'est très rapide (la plupart des joueurs sont entre 30 et 75 cm).':hint.zone==='basse'?'C\'est très lent : les duels proches deviennent durs.':cm?'Zone habituelle.':''}</p>
    <p class="sem ${dir?'foe':'ok'} mt8">${dir?`Piste : essaie une sensibilité ${dir} pendant 8 parties (${hint.why==='proche'?'tu perds tes duels proches':hint.why==='loin'?'tu perds tes duels de loin':'ta sensibilité est hors de la zone habituelle'}).`:'Rien ne montre à coup sûr qu\'il faut changer ta sensibilité : garde-la.'}</p>
    <div class="row mt8"><button class="btn ghost" data-act="tab:entrainement">Régler ma sensibilité (DPI, test guidé)</button></div></div>
  </div>`;
}
function spark(v,w=300,h=46){
if(v.length<2)return empty('Pas assez de parties.');
const lo=Math.min(...v),hi=Math.max(...v),sp=Math.max(1,hi-lo),x=i=>4+i*(w-8)/(v.length-1),y=a=>4+(h-8)*(1-(a-lo)/sp);
const m=v.reduce((a,b)=>a+b,0)/v.length;
return`<svg viewBox="0 0 ${w} ${h}" class="spark" role="img" aria-label="Évolution, moyenne ${fmt(m,0)} %"><line x1="0" x2="${w}" y1="${y(m)}" y2="${y(m)}" class="gl"/><polyline points="${v.map((a,i)=>`${x(i).toFixed(1)},${y(a).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--accent-t)" stroke-width="2"/></svg>`;
}
function weekRecapHtml(){
const P=APP.prof,d0=Date.parse(weekStart(today())+'T00:00:00'),d1=d0-7*864e5,inW=(ts,a,b)=>ts>=a&&ts<b;
const cur=P.rows.filter(r=>r.ts>=d0),prev=P.rows.filter(r=>inW(r.ts,d1,d0));if(!cur.length&&!prev.length)return'';
const a=rowsAgg(cur),b=rowsAgg(prev),rr=L=>{const ids=new Set(L.map(r=>r.id));return P.hist.filter(h=>ids.has(h.mid)).reduce((s,h)=>s+(h.ch||0),0);};
const miss=(L,x,y)=>Math.max(0,P.hist.filter(h=>inW(h.ts,x,y)).length-L.length),mC=miss(cur,d0,Infinity),mP=miss(prev,d1,d0);
const G=(APP.D||[]).length>=3?coachData().G:[],gc=G.filter(g=>g.ts>=d0),gp=G.filter(g=>inW(g.ts,d1,d0));
const imp=L=>L.length?L.reduce((s,g)=>s+g.imp,0)/L.length:null,er=L=>{const r=L.reduce((s,g)=>s+g.r,0);return r?L.reduce((s,g)=>s+ERR_KEYS.reduce((t,k)=>t+(g['e_'+k]||0),0),0)/r*100:null;};
const line=(n,x,y,f,better)=>{const c=x==null||y==null||x===y?'':(x>y)===(better>0)?'up':'down';return`<tr><td>${n}</td><td class="${c}"><b>${x==null?'—':f(x)}</b></td><td class="muted">${y==null?'—':f(y)}</td></tr>`;};
const S=focusState();
return`<div class="card mt"><div class="card-h"><h2>Bilan de la semaine</h2><span class="muted small">depuis lundi, contre la semaine d'avant</span></div>
    <div class="tbl"><table><thead><tr><th></th><th>Cette semaine</th><th>Semaine d'avant</th></tr></thead><tbody>
    ${line('Parties',a.n,b.n,x=>x,0)}${line('Victoires',a.n?a.wr:null,b.n?b.wr:null,pc0,1)}${P.hist.length?line('RR',a.n?rr(cur):null,b.n?rr(prev):null,x=>sg(x,0),1):''}
    ${line('Impact (round/partie)',imp(gc),imp(gp),x=>sg(x,1),1)}${line('Morts « erreur » pour 100 rounds',er(gc),er(gp),x=>fmt(x,1),-1)}</tbody></table></div>
    ${S?`<p class="small mt8">Focus : <b>${esc(S.f.t)}</b> · <span class="pill ${FOCUS_ST[S.ev.st][0]}">${FOCUS_ST[S.ev.st][1]}</span></p>`:''}
    ${mC||mP?`<p class="note">Parties pas encore chargées : ${[mC&&`${mC} cette semaine`,mP&&`${mP} la semaine d'avant`].filter(Boolean).join(', ')} (Parties › « Charger plus »). Les chiffres ci-dessus portent sur les parties chargées.</p>`:''}
    <p class="note">Impact et erreurs : seulement sur tes parties détaillées (${gc.length} cette semaine, ${gp.length} avant). Couleur = mieux ou moins bien, pas forcément sûr.</p></div>`;
}
function tabProg(){
const P=APP.prof,R=P.rows,W={};R.forEach(r=>(W[weekStart(r.date)]=W[weekStart(r.date)]||[]).push(r));
const weeks=Object.entries(W).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,10);
const S=sessionsOf(R),st=nthStats(S.map(s=>s.map(r=>r.res))),lim=nightLimit(st);
const hhmm=ts=>{const x=new Date(ts);return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0');},hb=[0,1,2,3].map(i=>rowsAgg(R.filter(r=>hourBucket(hhmm(r.ts))===i)));
const days=[0,1,2,3,4,5,6].map(i=>rowsAgg(R.filter(r=>(new Date(r.ts).getDay()+6)%7===i)));
const v=lim?{cls:'foe',h:`Arrête-toi après ${lim} partie${lim>1?'s':''}`,p:'Au-delà, dans la même session, tu perds nettement plus souvent (détail par numéro de partie plus bas).'}
:{cls:'ok',h:'Pas de limite sûre',p:'Ton taux de victoire ne baisse pas à coup sûr avec le nombre de parties : joue tant que tu te sens bien, et arrête-toi après 3 défaites d\'affilée.'};
v.facts=[['Sessions analysées',`<b>${S.length}</b>`,'groupes de parties à moins de 3 h d\'écart'],['Parties',`<b>${R.length}</b>`,`${P.hist.length} avec leur RR`]];
if(P.hist.length>=2)chartMount('rrP',w=>rrSvg(P.hist,w,230));
return`${verdictHtml(v,'Progression','')}${weekRecapHtml()}
  <div class="card mt"><div class="card-h"><h2>Courbe de RR</h2><span class="muted small">${P.hist.length} parties · point plein : victoire, creux : défaite</span></div>${P.hist.length>=2?'<div class="chart" id="rrP" style="height:230px"></div>':empty('Pas assez de parties pour tracer la courbe.')}</div>
  <div class="grid g2 mt">
  <div class="card"><h2>Tes semaines</h2><div class="tbl"><table><thead><tr><th>Semaine du</th><th>Parties</th><th>Victoires</th><th>K/D</th><th>ACS</th><th>Tête</th></tr></thead><tbody>
    ${weeks.map(([w,a])=>{const x=rowsAgg(a);return`<tr><td>${dFr(Date.parse(w+'T12:00:00'),{day:'numeric',month:'short'})}</td><td>${x.n}</td><td class="${rateCls(x.w,x.n)||''}">${pc0(x.wr)}</td><td>${fmt(x.kd,2)}</td><td>${fmt(x.acs,0)}</td><td>${pc0(x.hsP)}</td></tr>`;}).join('')}</tbody></table></div></div>
  <div class="card"><h2>Victoires selon le numéro de la partie</h2><ul class="plist">${st.map((x,i)=>statRow(i<st.length-1?`${i+1}${i?'e':'re'} partie de la session`:`${i+1}e et +`,x[1],x[0],.5,`${x[1]}/${x[0]} gagnées`)).join('')}</ul></div>
  <div class="card"><h2>Heures</h2><ul class="plist">${HOURS.map((n,i)=>statRow(esc(n),hb[i].w,hb[i].n,.5,`${nPart(hb[i].n)} · ACS ${fmt(hb[i].acs,0)}`)).join('')}</ul></div>
  <div class="card"><h2>Jours</h2><ul class="plist">${JOURS.map((n,i)=>statRow(esc(n),days[i].w,days[i].n,.5,nPart(days[i].n))).join('')}</ul></div>
  </div>
  <p class="note">Trait des barres = 50 % de victoires. Vert ou rouge seulement quand l'écart est sûr ; « peu de données » sous 10 parties.</p>`;
}
function coachStats(){
const D=APP.D||[],ds=duelStats(D,meIdx),P={};
['sc','dmg','kd','hs'].forEach(f=>{const x=lobbyPct(D,'moi',f);P[f]=x?x.p:null;});
let fd=0,r=0,tr=0,dd=0,kast=0;
D.forEach(d=>{const i=meIdx(d),o=pDetail(d,i),l=plLines(d)[i];if(!o||!l)return;fd+=o.fd;r+=o.r;tr+=l.trd;dd+=d.pl[i].d;kast+=l.kast*o.r/100;});
return{n:D.length,pct:P,op:ds.op,fd:r?fd/r:null,tr:dd?tr/dd*100:null,kast:r?kast/r*100:null,b:ds.b,place:lobbyPlace(D,'moi')};
}
const PGM=new WeakMap();
function pgOf(d){const c=PGM.get(d);if(c&&c.M===APP.M)return c.S;const S=pgAll(d,APP.M);PGM.set(d,{M:APP.M,S});return S;}
const DEM=new WeakMap();
function deOf(d){const c=DEM.get(d);if(c&&c.M===APP.M)return c.E;const E=deathsOf(d,APP.M);DEM.set(d,{M:APP.M,E});return E;}
const CD={};
function coachData(){
const D=APP.D||[];if(!APP.M)APP.M=modelOf(D);
if(CD.v&&CD.D===D&&CD.M===APP.M&&CD.B===APP.bench&&CD.P===APP.prof)return CD.v;
const G=[],L={c:{},local:true},tiers=[];
D.forEach(d=>{const i=meIdx(d),S=pgOf(d);if(i<0||!S[i])return;const p=d.pl[i];if(p.tr>=3)tiers.push(p.tr);
const g=Object.assign({},S[i],{ro:ROLE_OF[p.a]||'',ts:d.ts,id:d.id,w:d.rounds.filter(r=>r.w).length*2>d.rounds.length?1:0});
G.push(g);benchAdd(L,d,APP.M,a=>ROLE_OF[a],(q,j)=>j===i,S);});
const W=APP.bench&&Object.keys(APP.bench.c).length?APP.bench:null,rk=rankOf(APP.prof.mmr.tier)||rankOf(tiers.sort((a,b)=>a-b)[tiers.length>>1]);
const ag=Object.entries(D.reduce((o,d)=>{const p=d.pl[meIdx(d)];if(p)o[p.a]=(o[p.a]||0)+1;return o;},{})).sort((a,b)=>b[1]-a[1]).map(x=>x[0]);
const v={G,L,W,rk,C:coachV2(G,W?[W,L]:L,rk),A:errAgg(D,APP.M,deOf),E:ecoAgg(D),U:ag.slice(0,2).map(a=>agentUse(D,W?[W,L]:[L],rk,a)).filter(Boolean)};
Object.assign(CD,{v,D,M:APP.M,B:APP.bench,P:APP.prof});return v;
}
function focusState(){
const P=APP.prof;if(!P||(APP.D||[]).length<3)return null;
const V=coachData(),list=focusPick(V.C,{rows:V.A.rows.concat(V.E.rows)}).filter(x=>MET[x.k]),key='focus:'+(P.demo?'demo':P.rid);
let f=ST.get(key,null);
if(!f||!MET[f.k]||!f.base||f.base.v==null){
const now=Date.now();f=null;
for(const x of list){const g=Object.assign({},x,{since:now});g.base=focusBase(g,V.G);if(g.base.v!=null&&g.base.n>=3){f=g;break;}}
if(!f)return null;if(!P.demo)ST.set(key,f);
}
return{f,ev:focusEval(f,V.G),list,key};
}
ACT.focusSet=k=>{const S=focusState(),x=S&&S.list.find(y=>y.k===k);if(!x)return;const f=Object.assign({},x,{since:Date.now()});f.base=focusBase(f,coachData().G);
if(f.base.v==null)return toast('Pas assez de parties détaillées pour mesurer ce chiffre',true);ST.set(S.key,f);toast('Nouveau focus : '+x.t);renderTab();};
const FOCUS_ST={go:['neutral','C\'est parti'],wait:['neutral','En cours'],ok:['ok','Progrès sûr ✓'],bad:['bad','En baisse'],flat:['foe','Pas de changement net']};
function focusHtml(){
const S=focusState();if(!S)return'';
const{f,ev,list}=S,st=FOCUS_ST[ev.st],tx=v=>metTxt(f.k,v),nxt=list.find(x=>x.k!==f.k);
const msg={go:`Joue ${3-ev.n} partie${3-ev.n>1?'s':''} de plus pour une première mesure.`,wait:'Écart encore trop petit pour exclure le hasard : continue.',ok:'Tu as vraiment progressé : garde le réflexe, puis passe au focus suivant.',
bad:'Moins bien que ta base : relis le conseil et fais l\'exercice avant de jouer.',flat:'10 parties sans progrès net : change d\'approche ou de focus.'}[ev.st];
return`<div class="card"><div class="card-h"><h2>Focus de la semaine</h2><span class="pill ${st[0]}">${st[1]}</span></div>
    <p><b>${esc(f.t)}</b> <small class="muted">· ${esc(f.why||'')} · ${f.dir>0?'plus haut = mieux':'plus bas = mieux'}</small></p>
    <div class="kpis mt8"><div class="kpi"><span>Ta base</span><b>${tx(ev.base)}</b><small>avant le focus</small></div><div class="kpi"><span>Depuis</span><b class="${ev.diff==null?'':ev.diff>=0?'up':'down'}">${tx(ev.v)}</b><small>${ev.n} partie${ev.n>1?'s':''} détaillée${ev.n>1?'s':''}</small></div></div>
    ${ev.ticks.length?`<p class="small mt8" aria-label="Parties depuis le début du focus">${ev.ticks.slice(-12).map(t=>`<span class="sem ${t.ok==null?'neutral':t.ok?'ok':'bad'}" title="${esc(dFr(t.ts))} : ${tx(t.v)}">${t.ok==null?'○':t.ok?'✓':'✕'}</span>`).join(' ')}</p>`:''}
    <p class="fix">→ ${esc(f.fix)}</p><p class="small muted">${esc(msg)}</p>
    <div class="row mt8">${(ev.st==='ok'||ev.st==='flat')&&nxt?`<button class="btn sm" data-act="focusSet:${nxt.k}">Focus suivant : ${esc(nxt.t)}</button>`:''}
      <select data-focus aria-label="Changer de focus" class="sm"><option value="">Changer de focus…</option>${list.filter(x=>x.k!==f.k).slice(0,6).map(x=>`<option value="${x.k}">${esc(x.t)}</option>`).join('')}</select></div></div>`;
}
function focusChallenge(){const S=focusState();if(!S)return null;const d0=Date.parse(weekStart(today())+'T00:00:00');
return{t:`Focus : 3 parties meilleures que ta base (${S.f.t.replace(/ \(pour 100 rounds\)$/,'')})`,cur:S.ev.ticks.filter(t=>t.ts>=d0&&t.ok).length,goal:3};}
function coachItems(){if((APP.D||[]).length<3)return[];const V=coachData();return V.rk?V.C.items:coachPub(coachStats());}
const metTxt=(k,v,x=0)=>v==null?'—':k.startsWith('e_')?`${fmt(v,1+x)} pour 100 rounds`:MET[k][2]===100?(x?`${fmt(v,x)} %`:pc0(v)):fmt(v,(k==='cast'?2:0)+x);
const metX=(x,refs)=>x.below&&refs.some(v=>v!=null&&metTxt(x.k,v)===metTxt(x.k,x.me))?1:0;
function tabCoach(){
const w=detWait();if(w)return w;
const s=coachStats(),lp=s.place,Pc=s.pct,V=coachData(),C=V.C,rkN=RANK_FR[C.rk]||'',upN=C.up?RANK_FR[C.up]:'',per=x=>x==null?null:x*C.rpg,rv=x=>x==null?'—':Math.abs(x)<.05?'0':sg(x,1);
const items=V.rk?C.items:coachPub(s),top=items.find(x=>x.lvl>=2),rest=top?items.filter(x=>x!==top):items.slice(1),T=C.tot||{};
const src=V.W?`${V.W.matches.toLocaleString('fr-FR')} parties classées collectées${V.W.region?` (${esc(V.W.region.toUpperCase())})`:''}${V.W.au?`, jusqu'au ${esc(dFr(Date.parse(V.W.au+'T12:00:00'),{day:'numeric',month:'long'}))}`:''}`:`tes lobbys (les 9 autres joueurs de tes ${V.L.n||0} parties)`;
const lvlTxt=x=>x.lvl===3?'Priorité':x.lvl===2?'Important':x.cost!=null?'À confirmer':'Conseil';
const itemHtml=x=>`<div class="coach"><span class="lvl lvl${x.lvl}">${lvlTxt(x)}</span><div><b>${esc(x.t)}</b>
    ${x.cost!=null?`<p>Te coûte <b class="down">${fmt(x.cost,1)} round${x.cost>=2?'s':''} par partie</b> face aux joueurs ${esc(rkN)} de ton rôle${x.sure?'':' <small class="muted">(pas encore sûr : à confirmer sur plus de parties)</small>'}</p>`:x.why?`<p>${esc(x.why)}</p>`:''}
    ${(x.causes||[]).map(c=>`<p class="small">${esc(c.t)} : <b class="down">${metTxt(c.k,c.me)}</b> <span class="muted">(${esc(rkN)} : ${metTxt(c.k,c.ref)}${c.up!=null&&upN?` · ${esc(upN)} : ${metTxt(c.k,c.up)}`:''})</span>${c.sure?'':' <small class="muted">· à confirmer</small>'}</p>`).join('')}
    <p class="fix">→ ${esc(x.fix)}</p></div></div>`;
const v=top?{cls:top.lvl===3?'bad':'foe',h:`Priorité : ${top.t}`,p:`→ ${top.fix}`,facts:[top.cost!=null&&['Te coûte',`<b class="down">${fmt(top.cost,1)} round${top.cost>=2?'s':''}</b>`,`par partie face aux joueurs ${esc(rkN)} de ton rôle${top.sure?'':' (à confirmer)'}`]].filter(Boolean)}
:{cls:'ok',h:'Aucun point faible sûr',p:items[0]&&items[0].fix?`→ ${items[0].fix}`:'Continue comme ça : le coach se met à jour tout seul après tes parties.',facts:[]};
if(V.rk)v.facts.push(['Tes kills et tes morts',`<b class="${(per(T.me)||0)>=0?'up':'down'}">${rv(per(T.me))}</b>`,`round par partie pour ton équipe · joueur ${esc(rkN)} de ton rôle : ${rv(per(T.ref))}`]);
if(lp)v.facts.push(['Place moyenne',`<b>${fmt(lp.place,1)}<small>/10</small></b>`,`dans tes ${s.n} parties détaillées`]);
v.acts='<button class="btn" data-act="tab:entrainement">Routine complète avec minuteur</button>';
const lvlPill=x=>!x.below?'<span class="pill ok">au niveau</span>':x.sure?'<span class="pill bad">en dessous</span>':'<span class="pill warn">un peu en dessous</span>';
const nx=C.next||[],nextHtml=nx.length?`<div class="card"><div class="card-h"><h2>Pour passer ${esc(upN)}</h2><span class="pill">${nx.filter(x=>!x.below).length}/${nx.length} au niveau</span></div>
    <p class="muted small">Ce qui change vraiment d'un rang à l'autre (dégâts, duels gagnés, KAST restent presque égaux à tous les rangs : chacun joue contre son niveau). Joueurs de ton rôle, partie par partie.</p>
    ${nx.map(x=>{const m=Math.max(x.me||0,x.ref||0,x.up||0)||1,dx=metX(x,[x.ref,x.up]);return`<div class="cmpx"><p class="small"><b>${esc(x.t)}</b> ${lvlPill(x)}</p><div class="mbars">${mbarH('Toi',x.me,m,metTxt(x.k,x.me,dx),true)}${mbarH(rkN,x.ref,m,metTxt(x.k,x.ref,dx))}${mbarH(upN,x.up,m,metTxt(x.k,x.up,dx))}</div></div>`;}).join('')}</div>`:'';
const phase=c=>{const e=c.cost==null?null:-c.cost;return`<div class="drow"><span>${esc(c.t)}<small class="muted">toi ${rv(per(c.me))} · ${esc(rkN)} ${rv(per(c.ref))}${c.cost!=null&&!c.sure?' · à confirmer':''}</small></span><span class="dbar" aria-hidden="true">${e==null?'':`<i class="${e>=0?'pos':'neg'}" style="width:${Math.min(50,Math.abs(e)*40)}%"></i>`}</span><b class="${e==null||Math.abs(e)<.05?'':e>=0?'up':'down'}">${e==null?'—':rv(e)}</b></div>`;};
const pct2=(n,x)=>`<li class="srow"><div><b>${n}</b><small>${x==null?'pas assez de parties':`mieux que ${Math.round(x)} % des joueurs de tes parties`}</small></div><div class="val"><b>${x==null?'—':Math.round(x)+' %'}</b>${x==null?'':barHtml(x/100,.5,x>=60?'ok':x<40?'bad':'')}</div></li>`;
const A=V.A,rkRef=(k,r)=>{const c=r&&V.W&&V.W.c[`${r}|*`];return c?metV(c,'e_'+k):null;};
const refTxt=k=>[[rkN,rkRef(k,C.rk)],[upN,rkRef(k,C.up)]].filter(x=>x[0]&&x[1]!=null).map(x=>`${esc(x[0])} : ${fmt(x[1],1)}`).join(' · ');
const errRow=r=>{const rt=refTxt(r.k);return`<div class="coach"><span class="lvl lvl${r.sure?3:1}">${r.sure?'Sûr':'À confirmer'}</span><div><b>${esc(r.t)}</b>
      <p class="small">Toi : <b class="${r.ref!=null&&r.rate>r.ref?'down':''}">${fmt(r.rate,1)}</b> pour 100 rounds <span class="muted">(autres joueurs de tes parties : ${r.ref==null?'—':fmt(r.ref,1)}${rt?` · ${rt}`:''})</span>${r.cpm?` · coût <b class="down">${fmt(r.cpm,1)} round${r.cpm>=2?'s':''}/partie</b>`:''}${r.won!=null&&r.n?` · ${r.won}/${r.n} gagnés`:''}</p>
      ${r.ex.length?`<p class="small">Exemples : ${r.ex.map(x=>`<button type="button" class="chip" data-act="rapR:${esc(x.id)}|${x.r}">${esc(x.map)} R${x.r+1}</button>`).join(' ')}</p>`:''}
      <p class="fix">→ ${esc(r.fix)}</p></div></div>`;};
const worse=r=>r.n>=2&&(r.ref==null||r.rate>r.ref);
const er=(A.rows||[]).filter(r=>!r.cause&&worse(r)).slice(0,4),cr=(A.rows||[]).filter(r=>r.cause&&worse(r)).slice(0,2),eco=(V.E.rows||[]).filter(worse);
const fh=focusHtml(),errHtml=er.length||cr.length?`<div class="card"><div class="card-h"><h2>Tes erreurs qui reviennent</h2><span class="muted small">${A.n} parties · ${A.rounds} rounds</span></div>
    ${er.map(errRow).join('')}
    ${cr.length?`<h3 class="mt8">Pourquoi personne ne t'a vengé</h3><p class="muted small">D'après le regard des 9 autres joueurs à l'instant de ta mort (${A.n7} partie${A.n7>1?'s':''} récente${A.n7>1?'s':''}).</p>${cr.map(errRow).join('')}`:''}
    <p class="note">Chaque mort est classée par des règles fixes (vengée en 3 s = jamais une erreur). « Sûr » = plus fréquent que chez les 9 autres joueurs de tes parties, au seuil de 90 %. « Visait » = regard à moins de 15° et 30 m (l'API ne connaît pas les murs). Seuils = conventions.</p></div>`:'';
const ecoHtml=eco.length?`<div class="card"><div class="card-h"><h2>Tes achats</h2><span class="muted small">${V.E.n} parties récentes</span></div>${eco.map(errRow).join('')}
    <p class="note">Plein = 3 900 crédits d'équipement ou plus, éco = moins de 2 000 ; pistols exclus. Dans tes parties, les rounds avec un achat décalé sont gagnés à ${V.E.wr==null?'—':pc0(V.E.wr)} (${V.E.dN} cas, tous joueurs).</p></div>`:'';
const agHtml=(V.U||[]).map(u=>{const K=(window.KITS||{})[u.agent]||[],nm=j=>(K[j+1]||'').split('|')[0]||['C','Q','E','X'][j],m=x=>fmt(x,2);
const low=u.ab.filter(a=>a.low);
return`<div class="card"><div class="card-h"><h2>Tes capacités en ${esc(u.agent)}</h2><span class="muted small">${nPart(u.n)}</span></div>
      ${u.ab.map(a=>{const mx=Math.max(a.me,a.ref||0,a.up||0)||1;return`<div class="cmpx"><p class="small"><b>${esc(nm(a.j))}</b> ${a.low?'<span class="pill bad">moins que le rang au-dessus</span>':''}</p><div class="mbars">${mbarH('Toi',a.me,mx,m(a.me)+'/round',true)}${a.ref!=null?mbarH(rkN,a.ref,mx,m(a.ref)):''}${a.up!=null?mbarH(upN,a.up,mx,m(a.up)):''}</div></div>`;}).join('')}
      ${low.length?`<p class="fix">→ Utilise plus ${low.map(a=>esc(nm(a.j))).join(' et ')} : les joueurs ${esc(upN||rkN)} en ${esc(u.agent)} s'en servent nettement plus souvent que toi.</p>`:`<p class="small muted">${u.ab.some(a=>a.ref!=null)?'Tu utilises ton kit autant que les joueurs de ton niveau.':'Pas encore assez de joueurs de ton rang sur cet agent pour comparer.'}</p>`}
      <p class="note">Utilisations par round sur la partie entière (l'API ne donne pas le détail round par round). Plus n'est pas toujours mieux : c'est un repère, pas une règle.${u.refN?` Référence : ${Math.round(u.refN)} parties ${esc(rkN)}${u.upN?`, ${Math.round(u.upN)} ${esc(upN)}`:''}.`:''}</p></div>`;});
const side=[fh,...agHtml,ecoHtml].filter(Boolean);
return`${verdictHtml(v,V.rk?`Coach · comparé aux joueurs ${esc(rkN)} de ton rôle`:'Coach','')}
  ${side.length?`<div class="grid g2 mt">${side.join('')}</div>`:''}
  ${errHtml?`<div class="mt">${errHtml}</div>`:''}
  ${rest.length||(C.strong&&C.strong.length)?`<div class="card mt"><h2>${rest.length?(top?'Tes autres priorités':'Autres conseils'):'Tes forces'}</h2>${rest.map(itemHtml).join('')}
    ${C.strong&&C.strong.length?`<p class="sem ok mt8">Tes forces : ${C.strong.map(c=>`${esc(c.t)} (+${fmt(-c.cost,1)} round/partie)`).join(', ')}</p>`:''}</div>`:''}
  <div class="grid g2 mt">${nextHtml}
  ${V.rk?`<div class="card"><h2>Détail par phase du round</h2><p class="muted small">Rounds par partie gagnés (+) ou perdus (−) par tes kills et tes morts, contre un joueur ${esc(rkN)} de ton rôle, sur ${C.n} parties détaillées.</p>${(C.cats||[]).map(phase).join('')}</div>`:''}
  <div class="card"><h2>Ta place dans tes parties</h2><p class="muted small">${s.n} parties détaillées, comparé aux 9 autres joueurs de chaque partie (anonymes).</p>
    ${lp?`<div class="kpis"><div class="kpi"><span>MVP de la partie</span><b>${pc0(lp.mvp)}</b></div><div class="kpi"><span>Meilleur de ton équipe</span><b>${pc0(lp.top)}</b></div><div class="kpi"><span>KAST</span><b>${pc0(s.kast)}</b></div></div>`:''}
    <ul class="plist mt8">${pct2('Score de combat',Pc.sc)}${pct2('Dégâts',Pc.dmg)}${pct2('Kills − morts',Pc.kd)}${pct2('Tête %',Pc.hs)}</ul></div>
  <div class="card"><h2>Les exercices qui vont avec</h2><ol class="plan">${items.slice(0,3).map(x=>(DRILL[x.k]||DRILL[x.cat]||DRILL.ok).slice(0,2).map(d=>`<li>${esc(d)} <small class="muted">(${esc(x.t)})</small></li>`).join('')).join('')}</ol>
    <p class="note">En Range, en Deathmatch ou avec un aim trainer gratuit. La routine complète avec minuteur est dans l'onglet Entraînement.</p></div>
  </div>
  <p class="note">Impact = variation des chances de gagner le round à chacun de tes kills et de tes morts (modèle appris sur ${V.W&&V.W.M?'les parties collectées':'tes parties'}). Référence : ${src}. « À confirmer » = écart encore trop petit pour exclure le hasard (seuil 90 %).${V.rk?'':' Rang inconnu : joue des parties classées pour être comparé aux joueurs de ton rang.'}</p>`;
}
function tabComparer(){
const C=APP.cmp,P=APP.prof;
const form=`<form id="cmpForm" class="row" autocomplete="off"><input id="cmpRiot" placeholder="Riot ID de ton ami (Pseudo#TAG)" maxlength="30" value="${esc(C?C.riot:'')}" aria-label="Riot ID de ton ami"><button class="btn" type="submit">Comparer</button></form>
    <label class="chk small mt8"><input type="checkbox" id="cmpOk"> Mon ami est d'accord pour que je regarde ses stats.</label>`;
if(!C)return`<div class="card"><h2>Comparer avec un ami</h2>${form}<p class="note">Même région que toi. Ses 20 dernières parties classées.</p></div>`;
const a=rowsAgg(P.rows.slice(0,20)),b=rowsAgg(C.rows.slice(0,20)),la=aggBy(P.rows,'agent')[0],lb=aggBy(C.rows,'agent')[0];
const pair=(n,x,y,d=1)=>{const m=Math.max(Math.abs(x||0),Math.abs(y||0))||1,bx=x!=null&&y!=null&&x>y,by=x!=null&&y!=null&&y>x;
return`<div class="cmpx"><p class="small"><b>${n}</b></p><div class="mbars">${mbarH(P.name,x==null?0:Math.abs(x),m,(x==null?'—':fmt(x,d))+(bx?' ✓':''),true)}${mbarH(C.name,y==null?0:Math.abs(y),m,(y==null?'—':fmt(y,d))+(by?' ✓':''))}</div></div>`;};
return`<div class="card"><h2>Toi contre ${esc(C.name)}</h2>${form}
    <div class="grid g2 mt"><div class="mini">${la?agImg(la.key):''}<div><b>${esc(P.name)}</b><small>${esc(tierFr(P.mmr.tier))}${la?` · ${esc(la.key)}`:''}</small></div></div><div class="mini">${lb?agImg(lb.key):''}<div><b>${esc(C.name)}</b><small>${esc(tierFr(C.mmr.tier))}${lb?` · ${esc(lb.key)}`:''}</small></div></div></div>
    <div class="cmpgrid mt">${pair('Victoires %',a.wr,b.wr,0)}${pair('K/D',a.kd,b.kd,2)}${pair('ACS',a.acs,b.acs,0)}${pair('ADR',a.adr,b.adr,0)}${pair('Tête %',a.hsP,b.hsP,1)}${pair('DDΔ',a.dd,b.dd,0)}${pair('Kills / round',a.kpr,b.kpr,2)}</div>
    <p class="note">Sur les 20 dernières parties classées de chacun · ✓ = le meilleur des deux · ta barre est à ta couleur.</p></div>`;
}
async function openReport(id){
const P=APP.prof,r=P.rows.find(x=>x.id===id);if(!r)return;
if(!(featOn('rapports',APP.plan,APP.cfg)||(featOn('dernier',APP.plan,APP.cfg)&&id===P.rows[0].id)))return premiumOpen('rapports');
dlgOpen(`<div class="skel skel-hero"></div>${skel(4)}`);
let d=null;try{d=await detGet(P,id,true);}catch(e){return dlgOpen(stateHtml('!','Rapport indisponible',`${e.message} Réessaie dans un instant.`,['Réessayer','rapport:'+id],true));}
if(!d)return dlgOpen(stateHtml('!','Rapport indisponible','Le service ne donne pas le détail de cette partie (trop ancienne ou introuvable).',null,true));
const D=await detAll(P);if(!D.some(x=>x.id===d.id))D.push(d);
await benchLoad();const M=modelOf(D),me=meIdx(d),S=matchSum(d,M,me),L=S.me;
const nm=i=>i===me?'Toi':d.pl[i]?`${d.pl[i].a}${d.pl[i].t===d.pl[me].t?' (allié)':' (adverse)'}`:'?';
const pc=x=>`${Math.round(x*100)} %`,cats=Object.entries(S.cats).filter(([,v])=>Math.abs(v)>=.15).sort((a,b)=>b[1]-a[1]);
const mine=Object.entries(S.mine).filter(([,v])=>Math.abs(v)>=.1).sort((a,b)=>b[1]-a[1]),best=mine[0],worst=mine[mine.length-1];
const ev=e=>e.killer==null?'':`${e.killer===me?`<b>Tu</b> tues ${esc(nm(e.victim))}`:`${esc(nm(e.killer))} te tue`}${e.w?` (${esc(wpnFr(e.w))})`:''}, ${e.t} s après le début du round`;
const vsTxt=e=>{const m=/(\d)v(\d) → (\d)v(\d)/.exec(e.st||'');return m?`${m[1]} contre ${m[2]} → ${m[3]} contre ${m[4]} · `:'';};
const low=s=>s.toLowerCase(),imp=S.myImp||0;
const GN=(()=>{const o={up:0,down:0,cats:{},kills:[]};
S.F.forEach(f=>f.ev.forEach(e=>{if(e.killer==null||e.victim==null)return;const g=e.ours?e.d:-e.d;
if(e.killer===me){o.up+=g;if(d.pl[e.victim]&&d.pl[e.victim].t!==d.pl[me].t){const c=o.cats[e.cat]||(o.cats[e.cat]={n:0,g:0});c.n++;c.g+=g;o.kills.push({r:f.i,e,g});}}
if(e.victim===me)o.down+=g;}));
o.kills.sort((a,b)=>b.g-a.g);return o;})();
const rdw=x=>`round${Math.abs(x)>=2?'s':''}`;
const nR=d.rounds.length||24,i24=imp/nR*24,lvl=i24>=1.5?['ok','Impact très positif','Tu as clairement fait gagner des rounds à ton équipe.']:i24>=.5?['ok','Impact positif','Tu as aidé ton équipe à gagner des rounds.']
:i24>-.5?['neutral','Impact neutre','Tes kills et tes morts se sont à peu près équilibrés.']:i24>-1.5?['bad','Impact négatif','Tes morts ont coûté plus de rounds que tes kills n\'en ont rapporté.']:['bad','Impact très négatif','Tes morts ont coûté beaucoup plus de rounds que tes kills n\'en ont rapporté.'];
const rWord=x=>x<.85?'en dessous de la moyenne':x<1.1?'dans la moyenne':x<1.3?'bon':'très bon';
const v={cls:lvl[0],img:agImg(r.agent,'ag'),h:lvl[1],
p:GN.up<.05&&GN.down<.05?'Peu d\'actions décisives : ni gain ni perte nette.':`${lvl[2]}${best&&best[1]>0?` Ton point fort : ${low(CAT_FR[best[0]])}.`:''}${worst&&worst[1]<0?` Ton point faible : ${low(CAT_FR[worst[0]])}.`:''}`,
facts:[['Ton impact sur la partie',`<b style="color:var(${imp>=0?'--ok':'--bad'})">${sg(imp)} ${rdw(imp)}</b>`,'Ce que tes kills ont rapporté moins ce que tes morts ont coûté. Proche de 0 : ni gain ni perte nette.'],L&&['Note de performance',`<b>${fmt(L.rating,2)}</b>`,`${rWord(L.rating)} (1,00 = joueur moyen)`]].filter(Boolean)};
const drow=(lab,x)=>`<div class="drow"><span>${lab}</span><span class="dbar" aria-hidden="true"><i class="${x>=0?'pos':'neg'}" style="width:${Math.min(50,Math.abs(x)*20)}%"></i></span><b class="${x>=0?'up':'down'}">${sg(x)}</b></div>`;
const dbar=([c,x])=>drow(esc(CAT_FR[c]),x);
const strip=S.F.map(f=>{const x=f.r;return`<button type="button" class="rd ${x.w?'W':'L'}${f.thrown||f.stolen?' hot':''}${f.i===12?' half':''}" data-act="repRound:${f.i}" data-r="${f.i}" aria-pressed="false" aria-label="Round ${f.i+1} ${x.w?'gagné':'perdu'}" title="${esc(`Round ${f.i+1} · ${x.w?'gagné':'perdu'} (${END_FR[x.e]}) · chances au départ ${pc(f.p0)} · max ${pc(f.mx)} · min ${pc(f.mn)}\nAchats : vous ${f.i===0||f.i===12?'pistol':BUY_FR[BUYK(x.ol)]} · eux ${f.i===0||f.i===12?'pistol':BUY_FR[BUYK(x.tl)]}${x.p?`\nSpike posé en ${x.p} par ${x.pu===1?'vous':'eux'}`:''}`)}">${f.i+1}<small>${pc(f.p0)}</small></button>`;}).join('');
const row=l=>{const x=S.imp[l.i]||0;return`<tr class="${l.i===me?'me':''}"><td class="nm">${agImg(l.p.a)}${esc(nm(l.i))}</td><td>${l.p.tr>2?`<img class="rki" src="${IMG.rank(l.p.tr)}" alt="${esc(tierFr(l.p.tr))}" title="${esc(tierFr(l.p.tr))}">`:'—'}</td><td class="${x>=0?'up':'down'}">${sg(x)}</td><td>${fmt(l.rating,2)}</td><td>${l.p.k}/${l.p.d}/${l.p.as}</td><td>${fmt(l.acs,0)}</td><td>${fmt(l.kast,0)} %</td><td>${l.fk}-${l.fd}</td></tr>`;};
const tb=t=>`<div class="tbl"><table class="small"><thead><tr><th>Joueur</th><th>Rang</th><th title="Rounds rapportés (+) ou perdus (−) par les kills et les morts du joueur">Impact</th><th title="Note de performance (1,00 = joueur moyen)">Note</th><th>K/D/A</th><th>ACS</th><th>KAST</th><th title="Premiers kills – premières morts du round">Premiers duels</th></tr></thead><tbody>${S.L.filter(l=>l.p.t===t).sort((a,b)=>(S.imp[b.i]||0)-(S.imp[a.i]||0)).map(row).join('')}</tbody></table></div>`;
const LS=errLessons(deathsOf(d,M,S.F).filter(e=>e.x===me)),FS=focusState(),ft=FS&&FS.ev.ticks.find(t=>t.id===d.id);
const GAIN_FR={ouverture:'Premiers kills du round',trade:'Coéquipiers vengés (trades)',clutch:'Clutchs (dernier vivant de ton équipe)',mid:'Kills en milieu de round',post:'Kills après le plant de ton équipe',retake:'Kills pendant une reprise de site'};
const gRows=Object.entries(GN.cats).filter(([c,o])=>GAIN_FR[c]&&o.g>=.05).sort((x,y)=>y[1].g-x[1].g),BK=GN.kills.filter(k=>k.g>=.1).slice(0,3);
const gainHtml=`<div class="card mt8"><h3>Ce que tu as rapporté</h3>
    <p class="muted small">On mesure ton impact en « rounds » : un kill fait monter les chances de gagner le round, une mort les fait baisser. +1 round = l'équivalent d'un round gagné en plus pour ton équipe.</p>
    <div class="kpis mt8"><div class="kpi"><span>Tes kills</span><b style="color:var(--ok)">${sg(GN.up)}</b><small>${rdw(GN.up)} rapportés à ton équipe</small></div><div class="kpi"><span>Tes morts</span><b style="color:var(--bad)">${GN.down<.05?'0':'−'+fmt(GN.down)}</b><small>${rdw(GN.down)} perdus par ton équipe</small></div></div>
    ${gRows.length?`<h4 class="mt8">D'où viennent tes gains</h4>${gRows.map(([c,o])=>drow(`${esc(GAIN_FR[c])}<small class="muted">${o.n} kill${o.n>1?'s':''}</small>`,o.g)).join('')}`:'<p class="muted mt8">Aucun kill décisif cette partie.</p>'}
    ${BK.length?`<p class="small mt8">Tes meilleurs kills (touche un round pour le voir sur la carte) :</p><span class="rds">${BK.map(k=>`<button type="button" class="rd W" data-act="repRound:${k.r}" aria-label="Voir le round ${k.r+1} sur la carte">${k.r+1}<small>${sg(k.g)}</small></button>`).join('')}</span>`:''}</div>`;
const lesHtml=`<div class="card mt8"><h3>${LS.length?`${LS.length===1?'Ta leçon':`Tes ${LS.length} leçons`} : ce qui t'a coûté le plus de rounds`:'Ce qui t\'a coûté des rounds'}</h3>
    <p class="muted small">Tes morts les plus coûteuses, par type. Une mort vengée dans les 3 secondes n'est pas une erreur. Touche un numéro de round pour revoir le duel sur la carte.</p>
    ${LS.length?`<ol class="plan">${LS.map(l=>`<li><b>${esc(ERR_DEF[l.tag].t)}</b><br><span class="small">${l.n} fois · coût : <b class="down">−${fmt(l.cost,1)} ${rdw(l.cost)}</b></span>
      <span class="rds">${l.rounds.map(r=>`<button type="button" class="rd L" data-act="repRound:${r}" aria-label="Voir le round ${r+1} sur la carte">${r+1}</button>`).join('')}</span>
      ${l.cause&&l.causeN?`<p class="small">Cause la plus fréquente : ${l.n===1?'dans cette mort':l.causeN===l.n?'dans toutes ces morts':`dans ${l.causeN} de ces ${l.n} morts`}, ${esc(ERR_CAUSE[l.cause].d)}.</p>`:''}
      <p class="fix small">À faire : ${esc(l.cause&&l.causeN*2>l.n?ERR_CAUSE[l.cause].fix:errFix(l.tag,l.sides))}</p></li>`).join('')}</ol>`:'<p class="muted">Aucune erreur coûteuse repérée : tes morts ont été vengées ou sans conséquence.</p>'}
    ${ft?`<p class="small mt8">Ton objectif de la semaine : <b>${esc(FS.f.t)}</b>. Sur cette partie : ${metTxt(FS.f.k,ft.v)}, contre ${metTxt(FS.f.k,FS.ev.base)} d'habitude chez toi. <span class="sem ${ft.ok?'ok':'bad'}">${ft.ok?'✓ mieux que d\'habitude':'✕ moins bien que d\'habitude'}</span></p>`:''}</div>`;
const hasMap=mapOk(d.map)&&d.kills.some(k=>(k[2]===me&&k[6]!=null)||(k[3]===me&&k[4]!=null)),myT=d.pl[me].t;
dlgOpen(`<div class="rep-h" style="--mbg:url('${IMG.map(d.map)}')"><div><p class="muted small">${dFr(r.ts,{weekday:'long',day:'numeric',month:'long'})} · ${hFr(r.ts)} · ${esc(d.map)} · ${esc(r.agent)}</p>
      <h2 class="score ${r.res}">${r.res==='W'?'Victoire':r.res==='L'?'Défaite':'Égalité'} ${r.us}-${r.them}</h2>
      <p>${S.place===1?'<span class="pill ok">MVP de la partie</span> ':S.teamTop?'<span class="pill ok">Meilleur de ton équipe</span> ':''}${S.place}<sup>e</sup> sur ${d.pl.length} au score</p></div></div>
    ${verdictHtml(v,'Ton bilan sur la partie')}${gainHtml}${lesHtml}
    ${L?`<div class="kpis mt8"><div class="kpi"><span>K/D/A</span><b>${L.p.k}/${L.p.d}/${L.p.as}</b><small>kills / morts / assists</small></div><div class="kpi"><span>ACS</span><b>${fmt(L.acs,0)}</b><small>score de combat par round</small></div><div class="kpi"><span>KAST</span><b>${fmt(L.kast,0)} %</b><small>rounds où tu as été utile</small></div><div class="kpi"><span>Premiers duels</span><b>${L.fk}-${L.fd}</b><small>premiers kills – premières morts</small></div><div class="kpi"><span>3 kills et +</span><b>${L.mk}</b><small>rounds</small></div><div class="kpi"><span>Tête</span><b>${L.hs==null?'—':fmt(L.hs,0)+' %'}</b><small>de tes tirs</small></div></div>`:''}
    <div class="grid g2 mt">
      <div><h3>Tes moments clés</h3>${S.key.length?`<ol class="plist">${S.key.map(k=>`<li class="krow" data-act="repRound:${k.r}" tabindex="0"><span class="mk ${k.e.pa>=k.e.pb?'ok':'bad'}" aria-hidden="true"></span><div><b>Round ${k.r+1}</b> · ${ev(k.e)}<small>${vsTxt(k.e)}chances de gagner le round : ${pc(k.e.pb)} → <b class="${k.e.pa>=k.e.pb?'up':'down'}">${pc(k.e.pa)}</b></small></div></li>`).join('')}</ol>`:empty('Pas de moment décisif.')}</div>
      ${hasMap?`<div data-link="rep"><h3>Tes duels sur la carte <small class="muted" id="repCnt"></small></h3><div class="row filt"><select data-repround aria-label="Round affiché"><option value="all">Tous les rounds</option>${d.rounds.map((x,i)=>`<option value="${i}">Round ${i+1} (${x.w?'gagné':'perdu'})</option>`).join('')}</select></div>
        ${svgMapHtml('repMv',d.map,`Tes duels sur ${d.map}`)}${legendHtml([['ok','D\'où tu as tué (trait : vers ta victime)'],['bad','Où tu es mort'],['foe','D\'où on t\'a tué (pointillés : son tir)']])}</div>`:'<div><h3>Tes duels sur la carte</h3>'+empty('Positions indisponibles pour cette partie.')+'</div>'}
    </div>
    <h3 class="mt">Ton équipe</h3>${tb(myT)}<h3>Adversaires</h3>${tb(1-myT)}
    <p class="note">Joueurs anonymes. Impact = rounds rapportés (+) ou perdus (−) par les kills et les morts de chaque joueur. Note = performance de la partie (1,00 = moyen).</p>
    <details class="card mt"><summary><b>Pour aller plus loin</b> <span class="muted small">(détail par phase, rounds jetés, calcul)</span></summary>
      <div class="grid g2 mt8"><div><h3>Ton impact par phase</h3><p class="muted small">Ce que tes kills ont rapporté moins ce que tes morts ont coûté, selon le moment du round.</p>${mine.map(dbar).join('')||empty('Peu d\'actions décisives.')}</div><div><h3>D'où viennent les rounds (équipe)</h3><p class="muted small">Pour toute ton équipe : à quels moments du round les chances de gagner ont monté (+) ou baissé (−).</p>${cats.map(dbar).join('')||empty('Rien de marquant.')}</div></div>
      <h3 class="mt">Rounds <small class="muted">(chances de gagner au départ)</small></h3><div class="rds">${strip}</div>
      <p class="note">Plein : gagné · pointillés : perdu · contour ambre : round jeté (perdu alors que ton équipe avait 75 % de chances ou plus) ou volé (gagné avec 25 % ou moins) · touche un round pour voir tes duels sur la carte.</p>
      ${S.thrown.length?`<p class="sem bad small">Rounds jetés : ${S.thrown.map(f=>'R'+(f.i+1)).join(', ')}</p>`:''}${S.stolen.length?`<p class="sem ok small mt8">Rounds volés : ${S.stolen.map(f=>'R'+(f.i+1)).join(', ')}</p>`:''}
      <p class="small mt8">Ton équipe a gagné ${S.won} round${S.won>1?'s':''}. D'après les armes achetées par les deux équipes, on en attendait ${fmt(S.exp)} (écart : ${sg(S.won-S.exp)}).</p>
      <p class="note">Comment c'est compté : à chaque kill ou mort, on regarde de combien changent les chances de gagner le round (modèle appris sur ${APP.bench&&APP.bench.M?'les parties collectées':'tes parties'}). Une mort est une erreur seulement si personne ne la venge dans les 3 secondes et si le round était encore jouable. « Loin » = aucun coéquipier à moins de 15 m.</p></details>
    <details class="card mt"><summary><b>Comprendre les mots</b></summary><ul class="plist small mt8">
      <li><b>Round (impact)</b> : unité de mesure. +1 = l'équivalent d'un round gagné en plus pour ton équipe.</li>
      <li><b>Premier duel</b> : le premier kill du round. Le gagner donne environ 70 % de chances de gagner le round.</li>
      <li><b>Trade</b> : tuer l'ennemi qui vient de tuer un coéquipier, dans les 3 secondes. On dit aussi « venger ».</li>
      <li><b>Clutch</b> : être le dernier vivant de ton équipe face à un ou plusieurs ennemis.</li>
      <li><b>Plant / retake</b> : poser le spike (la bombe) / reprendre le site après que l'ennemi l'a posé.</li>
      <li><b>KAST</b> : % de rounds où tu as fait un kill, une assist, survécu ou été vengé. 70 % et plus, c'est très bien.</li>
      <li><b>ACS</b> : score de combat moyen par round (kills, dégâts, assists).</li>
      <li><b>Note de performance</b> : note globale de la partie. 1,00 = joueur moyen.</li></ul></details>`);
APP.rep={d,me,nm};setTimeout(()=>drawRep('all'),0);
}
function drawRep(round){
const R=APP.rep,svg=$('#repMv');if(!R||!svg)return;const{d,me,nm}=R,all=round==='all'||round==null,K=d.kills.filter(k=>all||k[0]===+round);
const win=K.filter(k=>k[2]===me&&k[6]!=null&&d.pl[k[3]]&&d.pl[k[3]].t!==d.pl[me].t),lose=K.filter(k=>k[3]===me&&k[4]!=null);
const tt=k=>`R${k[0]+1} · ${Math.round(k[1]/1000)} s${k[8]?' · '+wpnFr(k[8]):''}`;
svgDraw(svg,d.map,{exact:true,
spots:[...win.map((k,i)=>({k:'k'+i,kind:'ok',x:k[6],y:k[7],tip:`${tt(k)} : tu tues ${nm(k[3])}`})),...lose.map((k,i)=>({k:'d'+i,kind:'bad',x:k[4],y:k[5],tip:`${tt(k)} : ${nm(k[2])} te tue`}))],
foes:lose.map((k,i)=>k[6]!=null&&{k:'d'+i,x:k[6],y:k[7],size:8,tip:`${tt(k)} : ${nm(k[2])} tire d'ici`}).filter(Boolean),
arrows:[...win.map((k,i)=>k[4]!=null&&{k:'k'+i,show:true,x1:k[6],y1:k[7],x2:k[4],y2:k[5]}),...lose.map((k,i)=>k[6]!=null&&{k:'d'+i,cls:'foe',dash:true,show:true,x1:k[6],y1:k[7],x2:k[4],y2:k[5]})].filter(Boolean)});
$$('#dlg .rd').forEach(b=>b.setAttribute('aria-pressed',String(!all&&+b.dataset.r===+round)));
const s=$('#dlg [data-repround]');if(s)s.value=all?'all':String(round);
const c=$('#repCnt');if(c)c.textContent=`· ${win.length} kill${win.length>1?'s':''}, ${lose.length} mort${lose.length>1?'s':''}${all?'':` au round ${+round+1}`}`;
}
ACT.rapR=a=>{const[id,r]=a.split('|');openReport(id).then(()=>{if(APP.rep&&APP.rep.d.id===id)setTimeout(()=>ACT.repRound(+r),30);});};
ACT.repRound=i=>{drawRep(i);const m=$('#repMv');if(m){const b=m.getBoundingClientRect();if(b.top<0||b.bottom>innerHeight)m.scrollIntoView({block:'center',behavior:'smooth'});}};
function premiumOpen(f){
const C=APP.cfg,why=f&&FEATURES[f]?`<div class="infobox">★ <b>${esc(FEATURES[f].n)}</b> fait partie de Premium.</div>`:'';
dlgOpen(`<h2>Premium</h2>${why}${pricingHtml().replace('class="pricing mt"','class="pricing"')}${codeHtml()}`);
}
function codeHtml(){
return`<div class="card mt"><h3>J'ai un code</h3><div class="row"><input id="licIn" placeholder="PH1.…" aria-label="Ton code Premium" autocomplete="off"><button class="btn" data-act="licEnter">Activer</button></div>
    <p class="note">Le code est lié au Riot ID ${APP.prof&&!APP.prof.demo?`<b>${esc(APP.prof.riot)}</b>`:'donné à l\'achat'}. Il est gardé dans ce navigateur.</p><p id="licOut" class="small" role="status"></p></div>`;
}
function dlgOpen(html){const d=$('#dlg');$('#dlgIn').innerHTML=`<button class="btn ghost sm dlg-x" data-act="dlgClose" aria-label="Fermer">✕</button>${html}`;if(!d.open)d.showModal();d.scrollTop=0;}
const pct=x=>x==null||!Number.isFinite(x)?'—':`${Math.round(x*100)} %`;
const atlasLoad=()=>APP.atlasP||(APP.atlasP=fetch('atlas.json').then(r=>r.ok?r.json():null).then(j=>{APP.atlas=j?atlasClean(j):null;}).catch(()=>{APP.atlas=null;}));
const metaLoad=()=>APP.metaP||(APP.metaP=fetch('meta.json').then(r=>r.ok?r.json():null).then(j=>{APP.meta=j?metaClean(j):null;}).catch(()=>{APP.meta=null;}));
const atlasMap=map=>APP.atlas&&APP.atlas.maps[map]&&mapOk(map)?APP.atlas.maps[map]:null;
const mkHtml=r=>`<span class="mk ${r.kind}${r.low?' low':''}" aria-hidden="true">${r.num||''}</span>`;
const barHtml=(v,avg,kind)=>`<span class="rbar ${kind}" aria-hidden="true"><i style="width:${Math.round(v*100)}%"></i>${avg!=null?`<s style="left:${Math.round(avg*100)}%"></s>`:''}</span>`;
const LEG={ok:'Spot à jouer (n° = liste)',neutral:'Spot correct',bad:'À éviter',foe:'D\'où ils tuent',ring:'Où ils sont au 1er contact',arw:'Angle à tenir (spot survolé)',line:'Ligne d\'ouverture (au survol)',low:'Pointillés : peu de données'};
const legendHtml=items=>`<details class="legend" open><summary>Légende</summary><div class="lg">${items.map(([k,t])=>`<span>${mkHtml({kind:k==='low'?'neutral low':k})}${esc(t||LEG[k])}</span>`).join('')}</div></details>`;
function statRow(t,k,n,ref,sub,me){
const v=n?k/n:null,low=n<10,cls=n?trust(k,n,ref)||'':'';
return`<li class="srow${me?' me':''}${low?' low':''}"><div><b>${t}</b>${me?' <span class="pill prem">ton plan</span>':''}<small>${sub}${low?' <span class="low-b">peu de données</span>':''}</small></div>
    <div class="val"><b title="${esc(rateTip(k,n))}">${v==null?'—':pct(v)}</b>${v==null?'':barHtml(v,ref,cls)}</div></li>`;
}
const mvRoot=t=>t&&t.closest?t.closest('[data-link]'):null,mvKey=t=>t&&t.closest?t.closest('[data-k]'):null;
let MVD=0;
document.addEventListener('pointerover',e=>{const t=mvKey(e.target),R=mvRoot(t);if(R&&!R._pin)mvHl(R,t.dataset.k,true);});
document.addEventListener('pointerout',e=>{const t=mvKey(e.target),R=mvRoot(t);if(!R||R._pin)return;const to=mvKey(e.relatedTarget);if(to&&to.dataset.k===t.dataset.k)return;mvHl(R,null,false);});
document.addEventListener('focusin',e=>{const t=e.target.closest&&e.target.closest('[data-k][tabindex]'),R=mvRoot(t);if(R){R._pin=null;mvHl(R,t.dataset.k,true);}});
document.addEventListener('click',e=>{
if(Date.now()-MVD<300)return;const t=mvKey(e.target),R=mvRoot(e.target);
if(!R){$$('[data-link]').forEach(r=>{if(r._pin){r._pin=null;mvHl(r,null,false);}});return;}
if(!t)return;R._pin=R._pin===t.dataset.k?null:t.dataset.k;mvHl(R,R._pin||t.dataset.k,!!R._pin);
});
document.addEventListener('keydown',e=>{const t=e.target.closest&&e.target.closest('[data-k][tabindex], li[data-act][tabindex]');if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();t.click();}});
function mvView(svg,z,cx,cy){
z=Math.max(1,Math.min(4,z));const w=1000/z,h=w/2;cx=Math.max(h,Math.min(1000-h,cx));cy=Math.max(h,Math.min(1000-h,cy));
svg._v={z,cx,cy};svg.setAttribute('viewBox',`${(cx-h).toFixed(1)} ${(cy-h).toFixed(1)} ${w.toFixed(1)} ${w.toFixed(1)}`);svg.parentNode.classList.toggle('zoomed',z>1);svgPaint(svg);
}
ACT.mvZoom=arg=>{const[id,d]=arg.split(':'),s=document.getElementById(id);if(!s||!s._v)return;const v=s._v;if(+d===0)mvView(s,1,500,500);else mvView(s,v.z*(+d>0?1.6:1/1.6),v.cx,v.cy);};
const MVP=new Map();
document.addEventListener('pointerdown',e=>{const s=e.target.closest&&e.target.closest('.mv svg');if(s&&s._v)MVP.set(e.pointerId,{x:e.clientX,y:e.clientY,x0:e.clientX,y0:e.clientY,s});});
document.addEventListener('pointermove',e=>{
const p=MVP.get(e.pointerId);if(!p)return;const s=p.s,v=s._v,k=1000/v.z/Math.max(1,s.clientWidth);
if(MVP.size>=2){const[a,b]=[...MVP.values()],d0=Math.hypot(a.x-b.x,a.y-b.y);p.x=e.clientX;p.y=e.clientY;const d1=Math.hypot(a.x-b.x,a.y-b.y);if(d0>10)mvView(s,v.z*d1/d0,v.cx,v.cy);MVD=Date.now();return;}
if(v.z>1){mvView(s,v.z,v.cx-(e.clientX-p.x)*k,v.cy-(e.clientY-p.y)*k);if(Math.hypot(e.clientX-p.x0,e.clientY-p.y0)>4)MVD=Date.now();}
p.x=e.clientX;p.y=e.clientY;
});
const mvUp=e=>MVP.delete(e.pointerId);document.addEventListener('pointerup',mvUp);document.addEventListener('pointercancel',mvUp);
document.addEventListener('wheel',e=>{const s=e.ctrlKey&&e.target.closest&&e.target.closest('.mv svg');if(!s||!s._v)return;e.preventDefault();const v=s._v;mvView(s,v.z*(e.deltaY<0?1.15:1/1.15),v.cx,v.cy);},{passive:false});
;
"use strict";
const AN=new Date().getFullYear();
function legalHtml(k){
const C=APP.cfg,nom=esc(C.nom),ed=C.editeur?esc(C.editeur):'<i>à compléter par le propriétaire du site (mode Dieu › Éditeur)</i>',ct=C.achat.contact?esc(C.achat.contact):'<i>à compléter (mode Dieu › Contact)</i>';
const T={
mentions:`<h2>Mentions légales</h2>
      <h3>Éditeur</h3><p>${ed}. Contact : ${ct}.</p>
      <h3>Hébergement</h3><p>GitHub Pages, GitHub Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</p>
      <h3>Propriété intellectuelle</h3><p>${nom} (nom, logo, interface, textes, code, calculs et méthodes d'analyse) est protégé par le droit d'auteur. © ${AN} ${ed}. <b>Tous droits réservés.</b> Toute reproduction, copie, adaptation, extraction ou réutilisation, totale ou partielle, du code ou du contenu, sans accord écrit, est interdite (articles L.122-4 et L.335-2 du Code de la propriété intellectuelle).</p>
      <h3>Riot Games</h3><p>${nom} n'est pas approuvé par Riot Games et ne reflète pas les opinions de Riot Games ni de quiconque officiellement impliqué dans la production ou la gestion des propriétés de Riot Games. Riot Games et toutes les propriétés associées sont des marques commerciales ou déposées de Riot Games, Inc. Images du jeu : valorant-api.com. Données : API communautaire HenrikDev.</p>`,
cgu:`<h2>Conditions d'utilisation</h2>
      <h3>1. Le service</h3><p>${nom} affiche et analyse les statistiques de parties Valorant à partir de ton Riot ID. Le service est fourni « tel quel », sans garantie de disponibilité ni d'exactitude : les données viennent d'une API communautaire non officielle.</p>
      <h3>2. Usage autorisé</h3><p>Usage personnel uniquement. Tu ne consultes que ton propre compte, ou celui d'un joueur qui est d'accord. Interdit : utiliser le site pendant une partie pour espionner des adversaires, collecter automatiquement des données, surcharger le service, contourner les protections ou les fonctions Premium.</p>
      <h3>3. Propriété</h3><p>Le code, le design, les textes et les méthodes de calcul de ${nom} appartiennent à son éditeur. Copier tout ou partie du site, le republier ailleurs ou s'en inspirer pour un service concurrent est interdit sans accord écrit. Toute copie détectée fera l'objet d'une demande de retrait auprès de l'hébergeur (DMCA) et de poursuites si besoin.</p>
      <h3>4. Premium</h3><p>Le code Premium est personnel et lié à un seul Riot ID : il ne peut être ni partagé ni revendu. Un code partagé ou obtenu frauduleusement peut être désactivé sans remboursement. Prix affichés TTC. Le contenu numérique étant fourni immédiatement, tu acceptes en l'activant de renoncer au droit de rétractation de 14 jours (article L.221-28 du Code de la consommation). En cas de problème, contacte : ${ct}.</p>
      <h3>5. Responsabilité</h3><p>Les conseils (positionnement, stratégie, entraînement, sensibilité) sont des suggestions calculées sur tes parties : tu restes seul juge de leur usage. L'éditeur ne peut être tenu responsable d'une perte de RR ou de rang.</p>
      <h3>6. Changements</h3><p>Ces conditions peuvent évoluer ; la version en ligne fait foi. Droit français.</p>`,
confidentialite:`<h2>Confidentialité</h2>
      <p><b>Pas de compte, pas de publicité, pas de cookie de suivi.</b></p>
      <h3>Ce qui reste chez toi</h3><p>Profils consultés, détails des parties, thème, objectifs, entraînements, codes Premium : tout est gardé dans le stockage de ton navigateur (localStorage, IndexedDB). Rien n'est envoyé à l'éditeur. Bouton « Oublier toutes mes données » dans les réglages.</p>
      <h3>Ce qui passe par le serveur</h3><p>Pour afficher tes stats, ton Riot ID est envoyé au serveur relais du site puis à l'API HenrikDev. Le relais garde les réponses en cache quelques heures pour ne pas surcharger le service et ne conserve aucun historique de visiteurs. Si tu as un code Premium, il est vérifié par le serveur pour les fonctions qui en ont besoin.</p>
      <h3>Autres joueurs</h3><p>Les joueurs de tes parties restent anonymes : aucun pseudo d'un autre joueur n'est gardé ni affiché.</p>
      <h3>Tes droits</h3><p>Tes données sont sur ton appareil : tu peux les exporter ou les effacer à tout moment (Réglages). Pour toute question : ${ct}.</p>`
};
return T[k]||'';
}
function glossHtml(){
return`<h2>C'est quoi ?</h2><div class="gloss">${GLOSS.map(([t,d])=>`<p><b>${esc(t)}</b> : ${esc(d)}</p>`).join('')}</div>
    <h3>Raccourcis clavier</h3><p class="small"><span class="kbd">/</span> chercher un joueur · <span class="kbd">1</span> à <span class="kbd">0</span> changer d'onglet · <span class="kbd">?</span> cette aide · <span class="kbd">Échap</span> fermer</p>`;
}
;
"use strict";
const APP={cfg:pubCfg(null),prof:null,plan:'free',lic:null,licCode:'',tab:'vue',D:null,M:null,cmp:null,filt:null,local:false,detTried:'',detBusy:false,pos:null,strat:null,rep:null};
const LOCAL=/^(file:|http:\/\/localhost|http:\/\/127\.)/.test(location.href);
const SITE_URL='https://dimv92.github.io/elitrack/';
const HOTES=['dimv92.github.io','localhost','127.0.0.1'];
const SIG='ELT-7f3a9c21-DIMC-2026';
function guard(){
if(!LOCAL&&window.top!==window.self){try{window.top.location.replace(window.self.location.href);}catch(e){document.documentElement.style.display='none';}return false;}
if(location.protocol==='file:'||HOTES.includes(location.hostname))return true;
document.body.innerHTML=`<main style="max-width:640px;margin:15vh auto;padding:24px;font-family:Segoe UI,Arial,sans-serif;color:#f4eff7;text-align:center"><h1 style="font-size:34px">Copie non autorisée</h1>
    <p>Ce site est une copie d'<b>Elitrack</b>, faite sans l'accord de son auteur. Le code est protégé par le droit d'auteur.</p><p><a style="color:#ff6fb6" href="${SITE_URL}" rel="noopener">Aller sur le vrai site</a></p><p style="opacity:.4;font-size:11px">${SIG}</p></main>`;
return false;
}
const GUARD_OK=guard();
if(GUARD_OK&&!LOCAL){try{console.log('%cStop !','color:#ff4655;font-size:42px;font-weight:800');console.log('%cNe colle jamais ici du code donné par quelqu\'un : il pourrait voler ton compte ou ton code Premium. © Elitrack, tous droits réservés.','font-size:15px');}catch(e){}}
const LOT_SRC=((document.currentScript&&document.currentScript.src)||'').replace(/app\.js(\?|$)/,'lot.js$1');
let LOT_P=null;
function lotLoad(){
if(typeof tabTrain!=='undefined')return Promise.resolve();
return LOT_P||(LOT_P=new Promise((ok,ko)=>{const s=document.createElement('script');s.src=LOT_SRC;s.onload=()=>ok();
s.onerror=()=>{LOT_P=null;s.remove();ko(new Error('Cette partie du site n\'a pas pu se charger : vérifie ta connexion puis réessaie.'));};document.head.appendChild(s);}));
}
function toast(msg,err,action){
const t=document.createElement('div');t.className='toast'+(err?' err':'');t.textContent=msg;
if(action){const b=document.createElement('button');b.className='btn sm';b.textContent=action.label;b.onclick=()=>{action.fn();t.remove();};t.appendChild(b);}
[...$('#toasts').children].forEach(x=>{if(x.firstChild&&x.firstChild.nodeValue===msg)x.remove();});
$('#toasts').appendChild(t);setTimeout(()=>t.remove(),action?9000:4500);
}
function statut(t){const s=$('#statut');if(!s)return;s.textContent=t||'';s.hidden=!t;}
async function copyText(t,msg='Copié !'){try{await navigator.clipboard.writeText(t);toast(msg);}catch(e){toast('Copie impossible : sélectionne le texte et fais Ctrl+C',true);}}
function logErr(e){try{const L=ST.get('err',[]);L.push({t:new Date().toISOString(),m:String((e&&e.message)||e).slice(0,300)});ST.set('err',L.slice(-10));}catch(x){}}
window.addEventListener('error',e=>logErr(e.error||e.message));
window.addEventListener('unhandledrejection',e=>logErr(e.reason));
async function loadCfg(){
let base=null;
if(LOCAL){try{base=JSON.parse(localStorage.getItem('psh_pubcfg')||'null');APP.local=!!base;}catch(e){}}
if(!base){try{const r=await fetch('config.json',{cache:'no-store'});if(r.ok)base=await r.json();}catch(e){}}
APP.cfgBase=pubCfg(base);APP.cfg=APP.cfgBase;
const live=ST.get('cfgLive',null);if(APP.cfg.proxy&&live)APP.cfg=pubCfg(live,APP.cfgBase,true);
}
async function liveCfg(){
const B=APP.cfgBase;if(!B||!B.proxy)return;
let j=null;try{const r=await fetch(proxyUrl(B.proxy,'/config'),{cache:'no-store'});if(r.ok)j=await r.json();}catch(e){return console.warn('Réglages en direct indisponibles',e);}
if(!j||typeof j!=='object'||(j.status&&j.status!==200))return;
const C=pubCfg(j,B,true),key=c=>JSON.stringify([c.maintenance,c.freeAll,c.premium,c.revoked,c.achat]),big=key(C)!==key(APP.cfg);
ST.set('cfgLive',j);APP.cfg=C;applyCfg();if(!big)return;
await licRefresh();themeRefresh();
const typing=/^(INPUT|SELECT|TEXTAREA)$/.test((document.activeElement||{}).tagName||'');
if(!typing&&canRerender()&&!$('#dlg').open&&$('#perso').hidden)render();
}
function applyCfg(){
const C=APP.cfg;document.title=`${C.nom} : ton tracker perso`;
$('#siteNom').textContent=C.nom;$('#footNom').textContent=C.nom;$('#footAn').textContent=new Date().getFullYear();
const a=$('#annonce');a.hidden=!C.annonce&&!APP.local;a.innerHTML=`${C.annonce?esc(C.annonce):''}${APP.local?`${C.annonce?' · ':''}<b>Test local</b> : réglages du brouillon du mode Dieu.`:''}`;
$('#premBtn').hidden=C.freeAll;
}
const licCodes=()=>{const o=ST.get('lic',{});return o&&typeof o==='object'?o:{};};
function dieuLocal(){try{return LOCAL?localStorage.getItem('psh__dieu_lic')||'':'';}catch(e){return'';}}
async function licRefresh(){
APP.plan='free';APP.lic=null;APP.licCode='';const C=licCodes(),rid=APP.prof?APP.prof.rid:'';
if(APP.prof&&APP.prof.demo){APP.plan='premium';return;}
if(!LIC.ok()||!APP.cfg.licKey)return;
for(const code of[dieuLocal(),C['*'],rid&&C[rid]].filter(Boolean)){
const v=await LIC.verify(APP.cfg.licKey,code);if(!v.p)continue;
const c=licCheck(v.p,APP.prof?APP.prof.riot:'',today(),APP.cfg.revoked);
if(c.ok){APP.plan=c.plan;APP.lic=c;APP.licCode=code.replace(/\s+/g,'');return;}
if(c.why==='expiree'&&APP.prof)toast(`Ton Premium a expiré le ${c.exp}. Merci d'avoir soutenu le site !`,false,{label:'Renouveler',fn:()=>premiumOpen()});
}
}
async function licEnter(){
const code=($('#licIn')||{}).value||'',out=$('#licOut'),say=(t,bad)=>{if(out){out.textContent=t;out.className='small '+(bad?'down':'up');}};
if(!APP.cfg.licKey)return say(LIC_WHY.cle,true);
const v=await LIC.verify(APP.cfg.licKey,code);if(!v.p)return say(LIC_WHY[v.err]||LIC_WHY.format,true);
if(v.p.rid!=='*'&&(!APP.prof||APP.prof.demo)){const C=licCodes();C[v.p.rid]=code.replace(/\s+/g,'');ST.set('lic',C);return say(`Code valable pour ${v.p.rid}. Ouvre ce profil : Premium s'activera tout seul.`);}
const c=licCheck(v.p,APP.prof?APP.prof.riot:'',today(),APP.cfg.revoked);if(!c.ok)return say(LIC_WHY[c.why],true);
const C=licCodes();C[v.p.rid]=code.replace(/\s+/g,'');ST.set('lic',C);
await licRefresh();say(`${APP.plan==='dieu'?'Mode Dieu':'Premium'} activé${c.exp?` jusqu'au ${c.exp}`:' à vie'}. Merci !`);
setTimeout(()=>{$('#dlg').close();themeRefresh();render();toast('★ Tout est débloqué');},900);
}
function hashOf(){
const P=APP.prof;if(!P)return'';
return P.demo?`#/demo/${APP.tab}`:`#/${P.region}/${encodeURIComponent(P.riot)}/${APP.tab}`;
}
function setHash(push){const h=hashOf();if(location.hash===h||(!h&&!location.hash))return;try{history[push?'pushState':'replaceState'](null,'',h||location.pathname+location.search);}catch(e){}}
function readHash(){
const m=/^#\/(demo|eu|na|latam|br|ap|kr)(?:\/([^/]+))?(?:\/([a-z]+))?$/.exec(location.hash||'');if(!m)return null;
if(m[1]==='demo')return{demo:true,tab:m[2]||'vue'};
let riot='';try{riot=decodeURIComponent(m[2]||'');}catch(e){return null;}
return splitRiot(riot)?{riot,region:m[1],tab:m[3]||'vue'}:null;
}
async function openFromHash(){
const h=readHash();if(!h){if(APP.prof&&!location.hash){APP.prof=null;await licRefresh();themeRefresh();render();}return false;}
const tab=TAB_KEYS.includes(h.tab)?h.tab:'vue';
if(h.demo){if(!APP.prof||!APP.prof.demo)await openDemo(true,tab);else if(APP.tab!==tab)ACT.tab(tab,null,true);return true;}
if(APP.prof&&!APP.prof.demo&&APP.prof.rid===ridNorm(h.riot)){if(APP.tab!==tab)ACT.tab(tab,null,true);return true;}
APP.tab=tab;await openProfile(h.riot,h.region,{keepTab:true,noPush:true});return true;
}
window.addEventListener('popstate',()=>{if($('#dlg').open)$('#dlg').close();openFromHash();});
async function openProfile(riot,region,opt={}){
if(!splitRiot(riot))return toast('Écris ton Riot ID en entier : Pseudo#TAG',true);
if(!apiReady())return keyAsk(riot,region);
if(!opt.bg)document.body.classList.add('busy');
const old=!opt.force&&ST.get('prof:'+ridNorm(riot)),early=old&&old.v===2&&!(APP.prof&&APP.prof.rid===old.rid)?old:null;
if(early){await profShow(early,opt);document.body.classList.remove('busy');}
try{
const P=await loadProfile(riot,region,opt),same=APP.prof&&APP.prof.rid===P.rid;
if(!same||APP.prof.at!==P.at){
const moved=same&&(APP.prof.rows[0]||{}).id!==(P.rows[0]||{}).id;
if(same&&!moved&&APP.prof.mmr.rr===P.mmr.rr&&APP.prof.rows.length===P.rows.length){APP.prof=P;}
else{if(moved){APP.D=null;APP.detTried='';}await profShow(P,Object.assign({},opt,early?{noPush:true}:{}),same);}
}
if(!opt.all&&!P.full&&featOn('historique',APP.plan,APP.cfg)&&P.rows.length>=20)setTimeout(()=>{if(APP.prof&&APP.prof.rid===P.rid)openProfile(P.riot,P.region,{force:true,all:true,keepTab:true,noPush:true,bg:true,quiet:true});},1500);
else if(opt.all&&!opt.bg)toast(P.full?`Historique complet : ${nPart(P.rows.length)} gardées`:'Historique incomplet : le service a coupé, réessaie plus tard',!P.full);
}catch(e){
statut('');if(e.code==='nokey')keyAsk(riot,region);
else if(early)toast(`Service indisponible : tu vois tes données du ${dFr(early.at,{day:'numeric',month:'short'})} à ${hFr(early.at)}.`,true,{label:'Réessayer',fn:()=>openProfile(riot,region,Object.assign({},opt,{force:true}))});
else if(!opt.quiet)toast(e.message,true,{label:'Réessayer',fn:()=>openProfile(riot,region,opt)});else render();
}
document.body.classList.remove('busy');
}
async function profShow(P,opt,refresh){
const changed=!APP.prof||APP.prof.rid!==P.rid;
if(changed){if(!opt.keepTab)APP.tab='vue';APP.filt=null;APP.cmp=null;APP.D=null;APP.detTried='';APP.pos=null;APP.strat=null;}
APP.prof=P;ST.set('last',{riot:P.riot,region:P.region});
await licRefresh();themeRefresh();if(!refresh||canRerender())render();if(changed)window.scrollTo(0,0);setHash(changed&&!opt.noPush);
}
async function openDemo(noPush,tab){APP.prof=demoProfile();APP.tab=TAB_KEYS.includes(tab)?tab:'vue';APP.filt=null;APP.cmp=null;APP.D=null;APP.pos=null;APP.strat=null;await licRefresh();themeRefresh();render();window.scrollTo(0,0);setHash(!noPush);}
function render(){
if(APP.cfg.maintenance&&APP.plan!=='dieu'){document.body.classList.remove('has-gnav');$('#app').innerHTML=`<div class="card state"><div class="state-i" aria-hidden="true">${ico('settings')}</div><h2>Maintenance</h2><p>${esc(APP.cfg.nom)} revient très vite. ${esc(APP.cfg.annonce)}</p></div>`;return;}
if(!APP.prof)renderLanding();else renderProfile();
const P=APP.prof;$('#qRiot').value=P&&!P.demo?P.riot:'';if(P&&!P.demo)$('#qReg').value=P.region;
}
function keyAsk(riot,region){
dlgOpen(`<h2>Il manque le service de données</h2><p>${esc(APP.cfg.nom)} n'a pas encore son serveur. En attendant, tu peux utiliser ta propre clé <b>HenrikDev</b> (gratuite, 2 minutes) :</p>
    <ol class="plan"><li>Rejoins le Discord de HenrikDev (lien sur <span class="kbd">docs.henrikdev.xyz</span>).</li><li>Salon de vérification, puis génère une clé « Basic ».</li><li>Colle-la ici : elle reste dans ton navigateur.</li></ol>
    <div class="row"><input id="keyIn" placeholder="HDEV-…" autocomplete="off" aria-label="Ta clé HenrikDev"><button class="btn" data-act="keySave">Enregistrer</button></div>
    <p class="note">Ou <a href="#" data-act="demo">regarde la démo</a> en attendant.</p>`);
APP.pending={riot,region};
}
function loadImg(src){return new Promise(res=>{if(!src)return res(null);const im=new Image();if(!src.startsWith('data:'))im.crossOrigin='anonymous';im.onload=()=>res(im);im.onerror=()=>res(null);im.src=src;});}
async function shareCard(withImg=true){
const P=APP.prof,th=TH.last,A=rowsAgg(P.rows.slice(0,20)),cv=document.createElement('canvas');cv.width=1200;cv.height=630;const g=cv.getContext('2d');
const ft=(FONTS[th.fontT]||FONTS.teko).css,fb=(FONTS[th.fontB]||FONTS.systeme).css;
try{await document.fonts.load(`64px ${ft}`);}catch(e){}
g.fillStyle=th.bg;g.fillRect(0,0,1200,630);
const motif=()=>{
g.strokeStyle='rgba(255,255,255,.05)';g.lineWidth=1;g.beginPath();for(let x=.5;x<1200;x+=16){g.moveTo(x,0);g.lineTo(x,630);}for(let y=.5;y<630;y+=16){g.moveTo(0,y);g.lineTo(1200,y);}g.stroke();
[[760,1010,1110,860,.09],[900,1150,1172,922,.16]].forEach(([a,b,c,d,o])=>{g.fillStyle=rgba(th.accent,o);g.beginPath();g.moveTo(a,630);g.lineTo(b,0);g.lineTo(c,0);g.lineTo(d,630);g.closePath();g.fill();});};
if(withImg){
const[bgI,por,rk,card]=await Promise.all([loadImg(th.bgImg),loadImg(th.portrait),loadImg(IMG.rank(P.mmr.tier)),loadImg(IMG.card(P.card,'wideart'))]);
if(bgI){const s=Math.max(1200/bgI.width,630/bgI.height);g.globalAlpha=.35;g.drawImage(bgI,(1200-bgI.width*s)/2,(630-bgI.height*s)/2,bgI.width*s,bgI.height*s);g.globalAlpha=1;}
if(card){g.globalAlpha=.5;g.drawImage(card,0,0,1200,1200*card.height/card.width);g.globalAlpha=1;}
const gr=g.createLinearGradient(0,0,1200,0);gr.addColorStop(0,rgba(th.bg,.96));gr.addColorStop(.55,rgba(th.bg,.75));gr.addColorStop(1,rgba(th.bg,.1));g.fillStyle=gr;g.fillRect(0,0,1200,630);motif();
if(por){const h=700,w=por.width*h/por.height;g.drawImage(por,1200-w*.78,-20,w,h);}
if(rk)g.drawImage(rk,60,250,96,96);
}else motif();
g.fillStyle=th.accent;g.fillRect(0,0,10,630);
g.fillStyle='#ffffff';g.font=`700 92px ${ft}`;const nw=g.measureText(P.name).width;g.fillText(P.name,60,150);
if(!th.streamer){g.fillStyle='rgba(255,255,255,.6)';g.font=`600 40px ${ft}`;g.fillText('#'+P.tag,72+nw,150);}
g.fillStyle=th.accentT;g.font=`700 46px ${ft}`;g.fillText(tierFr(P.mmr.tier)+(P.mmr.rr!=null?`  ${P.mmr.rr} RR`:''),176,300);
g.fillStyle='rgba(255,255,255,.7)';g.font=`500 22px ${fb}`;g.fillText(`${A.n} dernières parties · ${th.label||''}`,176,334);
const K=[['Victoires',pc0(A.wr)],['K/D',fmt(A.kd,2)],['ACS',fmt(A.acs,0)],['Tête',pc0(A.hsP)],['ADR',fmt(A.adr,0)]];
K.forEach(([n,v],i)=>{const x=60+i*150,y=400;g.fillStyle=rgba(th.bg2,.85);g.fillRect(x,y,136,110);g.fillStyle=th.accent;g.fillRect(x,y,136,4);
g.fillStyle='rgba(255,255,255,.65)';g.font=`600 17px ${fb}`;g.fillText(n.toUpperCase(),x+14,y+34);g.fillStyle='#fff';g.font=`700 44px ${ft}`;g.fillText(v,x+14,y+86);});
g.save();g.translate(54,561);g.scale(.55,.55);g.fillStyle=th.accentT;g.fill(new Path2D(LOGO_D));g.beginPath();g.arc(51,12,4.5,0,7);g.fill();g.restore();
g.fillStyle='rgba(255,255,255,.55)';g.font=`500 18px ${fb}`;g.fillText(`${APP.cfg.nom} · projet de fan, non approuvé par Riot Games`,92,590);
try{
const blob=await new Promise((res,rej)=>{try{cv.toBlob(b=>b?res(b):rej(new Error('vide')),'image/png');}catch(e){rej(e);}});
const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`profil-${P.name.replace(/[^\w-]+/g,'_')}.png`;document.body.appendChild(a);a.click();a.remove();
try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);toast('Image téléchargée et copiée : colle-la sur Discord avec Ctrl+V');}catch(e){toast('Image téléchargée');}
}catch(e){if(withImg)return shareCard(false);toast('Image impossible dans ce navigateur',true);}
}
const SECRET_KEYS=[PX+'hkey'];
function dataExport(){
const o={format:'elitrack-sauvegarde',version:1,date:today(),data:{}};
Object.keys(localStorage).filter(k=>k.startsWith(PX)&&!SECRET_KEYS.includes(k)).forEach(k=>{o.data[k]=localStorage.getItem(k);});
const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:'application/json'}));a.download=`elitrack-sauvegarde-${today()}.json`;document.body.appendChild(a);a.click();a.remove();
toast('Sauvegarde téléchargée (profils, thème, objectifs, entraînements, codes)');
}
async function dataImport(file){
if(!file||file.size>8e6)return toast('Fichier trop gros ou absent',true);
let o;try{o=JSON.parse(await file.text());}catch(e){return toast('Fichier illisible',true);}
if(!o||o.format!=='elitrack-sauvegarde'||!o.data||typeof o.data!=='object')return toast('Ce n\'est pas une sauvegarde Elitrack',true);
const E=Object.entries(o.data).filter(([k,v])=>typeof k==='string'&&k.startsWith(PX)&&!SECRET_KEYS.includes(k)&&/^[\w:#.@%-]{1,120}$/.test(k.slice(PX.length))&&typeof v==='string'&&v.length<3e6);
if(!E.length)return toast('Sauvegarde vide',true);
if(!confirm(`Remplacer les données de ce navigateur par cette sauvegarde (${E.length} éléments, du ${o.date||'?'}) ?`))return;
E.forEach(([k,v])=>{try{JSON.parse(v);localStorage.setItem(k,v);}catch(e){}});
toast('Sauvegarde restaurée');setTimeout(()=>location.reload(),700);
}
Object.assign(ACT,{
accueil:()=>{APP.prof=null;APP.plan='free';APP.lic=null;APP.licCode='';setHash(true);licRefresh().then(()=>{themeRefresh();render();window.scrollTo(0,0);});},
demo:()=>{if($('#dlg').open)$('#dlg').close();openDemo();},
tab:(k,el,noHash)=>{if(k==='cartes'){k='agents';setTimeout(()=>{const c=$('#cartes');if(c)c.scrollIntoView({behavior:'smooth'});},60);}
if(!TAB_KEYS.includes(k))return;APP.tab=k;(APP.grpLast=APP.grpLast||{})[groupOf(k)[0]]=k;navRender();const tp=$('#tabIn');if(tp)tp.setAttribute('aria-labelledby','tb-'+k);
tabShow();renderTab();if(!noHash)setHash(false);
const nav=$('#pnav');if(el&&tp&&nav){const d=tp.getBoundingClientRect().top-Math.max(0,nav.getBoundingClientRect().bottom)-8;if(d<0)window.scrollBy(0,d);}},
grp:g=>{const G=GROUPS.find(x=>x[0]===g);if(G)ACT.tab(G[2].includes(APP.tab)?APP.tab:(APP.grpLast||{})[g]||G[2][0],true);},
refresh:()=>APP.prof&&openProfile(APP.prof.riot,APP.prof.region,{force:true,keepTab:true}),
more:()=>featOn('historique',APP.plan,APP.cfg)?openProfile(APP.prof.riot,APP.prof.region,{force:true,all:true,keepTab:true}):premiumOpen('historique'),
rapport:id=>openReport(id),
perso:()=>persoOpen(),
persoClose:()=>persoClose(),
accAuto:()=>persoSet('accent',''),
imgDel:()=>{ST.del('img');persoSet('bg','auto');},
blk:(arg)=>{const[b,dir]=arg.split(':'),t=TH.draft,L=(t.blocks.length?t.blocks.concat(BLOCKS.filter(x=>!t.blocks.includes(x))):BLOCKS.slice()),i=L.indexOf(b),j=i+ +dir;
if(i<0||j<0||j>=L.length)return;[L[i],L[j]]=[L[j],L[i]];persoSet('blocks',L);},
blkHide:b=>{const h=TH.draft.hidden.includes(b)?TH.draft.hidden.filter(x=>x!==b):TH.draft.hidden.concat(b);persoSet('hidden',h);},
themeCopy:()=>copyText($('#pfCode').value,'Code du thème copié'),
themeImport:()=>{const t=themeParse($('#pfImport').value);if(!t)return toast('Code de thème invalide',true);TH.draft=t;themeRefresh();persoRender();toast('Thème appliqué (aperçu)');},
themeReset:()=>{TH.draft=themeClean({});themeRefresh();persoRender();},
share:()=>featOn('partage',APP.plan,APP.cfg)?shareCard():premiumOpen('partage'),
linkCopy:()=>{const u=location.origin+location.pathname+hashOf();copyText(u,'Lien du profil copié : colle-le où tu veux');},
premium:f=>premiumOpen(f),
codeAsk:()=>dlgOpen(codeHtml()),
licEnter:()=>licEnter(),
dlgClose:()=>$('#dlg').close(),
side:arg=>{const[k,s]=arg.split(':');if(APP[k]&&(s==='A'||s==='D')){APP[k].side=s;renderTab();}},
posgo:m=>{if(APP.pos){APP.pos.map=m;renderTab();window.scrollTo({top:$('#tabIn').offsetTop-80,behavior:'smooth'});}},
detMore:()=>detMore(),
detN:v=>{v=+v;if(!DET_CHOIX.includes(v)||v===detN())return;ST.set('detN',v);APP.detTried='';APP.D=null;renderTab();},
brief:()=>lotLoad().then(()=>briefOpen()),
retab:()=>renderTab(),
briefCopy:()=>APP.briefTxt&&copyText(APP.briefTxt,'Briefing copié : colle-le sur Discord'),
aide:()=>dlgOpen(glossHtml()),
legal:k=>dlgOpen(legalHtml(k)),
install:()=>installApp(),
keySave:()=>{const k=($('#keyIn').value||'').trim();if(k.length<10)return toast('Clé trop courte : recopie-la en entier',true);setUserKey(k);$('#dlg').close();toast('Clé enregistrée dans ce navigateur');if(APP.pending)openProfile(APP.pending.riot,APP.pending.region);},
reglages:()=>dlgOpen(`<h2>Réglages</h2>
    <h3>Ma clé HenrikDev (facultatif)</h3><p class="note">Seulement si le site est saturé ou sans serveur. Elle reste dans ce navigateur.</p>
    <div class="row"><input id="keyIn" placeholder="${userKey()?'Clé enregistrée (••••)':'HDEV-…'}" autocomplete="off" aria-label="Clé HenrikDev"><button class="btn" data-act="keySave">Enregistrer</button>${userKey()?'<button class="btn ghost" data-act="keyDel">Retirer</button>':''}</div>
    <h3 class="mt">Premium</h3>${APP.lic?`<p>${APP.plan==='dieu'?'Mode Dieu':'Premium'} actif${APP.lic.exp?` jusqu'au ${esc(APP.lic.exp)}`:' à vie'}.</p>`:'<p class="muted">Pas de code actif sur ce profil.</p>'}${codeHtml()}
    <h3 class="mt">Mes données</h3><p class="note">Profils gardés, détails des parties, thème, objectifs, entraînements, codes : tout est dans ce navigateur, nulle part ailleurs.</p>
    <div class="row"><button class="btn ghost" data-act="export">⬇️ Sauvegarder mes données</button><label class="btn ghost file">⬆️ Restaurer une sauvegarde<input type="file" accept="application/json,.json" id="impFile" hidden></label><button class="btn ghost" data-act="forget">Oublier toutes mes données</button></div>
    ${ST.get('err',[]).length?'<p class="note">Un souci ? <a href="#" data-act="errCopy">Copier le journal des erreurs</a> pour le propriétaire du site.</p>':''}`),
keyDel:()=>{setUserKey('');$('#dlg').close();toast('Clé retirée');},
export:()=>dataExport(),
errCopy:()=>copyText(ST.get('err',[]).map(e=>`${e.t} ${e.m}`).join('\n')||'(vide)','Journal copié'),
forget:async()=>{if(!confirm('Effacer profils, détails, thème, objectifs, entraînements et codes de ce navigateur ?'))return;Object.keys(localStorage).filter(k=>k.startsWith(PX)).forEach(k=>localStorage.removeItem(k));await detForget();location.href=location.pathname;}
});
document.addEventListener('click',e=>{
const a=e.target.closest('[data-act]');if(!a)return;e.preventDefault();
const[n,...arg]=a.dataset.act.split(':'),run=()=>{if(ACT[n]){try{ACT[n](arg.join(':'),a);}catch(x){console.error(x);logErr(x);toast('Oups : '+x.message,true);}}};
if(ACT[n])run();else lotLoad().then(run,x=>toast(x.message,true));
});
document.addEventListener('submit',e=>{
e.preventDefault();
if(e.target.id==='landForm'){if(!$('#landOk').checked)return toast('Coche « C\'est mon compte » pour continuer',true);ST.set('consent',true);openProfile($('#landRiot').value,$('#landReg').value);}
if(e.target.id==='recherche'){if(!ST.get('consent')){ST.set('consent',true);}openProfile($('#qRiot').value,$('#qReg').value);}
if(e.target.id==='cmpForm'){
if(!$('#cmpOk').checked)return toast('Coche la case : ton ami doit être d\'accord',true);
loadProfile($('#cmpRiot').value,APP.prof.region).then(p=>{APP.cmp=p;statut('');renderTab();}).catch(err=>{statut('');toast(err.message,true);});
}
});
document.addEventListener('change',e=>{
const f=e.target.closest('[data-filt]');if(f){APP.filt[f.dataset.filt]=f.value;return renderTab();}
const s=e.target.closest('[data-sens]');if(s){const S=ST.get('sens',{dpi:800,sens:.4}),v=parseFloat(String(s.value).replace(',','.'));if(v>0){S[s.dataset.sens]=v;ST.set('sens',S);renderTab();}return;}
const p=e.target.closest('[data-pick]');if(p){const k=p.dataset.pick;if(APP[k]){APP[k].map=p.value;renderTab();}return;}
const fo=e.target.closest('[data-focus]');if(fo&&fo.value)return ACT.focusSet(fo.value);
const g=e.target.closest('[data-goal]');if(g&&APP.prof){ST.set('goal:'+APP.prof.rid,+g.value);return renderTab();}
const r=e.target.closest('[data-repround]');if(r)return drawRep(r.value);
if(e.target.id==='impFile'&&e.target.files[0])dataImport(e.target.files[0]);
});
document.addEventListener('keydown',e=>{
if(e.key==='Escape'&&!$('#perso').hidden)return persoClose();
const tb=e.target&&e.target.closest&&e.target.closest('[role=tab]');
if(tb&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){const L=$$('[role=tab]',tb.parentNode),n=L[(L.indexOf(tb)+(e.key==='ArrowRight'?1:-1)+L.length)%L.length];e.preventDefault();ACT.tab(n.dataset.act.split(':')[1],n);const f=$('#tb-'+APP.tab);if(f)f.focus();return;}
const typing=/^(INPUT|SELECT|TEXTAREA)$/.test((e.target&&e.target.tagName)||'')||(e.target&&e.target.isContentEditable);
if(typing||e.ctrlKey||e.metaKey||e.altKey||$('#dlg').open)return;
if(e.key==='/'){const i=$('#recherche').hidden?$('#landRiot'):$('#qRiot');if(i){e.preventDefault();i.focus();i.select();}}
else if(e.key==='?'){e.preventDefault();ACT.aide();}
else if(/^[0-9]$/.test(e.key)&&APP.prof&&$('#tabIn')){const i=e.key==='0'?9:+e.key-1;if(TAB_KEYS[i]){e.preventDefault();ACT.tab(TAB_KEYS[i]);}}
});
document.addEventListener('error',e=>{if(e.target&&e.target.tagName==='IMG')e.target.classList.add('img-ko');},true);
$('#dlg').addEventListener('click',e=>{if(e.target===$('#dlg'))$('#dlg').close();});
let INSTALL=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();INSTALL=e;const b=$('#instBtn');if(b)b.hidden=false;});
window.addEventListener('appinstalled',()=>{INSTALL=null;const b=$('#instBtn');if(b)b.hidden=true;toast('Elitrack est installé ✔');});
async function installApp(){
if(!INSTALL)return toast('Menu du navigateur › « Installer Elitrack » ou « Ajouter à l\'écran d\'accueil »');
INSTALL.prompt();try{await INSTALL.userChoice;}catch(e){}INSTALL=null;$('#instBtn').hidden=true;
}
if(GUARD_OK&&'serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(e=>console.warn('Hors ligne indisponible',e)));
(async function boot(){
if(!GUARD_OK)return;
if(readHash()||(ST.get('last')||{}).riot)$('#recherche').hidden=false;
$('#qReg').innerHTML=REGIONS.map(([v,n])=>`<option value="${v}">${n}</option>`).join('');
const hdr=()=>document.documentElement.style.setProperty('--hdr',$('header.top').offsetHeight+'px');window.addEventListener('resize',hdr);hdr();
const net=()=>{$('#horsLigne').hidden=navigator.onLine!==false;};window.addEventListener('online',net);window.addEventListener('offline',net);net();
await loadCfg();applyCfg();liveCfg().catch(logErr);await licRefresh();themeRefresh();
if(await openFromHash())return;
const last=ST.get('last');
if(last&&last.riot&&apiReady()){render();openProfile(last.riot,last.region||'eu',{quiet:true,noPush:true});}else render();
})();
