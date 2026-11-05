// Tests de calculerStatsMatch (src/statsMatch.js) — lancer : node tests/stats-match.test.mjs
import assert from "node:assert/strict";
import { calculerStatsMatch, statsParManche, statsParMancheDepuisDetail, statsDepuisManches, first9DepuisManches, BANDES } from "../src/statsMatch.js";

let ok = 0;
const test = (nom, f) => { f(); ok++; console.log("  ✓", nom); };

// Un match de 2 manches : Thomas gagne les deux.
// Manche 1 : Thomas commence (il a gagné la bulle) — 180, 140, 60, finish 121 (9 fléchettes + 3)
// Manche 2 : Toto commence — Thomas 100, 100, 180, finish 121
const manches = [
  { winner: "Thomas", loser: "Toto",
    winner_volees: 4, winner_flech: 11, winner_finish: 121, winner_checkout_attempts: 1,
    loser_volees: 3,  loser_flech: 9,   loser_checkout_attempts: 0 },
  { winner: "Thomas", loser: "Toto",
    winner_volees: 4, winner_flech: 12, winner_finish: 121, winner_checkout_attempts: 2,
    loser_volees: 4,  loser_flech: 12,  loser_checkout_attempts: 1 },
];
const joueurs = [
  { nom: "Thomas", flechettes: 23, totalPoints: 1002,
    tours: [180, 140, 60, 121, /* manche 2 */ 100, 100, 180, 121] },
  { nom: "Toto", flechettes: 21, totalPoints: 400,
    tours: [60, 45, 26, /* manche 2 */ 100, 60, 45, 0] },
];

const [thomas, toto] = calculerStatsMatch({ joueurs, manches, premierALaBulle: 0 });

test("manches gagnées", () => { assert.equal(thomas.manchesGagnees, 2); assert.equal(toto.manchesGagnees, 0); });

test("moyenne 3 fléchettes = 3 × points / fléchettes", () => {
  assert.equal(thomas.moyenne, Math.round((1002 / 23) * 3 * 100) / 100);
  assert.equal(toto.moyenne, Math.round((400 / 21) * 3 * 100) / 100);
});

test("tranches de volées : 180 à part, 60+ = 60 à 79, 120+ = 120 à 139", () => {
  assert.equal(thomas.p180, 2);              // deux 180
  assert.equal(thomas.p140, 1);              // 140 (140-169)
  assert.equal(thomas.p120, 2);              // les deux finishs à 121
  assert.equal(thomas.p100, 2);              // 100 et 100
  assert.equal(thomas.p60, 1);               // 60
  assert.equal(thomas.p170, 0);
  assert.equal(toto.p60, 2);                 // ses deux 60 (les 45 et le 26 sont sous 60)
});

test("tranches du perdant", () => {
  assert.equal(toto.p100, 1);                // 100
  assert.equal(toto.p180, 0);
  assert.equal(toto.meilleureVolee, 100);
});

test("une volée bustée (0) ne compte dans aucune tranche", () => {
  const total = BANDES.reduce((s, b) => s + toto[b.cle], 0);
  assert.ok(total < toto.volees);            // le 0 final n'est dans aucune tranche
});

test("high finish et finishs à 100 et plus", () => {
  assert.equal(thomas.highFinish, 121);
  assert.equal(thomas.finishs100, 2);
  assert.equal(toto.highFinish, 0);
  assert.equal(toto.finishs100, 0);
});

test("meilleure et pire manche = fléchettes des manches GAGNÉES", () => {
  assert.equal(thomas.meilleureManche, 11);
  assert.equal(thomas.pireManche, 12);
  assert.equal(toto.meilleureManche, null);  // il n'en a gagné aucune
});

test("checkout % = manches gagnées / tentatives réelles", () => {
  assert.equal(thomas.checkout.tentatives, 3);
  assert.equal(thomas.checkout.reussis, 2);
  assert.equal(thomas.checkout.pct, Math.round((2 / 3) * 100 * 100) / 100);
  assert.equal(toto.checkout.tentatives, 1);
  assert.equal(toto.checkout.pct, 0);
});

test("keep / break : les manches alternent à partir de celui qui a gagné la bulle", () => {
  // Thomas commence la manche 1 (il a fait la bulle) et gagne → 1 keep sur 1
  assert.deepEqual([thomas.keep.gagnes, thomas.keep.total], [1, 1]);
  // Toto commence la manche 2, Thomas la gagne quand même → 1 break sur 1
  assert.deepEqual([thomas.brk.gagnes, thomas.brk.total], [1, 1]);
  assert.deepEqual([toto.keep.gagnes, toto.keep.total], [0, 1]);
  assert.deepEqual([toto.brk.gagnes, toto.brk.total], [0, 1]);
});

test("first 9 : moyenne des 9 premières fléchettes de chaque manche", () => {
  // Thomas : manche 1 → 180+140+60 = 380 sur 9 fléchettes ; manche 2 → 100+100+180 = 380 sur 9
  assert.equal(thomas.first9, Math.round(((760) / 18) * 3 * 100) / 100);
});

test("manche pliée en 3 volées ou moins : on compte les vraies fléchettes", () => {
  const [j] = calculerStatsMatch({
    joueurs: [{ nom: "A", flechettes: 9, totalPoints: 501, tours: [180, 180, 141] }],
    manches: [{ winner: "A", loser: "B", winner_volees: 3, winner_flech: 9, winner_finish: 141, winner_checkout_attempts: 1 }],
    premierALaBulle: 0,
  });
  assert.equal(j.first9, 167);               // 501 points en 9 fléchettes
  assert.equal(j.meilleureManche, 9);
});

test("aucune donnée : pas de plantage", () => {
  const r = calculerStatsMatch({});
  assert.deepEqual(r, []);
  const [vide] = calculerStatsMatch({ joueurs: [{ nom: "X" }], manches: null });
  assert.equal(vide.moyenne, 0);
  assert.equal(vide.meilleureManche, null);
  assert.equal(vide.checkout.pct, 0);
});

test("« <30 » : toutes les volées sous 30 points, bust (0) compris", () => {
  const [j] = calculerStatsMatch({
    joueurs: [{ nom: "A", flechettes: 36, totalPoints: 923, tours: [0, 18, 26, 29, 30, 60, 80, 100, 120, 140, 170, 180] }],
    manches: [],
  });
  assert.equal(j.moins30, 4);          // 0, 18, 26 et 29
  assert.equal(j.n26, 1);              // un seul 26
  assert.equal(j.p60, 1);              // les seuils d'avant ne bougent pas
  assert.equal(j.p180, 1);
});

test("le total du match = la somme des manches (<30 et 26)", () => {
  const joueurs = [
    { nom: "A", flechettes: 24, totalPoints: 501, tours: [60, 26, 41, 18, 100, 26, 130, 0] },
    { nom: "B", flechettes: 24, totalPoints: 300, tours: [26, 29, 45, 60, 26, 14, 60, 40] },
  ];
  const manches = [
    { winner: "A", loser: "B", winner_volees: 4, loser_volees: 4, winner_flech: 12, loser_flech: 12, winner_finish: 18, winner_checkout_attempts: 1, loser_checkout_attempts: 0 },
    { winner: "A", loser: "B", winner_volees: 4, loser_volees: 4, winner_flech: 12, loser_flech: 12, winner_finish: 0,  winner_checkout_attempts: 1, loser_checkout_attempts: 0 },
  ];
  const [a] = calculerStatsMatch({ joueurs, manches, premierALaBulle: 0 });
  const parManche = statsParManche({ joueurs, manches });
  assert.equal(a.moins30, parManche.reduce((s2, duo) => s2 + duo[0].moins30, 0));
  assert.equal(a.n26, parManche.reduce((s2, duo) => s2 + duo[0].n26, 0));
  assert.equal(a.n26, 2);
});

// ── Bug de novembre 2026 : « Manche par manche » décalé après un finish en 1 fléchette ──
// Manche 1 : Thomas plie en 180, 180, 101 puis D20 en UNE fléchette → 10 fléchettes, 4 volées,
// mais winner_volees = round(10 / 3) = 3. Redécouper ses volées avec ce 3 donnait à la manche 2
// le 40 de la manche 1 (moyenne 43,75 au lieu de 45, First 9 faux…).
const detailBug = [
  { winner: "Thomas", loser: "Toto", winner_volees: 3, loser_volees: 3, winner_flech: 10, loser_flech: 9,
    winner_moy: 150.3, loser_moy: 60, reste_loser: 321, winner_max: 180, loser_max: 60, winner_finish: 40,
    winner_180: 2, winner_140plus: 0, winner_100plus: 1, winner_80plus: 0, winner_60plus: 0,
    loser_180: 0, loser_140plus: 0, loser_100plus: 0, loser_80plus: 0, loser_60plus: 3, winner_26: 0, loser_26: 0,
    winner_checkout_attempts: 1, loser_checkout_attempts: 0, winner_moins30: 0, loser_moins30: 0,
    winner_120plus: 0, loser_120plus: 0, winner_170plus: 0, loser_170plus: 0,
    winner_f9_pts: 461, winner_f9_flech: 9, loser_f9_pts: 180, loser_f9_flech: 9, starter: "Thomas" },
  { winner: "Toto", loser: "Thomas", winner_volees: 5, loser_volees: 4, winner_flech: 15, loser_flech: 12,
    winner_moy: 100.2, loser_moy: 45, reste_loser: 321, winner_max: 101, loser_max: 45, winner_finish: 101,
    winner_180: 0, winner_140plus: 0, winner_100plus: 5, winner_80plus: 0, winner_60plus: 0,
    loser_180: 0, loser_140plus: 0, loser_100plus: 0, loser_80plus: 0, loser_60plus: 0, winner_26: 0, loser_26: 0,
    winner_checkout_attempts: 1, loser_checkout_attempts: 0, winner_moins30: 0, loser_moins30: 0,
    winner_120plus: 0, loser_120plus: 0, winner_170plus: 0, loser_170plus: 0,
    winner_f9_pts: 300, winner_f9_flech: 9, loser_f9_pts: 135, loser_f9_flech: 9, starter: "Toto" },
];
const joueursBug = [
  { nom: "Thomas", flechettes: 22, totalPoints: 681, tours: [180, 180, 101, 40, /* manche 2 */ 45, 45, 45, 45] },
  { nom: "Toto",   flechettes: 24, totalPoints: 681, tours: [60, 60, 60, /* manche 2 */ 100, 100, 100, 100, 101] },
];

test("finish en 1 fléchette : « Manche par manche » suit le détail exact de chaque manche", () => {
  const parManche = statsParManche({ joueurs: joueursBug, manches: detailBug });
  const thomas2 = parManche[1].find((s) => s.nom === "Thomas");
  assert.equal(thomas2.moyenne, 45);           // et pas 43,75 (le 40 de la manche 1 glissé dedans)
  assert.equal(thomas2.first9, 45);
  const thomas1 = parManche[0].find((s) => s.nom === "Thomas");
  assert.equal(thomas1.moyenne, 150.3);
  assert.equal(thomas1.finish, 40);
});

test("finish en 1 fléchette : le First 9 du match vient du détail des manches", () => {
  const [thomas, toto] = calculerStatsMatch({ joueurs: joueursBug, manches: detailBug, premierALaBulle: 0 });
  assert.equal(thomas.first9, Math.round(((461 + 135) / 18) * 3 * 100) / 100);   // 99,33 (pas 98,5)
  assert.equal(toto.first9, Math.round(((180 + 300) / 18) * 3 * 100) / 100);
  assert.equal(thomas.moyenne, Math.round((681 / 22) * 3 * 100) / 100);         // le reste ne bouge pas
  assert.equal(thomas.volees, 8);
});

test("First 9 depuis le détail : null si une manche du joueur n'a pas ce détail", () => {
  assert.equal(first9DepuisManches(detailBug, "Thomas"), Math.round(((461 + 135) / 18) * 3 * 100) / 100);
  assert.equal(first9DepuisManches([{ winner: "Thomas", loser: "Toto", winner_moy: 50 }], "Thomas"), null);
  assert.equal(first9DepuisManches(detailBug, "Personne"), null);
});

// Relecture de nov. 2026 : le détail range 100plus = 100 à 139 et 140plus = 140 à 179 (120+ et
// 170+ COMPRIS). « Manche par manche » comptait donc deux fois un 125 ou un 175.
test("tranches : la somme des manches (depuis le détail) = les tranches du match", () => {
  // Construit comme buildMancheDetail : A joue 125, 175, 100, 101 (501) ; B joue 60, 85, 130 (275).
  const cnt = (t, a, b = a) => t.filter((v) => v >= a && v <= b).length;
  const tA = [125, 175, 100, 101], tB = [60, 85, 130];
  const m = { winner: "A", loser: "B", winner_volees: 4, loser_volees: 3, winner_flech: 12, loser_flech: 9,
    winner_moy: 125.25, loser_moy: 91.67, winner_max: 175, loser_max: 130, winner_finish: 101, reste_loser: 226,
    winner_checkout_attempts: 1, loser_checkout_attempts: 0, winner_f9_pts: 400, winner_f9_flech: 9, loser_f9_pts: 275, loser_f9_flech: 9 };
  for (const [cote, t] of [["winner_", tA], ["loser_", tB]]) {
    Object.assign(m, { [cote + "180"]: cnt(t, 180), [cote + "140plus"]: cnt(t, 140, 179), [cote + "100plus"]: cnt(t, 100, 139),
      [cote + "80plus"]: cnt(t, 80, 99), [cote + "60plus"]: cnt(t, 60, 79), [cote + "26"]: cnt(t, 26),
      [cote + "moins30"]: t.filter((v) => v < 30).length, [cote + "120plus"]: cnt(t, 120, 139), [cote + "170plus"]: cnt(t, 170, 179) });
  }
  const match = calculerStatsMatch({ joueurs: [{ nom: "A", tours: tA, flechettes: 12, totalPoints: 501 }, { nom: "B", tours: tB, flechettes: 9, totalPoints: 275 }], manches: [m] });
  const parManche = statsParMancheDepuisDetail([m], ["A", "B"])[0];
  const depuisDetail = statsDepuisManches([m], ["A", "B"]);
  for (const i of [0, 1]) {
    for (const b of BANDES) {
      assert.equal(parManche[i][b.cle], match[i][b.cle], `manche ${b.label} joueur ${i}`);
      assert.equal(depuisDetail[i][b.cle], match[i][b.cle], `détail ${b.label} joueur ${i}`);
    }
  }
  assert.equal(parManche[0].p100, 2);   // 100 et 101 — pas le 125
  assert.equal(parManche[0].p140, 0);   // pas le 175
});

test("parties en ligne sans fléchettes enregistrées : moyenne pondérée par les volées, pas « — »", () => {
  const enLigne = [
    { winner: "A", loser: "B", winner_moy: 60, loser_moy: 45, winner_volees: 10, loser_volees: 10, winner_finish: 40 },
    { winner: "B", loser: "A", winner_moy: 50, loser_moy: 40, winner_volees: 12, loser_volees: 11 },
  ];
  const [a, b] = statsDepuisManches(enLigne, ["A", "B"]);
  assert.equal(a.moyenne, Math.round(((60 * 10 + 40 * 11) / 21) * 100) / 100);
  assert.equal(b.moyenne, Math.round(((45 * 10 + 50 * 12) / 22) * 100) / 100);
  assert.equal(a.flechettes, null);     // inconnues → « — », pas un faux 0
  const avecFlech = statsDepuisManches([{ ...enLigne[0], winner_flech: 29, loser_flech: 30 }], ["A"]);
  assert.equal(avecFlech[0].moyenne, 60);
  assert.equal(avecFlech[0].flechettes, 29);
});

console.log(`\n${ok} tests OK`);
