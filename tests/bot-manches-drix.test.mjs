// Le bot d'un joueur rejoue SES 10 DERNIÈRES MANCHES DRIX, et seulement elles (src/botFleche.js).
// On vérifie : quelle partie live appartient à quel duel (sessionsDuDuel), la remise en manches
// de ses volées (manchesDrixDepuisVolees) et le profil du bot (calculerProfilBot).
// Lancer : node tests/bot-manches-drix.test.mjs   (ou tous : node --test tests/)
import assert from "node:assert/strict";
import {
  sessionsDuDuel, creneauDuDuel, manchesDrixDepuisVolees, calculerProfilBot, decouperManches, reconstruireManches,
  statsReelles, FENETRE_SESSION_MS, MIN_MANCHES_REJEU,
} from "../src/botFleche.js";

let ok = 0;
const test = (nom, f) => { f(); ok++; console.log("  ✓", nom); };

const MOI = "11111111-1111-4111-8111-111111111111";
const TOTO = "22222222-2222-4222-8222-222222222222";
const ZOE = "33333333-3333-4333-8333-333333333333";
const H = 3600 * 1000, MIN = 60 * 1000;
const T0 = 1_800_000_000_000;

// Un duel DRIX terminé à l'heure `fin`, Thomas (challenger) contre `adv`.
const duel = (id, fin, manches, extra = {}) => ({
  id, date: fin, statut: "termine", type: "drix", mode: "501",
  challenger_id: MOI, challenger_pseudo: "Thomas", defie_id: TOTO, defie_pseudo: "Toto",
  manches_detail: manches, ...extra,
});
// Le détail d'une manche gagnée (G) ou perdue (P) par Thomas.
const md = (g, moy = 50, vol = 6) => g
  ? { winner: "Thomas", loser: "Toto", winner_moy: moy, winner_volees: vol, loser_moy: 30, loser_volees: vol }
  : { winner: "Toto", loser: "Thomas", winner_moy: 70, winner_volees: vol, loser_moy: moy, loser_volees: vol };
const session = (id, debut, extra = {}) => ({ id, debut, joueur1_id: MOI, joueur2_id: TOTO, bot_side: 0, duel_id: null, ...extra });
// Ses volées d'une suite de scores dans une partie (le reste descend ; -1 = bust).
const volees = (session_id, depart, scores, num0 = 1) => {
  let reste = depart;
  return scores.map((s, i) => {
    if (s >= 0) reste -= s;
    return { session_id, joueur_id: MOI, numero_volee: num0 + i, score: s, reste };
  });
};
const G501 = [100, 100, 100, 100, 60, 41];        // une manche de 501 gagnée en 6 volées
const P501 = [60, 60, 60, 60, 60, 60];            // une manche perdue (il reste 141)

console.log("\n1) QUELLE PARTIE LIVE APPARTIENT À QUEL DUEL");

test("même paire (dans les deux sens), commencée avant la fin du duel : retenue", () => {
  const d = duel("d1", T0, [md(true)]);
  const s1 = session("s1", T0 - 20 * MIN);
  const s2 = session("s2", T0 - 10 * MIN, { joueur1_id: TOTO, joueur2_id: MOI });
  assert.deepEqual(sessionsDuDuel(d, [s2, s1], [d]).map((s) => s.id), ["s1", "s2"]);   // de la plus ancienne à la plus récente
});

test("écartées : partie contre un bot, autre adversaire, commencée après la fin, ou plus de 2 h avant", () => {
  const d = duel("d1", T0, [md(true)]);
  const ss = [
    session("bot1", T0 - 10 * MIN, { bot_side: 1 }),
    session("bot2", T0 - 10 * MIN, { bot_side: 2 }),
    session("zoe", T0 - 10 * MIN, { joueur2_id: ZOE }),
    session("apres", T0 + MIN),
    session("vieille", T0 - FENETRE_SESSION_MS - MIN),
    session("ok", T0 - FENETRE_SESSION_MS + MIN),
  ];
  assert.deepEqual(sessionsDuDuel(d, ss, [d]).map((s) => s.id), ["ok"]);
  assert.equal(FENETRE_SESSION_MS, 2 * H);
});

test("une partie commencée AVANT la fin du duel précédent des mêmes joueurs n'est pas à lui", () => {
  const avant = duel("d0", T0 - 40 * MIN, [md(true)]);
  const d = duel("d1", T0, [md(true)]);
  const amicalEntre = duel("am", T0 - 50 * MIN, [md(true)], { type: "amical" });   // un amical compte aussi comme frontière
  const ss = [session("s0", T0 - 60 * MIN), session("s0b", T0 - 45 * MIN), session("s1", T0 - 30 * MIN)];
  assert.deepEqual(sessionsDuDuel(d, ss, [d, avant, amicalEntre]).map((s) => s.id), ["s1"]);
  assert.deepEqual(sessionsDuDuel(avant, ss, [d, avant, amicalEntre]).map((s) => s.id), ["s0b"]);
  // un duel abandonné n'est pas une frontière (il n'a pas de manches)
  const abandonne = duel("ab", T0 - 25 * MIN, [], { statut: "abandonne" });
  assert.equal(creneauDuDuel(d, [d, abandonne]).debutMin, T0 - FENETRE_SESSION_MS);
});

test("duel_id rempli : c'est lui qui décide, même hors créneau", () => {
  const d = duel("d1", T0, [md(true)]);
  const autre = duel("d2", T0 + H, [md(true)]);
  const ss = [
    session("lien", T0 - 5 * H, { duel_id: "d1" }),     // reliée à d1, bien que vieille de 5 h
    session("ailleurs", T0 - 10 * MIN, { duel_id: "d2" }), // reliée à un AUTRE duel : jamais à d1
  ];
  assert.deepEqual(sessionsDuDuel(d, ss, [d, autre]).map((s) => s.id), ["lien"]);
  assert.deepEqual(sessionsDuDuel(autre, ss, [d, autre]).map((s) => s.id), ["ailleurs"]);
});

test("partie en ligne (son id EST celui du duel) : à ce duel seulement", () => {
  const enLigne = duel("dl", T0 - 30 * MIN, [md(true)], { type: "amical" });
  const d = duel("d1", T0, [md(true)]);
  const ss = [session("dl", T0 - 20 * MIN)];   // commencée après la fin de l'amical… mais c'est la sienne
  assert.deepEqual(sessionsDuDuel(d, ss, [d, enLigne]).map((s) => s.id), []);
  assert.deepEqual(sessionsDuDuel(enLigne, ss, [d, enLigne]).map((s) => s.id), ["dl"]);
});

console.log("\n2) SES VOLÉES → SES 10 DERNIÈRES MANCHES DRIX");

const manchesDe = (out) => decouperManches(out).map((m) => ({ id: m[0].session_id, scores: m.map((v) => v.score), g: m.at(-1).reste === 0 }));

test("chaque manche choisie retrouve ses volées, la plus récente d'abord", () => {
  const d = duel("d1", T0, [md(true), md(false)]);
  const vs = [...volees("s1", 501, G501), ...volees("s1", 501, P501, 7)];
  const out = manchesDrixDepuisVolees({ joueurId: MOI, pseudo: "Thomas", duels: [d], sessions: [session("s1", T0 - 20 * MIN)], volees: vs });
  assert.deepEqual(manchesDe(out), [
    { id: "d1#1", scores: P501, g: false },
    { id: "d1#0", scores: G501, g: true },
  ]);
});

test("partie reprise après une coupure (2 sessions) : la manche coupée est recollée", () => {
  const d = duel("d1", T0, [md(true), md(true)]);
  // 1re manche dans s1, la 2e commence dans s1 (100, 100) et se termine dans s2 après la reprise
  const vs = [
    ...volees("s1", 501, G501),
    ...volees("s1", 501, [100, 100], 7),
    ...volees("s2", 301, [100, 100, 60, 41]),
  ];
  const ss = [session("s2", T0 - 10 * MIN), session("s1", T0 - 30 * MIN)];
  const out = manchesDrixDepuisVolees({ joueurId: MOI, pseudo: "Thomas", duels: [d], sessions: ss, volees: vs });
  assert.deepEqual(manchesDe(out).map((m) => m.scores), [[100, 100, 100, 100, 60, 41], G501]);
});

test("partie lancée puis abandonnée juste avant : ses manches ne comptent pas", () => {
  const d = duel("d1", T0, [md(true)]);
  const vs = [...volees("faux", 501, [26, 45]), ...volees("vrai", 501, G501)];
  const ss = [session("faux", T0 - 40 * MIN), session("vrai", T0 - 30 * MIN)];
  const out = manchesDrixDepuisVolees({ joueurId: MOI, pseudo: "Thomas", duels: [d], sessions: ss, volees: vs });
  assert.deepEqual(manchesDe(out), [{ id: "d1#0", scores: G501, g: true }]);
});

test("ni partie contre un bot, ni amical, ni volées d'un autre joueur", () => {
  const d = duel("d1", T0, [md(true)]);
  const am = duel("am", T0 - 50 * MIN, [md(true)], { type: "amical" });
  const vs = [
    ...volees("bot", 501, [180, 180, 141]),                      // contre son bot
    ...volees("sam", 501, [140, 140, 140, 81]),                 // l'amical
    ...volees("s1", 501, G501),
    { session_id: "s1", joueur_id: TOTO, numero_volee: 1, score: 180, reste: 321 },   // Toto
  ];
  const ss = [session("bot", T0 - 20 * MIN, { bot_side: 2 }), session("sam", T0 - 60 * MIN), session("s1", T0 - 30 * MIN)];
  const out = manchesDrixDepuisVolees({ joueurId: MOI, pseudo: "Thomas", duels: [d, am], sessions: ss, volees: vs });
  assert.deepEqual(manchesDe(out), [{ id: "d1#0", scores: G501, g: true }]);
});

test("jamais plus de 10 manches, et ce sont les 10 de la moyenne affichée", () => {
  // 3 duels de 4 manches (G,P,G,P) → 12 manches ; on garde les 4 + 4 + les 2 DERNIÈRES du plus vieux
  const duels = [0, 1, 2].map((k) => duel(`d${k}`, T0 - k * H, [md(true), md(false), md(true), md(false)]));
  const ss = [0, 1, 2].map((k) => session(`s${k}`, T0 - k * H - 30 * MIN));
  const vs = [0, 1, 2].flatMap((k) => [
    ...volees(`s${k}`, 501, G501), ...volees(`s${k}`, 501, P501, 7), ...volees(`s${k}`, 501, G501, 13), ...volees(`s${k}`, 501, P501, 19),
  ]);
  const out = manchesDrixDepuisVolees({ joueurId: MOI, pseudo: "Thomas", duels, sessions: ss, volees: vs });
  assert.deepEqual(manchesDe(out).map((m) => m.id), ["d0#3", "d0#2", "d0#1", "d0#0", "d1#3", "d1#2", "d1#1", "d1#0", "d2#3", "d2#2"]);
});

test("garde-fou : gagnée dans le détail mais perdue dans les volées → manche écartée", () => {
  const d = duel("d1", T0, [md(true)]);
  const out = manchesDrixDepuisVolees({ joueurId: MOI, pseudo: "Thomas", duels: [d], sessions: [session("s1", T0 - 20 * MIN)], volees: volees("s1", 501, P501) });
  assert.deepEqual(out, []);
});

test("en 301 : manche perdue à 140 puis 180 d'entrée → deux manches, pas une", () => {
  const d = duel("d1", T0, [md(false, 50, 2), md(true, 50, 3)], { mode: "301" });
  // manche 1 : 81, 80 → reste 140 (perdue) ; manche 2 : 180 (121), 81 (40), 40 (0)
  const vs = [...volees("s1", 301, [81, 80]), ...volees("s1", 301, [180, 81, 40], 3)];
  const out = manchesDrixDepuisVolees({ joueurId: MOI, pseudo: "Thomas", duels: [d], sessions: [session("s1", T0 - 20 * MIN)], volees: vs });
  assert.deepEqual(manchesDe(out).map((m) => m.scores), [[180, 81, 40], [81, 80]]);
  // sans connaître le départ, l'ancien découpage les collait
  assert.equal(reconstruireManches(vs).length, 1);
  assert.equal(reconstruireManches(vs, 301).length, 2);
});

test("faute de frappe restée en base sur la 1re volée d'une manche : pas de fausse manche, rien ne se décale", () => {
  // Cas réel (YaYa ED, 18/09/2026) : 22 tapé (reste 479), corrigé en 21 (reste 480). Le découpage
  // y voit une manche d'UNE volée ; calée par sa position, elle prenait la place de la vraie
  // manche n°2 et décalait les plus anciennes (la manche gagnée n°1 disparaissait).
  const P2 = [60, 60, 60, 60, 60, 60];               // reste 141
  const P3 = [21, 60, 60, 60, 60, 60];               // reste 180
  const d = duel("d1", T0, [
    { ...md(false), reste_loser: 141 }, md(true), { ...md(false), reste_loser: 141 }, { ...md(false), reste_loser: 180 },
  ]);
  const vs = [
    ...volees("s1", 501, P501), ...volees("s1", 501, G501, 7), ...volees("s1", 501, P2, 13),
    ...volees("s1", 501, [22], 19),                  // la faute de frappe, jamais effacée
    ...volees("s1", 501, P3, 20),                    // la vraie 1re volée (21, reste 480) et la suite
  ];
  const out = manchesDrixDepuisVolees({ joueurId: MOI, pseudo: "Thomas", duels: [d], sessions: [session("s1", T0 - 20 * MIN)], volees: vs });
  assert.deepEqual(manchesDe(out), [
    { id: "d1#3", scores: P3, g: false },
    { id: "d1#2", scores: P2, g: false },
    { id: "d1#1", scores: G501, g: true },
    { id: "d1#0", scores: P501, g: false },
  ]);
});

test("manche introuvable dans les volées : on la saute sans décaler les autres", () => {
  // La manche n°1 manque (volées perdues) : les n°0 et n°2 gardent chacune LEURS volées.
  const d = duel("d1", T0, [{ ...md(false), reste_loser: 141 }, md(true), { ...md(false), reste_loser: 201 }]);
  const P2 = [60, 60, 60, 60, 60];                   // reste 201
  const vs = [...volees("s1", 501, P501), ...volees("s1", 501, P2, 13)];
  const out = manchesDrixDepuisVolees({ joueurId: MOI, pseudo: "Thomas", duels: [d], sessions: [session("s1", T0 - 20 * MIN)], volees: vs });
  assert.deepEqual(manchesDe(out), [
    { id: "d1#2", scores: P2, g: false },
    { id: "d1#0", scores: P501, g: false },
  ]);
});

test("ordre des volées dans une partie : par numéro, même reçues dans le désordre", () => {
  const d = duel("d1", T0, [md(true)]);
  const vs = volees("s1", 501, G501).reverse();
  const out = manchesDrixDepuisVolees({ joueurId: MOI, pseudo: "Thomas", duels: [d], sessions: [session("s1", T0 - 20 * MIN)], volees: vs });
  assert.deepEqual(out.map((v) => v.score), G501);
});

console.log("\n3) LE PROFIL DU BOT");

test("rejeu : ses manches DRIX telles quelles, au plus 10, les plus récentes", () => {
  const duels = [0, 1, 2].map((k) => duel(`d${k}`, T0 - k * H, [md(true), md(false), md(true), md(false)]));
  const ss = [0, 1, 2].map((k) => session(`s${k}`, T0 - k * H - 30 * MIN));
  const vs = [0, 1, 2].flatMap((k) => [
    ...volees(`s${k}`, 501, G501), ...volees(`s${k}`, 501, P501, 7), ...volees(`s${k}`, 501, G501, 13), ...volees(`s${k}`, 501, P501, 19),
  ]);
  const out = manchesDrixDepuisVolees({ joueurId: MOI, pseudo: "Thomas", duels, sessions: ss, volees: vs });
  const p = calculerProfilBot({ drix: 1000, duels, amiPseudo: "Thomas", amiId: MOI, volees: out });
  assert.equal(p.mode, "replay");
  assert.equal(p.manches, 10);
  assert.equal(p.volees, 60);
  assert.equal(p.manchesReelles.length, 10);
  assert.equal(p.manchesReelles.filter((m) => m.gagnee).length, 5);
  // On lui donne plus de 10 manches : il ne garde que les 10 premières (les plus récentes).
  const trop = [...out, ...volees("vieux", 501, [180, 180, 141])];
  const p2 = calculerProfilBot({ drix: 1000, duels, amiPseudo: "Thomas", amiId: MOI, volees: trop });
  assert.equal(p2.manches, 10);
  assert.ok(p2.manchesReelles.every((m) => m.volees[0] !== 180));
});

test(`moins de ${MIN_MANCHES_REJEU} manches : pas de rejeu, modèle calé sur ses 10 dernières manches`, () => {
  const duels = [duel("d1", T0, [md(true, 60, 8), md(false, 40, 8)]), duel("d0", T0 - H, [md(true, 50, 8)], { type: "amical" })];
  const out = manchesDrixDepuisVolees({
    joueurId: MOI, pseudo: "Thomas", duels, sessions: [session("s1", T0 - 20 * MIN)],
    volees: [...volees("s1", 501, [60, 60, 60, 60, 60, 60, 60, 81]), ...volees("s1", 501, [40, 40, 40, 40, 40, 40, 40, 40], 9)],
  });
  const p = calculerProfilBot({ drix: 1000, duels, amiPseudo: "Thomas", amiId: MOI, volees: out });
  assert.equal(p.source, "stats");
  assert.equal(p.manches, 2);                         // l'amical ne compte pas
  assert.equal(p.volees, 16);
  assert.equal(p.moyenne, 50);                         // (60 × 8 + 40 × 8) / 16
});

test("statsReelles : ses 10 dernières manches DRIX, et non plus ses 5 derniers duels", () => {
  // 6 duels DRIX d'une manche chacun : avant, seuls les 5 premiers comptaient
  const duels = [60, 60, 60, 60, 60, 30].map((m, k) => duel(`d${k}`, T0 - k * H, [md(true, m, 5)]));
  const s = statsReelles(duels, "Thomas", MOI);
  assert.equal(s.manches, 6);
  assert.equal(s.volees, 30);
  assert.equal(s.moyenne, 55);
  // un Cricket et un amical ne comptent pas ; plus de 10 manches : les 10 plus récentes
  const plein = [duel("c", T0 + H, null, { mode: "Cricket" }), duel("a", T0 + H / 2, [md(true, 99, 5)], { type: "amical" }),
    ...Array.from({ length: 12 }, (_, k) => duel(`x${k}`, T0 - k * H, [md(true, k < 10 ? 40 : 90, 5)]))];
  const s2 = statsReelles(plein, "Thomas", MOI);
  assert.deepEqual([s2.manches, s2.volees, Math.round(s2.moyenne)], [10, 50, 40]);
});

test("aucune manche DRIX : estimation depuis le DRIX", () => {
  const p = calculerProfilBot({ drix: 1000, duels: [duel("a", T0, [md(true)], { type: "amical" })], amiPseudo: "Thomas", amiId: MOI, volees: [] });
  assert.equal(p.source, "drix");
});

console.log(`\n${ok} tests OK`);
