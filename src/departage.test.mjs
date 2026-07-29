// Tests du DÉPARTAGE de poule : confrontation directe → différence de manches → barrage.
// Lancer : node src/departage.test.mjs
import { rankGroup, rankGroupDetaille, egalitesADepartager, phraseDepartage } from "./barrage.js";

let ok = 0, ko = 0;
const check = (label, cond) => { if (cond) { ok++; console.log("  OK    " + label); } else { ko++; console.log("  ÉCHEC " + label); } };
const eq = (label, obtenu, attendu) => check(label + "  [obtenu: " + JSON.stringify(obtenu) + "]", JSON.stringify(obtenu) === JSON.stringify(attendu));

// équipe de poule
const T = (nom, v, d, mp, mc) => ({ id: nom, nom, victoires: v, defaites: d, manches_pour: mp, manches_contre: mc });
// match de POULE terminé : winner bat loser (score vu par winner)
let mid = 0;
const M = (winner, loser, ws = 2, ls = 1) => ({
  id: "m" + (mid++), phase: "poules", statut: "termine", gagnant_id: winner,
  joueur1_id: winner, joueur2_id: loser, score1: ws, score2: ls,
});
const ordre = (pool, matchs, barrages = []) => rankGroup(pool, barrages, matchs).map(j => j.id).join(",");
const raisonDe = (pool, matchs, id, barrages = []) =>
  (rankGroupDetaille(pool, barrages, matchs).find(e => e.joueur.id === id) || {}).raison || null;

console.log("\n1) CONFRONTATION DIRECTE — 2 ex æquo");
{
  // A et B : 2 victoires chacun, MÊME différence de manches. B a battu A en poule.
  const A = T("A", 2, 1, 6, 4), B = T("B", 2, 1, 6, 4), C = T("C", 0, 3, 1, 6);
  const pool = [A, B, C];
  const matchs = [M("B", "A", 2, 1), M("A", "C"), M("B", "C")];
  eq("B passe devant A (il l'a battu)", ordre(pool, matchs), "B,A,C");
  eq("la raison est la confrontation directe", raisonDe(pool, matchs, "B"), { type: "h2h", contre: "A", score: "2-1" });
  check("aucun barrage n'est proposé", egalitesADepartager(pool, [], 2, matchs).length === 0);
  eq("phrase affichée",
    phraseDepartage(raisonDe(pool, matchs, "B"), "B", true),
    "B est qualifié : il a battu A en confrontation directe (2-1).");
}

console.log("\n2) LA CONFRONTATION DIRECTE PASSE AVANT LA DIFFÉRENCE DE MANCHES");
{
  // A a une BIEN meilleure différence de manches (+4 contre 0) mais B l'a battu en direct.
  const A = T("A", 2, 1, 8, 4), B = T("B", 2, 1, 5, 5), C = T("C", 0, 3, 1, 5);
  const pool = [A, B, C];
  const matchs = [M("B", "A", 2, 0), M("A", "C"), M("B", "C")];
  eq("B devant A malgré une moins bonne différence de manches", ordre(pool, matchs), "B,A,C");
  eq("raison = match direct", raisonDe(pool, matchs, "B"), { type: "h2h", contre: "A", score: "2-0" });
}

console.log("\n3) TRIANGLE (A bat B, B bat C, C bat A) → différence de manches");
{
  // Chacun 1 victoire directe : la confrontation directe ne tranche RIEN.
  const A = T("A", 2, 2, 9, 5), B = T("B", 2, 2, 7, 6), C = T("C", 2, 2, 6, 8), D = T("D", 0, 4, 2, 9);
  const pool = [A, B, C, D];
  const matchs = [M("A", "B"), M("B", "C"), M("C", "A"), M("A", "D"), M("B", "D"), M("C", "D")];
  eq("classement par différence de manches (+4 / +1 / −2)", ordre(pool, matchs), "A,B,C,D");
  eq("raison de A = différence de manches", raisonDe(pool, matchs, "A"), { type: "manches", moi: 4, autre: 1 });
  eq("phrase affichée",
    phraseDepartage(raisonDe(pool, matchs, "A"), "A", true),
    "Départage à la différence de manches : +4 contre +1.");
  check("le triangle ne déclenche PAS de barrage (les manches ont tranché)",
    egalitesADepartager(pool, [], 2, matchs).length === 0);
}

console.log("\n4) TRIANGLE + MÊME DIFFÉRENCE DE MANCHES → barrage");
{
  const A = T("A", 2, 2, 7, 6), B = T("B", 2, 2, 7, 6), C = T("C", 2, 2, 7, 6), D = T("D", 0, 4, 2, 9);
  const pool = [A, B, C, D];
  const matchs = [M("A", "B"), M("B", "C"), M("C", "A"), M("A", "D"), M("B", "D"), M("C", "D")];
  const specs = egalitesADepartager(pool, [], 2, matchs);
  check("3 matchs de barrage créés au tour 0 (round-robin)", specs.length === 3 && specs.every(s => s.round === 0));
  const paires = new Set(specs.map(s => [s.a.id, s.b.id].sort().join("-")));
  check("les 3 paires concernées sont A-B, A-C, B-C",
    paires.has("A-B") && paires.has("A-C") && paires.has("B-C") && paires.size === 3);
  check("D n'est PAS embarqué dans le barrage", !specs.some(s => s.a.id === "D" || s.b.id === "D"));
}

console.log("\n5) 3 EX ÆQUO SANS CYCLE → la confrontation directe suffit");
{
  // A bat B et C ; B bat C. Mini-championnat : A=2, B=1, C=0.
  const A = T("A", 2, 1, 6, 5), B = T("B", 2, 1, 6, 5), C = T("C", 2, 1, 6, 5), D = T("D", 0, 3, 2, 8);
  const pool = [A, B, C, D];
  const matchs = [M("A", "B"), M("A", "C"), M("B", "C"), M("A", "D"), M("B", "D"), M("C", "D")];
  eq("A, B, C départagés par le mini-championnat", ordre(pool, matchs), "A,B,C,D");
  eq("raison de A = confrontation directe (2 victoires sur 2)", raisonDe(pool, matchs, "A"), { type: "h2h-mini", vic: 2, sur: 2 });
  check("aucun barrage", egalitesADepartager(pool, [], 2, matchs).length === 0);
}

console.log("\n6) SÉPARATION PARTIELLE : A détaché, B et C à départager aux manches");
{
  // A bat B et C ; B et C se sont battus… mais on met un cycle impossible à 3 → ici B bat C.
  // On teste plutôt : A=2 en direct, puis B et C à 1 chacun ? impossible à 3. On prend 4 ex æquo.
  const A = T("A", 3, 1, 9, 6), B = T("B", 3, 1, 8, 6), C = T("C", 3, 1, 6, 8), D = T("D", 3, 1, 7, 7);
  const pool = [A, B, C, D];
  // A bat B, C, D (3 victoires directes) ; B, C, D en cycle (1 chacun)
  const matchs = [M("A", "B"), M("A", "C"), M("A", "D"), M("B", "C"), M("C", "D"), M("D", "B")];
  eq("A premier (3 victoires directes), puis B/D/C à la différence de manches", ordre(pool, matchs), "A,B,D,C");
  eq("raison de A = confrontation directe", raisonDe(pool, matchs, "A"), { type: "h2h-mini", vic: 3, sur: 3 });
  eq("raison de B = différence de manches (+2 contre 0)", raisonDe(pool, matchs, "B"), { type: "manches", moi: 2, autre: 0 });
}

console.log("\n7) AUCUNE ÉGALITÉ → rien ne change, aucune raison affichée");
{
  const A = T("A", 3, 0, 9, 2), B = T("B", 2, 1, 7, 5), C = T("C", 1, 2, 4, 7), D = T("D", 0, 3, 2, 8);
  const pool = [A, B, C, D];
  const matchs = [M("A", "B"), M("A", "C"), M("A", "D"), M("B", "C"), M("B", "D"), M("C", "D")];
  eq("classement par victoires uniquement", ordre(pool, matchs), "A,B,C,D");
  check("aucune raison de départage sur aucun joueur",
    rankGroupDetaille(pool, [], matchs).every(e => e.raison === null));
  check("aucun barrage", egalitesADepartager(pool, [], 2, matchs).length === 0);
}

console.log("\n8) SANS LES MATCHS DE POULE → ancien comportement (différence de manches)");
{
  const A = T("A", 2, 1, 8, 4), B = T("B", 2, 1, 5, 5), C = T("C", 0, 3, 1, 5);
  const pool = [A, B, C];
  eq("A devant B sur la différence de manches", ordre(pool, []), "A,B,C");
  check("aucun barrage (les manches tranchent)", egalitesADepartager(pool, [], 2, []).length === 0);
}

console.log("\n9) UN BARRAGE DÉJÀ JOUÉ RESTE PRIORITAIRE (tournois en cours)");
{
  // A et B parfaitement à égalité, un barrage a été joué : B l'a gagné.
  // Même si A avait battu B en poule, c'est le barrage qui fait foi.
  const A = T("A", 2, 1, 6, 4), B = T("B", 2, 1, 6, 4), C = T("C", 0, 3, 1, 6);
  const pool = [A, B, C];
  const matchs = [M("A", "B", 2, 1), M("A", "C"), M("B", "C")];
  const barrages = [{ id: "b1", round_bracket: 0, statut: "termine", gagnant_id: "B", joueur1_id: "B", joueur2_id: "A", score1: 701, score2: 400 }];
  eq("B devant A grâce au barrage", ordre(pool, matchs, barrages), "B,A,C");
  eq("raison = barrage", raisonDe(pool, matchs, "B", barrages), { type: "barrage" });
}

console.log("\n10) COHÉRENCE : le classement contient toujours TOUT le monde, une seule fois");
{
  const pools = [
    [T("A", 2, 1, 6, 4), T("B", 2, 1, 6, 4), T("C", 2, 1, 6, 4), T("D", 2, 1, 6, 4)],
    [T("A", 1, 1, 3, 3), T("B", 1, 1, 3, 3)],
    [T("A", 0, 0, 0, 0)],
    [],
  ];
  let souci = 0;
  pools.forEach(p => {
    const r = rankGroup(p, [], []);
    if (r.length !== p.length) souci++;
    if (new Set(r.map(x => x.id)).size !== p.length) souci++;
  });
  check("aucun joueur perdu ni dupliqué (4 poules testées)", souci === 0);
}

console.log("\n" + (ko === 0 ? "✅ TOUT PASSE (" + ok + " vérifications)" : "❌ " + ko + " ÉCHEC(S) sur " + (ok + ko)));
process.exit(ko === 0 ? 0 : 1);
