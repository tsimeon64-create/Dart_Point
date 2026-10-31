// Tests de moyenneDerniersMatchs (src/moyenneRecente.js) — lancer : node tests/moyenne-recente.test.mjs
import assert from "node:assert/strict";
import { moyenneDerniersMatchs, texteDerniersMatchs, MATCHS_RECENTS } from "../src/moyenneRecente.js";

let ok = 0;
const test = (nom, f) => { f(); ok++; console.log("  ✓", nom); };

const MOI = "id-thomas";
// Un duel terminé de Thomas (challenger) contre Toto, une manche gagnée à `moy` de moyenne en `vol` volées.
const duel = (moy, vol = 6, extra = {}) => ({
  challenger_id: MOI, challenger_pseudo: "Thomas", defie_id: "id-toto", defie_pseudo: "Toto",
  manches_detail: [{ winner: "Thomas", loser: "Toto", winner_moy: moy, winner_volees: vol, loser_moy: 20, loser_volees: vol }],
  ...extra,
});

test("ne compte QUE les 10 derniers matchs (les plus récents d'abord)", () => {
  const duels = [...Array(10).fill(0).map(() => duel(60)), duel(20), duel(20)];
  const r = moyenneDerniersMatchs({ joueurId: MOI, pseudo: "Thomas", duels });
  assert.equal(r.moyenne, 60);          // les deux vieux matchs à 20 sont ignorés
  assert.equal(r.nbMatchs, 10);
  assert.equal(MATCHS_RECENTS, 10);
});

test("pondère chaque manche par son nombre de volées, comme la moyenne réelle du profil", () => {
  const duels = [duel(40, 10), duel(70, 5)];
  const r = moyenneDerniersMatchs({ joueurId: MOI, pseudo: "Thomas", duels });
  assert.equal(r.moyenne, Math.round((40 * 10 + 70 * 5) / 15));   // 50
});

test("arrondi exact : 57,5 donne 58 (division en dernier)", () => {
  const r = moyenneDerniersMatchs({ joueurId: MOI, pseudo: "Thomas", duels: [duel(57, 1), duel(58, 1)] });
  assert.equal(r.moyenne, 58);
});

test("ses chiffres de PERDANT quand il a perdu la manche, et du côté défié", () => {
  const d = {
    challenger_id: "id-toto", challenger_pseudo: "Toto", defie_id: MOI, defie_pseudo: "Thomas",
    manches_detail: [{ winner: "Toto", loser: "Thomas", winner_moy: 80, winner_volees: 5, loser_moy: 45, loser_volees: 5 }],
  };
  const r = moyenneDerniersMatchs({ joueurId: MOI, pseudo: "Thomas", duels: [d] });
  assert.equal(r.moyenne, 45);
});

test("pseudo changé depuis : on le reconnaît par le pseudo enregistré dans le duel", () => {
  const d = duel(66, 4, { challenger_pseudo: "Tom_ancien", manches_detail: [{ winner: "Tom_ancien", winner_moy: 66, winner_volees: 4 }] });
  const r = moyenneDerniersMatchs({ joueurId: MOI, pseudo: "Thomas", duels: [d] });
  assert.equal(r.moyenne, 66);
});

test("sans détail des manches : moyenne de ses scores de duel (> 0)", () => {
  const vieux = [
    { challenger_id: MOI, score_challenger: "48.4", manches_detail: null },
    { challenger_id: "x", defie_id: MOI, score_defie: 51.2, manches_detail: [] },
    { challenger_id: MOI, score_challenger: 0 },
  ];
  const r = moyenneDerniersMatchs({ joueurId: MOI, pseudo: "Thomas", duels: vieux });
  assert.equal(r.moyenne, 50);          // (48,4 + 51,2) / 2 = 49,8 → 50
  assert.equal(r.nbMatchs, 3);
});

test("moins de 10 matchs : sur ce qu'il a joué", () => {
  const r = moyenneDerniersMatchs({ joueurId: MOI, pseudo: "Thomas", duels: [duel(55), duel(65)] });
  assert.equal(r.nbMatchs, 2);
  assert.equal(r.moyenne, 60);
});

test("aucun match ou aucun chiffre : null, sans plantage", () => {
  assert.deepEqual(moyenneDerniersMatchs({ joueurId: MOI }), { moyenne: null, nbMatchs: 0 });
  assert.deepEqual(moyenneDerniersMatchs({ joueurId: MOI, duels: null }), { moyenne: null, nbMatchs: 0 });
  const r = moyenneDerniersMatchs({ joueurId: MOI, duels: [{ challenger_id: MOI, manches_detail: "pas un tableau" }] });
  assert.equal(r.moyenne, null);
});

test("un duel de Cricket ne prend pas une des 10 places (il n'a pas de moyenne)", () => {
  const cricket = { mode: "Cricket", challenger_id: MOI, statut: "termine", manches_detail: null };
  const duels = [cricket, cricket, cricket, ...Array(10).fill(0).map(() => duel(60, 6, { mode: "501" })), duel(20, 6, { mode: "301" })];
  const r = moyenneDerniersMatchs({ joueurId: MOI, pseudo: "Thomas", duels });
  assert.equal(r.moyenne, 60);          // ses 10 derniers 501/301 ; le vieux 301 à 20 reste dehors
  assert.equal(r.nbMatchs, 10);
  const peu = moyenneDerniersMatchs({ joueurId: MOI, pseudo: "Thomas", duels: [cricket, duel(50), cricket] });
  assert.deepEqual(peu, { moyenne: 50, nbMatchs: 1 });   // « sur son seul match », pas « 3 »
});

test("le petit texte sous la moyenne", () => {
  assert.equal(texteDerniersMatchs(10), "sur ses 10 derniers matchs");
  assert.equal(texteDerniersMatchs(4), "sur ses 4 derniers matchs");
  assert.equal(texteDerniersMatchs(1), "sur son seul match");
  assert.equal(texteDerniersMatchs(10, true), "sur tes 10 derniers matchs");
  assert.equal(texteDerniersMatchs(1, true), "sur ton seul match");
});

console.log(`\n${ok} tests OK`);
