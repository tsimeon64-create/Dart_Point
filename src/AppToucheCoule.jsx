// src/AppToucheCoule.jsx
// ─────────────────────────────────────────────────────────────────────────────
// TOUCHÉ-COULÉ — bataille navale sur cible de fléchettes (2 joueurs, 1 téléphone).
// PHASE 1 (fondations) : création (noms OU profils Dart Point), cible interactive,
// placement secret des 4 bateaux (simple / double / triple / Shanghai) avec
// orientations + contrôle de chevauchement, écrans opaques de passage du téléphone,
// verrouillage des flottes. La BATAILLE (tirs, touché/coulé, stats…) arrive en phase 2.
// Pas de son (voulu). Style Dart Point sombre + néon.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { EmoIcon } from "./icons";
import { ArrowLeft } from "lucide-react";
import { FriendNameInput } from "./FriendPicker";
import { ConfettiBurst } from "./DPLottie";
import confettiData from "./lottie/confetti.json";

// Supabase (recherche de profils Dart Point — optionnel, lecture seule)
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sbTC = async (path) => {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY } });
    return r.ok ? await r.json() : [];
  } catch { return []; }
};

const C = {
  bg: "#0a0a12", card: "#12121c", border: "#26263a", text: "#f1f5f9", muted: "#8b93a7",
  radar: "#22c55e", blue: "#3b82f6", orange: "#f97316", red: "#ef4444", cyan: "#22d3ee",
};

// Ordre physique officiel de la cible (le 5 est voisin du 20).
const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const nb = (num, k) => ORDER[(ORDER.indexOf(num) + k + 20) % 20]; // voisin (k = ±1, ±2…)
const zid = (type, num) => `${type}${num}`;                        // "S19", "D18", "T20"

// ── Bateaux : nb de zones à toucher pour couler ──
const SHIPS = {
  simple:   { key: "simple",   label: "Bateau simple",   short: "Simple",   type: "S", len: 3, col: "#22d3ee" },
  double:   { key: "double",   label: "Bateau double",   short: "Double",   type: "D", len: 2, col: "#a78bfa" },
  triple:   { key: "triple",   label: "Bateau triple",   short: "Triple",   type: "T", len: 2, col: "#f59e0b" },
  shanghai: { key: "shanghai", label: "Bateau Shanghai", short: "Shanghai", type: "*", len: 3, col: "#ef4444" },
};
const SHIP_KEYS = ["simple", "double", "triple", "shanghai"];

// Orientations possibles à partir d'une zone d'ancrage (renvoie des listes de zones).
function orientationsFor(shipKey, num) {
  if (shipKey === "shanghai") return [[zid("S", num), zid("D", num), zid("T", num)]];
  const t = SHIPS[shipKey].type;
  if (shipKey === "simple") return [
    [zid(t, nb(num, -1)), zid(t, num), zid(t, nb(num, 1))], // une de chaque côté
    [zid(t, num), zid(t, nb(num, 1)), zid(t, nb(num, 2))],  // deux à droite
    [zid(t, nb(num, -2)), zid(t, nb(num, -1)), zid(t, num)],// deux à gauche
  ];
  return [ // double / triple (2 zones voisines)
    [zid(t, num), zid(t, nb(num, 1))],
    [zid(t, nb(num, -1)), zid(t, num)],
  ];
}

// ── Bataille : helpers ──
const shipOf = (fleet, z) => SHIP_KEYS.find(k => (fleet[k] || []).includes(z)) || null;
const isSunk = (fleet, sh, k) => (fleet[k] || []).length > 0 && (fleet[k] || []).every(z => sh[z] === "hit");
const shipsLeft = (fleet, sh) => SHIP_KEYS.filter(k => !isSunk(fleet, sh, k)).length;
const vibOn = () => { try { return localStorage.getItem("tc_vib") !== "off"; } catch { return true; } };
const vib = (pat) => { if (!vibOn()) return; try { navigator.vibrate && navigator.vibrate(pat); } catch { /* */ } };

// ── Sauvegarde auto de la bataille (localStorage) ──
const SAVE_KEY = "tc_save";
const loadSave = () => { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); return (s && s.fleets && s.fleets[0] && s.fleets[1] && s.winner == null) ? s : null; } catch { return null; } };
const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch { /* */ } };

// ── Géométrie de la cible (SVG) ──
const VB = 260, CX = 130, CY = 130, R = 100;
const RAD = { bullseye: 3.7, bull: 9.4, tripIn: 58.2, tripOut: 62.9, dblIn: 95.3, dblOut: 100, numRing: 116 };
const pol = (r, deg) => { const a = (deg * Math.PI) / 180; return [CX + r * Math.cos(a), CY + r * Math.sin(a)]; };
function sectorPath(r0, r1, a0, a1) {
  const [x1o, y1o] = pol(r1, a0), [x2o, y2o] = pol(r1, a1), [x2i, y2i] = pol(r0, a1), [x1i, y1i] = pol(r0, a0);
  return `M${x1o.toFixed(2)} ${y1o.toFixed(2)} A${r1} ${r1} 0 0 1 ${x2o.toFixed(2)} ${y2o.toFixed(2)} L${x2i.toFixed(2)} ${y2i.toFixed(2)} A${r0} ${r0} 0 0 0 ${x1i.toFixed(2)} ${y1i.toFixed(2)} Z`;
}
// Toutes les cases (S/D/T) avec leur géométrie, une fois pour toutes.
const CELLS = (() => {
  const out = [];
  ORDER.forEach((num, i) => {
    const c = -90 + i * 18, a0 = c - 9, a1 = c + 9;
    out.push({ id: zid("S", num), num, type: "S", d: sectorPath(RAD.bull, RAD.tripIn, a0, a1) });   // simple intérieur
    out.push({ id: zid("T", num), num, type: "T", d: sectorPath(RAD.tripIn, RAD.tripOut, a0, a1) });
    out.push({ id: zid("S", num), num, type: "S", d: sectorPath(RAD.tripOut, RAD.dblIn, a0, a1) });  // simple extérieur (= même zone)
    out.push({ id: zid("D", num), num, type: "D", d: sectorPath(RAD.dblIn, RAD.dblOut, a0, a1) });
  });
  return out;
})();
const NUM_POS = ORDER.map((num, i) => { const [x, y] = pol(RAD.numRing, -90 + i * 18); return { num, x, y }; });

// Couleur d'une case selon son état de jeu.
const IDLE_S_A = "#181820", IDLE_S_B = "#20202b", IDLE_DT_A = "#3a1f1f", IDLE_DT_B = "#1f3a2a";
function cellFill(cell, state, activeType) {
  if (state === "sel")   return "#22d3ee";                 // bateau en cours de placement
  if (state === "placed")return "#475569";                 // zone déjà occupée par un bateau
  if (state === "err")   return "#ef4444";                 // chevauchement
  if (state === "valid") return "rgba(34,197,94,0.28)";    // zone posable (type actif)
  if (state === "own")   return "#0e7490";                 // mon bateau intact (vue défense)
  if (state === "dmg")   return "#ef4444";                 // ma zone touchée
  if (state === "water") return "#1e40af";                 // tir à l'eau (attaque)
  if (state === "hit")   return "#f97316";                 // touché
  if (state === "sunk")  return "#dc2626";                 // coulé
  const dimmed = activeType && activeType !== "*" && cell.type !== activeType;
  const idle = cell.type === "S"
    ? (ORDER.indexOf(cell.num) % 2 ? IDLE_S_B : IDLE_S_A)
    : (ORDER.indexOf(cell.num) % 2 ? IDLE_DT_B : IDLE_DT_A);
  return dimmed ? "#0e0e14" : idle;
}

// ── Cible interactive ──
function Board({ stateOf, activeType, onTap, shake }) {
  return (
    <svg viewBox={`0 0 ${VB} ${VB}`} style={{ width: "100%", height: "auto", display: "block",
      animation: shake ? "tcShake .28s" : "none" }}>
      <circle cx={CX} cy={CY} r={RAD.numRing + 6} fill="#08080e" />
      {CELLS.map((cell, i) => {
        const st = stateOf ? stateOf(cell) : null;
        const tappable = !!onTap && (activeType === "*" || cell.type === activeType);
        return (
          <path key={i} d={cell.d} fill={cellFill(cell, st, activeType)}
            stroke="#000" strokeWidth="0.6"
            style={{ cursor: tappable ? "pointer" : "default", transition: "fill .12s" }}
            onClick={tappable ? () => onTap(cell.id, cell.num, cell.type) : undefined} />
        );
      })}
      {/* Bull (aucun bateau — case neutre) */}
      <circle cx={CX} cy={CY} r={RAD.bull} fill="#1e6b3f" stroke="#000" strokeWidth="0.6" />
      <circle cx={CX} cy={CY} r={RAD.bullseye} fill="#a51f12" stroke="#000" strokeWidth="0.6" />
      {/* Numéros */}
      {NUM_POS.map(n => (
        <text key={n.num} x={n.x} y={n.y} fill="#e2e8f0" fontSize="9.5" fontWeight="800"
          textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "Inter,sans-serif" }}>{n.num}</text>
      ))}
    </svg>
  );
}

// ── Champ « nom » avec sélecteur d'AMIS (icône ami à l'intérieur) ──
// Choisir un ami relie ses stats à son profil (profileId) ; taper à la main = nom libre.
function PlayerField({ index, value, onChange, col, joueurId }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: col, fontWeight: 800, display: "block", marginBottom: 6, letterSpacing: .4 }}>JOUEUR {index + 1}</label>
      <FriendNameInput
        value={value.name || ""}
        onChange={v => onChange({ name: v, profileId: null, photo: null })}
        onPickFriend={a => onChange({ name: a.pseudo, profileId: a.id, photo: null })}
        placeholder="Nom du joueur…"
        joueurId={joueurId}
        theme={{ bg: "#0b0b12", border: C.border, text: C.text, muted: C.muted, accent: col }}
      />
      {value.profileId && <div style={{ fontSize: 11, color: C.radar, marginTop: 5 }}>✓ Profil Dart Point relié</div>}
    </div>
  );
}

// ── Écran opaque de passage du téléphone ──
function HandoffScreen({ toName, subtitle, onReady }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10, background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
      <div style={{ fontSize: 46, marginBottom: 10 }}>📵</div>
      <div style={{ fontSize: 13, color: C.muted, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>PASSE LE TÉLÉPHONE À</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: C.text, marginBottom: 16 }}>{toName}</div>
      <p style={{ fontSize: 13, color: C.muted, maxWidth: 300, lineHeight: 1.6, marginBottom: 34 }}>{subtitle}</p>
      <button onClick={onReady} style={{ background: `linear-gradient(135deg,${C.radar},#16a34a)`, border: "none", borderRadius: 14, padding: "16px 46px", color: "#04140e", fontWeight: 900, fontSize: 17, cursor: "pointer" }}>
        JE SUIS PRÊT →
      </button>
    </div>
  );
}

// ── PLACEMENT de la flotte d'un joueur ──
function PlacementScreen({ playerName, onDone, onQuit }) {
  const [placed, setPlaced] = useState({});      // shipKey -> [zids]
  const [selected, setSelected] = useState(null); // shipKey en cours
  const [anchor, setAnchor] = useState(null);
  const [orient, setOrient] = useState(0);
  const [err, setErr] = useState(false);
  const [showQ, setShowQ] = useState(false);

  const usedZones = new Set(Object.entries(placed).flatMap(([k, z]) => z)); // toutes les zones occupées
  const oris = selected && anchor != null ? orientationsFor(selected, anchor) : [];
  const current = oris.length ? oris[orient % oris.length] : null;
  const activeType = selected ? (selected === "shanghai" ? "*" : SHIPS[selected].type) : null;

  const shipState = (key) => placed[key] ? "Positionné" : (selected === key ? "Sélectionné" : "À placer");
  const allPlaced = SHIP_KEYS.every(k => placed[k]);

  const stateOf = (cell) => {
    if (current && current.includes(cell.id)) return err ? "err" : "sel";
    // zones des autres bateaux déjà posés
    for (const [k, zs] of Object.entries(placed)) { if (k !== selected && zs.includes(cell.id)) return "placed"; }
    // zone posable du type actif (et libre) — pas pour le Shanghai (n'importe quel numéro)
    if (selected && activeType && activeType !== "*" && cell.type === activeType && !usedZones.has(cell.id)) return "valid";
    return null;
  };

  const tap = (id, num, type) => {
    if (!selected) return;
    if (selected !== "shanghai" && type !== SHIPS[selected].type) return;
    setAnchor(num); setOrient(0); setErr(false);
  };

  const place = () => {
    if (!selected || !current) return;
    const clash = current.some(z => usedZones.has(z) && !(placed[selected] || []).includes(z));
    if (clash) {
      setErr(true);
      try { navigator.vibrate && navigator.vibrate([40, 30, 40]); } catch { /* */ }
      setTimeout(() => setErr(false), 500);
      return;
    }
    setPlaced(p => ({ ...p, [selected]: current }));
    try { navigator.vibrate && navigator.vibrate(20); } catch { /* */ }
    setSelected(null); setAnchor(null); setOrient(0);
  };

  const modify = (key) => { setPlaced(p => { const n = { ...p }; delete n[key]; return n; }); setSelected(key); setAnchor(null); setOrient(0); setErr(false); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {showQ && <QuitModal onCancel={() => setShowQ(false)} onQuit={onQuit} />}
      <div style={{ height: 46, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={() => setShowQ(true)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex" }}><ArrowLeft size={20} /></button>
        <div style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 14, letterSpacing: .5 }}>{playerName.toUpperCase()}, PLACE TA FLOTTE</div>
        <div style={{ width: 20 }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px 20px" }}>
        <div style={{ maxWidth: 380, margin: "0 auto" }}>
          <Board stateOf={stateOf} activeType={activeType} onTap={selected ? tap : null} shake={err} />

          {selected && current && (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {oris.length > 1 && (
                <button onClick={() => { setOrient(o => o + 1); setErr(false); }} style={btnSec}>↻ Orientation</button>
              )}
              <button onClick={place} style={{ ...btnMain, flex: 1 }}>✓ Placer le bateau</button>
            </div>
          )}
          {err && <div style={{ textAlign: "center", marginTop: 8, color: C.red, fontWeight: 800, fontSize: 13 }}>PLACEMENT IMPOSSIBLE<div style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>Une partie de ta flotte occupe déjà cette zone.</div></div>}

          {/* Cartes des 4 bateaux */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
            {SHIP_KEYS.map(k => {
              const s = SHIPS[k]; const st = shipState(k); const isSel = selected === k;
              return (
                <button key={k} onClick={() => { if (placed[k]) { modify(k); } else { setSelected(k); setAnchor(null); setOrient(0); setErr(false); } }}
                  style={{ textAlign: "left", background: isSel ? `${s.col}1f` : C.card, border: `2px solid ${isSel ? s.col : (placed[k] ? `${C.radar}55` : C.border)}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", color: C.text }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: s.col, flexShrink: 0 }} />
                    <span style={{ fontWeight: 800, fontSize: 13 }}>{s.short}</span>
                  </div>
                  <div style={{ fontSize: 10, color: placed[k] ? C.radar : C.muted, marginTop: 3, fontWeight: 600 }}>
                    {placed[k] ? "✓ " + placed[k].map(z => z).join(" · ") : st + " · " + s.len + " zones"}
                  </div>
                </button>
              );
            })}
          </div>

          {allPlaced && (
            <button onClick={() => onDone(placed)} style={{ ...btnMain, width: "100%", marginTop: 16, padding: "15px", fontSize: 16 }}>
              🔒 VALIDER MA FLOTTE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const btnMain = { background: `linear-gradient(135deg,${C.radar},#16a34a)`, border: "none", borderRadius: 12, padding: "12px 16px", color: "#04140e", fontWeight: 900, fontSize: 14, cursor: "pointer", touchAction: "manipulation" };
const btnSec = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontWeight: 700, fontSize: 13, cursor: "pointer", touchAction: "manipulation" };

// Texte + couleur du bandeau de résultat d'un tir
function bannerText(b) {
  if (!b) return null;
  if (b.result === "off")     return { label: "TIR PERDU", col: C.muted, sub: "À côté de la cible" };
  if (b.result === "already") return { label: "ZONE DÉJÀ VISÉE", col: C.orange, sub: "Aucun nouveau dégât" };
  if (b.result === "water")   return { label: "À L'EAU", col: "#60a5fa", sub: b.zone === "bull" ? "Bull — pas de bateau" : null };
  if (b.result === "hit")     return { label: "TOUCHÉ !", col: C.orange, sub: null };
  if (b.result === "sunk")    return { label: SHIPS[b.ship].short.toUpperCase() + " COULÉ !", col: C.red, sub: null };
  return null;
}
function turnSummary(ts) {
  const h = ts.filter(s => s.result === "hit" || s.result === "sunk").length;
  const w = ts.filter(s => s.result === "water").length;
  const a = ts.filter(s => s.result === "already").length;
  const o = ts.filter(s => s.result === "off").length;
  const p = []; if (h) p.push(`${h} impact${h > 1 ? "s" : ""}`); if (w) p.push(`${w} à l'eau`); if (a) p.push(`${a} déjà visée${a > 1 ? "s" : ""}`); if (o) p.push(`${o} perdu${o > 1 ? "s" : ""}`);
  return p.join(" · ") || "Aucun tir";
}

// Pavé de saisie d'une fléchette
function DartInput({ mult, setMult, onFire, onUndo, canUndo }) {
  const type = mult === 1 ? "S" : mult === 2 ? "D" : "T";
  const mBtn = (m, label, col) => (
    <button onClick={() => setMult(mult === m ? 1 : m)} style={{ flex: 1, padding: "11px 4px", borderRadius: 10, border: `2px solid ${mult === m ? col : C.border}`, background: mult === m ? col : C.card, color: mult === m ? "#08080e" : col, fontWeight: 900, fontSize: 13, cursor: "pointer", touchAction: "manipulation" }}>{label}</button>
  );
  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>{mBtn(1, "SIMPLE", "#94a3b8")}{mBtn(2, "DOUBLE", "#a78bfa")}{mBtn(3, "TRIPLE", "#f59e0b")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
          <button key={n} onClick={() => onFire(type + n)} style={{ padding: "13px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: "#14141e", color: C.text, fontWeight: 800, fontSize: 15, cursor: "pointer", touchAction: "manipulation" }}>{n}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <button onClick={() => onFire("bull")} style={{ flex: 1, padding: "12px 0", borderRadius: 9, border: `1px solid ${C.red}66`, background: "#14141e", color: "#fca5a5", fontWeight: 800, fontSize: 13, cursor: "pointer", touchAction: "manipulation" }}>BULL</button>
        <button onClick={() => onFire("off")} style={{ flex: 1, padding: "12px 0", borderRadius: 9, border: `1px solid ${C.border}`, background: "#14141e", color: C.muted, fontWeight: 800, fontSize: 13, cursor: "pointer", touchAction: "manipulation" }}>HORS CIBLE</button>
        <button onClick={onUndo} disabled={!canUndo} style={{ flex: 1, padding: "12px 0", borderRadius: 9, border: `1px solid ${canUndo ? "#f59e0b66" : C.border}`, background: "#14141e", color: canUndo ? "#f59e0b" : "#3a3a44", fontWeight: 800, fontSize: 13, cursor: canUndo ? "pointer" : "default", touchAction: "manipulation" }}>↩ Annuler</button>
      </div>
    </div>
  );
}

// Confirmation d'abandon
function QuitModal({ onCancel, onQuit }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 20, background: "#000c", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.card, border: `2px solid ${C.red}`, borderRadius: 16, padding: 24, maxWidth: 300, textAlign: "center" }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Abandonner la bataille ?</div>
        <p style={{ color: C.muted, fontSize: 12, marginBottom: 18 }}>La partie en cours sera arrêtée.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: 10, border: `1px solid ${C.border}`, background: "#0b0b12", color: C.text, fontWeight: 700, cursor: "pointer" }}>Continuer</button>
          <button onClick={onQuit} style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "#7f1d1d", color: "#fca5a5", fontWeight: 700, cursor: "pointer" }}>Abandonner</button>
        </div>
      </div>
    </div>
  );
}

// Animation plein écran d'un résultat de tir (durées section 44, tap pour passer)
function AnimOverlay({ anim, onDone }) {
  const isSh = anim.result === "sunk" && anim.ship === "shanghai";
  useEffect(() => {
    const dur = anim.result === "sunk" ? (isSh ? 2500 : 2000) : anim.result === "hit" ? 800 : 550;
    const t = setTimeout(onDone, dur);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const bt = bannerText(anim);
  const bg = anim.result === "hit" ? "#7c2d1233" : (anim.result === "sunk" ? "#7f1d1d55" : (anim.result === "water" ? "#1e3a8a44" : "#000000aa"));
  let visual;
  if (anim.result === "water") visual = (<>
    <div className="tc-rip" style={{ borderColor: "#60a5fa" }} />
    <div className="tc-rip" style={{ borderColor: "#3b82f6", animationDelay: ".18s" }} />
    <div style={{ fontSize: 56 }}>💧</div>
  </>);
  else if (anim.result === "hit") visual = <div style={{ fontSize: 70, animation: "tc-pop .35s ease" }}>💥</div>;
  else if (isSh) visual = <div style={{ fontSize: 82, animation: "tc-boom .7s ease" }}>🌟🔥</div>;
  else if (anim.result === "sunk") visual = <div style={{ fontSize: 76, animation: "tc-boom .6s ease" }}>🔥</div>;
  else visual = <div style={{ fontSize: 46 }}>{anim.result === "off" ? "🎯💨" : "🔁"}</div>;
  return (
    <div onClick={onDone} style={{ position: "fixed", inset: 0, zIndex: 30, background: bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: (anim.result === "hit" || anim.result === "sunk") ? "tc-shake .3s" : "none" }}>
      <style>{`
        @keyframes tc-pop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
        @keyframes tc-boom{0%{transform:scale(.3);opacity:.4}45%{transform:scale(1.45)}100%{transform:scale(1);opacity:1}}
        @keyframes tc-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}60%{transform:translateX(6px)}}
        @keyframes tc-ripa{0%{transform:scale(.2);opacity:.9}100%{transform:scale(1);opacity:0}}
        .tc-rip{position:absolute;width:240px;height:240px;border-radius:50%;border:3px solid;animation:tc-ripa .6s ease-out forwards}
      `}</style>
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 120 }}>{visual}</div>
      {bt && <div style={{ color: bt.col, fontWeight: 900, fontSize: 30, letterSpacing: 1, textShadow: `0 0 18px ${bt.col}`, marginTop: 6, textAlign: "center", padding: "0 20px" }}>{bt.label}</div>}
      {bt && bt.sub && <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>{bt.sub}</div>}
      <div style={{ position: "absolute", bottom: 22, color: "#64748b", fontSize: 11 }}>Touche pour passer</div>
    </div>
  );
}

// Interrupteur vibrations (réglage local tc_vib)
function VibToggle() {
  const [on, setOn] = useState(vibOn());
  return (
    <button onClick={() => { const v = !on; try { localStorage.setItem("tc_vib", v ? "on" : "off"); } catch { /* */ } setOn(v); if (v) vib(20); }}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", color: C.text, fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 16 }}>
      <span>📳 Vibrations</span>
      <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: .5, padding: "3px 10px", borderRadius: 999, background: on ? "#22c55e22" : "#64748b22", color: on ? "#4ade80" : "#94a3b8", border: `1px solid ${on ? "#22c55e55" : "#64748b44"}` }}>{on ? "ON" : "OFF"}</span>
    </button>
  );
}

// ── Tutoriel de première utilisation (5 écrans) ──
function Tutorial({ onClose }) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const steps = [
    ["🚢", "Place ta flotte", "Chaque joueur place secrètement 4 bateaux sur la cible : simple, double, triple et Shanghai."],
    ["🎯", "3 fléchettes par tour", "À ton tour, tu lances 3 vraies fléchettes sur la cible."],
    ["👆", "Saisis la zone touchée", "Après chaque fléchette, appuie sur le téléphone sur la zone que tu as vraiment touchée."],
    ["🎨", "Lis les couleurs", "Bleu = à l'eau · Orange = touché · Rouge = bateau coulé. La cible ne montre que tes tirs."],
    ["🏆", "Coule toute la flotte", "Le premier à couler les 4 bateaux adverses gagne. Bonne chance, amiral !"],
  ];
  const [emo, title, text] = steps[step];
  const last = step === steps.length - 1;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "#000c", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "26px 22px", maxWidth: 340, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 50, marginBottom: 10 }}>{emo}</div>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>{title}</div>
        <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.6, marginBottom: 18, minHeight: 88 }}>{text}</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 18 }}>
          {steps.map((_, i) => <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i === step ? C.radar : "#334155" }} />)}
        </div>
        {last ? (
          <>
            <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, color: C.muted, marginBottom: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={dontShow} onChange={e => setDontShow(e.target.checked)} style={{ accentColor: C.radar, width: 16, height: 16 }} /> Ne plus afficher ce tutoriel
            </label>
            <button onClick={() => { if (dontShow) { try { localStorage.setItem("tc_tuto", "1"); } catch { /* */ } } onClose(); }} style={{ width: "100%", background: `linear-gradient(135deg,${C.radar},#16a34a)`, color: "#04140e", border: "none", borderRadius: 12, padding: "14px", fontWeight: 900, fontSize: 15, cursor: "pointer" }}>C'EST PARTI →</button>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ ...btnSec, padding: "13px 16px" }}>Passer</button>
            <button onClick={() => setStep(s => s + 1)} style={{ ...btnMain, flex: 1, padding: "13px" }}>Suivant →</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Composant principal ──
export const ToucheCoule = ({ setPage, joueur }) => {
  const [phase, setPhase] = useState("create"); // create | handoff | place | ready | battle
  const [players, setPlayers] = useState([
    { name: joueur?.pseudo || "", profileId: joueur?.id || null, photo: joueur?.photo || null },
    { name: "", profileId: null, photo: null },
  ]);
  const [fleets, setFleets] = useState([null, null]);
  const [placerIdx, setPlacerIdx] = useState(0);
  const [handoff, setHandoff] = useState(null); // { toName, subtitle, next }
  const [showQuit, setShowQuit] = useState(false);

  const setPlayer = (i, v) => setPlayers(p => p.map((x, k) => k === i ? v : x));
  const canStart = players[0].name.trim() && players[1].name.trim();

  // Fin du placement d'un joueur
  const onFleetPlaced = (idx, fleet) => {
    setFleets(f => f.map((x, k) => k === idx ? fleet : x));
    try { navigator.vibrate && navigator.vibrate([20, 40, 20]); } catch { /* */ }
    if (idx === 0) {
      setHandoff({ toName: players[1].name, subtitle: "Assure-toi que le joueur précédent ne regarde plus l'écran.", next: () => { setPlacerIdx(1); setPhase("place"); } });
      setPhase("handoff");
    } else {
      setPhase("ready");
    }
  };

  // ── État bataille ──
  const [attacker, setAttacker] = useState(0);       // joueur qui tire ce tour
  const [firstAtt, setFirstAtt] = useState(0);
  const [shots, setShots] = useState([{}, {}]);      // shots[att] = { zoneId: 'water'|'hit' } (tirs sur la flotte adverse)
  const [off, setOff] = useState([0, 0]);            // tirs hors cible par joueur
  const [log, setLog] = useState([[], []]);          // journal complet par attaquant (stats)
  const [turnShots, setTurnShots] = useState([]);    // tour courant : [{zone,result,ship}]
  const [mult, setMult] = useState(1);               // 1/2/3 pour la saisie
  const [anim, setAnim] = useState(null);            // animation de résultat en cours { result, ship, zone }
  const [pendingWin, setPendingWin] = useState(null);// victoire à afficher après l'anim du dernier coulé
  const [turnCount, setTurnCount] = useState(0);
  const [winner, setWinner] = useState(null);

  // ── Phase 3b : reprise, tutoriel, revanche ──
  const [resumable, setResumable] = useState(() => loadSave());               // partie sauvegardée retrouvée au démarrage
  const [showTuto, setShowTuto] = useState(() => { try { return !localStorage.getItem("tc_tuto"); } catch { return true; } });
  const [revStep, setRevStep] = useState(null);                              // null | 0 | 1 : joueur qui choisit garder/replacer en revanche

  // Sauvegarde auto pendant la bataille (pour « Reprendre » après une fermeture accidentelle).
  useEffect(() => {
    if (["b_ownfleet", "b_attack", "b_handoff"].includes(phase) && fleets[0] && fleets[1] && winner == null) {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify({ players, fleets, attacker, firstAtt, shots, off, log, turnShots, turnCount, winner: null })); } catch { /* */ }
    }
  }, [phase, shots, off, log, turnShots, attacker, turnCount, fleets, firstAtt, players, winner]);
  useEffect(() => { if (winner != null) clearSave(); }, [winner]);          // partie finie → plus de reprise

  const startBattle = (starter) => {
    const first = starter != null ? starter : Math.floor(Math.random() * 2);
    setFirstAtt(first); setAttacker(first);
    setShots([{}, {}]); setOff([0, 0]); setLog([[], []]); setTurnShots([]); setTurnCount(0); setWinner(null); setAnim(null); setPendingWin(null); setMult(1);
    setHandoff({ toName: players[first].name, subtitle: "L'écran suivant contient tes informations personnelles.", next: () => setPhase("b_ownfleet") });
    setPhase("b_handoff");
  };

  // Reprendre une bataille sauvegardée (repasse par un écran de passage → secret préservé).
  const resume = () => {
    const s = resumable; if (!s) return;
    setPlayers(s.players); setFleets(s.fleets); setAttacker(s.attacker); setFirstAtt(s.firstAtt);
    setShots(s.shots); setOff(s.off); setLog(s.log); setTurnShots(s.turnShots || []); setTurnCount(s.turnCount || 0);
    setWinner(null); setAnim(null); setPendingWin(null); setMult(1); setResumable(null);
    setHandoff({ toName: s.players[s.attacker].name, subtitle: "Reprise de la partie — l'écran suivant contient tes infos.", next: () => setPhase("b_ownfleet") });
    setPhase("b_handoff");
  };
  const quitToMenu = () => { clearSave(); setPage("jeux-flechettes"); };     // abandon volontaire → on efface la reprise

  // Revanche : chaque joueur choisit EN SECRET de garder ou de replacer sa flotte.
  const startRevanche = () => {
    setRevStep(0);
    setHandoff({ toName: players[0].name, subtitle: "Choisis en secret : garder ou replacer ta flotte.", next: () => setPhase("rev_choice") });
    setPhase("b_handoff");
  };
  const revNext = () => {
    if (revStep === 0) {
      setRevStep(1);
      setHandoff({ toName: players[1].name, subtitle: "Choisis en secret : garder ou replacer ta flotte.", next: () => setPhase("rev_choice") });
      setPhase("b_handoff");
    } else { setRevStep(null); startBattle(1 - firstAtt); }
  };

  // Un tir (zoneId : 'S19'|'D18'|'T20' | 'bull' | 'off')
  const fire = (zoneId) => {
    if (turnShots.length >= 3 || winner != null || anim) return; // bloqué pendant une animation
    const att = attacker, fleet = fleets[1 - att], sh = shots[att];
    let result, ship = null;
    if (zoneId === "off") { result = "off"; setOff(o => o.map((v, i) => i === att ? v + 1 : v)); }
    else if (zoneId === "bull") { result = "water"; }        // bull / bullseye = à l'eau
    else if (sh[zoneId]) { result = "already"; }             // zone déjà visée
    else {
      ship = shipOf(fleet, zoneId);
      if (!ship) { result = "water"; setShots(s => s.map((x, i) => i === att ? { ...x, [zoneId]: "water" } : x)); }
      else {
        const newSh = { ...sh, [zoneId]: "hit" };
        setShots(s => s.map((x, i) => i === att ? newSh : x));
        if (isSunk(fleet, newSh, ship)) { result = "sunk"; if (shipsLeft(fleet, newSh) === 0) setPendingWin(att); }
        else result = "hit";
      }
    }
    vib(result === "sunk" ? [40, 30, 40] : result === "hit" ? [25] : result === "already" ? [10] : [18]);
    const shot = { zone: zoneId, result, ship };
    setTurnShots(t => [...t, shot]); setLog(l => l.map((x, i) => i === att ? [...x, shot] : x));
    setAnim({ result, ship, zone: zoneId });
  };

  // Fin de l'animation d'un tir → on continue (ou on va à l'écran de victoire si dernier bateau)
  const animDone = () => {
    setAnim(null);
    if (pendingWin != null) { vib([60, 40, 60, 40, 140]); setWinner(pendingWin); setPhase("end"); setPendingWin(null); }
  };

  const undoLast = () => {
    if (!turnShots.length || winner != null || anim) return;
    const last = turnShots[turnShots.length - 1], att = attacker;
    setTurnShots(t => t.slice(0, -1)); setLog(l => l.map((x, i) => i === att ? x.slice(0, -1) : x));
    if (last.result === "off") setOff(o => o.map((v, i) => i === att ? Math.max(0, v - 1) : v));
    if (/^[SDT]/.test(last.zone) && ["water", "hit", "sunk"].includes(last.result))
      setShots(s => s.map((x, i) => { if (i !== att) return x; const c = { ...x }; delete c[last.zone]; return c; }));
    setPendingWin(null);
  };

  const endTurn = () => {
    setTurnCount(c => c + 1);
    const next = 1 - attacker;
    setAttacker(next); setTurnShots([]); setAnim(null); setPendingWin(null); setMult(1);
    setHandoff({ toName: players[next].name, subtitle: "L'écran suivant contient tes informations personnelles.", next: () => setPhase("b_ownfleet") });
    setPhase("b_handoff");
  };

  // ── Écran de création ──
  if (phase === "create") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", overflowY: "auto" }}>
        <style>{`@keyframes tcShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}`}</style>
        <div style={{ height: 46, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: `1px solid ${C.border}` }}>
          <button onClick={() => setPage("jeux-flechettes")} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex" }}><ArrowLeft size={20} /></button>
          <div style={{ flex: 1, textAlign: "center", fontWeight: 900, fontSize: 15 }}>🚢 TOUCHÉ-COULÉ</div>
          <div style={{ width: 20 }} />
        </div>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "18px 16px 60px" }}>
          {showTuto && <Tutorial onClose={() => setShowTuto(false)} />}
          {resumable && (
            <div style={{ background: "#0e1a14", border: `1px solid ${C.radar}55`, borderRadius: 14, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: C.radar, marginBottom: 3 }}>⚓ Bataille en cours retrouvée</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 11 }}>{resumable.players[0].name} contre {resumable.players[1].name}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={resume} style={{ flex: 1, background: `linear-gradient(135deg,${C.radar},#16a34a)`, color: "#04140e", border: "none", borderRadius: 12, padding: "12px", fontWeight: 900, fontSize: 14, cursor: "pointer" }}>▶ Reprendre</button>
                <button onClick={() => { clearSave(); setResumable(null); }} style={{ flex: 1, background: C.card, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Abandonner</button>
              </div>
            </div>
          )}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <PlayerField index={0} value={players[0]} onChange={v => setPlayer(0, v)} col={C.cyan} joueurId={joueur?.id} />
              <PlayerField index={1} value={players[1]} onChange={v => setPlayer(1, v)} col={C.orange} joueurId={joueur?.id} />
            </div>
          </div>
          <div style={{ background: "#0e1a14", border: `1px solid ${C.radar}33`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: C.radar, fontWeight: 800, letterSpacing: .5, marginBottom: 6 }}>RÈGLE DU JEU</div>
            <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>
              Placez secrètement vos <b>4 bateaux</b> sur la cible. Lancez <b>3 fléchettes par tour</b> et saisissez la zone touchée. <b>Coulez toute la flotte adverse</b> pour gagner !
            </p>
          </div>
          <VibToggle />
          <button onClick={() => { setPlacerIdx(0); setPhase("place"); }} disabled={!canStart}
            style={{ width: "100%", background: canStart ? `linear-gradient(135deg,${C.radar},#16a34a)` : C.border, color: canStart ? "#04140e" : C.muted, border: "none", borderRadius: 14, padding: "16px", fontWeight: 900, fontSize: 17, cursor: canStart ? "pointer" : "default" }}>
            COMMENCER →
          </button>
        </div>
      </div>
    );
  }

  if ((phase === "handoff" || phase === "b_handoff") && handoff) {
    return <HandoffScreen toName={handoff.toName} subtitle={handoff.subtitle} onReady={() => { const n = handoff.next; setHandoff(null); n(); }} />;
  }

  if (phase === "place") {
    return <PlacementScreen key={placerIdx} playerName={players[placerIdx].name}
      onDone={(fleet) => onFleetPlaced(placerIdx, fleet)} onQuit={() => setPage("jeux-flechettes")} />;
  }

  if (phase === "ready") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 54, marginBottom: 12 }}>⚓</div>
        <div style={{ fontWeight: 900, fontSize: 24, color: C.radar, marginBottom: 8 }}>LES DEUX FLOTTES SONT PRÊTES</div>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 30 }}>La bataille peut commencer !</p>
        <button onClick={() => startBattle()} style={{ background: `linear-gradient(135deg,${C.radar},#16a34a)`, border: "none", borderRadius: 16, padding: "18px 44px", color: "#04140e", fontWeight: 900, fontSize: 18, cursor: "pointer" }}>
          🎯 COMMENCER LA BATAILLE
        </button>
      </div>
    );
  }

  // ── Consultation de sa propre flotte (avant de tirer) ──
  if (phase === "b_ownfleet") {
    const myFleet = fleets[attacker], enemy = shots[1 - attacker];
    const stateOf = (cell) => { const k = shipOf(myFleet, cell.id); if (!k) return null; return enemy[cell.id] === "hit" ? "dmg" : "own"; };
    const info = (k) => { const zs = myFleet[k] || []; const hits = zs.filter(z => enemy[z] === "hit").length;
      const st = hits === 0 ? "Intact" : hits >= zs.length ? "Coulé" : (zs.length - hits === 1 ? "Gravement endommagé" : "Endommagé");
      return { st, col: hits === 0 ? C.radar : hits >= zs.length ? C.red : C.orange, hits, total: zs.length }; };
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {showQuit && <QuitModal onCancel={() => setShowQuit(false)} onQuit={quitToMenu} />}
        <div style={{ height: 46, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={() => setShowQuit(true)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex" }}><ArrowLeft size={20} /></button>
          <div style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 14 }}>🛡️ TA FLOTTE — {players[attacker].name.toUpperCase()}</div>
          <div style={{ width: 20 }} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px 20px" }}>
          <div style={{ maxWidth: 380, margin: "0 auto" }}>
            <Board stateOf={stateOf} activeType={null} onTap={null} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
              {SHIP_KEYS.map(k => { const s = SHIPS[k], nf = info(k); return (
                <div key={k} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: s.col }} /><span style={{ fontWeight: 800, fontSize: 13 }}>{s.short}</span></div>
                  <div style={{ fontSize: 11, color: nf.col, marginTop: 3, fontWeight: 700 }}>{nf.st} ({nf.hits}/{nf.total})</div>
                </div>
              ); })}
            </div>
            <button onClick={() => setPhase("b_attack")} style={{ ...btnMain, width: "100%", marginTop: 16, padding: "15px", fontSize: 16 }}>🎯 COMMENCER MON TOUR</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Écran d'attaque ──
  if (phase === "b_attack") {
    const fleet = fleets[1 - attacker], sh = shots[attacker];
    const stateOf = (cell) => { const s = sh[cell.id]; if (!s) return null; if (s === "water") return "water"; const k = shipOf(fleet, cell.id); return (k && isSunk(fleet, sh, k)) ? "sunk" : "hit"; };
    const left = shipsLeft(fleet, sh), done = turnShots.length >= 3;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {showQuit && <QuitModal onCancel={() => setShowQuit(false)} onQuit={quitToMenu} />}
        {anim && <AnimOverlay anim={anim} onDone={animDone} />}
        <div style={{ height: 46, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <button onClick={() => setShowQuit(true)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex" }}><ArrowLeft size={20} /></button>
          <div style={{ flex: 1, textAlign: "center", fontWeight: 800, fontSize: 14 }}>🎯 {players[attacker].name.toUpperCase()} ATTAQUE</div>
          <div style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>{turnShots.length}/3</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px 14px" }}>
          <div style={{ maxWidth: 380, margin: "0 auto" }}>
            <div style={{ textAlign: "center", fontSize: 13, color: C.muted, marginBottom: 6 }}>
              Flotte ennemie : <b style={{ color: left === 1 ? C.red : C.text }}>{left} restant{left > 1 ? "s" : ""}</b>{left === 1 && <span style={{ color: C.red, fontWeight: 800 }}> · PLUS QU'UN NAVIRE !</span>}
            </div>
            <Board stateOf={stateOf} activeType={null} onTap={null} />
            {done ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, textAlign: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 6 }}>TOUR TERMINÉ</div>
                  <div style={{ fontSize: 13, color: C.muted }}>{turnSummary(turnShots)}</div>
                  <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Flotte ennemie restante : <b style={{ color: C.text }}>{left}</b></div>
                </div>
                <button onClick={endTurn} style={{ ...btnMain, width: "100%", marginTop: 12, padding: "15px", fontSize: 16 }}>TERMINER MON TOUR →</button>
              </div>
            ) : (
              <DartInput mult={mult} setMult={setMult} onFire={fire} onUndo={undoLast} canUndo={turnShots.length > 0} />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Revanche : garder ou replacer sa flotte (en secret) ──
  if (phase === "rev_choice") {
    const p = players[revStep];
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🔄</div>
        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 6 }}>{p.name}, ta flotte ?</div>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 28, maxWidth: 300 }}>Personne ne voit ton choix. Tu peux garder la même flotte ou en placer une toute nouvelle.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 300 }}>
          <button onClick={revNext} style={{ background: `linear-gradient(135deg,${C.radar},#16a34a)`, border: "none", borderRadius: 14, padding: "16px", color: "#04140e", fontWeight: 900, fontSize: 16, cursor: "pointer" }}>⚓ Garder ma flotte</button>
          <button onClick={() => setPhase("rev_place")} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", color: C.text, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>🎯 Replacer ma flotte</button>
        </div>
      </div>
    );
  }
  if (phase === "rev_place") {
    return <PlacementScreen key={"rev" + revStep} playerName={players[revStep].name}
      onDone={(fleet) => { setFleets(f => f.map((x, i) => i === revStep ? fleet : x)); revNext(); }} onQuit={quitToMenu} />;
  }

  // ── Fin de partie ──
  if (phase === "end") {
    const w = winner, wl = log[w] || [];
    const darts = wl.length, hits = wl.filter(s => s.result === "hit" || s.result === "sunk").length;
    const water = wl.filter(s => s.result === "water").length, already = wl.filter(s => s.result === "already").length;
    const sunkList = wl.filter(s => s.result === "sunk").map(s => s.ship);
    const precision = darts > 0 ? (hits / darts * 100) : 0;
    const rows = [
      ["Tours joués", turnCount + 1], ["Fléchettes lancées", darts], ["Impacts réussis", hits],
      ["Tirs à l'eau", water], ["Zones déjà visées", already], ["Hors cible", off[w]],
      ["Bateaux coulés", sunkList.length], ["Précision", precision.toFixed(1).replace(".", ",") + " %"],
      ["Premier coulé", sunkList[0] ? SHIPS[sunkList[0]].short : "—"], ["Dernier coulé", sunkList.length ? SHIPS[sunkList[sunkList.length - 1]].short : "—"],
    ];
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", overflowY: "auto" }}>
        <ConfettiBurst data={confettiData} />
        <div style={{ maxWidth: 380, margin: "0 auto", padding: "28px 16px 40px", textAlign: "center" }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
          <div style={{ fontWeight: 900, fontSize: 14, color: C.red, letterSpacing: 1 }}>FLOTTE ENNEMIE ANÉANTIE</div>
          <div style={{ fontWeight: 900, fontSize: 25, color: C.radar, margin: "8px 0" }}>{players[w].name} remporte la bataille !</div>
          <div style={{ display: "inline-block", background: "#1a1206", border: `1px solid ${C.orange}55`, color: C.orange, fontWeight: 800, fontSize: 12, borderRadius: 20, padding: "5px 14px", marginBottom: 20 }}>⚓ AMIRAL DE LA PARTIE</div>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "6px 16px", marginBottom: 20 }}>
            {rows.map(([k, v], i) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none" }}>
                <span style={{ fontSize: 13, color: C.muted }}>{k}</span><span style={{ fontSize: 13, fontWeight: 800 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button onClick={startRevanche} style={{ ...btnMain, padding: "15px" }}>🔄 Revanche</button>
            <button onClick={() => { clearSave(); setFleets([null, null]); setPlacerIdx(0); setPhase("create"); }} style={{ ...btnSec, padding: "14px" }}>Nouvelle partie</button>
            <button onClick={() => setPage("jeux-flechettes")} style={{ ...btnSec, padding: "14px" }}>← Retour aux jeux</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
