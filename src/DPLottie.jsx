// src/DPLottie.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Petit lecteur Lottie autonome pour Dart Point (autour de lottie-web).
// Les animations sont des fichiers JSON EMBARQUÉS (src/lottie/*.json) → aucun
// appel réseau, fonctionne hors-ligne (PWA), ne touche pas au quota Supabase.
// Le nom du joueur / le texte est mis en HTML par-dessus (net et dynamique).
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import lottie from "lottie-web";

// Lecteur de base : joue une animationData importée (une fois par défaut).
export function Lottie({ data, loop = false, autoplay = true, speed = 1, onComplete, style, className }) {
  const box = useRef(null);
  const anim = useRef(null);
  useEffect(() => {
    if (!box.current) return;
    anim.current = lottie.loadAnimation({
      container: box.current,
      renderer: "svg",
      loop, autoplay,
      animationData: data,
      rendererSettings: { preserveAspectRatio: "xMidYMid slice" },
    });
    if (speed !== 1) anim.current.setSpeed(speed);
    const a = anim.current;
    if (onComplete) a.addEventListener("complete", onComplete);
    return () => { try { a.destroy(); } catch { /* */ } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <div ref={box} className={className} style={style} />;
}

// Confettis plein écran NON bloquants (par-dessus un écran de victoire).
// pointerEvents:"none" → n'empêche aucun clic dessous.
export function ConfettiBurst({ data, loop = false, style }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10050, pointerEvents: "none", ...style }}>
      <Lottie data={data} loop={loop} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

// Grand moment plein écran (ex. « 180 ! ») : anim + gros texte, disparaît tout seul.
export function BigMoment({ data, title, subtitle, color = "#f97316", duration = 1700, onDone }) {
  useEffect(() => {
    const t = setTimeout(() => onDone && onDone(), duration);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, zIndex: 10060, display: "flex", alignItems: "center", justifyContent: "center", background: "#0008", pointerEvents: "auto" }}>
      <style>{`@keyframes dpBM{0%{transform:scale(.2);opacity:0}45%{transform:scale(1.25)}70%{transform:scale(.95)}100%{transform:scale(1);opacity:1}}`}</style>
      <Lottie data={data} loop={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      {title && (
        <div style={{ position: "relative", textAlign: "center", animation: "dpBM .5s cubic-bezier(.2,1.4,.4,1) both" }}>
          <div style={{ fontWeight: 900, fontSize: 76, lineHeight: 1, color, textShadow: `0 0 26px ${color}, 0 4px 12px #000` }}>{title}</div>
          {subtitle && <div style={{ fontWeight: 800, fontSize: 18, color: "#fff", marginTop: 6, textShadow: "0 2px 8px #000" }}>{subtitle}</div>}
        </div>
      )}
    </div>
  );
}
