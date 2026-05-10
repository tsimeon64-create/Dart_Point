import { useState, useEffect, useRef } from "react";

const ZONES = [20, 19, 18, 17, 16, 15, "Bull"];
const ZONE_VAL = { 20:20, 19:19, 18:18, 17:17, 16:16, 15:15, Bull:25 };

const C = {
  bg:"#0f0f0f", card:"#1a1a1a", border:"#2a2a2a",
  accent:"#f97316", text:"#f1f5f9", muted:"#94a3b8",
  green:"#22c55e", red:"#ef4444", yellow:"#f59e0b",
  blue:"#60a5fa", purple:"#a78bfa",
};

// ── UI helpers ───────────────────────────────────────────────────────────────
const Section = ({ title, children }) => (
  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px" }}>
    <div style={{ fontWeight:700, fontSize:12, color:C.muted, marginBottom:12, textTransform:"uppercase", letterSpacing:1 }}>{title}</div>
    {children}
  </div>
);

const Toggle = ({ options, value, onChange, col }) => (
  <div style={{ display:"flex", background:"#111", borderRadius:10, padding:4, gap:4 }}>
    {options.map(o => (
      <button key={String(o.v)} onClick={() => onChange(o.v)}
        style={{ flex:1, padding:"10px", borderRadius:8, border:"none", cursor:"pointer",
          background: value === o.v ? col : "transparent",
          color: value === o.v ? "#fff" : C.muted,
          fontWeight:700, fontSize:14, transition:"all .15s" }}>
        {o.l}
      </button>
    ))}
  </div>
);

const Counter = ({ label, value, min, max, onChange, col }) => (
  <div style={{ flex:1, textAlign:"center" }}>
    <div style={{ fontSize:12, color:C.muted, marginBottom:8 }}>{label}</div>
    <div style={{ display:"flex", alignItems:"center", gap:10, justifyContent:"center" }}>
      <button onClick={() => onChange(Math.max(min, value - 1))}
        style={{ width:34, height:34, borderRadius:"50%", background:`${col}22`, border:`1px solid ${col}44`, color:col, fontWeight:700, cursor:"pointer", fontSize:20, lineHeight:1 }}>−</button>
      <span style={{ fontSize:28, fontWeight:800, color:col, minWidth:40, textAlign:"center" }}>{value}</span>
      <button onClick={() => onChange(Math.min(max, value + 1))}
        style={{ width:34, height:34, borderRadius:"50%", background:`${col}22`, border:`1px solid ${col}44`, color:col, fontWeight:700, cursor:"pointer", fontSize:20, lineHeight:1 }}>+</button>
    </div>
  </div>
);

// ── CONFIG CRICKET ────────────────────────────────────────────────────────────
export const ConfigCricket = ({ joueur, setPage }) => {
  const [config, setConfig] = useState({
    points: true,
    cutThroat: false,
    format: "firstTo",
    sets: 1,
    legs: 3,
    random: false,
    joueurs: joueur
      ? [{ id: joueur.id, pseudo: joueur.pseudo, photo: joueur.photo || null }]
      : [{ id: "j1", pseudo: "Joueur 1", photo: null }],
  });
  const [started, setStarted] = useState(false);
  const [gameConfig, setGameConfig] = useState(null);

  const set = (key, val) => setConfig(c => ({ ...c, [key]: val }));

  const addJoueur = () => {
    if (config.joueurs.length >= 8) return;
    const n = config.joueurs.length + 1;
    setConfig(c => ({ ...c, joueurs: [...c.joueurs, { id: `j${Date.now()}`, pseudo: `Joueur ${n}`, photo: null }] }));
  };

  const removeJoueur = (i) => {
    if (config.joueurs.length <= 2) return;
    setConfig(c => ({ ...c, joueurs: c.joueurs.filter((_, idx) => idx !== i) }));
  };

  const updatePseudo = (i, pseudo) =>
    setConfig(c => ({ ...c, joueurs: c.joueurs.map((j, idx) => idx === i ? { ...j, pseudo } : j) }));

  const demarrer = () => {
    if (config.joueurs.length < 2) return;
    let js = [...config.joueurs];
    if (config.random) js = js.sort(() => Math.random() - 0.5);
    // Ensure bestOf legs is odd
    let legs = config.legs;
    if (config.format === "bestOf" && legs % 2 === 0) legs++;
    setGameConfig({ ...config, joueurs: js, legs });
    setStarted(true);
  };

  if (started && gameConfig) return <ScoreurCricket config={gameConfig} setPage={setPage} />;

  const canStart = config.joueurs.length >= 2;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Inter,sans-serif", paddingBottom:90 }}>
      {/* Header */}
      <div style={{ padding:"16px 16px 0", display:"flex", alignItems:"center", gap:12, borderBottom:`1px solid ${C.border}`, paddingBottom:12, marginBottom:4 }}>
        <button onClick={() => setPage("jeux-flechettes")}
          style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:14, padding:0 }}>← Retour</button>
        <div>
          <h1 style={{ fontWeight:900, fontSize:20, margin:0 }}>🎯 Cricket</h1>
          <div style={{ fontSize:12, color:C.muted }}>Configuration de la partie</div>
        </div>
      </div>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"16px 16px", display:"flex", flexDirection:"column", gap:14 }}>

        {/* Points ON/OFF */}
        <Section title="Points">
          <Toggle options={[{ v:true, l:"Points ON" }, { v:false, l:"Points OFF" }]}
            value={config.points} onChange={v => set("points", v)} col={C.accent} />
          <p style={{ color:C.muted, fontSize:12, marginTop:8, lineHeight:1.6 }}>
            {config.points
              ? "Les touches supplémentaires sur une zone fermée rapportent des points (si des adversaires ne l'ont pas encore fermée)."
              : "Pas de points. Le premier à fermer toutes les zones gagne."}
          </p>
        </Section>

        {/* Normal / Cut Throat */}
        {config.points && (
          <Section title="Mode">
            <Toggle options={[{ v:false, l:"Normal" }, { v:true, l:"Cut Throat" }]}
              value={config.cutThroat} onChange={v => set("cutThroat", v)} col={C.purple} />
            <p style={{ color:C.muted, fontSize:12, marginTop:8, lineHeight:1.6 }}>
              {config.cutThroat
                ? "Les points vont aux adversaires qui n'ont pas fermé la zone. Le plus petit score gagne."
                : "Les points supplémentaires vont au joueur actif. Plus ton score est haut, mieux c'est."}
            </p>
          </Section>
        )}

        {/* First To / Best Of */}
        <Section title="Format">
          <Toggle options={[{ v:"firstTo", l:"First To" }, { v:"bestOf", l:"Best Of" }]}
            value={config.format} onChange={v => set("format", v)} col={C.blue} />
          <p style={{ color:C.muted, fontSize:12, marginTop:8 }}>
            {config.format === "firstTo"
              ? `Premier à atteindre le nombre de sets/legs gagne.`
              : `Majorité. Best of N — nombre impair obligatoire.`}
          </p>
        </Section>

        {/* Sets & Legs */}
        <Section title="Structure">
          <div style={{ display:"flex", gap:20 }}>
            <Counter label="Sets" value={config.sets} min={1} max={9}
              onChange={v => set("sets", v)} col={C.yellow} />
            <Counter label={config.format === "bestOf" ? "Legs (impair)" : "Legs"} value={config.legs} min={1} max={9}
              onChange={v => {
                if (config.format === "bestOf") { const n = v % 2 === 1 ? v : (v > config.legs ? v+1 : v-1); set("legs", Math.max(1, n)); }
                else set("legs", v);
              }} col={C.green} />
          </div>
          <p style={{ color:C.muted, fontSize:12, marginTop:12, lineHeight:1.6 }}>
            {config.format === "firstTo"
              ? `Premier à ${config.sets} set${config.sets > 1 ? "s" : ""} · ${config.legs} leg${config.legs > 1 ? "s" : ""} par set`
              : `Best of ${config.sets} set${config.sets > 1 ? "s" : ""} (premier à ${Math.ceil(config.sets/2)}) · Best of ${config.legs} legs (premier à ${Math.ceil(config.legs/2)})`}
          </p>
        </Section>

        {/* Ordre aléatoire */}
        <Section title="Options">
          <label style={{ display:"flex", alignItems:"center", gap:12, cursor:"pointer", userSelect:"none" }}>
            <input type="checkbox" checked={config.random} onChange={e => set("random", e.target.checked)}
              style={{ width:20, height:20, accentColor:C.accent, cursor:"pointer" }} />
            <div>
              <div style={{ fontWeight:700, fontSize:14 }}>Ordre aléatoire</div>
              <div style={{ fontSize:12, color:C.muted }}>L'ordre de jeu sera mélangé automatiquement.</div>
            </div>
          </label>
        </Section>

        {/* Joueurs */}
        <Section title={`Joueurs (${config.joueurs.length}/8)`}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {config.joueurs.map((j, i) => (
              <div key={j.id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:`${C.accent}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:C.accent, flexShrink:0 }}>{i+1}</div>
                <input value={j.pseudo} onChange={e => updatePseudo(i, e.target.value)}
                  style={{ flex:1, background:"#111", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", color:C.text, fontSize:14 }} />
                {config.joueurs.length > 2 && (
                  <button onClick={() => removeJoueur(i)}
                    style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:18, lineHeight:1, padding:4 }}>✕</button>
                )}
              </div>
            ))}
            {config.joueurs.length < 8 && (
              <button onClick={addJoueur}
                style={{ background:`${C.accent}15`, border:`1px dashed ${C.accent}55`, borderRadius:10, padding:"11px", color:C.accent, fontWeight:700, cursor:"pointer", fontSize:14 }}>
                + Ajouter un joueur
              </button>
            )}
            {config.joueurs.length < 2 && (
              <p style={{ color:C.red, fontSize:12 }}>Au moins 2 joueurs requis.</p>
            )}
          </div>
        </Section>

        {/* DÉBUT */}
        <button onClick={demarrer} disabled={!canStart}
          style={{
            background: canStart ? `linear-gradient(135deg,${C.accent},#ea580c)` : "#333",
            border:"none", borderRadius:14, padding:"18px", color:"#fff",
            fontWeight:900, fontSize:18, cursor: canStart ? "pointer" : "not-allowed",
            boxShadow: canStart ? `0 8px 24px ${C.accent}44` : "none",
          }}>
          DÉBUT 🎯
        </button>
      </div>
    </div>
  );
};

// ── SCOREUR CRICKET ───────────────────────────────────────────────────────────
const PLAYER_COLORS = ["#f97316","#60a5fa","#22c55e","#a78bfa","#f59e0b","#ef4444","#06b6d4","#ec4899"];

const initMarks = () => Object.fromEntries(ZONES.map(z => [z, 0]));

const initJoueurs = (config) =>
  config.joueurs.map((j, i) => ({
    ...j,
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    marks: initMarks(),
    score: 0,
    legsGagnes: 0,
    setsGagnes: 0,
  }));

export const ScoreurCricket = ({ config, setPage }) => {
  const [joueurs, setJoueurs] = useState(() => initJoueurs(config));
  const [actifIdx, setActifIdx] = useState(0);
  const [mult, setMult] = useState(1);
  const [historique, setHistorique] = useState([]);
  const [phase, setPhase] = useState("jeu"); // "jeu" | "inter" | "fin"
  const [interInfo, setInterInfo] = useState(null); // { type:"leg"|"set"|"fin", winner }
  const [showQuit, setShowQuit] = useState(false);
  const scrollRef = useRef(null);

  // Wake lock
  useEffect(() => {
    let wl = null;
    navigator.wakeLock?.request("screen").then(l => { wl = l; }).catch(() => {});
    return () => wl?.release().catch(() => {});
  }, []);

  const snapshot = () => ({
    joueurs: joueurs.map(j => ({ ...j, marks: { ...j.marks } })),
    actifIdx,
    mult,
  });

  const undo = () => {
    if (!historique.length) return;
    const prev = historique[historique.length - 1];
    setJoueurs(prev.joueurs);
    setActifIdx(prev.actifIdx);
    setMult(prev.mult);
    setHistorique(h => h.slice(0, -1));
  };

  const nextPlayer = (idx, total) => (idx + 1) % total;

  const checkWin = (js, idx) => {
    const j = js[idx];
    const allClosed = ZONES.every(z => j.marks[z] >= 3);
    if (!allClosed) return false;

    if (!config.points) return true; // Points OFF: first to close all

    if (!config.cutThroat) {
      // Normal: closed + score >= all opponents
      return js.every((o, i) => i === idx || j.score >= o.score);
    } else {
      // Cut Throat: game ends when someone closes all zones
      // winner = lowest score
      return true;
    }
  };

  // In cut throat, determine real winner by lowest score
  const cutThroatWinner = (js) => {
    let minScore = Infinity, minIdx = 0;
    js.forEach((j, i) => { if (j.score < minScore) { minScore = j.score; minIdx = i; } });
    return minIdx;
  };

  const frapper = (zone) => {
    if (phase !== "jeu") return;
    setHistorique(h => [...h.slice(-29), snapshot()]);

    const nb = mult;
    const zv = ZONE_VAL[zone];

    let js = joueurs.map(j => ({ ...j, marks: { ...j.marks } }));

    const cur = js[actifIdx].marks[zone];
    const newMarks = Math.min(3, cur + nb);
    const excess = Math.max(0, cur + nb - 3);

    js[actifIdx] = { ...js[actifIdx], marks: { ...js[actifIdx].marks, [zone]: newMarks } };

    if (config.points) {
      if (!config.cutThroat) {
        // Normal: active player scores on excess (if opponent(s) open)
        const someOpen = joueurs.some((o, i) => i !== actifIdx && o.marks[zone] < 3);
        if (someOpen) {
          const scoringHits = cur >= 3 ? nb : excess;
          if (scoringHits > 0)
            js[actifIdx] = { ...js[actifIdx], score: js[actifIdx].score + scoringHits * zv };
        }
      } else {
        // Cut Throat: excess hits → points to opponents who haven't closed
        const scoringHits = cur >= 3 ? nb : excess;
        if (scoringHits > 0) {
          js = js.map((j, i) => {
            if (i === actifIdx) return j;
            if (j.marks[zone] >= 3) return j;
            return { ...j, score: j.score + scoringHits * zv };
          });
        }
      }
    }

    if (checkWin(js, actifIdx)) {
      const winnerIdx = config.cutThroat ? cutThroatWinner(js) : actifIdx;
      handleLegWin(js, winnerIdx);
      return;
    }

    setJoueurs(js);
    setActifIdx(nextPlayer(actifIdx, joueurs.length));
    setMult(1);
  };

  const handleLegWin = (js, winnerIdx) => {
    const legsTarget = config.format === "bestOf" ? Math.ceil(config.legs / 2) : config.legs;
    const setsTarget = config.format === "bestOf" ? Math.ceil(config.sets / 2) : config.sets;

    let newJs = js.map((j, i) =>
      i === winnerIdx ? { ...j, legsGagnes: j.legsGagnes + 1 } : j
    );

    const winner = newJs[winnerIdx];

    if (winner.legsGagnes >= legsTarget) {
      // Won a set
      newJs = newJs.map((j, i) =>
        i === winnerIdx
          ? { ...j, setsGagnes: j.setsGagnes + 1, legsGagnes: 0 }
          : { ...j, legsGagnes: 0 }
      );

      if (newJs[winnerIdx].setsGagnes >= setsTarget) {
        // Game over
        setJoueurs(newJs);
        setInterInfo({ type: "fin", winner: winner.pseudo, winnerIdx });
        setPhase("fin");
        return;
      }

      // New set: reset marks + scores
      const resetJs = newJs.map(j => ({
        ...j,
        marks: initMarks(),
        score: 0,
      }));
      setJoueurs(resetJs);
      setInterInfo({ type: "set", winner: winner.pseudo });
      setPhase("inter");
    } else {
      // New leg in same set: reset marks + scores
      const resetJs = newJs.map(j => ({
        ...j,
        marks: initMarks(),
        score: 0,
      }));
      setJoueurs(resetJs);
      setInterInfo({ type: "leg", winner: winner.pseudo });
      setPhase("inter");
    }
    setHistorique([]);
    setMult(1);
  };

  const startNextLeg = () => {
    setPhase("jeu");
    setActifIdx(nextPlayer(actifIdx, joueurs.length));
    setInterInfo(null);
  };

  // Mark display
  const markEl = (n, col) => {
    if (n === 0) return <span style={{ color:"#333", fontSize:22 }}>·</span>;
    if (n === 1) return <span style={{ color:C.muted, fontSize:24, fontWeight:300 }}>/</span>;
    if (n === 2) return <span style={{ color:C.text, fontSize:20, fontWeight:700 }}>✕</span>;
    return <span style={{ color:col || C.green, fontSize:20, fontWeight:900 }}>⊕</span>;
  };

  // Column width
  const colW = Math.max(72, Math.min(110, Math.floor((window.innerWidth - 64) / joueurs.length)));
  const leftW = 56;

  // ── FIN ───────────────────────────────────────────────────────────────────
  if (phase === "fin" && interInfo) {
    const w = joueurs.find(j => j.pseudo === interInfo.winner) || joueurs[0];
    const sorted = config.cutThroat
      ? [...joueurs].sort((a, b) => a.score - b.score)
      : [...joueurs].sort((a, b) => b.setsGagnes - a.setsGagnes || b.legsGagnes - a.legsGagnes);
    return (
      <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Inter,sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
        <div style={{ background:"linear-gradient(135deg,#14532d,#166534)", borderRadius:24, padding:"40px 32px", maxWidth:380, width:"100%", marginBottom:20 }}>
          <div style={{ fontSize:72, marginBottom:12 }}>🏆</div>
          <div style={{ fontWeight:900, fontSize:32, color:C.green, marginBottom:6 }}>VICTOIRE !</div>
          <div style={{ fontSize:24, fontWeight:800, color:"#fff", marginBottom:16 }}>{interInfo.winner}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:20 }}>
            <div><div style={{ fontWeight:900, fontSize:22, color:C.green }}>{w.setsGagnes}</div><div style={{ fontSize:12, color:"#86efac" }}>Sets</div></div>
            {config.points && <div><div style={{ fontWeight:900, fontSize:22, color:C.green }}>{w.score}</div><div style={{ fontSize:12, color:"#86efac" }}>{config.cutThroat ? "Score final" : "Points"}</div></div>}
          </div>
        </div>

        {/* Classement */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px", width:"100%", maxWidth:380, marginBottom:20 }}>
          <div style={{ fontWeight:700, fontSize:13, color:C.muted, marginBottom:10 }}>Classement</div>
          {sorted.map((j, i) => (
            <div key={j.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom: i < sorted.length-1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontWeight:800, fontSize:16, color: i===0 ? C.yellow : C.muted, width:24 }}>{i+1}</div>
              <div style={{ flex:1, fontWeight:700, fontSize:14 }}>{j.pseudo}</div>
              <div style={{ fontSize:13, color:C.muted }}>{j.setsGagnes} set{j.setsGagnes!==1?"s":""}</div>
              {config.points && <div style={{ fontSize:13, color: config.cutThroat ? (i===0?C.green:C.muted) : C.accent, fontWeight:700 }}>{j.score} pts</div>}
            </div>
          ))}
        </div>

        <div style={{ display:"flex", gap:12, width:"100%", maxWidth:380 }}>
          <button onClick={() => { setJoueurs(initJoueurs(config)); setActifIdx(0); setMult(1); setHistorique([]); setInterInfo(null); setPhase("jeu"); }}
            style={{ flex:1, padding:"16px", borderRadius:12, border:"none", fontWeight:800, fontSize:16, cursor:"pointer", background:`linear-gradient(135deg,${C.accent},#ea580c)`, color:"#fff" }}>
            🔄 Rejouer
          </button>
          <button onClick={() => setPage("jeux-flechettes")}
            style={{ flex:1, padding:"16px", borderRadius:12, border:`1px solid ${C.border}`, fontWeight:800, fontSize:16, cursor:"pointer", background:C.card, color:C.muted }}>
            ← Quitter
          </button>
        </div>
      </div>
    );
  }

  // ── INTER-LEG ─────────────────────────────────────────────────────────────
  if (phase === "inter" && interInfo) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Inter,sans-serif", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ textAlign:"center", maxWidth:360 }}>
          <div style={{ fontSize:56, marginBottom:12 }}>{interInfo.type === "set" ? "🏅" : "🎯"}</div>
          <div style={{ fontWeight:900, fontSize:26, marginBottom:6, color:interInfo.type === "set" ? C.yellow : C.green }}>
            {interInfo.type === "set" ? "Set gagné !" : "Leg gagné !"}
          </div>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:20, color:C.text }}>{interInfo.winner}</div>

          {/* Scores sets */}
          <div style={{ display:"flex", justifyContent:"center", gap:16, marginBottom:28, flexWrap:"wrap" }}>
            {joueurs.map((j, i) => (
              <div key={j.id} style={{ background:C.card, border:`1px solid ${j.color}44`, borderRadius:12, padding:"12px 18px", minWidth:80 }}>
                <div style={{ fontSize:11, color:j.color, fontWeight:700, marginBottom:4 }}>{j.pseudo}</div>
                <div style={{ fontSize:24, fontWeight:900, color:j.color }}>{j.setsGagnes}</div>
                <div style={{ fontSize:11, color:C.muted }}>sets</div>
                <div style={{ fontSize:14, fontWeight:700, color:C.text, marginTop:4 }}>{j.legsGagnes} legs</div>
              </div>
            ))}
          </div>

          <button onClick={startNextLeg}
            style={{ background:`linear-gradient(135deg,${C.accent},#ea580c)`, border:"none", borderRadius:14, padding:"18px 40px", color:"#fff", fontWeight:900, fontSize:18, cursor:"pointer" }}>
            Leg suivant →
          </button>
        </div>
      </div>
    );
  }

  // ── JEU ───────────────────────────────────────────────────────────────────
  const actif = joueurs[actifIdx];
  const MULT_LABELS = { 1:"Simple", 2:"Double", 3:"Triple" };
  const MULT_COLORS = { 1:C.muted, 2:C.blue, 3:C.accent };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100dvh", background:C.bg, color:C.text, fontFamily:"Inter,sans-serif", overflow:"hidden", userSelect:"none" }}>

      {/* ── Modale quitter ── */}
      {showQuit && (
        <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:C.card, border:`2px solid ${C.red}`, borderRadius:16, padding:28, maxWidth:320, width:"100%", textAlign:"center" }}>
            <div style={{ fontSize:44, marginBottom:12 }}>⚠️</div>
            <h3 style={{ fontWeight:800, fontSize:18, marginBottom:8 }}>Abandonner la partie ?</h3>
            <p style={{ color:C.muted, fontSize:14, marginBottom:24 }}>La partie en cours sera perdue.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowQuit(false)}
                style={{ flex:1, padding:"14px", borderRadius:10, border:`1px solid ${C.border}`, background:"#111", color:C.text, fontWeight:700, cursor:"pointer" }}>
                ← Continuer
              </button>
              <button onClick={() => setPage("jeux-flechettes")}
                style={{ flex:1, padding:"14px", borderRadius:10, border:"none", background:"#7f1d1d", color:C.red, fontWeight:700, cursor:"pointer" }}>
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"6px 10px", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <button onClick={() => setShowQuit(true)}
          style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13, padding:"4px 6px" }}>✕</button>
        <div style={{ flex:1, textAlign:"center", fontSize:13, fontWeight:700, color:C.muted }}>
          🎯 Cricket · {config.points ? (config.cutThroat ? "Cut Throat" : "Normal") : "Points OFF"}
        </div>
        {/* Sets scores compacts */}
        <div style={{ display:"flex", gap:6 }}>
          {joueurs.map((j, i) => (
            <div key={j.id} style={{ textAlign:"center", minWidth:28 }}>
              <div style={{ fontSize:9, color:j.color, fontWeight:700, lineHeight:1 }}>{j.pseudo.slice(0,3).toUpperCase()}</div>
              <div style={{ fontSize:16, fontWeight:900, color: i===actifIdx ? j.color : C.muted, lineHeight:1 }}>{j.setsGagnes}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tour actif ── */}
      <div style={{ padding:"6px 10px", background:`${actif.color}18`, borderBottom:`2px solid ${actif.color}44`, flexShrink:0, display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:actif.color, boxShadow:`0 0 8px ${actif.color}` }} />
        <span style={{ fontWeight:800, fontSize:15, color:actif.color }}>{actif.pseudo}</span>
        <span style={{ fontSize:12, color:C.muted }}>joue</span>
        <div style={{ marginLeft:"auto", fontSize:13, color:C.muted }}>
          Leg {joueurs.map(j => j.legsGagnes).join("-")}
        </div>
      </div>

      {/* ── Grille ── */}
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        <div ref={scrollRef} style={{ flex:1, overflowX:"auto", overflowY:"auto", display:"flex" }}>
          {/* Left fixed column */}
          <div style={{ width:leftW, flexShrink:0, position:"sticky", left:0, zIndex:10, background:C.bg }}>
            {/* Header row */}
            <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", borderBottom:`1px solid ${C.border}`, borderRight:`2px solid ${C.border}` }}>
              <span style={{ fontSize:11, color:C.muted, fontWeight:700 }}>ZONE</span>
            </div>
            {ZONES.map(z => (
              <div key={z} style={{ height:52, display:"flex", alignItems:"center", justifyContent:"center", borderBottom:`1px solid ${C.border}22`, borderRight:`2px solid ${C.border}` }}>
                <span style={{ fontWeight:800, fontSize:16, color: z === "Bull" ? C.red : C.text }}>{z}</span>
              </div>
            ))}
            {/* Score row */}
            {config.points && (
              <div style={{ height:44, display:"flex", alignItems:"center", justifyContent:"center", borderTop:`2px solid ${C.border}`, borderRight:`2px solid ${C.border}`, background:C.card }}>
                <span style={{ fontSize:11, color:C.accent, fontWeight:700 }}>PTS</span>
              </div>
            )}
          </div>

          {/* Player columns */}
          <div style={{ display:"flex", flex:1 }}>
            {joueurs.map((j, ji) => {
              const isActive = ji === actifIdx;
              return (
                <div key={j.id} style={{ minWidth:colW, flex:1, borderRight: ji < joueurs.length-1 ? `1px solid ${C.border}22` : "none", background: isActive ? `${j.color}08` : "transparent" }}>
                  {/* Name header */}
                  <div style={{ height:48, display:"flex", alignItems:"center", justifyContent:"center", borderBottom:`1px solid ${C.border}`, padding:"0 4px" }}>
                    <span style={{ fontWeight:800, fontSize:13, color: isActive ? j.color : C.muted, textAlign:"center", lineHeight:1.2 }}>
                      {j.pseudo.length > 8 ? j.pseudo.slice(0, 7) + "…" : j.pseudo}
                      {isActive && <span style={{ display:"block", width:6, height:6, borderRadius:"50%", background:j.color, margin:"2px auto 0" }} />}
                    </span>
                  </div>
                  {/* Zone marks */}
                  {ZONES.map(z => {
                    const m = j.marks[z];
                    const closed = m >= 3;
                    return (
                      <div key={z} style={{ height:52, display:"flex", alignItems:"center", justifyContent:"center", borderBottom:`1px solid ${C.border}22`, background: closed ? `${j.color}18` : "transparent" }}>
                        {markEl(m, j.color)}
                      </div>
                    );
                  })}
                  {/* Score */}
                  {config.points && (
                    <div style={{ height:44, display:"flex", alignItems:"center", justifyContent:"center", borderTop:`2px solid ${C.border}`, background: isActive ? `${j.color}22` : C.card }}>
                      <span style={{ fontWeight:900, fontSize:16, color: config.cutThroat ? (isActive ? C.red : C.text) : j.color }}>
                        {j.score}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Barre de saisie fixe ── */}
      <div style={{ background:C.card, borderTop:`2px solid ${C.border}`, padding:"10px 8px", flexShrink:0 }}>

        {/* Multiplicateurs */}
        <div style={{ display:"flex", gap:6, marginBottom:8 }}>
          {[1,2,3].map(m => (
            <button key={m} onClick={() => setMult(m)}
              style={{
                flex:1, padding:"10px 4px", borderRadius:10, border:`2px solid ${mult===m ? MULT_COLORS[m] : C.border}`,
                background: mult===m ? `${MULT_COLORS[m]}22` : "#111",
                color: mult===m ? MULT_COLORS[m] : C.muted,
                fontWeight:800, fontSize:13, cursor:"pointer", transition:"all .1s",
              }}>
              {m === 1 ? "S" : m === 2 ? "D" : "T"}·{m}×
            </button>
          ))}
        </div>

        {/* Zones */}
        <div style={{ display:"flex", gap:5, marginBottom:8 }}>
          {[15,16,17,18,19,20].map(z => {
            const m = actif.marks[z];
            const closed = m >= 3;
            return (
              <button key={z} onClick={() => frapper(z)}
                style={{
                  flex:1, padding:"12px 4px", borderRadius:10,
                  border:`2px solid ${closed ? `${actif.color}66` : C.border}`,
                  background: closed ? `${actif.color}22` : "#111",
                  color: closed ? actif.color : C.text,
                  fontWeight:800, fontSize:15, cursor:"pointer",
                  boxShadow: closed ? `0 0 8px ${actif.color}33` : "none",
                }}>
                {z}
              </button>
            );
          })}
          <button onClick={() => frapper("Bull")}
            style={{
              flex:1, padding:"12px 4px", borderRadius:10,
              border:`2px solid ${actif.marks["Bull"] >= 3 ? `${C.red}88` : `${C.red}44`}`,
              background: actif.marks["Bull"] >= 3 ? `${C.red}22` : "#111",
              color: actif.marks["Bull"] >= 3 ? C.red : "#fca5a5",
              fontWeight:900, fontSize:11, cursor:"pointer",
              boxShadow: actif.marks["Bull"] >= 3 ? `0 0 8px ${C.red}44` : "none",
            }}>
            BULL
          </button>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={undo} disabled={!historique.length}
            style={{ flex:1, padding:"12px", borderRadius:10, border:`1px solid ${C.border}`, background:"#111", color: historique.length ? C.yellow : "#333", fontWeight:700, fontSize:13, cursor: historique.length ? "pointer" : "not-allowed" }}>
            ↩ Annuler
          </button>
          <button onClick={() => { setActifIdx(nextPlayer(actifIdx, joueurs.length)); setMult(1); }}
            style={{ flex:2, padding:"12px", borderRadius:10, border:"none", background:`linear-gradient(135deg,${actif.color},${actif.color}aa)`, color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer" }}>
            Joueur suivant →
          </button>
        </div>
      </div>
    </div>
  );
};
