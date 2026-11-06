// ── CLASSEMENT COMPLET D'UN SPEEDRUN DU JOUR (cartes « Vainqueur du jour » du Comptoir) ──
// Fichier PUR (aucun import React) → testable à part : node tests/classement-speedrun.test.mjs
//
// Données : chrono_finish_scores / chrono_scoreur_scores, une ligne par tentative
// { joueur_id, joueur_pseudo, temps_ms, erreurs, statut, date_jour "YYYY-MM-DD" }.
// Une tentative est créée « abandonne » au départ (elle consomme le jeton du jour) puis passe
// « termine » avec son temps. Même tri que l'écran de classement des jeux (AppChronoFinish /
// AppChronoScoreur) : terminés par temps puis par erreurs, abandons en bas.

// « 05/11/2026 » (date affichée sur la carte) → « 2026-11-05 » (date_jour en base) ; null sinon.
export const dateJourDepuisLabel = (label) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(label || "").trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

// Même format que le grand chrono de la carte : « 24.4s », « 1m 5.3s ».
export const fmtTempsSpeedrun = (ms) => {
  const totalSec = (Number(ms) || 0) / 1000;
  if (totalSec >= 60) {
    const m = Math.floor(totalSec / 60);
    return `${m}m ${(totalSec - m * 60).toFixed(1)}s`;
  }
  return `${totalSec.toFixed(1)}s`;
};

const estTermine = (s) => (s?.statut || "termine") === "termine" && Number(s?.temps_ms) > 0;

// Une ligne par joueur (sa meilleure tentative si jamais il y en avait plusieurs), classés :
// terminés d'abord (rang 1, 2, 3…), puis abandons (rang null).
export const trierClassement = (rows) => {
  const meilleur = (a, b) => {
    const ta = estTermine(a), tb = estTermine(b);
    if (ta !== tb) return ta ? a : b;
    if (!ta) return a;
    if (a.temps_ms !== b.temps_ms) return a.temps_ms < b.temps_ms ? a : b;
    return (a.erreurs || 0) <= (b.erreurs || 0) ? a : b;
  };
  const parJoueur = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r) continue;
    const cle = r.joueur_id || `pseudo:${r.joueur_pseudo || ""}`;
    parJoueur.set(cle, parJoueur.has(cle) ? meilleur(parJoueur.get(cle), r) : r);
  }
  const lignes = [...parJoueur.values()];
  const termines = lignes.filter(estTermine)
    .sort((a, b) => (a.temps_ms - b.temps_ms) || ((a.erreurs || 0) - (b.erreurs || 0)));
  const abandons = lignes.filter((s) => !estTermine(s))
    .sort((a, b) => String(a.joueur_pseudo || "").localeCompare(String(b.joueur_pseudo || ""), "fr"));
  return [
    ...termines.map((s, i) => ({ ...s, rang: i + 1, termine: true })),
    ...abandons.map((s) => ({ ...s, rang: null, termine: false })),
  ];
};
