import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Timer, CheckCircle, X, Trophy, Star, TrendingUp, RotateCcw, Clock } from "lucide-react";
import { C } from "./theme";

// ── Cibles : D1…D20 + Bull + D-Bull ──────────────────────────────────────────
const TARGETS = [
  ...Array.from({ length: 20 }, (_, i) => ({
    label: `Double ${i + 1}`,
    short: `D${i + 1}`,
    zone:  i + 1,
    color: i < 10 ? "#f97316" : "#a78bfa",
  })),
  { label: "Bull",        short: "Bull",   zone: 25, color: "#22c55e" },
  { label: "Double Bull", short: "D-Bull", zone: 50, color: "#ef4444" },
];

// ── Formatage chrono ──────────────────────────────────────────────────────────
const fmtMs = (ms) => {
  if (ms == null) return "—";
  const s = (ms / 1000).toFixed(2);
  const min = Math.floor(ms / 60000);
  const sec = ((ms % 60000) / 1000).toFixed(2).padStart(5, "0");
  return min > 0 ? `${min}:${sec}` : `${s}s`;
};

// ── Composant principal ───────────────────────────────────────────────────────
export const HorlogeDouble = ({ setPage }) => {
  const [phase, setPhase]         = useState("intro");      // intro|running|confirming|between|results
  const [targetIdx, setTargetIdx] = useState(0);
  const [chronoStart, setChronoStart] = useState(null);
  const [elapsed, setElapsed]     = useState(0);
  const [savedTime, setSavedTime] = useState(null);         // temps figé au moment du "Je l'ai !!!"
  const [results, setResults]     = useState([]);           // { target, darts, missCount, timeMs }
  const [lastResult, setLastResult] = useState(null);
  const [currentDarts, setCurrentDarts] = useState(0);     // fléchettes déjà lancées sur la cible en cours
  const [missFlash, setMissFlash]   = useState(false);      // flash rouge après un miss
  const timerRef = useRef(null);

  const target = TARGETS[targetIdx];

  // ── Tick chrono ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === "running" && chronoStart) {
      timerRef.current = setInterval(() => setElapsed(Date.now() - chronoStart), 50);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, chronoStart]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleStart = () => {
    const now = Date.now();
    setChronoStart(now);
    setElapsed(0);
    setPhase("running");
  };

  const handleHit = () => {
    const t = Date.now() - chronoStart;
    clearInterval(timerRef.current);
    setSavedTime(t);
    setElapsed(t);
    setPhase("confirming");  // demande combien de fléchettes
  };

  const handleConfirmDarts = (darts) => {
    const totalDarts = currentDarts + darts;
    const missCount  = Math.floor(currentDarts / 3);
    const res = { target, darts: totalDarts, missCount, timeMs: savedTime };
    const newResults = [...results, res];
    setResults(newResults);
    setLastResult(res);
    setCurrentDarts(0);
    if (targetIdx === TARGETS.length - 1) { setPhase("results"); return; }
    setTargetIdx(i => i + 1);
    setPhase("between");
  };

  const handleMiss = () => {
    // On reste sur la même cible — on ajoute 3 fléchettes au compteur
    setCurrentDarts(d => d + 3);
    setMissFlash(true);
    setTimeout(() => setMissFlash(false), 500);
  };

  const reset = () => {
    clearInterval(timerRef.current);
    setPhase("intro"); setTargetIdx(0); setResults([]);
    setLastResult(null); setElapsed(0); setChronoStart(null);
    setSavedTime(null); setCurrentDarts(0); setMissFlash(false);
  };

  // ── Calculs résultats ───────────────────────────────────────────────────────
  const calcStats = () => {
    const totalDarts   = results.reduce((s, r) => s + r.darts, 0);
    const totalTime    = results.reduce((s, r) => s + r.timeMs, 0);
    const totalMisses  = results.reduce((s, r) => s + (r.missCount || 0), 0);
    // Précision = volées réussies / total volées  (chaque hit = 1 bonne volée, chaque miss = 1 volée ratée)
    const totalVolees  = results.length + totalMisses;
    const pctHit       = totalVolees > 0 ? Math.round((results.length / totalVolees) * 100) : 100;

    // Favori : double réussi avec le meilleur score (peu de fléchettes + rapide)
    const favori = results.length > 0
      ? results.reduce((best, r) =>
          (r.darts * 5 + r.timeMs / 1000) < (best.darts * 5 + best.timeMs / 1000) ? r : best
        )
      : null;

    // Point faible : double le plus coûteux (beaucoup de misses ou lent)
    const pointFaible = results.length > 0
      ? results.reduce((worst, r) =>
          (r.darts * 5 + r.timeMs / 1000) > (worst.darts * 5 + worst.timeMs / 1000) ? r : worst
        )
      : null;

    return { totalMisses, pctHit, totalDarts, totalTime, favori, pointFaible };
  };

  // ── Rendu ────────────────────────────────────────────────────────────────────
  const wrap = (children) => (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px", paddingBottom: 80 }}>
      <button onClick={() => setPage("jeux-sans")}
        style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", marginBottom:16, fontSize:13, display:"flex", alignItems:"center", gap:6, padding:0 }}>
        <ArrowLeft size={16}/> Retour
      </button>
      {children}
    </div>
  );

  // ── INTRO ────────────────────────────────────────────────────────────────────
  if (phase === "intro") return wrap(
    <>
      <h1 style={{ fontWeight:900, fontSize:24, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
        <Clock size={24} color="#a78bfa"/> Horloge Double
      </h1>
      <p style={{ color:C.muted, fontSize:13, marginBottom:24, lineHeight:1.6 }}>
        Enchaîne les doubles de 1 à 20, puis Bull et Double Bull. Le chrono se lance à chaque cible.
      </p>

      {/* Règles */}
      <div style={{ background:"#0d0d0d", border:"1px solid #a78bfa33", borderRadius:16, padding:20, marginBottom:24 }}>
        <div style={{ fontWeight:800, fontSize:14, color:"#a78bfa", marginBottom:14, display:"flex", alignItems:"center", gap:7 }}>
          <Star size={14} color="#a78bfa"/> RÈGLES
        </div>
        {[
          ["Je l'ai !!!", "Tu vises le double — quand tu le touches, appuie immédiatement."],
          ["1 / 2 / 3",  "Indique sur quelle fléchette tu l'as réussi."],
          ["Miss",       "Tu as lancé 3 fléchettes et raté. On reste sur le même double — 3 fléchettes comptabilisées, le chrono continue."],
          ["Cibles",     "D1 → D2 → … → D20 → Bull → Double Bull."],
        ].map(([k, v]) => (
          <div key={k} style={{ display:"flex", gap:12, marginBottom:12 }}>
            <span style={{ background:"#a78bfa22", border:"1px solid #a78bfa55", borderRadius:8, padding:"2px 10px", fontWeight:800, fontSize:12, color:"#a78bfa", flexShrink:0, alignSelf:"flex-start" }}>{k}</span>
            <span style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.5 }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Aperçu cibles */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:28 }}>
        {TARGETS.map((t, i) => (
          <span key={i} style={{ background:`${t.color}18`, border:`1px solid ${t.color}44`, borderRadius:8, padding:"3px 9px", fontSize:11, fontWeight:700, color:t.color }}>
            {t.short}
          </span>
        ))}
      </div>

      <button onClick={handleStart}
        style={{ width:"100%", background:"linear-gradient(135deg,#a78bfa,#7c3aed)", border:"none", color:"#fff", borderRadius:16, padding:"18px", fontSize:18, fontWeight:900, cursor:"pointer", boxShadow:"0 6px 30px rgba(168,85,247,0.4)", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
        <Timer size={22}/> Lancer la session
      </button>
    </>
  );

  // ── RUNNING ──────────────────────────────────────────────────────────────────
  if (phase === "running") return wrap(
    <>
      {/* Flash rouge sur miss */}
      {missFlash && (
        <div style={{ position:"fixed", inset:0, background:"rgba(239,68,68,0.18)", pointerEvents:"none", zIndex:9999, borderRadius:"inherit" }}/>
      )}

      {/* Progression */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <span style={{ fontSize:13, color:C.muted }}>{targetIdx + 1} / {TARGETS.length}</span>
        <div style={{ display:"flex", gap:3 }}>
          {TARGETS.map((t, i) => (
            <div key={i} style={{ width:6, height:6, borderRadius:"50%",
              background: i < targetIdx ? "#22c55e" : i === targetIdx ? target.color : "#2a2a2a" }}/>
          ))}
        </div>
      </div>

      {/* Cible actuelle */}
      <div style={{ background:`linear-gradient(135deg,${target.color}22,${target.color}08)`, border:`2px solid ${missFlash?"#ef4444":target.color}66`, borderRadius:24, padding:"36px 24px", textAlign:"center", marginBottom:16, boxShadow:`0 0 40px ${target.color}22`, transition:"border-color .15s" }}>
        <div style={{ fontSize:12, color:C.muted, fontWeight:700, letterSpacing:1, marginBottom:10 }}>CIBLE</div>
        <div style={{ fontWeight:900, fontSize:52, color:target.color, lineHeight:1, marginBottom:6 }}>{target.short}</div>
        <div style={{ fontSize:16, color:"#cbd5e1" }}>{target.label}</div>
        {/* Chrono */}
        <div style={{ marginTop:20, fontWeight:900, fontSize:36, color:"#fff", fontVariantNumeric:"tabular-nums", display:"flex", alignItems:"center", justifyContent:"center", gap:10 }}>
          <Timer size={24} color={target.color}/> {fmtMs(elapsed)}
        </div>
      </div>

      {/* Compteur fléchettes déjà lancées */}
      {currentDarts > 0 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, background:"#7f1d1d44", border:"1px solid #ef444455", borderRadius:12, padding:"8px 14px", marginBottom:14 }}>
          <X size={13} color="#ef4444"/>
          <span style={{ fontSize:13, color:"#fca5a5", fontWeight:700 }}>
            {currentDarts} fléchette{currentDarts > 1 ? "s" : ""} déjà lancée{currentDarts > 1 ? "s" : ""} · {Math.floor(currentDarts / 3)} miss
          </span>
        </div>
      )}

      {/* Bouton JE L'AI */}
      <button onClick={handleHit}
        style={{ width:"100%", background:"linear-gradient(135deg,#22c55e,#16a34a)", border:"none", color:"#fff", borderRadius:16, padding:"22px", fontSize:22, fontWeight:900, cursor:"pointer", boxShadow:"0 6px 30px rgba(34,197,94,0.45)", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:10, touchAction:"manipulation" }}>
        <CheckCircle size={26}/> Je l'ai !!!
      </button>

      {/* Bouton MISS */}
      <button onClick={handleMiss}
        style={{ width:"100%", background:"#1a1a1a", border:"2px solid #ef444444", color:"#ef4444", borderRadius:14, padding:"16px", fontSize:16, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, touchAction:"manipulation" }}>
        <X size={18}/> Miss — 3 fléchettes, on recommence
      </button>
    </>
  );

  // ── CONFIRMING (combien de fléchettes ?) ─────────────────────────────────────
  if (phase === "confirming") return wrap(
    <>
      <div style={{ textAlign:"center", marginBottom:28 }}>
        <div style={{ marginBottom:4, display:"flex", justifyContent:"center" }}><CheckCircle size={52} color="#22c55e"/></div>
        <div style={{ fontWeight:800, fontSize:20, marginBottom:4 }}>{target.label} réussi !</div>
        <div style={{ fontSize:28, fontWeight:900, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          <Timer size={22} color="#a78bfa"/> {fmtMs(savedTime)}
        </div>
      </div>

      <div style={{ background:"#0d0d0d", border:`1px solid ${target.color}44`, borderRadius:16, padding:24, marginBottom:20 }}>
        <div style={{ fontWeight:800, fontSize:16, textAlign:"center", marginBottom:20, color:"#cbd5e1" }}>
          En combien de fléchettes ?
        </div>
        <div style={{ display:"flex", gap:12 }}>
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => handleConfirmDarts(n)}
              style={{ flex:1, background:`linear-gradient(135deg,${target.color},${target.color}cc)`, border:"none", color:"#fff", borderRadius:14, padding:"24px 0", fontSize:28, fontWeight:900, cursor:"pointer", boxShadow:`0 4px 20px ${target.color}44`, touchAction:"manipulation" }}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  // ── BETWEEN (récap cible + suivante) ─────────────────────────────────────────
  if (phase === "between") {
    const next = TARGETS[targetIdx];
    return wrap(
      <>
        {/* Récap dernière cible */}
        {lastResult && (
          <div style={{ background:"#14532d44", border:"1px solid #22c55e44", borderRadius:14, padding:16, marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
            <CheckCircle size={26} color="#22c55e"/>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:800, fontSize:15, color:"#22c55e" }}>
                {lastResult.target.label} — réussi en {lastResult.darts} fléchette{lastResult.darts>1?"s":""}
                {lastResult.missCount > 0 && <span style={{ color:"#f97316", fontSize:13 }}> · {lastResult.missCount} miss</span>}
              </div>
              <div style={{ fontSize:13, color:C.muted, marginTop:2 }}>
                <Timer size={11} style={{ display:"inline", marginRight:4 }}/>{fmtMs(lastResult.timeMs)}
              </div>
            </div>
          </div>
        )}

        {/* Prochaine cible */}
        <div style={{ background:`linear-gradient(135deg,${next.color}18,${next.color}08)`, border:`2px solid ${next.color}55`, borderRadius:20, padding:"28px 24px", textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:11, color:C.muted, fontWeight:700, letterSpacing:1, marginBottom:10 }}>PROCHAINE CIBLE</div>
          <div style={{ fontWeight:900, fontSize:56, color:next.color, lineHeight:1, marginBottom:4 }}>{next.short}</div>
          <div style={{ fontSize:15, color:"#cbd5e1" }}>{next.label}</div>
        </div>

        <button onClick={handleStart}
          style={{ width:"100%", background:`linear-gradient(135deg,${next.color},${next.color}cc)`, border:"none", color:"#fff", borderRadius:16, padding:"18px", fontSize:18, fontWeight:900, cursor:"pointer", boxShadow:`0 6px 28px ${next.color}44`, display:"flex", alignItems:"center", justifyContent:"center", gap:10, touchAction:"manipulation" }}>
          <Timer size={20}/> Départ
        </button>
      </>
    );
  }

  // ── RESULTS ──────────────────────────────────────────────────────────────────
  if (phase === "results") {
    const { totalMisses, pctHit, totalDarts, totalTime, favori, pointFaible } = calcStats();
    return wrap(
      <>
        <h1 style={{ fontWeight:900, fontSize:22, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
          <Trophy size={22} color="#f59e0b"/> Résultats
        </h1>
        <p style={{ color:C.muted, fontSize:13, marginBottom:20 }}>Session Horloge Double terminée · {TARGETS.length} doubles réussis</p>

        {/* Stats globales */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:20 }}>
          {[
            { label:"Misses",      value:totalMisses,  color:"#ef4444" },
            { label:"Précision",   value:`${pctHit}%`, color:"#f59e0b" },
            { label:"Fléchettes",  value:totalDarts,   color:"#a78bfa" },
          ].map(s => (
            <div key={s.label} style={{ background:"#0d0d0d", border:`1px solid ${s.color}33`, borderRadius:14, padding:"14px 8px", textAlign:"center" }}>
              <div style={{ fontWeight:900, fontSize:22, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:4, fontWeight:700, letterSpacing:.5 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Temps total */}
        <div style={{ background:"#0d0d0d", border:"1px solid #ffffff11", borderRadius:14, padding:16, marginBottom:20, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, color:C.muted, fontSize:13 }}>
            <Timer size={15}/> Temps total
          </div>
          <div style={{ fontWeight:900, fontSize:20, color:"#fff" }}>{fmtMs(totalTime)}</div>
        </div>

        {/* Favori + Point faible */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
          {favori && (
            <div style={{ background:"#14532d22", border:"1px solid #22c55e44", borderRadius:14, padding:16, textAlign:"center" }}>
              <Star size={18} color="#22c55e" style={{ marginBottom:6 }}/>
              <div style={{ fontSize:10, color:"#22c55e", fontWeight:700, letterSpacing:.5, marginBottom:6 }}>DOUBLE FAVORI</div>
              <div style={{ fontWeight:900, fontSize:26, color:"#22c55e" }}>{favori.target.short}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{fmtMs(favori.timeMs)} · {favori.darts} fléchette{favori.darts>1?"s":""}</div>
            </div>
          )}
          {pointFaible && (
            <div style={{ background:"#7f1d1d22", border:"1px solid #ef444444", borderRadius:14, padding:16, textAlign:"center" }}>
              <TrendingUp size={18} color="#ef4444" style={{ marginBottom:6 }}/>
              <div style={{ fontSize:10, color:"#ef4444", fontWeight:700, letterSpacing:.5, marginBottom:6 }}>À TRAVAILLER</div>
              <div style={{ fontWeight:900, fontSize:26, color:"#ef4444" }}>{pointFaible.target.short}</div>
              <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>
                {fmtMs(pointFaible.timeMs)} · {pointFaible.darts} fl.{pointFaible.missCount > 0 ? ` · ${pointFaible.missCount} miss` : ""}
              </div>
            </div>
          )}
        </div>

        {/* Détail par double */}
        <div style={{ background:"#0d0d0d", border:"1px solid #ffffff11", borderRadius:16, overflow:"hidden", marginBottom:24 }}>
          <div style={{ padding:"14px 18px", borderBottom:"1px solid #1a1a1a", fontWeight:800, fontSize:14, display:"flex", alignItems:"center", gap:7 }}>
            <Clock size={14} color={C.muted}/> Détail par double
          </div>
          {results.map((r, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 18px", borderBottom:i<results.length-1?"1px solid #0f0f0f":"none", background: r === favori ? "#14532d18" : "transparent" }}>
              {/* Badge cible */}
              <span style={{ background:`${r.target.color}22`, border:`1px solid ${r.target.color}44`, borderRadius:8, padding:"2px 8px", fontSize:12, fontWeight:800, color:r.target.color, minWidth:52, textAlign:"center", flexShrink:0 }}>
                {r.target.short}
              </span>
              {/* Résultat */}
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:13, color:"#22c55e", fontWeight:700 }}>{r.darts} fl.</span>
                {r.missCount > 0 && (
                  <span style={{ fontSize:11, color:"#ef4444", fontWeight:600, marginLeft:5 }}>
                    ({r.missCount} miss)
                  </span>
                )}
              </div>
              {/* Temps */}
              <div style={{ fontSize:13, color:C.muted, fontVariantNumeric:"tabular-nums", flexShrink:0 }}>
                {fmtMs(r.timeMs)}
              </div>
              {/* Icône */}
              <CheckCircle size={14} color={r.missCount > 0 ? "#f59e0b" : "#22c55e"}/>
            </div>
          ))}
        </div>

        {/* Boutons */}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={reset}
            style={{ flex:2, background:"linear-gradient(135deg,#a78bfa,#7c3aed)", border:"none", color:"#fff", borderRadius:14, padding:"16px", fontSize:15, fontWeight:800, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <RotateCcw size={16}/> Rejouer
          </button>
          <button onClick={() => setPage("jeux-sans")}
            style={{ flex:1, background:"#1a1a1a", border:`1px solid ${C.border}`, color:C.muted, borderRadius:14, padding:"16px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
            Quitter
          </button>
        </div>
      </>
    );
  }

  return null;
};
