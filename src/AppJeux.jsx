import { useState, useEffect, useRef } from "react";
import { SCORER } from "./theme";
import { Search, Swords, Check } from "lucide-react";

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

const FinScreen = ({ gagnant, duel, drixData, drixBreakdown=null, modeDuel, moyenne, demarrer, quitterPartie, onRejouer=null, joueurs: joueursData=[], manchesDetail=[] }) => {
  const [show, setShow] = useState(false);
  const [drixShow, setDrixShow] = useState(false);
  const [winnerPhoto, setWinnerPhoto] = useState(null);
  const [loserPhoto, setLoserPhoto]   = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showShareToast, setShowShareToast] = useState(false);

  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setDrixShow(true), 800);
    // Fetch les photos des deux joueurs si en mode duel
    if (modeDuel && duel) {
      const wId = gagnant?.nom === duel.challenger_pseudo ? duel.challenger_id : duel.defie_id;
      const lId = gagnant?.nom === duel.challenger_pseudo ? duel.defie_id      : duel.challenger_id;
      if (wId) {
        fetch(`${SB_URL_J}/rest/v1/joueurs?id=eq.${wId}&select=photo`, {
          headers: { apikey: SB_KEY_J, Authorization: `Bearer ${SB_KEY_J}` }
        }).then(r => r.json()).then(d => { if (d?.[0]?.photo) setWinnerPhoto(d[0].photo); }).catch(() => {});
      }
      if (lId) {
        fetch(`${SB_URL_J}/rest/v1/joueurs?id=eq.${lId}&select=photo`, {
          headers: { apikey: SB_KEY_J, Authorization: `Bearer ${SB_KEY_J}` }
        }).then(r => r.json()).then(d => { if (d?.[0]?.photo) setLoserPhoto(d[0].photo); }).catch(() => {});
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

  // ── Highlights du match ────────────────────────────────────────────────────
  const bestVolee = Math.max(s0.bestVolee||0, s1.bestVolee||0);
  const bestMoy   = Math.max(s0.moy||0, s1.moy||0);
  const bestFinish = manchesDetail.reduce((m,x)=>{
    const f = x.winner_finish ? parseInt(x.winner_finish) : 0;
    return Math.max(m, f||0);
  }, 0);
  const score = `${gagnantIdx===0?j0.manchesGagnees:j1.manchesGagnees} – ${gagnantIdx===0?j1.manchesGagnees:j0.manchesGagnees}`;

  // ── Analyse IA dynamique ───────────────────────────────────────────────────
  const analyseIA = (() => {
    const winner = gagnantIdx===0 ? j0 : j1;
    const loser  = gagnantIdx===0 ? j1 : j0;
    const winMoy = gagnantIdx===0 ? s0.moy : s1.moy;
    const loseMoy = gagnantIdx===0 ? s1.moy : s0.moy;
    const winM = winner.manchesGagnees||0;
    const loseM = loser.manchesGagnees||0;
    const ecart = winM - loseM;
    if (ecart >= 3 && winMoy > 70) return { emoji:"🔥", text:`${winner.nom} a dominé de bout en bout avec une moyenne exceptionnelle.` };
    if (ecart >= 3) return { emoji:"⚡", text:`${winner.nom} n'a laissé aucune chance à ${loser.nom}.` };
    if (ecart === 1 && winM >= 3) return { emoji:"⚔️", text:`Match très serré, tout s'est joué dans la dernière manche.` };
    if (bestFinish >= 100) return { emoji:"🎯", text:`Finish de classe à ${bestFinish}. Du grand art.` };
    if (winMoy > loseMoy * 1.2) return { emoji:"💎", text:`${winner.nom} a aligné les volées de qualité.` };
    if (loseM > 0 && winM - loseM <= 1) return { emoji:"💀", text:`${loser.nom} a craqué dans les moments clés.` };
    return { emoji:"🏆", text:`Belle victoire de ${winner.nom}. Que la revanche commence.` };
  })();

  // ── Bonus chips (gagnant + perdant) ────────────────────────────────────────
  const winnerBonuses = drixBreakdown ? (gagnantIsChallenger ? drixBreakdown.challenger.bonus : drixBreakdown.defie.bonus) : null;
  const loserBonuses  = drixBreakdown ? (gagnantIsChallenger ? drixBreakdown.defie.bonus      : drixBreakdown.challenger.bonus) : null;
  const winnerTotal   = drixBreakdown ? Math.abs((gagnantIsChallenger ? drixBreakdown.challenger.totalVariation : drixBreakdown.defie.totalVariation)) : (dxGagnant?.gain || 0);
  const loserTotal    = drixBreakdown ? Math.abs((gagnantIsChallenger ? drixBreakdown.defie.totalVariation     : drixBreakdown.challenger.totalVariation)) : (dxPerdant?.perte || 0);
  const loserSign     = drixBreakdown ? ((gagnantIsChallenger ? drixBreakdown.defie.totalVariation : drixBreakdown.challenger.totalVariation) >= 0) : false;
  const hasAnyBonus = (b) => b && ((b.bonusManches||0)>0 || (b.nbGrossesVolees||0)>0 || (b.nbGrosFinish||0)>0);
  const winnerHasBonus = hasAnyBonus(winnerBonuses);
  const loserHasBonus  = hasAnyBonus(loserBonuses);

  // Partage WhatsApp — ouvre WhatsApp avec un résumé du match
  const partagerWhatsApp = () => {
    const winnerNom = gagnant?.nom || "—";
    const loserNom = perdantNom || "—";
    const scoreW = gagnantIdx === 0 ? j0.manchesGagnees : j1.manchesGagnees;
    const scoreL = gagnantIdx === 0 ? j1.manchesGagnees : j0.manchesGagnees;
    const moyW = moyenne(gagnant);
    const drixLine = modeDuel && duel?.type !== "amical" && winnerTotal > 0
      ? `\n💎 *+${winnerTotal} DRIX* pour ${winnerNom}`
      : "";
    const finishLine = bestFinish ? `\n🎯 Meilleur finish : ${bestFinish}` : "";
    const voleeLine  = bestVolee  ? `\n🔥 Plus grosse volée : ${bestVolee}` : "";
    const appUrl = (typeof window !== "undefined" && window.location?.origin) || "https://dartpoint.netlify.app";

    const text =
      `🎯 *DartPoint — Résultat du match*\n\n` +
      `🏆 *${winnerNom}* l'emporte ${scoreW}–${scoreL} face à ${loserNom}\n` +
      `📊 Moyenne : ${moyW}` +
      finishLine + voleeLine + drixLine +
      `\n\n🍻 Rejoins-moi sur DartPoint pour suivre nos duels :\n${appUrl}`;

    const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    try {
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch {
      setShowShareToast(true);
      setTimeout(()=>setShowShareToast(false), 2200);
    }
  };

  return (
    <div style={{ maxWidth:520,margin:"0 auto",padding:"12px 14px 80px",fontFamily:"Inter,sans-serif",position:"relative",zIndex:1 }}>
      <Confetti/>
      <style>{`
        @keyframes finHeroIn   { 0%{opacity:0;transform:translateY(-12px) scale(.9)} 60%{transform:translateY(2px) scale(1.04)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes finTitleGlow{ 0%,100%{text-shadow:0 0 24px #fbbf2466,0 0 48px #f9731644} 50%{text-shadow:0 0 36px #fbbf24cc,0 0 72px #f97316aa} }
        @keyframes finScoreIn  { 0%{opacity:0;transform:scale(.4)} 70%{transform:scale(1.15)} 100%{opacity:1;transform:scale(1)} }
        @keyframes finAvatarIn { 0%{opacity:0;transform:translateY(20px) scale(.8)} 100%{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes finCardIn   { 0%{opacity:0;transform:translateY(14px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes finRejouerGlow { 0%,100%{box-shadow:0 0 18px #f9731555,0 4px 20px #ea580c44} 50%{box-shadow:0 0 48px #f97316dd,0 6px 36px #ea580caa} }
        @keyframes finCheckPop { 0%{transform:scale(0) rotate(-90deg)} 60%{transform:scale(1.3) rotate(10deg)} 100%{transform:scale(1) rotate(0)} }
        @keyframes finBgPulse  { 0%,100%{opacity:.4} 50%{opacity:.7} }
        @keyframes finChipIn   { 0%{opacity:0;transform:translateX(-12px)} 100%{opacity:1;transform:translateX(0)} }
        @keyframes finSwords   { 0%,100%{transform:rotate(-8deg) scale(1)} 50%{transform:rotate(8deg) scale(1.1)} }
        @keyframes finShine    { 0%{transform:translateX(-120%) skewX(-18deg)} 60%,100%{transform:translateX(320%) skewX(-18deg)} }
        @keyframes finProgBar  { from{width:0} }
      `}</style>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 1. HERO VICTOIRE — Titre énorme avec glow                          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div style={{
        position:"relative", overflow:"hidden", borderRadius:24, padding:"24px 16px 18px",
        marginBottom:14, textAlign:"center",
        background:"radial-gradient(ellipse at center top, #14532d 0%, #052010 60%, #0a0a0a 100%)",
        border:"1px solid #22c55e44",
        boxShadow:"0 0 60px #22c55e22, inset 0 1px 0 #ffffff14",
        animation:"finHeroIn .7s cubic-bezier(.34,1.56,.64,1) both",
      }}>
        {/* Orbes lumineuses fond */}
        <div style={{ position:"absolute",top:-40,left:"30%",width:160,height:160,borderRadius:"50%",background:"radial-gradient(circle,#fbbf2433,transparent 70%)",animation:"finBgPulse 3s ease-in-out infinite",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",bottom:-40,right:"20%",width:140,height:140,borderRadius:"50%",background:"radial-gradient(circle,#22c55e33,transparent 70%)",animation:"finBgPulse 3.5s ease-in-out infinite",pointerEvents:"none" }}/>
        {/* Shine balayage */}
        <div style={{ position:"absolute",top:0,left:0,bottom:0,width:120,background:"linear-gradient(90deg,transparent,#ffffff1a,transparent)",animation:"finShine 5s ease-in-out infinite",pointerEvents:"none" }}/>

        {/* Trophée */}
        <div style={{ fontSize:54, marginBottom:6, animation:"finAvatarIn .6s .15s both", filter:"drop-shadow(0 0 16px #fbbf24cc)" }}>🏆</div>

        {/* Titre VICTOIRE */}
        <div style={{
          fontWeight:900, fontSize:42, lineHeight:1, letterSpacing:4,
          background:"linear-gradient(180deg,#fde047,#f97316)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          animation:"finTitleGlow 2.6s ease-in-out infinite",
        }}>VICTOIRE</div>

        {/* Nom gagnant */}
        <div style={{ fontWeight:800, fontSize:20, color:"#fff", marginTop:8, letterSpacing:.5 }}>{gagnant?.nom}</div>

        {/* Score central — gros */}
        <div style={{ marginTop:14, display:"flex", alignItems:"center", justifyContent:"center", gap:18, animation:"finScoreIn .8s .35s cubic-bezier(.34,1.56,.64,1) both" }}>
          <div style={{ fontSize:54, fontWeight:900, color:"#fff", lineHeight:1, fontVariantNumeric:"tabular-nums", textShadow:"0 0 24px #22c55e66" }}>
            {gagnantIdx===0 ? j0.manchesGagnees : j1.manchesGagnees}
          </div>
          <div style={{ animation:"finSwords 1.4s ease-in-out infinite", filter:"drop-shadow(0 0 8px #fbbf24cc)" }}>
            <Swords size={28} color="#fbbf24"/>
          </div>
          <div style={{ fontSize:54, fontWeight:900, color:"#475569", lineHeight:1, fontVariantNumeric:"tabular-nums" }}>
            {gagnantIdx===0 ? j1.manchesGagnees : j0.manchesGagnees}
          </div>
        </div>
        <div style={{ fontSize:10, fontWeight:700, color:"#86efac", letterSpacing:2, marginTop:6, textTransform:"uppercase" }}>Score final · {duel?.manches||3} manches gagnantes</div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 2. AVATARS PREMIUM — Gagnant vs Perdant                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, alignItems:"center", marginBottom:14, animation:"finCardIn .5s .4s both" }}>
        {/* Gagnant */}
        <div style={{ textAlign:"center", animation:"finAvatarIn .5s .5s both" }}>
          <div style={{ position:"relative", display:"inline-block", marginBottom:6 }}>
            <div style={{ width:78, height:78, borderRadius:"50%", border:"3px solid #22c55e", overflow:"hidden", boxShadow:"0 0 30px #22c55e88, inset 0 0 16px #22c55e33", background:"#0f1a0f", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {winnerPhoto
                ? <img src={winnerPhoto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                : <span style={{ fontSize:32 }}>🏆</span>}
            </div>
            <div style={{ position:"absolute", bottom:-6, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,#22c55e,#16a34a)", borderRadius:8, padding:"3px 10px", fontSize:9, fontWeight:900, color:"#0a0a0a", whiteSpace:"nowrap", letterSpacing:.6, boxShadow:"0 4px 12px #22c55e66" }}>🏆 GAGNANT</div>
          </div>
          <div style={{ marginTop:10, fontWeight:900, fontSize:14, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{gagnant?.nom}</div>
        </div>

        {/* VS */}
        <div style={{ textAlign:"center", padding:"0 4px" }}>
          <div style={{ width:38, height:38, borderRadius:"50%", background:"linear-gradient(135deg,#fbbf24,#f97316)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto", boxShadow:"0 0 20px #fbbf2488", animation:"finSwords 1.6s ease-in-out infinite" }}>
            <Swords size={16} color="#0a0a0a"/>
          </div>
          <div style={{ fontSize:9, fontWeight:900, color:"#fbbf24", letterSpacing:2, marginTop:5 }}>VS</div>
        </div>

        {/* Perdant */}
        <div style={{ textAlign:"center", animation:"finAvatarIn .5s .65s both" }}>
          <div style={{ position:"relative", display:"inline-block", marginBottom:6 }}>
            <div style={{ width:78, height:78, borderRadius:"50%", border:"3px solid #ef4444", overflow:"hidden", boxShadow:"0 0 24px #ef444466", background:"#1a0a0a", display:"flex", alignItems:"center", justifyContent:"center", opacity:.85, filter:"grayscale(.3)" }}>
              {loserPhoto
                ? <img src={loserPhoto} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                : <span style={{ fontSize:32 }}>💔</span>}
            </div>
            <div style={{ position:"absolute", bottom:-6, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,#ef4444,#b91c1c)", borderRadius:8, padding:"3px 10px", fontSize:9, fontWeight:900, color:"#fff", whiteSpace:"nowrap", letterSpacing:.6, boxShadow:"0 4px 12px #ef444466" }}>💔 PERDANT</div>
          </div>
          <div style={{ marginTop:10, fontWeight:800, fontSize:14, color:"#94a3b8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{perdantNom||"—"}</div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 3. MINI STATS CARTES PREMIUM                                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14, animation:"finCardIn .5s .55s both" }}>
        {[
          { icon:"🎯", label:"Moyenne", val:moyenne(gagnant), col:"#22c55e" },
          { icon:"⚡", label:"Fléchettes", val:gagnant?.flechettes||0, col:"#f97316" },
          { icon:"🔥", label:"Tours", val:gagnant?.tours?.length||0, col:"#a855f7" },
        ].map(s => (
          <div key={s.label} style={{ background:"linear-gradient(135deg,#0f0f1a,#0a0a14)", border:`1px solid ${s.col}33`, borderRadius:14, padding:"12px 8px", textAlign:"center", boxShadow:`0 0 18px ${s.col}11, inset 0 1px 0 #ffffff08` }}>
            <div style={{ fontSize:18, marginBottom:3, filter:`drop-shadow(0 0 6px ${s.col}66)` }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:900, color:s.col, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>{s.val}</div>
            <div style={{ fontSize:9, color:"#64748b", fontWeight:700, letterSpacing:1, marginTop:3, textTransform:"uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 4. SECTION DRIX — Cartes visuelles gagnant/perdant                */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {modeDuel && duel?.type !== "amical" && (drixData || drixBreakdown) && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14, animation:"finCardIn .5s .7s both" }}>
          {/* Gagnant */}
          <div style={{ position:"relative", overflow:"hidden", background:"linear-gradient(135deg,#14532d,#0f1a0f)", border:"1px solid #22c55e55", borderRadius:16, padding:"14px 10px 12px", textAlign:"center", boxShadow:"0 0 28px #22c55e22, inset 0 1px 0 #ffffff14" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at top, #22c55e22, transparent 70%)", pointerEvents:"none" }}/>
            <div style={{ position:"relative", fontSize:18, marginBottom:2 }}>🔥</div>
            <div style={{ position:"relative", fontSize:30, fontWeight:900, color:"#4ade80", lineHeight:1, textShadow:"0 0 12px #22c55e88" }}>
              +<AnimCount target={winnerTotal} duration={1600}/>
            </div>
            <div style={{ position:"relative", fontSize:11, color:"#86efac", fontWeight:800, marginTop:4, letterSpacing:1 }}>DRIX GAGNÉS</div>
          </div>
          {/* Perdant */}
          <div style={{ position:"relative", overflow:"hidden", background:"linear-gradient(135deg,#1a0a0a,#0f0608)", border:"1px solid #ef444444", borderRadius:16, padding:"14px 10px 12px", textAlign:"center" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at top, #ef444411, transparent 70%)", pointerEvents:"none" }}/>
            <div style={{ position:"relative", fontSize:18, marginBottom:2 }}>{loserSign?"🔥":"💔"}</div>
            <div style={{ position:"relative", fontSize:30, fontWeight:900, color:loserSign?"#4ade80":"#fca5a5", lineHeight:1 }}>
              {loserSign?"+":"−"}<AnimCount target={loserTotal} duration={1600}/>
            </div>
            <div style={{ position:"relative", fontSize:11, color:loserSign?"#86efac":"#fca5a5", fontWeight:800, marginTop:4, letterSpacing:1 }}>{loserSign?"DRIX GAGNÉS":"DRIX PERDUS"}</div>
          </div>
        </div>
      )}

      {/* Cas partie amicale — célébration premium, sans DRIX */}
      {modeDuel && duel?.type === "amical" && (
        <div style={{
          position:"relative", overflow:"hidden",
          background:"linear-gradient(135deg,#1a0f2e,#0f0a1a)",
          border:"1px solid #a855f755", borderRadius:16,
          padding:"16px 14px 14px", marginBottom:14,
          boxShadow:"0 0 28px #a855f722, inset 0 1px 0 #ffffff14",
          animation:"finCardIn .5s .7s both",
        }}>
          {/* Orbes */}
          <div style={{ position:"absolute",top:-30,left:"20%",width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,#a855f733,transparent 70%)",pointerEvents:"none" }}/>
          <div style={{ position:"absolute",bottom:-30,right:"15%",width:100,height:100,borderRadius:"50%",background:"radial-gradient(circle,#f9731622,transparent 70%)",pointerEvents:"none" }}/>
          {/* Shine */}
          <div style={{ position:"absolute",top:0,left:0,bottom:0,width:80,background:"linear-gradient(90deg,transparent,#ffffff15,transparent)",animation:"finShine 4.5s ease-in-out infinite",pointerEvents:"none" }}/>

          <div style={{ position:"relative", display:"flex", alignItems:"center", gap:14 }}>
            {/* Icône */}
            <div style={{ width:54,height:54,borderRadius:14,background:"linear-gradient(135deg,#7c3aed,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 0 22px #a855f755",fontSize:28 }}>🤝</div>
            {/* Texte */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:10,fontWeight:800,color:"#a78bfa",letterSpacing:2,textTransform:"uppercase",marginBottom:3 }}>Partie amicale</div>
              <div style={{ fontSize:16,fontWeight:900,color:"#fff",lineHeight:1.15 }}>Match enregistré · sans DRIX</div>
              <div style={{ fontSize:11,color:"#94a3b8",marginTop:3 }}>Le résultat compte dans tes stats, mais le classement n'est pas impacté</div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 5. BONUS DE PERFORMANCE — Chips pour les 2 joueurs                */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {modeDuel && (winnerHasBonus || loserHasBonus) && (() => {
        const BonusChips = ({ b, delay=0 }) => (
          <div style={{ display:"flex", flexWrap:"wrap", gap:6, justifyContent:"center" }}>
            {b.bonusManches > 0 && (
              <div style={{ background:"#1a1200", border:"1px solid #f59e0b55", borderRadius:10, padding:"6px 10px", display:"flex", alignItems:"center", gap:6, animation:`finChipIn .4s ${delay}s both` }}>
                <span style={{ fontSize:15 }}>💎</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#fbbf24", lineHeight:1 }}>+{b.bonusManches} DRIX</div>
                  <div style={{ fontSize:9, color:"#92400e", marginTop:2 }}>{b.bonusManches/7} manche(s)</div>
                </div>
              </div>
            )}
            {b.nbGrossesVolees > 0 && (
              <div style={{ background:"#1a0a00", border:"1px solid #f9731655", borderRadius:10, padding:"6px 10px", display:"flex", alignItems:"center", gap:6, animation:`finChipIn .4s ${delay+0.1}s both` }}>
                <span style={{ fontSize:15 }}>🔥</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#f97316", lineHeight:1 }}>+{b.bonusVolees} DRIX</div>
                  <div style={{ fontSize:9, color:"#9a3412", marginTop:2 }}>{b.nbGrossesVolees} grosse(s) volée(s)</div>
                </div>
              </div>
            )}
            {b.nbGrosFinish > 0 && (
              <div style={{ background:"#0a0014", border:"1px solid #a855f755", borderRadius:10, padding:"6px 10px", display:"flex", alignItems:"center", gap:6, animation:`finChipIn .4s ${delay+0.2}s both` }}>
                <span style={{ fontSize:15 }}>🏆</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:"#a78bfa", lineHeight:1 }}>+{b.bonusFinish} DRIX</div>
                  <div style={{ fontSize:9, color:"#6b21a8", marginTop:2 }}>{b.nbGrosFinish} gros finish</div>
                </div>
              </div>
            )}
          </div>
        );
        const winnerNom = gagnant?.nom;
        return (
          <div style={{ marginBottom:14, animation:"finCardIn .5s .85s both" }}>
            <div style={{ fontSize:10, fontWeight:800, color:"#64748b", letterSpacing:2, marginBottom:8, textTransform:"uppercase", textAlign:"center" }}>⭐ Bonus de performance</div>
            {/* Deux colonnes si les 2 joueurs ont des bonus, sinon 1 colonne */}
            {(winnerHasBonus && loserHasBonus) ? (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ background:"#0f1a0f", border:"1px solid #22c55e33", borderRadius:12, padding:"10px 8px" }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"#86efac", textAlign:"center", marginBottom:6 }}>🏆 {winnerNom}</div>
                  <BonusChips b={winnerBonuses} delay={0.9}/>
                </div>
                <div style={{ background:"#1a0a0a", border:"1px solid #ef444433", borderRadius:12, padding:"10px 8px" }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"#fca5a5", textAlign:"center", marginBottom:6 }}>💔 {perdantNom}</div>
                  <BonusChips b={loserBonuses} delay={1.0}/>
                </div>
              </div>
            ) : winnerHasBonus ? (
              <div style={{ background:"#0f1a0f", border:"1px solid #22c55e33", borderRadius:12, padding:"10px 8px" }}>
                <div style={{ fontSize:10, fontWeight:800, color:"#86efac", textAlign:"center", marginBottom:6 }}>🏆 {winnerNom}</div>
                <BonusChips b={winnerBonuses} delay={0.9}/>
              </div>
            ) : (
              <div style={{ background:"#1a0a0a", border:"1px solid #ef444433", borderRadius:12, padding:"10px 8px" }}>
                <div style={{ fontSize:10, fontWeight:800, color:"#fca5a5", textAlign:"center", marginBottom:6 }}>💔 {perdantNom}</div>
                <BonusChips b={loserBonuses} delay={0.9}/>
              </div>
            )}
          </div>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 6. HIGHLIGHTS DU MATCH                                            */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div style={{ background:"linear-gradient(135deg,#0a0a14,#050510)", border:"1px solid #ffffff10", borderRadius:14, padding:"12px 14px", marginBottom:14, animation:"finCardIn .5s 1s both" }}>
        <div style={{ fontSize:10, fontWeight:800, color:"#64748b", letterSpacing:2, marginBottom:10, textTransform:"uppercase", textAlign:"center" }}>📌 Highlights du match</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"#0f0f1a", borderRadius:10, padding:"8px 10px" }}>
            <span style={{ fontSize:18 }}>🏆</span>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:9, color:"#475569", letterSpacing:.5 }}>PLUS GROSSE VOLÉE</div>
              <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{bestVolee||"—"}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"#0f0f1a", borderRadius:10, padding:"8px 10px" }}>
            <span style={{ fontSize:18 }}>🎯</span>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:9, color:"#475569", letterSpacing:.5 }}>MEILLEUR FINISH</div>
              <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{bestFinish||"—"}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"#0f0f1a", borderRadius:10, padding:"8px 10px" }}>
            <span style={{ fontSize:18 }}>🔥</span>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:9, color:"#475569", letterSpacing:.5 }}>SCORE FINAL</div>
              <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{score}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:"#0f0f1a", borderRadius:10, padding:"8px 10px" }}>
            <span style={{ fontSize:18 }}>⚡</span>
            <div style={{ minWidth:0 }}>
              <div style={{ fontSize:9, color:"#475569", letterSpacing:.5 }}>MOYENNE MAX</div>
              <div style={{ fontSize:15, fontWeight:800, color:"#fff" }}>{bestMoy||"—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 7. ANALYSE IA                                                     */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div style={{ background:"linear-gradient(135deg,#0a0a14,#050510)", border:"1px solid #60a5fa33", borderRadius:14, padding:"14px 16px", marginBottom:14, display:"flex", alignItems:"flex-start", gap:12, animation:"finCardIn .5s 1.15s both" }}>
        <div style={{ fontSize:24, lineHeight:1, filter:"drop-shadow(0 0 8px #60a5fa66)" }}>{analyseIA.emoji}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:9, fontWeight:800, color:"#60a5fa", letterSpacing:2, marginBottom:3, textTransform:"uppercase" }}>Analyse du match</div>
          <div style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.45, fontStyle:"italic" }}>"{analyseIA.text}"</div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 8. MATCH VALIDÉ                                                   */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {modeDuel && (
        <div style={{ background:"#0a1a0a", border:"1px solid #22c55e44", borderRadius:14, padding:"12px 16px", marginBottom:14, display:"flex", alignItems:"center", gap:12, animation:"finCardIn .5s 1.25s both" }}>
          <div style={{ width:36, height:36, borderRadius:"50%", background:"linear-gradient(135deg,#22c55e,#16a34a)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 0 16px #22c55e88", animation:"finCheckPop .6s 1.4s both" }}>
            <Check size={20} color="#fff" strokeWidth={3}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:900, color:"#22c55e", letterSpacing:1 }}>✔ MATCH VALIDÉ</div>
            <div style={{ fontSize:11, color:"#86efac", marginTop:2 }}>L'adversaire peut contester dans les 24h</div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 9. REVANCHE / REJOUER LE MATCH — CTA principal                    */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {(onRejouer || demarrer) && (
        <button onClick={onRejouer || demarrer} style={{
          width:"100%", padding:"18px", borderRadius:18, border:"2px solid #fbbf2477",
          background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff",
          fontWeight:900, fontSize:19, cursor:"pointer", marginBottom:10,
          animation:"finRejouerGlow 2s ease-in-out infinite",
          letterSpacing:.5, position:"relative", overflow:"hidden",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          touchAction:"manipulation",
        }}>
          <div style={{ position:"absolute", top:0, left:0, bottom:0, width:80, background:"linear-gradient(90deg,transparent,#ffffff22,transparent)", animation:"finShine 3s ease-in-out infinite", pointerEvents:"none" }}/>
          <span style={{ fontSize:22, position:"relative" }}>⚔️</span>
          <span style={{ position:"relative" }}>{modeDuel ? "REJOUER LE MATCH" : "REVANCHE"}</span>
        </button>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* 10. ACTIONS SECONDAIRES                                           */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        <button onClick={()=>setShowStats(true)} style={{ padding:"11px 6px", borderRadius:12, border:"1px solid #22c55e44", fontWeight:700, fontSize:12, cursor:"pointer", background:"#0a1a0a", color:"#22c55e", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <span style={{ fontSize:16 }}>📊</span>
          <span>Stats</span>
        </button>
        <button onClick={partagerWhatsApp} style={{ padding:"11px 6px", borderRadius:12, border:"1px solid #22c55e55", fontWeight:700, fontSize:12, cursor:"pointer", background:"linear-gradient(135deg,#0a1a0a,#0f1f15)", color:"#22c55e", display:"flex", flexDirection:"column", alignItems:"center", gap:3, boxShadow:"0 0 12px #22c55e22" }}>
          <span style={{ fontSize:16 }}>💬</span>
          <span>WhatsApp</span>
        </button>
        <button onClick={quitterPartie} style={{ padding:"11px 6px", borderRadius:12, border:"1px solid #2a2a2a", fontWeight:700, fontSize:12, cursor:"pointer", background:"#1a1a1a", color:"#94a3b8", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
          <span style={{ fontSize:16 }}>🏠</span>
          <span>{modeDuel ? "Valider" : "Accueil"}</span>
        </button>
      </div>

      {/* Toast partage */}
      {showShareToast && (
        <div style={{ position:"fixed", bottom:80, left:"50%", transform:"translateX(-50%)", background:"linear-gradient(135deg,#16a34a,#22c55e)", color:"#fff", padding:"12px 20px", borderRadius:24, fontSize:13, fontWeight:700, boxShadow:"0 8px 24px #22c55e88", zIndex:9999 }}>
          ⚠️ Impossible d'ouvrir WhatsApp
        </div>
      )}

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

// ── Composant : section JOUEURS de la config (dynamique 2-6 joueurs + recherche) ─
const JoueursConfigSection = ({ config, setConfig, modeDuel }) => {
  const [openSearch, setOpenSearch] = useState(null); // index du joueur dont la recherche est ouverte
  const [searchQ, setSearchQ] = useState("");
  const [results, setResults] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const searchRef = useRef(null);

  // Fermer dropdown si clic extérieur
  useEffect(() => {
    if (openSearch === null) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setOpenSearch(null); setSearchQ(""); setResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [openSearch]);

  // Recherche Supabase joueurs
  useEffect(() => {
    if (openSearch === null || searchQ.trim().length < 2) { setResults([]); return; }
    setLoadingSearch(true);
    const q = encodeURIComponent(searchQ.trim());
    fetch(`${SB_URL}/rest/v1/joueurs?pseudo=ilike.*${q}*&select=id,pseudo,photo&limit=8`, {
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
    })
      .then(r => r.json())
      .then(data => { setResults(Array.isArray(data) ? data : []); setLoadingSearch(false); })
      .catch(() => { setResults([]); setLoadingSearch(false); });
  }, [searchQ, openSearch]);

  const setNom = (idx, val) => setConfig(c => {
    const noms = [...c.noms];
    noms[idx] = val;
    return { ...c, noms };
  });

  const addJoueur = () => {
    if (config.noms.length >= 6) return;
    setConfig(c => ({ ...c, noms: [...c.noms, `Joueur ${c.noms.length + 1}`] }));
  };

  const removeJoueur = (idx) => {
    if (config.noms.length <= 2) return;
    setConfig(c => { const noms = c.noms.filter((_, i) => i !== idx); return { ...c, noms }; });
  };

  const selectResult = (idx, pseudo) => {
    setNom(idx, pseudo);
    setOpenSearch(null); setSearchQ(""); setResults([]);
  };

  return (
    <div>
      <div style={{ marginBottom:10 }}>
        <label style={{ fontSize:13, fontWeight:600, color:"#94a3b8" }}>
          JOUEURS <span style={{ color:"#f97316", fontWeight:700 }}>{config.noms.length}</span>
        </label>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }} ref={searchRef}>
        {config.noms.map((nom, idx) => (
          <div key={idx} style={{ position:"relative" }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {/* Numéro joueur */}
              <div style={{ width:28, height:28, borderRadius:"50%", background:"#f97316", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, color:"#fff", flexShrink:0 }}>
                {idx + 1}
              </div>
              {/* Champ nom */}
              <input
                value={nom}
                onChange={e => setNom(idx, e.target.value)}
                placeholder={`Joueur ${idx + 1}`}
                style={{ flex:1, background:"#111", border:"1px solid #2a2a2a", borderRadius:10, padding:"13px 14px", color:"#f1f5f9", fontSize:16, fontWeight:600 }}
              />
              {/* Bouton recherche */}
              {!modeDuel && (
                <button
                  onClick={() => { setOpenSearch(openSearch === idx ? null : idx); setSearchQ(""); setResults([]); }}
                  style={{ background: openSearch === idx ? "linear-gradient(135deg,#f97316,#ea580c)" : "#1a1a1a", border:"1px solid #2a2a2a", borderRadius:10, padding:"13px 12px", color: openSearch === idx ? "#fff" : "#94a3b8", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Search size={18}/>
                </button>
              )}
              {/* Supprimer joueur 3+ */}
              {!modeDuel && idx >= 2 && (
                <button onClick={() => removeJoueur(idx)}
                  style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:10, padding:"13px 10px", color:"#ef4444", cursor:"pointer", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <X size={16}/>
                </button>
              )}
            </div>
            {/* Dropdown recherche */}
            {openSearch === idx && (
              <div style={{ position:"absolute", top:"calc(100% + 6px)", left:0, right:0, background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:12, zIndex:200, boxShadow:"0 8px 32px #000a", overflow:"hidden" }}>
                <div style={{ padding:"10px 12px", borderBottom:"1px solid #2a2a2a" }}>
                  <input
                    autoFocus
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Rechercher un joueur…"
                    style={{ width:"100%", background:"#111", border:"1px solid #333", borderRadius:8, padding:"10px 12px", color:"#f1f5f9", fontSize:15, fontWeight:600, boxSizing:"border-box" }}
                  />
                </div>
                {loadingSearch && (
                  <div style={{ padding:"12px 16px", color:"#94a3b8", fontSize:13, textAlign:"center" }}>Recherche…</div>
                )}
                {!loadingSearch && searchQ.length >= 2 && results.length === 0 && (
                  <div style={{ padding:"12px 16px", color:"#555", fontSize:13, textAlign:"center" }}>Aucun joueur trouvé</div>
                )}
                {!loadingSearch && searchQ.length < 2 && (
                  <div style={{ padding:"12px 16px", color:"#555", fontSize:12, textAlign:"center" }}>Tape au moins 2 lettres…</div>
                )}
                {results.map(j => (
                  <button key={j.id} onClick={() => selectResult(idx, j.pseudo)}
                    style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"transparent", border:"none", borderBottom:"1px solid #2a2a2a22", cursor:"pointer", textAlign:"left" }}
                    onMouseEnter={e => e.currentTarget.style.background="#2a2a2a"}
                    onMouseLeave={e => e.currentTarget.style.background="transparent"}>
                    {j.photo
                      ? <img src={j.photo} alt={j.pseudo} style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover", flexShrink:0 }} />
                      : <div style={{ width:32, height:32, borderRadius:"50%", background:"#f9731644", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>🎯</div>
                    }
                    <span style={{ color:"#f1f5f9", fontWeight:700, fontSize:15 }}>{j.pseudo}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {/* Bouton ajouter un joueur */}
        {!modeDuel && config.noms.length < 6 && (
          <button onClick={addJoueur}
            style={{ width:"100%", padding:"13px", borderRadius:10, border:"1px dashed #f9731655", background:"#f9731608", color:"#f97316", fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            + Ajouter un joueur
          </button>
        )}
      </div>
    </div>
  );
};

export const Scoreur = ({ duel = null, drixData = null, onDuelTermine = null, setPage = null, onResultat = null, onRejouer = null }) => {
  const modeDuel = !!duel;

  const [etape, setEtape] = useState(modeDuel ? "bulle" : "config");
  const [config, setConfig] = useState({
    mode: duel?.mode || "501",
    manches: duel?.manches || 1,
    // Libre mode : tableau dynamique (2-6 joueurs). Duel mode utilise duel.challenger_pseudo / defie_pseudo.
    noms: [duel?.challenger_pseudo || "Joueur 1", duel?.defie_pseudo || "Joueur 2"],
  });
  const [input, setInput] = useState("");
  const [joueurs, setJoueurs] = useState(null);
  const [actifIdx, setActifIdx] = useState(0);
  const [bulleStartIdx, setBulleStartIdx] = useState(0); // qui commence la manche 1
  const [mancheEnCours, setMancheEnCours] = useState(0); // 0-based
  const [gagnant, setGagnant] = useState(null);
  const [resultEnregistre, setResultEnregistre] = useState(false);
  const [showConfirmQuitter, setShowConfirmQuitter] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [historique, setHistorique] = useState([]);
  const [manchesHistory, setManchesHistory] = useState([]);
  // Valeurs cumulatives au début de la manche courante (tours/flechettes/points sont cumulatifs)
  const [mancheStart, setMancheStart] = useState({ vol:[0,0], pts:[0,0], nbtours:[0,0], flechettes:[0,0] }); // redimensionné au démarrage
  const [pendingVolee, setPendingVolee] = useState(null); // { val, type:"finish"|"zero" }
  const [drixBreakdown, setDrixBreakdown] = useState(null); // breakdown détaillé post-match
  const [liveBonusNotif, setLiveBonusNotif] = useState(null); // { label, color, points }
  const [liveBadgeNotif, setLiveBadgeNotif] = useState(null); // { emoji, nom, desc, couleur }
  const bonusAccumRef = useRef([0, 0]); // bonus cumulés en live [j0, j1]
  const [bonusAccum, setBonusAccum] = useState([0, 0]);

  // ── Live session tracking ──
  const liveIdRef = useRef(null);
  const liveVoleeNumRef = useRef([0, 0]);
  const liveMaxFinishRef = useRef([0, 0]);
  const liveBustsRef = useRef([0, 0]);

  // ── Scroll auto vers le joueur actif (déclaré ici pour respecter les Rules of Hooks) ──
  const scoresGridRef = useRef(null);
  const activeCardRef = useRef(null);
  useEffect(() => {
    if (!scoresGridRef.current || !activeCardRef.current) return;
    const grid = scoresGridRef.current;
    const card = activeCardRef.current;
    const cardLeft = card.offsetLeft;
    const cardRight = cardLeft + card.offsetWidth;
    const visibleLeft = grid.scrollLeft;
    const visibleRight = visibleLeft + grid.clientWidth;
    if (cardLeft < visibleLeft || cardRight > visibleRight) {
      grid.scrollTo({ left: cardLeft - grid.clientWidth / 2 + card.offsetWidth / 2, behavior: "smooth" });
    }
  }, [actifIdx]);

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

  const initJoueurs = () => config.noms.map((nom, i) => ({
    nom: nom || `Joueur ${i + 1}`,
    score: startVal, manchesGagnees: 0, tours: [], flechettes: 0, totalPoints: 0, scorePrecedent: null,
  }));

  const demarrerAvecBulle = (startIdx) => {
    const sv = modeDuel ? parseInt(duel?.mode || "501") : startVal;
    const noms = modeDuel
      ? [duel?.challenger_pseudo || "Joueur 1", duel?.defie_pseudo || "Joueur 2"]
      : config.noms;
    const n = noms.length;
    setJoueurs(noms.map((nom, i) => ({
      nom: nom || `Joueur ${i + 1}`,
      score: sv, manchesGagnees: 0, tours: [], flechettes: 0, totalPoints: 0, scorePrecedent: null,
    })));
    setBulleStartIdx(startIdx);
    setMancheEnCours(0);
    setActifIdx(startIdx);
    setGagnant(null);
    setInput("");
    setResultEnregistre(false);
    setHistorique([]);
    setManchesHistory([]);
    setMancheStart({ vol:Array(n).fill(0), pts:Array(n).fill(0), nbtours:Array(n).fill(0), flechettes:Array(n).fill(0) });
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

  const quitterPartie = async () => {
    setShowConfirmQuitter(false);
    if (modeDuel && duel?.id && setPage) {
      closeLiveSession();
      // Marquer le duel comme abandonné pour les deux joueurs
      try {
        await fetch(`${SB_URL}/rest/v1/duels?id=eq.${duel.id}`, {
          method: "PATCH",
          headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
          body: JSON.stringify({ statut: "abandonne" }),
        });
      } catch {}
      setPage("mon-profil");
      return;
    }
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
          duel_id:    duel.id,
          isRivalite: breakdown?.isRivalite || false,
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
          manches: manchesDetail || [],
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

  const envoyer = (overrideVal) => {
    if (!joueurs) return;
    const val = overrideVal !== undefined ? overrideVal : parseInt(input);
    // overrideVal autorise val=0 (bouton NO SCORE) sans avoir tapé "0"
    if (overrideVal === undefined && (!input || isNaN(val) || val < 0 || val > 180)) { setInput(""); return; }
    if (overrideVal !== undefined && (isNaN(val) || val < 0 || val > 180)) return;

    const joueur = joueurs[actifIdx];
    const nouveau = joueur.score - val;

    // Bust → on garde 3 fléchettes
    if (nouveau < 0 || nouveau === 1) {
      pushHistorique();
      const updated = joueurs.map((j, i) => i === actifIdx ? { ...j, scorePrecedent: val, flechettes: j.flechettes + 3 } : j);
      setJoueurs(updated); setActifIdx((actifIdx + 1) % joueurs.length); setInput("");
      pushLiveVolee(actifIdx, val, true, false, updated);
      return;
    }

    // Finish (score → 0) ou zéro pointé (NO SCORE) → popup nb fléchettes
    if (nouveau === 0 || val === 0) {
      pushHistorique();
      setPendingVolee({ val, type: nouveau === 0 ? "finish" : "zero" });
      setInput(""); return;
    }

    // Volée normale — 3 fléchettes assumées
    pushHistorique();
    const updatedN = joueurs.map((j, i) => i === actifIdx
      ? { ...j, score: nouveau, tours: [...j.tours, val], flechettes: j.flechettes + 3, totalPoints: j.totalPoints + val, scorePrecedent: val }
      : j
    );
    setJoueurs(updatedN);
    setActifIdx((actifIdx + 1) % joueurs.length); setInput("");
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
      // buildMancheDetail uniquement en mode duel (2 joueurs)
      const mancheDetail = modeDuel ? buildMancheDetail(updated, actifIdx, mancheStart, startScore) : null;
      if (newManches >= manchesTotal) {
        const allManches = mancheDetail ? [...manchesHistory, mancheDetail] : manchesHistory;
        setJoueurs(updated);
        setManchesHistory(allManches);
        const scoreC = actifIdx === 0 ? newManches : updated[0].manchesGagnees;
        const scoreD = actifIdx === 1 ? newManches : updated[1].manchesGagnees;
        const moyC = parseFloat(moyenneCalc(updated[0]));
        const moyD = parseFloat(moyenneCalc(updated[1]));
        setGagnant({ ...joueur, manchesGagnees:newManches, tours:[...joueur.tours,val], totalPoints:joueur.totalPoints+val, flechettes:joueur.flechettes+nbFlechettes });
        pushLiveVolee(actifIdx, val, false, true, updated);
        // 🎯 Badge Bull's Eye — finish 50 en 1 fléchette
        if (val === 50 && nbFlechettes === 1) {
          setLiveBadgeNotif({ emoji:"🎯", nom:"Bullseye Killer", desc:"Finish Bull en 1 fléchette !", couleur:"#22c55e" });
          setTimeout(() => setLiveBadgeNotif(null), 4000);
        }
        setEtape("fin");
        if (modeDuel || onResultat) enregistrerResultatDuel(joueur.nom, scoreC, scoreD, moyC, moyD, allManches, updated);
        return;
      }
      if (mancheDetail) setManchesHistory(h => [...h, mancheDetail]);
      setMancheStart({
        vol:      updated.map(j => Math.round(j.flechettes / 3)),
        pts:      updated.map(j => j.totalPoints),
        nbtours:  updated.map(j => j.tours.length),
        flechettes: updated.map(j => j.flechettes),
      });
      const nextManche = mancheEnCours + 1;
      const nextStart = (bulleStartIdx + nextManche) % updated.length;
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

    // type === "zero" : NO SCORE — volée à 0 point avec nb de fléchettes réel
    const updatedZ = joueurs.map((j, i) => i === actifIdx
      ? { ...j, tours: [...j.tours, 0], flechettes: j.flechettes + nbFlechettes, scorePrecedent: 0 }
      : j
    );
    setJoueurs(updatedZ); setActifIdx((actifIdx + 1) % joueurs.length);
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
        <JoueursConfigSection config={config} setConfig={setConfig} modeDuel={modeDuel} />
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
      onRejouer={onRejouer}
      joueurs={joueurs}
      manchesDetail={manchesHistory}
    />
  );

  // ── ÉCRAN JEU — position fixed, plein écran, zero scroll ─────────────────
  if (!joueurs) return null;
  // Le joueur qui a gagné la bulle est TOUJOURS affiché en premier
  const displayOrder = Array.from({ length: joueurs.length }, (_, i) => (bulleStartIdx + i) % joueurs.length);
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

      {/* ── BADGE DÉBLOQUÉ EN LIVE ── */}
      {liveBadgeNotif && (
        <div style={{ position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:10002,
          display:"flex",alignItems:"center",justifyContent:"center",
          background:"rgba(0,0,0,0.7)",pointerEvents:"none" }}>
          <div style={{ background:"linear-gradient(135deg,#0f2a1a,#1a4d2e)",
            border:`2px solid ${liveBadgeNotif.couleur}`,borderRadius:24,
            padding:"32px 40px",textAlign:"center",
            boxShadow:`0 0 60px ${liveBadgeNotif.couleur}66, 0 8px 40px rgba(0,0,0,0.6)`,
            animation:"badgePop .35s cubic-bezier(.34,1.56,.64,1)" }}>
            <div style={{ fontSize:60,marginBottom:10 }}>{liveBadgeNotif.emoji}</div>
            <div style={{ fontSize:10,color:"#86efac",fontWeight:800,letterSpacing:3,marginBottom:6 }}>BADGE DÉBLOQUÉ !</div>
            <div style={{ fontSize:22,fontWeight:900,color:liveBadgeNotif.couleur,marginBottom:6 }}>{liveBadgeNotif.nom}</div>
            <div style={{ fontSize:14,color:"#a7f3d0" }}>{liveBadgeNotif.desc}</div>
          </div>
          <style>{`@keyframes badgePop{0%{transform:scale(.4);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
        </div>
      )}

      {/* ── MESSAGE ANNULATION ── */}
      {annulMsg && (
        <div style={{ position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",zIndex:10000,background:"#14532d",border:"1px solid #22c55e55",borderRadius:12,padding:"12px 20px",color:"#22c55e",fontWeight:700,fontSize:14,boxShadow:"0 4px 20px #000a",whiteSpace:"nowrap" }}>
          {annulMsg}
        </div>
      )}

      {/* ── POPUP FLÉCHETTES — uniquement NO SCORE / FINISH ── */}
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
                    color:"#fff", touchAction:"manipulation", WebkitTapHighlightColor:"transparent",
                  }}>
                  {n}
                </button>
              ))}
            </div>
            <p style={{ color:"#4b5563",fontSize:11,marginBottom:14 }}>
              Appuie sur le nombre de fléchettes utilisées
            </p>
            <button
              onPointerDown={e=>{ e.preventDefault(); annulerDernierCoup(); }}
              style={{ width:"100%",padding:"12px",borderRadius:12,border:"1px solid #ef444466",background:"#1a0000",color:"#ef4444",fontWeight:700,fontSize:15,cursor:"pointer",touchAction:"manipulation",WebkitTapHighlightColor:"transparent" }}>
              ⬅ Retour — j'ai fait une erreur
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER COMPACT — 1 ligne                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes scActiveGlow { 0%,100%{box-shadow:0 0 0 1px #f9731666,0 0 18px #f9731633,inset 0 1px 0 #ffffff14} 50%{box-shadow:0 0 0 1px #f97316cc,0 0 36px #f9731666,inset 0 1px 0 #ffffff14} }
        @keyframes scScoreFlash { 0%{transform:scale(1)} 30%{transform:scale(1.08);text-shadow:0 0 24px #f9731699} 100%{transform:scale(1)} }
        @keyframes scShine     { 0%{transform:translateX(-120%) skewX(-18deg)} 60%,100%{transform:translateX(320%) skewX(-18deg)} }
        @keyframes scPulse     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.25)} }
      `}</style>
      <div style={{ background:"#0a0a0a", padding:"6px 12px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #1a1a1a", flexShrink:0 }}>
        <button onClick={()=>setShowConfirmQuitter(true)}
          style={{ background:"#1a0000", border:"1px solid #7f1d1d", color:"#ef4444", cursor:"pointer", fontSize:11, fontWeight:800, padding:"5px 10px", borderRadius:8, letterSpacing:.3 }}>
          ⚠ QUITTER
        </button>
        <div style={{ textAlign:"center", display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontWeight:900, fontSize:12, color:"#fbbf24", letterSpacing:1.5 }}>
            {modeDuel?duel?.mode:config.mode}
          </span>
          <span style={{ color:"#475569", fontSize:10 }}>·</span>
          <span style={{ fontWeight:700, fontSize:11, color:"#94a3b8" }}>
            BO{manchesTotal}
          </span>
          <span style={{ color:"#475569", fontSize:10 }}>·</span>
          <span style={{ fontWeight:600, fontSize:10, color:"#64748b" }}>Double out</span>
        </div>
        <button
          onPointerDown={e=>{ e.preventDefault(); setShowHistorique(true); }}
          style={{ background:"#0f0a1a", border:"1px solid #4c1d9544", color:"#a78bfa", cursor:"pointer", fontSize:11, fontWeight:800, padding:"5px 10px", borderRadius:8, letterSpacing:.3 }}>
          📊 VOLÉES
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PLAYER CARDS PREMIUM — glow joueur actif + score massif         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div ref={scoresGridRef} style={{
        display:"grid",
        gridTemplateColumns: joueurs.length === 2
          ? "1fr auto 1fr"
          : `repeat(${joueurs.length}, minmax(${joueurs.length <= 3 ? "0" : "90px"}, 1fr))`,
        flexShrink:0, padding:"10px 10px", gap:8, alignItems:"stretch",
        background:"linear-gradient(180deg,#0a0a0a,#0f0f12)",
        borderBottom:"1px solid #1a1a1a",
        overflowX: joueurs.length > 3 ? "auto" : "visible",
      }}>
        {displayOrder.map((realIdx, displayI) => {
          const j = joueurs[realIdx];
          const isActif = realIdx === actifIdx;
          const card = (
            <div key={displayI} ref={isActif ? activeCardRef : null} style={{
              position:"relative", overflow:"hidden",
              borderRadius:14, padding:"10px 8px",
              background: isActif
                ? "linear-gradient(135deg,#1a0a00,#100600)"
                : "linear-gradient(135deg,#0a0a14,#070710)",
              animation: isActif ? "scActiveGlow 2.4s ease-in-out infinite" : "none",
              border: isActif ? "1px solid transparent" : "1px solid #1a1a1a",
              transition:"all .3s",
              opacity: isActif ? 1 : .55,
              transform: isActif ? "scale(1)" : "scale(0.96)",
            }}>
              {/* Shine sur joueur actif */}
              {isActif && (
                <div style={{ position:"absolute",top:0,left:0,bottom:0,width:60,background:"linear-gradient(90deg,transparent,#f9731622,transparent)",animation:"scShine 4s ease-in-out infinite",pointerEvents:"none" }}/>
              )}

              {/* Header carte : nom + indicateur */}
              <div style={{ position:"relative", display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
                {isActif && <span style={{ width:6, height:6, borderRadius:"50%", background:"#f97316", boxShadow:"0 0 8px #f97316", animation:"scPulse 1.4s ease-in-out infinite", flexShrink:0 }}/>}
                <span style={{ fontWeight:800, fontSize:11, color: isActif ? "#fbbf24" : "#64748b", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", letterSpacing:.5, textTransform:"uppercase" }}>
                  {j.nom}
                </span>
              </div>

              {/* Score MASSIF */}
              <div key={`score-${j.score}`} style={{
                fontSize: joueurs.length <= 2 ? 64 : joueurs.length <= 4 ? 42 : 30,
                fontWeight:900, lineHeight:.95,
                color: isActif ? "#fff" : "#475569",
                textAlign:"center", margin:"2px 0",
                fontVariantNumeric:"tabular-nums",
                textShadow: isActif ? "0 0 32px #f97316aa, 0 0 8px #fbbf2466" : "none",
                animation: isActif ? "scScoreFlash .5s ease-out" : "none",
              }}>
                {j.score}
              </div>

              {/* Manches : dots compactes */}
              <div style={{ display:"flex", gap:4, justifyContent:"center", marginBottom:6 }}>
                {Array.from({length: manchesTotal}).map((_,mi)=>(
                  <div key={mi} style={{
                    width:8, height:8, borderRadius:"50%",
                    background: mi < j.manchesGagnees
                      ? (isActif?"#fbbf24":"#f97316aa")
                      : (isActif?"#ffffff15":"#1a1a1a"),
                    boxShadow: mi < j.manchesGagnees && isActif ? "0 0 8px #fbbf24" : "none",
                  }}/>
                ))}
              </div>

              {/* DRIX live compact */}
              {modeDuel && drixData && (() => {
                const d = realIdx === 0 ? drixData.challenger : drixData.defie;
                const bAcc = bonusAccum[realIdx] || 0;
                return (
                  <div style={{ display:"flex", gap:3, justifyContent:"center", flexWrap:"wrap" }}>
                    <span style={{ background:"#14532d", color:"#4ade80", borderRadius:5, padding:"1px 5px", fontWeight:800, fontSize:10, opacity: isActif?1:.7 }}>+{d.gain}</span>
                    <span style={{ background:"#7f1d1d", color:"#f87171", borderRadius:5, padding:"1px 5px", fontWeight:800, fontSize:10, opacity: isActif?1:.7 }}>−{d.perte}</span>
                    {bAcc > 0 && <span style={{ background:"#3b1d6e", color:"#c4b5fd", borderRadius:5, padding:"1px 5px", fontWeight:800, fontSize:10 }}>🔥+{bAcc}</span>}
                  </div>
                );
              })()}
            </div>
          );
          // Insère le séparateur VS au milieu pour 2 joueurs uniquement
          if (joueurs.length === 2 && displayI === 0) {
            return [card, (
              <div key="vs" style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:"0 4px" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background:"linear-gradient(135deg,#f97316,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 0 12px #f9731644" }}>
                  <Swords size={14} color="#fff"/>
                </div>
              </div>
            )];
          }
          return card;
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* STATS LIVE COMPACTES + FINISH HELPER (1 ligne)                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={{ padding:"6px 12px", background:"#0a0a0a", borderBottom:"1px solid #1a1a1a", flexShrink:0, display:"flex", alignItems:"center", gap:8, fontSize:11 }}>
        <span style={{ color:"#64748b", fontWeight:700 }}>🎯 Moy <strong style={{ color:"#94a3b8" }}>{moyenneManche(actif, actifIdx)}</strong></span>
        <span style={{ color:"#475569" }}>·</span>
        <span style={{ color:"#64748b", fontWeight:700 }}>Préc <strong style={{ color:"#94a3b8" }}>{actif.scorePrecedent ?? "—"}</strong></span>
        <span style={{ color:"#475569" }}>·</span>
        <span style={{ color:"#64748b", fontWeight:700 }}>🎯 <strong style={{ color:"#94a3b8" }}>{actif.flechettes}</strong></span>
        {checkout && (
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:5, background:"linear-gradient(90deg,#1a1200,#2a1a00)", border:"1px solid #fbbf2466", borderRadius:8, padding:"3px 9px" }}>
            <span style={{ fontSize:11, color:"#fbbf24", fontWeight:900 }}>🎯 {checkout}</span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* RACCOURCIS RAPIDES — scores fréquents                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display:"flex", gap:5, padding:"6px 10px", background:"#0a0a0a", overflowX:"auto", flexShrink:0, borderBottom:"1px solid #1a1a1a" }}>
        {[26, 45, 60, 81, 100, 121, 140, 180].map(qs => (
          <button key={qs}
            onPointerDown={e=>{ e.preventDefault(); envoyer(qs); }}
            style={{
              minWidth:50, flexShrink:0, padding:"6px 10px",
              borderRadius:10, border:"1px solid #2a2a2a",
              background:"linear-gradient(135deg,#1a1a1a,#0f0f0f)",
              color:"#fbbf24", fontWeight:800, fontSize:13, cursor:"pointer",
              touchAction:"manipulation", WebkitTapHighlightColor:"transparent",
              boxShadow:"inset 0 1px 0 #ffffff10, 0 2px 4px #00000044",
            }}>
            {qs}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* INPUT + VALIDATE BUTTON                                          */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={{ padding:"8px 12px", background:"#0a0a0a", flexShrink:0, borderBottom:"1px solid #1a1a1a" }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{
            flex:1, background:"linear-gradient(135deg,#0f0f0f,#1a1a1a)",
            border:`1px solid ${input?"#f97316aa":"#2a2a2a"}`,
            borderRadius:12, padding:"10px 16px",
            display:"flex", alignItems:"center", gap:8,
            boxShadow: input ? "inset 0 0 20px #f9731622, 0 0 0 1px #f9731644" : "inset 0 1px 3px #00000088",
            transition:"all .2s",
          }}>
            <span style={{ fontSize:14, color: input ? "#f97316" : "#475569" }}>⌨️</span>
            <span style={{ fontSize:22, fontWeight:900, color: input ? "#fff" : "#475569", flex:1, fontVariantNumeric:"tabular-nums", letterSpacing:1 }}>
              {input || "Tape un score…"}
            </span>
          </div>
          <button
            onPointerDown={e=>{ e.preventDefault(); input ? envoyer() : envoyer(0); }}
            style={{
              minWidth: input ? 96 : 92,
              background: input
                ? "linear-gradient(135deg,#22c55e,#16a34a)"
                : "linear-gradient(135deg,#9a3412,#ea580c)",
              border:"none", borderRadius:12, padding:"11px 16px",
              fontWeight:900, fontSize: input ? 14 : 11.5,
              color:"#fff", cursor:"pointer",
              touchAction:"manipulation", letterSpacing:.5, whiteSpace:"nowrap",
              boxShadow: input
                ? "0 0 20px #22c55e88, 0 4px 12px #00000066, inset 0 1px 0 #ffffff33"
                : "0 0 16px #f9731566, 0 4px 12px #00000066, inset 0 1px 0 #ffffff33",
            }}>
            {input ? "✓ VALIDER" : "NO SCORE"}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CLAVIER PREMIUM                                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div style={{ padding:"8px 10px 10px", background:"#0a0a0a", flex:1, display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:6, flex:1 }}>
          {["1","2","3","4","5","6","7","8","9"].map(n=>(
            <button key={n}
              onPointerDown={e=>{ e.preventDefault(); appuyer(n); }}
              style={{
                borderRadius:14, border:"1px solid #2a2a2a",
                background:"linear-gradient(135deg,#1f1f25,#0f0f15)",
                color:"#f1f5f9", fontSize:30, fontWeight:800, cursor:"pointer",
                WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
                boxShadow:"inset 0 1px 0 #ffffff14, inset 0 -2px 0 #00000044, 0 2px 6px #00000066",
                fontVariantNumeric:"tabular-nums",
              }}>
              {n}
            </button>
          ))}
          {/* DEL */}
          <button
            onPointerDown={e=>{ e.preventDefault(); historique.length>0 && !input ? annulerDernierCoup() : appuyer("del"); }}
            style={{
              borderRadius:14, border:"1px solid #7f1d1d44",
              background:"linear-gradient(135deg,#2a0a0a,#1a0608)",
              color:"#ef4444", fontSize:24, fontWeight:800, cursor:"pointer",
              WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
              boxShadow:"inset 0 1px 0 #ffffff10, inset 0 -2px 0 #00000044, 0 0 14px #ef444422",
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:0,
            }}>
            <span style={{ lineHeight:1 }}>⬅</span>
            <span style={{ fontSize:9, fontWeight:900, letterSpacing:1, marginTop:2 }}>RETOUR</span>
          </button>
          {/* 0 */}
          <button
            onPointerDown={e=>{ e.preventDefault(); appuyer("0"); }}
            style={{
              borderRadius:14, border:"1px solid #2a2a2a",
              background:"linear-gradient(135deg,#1f1f25,#0f0f15)",
              color:"#f1f5f9", fontSize:30, fontWeight:800, cursor:"pointer",
              WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
              boxShadow:"inset 0 1px 0 #ffffff14, inset 0 -2px 0 #00000044, 0 2px 6px #00000066",
            }}>
            0
          </button>
          {/* VALIDATE (gros bouton glow) */}
          <button
            onPointerDown={e=>{ e.preventDefault(); input ? envoyer() : envoyer(0); }}
            style={{
              borderRadius:14, border:"none",
              background: input
                ? "linear-gradient(135deg,#22c55e,#16a34a)"
                : "linear-gradient(135deg,#9a3412,#ea580c)",
              color:"#fff",
              fontSize: input ? 32 : 13,
              fontWeight: 900,
              lineHeight: 1,
              cursor:"pointer", WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
              letterSpacing: input ? 0 : .5, padding:"0 4px",
              boxShadow: input
                ? "0 0 24px #22c55eaa, inset 0 1px 0 #ffffff33, inset 0 -2px 0 #00000044"
                : "0 0 20px #f9731566, inset 0 1px 0 #ffffff33, inset 0 -2px 0 #00000044",
              display:"flex", alignItems:"center", justifyContent:"center",
              flexDirection: input ? "row" : "column",
              gap:2,
            }}>
            {input ? "✓" : <><span style={{fontSize:18}}>0</span><span style={{fontSize:9,fontWeight:900,letterSpacing:1}}>NO SCORE</span></>}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* DRAWER VOLÉES                                                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {showHistorique && (
        <div onClick={()=>setShowHistorique(false)} style={{ position:"fixed", inset:0, background:"#000c", zIndex:9997, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"100%", maxWidth:520, background:"linear-gradient(180deg,#0f0f15,#0a0a0a)", borderRadius:"20px 20px 0 0", padding:"0 0 24px", maxHeight:"75vh", overflowY:"auto", boxShadow:"0 -12px 50px #000c", border:"1px solid #2a2a3e", borderBottom:"none" }}>
            <div style={{ position:"sticky", top:0, background:"#0a0a0a", padding:"12px 18px 10px", borderBottom:"1px solid #1a1a1a", zIndex:1 }}>
              <div style={{ width:40, height:4, borderRadius:2, background:"#2a2a3e", margin:"0 auto 10px" }}/>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontWeight:900, fontSize:15, color:"#fbbf24" }}>📊 Historique des volées</div>
                <button onPointerDown={e=>{ e.preventDefault(); setShowHistorique(false); }} style={{ background:"none", border:"none", color:"#64748b", fontSize:20, cursor:"pointer" }}>✕</button>
              </div>
            </div>
            <div style={{ padding:"14px 18px" }}>
              {joueurs.map((j, ji) => (
                <div key={ji} style={{ marginBottom:16 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                    <span style={{ fontWeight:800, fontSize:13, color: ji===actifIdx ? "#fbbf24" : "#94a3b8" }}>{j.nom}</span>
                    <span style={{ fontSize:11, color:"#475569" }}>{j.tours.length} volée(s) · {j.flechettes} fléchettes</span>
                  </div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {j.tours.length === 0 ? (
                      <span style={{ fontSize:12, color:"#475569", fontStyle:"italic" }}>Aucune volée jouée</span>
                    ) : j.tours.map((v, vi) => (
                      <span key={vi} style={{
                        padding:"3px 8px", borderRadius:6, fontSize:12, fontWeight:700,
                        background: v >= 100 ? "#1a0a00" : v >= 60 ? "#1a1200" : "#0f0f15",
                        color: v >= 140 ? "#a855f7" : v >= 100 ? "#f97316" : v >= 60 ? "#fbbf24" : v === 0 ? "#64748b" : "#94a3b8",
                        border: `1px solid ${v >= 100 ? "#f9731644" : "#2a2a3e"}`,
                      }}>
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};