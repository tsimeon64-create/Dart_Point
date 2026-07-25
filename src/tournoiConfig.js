// ─────────────────────────────────────────────────────────────────────────────
// tournoiConfig.js — « CERVEAU » (logique pure) de la configuration du mode
// « Tournoi entre potes » de Dart Point.
//
// OBJECTIF : centraliser TOUS les calculs de la config (nb de matchs, qualifiés,
// exempts, taille de tableau, durée estimée, validation, résumés) dans des
// fonctions PURES et TESTABLES, sans aucun import React.
//
// Les composants visuels du nouvel assistant de configuration (le « wizard »)
// consommeront ces fonctions et se contenteront d'AFFICHER le résultat.
// Ils ne doivent JAMAIS refaire ces calculs eux-mêmes (règle §16 du cahier des
// charges : « Ne pas déplacer toute la logique métier dans les composants »).
//
// FIDÉLITÉ : les formules ci-dessous reproduisent EXACTEMENT le comportement du
// code existant de src/AppTournoiPotes.jsx afin que l'aperçu affiché corresponde
// à ce qui sera réellement généré :
//   • nextPow2 / evalTaillePoule (PoolConfigModal)
//   • répartition round-robin (i % nb) de lancerTournoi
//   • sizes=[2,4,8,16,32].find(s=>s>=n) de lancerEliminatoires
//   • consoCountFor / exemptsConso (BracketConfigModal)
//   • mm(phase)=manchesMap[phase]||(finale?5:2) de genBracketMatchs
//   • structure « appariement maximal » de genConsolanteMatchs
// ─────────────────────────────────────────────────────────────────────────────

// ── Briques de base ─────────────────────────────────────────────────────────

// Plus petite puissance de 2 ≥ x (minimum 2). Identique à AppTournoiPotes.nextPow2.
export const nextPow2 = (x) => Math.max(2, Math.pow(2, Math.ceil(Math.log2(Math.max(2, x)))));

// Liste de repli utilisée par lancerEliminatoires (const sizes=[2,4,8,16,32]).
// ATTENTION : ce n'est PAS un plafond réel. Dans le flux normal, BracketConfigModal
// passe bracketSize = nextPow2(totalQual) (jusqu'à 64, 128…) et cette valeur GAGNE
// dans lancerEliminatoires (bsChoisi || sizes.find(...) || 32). Le « || 32 » n'est
// donc jamais atteint. La taille RÉELLEMENT affichée et générée = nextPow2, SANS plafond.
export const BRACKET_SIZES = [2, 4, 8, 16, 32];

// Taille de tableau (minimum) pour un nombre de qualifiés donné.
// = nextPow2(n), SANS plafond — fidèle à ce que les modals affichent et génèrent
// réellement (garantit toujours bracketSize >= qualifiedCount).
export const getNextBracketSize = (qualifiedCount) => nextPow2(Math.max(2, Math.round(qualifiedCount || 0)));

// Nombre d'exempts (byes) = places du tableau non remplies par un qualifié.
export const calculateByeCount = (qualifiedCount) => {
  const q = Math.max(0, Math.round(qualifiedCount || 0));
  return Math.max(0, getNextBracketSize(q) - q);
};

// Nb de poules d'après « joueurs par poule », comme lancerTournoi : round(n / taille).
export const poolCountFromSize = (n, playersPerPool) =>
  Math.max(1, Math.round(n / Math.max(1, playersPerPool)));

// Répartition de n participants dans `poolCount` poules façon round-robin (i % nb),
// EXACTEMENT comme lancerTournoi. Renvoie les TAILLES des poules (les premières
// poules reçoivent le participant en trop). Ex. n=22, poolCount=4 → [6, 6, 5, 5].
export const distributePools = (n, poolCount) => {
  const pc = Math.max(1, Math.round(poolCount || 1));
  const sizes = new Array(pc).fill(0);
  for (let i = 0; i < n; i++) sizes[i % pc]++;
  return sizes;
};

// Nb de matchs dans une poule de g joueurs (round-robin) = g*(g-1)/2.
export const matchesInPool = (g) => (g * (g - 1)) / 2;

// Nb TOTAL de matchs de poules, poules de tailles éventuellement différentes.
export const calculatePoolMatchCount = (groups) =>
  (groups || []).reduce((total, g) => total + matchesInPool(g), 0);

// Nb TOTAL de qualifiés = somme par poule de min(qualifiésParPoule, taillePoule).
export const calculateQualifiedCount = (groups, qualifiersPerPool) =>
  (groups || []).reduce((total, g) => total + Math.min(qualifiersPerPool, g), 0);

// ── Consolante (repêchage) ──────────────────────────────────────────────────

// Nb d'équipes en consolante = par poule, les `nbConso` premières NON qualifiées.
// Identique à consoCountFor de BracketConfigModal : Σ max(0, min(nbConso, taille - nbQual)).
export const computeConsolationCount = (groups, nbQual, nbConso) =>
  (groups || []).reduce((c, g) => c + Math.max(0, Math.min(nbConso, g - nbQual)), 0);

// Nb de matchs par tour d'un tableau consolante de N équipes (appariement maximal),
// reproduit genConsolanteMatchs : tour 1 = ceil(N/2) matchs, puis ceil(slots/2)…
export const consolationRoundMatchCounts = (N) => {
  if (N < 2) return [];
  const counts = [Math.ceil(N / 2)];
  let slots = counts[0];
  while (slots > 1) {
    slots = Math.ceil(slots / 2);
    counts.push(slots);
  }
  return counts;
};

// Nb d'exempts (byes) qui apparaissent dans un tableau consolante « greedy » :
// un exempt à chaque tour où le nb d'équipes est impair. Identique à exemptsConso.
export const consolationByeCount = (N) => {
  let b = 0, x = N;
  while (x > 1) {
    if (x % 2) b++;
    x = Math.ceil(x / 2);
  }
  return b;
};

// ── Tableau principal : structure ───────────────────────────────────────────

// Nom de phase à partir du tour (1 = 1er tour) et du nb total de tours.
// Identique à AppTournoiPotes.phaseName.
export const phaseName = (round, totalRounds) => {
  const fromFinal = totalRounds - round;
  if (fromFinal === 0) return "finale";
  if (fromFinal === 1) return "demi";
  if (fromFinal === 2) return "quart";
  if (fromFinal === 3) return "huitieme";
  return "seizieme";
};

// Liste ordonnée des phases d'un tableau de taille `size`. Identique à roundsForBracket.
export const roundsForBracket = (size) => {
  const tr = Math.log2(size);
  const out = [];
  for (let r = 1; r <= tr; r++) out.push(phaseName(r, tr));
  return out;
};

// Nb de manches pour une phase, reproduit le mm() de genBracketMatchs.
export const manchesForPhase = (phase, manchesMap = {}) =>
  manchesMap[phase] || (phase === "finale" ? 5 : 2);

// Libellés lisibles des phases (français).
export const ROUND_LABEL = {
  seizieme: "16es de finale",
  huitieme: "8es de finale",
  quart: "Quarts de finale",
  demi: "Demi-finales",
  finale: "Finale",
  petite_finale: "Petite finale (3e place)",
  consolante: "Consolante",
};

// ── Options de répartition des poules ───────────────────────────────────────

// Renvoie les répartitions de poules proposées pour `playerCount` participants,
// chacune ENRICHIE de toutes ses conséquences (déjà calculées). C'est ce tableau
// que l'écran « Poules » affichera sous forme de cartes.
//
// Chaque option :
//   {
//     playersPerPool, poolCount, groups:[tailles], balanced,
//     matchesPerPool (si équilibrée, sinon null), totalPoolMatches,
//     qualifiersPerPool, qualifiedCount, bracketSize, byeCount, clean,
//     label, recommended
//   }
export const getPoolDistributionOptions = (playerCount, { qualifiersPerPool = 2 } = {}) => {
  const n = Math.max(0, Math.round(playerCount || 0));
  if (n < 2) return [];

  // Mêmes tailles candidates que PoolConfigModal : ≥ 3 joueurs/poule,
  // cohérentes avec le vrai calcul round(n / taille).
  const seen = new Set();
  const sizes = [];
  for (let np = 2; np <= Math.floor(n / 2); np++) {
    const size = Math.round(n / np);
    if (size < 3) continue;
    if (poolCountFromSize(n, size) !== np) continue;
    if (seen.has(size)) continue;
    seen.add(size);
    sizes.push(size);
  }
  if (!sizes.length) sizes.push(Math.min(n, 3)); // filet pour les tout petits tournois
  sizes.sort((a, b) => a - b);

  const options = sizes.map((playersPerPool) => {
    const poolCount = poolCountFromSize(n, playersPerPool);
    const groups = distributePools(n, poolCount);
    const balanced = groups.every((g) => g === groups[0]);
    const totalPoolMatches = calculatePoolMatchCount(groups);
    const qualifiedCount = calculateQualifiedCount(groups, qualifiersPerPool);
    const bracketSize = getNextBracketSize(qualifiedCount);
    const byeCount = Math.max(0, bracketSize - qualifiedCount);
    const label = balanced
      ? `${poolCount} poule${poolCount > 1 ? "s" : ""} de ${groups[0]}`
      : `${poolCount} poules de ${Math.min(...groups)} à ${Math.max(...groups)}`;
    return {
      playersPerPool,
      poolCount,
      groups,
      balanced,
      matchesPerPool: balanced ? matchesInPool(groups[0]) : null,
      totalPoolMatches,
      qualifiersPerPool,
      qualifiedCount,
      bracketSize,
      byeCount,
      clean: byeCount === 0,
      label,
      recommended: false,
    };
  });

  // Recommandé : d'abord le moins d'exempts, puis la taille de poule la plus
  // « saine » aux fléchettes (4-5 idéal, 6 bien, 3/7 correct, sinon médiocre —
  // évite de conseiller 2 poules géantes), puis le moins de matchs au total.
  const idealScore = (size) =>
    size === 4 || size === 5 ? 0 : size === 6 ? 1 : size === 3 || size === 7 ? 2 : 3;
  const ranked = [...options].sort(
    (a, b) =>
      a.byeCount - b.byeCount ||
      idealScore(a.playersPerPool) - idealScore(b.playersPerPool) ||
      a.totalPoolMatches - b.totalPoolMatches
  );
  if (ranked[0]) {
    const best = options.find((o) => o.playersPerPool === ranked[0].playersPerPool);
    if (best) best.recommended = true;
  }
  return options;
};

// ── Estimation de durée ─────────────────────────────────────────────────────

// Durée estimée des poules, en MINUTES.
// Calque §7 : ceil(nbMatchs / nbCibles) * dureeMoyenneParMatch.
export const estimatePoolDuration = ({ groups, availableTargets, averageMatchDuration = 15 }) => {
  const totalMatches = calculatePoolMatchCount(groups);
  const targets = Math.max(1, availableTargets || 1);
  return Math.ceil(totalMatches / targets) * averageMatchDuration;
};

// Durée estimée du tableau final (+ petite finale + consolante), en MINUTES.
// La durée d'un match est pondérée par son format (manches / 2, base = « premier à 2 »).
export const estimateBracketDuration = ({
  qualifiedCount,
  availableTargets,
  manchesMap = {},
  averageMatchDuration = 15,
  petiteFinale = false,
  consolante = false,
  consolationTeams = 0,
}) => {
  const targets = Math.max(1, availableTargets || 1);
  const bracketSize = getNextBracketSize(qualifiedCount);
  const totalRounds = Math.log2(bracketSize);
  const timeForMatches = (matchCount, manches) =>
    Math.ceil(matchCount / targets) * averageMatchDuration * (manches / 2);

  let total = 0;
  for (let r = 1; r <= totalRounds; r++) {
    const phase = phaseName(r, totalRounds);
    const matchCount = bracketSize / Math.pow(2, r);
    total += timeForMatches(matchCount, manchesForPhase(phase, manchesMap));
  }
  if (petiteFinale && bracketSize >= 4) {
    total += timeForMatches(1, manchesForPhase("petite_finale", manchesMap));
  }
  if (consolante && consolationTeams >= 2) {
    const consManches = manchesForPhase("consolante", manchesMap);
    consolationRoundMatchCounts(consolationTeams).forEach((mc) => {
      total += timeForMatches(mc, consManches);
    });
  }
  return Math.round(total);
};

// Formate une durée (minutes) en texte court : "3 h 20", "1 h", "45 min".
export const formatDuration = (minutes) => {
  const min = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${String(m).padStart(2, "0")}`;
};

// ── Validation ──────────────────────────────────────────────────────────────

// Valide la configuration des poules.
// Renvoie { isValid, errors[], warnings[], information[] } (chaînes prêtes à afficher).
export const validatePoolConfiguration = (config = {}) => {
  const {
    playerCount = 0,
    groups = [],
    qualifiersPerPool = 2,
    availableTargets = 1,
    averageMatchDuration = 15,
  } = config;
  const errors = [];
  const warnings = [];
  const information = [];

  // — Erreurs bloquantes —
  if (!playerCount || playerCount < 2) {
    errors.push("Il faut au moins 2 participants inscrits.");
  }
  if (!availableTargets || availableTargets < 1) {
    errors.push("Il faut au moins 1 cible disponible.");
  }
  if (groups.length) {
    if (groups.some((g) => g < 2)) {
      errors.push("Une poule contient moins de 2 participants.");
    }
    if (groups.some((g) => qualifiersPerPool >= g)) {
      errors.push(
        "Le nombre de qualifiés par poule est supérieur ou égal au nombre de participants d'une poule."
      );
    }
  } else if (playerCount >= 2) {
    errors.push("Aucune poule n'a été formée.");
  }

  if (!errors.length && groups.length) {
    const totalMatches = calculatePoolMatchCount(groups);
    const qualifiedCount = calculateQualifiedCount(groups, qualifiersPerPool);
    const byeCount = calculateByeCount(qualifiedCount);
    const balanced = groups.every((g) => g === groups[0]);
    const duration = estimatePoolDuration({ groups, availableTargets, averageMatchDuration });

    // — Avertissements non bloquants —
    if (byeCount > 0) {
      warnings.push(
        `${byeCount} exempt${byeCount > 1 ? "s" : ""} au 1er tour du tableau : ${byeCount > 1 ? "ils passent" : "il passe"} directement le 1er tour.`
      );
    }
    if (!balanced) {
      warnings.push(
        `Poules de tailles différentes (${Math.min(...groups)} à ${Math.max(...groups)} participants).`
      );
    }
    if (totalMatches > 60) {
      warnings.push(`Beaucoup de matchs de poules (${totalMatches}) : le tournoi sera long.`);
    }
    if (duration > 180) {
      warnings.push(`Durée estimée des poules élevée : environ ${formatDuration(duration)}.`);
    }

    // — Informations —
    information.push(`${groups.length} poule${groups.length > 1 ? "s" : ""} · ${totalMatches} matchs de poules.`);
    information.push(`${qualifiedCount} qualifié${qualifiedCount > 1 ? "s" : ""} pour le tableau final.`);
  }

  return { isValid: errors.length === 0, errors, warnings, information };
};

// Valide la configuration du tableau final.
export const validateBracketConfiguration = (config = {}) => {
  const {
    qualifiedCount = 0,
    bracketSize,
    availableTargets = 1,
    petiteFinale = false,
    consolante = false,
    consolationTeams = 0,
  } = config;
  const errors = [];
  const warnings = [];
  const information = [];

  if (!qualifiedCount || qualifiedCount < 2) {
    errors.push("Il faut au moins 2 qualifiés pour un tableau final.");
  }
  if (!availableTargets || availableTargets < 1) {
    errors.push("Il faut au moins 1 cible disponible.");
  }
  const size = bracketSize || getNextBracketSize(qualifiedCount);
  if (bracketSize && bracketSize < qualifiedCount) {
    errors.push("La taille de tableau choisie est trop petite pour le nombre de qualifiés.");
  }

  if (!errors.length) {
    const byeCount = Math.max(0, size - qualifiedCount);
    if (byeCount > 0) {
      warnings.push(
        `${byeCount} exempt${byeCount > 1 ? "s" : ""} au 1er tour (tableau de ${size} pour ${qualifiedCount} qualifiés).`
      );
    }
    if (petiteFinale && size < 4) {
      warnings.push("La petite finale nécessite au moins des demi-finales (tableau de 4 minimum).");
    }
    if (consolante && consolationTeams < 2) {
      warnings.push("La consolante nécessite au moins 2 équipes repêchées.");
    }
    information.push(`Tableau de ${size} · ${roundsForBracket(size).length} tour(s).`);
  }

  return { isValid: errors.length === 0, errors, warnings, information };
};

// ── Résumés (données structurées prêtes à afficher) ─────────────────────────

// Construit le résumé des poules : un titre + une liste de lignes {icon, text}.
// `averageMatchDuration` optionnel → ajoute la ligne « Durée estimée ».
export const buildPoolConfigurationSummary = (config = {}) => {
  const {
    playerCount = 0,
    groups = [],
    qualifiersPerPool = 2,
    manches = 2,
    availableTargets = 1,
    averageMatchDuration = null,
    format = "simple",
  } = config;

  const poolCount = groups.length;
  const balanced = poolCount > 0 && groups.every((g) => g === groups[0]);
  const totalMatches = calculatePoolMatchCount(groups);
  const qualifiedCount = calculateQualifiedCount(groups, qualifiersPerPool);
  const bracketSize = getNextBracketSize(qualifiedCount);
  const byeCount = Math.max(0, bracketSize - qualifiedCount);
  const unite = format === "doublette" ? "équipes" : "joueurs";
  const uniteQ = format === "doublette" ? "équipes qualifiées" : "qualifiés";

  const headline = balanced
    ? `${poolCount} poule${poolCount > 1 ? "s" : ""} de ${groups[0]} ${unite}`
    : `${poolCount} poules de ${Math.min(...groups)} à ${Math.max(...groups)} ${unite}`;

  const lines = [
    { icon: "👥", text: `${playerCount} ${unite} inscrit${playerCount > 1 ? "es" : "e"}`.replace("inscrites", format === "doublette" ? "inscrites" : "inscrits") },
    { icon: "🏟️", text: headline },
  ];
  if (balanced) lines.push({ icon: "🎯", text: `${matchesInPool(groups[0])} matchs par poule` });
  lines.push({ icon: "📋", text: `${totalMatches} matchs de poules` });
  lines.push({ icon: "🥇", text: `${qualifiersPerPool} ${uniteQ} par poule` });
  lines.push({ icon: "✅", text: `${qualifiedCount} ${uniteQ} au total` });
  lines.push({ icon: "🏆", text: `Tableau final de ${bracketSize}` });
  lines.push(
    byeCount === 0
      ? { icon: "👍", text: "Aucun exempt" }
      : { icon: "⚠️", text: `${byeCount} exempt${byeCount > 1 ? "s" : ""}` }
  );
  lines.push({ icon: "🎲", text: `Premier à ${manches} manche${manches > 1 ? "s" : ""}` });
  lines.push({ icon: "🎯", text: `${availableTargets} cible${availableTargets > 1 ? "s" : ""} disponible${availableTargets > 1 ? "s" : ""}` });

  if (averageMatchDuration) {
    const dur = estimatePoolDuration({ groups, availableTargets, averageMatchDuration });
    lines.push({ icon: "⏱️", text: `Durée estimée : environ ${formatDuration(dur)}` });
  }

  return { headline, clean: byeCount === 0, qualifiedCount, bracketSize, byeCount, totalMatches, lines };
};

// Construit le résumé du tableau final.
export const buildBracketConfigurationSummary = (config = {}) => {
  const {
    qualifiedCount = 0,
    bracketSize: bsIn,
    manchesMap = {},
    petiteFinale = false,
    consolante = false,
    consolationTeams = 0,
    availableTargets = 1,
    averageMatchDuration = null,
    format = "simple",
  } = config;

  const bracketSize = bsIn || getNextBracketSize(qualifiedCount);
  const byeCount = Math.max(0, bracketSize - qualifiedCount);
  const rounds = roundsForBracket(bracketSize);
  const uniteQ = format === "doublette" ? "équipes qualifiées" : "qualifiés";

  const headline = `Tableau de ${bracketSize}`;
  const lines = [
    { icon: "🏆", text: `${qualifiedCount} ${uniteQ}` },
    { icon: "🎬", text: `Départ en ${ROUND_LABEL[rounds[0]] || "finale"}` },
    { icon: "📋", text: `${bracketSize - 1} matchs dans le tableau principal` },
    byeCount === 0
      ? { icon: "👍", text: "Aucun exempt" }
      : { icon: "⚠️", text: `${byeCount} exempt${byeCount > 1 ? "s" : ""} au 1er tour` },
  ];

  if (petiteFinale && bracketSize >= 4) {
    lines.push({ icon: "🥉", text: "Petite finale (3e place) activée" });
  }
  if (consolante && consolationTeams >= 2) {
    lines.push({ icon: "🎖️", text: `Consolante de ${consolationTeams} équipes` });
  }

  // Détail des formats par tour réellement utilisés.
  const usedPhases = [
    ...rounds,
    ...(petiteFinale && bracketSize >= 4 ? ["petite_finale"] : []),
    ...(consolante && consolationTeams >= 2 ? ["consolante"] : []),
  ];
  usedPhases.forEach((ph) => {
    const m = manchesForPhase(ph, manchesMap);
    lines.push({ icon: "▸", text: `${ROUND_LABEL[ph]} : premier à ${m} manche${m > 1 ? "s" : ""}` });
  });

  lines.push({ icon: "🎯", text: `${availableTargets} cible${availableTargets > 1 ? "s" : ""} disponible${availableTargets > 1 ? "s" : ""}` });

  if (averageMatchDuration) {
    const dur = estimateBracketDuration({
      qualifiedCount,
      availableTargets,
      manchesMap,
      averageMatchDuration,
      petiteFinale,
      consolante,
      consolationTeams,
    });
    lines.push({ icon: "⏱️", text: `Durée estimée : environ ${formatDuration(dur)}` });
  }

  return { headline, clean: byeCount === 0, bracketSize, byeCount, lines };
};

// ── Ordre de proposition des matchs de poules ───────────────────────────────

// Réordonne (SANS les modifier) les matchs de poules pour éviter, autant que
// possible, qu'un même joueur enchaîne deux matchs de suite et pour répartir les
// poules sur les cibles. Renvoie un NOUVEAU tableau contenant les MÊMES matchs.
//
// `matches` : objets ayant au moins { joueur1_id, joueur2_id, groupe }.
// `availableTargets` : nb de cibles (fenêtre de matchs « simultanés » à espacer).
export const optimizePoolMatchOrder = (matches, availableTargets = 1) => {
  const remaining = [...(matches || [])];
  if (remaining.length <= 2) return remaining;
  const targets = Math.max(1, availableTargets || 1);
  const ordered = [];
  // Fenêtre glissante des joueurs occupés (≈ matchs simultanés sur les cibles).
  let windowPlayers = [];
  let lastGroup = null;

  const playersOf = (m) => [m.joueur1_id, m.joueur2_id].filter((x) => x != null);

  while (remaining.length) {
    const busy = new Set(windowPlayers);
    // 1) idéal : aucun joueur occupé ET poule différente de la précédente
    let idx = remaining.findIndex(
      (m) => playersOf(m).every((p) => !busy.has(p)) && m.groupe !== lastGroup
    );
    // 2) sinon : aucun joueur occupé (peu importe la poule)
    if (idx === -1) idx = remaining.findIndex((m) => playersOf(m).every((p) => !busy.has(p)));
    // 3) sinon : au moins une poule différente
    if (idx === -1) idx = remaining.findIndex((m) => m.groupe !== lastGroup);
    // 4) dernier recours : le premier disponible
    if (idx === -1) idx = 0;

    const [chosen] = remaining.splice(idx, 1);
    ordered.push(chosen);
    lastGroup = chosen.groupe;
    windowPlayers.push(...playersOf(chosen));
    // On garde la fenêtre à ~ (targets) matchs récents (2 joueurs/match).
    const maxWin = targets * 2;
    while (windowPlayers.length > maxWin) windowPlayers.shift();
  }
  return ordered;
};
