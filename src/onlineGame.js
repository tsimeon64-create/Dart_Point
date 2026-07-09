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
export function reduceGameOnline(volleys, opts) {
  const { startScore = 501, manchesToWin = 1, starterId, players } = opts || {};
  const [a, b] = players || [];
  const mk = () => ({ reste: startScore, manches: 0, tours: [], flechettes: 0, totalPoints: 0, busts: 0 });
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
    p.flechettes += 3;
    if (newReste === 0) {
      // FINISH → gagne la manche
      p.tours.push(val); p.totalPoints += val; p.manches += 1;
      manchesHistory.push({ winnerId: pid, finish: val, manche });
      lastEvent = { type: "finish", joueur_id: pid, val };
      if (p.manches >= manchesToWin) { winnerId = pid; break; }
      // nouvelle manche : restes remis à zéro, le starter alterne
      st[a].reste = startScore; st[b].reste = startScore;
      manche += 1;
      turn = players[(starterIdx + (manche - 1)) % 2];
    } else if (newReste < 0 || newReste === 1) {
      // BUST → 0 point, reste inchangé, joueur suivant
      p.tours.push(0); p.busts += 1;
      lastEvent = { type: "bust", joueur_id: pid, val };
      turn = other(pid);
    } else {
      // volée normale
      p.tours.push(val); p.totalPoints += val; p.reste = newReste;
      lastEvent = { type: "score", joueur_id: pid, val };
      turn = other(pid);
    }
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
    winner: nameOf(m.winnerId),
    loser: nameOf(m.winnerId === cId ? dId : cId),
    winner_finish: m.finish || 0,
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
