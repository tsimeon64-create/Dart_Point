// src/botFleche.js
// ── Cerveau du « mode bot » du Scoreur ─────────────────────────────────────────
// Simule un adversaire qui joue au NIVEAU RÉEL D'UN AMI, d'après ses 10 dernières
// parties (moyenne, meilleur finish réel, meilleure volée réelle, fréquence de 180).
// Le bot ne fait JAMAIS mieux que ce que l'ami a réellement réalisé → pas de finish à
// 161 sorti de nulle part. À défaut d'historique : estimation prudente depuis le DRIX.
// Le joueur choisit donc une PERSONNE, pas un « niveau de bot ». Pur calcul, zéro dépendance.

// ── LEGEND : Lucky Tillter (bot special base sur les stats de Luke Littler) ────
// Toujours propose dans la liste des amis a affronter, meme si le joueur n'a pas
// d'ami. Ses stats viennent de dartsorakel.com/darts-nerd (12 derniers mois +
// carriere) : moyenne 101.1, best finish 170, 180s ~55% des legs, checkout 43.4%.
export const LUCKY_TILLTER_ID = "b07-1111-1111-1111-lucky-tillter";
export const LUCKY_TILLTER_INFO = {
  id: LUCKY_TILLTER_ID,
  pseudo: "Lucky Tillter",
  drix: 2900,          // Mythique (>2500) — au-dessus de tout le monde
  photo: null,
  isLegend: true,      // pour affichage special dans le picker
  bio: "Hillbilly, 101 de moyenne, 8× nine-darter",
};
export const LUCKY_TILLTER_PROFIL = {
  moyenne: 101,        // 101.17 sur 12 mois
  plafondFinish: 170,  // meilleur checkout en carriere
  plafondVolee: 180,   // il sort des 180 sans probleme
  rate180: 0.055,      // ~5.5% de 180 par volee (elite PDC)
  source: "stats",
  volees: 21000,       // ~1428 legs x 15 volees pour crediblite du 'joue a son vrai niveau'
  maxFinish: 170,
  maxVisit: 180,
};

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Numéros impossibles à finir aux fléchettes (« bogey numbers ») + hors plage.
const BOGEY = new Set([169, 168, 166, 165, 163, 162, 159]);
export const estFinissable = (n) => n >= 2 && n <= 170 && !BOGEY.has(n);

// Tirage gaussien (Box-Muller) pour une variation naturelle des volées.
function gauss(moyenne, ecart) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return moyenne + ecart * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Estime une moyenne (points / volée de 3 fléchettes) à partir du DRIX,
// quand on n'a pas assez d'historique réel. ~800 DRIX → ~30, ~2000 → ~88.
export function moyenneDepuisDrix(drix = 1000) {
  const d = Number(drix) || 1000;
  return Math.round(clamp(30 + (d - 800) * (58 / 1200), 22, 100));
}

// Analyse les 10 DERNIÈRES parties de l'ami pour en extraire son niveau réel.
// manches_detail : winner/loser (pseudos), *_moy, *_volees, *_finish, *_max, *_180.
export function statsReelles(duels, amiPseudo) {
  const recents = (duels || []).slice(0, 10); // getDuels renvoie déjà les plus récents d'abord
  let pts = 0, vol = 0, maxFinish = 0, maxVisit = 0, n180 = 0;
  for (const d of recents) {
    let md = d?.manches_detail;
    if (typeof md === "string") { try { md = JSON.parse(md); } catch { md = null; } }
    if (!Array.isArray(md)) continue;
    for (const m of md) {
      if (m.winner === amiPseudo) {
        if (m.winner_volees > 0) { pts += (m.winner_moy || 0) * m.winner_volees; vol += m.winner_volees; }
        if (m.winner_finish) maxFinish = Math.max(maxFinish, m.winner_finish); // finish réel (uniquement le gagnant finit)
        if (m.winner_max) maxVisit = Math.max(maxVisit, m.winner_max);
        n180 += m.winner_180 || 0;
      } else if (m.loser === amiPseudo) {
        if (m.loser_volees > 0) { pts += (m.loser_moy || 0) * m.loser_volees; vol += m.loser_volees; }
        if (m.loser_max) maxVisit = Math.max(maxVisit, m.loser_max);
        n180 += m.loser_180 || 0;
      }
    }
  }
  return { moyenne: vol > 0 ? pts / vol : 0, volees: vol, maxFinish, maxVisit, n180 };
}

// Construit le profil du bot. Plafonds = ce que l'ami a RÉELLEMENT fait (petite marge),
// pour ne jamais dépasser son niveau. À défaut de données : estimation depuis le DRIX.
export function calculerProfilBot({ drix, duels, amiPseudo }) {
  const s = statsReelles(duels, amiPseudo);
  if (s.volees >= 9) {
    const moy = Math.round(s.moyenne);
    return {
      moyenne: moy,
      plafondFinish: s.maxFinish > 0 ? clamp(s.maxFinish + 8, 40, 170) : clamp(moy + 25, 40, 100),
      plafondVolee:  s.maxVisit  > 0 ? clamp(s.maxVisit + 6, 60, 180)  : clamp(moy * 1.5 + 20, 80, 170),
      rate180: clamp(s.n180 / s.volees, 0, 0.08),
      source: "stats", volees: s.volees, maxFinish: s.maxFinish, maxVisit: s.maxVisit,
    };
  }
  const moy = moyenneDepuisDrix(drix);
  return {
    moyenne: moy,
    plafondFinish: clamp(moy + 25, 40, 100),   // prudent : on ne connaît pas son meilleur finish
    plafondVolee:  clamp(moy * 1.5 + 20, 80, 170),
    rate180: clamp((moy - 60) / 1500, 0, 0.04),
    source: "drix", volees: 0,
  };
}

// Probabilité que le bot réussisse son checkout (finir sur un double) ce tour-ci.
function probaCheckout(remaining, moy) {
  let p = clamp((moy - 24) / 120, 0.06, 0.6);     // niveau global (plancher 6 %)
  if (remaining <= 40) p = clamp(p * 2.0, 0.13, 0.85); // double direct, au moins 13 %
  else if (remaining <= 60) p *= 1.4;
  else if (remaining <= 100) p *= 1.0;
  else p *= 0.5;                                   // gros checkout, plus dur
  return clamp(p, 0.05, 0.85);
}

// Doubles « cibles » qu'un joueur vise pour finir (du plus gros au plus petit).
const DOUBLES = [40, 32, 24, 20, 16, 12, 8, 4, 2];

// Une volée « normale » (hors checkout), autour de la moyenne, plafonnée à la meilleure
// volée réelle de l'ami (un joueur qui n'a jamais fait 140 ne fera pas 180 ici).
function tirerVolee(moy, plafond, rate180) {
  if (plafond >= 170 && Math.random() < (rate180 || 0)) return 180; // 180 seulement s'il en fait
  let g = gauss(moy, 20);
  if (Math.random() < 0.10) g = gauss(moy * 0.5, 14); // parfois une volée ratée
  return clamp(Math.round(g), 1, Math.max(20, plafond));
}

// Génère le score d'une volée du bot pour un score restant donné.
// Retourne un nombre 1..180+ ; si === remaining → finish ; si > remaining → bust.
export function genererScoreBot(remaining, profil) {
  const moy = clamp(profil?.moyenne ?? 45, 18, 130);
  const plafondFinish = profil?.plafondFinish ?? 100;
  const plafondVolee  = profil?.plafondVolee ?? 140;
  const rate180 = profil?.rate180 ?? 0;

  // 1) Checkout — UNIQUEMENT dans la limite réaliste du joueur (jamais au-dessus de son meilleur finish réel).
  if (estFinissable(remaining) && remaining <= plafondFinish && Math.random() < probaCheckout(remaining, moy)) {
    return remaining;
  }

  // 2) Fin de leg (score bas) : « poser » pour laisser un bon double — JAMAIS de bust-loop.
  if (remaining <= 70) {
    const laisse = DOUBLES.find((d) => d <= remaining - 2);
    if (laisse == null) return remaining <= plafondFinish ? remaining : 1; // remaining <= 3
    let score = remaining - laisse;
    if (Math.random() < 0.35) score = Math.max(1, score - (1 + Math.floor(Math.random() * 8))); // rate un peu sa cible
    return clamp(score, 1, remaining - 2);
  }

  // 3) Volée « normale », loin de la fin.
  let score = tirerVolee(moy, plafondVolee, rate180);
  if (score > remaining - 2) {
    if (Math.random() < 0.06) return remaining + 1 + Math.floor(Math.random() * 10); // bust occasionnel réaliste
    score = Math.max(2, remaining - 2 - Math.floor(Math.random() * 30));              // sinon, rester prudent
  }
  return clamp(Math.round(score), 1, 180);
}
