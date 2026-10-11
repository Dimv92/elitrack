"use strict";
/* ================= ÉCRANS DU SITE PUBLIC =================
   Accueil (sans compte), profil (bannière + onglets), rapport de partie, offres Premium. Tout texte venant des données passe par esc(). */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n, d = 1) => n == null || !Number.isFinite(+n) ? '—' : Number(n).toFixed(d).replace('.', ',');
const pc0 = v => v == null ? '—' : `${Math.round(v)} %`;
const sg = (x, d = 1) => x == null ? '—' : `${x >= 0 ? '+' : '−'}${fmt(Math.abs(x), d)}`;
const dFr = (ts, o = {weekday:'short', day:'numeric', month:'short'}) => { try { return new Date(ts).toLocaleDateString('fr-FR', o); } catch (e) { return ''; } };
const hFr = ts => { try { return new Date(ts).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}); } catch (e) { return ''; } };
const agImg = (a, cls = 'ag') => { const u = IMG.agent(a); return u ? `<img class="${cls}" src="${u}" alt="${esc(a)}" title="${esc(a)}" loading="lazy">` : `<span class="${cls} ph">${esc(String(a || '?').slice(0, 2))}</span>`; };
const lockTag = f => featOn(f, APP.plan, APP.cfg) ? '' : ' <span class="star" title="Premium">★</span>';
const trendTxt = (a, b, d = 1, inv) => a == null || b == null ? '' : `<small class="${(a - b) * (inv ? -1 : 1) >= 0 ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${fmt(Math.abs(a - b), d)}</small>`;
const rateCls = (k, n, ref = .5) => trust(k, n, ref);
const empty = t => `<p class="muted">${esc(t)}</p>`;

/* ---------- Accueil sans compte ---------- */
function renderLanding() {
  const C = APP.cfg, prem = Object.entries(FEATURES).filter(([k]) => !featOn(k, 'free', C)), free = Object.entries(FEATURES).filter(([k]) => featOn(k, 'free', C));
  const wall = ['Jett', 'Reyna', 'Omen', 'Sova', 'Killjoy'];
  $('#app').innerHTML = `
  <section class="land">
    <div class="land-txt">
      <p class="eyebrow">Tracker perso · gratuit · sans compte</p>
      <h1>Tes stats, <em>à tes couleurs</em>.</h1>
      <p class="lead">Entre ton Riot ID : rang, RR, parties, agents, cartes et le rapport de ta dernière partie. L'interface prend les couleurs de ton agent principal.</p>
      <form id="landForm" class="land-form" autocomplete="off">
        <input id="landRiot" placeholder="Pseudo#TAG" aria-label="Ton Riot ID (Pseudo#TAG)" maxlength="30" value="${esc((ST.get('last') || {}).riot || '')}">
        <select id="landReg" aria-label="Région">${REGIONS.map(([v, n]) => `<option value="${v}"${v === ((ST.get('last') || {}).region || 'eu') ? ' selected' : ''}>${n}</option>`).join('')}</select>
        <button class="btn big" type="submit">Voir mon profil</button>
      </form>
      <label class="chk small"><input type="checkbox" id="landOk" ${ST.get('consent') ? 'checked' : ''}> C'est mon compte (ou le joueur est d'accord). Mes données restent dans mon navigateur.</label>
      <p class="small muted mt8">Pas encore prêt ? <a href="#" data-act="demo">Voir la démo</a> avec un profil inventé.</p>
    </div>
    <div class="wall" aria-hidden="true">${wall.map((a, i) => `<img src="${IMG.agent(a, 'fullportrait')}" alt="" style="--i:${i};--c:${AGENT_COL[a]}" loading="lazy">`).join('')}</div>
  </section>
  <section class="grid g3 feats">
    <div class="card"><h3>🎨 Ton interface, ton agent</h3><p>Joue Jett ? Tout passe en bleu ciel avec son art en fond. Main Omen ? Violet, police futuriste et fumée. Ça change tout seul avec ton profil.</p></div>
    <div class="card"><h3>📊 Plus que des chiffres</h3><p>Chaque partie expliquée : rounds gagnés contre attendus, ton impact en rounds, les moments qui ont tout changé.</p></div>
    <div class="card"><h3>🎯 Un coach honnête</h3><p>Ta place réelle dans tes lobbys et tes vrais points faibles, seulement quand les chiffres sont sûrs. Avec les exercices qui vont avec.</p></div>
  </section>
  ${pricingHtml()}
  <section class="card faq mt">
    <h2>Questions</h2>
    <details><summary>Où vont mes données ?</summary><p>Nulle part : elles sont gardées dans ton navigateur (stockage local). Pas de compte, pas de base de données, pas de pub. Bouton « Oublier mes données » dans les réglages.</p></details>
    <details><summary>Comment marche Premium ?</summary><p>Tu paies une fois (${esc(C.achat.vie || '—')}) ou par mois (${esc(C.achat.mensuel || '—')}) et tu reçois un code lié à ton Riot ID. Tu le colles dans « J'ai un code » : tout est débloqué, sans compte.</p></details>
    <details><summary>Est-ce que c'est officiel ?</summary><p>Non. ${esc(C.nom)} est un projet de fan, pas approuvé par Riot Games. Les données viennent de l'API communautaire HenrikDev.</p></details>
    <details><summary>Mes stats ne bougent pas ?</summary><p>Les données sont gardées 10 minutes pour ne pas surcharger le service : clique « Actualiser » sur ton profil après une partie.</p></details>
  </section>`;
  $('#recherche').hidden = true;
}
function pricingHtml() {
  const C = APP.cfg, li = ([k, f], on) => `<li class="${on ? 'good' : 'badl'}">${esc(f.n)}</li>`;
  const all = Object.entries(FEATURES);
  return `<section class="pricing mt" id="offres">
    <div class="card plan"><h3>Gratuit</h3><p class="price">0 €</p><ul class="ul">${all.map(x => li(x, featOn(x[0], 'free', C))).join('')}</ul></div>
    <div class="card plan best"><h3>Premium <span class="pill">tout débloqué</span></h3><p class="price">${esc(C.achat.vie || '—')} <small>à vie</small>${C.achat.mensuel ? ` <span class="muted small">ou ${esc(C.achat.mensuel)} / mois</span>` : ''}</p>
      <ul class="ul">${all.map(x => li(x, true)).join('')}</ul>
      ${C.freeAll ? '<div class="infobox">🎉 Lancement : tout est gratuit en ce moment !</div>' : `<div class="row mt8">${C.achat.lien ? `<a class="btn" href="${esc(C.achat.lien)}" target="_blank" rel="noopener noreferrer">Acheter Premium</a>` : '<span class="muted small">Achat bientôt disponible.</span>'}<button class="btn ghost" data-act="codeAsk">J'ai un code</button></div>`}
      <p class="note">Indique ton Riot ID dans le message du paiement : tu reçois ton code${C.achat.contact ? ` (contact : ${esc(C.achat.contact)})` : ''}. Le code est lié à ton compte.</p></div>
  </section>`;
}

/* ---------- Profil ---------- */
const TABS_P = [['vue', 'Vue d\'ensemble'], ['parties', 'Parties'], ['agents', 'Agents'], ['cartes', 'Cartes'], ['visee', 'Visée', 'visee'], ['progression', 'Progression', 'progression'], ['coach', 'Coach', 'coach'], ['comparer', 'Comparer', 'comparer']];
function renderProfile() {
  const P = APP.prof, th = TH.last || themeCompute(themeUsed(), P), M = P.mmr, lic = APP.lic;
  $('#recherche').hidden = false;
  const rr = M.rr == null ? null : clamp(M.rr, 0, 100), banner = IMG.card(P.card, 'wideart') || IMG.agent(th.agent, 'background'), bannerM = IMG.card(P.card, 'largeart') || banner, av = IMG.card(P.card, 'smallart') || IMG.agent(th.agent);
  $('#app').innerHTML = `
  ${P.demo ? '<div class="infobox demo">👀 <b>Démo</b> : profil inventé, tout est débloqué pour te montrer le site. <a href="#" data-act="accueil">Voir mon vrai profil</a></div>' : ''}
  <section class="hero" style="--banner:url('${banner}');--banner-m:url('${bannerM}');--rk:${tierCol(M.tier)}">
    <div class="banner"></div>${th.portrait ? `<img class="portrait" src="${th.portrait}" alt="">` : ''}
    <div class="hero-in">
      <div class="avatar">${av ? `<img src="${av}" alt="">` : ''}</div>
      <div class="who">
        <h1 class="pseudo">${esc(P.name)}<span class="tag">#${esc(P.tag)}</span></h1>
        <p class="sub">${P.level ? `Niveau ${P.level} · ` : ''}${esc((REGIONS.find(r => r[0] === P.region) || ['', P.region])[1])}${th.label ? ` · interface : <b>${esc(th.label)}</b>` : ''}</p>
        <div class="rank">${M.tier ? `<img src="${IMG.rank(M.tier)}" alt="">` : ''}<div>
          <b>${esc(tierFr(M.tier))}</b>${rr != null ? ` <span>${rr} RR</span>` : ''}${M.last != null ? ` <small class="${M.last >= 0 ? 'up' : 'down'}">${sg(M.last, 0)}</small>` : ''}
          ${rr != null ? `<div class="rrbar" title="${rr} RR sur 100"><i style="width:${rr}%"></i></div>` : M.need ? `<p class="small muted">Encore ${M.need} partie(s) de placement</p>` : ''}
          ${M.peak.tier ? `<p class="small muted">Pic : ${esc(tierFr(M.peak.tier))}${M.peak.season ? ` (${esc(M.peak.season)})` : ''}</p>` : ''}</div></div>
      </div>
      <div class="hero-act">
        ${P.demo ? '' : `<button class="btn ghost sm" data-act="refresh" title="Recharger depuis le service">↻ Actualiser</button>`}
        <button class="btn ghost sm" data-act="perso">🎨 Personnaliser</button>
        <button class="btn ghost sm" data-act="share">📸 Partager${lockTag('partage')}</button>
        ${APP.plan === 'free' ? '<button class="btn sm" data-act="premium">★ Passer Premium</button>' : `<span class="pill prem" title="${lic && lic.exp ? `Jusqu'au ${esc(lic.exp)}` : 'À vie'}">★ ${APP.plan === 'dieu' ? 'Mode Dieu' : 'Premium'}${lic && lic.days != null ? ` · ${lic.days} j` : ''}</span>`}
      </div>
    </div>
  </section>
  <nav class="tabs" role="tablist" aria-label="Sections du profil">${TABS_P.map(([k, n, f]) => `<button role="tab" data-act="tab:${k}" aria-selected="${APP.tab === k}" id="tb-${k}">${n}${f ? lockTag(f) : ''}</button>`).join('')}</nav>
  <div id="tabIn" role="tabpanel" aria-labelledby="tb-${APP.tab}"></div>`;
  renderTab();
}
function renderTab() {
  const el = $('#tabIn'); if (!el) return;
  const f = (TABS_P.find(t => t[0] === APP.tab) || [])[2];
  if (f && !featOn(f, APP.plan, APP.cfg)) { el.innerHTML = teaser(f); return; }
  try { el.innerHTML = ({vue:tabVue, parties:tabParties, agents:tabAgents, cartes:tabCartes, visee:tabVisee, progression:tabProg, coach:tabCoach, comparer:tabComparer}[APP.tab] || tabVue)(); }
  catch (e) { console.error(e); el.innerHTML = `<div class="card">${empty('Affichage impossible : ' + e.message)}</div>`; }
  if (['visee', 'coach'].includes(APP.tab) || (APP.tab === 'vue')) detNeed();
}
const TEASE = {visee:['🎯', 'Tes duels gagnés selon la distance, tes armes, ta précision partie par partie et une piste de sensibilité basée sur tes vrais duels.'],
  progression:['📈', 'Ta courbe de RR complète, tes semaines, et surtout ta limite du soir : à partir de combien de parties tu commences à perdre.'],
  coach:['🧠', 'Ta place réelle dans tes lobbys (mieux que X % des joueurs), tes points faibles sûrs, et les exercices qui vont avec.'],
  comparer:['⚔️', 'Toi contre un ami : victoires, K/D, ACS, précision, agents en commun.'], rapports:['📋', 'Le rapport de chaque partie.'], historique:['🗂️', 'Jusqu\'à 100 parties.'], partage:['📸', 'Une image de ton profil à tes couleurs.'], perso:['🎨', 'Tout personnaliser.']};
function teaser(f) {
  const [ic, txt] = TEASE[f] || ['★', ''];
  return `<div class="card teaser"><div class="tz-ic">${ic}</div><h2>${esc(FEATURES[f].n)}</h2><p class="lead">${esc(txt)}</p>
    <div class="row center"><button class="btn big" data-act="premium:${f}">Débloquer avec Premium</button><button class="btn ghost" data-act="demo">Voir dans la démo</button></div></div>`;
}

/* ---------- Vue d'ensemble : blocs dans l'ordre choisi ---------- */
function tabVue() {
  const P = APP.prof, R = P.rows, t = themeUsed(), order = (t.blocks.length ? t.blocks.concat(BLOCKS.filter(b => !t.blocks.includes(b))) : BLOCKS).filter(b => !t.hidden.includes(b));
  if (!R.length) return `<div class="card">${empty('Aucune partie classée trouvée récemment. Joue une ranked puis clique « Actualiser ».')}</div>`;
  const B = {kpis:bKpis, forme:bForme, rr:bRR, agents:bAgents, cartes:bCartes, records:bRecords, dernier:bDernier};
  return `<div class="vue">${order.map(b => `<div class="blk-${b}">${B[b]()}</div>`).join('')}</div>`;
}
function bKpis() {
  const R = APP.prof.rows, h = Math.floor(R.length / 2), A = rowsAgg(R), N = rowsAgg(R.slice(0, h)), O = rowsAgg(R.slice(h)), D = APP.D || [];
  const kast = D.length ? D.map(d => plLines(d).find(l => l.p.n === 'moi')).filter(Boolean) : [];
  const tile = (n, v, s, tip) => `<div class="kpi" title="${esc(tip || '')}"><span>${n}</span><b>${v}</b><small>${s || ''}</small></div>`;
  return `<div class="card"><div class="card-h"><h2>Chiffres clés</h2><span class="muted small">${A.n} dernières parties classées${h >= 4 ? ' · flèches : tes ' + h + ' plus récentes contre les ' + (R.length - h) + ' d\'avant' : ''}</span></div>
  <div class="kpis">
    ${tile('Victoires', pc0(A.wr), `${A.w} V · ${A.l} D ${h >= 4 ? trendTxt(N.wr, O.wr, 0) : ''}`, rateTip(A.w, A.w + A.l))}
    ${tile('K/D', fmt(A.kd, 2), `${A.k} kills · ${A.d} morts ${h >= 4 ? trendTxt(N.kd, O.kd, 2) : ''}`)}
    ${tile('ACS', fmt(A.acs, 0), `score de combat par round ${h >= 4 ? trendTxt(N.acs, O.acs, 0) : ''}`)}
    ${tile('ADR', fmt(A.adr, 0), `dégâts par round ${h >= 4 ? trendTxt(N.adr, O.adr, 0) : ''}`)}
    ${tile('Tête', pc0(A.hsP), `des balles touchées ${h >= 4 ? trendTxt(N.hsP, O.hsP, 1) : ''}`)}
    ${tile('DDΔ', sg(A.dd, 0), 'dégâts donnés − reçus par round', 'Positif : tu fais plus de dégâts que tu n\'en prends')}
    ${tile('Kills / round', fmt(A.kpr, 2), `KDA ${fmt(A.kda, 2)}`)}
    ${tile('KAST', kast.length ? pc0(kast.reduce((s, l) => s + l.kast, 0) / kast.length) : '—', kast.length ? `sur ${kast.length} parties détaillées` : 'calculé avec le détail des parties')}
  </div></div>`;
}
function bForme() {
  const R = APP.prof.rows.slice(0, 20), s = serieOf(APP.prof.rows), ses = sessionsOf(APP.prof.rows).pop() || [], todayS = ses.length && Date.now() - ses[ses.length - 1].ts < 8 * 36e5 ? ses : [];
  const A = rowsAgg(todayS);
  return `<div class="card"><div class="card-h"><h2>Forme</h2>${s ? `<span class="pill ${s.res === 'W' ? 'ok' : 'bad'}">${s.n} ${s.res === 'W' ? 'victoire' : 'défaite'}${s.n > 1 ? 's' : ''} d'affilée</span>` : ''}</div>
  <div class="strip">${R.slice().reverse().map(r => `<i class="${r.res}" title="${esc(`${dFr(r.ts)} · ${r.map} · ${r.agent} · ${r.us}-${r.them} · ${r.k}/${r.d}/${r.a}`)}">${IMG.agent(r.agent) ? `<img src="${IMG.agent(r.agent)}" alt="" loading="lazy">` : r.res}</i>`).join('')}</div>
  <p class="note">De la plus ancienne (gauche) à la plus récente (droite).</p>
  ${todayS.length ? `<div class="sess mt8"><b>Session en cours</b> : ${A.w} V · ${A.l} D · K/D ${fmt(A.kd, 2)} · ACS ${fmt(A.acs, 0)}${APP.prof.hist.length ? ` · RR ${sg(APP.prof.hist.filter(h => h.ts >= todayS[0].ts - 6e4).reduce((s, h) => s + (h.ch || 0), 0), 0)}` : ''}</div>` : ''}</div>`;
}
function rrSvg(H, w = 640, h = 170) {
  if (H.length < 2) return empty('Pas assez de parties pour tracer la courbe.');
  const xs = H.map((_, i) => 30 + i * (w - 40) / (H.length - 1)), lo = Math.min(...H.map(x => x.elo)), hi = Math.max(...H.map(x => x.elo)), span = Math.max(50, hi - lo);
  const y = v => 12 + (h - 34) * (1 - (v - lo + span * .05) / (span * 1.1)), pts = H.map((x, i) => `${xs[i].toFixed(1)},${y(x.elo).toFixed(1)}`);
  const divs = []; for (let e = Math.ceil(lo / 100) * 100; e <= hi; e += 100) divs.push(e);
  return `<svg viewBox="0 0 ${w} ${h}" class="rrsvg" role="img" aria-label="Évolution des RR sur ${H.length} parties">
    <defs><linearGradient id="rrg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${divs.map(e => `<line x1="30" x2="${w - 10}" y1="${y(e)}" y2="${y(e)}" class="gl"/><text x="2" y="${y(e) + 4}" class="gt">${esc(tierFr(Math.floor(e / 100) + 3))}</text>`).join('')}
    <polygon points="${xs[0]},${h - 22} ${pts.join(' ')} ${xs[xs.length - 1]},${h - 22}" fill="url(#rrg)"/>
    <polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent-t)" stroke-width="2.5" stroke-linejoin="round"/>
    ${H.map((x, i) => `<circle cx="${xs[i]}" cy="${y(x.elo)}" r="3.2" class="${(x.ch || 0) >= 0 ? 'pw' : 'pl'}"><title>${esc(`${dFr(x.ts)} ${x.map ? '· ' + x.map : ''} : ${sg(x.ch, 0)} RR (${tierFr(x.t)})`)}</title></circle>`).join('')}
  </svg>`;
}
function bRR() {
  const H = APP.prof.hist, full = featOn('progression', APP.plan, APP.cfg), S = full ? H : H.slice(-20);
  const net = S.reduce((s, h) => s + (h.ch || 0), 0);
  return `<div class="card"><div class="card-h"><h2>RR</h2><span class="muted small">${S.length} dernières parties : <b class="${net >= 0 ? 'up' : 'down'}">${sg(net, 0)} RR</b>${full ? '' : ` · <a href="#" data-act="tab:progression">courbe complète ★</a>`}</span></div>${rrSvg(S, 1100, 210)}</div>`;
}
function miniAgg(a, img, sub) {
  return `<div class="mini">${img}<div><b>${esc(a.key)}</b><small>${a.n} parties · <span class="${rateCls(a.w, a.n) || ''}" title="${esc(rateTip(a.w, a.n))}">${pc0(a.wr)}</span> · K/D ${fmt(a.kd, 2)} · ACS ${fmt(a.acs, 0)}</small>${sub || ''}</div></div>`;
}
function bAgents() { const A = aggBy(APP.prof.rows, 'agent').slice(0, 3); return `<div class="card"><div class="card-h"><h2>Tes agents</h2><a href="#" data-act="tab:agents" class="small">Tous</a></div>${A.map(a => miniAgg(a, agImg(a.key, 'ag lg'), `<small class="muted">${esc(ROLE_FR[ROLE_OF[a.key]] || '')}</small>`)).join('')}</div>`; }
function bCartes() { const A = aggBy(APP.prof.rows, 'map').slice(0, 3); return `<div class="card"><div class="card-h"><h2>Tes cartes</h2><a href="#" data-act="tab:cartes" class="small">Toutes</a></div>${A.map(a => miniAgg(a, IMG.map(a.key, 'listviewicon') ? `<img class="mapi" src="${IMG.map(a.key, 'listviewicon')}" alt="" loading="lazy">` : '')).join('')}</div>`; }
function bRecords() {
  const R = APP.prof.rows, best = (f, min) => R.filter(min || (() => true)).reduce((b, r) => !b || f(r) > f(b) ? r : b, null), line = (n, r, v) => r ? `<div class="rec">${agImg(r.agent)}<div><span>${n}</span><b>${v}</b><small>${esc(r.map)} · ${dFr(r.ts)} · ${r.us}-${r.them}</small></div></div>` : '';
  const k = best(r => r.k), a = best(r => r.sc / r.r), kd = best(r => r.d ? r.k / r.d : r.k, r => r.k >= 10), hs = best(r => r.hs / Math.max(1, r.hs + r.bs + r.ls), r => r.hs + r.bs + r.ls >= 30);
  return `<div class="card"><h2>Records</h2><div class="recs">${line('Kills', k, k && k.k)}${line('ACS', a, a && fmt(a.sc / a.r, 0))}${line('K/D', kd, kd && fmt(kd.d ? kd.k / kd.d : kd.k, 2))}${line('Tête', hs, hs && pc0(hs.hs / (hs.hs + hs.bs + hs.ls) * 100))}</div></div>`;
}
function bDernier() {
  const r = APP.prof.rows[0]; if (!r) return '';
  return `<div class="card last" style="--mbg:url('${IMG.map(r.map, 'listviewicon')}')"><div class="card-h"><h2>Dernière partie</h2><span class="muted small">${dFr(r.ts)} à ${hFr(r.ts)}</span></div>
    <div class="lastm">${agImg(r.agent, 'ag lg')}<div><b class="score ${r.res}">${r.res === 'W' ? 'Victoire' : r.res === 'L' ? 'Défaite' : 'Égalité'} ${r.us}-${r.them}</b><p>${esc(r.map)} · ${esc(r.agent)} · ${r.k}/${r.d}/${r.a} · ACS ${fmt(r.sc / r.r, 0)} · ${pc0(r.hs / Math.max(1, r.hs + r.bs + r.ls) * 100)} tête</p></div>
    <button class="btn" data-act="rapport:${r.id}">Voir le rapport${featOn('dernier', APP.plan, APP.cfg) || featOn('rapports', APP.plan, APP.cfg) ? '' : ' ★'}</button></div></div>`;
}

/* ---------- Parties ---------- */
function tabParties() {
  const P = APP.prof, F = APP.filt || (APP.filt = {a:'', m:'', r:''}), H = {}; P.hist.forEach(h => { if (h.mid) H[h.mid] = h; });
  const R = P.rows.filter(r => (!F.a || r.agent === F.a) && (!F.m || r.map === F.m) && (!F.r || r.res === F.r)), A = rowsAgg(R);
  const opt = (k, list, fr) => `<select data-filt="${k}" aria-label="${fr}"><option value="">${fr} : tous</option>${list.map(v => `<option${F[k] === v ? ' selected' : ''}>${esc(v)}</option>`).join('')}</select>`;
  const canMore = featOn('historique', APP.plan, APP.cfg), canRep = id => featOn('rapports', APP.plan, APP.cfg) || (featOn('dernier', APP.plan, APP.cfg) && id === P.rows[0].id);
  return `<div class="card"><div class="card-h"><h2>Parties classées</h2><span class="muted small">${R.length} partie(s) · ${pc0(A.wr)} de victoires · K/D ${fmt(A.kd, 2)} · ACS ${fmt(A.acs, 0)}</span></div>
  <div class="row filt">${opt('a', [...new Set(P.rows.map(r => r.agent))].sort(), 'Agent')}${opt('m', [...new Set(P.rows.map(r => r.map))].sort(), 'Carte')}
    <select data-filt="r" aria-label="Résultat"><option value="">Résultat : tous</option><option value="W"${F.r === 'W' ? ' selected' : ''}>Victoires</option><option value="L"${F.r === 'L' ? ' selected' : ''}>Défaites</option></select></div>
  <div class="mlist">${R.map(r => { const h = H[r.id], sh = r.hs + r.bs + r.ls; return `<div class="mrow ${r.res}" style="--mbg:url('${IMG.map(r.map, 'listviewicon')}')">
    ${agImg(r.agent)}<div><b>${esc(r.map)}</b><small>${dFr(r.ts)} · ${hFr(r.ts)}</small></div>
    <div class="score ${r.res}">${r.us}-${r.them}${h && h.ch != null ? `<small class="${h.ch >= 0 ? 'up' : 'down'}">${sg(h.ch, 0)} RR</small>` : ''}</div>
    <div><b>${r.k}/${r.d}/${r.a}</b><small>K/D ${fmt(r.d ? r.k / r.d : r.k, 2)}</small></div>
    <div class="hide-m"><b>${fmt(r.sc / r.r, 0)}</b><small>ACS</small></div><div class="hide-m"><b>${fmt(r.dmg / r.r, 0)}</b><small>ADR</small></div><div class="hide-m"><b>${sh ? Math.round(r.hs / sh * 100) : '—'} %</b><small>tête</small></div>
    <button class="btn ghost sm" data-act="rapport:${r.id}">Rapport${canRep(r.id) ? '' : ' ★'}</button></div>`; }).join('') || empty('Aucune partie avec ces filtres.')}</div>
  ${P.demo ? '' : P.pages < 5 ? `<div class="row center mt"><button class="btn ghost" data-act="more">${canMore ? 'Charger plus de parties (jusqu\'à 100)' : 'Plus de parties ★'}</button></div>` : '<p class="note">Historique complet chargé (jusqu\'à 100 parties).</p>'}</div>`;
}
/* ---------- Agents & cartes ---------- */
function aggTable(A, first, img) {
  return `<div class="tbl"><table><thead><tr><th>${first}</th><th>Parties</th><th>Victoires</th><th>K/D</th><th>ACS</th><th>ADR</th><th>Tête</th><th>DDΔ</th></tr></thead><tbody>
  ${A.map(a => `<tr><td class="nm">${img(a.key)}<b>${esc(a.key)}</b></td><td>${a.n}</td><td><span class="${rateCls(a.w, a.n) || ''}" title="${esc(rateTip(a.w, a.n))}">${pc0(a.wr)}</span><div class="bar"><i style="width:${a.wr || 0}%"></i></div></td><td>${fmt(a.kd, 2)}</td><td>${fmt(a.acs, 0)}</td><td>${fmt(a.adr, 0)}</td><td>${pc0(a.hsP)}</td><td>${sg(a.dd, 0)}</td></tr>`).join('')}</tbody></table></div>`;
}
function tabAgents() {
  const A = aggBy(APP.prof.rows, 'agent'), roles = {}; A.forEach(a => { const r = ROLE_OF[a.key] || '?'; roles[r] = (roles[r] || 0) + a.n; });
  const tot = APP.prof.rows.length || 1;
  return `<div class="card"><div class="card-h"><h2>Agents</h2><span class="muted small">Couleur du taux de victoire seulement quand l'écart à 50 % est sûr</span></div>
    <div class="roles">${Object.entries(roles).sort((a, b) => b[1] - a[1]).map(([r, n]) => `<span class="pill">${esc(ROLE_FR[r] || r)} ${Math.round(n / tot * 100)} %</span>`).join('')}</div>
    ${aggTable(A, 'Agent', a => agImg(a))}
    ${featOn('perso', APP.plan, APP.cfg) ? `<p class="note">Astuce : Personnaliser › « Agent au choix » pour mettre l'interface aux couleurs de n'importe quel agent.</p>` : ''}</div>`;
}
function tabCartes() {
  const A = aggBy(APP.prof.rows, 'map');
  return `<div class="maps">${A.map(a => { const t = rateCls(a.w, a.n); return `<div class="card mapc" style="--mbg:url('${IMG.map(a.key, 'listviewicon')}')"><div class="mapc-in"><h3>${esc(a.key)}</h3>
    <b class="${t || ''}" title="${esc(rateTip(a.w, a.n))}">${pc0(a.wr)}</b><small>${a.n} parties · ${a.w} V · ${a.l} D</small>
    <p class="small">K/D ${fmt(a.kd, 2)} · ACS ${fmt(a.acs, 0)} · ${pc0(a.hsP)} tête</p>${t === 'ok' ? '<span class="pill ok">Ta force</span>' : t === 'bad' ? '<span class="pill bad">À travailler</span>' : ''}</div></div>`; }).join('')}</div>`;
}

/* ---------- Détails des parties (Visée, Coach, KAST) ---------- */
async function detNeed() {
  if (APP.detBusy) return; const P = APP.prof, before = (APP.D || []).length;
  APP.D = await detAll(P); APP.M = wpFit(APP.D);
  if (APP.D.length !== before && APP.prof === P) return renderTab(); // détails déjà gardés : réaffiche (KAST, visée, coach), puis rappelle detNeed
  const want = featOn('visee', APP.plan, APP.cfg) || featOn('coach', APP.plan, APP.cfg) ? 15 : 0;
  if (!want || P.demo || !apiReady() || APP.D.length >= Math.min(want, P.rows.length) || APP.detTried === P.rid) return;
  APP.detBusy = true; APP.detTried = P.rid;
  const n = await detFill(P, want, (i, t) => { const s = $('#detProg'); if (s) s.textContent = `Analyse des parties : ${i}/${t}…`; });
  APP.detBusy = false;
  if (n) { APP.D = await detAll(P); APP.M = wpFit(APP.D); if (APP.prof === P) renderTab(); }
}
const meIdx = d => d.pl.findIndex(p => p.n === 'moi');
function detWait(min = 3) {
  const D = APP.D || [];
  if (D.length >= min) return '';
  return `<div class="card"><h2>Analyse en cours</h2><p id="detProg">${APP.prof.demo ? '' : apiReady() ? 'Récupération du détail de tes parties (1 toutes les 2 s)…' : 'Service indisponible.'}</p><p class="note">Il faut au moins ${min} parties détaillées. Elles sont gardées : la prochaine fois, c'est immédiat.</p></div>`;
}

/* ---------- Visée ★ ---------- */
function tabVisee() {
  const w = detWait(); if (w) return w;
  const D = APP.D, ds = duelStats(D, meIdx), W = weaponStats(D, 'moi').filter(x => GUN[x.w]).slice(0, 8), R = APP.prof.rows, A = rowsAgg(R), S = ST.get('sens', {dpi:800, sens:.4});
  const cm = S.dpi > 0 && S.sens > 0 ? 2.54 * 360 / (S.dpi * S.sens * .07) : null, hint = sensHint(ds, cm);
  const band = (b, i) => { const t = rateCls(b[1], b[0]); return `<div class="band"><span>${esc(BAND_FR[i])}</span><b class="${t || ''}">${b[0] ? pc0(b[1] / b[0] * 100) : '—'}</b><small title="${esc(rateTip(b[1], b[0]))}">${b[1]}/${b[0]} duels</small><div class="bar"><i style="width:${b[0] ? b[1] / b[0] * 100 : 0}%"></i></div></div>`; };
  const hsSeries = R.slice(0, 30).reverse().map(r => { const s = r.hs + r.bs + r.ls; return s ? r.hs / s * 100 : null; }).filter(v => v != null);
  const dir = hint.dir > 0 ? 'un peu plus haute (+5 à 10 %)' : hint.dir < 0 ? 'un peu plus basse (−5 à 10 %)' : '';
  return `<div class="grid g2">
  <div class="card"><h2>Duels selon la distance</h2><p class="muted small">Duels à l'arme sur ${D.length} parties détaillées (capacités exclues). Couleur seulement si l'écart à 50 % est sûr.</p>
    <div class="bands">${ds.b.map(band).join('')}</div>
    <p class="mt8">Duels d'ouverture : <b class="${rateCls(ds.op[1], ds.op[0]) || ''}">${ds.op[0] ? pc0(ds.op[1] / ds.op[0] * 100) : '—'}</b> <span class="muted small">(${ds.op[1]}/${ds.op[0]})</span> · Tous les duels : <b>${ds.all[0] ? pc0(ds.all[1] / ds.all[0] * 100) : '—'}</b></p></div>
  <div class="card"><h2>Précision</h2><div class="kpis">
    <div class="kpi"><span>Tête</span><b>${pc0(A.hsP)}</b><small>des balles touchées</small></div><div class="kpi"><span>Corps</span><b>${pc0(A.sh ? (A.sh - A.hs - A.ls) / A.sh * 100 : null)}</b></div><div class="kpi"><span>Jambes</span><b>${pc0(A.lsP)}</b><small>${A.lsP > 12 ? 'viseur trop bas' : 'ok'}</small></div></div>
    <p class="lbl mt">Tête % sur tes ${hsSeries.length} dernières parties</p>${spark(hsSeries)}</div>
  <div class="card"><h2>Armes</h2><div class="tbl"><table><thead><tr><th>Arme</th><th>Kills</th><th>Morts</th><th>K/D</th><th>1er kill</th></tr></thead><tbody>
    ${W.map(x => `<tr><td><b>${esc(x.w)}</b> <small class="muted">${esc(GUN[x.w] || '')}</small></td><td>${x.k}</td><td>${x.d}</td><td>${fmt(x.d ? x.k / x.d : x.k, 2)}</td><td>${x.fk}</td></tr>`).join('') || '<tr><td colspan="5">—</td></tr>'}</tbody></table></div></div>
  <div class="card"><h2>Sensibilité</h2>
    <div class="row"><div><label class="lbl" for="sDpi">DPI de ta souris</label><input id="sDpi" type="number" min="100" max="32000" step="50" value="${esc(S.dpi)}" data-sens="dpi"></div><div><label class="lbl" for="sSens">Sensibilité en jeu</label><input id="sSens" type="number" min="0.01" max="10" step="0.001" value="${esc(S.sens)}" data-sens="sens"></div></div>
    <p class="mt8">Un tour complet = <b>${cm ? fmt(cm, 1) + ' cm' : '—'}</b> de tapis${cm ? ` (eDPI ${Math.round(S.dpi * S.sens)})` : ''}. ${hint.zone === 'haute' ? 'C\'est très rapide (la plupart des joueurs sont entre 30 et 75 cm).' : hint.zone === 'basse' ? 'C\'est très lent : les duels proches deviennent durs.' : cm ? 'Zone habituelle.' : ''}</p>
    <div class="infobox">${dir ? `Piste : essaie une sensibilité <b>${dir}</b> pendant 8 parties (${hint.why === 'proche' ? 'tu perds tes duels proches' : hint.why === 'loin' ? 'tu perds tes duels de loin' : 'ta sensibilité est hors de la zone habituelle'}).` : 'Rien ne montre à coup sûr qu\'il faut changer ta sensibilité : garde-la.'}</div></div>
  </div>`;
}
function spark(v, w = 300, h = 46) {
  if (v.length < 2) return empty('Pas assez de parties.');
  const lo = Math.min(...v), hi = Math.max(...v), sp = Math.max(1, hi - lo), x = i => 4 + i * (w - 8) / (v.length - 1), y = a => 4 + (h - 8) * (1 - (a - lo) / sp);
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return `<svg viewBox="0 0 ${w} ${h}" class="spark" role="img" aria-label="Évolution, moyenne ${fmt(m, 0)} %"><line x1="0" x2="${w}" y1="${y(m)}" y2="${y(m)}" class="gl"/><polyline points="${v.map((a, i) => `${x(i).toFixed(1)},${y(a).toFixed(1)}`).join(' ')}" fill="none" stroke="var(--accent-t)" stroke-width="2"/></svg>`;
}

/* ---------- Progression ★ ---------- */
function tabProg() {
  const P = APP.prof, R = P.rows, W = {}; R.forEach(r => (W[weekStart(r.date)] = W[weekStart(r.date)] || []).push(r));
  const weeks = Object.entries(W).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 10);
  const S = sessionsOf(R), st = nthStats(S.map(s => s.map(r => r.res))), lim = nightLimit(st);
  const hhmm = ts => { const x = new Date(ts); return String(x.getHours()).padStart(2, '0') + ':' + String(x.getMinutes()).padStart(2, '0'); }, hb = [0, 1, 2, 3].map(i => rowsAgg(R.filter(r => hourBucket(hhmm(r.ts)) === i)));
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => rowsAgg(R.filter(r => (new Date(r.ts).getDay() + 6) % 7 === i)));
  return `<div class="card"><div class="card-h"><h2>Courbe de RR</h2><span class="muted small">${P.hist.length} parties</span></div>${rrSvg(P.hist, 1100, 240)}</div>
  <div class="grid g2 mt">
  <div class="card"><h2>Tes semaines</h2><div class="tbl"><table><thead><tr><th>Semaine du</th><th>Parties</th><th>Victoires</th><th>K/D</th><th>ACS</th><th>Tête</th></tr></thead><tbody>
    ${weeks.map(([w, a]) => { const x = rowsAgg(a); return `<tr><td>${dFr(Date.parse(w + 'T12:00:00'), {day:'numeric', month:'short'})}</td><td>${x.n}</td><td class="${rateCls(x.w, x.n) || ''}">${pc0(x.wr)}</td><td>${fmt(x.kd, 2)}</td><td>${fmt(x.acs, 0)}</td><td>${pc0(x.hsP)}</td></tr>`; }).join('')}</tbody></table></div></div>
  <div class="card"><h2>Ta limite par session</h2><p class="muted small">${S.length} sessions (parties à moins de 3 h d'écart). Taux de victoire selon le numéro de la partie dans la session.</p>
    <div class="bands">${st.map((x, i) => `<div class="band"><span>${i < st.length - 1 ? `${i + 1}${i ? 'e' : 're'} partie` : `${i + 1}e et +`}</span><b class="${rateCls(x[1], x[0]) || ''}">${x[0] ? pc0(x[1] / x[0] * 100) : '—'}</b><small title="${esc(rateTip(x[1], x[0]))}">${x[1]}/${x[0]}</small><div class="bar"><i style="width:${x[0] ? x[1] / x[0] * 100 : 0}%"></i></div></div>`).join('')}</div>
    <div class="infobox">${lim ? `Au-delà de <b>${lim} partie${lim > 1 ? 's' : ''}</b> dans la même session, tu perds nettement plus souvent : arrête-toi là.` : 'Pas de baisse sûre selon le nombre de parties : continue à jouer tant que tu te sens bien.'}</div></div>
  <div class="card"><h2>Heures</h2>${HOURS.map((n, i) => `<div class="band"><span>${n}</span><b class="${rateCls(hb[i].w, hb[i].n) || ''}">${pc0(hb[i].wr)}</b><small>${hb[i].n} parties · ACS ${fmt(hb[i].acs, 0)}</small><div class="bar"><i style="width:${hb[i].wr || 0}%"></i></div></div>`).join('')}</div>
  <div class="card"><h2>Jours</h2>${JOURS.map((n, i) => `<div class="band"><span>${n}</span><b class="${rateCls(days[i].w, days[i].n) || ''}">${pc0(days[i].wr)}</b><small>${days[i].n} parties</small><div class="bar"><i style="width:${days[i].wr || 0}%"></i></div></div>`).join('')}</div>
  </div>`;
}

/* ---------- Coach ★ ---------- */
function coachStats() {
  const D = APP.D || [], ds = duelStats(D, meIdx), P = {};
  ['sc', 'dmg', 'kd', 'hs'].forEach(f => { const x = lobbyPct(D, 'moi', f); P[f] = x ? x.p : null; });
  let fd = 0, r = 0, tr = 0, dd = 0, kast = 0;
  D.forEach(d => { const i = meIdx(d), o = pDetail(d, i), l = plLines(d)[i]; if (!o || !l) return; fd += o.fd; r += o.r; tr += l.trd; dd += d.pl[i].d; kast += l.kast * o.r / 100; });
  return {n:D.length, pct:P, op:ds.op, fd:r ? fd / r : null, tr:dd ? tr / dd * 100 : null, kast:r ? kast / r * 100 : null, b:ds.b, place:lobbyPlace(D, 'moi')};
}
function tabCoach() {
  const w = detWait(); if (w) return w;
  const s = coachStats(), items = coachPub(s), lp = s.place, P = s.pct;
  const pbar = (n, v) => `<div class="band"><span>${n}</span><b class="${v == null ? '' : v >= 60 ? 'ok' : v < 40 ? 'bad' : ''}">${v == null ? '—' : `mieux que ${Math.round(v)} %`}</b><small>des joueurs de tes parties</small><div class="bar"><i style="width:${v || 0}%"></i></div></div>`;
  const strong = [['sc', 'Score de combat'], ['dmg', 'Dégâts'], ['kd', 'Kills − morts'], ['hs', 'Tête %']].filter(([k]) => P[k] != null && P[k] >= 65);
  return `<div class="grid g2">
  <div class="card"><h2>Ta place dans tes parties</h2><p class="muted small">${s.n} parties détaillées, comparé aux 9 autres joueurs de chaque partie (anonymes).</p>
    ${lp ? `<div class="kpis"><div class="kpi"><span>Place moyenne</span><b>${fmt(lp.place, 1)}<small>/10</small></b></div><div class="kpi"><span>MVP de la partie</span><b>${pc0(lp.mvp)}</b></div><div class="kpi"><span>Meilleur de ton équipe</span><b>${pc0(lp.top)}</b></div><div class="kpi"><span>KAST</span><b>${pc0(s.kast)}</b></div></div>` : ''}
    <div class="bands mt8">${pbar('Score de combat', P.sc)}${pbar('Dégâts', P.dmg)}${pbar('Kills − morts', P.kd)}${pbar('Tête %', P.hs)}</div></div>
  <div class="card"><h2>Tes priorités</h2>${items.map(x => `<div class="coach"><span class="lvl lvl${x.lvl}">${x.lvl === 3 ? 'Priorité' : x.lvl === 2 ? 'Important' : 'Conseil'}</span><div><b>${esc(x.t)}</b><p>${esc(x.why)}</p><p class="fix">→ ${esc(x.fix)}</p></div></div>`).join('')}
    ${strong.length ? `<p class="mt8"><b>Tes forces</b> : ${strong.map(([, n]) => esc(n)).join(', ')}.</p>` : ''}</div>
  <div class="card"><h2>Ton plan de la semaine</h2><ol class="plan">${items.slice(0, 3).map(x => (DRILL[x.k] || DRILL.ok).slice(0, 2).map(d => `<li>${esc(d)} <small class="muted">(${esc(x.t)})</small></li>`).join('')).join('')}</ol>
    <p class="note">Les exercices se font en Range, en Deathmatch ou avec un aim trainer gratuit. Le coach se met à jour tout seul après tes parties.</p></div>
  </div>`;
}

/* ---------- Comparer ★ ---------- */
function tabComparer() {
  const C = APP.cmp, P = APP.prof;
  const form = `<form id="cmpForm" class="row" autocomplete="off"><input id="cmpRiot" placeholder="Riot ID de ton ami (Pseudo#TAG)" maxlength="30" value="${esc(C ? C.riot : '')}" aria-label="Riot ID de ton ami"><button class="btn" type="submit">Comparer</button></form>
    <label class="chk small mt8"><input type="checkbox" id="cmpOk"> Mon ami est d'accord pour que je regarde ses stats.</label>`;
  if (!C) return `<div class="card"><h2>Comparer avec un ami</h2>${form}<p class="note">Même région que toi. Ses 20 dernières parties classées.</p></div>`;
  const a = rowsAgg(P.rows.slice(0, 20)), b = rowsAgg(C.rows.slice(0, 20)), la = aggBy(P.rows, 'agent')[0], lb = aggBy(C.rows, 'agent')[0];
  const line = (n, x, y, d = 1, low) => { const bx = x != null && y != null && (low ? x < y : x > y), by = x != null && y != null && (low ? y < x : y > x); return `<tr><td>${n}</td><td class="${bx ? 'best' : ''}">${x == null ? '—' : fmt(x, d)}</td><td class="${by ? 'best' : ''}">${y == null ? '—' : fmt(y, d)}</td></tr>`; };
  return `<div class="card"><h2>Toi contre ${esc(C.name)}</h2>${form}
  <div class="tbl mt"><table class="cmp"><thead><tr><th></th><th>${esc(P.name)}</th><th>${esc(C.name)}</th></tr></thead><tbody>
    <tr><td>Rang</td><td>${esc(tierFr(P.mmr.tier))}</td><td>${esc(tierFr(C.mmr.tier))}</td></tr>
    ${line('Victoires %', a.wr, b.wr, 0)}${line('K/D', a.kd, b.kd, 2)}${line('ACS', a.acs, b.acs, 0)}${line('ADR', a.adr, b.adr, 0)}${line('Tête %', a.hsP, b.hsP, 1)}${line('DDΔ', a.dd, b.dd, 0)}${line('Kills / round', a.kpr, b.kpr, 2)}
    <tr><td>Agent principal</td><td>${la ? agImg(la.key) + ' ' + esc(la.key) : '—'}</td><td>${lb ? agImg(lb.key) + ' ' + esc(lb.key) : '—'}</td></tr></tbody></table></div>
  <p class="note">Sur les 20 dernières parties classées de chacun. En gras : le meilleur.</p></div>`;
}

/* ---------- Rapport d'une partie (fenêtre) ---------- */
async function openReport(id) {
  const P = APP.prof, r = P.rows.find(x => x.id === id); if (!r) return;
  if (!(featOn('rapports', APP.plan, APP.cfg) || (featOn('dernier', APP.plan, APP.cfg) && id === P.rows[0].id))) return premiumOpen('rapports');
  dlgOpen(`<p class="muted">Chargement du rapport…</p>`);
  let d = null; try { d = await detGet(P, id); } catch (e) { return dlgOpen(`<h2>Rapport indisponible</h2><p>${esc(e.message)}</p>`); }
  if (!d) return dlgOpen(`<h2>Rapport indisponible</h2><p>Le détail de cette partie n'est pas disponible.</p>`);
  const D = await detAll(P); if (!D.some(x => x.id === d.id)) D.push(d);
  const M = wpFit(D), me = meIdx(d), S = matchSum(d, M, me), L = S.me;
  const nm = i => i === me ? 'Toi' : d.pl[i] ? `${d.pl[i].a}${d.pl[i].t === 1 ? ' (allié)' : ' (adverse)'}` : '?';
  const pc = x => `${Math.round(x * 100)} %`, cats = Object.entries(S.cats).filter(([, v]) => Math.abs(v) >= .15).sort((a, b) => b[1] - a[1]);
  const mine = Object.entries(S.mine).filter(([, v]) => Math.abs(v) >= .1).sort((a, b) => a[1] - b[1]);
  const ev = e => e.killer == null ? '' : `${e.killer === me ? `<b>Tu</b> tues ${esc(nm(e.victim))}` : `${esc(nm(e.killer))} te tue`} (${e.st}, ${e.t} s${e.w ? ', ' + esc(e.w) : ''})`;
  const strip = S.F.map(f => { const x = f.r; return `<span class="rd ${x.w ? 'W' : 'L'}${f.thrown || f.stolen ? ' hot' : ''}${f.i === 12 ? ' half' : ''}" title="${esc(`Round ${f.i + 1} · ${x.w ? 'gagné' : 'perdu'} (${END_FR[x.e]}) · chances au départ ${pc(f.p0)} · max ${pc(f.mx)} · min ${pc(f.mn)}\nAchats : vous ${f.i === 0 || f.i === 12 ? 'pistol' : BUY_FR[BUYK(x.ol)]} · eux ${f.i === 0 || f.i === 12 ? 'pistol' : BUY_FR[BUYK(x.tl)]}${x.p ? `\nSpike posé en ${x.p} par ${x.pu === 1 ? 'vous' : 'eux'}` : ''}`)}">${f.i + 1}<small>${pc(f.p0)}</small></span>`; }).join('');
  const row = l => { const v = S.imp[l.i] || 0; return `<tr class="${l.i === me ? 'me' : ''}"><td class="nm">${agImg(l.p.a)}${esc(nm(l.i))}</td><td>${l.p.tr > 2 ? `<img class="rki" src="${IMG.rank(l.p.tr)}" alt="${esc(tierFr(l.p.tr))}" title="${esc(tierFr(l.p.tr))}">` : '—'}</td><td class="${v >= 0 ? 'up' : 'down'}">${sg(v)}</td><td>${fmt(l.rating, 2)}</td><td>${l.p.k}/${l.p.d}/${l.p.as}</td><td>${fmt(l.acs, 0)}</td><td>${fmt(l.kast, 0)} %</td><td>${l.fk}-${l.fd}</td></tr>`; };
  const tb = t => `<div class="tbl"><table class="small"><thead><tr><th>Joueur</th><th>Rang</th><th>Impact</th><th>Rating</th><th>K/D/A</th><th>ACS</th><th>KAST</th><th>FK-FD</th></tr></thead><tbody>${S.L.filter(l => l.p.t === t).sort((a, b) => (S.imp[b.i] || 0) - (S.imp[a.i] || 0)).map(row).join('')}</tbody></table></div>`;
  dlgOpen(`<div class="rep-h" style="--mbg:url('${IMG.map(d.map)}')"><div>${agImg(r.agent, 'ag lg')}</div><div><p class="muted small">${dFr(r.ts, {weekday:'long', day:'numeric', month:'long'})} · ${hFr(r.ts)} · ${esc(d.map)}</p>
      <h2 class="score ${r.res}">${r.res === 'W' ? 'Victoire' : r.res === 'L' ? 'Défaite' : 'Égalité'} ${r.us}-${r.them}</h2>
      <p>${S.place === 1 ? '<span class="pill ok">MVP de la partie</span> ' : S.teamTop ? '<span class="pill ok">Meilleur de ton équipe</span> ' : ''}${S.place}<sup>e</sup> sur ${d.pl.length} au score</p></div></div>
    ${L ? `<div class="kpis mt8"><div class="kpi"><span>Rating</span><b>${fmt(L.rating, 2)}</b></div><div class="kpi"><span>Impact</span><b class="${S.myImp >= 0 ? 'up' : 'down'}">${sg(S.myImp)}</b><small>rounds</small></div><div class="kpi"><span>K/D/A</span><b>${L.p.k}/${L.p.d}/${L.p.as}</b></div><div class="kpi"><span>ACS</span><b>${fmt(L.acs, 0)}</b></div><div class="kpi"><span>KAST</span><b>${fmt(L.kast, 0)} %</b></div><div class="kpi"><span>FK-FD</span><b>${L.fk}-${L.fd}</b></div><div class="kpi"><span>3K+</span><b>${L.mk}</b></div><div class="kpi"><span>Tête</span><b>${L.hs == null ? '—' : fmt(L.hs, 0) + ' %'}</b></div></div>` : ''}
    <p class="mt"><b>${S.won} rounds gagnés pour ${fmt(S.exp)} attendus</b> d'après les achats des deux équipes (${sg(S.won - S.exp)}). ${S.won - S.exp >= 0 ? 'Ton équipe a fait mieux que prévu.' : 'Ton équipe a fait moins bien que prévu.'}</p>
    <div class="grid g2 mt8"><div><h3>D'où viennent les rounds (équipe)</h3>${cats.map(([c, v]) => `<div class="band"><span>${esc(CAT_FR[c])}</span><b class="${v >= 0 ? 'up' : 'down'}">${sg(v)}</b><div class="bar ${v < 0 ? 'neg' : ''}"><i style="width:${Math.min(100, Math.abs(v) * 40)}%"></i></div></div>`).join('') || empty('Rien de marquant.')}</div>
      <div><h3>Ton impact par phase</h3>${mine.map(([c, v]) => `<div class="band"><span>${esc(CAT_FR[c])}</span><b class="${v >= 0 ? 'up' : 'down'}">${sg(v)}</b><div class="bar ${v < 0 ? 'neg' : ''}"><i style="width:${Math.min(100, Math.abs(v) * 50)}%"></i></div></div>`).join('') || empty('Peu d\'actions décisives.')}</div></div>
    <h3 class="mt">Tes moments clés</h3><ol class="keys">${S.key.map(k => `<li>R${k.r + 1} · ${ev(k.e)} : <b class="${k.e.pa >= k.e.pb ? 'up' : 'down'}">${pc(k.e.pb)} → ${pc(k.e.pa)}</b> pour ton équipe</li>`).join('') || '<li>—</li>'}</ol>
    <h3 class="mt">Rounds <small class="muted">(chances de gagner au départ ; survole pour le détail ; contour = round jeté ou volé)</small></h3><div class="rds">${strip}</div>
    ${S.thrown.length ? `<p class="small mt8"><b class="down">Rounds jetés</b> (perdus avec 75 % de chances ou plus) : ${S.thrown.map(f => 'R' + (f.i + 1)).join(', ')}</p>` : ''}
    ${S.stolen.length ? `<p class="small"><b class="up">Rounds volés</b> (gagnés à 25 % ou moins) : ${S.stolen.map(f => 'R' + (f.i + 1)).join(', ')}</p>` : ''}
    <h3 class="mt">Ton équipe</h3>${tb(1)}<h3>Adversaires</h3>${tb(0)}
    <p class="note">Joueurs anonymes. Impact = rounds gagnés ou perdus par tes kills et tes morts, d'après un modèle appris sur tes parties.</p>`);
}

/* ---------- Offres Premium, code, fenêtre ---------- */
function premiumOpen(f) {
  const C = APP.cfg, why = f && FEATURES[f] ? `<div class="infobox">★ <b>${esc(FEATURES[f].n)}</b> fait partie de Premium.</div>` : '';
  dlgOpen(`<h2>Premium</h2>${why}${pricingHtml().replace('class="pricing mt"', 'class="pricing"')}${codeHtml()}`);
}
function codeHtml() {
  return `<div class="card mt"><h3>J'ai un code</h3><div class="row"><input id="licIn" placeholder="PH1.…" aria-label="Ton code Premium" autocomplete="off"><button class="btn" data-act="licEnter">Activer</button></div>
    <p class="note">Le code est lié au Riot ID ${APP.prof && !APP.prof.demo ? `<b>${esc(APP.prof.riot)}</b>` : 'donné à l\'achat'}. Il est gardé dans ce navigateur.</p><p id="licOut" class="small" role="status"></p></div>`;
}
function dlgOpen(html) { const d = $('#dlg'); $('#dlgIn').innerHTML = `<button class="btn ghost sm dlg-x" data-act="dlgClose" aria-label="Fermer">✕</button>${html}`; if (!d.open) d.showModal(); d.scrollTop = 0; }
