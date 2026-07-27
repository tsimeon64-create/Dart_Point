// Logique pure de CLASSEMENT de poule et de BARRAGES 701 (extraite d'AppTournoiPotes.jsx
// pour être testable — voir barrage.test.mjs). Aucune dépendance : fonctions pures.
//
// Règle de classement : 1) VICTOIRES  2) moins de DÉFAITES  3) goal average manches  4) barrages 701.
// Un barrage a des TOURS (round_bracket 0,1,2…) : le tour 0 est un round-robin entre les ex æquo ;
// s'il ne tranche pas complètement, seules les équipes encore à égalité SUR LA PLACE qualificative
// rejouent un tour suivant, et ainsi de suite jusqu'à départage.

// Stat d'un joueur sur les barrages d'un TOUR donné (round_bracket=r), contre les joueurs de son groupe.
export const statBarrageTour = (id, r, bg) => {
  let vic = 0, diff = 0;
  bg.forEach(m => {
    if ((m.round_bracket || 0) !== r) return;
    if (m.joueur1_id !== id && m.joueur2_id !== id) return;
    const s1 = m.score1 || 0, s2 = m.score2 || 0;
    if (m.gagnant_id === id) vic++;
    diff += (m.joueur1_id === id) ? (s1 - s2) : (s2 - s1);
  });
  // Clé comparable : les VICTOIRES priment (x10000).
  // ATTENTION : aujourd'hui `diff` ne départage RIEN. Un barrage est créé avec manches_max:1
  // (creerBarrages, AppTournoiPotes.jsx), donc le score d'un 701 vaut toujours 1-0 : sur un tour
  // COMPLET, diff = 2*victoires - (nb de matchs du tour), c'est-à-dire une redondance de `vic`.
  // On conserve le terme au cas où un barrage se jouerait un jour en plusieurs manches — mais ce
  // n'est PAS souhaité : passer les barrages en 2 manches gagnantes doublerait le temps de 701 au
  // club. (Et surtout : ne pas ranger les points 701 restants dans score1/score2, ils sont
  // additionnés au récap "manches" affiché de la poule, AppTournoiPotes.jsx.)
  return vic * 10000 + diff;
};

// A-t-il joué au moins un match de barrage à ce tour ?
const aJoueTour = (id, r, bg) => bg.some(m => (m.round_bracket || 0) === r && (m.joueur1_id === id || m.joueur2_id === id));

// CONFRONTATION DIRECTE : qui a gagné le match de poule entre a et b ?
// Renvoie -1 si a l'a emporté (a devant), 1 si b l'a emporté, 0 si pas de match trouvé (ou nul).
// C'est le dernier recours AVANT de laisser l'ordre du tirage au sort trancher : deux équipes
// strictement à égalité (mêmes victoires, défaites, goal average, et aucun barrage) étaient
// jusqu'ici départagées par l'index du mélange Fisher-Yates — donc au hasard, et sans que
// personne puisse l'expliquer. La confrontation directe est gratuite (le match a déjà été joué)
// et c'est la règle standard en compétition.
const confrontationDirecte = (a, b, matchsPoule) => {
  const m = matchsPoule.find(x =>
    x.statut === "termine" && x.gagnant_id &&
    ((x.joueur1_id === a.id && x.joueur2_id === b.id) || (x.joueur1_id === b.id && x.joueur2_id === a.id)));
  if (!m) return 0;
  if (m.gagnant_id === a.id) return -1;
  if (m.gagnant_id === b.id) return 1;
  return 0;
};

// Classe les joueurs d'un groupe. Départage : victoires → défaites → goal average → barrages →
// confrontation directe.
// Pour les barrages, on compare du tour le plus RÉCENT au plus ancien, MAIS on saute les tours
// qu'un des deux joueurs n'a pas joués (ex. une équipe déjà qualifiée qui ne rejoue pas les tours
// suivants ne doit pas être pénalisée d'un « 0 » qui la ferait passer derrière). ← correctif barrages imbriqués.
// `matchsPoule` (optionnel) : les matchs de poule, pour la confrontation directe. Sans lui, le
// comportement est exactement celui d'avant.
export const rankGroup = (joueurs, barrages = [], matchsPoule = []) => {
  const idsGroupe = new Set(joueurs.map(j => j.id));
  const bg = barrages.filter(m => m.statut === "termine" && m.gagnant_id && idsGroupe.has(m.joueur1_id) && idsGroupe.has(m.joueur2_id));
  const mp = matchsPoule.filter(m => m.phase === "poules" && idsGroupe.has(m.joueur1_id) && idsGroupe.has(m.joueur2_id));
  const maxRound = bg.reduce((mx, m) => Math.max(mx, m.round_bracket || 0), 0);
  return [...joueurs].sort((a, b) => {
    if (b.victoires !== a.victoires) return b.victoires - a.victoires; // 1) VICTOIRES d'abord
    if (a.defaites !== b.defaites) return a.defaites - b.defaites;     // 2) puis le MOINS de défaites
    const da = a.manches_pour - a.manches_contre, db = b.manches_pour - b.manches_contre;
    if (db !== da) return db - da;                                     // 3) goal average manches
    for (let r = maxRound; r >= 0; r--) {                              // 4) barrages, du tour le + récent au + ancien
      if (!aJoueTour(a.id, r, bg) || !aJoueTour(b.id, r, bg)) continue; // saute les tours non joués par l'un des deux
      const ka = statBarrageTour(a.id, r, bg), kb = statBarrageTour(b.id, r, bg);
      if (kb !== ka) return kb - ka;
    }
    return confrontationDirecte(a, b, mp);                             // 5) confrontation directe (plutôt que le hasard)
  });
};

// Égalité PARFAITE de POULE (mêmes victoires, défaites ET goal average) → départage nécessaire.
export const memeNiveau = (a, b) =>
  a.victoires === b.victoires && a.defaites === b.defaites && (a.manches_pour - a.manches_contre) === (b.manches_pour - b.manches_contre);

// Départage d'UN groupe d'ex æquo de poule (`membres`) qui se disputent `spots` places qualificatives
// (1 ≤ spots < membres.length). `bgg` = barrages déjà TERMINÉS entre ces membres.
// Reconstruit, tour par tour, qui doit encore jouer et renvoie les matchs À CRÉER {a,b,round}.
// [] = départage terminé (les `spots` premiers sont connus de façon certaine).
const specsForGroup = (membres, spots, bgg) => {
  let contested = membres.slice();
  let sp = spots;
  let round = 0;
  let guard = 0;
  while (guard++ < 30) {
    // Round-robin entre les équipes encore en lice à ce tour.
    const pairs = [];
    for (let x = 0; x < contested.length; x++) for (let y = x + 1; y < contested.length; y++) pairs.push([contested[x], contested[y]]);
    const joue = (a, b) => bgg.some(m => (m.round_bracket || 0) === round && m.statut === "termine" &&
      ((m.joueur1_id === a && m.joueur2_id === b) || (m.joueur1_id === b && m.joueur2_id === a)));
    const manquants = pairs.filter(([a, b]) => !joue(a.id, b.id));
    if (manquants.length > 0) return manquants.map(([a, b]) => ({ a, b, round })); // finir ce tour d'abord

    // Tour complet → on classe par la clé du tour et on remplit `sp` places en descendant.
    const keyed = contested.map(c => ({ c, k: statBarrageTour(c.id, round, bgg) })).sort((p, q) => q.k - p.k);
    let remaining = sp, i = 0, nextContested = null;
    while (i < keyed.length && remaining > 0) {
      const lvl = keyed[i].k;
      const tier = keyed.filter(p => p.k === lvl).map(p => p.c);
      if (tier.length <= remaining) { remaining -= tier.length; i += tier.length; } // tout ce palier qualifie
      else { nextContested = tier; break; }                                          // palier à cheval sur la place → rejoue
    }
    if (!nextContested) return []; // départage terminé
    contested = nextContested; sp = remaining; round++;
  }
  return []; // garde-fou (ne devrait jamais arriver)
};

// Renvoie tous les matchs de barrage À CRÉER pour départager les égalités de poule sur les places
// qualificatives. Chaque spec : {a, b, round} (a, b = objets équipe ; round = tour de barrage).
export const egalitesADepartager = (joueursGroupe, barrages = [], nbQual = 2) => {
  const specs = [];
  const idsAll = new Set(joueursGroupe.map(j => j.id));
  const bgAll = barrages.filter(m => m.statut === "termine" && idsAll.has(m.joueur1_id) && idsAll.has(m.joueur2_id));
  const ranked = rankGroup(joueursGroupe, barrages);
  const dejaVu = new Set();
  for (let i = 0; i < Math.min(nbQual, ranked.length); i++) {
    if (dejaVu.has(ranked[i].id)) continue;
    const groupe = [ranked[i]];
    for (let k = i + 1; k < ranked.length; k++) { if (memeNiveau(ranked[i], ranked[k])) groupe.push(ranked[k]); else break; }
    groupe.forEach(j => dejaVu.add(j.id));
    if (groupe.length < 2) continue;
    const spots = nbQual - i;                       // places qualificatives à l'intérieur de ce groupe
    if (spots <= 0 || spots >= groupe.length) continue; // tout le groupe qualifie (ou aucun) → pas de barrage
    const gids = new Set(groupe.map(j => j.id));
    const bgg = bgAll.filter(m => gids.has(m.joueur1_id) && gids.has(m.joueur2_id));
    specsForGroup(groupe, spots, bgg).forEach(s => specs.push(s));
  }
  return specs;
};
