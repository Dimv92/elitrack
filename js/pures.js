"use strict";
/* ================= FONCTIONS PURES (aucun accès à la page ni au stockage) =================
   Chargées par <script> dans le hub (elles deviennent globales) et par require() dans les tests.
   Contenu : échappement HTML (le seul helper du hub), forme des données stockées, boîte de Claude (validation + aperçu),
   migrations de schéma, tableau des règles d'équipe, état d'un rapport daté. */
(function (root, make) {
  const m = make();
  if (typeof module === 'object' && module.exports) module.exports = m; else Object.assign(root, m);
})(typeof window !== 'undefined' ? window : this, function () {

  /* ---------- Échappement : tout texte venant des données passe par ici avant le DOM ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));

  /* ---------- Forme des données stockées : un champ numérique est toujours un nombre fini ou null ---------- */
  const toNum = v => { if (v == null || v === '') return v == null ? v : null; const n = typeof v === 'number' ? v : typeof v === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(v) ? +v : NaN; return Number.isFinite(n) ? n : null; };
  const toStr = v => v == null ? v : typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '';
  const nums = (o, keys) => { if (o && typeof o === 'object') keys.forEach(k => { if (k in o) o[k] = toNum(o[k]); }); return o; };
  const strs = (o, keys) => { if (o && typeof o === 'object') keys.forEach(k => { if (k in o) o[k] = toStr(o[k]); }); return o; };
  const arr = (o, k, f) => { if (o && k in o) o[k] = Array.isArray(o[k]) ? o[k].filter(x => x && typeof x === 'object').map(f) : []; };
  const obj = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const SHAPE = {
    matches: m => { nums(m, ['us', 'them', 'fk', 'fd', 'clutchW', 'clutchA', 'pistols', 'ecoLost', 'ts']); strs(m, ['id', 'date', 'time', 'type', 'opp', 'map', 'notes', 'src']);
      if (m.time != null && !/^\d{1,2}:\d{2}$/.test(m.time)) m.time = '';
      arr(m, 'players', p => strs(nums(p, ['k', 'd', 'a', 'acs', 'hsN', 'shots', 'kastR', 'rounds', 'traded']), ['name', 'agent', 'tier']));
      if (m.lobby && typeof m.lobby === 'object') nums(m.lobby, ['us', 'them']); return m; },
    checkins: c => strs(nums(c, ['sleep', 'fat', 'stress', 'mood']), ['id', 'player', 'date']),
    candidates: c => { nums(c, ['acsR', 'hs', 'kast', 'fk', 'fd', 'comms', 'tilt', 'contactN']); strs(c, ['id', 'name', 'riot', 'role', 'rank', 'pipe', 'notes', 'date', 'src', 'contact']);
      arr(c, 'tryouts', t => strs(nums(t, ['acsR', 'kast', 'fk', 'fd', 'comms', 'tilt']), ['date']));
      if ('rt' in c) c.rt = obj(c.rt) ? Object.fromEntries(Object.entries(c.rt).map(([k, v]) => [k, Array.isArray(v) ? v.slice(0, 2).map(toNum) : [null, null]])) : {};
      if ('scout' in c) { const s = c.scout = obj(c.scout) ? c.scout : {}; nums(s, ['n', 'w', 'acs', 'acsR', 'adr', 'hs', 'lg', 'kast', 'fkM', 'fdM', 'kd', 'rating', 'sd', 'afk', 'ff', 'tier', 'rr', 'lvl', 'roleShare']);
        strs(s, ['d', 'role', 'peak', 'last', 'tierName']); s.agents = Array.isArray(s.agents) ? s.agents.filter(Array.isArray).map(a => [toStr(a[0]) || '', toNum(a[1]) || 0]) : [];
        ['hours', 'days'].forEach(k => { s[k] = Array.isArray(s[k]) ? s[k].map(v => toNum(v) || 0) : []; }); }
      return c; },
    skills: s => { nums(s, ['ts']); strs(s, ['id', 'player', 'date']); if (s.v && typeof s.v === 'object') nums(s.v, Object.keys(s.v)); else s.v = {}; return s; },
    trainlog: l => { strs(nums(l, ['min', 'lv']), ['id', 'player', 'date', 'kind', 'tool']); if ('scores' in l) { if (obj(l.scores)) nums(l.scores, Object.keys(l.scores)); else l.scores = {}; } return l; },
    events: e => strs(nums(e, ['dur']), ['id', 'date', 'time', 'type', 'title', 'notes']),
    tasks: t => strs(t, ['id', 't', 'due', 'date', 'src']),
    reports: r => { strs(r, ['id', 'player', 'date', 'titre', 'text', 'kind']); if (r.basis && typeof r.basis === 'object') { nums(r.basis, ['n']); strs(r.basis, ['from', 'to']); } return r; },
    roster: p => { nums(p, ['dpi', 'sens']); strs(p, ['id', 'name', 'riot', 'role', 'status', 'xhair', 'hour', 'notes', 'tier']);
      if ('days' in p) p.days = Array.isArray(p.days) ? p.days.map(toNum).filter(d => d != null && d >= 0 && d <= 6) : [];
      if ('agents' in p) p.agents = Array.isArray(p.agents) ? p.agents.map(toStr).filter(Boolean) : [];
      arr(p, 'sensH', h => strs(nums(h, ['dpi', 'sens']), ['d'])); return p; },
    strats: s => { strs(s, ['id', 'name', 'map', 'side', 'show']); nums(s, ['phase', 'created']); if (s.uses && typeof s.uses === 'object') nums(s.uses, ['w', 'l']);
      arr(s, 'items', it => { nums(it, ['x', 'y', 'w', 'phase']); strs(it, ['id', 't', 'kind', 'text', 'color', 'ag', 'sl']); if ('pts' in it) it.pts = Array.isArray(it.pts) ? it.pts.filter(Array.isArray).map(p => [toNum(p[0]) || 0, toNum(p[1]) || 0]) : []; return it; });
      if ('notes' in s) s.notes = Array.isArray(s.notes) ? s.notes.map(n => toStr(n) || '') : ['', '', '', '']; return s; },
    vods: v => strs(v, ['id', 'matchId', 'round', 'ts', 'cat', 'note', 'url']),
    antistrats: a => strs(a, ['id', 'team', 'map', 'date', 'notes', 'plan'])
  };
  /* Remet en forme une collection lue dans le stockage (données d'une sauvegarde, d'un pack ou d'une ancienne version) */
  function shapeColl(coll, value) {
    if (coll === 'mmr') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
      Object.values(value).forEach(r => { if (!r || typeof r !== 'object') return; nums(r, ['tier', 'rr', 'elo', 'last', 'shields', 'updated']); strs(r, ['tierName']);
        if (r.peak && typeof r.peak === 'object') { nums(r.peak, ['tier']); strs(r.peak, ['name', 'season']); }
        arr(r, 'hist', h => strs(nums(h, ['elo', 'ch', 't']), ['d', 'map', 'mid'])); });
      return value;
    }
    const f = SHAPE[coll]; if (!f) return value;
    return Array.isArray(value) ? value.filter(x => x && typeof x === 'object').map(f) : [];
  }

  /* ---------- Boîte de Claude : fichier data/claude-inbox.json, jamais exécuté ---------- */
  const INBOX_FORMAT = 'prohub-inbox', INBOX_VERSION = 1;
  const LIM = {batches:20, items:500, bytes:2e6};
  const RE_DATE = /^\d{4}-\d{2}-\d{2}$/, RE_TIME = /^\d{1,2}:\d{2}$/, RE_ID = /^[\w.:@+-]{1,80}$/;
  /* Mini-schémas : [type, options]. Types : str, int, num, date, time, bool, enum, url, color, list (liste de str), obj */
  const T = {
    str:(max, req) => ({t:'str', max, req}), int:(min, max, req) => ({t:'int', min, max, req}), num:(min, max, req) => ({t:'num', min, max, req}),
    date:req => ({t:'date', req}), time:() => ({t:'time'}), bool:() => ({t:'bool'}), enm:(vals, req) => ({t:'enum', vals, req}), url:() => ({t:'url'}),
    color:() => ({t:'color'}), list:(max, n) => ({t:'list', max, n}), arr:(of, n) => ({t:'arr', of, n}), obj:(of, req) => ({t:'obj', of, req}), id:() => ({t:'id'})
  };
  const ROLES_ALL = ['Duelist', 'Initiator', 'Controller', 'Sentinel', 'Flex', 'IGL'];
  const S_PLAYER = {name:T.str(40, true), agent:T.str(20), k:T.int(0, 200), d:T.int(0, 200), a:T.int(0, 200), acs:T.int(0, 1500)};
  const S_ITEM = {id:T.id(), t:T.enm(['stroke', 'arrow', 'text', 'util'], true), kind:T.str(12), x:T.num(0, 1000), y:T.num(0, 1000), w:T.num(1, 30), color:T.color(), text:T.str(40), phase:T.int(0, 3), pts:{t:'pts'}, ag:T.str(20), sl:T.enm(['C', 'Q', 'E', 'X'])};
  const SCHEMA = {
    matches:{id:T.id(), date:T.date(true), time:T.time(), type:T.enm(['Ranked', 'Premier', 'Scrim', 'Tournoi']), opp:T.str(60), map:T.str(30, true), us:T.int(0, 60, true), them:T.int(0, 60, true),
      fk:T.int(0, 60), fd:T.int(0, 60), pistols:T.int(0, 2), ecoLost:T.int(0, 60), clutchW:T.int(0, 60), clutchA:T.int(0, 60), players:T.arr(S_PLAYER, 10), notes:T.str(1500)},
    candidates:{id:T.id(), name:T.str(60, true), riot:T.str(40), role:T.enm(ROLES_ALL), rank:T.str(30), pipe:T.enm(['repéré', 'contacté', 'tryout', 'signé', 'refusé', 'écarté']),
      acsR:T.num(0, 400), hs:T.num(0, 100), kast:T.num(0, 100), fk:T.num(0, 30), fd:T.num(0, 30), comms:T.int(1, 5), tilt:T.int(1, 5), notes:T.str(3000), date:T.date()},
    reports:{id:T.id(), player:T.str(60, true), date:T.date(), titre:T.str(160), text:T.str(30000, true), kind:T.enm(['analyse', 'bilan']), basis:T.obj({n:T.int(0, 100000), from:T.date(), to:T.date()})},
    events:{id:T.id(), date:T.date(true), time:T.time(), dur:T.int(5, 1440), type:T.enm(['Entraînement', 'Scrim', 'Ranked', 'Tournoi', 'Revue VOD', 'Tryout', 'Autre']), title:T.str(160, true), notes:T.str(1000)},
    strats:{id:T.id(), name:T.str(100), map:T.str(30), side:T.enm(['atk', 'def']), notes:T.list(800, 4), tags:T.list(20, 12), items:T.arr(S_ITEM, 400), phase:T.int(0, 3), show:T.enm(['cum', 'only'])},
    tasks:{id:T.id(), t:T.str(240, true), due:{t:'dateOrEmpty'}, done:T.bool()},
    skills:{id:T.id(), ts:T.int(0, 1e15), player:T.str(60, true), date:T.date(true), v:T.obj({hs:T.num(0, 100), kast:T.num(0, 100), trade:T.num(0, 100), util:T.num(0, 100), fb:T.num(0, 100)}, true)},
    antistrats:{id:T.id(), team:T.str(80, true), map:T.str(30), date:T.date(), notes:T.str(4000), plan:T.str(4000)},
    roster:{id:T.id(), name:T.str(40, true), riot:T.str(40), role:T.enm(ROLES_ALL), status:T.enm(['titulaire', 'remplaçant', 'essai', 'ancien']), agents:T.list(20, 10),
      dpi:T.int(100, 32000), sens:T.num(0.001, 50), xhair:T.str(300), days:{t:'days'}, hour:T.time(), notes:T.str(600)},
    vods:{id:T.id(), matchId:T.str(80), round:T.str(4), ts:T.str(9), cat:T.enm(['Micro/Aim', 'Macro/Spacing', 'Comms/Info latency', 'Eco management', 'Utility', 'Positive clip']), note:T.str(600, true), url:T.url()},
    checkins:{id:T.id(), player:T.str(40, true), date:T.date(true), sleep:T.num(0, 14), fat:T.int(1, 5), stress:T.int(1, 5), mood:T.int(1, 5)},
    trainlog:{id:T.id(), player:T.str(40, true), date:T.date(true), min:T.int(1, 600), kind:T.str(40)}
  };
  const INBOX_COLLS = Object.keys(SCHEMA);
  const BATCH_KEYS = ['id', 'date', 'titre', 'notes', 'comps', 'settings', ...INBOX_COLLS];
  const typeOf = v => v === null ? 'null' : Array.isArray(v) ? 'liste' : typeof v === 'string' ? 'texte' : typeof v === 'number' ? 'nombre' : typeof v;
  /* Vérifie une valeur ; renvoie la valeur propre, ou pousse une erreur et renvoie undefined */
  function check(v, s, path, errs) {
    const bad = msg => { errs.push(`${path} : ${msg}`); return undefined; };
    if (v === undefined || v === null) return s.req ? bad('obligatoire') : v === null ? null : undefined;
    switch (s.t) {
      case 'str': if (typeof v !== 'string') return bad(`texte attendu (reçu : ${typeOf(v)})`); if (s.req && !v.trim()) return bad('ne doit pas être vide'); return v.length > s.max ? bad(`trop long (${v.length} caractères, maximum ${s.max})`) : v;
      case 'id': return typeof v === 'string' && RE_ID.test(v) ? v : bad('identifiant invalide (lettres, chiffres, - _ . : seulement, 80 caractères maximum)');
      case 'int': case 'num':
        if (typeof v !== 'number' || !Number.isFinite(v)) return bad(`nombre attendu (reçu : ${typeOf(v)})`);
        if (s.t === 'int' && !Number.isInteger(v)) return bad('nombre entier attendu');
        return v < s.min || v > s.max ? bad(`hors bornes (${v} ; attendu entre ${s.min} et ${s.max})`) : v;
      case 'date': return typeof v === 'string' && RE_DATE.test(v) && !isNaN(new Date(v + 'T12:00:00')) ? v : bad('date AAAA-MM-JJ attendue');
      case 'dateOrEmpty': return v === '' || (typeof v === 'string' && RE_DATE.test(v)) ? v : bad('date AAAA-MM-JJ ou vide attendue');
      case 'time': return typeof v === 'string' && RE_TIME.test(v) ? v : bad('heure HH:MM attendue');
      case 'bool': return typeof v === 'boolean' ? v : bad('vrai/faux attendu');
      case 'enum': return s.vals.includes(v) ? v : bad(`valeur non prévue (« ${String(v).slice(0, 30)} » ; possibles : ${s.vals.join(', ')})`);
      case 'url': return typeof v === 'string' && /^https?:\/\/[^\s"'<>]{3,500}$/i.test(v) ? v : bad('lien http(s) attendu');
      case 'color': return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : bad('couleur #rrggbb attendue');
      case 'days': return Array.isArray(v) && v.every(d => Number.isInteger(d) && d >= 0 && d <= 6) ? v : bad('liste de jours 0 à 6 attendue');
      case 'list': if (!Array.isArray(v)) return bad('liste attendue'); if (v.length > s.n) return bad(`trop d'éléments (${v.length}, maximum ${s.n})`);
        return v.every(x => typeof x === 'string' && x.length <= s.max) ? v : bad(`liste de textes de ${s.max} caractères maximum attendue`);
      case 'pts': return Array.isArray(v) && v.length <= 2000 && v.every(p => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === 'number' && n >= 0 && n <= 1000)) ? v : bad('liste de points [x, y] entre 0 et 1000 attendue');
      case 'arr': { if (!Array.isArray(v)) return bad('liste attendue'); if (v.length > s.n) return bad(`trop d'éléments (${v.length}, maximum ${s.n})`);
        const out = v.map((x, i) => checkObj(x, s.of, `${path}[${i + 1}]`, errs)); return out.some(x => x === undefined) ? undefined : out; }
      case 'obj': return checkObj(v, s.of, path, errs);
    }
    return bad('type inconnu');
  }
  function checkObj(o, schema, path, errs) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) { errs.push(`${path} : objet attendu`); return undefined; }
    const out = {}, n0 = errs.length;
    Object.keys(o).forEach(k => { if (!(k in schema)) errs.push(`${path} : champ inconnu « ${k.slice(0, 30)} »`); });
    Object.entries(schema).forEach(([k, s]) => { const v = check(o[k], s, `${path}.${k}`, errs); if (v !== undefined) out[k] = v; });
    return errs.length > n0 ? undefined : out;
  }
  /* Contrôles de cohérence d'un match (mêmes règles que la saisie) */
  function matchCoherence(m, path, errs) {
    if (m.clutchW != null && m.clutchA != null && m.clutchW > m.clutchA) errs.push(`${path} : clutchs gagnés (${m.clutchW}) > clutchs tentés (${m.clutchA})`);
    if (m.fk != null && m.fd != null && m.fk + m.fd > m.us + m.them) errs.push(`${path} : FK + FD (${m.fk + m.fd}) > nombre de rounds (${m.us + m.them})`);
    if (m.us + m.them < 1) errs.push(`${path} : aucun round joué`);
  }
  /* Valide le contenu de la boîte (objet déjà lu par JSON.parse). Tout ou rien : la moindre erreur bloque la fusion. */
  function validateInbox(data) {
    const errs = [];
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {ok:false, errors:['Le fichier doit contenir un objet JSON { "format": …, "version": …, "batches": [ … ] }.'], batches:[]};
    if (data.format !== INBOX_FORMAT) errs.push(`format : « ${INBOX_FORMAT} » attendu`);
    if (data.version !== INBOX_VERSION) errs.push(typeof data.version === 'number' && data.version > INBOX_VERSION ? `version ${data.version} : plus récente que ce hub (${INBOX_VERSION}). Mettez le hub à jour.` : `version : ${INBOX_VERSION} attendue`);
    Object.keys(data).forEach(k => { if (!['format', 'version', 'batches'].includes(k)) errs.push(`champ inconnu à la racine « ${k.slice(0, 30)} »`); });
    if (!Array.isArray(data.batches)) errs.push('batches : liste attendue');
    else if (data.batches.length > LIM.batches) errs.push(`batches : ${data.batches.length} lots, maximum ${LIM.batches}`);
    if (errs.length) return {ok:false, errors:errs, batches:[]};
    const ids = new Set(), batches = [];
    data.batches.forEach((b, bi) => {
      const p = `lot ${bi + 1}`;
      if (!b || typeof b !== 'object' || Array.isArray(b)) { errs.push(`${p} : objet attendu`); return; }
      Object.keys(b).forEach(k => { if (!BATCH_KEYS.includes(k)) errs.push(`${p} : champ inconnu « ${k.slice(0, 30)} »`); });
      const id = check(b.id, {t:'id'}, `${p}.id`, errs) ; if (b.id == null) errs.push(`${p}.id : obligatoire`);
      if (id && ids.has(id)) errs.push(`${p}.id : « ${id} » utilisé deux fois`); if (id) ids.add(id);
      const out = {id, date:check(b.date, T.date(), `${p}.date`, errs), titre:check(b.titre, T.str(160), `${p}.titre`, errs), notes:check(b.notes, T.str(3000), `${p}.notes`, errs)};
      INBOX_COLLS.forEach(k => {
        if (b[k] == null) return;
        if (!Array.isArray(b[k])) { errs.push(`${p}.${k} : liste attendue`); return; }
        if (b[k].length > LIM.items) { errs.push(`${p}.${k} : ${b[k].length} éléments, maximum ${LIM.items}`); return; }
        // strats : une mise à jour partielle {id, notes} est permise (notes affinées par Claude)
        const items = b[k].map((x, i) => checkObj(x, SCHEMA[k], `${p}.${k}[${i + 1}]`, errs));
        if (k === 'matches') items.forEach((m, i) => { if (m) matchCoherence(m, `${p}.matches[${i + 1}]`, errs); });
        if (k === 'strats') items.forEach((s, i) => { if (s && !s.id && !(s.name && s.map)) errs.push(`${p}.strats[${i + 1}] : « id » (mise à jour) ou « name » + « map » (nouvelle strat) obligatoires`); });
        out[k] = items;
      });
      if (b.comps != null) {
        if (typeof b.comps !== 'object' || Array.isArray(b.comps)) errs.push(`${p}.comps : objet { carte : [5 places] } attendu`);
        else { out.comps = {}; Object.entries(b.comps).forEach(([map, slots]) => {
          if (map.length > 30) return errs.push(`${p}.comps : nom de carte trop long`);
          const v = check(slots, T.arr({player:T.str(40), agent:T.str(20)}, 5), `${p}.comps.${map}`, errs); if (v) out.comps[map] = v; }); }
      }
      if (b.settings != null) out.settings = checkObj(b.settings, {team:T.str(60), rank:T.str(30), rankGoal:T.str(30), pool:T.list(30, 30)}, `${p}.settings`, errs);
      Object.keys(out).forEach(k => out[k] === undefined && delete out[k]);
      batches.push(out);
    });
    return {ok:errs.length === 0, errors:errs.slice(0, 40), more:Math.max(0, errs.length - 40), batches:errs.length ? [] : batches};
  }
  /* Ce qu'un élément « s'appelle » dans l'aperçu */
  const itemLabel = (k, x) => k === 'matches' ? `${x.date || '?'} ${x.map || '?'} ${x.us ?? '?'}-${x.them ?? '?'}` : x.name || x.title || x.titre || x.t || x.team || x.player || x.id || '(sans nom)';
  /* Aperçu sans rien écrire : pour chaque lot, ce qui sera ajouté ou modifié. current = {collection: [éléments actuels]}, settings = réglages actuels */
  function inboxPlan(batches, current, done, settings) {
    return batches.map(b => {
      const r = {id:b.id, titre:b.titre || b.id, date:b.date || '', notes:b.notes || '', done:(done || []).includes(b.id), colls:{}, comps:[], settings:[], total:0};
      INBOX_COLLS.forEach(k => {
        if (!b[k] || !b[k].length) return;
        const have = new Map((current[k] || []).map(x => [x.id, x])), add = [], upd = [];
        b[k].forEach(x => { const old = x.id && have.get(x.id); if (old) { const ch = Object.keys(x).filter(f => f !== 'id' && JSON.stringify(x[f]) !== JSON.stringify(old[f])); if (ch.length) upd.push({label:itemLabel(k, Object.assign({}, old, x)), fields:ch}); } else add.push({label:itemLabel(k, x)}); });
        if (add.length || upd.length) { r.colls[k] = {add, upd}; r.total += add.length + upd.length; }
      });
      if (b.comps) { r.comps = Object.keys(b.comps); r.total += r.comps.length; }
      if (b.settings) ['team', 'rank', 'rankGoal', 'pool'].forEach(k => { if (b.settings[k] != null && JSON.stringify(b.settings[k]) !== JSON.stringify((settings || {})[k])) { r.settings.push({k, from:(settings || {})[k], to:b.settings[k]}); r.total++; } });
      return r;
    });
  }

  /* ---------- Migrations du schéma des données (sur une copie « brute » {psh_clé: texte JSON}) ----------
     Chaque étape est idempotente (la relancer ne change rien) et a son inverse. Version actuelle : SCHEMA_V. */
  const SCHEMA_V = 2;
  const J = s => { try { return s == null ? null : JSON.parse(s); } catch (e) { return null; } };
  const MIGRATIONS = {
    /* 1 → 2 : l'analyse de recrutement (autrefois écrite dans index.html) devient un rapport daté dans les données ;
       le logo et la bannière de l'équipe deviennent des réglages. Seulement si les données de départ avaient été chargées. */
    2:{
      up(raw, seed, log) {
        if (J(raw.psh_seed_v) == null || !seed) return;
        const reps = J(raw.psh_reports) || [];
        (seed.analyses || []).forEach(a => { if (!reps.some(r => r.id === a.id)) { reps.push(JSON.parse(JSON.stringify(a))); log.push(`rapport ajouté : ${a.titre}`); } });
        raw.psh_reports = JSON.stringify(reps);
        const st = seed.settings || {};
        ['logo', 'banner'].forEach(k => { if (st[k] && J(raw['psh_' + k]) == null) { raw['psh_' + k] = JSON.stringify(st[k]); log.push(`${k === 'logo' ? 'logo' : 'bannière'} de l'équipe : ${st[k]}`); } });
      },
      down(raw, seed) {
        if (!seed) return;
        const ids = new Set((seed.analyses || []).map(a => a.id)), reps = J(raw.psh_reports);
        if (Array.isArray(reps)) raw.psh_reports = JSON.stringify(reps.filter(r => !ids.has(r.id)));
        const st = seed.settings || {};
        ['logo', 'banner'].forEach(k => { if (st[k] && J(raw['psh_' + k]) === st[k]) delete raw['psh_' + k]; });
      }
    }
  };
  /* Monte une copie brute jusqu'à SCHEMA_V (ou jusqu'à « to »). Ne touche pas l'original. */
  function migrateRaw(raw0, seed, to = SCHEMA_V) {
    const raw = Object.assign({}, raw0), log = [];
    let v = J(raw.psh_schema_v) || 1; const from = v;
    while (v < to) { v++; if (MIGRATIONS[v]) MIGRATIONS[v].up(raw, seed, log); }
    while (v > to) { if (MIGRATIONS[v]) MIGRATIONS[v].down(raw, seed); v--; }
    if (v === 1) delete raw.psh_schema_v; else raw.psh_schema_v = JSON.stringify(v);
    return {raw, from, to:v, log};
  }

  /* ---------- Règles d'équipe : le tableau est calculé, jamais écrit en dur ---------- */
  const pc = a => a && a[0] ? `${Math.round(a[1] / a[0] * 100)} %` : '—';
  const nn = a => a && a[0] ? `${a[1]}/${a[0]}` : '0';
  const NO_DATA = 'Données insuffisantes : il faut au moins 5 matchs avec le détail des rounds.';
  function rulesRows(K) {
    const r = a => a && a[0] ? a[1] / a[0] : null, why = f => K ? f() : NO_DATA;
    return [
      ['Pistol perdu', 'Round 2 : on sauve (éco), full buy au round 3.', why(() => `Round après un pistol perdu : ${pc(K.r2l)} gagnés (${nn(K.r2l)}).`)],
      ['Pistol gagné', 'Round 2 : on joue groupé contre leur éco, angles longs.', why(() => `Round après un pistol gagné : ${pc(K.r2w)} gagnés (${nn(K.r2w)}).`)],
      ['Force-buy', 'Seulement au dernier round d\'une mi-temps, ou si on aura quand même un full buy au round suivant.', why(() => `Force contre full buy adverse : ${pc(K.force)} (${nn(K.force)})${r(K.force) != null && r(K.force) >= .5 && K.force[0] >= 20 ? '. Ça passe plutôt bien chez vous, mais un force raté coûte aussi le round d\'après' : ''}.`)],
      ['Spike posé', 'On joue le temps, on ne repeek pas, on trade en duo.', why(() => `Post-plant : ${pc(K.post)} de rounds gagnés (${nn(K.post)})${r(K.post) != null && r(K.post) >= .65 ? ', votre point fort' : ''}.`)],
      ['Retake', 'Jamais à moins de 3. Sinon on sauve l\'arme. Smoke + flash ensemble.', why(() => `Retake : ${pc(K.retake)} (${nn(K.retake)})${K.re2 && K.re2[0] ? `, dont ${nn(K.re2)} à 2 joueurs ou moins` : ''}${r(K.retake) != null && r(K.retake) < .4 ? ', votre point faible' : ''}.`)],
      ['2 défaites de suite', 'Pause de 20 min ou arrêt de la ranked pour la soirée.', 'Règle de discipline : pas encore mesurée sur vos matchs.']
    ];
  }
  /* Rapport daté : périmé dès qu'un match plus récent que sa base existe */
  function reportStatus(rep, matchList) {
    const to = rep && rep.basis && rep.basis.to; if (!to) return {stale:false, newer:0, known:false};
    const newer = (matchList || []).filter(m => m && typeof m.date === 'string' && m.date > to).length;
    return {stale:newer > 0, newer, known:true};
  }

  /* ---------- Fiabilité d'un taux : intervalle de Wilson (z = 1,645 : 9 chances sur 10) ---------- */
  function wilson(k, n, z = 1.645) {
    if (!(n > 0)) return [0, 1];
    const p = k / n, z2 = z * z, d = 1 + z2 / n, c = (p + z2 / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n)) / d;
    return [Math.max(0, c - h), Math.min(1, c + h)];
  }
  // couleur d'un taux : 'ok' si même la borne basse dépasse la référence, 'bad' si la borne haute est dessous, sinon '' (pas conclu)
  const trust = (k, n, ref = .5) => { if (!(n > 0)) return ''; const [lo, hi] = wilson(k, n); return lo > ref ? 'ok' : hi < ref ? 'bad' : ''; };
  const rateTip = (k, n) => { if (!(n > 0)) return 'Aucune donnée'; const [lo, hi] = wilson(k, n);
    return `${k}/${n} : 9 chances sur 10 que le vrai taux soit entre ${Math.round(lo * 100)} et ${Math.round(hi * 100)} %${n < 10 ? ' (trop peu de matchs pour conclure)' : ''}`; };

  /* ---------- Soirées : bilan selon le rang du match dans la soirée, et limite conseillée ---------- */
  function nthStats(nights, max = 5) { // nights : [['W','L',…], …] dans l'ordre de jeu ; dernière case = « max-ième match ou plus »
    const o = Array.from({length:max}, () => [0, 0]);
    (nights || []).forEach(a => a.forEach((r, i) => { const s = o[Math.min(i, max - 1)]; s[0]++; if (r === 'W') s[1]++; }));
    return o;
  }
  // nombre de matchs après lequel s'arrêter : premier rang (≥ 2e match) nettement perdant (borne haute < 50 %, au moins 8 matchs)
  function nightLimit(st) { for (let i = 1; i < st.length; i++) if (st[i][0] >= 8 && wilson(st[i][1], st[i][0])[1] < .5) return i; return null; }

  /* ---------- Tracker : place dans le lobby et armes (détails de match : pl[{n, t, sc}], kills[[round, ms, tueur, victime, …, arme]]) ---------- */
  function lobbyPlace(D, name) {
    let n = 0, sum = 0, mvp = 0, top = 0;
    (D || []).forEach(d => {
      const pl = d.pl || [], me = pl.find(p => p.n === name); if (!me || pl.length < 2) return;
      const place = 1 + pl.filter(p => p.sc > me.sc).length; n++; sum += place; if (place === 1) mvp++;
      if (!pl.some(p => p !== me && p.t === me.t && p.sc > me.sc)) top++;
    });
    return n ? {n, place:sum / n, mvp:mvp / n * 100, top:top / n * 100} : null;
  }
  function weaponStats(D, name) {
    const o = {}, at = w => o[w] || (o[w] = {w, k:0, d:0, fk:0});
    (D || []).forEach(d => {
      const i = (d.pl || []).findIndex(p => p.n === name); if (i < 0) return;
      const first = {};
      (d.kills || []).forEach(k => { const w = k[8] || 'Capacité / autre';
        if (k[2] === i) at(w).k++; if (k[3] === i) at(w).d++;
        if (!first[k[0]] || k[1] < first[k[0]][1]) first[k[0]] = k; });
      Object.values(first).forEach(k => { if (k[2] === i) at(k[8] || 'Capacité / autre').fk++; });
    });
    return Object.values(o).sort((a, b) => b.k - a.k || b.d - a.d);
  }

  /* ---------- Accueil & Équipe (dash.js, team.js) ---------- */
  // taux lissé vers une référence p0 avec k matchs « fictifs » : 1 ou 2 matchs ne suffisent pas à conclure
  const smooth = (w, n, p0 = .5, k = 4) => (w + k * p0) / (n + k);
  // lundi de la semaine d'une date AAAA-MM-JJ
  function weekStart(iso) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.toISOString().slice(0, 10); }
  // lignes joueur des matchs résumés [{p, win}] → chiffres « tracker » ; null quand la base manque (HS, KAST, morts vengées : matchs importés)
  function pAgg(rows) {
    const o = {n:0, w:0, k:0, d:0, a:0, acs:null, kd:null, kda:null, hs:null, kast:null, trade:null};
    let acs = 0, acsN = 0, hs = 0, sh = 0, ka = 0, r = 0, tr = 0, td = 0;
    (rows || []).forEach(({p, win}) => { o.n++; if (win) o.w++; o.k += p.k || 0; o.d += p.d || 0; o.a += p.a || 0;
      if (p.acs != null) { acs += p.acs; acsN++; } if (p.shots) { hs += p.hsN || 0; sh += p.shots; } if (p.rounds) { ka += p.kastR || 0; r += p.rounds; } if (p.traded != null && p.d) { tr += p.traded; td += p.d; } });
    if (acsN) o.acs = acs / acsN; if (o.d) { o.kd = o.k / o.d; o.kda = (o.k + o.a) / o.d; } if (sh) o.hs = hs / sh * 100; if (r) o.kast = ka / r * 100; if (td) o.trade = tr / td * 100;
    return o;
  }
  // agents conseillés sur une carte (st = playerStats() d'un joueur) : taux sur la carte lissé vers le taux de l'agent, lui-même lissé vers le taux global.
  // « sure » = au moins minN matchs sur l'agent : un agent joué 2 fois ne passe jamais devant un agent maîtrisé.
  // Sur une carte, peu de matchs par agent : lissage fort (12) pour qu'un main ne soit pas écarté après 3 défaites
  function agentPick(st, map, ok = () => true, minN = 5) {
    if (!st || !st.n) return [];
    const g = smooth(st.w, st.n, .5, 10), mp = (st.maps || {})[map] || {agents:{}};
    return Object.entries(st.agents || {}).filter(([a]) => ok(a)).map(([a, v]) => {
      const pa = smooth(v.w, v.n, g, 10), x = (mp.agents || {})[a] || {n:0, w:0};
      return {a, N:v.n, W:v.w, n:x.n, w:x.w, s:smooth(x.w, x.n, pa, 12), sure:v.n >= minN};
    }).sort((x, y) => (y.sure - x.sure) || (y.s - x.s) || (y.N - x.N));
  }
  // bilan selon le nombre de joueurs de l'effectif dans le match : [[nb, gagné], …] → {nb: [matchs, victoires]}
  function stackStats(list) { const o = {}; (list || []).forEach(([k, w]) => { const s = o[k] || (o[k] = [0, 0]); s[0]++; if (w) s[1]++; }); return o; }
  // place dans le lobby sur une mesure : pour chaque match détaillé, part des autres joueurs dépassés (égalité = moitié), moyenne en %
  const LOBBY_F = {sc:p => p.sc, dmg:p => p.dmg, kd:p => p.k - p.d, hs:p => p.sh >= 5 ? p.hs / p.sh : null};
  function lobbyPct(D, name, f = 'sc') {
    const g = LOBBY_F[f]; let n = 0, s = 0;
    (D || []).forEach(d => {
      const pl = d.pl || [], me = pl.find(p => p.n === name), v = me ? g(me) : null; if (v == null) return;
      const o = pl.filter(p => p !== me).map(g).filter(x => x != null); if (o.length < 3) return;
      n++; s += o.reduce((a, x) => a + (x < v ? 1 : x === v ? .5 : 0), 0) / o.length;
    });
    return n ? {n, p:s / n * 100} : null;
  }
  // effet du bien-être : ACS les jours de bon bilan (score ≥ cut) contre les autres ; null s'il y a moins de « min » matchs d'un côté
  function wellImpact(pairs, cut = 60, min = 3) {
    const ok = (pairs || []).filter(x => x && x.acs != null && x.s != null), g = ok.filter(x => x.s >= cut), b = ok.filter(x => x.s < cut);
    if (g.length < min || b.length < min) return null;
    const m = a => a.reduce((s, x) => s + x.acs, 0) / a.length, G = m(g), B = m(b);
    return {good:[g.length, G], bad:[b.length, B], diff:G - B};
  }
  // soirs habituels : jours (0 = lundi) où l'on a joué au moins « min » soirées (dates AAAA-MM-JJ, doublons ignorés)
  function habitDays(eves, min = 2) {
    const c = [0, 0, 0, 0, 0, 0, 0];
    [...new Set(eves || [])].forEach(e => { const d = new Date(e + 'T12:00:00'); if (!isNaN(d)) c[(d.getDay() + 6) % 7]++; });
    return c.map((n, i) => n >= min ? i : -1).filter(i => i >= 0);
  }
  // records d'un joueur : meilleur match pour chaque mesure ([{m, p}] → {k, acs, a, kd : {v, m}}) ; K/D seulement à partir de 10 kills
  function records(rows) {
    const o = {}, put = (k, v, m) => { if (v != null && Number.isFinite(v) && (!o[k] || v > o[k].v)) o[k] = {v, m}; };
    (rows || []).forEach(({m, p}) => { put('k', p.k, m); put('acs', p.acs, m); put('a', p.a, m); if ((p.k || 0) >= 10) put('kd', p.d ? p.k / p.d : p.k, m); });
    return o;
  }
  // défi réaliste de la semaine : un pas vers l'objectif, sans le dépasser (déjà atteint = le garder)
  const stepGoal = (cur, target, step) => cur == null || !(target > 0) ? null : cur >= target ? target : Math.min(target, Math.round((cur + step) * 10) / 10);
  // tranche horaire de début de match (« HH:MM ») : même découpage que les tendances d'équipe (fiches.js)
  const HOURS = ['Avant 21 h', '21 h – 23 h', '23 h – 1 h', 'Après 1 h'];
  const hourBucket = t => { if (!/^\d{1,2}:\d{2}$/.test(t || '')) return null; const h = +t.split(':')[0]; return h >= 6 && h < 21 ? 0 : h >= 21 && h < 23 ? 1 : h === 23 || h === 0 ? 2 : 3; };

  /* ---------- Fiches : comparaison au rang (joueurs de vos lobbies), détail par joueur d'un match détaillé ---------- */
  // division d'un rang de l'API (3 = Iron 1 … 27 = Radiant) : 0 = Iron … 7 = Immortal, 8 = Radiant, -1 = inconnu
  const divOf = t => !(t >= 3) ? -1 : t >= 27 ? 8 : Math.floor((t - 3) / 3);
  // rang centile d'une valeur dans une liste (égalité = moitié), de 0 à 100
  function pctRank(v, arr) { if (v == null || !arr || !arr.length) return null; let b = 0; arr.forEach(x => { b += x < v ? 1 : x === v ? .5 : 0; }); return b / arr.length * 100; }
  // centile moyen d'un joueur, match par match, contre une liste de référence (null si la référence a moins de « min » valeurs)
  function benchPct(mine, ref, min = 20) {
    const ok = v => v != null && Number.isFinite(v), m = (mine || []).filter(ok), r = (ref || []).filter(ok);
    if (!m.length || r.length < min) return null;
    return m.reduce((s, v) => s + pctRank(v, r), 0) / m.length;
  }
  // un joueur (index i) dans un match détaillé : côtés, multi-kills, clutchs 1vX, duels d'ouverture (même définitions qu'analyse.js : trade = vengé en 3 s)
  function pDetail(d, i) {
    const pl = (d && d.pl) || [], me = pl[i]; if (!me) return null;
    const byR = {}; (d.kills || []).forEach(k => (byR[k[0]] = byR[k[0]] || []).push(k));
    const tm = j => pl[j] ? pl[j].t : null, sz = t => pl.filter(p => p.t === t).length || 5, S = () => ({r:0, w:0, k:0, d:0, fk:0, fd:0, kast:0});
    const o = {r:0, side:{A:S(), D:S()}, mk:[0, 0, 0, 0, 0, 0], cl:{1:[0, 0], 2:[0, 0], 3:[0, 0], 4:[0, 0], 5:[0, 0]}, fk:0, fd:0, fkW:0, fdW:0, fdTr:0, fdT:[], surv:0};
    (d.rounds || []).forEach((r, ri) => {
      const ks = (byR[ri] || []).slice().sort((a, b) => a[1] - b[1]), won = (me.t === 1) === (r.w === 1);
      const side = r.s === 'A' || r.s === 'D' ? (me.t === 1 ? r.s : r.s === 'A' ? 'D' : 'A') : null, sd = side ? o.side[side] : null;
      const kills = ks.filter(k => k[2] === i && tm(k[3]) !== me.t).length, died = ks.find(k => k[3] === i), ast = ks.some(k => (k[9] || []).includes(i));
      const tr = !!(died && died[2] >= 0 && ks.some(k => k[3] === died[2] && k[1] >= died[1] && k[1] - died[1] <= 3000));
      const f = ks[0], fk = !!(f && f[2] === i && tm(f[3]) !== me.t), fd = !!(f && f[3] === i), kast = kills > 0 || ast || !died || tr;
      o.r++; if (!died) o.surv++; o.mk[Math.min(5, kills)]++;
      if (fk) { o.fk++; if (won) o.fkW++; }
      if (fd) { o.fd++; if (won) o.fdW++; if (tr) o.fdTr++; o.fdT.push(Math.round(f[1] / 1000)); }
      if (sd) { sd.r++; if (won) sd.w++; sd.k += kills; if (died) sd.d++; if (fk) sd.fk++; if (fd) sd.fd++; if (kast) sd.kast++; }
      // clutch : premier instant où il reste seul vivant de son équipe, face à 1 à 5 adversaires
      const al = {1:sz(1), 0:sz(0)}, dead = new Set();
      for (const k of ks) { const v = tm(k[3]); if (v != null) al[v]--; dead.add(k[3]);
        if (al[me.t] === 1) { const x = al[1 - me.t]; if (x >= 1 && !dead.has(i)) { const c = o.cl[Math.min(5, x)]; c[0]++; if (won) c[1]++; } break; } }
    });
    return o;
  }
  // utilisation des capacités : lignes [{c:[C, Q, E, X] lancers du match, r:rounds}] → lancers par round (lignes sans aucun lancer ignorées : donnée absente)
  function castRates(rows) {
    const ok = (rows || []).filter(x => x && Array.isArray(x.c) && x.c.some(v => v > 0) && x.r > 0); if (!ok.length) return null;
    const R = ok.reduce((s, x) => s + x.r, 0), per = [0, 1, 2, 3].map(j => ok.reduce((s, x) => s + (x.c[j] || 0), 0) / R);
    return {n:ok.length, r:R, per, tot:per.reduce((a, b) => a + b, 0), ultM:ok.reduce((s, x) => s + (x.c[3] || 0), 0) / ok.length};
  }
  // agents adverses sur une carte : nombre de matchs et matchs gagnés par l'équipe adverse (D : détails, t = 0 pour l'adversaire)
  function agentMeta(D, map) {
    const o = {};
    (D || []).filter(d => d && d.map === map).forEach(d => {
      const us = (d.rounds || []).filter(r => r.w === 1).length, them = (d.rounds || []).length - us;
      (d.pl || []).filter(p => p.t === 0 && p.a).forEach(p => { const s = o[p.a] || (o[p.a] = {a:p.a, n:0, w:0}); s.n++; if (them > us) s.w++; });
    });
    return Object.values(o).sort((a, b) => b.n - a.n || b.w - a.w);
  }

  /* ---------- Stratégies : couverture du playbook, phases, minimap ---------- */
  // par carte : nombre de strats d'attaque, de défense, de pistol, de retake et d'éco / anti-éco
  function coverage(strats, maps) {
    const o = {}; (maps || []).forEach(m => o[m] = {atk:0, def:0, pistol:0, retake:0, eco:0});
    (strats || []).forEach(s => { const c = o[s && s.map]; if (!c) return; const t = s.tags || [], pis = t.includes('pistol'), eco = t.includes('éco') || t.includes('anti-éco');
      if (pis) c.pistol++; if (eco) c.eco++; if (t.includes('retake')) c.retake++;
      if (!pis && !eco) { if (s.side === 'atk') c.atk++; else if (s.side === 'def') c.def++; } });
    return o;
  }
  // repère les joueurs / ennemis d'une phase et les recopie sur une autre phase (seulement ceux qui n'y sont pas encore)
  const MOVERS = ['j1', 'j2', 'j3', 'j4', 'j5', 'enemy'];
  function copyPhase(items, from, to, mkId) {
    const there = new Set((items || []).filter(it => it.phase === to && it.t === 'util' && MOVERS.includes(it.kind) && it.kind !== 'enemy').map(it => it.kind));
    return (items || []).filter(it => it.phase === from && it.t === 'util' && MOVERS.includes(it.kind) && (it.kind === 'enemy' || !there.has(it.kind)))
      .map(it => Object.assign({}, it, {id:mkId(), phase:to}));
  }
  // position du jeu (unités) depuis le canvas 1000×1000 de la minimap officielle : inverse de toCv (xf = MAP_XF de valorant-api)
  const fromCv = (xf, cx, cy) => !xf ? null : [((cy - 30) / 940 - xf[3]) / xf[1], ((cx - 30) / 940 - xf[2]) / xf[0]];
  // zone la plus proche d'un point du jeu (callouts : [[région, sous-zone, x, y], …])
  function nearestRegion(cos, x, y) { let b = null, bd = Infinity; (cos || []).forEach(c => { const dd = Math.hypot(c[2] - x, c[3] - y); if (dd < bd) { bd = dd; b = c; } }); return b; }

  /* ---------- Entraînement (train.js) : duels par distance, sensibilité, effet des séances ---------- */
  // armes à feu → famille (les kills de capacités ou au couteau ne disent rien de la visée)
  const GUN = {Classic:'pistolet', Shorty:'pistolet', Frenzy:'pistolet', Ghost:'pistolet', Sheriff:'pistolet', Bandit:'pistolet', Stinger:'SMG', Spectre:'SMG', Bucky:'pompe', Judge:'pompe',
    Bulldog:'fusil', Guardian:'fusil', Phantom:'fusil', Vandal:'fusil', Marshal:'sniper', Outlaw:'sniper', Operator:'sniper', Ares:'mitrailleuse', Odin:'mitrailleuse'};
  const DBANDS = [10, 25], BAND_FR = ['Proche (moins de 10 m)', 'Moyen (10 à 25 m)', 'Loin (25 m et plus)'];
  // duels à l'arme à feu d'un joueur (index who(d) dans chaque match détaillé) : b = [duels, gagnés] par distance (100 unités = 1 m), ouvertures, distances
  function duelStats(D, who) {
    const o = {b:[[0, 0], [0, 0], [0, 0]], all:[0, 0], op:[0, 0], dw:[], dl:[]};
    (D || []).forEach(d => {
      const pl = (d && d.pl) || [], i = who(d), me = pl[i]; if (!me) return;
      const first = {}; (d.kills || []).forEach(k => { if (!first[k[0]] || k[1] < first[k[0]][1]) first[k[0]] = k; });
      (d.kills || []).forEach(k => {
        const win = k[2] === i; if (!win && k[3] !== i) return;
        const foe = pl[win ? k[3] : k[2]]; if (!foe || foe.t === me.t || !GUN[k[8]]) return;
        o.all[0]++; if (win) o.all[1]++;
        if (first[k[0]] === k) { o.op[0]++; if (win) o.op[1]++; }
        if (k[4] == null || k[6] == null) return;
        const m = Math.hypot(k[6] - k[4], k[7] - k[5]) / 100, b = o.b[m < DBANDS[0] ? 0 : m < DBANDS[1] ? 1 : 2];
        b[0]++; if (win) b[1]++; (win ? o.dw : o.dl).push(m);
      });
    });
    return o;
  }
  // piste de sensibilité : duels proches perdus (et pas les longs) → un peu plus haute ; duels longs perdus → un peu plus basse ;
  // seulement si l'écart à 50 % est sûr (Wilson 90 %, 15 duels au moins). Zone habituelle : eDPI 200 à 400 ≈ 33 à 65 cm pour un tour complet
  function sensHint(ds, cm) {
    const t = ((ds && ds.b) || []).map(([n, w]) => n >= 15 ? trust(w, n) : ''), close = t[0], far = t[2];
    const zone = cm == null ? '' : cm < 30 ? 'haute' : cm > 75 ? 'basse' : 'ok';
    let dir = 0, why = close === 'bad' && far !== 'bad' ? 'proche' : far === 'bad' && close !== 'bad' ? 'loin' : close === 'bad' && far === 'bad' ? 'partout' : '';
    if (why === 'proche') dir = zone === 'haute' ? 0 : 1; else if (why === 'loin') dir = zone === 'basse' ? 0 : -1;
    else if (zone === 'haute' && why !== 'partout') dir = -1;
    return {t, zone, dir, why};
  }
  // test de sensibilité « PSA » : 2 valeurs [basse, haute] ; la perdante est remplacée par le milieu des deux ; 7 tours → la sensibilité retenue
  const r3 = v => Math.round(v * 1000) / 1000;
  const psaStart = s => [r3(s * .5), r3(s * 1.5)];
  const psaStep = (pair, pick) => { const w = pair[pick], mid = r3((pair[0] + pair[1]) / 2); return pick ? [mid, w] : [w, mid]; };
  // historique de sensibilité : la 1re valeur connue vaut « depuis toujours » (d vide), chaque changement est daté ; 2 changements le même jour = le dernier
  function sensHistPush(hist, old, neu, date) {
    const H = Array.isArray(hist) ? hist.slice() : [], ok = x => x && x.dpi > 0 && x.sens > 0, same = (a, b) => a && b && a.dpi === b.dpi && a.sens === b.sens;
    if (!ok(neu) || same(old, neu)) return H;
    if (!H.length && ok(old)) H.push({d:'', dpi:old.dpi, sens:old.sens});
    if (H.length > 1 && H[H.length - 1].d === date) H.pop();
    if (same(H[H.length - 1], neu)) return H;
    H.push({d:H.length ? date : '', dpi:neu.dpi, sens:neu.sens});
    return H.slice(-20);
  }
  // chiffres par période de sensibilité ; games [{date, hs, sh, acs, k, de}]
  function sensPeriods(hist, games) {
    const H = (hist || []).filter(h => h && h.sens > 0 && h.dpi > 0).slice().sort((a, b) => String(a.d || '').localeCompare(String(b.d || '')));
    const P = H.map((h, i) => ({from:h.d || '', to:H[i + 1] ? H[i + 1].d : '', dpi:h.dpi, sens:h.sens, n:0, hs:0, sh:0, acs:[], k:0, de:0}));
    (games || []).forEach(g => { const p = P.filter(x => (!x.from || g.date >= x.from) && (!x.to || g.date < x.to)).pop(); if (!p) return;
      p.n++; p.hs += g.hs || 0; p.sh += g.sh || 0; if (g.acs != null) p.acs.push(g.acs); p.k += g.k || 0; p.de += g.de || 0; });
    return P.map(p => Object.assign(p, {hsP:p.sh >= 50 ? p.hs / p.sh * 100 : null, acsM:p.acs.length ? p.acs.reduce((a, b) => a + b, 0) / p.acs.length : null, kd:p.de ? p.k / p.de : null}));
  }
  // 2 moyennes comparées (z de Welch) ; null s'il manque des valeurs
  function meanCmp(a, b) {
    const A = (a || []).filter(Number.isFinite), B = (b || []).filter(Number.isFinite); if (A.length < 2 || B.length < 2) return null;
    const m = x => x.reduce((s, v) => s + v, 0) / x.length, va = (x, mu) => x.reduce((s, y) => s + (y - mu) ** 2, 0) / (x.length - 1);
    const ma = m(A), mb = m(B), se = Math.sqrt(va(A, ma) / A.length + va(B, mb) / B.length);
    return {na:A.length, nb:B.length, ma, mb, diff:mb - ma, z:se ? (mb - ma) / se : 0};
  }
  // essai d'une nouvelle sensibilité : HS % et ACS par partie, avant / après ; verdict seulement avec « minN » parties de chaque côté
  function trialVerdict(before, after, minN = 8) {
    const A = after || [], B = before || [];
    if (A.length < minN || B.length < minN) return {v:'attente', need:Math.max(0, minN - A.length)};
    const hs = meanCmp(B.map(g => g.hs), A.map(g => g.hs)), acs = meanCmp(B.map(g => g.acs), A.map(g => g.acs));
    const zs = [hs, acs].filter(Boolean).map(x => x.z), up = zs.some(z => z >= 1.64), down = zs.some(z => z <= -1.64);
    return {v:up && !down ? 'mieux' : down && !up ? 'moins' : 'pareil', hs, acs};
  }
  // effet des séances : rows [{r : ACS / habitude du joueur, tr : séance le même soir, first : 1er match de la soirée}]
  function trainEffect(rows) {
    const R = (rows || []).filter(x => x && Number.isFinite(x.r)), g = f => meanCmp(R.filter(x => f(x) && !x.tr).map(x => x.r), R.filter(x => f(x) && x.tr).map(x => x.r));
    return {all:g(() => true), first:g(x => x.first)};
  }

  /* ---------- Recrutement (scout.js) : profil d'un joueur hors effectif, compatibilité, messages naturels ---------- */
  const encKey = id => String(id || '').toLowerCase().replace(/\s+/g, '');
  // rows : une ligne par partie {date, t 'HH:MM' ou '', dow 0 = lundi ou null, a, role, win, nR, k, d, as, sc, dmg, hs, sh, lg, kastP, fk, fd, rating, lob (ACS moyen du lobby), tr, afk, ff}
  function scoutAgg(rows) {
    const G = (rows || []).filter(r => r && r.nR > 0); if (!G.length) return null;
    const sum = f => G.reduce((s, r) => s + (+f(r) || 0), 0), R = sum(r => r.nR), n = G.length, ag = {}, rl = {};
    G.forEach(r => { ag[r.a] = (ag[r.a] || 0) + 1; rl[r.role] = (rl[r.role] || 0) + 1; });
    const role = Object.entries(rl).sort((a, b) => b[1] - a[1])[0], rat = G.map(r => r.rating).filter(Number.isFinite);
    const mr = rat.length ? rat.reduce((a, b) => a + b, 0) / rat.length : null, sd = rat.length >= 3 ? Math.sqrt(rat.reduce((s, v) => s + (v - mr) ** 2, 0) / (rat.length - 1)) : null;
    const sh = sum(r => r.sh), L = G.filter(r => r.lg != null && r.sh), shL = L.reduce((s, r) => s + r.sh, 0), lob = G.filter(r => r.lob > 0);
    const hours = [0, 0, 0, 0], days = [0, 0, 0, 0, 0, 0, 0];
    G.forEach(r => { const b = hourBucket(r.t); if (b != null) hours[b]++; if (r.dow != null && r.dow >= 0 && r.dow <= 6) days[r.dow]++; });
    const tr = G.slice().sort((a, b) => String(a.date).localeCompare(String(b.date))).map(r => r.tr).filter(t => t > 2), de = sum(r => r.d);
    return {n, w:G.filter(r => r.win).length, agents:Object.entries(ag).sort((a, b) => b[1] - a[1]).slice(0, 4), role:role[0], roleShare:role[1] / n,
      acs:sum(r => r.sc) / R, acsR:lob.length ? lob.reduce((s, r) => s + r.sc / r.nR / r.lob, 0) / lob.length * 100 : null, adr:sum(r => r.dmg) / R,
      hs:sh >= 30 ? sum(r => r.hs) / sh * 100 : null, lg:shL >= 30 ? L.reduce((s, r) => s + r.lg, 0) / shL * 100 : null, kast:sum(r => r.kastP * r.nR) / R,
      fkM:sum(r => r.fk) / n, fdM:sum(r => r.fd) / n, kd:de ? sum(r => r.k) / de : null, rating:mr, sd, hours, days,
      last:G.reduce((m, r) => r.date > m ? r.date : m, ''), afk:sum(r => r.afk), ff:sum(r => r.ff), tier:tr.length ? tr[tr.length - 1] : null};
  }
  // compatibilité 0-100 avec le besoin de l'équipe, en 5 parts expliquées ; ctx {needs:[rôles, le plus urgent d'abord], tier, days:[0-6], hb:tranche horaire}
  function fitScore(s, ctx) {
    if (!s) return null; const c = ctx || {}, needs = c.needs || [], P = {}, i = needs.indexOf(s.role);
    P.role = (i === 0 ? 35 : i > 0 ? 28 : !needs.length ? 20 : 6) * (i >= 0 && s.roleShare < .5 ? .8 : 1);
    const gap = s.tier && c.tier ? Math.abs(s.tier - c.tier) : 0;
    P.level = s.rating == null ? 10 : Math.max(0, Math.min(1, (s.rating - .75) / .5) * 25 - (gap > 6 ? 12 : gap > 3 ? 6 : 0));
    P.steady = s.sd == null ? 5 : s.sd < .2 ? 10 : s.sd < .3 ? 7 : s.sd < .4 ? 4 : 2;
    const nh = s.hours.reduce((a, b) => a + b, 0), nd = s.days.reduce((a, b) => a + b, 0);
    P.time = !nh && !nd ? 14 : (c.days && c.days.length && nd ? c.days.reduce((a, d) => a + s.days[d], 0) / nd * 12 : 6)
      + (c.hb != null && nh ? [c.hb - 1, c.hb, c.hb + 1].reduce((a, b) => a + (s.hours[b] || 0), 0) / nh * 8 : 4);
    P.behav = Math.max(0, 10 - Math.min(8, s.afk / s.n * 8) - (s.ff / s.n > 150 ? 4 : 0));
    Object.keys(P).forEach(k => P[k] = Math.round(P[k]));
    return {score:Math.min(100, Object.values(P).reduce((a, b) => a + b, 0)), parts:P, few:s.n < 3};
  }
  const ROLE_ART = {Duelist:'un duelliste', Initiator:'un initiateur', Controller:'un contrôleur', Sentinel:'une sentinelle', Flex:'un joueur flex', IGL:'un IGL'};
  const needFr = r => ROLE_ART[r] || 'un joueur';
  const frList = a => { a = (a || []).filter(Boolean); return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' et ' + a[a.length - 1]; };
  const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const hourFr = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m ? `${+m[1]} h${m[2] !== '00' ? ' ' + m[2] : ''}` : '21 h'; };
  // « le lundi et le jeudi vers 21 h », « en semaine vers 21 h », « tous les soirs… » ; jours 0 = lundi
  function dispoFr(days, hour) {
    const d = [...new Set(days || [])].filter(x => x >= 0 && x <= 6).sort(), h = ` vers ${hourFr(hour)}`;
    if (!d.length) return 'le soir';
    if (d.length === 7) return 'tous les soirs' + h;
    if (d.join() === '0,1,2,3,4') return 'en semaine' + h;
    if (d.join() === '5,6') return 'le week-end' + h;
    return frList(d.map(i => 'le ' + JOURS[i])) + h;
  }
  // date d'une partie dite comme à l'oral : « ce soir », « hier soir », « samedi soir », « il y a quelques jours »
  function whenFr(date, now) {
    const a = new Date(date + 'T12:00:00'), b = new Date(now + 'T12:00:00'), n = Math.round((b - a) / 864e5);
    return isNaN(n) ? '' : n <= 0 ? 'ce soir' : n === 1 ? 'hier soir' : n < 7 ? JOURS[(a.getDay() + 6) % 7] + ' soir' : n < 15 ? 'il y a quelques jours' : 'il y a quelque temps';
  }
  /* Messages de recrutement : tutoiement, phrases courtes, comme un joueur qui écrit sur Discord (pas de liste ni de formule toute faite).
     x : {name, agent, map, when, k, vs, games, wins, need, team, rank, dispo, day, hour, me, have, goal} ; seed = numéro de la version */
  function recruitMsg(kind, x0, seed = 0) {
    const x = Object.assign({name:'', agent:'', map:'', when:'', k:0, games:0, wins:0, need:'un joueur', team:'', rank:'', dispo:'le soir', day:'ce soir', hour:'21 h', me:'', have:'', goal:'progresser ensemble'}, x0 || {});
    const v = Math.abs(Math.round(seed)) % 3, nm = x.name ? ' ' + x.name : '', team = x.team || 'notre équipe', ag = x.agent ? ` en ${x.agent}` : '', kTxt = x.k >= 15 ? `, ${x.k} kills` : '';
    const praise = x.k >= 20 ? ` (${x.k} kills, gros match)` : x.k >= 15 ? ' et t\'as vraiment bien joué' : ' et t\'as fait le taf', where = x.map + (x.when ? ' ' + x.when : '');
    const met = x.games >= 3 ? [`on a fait ${x.games} games ensemble ces derniers temps (${x.wins} gagnées) et t'étais solide à chaque fois`, `ça fait ${x.games} games qu'on tombe ensemble, toujours propre`, `on est tombés ${x.games} fois ensemble en ranked (${x.wins} victoires), gg`]
      : x.map && x.vs ? [`on t'a eu en face sur ${where}${ag ? ` et franchement${ag} tu nous as fait mal` : ', tu nous as fait mal'}`, `gg pour la game sur ${where}, t'étais en face${ag} et t'as été solide`, `t'étais contre nous sur ${where} (${x.agent || 'gg'}${kTxt}), bien joué`]
      : x.map ? [`on était ensemble sur ${where}${ag ? `, t'étais${ag}` : ''}${praise}`, `c'était cool la game sur ${where}${ag ? `, bien joué${ag}` : ''}`, `je t'ai eu en mate sur ${where} (${x.agent || 'gg'}${kTxt}), gg`]
      : [`je suis tombé sur ton profil${ag ? `,${ag} t'as l'air solide` : ', t\'as l\'air solide'}`, `j'ai regardé tes games${ag}, c'est propre`, `je regardais des profils${x.rank ? ' ' + x.rank : ''} et le tien m'a tapé dans l'œil`];
    const low = String(x.agent || '').toLowerCase(), T = {
      dm:[`salut${nm}, ${met[0]}. on monte une team${x.team ? ` (${x.team})` : ''} et il nous manque ${x.need}. ça te dit de faire 2-3 games avec nous un soir pour voir si ça colle ?`,
        `yo${nm} ! ${met[1]}. on cherche ${x.need} pour compléter notre 5, on joue surtout ${x.dispo}. t'es chaud pour tester avec nous ?`,
        `hello${nm}, ${met[2]}. on est une petite équipe${x.rank ? ' ' + x.rank : ''} qui fait de la ranked à 5 et quelques tournois. il nous manque ${x.need}, si jamais ça t'intéresse dis-moi`],
      chat:[`gg${low ? ' ' + low : ''}, t'as un discord ? on cherche ${x.need} pour notre team`, `wp${low ? ' ' + low : ''}, on monte une team et il nous manque ${x.need}, ça t'intéresse ?`,
        `gg ! ${low ? low + ' ' : ''}t'étais chaud, ajoute-moi si tu veux jouer avec nous`],
      relance:[`re${nm}, je relance pour les games de test. aucun souci si t'es pas dispo, dis-moi juste`, `hey${nm}, t'as vu mon message ? on joue ${x.day} vers ${x.hour} si tu veux tester avec nous`,
        `salut${nm}, toujours partant pour quelques games avec nous ? sinon pas de problème`],
      tryout:[`top ! on peut faire une session de test ${x.day} vers ${x.hour} ? 3 à 5 games, rien de prise de tête.${x.me ? ` ajoute-moi : ${x.me}` : ''}`,
        `cool ! ${x.day} vers ${x.hour} ça te va ? on fera quelques games ensemble pour voir comment ça se passe.${x.me ? ` mon pseudo : ${x.me}` : ''}`,
        `parfait. dispo ${x.day} vers ${x.hour} ? on lance 3-4 games à 5.${x.me ? ` tu peux m'ajouter : ${x.me}` : ''}`],
      oui:[`c'est validé de notre côté, bienvenue dans ${team} ! je t'ajoute sur le discord et je te passe nos strats. prochaine session ${x.day} à ${x.hour}`,
        `bon, on en a parlé et c'est oui pour nous. bienvenue${nm} ! on se retrouve ${x.day} à ${x.hour} pour caler les rôles et les compos`,
        `bienvenue dans l'équipe${nm} ! première session ensemble ${x.day} vers ${x.hour}, je t'envoie le lien du discord`],
      non:[`merci pour les games${nm}, c'était cool. on part sur un autre profil pour l'instant, mais bonne continuation et peut-être à bientôt en ranked`,
        `hello${nm}, merci d'avoir pris le temps de jouer avec nous. on ne va pas continuer ensemble pour le moment, mais t'as été réglo du début à la fin. bonne suite !`,
        `merci d'avoir testé avec nous${nm}. pour l'instant on cherche un profil un peu différent, mais je garde ton contact. bon jeu`],
      annonce:[`[FR] ${x.team || 'Notre équipe'} cherche ${x.need}\nRang : ${x.rank || 'à voir'} · Dispo : ${x.dispo}\nAu programme : ranked à 5, scrims et tournois amateurs${x.have ? `\nOn a déjà ${x.have}` : ''}\nCe qu'on attend : un micro, du calme et de la régularité\nMP si t'es intéressé (Riot ID + agents joués)`,
        `Salut ! On est ${x.team || 'une équipe'}, une équipe FR${x.rank ? ' ' + x.rank : ''} qui joue ${x.dispo}. On cherche ${x.need} pour compléter le 5 : ranked ensemble, scrims, tournois. Pas besoin d'être un monstre, le plus important c'est d'être régulier et de parler en jeu. Envoie-moi ton Riot ID et tes agents en MP.`,
        `${x.team || 'Notre équipe'} recrute ${x.need} (${x.rank ? x.rank + ', ' : ''}FR). On joue ${x.dispo}, objectif : ${x.goal}. Si tu cherches une équipe sérieuse mais détendue, MP avec ton Riot ID.`],
      tweet:[`#LFP #ValorantFR ${x.team || 'Notre équipe'}${x.rank ? ` (${x.rank}, FR)` : ' (FR)'} cherche ${x.need}. On joue ${x.dispo} : ranked à 5 + tournois. MP ouverts`,
        `On cherche ${x.need} pour ${team} ! FR${x.rank ? ', ' + x.rank : ''}, dispo ${x.dispo}. Ranked, scrims, tournois. DM si chaud #LFP #VALORANT`,
        `${x.team || 'Notre équipe'} recrute : ${x.need}${x.rank ? ' ' + x.rank : ''} FR, dispo ${x.dispo}. Équipe chill mais sérieuse. RT apprécié #LFP #ValorantFR`]
    };
    const out = (T[kind] || T.dm)[v];
    return kind === 'tweet' && out.length > 280 ? out.slice(0, 277) + '…' : out;
  }

  /* ================= SITE PUBLIC (dossier public/, copié par tools/publier.ps1) =================
     Licences signées, offres gratuit / premium, réglages publiés, parties « stored-matches », détail v4, rapport de match, thème. */
  const ridNorm = s => String(s || '').toLowerCase().replace(/\s+/g, '');
  const clampN = (v, a, b) => Math.max(a, Math.min(b, v));
  const intIn = (v, a, b, d) => { const n = toNum(v); return n == null ? d : clampN(Math.round(n), a, b); };
  const strMax = (v, max) => typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '';
  const isoLoc = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);

  /* ---------- base64url ⇄ octets, UTF-8 ---------- */
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function b64uEnc(bytes) {
    const b = bytes || []; let s = '', i = 0;
    for (; i + 2 < b.length; i += 3) { const n = b[i] << 16 | b[i + 1] << 8 | b[i + 2]; s += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + B64[n & 63]; }
    if (b.length - i === 1) { const n = b[i] << 16; s += B64[n >> 18 & 63] + B64[n >> 12 & 63]; }
    else if (b.length - i === 2) { const n = b[i] << 16 | b[i + 1] << 8; s += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63]; }
    return s;
  }
  function b64uDec(s) {
    if (typeof s !== 'string' || !/^[A-Za-z0-9_-]*$/.test(s) || s.length % 4 === 1) return null;
    const out = []; let buf = 0, bits = 0;
    for (const ch of s) { buf = (buf << 6 | B64.indexOf(ch)) & 0xffffff; bits += 6; if (bits >= 8) { bits -= 8; out.push(buf >> bits & 255); } }
    return new Uint8Array(out);
  }
  const utf8 = s => new TextEncoder().encode(String(s));
  const fromUtf8 = b => new TextDecoder().decode(b);

  /* ---------- Licences Premium : « PH1.<contenu>.<signature> », signées par le mode Dieu (ECDSA P-256, js/licence.js) ----------
     Le contenu est lié à un Riot ID (rid normalisé) ; « * » = licence Dieu (tous les comptes, plan dieu seulement). exp vide = à vie. */
  const LIC_PLANS = ['premium', 'dieu'], RE_LID = /^[A-Za-z0-9-]{4,40}$/;
  const licBody = p => JSON.stringify({v:1, id:p.id, rid:p.rid, plan:p.plan, iat:p.iat, exp:p.exp || '', who:p.who || ''}); // ordre fixe : la signature porte sur ce texte exact
  const licHead = p => 'PH1.' + b64uEnc(utf8(licBody(p)));
  function licParse(code) {
    const m = /^PH1\.([A-Za-z0-9_-]{10,2000})\.([A-Za-z0-9_-]{40,200})$/.exec(String(code || '').replace(/\s+/g, ''));
    if (!m) return {err:'format'};
    const pb = b64uDec(m[1]), sig = b64uDec(m[2]); if (!pb || !sig) return {err:'format'};
    let p; try { p = JSON.parse(fromUtf8(pb)); } catch (e) { return {err:'format'}; }
    const bad = !obj(p) || p.v !== 1 || !RE_LID.test(p.id || '') || typeof p.rid !== 'string' || !p.rid || p.rid.length > 40 || !LIC_PLANS.includes(p.plan)
      || !RE_DATE.test(p.iat || '') || (p.exp && !RE_DATE.test(p.exp)) || (p.who != null && typeof p.who !== 'string') || (p.rid === '*' && p.plan !== 'dieu');
    return bad ? {err:'format'} : {p, head:'PH1.' + m[1], sig};
  }
  // contrôle après la signature : bon compte, pas expirée, pas révoquée ; days = jours restants (null = à vie)
  function licCheck(p, rid, today, revoked) {
    if (!p) return {ok:false, why:'format'};
    if ((revoked || []).includes(p.id)) return {ok:false, why:'revoquee'};
    if (p.rid !== '*' && p.rid !== ridNorm(rid)) return {ok:false, why:'compte'};
    if (p.exp && p.exp < today) return {ok:false, why:'expiree', exp:p.exp};
    return {ok:true, plan:p.plan, exp:p.exp || '', days:p.exp ? Math.round((Date.parse(p.exp + 'T12:00:00Z') - Date.parse(today + 'T12:00:00Z')) / 864e5) : null};
  }
  const LIC_WHY = {format:'Code incomplet ou mal copié.', signature:'Code non reconnu (il n\'a pas été créé par ce site).', compte:'Ce code est lié à un autre Riot ID.', expiree:'Ce code a expiré.', revoquee:'Ce code a été désactivé.', cle:'Le site n\'a pas encore de clé de vérification (réglage du propriétaire).'};
  const LIC_DUR = {'1m':['1 mois', 1], '3m':['3 mois', 3], '6m':['6 mois', 6], '1a':['1 an', 12], vie:['à vie', 0]};
  function licExp(iat, dur) {
    const n = (LIC_DUR[dur] || [])[1]; if (!n || !RE_DATE.test(iat || '')) return '';
    const d = new Date(iat + 'T12:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10);
  }
  const jwkPub = k => obj(k) && k.kty === 'EC' && k.crv === 'P-256' && /^[A-Za-z0-9_-]{43}$/.test(k.x || '') && /^[A-Za-z0-9_-]{43}$/.test(k.y || '') ? {kty:'EC', crv:'P-256', x:k.x, y:k.y} : null;

  /* ---------- Offres : ce qui est gratuit, ce qui est Premium (core = toujours gratuit : Riot exige un niveau gratuit) ---------- */
  const FEATURES = {
    profil:{n:'Profil, rang, RR et pic', free:true, core:true},
    parties:{n:'Tes dernières parties (stats complètes)', free:true, core:true},
    agentsCartes:{n:'Stats par agent et par carte', free:true, core:true},
    dernier:{n:'Rapport détaillé de ta dernière partie', free:true},
    themeAuto:{n:'Interface aux couleurs de ton agent principal', free:true, core:true},
    historique:{n:'Historique long : jusqu\'à 100 parties'},
    rapports:{n:'Rapport détaillé de chaque partie (rounds, impact, moments clés)'},
    visee:{n:'Visée : duels par distance, armes, piste de sensibilité'},
    progression:{n:'Progression : courbe RR, semaines, sessions, limite du soir'},
    coach:{n:'Coach : ta place dans tes lobbys + priorités chiffrées + exercices'},
    comparer:{n:'Comparer avec un ami'},
    perso:{n:'Personnalisation complète : fonds, polices, couleurs, effets, disposition'},
    partage:{n:'Carte de profil à partager (image)'}
  };
  const PREM_DEF = Object.keys(FEATURES).filter(k => !FEATURES[k].free);
  function featOn(f, plan, cfg) {
    const F = FEATURES[f]; if (!F) return false;
    if (F.core || plan === 'premium' || plan === 'dieu' || (cfg && cfg.freeAll)) return true;
    return !(cfg && Array.isArray(cfg.premium) ? cfg.premium : PREM_DEF).includes(f);
  }

  /* ---------- Réglages publiés (public/config.json + réglages en direct du serveur) : seulement des valeurs sûres ---------- */
  const PUB_DEF = {format:'prohub-public', version:1, nom:'Elitrack', slogan:'Ton tracker perso, à tes couleurs', proxy:'', licKey:null,
    achat:{mensuel:'2,99 €', vie:'14,99 €', lien:'', contact:''}, freeAll:false, premium:PREM_DEF, annonce:'', maintenance:false, revoked:[], limite:20, maj:''};
  const httpsUrl = (v, max = 300) => typeof v === 'string' && v.length <= max && /^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[^\s"'<>\\`]*)?$/.test(v.trim()) ? v.trim().replace(/\/+$/, '') : '';
  // adresse d'une demande au serveur du site : Google Apps Script → …/exec?p=chemin&… ; Cloudflare → …/chemin?…
  const isGoogle = u => /^https:\/\/script\.google\.com\//.test(u || '');
  function proxyUrl(base, path) {
    if (!isGoogle(base)) return base + path;
    const i = path.indexOf('?'), p = (i < 0 ? path : path.slice(0, i)).replace(/^\/+/, ''), q = i < 0 ? '' : path.slice(i + 1);
    return `${base}?p=${encodeURIComponent(p)}${q ? '&' + q : ''}`;
  }
  // base : réglages déjà connus (un champ absent garde sa valeur) ; le serveur ne peut jamais changer la clé de vérification ni son adresse (lock)
  function pubCfg(raw, base, lock) {
    const r = obj(raw) ? raw : {}, b = Object.assign({}, PUB_DEF, base || {}), a = obj(r.achat) ? r.achat : {}, ba = Object.assign({}, PUB_DEF.achat, b.achat || {});
    const has = k => Object.prototype.hasOwnProperty.call(r, k), ha = k => Object.prototype.hasOwnProperty.call(a, k);
    const o = {format:'prohub-public', version:1,
      nom:has('nom') ? strMax(r.nom, 40) || PUB_DEF.nom : b.nom, slogan:has('slogan') ? strMax(r.slogan, 120) : b.slogan,
      proxy:has('proxy') && !lock ? httpsUrl(r.proxy) : b.proxy, licKey:has('licKey') && !lock ? jwkPub(r.licKey) : jwkPub(b.licKey),
      achat:{mensuel:ha('mensuel') ? strMax(a.mensuel, 20) : ba.mensuel, vie:ha('vie') ? strMax(a.vie, 20) : ba.vie, lien:ha('lien') ? httpsUrl(a.lien) : ba.lien, contact:ha('contact') ? strMax(a.contact, 120) : ba.contact},
      freeAll:has('freeAll') ? r.freeAll === true : !!b.freeAll,
      premium:has('premium') && Array.isArray(r.premium) ? [...new Set(r.premium.filter(k => FEATURES[k] && !FEATURES[k].core))] : (b.premium || PREM_DEF).slice(),
      annonce:has('annonce') ? strMax(r.annonce, 300) : b.annonce, maintenance:has('maintenance') ? r.maintenance === true : !!b.maintenance,
      revoked:has('revoked') && Array.isArray(r.revoked) ? [...new Set(r.revoked.filter(x => typeof x === 'string' && RE_LID.test(x)))].slice(0, 5000) : (b.revoked || []).slice(),
      limite:has('limite') ? intIn(r.limite, 5, 40, 20) : b.limite, maj:has('maj') && RE_DATE.test(r.maj || '') ? r.maj : b.maj};
    return o;
  }

  /* ---------- Parties « stored-matches » (HenrikDev v1) → lignes compactes ---------- */
  const scoreOf = v => obj(v) ? toNum(v.rounds_won ?? v.won ?? v.score) : toNum(v);
  function smRow(sm) {
    const m = (sm && sm.meta) || {}, s = (sm && sm.stats) || {}, T = (sm && sm.teams) || {};
    if (typeof m.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(m.id)) return null;
    const team = String(s.team || '').toLowerCase(), us = scoreOf(T[team]), them = scoreOf(T[team === 'red' ? 'blue' : 'red']);
    if (!/^(red|blue)$/.test(team) || us == null || them == null) return null;
    const sh = s.shots || {}, dm = s.damage || {}, n = v => toNum(v) || 0, ts = Date.parse(m.started_at) || 0;
    return {id:m.id.toLowerCase(), ts, date:ts ? isoLoc(new Date(ts)) : '', map:strMax((m.map || {}).name, 20) || '?', season:strMax((m.season || {}).short, 12), agent:strMax((s.character || {}).name, 20) || '?',
      tier:n(s.tier), team, us, them, res:us > them ? 'W' : us < them ? 'L' : 'D', r:Math.max(1, us + them),
      k:n(s.kills), d:n(s.deaths), a:n(s.assists), sc:n(s.score), hs:n(sh.head), bs:n(sh.body), ls:n(sh.leg), dmg:n(dm.made), rec:n(dm.received)};
  }
  // chiffres d'une liste de parties : V %, K/D, ACS, ADR, HS %, jambes %, DDΔ (dégâts donnés − reçus par round), kills par round
  function rowsAgg(rows) {
    const o = {n:0, w:0, l:0, k:0, d:0, a:0, sc:0, r:0, dmg:0, rec:0, hs:0, sh:0, ls:0};
    (rows || []).forEach(x => { o.n++; if (x.res === 'W') o.w++; if (x.res === 'L') o.l++; o.k += x.k; o.d += x.d; o.a += x.a; o.sc += x.sc; o.r += x.r; o.dmg += x.dmg; o.rec += x.rec; o.hs += x.hs; o.ls += x.ls; o.sh += x.hs + x.bs + x.ls; });
    return Object.assign(o, {wr:o.n ? o.w / o.n * 100 : null, kd:o.d ? o.k / o.d : o.n ? o.k : null, kda:o.d ? (o.k + o.a) / o.d : null, acs:o.r ? o.sc / o.r : null, adr:o.r ? o.dmg / o.r : null,
      hsP:o.sh ? o.hs / o.sh * 100 : null, lsP:o.sh ? o.ls / o.sh * 100 : null, dd:o.r ? (o.dmg - o.rec) / o.r : null, kpr:o.r ? o.k / o.r : null});
  }
  function aggBy(rows, key) {
    const g = {}; (rows || []).forEach(x => (g[x[key]] = g[x[key]] || []).push(x));
    return Object.entries(g).map(([k, a]) => Object.assign(rowsAgg(a), {key:k, last:Math.max(...a.map(x => x.ts))})).sort((a, b) => b.n - a.n || b.last - a.last);
  }
  // agent principal : le plus joué sur les « n » dernières parties (égalité : le plus récent)
  function mainAgent(rows, n = 30) { const a = aggBy((rows || []).slice().sort((x, y) => y.ts - x.ts).slice(0, n), 'agent'); return a.length ? a[0].key : null; }
  // sessions de jeu : parties à moins de « gapH » heures d'écart = même session (ordre chronologique)
  function sessionsOf(rows, gapH = 3) {
    const S = []; (rows || []).filter(x => x.ts).slice().sort((a, b) => a.ts - b.ts).forEach(x => { const s = S[S.length - 1];
      if (s && x.ts - s[s.length - 1].ts <= gapH * 36e5) s.push(x); else S.push([x]); });
    return S;
  }
  // série en cours (dernières parties) : {res:'W'|'L', n}
  function serieOf(rows) { const a = (rows || []).slice().sort((x, y) => y.ts - x.ts).filter(x => x.res !== 'D'); let n = 0; while (n < a.length && a[n].res === a[0].res) n++; return a.length ? {res:a[0].res, n} : null; }

  /* ---------- Détail compact d'une partie (API v4) : même format que js/analyse.js (hdDetail), sans aucun Riot ID ----------
     team = équipe du joueur (team_id), nameOf(joueur API) → nom à garder ('' sinon : joueurs anonymes). */
  function v4Detail(md, team, nameOf) {
    const meta = md.metadata || {}, players = md.players || [], idx = {};
    const pl = players.map((p, i) => { idx[p.puuid] = i; const st = p.stats || {}, ac = p.ability_casts || {};
      return {n:nameOf ? nameOf(p) || '' : '', a:(p.agent || {}).name || '?', t:p.team_id === team ? 1 : 0, sc:st.score || 0, k:st.kills || 0, d:st.deaths || 0, as:st.assists || 0,
        hs:st.headshots || 0, sh:(st.headshots || 0) + (st.bodyshots || 0) + (st.legshots || 0), lg:st.legshots || 0, dmg:(st.damage || {}).dealt || 0, rec:(st.damage || {}).received || 0,
        c:[ac.grenade || 0, ac.ability1 || 0, ac.ability2 || 0, ac.ultimate || 0], tr:(p.tier || {}).id || 0, lv:p.account_level || null}; });
    const tOf = id => idx[id] == null ? null : pl[idx[id]].t;
    const rounds = (md.rounds || []).slice().sort((a, b) => a.id - b.id), kAll = (md.kills || []).filter(k => k && k.victim);
    const kr = [...new Set(kAll.map(k => k.round))], off = rounds.length && kr.length ? clampN(rounds[0].id - Math.min(...kr), -1, 1) : 0;
    const planter = rounds.map(r => r.plant && r.plant.player ? tOf(r.plant.player.puuid) : null);
    const vote = (a, b) => { let s = 0; for (let i = a; i < Math.min(b, rounds.length); i++) if (planter[i] != null) s += planter[i] === 1 ? 1 : -1; return s; };
    const v1 = vote(0, 12) - vote(12, 24), s1 = v1 >= 0 ? 'A' : 'D', s2 = s1 === 'A' ? 'D' : 'A';
    const sideOf = i => planter[i] != null ? (planter[i] === 1 ? 'A' : 'D') : v1 === 0 ? '?' : i < 12 ? s1 : i < 24 ? s2 : ((i - 24) % 2 === 0 ? s1 : s2);
    const size = t => pl.filter(p => p.t === t).length || 5;
    const rr = rounds.map((r, i) => {
      const load = t => (r.stats || []).filter(s => s.player && tOf(s.player.puuid) === t).reduce((a, s) => a + ((s.economy || {}).loadout_value || 0), 0);
      const ks = kAll.filter(k => k.round + off === r.id), w = r.winning_team === team ? 1 : 0, lose = w ? 0 : 1;
      const e = r.defuse ? 'defuse' : ks.filter(k => tOf(k.victim.puuid) === lose).length >= size(lose) ? 'elim' : r.plant ? 'spike' : 'time';
      return {w, s:sideOf(i), ol:load(1), tl:load(0), p:r.plant ? (r.plant.site || '?') : '', pu:planter[i] == null ? -1 : planter[i], pt:r.plant ? r.plant.round_time_in_ms || 0 : 0, df:r.defuse ? 1 : 0, e};
    });
    const pos = (k, id) => { const x = (k.player_locations || []).find(p => p.player && p.player.puuid === id); return x && x.location ? x.location : null; };
    const kills = kAll.map(k => { const ri = rounds.findIndex(r => r.id === k.round + off), vl = k.location || null, kl = k.killer ? pos(k, k.killer.puuid) : null;
      return [ri, k.time_in_round_in_ms || 0, k.killer && idx[k.killer.puuid] != null ? idx[k.killer.puuid] : -1, idx[k.victim.puuid] ?? -1,
        vl ? Math.round(vl.x) : null, vl ? Math.round(vl.y) : null, kl ? Math.round(kl.x) : null, kl ? Math.round(kl.y) : null, (k.weapon || {}).name || '', (k.assistants || []).map(a => idx[a.puuid]).filter(x => x != null)];
    }).filter(k => k[0] >= 0 && k[3] >= 0);
    const t0 = Date.parse(meta.started_at) || 0;
    return {id:String(meta.match_id || '').toLowerCase(), v:5, map:(meta.map || {}).name || '?', date:t0 ? isoLoc(new Date(t0)) : '', ts:t0, rounds:rr, kills, pl};
  }

  /* ---------- Rapport d'une partie détaillée : lignes joueurs (rating HLTV 2.0 approché), chances de gagner le round, impact ---------- */
  const grp = (a, f) => a.reduce((o, x) => { const k = f(x); (o[k] = o[k] || []).push(x); return o; }, {});
  function plLines(d) {
    const nR = d.rounds.length || 1, byR = grp(d.kills, k => k[0]), tm = i => d.pl[i] ? d.pl[i].t : null;
    return d.pl.map((p, i) => {
      let kast = 0, fk = 0, fd = 0, mk = 0, trd = 0;
      for (let r = 0; r < nR; r++) {
        const ks = (byR[r] || []).slice().sort((a, b) => a[1] - b[1]), died = ks.find(k => k[3] === i), kills = ks.filter(k => k[2] === i && tm(k[3]) !== p.t).length, ast = ks.some(k => (k[9] || []).includes(i));
        const tr = !!(died && died[2] >= 0 && ks.some(k => k[3] === died[2] && k[1] >= died[1] && k[1] - died[1] <= 3000));
        if (kills || ast || !died || tr) kast++; if (tr) trd++; if (kills >= 3) mk++;
        if (ks[0]) { if (ks[0][2] === i && tm(ks[0][3]) !== p.t) fk++; if (ks[0][3] === i) fd++; }
      }
      const KPR = p.k / nR, DPR = p.d / nR, APR = p.as / nR, KAST = kast / nR * 100, ADR = p.dmg / nR, imp = 2.13 * KPR + .42 * APR - .41;
      return {i, p, kast:KAST, adr:ADR, acs:p.sc / nR, hs:p.sh ? p.hs / p.sh * 100 : null, fk, fd, mk, trd, util:p.c.reduce((a, b) => a + b, 0) / nR,
        rating:.0073 * KAST + .3591 * KPR - .5329 * DPR + .2372 * imp + .0032 * ADR + .1587};
    });
  }
  const BUYK = v => v < 5000 ? 'eco' : v < 15000 ? 'force' : 'full';
  const lgt = p => Math.log(p / (1 - p)), ilgt = x => 1 / (1 + Math.exp(-x));
  // modèle appris sur les parties détaillées : S[« vivants nous|eux|spike »] et E[« achat nous|achat eux »] = [rounds, gagnés]
  function wpFit(D) {
    const S = {}, E = {}, add = (o, k, w) => { const c = o[k] || (o[k] = [0, 0]); c[0]++; if (w) c[1]++; };
    (D || []).forEach(d => { const byR = grp(d.kills, k => k[0]), sz = t => d.pl.filter(p => p.t === t).length || 5;
      d.rounds.forEach((r, i) => [1, 0].forEach(t => {
        const won = (r.w === 1) === (t === 1); if (i !== 0 && i !== 12) add(E, BUYK(t === 1 ? r.ol : r.tl) + '|' + BUYK(t === 1 ? r.tl : r.ol), won);
        let a = sz(t), b = sz(1 - t), pl = 'n'; add(S, `${a}|${b}|n`, won);
        (byR[i] || []).slice().sort((x, y) => x[1] - y[1]).forEach(k => { if (r.pt && k[1] > r.pt && pl === 'n' && r.pu >= 0) pl = r.pu === t ? 'u' : 't';
          const v = d.pl[k[3]] ? d.pl[k[3]].t : null; if (v === t) a--; else if (v === 1 - t) b--; if (a > 0 && b > 0) add(S, `${a}|${b}|${pl}`, won); });
      })); });
    return {S, E};
  }
  function wpProb(M, a, b, pl, ec) {
    if (a <= 0) return pl === 'u' ? .3 : .01; if (b <= 0) return pl === 't' ? .7 : .99;
    const prior = ilgt(.75 * (a - b) + (pl === 'u' ? .9 : pl === 't' ? -.9 : 0)), c = M.S[`${a}|${b}|${pl}`] || [0, 0], ps = (c[1] + 6 * prior) / (c[0] + 6);
    return clampN(ilgt(lgt(clampN(ps, .02, .98)) + (ec || 0) * (a + b) / 10), .01, .99);
  }
  const ecoL = (M, me, op) => { const c = M.E[BUYK(me) + '|' + BUYK(op)] || [0, 0]; return lgt(clampN((c[1] + 2) / (c[0] + 4), .05, .95)); };
  // déroulé de chaque round : chances de gagner avant / après chaque kill, plant et fin (catégories du rapport du hub)
  function flowOf(d, M) {
    const byR = grp(d.kills, k => k[0]), tm = i => d.pl[i] ? d.pl[i].t : null, sz = t => d.pl.filter(p => p.t === t).length || 5;
    return d.rounds.map((r, i) => {
      const ec = i === 0 || i === 12 ? 0 : ecoL(M, r.ol, r.tl), ks = (byR[i] || []).slice().sort((x, y) => x[1] - y[1]), ev = [];
      let a = sz(1), b = sz(0), pl = 'n', p = wpProb(M, a, b, pl, ec); const p0 = p; let mx = p, mn = p;
      const plant = () => { pl = r.pu === 1 ? 'u' : 't'; const np = wpProb(M, a, b, pl, ec); ev.push({cat:'plant', d:np - p, pb:p, pa:np, us:r.pu === 1}); p = np; };
      ks.forEach((k, j) => {
        if (r.pt && k[1] > r.pt && pl === 'n' && r.pu >= 0) plant();
        const v = tm(k[3]), kt = tm(k[2]), st = `${a}v${b}`; if (v === 1) a--; else if (v === 0) b--;
        const np = wpProb(M, a, b, pl, ec), cat = !j ? 'ouverture' : pl === 'u' ? 'post' : pl === 't' ? 'retake' : (kt === 1 && a === 1) || (kt === 0 && b === 1) ? 'clutch' : ks.slice(0, j).some(q => q[2] === k[3] && k[1] - q[1] <= 3000) ? 'trade' : 'mid';
        ev.push({cat, d:np - p, pb:p, pa:np, killer:k[2], victim:k[3], ours:kt === 1, st:`${st} → ${a}v${b}`, t:Math.round(k[1] / 1000), w:k[8] || ''});
        p = np; mx = Math.max(mx, p); mn = Math.min(mn, p);
      });
      if (r.pt && pl === 'n' && r.pu >= 0) plant();
      ev.push({cat:'fin', d:(r.w ? 1 : 0) - p, pb:p, pa:r.w ? 1 : 0, e:r.e});
      return {i, r, p0, ev, mx, mn, thrown:!r.w && mx >= .75, stolen:!!r.w && mn <= .25};
    });
  }
  // synthèse chiffrée pour le joueur « me » (index) : rounds attendus, phases, impact en rounds, moments clés, rounds jetés / volés, achats
  function matchSum(d, M, me) {
    const F = flowOf(d, M), L = plLines(d), cats = {}, imp = {}, mine = {};
    F.forEach(f => f.ev.forEach(e => { cats[e.cat] = (cats[e.cat] || 0) + e.d;
      if (e.killer != null) { const g = e.ours ? e.d : -e.d; imp[e.killer] = (imp[e.killer] || 0) + g; imp[e.victim] = (imp[e.victim] || 0) - g;
        if (e.killer === me) mine[e.cat] = (mine[e.cat] || 0) + g; if (e.victim === me) mine[e.cat] = (mine[e.cat] || 0) - g; } }));
    const exp = F.reduce((s, f) => s + f.p0, 0), won = F.filter(f => f.r.w).length;
    const live = e => e.cat !== 'fin' && e.pa > .03 && e.pa < .97;
    const key = F.flatMap(f => f.ev.filter(e => live(e) && (e.killer === me || e.victim === me)).map(e => ({r:f.i, e}))).sort((x, y) => Math.abs(y.e.d) - Math.abs(x.e.d)).slice(0, 5);
    const eco = {}; F.forEach(f => { if (f.i === 0 || f.i === 12) return; const k = BUYK(f.r.ol) + '|' + BUYK(f.r.tl), e = eco[k] || (eco[k] = {n:0, w:0, x:0}); e.n++; e.x += f.p0; if (f.r.w) e.w++; });
    const meP = d.pl[me] || {}, place = 1 + d.pl.filter(p => p.sc > (meP.sc || 0)).length, teamTop = !d.pl.some((p, i) => i !== me && p.t === meP.t && p.sc > meP.sc);
    return {F, L, me:L[me] || null, won, exp, cats, imp, myImp:imp[me] || 0, mine, key, eco, place, teamTop, thrown:F.filter(f => f.thrown), stolen:F.filter(f => f.stolen)};
  }

  /* ---------- Coach du site public : priorités à partir de ta place dans tes lobbys (centiles), jamais de chiffre inventé ---------- */
  // s : {pct:{sc, dmg, kd, hs} centiles 0-100 ou null, op:[duels d'ouverture, gagnés], fd:premières morts par round, tr:% de morts vengées, kast, n:parties détaillées, b:[[duels, gagnés] proche, moyen, loin]}
  function coachPub(s) {
    const out = [], P = (s && s.pct) || {}, add = (lvl, k, t, why, fix) => out.push({lvl, k, t, why, fix});
    if (!s || !(s.n >= 3)) return [{lvl:1, k:'data', t:'Données insuffisantes', why:'Il faut au moins 3 parties détaillées.', fix:'Joue quelques parties puis actualise : l\'analyse se fait toute seule.'}];
    if (P.hs != null && P.hs < 40) add(P.hs < 25 ? 3 : 2, 'hs', 'Placement du viseur (HS %)', `Tu fais mieux que ${Math.round(P.hs)} % des joueurs de tes parties.`, '10 min de Deathmatch « tête seulement » + viseur à hauteur de tête en te déplaçant.');
    if (s.op && s.op[0] >= 10 && trust(s.op[1], s.op[0]) === 'bad') add(3, 'op', 'Duels d\'ouverture', `${s.op[1]}/${s.op[0]} gagnés : nettement moins d'un sur deux.`, 'Ne prends plus le premier duel « à sec » : demande une flash ou une info avant, ou laisse l\'ouverture au duelliste.');
    if (s.fd != null && s.fd > .17) add(2, 'fd', 'Premier mort trop souvent', `${Math.round(s.fd * 100)} % des rounds, tu es le premier à mourir.`, 'Joue le 2e contact : place-toi derrière un coéquipier pour reprendre son duel (trade).');
    if (s.tr != null && s.tr < 15 && s.n >= 5) add(1, 'tr', 'Morts non vengées', `Seulement ${Math.round(s.tr)} % de tes morts sont vengées en 3 s.`, 'Reste à portée de tes coéquipiers : un duo à 1-2 s d\'écart gagne plus de duels.');
    if (P.dmg != null && P.dmg < 35) add(2, 'dmg', 'Dégâts par round', `Mieux que ${Math.round(P.dmg)} % de tes lobbys seulement.`, 'Utilise tes capacités offensives à chaque round et tire dès que tu vois quelqu\'un (spray contrôlé).');
    (s.b || []).forEach((x, i) => { if (x && x[0] >= 15 && trust(x[1], x[0]) === 'bad') add(2, 'b' + i, `Duels ${BAND_FR[i].toLowerCase()}`, `${x[1]}/${x[0]} gagnés.`, i === 0 ? 'Duels proches : mouvement + crosshair à hauteur de tête, essaie un peu plus de sensibilité.' : i === 2 ? 'Duels longs : arrête-toi avant de tirer, rafales courtes, essaie un peu moins de sensibilité.' : 'Duels moyens : tap / rafales de 2-3 balles, contre-strafe avant de tirer.'); });
    if (!out.length) add(1, 'ok', 'Rien de faible à coup sûr', 'Tes chiffres sont dans la moyenne ou au-dessus de tes lobbys.', 'Garde ta routine ; travaille ton meilleur point pour le rendre décisif.');
    return out.sort((a, b) => b.lvl - a.lvl).slice(0, 5);
  }

  /* ---------- Thème : couleurs lisibles, préférences sûres (code de thème partageable) ---------- */
  const hexRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '').trim()); if (!m) return null; const v = parseInt(m[1], 16); return [v >> 16 & 255, v >> 8 & 255, v & 255]; };
  const rgbHex = c => '#' + c.map(x => clampN(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('');
  const mixHex = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return A && B ? rgbHex(A.map((x, i) => x + (B[i] - x) * t)) : a; };
  const relLum = h => { const c = hexRgb(h); if (!c) return 0; const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  const contrast = (a, b) => { const x = relLum(a), y = relLum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  // éclaircit la couleur vers le blanc jusqu'à un contraste suffisant sur le fond (texte et liens lisibles)
  function readable(c, bg, min = 4.5) { if (!hexRgb(c)) return '#ffffff'; let x = c; for (let i = 1; i <= 20 && contrast(x, bg) < min; i++) x = mixHex(c, '#ffffff', i / 20); return x; }
  const THEME_DEF = {mode:'auto', agent:'', map:'', bg:'auto', blur:0, dark:70, fx:'auto', accent:'', fontT:'auto', fontB:'systeme', radius:14, density:'confort', cards:'verre', anim:true, streamer:false, blocks:[], hidden:[]};
  const THEME_ENUM = {mode:['auto', 'dernier', 'neutre', 'agent', 'rang', 'carte', 'cartejoueur', 'perso'], bg:['auto', 'art', 'portrait', 'splash', 'card', 'degrade', 'image'],
    fx:['auto', 'aucun', 'grain', 'scan', 'neon', 'particules'], fontT:['auto', 'systeme', 'marker', 'teko', 'bebas', 'rajdhani', 'orbitron', 'oxanium', 'russo', 'chakra', 'exo', 'anton'],
    fontB:['systeme', 'rajdhani', 'exo', 'chakra', 'oxanium'], density:['confort', 'compact'], cards:['verre', 'plein', 'neon']};
  const BLOCKS = ['kpis', 'rr', 'forme', 'dernier', 'agents', 'cartes', 'records']; // ordre par défaut de la vue d'ensemble
  const THEME_FREE = {mode:['auto', 'dernier', 'neutre'], keep:['blur', 'dark', 'density', 'anim', 'streamer']}; // le reste : Premium
  function themeClean(raw) {
    const r = obj(raw) ? raw : {}, o = JSON.parse(JSON.stringify(THEME_DEF));
    Object.entries(THEME_ENUM).forEach(([k, v]) => { if (v.includes(r[k])) o[k] = r[k]; });
    o.agent = typeof r.agent === 'string' && /^[A-Za-z/ ]{2,12}$/.test(r.agent) ? r.agent : '';
    o.map = typeof r.map === 'string' && /^[A-Za-z]{3,12}$/.test(r.map) ? r.map : '';
    o.accent = hexRgb(r.accent) ? '#' + String(r.accent).trim().replace('#', '').toLowerCase() : '';
    o.blur = intIn(r.blur, 0, 20, o.blur); o.dark = intIn(r.dark, 30, 95, o.dark); o.radius = intIn(r.radius, 0, 24, o.radius);
    o.anim = r.anim !== false; o.streamer = r.streamer === true;
    o.blocks = Array.isArray(r.blocks) ? [...new Set(r.blocks.filter(b => BLOCKS.includes(b)))] : [];
    o.hidden = Array.isArray(r.hidden) ? [...new Set(r.hidden.filter(b => BLOCKS.includes(b)))] : [];
    return o;
  }
  // sans Premium : le thème automatique (agent, rôle, rang) et les réglages de confort ; le reste revient au défaut
  function themeFree(t) {
    const o = JSON.parse(JSON.stringify(THEME_DEF)), c = themeClean(t);
    if (THEME_FREE.mode.includes(c.mode)) o.mode = c.mode; THEME_FREE.keep.forEach(k => { o[k] = c[k]; });
    return o;
  }
  const themeDiff = t => { const c = themeClean(t), f = themeFree(c); return Object.keys(c).filter(k => JSON.stringify(c[k]) !== JSON.stringify(f[k])); }; // réglages Premium utilisés
  const themeCode = t => { const c = themeClean(t); return 'PHT1.' + b64uEnc(utf8(JSON.stringify(c))); };
  function themeParse(code) {
    const m = /^PHT1\.([A-Za-z0-9_-]{4,3000})$/.exec(String(code || '').replace(/\s+/g, '')); if (!m) return null;
    const b = b64uDec(m[1]); if (!b) return null; try { return themeClean(JSON.parse(fromUtf8(b))); } catch (e) { return null; }
  }

  return {esc, toNum, shapeColl, INBOX_FORMAT, INBOX_VERSION, INBOX_COLLS, validateInbox, inboxPlan, SCHEMA_V, migrateRaw, rulesRows, reportStatus,
    wilson, trust, rateTip, nthStats, nightLimit, lobbyPlace, weaponStats,
    smooth, weekStart, pAgg, agentPick, stackStats, lobbyPct, wellImpact, habitDays, records, stepGoal, HOURS, hourBucket,
    divOf, pctRank, benchPct, pDetail, castRates, agentMeta, coverage, MOVERS, copyPhase, fromCv, nearestRegion,
    GUN, DBANDS, BAND_FR, duelStats, sensHint, psaStart, psaStep, sensHistPush, sensPeriods, meanCmp, trialVerdict, trainEffect,
    encKey, scoutAgg, fitScore, ROLE_ART, needFr, frList, JOURS, hourFr, dispoFr, whenFr, recruitMsg,
    ridNorm, b64uEnc, b64uDec, utf8, fromUtf8, LIC_PLANS, licBody, licHead, licParse, licCheck, LIC_WHY, LIC_DUR, licExp, jwkPub,
    FEATURES, PREM_DEF, featOn, PUB_DEF, httpsUrl, isGoogle, proxyUrl, pubCfg, smRow, rowsAgg, aggBy, mainAgent, sessionsOf, serieOf,
    v4Detail, plLines, BUYK, wpFit, wpProb, flowOf, matchSum, coachPub,
    hexRgb, rgbHex, mixHex, relLum, contrast, readable, THEME_DEF, THEME_ENUM, BLOCKS, themeClean, themeFree, themeDiff, themeCode, themeParse};
});
