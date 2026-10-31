// ── La moyenne d'un joueur sur ses N DERNIERS matchs ─────────────────────────
// Affichée dans la liste des bots : sa forme du moment parle plus que la moyenne
// de toute sa carrière (demande de Thomas, octobre 2026).
//
// Même calcul que la « moyenne réelle » du profil (analyserJoueur, AppJoueurs.jsx),
// mais limité aux N derniers duels terminés de 501 / 301 :
//   - la moyenne de chaque manche, pondérée par son nombre de volées ;
//   - à défaut de détail des manches, la moyenne de ses scores de duel.
//
// ⚠️ Doit rester IDENTIQUE aux colonnes avg_10 / n_10 de la vue SQL v_analyse_joueurs
// (bots_1_vue_analyse.sql) : mêmes duels, même ordre (date puis id, du plus récent
// au plus ancien), arrondis exacts (division en DERNIER, sur des entiers).
//
// duels : les duels TERMINÉS du joueur, du plus récent au plus ancien.
export const MATCHS_RECENTS = 10;

// Un duel de Cricket n'a pas de moyenne (ni détail de manches, ni score) : il ne prend
// pas une des 10 places, sinon « sur ses 10 derniers matchs » mentirait.
// (Vue SQL : coalesce(mode, '') <> 'Cricket'.)
export const compteDansLaMoyenne = (d) => d?.mode !== "Cricket";

export const moyenneDerniersMatchs = ({ joueurId, pseudo = "", duels = [], n = MATCHS_RECENTS }) => {
  const recents = (duels || []).filter(compteDansLaMoyenne).slice(0, n);
  let sumMoyW = 0, volMoy = 0;
  for (const d of recents) {
    const isChal = d.challenger_id === joueurId;
    const myP = isChal ? (d.challenger_pseudo || pseudo) : (d.defie_pseudo || pseudo);
    for (const m of (Array.isArray(d.manches_detail) ? d.manches_detail : [])) {
      const isW = m.winner === myP || m.winner === pseudo;
      const vol = (isW ? m.winner_volees : m.loser_volees) || 0;
      const moy = (isW ? m.winner_moy : m.loser_moy) || 0;
      // en dix-millièmes entiers (exact), comme analyserJoueur
      if (moy > 0) { sumMoyW += Math.round(moy * 10000) * Math.max(1, vol); volMoy += Math.max(1, vol); }
    }
  }
  if (volMoy > 0) return { moyenne: Math.round(sumMoyW / (10000 * volMoy)), nbMatchs: recents.length };

  // Repli : ses scores de duel (> 0), en centièmes entiers puis arrondis à 1 décimale,
  // comme round(round(avg, 1)) dans la vue.
  const scores = recents
    .map((d) => parseFloat(d.challenger_id === joueurId ? d.score_challenger : d.score_defie))
    .filter((sc) => !isNaN(sc) && sc > 0);
  if (!scores.length) return { moyenne: null, nbMatchs: recents.length };
  const moy1 = Math.round(scores.reduce((a, b) => a + Math.round(b * 100), 0) / (scores.length * 10)) / 10;
  return { moyenne: Math.round(moy1), nbMatchs: recents.length };
};

// Le petit texte sous la moyenne : « sur ses 10 derniers matchs », « sur ses 4 derniers
// matchs », « sur son seul match » — « tes » quand c'est le joueur lui-même.
export const texteDerniersMatchs = (n, soiMeme = false) => {
  const ses = soiMeme ? "tes" : "ses";
  const son = soiMeme ? "ton" : "son";
  if (n <= 1) return `sur ${son} seul match`;
  return `sur ${ses} ${Math.min(n, MATCHS_RECENTS)} derniers matchs`;
};
