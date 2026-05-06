import { useState, useEffect, useCallback, useRef } from "react";

const C = {
  bg:"#0f0f0f", card:"#1a1a1a", card2:"#141414", border:"#2a2a2a",
  accent:"#f97316", muted:"#64748b", text:"#f1f5f9",
  green:"#22c55e", greenBg:"#14532d",
  red:"#ef4444",   redBg:"#7f1d1d",
  yellow:"#f59e0b", blue:"#60a5fa",
  purple:"#a78bfa",
};

const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sbJ = (path, opts={}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, {
    headers:{ "apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal",...(opts.prefer?{"Prefer":opts.prefer}:{}) },
    ...opts,
  }).then(r => r.ok ? (r.status===204?null:r.json()) : r.json().then(e=>{throw e;}));

const CHECKOUTS_OPT = {
  170:"T20 T20 Bull", 167:"T20 T19 Bull", 164:"T20 T18 Bull", 161:"T20 T17 Bull",
  160:"T20 T20 D20",
  158:"T20 T20 D19", 157:"T20 T19 D20",
  156:"T20 T20 D18", 155:"T20 T19 D19", 154:"T20 T18 D20",
  153:"T20 T19 D18", 152:"T20 T20 D16", 151:"T20 T17 D20",
  150:"T20 T18 D18", 149:"T20 T19 D16", 148:"T20 T16 D20",
  147:"T20 T17 D18", 146:"T20 T18 D16", 145:"T20 T15 D20",
  144:"T20 T20 D12", 143:"T20 T17 D16", 142:"T20 T14 D20",
  141:"T20 T19 D12", 140:"T20 T16 D16", 139:"T19 T14 D20",
  138:"T20 T18 D12", 137:"T19 T16 D16",
  136:"T20 T20 D8",  135:"T20 T17 D12", 134:"T20 T14 D16",
  133:"T20 T19 D8",  132:"T20 T16 D12", 131:"T20 T13 D16",
  130:"T20 20 Bull",
  129:"T19 T16 D12", 128:"T18 T14 D16", 127:"T20 T17 D8",
  126:"T19 T19 D6",  125:"25 T20 D20",  124:"T20 T16 D8",
  123:"T19 T16 D9",  122:"T18 T20 D4",  121:"T17 T10 D20",
  120:"T20 20 D20",  119:"T19 T10 D16",
  118:"T20 18 D20",  117:"T20 17 D20",  116:"T20 16 D20",
  115:"T20 15 D20",  114:"T20 14 D20",  113:"T20 13 D20",
  112:"T20 12 D20",  111:"T20 19 D16",  110:"T20 18 D16",
  109:"T19 20 D16",  108:"T20 16 D16",  107:"T19 18 D16",
  106:"T20 14 D16",  105:"T19 16 D16",  104:"T18 18 D16",
  103:"T20 3 D20",   102:"T20 10 D16",  101:"T20 1 D20",
  100:"T20 D20",     99:"T19 10 D16",
  98:"T20 D19",  97:"T19 D20",  96:"T20 D18",  95:"T19 D19",
  94:"T18 D20",  93:"T19 D18",  92:"T20 D16",  91:"T17 D20",
  90:"T20 D15",  89:"T19 D16",  88:"T16 D20",  87:"T17 D18",
  86:"T18 D16",  85:"T15 D20",  84:"T20 D12",  83:"T17 D16",
  82:"T14 D20",  81:"T19 D12",  80:"T20 D10",  79:"T13 D20",
  78:"T18 D12",  77:"T19 D10",  76:"T20 D8",   75:"T17 D12",
  74:"T14 D16",  73:"T19 D8",   72:"T16 D12",  71:"T13 D16",
  70:"T10 D20",  69:"T15 D12",  68:"T20 D4",   67:"T17 D8",
  66:"T10 D18",  65:"T19 D4",   64:"T16 D8",   63:"T13 D12",
  62:"T10 D16",  61:"T15 D8",   60:"20 D20",
  59:"19 D20",   58:"18 D20",   57:"17 D20",   56:"16 D20",
  55:"15 D20",   54:"14 D20",   53:"13 D20",   52:"12 D20",
  51:"11 D20",   50:"Bull",
  49:"9 D20",    48:"8 D20",    47:"7 D20",    46:"6 D20",
  45:"5 D20",    44:"4 D20",    43:"3 D20",    42:"2 D20",
  41:"1 D20",    40:"D20",
  38:"D19",  36:"D18",  34:"D17",  32:"D16",  30:"D15",
  28:"D14",  26:"D13",  24:"D12",  22:"D11",  20:"D10",
  18:"D9",   16:"D8",   14:"D7",   12:"D6",   10:"D5",
   8:"D4",    6:"D3",    4:"D2",    2:"D1",
};

const TOUS_FINISHES = Object.keys(CHECKOUTS_OPT).map(Number);

const DIFFICULTES = [
  { id:"facile",    label:"Facile",    emoji:"🟢", desc:"2–60",    finishes: TOUS_FINISHES.filter(f=>f<=60) },
  { id:"moyen",     label:"Moyen",     emoji:"🟡", desc:"61–100",  finishes: TOUS_FINISHES.filter(f=>f>60&&f<=100) },
  { id:"difficile", label:"Difficile", emoji:"🔴", desc:"101–170", finishes: TOUS_FINISHES.filter(f=>f>100) },
  { id:"tous",      label:"Tous",      emoji:"🎯", desc:"2–170",   finishes: TOUS_FINISHES },
];

const dartLabel  = (mult, num) => {
  if (num === 25) return mult === 1 ? "25" : mult === 2 ? "Bull" : null;
  return mult === 1 ? `${num}` : mult === 2 ? `D${num}` : `T${num}`;
};
const dartValue    = (mult, num) => mult * num;
const isFinishDart = (mult) => mult === 2;
const randFrom     = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Constantes BULL (locales, cohérentes avec AppJoueurs) ────────────────────
const BULL_COST_PAISIBLE = 1;
const BULL_COST_DRIX     = 2;
const BULL_INIT_LOCAL    = 250;

const SB_URL_EF = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY_EF = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const todayStrEF = () => new Date().toISOString().slice(0, 10);
const patchBull = (id, bull) =>
  fetch(`${SB_URL_EF}/rest/v1/joueurs?id=eq.${id}`, {
    method:"PATCH",
    headers:{ "apikey":SB_KEY_EF,"Authorization":`Bearer ${SB_KEY_EF}`,"Content-Type":"application/json","Prefer":"return=minimal" },
    body: JSON.stringify({ bull_balance: bull }),
  });

// ── Écran de sélection de mode ────────────────────────────────────────────────
const SelectionMode = ({ onSelect, setPage, joueur, setJoueur }) => {
  const [bullErr, setBullErr] = useState(null);
  const bull = joueur?.bull_balance ?? BULL_INIT_LOCAL;

  const lancer = async (mode) => {
    const cost = mode === "drix" ? BULL_COST_DRIX : BULL_COST_PAISIBLE;
    if (joueur) {
      if (bull < cost) {
        setBullErr(`Pas assez de BULL (${bull}/${cost} 🐂)`);
        setTimeout(() => setBullErr(null), 3000);
        return;
      }
      const newBull = bull - cost;
      await patchBull(joueur.id, newBull).catch(() => {});
      const updated = { ...joueur, bull_balance: newBull };
      setJoueur?.(updated);
      localStorage.setItem("dp_joueur", JSON.stringify(updated));
    }
    onSelect(mode);
  };

  return (
  <div style={{
    position:"fixed", inset:0, zIndex:200, background:C.bg,
    display:"flex", flexDirection:"column", overflow:"hidden",
  }}>
    {/* Header */}
    <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"10px 14px", display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
      <button onClick={()=>setPage("jeux")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}>← Retour</button>
      <div style={{ flex:1, fontWeight:800, fontSize:16, color:C.text }}>🎯 Comptage de finish</div>
      {joueur && <div style={{ display:"flex",alignItems:"center",gap:4,background:"#1a0f00",border:"1px solid #f9731644",borderRadius:8,padding:"3px 10px" }}>
        <span style={{ fontSize:13 }}>🐂</span>
        <span style={{ fontWeight:900,fontSize:13,color:"#f97316" }}>{bull}</span>
        <span style={{ fontSize:10,color:"#a16207",fontWeight:700 }}>BULL</span>
      </div>}
    </div>

    <div style={{ flex:1, overflowY:"auto", padding:"20px 14px", display:"flex", flexDirection:"column", gap:14 }}>

      {/* Titre */}
      <div style={{ textAlign:"center", marginBottom:6 }}>
        <div style={{ fontSize:13, color:C.muted }}>Choisis ton mode de jeu</div>
        {bullErr && <div style={{ marginTop:8,background:"#450a0a",border:"1px solid #ef4444",borderRadius:8,padding:"8px 12px",color:"#fca5a5",fontSize:13,fontWeight:600 }}>⚠️ {bullErr}</div>}
      </div>

      {/* ── Mode Paisible ── */}
      <div onClick={()=>lancer("paisible")}
        style={{ background:"linear-gradient(135deg,#1a2a1a,#141414)", border:`2px solid ${C.green}44`, borderRadius:20, padding:"22px 18px", cursor:"pointer", transition:"all .15s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
          <div style={{ fontSize:40 }}>😌</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:900, fontSize:20, color:C.green }}>Mode Paisible</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>Entraînement sans enjeu</div>
          </div>
          <div style={{ background:"#1a0f00",border:"1px solid #f9731644",borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:800,color:"#f97316",flexShrink:0 }}>🐂 1 BULL</div>
        </div>
        <ul style={{ margin:0, padding:"0 0 0 18px", color:"#86efac", fontSize:13, lineHeight:1.8 }}>
          <li>Aide affichable (total courant)</li>
          <li>Solution optimale affichée après chaque finish</li>
          <li>Stats de série et record perso</li>
          <li>Aucun DRIX en jeu — juste de la pratique !</li>
        </ul>
        {joueur && bull < BULL_COST_PAISIBLE
          ? <div style={{ marginTop:14,background:"#450a0a",border:"1px solid #ef4444",borderRadius:10,padding:"10px",textAlign:"center",fontSize:13,color:"#fca5a5",fontWeight:700 }}>🐂 Solde insuffisant ({bull}/1 BULL)</div>
          : <div style={{ marginTop:14, background:C.green, borderRadius:10, padding:"11px", textAlign:"center", fontWeight:800, fontSize:15, color:"#fff" }}>Commencer →</div>
        }
      </div>

      {/* ── Mode DRIX ── */}
      <div onClick={()=>joueur ? lancer("drix") : null}
        style={{ background:"linear-gradient(135deg,#1a0a00,#1a1a00)", border:`2px solid ${C.accent}`, borderRadius:20, padding:"22px 18px", cursor:"pointer", transition:"all .15s" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
          <div style={{ fontSize:40 }}>⚡</div>
          <div>
            <div style={{ fontWeight:900, fontSize:20, color:C.accent }}>Chasse aux DRIX</div>
            <div style={{ fontSize:12, color:C.yellow, marginTop:2, fontWeight:700 }}>Prouve que tu connais tes finishes !</div>
          </div>
        </div>

        {/* Règles */}
        <div style={{ background:"#00000033", borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ fontWeight:800, fontSize:12, color:C.accent, marginBottom:8, letterSpacing:1 }}>📋 RÈGLES</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>🔥</span>
              <span style={{ fontSize:13, color:C.text, lineHeight:1.5 }}>
                Enchaîne <b style={{ color:C.yellow }}>10 finishes corrects</b> d'affilée sans aide
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>💎</span>
              <span style={{ fontSize:13, color:C.text, lineHeight:1.5 }}>
                Série de 10 réussie = <b style={{ color:C.green }}>+5 DRIX</b> ajoutés à ton classement
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>💥</span>
              <span style={{ fontSize:13, color:C.text, lineHeight:1.5 }}>
                Une faute en cours de série = <b style={{ color:C.red }}>−5 DRIX</b> et la série repart à zéro
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>🚫</span>
              <span style={{ fontSize:13, color:C.text, lineHeight:1.5 }}>
                Aucune aide — le total est caché, à toi de calculer !
              </span>
            </div>
            <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
              <span style={{ fontSize:18, flexShrink:0 }}>⏱</span>
              <span style={{ fontSize:13, color:C.text, lineHeight:1.5 }}>
                <b style={{ color:C.yellow }}>1 min 20</b> pour répondre — le temps s'écoule, dépêche-toi !
              </span>
            </div>
          </div>
        </div>

        {!joueur
          ? <div style={{ marginTop:4, background:"#1a1a1a", border:`1px solid ${C.border}`, borderRadius:10, padding:"11px", textAlign:"center", fontSize:13, color:C.muted }}>
              🔒 Connecte-toi pour jouer ce mode
            </div>
          : bull < BULL_COST_DRIX
            ? <div style={{ marginTop:4, background:"#450a0a", border:"1px solid #ef4444", borderRadius:10, padding:"11px", textAlign:"center", fontSize:13, color:"#fca5a5", fontWeight:700 }}>
                🐂 Solde insuffisant ({bull}/2 BULL)
              </div>
            : <div style={{ marginTop:4, background:`linear-gradient(135deg,${C.accent},#ea580c)`, borderRadius:10, padding:"11px", textAlign:"center", fontWeight:800, fontSize:15, color:"#fff", display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
                <span>⚡ Jouer pour les DRIX →</span>
                <span style={{ background:"#00000033",borderRadius:20,padding:"2px 8px",fontSize:11 }}>🐂 2 BULL</span>
              </div>
        }
      </div>

    </div>
  </div>
  );
};

// ── Jeu principal (Paisible + DRIX) ──────────────────────────────────────────
const Jeu = ({ mode, diffId: initDiff, setPage, joueur }) => {
  const [diffId, setDiffId]       = useState(initDiff || "tous");
  const [finish, setFinish]       = useState(null);
  const [darts, setDarts]         = useState([]);
  const [multSel, setMultSel]     = useState(null);
  const [phase, setPhase]         = useState("jeu");
  const [errMsg, setErrMsg]       = useState("");
  const [showTotal, setShowTotal] = useState(mode === "paisible");
  const [stats, setStats]         = useState({ ok:0, nok:0, serie:0, best:0 });
  const [showDiff, setShowDiff]   = useState(false);

  // Mode DRIX
  const [drixSerie, setDrixSerie]       = useState(0);    // finishes corrects en cours (0–9)
  const [drixLocal, setDrixLocal]       = useState(joueur?.drix || 1000);
  const [drixFlash, setDrixFlash]       = useState(null); // "+5 DRIX" ou "−5 DRIX"
  const [savingDrix, setSavingDrix]     = useState(false);

  // Minuteur DRIX (7 secondes)
  const [timer, setTimer]               = useState(7);
  const [timeOut, setTimeOut]           = useState(false);
  const timeOutHandledRef               = useRef(false);
  const drixSerieRef                    = useRef(drixSerie);
  useEffect(() => { drixSerieRef.current = drixSerie; }, [drixSerie]);

  const isDrix = mode === "drix";
  const diffCurrent = DIFFICULTES.find(d => d.id === diffId);

  const nouveauFinish = useCallback((dId = diffId) => {
    const liste = DIFFICULTES.find(d => d.id === dId)?.finishes || TOUS_FINISHES;
    setFinish(randFrom(liste));
    setDarts([]);
    setMultSel(null);
    setPhase("jeu");
    setErrMsg("");
    // Réinitialise le minuteur DRIX
    setTimer(7);
    setTimeOut(false);
    timeOutHandledRef.current = false;
  }, [diffId]);

  useEffect(() => { nouveauFinish(); }, []);

  // ── Compte à rebours (DRIX uniquement, pendant la phase "jeu") ──
  useEffect(() => {
    if (!isDrix || phase !== "jeu" || timeOut) return;
    if (timer <= 0) {
      if (!timeOutHandledRef.current) {
        timeOutHandledRef.current = true;
        setTimeOut(true);
        setPhase("timeout");
        setStats(s => ({ ...s, nok: s.nok + 1, serie: 0 }));
        if (drixSerieRef.current > 0) {
          setDrixSerie(0);
          applyDrix(-5);
        } else {
          setDrixSerie(0);
        }
      }
      return;
    }
    const id = setTimeout(() => setTimer(t => Math.max(0, t - 1)), 1000);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrix, timer, timeOut, phase]);

  // Met à jour le DRIX en BDD + flash
  const applyDrix = async (delta) => {
    if (!joueur?.id || savingDrix) return;
    setSavingDrix(true);
    const newDrix = Math.max(0, drixLocal + delta);
    setDrixLocal(newDrix);
    setDrixFlash(delta > 0 ? `+${delta} DRIX 🎉` : `${delta} DRIX 💥`);
    setTimeout(() => setDrixFlash(null), 2500);
    try {
      await sbJ(`joueurs?id=eq.${joueur.id}`, {
        method:"PATCH",
        body: JSON.stringify({ drix: newDrix }),
      });
      await sbJ("drix_mouvements", {
        method:"POST",
        body: JSON.stringify({
          joueur_id:        joueur.id,
          joueur_pseudo:    joueur.pseudo,
          adversaire_pseudo:"Comptage de finish",
          variation:        delta,
          drix_avant:       drixLocal,
          drix_apres:       newDrix,
          resultat:         delta > 0 ? "victoire" : "defaite",
          date:             Date.now(),
        }),
      });
    } catch(e) { console.error("DRIX update error:", e); }
    setSavingDrix(false);
  };

  const toggleMult = (m) => {
    if (phase !== "jeu") return;
    setMultSel(prev => prev === m ? null : m);
    setErrMsg("");
  };

  const selectNum = (num) => {
    if (phase !== "jeu") return;
    if (darts.length >= 3) { setErrMsg("Max 3 fléchettes"); return; }
    const mult = multSel ?? 1;
    if (num === 25 && mult === 3) { setErrMsg("Triple 25 n'existe pas"); return; }
    const label = dartLabel(mult, num);
    const value = dartValue(mult, num);
    const newDarts = [...darts, { mult, num, label, value }];
    setDarts(newDarts);
    setMultSel(null);
    setErrMsg("");
    const newTotal = newDarts.reduce((s, d) => s + d.value, 0);
    if (newTotal > finish && !isDrix) setErrMsg(`Total ${newTotal} > ${finish}`);
  };

  const annulerDernier = () => { if (phase !== "jeu") return; setDarts(p => p.slice(0, -1)); setErrMsg(""); };
  const reinitialiser  = () => { setDarts([]); setMultSel(null); setErrMsg(""); };

  const valider = async () => {
    if (phase !== "jeu" || darts.length === 0) return;
    const total    = darts.reduce((s, d) => s + d.value, 0);
    const lastDart = darts[darts.length - 1];
    const correct  = total === finish && isFinishDart(lastDart.mult);

    if (correct) {
      setStats(s => { const ns = s.serie + 1; return { ok:s.ok+1, nok:s.nok, serie:ns, best:Math.max(s.best,ns) }; });
      setPhase("correct");
      if (isDrix) {
        const newSerie = drixSerie + 1;
        if (newSerie >= 10) {
          setDrixSerie(0);
          await applyDrix(+5);
        } else {
          setDrixSerie(newSerie);
        }
      }
    } else {
      setStats(s => ({ ...s, nok:s.nok+1, serie:0 }));
      setPhase("incorrect");
      if (isDrix && drixSerie > 0) {
        setDrixSerie(0);
        await applyDrix(-5);
      } else if (isDrix) {
        setDrixSerie(0);
      }
    }
    setErrMsg("");
  };

  const total       = darts.reduce((s, d) => s + d.value, 0);
  const reste       = finish ? finish - total : 0;
  const pct         = (stats.ok + stats.nok) > 0 ? Math.round(stats.ok / (stats.ok + stats.nok) * 100) : null;
  const optSol      = CHECKOUTS_OPT[finish] ?? "—";
  const playerCombo = darts.map(d => d.label).join(" + ");
  const isOptimal   = phase === "correct" && playerCombo === optSol;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:C.bg, display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{`@keyframes pulse{from{opacity:1}to{opacity:0.4}}`}</style>

      {/* ── Flash DRIX ── */}
      {drixFlash && (
        <div style={{
          position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)",
          zIndex:999, background:"#000000cc", borderRadius:20, padding:"18px 32px",
          fontSize:28, fontWeight:900, color: drixFlash.startsWith("+") ? C.green : C.red,
          textAlign:"center", pointerEvents:"none", animation:"none",
          boxShadow:`0 0 40px ${drixFlash.startsWith("+") ? C.green : C.red}66`,
        }}>
          {drixFlash}
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"8px 12px", display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
        <button onClick={()=>setPage("entrainement-finish")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0,whiteSpace:"nowrap" }}>← Modes</button>
        <div style={{ flex:1, fontWeight:800, fontSize:14, color: isDrix ? C.accent : C.green }}>
          {isDrix ? "⚡ Chasse aux DRIX" : "😌 Mode Paisible"}
        </div>
        {isDrix && joueur && (
          <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, padding:"3px 10px", fontSize:12, fontWeight:800, color:C.purple }}>
            💎 {drixLocal}
          </div>
        )}
        {!isDrix && (
          <button onClick={()=>setShowDiff(d=>!d)} style={{ background:C.card2,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px",color:C.muted,cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap" }}>
            {diffCurrent.emoji} {diffCurrent.label}
          </button>
        )}
      </div>

      {/* ── Sélecteur difficulté (mode paisible uniquement) ── */}
      {showDiff && !isDrix && (
        <div style={{ background:C.card,border:`1px solid ${C.border}`,position:"absolute",top:46,right:8,zIndex:10,borderRadius:12,padding:8,width:200,boxShadow:"0 8px 24px #000a" }}>
          {DIFFICULTES.map(d => (
            <div key={d.id} onClick={()=>{ setDiffId(d.id); setShowDiff(false); nouveauFinish(d.id); }}
              style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:"pointer",background:diffId===d.id?C.accent+"22":"transparent" }}>
              <span style={{ fontSize:16 }}>{d.emoji}</span>
              <div>
                <div style={{ fontWeight:700,color:diffId===d.id?C.accent:C.text,fontSize:13 }}>{d.label}</div>
                <div style={{ fontSize:10,color:C.muted }}>{d.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Barre série DRIX ── */}
      {isDrix && (
        <div style={{ background:"#0f0a00", borderBottom:`1px solid ${C.accent}33`, padding:"6px 12px", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:11, color:C.accent, fontWeight:700 }}>🔥 SÉRIE</span>
            <span style={{ fontSize:13, fontWeight:900, color: drixSerie >= 7 ? C.yellow : C.text }}>{drixSerie}/10</span>
            <span style={{ fontSize:10, color:C.muted, marginLeft:"auto" }}>
              {drixSerie === 0 ? "Lance-toi !" : drixSerie < 5 ? "Continue !" : drixSerie < 8 ? "Bien joué 🔥" : drixSerie < 10 ? "Incroyable 🚀" : ""}
            </span>
          </div>
          {/* Barre de progression */}
          <div style={{ height:6, background:"#2a2a2a", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${drixSerie * 10}%`, background: drixSerie >= 7 ? C.yellow : C.accent, borderRadius:3, transition:"width .3s ease" }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}>
            {[...Array(10)].map((_,i) => (
              <div key={i} style={{ width:6, height:6, borderRadius:"50%", background: i < drixSerie ? (i >= 6 ? C.yellow : C.accent) : "#2a2a2a", transition:"background .2s" }}/>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats bar (mode paisible) ── */}
      {!isDrix && (
        <div style={{ display:"flex", background:C.card2, borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
          {[
            { label:"✅", val:stats.ok,                       color:C.green  },
            { label:"❌", val:stats.nok,                      color:C.red    },
            { label:"📊", val:pct!==null?`${pct}%`:"—",      color:C.blue   },
            { label:"🔥", val:stats.serie,                    color:C.yellow },
            { label:"🏆", val:stats.best,                     color:C.accent },
          ].map((s,i) => (
            <div key={i} style={{ flex:1,textAlign:"center",padding:"5px 2px",borderRight:i<4?`1px solid ${C.border}`:"none" }}>
              <div style={{ fontSize:14,fontWeight:800,color:s.color }}>{s.val}</div>
              <div style={{ fontSize:8,color:C.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Zone principale ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"6px 10px", gap:5, overflow:"hidden", minHeight:0 }}>

        {/* Finish */}
        <div style={{ background: isDrix ? "linear-gradient(135deg,#1a0800,#0f0a00)" : "linear-gradient(135deg,#1a0800,#1a1a2e)", border:`2px solid ${isDrix ? C.accent : C.accent+"44"}`, borderRadius:12, padding:"6px 12px", textAlign:"center", flexShrink:0 }}>
          <div style={{ fontSize:9, color:C.muted, letterSpacing:2 }}>FINISH À RÉALISER</div>
          <div style={{ fontSize:58, fontWeight:900, color:C.accent, lineHeight:1.05 }}>{finish ?? "—"}</div>
          {isDrix && <div style={{ fontSize:9, color:C.muted }}>🚫 Aucune aide — calcule !</div>}
        </div>

        {/* Fléchettes */}
        <div style={{ display:"flex", gap:6, flexShrink:0 }}>
          {[0,1,2].map(i => {
            const d = darts[i];
            return (
              <div key={i} style={{ flex:1,height:50,borderRadius:10,border:`2px dashed ${d?C.accent:C.border}`,background:d?(phase==="correct"?C.greenBg:phase==="incorrect"?C.redBg:C.card):C.card2,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center" }}>
                {d?(<>
                  <div style={{ fontSize:16,fontWeight:800,color:phase==="correct"?C.green:phase==="incorrect"?C.red:C.accent }}>{d.label}</div>
                  <div style={{ fontSize:9,color:C.muted }}>{d.value}pts</div>
                </>):(<div style={{ fontSize:18,color:C.border }}>🎯</div>)}
              </div>
            );
          })}
        </div>

        {/* Toggle aide (mode paisible uniquement) + total */}
        {!isDrix && (
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <div style={{ flex:1, fontSize:12, color:C.muted }}>
              {showTotal && darts.length > 0 && phase==="jeu" ? (<>
                Total&nbsp;<b style={{ color:total>finish?C.red:total===finish?C.green:C.text }}>{total}</b>
                <span style={{ color:C.muted }}> / {finish}</span>
                {total<finish&&<span style={{ color:C.yellow }}>&nbsp;(reste {reste})</span>}
              </>):<span style={{ opacity:0 }}>–</span>}
            </div>
            <span style={{ fontSize:11,color:C.muted,whiteSpace:"nowrap" }}>Aide total</span>
            <div onClick={()=>setShowTotal(v=>!v)} style={{ width:34,height:20,borderRadius:10,background:showTotal?C.accent:C.border,cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0 }}>
              <div style={{ position:"absolute",top:2,left:showTotal?16:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left .2s" }}/>
            </div>
          </div>
        )}

        {/* Erreur */}
        {errMsg && (
          <div style={{ background:C.redBg,borderRadius:8,padding:"5px 10px",fontSize:11,color:C.red,textAlign:"center",flexShrink:0 }}>⚠️ {errMsg}</div>
        )}

        {/* ── Résultat CORRECT ── */}
        {phase === "correct" && (
          <div style={{ flex:1,background:C.greenBg,border:`1px solid ${C.green}`,borderRadius:12,padding:"12px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,minHeight:0 }}>
            <div style={{ fontSize:28 }}>🎉</div>
            <div style={{ fontWeight:800,fontSize:16,color:C.green }}>Bonne combinaison !</div>
            {isDrix && (
              <div style={{ background:"#052e16",borderRadius:10,padding:"6px 14px",textAlign:"center" }}>
                <span style={{ fontSize:13,color:"#86efac",fontWeight:700 }}>
                  Série : <b style={{ color: drixSerie >= 7 ? C.yellow : C.green }}>{drixSerie}/10</b>
                  {drixSerie === 0 && " 🎊 +5 DRIX remportés !"}
                </span>
              </div>
            )}
            {!isDrix && (
              <div style={{ background:"#052e16",borderRadius:10,padding:"8px 12px",textAlign:"center",width:"100%" }}>
                <div style={{ fontSize:10,color:C.muted,marginBottom:3 }}>
                  💡 {isOptimal?"C'est la solution optimale 🏆":"Solution optimale officielle :"}
                </div>
                <div style={{ fontWeight:800,color:C.green,fontSize:16,letterSpacing:1 }}>{optSol}</div>
                {!isOptimal&&<div style={{ fontSize:10,color:"#86efac",marginTop:3 }}>Ta route est valide mais il existe une meilleure route.</div>}
              </div>
            )}
            <button onClick={()=>nouveauFinish()} style={{ background:C.green,color:"#fff",border:"none",borderRadius:10,padding:"12px 0",fontWeight:800,fontSize:14,cursor:"pointer",width:"100%" }}>
              Suivant →
            </button>
          </div>
        )}

        {/* ── Résultat INCORRECT ── */}
        {phase === "incorrect" && (
          <div style={{ flex:1,background:C.redBg,border:`1px solid ${C.red}`,borderRadius:12,padding:"12px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,minHeight:0 }}>
            <div style={{ fontSize:28 }}>😬</div>
            <div style={{ fontWeight:800,fontSize:16,color:C.red }}>Mauvaise combinaison</div>
            {isDrix && (
              <div style={{ background:"#450a0a",borderRadius:10,padding:"6px 14px",textAlign:"center" }}>
                <span style={{ fontSize:13,color:"#fca5a5",fontWeight:700 }}>
                  {drixSerie > 0 ? `Série brisée à ${drixSerie} — ` : ""}💥 −5 DRIX perdus
                </span>
              </div>
            )}
            <div style={{ background:"#450a0a",borderRadius:10,padding:"8px 12px",textAlign:"center",width:"100%" }}>
              <div style={{ fontSize:10,color:C.muted,marginBottom:3 }}>💡 La bonne combinaison est :</div>
              <div style={{ fontWeight:800,color:"#fca5a5",fontSize:16,letterSpacing:1 }}>{optSol}</div>
            </div>
            <div style={{ display:"flex",gap:8,width:"100%" }}>
              <button onClick={()=>{setDarts([]);setMultSel(null);setPhase("jeu");setErrMsg("");}}
                style={{ flex:1,background:"#1a1a1a",color:C.text,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px",fontWeight:700,fontSize:13,cursor:"pointer" }}>
                Réessayer
              </button>
              <button onClick={()=>nouveauFinish()}
                style={{ flex:1,background:C.accent,color:"#fff",border:"none",borderRadius:10,padding:"11px",fontWeight:800,fontSize:13,cursor:"pointer" }}>
                Suivant →
              </button>
            </div>
          </div>
        )}

        {/* ── Temps écoulé ── */}
        {phase === "timeout" && (
          <div style={{ flex:1,background:"#1a0a1a",border:`2px solid ${C.purple}`,borderRadius:12,padding:"14px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,minHeight:0 }}>
            <div style={{ fontSize:36 }}>⏰</div>
            <div style={{ fontWeight:900,fontSize:18,color:C.purple }}>Temps écoulé !</div>
            <div style={{ background:"#0f0a1a",borderRadius:10,padding:"8px 14px",textAlign:"center",width:"100%" }}>
              <div style={{ fontSize:12,color:C.muted,marginBottom:3 }}>Temps écoulé en 7 secondes !</div>
              {drixSerieRef.current > 0
                ? <div style={{ fontWeight:800,color:"#fca5a5",fontSize:14 }}>💥 Série brisée — −5 DRIX</div>
                : <div style={{ fontWeight:700,color:C.muted,fontSize:13 }}>Série à zéro — aucun DRIX perdu</div>
              }
              <div style={{ fontSize:11,color:C.muted,marginTop:4 }}>💡 La bonne combinaison était : <b style={{ color:C.purple }}>{optSol}</b></div>
            </div>
            <button onClick={()=>nouveauFinish()}
              style={{ width:"100%",background:`linear-gradient(135deg,${C.accent},#ea580c)`,color:"#fff",border:"none",borderRadius:10,padding:"13px",fontWeight:900,fontSize:15,cursor:"pointer" }}>
              ⚡ Continuer →
            </button>
            <button onClick={()=>setPage("entrainement-finish")}
              style={{ width:"100%",background:"#1a1a1a",color:C.muted,border:`1px solid ${C.border}`,borderRadius:10,padding:"10px",fontWeight:600,fontSize:13,cursor:"pointer" }}>
              ← Quitter
            </button>
          </div>
        )}

        {/* ── Clavier ── */}
        {phase === "jeu" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",gap:5,minHeight:0 }}>

            {/* Double / Triple */}
            <div style={{ display:"flex",gap:6,flexShrink:0 }}>
              {[{mult:2,label:"2× Double",color:C.blue},{mult:3,label:"3× Triple",color:C.green}].map(({mult,label,color})=>(
                <button key={mult} onClick={()=>toggleMult(mult)}
                  style={{ flex:1,padding:"9px 8px",borderRadius:10,border:`2px solid ${multSel===mult?color:C.border}`,background:multSel===mult?color+"22":C.card,color:multSel===mult?color:C.muted,fontWeight:800,fontSize:14,cursor:"pointer",boxShadow:multSel===mult?`0 0 12px ${color}44`:"none" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Mode hint */}
            <div style={{ textAlign:"center",fontSize:10,color:C.muted,flexShrink:0 }}>
              {multSel===2?<span style={{ color:C.blue,fontWeight:700 }}>Mode Double — clique un chiffre</span>
              :multSel===3?<span style={{ color:C.green,fontWeight:700 }}>Mode Triple — clique un chiffre</span>
              :<span>Clique directement (Simple) ou active D / T d'abord</span>}
            </div>

            {/* Grille */}
            <div style={{ flex:1,display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,minHeight:0 }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(num=>(
                <button key={num} onClick={()=>selectNum(num)}
                  style={{ borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:14,border:`1px solid ${multSel===2?C.blue+"66":multSel===3?C.green+"66":C.border}`,background:multSel===2?C.blue+"11":multSel===3?C.green+"11":C.card,color:multSel===2?C.blue:multSel===3?C.green:C.text,display:"flex",alignItems:"center",justifyContent:"center" }}>
                  {num}
                </button>
              ))}
              <button onClick={()=>selectNum(25)} disabled={multSel===3}
                style={{ borderRadius:8,fontWeight:800,fontSize:12,border:`1px solid ${multSel===3?"#333":C.yellow+"66"}`,background:multSel===3?"#111":C.yellow+"11",color:multSel===3?C.border:C.yellow,cursor:multSel===3?"default":"pointer",opacity:multSel===3?0.3:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
                {multSel===2?"Bull":"25"}
              </button>

              {/* ── Minuteur DRIX (colonnes 2-5 de la dernière ligne) ── */}
              {isDrix && (
                <div style={{
                  gridColumn:"span 4",
                  borderRadius:8,
                  border:`2px solid ${timer <= 3 ? C.red : timer <= 5 ? C.accent : C.border}`,
                  background: timer <= 3 ? "#450a0a" : timer <= 5 ? "#1a0800" : C.card,
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  transition:"background .3s, border-color .3s",
                }}>
                  <span style={{ fontSize:11, color: timer <= 3 ? C.red : timer <= 5 ? C.accent : C.muted }}>⏱</span>
                  <span style={{
                    fontWeight:900,
                    fontSize: timer <= 3 ? 20 : 17,
                    color: timer <= 3 ? C.red : timer <= 5 ? C.accent : C.text,
                    fontVariantNumeric:"tabular-nums",
                    letterSpacing:1,
                    animation: timer <= 3 ? "pulse 0.5s ease-in-out infinite alternate" : "none",
                  }}>
                    {timer}s
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display:"flex",gap:5,flexShrink:0 }}>
              <button onClick={annulerDernier} disabled={!darts.length}
                style={{ flex:1,padding:"10px 4px",borderRadius:9,border:`1px solid ${C.border}`,background:C.card,color:darts.length?C.text:C.muted,fontWeight:600,fontSize:12,cursor:darts.length?"pointer":"default" }}>↩</button>
              <button onClick={reinitialiser} disabled={!darts.length}
                style={{ flex:1,padding:"10px 4px",borderRadius:9,border:`1px solid ${C.border}`,background:C.card,color:darts.length?C.text:C.muted,fontWeight:600,fontSize:12,cursor:darts.length?"pointer":"default" }}>🔄</button>
              <button onClick={()=>{ if(isDrix && drixSerie > 0){ setDrixSerie(0); applyDrix(-5); } setStats(s=>({...s,nok:s.nok+1,serie:0})); nouveauFinish(); }}
                style={{ flex:1,padding:"10px 4px",borderRadius:9,border:`1px solid ${C.border}`,background:C.card,color:C.muted,fontWeight:600,fontSize:12,cursor:"pointer" }}>⏭</button>
              <button onClick={valider} disabled={!darts.length}
                style={{ flex:3,padding:"10px",borderRadius:9,border:"none",background:darts.length?C.accent:"#222",color:darts.length?"#fff":C.muted,fontWeight:900,fontSize:14,cursor:darts.length?"pointer":"default",boxShadow:darts.length?`0 3px 14px ${C.accent}55`:"none" }}>
                ✅ Valider
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Export principal ──────────────────────────────────────────────────────────
export const EntrainementFinish = ({ setPage, joueur, setJoueur }) => {
  const [mode, setMode] = useState(null); // null = sélection | "paisible" | "drix"

  // Retour à la sélection quand on clique "← Modes"
  const handleSetPage = (p) => {
    if (p === "entrainement-finish") { setMode(null); return; }
    setPage(p);
  };

  if (!mode) return <SelectionMode onSelect={setMode} setPage={setPage} joueur={joueur} setJoueur={setJoueur}/>;
  return <Jeu mode={mode} setPage={handleSetPage} joueur={joueur} />;
};
