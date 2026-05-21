import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ArrowLeft, Timer, Trophy } from "lucide-react";

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

// ── Données finishes ──────────────────────────────────────────────────────────
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
  38:"D19", 36:"D18", 34:"D17", 32:"D16", 30:"D15",
  28:"D14", 26:"D13", 24:"D12", 22:"D11", 20:"D10",
  18:"D9",  16:"D8",  14:"D7",  12:"D6",  10:"D5",
   8:"D4",   6:"D3",   4:"D2",   2:"D1",
};
const TOUS_FINISHES = Object.keys(CHECKOUTS_OPT).map(Number);

// Niveau 1 : double pur (1 fléchette)
const FINISHES_N1 = TOUS_FINISHES.filter(f => !CHECKOUTS_OPT[f].includes(" "));
// Niveau 2 : triple + double (2 fléchettes)
const FINISHES_N2 = TOUS_FINISHES.filter(f => {
  const p = CHECKOUTS_OPT[f].split(" ");
  return p.length === 2 && p[0].startsWith("T");
});
// Niveau 3 : 3 fléchettes
const FINISHES_N3 = TOUS_FINISHES.filter(f => CHECKOUTS_OPT[f].split(" ").length === 3);

// ── Seeded random (LCG) ───────────────────────────────────────────────────────
const seededRand = (seed) => {
  let s = (seed ^ 0xdeadbeef) >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
};
const dateToSeed = (dateStr) =>
  dateStr.replace(/-/g, "").split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);

// Génère les 5 finishes du jour : N1, N2, N3, N3, N3
const genDailyFinishes = (today) => {
  const rand = seededRand(dateToSeed(today));
  const used = new Set();
  const pick = (arr) => {
    const avail = arr.filter(f => !used.has(f));
    const f = avail[Math.floor(rand() * avail.length)];
    used.add(f);
    return f;
  };
  return [
    pick(FINISHES_N1),  // double pur
    pick(FINISHES_N2),  // triple + double
    pick(FINISHES_N3),  // 3 fléchettes
    pick(FINISHES_N3),
    pick(FINISHES_N3),
  ];
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const dartLabel  = (mult, num) => {
  if (num === 25) return mult === 1 ? "25" : mult === 2 ? "Bull" : null;
  return mult === 1 ? `${num}` : mult === 2 ? `D${num}` : `T${num}`;
};
const dartValue = (mult, num) => mult * num;

const formatChrono = (ms) => {
  const t = Math.floor(ms / 100);
  const d = t % 10;
  const s = Math.floor(t / 10) % 60;
  const m = Math.floor(t / 600);
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}.${d}`;
  return `${s}.${d}s`;
};

const getToday = () => new Date().toISOString().split("T")[0];
const getYesterday = () => new Date(Date.now() - 86400000).toISOString().split("T")[0];
const storeKey = (d) => `dp_chrono_${d}`;

// ── DRIX : récompense vainqueur d'hier ────────────────────────────────────────
// Exportée pour être appelée depuis App.jsx au démarrage + timer minuit
export const checkYesterdayReward = async (joueur, onWin) => {
  const lastCheck = localStorage.getItem("dp_chrono_last_check");
  const today = getToday();
  if (lastCheck === today) return;
  localStorage.setItem("dp_chrono_last_check", today);

  const yesterday = getYesterday();
  const scores = await sb(
    `chrono_finish_scores?date_jour=eq.${yesterday}&rewarded=eq.false&order=temps_ms.asc&limit=1`
  );
  if (!scores || scores.length === 0) return;

  const winner = scores[0];
  // Marquer tous les scores d'hier comme rewarded (évite les doubles attributions)
  await sb(`chrono_finish_scores?date_jour=eq.${yesterday}`, {
    method: "PATCH",
    body: JSON.stringify({ rewarded: true }),
    prefer: "return=minimal",
  });

  // Récupérer le DRIX actuel du vainqueur
  const jArr = await sb(`joueurs?id=eq.${winner.joueur_id}&select=id,drix`);
  if (!jArr || jArr.length === 0) return;
  const j = jArr[0];
  const newDrix = (j.drix || 1000) + 20;

  await sb(`joueurs?id=eq.${j.id}`, {
    method: "PATCH",
    body: JSON.stringify({ drix: newDrix }),
    prefer: "return=minimal",
  });
  await sb("drix_mouvements", {
    method: "POST",
    body: JSON.stringify({
      joueur_id:        j.id,
      joueur_pseudo:    winner.joueur_pseudo,
      adversaire_pseudo:"⏱ Chrono Finish — 🥇 Vainqueur du jour",
      variation:        20,
      drix_avant:       j.drix || 1000,
      drix_apres:       newDrix,
      resultat:         "victoire",
      date:             Date.now(),
    }),
  });

  // Post Comptoir — félicitation vainqueur
  const jInfo = await sb(`joueurs?id=eq.${winner.joueur_id}&select=id,photo`);
  const photo = jInfo?.[0]?.photo || null;
  const [yd, mm, dd] = yesterday.split("-");
  await sb("wall_posts", {
    method: "POST",
    body: JSON.stringify({
      joueur_id:     winner.joueur_id,
      joueur_pseudo: winner.joueur_pseudo,
      joueur_photo:  photo,
      contenu:       `🏆 Chrono Finish — Vainqueur du ${dd}/${mm}/${yd}\n👑 ${winner.joueur_pseudo} remporte le défi du jour en ${formatChrono(winner.temps_ms)} !\n🥇 +20 DRIX`,
      date:          Date.now(),
    }),
  }).catch(() => {});

  // Notifier si c'est le joueur courant
  if (joueur?.id === winner.joueur_id) {
    onWin({ pseudo: winner.joueur_pseudo, drix: 20 });
  }
};

// ── Crée une tentative "en cours" (statut=abandonne par défaut) ──────────────
// Si l'utilisateur quitte ou ferme la page avant d'avoir validé les 5 finishes,
// l'entrée reste "abandonne" → ça consomme la tentative quotidienne et empêche
// le triche par fermeture.
const createAttempt = async (joueur, today) => {
  if (!joueur?.id) return null;
  try {
    const res = await sb("chrono_finish_scores", {
      method: "POST",
      body: JSON.stringify({
        joueur_id:     joueur.id,
        joueur_pseudo: joueur.pseudo,
        date_jour:     today,
        temps_ms:      0,
        erreurs:       0,
        splits:        [],
        finishes_ids:  [],
        rewarded:      false,
        statut:        "abandonne",
      }),
      prefer: "return=representation",
    });
    const row = Array.isArray(res) ? res[0] : res;
    return row?.id || null;
  } catch (e) {
    console.warn("createAttempt failed:", e);
    return null;
  }
};

// ── Vérifie si le joueur a déjà tenté aujourd'hui (1 tentative/jour) ─────────
const hasAttemptedToday = async (joueur, today) => {
  if (!joueur?.id) return false;
  try {
    const r = await sb(`chrono_finish_scores?joueur_id=eq.${joueur.id}&date_jour=eq.${today}&select=id&limit=1`);
    return (r||[]).length > 0;
  } catch { return false; }
};

// ── Sauvegarde score + récompense participation (+5 DRIX) ────────────────────
// Au lieu de créer une nouvelle entrée, on MET À JOUR l'entrée créée au lancement
// avec statut="termine".
const saveScore = async (joueur, today, tempsMs, erreurs, splits, finishes, attemptId) => {
  localStorage.setItem(storeKey(today), JSON.stringify({ tempsMs, erreurs, splits }));
  if (!joueur?.id) return;

  // Update de l'entrée existante (créée au démarrage du chrono) → statut termine
  if (attemptId) {
    await sb(`chrono_finish_scores?id=eq.${attemptId}`, {
      method: "PATCH",
      body: JSON.stringify({
        temps_ms:     tempsMs,
        erreurs,
        splits,
        finishes_ids: finishes,
        statut:       "termine",
      }),
      prefer: "return=minimal",
    });
  } else {
    // Fallback : si pas d'attemptId (cas dégradé), POST direct
    await sb("chrono_finish_scores", {
      method: "POST",
      body: JSON.stringify({
        joueur_id:     joueur.id,
        joueur_pseudo: joueur.pseudo,
        date_jour:     today,
        temps_ms:      tempsMs,
        erreurs,
        splits,
        finishes_ids:  finishes,
        rewarded:      false,
        statut:        "termine",
      }),
      prefer: "return=minimal",
    });
  }

  // +5 DRIX pour avoir complété le défi (participation)
  const jArr = await sb(`joueurs?id=eq.${joueur.id}&select=id,drix`);
  if (!jArr || jArr.length === 0) return;
  const j = jArr[0];
  const newDrix = (j.drix || 1000) + 5;
  await sb(`joueurs?id=eq.${j.id}`, {
    method: "PATCH",
    body: JSON.stringify({ drix: newDrix }),
    prefer: "return=minimal",
  });
  await sb("drix_mouvements", {
    method: "POST",
    body: JSON.stringify({
      joueur_id:        j.id,
      joueur_pseudo:    joueur.pseudo,
      adversaire_pseudo:"⏱ Chrono Finish — Défi complété",
      variation:        5,
      drix_avant:       j.drix || 1000,
      drix_apres:       newDrix,
      resultat:         "victoire",
      date:             Date.now(),
    }),
  });

  // Post Comptoir — score de participation
  const [yy, mm, dd] = today.split("-");
  const errLabel = erreurs > 0 ? `\n⚠️ ${erreurs} erreur${erreurs > 1 ? "s" : ""}` : "\n✅ Zéro erreur";
  await sb("wall_posts", {
    method: "POST",
    body: JSON.stringify({
      joueur_id:     joueur.id,
      joueur_pseudo: joueur.pseudo,
      joueur_photo:  joueur.photo || null,
      contenu:       `⏱ Chrono Finish — Défi du ${dd}/${mm}/${yy}\n🎯 ${joueur.pseudo} a complété les 5 finishes en ${formatChrono(tempsMs)} !${errLabel}\n💎 +5 DRIX`,
      date:          Date.now(),
    }),
  }).catch(() => {});

  return 5; // participation reward
};

const NB_FINISHES = 5;

// ── Composant principal ───────────────────────────────────────────────────────
export const ChronoFinish = ({ setPage, joueur }) => {
  const today     = useMemo(getToday, []);
  const finishes  = useMemo(() => genDailyFinishes(today), [today]);

  const stored = useMemo(() => {
    try { return JSON.parse(localStorage.getItem(storeKey(today))); }
    catch { return null; }
  }, [today]);

  const [screen,       setScreen]       = useState(stored ? "results" : "intro");
  const [finalResults, setFinalResults] = useState(stored);
  const [drixNotif,    setDrixNotif]    = useState(null);
  const [participDrix, setParticipDrix] = useState(null); // +5 DRIX participation
  const [leader,       setLeader]       = useState(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false); // bloqué pour aujourd'hui
  const [checking,     setChecking]     = useState(true);
  const attemptIdRef                    = useRef(null); // id de la tentative en cours

  useEffect(() => {
    checkYesterdayReward(joueur, (info) => setDrixNotif(info));
    loadLeaderboard();
    // Vérifie si le joueur a déjà tenté Chrono Finish aujourd'hui
    (async () => {
      if (joueur?.id) {
        const played = await hasAttemptedToday(joueur, today);
        setAlreadyPlayed(played);
      }
      setChecking(false);
    })();
  }, []); // eslint-disable-line

  // ── Jeu ──────────────────────────────────────────────────────────────────
  const [currentIdx,  setCurrentIdx]  = useState(0);
  const [phase,       setPhase]       = useState("jeu");
  const [darts,       setDarts]       = useState([]);
  const [multSel,     setMultSel]     = useState(null);
  const [splits,      setSplits]      = useState([]);
  const [curMistakes, setCurMistakes] = useState(0);

  const [chronoMs,  setChronoMs]  = useState(0);
  const [running,   setRunning]   = useState(false);
  const startRef      = useRef(null);
  const splitStartRef = useRef(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setChronoMs(Date.now() - startRef.current), 100);
    return () => clearInterval(id);
  }, [running]);

  const finish  = finishes[currentIdx];
  const total   = darts.reduce((s, d) => s + d.value, 0);
  const optSol  = CHECKOUTS_OPT[finish] ?? "—";

  const toggleMult = (m) => {
    if (phase !== "jeu") return;
    setMultSel(p => p === m ? null : m);
  };

  const selectNum = useCallback((num) => {
    if (phase !== "jeu" || darts.length >= 3) return;
    const mult = multSel ?? 1;
    if (num === 25 && mult === 3) return;
    setDarts(p => [...p, { mult, num, label: dartLabel(mult, num), value: dartValue(mult, num) }]);
    setMultSel(null);
  }, [phase, darts.length, multSel]);

  const annuler = () => { if (phase !== "jeu") return; setDarts(p => p.slice(0, -1)); };
  const reset   = () => { setDarts([]); setMultSel(null); };

  const valider = async () => {
    if (phase !== "jeu" || darts.length === 0) return;
    const lastDart = darts[darts.length - 1];
    const correct  = total === finish && lastDart.mult === 2;

    if (correct) {
      const splitMs   = Date.now() - splitStartRef.current;
      const newSplits = [...splits, { finish, timeMs: splitMs, mistakes: curMistakes }];
      setSplits(newSplits);
      setPhase("correct");

      const next = currentIdx + 1;
      setTimeout(async () => {
        if (next >= NB_FINISHES) {
          setRunning(false);
          const totalMs  = Date.now() - startRef.current;
          const erreurs  = newSplits.reduce((s, r) => s + r.mistakes, 0);
          const reward   = await saveScore(joueur, today, totalMs, erreurs, newSplits, finishes, attemptIdRef.current);
          if (reward && joueur?.id) setParticipDrix(reward);
          setFinalResults({ tempsMs: totalMs, erreurs, splits: newSplits });
          setScreen("results");
        } else {
          setCurrentIdx(next);
          setDarts([]);
          setMultSel(null);
          setCurMistakes(0);
          splitStartRef.current = Date.now();
          setPhase("jeu");
        }
      }, 600);
    } else {
      setCurMistakes(m => m + 1);
      setPhase("incorrect");
      setTimeout(() => { setDarts([]); setMultSel(null); setPhase("jeu"); }, 900);
    }
  };

  // ── Classement ───────────────────────────────────────────────────────────
  const [scores,        setScores]        = useState([]);
  const [loadingScores, setLoadingScores] = useState(false);

  const loadLeaderboard = async () => {
    setLoadingScores(true);
    // On charge tout (terminés + abandons) avec statut, puis on trie côté client
    // pour mettre les terminés d'abord par temps, puis les abandons en bas
    const data = await sb(
      `chrono_finish_scores?date_jour=eq.${today}&limit=50&select=joueur_id,joueur_pseudo,temps_ms,erreurs,statut`
    );
    const arr = data || [];
    arr.sort((a, b) => {
      const aTerm = (a.statut || "termine") === "termine";
      const bTerm = (b.statut || "termine") === "termine";
      if (aTerm && !bTerm) return -1;
      if (!aTerm && bTerm) return 1;
      if (aTerm && bTerm) {
        if (a.temps_ms !== b.temps_ms) return a.temps_ms - b.temps_ms;
        return (a.erreurs || 0) - (b.erreurs || 0);
      }
      return 0;
    });
    setScores(arr);
    setLoadingScores(false);
  };

  const openLeaderboard = () => { setScreen("leaderboard"); loadLeaderboard(); };

  const commencer = async () => {
    // Vérification serveur juste avant le démarrage (anti-triche : double-tab)
    if (joueur?.id) {
      const already = await hasAttemptedToday(joueur, today);
      if (already) {
        setAlreadyPlayed(true);
        return;
      }
      // Crée une tentative "abandonne" en base immédiatement → consomme le jeton du jour
      const id = await createAttempt(joueur, today);
      attemptIdRef.current = id;
    }
    const now = Date.now();
    startRef.current      = now;
    splitStartRef.current = now;
    setRunning(true);
    setScreen("game");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // ÉCRAN : INTRO
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "intro") {
    const medals = ["🥇","🥈","🥉"];
    return (
      <div style={{ position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        {/* Header */}
        <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
          <button onClick={()=>setPage("jeux")} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}><ArrowLeft size={16}/> Retour</button>
          <div style={{ flex:1,fontWeight:800,fontSize:16,color:C.purple,display:"flex",alignItems:"center",gap:8 }}><Timer size={16} color={C.purple}/> Chrono Finish</div>
          <div style={{ fontSize:11,color:C.muted }}>{today}</div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 40px",display:"flex",flexDirection:"column",gap:12 }}>

          {/* Titre du défi */}
          <div style={{ background:"linear-gradient(135deg,#1a1030,#0f0f20)",border:`2px solid ${C.purple}`,borderRadius:20,padding:"24px 16px",textAlign:"center" }}>
            <div style={{ fontSize:52,marginBottom:6 }}>⏱️</div>
            <div style={{ fontWeight:900,fontSize:22,color:C.purple,marginBottom:6 }}>Défi du jour</div>
            <div style={{ fontSize:13,color:C.muted,lineHeight:1.6 }}>
              5 finishes à enchaîner le plus vite possible.<br/>
              Le chronomètre démarre dès que tu cliques <b style={{ color:C.text }}>Commencer</b>.
            </div>
            <div style={{ marginTop:10,fontSize:12,color:C.muted,lineHeight:1.7 }}>
              💎 <b style={{ color:C.purple }}>+5 DRIX</b> pour avoir complété le défi ·{" "}
              🏆 <b style={{ color:C.yellow }}>+20 DRIX</b> au meilleur temps
            </div>
            <div style={{ marginTop:10,fontSize:11,color:"#f59e0b",lineHeight:1.5,padding:"6px 10px",background:"#78350f22",borderRadius:8,border:"1px solid #f59e0b33" }}>
              ⚠ <b>1 seule tentative par jour</b> — abandon ou ferme la page = tentative perdue
            </div>
          </div>

          {/* Banière "déjà joué" */}
          {alreadyPlayed && (
            <div style={{ background:"linear-gradient(135deg,#1a0a14,#0f0a18)",border:`2px solid ${C.red}66`,borderRadius:16,padding:"14px 16px",textAlign:"center" }}>
              <div style={{ fontSize:28,marginBottom:4 }}>🔒</div>
              <div style={{ fontWeight:900,fontSize:14,color:C.red,marginBottom:3 }}>Tu as déjà joué aujourd'hui</div>
              <div style={{ fontSize:12,color:C.muted }}>Reviens demain pour une nouvelle tentative !</div>
            </div>
          )}

          {/* Classement du jour */}
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden" }}>
            <div style={{ padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontWeight:800,fontSize:13,color:C.text,display:"flex",alignItems:"center",gap:8 }}>
              <Trophy size={14} color={C.yellow}/> Classement du jour
            </div>
            {loadingScores ? (
              <div style={{ padding:"20px",textAlign:"center",color:C.muted,fontSize:13 }}>Chargement...</div>
            ) : scores.length === 0 ? (
              <div style={{ padding:"20px",textAlign:"center",color:C.muted,fontSize:13 }}>Sois le premier à jouer aujourd'hui !</div>
            ) : (
              scores.map((s, i) => {
                const isMe = s.joueur_id === joueur?.id;
                const isAbandon = (s.statut || "termine") === "abandonne";
                // Rank uniquement pour les terminés
                const completedCount = scores.filter(x => (x.statut || "termine") === "termine").length;
                const rankIdx = !isAbandon ? i : -1;
                return (
                  <div key={i} style={{
                    display:"flex",alignItems:"center",padding:"10px 14px",
                    borderBottom: i<scores.length-1 ? `1px solid ${C.border}22` : "none",
                    gap:10,
                    background: isMe ? `${C.purple}18` : isAbandon ? `${C.red}08` : "transparent",
                    opacity: isAbandon ? .8 : 1,
                  }}>
                    <div style={{ width:26,textAlign:"center",fontWeight:900,fontSize:rankIdx<3 && !isAbandon ?17:12, color: isAbandon ? C.red : (rankIdx<3 ? C.yellow : C.muted), flexShrink:0 }}>
                      {isAbandon ? "✗" : (rankIdx < 3 ? medals[rankIdx] : rankIdx+1)}
                    </div>
                    <div style={{ flex:1,fontWeight:isMe?800:600,fontSize:14,color: isAbandon ? "#94a3b8" : (isMe?C.purple:C.text),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                      {s.joueur_pseudo}{isMe?" (toi)":""}
                    </div>
                    {!isAbandon && s.erreurs > 0 && <div style={{ fontSize:11,color:C.red }}>{s.erreurs} err.</div>}
                    {isAbandon ? (
                      <div style={{ fontWeight:800,fontSize:12,color:C.red,fontStyle:"italic",flexShrink:0,letterSpacing:.5 }}>
                        Abandon
                      </div>
                    ) : (
                      <div style={{ fontWeight:900,fontSize:15,color:rankIdx===0?C.yellow:isMe?C.purple:C.text,fontVariantNumeric:"tabular-nums",flexShrink:0 }}>
                        {formatChrono(s.temps_ms)}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Boutons */}
          <div style={{ display:"flex",gap:10,marginTop:4 }}>
            <button onClick={commencer}
              disabled={alreadyPlayed || checking}
              style={{
                flex:1,
                background: (alreadyPlayed||checking) ? "#1a1a1a" : `linear-gradient(135deg,${C.purple},#7c3aed)`,
                color: (alreadyPlayed||checking) ? C.muted : "#fff",
                border: (alreadyPlayed||checking) ? `1px solid ${C.border}` : "none",
                borderRadius:12, padding:"14px",
                fontWeight:900, fontSize:16,
                cursor: (alreadyPlayed||checking) ? "not-allowed" : "pointer",
                touchAction:"manipulation",
                boxShadow: (alreadyPlayed||checking) ? "none" : `0 4px 20px ${C.purple}55`,
                opacity: (alreadyPlayed||checking) ? .6 : 1,
              }}>
              {checking ? "Vérification…" : alreadyPlayed ? "🔒 Bloqué jusqu'à demain" : "🎯 Commencer"}
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

  // ─────────────────────────────────────────────────────────────────────────
  // ÉCRAN : CLASSEMENT
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "leaderboard") {
    const myPos = scores.findIndex(s => s.joueur_id === joueur?.id);
    return (
      <div style={{ position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        {/* Header */}
        <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
          <button onClick={()=>setScreen(finalResults ? "results" : "intro")} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}><ArrowLeft size={16}/> Retour</button>
          <div style={{ flex:1,fontWeight:800,fontSize:16,color:C.purple,display:"flex",alignItems:"center",gap:8 }}><Trophy size={16} color={C.yellow}/> Classement du jour</div>
          <div style={{ fontSize:12,color:C.muted }}>{today}</div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"12px 14px 40px" }}>

          {/* Titre du jour */}
          <div style={{ background:`${C.purple}15`,border:`1px solid ${C.purple}44`,borderRadius:14,padding:"12px 16px",marginBottom:14,textAlign:"center" }}>
            <div style={{ fontSize:11,color:C.muted,letterSpacing:1,marginBottom:4 }}>CLASSEMENT DU DÉFI QUOTIDIEN</div>
            <div style={{ fontSize:11,color:C.muted,marginTop:4 }}>🥇 Le vainqueur reçoit <b style={{ color:C.yellow }}>+20 DRIX</b> à minuit</div>
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
                const isAbandon = (s.statut || "termine") === "abandonne";
                // Calcul du rank parmi les terminés uniquement
                const completedBefore = scores.slice(0, i).filter(x => (x.statut || "termine") === "termine").length;
                const rankIdx = isAbandon ? -1 : completedBefore;
                return (
                  <div key={i} style={{
                    display:"flex",alignItems:"center",padding:"11px 14px",gap:10,
                    borderBottom:i<scores.length-1?`1px solid ${C.border}22`:"none",
                    background: isMe ? `${C.purple}18` : isAbandon ? `${C.red}08` : "transparent",
                    opacity: isAbandon ? .8 : 1,
                  }}>
                    {/* Rang */}
                    <div style={{ width:28,textAlign:"center",fontWeight:900,fontSize:rankIdx<3 && !isAbandon ?18:13, color: isAbandon ? C.red : (rankIdx<3 ? C.yellow : C.muted), flexShrink:0 }}>
                      {isAbandon ? "✗" : (rankIdx < 3 ? medals[rankIdx] : rankIdx+1)}
                    </div>
                    {/* Pseudo */}
                    <div style={{ flex:1,fontWeight:isMe?800:600,fontSize:14,color: isAbandon ? "#94a3b8" : (isMe?C.purple:C.text),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                      {s.joueur_pseudo}{isMe?" (toi)":""}
                    </div>
                    {/* Erreurs (seulement pour terminés) */}
                    {!isAbandon && s.erreurs > 0 && (
                      <div style={{ fontSize:11,color:C.red }}>
                        {s.erreurs} erreur{s.erreurs>1?"s":""}
                      </div>
                    )}
                    {/* Temps ou Abandon */}
                    {isAbandon ? (
                      <div style={{ fontWeight:800,fontSize:13,color:C.red,fontStyle:"italic",flexShrink:0,letterSpacing:.5 }}>
                        Abandon
                      </div>
                    ) : (
                      <div style={{ fontWeight:900,fontSize:15,color:rankIdx===0?C.yellow:isMe?C.purple:C.text,fontVariantNumeric:"tabular-nums",flexShrink:0 }}>
                        {formatChrono(s.temps_ms)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Ma position si pas dans le top */}
          {!loadingScores && myPos < 0 && joueur && finalResults && (
            <div style={{ marginTop:12,background:C.card,border:`1px solid ${C.purple}44`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ fontSize:13,color:C.muted }}>Ton score n'est pas encore enregistré en ligne.</div>
            </div>
          )}
          {!loadingScores && myPos >= 0 && myPos >= 10 && (
            <div style={{ marginTop:12,background:`${C.purple}18`,border:`1px solid ${C.purple}44`,borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10 }}>
              <div style={{ flex:1,fontWeight:700,fontSize:13,color:C.purple }}>Ta position : #{myPos+1}</div>
              <div style={{ fontWeight:900,fontSize:14,color:C.purple,fontVariantNumeric:"tabular-nums" }}>{formatChrono(finalResults.tempsMs)}</div>
            </div>
          )}

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ÉCRAN : RÉSULTATS
  // ─────────────────────────────────────────────────────────────────────────
  if (screen === "results" && finalResults) {
    const { tempsMs, erreurs, splits: resSplits } = finalResults;
    const fastest = [...resSplits].sort((a,b)=>a.timeMs-b.timeMs)[0];
    const slowest = [...resSplits].sort((a,b)=>b.timeMs-a.timeMs)[0];
    const medal = erreurs === 0 && tempsMs < 30000 ? "🏆"
                : erreurs === 0 ? "🥇"
                : erreurs <= 2 ? "🥈" : "🥉";

    return (
      <div style={{ position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        {/* DRIX notif vainqueur +20 */}
        {drixNotif && (
          <div style={{ position:"absolute",top:60,left:"50%",transform:"translateX(-50%)",zIndex:999,background:"#000c",borderRadius:16,padding:"14px 24px",textAlign:"center",boxShadow:`0 0 40px ${C.yellow}55`,pointerEvents:"none" }}>
            <div style={{ fontSize:24,marginBottom:4 }}>🏆</div>
            <div style={{ fontWeight:900,fontSize:16,color:C.yellow }}>+20 DRIX remportés !</div>
            <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>Vainqueur du Chrono Finish d'hier</div>
          </div>
        )}
        {/* DRIX notif participation +5 */}
        {participDrix && !drixNotif && (
          <div style={{ position:"absolute",top:60,left:"50%",transform:"translateX(-50%)",zIndex:999,background:"#000c",borderRadius:16,padding:"14px 24px",textAlign:"center",boxShadow:`0 0 40px ${C.purple}55`,pointerEvents:"none" }}>
            <div style={{ fontSize:24,marginBottom:4 }}>💎</div>
            <div style={{ fontWeight:900,fontSize:16,color:C.purple }}>+5 DRIX gagnés !</div>
            <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>Défi quotidien complété</div>
          </div>
        )}

        {/* Header */}
        <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
          <button onClick={()=>setPage("jeux")} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}><ArrowLeft size={16}/> Retour</button>
          <div style={{ flex:1,fontWeight:800,fontSize:16,color:C.purple,display:"flex",alignItems:"center",gap:8 }}><Timer size={16} color={C.purple}/> Chrono Finish</div>
          <div style={{ fontSize:11,color:C.muted }}>Défi du {today}</div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 40px",display:"flex",flexDirection:"column",gap:12 }}>

          {/* Résultat principal */}
          <div style={{ background:"linear-gradient(135deg,#1a1030,#0f0f20)",border:`2px solid ${C.purple}`,borderRadius:20,padding:"24px 16px",textAlign:"center" }}>
            <div style={{ fontSize:52,marginBottom:4 }}>{medal}</div>
            <div style={{ fontSize:11,color:C.muted,letterSpacing:1,marginBottom:4 }}>TEMPS TOTAL</div>
            <div style={{ fontSize:52,fontWeight:900,color:C.purple,letterSpacing:2,fontVariantNumeric:"tabular-nums" }}>
              {formatChrono(tempsMs)}
            </div>
            <div style={{ fontSize:12,color:C.muted,marginTop:6 }}>
              {erreurs === 0 ? "✅ Zéro erreur — parfait !" : `⚠️ ${erreurs} erreur${erreurs>1?"s":""}`}
            </div>
            {!joueur && (
              <div style={{ fontSize:11,color:C.accent,marginTop:8 }}>🔒 Connecte-toi pour apparaître au classement</div>
            )}
          </div>

          {/* Détail */}
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden" }}>
            <div style={{ padding:"10px 14px",borderBottom:`1px solid ${C.border}`,fontWeight:800,fontSize:13,color:C.text }}>
              📋 Détail
            </div>
            {resSplits.map((r, i) => {
              const isFastest = r === fastest && resSplits.length > 1;
              const isSlowest = r === slowest && resSplits.length > 1;
              const niv = ["🎯 Double","⚡ T+Double","🔥 3 fléchettes","🔥 3 fléchettes","🔥 3 fléchettes"][i];
              return (
                <div key={i} style={{ display:"flex",alignItems:"center",padding:"10px 14px",borderBottom:i<resSplits.length-1?`1px solid ${C.border}22`:"none",gap:10 }}>
                  <div style={{ width:26,height:26,borderRadius:"50%",background:C.card2,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12,color:C.muted,flexShrink:0 }}>
                    {i+1}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800,fontSize:16,color:C.accent }}>{r.finish}</div>
                    <div style={{ fontSize:9,color:C.muted }}>{CHECKOUTS_OPT[r.finish]} · {niv}</div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontWeight:900,fontSize:14,color:isFastest?C.green:isSlowest?C.red:C.text,fontVariantNumeric:"tabular-nums" }}>
                      {formatChrono(r.timeMs)}{isFastest?" 🔥":isSlowest?" 🐌":""}
                    </div>
                    {r.mistakes > 0 && <div style={{ fontSize:10,color:C.red }}>{r.mistakes} erreur{r.mistakes>1?"s":""}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Revient demain */}
          <div style={{ background:C.card2,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",textAlign:"center",fontSize:12,color:C.muted }}>
            🔒 Prochain défi dans{" "}
            <b style={{ color:C.text }}>{(() => {
              const now = new Date();
              const midnight = new Date(now); midnight.setHours(24,0,0,0);
              const h = Math.floor((midnight-now)/3600000);
              const m = Math.floor(((midnight-now)%3600000)/60000);
              return `${h}h${String(m).padStart(2,"0")}`;
            })()}</b>
          </div>

          {/* Boutons */}
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={()=>setPage("jeux")}
              style={{ flex:1,background:C.card,color:C.muted,border:`1px solid ${C.border}`,borderRadius:12,padding:"13px",fontWeight:700,fontSize:14,cursor:"pointer",touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              <ArrowLeft size={16}/> Quitter
            </button>
            <button onClick={openLeaderboard}
              style={{ flex:1,background:`linear-gradient(135deg,${C.purple},#7c3aed)`,color:"#fff",border:"none",borderRadius:12,padding:"13px",fontWeight:900,fontSize:14,cursor:"pointer",touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
              <Trophy size={16}/> Classement
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ÉCRAN : JEU
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
      <style>{`
        @keyframes flashGreen{0%{background:linear-gradient(135deg,#052e16,#14532d)}50%{background:linear-gradient(135deg,#14532d,#166534)}100%{background:linear-gradient(135deg,#052e16,#14532d)}}
        @keyframes flashRed{0%{background:linear-gradient(135deg,#450a0a,#7f1d1d)}50%{background:linear-gradient(135deg,#7f1d1d,#991b1b)}100%{background:linear-gradient(135deg,#450a0a,#7f1d1d)}}
      `}</style>

      {/* ── Header ── */}
      <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"8px 12px",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
        <button onClick={()=>setPage("jeux")} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}><ArrowLeft size={16}/> Retour</button>
        <div style={{ flex:1,fontWeight:800,fontSize:15,color:C.purple,display:"flex",alignItems:"center",gap:8 }}><Timer size={16} color={C.purple}/> Chrono Finish</div>
        {/* Chrono */}
        <div style={{ background:`${C.purple}22`,border:`1px solid ${C.purple}55`,borderRadius:10,padding:"4px 12px",fontVariantNumeric:"tabular-nums",fontWeight:900,fontSize:18,color:C.purple,letterSpacing:1,minWidth:72,textAlign:"center" }}>
          {formatChrono(chronoMs)}
        </div>
      </div>

      {/* ── Progression ── */}
      <div style={{ background:C.card2,borderBottom:`1px solid ${C.border}`,padding:"8px 14px",display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
        {finishes.map((f, i) => (
          <div key={i} style={{ flex:1,height:6,borderRadius:3,transition:"background .3s",
            background: i < currentIdx ? C.purple
              : i === currentIdx ? (phase==="correct"?C.green:phase==="incorrect"?C.red:C.accent)
              : C.border,
          }}/>
        ))}
        <div style={{ fontSize:12,color:C.muted,fontWeight:700,whiteSpace:"nowrap",marginLeft:4 }}>
          {currentIdx+1}/{NB_FINISHES}
        </div>
      </div>

      {/* ── Zone principale ── */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",padding:"8px 10px",gap:6,overflow:"hidden",minHeight:0 }}>

        {/* Finish */}
        <div style={{
          background: phase==="correct"
            ? "linear-gradient(135deg,#052e16,#14532d)"
            : phase==="incorrect"
            ? "linear-gradient(135deg,#450a0a,#7f1d1d)"
            : "linear-gradient(135deg,#1a1030,#0f0f20)",
          border:`2px solid ${phase==="correct"?C.green:phase==="incorrect"?C.red:C.purple}`,
          borderRadius:14,padding:"8px 14px",textAlign:"center",flexShrink:0,
          transition:"border-color .2s",
          animation:phase==="correct"?"flashGreen .5s":phase==="incorrect"?"flashRed .4s":"none",
        }}>
          <div style={{ fontSize:10,color:C.muted,letterSpacing:2,marginBottom:2 }}>
            FINISH {currentIdx+1} / {NB_FINISHES}
          </div>
          <div style={{ fontSize:64,fontWeight:900,lineHeight:1,color:phase==="correct"?C.green:phase==="incorrect"?C.red:C.purple,transition:"color .2s" }}>
            {finish}
          </div>
          {phase==="correct" && <div style={{ fontSize:15,color:C.green,fontWeight:800,marginTop:2 }}>✅ Correct !</div>}
          {phase==="incorrect" && <div style={{ fontSize:13,color:"#fca5a5",fontWeight:700,marginTop:2 }}>❌ Mauvaise combinaison</div>}
        </div>

        {/* Fléchettes */}
        <div style={{ display:"flex",gap:6,flexShrink:0 }}>
          {[0,1,2].map(i => {
            const d = darts[i];
            return (
              <div key={i} style={{ flex:1,height:52,borderRadius:10,border:`2px dashed ${d?C.purple:C.border}`,background:d?(phase==="correct"?C.greenBg:phase==="incorrect"?C.redBg:C.card):C.card2,display:"flex",alignItems:"center",justifyContent:"center" }}>
                {d
                  ? <div style={{ fontSize:17,fontWeight:800,color:phase==="correct"?C.green:phase==="incorrect"?C.red:C.purple }}>{d.label}</div>
                  : <div style={{ fontSize:18,color:C.border }}>🎯</div>
                }
              </div>
            );
          })}
        </div>

        {/* Clavier */}
        {phase === "jeu" && (
          <div style={{ flex:1,display:"flex",flexDirection:"column",gap:5,minHeight:0 }}>

            <div style={{ display:"flex",gap:6,flexShrink:0 }}>
              {[{mult:2,label:"2× Double",color:C.blue},{mult:3,label:"3× Triple",color:C.green}].map(({mult,label,color})=>(
                <button key={mult} onClick={()=>toggleMult(mult)}
                  style={{ flex:1,padding:"9px 8px",borderRadius:10,border:`2px solid ${multSel===mult?color:C.border}`,background:multSel===mult?color+"22":C.card,color:multSel===mult?color:C.muted,fontWeight:800,fontSize:14,cursor:"pointer",boxShadow:multSel===mult?`0 0 12px ${color}44`:"none",touchAction:"manipulation" }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ textAlign:"center",fontSize:10,color:C.muted,flexShrink:0 }}>
              {multSel===2?<span style={{ color:C.blue,fontWeight:700 }}>Mode Double actif</span>
              :multSel===3?<span style={{ color:C.green,fontWeight:700 }}>Mode Triple actif</span>
              :<span>Simple par défaut · active D ou T d'abord</span>}
            </div>

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
              <button onClick={annuler} disabled={!darts.length}
                style={{ gridColumn:"span 2",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:darts.length?C.text:C.muted,fontWeight:700,fontSize:15,cursor:darts.length?"pointer":"default",touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center" }}>
                ↩
              </button>
              <button onClick={reset} disabled={!darts.length}
                style={{ gridColumn:"span 2",borderRadius:8,border:`1px solid ${C.border}`,background:C.card,color:darts.length?C.text:C.muted,fontWeight:700,fontSize:15,cursor:darts.length?"pointer":"default",touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center" }}>
                🔄
              </button>
            </div>

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

        {(phase==="correct"||phase==="incorrect") && (
          <div style={{ flex:1,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <div style={{ fontSize:13,color:C.muted }}>
              {phase==="correct"
                ? currentIdx+1<NB_FINISHES ? "Finish suivant..." : "Calcul du résultat..."
                : "Réessaie..."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
