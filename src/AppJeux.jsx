import { useState } from "react";

// ── AppJeux.jsx ───────────────────────────────────────────────────────────────
// Jeux et scoreur DartPoint : 501/301, futures extensions
// Importé depuis App.jsx

const CX = {
  bg:"#0f0f0f", card:"#1a1a1a", border:"#2a2a2a",
  accent:"#f97316", text:"#f1f5f9", muted:"#94a3b8",
  green:"#22c55e", red:"#ef4444", yellow:"#f59e0b",
};

const BtnX = ({ children, onClick, variant="primary", style={}, disabled=false }) => {
  const variants = {
    primary:{ background:CX.accent, color:"#fff", border:"none" },
    ghost:{ background:"transparent", color:CX.accent, border:`1px solid ${CX.accent}` },
    dark:{ background:CX.card, color:CX.text, border:`1px solid ${CX.border}` },
    success:{ background:"#14532d", color:CX.green, border:`1px solid ${CX.green}44` },
    danger:{ background:"#7f1d1d", color:CX.red, border:`1px solid ${CX.red}44` },
  };
  return <button onClick={disabled?undefined:onClick} style={{ cursor:disabled?"not-allowed":"pointer",borderRadius:8,fontWeight:600,fontSize:14,padding:"10px 20px",transition:"all .15s",opacity:disabled?.5:1,...variants[variant],...style }}>{children}</button>;
};

const FieldX = ({ label, value, onChange, placeholder, type="text" }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
    {label && <label style={{ fontSize:13, fontWeight:500, color:CX.muted, display:"block" }}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ background:CX.card,border:`1px solid ${CX.border}`,borderRadius:8,padding:"10px 14px",color:CX.text,fontSize:14 }}/>
  </div>
);

// ── SUGGESTIONS DE FINISH ─────────────────────────────────────────────────────
const CHECKOUTS = {
  170:"T20 T20 Bull", 167:"T20 T19 Bull", 164:"T20 T18 Bull", 161:"T20 T17 Bull",
  160:"T20 T20 D20", 158:"T20 T20 D19", 157:"T19 T20 D20", 156:"T20 T20 D18",
  155:"T20 T19 D19", 154:"T20 T18 D20", 153:"T20 T19 D18", 152:"T20 T20 D16",
  151:"T20 T17 D20", 150:"T20 T18 D18", 149:"T20 T19 D16", 148:"T20 T16 D20",
  147:"T20 T17 D18", 146:"T20 T18 D16", 145:"T20 T15 D20", 144:"T20 T20 D12",
  143:"T20 T17 D16", 142:"T20 T14 D20", 141:"T20 T15 D18", 140:"T20 T16 D16",
  139:"T20 T13 D20", 138:"T20 T14 D18", 137:"T20 T15 D16", 136:"T20 T20 D8",
  135:"T20 T17 D12", 134:"T20 T14 D16", 133:"T20 T19 D8", 132:"T20 T16 D12",
  131:"T20 T13 D16", 130:"T20 T18 D8", 129:"T19 T16 D12", 128:"T18 T14 D16",
  127:"T20 T17 D8", 126:"T19 T15 D12", 125:"T20 T15 D10", 124:"T20 T16 D8",
  123:"T19 T16 D9", 122:"T18 T16 D10", 121:"T20 T11 D14", 120:"T20 S20 D20",
  119:"T19 T12 D13", 118:"T20 S18 D20", 117:"T20 S17 D20", 116:"T20 S16 D20",
  115:"T20 S15 D20", 114:"T20 S14 D20", 113:"T20 S13 D20", 112:"T20 S12 D20",
  111:"T20 S11 D20", 110:"T20 S10 D20", 109:"T20 S9 D20", 108:"T20 S8 D20",
  107:"T19 S10 D20", 106:"T20 S6 D20", 105:"T20 S5 D20", 104:"T20 S4 D20",
  103:"T20 S3 D20", 102:"T20 S2 D20", 101:"T20 S1 D20", 100:"T20 D20",
  99:"T19 S10 D16", 98:"T20 D19", 97:"T19 D20", 96:"T20 D18", 95:"T19 D19",
  94:"T18 D20", 93:"T19 D18", 92:"T20 D16", 91:"T17 D20", 90:"T18 D18",
  89:"T19 D16", 88:"T20 D14", 87:"T17 D18", 86:"T18 D16", 85:"T15 D20",
  84:"T20 D12", 83:"T17 D16", 82:"T14 D20", 81:"T19 D12", 80:"T20 D10",
  79:"T13 D20", 78:"T18 D12", 77:"T19 D10", 76:"T20 D8", 75:"T17 D12",
  74:"T14 D16", 73:"T19 D8", 72:"T16 D12", 71:"T13 D16", 70:"T18 D8",
  69:"T19 D6", 68:"T20 D4", 67:"T17 D8", 66:"T10 D18", 65:"T19 D4",
  64:"T16 D8", 63:"T17 D6", 62:"T10 D16", 61:"T15 D8", 60:"S20 D20",
  59:"S19 D20", 58:"S18 D20", 57:"S17 D20", 56:"S16 D20", 55:"S15 D20",
  54:"S14 D20", 53:"S13 D20", 52:"S12 D20", 51:"S11 D20", 50:"Bull",
  49:"S9 D20", 48:"S8 D20", 47:"S7 D20", 46:"S6 D20", 45:"S5 D20",
  44:"S4 D20", 43:"S3 D20", 42:"S2 D20", 41:"S1 D20", 40:"D20",
  38:"D19", 36:"D18", 34:"D17", 32:"D16", 30:"D15", 28:"D14",
  26:"D13", 24:"D12", 22:"D11", 20:"D10", 18:"D9", 16:"D8",
  14:"D7", 12:"D6", 10:"D5", 8:"D4", 6:"D3", 4:"D2", 2:"D1",
};

const getCheckout = (score) => CHECKOUTS[score] || null;

// ── SCOREUR PRINCIPAL ─────────────────────────────────────────────────────────
export const Scoreur = () => {
  const [mode, setMode] = useState("501");
  const [noms, setNoms] = useState(["Joueur 1", "Joueur 2"]);
  const [joueurs, setJoueurs] = useState(null);
  const [input, setInput] = useState("");
  const [gagnant, setGagnant] = useState(null);

  const startVal = parseInt(mode);

  const demarrer = () => {
    setJoueurs([
      { nom:noms[0], score:startVal, tours:[], total:0, actif:true },
      { nom:noms[1], score:startVal, tours:[], total:0, actif:false },
    ]);
    setGagnant(null); setInput("");
  };

  const reset = () => { setJoueurs(null); setGagnant(null); setInput(""); };

  if (!joueurs) return (
    <div style={{ maxWidth:480, margin:"40px auto", padding:"0 20px" }}>
      <h1 style={{ fontWeight:800, fontSize:26, marginBottom:6 }}>🎯 Scoreur</h1>
      <p style={{ color:CX.muted, fontSize:14, marginBottom:24 }}>Modes 501 et 301 — Double out</p>
      <div style={{ background:CX.card, border:`1px solid ${CX.border}`, borderRadius:14, padding:24, display:"flex", flexDirection:"column", gap:14 }}>
        <div>
          <label style={{ fontSize:13, fontWeight:500, color:CX.muted, display:"block", marginBottom:8 }}>Mode de jeu</label>
          <div style={{ display:"flex", gap:8 }}>
            {["501","301"].map(m=>(
              <button key={m} onClick={()=>setMode(m)} style={{ flex:1,background:mode===m?CX.accent:"#111",color:mode===m?"#fff":CX.muted,border:`1px solid ${mode===m?CX.accent:CX.border}`,borderRadius:8,padding:"12px",fontWeight:700,fontSize:18,cursor:"pointer" }}>{m}</button>
            ))}
          </div>
        </div>
        <FieldX label="Joueur 1" value={noms[0]} onChange={v=>setNoms([v,noms[1]])} placeholder="Joueur 1"/>
        <FieldX label="Joueur 2" value={noms[1]} onChange={v=>setNoms([noms[0],v])} placeholder="Joueur 2"/>
        <BtnX onClick={demarrer} style={{ padding:"13px", fontSize:16, marginTop:4 }}>🎯 Démarrer la partie</BtnX>
      </div>
      <div style={{ background:CX.card, border:`1px solid ${CX.border}`, borderRadius:12, padding:18, marginTop:20 }}>
        <h3 style={{ fontWeight:700, fontSize:14, marginBottom:10, color:CX.accent }}>📋 Règles rapides</h3>
        <p style={{ color:CX.muted, fontSize:13, lineHeight:1.7 }}>
          Partez de {mode} et descendez à 0. Le dernier lancer doit finir sur un <strong style={{ color:CX.text }}>double</strong> (ou Bull pour 50).
          Si le score descend en dessous de 0 ou égale 1, le tour est <strong style={{ color:CX.red }}>bust</strong>.
        </p>
      </div>
    </div>
  );

  if (gagnant) return (
    <div style={{ maxWidth:480, margin:"40px auto", padding:"0 20px", textAlign:"center" }}>
      <div style={{ background:CX.card, border:`2px solid ${CX.green}`, borderRadius:16, padding:40 }}>
        <div style={{ fontSize:64, marginBottom:16 }}>🏆</div>
        <h2 style={{ fontWeight:800, fontSize:28, color:CX.green, marginBottom:8 }}>Victoire !</h2>
        <p style={{ fontSize:24, fontWeight:700, marginBottom:8 }}>{gagnant.nom}</p>
        <p style={{ color:CX.muted, fontSize:14, marginBottom:24 }}>
          {gagnant.tours.length} tour{gagnant.tours.length>1?"s":""} · Moyenne : <strong style={{ color:CX.accent }}>{gagnant.tours.length>0?Math.round(gagnant.total/gagnant.tours.length):0} pts/tour</strong>
        </p>
        <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" }}>
          <BtnX onClick={demarrer}>🔄 Rejouer</BtnX>
          <BtnX onClick={reset} variant="dark">⚙️ Nouvelle partie</BtnX>
        </div>
      </div>
    </div>
  );

  const actifIdx = joueurs.findIndex(j=>j.actif);
  const joueurActif = joueurs[actifIdx];
  const checkout = getCheckout(joueurActif.score);
  const moyenneActif = joueurActif.tours.length>0 ? Math.round(joueurActif.total/joueurActif.tours.length) : 0;

  const validerLancer = () => {
    const val = parseInt(input);
    if (isNaN(val) || val < 0 || val > 180) { setInput(""); return; }
    const nouveau = joueurActif.score - val;
    if (nouveau < 0 || nouveau === 1) {
      setInput("");
      const updated = joueurs.map((j,i) => i===actifIdx ? {...j, actif:false} : {...j, actif:true});
      setJoueurs(updated);
      return;
    }
    if (nouveau === 0) {
      const updated = joueurs.map((j,i) => i===actifIdx ? {...j, score:0, tours:[...j.tours, val], total:j.total+val} : j);
      setJoueurs(updated);
      setGagnant({...joueurActif, tours:[...joueurActif.tours, val], total:joueurActif.total+val});
      return;
    }
    const updated = joueurs.map((j,i) =>
      i===actifIdx
        ? {...j, score:nouveau, tours:[...j.tours, val], total:j.total+val, actif:false}
        : {...j, actif:true}
    );
    setJoueurs(updated);
    setInput("");
  };

  return (
    <div style={{ maxWidth:580, margin:"0 auto", padding:"24px 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h1 style={{ fontWeight:800, fontSize:22 }}>🎯 {mode} — Double out</h1>
        <button onClick={reset} style={{ background:"none", border:`1px solid ${CX.border}`, color:CX.muted, cursor:"pointer", borderRadius:8, padding:"6px 12px", fontSize:12 }}>↺ Nouvelle partie</button>
      </div>

      {/* Scores */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:16 }}>
        {joueurs.map((j,i)=>{
          const moy = j.tours.length>0 ? Math.round(j.total/j.tours.length) : 0;
          return (
            <div key={i} style={{ background:j.actif?CX.accent+"22":CX.card, border:`2px solid ${j.actif?CX.accent:CX.border}`, borderRadius:12, padding:18, textAlign:"center", transition:"all .2s" }}>
              <div style={{ fontSize:11, color:j.actif?CX.accent:CX.muted, fontWeight:600, marginBottom:4, minHeight:16 }}>{j.actif?"▶ À VOUS":""}</div>
              <div style={{ fontWeight:800, fontSize:14, marginBottom:6 }}>{j.nom}</div>
              <div style={{ fontSize:52, fontWeight:900, color:j.actif?CX.accent:CX.text, lineHeight:1, marginBottom:6 }}>{j.score}</div>
              <div style={{ display:"flex", justifyContent:"center", gap:12, fontSize:11, color:CX.muted }}>
                <span>🎯 {j.tours.length} tours</span>
                <span>📊 {moy} moy.</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggestion checkout */}
      {joueurActif.score <= 170 && checkout && (
        <div style={{ background:"#1a0f00", border:`1px solid ${CX.yellow}44`, borderRadius:10, padding:14, marginBottom:14, display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:20 }}>💡</span>
          <div>
            <div style={{ color:CX.yellow, fontSize:13, fontWeight:700, marginBottom:2 }}>Checkout {joueurActif.score}</div>
            <div style={{ color:CX.text, fontSize:14, fontWeight:600, letterSpacing:1 }}>{checkout}</div>
          </div>
        </div>
      )}

      {/* Saisie */}
      <div style={{ background:CX.card, border:`1px solid ${CX.border}`, borderRadius:12, padding:20, marginBottom:16 }}>
        <p style={{ color:CX.muted, fontSize:13, marginBottom:12, fontWeight:600 }}>
          Tour de <span style={{ color:CX.accent }}>{joueurActif.nom}</span>
          {moyenneActif>0 && <span style={{ color:CX.muted, fontWeight:400 }}> · moy. {moyenneActif} pts</span>}
        </p>
        <div style={{ display:"flex", gap:10, marginBottom:14 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&validerLancer()}
            placeholder="Score du tour (0–180)" type="number" min="0" max="180" autoFocus
            style={{ flex:1, background:"#111", border:`1px solid ${CX.border}`, borderRadius:8, padding:"12px 14px", color:CX.text, fontSize:22, fontWeight:700, textAlign:"center" }}/>
          <BtnX onClick={validerLancer} disabled={!input} style={{ padding:"12px 20px", fontSize:18 }}>✓</BtnX>
        </div>
        <div style={{ marginBottom:8 }}>
          <p style={{ fontSize:11, color:CX.muted, marginBottom:6 }}>Scores fréquents :</p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {[26,41,45,60,81,85,100,121,140,180].map(v=>(
              <button key={v} onClick={()=>setInput(String(v))} style={{ background:"#111", border:`1px solid ${CX.border}`, color:v>=100?CX.green:v>=60?CX.yellow:CX.muted, borderRadius:6, padding:"5px 10px", fontSize:12, cursor:"pointer", fontWeight:v>=100?700:400 }}>{v}</button>
            ))}
            <button onClick={()=>setInput("0")} style={{ background:"#1a0000", border:`1px solid ${CX.red}44`, color:CX.red, borderRadius:6, padding:"5px 12px", fontSize:12, cursor:"pointer", fontWeight:600 }}>Bust</button>
          </div>
        </div>
      </div>

      {/* Historique */}
      {joueurs.some(j=>j.tours.length>0) && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {joueurs.map((j,i)=>(
            <div key={i} style={{ background:CX.card, border:`1px solid ${CX.border}`, borderRadius:10, padding:14 }}>
              <p style={{ fontSize:12, fontWeight:600, color:CX.muted, marginBottom:8 }}>{j.nom}</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {j.tours.slice(-10).map((t,ti)=>(
                  <span key={ti} style={{ background:"#111", borderRadius:4, padding:"3px 8px", fontSize:12, fontWeight:600,
                    color:t>=100?CX.green:t>=60?CX.yellow:t===0?CX.red:CX.muted,
                    border:`1px solid ${t>=100?CX.green+"33":t===0?CX.red+"33":"transparent"}` }}>
                    {t===0?"Bust":t}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── FUTURS JEUX ───────────────────────────────────────────────────────────────
// Décommenter et compléter quand besoin :
// export const Cricket = () => { ... };
// export const AroundTheClock = () => { ... };
// export const KillerDarts = () => { ... };