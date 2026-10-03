// Tests de calculerStatsMatch (src/statsMatch.js) — lancer : node tests/stats-match.test.mjs
import assert from "node:assert/strict";
import { calculerStatsMatch, statsParManche, BANDES } from "../src/statsMatch.js";

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

console.log(`\n${ok} tests OK`);
