// src/onlineGame.js
// ─────────────────────────────────────────────────────────────────────────────
// Logique PURE de la partie EN LIGNE (501 / 301).
// Les deux téléphones écrivent leurs volées dans `live_volees` (journal partagé,
// session_id = id du duel). Chaque téléphone REJOUE ce journal avec la même
// fonction → état identique des deux côtés, sans serveur de jeu.
//
// Une volée du journal : { joueur_id, numero_volee, score, date }
//   score = points marqués sur les 3 fléchettes (0..180). Le bust/finish est
//   déduit ici (le joueur saisit juste ce qu'il a marqué, comme sur le scoreur).
// ─────────────────────────────────────────────────────────────────────────────

// Rejoue le journal et renvoie l'état courant de la partie.
// opts : { startScore, manchesToWin, starterId, players:[idA, idB] }
// Encodage des fléchettes : pour une volée de FINISH, le champ `reste` stocke le
// nombre de fléchettes utilisées (1..3) au lieu de 0 (0 étant recalculé). Ça évite
// une colonne SQL en plus. Toute autre volée = 3 fléchettes.
export function reduceGameOnline(volleys, opts) {
  const { startScore = 501, manchesToWin = 1, starterId, players } = opts || {};
  const [a, b] = players || [];
  const mk = () => ({ reste: startScore, manches: 0, tours: [], flechettes: 0, totalPoints: 0, busts: 0, scorePrecedent: null, mStartPts: 0, mStartFlech: 0, mStartTours: 0 });
  const cnt = (arr, min, max = 999) => arr.filter(v => v >= min && v <= max).length;
  const st = { [a]: mk(), [b]: mk() };
  const other = (id) => (id === a ? b : a);
  const starterIdx = Math.max(0, players.indexOf(starterId));
  let manche = 1;
  let turn = players[starterIdx];
  let winnerId = null;
  let lastEvent = null; // { type:'score'|'bust'|'finish', joueur_id, val }
  const manchesHistory = [];

  const sorted = [...(volleys || [])].sort(
    (x, y) => ((x.numero_volee || 0) - (y.numero_volee || 0)) || ((x.date || 0) - (y.date || 0))
  );

  for (const v of sorted) {
    if (winnerId) break;
    const pid = v.joueur_id;
    const p = st[pid];
    if (!p) continue;
    const val = Math.max(0, Math.min(180, Math.round(Number(v.score) || 0)));
    const newReste = p.reste - val;
    p.scorePrecedent = val;
    if (newReste === 0) {
      // FINISH → gagne la manche. `reste` porte le nb de fléchettes (1..3).
      const darts = Math.max(1, Math.min(3, Math.round(Number(v.reste)) || 3));
      p.flechettes += darts; p.tours.push(val); p.totalPoints += val; p.manches += 1;
      // Détail de la manche (pour le post Comptoir)
      const oppId = other(pid); const opp = st[oppId];
      const wT = p.tours.slice(p.mStartTours), lT = opp.tours.slice(opp.mStartTours);
      const wFlech = p.flechettes - p.mStartFlech, lFlech = opp.flechettes - opp.mStartFlech;
      const wPts = p.totalPoints - p.mStartPts, lPts = opp.totalPoints - opp.mStartPts;
      manchesHistory.push({
        winnerId: pid, loserId: oppId, finish: val, manche,
        winner_180: cnt(wT, 180), winner_140plus: cnt(wT, 140, 179), winner_100plus: cnt(wT, 100, 139),
        winner_max: wT.length ? Math.max(...wT) : 0, winner_moy: wFlech > 0 ? Math.round(wPts / wFlech * 3) : 0, winner_volees: Math.round(wFlech / 3),
        loser_180: cnt(lT, 180), loser_max: lT.length ? Math.max(...lT) : 0, loser_moy: lFlech > 0 ? Math.round(lPts / lFlech * 3) : 0, reste_loser: opp.reste,
      });
      lastEvent = { type: "finish", joueur_id: pid, val };
      if (p.manches >= manchesToWin) { winnerId = pid; break; }
      // nouvelle manche : restes remis à zéro, le starter alterne
      st[a].reste = startScore; st[b].reste = startScore;
      st[a].mStartPts = st[a].totalPoints; st[a].mStartFlech = st[a].flechettes; st[a].mStartTours = st[a].tours.length;
      st[b].mStartPts = st[b].totalPoints; st[b].mStartFlech = st[b].flechettes; st[b].mStartTours = st[b].tours.length;
      manche += 1;
      turn = players[(starterIdx + (manche - 1)) % 2];
    } else if (newReste < 0 || newReste === 1) {
      // BUST → 0 point, reste inchangé, 3 fléchettes, joueur suivant
      p.flechettes += 3; p.tours.push(0); p.busts += 1;
      lastEvent = { type: "bust", joueur_id: pid, val };
      turn = other(pid);
    } else {
      // volée normale (val=0 = NO SCORE)
      p.flechettes += 3; p.tours.push(val); p.totalPoints += val; p.reste = newReste;
      lastEvent = { type: "score", joueur_id: pid, val };
      turn = other(pid);
    }
  }

  // moyenne 3 fléch. de la manche en cours, par joueur
  for (const id of [a, b]) {
    const p = st[id];
    const f = p.flechettes - p.mStartFlech;
    p.mancheMoy = f > 0 ? Math.round((p.totalPoints - p.mStartPts) / f * 3 * 10) / 10 : 0;
  }

  return { players: st, turn, manche, winnerId, manchesHistory, lastEvent, nbVolleys: sorted.length };
}

// Fusionne le journal local (avec volées optimistes) et les lignes du serveur.
// Clé = numero_volee (unique car une seule personne joue à la fois).
export function mergeVolleys(prev, incoming) {
  const map = new Map();
  for (const v of prev || []) map.set(v.numero_volee, v);
  for (const v of incoming || []) map.set(v.numero_volee, v); // le serveur écrase l'optimiste
  return [...map.values()].sort(
    (a, b) => ((a.numero_volee || 0) - (b.numero_volee || 0)) || ((a.date || 0) - (b.date || 0))
  );
}

// Moyenne 3 fléchettes d'un joueur (on compte 3 fléchettes par volée).
export function moyenneJoueur(p) {
  return p && p.flechettes > 0 ? Math.round((p.totalPoints / p.flechettes) * 3) : 0;
}

// Prépare les données attendues par finaliserDuel / calculerXP à partir de l'état final.
export function buildFinalizationData(state, duel) {
  const cId = duel.challenger_id, dId = duel.defie_id;
  const pC = state.players[cId], pD = state.players[dId];
  const nomC = duel.challenger_pseudo, nomD = duel.defie_pseudo;
  const nameOf = (id) => (id === cId ? nomC : nomD);
  const manchesDetail = (state.manchesHistory || []).map((m) => ({
    winner: nameOf(m.winnerId), loser: nameOf(m.loserId ?? (m.winnerId === cId ? dId : cId)),
    winner_finish: m.finish || 0,
    winner_180: m.winner_180 || 0, winner_140plus: m.winner_140plus || 0, winner_100plus: m.winner_100plus || 0,
    winner_max: m.winner_max || 0, winner_moy: m.winner_moy || 0, winner_volees: m.winner_volees || 0,
    loser_180: m.loser_180 || 0, loser_max: m.loser_max || 0, loser_moy: m.loser_moy || 0, reste_loser: m.reste_loser ?? 0,
  }));
  const joueursData = [
    { nom: nomC, manchesGagnees: pC.manches, tours: pC.tours, flechettes: pC.flechettes, totalPoints: pC.totalPoints, score: pC.reste },
    { nom: nomD, manchesGagnees: pD.manches, tours: pD.tours, flechettes: pD.flechettes, totalPoints: pD.totalPoints, score: pD.reste },
  ];
  return {
    gagnantId: state.winnerId,
    gagnantNom: nameOf(state.winnerId),
    scoreC: pC.manches,
    scoreD: pD.manches,
    moyC: moyenneJoueur(pC),
    moyD: moyenneJoueur(pD),
    manchesDetail,
    joueursData,
  };
}
