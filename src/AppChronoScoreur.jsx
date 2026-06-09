import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { ArrowLeft, Timer, Trophy, Zap, Target } from "lucide-react";
import { EmoIcon, EmoText } from "./icons";

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
const sb = (path, opts = {}) => {
  const baseHeaders = {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    "Content-Type": "application/json",
    ...(opts.prefer ? { Prefer: opts.prefer } : {}),
  };
  // 🔒 Merge headers : on garde les headers d'auth ET on ajoute ceux passés (Prefer, etc.)
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: { ...baseHeaders, ...(opts.headers || {}) },
  }).then(r => r.ok ? (r.status === 204 ? null : r.json()) : null).catch(() => null);
};

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

// Clé localStorage : verrou local en plus du verrou DB (1 vie/jour incassable)
const scoreurLockKey = (d) => `dp_scoreur_locked_${d}`;
const isLocallyLocked = (today) => {
  try { return localStorage.getItem(scoreurLockKey(today)) === "1"; } catch { return false; }
};
const setLocalLock = (today) => {
  try { localStorage.setItem(scoreurLockKey(today), "1"); } catch {}
};
// Purge un verrou périmé (ancien bug : verrou posé avant un POST qui a échoué → aucun run en base)
const clearLocalLock = (today) => {
  try { localStorage.removeItem(scoreurLockKey(today)); } catch {}
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
  const [countdownMs, setCountdownMs] = useState(0); // temps restant avant minuit

  // État du run
  const [currentIdx, setCurrentIdx] = useState(0);  // index volée en cours
  const [remaining, setRemaining] = useState(501);
  const [errors, setErrors] = useState(0);
  const [input, setInput] = useState("");
  const [flashError, setFlashError] = useState(false);
  const [flashSuccess, setFlashSuccess] = useState(false);
  const [showPenalty, setShowPenalty] = useState(false);
  const [volleyKey, setVolleyKey] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finalResults, setFinalResults] = useState(null);

  const startTimeRef = useRef(null);
  const penaltyMsRef = useRef(0);
  const rafRef = useRef(null);
  const runIdRef = useRef(null);
  const finalizedRef = useRef(false); // anti double-crédit du +5 participation
  const today = todayLocal();

  // Séquence de volées du jour (même pour tous les joueurs)
  const volees = useMemo(() => generateVolleysSequence(today), [today]);

  // ─── Au montage : check si déjà joué (DB = source de vérité, localStorage = cache/secours)
  useEffect(() => {
    if (!joueur?.id) { setChecking(false); return; }
    let cancelled = false;
    // On vérifie TOUJOURS le serveur. Le verrou local seul ne suffit pas : un verrou
    // périmé (ancien bug = verrou posé avant un POST qui a échoué) doit pouvoir être purgé.
    sb(`chrono_scoreur_scores?joueur_id=eq.${joueur.id}&date_jour=eq.${today}&select=id,statut`)
      .then(r => {
        if (cancelled) return;
        if (r === null) {
          // Requête KO (réseau coupé ou table absente) → on se rabat sur le verrou local
          setAlreadyPlayed(isLocallyLocked(today));
          setChecking(false);
          return;
        }
        // r est un tableau (réponse valide). On a donc une réponse fiable.
        const played = r.length > 0;
        if (played) {
          setLocalLock(today);       // run réel en base → on (re)pose le verrou local
        } else {
          clearLocalLock(today);     // aucun run aujourd'hui → tout verrou local est périmé
        }
        setAlreadyPlayed(played);
        setChecking(false);
      });
    return () => { cancelled = true; };
  }, [joueur?.id, today]);

  const loadScores = useCallback(() => {
    setLoadingScores(true);
    // Charge TOUT (terminés + abandons), tri côté client : terminés d'abord par temps, abandons à la fin
    sb(`chrono_scoreur_scores?date_jour=eq.${today}&limit=50&select=*`)
      .then(r => {
        const arr = r || [];
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
      });
  }, [today]);

  // ─── Charge le classement dès l'arrivée sur l'intro (record / live / podium)
  useEffect(() => { loadScores(); }, [loadScores]);

  // ─── Countdown minuit (tick toutes les 30s) — pour le bloc "déjà joué"
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const tmr = new Date(now);
      tmr.setHours(24, 0, 0, 0);
      setCountdownMs(tmr.getTime() - now.getTime());
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const fmtCountdown = (ms) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h ${String(m).padStart(2, "0")}m`;
  };

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
    // 🔒 Triple garde : state React + localStorage synchrone + bail si déjà locké
    if (!joueur?.id || alreadyPlayed || isLocallyLocked(today)) return;
    // Verrou UI uniquement (in-memory) — évite la double-click pendant l'await
    setAlreadyPlayed(true);
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
    // ❌ Si le POST a échoué (table manquante, RLS, etc.) → on relâche le verrou pour retry
    if (!created?.[0]?.id) {
      setAlreadyPlayed(false);
      if (typeof window !== "undefined") {
        window.dpToast?.("⚠ Erreur DB (table chrono_scoreur_scores). Recharge l'app et réessaie.", "error", 8000);
      }
      return;
    }
    runIdRef.current = created[0].id;
    // 🔒 Verrou local POSÉ APRÈS succès POST — assure cohérence DB ⇄ local
    setLocalLock(today);

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
      setFlashSuccess(true);
      if (navigator.vibrate) navigator.vibrate(20);
      setTimeout(() => setFlashSuccess(false), 250);

      if (newRemaining === 0 || newIdx >= volees.length) {
        // 🏁 Fin du run
        terminerRun(newIdx, errors);
      } else {
        setCurrentIdx(newIdx);
        setVolleyKey(k => k + 1); // déclenche animation nouvelle volée
      }
    } else {
      // ❌ Erreur → +3s pénalité, flash rouge, vibration, shake
      penaltyMsRef.current += 3000;
      setErrors(e => e + 1);
      setFlashError(true);
      setShowPenalty(true);
      if (navigator.vibrate) navigator.vibrate([60, 30, 60]);
      setTimeout(() => setFlashError(false), 400);
      setTimeout(() => setShowPenalty(false), 900);
      setInput("");
    }
  };

  // ─── Finaliser le run
  const terminerRun = async (nbVolees, nbErrors) => {
    if (finalizedRef.current) return;   // anti double-crédit (double-tap / re-appel)
    finalizedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const finalMs = Math.round(performance.now() - startTimeRef.current + penaltyMsRef.current);
    setElapsed(finalMs);

    let participDrix = 0;
    if (runIdRef.current) {
      await sb(`chrono_scoreur_scores?id=eq.${runIdRef.current}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          statut: "termine",
          temps_ms: finalMs,
          nb_volees: nbVolees,
          erreurs: nbErrors,
          volees: volees.slice(0, nbVolees).map(v => v.score),
        }),
      });

      // 💎 +5 DRIX de participation versés IMMÉDIATEMENT (comme le Finish Speedrun).
      // Le +20 vainqueur est attribué le lendemain via checkYesterdayScoreurReward.
      // On lit le solde frais, mais on RETOMBE sur joueur.drix (prop) si le GET échoue,
      // pour ne JAMAIS perdre le +5 à cause d'une lecture ratée (le run est déjà "termine").
      if (joueur?.id) {
        try {
          const jArr = await sb(`joueurs?id=eq.${joueur.id}&select=drix`);
          const drixAvant = (jArr?.[0]?.drix != null) ? jArr[0].drix : (joueur.drix || 1000);
          const newDrix = drixAvant + 5;
          await sb(`joueurs?id=eq.${joueur.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ drix: newDrix }) });
          await sb("drix_mouvements", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({
            joueur_id: joueur.id, joueur_pseudo: joueur.pseudo,
            adversaire_pseudo: "⏱ Scoreur Speedrun — 🎯 Participation",
            variation: 5, drix_avant: drixAvant, drix_apres: newDrix,
            resultat: "victoire", date: Date.now(),
          }) });
          participDrix = 5;
        } catch { /* best-effort : ne bloque jamais l'écran de résultats */ }
      }
    }

    setFinalResults({ tempsMs: finalMs, nbVolees, errors: nbErrors, participDrix });
    setLocalLock(today);
    setAlreadyPlayed(true);
    setScreen("results");
  };

  const abandonner = async () => {
    // Confirmation : l'abandon consomme la vie du jour, pas de rejeu possible
    if (!window.confirm("⚠ Abandonner ?\n\nC'est ta seule vie du jour. Tu ne pourras pas recommencer avant demain.\n\n0 DRIX gagné si tu abandonnes.")) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const finalMs = Math.round(performance.now() - startTimeRef.current + penaltyMsRef.current);
    if (runIdRef.current) {
      await sb(`chrono_scoreur_scores?id=eq.${runIdRef.current}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ statut: "abandonne", temps_ms: finalMs, nb_volees: currentIdx, erreurs: errors }),
      });
    }
    // 🔒 Double verrou : DB + localStorage
    setLocalLock(today);
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
    const completedScores = scores.filter(s => (s.statut || "termine") === "termine");
    const totalPlayers    = scores.length;
    const recordMs        = completedScores[0]?.temps_ms ?? null;
    const recordHolder    = completedScores[0]?.joueur_pseudo || null;
    const myScore         = completedScores.find(s => s.joueur_id === joueur?.id);
    const myRank          = myScore ? completedScores.findIndex(s => s.joueur_id === joueur?.id) + 1 : null;
    const podium          = completedScores.slice(0, 3);

    return (
      <div style={{ position:"fixed",inset:0,zIndex:200,background:"radial-gradient(ellipse at top,#05101f 0%,#03080f 50%,#01040a 100%)",display:"flex",flexDirection:"column",overflow:"hidden" }}>
        <style>{`
          @keyframes csIntroIn    { 0%{opacity:0;transform:translateY(12px)} 100%{opacity:1;transform:translateY(0)} }
          @keyframes csTitlePulse { 0%,100%{text-shadow:0 0 24px #60a5facc,0 0 56px #2563eb66} 50%{text-shadow:0 0 40px #60a5fa,0 0 80px #2563eb99} }
          @keyframes csHeroGlow   { 0%,100%{box-shadow:inset 0 0 60px #60a5fa1a,0 0 28px #2563eb44,0 0 56px #60a5fa22} 50%{box-shadow:inset 0 0 80px #60a5fa33,0 0 40px #2563eb77,0 0 90px #60a5fa44} }
          @keyframes csCtaPulse   { 0%,100%{box-shadow:0 0 28px #60a5fa88,inset 0 1px 0 #ffffff44,inset 0 -3px 0 #1e3a8a99} 50%{box-shadow:0 0 50px #60a5facc,0 0 80px #2563eb66,inset 0 1px 0 #ffffff55,inset 0 -3px 0 #1e3a8a99} }
          @keyframes csShine      { 0%{transform:translateX(-150%) skewX(-22deg)} 100%{transform:translateX(280%) skewX(-22deg)} }
          @keyframes csBannerScroll { 0%{background-position:0 0} 100%{background-position:200% 0} }
          @keyframes csRecordGlow { 0%,100%{text-shadow:0 0 12px #fbbf24cc} 50%{text-shadow:0 0 22px #fbbf24,0 0 36px #f9731699} }
          @keyframes csLiveDot    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.85)} }
          .cs-section { animation: csIntroIn .45s cubic-bezier(.34,1.2,.64,1) both; }
        `}</style>

        {/* Lignes scan ambiance */}
        <div aria-hidden style={{ position:"absolute",inset:0,background:"repeating-linear-gradient(180deg,transparent 0,transparent 3px,rgba(96,165,250,0.025) 3px,rgba(96,165,250,0.025) 4px)",pointerEvents:"none" }}/>

        {/* Header minimal */}
        <div style={{ background:"rgba(8,16,32,0.7)",backdropFilter:"blur(8px)",borderBottom:"1px solid #16294a",padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0,position:"relative",zIndex:5 }}>
          <button onClick={()=>setPage("jeux-sans")} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:"#94a3b8",cursor:"pointer",fontSize:13,padding:0 }}><ArrowLeft size={16}/> Retour</button>
          <div style={{ flex:1,fontWeight:900,fontSize:14,color:"#60a5fa",letterSpacing:2,textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}><Zap size={14} color="#60a5fa"/> SCOREUR SPEEDRUN</div>
          <div style={{ fontSize:10,color:"#64748b",fontVariantNumeric:"tabular-nums" }}>{today}</div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"10px 12px 24px",display:"flex",flexDirection:"column",gap:10 }}>

          {/* ─── HERO BLOCK COMPACT ─── */}
          <div className="cs-section" style={{
            position:"relative", overflow:"hidden",
            background:"radial-gradient(ellipse at center,#0a1a3a 0%,#06122a 60%,#030a18 100%)",
            border:"1.5px solid #60a5fa",
            borderRadius:16, padding:"14px 12px 12px",
            textAlign:"center",
            animation:"csHeroGlow 3.5s ease-in-out infinite, csIntroIn .45s cubic-bezier(.34,1.2,.64,1) both",
          }}>
            <div aria-hidden style={{ position:"absolute",top:-40,left:"50%",transform:"translateX(-50%)",width:260,height:260,borderRadius:"50%",background:"radial-gradient(circle,#60a5fa22 0%,transparent 65%)",pointerEvents:"none" }}/>
            <div aria-hidden style={{ position:"absolute",top:0,left:0,bottom:0,width:100,background:"linear-gradient(90deg,transparent,#ffffff12,transparent)",animation:"csShine 4s ease-in-out infinite",pointerEvents:"none" }}/>

            {/* Bandeau DÉFI DU JOUR */}
            <div style={{
              position:"relative", display:"inline-flex", alignItems:"center", gap:6,
              padding:"3px 10px", borderRadius:5,
              fontSize:9, fontWeight:900, color:"#fbbf24", letterSpacing:2.5,
              background:"linear-gradient(90deg,transparent,#78350f55,transparent)",
              border:"1px solid #fbbf2455",
              textShadow:"0 0 6px #fbbf24aa",
              marginBottom:8,
            }}>
              <EmoIcon e="🏆" size={13} color="#fbbf24" style={{verticalAlign:"-1px",marginRight:6}}/>DÉFI DU JOUR <EmoIcon e="🏆" size={13} color="#fbbf24" style={{verticalAlign:"-1px",marginLeft:6}}/>
            </div>

            {/* TITRE COMPACT */}
            <div style={{
              fontSize:"clamp(22px,6.4vw,30px)", fontWeight:900, lineHeight:1,
              background:"linear-gradient(135deg,#60a5fa 0%,#93c5fd 50%,#2563eb 100%)",
              WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              fontVariantNumeric:"tabular-nums", letterSpacing:1.5,
              animation:"csTitlePulse 2.4s ease-in-out infinite",
              marginBottom:4, whiteSpace:"nowrap",
            }}>
              <EmoIcon e="⚡" size={24} color="#60a5fa" style={{verticalAlign:"-3px",marginRight:6}}/>SCOREUR SPEEDRUN
            </div>

            <div style={{ fontSize:11,color:"#94a3b8",lineHeight:1.4,marginBottom:12 }}>
              <b style={{ color:"#60a5fa" }}>501 → 0</b> · calcul mental · le plus vite
            </div>

            {/* Badges DRIX */}
            <div style={{ display:"flex",justifyContent:"center",gap:6,flexWrap:"wrap" }}>
              <div style={{
                display:"flex",alignItems:"center",gap:5,
                padding:"4px 9px", borderRadius:16,
                background:"linear-gradient(135deg,#0a1a3a,#06122a)",
                border:"1px solid #60a5fa66",
                boxShadow:"0 0 8px #60a5fa33",
                fontSize:10, fontWeight:800,
              }}>
                <EmoIcon e="💎" size={11} color="#60a5fa"/>
                <span style={{ color:"#60a5fa",textShadow:"0 0 4px #60a5fa88" }}>+5</span>
                <span style={{ color:"#94a3b8" }}>participation</span>
              </div>
              <div style={{
                display:"flex",alignItems:"center",gap:5,
                padding:"4px 9px", borderRadius:16,
                background:"linear-gradient(135deg,#3a1f00,#1a0f00)",
                border:"1px solid #fbbf2477",
                boxShadow:"0 0 10px #fbbf2444",
                fontSize:10, fontWeight:800,
              }}>
                <EmoIcon e="🏆" size={11} color="#fbbf24"/>
                <span style={{ color:"#fbbf24",textShadow:"0 0 4px #fbbf24aa" }}>+20</span>
                <span style={{ color:"#fcd34d" }}>vainqueur</span>
              </div>
            </div>

            <div style={{ marginTop:8, fontSize:9, color:"#475569", lineHeight:1.3 }}>
              <EmoIcon e="⚠" size={9} color="#475569" style={{verticalAlign:"-1px",marginRight:4}}/><b style={{ color:"#64748b" }}>1 vie/jour</b> · abandon = perdue · erreur = +3s
            </div>
          </div>

          {/* ─── BLOC "DÉJÀ JOUÉ" countdown compact ─── */}
          {alreadyPlayed && (
            <div className="cs-section" style={{
              background:"radial-gradient(ellipse at center,#0a1424 0%,#06101c 70%,#03080f 100%)",
              border:"1px solid #1e3a8a66",
              borderRadius:12,
              padding:"10px 14px",
              display:"flex",alignItems:"center",gap:12,
            }}>
              <div style={{ display:"flex" }}><EmoIcon e="🔒" size={22} color="#60a5fa"/></div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:9,fontWeight:900,color:"#60a5fa",letterSpacing:1.5,textTransform:"uppercase",marginBottom:1 }}>Reviens dans</div>
                <div style={{ fontSize:22, fontWeight:900, color:"#60a5fa", fontVariantNumeric:"tabular-nums", textShadow:"0 0 12px #60a5fa88", lineHeight:1 }}>
                  {fmtCountdown(countdownMs)}
                </div>
              </div>
              <div style={{ fontSize:10,color:"#64748b",textAlign:"right" }}>nouvelle<br/>tentative<br/>à minuit</div>
            </div>
          )}

          {/* ─── BLOC RECORD + LIVE compact ─── */}
          {!loadingScores && (recordMs || totalPlayers > 0) && (
            <div className="cs-section" style={{ display:"flex",gap:8 }}>
              {recordMs !== null && (
                <div style={{
                  flex:1,
                  background:"linear-gradient(135deg,#1a0f00,#0a0500)",
                  border:"1px solid #fbbf2466",
                  borderRadius:10, padding:"7px 10px",
                  boxShadow:"0 0 10px #fbbf2422",
                }}>
                  <div style={{ fontSize:8,fontWeight:900,color:"#fbbf24",letterSpacing:1.5,marginBottom:2 }}><EmoText s="⚡ RECORD" size={9} gap={3}/></div>
                  <div style={{ fontSize:18,fontWeight:900,color:"#fbbf24",fontVariantNumeric:"tabular-nums",lineHeight:1,animation:"csRecordGlow 2.4s ease-in-out infinite" }}>
                    {formatChrono(recordMs)}
                  </div>
                  {recordHolder && <div style={{ fontSize:9,color:"#a16207",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>par {recordHolder}</div>}
                </div>
              )}
              {totalPlayers > 0 && (
                <div style={{
                  flex:1,
                  background:"linear-gradient(135deg,#06140a,#030a06)",
                  border:"1px solid #22c55e55",
                  borderRadius:10, padding:"7px 10px",
                }}>
                  <div style={{ fontSize:8,fontWeight:900,color:"#22c55e",letterSpacing:1.5,marginBottom:2,display:"flex",alignItems:"center",gap:4 }}>
                    <span style={{ display:"inline-block",width:5,height:5,borderRadius:"50%",background:"#22c55e",boxShadow:"0 0 5px #22c55e",animation:"csLiveDot 1.6s ease-in-out infinite" }}/>
                    LIVE
                  </div>
                  <div style={{ fontSize:18,fontWeight:900,color:"#22c55e",fontVariantNumeric:"tabular-nums",lineHeight:1 }}>
                    {totalPlayers}
                  </div>
                  <div style={{ fontSize:9,color:"#475569",marginTop:2 }}>{totalPlayers > 1 ? "joueurs" : "joueur"}</div>
                </div>
              )}
            </div>
          )}

          {/* ─── PODIUM compact ─── */}
          {!loadingScores && podium.length > 0 && (
            <div className="cs-section" style={{
              background:"linear-gradient(135deg,#0a1020,#070b16)",
              border:"1px solid #16294a",
              borderRadius:12, overflow:"hidden",
            }}>
              <div style={{
                padding:"6px 12px",
                background:"linear-gradient(90deg,#0f1a30,#16294a,#0f1a30)",
                backgroundSize:"200% 100%",
                animation:"csBannerScroll 6s linear infinite",
                borderBottom:"1px solid #16294a",
                fontWeight:900, fontSize:9, color:"#fbbf24", letterSpacing:2.5,
                display:"flex", alignItems:"center", gap:5,
              }}>
                <Trophy size={11} color="#fbbf24"/> PODIUM SPEEDRUN
              </div>
              {podium.map((s, i) => {
                const isMe = s.joueur_id === joueur?.id;
                const colors = [
                  { bg:"linear-gradient(90deg,#3a2200,#1a0f00)", border:"#fbbf24", text:"#fbbf24", medal:"🥇" },
                  { bg:"linear-gradient(90deg,#1a1a26,#0f0f18)", border:"#cbd5e1", text:"#cbd5e1", medal:"🥈" },
                  { bg:"linear-gradient(90deg,#2a1500,#150a00)", border:"#fb923c", text:"#fb923c", medal:"🥉" },
                ];
                const col = colors[i];
                return (
                  <div key={i} style={{
                    display:"flex", alignItems:"center",
                    padding:"7px 12px", gap:8,
                    background: isMe ? "linear-gradient(90deg,#0a1a3a,#06122a)" : col.bg,
                    borderBottom: i<podium.length-1 ? "1px solid #16294a44" : "none",
                  }}>
                    <div style={{ lineHeight:1, filter:`drop-shadow(0 0 6px ${col.border}aa)`, display:"flex" }}><EmoIcon e={col.medal} size={17} color={col.border}/></div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:900,fontSize:13,color: isMe?"#60a5fa":col.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                        {s.joueur_pseudo}{isMe ? " (toi)" : ""}
                      </div>
                      {s.erreurs > 0 && <div style={{ fontSize:9,color:"#ef4444" }}>{s.erreurs} err.</div>}
                    </div>
                    <div style={{ fontWeight:900,fontSize:i===0?17:15,color:col.text,fontVariantNumeric:"tabular-nums",textShadow:`0 0 ${i===0?10:6}px ${col.border}88` }}>
                      {formatChrono(s.temps_ms)}
                    </div>
                  </div>
                );
              })}
              {myRank && myRank > 3 && myScore && (
                <div style={{
                  display:"flex",alignItems:"center",padding:"7px 12px",gap:8,
                  background:"linear-gradient(90deg,#0a1a3a,#06122a)",
                  borderTop:"1px dashed #60a5fa44",
                }}>
                  <div style={{ width:22,textAlign:"center",fontWeight:900,fontSize:12,color:"#60a5fa" }}>#{myRank}</div>
                  <div style={{ flex:1,fontWeight:900,fontSize:12,color:"#60a5fa" }}>
                    <EmoIcon e="📍" size={12} color="#60a5fa" style={{verticalAlign:"-2px",marginRight:3}}/>Toi {myScore.erreurs > 0 && <span style={{ marginLeft:6,fontSize:9,color:"#ef4444" }}>{myScore.erreurs} err.</span>}
                  </div>
                  <div style={{ fontWeight:900,fontSize:14,color:"#60a5fa",fontVariantNumeric:"tabular-nums",textShadow:"0 0 6px #60a5fa66" }}>
                    {formatChrono(myScore.temps_ms)}
                  </div>
                </div>
              )}
            </div>
          )}

          {loadingScores && (
            <div style={{ textAlign:"center",padding:14,color:"#475569",fontSize:11 }}>Chargement…</div>
          )}

          {!loadingScores && scores.length === 0 && (
            <div className="cs-section" style={{
              background:"linear-gradient(135deg,#05101f,#03080f)",
              border:"1px dashed #16294a",
              borderRadius:10, padding:"12px 10px", textAlign:"center",
            }}>
              <div style={{ marginBottom:2,display:"flex",justifyContent:"center" }}><EmoIcon e="🥇" size={18} color="#fbbf24"/></div>
              <div style={{ fontSize:12,fontWeight:800,color:"#60a5fa" }}>Sois le premier !</div>
              <div style={{ fontSize:10,color:"#64748b",marginTop:1 }}>Pose ton record du jour</div>
            </div>
          )}

          {/* ─── CTAs ─── */}
          <div className="cs-section" style={{ display:"flex",flexDirection:"column",gap:8,marginTop:2 }}>
            <button onClick={commencer}
              disabled={alreadyPlayed || checking}
              style={{
                width:"100%", position:"relative", overflow:"hidden",
                background: (alreadyPlayed||checking)
                  ? "linear-gradient(135deg,#16202e,#0d1119)"
                  : "linear-gradient(135deg,#60a5fa 0%,#3b82f6 50%,#2563eb 100%)",
                color: (alreadyPlayed||checking) ? "#475569" : "#fff",
                border:"none", borderRadius:12,
                padding:"14px 12px",
                fontWeight:900, fontSize:15, letterSpacing:1.5,
                cursor: (alreadyPlayed||checking) ? "not-allowed" : "pointer",
                touchAction:"manipulation",
                boxShadow: (alreadyPlayed||checking)
                  ? "inset 0 -2px 0 #00000066"
                  : "0 0 22px #60a5fa77,inset 0 1px 0 #ffffff44,inset 0 -3px 0 #1e3a8a99",
                animation: (alreadyPlayed||checking) ? "none" : "csCtaPulse 2.4s ease-in-out infinite",
                textShadow: (alreadyPlayed||checking) ? "none" : "0 1px 2px #00000077",
              }}>
              {!alreadyPlayed && !checking && (
                <span aria-hidden style={{ position:"absolute",top:0,left:0,bottom:0,width:70,background:"linear-gradient(90deg,transparent,#ffffff44,transparent)",animation:"csShine 2.8s ease-in-out infinite",pointerEvents:"none" }}/>
              )}
              <span style={{ position:"relative" }}>
                {checking ? <EmoText s="⏳ VÉRIFICATION…" size={15} gap={6}/> : alreadyPlayed ? <EmoText s="🔒 BLOQUÉ JUSQU'À DEMAIN" size={15} gap={6}/> : <EmoText s="⚡ COMMENCER LE RUN" size={15} gap={6}/>}
              </span>
            </button>

            <button onClick={openLeaderboard}
              style={{
                width:"100%",
                background:"linear-gradient(135deg,#3a2200,#1a0f00)",
                color:"#fbbf24", border:"1px solid #fbbf2477",
                borderRadius:10, padding:"9px",
                fontWeight:900, fontSize:11, letterSpacing:1.5,
                cursor:"pointer", touchAction:"manipulation",
                boxShadow:"0 0 10px #fbbf2433",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              }}>
              <Trophy size={12} color="#fbbf24"/> CLASSEMENT COMPLET
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ÉCRAN : JEU — REFONTE SPEEDRUN ESPORT
  // ═══════════════════════════════════════════════════════════════════════
  if (screen === "game") {
    const currentVolee = volees[currentIdx];
    const progress = volees.length > 0 ? (currentIdx / volees.length) * 100 : 0;

    // ─── Parser un segment de label en {value, type, color}
    const parseDartSegment = (seg) => {
      const s = String(seg).trim();
      if (/^bull/i.test(s)) return { value: "BULL", color: "#ef4444", glow: "#ef4444" };
      if (/^t\d+/i.test(s)) return { value: s.toUpperCase(), color: "#fb923c", glow: "#fb923c" }; // Triple = orange
      if (/^d\d+/i.test(s)) return { value: s.toUpperCase(), color: "#22c55e", glow: "#22c55e" }; // Double = vert
      return { value: s, color: "#f8fafc", glow: "#94a3b8" }; // Simple = blanc
    };
    const segments = (currentVolee?.label || "—").split("·").map(parseDartSegment);

    // ─── Pression temporelle : couleur du chrono évolue avec le temps écoulé
    // 0-30s = bleu/violet calme, 30-60s = chaud, 60s+ = brûlant
    const sec = elapsed / 1000;
    const pressure = Math.min(1, sec / 90); // 0 → 1 sur 90s
    const chronoColor = pressure < 0.4 ? "#60a5fa" : pressure < 0.7 ? "#fb923c" : "#ef4444";
    const chronoGlow  = pressure < 0.4 ? "#a78bfa" : pressure < 0.7 ? "#f97316" : "#dc2626";
    const chronoIntensity = 18 + pressure * 32;

    const bgBase = flashError
      ? "radial-gradient(ellipse at center,#2a0010 0%,#0a0006 70%,#020003 100%)"
      : flashSuccess
        ? "radial-gradient(ellipse at center,#003a18 0%,#000a06 70%,#000604 100%)"
        : "radial-gradient(ellipse at top,#0a0f1c 0%,#050810 50%,#02030a 100%)";

    return (
      <div style={{
        position:"fixed", inset:0, zIndex:200,
        display:"flex", flexDirection:"column", overflow:"hidden",
        background: bgBase,
        transition: "background .25s ease-out",
        animation: flashError ? "scoreurShake .35s cubic-bezier(.36,.07,.19,.97) both" : "none",
      }}>
        <style>{`
          @keyframes scoreurShake { 0%,100%{transform:translateX(0)} 15%{transform:translateX(-8px)} 30%{transform:translateX(7px)} 45%{transform:translateX(-5px)} 60%{transform:translateX(4px)} 75%{transform:translateX(-2px)} }
          @keyframes scoreurVolleyIn { 0%{transform:translateY(-30px) scale(.92);opacity:0;filter:blur(8px)} 50%{filter:blur(0)} 100%{transform:translateY(0) scale(1);opacity:1;filter:blur(0)} }
          @keyframes scoreurChronoPulse { 0%,100%{filter:drop-shadow(0 0 var(--g1) var(--c1)) drop-shadow(0 0 var(--g2) var(--c2))} 50%{filter:drop-shadow(0 0 var(--g2) var(--c1)) drop-shadow(0 0 var(--g3) var(--c2))} }
          @keyframes scoreurCursorBlink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
          @keyframes scoreurPenaltyPop { 0%{transform:translate(-50%,-50%) scale(.5);opacity:0} 25%{transform:translate(-50%,-90px) scale(1.3);opacity:1} 100%{transform:translate(-50%,-160px) scale(1);opacity:0} }
          @keyframes scoreurBgScan { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
          @keyframes scoreurProgress { 0%{box-shadow:0 0 6px #60a5fa66} 50%{box-shadow:0 0 14px #a78bfa99} 100%{box-shadow:0 0 6px #60a5fa66} }
          @keyframes scoreurFlashSuccess { 0%{opacity:0} 30%{opacity:.45} 100%{opacity:0} }
          .scoreur-key { transition: transform .08s ease-out, box-shadow .12s ease-out, background .15s; }
          .scoreur-key:active { transform: translateY(2px) scale(.96); box-shadow: inset 0 2px 6px #00000099 !important; }
        `}</style>

        {/* Lignes de scan décoratives — ambiance speedrun */}
        <div aria-hidden style={{
          position:"absolute", inset:0,
          background:"repeating-linear-gradient(180deg,transparent 0,transparent 3px,rgba(96,165,250,0.025) 3px,rgba(96,165,250,0.025) 4px)",
          pointerEvents:"none",
        }}/>
        {/* Halo radial dynamique selon pression */}
        <div aria-hidden style={{
          position:"absolute", top:-100, left:"50%", transform:"translateX(-50%)",
          width:500, height:500, borderRadius:"50%",
          background:`radial-gradient(circle, ${chronoColor}1c 0%, transparent 65%)`,
          pointerEvents:"none", transition:"background .4s",
        }}/>

        {/* Flash success overlay */}
        {flashSuccess && (
          <div aria-hidden style={{
            position:"absolute", inset:0, pointerEvents:"none",
            background:"radial-gradient(circle at center, #22c55e44 0%, transparent 60%)",
            animation:"scoreurFlashSuccess .25s ease-out both",
          }}/>
        )}

        {/* +3s penalty pop */}
        {showPenalty && (
          <div aria-hidden style={{
            position:"absolute", top:"50%", left:"50%",
            zIndex:300, pointerEvents:"none",
            fontSize:48, fontWeight:900,
            color:"#ef4444",
            textShadow:"0 0 24px #ef4444cc, 0 0 48px #dc2626aa",
            letterSpacing:1,
            animation:"scoreurPenaltyPop .9s cubic-bezier(.22,1.2,.36,1) both",
            fontVariantNumeric:"tabular-nums",
          }}>
            +3s <EmoIcon e="❌" size={30} style={{verticalAlign:"-5px",marginLeft:6}}/>
          </div>
        )}

        {/* ─── HEADER : chrono dominant ─── */}
        <div style={{
          position:"relative", flexShrink:0,
          padding:"10px 12px 8px",
          borderBottom:"1px solid #1a2238",
          background:"linear-gradient(180deg, rgba(10,15,28,0.92) 0%, rgba(5,8,16,0.6) 100%)",
          backdropFilter:"blur(8px)",
        }}>
          {/* Top row : abandon discret + compteur erreurs */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
            <button onClick={abandonner} style={{
              background:"transparent", border:"1px solid #3a1a1a",
              color:"#6b1a1a", cursor:"pointer",
              fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:6,
              letterSpacing:1, opacity:.7,
            }}>
              <EmoIcon e="⚠" size={10} style={{verticalAlign:"-1px",marginRight:4}}/>ABANDON
            </button>
            <div style={{
              fontSize:10, fontWeight:800,
              color: errors>0 ? "#ef4444" : "#475569",
              letterSpacing:1.5,
              padding:"3px 9px", borderRadius:6,
              background: errors>0 ? "#3a0a0a55" : "transparent",
              border: errors>0 ? "1px solid #ef444466" : "1px solid transparent",
            }}>
              {errors > 0 ? <EmoText s={`❌ ${errors} ERREUR${errors>1?"S":""}`} size={10} gap={4}/> : <EmoText s="✓ ZÉRO ERREUR" size={10} gap={4}/>}
            </div>
          </div>

          {/* CHRONO MASSIF */}
          <div style={{
            textAlign:"center",
            fontWeight:900,
            fontSize:62,
            lineHeight:1,
            color: chronoColor,
            fontVariantNumeric:"tabular-nums",
            letterSpacing:1,
            fontFamily:"Inter, system-ui, sans-serif",
            textShadow:`0 0 ${chronoIntensity}px ${chronoColor}cc, 0 0 ${chronoIntensity*2}px ${chronoGlow}66`,
            transition:"color .4s, text-shadow .4s",
            padding:"4px 0 2px",
          }}>
            <EmoIcon e="⏱" size={48} color={chronoColor} style={{verticalAlign:"-6px",marginRight:8}}/>{formatChrono(elapsed)}
          </div>

          {/* Volée X/N + barre de progression */}
          <div style={{ marginTop:8 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
              <span style={{ fontSize:10, fontWeight:900, color:"#a78bfa", letterSpacing:2.5 }}>
                <EmoIcon e="⚡" size={10} color="#a78bfa" style={{verticalAlign:"-1px",marginRight:4}}/>VOLÉE {currentIdx + 1} / {volees.length}
              </span>
              <span style={{ fontSize:9, color:"#475569", letterSpacing:1, fontWeight:700 }}>
                {Math.round(progress)}%
              </span>
            </div>
            <div style={{
              height:4, borderRadius:3,
              background:"#0a0f1a",
              border:"1px solid #1a2238",
              overflow:"hidden",
              position:"relative",
            }}>
              <div style={{
                width:`${progress}%`, height:"100%",
                background:"linear-gradient(90deg,#60a5fa,#a78bfa,#60a5fa)",
                backgroundSize:"200% 100%",
                transition:"width .35s cubic-bezier(.4,1,.6,1)",
                animation:"scoreurProgress 2s ease-in-out infinite",
                boxShadow:"0 0 8px #a78bfaaa",
              }}/>
            </div>
          </div>
        </div>

        {/* ─── ZONE PRINCIPALE ─── */}
        <div style={{
          flex:1, display:"flex", flexDirection:"column",
          justifyContent:"space-between", padding:"14px 14px 10px",
          overflow:"hidden", position:"relative",
        }}>
          {/* ─── HERO VOLLEY BLOCK ─── */}
          <div key={`vol-${volleyKey}`} style={{
            position:"relative", overflow:"hidden",
            background:"radial-gradient(ellipse at center,#0a142e 0%,#06091a 60%,#020308 100%)",
            border:"2px solid #60a5fa",
            borderRadius:20, padding:"22px 16px 18px",
            textAlign:"center",
            boxShadow:"inset 0 0 50px #60a5fa1a, 0 0 30px #60a5fa44, 0 0 60px #a78bfa22",
            animation:"scoreurVolleyIn .35s cubic-bezier(.34,1.56,.64,1) both",
          }}>
            {/* Scan vertical décoratif */}
            <div aria-hidden style={{
              position:"absolute", left:0, right:0, height:40,
              background:"linear-gradient(180deg,transparent,#60a5fa18,transparent)",
              animation:"scoreurBgScan 3s linear infinite",
              pointerEvents:"none",
            }}/>
            <div style={{
              fontSize:9, fontWeight:900, letterSpacing:4,
              color:"#60a5fa", marginBottom:10, textTransform:"uppercase",
              textShadow:"0 0 8px #60a5fa88",
            }}>
              <EmoIcon e="🎯" size={9} color="#60a5fa" style={{verticalAlign:"-1px",marginRight:4}}/>Volée à calculer
            </div>
            {/* Segments fléchettes colorés */}
            <div style={{
              display:"flex", justifyContent:"center", alignItems:"center",
              gap:"clamp(6px,3vw,14px)", flexWrap:"wrap",
              fontFamily:"Inter, system-ui, sans-serif",
            }}>
              {segments.map((seg, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span style={{ fontSize:30, color:"#334155", fontWeight:900 }}>·</span>}
                  <span style={{
                    fontSize:"clamp(34px,9vw,48px)",
                    fontWeight:900, lineHeight:1,
                    color: seg.color,
                    textShadow:`0 0 18px ${seg.glow}aa, 0 0 36px ${seg.glow}44`,
                    fontVariantNumeric:"tabular-nums",
                    letterSpacing:.5,
                  }}>
                    {seg.value}
                  </span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* ─── SCORE AVANT VOLÉE (réduit ~30%) ─── */}
          <div style={{ margin:"10px 0", textAlign:"center" }}>
            <div style={{ fontSize:9, color:"#475569", letterSpacing:2, marginBottom:2, fontWeight:700 }}>
              SCORE AVANT
            </div>
            <div style={{
              fontSize:36, fontWeight:900, color:"#cbd5e1",
              lineHeight:1, fontVariantNumeric:"tabular-nums",
              textShadow:"0 0 12px #64748b44",
              letterSpacing:1,
            }}>
              {remaining}
            </div>
          </div>

          {/* ─── ZONE RÉPONSE ─── */}
          <div>
            <div style={{ textAlign:"center", fontSize:10, color:"#475569", marginBottom:6, letterSpacing:2, fontWeight:700 }}>
              SCORE RESTANT ?
            </div>

            {/* Champ + bouton valider */}
            <div style={{ display:"flex", gap:8, alignItems:"stretch", marginBottom:10 }}>
              <div style={{
                flex:1, position:"relative",
                background:"linear-gradient(135deg,#080a14,#0d1020)",
                border:`2px solid ${input ? "#a78bfa" : "#1a2238"}`,
                borderRadius:14, padding:"12px 18px",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow: input
                  ? "inset 0 0 24px #a78bfa33, 0 0 0 1px #a78bfa55, 0 0 18px #60a5fa44"
                  : "inset 0 2px 6px #00000099",
                transition:"all .2s",
                minHeight:54,
              }}>
                <span style={{
                  fontSize:32, fontWeight:900,
                  color: input ? "#fff" : "#334155",
                  fontVariantNumeric:"tabular-nums",
                  letterSpacing:2,
                  textShadow: input ? "0 0 16px #a78bfaaa" : "none",
                }}>
                  {input || "—"}
                </span>
                {/* Curseur clignotant */}
                {input && (
                  <span style={{
                    display:"inline-block", width:3, height:30, marginLeft:4,
                    background:"#a78bfa", borderRadius:2,
                    boxShadow:"0 0 8px #a78bfacc",
                    animation:"scoreurCursorBlink 1s steps(1) infinite",
                  }}/>
                )}
              </div>
              <button onClick={valider} disabled={!input}
                style={{
                  background: input
                    ? "linear-gradient(135deg,#22c55e 0%,#16a34a 50%,#15803d 100%)"
                    : "linear-gradient(135deg,#0a0f1a,#06090f)",
                  border:"none", borderRadius:14, padding:"0 18px",
                  fontWeight:900, fontSize:13, letterSpacing:1.5,
                  color: input ? "#fff" : "#334155",
                  cursor: input ? "pointer" : "not-allowed",
                  touchAction:"manipulation",
                  boxShadow: input
                    ? "0 0 24px #22c55e88, inset 0 1px 0 #ffffff44, inset 0 -3px 0 #14532d99"
                    : "inset 0 2px 4px #00000066",
                  minWidth:88,
                  textShadow: input ? "0 1px 2px #00000055" : "none",
                  transition:"all .15s",
                }}>
                <EmoIcon e="✓" size={15} strokeWidth={3} style={{verticalAlign:"-2px",marginRight:5}}/>GO
              </button>
            </div>

            {/* ─── CLAVIER GAMING ─── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
              {["1","2","3","4","5","6","7","8","9"].map(n => (
                <button key={n} className="scoreur-key"
                  onPointerDown={e=>{ e.preventDefault(); if(input.length<3) { setInput(input+n); if(navigator.vibrate) navigator.vibrate(8); } }}
                  style={{
                    borderRadius:12, border:"1px solid #1e293b",
                    background:"linear-gradient(180deg,#1a2030 0%,#0f1422 50%,#080b14 100%)",
                    color:"#e2e8f0", fontSize:24, fontWeight:800,
                    cursor:"pointer",
                    WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
                    boxShadow:"inset 0 1px 0 #ffffff15, inset 0 -3px 0 #00000088, 0 3px 8px #00000077",
                    padding:"14px 0",
                    fontFamily:"Inter, system-ui, sans-serif",
                    textShadow:"0 1px 2px #00000088",
                  }}>
                  {n}
                </button>
              ))}
              <button className="scoreur-key"
                onPointerDown={e=>{ e.preventDefault(); setInput(p=>p.slice(0,-1)); if(navigator.vibrate) navigator.vibrate(8); }}
                style={{
                  borderRadius:12, border:"1px solid #4c1010",
                  background:"linear-gradient(180deg,#3a0a0a 0%,#1f0608 50%,#100406 100%)",
                  color:"#ef4444", fontSize:22, fontWeight:800, cursor:"pointer",
                  WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
                  boxShadow:"inset 0 1px 0 #ffffff15, inset 0 -3px 0 #00000088, 0 3px 8px #00000077, 0 0 8px #ef444433",
                  padding:"14px 0",
                  textShadow:"0 0 6px #ef444466",
                }}>
                ⌫
              </button>
              <button className="scoreur-key"
                onPointerDown={e=>{ e.preventDefault(); if(input.length<3) { setInput(input+"0"); if(navigator.vibrate) navigator.vibrate(8); } }}
                style={{
                  borderRadius:12, border:"1px solid #1e293b",
                  background:"linear-gradient(180deg,#1a2030 0%,#0f1422 50%,#080b14 100%)",
                  color:"#e2e8f0", fontSize:24, fontWeight:800, cursor:"pointer",
                  WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
                  boxShadow:"inset 0 1px 0 #ffffff15, inset 0 -3px 0 #00000088, 0 3px 8px #00000077",
                  padding:"14px 0",
                  textShadow:"0 1px 2px #00000088",
                }}>
                0
              </button>
              <button className="scoreur-key"
                onPointerDown={e=>{ e.preventDefault(); valider(); }} disabled={!input}
                style={{
                  borderRadius:12, border:"none",
                  background: input
                    ? "linear-gradient(180deg,#22c55e 0%,#16a34a 50%,#15803d 100%)"
                    : "linear-gradient(180deg,#0f1422,#080b14)",
                  color: input ? "#fff" : "#334155",
                  fontSize:26, fontWeight:900,
                  cursor: input ? "pointer" : "not-allowed",
                  WebkitTapHighlightColor:"transparent", touchAction:"manipulation",
                  boxShadow: input
                    ? "inset 0 1px 0 #ffffff44, inset 0 -3px 0 #14532d99, 0 3px 12px #22c55e88"
                    : "inset 0 -3px 0 #00000066, 0 3px 8px #00000077",
                  padding:"14px 0",
                  textShadow: input ? "0 1px 2px #00000055" : "none",
                }}>
                <EmoIcon e="✓" size={18} strokeWidth={3}/>
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
            <div style={{ fontSize:11,color:C.muted,letterSpacing:1,marginBottom:4 }}>CLASSEMENT DU SCOREUR SPEEDRUN</div>
            <div style={{ fontSize:11,color:C.muted }}><EmoIcon e="🥇" size={11} color="#fbbf24" style={{verticalAlign:"-2px",marginRight:4}}/>Le vainqueur reçoit <b style={{ color:C.yellow }}>+20 DRIX</b> · <EmoIcon e="💎" size={11} color={C.blue} style={{verticalAlign:"-2px",margin:"0 3px"}}/><b style={{ color:C.blue }}>+5 DRIX</b> participation · publication à 00:01</div>
          </div>

          {loadingScores ? (
            <div style={{ textAlign:"center",padding:40,color:C.muted }}>Chargement...</div>
          ) : scores.length === 0 ? (
            <div style={{ textAlign:"center",padding:40,color:C.muted }}>Aucun score pour aujourd'hui encore.</div>
          ) : (
            <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden" }}>
              {scores.map((s, i) => {
                const isMe = s.joueur_id === joueur?.id;
                const isAbandon = (s.statut || "termine") === "abandonne";
                const medals = ["🥇","🥈","🥉"];
                // Rank uniquement pour les terminés
                const completedCount = scores.filter(x => (x.statut || "termine") === "termine").length;
                const rankIdx = !isAbandon ? i : -1;
                return (
                  <div key={i} style={{
                    display:"flex",alignItems:"center",padding:"11px 14px",gap:10,
                    borderBottom:i<scores.length-1?`1px solid ${C.border}22`:"none",
                    background: isMe ? `${C.blue}18` : isAbandon ? `${C.red}08` : "transparent",
                    opacity: isAbandon ? .8 : 1,
                  }}>
                    <div style={{ width:28,textAlign:"center",fontWeight:900,fontSize:rankIdx<3 && !isAbandon ?18:13, color: isAbandon ? C.red : (rankIdx<3 ? C.yellow : C.muted), flexShrink:0 }}>
                      {isAbandon ? <EmoIcon e="✗" size={16} strokeWidth={3}/> : (rankIdx < 3 ? <EmoIcon e={medals[rankIdx]} size={18}/> : rankIdx+1)}
                    </div>
                    <div style={{ flex:1,fontWeight:isMe?800:600,fontSize:14,color: isAbandon ? "#94a3b8" : (isMe?C.blue:C.text),overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                      {s.joueur_pseudo}{isMe?" (toi)":""}
                    </div>
                    {!isAbandon && s.erreurs > 0 && <div style={{ fontSize:11,color:C.red }}>{s.erreurs} err.</div>}
                    {isAbandon ? (
                      <div style={{ fontWeight:800,fontSize:12,color:C.red,fontStyle:"italic",flexShrink:0,letterSpacing:.5 }}>
                        Abandon
                      </div>
                    ) : (
                      <div style={{ fontWeight:900,fontSize:15,color:rankIdx===0?C.yellow:isMe?C.blue:C.text,fontVariantNumeric:"tabular-nums",flexShrink:0 }}>
                        {formatChrono(s.temps_ms)}
                      </div>
                    )}
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
    const { tempsMs, nbVolees, errors: errs, participDrix } = finalResults;
    return (
      <div style={{ position:"fixed",inset:0,zIndex:200,background:C.bg,display:"flex",flexDirection:"column",overflow:"hidden" }}>
        <div style={{ background:C.card,borderBottom:`1px solid ${C.border}`,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,flexShrink:0 }}>
          <button onClick={()=>setPage("jeux-sans")} style={{ display:"flex",alignItems:"center",gap:6,background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,padding:0 }}><ArrowLeft size={16}/> Quitter</button>
          <div style={{ flex:1,fontWeight:800,fontSize:16,color:C.blue,display:"flex",alignItems:"center",gap:8 }}><Zap size={16} color={C.blue}/> Run terminé</div>
        </div>

        <div style={{ flex:1,overflowY:"auto",padding:"16px 14px 40px",display:"flex",flexDirection:"column",gap:12 }}>
          {/* Hero temps */}
          <div style={{ background:"linear-gradient(135deg,#0a1428,#0f1f32)",border:`2px solid ${C.blue}`,borderRadius:20,padding:"24px 16px",textAlign:"center",boxShadow:`0 0 40px ${C.blue}33` }}>
            <div style={{ marginBottom:6,display:"flex",justifyContent:"center" }}><EmoIcon e="🏆" size={48} color="#fbbf24"/></div>
            <div style={{ fontSize:10,letterSpacing:3,color:C.blue,fontWeight:900,marginBottom:6,textTransform:"uppercase" }}>Temps final</div>
            <div style={{ fontSize:46,fontWeight:900,color:C.blue,lineHeight:1,fontVariantNumeric:"tabular-nums",textShadow:`0 0 24px ${C.blue}88` }}>
              <EmoIcon e="⏱" size={40} color={C.blue} style={{verticalAlign:"-5px",marginRight:8}}/>{formatChrono(tempsMs)}
            </div>
            {errs > 0 && <div style={{ marginTop:8,fontSize:11,color:C.red }}>(pénalités +{errs*3}s pour {errs} erreur{errs>1?"s":""})</div>}
          </div>

          {/* Stats */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
            <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px",textAlign:"center" }}>
              <div style={{ fontSize:11,color:C.muted,marginBottom:3 }}><EmoText s="🎯 Volées" size={11} gap={4}/></div>
              <div style={{ fontSize:24,fontWeight:900,color:C.text }}>{nbVolees}</div>
            </div>
            <div style={{ background:C.card,border:`1px solid ${errs===0?C.green:C.red}33`,borderRadius:14,padding:"12px",textAlign:"center" }}>
              <div style={{ fontSize:11,color:C.muted,marginBottom:3,display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}><EmoIcon e={errs===0?"✅":"❌"} size={11} color={errs===0?C.green:C.red}/>Erreurs</div>
              <div style={{ fontSize:24,fontWeight:900,color:errs===0?C.green:C.red }}>{errs}</div>
            </div>
          </div>

          {/* 💎 +5 DRIX participation (versés immédiatement) */}
          {participDrix > 0 && (
            <div style={{ background:"linear-gradient(135deg,#14532d33,#0d0d14)", border:`1px solid ${C.green}55`, borderRadius:14, padding:"12px", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <EmoIcon e="💎" size={18} color={C.green}/>
              <span style={{ fontSize:16, fontWeight:900, color:C.green }}>+{participDrix} DRIX</span>
              <span style={{ fontSize:12, color:C.muted }}>participation</span>
            </div>
          )}

          {/* Boutons */}
          <button onClick={openLeaderboard} style={{ background:`linear-gradient(135deg,${C.yellow},#d97706)`,border:"none",borderRadius:14,padding:"14px",color:"#3b1f00",fontWeight:900,fontSize:15,cursor:"pointer",boxShadow:`0 4px 20px ${C.yellow}55`,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
            <Trophy size={16}/> Voir le classement
          </button>
          <button onClick={()=>setPage("jeux-sans")} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px",color:C.muted,fontWeight:700,fontSize:14,cursor:"pointer" }}>
            <EmoIcon e="🏠" size={14} style={{verticalAlign:"-2px",marginRight:6}}/>Retour aux mini-jeux
          </button>

          {/* La publication sur le Comptoir se fait automatiquement à 00:01 (uniquement le vainqueur) */}
        </div>
      </div>
    );
  }

  return null;
};

// ─── Récompense quotidienne du Scoreur Speedrun (appelée au démarrage + à minuit).
// La PARTICIPATION (+5) est versée immédiatement en fin de partie (terminerRun). Ici on ne
// distribue QUE le +20 du VAINQUEUR d'hier, via un claim atomique GLOBAL (calque du Finish
// Speedrun) : robuste même si le vainqueur ne rouvre pas l'app lui-même.
export const checkYesterdayScoreurReward = async (joueur, onWin) => {
  // Garde anti-rejouée : une seule distribution par jour (peu importe qui ouvre l'app).
  const today = todayLocal();
  if (localStorage.getItem("dp_scoreur_last_check") === today) return null;
  localStorage.setItem("dp_scoreur_last_check", today);

  const yest = yesterdayLocal();
  // CLAIM ATOMIQUE de toute la journée d'hier (runs terminés, temps>0) : un seul PATCH flippe
  // rewarded false→true et renvoie les lignes verrouillées. Vide → déjà distribué → stop.
  // Vainqueur = meilleur temps PARMI ces lignes → double crédit impossible (même multi-onglets).
  const claimed = await sb(
    `chrono_scoreur_scores?date_jour=eq.${yest}&rewarded=eq.false&statut=eq.termine&temps_ms=gt.0`,
    { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ rewarded: true }) }
  );
  if (!Array.isArray(claimed) || claimed.length === 0) return null;
  const winner = claimed.reduce((best, s) => (best == null || s.temps_ms < best.temps_ms ? s : best), null);
  if (!winner) return null;

  // +20 DRIX au vainqueur (la participation +5 a déjà été versée en fin de partie).
  const jArr = await sb(`joueurs?id=eq.${winner.joueur_id}&select=id,drix,photo`);
  const j = jArr?.[0];
  if (!j) return null;
  const newDrix = (j.drix || 1000) + 20;
  await sb(`joueurs?id=eq.${j.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ drix: newDrix }) });
  await sb("drix_mouvements", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({
    joueur_id: j.id, joueur_pseudo: winner.joueur_pseudo,
    adversaire_pseudo: "⏱ Scoreur Speedrun — 🥇 Vainqueur du jour",
    variation: 20, drix_avant: j.drix || 1000, drix_apres: newDrix,
    resultat: "victoire", date: Date.now(),
  }) });

  // Post Comptoir — félicitation vainqueur (format spécial __CHRONO_SCOREUR__)
  const dateFr = yest.split("-").reverse().join("/");
  const payload = { type: "chrono_scoreur_vainqueur", temps_ms: winner.temps_ms, drix: 20, date_jour: yest };
  const contenu = `__CHRONO_SCOREUR__|${JSON.stringify(payload)}\n\n` +
    `🏆 Scoreur Speedrun — Vainqueur du ${dateFr}\n` +
    `👑 ${winner.joueur_pseudo} remporte le défi en ${formatChrono(winner.temps_ms)} !\n` +
    `🥇 +20 DRIX`;
  sb("wall_posts", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({
    joueur_id: winner.joueur_id, joueur_pseudo: winner.joueur_pseudo, joueur_photo: j.photo || null,
    contenu, date: Date.now(),
  }) }).catch(() => {});

  // Notifier / retourner si le joueur courant est le vainqueur (maj DRIX locale côté App).
  if (joueur?.id && joueur.id === winner.joueur_id) {
    if (onWin) onWin({ pseudo: winner.joueur_pseudo, drix: 20 });
    return { drix: 20, label: "🥇 Vainqueur du jour" };
  }
  return null;
};
