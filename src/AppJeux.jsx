import { useState, useEffect, useRef } from "react";

// ── Confetti ──────────────────────────────────────────────────────────────────
const Confetti = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const cols = ["#f97316","#22c55e","#60a5fa","#a78bfa","#f59e0b","#ec4899","#ef4444","#fff","#fde047"];
    const particles = Array.from({ length: 140 }, () => ({
      x: Math.random() * W,
      y: -10 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 5,
      vy: 1.5 + Math.random() * 4,
      color: cols[Math.floor(Math.random() * cols.length)],
      w: 7 + Math.random() * 9,
      h: 4 + Math.random() * 5,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 8,
      circle: Math.random() > 0.6,
      active: true, // false = ne recycle plus, continue à tomber jusqu'en bas
    }));
    // burst initial depuis le centre
    particles.slice(0, 60).forEach(p => { p.x = W / 2 + (Math.random() - 0.5) * W * 0.8; p.y = -5; });

    let running = true;
    let frame;

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      let anyVisible = false;
      particles.forEach(p => {
        if (p.y > H + 40) {
          // Recycle si encore actif, sinon disparaît
          if (p.active) { p.y = -10; p.x = Math.random() * W; p.vy = 1.5 + Math.random() * 3; }
          else return; // hors écran et inactif → skip
        }
        p.x += p.vx; p.y += p.vy; p.rot += p.rotV; p.vy += 0.04;
        if (p.y <= H + 40) anyVisible = true;
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        if (p.circle) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
        ctx.restore();
      });
      // Si plus rien de visible → arrêter
      if (!anyVisible && particles.every(p => !p.active)) { running = false; ctx.clearRect(0, 0, W, H); return; }
      frame = requestAnimationFrame(draw);
    };

    draw();

    // Après 3s : stopper le recyclage → les particules tombent hors écran et disparaissent
    const tStop = setTimeout(() => { particles.forEach(p => { p.active = false; }); }, 3000);

    return () => { running = false; cancelAnimationFrame(frame); clearTimeout(tStop); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"fixed",inset:0,zIndex:9999,pointerEvents:"none" }}/>;
};

// ── Nombre animé (compte de 0 → target) ──────────────────────────────────────
const AnimCount = ({ target, duration=1400, prefix="", suffix="" }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = ts => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setVal(Math.round(e * target));
      if (p < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return <>{prefix}{val}{suffix}</>;
};

// ── Écran de fin (composant séparé pour pouvoir utiliser des hooks) ────────────
const SB_URL_J = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY_J = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";

const FinScreen = ({ gagnant, duel, drixData, drixBreakdown=null, modeDuel, moyenne, demarrer, quitterPartie, joueurs: joueursData=[], manchesDetail=[] }) => {
  const [show, setShow] = useState(false);
  const [drixShow, setDrixShow] = useState(false);
  const [winnerPhoto, setWinnerPhoto] = useState(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setDrixShow(true), 800);
    // Fetch la photo du gagnant si en mode duel
    if (modeDuel && duel && gagnant?.nom) {
      const winnerId = gagnant.nom === duel.challenger_pseudo ? duel.challenger_id : duel.defie_id;
      if (winnerId) {
        fetch(`${SB_URL_J}/rest/v1/joueurs?id=eq.${winnerId}&select=photo`, {
          headers: { apikey: SB_KEY_J, Authorization: `Bearer ${SB_KEY_J}` }
        }).then(r => r.json()).then(d => { if (d?.[0]?.photo) setWinnerPhoto(d[0].photo); }).catch(() => {});
      }
    }
    return () => clearTimeout(t);
  }, []);

  const gagnantIsChallenger = gagnant?.nom === duel?.challenger_pseudo;
  const perdantNom = gagnantIsChallenger ? duel?.defie_pseudo : duel?.challenger_pseudo;
  const dxGagnant = drixData ? (gagnantIsChallenger ? drixData.challenger : drixData.defie) : null;
  const dxPerdant = drixData ? (gagnantIsChallenger ? drixData.defie : drixData.challenger) : null;

  // ── Stats helpers ──────────────────────────────────────────────────────────
  const computeStats = (j) => {
    const tours = j?.tours || [];
    const moy = j?.flechettes > 0 ? Math.round((j.totalPoints / j.flechettes) * 3 * 10) / 10 : 0;
    return {
      moy,
      nb180:   tours.filter(v=>v===180).length,
      nb140:   tours.filter(v=>v>=140&&v<180).length,
      nb100:   tours.filter(v=>v>=100&&v<140).length,
      nb80:    tours.filter(v=>v>=80&&v<100).length,
      nb60:    tours.filter(v=>v>=60&&v<80).length,
      bestVolee: tours.length > 0 ? Math.max(...tours) : 0,
    };
  };

  // Reconstruit j0/j1 depuis joueursData ou fallback depuis duel+gagnant
  const j0 = joueursData[0] || { nom: duel?.challenger_pseudo||"Joueur 1", manchesGagnees:0, tours:[], flechettes:0, totalPoints:0 };
  const j1 = joueursData[1] || { nom: duel?.defie_pseudo||"Joueur 2", manchesGagnees:0, tours:[], flechettes:0, totalPoints:0 };
  const s0 = computeStats(j0);
  const s1 = computeStats(j1);
  const gagnantIdx = gagnant?.nom === j0.nom ? 0 : 1;

  const hi = (a, b, highIsBetter=true) => {
    if (a === b || a == null || b == null) return -1;
    return highIsBetter ? (a > b ? 0 : 1) : (a < b ? 0 : 1);
  };

  const StatRow = ({ label, v0, v1, h=-1 }) => (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 110px 1fr", alignItems:"center", padding:"7px 0", borderBottom:"1px solid #1e1e2e" }}>
      <div style={{ textAlign:"right", fontWeight: h===0?"900":"500", color: h===0?"#22c55e":"#e2e8f0", fontSize:14 }}>{v0 ?? "—"}</div>
      <div style={{ textAlign:"center", fontSize:11, color:"#64748b" }}>{label}</div>
      <div style={{ textAlign:"left", fontWeight: h===1?"900":"500", color: h===1?"#22c55e":"#e2e8f0", fontSize:14 }}>{v1 ?? "—"}</div>
    </div>
  );

  return (
    <div style={{ maxWidth:480,margin:"0 auto",padding:"12px 16px",textAlign:"center",fontFamily:"Inter,sans-serif",position:"relative",zIndex:1 }}>
      <Confetti/>

      {/* Carte victoire */}
      <div style={{
        background:"linear-gradient(135deg,#14532d,#166534)",
        borderRadius:16, padding:"16px 20px", marginBottom:12,
        transform: show ? "scale(1)" : "scale(0.85)",
        opacity: show ? 1 : 0,
        transition: "transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease",
        display:"flex", alignItems:"center", gap:14, textAlign:"left",
      }}>
        <style>{`@keyframes trophy-bounce{0%{transform:scale(0) rotate(-20deg);opacity:0}70%{transform:scale(1.2) rotate(5deg)}100%{transform:scale(1) rotate(0);opacity:1}}`}</style>
        {/* Photo / trophée */}
        <div style={{ flexShrink:0, animation:"trophy-bounce 0.6s 0.2s both" }}>
          {winnerPhoto ? (
            <div style={{ width:64,height:64,borderRadius:"50%",overflow:"hidden",border:"3px solid #22c55e",boxShadow:"0 0 16px #22c55e88" }}>
              <img src={winnerPhoto} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
            </div>
          ) : (
            <span style={{ fontSize:48 }}>🏆</span>
          )}
        </div>
        {/* Texte */}
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:900,fontSize:22,color:"#22c55e",lineHeight:1.1 }}>VICTOIRE !</div>
          <div style={{ fontSize:18,fontWeight:800,color:"#fff",marginBottom:8 }}>{gagnant?.nom}</div>
          <div style={{ display:"flex",gap:16 }}>
            <div><div style={{ fontSize:17,fontWeight:900,color:"#22c55e" }}>{moyenne(gagnant)}</div><div style={{ fontSize:11,color:"#86efac" }}>Moyenne</div></div>
            <div><div style={{ fontSize:17,fontWeight:900,color:"#22c55e" }}>{gagnant?.flechettes}</div><div style={{ fontSize:11,color:"#86efac" }}>Fléchettes</div></div>
            <div><div style={{ fontSize:17,fontWeight:900,color:"#22c55e" }}>{gagnant?.tours.length}</div><div style={{ fontSize:11,color:"#86efac" }}>Tours</div></div>
          </div>
        </div>
      </div>

      {/* Carte résultat duel */}
      {modeDuel && (
        <div style={{
          background: duel?.type==="amical" ? "#0f0f1a" : "#0f1a0f",
          border: `2px solid ${duel?.type==="amical" ? "#7c3aed44" : "#22c55e44"}`,
          borderRadius:14, padding:"14px 16px", marginBottom:10,
          transform: drixShow ? "translateY(0)" : "translateY(30px)",
          opacity: drixShow ? 1 : 0,
          transition: "transform 0.5s ease, opacity 0.4s ease",
        }}>
          {duel?.type === "amical" ? (
            <>
              <p style={{ fontWeight:700,fontSize:15,color:"#a78bfa",marginBottom:8,textAlign:"center" }}>✅ Résultat enregistré !</p>
              <div style={{ background:"#1a0f2e",borderRadius:10,padding:"12px 16px",textAlign:"center",marginBottom:8 }}>
                <span style={{ fontSize:22 }}>🤝</span>
                <p style={{ color:"#c4b5fd",fontWeight:700,fontSize:14,margin:"6px 0 2px" }}>Partie amicale</p>
                <p style={{ color:"#94a3b8",fontSize:12 }}>Les DRIX ne sont pas affectés</p>
              </div>
              <p style={{ color:"#94a3b8",fontSize:12,textAlign:"center" }}>L'adversaire peut contester dans les 24h s'il n'était pas présent.</p>
            </>
          ) : (
            <>
              <p style={{ fontWeight:700,fontSize:15,color:"#22c55e",marginBottom:12,textAlign:"center" }}>✅ Résultat enregistré !</p>

              {/* ── Breakdown détaillé si disponible ── */}
              {drixBreakdown && drixShow ? (() => {
                const bkC = drixBreakdown.challenger;
                const bkD = drixBreakdown.defie;
                const gagnantIsC = gagnant?.nom === duel?.challenger_pseudo;
                const bkW = gagnantIsC ? bkC : bkD;
                const bkL = gagnantIsC ? bkD : bkC;
                const wNom = gagnant?.nom;
                const lNom = perdantNom;
                const DrixLine = ({ label, val, color="#94a3b8" }) => val !== 0 ? (
                  <div style={{ display:"flex",justifyContent:"space-between",fontSize:12,padding:"3px 0",borderBottom:"1px solid #ffffff0a" }}>
                    <span style={{ color:"#64748b" }}>{label}</span>
                    <span style={{ fontWeight:700,color }}>{val>0?"+":""}{val} DRIX</span>
                  </div>
                ) : null;
                return (
                  <div style={{ display:"flex",gap:10,marginBottom:12,flexWrap:"wrap" }}>
                    {/* Gagnant */}
                    <div style={{ flex:1,minWidth:130,background:"#0f1a0f",border:"1px solid #22c55e33",borderRadius:14,padding:"10px 10px" }}>
                      <div style={{ fontSize:11,color:"#86efac",fontWeight:800,marginBottom:6,textAlign:"center" }}>🏆 {wNom}</div>
                      <DrixLine label="ELO" val={bkW.eloVariation} color={bkW.eloVariation>=0?"#22c55e":"#ef4444"}/>
                      {bkW.bonus.bonusManches>0 && <DrixLine label={`💎 ${bkW.bonus.bonusManches/7} manche(s)`} val={bkW.bonus.bonusManches} color="#f59e0b"/>}
                      {bkW.bonus.nbGrossesVolees>0 && <DrixLine label={`🔥 ${bkW.bonus.nbGrossesVolees} grosse(s) volée(s)`} val={bkW.bonus.bonusVolees} color="#f97316"/>}
                      {bkW.bonus.nbGrosFinish>0 && <DrixLine label={`🏆 ${bkW.bonus.nbGrosFinish} gros finish`} val={bkW.bonus.bonusFinish} color="#a78bfa"/>}
                      <div style={{ marginTop:6,paddingTop:6,borderTop:"1px solid #22c55e44",textAlign:"center" }}>
                        <span style={{ fontSize:11,color:"#86efac" }}>TOTAL </span>
                        <span style={{ fontSize:20,fontWeight:900,color:"#22c55e" }}>
                          {bkW.totalVariation>=0?"+":""}<AnimCount target={Math.abs(bkW.totalVariation)} duration={1200}/>
                        </span>
                        <span style={{ fontSize:13,fontWeight:900,color:"#22c55e" }}> DRIX</span>
                      </div>
                    </div>
                    {/* Perdant */}
                    <div style={{ flex:1,minWidth:130,background:"#1a0a0a",border:"1px solid #ef444433",borderRadius:14,padding:"10px 10px" }}>
                      <div style={{ fontSize:11,color:"#fca5a5",fontWeight:800,marginBottom:6,textAlign:"center" }}>💔 {lNom}</div>
                      <DrixLine label="ELO" val={bkL.eloVariation} color={bkL.eloVariation>=0?"#22c55e":"#ef4444"}/>
                      {bkL.bonus.bonusManches>0 && <DrixLine label={`💎 ${bkL.bonus.bonusManches/7} manche(s)`} val={bkL.bonus.bonusManches} color="#f59e0b"/>}
                      {bkL.bonus.nbGrossesVolees>0 && <DrixLine label={`🔥 ${bkL.bonus.nbGrossesVolees} grosse(s) volée(s)`} val={bkL.bonus.bonusVolees} color="#f97316"/>}
                      {bkL.bonus.nbGrosFinish>0 && <DrixLine label={`🏆 ${bkL.bonus.nbGrosFinish} gros finish`} val={bkL.bonus.bonusFinish} color="#a78bfa"/>}
                      <div style={{ marginTop:6,paddingTop:6,borderTop:"1px solid #ef444433",textAlign:"center" }}>
                        <span style={{ fontSize:11,color:"#fca5a5" }}>TOTAL </span>
                        <span style={{ fontSize:20,fontWeight:900,color:bkL.totalVariation>=0?"#22c55e":"#ef4444" }}>
                          {bkL.totalVariation>=0?"+":""}<AnimCount target={Math.abs(bkL.totalVariation)} duration={1200}/>
                        </span>
                        <span style={{ fontSize:13,fontWeight:900,color:bkL.totalVariation>=0?"#22c55e":"#ef4444" }}> DRIX</span>
                      </div>
                    </div>
                  </div>
                );
              })() : drixData && drixShow && (
                /* fallback simple si pas encore de breakdown */
                <div style={{ display:"flex",gap:10,marginBottom:12 }}>
                  <div style={{ flex:1,background:"#14532d",borderRadius:12,padding:"12px 10px",textAlign:"center" }}>
                    <div style={{ fontSize:11,color:"#86efac",marginBottom:4 }}>🏆 {gagnant?.nom}</div>
                    <div style={{ fontWeight:900,fontSize:28,color:"#22c55e" }}>+<AnimCount target={dxGagnant?.gain||0} duration={1200}/></div>
                    <div style={{ fontSize:10,color:"#86efac" }}>DRIX gagnés</div>
                  </div>
                  <div style={{ flex:1,background:"#7f1d1d",borderRadius:12,padding:"12px 10px",textAlign:"center" }}>
                    <div style={{ fontSize:11,color:"#fca5a5",marginBottom:4 }}>💔 {perdantNom}</div>
                    <div style={{ fontWeight:900,fontSize:28,color:"#ef4444" }}>−<AnimCount target={dxPerdant?.perte||0} duration={1200}/></div>
                    <div style={{ fontSize:10,color:"#fca5a5" }}>DRIX perdus</div>
                  </div>
                </div>
              )}
              <p style={{ color:"#94a3b8",fontSize:12,textAlign:"center" }}>L'adversaire peut contester dans les 24h s'il n'était pas présent.</p>
            </>
          )}
        </div>
      )}

      <div style={{ display:"flex",gap:10,marginBottom:10 }}>
        {!modeDuel && <button onClick={demarrer} style={{ flex:1,padding:"13px 8px",borderRadius:12,border:"none",fontWeight:800,fontSize:15,cursor:"pointer",background:"linear-gradient(135deg,#f97316,#ea580c)",color:"#fff" }}>🔄 Rejouer</button>}
        <button onClick={()=>setShowStats(true)} style={{ flex:1,padding:"13px 8px",borderRadius:12,border:"1px solid #22c55e44",fontWeight:800,fontSize:15,cursor:"pointer",background:"#0f1a0f",color:"#22c55e" }}>📊 Stats</button>
        <button onClick={quitterPartie} style={{ flex:1,padding:"13px 8px",borderRadius:12,border:"1px solid #2a2a2a",fontWeight:800,fontSize:15,cursor:"pointer",background:"#1a1a1a",color:"#94a3b8" }}>
          {modeDuel?"✅ Valider":"⚙️ Config"}
        </button>
      </div>

      {/* ── Modal stats ─────────────────────────────────────────────────────── */}
      {showStats && (
        <div
          onClick={()=>setShowStats(false)}
          style={{ position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center" }}
        >
          <div
            onClick={e=>e.stopPropagation()}
            style={{ width:"100%",maxWidth:520,background:"#0d0d18",borderRadius:"20px 20px 0 0",padding:"0 0 32px",maxHeight:"88vh",overflowY:"auto",boxShadow:"0 -8px 40px #000a" }}
          >
            {/* Handle + titre */}
            <div style={{ position:"sticky",top:0,background:"#0d0d18",padding:"14px 20px 10px",borderBottom:"1px solid #1e1e2e",zIndex:1 }}>
              <div style={{ width:40,height:4,borderRadius:2,background:"#2a2a3e",margin:"0 auto 12px" }}/>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div style={{ fontWeight:900,fontSize:18,color:"#e2e8f0" }}>📊 Stats de la partie</div>
                <button onClick={()=>setShowStats(false)} style={{ background:"none",border:"none",color:"#64748b",fontSize:22,cursor:"pointer",lineHeight:1 }}>✕</button>
              </div>
            </div>

            <div style={{ padding:"16px 20px" }}>
              {/* En-têtes joueurs */}
              <div style={{ display:"grid",gridTemplateColumns:"1fr 110px 1fr",marginBottom:4 }}>
                <div style={{ textAlign:"right",fontWeight:800,fontSize:13,color: gagnantIdx===0?"#22c55e":"#94a3b8" }}>
                  {j0.nom} {gagnantIdx===0?"🏆":""}
                </div>
                <div/>
                <div style={{ textAlign:"left",fontWeight:800,fontSize:13,color: gagnantIdx===1?"#22c55e":"#94a3b8" }}>
                  {gagnantIdx===1?"🏆":""} {j1.nom}
                </div>
              </div>

              <StatRow label="Manches" v0={j0.manchesGagnees} v1={j1.manchesGagnees} h={hi(j0.manchesGagnees,j1.manchesGagnees)}/>
              <StatRow label="Moyenne" v0={s0.moy} v1={s1.moy} h={hi(s0.moy,s1.moy)}/>
              <StatRow label="Fléchettes" v0={j0.flechettes} v1={j1.flechettes} h={hi(j0.flechettes,j1.flechettes,false)}/>
              <StatRow label="Volées" v0={(j0.tours||[]).length} v1={(j1.tours||[]).length} h={hi((j0.tours||[]).length,(j1.tours||[]).length,false)}/>
              <StatRow label="Meilleure volée" v0={s0.bestVolee||"—"} v1={s1.bestVolee||"—"} h={hi(s0.bestVolee,s1.bestVolee)}/>
              <StatRow label="180" v0={s0.nb180} v1={s1.nb180} h={hi(s0.nb180,s1.nb180)}/>
              <StatRow label="140 → 179" v0={s0.nb140} v1={s1.nb140} h={hi(s0.nb140,s1.nb140)}/>
              <StatRow label="100 → 139" v0={s0.nb100} v1={s1.nb100} h={hi(s0.nb100,s1.nb100)}/>
              <StatRow label="80 → 99" v0={s0.nb80} v1={s1.nb80} h={hi(s0.nb80,s1.nb80)}/>
              <StatRow label="60 → 79" v0={s0.nb60} v1={s1.nb60} h={hi(s0.nb60,s1.nb60)}/>

              {/* Détail manches */}
              {manchesDetail.length > 0 && (
                <div style={{ marginTop:20 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",letterSpacing:1,marginBottom:10 }}>Détail des manches</div>
                  {manchesDetail.map((m,i)=>(
                    <div key={i} style={{ background:"#13131f",borderRadius:12,padding:"12px 14px",marginBottom:8 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6 }}>
                        <div style={{ fontSize:11,color:"#475569" }}>Manche {i+1}</div>
                        <div style={{ fontSize:12,fontWeight:700,color:"#22c55e" }}>🏆 {m.winner}</div>
                      </div>
                      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                        <div style={{ background:"#0a0a14",borderRadius:8,padding:"8px 10px" }}>
                          <div style={{ fontSize:11,color:"#22c55e",fontWeight:700,marginBottom:2 }}>{m.winner}</div>
                          <div style={{ fontSize:12,color:"#94a3b8" }}>{m.winner_volees} volées · moy {m.winner_moy}</div>
                          {m.winner_180>0 && <div style={{ fontSize:11,color:"#f97316" }}>💥 {m.winner_180}×180</div>}
                          <div style={{ fontSize:11,color:"#64748b" }}>Finish : {m.winner_finish||"—"}</div>
                        </div>
                        <div style={{ background:"#0a0a14",borderRadius:8,padding:"8px 10px" }}>
                          <div style={{ fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:2 }}>{m.loser}</div>
                          <div style={{ fontSize:12,color:"#94a3b8" }}>{m.loser_volees} volées · moy {m.loser_moy}</div>
                          {m.loser_180>0 && <div style={{ fontSize:11,color:"#f97316" }}>💥 {m.loser_180}×180</div>}
                          <div style={{ fontSize:11,color:"#64748b" }}>Reste : {m.reste_loser}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
import { finaliserDuel, calculerBonusPerformance } from "./AppJoueurs";

// ── AppJeux.jsx ───────────────────────────────────────────────────────────────
// Table de checkout exacte — source : darts501.com
const CHECKOUTS = {
  // ── 3 fléchettes ──────────────────────────────────────────────────────────
  170:"T20 T20 Bull",                                          // 60+60+50
  167:"T20 T19 Bull", 164:"T20 T18 Bull", 161:"T20 T17 Bull", // Bull finishes
  160:"T20 T20 D20",                                          // 60+60+40
  158:"T20 T20 D19", 157:"T20 T19 D20",                       // 60+60+38 | 60+57+40
  156:"T20 T20 D18", 155:"T20 T19 D19", 154:"T20 T18 D20",
  153:"T20 T19 D18", 152:"T20 T20 D16", 151:"T20 T17 D20",
  150:"T20 T18 D18", 149:"T20 T19 D16", 148:"T20 T16 D20",
  147:"T20 T17 D18", 146:"T20 T18 D16", 145:"T20 T15 D20",
  144:"T20 T20 D12", 143:"T20 T17 D16", 142:"T20 T14 D20",
  141:"T20 T19 D12",                                          // 60+57+24
  140:"T20 T16 D16", 139:"T19 T14 D20",                       // 57+42+40
  138:"T20 T18 D12",                                          // 60+54+24
  137:"T19 T16 D16",                                          // 57+48+32
  136:"T20 T20 D8",  135:"T20 T17 D12", 134:"T20 T14 D16",
  133:"T20 T19 D8",  132:"T20 T16 D12", 131:"T20 T13 D16",
  130:"T20 20 Bull",                                          // 60+20+50
  129:"T19 T16 D12", 128:"T18 T14 D16",                       // 57+48+24 | 54+42+32
  127:"T20 T17 D8",                                           // 60+51+16
  126:"T19 T19 D6",                                           // 57+57+12
  125:"25 T20 D20",                                           // 25+60+40 (Bull simple)
  124:"T20 T16 D8",  123:"T19 T16 D9",                        // 60+48+16 | 57+48+18
  122:"T18 T20 D4",                                           // 54+60+8
  121:"T17 T10 D20",                                          // 51+30+40
  120:"T20 20 D20",                                           // 60+20+40
  119:"T19 T10 D16",                                          // 57+30+32
  118:"T20 18 D20",  117:"T20 17 D20",  116:"T20 16 D20",
  115:"T20 15 D20",  114:"T20 14 D20",  113:"T20 13 D20",
  112:"T20 12 D20",
  111:"T20 19 D16",                                           // 60+19+32
  110:"T20 18 D16",                                           // 60+18+32
  109:"T19 20 D16",                                           // 57+20+32
  108:"T20 16 D16",                                           // 60+16+32
  107:"T19 18 D16",                                           // 57+18+32
  106:"T20 14 D16",                                           // 60+14+32
  105:"T19 16 D16",                                           // 57+16+32
  104:"T18 18 D16",                                           // 54+18+32
  103:"T20 3 D20",                                            // 60+3+40
  102:"T20 10 D16",                                           // 60+10+32
  101:"T20 1 D20",                                            // 60+1+40
  99:"T19 10 D16",                                            // 57+10+32
  // ── 2 fléchettes ──────────────────────────────────────────────────────────
  100:"T20 D20",
  98:"T20 D19",  97:"T19 D20",  96:"T20 D18",  95:"T19 D19",
  94:"T18 D20",  93:"T19 D18",  92:"T20 D16",  91:"T17 D20",
  90:"T20 D15",                                               // 60+30
  89:"T19 D16",
  88:"T16 D20",                                               // 48+40
  87:"T17 D18",  86:"T18 D16",  85:"T15 D20",  84:"T20 D12",
  83:"T17 D16",  82:"T14 D20",  81:"T19 D12",  80:"T20 D10",
  79:"T13 D20",  78:"T18 D12",  77:"T19 D10",  76:"T20 D8",
  75:"T17 D12",  74:"T14 D16",  73:"T19 D8",   72:"T16 D12",
  71:"T13 D16",
  70:"T10 D20",                                               // 30+40
  69:"T15 D12",                                               // 45+24
  68:"T20 D4",   67:"T17 D8",   66:"T10 D18",  65:"T19 D4",
  64:"T16 D8",
  63:"T13 D12",                                               // 39+24
  62:"T10 D16",  61:"T15 D8",
  60:"20 D20",                                                // 20+40
  // ── 1–2 fléchettes (simple + double) ─────────────────────────────────────
  59:"19 D20",  58:"18 D20",  57:"17 D20",  56:"16 D20",
  55:"15 D20",  54:"14 D20",  53:"13 D20",  52:"12 D20",
  51:"11 D20",  50:"Bull",
  49:"9 D20",   48:"8 D20",   47:"7 D20",   46:"6 D20",
  45:"5 D20",   44:"4 D20",   43:"3 D20",   42:"2 D20",
  41:"1 D20",   40:"D20",
  38:"D19", 36:"D18", 34:"D17", 32:"D16", 30:"D15", 28:"D14",
  26:"D13", 24:"D12", 22:"D11", 20:"D10", 18:"D9",  16:"D8",
  14:"D7",  12:"D6",  10:"D5",   8:"D4",   6:"D3",   4:"D2",  2:"D1",
};

const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";

export const Scoreur = ({ duel = null, drixData = null, onDuelTermine = null, setPage = null, onResultat = null }) => {
  const modeDuel = !!duel;

  const [etape, setEtape] = useState(modeDuel ? "bulle" : "config");
  const [config, setConfig] = useState({
    mode: duel?.mode || "501",
    manches: duel?.manches || 1,
    nom1: duel?.challenger_pseudo || "Joueur 1",
    nom2: duel?.defie_pseudo || "Joueur 2",
  });
  const [input, setInput] = useState("");
  const [joueurs, setJoueurs] = useState(null);
  const [actifIdx, setActifIdx] = useState(0);
  const [bulleStartIdx, setBulleStartIdx] = useState(0); // qui commence la manche 1
  const [mancheEnCours, setMancheEnCours] = useState(0); // 0-based
  const [gagnant, setGagnant] = useState(null);
  const [resultEnregistre, setResultEnregistre] = useState(false);
  const [showConfirmQuitter, setShowConfirmQuitter] = useState(false);
  const [historique, setHistorique] = useState([]);
  const [manchesHistory, setManchesHistory] = useState([]);
  // Valeurs cumulatives au début de la manche courante (tours/flechettes/points sont cumulatifs)
  const [mancheStart, setMancheStart] = useState({ vol:[0,0], pts:[0,0], nbtours:[0,0], flechettes:[0,0] });
  const [pendingVolee, setPendingVolee] = useState(null); // { val, type:"finish"|"zero" }
  const [drixBreakdown, setDrixBreakdown] = useState(null); // breakdown détaillé post-match
  const [liveBonusNotif, setLiveBonusNotif] = useState(null); // { label, color, points }
  const bonusAccumRef = useRef([0, 0]); // bonus cumulés en live [j0, j1]
  const [bonusAccum, setBonusAccum] = useState([0, 0]);

  // ── Live session tracking ──
  const liveIdRef = useRef(null);
  const liveVoleeNumRef = useRef([0, 0]);
  const liveMaxFinishRef = useRef([0, 0]);
  const liveBustsRef = useRef([0, 0]);

  // ── Wake Lock : empêche la mise en veille pendant le jeu ──
  useEffect(() => {
    if (etape !== "jeu") return;
    let wakeLock = null;
    const requestWakeLock = async () => {
      try { wakeLock = await navigator.wakeLock?.request("screen"); } catch {}
    };
    requestWakeLock();
    // Re-acquérir si l'onglet revient au premier plan (le wake lock est libéré en arrière-plan)
    const onVisibility = () => { if (document.visibilityState === "visible") requestWakeLock(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      wakeLock?.release().catch(() => {});
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [etape]);

  // ── Live session : démarre quand etape passe à "jeu" ──
  useEffect(() => {
    if (etape === "jeu" && modeDuel && duel?.id && !liveIdRef.current) {
      createLiveSession();
    }
    if (etape === "fin" || etape === "config") {
      closeLiveSession();
    }
  }, [etape]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Plein écran auto + blocage scroll pendant le jeu ──
  useEffect(() => {
    if (etape !== "jeu") return;
    // Plein écran automatique
    document.documentElement.requestFullscreen?.().catch(() => {});
    // Bloquer tout scroll
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
      document.body.style.touchAction = "";
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [etape]);

  // Bouton retour téléphone géré par App.jsx (modale globale)

  function initJoueursFromDuel(d) {
    const sv = parseInt(d?.mode || "501");
    return [
      { nom:d?.challenger_pseudo||"Joueur 1", score:sv, manchesGagnees:0, tours:[], flechettes:0, totalPoints:0, scorePrecedent:null },
      { nom:d?.defie_pseudo||"Joueur 2", score:sv, manchesGagnees:0, tours:[], flechettes:0, totalPoints:0, scorePrecedent:null },
    ];
  }

  const startVal = parseInt(config.mode);

  const initJoueurs = () => [
    { nom:config.nom1||"Joueur 1", score:startVal, manchesGagnees:0, tours:[], flechettes:0, totalPoints:0, scorePrecedent:null },
    { nom:config.nom2||"Joueur 2", score:startVal, manchesGagnees:0, tours:[], flechettes:0, totalPoints:0, scorePrecedent:null },
  ];

  const demarrerAvecBulle = (startIdx) => {
    const sv = modeDuel ? parseInt(duel?.mode || "501") : startVal;
    const noms = modeDuel
      ? [duel?.challenger_pseudo || "Joueur 1", duel?.defie_pseudo || "Joueur 2"]
      : [config.nom1 || "Joueur 1", config.nom2 || "Joueur 2"];
    setJoueurs([
      { nom:noms[0], score:sv, manchesGagnees:0, tours:[], flechettes:0, totalPoints:0, scorePrecedent:null },
      { nom:noms[1], score:sv, manchesGagnees:0, tours:[], flechettes:0, totalPoints:0, scorePrecedent:null },
    ]);
    setBulleStartIdx(startIdx);
    setMancheEnCours(0);
    setActifIdx(startIdx);
    setGagnant(null);
    setInput("");
    setResultEnregistre(false);
    setHistorique([]);
    setManchesHistory([]);
    setMancheStart({ vol:[0,0], pts:[0,0], nbtours:[0,0], flechettes:[0,0] });
    setEtape("jeu");
  };

  // Construit le détail d'une manche à partir des données courantes vs. début de manche
  const buildMancheDetail = (updated, winnerIdx, start, startScore = 501) => {
    const w = updated[winnerIdx];
    const l = updated[1-winnerIdx];
    const wFlech = w.flechettes - (start.flechettes?.[winnerIdx] ?? start.vol[winnerIdx]*3);
    const lFlech = l.flechettes - (start.flechettes?.[1-winnerIdx] ?? start.vol[1-winnerIdx]*3);
    const wPts = w.totalPoints - start.pts[winnerIdx];
    const lPts = l.totalPoints - start.pts[1-winnerIdx];

    // Volées de cette manche uniquement (slice depuis le début de manche)
    const wTours = w.tours.slice(start.nbtours[winnerIdx]);
    const lTours = l.tours.slice(start.nbtours[1-winnerIdx]);
    const cnt = (arr, min, max=Infinity) => arr.filter(v=>v>=min&&v<=max).length;

    // Tentatives de checkout : volées où le score restant au DÉBUT de la volée était ≤ 170
    const countCheckoutAttempts = (tours) => {
      let remaining = startScore;
      let attempts = 0;
      for (const t of tours) {
        if (remaining <= 170) attempts++;
        remaining -= t;
      }
      return attempts;
    };

    return {
      winner: w.nom, loser: l.nom,
      winner_volees: Math.round(wFlech/3), loser_volees: Math.round(lFlech/3),
      winner_moy: wFlech > 0 ? Math.round((wPts/wFlech)*3) : 0,
      loser_moy: lFlech > 0 ? Math.round((lPts/lFlech)*3) : 0,
      reste_loser: l.score,
      // Scoring stats par manche
      winner_180:    cnt(wTours, 180),
      winner_140plus: cnt(wTours, 140, 179),
      winner_100plus: cnt(wTours, 100, 139),
      winner_80plus:  cnt(wTours, 80, 99),
      winner_60plus:  cnt(wTours, 60, 79),
      winner_max:     wTours.length > 0 ? Math.max(...wTours) : 0,
      winner_finish:  wTours.length > 0 ? wTours[wTours.length-1] : 0,
      loser_180:     cnt(lTours, 180),
      loser_140plus:  cnt(lTours, 140, 179),
      loser_100plus:  cnt(lTours, 100, 139),
      loser_80plus:   cnt(lTours, 80, 99),
      loser_60plus:   cnt(lTours, 60, 79),
      loser_max:      lTours.length > 0 ? Math.max(...lTours) : 0,
      winner_26:      cnt(wTours, 26, 26),
      loser_26:       cnt(lTours, 26, 26),
      // Checkout % réel : tentatives (score ≤ 170 en début de volée) vs. succès (leg gagnée = 1)
      winner_checkout_attempts: countCheckoutAttempts(wTours),
      loser_checkout_attempts:  countCheckoutAttempts(lTours),
    };
  };

  const demarrer = () => demarrerAvecBulle(0);

  const quitterPartie = () => {
    setShowConfirmQuitter(false);
    if (modeDuel && setPage) { closeLiveSession(); setPage("mon-profil"); return; }
    setJoueurs(null); setGagnant(null); setInput("");
    setResultEnregistre(false); setHistorique([]);
    setEtape("config");
  };

  const appuyer = (val) => {
    if (val === "del") { setInput(p => p.slice(0, -1)); return; }
    if (input.length >= 3) return;
    const next = input + val;
    if (parseInt(next) > 180) return;
    setInput(next);
  };

  const [annulMsg, setAnnulMsg] = useState(null);

  const annulerDernierCoup = () => {
    if (historique.length === 0 && !pendingVolee) return;
    // Si popup finish/zero ouverte → on annule d'abord sans dépiler (l'entrée a déjà été pushée)
    const wasFinishPopup = !!pendingVolee;
    setPendingVolee(null);
    if (historique.length === 0) { setInput(""); return; }

    const prev = historique[historique.length - 1];
    // Rollback TOTAL : scores + joueur actif + manche + starter + historique manches
    setJoueurs(prev.joueurs.map(j => ({ ...j, tours: [...j.tours] })));
    setActifIdx(prev.actifIdx);
    if (prev.mancheEnCours !== undefined) setMancheEnCours(prev.mancheEnCours);
    if (prev.mancheStart  !== undefined) setMancheStart(prev.mancheStart);
    if (prev.manchesHistory !== undefined) setManchesHistory(prev.manchesHistory);
    setHistorique(h => h.slice(0, -1));
    setInput("");

    // Message UX bref
    if (wasFinishPopup) {
      setAnnulMsg("↩️ Finish annulé — état précédent restauré.");
      setTimeout(() => setAnnulMsg(null), 2500);
    }
  };

  const enregistrerResultatDuel = async (gagnantNom, scoreC, scoreD, moyC, moyD, manchesDetail=[], joueursData=[]) => {
    if (onResultat) {
      onResultat({ gagnantNom, scoreC, scoreD, moyC, moyD, joueurs: joueursData, manchesDetail });
      setResultEnregistre(true);
      if (onDuelTermine) onDuelTermine();
      return;
    }
    if (!duel || resultEnregistre) return;
    const gagnantId = gagnantNom === duel.challenger_pseudo ? duel.challenger_id : duel.defie_id;
    const gagnantIsChallenger = gagnantId === duel.challenger_id;
    try {
      await fetch(`${SB_URL}/rest/v1/duels?id=eq.${duel.id}`, {
        method: "PATCH",
        headers: { "apikey":SB_KEY, "Authorization":`Bearer ${SB_KEY}`, "Content-Type":"application/json", "Prefer":"return=minimal" },
        body: JSON.stringify({
          statut: "termine",
          gagnant_id: gagnantId,
          gagnant_pseudo: gagnantNom,
          score_manches_challenger: scoreC,
          score_manches_defie: scoreD,
          score_challenger: moyC,
          score_defie: moyD,
          manches_detail: manchesDetail,
          valide_challenger: gagnantIsChallenger,
          valide_defie: !gagnantIsChallenger,
          date: Date.now(),
        })
      });

      // ── Calcul bonus de performance ──
      const perfBonus = duel.type !== "amical" && joueursData.length >= 2
        ? calculerBonusPerformance(joueursData, manchesDetail)
        : null;

      const breakdown = await finaliserDuel({ ...duel, gagnant_id: gagnantId }, perfBonus);
      if (breakdown) setDrixBreakdown(breakdown);

      // ── Post Comptoir (duels classés uniquement) ──
      if (duel.type !== "amical" && breakdown) {
        const bkC = breakdown.challenger;
        const bkD = breakdown.defie;
        const perdantNom = gagnantIsChallenger ? duel.defie_pseudo : duel.challenger_pseudo;
        const bkW = gagnantIsChallenger ? bkC : bkD;
        const bkL = gagnantIsChallenger ? bkD : bkC;
        const j0 = joueursData[0]; const j1 = joueursData[1];
        const all180 = [...(j0?.tours||[]),...(j1?.tours||[])].filter(v=>v===180).length;
        const highlights = [
          all180 > 0 ? `💥 ${all180}×180 dans ce match` : "",
          manchesDetail.some(m=>(m.winner_finish||0)>=160) ? `🐟 Big Fish ≥ 160 !` : "",
        ].filter(Boolean).join("  ");
        // Post structuré : headline courte + breakdown dans un objet JSON
        const duelPost = {
          headline: `🏆 ${gagnantNom} bat ${perdantNom} ${scoreC}-${scoreD}`,
          highlights: highlights || null,
          winner: {
            nom: gagnantNom,
            elo: bkW.eloVariation,
            bonusManches: bkW.bonus.bonusManches,
            nbManches: bkW.bonus.bonusManches > 0 ? Math.round(bkW.bonus.bonusManches / 7) : 0,
            bonusVolees: bkW.bonus.bonusVolees,
            nbVolees: bkW.bonus.nbGrossesVolees,
            bonusFinish: bkW.bonus.bonusFinish,
            nbFinish: bkW.bonus.nbGrosFinish,
            total: bkW.totalVariation,
          },
          loser: {
            nom: perdantNom,
            elo: bkL.eloVariation,
            bonusManches: bkL.bonus.bonusManches,
            nbManches: bkL.bonus.bonusManches > 0 ? Math.round(bkL.bonus.bonusManches / 7) : 0,
            bonusVolees: bkL.bonus.bonusVolees,
            nbVolees: bkL.bonus.nbGrossesVolees,
            bonusFinish: bkL.bonus.bonusFinish,
            nbFinish: bkL.bonus.nbGrosFinish,
            total: bkL.totalVariation,
          },
        };
        const contenu = `__DUEL__|${JSON.stringify(duelPost)}`;
        fetch(`${SB_URL}/rest/v1/wall_posts`, {
          method:"POST",
          headers:{ "apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal" },
          body: JSON.stringify({ joueur_id:gagnantId, joueur_pseudo:gagnantNom, joueur_photo:null, contenu, date:Date.now() }),
        }).catch(()=>{});
      }

      setResultEnregistre(true);
      if (onDuelTermine) onDuelTermine({ gagnantId });
    } catch(e) { console.error("Erreur enregistrement duel:", e); }
  };

  // ── Suivi live session ────────────────────────────────────────────────────
  const createLiveSession = async () => {
    if (!modeDuel || !duel?.id) return;
    try {
      const mode = duel.mode || "501";
      const manches = duel.manches || 1;
      const format = manches === 1 ? "Bo1" : `Bo${manches * 2 - 1}`;
      const sv = parseInt(mode) || 501;
      const initSt = { moy:0, volees:0, total_pts:0, nb180:0, reste:sv, max_finish:0, busts:0 };
      const body = {
        mode, format,
        joueur1_id:String(duel.challenger_id), joueur1_pseudo:duel.challenger_pseudo, joueur1_drix:duel.challenger_drix||1000,
        joueur2_id:String(duel.defie_id), joueur2_pseudo:duel.defie_pseudo, joueur2_drix:duel.defie_drix||1000,
        debut:Date.now(), statut:"en_cours",
        score1:0, score2:0, stats_j1:initSt, stats_j2:initSt,
      };
      const r = await fetch(`${SB_URL}/rest/v1/live_sessions`, {
        method:"POST",
        headers:{ "apikey":SB_KEY, "Authorization":`Bearer ${SB_KEY}`, "Content-Type":"application/json", "Prefer":"return=representation" },
        body: JSON.stringify(body),
      });
      const text = await r.text();
      if (!r.ok) { console.error("createLiveSession HTTP error:", r.status, text); return; }
      const d = text ? JSON.parse(text) : null;
      const row = Array.isArray(d) ? d[0] : d;
      if (row?.id) {
        liveIdRef.current = row.id;
        liveVoleeNumRef.current = [0,0];
        liveMaxFinishRef.current = [0,0];
        liveBustsRef.current = [0,0];
        console.log("✅ Live session créée:", row.id);
      } else {
        console.error("createLiveSession: pas d'id dans la réponse", d);
      }
    } catch(e) { console.error("createLiveSession exception:", e); }
  };

  const pushLiveVolee = async (joueurIdx, score, isBust, isFinish, updatedJoueurs) => {
    if (!liveIdRef.current) return;
    liveVoleeNumRef.current[joueurIdx]++;
    if (isFinish && score > 0) liveMaxFinishRef.current[joueurIdx] = Math.max(liveMaxFinishRef.current[joueurIdx], score);
    if (isBust) liveBustsRef.current[joueurIdx]++;
    const j = updatedJoueurs[joueurIdx];
    const flech = j.flechettes;
    const moy = flech > 0 ? Math.round(j.totalPoints / flech * 3 * 10) / 10 : 0;
    const nb180 = (j.tours||[]).filter(v => v===180).length;
    const reste = isBust ? j.score : j.score; // j.score already updated correctly
    const statsKey = joueurIdx === 0 ? "stats_j1" : "stats_j2";
    const scoreKey = joueurIdx === 0 ? "score1" : "score2";
    try {
      await Promise.all([
        fetch(`${SB_URL}/rest/v1/live_sessions?id=eq.${liveIdRef.current}`, {
          method:"PATCH",
          headers:{ apikey:SB_KEY, Authorization:`Bearer ${SB_KEY}`, "Content-Type":"application/json", Prefer:"return=minimal" },
          body: JSON.stringify({ [statsKey]:{ moy, volees:j.tours.length, total_pts:j.totalPoints, nb180, reste, max_finish:liveMaxFinishRef.current[joueurIdx], busts:liveBustsRef.current[joueurIdx] }, [scoreKey]:j.manchesGagnees }),
        }),
        fetch(`${SB_URL}/rest/v1/live_volees`, {
          method:"POST",
          headers:{ apikey:SB_KEY, Authorization:`Bearer ${SB_KEY}`, "Content-Type":"application/json", Prefer:"return=minimal" },
          body: JSON.stringify({ session_id:liveIdRef.current, joueur_id:joueurIdx===0?duel.challenger_id:duel.defie_id, numero_volee:liveVoleeNumRef.current[joueurIdx], score:isBust?-1:score, reste, date:Date.now() }),
        }),
      ]);
    } catch(e) { console.warn("pushLiveVolee:", e); }
  };

  const closeLiveSession = async () => {
    if (!liveIdRef.current) return;
    try {
      await fetch(`${SB_URL}/rest/v1/live_sessions?id=eq.${liveIdRef.current}`, {
        method:"PATCH",
        headers:{ apikey:SB_KEY, Authorization:`Bearer ${SB_KEY}`, "Content-Type":"application/json", Prefer:"return=minimal" },
        body: JSON.stringify({ statut:"termine" }),
      });
    } catch(e) { console.warn("closeLiveSession:", e); }
    liveIdRef.current = null;
  };

  // Snapshot COMPLET pour rollback total (scores + tours + ordre + manche + historique manches)
  const snapshot = () => ({
    joueurs: joueurs.map(j => ({
      nom: j.nom, score: j.score, manchesGagnees: j.manchesGagnees,
      flechettes: j.flechettes, totalPoints: j.totalPoints,
      scorePrecedent: j.scorePrecedent, tours: [...j.tours],
    })),
    actifIdx,
    mancheEnCours,
    mancheStart: { vol:[...mancheStart.vol], pts:[...mancheStart.pts], nbtours:[...mancheStart.nbtours], flechettes:[...mancheStart.flechettes] },
    manchesHistory: [...manchesHistory],
  });

  const pushHistorique = () => setHistorique(h => [...h.slice(-14), snapshot()]);

  const envoyer = () => {
    if (!joueurs) return;
    const val = parseInt(input);
    if (!input || isNaN(val) || val < 0 || val > 180) { setInput(""); return; }

    const joueur = joueurs[actifIdx];
    const nouveau = joueur.score - val;

    // Bust
    if (nouveau < 0 || nouveau === 1) {
      pushHistorique();
      const updated = joueurs.map((j, i) => i === actifIdx ? { ...j, scorePrecedent: val, flechettes: j.flechettes + 3 } : j);
      setJoueurs(updated); setActifIdx(1 - actifIdx); setInput("");
      pushLiveVolee(actifIdx, val, true, false, updated);
      return;
    }

    // Finish (score → 0) ou zéro pointé → popup fléchettes
    if (nouveau === 0 || val === 0) {
      pushHistorique();
      setPendingVolee({ val, type: nouveau === 0 ? "finish" : "zero" });
      setInput(""); return;
    }

    // Volée normale — pas de limite de fléchettes, la partie se poursuit jusqu'au finish
    pushHistorique();
    const updatedN = joueurs.map((j, i) => i === actifIdx
      ? { ...j, score: nouveau, tours: [...j.tours, val], flechettes: j.flechettes + 3, totalPoints: j.totalPoints + val, scorePrecedent: val }
      : j
    );
    setJoueurs(updatedN);
    setActifIdx(1 - actifIdx); setInput("");
    pushLiveVolee(actifIdx, val, false, false, updatedN);
    // 🔥 Live bonus notification — grosse volée ≥ 120
    if (val >= 120 && modeDuel && duel?.type !== "amical") {
      const pts = 7;
      bonusAccumRef.current[actifIdx] += pts;
      setBonusAccum([...bonusAccumRef.current]);
      setLiveBonusNotif({ label:`🔥 ${val} pts ! Grosse volée`, points:pts, color:"#f97316" });
      setTimeout(() => setLiveBonusNotif(null), 2500);
    }
  };

  // Appelé après sélection du nb de fléchettes dans la popup
  const confirmerVolee = (nbFlechettes) => {
    if (!pendingVolee || !joueurs) return;
    // Anti-double validation : si pendingVolee est déjà null on sort immédiatement
    if (nbFlechettes < 1 || nbFlechettes > 3) return;
    const { val, type } = pendingVolee;
    const joueur = joueurs[actifIdx];
    setPendingVolee(null);

    if (type === "finish") {
      const newManches = joueur.manchesGagnees + 1;
      const updated = joueurs.map((j, i) => i === actifIdx
        ? { ...j, score: 0, manchesGagnees: newManches, tours: [...j.tours, val], flechettes: j.flechettes + nbFlechettes, totalPoints: j.totalPoints + val, scorePrecedent: val }
        : j
      );
      const manchesTotal = modeDuel ? (duel?.manches || 1) : config.manches;
      const startScore = modeDuel ? parseInt(duel?.mode || "501") : startVal;
      const mancheDetail = buildMancheDetail(updated, actifIdx, mancheStart, startScore);
      if (newManches >= manchesTotal) {
        const allManches = [...manchesHistory, mancheDetail];
        setJoueurs(updated);
        setManchesHistory(allManches); // inclut la dernière manche pour les stats de fin
        const scoreC = actifIdx === 0 ? newManches : updated[0].manchesGagnees;
        const scoreD = actifIdx === 1 ? newManches : updated[1].manchesGagnees;
        const moyC = parseFloat(moyenneCalc(updated[0]));
        const moyD = parseFloat(moyenneCalc(updated[1]));
        setGagnant({ ...joueur, manchesGagnees:newManches, tours:[...joueur.tours,val], totalPoints:joueur.totalPoints+val, flechettes:joueur.flechettes+nbFlechettes });
        pushLiveVolee(actifIdx, val, false, true, updated);
        setEtape("fin");
        if (modeDuel || onResultat) enregistrerResultatDuel(joueur.nom, scoreC, scoreD, moyC, moyD, allManches, updated);
        return;
      }
      setManchesHistory(h => [...h, mancheDetail]);
      setMancheStart({
        vol: [Math.round(updated[0].flechettes/3), Math.round(updated[1].flechettes/3)],
        pts: [updated[0].totalPoints, updated[1].totalPoints],
        nbtours: [updated[0].tours.length, updated[1].tours.length],
        flechettes: [updated[0].flechettes, updated[1].flechettes],
      });
      const nextManche = mancheEnCours + 1;
      const nextStart = (bulleStartIdx + nextManche) % 2;
      setMancheEnCours(nextManche);
      setJoueurs(updated.map(j => ({ ...j, score: modeDuel ? parseInt(duel?.mode||"501") : startVal, scorePrecedent: null })));
      pushLiveVolee(actifIdx, val, false, true, updated);
      // 🏆 Live bonus — gros finish ≥ 120 + grosse volée ≥ 120
      if (modeDuel && duel?.type !== "amical") {
        let notifLabel = ""; let notifPts = 0;
        if (val >= 120) {
          // finish ≥ 120 : +10 bonus finish + +7 bonus volée
          bonusAccumRef.current[actifIdx] += 17;
          setBonusAccum([...bonusAccumRef.current]);
          notifLabel = `🏆 Finish ${val} ! Grosse volée + Gros finish`; notifPts = 17;
        }
        if (notifPts > 0) {
          setLiveBonusNotif({ label:notifLabel, points:notifPts, color:"#a78bfa" });
          setTimeout(() => setLiveBonusNotif(null), 2800);
        }
      }
      setActifIdx(nextStart); return;
    }

    // type === "zero" : volée à 0 point avec nb de fléchettes réel
    const updatedZ = joueurs.map((j, i) => i === actifIdx
      ? { ...j, tours: [...j.tours, 0], flechettes: j.flechettes + nbFlechettes, scorePrecedent: 0 }
      : j
    );
    setJoueurs(updatedZ); setActifIdx(1 - actifIdx);
    pushLiveVolee(actifIdx, 0, false, false, updatedZ);
  };

  // Moyenne globale (pour écran fin)
  const moyenneCalc = (j) => {
    if (!j || j.flechettes === 0) return "0.00";
    return ((j.totalPoints / j.flechettes) * 3).toFixed(2);
  };
  const moyenne = moyenneCalc;

  // Moyenne par manche en cours (repart à 0 à chaque nouvelle manche)
  const moyenneManche = (j, idx) => {
    const flech = j.flechettes - (mancheStart.flechettes?.[idx] ?? 0);
    const pts   = j.totalPoints - mancheStart.pts[idx];
    if (flech === 0) return "—";
    return ((pts / flech) * 3).toFixed(1);
  };
  const checkout = joueurs ? CHECKOUTS[joueurs[actifIdx]?.score] : null;

  // ── MODAL QUITTER ─────────────────────────────────────────────────────────
  const ModalConfirmQuitter = () => (
    <div style={{ position:"fixed", inset:0, background:"#000c", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#1a1a1a", border:"2px solid #ef4444", borderRadius:16, padding:28, maxWidth:340, width:"100%", textAlign:"center" }}>
        <div style={{ fontSize:44, marginBottom:12 }}>⚠️</div>
        <h3 style={{ fontWeight:800, fontSize:18, color:"#f1f5f9", marginBottom:8 }}>Abandonner la partie ?</h3>
        <p style={{ color:"#94a3b8", fontSize:14, marginBottom:24, lineHeight:1.6 }}>
          {modeDuel ? "Le duel sera annulé et les DRIX ne seront pas mis à jour." : "La partie en cours sera perdue."}
        </p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>setShowConfirmQuitter(false)}
            style={{ flex:1, padding:"14px", borderRadius:10, border:"1px solid #2a2a2a", background:"#111", color:"#f1f5f9", fontWeight:700, fontSize:15, cursor:"pointer" }}>
            ← Continuer
          </button>
          <button onClick={quitterPartie}
            style={{ flex:1, padding:"14px", borderRadius:10, border:"none", background:"#7f1d1d", color:"#ef4444", fontWeight:700, fontSize:15, cursor:"pointer" }}>
            Quitter
          </button>
        </div>
      </div>
    </div>
  );

  // ── ÉCRAN BULLE (duel uniquement) ─────────────────────────────────────────────
  if (etape === "bulle") {
    const n0 = duel?.challenger_pseudo || "Joueur 1";
    const n1 = duel?.defie_pseudo || "Joueur 2";
    return (
      <div style={{ maxWidth:480, margin:"0 auto", padding:"40px 20px", fontFamily:"Inter,sans-serif", textAlign:"center" }}>
        <div style={{ fontSize:60, marginBottom:16 }}>🎯</div>
        <h2 style={{ fontWeight:900, fontSize:24, color:"#f1f5f9", marginBottom:8 }}>Qui commence ?</h2>
        <p style={{ color:"#94a3b8", fontSize:14, marginBottom:32, lineHeight:1.6 }}>
          Le joueur qui a gagné la bulle commence la première manche.<br/>
          <span style={{ fontSize:12 }}>L'adversaire commencera la manche suivante, et ainsi de suite.</span>
        </p>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[n0, n1].map((nom, idx) => (
            <button key={idx} onClick={() => demarrerAvecBulle(idx)}
              style={{ padding:"22px 20px", borderRadius:16, border:`2px solid ${idx===0?"#f97316":"#60a5fa"}`, background:`${idx===0?"#f97316":"#60a5fa"}22`, color:"#f1f5f9", fontWeight:800, fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:12, transition:"all .15s" }}
              onMouseEnter={e=>{e.currentTarget.style.background=`${idx===0?"#f97316":"#60a5fa"}44`;}}
              onMouseLeave={e=>{e.currentTarget.style.background=`${idx===0?"#f97316":"#60a5fa"}22`;}}>
              <span style={{ fontSize:28 }}>{idx===0?"🟠":"🔵"}</span>
              {nom}
              <span style={{ fontSize:14, color:"#94a3b8", fontWeight:500 }}>commence</span>
            </button>
          ))}
        </div>
        <button onClick={()=>{ if(setPage) setPage("defi"); }}
          style={{ marginTop:24, background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:13 }}>
          ← Annuler
        </button>
      </div>
    );
  }

  // ── ÉCRAN CONFIG ──────────────────────────────────────────────────────────
  if (etape === "config") return (
    <div style={{ maxWidth:480, margin:"0 auto", padding:"24px 16px", fontFamily:"Inter,sans-serif" }}>
      <h1 style={{ fontWeight:900, fontSize:26, marginBottom:4, color:"#f1f5f9", textAlign:"center" }}>🎯 Scoreur</h1>
      <p style={{ color:"#94a3b8", fontSize:14, marginBottom:28, textAlign:"center" }}>Mode libre</p>
      <div style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:14, padding:24, display:"flex", flexDirection:"column", gap:14 }}>
        <div>
          <label style={{ fontSize:13, fontWeight:600, color:"#94a3b8", display:"block", marginBottom:10 }}>MODE DE JEU</label>
          <div style={{ display:"flex", gap:8 }}>
            {["301","501"].map(m=>(
              <button key={m} onClick={()=>setConfig(c=>({...c,mode:m}))}
                style={{ flex:1, padding:"16px", borderRadius:12, border:"none", fontWeight:900, fontSize:22, cursor:"pointer",
                  background:config.mode===m?"linear-gradient(135deg,#f97316,#ea580c)":"#111", color:config.mode===m?"#fff":"#94a3b8" }}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize:13, fontWeight:600, color:"#94a3b8", display:"block", marginBottom:10 }}>PREMIER À ... MANCHES</label>
          <div style={{ display:"flex", gap:8 }}>
            {[1,2,3,4,5].map(n=>(
              <button key={n} onClick={()=>setConfig(c=>({...c,manches:n}))}
                style={{ flex:1, padding:"14px 0", borderRadius:10, border:"none", fontWeight:800, fontSize:18, cursor:"pointer",
                  background:config.manches===n?"linear-gradient(135deg,#f97316,#ea580c)":"#111", color:config.manches===n?"#fff":"#94a3b8" }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize:13, fontWeight:600, color:"#94a3b8", display:"block", marginBottom:10 }}>JOUEURS</label>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[["nom1","Joueur 1"],["nom2","Joueur 2"]].map(([k,ph])=>(
              <input key={k} value={config[k]} onChange={e=>setConfig(c=>({...c,[k]:e.target.value}))} placeholder={ph}
                style={{ background:"#111", border:"1px solid #2a2a2a", borderRadius:10, padding:"14px 16px", color:"#f1f5f9", fontSize:16, fontWeight:600 }}/>
            ))}
          </div>
        </div>
        <button onClick={demarrer}
          style={{ width:"100%", padding:"18px", borderRadius:14, border:"none", fontWeight:900, fontSize:18, cursor:"pointer",
            background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", marginTop:4 }}>
          🎯 DÉMARRER LA PARTIE
        </button>
      </div>
      <div style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:12, padding:18, marginTop:20 }}>
        <h3 style={{ fontWeight:700, fontSize:14, marginBottom:10, color:"#f97316" }}>📋 Règles rapides</h3>
        <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.7 }}>
          Partez de {config.mode} et descendez à 0. Le dernier lancer doit finir sur un <strong style={{ color:"#f1f5f9" }}>double</strong>.
          Si le score descend en dessous de 0 ou égale 1, le tour est <strong style={{ color:"#ef4444" }}>bust</strong>.
        </p>
      </div>
    </div>
  );

  // ── ÉCRAN FIN ─────────────────────────────────────────────────────────────
  if (etape === "fin") return (
    <FinScreen
      gagnant={gagnant}
      duel={duel}
      drixData={drixData}
      drixBreakdown={drixBreakdown}
      modeDuel={modeDuel}
      moyenne={moyenne}
      demarrer={demarrer}
      quitterPartie={quitterPartie}
      joueurs={joueurs}
      manchesDetail={manchesHistory}
    />
  );

  // ── ÉCRAN JEU — position fixed, plein écran, zero scroll ─────────────────
  if (!joueurs) return null;
  // Le joueur qui a gagné la bulle est TOUJOURS affiché à gauche (index 0 dans l'affichage)
  const displayOrder = [bulleStartIdx, 1 - bulleStartIdx];
  const actif = joueurs[actifIdx];
  const manchesTotal = modeDuel ? (duel?.manches || 1) : config.manches;

  return (
    <div className="scoreur-wrap" style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "#0f0f0f",
      fontFamily: "Inter,sans-serif",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      zIndex: 500,
      touchAction: "none",
    }}>
      <style>{`.scoreur-wrap button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; } .scoreur-wrap button:active { opacity: 0.7; transform: scale(0.95); }`}</style>
      {showConfirmQuitter && <ModalConfirmQuitter/>}

      {/* ── LIVE BONUS NOTIFICATION ── */}
      {liveBonusNotif && (
        <div style={{ position:"fixed",top:60,left:"50%",transform:"translateX(-50%)",zIndex:10001,
          background:"linear-gradient(135deg,#1a0a2e,#2d1458)",border:`1px solid ${liveBonusNotif.color}66`,
          borderRadius:16,padding:"14px 22px",textAlign:"center",boxShadow:`0 4px 30px ${liveBonusNotif.color}44`,
          pointerEvents:"none",minWidth:220 }}>
          <div style={{ fontSize:13,color:"#e2e8f0",fontWeight:700,marginBottom:4 }}>{liveBonusNotif.label}</div>
          <div style={{ fontSize:22,fontWeight:900,color:liveBonusNotif.color }}>+{liveBonusNotif.points} DRIX 💎</div>
        </div>
      )}

      {/* ── MESSAGE ANNULATION ── */}
      {annulMsg && (
        <div style={{ position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:10000,background:"#14532d",border:"1px solid #22c55e55",borderRadius:12,padding:"12px 20px",color:"#22c55e",fontWeight:700,fontSize:14,boxShadow:"0 4px 20px #000a",whiteSpace:"nowrap" }}>
          {annulMsg}
        </div>
      )}

      {/* ── POPUP FLÉCHETTES ── */}
      {pendingVolee && (
        <div style={{ position:"fixed",inset:0,background:"#000000dd",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:24 }}>
          <div style={{ background:"#1a1a1a",border:`2px solid ${pendingVolee.type==="finish"?"#22c55e":"#f59e0b"}`,borderRadius:20,padding:28,maxWidth:340,width:"100%",textAlign:"center" }}>
            <div style={{ fontSize:48,marginBottom:10 }}>{pendingVolee.type==="finish"?"🏆":"🎯"}</div>
            <h3 style={{ fontWeight:900,fontSize:19,color:"#f1f5f9",marginBottom:8 }}>
              {pendingVolee.type==="finish" ? "🏆 FINISH !" : "Volée à 0 point"}
            </h3>
            <p style={{ color:"#94a3b8",fontSize:14,marginBottom:20,lineHeight:1.6 }}>
              {pendingVolee.type==="finish"
                ? "Combien de fléchettes as-tu utilisées pour finir ?"
                : "Combien de fléchettes as-tu réellement lancées ?"
              }
            </p>
            <div style={{ display:"flex",gap:10,justifyContent:"center",marginBottom:14 }}>
              {[1,2,3].map(n => (
                <button key={n}
                  onPointerDown={e=>{ e.preventDefault(); confirmerVolee(n); }}
                  style={{
                    flex:1, padding:"18px 0", borderRadius:14, border:"none", fontWeight:900, fontSize:24, cursor:"pointer",
                    background: pendingVolee.type==="finish"
                      ? "linear-gradient(135deg,#14532d,#16a34a)"
                      : "linear-gradient(135deg,#78350f,#d97706)",
                    color:"#fff", touchAction:"manipulation",
                    WebkitTapHighlightColor:"transparent",
                  }}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  {n}
                </button>
              ))}
            </div>
            <p style={{ color:"#4b5563",fontSize:11,marginBottom:14 }}>
              Appuie sur le nombre de fléchettes utilisées
            </p>
            {/* Bouton Retour — annule le finish immédiatement avec rollback complet */}
            <button
              onPointerDown={e=>{ e.preventDefault(); annulerDernierCoup(); }}
              style={{ width:"100%",padding:"12px",borderRadius:12,border:"1px solid #ef444466",background:"#1a0000",color:"#ef4444",fontWeight:700,fontSize:15,cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent" }}>
              ⬅ Retour — j'ai fait une erreur
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ background:"#111", padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #2a2a2a", flexShrink:0 }}>
        <button onClick={()=>setShowConfirmQuitter(true)}
          style={{ background:"#7f1d1d", border:"none", color:"#ef4444", cursor:"pointer", fontSize:13, fontWeight:700, padding:"6px 12px", borderRadius:8 }}>
          ⚠️ Quitter
        </button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontWeight:900, fontSize:13, color:"#f1f5f9", letterSpacing:1 }}>
            {modeDuel ? "⚔️ DUEL" : "PREMIER À"} {manchesTotal} MANCHE{manchesTotal>1?"S":""}
          </div>
          <div style={{ fontSize:11, color:"#94a3b8" }}>{modeDuel?duel?.mode:config.mode} · Double out</div>
        </div>
        <div style={{ width:70 }}/>
      </div>

      {/* Scores — joueur bulle toujours à gauche */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", flexShrink:0 }}>
        {displayOrder.map((realIdx, displayI) => {
          const j = joueurs[realIdx];
          const isActif = realIdx === actifIdx;
          return (
            <div key={displayI} style={{
              padding:"12px 12px",
              background: isActif ? "linear-gradient(135deg,#f97316,#ea580c)" : "#c2410c22",
              borderBottom: `3px solid ${isActif ? "#f97316" : "transparent"}`,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background: isActif ? "#fff" : "transparent", border: isActif ? "none" : "2px solid #f9731644", flexShrink:0 }}/>
                <span style={{ fontWeight:700, fontSize:12, color: isActif ? "#fff" : "#f97316aa", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.nom}</span>
              </div>
              <div style={{ fontSize:56, fontWeight:900, color: isActif ? "#fff" : "#f1f5f9aa", lineHeight:1, marginBottom:4 }}>{j.score}</div>
              <div style={{ display:"flex", gap:3, marginBottom:6 }}>
                {Array.from({length: manchesTotal}).map((_,mi)=>(
                  <div key={mi} style={{ width:14, height:14, borderRadius:3, background: mi < j.manchesGagnees ? (isActif?"#fff":"#f97316") : (isActif?"#ffffff33":"#2a2a2a") }}/>
                ))}
              </div>
              <div style={{ fontSize:11, color: isActif ? "#fff9" : "#94a3b855", display:"flex", gap:8, flexWrap:"wrap" }}>
                <span>Moy. <strong style={{ color: isActif?"#fff":"#94a3b8" }}>{moyenneManche(j, realIdx)}</strong></span>
                <span>Préc. <strong style={{ color: isActif?"#fff":"#94a3b8" }}>{j.scorePrecedent ?? "—"}</strong></span>
                <span>🎯 <strong style={{ color: isActif?"#fff":"#94a3b8" }}>{j.flechettes}</strong></span>
              </div>
              {modeDuel && drixData && (() => {
                const d = realIdx === 0 ? drixData.challenger : drixData.defie;
                const bAcc = bonusAccum[realIdx] || 0;
                return (
                  <div style={{ fontSize:11, marginTop:4, display:"flex", gap:6, flexWrap:"wrap" }}>
                    <span style={{ background:"#14532d", color:"#22c55e", borderRadius:6, padding:"1px 6px", fontWeight:800 }}>+{d.gain}</span>
                    <span style={{ background:"#7f1d1d", color:"#ef4444", borderRadius:6, padding:"1px 6px", fontWeight:800 }}>-{d.perte}</span>
                    {bAcc > 0 && <span style={{ background:"#3b1d6e", color:"#a78bfa", borderRadius:6, padding:"1px 6px", fontWeight:800 }}>+{bAcc}🔥</span>}
                    <span style={{ color: isActif?"#ffffff99":"#94a3b866", fontSize:10, alignSelf:"center" }}>DRIX</span>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* Message + checkout */}
      <div style={{ padding:"6px 16px", background:"#0f0f0f", flexShrink:0, textAlign:"center" }}>
        <p style={{ fontWeight:900, fontSize:13, color:"#f97316", marginBottom: checkout ? 1 : 0 }}>
          C'EST AU TOUR DE {actif.nom.toUpperCase()} !
        </p>
        {checkout && (
          <p style={{ color:"#f59e0b", fontSize:12, fontWeight:600 }}>💡 {actif.score} → {checkout}</p>
        )}
      </div>

      {/* Saisie */}
      <div style={{ padding:"6px 16px", background:"#0f0f0f", flexShrink:0 }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ flex:1, background:"#1a1a1a", borderRadius:50, padding:"11px 16px", display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:16, color:"#94a3b8" }}>⌨️</span>
            <span style={{ fontSize:20, fontWeight:700, color: input ? "#f1f5f9" : "#94a3b8", flex:1 }}>
              {input || "Score…"}
            </span>
          </div>
          <button
            onPointerDown={e=>{ e.preventDefault(); !input || envoyer(); }}
            disabled={!input}
            style={{ background: input ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#1a1a1a", border:"none", borderRadius:50, padding:"11px 18px", fontWeight:800, fontSize:16, color: input ? "#fff" : "#94a3b8", cursor: input ? "pointer" : "not-allowed", touchAction:"manipulation" }}>
            ✓
          </button>
        </div>
        {historique.length > 0 && (
          <button
            onPointerDown={e=>{ e.preventDefault(); annulerDernierCoup(); }}
            style={{ width:"100%", marginTop:5, padding:"8px", borderRadius:8, border:"1px solid #f59e0b44", background:"#78350f22", color:"#f59e0b", fontWeight:700, fontSize:12, cursor:"pointer", WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}>
            ↩️ Annuler le dernier coup
          </button>
        )}
      </div>

      {/* Clavier — prend le reste */}
      <div style={{ padding:"5px 16px 10px", background:"#0f0f0f", flex:1, display:"flex", flexDirection:"column" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:5, flex:1 }}>
          {["1","2","3","4","5","6","7","8","9"].map(n=>(
            <button key={n}
              onPointerDown={e=>{ e.preventDefault(); appuyer(n); }}
              style={{ borderRadius:10, border:"1px solid #2a2a2a", background:"#1a1a1a", color:"#f1f5f9", fontSize:22, fontWeight:700, cursor:"pointer", WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}>
              {n}
            </button>
          ))}
          <button
            onPointerDown={e=>{ e.preventDefault(); appuyer("del"); }}
            style={{ borderRadius:10, border:"1px solid #2a2a2a", background:"#1a1a1a", color:"#f59e0b", fontSize:20, cursor:"pointer", WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}>
            ⌫
          </button>
          <button
            onPointerDown={e=>{ e.preventDefault(); appuyer("0"); }}
            style={{ borderRadius:10, border:"1px solid #2a2a2a", background:"#1a1a1a", color:"#f1f5f9", fontSize:22, fontWeight:700, cursor:"pointer", WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}>
            0
          </button>
          <button
            onPointerDown={e=>{ e.preventDefault(); !input || envoyer(); }}
            disabled={!input}
            style={{ borderRadius:10, border:"none", background: input ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#1a1a2a", color: input ? "#fff" : "#94a3b8", fontSize:18, fontWeight:800, cursor: input ? "pointer" : "not-allowed", WebkitTapHighlightColor:"transparent", touchAction:"manipulation" }}>
            ✓
          </button>
        </div>
      </div>
    </div>
  );
};