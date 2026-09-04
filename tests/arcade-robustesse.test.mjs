// Test de robustesse : on bombarde le moteur de volees et d effets au hasard
// et on verifie qu aucune regle intangible ne casse jamais.
import {
  resoudreVolee, cadeauDeLaVolee, tirerCadeau, POUVOIRS, EST_MALUS,
  envoyerMalus, nouveauJoueur, pourquoiImpossible, retraitAutorise,
} from "../src/arcadePouvoirs.js";

const rnd = (n) => Math.floor(Math.random() * n);
const pick = (a) => a[rnd(a.length)];

const flechette = () => {
  const r = rnd(24);
  if (r === 0) return { s: 0, m: 1 };                 // rate
  if (r === 1) return { s: 25, m: 1 };                // bull simple
  if (r === 2) return { s: 25, m: 2 };                // double bull
  return { s: 1 + rnd(20), m: 1 + rnd(3) };
};

const EFFETS_POSSIBLES = [
  { id: "turbo2" }, { id: "turbo3" }, { id: "supernova" }, { id: "meilleureX2" },
  { id: "finishFacile" }, { id: "finishRoyal" }, { id: "secondeChance" }, { id: "tourBonus" },
  { id: "gel" }, { id: "uneFlechette" }, { id: "frein" }, { id: "bombe40" },
  { id: "voleeAnnulee" }, { id: "brouillard" },
];

let n = 0, soucis = [];
const noter = (m, d) => { if (soucis.length < 8) soucis.push(m + " :: " + JSON.stringify(d)); };

for (let i = 0; i < 200000; i++) {
  const scoreAvant = 2 + rnd(1000);
  const doubleOut = Math.random() < 0.7;
  const nbF = rnd(4);                                   // 0 a 3 flechettes
  const darts = Array.from({ length: nbF }, flechette);

  const effets = [];
  const combien = rnd(4);
  for (let k = 0; k < combien; k++) {
    const e = { ...pick(EFFETS_POSSIBLES) };
    if (e.id === "jackpot") e.x = Math.random() < 0.5 ? 1.5 : 2;
    effets.push(e);
  }
  if (Math.random() < 0.15) effets.push({ id: "verrouillage", num: 15 + rnd(6) });
  if (Math.random() < 0.15) effets.push({ id: "jackpot", x: Math.random() < 0.5 ? 1.5 : 2 });

  let r;
  try { r = resoudreVolee(scoreAvant, darts, doubleOut, effets); }
  catch (e) { noter("EXCEPTION " + e.message, { scoreAvant, darts, effets, doubleOut }); continue; }
  n++;

  const ctx = { scoreAvant, darts, effets, doubleOut, r };
  if (!Number.isInteger(r.score)) noter("score non entier", ctx);
  if (r.score < 0) noter("score negatif", ctx);
  if (r.score > scoreAvant) noter("le score a AUGMENTE", ctx);
  if (r.gagne && r.score !== 0) noter("gagne sans etre a zero", ctx);
  if (r.gagne && r.bust) noter("gagne ET bust", ctx);
  if (r.bust && r.score !== scoreAvant) noter("bust sans retour au score de depart", ctx);
  if (r.fait < 0) noter("points negatifs", ctx);
  if (!r.bust && r.score !== scoreAvant - r.fait) noter("score incoherent avec les points faits", ctx);
  // Rester a 1 en double out est desormais TOUJOURS un bust : c est la seule
  // garantie qu un joueur ne peut pas s enfermer dans une partie impossible.
  if (r.score === 1 && doubleOut && !r.bust) noter("laisse a 1 en double out", ctx);
  if (r.utilisees > r.maxF) noter("plus de flechettes que permis", ctx);
  if (r.utilisees > darts.length) noter("plus de flechettes que lancees", ctx);
  // Une volee annulee ne doit JAMAIS faire gagner ni bouger le score.
  const annulee = effets.some((e) => e.id === "voleeAnnulee") && !effets.some((e) => e.id === "supernova");
  if (annulee && (r.gagne || r.score !== scoreAvant)) noter("volee annulee sans effet", ctx);
  // Finish : si on gagne en double out sans pouvoir de finish, la derniere
  // flechette comptee doit etre un double.
  if (r.gagne && doubleOut && !r.finishLibre) {
    const d = darts[r.utilisees - 1];
    if (d.m !== 2) noter("finish sur autre chose qu un double", ctx);
  }
  // Le cadeau ne doit jamais depasser le nombre de flechettes lancees.
  const num = 15 + rnd(6);
  const c = cadeauDeLaVolee(darts, num, r.utilisees);
  if (c < 0 || c > 3) noter("cadeau hors bornes", { c, num, darts });
  if (c > 0) {
    const touche = darts.slice(0, r.utilisees).some((d) => d.s === num && d.m === c);
    if (!touche) noter("cadeau attribue sans flechette correspondante", { c, num, darts, u: r.utilisees });
  }
}

// Tirages : jamais null, jamais un pouvoir interdit par le nombre de joueurs.
let tirages = 0;
for (let i = 0; i < 40000; i++) {
  const nbJoueurs = 2 + rnd(7);
  const rang = pick(["leader", "milieu", "dernier"]);
  for (const m of [1, 2, 3]) {
    const t = tirerCadeau(m, { nbJoueurs, rang });
    tirages++;
    if (!t || !POUVOIRS[t.id]) { noter("tirage vide", { m, nbJoueurs, rang, t }); break; }
    const min = POUVOIRS[t.id].min || 0;
    if (nbJoueurs < min) noter("pouvoir interdit tire", { t, nbJoueurs });
  }
}

// Protections : envoyerMalus ne doit jamais muter l original ni perdre un joueur.
for (let i = 0; i < 20000; i++) {
  const nb = 2 + rnd(7);
  const js = Array.from({ length: nb }, (_, k) => {
    const p = nouveauJoueur("J" + k, 100 + rnd(400));
    if (Math.random() < 0.3) p.bouclier = true;
    if (Math.random() < 0.3) p.renvoi = true;
    if (Math.random() < 0.2) p.effets = [{ id: "supernova" }];
    return p;
  });
  const de = rnd(nb);
  let vers = rnd(nb); if (vers === de) vers = (vers + 1) % nb;
  const id = pick(Object.keys(EST_MALUS));
  const avant = JSON.stringify(js);
  let res;
  try { res = envoyerMalus(js, de, vers, { id }); }
  catch (e) { noter("EXCEPTION envoyerMalus " + e.message, { de, vers, id }); continue; }
  if (JSON.stringify(js) !== avant) noter("envoyerMalus a MUTE l original", { de, vers, id });
  if (res.joueurs.length !== nb) noter("un joueur a disparu", { de, vers, id });
  for (const p of res.joueurs) {
    if (!Array.isArray(p.effets)) noter("effets casse", p);
    if (p.effets.filter((e) => EST_MALUS[e.id]).length > 3) noter("trop de malus empiles", p);
  }
}

// Point 40 : retraitAutorise ne laisse jamais gagner.
for (let s = 1; s <= 200; s++) {
  for (const dOut of [true, false]) {
    if (retraitAutorise(s, 20, dOut)) {
      const apres = s - 20;
      if (apres <= 0 || (apres === 1 && dOut)) noter("retrait autorise a tort", { s, dOut });
    }
  }
}

// Anti-abus : jamais deux effets du meme groupe acceptes de suite.
for (let i = 0; i < 20000; i++) {
  const cible = nouveauJoueur("X", 300);
  const ids = Object.keys(POUVOIRS).filter((k) => POUVOIRS[k].groupe || EST_MALUS[k] || POUVOIRS[k].soi);
  for (let k = 0; k < 5; k++) {
    const id = pick(ids);
    if (!pourquoiImpossible(cible, id)) cible.effets.push({ id });
  }
  const groupes = cible.effets.map((e) => POUVOIRS[e.id].groupe).filter(Boolean);
  if (new Set(groupes).size !== groupes.length) noter("deux effets du meme groupe", cible.effets);
  if (cible.effets.filter((e) => EST_MALUS[e.id]).length > 2) noter("plus de 2 malus", cible.effets);
  const fin = cible.effets.filter((e) => ["finishFacile", "finishRoyal", "supernova"].includes(e.id));
  if (fin.length > 1) noter("deux pouvoirs de finish en meme temps", cible.effets);
}

console.log(`Volees testees      : ${n.toLocaleString("fr-FR")}`);
console.log(`Tirages testes      : ${tirages.toLocaleString("fr-FR")}`);
console.log(`Envois de malus     : 20 000`);
console.log(`Empilages anti-abus : 20 000`);
console.log(soucis.length ? "\nPROBLEMES :\n" + soucis.join("\n") : "\nAucun probleme.");
process.exit(soucis.length ? 1 : 0);
