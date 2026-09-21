// Tests de calculerRaccourcis (src/raccourcisScores.js) — lancer : node tests/raccourcis.test.mjs
// Le module importe React (pour le hook) : on n'en teste que la fonction pure, en l'extrayant.
import fs from "node:fs";
import assert from "node:assert/strict";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";

const ici = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(ici, "../src/raccourcisScores.js"), "utf8");
const debut = src.indexOf("export const RACCOURCIS_DEFAUT");
const fin = src.indexOf("const estUuid");
const tmp = path.join(ici, "zz-raccourcis-tmp.mjs");
fs.writeFileSync(tmp, src.slice(debut, fin));
const { calculerRaccourcis, voleesDeScoring, RACCOURCIS_DEFAUT, MIN_VOLEES } = await import(pathToFileURL(tmp).href);
fs.unlinkSync(tmp);

let ok = 0;
const test = (nom, f) => { f(); ok++; console.log("  ✓", nom); };
const repete = (s, n) => Array(n).fill(s);

test("trop peu de volées → null (rangée par défaut)", () => {
  assert.equal(calculerRaccourcis(repete(60, MIN_VOLEES - 1)), null);
  assert.equal(calculerRaccourcis([]), null);
  assert.equal(calculerRaccourcis(null), null);
});

test("les 8 plus fréquents, rangés du plus petit au plus grand", () => {
  const v = [...repete(60, 20), ...repete(45, 15), ...repete(100, 12), ...repete(41, 10), ...repete(26, 9),
             ...repete(85, 8), ...repete(81, 7), ...repete(140, 6), ...repete(7, 1), ...repete(180, 2)];
  assert.deepEqual(calculerRaccourcis(v), [26, 41, 45, 60, 81, 85, 100, 140]);
});

test("à fréquence égale, le plus gros score passe devant", () => {
  const v = [...repete(10, 10), ...repete(20, 10), ...repete(30, 10), ...repete(40, 10), ...repete(50, 10),
             ...repete(60, 10), ...repete(70, 10), ...repete(80, 10), ...repete(90, 10)];
  assert.deepEqual(calculerRaccourcis(v), [20, 30, 40, 50, 60, 70, 80, 90]);
});

test("bust (-1), zéro, >180 et non-entiers ignorés", () => {
  const v = [...repete(-1, 50), ...repete(0, 50), ...repete(200, 50), ...repete(12.5, 50), ...repete(60, MIN_VOLEES)];
  const r = calculerRaccourcis(v);
  assert.ok(r.includes(60));
  assert.ok(!r.some((s) => s <= 0 || s > 180 || !Number.isInteger(s)));
  // les -1/0/200/12.5 ne comptent pas dans le minimum de volées
  assert.equal(calculerRaccourcis([...repete(-1, 100), ...repete(60, MIN_VOLEES - 1)]), null);
});

test("joueur très régulier : complété avec la rangée par défaut, sans doublon", () => {
  const r = calculerRaccourcis([...repete(60, 20), ...repete(45, 20)]);
  assert.equal(r.length, 8);
  assert.equal(new Set(r).size, 8);
  assert.ok(r.includes(60) && r.includes(45));
  assert.deepEqual(r, [...new Set([60, 45, ...RACCOURCIS_DEFAUT])].slice(0, 8).sort((a, b) => a - b));
});

test("scores reçus en texte (PostgREST) acceptés", () => {
  const r = calculerRaccourcis(repete("60", MIN_VOLEES));
  assert.ok(r.includes(60));
});

// ── voleesDeScoring : ne garder que les vraies volées de scoring ──────────────
const v = (session_id, numero_volee, score, reste) => ({ session_id, numero_volee, score, reste });

test("scoreur de l'appli : bust (-1) et finish (reste 0) écartés, volées normales gardées", () => {
  const rows = [v("A", 1, 60, 441), v("A", 2, -1, 441), v("A", 3, 100, 341), v("A", 4, 41, 300), v("A", 5, 300, 0)];
  assert.deepEqual(voleesDeScoring(rows), [60, 100, 41]);
});

test("« Jouer en ligne » : bust (reste inchangé) et finish (reste = nb de fléchettes) écartés", () => {
  // 501 → 60 → 441 ; bust en tapant 45 (reste inchangé 441) ; 81 → 360 ; … ; finish 40 en 2 fléchettes
  const rows = [v("B", 1, 60, 441), v("B", 2, 45, 441), v("B", 3, 81, 360), v("B", 4, 320, 40), v("B", 5, 40, 2)];
  assert.deepEqual(voleesDeScoring(rows), [60, 81]);   // 320 > 180 : impossible, écarté aussi
});

test("« Retour » : la volée corrigée est gardée même si la faute de frappe est restée en base", () => {
  // tapé 100 par erreur (341), Retour, puis 60 (441 - 60 = 381)
  const rows = [v("C", 1, 60, 441), v("C", 2, 100, 341), v("C", 3, 60, 381)];
  assert.deepEqual(voleesDeScoring(rows), [60, 100, 60]);
});

test("nouvelle manche : la 1re volée compte (départ 501 ou 301), après un finish d'appli ou en ligne", () => {
  const appli = [v("D", 1, 140, 361), v("D", 9, 40, 0), v("D", 10, 45, 456)];
  const enLigne = [v("E", 1, 140, 161), v("E", 7, 40, 3), v("E", 8, 26, 275)];   // manche en 301
  assert.deepEqual(voleesDeScoring(appli), [140, 45]);
  assert.deepEqual(voleesDeScoring(enLigne), [140, 26]);
});

test("plusieurs parties mélangées et dans le désordre : chacune relue dans l'ordre des volées", () => {
  const rows = [v("F", 2, 100, 341), v("G", 1, 26, 475), v("F", 1, 60, 441), v("G", 2, 45, 430)];
  assert.deepEqual(voleesDeScoring(rows).sort((a, b) => a - b), [26, 45, 60, 100]);
});

test("lignes vides ou sans partie ignorées", () => {
  assert.deepEqual(voleesDeScoring(null), []);
  assert.deepEqual(voleesDeScoring([null, { score: 60, reste: 441 }]), []);
});

console.log(`\n${ok} tests OK`);
