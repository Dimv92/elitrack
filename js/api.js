"use strict";
/* ================= DONNÉES DU JOUEUR (API HenrikDev, non officielle et gratuite) =================
   Deux chemins : le serveur du site (réglage « proxy » : la clé du propriétaire reste secrète, cache partagé)
   ou la clé perso du visiteur (réglages). Profil gardé 10 min dans ce navigateur ; détails des parties gardés (IndexedDB). */
const PX = 'ph_';
const ST = {
  get(k, d) { try { const v = localStorage.getItem(PX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(PX + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(PX + k); } catch (e) {} }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const splitRiot = r => { const s = String(r || '').trim(), i = s.lastIndexOf('#'); return i > 0 && i < s.length - 1 && i <= 22 && s.length - i <= 7 ? [s.slice(0, i).trim(), s.slice(i + 1).trim()] : null; };
// clé perso du visiteur ; en test local (même navigateur que le mode Dieu), la clé du hub sert aussi
const userKey = () => { try { return localStorage.getItem(PX + 'hkey') || ((/^(file:|http:\/\/localhost|http:\/\/127\.)/.test(location.href)) ? localStorage.getItem('psh_hkey') || '' : ''); } catch (e) { return ''; } };
const setUserKey = k => { try { k ? localStorage.setItem(PX + 'hkey', k.trim()) : localStorage.removeItem(PX + 'hkey'); } catch (e) {} };
const API = {calls:0};
const apiReady = () => !!(userKey() || APP.cfg.proxy);

async function apiGet(path, tries = 3) {
  const key = userKey(), base = key ? 'https://api.henrikdev.xyz' : APP.cfg.proxy;
  if (!base) { const e = new Error('Ce site n\'a pas encore son serveur : ajoute ta clé HenrikDev gratuite (Réglages) ou essaie la démo.'); e.code = 'nokey'; throw e; }
  for (let a = 0; ; a++) {
    let res; API.calls++;
    try { res = await fetch(key ? base + '/valorant' + path : proxyUrl(base, '/valorant' + path), key ? {headers:{Authorization:key}} : {}); }
    catch (e) { throw new Error('Pas de connexion internet, ou le service ne répond pas. Réessaie dans un instant.'); }
    // le serveur Google Apps Script répond toujours 200 : la vraie erreur est dans le champ « status » du JSON
    let j = null; try { j = JSON.parse(await res.text()); } catch (e) {}
    const st = res.status !== 200 ? res.status : j && typeof j.status === 'number' ? j.status : 200;
    if (st === 429 && a < tries - 1) {
      const w = clamp(+(res.headers.get('Retry-After') || (j && j.retry) || 0) || 20, 5, 60);
      statut(`Beaucoup de demandes en ce moment : reprise automatique dans ${w} s…`); await sleep(w * 1000); continue;
    }
    if (j && j.erreur === 'Adresse inconnue.') throw new Error('Le serveur du site est mal installé (ancienne version du code ?). Le propriétaire doit recopier le code du serveur.');
    if (st === 404) { const e = new Error('Introuvable : vérifie le pseudo, le #tag et la région.'); e.code = 404; throw e; }
    if (st === 401 || st === 403) throw new Error(key ? 'Ta clé HenrikDev est refusée (incomplète, invalide ou désactivée). Recopie-la en entier dans les réglages.' : 'Le serveur du site est mal réglé (clé refusée) : réessaie plus tard.');
    if (st === 429) throw new Error('Trop de demandes : réessaie dans une minute.');
    if (st >= 400) throw new Error(`Le service a répondu une erreur (${st}). Réessaie plus tard.`);
    if (!j) throw new Error('Réponse illisible du service. Réessaie plus tard.');
    return j;
  }
}

/* ---------- Profil : compte, rang, parties, historique des RR (4 appels ; pages = parties × 20) ---------- */
async function loadProfile(riot, region, opt = {}) {
  const sp = splitRiot(riot); if (!sp) throw new Error('Écris ton Riot ID en entier : Pseudo#TAG (exemple : Kebab#EUW).');
  const [nm, tg] = sp, rid = ridNorm(riot), pages = opt.pages || 1, old = ST.get('prof:' + rid);
  if (!opt.force && old && old.v === 2 && Date.now() - old.at < 10 * 6e4 && old.pages >= pages) return old;
  const q = `${encodeURIComponent(nm)}/${encodeURIComponent(tg)}`, size = 20;
  statut('Recherche du compte…');
  const acc = (await apiGet(`/v2/account/${q}`)).data || {};
  const reg = REGIONS.some(r => r[0] === String(acc.region || '').toLowerCase()) ? String(acc.region).toLowerCase() : region;
  statut('Rang et RR…');
  let mmr = {}; try { mmr = (await apiGet(`/v3/mmr/${reg}/pc/${q}`)).data || {}; } catch (e) { if (e.code !== 404) throw e; }
  const rows = [];
  for (let p = 1; p <= pages; p++) {
    statut(`Tes parties classées… ${pages > 1 ? `(page ${p}/${pages})` : ''}`);
    const l = (await apiGet(`/v1/stored-matches/${reg}/${q}?mode=competitive&size=${size}&page=${p}`)).data || [];
    l.forEach(sm => { const r = smRow(sm); if (r && !rows.some(x => x.id === r.id)) rows.push(r); });
    if (l.length < size) break; if (p < pages) await sleep(1200);
  }
  statut('Historique des RR…');
  let hist = []; try { hist = (await apiGet(`/v2/stored-mmr-history/${reg}/pc/${q}`)).data || []; } catch (e) { if (e.code !== 404) console.warn(e); }
  const c = mmr.current || {}, pk = mmr.peak || {}, n = v => toNum(v);
  const prof = {v:2, at:Date.now(), rid, name:strCut(acc.name || nm, 24), tag:strCut(acc.tag || tg, 8), region:reg, puuid:typeof acc.puuid === 'string' ? acc.puuid : '', level:n(acc.account_level),
    card:typeof acc.card === 'string' ? acc.card : (acc.card || {}).id || '', pages,
    mmr:{tier:n((c.tier || {}).id) || 0, rr:n(c.rr), last:n(c.last_change), elo:n(c.elo), need:n(c.games_needed_for_rating) || 0, peak:{tier:n((pk.tier || {}).id) || 0, season:strCut((pk.season || {}).short, 10)}},
    rows:rows.sort((a, b) => b.ts - a.ts),
    hist:(Array.isArray(hist) ? hist : []).map(h => ({d:String(h.date || ''), ts:Date.parse(h.date) || 0, ch:n(h.last_change), elo:n(h.elo), t:n((h.tier || {}).id) || 0, mid:String(h.match_id || '').toLowerCase(), map:strCut((h.map || {}).name, 20)}))
      .filter(h => h.elo != null && h.ts).sort((a, b) => a.ts - b.ts).slice(-120)};
  prof.riot = `${prof.name}#${prof.tag}`;
  ST.set('prof:' + rid, prof); statut('');
  return prof;
}
const strCut = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, '').slice(0, n);

/* ---------- Détails des parties (API v4) : IndexedDB, clé « compte:partie » ---------- */
function idb(mode, fn) {
  return new Promise((res, rej) => {
    const r = indexedDB.open('prohub-public', 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains('md')) r.result.createObjectStore('md'); };
    r.onerror = () => rej(r.error);
    r.onsuccess = () => { const db = r.result, tx = db.transaction('md', mode), q = fn(tx.objectStore('md')); tx.oncomplete = () => { res(q && q.result); db.close(); }; tx.onerror = () => { rej(tx.error); db.close(); }; };
  });
}
const mdKey = (prof, id) => `${prof.demo ? 'demo' : prof.puuid || prof.rid}:${id}`;
const DET = {mem:{}};
async function detGet(prof, id) {
  const k = mdKey(prof, id); if (DET.mem[k]) return DET.mem[k];
  let d = null; try { d = await idb('readonly', s => s.get(k)); } catch (e) {}
  if (d) return DET.mem[k] = d;
  if (prof.demo) return null;
  const md = (await apiGet(`/v4/match/${prof.region}/${encodeURIComponent(id)}`)).data; if (!md) return null;
  const me = (md.players || []).find(p => (prof.puuid && p.puuid === prof.puuid) || ridNorm(`${p.name}#${p.tag}`) === prof.rid); if (!me) return null;
  d = v4Detail(md, me.team_id, p => p === me ? 'moi' : '');
  try { await idb('readwrite', s => s.put(d, k)); } catch (e) { console.warn('Détail non gardé', e); }
  return DET.mem[k] = d;
}
// détails déjà gardés pour ce compte, du plus récent au plus ancien (seulement les parties du profil chargé)
async function detAll(prof) {
  const ids = new Set(prof.rows.map(r => r.id)), out = [];
  for (const r of prof.rows) { const k = mdKey(prof, r.id); if (DET.mem[k]) out.push(DET.mem[k]); }
  if (out.length < ids.size && !prof.demo) {
    try { const all = await idb('readonly', s => s.getAll()); (all || []).forEach(d => { const k = mdKey(prof, d.id); if (ids.has(d.id) && !DET.mem[k]) { DET.mem[k] = d; out.push(d); } }); } catch (e) {}
  }
  return out.sort((a, b) => b.ts - a.ts);
}
// complète les détails manquants des « max » parties les plus récentes (2 s entre deux appels) ; s'arrête à la première erreur
async function detFill(prof, max, onStep) {
  if (prof.demo || !apiReady()) return 0;
  const have = new Set((await detAll(prof)).map(d => d.id)), todo = prof.rows.slice(0, max).filter(r => !have.has(r.id)); let n = 0;
  for (const r of todo) {
    try { await detGet(prof, r.id); n++; if (onStep) onStep(n, todo.length); } catch (e) { console.warn('Détail interrompu', e.message); break; }
    if (n < todo.length) await sleep(2000);
  }
  return n;
}
async function detForget() { DET.mem = {}; try { await idb('readwrite', s => { s.clear(); return null; }); } catch (e) {} }
