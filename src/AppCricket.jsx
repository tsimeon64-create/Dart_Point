import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Target, Swords, Home, Crown, Lock } from "lucide-react";
import { EmoIcon, EmoText } from "./icons";

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
                <EmoIcon e="⚠️" size={13} color={C.yellow} style={{verticalAlign:"-2px",marginRight:4}}/>Ce match <strong>ne compte pas</strong> pour tes stats de fléchettes (moyennes, matchs gagnés, finishes…).
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
                    style={{ background:"none", border:"none", color:C.red, cursor:"pointer", lineHeight:1, padding:4, display:"inline-flex" }}><EmoIcon e="✕" size={16}/></button>
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
    legsGagnes: 0,      // legs gagnés dans le SET en cours (remis à 0 à chaque set)
    legsWonTotal: 0,    // legs gagnés sur TOUT le match (jamais remis à 0) → score affiché sur la carte
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

  // ── Flash « repère global » quand un numéro vient d'être fermé par TOUS ──
  const [flashZone, setFlashZone] = useState(null);
  const prevAllClosedRef = useRef(new Set());
  useEffect(() => {
    const now = new Set(ZONES.filter(z => joueurs.every(j => j.marks[z] >= 3)));
    let newly = null;
    now.forEach(z => { if (!prevAllClosedRef.current.has(z)) newly = z; });
    prevAllClosedRef.current = now;
    if (newly !== null) {
      setFlashZone(newly);
      const t = setTimeout(() => setFlashZone(null), 750);
      return () => clearTimeout(t);
    }
  }, [joueurs]);

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

  // ── Détection du gagnant d'une MANCHE (leg) ────────────────────────────────
  // Retourne l'index du joueur qui remplit les DEUX conditions (les 7 cibles fermées
  // + la condition de score de son mode), sinon -1.
  // On teste TOUS les joueurs, pas seulement l'actif : en Cut-Throat, un joueur qui a
  // déjà tout fermé peut devenir gagnant quand les AUTRES encaissent des points (il se
  // retrouve alors avec le plus bas score, sans avoir rejoué).
  // Égalité : priorité au joueur actif (celui qui vient de jouer le coup décisif).
  const trouverGagnant = (js) => {
    const aToutFerme = (j) => ZONES.every(z => j.marks[z] >= 3);
    const fermes = js.map((j, i) => (aToutFerme(j) ? i : -1)).filter(i => i >= 0);
    if (!fermes.length) return -1;
    if (!config.points) return fermes.includes(actifIdx) ? actifIdx : fermes[0]; // points OFF : 1er à tout fermer

    const remplitScore = (i) => config.cutThroat
      ? js.every((o, k) => k === i || js[i].score <= o.score)   // Cut-Throat : score le PLUS BAS (ou égal)
      : js.every((o, k) => k === i || js[i].score >= o.score);  // Normal    : score le PLUS HAUT (ou égal)

    const qualifies = fermes.filter(remplitScore);
    if (!qualifies.length) return -1;
    if (qualifies.includes(actifIdx)) return actifIdx;
    return qualifies.reduce((best, i) =>
      config.cutThroat
        ? (js[i].score < js[best].score ? i : best)
        : (js[i].score > js[best].score ? i : best),
      qualifies[0]);
  };

  const handleLegWin = (js, wi) => {
    const legsTarget = config.format === "bestOf" ? Math.ceil(config.legs / 2) : config.legs;
    const setsTarget = config.format === "bestOf" ? Math.ceil(config.sets / 2) : config.sets;

    let newJs = js.map((j, i) => i === wi ? { ...j, legsGagnes: j.legsGagnes + 1, legsWonTotal: (j.legsWonTotal || 0) + 1 } : j);
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

    const nb = zone === "Bull" ? Math.min(2, mult) : mult; // le Bull ne compte jamais comme un triple (max 2 marques)
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

    const wi = trouverGagnant(js);
    if (wi >= 0) {
      setJoueurs(js); setDarts(nd);
      handleLegWin(js, wi);
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
    if (n === 0) return <span style={{ color:"#3a3a3a", fontSize:24, lineHeight:1 }}>·</span>;
    if (n === 1) return <span style={{ color:"#e2e8f0", fontSize:30, fontWeight:300, lineHeight:1 }}>/</span>;
    if (n === 2) return <EmoIcon e="✕" size={23} color="#f1f5f9" strokeWidth={3}/>;
    // fermé (3 marques) — pastille lumineuse à la couleur de fermeture
    return (
      <div style={{ width:32, height:32, borderRadius:"50%", background:`${col}26`, border:`2.5px solid ${col}`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 10px ${col}44` }}>
        <EmoIcon e="✕" size={15} color={col} strokeWidth={3.5}/>
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
    // Le vainqueur du MATCH est celui qui a gagné le plus de sets (vrai dans les deux modes).
    const winnerJ = [...joueurs].sort((a,b) => b.setsGagnes - a.setsGagnes)[0];
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

      // Score affiché sur la carte = LEGS gagnés / perdus (jamais les points, même en
      // Cut-Throat). Sur un match à plusieurs sets, on montre plutôt les sets gagnés.
      const challengerJ = joueurs.find(j => j.id === d.challengerId);
      const defiJ       = joueurs.find(j => j.id === d.defiId);
      const setsTarget  = config.format === "bestOf" ? Math.ceil(config.sets / 2) : config.sets;
      const scoreOf = (j) => setsTarget > 1 ? (j?.setsGagnes || 0) : (j?.legsWonTotal || 0);
      const scoreChallenger = scoreOf(challengerJ);
      const scoreDefie      = scoreOf(defiJ);

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
    // Classement du match : d'abord par sets gagnés, puis par score (bas = mieux en Cut-Throat).
    const sorted = [...joueurs].sort((a, b) =>
      (b.setsGagnes - a.setsGagnes) ||
      (config.cutThroat ? a.score - b.score : b.score - a.score));
    const w = sorted[0];
    return (
      <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"Inter,sans-serif", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, textAlign:"center" }}>
        <div style={{ background:"linear-gradient(135deg,#14532d,#166534)", borderRadius:24, padding:"40px 32px", maxWidth:380, width:"100%", marginBottom:20 }}>
          <div style={{ marginBottom:12,display:"flex",justifyContent:"center" }}><EmoIcon e="🏆" size={72} color="#fbbf24"/></div>
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
                <div style={{ flex:1, fontWeight:700, fontSize:14,display:"flex",alignItems:"center",gap:4 }}>{p.pseudo}{p.id===drixInfo.winnerId&&<EmoIcon e="🏆" size={13} color="#fbbf24"/>}</div>
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
              <EmoIcon e="🔄" size={15} style={{verticalAlign:"-2px",marginRight:6}}/>Rejouer
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
          <div style={{ marginBottom:12,display:"flex",justifyContent:"center" }}><EmoIcon e={interInfo.type==="set"?"🏅":"🎯"} size={56} color={interInfo.type==="set"?C.yellow:C.green}/></div>
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
  const leftW = 60;
  const colMinW = 118;             // largeur mini d'une colonne joueur → scroll horizontal si besoin
  const HEAD_H = 80, STAT_H = 50, DART_H = 52;

  // Leader (couronne) : sets d'abord, puis le meilleur score (bas si Cut-Throat),
  // puis le plus de numéros fermés. Pas de couronne tant qu'aucune progression / à égalité.
  const marksOf = (j) => ZONES.reduce((s,z)=>s+Math.min(3,j.marks[z]),0);
  const leaderId = (() => {
    const r = joueurs.map(j => ({ id:j.id,
      k: j.setsGagnes*1e9 + (config.points ? (config.cutThroat ? -j.score : j.score) : 0)*1e3 + marksOf(j)
    })).sort((a,b)=>b.k-a.k);
    const progress = joueurs.some(j => j.setsGagnes>0 || ZONES.some(z=>j.marks[z]>0));
    return (r.length>1 && r[0].k>r[1].k && progress) ? r[0].id : null;
  })();

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", flexDirection:"column", background:C.bg, color:C.text, fontFamily:"Inter,sans-serif", overflow:"hidden", touchAction:"none" }}>

      <style>{`
        @keyframes ckBreathe { 0%,100%{ box-shadow: inset 0 0 0 2px #22c55e, 0 0 16px #22c55e33; } 50%{ box-shadow: inset 0 0 0 2px #22c55e, 0 0 30px #22c55e88; } }
        @keyframes ckPop { 0%{ transform:scale(.55); opacity:0; } 60%{ transform:scale(1.18); } 100%{ transform:scale(1); opacity:1; } }
        @keyframes ckRowClose { 0%{ background:#22c55e44; } 100%{ background:transparent; } }
        @keyframes ckCrown { 0%,100%{ transform:translateY(0); } 50%{ transform:translateY(-2px); } }
        @keyframes ckTurn { 0%{ opacity:0; transform:translateY(-4px); } 100%{ opacity:1; transform:translateY(0); } }
        .ck-key { transition: transform .07s ease, background .12s, border-color .12s, box-shadow .12s; -webkit-tap-highlight-color:transparent; touch-action:manipulation; }
        .ck-key:active:not(:disabled){ transform: scale(.93); }
        .ck-col { transition: background .25s; }
        @media (prefers-reduced-motion: reduce){ .ck-col{ animation:none !important; } }
      `}</style>

      {/* ── Modale quitter ── */}
      {showQuit && (
        <div style={{ position:"absolute", inset:0, background:"#000c", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:C.card, border:`2px solid ${C.red}`, borderRadius:16, padding:28, maxWidth:300, width:"100%", textAlign:"center" }}>
            <div style={{ marginBottom:10,display:"flex",justifyContent:"center" }}><EmoIcon e="⚠️" size={40} color={C.red}/></div>
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
      <div style={{ height:44, background:"#141414", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 12px", flexShrink:0 }}>
        <button className="ck-key" onClick={() => setShowQuit(true)}
          style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", lineHeight:1, padding:"4px 10px 4px 0", display:"inline-flex" }}><EmoIcon e="✕" size={19}/></button>
        <span style={{ flex:1, textAlign:"center", fontSize:13, color:C.text, fontWeight:700, letterSpacing:.3 }}>
          <EmoIcon e="🦗" size={13} style={{verticalAlign:"-2px",marginRight:6}}/>Cricket <span style={{ color:C.muted, fontWeight:600 }}>{config.points ? (config.cutThroat ? "· Cut-Throat" : "· Normal") : "· Sans points"}</span>
        </span>
        <span style={{ fontSize:12, color:C.muted, fontWeight:700, fontVariantNumeric:"tabular-nums" }}>
          {joueurs.map(j => j.setsGagnes).join(" - ")}
        </span>
      </div>

      {/* ── Grille principale ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Colonne gauche fixe — numéros */}
        <div style={{ width:leftW, flexShrink:0, display:"flex", flexDirection:"column", background:"#0c0c0c", borderRight:`2px solid ${C.border}` }}>
          {/* Espace header joueur */}
          <div style={{ flexShrink:0, height:HEAD_H }} />
          {/* Numéros */}
          {ZONES.map(z => {
            const done = allClosed(z);
            const isBull = z === "Bull";
            return (
              <div key={z} style={{ flex:1, position:"relative", display:"flex", alignItems:"center", justifyContent:"center", gap:3,
                borderTop:`1px solid ${C.border}44`,
                background: done ? "#151515" : "#0e0e0e",
                filter: done ? "grayscale(1)" : "none" }}>
                <span style={{ fontWeight:900, fontSize: isBull ? 15 : 25, lineHeight:1,
                  color: done ? "#555" : (isBull ? C.red : C.text),
                  textShadow: done ? "none" : (isBull ? "0 0 12px #ef444455" : "none"),
                  textDecoration: done ? "line-through" : "none" }}>
                  {isBull ? "BULL" : z}
                </span>
                {done && <Lock size={11} color="#64748b" style={{ position:"absolute", right:5, top:"50%", transform:"translateY(-50%)" }}/>}
              </div>
            );
          })}
          {/* Espace stats */}
          <div style={{ flexShrink:0, height:STAT_H }} />
          {/* Espace dart boxes */}
          <div style={{ flexShrink:0, height:DART_H }} />
        </div>

        {/* Colonnes joueurs scrollables */}
        <div ref={scrollContainerRef} style={{ flex:1, overflowX:"auto", overflowY:"hidden", display:"flex" }}>
          {joueurs.map((j, ji) => {
            const isActive = ji === actifIdx;
            const curDarts = isActive ? darts : (lastDarts[ji] || []);
            const isLeader = j.id === leaderId;

            return (
              <div key={j.id} ref={el => colRefs.current[ji] = el} className="ck-col"
                style={{ flex:1, minWidth:`${colMinW}px`, display:"flex", flexDirection:"column", position:"relative",
                  background: isActive ? "#0e1a12" : (ji % 2 ? "#101010" : "#131313"),
                  boxShadow: isActive ? undefined : `inset -1px 0 0 ${C.border}66`,
                  animation: isActive ? "ckBreathe 2.6s ease-in-out infinite" : "none",
                  zIndex: isActive ? 2 : 1 }}>

                {/* ── Couronne + nom + score + « À TOI » ── */}
                <div style={{ flexShrink:0, height:HEAD_H, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3, padding:"4px 6px 0" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:4, maxWidth:"100%" }}>
                    {isLeader && <Crown size={14} color={C.yellow} fill={C.yellow} style={{ flexShrink:0, animation:"ckCrown 2s ease-in-out infinite" }}/>}
                    <span style={{ fontSize:15, fontWeight:800, color: isActive ? "#fff" : C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.pseudo}</span>
                  </div>
                  {config.points && (
                    <span style={{ fontSize:27, fontWeight:900, lineHeight:1, color: isActive ? "#fff" : "#cbd5e1", fontVariantNumeric:"tabular-nums" }}>{j.score}</span>
                  )}
                  {isActive
                    ? <span style={{ fontSize:9, fontWeight:900, letterSpacing:1, color:"#052e16", background:C.green, borderRadius:20, padding:"2px 9px", animation:"ckTurn .3s ease" }}>À TOI</span>
                    : <div style={{ height:15 }} />}
                </div>

                {/* ── Numéros (marques) ── */}
                <div style={{ flex:1, display:"flex", flexDirection:"column" }}>
                  {ZONES.map(z => {
                    const m = j.marks[z];
                    const closed = m >= 3;
                    const done = allClosed(z);
                    const flashing = flashZone === z;
                    const closeCol = isActive ? C.green : C.accent; // vert = actif, orange = autre joueur
                    return (
                      <div key={z} style={{ flex:1, position:"relative", display:"flex", alignItems:"center", justifyContent:"center",
                        borderTop:`1px solid ${C.border}33`,
                        background: done ? "#141414" : (closed ? `${closeCol}20` : "transparent"),
                        transition:"background .2s" }}>
                        <div key={m} style={{ display:"flex", animation: done ? "none" : "ckPop .18s ease", filter: done ? "grayscale(1) opacity(.4)" : "none" }}>
                          {markEl(m, closeCol)}
                        </div>
                        {done && <div style={{ position:"absolute", left:0, right:0, top:"50%", transform:"translateY(-50%)", height:2, background:"#ef4444aa", boxShadow:"0 0 6px #ef444455", pointerEvents:"none", zIndex:1 }}/>}
                        {flashing && <div style={{ position:"absolute", inset:0, animation:"ckRowClose .75s ease", pointerEvents:"none", zIndex:2 }}/>}
                      </div>
                    );
                  })}
                </div>

                {/* ── Stats : Sets / Legs / MPR ── */}
                <div style={{ flexShrink:0, height:STAT_H, display:"flex", alignItems:"center", justifyContent:"space-around", borderTop:`1px solid ${C.border}66`, background: isActive ? "#0b130e" : "#0c0c0c" }}>
                  {[["Sets", j.setsGagnes],["Legs", j.legsGagnes],["MPR", mpr(j)]].map(([lab,val]) => (
                    <div key={lab} style={{ textAlign:"center", lineHeight:1.05 }}>
                      <div style={{ fontSize:15, fontWeight:800, color: isActive ? "#f1f5f9" : "#cbd5e1", fontVariantNumeric:"tabular-nums" }}>{val}</div>
                      <div style={{ fontSize:8.5, fontWeight:700, color:C.muted, letterSpacing:.5, marginTop:2, textTransform:"uppercase" }}>{lab}</div>
                    </div>
                  ))}
                </div>

                {/* ── 3 boîtes fléchettes ── */}
                <div style={{ flexShrink:0, height:DART_H, display:"flex", gap:4, padding:"6px 5px",
                  borderTop:`2px solid ${isActive ? C.green+"66" : C.border}`,
                  background: isActive ? "#0b130e" : "#0a0a0a" }}>
                  {[0,1,2].map(di => {
                    const d = curDarts[di];
                    const filled = !!d;
                    return (
                      <div key={di} style={{ flex:1, borderRadius:7,
                        background: filled ? "#191919" : "#0e0e0e",
                        border:`1px solid ${filled ? (isActive ? C.green+"55" : C.border) : `${C.border}88`}`,
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {filled && (
                          <span key={d.label} style={{ ...dartStyle(d), textAlign:"center", lineHeight:1, animation:"ckPop .18s ease" }}>
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

      {/* ── Clavier de saisie ── */}
      <div style={{ background:"#141414", borderTop:`2px solid ${C.green}55`, padding:"10px 8px calc(12px + env(safe-area-inset-bottom))", flexShrink:0 }}>

        {/* Rang 1 : Double · Triple · Miss · Annuler (différenciés) */}
        <div style={{ display:"flex", gap:7, marginBottom:8 }}>
          <button className="ck-key" onClick={() => setMult(mult === 2 ? 1 : 2)}
            style={{ flex:1, padding:"14px 4px", borderRadius:12, border:`2px solid ${mult===2?C.blue:C.border}`,
              background: mult===2 ? C.blue : "#101010", color: mult===2 ? "#04121f" : C.blue,
              fontWeight:900, fontSize:15, letterSpacing:.5, cursor:"pointer", boxShadow: mult===2?`0 0 16px ${C.blue}55`:"none" }}>
            DOUBLE
          </button>
          <button className="ck-key" onClick={() => setMult(mult === 3 ? 1 : 3)}
            style={{ flex:1, padding:"14px 4px", borderRadius:12, border:`2px solid ${mult===3?C.accent:C.border}`,
              background: mult===3 ? C.accent : "#101010", color: mult===3 ? "#1a0a00" : C.accent,
              fontWeight:900, fontSize:15, letterSpacing:.5, cursor:"pointer", boxShadow: mult===3?`0 0 16px ${C.accent}55`:"none" }}>
            TRIPLE
          </button>
          <button className="ck-key" onClick={miss} disabled={darts.length>=3||advancing}
            style={{ flex:1, padding:"14px 4px", borderRadius:12, border:`1px solid ${C.border}`,
              background:"#101010", color: darts.length>=3||advancing ? "#333" : C.muted,
              fontWeight:800, fontSize:14, letterSpacing:.5, cursor: darts.length>=3||advancing?"not-allowed":"pointer" }}>
            MISS
          </button>
          <button className="ck-key" onClick={undo} disabled={!historique.length || advancing}
            style={{ flex:1, padding:"14px 4px", borderRadius:12, border:`1px solid ${historique.length&&!advancing?`${C.yellow}66`:C.border}`,
              background:"#101010", color: historique.length && !advancing ? C.yellow : "#333",
              fontWeight:800, fontSize:19, cursor: historique.length&&!advancing?"pointer":"not-allowed" }}>
            ↩
          </button>
        </div>

        {/* Rang 2 : numéros (18/19/20/BULL plus grandes) */}
        <div style={{ display:"flex", gap:6 }}>
          {[15,16,17,18,19,20].map(z => {
            const m = actif.marks[z];
            const closed = m >= 3;
            const disabled = darts.length >= 3 || advancing;
            const big = z >= 18;
            return (
              <button key={z} className="ck-key" onClick={() => hit(z)} disabled={disabled}
                style={{ flex: big ? 1.34 : 1, padding:`${big?20:16}px 2px`, borderRadius:12,
                  border:`2px solid ${closed ? C.green : (disabled?"#1a1a1a":C.border)}`,
                  background: closed ? `${C.green}26` : (disabled?"#0b0b0b":"#171717"),
                  color: closed ? C.green : (disabled?"#333":C.text),
                  fontWeight:900, fontSize: big ? 24 : 19, cursor: disabled?"not-allowed":"pointer",
                  boxShadow: closed && !disabled ? `0 0 14px ${C.green}44` : "none" }}>
                {z}
              </button>
            );
          })}
          {(() => {
            const m = actif.marks["Bull"];
            const closed = m >= 3;
            const disabled = darts.length >= 3 || advancing;
            return (
              <button className="ck-key" onClick={() => hit("Bull")} disabled={disabled}
                style={{ flex:1.34, padding:"20px 2px", borderRadius:12,
                  border:`2px solid ${closed ? C.green : (disabled?"#1a1a1a":`${C.red}66`)}`,
                  background: closed ? `${C.green}26` : (disabled?"#0b0b0b":"#171717"),
                  color: closed ? C.green : (disabled?"#333":"#fca5a5"),
                  fontWeight:900, fontSize:20, cursor: disabled?"not-allowed":"pointer",
                  boxShadow: closed && !disabled ? `0 0 14px ${C.green}44` : "none" }}>
                BULL
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
