// Test de la disponibilité des joueurs (miroir de la logique de matchsSurCibles dans AppTournoiPotes.jsx).
// Règle : on ne rappelle jamais un joueur déjà en train de scorer un match en live,
//         et un match en cours reste "actif" (affiché) sans être doublé.
// Lancer :  node src/dispo.test.mjs

// Reproduit les boucles 0 / 0bis / 1 de matchsSurCibles (on lui passe 'ordered' déjà trié).
function select(ordered, nbCibles, live = null) {
  const occupe = id => !!live && !!live.occ && (live.occ.has(id) || live.occ.has(String(id)));
  const enCours = m => !!live && !!live.pairs && live.pairs.has([String(m.joueur1_id), String(m.joueur2_id)].sort().join("|"));
  const busy = new Set(), actifs = new Set();
  for (const m of ordered) { // 0) verrouille les matchs en cours
    if (enCours(m) && !busy.has(m.joueur1_id) && !busy.has(m.joueur2_id)) {
      actifs.add(m.id); busy.add(m.joueur1_id); busy.add(m.joueur2_id);
    }
  }
  for (const m of ordered) { // 0bis) tout joueur occupé est indisponible
    if (occupe(m.joueur1_id)) busy.add(m.joueur1_id);
    if (occupe(m.joueur2_id)) busy.add(m.joueur2_id);
  }
  for (const m of ordered) { // 1) remplit les cibles restantes
    if (actifs.size >= nbCibles) break;
    if (actifs.has(m.id)) continue;
    if (busy.has(m.joueur1_id) || busy.has(m.joueur2_id)) continue;
    actifs.add(m.id); busy.add(m.joueur1_id); busy.add(m.joueur2_id);
  }
  return actifs;
}

let ko = 0;
const check = (label, cond) => { console.log(`${cond ? "OK  " : "ÉCHEC"} — ${label}`); if (!cond) ko++; };

// Y joue déjà le match M3 (contre Z) en live. X vient de finir et pourrait être appelé pour M2 (X vs Y).
const M2 = { id: "M2", joueur1_id: "X", joueur2_id: "Y" };
const M3 = { id: "M3", joueur1_id: "Y", joueur2_id: "Z" };
const M4 = { id: "M4", joueur1_id: "W", joueur2_id: "V" };
const ordered = [M2, M3, M4]; // M2 trié en premier (X & Y ont peu joué) — c'est le cas piégeux

// AVANT (sans info live) : le bug — M2 est annoncé alors que Y joue déjà M3.
{
  const a = select(ordered, 2, null);
  check("(sans correctif) M2 serait annoncé à tort", a.has("M2"));
}

// APRÈS (avec info live) : Y est occupé sur M3 → M2 n'est PAS annoncé, M3 reste actif.
{
  const live = { occ: new Set(["Y", "Z"]), pairs: new Set([["Y", "Z"].sort().join("|")]) };
  const a = select(ordered, 2, live);
  check("Y occupé → M2 (X vs Y) N'EST PAS annoncé", !a.has("M2"));
  check("le match en cours M3 reste actif (affiché)", a.has("M3"));
  check("un match libre (M4) est quand même proposé", a.has("M4"));
  check("X n'est appelé pour aucun match tant que Y joue", ![...a].some(id => id === "M2"));
}

// Deux joueurs occupés sur des matchs DIFFÉRENTS ne créent pas de faux "match en cours".
{
  // A joue contre C (live), B joue contre D (live). Le match pending (A vs B) ne doit PAS être pinné.
  const AB = { id: "AB", joueur1_id: "A", joueur2_id: "B" };
  const live = { occ: new Set(["A", "B", "C", "D"]), pairs: new Set([["A", "C"].sort().join("|"), ["B", "D"].sort().join("|")]) };
  const a = select([AB], 2, live);
  check("A et B occupés ailleurs → (A vs B) n'est PAS marqué en cours", !a.has("AB"));
}

console.log(ko === 0 ? "\n✅ Tous les tests passent." : `\n❌ ${ko} test(s) en échec.`);
process.exit(ko === 0 ? 0 : 1);
