// Test du départage par CONFRONTATION DIRECTE (rankGroup, 3e paramètre `matchsPoule`).
// Le match que deux equipes ont deja joue l'une contre l'autre tranche leur egalite. Depuis le
// passage a l'ordre de competition standard, ce critere arrive JUSTE APRES les victoires : il
// passe devant la difference de manches (et le barrage 701 n'est plus qu'un dernier recours).
// Voir aussi departage.test.mjs pour le triangle et les egalites a 3 equipes ou plus.
//
// Lancer :  node src/confrontation.test.mjs
import { rankGroup } from "./barrage.js";

let ok = 0, ko = 0;
const t = (nom, cond) => { if (cond) { ok++; console.log("  OK   " + nom); } else { ko++; console.log("  ECHEC " + nom); } };

// Deux équipes au bilan STRICTEMENT identique : 2V 1D, 4 manches pour / 3 contre.
const exAequo = () => ([
  { id: "A", nom: "A", victoires: 2, defaites: 1, manches_pour: 4, manches_contre: 3 },
  { id: "B", nom: "B", victoires: 2, defaites: 1, manches_pour: 4, manches_contre: 3 },
]);
const matchAB = (gagnant) => ([
  { phase: "poules", statut: "termine", joueur1_id: "A", joueur2_id: "B", gagnant_id: gagnant, score1: gagnant === "A" ? 2 : 1, score2: gagnant === "A" ? 1 : 2 },
]);

console.log("1) LE VAINQUEUR DE LA CONFRONTATION DIRECTE PASSE DEVANT");
t("A a battu B -> A est 1er", rankGroup(exAequo(), [], matchAB("A"))[0].id === "A");
t("B a battu A -> B est 1er", rankGroup(exAequo(), [], matchAB("B"))[0].id === "B");

console.log("2) LE RESULTAT NE DEPEND PLUS DE L'ORDRE DU TIRAGE AU SORT");
// Avant le correctif, inverser la liste d'entrée inversait le classement (tri stable sur retour 0).
const listeInversee = exAequo().reverse();
t("liste A,B -> A 1er", rankGroup(exAequo(), [], matchAB("A"))[0].id === "A");
t("liste B,A -> A 1er quand meme", rankGroup(listeInversee, [], matchAB("A"))[0].id === "A");
t("meme classement dans les deux sens",
  JSON.stringify(rankGroup(exAequo(), [], matchAB("B")).map(x => x.id)) ===
  JSON.stringify(rankGroup(listeInversee, [], matchAB("B")).map(x => x.id)));

console.log("3) LES VICTOIRES RESTENT AU-DESSUS DE TOUT");
const plusDeVictoires = [
  { id: "A", victoires: 1, defaites: 2, manches_pour: 2, manches_contre: 4 },
  { id: "B", victoires: 3, defaites: 0, manches_pour: 6, manches_contre: 1 },
];
// A a gagné la confrontation directe, mais B a bien plus de victoires : B doit rester devant.
t("les VICTOIRES priment sur la confrontation directe",
  rankGroup(plusDeVictoires, [], matchAB("A"))[0].id === "B");

// A a une MOINS BONNE difference de manches (+1 contre +3) mais il a battu B en poule :
// depuis le passage a la regle de competition standard, c'est le match direct qui tranche.
const meilleurGoalAverage = [
  { id: "A", victoires: 2, defaites: 1, manches_pour: 4, manches_contre: 3 },
  { id: "B", victoires: 2, defaites: 1, manches_pour: 5, manches_contre: 2 },
];
t("la CONFRONTATION DIRECTE prime sur la difference de manches",
  rankGroup(meilleurGoalAverage, [], matchAB("A"))[0].id === "A");

console.log("4) LE BARRAGE 701 RESTE PRIORITAIRE SUR LA CONFRONTATION DIRECTE");
// B a perdu le match de poule mais a gagné le barrage 701 : c'est le barrage qui doit trancher.
const barrage = [{ phase: "barrage", statut: "termine", round_bracket: 0, joueur1_id: "A", joueur2_id: "B", gagnant_id: "B", score1: 0, score2: 1 }];
t("le barrage gagne sur la confrontation directe",
  rankGroup(exAequo(), barrage, matchAB("A"))[0].id === "B");

console.log("5) CAS OU LA CONFRONTATION DIRECTE NE PEUT PAS TRANCHER");
t("aucun match entre les deux -> pas de plantage", rankGroup(exAequo(), [], []).length === 2);
t("match non termine -> ignore",
  rankGroup(exAequo(), [], [{ phase: "poules", statut: "en_attente", joueur1_id: "A", joueur2_id: "B", gagnant_id: null }]).length === 2);
t("match d'une AUTRE phase -> ignore (on ne prend que les poules)",
  rankGroup(exAequo(), [], [{ phase: "quart", statut: "termine", joueur1_id: "A", joueur2_id: "B", gagnant_id: "B" }])[0].id === "A");
t("match contre un joueur HORS du groupe -> ignore",
  rankGroup(exAequo(), [], [{ phase: "poules", statut: "termine", joueur1_id: "A", joueur2_id: "Z", gagnant_id: "Z" }]).length === 2);

console.log("6) RETROCOMPATIBILITE : sans le 3e parametre, comportement d'avant");
t("appel a 2 arguments -> ne plante pas", rankGroup(exAequo(), []).length === 2);
t("appel a 1 argument -> ne plante pas", rankGroup(exAequo()).length === 2);

console.log("7) CAS REEL A 3 EQUIPES (la consolante : qui est repeche ?)");
// C est devant. A et B sont ex aequo pour la derniere place : A a battu B en poule -> A passe.
const trois = [
  { id: "C", victoires: 3, defaites: 0, manches_pour: 6, manches_contre: 1 },
  { id: "A", victoires: 2, defaites: 1, manches_pour: 4, manches_contre: 3 },
  { id: "B", victoires: 2, defaites: 1, manches_pour: 4, manches_contre: 3 },
];
const classe = rankGroup(trois, [], matchAB("A")).map(x => x.id);
t("classement C, A, B", JSON.stringify(classe) === JSON.stringify(["C", "A", "B"]));
const classeInv = rankGroup([...trois].reverse(), [], matchAB("A")).map(x => x.id);
t("meme classement si le tirage avait mis B avant A", JSON.stringify(classeInv) === JSON.stringify(["C", "A", "B"]));

console.log("\n" + (ko === 0 ? "TOUT PASSE (" + ok + " verifications)" : ko + " ECHEC(S) sur " + (ok + ko)));
process.exit(ko === 0 ? 0 : 1);
