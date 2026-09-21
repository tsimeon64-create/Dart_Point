// Tests de normaliserVolees (src/botFleche.js) — lancer : node tests/bot-volees.test.mjs
// Le réglage des bots relit les vraies volées d'un joueur (live_volees). Deux scoreurs y écrivent
// avec deux formats : on vérifie que tout est ramené au format du scoreur de l'appli.
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const ici = path.dirname(fileURLToPath(import.meta.url));
const { normaliserVolees, reconstruireManches, calculerProfilBot } = await import(pathToFileURL(path.join(ici, "../src/botFleche.js")).href);

let ok = 0;
const test = (nom, f) => { f(); ok++; console.log("  ✓", nom); };
const v = (session_id, score, reste) => ({ session_id, score, reste });

test("volées du scoreur de l'appli : inchangées (bust -1, finish reste 0)", () => {
  const rows = [v("A", 60, 441), v("A", -1, 441), v("A", 100, 341), v("A", 0, 341), v("A", 341, 0)];
  assert.deepEqual(normaliserVolees(rows), rows);
});

test("« Jouer en ligne » : bust (reste inchangé) → score -1", () => {
  // 100 (132), 100 (32), bust en tapant 40 (reste 32 inchangé), 20 (12)
  const out = normaliserVolees([v("B", 100, 132), v("B", 100, 32), v("B", 40, 32), v("B", 20, 12)]);
  assert.deepEqual(out.map((x) => x.score), [100, 100, -1, 20]);
  assert.deepEqual(out.map((x) => x.reste), [132, 32, 32, 12]);
});

test("« Jouer en ligne » : finish (reste = nb de fléchettes) → reste 0", () => {
  const out = normaliserVolees([v("C", 140, 361), v("C", 321, 40), v("C", 40, 2)]);
  assert.deepEqual(out.at(-1), { session_id: "C", score: 40, reste: 0 });
});

test("après un finish en ligne, la manche suivante repart normalement", () => {
  const out = normaliserVolees([v("D", 140, 361), v("D", 361, 3), v("D", 26, 475)]);
  assert.deepEqual(out.map((x) => x.reste), [361, 0, 475]);
  const manches = reconstruireManches(out);
  assert.equal(manches.length, 2);
  assert.equal(manches[0].gagnee, true);
});

test("faute de frappe annulée avec « Retour » mais restée en base : retirée", () => {
  // 60 (441), 100 tapé par erreur (341), Retour, 60 (381) → le 100 disparaît
  const out = normaliserVolees([v("E", 60, 441), v("E", 100, 341), v("E", 60, 381), v("E", 45, 336)]);
  assert.deepEqual(out.map((x) => x.score), [60, 60, 45]);
  // sans ça, le reste qui « remonte » (341 → 381) coupait la manche en deux
  assert.equal(reconstruireManches(out).length, 1);
});

test("un finish n'est jamais pris pour une faute de frappe", () => {
  const out = normaliserVolees([v("F", 0, 501), v("F", 501, 0), v("F", 60, 441)]);
  assert.deepEqual(out.map((x) => x.score), [0, 501, 60]);
});

test("changement de partie : on ne compare jamais avec la partie d'avant", () => {
  const out = normaliserVolees([v("G", 60, 441), v("H", 45, 441)]);   // même reste, mais autre partie
  assert.deepEqual(out.map((x) => x.score), [60, 45]);
});

test("finish en ligne sur le double 1 : {2, 2} (2 fléchettes) et {3, 3} (3 fléchettes) restent des finishs", () => {
  const a = normaliserVolees([v("I", 140, 161), v("I", 100, 61), v("I", 59, 2), v("I", 2, 2)]);
  assert.deepEqual(a.at(-1), { session_id: "I", score: 2, reste: 0 });
  const b = normaliserVolees([v("J", 140, 161), v("J", 100, 61), v("J", 58, 3), v("J", 3, 3)]);
  assert.deepEqual(b.at(-1), { session_id: "J", score: 3, reste: 0 });
});

test("1re volée après une manche PERDUE : ni bust, ni faute de frappe", () => {
  // 301 : 45 (256), 15 (241) — l'adversaire gagne — nouvelle manche : 60 (241)
  const a = normaliserVolees([v("K", 45, 256), v("K", 15, 241), v("K", 60, 241), v("K", 41, 200)]);
  assert.deepEqual(a.map((x) => x.score), [45, 15, 60, 41]);
  // 301 : no score (301), 26 (275) — manche perdue — nouvelle manche : 45 (256)
  const b = normaliserVolees([v("L", 0, 301), v("L", 26, 275), v("L", 45, 256)]);
  assert.deepEqual(b.map((x) => x.score), [0, 26, 45]);
});

test("volée ressaisie À L'IDENTIQUE après un ancien « Retour » : le doublon est retiré, pas pris pour un bust", () => {
  const out = normaliserVolees([v("M", 60, 441), v("M", 45, 396), v("M", 45, 396), v("M", 100, 296)]);
  assert.deepEqual(out.map((x) => [x.score, x.reste]), [[60, 441], [45, 396], [100, 296]]);
});

test("bust en ligne seulement si le score atteint le reste", () => {
  // à 32, taper 40 : bust ; à 32, taper 31 : laisserait 1 → bust aussi (double out)
  const a = normaliserVolees([v("N", 60, 32), v("N", 40, 32)]);
  const b = normaliserVolees([v("O", 60, 32), v("O", 31, 32)]);
  assert.equal(a.at(-1).score, -1);
  assert.equal(b.at(-1).score, -1);
});

test("calculerProfilBot : les finishs en ligne sont bien comptés comme finishs", () => {
  // 30 manches en ligne de 501 : 5 volées de 100 puis le finish de 1 en… pas possible ; on prend
  // 4 × 100 (101 restant) puis 61 → 40, puis finish 40 en 2 fléchettes (reste 2 en ligne).
  const volees = [];
  for (let m = 0; m < 30; m++) {
    const s = "S" + m;
    volees.push(v(s, 100, 401), v(s, 100, 301), v(s, 100, 201), v(s, 100, 101), v(s, 61, 40), v(s, 40, 2));
  }
  const p = calculerProfilBot({ drix: 1200, duels: [], amiPseudo: "X", volees });
  assert.equal(p.mode, "replay");
  assert.ok(p.maxFinish >= 40, "le finish de 40 doit être reconnu");
  // Par manche : une tentative ratée à 101, une réussie à 40 → 50 %. Sans la conversion, aucun
  // finish en ligne n'était reconnu et le taux tombait au plancher (5 %).
  assert.equal(p.checkoutRate, 0.5);
});

console.log(`\n${ok} tests OK`);
