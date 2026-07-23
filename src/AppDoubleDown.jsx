// src/AppDoubleDown.jsx
// ─────────────────────────────────────────────────────────────────────────────
// DOUBLE DOWN — 9 manches, une cible imposée par manche. Les fléchettes qui
// touchent la cible ajoutent leurs points ; si AUCUNE des 3 fléchettes ne touche
// la cible → le score du joueur est DIVISÉ PAR DEUX (le « double down »).
// 1 à 8 joueurs sur un seul téléphone. Départ à 40 points. Le score est toujours
// RECALCULÉ à partir de l'historique des fléchettes (aucune dérive possible).
// Style Dart Point sombre + néon. Pas de son (voulu), vibrations optionnelles.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { dbJ } from "./AppJoueurs";
import { ConfettiBurst } from "./DPLottie";
import confettiData from "./lottie/confetti.json";

const C = {
  bg: "#0a0a12", card: "#12121c", card2: "#0b0b12", border: "#26263a", text: "#f1f5f9", muted: "#8b93a7",
  green: "#22c55e", orange: "#f97316", red: "#ef4444", violet: "#a78bfa", blue: "#60a5fa", gold: "#fbbf24",
};

const START = 40;

// Les 9 manches, dans l'ordre imposé.
const ROUNDS = [
  { k: "15",     num: 15,   short: "15", label: "SECTEUR 15",            kind: "num" },
  { k: "16",     num: 16,   short: "16", label: "SECTEUR 16",            kind: "num" },
  { k: "double", num: null, short: "D",  label: "N'IMPORTE QUEL DOUBLE", kind: "double" },
  { k: "17",     num: 17,   short: "17", label: "SECTEUR 17",            kind: "num" },
  { k: "18",     num: 18,   short: "18", label: "SECTEUR 18",            kind: "num" },
  { k: "triple", num: null, short: "T",  label: "N'IMPORTE QUEL TRIPLE", kind: "triple" },
  { k: "19",     num: 19,   short: "19", label: "SECTEUR 19",            kind: "num" },
  { k: "20",     num: 20,   short: "20", label: "SECTEUR 20",            kind: "num" },
  { k: "bull",   num: null, short: "B",  label: "BULL",                  kind: "bull" },
];

// ── Moteur de score (fonctions pures — le cœur du jeu) ──
// Une fléchette : { m:"S"|"D"|"T"|"BO"|"BI"|"off", n:1..20|null }  (BO=bull ext 25, BI=bull int 50)
const dartValue = (d) => {
  if (!d) return 0;
  if (d.m === "BI") return 50;
  if (d.m === "BO") return 25;
  if (d.m === "off") return 0;
  const mm = d.m === "T" ? 3 : d.m === "D" ? 2 : d.m === "S" ? 1 : 0;
  return mm * (d.n || 0);
};
const dartValid = (d, round) => {
  if (!d || d.m === "off") return false;
  if (round.kind === "double") return d.m === "D";                    // tous les doubles (pas les bulls)
  if (round.kind === "triple") return d.m === "T";                    // tous les triples
  if (round.kind === "bull")   return d.m === "BO" || d.m === "BI";   // bull ext/int uniquement
  return (d.m === "S" || d.m === "D" || d.m === "T") && d.n === round.num; // toutes les zones du numéro
};
const turnGain = (darts, round) => (darts || []).reduce((s, d) => s + (dartValid(d, round) ? dartValue(d) : 0), 0);
const turnHasValid = (darts, round) => (darts || []).some((d) => dartValid(d, round));
// Applique une manche jouée à un score : +points valides, ou ÷2 si aucune cible touchée.
const applyRound = (score, darts, round) => {
  if (!darts || !darts.length) return score;
  return turnHasValid(darts, round) ? score + turnGain(darts, round) : score / 2;
};
// Score EXACT après la manche idx (dérivé de l'historique).
const scoreAfter = (rounds, idx) => {
  let s = START;
  for (let i = 0; i <= idx; i++) if (rounds[i]) s = applyRound(s, rounds[i].darts, ROUNDS[i]);
  return s;
};
const currentScore = (rounds) => scoreAfter(rounds, 8);
// Résultat d'une case du tableau : null (pas jouée) | {gain} | {halved}
const roundCell = (rounds, ri) => {
  const r = rounds[ri]; if (!r || !r.darts || !r.darts.length) return null;
  return turnHasValid(r.darts, ROUNDS[ri]) ? { gain: turnGain(r.darts, ROUNDS[ri]), halved: false } : { halved: true };
};

// Affichage d'un nombre : décimales EXACTES en français, sans arrondi (40 → "40",
// 47.5 → "47,5", 13.75 → "13,75", 0.078125 → "0,078125"). Tous les scores du jeu sont
// un entier ÷ 2^k (k ≤ 9 manches) donc exactement représentables → toFixed(9) est exact.
const fmt = (n) => { if (Number.isInteger(n)) return String(n); return n.toFixed(9).replace(/0+$/, "").replace(/\.$/, "").replace(".", ","); };

// Classement (égalités = même rang).
const ranking = (players) => {
  const arr = players.map((p, i) => ({ i, name: p.name, score: currentScore(p.rounds) }));
  arr.sort((a, b) => b.score - a.score);
  let rank = 0, prev = null;
  arr.forEach((x, idx) => { if (prev === null || x.score !== prev) { rank = idx + 1; prev = x.score; } x.rank = rank; });
  return arr;
};

// Vibrations (réglage local dd_vib).
const vibOn = () => { try { return localStorage.getItem("dd_vib") !== "off"; } catch { return true; } };
const vib = (pat) => { if (!vibOn()) return; try { navigator.vibrate && navigator.vibrate(pat); } catch { /* */ } };

// Sauvegarde auto (localStorage).
const SAVE_KEY = "dd_save";
const loadSave = () => { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); return (s && s.players && s.players.length && !s.finished) ? s : null; } catch { return null; } };
const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch { /* */ } };

const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

const btnMain = { background: `linear-gradient(135deg,${C.green},#16a34a)`, border: "none", borderRadius: 12, padding: "14px 16px", color: "#04140e", fontWeight: 900, fontSize: 15, cursor: "pointer", touchAction: "manipulation" };
const btnSec = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "13px 14px", color: C.text, fontWeight: 700, fontSize: 14, cursor: "pointer", touchAction: "manipulation" };

// ── Libellé « cible atteinte » / « aucun X touché » ──
const targetName = (round) => round.kind === "double" ? "double" : round.kind === "triple" ? "triple" : round.kind === "bull" ? "bull" : round.num;
const missMsg = (round) => round.kind === "num" ? `AUCUN ${round.num} TOUCHÉ` : round.kind === "double" ? "AUCUN DOUBLE TOUCHÉ" : round.kind === "triple" ? "AUCUN TRIPLE TOUCHÉ" : "AUCUN BULL TOUCHÉ";
// Étiquette courte d'une fléchette (S15, T20, D18, 25, 50, ✗).
const dartLabel = (d) => d.m === "off" ? "✗" : d.m === "BO" ? "25" : d.m === "BI" ? "50" : d.m + d.n;

// ─────────────────────────────────────────────────────────────────────────────
// Tutoriel de 1re utilisation (5 écrans)
// ─────────────────────────────────────────────────────────────────────────────
function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const steps = [
    ["🎯", "40 points au départ", "Chaque joueur commence la partie avec 40 points."],
    ["🔀", "Une cible par manche", "À chaque manche, une cible différente est imposée : 15, 16, un double, 17, 18, un triple, 19, 20, puis le Bull."],
    ["➕", "Touche la cible = tu marques", "Les fléchettes qui atteignent la cible ajoutent leur valeur à ton score."],
    ["➗", "Rate la manche = ÷2", "Si AUCUNE de tes 3 fléchettes ne touche la cible, ton score est divisé par deux !"],
    ["🏆", "Le plus haut score gagne", "Après la manche Bull, le joueur qui a le plus de points remporte la partie."],
  ];
  const [emo, title, text] = steps[step];
  const last = step === steps.length - 1;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000c", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "26px 22px", maxWidth: 340, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 50, marginBottom: 10 }}>{emo}</div>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>{title}</div>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 18, minHeight: 92 }}>{text}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18 }}>
          {steps.map((_, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i === step ? C.orange : "#334155" }} />)}
        </div>
        {last ? (
          <>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, color: C.muted, marginBottom: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)} style={{ accentColor: C.orange, width: 16, height: 16 }} /> Ne plus afficher ce tutoriel
            </label>
            <button onClick={() => { if (dontShow) { try { localStorage.setItem("dd_tuto", "1"); } catch { /* */ } } onClose(); }} style={{ width: "100%", background: `linear-gradient(135deg,${C.orange},#ea580c)`, color: "#1a0a02", border: "none", borderRadius: 12, padding: "14px", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>COMMENCER →</button>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ ...btnSec, padding: "13px 16px" }}>Passer</button>
            <button onClick={() => setStep(s => s + 1)} style={{ ...btnMain, flex: 1, padding: "13px", background: `linear-gradient(135deg,${C.orange},#ea580c)`, color: "#1a0a02" }}>Suivant →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Interrupteur vibrations ──
function VibToggle() {
  const [on, setOn] = useState(vibOn());
  return (
    <button onClick={() => { const v = !on; try { localStorage.setItem("dd_vib", v ? "on" : "off"); } catch { /* */ } setOn(v); if (v) vib(20); }}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
      <span>📳 Vibrations</span>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: .5, padding: "3px 10px", borderRadius: 999, background: on ? "#22c55e22" : "#64748b22", color: on ? "#4ade80" : "#94a3b8", border: `1px solid ${on ? "#22c55e55" : "#64748b44"}` }}>{on ? "ON" : "OFF"}</span>
    </button>
  );
}

// ── Barre de progression des 9 manches ──
function ProgressBar({ roundIdx }) {
  return (
    <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "nowrap" }}>
      {ROUNDS.map((r, i) => {
        const done = i < roundIdx, active = i === roundIdx;
        return (
          <div key={r.k} style={{
            minWidth: active ? 32 : 26, height: active ? 34 : 28, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 900, fontSize: active ? 14 : 12,
            background: active ? C.orange : done ? "#14351f" : C.card,
            color: active ? "#1a0a02" : done ? C.green : C.muted,
            border: `1px solid ${active ? C.orange : done ? "#14532d" : C.border}`,
            boxShadow: active ? `0 0 12px ${C.orange}88` : "none",
            transition: "all .2s",
          }}>{done ? "✓" : r.short}</div>
        );
      })}
    </div>
  );
}

// ── Tableau récapitulatif (défilable horizontalement) ──
function PlayersTable({ players, activeIdx }) {
  const rk = ranking(players);
  const rankOf = {}; rk.forEach(x => { rankOf[x.i] = x.rank; });
  const th = { padding: "7px 6px", fontSize: 11, fontWeight: 800, color: C.muted, textAlign: "center", whiteSpace: "nowrap" };
  const td = { padding: "8px 6px", fontSize: 12, textAlign: "center", whiteSpace: "nowrap", borderTop: `1px solid ${C.border}` };
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 460 }}>
          <thead>
            <tr style={{ background: C.card2 }}>
              <th style={{ ...th, textAlign: "left", position: "sticky", left: 0, background: C.card2, zIndex: 1, minWidth: 96 }}>Joueur</th>
              {ROUNDS.map(r => <th key={r.k} style={th}>{r.short}</th>)}
              <th style={{ ...th, color: C.text, position: "sticky", right: 0, background: C.card2, zIndex: 1 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, pi) => {
              const isA = pi === activeIdx;
              return (
                <tr key={pi} style={{ background: isA ? "#14351f22" : "transparent" }}>
                  <td style={{ ...td, textAlign: "left", position: "sticky", left: 0, background: isA ? "#101b14" : C.card, zIndex: 1, fontWeight: 800 }}>
                    <span style={{ color: rankOf[pi] === 1 ? C.gold : C.text }}>{rankOf[pi] === 1 ? "👑 " : ""}{p.name}</span>
                  </td>
                  {ROUNDS.map((r, ri) => {
                    const c = roundCell(p.rounds, ri);
                    return <td key={r.k} style={{ ...td, color: !c ? "#3a3a44" : c.halved ? C.red : C.green, fontWeight: 800 }}>{!c ? "·" : c.halved ? "÷2" : "+" + c.gain}</td>;
                  })}
                  <td style={{ ...td, position: "sticky", right: 0, background: isA ? "#101b14" : C.card, fontWeight: 900, color: C.text, fontSize: 13 }}>{fmt(currentScore(p.rounds))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Pavé de saisie d'une fléchette ──
function DartPad({ round, mult, setMult, onDart, onUndo, canUndo }) {
  const mGlow = (m) => (round.kind === "double" && m === "D") || (round.kind === "triple" && m === "T");
  const numGlow = (n) => round.kind === "num" && n === round.num;
  const bullGlow = round.kind === "bull";
  const mBtn = (m, label, col) => {
    const sel = mult === m, glow = mGlow(m);
    return (
      <button onClick={() => setMult(m)} style={{
        flex: 1, padding: "11px 4px", borderRadius: 10, fontWeight: 900, fontSize: 13, cursor: "pointer", touchAction: "manipulation",
        border: `2px solid ${sel ? col : glow ? col : C.border}`, background: sel ? col : C.card, color: sel ? "#08080e" : col,
        boxShadow: glow && !sel ? `0 0 10px ${col}77` : "none",
      }}>{label}</button>
    );
  };
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        {mBtn("S", "SIMPLE", "#94a3b8")}{mBtn("D", "DOUBLE", C.violet)}{mBtn("T", "TRIPLE", C.orange)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map(n => {
          const glow = numGlow(n);
          return (
            <button key={n} onClick={() => onDart({ m: mult, n })} style={{
              padding: "13px 0", borderRadius: 9, fontWeight: 800, fontSize: 15, cursor: "pointer", touchAction: "manipulation",
              border: `1px solid ${glow ? C.orange : C.border}`, background: glow ? "#2a1608" : "#14141e", color: glow ? C.orange : C.text,
              boxShadow: glow ? `0 0 10px ${C.orange}66` : "none",
            }}>{n}</button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={() => onDart({ m: "BO", n: null })} style={{ flex: 1, padding: "12px 0", borderRadius: 9, border: `1px solid ${bullGlow ? C.green : C.border}`, background: bullGlow ? "#0e2a18" : "#14141e", color: bullGlow ? "#4ade80" : "#cbd5e1", fontWeight: 800, fontSize: 13, cursor: "pointer", touchAction: "manipulation", boxShadow: bullGlow ? `0 0 10px ${C.green}66` : "none" }}>BULL 25</button>
        <button onClick={() => onDart({ m: "BI", n: null })} style={{ flex: 1, padding: "12px 0", borderRadius: 9, border: `1px solid ${bullGlow ? C.green : C.border}`, background: bullGlow ? "#0e2a18" : "#14141e", color: bullGlow ? "#4ade80" : "#cbd5e1", fontWeight: 800, fontSize: 13, cursor: "pointer", touchAction: "manipulation", boxShadow: bullGlow ? `0 0 10px ${C.green}66` : "none" }}>BULL 50</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={() => onDart({ m: "off", n: null })} style={{ flex: 1, padding: "12px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: "#14141e", color: C.muted, fontWeight: 800, fontSize: 13, cursor: "pointer", touchAction: "manipulation" }}>HORS CIBLE</button>
        <button onClick={onUndo} disabled={!canUndo} style={{ flex: 1, padding: "12px 0", borderRadius: 9, border: `1px solid ${canUndo ? "#f59e0b66" : C.border}`, background: "#14141e", color: canUndo ? "#f59e0b" : "#3a3a44", fontWeight: 800, fontSize: 13, cursor: canUndo ? "pointer" : "default", touchAction: "manipulation" }}>↩ Annuler</button>
      </div>
    </div>
  );
}

// ── Chips des 3 fléchettes du tour ──
function DartChips({ darts, round }) {
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 10 }}>
      {[0, 1, 2].map(i => {
        const d = darts[i];
        const valid = d && dartValid(d, round);
        return (
          <div key={i} style={{
            flex: 1, maxWidth: 92, height: 54, borderRadius: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            border: `1.5px solid ${!d ? C.border : valid ? C.green : "#3a3a44"}`,
            background: !d ? C.card2 : valid ? "#0e2a18" : "#151520",
          }}>
            {d ? <>
              <span style={{ fontWeight: 900, fontSize: 15, color: valid ? "#4ade80" : C.muted }}>{dartLabel(d)}</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: valid ? C.green : "#64748b" }}>{valid ? "+" + dartValue(d) : "0"}</span>
            </> : <span style={{ color: "#3a3a44", fontSize: 20 }}>·</span>}
          </div>
        );
      })}
    </div>
  );
}

// ── Confirmation d'abandon ──
function QuitModal({ onCancel, onQuit }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20, background: "#000c", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.card, border: `2px solid ${C.red}`, borderRadius: 16, padding: 24, maxWidth: 300, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Quitter la partie ?</div>
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>La partie en cours sera perdue.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card2, color: C.text, fontWeight: 700, cursor: "pointer" }}>Continuer</button>
          <button onClick={onQuit} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "#7f1d1d", color: "#fca5a5", fontWeight: 700, cursor: "pointer" }}>Quitter</button>
        </div>
      </div>
    </div>
  );
}

// ── Correction d'un tour DÉJÀ VALIDÉ (2 étapes : choisir le tour → ressaisir) ──
// N'affiche QUE les tours déjà enregistrés → jamais le tour en cours (celui-ci se
// corrige avec « ↩ Annuler »), donc aucun risque d'écrasement.
function CorrectionModal({ players, correct, setCorrect, onApply }) {
  if (correct.step === "pick") {
    const anyPlayed = players.some(p => p.rounds.some(Boolean));
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 30, background: "#000d", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16, maxWidth: 400, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: C.orange, fontWeight: 900, letterSpacing: .5 }}>CORRIGER UN TOUR</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>Choisis le tour déjà validé à corriger.</div>
          </div>
          {!anyPlayed && <p style={{ textAlign: "center", color: C.muted, fontSize: 13, padding: "12px 0" }}>Aucun tour validé pour le moment.</p>}
          {players.map((p, pi) => {
            const played = p.rounds.map((r, ri) => ({ r, ri })).filter(x => x.r);
            if (!played.length) return null;
            return (
              <div key={pi} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>{p.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                  {played.map(({ r, ri }) => { const c = roundCell(p.rounds, ri); return (
                    <button key={ri} onClick={() => setCorrect({ step: "edit", pIdx: pi, rIdx: ri, darts: [...r.darts], mult: "S" })}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "9px 11px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                      <span>{ROUNDS[ri].short}</span>
                      <span style={{ color: c.halved ? C.red : C.green, fontWeight: 900 }}>{c.halved ? "÷2" : "+" + c.gain}</span>
                    </button>
                  ); })}
                </div>
              </div>
            );
          })}
          <button onClick={() => setCorrect(null)} style={{ ...btnSec, width: "100%", marginTop: 4 }}>Fermer</button>
        </div>
      </div>
    );
  }
  // Étape « edit » : ressaisie des 3 fléchettes (pré-remplies avec le tour existant).
  const r = ROUNDS[correct.rIdx];
  const set = (patch) => setCorrect(c => ({ ...c, ...patch }));
  const addD = (d) => { if (correct.darts.length >= 3) return; set({ darts: [...correct.darts, d] }); };
  const undoD = () => set({ darts: correct.darts.slice(0, -1) });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 30, background: "#000d", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 18, padding: 16, maxWidth: 400, width: "100%", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div style={{ fontSize: 12, color: C.orange, fontWeight: 900, letterSpacing: .5 }}>CORRIGER LE TOUR</div>
          <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>{players[correct.pIdx].name} · cible {r.short}</div>
          <div style={{ fontSize: 12, color: C.muted }}>Ressaisis les 3 fléchettes de ce tour.</div>
        </div>
        <DartChips darts={correct.darts.concat([null, null, null]).slice(0, 3)} round={r} />
        <DartPad round={r} mult={correct.mult} setMult={(m) => set({ mult: m })} onDart={addD} onUndo={undoD} canUndo={correct.darts.length > 0} />
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={() => setCorrect({ step: "pick" })} style={{ ...btnSec, flex: "0 0 auto" }}>← Retour</button>
          <button onClick={() => onApply(correct.pIdx, correct.rIdx, correct.darts)} disabled={correct.darts.length !== 3} style={{ ...btnMain, flex: 1, opacity: correct.darts.length === 3 ? 1 : .5, background: `linear-gradient(135deg,${C.orange},#ea580c)`, color: "#1a0a02" }}>Valider la correction</button>
        </div>
      </div>
    </div>
  );
}

// ── Nombre qui « fond » de moitié (animation Double Down) ──
function HalveNumber({ from, to }) {
  const [val, setVal] = useState(from);
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDone(false);
    let raf, t0;
    const step = (t) => { if (!t0) t0 = t; const p = Math.min(1, (t - t0) / 700); setVal(from + (to - from) * p); if (p < 1) raf = requestAnimationFrame(step); else { setVal(to); setDone(true); } };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  // Pendant l'anim : valeur arrondie (lisible) ; une fois posée : valeur EXACTE.
  return <span>{done ? fmt(to) : fmt(Math.round(val * 10) / 10)}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────────────────────
export const DoubleDown = ({ setPage, joueur }) => {
  const [phase, setPhase] = useState("create");   // create | play | tiebreak | end
  const [stage, setStage] = useState("input");     // pendant play : input | turnRecap | roundRecap
  const [showTuto, setShowTuto] = useState(() => { try { return !localStorage.getItem("dd_tuto"); } catch { return true; } });
  const [resumable, setResumable] = useState(() => loadSave());
  const [showQuit, setShowQuit] = useState(false);

  // Écran de création
  const [count, setCount] = useState(2);
  const [names, setNames] = useState(() => { const a = Array(8).fill(""); if (joueur?.pseudo) a[0] = joueur.pseudo; return a; });
  const [orderMode, setOrderMode] = useState("manual");

  // ── Sélecteur d'amis (loupe dans le champ de nom) ──
  const [openAmis, setOpenAmis] = useState(null);  // index du champ ouvert, ou null
  const [amisQ, setAmisQ] = useState("");
  const [amis, setAmis] = useState(null);          // null = pas encore chargé
  const [amisLoading, setAmisLoading] = useState(false);
  const amisRef = useRef(null);

  // Chargement des amis à la 1re ouverture seulement
  useEffect(() => {
    if (openAmis === null || amis !== null || !joueur?.id) return;
    setAmisLoading(true);
    dbJ.getAmis(joueur.id)
      .then(rows => {
        const liste = (rows || []).map(a => {
          const estMoiCote1 = a.joueur_id === joueur.id;
          return { id: estMoiCote1 ? a.ami_id : a.joueur_id, pseudo: (estMoiCote1 ? a.ami_pseudo : a.joueur_pseudo) || "Joueur" };
        });
        // dédoublonnage + tri alphabétique
        const vus = new Set();
        setAmis(liste.filter(x => !vus.has(x.id) && vus.add(x.id))
                     .sort((x, y) => x.pseudo.localeCompare(y.pseudo, "fr", { sensitivity: "base" })));
      })
      .catch(() => setAmis([]))
      .finally(() => setAmisLoading(false));
  }, [openAmis, amis, joueur?.id]);

  // Fermer si clic à l'extérieur
  useEffect(() => {
    if (openAmis === null) return;
    const h = (e) => { if (amisRef.current && !amisRef.current.contains(e.target)) { setOpenAmis(null); setAmisQ(""); } };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [openAmis]);

  // Partie
  const [players, setPlayers] = useState([]);      // { name, rounds:[null×9] }
  const [roundIdx, setRoundIdx] = useState(0);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [turnDarts, setTurnDarts] = useState([]);
  const [mult, setMult] = useState("S");
  const [correct, setCorrect] = useState(null);    // { pIdx, rIdx, darts, mult } correction d'un tour validé
  const [startOrderRef, setStartOrderRef] = useState(0); // pour alterner l'ordre en revanche

  // Départage
  const [tb, setTb] = useState(null);              // { ids:[...], scores:{}, cur:0, darts:[], need:3, roundNo:1 }
  const [winner, setWinner] = useState(null);

  const round = ROUNDS[roundIdx];

  // Sauvegarde auto pendant la partie.
  useEffect(() => {
    if (phase === "play" && players.length) {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, players, roundIdx, playerIdx, turnDarts, stage, startOrderRef, finished: false })); } catch { /* */ }
    }
  }, [phase, players, roundIdx, playerIdx, turnDarts, stage, startOrderRef]);
  useEffect(() => { if (phase === "end") clearSave(); }, [phase]);

  // ── Démarrage ──
  const startGame = (fromNames) => {
    let ps = [];
    for (let i = 0; i < count; i++) ps.push({ name: (fromNames[i] || "").trim() || `Joueur ${i + 1}`, rounds: Array(9).fill(null) });
    if (orderMode === "random") ps = shuffle(ps);
    setPlayers(ps); setRoundIdx(0); setPlayerIdx(0); setTurnDarts([]); setMult("S"); setStage("input"); setWinner(null); setTb(null); setStartOrderRef(0);
    setPhase("play");
  };

  const resume = () => {
    const s = resumable; if (!s) return;
    setPlayers(s.players); setRoundIdx(s.roundIdx); setPlayerIdx(s.playerIdx); setTurnDarts(s.turnDarts || []);
    setStage(s.stage || "input"); setStartOrderRef(s.startOrderRef || 0); setMult("S"); setResumable(null); setPhase("play");
  };
  const quitToMenu = () => { clearSave(); setPage("jeux-flechettes"); };

  // ── Saisie d'une fléchette ──
  const addDart = (d) => {
    if (stage !== "input" || turnDarts.length >= 3) return;
    vib(dartValid(d, round) ? [25] : [12]);
    const nd = [...turnDarts, d];
    setTurnDarts(nd);
    if (nd.length === 3) { vib(turnHasValid(nd, round) ? [25, 40, 25] : [80]); setStage("turnRecap"); }
  };
  const undoDart = () => {
    setTurnDarts(t => t.slice(0, -1));
    if (stage === "turnRecap") setStage("input");
  };

  // ── Valider le tour → joueur suivant ou fin de manche ──
  const commitTurn = () => {
    const committed = players.map((p, i) => i === playerIdx
      ? { ...p, rounds: p.rounds.map((r, ri) => ri === roundIdx ? { darts: turnDarts } : r) }
      : p);
    setPlayers(committed);
    setTurnDarts([]); setMult("S");
    if (playerIdx < players.length - 1) { setPlayerIdx(playerIdx + 1); setStage("input"); }
    else { setStage("roundRecap"); }
  };

  const nextRound = () => {
    if (roundIdx < 8) { setRoundIdx(roundIdx + 1); setPlayerIdx(0); setTurnDarts([]); setMult("S"); setStage("input"); }
    else { finishGame(players); }
  };

  const finishGame = (finalPlayers) => {
    clearSave();                                          // partie finie → plus de reprise (même si départage)
    const rk = ranking(finalPlayers);
    const top = rk.filter(x => x.rank === 1);
    if (top.length > 1) { setTb({ ids: top.map(x => x.i), scores: {}, cur: 0, darts: [], need: 3, roundNo: 1 }); setPhase("tiebreak"); }
    else { setWinner(top[0].i); setPhase("end"); }
  };

  // ── Revanche ──
  const revanche = () => {
    const base = players.map(p => ({ name: p.name, rounds: Array(9).fill(null) }));
    const next = (startOrderRef + 1) % 2;                 // alterne : mélange à chaque revanche
    const ps = next === 1 ? shuffle(base) : [...base].reverse();
    setPlayers(ps); setRoundIdx(0); setPlayerIdx(0); setTurnDarts([]); setMult("S"); setStage("input"); setWinner(null); setTb(null); setStartOrderRef(next); setPhase("play");
  };

  // ── Correction d'un tour déjà validé (n'importe quel joueur / manche jouée) ──
  const applyCorrection = (pIdx, rIdx, darts) => {
    setPlayers(ps => ps.map((p, i) => i === pIdx ? { ...p, rounds: p.rounds.map((r, ri) => ri === rIdx ? { darts } : r) } : p));
    setCorrect(null);
  };

  // ══════════════════════════ ÉCRAN CRÉATION ══════════════════════════
  if (phase === "create") {
    const canStart = count >= 1;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", overflowY: "auto" }}>
        {showTuto && <Tutorial onClose={() => setShowTuto(false)} />}
        <div style={{ height: 46, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => setPage("jeux-flechettes")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex" }}><ArrowLeft size={20} /></button>
          <div style={{ flex: 1, textAlign: "center", fontWeight: 900, fontSize: 15 }}>➗ DOUBLE DOWN</div>
          <div style={{ width: 20 }} />
        </div>
        <div style={{ maxWidth: 440, margin: "0 auto", padding: "18px 16px 60px" }}>
          <p style={{ textAlign: "center", color: C.muted, fontSize: 13, lineHeight: 1.5, marginTop: 2, marginBottom: 16 }}>Atteins la cible imposée ou regarde ton score fondre de moitié.</p>

          {resumable && (
            <div style={{ background: "#1a1206", border: `1px solid ${C.orange}66`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: C.orange, marginBottom: 3 }}>▶ Partie en cours retrouvée</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 11 }}>{resumable.players.map(p => p.name).join(", ")} · manche {(resumable.roundIdx ?? 0) + 1}/9</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={resume} style={{ flex: 1, background: `linear-gradient(135deg,${C.orange},#ea580c)`, color: "#1a0a02", border: "none", borderRadius: 12, padding: "12px", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>▶ Reprendre</button>
                <button onClick={() => { clearSave(); setResumable(null); }} style={{ flex: 1, background: C.card, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Abandonner</button>
              </div>
            </div>
          )}

          {/* Nombre de joueurs */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 800, letterSpacing: .4, marginBottom: 10 }}>NOMBRE DE JOUEURS</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <button key={n} onClick={() => setCount(n)} style={{
                  padding: "12px 0", borderRadius: 10, fontWeight: 900, fontSize: 16, cursor: "pointer", touchAction: "manipulation",
                  border: `2px solid ${count === n ? C.orange : C.border}`, background: count === n ? C.orange : C.card2, color: count === n ? "#1a0a02" : C.text,
                }}>{n}</button>
              ))}
            </div>
          </div>

          {/* Noms */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 800, letterSpacing: .4, marginBottom: 10 }}>NOMS DES JOUEURS</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }} ref={amisRef}>
              {Array.from({ length: count }, (_, i) => {
                const ouvert = openAmis === i;
                const filtres = (amis || []).filter(a => a.pseudo.toLowerCase().includes(amisQ.trim().toLowerCase()));
                return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: 6, background: C.card2, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: C.orange }}>{i + 1}</span>
                  {/* Champ + loupe À L'INTÉRIEUR, à droite */}
                  <div style={{ flex: 1, position: "relative" }}>
                    <input value={names[i]} onChange={e => setNames(ns => ns.map((x, k) => k === i ? e.target.value : x))}
                      placeholder={`Joueur ${i + 1}`} style={{ width: "100%", background: C.card2, border: `1px solid ${ouvert ? C.orange : C.border}`, borderRadius: 10, padding: "11px 40px 11px 13px", color: C.text, fontSize: 15, boxSizing: "border-box" }} />
                    <button
                      onClick={() => { setOpenAmis(ouvert ? null : i); setAmisQ(""); }}
                      aria-label="Choisir un ami"
                      title="Choisir un ami"
                      style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: 8, border: "none", background: ouvert ? C.orange : "transparent", color: ouvert ? "#fff" : C.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }}>
                      <Search size={16} />
                    </button>

                    {/* Liste des amis */}
                    {ouvert && (
                      <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 300, background: "#14141c", border: `1px solid ${C.border}`, borderRadius: 12, boxShadow: "0 12px 34px #000c", overflow: "hidden" }}>
                        <div style={{ padding: 8, borderBottom: `1px solid ${C.border}` }}>
                          <input autoFocus value={amisQ} onChange={e => setAmisQ(e.target.value)} placeholder="Filtrer mes amis…"
                            style={{ width: "100%", background: C.card2, border: `1px solid ${C.border}`, borderRadius: 8, padding: "9px 11px", color: C.text, fontSize: 14, boxSizing: "border-box" }} />
                        </div>
                        <div style={{ maxHeight: 210, overflowY: "auto" }}>
                          {!joueur?.id ? (
                            <div style={{ padding: "14px 12px", fontSize: 12.5, color: C.muted, textAlign: "center" }}>Connecte-toi pour retrouver tes amis.</div>
                          ) : amisLoading ? (
                            <div style={{ padding: "14px 12px", fontSize: 12.5, color: C.muted, textAlign: "center" }}>Chargement…</div>
                          ) : filtres.length === 0 ? (
                            <div style={{ padding: "14px 12px", fontSize: 12.5, color: C.muted, textAlign: "center" }}>
                              {(amis || []).length === 0 ? "Tu n'as pas encore d'amis." : "Aucun ami à ce nom."}
                            </div>
                          ) : filtres.map(a => (
                            <button key={a.id}
                              onClick={() => { setNames(ns => ns.map((x, k) => k === i ? a.pseudo : x)); setOpenAmis(null); setAmisQ(""); }}
                              style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${C.border}55`, color: C.text, padding: "11px 13px", fontSize: 14, fontWeight: 700, cursor: "pointer", touchAction: "manipulation" }}>
                              {a.pseudo}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Ordre */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 800, letterSpacing: .4, marginBottom: 10 }}>ORDRE DE PASSAGE</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setOrderMode("manual")} style={{ flex: 1, padding: "12px 0", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", border: `2px solid ${orderMode === "manual" ? C.orange : C.border}`, background: orderMode === "manual" ? "#2a1608" : C.card2, color: orderMode === "manual" ? C.orange : C.text }}>Dans l'ordre</button>
              <button onClick={() => setOrderMode("random")} style={{ flex: 1, padding: "12px 0", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer", border: `2px solid ${orderMode === "random" ? C.orange : C.border}`, background: orderMode === "random" ? "#2a1608" : C.card2, color: orderMode === "random" ? C.orange : C.text }}>🎲 Aléatoire</button>
            </div>
          </div>

          {/* Rappel des règles */}
          <div style={{ background: "#0e1a14", border: `1px solid ${C.green}33`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 800, letterSpacing: .5, marginBottom: 8 }}>RÈGLE DU JEU</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#cbd5e1", lineHeight: 1.7 }}>
              <li>Score de départ : <b>40 points</b></li>
              <li><b>9 manches</b>, une cible par manche</li>
              <li><b>3 fléchettes</b> par manche</li>
              <li>Aucune fléchette sur la cible → <b style={{ color: C.red }}>score ÷ 2</b></li>
            </ul>
          </div>

          <VibToggle />
          <button onClick={() => startGame(names)} disabled={!canStart} style={{ width: "100%", background: `linear-gradient(135deg,${C.orange},#ea580c)`, color: "#1a0a02", border: "none", borderRadius: 14, padding: "16px", fontWeight: 900, fontSize: 17, cursor: "pointer" }}>
            COMMENCER LA PARTIE →
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════ DÉPARTAGE (BULL) ══════════════════════════
  if (phase === "tiebreak" && tb) {
    const curId = tb.ids[tb.cur];
    const addTbDart = (d) => {
      if (tb.darts.length >= tb.need) return;
      vib(d.m === "BO" || d.m === "BI" ? [25] : [12]);
      const nd = [...tb.darts, d];
      if (nd.length < tb.need) { setTb({ ...tb, darts: nd }); return; }
      // tour terminé pour ce joueur
      const sc = nd.reduce((s, x) => s + (x.m === "BO" ? 25 : x.m === "BI" ? 50 : 0), 0);
      const scores = { ...tb.scores, [curId]: sc };
      if (tb.cur < tb.ids.length - 1) { setTb({ ...tb, darts: [], cur: tb.cur + 1, scores }); return; }
      // tous ont joué → comparer
      const max = Math.max(...tb.ids.map(id => scores[id] ?? 0));
      const survivors = tb.ids.filter(id => (scores[id] ?? 0) === max);
      if (survivors.length === 1) { vib([60, 40, 60, 40, 140]); setWinner(survivors[0]); setPhase("end"); }
      else { setTb({ ids: survivors, scores: {}, cur: 0, darts: [], need: 1, roundNo: tb.roundNo + 1 }); }
    };
    const undoTb = () => setTb({ ...tb, darts: tb.darts.slice(0, -1) });
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ height: 46, display: "flex", alignItems: "center", justifyContent: "center", borderBottom: `1px solid ${C.border}`, fontWeight: 900, fontSize: 14, color: C.gold, flexShrink: 0 }}>⚔️ DÉPARTAGE — BULL</div>
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px" }}>
          <div style={{ maxWidth: 380, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>{tb.need === 3 ? "3 fléchettes" : "1 fléchette"} sur le Bull · manche de départage {tb.roundNo}</div>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{players[curId].name}</div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 12, flexWrap: "wrap" }}>
              {tb.ids.map(id => (
                <div key={id} style={{ padding: "6px 12px", borderRadius: 10, border: `1px solid ${id === curId ? C.gold : C.border}`, background: id === curId ? "#1a1405" : C.card, fontSize: 13 }}>
                  <b>{players[id].name}</b> {tb.scores[id] != null ? <span style={{ color: C.green }}>· {tb.scores[id]}</span> : <span style={{ color: C.muted }}>· —</span>}
                </div>
              ))}
            </div>
            <DartChips darts={tb.darts.concat(Array(Math.max(0, 3 - tb.darts.length)).fill(null)).slice(0, 3)} round={ROUNDS[8]} />
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => addTbDart({ m: "BO" })} style={{ flex: 1, padding: "16px 0", borderRadius: 12, border: `1px solid ${C.green}`, background: "#0e2a18", color: "#4ade80", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>BULL 25</button>
              <button onClick={() => addTbDart({ m: "BI" })} style={{ flex: 1, padding: "16px 0", borderRadius: 12, border: `1px solid ${C.green}`, background: "#0e2a18", color: "#4ade80", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>BULL 50</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => addTbDart({ m: "off" })} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: `1px solid ${C.border}`, background: "#14141e", color: C.muted, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>RATÉ (0)</button>
              <button onClick={undoTb} disabled={!tb.darts.length} style={{ flex: 1, padding: "13px 0", borderRadius: 10, border: `1px solid ${tb.darts.length ? "#f59e0b66" : C.border}`, background: "#14141e", color: tb.darts.length ? "#f59e0b" : "#3a3a44", fontWeight: 800, fontSize: 13, cursor: tb.darts.length ? "pointer" : "default" }}>↩ Annuler</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════ FIN DE PARTIE ══════════════════════════
  if (phase === "end") {
    const rk = ranking(players);
    const st = endStats(players);
    const podium = rk.slice(0, 3);
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", overflowY: "auto" }}>
        <ConfettiBurst data={confettiData} />
        <style>{`@keyframes ddPop{0%{transform:scale(.5);opacity:0}60%{transform:scale(1.15)}100%{transform:scale(1);opacity:1}} @keyframes ddFall{0%{transform:translateY(-20px);opacity:0}100%{transform:translateY(0);opacity:1}}`}</style>
        <div style={{ maxWidth: 400, margin: "0 auto", padding: "26px 16px 44px", textAlign: "center" }}>
          <div style={{ fontSize: 54, marginBottom: 6, animation: "ddPop .5s ease" }}>🏆</div>
          <div style={{ fontWeight: 900, fontSize: 13, color: C.orange, letterSpacing: 1 }}>PARTIE TERMINÉE</div>
          <div style={{ fontWeight: 900, fontSize: 24, color: C.green, margin: "6px 0 4px", animation: "ddPop .55s ease" }}>{players[winner].name} remporte le Double Down !</div>
          <div style={{ fontSize: 15, color: C.text, marginBottom: 18 }}>{fmt(currentScore(players[winner].rounds))} points</div>

          {/* Podium */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 8, marginBottom: 20 }}>
            {[1, 0, 2].map((slot) => {
              const p = podium[slot]; if (!p) return <div key={slot} style={{ width: 88 }} />;
              const h = slot === 0 ? 92 : slot === 1 ? 66 : 52;
              const medal = slot === 0 ? "🥇" : slot === 1 ? "🥈" : "🥉";
              const col = slot === 0 ? C.gold : slot === 1 ? "#cbd5e1" : "#d08a5a";
              return (
                <div key={slot} style={{ width: 88, animation: "ddFall .5s ease" }}>
                  <div style={{ fontSize: 22 }}>{medal}</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: col, marginBottom: 3 }}>{fmt(p.score)}</div>
                  <div style={{ height: h, borderRadius: "8px 8px 0 0", background: `linear-gradient(180deg,${col}55,${col}18)`, border: `1px solid ${col}55`, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 6, fontWeight: 900, color: col }}>{p.rank}</div>
                </div>
              );
            })}
          </div>

          {/* Classement complet */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "6px 14px", marginBottom: 16, textAlign: "left" }}>
            {rk.map((x, i) => (
              <div key={x.i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < rk.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}><span style={{ color: C.muted, marginRight: 8 }}>{x.rank}.</span>{x.name}</span>
                <span style={{ fontSize: 14, fontWeight: 900 }}>{fmt(x.score)}</span>
              </div>
            ))}
          </div>

          {/* Joueur le plus régulier */}
          {st.mostRegular != null && players.length > 1 && (
            <div style={{ background: "#0e1a14", border: `1px solid ${C.green}44`, borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.green, fontWeight: 800, letterSpacing: .5 }}>🛡️ JOUEUR LE PLUS RÉGULIER</div>
              <div style={{ fontSize: 15, fontWeight: 900, marginTop: 2 }}>{players[st.mostRegular].name}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{st.stats[st.mostRegular].dd} division{st.stats[st.mostRegular].dd > 1 ? "s" : ""} par deux subie{st.stats[st.mostRegular].dd > 1 ? "s" : ""}</div>
            </div>
          )}

          {/* Stats par joueur */}
          <div style={{ textAlign: "left", marginBottom: 20 }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 800, letterSpacing: .5, marginBottom: 8, textAlign: "center" }}>STATISTIQUES</div>
            {players.map((p, pi) => {
              const s = st.stats[pi];
              const rows = [
                ["Score final", fmt(s.final)],
                ["Cibles réussies", `${s.targets}/9`],
                ["Double Down subis", s.dd],
                ["Plus gros gain (manche)", s.bestGain > 0 ? `+${s.bestGain} (${s.bestRound})` : "—"],
                ["Doubles touchés", s.doubles], ["Triples touchés", s.triples], ["Bulls touchés", s.bulls],
                ["Plus forte remontée", s.comeback > 0 ? `+${s.comeback} place${s.comeback > 1 ? "s" : ""}` : "—"],
                ["Fléchettes lancées", s.darts],
              ];
              return (
                <details key={pi} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
                  <summary style={{ padding: "11px 14px", fontWeight: 800, fontSize: 14, cursor: "pointer", listStyle: "none", display: "flex", justifyContent: "space-between" }}>
                    <span>{p.name}</span><span style={{ color: C.muted, fontWeight: 900 }}>{fmt(s.final)}</span>
                  </summary>
                  <div style={{ padding: "2px 14px 10px" }}>
                    {rows.map(([k, v], i) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: i === 0 ? "none" : `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 12, color: C.muted }}>{k}</span><span style={{ fontSize: 12, fontWeight: 800 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={revanche} style={{ ...btnMain, padding: "15px", background: `linear-gradient(135deg,${C.orange},#ea580c)`, color: "#1a0a02" }}>🔄 Revanche</button>
            <button onClick={() => { clearSave(); setPhase("create"); }} style={{ ...btnSec, padding: "14px" }}>Nouvelle partie</button>
            <button onClick={() => setPage("jeux-flechettes")} style={{ ...btnSec, padding: "14px" }}>← Retour aux jeux</button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════ FIN DE MANCHE ══════════════════════════
  if (phase === "play" && stage === "roundRecap") {
    const rk = ranking(players);
    const leader = rk[0];
    const nextR = roundIdx < 8 ? ROUNDS[roundIdx + 1] : null;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", overflowY: "auto" }}>
        {correct && <CorrectionModal players={players} correct={correct} setCorrect={setCorrect} onApply={applyCorrection} />}
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "22px 16px 40px" }}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 800, letterSpacing: 1 }}>MANCHE {roundIdx + 1} TERMINÉE</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }}>Cible : {round.label}</div>
          </div>
          <ProgressBar roundIdx={Math.min(roundIdx + 1, 9)} />
          <div style={{ background: "#1a1405", border: `1px solid ${C.gold}55`, borderRadius: 12, padding: "10px 14px", margin: "16px 0", textAlign: "center" }}>
            <span style={{ fontSize: 13, color: C.gold, fontWeight: 800 }}>👑 En tête : {leader.name} — {fmt(leader.score)} pts</span>
          </div>
          <div style={{ marginBottom: 8 }}><PlayersTable players={players} activeIdx={-1} /></div>
          {nextR ? (
            <>
              <div style={{ textAlign: "center", margin: "16px 0 12px" }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>Prochaine cible</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: C.orange, textShadow: `0 0 12px ${C.orange}66` }}>{nextR.label}</div>
              </div>
              <button onClick={nextRound} style={{ width: "100%", ...btnMain, background: `linear-gradient(135deg,${C.orange},#ea580c)`, color: "#1a0a02", fontSize: 16 }}>MANCHE SUIVANTE →</button>
            </>
          ) : (
            <button onClick={nextRound} style={{ width: "100%", ...btnMain, marginTop: 16, fontSize: 16 }}>🏁 VOIR LE RÉSULTAT FINAL →</button>
          )}
          <button onClick={() => setCorrect({ step: "pick" })} style={{ ...btnSec, width: "100%", marginTop: 10, fontSize: 13 }}>✏️ Corriger un tour</button>
        </div>
      </div>
    );
  }

  // ══════════════════════════ RÉCAP DU TOUR ══════════════════════════
  if (phase === "play" && stage === "turnRecap") {
    const before = scoreAfter(players[playerIdx].rounds, roundIdx - 1);
    const has = turnHasValid(turnDarts, round);
    const gain = turnGain(turnDarts, round);
    const after = has ? before + gain : before / 2;
    const isLast = playerIdx === players.length - 1;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: has ? C.bg : "#1a0808", color: C.text, fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden", transition: "background .3s" }}>
        <style>{`@keyframes ddCrack{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}60%{transform:translateX(5px)}} @keyframes ddUp{0%{transform:scale(.6);opacity:0}100%{transform:scale(1);opacity:1}}`}</style>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "center", padding: "20px 16px" }}>
          <div style={{ maxWidth: 380, margin: "0 auto", width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 13, color: C.muted, fontWeight: 800 }}>{players[playerIdx].name} · cible {round.short}</div>
            {has ? (
              <>
                <div style={{ fontSize: 40, marginTop: 10 }}>🎯</div>
                <div style={{ fontWeight: 900, fontSize: 22, color: C.green, letterSpacing: .5 }}>CIBLE ATTEINTE</div>
                <DartChips darts={turnDarts} round={round} />
                <div style={{ fontSize: 34, fontWeight: 900, color: C.green, margin: "14px 0 4px", animation: "ddUp .4s ease" }}>+{gain}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, marginTop: 10, animation: "ddCrack .4s ease" }}>💔</div>
                <div style={{ fontWeight: 900, fontSize: 20, color: C.red, letterSpacing: .5 }}>{missMsg(round)}</div>
                <DartChips darts={turnDarts} round={round} />
                <div style={{ display: "inline-block", marginTop: 14, marginBottom: 2, background: "#7f1d1d", color: "#fecaca", fontWeight: 900, fontSize: 15, borderRadius: 10, padding: "6px 16px" }}>DOUBLE DOWN · SCORE ÷ 2</div>
              </>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 12 }}>
              <div><div style={{ fontSize: 11, color: C.muted }}>Ancien</div><div style={{ fontSize: 20, fontWeight: 800, color: C.muted }}>{fmt(before)}</div></div>
              <div style={{ fontSize: 20, color: C.muted }}>→</div>
              <div><div style={{ fontSize: 11, color: C.muted }}>Nouveau</div><div style={{ fontSize: 26, fontWeight: 900, color: has ? C.green : C.red }}>{has ? fmt(after) : <HalveNumber from={before} to={after} />}</div></div>
            </div>
          </div>
        </div>
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ maxWidth: 380, margin: "0 auto", display: "flex", gap: 8 }}>
            <button onClick={undoDart} style={{ ...btnSec, flex: "0 0 auto" }}>↩ Corriger</button>
            <button onClick={commitTurn} style={{ ...btnMain, flex: 1, background: `linear-gradient(135deg,${C.orange},#ea580c)`, color: "#1a0a02", fontSize: 16 }}>{isLast ? "FIN DE MANCHE →" : "JOUEUR SUIVANT →"}</button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════ ÉCRAN DE JEU (saisie) ══════════════════════════
  if (phase === "play") {
    const me = players[playerIdx];
    const liveGain = turnGain(turnDarts, round);
    const rk = ranking(players);
    const myRank = rk.find(x => x.i === playerIdx)?.rank;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {showQuit && <QuitModal onCancel={() => setShowQuit(false)} onQuit={quitToMenu} />}
        {correct && <CorrectionModal players={players} correct={correct} setCorrect={setCorrect} onApply={applyCorrection} />}
        <div style={{ height: 46, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={() => setShowQuit(true)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex" }}><ArrowLeft size={20} /></button>
          <div style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 13 }}>Manche {roundIdx + 1}/9</div>
          <button onClick={() => setCorrect({ step: "pick" })} title="Corriger un tour" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 15 }}>✏️</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px 16px" }}>
          <div style={{ maxWidth: 400, margin: "0 auto" }}>
            <ProgressBar roundIdx={roundIdx} />

            {/* Bandeau joueur + score */}
            <div style={{ background: `linear-gradient(135deg,#14351f,#0e1a14)`, border: `1px solid ${C.green}44`, borderRadius: 16, padding: "14px 16px", marginTop: 12, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#a7f3d0", fontWeight: 800, letterSpacing: .5 }}>{me.name.toUpperCase()}{players.length > 1 && myRank ? ` · ${myRank}${myRank === 1 ? "ᵉʳ" : "ᵉ"}` : ""}</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: "#fff", lineHeight: 1.1, margin: "2px 0" }}>{fmt(currentScore(me.rounds))}</div>
              <div style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 700, letterSpacing: 1 }}>POINTS</div>
            </div>

            {/* Cible active */}
            <div style={{ background: "#2a1608", border: `1.5px solid ${C.orange}`, borderRadius: 14, padding: "12px 14px", marginTop: 10, textAlign: "center", boxShadow: `0 0 16px ${C.orange}22` }}>
              <div style={{ fontSize: 11, color: C.orange, fontWeight: 800, letterSpacing: 1 }}>CIBLE DE LA MANCHE</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: C.orange, textShadow: `0 0 14px ${C.orange}88`, marginTop: 2 }}>{round.label}</div>
              <div style={{ fontSize: 11, color: "#fdba74", marginTop: 2 }}>
                {round.kind === "num" ? "Simple, double ou triple du " + round.num + " comptent" : round.kind === "double" ? "Tous les doubles comptent" : round.kind === "triple" ? "Tous les triples comptent" : "Bull 25 et Bull 50 comptent"}
              </div>
            </div>

            {/* Fléchettes du tour + total */}
            <DartChips darts={turnDarts.concat(Array(3).fill(null)).slice(0, 3)} round={round} />
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: C.muted }}>
              Fléchettes : <b style={{ color: C.text }}>{turnDarts.length}/3</b> · Points de la manche : <b style={{ color: liveGain > 0 ? C.green : C.text }}>+{liveGain}</b>
            </div>

            <DartPad round={round} mult={mult} setMult={setMult} onDart={addDart} onUndo={undoDart} canUndo={turnDarts.length > 0} />

            {/* Mini-classement provisoire */}
            {players.length > 1 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 800, letterSpacing: .5, marginBottom: 6 }}>CLASSEMENT PROVISOIRE</div>
                <PlayersTable players={players} activeIdx={playerIdx} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// ── Statistiques de fin de partie ──
function endStats(players) {
  // Trajectoire des rangs (pour la « plus forte remontée »).
  const N = players.length;
  const ranks = Array.from({ length: N }, () => []);
  for (let r = 0; r < 9; r++) {
    const arr = players.map((p, i) => ({ i, s: scoreAfter(p.rounds, r) }));
    arr.sort((a, b) => b.s - a.s);
    let rk = 0, prev = null;
    arr.forEach((x, idx) => { if (prev === null || x.s !== prev) { rk = idx + 1; prev = x.s; } ranks[x.i][r] = rk; });
  }
  const stats = players.map((p, pi) => {
    let targets = 0, dd = 0, doubles = 0, triples = 0, bulls = 0, darts = 0, bestGain = 0, bestRound = "—";
    p.rounds.forEach((rr, ri) => {
      if (!rr || !rr.darts || !rr.darts.length) return;
      darts += rr.darts.length;
      rr.darts.forEach(d => { if (d.m === "D") doubles++; else if (d.m === "T") triples++; else if (d.m === "BO" || d.m === "BI") bulls++; });
      if (turnHasValid(rr.darts, ROUNDS[ri])) { targets++; const g = turnGain(rr.darts, ROUNDS[ri]); if (g > bestGain) { bestGain = g; bestRound = ROUNDS[ri].short; } }
      else dd++;
    });
    const worst = Math.max(...ranks[pi]);
    const comeback = Math.max(0, worst - ranks[pi][8]);
    return { final: currentScore(p.rounds), targets, dd, doubles, triples, bulls, darts, bestGain, bestRound, comeback };
  });
  // Le plus régulier = le moins de ÷2 (puis le plus de cibles réussies).
  let mostRegular = null;
  if (N > 0) {
    let best = null;
    stats.forEach((s, i) => { if (best === null || s.dd < best.dd || (s.dd === best.dd && s.targets > best.targets)) { best = s; mostRegular = i; } });
  }
  return { stats, mostRegular };
}
