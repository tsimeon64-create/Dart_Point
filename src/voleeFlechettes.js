// voleeFlechettes.js — logique PURE du mode « fléchette par fléchette » du scoreur 301/501.
// Aucune dépendance, aucun React : mêmes entrées → mêmes sorties (testable en .mjs).
//
// ⚠️ RÈGLE FONDAMENTALE (source de vérité = le mode « score total ») :
// le scoreur Dart Point n'impose PAS le Double Out. Une volée est :
//   • BUST   si (reste - totalVolée) < 0  OU  === 1
//   • FINISH si (reste - totalVolée) === 0, peu importe la dernière fléchette
// Le « === 1 » ne vaut QUE sur le TOTAL de la volée, jamais sur un reste intermédiaire :
// à 21, un S20 laisse 1 — ce n'est PAS un bust, le joueur peut encore mettre un S1 et finir.
// C'est pour ça qu'on ne ferme la volée en cours de route que sur reste < 0 ou reste === 0.

export const MISS = 0;
export const BULL = 25;
export const MAX_FLECHETTES = 3;

/** Multiplicateur réellement applicable : T25 est interdit, MISS est toujours simple. */
export const multEffectif = (secteur, mult) => {
  if (secteur === MISS) return 1;
  if (secteur === BULL && mult === 3) return 1; // Triple 25 interdit
  return mult === 2 || mult === 3 ? mult : 1;
};

/** Le secteur est-il jouable avec ce multiplicateur ? (pour griser le 25 quand TRIPLE est armé) */
export const combinaisonAutorisee = (secteur, mult) => !(secteur === BULL && mult === 3);

export const pointsFlechette = (secteur, mult) => secteur * multEffectif(secteur, mult);

/** "MISS" | "20" | "D16" | "T20" | "25" | "D25" */
export const libelleFlechette = (secteur, mult) => {
  if (secteur === MISS) return "MISS";
  const m = multEffectif(secteur, mult);
  return (m === 3 ? "T" : m === 2 ? "D" : "") + secteur;
};

/** Crée une fléchette normalisée. */
export const creerFlechette = (secteur, mult) => {
  const m = multEffectif(secteur, mult);
  return { secteur, mult: m, points: secteur * m, label: libelleFlechette(secteur, mult) };
};

export const totalVolee = (flechettes) => (flechettes || []).reduce((s, f) => s + f.points, 0);

/** La dernière fléchette est-elle un double (D1..D20 ou D25) ? */
export const finitSurDouble = (flechettes) => {
  const d = (flechettes || [])[(flechettes || []).length - 1];
  return !!d && d.mult === 2;
};

/**
 * Que faire APRÈS avoir posé une fléchette ?
 *  - "bust"     → reste < 0 : irrattrapable, on ferme et on envoie (0 point compté)
 *                 (ou, en Double Out, reste === 0 sans double final : manche NON terminée)
 *  - "finish"   → reste === 0 : manche gagnée, on ferme et on envoie
 *  - "valider"  → 3 fléchettes posées sans bust ni finish : on ferme et on envoie
 *  - "continue" → il reste des fléchettes à lancer (Y COMPRIS si reste === 1)
 *
 * `doubleOut` (défaut false = comportement historique) : quand il est actif, on ne peut
 * terminer que sur un double ; tomber à 0 avec un simple ou un triple est un BUST.
 */
export const verdictApresFlechette = (resteAvant, flechettes, doubleOut = false) => {
  const reste = resteAvant - totalVolee(flechettes);
  if (reste < 0) return "bust";
  if (reste === 0) return doubleOut && !finitSurDouble(flechettes) ? "bust" : "finish";
  if ((flechettes || []).length >= MAX_FLECHETTES) return "valider";
  return "continue";
};

/** La volée est-elle close (plus aucune fléchette saisissable) ? */
export const voleeClose = (resteAvant, flechettes, doubleOut = false) =>
  verdictApresFlechette(resteAvant, flechettes, doubleOut) !== "continue";

/**
 * Double sur lequel la manche s'est terminée, pour la stat « finish favori ».
 * Clés attendues par la popup existante : "1".."20" et "B" pour le double-bull (D25).
 * Renvoie null si la dernière fléchette n'est pas un double (autorisé : pas de Double Out).
 */
export const doubleDuFinish = (flechettes) => {
  const d = (flechettes || [])[(flechettes || []).length - 1];
  if (!d || d.mult !== 2) return null;
  if (d.secteur === BULL) return "B";
  if (d.secteur >= 1 && d.secteur <= 20) return String(d.secteur);
  return null;
};

// ── Quels doubles pouvaient VRAIMENT terminer cette volée ? ───────────────────
// Signalé par un testeur : il finissait à 3 points, l'appli lui a laissé valider
// « D2 » (= 4 points, impossible) au lieu de « D1 ». Seul le double réellement
// jouable doit être proposé.
// La dernière fléchette est forcément un double (2×D, ou 50 au Bull) ; les autres
// fléchettes de la volée doivent pouvoir faire exactement le reste.
const SCORES_1_FLECHETTE = (() => {
  const s = new Set([0, 25, 50]);                       // raté, simple bull, double bull
  for (let i = 1; i <= 20; i++) { s.add(i); s.add(2*i); s.add(3*i); }
  return s;
})();
const SCORES_2_FLECHETTES = (() => {
  const s = new Set();
  for (const a of SCORES_1_FLECHETTE) for (const b of SCORES_1_FLECHETTE) s.add(a + b);
  return s;
})();

// val = points de la volée qui a fini · nb = nombre de fléchettes utilisées (1 à 3).
// Renvoie l'ensemble des doubles possibles, en clés d'affichage : "1".."20" et "B".
export const doublesPossiblesFinish = (val, nb) => {
  const ok = new Set();
  const candidats = [...Array.from({ length: 20 }, (_, i) => [String(i + 1), 2 * (i + 1)]), ["B", 50]];
  for (const [cle, points] of candidats) {
    const reste = val - points;
    if (reste < 0) continue;
    if (nb <= 1) { if (reste === 0) ok.add(cle); }
    else if (nb === 2) { if (SCORES_1_FLECHETTE.has(reste)) ok.add(cle); }
    else if (SCORES_2_FLECHETTES.has(reste)) ok.add(cle);
  }
  // On renvoie l'ensemble RÉEL, quitte à ce qu'il soit vide (volée incohérente :
  // 1 point, ou un nombre impair en une seule fléchette…). C'est l'affichage qui
  // décide alors de tout réactiver plutôt que de bloquer la partie.
  // ⚠️ Ne pas « sécuriser » ici en renvoyant les 21 candidats : un vrai finish peut
  // légitimement autoriser les 21 doubles, les deux cas seraient indiscernables.
  return ok;
};
