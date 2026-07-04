// Tests des barrages 701 et du classement de poule (importe le VRAI code : barrage.js).
// Lancer : node src/barrage.test.mjs
import { rankGroup, egalitesADepartager } from "./barrage.js";

let ko = 0;
const check = (label, cond) => { console.log(`${cond ? "OK  " : "ÉCHEC"} — ${label}`); if (!cond) ko++; };

// équipe de poule
const T = (nom, v, d, mp, mc) => ({ id: nom, nom, victoires: v, defaites: d, manches_pour: mp, manches_contre: mc });
// match de barrage terminé (tour r ; winner bat loser 701-400)
let mid = 0;
const BM = (r, winner, loser, ws = 701, ls = 400) => ({ id: "b" + (mid++), round_bracket: r, statut: "termine", gagnant_id: winner, joueur1_id: winner, joueur2_id: loser, score1: ws, score2: ls });
// ensemble {a-b@round} pour comparer des specs sans se soucier de l'ordre a/b
const specSet = specs => new Set(specs.map(s => [s.a.id, s.b.id].sort().join("-") + "@" + s.round));

// ── Cas 1 : 2 équipes à égalité pour la 2e place (nbQual=2) ──────────────────
{
  const W = T("W", 3, 0, 9, 2);                          // 1er, qualifié d'office
  const A = T("A", 1, 2, 5, 5), B = T("B", 1, 2, 5, 5);  // ex æquo pour la 2e place
  const C = T("C", 1, 2, 3, 8);                          // même victoires mais moins bon GA → hors égalité
  const pool = [W, A, B, C];
  let s = egalitesADepartager(pool, [], 2);
  check("2-pour-1 : 1 barrage à créer (A vs B, tour 0)", specSet(s).has("A-B@0") && s.length === 1);
  const bg = [BM(0, "A", "B")]; // A gagne le barrage
  s = egalitesADepartager(pool, bg, 2);
  check("2-pour-1 : plus de barrage après le match", s.length === 0);
  const top2 = rankGroup(pool, bg).slice(0, 2).map(x => x.id);
  check("2-pour-1 : W et A qualifiés (pas B)", top2.includes("W") && top2.includes("A") && !top2.includes("B"));
}

// ── Cas 2 : 3 équipes pour 2 places, départage NET (2/1/0) ───────────────────
{
  const A = T("A", 2, 1, 7, 5), B = T("B", 2, 1, 7, 5), C = T("C", 2, 1, 7, 5); // ex æquo parfaits
  const D = T("D", 0, 3, 2, 9);
  const pool = [A, B, C, D];
  let s = egalitesADepartager(pool, [], 2);
  check("3-pour-2 : round-robin de 3 matchs à créer (tour 0)", s.length === 3 && s.every(x => x.round === 0));
  const bg = [BM(0, "A", "B"), BM(0, "A", "C"), BM(0, "B", "C")]; // A=2, B=1, C=0
  s = egalitesADepartager(pool, bg, 2);
  check("3-pour-2 (2/1/0) : départagé, plus de barrage", s.length === 0);
  const top2 = rankGroup(pool, bg).slice(0, 2).map(x => x.id);
  check("3-pour-2 (2/1/0) : A et B qualifiés", top2.join(",") === "A,B");
}

// ── Cas 3 : 3 équipes pour 2 places, CYCLE parfait (1/1/1) → rejouer un tour ──
{
  const A = T("A", 2, 1, 7, 5), B = T("B", 2, 1, 7, 5), C = T("C", 2, 1, 7, 5);
  const D = T("D", 0, 3, 2, 9);
  const pool = [A, B, C, D];
  const cycle = [BM(0, "A", "B"), BM(0, "B", "C"), BM(0, "C", "A")]; // chacun 1 victoire
  let s = egalitesADepartager(pool, cycle, 2);
  check("3-pour-2 (cycle) : on rejoue un round-robin au tour 1", s.length === 3 && s.every(x => x.round === 1));
  const bg = [...cycle, BM(1, "A", "B"), BM(1, "A", "C"), BM(1, "B", "C")]; // tour 1 : A=2,B=1,C=0
  s = egalitesADepartager(pool, bg, 2);
  check("3-pour-2 (cycle→2/1/0) : départagé", s.length === 0);
  const top2 = rankGroup(pool, bg).slice(0, 2).map(x => x.id);
  check("3-pour-2 (cycle→2/1/0) : A et B qualifiés", top2.join(",") === "A,B");
}

// ── Cas 4 : 4 équipes pour 2 places, 3/1/1/1 → LE BUG (sous-égalité au tour 1) ─
{
  const A = T("A", 2, 1, 7, 5), B = T("B", 2, 1, 7, 5), C = T("C", 2, 1, 7, 5), D = T("D", 2, 1, 7, 5);
  const pool = [A, B, C, D];
  // tour 0 : A bat tout le monde (3) ; B,C,D en cycle (1 chacun)
  const r0 = [BM(0, "A", "B"), BM(0, "A", "C"), BM(0, "A", "D"), BM(0, "B", "C"), BM(0, "C", "D"), BM(0, "D", "B")];
  let s = egalitesADepartager(pool, r0, 2);
  check("4-pour-2 (3/1/1/1) : sous-barrage B/C/D au tour 1 (AVANT : rien → bug)",
    s.length === 3 && s.every(x => x.round === 1) && specSet(s).has("B-C@1") && specSet(s).has("B-D@1") && specSet(s).has("C-D@1"));
  // on joue le tour 1 : B=2, C=1, D=0
  const r1 = [BM(1, "B", "C"), BM(1, "B", "D"), BM(1, "C", "D")];
  s = egalitesADepartager(pool, [...r0, ...r1], 2);
  check("4-pour-2 (3/1/1/1→) : départagé après le tour 1", s.length === 0);
  const top2 = rankGroup(pool, [...r0, ...r1]).slice(0, 2).map(x => x.id);
  check("4-pour-2 (3/1/1/1→) : A et B qualifiés (pas C) — le vainqueur du tour 0 n'est PAS pénalisé", top2.includes("A") && top2.includes("B") && !top2.includes("C"));
}

// ── Cas 5 : 4 équipes pour 2 places, 2/2/2/0 → les 3 à 2V rejouent pour 2 places ─
{
  const A = T("A", 2, 1, 7, 5), B = T("B", 2, 1, 7, 5), C = T("C", 2, 1, 7, 5), D = T("D", 2, 1, 7, 5);
  const pool = [A, B, C, D];
  // A,B,C battent D et cyclent entre eux (2 chacun) ; D=0
  const r0 = [BM(0, "A", "D"), BM(0, "B", "D"), BM(0, "C", "D"), BM(0, "A", "B"), BM(0, "B", "C"), BM(0, "C", "A")];
  let s = egalitesADepartager(pool, r0, 2);
  check("4-pour-2 (2/2/2/0) : A/B/C rejouent au tour 1 (D éliminé)",
    s.length === 3 && s.every(x => x.round === 1) && !specSet(s).has("A-D@1") && specSet(s).has("A-B@1"));
  const r1 = [BM(1, "A", "B"), BM(1, "A", "C"), BM(1, "B", "C")]; // A=2,B=1,C=0
  s = egalitesADepartager(pool, [...r0, ...r1], 2);
  check("4-pour-2 (2/2/2/0→) : départagé", s.length === 0);
  const top2 = rankGroup(pool, [...r0, ...r1]).slice(0, 2).map(x => x.id);
  check("4-pour-2 (2/2/2/0→) : A et B qualifiés (pas D)", top2.includes("A") && top2.includes("B") && !top2.includes("D"));
}

// ── Cas 6 : 4 équipes pour 2 places, 2/2/1/1 → tranché sans rejouer ───────────
{
  const A = T("A", 2, 1, 7, 5), B = T("B", 2, 1, 7, 5), C = T("C", 2, 1, 7, 5), D = T("D", 2, 1, 7, 5);
  const pool = [A, B, C, D];
  // A=2 (bat C,D), B=2 (bat A,D), C=1 (bat B), D=1 (bat C)
  const r0 = [BM(0, "A", "C"), BM(0, "A", "D"), BM(0, "B", "A"), BM(0, "B", "D"), BM(0, "C", "B"), BM(0, "D", "C")];
  const s = egalitesADepartager(pool, r0, 2);
  check("4-pour-2 (2/2/1/1) : aucun barrage supplémentaire", s.length === 0);
  const top2 = rankGroup(pool, r0).slice(0, 2).map(x => x.id);
  check("4-pour-2 (2/2/1/1) : les deux à 2V (A,B) qualifiés", top2.includes("A") && top2.includes("B"));
}

console.log(ko === 0 ? "\n✅ Tous les tests de barrage passent." : `\n❌ ${ko} test(s) en échec.`);
process.exit(ko === 0 ? 0 : 1);
