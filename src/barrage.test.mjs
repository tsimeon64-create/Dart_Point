// Test automatique du départage des égalités de poule (barrages 701) + barrage DÉCISIF.
// Lancer avec :  node src/barrage.test.mjs
//
// Reproduit la logique de AppTournoiPotes.jsx (rankGroup + egalitesADepartager) et vérifie que :
//   1. une égalité parfaite à 3 se départage par un mini round-robin de barrages (round 0) ;
//   2. si ce round-robin finit en CYCLE PARFAIT (chacun 1 victoire, tout égal), un TOUR DÉCISIF
//      (round ≥ 1, rejoué en 1 manche 701) est proposé et départage ;
//   3. même un double cycle finit par se résoudre (tour décisif 2) ;
//   4. un cas non cyclique se résout dès le round-robin, sans tour décisif.

const statBarrageTour = (id, r, bg) => {
  let vic = 0, diff = 0;
  bg.forEach((m) => {
    if ((m.round_bracket || 0) !== r) return;
    if (m.joueur1_id !== id && m.joueur2_id !== id) return;
    const s1 = m.score1 || 0, s2 = m.score2 || 0;
    if (m.gagnant_id === id) vic++;
    diff += (m.joueur1_id === id) ? (s1 - s2) : (s2 - s1);
  });
  return vic * 10000 + diff;
};
const rankGroup = (joueurs, barrages = []) => {
  const ids = new Set(joueurs.map((j) => j.id));
  const bg = barrages.filter((m) => m.statut === 'termine' && m.gagnant_id && ids.has(m.joueur1_id) && ids.has(m.joueur2_id));
  const maxRound = bg.reduce((mx, m) => Math.max(mx, m.round_bracket || 0), 0);
  return [...joueurs].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.victoires !== a.victoires) return b.victoires - a.victoires;
    const da = a.manches_pour - a.manches_contre, db = b.manches_pour - b.manches_contre;
    if (db !== da) return db - da;
    for (let r = maxRound; r >= 0; r--) { const ka = statBarrageTour(a.id, r, bg), kb = statBarrageTour(b.id, r, bg); if (kb !== ka) return kb - ka; }
    return 0;
  });
};
const memeNiveau = (a, b) => a.points === b.points && a.victoires === b.victoires && (a.manches_pour - a.manches_contre) === (b.manches_pour - b.manches_contre);
const egalitesADepartager = (grp, barrages = [], nbQual = 2) => {
  const specs = []; const idsAll = new Set(grp.map((j) => j.id));
  const bgAll = barrages.filter((m) => idsAll.has(m.joueur1_id) && idsAll.has(m.joueur2_id));
  const ranked = rankGroup(grp, barrages); const vu = new Set();
  for (let i = 0; i < Math.min(nbQual, ranked.length); i++) {
    if (vu.has(ranked[i].id)) continue;
    const g = [ranked[i]];
    for (let k = i + 1; k < ranked.length; k++) { if (memeNiveau(ranked[i], ranked[k])) g.push(ranked[k]); else break; }
    if (g.length < 2) continue;
    g.forEach((j) => vu.add(j.id));
    const gids = new Set(g.map((j) => j.id));
    const bgg = bgAll.filter((m) => gids.has(m.joueur1_id) && gids.has(m.joueur2_id));
    const maxR = bgg.reduce((mx, m) => Math.max(mx, m.round_bracket || 0), -1);
    const curR = Math.max(0, maxR);
    const toutes = []; for (let x = 0; x < g.length; x++) for (let y = x + 1; y < g.length; y++) toutes.push([g[x], g[y]]);
    const jouee = (a, b, r) => bgg.some((m) => (m.round_bracket || 0) === r && m.statut === 'termine' && ((m.joueur1_id === a && m.joueur2_id === b) || (m.joueur1_id === b && m.joueur2_id === a)));
    if (maxR < 0) { toutes.forEach(([a, b]) => specs.push({ a, b, round: 0 })); }
    else {
      const manq = toutes.filter(([a, b]) => !jouee(a.id, b.id, curR));
      if (manq.length) manq.forEach(([a, b]) => specs.push({ a, b, round: curR }));
      else { const vals = g.map((j) => statBarrageTour(j.id, curR, bgg)); if (vals.every((v) => v === vals[0])) toutes.forEach(([a, b]) => specs.push({ a, b, round: curR + 1 })); }
    }
  }
  return specs;
};

function run(name, decide) {
  const P = ['A', 'B', 'C'].map((id) => ({ id, points: 5, victoires: 2, defaites: 1, manches_pour: 5, manches_contre: 3 }));
  let barr = [], tours = 0, secu = 0;
  while (secu++ < 20) {
    const specs = egalitesADepartager(P, barr, 2);
    if (!specs.length) break;
    if (specs[0].round >= 1) tours = Math.max(tours, specs[0].round);
    specs.forEach((s) => { const w = decide(s.round, s.a.id, s.b.id); barr.push({ joueur1_id: s.a.id, joueur2_id: s.b.id, gagnant_id: w, score1: w === s.a.id ? 1 : 0, score2: w === s.b.id ? 1 : 0, statut: 'termine', round_bracket: s.round }); });
  }
  if (egalitesADepartager(P, barr, 2).length !== 0) throw new Error(name + ' : égalité NON résolue');
  return { ordre: rankGroup(P, barr).map((p) => p.id).join('>'), tours };
}
const cycle = (round, a, b) => {
  if (round === 0) { if ('AB'.includes(a) && 'AB'.includes(b)) return 'A'; if ('BC'.includes(a) && 'BC'.includes(b)) return 'B'; return 'C'; }
  const o = { A: 0, B: 1, C: 2 }; return o[a] < o[b] ? a : b;
};
const net = (round, a, b) => { const o = { A: 0, B: 1, C: 2 }; return o[a] < o[b] ? a : b; };
const doubleCycle = (round, a, b) => {
  if (round < 2) { if ('AB'.includes(a) && 'AB'.includes(b)) return 'A'; if ('BC'.includes(a) && 'BC'.includes(b)) return 'B'; return 'C'; }
  const o = { A: 0, B: 1, C: 2 }; return o[a] < o[b] ? a : b;
};
const r1 = run('cycle parfait', cycle);
const r2 = run('non cyclique', net);
const r3 = run('double cycle', doubleCycle);
if (r1.ordre !== 'A>B>C' || r1.tours !== 1) throw new Error('cycle parfait : ' + JSON.stringify(r1));
if (r2.ordre !== 'A>B>C' || r2.tours !== 0) throw new Error('non cyclique : ' + JSON.stringify(r2));
if (r3.ordre !== 'A>B>C' || r3.tours !== 2) throw new Error('double cycle : ' + JSON.stringify(r3));
console.log('✅ Barrages OK : cycle parfait → 1 tour décisif ; non cyclique → 0 ; double cycle → 2. Toujours résolu.');
