"use strict";
/* ================= PERSONNALISATION =================
   Le thème part du profil (agent principal, rôle, rang, carte préférée, carte de joueur) ; les préférences (themeClean, pures.js) le modifient.
   Sans Premium : themeFree (thème automatique + confort). Les réglages Premium restent essayables : aperçu, annulé à la fermeture du panneau.
   Polices Google chargées seulement quand on les choisit ; image perso réduite (JPEG) et gardée dans ce navigateur. */
const TH = {draft:null, fonts:new Set(), last:null};
const DEF_ACCENT = '#ff2e97';
const themeSaved = () => themeClean(ST.get('theme', {}));
const canPerso = () => featOn('perso', APP.plan, APP.cfg);
const themeUsed = () => TH.draft || (canPerso() ? themeSaved() : themeFree(themeSaved()));
function bestMap(rows) { const a = aggBy(rows || [], 'map').filter(x => MAP_ID[x.key]); const ok = a.filter(x => x.n >= 3).sort((x, y) => smooth(y.w, y.n) - smooth(x.w, x.n)); return (ok[0] || a[0] || {}).key || ''; }

function themeCompute(t, prof) {
  const rows = prof ? prof.rows : [], main = mainAgent(rows), last = rows[0] ? rows[0].agent : null, tier = prof ? prof.mmr.tier : 0, has = a => !!(a && (window.KITS || {})[a]);
  let agent = null, map = '', label = '', accent = '';
  if (t.mode === 'auto') { agent = has(main) ? main : null; label = agent ? `${agent}, ton agent principal` : ''; }
  else if (t.mode === 'dernier') { agent = has(last) ? last : null; label = agent ? `${agent}, ton dernier agent joué` : ''; }
  else if (t.mode === 'agent') { agent = has(t.agent) ? t.agent : has(main) ? main : null; label = agent ? `${agent}, choisi par toi` : ''; }
  else if (t.mode === 'rang') { accent = tier ? tierCol(tier) : ''; agent = has(main) ? main : null; label = `ton rang (${tierFr(tier)})`; }
  else if (t.mode === 'carte') { map = MAP_ID[t.map] ? t.map : bestMap(rows); accent = MAP_COL[map] || ''; agent = has(main) ? main : null; label = map ? `ta carte : ${map}` : ''; }
  else if (t.mode === 'cartejoueur') { agent = has(main) ? main : null; label = 'ta carte de joueur'; }
  else if (t.mode === 'perso') { agent = has(t.agent) ? t.agent : has(main) ? main : null; map = MAP_ID[t.map] ? t.map : ''; label = 'tes réglages'; }
  else label = 'neutre';
  const role = ROLE_OF[agent || main] || null, rs = t.mode === 'neutre' ? {} : ROLE_STYLE[role] || {};
  accent = t.accent || accent || (agent && t.mode !== 'neutre' ? AGENT_COL[agent] : '') || DEF_ACCENT;
  const bg = mixHex(accent, '#05060a', .92), bg2 = mixHex(accent, '#0b0c12', .86);
  // fond : selon le mode (auto) ou le choix
  const card = prof && prof.card, custom = ST.get('img', '');
  const src = t.bg !== 'auto' ? t.bg : t.mode === 'carte' ? 'splash' : t.mode === 'cartejoueur' ? 'card' : t.mode === 'neutre' || t.mode === 'rang' ? 'degrade' : t.mode === 'perso' && custom ? 'image' : 'art';
  const mapBg = map || (MAP_ID[t.map] ? t.map : bestMap(rows));
  const bgImg = src === 'art' ? IMG.agent(agent, 'background') : src === 'portrait' ? IMG.agent(agent, 'fullportrait') : src === 'splash' ? IMG.map(mapBg) : src === 'card' ? IMG.card(card, 'largeart')
    : src === 'image' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(custom) ? custom : '';
  return {accent, accentT:readable(accent, bg, 4.5), accent2:mixHex(readable(accent, bg, 4.5), '#ffffff', .25), onAccent:contrast('#ffffff', accent) >= contrast('#0b0710', accent) ? '#ffffff' : '#0b0710',
    bg, bg2, bgImg, bgSrc:src, portrait:t.mode === 'neutre' ? '' : IMG.agent(agent || main, 'fullportrait'), agent, map:mapBg, role,
    fontT:t.fontT === 'auto' ? rs.font || 'teko' : t.fontT, fontB:t.fontB, fx:t.fx === 'auto' ? rs.fx || 'aucun' : t.fx,
    cards:t.cards, radius:t.radius, density:t.density, anim:t.anim, streamer:t.streamer, blur:t.blur, dark:t.dark, label};
}
const rgba = (hex, a) => { const c = hexRgb(hex) || [0, 0, 0]; return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
function fontLoad(k) {
  const f = FONTS[k]; if (!f || !f.g || TH.fonts.has(k)) return; TH.fonts.add(k);
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = `https://fonts.googleapis.com/css2?family=${f.g}&display=swap`; document.head.appendChild(l);
}
function themeApply(th) {
  TH.last = th; const S = document.documentElement.style, B = document.body;
  [['--accent', th.accent], ['--accent-t', th.accentT], ['--accent2', th.accent2], ['--on-accent', th.onAccent], ['--bg', th.bg], ['--bg2', th.bg2],
    ['--card', rgba(th.bg2, th.cards === 'plein' ? 1 : .62)], ['--card-s', th.bg2], ['--soft', rgba(th.accent, .16)], ['--glow', rgba(th.accent, .45)],
    ['--radius', th.radius + 'px'], ['--bg-blur', th.blur + 'px'], ['--voile-a', rgba(th.bg, th.dark / 100)], ['--voile-b', rgba(th.bg, Math.min(1, th.dark / 100 + .18))],
    ['--font-t', (FONTS[th.fontT] || FONTS.teko).css], ['--font-b', (FONTS[th.fontB] || FONTS.systeme).css]].forEach(([k, v]) => S.setProperty(k, v));
  fontLoad(th.fontT); fontLoad(th.fontB);
  B.dataset.fx = th.fx; B.dataset.cards = th.cards; B.dataset.density = th.density; B.classList.toggle('no-anim', !th.anim); B.classList.toggle('streamer', th.streamer);
  const im = document.querySelector('#fond .img'); if (im) { im.style.backgroundImage = th.bgImg ? `url("${th.bgImg}")` : 'none'; im.dataset.src = th.bgSrc; }
  const mt = document.getElementById('metaTheme'); if (mt) mt.content = th.bg;
}
function themeRefresh() { themeApply(themeCompute(themeUsed(), APP.prof)); }

/* ---------- Panneau « Personnaliser » ---------- */
function persoOpen() { TH.draft = themeClean(canPerso() ? themeSaved() : themeFree(themeSaved())); $('#perso').hidden = false; document.body.classList.add('drawer-on'); persoRender(); setTimeout(() => { const f = $('#perso [data-pf]'); if (f) f.focus(); }, 50); }
function persoClose() {
  if ($('#perso').hidden) return;
  const prem = themeDiff(TH.draft);
  if (canPerso()) ST.set('theme', TH.draft); else { ST.set('theme', themeFree(TH.draft)); if (prem.length) toast('Aperçu terminé : passe Premium pour garder ce thème.', false, {label:'Voir Premium', fn:() => premiumOpen('perso')}); }
  TH.draft = null; $('#perso').hidden = true; document.body.classList.remove('drawer-on'); themeRefresh(); render();
}
function persoSet(k, v) { const t = Object.assign({}, TH.draft, {[k]:v}); TH.draft = themeClean(t); themeRefresh(); persoRender(); if (APP.prof && (k === 'blocks' || k === 'hidden' || k === 'streamer')) render(); }
const star = f => canPerso() ? '' : ' <span class="star" title="Premium : aperçu possible">★</span>';
function persoRender() {
  const t = TH.draft, th = TH.last || themeCompute(t, APP.prof), prem = !canPerso() ? themeDiff(t) : [], P = APP.prof;
  const chips = (k, list, fr, free) => `<div class="chips">${list.map(v => `<button type="button" class="chip${t[k] === v ? ' on' : ''}" data-pf="${k}" data-v="${esc(v)}" aria-pressed="${t[k] === v}">${esc(fr[v] || v)}${free && free.includes(v) ? '' : star()}</button>`).join('')}</div>`;
  const agents = Object.keys(window.KITS || {}).sort();
  const used = P ? aggBy(P.rows, 'agent').map(x => x.key) : [];
  const blocks = (t.blocks.length ? t.blocks : BLOCKS).concat(BLOCKS.filter(b => !t.blocks.includes(b) && t.blocks.length));
  $('#persoIn').innerHTML = `
  <div class="drawer-h"><h2>Personnaliser</h2><button class="btn ghost sm" data-act="persoClose" aria-label="Fermer">✕</button></div>
  <p class="muted small">Ton interface : <b>${esc(th.label || '—')}</b>. ${canPerso() ? 'Tout est enregistré dans ce navigateur.' : 'Le thème automatique est gratuit. Les réglages ★ sont en aperçu : ils s\'annulent à la fermeture sans Premium.'}</p>
  ${prem.length ? `<div class="infobox">Aperçu Premium en cours (${prem.length} réglage${prem.length > 1 ? 's' : ''}). <button class="btn sm" data-act="premium:perso">Garder ce thème</button></div>` : ''}
  <h3>Ton thème</h3>${chips('mode', THEME_ENUM.mode, MODE_FR, ['auto', 'dernier', 'neutre'])}
  ${t.mode === 'agent' || t.mode === 'perso' ? `<label class="lbl">Agent${star()}</label><div class="agrid">${agents.map(a => `<button type="button" class="ag${t.agent === a || (!t.agent && th.agent === a) ? ' on' : ''}${used.includes(a) ? ' joue' : ''}" data-pf="agent" data-v="${esc(a)}" title="${esc(a)}${used.includes(a) ? ' (joué)' : ''}"><img src="${IMG.agent(a)}" alt="${esc(a)}" loading="lazy"></button>`).join('')}</div>` : ''}
  ${t.mode === 'carte' || t.mode === 'perso' || t.bg === 'splash' ? `<label class="lbl" for="pfMap">Carte${star()}</label><select id="pfMap" data-pf="map"><option value="">Auto : ta meilleure carte</option>${Object.keys(MAP_ID).sort().map(m => `<option${t.map === m ? ' selected' : ''}>${m}</option>`).join('')}</select>` : ''}
  <h3>Fond</h3>${chips('bg', THEME_ENUM.bg, BG_FR, ['auto'])}
  ${t.bg === 'image' ? `<div class="row mt8"><label class="btn ghost sm file">Choisir une image${star()}<input type="file" accept="image/png,image/jpeg,image/webp" id="pfImg" hidden></label>${ST.get('img', '') ? '<button class="btn ghost sm" data-act="imgDel">Retirer mon image</button>' : ''}</div><p class="note">Réduite automatiquement, gardée seulement dans ce navigateur.</p>` : ''}
  <div class="grid g2 mt8"><div><label class="lbl" for="pfBlur">Flou du fond : ${t.blur} px</label><input type="range" id="pfBlur" min="0" max="20" value="${t.blur}" data-pf="blur" data-num="1"></div>
    <div><label class="lbl" for="pfDark">Assombrir : ${t.dark} %</label><input type="range" id="pfDark" min="30" max="95" value="${t.dark}" data-pf="dark" data-num="1"></div></div>
  <h3>Effet</h3>${chips('fx', THEME_ENUM.fx, FX_FR, ['auto'])}
  <h3>Couleur</h3><div class="row"><input type="color" id="pfAcc" value="${esc(t.accent || th.accent)}" data-pf="accent" aria-label="Couleur principale">${star()}<button class="btn ghost sm" data-act="accAuto"${t.accent ? '' : ' disabled'}>Couleur auto</button>
    ${P ? aggBy(P.rows, 'agent').slice(0, 5).map(x => `<button type="button" class="sw" data-pf="accent" data-v="${AGENT_COL[x.key] || ''}" title="Couleur de ${esc(x.key)}" style="background:${AGENT_COL[x.key] || '#888'}"></button>`).join('') : ''}</div>
  <h3>Polices</h3><label class="lbl" for="pfFt">Titres</label><select id="pfFt" data-pf="fontT">${THEME_ENUM.fontT.map(f => `<option value="${f}"${t.fontT === f ? ' selected' : ''}>${f === 'auto' ? `Auto (${(FONTS[ROLE_STYLE[th.role] ? ROLE_STYLE[th.role].font : 'teko'] || {}).n || 'Teko'})` : FONTS[f].n + (canPerso() ? '' : ' ★')}</option>`).join('')}</select>
  <label class="lbl" for="pfFb">Texte</label><select id="pfFb" data-pf="fontB">${THEME_ENUM.fontB.map(f => `<option value="${f}"${t.fontB === f ? ' selected' : ''}>${FONTS[f].n}${f === 'systeme' || canPerso() ? '' : ' ★'}</option>`).join('')}</select>
  <h3>Interface</h3>
  <label class="lbl" for="pfRad">Coins arrondis : ${t.radius} px${star()}</label><input type="range" id="pfRad" min="0" max="24" value="${t.radius}" data-pf="radius" data-num="1">
  ${chips('cards', THEME_ENUM.cards, {verre:'Cartes en verre', plein:'Cartes pleines', neon:'Contour néon'}, ['verre'])}
  <div class="mt8">${chips('density', THEME_ENUM.density, {confort:'Confort', compact:'Compact'}, THEME_ENUM.density)}</div>
  <label class="chk mt8"><input type="checkbox" data-pf="anim" ${t.anim ? 'checked' : ''}> Animations</label>
  <label class="chk"><input type="checkbox" data-pf="streamer" ${t.streamer ? 'checked' : ''}> Mode streamer (cache ton #tag)</label>
  <h3>Blocs de l'accueil${star()}</h3><div class="blocks">${blocks.map((b, i) => `<div class="blk${t.hidden.includes(b) ? ' off' : ''}"><span>${esc(BLOCK_FR[b])}</span>
    <button class="btn ghost sm" data-act="blk:${b}:-1" ${i ? '' : 'disabled'} aria-label="Monter">↑</button><button class="btn ghost sm" data-act="blk:${b}:1" ${i < blocks.length - 1 ? '' : 'disabled'} aria-label="Descendre">↓</button>
    <button class="btn ghost sm" data-act="blkHide:${b}" aria-label="${t.hidden.includes(b) ? 'Afficher' : 'Masquer'}">${t.hidden.includes(b) ? 'Afficher' : 'Masquer'}</button></div>`).join('')}</div>
  <h3>Partager ton thème${star()}</h3><p class="note">Un code à donner à tes amis : ils retrouvent ton interface (sans ton image perso).</p>
  <div class="row"><input id="pfCode" value="${esc(themeCode(t))}" readonly aria-label="Code de ton thème"><button class="btn ghost sm" data-act="themeCopy">Copier</button></div>
  <div class="row mt8"><input id="pfImport" placeholder="Colle un code PHT1.…" aria-label="Code de thème à importer"><button class="btn ghost sm" data-act="themeImport">Essayer</button></div>
  <div class="row mt"><button class="btn ghost" data-act="themeReset">Tout remettre par défaut</button><button class="btn" data-act="persoClose">${canPerso() ? 'Terminé' : 'Fermer'}</button></div>`;
}
document.addEventListener('input', e => {
  const el = e.target.closest('#perso [data-pf]'); if (!el || el.type === 'checkbox') return;
  if (el.type === 'range') { const lb = el.previousElementSibling; TH.draft[el.dataset.pf] = +el.value; themeRefresh(); if (lb) lb.textContent = lb.textContent.replace(/[\d]+ (px|%)/, `${el.value} $1`); return; }
  if (el.type === 'color') { TH.draft.accent = el.value; themeRefresh(); }
});
document.addEventListener('change', e => {
  const el = e.target.closest('#perso [data-pf]'); if (!el) return;
  if (el.type === 'checkbox') return persoSet(el.dataset.pf, el.checked);
  if (el.type === 'range') return persoSet(el.dataset.pf, +el.value);
  if (el.tagName === 'SELECT' || el.type === 'color') return persoSet(el.dataset.pf, el.value);
});
document.addEventListener('change', e => { if (e.target.id === 'pfImg' && e.target.files[0]) imgLoad(e.target.files[0]); });
document.addEventListener('click', e => { const b = e.target.closest('#perso button[data-pf]'); if (b) { e.preventDefault(); persoSet(b.dataset.pf, b.dataset.v); } });
async function imgLoad(file) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 15e6) return toast('Image PNG, JPEG ou WebP de moins de 15 Mo', true);
  try {
    const bmp = await createImageBitmap(file), sc = Math.min(1, 1600 / bmp.width), cv = document.createElement('canvas'); cv.width = Math.round(bmp.width * sc); cv.height = Math.round(bmp.height * sc);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height); let q = .82, url = cv.toDataURL('image/jpeg', q);
    while (url.length > 1.2e6 && q > .4) { q -= .12; url = cv.toDataURL('image/jpeg', q); }
    if (!ST.set('img', url)) return toast('Image trop lourde pour ce navigateur', true);
    persoSet('bg', 'image');
  } catch (e) { toast('Image illisible', true); }
}
