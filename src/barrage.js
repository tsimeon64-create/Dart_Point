// Logique pure de CLASSEMENT de poule et de BARRAGES 701 (extraite d'AppTournoiPotes.jsx
// pour être testable — voir barrage.test.mjs). Aucune dépendance : fonctions pures.
//
// ORDRE DE DÉPARTAGE (règle de compétition standard) :
//   1) VICTOIRES
//   2) CONFRONTATION DIRECTE entre les ex æquo (mini-championnat)
//   3) moins de DÉFAITES  (inerte sur une poule terminée ; ne sert qu'à l'affichage en direct)
//   4) DIFFÉRENCE DE MANCHES sur toute la poule (manches gagnées − manches perdues)
//   5) BARRAGE 701, seul recours quand rien d'autre ne tranche
//
// ⚠️ La confrontation directe passe AVANT la différence de manches : c'est la règle demandée,
// et c'est aussi la règle de la plupart des compétitions (le match a déjà été joué, il est
// gratuit à exploiter et il est explicable au joueur). Avant, elle arrivait en tout dernier,
// après les barrages — donc on faisait rejouer un 701 à des équipes qui s'étaient déjà départagées
// sur le terrain.
//
// ⚠️ CAS DU TRIANGLE (A bat B, B bat C, C bat A) : chacun a 1 victoire directe, la confrontation
// directe ne tranche RIEN. On passe alors à la différence de manches. C'est géré naturellement
// par le mini-championnat ci-dessous (un seul palier ⇒ critère suivant).
//
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

// Différence de manches sur TOUTE la poule.
const ga = (j) => (j.manches_pour || 0) - (j.manches_contre || 0);

// Le match de poule TERMINÉ entre deux équipes, s'il existe.
const matchEntre = (aId, bId, mp) => mp.find(x =>
  x.statut === "termine" && x.gagnant_id &&
  ((x.joueur1_id === aId && x.joueur2_id === bId) || (x.joueur1_id === bId && x.joueur2_id === aId)));

// Score de ce match VU PAR aId, ex. "2-1".
const scoreVuPar = (m, aId) => {
  const s1 = m.score1 || 0, s2 = m.score2 || 0;
  return m.joueur1_id === aId ? `${s1}-${s2}` : `${s2}-${s1}`;
};

// Découpe une liste en PALIERS d'égalité selon une clé (plus grand = mieux classé).
const decouper = (liste, cle) => {
  const paliers = [];
  [...liste].sort((a, b) => cle(b) - cle(a)).forEach(j => {
    const dernier = paliers[paliers.length - 1];
    if (dernier && cle(dernier[0]) === cle(j)) dernier.push(j);
    else paliers.push([j]);
  });
  return paliers;
};

// CONFRONTATION DIRECTE en MINI-CHAMPIONNAT : on ne compte que les matchs joués ENTRE les ex æquo.
// Renvoie null si un seul de ces matchs manque — un mini-championnat incomplet ne départage pas
// équitablement, on préfère alors passer au critère suivant.
const miniLigue = (paquet, mp) => {
  const v = {};
  paquet.forEach(j => { v[j.id] = 0; });
  for (let i = 0; i < paquet.length; i++)
    for (let k = i + 1; k < paquet.length; k++) {
      const m = matchEntre(paquet[i].id, paquet[k].id, mp);
      if (!m) return null;
      v[m.gagnant_id] = (v[m.gagnant_id] || 0) + 1;
    }
  return v;
};

// Les critères appliqués À L'INTÉRIEUR d'un paquet d'ex æquo (mêmes victoires), dans l'ordre.
// `preparer` renvoie la fonction-clé, ou null si le critère ne s'applique pas ici.
const CRITERES = [
  { // 2) CONFRONTATION DIRECTE
    preparer: (paquet, mp) => { const v = miniLigue(paquet, mp); return v ? (j => v[j.id]) : null; },
    raison: (palier, suivant, cle, paquet, mp) => {
      if (!suivant) return null; // dernier palier : il n'est passé devant personne
      if (paquet.length === 2 && palier.length === 1 && suivant.length === 1) {
        // Le cas courant et le plus lisible : 2 ex æquo, un seul match direct à citer.
        const j = palier[0], autre = suivant[0];
        const m = matchEntre(j.id, autre.id, mp);
        return { type: "h2h", contre: autre.nom, score: m ? scoreVuPar(m, j.id) : null };
      }
      return { type: "h2h-mini", vic: cle(palier[0]), sur: paquet.length - 1 };
    },
  },
  { // 3) moins de DÉFAITES — n'agit QUE sur une poule en cours (round-robin incomplet) :
    //    une fois la poule finie, victoires égales ⇒ défaites égales, ce critère est inerte.
    //    Il reste ici, au-dessus des manches, pour ne rien changer au classement affiché EN DIRECT
    //    pendant que la poule se joue (une équipe 2V-0D restait devant une équipe 2V-1D).
    preparer: () => (j => -(j.defaites || 0)),
    raison: (palier, suivant) => suivant ? { type: "defaites", moi: palier[0].defaites, autre: suivant[0].defaites } : null,
  },
  { // 4) DIFFÉRENCE DE MANCHES sur toute la poule
    preparer: () => ga,
    raison: (palier, suivant) => suivant ? { type: "manches", moi: ga(palier[0]), autre: ga(suivant[0]) } : null,
  },
];

// Ordonne un paquet d'ex æquo qui n'a PAS encore joué de barrage.
// Renvoie [{joueur, raison, exAequo, groupe}] ; `exAequo` = rien ne les départage → barrage requis.
let _cptGroupe = 0;
const ordonnerExAequo = (paquet, mp) => {
  const sortie = [];
  const traiter = (lot, etape) => {
    if (lot.length === 1) { sortie.push({ joueur: lot[0], raison: null }); return; }
    if (etape >= CRITERES.length) { // plus aucun critère : égalité parfaite → barrage
      const g = ++_cptGroupe;
      lot.forEach(j => sortie.push({ joueur: j, raison: null, exAequo: true, groupe: g }));
      return;
    }
    const c = CRITERES[etape];
    const cle = c.preparer(lot, mp);
    if (!cle) { traiter(lot, etape + 1); return; }        // critère inapplicable ici
    const paliers = decouper(lot, cle);
    if (paliers.length === 1) { traiter(lot, etape + 1); return; } // n'a rien tranché (ex. triangle)
    paliers.forEach((palier, i) => {
      const r = c.raison(palier, paliers[i + 1], cle, lot, mp);
      const avant = sortie.length;
      traiter(palier, etape + 1);
      // On n'écrase pas une raison plus fine trouvée par un critère suivant.
      if (r) for (let k = avant; k < sortie.length; k++) if (!sortie[k].raison) sortie[k].raison = r;
    });
  };
  traiter(paquet, 0);
  return sortie;
};

// Ordre HISTORIQUE, conservé tel quel dès qu'un barrage a déjà été joué entre ces équipes :
// le barrage a été organisé EXPRÈS pour les départager, c'est lui qui fait foi, et les tournois
// déjà en cours ne doivent pas voir leur classement changer sous leurs pieds.
const ordreAvecBarrage = (paquet, bg, mp) => {
  const maxRound = bg.reduce((mx, m) => Math.max(mx, m.round_bracket || 0), 0);
  return [...paquet].sort((a, b) => {
    if (a.defaites !== b.defaites) return a.defaites - b.defaites;
    const da = ga(a), db = ga(b);
    if (db !== da) return db - da;
    for (let r = maxRound; r >= 0; r--) {                 // du tour le + récent au + ancien
      if (!aJoueTour(a.id, r, bg) || !aJoueTour(b.id, r, bg)) continue; // saute les tours non joués par l'un des deux
      const ka = statBarrageTour(a.id, r, bg), kb = statBarrageTour(b.id, r, bg);
      if (kb !== ka) return kb - ka;
    }
    const m = matchEntre(a.id, b.id, mp);
    if (m) return m.gagnant_id === a.id ? -1 : (m.gagnant_id === b.id ? 1 : 0);
    return 0;
  });
};

/**
 * Classement DÉTAILLÉ d'une poule : [{joueur, raison, exAequo, groupe}].
 * `raison` explique POURQUOI ce joueur est passé devant le suivant (null s'il n'y avait pas
 * d'égalité à départager). Voir phraseDepartage() pour la mettre en français.
 */
export const rankGroupDetaille = (joueurs, barrages = [], matchsPoule = []) => {
  const ids = new Set(joueurs.map(j => j.id));
  const bg = barrages.filter(m => m.statut === "termine" && m.gagnant_id && ids.has(m.joueur1_id) && ids.has(m.joueur2_id));
  const mp = (matchsPoule || []).filter(m => m.phase === "poules" && ids.has(m.joueur1_id) && ids.has(m.joueur2_id));
  const sortie = [];
  decouper(joueurs, j => j.victoires || 0).forEach(paquet => {   // 1) VICTOIRES
    if (paquet.length === 1) { sortie.push({ joueur: paquet[0], raison: null }); return; }
    const aBarrage = bg.some(m => paquet.some(x => x.id === m.joueur1_id) && paquet.some(x => x.id === m.joueur2_id));
    if (aBarrage) {
      ordreAvecBarrage(paquet, bg, mp).forEach(j => sortie.push({ joueur: j, raison: { type: "barrage" } }));
      return;
    }
    ordonnerExAequo(paquet, mp).forEach(e => sortie.push(e));
  });
  return sortie;
};

// Classement d'une poule (compatible avec l'ancien appel : renvoie les joueurs triés).
export const rankGroup = (joueurs, barrages = [], matchsPoule = []) =>
  rankGroupDetaille(joueurs, barrages, matchsPoule).map(e => e.joueur);

/** Met une `raison` en français, pour l'afficher au joueur. Renvoie null s'il n'y a rien à dire. */
export const phraseDepartage = (raison, nom, qualifie = false) => {
  if (!raison) return null;
  const devant = qualifie ? "est qualifié" : "passe devant";
  const signe = n => (n >= 0 ? "+" : "") + n;
  switch (raison.type) {
    case "h2h":
      return `${nom} ${devant} : il a battu ${raison.contre} en confrontation directe`
           + (raison.score ? ` (${raison.score}).` : ".");
    case "h2h-mini":
      return `${nom} ${devant} en confrontation directe : ${raison.vic} victoire${raison.vic > 1 ? "s" : ""} sur ${raison.sur} face aux ex æquo.`;
    case "manches":
      return `Départage à la différence de manches : ${signe(raison.moi)} contre ${signe(raison.autre)}.`;
    case "defaites":
      return `Départage au nombre de défaites : ${raison.moi} contre ${raison.autre}.`;
    case "barrage":
      return `Départagé par un match de barrage.`;
    default:
      return null;
  }
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

/**
 * Matchs de barrage À CRÉER pour départager les égalités de poule sur les places qualificatives.
 * Chaque spec : {a, b, round}. Un barrage n'est proposé QUE si la confrontation directe ET la
 * différence de manches ont échoué à départager — c'est le dernier recours.
 * `matchsPoule` (optionnel) : sans lui, la confrontation directe ne peut pas s'appliquer et on
 * retombe sur l'ancien comportement.
 */
export const egalitesADepartager = (joueursGroupe, barrages = [], nbQual = 2, matchsPoule = []) => {
  const specs = [];
  const idsAll = new Set(joueursGroupe.map(j => j.id));
  const bgAll = barrages.filter(m => m.statut === "termine" && idsAll.has(m.joueur1_id) && idsAll.has(m.joueur2_id));
  // Classement AVANT barrages : il donne les paquets que rien d'autre ne départage (`exAequo`),
  // et les positions y sont les mêmes qu'avec les barrages (ceux qui sont devant le sont sur
  // victoires / manches / défaites, que les barrages ne changent pas).
  const detail = rankGroupDetaille(joueursGroupe, [], matchsPoule);
  const dejaVu = new Set();
  for (let i = 0; i < Math.min(nbQual, detail.length); i++) {
    const e = detail[i];
    if (dejaVu.has(e.joueur.id) || !e.exAequo) continue;
    const groupe = detail.filter(x => x.exAequo && x.groupe === e.groupe).map(x => x.joueur);
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
