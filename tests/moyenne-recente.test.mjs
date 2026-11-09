// Tests de la moyenne sur les 10 dernières manches DRIX (src/moyenneRecente.js)
// Lancer : node tests/moyenne-recente.test.mjs   (ou tous : node --test tests/)
import assert from "node:assert/strict";
import {
  moyenneDernieresManches, dernieresManchesDrix, texteDernieresManches, duelDrixCompte, trierDuelsRecents, MANCHES_RECENTES,
} from "../src/moyenneRecente.js";

let ok = 0;
const test = (nom, f) => { f(); ok++; console.log("  ✓", nom); };

const MOI = "id-thomas";
let date = 1_800_000_000_000;
// Une manche : gagnée par Thomas (g = true) ou perdue, à `moy` de moyenne en `vol` volées.
const manche = (moy, vol = 6, g = true) => g
  ? { winner: "Thomas", loser: "Toto", winner_moy: moy, winner_volees: vol, loser_moy: 20, loser_volees: vol }
  : { winner: "Toto", loser: "Thomas", winner_moy: 99, winner_volees: vol, loser_moy: moy, loser_volees: vol };
// Un duel DRIX terminé de Thomas (challenger) contre Toto ; chaque nouveau duel est PLUS ancien.
const duel = (manches, extra = {}) => ({
  id: `d${String(date).slice(-6)}`, date: (date -= 1000), statut: "termine", type: "drix", mode: "501",
  challenger_id: MOI, challenger_pseudo: "Thomas", defie_id: "id-toto", defie_pseudo: "Toto",
  manches_detail: manches, ...extra,
});
const moy = (duels, o = {}) => moyenneDernieresManches({ joueurId: MOI, pseudo: "Thomas", duels, ...o });

test("ne compte QUE ses 10 dernières manches, la plus récente d'abord", () => {
  // duel récent : 4 manches à 60 ; duel plus ancien : 8 manches dont les 6 DERNIÈRES à 60 et les 2 premières à 10
  const duels = [duel([60, 60, 60, 60].map((m) => manche(m))), duel([10, 10, 60, 60, 60, 60, 60, 60].map((m) => manche(m)))];
  const r = moy(duels);
  assert.deepEqual(r, { moyenne: 60, nbManches: 10 });   // les 2 premières manches du vieux duel restent dehors
  assert.equal(MANCHES_RECENTES, 10);
  const l = dernieresManchesDrix({ joueurId: MOI, pseudo: "Thomas", duels });
  assert.deepEqual(l.map((x) => x.index), [3, 2, 1, 0, 7, 6, 5, 4, 3, 2]);   // dans un duel : la dernière manche d'abord
  assert.equal(l[0].duel, duels[0]);
});

test("seuls les vrais matchs DRIX comptent : drix et rivalité, terminés, en 501 / 301", () => {
  const duels = [
    duel([manche(90)], { type: "amical" }),
    duel([manche(90)], { type: "bull" }),
    duel([manche(90)], { mode: "Cricket" }),
    duel([manche(90)], { statut: "abandonne" }),
    duel([manche(90)], { statut: "conteste" }),
    duel([manche(40)], { type: "rivalite" }),
    duel([manche(50)], { mode: "301" }),
  ];
  assert.deepEqual(moy(duels), { moyenne: 45, nbManches: 2 });
  assert.equal(duelDrixCompte({ statut: "termine", type: "drix", mode: 501 }), true);   // mode en nombre : accepté
  assert.equal(duelDrixCompte(null), false);
});

test("un duel de Cricket ne prend pas une des 10 places", () => {
  const cricket = duel(null, { mode: "Cricket" });
  const duels = [cricket, ...Array.from({ length: 10 }, () => duel([manche(60)])), duel([manche(20)])];
  assert.deepEqual(moy(duels), { moyenne: 60, nbManches: 10 });
});

test("l'ordre ne dépend pas de l'ordre reçu : date décroissante, puis id décroissant", () => {
  const vieux = { ...duel(Array.from({ length: 10 }, () => manche(20))), date: 1000, id: "z" };
  const recentA = { ...duel([manche(70)]), date: 5000, id: "a" };
  const recentB = { ...duel([manche(50)]), date: 5000, id: "b" };   // même milliseconde : « b » passe avant « a »
  const l = dernieresManchesDrix({ joueurId: MOI, pseudo: "Thomas", duels: [vieux, recentA, recentB] });
  assert.deepEqual(l.slice(0, 3).map((x) => x.duel.id), ["b", "a", "z"]);
  assert.deepEqual(trierDuelsRecents([{ id: "x" }, { id: "y", date: 3 }]).map((d) => d.id), ["y", "x"]);   // sans date : au bout
});

test("pondère chaque manche par son nombre de volées, comme la moyenne réelle du profil", () => {
  const r = moy([duel([manche(40, 10), manche(70, 5)])]);
  assert.equal(r.moyenne, Math.round((40 * 10 + 70 * 5) / 15));   // 50
});

test("arrondi exact : 57,5 donne 58 (division en dernier)", () => {
  assert.equal(moy([duel([manche(57, 1), manche(58, 1)])]).moyenne, 58);
  // 57,63 × 3 + 57,37 × 1 → 57,565 → 58 ; en flottant naïf on risquerait 57,56499…
  assert.equal(moy([duel([manche(57.63, 3), manche(57.37, 1)])]).moyenne, 58);
  assert.equal(moy([duel([manche(57.49, 1)])]).moyenne, 57);
});

test("ses chiffres de PERDANT quand il a perdu la manche, et du côté défié", () => {
  const d = duel([manche(45, 5, false)], { challenger_id: "id-toto", challenger_pseudo: "Toto", defie_id: MOI, defie_pseudo: "Thomas" });
  assert.deepEqual(moy([d]), { moyenne: 45, nbManches: 1 });
  assert.equal(dernieresManchesDrix({ joueurId: MOI, pseudo: "Thomas", duels: [d] })[0].isW, false);
});

test("pseudo changé depuis : on le reconnaît par le pseudo enregistré dans le duel", () => {
  const d = duel([{ winner: "Tom_ancien", loser: "Toto", winner_moy: 66, winner_volees: 4 }], { challenger_pseudo: "Tom_ancien" });
  assert.equal(moy([d]).moyenne, 66);
});

test("sans id du joueur : on retrouve son côté par le pseudo", () => {
  const d = duel([manche(45, 5, false)], { challenger_id: "id-toto", challenger_pseudo: "Toto", defie_id: MOI, defie_pseudo: "Thomas" });
  assert.equal(moyenneDernieresManches({ pseudo: "Thomas", duels: [d] }).moyenne, 45);
});

test("une manche sans moyenne ne prend pas de place ; un duel sans détail non plus", () => {
  const duels = [
    duel([manche(0), { winner: "Thomas" }, null, manche(50)]),
    duel(null), duel("pas un tableau"),
    ...Array.from({ length: 9 }, () => duel([manche(50)])),
    duel([manche(10)]),
  ];
  assert.deepEqual(moy(duels), { moyenne: 50, nbManches: 10 });
});

test("remise à zéro des stats : les manches d'avant ne comptent plus", () => {
  const neuf = { ...duel([manche(70)]), date: 2000 };
  const avant = { ...duel([manche(30)]), date: 1000 };
  assert.deepEqual(moy([neuf, avant], { depuis: 1500 }), { moyenne: 70, nbManches: 1 });
  assert.deepEqual(moy([neuf, avant]), { moyenne: 50, nbManches: 2 });
});

test("moins de 10 manches : sur ce qu'il a joué ; rien : null, sans plantage", () => {
  assert.deepEqual(moy([duel([manche(55), manche(65)])]), { moyenne: 60, nbManches: 2 });
  assert.deepEqual(moyenneDernieresManches({ joueurId: MOI }), { moyenne: null, nbManches: 0 });
  assert.deepEqual(moyenneDernieresManches({ joueurId: MOI, duels: null }), { moyenne: null, nbManches: 0 });
  assert.deepEqual(moyenneDernieresManches(), { moyenne: null, nbManches: 0 });
});

test("le petit texte sous la moyenne", () => {
  assert.equal(texteDernieresManches(10), "sur ses 10 dernières manches");
  assert.equal(texteDernieresManches(4), "sur ses 4 dernières manches");
  assert.equal(texteDernieresManches(1), "sur sa seule manche");
  assert.equal(texteDernieresManches(10, true), "sur tes 10 dernières manches");
  assert.equal(texteDernieresManches(1, true), "sur ta seule manche");
  assert.equal(texteDernieresManches(12), "sur ses 10 dernières manches");
});

console.log(`\n${ok} tests OK`);
