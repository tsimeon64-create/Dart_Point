// ── Les 10 DERNIÈRES MANCHES DRIX d'un joueur ────────────────────────────────
// Choix de Thomas (novembre 2026, option « B ») : tout ce qui touche au bot d'un joueur
// part de ses 10 dernières manches jouées en match DRIX :
//   - la moyenne affichée dans la liste des bots (« MOY ») ;
//   - les manches que son bot rejoue (botFleche.js, manchesDrixDepuisVolees) ;
//   - le modèle de repli du bot quand ses volées manquent (statsReelles).
//
// Un « match DRIX » = un vrai duel contre un vrai adversaire qui compte pour le DRIX :
// type 'drix' ou 'rivalite', statut 'termine', en 501 ou 301. PAS le Cricket (pas de
// moyenne), PAS l'amical, PAS les parties contre un bot ni les parties libres (elles ne
// sont pas dans la table duels).
//
// ⚠️ Doit rester IDENTIQUE aux colonnes avg_10 / n_10 de la vue SQL v_analyse_joueurs
// (bots_2_moyenne_10_manches.sql) : mêmes duels, même ordre (date puis id du duel, du plus
// récent au plus ancien ; dans un duel, la dernière manche d'abord), arrondi exact
// (division en DERNIER, sur des entiers).
export const MANCHES_RECENTES = 10;
export const TYPES_DRIX = ["drix", "rivalite"];
export const MODES_AVEC_MOYENNE = ["501", "301"];

// Ce duel fait-il partie de ses « matchs DRIX » ? (Vue SQL : statut = 'termine',
// type in ('drix','rivalite'), mode in ('501','301').)
export const duelDrixCompte = (d) =>
  !!d && d.statut === "termine" && TYPES_DRIX.includes(d.type) && MODES_AVEC_MOYENNE.includes(String(d.mode));

// Du plus récent au plus ancien : date décroissante (sans date = tout au bout), puis id
// décroissant pour départager deux duels à la même milliseconde — comme la vue
// (order by date desc nulls last, duel_id desc) et getDuels (order=date.desc,id.desc).
const dateDe = (d) => (d?.date == null || d.date === "" || isNaN(Number(d.date)) ? -Infinity : Number(d.date));
export const trierDuelsRecents = (duels) => [...(duels || [])].sort((a, b) => {
  const da = dateDe(a), db = dateDe(b);
  if (da !== db) return db > da ? 1 : -1;
  const ia = String(a?.id ?? ""), ib = String(b?.id ?? "");
  return ia === ib ? 0 : ib > ia ? 1 : -1;
});

// Ses N dernières manches DRIX, LA PLUS RÉCENTE D'ABORD. Chaque manche :
//   { duel, index (sa place dans duel.manches_detail), isW (il l'a gagnée), moy, vol, m }
// On reconnaît le joueur par le pseudo enregistré dans le duel (il a pu changer de pseudo
// depuis), comme la fiche profil. Une manche sans moyenne (> 0) ne prend pas une des
// 10 places : « sur ses 10 dernières manches » doit dire vrai.
// `depuis` : sa remise à zéro des stats (joueurs.stats_reset_at, v135) — tout ce qui est
// plus ancien est ignoré, comme dans la vue.
export const dernieresManchesDrix = ({ joueurId = null, pseudo = "", duels = [], n = MANCHES_RECENTES, depuis = 0 } = {}) => {
  const out = [];
  const seuil = Number(depuis) || 0;
  for (const d of trierDuelsRecents((duels || []).filter(duelDrixCompte))) {
    if (out.length >= n) break;
    if (seuil && (Number(d.date) || 0) < seuil) continue;
    const md = Array.isArray(d.manches_detail) ? d.manches_detail : [];
    // Son côté : par l'id quand on l'a, sinon par le pseudo.
    const isChal = joueurId != null ? String(d.challenger_id) === String(joueurId) : d.challenger_pseudo === pseudo;
    const myP = isChal ? (d.challenger_pseudo || pseudo) : (d.defie_pseudo || pseudo);
    for (let i = md.length - 1; i >= 0 && out.length < n; i--) {
      const m = md[i];
      if (!m || typeof m !== "object") continue;
      const isW = m.winner === myP || m.winner === pseudo;
      const vol = Number((isW ? m.winner_volees : m.loser_volees) || 0) || 0;
      const moy = Number((isW ? m.winner_moy : m.loser_moy) || 0) || 0;
      if (moy > 0) out.push({ duel: d, index: i, isW, moy, vol, m });
    }
  }
  return out;
};

// La moyenne MONTRÉE dans la liste des bots : celle de ses 10 dernières manches DRIX,
// chaque manche pondérée par son nombre de volées (comme la « moyenne réelle » du profil).
// En dix-millièmes entiers puis division en dernier : 57,5 donne bien 58, comme en SQL.
export const moyenneDernieresManches = ({ joueurId = null, pseudo = "", duels = [], n = MANCHES_RECENTES, depuis = 0 } = {}) => {
  const manches = dernieresManchesDrix({ joueurId, pseudo, duels, n, depuis });
  let sumMoyW = 0, volMoy = 0;
  for (const l of manches) {
    const poids = Math.max(1, l.vol);
    sumMoyW += Math.round(l.moy * 10000) * poids;
    volMoy += poids;
  }
  return { moyenne: volMoy > 0 ? Math.round(sumMoyW / (10000 * volMoy)) : null, nbManches: manches.length };
};

// Le petit texte sous la moyenne : « sur ses 10 dernières manches », « sur ses 4 dernières
// manches », « sur sa seule manche » — « tes » / « ta » quand c'est le joueur lui-même.
export const texteDernieresManches = (n, soiMeme = false) => {
  if (n <= 1) return `sur ${soiMeme ? "ta" : "sa"} seule manche`;
  return `sur ${soiMeme ? "tes" : "ses"} ${Math.min(n, MANCHES_RECENTES)} dernières manches`;
};
