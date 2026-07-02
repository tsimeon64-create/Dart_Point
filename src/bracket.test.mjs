// Test automatique du générateur de tableau à élimination directe (mode Tournoi).
// Lancer avec :  node src/bracket.test.mjs
//
// Il reproduit la MÊME logique que AppTournoiPotes.jsx (seedOrder, seedBracket, genBracketMatchs,
// avancerApresMatch, propagerByes) et vérifie, pour TOUS les nombres de qualifiés de 2 à 32, que :
//   1. exactement N joueurs sont placés dans le tableau ;
//   2. aucun match du 1er tour n'est totalement vide (deux "pas d'adversaire") ;
//   3. les exempts (byes) avancent bien : le tableau se joue jusqu'à un champion unique ;
//   4. aucun match ne reste bloqué avec un seul joueur (l'adversaire arrive toujours).
// Si un cas échoue, le script s'arrête avec un code d'erreur (utilisable en CI).

const log2 = (x) => Math.log(x) / Math.log(2);

// Ordre de placement standard : têtes de série réparties (1 et 2 dans des moitiés opposées).
const seedOrder = (size) => {
  let order = [1];
  while (order.length < size) { const n = order.length * 2; order = order.flatMap((s) => [s, n + 1 - s]); }
  return order;
};
const seedBracket = (ranked, size) => seedOrder(size).map((s) => ranked[s - 1] ?? null);

function genBracket(seeded) {
  const n = seeded.length, tr = Math.round(log2(n)), M = [];
  for (let pos = 0; pos < n / 2; pos++) {
    const j1 = seeded[pos * 2] ?? null, j2 = seeded[pos * 2 + 1] ?? null;
    const st = j1 && j2 ? 'en_attente' : j1 ? 'bye_j2' : j2 ? 'bye_j1' : 'vide';
    const g = j1 && !j2 ? j1 : j2 && !j1 ? j2 : null;
    M.push({ id: `r1p${pos}`, r: 1, pos, j1, j2, g, st });
  }
  for (let r = 2; r <= tr; r++) for (let pos = 0; pos < n / 2 ** r; pos++)
    M.push({ id: `r${r}p${pos}`, r, pos, j1: null, j2: null, g: null, st: 'attente_avancement' });
  return { M, tr };
}
const find = (M, r, pos) => M.find((m) => m.r === r && m.pos === pos);
function placer(t, asJ1, pid) {
  if (!t || !pid) return;
  if (asJ1) t.j1 = pid; else t.j2 = pid;
  const other = asJ1 ? t.j2 : t.j1;
  t.st = other ? 'en_attente' : 'attente_avancement';
}
function avancer(m, g, M, tr) {
  const r = m.r, nextPos = Math.floor(m.pos / 2), slotIsJ1 = m.pos % 2 === 0;
  if (r === tr) return;
  placer(find(M, r + 1, nextPos), slotIsJ1, g);
}
function propagerByes(M, tr) {
  let secu = 0;
  while (secu++ < 64) {
    const bye = M.find((m) => typeof m.st === 'string' && m.st.startsWith('bye') && m.g);
    if (!bye) break;
    avancer(bye, bye.g, M, tr); bye.st = 'termine';
  }
}

function simulate(nq) {
  let size = 1; while (size < nq) size *= 2; size = Math.max(2, size);
  const ranked = Array.from({ length: nq }, (_, i) => i + 1); // seed 1 = meilleur
  const seeded = seedBracket(ranked, size);
  const placed = seeded.filter(Boolean).sort((a, b) => a - b);
  if (placed.length !== nq) throw new Error(`nq=${nq}: ${placed.length} joueurs placés au lieu de ${nq}`);
  const { M, tr } = genBracket(seeded);
  const vides = M.filter((m) => m.r === 1 && m.st === 'vide').length;
  if (vides > 0) throw new Error(`nq=${nq}: ${vides} match(s) 1er tour totalement vide(s)`);
  propagerByes(M, tr);
  // On joue tout : le meilleur seed (plus petit numéro) gagne, jusqu'à ce qu'il n'y ait plus de match jouable.
  let secu = 0;
  while (secu++ < 1000) {
    const playable = M.filter((m) => m.st !== 'termine' && !String(m.st).startsWith('bye') && m.j1 && m.j2);
    if (!playable.length) break;
    for (const m of playable) { const w = Math.min(m.j1, m.j2); m.g = w; m.st = 'termine'; avancer(m, w, M, tr); }
  }
  const champ = find(M, tr, 0).g;
  const stuck = M.filter((m) => m.r <= tr && m.st !== 'termine' && !String(m.st).startsWith('bye') && (m.j1 || m.j2) && !(m.j1 && m.j2)).length;
  if (champ !== 1) throw new Error(`nq=${nq}: pas de champion (ou pas le meilleur seed) → ${champ}`);
  if (stuck > 0) throw new Error(`nq=${nq}: ${stuck} match(s) bloqué(s) avec un seul joueur`);
  return { nq, size };
}

let ok = 0;
for (let nq = 2; nq <= 32; nq++) { simulate(nq); ok++; }
console.log(`✅ Générateur de tableau OK pour les ${ok} cas testés (2 à 32 qualifiés) : champion unique, aucun blocage, aucune case vide.`);
