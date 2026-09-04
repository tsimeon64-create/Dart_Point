// src/arcadeEffets.jsx
// ───────────────────────────────────────────────────────────────────────────
// ARCADE — la boîte à outils visuelle (étape 3 du cahier des charges).
// Boîte cadeau, explosions à 4 niveaux, particules, flashs, tampons, secousses,
// vibrations. Aucune règle de jeu ici : uniquement de l'effet.
//
// ⚠️ TOUT EST EN CSS ET EN SVG, jamais en canvas ni en boucle JavaScript.
// Le point 71 demande 60 images par seconde sur un téléphone moyen : seules les
// propriétés `transform` et `opacity` sont animées, les seules que le téléphone
// sait traiter sans repeindre la page.
//
// ⚠️ ORIGINALITÉ. Le cahier des charges (point 45) demande explicitement de ne
// PAS reprendre une boîte de licence existante. La boîte ci-dessous est dessinée
// à la main : cube en perspective, ruban en croix, gros point d'interrogation.
// ───────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from "react";

// ── Réglage des vibrations (points 73) ──────────────────────────────────────
const CLE_VIB = "dp_arcade_vibrations";
export const vibrationsActives = () => {
  try { return localStorage.getItem(CLE_VIB) !== "0"; } catch { return true; }
};
export const reglerVibrations = (on) => {
  try { localStorage.setItem(CLE_VIB, on ? "1" : "0"); } catch { /* ignore */ }
};

// Chaque évènement a sa signature (point 73). Le son viendra se brancher ici
// plus tard (point 74 : rien pour l'instant, mais la place est prête).
const MOTIFS = {
  petit:      [18],
  super:      [22, 40, 22],
  mega:       [40, 50, 80],
  legendaire: [30, 40, 30, 40, 120],
  malus:      [70],
  bust:       [90],
  victoire:   [50, 60, 50, 60, 180],
  clic:       [8],
};
export const vibrer = (type) => {
  if (!vibrationsActives()) return;
  try { navigator.vibrate?.(MOTIFS[type] || 15); } catch { /* ignore */ }
};

// ── Les animations, injectées une seule fois ────────────────────────────────
export const StylesArcade = () => (
  <style>{`
    @keyframes arcFlotte   { 0%,100%{ transform:translateY(0) rotate(-2deg) } 50%{ transform:translateY(-7px) rotate(2deg) } }
    @keyframes arcTremble  { 0%,100%{ transform:translate(0,0) rotate(0) } 20%{ transform:translate(-3px,1px) rotate(-3deg) } 40%{ transform:translate(3px,-1px) rotate(3deg) } 60%{ transform:translate(-2px,-2px) rotate(-2deg) } 80%{ transform:translate(2px,2px) rotate(2deg) } }
    @keyframes arcArrivee  { 0%{ transform:scale(.2) translateY(-40px); opacity:0 } 55%{ transform:scale(1.18) translateY(6px); opacity:1 } 78%{ transform:scale(.94) } 100%{ transform:scale(1) translateY(0); opacity:1 } }
    @keyframes arcEclate   { 0%{ transform:scale(1); opacity:1 } 100%{ transform:scale(2.4); opacity:0 } }
    @keyframes arcOnde     { 0%{ transform:scale(.2); opacity:.9 } 100%{ transform:scale(3.4); opacity:0 } }
    @keyframes arcFlash    { 0%{ opacity:0 } 12%{ opacity:.85 } 100%{ opacity:0 } }
    @keyframes arcCarte    { 0%{ transform:scale(.5) rotate(-8deg); opacity:0 } 60%{ transform:scale(1.1) rotate(3deg); opacity:1 } 100%{ transform:scale(1) rotate(0); opacity:1 } }
    @keyframes arcRayons   { 0%{ transform:rotate(0); opacity:0 } 25%{ opacity:.5 } 100%{ transform:rotate(180deg); opacity:0 } }
    @keyframes arcSecousse { 0%,100%{ transform:translate(0,0) } 15%{ transform:translate(-6px,3px) } 30%{ transform:translate(6px,-3px) } 45%{ transform:translate(-5px,-4px) } 60%{ transform:translate(5px,4px) } 80%{ transform:translate(-2px,1px) } }
    @keyframes arcPulse    { 0%,100%{ transform:scale(1); filter:none } 50%{ transform:scale(1.06); filter:drop-shadow(0 0 14px currentColor) } }
    @keyframes arcTampon   { 0%{ transform:scale(2.6) rotate(-18deg); opacity:0 } 45%{ transform:scale(.92) rotate(-11deg); opacity:1 } 60%{ transform:scale(1.06) rotate(-11deg) } 100%{ transform:scale(1) rotate(-11deg); opacity:1 } }
    @keyframes arcMonte    { 0%{ transform:translateY(14px); opacity:0 } 100%{ transform:translateY(0); opacity:1 } }
    @keyframes arcFile     { 0%{ transform:translate(0,0) scale(1); opacity:1 } 85%{ opacity:1 } 100%{ transform:translate(var(--dx),var(--dy)) scale(.5); opacity:0 } }
    @keyframes arcBrille   { 0%{ transform:translateX(-120%) skewX(-18deg) } 55%,100%{ transform:translateX(320%) skewX(-18deg) } }
    /* Respiration du cadre autour du score quand un pouvoir est arme. Volontairement
       LENTE et discrete : c'est un rappel permanent, pas un clignotant. */
    @keyframes arcHalo     { 0%,100%{ filter:brightness(1) } 50%{ filter:brightness(1.16) } }

    /* Le point 71 demande de rester fluide. Un joueur qui a demandé « moins
       d'animations » dans son téléphone doit voir le jeu se calmer, pas ramer. */
    @media (prefers-reduced-motion: reduce) {
      .arc-anim, .arc-anim * { animation-duration:.001ms !important; animation-iteration-count:1 !important; }
    }
  `}</style>
);

// ── Particules : de simples pastilles qui partent en étoile ─────────────────
// Le nombre est volontairement bas (point 71 : pas de particules permanentes,
// pas d'effets lourds simultanés).
export const Etincelles = ({ n = 10, couleur = "#fbbf24", taille = 6, rayon = 90, duree = 700 }) => (
  <div className="arc-anim" aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2;
      return (
        <span key={i} style={{
          position: "absolute", left: "50%", top: "50%", width: taille, height: taille,
          marginLeft: -taille / 2, marginTop: -taille / 2, borderRadius: "50%",
          background: couleur, boxShadow: `0 0 ${taille}px ${couleur}`,
          "--dx": `${Math.cos(a) * rayon}px`, "--dy": `${Math.sin(a) * rayon}px`,
          animation: `arcFile ${duree}ms cubic-bezier(.2,.7,.3,1) ${i * 12}ms both`,
        }} />
      );
    })}
  </div>
);

// ── Explosion à 4 niveaux (point 69) ────────────────────────────────────────
// 1 : petit évènement · 2 : super cadeau, attaque · 3 : méga, bombe · 4 : légendaire, victoire
// Ne JAMAIS mettre un niveau 3 sur une action banale : l'effet perd tout son sens.
export const Explosion = ({ niveau = 1, couleur = "#f97316" }) => (
  <div className="arc-anim" aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
    <span style={{
      position: "absolute", left: "50%", top: "50%", width: 60, height: 60, margin: "-30px 0 0 -30px",
      borderRadius: "50%", background: `radial-gradient(circle,${couleur}ee,${couleur}00 70%)`,
      animation: "arcEclate 480ms ease-out both",
    }} />
    {niveau >= 2 && (
      <span style={{
        position: "absolute", left: "50%", top: "50%", width: 70, height: 70, margin: "-35px 0 0 -35px",
        borderRadius: "50%", border: `3px solid ${couleur}`, animation: "arcOnde 700ms ease-out both",
      }} />
    )}
    <Etincelles n={niveau >= 3 ? 16 : niveau >= 2 ? 12 : 8} couleur={couleur}
      taille={niveau >= 3 ? 8 : 6} rayon={niveau >= 3 ? 130 : 90} duree={niveau >= 3 ? 900 : 700} />
    {niveau >= 3 && (
      <span style={{
        position: "absolute", left: "50%", top: "50%", width: 220, height: 220, margin: "-110px 0 0 -110px",
        borderRadius: "50%", background: `radial-gradient(circle,#ffffff22,transparent 65%)`,
        animation: "arcEclate 900ms ease-out 60ms both",
      }} />
    )}
    {niveau >= 4 && (
      <span style={{
        position: "absolute", left: "50%", top: "50%", width: 320, height: 320, margin: "-160px 0 0 -160px",
        background: `conic-gradient(from 0deg,${couleur}00,${couleur}88,${couleur}00,${couleur}88,${couleur}00)`,
        borderRadius: "50%", animation: "arcRayons 1600ms linear both",
      }} />
    )}
  </div>
);

// ── Flash plein écran (bust, impact) ────────────────────────────────────────
export const FlashEcran = ({ couleur = "#ef4444", duree = 420 }) => (
  <div className="arc-anim" aria-hidden style={{
    position: "absolute", inset: 0, background: couleur, pointerEvents: "none",
    zIndex: 900, animation: `arcFlash ${duree}ms ease-out both`,
  }} />
);

// ── La boîte cadeau (point 45) ──────────────────────────────────────────────
// Cube en perspective + ruban + gros « ? ». Elle flotte au repos, tremble quand
// le cadeau est de grande valeur, puis disparaît en s'ouvrant.
export const BoiteCadeau = ({ taille = 110, couleur = "#a78bfa", etat = "flotte" }) => {
  const anim = etat === "tremble" ? "arcTremble 260ms ease-in-out infinite"
    : etat === "arrive" ? "arcArrivee 520ms cubic-bezier(.2,1.4,.4,1) both"
    : "arcFlotte 2.6s ease-in-out infinite";
  return (
    <div className="arc-anim" aria-hidden style={{ position: "relative", width: taille, height: taille, animation: anim }}>
      {/* halo */}
      <span style={{
        position: "absolute", inset: "-30%", borderRadius: "50%",
        background: `radial-gradient(circle,${couleur}44,transparent 65%)`,
      }} />
      <svg viewBox="0 0 100 100" width={taille} height={taille} style={{ position: "relative", display: "block" }}>
        <defs>
          <linearGradient id="arcFace" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={couleur} stopOpacity="0.95" />
            <stop offset="100%" stopColor={couleur} stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id="arcCote" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={couleur} stopOpacity="0.55" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {/* dessus (perspective) */}
        <path d="M50 8 L92 26 L50 44 L8 26 Z" fill={couleur} opacity="0.9" />
        {/* face gauche */}
        <path d="M8 26 L50 44 L50 92 L8 72 Z" fill="url(#arcCote)" />
        {/* face droite */}
        <path d="M92 26 L50 44 L50 92 L92 72 Z" fill="url(#arcFace)" />
        {/* ruban */}
        <path d="M50 8 L50 92" stroke="#fff" strokeOpacity="0.75" strokeWidth="5" />
        <path d="M8 26 L92 26" stroke="#fff" strokeOpacity="0.45" strokeWidth="4" />
        {/* le gros point d'interrogation, sur la face droite */}
        <text x="68" y="76" textAnchor="middle" fontSize="30" fontWeight="900"
          fill="#fff" opacity="0.95" style={{ fontFamily: "Inter,sans-serif" }}>?</text>
      </svg>
      {/* reflet qui balaye la boîte : c'est lui qui donne l'impression de relief */}
      <span style={{
        position: "absolute", inset: 0, overflow: "hidden", borderRadius: 10, pointerEvents: "none",
      }}>
        <span style={{
          position: "absolute", top: 0, bottom: 0, width: "35%",
          background: "linear-gradient(90deg,transparent,#ffffff55,transparent)",
          animation: "arcBrille 2.8s ease-in-out infinite",
        }} />
      </span>
    </div>
  );
};

// ── Tampon (« VOLÉE ANNULÉE », « BUST ! ») ──────────────────────────────────
export const Tampon = ({ texte, couleur = "#ef4444" }) => (
  <div className="arc-anim" aria-hidden style={{
    position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
    pointerEvents: "none", zIndex: 950,
  }}>
    <div style={{
      border: `5px solid ${couleur}`, color: couleur, borderRadius: 12,
      padding: "8px 18px", fontWeight: 900, fontSize: 30, letterSpacing: 1,
      background: "#0b0713dd", boxShadow: `0 0 30px ${couleur}66`,
      animation: "arcTampon 520ms cubic-bezier(.2,1.6,.4,1) both",
    }}>{texte}</div>
  </div>
);

// ── La carte-projectile qui part vers un adversaire (point 56) ──────────────
// On ne calcule aucune position : la carte traverse simplement l'écran vers le
// bas-droite, là où sont affichés les adversaires. Simple, lisible, et ça ne
// casse pas si la liste défile.
export const Projectile = ({ icone, couleur = "#ef4444", onDone, duree = 620 }) => {
  useEffect(() => {
    const t = setTimeout(() => onDone?.(), duree);
    return () => clearTimeout(t);
  }, [duree, onDone]);
  return (
    <div className="arc-anim" aria-hidden style={{
      position: "absolute", inset: 0, pointerEvents: "none", zIndex: 940,
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
        background: `linear-gradient(135deg,${couleur},#0b0713)`, border: `2px solid ${couleur}`,
        boxShadow: `0 0 26px ${couleur}aa`, fontSize: 26,
        "--dx": "0px", "--dy": "220px",
        animation: `arcFile ${duree}ms cubic-bezier(.4,0,.8,.6) both`,
      }}>{icone}</div>
    </div>
  );
};

// ── Secousse de l'écran ─────────────────────────────────────────────────────
// Renvoie une classe à poser sur le conteneur plein écran. Se retire toute
// seule : une secousse qui reste accrochée rendrait le clavier inutilisable.
export const useSecousse = () => {
  const [actif, setActif] = useState(false);
  const t = useRef(null);
  const secouer = (ms = 420) => {
    setActif(true);
    clearTimeout(t.current);
    t.current = setTimeout(() => setActif(false), ms);
  };
  useEffect(() => () => clearTimeout(t.current), []);
  return [actif ? { animation: "arcSecousse 420ms ease-in-out both" } : null, secouer];
};

// ── Aides contextuelles déjà vues (point 14) ────────────────────────────────
// Chaque explication ne s'affiche qu'UNE fois, puis l'interface s'allège.
const CLE_AIDE = (k) => `dp_arcade_vu_${k}`;
export const aideDejaVue = (k) => {
  try { return localStorage.getItem(CLE_AIDE(k)) === "1"; } catch { return true; }
};
export const marquerAideVue = (k) => {
  try { localStorage.setItem(CLE_AIDE(k), "1"); } catch { /* ignore */ }
};
export const oublierLesAides = () => {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith("dp_arcade_vu_")).forEach((k) => localStorage.removeItem(k));
  } catch { /* ignore */ }
};

// Petite bulle d'explication, avec un seul bouton « Compris » (point 13).
export const Bulle = ({ texte, onCompris }) => (
  <div className="arc-anim" style={{
    position: "absolute", left: 12, right: 12, bottom: "calc(14px + env(safe-area-inset-bottom))",
    zIndex: 960, background: "#1a0f2e", border: "1px solid #a78bfa88", borderRadius: 16,
    padding: "13px 14px", boxShadow: "0 12px 34px #000b",
    animation: "arcMonte 260ms ease-out both",
  }}>
    <div style={{ fontSize: 13.5, color: "#e2e8f0", lineHeight: 1.45, marginBottom: 10 }}>{texte}</div>
    <button onClick={onCompris} style={{
      width: "100%", minHeight: 42, borderRadius: 11, border: "none", cursor: "pointer",
      background: "#a78bfa", color: "#0b0713", fontWeight: 900, fontSize: 13.5,
    }}>Compris</button>
  </div>
);
