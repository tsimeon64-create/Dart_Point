import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Target, Swords, Home } from "lucide-react";

const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sbC = async (path, opts = {}) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey:SB_KEY, Authorization:`Bearer ${SB_KEY}`, "Content-Type":"application/json", Prefer:opts.prefer||"return=representation", ...opts.headers },
    ...opts,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

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
  const defiData = (() => {
    try { return JSON.parse(localStorage.getItem("dp_cricket_duel")||"null"); } catch { return null; }
  })();

  const [config, setConfig] = useState({
    points: true,
    cutThroat: false,
    format: "firstTo",
    sets: 1,
    legs: 3,
    random: false,
    joueurs: defiData
      ? [
          { id: defiData.challengerId, pseudo: defiData.challengerPseudo, photo: null },
          { id: defiData.defiId, pseudo: defiData.defiPseudo, photo: null },
        ]
      : joueur
        ? [{ id: joueur.id, pseudo: joueur.pseudo, photo: joueur.photo || null }]
        : [{ id: "j1", pseudo: "Joueur 1", photo: null }],
    defi: defiData || null,
  });
  const [started, setStarted] = useState(false);
  const [gameConfig, setGameConfig] = useState(null);

  const set = (key, val) => setConfig(c => ({ ...c, [key]: val }));

  const addJoueur = () => {
    if (config.joueurs.length >= 8 || defiData) return;
    const n = config.joueurs.length + 1;
    setConfig(c => ({ ...c, joueurs: [...c.joueurs, { id: `j${Date.now()}`, pseudo: `Joueur ${n}`, photo: null }] }));
  };

  const removeJoueur = (i) => {
    if (config.joueurs.length <= 2 || defiData) return;
    setConfig(c => ({ ...c, joueurs: c.joueurs.filter((_, idx) => idx !== i) }));
  };

  const updatePseudo = (i, pseudo) => {
    if (defiData) return; // locked in defi mode
    setConfig(c => ({ ...c, joueurs: c.joueurs.map((j, idx) => idx === i ? { ...j, pseudo } : j) }));
  };

  const demarrer = () => {
    if (config.joueurs.length < 2) return;
    let js = [...config.joueurs];
    if (config.random && !defiData) js = js.sort(() => Math.random() - 0.5);
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
        <button onClick={() => { if (defiData) localStorage.removeItem("dp_cricket_duel"); setPage(defiData ? "defi" : "jeux-flechettes"); }}
          style={{ display:"flex", alignItems:"center", gap:6, background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:13, padding:0 }}>
          <ArrowLeft size={16}/> Retour
        </button>
        <div>
          <h1 style={{ fontWeight:900, fontSize:20, margin:0, display:"flex", alignItems:"center", gap:8 }}><Target size={20} color={C.accent}/> Cricket</h1>
          <div style={{ fontSize:12, color:C.muted }}>{defiData ? "Défi DRIX — Configuration" : "Configuration de la partie"}</div>
        </div>
      </div>

      <div style={{ maxWidth:480, margin:"0 auto", padding:"16px 16px", display:"flex", flexDirection:"column", gap:14 }}>

        {/* Notice défi DRIX */}
        {defiData && (
          <div style={{ background:"#1a1a2e", border:"1px solid #7c3aed44", borderRadius:14, padding:14, display:"flex", gap:12, alignItems:"flex-start" }}>
            <div style={{ flexShrink:0, display:"flex", alignItems:"center" }}><Swords size={22} color="#a78bfa"/></div>
            <div>
              <div style={{ fontWeight:800, fontSize:14, color:"#a78bfa", marginBottom:4 }}>Match DRIX Cricket</div>
              <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>
                Les <strong style={{ color:"#f97316" }}>DRIX sont en jeu</strong> — même formule que le 501.<br/>
                ⚠️ Ce match <strong>ne compte pas</strong> pour tes stats de fléchettes (moyennes, matchs gagnés, finishes…).
              </div>
            </div>
          </div>
        )}

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

        {/* Ordre aléatoire — masqué en mode défi */}
        {!defiData && (
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
        )}

        {/* Joueurs */}
        <Section title={defiData ? "Joueurs" : `Joueurs (${config.joueurs.length}/8)`}>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {config.joueurs.map((j, i) => (
              <div key={j.id} style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:`${C.accent}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:C.accent, flexShrink:0 }}>{i+1}</div>
                <input value={j.pseudo} onChange={e => updatePseudo(i, e.target.value)}
                  readOnly={!!defiData}
                  style={{ flex:1, background:"#111", border:`1px solid ${defiData?"#333":C.border}`, borderRadius:8, padding:"9px 12px", color: defiData?C.muted:C.text, fontSize:14, cursor:defiData?"default":"text" }} />
                {!defiData && config.joueurs.length > 2 && (
                  <button onClick={() => removeJoueur(i)}
                    style={{ background:"none", border:"none", color:C.red, cursor:"pointer", fontSize:18, lineHeight:1, padding:4 }}>✕</button>
                )}
              </div>
            ))}
            {!defiData && config.joueurs.length < 8 && (
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
          DÉBUT <Target size={18} style={{ verticalAlign:"middle", marginLeft:4 }}/>
        </button>
      </div>
    </div>
  );
};

// ── SCOREUR CRICKET ───────────────────────────────────────────────────────────
const PLAYER_COLORS = ["#22c55e","#60a5fa","#f97316","#a78bfa","#f59e0b","#ef4444","#06b6d4","#ec4899"];

const initMarks = () => Object.fromEntries(ZONES.map(z => [z, 0]));

const initJoueurs = (config) =>
  config.joueurs.map((j, i) => ({
    ...j,
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    marks: initMarks(),
    score: 0,
    legsGagnes: 0,
    setsGagnes: 0,
    roundsDone: 0,
  }));


export const ScoreurCricket = ({ config, setPage }) => {
  // ── State ──────────────────────────────────────────────────────────────────
  const [joueurs, setJoueurs] = useState(() => initJoueurs(config));
  const [actifIdx, setActifIdx] = useState(0);
  const [mult, setMult] = useState(1);            // 1=simple 2=double 3=triple
  const [darts, setDarts] = useState([]);          // current turn: [{zone,mult,label}]
  const [lastDarts, setLastDarts] = useState({});  // {idx:[dart,dart,dart]} last turn
  const [historique, setHistorique] = useState([]);
  const [phase, setPhase] = useState("jeu");       // "jeu"|"inter"|"fin"
  const [interInfo, setInterInfo] = useState(null);
  const [showQuit, setShowQuit] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  // ── Scroll auto vers le joueur actif ─────────────────────────────────────
  const scrollContainerRef = useRef(null);
  const colRefs = useRef([]);
  useEffect(() => {
    const col = colRefs.current[actifIdx];
    const container = scrollContainerRef.current;
    if (!col || !container) return;
    const colLeft = col.offsetLeft;
    const colWidth = col.offsetWidth;
    const containerWidth = container.offsetWidth;
    const target = colLeft - (containerWidth / 2) + (colWidth / 2);
    container.scrollTo({ left: target, behavior: "smooth" });
  }, [actifIdx]);

  // ── Full screen + wake lock ────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.touchAction = "none";
    let wl = null;
    navigator.wakeLock?.request("screen").then(l => { wl = l; }).catch(() => {});
    const onVis = () => { if (document.visibilityState === "visible") navigator.wakeLock?.request("screen").then(l => { wl = l; }).catch(() => {}); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
      document.body.style.touchAction = "";
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      wl?.release().catch(() => {});
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // ── Auto-advance après 3 fléchettes ───────────────────────────────────────
  useEffect(() => {
    if (!advancing) return;
    const t = setTimeout(() => {
      const nextIdx = (actifIdx + 1) % joueurs.length;
      setLastDarts(ld => ({ ...ld, [actifIdx]: darts }));
      setJoueurs(js => js.map((j, i) => i === actifIdx ? { ...j, roundsDone: j.roundsDone + 1 } : j));
      setDarts([]);
      setMult(1);
      setAdvancing(false);
      setActifIdx(nextIdx);
    }, 650);
    return () => clearTimeout(t);
  }, [advancing, actifIdx, darts, joueurs.length]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const snap = () => ({
    joueurs: joueurs.map(j => ({ ...j, marks: { ...j.marks } })),
    actifIdx, mult, darts: [...darts],
  });

  const undo = () => {
    if (!historique.length || advancing) return;
    const prev = historique[historique.length - 1];
    setJoueurs(prev.joueurs);
    setActifIdx(prev.actifIdx);
    setMult(1);
    setDarts(prev.darts);
    setHistorique(h => h.slice(0, -1));
  };

  const checkWin = (js, idx) => {
    const j = js[idx];
    if (!ZONES.every(z => j.marks[z] >= 3)) return false;
    if (!config.points) return true;
    if (!config.cutThroat) return js.every((o, i) => i === idx || j.score >= o.score);
    return true; // cut throat: end leg when anyone closes all
  };

  const ctWinner = (js) => {
    let min = Infinity, mi = 0;
    js.forEach((j, i) => { if (j.score < min) { min = j.score; mi = i; } });
    return mi;
  };

  const handleLegWin = (js, wi) => {
    const legsTarget = config.format === "bestOf" ? Math.ceil(config.legs / 2) : config.legs;
    const setsTarget = config.format === "bestOf" ? Math.ceil(config.sets / 2) : config.sets;

    let newJs = js.map((j, i) => i === wi ? { ...j, legsGagnes: j.legsGagnes + 1 } : j);
    const winner = newJs[wi];

    if (winner.legsGagnes >= legsTarget) {
      newJs = newJs.map((j, i) =>
        i === wi
          ? { ...j, setsGagnes: j.setsGagnes + 1, legsGagnes: 0 }
          : { ...j, legsGagnes: 0 }
      );
      if (newJs[wi].setsGagnes >= setsTarget) {
        setJoueurs(newJs);
        setDarts([]); setAdvancing(false); setHistorique([]); setMult(1);
        setInterInfo({ type:"fin", winner: winner.pseudo, wi });
        setPhase("fin");
        return;
      }
      const resetJs = newJs.map(j => ({ ...j, marks: initMarks(), score: 0, roundsDone: 0 }));
      setJoueurs(resetJs);
      setDarts([]); setAdvancing(false); setHistorique([]); setMult(1); setLastDarts({});
      setInterInfo({ type:"set", winner: winner.pseudo });
      setPhase("inter");
    } else {
      const resetJs = newJs.map(j => ({ ...j, marks: initMarks(), score: 0, roundsDone: 0 }));
      setJoueurs(resetJs);
      setDarts([]); setAdvancing(false); setHistorique([]); setMult(1); setLastDarts({});
      setInterInfo({ type:"leg", winner: winner.pseudo });
      setPhase("inter");
    }
  };

  // ── Enregistrer une fléchette ──────────────────────────────────────────────
  const hit = (zone) => {
    if (darts.length >= 3 || phase !== "jeu" || advancing) return;
    setHistorique(h => [...h.slice(-29), snap()]);

    const nb = mult;
    const zv = ZONE_VAL[zone];
    let js = joueurs.map(j => ({ ...j, marks: { ...j.marks } }));
    const cur = js[actifIdx].marks[zone];
    const nm = Math.min(3, cur + nb);
    const ex = Math.max(0, cur + nb - 3);

    js[actifIdx] = { ...js[actifIdx], marks: { ...js[actifIdx].marks, [zone]: nm } };

    if (config.points) {
      if (!config.cutThroat) {
        const open = joueurs.some((o, i) => i !== actifIdx && o.marks[zone] < 3);
        if (open) {
          const sh = cur >= 3 ? nb : ex;
          if (sh > 0) js[actifIdx] = { ...js[actifIdx], score: js[actifIdx].score + sh * zv };
        }
      } else {
        const sh = cur >= 3 ? nb : ex;
        if (sh > 0) {
          js = js.map((j, i) => {
            if (i === actifIdx || j.marks[zone] >= 3) return j;
            return { ...j, score: j.score + sh * zv };
          });
        }
      }
    }

    const label = nb === 1 ? String(zone) : (nb === 2 ? "D" : "T") + zone;
    const nd = [...darts, { zone, mult: nb, label }];
    setMult(1); // auto-reset to simple

    if (checkWin(js, actifIdx)) {
      setJoueurs(js); setDarts(nd);
      handleLegWin(js, config.cutThroat ? ctWinner(js) : actifIdx);
      return;
    }

    setJoueurs(js);
    if (nd.length >= 3) { setDarts(nd); setAdvancing(true); }
    else setDarts(nd);
  };

  const miss = () => {
    if (darts.length >= 3 || phase !== "jeu" || advancing) return;
    setHistorique(h => [...h.slice(-29), snap()]);
    setMult(1);
    const nd = [...darts, { zone: null, label: "—" }];
    if (nd.length >= 3) { setDarts(nd); setAdvancing(true); }
    else setDarts(nd);
  };

  // ── MPR ───────────────────────────────────────────────────────────────────
  const mpr = (j) => {
    const tm = ZONES.reduce((s, z) => s + j.marks[z], 0);
    return j.roundsDone > 0 ? (tm / j.roundsDone).toFixed(2).replace(".", ",") : "0,00";
  };

  // ── Zones fermées par TOUS les joueurs ───────────────────────────────────
  const allClosed = (z) => joueurs.every(j => j.marks[z] >= 3);

  // ── Mark display ──────────────────────────────────────────────────────────
  const markEl = (n, col) => {
    if (n === 0) return <span style={{ color:"#2a2a2a", fontSize:20 }}>·</span>;
    if (n === 1) return <span style={{ color:"#555", fontSize:26, fontWeight:200, lineHeight:1 }}>/</span>;
    if (n === 2) return <span style={{ color:C.text, fontSize:18, fontWeight:700 }}>✕</span>;
    // closed
    return (
      <div style={{ width:28, height:28, borderRadius:"50%", background:`${col}22`, border:`2px solid ${col}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <span style={{ color:col, fontSize:12, fontWeight:900 }}>✕</span>
      </div>
    );
  };

  // ── Dart box label style ──────────────────────────────────────────────────
  const dartStyle = (d) => {
    if (!d) return { color:"#333", fontSize:11 };
    if (!d.zone) return { color:"#444", fontSize:12, fontStyle:"italic" }; // miss
    if (d.mult === 3) return { color:C.accent, fontSize:12, fontWeight:800 };
    if (d.mult === 2) return { color:C.blue, fontSize:12, fontWeight:700 };
    return { color:C.muted, fontSize:12, fontWeight:600 };
  };

  // ── ÉCRANs INTER / FIN ────────────────────────────────────────────────────
  const [drixPublished, setDrixPublished] = useState(false);
  const [drixInfo, setDrixInfo] = useState(null); // { challengerGain, defiGain, winnerId }

  useEffect(() => {
    if (phase !== "fin" || !config.defi || drixPublished) return;
    setDrixPublished(true);
    const d = config.defi;
    const winnerJ = config.cutThroat
      ? [...joueurs].sort((a,b) => a.score-b.score)[0]
      : [...joueurs].sort((a,b) => b.setsGagnes-a.setsGagnes)[0];
    const winnerId = winnerJ?.id;
    const challengerWon = winnerId === d.challengerId;

    // DRIX formula K=32
    const K = 32;
    const EA = 1/(1+Math.pow(10,(d.defiDrix - d.challengerDrix)/400));
    const challengerGain = challengerWon ? Math.round(K*(1-EA)) : -Math.round(K*EA);
    const defiGain = challengerWon ? -Math.round(K*(1-EA)) : Math.round(K*EA);

    setDrixInfo({ challengerGain, defiGain, winnerId });

    const newChallengerDrix = Math.max(0, d.challengerDrix + challengerGain);
    const newDefiDrix = Math.max(0, d.defiDrix + defiGain);
    const loserPseudo = challengerWon ? d.defiPseudo : d.challengerPseudo;

    const now = Date.now();
    const winnerGain = challengerWon ? challengerGain : defiGain;

    // Async IIFE pour récupérer les photos puis tout publier
    (async () => {
      const [jCFull, jDFull] = await Promise.all([
        sbC(`joueurs?id=eq.${d.challengerId}&select=photo,drix,id`).then(r=>r?.[0]).catch(()=>null),
        sbC(`joueurs?id=eq.${d.defiId}&select=photo,drix,id`).then(r=>r?.[0]).catch(()=>null),
      ]);
      const winnerPhoto = challengerWon ? jCFull?.photo : jDFull?.photo;

      // Scores de manches (sets gagnés en Cricket)
      const challengerJ = joueurs.find(j => j.id === d.challengerId);
      const defiJ       = joueurs.find(j => j.id === d.defiId);
      const scoreChallenger = config.cutThroat
        ? (challengerJ?.score || 0)
        : (challengerJ?.setsGagnes || 0);
      const scoreDefie = config.cutThroat
        ? (defiJ?.score || 0)
        : (defiJ?.setsGagnes || 0);

      // Préparation du post __DUEL__| pour la carte DuelPost premium
      const winNbManches  = challengerWon ? scoreChallenger : scoreDefie;
      const loseNbManches = challengerWon ? scoreDefie      : scoreChallenger;
      const duelPostData = {
        duel_id: d.duelId,
        isAmical: d.type === "amical",
        isRivalite: false,
        mode: "Cricket",
        headline: `🏆 ${winnerJ?.pseudo} bat ${loserPseudo} ${winNbManches}-${loseNbManches}`,
        highlights: null,
        winner: {
          nom: winnerJ?.pseudo,
          nbManches: winNbManches,
          elo: winnerGain, bonusManches: 0, bonusVolees: 0, nbVolees: 0,
          bonusFinish: 0, nbFinish: 0,
          total: winnerGain,
        },
        loser: {
          nom: loserPseudo,
          nbManches: loseNbManches,
          elo: challengerWon ? defiGain : challengerGain,
          bonusManches: 0, bonusVolees: 0, nbVolees: 0,
          bonusFinish: 0, nbFinish: 0,
          total: challengerWon ? defiGain : challengerGain,
        },
        manches: [],
      };

      // 🤝 Mode amical : pas de DRIX ni de stats, juste fermeture du duel + post Comptoir
      const isAmical = d.type === "amical";
      const drixOps = isAmical ? [] : [
        // Mise à jour DRIX joueurs
        sbC(`joueurs?id=eq.${d.challengerId}`, { method:"PATCH", body:JSON.stringify({ drix:newChallengerDrix }), prefer:"return=minimal" }).catch(()=>{}),
        sbC(`joueurs?id=eq.${d.defiId}`,       { method:"PATCH", body:JSON.stringify({ drix:newDefiDrix }),       prefer:"return=minimal" }).catch(()=>{}),
        // Historique DRIX mouvements (pour le Comptoir + classement)
        sbC("drix_mouvements", { method:"POST", body:JSON.stringify({ joueur_id:d.challengerId, joueur_pseudo:d.challengerPseudo, adversaire_pseudo:d.defiPseudo,    variation:challengerGain, drix_avant:d.challengerDrix, drix_apres:newChallengerDrix, resultat:challengerWon?"victoire":"defaite", duel_id:d.duelId, date:now }) }).catch(()=>{}),
        sbC("drix_mouvements", { method:"POST", body:JSON.stringify({ joueur_id:d.defiId,       joueur_pseudo:d.defiPseudo,       adversaire_pseudo:d.challengerPseudo, variation:defiGain,       drix_avant:d.defiDrix,       drix_apres:newDefiDrix,       resultat:challengerWon?"defaite":"victoire", duel_id:d.duelId, date:now }) }).catch(()=>{}),
        // Mise à jour stats_joueurs (victoires / défaites / parties)
        sbC(`stats_joueurs?joueur_id=eq.${d.challengerId}&select=id,parties,victoires,defaites`).then(r => {
          const s = r?.[0]; if (!s) return;
          return sbC(`stats_joueurs?id=eq.${s.id}`, { method:"PATCH", prefer:"return=minimal", body:JSON.stringify({ parties:(s.parties||0)+1, victoires:challengerWon?(s.victoires||0)+1:s.victoires, defaites:challengerWon?s.defaites:(s.defaites||0)+1 }) });
        }).catch(()=>{}),
        sbC(`stats_joueurs?joueur_id=eq.${d.defiId}&select=id,parties,victoires,defaites`).then(r => {
          const s = r?.[0]; if (!s) return;
          return sbC(`stats_joueurs?id=eq.${s.id}`, { method:"PATCH", prefer:"return=minimal", body:JSON.stringify({ parties:(s.parties||0)+1, victoires:challengerWon?s.victoires:(s.victoires||0)+1, defaites:challengerWon?(s.defaites||0)+1:s.defaites }) });
        }).catch(()=>{}),
      ];
      // Si amical, on remet le gain à 0 pour la carte (cosmétique)
      if (isAmical) {
        duelPostData.winner.elo = 0; duelPostData.winner.total = 0;
        duelPostData.loser.elo = 0;  duelPostData.loser.total = 0;
      }
      Promise.all([
        ...drixOps,
        // Fermeture du duel — y compris les scores de manches (sets gagnés)
        sbC(`duels?id=eq.${d.duelId}`, { method:"PATCH", body:JSON.stringify({
          statut:"termine",
          gagnant_id:winnerId,
          gagnant_pseudo:winnerJ?.pseudo,
          valide_challenger:true,
          valide_defie:true,
          score_manches_challenger: scoreChallenger,
          score_manches_defie: scoreDefie,
        }), prefer:"return=minimal" }).catch(()=>{}),
        // Publication sur le Comptoir — format __DUEL__| pour bénéficier du DuelPost premium
        sbC("wall_posts", { method:"POST", body:JSON.stringify({
          joueur_id: winnerId,
          joueur_pseudo: winnerJ?.pseudo,
          joueur_photo: winnerPhoto || null,
          contenu: `__DUEL__|${JSON.stringify(duelPostData)}`,
          date: now,
        })}).catch(()=>{}),
      ]).catch(()=>{
        window.dpToast?.("Erreur lors de la sauvegarde du résultat", "error", 5000);
      });
      localStorage.removeItem("dp_cricket_duel");
    })();
  }, [phase, config.defi, drixPublished, joueurs]);

  if (phase === "fin" && interInfo) {
    const sorted = config.cutThroat
      ? [...joueurs].sort((a, b) => a.score - b.score)
      : [...joueurs].sort((a, b) => b.setsGagnes - a.setsGagnes);
    const w = sorted[0];
    return (
      <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Inter,sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
        <div style={{ background:"linear-gradient(135deg,#14532d,#166534)", borderRadius:24, padding:"40px 32px", maxWidth:380, width:"100%", marginBottom:20 }}>
          <div style={{ fontSize:72, marginBottom:12 }}>🏆</div>
          <div style={{ fontWeight:900, fontSize:32, color:C.green }}>VICTOIRE !</div>
          <div style={{ fontSize:24, fontWeight:800, color:"#fff", marginTop:8 }}>{interInfo.winner}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:24, marginTop:16 }}>
            <div><div style={{ fontWeight:900, fontSize:22, color:C.green }}>{w.setsGagnes}</div><div style={{ fontSize:12, color:"#86efac" }}>Sets</div></div>
            {config.points && <div><div style={{ fontWeight:900, fontSize:22, color:C.green }}>{config.cutThroat?"+" : ""}{w.score}</div><div style={{ fontSize:12, color:"#86efac" }}>Points</div></div>}
          </div>
        </div>

        {/* Résultat DRIX */}
        {config.defi && drixInfo && (
          <div style={{ background:"#111", border:"1px solid #7c3aed44", borderRadius:16, padding:16, width:"100%", maxWidth:380, marginBottom:12 }}>
            <div style={{ fontSize:11, color:"#a78bfa", fontWeight:700, letterSpacing:1, marginBottom:10 }}>DRIX MIS À JOUR</div>
            {[
              { id: config.defi.challengerId, pseudo: config.defi.challengerPseudo, ancien: config.defi.challengerDrix, gain: drixInfo.challengerGain },
              { id: config.defi.defiId, pseudo: config.defi.defiPseudo, ancien: config.defi.defiDrix, gain: drixInfo.defiGain },
            ].map(p => (
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 0", borderBottom:"1px solid #222" }}>
                <div style={{ flex:1, fontWeight:700, fontSize:14 }}>{p.pseudo}{p.id===drixInfo.winnerId&&" 🏆"}</div>
                <div style={{ fontWeight:800, fontSize:14, color: p.gain>=0?"#22c55e":"#ef4444" }}>
                  {p.gain>=0?"+":""}{p.gain} DRIX
                </div>
                <div style={{ fontSize:12, color:C.muted }}>{p.ancien} → {Math.max(0,p.ancien+p.gain)}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:"16px", width:"100%", maxWidth:380, marginBottom:20 }}>
          {sorted.map((j, i) => (
            <div key={j.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom: i<sorted.length-1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ fontWeight:800, fontSize:16, color: i===0?C.yellow:C.muted, width:24 }}>{i+1}</div>
              <div style={{ flex:1, fontWeight:700 }}>{j.pseudo}</div>
              <div style={{ fontSize:13, color:C.muted }}>{j.setsGagnes} set{j.setsGagnes!==1?"s":""}</div>
              {config.points && <div style={{ fontSize:13, fontWeight:700, color: config.cutThroat?(i===0?C.green:C.red):j.color }}>{j.score} pts</div>}
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:12, width:"100%", maxWidth:380 }}>
          {!config.defi && (
            <button onClick={() => { setJoueurs(initJoueurs(config)); setActifIdx(0); setMult(1); setDarts([]); setLastDarts({}); setHistorique([]); setInterInfo(null); setAdvancing(false); setPhase("jeu"); setDrixPublished(false); setDrixInfo(null); }}
              style={{ flex:1, padding:"16px", borderRadius:12, border:"none", fontWeight:800, fontSize:15, cursor:"pointer", background:`linear-gradient(135deg,${C.accent},#ea580c)`, color:"#fff" }}>
              🔄 Rejouer
            </button>
          )}
          <button onClick={() => setPage(config.defi ? "home" : "jeux-flechettes")}
            style={{ flex:1, padding:"16px", borderRadius:12, border:`1px solid ${C.border}`, fontWeight:800, fontSize:15, cursor:"pointer", background:C.card, color:C.muted }}>
            {config.defi
            ? <span style={{ display:"flex", alignItems:"center", gap:6 }}><Home size={16}/> Accueil</span>
            : <span style={{ display:"flex", alignItems:"center", gap:6 }}><ArrowLeft size={16}/> Quitter</span>}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "inter" && interInfo) {
    return (
      <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Inter,sans-serif", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ textAlign:"center", maxWidth:360 }}>
          <div style={{ fontSize:56, marginBottom:12 }}>{interInfo.type==="set"?"🏅":"🎯"}</div>
          <div style={{ fontWeight:900, fontSize:26, color: interInfo.type==="set"?C.yellow:C.green, marginBottom:6 }}>
            {interInfo.type==="set" ? "Set gagné !" : "Leg gagné !"}
          </div>
          <div style={{ fontSize:20, fontWeight:700, marginBottom:24 }}>{interInfo.winner}</div>
          <div style={{ display:"flex", justifyContent:"center", gap:14, marginBottom:28, flexWrap:"wrap" }}>
            {joueurs.map(j => (
              <div key={j.id} style={{ background:C.card, border:`1px solid ${j.color}44`, borderRadius:12, padding:"12px 16px", textAlign:"center" }}>
                <div style={{ fontSize:11, color:j.color, fontWeight:700, marginBottom:4 }}>{j.pseudo}</div>
                <div style={{ fontSize:22, fontWeight:900, color:j.color }}>{j.setsGagnes}</div>
                <div style={{ fontSize:10, color:C.muted }}>sets</div>
                <div style={{ fontSize:13, fontWeight:700, marginTop:4 }}>{j.legsGagnes} legs</div>
              </div>
            ))}
          </div>
          <button onClick={() => { setPhase("jeu"); setInterInfo(null); setActifIdx(a => (a+1)%joueurs.length); }}
            style={{ background:`linear-gradient(135deg,${C.accent},#ea580c)`, border:"none", borderRadius:14, padding:"18px 48px", color:"#fff", fontWeight:900, fontSize:18, cursor:"pointer" }}>
            Leg suivant →
          </button>
        </div>
      </div>
    );
  }

  // ── ÉCRAN JEU ─────────────────────────────────────────────────────────────
  const actif = joueurs[actifIdx];
  const leftW = 54;
  const colMinW = 110; // chaque colonne joueur a au minimum 110px → scroll horizontal si besoin

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", flexDirection:"column", background:C.bg, color:C.text, fontFamily:"Inter,sans-serif", overflow:"hidden", touchAction:"none" }}>

      {/* ── Modale quitter ── */}
      {showQuit && (
        <div style={{ position:"absolute", inset:0, background:"#000c", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:C.card, border:`2px solid ${C.red}`, borderRadius:16, padding:28, maxWidth:300, width:"100%", textAlign:"center" }}>
            <div style={{ fontSize:40, marginBottom:10 }}>⚠️</div>
            <div style={{ fontWeight:800, fontSize:17, marginBottom:8 }}>Abandonner ?</div>
            <p style={{ color:C.muted, fontSize:13, marginBottom:20 }}>La partie en cours sera perdue.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowQuit(false)}
                style={{ flex:1, padding:"13px", borderRadius:10, border:`1px solid ${C.border}`, background:"#111", color:C.text, fontWeight:700, cursor:"pointer" }}>
                Continuer
              </button>
              <button onClick={() => setPage("jeux-flechettes")}
                style={{ flex:1, padding:"13px", borderRadius:10, border:"none", background:"#7f1d1d", color:C.red, fontWeight:700, cursor:"pointer" }}>
                Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ height:38, background:"#111", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 10px", flexShrink:0 }}>
        <button onClick={() => setShowQuit(true)}
          style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:18, lineHeight:1, padding:"2px 8px 2px 0", touchAction:"manipulation" }}>✕</button>
        <span style={{ flex:1, textAlign:"center", fontSize:12, color:C.muted, fontWeight:600 }}>
          🦗 Cricket {config.points ? (config.cutThroat ? "· Cut Throat" : "· Normal") : "· Points OFF"}
        </span>
        <span style={{ fontSize:11, color:C.muted }}>
          {joueurs.map(j => j.setsGagnes).join("-")}
        </span>
      </div>

      {/* ── Grille principale ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Colonne gauche fixe — zones */}
        <div style={{ width:leftW, flexShrink:0, display:"flex", flexDirection:"column", background:"#0a0a0a", borderRight:`2px solid ${C.border}` }}>
          {/* Espace header joueur */}
          <div style={{ flexShrink:0, height:68 }} />
          {/* Zones */}
          {ZONES.map(z => {
            const done = allClosed(z);
            return (
              <div key={z} style={{ flex:1, position:"relative", display:"flex", alignItems:"center", justifyContent:"center",
                borderBottom:`1px solid ${C.border}18`,
                background: done ? "#1a1a1a" : "transparent" }}>
                <span style={{ fontWeight:900, fontSize:z==="Bull"?13:20,
                  color: done ? "#333" : (z==="Bull" ? C.red : C.text),
                  textDecoration: done ? "line-through" : "none" }}>
                  {z === "Bull" ? "BULL" : z}
                </span>
                {done && <div style={{ position:"absolute", left:0, right:0, height:2, background:"#ef4444", top:"50%", transform:"translateY(-50%)", pointerEvents:"none", boxShadow:"0 0 6px #ef444488" }}/>}
              </div>
            );
          })}
          {/* Espace stats */}
          <div style={{ flexShrink:0, height:40 }} />
          {/* Espace dart boxes */}
          <div style={{ flexShrink:0, height:48 }} />
        </div>

        {/* Colonnes joueurs scrollables */}
        <div ref={scrollContainerRef} style={{ flex:1, overflowX:"auto", overflowY:"hidden", display:"flex" }}>
          {joueurs.map((j, ji) => {
            const isActive = ji === actifIdx;
            const curDarts = isActive ? darts : (lastDarts[ji] || []);
            const totalM = ZONES.reduce((s, z) => s + j.marks[z], 0);

            return (
              <div key={j.id} ref={el => colRefs.current[ji] = el}
                style={{ flex:1, minWidth:`${colMinW}px`, display:"flex", flexDirection:"column",
                  borderRight: ji < joueurs.length-1 ? `1px solid ${C.border}33` : "none",
                  background: isActive ? `${j.color}06` : "transparent" }}>

                {/* ── Nom + score + barre active ── */}
                <div style={{ flexShrink:0, height:68, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:2, padding:"4px 6px 0" }}>
                  <span style={{ fontSize:14, fontWeight:800, color: isActive ? j.color : C.muted, textAlign:"center", width:"100%", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {j.pseudo}
                  </span>
                  {config.points && (
                    <span style={{ fontSize:22, fontWeight:900, color: isActive ? j.color : C.text, lineHeight:1 }}>
                      {j.score}
                    </span>
                  )}
                  {/* Barre active */}
                  <div style={{ width:"80%", height:3, borderRadius:2, marginTop:2,
                    background: isActive ? j.color : "#222",
                    boxShadow: isActive ? `0 0 8px ${j.color}88` : "none",
                    transition:"background .2s" }} />
                </div>

                {/* ── Zones (flex:1, fills space) ── */}
                <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
                  {ZONES.map(z => {
                    const m = j.marks[z];
                    const closed = m >= 3;
                    const done = allClosed(z);
                    return (
                      <div key={z} style={{ flex:1, position:"relative", display:"flex", alignItems:"center", justifyContent:"center",
                        background: done ? "#1a1a1a" : closed ? `${j.color}18` : "transparent",
                        borderBottom:`1px solid ${C.border}18` }}>
                        <div style={{ opacity: done ? 0.35 : 1 }}>{markEl(m, j.color)}</div>
                        {done && <div style={{ position:"absolute", left:0, right:0, height:2, background:"#ef4444", top:"50%", transform:"translateY(-50%)", pointerEvents:"none", zIndex:1, boxShadow:"0 0 6px #ef444488" }}/>}
                      </div>
                    );
                  })}
                </div>

                {/* ── Stats ── */}
                <div style={{ flexShrink:0, height:40, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", borderTop:`1px solid ${C.border}44`, background:"#0d0d0d", gap:2 }}>
                  <span style={{ fontSize:10, color:C.muted }}>Sets {j.setsGagnes} · Legs {j.legsGagnes}</span>
                  <span style={{ fontSize:10, color:C.muted }}>
                    <span style={{ marginRight:4 }}>✏</span>{totalM}
                    <span style={{ marginLeft:8 }}>MPR {mpr(j)}</span>
                  </span>
                </div>

                {/* ── 3 boîtes fléchettes ── */}
                <div style={{ flexShrink:0, height:48, display:"flex", gap:3, padding:"5px 4px",
                  borderTop:`2px solid ${isActive ? j.color+"66" : C.border}`,
                  background: isActive ? `${j.color}10` : "#0a0a0a" }}>
                  {[0,1,2].map(di => {
                    const d = curDarts[di];
                    const filled = !!d;
                    return (
                      <div key={di} style={{ flex:1, borderRadius:6,
                        background: filled ? "#1a1a1a" : "#111",
                        border:`1px solid ${filled && isActive ? j.color+"55" : C.border}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        transition:"all .15s" }}>
                        {filled && (
                          <span style={{ ...dartStyle(d), textAlign:"center", lineHeight:1 }}>
                            {d.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Barre de saisie ── */}
      <div style={{ background:"#111", borderTop:`2px solid ${actif.color}55`, padding:"12px 10px 14px", flexShrink:0 }}>

        {/* Rang 1 : modificateurs + annuler */}
        <div style={{ display:"flex", gap:7, marginBottom:9 }}>
          {/* Double */}
          <button onClick={() => setMult(mult === 2 ? 1 : 2)}
            style={{ flex:1, padding:"15px 4px", borderRadius:11, border:`2px solid ${mult===2?C.blue:C.border}`,
              background: mult===2 ? `${C.blue}22` : "#0d0d0d",
              color: mult===2 ? C.blue : C.muted,
              fontWeight:800, fontSize:18, cursor:"pointer", touchAction:"manipulation", transition:"all .1s" }}>
            D ×2
          </button>
          {/* Triple */}
          <button onClick={() => setMult(mult === 3 ? 1 : 3)}
            style={{ flex:1, padding:"15px 4px", borderRadius:11, border:`2px solid ${mult===3?C.accent:C.border}`,
              background: mult===3 ? `${C.accent}22` : "#0d0d0d",
              color: mult===3 ? C.accent : C.muted,
              fontWeight:800, fontSize:18, cursor:"pointer", touchAction:"manipulation", transition:"all .1s" }}>
            T ×3
          </button>
          {/* Miss */}
          <button onClick={miss} disabled={darts.length>=3||advancing}
            style={{ flex:1, padding:"15px 4px", borderRadius:11, border:`1px solid ${C.border}`,
              background:"#0d0d0d", color: darts.length>=3||advancing ? "#333" : C.muted,
              fontWeight:700, fontSize:18, cursor: darts.length>=3||advancing?"not-allowed":"pointer", touchAction:"manipulation" }}>
            MISS
          </button>
          {/* Annuler */}
          <button onClick={undo} disabled={!historique.length || advancing}
            style={{ flex:1, padding:"15px 4px", borderRadius:11, border:`1px solid ${C.border}`,
              background:"#0d0d0d", color: historique.length && !advancing ? C.yellow : "#333",
              fontWeight:700, fontSize:18, cursor: historique.length&&!advancing?"pointer":"not-allowed", touchAction:"manipulation" }}>
            ↩
          </button>
        </div>

        {/* Rang 2 : zones */}
        <div style={{ display:"flex", gap:6 }}>
          {[15,16,17,18,19,20].map(z => {
            const m = actif.marks[z];
            const closed = m >= 3;
            const disabled = darts.length >= 3 || advancing;
            return (
              <button key={z} onClick={() => hit(z)} disabled={disabled}
                style={{ flex:1, padding:"18px 2px", borderRadius:11,
                  border:`2px solid ${closed ? actif.color+"88" : (disabled?"#1a1a1a":C.border)}`,
                  background: closed ? `${actif.color}22` : (disabled?"#0a0a0a":"#0d0d0d"),
                  color: closed ? actif.color : (disabled?"#333":C.text),
                  fontWeight:800, fontSize:18, cursor: disabled?"not-allowed":"pointer",
                  touchAction:"manipulation",
                  boxShadow: closed && !disabled ? `0 0 8px ${actif.color}44` : "none",
                  transition:"all .1s" }}>
                {z}
              </button>
            );
          })}
          {/* Bull */}
          {(() => {
            const m = actif.marks["Bull"];
            const closed = m >= 3;
            const disabled = darts.length >= 3 || advancing;
            return (
              <button onClick={() => hit("Bull")} disabled={disabled}
                style={{ flex:1, padding:"18px 2px", borderRadius:11,
                  border:`2px solid ${closed ? `${C.red}88` : (disabled?"#1a1a1a":`${C.red}44`)}`,
                  background: closed ? `${C.red}22` : (disabled?"#0a0a0a":"#0d0d0d"),
                  color: closed ? C.red : (disabled?"#333":"#fca5a5"),
                  fontWeight:900, fontSize:18, cursor: disabled?"not-allowed":"pointer",
                  touchAction:"manipulation",
                  boxShadow: closed && !disabled ? `0 0 8px ${C.red}44` : "none" }}>
                BULL
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
