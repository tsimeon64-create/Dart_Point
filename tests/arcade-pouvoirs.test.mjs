// Tests du moteur de pouvoirs (fonctions pures, aucun React).
import {
  resoudreVolee, cadeauDeLaVolee, tirerPouvoir, tirerCadeau, envoyerMalus,
  pourquoiImpossible, retraitAutorise, nouveauJoueur, POUVOIRS, titresDeFin,
  rangDuJoueur,
} from "../src/arcadePouvoirs.js";

let ok = 0, ko = 0;
const t = (nom, reel, attendu) => {
  const a = JSON.stringify(reel), b = JSON.stringify(attendu);
  if (a === b) { ok++; console.log(`  OK   ${nom}`); }
  else { ko++; console.log(`  ECHEC ${nom}\n        attendu ${b}\n        obtenu  ${a}`); }
};

const S = (n) => ({ s: n, m: 1 });
const D = (n) => ({ s: n, m: 2 });
const T = (n) => ({ s: n, m: 3 });
const r = (score, darts, dOut, eff) => {
  const x = resoudreVolee(score, darts, dOut, eff);
  return { score: x.score, bust: x.bust, gagne: x.gagne, fait: x.fait };
};

console.log("\n== X01 de base (non-regression etape 1) ==");
t("T20 x3", r(501, [T(20), T(20), T(20)], true), { score: 321, bust: false, gagne: false, fait: 180 });
t("bust sous zero", r(40, [T(20)], true), { score: 40, bust: true, gagne: false, fait: 0 });
t("reste a 1 = bust en double out", r(21, [S(20)], true), { score: 21, bust: true, gagne: false, fait: 0 });
t("reste a 1 accepte en simple out", r(21, [S(20)], false), { score: 1, bust: false, gagne: false, fait: 20 });
t("finish D20 en double out", r(40, [D(20)], true), { score: 0, bust: true === false, gagne: true, fait: 40 });
t("finish simple refuse en double out", r(20, [S(20)], true), { score: 20, bust: true, gagne: false, fait: 0 });
t("finish simple accepte en simple out", r(20, [S(20)], false), { score: 0, bust: false, gagne: true, fait: 20 });
t("bull simple n est pas un double", r(25, [{ s: 25, m: 1 }], true), { score: 25, bust: true, gagne: false, fait: 0 });
t("double bull termine", r(50, [{ s: 25, m: 2 }], true), { score: 0, bust: false, gagne: true, fait: 50 });
t("bust annule TOUTE la volee", r(100, [T(20), T(20)], true), { score: 100, bust: true, gagne: false, fait: 0 });

console.log("\n== Multiplicateurs positifs ==");
t("turbo2 double la volee", r(501, [T(20)], true, [{ id: "turbo2" }]), { score: 381, bust: false, gagne: false, fait: 120 });
t("turbo3 triple la volee", r(501, [T(20)], true, [{ id: "turbo3" }]), { score: 321, bust: false, gagne: false, fait: 180 });
t("jackpot x1.5", r(501, [S(20)], true, [{ id: "jackpot", x: 1.5 }]), { score: 471, bust: false, gagne: false, fait: 30 });
t("turbo2+turbo3 ne se cumulent pas (x3 gagne)",
  r(501, [S(10)], true, [{ id: "turbo2" }, { id: "turbo3" }]), { score: 471, bust: false, gagne: false, fait: 30 });
t("meilleure x2 double la plus forte seulement",
  r(501, [S(20), S(20), T(20)], true, [{ id: "meilleureX2" }]), { score: 341, bust: false, gagne: false, fait: 160 });
t("turbo peut faire bust", r(100, [T(20)], true, [{ id: "turbo2" }]), { score: 100, bust: true, gagne: false, fait: 0 });
t("turbo2 + finish D20 = 80 retires", r(80, [D(20)], true, [{ id: "turbo2" }]), { score: 0, bust: false, gagne: true, fait: 80 });

console.log("\n== Malus adverses ==");
t("frein divise par deux", r(501, [S(20), S(20), S(40 - 40 + 20)], true, [{ id: "frein" }]),
  { score: 471, bust: false, gagne: false, fait: 30 });
t("volee annulee : rien ne bouge", r(501, [T(20), T(20), T(20)], true, [{ id: "voleeAnnulee" }]),
  { score: 501, bust: false, gagne: false, fait: 0 });
t("volee annulee empeche la victoire", r(40, [D(20)], true, [{ id: "voleeAnnulee" }]),
  { score: 40, bust: false, gagne: false, fait: 0 });
t("bombe40 : moins de 40 -> zero", r(501, [S(20), S(15)], true, [{ id: "bombe40" }]),
  { score: 501, bust: false, gagne: false, fait: 0 });
t("bombe40 : 40 ou plus -> normal", r(501, [S(20), S(20)], true, [{ id: "bombe40" }]),
  { score: 461, bust: false, gagne: false, fait: 40 });
t("gel : seulement 2 flechettes comptees", r(501, [S(20), S(20), S(20)], true, [{ id: "gel" }]),
  { score: 461, bust: false, gagne: false, fait: 40 });
t("une seule flechette", r(501, [S(20), S(20), S(20)], true, [{ id: "uneFlechette" }]),
  { score: 481, bust: false, gagne: false, fait: 20 });
t("verrouillage du 20 : les 20 valent zero",
  r(501, [T(20), S(19), S(20)], true, [{ id: "verrouillage", num: 20 }]),
  { score: 482, bust: false, gagne: false, fait: 19 });

console.log("\n== Finish assiste ==");
t("finish facile : simple accepte", r(20, [S(20)], true, [{ id: "finishFacile" }]), { score: 0, bust: false, gagne: true, fait: 20 });
// REGLE CHANGEE : rester a 1 en double out reste un BUST meme avec finish facile,
// sinon le joueur s enferme quand le pouvoir expire (il ne peut plus jamais finir).
t("finish facile ne permet PAS de rester a 1", r(21, [S(20)], true, [{ id: "finishFacile" }]),
  { score: 21, bust: true, gagne: false, fait: 0 });
t("finish royal ne permet PAS non plus de rester a 1", r(21, [S(20)], true, [{ id: "finishRoyal" }]),
  { score: 21, bust: true, gagne: false, fait: 0 });
t("supernova ne permet PAS non plus de rester a 1", r(21, [S(20)], true, [{ id: "supernova" }]),
  { score: 21, bust: true, gagne: false, fait: 0 });
t("mais en simple out rester a 1 est permis", r(21, [S(20)], false, [{ id: "finishFacile" }]),
  { score: 1, bust: false, gagne: false, fait: 20 });
t("finish facile finit toujours sur un simple", r(1, [S(1)], true, [{ id: "finishFacile" }]),
  { score: 0, bust: false, gagne: true, fait: 1 });
t("finish royal : triple accepte", r(60, [T(20)], true, [{ id: "finishRoyal" }]), { score: 0, bust: false, gagne: true, fait: 60 });

console.log("\n== Supernova ==");
t("supernova : x2 + immunise contre volee annulee",
  r(501, [T(20)], true, [{ id: "supernova" }, { id: "voleeAnnulee" }]),
  { score: 381, bust: false, gagne: false, fait: 120 });
t("supernova : immunise contre le gel (3 flechettes)",
  r(501, [S(1), S(1), S(1)], true, [{ id: "supernova" }, { id: "gel" }]),
  { score: 495, bust: false, gagne: false, fait: 6 });
t("supernova : finish sur simple", r(40, [S(20), S(20)], true, [{ id: "supernova" }]),
  { score: 0, bust: false, gagne: true, fait: 40 });

console.log("\n== Cadeaux ==");
t("simple sur le numero = petit", cadeauDeLaVolee([S(18), S(1), S(1)], 18, 3), 1);
t("double = super", cadeauDeLaVolee([S(1), D(18), S(1)], 18, 3), 2);
t("triple = mega", cadeauDeLaVolee([T(18), S(1), S(1)], 18, 3), 3);
t("on garde le MEILLEUR (point 22)", cadeauDeLaVolee([S(18), T(18), S(20)], 18, 3), 3);
t("rate", cadeauDeLaVolee([S(1), S(2), S(3)], 18, 3), 0);
t("flechette non jouee (bust) ne compte pas", cadeauDeLaVolee([S(1), T(18), S(18)], 18, 1), 0);
t("verrouillage n empeche PAS de gagner le cadeau", cadeauDeLaVolee([T(18)], 18, 1), 3);

console.log("\n== Tirage et equilibrage ==");
const idsPetits = Object.keys(POUVOIRS).filter((k) => POUVOIRS[k].rarete === "petit");
t("un tirage petit sort bien un petit", idsPetits.includes(tirerPouvoir("petit", { alea: () => 0.5 })), true);
t("bombe generale interdite a 2 joueurs",
  tirerPouvoir("legendaire", { nbJoueurs: 2, alea: () => 0.999 }) !== "bombeGenerale", true);
{
  let vuGenerale = false;
  for (let i = 0; i < 400; i++) if (tirerPouvoir("legendaire", { nbJoueurs: 4 }) === "bombeGenerale") vuGenerale = true;
  t("bombe generale possible a 4 joueurs", vuGenerale, true);
}
{
  // Le meneur doit recevoir MOINS d'attaques que le dernier.
  let attLeader = 0, attDernier = 0;
  for (let i = 0; i < 4000; i++) {
    const a = tirerPouvoir("mega", { nbJoueurs: 4, rang: "leader" });
    const d = tirerPouvoir("mega", { nbJoueurs: 4, rang: "dernier" });
    if ((POUVOIRS[a].tags || []).includes("attaque")) attLeader++;
    if ((POUVOIRS[d].tags || []).includes("attaque")) attDernier++;
  }
  console.log(`       (attaques : meneur ${attLeader} / dernier ${attDernier} sur 4000)`);
  t("le meneur recoit moins d attaques que le dernier", attLeader < attDernier, true);
}
t("tirerCadeau mult 1 -> petit", tirerCadeau(1, { alea: () => 0.5 }).rarete, "petit");
t("tirerCadeau mult 3 sans chance -> mega", tirerCadeau(3, { alea: () => 0.5 }).rarete, "mega");
t("tirerCadeau mult 3 avec chance -> legendaire", tirerCadeau(3, { nbJoueurs: 4, alea: () => 0.001 }).rarete, "legendaire");
t("tirerCadeau mult 0 -> rien", tirerCadeau(0, { alea: () => 0.5 }), null);

console.log("\n== Rang ==");
{
  const js = [nouveauJoueur("A", 100), nouveauJoueur("B", 300), nouveauJoueur("C", 200)];
  t("le plus bas score est le meneur", rangDuJoueur(js, 0), "leader");
  t("le plus haut est le dernier", rangDuJoueur(js, 1), "dernier");
  t("entre les deux", rangDuJoueur(js, 2), "milieu");
  const eg = [nouveauJoueur("A", 100), nouveauJoueur("B", 100)];
  t("egalite parfaite = milieu", rangDuJoueur(eg, 0), "milieu");
}

console.log("\n== Protections ==");
{
  let js = [nouveauJoueur("A", 300), nouveauJoueur("B", 300)];
  js[1].bouclier = true;
  const res = envoyerMalus(js, 0, 1, { id: "gel" });
  t("bouclier bloque", res.joueurs[1].effets.length, 0);
  t("bouclier consomme", res.joueurs[1].bouclier, false);
  t("message de blocage", /BLOQU/.test(res.texte || ""), true);
}
{
  let js = [nouveauJoueur("A", 300), nouveauJoueur("B", 300)];
  js[1].renvoi = true;
  const res = envoyerMalus(js, 0, 1, { id: "gel" });
  t("renvoi : l attaquant prend le coup", res.joueurs[0].effets.map((e) => e.id), ["gel"]);
  t("renvoi : la cible reste propre", res.joueurs[1].effets.length, 0);
  t("renvoi consomme", res.joueurs[1].renvoi, false);
}
{
  let js = [nouveauJoueur("A", 300), nouveauJoueur("B", 300)];
  js[1].renvoi = true; js[0].bouclier = true;
  const res = envoyerMalus(js, 0, 1, { id: "gel" });
  t("renvoi PUIS bouclier de l attaquant", res.joueurs[0].effets.length, 0);
  t("les deux phrases sont dites", /renvoie/.test(res.texte) && /BLOQU/.test(res.texte), true);
}
{
  let js = [nouveauJoueur("A", 300), nouveauJoueur("B", 300)];
  js[1].effets = [{ id: "supernova" }];
  const res = envoyerMalus(js, 0, 1, { id: "gel" });
  t("supernova est intouchable", res.joueurs[1].effets.map((e) => e.id), ["supernova"]);
}
{
  let js = [nouveauJoueur("A", 300), nouveauJoueur("B", 300)];
  const res = envoyerMalus(js, 0, 1, { id: "gel" });
  t("malus recu compte dans les stats", res.joueurs[1].stats.malusRecus, 1);
  t("aucune mutation de l original", js[1].effets.length, 0);
}

console.log("\n== Anti-abus (point 37) ==");
{
  const c = { ...nouveauJoueur("B", 300), effets: [{ id: "gel" }] };
  t("pas deux restrictions", !!pourquoiImpossible(c, "uneFlechette"), true);
  t("pas deux fois le meme", !!pourquoiImpossible(c, "gel"), true);
  t("mais une annulation reste possible", pourquoiImpossible(c, "frein"), null);
}
{
  const c = { ...nouveauJoueur("B", 300), effets: [{ id: "gel" }, { id: "frein" }] };
  t("deux mauvais coups maximum", !!pourquoiImpossible(c, "brouillard"), true);
}
{
  const c = { ...nouveauJoueur("A", 300), effets: [{ id: "turbo2" }] };
  t("pas deux multiplicateurs", !!pourquoiImpossible(c, "turbo3"), true);
  t("pas turbo + supernova", !!pourquoiImpossible(c, "supernova"), true);
}
{
  const c = { ...nouveauJoueur("A", 300), effets: [{ id: "finishFacile" }] };
  t("pas deux finish", !!pourquoiImpossible(c, "finishRoyal"), true);
}

console.log("\n== Interdiction de gagner avec un pouvoir (point 40) ==");
t("20 - 20 = 0 interdit", retraitAutorise(20, 20, true), false);
t("21 - 20 = 1 interdit en double out", retraitAutorise(21, 20, true), false);
t("21 - 20 = 1 autorise en simple out", retraitAutorise(21, 20, false), true);
t("22 - 20 = 2 autorise", retraitAutorise(22, 20, true), true);
t("10 - 20 = negatif interdit", retraitAutorise(10, 20, true), false);

console.log("\n== Titres de fin ==");
{
  const a = nouveauJoueur("Thomas", 0); a.stats.cadeauxReussis = 5; a.stats.cadeauxTentes = 6; a.retardMax = 120;
  const b = nouveauJoueur("Zaza", 80);  b.stats.malusEnvoyes = 4; b.stats.cadeauxTentes = 8; b.stats.cadeauxReussis = 2;
  const titres = titresDeFin([a, b]);
  const par = Object.fromEntries(titres.map((x) => [x.titre, x.nom]));
  t("roi des cadeaux", par["ROI DES CADEAUX"], "Thomas");
  t("saboteur", par["SABOTEUR"], "Zaza");
  t("chat noir", par["CHAT NOIR"], "Zaza");
  t("miracule", par["MIRACULE"] || par["MIRACULÉ"], "Thomas");
  t("sniper", par["SNIPER"], "Thomas");
}

console.log(`\n===== ${ok} OK · ${ko} ECHEC =====`);
process.exit(ko ? 1 : 0);
