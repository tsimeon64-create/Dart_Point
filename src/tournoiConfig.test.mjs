// Tests de tournoiConfig.js — le « cerveau » de la configuration du mode Tournoi.
// Objectif : PROUVER que les calculs donnent EXACTEMENT les nombres attendus par
// le cahier des charges (§18) et qu'ils collent au code existant d'AppTournoiPotes.
// Lancer : node src/tournoiConfig.test.mjs
import {
  nextPow2,
  getNextBracketSize,
  calculateByeCount,
  poolCountFromSize,
  distributePools,
  matchesInPool,
  calculatePoolMatchCount,
  calculateQualifiedCount,
  computeConsolationCount,
  consolationRoundMatchCounts,
  consolationByeCount,
  phaseName,
  roundsForBracket,
  manchesForPhase,
  getPoolDistributionOptions,
  estimatePoolDuration,
  estimateBracketDuration,
  formatDuration,
  validatePoolConfiguration,
  validateBracketConfiguration,
  buildPoolConfigurationSummary,
  buildBracketConfigurationSummary,
  optimizePoolMatchOrder,
} from "./tournoiConfig.js";

let pass = 0,
  fail = 0;
const eq = (name, got, want) => {
  const g = JSON.stringify(got),
    w = JSON.stringify(want);
  if (g === w) {
    pass++;
  } else {
    fail++;
    console.log(`❌ ${name}\n   attendu: ${w}\n   obtenu : ${g}`);
  }
};
const ok = (name, cond) => {
  if (cond) pass++;
  else {
    fail++;
    console.log(`❌ ${name} (condition fausse)`);
  }
};

// Aide : retrouve l'option « X joueurs par poule » dans getPoolDistributionOptions.
const optFor = (n, size, qpp = 2) =>
  getPoolDistributionOptions(n, { qualifiersPerPool: qpp }).find((o) => o.playersPerPool === size);

// ── 1) Briques de base ──────────────────────────────────────────────────────
eq("nextPow2(1)", nextPow2(1), 2);
eq("nextPow2(3)", nextPow2(3), 4);
eq("nextPow2(8)", nextPow2(8), 8);
eq("nextPow2(9)", nextPow2(9), 16);

// getNextBracketSize calque lancerEliminatoires : [2,4,8,16,32].find(s>=n)||32
eq("bracket(2)", getNextBracketSize(2), 2);
eq("bracket(3)", getNextBracketSize(3), 4);
eq("bracket(4)", getNextBracketSize(4), 4);
eq("bracket(5)", getNextBracketSize(5), 8);
eq("bracket(8)", getNextBracketSize(8), 8);
eq("bracket(9)", getNextBracketSize(9), 16);
eq("bracket(12)", getNextBracketSize(12), 16);
eq("bracket(16)", getNextBracketSize(16), 16);
eq("bracket(17)", getNextBracketSize(17), 32);
eq("bracket(32)", getNextBracketSize(32), 32);
// > 32 : PAS de plafond (fidèle au vrai flux qui passe nextPow2 non plafonné).
// Garantit aussi bracketSize >= qualifiedCount (jamais un tableau plus petit).
eq("bracket(33)", getNextBracketSize(33), 64);
eq("bracket(34)", getNextBracketSize(34), 64);
eq("bracket(64)", getNextBracketSize(64), 64);
eq("bracket(65)", getNextBracketSize(65), 128);
ok("bracket >= qualifiés pour tout n test", [3, 5, 12, 33, 34, 50, 65].every((q) => getNextBracketSize(q) >= q));

eq("byes(8)", calculateByeCount(8), 0);
eq("byes(12)", calculateByeCount(12), 4);
eq("byes(6)", calculateByeCount(6), 2);
eq("byes(3)", calculateByeCount(3), 1);
eq("byes(34)", calculateByeCount(34), 30); // 64 - 34 (plus de plafond à 32)

// Répartition round-robin (i % nb) — comme lancerTournoi
eq("distribute(20,4)", distributePools(20, 4), [5, 5, 5, 5]);
eq("distribute(8,2)", distributePools(8, 2), [4, 4]);
eq("distribute(22,4)", distributePools(22, 4), [6, 6, 5, 5]);
eq("distribute(21,4)", distributePools(21, 4), [6, 5, 5, 5]);
eq("poolCountFromSize(20,5)", poolCountFromSize(20, 5), 4);
eq("poolCountFromSize(8,4)", poolCountFromSize(8, 4), 2);

eq("matchesInPool(4)", matchesInPool(4), 6);
eq("matchesInPool(5)", matchesInPool(5), 10);
eq("calculatePoolMatchCount([5,5,5,5])", calculatePoolMatchCount([5, 5, 5, 5]), 40);
eq("calculatePoolMatchCount([4,4])", calculatePoolMatchCount([4, 4]), 12);
eq("calculateQualifiedCount([5,5,5,5],2)", calculateQualifiedCount([5, 5, 5, 5], 2), 8);
eq("calculateQualifiedCount([5,5,5,5],3)", calculateQualifiedCount([5, 5, 5, 5], 3), 12);

// ── 2) §18 — 8 joueurs → 2 poules de 4, 2 qual, tableau de 4, aucun exempt ──
{
  const o = optFor(8, 4);
  ok("8j: option 4/poule existe", !!o);
  eq("8j: poolCount", o.poolCount, 2);
  eq("8j: groups", o.groups, [4, 4]);
  eq("8j: totalPoolMatches", o.totalPoolMatches, 12);
  eq("8j: qualifiedCount", o.qualifiedCount, 4);
  eq("8j: bracketSize", o.bracketSize, 4);
  eq("8j: byeCount", o.byeCount, 0);
  ok("8j: recommandé = 4/poule", getPoolDistributionOptions(8).find((x) => x.recommended)?.playersPerPool === 4);
}

// ── 3) §18 — 20 joueurs → 4 poules de 5, 40 matchs, tableau de 8, aucun exempt ──
{
  const o = optFor(20, 5);
  ok("20j: option 5/poule existe", !!o);
  eq("20j: poolCount", o.poolCount, 4);
  eq("20j: groups", o.groups, [5, 5, 5, 5]);
  eq("20j: matchesPerPool", o.matchesPerPool, 10);
  eq("20j: totalPoolMatches", o.totalPoolMatches, 40);
  eq("20j: qualifiedCount", o.qualifiedCount, 8);
  eq("20j: bracketSize", o.bracketSize, 8);
  eq("20j: byeCount", o.byeCount, 0);
  ok("20j: recommandé = 5/poule", getPoolDistributionOptions(20).find((x) => x.recommended)?.playersPerPool === 5);
}

// ── 4) §18 — 20 joueurs, 3 qualifiés/poule → 12 qual, tableau de 16, 4 exempts ──
{
  const o = optFor(20, 5, 3);
  eq("20j/3q: qualifiedCount", o.qualifiedCount, 12);
  eq("20j/3q: bracketSize", o.bracketSize, 16);
  eq("20j/3q: byeCount", o.byeCount, 4);
}

// ── 5) §18 — nombre impair de participants : poules de tailles proches ──
{
  const o = optFor(21, 5); // round(21/5)=4 poules
  ok("21j: option existe", !!o);
  eq("21j: groups", o.groups, [6, 5, 5, 5]);
  ok("21j: écart de taille ≤ 1", Math.max(...o.groups) - Math.min(...o.groups) <= 1);
}

// ── 6) §18 — Doublette : une équipe = un seul participant (calculs identiques) ──
{
  // 20 équipes en doublette se comportent comme 20 participants.
  const o = optFor(20, 5);
  const sum = buildPoolConfigurationSummary({
    playerCount: 20,
    groups: o.groups,
    qualifiersPerPool: 2,
    manches: 2,
    availableTargets: 2,
    format: "doublette",
  });
  ok("doublette: parle d'équipes", sum.lines.some((l) => l.text.includes("équipes")));
  eq("doublette: qualifiedCount", sum.qualifiedCount, 8);
  eq("doublette: bracketSize", sum.bracketSize, 8);
}

// ── 7) §18 — Consolante : sélection des non-qualifiés + exempts ──
{
  // 20 j, 4 poules de 5, nbQual=2, nbConso=2 → 2 non-qual/poule → 8 équipes
  eq("conso 20j nbQual2 nbConso2", computeConsolationCount([5, 5, 5, 5], 2, 2), 8);
  // nbConso=3 mais poule de 5 avec 2 qual → seulement 3 restants → min(3,3)=3/poule = 12
  eq("conso 20j nbQual2 nbConso3", computeConsolationCount([5, 5, 5, 5], 2, 3), 12);
  // Poule de 4 avec 2 qual, nbConso 3 → min(3, 4-2)=2/poule
  eq("conso 8j nbQual2 nbConso3", computeConsolationCount([4, 4], 2, 3), 4);
  // Tableau consolante de 8 équipes → tour1 = 4 matchs, puis 2, puis 1
  eq("conso rounds N=8", consolationRoundMatchCounts(8), [4, 2, 1]);
  eq("conso byes N=8", consolationByeCount(8), 0);
  // N=6 (impair au 2e tour) → 3,2,1 et 1 exempt
  eq("conso rounds N=6", consolationRoundMatchCounts(6), [3, 2, 1]);
  eq("conso byes N=6", consolationByeCount(6), 1);
  // 12 → 6 → 3 (impair !) → 2 → 1 : le tour à 3 équipes crée 1 exempt (comme exemptsConso).
  eq("conso byes N=12", consolationByeCount(12), 1);
}

// ── 8) §18 — Petite finale : structure (phases) ──
{
  eq("phaseName finale", phaseName(3, 3), "finale");
  eq("phaseName demi", phaseName(2, 3), "demi");
  eq("phaseName quart", phaseName(1, 3), "quart");
  eq("rounds bracket 8", roundsForBracket(8), ["quart", "demi", "finale"]);
  eq("rounds bracket 16", roundsForBracket(16), ["huitieme", "quart", "demi", "finale"]);
  eq("rounds bracket 4", roundsForBracket(4), ["demi", "finale"]);
  ok("petite finale nécessite ≥ demies (tableau ≥ 4)", roundsForBracket(4).includes("demi"));
  eq("manches finale par défaut", manchesForPhase("finale", {}), 5);
  eq("manches quart par défaut", manchesForPhase("quart", {}), 2);
  eq("manches finale override", manchesForPhase("finale", { finale: 3 }), 3);
}

// ── 9) Durées ───────────────────────────────────────────────────────────────
{
  // 40 matchs, 2 cibles, 10 min → ceil(40/2)*10 = 200 min = "3 h 20"
  const d = estimatePoolDuration({ groups: [5, 5, 5, 5], availableTargets: 2, averageMatchDuration: 10 });
  eq("durée poules 40m/2c/10min", d, 200);
  eq("format 200 min", formatDuration(200), "3 h 20");
  eq("format 60 min", formatDuration(60), "1 h");
  eq("format 45 min", formatDuration(45), "45 min");
  eq("format 90 min", formatDuration(90), "1 h 30");
  // tableau de 8, 2 cibles : quarts(4m,2) demi(2m,3) finale(1m,5) → une durée > 0
  const db = estimateBracketDuration({
    qualifiedCount: 8,
    availableTargets: 2,
    manchesMap: { quart: 2, demi: 3, finale: 5 },
    averageMatchDuration: 15,
    petiteFinale: true,
  });
  ok("durée tableau > 0", db > 0);
}

// ── 10) Validation ──────────────────────────────────────────────────────────
{
  const okConf = validatePoolConfiguration({
    playerCount: 20,
    groups: [5, 5, 5, 5],
    qualifiersPerPool: 2,
    availableTargets: 2,
  });
  ok("config 20j valide", okConf.isValid);
  eq("config 20j sans erreur", okConf.errors.length, 0);

  const tropQual = validatePoolConfiguration({
    playerCount: 6,
    groups: [3, 3],
    qualifiersPerPool: 3, // 3 qualifiés dans une poule de 3 → bloquant
    availableTargets: 1,
  });
  ok("3 qual dans poule de 3 = invalide", !tropQual.isValid);

  const zeroCible = validatePoolConfiguration({
    playerCount: 8,
    groups: [4, 4],
    qualifiersPerPool: 2,
    availableTargets: 0,
  });
  ok("0 cible = invalide", !zeroCible.isValid);

  const zeroJoueur = validatePoolConfiguration({ playerCount: 0, groups: [], qualifiersPerPool: 2, availableTargets: 2 });
  ok("0 participant = invalide", !zeroJoueur.isValid);

  const byeWarn = validatePoolConfiguration({
    playerCount: 20,
    groups: [5, 5, 5, 5],
    qualifiersPerPool: 3, // 12 qual → tableau 16 → 4 exempts (warning, pas erreur)
    availableTargets: 2,
  });
  ok("4 exempts = valide mais averti", byeWarn.isValid && byeWarn.warnings.length > 0);

  const bracketBad = validateBracketConfiguration({ qualifiedCount: 8, bracketSize: 4, availableTargets: 2 });
  ok("tableau 4 pour 8 qual = invalide", !bracketBad.isValid);
  const bracketOk = validateBracketConfiguration({ qualifiedCount: 8, bracketSize: 8, availableTargets: 2 });
  ok("tableau 8 pour 8 qual = valide", bracketOk.isValid);
}

// ── 11) Résumés ─────────────────────────────────────────────────────────────
{
  const s = buildPoolConfigurationSummary({
    playerCount: 20,
    groups: [5, 5, 5, 5],
    qualifiersPerPool: 2,
    manches: 2,
    availableTargets: 2,
    averageMatchDuration: 10,
  });
  eq("résumé: headline", s.headline, "4 poules de 5 joueurs");
  ok("résumé: 40 matchs présent", s.lines.some((l) => l.text === "40 matchs de poules"));
  ok("résumé: 8 qualifiés présent", s.lines.some((l) => l.text.includes("8 qualifiés au total")));
  ok("résumé: tableau de 8 présent", s.lines.some((l) => l.text === "Tableau final de 8"));
  ok("résumé: aucun exempt", s.lines.some((l) => l.text === "Aucun exempt"));
  ok("résumé: durée 3 h 20", s.lines.some((l) => l.text.includes("3 h 20")));

  const b = buildBracketConfigurationSummary({
    qualifiedCount: 8,
    manchesMap: { quart: 2, demi: 3, finale: 5 },
    petiteFinale: true,
    consolante: true,
    consolationTeams: 8,
    availableTargets: 2,
  });
  eq("résumé tableau: headline", b.headline, "Tableau de 8");
  ok("résumé tableau: 7 matchs", b.lines.some((l) => l.text === "7 matchs dans le tableau principal"));
  ok("résumé tableau: petite finale", b.lines.some((l) => l.text.includes("Petite finale")));
  ok("résumé tableau: consolante 8", b.lines.some((l) => l.text.includes("Consolante de 8")));
  ok("résumé tableau: finale à 5", b.lines.some((l) => l.text.includes("Finale : premier à 5")));

  // Avec des EXEMPTS : un tableau de 8 pour 5 qualifiés ne fait jouer que 4 matchs
  // (les 3 exempts passent sans jouer), même s'il y a bien 7 cases dans le tableau.
  const bEx = buildBracketConfigurationSummary({
    qualifiedCount: 5,
    manchesMap: { quart: 2, demi: 3, finale: 5 },
    availableTargets: 2,
  });
  ok(
    "résumé tableau: 5 qualifiés → 4 matchs à jouer",
    bEx.lines.some((l) => l.text === "4 matchs à jouer dans le tableau principal (7 cases, dont 3 sans match)")
  );

  // Durée : la taille de tableau CHOISIE est prise en compte, et les exempts ne sont pas facturés.
  const dRef = estimateBracketDuration({
    qualifiedCount: 8,
    availableTargets: 2,
    manchesMap: { quart: 2, demi: 3, finale: 5 },
    averageMatchDuration: 15,
  });
  // 8 qualifiés dans un tableau de 16 : le 1er tour n'est QUE des exempts → même durée réelle.
  eq(
    "durée tableau 16 pour 8 qualifiés = durée tableau 8",
    estimateBracketDuration({
      qualifiedCount: 8,
      bracketSize: 16,
      availableTargets: 2,
      manchesMap: { quart: 2, demi: 3, finale: 5, huitieme: 2 },
      averageMatchDuration: 15,
    }),
    dRef
  );
  // 5 qualifiés (3 exempts) : strictement plus court qu'un tableau de 8 complet.
  ok(
    "durée tableau: les exempts ne comptent pas",
    estimateBracketDuration({
      qualifiedCount: 5,
      bracketSize: 8,
      availableTargets: 2,
      manchesMap: { quart: 2, demi: 3, finale: 5 },
      averageMatchDuration: 15,
    }) < dRef
  );
}

// ── 12) Ordre des matchs : mêmes matchs, moins d'enchaînements ──────────────
{
  // Poule de 4 (A,B,C,D) : 6 matchs. On vérifie qu'on garde EXACTEMENT les mêmes
  // matchs et qu'on réduit les enchaînements immédiats d'un même joueur.
  const raw = [
    { joueur1_id: "A", joueur2_id: "B", groupe: 1 },
    { joueur1_id: "A", joueur2_id: "C", groupe: 1 },
    { joueur1_id: "A", joueur2_id: "D", groupe: 1 },
    { joueur1_id: "B", joueur2_id: "C", groupe: 1 },
    { joueur1_id: "B", joueur2_id: "D", groupe: 1 },
    { joueur1_id: "C", joueur2_id: "D", groupe: 1 },
  ];
  const ordered = optimizePoolMatchOrder(raw, 1);
  eq("ordre: même nombre de matchs", ordered.length, raw.length);
  const key = (m) => [m.joueur1_id, m.joueur2_id].sort().join("-");
  eq(
    "ordre: mêmes matchs (multiset)",
    ordered.map(key).sort(),
    raw.map(key).sort()
  );
  // Compte les enchaînements où un joueur du match précédent rejoue tout de suite.
  const consecutifs = (list) => {
    let c = 0;
    for (let i = 1; i < list.length; i++) {
      const prev = [list[i - 1].joueur1_id, list[i - 1].joueur2_id];
      const cur = [list[i].joueur1_id, list[i].joueur2_id];
      if (cur.some((p) => prev.includes(p))) c++;
    }
    return c;
  };
  ok("ordre: strictement moins d'enchaînements que l'ordre brut", consecutifs(ordered) < consecutifs(raw));
  // Pour une poule de 4 (6 matchs, 4 joueurs), 0 enchaînement est IMPOSSIBLE : le
  // minimum théorique est 2. On vérifie que l'algo atteint bien ce minimum.
  ok("ordre: atteint le minimum théorique (≤ 2) pour une poule de 4", consecutifs(ordered) <= 2);
}

// ── Bilan ────────────────────────────────────────────────────────────────────
console.log(`\n${fail === 0 ? "✅" : "⚠️"} ${pass} tests OK, ${fail} échec(s).`);
if (fail > 0) process.exit(1);
