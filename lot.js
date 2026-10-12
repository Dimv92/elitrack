/*! © 2026 Elitrack. Tous droits réservés. Code, design et méthodes d'analyse protégés par le droit d'auteur (CPI art. L.122-4, L.335-2). Toute copie, reproduction ou réutilisation sans accord écrit est interdite. Version 20261012-1332. */
"use strict";
const VCOL={ok:['rgba(62,224,168,.32)','#3ee0a8'],warn:['rgba(255,200,87,.26)','#ffc857'],bad:['rgba(255,90,106,.3)','#ff5a6a'],'':['rgba(150,140,160,.18)','#8a8094']};
const KIND_FR={def:'Tenue par la défense',atk:'Côté attaque',mix:'Disputée'};
const angTxt=s=>s&&s.ang?`vers ${s.ang.z}${s.dist?` (~${s.dist} m)`:''}`:'—';
const tallyZ=a=>{const o={};(a||[]).forEach(k=>{if(k)o[k]=(o[k]||0)+1;});return Object.entries(o).sort((x,y)=>y[1]-x[1]);};
const top3=t=>t.slice(0,3).map(([n,c])=>`${n} (${c})`).join(', ');
const nA=a=>a&&a[0]?`${a[1]}/${a[0]}`:'0';
function abil(ag,type){const k=(window.KITS||{})[ag];if(!k)return null;for(const j of type==='ab'?[3,2,1]:[2,3,1,4]){const[n,c]=String(k[j]||'').split('|');if(c===type)return{n,sl:'CQEX'[j-1]};}return null;}
const abN=a=>a?`${a.n} (${a.sl})`:'';
function myAgentOn(rows,map){const a=aggBy((rows||[]).filter(r=>r.map===map).slice(0,30),'agent');return a.length?a[0].key:null;}
function mapPicker(kind,maps,cur,side,extra=''){
return`<div class="row filt"><select data-pick="${kind}" aria-label="Carte">${maps.map(m=>`<option value="${esc(m.map)}"${m.map===cur?' selected':''}>${esc(m.map)}${m.n?` · ${m.n} partie${m.n>1?'s':''} à toi`:''}</option>`).join('')}</select>
    <div class="chips" role="group" aria-label="Côté">${['A','D'].map(s=>`<button type="button" class="chip${side===s?' on':''}" data-act="side:${kind}:${s}" aria-pressed="${side===s}">${s==='A'?'Attaque':'Défense'}</button>`).join('')}</div>${extra}</div>`;
}
function pickState(key,maps,side0){
const S=APP[key]||(APP[key]={map:maps[0].map,side:side0});
if(!maps.some(m=>m.map===S.map))S.map=maps[0].map;
return S;
}
const moreBtn=()=>APP.prof.demo||!apiReady()?'':`<button class="btn ghost sm" data-act="detMore" title="Récupère le détail de parties plus anciennes (1 toutes les 2 s)">＋ Analyser plus de parties</button>`;
function posMaps(D){
const mine=mapsOfD(D),n=m=>(mine.find(x=>x.map===m)||{}).n||0;
const at=APP.atlas?Object.keys(APP.atlas.maps).filter(mapOk).sort((a,b)=>n(b)-n(a)||APP.atlas.maps[b].n-APP.atlas.maps[a].n):[];
return[...at,...mine.map(x=>x.map).filter(m=>!at.includes(m))].map(map=>({map,n:n(map)}));
}
const siteTxt=L=>L.length?L.map(s=>`<b>${esc(s.s)}</b> ${pct(s.share)}`).join(' · '):'<span class="muted">—</span>';
function sitesCard(D,only,bare){
const rk=rgOf(APP.prof.mmr.tier),maps=only?[only]:posMaps(D).map(m=>m.map);
const rows=maps.map(map=>{const M=atlasMap(map),all=atlasSites(M,rk),me=sitesMe(D,map),top=all[0];
if(!M&&!me.A.length&&!me.D.length)return'';
return`<tr><td><b>${esc(map)}</b>${M?` <small class="muted">${M.n} p.</small>`:''}</td><td>${top?`<b class="up">${esc(top.s)}</b> <small class="muted">(${siteTxt(all).replace(/<\/?b>/g,'')})</small>`:'—'}</td>
      <td>${rk&&all.some(s=>s.gShare!=null)?all.slice().sort((a,b)=>(b.gShare||0)-(a.gShare||0)).map(s=>`${esc(s.s)} ${pct(s.gShare)}`).join(' · '):'—'}</td>
      <td>${me.A.length?siteTxt(me.A)+` <small class="muted">(${me.A.reduce((a,s)=>a+s.n,0)} plants)</small>`:'<span class="muted">—</span>'}</td>
      <td>${me.D.length?siteTxt(me.D)+` <small class="muted">(${me.D.reduce((a,s)=>a+s.n,0)})</small>`:'<span class="muted">—</span>'}</td></tr>`;}).join('');
if(!rows)return'';
return`<div class="${bare?'':'card mt'}"><div class="card-h"><h3>Site le plus attaqué${only?` sur ${esc(only)}`:', carte par carte'}</h3><span class="muted small">part des plants de l'attaque</span></div>
    <div class="tbl"><table class="small"><thead><tr><th>Carte</th><th>Tous les joueurs</th><th>${rk?esc(RG_FR[rk]):'Ton niveau'}</th><th>Tes parties : ton équipe attaque</th><th>Tes parties : tu défends</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="note">« Tous » : ${APP.atlas?`${APP.atlas.matches.toLocaleString('fr-FR')} parties classées collectées (${esc((APP.atlas.region||'').toUpperCase())})`:'atlas indisponible'}. « Tes parties » : tes parties détaillées, mises à jour toutes seules après chaque partie.</p></div>`;
}
const POS_LOW=10;
const kindOf=s=>s.verdict[1]==='ok'?'ok':s.verdict[1]==='bad'?'bad':'neutral';
const VERD_FR={ok:'à jouer',bad:'à éviter',neutral:'correct',foe:'adversaire',ring:'présence adverse',line:'ligne d\'ouverture'};
const moreAct=()=>APP.prof.demo||!apiReady()?null:['Analyser plus de parties','detMore'];
function tabPosition(){
if(APP.atlas===undefined)return`${skel(1)}<div class="grid g2 mt"><div class="skel skel-b" style="aspect-ratio:1;height:auto"></div>${skel(5)}</div>`;
const D=APP.D||[],maps=posMaps(D);
if(!maps.length)return detWait(3)||stateHtml(ico('tactique'),'Pas encore de partie détaillée','Analyse au moins 3 parties pour voir tes positions sur une carte.',moreAct());
const S=pickState('pos',maps,'D'),map=S.map,side=S.side,foe=side==='A'?'D':'A',cos=cosOf(map),M=atlasMap(map),now=Date.now();
const nMe=D.filter(d=>d.map===map).length,src=S.src==='moi'||!M?'moi':'tous';
const V=src==='tous'?posAtlasV(D,map,side,foe,cos,M,now):posMineV(D,map,side,cos,now,M,nMe);
const chips=`<div class="chips" role="group" aria-label="Données">${[['tous',`Tous les joueurs${M?` · ${M.n} p.`:''}`],['moi',`Toi · ${nMe} p.`]].map(([k,t])=>`<button type="button" class="chip${src===k?' on':''}" data-act="possrc:${k}" aria-pressed="${src===k}">${t}</button>`).join('')}</div>`;
const allMaps=D.length||APP.atlas?`<details class="card mt"><summary><b>Toutes les cartes</b> <span class="muted small">site le plus attaqué et ta meilleure zone, carte par carte</span></summary>${sitesCard(D,null,true)}${D.length?`<h3>Ta meilleure zone de chaque côté</h3>${posOverview(D,mapsOfD(D),now)}`:''}</details>`:'';
const head=`<div class="card"><div class="card-h"><h2>Positionnement</h2></div>${mapPicker('pos',maps,map,side,chips)}</div>`;
if(V.empty)return head+`<div class="mt">${V.empty}</div>`+allMaps;
after(()=>svgDraw($('#posMv'),map,V.L));
const eb=`${esc(map)} · ${SIDE_FR[side]} · ${src==='tous'?'tous les joueurs':'tes parties'}`;
return`${head}${verdictHtml(V.verdict,eb)}
    <div class="grid g2 mt" data-link="pos"><div class="card">${svgMapHtml('posMv',map,`Minimap de ${map} en ${SIDE_FR[side]}`)}${legendHtml(V.legend)}</div><div class="card">${V.list}</div></div>
    ${V.extra||''}${allMaps}
    <p class="note">Seuls les duels d'avant le plant jugent une position (après le plant : retake ou post-plant). Taux lissés : corrigés quand il y a peu de duels. Positions anonymes : aucun joueur n'est identifié.</p>`;
}
function rowHtml(r){
const val=r.rate!=null&&r.kind!=='foe'?`<b>${pct(r.rate)}</b>${barHtml(r.rate,r.avg,r.kind)}<span class="n">${r.nTxt}</span>`:`<b>${r.val}</b><span class="n">${r.nTxt}</span>`;
return`<li class="prow${r.low?' low':''}" data-k="${r.k}" tabindex="0">${mkHtml(r)}<b class="pz">${esc(r.z)} <span class="sr">(${VERD_FR[r.kind]||''})</span></b><span class="val">${val}</span><span class="sub2">${esc(r.sub)}${r.low?' <span class="low-b">peu de données</span>':''}</span></li>`;
}
function listHtml(spots,foes,lines,tSpots,tFoes,foot){
return`<h3 style="margin-top:0">${tSpots}</h3><ul class="plist">${spots.map(rowHtml).join('')}</ul>
    ${foes.length?`<h3>${tFoes}</h3><ul class="plist">${foes.map(rowHtml).join('')}</ul>`:''}
    ${lines.length?`<details class="mt8"><summary class="small"><b>Lignes d'ouverture</b> <span class="muted">(${lines.length})</span></summary><ul class="plist mt8">${lines.map(rowHtml).join('')}</ul></details>`:''}
    <p class="note">Survole ou touche une ligne : son repère s'allume sur la carte (et inversement). ${foot||''}</p>`;
}
function posAtlasV(D,map,side,foe,cos,M,now){
const K=atlasControl(M,cos),SP=atlasSpots(M,side,cos,K).filter(s=>coPlay(cos,s.z)),ev=posDuels(D,map,side,now);
const spread=(L,n,R=600)=>{const o=[];for(const s of L){if(o.length>=n)break;if(!o.some(q=>Math.hypot(q.x-s.x,q.y-s.y)<R))o.push(s);}return o;};
const best=spread(SP.filter(s=>s.setup&&s.n>=30&&s.verdict[1]!=='bad'),6),worst=spread(SP.filter(s=>s.verdict[1]==='bad').reverse(),3);
if(!best.length&&!worst.length)return{empty:stateHtml(ico('tactique'),'Pas encore assez de duels ici',`Les parties collectées n'ont pas encore assez de duels sur ${map} en ${SIDE_FR[side]}. Essaie l'autre côté, une autre carte ou tes propres parties.`,['Voir mes parties','possrc:moi'])};
const thr=spread(atlasSpots(M,foe,cos,K).filter(s=>s.n>=30&&coPlay(cos,s.z)).sort((a,b)=>b.w-a.w),5);
const pres=atlasZones(M,foe).filter(z=>z.pres!=null&&coPlay(cos,z.z)).slice(0,5),lines=atlasLines(M,side).filter(l=>coPlay(cos,l.me)&&coPlay(cos,l.foe)).slice(0,8),sites=atlasSites(M,rgOf(APP.prof.mmr.tier));
[...best,...worst,...thr].forEach(s=>{if(s.ang===s.z)s.ang='bout portant, même zone';});
const near=s=>{const n=ev.filter(e=>Math.hypot(e.x-s.x,e.y-s.y)<=450),k=n.filter(e=>e.win).length;return n.length?` · toi ici ${k}-${n.length-k}`:'';};
const p0=(best[0]||worst[0]).p0;
const spot=(s,i,bad)=>({k:(bad?'w':'s')+i,kind:bad?'bad':kindOf(s),num:bad?'':String(i+1),x:s.x,y:s.y,z:s.z,rate:s.sh,avg:p0,nTxt:`${s.n} duels`,
sub:`vers ${s.ang||'?'} · ~${s.dist} m${near(s)}`,tip:`${s.z} : ${pct(s.sh)} de duels gagnés (${s.n} duels, brut ${pct(s.raw)})`});
const spots=[...best.map((s,i)=>spot(s,i)),...worst.map((s,i)=>spot(s,i,true))];
const foes=[...thr.map((t,i)=>({k:'t'+i,kind:'foe',x:t.x,y:t.y,z:t.z,size:t.w,val:String(t.w),nTxt:`kills · ${pct(t.raw)} de leurs duels`,sub:`ils regardent vers ${t.ang||'?'}`,tip:`D'où ils tuent : ${t.z}, ${t.w} kills (${t.n} duels)`})),
...pres.map((z,i)=>{const c=coXY(map,z.z);return c&&{k:'p'+i,kind:'ring',x:c.x,y:c.y,z:z.z,pres:z.pres,val:pct(z.pres),nTxt:'des rounds',sub:z.rate!=null&&z.ev>=30?`présents au 1er contact · ils y gagnent ${pct(z.rate)} de leurs duels (${z.ev})`:'présents au 1er contact',tip:`${z.z} : au moins un ${foe==='A'?'attaquant':'défenseur'} y est dans ${pct(z.pres)} des rounds au premier contact`};}).filter(Boolean)];
const lr=lines.map((l,i)=>{const a=coXY(map,l.foe),b=coXY(map,l.me);return a&&b&&{k:'l'+i,kind:'line',a,b,z:`${l.me} contre ${l.foe}`,rate:l.rate,avg:.5,nTxt:`${l.n} duels`,low:l.n<30,sub:`${pct(l.share)} des ouvertures de la carte · gagnée par ton côté`};}).filter(Boolean);
const b0=best[0],st=sites[0],kW=ev.filter(e=>e.win).length;
const verdict=b0?{cls:'ok',h:`Joue ${b0.z}, regarde vers ${b0.ang}`,p:`Le spot n° 1 de la liste : celui qui gagne le plus de duels de ce côté, sur toutes les parties collectées.${side==='D'?' Seules les zones tenables avant l\'ouverture des barrières sont proposées.':''}`}
:{cls:'bad',h:`Évite ${worst[0].z}`,p:'Aucun spot ne ressort nettement de ce côté : commence par éviter celui-ci.'};
verdict.facts=[st&&['Site le plus attaqué',`<b>${esc(st.s)}</b>`,`${pct(st.share)} des plants · ${M.n} parties${st.win!=null?` · l'attaque gagne ensuite ${pct(st.win)}`:''}`],
['Moyenne de ce côté',`<b>${pct(p0)}</b>`,'de duels gagnés (le trait des barres)'],
ev.length&&['Toi sur cette carte',`<b class="${ev.length<POS_LOW?'low':''}">${pct(kW/ev.length)}</b>`,`de tes duels avant le plant · ${nTag(ev.length,'duels',POS_LOW)}`]].filter(Boolean);
const legend=[...new Set(spots.map(s=>s.kind))].map(k=>[k]).concat(thr.length?[['foe']]:[],pres.length?[['ring']]:[],b0?[['arw']]:[],lr.length?[['line']]:[],lr.some(l=>l.low)?[['low']]:[]);
const L={spots,foes:foes.filter(f=>f.kind==='foe'),rings:foes.filter(f=>f.kind==='ring'),
arrows:best.map((s,i)=>({k:'s'+i,x1:s.x,y1:s.y,x2:s.ex,y2:s.ey,top:!i,max:90})),lines:lr.map(l=>({k:l.k,x1:l.a.x,y1:l.a.y,x2:l.b.x,y2:l.b.y,dash:true}))};
return{verdict,L,legend,list:listHtml(spots,foes,lr,`Où te placer en ${SIDE_FR[side]}`,'Adversaires')};
}
function posMineV(D,map,side,cos,now,M,nMe){
if(!nMe)return{empty:stateHtml(ico('tactique'),`Aucune de tes parties détaillées sur ${map}`,'Analyse au moins 3 parties sur cette carte pour voir tes propres spots.',moreAct())};
const ctl=posControl(D,map,cos),Z=posZones(D,map,side,cos,now,ctl),SP=posSpots(D,map,side,cos,now,ctl),TH=posThreats(D,map,side,'moi');
const sure=(a,b)=>(a.n<POS_LOW)-(b.n<POS_LOW)||b.sh-a.sh;
const show=SP.filter(s=>s.setup&&s.verdict[1]!=='bad').sort(sure).slice(0,6),bad=SP.filter(s=>s.verdict[1]==='bad').sort(sure).slice(0,3);
if(!show.length&&!bad.length)return{empty:stateHtml(ico('tactique'),'Pas encore assez de duels',`${nMe} partie${nMe>1?'s':''} sur ${map}, mais pas assez de duels avec une position exacte en ${SIDE_FR[side]}. Analyse au moins 3 parties sur cette carte.`,moreAct())};
const ref=z=>{const v=M&&M.z[z]?M.z[z][side]:null;return v&&v[0]+v[1]>=30?v[0]/(v[0]+v[1]):null;};
const spot=(s,i,isBad)=>({k:(isBad?'w':'s')+i,kind:kindOf(s),low:s.n<POS_LOW,num:isBad?'':String(i+1),x:s.x,y:s.y,z:s.z,rate:s.sh,avg:Z.pM,nTxt:`${s.k}-${s.d} en duels`,
sub:isBad?(s.kc?`tes morts viennent de ${s.kc.z} (${s.kc.n})`:'tu y perds tes duels'):angTxt(s)==='—'?'angle pas encore connu':`regarde ${angTxt(s)}`,tip:`${s.z} : ${pct(s.sh)} de duels gagnés (${s.k}-${s.d}, brut ${pct(s.raw)})`});
const spots=[...show.map((s,i)=>spot(s,i)),...bad.map((s,i)=>spot(s,i,true))];
const foes=TH.slice(0,5).map((t,i)=>({k:'t'+i,kind:'foe',x:t.x,y:t.y,z:coZone(cos,t.x,t.y),size:t.n*4,val:String(t.n),nTxt:'fois',low:t.n<3,sub:'l\'adversaire t\'a tué d\'ici avant le plant',tip:`D'où on te tue : ${coZone(cos,t.x,t.y)} (${t.n} fois)`}));
const b=show.find(s=>s.verdict[1]==='ok'&&s.n>=POS_LOW),gap=posGap(Z.list),all=M?(atlasSpots(M,side,cos)[0]||{}).p0:null;
const pp=Z.list.filter(z=>z.kp+z.dp>=4&&(side!=='D'||z.ctl.kind!=='atk')).map(z=>Object.assign({},z,{pr:(z.kp+1)/(z.kp+z.dp+2)})).sort((x,y)=>y.pr-x.pr)[0];
const verdict=b?{cls:'ok',h:`Ton spot : ${b.z}, ${angTxt(b)}`,p:'Ton spot n° 1 : celui où tu gagnes le plus de duels (taux lissé, les parties récentes comptent plus).'}
:gap?{cls:'foe',h:`Joue plus ${gap.hi.z} que ${gap.lo.z}`,p:`Tu y gagnes ${pct(gap.hi.raw)} de tes duels (${gap.hi.k}-${gap.hi.d}) contre ${pct(gap.lo.raw)} (${gap.lo.k}-${gap.lo.d}).`}
:{cls:'neutral',h:'Pas encore de spot sûr',p:'Tes spots ont encore trop peu de duels pour conclure. L\'analyse se met à jour toute seule après chaque partie.'};
const mb=(n,v,me)=>`<div class="mbar${me?' me':''}"><span>${n}</span><i><i style="width:${Math.round(v*100)}%"></i></i><b>${pct(v)}</b></div>`;
verdict.facts=[['Duels avant le plant',`<div class="mbars mt8">${mb('Toi',Z.pM,true)}${all!=null?mb('Tous',all):''}</div>`,`${Z.mine.K+Z.mine.D} duels · ${nMe} partie${nMe>1?'s':''}`],
pp&&[side==='D'?'Retake : ta meilleure zone':'Après ton plant',`<b>${esc(pp.z)}</b>`,`${pp.kp}-${pp.dp} en duels après le plant`]].filter(Boolean);
const legend=[...new Set(spots.map(s=>s.kind))].map(k=>[k,{ok:'Ton spot à jouer (n° = liste)',neutral:'Correct',bad:'Tu y perds tes duels'}[k]])
.concat(foes.length?[['foe','D\'où on te tue']]:[],show.some(s=>s.ang)||bad.some(s=>s.kc)?[['arw','Angle à tenir / d\'où on te tue (au survol)']]:[],spots.some(s=>s.low)||foes.some(f=>f.low)?[['low']]:[]);
const L={spots,foes,arrows:[...show.map((s,i)=>s.ang&&{k:'s'+i,x1:s.x,y1:s.y,x2:s.ang.x,y2:s.ang.y,top:s===b,max:90}),...bad.map((s,i)=>s.kc&&{k:'w'+i,x1:s.kc.x,y1:s.kc.y,x2:s.x,y2:s.y,bad:true,dash:true})].filter(Boolean)};
const extra=`<details class="card mt"><summary><b>Détail par zone</b> <span class="muted small">(comparé aux autres joueurs de tes parties et à tous les joueurs collectés, même côté, même endroit)</span></summary>${zoneTable(Z.list,ref)}
    ${side==='D'?'<p class="note">En défense, les zones intenables avant l\'ouverture des barrières sont grisées (« Hors setup » : push ou fin de round).</p>':''}</details>`;
return{verdict,L,legend,extra,list:listHtml(spots,foes,[],'Tes spots','D\'où on te tue',`${nMe} partie${nMe>1?'s':''} détaillée${nMe>1?'s':''} sur ${esc(map)}, ${Z.mine.n} rounds en ${SIDE_FR[side]}. Une partie d'il y a 45 jours compte moitié moins. ${moreBtn()}`)};
}
function zoneTable(Z,ref){
if(!Z.length)return empty('Pas encore assez de données sur cette carte et ce côté.');
return`<div class="tbl"><table class="small"><thead><tr><th>Zone</th><th>Type</th><th>Duels avant plant</th><th>Gagnés</th><th>Tes lobbys ici</th><th>Tous ici</th><th>Ouvertures</th><th>Rounds gagnés présent</th><th>Après plant</th><th>Verdict</th><th>Fiabilité</th></tr></thead><tbody>
    ${Z.map(z=>`<tr class="${z.setup?'':'off'}"><td><b>${esc(z.z)}</b></td><td>${KIND_FR[z.ctl.kind]||''}</td><td>${z.k}-${z.d}</td><td>${pct(z.raw)} <small class="muted">(lissé ${pct(z.duel)})</small></td><td>${z.oth[0]?`${pct(z.oth[1]/z.oth[0])} <small class="muted">(${z.oth[0]})</small>`:'—'}</td><td>${ref&&ref(z.z)!=null?pct(ref(z.z)):'—'}</td><td>${z.fk}-${z.fd}</td><td>${z.n?`${z.w}/${z.n}`:'—'}</td><td>${z.kp}-${z.dp}</td><td>${z.verdict[0]?`<span class="pill ${z.verdict[1]}">${z.verdict[0]}</span>`:''}</td><td><span class="pill ${z.rel[1]}">${z.rel[0]}</span></td></tr>`).join('')}</tbody></table></div>`;
}
function posOverview(D,maps,now){
return`<div class="ovw">${maps.slice(0,10).map(m=>{const cos=cosOf(m.map),ctl=posControl(D,m.map,cos);
const best=side=>{const z=posZones(D,m.map,side,cos,now,ctl).list.filter(x=>x.setup&&x.ev>=4)[0];return z?`<b>${esc(z.z)}</b> <small class="muted">${z.k}-${z.d}</small>`:'<span class="muted">—</span>';};
return`<button type="button" class="ovw-i" data-act="posgo:${esc(m.map)}" style="--mbg:url('${IMG.map(m.map,'listviewicon')}')"><span class="ovw-n">${esc(m.map)} <small>${m.n} p.</small></span><span><small class="muted">Attaque</small> ${best('A')}</span><span><small class="muted">Défense</small> ${best('D')}</span></button>`;}).join('')}</div>`;
}
function siteGeo(map,cos,ctl,S,path){
const sa=coSpawn(cos,true),sd=coSpawn(cos,false),dist=(c,p)=>p?Math.hypot(c[2]-p[2],c[3]-p[3]):0;
const sCos=cos.filter(c=>c[0]===S),site=sCos.find(c=>c[1]==='Site')||sCos[0];if(!site)return null;
const atkZ=sCos.filter(c=>c!==site&&((ctl[coLabel(c)]||{}).kind==='atk'||/Main|Lobby|Long/i.test(c[1])));
const used=tallyZ((path||[]).filter(z=>coSite(cos,z)===S)).map(([z])=>coFind(cos,z)).filter(c=>c&&atkZ.includes(c));
const main=used[0]||atkZ.sort((a,b)=>dist(a,site)-dist(b,site))[0]||sCos.filter(c=>c!==site).sort((a,b)=>dist(a,sa)-dist(b,sa))[0]||site;
const entry={x:Math.round(site[2]+(main[2]-site[2])*.45),y:Math.round(site[3]+(main[3]-site[3])*.45)};
const back=sCos.filter(c=>c!==site&&c!==main&&(ctl[coLabel(c)]||{}).kind!=='atk').sort((a,b)=>dist(a,sd)-dist(b,sd));
return{S,site,main,entry,back,sa,sd};
}
function planAtk(I,map,cos,ag,D,now){
const A=I.atk,sites=coSites(cos),ctl=posControl(D,map,cos),heldBy=s=>A.hold.filter(z=>coSite(cos,z)===s).length;
const st=sites.map(s=>{const x=A.sites[s]||{n:0,w:0,cn:0,cw:0,pl:0,tw:[],loc:[],post:[]};return{s,n:x.cn,w:x.cw,lo:wilson(x.w,x.n)[0],x};});
let pick=st.filter(s=>s.n>=3).sort((a,b)=>b.lo-a.lo)[0],why;
if(pick)why=`Site ${pick.s} : ${pick.w} rounds gagnés sur ${pick.n} quand ton équipe l'attaque. C'est le meilleur résultat en tenant compte du nombre de rounds (les rounds récents et achetés comptent plus).`;
else{pick=st.slice().sort((a,b)=>heldBy(a.s)-heldBy(b.s))[0]||{s:sites[0]||'A',n:0,w:0,x:{tw:[],loc:[],post:[]}};why=A.hold.length?`Pas encore assez de rounds par site : site ${pick.s}, le moins tenu par les défenseurs de tes parties au premier contact.`:`Pas encore de données sur cette carte : site ${pick.s} pour commencer (à tester).`;}
const G=siteGeo(map,cos,ctl,pick.s,I.def.path);if(!G)return null;
const inS=z=>[pick.s,'Mid'].includes(coSite(cos,z));
const seen=new Set(),uniq=t=>!seen.has(t.z)&&seen.add(t.z);
let smokes=posThreats(D,map,'A','equipe',3).map(t=>Object.assign(t,{z:coZone(cos,t.x,t.y)})).filter(t=>inS(t.z)&&t.z!==coLabel(G.main)).filter(uniq).slice(0,2);const nk=smokes.length;
if(smokes.length<2)smokes=smokes.concat(tallyZ(A.hold.filter(z=>inS(z)&&z!==coLabel(G.site)&&z!==coLabel(G.main)&&!seen.has(z))).slice(0,2-smokes.length).map(([z,n])=>{const p=coXY(map,z);seen.add(z);return p?Object.assign(p,{z,n}):null;}).filter(Boolean));
let smokeSrc=!nk?'holds':nk<smokes.length?'mix':'kills';
if(!smokes.length){smokeSrc='regle';smokes=G.back.slice(0,2).map(c=>({x:c[2],y:c[3],z:coLabel(c),n:0}));}
const loc=pick.x.loc.length?{x:Math.round(pick.x.loc.reduce((s,p)=>s+p[0],0)/pick.x.loc.length),y:Math.round(pick.x.loc.reduce((s,p)=>s+p[1],0)/pick.x.loc.length)}:{x:G.site[2],y:G.site[3]};
const post=tallyZ(pick.x.post).slice(0,3),tmed=pick.x.tw.length?pick.x.tw.slice().sort((a,b)=>a-b)[Math.floor(pick.x.tw.length/2)]:null;
const lurk=cos.filter(c=>c[0]==='Mid'&&(ctl[coLabel(c)]||{}).kind!=='def').sort((a,b)=>Math.hypot(a[2]-G.sa[2],a[3]-G.sa[3])-Math.hypot(b[2]-G.sa[2],b[3]-G.sa[3]))[0];
const holds=tallyZ(A.hold.filter(z=>inS(z))),danger=tallyZ(A.fd.filter(z=>inS(z))).slice(0,2),fdBy=tallyZ(A.fdBy.filter(z=>inS(z))).slice(0,2);
const R=ROLE_OF[ag]||'',sm=abil(ag,'smoke'),fl=abil(ag,'flash'),rc=abil(ag,'recon'),ml=abil(ag,'molly'),wl=abil(ag,'wall'),tr=abil(ag,'trap'),mv=abil(ag,'ab');
const sTxt=smokes.map(t=>t.z).join(' + '),siteL=coLabel(G.site),mainL=coLabel(G.main);
const steps=[
['Départ',`Ton équipe joue le site ${pick.s}. ${R==='Duelist'?`Place-toi en tête vers ${mainL}.`:R==='Initiator'?`Reste juste derrière ton duelliste vers ${mainL}.`:R==='Controller'?`Reste entre le spawn et ${mainL} : tes smokes doivent atteindre le site.`:R==='Sentinel'?`Couvre le flanc${lurk?` depuis ${coLabel(lurk)}`:''}${tr?` et pose ${abN(tr)} derrière ton équipe`:''} : de l'info, pas de duel seul.`:`Va vers ${mainL} avec ton équipe.`}${holds.length?` Les défenseurs de tes parties sont vus le plus souvent à ${top3(holds)}.`:''}`],
['Exécution',`${tmed?`Vos plants gagnants en ${pick.s} arrivent vers ${Math.round(tmed)} s. `:''}${R==='Controller'&&sm?`Toi : ${abN(sm)} sur ${sTxt}`:`Smokes sur ${sTxt} (ton contrôleur)`}${smokeSrc==='kills'?' : les positions exactes d\'où les défenseurs tuent ton équipe.':smokeSrc==='mix'?' : d\'où les défenseurs tuent ton équipe et où ils sont vus le plus souvent.':smokeSrc==='holds'?' : là où les défenseurs sont vus le plus souvent.':' (règle générale : couper la vue depuis le spawn défense).'} ${R==='Initiator'&&(fl||rc)?`Toi : ${abN(fl||rc)} sur ${siteL} au même moment.`:fl&&R!=='Duelist'?`${abN(fl)} sur ${siteL} au même moment.`:''}`],
['Entrée',`${R==='Duelist'?`Tu entres en premier${mv?` (${abN(mv)})`:''}${fl||sm?`, avec ${abN(fl||sm)} pour ton entrée`:''} ; un coéquipier te suit dans la seconde.`:'Entre en 2e, juste derrière ton duelliste : venge-le s\'il tombe.'}${danger.length?` Attention : ton équipe meurt souvent en premier à ${top3(danger)}${fdBy.length?`, tuée depuis ${fdBy.map(x=>x[0]).join(', ')}`:''} : jamais sans utilitaire là-bas.`:''} Le spike est posé par le joueur le mieux couvert.`],
['Après le plant',`${post.length?`Les positions qui gagnent après vos plants : ${top3(post)}.`:`Croisez-vous autour du spike, depuis ${siteL} et ${mainL}.`} ${ml?`Garde ${abN(ml)} pour empêcher le désamorçage.`:wl?`Garde ${abN(wl)} pour couper le désamorçage.`:'Joue le temps, pas de re-peek inutile.'}`]];
const pt=c=>({x:c[2],y:c[3]}),ut=fl?'flash':'info';
const draw={
arrows:[{k:'p0',cls:'me',show:true,x1:G.sa[2],y1:G.sa[3],x2:G.main[2],y2:G.main[3],tip:`Départ : ton équipe va vers ${mainL}`},
...(lurk?[{k:'p0',cls:'me',dash:true,show:true,x1:G.sa[2],y1:G.sa[3],x2:lurk[2],y2:lurk[3],tip:`Flanc : ${coLabel(lurk)}`}]:[]),
{k:'p2',cls:'me',thick:true,show:true,x1:G.main[2],y1:G.main[3],x2:loc.x,y2:loc.y,tip:`Entrée sur le site ${pick.s}`}],
utils:[...smokes.map(t=>({k:'p1',kind:'smoke',x:t.x,y:t.y,tip:`Smoke : ${t.z}${R==='Controller'&&sm?` (toi : ${abN(sm)})`:''}`})),
{k:'p1',kind:ut,...pt(G.site),tip:`${ut==='flash'?'Flash':'Info'} sur ${siteL}${fl||rc?` : ${abN(fl||rc)}`:''}`},{k:'p3',kind:'spike',x:loc.x,y:loc.y,tip:'Spike : point de plant moyen'}],
foes:smokeSrc==='kills'?[]:posThreats(D,map,'A','equipe',3).slice(0,4).map((t,i)=>({k:'p2',x:t.x,y:t.y,size:t.n*4,tip:`D'où les défenseurs tuent ton équipe (${t.n} fois)`})),
spots:post.map(([z,c],i)=>{const p=coXY(map,z);return p&&{k:'p3',kind:'ok',num:String(i+1),x:p.x,y:p.y,tip:`Après le plant : ${z} (${c} fois en position gagnante)`};}).filter(Boolean)};
return{side:'A',S:pick.s,why,sure:pick.n>=3,st,steps,draw,n:A.n,w:A.w,smokes,loc,tmed,holds,danger,ut};
}
function planDef(I,map,cos,ag,D,now){
const Df=I.def,sites=coSites(cos),ctl=posControl(D,map,cos);
const sh=sites.map(s=>{const x=Df.sites[s]||{n:0,w:0,cn:0,cw:0,t:[]};return{s,n:x.n,cn:x.cn,cw:x.cw};}),tot=sh.reduce((a,x)=>a+x.n,0),totN=sh.reduce((a,x)=>a+x.cn,0);
const order=sh.slice().sort((a,b)=>b.n-a.n),top=order[0]||{s:sites[0]||'A'};
const Z=posZones(D,map,'D',cos,now,ctl).list.filter(z=>z.setup&&z.site!=='Spawn'),mine=Z.find(z=>z.verdict[1]==='ok')||Z.filter(z=>z.verdict[1]!=='bad').sort((a,b)=>b.n-a.n)[0];
const myZone=mine?mine.z:`Site ${top.s}`,mySite=mine&&/^[A-C]$/.test(mine.site)?mine.site:top.s;
const spot=posSpots(D,map,'D',cos,now,ctl).find(s=>s.z===myZone&&s.setup&&s.verdict[1]!=='bad'),here=spot||coXY(map,myZone)||{x:0,y:0};
const G=siteGeo(map,cos,ctl,mySite,Df.path),GT=siteGeo(map,cos,ctl,top.s,Df.path);if(!G||!GT)return null;
const R=ROLE_OF[ag]||'',sm=abil(ag,'smoke'),fl=abil(ag,'flash'),rc=abil(ag,'recon'),ml=abil(ag,'molly'),wl=abil(ag,'wall'),tr=abil(ag,'trap');
const entL=`l'entrée de ${mySite} côté ${coLabel(G.main)}`,entT=`l'entrée de ${top.s} côté ${coLabel(GT.main)}`;
const tmed=Df.pt.length?Df.pt.slice().sort((a,b)=>a-b)[Math.floor(Df.pt.length/2)]:null,path=tallyZ(Df.path).slice(0,3),danger=tallyZ(Df.fd).slice(0,2);
const good=tallyZ(Object.values(Df.kills).flat()).slice(0,3);
const setupTxt=R==='Sentinel'?(tr?`${abN(tr)} à ${entL} : ton piège reste près de toi, sur TON site.`:`Couvre ${entL}.`)+(ml?` Garde ${abN(ml)} pour retarder le plant.`:'')
:R==='Controller'?`Garde ${abN(sm||ml||wl)||'ta smoke'} pour le premier contact sur ${entT} : pas au début du round.`
:R==='Initiator'?`${abN(rc||fl)||'Ta capacité d\'info'} au début du round vers ${entT} pour savoir où ils vont.`
:R==='Duelist'?'Prends le premier duel avec ton avantage d\'angle, puis recule : ne pousse pas seul hors du site.':'Tiens ton angle et annonce ce que tu vois.';
const steps=[
['Setup',`Ta position : ${myZone}${spot?` (spot exact : ${spot.k}-${spot.d} en duels, angle ${angTxt(spot)})`:''}. ${tot?`Les attaquants de tes parties vont en ${order.map(x=>`${x.s} ${Math.round(x.n/tot*100)} %`).join(', ')} (${totN} rounds observés).`:'Pas encore assez de rounds de défense observés.'} ${setupTxt}`],
['Premier contact',`${path.length?`Ils se montrent le plus souvent à ${top3(path)}.`:''}${danger.length?` Ton équipe meurt souvent en premier à ${top3(danger)} : joue en retrait ou un angle décalé là-bas.`:''}${good.length?` Positions de ton équipe qui tuent le plus avant le plant : ${top3(good)}.`:''}`||'Annonce le nombre d\'attaquants et la direction.'],
['Rotation',`Dès que 3 attaquants sont vus sur l'autre site, tourne${tmed?` (leurs plants arrivent vers ${Math.round(tmed)} s)`:''}. Jamais sur un seul bruit.`],
['Retake',`Seulement à 3 ou plus${Df.re3[0]?` (à 3 ou plus : ${nA(Df.re3)} gagnés)`:''}, ensemble, avec ${abN(fl||sm||ml)||'flash et smoke'}. À 2 ou moins, sauve ton arme${Df.re2[0]?` (à 2 ou moins : ${nA(Df.re2)} gagnés)`:''}.`]];
const kit=R==='Sentinel'&&tr?[{...G.entry,kind:'trap',label:'piège'}]:R==='Controller'?[{...GT.entry,kind:ml&&!sm?'molly':'smoke',label:sm?'smoke':'molly'}]:R==='Initiator'?[{...GT.entry,kind:'recon',label:'info'}]:[];
const KT={trap:'Piège',molly:'Molly',smoke:'Smoke',recon:'Info'},ab={trap:tr,molly:ml,smoke:sm,recon:rc||fl};
const draw={
utils:[{k:'p0',kind:'me',x:here.x,y:here.y,tip:`Toi : ${myZone}`},...kit.map(m=>({k:'p0',kind:m.kind==='recon'?'info':m.kind,x:m.x,y:m.y,tip:`${KT[m.kind]}${ab[m.kind]?` : ${abN(ab[m.kind])}`:''}`}))],
foes:posThreats(D,map,'D','moi').slice(0,4).map(t=>({k:'p1',x:t.x,y:t.y,size:t.n*4,tip:`D'où on te tue (${t.n} fois)`})),
arrows:[...(spot&&spot.ang?[{k:'p0',show:true,x1:spot.x,y1:spot.y,x2:spot.ang.x,y2:spot.ang.y,max:90,tip:`Angle à tenir : ${spot.ang.z}`}]:[]),
{k:'p1',cls:'foe',dash:true,show:true,x1:GT.main[2],y1:GT.main[3],x2:GT.entry.x,y2:GT.entry.y,tip:`Leur chemin le plus fréquent : ${coLabel(GT.main)}`},
...(mySite!==top.s?[{k:'p2',cls:'me',dash:true,show:true,x1:G.site[2],y1:G.site[3],x2:GT.site[2],y2:GT.site[3],tip:`Rotation vers ${top.s}`}]:[]),
...(G.sd?[{k:'p3',cls:'me',show:true,x1:G.sd[2],y1:G.sd[3],x2:GT.site[2],y2:GT.site[3],tip:`Retake du site ${top.s}`}]:[])]};
return{side:'D',S:mySite,top:top.s,why:totN?`Calculé sur ${totN} rounds de défense : sites attaqués par tes adversaires, tes zones qui gagnent.`:'Pas encore assez de rounds de défense : plan de base, à affiner avec tes prochaines parties.',sure:!!mine&&!!totN,steps,draw,n:Df.n,w:Df.w,myZone,spot,order,tot,tmed};
}
const STRAT_LEG={me:'Toi','arw me':'Ton équipe (chemin, entrée)','arw me dash':'Flanc / rotation','arw foe':'Leur chemin',foe:'D\'où ils tuent',smoke:'Smoke',flash:'Flash',info:'Info / recon',trap:'Piège',molly:'Molly',spike:'Spike (plant moyen)',ok:'Position gagnante après le plant (n°)',arw:'Angle à tenir'};
function tabStrat(){
const w=detWait(3);if(w)return w;
const D=APP.D,P=APP.prof,maps=mapsOfD(D);
if(!maps.length)return stateHtml(ico('tactique'),'Pas encore de partie détaillée sur une carte connue','Analyse au moins 3 parties pour obtenir un plan d\'attaque et de défense.',moreAct());
const S=pickState('strat',maps,'A'),map=S.map,side=S.side,cos=cosOf(map),now=Date.now(),I=stratIntel(D,map,cos,now);
const picks=agentsForMap(P.rows,map),ag=myAgentOn(P.rows,map)||(picks[0]&&picks[0].a)||mainAgent(P.rows)||'';
const plan=side==='A'?planAtk(I,map,cos,ag,D,now):planDef(I,map,cos,ag,D,now);
const head=`<div class="card"><div class="card-h"><h2>Stratégie</h2></div>${mapPicker('strat',maps,map,side)}</div>`;
if(!plan)return head+`<div class="mt">${stateHtml(ico('tactique'),'Zones de cette carte indisponibles','Choisis une autre carte : celle-ci n\'a pas encore ses zones (callouts).')}</div>`;
after(()=>svgDraw($('#stMv'),map,plan.draw));
const rel=n=>n>=40?'bonne':n>=15?'moyenne':n>0?'faible':'règles générales',role=ROLE_OF[ag]?` (${ROLE_FR[ROLE_OF[ag]]})`:'';
const A=side==='A';
const v=A?{cls:plan.sure?'ok':'neutral',h:`Attaque le site ${plan.S}`,p:plan.sure?'Le site où ton équipe gagne le plus de rounds, en tenant compte du nombre de rounds (récents et achetés comptent plus).':plan.why}
:{cls:plan.sure?'ok':'neutral',h:`Défends depuis ${plan.myZone}`,p:plan.sure?'Ta meilleure zone tenable avant l\'ouverture des barrières, d\'après tes duels.':plan.why};
v.img=agImg(ag,'ag');v.acts=`<button class="btn" data-act="brief">Briefing avant la partie</button>`;
v.facts=[['Fiabilité du plan',`<b class="${plan.n<15?'low':''}">${rel(plan.n)}</b>`,`${plan.n} rounds ${A?'d\'attaque':'de défense'} sur ${esc(map)} · ${plan.w} gagnés`]];
const kinds=new Set([...(plan.draw.utils||[]).map(u=>u.kind),...(plan.draw.arrows||[]).map(a=>a.cls?`arw ${a.cls}${a.dash&&a.cls==='me'?' dash':''}`:'arw'),...(plan.draw.foes||[]).length?['foe']:[],...(plan.draw.spots||[]).length?['ok']:[]]);
const order=['me','arw me','arw me dash','arw','arw foe','foe','smoke','flash','info','trap','molly','spike','ok'];
return`${head}${verdictHtml(v,`${esc(map)} · ${SIDE_FR[side]} · plan pour ${esc(ag||'ton agent')}${esc(role)}`)}
  <div class="grid g2 mt" data-link="strat">
    <div class="card">${svgMapHtml('stMv',map,`Plan ${SIDE_FR[side]} sur ${map}`)}${legendHtml(order.filter(k=>kinds.has(k)).map(k=>[k,(A?{}:{'arw me':'Retake (ton équipe)','arw me dash':'Rotation'})[k]||STRAT_LEG[k]]))}</div>
    <div class="card"><h3 style="margin-top:0">Le plan en 4 temps</h3><ol class="steps">${plan.steps.map(([t,x],i)=>`<li data-k="p${i}" tabindex="0"><b>${esc(t)}</b><p>${esc(x)}</p></li>`).join('')}</ol>
      <p class="note">Survole ou touche une étape : ses éléments s'allument sur la carte (et inversement).</p></div>
  </div>
  <div class="grid g2 mt">${A?atkIntel(plan):defIntel(plan,I)}${agentCard(picks,map,ag)}</div>
  ${ecoCard(ecoStats(D),D.length)}
  <p class="note">Tout vient de tes parties détaillées : tes équipes et tes adversaires, donc des joueurs de ton niveau. Aucun joueur n'est identifié et rien n'est utilisé pendant une partie en cours. ${moreBtn()}</p>`;
}
function atkIntel(p){
return`<div class="card"><h3 style="margin-top:0">Détail par site</h3><ul class="plist">${p.st.map(s=>statRow(`Site ${esc(s.s)}`,s.w,s.n,.5,`${s.w}/${s.n} rounds gagnés · ${s.x.pl||0} plant${(s.x.pl||0)>1?'s':''}`,s.s===p.S)).join('')}</ul>
    <p class="note">Rounds où ton équipe attaque ce site (tous achats). Trait = 50 %. Les zones où ton équipe meurt en premier sont dans l'étape « Entrée ».</p></div>`;
}
function defIntel(p,I){
const Df=I.def;
return`<div class="card"><h3 style="margin-top:0">Ce qu'ils attaquent</h3>${p.tot?`<ul class="plist">${p.order.map(x=>`<li class="srow${x.s===p.top?' me':''}"><div><b>Site ${esc(x.s)}</b><small>${x.cn} rounds · ${x.cw} gagnés par vous</small></div><div class="val"><b>${pct(x.n/p.tot)}</b>${barHtml(x.n/p.tot,null,'')}</div></li>`).join('')}</ul>`:empty('Pas encore assez de rounds de défense : joue ou analyse quelques parties de plus sur cette carte.')}
    <h3>Retakes</h3><ul class="plist">${statRow('À 3 ou plus',Df.re3[1],Df.re3[0],.5,`${nA(Df.re3)} gagnés`)}${statRow('À 2 ou moins',Df.re2[1],Df.re2[0],.5,`${nA(Df.re2)} gagnés : sauve ton arme`)}</ul></div>`;
}
function agentCard(picks,map,ag){
return`<div class="card"><h3 style="margin-top:0">Quel agent sur ${esc(map)} ?</h3>${picks.length?picks.slice(0,4).map((x,i)=>`<div class="mini">${agImg(x.a)}<div><b>${esc(x.a)}</b>${i===0&&x.sure&&x.n>=3?' <span class="pill ok">conseillé</span>':''}${x.a===ag?' <span class="pill prem">ton choix</span>':''}<small>${nPart(x.n)} ici (${x.w} V) · ${x.N} au total · note ${pct(x.s)}</small></div></div>`).join(''):empty('Pas encore assez de parties.')}
    <p class="note">Note = taux de victoire lissé : sur cette carte, tiré vers ton taux avec l'agent, lui-même tiré vers ton taux global. Un agent joué 2 fois ne passe jamais devant un agent que tu maîtrises.</p></div>`;
}
function ecoCard(E,n){
const tips=[];
if(E.force[0]>=8&&trust(E.force[1],E.force[0],.35)==='bad')tips.push(['foe',`Tes force-buy gagnent rarement (${nA(E.force)}) : préfère une vraie éco, puis un achat complet au round suivant.`]);
if(E.anti[0]>=8&&trust(E.anti[1],E.anti[0],.75)==='bad')tips.push(['foe',`Contre leur éco, ton équipe perd trop de rounds (${nA(E.anti)}) : jouez groupés, pas de duel seul de loin contre des pompes et des SMG.`]);
if(E.bonus[0]>=5&&trust(E.bonus[1],E.bonus[0],.6)==='bad')tips.push(['foe',`Après un pistol gagné, vous perdez souvent le round suivant (${nA(E.bonus)}) : gardez vos armes, jouez ensemble, pas de push seul.`]);
if(E.eco[0]>=10&&trust(E.eco[1],E.eco[0],.1)==='ok')tips.push(['ok',`Tes rounds d'éco gagnent plus souvent que la moyenne (${nA(E.eco)}) : jouer groupé à courte distance te réussit.`]);
const line=(t,a,ref=.5)=>statRow(t,a[1],a[0],ref,`${nA(a)} rounds gagnés`);
return`<div class="card mt"><div class="card-h"><h3 style="margin:0">Économie</h3><span class="muted small">Toutes cartes · ${n} parties détaillées</span></div><div class="grid g2">
    <ul class="plist">${line('Pistol en attaque',E.pis.A)}${line('Pistol en défense',E.pis.D)}${line('Round d\'après un pistol gagné',E.bonus)}${line('Round d\'après un pistol perdu',E.afterLoss)}</ul>
    <ul class="plist">${line('Ton équipe en éco',E.eco,.2)}${line('Force-buy',E.force,.35)}${line('Full contre full',E.fullFull)}${line('Full contre leur éco',E.anti,.75)}</ul></div>
    ${tips.length?tips.map(([c,t])=>`<p class="sem ${c} mt8">${esc(t)}</p>`).join(''):'<p class="note">Rien d\'anormal à coup sûr dans ton économie.</p>'}
    <p class="note">Trait de chaque barre = le repère (éco ≈ 20 %, force ≈ 35 %, contre leur éco ≈ 75 %, sinon 50 %). Vert ou rouge seulement quand l'écart au repère est sûr.</p></div>`;
}
function briefOpen(){
const D=APP.D||[],P=APP.prof,S=APP.strat;if(!S)return;
const map=S.map,cos=cosOf(map),now=Date.now(),I=stratIntel(D,map,cos,now),picks=agentsForMap(P.rows,map),ag=myAgentOn(P.rows,map)||(picks[0]&&picks[0].a)||mainAgent(P.rows)||'';
const A=planAtk(I,map,cos,ag,D,now),Df=planDef(I,map,cos,ag,D,now);if(!A||!Df)return;
const E=ecoStats(D),st=nthStats(sessionsOf(P.rows).map(s=>s.map(r=>r.res))),lim=nightLimit(st);
const best=side=>posSpots(D,map,side,cos,now).filter(s=>s.setup&&s.verdict[1]==='ok').slice(0,2);
const L=[`AVANT TA PARTIE SUR ${map.toUpperCase()}`,`Agent : ${ag||'—'}${picks[0]&&picks[0].a!==ag&&picks[0].sure&&picks[0].n>=3?` (meilleure note ici : ${picks[0].a})`:''}`,'',
`ATTAQUE : site ${A.S}`,...A.steps.map(([t,x])=>`- ${t} : ${x}`),'',`DÉFENSE : ${Df.myZone}`,...Df.steps.map(([t,x])=>`- ${t} : ${x}`),'',
`TES SPOTS : attaque ${best('A').map(s=>`${s.z} (${s.k}-${s.d})`).join(', ')||'—'} ; défense ${best('D').map(s=>`${s.z} (${s.k}-${s.d})`).join(', ')||'—'}`,
`ÉCONOMIE : pistol attaque ${nA(E.pis.A)}, défense ${nA(E.pis.D)} ; force-buy ${nA(E.force)}`,lim?`TA LIMITE : ${lim} parties par session, pas plus.`:'TA LIMITE : arrête-toi après 3 défaites d\'affilée.'];
APP.briefTxt=L.join('\n');
dlgOpen(`<h2>Briefing : ${esc(map)}</h2><p class="muted small">À lire 1 minute avant de lancer. Seulement tes propres chiffres.</p>
    <div class="brief">${L.slice(1).map(l=>{if(!l)return'';if(/^(ATTAQUE|DÉFENSE)/.test(l))return`<h3>${esc(l)}</h3>`;const m=/^([A-ZÉa-zé ]{4,20}) : (.*)$/.exec(l);return m&&!l.startsWith('-')?`<p><b>${esc(m[1])}</b> : ${esc(m[2])}</p>`:`<p>${esc(l)}</p>`;}).join('')}</div>
    <div class="row mt"><button class="btn" data-act="briefCopy">Copier le texte</button><button class="btn ghost" data-act="dlgClose">Fermer</button></div>`);
}
ACT.possrc=k=>{if(APP.pos&&(k==='tous'||k==='moi')){APP.pos.src=k;renderTab();}};
;
"use strict";
const fillLv=(s,L)=>String(s||'').replace(/\{(\w+)\}/g,(m,k)=>L[k]!=null?L[k]:m);
const trLogs=()=>{const a=ST.get('tlog',[]);return Array.isArray(a)?a.filter(x=>x&&typeof x.d==='string'):[];};
const rxList=()=>{const a=ST.get('rx',[]);return Array.isArray(a)?a.filter(x=>x&&x.ms>0):[];};
const evDate=ts=>{const d=new Date(ts-6*36e5);return new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,10);};
function trCtx(){
const P=APP.prof,D=APP.D||[],lv=trLevel(P.mmr.tier),L=TR_LEVELS[lv],V=D.length>=3?coachData():null;
const items=V?(V.rk?V.C.items:coachPub(coachStats())):[],next=V&&V.rk?V.C.next||[]:[];
const keys=[...items.filter(x=>x.lvl>=2).map(x=>x.k),...next.filter(x=>x.below&&x.sure).map(x=>'up_'+x.k)],focus=trFocus(keys);
return{P,D,lv,L,items,next,up:V&&V.rk?V.C.up:0,keys,focus,role:ROLE_OF[mainAgent(P.rows)]||'',tool:ST.get('trTool','range'),min:ST.get('trMin',20),ctx:ST.get('trCtx','echauffement')};
}
function playHtml(C){
const PL=trPlaylists(C.focus,C.lv,C.ctx,C.tool,TR_PLAYLISTS);if(!PL.length)return'';
return`<div class="card"><div class="card-h"><h2>Playlists prêtes à lancer</h2><span class="pill">${C.tool==='kovaaks'?'KovaaK\'s':'Aim Lab (gratuit)'}</span></div>
    <p class="muted small">Pour ${C.ctx==='echauffement'?'ton échauffement':'ta séance de progression'}, réglées sur ${C.focus.length?'tes points faibles':'ton niveau'}. Dans l'appli, colle le nom dans la recherche.</p>
    ${PL.map(p=>`<div class="coach"><span class="lvl lvl1">${p.use==='test'?'Test':p.min+' min'}</span><div><b>${esc(p.n)}</b> <small class="muted">· ${esc(p.by)}</small>
      <p class="small">${esc(p.why)}</p><button type="button" class="btn ghost sm" data-act="plCopy:${esc(p.id)}">Copier le nom</button></div></div>`).join('')}
    <p class="note">Noms vérifiés le 12/10/2026 (aimlabs.com ; KovaaK's : guide communautaire dodge.gg 2026). Si un nom a changé, cherche un seul mot du nom.</p></div>`;
}
function upHtml(C){
if(!C.next.length)return'';const upN=RANK_FR[C.up]||'';
const pill=x=>!x.below?'<span class="pill ok">au niveau</span>':x.sure?'<span class="pill bad">en dessous</span>':'<span class="pill warn">un peu en dessous</span>';
return`<div class="card"><h2>Ce que ton entraînement doit faire monter</h2><p class="muted small">Les chiffres qui séparent vraiment les rangs (10 790 profils collectés) : toi contre les joueurs ${esc(upN)} de ton rôle.</p>
    ${C.next.map(x=>{const m=Math.max(x.me||0,x.up||0)||1,dx=metX(x,[x.up]);return`<div class="cmpx"><p class="small"><b>${esc(x.t)}</b> ${pill(x)}</p><div class="mbars">${mbarH('Toi',x.me,m,metTxt(x.k,x.me,dx),true)}${mbarH(upN,x.up,m,metTxt(x.k,x.up,dx))}</div></div>`;}).join('')}
    <p class="note">La routine travaille ce qui est en dessous à coup sûr. Vérifie l'effet sur tes 20 prochaines parties.</p></div>`;
}
ACT.plCopy=id=>{const p=TR_PLAYLISTS.find(x=>x.id===id);if(p)copyText(p.n,'Nom copié : colle-le dans la recherche de l\'appli');};
function tabTrain(){
const C=trCtx(),R=trRoutine(C.focus,C.min,C.ctx,TR_DRILLS,C.role),logs=trLogs(),tot=R.reduce((s,b)=>s+b.min,0),Sv=suiviStats(logs);
const chip=(k,v,t,cur)=>`<button type="button" class="chip${cur===v?' on':''}" data-act="tr:${k}:${v}" aria-pressed="${cur===v}">${t}</button>`;
const blk=(b,i)=>{const d=TR_DRILLS[b.k];return`<li class="drill"><div class="drill-h"><b>${i+1}. ${esc(d.n)}</b><span class="pill">${b.min} min</span></div>
    <p>${esc(fillLv(d.drill,C.L))}</p><p class="small"><b>Où :</b> ${esc(fillLv(d.set[C.tool]||d.set.all||d.set.range,C.L))}</p>
    <p class="small muted"><b>Pourquoi :</b> ${esc(d.why)} · <b>Objectif :</b> ${esc(fillLv(d.goal,C.L))}</p></li>`;};
const ef=Sv.ef&&Sv.ef.nb>=5&&Sv.ef.na>=5?Sv.ef:null;
const v={h:`Routine du jour : ${tot} min`,p:`Réglée sur ton rang (${tierFr(C.P.mmr.tier)})${C.focus.length?' et sur tes points faibles sûrs.':C.D.length>=3?'. Aucun point faible sûr : routine équilibrée.':'. Joue quelques parties pour une routine sur mesure.'}`,
facts:[['Série',`<b>${Sv.streak}<small> jour${Sv.streak>1?'s':''}</small></b>`,'d\'entraînement d\'affilée'],['Cette semaine',`<b>${Sv.wkMin}<small> min</small></b>`,`${nPart(Sv.wkN,'séance')} · ${logs.length} au total`],
['Effet mesuré',`<b class="${ef?(ef.mb>=ef.ma?'up':'down'):''}">${ef?`${sg((ef.mb-ef.ma)*100,0)} %`:'—'}</b>`,ef?`d'ACS les soirs entraînés${Math.abs(ef.z)>=1.64?' (sûr)':' (pas encore sûr)'}`:'il faut 5 parties de chaque côté']],
acts:`<button class="btn" data-act="tmStart">▶ Lancer le minuteur (${tot} min)</button><button class="btn ghost" data-act="tmLog">J'ai fait la séance sans minuteur</button>`};
return`${verdictHtml(v,`Entraînement · niveau ${esc(C.L.n)}`,'')}
  <div class="grid g2 mt">
  <div class="card"><h2>Ta routine</h2>
    <div class="chips">${chip('ctx','echauffement','Avant la ranked',C.ctx)}${chip('ctx','progression','Séance de progression',C.ctx)}</div>
    <div class="row mt8"><div class="chips">${[10,20,30,45].map(m=>chip('min',m,m+' min',C.min)).join('')}</div><div class="chips">${Object.keys(TOOL_FR).map(t=>chip('tool',t,TOOL_FR[t],C.tool)).join('')}</div></div>
    <ol class="drills">${R.map(blk).join('')}</ol>
    <p class="note">Le minuteur reste visible en bas de l'écran, même si tu changes d'onglet. Un bip à chaque changement d'exercice.</p></div>
  <div class="card"><h2>Tes priorités</h2>${C.items.length?C.items.slice(0,4).map(x=>`<div class="coach"><span class="lvl lvl${x.lvl}">${x.lvl===3?'Priorité':x.lvl===2?'Important':'Conseil'}</span><div><b>${esc(x.t)}</b><p>${x.why?esc(x.why):x.cost!=null?`Te coûte ${fmt(x.cost,1)} round par partie${x.sure?'':' (à confirmer)'}.`:esc(x.fix||'')}</p></div></div>`).join('')
:`<p class="muted">${C.D.length>=3?'':'Il faut au moins 3 parties détaillées pour trouver tes points faibles (ouvre l\'onglet Visée ou Coach une fois).'}</p>`}
    <h3>Test de réflexes</h3><button type="button" id="rxBox" class="rx" aria-live="polite">Clique ici pour commencer (5 essais)</button><div id="rxOut">${rxHtml()}</div>
    <p class="note">Pour travailler la réaction : Aim Lab « Detection » (à l'œil) et « Audio Detection » (au son des pas).</p></div>
  </div>
  <div class="grid g2 mt">${playHtml(C)}${upHtml(C)}</div>
  <div class="grid g2 mt">
    <div class="card"><h2>Ta semaine</h2>${weekHtml(C)}</div>
    <div class="card"><h2>Sensibilité</h2>${sensHtml(C)}</div>
  </div>
  <div class="card mt"><h2>Tes dernières séances</h2>${suiviHtml(logs)}</div>`;
}
function weekHtml(C){
const rows=C.P.rows,play=habitDays(rows.map(r=>evDate(r.ts)),2),W=trWeek(C.focus,play,TR_DRILLS),td=(new Date().getDay()+6)%7;
return`<div class="week">${W.map(([d,type,ks,min,rk])=>`<div class="wd${d===td?' today':''}${type==='repos'?' rest':''}"><span class="wd-j">${esc(JOURS[d].slice(0,3))}</span><div><b>${esc(WEEK_FR[type])}</b>${rk?' <span class="pill">soir de jeu</span>':''}
    <small>${type==='revue'?'Revois 3 duels perdus en replay : d\'où venait l\'adversaire, où était ton viseur ?':ks.map(k=>esc(TR_DRILLS[k].n)).join(' + ')||'Le cerveau consolide ce qui a été travaillé'}</small></div><span class="wd-m">${min?min+' min':'—'}</span></div>`).join('')}</div>
    <p class="note">${play.length?`Tes soirs de jeu habituels : ${esc(frList(play.map(i=>JOURS[i])))}.`:'Pas encore de soirs de jeu habituels détectés.'} 3 à 4 séances courtes valent mieux qu'une longue.</p>`;
}
function sensHtml(C){
const S=ST.get('sens',{dpi:800,sens:.4}),cm=S.dpi>0&&S.sens>0?2.54*360/(S.dpi*S.sens*.07):null,ds=duelStats(C.D,meIdx),hint=sensHint(ds,cm),psa=ST.get('psa',null);
const pos=cm?Math.max(0,Math.min(100,(cm-15)/(90-15)*100)):null,dir=hint.dir>0?'un peu plus haute (+5 à 10 %)':hint.dir<0?'un peu plus basse (−5 à 10 %)':'';
const psaBox=!psa?`<button class="btn ghost" data-act="psa:go">Test guidé (7 manches, 15 min)</button>`
:psa.step>=7?`<div class="infobox">Résultat du test : <b>${fmt((psa.pair[0]+psa.pair[1])/2,3)}</b> (tu étais à ${fmt(psa.base,3)}). <button class="btn sm" data-act="psa:keep">La garder</button> <button class="btn ghost sm" data-act="psa:stop">Fermer</button></div>`
:`<div class="infobox"><b>Manche ${psa.step+1} sur 7</b> : joue 1 minute de Range ou de deathmatch avec <b>A = ${fmt(psa.pair[0],3)}</b>, puis 1 minute avec <b>B = ${fmt(psa.pair[1],3)}</b>. Laquelle était la plus précise ?
      <div class="row mt8"><button class="btn sm" data-act="psa:0">A (${fmt(psa.pair[0],3)})</button><button class="btn sm" data-act="psa:1">B (${fmt(psa.pair[1],3)})</button><button class="btn ghost sm" data-act="psa:stop">Arrêter</button></div></div>`;
return`<div class="row"><div><label class="lbl" for="tDpi">DPI de ta souris</label><input id="tDpi" type="number" min="100" max="32000" step="50" value="${esc(S.dpi)}" data-sens="dpi"></div><div><label class="lbl" for="tSens">Sensibilité en jeu</label><input id="tSens" type="number" min="0.01" max="10" step="0.001" value="${esc(S.sens)}" data-sens="sens"></div></div>
    <p class="mt8">Un tour complet = <b>${cm?fmt(cm,1)+' cm':'—'}</b> de tapis${cm?` · eDPI ${Math.round(S.dpi*S.sens)}`:''}</p>
    ${pos!=null?`<div class="gauge" title="De 15 cm (très rapide) à 90 cm (très lent)"><i style="left:${pos}%"></i><span>rapide</span><span>la plupart des joueurs : 30 à 75 cm</span><span>lent</span></div>`:''}
    <div class="infobox">${dir?`Piste : essaie une sensibilité <b>${dir}</b> pendant 8 parties (${hint.why==='proche'?'tu perds tes duels proches':hint.why==='loin'?'tu perds tes duels de loin':'ta sensibilité est hors de la zone habituelle'}).`:C.D.length>=3?'Rien ne montre à coup sûr qu\'il faut changer ta sensibilité : garde-la.':'Avec quelques parties détaillées, tes duels diront si ta sensibilité te coûte des duels.'}</div>
    <div class="mt8">${psaBox}</div>
    <p class="note">Test guidé : on compare 2 sensibilités, la moins bonne est remplacée par le milieu des deux. Après 7 manches, il reste ta sensibilité idéale.</p>`;
}
function rxHtml(){
const L=rxList(),s=rxSum(L.map(x=>({ms:x.ms})));
if(!s)return'<p class="note">30 secondes avant de jouer : nettement plus lent que d\'habitude = fatigue probable, session courte.</p>';
return`<p class="small">Dernier : <b>${s.last} ms</b>${s.usual?` · d'habitude ${s.usual} ms`:''} · record ${s.best} ms ${L.length>=3?spark(L.slice(-15).map(x=>-x.ms),160,30):''}</p>
    ${s.state==='fatigue'?`<p class="small"><span class="pill bad">${sg(s.diff,0)} %</span> Plus lent que d'habitude : échauffement complet et session courte ce soir.</p>`:s.state==='forme'?'<p class="small"><span class="pill ok">en forme</span> Plus rapide que d\'habitude.</p>':''}
    <p class="note">À comparer seulement avec toi-même : l'écran et le navigateur ajoutent leur propre délai.</p>`;
}
function suiviStats(logs){
const P=APP.prof,now=new Date(),d0=new Date(now);d0.setHours(0,0,0,0);d0.setDate(d0.getDate()-(d0.getDay()+6)%7);
const wk=logs.filter(l=>l.d>=new Date(d0-d0.getTimezoneOffset()*6e4).toISOString().slice(0,10)),days=new Set(logs.map(l=>l.d)),acs=rowsAgg(P.rows).acs,S=sessionsOf(P.rows);
const rows=acs?S.flatMap(s=>s.map((r,i)=>({r:r.sc/r.r/acs,tr:days.has(evDate(r.ts)),first:i===0}))):[];
return{streak:trStreak(logs.map(l=>l.d),today()),wkMin:wk.reduce((s,l)=>s+(+l.min||0),0),wkN:wk.length,ef:trainEffect(rows).all};
}
function suiviHtml(logs){
return logs.length?`<div class="tbl"><table class="small"><thead><tr><th>Date</th><th>Séance</th><th>Durée</th><th>Exercices</th></tr></thead><tbody>${logs.slice(-8).reverse().map(l=>`<tr><td>${esc(dFr(Date.parse(l.d+'T12:00:00')))}</td><td>${esc(l.ctx==='progression'?'Progression':'Échauffement')}</td><td>${+l.min||0} min</td><td>${esc((l.keys||[]).map(k=>(TR_DRILLS[k]||{}).n).filter(Boolean).join(', '))}</td></tr>`).join('')}</tbody></table></div>`
:'<p class="muted">Pas encore de séance : lance ta première routine, ta série et l\'effet sur tes parties apparaîtront ici.</p>';
}
let TM=null,AC=null;
function beep(n=2){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();for(let i=0;i<n;i++){const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime+i*.22;o.frequency.value=880;g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);o.connect(g).connect(AC.destination);o.start(t);o.stop(t+.2);}}catch(e){}}
function tmStart(){
const C=trCtx(),R=trRoutine(C.focus,C.min,C.ctx,TR_DRILLS,C.role);if(!R.length)return;
if(TM)clearInterval(TM.int);beep(1);
TM={R,i:0,end:Date.now()+R[0].min*6e4,left:null,ctx:C.ctx,L:C.L,tool:C.tool,min:R.reduce((s,b)=>s+b.min,0)};
TM.int=setInterval(tmTick,250);tmRender();
}
function tmTick(){if(!TM||TM.left!=null)return;if(Date.now()>=TM.end)tmNext();else tmRender();}
function tmNext(){
if(!TM)return;TM.i++;
if(TM.i>=TM.R.length){clearInterval(TM.int);beep(3);tmLog(TM);TM=null;$('#tmBox').hidden=true;toast('✔ Séance terminée et enregistrée. Bien joué !');if(APP.tab==='entrainement')renderTab();return;}
beep(2);TM.end=Date.now()+TM.R[TM.i].min*6e4;tmRender();
}
function tmRender(){
const box=$('#tmBox');if(!box||!TM)return;const b=TM.R[TM.i],d=TR_DRILLS[b.k],left=TM.left!=null?TM.left:Math.max(0,Math.ceil((TM.end-Date.now())/1000));
box.hidden=false;
box.innerHTML=`<div class="tm-h"><small>Exercice ${TM.i+1}/${TM.R.length}${TM.left!=null?' · en pause':''}</small><b>${esc(d.n)}</b></div><div class="tm-c">${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}</div>
    <p class="small">${esc(fillLv(d.drill,TM.L))}</p><div class="row"><button class="btn sm" data-act="tmPause">${TM.left!=null?'▶ Reprendre':'❚❚ Pause'}</button><button class="btn ghost sm" data-act="tmNext">Suivant</button><button class="btn ghost sm" data-act="tmStop">Arrêter</button></div>`;
}
function tmLog(T){
const C=T||(()=>{const c=trCtx(),R=trRoutine(c.focus,c.min,c.ctx,TR_DRILLS,c.role);return{R,ctx:c.ctx,min:R.reduce((s,b)=>s+b.min,0)};})();
const L=trLogs();L.push({d:today(),min:C.min,ctx:C.ctx,keys:C.R.map(b=>b.k)});ST.set('tlog',L.slice(-200));
}
const RX={st:'idle',t0:0,to:null,res:[]};
function rxSet(cls,txt){const b=$('#rxBox');if(!b)return;b.className='rx'+(cls?' '+cls:'');b.textContent=txt;}
function rxArm(){RX.st='wait';rxSet('wait','Attends le vert…');clearTimeout(RX.to);RX.to=setTimeout(()=>{RX.st='go';RX.t0=performance.now();rxSet('go','MAINTENANT !');},1200+Math.random()*2300);}
function rxHit(){
if(RX.st==='idle'||RX.st==='done'){RX.res=[];rxArm();}
else if(RX.st==='wait'){clearTimeout(RX.to);RX.st='early';rxSet('early','Trop tôt ! Clique pour refaire cet essai');}
else if(RX.st==='early'||RX.st==='pause')rxArm();
else if(RX.st==='go'){
const ms=Math.round(performance.now()-RX.t0);RX.res.push(ms);
if(RX.res.length>=5){RX.st='done';const s=RX.res.slice().sort((a,b)=>a-b),med=s[2];rxSet('',`Médiane : ${med} ms · clique pour refaire le test`);
const L=rxList();L.push({d:today(),ms:med});ST.set('rx',L.slice(-60));const o=$('#rxOut');if(o)o.innerHTML=rxHtml();}
else{RX.st='pause';rxSet('',`${ms} ms · essai ${RX.res.length}/5 : clique pour le suivant`);}
}
}
document.addEventListener('pointerdown',e=>{if(e.target.closest&&e.target.closest('#rxBox')){e.preventDefault();rxHit();}});
document.addEventListener('keydown',e=>{if((e.key===' '||e.key==='Enter')&&document.activeElement&&document.activeElement.id==='rxBox'){e.preventDefault();rxHit();}});
Object.assign(ACT,{
tr:arg=>{const[k,v]=arg.split(':');if(k==='min')ST.set('trMin',+v);else if(k==='ctx'&&['echauffement','progression'].includes(v))ST.set('trCtx',v);else if(k==='tool'&&TOOL_FR[v])ST.set('trTool',v);renderTab();},
tmStart:()=>tmStart(),
tmPause:()=>{if(!TM)return;if(TM.left!=null){TM.end=Date.now()+TM.left*1000;TM.left=null;}else TM.left=Math.max(0,Math.ceil((TM.end-Date.now())/1000));tmRender();},
tmNext:()=>tmNext(),
tmStop:()=>{if(TM)clearInterval(TM.int);TM=null;$('#tmBox').hidden=true;},
tmLog:()=>{tmLog();toast('Séance enregistrée ✔');renderTab();},
warmup:()=>{ST.set('trCtx','echauffement');ST.set('trMin',10);ACT.tab('entrainement');tmStart();},
psa:arg=>{
const S=ST.get('sens',{dpi:800,sens:.4}),p=ST.get('psa',null);
if(arg==='go')ST.set('psa',{base:S.sens,pair:psaStart(S.sens),step:0});
else if(arg==='stop')ST.del('psa');
else if(arg==='keep'&&p){S.sens=Math.round((p.pair[0]+p.pair[1])/2*1000)/1000;ST.set('sens',S);ST.del('psa');toast(`Sensibilité ${String(S.sens).replace('.',',')} enregistrée : mets-la dans le jeu`);}
else if((arg==='0'||arg==='1')&&p&&p.step<7){p.pair=psaStep(p.pair,+arg);p.step++;ST.set('psa',p);}
renderTab();
}
});
;
"use strict";
const META_COL={S:'ok',A:'ok',B:'neutral',C:'bad',D:'bad'};
const META_SURE={sur:['sûr','sûr à 90 % ou plus que l\'agent est au-dessus / en dessous de la moyenne'],prob:['probable','sûr à 75-90 %'],flou:['à confirmer','pas encore assez de parties pour être sûr du sens de l\'écart']};
const ROLE_ORDER=['Duelist','Initiator','Controller','Sentinel'];
const metaRows=sc=>sc?Object.entries(sc.a).map(([a,r])=>Object.assign({a,role:ROLE_OF[a]||''},metaTier(r))).sort((x,y)=>y.dw-x.dw):[];
const wTxt=dw=>Math.abs(dw)<.05?'±0 %':`${sg(dw)} %`;
function metaMine(map){const R=(APP.prof.rows||[]).filter(r=>!map||r.map===map),o={};aggBy(R,'agent').forEach(a=>{o[a.key]=a;});return o;}
function metaState(){
const M=APP.meta,maps=Object.keys(M.s).filter(k=>/^[A-Z]/.test(k)&&mapOk(k)).sort();
const S=APP.metaS||(APP.metaS={map:'*',rg:'',role:''});
if(S.map!=='*'&&!maps.includes(S.map))S.map='*';
return{S,maps};
}
function tabMeta(){
if(APP.meta===undefined)return`${skel(1)}${skel(6,'mt')}`;
if(!APP.meta)return stateHtml('!','Méta indisponible','Le fichier de la méta n\'a pas pu se charger. Vérifie ta connexion puis réessaie.',['Réessayer','metaRetry'],true);
const M=APP.meta,{S,maps}=metaState(),map=S.map==='*'?null:S.map,myRg=rgOf(APP.prof.mmr.tier);
const rgKey=S.rg&&M.s[S.rg]?S.rg:'',base=M.s[rgKey||'*'],sc=map?M.s[map]:base,G=metaRows(M.s['*']),rows=metaRows(sc);
const mine=metaMine(map),mineAll=metaMine(null),gOf=Object.fromEntries(G.map(r=>[r.a,r]));
const moved=map?rows.filter(r=>gOf[r.a]&&Math.abs(r.dw-gOf[r.a].dw)>=.75):[];
const shown=rows.filter(r=>!S.role||r.role===S.role);
const sel=`<div class="row filt"><select data-pick="metaS" aria-label="Carte"><option value="*"${!map?' selected':''}>Toutes les cartes · ${M.s['*'].n.toLocaleString('fr-FR')} p.</option>${maps.map(m=>`<option value="${esc(m)}"${m===map?' selected':''}>${esc(m)} · ${M.s[m].n} p.</option>`).join('')}</select>
    <div class="chips" role="group" aria-label="Niveau des joueurs">${[['','Tous les rangs'],['g1',RG_FR[1]],['g2',RG_FR[2]],['g3',RG_FR[3]]].filter(([k])=>!k||M.s[k]).map(([k,t])=>`<button type="button" class="chip${(S.rg||'')===k?' on':''}" data-act="metaRg:${k||'-'}" aria-pressed="${(S.rg||'')===k}">${esc(t)}${k&&+k[1]===myRg?' <small>(toi)</small>':''}</button>`).join('')}</div>
    <div class="chips" role="group" aria-label="Rôle">${[''].concat(ROLE_ORDER).map(r=>`<button type="button" class="chip${(S.role||'')===r?' on':''}" data-act="metaRole:${r||'-'}" aria-pressed="${(S.role||'')===r}">${r?esc(ROLE_FR[r]||r):'Tous les rôles'}</button>`).join('')}</div></div>`;
const head=`<div class="card"><div class="card-h"><h2>Méta des agents</h2><span class="muted small">${M.region?esc(M.region.toUpperCase())+' · ':''}parties classées du ${esc(dFr(M.du,{day:'numeric',month:'short'}))} au ${esc(dFr(M.au,{day:'numeric',month:'short'}))}</span></div>${sel}</div>`;
return`${head}${metaVerdict(rows,map,mine,mineAll,gOf,moved)}
    <div class="card mt"><div class="card-h"><h3>Tier list${map?` · ${esc(map)}`:''}${rgKey&&!map?` · ${esc(RG_FR[+rgKey[1]])}`:''}</h3><span class="muted small">victoires estimées vs un agent moyen · touche un agent pour le détail</span></div>
      ${map&&rgKey?`<p class="note" style="margin-top:0">Sur une carte précise, le classement utilise tous les rangs (trop peu de parties par carte et par rang). Ton filtre de rang s'applique à la colonne « Ce que prennent les joueurs ».</p>`:''}
      ${map&&!moved.length?`<p class="note" style="margin-top:0">Sur ${esc(map)}, les données ne montrent encore <b>aucun écart sûr</b> avec la méta générale : le classement est presque le même. Ce qui change vraiment d'une carte à l'autre, c'est ce que prennent les joueurs (plus bas).</p>`:''}
      ${metaTiers(shown,mine,map)}
      <p class="note">${Object.entries(META_SURE).map(([k,[t,d]])=>`<span class="msure ${k}" title="${esc(d)}">${t}</span>`).join(' ')} = certitude du sens de l'écart. Contour = agent que tu as joué${map?' ici':''} (ton bilan dans le détail). Pâle = moins de ${META_MIN} parties.</p></div>
    ${metaRoles(rows,map,mine)}
    ${map?metaPicks(M,map,S.rg||(myRg?'g'+myRg:'g3'),rows):''}
    ${metaHow(M,G)}`;
}
function metaVerdict(rows,map,mine,mineAll,gOf,moved){
const top=rows.filter(r=>(r.t==='S'||r.t==='A')&&r.sure!=='flou').slice(0,3),my=Object.values(map?mine:mineAll).sort((a,b)=>b.n-a.n)[0];
const me=my&&rows.find(r=>r.a===my.key),alt=me&&rows.find(r=>r.role===me.role&&r.a!==me.a&&r.dw-me.dw>=1.5&&r.sure!=='flou');
const v={cls:me?META_COL[me.t]:'',img:me?agImg(me.a,'ag lg'):'',
h:top.length?`${map?`Sur ${map}`:'Partout'}, ce qui gagne le plus : ${top.map(r=>r.a).join(', ')}`:'Aucun agent ne sort nettement du lot pour l\'instant',
p:me?`Ton agent ${map?'ici':'principal'}, ${me.a}, est classé ${me.t} (${wTxt(me.dw)} de victoires estimées, ${META_SURE[me.sure][0]}).${alt?` Dans son rôle, ${alt.a} fait mieux (${wTxt(alt.dw)}) : à tester en 2e agent.`:me.t==='C'||me.t==='D'?' Ton aisance avec lui compte aussi : regarde ton bilan dans le détail avant de changer.':' Bon choix d\'après les données.'}`:'Joue quelques parties pour situer tes agents dans la méta.',
facts:[['Parties analysées',`<b>${(map?APP.meta.s[map]:APP.meta.s['*']).n.toLocaleString('fr-FR')}</b>`,'pondérées : récentes d\'abord'],['Écart S ↔ D',`<b>${fmt(rows.length?rows[0].dw-rows[rows.length-1].dw:0,1)} %</b>`,'de victoires, du 1er au dernier'],map?['Propre à la carte',`<b>${moved.length}</b>`,'agent(s) avec un écart sûr']:['Agents sûrs',`<b>${rows.filter(r=>r.sure==='sur').length}</b>`,'au-dessus ou en dessous à 90 %']]};
return verdictHtml(v,map?`Méta · ${esc(map)}`:'Méta · toutes les cartes');
}
function metaTiers(rows,mine,map){
if(!rows.length)return empty('Aucun agent dans ce filtre.');
return`<div class="tiers">${META_TIERS.map(([t])=>{const L=rows.filter(r=>r.t===t);return`<div class="tier ${META_COL[t]}"><b class="tl">${t}</b><div class="tagents">${L.length?L.map(r=>{const m=mine[r.a];
return`<button type="button" class="tag-a${m&&m.n>=1?' me':''}${r.low?' low':''}" data-act="metaAg:${esc(r.a)}" title="${esc(`${r.a} : ${wTxt(r.dw)} de victoires estimées (${META_SURE[r.sure][0]}) · pris par ${fmt(r.pk,0)} % des équipes`)}">${agImg(r.a)}<span><b>${esc(r.a)}</b><small>${wTxt(r.dw)} · <i class="msure ${r.sure}">${META_SURE[r.sure][0]}</i></small></span></button>`;}).join(''):'<span class="muted small">—</span>'}</div></div>`;}).join('')}</div>`;
}
function metaRoles(rows,map,mine){
const L=ROLE_ORDER.map(ro=>{const R=rows.filter(r=>r.role===ro);if(!R.length)return'';const b=R[0],m=Object.values(mine).filter(a=>ROLE_OF[a.key]===ro).sort((x,y)=>y.n-x.n)[0],mr=m&&R.find(r=>r.a===m.key);
return`<tr><td>${esc(ROLE_FR[ro]||ro)}</td><td><span class="nm">${agImg(b.a)} <b>${esc(b.a)}</b> <small class="muted">${b.t} · ${wTxt(b.dw)}</small></span></td><td>${mr?`<span class="nm">${agImg(mr.a)} ${esc(mr.a)} <small class="muted">${mr.t} · ${m.n} p. à toi</small></span>`:'<span class="muted">—</span>'}</td></tr>`;}).join('');
return`<div class="card mt"><div class="card-h"><h3>Le meilleur de chaque rôle${map?` sur ${esc(map)}`:''}</h3><span class="muted small">pour choisir selon ce qui manque à ton équipe</span></div>
    <div class="tbl"><table class="small"><thead><tr><th>Rôle</th><th>Le mieux classé</th><th>Ton agent${map?' ici':''}</th></tr></thead><tbody>${L}</tbody></table></div></div>`;
}
function metaPicks(M,map,g,rows){
const h=(M.s[map].h||{})[g]||(M.s[map].h||{}).g3;if(!h)return'';
const gg=(M.s[map].h||{})[g]?g:'g3',T=Object.fromEntries(rows.map(r=>[r.a,r.t])),L=Object.entries(h).sort((a,b)=>b[1]-a[1]).slice(0,10),mx=L.length?L[0][1]:1;
return`<div class="card mt"><div class="card-h"><h3>Ce que prennent les joueurs ${esc(RG_FR[+gg[1]])} sur ${esc(map)}</h3><span class="muted small">part des équipes · populaire ≠ fort</span></div>
    <ul class="mpicks">${L.map(([a,p])=>`<li>${agImg(a)}<b>${esc(a)}</b><span class="rbar neutral" aria-hidden="true"><i style="width:${Math.round(p/mx*100)}%"></i></span><span>${fmt(p,0)} %</span><small class="muted">${T[a]?'niveau '+T[a]:''}</small></li>`).join('')}</ul>
    <p class="note">Les joueurs d'un niveau élevé choisissent selon la carte (vision, angles, exécutions) : un agent très pris ici et bien classé est une valeur sûre. Très pris mais mal classé : populaire, sans plus.</p></div>`;
}
function metaHow(M,G){
const odd=G.filter(r=>r.n>=40&&r.raw!=null&&Math.abs(r.raw*100-50)>=4&&Math.abs(r.dw)<1).sort((a,b)=>Math.abs(b.raw-.5)-Math.abs(a.raw-.5))[0];
return`<details class="card mt"><summary><b>Comment c'est calculé (et ses limites)</b></summary><div class="small mt8">
    <p><b>1. Rounds, pas seulement victoires.</b> Un 13-2 et un 13-11 ne disent pas la même chose : chaque partie compte par son écart de rounds, ce qui réduit fortement le hasard. Le résultat est ensuite converti en % de victoires.</p>
    <p class="mt8"><b>2. Chaque agent séparé de ses coéquipiers et adversaires.</b> Méthode venue de l'analyse du basket (« plus-minus ajusté ») : on estime l'effet de tous les agents en même temps, en tenant compte de l'écart de rang entre les deux équipes. Un miroir (même agent des deux côtés) ne compte pas.</p>
    <p class="mt8"><b>3. Pas de conclusion sur peu de parties.</b> Chaque estimation est tirée vers la moyenne tant que les données ne prouvent rien ; la force de ce rappel est choisie par les données elles-mêmes (validation croisée). Chaque carte n'est séparée de la méta générale que si l'écart est prouvé.</p>
    <p class="mt8"><b>4. Les parties récentes pèsent plus</b> (moitié moins de poids après 30 jours) : la méta suit les patchs.</p>
    ${odd?`<p class="mt8"><b>Exemple :</b> ${esc(odd.a)} gagne ${fmt(odd.raw*100,1)} % de ses parties (${odd.n} parties hors miroir), mais une fois les coéquipiers, les adversaires et le hasard pris en compte, son effet estimé n'est que de ${wTxt(odd.dw)} : ce taux brut est surtout de la chance.</p>`:''}
    <p class="mt8"><b>Limites.</b> ${(M.matches||M.s['*'].n).toLocaleString('fr-FR')} parties ${M.region?esc(M.region.toUpperCase()):''}, c'est assez pour la méta générale, encore peu pour chaque carte. Le classement mesure ce qui se passe <i>quand</i> un agent est pris : il ne sépare pas totalement l'agent du joueur qui le choisit. À ton rang, bien maîtriser 2-3 agents compte probablement plus que suivre la méta (hypothèse courante, pas mesurée ici).</p>
  </div></details>`;
}
ACT.metaAg=a=>{
const M=APP.meta;if(!M||!M.s['*'].a[a])return;
const g=metaTier(M.s['*'].a[a]),maps=Object.keys(M.s).filter(k=>/^[A-Z]/.test(k)&&mapOk(k)&&M.s[k].a[a]).sort(),mine=metaMine(null)[a];
const line=(n,r,sub)=>{const t=metaTier(r);return`<tr><td>${n}</td><td><b class="tlm ${META_COL[t.t]}">${t.t}</b> ${wTxt(t.dw)} <i class="msure ${t.sure}">${META_SURE[t.sure][0]}</i></td><td>${fmt(t.pk,0)} %</td><td>${t.n?`${fmt(t.raw*100,0)} % <small class="muted">(${t.n} p.)</small>`:'—'}</td>${sub||''}</tr>`;};
const myMap=m=>{const x=metaMine(m)[a];return`<td>${x?`${x.w} V / ${x.n}`:'—'}</td>`;};
dlgOpen(`<div class="card-h"><h2 class="nm">${agImg(a,'ag lg')} ${esc(a)}</h2><span class="pill ${META_COL[g.t]}">Niveau ${g.t}</span></div>
    <p class="muted small">${esc(ROLE_FR[ROLE_OF[a]]||'')} · ${wTxt(g.dw)} de victoires estimées vs un agent moyen (${META_SURE[g.sure][0]}) · pris par ${fmt(g.pk,0)} % des équipes${mine?` · toi : ${mine.w} V / ${mine.n} parties`:''}</p>
    <div class="tbl mt8"><table class="small"><thead><tr><th>Carte</th><th>Niveau</th><th>Pris</th><th>Victoires brutes</th><th>Toi</th></tr></thead><tbody>${maps.map(m=>line(esc(m),M.s[m].a[a],myMap(m))).join('')}</tbody></table></div>
    ${['g1','g2','g3'].some(k=>M.s[k]&&M.s[k].a[a])?`<h3>Par niveau de joueurs</h3><div class="tbl"><table class="small"><thead><tr><th>Rangs</th><th>Niveau</th><th>Pris</th><th>Victoires brutes</th></tr></thead><tbody>${['g1','g2','g3'].filter(k=>M.s[k]&&M.s[k].a[a]).map(k=>line(esc(RG_FR[+k[1]]),M.s[k].a[a])).join('')}</tbody></table></div>`:''}
    <p class="note">« Victoires brutes » = taux réel hors miroirs, sans correction : sur peu de parties il varie beaucoup au hasard, c'est pourquoi le niveau ne se base pas dessus.</p>`);
};
ACT.metaRetry=()=>{APP.meta=undefined;APP.metaP=null;renderTab();};
ACT.metaRg=k=>{metaState().S.rg=k==='-'?'':k;renderTab();};
ACT.metaRole=k=>{metaState().S.role=k==='-'?'':k;renderTab();};
