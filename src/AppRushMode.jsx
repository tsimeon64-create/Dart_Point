import { useState, useEffect, useRef, useCallback } from "react";

// ── Thème ─────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0f0f0f", card:"#1a1a1a", card2:"#141414", border:"#2a2a2a",
  accent:"#f97316", muted:"#64748b", text:"#f1f5f9",
  green:"#22c55e", red:"#ef4444", yellow:"#f59e0b",
  blue:"#60a5fa", purple:"#a78bfa",
};

// ── Supabase ──────────────────────────────────────────────────────────────────
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sbJ = (path, opts={}) => fetch(`${SB_URL}/rest/v1/${path}`, {
  headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal"},
  ...opts,
}).then(r=>r.ok?(r.status===204?null:r.json()):Promise.reject(r));

// ── Checkouts ─────────────────────────────────────────────────────────────────
const CHECKOUTS = {
  170:"T20 T20 Bull",167:"T20 T19 Bull",164:"T20 T18 Bull",161:"T20 T17 Bull",
  160:"T20 T20 D20",158:"T20 T20 D19",157:"T20 T19 D20",156:"T20 T20 D18",
  155:"T20 T19 D19",154:"T20 T18 D20",153:"T20 T19 D18",152:"T20 T20 D16",
  151:"T20 T17 D20",150:"T20 T18 D18",149:"T20 T19 D16",148:"T20 T16 D20",
  147:"T20 T17 D18",146:"T20 T18 D16",145:"T20 T15 D20",144:"T20 T20 D12",
  143:"T20 T17 D16",142:"T20 T14 D20",141:"T20 T19 D12",140:"T20 T16 D16",
  139:"T19 T14 D20",138:"T20 T18 D12",137:"T19 T16 D16",136:"T20 T20 D8",
  135:"T20 T17 D12",134:"T20 T14 D16",133:"T20 T19 D8", 132:"T20 T16 D12",
  131:"T20 T13 D16",130:"T20 20 Bull",129:"T19 T16 D12",128:"T18 T14 D16",
  127:"T20 T17 D8", 126:"T19 T19 D6", 125:"25 T20 D20", 124:"T20 T16 D8",
  123:"T19 T16 D9", 122:"T18 T20 D4", 121:"T17 T10 D20",120:"T20 20 D20",
  119:"T19 T10 D16",118:"T20 18 D20", 117:"T20 17 D20", 116:"T20 16 D20",
  115:"T20 15 D20", 114:"T20 14 D20", 113:"T20 13 D20", 112:"T20 12 D20",
  111:"T20 19 D16", 110:"T20 18 D16", 109:"T19 20 D16", 108:"T20 16 D16",
  107:"T19 18 D16", 106:"T20 14 D16", 105:"T19 16 D16", 104:"T18 18 D16",
  103:"T20 3 D20",  102:"T20 10 D16", 101:"T20 1 D20",  100:"T20 D20",
  99:"T19 10 D16",  98:"T20 D19",97:"T19 D20",96:"T20 D18",95:"T19 D19",
  94:"T18 D20",93:"T19 D18",92:"T20 D16",91:"T17 D20",90:"T20 D15",
  89:"T19 D16",88:"T16 D20",87:"T17 D18",86:"T18 D16",85:"T15 D20",
  84:"T20 D12",83:"T17 D16",82:"T14 D20",81:"T19 D12",80:"T20 D10",
  79:"T13 D20",78:"T18 D12",77:"T19 D10",76:"T20 D8", 75:"T17 D12",
  74:"T14 D16",73:"T19 D8", 72:"T16 D12",71:"T13 D16",70:"T10 D20",
  69:"T15 D12",68:"T20 D4", 67:"T17 D8", 66:"T10 D18",65:"T19 D4",
  64:"T16 D8", 63:"T13 D12",62:"T10 D16",61:"T15 D8", 60:"20 D20",
  59:"19 D20",58:"18 D20",57:"17 D20",56:"16 D20",55:"15 D20",54:"14 D20",
  53:"13 D20",52:"12 D20",51:"11 D20",50:"Bull",
  49:"9 D20",48:"8 D20",47:"7 D20",46:"6 D20",45:"5 D20",44:"4 D20",
  43:"3 D20",42:"2 D20",41:"1 D20",40:"D20",
  38:"D19",36:"D18",34:"D17",32:"D16",30:"D15",28:"D14",26:"D13",
  24:"D12",22:"D11",20:"D10",18:"D9",16:"D8",14:"D7",12:"D6",10:"D5",
  8:"D4",6:"D3",4:"D2",2:"D1",
};
const CO_SCORES = Object.keys(CHECKOUTS).map(Number);

// ── Niveaux ───────────────────────────────────────────────────────────────────
const NIVEAUX = {
  safe:    { label:"Safe",    emoji:"🟢", color:"#22c55e", bg:"#0a1f0a", time:10, sub:"Tranquille — 10 secondes" },
  rush:    { label:"Rush",    emoji:"🟡", color:"#f59e0b", bg:"#1a0f00", time:7,  sub:"Rapide — 7 secondes"      },
  madness: { label:"Madness", emoji:"🔴", color:"#ef4444", bg:"#1a0000", time:5,  sub:"Extrême — 5 secondes"     },
};

// ── Utilitaires ───────────────────────────────────────────────────────────────
const randFrom = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle  = arr => [...arr].sort(() => Math.random() - 0.5);

const TRIPLES = Array.from({length:20},(_,i)=>({mult:3,num:i+1,value:3*(i+1),label:`T${i+1}`}));
const DOUBLES = Array.from({length:20},(_,i)=>({mult:2,num:i+1,value:2*(i+1),label:`D${i+1}`}));
const SINGLES = Array.from({length:20},(_,i)=>({mult:1,num:i+1,value:i+1,   label:`${i+1}`}));

const randDart = () => {
  const r = Math.random();
  if (r < 0.35) return randFrom(TRIPLES);
  if (r < 0.45) return randFrom(DOUBLES);
  if (r < 0.48) return {mult:1,num:25,value:25,label:"25"};
  if (r < 0.50) return {mult:2,num:25,value:50,label:"Bull"};
  return randFrom(SINGLES);
};

// ── Générateurs de questions ──────────────────────────────────────────────────

// 1. Score : 501 - d1 - d2 - d3 = ?
const genScoreQ = () => {
  const darts = [randDart(), randDart(), randDart()];
  const sum    = darts.reduce((s,d)=>s+d.value,0);
  const correct = 501 - sum;
  const off = () => (Math.random()>.5?1:-1)*(Math.floor(Math.random()*25)+3);
  let w1, w2;
  do { w1 = correct + off(); } while (w1===correct||w1<0||w1>501);
  do { w2 = correct + off(); } while (w2===correct||w2===w1||w2<0||w2>501);
  return { type:"score", darts, answer:correct, options:shuffle([correct,w1,w2]) };
};

// 2. Finish : quel checkout pour ce score ?
const genFinishQ = () => {
  const score   = randFrom(CO_SCORES.filter(s=>s>=40));
  const correct = CHECKOUTS[score];
  const pool    = CO_SCORES.filter(s=>s!==score && CHECKOUTS[s]!==correct);
  const w1      = CHECKOUTS[randFrom(pool)];
  const pool2   = pool.filter(s=>CHECKOUTS[s]!==w1);
  const w2      = CHECKOUTS[randFrom(pool2)];
  return { type:"finish", score, answer:correct, options:shuffle([correct,w1,w2]) };
};

// 3. Bust : cette volée bust-elle ?
// La dernière fléchette est toujours un double (comme en vrai)
const DOUBLES_BULL = [...DOUBLES, {mult:2,num:25,value:50,label:"Bull"}];
const genBustQ = () => {
  const remaining = Math.floor(Math.random()*91)+30; // 30-120
  const dart3     = randFrom(DOUBLES_BULL); // toujours un double
  const darts     = [randDart(), randDart(), dart3];
  const sum       = darts.reduce((s,d)=>s+d.value,0);
  // Avec double final : bust = dépasse le score restant
  // sum === remaining + double = checkout valide
  // sum < remaining = continue (valide)
  const isBust = sum > remaining;
  return { type:"bust", remaining, darts, answer:isBust?"BUST":"VALIDE" };
};

// 4. Route optimale : quelle est la meilleure route ?
const genOptimalQ = () => {
  const score   = randFrom(CO_SCORES.filter(s=>s>=60&&s<=170));
  const correct = CHECKOUTS[score];
  const pool    = CO_SCORES.filter(s=>s!==score && CHECKOUTS[s]!==correct);
  const w1      = CHECKOUTS[randFrom(pool)];
  const pool2   = pool.filter(s=>CHECKOUTS[s]!==w1);
  const w2      = CHECKOUTS[randFrom(pool2)];
  return { type:"optimal", score, answer:correct, options:shuffle([correct,w1,w2]) };
};

const GENS = [genScoreQ, genFinishQ, genBustQ, genOptimalQ];
const genQuestion = () => randFrom(GENS)();

// ── Stats (localStorage) ──────────────────────────────────────────────────────
const STATS_KEY = "dp_rush_v1";
const DEF_STATS = { totalSessions:0, totalCorrect:0, totalWrong:0, bestSerie:0, perfectSessions:0, badges:[] };
const loadStats  = () => { try { return {...DEF_STATS,...JSON.parse(localStorage.getItem(STATS_KEY)||"{}")}; } catch { return {...DEF_STATS}; } };
const saveStats  = s => { try { localStorage.setItem(STATS_KEY,JSON.stringify(s)); } catch {} };

const BADGES_DEF = [
  {id:"premier",  emoji:"🚀", label:"Premier Rush",     check:s=>s.totalSessions>=1},
  {id:"serie3",   emoji:"🔥", label:"En feu",           check:s=>s.bestSerie>=3},
  {id:"serie5",   emoji:"⚡", label:"Machine",          check:s=>s.bestSerie>=5},
  {id:"serie10",  emoji:"💥", label:"Légende",          check:s=>s.bestSerie>=10},
  {id:"parfait",  emoji:"🏆", label:"Sans faute",       check:s=>s.perfectSessions>=1},
  {id:"calcul",   emoji:"🧮", label:"Machine à calcul", check:s=>s.totalCorrect>=50},
];

const updateStats = (prev, session) => {
  const next = {
    ...prev,
    totalSessions:  prev.totalSessions + 1,
    totalCorrect:   prev.totalCorrect  + session.correct,
    totalWrong:     prev.totalWrong    + session.wrong,
    bestSerie:      Math.max(prev.bestSerie, session.bestSerie),
    perfectSessions: session.wrong===0 && session.correct>=5
      ? prev.perfectSessions + 1 : prev.perfectSessions,
  };
  const newBadges = BADGES_DEF.filter(b=>!prev.badges.includes(b.id)&&b.check(next)).map(b=>b.id);
  next.badges   = [...prev.badges, ...newBadges];
  next._newBadges = newBadges; // transient
  saveStats(next);
  return next;
};

// ── Composants UI ─────────────────────────────────────────────────────────────

const TimerBar = ({ timer, maxTime, color }) => {
  const pct = Math.max(0, (timer/maxTime)*100);
  const col = pct>50 ? color : pct>25 ? C.yellow : C.red;
  return (
    <div style={{height:8,background:"#111",borderRadius:4,overflow:"hidden",flexShrink:0,margin:"0 0 2px 0"}}>
      <div style={{height:"100%",width:`${pct}%`,background:col,borderRadius:4,transition:"width 0.08s linear",boxShadow:`0 0 10px ${col}77`}}/>
    </div>
  );
};

const ComboBar = ({ combo }) => {
  if (combo < 3) return (
    <div style={{textAlign:"center",height:24,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontSize:11,color:C.muted}}>Enchaîne 3 bonnes réponses pour le combo !</span>
    </div>
  );
  const cfg = combo>=10 ? {emoji:"💥",color:C.purple,glow:"#a78bfa"}
            : combo>=5  ? {emoji:"⚡",color:C.yellow,glow:"#f59e0b"}
                        : {emoji:"🔥",color:C.red,   glow:"#ef4444"};
  return (
    <div style={{textAlign:"center",height:24,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <span style={{fontWeight:900,fontSize:18,color:cfg.color,textShadow:`0 0 16px ${cfg.glow}`,letterSpacing:1}}>
        {cfg.emoji} COMBO ×{combo}
      </span>
    </div>
  );
};

// ── Question Display ──────────────────────────────────────────────────────────
const QuestionDisplay = ({ q }) => {
  const TYPE_LABEL = {
    score:   { label:"CALCUL",       color:C.blue },
    finish:  { label:"FINISH",       color:C.green },
    bust:    { label:"BUST OU VALIDE",color:C.yellow },
    optimal: { label:"ROUTE OPTIMALE",color:C.purple },
  };
  const tl = TYPE_LABEL[q.type];

  if (q.type==="score") return (
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:10,letterSpacing:2,color:tl.color,fontWeight:700,marginBottom:8}}>{tl.label}</div>
      <div style={{fontSize:28,fontWeight:900,color:C.accent,marginBottom:6}}>501</div>
      <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:4}}>
        {q.darts.map((d,i) => (
          <div key={i} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 12px",minWidth:54,textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:18,color:C.text}}>{d.label}</div>
            <div style={{fontSize:10,color:C.muted}}>{d.value}pts</div>
          </div>
        ))}
      </div>
      <div style={{fontSize:26,fontWeight:900,color:C.muted,marginTop:4}}>= <span style={{color:C.text}}>?</span></div>
    </div>
  );

  if (q.type==="finish") return (
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:10,letterSpacing:2,color:tl.color,fontWeight:700,marginBottom:8}}>{tl.label}</div>
      <div style={{fontSize:70,fontWeight:900,color:C.accent,lineHeight:1}}>{q.score}</div>
      <div style={{fontSize:12,color:C.muted,marginTop:4}}>Quelle combinaison pour finir ?</div>
    </div>
  );

  if (q.type==="bust") return (
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:10,letterSpacing:2,color:tl.color,fontWeight:700,marginBottom:8}}>{tl.label}</div>
      <div style={{fontSize:13,color:C.muted,marginBottom:4}}>Score restant</div>
      <div style={{fontSize:52,fontWeight:900,color:C.yellow,lineHeight:1,marginBottom:10}}>{q.remaining}</div>
      <div style={{display:"flex",gap:6,justifyContent:"center"}}>
        {q.darts.map((d,i)=>(
          <div key={i} style={{background:C.card2,border:`1px solid ${C.border}`,borderRadius:10,padding:"7px 11px",textAlign:"center"}}>
            <div style={{fontWeight:800,fontSize:16,color:C.text}}>{d.label}</div>
            <div style={{fontSize:9,color:C.muted}}>{d.value}pts</div>
          </div>
        ))}
      </div>
    </div>
  );

  if (q.type==="optimal") return (
    <div style={{textAlign:"center"}}>
      <div style={{fontSize:10,letterSpacing:2,color:tl.color,fontWeight:700,marginBottom:8}}>{tl.label}</div>
      <div style={{fontSize:70,fontWeight:900,color:C.purple,lineHeight:1}}>{q.score}</div>
      <div style={{fontSize:12,color:C.muted,marginTop:4}}>Quelle est la meilleure route ?</div>
    </div>
  );

  return null;
};

// ── Boutons de réponse ────────────────────────────────────────────────────────
const AnswerButtons = ({ q, onAnswer, disabled }) => {
  const btnBase = { border:"none",borderRadius:12,fontWeight:800,cursor:disabled?"default":"pointer",transition:"transform .1s",fontSize:14,padding:"14px 8px" };

  if (q.type==="bust") return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {["BUST","VALIDE"].map(opt=>(
        <button key={opt} onClick={()=>!disabled&&onAnswer(opt)}
          style={{...btnBase,background:opt==="BUST"?"#1a0000":"#0a1f0a",color:opt==="BUST"?C.red:C.green,border:`2px solid ${opt==="BUST"?C.red:C.green}`,fontSize:20,padding:"18px 8px",opacity:disabled?0.6:1}}>
          {opt==="BUST"?"💥 BUST":"✅ VALIDE"}
        </button>
      ))}
    </div>
  );

  if (q.type==="score") return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
      {q.options.map((opt,i)=>(
        <button key={i} onClick={()=>!disabled&&onAnswer(opt)}
          style={{...btnBase,background:C.card,border:`2px solid ${C.border}`,color:C.text,fontSize:22,padding:"16px 4px",opacity:disabled?0.6:1}}>
          {opt}
        </button>
      ))}
    </div>
  );

  // finish / optimal : combinaisons
  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {q.options.map((opt,i)=>(
        <button key={i} onClick={()=>!disabled&&onAnswer(opt)}
          style={{...btnBase,background:C.card,border:`2px solid ${C.border}`,color:C.text,fontSize:13,padding:"13px 12px",textAlign:"left",letterSpacing:1,opacity:disabled?0.6:1}}>
          🎯 {opt}
        </button>
      ))}
    </div>
  );
};

// ── Écran de sélection de niveau ──────────────────────────────────────────────
const SelectNiveau = ({ onSelect, onBack }) => (
  <div style={{position:"fixed",inset:0,background:C.bg,display:"flex",flexDirection:"column",zIndex:200}}>
    <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0}}>← Retour</button>
      <div style={{flex:1,fontWeight:800,fontSize:16,color:C.text}}>⚡ Rush Mode — Niveau</div>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"24px 16px",display:"flex",flexDirection:"column",gap:14}}>
      {Object.values(NIVEAUX).map(n=>(
        <div key={n.label} onClick={()=>onSelect(n.label.toLowerCase())}
          style={{background:C.card,border:`2px solid ${n.color}44`,borderRadius:20,padding:"22px 18px",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
            <div style={{fontSize:44}}>{n.emoji}</div>
            <div>
              <div style={{fontWeight:900,fontSize:22,color:n.color}}>{n.label}</div>
              <div style={{fontSize:13,color:C.muted,marginTop:2}}>{n.sub}</div>
            </div>
          </div>
          <div style={{background:n.color+"18",border:`1px solid ${n.color}33`,borderRadius:10,padding:"8px 12px"}}>
            <div style={{fontSize:12,color:n.color,fontWeight:700}}>⏱ {n.time} secondes par question</div>
          </div>
          <div style={{marginTop:12,background:n.color,borderRadius:10,padding:"11px",textAlign:"center",fontWeight:800,fontSize:14,color:"#fff"}}>
            Jouer en {n.label} →
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ── Jeu principal ─────────────────────────────────────────────────────────────
const GameRush = ({ niveauId, setPage, joueur, onEnd }) => {
  const niv = NIVEAUX[niveauId];
  const [q, setQ]           = useState(()=>genQuestion());
  const [timer, setTimer]   = useState(niv.time);
  const [combo, setCombo]   = useState(0);
  const [feedback, setFB]   = useState(null); // null | {ok:bool, msg:string}
  const [session, setSession] = useState({ correct:0, wrong:0, serie:0, bestSerie:0, temps:[] });
  const [stopped, setStopped] = useState(false);
  const startRef = useRef(Date.now());
  const lockedRef = useRef(false); // empêche double-réponse

  // Timer
  useEffect(()=>{
    if (feedback || stopped) return;
    if (timer<=0) {
      handleAnswer(null); // timeout = mauvaise réponse
      return;
    }
    const id = setTimeout(()=>setTimer(t=>t-1),1000);
    return ()=>clearTimeout(id);
  },[timer,feedback,stopped]);

  const nextQuestion = useCallback(()=>{
    lockedRef.current = false;
    setQ(genQuestion());
    setTimer(niv.time);
    setFB(null);
    startRef.current = Date.now();
  },[niv.time]);

  const handleAnswer = useCallback((choice)=>{
    if (lockedRef.current || stopped) return;
    lockedRef.current = true;
    const elapsed = (Date.now() - startRef.current) / 1000;
    const isOk = choice !== null && String(choice)===String(q.answer);

    setFB({ ok:isOk, msg: isOk
      ? (choice===null ? "" : "✅ Correct !")
      : (choice===null ? "⏱ Temps écoulé !" : `❌ Mauvais — ${q.answer}`)
    });

    setCombo(c => isOk ? c+1 : 0);
    setSession(s => {
      const ns = isOk ? s.serie+1 : 0;
      return {
        correct:   isOk ? s.correct+1 : s.correct,
        wrong:     isOk ? s.wrong     : s.wrong+1,
        serie:     ns,
        bestSerie: Math.max(s.bestSerie, ns),
        temps:     isOk ? [...s.temps, elapsed] : s.temps,
      };
    });

    setTimeout(()=>{
      if (!stopped) nextQuestion();
    }, 650);
  },[q, stopped, nextQuestion]);

  const handleStop = ()=>{
    setStopped(true);
    setFB(null);
  };

  useEffect(()=>{
    if (stopped) onEnd(session);
  },[stopped]);

  const timerColor = niv.color;

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,display:"flex",flexDirection:"column",zIndex:200,overflow:"hidden"}}>
      <style>{`@keyframes feedPop{0%{transform:scale(0.8);opacity:0}50%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}`}</style>

      {/* Header */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"7px 12px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
        <div style={{flex:1,fontWeight:900,fontSize:14,color:niv.color}}>⚡ RUSH — {niv.label.toUpperCase()}</div>
        <div style={{display:"flex",gap:10,fontSize:13,fontWeight:800}}>
          <span style={{color:C.green}}>✅ {session.correct}</span>
          <span style={{color:C.red}}>❌ {session.wrong}</span>
        </div>
        <div style={{background:`${timerColor}22`,border:`1px solid ${timerColor}44`,borderRadius:8,padding:"3px 10px",fontWeight:900,fontSize:14,color:timerColor,minWidth:32,textAlign:"center"}}>
          {timer}
        </div>
      </div>

      {/* Timer bar */}
      <div style={{padding:"4px 12px 0",flexShrink:0}}>
        <TimerBar timer={timer} maxTime={niv.time} color={niv.color}/>
      </div>

      {/* Combo */}
      <div style={{padding:"4px 12px",flexShrink:0}}>
        <ComboBar combo={combo}/>
      </div>

      {/* Zone question + feedback */}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"8px 14px",gap:10,minHeight:0,overflow:"hidden"}}>

        {/* Question card */}
        <div style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 12px",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",minHeight:0,overflow:"hidden"}}>
          <QuestionDisplay q={q}/>

          {/* Feedback overlay */}
          {feedback && (
            <div style={{
              position:"absolute",inset:0,borderRadius:16,
              background: feedback.ok ? "#22c55e22" : "#ef444422",
              border:`2px solid ${feedback.ok?C.green:C.red}`,
              display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:4,
              animation:"feedPop .2s ease-out",
            }}>
              <div style={{fontSize:38}}>{feedback.ok?"🎉":"💥"}</div>
              <div style={{fontWeight:900,fontSize:18,color:feedback.ok?C.green:C.red}}>{feedback.msg}</div>
              {!feedback.ok && q.type!=="bust" && q.type!=="score" && (
                <div style={{fontSize:12,color:C.muted,marginTop:4}}>Bonne réponse : <b style={{color:"#fff"}}>{q.answer}</b></div>
              )}
            </div>
          )}
        </div>

        {/* Réponses */}
        <div style={{flexShrink:0}}>
          <AnswerButtons q={q} onAnswer={handleAnswer} disabled={!!feedback||stopped}/>
        </div>

        {/* Arrêter */}
        <button onClick={handleStop} disabled={stopped}
          style={{flexShrink:0,background:"transparent",border:`1px solid ${C.border}`,borderRadius:10,color:C.muted,cursor:"pointer",padding:"9px",fontSize:12,fontWeight:600}}>
          ⏹ Terminer la session
        </button>
      </div>
    </div>
  );
};

// ── Résumé de session ─────────────────────────────────────────────────────────
const SummaryRush = ({ session, prevStats, newStats, onReplay, onMenu, setPage }) => {
  const total  = session.correct + session.wrong;
  const taux   = total>0 ? Math.round(session.correct/total*100) : 0;
  const avgT   = session.temps.length>0 ? (session.temps.reduce((a,b)=>a+b,0)/session.temps.length).toFixed(1) : "—";
  const newBadges = (newStats._newBadges||[]).map(id=>BADGES_DEF.find(b=>b.id===id)).filter(Boolean);

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,display:"flex",flexDirection:"column",zIndex:200,overflow:"hidden"}}>
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <div style={{flex:1,fontWeight:800,fontSize:16,color:C.text}}>⚡ Résultats de session</div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"16px 14px",display:"flex",flexDirection:"column",gap:12}}>

        {/* Score principal */}
        <div style={{background:"linear-gradient(135deg,#1a0f00,#0f0f0f)",border:`2px solid ${C.accent}`,borderRadius:20,padding:"20px",textAlign:"center"}}>
          <div style={{fontSize:11,color:C.muted,letterSpacing:2,marginBottom:8}}>SESSION TERMINÉE</div>
          <div style={{display:"flex",justifyContent:"center",gap:24,marginBottom:12}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:40,fontWeight:900,color:C.green}}>{session.correct}</div>
              <div style={{fontSize:11,color:C.muted}}>✅ Correctes</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:40,fontWeight:900,color:C.red}}>{session.wrong}</div>
              <div style={{fontSize:11,color:C.muted}}>❌ Erreurs</div>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:20}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:22,color:C.accent}}>{taux}%</div>
              <div style={{fontSize:10,color:C.muted}}>Taux réussite</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:22,color:C.yellow}}>{session.bestSerie}</div>
              <div style={{fontSize:10,color:C.muted}}>Meilleure série</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:22,color:C.blue}}>{avgT}s</div>
              <div style={{fontSize:10,color:C.muted}}>Temps moyen</div>
            </div>
          </div>
        </div>

        {/* Nouveaux badges */}
        {newBadges.length>0 && (
          <div style={{background:"#1a0a2a",border:`1px solid ${C.purple}44`,borderRadius:16,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:12,color:C.purple,marginBottom:10,letterSpacing:1}}>🏅 BADGES DÉBLOQUÉS</div>
            {newBadges.map(b=>(
              <div key={b.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{fontSize:28}}>{b.emoji}</div>
                <div>
                  <div style={{fontWeight:800,color:C.text,fontSize:14}}>{b.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats globales */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 16px"}}>
          <div style={{fontWeight:700,fontSize:12,color:C.muted,marginBottom:10,letterSpacing:1}}>📊 STATISTIQUES GLOBALES</div>
          {[
            ["Sessions jouées",    newStats.totalSessions],
            ["Total bonnes rép.",  newStats.totalCorrect],
            ["Total erreurs",      newStats.totalWrong],
            ["Meilleure série",    newStats.bestSerie],
            ["Sessions parfaites", newStats.perfectSessions],
          ].map(([label,val])=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:13,color:C.muted}}>{label}</span>
              <span style={{fontSize:14,fontWeight:800,color:C.text}}>{val}</span>
            </div>
          ))}
        </div>

        {/* Badges déjà gagnés */}
        {newStats.badges.length>0 && (
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:12,color:C.muted,marginBottom:10,letterSpacing:1}}>🏅 MES BADGES</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {newStats.badges.map(id=>{
                const b=BADGES_DEF.find(x=>x.id===id);
                return b ? <div key={id} title={b.label} style={{fontSize:26}}>{b.emoji}</div> : null;
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <button onClick={onReplay}
          style={{background:`linear-gradient(135deg,${C.accent},#ea580c)`,color:"#fff",border:"none",borderRadius:12,padding:"15px",fontWeight:900,fontSize:16,cursor:"pointer"}}>
          ⚡ Rejouer
        </button>
        <button onClick={onMenu}
          style={{background:C.card,color:C.muted,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px",fontWeight:600,fontSize:13,cursor:"pointer"}}>
          ← Menu Rush Mode
        </button>
        <button onClick={()=>setPage("jeux")}
          style={{background:"transparent",color:C.muted,border:"none",padding:"8px",fontWeight:600,fontSize:12,cursor:"pointer"}}>
          ← Mode Jeu
        </button>
      </div>
    </div>
  );
};

// ── Menu principal ────────────────────────────────────────────────────────────
const MenuRush = ({ onStart, setPage }) => {
  const stats = loadStats();
  const total = stats.totalCorrect + stats.totalWrong;
  const taux  = total>0 ? Math.round(stats.totalCorrect/total*100) : null;

  return (
    <div style={{position:"fixed",inset:0,background:C.bg,display:"flex",flexDirection:"column",zIndex:200}}>
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <button onClick={()=>setPage("jeux")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0}}>← Retour</button>
        <div style={{flex:1,fontWeight:800,fontSize:16,color:C.accent}}>⚡ Rush Mode</div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"20px 14px",display:"flex",flexDirection:"column",gap:14}}>

        {/* Hero */}
        <div style={{background:"linear-gradient(135deg,#1a0800,#0f0a1a)",border:`2px solid ${C.accent}`,borderRadius:20,padding:"24px 18px",textAlign:"center"}}>
          <div style={{fontSize:48,marginBottom:8}}>⚡</div>
          <div style={{fontWeight:900,fontSize:26,color:C.accent,marginBottom:4}}>RUSH MODE</div>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>
            Calcul mental · Finishes · Bust detection<br/>
            Enchaîne les bonnes réponses sous pression !
          </div>
        </div>

        {/* 4 types de questions */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 16px"}}>
          <div style={{fontWeight:700,fontSize:12,color:C.muted,marginBottom:10,letterSpacing:1}}>📋 4 TYPES DE QUESTIONS</div>
          {[
            {emoji:"🔢",label:"Calcul de score",     desc:"501 − 3 fléchettes = ?",          color:C.blue},
            {emoji:"🎯",label:"Checkout",             desc:"Quelle combinaison pour finir ?",   color:C.green},
            {emoji:"💥",label:"Bust ou Valide",       desc:"Cette volée bust-elle ?",           color:C.yellow},
            {emoji:"🏆",label:"Route optimale",       desc:"Quelle est la meilleure route ?",   color:C.purple},
          ].map(t=>(
            <div key={t.label} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:20}}>{t.emoji}</span>
              <div>
                <div style={{fontWeight:700,color:t.color,fontSize:13}}>{t.label}</div>
                <div style={{fontSize:11,color:C.muted}}>{t.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats perso */}
        {stats.totalSessions>0 && (
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 16px"}}>
            <div style={{fontWeight:700,fontSize:12,color:C.muted,marginBottom:10,letterSpacing:1}}>📊 MES STATS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {[
                {label:"Sessions",     val:stats.totalSessions, color:C.accent},
                {label:"Réussites",    val:stats.totalCorrect,  color:C.green},
                {label:"Taux",         val:taux!==null?`${taux}%`:"—", color:C.blue},
                {label:"Meilleure série", val:stats.bestSerie,  color:C.yellow},
              ].map(s=>(
                <div key={s.label} style={{background:C.card2,borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                  <div style={{fontWeight:900,fontSize:20,color:s.color}}>{s.val}</div>
                  <div style={{fontSize:10,color:C.muted}}>{s.label}</div>
                </div>
              ))}
            </div>
            {stats.badges.length>0&&(
              <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
                {stats.badges.map(id=>{const b=BADGES_DEF.find(x=>x.id===id);return b?<span key={id} title={b.label} style={{fontSize:22}}>{b.emoji}</span>:null;})}
              </div>
            )}
          </div>
        )}

        {/* Bouton start */}
        <button onClick={onStart}
          style={{background:`linear-gradient(135deg,${C.accent},#ea580c)`,color:"#fff",border:"none",borderRadius:14,padding:"18px",fontWeight:900,fontSize:18,cursor:"pointer",boxShadow:`0 4px 20px ${C.accent}55`}}>
          ⚡ Commencer
        </button>
      </div>
    </div>
  );
};

// ── Export principal ──────────────────────────────────────────────────────────
export const RushMode = ({ setPage, joueur }) => {
  const [screen,  setScreen]  = useState("menu");   // menu | select | game | summary
  const [niveauId, setNiveauId] = useState(null);
  const [session, setSession] = useState(null);
  const [newStats, setNewStats] = useState(null);

  const handleEnd = useCallback((sess) => {
    const prev = loadStats();
    const next = updateStats(prev, sess);
    setSession(sess);
    setNewStats(next);
    setScreen("summary");
  }, []);

  if (screen==="menu")    return <MenuRush    onStart={()=>setScreen("select")} setPage={setPage}/>;
  if (screen==="select")  return <SelectNiveau onSelect={n=>{setNiveauId(n);setScreen("game");}} onBack={()=>setScreen("menu")}/>;
  if (screen==="game")    return <GameRush    niveauId={niveauId} setPage={setPage} joueur={joueur} onEnd={handleEnd}/>;
  if (screen==="summary") return <SummaryRush session={session} newStats={newStats} onReplay={()=>setScreen("game")} onMenu={()=>setScreen("menu")} setPage={setPage}/>;
  return null;
};
