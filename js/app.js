"use strict";
/* ================= SITE PUBLIC : état, démarrage, licences, actions =================
   Réglages : config.json (publié avec le site), puis réglages en direct du serveur (proxy/config) qui ne peuvent jamais changer
   la clé de vérification des licences ni l'adresse du serveur. En test local, le brouillon du mode Dieu (psh_pubcfg) est utilisé. */
const APP = {cfg:pubCfg(null), prof:null, plan:'free', lic:null, tab:'vue', D:null, M:null, cmp:null, filt:null, local:false, detTried:'', detBusy:false};
const LOCAL = /^(file:|http:\/\/localhost|http:\/\/127\.)/.test(location.href);

function toast(msg, err, action) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  if (action) { const b = document.createElement('button'); b.className = 'btn sm'; b.textContent = action.label; b.onclick = () => { action.fn(); t.remove(); }; t.appendChild(b); }
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), action ? 9000 : 4500);
}
function statut(t) { const s = $('#statut'); if (!s) return; s.textContent = t || ''; s.hidden = !t; }
async function copyText(t, msg = 'Copié !') { try { await navigator.clipboard.writeText(t); toast(msg); } catch (e) { toast('Copie impossible : sélectionne le texte et fais Ctrl+C', true); } }

/* ---------- Réglages du site ---------- */
async function loadCfg() {
  let base = null;
  if (LOCAL) { try { base = JSON.parse(localStorage.getItem('psh_pubcfg') || 'null'); APP.local = !!base; } catch (e) {} } // brouillon du mode Dieu (test local)
  if (!base) { try { const r = await fetch('config.json', {cache:'no-store'}); if (r.ok) base = await r.json(); } catch (e) {} }
  APP.cfg = pubCfg(base);
  if (APP.cfg.proxy) { try { const r = await fetch(proxyUrl(APP.cfg.proxy, '/config'), {cache:'no-store'}); if (r.ok) APP.cfg = pubCfg(await r.json(), APP.cfg, true); } catch (e) { console.warn('Réglages en direct indisponibles', e); } }
}
function applyCfg() {
  const C = APP.cfg; document.title = `${C.nom} : ton tracker perso`;
  $('#siteNom').textContent = C.nom; $('#logoM').textContent = (C.nom[0] || 'P').toUpperCase(); $('#footNom').textContent = C.nom;
  const a = $('#annonce'); a.hidden = !C.annonce && !APP.local; a.innerHTML = `${C.annonce ? esc(C.annonce) : ''}${APP.local ? `${C.annonce ? ' · ' : ''}<b>Test local</b> : réglages du brouillon du mode Dieu.` : ''}`;
  $('#premBtn').hidden = C.freeAll;
}

/* ---------- Licences ---------- */
const licCodes = () => { const o = ST.get('lic', {}); return o && typeof o === 'object' ? o : {}; };
function dieuLocal() { try { return LOCAL ? localStorage.getItem('psh__dieu_lic') || '' : ''; } catch (e) { return ''; } } // test local : licence Dieu créée par le hub
async function licRefresh() {
  APP.plan = 'free'; APP.lic = null; const C = licCodes(), rid = APP.prof ? APP.prof.rid : '';
  if (APP.prof && APP.prof.demo) { APP.plan = 'premium'; return; }
  if (!LIC.ok() || !APP.cfg.licKey) return;
  for (const code of [dieuLocal(), C['*'], rid && C[rid]].filter(Boolean)) { // la licence Dieu passe avant un code Premium
    const v = await LIC.verify(APP.cfg.licKey, code); if (!v.p) continue;
    const c = licCheck(v.p, APP.prof ? APP.prof.riot : '', today(), APP.cfg.revoked);
    if (c.ok) { APP.plan = c.plan; APP.lic = c; return; }
    if (c.why === 'expiree' && APP.prof) toast(`Ton Premium a expiré le ${c.exp}. Merci d'avoir soutenu le site !`, false, {label:'Renouveler', fn:() => premiumOpen()});
  }
}
async function licEnter() {
  const code = ($('#licIn') || {}).value || '', out = $('#licOut'), say = (t, bad) => { if (out) { out.textContent = t; out.className = 'small ' + (bad ? 'down' : 'up'); } };
  if (!APP.cfg.licKey) return say(LIC_WHY.cle, true);
  const v = await LIC.verify(APP.cfg.licKey, code); if (!v.p) return say(LIC_WHY[v.err] || LIC_WHY.format, true);
  if (v.p.rid !== '*' && (!APP.prof || APP.prof.demo)) { const C = licCodes(); C[v.p.rid] = code.replace(/\s+/g, ''); ST.set('lic', C); return say(`Code valable pour ${v.p.rid}. Ouvre ce profil : Premium s'activera tout seul.`); }
  const c = licCheck(v.p, APP.prof ? APP.prof.riot : '', today(), APP.cfg.revoked); if (!c.ok) return say(LIC_WHY[c.why], true);
  const C = licCodes(); C[v.p.rid] = code.replace(/\s+/g, ''); ST.set('lic', C);
  await licRefresh(); say(`${APP.plan === 'dieu' ? 'Mode Dieu' : 'Premium'} activé${c.exp ? ` jusqu'au ${c.exp}` : ' à vie'}. Merci !`);
  setTimeout(() => { $('#dlg').close(); themeRefresh(); render(); toast('★ Tout est débloqué'); }, 900);
}

/* ---------- Profil ---------- */
async function openProfile(riot, region, opt = {}) {
  if (!splitRiot(riot)) return toast('Écris ton Riot ID en entier : Pseudo#TAG', true);
  if (!apiReady()) return keyAsk(riot, region);
  document.body.classList.add('busy');
  try {
    const P = await loadProfile(riot, region, opt);
    if (!APP.prof || APP.prof.rid !== P.rid) { APP.tab = 'vue'; APP.filt = null; APP.cmp = null; APP.D = null; APP.detTried = ''; }
    APP.prof = P; ST.set('last', {riot:P.riot, region:P.region});
    await licRefresh(); themeRefresh(); render(); window.scrollTo(0, 0);
  } catch (e) { statut(''); if (e.code === 'nokey') keyAsk(riot, region); else if (!opt.quiet) toast(e.message, true); else render(); }
  document.body.classList.remove('busy');
}
async function openDemo() { APP.prof = demoProfile(); APP.tab = 'vue'; APP.filt = null; APP.cmp = null; APP.D = null; await licRefresh(); themeRefresh(); render(); window.scrollTo(0, 0); }
function render() {
  if (APP.cfg.maintenance && APP.plan !== 'dieu') { $('#app').innerHTML = `<div class="card teaser"><div class="tz-ic">🛠️</div><h2>Maintenance</h2><p class="lead">${esc(APP.cfg.nom)} revient très vite. ${esc(APP.cfg.annonce)}</p></div>`; return; }
  if (!APP.prof) renderLanding(); else renderProfile();
  const P = APP.prof; $('#qRiot').value = P && !P.demo ? P.riot : ''; if (P && !P.demo) $('#qReg').value = P.region;
}
function keyAsk(riot, region) {
  dlgOpen(`<h2>Il manque le service de données</h2><p>${esc(APP.cfg.nom)} n'a pas encore son serveur. En attendant, tu peux utiliser ta propre clé <b>HenrikDev</b> (gratuite, 2 minutes) :</p>
    <ol class="plan"><li>Rejoins le Discord de HenrikDev (lien sur <span class="kbd">docs.henrikdev.xyz</span>).</li><li>Salon de vérification, puis génère une clé « Basic ».</li><li>Colle-la ici : elle reste dans ton navigateur.</li></ol>
    <div class="row"><input id="keyIn" placeholder="HDEV-…" autocomplete="off" aria-label="Ta clé HenrikDev"><button class="btn" data-act="keySave">Enregistrer</button></div>
    <p class="note">Ou <a href="#" data-act="demo">regarde la démo</a> en attendant.</p>`);
  APP.pending = {riot, region};
}

/* ---------- Carte de profil à partager (image PNG) ---------- */
function loadImg(src) { return new Promise(res => { if (!src) return res(null); const im = new Image(); if (!src.startsWith('data:')) im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }
async function shareCard(withImg = true) {
  const P = APP.prof, th = TH.last, A = rowsAgg(P.rows.slice(0, 20)), cv = document.createElement('canvas'); cv.width = 1200; cv.height = 630; const g = cv.getContext('2d');
  const ft = (FONTS[th.fontT] || FONTS.teko).css, fb = (FONTS[th.fontB] || FONTS.systeme).css;
  try { await document.fonts.load(`64px ${ft}`); } catch (e) {}
  g.fillStyle = th.bg; g.fillRect(0, 0, 1200, 630);
  if (withImg) {
    const [bgI, por, rk, card] = await Promise.all([loadImg(th.bgImg), loadImg(th.portrait), loadImg(IMG.rank(P.mmr.tier)), loadImg(IMG.card(P.card, 'wideart'))]);
    if (bgI) { const s = Math.max(1200 / bgI.width, 630 / bgI.height); g.globalAlpha = .35; g.drawImage(bgI, (1200 - bgI.width * s) / 2, (630 - bgI.height * s) / 2, bgI.width * s, bgI.height * s); g.globalAlpha = 1; }
    if (card) { g.globalAlpha = .5; g.drawImage(card, 0, 0, 1200, 1200 * card.height / card.width); g.globalAlpha = 1; }
    const gr = g.createLinearGradient(0, 0, 1200, 0); gr.addColorStop(0, rgba(th.bg, .96)); gr.addColorStop(.55, rgba(th.bg, .75)); gr.addColorStop(1, rgba(th.bg, .1)); g.fillStyle = gr; g.fillRect(0, 0, 1200, 630);
    if (por) { const h = 700, w = por.width * h / por.height; g.drawImage(por, 1200 - w * .78, -20, w, h); }
    if (rk) g.drawImage(rk, 60, 250, 96, 96);
  }
  g.fillStyle = th.accent; g.fillRect(0, 0, 10, 630);
  g.fillStyle = '#ffffff'; g.font = `700 92px ${ft}`; const nw = g.measureText(P.name).width; g.fillText(P.name, 60, 150);
  if (!th.streamer) { g.fillStyle = 'rgba(255,255,255,.6)'; g.font = `600 40px ${ft}`; g.fillText('#' + P.tag, 72 + nw, 150); }
  g.fillStyle = th.accentT; g.font = `700 46px ${ft}`; g.fillText(tierFr(P.mmr.tier) + (P.mmr.rr != null ? `  ${P.mmr.rr} RR` : ''), 176, 300);
  g.fillStyle = 'rgba(255,255,255,.7)'; g.font = `500 22px ${fb}`; g.fillText(`${A.n} dernières parties · ${th.label || ''}`, 176, 334);
  const K = [['Victoires', pc0(A.wr)], ['K/D', fmt(A.kd, 2)], ['ACS', fmt(A.acs, 0)], ['Tête', pc0(A.hsP)], ['ADR', fmt(A.adr, 0)]];
  K.forEach(([n, v], i) => { const x = 60 + i * 150, y = 400; g.fillStyle = rgba(th.bg2, .85); g.fillRect(x, y, 136, 110); g.fillStyle = th.accent; g.fillRect(x, y, 136, 4);
    g.fillStyle = 'rgba(255,255,255,.65)'; g.font = `600 17px ${fb}`; g.fillText(n.toUpperCase(), x + 14, y + 34); g.fillStyle = '#fff'; g.font = `700 44px ${ft}`; g.fillText(v, x + 14, y + 86); });
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = `500 18px ${fb}`; g.fillText(`${APP.cfg.nom} · projet de fan, non approuvé par Riot Games`, 60, 590);
  try {
    const blob = await new Promise((res, rej) => { try { cv.toBlob(b => b ? res(b) : rej(new Error('vide')), 'image/png'); } catch (e) { rej(e); } });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `profil-${P.name.replace(/[^\w-]+/g, '_')}.png`; document.body.appendChild(a); a.click(); a.remove();
    try { await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]); toast('Image téléchargée et copiée : colle-la sur Discord avec Ctrl+V'); } catch (e) { toast('Image téléchargée'); }
  } catch (e) { if (withImg) return shareCard(false); toast('Image impossible dans ce navigateur', true); }
}

/* ---------- Actions (boutons data-act="nom:argument") ---------- */
const ACT = {
  accueil:() => { APP.prof = null; APP.plan = 'free'; APP.lic = null; licRefresh().then(() => { themeRefresh(); render(); window.scrollTo(0, 0); }); },
  demo:() => { if ($('#dlg').open) $('#dlg').close(); openDemo(); },
  tab:k => { APP.tab = k; $$('.tabs [role=tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.act === 'tab:' + k)); const tp = $('#tabIn'); if (tp) tp.setAttribute('aria-labelledby', 'tb-' + k); renderTab(); },
  refresh:() => APP.prof && openProfile(APP.prof.riot, APP.prof.region, {force:true, pages:APP.prof.pages}),
  more:() => featOn('historique', APP.plan, APP.cfg) ? openProfile(APP.prof.riot, APP.prof.region, {force:true, pages:5}) : premiumOpen('historique'),
  rapport:id => openReport(id),
  perso:() => persoOpen(),
  persoClose:() => persoClose(),
  accAuto:() => persoSet('accent', ''),
  imgDel:() => { ST.del('img'); persoSet('bg', 'auto'); },
  blk:(arg) => { const [b, dir] = arg.split(':'), t = TH.draft, L = (t.blocks.length ? t.blocks.concat(BLOCKS.filter(x => !t.blocks.includes(x))) : BLOCKS.slice()), i = L.indexOf(b), j = i + +dir;
    if (i < 0 || j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; persoSet('blocks', L); },
  blkHide:b => { const h = TH.draft.hidden.includes(b) ? TH.draft.hidden.filter(x => x !== b) : TH.draft.hidden.concat(b); persoSet('hidden', h); },
  themeCopy:() => copyText($('#pfCode').value, 'Code du thème copié'),
  themeImport:() => { const t = themeParse($('#pfImport').value); if (!t) return toast('Code de thème invalide', true); TH.draft = t; themeRefresh(); persoRender(); toast('Thème appliqué (aperçu)'); },
  themeReset:() => { TH.draft = themeClean({}); themeRefresh(); persoRender(); },
  share:() => featOn('partage', APP.plan, APP.cfg) ? shareCard() : premiumOpen('partage'),
  premium:f => premiumOpen(f),
  codeAsk:() => dlgOpen(codeHtml()),
  licEnter:() => licEnter(),
  dlgClose:() => $('#dlg').close(),
  keySave:() => { const k = ($('#keyIn').value || '').trim(); if (k.length < 10) return toast('Clé trop courte : recopie-la en entier', true); setUserKey(k); $('#dlg').close(); toast('Clé enregistrée dans ce navigateur'); if (APP.pending) openProfile(APP.pending.riot, APP.pending.region); },
  reglages:() => dlgOpen(`<h2>Réglages</h2>
    <h3>Ma clé HenrikDev (facultatif)</h3><p class="note">Seulement si le site est saturé ou sans serveur. Elle reste dans ce navigateur.</p>
    <div class="row"><input id="keyIn" placeholder="${userKey() ? 'Clé enregistrée (••••)' : 'HDEV-…'}" autocomplete="off" aria-label="Clé HenrikDev"><button class="btn" data-act="keySave">Enregistrer</button>${userKey() ? '<button class="btn ghost" data-act="keyDel">Retirer</button>' : ''}</div>
    <h3 class="mt">Premium</h3>${APP.lic ? `<p>${APP.plan === 'dieu' ? 'Mode Dieu' : 'Premium'} actif${APP.lic.exp ? ` jusqu'au ${esc(APP.lic.exp)}` : ' à vie'}.</p>` : '<p class="muted">Pas de code actif sur ce profil.</p>'}${codeHtml()}
    <h3 class="mt">Mes données</h3><p class="note">Profils gardés, détails des parties, thème, codes : tout est dans ce navigateur, nulle part ailleurs.</p>
    <button class="btn ghost" data-act="forget">Oublier toutes mes données</button>`),
  keyDel:() => { setUserKey(''); $('#dlg').close(); toast('Clé retirée'); },
  forget:async () => { if (!confirm('Effacer profils, détails, thème et codes de ce navigateur ?')) return; Object.keys(localStorage).filter(k => k.startsWith(PX)).forEach(k => localStorage.removeItem(k)); await detForget(); location.reload(); }
};
document.addEventListener('click', e => {
  const a = e.target.closest('[data-act]'); if (!a) return; e.preventDefault();
  const [n, ...arg] = a.dataset.act.split(':'); if (ACT[n]) ACT[n](arg.join(':'), a);
});
document.addEventListener('submit', e => {
  e.preventDefault();
  if (e.target.id === 'landForm') { if (!$('#landOk').checked) return toast('Coche « C\'est mon compte » pour continuer', true); ST.set('consent', true); openProfile($('#landRiot').value, $('#landReg').value); }
  if (e.target.id === 'recherche') { if (!ST.get('consent')) { ST.set('consent', true); } openProfile($('#qRiot').value, $('#qReg').value); }
  if (e.target.id === 'cmpForm') {
    if (!$('#cmpOk').checked) return toast('Coche la case : ton ami doit être d\'accord', true);
    loadProfile($('#cmpRiot').value, APP.prof.region).then(p => { APP.cmp = p; statut(''); renderTab(); }).catch(err => { statut(''); toast(err.message, true); });
  }
});
document.addEventListener('change', e => {
  const f = e.target.closest('[data-filt]'); if (f) { APP.filt[f.dataset.filt] = f.value; return renderTab(); }
  const s = e.target.closest('[data-sens]'); if (s) { const S = ST.get('sens', {dpi:800, sens:.4}), v = parseFloat(String(s.value).replace(',', '.')); if (v > 0) { S[s.dataset.sens] = v; ST.set('sens', S); renderTab(); } }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#perso').hidden) persoClose(); });
document.addEventListener('error', e => { if (e.target && e.target.tagName === 'IMG') e.target.classList.add('img-ko'); }, true); // image introuvable : cachée (pas d'attribut onerror : CSP)
$('#dlg').addEventListener('click', e => { if (e.target === $('#dlg')) $('#dlg').close(); }); // clic à côté = fermer

/* ---------- Démarrage ---------- */
(async function boot() {
  $('#qReg').innerHTML = REGIONS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
  await loadCfg(); applyCfg(); await licRefresh(); themeRefresh();
  const last = ST.get('last');
  if (last && last.riot && apiReady()) { render(); openProfile(last.riot, last.region || 'eu', {quiet:true}); } else render();
})();
