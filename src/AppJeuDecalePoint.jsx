import { useState, useEffect } from "react";

const C = {
  bg:"#0f0f0f", card:"#1a1a1a", border:"#2a2a2a",
  accent:"#f97316", text:"#f1f5f9", muted:"#94a3b8",
  green:"#22c55e", red:"#ef4444", yellow:"#f59e0b", purple:"#a78bfa", blue:"#60a5fa",
};

const OBJECTIFS = [
  { id:1,  nom:"🎯 Le 20",        desc:"Toucher le 20" },
  { id:2,  nom:"↔️ Côte à côte",  desc:"3 fléchettes dans segments adjacents" },
  { id:3,  nom:"🎯 Le 19",        desc:"Toucher le 19" },
  { id:4,  nom:"➡️ La suite",     desc:"3 fléchettes consécutives (ex: 1-2-3)" },
  { id:5,  nom:"🎯 Le 18",        desc:"Toucher le 18" },
  { id:6,  nom:"🎨 La couleur",   desc:"Une fléchette dans chaque couleur" },
  { id:7,  nom:"🎯 Le 17",        desc:"Toucher le 17" },
  { id:8,  nom:"✌️ Le double",    desc:"Compter les fléchettes dans un double" },
  { id:9,  nom:"🎯 Le 16",        desc:"Toucher le 16" },
  { id:10, nom:"✖️ Le triple",    desc:"Compter les fléchettes dans un triple" },
  { id:11, nom:"🎯 Le 15",        desc:"Toucher le 15" },
  { id:12, nom:"5️⃣7️⃣ Le 57",     desc:"Faire exactement 57 points" },
  { id:13, nom:"🎯 Le 14",        desc:"Toucher le 14" },
  { id:14, nom:"🎱 Le centre",    desc:"Bull (25) ou Bullseye (50)" },
];

// ── SETUP ─────────────────────────────────────────────────────────────────────
const Setup = ({ onStart }) => {
  const [joueurs, setJoueurs] = useState(["", ""]);
  const ajouterJoueur = () => { if (joueurs.length < 8) setJoueurs(j => [...j, ""]); };
  const supprimerJoueur = (i) => { if (joueurs.length > 1) setJoueurs(j => j.filter((_,idx) => idx !== i)); };
  const setNom = (i, v) => setJoueurs(j => j.map((n, idx) => idx === i ? v : n));
  const valid = joueurs.every(j => j.trim().length > 0);
  return (
    <div style={{ maxWidth:480, margin:"0 auto", padding:"40px 20px" }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ fontSize:48, marginBottom:8 }}>🎯</div>
        <h1 style={{ fontWeight:800, fontSize:26, color:C.accent }}>Le Capital</h1>
        <p style={{ color:C.muted, fontSize:14, marginTop:6 }}>14 objectifs · une volée chacun · meilleur score gagne</p>
      </div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:24, marginBottom:20 }}>
        <h2 style={{ fontWeight:700, fontSize:16, marginBottom:16 }}>👥 Joueurs</h2>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {joueurs.map((nom, i) => (
            <div key={i} style={{ display:"flex", gap:8, alignItems:"center" }}>
              <input value={nom} onChange={e => setNom(i, e.target.value)} placeholder={`Joueur ${i + 1}`}
                style={{ flex:1, background:"#111", border:`1px solid ${C.border}`, borderRadius:8, padding:"10px 14px", color:C.text, fontSize:14 }}/>
              {joueurs.length > 1 && (
                <button onClick={() => supprimerJoueur(i)} style={{ background:"#1a0000", border:`1px solid ${C.red}44`, borderRadius:8, color:C.red, cursor:"pointer", fontSize:16, padding:"8px 12px" }}>✕</button>
              )}
            </div>
          ))}
        </div>
        {joueurs.length < 8 && (
          <button onClick={ajouterJoueur} style={{ marginTop:12, width:"100%", background:"transparent", border:`1px dashed ${C.border}`, borderRadius:8, color:C.muted, cursor:"pointer", padding:"10px", fontSize:13 }}>
            + Ajouter un joueur
          </button>
        )}
      </div>
      <button onClick={() => valid && onStart(joueurs.map(j => j.trim()))} disabled={!valid}
        style={{ width:"100%", background:valid ? C.accent : "#333", color:"#fff", border:"none", borderRadius:12, padding:"16px", fontSize:16, fontWeight:700, cursor:valid ? "pointer" : "not-allowed", opacity:valid ? 1 : 0.5 }}>
        🎮 Lancer la partie
      </button>
    </div>
  );
};

// ── PAD ───────────────────────────────────────────────────────────────────────
const Pad = ({ joueur, objectif, onValider, onDiviser, onFermer }) => {
  const [saisie, setSaisie] = useState("");
  const appuyer = (v) => {
    if (v === "⌫") { setSaisie(s => s.slice(0,-1)); return; }
    if (saisie.length >= 3) return;
    setSaisie(s => s + v);
  };
  const touches = ["1","2","3","4","5","6","7","8","9","⌫","0",""];
  return (
    <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={onFermer}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#1a1a1a", border:`1px solid ${C.border}`, borderRadius:"20px 20px 0 0", padding:24, width:"100%", maxWidth:480 }}>
        <div style={{ textAlign:"center", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:16, color:C.accent }}>{joueur}</div>
          <div style={{ color:C.muted, fontSize:13, marginTop:2 }}>{objectif.nom}</div>
          <div style={{ color:"#555", fontSize:11, marginTop:2 }}>{objectif.desc}</div>
        </div>
        <div style={{ background:"#111", border:`1px solid ${C.border}`, borderRadius:10, padding:"14px 20px", textAlign:"center", fontSize:32, fontWeight:800, color:C.text, marginBottom:16, minHeight:60 }}>
          {saisie || <span style={{ color:"#333" }}>0</span>}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
          {touches.map((t, i) => (
            t === "" ? <div key={i}/> :
            <button key={i} onClick={() => appuyer(t)} style={{ background:"#111", border:`1px solid ${C.border}`, borderRadius:10, color:C.text, fontSize:20, fontWeight:600, padding:"16px", cursor:"pointer" }}>{t}</button>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <button onClick={() => { onDiviser(); onFermer(); }} style={{ background:"#1a0f00", border:`1px solid ${C.yellow}`, borderRadius:10, color:C.yellow, fontSize:15, fontWeight:700, padding:"14px", cursor:"pointer" }}>÷2 Raté</button>
          <button onClick={() => { onValider(parseInt(saisie) || 0); onFermer(); }} style={{ background:C.accent, border:"none", borderRadius:10, color:"#fff", fontSize:15, fontWeight:700, padding:"14px", cursor:"pointer" }}>✅ Valider</button>
        </div>
      </div>
    </div>
  );
};

// ── MODAL QUITTER ─────────────────────────────────────────────────────────────
const ModalQuitter = ({ onRester, onQuitter }) => (
  <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:600, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:16, padding:28, maxWidth:340, width:"100%", textAlign:"center" }}>
      <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
      <h2 style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>Quitter la partie ?</h2>
      <p style={{ color:C.muted, fontSize:14, marginBottom:24 }}>Les scores en cours seront perdus.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <button onClick={onRester} style={{ background:"#14532d", border:`1px solid ${C.green}44`, borderRadius:10, color:C.green, fontSize:14, fontWeight:700, padding:"12px", cursor:"pointer" }}>▶ Rester</button>
        <button onClick={onQuitter} style={{ background:"#7f1d1d", border:`1px solid ${C.red}44`, borderRadius:10, color:C.red, fontSize:14, fontWeight:700, padding:"12px", cursor:"pointer" }}>🚪 Quitter</button>
      </div>
    </div>
  </div>
);

// ── JEU CAPITAL ───────────────────────────────────────────────────────────────
const Capital = ({ joueurs, onFin }) => {
  const [scores, setScores] = useState(() => joueurs.map(() => Array(OBJECTIFS.length).fill(null)));
  const [totaux, setTotaux] = useState(() => joueurs.map(() => 0));
  const [objIdx, setObjIdx] = useState(0);
  const [joueurIdx, setJoueurIdx] = useState(0);
  const [padOpen, setPadOpen] = useState(false);
  const [padCible, setPadCible] = useState(null);
  const [fini, setFini] = useState(false);
  const [modalQuitter, setModalQuitter] = useState(false);
  const colWidth = Math.max(90, Math.floor((window.innerWidth - 130) / Math.min(joueurs.length, 5)));

  // Plein écran
  useEffect(() => {
    const el = document.documentElement;
    try { (el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen)?.call(el); } catch {}
    document.body.style.overflow = "hidden";
    return () => {
      try { (document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen)?.call(document); } catch {}
      document.body.style.overflow = "";
    };
  }, []);

  // Bloquer retour
  useEffect(() => {
    const handlePop = (e) => { e.preventDefault(); setModalQuitter(true); window.history.pushState(null, "", window.location.href); };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const caseActive = (oi, ji) => oi === objIdx && ji === joueurIdx && !fini;

  const ouvrirPad = (oi, ji) => {
    if (!caseActive(oi, ji)) return;
    setPadCible({ oi, ji });
    setPadOpen(true);
  };

  const avancer = (oi, ji) => {
    let nextJi = ji + 1, nextOi = oi;
    if (nextJi >= joueurs.length) { nextJi = 0; nextOi = oi + 1; }
    if (nextOi >= OBJECTIFS.length) { setFini(true); return; }
    setJoueurIdx(nextJi);
    setObjIdx(nextOi);
  };

  const valider = (points) => {
    const { oi, ji } = padCible;
    setScores(s => { const n = s.map(r=>[...r]); n[ji][oi] = points; return n; });
    setTotaux(t => { const n = [...t]; n[ji] += points; return n; });
    avancer(oi, ji);
  };

  const diviser = () => {
    const { oi, ji } = padCible;
    setScores(s => { const n = s.map(r=>[...r]); n[ji][oi] = -1; return n; });
    setTotaux(t => { const n = [...t]; n[ji] = Math.floor(n[ji] / 2); return n; });
    avancer(oi, ji);
  };

  const classement = [...joueurs.map((nom, i) => ({ nom, total: totaux[i] }))].sort((a,b) => b.total - a.total);

  if (fini) {
    return (
      <div style={{ maxWidth:480, margin:"0 auto", padding:"40px 20px" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:50, marginBottom:8 }}>🏆</div>
          <h1 style={{ fontWeight:800, fontSize:24 }}>Partie terminée !</h1>
        </div>
        {classement.map((j, i) => (
          <div key={j.nom} style={{ background:C.card, border:`1px solid ${i===0?C.yellow:C.border}`, borderRadius:12, padding:"16px 20px", marginBottom:10, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:22 }}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"👤"}</span>
              <span style={{ fontWeight:700, fontSize:16 }}>{j.nom}</span>
            </div>
            <span style={{ fontWeight:800, fontSize:20, color:i===0?C.yellow:C.text }}>{j.total} pts</span>
          </div>
        ))}
        <button onClick={onFin} style={{ marginTop:20, width:"100%", background:C.accent, color:"#fff", border:"none", borderRadius:12, padding:"16px", fontSize:15, fontWeight:700, cursor:"pointer" }}>
          🔄 Nouvelle partie
        </button>
      </div>
    );
  }

  return (
    <div style={{ position:"fixed", inset:0, background:C.bg, display:"flex", flexDirection:"column", zIndex:100, touchAction:"none" }}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {modalQuitter && <ModalQuitter onRester={()=>setModalQuitter(false)} onQuitter={onFin}/>}

      {/* Header */}
      <div style={{ background:"#111", borderBottom:`1px solid ${C.border}`, padding:"10px 16px", flexShrink:0, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h2 style={{ fontWeight:800, fontSize:15, color:C.accent }}>🎯 Le Capital</h2>
          <p style={{ color:C.muted, fontSize:11, marginTop:1 }}>Obj. {objIdx+1}/14 — <span style={{ color:C.text, fontWeight:600 }}>{joueurs[joueurIdx]}</span> joue</p>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontSize:11, color:C.muted, marginBottom:4 }}>{OBJECTIFS[objIdx].nom}</div>
          <button onClick={()=>setModalQuitter(true)} style={{ background:"#1a0000", border:`1px solid ${C.red}33`, borderRadius:6, color:C.red, fontSize:11, cursor:"pointer", padding:"3px 10px" }}>⚠️ Quitter</button>
        </div>
      </div>

      {/* Corps scrollable */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* Colonne gauche FIXE */}
        <div style={{ width:130, flexShrink:0, borderRight:`1px solid ${C.border}`, background:"#111", overflowY:"hidden", display:"flex", flexDirection:"column" }}>
          <div style={{ height:44, borderBottom:`1px solid ${C.border}`, flexShrink:0, display:"flex", alignItems:"center", padding:"0 10px" }}>
            <span style={{ fontSize:10, color:C.muted, fontWeight:600 }}>OBJECTIF</span>
          </div>
          <div style={{ flex:1, overflowY:"hidden" }}>
            {OBJECTIFS.map((obj, oi) => (
              <div key={oi} style={{ height:52, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", padding:"0 10px", background:oi===objIdx?"#1a1a1a":"#111" }}>
                <span style={{ fontSize:11, fontWeight:oi===objIdx?700:400, color:oi===objIdx?C.accent:oi<objIdx?"#444":C.text, lineHeight:1.3 }}>{obj.nom}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cases joueurs — scroll X et Y */}
        <div style={{ flex:1, overflowX:"auto", overflowY:"auto" }}>
          <div style={{ display:"inline-flex", minWidth: joueurs.length * colWidth }}>
            {joueurs.map((nom, ji) => (
              <div key={ji} style={{ width:colWidth, flexShrink:0, borderRight:`1px solid ${C.border}` }}>
                {/* Nom sticky */}
                <div style={{ height:44, borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", background:ji===joueurIdx?"#1a0800":"#111", padding:"0 6px", position:"sticky", top:0, zIndex:5 }}>
                  <span style={{ fontSize:12, fontWeight:700, color:ji===joueurIdx?C.accent:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nom}</span>
                </div>
                {/* Cases */}
                {OBJECTIFS.map((obj, oi) => {
                  const score = scores[ji][oi];
                  const actif = caseActive(oi, ji);
                  const joue = score !== null;
                  const rate = score === -1;
                  return (
                    <div key={oi} onClick={() => ouvrirPad(oi, ji)} style={{
                      height:52, borderBottom:`1px solid ${C.border}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      cursor:actif?"pointer":"default",
                      background:actif?"#1a0f00":joue?"#111":"#0f0f0f",
                      outline:actif?`2px solid ${C.accent}`:"none",
                      outlineOffset:"-2px",
                    }}>
                      {actif && !joue && <span style={{ fontSize:18, animation:"pulse 1s infinite" }}>👆</span>}
                      {joue && !rate && <span style={{ fontWeight:700, fontSize:14, color:C.green }}>+{score}</span>}
                      {rate && <span style={{ fontWeight:700, fontSize:12, color:C.red }}>÷2</span>}
                      {!joue && !actif && <span style={{ color:"#333" }}>—</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LIGNE SCORES FIXE EN BAS ── */}
      <div style={{ borderTop:`2px solid ${C.yellow}44`, background:"#0f0f0f", flexShrink:0, display:"flex", overflow:"hidden" }}>
        {/* Label */}
        <div style={{ width:130, flexShrink:0, borderRight:`1px solid ${C.border}`, height:52, display:"flex", alignItems:"center", padding:"0 14px" }}>
          <span style={{ fontSize:12, fontWeight:700, color:C.yellow }}>TOTAL</span>
        </div>
        {/* Scores — scroll X en sync */}
        <div style={{ flex:1, overflowX:"auto", display:"flex" }}>
          <div style={{ display:"inline-flex", minWidth: joueurs.length * colWidth }}>
            {joueurs.map((nom, ji) => (
              <div key={ji} style={{ width:colWidth, flexShrink:0, borderRight:`1px solid ${C.border}`, height:52, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:9, color:C.muted, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:colWidth-10 }}>{nom}</span>
                <span style={{ fontWeight:800, fontSize:18, color:C.yellow }}>{totaux[ji]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {padOpen && padCible && (
        <Pad joueur={joueurs[padCible.ji]} objectif={OBJECTIFS[padCible.oi]} onValider={valider} onDiviser={diviser} onFermer={() => setPadOpen(false)}/>
      )}
    </div>
  );
};

// ── EXPORT ────────────────────────────────────────────────────────────────────
export const JeuCapital = ({ setPage }) => {
  const [phase, setPhase] = useState("setup");
  const [joueurs, setJoueurs] = useState([]);
  if (phase === "setup") return <Setup onStart={j => { setJoueurs(j); setPhase("jeu"); }}/>;
  return <Capital joueurs={joueurs} onFin={() => setPhase("setup")}/>;
};