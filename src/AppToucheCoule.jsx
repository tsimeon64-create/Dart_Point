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

// ── Champ « nom OU profil Dart Point » ──
function PlayerField({ index, value, onChange, col }) {
  const [q, setQ] = useState(value.name || "");
  const [res, setRes] = useState([]);
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2 || (value.profileId && s === value.name)) { setRes([]); return; }
    const t = setTimeout(async () => {
      const r = await sbTC(`joueurs?pseudo=ilike.*${encodeURIComponent(s)}*&select=id,pseudo,photo&limit=5`);
      setRes(Array.isArray(r) ? r : []);
    }, 300);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  const inp = { width: "100%", background: "#0b0b12", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 15, boxSizing: "border-box" };
  return (
    <div>
      <label style={{ fontSize: 12, color: col, fontWeight: 800, display: "block", marginBottom: 6, letterSpacing: .4 }}>JOUEUR {index + 1}</label>
      <input value={q} onChange={e => { setQ(e.target.value); onChange({ name: e.target.value, profileId: null, photo: null }); }}
        placeholder="Nom du joueur…" style={inp} />
      {res.length > 0 && (
        <div style={{ marginTop: 6, background: "#0b0b12", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
          <div style={{ fontSize: 10, color: C.muted, padding: "6px 12px 2px", fontWeight: 700 }}>PROFILS DART POINT</div>
          {res.map(p => (
            <div key={p.id} onClick={() => { setQ(p.pseudo); setRes([]); onChange({ name: p.pseudo, profileId: p.id, photo: p.photo || null }); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderTop: `1px solid ${C.border}` }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: `${col}33`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.photo ? <img src={p.photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <EmoIcon e="🎯" size={13} color={col} />}
              </div>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{p.pseudo}</span>
            </div>
          ))}
        </div>
      )}
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
      <div style={{ height: 46, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={onQuit} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex" }}><ArrowLeft size={20} /></button>
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
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <PlayerField index={0} value={players[0]} onChange={v => setPlayer(0, v)} col={C.cyan} />
              <PlayerField index={1} value={players[1]} onChange={v => setPlayer(1, v)} col={C.orange} />
            </div>
          </div>
          <div style={{ background: "#0e1a14", border: `1px solid ${C.radar}33`, borderRadius: 14, padding: 14, marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: C.radar, fontWeight: 800, letterSpacing: .5, marginBottom: 6 }}>RÈGLE DU JEU</div>
            <p style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>
              Placez secrètement vos <b>4 bateaux</b> sur la cible. Lancez <b>3 fléchettes par tour</b> et saisissez la zone touchée. <b>Coulez toute la flotte adverse</b> pour gagner !
            </p>
          </div>
          <button onClick={() => { setPlacerIdx(0); setPhase("place"); }} disabled={!canStart}
            style={{ width: "100%", background: canStart ? `linear-gradient(135deg,${C.radar},#16a34a)` : C.border, color: canStart ? "#04140e" : C.muted, border: "none", borderRadius: 14, padding: "16px", fontWeight: 900, fontSize: 17, cursor: canStart ? "pointer" : "default" }}>
            COMMENCER →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "handoff" && handoff) {
    return <HandoffScreen toName={handoff.toName} subtitle={handoff.subtitle} onReady={() => { const n = handoff.next; setHandoff(null); n(); }} />;
  }

  if (phase === "place") {
    return <PlacementScreen key={placerIdx} playerName={players[placerIdx].name}
      onDone={(fleet) => onFleetPlaced(placerIdx, fleet)} onQuit={() => setShowQuit(true)} />;
  }

  if (phase === "ready") {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: C.bg, color: C.text, fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>🎯</div>
        <div style={{ fontWeight: 900, fontSize: 24, color: C.radar, marginBottom: 8 }}>LES DEUX FLOTTES SONT PRÊTES</div>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>La bataille peut commencer.</p>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 18px", marginBottom: 28, maxWidth: 320 }}>
          <div style={{ fontSize: 12, color: C.muted }}>⚓ La <b style={{ color: C.text }}>bataille</b> (tirs, touché / coulé, statistiques) arrive à la <b style={{ color: C.text }}>prochaine étape</b>. Le placement des flottes, lui, est prêt et fonctionnel !</div>
        </div>
        <button onClick={() => setPage("jeux-flechettes")} style={{ ...btnSec, padding: "14px 28px" }}>← Retour aux jeux</button>
      </div>
    );
  }

  return null;
};
