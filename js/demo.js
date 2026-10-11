"use strict";
/* ================= DÉMO (données inventées, toujours les mêmes) =================
   Montre tout le site (Premium compris) sans compte ni API. Rien n'est envoyé nulle part. */
function demoProfile() {
  let seed = 20261011; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648, ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pickW = list => { const t = list.reduce((s, x) => s + x[1], 0); let r = rnd() * t; for (const [v, w] of list) { if ((r -= w) < 0) return v; } return list[0][0]; };
  const AG = [['Jett', 24], ['Reyna', 12], ['Raze', 8], ['Omen', 6], ['Sova', 5], ['Killjoy', 5]], MAPS = ['Ascent', 'Bind', 'Haven', 'Lotus', 'Sunset', 'Abyss', 'Corrode'];
  const now = Date.now(), rows = [], hist = []; let elo = 1150, peak = 0, t = now - 34 * 864e5;
  for (let i = 0; i < 60; i++) {
    t += ri(2, 14) * 36e5; if (new Date(t).getHours() < 17) t += 5 * 36e5; if (t > now - 36e5) t = now - (60 - i) * 18e5;
    const agent = pickW(AG), map = MAPS[ri(0, MAPS.length - 1)], skill = agent === 'Jett' ? .58 : agent === 'Reyna' ? .55 : .47, win = rnd() < skill;
    const lose = ri(3, 11), us = win ? 13 : lose, them = win ? lose : 13, r = us + them, k = Math.max(4, Math.round(r * (win ? .92 : .72) + ri(-4, 5))), d = Math.max(5, Math.round(r * (win ? .62 : .8) + ri(-3, 3)));
    const sh = k * ri(9, 13), hs = Math.round(sh * (agent === 'Jett' ? .24 : .19) + ri(-3, 3)), ls = Math.round(sh * .08);
    const ch = win ? ri(12, 22) : -ri(14, 24); elo = clamp(elo + ch, 1000, 1390); peak = Math.max(peak, elo);
    const id = `de${String(i).padStart(6, '0')}-0000-4000-8000-${String(1e11 + i * 7919).slice(-12)}`;
    rows.push({id, ts:t, date:new Date(t - new Date(t).getTimezoneOffset() * 6e4).toISOString().slice(0, 10), map, season:'e11a2', agent, tier:Math.floor(elo / 100) + 3, team:'red', us, them, res:win ? 'W' : 'L', r,
      k, d, a:ri(2, 9), sc:Math.round(r * (k / r * 175 + 70 + ri(-15, 25))), hs:Math.max(0, hs), bs:Math.max(0, sh - hs - ls), ls, dmg:Math.round(r * (k / r * 128 + 22 + ri(-10, 18))), rec:Math.round(r * (d / r * 125 + 20 + ri(-10, 10)))});
    hist.push({d:new Date(t).toISOString(), ts:t, ch, elo, t:Math.floor(elo / 100) + 3, mid:id, map});
  }
  rows.sort((a, b) => b.ts - a.ts);
  const prof = {v:2, demo:true, at:now, rid:'démo#fr1', name:'Démo', tag:'FR1', riot:'Démo#FR1', region:'eu', puuid:'', level:142, card:'e9c8d760-4d06-4037-4882-6bab3610d9ea', pages:5,
    mmr:{tier:Math.floor(elo / 100) + 3, rr:elo % 100, last:hist[hist.length - 1].ch, elo, need:0, peak:{tier:Math.floor(peak / 100) + 3, season:'e11a2'}}, rows, hist};
  // détails inventés des 25 parties les plus récentes (rounds, duels, positions relatives, armes)
  rows.slice(0, 25).forEach(r => { const d = demoDetail(r, rnd, ri, pickW); DET.mem[mdKey(prof, r.id)] = d; });
  return prof;
}
function demoDetail(row, rnd, ri, pickW) {
  const AGS = ['Omen', 'Sova', 'Killjoy', 'Sage', 'Fade', 'Raze', 'Brimstone', 'Cypher', 'Skye', 'Viper', 'Jett', 'Reyna', 'Breach', 'Clove'];
  const W = [['Vandal', 30], ['Phantom', 26], ['Operator', 5], ['Sheriff', 6], ['Spectre', 8], ['Ghost', 6], ['Classic', 5], ['Judge', 3], ['Marshal', 2], ['Outlaw', 2]];
  const pl = []; for (let i = 0; i < 10; i++) pl.push({n:i ? '' : 'moi', a:i ? AGS[ri(0, AGS.length - 1)] : row.agent, t:i < 5 ? 1 : 0, sc:0, k:0, d:0, as:0, hs:0, sh:0, lg:0, dmg:0, rec:0, c:[ri(4, 16), ri(6, 22), ri(5, 18), ri(0, 3)], tr:row.tier + ri(-2, 2), lv:ri(40, 400)});
  const nR = row.us + row.them, wins = Array.from({length:nR}, (_, i) => i < row.us ? 1 : 0); for (let i = nR - 1; i > 0; i--) { const j = ri(0, i); [wins[i], wins[j]] = [wins[j], wins[i]]; }
  const rounds = [], kills = [], first = rnd() < .5 ? 'A' : 'D', meSkill = row.res === 'W' ? 1.2 : .95;
  for (let r = 0; r < nR; r++) {
    const s = r < 12 ? first : r < 24 ? (first === 'A' ? 'D' : 'A') : first, w = wins[r], atkT = s === 'A' ? 1 : 0, winT = w ? 1 : 0, loseT = 1 - winT;
    const pis = r === 0 || r === 12, buy = () => pis ? 800 * 5 : pickW([[3000, 2], [9000, 2], [21000, 6]]) + ri(0, 3000);
    const alive = {1:[0, 1, 2, 3, 4], 0:[5, 6, 7, 8, 9]}, seq = []; for (let k = 0; k < 5; k++) seq.push(loseT); const extra = ri(0, 3); for (let k = 0; k < extra; k++) seq.splice(ri(0, seq.length - 1), 0, winT);
    const plant = atkT === winT ? rnd() < .7 : rnd() < .45, pt = plant ? ri(35, 70) * 1000 : 0; let tm = ri(6, 22) * 1000, cut = plant && atkT === winT ? ri(3, 5) : 5;
    let dead = 0;
    for (const vt of seq) {
      if (!alive[vt].length || !alive[1 - vt].length || (vt === loseT && dead >= cut)) break;
      const killers = alive[1 - vt], kk = killers.includes(0) && rnd() < .2 * meSkill ? 0 : killers[ri(0, killers.length - 1)];
      const vic = alive[vt].includes(0) && rnd() < .17 ? 0 : alive[vt][ri(0, alive[vt].length - 1)]; if (vic === kk) continue;
      alive[vt] = alive[vt].filter(x => x !== vic); if (vt === loseT) dead++;
      const vx = ri(-4000, 4000), vy = ri(-4000, 4000), dist = pickW([[500, 3], [1500, 4], [3000, 2]]) + ri(-300, 400), ang = rnd() * 6.283;
      const wpn = pickW(W), ast = rnd() < .45 ? alive[1 - vt].filter(x => x !== kk).slice(0, 1) : [];
      kills.push([r, tm, kk, vic, vx, vy, Math.round(vx + Math.cos(ang) * dist), Math.round(vy + Math.sin(ang) * dist), wpn, ast]);
      pl[kk].k++; pl[vic].d++; ast.forEach(a => pl[a].as++); pl[kk].dmg += ri(140, 190); pl[vic].rec += ri(140, 190);
      const shots = ri(3, 6), hs = rnd() < (kk === 0 ? .55 : .45) ? ri(1, 2) : 0; pl[kk].sh += shots; pl[kk].hs += hs; pl[kk].lg += rnd() < .3 ? 1 : 0;
      tm += ri(1, 9) * 1000;
    }
    const e = !alive[loseT].length ? 'elim' : plant && atkT === winT ? 'spike' : plant ? 'defuse' : 'time';
    rounds.push({w, s, ol:buy(), tl:buy(), p:plant ? pickW([['A', 1], ['B', 1]]) : '', pu:plant ? atkT : -1, pt, df:e === 'defuse' ? 1 : 0, e});
  }
  pl.forEach(p => { p.sc = Math.round(p.k * 160 + p.as * 30 + p.dmg / 4 + ri(400, 1200)); });
  return {id:row.id, v:5, map:row.map, date:row.date, ts:row.ts, rounds, kills, pl, demo:true};
}
