// src/sons.js
// ─────────────────────────────────────────────────────────────────────────────
// Sons "feutrés / réalistes" des GRANDS MOMENTS (180 / finish / victoire),
// synthétisés en Web Audio API : aucun fichier, marche hors-ligne, tout léger,
// zéro problème de droits d'auteur. Réglage on/off persistant dans localStorage
// ("dp_son", activé par défaut).
//
// Timbres : des cloches douces (sinus + un partiel inharmonique, attaque très
// douce, longue décroissance) et un "toc" de fléchette (bruit passe-bande bref
// + petit thud grave). Rien d'agressif.
// ─────────────────────────────────────────────────────────────────────────────

let _ctx = null;

// AudioContext paresseux : créé au premier son, "réveillé" s'il est suspendu.
// (Les navigateurs mobiles exigent un geste utilisateur : nos grands moments
// arrivent juste après un tap de saisie, donc le contexte est déjà débloqué.)
function ac() {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!_ctx) _ctx = new AC();
    if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
    return _ctx;
  } catch { return null; }
}

// ── Préférence son on/off ──
export function sonActif() {
  try { return localStorage.getItem("dp_son") !== "off"; } catch { return true; }
}
export function setSonActif(on) {
  try { localStorage.setItem("dp_son", on ? "on" : "off"); } catch { /* privé/quota */ }
  if (on) { try { ac(); } catch { /* rien */ } } // pré-débloque l'audio via le geste du clic
}

// ── Briques sonores ──

// Une note "cloche" douce : fondamentale sinus + un partiel inharmonique discret.
function cloche(ctx, out, freq, t0, dur, vol) {
  const o1 = ctx.createOscillator(); o1.type = "sine"; o1.frequency.value = freq;
  const o2 = ctx.createOscillator(); o2.type = "sine"; o2.frequency.value = freq * 2.76; // partiel de cloche
  const g1 = ctx.createGain(), g2 = ctx.createGain();
  g1.gain.setValueAtTime(0.0001, t0);
  g1.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);            // attaque douce
  g1.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);           // longue décroissance
  g2.gain.setValueAtTime(0.0001, t0);
  g2.gain.exponentialRampToValueAtTime(vol * 0.28, t0 + 0.012);
  g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.55);
  o1.connect(g1).connect(out); o2.connect(g2).connect(out);
  o1.start(t0); o2.start(t0);
  o1.stop(t0 + dur + 0.05); o2.stop(t0 + dur + 0.05);
}

// Un "toc" de fléchette : court burst de bruit passe-bande + petit thud grave.
function toc(ctx, out, t0, vol) {
  const dur = 0.08;
  const n = Math.max(1, Math.ceil(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.2);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 0.7;
  const ng = ctx.createGain(); ng.gain.value = vol;
  src.connect(bp).connect(ng).connect(out);
  src.start(t0);
  const o = ctx.createOscillator(); o.type = "sine";
  o.frequency.setValueAtTime(170, t0);
  o.frequency.exponentialRampToValueAtTime(72, t0 + 0.08);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol * 0.9, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
  o.connect(g).connect(out); o.start(t0); o.stop(t0 + 0.14);
}

// ── Les 3 grands moments (fréquences en Hz, accords majeurs = chaleureux) ──
const SONS = {
  // 180 : trio de cloches montantes (mi–sol#–si = Mi majeur), joyeux (~0,6 s).
  "180"(ctx, out, t) {
    cloche(ctx, out, 659.25, t + 0.00, 0.9, 0.50); // E5
    cloche(ctx, out, 830.61, t + 0.11, 0.9, 0.50); // G#5
    cloche(ctx, out, 987.77, t + 0.22, 1.4, 0.60); // B5
  },
  // finish : le "toc" de la fléchette qui clôt la manche + 2 cloches (~0,7 s).
  finish(ctx, out, t) {
    toc(ctx, out, t, 0.50);
    cloche(ctx, out, 783.99, t + 0.10, 0.9, 0.50); // G5
    cloche(ctx, out, 1046.50, t + 0.22, 1.3, 0.55); // C6
  },
  // victoire : petite fanfare douce, arpège Do majeur montant qui résout haut (~1,6 s).
  victoire(ctx, out, t) {
    toc(ctx, out, t, 0.35);
    cloche(ctx, out, 523.25, t + 0.06, 1.1, 0.50); // C5
    cloche(ctx, out, 659.25, t + 0.20, 1.1, 0.50); // E5
    cloche(ctx, out, 783.99, t + 0.34, 1.2, 0.50); // G5
    cloche(ctx, out, 1046.50, t + 0.50, 1.9, 0.62); // C6
    cloche(ctx, out, 1318.51, t + 0.72, 1.9, 0.42); // E6 (shimmer)
  },
};

// Joue un grand moment : "180" | "finish" | "victoire". No-op si son coupé.
export function playSon(nom) {
  if (!sonActif()) return;
  const ctx = ac();
  if (!ctx) return;
  const fn = SONS[nom];
  if (!fn) return;
  try {
    const master = ctx.createGain(); master.gain.value = 0.5;    // volume global doux
    const comp = ctx.createDynamicsCompressor();                  // évite tout clip agressif
    comp.threshold.value = -18; comp.knee.value = 20; comp.ratio.value = 3;
    comp.attack.value = 0.003; comp.release.value = 0.25;
    master.connect(comp).connect(ctx.destination);
    fn(ctx, master, ctx.currentTime + 0.02);
  } catch { /* best-effort : le son ne doit jamais casser le jeu */ }
}
