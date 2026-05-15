import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  bg:"#0f0f0f", card:"#1a1a1a", card2:"#141414", border:"#2a2a2a",
  accent:"#f97316", muted:"#64748b", text:"#f1f5f9",
  green:"#22c55e", greenBg:"#052e16",
  red:"#ef4444",   redBg:"#450a0a",
  yellow:"#f59e0b", blue:"#60a5fa",
  purple:"#a78bfa",
};

// ── Données finishes (copie de AppEntrainementFinish) ─────────────────────────
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

const NB_FINISHES = 5;

const dartLabel  = (mult, num) => {
  if (num === 25) return mult === 1 ? "25" : mult === 2 ? "Bull" : null;
  return mult === 1 ? `${num}` : mult === 2 ? `D${num}` : `T${num}`;
};
const dartValue    = (mult, num) => mult * num;
const isFinishDart = (mult) => mult === 2 || (mult === 1 && 25 === 25); // Bull = 25 × 2 → ok

// Formattage chrono : mm:ss.d
const formatChrono = (ms) => {
  const tenths = Math.floor(ms / 100) % 10;
  const secs   = Math.floor(ms / 1000) % 60;
  const mins   = Math.floor(ms / 60000);
  if (mins > 0) return `${mins}:${String(secs).padStart(2,"0")}.${tenths}`;
  return `${secs}.${tenths}s`;
};

// Tire 5 finishes distincts au hasard
const genFinishes = () => {
  const arr = [...TOUS_FINISHES];
  const result = [];
  while (result.length < NB_FINISHES) {
    const idx = Math.floor(Math.random() * arr.length);
    result.push(arr.splice(idx, 1)[0]);
  }
  return result;
};

// ── Composant principal ───────────────────────────────────────────────────────
export const ChronoFinish = ({ setPage, joueur }) => {
  const [finishes]    = useState(genFinishes);
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [phase,       setPhase]       = useState("jeu"); // "jeu"|"correct"|"incorrect"|"fin"
  const [darts,       setDarts]       = useState([]);
  const [multSel,     setMultSel]     = useState(null);
  const [errMsg,      setErrMsg]      = useState("");

  // Chrono
  const [chronoMs,    setChronoMs]    = useState(0);
  const [running,     setRunning]     = useState(true);
  const startRef      = useRef(Date.now());
  const splitStartRef = useRef(Date.now());

  // Résultats par finish : { timeMs, mistakes }
  const [results, setResults] = useState([]);
  // Mauvaises tentatives sur le finish courant
  const [curMistakes, setCurMistakes] = useState(0);

  // ── Chrono ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setChronoMs(Date.now() - startRef.current), 100);
    return () => clearInterval(id);
  }, [running]);

  // ── Helpers clavier ───────────────────────────────────────────────────────
  const finish  = finishes[currentIdx];
  const total   = darts.reduce((s, d) => s + d.value, 0);
  const optSol  = CHECKOUTS_OPT[finish] ?? "—";

  const toggleMult = (m) => {
    if (phase !== "jeu") return;
    setMultSel(p => p === m ? null : m);
    setErrMsg("");
  };

  const selectNum = useCallback((num) => {
    if (phase !== "jeu") return;
    if (darts.length >= 3) return;
    const mult  = multSel ?? 1;
    if (num === 25 && mult === 3) return; // triple 25 inexistant
    const label = dartLabel(mult, num);
    const value = dartValue(mult, num);
    setDarts(p => [...p, { mult, num, label, value }]);
    setMultSel(null);
    setErrMsg("");
  }, [phase, darts.length, multSel]);

  const annuler = () => { if (phase !== "jeu") return; setDarts(p => p.slice(0,-1)); setErrMsg(""); };
  const reset   = () => { setDarts([]); setMultSel(null); setErrMsg(""); };

  // ── Valider ───────────────────────────────────────────────────────────────
  const valider = () => {
    if (phase !== "jeu" || darts.length === 0) return;
    const lastDart = darts[darts.length - 1];
    // Finish valide = total exact + dernière flèche est un double (ou Bull = D-Bull)
    const isBullFinish = lastDart.num === 25 && lastDart.mult === 2;
    const correct = total === finish && (lastDart.mult === 2 || isBullFinish);

    if (correct) {
      const splitMs = Date.now() - splitStartRef.current;
      const newResults = [...results, { finish, timeMs: splitMs, mistakes: curMistakes }];
      setResults(newResults);
      setPhase("correct");
      const next = currentIdx + 1;
      setTimeout(() => {
        if (next >= NB_FINISHES) {
          setRunning(false);
          setPhase("fin");
        } else {
          setCurrentIdx(next);
          setDarts([]);
          setMultSel(null);
          setErrMsg("");
          setCurMistakes(0);
          splitStartRef.current = Date.now();
          setPhase("jeu");
        }
      }, 700);
    } else {
      setCurMistakes(m => m + 1);
      setPhase("incorrect");
      setTimeout(() => {
        setDarts([]);
        setMultSel(null);
        setErrMsg("");
        setPhase("jeu");
      }, 1100);
    }
  };

  // ── Rejouer ───────────────────────────────────────────────────────────────
  const rejouer = () => {
    window.location.reload(); // relance le composant proprement
  };

  // ── Écran FIN ─────────────────────────────────────────────────────────────
  if (phase === "fin") {
    const totalMs    = chronoMs;
    const totalErreurs = results.reduce((s, r) => s + r.mistakes, 0);
    const fastest    = [...results].sort((a,b)=>a.timeMs-b.timeMs)[0];
    const slowest    = [...results].sort((a,b)=>b.timeMs-a.timeMs)[0];
    const medal = totalErreurs === 0 && totalMs < 30000 ? "🏆"
                : totalErreurs <= 2 ? "🥇"
                : totalErreurs <= 5 ? "🥈" : "🥉";

    return (
      <div style={{ position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        {/* Header */}
        <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
          <button onClick={()=>setPage("jeux")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}>← Retour</button>
          <div style={{ flex:1,fontWeight:800,fontSize:16,color:C.purple }}>⏱ Chrono Finish</div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 40px",display:"flex",flexDirection:"column",gap:12 }}>

          {/* Résultat principal */}
          <div style={{ background:"linear-gradient(135deg,#1a1030,#0f0f20)",border:`2px solid ${C.purple}`,borderRadius:20,padding:"24px 16px",textAlign:"center" }}>
            <div style={{ fontSize:56,marginBottom:4 }}>{medal}</div>
            <div style={{ fontSize:13,color:C.muted,marginBottom:4,letterSpacing:1 }}>TEMPS TOTAL</div>
            <div style={{ fontSize:52,fontWeight:900,color:C.purple,letterSpacing:2,fontVariantNumeric:"tabular-nums" }}>
              {formatChrono(totalMs)}
            </div>
            <div style={{ fontSize:12,color:C.muted,marginTop:6 }}>
              {totalErreurs === 0 ? "✅ Zéro erreur — parfait !" : `⚠️ ${totalErreurs} erreur${totalErreurs>1?"s":""}`}
            </div>
          </div>

          {/* Détail par finish */}
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden" }}>
            <div style={{ padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontWeight:800,fontSize:13,color:C.text }}>
              📋 Détail des finishes
            </div>
            {results.map((r, i) => {
              const isFastest = r === fastest && results.length > 1;
              const isSlowest = r === slowest && results.length > 1;
              return (
                <div key={i} style={{ display:"flex",alignItems:"center",padding:"10px 14px",borderBottom:i<results.length-1?`1px solid ${C.border}22`:"none",gap:10 }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",background:C.card2,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:C.muted,flexShrink:0 }}>
                    {i+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800,fontSize:16,color:C.accent }}>{r.finish}</div>
                    <div style={{ fontSize:10,color:C.muted }}>{CHECKOUTS_OPT[r.finish]}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontWeight:900,fontSize:15,color:isFastest?C.green:isSlowest?C.red:C.text,fontVariantNumeric:"tabular-nums" }}>
                      {formatChrono(r.timeMs)}
                      {isFastest && <span style={{ fontSize:10,color:C.green,marginLeft:4 }}>🔥</span>}
                      {isSlowest && <span style={{ fontSize:10,color:C.red,marginLeft:4 }}>🐌</span>}
                    </div>
                    {r.mistakes > 0 && (
                      <div style={{ fontSize:10,color:C.red }}>{r.mistakes} erreur{r.mistakes>1?"s":""}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Boutons */}
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setPage("jeux")}
              style={{ flex:1,background:C.card,color:C.muted,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px",fontWeight:700,fontSize:14,cursor:"pointer" }}>
              ← Quitter
            </button>
            <button onClick={rejouer}
              style={{ flex:1,background:`linear-gradient(135deg,${C.purple},#7c3aed)`,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontWeight:900,fontSize:14,cursor:"pointer" }}>
              🔄 Rejouer
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ── Écran de jeu ──────────────────────────────────────────────────────────
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
      <style>{`
        @keyframes flashGreen { 0%{background:#052e16} 50%{background:#14532d} 100%{background:#052e16} }
        @keyframes flashRed   { 0%{background:#450a0a} 50%{background:#7f1d1d} 100%{background:#450a0a} }
        @keyframes bounceIn   { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"8px 12px",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
        <button onClick={()=>setPage("jeux")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}>← Retour</button>
        <div style={{ flex:1,fontWeight:800,fontSize:15,color:C.purple }}>⏱ Chrono Finish</div>
        {/* Chrono */}
        <div style={{
          background:`${C.purple}22`,border:`1px solid ${C.purple}55`,borderRadius:10,
          padding:"4px 12px",fontVariantNumeric:"tabular-nums",
          fontWeight:900,fontSize:18,color:C.purple,letterSpacing:1,
          minWidth:70,textAlign:"center",
        }}>
          {formatChrono(chronoMs)}
        </div>
      </div>

      {/* ── Progression (dots) ── */}
      <div style={{ background:C.card2,borderBottom:`1px solid ${C.border}`,padding:"8px 14px",display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
        <div style={{ flex:1,display:"flex",gap:6,alignItems:"center" }}>
          {finishes.map((f, i) => (
            <div key={i} style={{ flex:1,height:6,borderRadius:3,transition:"background .3s",
              background: i < currentIdx ? C.purple : i === currentIdx ? (phase==="correct"?C.green:phase==="incorrect"?C.red:C.accent) : C.border,
            }}/>
          ))}
        </div>
        <div style={{ fontSize:12,color:C.muted,fontWeight:700,whiteSpace:"nowrap",marginLeft:8 }}>
          {currentIdx+1}/{NB_FINISHES}
        </div>
      </div>

      {/* ── Zone principale ── */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",padding:"8px 10px",gap:6,overflow:"hidden",minHeight:0 }}>

        {/* Finish à réaliser */}
        <div style={{
          background: phase==="correct"
            ? "linear-gradient(135deg,#052e16,#14532d)"
            : phase==="incorrect"
            ? "linear-gradient(135deg,#450a0a,#7f1d1d)"
            : "linear-gradient(135deg,#1a1030,#0f0f20)",
          border:`2px solid ${phase==="correct"?C.green:phase==="incorrect"?C.red:C.purple}`,
          borderRadius:14,padding:"8px 14px",textAlign:"center",flexShrink:0,
          transition:"background .2s, border-color .2s",
          animation: phase==="correct"?"flashGreen .5s":phase==="incorrect"?"flashRed .5s":"none",
        }}>
          <div style={{ fontSize:10,color:C.muted,letterSpacing:2,marginBottom:2 }}>
            FINISH {currentIdx+1} / {NB_FINISHES}
          </div>
          <div style={{
            fontSize:64,fontWeight:900,lineHeight:1,
            color:phase==="correct"?C.green:phase==="incorrect"?C.red:C.purple,
            transition:"color .2s",
            animation: phase==="correct"||phase==="incorrect" ? "bounceIn .3s" : "none",
          }}>
            {finish}
          </div>
          {phase === "correct" && (
            <div style={{ fontSize:16,color:C.green,fontWeight:800,marginTop:2 }}>✅ Bonne combinaison !</div>
          )}
          {phase === "incorrect" && (
            <div style={{ fontSize:13,color:"#fca5a5",fontWeight:700,marginTop:2 }}>
              ❌ Mauvaise — solution : <b style={{ color:C.red }}>{optSol}</b>
            </div>
          )}
        </div>

        {/* Fléchettes */}
        <div style={{ display:"flex",gap:6,flexShrink:0 }}>
          {[0,1,2].map(i => {
            const d = darts[i];
            return (
              <div key={i} style={{
                flex:1,height:52,borderRadius:10,
                border:`2px dashed ${d?C.purple:C.border}`,
                background:d?(phase==="correct"?C.greenBg:phase==="incorrect"?C.redBg:C.card):C.card2,
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
              }}>
                {d ? (<>
                  <div style={{ fontSize:17,fontWeight:800,color:phase==="correct"?C.green:phase==="incorrect"?C.red:C.purple }}>{d.label}</div>
                  <div style={{ fontSize:9,color:C.muted }}>{d.value}pts</div>
                </>) : (
                  <div style={{ fontSize:18,color:C.border }}>🎯</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Total courant */}
        <div style={{ textAlign:"center",fontSize:11,color:C.muted,flexShrink:0,height:16 }}>
          {darts.length > 0 && phase==="jeu" && (
            <span>Total : <b style={{ color:total>finish?C.red:total===finish?C.green:C.text }}>{total}</b>
            <span style={{ color:C.muted }}> / {finish}</span>
            {total < finish && <span style={{ color:C.yellow }}> · reste {finish-total}</span>}
            </span>
          )}
        </div>

        {/* Clavier (affiché seulement en phase jeu) */}
        {phase === "jeu" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",gap:5,minHeight:0 }}>

            {/* Boutons Double / Triple */}
            <div style={{ display:"flex",gap:6,flexShrink:0 }}>
              {[{mult:2,label:"2× Double",color:C.blue},{mult:3,label:"3× Triple",color:C.green}].map(({mult,label,color})=>(
                <button key={mult} onClick={()=>toggleMult(mult)}
                  style={{ flex:1,padding:"9px 8px",borderRadius:10,border:`2px solid ${multSel===mult?color:C.border}`,background:multSel===mult?color+"22":C.card,color:multSel===mult?color:C.muted,fontWeight:800,fontSize:14,cursor:"pointer",boxShadow:multSel===mult?`0 0 12px ${color}44`:"none",touchAction:"manipulation" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Hint mode */}
            <div style={{ textAlign:"center",fontSize:10,color:C.muted,flexShrink:0 }}>
              {multSel===2?<span style={{ color:C.blue,fontWeight:700 }}>Mode Double actif</span>
              :multSel===3?<span style={{ color:C.green,fontWeight:700 }}>Mode Triple actif</span>
              :<span>Simple par défaut · active D ou T pour changer</span>}
            </div>

            {/* Grille de chiffres */}
            <div style={{ flex:1,display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,minHeight:0 }}>
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(num=>(
                <button key={num} onClick={()=>selectNum(num)}
                  style={{ borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:14,touchAction:"manipulation",
                    border:`1px solid ${multSel===2?C.blue+"66":multSel===3?C.green+"66":C.border}`,
                    background:multSel===2?C.blue+"11":multSel===3?C.green+"11":C.card,
                    color:multSel===2?C.blue:multSel===3?C.green:C.text,
                    display:"flex",alignItems:"center",justifyContent:"center",
                  }}>
                  {num}
                </button>
              ))}

              {/* Bull / 25 */}
              <button onClick={()=>selectNum(25)} disabled={multSel===3}
                style={{ borderRadius:8,fontWeight:800,fontSize:12,touchAction:"manipulation",
                  border:`1px solid ${multSel===3?"#333":C.yellow+"66"}`,
                  background:multSel===3?"#111":C.yellow+"11",
                  color:multSel===3?C.border:C.yellow,
                  cursor:multSel===3?"default":"pointer",opacity:multSel===3?0.3:1,
                  display:"flex",alignItems:"center",justifyContent:"center",
                }}>
                {multSel===2?"Bull":"25"}
              </button>

              {/* Annuler + Reset */}
              <button onClick={annuler} disabled={!darts.length}
                style={{ gridColumn:"span 2",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:darts.length?C.text:C.muted,fontWeight:700,fontSize:15,cursor:darts.length?"pointer":"default",touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center" }}>
                ↩
              </button>
              <button onClick={reset} disabled={!darts.length}
                style={{ gridColumn:"span 2",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:darts.length?C.text:C.muted,fontWeight:700,fontSize:15,cursor:darts.length?"pointer":"default",touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center" }}>
                🔄
              </button>
            </div>

            {/* Valider */}
            <button onClick={valider} disabled={!darts.length}
              style={{ flexShrink:0,padding:"11px",borderRadius:10,border:"none",touchAction:"manipulation",
                background:darts.length?`linear-gradient(135deg,${C.purple},#7c3aed)`:"#222",
                color:darts.length?"#fff":C.muted,fontWeight:900,fontSize:15,cursor:darts.length?"pointer":"default",
                boxShadow:darts.length?`0 3px 16px ${C.purple}55`:"none",
              }}>
              ✅ Valider
            </button>
          </div>
        )}

        {/* Pendant la phase correct/incorrect : placeholder pour ne pas sauter de layout */}
        {(phase === "correct" || phase === "incorrect") && (
          <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ fontSize:13,color:C.muted,fontWeight:600 }}>
              {phase === "correct"
                ? currentIdx+1 < NB_FINISHES ? "Finish suivant..." : "Calcul du résultat..."
                : "Réessaie..."}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
