// src/botFleche.js
// ── Cerveau du « mode bot » du Scoreur ─────────────────────────────────────────
// Simule un adversaire qui joue au NIVEAU D'UN AMI, d'après ses vraies stats
// (moyenne de points par volée de 3 fléchettes) ou, à défaut, son DRIX.
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

// Reconstitue la moyenne RÉELLE de l'ami depuis l'historique de ses duels.
// manches_detail contient winner/loser (pseudos), winner_moy/loser_moy, *_volees.
export function moyenneReelle(duels, amiPseudo) {
  let pts = 0, vol = 0;
  for (const d of (duels || [])) {
    let md = d?.manches_detail;
    if (typeof md === "string") { try { md = JSON.parse(md); } catch { md = null; } }
    if (!Array.isArray(md)) continue;
    for (const m of md) {
      if (m.winner === amiPseudo && m.winner_volees > 0) { pts += (m.winner_moy || 0) * m.winner_volees; vol += m.winner_volees; }
      else if (m.loser === amiPseudo && m.loser_volees > 0) { pts += (m.loser_moy || 0) * m.loser_volees; vol += m.loser_volees; }
    }
  }
  return vol >= 9 ? { moyenne: pts / vol, volees: vol } : null; // au moins 9 volées pour être fiable
}

// Construit le profil du bot : { moyenne, source: "stats" | "drix", volees }.
export function calculerProfilBot({ drix, duels, amiPseudo }) {
  const reel = moyenneReelle(duels, amiPseudo);
  if (reel) return { moyenne: Math.round(reel.moyenne), source: "stats", volees: reel.volees };
  return { moyenne: moyenneDepuisDrix(drix), source: "drix", volees: 0 };
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

// Une volée « normale » (hors checkout), autour de la moyenne de l'ami.
function tirerVolee(moy) {
  if (Math.random() < clamp((moy - 60) / 800, 0, 0.05)) return 180; // 180 : croît avec le niveau
  let g = gauss(moy, 20);
  if (Math.random() < 0.10) g = gauss(moy * 0.5, 14); // parfois une volée ratée
  return clamp(Math.round(g), 1, 180);
}

// Génère le score d'une volée du bot pour un score restant donné.
// Retourne un nombre 1..180+ ; si === remaining → c'est un finish ; si > remaining → bust.
export function genererScoreBot(remaining, profil) {
  const moy = clamp(profil?.moyenne ?? 45, 18, 130);

  // 1) Tentative de checkout (finir sur un double), selon le niveau.
  if (estFinissable(remaining) && Math.random() < probaCheckout(remaining, moy)) {
    return remaining;
  }

  // 2) Fin de leg (score bas) : « poser » pour laisser un bon double — JAMAIS de bust-loop.
  if (remaining <= 70) {
    const laisse = DOUBLES.find((d) => d <= remaining - 2);
    if (laisse == null) return remaining; // remaining <= 3 : on retente le finish (sinon coincé)
    let score = remaining - laisse;
    if (Math.random() < 0.35) score = Math.max(1, score - (1 + Math.floor(Math.random() * 8))); // rate un peu sa cible
    return clamp(score, 1, remaining - 2);
  }

  // 3) Volée « normale », loin de la fin.
  let score = tirerVolee(moy);
  if (score > remaining - 2) {
    if (Math.random() < 0.06) return remaining + 1 + Math.floor(Math.random() * 10); // bust occasionnel réaliste
    score = Math.max(2, remaining - 2 - Math.floor(Math.random() * 30));              // sinon, rester prudent
  }
  return clamp(Math.round(score), 1, 180);
}
