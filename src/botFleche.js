// src/botFleche.js
// ── Cerveau du « mode bot » du Scoreur ─────────────────────────────────────────
// Simule un adversaire qui joue au NIVEAU RÉEL D'UN AMI, d'après ses 10 dernières
// parties (moyenne, meilleur finish réel, meilleure volée réelle, fréquence de 180).
// Le bot ne fait JAMAIS mieux que ce que l'ami a réellement réalisé → pas de finish à
// 161 sorti de nulle part. À défaut d'historique : estimation prudente depuis le DRIX.
// Le joueur choisit donc une PERSONNE, pas un « niveau de bot ». Pur calcul, zéro dépendance.

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

// Analyse fine des VRAIES volées d'un joueur pour COLLER à son jeu :
//  • sa distribution de descentes (scoringPool) → le bot jette les mêmes scores que lui
//  • son taux de finish PAR ZONE (rateZone) → il finit comme lui selon la distance au double
//  • son taux de bust réel (bustRate) → il buste comme lui
// Astuce : pour chaque volée, "avant" = le score restant AVANT de la jouer = reste + score
// (ou reste si bust). Pas besoin de reconstruire les legs, c'est exact volée par volée.
function analyseReplay(volees) {
  const ZONES = [[2, 40], [41, 70], [71, 100], [101, 170]]; // zones de checkout (distance au double)
  const att = [0, 0, 0, 0], conv = [0, 0, 0, 0];
  let attG = 0, convG = 0, busts = 0, total = 0;
  const scoringPool = [], finishPool = [];
  for (const v of volees) {
    const isBust = v.score === -1;
    const avant = isBust ? v.reste : v.reste + v.score; // score restant AVANT la volée
    total++;
    if (isBust) busts++;
    if (!isBust && avant > 0 && avant <= 170 && estFinissable(avant)) {
      attG++; if (v.reste === 0) convG++;                       // tentative de finish depuis un nombre finissable
      const zi = ZONES.findIndex(([a, b]) => avant >= a && avant <= b);
      if (zi >= 0) { att[zi]++; if (v.reste === 0) conv[zi]++; }
    }
    if (!isBust && v.reste !== 0 && v.score > 0) scoringPool.push({ s: v.score, a: avant }); // vraies descentes (score + distance)
    if (!isBust && v.reste === 0 && v.score > 0) finishPool.push(v.score);  // vrais finishes
  }
  const globalRate = attG >= 6 ? clamp(convG / attG, 0.05, 0.85) : 0.22;
  const PRIOR = 4; // lissage : une zone avec peu de données penche vers le taux global (évite le bruit)
  const rateZone = ZONES.map((_, i) => clamp((conv[i] + globalRate * PRIOR) / (att[i] + PRIOR), 0.03, 0.9));
  const bustRate = clamp(busts / Math.max(1, total), 0, 0.14);
  return { scoringPool, finishPool, rateZone, zones: ZONES, bustRate, globalRate };
}

// Construit le profil du bot. 3 niveaux de réalisme, du meilleur au plus prudent :
//  1) REPLAY : si on a ses VRAIES volées (live_volees), le bot rejoue ses lancers exacts.
//  2) STATS  : sinon, modèle statistique calé sur ses 10 derniers matchs (manches_detail).
//  3) DRIX   : sinon, estimation depuis son classement.
export function calculerProfilBot({ drix, duels, amiPseudo, volees }) {
  // ── 1) MODE REPLAY (le plus réaliste) ──
  if (Array.isArray(volees) && volees.length >= 25) {
    const scoring = volees.filter((v) => v.reste !== 0 && v.score > 0).map((v) => v.score); // lancers de scoring (hors finish, hors bust, hors tour blanc à 0)
    const finishes = volees.filter((v) => v.reste === 0 && v.score > 0).map((v) => v.score); // finishes réels
    const valides = volees.map((v) => v.score).filter((s) => s >= 0);
    if (scoring.length >= 15) {
      const moy = Math.round(valides.reduce((a, b) => a + b, 0) / (valides.length || 1));
      const A = analyseReplay(volees);
      return {
        mode: "replay",
        moyenne: moy,
        scoringVolleys: A.scoringPool, // [{ s: score, a: distance }] pour piocher selon la situation
        maxFinish: finishes.length ? Math.max(...finishes) : Math.max(60, moy),
        checkoutRate: A.globalRate,   // taux de checkout global (repli)
        rateZone: A.rateZone,         // taux de finish PAR zone → colle à son jeu
        zones: A.zones,
        bustRate: A.bustRate,         // il buste comme lui
        source: "volees", volees: volees.length,
      };
    }
  }

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

// ── Bots « CHAMPIONS » : profils FIXES calés sur de vraies stats de pros (pas d'historique).
// Le générateur générique respecte alors checkoutRate (VRAI % de checkout) et moyenneOuverture
// (les 3 premières volées d'un leg sont plus hautes). Réglé pour un vrai niveau, zéro score farfelu.
// Valeurs de scoring CALÉES par simulation (4000+ legs) pour que le jeu RÉALISÉ colle à
// Luke Littler : moyenne 3 fléch. ≈ 96 (≈101 « papier », Dart Point compte par fléchette),
// checkout ≈ 43 %, ~4,4 % de 180, finish jusqu'à 170, ~15,7 fléch./leg. Zéro score farfelu.
export const BOT_LUCKY_LITTLER = {
  source: "champion",
  moyenne: 122,          // scoring calé → moy. réalisée ≈ 96 (Littler 101,1 « papier »)
  moyenneOuverture: 134, // les 3 premières volées plus hautes (moy. 9 fléch. ~111)
  checkoutRate: 0.43,    // checkout réel 43,4 %
  plafondFinish: 170,    // plus haut checkout : 170
  plafondVolee: 180,     // il sort des 180
  rate180: 0.075,        // fréquence de 180 très élevée (783 sur 12 mois)
  bustRate: 0.03,
};

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

// Taux de checkout RÉEL pour un score restant (selon la zone), pour coller à son jeu.
function rateCheckout(profil, remaining) {
  if (Array.isArray(profil.rateZone) && Array.isArray(profil.zones)) {
    const zi = profil.zones.findIndex(([a, b]) => remaining >= a && remaining <= b);
    if (zi >= 0) return profil.rateZone[zi];
  }
  return profil.checkoutRate ?? 0.28;
}

// MODE REPLAY : le bot rejoue le JEU RÉEL de l'ami — ses descentes (mêmes scores, même
// distribution), ses finishes (son vrai taux de réussite par zone) et ses busts.
// Un checkout n'arrive jamais au-dessus de son meilleur finish réel. Le plus humain possible.
function genererScoreReplay(remaining, profil) {
  const scoring = profil.scoringVolleys || [];
  const maxFinish = profil.maxFinish || 100;
  const bustRate = profil.bustRate ?? 0.05;
  const moy = profil.moyenne || 45;

  // ── ZONE DE FINISH : il tente le checkout à SON vrai taux (qui dépend de la distance au double) ──
  if (estFinissable(remaining) && remaining <= 170 && remaining <= maxFinish) {
    if (Math.random() < rateCheckout(profil, remaining)) return remaining; // il finit comme lui 🎯
    // Il ne finit pas ce tour-ci :
    if (remaining <= 50) {
      // Double direct : parfois il buste en tentant, sinon rate sec (0) ou laisse un petit double.
      if (Math.random() < bustRate) return remaining + 1 + Math.floor(Math.random() * 8);
      const pZero = clamp(0.5 - (moy - 30) * 0.008, 0.12, 0.5); // un bon joueur rate moins « sec »
      if (Math.random() < pZero) return 0;
      const laisse = DOUBLES.find((d) => d <= remaining - 2);
      return laisse == null ? 0 : remaining - laisse;
    }
    // 51+ : il POSE pour se laisser un bon double (parfois un bust, jamais un 0 sec).
    if (Math.random() < bustRate * 0.6) return remaining + 1 + Math.floor(Math.random() * 8);
    const laisse = DOUBLES.find((d) => d <= remaining - 2);
    return laisse != null ? remaining - laisse : (remaining <= maxFinish ? remaining : 1);
  }

  // ── ZONE DE SCORE : il rejoue une VRAIE descente jouée dans une situation PROCHE (même distance),
  //    pour coller à sa façon de scorer (grosses volées loin du but, plus posé en approche) ──
  const pool = scoring; // [{ s: score, a: distance }]
  let cand = pool.filter((p) => p.s <= remaining - 2 && p.a >= remaining - 70); // volées jouées à distance comparable
  if (cand.length < 5) cand = pool.filter((p) => p.s <= remaining - 2);         // repli : toutes ses volées sûres
  if (cand.length) {
    if (remaining <= 200 && Math.random() < bustRate * 0.5
        && pool.some((p) => p.s > remaining - 2 && p.s <= remaining + 15)) {
      return remaining + 1; // il vise gros et buste, exactement comme dans ses vraies parties
    }
    return cand[(Math.random() * cand.length) | 0].s;
  }
  const laisse = DOUBLES.find((d) => d <= remaining - 2);
  if (laisse == null) return remaining <= maxFinish ? remaining : 1;
  return remaining - laisse;
}

// Génère le score d'une volée du bot pour un score restant donné.
// Retourne un nombre 1..180+ ; si === remaining → finish ; si > remaining → bust.
export function genererScoreBot(remaining, profil) {
  if (profil?.mode === "replay") return genererScoreReplay(remaining, profil); // rejoue les vraies volées
  const moy = clamp(profil?.moyenne ?? 45, 18, 130);
  const plafondFinish = profil?.plafondFinish ?? 100;
  const plafondVolee  = profil?.plafondVolee ?? 140;
  const rate180 = profil?.rate180 ?? 0;
  // Les 3 premières volées d'un leg sont plus hautes chez les pros (moy. 9 fléchettes).
  const moyEff = (remaining > 250 && profil?.moyenneOuverture) ? clamp(profil.moyenneOuverture, 18, 130) : moy;

  // 1) Checkout — soit un VRAI % imposé (bots champions, modulé par la distance au double),
  //    soit dérivé de la moyenne. Jamais au-dessus du meilleur finish réaliste.
  const pCheck = profil?.checkoutRate != null
    ? clamp(profil.checkoutRate * (remaining <= 40 ? 1.3 : remaining <= 60 ? 1.1 : remaining <= 100 ? 0.85 : 0.4), 0.03, 0.9)
    : probaCheckout(remaining, moy);
  if (estFinissable(remaining) && remaining <= plafondFinish && Math.random() < pCheck) {
    return remaining;
  }

  // 2) Fin de leg (score bas) : « poser » pour laisser un bon double — JAMAIS de bust-loop.
  if (remaining <= 70) {
    // Plus le joueur est fort, plus il SCORE en posant (laisse un petit double 16/8) au lieu
    // de laisser D20 tranquille → une pose de champion enlève beaucoup plus de points.
    const fort = profil?.checkoutRate != null && profil.checkoutRate >= 0.35;
    const table = fort ? [16, 8, 32, 24, 40, 20, 12, 4, 2] : DOUBLES;
    const laisse = table.find((d) => d <= remaining - 2);
    if (laisse == null) return remaining <= plafondFinish ? remaining : 1; // remaining <= 3
    let score = remaining - laisse;
    if (Math.random() < 0.35) score = Math.max(1, score - (1 + Math.floor(Math.random() * 8))); // rate un peu sa cible
    return clamp(score, 1, remaining - 2);
  }

  // 3) Volée « normale », loin de la fin.
  let score = tirerVolee(moyEff, plafondVolee, rate180);
  if (score > remaining - 2) {
    if (Math.random() < 0.06) return remaining + 1 + Math.floor(Math.random() * 10); // bust occasionnel réaliste
    score = Math.max(2, remaining - 2 - Math.floor(Math.random() * 30));              // sinon, rester prudent
  }
  return clamp(Math.round(score), 1, 180);
}
