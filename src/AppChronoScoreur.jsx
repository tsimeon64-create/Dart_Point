import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ArrowLeft, Timer, Trophy, Zap, Target } from "lucide-react";

const C = {
  bg:"#0f0f0f", card:"#1a1a1a", card2:"#141414", border:"#2a2a2a",
  accent:"#f97316", muted:"#64748b", text:"#f1f5f9",
  green:"#22c55e", greenBg:"#052e16",
  red:"#ef4444",   redBg:"#450a0a",
  yellow:"#f59e0b", blue:"#60a5fa",
  purple:"#a78bfa",
};

const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sb = (path, opts = {}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      ...(opts.prefer ? { Prefer: opts.prefer } : {}),
    },
    ...opts,
  }).then(r => r.ok ? (r.status === 204 ? null : r.json()) : null).catch(() => null);

// ─── Pool de volées réalistes (profil "Joueur moyen" : 45% simples, 20% doubles, 35% triples)
// Average ~50-65 points → ~8-10 volées pour faire 501 → 0
const VOLEES_POOL = [
  // ─── 180s très rares (~1%)
  { score: 180, label: "T20·T20·T20", weight: 1 },

  // ─── 140-179 rares (~4%)
  { score: 160, label: "T20·T20·D20", weight: 1 },
  { score: 140, label: "T20·T20·20",  weight: 3 },

  // ─── 100-139 gros scores (~10%)
  { score: 137, label: "T20·T19·20",  weight: 3 }, // 60+57+20
  { score: 125, label: "T20·T20·5",   weight: 2 }, // 60+60+5
  { score: 121, label: "T20·T19·4",   weight: 2 }, // 60+57+4
  { score: 113, label: "T19·T18·2",   weight: 1 }, // 57+54+2
  { score: 100, label: "T20·20·20",   weight: 4 }, // 60+20+20

  // ─── 60-99 (très commun ~35%)
  { score: 99,  label: "T19·20·D11",  weight: 3 }, // 57+20+22
  { score: 97,  label: "T19·20·20",   weight: 4 }, // 57+20+20
  { score: 85,  label: "T20·20·5",    weight: 6 }, // 60+20+5
  { score: 81,  label: "T19·19·5",    weight: 5 }, // 57+19+5
  { score: 75,  label: "T20·5·10",    weight: 4 }, // 60+5+10
  { score: 73,  label: "T19·15·1",    weight: 3 }, // 57+15+1
  { score: 65,  label: "T19·5·3",     weight: 4 }, // 57+5+3
  { score: 60,  label: "20·20·20",    weight: 6 }, // 20+20+20

  // ─── Volées "humaines" : gros puis raté (~3%)
  { score: 59,  label: "T19·1·1",     weight: 2 }, // 57+1+1 T19 raté
  { score: 62,  label: "T20·1·1",     weight: 2 }, // 60+1+1
  { score: 64,  label: "T20·2·2",     weight: 2 }, // 60+2+2

  // ─── 40-58 ratés moyens (~25%)
  { score: 58,  label: "20·20·18",    weight: 4 }, // 20+20+18
  { score: 55,  label: "20·15·20",    weight: 4 }, // 20+15+20
  { score: 50,  label: "20·10·20",    weight: 4 }, // 20+10+20
  { score: 45,  label: "20·20·5",     weight: 5 }, // 20+20+5
  { score: 40,  label: "20·15·5",     weight: 4 }, // 20+15+5

  // ─── 25-39 ratés (~15%)
  { score: 39,  label: "20·15·4",     weight: 3 }, // 20+15+4
  { score: 35,  label: "20·5·10",     weight: 3 }, // 20+5+10
  { score: 32,  label: "20·5·7",      weight: 3 }, // 20+5+7
  { score: 28,  label: "20·5·3",      weight: 3 }, // 20+5+3
  { score: 26,  label: "20·5·1",      weight: 4 }, // 20+5+1

  // ─── <25 très ratés "humains" (~7%)
  { score: 22,  label: "20·1·1",      weight: 3 }, // 20+1+1
  { score: 18,  label: "5·5·8",       weight: 2 }, // 5+5+8
  { score: 14,  label: "5·1·8",       weight: 2 }, // 5+1+8
  { score: 11,  label: "5·5·1",       weight: 2 }, // 5+5+1
  { score: 7,   label: "5·1·1",       weight: 2 }, // 5+1+1
];

// ─── Table des finishes ≤ 170 (T20·T20·Bull etc.)
const CHECKOUTS = {
  170:"T20·T20·Bull", 167:"T20·T19·Bull", 164:"T20·T18·Bull", 161:"T20·T17·Bull",
  160:"T20·T20·D20", 158:"T20·T20·D19", 157:"T20·T19·D20",
  156:"T20·T20·D18", 155:"T20·T19·D19", 154:"T20·T18·D20",
  153:"T20·T19·D18", 152:"T20·T20·D16", 151:"T20·T17·D20",
  150:"T20·T18·D18", 149:"T20·T19·D16", 148:"T20·T16·D20",
  147:"T20·T17·D18", 146:"T20·T18·D16", 145:"T20·T15·D20",
  144:"T20·T20·D12", 143:"T20·T17·D16", 142:"T20·T14·D20",
  141:"T20·T19·D12", 140:"T20·T16·D16", 139:"T19·T14·D20",
  138:"T20·T18·D12", 137:"T19·T16·D16", 136:"T20·T20·D8",
  135:"T20·T17·D12", 134:"T20·T14·D16", 133:"T20·T19·D8",
  132:"T20·T16·D12", 131:"T20·T13·D16", 130:"T20·20·Bull",
  129:"T19·T16·D12", 128:"T18·T14·D16", 127:"T20·T17·D8",
  126:"T19·T19·D6", 125:"25·T20·D20", 124:"T20·T16·D8",
  123:"T19·T16·D9", 122:"T18·T20·D4", 121:"T17·T10·D20",
  120:"T20·20·D20", 119:"T19·T12·D13", 118:"T20·18·D20",
  117:"T20·17·D20", 116:"T20·16·D20", 115:"T20·15·D20",
  114:"T20·14·D20", 113:"T20·13·D20", 112:"T20·12·D20",
  111:"T20·11·D20", 110:"T20·Bull", 109:"T20·9·D20",
  108:"T20·16·D16", 107:"T19·10·D20", 106:"T20·6·D20",
  105:"T20·5·D20",  104:"T18·Bull",    103:"T19·6·D20",
  102:"T20·10·D16", 101:"T17·Bull",    100:"T20·D20",
  99:"T19·10·D16", 98:"T20·D19", 97:"T19·D20",
  96:"T20·D18", 95:"T19·D19", 94:"T18·D20",
  93:"T19·D18", 92:"T20·D16", 91:"T17·D20",
  90:"T18·D18", 89:"T19·D16", 88:"T16·D20",
  87:"T17·D18", 86:"T18·D16", 85:"T15·D20",
  84:"T20·D12", 83:"T17·D16", 82:"T14·D20",
  81:"T19·D12", 80:"T16·D16", 79:"T19·D11",
  78:"T18·D12", 77:"T19·D10", 76:"T20·D8",
  75:"T17·D12", 74:"T14·D16", 73:"T19·D8",
  72:"T16·D12", 71:"T13·D16", 70:"T18·D8",
  69:"T15·D12", 68:"T16·D10", 67:"T17·D8",
  66:"T14·D12", 65:"T11·D16", 64:"T16·D8",
  63:"T13·D12", 62:"T10·D16", 61:"T15·D8",
  60:"20·D20", 59:"19·D20",  58:"18·D20",
  57:"17·D20", 56:"16·D20",  55:"15·D20",
  54:"14·D20", 53:"13·D20",  52:"12·D20",
  51:"11·D20", 50:"Bull",     49:"9·D20",
  48:"8·D20",  47:"7·D20",   46:"6·D20",
  45:"5·D20",  44:"12·D16",  43:"3·D20",
  42:"10·D16", 41:"9·D16",   40:"D20",
  39:"7·D16",  38:"D19",     37:"5·D16",
  36:"D18",    35:"3·D16",   34:"D17",
  33:"1·D16",  32:"D16",     31:"7·D12",
  30:"D15",    29:"5·D12",   28:"D14",
  27:"3·D12",  26:"D13",     25:"1·D12",
  24:"D12",    23:"7·D8",    22:"D11",
  21:"5·D8",   20:"D10",     18:"D9",
  16:"D8",     14:"D7",      12:"D6",
  10:"D5",     8:"D4",       6:"D3",
  4:"D2",      2:"D1",
};

// ─── PRNG déterministe (Linear Congruential Generator)
const seededRandom = (seed) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

// Convertit "YYYY-MM-DD" en seed numérique
const dateToSeed = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return y * 10000 + m * 100 + d;
};

// ─── Génère une séquence de volées déterministe pour une date donnée
export const generateVolleysSequence = (dateJour, startScore = 501) => {
  const rng = seededRandom(dateToSeed(dateJour));
  const volleys = [];
  let remaining = startScore;
  let attempts = 0;
  const MAX_ATTEMPTS = 25;

  while (remaining > 0 && attempts < MAX_ATTEMPTS) {
    attempts++;

    // Si on est dans la plage finissable et qu'on a un checkout → finish
    if (remaining <= 170 && CHECKOUTS[remaining]) {
      volleys.push({ score: remaining, label: CHECKOUTS[remaining], isFinish: true });
      remaining = 0;
      break;
    }

    // Sinon on tire une volée parmi celles qui :
    // - ne dépassent pas le reste
    // - ne laissent pas 1 (bust en réel) ou un reste non finissable bas
    const safeCandidates = VOLEES_POOL.filter(v => {
      const after = remaining - v.score;
      if (after < 0) return false;       // dépasse
      if (after === 1) return false;     // laisse 1 (bust)
      if (after > 0 && after <= 170 && !CHECKOUTS[after]) return false; // laisse un truc impossible
      return true;
    });

    if (safeCandidates.length === 0) {
      // Fallback : on prend n'importe quelle volée qui ne dépasse pas
      const fallback = VOLEES_POOL.filter(v => v.score <= remaining && remaining - v.score !== 1);
      if (fallback.length === 0) break;
      const totalW = fallback.reduce((s, v) => s + v.weight, 0);
      let r = rng() * totalW;
      let picked = fallback[0];
      for (const v of fallback) { r -= v.weight; if (r <= 0) { picked = v; break; } }
      volleys.push({ score: picked.score, label: picked.label, isFinish: false });
      remaining -= picked.score;
      continue;
    }

    const totalWeight = safeCandidates.reduce((s, v) => s + v.weight, 0);
    let r = rng() * totalWeight;
    let picked = safeCandidates[0];
    for (const v of safeCandidates) { r -= v.weight; if (r <= 0) { picked = v; break; } }
    volleys.push({ score: picked.score, label: picked.label, isFinish: false });
    remaining -= picked.score;
  }

  return volleys;
};

// ─── Helpers
const formatChrono = (ms) => {
  if (ms == null || isNaN(ms)) return "—";
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = totalSec - m * 60;
  if (m > 0) return `${m}m${s.toFixed(1).padStart(4, "0")}s`;
  return `${s.toFixed(1)}s`;
};

const todayLocal = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const yesterdayLocal = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL : ChronoScoreur
// ═══════════════════════════════════════════════════════════════════════════
export const ChronoScoreur = ({ joueur, setPage }) => {
  const [screen, setScreen] = useState("intro"); // intro | game | results | leaderboard
  const [alreadyPlayed, setAlreadyPlayed] = useState(null);
  const [checking, setChecking] = useState(true);

  const [scores, setScores] = useState([]);
  const [loadingScores, setLoadingScores] = useState(false);

  // État du run
  const [currentIdx, setCurrentIdx] = useState(0);  // index volée en cours
  const [remaining, setRemaining] = useState(501);
  const [errors, setErrors] = useState(0);
  const [input, setInput] = useState("");
  const [flashError, setFlashError] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finalResults, setFinalResults] = useState(null);

  const startTimeRef = useRef(null);
  const penaltyMsRef = useRef(0);
  const rafRef = useRef(null);
  const runIdRef = useRef(null);
  const today = todayLocal();

  // Séquence de volées du jour (même pour tous les joueurs)
  const volees = useMemo(() => generateVolleysSequence(today), [today]);

  // ─── Au montage : check si déjà joué + charge le classement
  useEffect(() => {
    if (!joueur?.id) { setChecking(false); return; }
    sb(`chrono_scoreur_scores?joueur_id=eq.${joueur.id}&date_jour=eq.${today}&select=id,statut`)
      .then(r => {
        setAlreadyPlayed(!!(r && r[0]));
        setChecking(false);
      });
  }, [joueur?.id, today]);

  const loadScores = useCallback(() => {
    setLoadingScores(true);
    sb(`chrono_scoreur_scores?date_jour=eq.${today}&statut=eq.termine&order=temps_ms.asc&limit=50&select=*`)
      .then(r => {
        setScores(r || []);
        setLoadingScores(false);
      });
  }, [today]);

  // ─── Chronomètre live (RAF)
  useEffect(() => {
    if (screen !== "game") return;
    const tick = () => {
      const now = performance.now();
      setElapsed(now - startTimeRef.current + penaltyMsRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [screen]);

  // ─── Commencer le run
  const commencer = async () => {
    if (!joueur?.id || alreadyPlayed) return;
    // Crée le run (statut abandonne par défaut, sera passé à termine si terminé)
    const created = await sb("chrono_scoreur_scores", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        joueur_id: joueur.id,
        joueur_pseudo: joueur.pseudo,
        date_jour: today,
        statut: "abandonne",
        score_initial: 501,
        nb_volees: 0,
        erreurs: 0,
        volees: [],
        temps_ms: 0,
        rewarded: false,
      }),
    });
    if (created?.[0]?.id) runIdRef.current = created[0].id;

    startTimeRef.current = performance.now();
    penaltyMsRef.current = 0;
    setCurrentIdx(0);
    setRemaining(501);
    setErrors(0);
    setInput("");
    setElapsed(0);
    setScreen("game");
  };

  // ─── Validation d'une volée
  const valider = () => {
    if (!volees || volees.length === 0) return;
    const v = volees[currentIdx];
    if (!v) return;
    const expected = remaining - v.score;
    const entered = parseInt(input);
    if (isNaN(entered)) return;

    if (entered === expected) {
      // ✅ Bonne réponse
      const newRemaining = expected;
      const newIdx = currentIdx + 1;
      setRemaining(newRemaining);
      setInput("");

      if (newRemaining === 0 || newIdx >= volees.length) {
        // 🏁 Fin du run
        terminerRun(newIdx, errors);
      } else {
        setCurrentIdx(newIdx);
      }
    } else {
      // ❌ Erreur → +3s pénalité, flash rouge, vibration
      penaltyMsRef.current += 3000;
      setErrors(e => e + 1);
      setFlashError(true);
      if (navigator.vibrate) navigator.vibrate(80);
      setTimeout(() => setFlashError(false), 350);
      setInput("");
    }
  };

  // ─── Finaliser le run
  const terminerRun = async (nbVolees, nbErrors) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const finalMs = Math.round(performance.now() - startTimeRef.current + penaltyMsRef.current);
    setElapsed(finalMs);

    const payload = {
      statut: "termine",
      temps_ms: finalMs,
      nb_volees: nbVolees,
      erreurs: nbErrors,
      volees: volees.slice(0, nbVolees).map(v => v.score),
    };
    if (runIdRef.current) {
      await sb(`chrono_scoreur_scores?id=eq.${runIdRef.current}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(payload),
      });
    }
    setFinalResults({ tempsMs: finalMs, nbVolees, errors: nbErrors });
    setAlreadyPlayed(true);
    setScreen("results");
  };

  const abandonner = async () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const finalMs = Math.round(performance.now() - startTimeRef.current + penaltyMsRef.current);
    if (runIdRef.current) {
      await sb(`chrono_scoreur_scores?id=eq.${runIdRef.current}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ statut: "abandonne", temps_ms: finalMs, nb_volees: currentIdx, erreurs: errors }),
      });
    }
    setAlreadyPlayed(true);
    setPage("jeux-sans");
  };

  const openLeaderboard = () => {
    setScreen("leaderboard");
    loadScores();
  };

  // ═══════════════════════════════════════════════════════════════════════
  // ÉCRAN : INTRO
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === "intro") {
    return (
      <div style={{ position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        {/* Header */}
        <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
          <button onClick={()=>setPage("jeux-sans")} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}><ArrowLeft size={16}/> Retour</button>
          <div style={{ flex:1,fontWeight:800,fontSize:16,color:C.blue,display:"flex",alignItems:"center",gap:8 }}><Zap size={16} color={C.blue}/> Chrono Scoreur</div>
          <div style={{ fontSize:11,color:C.muted }}>{today}</div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 40px",display:"flex",flexDirection:"column",gap:12 }}>
          {/* Description */}
          <div style={{ background:"linear-gradient(135deg,#0a1428,#0f1f32)",border:`2px solid ${C.blue}`,borderRadius:20,padding:"24px 16px",textAlign:"center" }}>
            <div style={{ fontSize:52,marginBottom:6 }}>⏱</div>
            <div style={{ fontWeight:900,fontSize:22,color:C.blue,marginBottom:6 }}>Défi du jour</div>
            <div style={{ fontSize:13,color:"#94a3b8",lineHeight:1.6 }}>
              Pars de <b style={{ color:C.text }}>501</b> et descends à <b style={{ color:C.text }}>0</b>.<br/>
              À chaque volée, calcule mentalement le <b style={{ color:C.blue }}>score restant</b>.
            </div>
            <div style={{ marginTop:10,fontSize:12,color:"#64748b",lineHeight:1.7 }}>
              💎 <b style={{ color:C.blue }}>+5 DRIX</b> participation · 🏆 <b style={{ color:C.yellow }}>+20 DRIX</b> vainqueur du jour
            </div>
            <div style={{ marginTop:10,fontSize:11,color:C.yellow,lineHeight:1.5,padding:"6px 10px",background:"#78350f22",borderRadius:8,border:`1px solid ${C.yellow}33` }}>
              ⚠ <b>1 seule tentative par jour</b> · Même série pour tous les joueurs · ❌ erreur = +3s
            </div>
          </div>

          {/* Bouton commencer */}
          {alreadyPlayed === true ? (
            <div style={{ background:"linear-gradient(135deg,#1a0a14,#0f0a18)",border:`2px solid ${C.red}66`,borderRadius:16,padding:"14px 16px",textAlign:"center" }}>
              <div style={{ fontSize:28,marginBottom:4 }}>🔒</div>
              <div style={{ fontWeight:900,fontSize:14,color:C.red,marginBottom:3 }}>Tu as déjà joué aujourd'hui</div>
              <div style={{ fontSize:12,color:C.muted }}>Reviens demain pour une nouvelle tentative !</div>
            </div>
          ) : null}

          <div style={{ display:"flex",gap:10 }}>
            <button onClick={commencer}
              disabled={alreadyPlayed || checking}
              style={{
                flex:1,
                background: (alreadyPlayed||checking) ? "#1a1a1a" : `linear-gradient(135deg,${C.blue},#3b82f6)`,
                color: (alreadyPlayed||checking) ? C.muted : "#fff",
                border: (alreadyPlayed||checking) ? `1px solid ${C.border}` : "none",
                borderRadius:12, padding:"14px",
                fontWeight:900, fontSize:16,
                cursor: (alreadyPlayed||checking) ? "not-allowed" : "pointer",
                touchAction:"manipulation",
                boxShadow: (alreadyPlayed||checking) ? "none" : `0 4px 20px ${C.blue}55`,
                opacity: (alreadyPlayed||checking) ? .6 : 1,
              }}>
              {checking ? "Vérification…" : alreadyPlayed ? "🔒 Bloqué jusqu'à demain" : "⚡ Commencer"}
            </button>
            <button onClick={openLeaderboard}
              style={{
                background:"#1a1200", color:C.yellow, border:`1px solid ${C.yellow}55`,
                borderRadius:12, padding:"14px 18px",
                fontWeight:800, fontSize:14, cursor:"pointer",
                touchAction:"manipulation",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                whiteSpace:"nowrap",
              }}>
              <Trophy size={16} color={C.yellow}/> Classement
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ÉCRAN : JEU
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === "game") {
    const currentVolee = volees[currentIdx];
    const remainingAfter = currentVolee ? remaining - currentVolee.score : 0;

    return (
      <div style={{ position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden",
        transition: flashError ? "background .15s" : "background .3s",
        background: flashError ? C.redBg : C.bg,
      }}>
        {/* Header chrono */}
        <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
          <button onClick={abandonner} style={{ background:"#1a0000",border:`1px solid ${C.red}55`,color:C.red,cursor:"pointer",fontSize:11,fontWeight:800,padding:"5px 10px",borderRadius:8 }}>⚠ ABANDONNER</button>
          <div style={{ flex:1,textAlign:"center",fontWeight:900,fontSize:24,color:C.blue,fontVariantNumeric:"tabular-nums",textShadow:`0 0 18px ${C.blue}66` }}>
            ⏱ {formatChrono(elapsed)}
          </div>
          <div style={{ fontSize:11,color:errors>0?C.red:C.muted,fontWeight:700,minWidth:50,textAlign:"right" }}>
            {errors > 0 ? `❌ ${errors}` : "✓ 0"}
          </div>
        </div>

        <div style={{ flex:1,display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"16px 14px 12px",overflow:"hidden" }}>
          {/* Volée en cours */}
          <div>
            <div style={{ textAlign:"center",fontSize:10,color:C.muted,letterSpacing:2,marginBottom:6 }}>
              VOLÉE {currentIdx + 1} / {volees.length}
            </div>
            <div style={{
              position:"relative", overflow:"hidden",
              background:"linear-gradient(135deg,#0a1428 0%,#10182e 50%,#0a1428 100%)",
              border:`2px solid ${C.blue}`,
              borderRadius:18, padding:"24px 16px",
              textAlign:"center",
              boxShadow:`inset 0 0 40px ${C.blue}25, 0 0 24px ${C.blue}33`,
            }}>
              <div style={{ fontSize:10,fontWeight:900,color:C.blue,letterSpacing:3,marginBottom:8,textTransform:"uppercase" }}>🎯 Volée</div>
              <div style={{
                fontSize:34, fontWeight:900, lineHeight:1.1,
                background:`linear-gradient(135deg,${C.blue},#a78bfa)`,
                WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                fontVariantNumeric:"tabular-nums", letterSpacing:1,
                marginBottom:4,
              }}>
                {currentVolee?.label || "—"}
              </div>
            </div>
          </div>

          {/* Score actuel */}
          <div style={{ margin:"14px 0",textAlign:"center" }}>
            <div style={{ fontSize:10,color:C.muted,letterSpacing:2,marginBottom:4 }}>SCORE AVANT VOLÉE</div>
            <div style={{ fontSize:54,fontWeight:900,color:C.text,lineHeight:1,fontVariantNumeric:"tabular-nums",textShadow:`0 0 18px ${C.accent}33` }}>
              {remaining}
            </div>
          </div>

          {/* Saisie : score restant */}
          <div>
            <div style={{ textAlign:"center",fontSize:11,color:C.muted,marginBottom:8 }}>SCORE RESTANT APRÈS CETTE VOLÉE ?</div>
            <div style={{ display:"flex",gap:8,alignItems:"center" }}>
              <div style={{
                flex:1, background:"linear-gradient(135deg,#0f0f0f,#1a1a1a)",
                border:`2px solid ${input?C.blue:"#2a2a2a"}`,
                borderRadius:14, padding:"14px 18px",
                display:"flex", alignItems:"center", gap:8,
                boxShadow: input ? `inset 0 0 20px ${C.blue}22, 0 0 0 1px ${C.blue}44` : "inset 0 1px 3px #00000088",
                transition:"all .2s",
              }}>
                <span style={{ fontSize:24,fontWeight:900,color:input?"#fff":"#475569",fontVariantNumeric:"tabular-nums",flex:1,textAlign:"center" }}>
                  {input || "?"}
                </span>
              </div>
              <button onClick={valider} disabled={!input}
                style={{
                  background: input ? `linear-gradient(135deg,${C.green},#16a34a)` : "#1a1a1a",
                  border:"none", borderRadius:14, padding:"14px 18px",
                  fontWeight:900, fontSize:14, color: input?"#fff":C.muted,
                  cursor: input?"pointer":"not-allowed",
                  touchAction:"manipulation",
                  boxShadow: input ? `0 0 20px ${C.green}66` : "none",
                  minWidth:90,
                }}>
                ✓ VALIDER
              </button>
            </div>

            {/* Clavier numérique */}
            <div style={{ marginTop:10,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6 }}>
              {["1","2","3","4","5","6","7","8","9"].map(n => (
                <button key={n}
                  onPointerDown={e=>{ e.preventDefault(); if(input.length<3) setInput(input+n); }}
                  style={{
                    borderRadius:12,border:"1px solid #2a2a2a",
                    background:"linear-gradient(135deg,#1f1f25,#0f0f15)",
                    color:C.text,fontSize:24,fontWeight:800,cursor:"pointer",
                    WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
                    boxShadow:"inset 0 1px 0 #ffffff14,inset 0 -2px 0 #00000044,0 2px 6px #00000066",
                    padding:"12px 0",
                  }}>
                  {n}
                </button>
              ))}
              <button onPointerDown={e=>{ e.preventDefault(); setInput(p=>p.slice(0,-1)); }}
                style={{
                  borderRadius:12,border:`1px solid ${C.red}44`,
                  background:"linear-gradient(135deg,#2a0a0a,#1a0608)",
                  color:C.red,fontSize:20,fontWeight:800,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
                  padding:"12px 0",
                }}>
                ⌫
              </button>
              <button onPointerDown={e=>{ e.preventDefault(); if(input.length<3) setInput(input+"0"); }}
                style={{
                  borderRadius:12,border:"1px solid #2a2a2a",
                  background:"linear-gradient(135deg,#1f1f25,#0f0f15)",
                  color:C.text,fontSize:24,fontWeight:800,cursor:"pointer",
                  WebkitTapHighlightColor:"transparent",touchAction:"manipulation",
                  padding:"12px 0",
                }}>
                0
              </button>
              <button onPointerDown={e=>{ e.preventDefault(); valider(); }} disabled={!input}
                style={{
                  borderRadius:12,border:"none",
                  background: input ? `linear-gradient(135deg,${C.green},#16a34a)` : "#1a1a2a",
                  color: input?"#fff":C.muted, fontSize:24, fontWeight:900,
                  cursor: input?"pointer":"not-allowed",
                  touchAction:"manipulation",
                  boxShadow: input ? `0 0 16px ${C.green}66` : "none",
                  padding:"12px 0",
                }}>
                ✓
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ÉCRAN : CLASSEMENT
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === "leaderboard") {
    const myPos = scores.findIndex(s => s.joueur_id === joueur?.id);
    return (
      <div style={{ position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
          <button onClick={()=>setScreen(finalResults ? "results" : "intro")} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}><ArrowLeft size={16}/> Retour</button>
          <div style={{ flex:1,fontWeight:800,fontSize:16,color:C.blue,display:"flex",alignItems:"center",gap:8 }}><Trophy size={16} color={C.yellow}/> Classement du jour</div>
          <div style={{ fontSize:12,color:C.muted }}>{today}</div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 40px" }}>
          <div style={{ background:`${C.blue}15`,border:`1px solid ${C.blue}44`,borderRadius:14,padding:"12px 16px",marginBottom:14,textAlign:"center" }}>
            <div style={{ fontSize:11,color:C.muted,letterSpacing:1,marginBottom:4 }}>CLASSEMENT DU CHRONO SCOREUR</div>
            <div style={{ fontSize:11,color:C.muted }}>🥇 Le vainqueur reçoit <b style={{ color:C.yellow }}>+20 DRIX</b> · 💎 <b style={{ color:C.blue }}>+5 DRIX</b> participation · publication à 00:01</div>
          </div>

          {loadingScores ? (
            <div style={{ textAlign:"center",padding:40,color:C.muted }}>Chargement...</div>
          ) : scores.length === 0 ? (
            <div style={{ textAlign:"center",padding:40,color:C.muted }}>Aucun score pour aujourd'hui encore.</div>
          ) : (
            <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden" }}>
              {scores.map((s, i) => {
                const isMe = s.joueur_id === joueur?.id;
                const medals = ["🥇","🥈","🥉"];
                return (
                  <div key={i} style={{
                    display:"flex",alignItems:"center",padding:"11px 14px",gap:10,
                    borderBottom:i<scores.length-1?`1px solid ${C.border}22`:"none",
                    background:isMe?`${C.blue}18`:"transparent",
                  }}>
                    <div style={{ width:28,textAlign:"center",fontWeight:900,fontSize:i<3?18:13,color:i<3?C.yellow:C.muted,flexShrink:0 }}>
                      {i < 3 ? medals[i] : i+1}
                    </div>
                    <div style={{ flex:1,fontWeight:isMe?800:600,fontSize:14,color:isMe?C.blue:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                      {s.joueur_pseudo}{isMe?" (toi)":""}
                    </div>
                    {s.erreurs > 0 && <div style={{ fontSize:11,color:C.red }}>{s.erreurs} err.</div>}
                    <div style={{ fontWeight:900,fontSize:15,color:i===0?C.yellow:isMe?C.blue:C.text,fontVariantNumeric:"tabular-nums",flexShrink:0 }}>
                      {formatChrono(s.temps_ms)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ÉCRAN : RÉSULTATS
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === "results" && finalResults) {
    const { tempsMs, nbVolees, errors: errs } = finalResults;
    return (
      <div style={{ position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
          <button onClick={()=>setPage("jeux-sans")} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}><ArrowLeft size={16}/> Quitter</button>
          <div style={{ flex:1,fontWeight:800,fontSize:16,color:C.blue,display:"flex",alignItems:"center",gap:8 }}><Zap size={16} color={C.blue}/> Run terminé</div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 40px",display:"flex",flexDirection:"column",gap:12 }}>
          {/* Hero temps */}
          <div style={{ background:"linear-gradient(135deg,#0a1428,#0f1f32)",border:`2px solid ${C.blue}`,borderRadius:20,padding:"24px 16px",textAlign:"center",boxShadow:`0 0 40px ${C.blue}33` }}>
            <div style={{ fontSize:48,marginBottom:6 }}>🏆</div>
            <div style={{ fontSize:10,letterSpacing:3,color:C.blue,fontWeight:900,marginBottom:6,textTransform:"uppercase" }}>Temps final</div>
            <div style={{ fontSize:46,fontWeight:900,color:C.blue,lineHeight:1,fontVariantNumeric:"tabular-nums",textShadow:`0 0 24px ${C.blue}88` }}>
              ⏱ {formatChrono(tempsMs)}
            </div>
            {errs > 0 && <div style={{ marginTop:8,fontSize:11,color:C.red }}>(pénalités +{errs*3}s pour {errs} erreur{errs>1?"s":""})</div>}
          </div>

          {/* Stats */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px",textAlign:"center" }}>
              <div style={{ fontSize:11,color:C.muted,marginBottom:3 }}>🎯 Volées</div>
              <div style={{ fontSize:24,fontWeight:900,color:C.text }}>{nbVolees}</div>
            </div>
            <div style={{ background:C.card,border:`1px solid ${errs===0?C.green:C.red}33`,borderRadius:14,padding:"12px",textAlign:"center" }}>
              <div style={{ fontSize:11,color:C.muted,marginBottom:3 }}>{errs===0?"✅":"❌"} Erreurs</div>
              <div style={{ fontSize:24,fontWeight:900,color:errs===0?C.green:C.red }}>{errs}</div>
            </div>
          </div>

          {/* Boutons */}
          <button onClick={openLeaderboard} style={{ background:`linear-gradient(135deg,${C.yellow},#d97706)`,border:"none",borderRadius:14,padding:"14px",color:"#3b1f00",fontWeight:900,fontSize:15,cursor:"pointer",boxShadow:`0 4px 20px ${C.yellow}55`,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            <Trophy size={16}/> Voir le classement
          </button>
          <button onClick={()=>setPage("jeux-sans")} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px",color:C.muted,fontWeight:700,fontSize:14,cursor:"pointer" }}>
            🏠 Retour aux mini-jeux
          </button>

          {/* La publication sur le Comptoir se fait automatiquement à 00:01 (uniquement le vainqueur) */}
        </div>
      </div>
    );
  }

  return null;
};

// ─── Récompense quotidienne à minuit (appelée au démarrage de l'app)
// Distribue les DRIX du jour précédent (vainqueur +20, participation +5, abandon 0)
export const checkYesterdayScoreurReward = async (joueur) => {
  if (!joueur?.id) return;
  const yest = yesterdayLocal();
  // Mon run d'hier — uniquement les runs terminés (les abandons ne reçoivent rien)
  const myRow = await sb(`chrono_scoreur_scores?joueur_id=eq.${joueur.id}&date_jour=eq.${yest}&statut=eq.termine&rewarded=eq.false&select=*`);
  if (!myRow || !myRow[0]) return;
  const me = myRow[0];

  // Classement d'hier
  const ranking = await sb(`chrono_scoreur_scores?date_jour=eq.${yest}&statut=eq.termine&order=temps_ms.asc&limit=50&select=joueur_id,temps_ms`);
  if (!ranking) return;
  const myPos = ranking.findIndex(r => r.joueur_id === joueur.id);
  let drix = 5;
  let label = "🎯 Participation";
  if (myPos === 0) { drix = 20; label = "🥇 Vainqueur du jour"; }

  const newDrix = (joueur.drix || 1000) + drix;
  await Promise.all([
    sb(`joueurs?id=eq.${joueur.id}`, { method:"PATCH", headers:{ Prefer:"return=minimal" }, body: JSON.stringify({ drix: newDrix }) }),
    sb(`chrono_scoreur_scores?id=eq.${me.id}`, { method:"PATCH", headers:{ Prefer:"return=minimal" }, body: JSON.stringify({ rewarded: true }) }),
    sb("drix_mouvements", { method:"POST", headers:{ Prefer:"return=minimal" }, body: JSON.stringify({
      joueur_id: joueur.id, joueur_pseudo: joueur.pseudo,
      adversaire_pseudo: `⏱ Chrono Scoreur — ${label}`,
      variation: drix, drix_avant: joueur.drix || 1000, drix_apres: newDrix,
      resultat: "victoire", date: Date.now(),
    })}),
  ]);

  // Post Vainqueur (uniquement top 1)
  if (myPos === 0) {
    const dateFr = yest.split("-").reverse().join("/");
    const payload = {
      type: "chrono_scoreur_vainqueur",
      temps_ms: me.temps_ms,
      drix: 20,
      date_jour: yest,
    };
    const contenu = `__CHRONO_SCOREUR__|${JSON.stringify(payload)}\n\n` +
      `🏆 Chrono Scoreur — Vainqueur du ${dateFr}\n` +
      `👑 ${joueur.pseudo} remporte le défi en ${formatChrono(me.temps_ms)} !\n` +
      `🥇 +20 DRIX`;
    sb("wall_posts", { method:"POST", headers:{ Prefer:"return=minimal" }, body: JSON.stringify({
      joueur_id: joueur.id, joueur_pseudo: joueur.pseudo, joueur_photo: joueur.photo || null,
      contenu, date: Date.now(),
    })});
  }

  return { drix, label };
};
