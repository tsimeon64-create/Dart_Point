// Tests de src/classementSpeedrun.js — lancer : node tests/classement-speedrun.test.mjs
import assert from "node:assert/strict";
import { dateJourDepuisLabel, fmtTempsSpeedrun, trierClassement } from "../src/classementSpeedrun.js";

let ok = 0;
const test = (nom, f) => { f(); ok++; console.log("  ✓", nom); };

test("date de la carte → date_jour en base", () => {
  assert.equal(dateJourDepuisLabel("05/11/2026"), "2026-11-05");
  assert.equal(dateJourDepuisLabel(" 01/02/2027 "), "2027-02-01");
  assert.equal(dateJourDepuisLabel(null), null);
  assert.equal(dateJourDepuisLabel("5/11/2026"), null);
  assert.equal(dateJourDepuisLabel("2026-11-05"), null);
});

test("temps au même format que le grand chrono de la carte", () => {
  assert.equal(fmtTempsSpeedrun(24400), "24.4s");
  assert.equal(fmtTempsSpeedrun(65300), "1m 5.3s");
  assert.equal(fmtTempsSpeedrun(0), "0.0s");
});

test("classement : terminés par temps puis erreurs, abandons en bas sans rang", () => {
  const c = trierClassement([
    { joueur_id: "a", joueur_pseudo: "Ana", temps_ms: 30000, erreurs: 1, statut: "termine" },
    { joueur_id: "b", joueur_pseudo: "Bob", temps_ms: 0, erreurs: 0, statut: "abandonne" },
    { joueur_id: "c", joueur_pseudo: "Cyr", temps_ms: 24400, erreurs: 0, statut: "termine" },
    { joueur_id: "d", joueur_pseudo: "Dan", temps_ms: 30000, erreurs: 0, statut: "termine" },
    { joueur_id: "e", joueur_pseudo: "Eve", temps_ms: 41000, erreurs: 2, statut: "abandonne" },
  ]);
  assert.deepEqual(c.map((l) => [l.joueur_pseudo, l.rang]), [["Cyr", 1], ["Dan", 2], ["Ana", 3], ["Bob", null], ["Eve", null]]);
  assert.equal(c[0].termine, true); assert.equal(c[3].termine, false);
});

test("un joueur n'apparaît qu'une fois (sa meilleure tentative)", () => {
  const c = trierClassement([
    { joueur_id: "a", joueur_pseudo: "Ana", temps_ms: 0, statut: "abandonne" },
    { joueur_id: "a", joueur_pseudo: "Ana", temps_ms: 31000, erreurs: 0, statut: "termine" },
    { joueur_id: "a", joueur_pseudo: "Ana", temps_ms: 29000, erreurs: 3, statut: "termine" },
    { joueur_id: "b", joueur_pseudo: "Bob", temps_ms: 35000, statut: "termine" },
  ]);
  assert.equal(c.length, 2);
  assert.equal(c[0].joueur_pseudo, "Ana"); assert.equal(c[0].temps_ms, 29000);
});

test("vieilles lignes sans statut = terminées ; données vides sans plantage", () => {
  const c = trierClassement([{ joueur_id: "a", joueur_pseudo: "Ana", temps_ms: 20000 }]);
  assert.equal(c[0].rang, 1);
  assert.deepEqual(trierClassement(null), []);
  assert.deepEqual(trierClassement([null, undefined]), []);
});

console.log(`\n${ok} tests OK`);
