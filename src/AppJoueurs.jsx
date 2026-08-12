import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowLeft, Check, Camera, Pencil, Save, BarChart2, Users, Medal, Clock, Trophy, Skull, Target, ChevronRight, ChevronDown, X, TrendingUp, TrendingDown, Crown, Swords, Search, User, Gem, Globe, Building2, Shield, Settings, MapPin, Crosshair, Star, Zap, Flame, Sparkles, Snowflake, Minus, ArrowUp, ArrowDown, Gamepad2, Dices, Scale, Beer, Cake, HeartCrack, Circle, Bomb, Sprout, List, Cog, Hand, Rocket, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { EmoIcon } from "./icons";
import { confirmer } from "./uiConfirm.jsx";

// ── Modal de crop circulaire (zoom + drag) — réutilisable ─────────────────────
const CropPhotoModal = ({ imageDataUrl, onSave, onClose, label="Cadrer la photo" }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x:0, y:0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x:0, y:0, ox:0, oy:0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgNat, setImgNat] = useState({ w:0, h:0 });
  const BOX = 260;

  useEffect(() => {
    if (!imageDataUrl) return;
    const img = new Image();
    img.onload = () => { setImgNat({ w:img.width, h:img.height }); setImgLoaded(true); };
    img.src = imageDataUrl;
  }, [imageDataUrl]);

  const onPointerDown = (e) => {
    e.preventDefault();
    dragStart.current = { x:e.clientX, y:e.clientY, ox:offset.x, oy:offset.y };
    setDragging(true);
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    setOffset({ x: dragStart.current.ox + (e.clientX - dragStart.current.x), y: dragStart.current.oy + (e.clientY - dragStart.current.y) });
  };
  const onPointerUp = () => setDragging(false);

  const baseScale = imgNat.w && imgNat.h ? Math.max(BOX/imgNat.w, BOX/imgNat.h) : 1;
  const totalScale = baseScale * zoom;

  const handleSave = () => {
    if (!imgLoaded) return;
    const OUT = 320;
    const canvas = document.createElement("canvas");
    canvas.width = OUT; canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, OUT, OUT);
    const ratio = OUT / BOX;
    const drawW = imgNat.w * totalScale * ratio;
    const drawH = imgNat.h * totalScale * ratio;
    const dx = (OUT - drawW)/2 + offset.x * ratio;
    const dy = (OUT - drawH)/2 + offset.y * ratio;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, dx, dy, drawW, drawH);
      onSave(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.src = imageDataUrl;
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"#000000ee", zIndex:1500, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#0d0d14", border:"1px solid #2a2a2a", borderRadius:18, padding:18, maxWidth:340, width:"100%" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
          <div style={{ fontWeight:900, fontSize:15, color:"#f1f5f9" }}>📷 {label}</div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#64748b", fontSize:20, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        <div
          onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}
          style={{
            position:"relative", width:BOX, height:BOX, margin:"0 auto 12px",
            background:"#000", borderRadius:12, overflow:"hidden",
            cursor: dragging ? "grabbing" : "grab", touchAction:"none",
            border:"1px solid #2a2a2a",
          }}>
          {imageDataUrl && (
            <img src={imageDataUrl} alt="" draggable={false}
              style={{
                position:"absolute", left:"50%", top:"50%",
                transform:`translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${totalScale})`,
                transformOrigin:"center center",
                userSelect:"none", pointerEvents:"none", maxWidth:"none",
              }}/>
          )}
          <div aria-hidden style={{
            position:"absolute", inset:0,
            boxShadow:"0 0 0 9999px #000000bb inset",
            borderRadius:"50%",
            pointerEvents:"none",
            border:"2px solid #f97316aa",
          }}/>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
          <button onClick={()=>setZoom(z => Math.max(0.4, +(z - 0.1).toFixed(2)))}
            style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", color:"#f1f5f9", borderRadius:8, padding:"4px 10px", fontWeight:900, fontSize:14, cursor:"pointer", lineHeight:1 }}>−</button>
          <input type="range" min={0.4} max={3} step={0.02} value={zoom}
            onChange={e=>setZoom(parseFloat(e.target.value))}
            style={{ flex:1, accentColor:"#f97316" }}/>
          <button onClick={()=>setZoom(z => Math.min(3, +(z + 0.1).toFixed(2)))}
            style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", color:"#f1f5f9", borderRadius:8, padding:"4px 10px", fontWeight:900, fontSize:14, cursor:"pointer", lineHeight:1 }}>+</button>
          <span style={{ fontSize:11, color:"#f1f5f9", minWidth:38, textAlign:"right" }}>{zoom.toFixed(2)}x</span>
        </div>
        <div style={{ fontSize:10, color:"#64748b", textAlign:"center", marginBottom:12 }}>
          Glisse pour positionner · Zoom pour ajuster
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onClose} style={{ flex:1, background:"#1a1a1a", border:"1px solid #2a2a2a", color:"#64748b", borderRadius:10, padding:"10px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Annuler</button>
          <button onClick={handleSave} disabled={!imgLoaded} style={{ flex:1, background:"linear-gradient(135deg,#f97316,#ea580c)", border:"none", color:"#fff", borderRadius:10, padding:"10px", fontWeight:900, fontSize:13, cursor: imgLoaded?"pointer":"not-allowed", boxShadow:"0 4px 14px #f9731666" }}>
            ✓ Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
};

// ── AppJoueurs.jsx ────────────────────────────────────────────────────────────
// Système joueurs DartPoint : inscription, profils, duels, présence, scoreur
// Importé depuis App.jsx

const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";

const sbJ = async (path, opts = {}) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": opts.prefer || "return=representation", ...opts.headers },
    ...opts,
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

// Appel de l'Edge Function `auth` (login / register / reset). Le mot de passe est vérifié
// CÔTÉ SERVEUR (PBKDF2) ; le hash ne transite jamais au client. Retourne { ok, error?, joueur? }.
export const callAuth = async (action, payload = {}) => {
  try {
    const res = await fetch(`${SB_URL}/functions/v1/auth`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data?.ok === true, ...data };
  } catch {
    return { ok: false, error: "Connexion au serveur impossible" };
  }
};

// Corrige les scores de manches corrompus (ancien bug : loser score = winner score)
const fixManches = (d) => {
  let sc = d.score_manches_challenger ?? 0;
  let sd = d.score_manches_defie ?? 0;
  if (sc === sd && sc > 0 && d.gagnant_id) {
    if (d.gagnant_id === d.challenger_id) sd = 0;
    else sc = 0;
  }
  return { sc, sd };
};

export const hashPwd = async (pwd) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pwd));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
};

export const todayStr = () => new Date().toISOString().slice(0, 10);

// Pseudo : lettres (y compris accentuées), chiffres, tiret, underscore, point — pas de caractères spéciaux
export const PSEUDO_REGEX = /^[a-zA-ZÀ-ÿ0-9_\-.]+$/;
export const validerPseudo = (pseudo) => {
  const p = pseudo.trim();
  if (p.length < 3)  return "Pseudo trop court (min 3 caractères)";
  if (p.length > 20) return "Pseudo trop long (max 20 caractères)";
  if (!PSEUDO_REGEX.test(p)) return "Caractères spéciaux non autorisés (lettres, chiffres, - _ . uniquement)";
  return null; // ok
};

// Colonnes publiques de `joueurs` (TOUT sauf password_hash) — pour ne jamais demander le hash
// au client (permet de le verrouiller côté base sans casser ces requêtes).
// NB : email/nom/prénom volontairement EXCLUS (PII non exposée à la clé publique). Le joueur
// récupère SES propres infos au login (fonction `auth`) ; l'admin les lit via `admin-ops`.
// NB : finishs_doubles n'est PAS dans JOUEUR_COLS exprès — la colonne peut ne pas
// encore exister (SQL à lancer par l'utilisateur). On la lit à part via dbJ.getFinishs
// (qui renvoie {} en cas d'erreur), pour ne JAMAIS casser login/profils/classement.
const JOUEUR_COLS = "id,pseudo,bar_slug,asso_slug,date_inscription,actif,drix,photo,age,ville,style_jeu,bull_balance,last_daily_reward,bull_reserved,niveau,cgu_accepte,cgu_date,anonymise,anonymise_date,xp,xp_badges_credited";

export const dbJ = {
  getJoueurs: () => sbJ(`joueurs?order=pseudo.asc&select=${JOUEUR_COLS}`),
  getJoueur: (id) => sbJ(`joueurs?id=eq.${id}&select=${JOUEUR_COLS}`).then(r => r?.[0]),
  getJoueurByPseudo: (pseudo) => sbJ(`joueurs?pseudo=eq.${encodeURIComponent(pseudo)}&select=${JOUEUR_COLS}`).then(r => r?.[0]),
  getJoueurByPseudoIlike: (pseudo) => sbJ(`joueurs?pseudo=ilike.${encodeURIComponent(pseudo)}&select=id,pseudo`).then(r => r?.[0]),
  addJoueur: (d) => sbJ("joueurs", { method: "POST", body: JSON.stringify(d) }),
  updateJoueur: (id, d) => sbJ(`joueurs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(d), prefer: "return=minimal" }),
  // Compteur des doubles de finish (stat « finish favori ») — { "1":n, ..., "20":n, "B":n }
  getFinishs: (id) => sbJ(`joueurs?id=eq.${id}&select=finishs_doubles`).then(r => r?.[0]?.finishs_doubles || {}).catch(() => ({})),
  getJoueursByBar: (slug) => sbJ(`joueurs?bar_slug=eq.${encodeURIComponent(slug)}&select=${JOUEUR_COLS}`),
  getStats: (joueur_id) => sbJ(`stats_joueurs?joueur_id=eq.${joueur_id}&select=*`).then(r => r?.[0]),
  addStats: (d) => sbJ("stats_joueurs", { method: "POST", body: JSON.stringify(d) }),
  updateStats: (id, d) => sbJ(`stats_joueurs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(d), prefer: "return=minimal" }),
  getDuels: (joueur_id) => sbJ(`duels?or=(challenger_id.eq.${joueur_id},defie_id.eq.${joueur_id})&order=date.desc&select=*`),
  // Amis acceptés d'un joueur (pour le mode bot) + profils par lot (pseudo/photo/drix).
  getAmis: (id) => sbJ(`amis?or=(joueur_id.eq.${id},ami_id.eq.${id})&statut=eq.accepte&select=*`),
  getJoueursByIds: (ids) => (ids && ids.length ? sbJ(`joueurs?id=in.(${ids.join(",")})&select=${JOUEUR_COLS}`) : Promise.resolve([])),
  // Vraies volées d'un joueur sur ses 5 dernières parties live (pour le bot « replay »).
  // 5 et pas 10 : on veut son niveau ACTUEL. Sur 10 parties on mélangeait des soirées vieilles de
  // deux semaines avec sa forme du moment, et le bot devenait un joueur moyen qui n'existe pas.
  // ⚠️ On part de SES VOLÉES, pas de la table des sessions. Une partie jouée contre son bot crée
  // bien une session à son nom, mais elle ne contient plus aucune volée de lui (voir pushLiveVolee
  // dans AppJeux) : partir des sessions faisait donc consommer les 10 places par des parties vides,
  // et le bot finissait par se calibrer sur du vide ou sur lui-même. Ici, une partie sans volée de
  // lui est simplement ignorée.
  getVoleesReelles: async (joueur_id) => {
    const recentes = await sbJ(`live_volees?joueur_id=eq.${joueur_id}&select=session_id,date&order=date.desc&limit=900`).catch(() => []);
    if (!Array.isArray(recentes) || !recentes.length) return [];
    const ids = [];
    for (const v of recentes) {
      if (v.session_id && !ids.includes(v.session_id)) ids.push(v.session_id);
      if (ids.length >= 5) break;
    }
    if (!ids.length) return [];
    const vol = await sbJ(`live_volees?session_id=in.(${ids.join(",")})&joueur_id=eq.${joueur_id}&select=score,reste,session_id&order=session_id.asc,numero_volee.asc`).catch(() => []);
    return Array.isArray(vol) ? vol : [];
  },
  addDuel: (d) => sbJ("duels", { method: "POST", body: JSON.stringify(d) }),
  updateDuel: (id, d) => sbJ(`duels?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(d), prefer: "return=minimal" }),
  getDuelsEnAttente: (joueur_id) => sbJ(`duels?defie_id=eq.${joueur_id}&statut=eq.en_attente&select=*`),
  deleteDuel: (id) => sbJ(`duels?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
  getPresences: (bar_slug) => sbJ(`presences?bar_slug=eq.${encodeURIComponent(bar_slug)}&date_jour=eq.${todayStr()}&select=*`),
  addPresence: (d) => sbJ("presences", { method: "POST", body: JSON.stringify(d) }),
  deletePresence: (id) => sbJ(`presences?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
  getMyPresence: (joueur_id, bar_slug) => sbJ(`presences?joueur_id=eq.${joueur_id}&bar_slug=eq.${encodeURIComponent(bar_slug)}&date_jour=eq.${todayStr()}&select=*`).then(r => r?.[0]),
  getBarsActifs: () => sbJ(`presences?date_jour=eq.${todayStr()}&select=bar_slug`),
};

// ── Couleurs ──────────────────────────────────────────────────────────────────
const CJ = {
  bg:"#0f0f0f", card:"#1a1a1a", border:"#2a2a2a",
  accent:"#f97316", text:"#f1f5f9", muted:"#94a3b8",
  green:"#22c55e", red:"#ef4444", yellow:"#f59e0b", purple:"#a78bfa", blue:"#60a5fa",
};

// ── Graphique d'évolution des DRIX : onglets de période + échelle (paliers) + dates ──
const DrixEvolution = ({ drixMvts = [], current = 1000 }) => {
  const [periode, setPeriode] = useState("7j"); // 7j | 30j | 365j | tout
  const now = Date.now();
  const JOUR = 86400000;

  // Série ascendante des vraies valeurs de DRIX (v = après le mouvement, v0 = avant)
  const asc = (drixMvts || [])
    .filter(m => m && m.date)
    .map(m => ({ t:m.date, v:(m.drix_apres ?? m.drix_avant ?? current), v0:(m.drix_avant ?? m.drix_apres ?? current) }))
    .sort((a, b) => a.t - b.t);

  const PERIODES = [
    { k:"7j", l:"7 jours", jours:7 }, { k:"30j", l:"Mois", jours:30 },
    { k:"365j", l:"Année", jours:365 }, { k:"tout", l:"Tout", jours:null },
  ];

  const Onglets = () => (
    <div style={{ display:"flex", gap:6, marginTop:12 }}>
      {PERIODES.map(p => {
        const on = p.k === periode;
        return (
          <button key={p.k} onClick={() => setPeriode(p.k)}
            style={{ flex:1, padding:"8px 0", borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:700, touchAction:"manipulation",
              border:`1px solid ${on ? CJ.blue : CJ.border}`, background: on ? `${CJ.blue}1e` : "transparent", color: on ? CJ.blue : CJ.muted }}>
            {p.l}
          </button>
        );
      })}
    </div>
  );

  if (asc.length < 2) {
    return (
      <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:800, color:CJ.muted, letterSpacing:1, marginBottom:8 }}><TrendingUp size={14} color={CJ.green}/> ÉVOLUTION DRIX</div>
        <p style={{ color:CJ.muted, fontSize:12, textAlign:"center", padding:"18px 0" }}>Pas encore assez d'historique DRIX pour afficher la courbe.</p>
        <Onglets/>
      </div>
    );
  }

  const conf = PERIODES.find(p => p.k === periode) || PERIODES[0];
  const start = conf.jours == null ? asc[0].t : now - conf.jours * JOUR;

  // Valeur au début de la fenêtre = dernière valeur connue avant `start` (sinon la toute 1re)
  const avant = asc.filter(p => p.t < start);
  const valDebut = avant.length ? avant[avant.length - 1].v : asc[0].v0;

  // Points tracés : ancrage au début + mouvements dans la fenêtre + point "aujourd'hui"
  const pts = [{ t:start, v:valDebut }, ...asc.filter(p => p.t >= start && p.t <= now), { t:now, v:current }]
    .sort((a, b) => a.t - b.t);

  // Échelle Y (paliers arrondis)
  const vals = pts.map(p => p.v);
  let vmin = Math.min(...vals), vmax = Math.max(...vals);
  if (vmin === vmax) { vmin -= 20; vmax += 20; }
  const STEPS = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  const step = STEPS.find(s => s >= (vmax - vmin) / 4) || 5000;
  const tickMin = Math.floor(vmin / step) * step;
  const tickMax = Math.ceil(vmax / step) * step;
  const ticks = [];
  for (let t = tickMin; t <= tickMax + 0.5; t += step) ticks.push(t);

  // Étiquettes de dates (axe X) selon la période
  const clean = (s) => s.replace(".", "");
  const xticks = [];
  if (periode === "7j") {
    const d0 = new Date(now); d0.setHours(12, 0, 0, 0);
    for (let i = 6; i >= 0; i--) { const t = d0.getTime() - i * JOUR; xticks.push({ t, label:clean(new Date(t).toLocaleDateString("fr-FR", { weekday:"short" })) }); }
  } else if (periode === "365j") {
    const d = new Date(start); d.setDate(1); d.setHours(12, 0, 0, 0);
    const mois = [];
    while (d.getTime() <= now) { mois.push(d.getTime()); d.setMonth(d.getMonth() + 1); }
    const stepM = Math.max(1, Math.ceil(mois.length / 6));
    mois.filter((_, i) => i % stepM === 0).forEach(t => xticks.push({ t, label:clean(new Date(t).toLocaleDateString("fr-FR", { month:"short" })) }));
  } else {
    const N = 5, span = now - start, long = span > 400 * JOUR;
    for (let i = 0; i < N; i++) {
      const t = start + span * (i / (N - 1));
      const label = periode === "30j"
        ? new Date(t).toLocaleDateString("fr-FR", { day:"numeric", month:"numeric" })
        : clean(new Date(t).toLocaleDateString("fr-FR", long ? { month:"short", year:"2-digit" } : { day:"numeric", month:"short" }));
      xticks.push({ t, label });
    }
  }

  // Géométrie SVG
  const XL = 34, XR = 314, YT = 8, YB = 116;
  const px = (t) => XL + ((t - start) / ((now - start) || 1)) * (XR - XL);
  const py = (v) => YB - ((v - tickMin) / ((tickMax - tickMin) || 1)) * (YB - YT);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.t).toFixed(1)},${py(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${px(pts[pts.length - 1].t).toFixed(1)},${YB} L${px(pts[0].t).toFixed(1)},${YB} Z`;

  const variation = Math.round(pts[pts.length - 1].v - pts[0].v);
  const positif = variation >= 0;
  const accent = positif ? CJ.green : CJ.red;
  const gid = "drixgrad-" + periode + "-" + (positif ? "g" : "r");

  return (
    <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:800, color:CJ.muted, letterSpacing:1 }}><TrendingUp size={14} color={accent}/> ÉVOLUTION DRIX</div>
        <span style={{ fontWeight:800, fontSize:15, color:accent }}>{positif ? "+" : ""}{variation} <span style={{ fontSize:10, color:CJ.muted, fontWeight:600 }}>{conf.l.toLowerCase()}</span></span>
      </div>

      <svg viewBox="0 0 320 140" style={{ width:"100%", height:"auto", display:"block" }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28"/>
            <stop offset="100%" stopColor={accent} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={XL} y1={py(t)} x2={XR} y2={py(t)} stroke={CJ.border} strokeWidth="0.6" strokeDasharray="2 3"/>
            <text x={XL - 4} y={py(t) + 3} textAnchor="end" style={{ fill:CJ.muted, fontSize:8, fontWeight:600 }}>{t}</text>
          </g>
        ))}
        <path d={area} fill={`url(#${gid})`}/>
        <path d={line} fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={px(pts[pts.length - 1].t)} cy={py(pts[pts.length - 1].v)} r="3.5" fill={accent}/>
        {xticks.map((x, i) => (
          <text key={i} x={Math.max(XL, Math.min(XR, px(x.t)))} y={132} textAnchor="middle" style={{ fill:CJ.muted, fontSize:8, fontWeight:600 }}>{x.label}</text>
        ))}
      </svg>

      <Onglets/>
    </div>
  );
};

// Évolution de la MOYENNE (points par volée de 3 fléchettes) — même carte, mêmes périodes et même
// géométrie que DrixEvolution ci-dessus, volontairement : c'est le même geste pour l'utilisateur.
//
// Différence de FOND avec le DRIX : le DRIX est un NIVEAU (chaque mouvement remplace le précédent,
// on trace la valeur telle quelle). Une moyenne est un ÉCHANTILLON par match. Tracer les 129 matchs
// un par un sur 280 px de large donnerait un zigzag illisible où aucune tendance ne se voit.
// On regroupe donc : une moyenne par JOUR joué (7 jours / Mois) ou par MOIS (Année / Tout).
// `moyMvts` = [{t: date, v: moyenne du match}] — voir myMoy() dans PageProfilStats.
const MoyenneEvolution = ({ moyMvts = [] }) => {
  const [periode, setPeriode] = useState("30j"); // la moyenne bouge moins vite que le DRIX
  const now = Date.now();
  const JOUR = 86400000;

  const asc = (moyMvts || [])
    .filter(m => m && m.t && m.v != null && m.v > 0)
    .sort((a, b) => a.t - b.t);

  const PERIODES = [
    { k:"7j", l:"7 jours", jours:7 }, { k:"30j", l:"Mois", jours:30 },
    { k:"365j", l:"Année", jours:365 }, { k:"tout", l:"Tout", jours:null },
  ];

  const Onglets = () => (
    <div style={{ display:"flex", gap:6, marginTop:12 }}>
      {PERIODES.map(p => {
        const on = p.k === periode;
        return (
          <button key={p.k} onClick={() => setPeriode(p.k)}
            style={{ flex:1, padding:"8px 0", borderRadius:9, cursor:"pointer", fontSize:12, fontWeight:700, touchAction:"manipulation",
              border:`1px solid ${on ? CJ.blue : CJ.border}`, background: on ? `${CJ.blue}1e` : "transparent", color: on ? CJ.blue : CJ.muted }}>
            {p.l}
          </button>
        );
      })}
    </div>
  );

  const Vide = (txt) => (
    <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:800, color:CJ.muted, letterSpacing:1, marginBottom:8 }}><BarChart2 size={14} color={CJ.blue}/> ÉVOLUTION MOYENNE</div>
      <p style={{ color:CJ.muted, fontSize:12, textAlign:"center", padding:"18px 0" }}>{txt}</p>
      <Onglets/>
    </div>
  );

  if (asc.length < 2) return Vide("Pas encore assez de matchs pour afficher la courbe.");

  const conf = PERIODES.find(p => p.k === periode) || PERIODES[0];
  const parMois = periode === "365j" || periode === "tout";

  // ⚠️ La fenêtre DOIT tomber sur des frontières de jour (ou de mois), parce qu'on regroupe par jour
  // civil. Un start à « il y a exactement 7×24 h » coupe le premier jour en deux : le point n'affiche
  // alors que la moyenne des matchs joués après cette heure-là, le compteur de matchs est faux, et la
  // variation peut changer de SIGNE ET DE COULEUR (un +30 vert affiché pour une vraie baisse de 7,5).
  const debutJour = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const debutMois = (t) => { const d = new Date(t); d.setDate(1); d.setHours(0, 0, 0, 0); return d.getTime(); };
  let start;
  if (conf.jours == null) start = parMois ? debutMois(asc[0].t) : debutJour(asc[0].t);
  else if (parMois) { const d = new Date(now); d.setMonth(d.getMonth() - 11); start = debutMois(d.getTime()); } // 12 mois ENTIERS
  else start = debutJour(now - (conf.jours - 1) * JOUR);                                                        // N jours ENTIERS, aujourd'hui inclus
  // Sur « Tout », un match daté dans le futur (horloge de téléphone en avance) ne doit pas disparaître
  // en silence : on étend la fin de la fenêtre au lieu de jeter le match.
  const fin = conf.jours == null ? Math.max(now, asc[asc.length - 1].t) : now;

  const cle = (t) => { const d = new Date(t); return parMois ? `${d.getFullYear()}-${d.getMonth()}` : `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

  const groupes = new Map();
  asc.filter(m => m.t >= start && m.t <= fin).forEach(m => {
    const k = cle(m.t);
    const g = groupes.get(k) || { somme:0, n:0, tSomme:0 };
    g.somme += m.v; g.n += 1; g.tSomme += m.t;
    groupes.set(k, g);
  });
  // Chaque point est posé sur l'instant MOYEN de ses matchs. Deux avantages : il tombe forcément
  // dans la fenêtre (donc jamais hors cadre), et il vit dans le MÊME repère que les étiquettes de
  // l'axe X — un point calé d'autorité à midi ou au 15 du mois pouvait sortir de la fenêtre et se
  // retrouver décalé par rapport à sa propre date.
  const pts = [...groupes.values()].map(g => ({ t:g.tSomme / g.n, v:g.somme / g.n, n:g.n })).sort((a, b) => a.t - b.t);
  const nbMatchs = pts.reduce((a, p) => a + p.n, 0);

  if (pts.length < 2) return Vide(nbMatchs === 0
    ? "Aucun match sur cette période."
    : `Un seul ${parMois ? "mois" : "jour"} joué sur cette période — il en faut au moins deux pour tracer une évolution.`);

  // Échelle Y — pas adaptés à des moyennes (≈ 20 à 180), pas à des DRIX à 4 chiffres.
  const vals = pts.map(p => p.v).filter(v => Number.isFinite(v));
  if (!vals.length) return Vide("Moyennes illisibles sur cette période.");
  let vmin = Math.min(...vals), vmax = Math.max(...vals);
  if (vmin === vmax) { vmin -= 5; vmax += 5; }
  const STEPS = [1, 2, 5, 10, 20, 25, 50, 100];
  const step = STEPS.find(x => x >= (vmax - vmin) / 4) || 100;
  const tickMin = Math.max(0, Math.floor(vmin / step) * step);
  const tickMax = Math.ceil(vmax / step) * step;
  const ticks = [];
  for (let t = tickMin; t <= tickMax + 0.5 && ticks.length < 40; t += step) ticks.push(t);

  // Étiquettes de l'axe X — elles doivent parler de la MÊME granularité que les points : quand on
  // regroupe par mois, on étiquette des mois (avant, « Tout » regroupait par mois mais affichait des
  // jours, donc aucune étiquette ne tombait sur un point).
  const clean = (str) => str.replace(".", "");
  const xticks = [];
  if (periode === "7j") {
    for (let i = 0; i < conf.jours; i++) {
      const t = start + i * JOUR + JOUR / 2; // milieu de la journée = sous son point
      xticks.push({ t, label:clean(new Date(t).toLocaleDateString("fr-FR", { weekday:"short" })) });
    }
  } else if (parMois) {
    const d = new Date(start);
    const mois = [];
    while (d.getTime() <= fin && mois.length < 400) { mois.push(d.getTime()); d.setMonth(d.getMonth() + 1); }
    const stepM = Math.max(1, Math.ceil(mois.length / 6));
    const avecAnnee = mois.length > 13; // sinon deux « juil » identiques sur la vue Année
    mois.filter((_, i) => i % stepM === 0).forEach(t => {
      const mid = new Date(t); mid.setDate(15);
      xticks.push({ t:mid.getTime(), label:clean(new Date(t).toLocaleDateString("fr-FR", avecAnnee ? { month:"short", year:"2-digit" } : { month:"short" })) });
    });
  } else {
    const N = 5, span = fin - start;
    for (let i = 0; i < N; i++) {
      const t = start + span * (i / (N - 1));
      xticks.push({ t, label:new Date(t).toLocaleDateString("fr-FR", { day:"numeric", month:"numeric" }) });
    }
  }

  // Géométrie SVG — mêmes bornes que DrixEvolution, et un SEUL repère temporel (start → fin)
  // partagé par la courbe et par les étiquettes.
  const XL = 34, XR = 314, YT = 8, YB = 116;
  const px = (t) => XL + ((t - start) / ((fin - start) || 1)) * (XR - XL);
  const py = (v) => YB - ((v - tickMin) / ((tickMax - tickMin) || 1)) * (YB - YT);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${px(p.t).toFixed(1)},${py(p.v).toFixed(1)}`).join(" ");
  const area = `${line} L${px(pts[pts.length - 1].t).toFixed(1)},${YB} L${px(pts[0].t).toFixed(1)},${YB} Z`;

  const variation = +(pts[pts.length - 1].v - pts[0].v).toFixed(1);
  const positif = variation >= 0;
  const accent = positif ? CJ.green : CJ.red;
  const gid = "moygrad-" + periode + "-" + (positif ? "g" : "r");

  return (
    <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, fontWeight:800, color:CJ.muted, letterSpacing:1 }}><BarChart2 size={14} color={accent}/> ÉVOLUTION MOYENNE</div>
        <span style={{ fontWeight:800, fontSize:15, color:accent }}>{positif ? "+" : ""}{variation} <span style={{ fontSize:10, color:CJ.muted, fontWeight:600 }}>{conf.l.toLowerCase()}</span></span>
      </div>
      <div style={{ fontSize:9.5, color:CJ.muted, fontWeight:600, marginBottom:8 }}>
        Moyenne pts/volée · un point par {parMois ? "mois" : "jour"} joué · {nbMatchs} match{nbMatchs > 1 ? "s" : ""} pris en compte
      </div>

      <svg viewBox="0 0 320 140" style={{ width:"100%", height:"auto", display:"block" }} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.28"/>
            <stop offset="100%" stopColor={accent} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={XL} y1={py(t)} x2={XR} y2={py(t)} stroke={CJ.border} strokeWidth="0.6" strokeDasharray="2 3"/>
            <text x={XL - 4} y={py(t) + 3} textAnchor="end" style={{ fill:CJ.muted, fontSize:8, fontWeight:600 }}>{t}</text>
          </g>
        ))}
        <path d={area} fill={`url(#${gid})`}/>
        <path d={line} fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Les points sont peu nombreux : on les matérialise pour qu'on voie les jours réellement joués. */}
        {pts.length <= 14 && pts.slice(0, -1).map((p, i) => (
          <circle key={i} cx={px(p.t)} cy={py(p.v)} r="2" fill={accent} fillOpacity="0.75"/>
        ))}
        <circle cx={px(pts[pts.length - 1].t)} cy={py(pts[pts.length - 1].v)} r="3.5" fill={accent}/>
        {xticks.map((x, i) => (
          <text key={i} x={Math.max(XL, Math.min(XR, px(x.t)))} y={132} textAnchor="middle" style={{ fill:CJ.muted, fontSize:8, fontWeight:600 }}>{x.label}</text>
        ))}
      </svg>

      <Onglets/>
    </div>
  );
};

const BtnJ = ({ children, onClick, variant="primary", style={}, disabled=false }) => {
  const variants = {
    primary:{ background:CJ.accent, color:"#fff", border:"none" },
    ghost:{ background:"transparent", color:CJ.accent, border:`1px solid ${CJ.accent}` },
    dark:{ background:CJ.card, color:CJ.text, border:`1px solid ${CJ.border}` },
    danger:{ background:"#7f1d1d", color:CJ.red, border:`1px solid ${CJ.red}44` },
    success:{ background:"#14532d", color:CJ.green, border:`1px solid ${CJ.green}44` },
    yellow:{ background:"#78350f", color:CJ.yellow, border:`1px solid ${CJ.yellow}44` },
  };
  const variantStyle = variants[variant];
  const disabledStyle = disabled ? { background:"#2a2a2a", color:"#64748b", border:"1px solid #333", opacity:.6 } : {};
  return <button onPointerDown={disabled?undefined:(e)=>{e.preventDefault();onClick&&onClick(e);}} style={{ cursor:disabled?"not-allowed":"pointer",borderRadius:8,fontWeight:600,fontSize:14,padding:"10px 20px",transition:"all .15s",touchAction:"manipulation",WebkitTapHighlightColor:"transparent",minHeight:40,...variantStyle,...disabledStyle,...style }}>{children}</button>;
};

const FieldJ = ({ label, value, onChange, placeholder, type="text", as="input", options }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
    {label && <label style={{ fontSize:13, fontWeight:500, color:CJ.muted }}>{label}</label>}
    {as==="select"
      ? <select value={value} onChange={e=>onChange(e.target.value)} style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:8,padding:"10px 14px",color:CJ.text,fontSize:14 }}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
      : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:8,padding:"10px 14px",color:CJ.text,fontSize:14 }}/>}
  </div>
);

const SpinnerJ = () => <div style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:40 }}><div style={{ width:32,height:32,border:`3px solid ${CJ.border}`,borderTop:`3px solid ${CJ.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/></div>;

const BadgeJ = ({ children, color=CJ.accent }) => <span style={{ background:color+"22",color,border:`1px solid ${color}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap" }}>{children}</span>;

// Titres DRIX — 9 rangs
const RANGS = [
  { titre:"Débutant",    min:0,    max:900,      emoji:"🎯",   color:"#64748b", icon:Target     },
  { titre:"Amateur",     min:900,  max:1100,     emoji:"🎯🎯", color:"#60a5fa", icon:Crosshair  },
  { titre:"Confirmé",    min:1100, max:1300,     emoji:"⭐",   color:"#22c55e", icon:Star       },
  { titre:"Expert",      min:1300, max:1500,     emoji:"⭐⭐", color:"#f59e0b", icon:Zap        },
  { titre:"Élite",       min:1500, max:1700,     emoji:"💎",   color:"#a78bfa", icon:Gem        },
  { titre:"Légende",     min:1700, max:2500,     emoji:"🏆",   color:"#f97316", icon:Trophy     },
  { titre:"Master Bull", min:2500, max:3200,     emoji:"👑",   color:"#ef4444", icon:Crown      },
  { titre:"Titan",       min:3200, max:4000,     emoji:"🔥",   color:"#dc2626", icon:Flame      },
  { titre:"Mythique",    min:4000, max:Infinity, emoji:"✨",   color:"#fbbf24", icon:Sparkles   },
];
const getDrixTitreLocal = (drix) => {
  for (const r of RANGS) { if (drix < r.max) return r; }
  return RANGS[RANGS.length - 1];
};
// Helper : icône Lucide du rang — remplace {emoji} dans toute l'UI
export const RankIcon = ({ drix, size=16, color:colorOverride }) => {
  const { icon:I, color } = getDrixTitreLocal(drix ?? 1000);
  return <I size={size} color={colorOverride ?? color}/>;
};
const getProgression = (drix) => {
  const cur = getDrixTitreLocal(drix);
  const idx = RANGS.findIndex(r => r.titre === cur.titre);
  if (cur.max === Infinity) return { pct:100, restant:0, prochain:null };
  const prochain = RANGS[idx + 1];
  const pct = Math.min(100, Math.round(((drix - cur.min) / (cur.max - cur.min)) * 100));
  return { pct, restant: cur.max - drix, prochain };
};


// ── CONNEXION / INSCRIPTION ───────────────────────────────────────────────────
export const Connexion = ({ onLogin, setPage, associations=[], initMode="login" }) => {
  const [mode, setMode] = useState(initMode); // "login" | "register" | "reset"
  const [pseudo, setPseudo] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [resetStep, setResetStep] = useState("request"); // "request" (e-mail) | "confirm" (code + nouveau mdp)
  const [codeRecu, setCodeRecu] = useState("");          // code à 6 chiffres reçu par mail
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  // Champs inscription
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [ville, setVille] = useState("");
  const [assoQuery, setAssoQuery] = useState("");
  const [selectedAsso, setSelectedAsso] = useState(null);
  const [assoOpen, setAssoOpen] = useState(false);
  const [niveau, setNiveau] = useState("");
  const [acceptCgu, setAcceptCgu] = useState(false);
  const [acceptAge, setAcceptAge] = useState(false);

  const assoSuggestions = assoQuery.length >= 1
    ? associations.filter(a => a.nom.toLowerCase().includes(assoQuery.toLowerCase()) || (a.ville||"").toLowerCase().includes(assoQuery.toLowerCase())).slice(0, 6)
    : [];

  const resetFields = () => { setErr(""); setSuccess(""); setPseudo(""); setPwd(""); setPwd2(""); setAdminCode(""); setResetStep("request"); setCodeRecu(""); setNom(""); setPrenom(""); setEmail(""); setVille(""); setAssoQuery(""); setSelectedAsso(null); setNiveau(""); setAcceptCgu(false); setAcceptAge(false); };

  const login = async () => {
    if (!pseudo.trim() || !pwd) return;
    setLoading(true); setErr("");
    try {
      const r = await callAuth("login", { pseudo: pseudo.trim(), password: pwd });
      if (!r.ok || !r.joueur) { setErr(r.error || "Pseudo ou mot de passe incorrect"); setLoading(false); return; }
      if (r.token) localStorage.setItem("dp_token", r.token);
      onLogin(r.joueur);
    } catch { setErr("Erreur de connexion"); }
    setLoading(false);
  };

  const register = async () => {
    if (!prenom.trim() || !nom.trim()) { setErr("Prénom et nom obligatoires"); return; }
    if (!email.trim() || !email.includes("@")) { setErr("Adresse e-mail invalide"); return; }
    if (!pseudo.trim() || !pwd || pwd !== pwd2) { setErr(pwd !== pwd2 ? "Les mots de passe ne correspondent pas" : "Pseudo et mots de passe obligatoires"); return; }
    const pseudoErr = validerPseudo(pseudo);
    if (pseudoErr) { setErr(pseudoErr); return; }
    if (!acceptAge) { setErr("Tu dois confirmer avoir au moins 13 ans"); return; }
    if (!acceptCgu) { setErr("Tu dois accepter les Conditions d'utilisation et la Politique de confidentialité"); return; }
    setLoading(true); setErr("");
    try {
      const r = await callAuth("register", {
        pseudo: pseudo.trim(),
        password: pwd,
        profil: {
          nom: nom.trim(),
          prenom: prenom.trim(),
          email: email.trim().toLowerCase(),
          ville: ville.trim() || null,
          asso_slug: selectedAsso?.slug || null,
          niveau: niveau || null,
        },
      });
      if (!r.ok || !r.joueur) { setErr(r.error || "Erreur lors de l'inscription"); setLoading(false); return; }
      if (r.token) localStorage.setItem("dp_token", r.token);
      await dbJ.addStats({ joueur_id: r.joueur.id, saison: "2025", victoires: 0, defaites: 0, parties: 0 }).catch(() => {});
      onLogin(r.joueur);
    } catch { setErr("Erreur lors de l'inscription"); }
    setLoading(false);
  };

  // Étape 1 : demander un code de réinitialisation par e-mail.
  const demanderCode = async () => {
    setErr(""); setSuccess("");
    if (!email.trim() || !email.includes("@")) { setErr("Entre ton adresse e-mail"); return; }
    setLoading(true);
    try {
      const r = await callAuth("requestReset", { email: email.trim().toLowerCase() });
      if (!r.ok) { setErr(r.error || "Impossible d'envoyer le code"); setLoading(false); return; }
      setResetStep("confirm");
      setSuccess("📩 Si un compte existe avec cet e-mail, un code vient d'être envoyé. Regarde ta boîte mail (et tes spams).");
    } catch { setErr("Erreur réseau"); }
    setLoading(false);
  };

  // Étape 2 : vérifier le code reçu et définir le nouveau mot de passe.
  const confirmerReset = async () => {
    setErr(""); setSuccess("");
    if (!codeRecu.trim()) { setErr("Entre le code reçu par mail"); return; }
    if (!pwd || pwd.length < 4) { setErr("Nouveau mot de passe trop court (min 4 caractères)"); return; }
    if (pwd !== pwd2) { setErr("Les mots de passe ne correspondent pas"); return; }
    setLoading(true);
    try {
      const r = await callAuth("confirmReset", { email: email.trim().toLowerCase(), resetCode: codeRecu.trim(), newPassword: pwd });
      if (!r.ok) { setErr(r.error || "Code incorrect"); setLoading(false); return; }
      setSuccess("✅ Mot de passe réinitialisé ! Redirection vers la connexion…");
      setTimeout(() => { setMode("login"); resetFields(); }, 1600);
    } catch { setErr("Erreur réseau"); }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth:440, margin:"40px auto", padding:"0 16px 40px" }}>
      <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:16, padding:"24px 20px" }}>
        <div style={{ fontSize:36, textAlign:"center", marginBottom:14 }}>🎯</div>

        {mode !== "reset" ? (<>
          <div style={{ display:"flex", gap:4, marginBottom:20, background:"#111", borderRadius:10, padding:4 }}>
            {[["login","Connexion"],["register","Inscription"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setErr("");}} style={{ flex:1,background:mode===m?CJ.accent:"transparent",color:mode===m?"#fff":CJ.muted,border:"none",borderRadius:8,padding:"8px",cursor:"pointer",fontWeight:600,fontSize:14 }}>{l}</button>
            ))}
          </div>

          {/* ── CONNEXION ── */}
          {mode === "login" && (
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <FieldJ label="Pseudo" value={pseudo} onChange={setPseudo} placeholder="VotrePseudo"/>
              <FieldJ label="Mot de passe" value={pwd} onChange={setPwd} placeholder="••••••••" type="password"/>
              {err && <p style={{ color:CJ.red, fontSize:13 }}>⚠️ {err}</p>}
              <BtnJ onClick={login} disabled={loading} style={{ marginTop:4 }}>
                {loading ? "Chargement…" : "Se connecter →"}
              </BtnJ>
              <button onClick={()=>{setMode("reset");resetFields();}} style={{ background:"none",border:"none",color:CJ.muted,fontSize:12,cursor:"pointer",textAlign:"center",marginTop:2 }}>
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {/* ── INSCRIPTION ── */}
          {mode === "register" && (
            <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
              {/* Identité */}
              <div style={{ fontSize:11,fontWeight:700,color:CJ.muted,letterSpacing:.5,marginBottom:2 }}>IDENTITÉ</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                <FieldJ label="Prénom *" value={prenom} onChange={setPrenom} placeholder="Jean"/>
                <FieldJ label="Nom *" value={nom} onChange={setNom} placeholder="Dupont"/>
              </div>
              <FieldJ label="Adresse e-mail *" value={email} onChange={setEmail} placeholder="jean@email.com" type="email"/>
              <FieldJ label="Ville de résidence" value={ville} onChange={setVille} placeholder="Bayonne"/>

              {/* Association */}
              <div style={{ position:"relative" }}>
                <div style={{ fontSize:12,color:CJ.muted,fontWeight:600,marginBottom:4 }}>Association</div>
                {selectedAsso ? (
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#1a1a2a",border:`1px solid ${CJ.accent}66`,borderRadius:8,padding:"9px 12px" }}>
                    <div>
                      <div style={{ fontWeight:700,fontSize:13,color:CJ.text }}>{selectedAsso.nom}</div>
                      {selectedAsso.ville && <div style={{ fontSize:11,color:CJ.muted }}>📍 {selectedAsso.ville}</div>}
                    </div>
                    <button onClick={()=>{ setSelectedAsso(null); setAssoQuery(""); }} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",fontSize:16,padding:0 }}>✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display:"flex",alignItems:"center",gap:8,background:CJ.bg,border:`1px solid ${CJ.border}`,borderRadius:8,padding:"9px 12px" }}>
                      <span style={{ fontSize:13,flexShrink:0 }}>🏛️</span>
                      <input
                        value={assoQuery}
                        onChange={e=>{ setAssoQuery(e.target.value); setAssoOpen(true); }}
                        onFocus={()=>setAssoOpen(true)}
                        placeholder="Rechercher une association…"
                        style={{ flex:1,background:"transparent",border:"none",color:CJ.text,fontSize:13,outline:"none",minWidth:0 }}
                      />
                      {assoQuery && <button onClick={()=>{ setAssoQuery(""); setAssoOpen(false); }} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",fontSize:14,padding:0 }}>✕</button>}
                    </div>
                    {assoOpen && assoSuggestions.length > 0 && (
                      <div style={{ position:"absolute",top:"100%",left:0,right:0,background:"rgba(15,15,24,0.98)",border:`1px solid ${CJ.border}`,borderRadius:10,zIndex:200,boxShadow:"0 8px 32px #000000aa",marginTop:4,overflow:"hidden" }}>
                        {assoSuggestions.map(a => (
                          <div key={a.slug} onClick={()=>{ setSelectedAsso(a); setAssoQuery(a.nom); setAssoOpen(false); }}
                            style={{ padding:"10px 14px",cursor:"pointer",borderBottom:`1px solid ${CJ.border}`,transition:"background .1s" }}
                            onMouseEnter={e=>e.currentTarget.style.background="#1a1a2a"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <div style={{ fontWeight:600,fontSize:13 }}>{a.nom}</div>
                            {a.ville && <div style={{ fontSize:11,color:CJ.muted }}>📍 {a.ville}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                    {assoOpen && assoQuery.length >= 2 && assoSuggestions.length === 0 && (
                      <div style={{ position:"absolute",top:"100%",left:0,right:0,background:"rgba(15,15,24,0.98)",border:`1px solid ${CJ.border}`,borderRadius:10,zIndex:200,padding:"10px 14px",marginTop:4,fontSize:12,color:CJ.muted }}>
                        Aucune association trouvée
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Niveau */}
              <div>
                <div style={{ fontSize:12,color:CJ.muted,fontWeight:600,marginBottom:6 }}>Niveau de jeu</div>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
                  {[["debutant","🎯 Débutant"],["intermediaire","⚡ Intermédiaire"],["confirme","🏆 Confirmé"],["expert","👑 Expert"]].map(([val,label])=>(
                    <button key={val} type="button" onClick={()=>setNiveau(v=>v===val?"":val)}
                      style={{ background:niveau===val?`${CJ.accent}22`:"#111",border:`1px solid ${niveau===val?CJ.accent:"#2a2a2a"}`,borderRadius:8,padding:"8px 6px",fontSize:12,fontWeight:700,color:niveau===val?CJ.accent:CJ.muted,cursor:"pointer",transition:"all .15s",textAlign:"center" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compte */}
              <div style={{ fontSize:11,fontWeight:700,color:CJ.muted,letterSpacing:.5,marginTop:4,marginBottom:2 }}>COMPTE</div>
              <FieldJ label="Pseudo *" value={pseudo} onChange={setPseudo} placeholder="VotrePseudo"/>
              <FieldJ label="Mot de passe *" value={pwd} onChange={setPwd} placeholder="••••••••" type="password"/>
              <FieldJ label="Confirmer le mot de passe *" value={pwd2} onChange={setPwd2} placeholder="••••••••" type="password"/>

              {/* Conformité Play Store / RGPD */}
              <div style={{ display:"flex",flexDirection:"column",gap:10,marginTop:4,padding:"12px",background:"#0a0a0f",border:"1px solid #1a1a2a",borderRadius:10 }}>
                {/* Age */}
                <label style={{ display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer" }}>
                  <input type="checkbox" checked={acceptAge} onChange={e=>setAcceptAge(e.target.checked)}
                    style={{ marginTop:2,width:16,height:16,accentColor:CJ.accent,flexShrink:0,cursor:"pointer" }}/>
                  <span style={{ fontSize:12,color:CJ.muted,lineHeight:1.5 }}>
                    J'ai au moins <strong style={{ color:CJ.text }}>13 ans</strong>
                  </span>
                </label>
                {/* CGU + Politique */}
                <label style={{ display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer" }}>
                  <input type="checkbox" checked={acceptCgu} onChange={e=>setAcceptCgu(e.target.checked)}
                    style={{ marginTop:2,width:16,height:16,accentColor:CJ.accent,flexShrink:0,cursor:"pointer" }}/>
                  <span style={{ fontSize:12,color:CJ.muted,lineHeight:1.5 }}>
                    J'accepte les{" "}
                    <a href="#" onClick={e=>{e.preventDefault(); if(window.setPageGlobal) window.setPageGlobal("mentions");}}
                      style={{ color:CJ.accent,textDecoration:"underline" }}>
                      Conditions d'utilisation
                    </a>
                    {" "}et la{" "}
                    <a href="/confidentialite.html" target="_blank" rel="noopener noreferrer"
                      style={{ color:CJ.accent,textDecoration:"underline" }}>
                      Politique de confidentialité
                    </a>
                    {" "}de DartPoint *
                  </span>
                </label>
                {/* RGPD */}
                <p style={{ fontSize:11,color:"#334155",lineHeight:1.5,margin:0 }}>
                  Conformément au RGPD, tes données ne sont utilisées que pour le fonctionnement de DartPoint. Tu peux demander leur suppression à t.simeon64@gmail.com.
                </p>
              </div>

              {err && <p style={{ color:CJ.red, fontSize:13 }}>⚠️ {err}</p>}
              <BtnJ onClick={register} disabled={loading||!acceptAge||!acceptCgu} style={{ marginTop:6,opacity:(!acceptAge||!acceptCgu)?.5:1 }}>
                {loading ? "Création en cours…" : "Créer mon compte →"}
              </BtnJ>
              <p style={{ fontSize:11,color:CJ.muted,textAlign:"center",marginTop:2 }}>* Champs obligatoires</p>
            </div>
          )}
        </>) : (<>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontWeight:700,fontSize:16,marginBottom:4 }}>🔑 Mot de passe oublié</div>
            <div style={{ fontSize:12,color:CJ.muted }}>
              {resetStep === "request"
                ? "Entre ton e-mail : on t'envoie un code pour réinitialiser ton mot de passe."
                : "Entre le code reçu par mail, puis choisis un nouveau mot de passe."}
            </div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            {resetStep === "request" ? (<>
              <FieldJ label="E-mail" value={email} onChange={setEmail} placeholder="ton@email.fr" type="email"/>
              {err && <p style={{ color:CJ.red, fontSize:13 }}>⚠️ {err}</p>}
              {success && <p style={{ color:"#22c55e", fontSize:13 }}>{success}</p>}
              <BtnJ onClick={demanderCode} disabled={loading} style={{ marginTop:4 }}>
                {loading ? "Envoi…" : "Envoyer le code →"}
              </BtnJ>
            </>) : (<>
              <FieldJ label="Code reçu par mail" value={codeRecu} onChange={setCodeRecu} placeholder="6 chiffres"/>
              <FieldJ label="Nouveau mot de passe" value={pwd} onChange={setPwd} placeholder="••••••••" type="password"/>
              <FieldJ label="Confirmer le mot de passe" value={pwd2} onChange={setPwd2} placeholder="••••••••" type="password"/>
              {err && <p style={{ color:CJ.red, fontSize:13 }}>⚠️ {err}</p>}
              {success && <p style={{ color:"#22c55e", fontSize:13 }}>{success}</p>}
              <BtnJ onClick={confirmerReset} disabled={loading} style={{ marginTop:4 }}>
                {loading ? "Validation…" : "Réinitialiser le mot de passe"}
              </BtnJ>
              <button onClick={()=>{ setResetStep("request"); setErr(""); setSuccess(""); }} style={{ background:"none",border:"none",color:CJ.muted,fontSize:12,cursor:"pointer",textAlign:"center" }}>
                ↩ Je n'ai pas reçu le code
              </button>
            </>)}
            <button onClick={()=>{setMode("login");resetFields();}} style={{ background:"none",border:"none",color:CJ.muted,fontSize:12,cursor:"pointer",textAlign:"center" }}>
              ← Retour à la connexion
            </button>
          </div>
        </>)}
      </div>
    </div>
  );
};

// ── MON PROFIL ────────────────────────────────────────────────────────────────
export const MonProfil = ({ joueur, setJoueur, bars, associations, setPage, setBarSlug, demandesAmisCount=0 }) => {
  const [stats, setStats]         = useState(null);
  const [onglet, setOnglet]       = useState("stats"); // onglet actif : stats | amis | badges | historique
  const [duels, setDuels]         = useState([]);
  const [drixMvts, setDrixMvts]   = useState([]);
  const [classement, setClassement] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tournoisPotes, setTournoisPotes] = useState([]);
  const [badgeCount, setBadgeCount] = useState(getBadgesStored(joueur.id).size);
  const [amisCount, setAmisCount] = useState(0);
  const [cropImage, setCropImage] = useState(null);
  const [finishsDbl, setFinishsDbl] = useState({}); // compteur des doubles de finish (stat « finish favori »)
  useEffect(() => { dbJ.getFinishs(joueur.id).then(setFinishsDbl).catch(() => {}); }, [joueur.id]);
  const BADGES_SEEN_KEY = `dp_badges_seen_${joueur.id}`;
  const [badgesSeen, setBadgesSeen] = useState(() => parseInt(localStorage.getItem(`dp_badges_seen_${joueur.id}`) || "0"));
  const newBadgesCount = Math.max(0, badgeCount - badgesSeen);

  // Edit mode
  const [editMode, setEditMode]   = useState(false);
  const [editAge, setEditAge]     = useState(joueur.age||"");
  const [editVille, setEditVille] = useState(joueur.ville||"");
  const [editStyle, setEditStyle] = useState(joueur.style_jeu||"electronique");
  const [editPseudo, setEditPseudo] = useState(joueur.pseudo||"");
  const [pseudoErreur, setPseudoErreur] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const photoRef = useRef(null);

  const PSEUDO_CHANGES_KEY = `dp_pseudo_changes_${joueur.id}`;
  // Source de vérité = colonne DB `joueurs.pseudo_changes_count`.
  // localStorage utilisé en cache (lecture instantanée) puis sync au mount.
  const getPseudoChanges = () => {
    const dbVal = joueur.pseudo_changes_count;
    const lsVal = parseInt(localStorage.getItem(PSEUDO_CHANGES_KEY)||"0");
    return Math.max(dbVal != null ? dbVal : 0, lsVal);
  };
  const [pseudoChanges, setPseudoChanges] = useState(getPseudoChanges);
  useEffect(() => {
    // À chaque changement de joueur (login/refresh), resync depuis DB
    if (joueur.pseudo_changes_count != null) {
      setPseudoChanges(prev => Math.max(prev, joueur.pseudo_changes_count));
      localStorage.setItem(PSEUDO_CHANGES_KEY, String(joueur.pseudo_changes_count));
    }
  }, [joueur.pseudo_changes_count]); // eslint-disable-line

  // Affiliations expand
  const [affilBar, setAffilBar]   = useState(false);
  const [affilAsso, setAffilAsso] = useState(false);
  const [searchAsso, setSearchAsso] = useState("");
  const [searchBar, setSearchBar]   = useState("");

  const bar  = bars.find(b => b.slug === joueur.bar_slug);
  const asso = associations.find(a => a.slug === joueur.asso_slug);
  const { titre, color } = getDrixTitreLocal(joueur.drix||1000);
  const prog = getProgression(joueur.drix||1000);
  const STYLES = [["electronique","⚡ Électronique"],["traditionnel","🎯 Traditionnel"],["les deux","🎯⚡ Les deux"]];

  // ── QR code du profil (contient les infos clés ; servira au scan d'inscription aux tournois) ──
  const [showQR, setShowQR] = useState(false);
  const [qrUrl, setQrUrl]   = useState("");
  const ouvrirQR = async () => {
    try {
      const data = JSON.stringify({
        app: "dartpoint", v: 1,
        id: joueur.id, pseudo: joueur.pseudo, drix: joueur.drix || 1000,
        ville: joueur.ville || null, niveau: joueur.niveau || null,
        style: joueur.style_jeu || null, age: joueur.age || null,
      });
      const url = await QRCode.toDataURL(data, { width: 320, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0f0f0f", light: "#ffffff" } });
      setQrUrl(url); setShowQR(true);
    } catch (e) { window.dpToast?.("Impossible de générer le QR code", "error"); }
  };

  useEffect(() => {
    Promise.all([
      dbJ.getStats(joueur.id),
      dbJ.getDuels(joueur.id),
      sbJ(`drix_mouvements?joueur_id=eq.${joueur.id}&order=date.desc&limit=200&select=*`).catch(()=>[]),
      sbJ(`joueurs?order=drix.desc&select=id`).catch(()=>[]),
      sbJ(`amis?or=(joueur_id.eq.${joueur.id},ami_id.eq.${joueur.id})&select=statut`).catch(()=>[]),
      // 🆕 Pour le calcul des badges sociaux/tournois (sinon soc_trn et soc_wtrn jamais débloqués)
      sbJ(`tournois_potes_joueurs?joueur_id=eq.${joueur.id}&select=tournoi_id`).catch(()=>[]),
      sbJ(`tournois_potes?gagnant_id=eq.${joueur.id}&select=id`).catch(()=>[]),
    ]).then(([s, d, mvts, allJ, amis, trn, wtrn]) => {
      setStats(s); setDuels(d||[]); setDrixMvts(mvts||[]);
      // Amis acceptés uniquement
      const amisOk = (amis||[]).filter(a => a.statut === "accepte" || a.statut === "accepté");
      setAmisCount(amisOk.length);
      if (allJ?.length) {
        const pos = allJ.findIndex(j => j.id === joueur.id);
        setClassement({ position: pos >= 0 ? pos + 1 : null, total: allJ.length });
      }
      // Calcul badge count réel — passe nbTournois et nbTournoisGagnes
      const vals = computeBadgeValues(joueur, s, d||[], mvts||[], amis||[], (trn||[]).length, (wtrn||[]).length);
      const unlocked = ALL_BADGES.filter(b=>b.val(vals)>=b.seuil).length;
      setBadgeCount(unlocked);
      storeBadgesSet(joueur.id, new Set(ALL_BADGES.filter(b=>b.val(vals)>=b.seuil).map(b=>b.id)));
      // ── XP : resynchronise l'XP réel (gagné en duel/présence) + crédite les badges (+100, 1 fois) ──
      // On relit l'XP FRAIS en base avant d'écrire, sinon le crédit badge écraserait l'XP
      // gagné en duel depuis le dernier chargement du prop `joueur`.
      dbJ.getJoueur(joueur.id).then(fresh => {
        if (!fresh) return;
        const cred = fresh.xp_badges_credited || 0;
        let newXp = fresh.xp || 0;
        if (unlocked > cred) {
          newXp += (unlocked - cred) * 100;
          sbJ(`joueurs?id=eq.${joueur.id}`, { method:"PATCH", prefer:"return=minimal", body: JSON.stringify({ xp:newXp, xp_badges_credited:unlocked }) }).catch(()=>{});
        }
        const credFinal = unlocked > cred ? unlocked : cred;
        if (setJoueur) setJoueur(p => ({ ...p, xp:newXp, xp_badges_credited:credFinal }));
      }).catch(()=>{});
      // Initialise le compteur "vus" si jamais défini (première connexion)
      if (!localStorage.getItem(`dp_badges_seen_${joueur.id}`)) {
        localStorage.setItem(`dp_badges_seen_${joueur.id}`, String(unlocked));
        setBadgesSeen(unlocked);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [joueur.id]);

  useEffect(() => {
    sbJ(`tournois_potes_joueurs?joueur_id=eq.${joueur.id}&select=tournoi_id,tournois_potes(id,nom,statut,createur_pseudo)`)
      .then(rows => {
        if (!rows) return;
        setTournoisPotes(rows.map(r=>r.tournois_potes).filter(t=>t&&t.statut!=="termine"));
      }).catch(() => {});
  }, [joueur.id]);

  const sauvegarderProfil = async () => {
    setPseudoErreur("");
    const newPseudo = editPseudo.trim();
    const pseudoChange = newPseudo && newPseudo !== joueur.pseudo;

    // Validation pseudo
    if (pseudoChange) {
      const pseudoErr = validerPseudo(newPseudo);
      if (pseudoErr) { setPseudoErreur(pseudoErr); return; }
      if (pseudoChanges >= 2) { setPseudoErreur("Limite de 2 changements atteinte"); return; }
      const exist = await dbJ.getJoueurByPseudoIlike(newPseudo);
      if (exist && exist.id !== joueur.id) {
        setPseudoErreur(`Ce pseudo est déjà pris${exist.pseudo !== newPseudo ? ` (par "${exist.pseudo}")` : ""}`);
        return;
      }
    }

    setSavingEdit(true);
    const patch = { age: parseInt(editAge)||null, ville: editVille.trim()||null, style_jeu: editStyle };
    if (pseudoChange) {
      patch.pseudo = newPseudo;
      patch.pseudo_changes_count = pseudoChanges + 1; // 🔒 DB source de vérité
    }
    await dbJ.updateJoueur(joueur.id, patch);
    const updated = {...joueur, ...patch};
    setJoueur(updated); localStorage.setItem("dp_joueur", JSON.stringify(updated));

    if (pseudoChange) {
      const newCount = pseudoChanges + 1;
      localStorage.setItem(PSEUDO_CHANGES_KEY, String(newCount));
      setPseudoChanges(newCount);
      // Cascade affichage : met à jour le pseudo dans les snapshots stockés.
      // NOTE : on ne touche PAS à challenger_pseudo/defie_pseudo dans duels,
      //         ni manches_detail[].winner (cassé le calcul des stats).
      Promise.all([
        sbJ(`drix_mouvements?joueur_id=eq.${joueur.id}`, { method:"PATCH", body:JSON.stringify({ joueur_pseudo:newPseudo }), prefer:"return=minimal" }),
        sbJ(`wall_posts?joueur_id=eq.${joueur.id}`,     { method:"PATCH", body:JSON.stringify({ joueur_pseudo:newPseudo }), prefer:"return=minimal" }),
        sbJ(`wall_comments?joueur_id=eq.${joueur.id}`,  { method:"PATCH", body:JSON.stringify({ joueur_pseudo:newPseudo }), prefer:"return=minimal" }),
        sbJ(`presences?joueur_id=eq.${joueur.id}`,      { method:"PATCH", body:JSON.stringify({ joueur_pseudo:newPseudo }), prefer:"return=minimal" }),
        sbJ(`amis?joueur_id=eq.${joueur.id}`,           { method:"PATCH", body:JSON.stringify({ joueur_pseudo:newPseudo }), prefer:"return=minimal" }),
        sbJ(`amis?ami_id=eq.${joueur.id}`,              { method:"PATCH", body:JSON.stringify({ ami_pseudo:newPseudo }),    prefer:"return=minimal" }),
      ].map(p => p.catch(()=>{})));
    }
    setSavingEdit(false); setEditMode(false);
    window.dpToast?.(pseudoChange ? "Pseudo et profil enregistrés" : "Profil enregistré", "success");
  };

  // Étape 1 : utilisateur choisit un fichier → on ouvre le modal de crop
  const uploadPhoto = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Pré-redimensionne pour limiter la mémoire avant crop (max 900px côté)
        const MAX = 900;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        setCropImage(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Étape 2 : après crop → sauvegarde + cascade sur les snapshots existants
  const saveCroppedPhoto = async (dataUrl) => {
    setCropImage(null);
    try {
      await dbJ.updateJoueur(joueur.id, { photo: dataUrl });
      const updated = { ...joueur, photo: dataUrl };
      setJoueur(updated); localStorage.setItem("dp_joueur", JSON.stringify(updated));
      window.dpToast?.("Photo de profil mise à jour", "success");
      // Cascade : mets à jour la photo dans tous les snapshots (wall_posts + wall_comments)
      // pour que la nouvelle photo apparaisse partout où elle a déjà été embarquée.
      Promise.all([
        sbJ(`wall_posts?joueur_id=eq.${joueur.id}`, {
          method:"PATCH", body: JSON.stringify({ joueur_photo: dataUrl }), prefer:"return=minimal",
        }).catch(()=>{}),
        sbJ(`wall_comments?joueur_id=eq.${joueur.id}`, {
          method:"PATCH", body: JSON.stringify({ joueur_photo: dataUrl }), prefer:"return=minimal",
        }).catch(()=>{}),
      ]);
    } catch {
      window.dpToast?.("Erreur lors de la mise à jour de la photo", "error");
    }
  };

  const choisirBar = async (slug) => {
    await dbJ.updateJoueur(joueur.id, { bar_slug: slug });
    const updated = {...joueur, bar_slug: slug};
    setJoueur(updated); localStorage.setItem("dp_joueur", JSON.stringify(updated));
    setAffilBar(false);
  };

  const choisirAsso = async (slug) => {
    await dbJ.updateJoueur(joueur.id, { asso_slug: slug });
    const updated = {...joueur, asso_slug: slug};
    setJoueur(updated); localStorage.setItem("dp_joueur", JSON.stringify(updated));
    setAffilAsso(false);
  };

  if (loading) return <SpinnerJ/>;

  const termines = duels.filter(d => d.statut === "termine");
  const winRate  = stats && stats.parties > 0 ? Math.round((stats.victoires / stats.parties) * 100) : 0;

  // ── Forme (10 derniers duels terminés) — pour les capsules ──
  const sortedTermines = [...termines].sort((a,b)=>(b.date||0)-(a.date||0));
  const derniers10 = sortedTermines.slice(0,10);
  const victoires10 = derniers10.filter(d=>d.gagnant_id===joueur.id).length;
  const formePct = derniers10.length>0 ? victoires10/derniers10.length : 0;
  const formeShort = formePct>=0.7?"En feu":formePct>=0.5?"En forme":formePct>=0.3?"Moyen":"Froid";
  const formeColorCap = formePct>=0.7?CJ.green:formePct>=0.5?CJ.blue:formePct>=0.3?CJ.yellow:CJ.red;

  // ── Tendance DRIX 7 jours ──
  const var7j = drixMvts.filter(m=>(Date.now()-(m.date||0))<7*86400000).reduce((s,m)=>s+(m.variation||0),0);

  // ── Série de victoires en cours ──
  const serieVictoires = (() => {
    const sorted = [...drixMvts].sort((a,b)=>(b.date||0)-(a.date||0));
    let count = 0;
    for (const m of sorted) { if (m.variation > 0) count++; else break; }
    return count;
  })();

  // ── Meilleur finish (capsule) ──
  let plusGrosFinish = 0;
  for (const d of termines) for (const m of (d.manches_detail || [])) {
    if (m.winner === joueur.pseudo) plusGrosFinish = Math.max(plusGrosFinish, m.winner_finish || 0);
  }

  // ── Finish favori (double sur lequel il finit le plus, saisi au scoreur) ──
  const finishStats = (() => {
    const map = finishsDbl || {};
    const entries = Object.entries(map).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return null;
    const lbl = (k) => k === "B" ? "Bull" : "Double " + k;
    const total = entries.reduce((s, [, c]) => s + c, 0);
    return { favLabel: lbl(entries[0][0]), favCount: entries[0][1], total, top: entries.slice(0, 4).map(([k, n]) => ({ k: k === "B" ? "Bull" : "D" + k, n })) };
  })();

  return (
    <div style={{ maxWidth:600, margin:"0 auto", padding:"16px 16px 80px" }}>

      {/* Modal de crop photo de profil */}
      {cropImage && (
        <CropPhotoModal
          imageDataUrl={cropImage}
          label="Cadrer ta photo"
          onSave={saveCroppedPhoto}
          onClose={()=>setCropImage(null)}
        />
      )}

      {/* ── 1. HERO PROFIL — CARTE JOUEUR PREMIUM ─────────────────────────── */}
      <div style={{
        position:"relative", overflow:"hidden",
        background:`linear-gradient(165deg,${color}1a 0%,#0a0a14 40%,#06060c 100%)`,
        border:`1.5px solid ${color}`,
        borderRadius:22, padding:"18px 16px", marginBottom:14,
        boxShadow:`0 0 40px ${color}44, 0 0 80px ${color}1a, inset 0 1px 0 #ffffff0a`,
      }}>
        <style>{`
          @keyframes monShine { 0%{transform:translateX(-150%) skewX(-22deg)} 100%{transform:translateX(280%) skewX(-22deg)} }
          @keyframes monGlow { 0%,100%{filter:drop-shadow(0 0 12px var(--gc)) drop-shadow(0 0 24px var(--gc))} 50%{filter:drop-shadow(0 0 20px var(--gc)) drop-shadow(0 0 40px var(--gc))} }
          @keyframes monBar { from{width:0} }
        `}</style>

        {/* Halos décoratifs */}
        <div aria-hidden style={{ position:"absolute", top:-60, right:-30, width:240, height:240, borderRadius:"50%", background:`radial-gradient(circle,${color}24 0%,transparent 70%)`, pointerEvents:"none" }}/>
        <div aria-hidden style={{ position:"absolute", bottom:-40, left:-40, width:180, height:180, borderRadius:"50%", background:`radial-gradient(circle,${color}14 0%,transparent 70%)`, pointerEvents:"none" }}/>
        {/* Cible texture en arrière-plan */}
        <div aria-hidden style={{ position:"absolute", top:"50%", right:"-20%", transform:"translateY(-50%)", fontSize:240, opacity:.03, lineHeight:1, pointerEvents:"none", color:color }}>🎯</div>
        {/* Shine balayage */}
        <div aria-hidden style={{ position:"absolute", top:0, left:0, bottom:0, width:100, background:"linear-gradient(90deg,transparent,#ffffff08,transparent)", animation:"monShine 5s ease-in-out infinite", pointerEvents:"none" }}/>

        {/* Bouton QR code du profil — haut droite */}
        <button onClick={ouvrirQR} aria-label="Afficher mon QR code"
          style={{ position:"absolute", top:12, right:12, zIndex:4, background:"#0a0a14cc", border:`1px solid ${color}88`, borderRadius:10, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", touchAction:"manipulation", backdropFilter:"blur(4px)" }}>
          <QrCode size={19} color={color}/>
        </button>

        {/* Header row : avatar(+camera) + identité(+pencil) + rang */}
        <div style={{ display:"flex", gap:14, alignItems:"center", position:"relative", marginBottom:12 }}>
          <div style={{ position:"relative", flexShrink:0 }}>
            <div onClick={()=>photoRef.current?.click()} style={{ position:"relative", zIndex:1,
              width:78, height:78, borderRadius:"50%", border:`3px solid ${color}`,
              boxShadow:`0 0 22px ${color}77`, overflow:"hidden", cursor:"pointer",
              background:color+"22", display:"flex", alignItems:"center", justifyContent:"center" }}>
              {joueur.photo
                ? <img src={joueur.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                : <RankIcon drix={joueur.drix||1000} size={32}/>}
            </div>
            <NiveauBulle xp={joueur.xp || 0} size={26} corner="top-right"/>
            <div onClick={()=>photoRef.current?.click()}
              style={{ position:"absolute",bottom:-2,right:-2,zIndex:2, background:"#f97316", borderRadius:"50%", width:24, height:24,
                display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", border:`2px solid #0a0a14`, boxShadow:"0 0 8px #f9731688" }}>
              <Camera size={12} color="#fff"/>
            </div>
            <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={uploadPhoto}/>
          </div>

          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <h1 style={{ fontWeight:900, fontSize:21, margin:0, lineHeight:1.05, color:"#fff", textShadow:`0 0 16px ${color}66` }}>{joueur.pseudo}</h1>
              {!editMode && (
                <button onClick={()=>{ setEditMode(true); setEditPseudo(joueur.pseudo); setPseudoErreur(""); }} aria-label="Modifier le profil"
                  style={{ background:"none",border:`1px solid ${CJ.border}`,color:CJ.muted,cursor:"pointer",borderRadius:6,padding:"3px 7px",touchAction:"manipulation",display:"flex",alignItems:"center",flexShrink:0 }}>
                  <Pencil size={11}/>
                </button>
              )}
            </div>
            {/* Rang */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:color+"22", border:`1px solid ${color}66`, borderRadius:20, padding:"3px 11px", marginBottom:6 }}>
              <RankIcon drix={joueur.drix||1000} size={15}/>
              <span style={{ fontWeight:800, fontSize:12.5, color, letterSpacing:.4, textTransform:"uppercase" }}>{titre}</span>
            </div>
            {/* Infos persos */}
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {joueur.ville && <BadgeJ color={CJ.blue}><EmoIcon e="📍" size={10} style={{verticalAlign:"-1px",marginRight:3}}/>{joueur.ville}</BadgeJ>}
              {joueur.age && <BadgeJ color={CJ.muted}><EmoIcon e="🎂" size={10} style={{verticalAlign:"-1px",marginRight:3}}/>{joueur.age} ans</BadgeJ>}
              {joueur.style_jeu && <BadgeJ color={CJ.accent}>{STYLES.find(s=>s[0]===joueur.style_jeu)?.[1]||joueur.style_jeu}</BadgeJ>}
            </div>
          </div>
        </div>

        {/* DRIX géant + classement + série (façon fiche adversaire) */}
        <div style={{ position:"relative", display:"flex", alignItems:"flex-end", justifyContent:"space-between", gap:10, flexWrap:"wrap", marginBottom:12 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"baseline", gap:7 }}>
              <span style={{ fontWeight:900, fontSize:"clamp(38px,11vw,46px)", color, lineHeight:.9, textShadow:`0 0 18px ${color}77`, filter:`drop-shadow(0 0 12px ${color}66)`, fontVariantNumeric:"tabular-nums" }}>{joueur.drix||1000}</span>
              <span style={{ fontSize:15, fontWeight:800, color, letterSpacing:1 }}>DRIX</span>
            </div>
            <div style={{ display:"flex", gap:7, marginTop:8, flexWrap:"wrap" }}>
              {classement?.position && (
                <span style={{ fontSize:12, color:"#fbbf24", fontWeight:900, background:"#f59e0b18", border:"1px solid #fbbf2466", borderRadius:8, padding:"3px 9px", boxShadow:"0 0 10px #fbbf2433" }}><EmoIcon e="🏆" size={11} color="#fbbf24" style={{verticalAlign:"-2px",marginRight:3}}/>#{classement.position} FRANCE</span>
              )}
              {serieVictoires>=2 && (
                <span style={{ fontSize:12, color:CJ.green, fontWeight:800, background:"#22c55e18", border:"1px solid #22c55e44", borderRadius:8, padding:"3px 9px" }}><EmoIcon e="🔥" size={11} color={CJ.green} style={{verticalAlign:"-2px",marginRight:3}}/>{serieVictoires} de suite</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Progression de rang DRIX (échangée avec le bloc XP) ── */}
        <div style={{
          background:`linear-gradient(135deg,${color}0f,#0d0d14)`,
          border:`1px solid ${color}55`,
          borderRadius:14, padding:14, marginBottom:14,
          boxShadow:`0 0 16px ${color}11`,
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <RankIcon drix={joueur.drix||1000} size={18}/>
              <span style={{ fontWeight:900, fontSize:13, color, letterSpacing:.5 }}>{titre}</span>
            </div>
            {prog.prochain ? (
              <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                <ChevronRight size={12} color={CJ.muted}/>
                <RankIcon drix={prog.prochain.min} size={14}/>
                <span style={{ fontWeight:700, fontSize:11, color:prog.prochain.color }}>{prog.prochain.titre}</span>
              </div>
            ) : (
              <span style={{ fontSize:11, color:CJ.yellow, fontWeight:700 }}>🏆 Rang max</span>
            )}
          </div>
          <div style={{ background:"#00000055", borderRadius:8, height:12, overflow:"hidden", marginBottom:6, border:`1px solid ${color}22`, position:"relative" }}>
            <div style={{
              height:"100%", borderRadius:8,
              background:`linear-gradient(90deg, ${color}aa, ${color}, ${color}cc)`,
              width:`${prog.pct}%`,
              transition:"width 1s cubic-bezier(.34,1.56,.64,1)",
              boxShadow:`0 0 12px ${color}aa, inset 0 1px 0 #ffffff33`,
              animation:"monBar 1s cubic-bezier(.34,1.56,.64,1) both",
            }}/>
          </div>
          <div style={{ textAlign:"center", fontSize:11, color:CJ.muted }}>
            {prog.prochain ? (
              <span>Plus que <strong style={{ color:prog.prochain.color, fontSize:13 }}>{prog.restant} DRIX</strong> pour <strong style={{ color:prog.prochain.color }}>{prog.prochain.titre}</strong> {prog.prochain.emoji}</span>
            ) : (
              <span style={{ color:CJ.yellow }}>🏆 Niveau maximal atteint</span>
            )}
          </div>
        </div>

        {/* Quick stats row (amis · badges · matchs) */}
        <div style={{
          display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6,
          padding:"8px 4px", borderRadius:12,
          background:"linear-gradient(135deg,#0a0a14aa,#06060ccc)",
          border:`1px solid ${color}33`,
          position:"relative",
        }}>
          {[
            { icon:Users, val:amisCount, label:"amis", col:CJ.green },
            { icon:Medal, val:badgeCount, label:"badges", col:"#fbbf24" },
            { icon:Swords, val:termines.length, label:"matchs", col:CJ.blue },
          ].map((s,i) => (
            <div key={i} style={{ textAlign:"center", borderRight: i<2 ? `1px solid ${color}22` : "none" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:3 }}><s.icon size={16} color={s.col} strokeWidth={2.5}/></div>
              <div style={{ fontWeight:900, fontSize:16, color:s.col, lineHeight:1, fontVariantNumeric:"tabular-nums" }}>{s.val}</div>
              <div style={{ fontSize:9, color:CJ.muted, letterSpacing:.5, textTransform:"uppercase", marginTop:1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Edit mode */}
        {editMode && (
          <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${CJ.border}33` }}>

            {/* Pseudo */}
            <div style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <label style={{ fontSize:11, color:CJ.muted }}>Pseudo</label>
                <span style={{ fontSize:10, color: pseudoChanges>=2?"#ef4444":CJ.muted }}>
                  {pseudoChanges}/2 changements utilisés
                </span>
              </div>
              <input
                value={editPseudo}
                onChange={e=>{ setEditPseudo(e.target.value); setPseudoErreur(""); }}
                placeholder={joueur.pseudo}
                disabled={pseudoChanges >= 2}
                style={{
                  width:"100%", background: pseudoChanges>=2?"#0a0a0a":"#111",
                  border:`1px solid ${pseudoErreur?"#ef4444":pseudoChanges>=2?"#2a2a2a":CJ.border}`,
                  borderRadius:8, padding:"10px 12px", color: pseudoChanges>=2?CJ.muted:CJ.text,
                  fontSize:16, boxSizing:"border-box", opacity: pseudoChanges>=2?0.5:1,
                  cursor: pseudoChanges>=2?"not-allowed":"text",
                }}
              />
              {pseudoErreur && <div style={{ fontSize:11, color:"#ef4444", marginTop:4 }}>⚠ {pseudoErreur}</div>}
              {pseudoChanges >= 2 && <div style={{ fontSize:11, color:"#ef4444", marginTop:4 }}>🔒 Limite atteinte — le pseudo ne peut plus être modifié</div>}
              {pseudoChanges < 2 && pseudoChanges > 0 && <div style={{ fontSize:11, color:"#f59e0b", marginTop:4 }}>⚠ Il te reste {2-pseudoChanges} changement{2-pseudoChanges>1?"s":""}</div>}
              {pseudoChanges === 0 && <div style={{ fontSize:11, color:CJ.muted, marginTop:4 }}>Tu peux changer ton pseudo 2 fois au total</div>}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:11,color:CJ.muted,display:"block",marginBottom:4 }}>Âge</label>
                <input value={editAge} onChange={e=>setEditAge(e.target.value)} placeholder="Ex: 28" type="number"
                  style={{ width:"100%",background:"#111",border:`1px solid ${CJ.border}`,borderRadius:8,padding:"10px 12px",color:CJ.text,fontSize:16 }}/>
              </div>
              <div>
                <label style={{ fontSize:11,color:CJ.muted,display:"block",marginBottom:4 }}>Ville</label>
                <input value={editVille} onChange={e=>setEditVille(e.target.value)} placeholder="Ex: Bayonne"
                  style={{ width:"100%",background:"#111",border:`1px solid ${CJ.border}`,borderRadius:8,padding:"10px 12px",color:CJ.text,fontSize:16 }}/>
              </div>
            </div>
            {/* Email — lecture seule */}
            <div style={{ marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <label style={{ fontSize:11,color:CJ.muted }}>Adresse e-mail</label>
                {!joueur.email && <span style={{ fontSize:10,color:"#f97316" }}>Non renseignée</span>}
              </div>
              <div style={{ position:"relative" }}>
                <input
                  readOnly
                  value={joueur.email || "—"}
                  style={{ width:"100%",background:"#0d0d0d",border:`1px solid ${CJ.border}`,borderRadius:8,padding:"10px 40px 10px 12px",color:joueur.email?"#94a3b8":"#475569",fontSize:14,cursor:"default",boxSizing:"border-box" }}
                />
                <span style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"#334155",userSelect:"none",background:"#1e293b",borderRadius:4,padding:"2px 6px" }}>lecture seule</span>
              </div>
              <p style={{ fontSize:10,color:"#334155",marginTop:4 }}>L'email ne peut pas être modifié ici pour protéger ton compte.</p>
            </div>
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11,color:CJ.muted,display:"block",marginBottom:4 }}>Style de jeu</label>
              <div style={{ display:"flex",gap:6 }}>
                {STYLES.map(([v,l])=>(
                  <button key={v} onClick={()=>setEditStyle(v)}
                    style={{ flex:1,background:editStyle===v?CJ.accent+"33":"#111",border:`1px solid ${editStyle===v?CJ.accent:CJ.border}`,borderRadius:8,padding:"7px 4px",cursor:"pointer",fontSize:11,color:editStyle===v?CJ.accent:CJ.muted,fontWeight:editStyle===v?700:400,touchAction:"manipulation" }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display:"flex",gap:8 }}>
              <BtnJ onClick={sauvegarderProfil} disabled={savingEdit} style={{ fontSize:13,padding:"8px 16px",display:"flex",alignItems:"center",gap:6 }}>{savingEdit?"…":<><Save size={14}/>Sauvegarder</>}</BtnJ>
              <BtnJ onClick={()=>{ setEditMode(false); setEditPseudo(joueur.pseudo); setPseudoErreur(""); }} variant="dark" style={{ fontSize:12,padding:"7px 16px" }}>Annuler</BtnJ>
            </div>
          </div>
        )}
      </div>

      {/* ── CAPSULES EXPRESS (façon fiche adversaire) ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6, marginBottom:14 }}>
        {[
          {icon:Flame,val:formeShort,lbl:"Forme",c:formeColorCap},
          {icon:Trophy,val:winRate+"%",lbl:"Win rate",c:CJ.yellow},
          {icon:Zap,val:(var7j>=0?"+":"")+var7j,lbl:"7 jours",c:var7j>=0?CJ.green:CJ.red},
          {icon:Crosshair,val:plusGrosFinish||"—",lbl:"Finish",c:CJ.accent},
        ].map((x,i)=>(
          <div key={i} style={{ background:CJ.card, border:`1px solid ${x.c}33`, borderRadius:12, padding:"10px 4px", textAlign:"center" }}>
            <div style={{ display:"flex", justifyContent:"center" }}><x.icon size={17} color={x.c} strokeWidth={2.5}/></div>
            <div style={{ fontWeight:900, fontSize:14, color:x.c, marginTop:4, lineHeight:1.1 }}>{x.val}</div>
            <div style={{ fontSize:8.5, color:CJ.muted, marginTop:2 }}>{x.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── FINISH FAVORI (double le plus utilisé pour finir, saisi au scoreur) ── */}
      {finishStats && (
        <div style={{ display:"flex", alignItems:"center", gap:12, background:"linear-gradient(135deg,#0e1a14,#0a0f0c)", border:`1px solid ${CJ.green}44`, borderRadius:14, padding:"11px 13px", marginBottom:14 }}>
          <div style={{ width:46, height:46, borderRadius:12, background:`${CJ.green}1f`, border:`1px solid ${CJ.green}66`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <span style={{ fontWeight:900, fontSize:14, color:CJ.green }}>{finishStats.top[0].k}</span>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:9.5, color:CJ.green, fontWeight:800, letterSpacing:1 }}>🎯 FINISH FAVORI</div>
            <div style={{ fontSize:15, fontWeight:900, color:CJ.text }}>{finishStats.favLabel} <span style={{ fontSize:12, fontWeight:700, color:CJ.muted }}>· {finishStats.favCount}×</span></div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:3 }}>
              {finishStats.top.map((t,i)=>(
                <span key={i} style={{ fontSize:10.5, color:i===0?CJ.green:CJ.muted, background:i===0?`${CJ.green}18`:"#ffffff08", border:`1px solid ${i===0?CJ.green+"55":CJ.border}`, borderRadius:6, padding:"1px 7px", fontWeight:700 }}>{t.k} : {t.n}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ⭐ Niveau XP + barre (échangé avec la progression de rang) */}
      <XpBlock xp={joueur.xp || 0} />

      {/* ── ONGLETS : Stats · Amis · Badges · Historique (le haut reste fixe ; le contenu change dessous ; barre collante) ── */}
      <style>{`.mp-tab{transition:transform .12s cubic-bezier(.22,.61,.36,1), box-shadow .15s ease, background .15s ease, border-color .15s ease;} .mp-tab:active{transform:scale(.955);}`}</style>
      <div style={{ position:"sticky", top:0, zIndex:6, background:"#0f0f0f", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:7, padding:"8px 0 10px", marginBottom:6 }}>
        {[
          { key:"stats",      icon:<BarChart2 size={15}/>, label:"Analyse",    color:CJ.blue },
          { key:"amis",       icon:<Users size={15}/>,     label:"Amis",       color:CJ.green,  badge:demandesAmisCount },
          { key:"badges",     icon:<Medal size={15}/>,     label:"Badges",     color:CJ.yellow, badge:newBadgesCount },
          { key:"historique", icon:<Clock size={15}/>,     label:"Historique", color:CJ.accent },
        ].map(({ key, icon, label, color: col, badge }) => {
          const actif = onglet === key;
          return (
          <button key={key} className="mp-tab" onClick={()=>{ if(key==="badges"){ const n=badgeCount; localStorage.setItem(BADGES_SEEN_KEY,String(n)); setBadgesSeen(n); } setOnglet(key); }}
            style={{ position:"relative", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, minWidth:0,
              // Look de vrai bouton : dégradé + bordure visible + relief (ombre portée + reflet haut)
              background: actif ? `linear-gradient(160deg,${col}3a,${col}16)` : "linear-gradient(160deg,#23232e,#17171f)",
              border:`1px solid ${actif ? col : "#3a3a46"}`, borderRadius:12, padding:"9px 4px", cursor:"pointer", touchAction:"manipulation",
              boxShadow: actif
                ? `0 6px 16px -7px ${col}b3, 0 0 14px ${col}33, inset 0 1px 0 #ffffff2e`
                : "0 4px 10px -5px #000000e6, inset 0 1px 0 #ffffff16" }}>
            {actif && <span style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:26, height:3, borderRadius:"0 0 3px 3px", background:col, boxShadow:`0 0 8px ${col}` }}/>}
            <span style={{ color:col, display:"flex", flexShrink:0, filter: actif?`drop-shadow(0 0 4px ${col}88)`:"none" }}>{icon}</span>
            <span style={{ fontSize:11, fontWeight: actif?800:700, color: actif?col:CJ.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"100%" }}>{label}</span>
            {badge > 0 && <span style={{ position:"absolute", top:-5, right:-5, background:CJ.green, color:"#fff", borderRadius:"50%", minWidth:16, height:16, padding:"0 3px", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, border:"2px solid #0f0f0f" }}>{badge>9?"9+":badge}</span>}
          </button>
          );
        })}
      </div>

      {/* ═══ ONGLET STATS : analyse + tournois + affiliations + compte ═══ */}
      {onglet === "stats" && (<>
      {/* ── ANALYSE COMPLÈTE (auto-scouting, façon fiche adversaire) ── */}
      <JoueurAnalyse j={joueur} stats={stats} duels={duels} drixMvts={drixMvts}/>

      {/* ── 4. TOURNOIS ACTIFS ─────────────────────────────────────────────── */}
      <div style={{ marginBottom:14 }}>
        {tournoisPotes.length > 0 ? (
          <div style={{ background:"#f9731611", border:`1px solid ${CJ.accent}55`, borderRadius:12, padding:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontWeight:700, fontSize:13, color:CJ.accent }}>🏓 Tournois actifs</span>
              <button onClick={()=>setPage("tournois-potes")} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",fontSize:11,touchAction:"manipulation" }}>Voir tous →</button>
            </div>
            {tournoisPotes.map(t => {
              const sl = { attente:"⏳ Lobby", poules:"🏟️ Poules", eliminatoires:"⚔️ Élim." }[t.statut] || t.statut;
              return (
                <div key={t.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",background:"#ffffff0d",borderRadius:8,padding:"9px 12px",marginBottom:6,gap:8 }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>🏓 {t.nom}</div>
                    <div style={{ fontSize:11, color:CJ.muted }}>par {t.createur_pseudo} · {sl}</div>
                  </div>
                  <button onClick={()=>setPage("tournoi-potes-"+t.id)}
                    style={{ background:CJ.accent,color:"#fff",border:"none",cursor:"pointer",padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:700,whiteSpace:"nowrap",touchAction:"manipulation" }}>
                    Rejoindre →
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <button onClick={()=>setPage("tournois-potes")}
            style={{ background:"#f9731611",border:`1px solid ${CJ.accent}44`,color:CJ.accent,cursor:"pointer",padding:"11px 16px",borderRadius:12,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:8,width:"100%",touchAction:"manipulation" }}>
            <span style={{ fontSize:18 }}>🏓</span>
            <span>Tournois entre potes</span>
            <span style={{ marginLeft:"auto",fontSize:11,color:CJ.muted }}>Voir mes tournois →</span>
          </button>
        )}
      </div>

      {/* ── 7. MES AFFILIATIONS ────────────────────────────────────────────── */}
      <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:16 }}>
        <div style={{ fontSize:11, color:CJ.muted, fontWeight:700, letterSpacing:1, marginBottom:12 }}>MES AFFILIATIONS</div>

        {/* Bar affilié */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:affilBar?10:0 }}>
            <div>
              <div style={{ fontSize:11, color:CJ.muted }}><EmoIcon e="🍺" size={10} style={{verticalAlign:"-1px",marginRight:3}}/>Bar affilié</div>
              <div style={{ fontWeight:700, fontSize:14, color: bar ? CJ.accent : CJ.muted }}>
                {bar ? bar.nom : "Aucun bar sélectionné"}
              </div>
              {bar && <div style={{ fontSize:11, color:CJ.muted }}>📍 {bar.ville}</div>}
            </div>
            <button onClick={()=>setAffilBar(x=>!x)}
              style={{ background:CJ.accent+"22",border:`1px solid ${CJ.accent}44`,color:CJ.accent,cursor:"pointer",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,touchAction:"manipulation",flexShrink:0 }}>
              {affilBar?"Fermer":"Changer"}
            </button>
          </div>
          {affilBar && (
            <div style={{ border:`1px solid ${CJ.border}`,borderRadius:10,overflow:"hidden" }}>
              <input value={searchBar} onChange={e=>setSearchBar(e.target.value)} placeholder="Rechercher un bar…"
                style={{ width:"100%",background:"#111",border:"none",borderBottom:`1px solid ${CJ.border}`,padding:"10px 14px",color:CJ.text,fontSize:16,boxSizing:"border-box" }}/>
              <div style={{ display:"flex",flexDirection:"column",gap:0,maxHeight:200,overflowY:"auto",padding:6 }}>
                {joueur.bar_slug && (
                  <div onClick={()=>choisirBar(null)} style={{ background:"#1a0000",border:`1px solid #7f1d1d`,borderRadius:8,padding:"8px 12px",cursor:"pointer",marginBottom:4,fontSize:12,color:"#f87171",textAlign:"center",touchAction:"manipulation" }}>
                    ✕ Se désaffilier du bar
                  </div>
                )}
                {bars.filter(b=>!searchBar||b.nom.toLowerCase().includes(searchBar.toLowerCase())||b.ville?.toLowerCase().includes(searchBar.toLowerCase())).map(b=>(
                  <div key={b.slug} onClick={()=>choisirBar(b.slug)}
                    style={{ background:joueur.bar_slug===b.slug?"#1a0800":"transparent",border:`1px solid ${joueur.bar_slug===b.slug?CJ.accent:"transparent"}`,borderRadius:8,padding:"9px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",touchAction:"manipulation" }}>
                    <span style={{ fontWeight:joueur.bar_slug===b.slug?700:400,fontSize:13 }}>{b.nom}</span>
                    <span style={{ color:CJ.muted,fontSize:11 }}>📍 {b.ville}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Séparateur */}
        <div style={{ borderTop:`1px solid ${CJ.border}`, marginBottom:12 }}/>

        {/* Association affiliée */}
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:affilAsso?10:0 }}>
            <div>
              <div style={{ fontSize:11, color:CJ.muted }}><EmoIcon e="🫂" size={10} style={{verticalAlign:"-1px",marginRight:3}}/>Association affiliée</div>
              <div style={{ fontWeight:700, fontSize:14, color: asso ? "#a78bfa" : CJ.muted }}>
                {asso ? asso.nom : "Aucune association"}
              </div>
              {asso && asso.ville && <div style={{ fontSize:11, color:CJ.muted }}>📍 {asso.ville}</div>}
            </div>
            <button onClick={()=>setAffilAsso(x=>!x)}
              style={{ background:"#a78bfa22",border:"1px solid #a78bfa44",color:"#a78bfa",cursor:"pointer",borderRadius:8,padding:"6px 14px",fontSize:12,fontWeight:600,touchAction:"manipulation",flexShrink:0 }}>
              {affilAsso?"Fermer":"Changer"}
            </button>
          </div>
          {affilAsso && (
            <div style={{ border:`1px solid ${CJ.border}`,borderRadius:10,overflow:"hidden" }}>
              <input value={searchAsso} onChange={e=>setSearchAsso(e.target.value)} placeholder="Rechercher une association…"
                style={{ width:"100%",background:"#111",border:"none",borderBottom:`1px solid ${CJ.border}`,padding:"10px 14px",color:CJ.text,fontSize:16,boxSizing:"border-box" }}/>
              <div style={{ display:"flex",flexDirection:"column",gap:0,maxHeight:200,overflowY:"auto",padding:6 }}>
                {joueur.asso_slug && (
                  <div onClick={()=>choisirAsso(null)} style={{ background:"#1a0020",border:"1px solid #4c1d95",borderRadius:8,padding:"8px 12px",cursor:"pointer",marginBottom:4,fontSize:12,color:"#c4b5fd",textAlign:"center",touchAction:"manipulation" }}>
                    ✕ Se désaffilier de l'association
                  </div>
                )}
                {associations.filter(a=>!searchAsso||a.nom.toLowerCase().includes(searchAsso.toLowerCase())||a.ville?.toLowerCase().includes(searchAsso.toLowerCase())).map(a=>(
                  <div key={a.slug} onClick={()=>choisirAsso(a.slug)}
                    style={{ background:joueur.asso_slug===a.slug?"#1a0f1a":"transparent",border:`1px solid ${joueur.asso_slug===a.slug?"#7c3aed":"transparent"}`,borderRadius:8,padding:"9px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",touchAction:"manipulation" }}>
                    <span style={{ fontWeight:joueur.asso_slug===a.slug?700:400,fontSize:13 }}>{a.nom}</span>
                    <span style={{ color:CJ.muted,fontSize:11 }}>📍 {a.ville}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ZONE DE DANGER : suppression du compte par le joueur (RGPD art.17 / exigence Google Play) ── */}
      <div style={{ marginTop:22, padding:16, background:"#180a0a", border:"1px solid #7f1d1d", borderRadius:14 }}>
        <div style={{ fontWeight:800, color:"#fca5a5", fontSize:13, marginBottom:6 }}>⚠️ Supprimer mon compte</div>
        <p style={{ fontSize:12, color:"#94a3b8", lineHeight:1.6, margin:"0 0 12px" }}>
          Cela efface définitivement ton profil (pseudo, e-mail, photo, ville), tes amis et tes messages privés. Ton historique de matchs est <strong style={{ color:"#cbd5e1" }}>conservé de façon anonyme</strong> pour ne pas fausser les stats des autres joueurs. <strong style={{ color:"#fca5a5" }}>Action irréversible.</strong>
        </p>
        <button
          onClick={async()=>{
            if(!(await confirmer("⚠️ Supprimer DÉFINITIVEMENT ton compte DartPoint ?\n\nTon profil, tes amis et tes messages seront effacés.\nC'est IRRÉVERSIBLE.", { danger:true }))) return;
            const tape = window.prompt("Pour confirmer, écris SUPPRIMER (en majuscules) :");
            if((tape||"").trim().toUpperCase() !== "SUPPRIMER"){ window.dpToast?.("Suppression annulée","info"); return; }
            try {
              const token = localStorage.getItem("dp_token");
              const r = await callAuth("deleteAccount", { token });
              if(!r.ok){ window.dpToast?.(r.error || "Suppression impossible. Reconnecte-toi puis réessaie.","error"); return; }
              localStorage.removeItem("dp_joueur"); localStorage.removeItem("dp_token");
              window.dpToast?.("Ton compte a été supprimé. À bientôt 👋","success");
              setJoueur(null); setPage("home");
            } catch { window.dpToast?.("Erreur réseau, réessaie.","error"); }
          }}
          style={{ width:"100%", background:"transparent", border:"1px solid #7f1d1d", color:"#fca5a5", borderRadius:10, padding:"11px", fontWeight:700, fontSize:14, cursor:"pointer", touchAction:"manipulation" }}>
          🗑️ Supprimer mon compte
        </button>
      </div>
      </>)}

      {/* ═══ AUTRES ONGLETS (contenu sous la barre) ═══ */}
      {onglet === "amis"       && <div style={{ marginTop:2 }}><AmiSection joueur={joueur} setPage={setPage}/></div>}
      {onglet === "badges"     && <PageProfilBadges joueur={joueur} setPage={setPage} embedded/>}
      {onglet === "historique" && <PageProfilHistorique joueur={joueur} setPage={setPage} embedded/>}

      {/* ── Fenêtre QR code du profil ── */}
      {showQR && (
        <div onClick={()=>setShowQR(false)} style={{ position:"fixed", inset:0, background:"#000000e6", zIndex:99999, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"#15151c", border:`1px solid ${CJ.border}`, borderRadius:20, padding:"24px 22px", maxWidth:360, width:"100%", textAlign:"center", position:"relative" }}>
            <button onClick={()=>setShowQR(false)} aria-label="Fermer" style={{ position:"absolute", top:12, right:12, background:"#ffffff14", border:"none", color:CJ.muted, borderRadius:8, width:30, height:30, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", touchAction:"manipulation" }}><X size={18}/></button>
            <div style={{ fontWeight:900, fontSize:18, marginBottom:4, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><QrCode size={20} color={CJ.accent}/>Mon QR code</div>
            <div style={{ color:CJ.muted, fontSize:12, lineHeight:1.5, marginBottom:18 }}>À scanner pour récupérer mon profil — bientôt utile pour s'inscrire à un tournoi en un scan.</div>
            <div style={{ background:"#fff", borderRadius:16, padding:14, display:"inline-block", marginBottom:16, lineHeight:0 }}>
              {qrUrl && <img src={qrUrl} alt="QR code du profil" style={{ width:236, height:236, display:"block" }}/>}
            </div>
            <div style={{ fontWeight:800, fontSize:16, color:"#fff" }}>{joueur.pseudo}</div>
            <div style={{ color:CJ.muted, fontSize:13 }}>{(joueur.drix||1000)} DRIX{joueur.ville ? " · "+joueur.ville : ""}</div>
          </div>
        </div>
      )}

    </div>
  );
};


// ── PAGE STATS ────────────────────────────────────────────────────────────────
export const PageProfilStats = ({ joueur, setJoueur, bars, associations, setPage }) => {
  const [stats, setStats]         = useState(null);
  const [duels, setDuels]         = useState([]);
  const [drixMvts, setDrixMvts]   = useState([]);
  const [classement, setClassement] = useState(null);
  const [extra, setExtra]         = useState({ tournois:0, bars:0 });
  const [loading, setLoading]     = useState(true);
  const [finishsDbl, setFinishsDbl] = useState({}); // { "1":n, …, "20":n, "B":n } — stat « finish favori »
  useEffect(() => { dbJ.getFinishs(joueur.id).then(setFinishsDbl).catch(() => {}); }, [joueur.id]);

  useEffect(() => {
    Promise.all([
      dbJ.getStats(joueur.id),
      dbJ.getDuels(joueur.id),
      sbJ(`drix_mouvements?joueur_id=eq.${joueur.id}&order=date.desc&limit=400&select=*`).catch(()=>[]),
      sbJ(`joueurs?order=drix.desc&select=id`).catch(()=>[]),
      sbJ(`tournois_potes_joueurs?joueur_id=eq.${joueur.id}&select=tournoi_id`).catch(()=>[]),
      sbJ(`presences?joueur_id=eq.${joueur.id}&select=bar_slug`).catch(()=>[]),
    ]).then(([s, d, mvts, allJ, trn, pres]) => {
      setStats(s);
      setDuels(d||[]);
      setDrixMvts(mvts||[]);
      if (allJ?.length) {
        const pos = allJ.findIndex(j => j.id === joueur.id);
        setClassement({ position: pos >= 0 ? pos + 1 : null, total: allJ.length });
      }
      setExtra({
        tournois: Array.isArray(trn)  ? new Set(trn.map(t=>t.tournoi_id)).size : 0,
        bars:     Array.isArray(pres) ? new Set(pres.map(p=>p.bar_slug)).size  : 0,
      });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [joueur.id]);

  if (loading) return <SpinnerJ/>;

  // ── Calculs ──────────────────────────────────────────────────────────────────
  const termines   = duels.filter(d => d.statut === "termine");
  const winRate    = stats?.parties > 0 ? Math.round((stats.victoires / stats.parties) * 100) : 0;
  const now        = Date.now();
  const dayMs      = 24 * 3600000;
  const weekMs     = 7  * 24 * 3600000;
  const monthMs    = 30 * 24 * 3600000;

  const getScores = (list) => list
    .map(d => parseFloat(d.challenger_id === joueur.id ? d.score_challenger : d.score_defie))
    .filter(s => !isNaN(s) && s > 0);
  const avg = (arr) => arr.length > 0 ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : null;
  const count = (list, ms) => termines.filter(d => (now-(d.date||0)) < ms).length;

  const moyenneGenerale = avg(getScores(termines));
  const moyenneJour     = avg(getScores(termines.filter(d => (now-(d.date||0)) < dayMs)));
  const moyenneSemaine  = avg(getScores(termines.filter(d => (now-(d.date||0)) < weekMs)));
  const moyenneMois     = avg(getScores(termines.filter(d => (now-(d.date||0)) < monthMs)));
  const nbJour          = count(termines, dayMs);
  const nbSemaine       = count(termines, weekMs);
  const nbMois          = count(termines, monthMs);

  const sorted = [...termines].sort((a,b) => (b.date||0)-(a.date||0));
  let serieActuelle = 0, serieType = null;
  for (const d of sorted) {
    const gagne = d.gagnant_id === joueur.id;
    if (serieType === null) { serieType = gagne?"win":"loss"; serieActuelle = 1; }
    else if ((gagne && serieType==="win") || (!gagne && serieType==="loss")) serieActuelle++;
    else break;
  }

  const maxGain  = drixMvts.filter(m=>m.variation>0).reduce((mx,m)=>Math.max(mx,m.variation),0) || null;
  const maxPerte = drixMvts.filter(m=>m.variation<0).reduce((mn,m)=>Math.min(mn,m.variation),0) || null;

  // Rival principal
  const adversaireCount = {};
  termines.forEach(d => {
    const adv = d.challenger_id===joueur.id ? d.defie_pseudo : d.challenger_pseudo;
    adversaireCount[adv] = (adversaireCount[adv]||0) + 1;
  });
  const rival = Object.entries(adversaireCount).sort((a,b)=>b[1]-a[1])[0];

  // Stats scoring depuis manches_detail
  let nb180=0, nb140=0, nb100=0, nb80=0, nb60=0, plusGrosScore=0, plusGrosFinish=0;
  let nbFinishes100=0, manchesJouees=0, manchesGagnees=0;
  // Fléchettes lancées. Les manches récentes stockent le compte EXACT (`winner_flech`), les
  // anciennes seulement le nombre de volées : on retombe alors sur volées × 3, qui est juste
  // sauf sur la dernière volée d'une manche (finie en 1 ou 2 fléchettes). D'où « environ ».
  let flechettes = 0, flechettesExactes = true;
  // Meilleure moyenne sur UNE manche. Elle etait deja stockee dans manches_detail
  // (winner_moy / loser_moy) et visible dans le detail d'un match, mais elle
  // n'apparaissait nulle part dans les stats generales : signale par un testeur.
  let meilleureMoyManche = null;
  let checkoutAttempts=0, checkoutSuccess=0;
  termines.forEach(d => {
    (d.manches_detail||[]).forEach(m => {
      // Gère le changement de pseudo : comparer au pseudo stocké dans le duel au moment de la partie
      const isChallenger = d.challenger_id === joueur.id;
      const myPseudoAtTime = isChallenger ? (d.challenger_pseudo || joueur.pseudo) : (d.defie_pseudo || joueur.pseudo);
      const isW = m.winner === myPseudoAtTime || m.winner === joueur.pseudo;
      nb180        += isW ? (m.winner_180||0)     : (m.loser_180||0);
      nb140        += isW ? (m.winner_140plus||0)  : (m.loser_140plus||0);
      nb100        += isW ? (m.winner_100plus||0)  : (m.loser_100plus||0);
      nb80         += isW ? (m.winner_80plus||0)   : (m.loser_80plus||0);
      nb60         += isW ? (m.winner_60plus||0)   : (m.loser_60plus||0);
      const ms      = isW ? (m.winner_max||0)      : (m.loser_max||0);
      const fin     = isW ? (m.winner_finish||0)   : 0;
      plusGrosScore  = Math.max(plusGrosScore, ms);
      plusGrosFinish = Math.max(plusGrosFinish, fin);
      manchesJouees++;
      const fl = isW ? m.winner_flech : m.loser_flech;
      if (fl != null) flechettes += fl;
      else { flechettes += (isW ? (m.winner_volees||0) : (m.loser_volees||0)) * 3; flechettesExactes = false; }
      if (isW) { manchesGagnees++; if (fin >= 100) nbFinishes100++; }
      // Vrai checkout % : tentatives (score ≤ 170 au début d'une volée)
      const myAttempts = isW ? (m.winner_checkout_attempts||0) : (m.loser_checkout_attempts||0);
      if (myAttempts > 0) { checkoutAttempts += myAttempts; if (isW) checkoutSuccess++; }
      // Ma moyenne SUR CETTE MANCHE (et pas sur le match entier)
      const moyM = parseFloat(isW ? m.winner_moy : m.loser_moy);
      if (!isNaN(moyM) && moyM > 0 && (meilleureMoyManche == null || moyM > meilleureMoyManche)) meilleureMoyManche = moyM;
    });
  });
  const hasScoring    = termines.some(d=>(d.manches_detail||[]).some(m=>m.winner_180!==undefined));
  const hasCheckout   = checkoutAttempts > 0;
  const tauxCheckout  = hasCheckout ? Math.round((checkoutSuccess / checkoutAttempts) * 100) : null;

  // Meilleure série de victoires (ordre chronologique)
  const sortedChron = [...termines].sort((a,b)=>(a.date||0)-(b.date||0));
  let meilleureSerieW=0, tmpSerie=0;
  sortedChron.forEach(d => { if(d.gagnant_id===joueur.id){tmpSerie++;meilleureSerieW=Math.max(meilleureSerieW,tmpSerie);}else tmpSerie=0; });

  // Nemesis : joueur à qui on perd le plus
  const defaites = termines.filter(d=>d.gagnant_id!==joueur.id);
  const nemesisCnt = {};
  defaites.forEach(d=>{ const adv=d.challenger_id===joueur.id?d.defie_pseudo:d.challenger_pseudo; nemesisCnt[adv]=(nemesisCnt[adv]||0)+1; });
  const nemesis = Object.entries(nemesisCnt).sort((a,b)=>b[1]-a[1])[0];

  // ══ STATISTIQUES AVANCÉES (calculées à la volée ; affichées seulement si dispo) ══
  const isMine     = (d) => d.challenger_id === joueur.id;
  const advOf      = (d) => isMine(d) ? d.defie_pseudo : d.challenger_pseudo;
  const myMoy      = (d) => { const v = parseFloat(isMine(d) ? d.score_challenger : d.score_defie); return isNaN(v) ? null : v; };
  const myLegs     = (d) => isMine(d) ? d.score_manches_challenger : d.score_manches_defie;
  const oppLegs    = (d) => isMine(d) ? d.score_manches_defie : d.score_manches_challenger;
  const myPseudoIn = (d) => isMine(d) ? (d.challenger_pseudo || joueur.pseudo) : (d.defie_pseudo || joueur.pseudo);
  const wonManche  = (d, m) => m.winner === myPseudoIn(d) || m.winner === joueur.pseudo;
  const jourKey    = (t) => { const dt = new Date(t); return dt.getFullYear()+"-"+dt.getMonth()+"-"+dt.getDate(); };
  const moisKey    = (t) => { const dt = new Date(t); return dt.getFullYear()+"-"+dt.getMonth(); };
  const dayAvg     = (arr) => { const v = arr.filter(x => x != null && x > 0); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; };
  const fmtDuree   = (min) => min >= 60 ? `${Math.floor(min/60)}h${String(min%60).padStart(2,"0")}` : `${min} min`;

  // Séries de défaites (la série V = meilleureSerieW déjà calculée)
  let meilleureSerieL = 0, tmpL = 0;
  sortedChron.forEach(d => { if (d.gagnant_id !== joueur.id) { tmpL++; meilleureSerieL = Math.max(meilleureSerieL, tmpL); } else tmpL = 0; });

  // Moyennes par partie + seuils + par jour/mois + progression 30j
  const moyParPartie = termines.map(myMoy).filter(v => v != null && v > 0);
  const meilleureMoyPartie = moyParPartie.length ? Math.max(...moyParPartie) : null;
  const nbMoy = (seuil) => moyParPartie.filter(v => v >= seuil).length;
  const parJourMoy = {}, parMoisMoy = {};
  termines.forEach(d => { if (!d.date) return; const mo = myMoy(d);
    (parJourMoy[jourKey(d.date)] = parJourMoy[jourKey(d.date)] || []).push(mo);
    (parMoisMoy[moisKey(d.date)] = parMoisMoy[moisKey(d.date)] || { moys:[], t:d.date }).moys.push(mo);
  });
  let meilleureMoyJour = null;
  Object.values(parJourMoy).forEach(arr => { const a = dayAvg(arr); if (a != null) meilleureMoyJour = Math.max(meilleureMoyJour || 0, a); });
  let meilleurMois = null;
  Object.values(parMoisMoy).forEach(({ moys, t }) => { const a = dayAvg(moys); if (a != null && a > (meilleurMois?.avg || 0)) meilleurMois = { avg:a, label:new Date(t).toLocaleDateString("fr-FR",{month:"long"}) }; });
  const moy30     = dayAvg(termines.filter(d => (now-(d.date||0)) < monthMs).map(myMoy));
  const moy30prev = dayAvg(termines.filter(d => { const a = now-(d.date||0); return a >= monthMs && a < 2*monthMs; }).map(myMoy));
  const progMoy30 = (moy30 != null && moy30prev != null) ? +(moy30 - moy30prev).toFixed(1) : null;
  // Série datée pour le graphique d'évolution : une entrée par match TERMINÉ qui porte une moyenne.
  // Certains duels ont score_challenger à null (partie sans moyenne enregistrée) → myMoy renvoie
  // null et l'entrée est écartée par MoyenneEvolution.
  const moyMvts = termines.filter(d => d.date).map(d => ({ t:d.date, v:myMoy(d) }));

  // Scoring / Finishes avancés (par duel)
  let totalVolees = 0, totalPoints = 0, record180Partie = 0, record100Partie = 0;
  let totalFinishes = 0, sommeFinishes = 0, recordFinishPartie = 0, plusGrosFinishMois = 0;
  let checkout30A = 0, checkout30S = 0;
  termines.forEach(d => {
    let d180 = 0, d100 = 0, dFin = 0;
    const recent = (now-(d.date||0)) < monthMs;
    (d.manches_detail||[]).forEach(m => {
      const w = wonManche(d, m);
      const vol = w ? (m.winner_volees||0) : (m.loser_volees||0);
      const moy = w ? (m.winner_moy||0)    : (m.loser_moy||0);
      totalVolees += vol; totalPoints += moy * vol;
      d180 += w ? (m.winner_180||0)     : (m.loser_180||0);
      d100 += w ? (m.winner_100plus||0) : (m.loser_100plus||0);
      if (w && (m.winner_finish||0) > 0) { totalFinishes++; sommeFinishes += m.winner_finish; dFin++; if (recent) plusGrosFinishMois = Math.max(plusGrosFinishMois, m.winner_finish); }
      const att = w ? (m.winner_checkout_attempts||0) : (m.loser_checkout_attempts||0);
      if (recent && att > 0) { checkout30A += att; if (w) checkout30S++; }
    });
    record180Partie = Math.max(record180Partie, d180);
    record100Partie = Math.max(record100Partie, d100);
    recordFinishPartie = Math.max(recordFinishPartie, dFin);
  });
  const scoreMoyVolee = totalVolees > 0 ? (totalPoints/totalVolees).toFixed(1) : null;
  const pct100 = (hasScoring && totalVolees > 0) ? Math.round((nb100/totalVolees)*100) : null;
  const pct140 = (hasScoring && totalVolees > 0) ? Math.round((nb140/totalVolees)*100) : null;
  const finishMoyen = totalFinishes > 0 ? Math.round(sommeFinishes/totalFinishes) : null;
  const checkout30  = checkout30A > 0 ? Math.round((checkout30S/checkout30A)*100) : null;

  // Duels avancés
  const winsByOpp = {}, invaincu = {}, faced = new Set(), beaten = new Set();
  let revenant = 0, remonteeMax = 0, dernierLegW = 0, dernierLegL = 0;
  termines.forEach(d => {
    const adv = advOf(d), won = d.gagnant_id === joueur.id;
    faced.add(adv);
    if (!invaincu[adv]) invaincu[adv] = { w:0, t:0 };
    invaincu[adv].t++;
    if (won) { winsByOpp[adv] = (winsByOpp[adv]||0)+1; beaten.add(adv); invaincu[adv].w++; }
    const ml = myLegs(d), ol = oppLegs(d);
    if (ml != null && ol != null) { const tgt = Math.max(ml, ol);
      if (won  && ol === tgt-1 && tgt > 1) dernierLegW++;
      if (!won && ml === tgt-1 && tgt > 1) dernierLegL++;
    }
    if (won) {
      const md = d.manches_detail || [];
      if (md.length && !wonManche(d, md[0])) revenant++;
      let myL = 0, opL = 0, deficit = 0;
      md.forEach(m => { if (wonManche(d, m)) myL++; else opL++; deficit = Math.max(deficit, opL - myL); });
      remonteeMax = Math.max(remonteeMax, deficit);
    }
  });
  const battuLePlus = Object.entries(winsByOpp).sort((a,b)=>b[1]-a[1])[0];
  const advDiff = faced.size, advBattus = beaten.size;
  const cauchemar = Object.values(invaincu).filter(v => v.t >= 5 && v.w === v.t).length;

  // DRIX avancé
  const drixMax = drixMvts.length ? Math.max(joueur.drix||1000, ...drixMvts.map(m => Math.max(m.drix_apres||0, m.drix_avant||0))) : (joueur.drix||1000);
  const parJourDrix = {}, parMoisDrix = {};
  drixMvts.forEach(m => { if (!m.date) return; parJourDrix[jourKey(m.date)] = (parJourDrix[jourKey(m.date)]||0)+(m.variation||0); parMoisDrix[moisKey(m.date)] = (parMoisDrix[moisKey(m.date)]||0)+(m.variation||0); });
  const jVals = Object.values(parJourDrix), mVals = Object.values(parMoisDrix);
  const bestJourDrix  = jVals.length ? Math.max(...jVals) : null;
  const worstJourDrix = jVals.length ? Math.min(...jVals) : null;
  const bestMoisDrix  = mVals.length ? Math.max(...mVals) : null;

  // Activité
  const totalLegs = termines.reduce((s,d) => s + ((myLegs(d)||0) + (oppLegs(d)||0)), 0) || manchesJouees;
  const tempsEstimeMin = Math.round((totalVolees * 22) / 60); // ~22 s par volée
  const joursSem = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
  const dowCnt = [0,0,0,0,0,0,0], hourCnt = new Array(24).fill(0);
  termines.forEach(d => { if (!d.date) return; const dt = new Date(d.date); dowCnt[dt.getDay()]++; hourCnt[dt.getHours()]++; });
  const bestDow  = dowCnt.some(c=>c>0)  ? joursSem[dowCnt.indexOf(Math.max(...dowCnt))] : null;
  const bestHour = hourCnt.some(c=>c>0) ? hourCnt.indexOf(Math.max(...hourCnt)) : null;
  const dts = termines.map(d => d.date).filter(Boolean).sort((a,b)=>a-b);
  let sessStart = null, prevT = null, longestSession = 0;
  dts.forEach(t => { if (prevT == null || t-prevT > 90*60000) sessStart = t; longestSession = Math.max(longestSession, t - sessStart); prevT = t; });
  const longestSessionMin = Math.round(longestSession/60000);
  const daySet = new Set(dts.map(t => jourKey(t)));
  let streakJours = 0; { const d0 = new Date(); d0.setHours(12,0,0,0); if (!daySet.has(jourKey(d0.getTime()))) d0.setDate(d0.getDate()-1); while (daySet.has(jourKey(d0.getTime()))) { streakJours++; d0.setDate(d0.getDate()-1); } }

  const nbBadgesStats = getBadgesStored(joueur.id).size;

  // ── Styles & composants premium ───────────────────────────────────────────
  const card = { background:"#16161c", border:"1px solid #ffffff10", borderRadius:16, boxShadow:"0 4px 16px #00000040, inset 0 1px 0 #ffffff08" };
  const secBox = (tint) => ({ background:`linear-gradient(180deg,${tint}0d,transparent 70%)`, border:`1px solid ${tint}22`, borderRadius:20, padding:"14px 12px 16px", marginBottom:14, animation:"dpStatIn .45s ease both" });

  const StatCard = ({ label, value, color=CJ.text, sub=null, bientot=false, i=0 }) => (
    <div style={{ ...card, padding:"13px 12px 12px 14px", position:"relative", overflow:"hidden", animation:"dpStatIn .4s ease both", animationDelay:`${(0.03*i).toFixed(2)}s` }}>
      <div aria-hidden style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:bientot?"#ffffff12":color }}/>
      {bientot && <span style={{ position:"absolute",top:7,right:7,background:"#ffffff08",border:`1px solid ${CJ.border}`,borderRadius:5,fontSize:9,color:CJ.muted,padding:"1px 5px" }}>bientôt</span>}
      <div style={{ fontSize:23, fontWeight:900, color:bientot?CJ.muted:color, marginBottom:2, lineHeight:1.05 }}>{bientot?"—":value}</div>
      <div style={{ fontSize:11.5, color:CJ.muted, fontWeight:600 }}>{label}</div>
      {sub && !bientot && <div style={{ fontSize:10.5, color:"#64748b", marginTop:1 }}>{sub}</div>}
    </div>
  );

  const WideStat = ({ icon:Icon, label, value, color=CJ.text, sub=null, big=false }) => (
    <div style={{ ...card, padding:"15px 16px", display:"flex", alignItems:"center", gap:14, position:"relative", overflow:"hidden", animation:"dpStatIn .45s ease both" }}>
      <div aria-hidden style={{ position:"absolute", right:-16, bottom:-16, opacity:.06, pointerEvents:"none" }}><Icon size={82} color={color}/></div>
      <div style={{ flexShrink:0, width:44, height:44, borderRadius:12, background:`${color}1f`, border:`1px solid ${color}55`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 12px ${color}33` }}><Icon size={22} color={color}/></div>
      <div style={{ flex:1, minWidth:0, position:"relative" }}>
        <div style={{ fontSize:11.5, color:CJ.muted, fontWeight:700, letterSpacing:.3 }}>{label}</div>
        <div style={{ fontSize:big?34:26, fontWeight:900, color, lineHeight:1.05, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{value}</div>
        {sub && <div style={{ fontSize:10.5, color:"#64748b", marginTop:1 }}>{sub}</div>}
      </div>
    </div>
  );

  const CircularStat = ({ pct, label, sub, color, size=98 }) => {
    const sw=9, r=(size-sw)/2, cc=2*Math.PI*r, off=cc*(1-Math.max(0,Math.min(100,pct))/100);
    return (
      <div style={{ ...card, padding:"14px 10px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:6, animation:"dpStatIn .45s ease both" }}>
        <div style={{ position:"relative", width:size, height:size }}>
          <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ffffff12" strokeWidth={sw}/>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeDasharray={cc} strokeDashoffset={off} style={{ filter:`drop-shadow(0 0 4px ${color}99)` }}>
              <animate attributeName="stroke-dashoffset" from={cc} to={off} dur="1s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.8 0.2 1"/>
            </circle>
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:24, fontWeight:900, color }}>{pct}%</span>
          </div>
        </div>
        <div style={{ fontSize:12, color:CJ.text, fontWeight:800 }}>{label}</div>
        {sub && <div style={{ fontSize:10, color:CJ.muted, textAlign:"center" }}>{sub}</div>}
      </div>
    );
  };

  const SectionTitle = ({ icon: Icon, color=CJ.accent, children }) => (
    <h3 style={{ fontWeight:900, fontSize:12.5, color:CJ.text, margin:"0 0 12px", letterSpacing:.7, textTransform:"uppercase", display:"flex", alignItems:"center", gap:8 }}>
      <span style={{ width:26, height:26, borderRadius:8, background:`${color}22`, border:`1px solid ${color}55`, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{Icon && <Icon size={14} color={color}/>}</span>
      {children}
    </h3>
  );

  const { titre:drixTitre, emoji:drixEmoji, color:drixColor } = getDrixTitreLocal(joueur.drix||1000);

  return (
    <div style={{ maxWidth:860, margin:"0 auto", padding:"16px 16px 40px" }}>
      <button onClick={()=>window.history.back()} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",fontSize:14,marginBottom:16,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation" }}><ArrowLeft size={16}/> Retour</button>

      <style>{`
        @keyframes dpStatIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes dpHeroGlow { 0%,100%{box-shadow:0 0 28px #f9731622, inset 0 0 44px #f9731610} 50%{box-shadow:0 0 48px #22c55e2b, inset 0 0 66px #22c55e14} }
        @keyframes dpBarFill { from{width:0} }
      `}</style>

      {/* ── HERO DRIX ── */}
      {(() => {
        const prog = getProgression(joueur.drix||1000);
        return (
          <div style={{ position:"relative", overflow:"hidden", borderRadius:22, padding:"22px 20px", marginBottom:12,
            background:"radial-gradient(130% 130% at 100% 0%, #1d1d28 0%, #101017 55%, #0b0b10 100%)",
            border:`1px solid ${drixColor}44`, animation:"dpHeroGlow 5s ease-in-out infinite, dpStatIn .5s ease both" }}>
            <div aria-hidden style={{ position:"absolute", top:-45, right:-35, width:190, height:190, borderRadius:"50%", background:`radial-gradient(circle, ${drixColor}38 0%, transparent 65%)`, pointerEvents:"none" }}/>
            <div style={{ display:"flex", alignItems:"center", gap:15, position:"relative" }}>
              <div style={{ flexShrink:0, width:64, height:64, borderRadius:18, background:`linear-gradient(135deg,${drixColor}38,${drixColor}12)`, border:`1px solid ${drixColor}66`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 20px ${drixColor}44` }}>
                <RankIcon drix={joueur.drix||1000} size={34}/>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:11, color:CJ.muted, fontWeight:700, letterSpacing:.6 }}>DRIX ACTUEL</div>
                <div style={{ fontSize:56, fontWeight:900, color:drixColor, lineHeight:1, textShadow:`0 0 26px ${drixColor}55` }}>{joueur.drix||1000}</div>
                <div style={{ fontSize:14, color:drixColor, fontWeight:800, marginTop:2, display:"flex", alignItems:"center", gap:5 }}>{drixEmoji} {drixTitre}</div>
              </div>
              {classement?.position && (
                <div style={{ flexShrink:0, textAlign:"center", background:`linear-gradient(135deg,${CJ.yellow}26,${CJ.yellow}08)`, border:`1px solid ${CJ.yellow}55`, borderRadius:16, padding:"12px 14px", boxShadow:`0 0 16px ${CJ.yellow}22` }}>
                  <div style={{ fontSize:10, color:CJ.yellow, fontWeight:800, letterSpacing:.5 }}>RANG</div>
                  <div style={{ fontSize:30, fontWeight:900, color:CJ.yellow, lineHeight:1 }}>#{classement.position}</div>
                  <div style={{ fontSize:10, color:CJ.muted }}>/ {classement.total}</div>
                </div>
              )}
            </div>
            {prog.prochain && (
              <div style={{ marginTop:16, position:"relative" }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:10.5, color:CJ.muted, marginBottom:5, fontWeight:600 }}>
                  <span>{drixTitre}</span>
                  <span>Plus que <b style={{ color:drixColor }}>{prog.restant}</b> → {prog.prochain.titre}</span>
                </div>
                <div style={{ height:8, borderRadius:6, background:"#ffffff10", overflow:"hidden" }}>
                  <div style={{ width:`${prog.pct}%`, height:"100%", borderRadius:6, background:`linear-gradient(90deg,${drixColor},${prog.prochain.color})`, boxShadow:`0 0 10px ${drixColor}88`, animation:"dpBarFill 1.1s ease both" }}/>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── BADGES ── */}
      {(() => {
        const nbBadges = getBadgesStored(joueur.id).size;
        return (
          <div onClick={()=>setPage("profil-badges")} style={{ ...card, display:"flex", alignItems:"center", gap:12, padding:"12px 14px", marginBottom:16, cursor:"pointer", animation:"dpStatIn .5s ease both" }}>
            <div style={{ flexShrink:0, width:38, height:38, borderRadius:11, background:`${CJ.yellow}1f`, border:`1px solid ${CJ.yellow}55`, display:"flex", alignItems:"center", justifyContent:"center" }}><Trophy size={20} color={CJ.yellow}/></div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:14, fontWeight:800, color:CJ.text }}>{nbBadges} badge{nbBadges>1?"s":""} débloqué{nbBadges>1?"s":""}</div>
              <div style={{ fontSize:11, color:CJ.muted }}>Ta collection de trophées</div>
            </div>
            <span style={{ fontSize:12.5, color:CJ.yellow, fontWeight:800, whiteSpace:"nowrap" }}>Voir tous →</span>
          </div>
        );
      })()}

      {/* ── PERFORMANCE ── */}
      <div style={secBox(CJ.green)}>
        <SectionTitle icon={Trophy} color={CJ.green}>Performance</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:10, marginBottom:10 }}>
          <CircularStat pct={winRate} label="Win Rate" color={CJ.green} sub={`${stats?.victoires??0} V · ${stats?.defaites??0} D`}/>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <WideStat icon={Check} label="Victoires" value={stats?.victoires??0} color={CJ.green}/>
            <WideStat icon={X} label="Défaites" value={stats?.defaites??0} color={CJ.red}/>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          <StatCard i={0} label="Matchs joués" value={stats?.parties??0} color={CJ.blue}/>
          {flechettes>0 && <StatCard i={1} label="Fléchettes lancées" value={flechettes.toLocaleString("fr-FR")} color={CJ.accent} sub={flechettesExactes?null:"environ"}/>}
          <StatCard i={1} label="Ratio V/D" value={stats?.defaites>0?(stats.victoires/stats.defaites).toFixed(1):"∞"} color={CJ.accent}/>
          <StatCard i={2} label="Série actuelle" value={serieActuelle>0?(serieType==="win"?`${serieActuelle}🔥`:`${serieActuelle}💔`):"—"} color={serieType==="win"?CJ.green:CJ.red}/>
          {meilleureSerieW>0 && <StatCard i={3} label="Plus longue série V" value={`${meilleureSerieW}🔥`} color={CJ.green}/>}
          {meilleureSerieL>0 && <StatCard i={4} label="Plus longue série D" value={`${meilleureSerieL}💧`} color={CJ.red}/>}
          {remonteeMax>0 && <StatCard i={5} label="Plus grosse remontée" value={remonteeMax} sub="manches menées" color={CJ.yellow}/>}
          {dernierLegW>0 && <StatCard i={6} label="Gagnés au dernier leg" value={dernierLegW} color={CJ.green}/>}
          {dernierLegL>0 && <StatCard i={7} label="Perdus au dernier leg" value={dernierLegL} color={CJ.red}/>}
        </div>
      </div>

      {/* ── MOYENNES ── */}
      <div style={secBox(CJ.blue)}>
        <SectionTitle icon={BarChart2} color={CJ.blue}>Moyennes pts/volée</SectionTitle>
        <div style={{ marginBottom:10 }}>
          <WideStat icon={BarChart2} label="Moyenne générale" value={moyenneGenerale?? "—"} color={CJ.blue} big sub={`sur ${termines.length} match${termines.length>1?"s":""}`}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
          <StatCard i={0} label="Aujourd'hui"   value={moyenneJour??    "—"} color={CJ.blue} sub={nbJour>0?`${nbJour} match${nbJour>1?"s":""}`:null}/>
          <StatCard i={1} label="Cette semaine" value={moyenneSemaine?? "—"} color={CJ.blue} sub={nbSemaine>0?`${nbSemaine} match${nbSemaine>1?"s":""}`:null}/>
          <StatCard i={2} label="Ce mois"       value={moyenneMois??    "—"} color={CJ.blue} sub={nbMois>0?`${nbMois} match${nbMois>1?"s":""}`:null}/>
          {meilleureMoyPartie!=null && <StatCard i={3} label="Meilleure (1 partie)" value={meilleureMoyPartie.toFixed(1)} color={CJ.green}/>}
          {meilleureMoyManche!=null && <StatCard i={3} label="Meilleure (1 manche)" value={meilleureMoyManche.toFixed(1)} color={CJ.green}/>}
          {meilleureMoyJour!=null && <StatCard i={4} label="Meilleure (1 jour)" value={meilleureMoyJour.toFixed(1)} color={CJ.green}/>}
          {meilleurMois && <StatCard i={5} label="Meilleur mois" value={meilleurMois.avg.toFixed(1)} color={CJ.yellow} sub={meilleurMois.label}/>}
          {progMoy30!=null && <StatCard i={6} label="Progression 30j" value={`${progMoy30>=0?"+":""}${progMoy30}`} color={progMoy30>=0?CJ.green:CJ.red}/>}
          {nbMoy(60)>0 && <StatCard i={7} label="Parties 60+" value={nbMoy(60)} color={CJ.blue}/>}
          {nbMoy(70)>0 && <StatCard i={8} label="Parties 70+" value={nbMoy(70)} color={CJ.blue}/>}
          {nbMoy(80)>0 && <StatCard i={9} label="Parties 80+" value={nbMoy(80)} color={CJ.accent}/>}
          {nbMoy(100)>0 && <StatCard i={10} label="Parties 100+" value={nbMoy(100)} color="#fbbf24"/>}
        </div>
        <div style={{ marginTop:12 }}>
          <MoyenneEvolution moyMvts={moyMvts}/>
        </div>
      </div>

      {/* ── SCORING ── */}
      <div style={secBox(CJ.accent)}>
        <SectionTitle icon={Target} color={CJ.accent}>Scoring</SectionTitle>
        {!hasScoring && <p style={{ color:CJ.muted,fontSize:11.5,marginBottom:10 }}>Les stats de scoring sont calculées à partir de tes prochains matchs.</p>}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
          <StatCard i={0} label="180"  value={hasScoring ? nb180  : "—"} color="#fbbf24" bientot={!hasScoring}/>
          <StatCard i={1} label="140+" value={hasScoring ? nb140  : "—"} color={CJ.accent} bientot={!hasScoring}/>
          <StatCard i={2} label="100+" value={hasScoring ? nb100  : "—"} color={CJ.yellow} bientot={!hasScoring}/>
          <StatCard i={3} label="80+"  value={hasScoring ? nb80   : "—"} color={CJ.muted} bientot={!hasScoring}/>
          <StatCard i={4} label="60+"  value={hasScoring ? nb60   : "—"} color={CJ.muted} bientot={!hasScoring}/>
          <StatCard i={5} label="Plus gros score" value={hasScoring && plusGrosScore>0 ? plusGrosScore : "—"} color={CJ.accent} bientot={!hasScoring}/>
          {totalPoints>0 && <StatCard i={6} label="Points marqués" value={Math.round(totalPoints).toLocaleString("fr-FR")} color={CJ.accent}/>}
          {totalVolees>0 && <StatCard i={7} label="Volées jouées" value={totalVolees.toLocaleString("fr-FR")} color={CJ.muted}/>}
          {scoreMoyVolee!=null && <StatCard i={8} label="Moy / volée" value={scoreMoyVolee} color={CJ.blue}/>}
          {pct100!=null && <StatCard i={9} label="Volées 100+" value={`${pct100}%`} color={CJ.yellow}/>}
          {pct140!=null && <StatCard i={10} label="Volées 140+" value={`${pct140}%`} color={CJ.accent}/>}
          {record180Partie>0 && <StatCard i={11} label="Record 180 / partie" value={record180Partie} color="#fbbf24"/>}
          {record100Partie>0 && <StatCard i={12} label="Record 100+ / partie" value={record100Partie} color={CJ.yellow}/>}
        </div>
      </div>

      {/* ── FINISHES ── */}
      <div style={secBox(CJ.purple)}>
        <SectionTitle icon={Crown} color={CJ.purple}>Finishes</SectionTitle>
        <div style={{ marginBottom:10 }}>
          <WideStat icon={Crown} label="Plus gros finish" value={hasScoring && plusGrosFinish>0 ? plusGrosFinish : "—"} color={CJ.purple} big/>
        </div>
        {hasCheckout ? (
          <div style={{ display:"grid", gridTemplateColumns:"auto 1fr", gap:10, alignItems:"center" }}>
            <CircularStat pct={tauxCheckout} label="Checkout" color={CJ.purple} sub={`${checkoutSuccess}/${checkoutAttempts} tentatives`}/>
            <WideStat icon={Target} label="Finishes 100+" value={hasScoring ? nbFinishes100 : "—"} color={CJ.yellow}/>
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:8 }}>
            <StatCard i={0} label="Checkout %" value="—" color={CJ.purple} bientot/>
            <StatCard i={1} label="Finishes 100+" value={hasScoring ? nbFinishes100 : "—"} color={CJ.yellow} bientot={!hasScoring}/>
          </div>
        )}
        {(totalFinishes>0 || plusGrosFinishMois>0 || checkout30!=null) && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginTop:10 }}>
            {totalFinishes>0 && <StatCard i={0} label="Total finishes" value={totalFinishes} color={CJ.purple}/>}
            {finishMoyen!=null && <StatCard i={1} label="Finish moyen" value={finishMoyen} color={CJ.purple}/>}
            {recordFinishPartie>0 && <StatCard i={2} label="Record finishes / partie" value={recordFinishPartie} color={CJ.green}/>}
            {plusGrosFinishMois>0 && <StatCard i={3} label="Plus gros finish (mois)" value={plusGrosFinishMois} color={CJ.yellow}/>}
            {checkout30!=null && <StatCard i={4} label="Checkout 30j" value={`${checkout30}%`} color={CJ.accent}/>}
          </div>
        )}
        {/* ── Finish favori + répartition par double (saisi au scoreur) ── */}
        {(() => {
          const entries = Object.entries(finishsDbl || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
          if (!entries.length) return null;
          const lbl = (k) => k === "B" ? "Bull" : "Double " + k;
          const short = (k) => k === "B" ? "Bull" : "D" + k;
          const total = entries.reduce((s, [, c]) => s + c, 0);
          return (
            <div style={{ marginTop:10 }}>
              <WideStat icon={Target} label="Finish favori" value={lbl(entries[0][0])} color={CJ.green} sub={`${entries[0][1]} finish${entries[0][1]>1?"s":""} · ${total} au total`}/>
              <div style={{ fontSize:10.5, color:CJ.muted, fontWeight:700, letterSpacing:.5, margin:"12px 2px 7px", textTransform:"uppercase" }}>Répartition par double</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 }}>
                {entries.map(([k, n], i) => (
                  <div key={k} style={{ background:CJ.card, border:`1px solid ${i===0?CJ.green+"66":"#ffffff10"}`, borderRadius:10, padding:"8px 2px", textAlign:"center", boxShadow:i===0?`0 0 10px ${CJ.green}22`:"none" }}>
                    <div style={{ fontSize:13, fontWeight:900, color:i===0?CJ.green:CJ.text, lineHeight:1.1 }}>{short(k)}</div>
                    <div style={{ fontSize:10, color:CJ.muted, marginTop:1 }}>{n}×</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── DUELS ── */}
      <div style={secBox(CJ.red)}>
        <SectionTitle icon={Swords} color={CJ.red}>Duels</SectionTitle>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
          <StatCard i={0} label="Duels joués"     value={termines.length} color={CJ.accent}/>
          <StatCard i={1} label="Rival principal" value={rival?rival[0]:"—"} sub={rival?`${rival[1]} match${rival[1]>1?"s":""}`:null} color={CJ.yellow}/>
          <StatCard i={2} label="Max DRIX gagné"  value={maxGain?`+${maxGain}`:"—"} color={CJ.green}/>
          <StatCard i={3} label="Max DRIX perdu"  value={maxPerte?`${maxPerte}`:"—"} color={CJ.red}/>
          <StatCard i={4} label="Meilleure série" value={meilleureSerieW>0?`${meilleureSerieW}W`:"—"} color={CJ.green} bientot={termines.length===0}/>
          <StatCard i={5} label="Nemesis"         value={nemesis?nemesis[0]:"—"} sub={nemesis?`${nemesis[1]} défaite${nemesis[1]>1?"s":""}`:null} color={CJ.red} bientot={defaites.length===0}/>
          {battuLePlus && <StatCard i={6} label="Tu bats le plus" value={battuLePlus[0]} sub={`${battuLePlus[1]} victoire${battuLePlus[1]>1?"s":""}`} color={CJ.green}/>}
          {advDiff>0 && <StatCard i={7} label="Adversaires affrontés" value={advDiff} color={CJ.accent}/>}
          {advBattus>0 && <StatCard i={8} label="Adversaires battus" value={advBattus} color={CJ.green}/>}
        </div>
      </div>

      {/* ── ÉVOLUTION DRIX ── */}
      {drixMvts.length > 0 && (
        <div style={secBox(CJ.yellow)}>
          <SectionTitle icon={TrendingUp} color={CJ.yellow}>Évolution DRIX</SectionTitle>
          {drixMvts.length >= 2 && (
            <div style={{ marginBottom:12 }}>
              <DrixEvolution drixMvts={drixMvts} current={joueur.drix||1000}/>
            </div>
          )}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:12 }}>
            <StatCard i={0} label="DRIX max atteint" value={drixMax} color={CJ.yellow}/>
            {bestJourDrix>0 && <StatCard i={1} label="Meilleur jour" value={`+${bestJourDrix}`} color={CJ.green}/>}
            {bestMoisDrix>0 && <StatCard i={2} label="Meilleur mois" value={`+${bestMoisDrix}`} color={CJ.green}/>}
            {worstJourDrix<0 && <StatCard i={3} label="Pire jour" value={worstJourDrix} color={CJ.red}/>}
          </div>
        </div>
      )}

      {/* ── ACTIVITÉ ── */}
      {termines.length > 0 && (
        <div style={secBox(CJ.blue)}>
          <SectionTitle icon={Clock} color={CJ.blue}>Activité</SectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            <StatCard i={0} label="Parties" value={termines.length} color={CJ.blue}/>
            <StatCard i={1} label="Manches" value={manchesJouees} color={CJ.accent}/>
            <StatCard i={2} label="Legs" value={totalLegs} color={CJ.accent}/>
            {tempsEstimeMin>0 && <StatCard i={3} label="Temps de jeu (est.)" value={fmtDuree(tempsEstimeMin)} color={CJ.green}/>}
            {bestDow && <StatCard i={4} label="Jour favori" value={bestDow} color={CJ.yellow}/>}
            {bestHour!=null && <StatCard i={5} label="Heure favorite" value={`${bestHour}h`} color={CJ.yellow}/>}
            {longestSessionMin>0 && <StatCard i={6} label="Plus longue session" value={fmtDuree(longestSessionMin)} color={CJ.purple}/>}
            {streakJours>0 && <StatCard i={7} label="Jours consécutifs" value={`${streakJours}🔥`} color={CJ.green}/>}
          </div>
        </div>
      )}

      {/* ── RECORDS ── */}
      {(hasScoring || termines.length>0) && (
        <div style={secBox(CJ.yellow)}>
          <SectionTitle icon={Trophy} color={CJ.yellow}>Records</SectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
            {meilleureMoyPartie!=null && <StatCard i={0} label="Record moyenne" value={meilleureMoyPartie.toFixed(1)} color={CJ.blue}/>}
            {meilleureMoyManche!=null && <StatCard i={0} label="Record moyenne / manche" value={meilleureMoyManche.toFixed(1)} color={CJ.blue}/>}
            {plusGrosScore>0 && <StatCard i={1} label="Record score" value={plusGrosScore} color={CJ.accent}/>}
            {plusGrosFinish>0 && <StatCard i={2} label="Record finish" value={plusGrosFinish} color={CJ.purple}/>}
            {record180Partie>0 && <StatCard i={3} label="Record 180 / partie" value={record180Partie} color="#fbbf24"/>}
            {meilleureSerieW>0 && <StatCard i={4} label="Record victoires" value={`${meilleureSerieW}🔥`} color={CJ.green}/>}
            <StatCard i={5} label="Record DRIX" value={drixMax} color={CJ.yellow}/>
            {bestJourDrix>0 && <StatCard i={6} label="Record gain / jour" value={`+${bestJourDrix}`} color={CJ.green}/>}
          </div>
        </div>
      )}

      {/* ── STATISTIQUES FUN ── */}
      {(() => {
        const fun = [
          tempsEstimeMin>0     && { e:"🏃", nom:"Marathonien",       desc:"Temps total estimé de jeu",              val:fmtDuree(tempsEstimeMin), c:CJ.green },
          termines.length>0    && { e:"🔥", nom:"L'Acharné",         desc:"Matchs joués",                           val:termines.length,          c:CJ.accent },
          revenant>0           && { e:"💪", nom:"Le Revenant",       desc:"Victoires après une 1re manche perdue",  val:revenant,                 c:CJ.yellow },
          nbBadgesStats>0      && { e:"🏅", nom:"Le Collectionneur", desc:"Badges débloqués",                       val:nbBadgesStats,            c:CJ.yellow },
          extra.bars>0         && { e:"🍻", nom:"Le Globe-trotter",  desc:"Bars différents visités",                val:extra.bars,               c:CJ.blue },
          extra.tournois>0     && { e:"🏆", nom:"Le Compétiteur",    desc:"Tournois joués",                         val:extra.tournois,           c:CJ.purple },
          cauchemar>0          && { e:"😈", nom:"Le Cauchemar",      desc:"Joueurs jamais battu par toi (5+ matchs)", val:cauchemar,              c:CJ.red },
          advBattus>0          && { e:"👑", nom:"Le Bourreau",       desc:"Joueurs différents battus",              val:advBattus,                c:CJ.green },
        ].filter(Boolean);
        if (!fun.length) return null;
        return (
          <div style={secBox(CJ.purple)}>
            <SectionTitle icon={Sparkles} color={CJ.purple}>Statistiques fun</SectionTitle>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {fun.map((f,i)=>(
                <div key={i} style={{ ...card, display:"flex", alignItems:"center", gap:12, padding:"11px 13px", animation:"dpStatIn .4s ease both", animationDelay:`${(0.03*i).toFixed(2)}s` }}>
                  <div style={{ flexShrink:0, width:42, height:42, borderRadius:12, background:`${f.c}1a`, border:`1px solid ${f.c}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:21 }}>{f.e}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13.5, fontWeight:800, color:CJ.text }}>{f.nom}</div>
                    <div style={{ fontSize:11, color:CJ.muted }}>{f.desc}</div>
                  </div>
                  <div style={{ fontSize:20, fontWeight:900, color:f.c, whiteSpace:"nowrap", flexShrink:0 }}>{f.val}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── HISTORIQUE DRIX (en dernier) ── */}
      {drixMvts.length > 0 && (
        <div style={secBox(CJ.muted)}>
          <SectionTitle icon={Clock} color={CJ.muted}>Historique DRIX</SectionTitle>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {drixMvts.slice(0,10).map((m,i)=>{
              const win = m.resultat === "victoire";
              const up  = m.variation > 0;
              return (
                <div key={i} style={{ ...card, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 13px",
                  background:win?"linear-gradient(90deg,#14532d24,#16161c 62%)":"linear-gradient(90deg,#7f1d1d24,#16161c 62%)",
                  border:`1px solid ${win?"#22c55e33":"#ef444433"}`, animation:"dpStatIn .4s ease both", animationDelay:`${(0.03*i).toFixed(2)}s` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:11, minWidth:0 }}>
                    <div style={{ flexShrink:0, width:34, height:34, borderRadius:10, background:win?"#22c55e22":"#ef444422", border:`1px solid ${win?"#22c55e55":"#ef444455"}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {win ? <Check size={16} color={CJ.green} strokeWidth={3}/> : <X size={16} color={CJ.red} strokeWidth={3}/>}
                    </div>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontWeight:800, fontSize:13.5, color:CJ.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>vs {m.adversaire_pseudo||"?"}</div>
                      <div style={{ fontSize:10.5, color:CJ.muted }}>{win?"Victoire":"Défaite"} · {new Date(m.date).toLocaleDateString("fr-FR")}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0 }}>
                    <span style={{ fontSize:10.5, color:"#64748b" }}>{m.drix_avant}→{m.drix_apres}</span>
                    <span style={{ fontWeight:900, fontSize:14, color:up?CJ.green:CJ.red, background:up?"#14532d":"#7f1d1d", borderRadius:8, padding:"3px 9px" }}>{up?"+":""}{m.variation}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// ── PAGE AMIS (nouvelle page) ──────────────────────────────────────────────────
export const PageProfilAmis = ({ joueur, setPage }) => (
  <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 20px" }}>
    <button onClick={()=>window.history.back()} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",fontSize:14,marginBottom:20,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation" }}><ArrowLeft size={16}/> Retour au profil</button>
    <AmiSection joueur={joueur} setPage={setPage}/>
  </div>
);

// ── PAGE HISTORIQUE ────────────────────────────────────────────────────────────
// Détail manche par manche (même présentation que le Comptoir). Autonome (couleurs en dur)
// pour éviter un import circulaire avec App.jsx où vit le MancheDetailList d'origine.
const fmtMoyJ = (m) => (m == null || m === "" ? "—" : Number(m).toFixed(2).replace(".", ","));
const MancheDetailListJ = ({ manches }) => (
  <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:6 }}>
    {(manches||[]).map((m, i) => (
      <div key={i} style={{ background:"#0f0f0f", borderRadius:10, padding:"10px 12px" }}>
        <div style={{ fontWeight:700, fontSize:12, color:"#f97316", marginBottom:6 }}>🏆 Manche {i+1} — {m.winner}</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
          <div>
            <div style={{ fontWeight:700, color:"#10b981", marginBottom:2 }}>{m.winner}</div>
            <div style={{ color:"#94a3b8" }}>{(m.winner_flech ?? (m.winner_volees!=null ? m.winner_volees*3 : null)) ?? "—"} fléchettes <span style={{ color:"#64748b" }}>({m.winner_volees ?? "—"} volée{(m.winner_volees ?? 0)>1?"s":""})</span></div>
            <div style={{ color:"#94a3b8" }}>moy. {fmtMoyJ(m.winner_moy)} pts/volée</div>
          </div>
          <div>
            <div style={{ fontWeight:700, color:"#ef4444", marginBottom:2 }}>{m.loser}</div>
            <div style={{ color:"#94a3b8" }}>{(m.loser_flech ?? (m.loser_volees!=null ? m.loser_volees*3 : null)) ?? "—"} fléchettes <span style={{ color:"#64748b" }}>({m.loser_volees ?? "—"} volée{(m.loser_volees ?? 0)>1?"s":""})</span></div>
            <div style={{ color:"#94a3b8" }}>moy. {fmtMoyJ(m.loser_moy)} pts/volée</div>
            <div style={{ color:"#f59e0b", fontWeight:600 }}>reste : {m.reste_loser ?? "—"} pts</div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const PageProfilHistorique = ({ joueur, setPage, embedded = false }) => {
  const [duels, setDuels]       = useState([]);
  const [drixMvtMap, setDrixMvtMap] = useState({});
  const [loading, setLoading]   = useState(true);
  const [openId, setOpenId]     = useState(null); // duel dont le détail manche par manche est ouvert

  useEffect(() => {
    Promise.all([
      dbJ.getDuels(joueur.id),
      sbJ(`drix_mouvements?joueur_id=eq.${joueur.id}&order=date.desc&select=*`).catch(()=>[]),
    ]).then(([d, mvts]) => {
      setDuels(d||[]);
      const map = {};
      (mvts||[]).forEach(m => { if (m.duel_id) map[m.duel_id] = m.variation; });
      setDrixMvtMap(map);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, [joueur.id]);

  if (loading) return <SpinnerJ/>;

  const termines = duels.filter(d => d.statut === "termine");

  return (
    <div style={embedded ? {} : { maxWidth:860, margin:"0 auto", padding:"16px 16px 40px" }}>
      {!embedded && <button onClick={()=>window.history.back()} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",fontSize:14,marginBottom:16,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation" }}><ArrowLeft size={16}/> Retour au profil</button>}
      <h1 style={{ fontWeight:900, fontSize:22, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}><Clock size={20} color={CJ.accent}/>Historique</h1>
      <p style={{ color:CJ.muted, fontSize:13, marginBottom:20 }}>{termines.length} duel{termines.length>1?"s":""} terminé{termines.length>1?"s":""}</p>
      <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:18 }}>
        {termines.length === 0
          ? <p style={{ color:CJ.muted, fontSize:13 }}>Aucun duel terminé pour l'instant.</p>
          : termines.map(d => {
              const isC  = d.challenger_id === joueur.id;
              const adv  = isC ? d.defie_pseudo : d.challenger_pseudo;
              const advId = isC ? d.defie_id : d.challenger_id;
              const {sc,sd} = fixManches(d);
              const monM = isC?sc:sd, sonM = isC?sd:sc;
              const monMoy = isC?d.score_challenger:d.score_defie;
              const gagne = d.gagnant_id === joueur.id;
              const variation = drixMvtMap[d.id];
              const ouvert = openId === d.id;
              return (
                <div key={d.id} onClick={()=>setOpenId(o=>o===d.id?null:d.id)} style={{ background:"#ffffff0a", border:`1px solid ${gagne?CJ.green+"33":CJ.red+"33"}`, borderRadius:10, padding:12, marginBottom:8, cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                    <div>
                      <span style={{ fontWeight:700, fontSize:14 }}>vs{" "}
                        <span onClick={(e)=>{ e.stopPropagation(); setPage("profil-joueur-"+advId); }} style={{ color:CJ.accent, cursor:"pointer", textDecoration:"underline" }}>{adv}</span>
                      </span>
                      <div style={{ color:CJ.muted, fontSize:12, marginTop:2 }}>{d.mode} · {d.manches||1} manche{(d.manches||1)>1?"s":""} · {new Date(d.date).toLocaleDateString("fr-FR")}</div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                      <span style={{ fontWeight:800, fontSize:15 }}>{monM??'?'}–{sonM??'?'}</span>
                      {monMoy && <span style={{ fontSize:12, color:CJ.accent }}>Moy. {Math.round(monMoy)}</span>}
                      <span style={{ background:(gagne?CJ.green:CJ.red)+"22",color:gagne?CJ.green:CJ.red,border:`1px solid ${(gagne?CJ.green:CJ.red)}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:4 }}>
                        {gagne ? <Check size={11} strokeWidth={3}/> : <X size={11} strokeWidth={3}/>}
                        {gagne ? "Victoire" : "Défaite"}
                      </span>
                      {variation !== undefined && (
                        <span style={{ fontWeight:800, fontSize:12, color:variation>0?CJ.green:CJ.red, background:variation>0?"#14532d":"#7f1d1d", borderRadius:6, padding:"2px 8px" }}>
                          {variation>0?"+":""}{variation} DRIX
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ color:CJ.muted, fontSize:11, marginTop:8, fontWeight:600 }}>
                    {ouvert ? "▴ Masquer le détail" : "▾ Voir le détail manche par manche"}
                  </div>
                  {ouvert && (
                    <div onClick={(e)=>e.stopPropagation()}>
                      {Array.isArray(d.manches_detail) && d.manches_detail.length
                        ? <MancheDetailListJ manches={d.manches_detail}/>
                        : <div style={{ marginTop:8, color:CJ.muted, fontSize:12, fontStyle:"italic" }}>Détail manche par manche indisponible pour ce match.</div>}
                    </div>
                  )}
                </div>
              );
            })
        }
      </div>
    </div>
  );
};

// ── BADGES SYSTÈME ────────────────────────────────────────────────────────────

const BADGE_CATS = [
  { id:"scoring",   label:"🎯 Précision / Scoring" },
  { id:"finish",    label:"👑 Finish" },
  { id:"duels",     label:"⚔️ Duels" },
  { id:"parties",   label:"🎮 Parties" },
  { id:"anti26",    label:"😂 Anti-26" },
  { id:"drix",      label:"🏆 DRIX" },
  { id:"social",    label:"🫂 Social" },
  { id:"streak",    label:"🔥 Streak" },
  { id:"doublette", label:"👥 Doublette" },
];

export const ALL_BADGES = [
  // Scoring
  { id:"s_180_1",   cat:"scoring",   emoji:"🎯",  nom:"Premier 180",           desc:"Marquer un 180",               seuil:1,   couleur:"#ef4444", val:d=>d.nb180 },
  { id:"s_180_10",  cat:"scoring",   emoji:"💥",  nom:"Machine à triples",     desc:"10 × 180",                     seuil:10,  couleur:"#ef4444", val:d=>d.nb180 },
  { id:"s_180_50",  cat:"scoring",   emoji:"🔥",  nom:"Canonnier",             desc:"50 × 180",                     seuil:50,  couleur:"#ef4444", val:d=>d.nb180 },
  { id:"s_180_100", cat:"scoring",   emoji:"⚡",  nom:"Mitrailleur",            desc:"100 × 180",                    seuil:100, couleur:"#ef4444", val:d=>d.nb180 },
  { id:"s_100_100", cat:"scoring",   emoji:"🎯",  nom:"Centurion",             desc:"100 scores à 100+",            seuil:100, couleur:"#f59e0b", val:d=>d.nb100 },
  { id:"s_140_50",  cat:"scoring",   emoji:"🚀",  nom:"Lance-flammes",         desc:"50 scores à 140+",             seuil:50,  couleur:"#f59e0b", val:d=>d.nb140 },
  { id:"s_140_100", cat:"scoring",   emoji:"💣",  nom:"Bombardier",            desc:"100 scores à 140+",            seuil:100, couleur:"#f59e0b", val:d=>d.nb140 },
  // Finish
  { id:"f_bigfish", cat:"finish",    emoji:"🐟",  nom:"Big Fish",              desc:"Finish 170",                   seuil:1,   couleur:"#22c55e", val:d=>d.plusGrosFinish>=170?1:0 },
  { id:"f_100_10",  cat:"finish",    emoji:"🎯",  nom:"Chirurgien",            desc:"10 finishes 100+",             seuil:10,  couleur:"#22c55e", val:d=>d.nbFinishes100 },
  { id:"f_100_50",  cat:"finish",    emoji:"🔥",  nom:"Bourreau",              desc:"50 finishes 100+",             seuil:50,  couleur:"#22c55e", val:d=>d.nbFinishes100 },
  { id:"f_67",      cat:"finish",    emoji:"🍀",  nom:"Six Seven",             desc:"Finish 67",                    seuil:1,   couleur:"#22c55e", val:d=>d.hasSixSevenFinish?1:0 },
  // Duels
  { id:"d_first",   cat:"duels",     emoji:"🥊",  nom:"Premier sang",          desc:"Premier duel joué",            seuil:1,   couleur:"#60a5fa", val:d=>d.parties },
  { id:"d_win1",    cat:"duels",     emoji:"🏆",  nom:"Première victoire",     desc:"Gagner son premier duel",      seuil:1,   couleur:"#22c55e", val:d=>d.victoires },
  { id:"d_win10",   cat:"duels",     emoji:"⚔️",  nom:"Gladiateur",            desc:"10 victoires",                 seuil:10,  couleur:"#22c55e", val:d=>d.victoires },
  { id:"d_win50",   cat:"duels",     emoji:"🛡️",  nom:"Vétéran",               desc:"50 victoires",                 seuil:50,  couleur:"#22c55e", val:d=>d.victoires },
  { id:"d_win100",  cat:"duels",     emoji:"👑",  nom:"Conquérant",            desc:"100 victoires",                seuil:100, couleur:"#fbbf24", val:d=>d.victoires },
  { id:"d_serie3",  cat:"duels",     emoji:"🔥",  nom:"Sur série",             desc:"3 victoires d'affilée",        seuil:3,   couleur:"#f97316", val:d=>d.meilleureSerieW },
  { id:"d_serie5",  cat:"duels",     emoji:"💀",  nom:"Intouchable",           desc:"5 victoires d'affilée",        seuil:5,   couleur:"#f97316", val:d=>d.meilleureSerieW },
  { id:"d_serie10", cat:"duels",     emoji:"☠️",  nom:"Légende noire",         desc:"10 victoires d'affilée",       seuil:10,  couleur:"#f97316", val:d=>d.meilleureSerieW },
  { id:"d_giant",   cat:"duels",     emoji:"🦁",  nom:"Tueur de géants",       desc:"Battre un joueur +200 DRIX",   seuil:1,   couleur:"#fbbf24", val:d=>d.hasGiantKill?1:0 },
  // Parties
  { id:"p_10",      cat:"parties",   emoji:"🎮",  nom:"Échauffement",          desc:"10 parties jouées",            seuil:10,  couleur:"#a78bfa", val:d=>d.parties },
  { id:"p_50",      cat:"parties",   emoji:"🕹️",  nom:"Habitué",               desc:"50 parties jouées",            seuil:50,  couleur:"#a78bfa", val:d=>d.parties },
  { id:"p_100",     cat:"parties",   emoji:"🎲",  nom:"Marathonien",           desc:"100 parties jouées",           seuil:100, couleur:"#a78bfa", val:d=>d.parties },
  { id:"p_500",     cat:"parties",   emoji:"🏆",  nom:"Pilier du bar",         desc:"500 parties jouées",           seuil:500, couleur:"#fbbf24", val:d=>d.parties },
  // Anti-26
  { id:"a26_10",    cat:"anti26",    emoji:"🍌",  nom:"As du 26",              desc:"10 fois 26",                   seuil:10,  couleur:"#f59e0b", val:d=>d.nb26 },
  { id:"a26_50",    cat:"anti26",    emoji:"🤡",  nom:"Abonné au 26",          desc:"50 fois 26",                   seuil:50,  couleur:"#f59e0b", val:d=>d.nb26 },
  { id:"a26_100",   cat:"anti26",    emoji:"💩",  nom:"Roi du 26",             desc:"100 fois 26",                  seuil:100, couleur:"#f59e0b", val:d=>d.nb26 },
  { id:"a26_500",   cat:"anti26",    emoji:"🎪",  nom:"Légende du 26",         desc:"500 fois 26",                  seuil:500, couleur:"#f59e0b", val:d=>d.nb26 },
  // DRIX
  { id:"dr_1200",   cat:"drix",      emoji:"📈",  nom:"Ascension",             desc:"Atteindre 1200 DRIX",          seuil:1,   couleur:"#22c55e", val:d=>d.maxDrix>=1200?1:0 },
  { id:"dr_1500",   cat:"drix",      emoji:"💎",  nom:"Confirmé",              desc:"Atteindre 1500 DRIX",          seuil:1,   couleur:"#a78bfa", val:d=>d.maxDrix>=1500?1:0 },
  { id:"dr_2000",   cat:"drix",      emoji:"🚀",  nom:"Élite",                 desc:"Atteindre 2000 DRIX",          seuil:1,   couleur:"#fbbf24", val:d=>d.maxDrix>=2000?1:0 },
  // Social
  { id:"soc_1",     cat:"social",    emoji:"🤝",  nom:"Premier pote",          desc:"Premier ami ajouté",           seuil:1,   couleur:"#10b981", val:d=>d.nbAmis },
  { id:"soc_5",     cat:"social",    emoji:"👥",  nom:"Petit cercle",          desc:"5 amis",                       seuil:5,   couleur:"#10b981", val:d=>d.nbAmis },
  { id:"soc_10",    cat:"social",    emoji:"🫂",  nom:"La bande",              desc:"10 amis",                      seuil:10,  couleur:"#10b981", val:d=>d.nbAmis },
  { id:"soc_20",    cat:"social",    emoji:"🌍",  nom:"Le réseau",             desc:"20 amis",                      seuil:20,  couleur:"#10b981", val:d=>d.nbAmis },
  { id:"soc_trn",   cat:"social",    emoji:"🎯",  nom:"Tournoi entre potes",   desc:"Participer à un tournoi privé",seuil:1,   couleur:"#10b981", val:d=>d.nbTournois },
  { id:"soc_wtrn",  cat:"social",    emoji:"🏆",  nom:"Boss de la bande",      desc:"Gagner un tournoi privé",      seuil:1,   couleur:"#fbbf24", val:d=>d.nbTournoisGagnes },
  // Streak
  { id:"str_7",     cat:"streak",    emoji:"📆",  nom:"Régulier",              desc:"7 jours avec au moins 1 duel", seuil:7,   couleur:"#06b6d4", val:d=>d.streakJours },
  { id:"str_30",    cat:"streak",    emoji:"🗓️",  nom:"Accroché au comptoir",  desc:"30 jours avec un duel",        seuil:30,  couleur:"#06b6d4", val:d=>d.streakJours },
  { id:"str_100",   cat:"streak",    emoji:"📅",  nom:"Impossible à décrocher",desc:"100 jours avec un duel",       seuil:100, couleur:"#06b6d4", val:d=>d.streakJours },
  // Doublette
  { id:"dbl_1",     cat:"doublette", emoji:"🤝",  nom:"Premier duo",           desc:"Première doublette jouée",     seuil:1,   couleur:"#8b5cf6", val:d=>d.nbDoublettes },
  { id:"dbl_10",    cat:"doublette", emoji:"⚔️",  nom:"Binôme solide",         desc:"10 victoires en doublette",    seuil:10,  couleur:"#8b5cf6", val:d=>d.nbWinsDoublette },
  { id:"dbl_50",    cat:"doublette", emoji:"🏆",  nom:"Duo légendaire",        desc:"50 victoires en doublette",    seuil:50,  couleur:"#8b5cf6", val:d=>d.nbWinsDoublette },
];

export const computeBadgeValues = (joueur, stats, duels, drixMvts, amis, nbTournois=0, nbTournoisGagnes=0, nbDoublettes=0, nbWinsDoublette=0) => {
  const termines = (duels||[]).filter(d=>d.statut==="termine");
  const victoires = stats?.victoires??0;
  const parties   = stats?.parties??0;

  let nb180=0, nb140=0, nb100=0, nb26=0, nbFinishes100=0, plusGrosFinish=0;
  let hasSixSevenFinish=false;

  termines.forEach(d=>{
    (d.manches_detail||[]).forEach(m=>{
      // Gère le changement de pseudo : comparer au pseudo stocké dans le duel au moment de la partie
      const isChallenger = d.challenger_id === joueur.id;
      const myPseudoAtTime = isChallenger ? (d.challenger_pseudo || joueur.pseudo) : (d.defie_pseudo || joueur.pseudo);
      const isW = m.winner === myPseudoAtTime || m.winner === joueur.pseudo;
      nb180 += isW?(m.winner_180||0):(m.loser_180||0);
      nb140 += isW?(m.winner_140plus||0):(m.loser_140plus||0);
      nb100 += isW?(m.winner_100plus||0):(m.loser_100plus||0);
      nb26  += isW?(m.winner_26||0):(m.loser_26||0);
      if(isW){
        const fin = m.winner_finish||0;
        if(fin>=100) nbFinishes100++;
        if(fin>plusGrosFinish) plusGrosFinish=fin;
        if(fin===67) hasSixSevenFinish=true;
      }
    });
  });

  // Meilleure série de victoires
  const sortedChron=[...termines].sort((a,b)=>(a.date||0)-(b.date||0));
  let meilleureSerieW=0, tmp=0;
  sortedChron.forEach(d=>{ if(d.gagnant_id===joueur.id){tmp++;meilleureSerieW=Math.max(meilleureSerieW,tmp);}else tmp=0; });

  // Max DRIX atteint (ever)
  const mvtsMax=(drixMvts||[]).map(m=>m.drix_apres||0);
  const maxDrix=Math.max(joueur.drix||1000,...mvtsMax);

  // Streak jours consécutifs (jours avec au moins 1 duel)
  let streakJours=0;
  if(termines.length>0){
    const duelDays=[...new Set(termines.map(d=>new Date(d.date||0).toDateString()))].map(s=>new Date(s)).sort((a,b)=>a-b);
    let curr=1, best=1;
    for(let i=1;i<duelDays.length;i++){
      const diff=(duelDays[i]-duelDays[i-1])/(1000*3600*24);
      if(diff<=1) { curr++; best=Math.max(best,curr); } else curr=1;
    }
    // Streak actuel = seulement si le dernier duel remonte à aujourd'hui ou hier
    const lastDay=duelDays[duelDays.length-1];
    const today=new Date(); today.setHours(0,0,0,0);
    const daysSinceLast=(today-lastDay)/(1000*3600*24);
    streakJours=daysSinceLast<=1?curr:0;
  }

  // Amis acceptés
  const nbAmis=(amis||[]).filter(a=>a.statut==="accepte").length;

  // 🦁 Tueur de géants : a battu un joueur +200 DRIX
  // Proxy via formule ELO (K=32) : battre qqn +200 DRIX donne ~+24 DRIX au gagnant.
  // On considère un giant kill si on a au moins 1 victoire avec gain >= 24 DRIX.
  const hasGiantKill = (drixMvts||[]).some(m =>
    m.resultat === "victoire" && (m.variation || 0) >= 24
  );

  return {
    nb180, nb140, nb100, nb26, nbFinishes100, plusGrosFinish,
    hasSixSevenFinish,
    victoires, parties, meilleureSerieW, maxDrix, streakJours,
    nbAmis, nbTournois, nbTournoisGagnes, nbDoublettes, nbWinsDoublette,
    hasGiantKill,
  };
};

// localStorage helpers
export const getBadgesStored = (joueurId) => {
  try { return new Set(JSON.parse(localStorage.getItem(`dp_badges_${joueurId}`)||"[]")); }
  catch { return new Set(); }
};
export const storeBadgesSet = (joueurId, badgeSet) => {
  try { localStorage.setItem(`dp_badges_${joueurId}`, JSON.stringify([...badgeSet])); } catch {}
};

// ── PAGE BADGES ───────────────────────────────────────────────────────────────
// Visuel d'un badge : image personnalisée /badges/<id>.webp si présente,
// sinon repli automatique sur l'emoji du badge (les barres de progression
// et le check sont gérés à part par les cartes, on ne touche qu'au visuel).
// ⚠️ Les visuels sont fournis en PNG de 400 Ko à 1,6 Mo pièce : en l'état, une page
// de badges aurait pesé plusieurs Mo. D'où le WebP (≈35 Ko l'unité, même rendu,
// transparence conservée) — c'est la raison du changement d'extension.
export const BadgeVisual = ({ b, size = 42, fill = false, unlocked = true }) => {
  const [imgErr, setImgErr] = useState(false);
  const fil = unlocked ? "none" : "grayscale(1)";
  if (imgErr) {
    return <span style={{ fontSize: fill ? 76 : Math.round(size * 0.72), lineHeight: 1, filter: fil }}>{b.emoji}</span>;
  }
  return <img src={`/badges/${encodeURIComponent(b.id)}.webp`} alt="" loading="lazy" decoding="async" onError={() => setImgErr(true)}
    style={fill
      ? { width: "100%", height: "auto", objectFit: "contain", display: "block", filter: fil }
      : { width: size, height: size, objectFit: "contain", display: "block", filter: fil }}/>;
};

export const PageProfilBadges = ({ joueur, setPage, embedded = false }) => {
  const [stats, setStats]   = useState(null);
  const [duels, setDuels]   = useState([]);
  const [drixMvts, setDrixMvts] = useState([]);
  const [amis, setAmis]     = useState([]);
  const [nbTournois, setNbTournois] = useState(0);
  const [nbTournoisGagnes, setNbTournoisGagnes] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dbJ.getStats(joueur.id),
      dbJ.getDuels(joueur.id),
      sbJ(`drix_mouvements?joueur_id=eq.${joueur.id}&order=date.desc&limit=200&select=drix_apres,variation,resultat`).catch(()=>[]),
      sbJ(`amis?or=(joueur_id.eq.${joueur.id},ami_id.eq.${joueur.id})&select=statut`).catch(()=>[]),
      sbJ(`tournois_potes_joueurs?joueur_id=eq.${joueur.id}&select=tournoi_id`).catch(()=>[]),
      sbJ(`tournois_potes?gagnant_id=eq.${joueur.id}&select=id`).catch(()=>[]),
    ]).then(([s,d,dm,a,trn,wtrn])=>{
      setStats(s);
      setDuels(d||[]);
      setDrixMvts(dm||[]);
      setAmis(a||[]);
      setNbTournois((trn||[]).length);
      setNbTournoisGagnes((wtrn||[]).length);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, [joueur.id]);

  if (loading) return <SpinnerJ/>;

  const vals = computeBadgeValues(joueur, stats, duels, drixMvts, amis, nbTournois, nbTournoisGagnes, 0, 0);
  const totalUnlocked = ALL_BADGES.filter(b=>b.val(vals)>=b.seuil).length;

  // Marque tous les badges comme vus dès l'ouverture de la page
  try { localStorage.setItem(`dp_badges_seen_${joueur.id}`, String(totalUnlocked)); } catch {}


  const BadgeCard = ({ b }) => {
    const current = b.val(vals);
    const unlocked = current >= b.seuil;
    const pct = Math.min(100, Math.round((current / b.seuil) * 100));
    const isIncremental = b.seuil > 1;
    return (
      <div style={{
        background: unlocked ? b.couleur + "18" : "#1a1a1a",
        border: `1px solid ${unlocked ? b.couleur + "55" : "#2a2a2a"}`,
        borderRadius: 14,
        padding: "14px 14px 12px",
        position: "relative",
        overflow: "hidden",
        opacity: unlocked ? 1 : 0.52,
        transition: "all .2s",
        boxShadow: unlocked ? `0 2px 16px ${b.couleur}15` : "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}>
        {/* Visuel du badge : image /badges/<id>.webp (repli emoji si absente) */}
        <div style={{ marginBottom: 10, width: "100%", display: "flex", justifyContent: "center" }}><BadgeVisual b={b} fill unlocked={unlocked}/></div>

        {/* Nom */}
        <div style={{ fontWeight: 700, fontSize: 13, color: unlocked ? b.couleur : "#f1f5f9", marginBottom: 4, lineHeight: 1.3 }}>{b.nom}</div>

        {/* Description — 12px minimum (design system) */}
        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, marginBottom: isIncremental && !unlocked ? 10 : 0 }}>{b.desc}</div>

        {/* Barre de progression */}
        {isIncremental && !unlocked && (
          <>
            <div style={{ background: "#ffffff10", borderRadius: 6, height: 5, overflow: "hidden", width: "100%" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${b.couleur}aa, ${b.couleur})`, borderRadius: 6, transition: "width .5s ease" }}/>
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5, fontWeight: 600 }}>{current} / {b.seuil}</div>
          </>
        )}

        {/* Checkmark SVG — design system : pas d'emoji comme icône UI */}
        {unlocked && (
          <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%", background: b.couleur, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 8px ${b.couleur}66` }}>
            <Check size={13} color="#fff" strokeWidth={3}/>
          </div>
        )}
      </div>
    );
  };

  // Progression globale
  const globalPct = Math.round((totalUnlocked / ALL_BADGES.length) * 100);

  return (
    <div style={embedded ? {} : { maxWidth: 600, margin: "0 auto", padding: "16px 16px 40px" }}>

      {/* Bouton retour — ArrowLeft SVG (design system) */}
      {!embedded && <button onClick={() => window.history.back()}
        style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 6, touchAction: "manipulation", padding: 0 }}
        onMouseEnter={e => e.currentTarget.style.color = "#f1f5f9"}
        onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>
        <ArrowLeft size={16}/> Retour au profil
      </button>}

      {/* En-tête */}
      <h1 style={{ fontWeight: 900, fontSize: 24, marginBottom: 4 }}>🏅 Mes badges</h1>

      {/* Progression globale */}
      <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 16px", marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 600 }}>Progression globale</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: "#f1f5f9" }}>{totalUnlocked} <span style={{ color: "#94a3b8", fontWeight: 500 }}>/ {ALL_BADGES.length}</span></span>
        </div>
        <div style={{ background: "#ffffff10", borderRadius: 8, height: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${globalPct}%`, background: "linear-gradient(90deg, #f97316, #ea580c)", borderRadius: 8, transition: "width .6s ease", boxShadow: "0 0 10px #f9731640" }}/>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{globalPct}% débloqués</div>
      </div>

      {/* Catégories */}
      {BADGE_CATS.map(cat => {
        const catBadges = ALL_BADGES.filter(b => b.cat === cat.id);
        const catUnlocked = catBadges.filter(b => b.val(vals) >= b.seuil).length;
        const allDone = catUnlocked === catBadges.length;
        return (
          <div key={cat.id} style={{ marginBottom: 28 }}>
            {/* Header catégorie */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ fontWeight: 800, fontSize: 14, color: "#f1f5f9", letterSpacing: 0.4, margin: 0 }}>{cat.label}</h3>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                background: allDone ? "#22c55e22" : "#f9731618",
                color: allDone ? "#22c55e" : "#f97316",
                border: `1px solid ${allDone ? "#22c55e44" : "#f9731630"}`,
              }}>
                {catUnlocked}/{catBadges.length}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
              {catBadges.map(b => <BadgeCard key={b.id} b={b} vals={vals}/>)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── PAGE JOUEURS (liste publique) ─────────────────────────────────────────────
export const PageJoueurs = ({ joueur, setPage }) => {
  const [joueurs, setJoueurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { dbJ.getJoueurs().then(j=>{setJoueurs(j||[]);setLoading(false);}).catch(()=>setLoading(false)); }, []);

  const filtered = useMemo(()=>{ const q=search.toLowerCase(); return joueurs.filter(j=>!q||j.pseudo.toLowerCase().includes(q)); },[joueurs,search]);

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"36px 20px" }}>
      <h1 style={{ fontWeight:800,fontSize:26,marginBottom:6 }}>👥 Joueurs</h1>
      <p style={{ color:CJ.muted,marginBottom:20 }}>{joueurs.length} joueurs inscrits</p>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher un pseudo…"
        style={{ width:"100%",background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:8,padding:"10px 14px",color:CJ.text,fontSize:14,marginBottom:20 }}/>
      {loading ? <SpinnerJ/> : (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12 }}>
          {filtered.map(j=>{
            const drix = j.drix||1000;
            const {titre,color} = getDrixTitreLocal(drix);
            return (
              <div key={j.id} onClick={()=>setPage("profil-joueur-"+j.id)}
                style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:16,cursor:"pointer",transition:"border-color .15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=color} onMouseLeave={e=>e.currentTarget.style.borderColor=CJ.border}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:8 }}>
                  <div style={{ width:44,height:44,background:color+"22",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,border:`2px solid ${color}44`,flexShrink:0,overflow:"hidden" }}>
                    {j.photo ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <RankIcon drix={drix} size={20}/>}
                  </div>
                  <div>
                    <div style={{ fontWeight:700,fontSize:14 }}>{j.pseudo}</div>
                    <div style={{ color,fontSize:11,fontWeight:600 }}>{drix} DRIX · {titre}</div>
                  </div>
                </div>
                {joueur && joueur.id!==j.id && <div style={{ fontSize:11,color:CJ.accent }}>⚔️ Voir le profil →</div>}
              </div>
            );
          })}
        </div>
      )}
      {!joueur && (
        <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:20,marginTop:28,textAlign:"center" }}>
          <p style={{ color:CJ.muted,fontSize:14,marginBottom:12 }}>Rejoignez la communauté !</p>
          <BtnJ onClick={()=>setPage("connexion")}>Créer mon compte</BtnJ>
        </div>
      )}
    </div>
  );
};

// ── FORMULAIRE DE DÉFI ────────────────────────────────────────────────────────
const DefiForm = ({ joueur, cible, setPage }) => {
  const [mode, setMode] = useState("501");
  const [manches, setManches] = useState(1);
  const [loading, setLoading] = useState(false);
  const [amiStatut, setAmiStatut] = useState(null);

  const drixJoueur = joueur.drix || 1000;
  const drixCible = cible.drix || 1000;
  const { titre:titreJ, emoji:emojiJ, color:colorJ } = getDrixTitreLocal(drixJoueur);
  const { titre:titreC, emoji:emojiC, color:colorC } = getDrixTitreLocal(drixCible);

  const K  = 32 * Math.max(1, manches || 1);
  const EA = 1 / (1 + Math.pow(10, (drixCible - drixJoueur) / 400)); // P(joueur gagne)
  const EB = 1 - EA;                                                   // P(cible gagne)
  const gainVictoire = Math.round(K * EB); // victoire : gagne K × P(cible gagnait)
  const perteDéfaite = Math.round(K * EA); // défaite  : perd  K × P(joueur gagnait)

  useEffect(() => {
    sbJ(`amis?or=(and(joueur_id.eq.${joueur.id},ami_id.eq.${cible.id}),and(joueur_id.eq.${cible.id},ami_id.eq.${joueur.id}))&select=*`)
      .then(r => {
        const rel = (r||[]).find(a =>
          (a.joueur_id===joueur.id && a.ami_id===cible.id) ||
          (a.joueur_id===cible.id && a.ami_id===joueur.id)
        );
        setAmiStatut(rel?.statut || null);
      })
      .catch(() => {});
  }, [joueur.id, cible.id]);

  const envoyer = async () => {
    setLoading(true);
    const result = await dbJ.addDuel({
      challenger_id: joueur.id,
      challenger_pseudo: joueur.pseudo,
      defie_id: cible.id,
      defie_pseudo: cible.pseudo,
      statut: "accepte",
      mode, manches,
      date: Date.now(),
      valide_challenger: false,
      valide_defie: false,
      score_manches_challenger: 0,
      score_manches_defie: 0,
    });
    setLoading(false);
    const newDuel = Array.isArray(result) ? result[0] : result;
    if (newDuel?.id) setPage("scoreur-duel-" + newDuel.id);
  };

  const [ajoutAmiBusy, setAjoutAmiBusy] = useState(false);
  const ajouterAmi = async () => {
    if (ajoutAmiBusy || amiStatut) return;
    setAjoutAmiBusy(true);
    try {
      // 🔒 Vérif anti-doublon
      const existing = await sbJ(`amis?or=(and(joueur_id.eq.${joueur.id},ami_id.eq.${cible.id}),and(joueur_id.eq.${cible.id},ami_id.eq.${joueur.id}))&select=statut&limit=1`).catch(()=>null);
      if (existing && existing[0]) { setAmiStatut(existing[0].statut || "en_attente"); return; }
      await sbJ("amis", { method:"POST", body:JSON.stringify({ joueur_id:joueur.id, ami_id:cible.id, joueur_pseudo:joueur.pseudo, ami_pseudo:cible.pseudo, statut:"en_attente", date:Date.now() }) });
      setAmiStatut("en_attente");
      window.dpToast?.(`Demande envoyée à ${cible.pseudo}`, "success");
    } catch (e) {
      window.dpToast?.("Erreur lors de l'envoi", "error");
    } finally { setAjoutAmiBusy(false); }
  };

  return (
    <div style={{ background:CJ.card,border:`1px solid ${CJ.accent}44`,borderRadius:12,padding:18,marginTop:12 }}>
      <div style={{ display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:8,alignItems:"center",marginBottom:16,background:"#111",borderRadius:10,padding:12 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:11,color:CJ.muted,marginBottom:3 }}>{joueur.pseudo}</div>
          <div style={{ fontWeight:900,fontSize:20,color:colorJ }}>{drixJoueur}</div>
          <div style={{ fontSize:10,color:colorJ }}>{emojiJ} {titreJ}</div>
        </div>
        <div style={{ textAlign:"center",color:CJ.muted,fontSize:18,fontWeight:900 }}>⚔️</div>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:11,color:CJ.muted,marginBottom:3 }}>{cible.pseudo}</div>
          <div style={{ fontWeight:900,fontSize:20,color:colorC }}>{drixCible}</div>
          <div style={{ fontSize:10,color:colorC }}>{emojiC} {titreC}</div>
        </div>
      </div>

      <div style={{ display:"flex",gap:8,marginBottom:14 }}>
        <div style={{ flex:1,background:"#14532d33",border:`1px solid ${CJ.green}44`,borderRadius:8,padding:"8px 10px",textAlign:"center" }}>
          <div style={{ fontSize:11,color:CJ.muted }}>Si victoire</div>
          <div style={{ fontWeight:800,color:CJ.green,fontSize:15 }}>+{gainVictoire} DRIX</div>
        </div>
        <div style={{ flex:1,background:"#7f1d1d33",border:`1px solid ${CJ.red}44`,borderRadius:8,padding:"8px 10px",textAlign:"center" }}>
          <div style={{ fontSize:11,color:CJ.muted }}>Si défaite</div>
          <div style={{ fontWeight:800,color:CJ.red,fontSize:15 }}>-{perteDéfaite} DRIX</div>
        </div>
      </div>

      <h3 style={{ fontWeight:700,fontSize:15,marginBottom:12,color:CJ.accent }}>⚔️ Défier {cible.pseudo}</h3>

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:12,color:CJ.muted,display:"block",marginBottom:6 }}>Mode de jeu</label>
        <div style={{ display:"flex",gap:8 }}>
          {["501","301"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ flex:1,padding:"10px",borderRadius:8,border:"none",fontWeight:700,fontSize:16,cursor:"pointer",background:mode===m?CJ.accent:"#111",color:mode===m?"#fff":CJ.muted }}>{m}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:12,color:CJ.muted,display:"block",marginBottom:6 }}>Premier à ... manches</label>
        <div style={{ display:"flex",gap:6 }}>
          {[1,2,3,4,5].map(n=>(
            <button key={n} onClick={()=>setManches(n)} style={{ flex:1,padding:"10px 0",borderRadius:8,border:"none",fontWeight:800,fontSize:18,cursor:"pointer",background:manches===n?CJ.accent:"#111",color:manches===n?"#fff":CJ.muted }}>{n}</button>
          ))}
        </div>
      </div>

      <BtnJ onClick={envoyer} disabled={loading} style={{ width:"100%",fontSize:14 }}>
        {loading?"Chargement…":`⚔️ Jouer contre ${cible.pseudo} maintenant !`}
      </BtnJ>

      {/* Ajout ami */}
      <div style={{ marginTop:10, textAlign:"center" }}>
        {amiStatut===null && (
          <button onClick={ajouterAmi} disabled={ajoutAmiBusy} style={{ background:"transparent",border:`1px solid ${CJ.border}`,color:CJ.muted,borderRadius:8,padding:"8px 18px",fontSize:12,fontWeight:600,cursor:ajoutAmiBusy?"not-allowed":"pointer",touchAction:"manipulation",opacity:ajoutAmiBusy?.6:1 }}>
            {ajoutAmiBusy?"…":`👥 Ajouter ${cible.pseudo} en ami`}
          </button>
        )}
        {amiStatut==="en_attente" && <span style={{ fontSize:12,color:CJ.yellow }}>⏳ Demande d'ami envoyée</span>}
        {amiStatut==="accepte"    && <span style={{ fontSize:12,color:CJ.green }}>✅ Déjà ami(e)</span>}
      </div>
    </div>
  );
};

// ── SYSTÈME D'AMIS ────────────────────────────────────────────────────────────
const dbAmis = {
  getAmis: (id) => sbJ(`amis?or=(joueur_id.eq.${id},ami_id.eq.${id})&statut=eq.accepte&select=*`),
  getDemandesRecues: (id) => sbJ(`amis?ami_id=eq.${id}&statut=eq.en_attente&select=*`),
  accepterAmi: (id) => sbJ(`amis?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({ statut:"accepte" }), prefer:"return=minimal" }),
  refuserAmi: (id) => sbJ(`amis?id=eq.${id}`, { method:"DELETE", prefer:"return=minimal" }),
};

export const AmiSection = ({ joueur, setPage }) => {
  const [amis, setAmis] = useState([]);
  const [demandes, setDemandes] = useState([]);
  const [photosAmis, setPhotosAmis] = useState({});
  const [duels, setDuels] = useState([]);
  const [favoris, setFavoris] = useState(() => { try { return new Set(JSON.parse(localStorage.getItem(`dp_favamis_${joueur.id}`)||"[]")); } catch { return new Set(); } });
  const [tri, setTri] = useState("drix");      // nom|drix|ligue|matchs|victoires|defaites
  const [triOpen, setTriOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchAmis, setSearchAmis] = useState("");
  const [searchGlobal, setSearchGlobal] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    Promise.all([dbAmis.getAmis(joueur.id), dbAmis.getDemandesRecues(joueur.id), dbJ.getDuels(joueur.id)])
      .then(async ([a,d,du]) => {
        setAmis(a||[]); setDemandes(d||[]); setDuels((du||[]).filter(x=>x.statut==="termine"));
        const ids = (a||[]).map(x => x.joueur_id===joueur.id ? x.ami_id : x.joueur_id);
        if (ids.length > 0) {
          const profils = await sbJ(`joueurs?id=in.(${ids.join(",")})&select=id,photo,drix`).catch(()=>[]);
          const map = {};
          (profils||[]).forEach(p => { map[p.id] = p; });
          setPhotosAmis(map);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [joueur.id]);

  const toggleFav = (id, e) => { e?.stopPropagation?.(); setFavoris(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); try { localStorage.setItem(`dp_favamis_${joueur.id}`, JSON.stringify([...n])); } catch {} return n; }); };

  // Recherche globale debounced
  useEffect(() => {
    const q = searchAmis.trim();
    if (q.length < 2) { setSearchGlobal([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await sbJ(`joueurs?pseudo=ilike.*${encodeURIComponent(q)}*&select=id,pseudo,drix,photo&limit=10`);
        setSearchGlobal(Array.isArray(res) ? res : []);
      } catch { setSearchGlobal([]); }
      setSearchLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchAmis]);

  const accepter = async (d) => {
    try {
      await dbAmis.accepterAmi(d.id);
      setDemandes(x=>x.filter(x=>x.id!==d.id));
      setAmis(x=>[...x,{...d,statut:"accepte"}]);
      window.dpToast?.(`${d.joueur_pseudo || "Joueur"} ajouté à tes amis`, "success");
    } catch { window.dpToast?.("Erreur lors de l'acceptation", "error"); }
  };

  const refuser = async (d) => {
    try {
      await dbAmis.refuserAmi(d.id);
      setDemandes(x=>x.filter(x=>x.id!==d.id));
      window.dpToast?.("Demande refusée", "info");
    } catch { window.dpToast?.("Erreur lors du refus", "error"); }
  };

  if (loading) return <SpinnerJ/>;

  const monDrix = joueur.drix || 1000;
  const amisIds = new Set(amis.map(a => a.joueur_id===joueur.id ? a.ami_id : a.joueur_id));

  // Confrontations : matchs / victoires / défaites contre chaque adversaire
  const matchups = {};
  duels.forEach(d => {
    const oppId = d.challenger_id===joueur.id ? d.defie_id : d.challenger_id;
    if (!matchups[oppId]) matchups[oppId] = { m:0, w:0, l:0 };
    matchups[oppId].m++;
    if (d.gagnant_id===joueur.id) matchups[oppId].w++; else matchups[oppId].l++;
  });

  // Amis enrichis (drix, ligue, confrontations, favori, écart)
  const amisEnrichis = amis.map(a => {
    const id = a.joueur_id===joueur.id ? a.ami_id : a.joueur_id;
    const pseudo = a.joueur_id===joueur.id ? a.ami_pseudo : a.joueur_pseudo;
    const profil = photosAmis[id] || {};
    const drix = profil.drix || 1000;
    const mu = matchups[id] || { m:0, w:0, l:0 };
    return { key:a.id, id, pseudo:pseudo||"Joueur", photo:profil.photo||null, drix, mu, fav:favoris.has(id), rang:getDrixTitreLocal(drix), diff:drix-monDrix };
  });
  // Rival principal = ami le plus affronté (au moins 3 matchs)
  const topRival = amisEnrichis.reduce((r,x)=> x.mu.m>(r?.mu.m||0) ? x : r, null);
  const rivalKey = (topRival && topRival.mu.m>=3) ? topRival.id : null;

  const TRI_LABELS = { nom:"Nom", drix:"DRIX", ligue:"Ligue", matchs:"Matchs", victoires:"Victoires", defaites:"Défaites" };
  const cmp = ({
    nom:       (a,b)=> a.pseudo.localeCompare(b.pseudo,"fr",{sensitivity:"base"}),
    drix:      (a,b)=> b.drix-a.drix,
    ligue:     (a,b)=> b.drix-a.drix,
    matchs:    (a,b)=> b.mu.m-a.mu.m || b.drix-a.drix,
    victoires: (a,b)=> b.mu.w-a.mu.w || b.drix-a.drix,
    defaites:  (a,b)=> b.mu.l-a.mu.l || b.drix-a.drix,
  })[tri] || ((a,b)=>b.drix-a.drix);

  const q = searchAmis.trim().toLowerCase();
  const amisFiltres = (q ? amisEnrichis.filter(a=>a.pseudo.toLowerCase().includes(q)) : amisEnrichis)
    .slice().sort((a,b) => (b.fav?1:0)-(a.fav?1:0) || cmp(a,b));   // favoris toujours en premier
  const nonAmis = searchGlobal.filter(p => p.id !== joueur.id && !amisIds.has(p.id));

  // Récap
  const avgDrix   = amisEnrichis.length ? Math.round(amisEnrichis.reduce((s,a)=>s+a.drix,0)/amisEnrichis.length) : 0;
  const ligueMoy  = getDrixTitreLocal(avgDrix);
  const totalConfr= amisEnrichis.reduce((s,a)=>s+a.mu.m,0);

  return (
    <div>
      {demandes.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <h3 style={{ fontWeight:700,fontSize:15,marginBottom:12,color:CJ.text,display:"flex",alignItems:"center",gap:6 }}><Users size={15} color={CJ.yellow}/> Demandes d'amis ({demandes.length})</h3>
          {demandes.map(d=>(
            <div key={d.id} style={{ background:CJ.card,border:`1px solid ${CJ.yellow}44`,borderRadius:10,padding:14,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
              <span style={{ fontWeight:600,display:"flex",alignItems:"center",gap:6 }}><User size={14} color={CJ.muted}/>{d.joueur_pseudo}</span>
              <div style={{ display:"flex",gap:6 }}>
                <BtnJ variant="success" onClick={()=>accepter(d)} style={{ fontSize:12,padding:"6px 12px",display:"flex",alignItems:"center",gap:4 }}><Check size={13}/>Accepter</BtnJ>
                <BtnJ variant="danger" onClick={()=>refuser(d)} style={{ fontSize:12,padding:"6px 12px",display:"flex",alignItems:"center",gap:4 }}><X size={13}/>Refuser</BtnJ>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes dpFadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .ami-card { transition: transform .15s ease, box-shadow .2s ease, border-color .2s ease; }
        .ami-card:hover { transform: translateY(-2px); }
        .ami-card:active { transform: scale(.985); }
      `}</style>

      <h3 style={{ fontWeight:900,fontSize:16,marginBottom:12,color:CJ.text,display:"flex",alignItems:"center",gap:7 }}><Users size={17} color={CJ.accent}/> Mes amis ({amis.length})</h3>

      {/* ── Bandeau récap ── */}
      {amisEnrichis.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
          {[
            { v:amis.length,      l:"Amis",      c:CJ.accent },
            { v:avgDrix,          l:"DRIX moy.", c:CJ.blue },
            { v:ligueMoy.titre,   l:"Ligue moy.",c:ligueMoy.color, small:true },
            { v:totalConfr,       l:"Matchs",    c:CJ.green },
          ].map((s,i)=>(
            <div key={i} style={{ background:"#16161c", border:`1px solid ${s.c}33`, borderRadius:12, padding:"10px 5px", textAlign:"center", boxShadow:"0 2px 8px #00000030", animation:"dpFadeUp .4s ease both", animationDelay:`${(i*0.04).toFixed(2)}s` }}>
              <div style={{ fontSize:s.small?12.5:19, fontWeight:900, color:s.c, lineHeight:1.15, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{s.v}</div>
              <div style={{ fontSize:9.5, color:CJ.muted, fontWeight:600, marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recherche + Tri ── */}
      <div style={{ display:"flex", gap:8, marginBottom:14 }}>
        <div style={{ flex:1, display:"flex", alignItems:"center", gap:8, background:CJ.bg, border:`1px solid ${CJ.border}`, borderRadius:10, padding:"10px 14px", minWidth:0 }}>
          <Search size={15} color={CJ.muted} style={{ flexShrink:0 }}/>
          <input value={searchAmis} onChange={e=>{ setSearchAmis(e.target.value); setSearchGlobal([]); setSearchLoading(false); }}
            placeholder="Rechercher un joueur…" style={{ flex:1,background:"transparent",border:"none",color:CJ.text,fontSize:16,outline:"none",minWidth:0 }}/>
          {searchAmis && <button onClick={()=>{ setSearchAmis(""); setSearchGlobal([]); }} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",padding:0,lineHeight:1,display:"flex" }}><X size={14}/></button>}
        </div>
        <div style={{ position:"relative", flexShrink:0 }}>
          <button onClick={()=>setTriOpen(o=>!o)} style={{ height:"100%", display:"flex", alignItems:"center", gap:5, background:CJ.bg, border:`1px solid ${triOpen?CJ.accent:CJ.border}`, borderRadius:10, padding:"0 12px", color:CJ.text, fontWeight:800, fontSize:12.5, cursor:"pointer", whiteSpace:"nowrap", touchAction:"manipulation" }}>
            <span style={{ color:CJ.accent, fontSize:14 }}>⇅</span>{TRI_LABELS[tri]}
          </button>
          {triOpen && (
            <div style={{ position:"absolute", top:"calc(100% + 6px)", right:0, zIndex:30, background:"#16161c", border:`1px solid ${CJ.border}`, borderRadius:12, padding:6, minWidth:160, boxShadow:"0 10px 28px #000b" }}>
              {Object.entries(TRI_LABELS).map(([k,l])=>(
                <button key={k} onClick={()=>{ setTri(k); setTriOpen(false); }} style={{ display:"block", width:"100%", textAlign:"left", background:tri===k?`${CJ.accent}1e`:"none", border:"none", color:tri===k?CJ.accent:CJ.text, borderRadius:8, padding:"9px 11px", fontSize:13, fontWeight:tri===k?800:600, cursor:"pointer", touchAction:"manipulation" }}>{l}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Cartes amis ── */}
      {amis.length === 0 && !q ? (
        <p style={{ color:CJ.muted,fontSize:13 }}>Aucun ami pour l'instant. Recherche un joueur ci-dessus pour l'ajouter !</p>
      ) : amisFiltres.length > 0 ? (
        <div style={{ marginBottom:nonAmis.length>0?16:0 }}>
          {q && <div style={{ fontSize:12,color:CJ.muted,fontWeight:700,letterSpacing:.5,marginBottom:6 }}>AMIS</div>}
          {amisFiltres.map((a, idx) => {
            const rang = a.rang;
            const isRival = a.id === rivalKey;
            const isClose = Math.abs(a.diff) <= 100 && a.diff !== 0;
            const bCol = a.fav ? CJ.yellow : isRival ? CJ.red : isClose ? CJ.blue : `${CJ.border}`;
            const glow = a.fav ? `0 0 16px ${CJ.yellow}26` : isRival ? `0 0 14px ${CJ.red}22` : isClose ? `0 0 12px ${CJ.blue}1c` : "none";
            return (
              <div key={a.key} className="ami-card" onClick={()=>setPage("profil-joueur-"+a.id)}
                style={{ position:"relative", overflow:"hidden", background:"#16161c", border:`1.5px solid ${bCol}`, borderRadius:16, padding:"12px 14px", marginBottom:9, cursor:"pointer", boxShadow:`0 3px 12px #00000035${glow!=="none"?", "+glow:""}`, animation:"dpFadeUp .4s ease both", animationDelay:`${Math.min(idx*0.03,0.3).toFixed(2)}s` }}>
                <div aria-hidden style={{ position:"absolute", top:-30, right:-25, width:120, height:120, borderRadius:"50%", background:`radial-gradient(circle, ${rang.color}18 0%, transparent 65%)`, pointerEvents:"none" }}/>
                <div style={{ display:"flex", alignItems:"center", gap:13, position:"relative" }}>
                  {/* Avatar */}
                  <div style={{ width:54, height:54, borderRadius:"50%", overflow:"hidden", flexShrink:0, border:`2.5px solid ${rang.color}`, background:`${rang.color}22`, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:`0 0 12px ${rang.color}44` }}>
                    {a.photo ? <img src={a.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <RankIcon drix={a.drix} size={24}/>}
                  </div>
                  {/* Infos */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontWeight:800, fontSize:16, color:CJ.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.pseudo}</span>
                      {isRival && <span style={{ flexShrink:0, fontSize:8.5, fontWeight:900, color:CJ.red, background:`${CJ.red}1e`, border:`1px solid ${CJ.red}55`, borderRadius:5, padding:"1px 5px", letterSpacing:.5 }}>RIVAL</span>}
                    </div>
                    <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:4, background:`${rang.color}18`, border:`1px solid ${rang.color}44`, borderRadius:6, padding:"2px 7px" }}>
                      <RankIcon drix={a.drix} size={11}/>
                      <span style={{ fontSize:10.5, fontWeight:800, color:rang.color }}>{rang.titre}</span>
                    </div>
                    {a.mu.m>0 && (
                      <div style={{ fontSize:11, color:CJ.muted, marginTop:5, display:"flex", alignItems:"center", gap:7 }}>
                        <span style={{ fontWeight:700, color:CJ.text }}>{a.mu.m} match{a.mu.m>1?"s":""}</span>
                        <span style={{ color:CJ.green, fontWeight:800 }}>{a.mu.w} V</span>
                        <span style={{ color:"#475569" }}>•</span>
                        <span style={{ color:CJ.red, fontWeight:800 }}>{a.mu.l} D</span>
                      </div>
                    )}
                  </div>
                  {/* DRIX + écart + favori */}
                  <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:1 }}>
                    <button onClick={(e)=>toggleFav(a.id, e)} title={a.fav?"Retirer des favoris":"Ajouter aux favoris"}
                      style={{ background:"none", border:"none", cursor:"pointer", fontSize:17, padding:"0 0 2px", lineHeight:1, opacity:a.fav?1:.3, touchAction:"manipulation" }}>⭐</button>
                    <div style={{ fontSize:23, fontWeight:900, color:rang.color, lineHeight:1 }}>{a.drix}</div>
                    <div style={{ fontSize:9, color:CJ.muted, fontWeight:700, letterSpacing:.5 }}>DRIX</div>
                    {a.diff!==0 && <div style={{ fontSize:11.5, fontWeight:900, color:a.diff>0?CJ.accent:CJ.green, marginTop:1 }}>{a.diff>0?`▲ +${a.diff}`:`▼ ${a.diff}`}</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : q ? (
        <p style={{ color:CJ.muted,fontSize:13,textAlign:"center",padding:"8px 0 4px" }}>Aucun ami pour « {searchAmis} »</p>
      ) : null}

      {/* ── Résultats globaux (non-amis) ── */}
      {nonAmis.length > 0 && (
        <div>
          <div style={{ fontSize:12,color:CJ.muted,fontWeight:700,letterSpacing:.5,marginBottom:6 }}>AUTRES JOUEURS</div>
          {nonAmis.map(p => {
            const { color } = getDrixTitreLocal(p.drix||1000);
            return (
              <div key={p.id} onClick={()=>setPage("profil-joueur-"+p.id)}
                style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:10,padding:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=CJ.blue} onMouseLeave={e=>e.currentTarget.style.borderColor=CJ.border}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:40,height:40,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:`2px solid ${color}44`,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {p.photo ? <img src={p.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <RankIcon drix={p.drix||1000} size={18}/>}
                  </div>
                  <div>
                    <div style={{ fontWeight:600 }}>{p.pseudo}</div>
                    <div style={{ fontSize:12,color,fontWeight:600,display:"flex",alignItems:"center",gap:4 }}><RankIcon drix={p.drix||1000} size={13}/> {p.drix||1000} DRIX</div>
                  </div>
                </div>
                <div style={{ textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2 }}>
                  <ChevronRight size={16} color={CJ.blue}/>
                  <div style={{ fontSize:11,color:CJ.muted }}>+ demande d'ami</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {searchLoading && <p style={{ color:CJ.muted,fontSize:13,textAlign:"center",padding:"8px 0" }}>Recherche…</p>}
    </div>
  );
};

// ── FICHE JOUEUR PUBLIC ───────────────────────────────────────────────────────
// Couleur d'une valeur selon son niveau (vert = bon, orange = moyen, rouge = faible).
// invert=true pour les métriques où « moins c'est mieux » (ex. déchets).
const statColor = (v, good, mid, invert=false) => {
  if (v==null) return "#94a3b8";
  return invert ? (v<=good ? "#22c55e" : v<=mid ? "#f59e0b" : "#ef4444")
                : (v>=good ? "#22c55e" : v>=mid ? "#f59e0b" : "#ef4444");
};
// Construit les lignes « Stats de jeu réelles » (icône Lucide, libellé, valeur, sous-texte, couleur).
// Partagé entre la fiche adversaire et l'analyse « soi-même » pour rester cohérent.
export const buildStatsReelles = (A) => [
  { icon:Target,    label:"Moyenne réelle",  value:A.avgReel!=null?`${A.avgReel} pts`:"—",      color:statColor(A.avgReel,52,42) },
  { icon:Crosshair, label:"Checkout",        value:A.checkoutPct!=null?`${A.checkoutPct}%`:"—", sub:A.checkoutPct!=null?`${A.coWon} / ${A.coAttempts}`:null, color:statColor(A.checkoutPct,45,30) },
  { icon:Flame,     label:"Volées 100+",     value:A.tonRate!=null?`${A.tonRate}%`:"—",         color:statColor(A.tonRate,25,12) },
  { icon:Zap,       label:"Maximums (180)",  value:`${A.n180}`, sub:`${A.rate180} / manche`,    color:A.n180>0?"#f59e0b":"#94a3b8" },
  { icon:BarChart2, label:"Régularité",      value:A.regularite!=null?`${A.regularite}`:"—", sub:A.regularite!=null?"/ 100":null, color:statColor(A.regularite,60,40) },
  { icon:Skull,     label:"Déchets (≤26)",   value:A.dechetRate!=null?`${A.dechetRate}%`:"—",   color:statColor(A.dechetRate,8,14,true) },
  { icon:ArrowUp,   label:"1ʳᵉ manche",      value:A.firstLegPct!=null?`${A.firstLegPct}%`:"—", sub:A.firstLegPct!=null?"gagnées":null, color:statColor(A.firstLegPct,55,42) },
  { icon:Trophy,    label:"Manche décisive", value:A.deciderPct!=null?`${A.deciderPct}%`:"—", sub:A.deciderPct!=null?"gagnées":null, color:statColor(A.deciderPct,55,42) },
  { icon:Crown,     label:"Meilleur finish", value:A.bestFinish>0?`${A.bestFinish}`:"—", sub:A.bestFinish>0?"record":null, color:A.bestFinish>0?"#fbbf24":"#94a3b8", record:A.bestFinish>0 },
  { icon:Swords,    label:"Manches gagnées", value:`${A.legsWon}`, sub:`/ ${A.totalLegs}`,      color:"#e2e8f0" },
];

// Titre de section avec icône SVG Lucide (conforme MASTER §11 : pas d'emoji en icône d'UI).
const SecLabel = ({ icon:Icon, color, children, style }) => (
  <div style={{ fontSize:10, color:CJ.muted, fontWeight:700, letterSpacing:1, marginBottom:8, display:"flex", alignItems:"center", gap:6, ...style }}>
    <Icon size={13} color={color||CJ.muted} strokeWidth={2.5}/>
    <span>{children}</span>
  </div>
);

export const FicheJoueur = ({ joueurId, joueur:moi, bars, associations, setPage, setBarSlug }) => {

  // Respect du réglage système « réduire les animations »
  const reduceMotion = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── SVG helpers ──────────────────────────────────────────────────────────────
  const CircleGauge = ({ value, max=100, color, size=90, strokeWidth=9 }) => {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const fill = Math.min(1, value / max) * circ;
    const off  = circ - fill;
    return (
      <svg width={size} height={size} style={{ display:"block" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ffffff10" strokeWidth={strokeWidth}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={reduceMotion ? off : circ} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={reduceMotion ? undefined : { ["--dp-circ"]: circ, ["--dp-off"]: off, animation:"dpDraw 1.1s ease forwards" }}/>
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
          style={{ fill:"#f1f5f9", fontWeight:900, fontSize:size*0.24 }}>{value}</text>
        <text x={size/2} y={size/2+size*0.22} textAnchor="middle" dominantBaseline="middle"
          style={{ fill:"#94a3b8", fontWeight:400, fontSize:size*0.13 }}>/{max}</text>
      </svg>
    );
  };


  const VDBadge = ({ gagne, size=30 }) => (
    <div style={{ width:size, height:size, borderRadius:"50%", background:gagne?"#16a34a":"#dc2626", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:size*0.42, color:"#fff", flexShrink:0 }}>
      {gagne?"V":"D"}
    </div>
  );

  // ── State ─────────────────────────────────────────────────────────────────────
  const [j, setJ]               = useState(null);
  const [stats, setStats]       = useState(null);
  const [duels, setDuels]       = useState([]);
  const [drixMvts, setDrixMvts] = useState([]);
  const [classement, setClassement] = useState(null);
  const [mesStats, setMesStats] = useState(null);
  const [mesDuels, setMesDuels] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [amiStatut, setAmiStatut] = useState(null);
  const [tab, setTab]           = useState("analyse");
  const [expandedDuel, setExpandedDuel] = useState(null);
  const [showDefi, setShowDefi] = useState(false);
  const [defiForm, setDefiForm] = useState({ mode:"501", manches:1, type:"classe" });
  const [sending, setSending]   = useState(false);
  const [classementMoi, setClassementMoi] = useState(null);
  // 🆕 Données pour calcul badges complets
  const [jAmis, setJAmis] = useState([]);
  const [jNbTournois, setJNbTournois] = useState(0);
  const [jNbTournoisGagnes, setJNbTournoisGagnes] = useState(0);

  // ── Chargement données ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!joueurId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      dbJ.getJoueur(joueurId),
      dbJ.getStats(joueurId),
      dbJ.getDuels(joueurId),
      sbJ(`drix_mouvements?joueur_id=eq.${joueurId}&order=date.desc&limit=200&select=*`).catch(()=>[]),
      sbJ(`joueurs?order=drix.desc&select=id`).catch(()=>[]),
      moi ? dbJ.getStats(moi.id) : Promise.resolve(null),
      moi ? dbJ.getDuels(moi.id) : Promise.resolve(null),
      // 🆕 Données pour calcul correct des badges (amis, tournois)
      sbJ(`amis?or=(joueur_id.eq.${joueurId},ami_id.eq.${joueurId})&select=statut`).catch(()=>[]),
      sbJ(`tournois_potes_joueurs?joueur_id=eq.${joueurId}&select=tournoi_id`).catch(()=>[]),
      sbJ(`tournois_potes?gagnant_id=eq.${joueurId}&select=id`).catch(()=>[]),
    ]).then(([jd, s, d, mvts, allJ, ms, md, jAmis, jTrn, jWtrn]) => {
      setJ(jd);
      setStats(s);
      const termines = (d||[]).filter(x => x.statut==="termine").sort((a,b)=>(b.date||0)-(a.date||0));
      setDuels(termines);
      setDrixMvts(mvts||[]);
      setJAmis(jAmis||[]);
      setJNbTournois((jTrn||[]).length);
      setJNbTournoisGagnes((jWtrn||[]).length);
      if (allJ?.length) {
        const pos = allJ.findIndex(x => x.id === joueurId);
        setClassement({ position: pos >= 0 ? pos+1 : null, total: allJ.length });
        if (moi) {
          const posMe = allJ.findIndex(x => x.id === moi.id);
          setClassementMoi({ position: posMe >= 0 ? posMe+1 : null, total: allJ.length });
        }
      }
      setMesStats(ms);
      setMesDuels((md||[]).filter(x => x.statut==="termine").sort((a,b)=>(b.date||0)-(a.date||0)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [joueurId]);

  useEffect(() => {
    if (!moi || !joueurId || moi.id === joueurId) return;
    sbJ(`amis?or=(and(joueur_id.eq.${moi.id},ami_id.eq.${joueurId}),and(joueur_id.eq.${joueurId},ami_id.eq.${moi.id}))&select=*`)
      .then(r => {
        const rel = (r||[]).find(a =>
          (a.joueur_id===moi.id && a.ami_id===joueurId) ||
          (a.joueur_id===joueurId && a.ami_id===moi.id)
        );
        setAmiStatut(rel?.statut || null);
      }).catch(()=>{});
  }, [moi?.id, joueurId]);

  const [ajoutBusy, setAjoutBusy] = useState(false);
  const ajouterAmi = async () => {
    if (!moi || !j || ajoutBusy || amiStatut) return;
    setAjoutBusy(true);
    try {
      // 🔒 Vérif anti-doublon : refresh côté serveur juste avant l'insert
      const existing = await sbJ(`amis?or=(and(joueur_id.eq.${moi.id},ami_id.eq.${j.id}),and(joueur_id.eq.${j.id},ami_id.eq.${moi.id}))&select=statut&limit=1`).catch(()=>null);
      if (existing && existing[0]) {
        setAmiStatut(existing[0].statut || "en_attente");
        return;
      }
      await sbJ("amis", { method:"POST", body:JSON.stringify({ joueur_id:moi.id, ami_id:j.id, joueur_pseudo:moi.pseudo, ami_pseudo:j.pseudo, statut:"en_attente", date:Date.now() }) });
      setAmiStatut("en_attente");
      window.dpToast?.(`Demande envoyée à ${j.pseudo}`, "success");
    } catch (e) {
      window.dpToast?.("Erreur lors de l'envoi de la demande", "error");
    } finally { setAjoutBusy(false); }
  };

  if (loading) return <SpinnerJ/>;
  if (!j) return <div style={{ textAlign:"center",padding:60,color:CJ.muted }}>Joueur introuvable</div>;

  // ── Calculs ───────────────────────────────────────────────────────────────────
  const bar  = bars.find(b => b.slug === j.bar_slug);
  const asso = associations.find(a => a.slug === j.asso_slug);
  const drix = j.drix || 1000;
  const { titre, emoji, color } = getDrixTitreLocal(drix);
  const winRate = stats?.parties > 0 ? Math.round((stats.victoires/stats.parties)*100) : 0;
  const monDrix = moi?.drix || 1000;
  const ecartDrix = drix - monDrix;

  const getScores = (list, id) => list
    .map(d => parseFloat(d.challenger_id===id ? d.score_challenger : d.score_defie))
    .filter(s => !isNaN(s) && s > 0);
  const moyAll = getScores(duels, joueurId);
  const moyenneDuels = moyAll.length > 0 ? (moyAll.reduce((a,b)=>a+b,0)/moyAll.length).toFixed(1) : null;

  let nb180=0, plusGrosFinish=0;
  // Fléchettes lancées : compte EXACT quand la manche le stocke (`winner_flech`, matchs récents),
  // sinon volées × 3 — juste sauf sur la dernière volée d'une manche. D'où la mention « environ ».
  let flechettesJ = 0, flechJExactes = true;
  duels.forEach(d => {
    (d.manches_detail||[]).forEach(m => {
      // Gère le changement de pseudo : comparer au pseudo stocké dans le duel au moment de la partie
      const isChallenger = d.challenger_id === joueurId;
      const myPseudoAtTime = isChallenger ? (d.challenger_pseudo || j.pseudo) : (d.defie_pseudo || j.pseudo);
      const isW = m.winner === myPseudoAtTime || m.winner === j.pseudo;
      nb180 += isW ? (m.winner_180||0) : (m.loser_180||0);
      if (isW) plusGrosFinish = Math.max(plusGrosFinish, m.winner_finish||0);
      const fl = isW ? m.winner_flech : m.loser_flech;
      if (fl != null) flechettesJ += fl;
      else { flechettesJ += (isW ? (m.winner_volees||0) : (m.loser_volees||0)) * 3; flechJExactes = false; }
    });
  });

  let serieActuelle = 0, serieType = null;
  for (const d of duels) {
    const gagne = d.gagnant_id === joueurId;
    if (serieType === null) { serieType = gagne?"win":"loss"; serieActuelle = 1; }
    else if ((gagne && serieType==="win") || (!gagne && serieType==="loss")) serieActuelle++;
    else break;
  }

  // Forme
  const derniers10 = duels.slice(0, 10);
  const victoires10 = derniers10.filter(d => d.gagnant_id === joueurId).length;
  const formePct = derniers10.length > 0 ? victoires10 / derniers10.length : 0;
  const scores10 = getScores(derniers10, joueurId);
  const moy10 = scores10.length > 0 ? scores10.reduce((a,b)=>a+b,0)/scores10.length : null;
  const deltaScoring = moy10 && moyenneDuels ? Math.round((moy10 - parseFloat(moyenneDuels)) / parseFloat(moyenneDuels) * 100) : null;
  const formeLabel = formePct >= 0.7 ? "🔥 Très en forme" : formePct >= 0.5 ? "✅ En forme" : formePct >= 0.3 ? "😐 Forme moyenne" : "📉 En difficulté";
  const formeColor = formePct >= 0.7 ? "#22c55e" : formePct >= 0.5 ? "#60a5fa" : formePct >= 0.3 ? "#f59e0b" : "#ef4444";

  // ── ANALYSE FINE DES MANCHES (depuis manches_detail) ───────────────────────────
  // Parcourt chaque leg de chaque duel pour le joueur ciblé et agrège des métriques
  // réelles : moyenne pondérée, % de checkout, scoring 100+/180, régularité (écart-type),
  // déchets (volées à 26), 1ʳᵉ manche gagnée et manches décisives (clutch).
  const A = (() => {
    let legsWon=0, legsLost=0, legVol=0, sumMoyW=0, volMoy=0;
    let n180=0, n140=0, n100=0, n26=0, coAttempts=0, coWon=0;
    const legMoys=[]; const finishes=[];
    let firstPlayed=0, firstWon=0, decPlayed=0, decWon=0;
    for (const d of duels) {
      const isChal = d.challenger_id === joueurId;
      const myP = isChal ? (d.challenger_pseudo || j.pseudo) : (d.defie_pseudo || j.pseudo);
      const md = d.manches_detail || [];
      md.forEach(m => {
        const isW = m.winner === myP || m.winner === j.pseudo;
        const vol = (isW ? m.winner_volees : m.loser_volees) || 0;
        const moy = (isW ? m.winner_moy    : m.loser_moy)    || 0;
        if (isW) legsWon++; else legsLost++;
        if (moy>0){ legMoys.push(moy); sumMoyW += moy*Math.max(1,vol); volMoy += Math.max(1,vol); }
        legVol += vol;
        n180 += (isW?m.winner_180:m.loser_180)||0;
        n140 += (isW?m.winner_140plus:m.loser_140plus)||0;
        n100 += (isW?m.winner_100plus:m.loser_100plus)||0;
        n26  += (isW?m.winner_26:m.loser_26)||0;
        const coAtt = (isW?m.winner_checkout_attempts:m.loser_checkout_attempts)||0; coAttempts += coAtt;
        // Checkout % = manches gagnées AVEC tentative / total tentatives (même population que PageProfilStats).
        if (isW){ if (coAtt>0) coWon++; if ((m.winner_finish||0)>0) finishes.push(m.winner_finish); }
      });
      if (md.length>=1){ firstPlayed++; const f=md[0]; if (f.winner===myP||f.winner===j.pseudo) firstWon++; }
      if (md.length>=3){ decPlayed++; const last=md[md.length-1]; if (last.winner===myP||last.winner===j.pseudo) decWon++; }
    }
    const totalLegs = legsWon+legsLost;
    const avgReel = volMoy>0 ? Math.round(sumMoyW/volMoy) : (moyenneDuels?Math.round(parseFloat(moyenneDuels)):null);
    const checkoutPct = coAttempts>0 ? Math.round(coWon/coAttempts*100) : null;
    const tonPlus = n180+n140+n100;
    const tonRate = legVol>0 ? Math.round(tonPlus/legVol*100) : null;
    const rate180 = totalLegs>0 ? +(n180/totalLegs).toFixed(2) : 0;
    const mean = legMoys.length ? legMoys.reduce((a,b)=>a+b,0)/legMoys.length : 0;
    const stdev = legMoys.length>1 ? Math.sqrt(legMoys.map(x=>(x-mean)**2).reduce((a,b)=>a+b,0)/legMoys.length) : null;
    const regularite = stdev==null ? null : Math.max(0,Math.min(100,Math.round(100-stdev*4)));
    const dechetRate = legVol>0 ? Math.round(n26/legVol*100) : null;
    const firstLegPct = firstPlayed>=4 ? Math.round(firstWon/firstPlayed*100) : null;
    const deciderPct  = decPlayed>=3  ? Math.round(decWon/decPlayed*100)    : null;
    const bestFinish  = finishes.length ? Math.max(...finishes) : 0;
    return { totalLegs, legsWon, legsLost, avgReel, checkoutPct, coAttempts, coWon, n180, tonRate, rate180,
             regularite, stdev, dechetRate, firstLegPct, firstPlayed, firstWon, deciderPct, decPlayed, decWon, bestFinish };
  })();

  // Dangerosité — composite des signaux réels (max 100)
  const dangerScore = Math.min(100, Math.round(
      (winRate*0.30) +
      (formePct*20) +
      Math.min(20, Math.max(0,(drix-900)/50)) +
      (A.avgReel!=null ? Math.min(15, Math.max(0,(A.avgReel-30)/3)) : 0) +
      (A.checkoutPct!=null ? Math.min(10, A.checkoutPct/10) : 0) +
      Math.min(5, A.n180)
  ));
  const dangerColor = dangerScore>=75?"#ef4444":dangerScore>=50?"#f97316":dangerScore>=25?"#f59e0b":"#22c55e";
  const dangerLabel = dangerScore>=75?"Joueur dangereux":dangerScore>=50?"Adversaire solide":dangerScore>=30?"À surveiller":"Accessible";
  // Ce qui porte sa dangerosité (driver principal)
  const dangerDriver =
      (A.checkoutPct!=null && A.checkoutPct>=45) ? `porté par son checkout (${A.checkoutPct}%)` :
      (A.avgReel!=null && A.avgReel>=52)         ? `porté par son scoring (moy ${A.avgReel})` :
      (winRate>=58)                              ? `porté par son taux de victoire (${winRate}%)` :
      (formePct>=0.6)                            ? `porté par sa forme du moment` :
      (dangerScore<30)                           ? `profil encore tendre, à ta portée` : `profil équilibré`;

  // Tendance DRIX
  const now = Date.now();
  const var7j = drixMvts.filter(m=>(now-(m.date||0))<7*86400000).reduce((s,m)=>s+(m.variation||0),0);

  // Style de joueur — déduit des métriques réelles agrégées
  const styleJoueur = (() => {
    if (A.checkoutPct!=null && A.checkoutPct>=50 && winRate>=52) return {label:"Le Finisher",desc:`Tueur au checkout (${A.checkoutPct}%), capitalise chaque ouverture`,emoji:"🎯"};
    if (A.avgReel!=null && A.avgReel>=55 && A.n180>=5)           return {label:"Le Bulldozer",desc:`Scoring lourd (moy ${A.avgReel}, ${A.n180}×180), passe en force`,emoji:"💣"};
    if (A.regularite!=null && A.regularite>=65 && winRate>=48)   return {label:"Le Métronome",desc:`Très constant (régularité ${A.regularite}/100), dur à surprendre`,emoji:"⚙️"};
    if (A.deciderPct!=null && A.deciderPct>=55)                  return {label:"Le Clutch",desc:`Hausse son niveau dans les manches décisives (${A.deciderPct}%)`,emoji:"🧊"};
    if (winRate>=60 && (stats?.parties||0)>=20)                 return {label:"Le Champion",desc:`Palmarès solide : ${winRate}% sur ${stats.parties} matchs`,emoji:"🏆"};
    if (A.dechetRate!=null && A.dechetRate>=14)                 return {label:"Le Flambeur",desc:`Explosif mais irrégulier (${A.dechetRate}% de volées faibles)`,emoji:"🎲"};
    if (winRate<40)                                            return {label:"En reconstruction",desc:`Cherche encore son rythme (${winRate}% de victoires)`,emoji:"🌱"};
    if (serieType==="win"&&serieActuelle>=3)                    return {label:"En feu",desc:`Série de ${serieActuelle} victoires en cours`,emoji:"🔥"};
    return {label:"Le Combattant",desc:"Polyvalent, s'accroche dans tous les matchs",emoji:"⚔️"};
  })();

  // Point fort — meilleure métrique réelle du joueur
  const pointFortObj = (() => {
    const forces = [
      A.checkoutPct!=null && A.checkoutPct>=45 ? {k:"Finishing",  detail:`${A.checkoutPct}% au checkout (${A.coWon}/${A.coAttempts} converties)`, emoji:"🎯", score:A.checkoutPct} : null,
      A.avgReel!=null     && A.avgReel>=50     ? {k:"Scoring",    detail:`Moyenne réelle de ${A.avgReel} pts/volée`,                            emoji:"💥", score:A.avgReel} : null,
      A.n180>=3                                ? {k:"Les 180",    detail:`${A.n180} maximums (${A.rate180}/manche)`,                            emoji:"🔥", score:50+A.n180} : null,
      A.regularite!=null  && A.regularite>=60  ? {k:"Régularité", detail:`Très constant — régularité ${A.regularite}/100`,                       emoji:"⚙️", score:A.regularite} : null,
      A.deciderPct!=null  && A.deciderPct>=55  ? {k:"Clutch",     detail:`${A.deciderPct}% de manches décisives gagnées`,                       emoji:"🧊", score:A.deciderPct} : null,
      winRate>=58                              ? {k:"Win rate",   detail:`${winRate}% de victoires sur ${stats?.parties||0} matchs`,             emoji:"🏆", score:winRate} : null,
    ].filter(Boolean).sort((a,b)=>b.score-a.score);
    return forces[0] || {k:"En construction", detail:"Pas encore assez de matchs pour dégager une force nette", emoji:"🌱"};
  })();

  // Point faible — pire métrique réelle (carte analyse)
  const pointFaibleAnalyse = (() => {
    const faib = [
      A.checkoutPct!=null && A.checkoutPct<35 && A.coAttempts>=6 ? {k:"Finishing",         detail:`${A.checkoutPct}% au checkout — laisse filer des manches gagnables`, emoji:"🛡️", score:100-A.checkoutPct} : null,
      A.dechetRate!=null  && A.dechetRate>=12                    ? {k:"Déchets",           detail:`${A.dechetRate}% de volées faibles (≤26) — trous de scoring`,       emoji:"🕳️", score:A.dechetRate} : null,
      A.regularite!=null  && A.regularite<40                     ? {k:"Irrégularité",      detail:`En dents de scie (écart-type ${Math.round(A.stdev)})`,              emoji:"🎢", score:100-A.regularite} : null,
      A.firstLegPct!=null && A.firstLegPct<40                    ? {k:"Entames",           detail:`Ne gagne que ${A.firstLegPct}% des 1ʳᵉˢ manches`,                  emoji:"🐢", score:100-A.firstLegPct} : null,
      A.deciderPct!=null  && A.deciderPct<40                     ? {k:"Manches décisives", detail:`${A.deciderPct}% en manche décisive — craque sous pression`,       emoji:"😰", score:100-A.deciderPct} : null,
      winRate<42                                                ? {k:"Taux de victoire",  detail:`${winRate}% seulement — résultats fragiles`,                       emoji:"📉", score:100-winRate} : null,
      formePct<0.4 && derniers10.length>=5                      ? {k:"Forme",             detail:`${victoires10}/${derniers10.length} récemment — en perte de vitesse`, emoji:"❄️", score:100-formePct*100} : null,
    ].filter(Boolean).sort((a,b)=>b.score-a.score);
    return faib[0] || {k:"Peu d'écueils", detail:"Profil équilibré, pas de faiblesse marquée", emoji:"✨"};
  })();

  // Début de match — taux de 1ʳᵉ manche gagnée (vraie entame)
  const debutFort = moyenneDuels && parseFloat(moyenneDuels) > 45;   // conservé pour la modal de défi
  const debutObj = A.firstLegPct!=null
    ? (A.firstLegPct>=55 ? {label:"Entame en force",   detail:`Gagne ${A.firstLegPct}% des 1ʳᵉˢ manches (${A.firstWon}/${A.firstPlayed})`, color:CJ.green,  emoji:"⚡"}
      : A.firstLegPct>=40 ? {label:"Entame équilibrée", detail:`${A.firstLegPct}% des 1ʳᵉˢ manches remportées`,                            color:CJ.yellow, emoji:"⚖️"}
      :                     {label:"Démarrage lent",   detail:`${A.firstLegPct}% des 1ʳᵉˢ manches — souvent mené au départ`,              color:CJ.red,    emoji:"🐢"})
    : (A.avgReel!=null
        ? {label: A.avgReel>=48?"Bon rythme":"Monte en régime", detail:`Moyenne ${A.avgReel} pts/volée — trop peu de matchs multi-manches pour juger l'entame`, color: A.avgReel>=48?CJ.green:CJ.yellow, emoji: A.avgReel>=48?"⚡":"😴"}
        : {label:"Données insuffisantes", detail:"Trop peu de matchs pour analyser les entames", color:CJ.muted, emoji:"❔"});
  // Fin de match — taux de manche décisive gagnée (clutch)
  const finObj = A.deciderPct!=null
    ? (A.deciderPct>=55 ? {label:"Glacé dans le money-time", detail:`${A.deciderPct}% de manches décisives gagnées (${A.decWon}/${A.decPlayed})`, color:CJ.green,  emoji:"🧊"}
      : A.deciderPct>=40 ? {label:"Correct sous pression",   detail:`${A.deciderPct}% dans les manches décisives`,                               color:CJ.yellow, emoji:"🛡"}
      :                    {label:"Craque dans le money-time", detail:`${A.deciderPct}% en manche décisive — perd les matchs serrés`,           color:CJ.red,    emoji:"📉"})
    : (A.checkoutPct!=null
        ? {label: A.checkoutPct>=40?"Finit ses matchs":"Fragile à la conclusion", detail:`Checkout ${A.checkoutPct}% — peu de matchs à rallonge pour juger le money-time`, color: A.checkoutPct>=40?CJ.green:CJ.yellow, emoji: A.checkoutPct>=40?"🛡":"😬"}
        : {label:"Données insuffisantes", detail:"Pas encore de manches décisives jouées", color:CJ.muted, emoji:"❔"});

  // Probabilité
  const probaVictoire = Math.round(Math.min(95,Math.max(5,( 1/(1+Math.pow(10,(drix-monDrix)/400)) )*100+(formePct<0.4?8:formePct>0.7?-8:0))));

  // Résultats 5 derniers matchs (pour badges V/D dans la modal défi)
  const resultats5 = duels.slice(0,5).map(d => d.gagnant_id===joueurId ? "V" : "D");
  const wins5 = resultats5.filter(r=>r==="V").length;
  const formeDefi = wins5>=4?"Très en forme":wins5>=3?"En forme":wins5>=2?"Stable":"En difficulté";
  const formeDefiColor = wins5>=4?"#22c55e":wins5>=3?"#60a5fa":wins5>=2?"#f59e0b":"#ef4444";

  // ELO gain/perte ajusté selon le nombre de manches
  const nbManchesF = Math.max(1, defiForm.manches);
  const K_ELO = 32 * nbManchesF;
  const EA_ELO = 1/(1+Math.pow(10,(drix-monDrix)/400));
  const gainElo = Math.max(7 * nbManchesF, Math.round(K_ELO*(1-EA_ELO)));   // plancher 7/manche
  const perteElo = Math.max(7 * nbManchesF, Math.round(K_ELO*EA_ELO));      // plancher 7/manche

  // Point faible structuré
  const pointFaibleObj = (() => {
    if (!debutFort && duels.length>=5) return {label:"Début de match",desc:"Démarre souvent lentement",emoji:"🐢"};
    if (plusGrosFinish<60&&duels.length>=5) return {label:"Finishes",desc:"Peut rater ses finishes",emoji:"🛡️"};
    if (formePct<0.4&&derniers10.length>=5) return {label:"Pression",desc:"Perd sous la pression",emoji:"😰"};
    if (winRate<40) return {label:"Régularité",desc:"Résultats irréguliers",emoji:"📉"};
    return {label:"Finishes élevés",desc:"Peut rater les grands finishes",emoji:"🎯"};
  })();

  // ── Analyse adversaire — rapport d'éclaireur en paragraphes courts (2-3 phrases) ──
  const analyseParas = (() => {
    const P = [];
    const nom = j.pseudo;

    // P1 — Niveau & dangerosité
    const dWord = dangerScore>=70 ? "élevée" : dangerScore>=45 ? "notable" : dangerScore>=25 ? "modérée" : "faible";
    let appui;
    if (A.avgReel!=null && (A.checkoutPct==null || A.avgReel>=50)) appui = `qui s'appuie avant tout sur son scoring, avec une moyenne de ${A.avgReel} points par volée`;
    else if (A.checkoutPct!=null && A.checkoutPct>=42)             appui = `redoutable à la conclusion avec ${A.checkoutPct}% au checkout`;
    else if (winRate>=55)                                          appui = `porté par un solide taux de victoire de ${winRate}%`;
    else if (formePct>=0.6)                                        appui = `dangereux surtout par sa dynamique du moment`;
    else                                                           appui = `encore en construction, mais à ne pas sous-estimer`;
    const dangerNoun = dangerScore>=75 ? "un joueur dangereux" : dangerScore>=50 ? "un adversaire solide" : dangerScore>=30 ? "un adversaire à surveiller" : "un adversaire accessible";
    P.push(`Dangerosité ${dWord} (${dangerScore}/100). ${nom} est ${dangerNoun}, ${appui}.`);

    // P2 — Forces
    if (A.firstLegPct!=null || A.deciderPct!=null) {
      const bits = [];
      if (A.firstLegPct!=null) {
        const w = A.firstLegPct>=55 ? "démarre très fort ses rencontres" : A.firstLegPct>=42 ? "négocie correctement ses entames" : "met du temps à se mettre en route";
        bits.push(`Il ${w} avec ${A.firstLegPct}% de premières manches remportées`);
      }
      if (A.deciderPct!=null) {
        const w = A.deciderPct>=55 ? `reste particulièrement performant dans les manches décisives (${A.deciderPct}%)` : A.deciderPct>=42 ? `tient correctement le money-time (${A.deciderPct}%)` : `a tendance à lâcher dans les manches décisives (${A.deciderPct}%)`;
        bits.push((bits.length ? "et " : "Il ")+w);
      }
      P.push(bits.join(" ")+".");
    } else if (A.n180>0 || (A.tonRate!=null && A.tonRate>=15)) {
      P.push(`Sa force, c'est la puissance de frappe : ${A.n180>0 ? `${A.n180}×180` : `${A.tonRate}% de volées à 100+`} sur les manches analysées.`);
    } else if (pointFortObj.k!=="En construction") {
      P.push(`Sa principale force se situe sur ${pointFortObj.k.toLowerCase()} — ${pointFortObj.detail.toLowerCase()}.`);
    } else {
      P.push(`${nom} manque encore de matchs pour dégager une tendance nette, mais reste un adversaire à respecter.`);
    }

    // P3 — Faiblesse
    if (pointFaibleAnalyse.k==="Peu d'écueils") {
      P.push(`Difficile de lui trouver une vraie faiblesse : son profil est équilibré, sans point de rupture évident.`);
    } else {
      P.push(`Son principal point faible reste ${pointFaibleAnalyse.k.toLowerCase()} : ${pointFaibleAnalyse.detail.toLowerCase()}, ce qui peut lui coûter des manches pourtant bien engagées.`);
    }

    // P4 — Forme actuelle
    if (derniers10.length>=3) {
      const dyn = formePct>=0.7 ? "excellente" : formePct>=0.5 ? "correcte" : formePct>=0.3 ? "en dents de scie" : "compliquée";
      let f = `La dynamique est ${dyn} : ${victoires10} victoire${victoires10>1?"s":""} sur les ${derniers10.length} derniers matchs`;
      if (serieActuelle>=2 && serieType==="win")  f += ` et une série active de ${serieActuelle} succès consécutifs`;
      else if (serieActuelle>=2 && serieType==="loss") f += `, plombée par ${serieActuelle} défaites de rang`;
      if (deltaScoring && Math.abs(deltaScoring)>5) f += `. Son scoring est d'ailleurs ${deltaScoring>0?"en hausse":"en baisse"} de ${Math.abs(deltaScoring)}% par rapport à son standard`;
      P.push(f+".");
    }

    // P5 — Verdict & clés du match
    if (moi && moi.id!==j.id) {
      const cle = (A.checkoutPct!=null && A.checkoutPct<38) ? "profiter de ses ratés au checkout"
                : (A.firstLegPct!=null && A.firstLegPct<45) ? "le bousculer dès l'entame de chaque manche"
                : (A.deciderPct!=null && A.deciderPct<45)   ? "l'emmener dans des manches décisives où il craque"
                : (A.dechetRate!=null && A.dechetRate>=12)  ? "rester régulier pour punir ses trous de scoring"
                :                                             "hausser ton niveau de scoring pour rivaliser";
      const verdict = probaVictoire>=60 ? `Tu pars favori (~${probaVictoire}% de victoire estimée)`
                    : probaVictoire<=40 ? `DartPoint le considère comme favori avant ce duel (~${100-probaVictoire}% pour lui)`
                    :                     `DartPoint annonce un match très serré (~${probaVictoire}% pour toi)`;
      P.push(`${verdict}. Pour faire la différence, il faudra ${cle} et ne pas lui laisser l'avantage en début de manche.`);
    } else {
      P.push(`Au global, un profil ${dangerScore>=60?"à prendre très au sérieux":"abordable mais sérieux"}, dont toute la mécanique repose sur ${pointFortObj.k.toLowerCase()}.`);
    }

    return P;
  })();

  // Chart DRIX

  // Comparaison moi
  const maMoy = (() => {
    const sc = mesDuels.map(d=>parseFloat(d.challenger_id===moi?.id?d.score_challenger:d.score_defie)).filter(s=>!isNaN(s)&&s>0);
    return sc.length>0?(sc.reduce((a,b)=>a+b,0)/sc.length).toFixed(1):null;
  })();
  const monWR = mesStats?.parties>0?Math.round((mesStats.victoires/mesStats.parties)*100):0;

  // Face-à-face
  const faceAFace = mesDuels.filter(d=>
    (d.challenger_id===moi?.id&&d.defie_id===joueurId)||
    (d.challenger_id===joueurId&&d.defie_id===moi?.id)
  );
  const mesVFF = faceAFace.filter(d=>d.gagnant_id===moi?.id).length;
  const sesVFF = faceAFace.length-mesVFF;
  const mesScFF = faceAFace.map(d=>parseFloat(d.challenger_id===moi?.id?d.score_challenger:d.score_defie)).filter(s=>!isNaN(s)&&s>0);
  const sesScFF = faceAFace.map(d=>parseFloat(d.challenger_id===joueurId?d.score_challenger:d.score_defie)).filter(s=>!isNaN(s)&&s>0);
  const maMoyFF = mesScFF.length>0?(mesScFF.reduce((a,b)=>a+b,0)/mesScFF.length).toFixed(1):null;
  const saMoyFF = sesScFF.length>0?(sesScFF.reduce((a,b)=>a+b,0)/sesScFF.length).toFixed(1):null;
  const dernierFF = faceAFace[0];
  const monWRFF = faceAFace.length>0?Math.round(mesVFF/faceAFace.length*100):0;
  const sonWRFF = faceAFace.length>0?Math.round(sesVFF/faceAFace.length*100):0;
  const plusGrosseVictoire = faceAFace.reduce((best,d)=>{
    const isC=d.challenger_id===moi?.id;
    const {sc,sd}=fixManches(d);
    const monM=isC?sc:sd, sonM=isC?sd:sc;
    const diff=monM-sonM;
    if(d.gagnant_id===moi?.id&&diff>(best?.diff||0)) return {diff,score:`${monM}–${sonM}`};
    return best;
  }, null);

  // Drix sur duels FF
  const drixFF = drixMvts.filter(m=>faceAFace.some(d=>d.id===m.duel_id)).reduce((s,m)=>s+(m.variation||0),0);

  // Map drixMvt pour historique
  const drixMvtMap = {};
  drixMvts.forEach(m=>{ if(m.duel_id) drixMvtMap[m.duel_id]=m.variation; });

  // Série DATÉE des moyennes du joueur CONSULTÉ, pour le graphique d'évolution.
  // Même règle de lecture que partout ailleurs : sa moyenne est dans score_challenger s'il était
  // le challenger du duel, sinon dans score_defie. Les duels sans moyenne enregistrée donnent NaN
  // et sont écartés (parseFloat(null) → NaN).
  const moyMvtsJoueur = (duels||[])
    .filter(d => d.date)
    .map(d => ({ t:d.date, v:parseFloat(d.challenger_id===joueurId ? d.score_challenger : d.score_defie) }))
    .filter(m => !isNaN(m.v) && m.v > 0);

  // Badges — même source que l'onglet « Voir tous » et que la page Badges (ALL_BADGES).
  // Avant, cette bandelette avait sa PROPRE liste de 10 badges écrits à la main (« Premier duel »,
  // « Combattant »…) qui n'existaient nulle part ailleurs : le titre annonçait « 24 badges obtenus »
  // et on en voyait défiler 10 autres, sans image possible faute d'identifiant.
  const valsComplets = computeBadgeValues(j, stats, duels, drixMvts, jAmis, jNbTournois, jNbTournoisGagnes);
  const badgesOk = ALL_BADGES.filter(b=>b.val(valsComplets)>=b.seuil);
  const totalBadgesOk = badgesOk.length;

  const FicheBadgeCard = ({ b }) => {
    const current = b.val(valsComplets);
    const unlocked = current >= b.seuil;
    const pct = Math.min(100, Math.round((current/b.seuil)*100));
    const isIncremental = b.seuil > 1;
    return (
      <div style={{
        background: unlocked ? b.couleur+"18" : "#ffffff06",
        border: `1px solid ${unlocked ? b.couleur+"66" : "#2a2a2a"}`,
        borderRadius:14, padding:14, position:"relative", overflow:"hidden",
        filter: unlocked ? "none" : "grayscale(0.8)",
        opacity: unlocked ? 1 : 0.5,
        transition:"all .2s"
      }}>
        <div style={{ marginBottom:6, display:"flex", justifyContent:"center", height:72, alignItems:"center" }}><BadgeVisual b={b} size={68} unlocked={unlocked}/></div>
        <div style={{ fontWeight:700, fontSize:13, color: unlocked ? b.couleur : CJ.muted, marginBottom:3 }}>{b.nom}</div>
        <div style={{ fontSize:10, color:CJ.muted, marginBottom: isIncremental&&!unlocked ? 8 : 0 }}>{b.desc}</div>
        {isIncremental && !unlocked && (
          <>
            <div style={{ background:"#ffffff12", borderRadius:4, height:4, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:b.couleur, borderRadius:4 }}/>
            </div>
            <div style={{ fontSize:10, color:CJ.muted, marginTop:4 }}>{current} / {b.seuil}</div>
          </>
        )}
        {unlocked && <div style={{ position:"absolute", top:8, right:8, width:20, height:20, borderRadius:"50%", background:b.couleur, display:"flex", alignItems:"center", justifyContent:"center" }}><Check size={12} color="#fff" strokeWidth={3}/></div>}
      </div>
    );
  };

  // Derniers résultats pour mini-card
  const derniers5 = duels.slice(0,5);
  const tempsDepuisMatch = (date) => {
    const diff = Date.now()-(date||0);
    const h = Math.floor(diff/3600000);
    if(h<1) return "il y a moins d'1h";
    if(h<24) return `il y a ${h}h`;
    return `il y a ${Math.floor(h/24)}j`;
  };

  // Styles communs
  const card = {background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:14,padding:14};
  const labelSt = {fontSize:10,color:CJ.muted,fontWeight:700,letterSpacing:1,marginBottom:6,display:"block"};

  // Animation d'apparition échelonnée des cartes (désactivée si reduce-motion)
  const sec = (i=0) => reduceMotion ? {} : { animation:"dpFade .45s ease both", animationDelay:`${(0.045*i).toFixed(2)}s` };

  // Mise en valeur auto des chiffres clés dans le texte d'analyse (% , /100, pts, ×180, séries…)
  const HL_RE   = /(\d+\s?\/\s?100|\d+\s?%|\d+\s?(?:pts|points?|victoires?|succès|manches?)|\d+×\d+)/g;
  const HL_TEST = /^(?:\d+\s?\/\s?100|\d+\s?%|\d+\s?(?:pts|points?|victoires?|succès|manches?)|\d+×\d+)$/;
  const hlStyle = { color:"#ffffff", fontWeight:800, textShadow:"0 0 9px #a855f7aa" };
  const renderHL = (text) => String(text).split(HL_RE).map((part,i)=> HL_TEST.test(part) ? <span key={i} style={hlStyle}>{part}</span> : part);

  // Forme résumée (capsule express)
  const formeShort = formePct>=0.7 ? "En feu" : formePct>=0.5 ? "En forme" : formePct>=0.3 ? "Moyen" : "Froid";

  // Forces / Faiblesses agrégées pour les cartes dédiées
  const forcesList = [
    { emoji: pointFortObj.emoji, k: pointFortObj.k, detail: pointFortObj.detail },
    debutObj.color===CJ.green ? { emoji: debutObj.emoji, k: debutObj.label, detail: debutObj.detail } : null,
    finObj.color===CJ.green   ? { emoji: finObj.emoji,   k: finObj.label,   detail: finObj.detail }   : null,
    (A.tonRate!=null && A.tonRate>=25) ? { emoji:"💥", k:"Gros scoring", detail:`${A.tonRate}% de volées à 100+` } : null,
  ].filter(Boolean).slice(0,4);
  const faiblessesList = [
    { emoji: pointFaibleAnalyse.emoji, k: pointFaibleAnalyse.k, detail: pointFaibleAnalyse.detail },
    debutObj.color===CJ.red ? { emoji: debutObj.emoji, k: debutObj.label, detail: debutObj.detail } : null,
    finObj.color===CJ.red   ? { emoji: finObj.emoji,   k: finObj.label,   detail: finObj.detail }   : null,
  ].filter(Boolean).slice(0,3);

  // Exploits — uniquement les vrais hauts faits du joueur
  const exploitsList = [
    plusGrosFinish>=60 ? { emoji:"🎯", label:`Finish ${plusGrosFinish}`, sub:"meilleur checkout" } : null,
    nb180>0 ? { emoji:"💥", label:`${nb180} × 180`, sub:nb180>1?"maximums":"maximum" } : null,
    (serieType==="win" && serieActuelle>=2) ? { emoji:"🔥", label:`${serieActuelle} de suite`, sub:"série en cours" } : null,
    var7j>0 ? { emoji:"📈", label:`+${var7j} DRIX`, sub:"cette semaine" } : null,
    (A.checkoutPct!=null && A.checkoutPct>=45) ? { emoji:"🏹", label:`${A.checkoutPct}% checkout`, sub:"finisseur" } : null,
    (A.avgReel!=null && A.avgReel>=55) ? { emoji:"⚡", label:`${A.avgReel} moy.`, sub:"scoring lourd" } : null,
  ].filter(Boolean);

  // ── Carte de performance — Score Joueur (note globale) ──────────────────────────
  const moyNum     = moyenneDuels!=null ? parseFloat(moyenneDuels) : (A.avgReel ?? null);
  const moyDisplay = moyenneDuels!=null ? moyenneDuels : (A.avgReel!=null ? A.avgReel : "—");
  const moyPct     = moyNum!=null ? Math.max(0, Math.min(100, ((moyNum-25)/35)*100)) : 0;
  const moyColor   = moyNum==null ? CJ.muted : moyNum>=52 ? "#22c55e" : moyNum>=42 ? "#f59e0b" : "#ef4444";
  const wrColor    = winRate>=60 ? "#22c55e" : winRate>=45 ? "#f59e0b" : "#ef4444";
  const recordFinish = plusGrosFinish || A.bestFinish || 0;

  const scoreJoueur = (() => {
    const wrN  = winRate/100;
    const avgN = moyNum!=null ? Math.max(0, Math.min(1, (moyNum-25)/35)) : 0;
    const finN = A.checkoutPct!=null ? Math.min(1, A.checkoutPct/55) : (recordFinish>0 ? Math.min(1, recordFinish/130) : 0);
    const strN = serieType==="win" ? Math.min(1, serieActuelle/8) : 0;
    const expN = Math.min(1, (stats?.parties||0)/60);
    return Math.max(1, Math.min(100, Math.round(wrN*35 + avgN*25 + finN*15 + strN*10 + expN*15)));
  })();
  const grade      = scoreJoueur>=92?"S":scoreJoueur>=85?"A":scoreJoueur>=78?"A-":scoreJoueur>=70?"B+":scoreJoueur>=62?"B":scoreJoueur>=54?"C+":scoreJoueur>=46?"C":scoreJoueur>=38?"D":"E";
  const scoreColor = scoreJoueur>=85?"#fbbf24":scoreJoueur>=70?"#22c55e":scoreJoueur>=55?"#84cc16":scoreJoueur>=40?"#f59e0b":"#ef4444";
  const tierWord   = scoreJoueur>=85?"Élite":scoreJoueur>=70?"Très bon niveau":scoreJoueur>=55?"Bon niveau":scoreJoueur>=40?"Niveau correct":"En développement";
  const profilJoueur = (() => {
    if (serieType==="win" && serieActuelle>=4)     return { emoji:"🔥", txt:"Joueur en confiance, sur une série en cours." };
    if (winRate>=65 && (stats?.parties||0)>=20)    return { emoji:"⚔️", txt:"Gros compétiteur au palmarès solide." };
    if (moyNum!=null && moyNum>=52)                return { emoji:"🎯", txt:"Scoreur régulier avec une grosse moyenne." };
    if (A.checkoutPct!=null && A.checkoutPct>=45)  return { emoji:"🏹", txt:"Finisseur clinique, dangereux à l'arrivée." };
    if (winRate>=55)                               return { emoji:"🏆", txt:"Joueur performant, bon taux de victoire." };
    if ((stats?.parties||0)<8)                     return { emoji:"🌱", txt:"Profil jeune, encore en rodage." };
    if (winRate<40 && (stats?.parties||0)>=8)      return { emoji:"📉", txt:"En reconstruction, cherche son rythme." };
    return { emoji:"⚖️", txt:"Joueur polyvalent et équilibré." };
  })();
  // Contextes facultatifs sous les stats
  const ctxWR      = winRate>=60?"Excellent":winRate>=50?"Au-dessus de la moyenne":winRate>=42?"Dans la moyenne":"À consolider";
  const ctxMoy     = moyNum==null?null:moyNum>=55?"Très haut niveau":moyNum>=48?"Niveau confirmé":moyNum>=40?"Niveau intermédiaire":"En progression";
  const ctxParties = (stats?.parties||0)>=50?"Très expérimenté":(stats?.parties||0)>=20?"Expérimenté":(stats?.parties||0)>=8?"Joueur régulier":"Débutant";
  const ctxFinish  = recordFinish>=120?"Niveau élite":recordFinish>=100?"Gros finish":recordFinish>=60?"Bon finish":recordFinish>0?"À améliorer":null;

  // Mini-jauge horizontale animée (Win Rate, Moyenne)
  const MiniBar = ({ pct, color }) => (
    <div style={{ height:5, borderRadius:3, background:"#ffffff14", overflow:"hidden", marginTop:7 }}>
      <div style={{ height:"100%", width:`${Math.max(3,Math.min(100,pct))}%`, background:color, borderRadius:3, transformOrigin:"left", animation:reduceMotion?undefined:"dpBar .9s ease both" }}/>
    </div>
  );

  // Cellule de stat — met en avant (glow + contour) les meilleures performances
  const StatCell = ({ icon:Icon, value, label, color=CJ.text, strong=false, gaugePct, gaugeColor, context, delay=0 }) => (
    <div style={{
      background: strong ? color+"14" : "#ffffff06",
      border: strong ? `1px solid ${color}55` : "1px solid transparent",
      boxShadow: (strong && !reduceMotion) ? `0 0 16px ${color}33` : "none",
      borderRadius:11, padding:"11px 9px", position:"relative", textAlign:"center", ...sec(delay),
    }}>
      {strong && <span style={{ position:"absolute", top:6, right:7, display:"flex" }}><Star size={9} color="#fbbf24" fill="#fbbf24"/></span>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
        {Icon && <Icon size={14} color={color} strokeWidth={2.5}/>}
        <span style={{ fontWeight:900, fontSize:18, color, lineHeight:1 }}>{value}</span>
      </div>
      <div style={{ fontSize:9, color:CJ.muted, fontWeight:600, marginTop:4, lineHeight:1.2 }}>{label}</div>
      {gaugePct!=null && <MiniBar pct={gaugePct} color={gaugeColor||color}/>}
      {context && <div style={{ fontSize:8.5, color, fontWeight:600, marginTop:5, opacity:.85 }}>{context}</div>}
    </div>
  );

  // ── RENDU ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"16px 16px 80px",background:CJ.bg,minHeight:"100vh"}}>
      <style>{`
@keyframes dpFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes dpDraw{from{stroke-dashoffset:var(--dp-circ)}to{stroke-dashoffset:var(--dp-off)}}
@keyframes dpBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
`}</style>

      {/* ── Retour ── */}
      <button onClick={()=>window.history.back()} style={{background:"none",border:"none",color:CJ.muted,cursor:"pointer",marginBottom:14,fontSize:13,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation"}}>← Retour</button>

      {/* ════ HERO PREMIUM — bannière dynamique selon le rang ════ */}
      <div style={{position:"relative",borderRadius:18,overflow:"hidden",marginBottom:10,border:`1px solid ${color}55`,background:"#161616",...sec(0)}}>
        <div style={{position:"absolute",inset:0,background:`linear-gradient(140deg, ${color}3a 0%, ${color}12 45%, transparent 78%)`}}/>
        <div style={{position:"absolute",top:-50,right:-40,width:170,height:170,borderRadius:"50%",background:`radial-gradient(circle, ${color}40, transparent 70%)`}}/>
        <div style={{position:"relative",padding:16}}>
          {/* Ligne 1 — avatar + identité + ami */}
          <div style={{display:"flex",gap:14,alignItems:"center"}}>
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:78,height:78,borderRadius:"50%",border:`3px solid ${color}`,overflow:"hidden",background:color+"22",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 22px ${color}66`}}>
                {j.photo?<img src={j.photo} alt={`Avatar de ${j.pseudo}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<RankIcon drix={drix} size={32}/>}
              </div>
              <NiveauBulle xp={j.xp || 0} size={26} corner="top-right"/>
              <div style={{position:"absolute",bottom:3,right:3,width:13,height:13,borderRadius:"50%",background:"#22c55e",border:"2px solid #161616"}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <h1 style={{fontWeight:900,fontSize:21,margin:"0 0 5px",lineHeight:1.05}}>{j.pseudo}</h1>
              <div style={{display:"inline-flex",alignItems:"center",gap:6,background:color+"22",border:`1px solid ${color}66`,borderRadius:20,padding:"3px 11px",marginBottom:6}}>
                <RankIcon drix={drix} size={15}/>
                <span style={{fontWeight:800,fontSize:12.5,color,letterSpacing:.4,textTransform:"uppercase"}}>{titre}</span>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {j.age&&<BadgeJ color={CJ.muted}><EmoIcon e="🎂" size={10} style={{verticalAlign:"-1px",marginRight:3}}/>{j.age} ans</BadgeJ>}
                {j.ville&&<BadgeJ color={CJ.blue}><EmoIcon e="📍" size={10} style={{verticalAlign:"-1px",marginRight:3}}/>{j.ville}</BadgeJ>}
              </div>
            </div>
            {moi&&moi.id!==j.id&&(
              amiStatut===null
                ?<button onClick={ajouterAmi} disabled={ajoutBusy} aria-label={`Ajouter ${j.pseudo} en ami`} style={{flexShrink:0,background:ajoutBusy?"#1a1a1a":`linear-gradient(135deg,${CJ.accent},#ea580c)`,border:"none",color:ajoutBusy?CJ.muted:"#fff",borderRadius:20,padding:"9px 13px",cursor:ajoutBusy?"not-allowed":"pointer",fontSize:15,fontWeight:800,touchAction:"manipulation",boxShadow:ajoutBusy?"none":`0 4px 16px ${CJ.accent}55`,opacity:ajoutBusy?.6:1}}>{ajoutBusy?"…":"👥"}</button>
                :amiStatut==="en_attente"
                  ?<span aria-label="Demande d'ami en attente" style={{flexShrink:0,background:"#78350f33",border:`1px solid ${CJ.yellow}44`,color:CJ.yellow,borderRadius:20,padding:"7px 11px",fontSize:13,fontWeight:700}}>⏳</span>
                  :<span aria-label="Vous êtes amis" style={{flexShrink:0,background:"#14532d33",border:`1px solid ${CJ.green}44`,color:CJ.green,borderRadius:20,padding:"7px 11px",fontSize:13,fontWeight:700}}>✅</span>
            )}
          </div>

          {/* Ligne 2 — DRIX géant + classement + écart */}
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginTop:14,gap:10}}>
            <div style={{minWidth:0}}>
              <div style={{display:"flex",alignItems:"baseline",gap:7}}>
                <span style={{fontWeight:900,fontSize:40,color,lineHeight:.9,textShadow:`0 0 18px ${color}55`}}>{drix}</span>
                <span style={{fontSize:15,fontWeight:700,color:color+"cc"}}>DRIX</span>
              </div>
              <div style={{display:"flex",gap:7,marginTop:8,flexWrap:"wrap"}}>
                {classement?.position&&<span style={{fontSize:12,color:CJ.yellow,fontWeight:800,background:"#f59e0b18",border:"1px solid #f59e0b44",borderRadius:8,padding:"3px 8px"}}><EmoIcon e="🏆" size={11} color="#fbbf24" style={{verticalAlign:"-2px",marginRight:3}}/>#{classement.position}{classement.total?` / ${classement.total}`:""}</span>}
                {serieType==="win"&&serieActuelle>=2&&<span style={{fontSize:12,color:CJ.green,fontWeight:800,background:"#22c55e18",border:"1px solid #22c55e44",borderRadius:8,padding:"3px 8px"}}><EmoIcon e="🔥" size={11} color={CJ.green} style={{verticalAlign:"-2px",marginRight:3}}/>{serieActuelle} de suite</span>}
              </div>
            </div>
            {moi&&moi.id!==j.id&&(
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:10,color:CJ.muted,marginBottom:2}}>Écart</div>
                <div style={{fontWeight:900,fontSize:21,color:ecartDrix>0?"#ef4444":"#22c55e",lineHeight:1}}>{ecartDrix>0?"+":""}{ecartDrix}</div>
                <div style={{fontSize:9,color:CJ.muted,marginTop:3}}>{ecartDrix>0?"il vous devance":"vous le dépassez"}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ⭐ Niveau XP + barre de progression (sous le DRIX) */}
      <div style={{ marginBottom: 10 }}><XpBlock xp={j.xp || 0} /></div>

      {/* ════ RÉSUMÉ EXPRESS (capsules) ════ */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10,...sec(1)}}>
        {[
          {icon:Flame,val:formeShort,lbl:"Forme",c:formeColor},
          {icon:Trophy,val:winRate+"%",lbl:"Win rate",c:CJ.yellow},
          {icon:Zap,val:(var7j>=0?"+":"")+var7j,lbl:"7 jours",c:var7j>=0?CJ.green:CJ.red},
          {icon:Crosshair,val:(plusGrosFinish||A.bestFinish)||"—",lbl:"Finish",c:CJ.accent},
        ].map((x,i)=>(
          <div key={i} style={{background:"#1a1a1a",border:`1px solid ${x.c}33`,borderRadius:12,padding:"10px 4px",textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center"}}><x.icon size={17} color={x.c} strokeWidth={2.5}/></div>
            <div style={{fontWeight:900,fontSize:14,color:x.c,marginTop:4,lineHeight:1.1}}>{x.val}</div>
            <div style={{fontSize:8.5,color:CJ.muted,marginTop:2}}>{x.lbl}</div>
          </div>
        ))}
      </div>

      {/* ════ BOUTONS ════ */}
      {moi&&moi.id!==j.id&&(
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <button onClick={()=>setPage("messages-"+j.id+"|"+encodeURIComponent(j.pseudo))}
            style={{flex:1,background:"#1d4ed8",border:"none",color:"#fff",borderRadius:12,padding:"13px 0",cursor:"pointer",fontWeight:700,fontSize:14,touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            <EmoIcon e="💬" size={15} color="#fff"/>Message
          </button>
          <button onClick={()=>setShowDefi(true)}
            style={{flex:1,background:`linear-gradient(135deg,${CJ.accent},#ea580c)`,border:"none",color:"#fff",borderRadius:12,padding:"13px 0",cursor:"pointer",fontWeight:800,fontSize:14,touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center",gap:6,boxShadow:`0 4px 16px ${CJ.accent}44`}}>
            <EmoIcon e="⚔️" size={15} color="#fff"/>Défier
          </button>
        </div>
      )}

      {/* ════ AFFRONTE SON BOT ════ */}
      {moi&&moi.id!==j.id&&(
        <button onClick={()=>setPage("scoreur-bot-"+j.id)}
          style={{width:"100%",background:"#a78bfa14",border:"1px solid #a78bfa55",color:"#c4b5fd",borderRadius:12,padding:"13px 0",cursor:"pointer",fontWeight:800,fontSize:14,touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:14}}>
          <EmoIcon e="🤖" size={15} color="#c4b5fd"/>Affronte son bot
        </button>
      )}

      {/* ════ JOUER EN LIGNE ════ */}
      {moi&&moi.id!==j.id&&(
        <button onClick={()=>setPage("scoreur-online-new-"+j.id)}
          style={{width:"100%",background:"#34d39914",border:"1px solid #34d39955",color:"#6ee7b7",borderRadius:12,padding:"13px 0",cursor:"pointer",fontWeight:800,fontSize:14,touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginBottom:14}}>
          <EmoIcon e="🌐" size={15} color="#6ee7b7"/>Jouer en ligne
        </button>
      )}

      {/* ── MODAL DÉFI ── */}
      {showDefi&&moi&&(()=>{
        const lancerDefi = async () => {
          if (sending) return;
          setSending(true);
          try {
            const isCricket = /^cricket$/i.test(defiForm.mode);
            const duelType  = defiForm.type === "classe" ? "drix" : "amical";
            const res = await sbJ("duels", { method:"POST", body:JSON.stringify({
              challenger_id:moi.id, challenger_pseudo:moi.pseudo,
              defie_id:j.id, defie_pseudo:j.pseudo,
              statut:"accepte", type: duelType,
              mode: isCricket ? "Cricket" : defiForm.mode,
              manches: isCricket ? 1 : defiForm.manches,
              date:Date.now(), valide_challenger:false, valide_defie:false,
              score_manches_challenger:0, score_manches_defie:0,
            })});
            const newDuel = Array.isArray(res)?res[0]:res;
            if (newDuel?.id) {
              setShowDefi(false);
              window.dpToast?.(`Défi lancé contre ${j.pseudo}`, "success");
              if (isCricket) {
                // Cricket : on stocke le contexte du duel et on route vers la config Cricket
                localStorage.setItem("dp_cricket_duel", JSON.stringify({
                  duelId: newDuel.id,
                  challengerId: moi.id, challengerPseudo: moi.pseudo, challengerDrix: moi.drix||1000,
                  defiId: j.id, defiPseudo: j.pseudo, defiDrix: j.drix||1000,
                  type: duelType,
                }));
                setPage("cricket-config");
              } else {
                setPage("scoreur-duel-"+newDuel.id);
              }
            }
          } catch(e) {
            window.dpToast?.(`Erreur : ${e.message || "impossible de lancer le défi"}`, "error", 5000);
          } finally { setSending(false); }
        };
        const probaColor = probaVictoire>=60?"#22c55e":probaVictoire>=40?"#f59e0b":"#ef4444";

        return (
          <div style={{position:"fixed",inset:0,zIndex:2000,background:"#000000dd",overflowY:"auto",WebkitOverflowScrolling:"touch"}} onClick={e=>{if(e.target===e.currentTarget)setShowDefi(false);}}>
            <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
            <div style={{maxWidth:480,margin:"0 auto",padding:"16px 16px 40px",animation:"slideUp .22s ease"}}>
              <div style={{background:"#111",borderRadius:20,overflow:"hidden",border:"1px solid #2a2a2a"}}>

                {/* ── En-tête ── */}
                <div style={{padding:"14px 18px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #1e1e1e"}}>
                  <span style={{fontSize:22}}>⚔️</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:800,fontSize:16,color:CJ.text}}>Défis</div>
                    <div style={{fontSize:11,color:CJ.muted}}>Défie tes amis et gagne des DRIX</div>
                  </div>
                  <button onClick={()=>setShowDefi(false)} style={{background:"#2a2a2a",border:"none",color:CJ.text,borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",touchAction:"manipulation"}}>✕</button>
                </div>

                {/* ── Bloc identité ── */}
                <div style={{padding:"14px 18px",borderBottom:"1px solid #1e1e1e"}}>
                  <div style={{display:"flex",gap:10,alignItems:"stretch"}}>
                    {/* Joueur */}
                    <div style={{flex:1.4,display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:52,height:52,borderRadius:"50%",border:`2px solid ${color}`,overflow:"hidden",background:color+"22",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        {j.photo?<img src={j.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<RankIcon drix={drix} size={22}/>}
                      </div>
                      <div>
                        <div style={{fontWeight:800,fontSize:15,color:CJ.text}}>{j.pseudo}</div>
                        <div style={{color:CJ.yellow,fontSize:12,fontWeight:700}}>⭐ {drix} DRIX</div>
                        {classement?.position&&<div style={{color:CJ.muted,fontSize:11}}>Rang #{classement.position}</div>}
                      </div>
                    </div>
                    {/* Dangerosité */}
                    <div style={{flex:1,textAlign:"center",borderLeft:"1px solid #1e1e1e",paddingLeft:10}}>
                      <div style={{fontSize:9,color:CJ.muted,fontWeight:700,letterSpacing:.5,marginBottom:4}}>DANGEROSITÉ</div>
                      <CircleGauge value={dangerScore} color={dangerColor} size={64}/>
                      <div style={{fontSize:10,color:dangerColor,fontWeight:700,marginTop:3}}>{dangerScore>=75?"Joueur dangereux":dangerScore>=50?"Adversaire solide":dangerScore>=30?"À surveiller":"Accessible"}</div>
                    </div>
                    {/* Forme */}
                    <div style={{flex:1,textAlign:"center",borderLeft:"1px solid #1e1e1e",paddingLeft:10}}>
                      <div style={{fontSize:9,color:CJ.muted,fontWeight:700,letterSpacing:.5,marginBottom:4}}>FORME ACTUELLE</div>
                      <div style={{display:"flex",gap:3,justifyContent:"center",flexWrap:"wrap",marginBottom:4}}>
                        {resultats5.length>0
                          ? resultats5.map((r,i)=><VDBadge key={i} gagne={r==="V"} size={22}/>)
                          : <span style={{color:CJ.muted,fontSize:10}}>—</span>}
                      </div>
                      <div style={{fontSize:10,color:formeDefiColor,fontWeight:700}}>{formeDefi}</div>
                    </div>
                  </div>
                </div>

                {/* ── Bloc analyse ── */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,padding:"14px 18px",borderBottom:"1px solid #1e1e1e"}}>
                  {/* Face-à-face */}
                  <div style={{background:"#1a1a1a",borderRadius:10,padding:"10px 8px"}}>
                    <div style={{fontSize:8,color:CJ.muted,fontWeight:700,letterSpacing:.3,marginBottom:6,textTransform:"uppercase"}}>Face-à-face</div>
                    {faceAFace.length>0?(
                      <>
                        <div style={{fontWeight:800,fontSize:12}}>
                          <span style={{color:CJ.green}}>Toi {mesVFF}</span>
                          <span style={{color:CJ.muted}}> - </span>
                          <span style={{color:CJ.red}}>{sesVFF} Lui</span>
                        </div>
                        <div style={{fontSize:9,color:CJ.muted,marginTop:2}}>{faceAFace.length} match{faceAFace.length>1?"s":""}</div>
                        <button onClick={()=>setTab("face")} style={{marginTop:5,background:"none",border:"none",color:CJ.accent,fontSize:9,cursor:"pointer",padding:0,touchAction:"manipulation"}}>Historique &gt;</button>
                      </>
                    ):(
                      <div style={{fontSize:9,color:CJ.muted}}>Aucun match</div>
                    )}
                  </div>
                  {/* Style de jeu */}
                  <div style={{background:"#1a1a1a",borderRadius:10,padding:"10px 8px"}}>
                    <div style={{fontSize:8,color:CJ.muted,fontWeight:700,letterSpacing:.3,marginBottom:6,textTransform:"uppercase"}}>Style de jeu</div>
                    <div style={{marginBottom:3,display:"flex",justifyContent:"center"}}><EmoIcon e={styleJoueur.emoji} size={18} color={CJ.text}/></div>
                    <div style={{fontSize:10,fontWeight:700,color:CJ.text,lineHeight:1.3}}>{styleJoueur.label.replace("Le ","")}</div>
                    <div style={{fontSize:9,color:CJ.muted,marginTop:2,lineHeight:1.3}}>{styleJoueur.desc}</div>
                  </div>
                  {/* Point faible */}
                  <div style={{background:"#1a1a1a",borderRadius:10,padding:"10px 8px"}}>
                    <div style={{fontSize:8,color:CJ.muted,fontWeight:700,letterSpacing:.3,marginBottom:6,textTransform:"uppercase"}}>Point faible</div>
                    <div style={{marginBottom:3,display:"flex",justifyContent:"center"}}><EmoIcon e={pointFaibleObj.emoji} size={18} color={CJ.text}/></div>
                    <div style={{fontSize:10,fontWeight:700,color:CJ.text,lineHeight:1.3}}>{pointFaibleObj.label}</div>
                    <div style={{fontSize:9,color:CJ.muted,marginTop:2,lineHeight:1.3}}>{pointFaibleObj.desc}</div>
                  </div>
                  {/* Chance estimée */}
                  <div style={{background:"#1a1a1a",borderRadius:10,padding:"10px 8px",textAlign:"center"}}>
                    <div style={{fontSize:8,color:CJ.muted,fontWeight:700,letterSpacing:.3,marginBottom:6,textTransform:"uppercase"}}>Chance estimée</div>
                    <div style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                      <svg width={58} height={58} style={{display:"block"}}>
                        <circle cx={29} cy={29} r={22} fill="none" stroke="#ffffff10" strokeWidth={7}/>
                        <circle cx={29} cy={29} r={22} fill="none" stroke={probaColor} strokeWidth={7}
                          strokeDasharray={`${Math.min(1,probaVictoire/100)*138.2} 138.2`} strokeLinecap="round"
                          transform="rotate(-90 29 29)"/>
                        <text x="29" y="29" textAnchor="middle" dominantBaseline="middle" style={{fill:CJ.text,fontWeight:900,fontSize:13}}>{probaVictoire}%</text>
                      </svg>
                    </div>
                    <div style={{fontSize:9,color:CJ.muted,marginTop:2}}>de gagner</div>
                    <div style={{fontSize:8,color:CJ.muted,lineHeight:1.3}}>Stats et forme actuelle</div>
                  </div>
                </div>

                {/* ── Bloc comparaison DRIX ── */}
                <div style={{padding:"14px 18px",borderBottom:"1px solid #1e1e1e"}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
                    <div style={{flex:1,textAlign:"center"}}>
                      <div style={{fontSize:11,color:CJ.muted,fontWeight:700}}>TOI</div>
                      <div style={{fontSize:26,fontWeight:900,color:CJ.text,lineHeight:1.1}}>{monDrix}</div>
                      <div style={{fontSize:10,color:CJ.muted}}>DRIX</div>
                      {classementMoi?.position&&<div style={{fontSize:10,color:CJ.muted}}>Rang #{classementMoi.position}</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
                      <span style={{fontSize:20}}>⚔️</span>
                      <span style={{fontSize:11,color:CJ.muted,fontWeight:700}}>VS</span>
                    </div>
                    <div style={{flex:1,textAlign:"center"}}>
                      <div style={{fontSize:11,color:CJ.muted,fontWeight:700}}>{j.pseudo.toUpperCase()}</div>
                      <div style={{fontSize:26,fontWeight:900,color:CJ.text,lineHeight:1.1}}>{drix}</div>
                      <div style={{fontSize:10,color:CJ.muted}}>DRIX</div>
                      {classement?.position&&<div style={{fontSize:10,color:CJ.muted}}>Rang #{classement.position}</div>}
                    </div>
                  </div>
                  {(() => {
                    // Projection pour les DEUX joueurs (ELO : ce que l'un gagne, l'autre le perd)
                    const lignes = [
                      { pseudo: (moi?.pseudo) || "Toi", vic: gainElo,  def: perteElo },
                      { pseudo: j.pseudo,               vic: perteElo, def: gainElo  },
                    ];
                    return (
                      <>
                        {lignes.map((p, i) => (
                          <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"#111",borderRadius:10,padding:"9px 10px",marginBottom:i===0?8:0}}>
                            <div style={{flex:1,minWidth:0,fontWeight:800,fontSize:13,color:CJ.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.pseudo}</div>
                            <div style={{background:"#14532d",borderRadius:8,padding:"5px 9px",textAlign:"center",minWidth:56}}>
                              <div style={{fontSize:8,color:"#4ade80",letterSpacing:.3}}>SI VICTOIRE</div>
                              <div style={{fontWeight:900,fontSize:15,color:"#22c55e"}}>{p.vic === 0 ? "0" : `+${p.vic}`}</div>
                            </div>
                            <div style={{background:"#1e1e2e",borderRadius:8,padding:"5px 9px",textAlign:"center",minWidth:56}}>
                              <div style={{fontSize:8,color:"#fca5a5",letterSpacing:.3}}>SI DÉFAITE</div>
                              <div style={{fontWeight:900,fontSize:15,color:"#ef4444"}}>{p.def === 0 ? "0" : `-${p.def}`}</div>
                            </div>
                          </div>
                        ))}
                        <div style={{fontSize:10,color:CJ.muted,textAlign:"center",marginTop:8}}>ⓘ Gain / perte de DRIX calculé par notre algorithme (type ELO)</div>
                      </>
                    );
                  })()}
                </div>

                {/* ── Bloc configuration ── */}
                <div style={{padding:"14px 18px",borderBottom:"1px solid #1e1e1e"}}>
                  <div style={{fontWeight:800,fontSize:13,color:CJ.text,marginBottom:12}}>CONFIGURATION DU DÉFI</div>

                  {/* Mode de jeu */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,color:CJ.muted,fontWeight:700,marginBottom:7}}>MODE DE JEU</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                      {[["501","🎯","501","Classique"],["301","🎯","301","Classique"],["Cricket","🦗","Cricket",""]].map(([v,ic,nm,sub])=>(
                        <button key={v} onClick={()=>setDefiForm(f=>({...f,mode:v}))}
                          style={{background:defiForm.mode===v?"#1a1a1a":"#0d0d0d",border:`2px solid ${defiForm.mode===v?CJ.accent:"#2a2a2a"}`,borderRadius:12,padding:"10px 6px",cursor:"pointer",touchAction:"manipulation",transition:"all .15s",textAlign:"center"}}>
                          <div style={{fontSize:22,marginBottom:3}}>{ic}</div>
                          <div style={{fontWeight:800,fontSize:13,color:defiForm.mode===v?CJ.accent:CJ.text}}>{nm}</div>
                          {sub&&<div style={{fontSize:9,color:CJ.muted}}>{sub}</div>}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nombre de manches */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,color:CJ.muted,fontWeight:700,marginBottom:7}}>NOMBRE DE MANCHES</div>
                    <div style={{display:"flex",gap:6}}>
                      {[1,2,3,4,5].map(n=>(
                        <button key={n} onClick={()=>setDefiForm(f=>({...f,manches:n}))}
                          style={{flex:1,padding:"11px 0",borderRadius:10,border:`2px solid ${defiForm.manches===n?CJ.accent:"#2a2a2a"}`,background:defiForm.manches===n?CJ.accent+"22":"#0d0d0d",color:defiForm.manches===n?CJ.accent:CJ.muted,fontWeight:800,fontSize:15,cursor:"pointer",touchAction:"manipulation",transition:"all .15s"}}>
                          {n}
                        </button>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:CJ.muted,textAlign:"center",marginTop:6}}>{defiForm.manches===1?"1 manche gagnante":`${defiForm.manches} manches gagnantes`}</div>
                  </div>

                  {/* Type de partie */}
                  <div>
                    <div style={{fontSize:10,color:CJ.muted,fontWeight:700,marginBottom:7}}>TYPE DE PARTIE</div>
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      {[
                        {v:"classe",icon:"🏆",label:"Classé",desc:"Impact sur ton DRIX"},
                        {v:"amical",icon:"🤝",label:"Amical",desc:"Aucun impact DRIX"},
                      ].map(({v,icon,label,desc})=>(
                        <button key={v} onClick={()=>setDefiForm(f=>({...f,type:v}))}
                          style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:11,border:`2px solid ${defiForm.type===v?CJ.accent:"#2a2a2a"}`,background:defiForm.type===v?CJ.accent+"18":"#0d0d0d",cursor:"pointer",touchAction:"manipulation",transition:"all .15s",textAlign:"left"}}>
                          <span style={{fontSize:20}}>{icon}</span>
                          <div>
                            <div style={{fontWeight:700,fontSize:13,color:defiForm.type===v?CJ.accent:CJ.text}}>{label}</div>
                            <div style={{fontSize:11,color:CJ.muted}}>{desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ── Bouton ── */}
                <div style={{padding:"14px 18px"}}>
                  <button onClick={lancerDefi} disabled={sending}
                    style={{width:"100%",background:`linear-gradient(135deg,${CJ.accent},#ea580c)`,border:"none",color:"#fff",borderRadius:13,padding:"16px",cursor:sending?"not-allowed":"pointer",fontWeight:900,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",gap:10,touchAction:"manipulation",opacity:sending?.65:1,boxShadow:`0 6px 20px ${CJ.accent}44`}}>
                    ⚔️ DÉFIER {j.pseudo.toUpperCase()}
                  </button>
                  <div style={{textAlign:"center",color:CJ.muted,fontSize:11,marginTop:8}}>🔒 Tu seras notifié de sa réponse</div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* ── TABS ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:14}}>
        {[["analyse","📊 Analyse"],["historique","📋 Historique"],["badges","🏅 Badges"],["face","🤝 Face-à-face"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{padding:"10px 4px",borderRadius:10,border:`1px solid ${tab===t?CJ.accent:CJ.border}`,background:tab===t?CJ.accent+"22":"transparent",color:tab===t?CJ.accent:CJ.muted,fontWeight:tab===t?700:400,fontSize:10,cursor:"pointer",touchAction:"manipulation",transition:"all .15s",lineHeight:1.3}}>
            {l}
          </button>
        ))}
      </div>

      {/* ══ TAB ANALYSE ══════════════════════════════════════════════════════ */}
      {tab==="analyse"&&(
        <div>
          {/* 1 ── DANGEROSITÉ ── */}
          <div style={{...card,...sec(0),marginBottom:10,display:"flex",gap:14,alignItems:"center",border:`1px solid ${dangerColor}55`,background:`linear-gradient(135deg, ${dangerColor}18, #1a1a1a 65%)`}}>
            <CircleGauge value={dangerScore} color={dangerColor} size={96} strokeWidth={10}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:10,color:CJ.muted,fontWeight:700,letterSpacing:1,marginBottom:5,display:"flex",alignItems:"center",gap:6}}><Crosshair size={13} color={dangerColor} strokeWidth={2.5}/>DANGEROSITÉ</div>
              <div style={{fontWeight:900,fontSize:19,color:dangerColor,lineHeight:1.1}}>{dangerLabel}</div>
              <div style={{fontSize:11,color:CJ.muted,lineHeight:1.4,marginTop:4}}>{dangerDriver}</div>
            </div>
          </div>

          {/* 2 ── ANALYSE ADVERSAIRE (rapport d'éclaireur rédigé par l'IA) ── */}
          <div style={{...sec(1),marginBottom:10,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#201b3d,#0f0e16)",border:"1px solid #7c3aed66",borderRadius:16,padding:"18px 18px 20px"}}>
            <div style={{position:"absolute",top:-30,right:-20,width:130,height:130,borderRadius:"50%",background:"radial-gradient(circle,#7c3aed44,transparent 70%)"}}/>
            <div style={{position:"absolute",bottom:-40,left:-30,width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,#6d28d933,transparent 70%)"}}/>
            <div style={{position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:13}}>
                <Sparkles size={16} color="#c4b5fd" strokeWidth={2.5}/>
                <span style={{fontSize:13,color:"#c4b5fd",fontWeight:800,letterSpacing:.6}}>Analyse adversaire</span>
                <span style={{marginLeft:"auto",display:"inline-flex",alignItems:"center",gap:3,fontSize:9,color:"#c4b5fd",fontWeight:800,letterSpacing:.5,background:"#7c3aed22",border:"1px solid #7c3aed44",borderRadius:20,padding:"2px 8px"}}><Sparkles size={9} strokeWidth={2.5}/>DartPoint</span>
              </div>
              {analyseParas.map((para,i)=>(
                <p key={i} style={{color:"#d8cffb",fontSize:13,lineHeight:1.72,margin:i===0?0:"13px 0 0"}}>{renderHL(para)}</p>
              ))}
            </div>
          </div>

          {/* 3 ── FORME ACTUELLE ── */}
          <div style={{...card,...sec(2),marginBottom:10}}>
            <SecLabel icon={Flame}>FORME ACTUELLE</SecLabel>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
              <div style={{fontWeight:900,fontSize:17,color:formeColor}}>{formeLabel}</div>
              {derniers5.length>0&&(
                <div style={{display:"flex",gap:4}}>
                  {derniers5.map((d,i)=><VDBadge key={i} gagne={d.gagnant_id===joueurId} size={24}/>)}
                </div>
              )}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:3,marginTop:8}}>
              {derniers10.length>0&&<div style={{fontSize:11,color:CJ.muted}}><EmoIcon e="📋" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>{victoires10}/{derniers10.length} sur les 10 derniers ({Math.round(formePct*100)}%)</div>}
              {serieActuelle>=2&&serieType==="win"&&<div style={{fontSize:11,color:CJ.green}}><EmoIcon e="🔥" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>{serieActuelle} victoires de suite</div>}
              {serieActuelle>=2&&serieType==="loss"&&<div style={{fontSize:11,color:CJ.red}}><EmoIcon e="❄️" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>{serieActuelle} défaites de suite</div>}
              <div style={{fontSize:11,color:var7j>=0?CJ.green:CJ.red}}><EmoIcon e="📈" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>{var7j>=0?"+":""}{var7j} DRIX sur 7 jours</div>
              {deltaScoring&&Math.abs(deltaScoring)>3&&<div style={{fontSize:11,color:deltaScoring>0?CJ.green:CJ.red}}><EmoIcon e="🎯" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>Scoring {deltaScoring>0?"+":""}{deltaScoring}% vs son standard</div>}
              {duels[0]?.date&&<div style={{fontSize:11,color:CJ.muted}}><EmoIcon e="🕐" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>Dernière partie {tempsDepuisMatch(duels[0].date)}</div>}
            </div>
          </div>

          {/* 4 ── FORCES / FAIBLESSES ── */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10,...sec(3)}}>
            <div style={{...card,border:"1px solid #22c55e33",background:"linear-gradient(160deg,#0e1f14,#1a1a1a 70%)"}}>
              <div style={{fontSize:10,color:CJ.green,fontWeight:800,letterSpacing:1,marginBottom:9,display:"flex",alignItems:"center",gap:6}}><TrendingUp size={13} color={CJ.green} strokeWidth={2.5}/>FORCES</div>
              {forcesList.map((f,i)=>(
                <div key={i} style={{marginBottom:i<forcesList.length-1?9:0}}>
                  <div style={{fontWeight:700,fontSize:12,color:CJ.text}}><EmoIcon e={f.emoji} size={12} style={{verticalAlign:"-2px",marginRight:3}}/>{f.k}</div>
                  <div style={{fontSize:10,color:CJ.muted,lineHeight:1.35,marginTop:1}}>{f.detail}</div>
                </div>
              ))}
            </div>
            <div style={{...card,border:"1px solid #ef444433",background:"linear-gradient(160deg,#1f1010,#1a1a1a 70%)"}}>
              <div style={{fontSize:10,color:CJ.red,fontWeight:800,letterSpacing:1,marginBottom:9,display:"flex",alignItems:"center",gap:6}}><TrendingDown size={13} color={CJ.red} strokeWidth={2.5}/>FAIBLESSES</div>
              {faiblessesList.map((f,i)=>(
                <div key={i} style={{marginBottom:i<faiblessesList.length-1?9:0}}>
                  <div style={{fontWeight:700,fontSize:12,color:CJ.text}}><EmoIcon e={f.emoji} size={12} style={{verticalAlign:"-2px",marginRight:3}}/>{f.k}</div>
                  <div style={{fontSize:10,color:CJ.muted,lineHeight:1.35,marginTop:1}}>{f.detail}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── STYLE DE JEU ── */}
          <div style={{...card,...sec(4),marginBottom:10,border:`1px solid ${CJ.accent}33`,background:"linear-gradient(135deg,#1f1407,#1a1a1a 65%)"}}>
            <SecLabel icon={Gamepad2} color={CJ.accent}>STYLE DE JEU</SecLabel>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{display:"flex",lineHeight:1}}><EmoIcon e={styleJoueur.emoji} size={30} color={CJ.accent}/></div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:900,fontSize:17,color:CJ.accent,textTransform:"uppercase",letterSpacing:.5}}>{styleJoueur.label}</div>
                <div style={{fontSize:11,color:CJ.muted,lineHeight:1.4,marginTop:2}}>{styleJoueur.desc}</div>
              </div>
            </div>
          </div>

          {/* 5 ── FACE À FACE ── */}
          {moi&&moi.id!==j.id&&(
            <div style={{...card,...sec(5),marginBottom:10}}>
              <SecLabel icon={Swords}>FACE À FACE</SecLabel>
              {faceAFace.length===0
                ? <div style={{fontSize:11,color:CJ.muted,textAlign:"center",padding:"8px 0"}}>Vous n'avez pas encore joué ensemble.</div>
                : <>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
                      <div style={{textAlign:"center",flex:1,minWidth:0}}>
                        <div style={{fontSize:11,color:CJ.blue,fontWeight:700,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{moi.pseudo}</div>
                        <div style={{fontWeight:900,fontSize:34,color:mesVFF>=sesVFF?CJ.green:CJ.muted,lineHeight:1}}>{mesVFF}</div>
                        <div style={{fontSize:10,color:CJ.muted,marginTop:3}}>moy. {maMoyFF??"—"}</div>
                      </div>
                      <div style={{color:CJ.muted,fontSize:13,fontWeight:800}}>VS</div>
                      <div style={{textAlign:"center",flex:1,minWidth:0}}>
                        <div style={{fontSize:11,color:CJ.accent,fontWeight:700,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.pseudo}</div>
                        <div style={{fontWeight:900,fontSize:34,color:sesVFF>mesVFF?CJ.green:CJ.muted,lineHeight:1}}>{sesVFF}</div>
                        <div style={{fontSize:10,color:CJ.muted,marginTop:3}}>moy. {saMoyFF??"—"}</div>
                      </div>
                    </div>
                    <button onClick={()=>setTab("face")} style={{width:"100%",marginTop:10,background:"#ffffff08",border:`1px solid ${CJ.border}`,color:CJ.blue,borderRadius:9,padding:"7px 0",fontSize:11,fontWeight:600,cursor:"pointer",touchAction:"manipulation"}}>Voir le détail ({faceAFace.length} match{faceAFace.length>1?"s":""}) →</button>
                  </>
              }
            </div>
          )}

          {/* 6 ── CARTE DE PERFORMANCE ── */}
          <div style={{...card,...sec(6),marginBottom:10}}>
            <SecLabel icon={BarChart2}>STATISTIQUES</SecLabel>

            {/* Score Joueur — note globale + grade + profil */}
            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12,padding:"12px",borderRadius:12,background:`linear-gradient(135deg, ${scoreColor}1f, #ffffff05)`,border:`1px solid ${scoreColor}44`}}>
              <div style={{flexShrink:0,filter:reduceMotion?"none":`drop-shadow(0 0 10px ${scoreColor}55)`}}>
                <CircleGauge value={scoreJoueur} color={scoreColor} size={74} strokeWidth={8}/>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:9,color:CJ.muted,fontWeight:700,letterSpacing:.5,marginBottom:3,display:"flex",alignItems:"center",gap:5}}><Trophy size={11} color={scoreColor} strokeWidth={2.5}/>SCORE JOUEUR</div>
                <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                  <span style={{fontWeight:900,fontSize:30,color:scoreColor,lineHeight:1,textShadow:reduceMotion?"none":`0 0 14px ${scoreColor}55`}}>{grade}</span>
                  <span style={{fontSize:12,color:CJ.text,fontWeight:700}}>{tierWord}</span>
                </div>
                <div style={{fontSize:11,color:CJ.muted,marginTop:5,lineHeight:1.35}}>{profilJoueur.emoji} {profilJoueur.txt}</div>
              </div>
            </div>

            {/* Ligne 1 — Win Rate · Moyenne · Parties */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:6}}>
              <StatCell icon={Trophy} value={winRate+"%"} label="Win Rate" color={wrColor} strong={winRate>=60} gaugePct={winRate} gaugeColor={wrColor} context={ctxWR} delay={7}/>
              <StatCell icon={BarChart2} value={moyDisplay} label="Moyenne / volée" color={moyColor} strong={moyNum!=null&&moyNum>=52} gaugePct={moyNum!=null?moyPct:undefined} gaugeColor={moyColor} context={ctxMoy} delay={7.5}/>
              <StatCell icon={Swords} value={stats?.parties??0} label="Matchs joués" color={CJ.text} context={ctxParties} delay={8}/>
            </div>

            {/* Ligne 2 — Série · Record finish · 180 */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:6}}>
              <StatCell icon={serieType==="loss"?HeartCrack:Flame} value={serieActuelle>0?serieActuelle:"—"} label={serieType==="loss"?"Défaites de suite":"Victoires consécutives"} color={serieType==="loss"?CJ.red:CJ.green} strong={serieType==="win"&&serieActuelle>=3} context={serieType==="win"&&serieActuelle>0?"en cours":null} delay={8.5}/>
              <StatCell icon={Crosshair} value={recordFinish>0?recordFinish:"—"} label="Record finish" color={CJ.green} strong={recordFinish>=100} context={ctxFinish} delay={9}/>
              <StatCell icon={Zap} value={nb180>0?nb180:"—"} label="× 180 réalisés" color="#f59e0b" strong={nb180>=3} delay={9.5}/>
            </div>

            {/* Ligne 3 — Victoires · Défaites */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
              <StatCell icon={Circle} value={stats?.victoires??0} label="Victoires" color={CJ.green} delay={10}/>
              <StatCell icon={Circle} value={stats?.defaites??0} label="Défaites" color={CJ.red} delay={10.5}/>
            </div>
            {/* Ligne 4 — Fléchettes lancées (les matchs joués sont déjà en haut de la carte) */}
            <div style={{display:"grid",gridTemplateColumns:"1fr",gap:6,marginTop:6}}>
              <StatCell icon={Target} value={flechettesJ>0?flechettesJ.toLocaleString("fr-FR"):"—"} label="Fléchettes lancées" color="#f59e0b" context={flechettesJ>0&&!flechJExactes?"environ":null} delay={11}/>
            </div>
            {/* Évolution de SA moyenne — mêmes périodes que le graphique DRIX plus bas. */}
            <div style={{marginTop:10}}>
              <MoyenneEvolution moyMvts={moyMvtsJoueur}/>
            </div>
          </div>

          {/* Stats de jeu réelles (analyse des manches) */}
          <div style={{...card,...sec(7),marginBottom:10}}>
            <SecLabel icon={Dices}>STATS DE JEU RÉELLES · {A.totalLegs} manche{A.totalLegs>1?"s":""}</SecLabel>
            {A.totalLegs===0
              ? <div style={{fontSize:11,color:CJ.muted,marginTop:6}}>Aucune manche détaillée disponible pour ce joueur.</div>
              : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px",marginTop:8}}>
                  {buildStatsReelles(A).map((s,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"6px 0",borderBottom:"1px solid #ffffff0a"}}>
                      <span style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                        <span style={{flexShrink:0,display:"flex"}}><s.icon size={13} color="#64748b" strokeWidth={2.5}/></span>
                        <span style={{fontSize:10,color:"#94a3b8",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</span>
                      </span>
                      <span style={{textAlign:"right",flexShrink:0,lineHeight:1.05}}>
                        <span style={{display:"block",fontSize:14,fontWeight:900,color:s.color,textShadow:s.record?`0 0 10px ${s.color}66`:"none"}}>{s.value}</span>
                        {s.sub && <span style={{display:"block",fontSize:8,color:"#64748b",fontWeight:500,marginTop:1}}>{s.sub}</span>}
                      </span>
                    </div>
                  ))}
                </div>}
          </div>

          {/* 7 ── ÉVOLUTION DRIX (onglets période + échelle + dates) ── */}
          {drixMvts.length>=2&&(
            <div style={{...sec(8),marginBottom:10}}>
              <DrixEvolution drixMvts={drixMvts} current={j?.drix ?? drixMvts[0]?.drix_apres ?? 1000}/>
            </div>
          )}

          {/* 8 ── EXPLOITS ── */}
          {exploitsList.length>0&&(
            <div style={{...card,...sec(9),marginBottom:10,border:"1px solid #f59e0b33"}}>
              <SecLabel icon={Star} color="#f59e0b">EXPLOITS</SecLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {exploitsList.map((e,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:9,background:"#f59e0b0f",border:"1px solid #f59e0b22",borderRadius:10,padding:"8px 10px"}}>
                    <span style={{display:"flex"}}><EmoIcon e={e.emoji} size={18} color={CJ.yellow}/></span>
                    <div style={{minWidth:0}}>
                      <div style={{fontWeight:800,fontSize:13,color:CJ.yellow,lineHeight:1.1}}>{e.label}</div>
                      <div style={{fontSize:9,color:CJ.muted}}>{e.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9 ── BADGES (carrousel) ── */}
          {badgesOk.length>0&&(
            <div style={{...card,...sec(10),marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <SecLabel icon={Medal}>{totalBadgesOk} BADGE{totalBadgesOk>1?"S":""} OBTENU{totalBadgesOk>1?"S":""}</SecLabel>
                <button onClick={()=>setTab("badges")} style={{background:"none",border:"none",color:CJ.blue,cursor:"pointer",fontSize:11,fontWeight:600,touchAction:"manipulation"}}>Voir tous →</button>
              </div>
              <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:4,WebkitOverflowScrolling:"touch"}}>
                {/* La pastille garde son anneau de couleur mais le fond devient discret : un badge
                    dessiné posé sur un disque plein vif se noyait dedans. `BadgeVisual` met l'image
                    si elle existe, sinon l'emoji — la bandelette suit donc les visuels sans rien
                    savoir de qui en a un. */}
                {badgesOk.map(b=>(
                  <div key={b.id} style={{textAlign:"center",flexShrink:0,width:60}}>
                    <div style={{width:54,height:54,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%, ${b.couleur}44, ${b.couleur}14)`,border:`2px solid ${b.couleur}`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 5px",boxShadow:`0 0 14px ${b.couleur}55`,overflow:"hidden"}}>
                      <BadgeVisual b={b} size={42}/>
                    </div>
                    <div style={{fontSize:9,color:CJ.muted,fontWeight:600,lineHeight:1.2}}>{b.nom}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparaison + Probabilité côte à côte */}
          {moi&&moi.id!==j.id&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10,...sec(11)}}>
              {/* Comparaison */}
              <div style={{...card}}>
                <SecLabel icon={Scale}>COMPARAISON</SecLabel>
                {[
                  {l:"Moyenne",mine:maMoy,sienne:moyenneDuels,higher:maMoy&&moyenneDuels&&parseFloat(maMoy)>parseFloat(moyenneDuels)},
                  {l:"Win Rate",mine:monWR+"%",sienne:winRate+"%",higher:monWR>winRate},
                  {l:"Finishes",mine:"—",sienne:plusGrosFinish>0?plusGrosFinish:"—",higher:null},
                  {l:"DRIX",mine:monDrix,sienne:drix,higher:monDrix>drix},
                ].map(({l,mine,sienne,higher})=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"4px 0",borderBottom:`1px solid #ffffff08`,fontSize:11}}>
                    <span style={{color:CJ.muted,fontSize:10}}>{l}</span>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <span style={{fontWeight:700,color:higher===true?CJ.green:CJ.muted}}>{mine}</span>
                      <span style={{color:"#ffffff20",fontSize:9}}>vs</span>
                      <span style={{fontWeight:700,color:higher===false?CJ.green:CJ.red}}>{sienne}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Probabilité */}
              <div style={{...card,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center"}}>
                <SecLabel icon={Target} style={{justifyContent:"center"}}>VOS CHANCES</SecLabel>
                <CircleGauge value={probaVictoire} color={probaVictoire>=50?CJ.green:"#ef4444"} size={84} strokeWidth={9}/>
                <div style={{fontSize:10,color:CJ.muted,marginTop:6,fontWeight:700}}>{probaVictoire>=60?"Vous partez favori":probaVictoire<=40?"Vous êtes outsider":"Match serré"}</div>
              </div>
            </div>
          )}

          {/* 10 ── AFFILIATIONS ── */}
          {(bar||asso)&&(
            <div style={{display:"grid",gridTemplateColumns:bar&&asso?"1fr 1fr":"1fr",gap:8,...sec(12)}}>
              {bar&&(
                <div onClick={()=>{setBarSlug(bar.slug);setPage("bar");}} style={{...card,cursor:"pointer"}}>
                  <div style={{fontSize:10,color:CJ.muted}}><EmoIcon e="🍺" size={10} style={{verticalAlign:"-1px",marginRight:3}}/>Bar affilié</div>
                  <div style={{fontWeight:700,fontSize:13,color:CJ.accent,marginTop:2}}>{bar.nom}</div>
                  <div style={{fontSize:10,color:CJ.muted}}>📍 {bar.ville}</div>
                  <div style={{fontSize:10,color:CJ.blue,marginTop:4}}>Voir la fiche →</div>
                </div>
              )}
              {asso&&(
                <div onClick={()=>setPage("associations")} style={{...card,cursor:"pointer"}}>
                  <div style={{fontSize:10,color:CJ.muted}}><EmoIcon e="🎯" size={10} style={{verticalAlign:"-1px",marginRight:3}}/>Asso affiliée</div>
                  <div style={{fontWeight:700,fontSize:13,color:"#a78bfa",marginTop:2}}>{asso.nom}</div>
                  {asso.ville&&<div style={{fontSize:10,color:CJ.muted}}>📍 {asso.ville}</div>}
                  <div style={{fontSize:10,color:CJ.blue,marginTop:4}}>Voir la fiche →</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══ TAB HISTORIQUE ═════════════════════════════════════════════════════ */}
      {tab==="historique"&&(
        <div>
          <div style={{fontSize:11,color:CJ.muted,marginBottom:10}}>{duels.length} partie{duels.length!==1?"s":""} jouée{duels.length!==1?"s":""}</div>
          {duels.length===0
            ?<div style={{...card,textAlign:"center",padding:40,color:CJ.muted}}>Aucune partie jouée.</div>
            :duels.map(d=>{
                const isC=d.challenger_id===joueurId;
                const adv=isC?d.defie_pseudo:d.challenger_pseudo;
                const advId=isC?d.defie_id:d.challenger_id;
                const {sc,sd}=fixManches(d);
                const monM=isC?sc:sd, sonM=isC?sd:sc;
                const monMoy=isC?d.score_challenger:d.score_defie;
                const gagne=d.gagnant_id===joueurId;
                const variation=drixMvtMap[d.id];
                const isExp=expandedDuel===d.id;
                const initials=(pseudo)=>(pseudo||"?")[0].toUpperCase();
                return(
                  <div key={d.id} style={{...card,marginBottom:8}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setExpandedDuel(isExp?null:d.id)}>
                      {/* Avatar adversaire */}
                      <div style={{width:36,height:36,borderRadius:"50%",background:"#333",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:14,flexShrink:0}}>
                        {initials(adv)}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:700,fontSize:13}}>vs <span style={{color:CJ.accent,cursor:"pointer"}} onClick={e=>{e.stopPropagation();setPage("profil-joueur-"+advId);}}>{adv}</span></div>
                        <div style={{fontSize:10,color:CJ.muted}}>{d.mode} · Best of {d.manches||1}</div>
                      </div>
                      <VDBadge gagne={gagne} size={26}/>
                      <div style={{textAlign:"center",minWidth:36}}>
                        <div style={{fontWeight:900,fontSize:15}}>{monM??'?'}–{sonM??'?'}</div>
                      </div>
                      {monMoy&&<div style={{textAlign:"right",minWidth:32}}>
                        <div style={{fontSize:10,color:CJ.muted}}>Moy.</div>
                        <div style={{fontWeight:700,fontSize:12,color:CJ.blue}}>{Math.round(parseFloat(monMoy))}</div>
                      </div>}
                      {variation!==undefined&&(
                        <div style={{fontWeight:800,fontSize:12,color:variation>0?CJ.green:CJ.red,background:variation>0?"#14532d":"#7f1d1d",borderRadius:6,padding:"2px 7px",whiteSpace:"nowrap"}}>
                          {variation>0?"+":""}{variation}
                        </div>
                      )}
                      <span style={{color:CJ.muted,fontSize:12}}>›</span>
                    </div>
                    <div style={{fontSize:10,color:CJ.muted,marginTop:4,paddingLeft:46}}>{new Date(d.date).toLocaleDateString("fr-FR")}</div>
                    {isExp&&d.manches_detail&&d.manches_detail.length>0&&(
                      <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${CJ.border}`}}>
                        {d.manches_detail.map((m,i)=>(
                          <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:CJ.muted,padding:"4px 0",borderBottom:i<d.manches_detail.length-1?`1px solid ${CJ.border}22`:"none"}}>
                            <span>Manche {i+1} — 🏆 {m.winner}</span>
                            <span>{m.winner_180||0} × 180 · finish {m.winner_finish||"?"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>
      )}

      {/* ══ TAB BADGES ═════════════════════════════════════════════════════════ */}
      {tab==="badges"&&(
        <div>
          <p style={{color:CJ.muted,fontSize:13,marginBottom:16}}>{totalBadgesOk} / {ALL_BADGES.length} débloqués</p>
          {BADGE_CATS.map(cat => {
            const catBadges = ALL_BADGES.filter(b=>b.cat===cat.id);
            const catUnlocked = catBadges.filter(b=>b.val(valsComplets)>=b.seuil).length;
            return (
              <div key={cat.id} style={{marginBottom:24}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <h3 style={{fontWeight:800,fontSize:14,color:CJ.accent,letterSpacing:.5,margin:0}}>{cat.label}</h3>
                  <span style={{fontSize:11,color:CJ.muted}}>{catUnlocked}/{catBadges.length}</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
                  {catBadges.map(b=><FicheBadgeCard key={b.id} b={b}/>)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ TAB FACE-À-FACE ════════════════════════════════════════════════════ */}
      {tab==="face"&&(
        <div>
          {!moi||moi.id===j.id
            ?<div style={{...card,textAlign:"center",padding:40,color:CJ.muted}}>Connecte-toi pour voir ton face-à-face.</div>
            :faceAFace.length===0
              ?<div style={{...card,textAlign:"center",padding:40}}>
                <div style={{fontSize:40,marginBottom:12}}>🤝</div>
                <p style={{color:CJ.muted,fontSize:14,marginBottom:16}}>Vous n'avez pas encore joué ensemble.</p>
                <BtnJ onClick={()=>setPage("defi")}>⚔️ Lancer un défi</BtnJ>
              </div>
              :<>
                {/* Score global */}
                <div style={{background:"linear-gradient(135deg,#1a1a2e,#1a0800)",border:`1px solid ${CJ.accent}33`,borderRadius:18,padding:20,marginBottom:12,textAlign:"center"}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:12}}>
                    {/* Avatar moi */}
                    <div style={{textAlign:"center"}}>
                      <div style={{width:44,height:44,borderRadius:"50%",background:"#333",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:18,margin:"0 auto 6px",overflow:"hidden"}}>
                        {moi?.photo?<img src={moi.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>{(moi?.pseudo||"?")[0].toUpperCase()}</span>}
                      </div>
                      <div style={{fontSize:11,fontWeight:700}}>{moi?.pseudo?.slice(0,8)}</div>
                    </div>
                    {/* Scores */}
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{fontWeight:900,fontSize:52,color:mesVFF>=sesVFF?CJ.green:CJ.muted,lineHeight:1}}>{mesVFF}</div>
                      <div style={{color:CJ.muted,fontSize:20,fontWeight:700}}>vs</div>
                      <div style={{fontWeight:900,fontSize:52,color:sesVFF>mesVFF?CJ.green:CJ.muted,lineHeight:1}}>{sesVFF}</div>
                    </div>
                    {/* Avatar lui */}
                    <div style={{textAlign:"center"}}>
                      <div style={{width:44,height:44,borderRadius:"50%",background:"#333",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:18,margin:"0 auto 6px",overflow:"hidden"}}>
                        {j?.photo?<img src={j.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>{(j?.pseudo||"?")[0].toUpperCase()}</span>}
                      </div>
                      <div style={{fontSize:11,fontWeight:700}}>{j.pseudo?.slice(0,8)}</div>
                    </div>
                  </div>
                  <div style={{fontSize:11,color:CJ.muted,marginBottom:12}}>{faceAFace.length} confrontation{faceAFace.length!==1?"s":""}</div>
                  {/* Stats row */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,background:"#ffffff08",borderRadius:12,padding:10}}>
                    {[
                      [maMoyFF??"—","Moy.","left"],
                      [monWRFF+"%","Win Rate","left"],
                      [sonWRFF+"%","Win Rate","right"],
                      [saMoyFF??"—","Moy.","right"],
                    ].map(([v,l,side],i)=>(
                      <div key={i} style={{textAlign:"center"}}>
                        <div style={{fontWeight:800,fontSize:15,color:i<2?CJ.blue:CJ.accent}}>{v}</div>
                        <div style={{fontSize:9,color:CJ.muted}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 3 stats bas */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                  <div style={{...card,textAlign:"center"}}>
                    <div style={{fontSize:10,color:CJ.muted,marginBottom:4}}>DRIX sur vos duels</div>
                    <div style={{fontWeight:900,fontSize:18,color:drixFF>=0?CJ.green:CJ.red}}>{drixFF>0?"+":""}{drixFF||"—"}</div>
                  </div>
                  <div style={{...card,textAlign:"center"}}>
                    <div style={{fontSize:10,color:CJ.muted,marginBottom:4}}>Dernier vainqueur</div>
                    <div style={{fontWeight:700,fontSize:12,color:dernierFF?.gagnant_id===moi.id?CJ.blue:CJ.accent}}>
                      {dernierFF?(dernierFF.gagnant_id===moi.id?moi.pseudo:j.pseudo):"—"}
                    </div>
                  </div>
                  <div style={{...card,textAlign:"center"}}>
                    <div style={{fontSize:10,color:CJ.muted,marginBottom:4}}>Plus grosse victoire</div>
                    <div style={{fontWeight:700,fontSize:14,color:CJ.green}}>{plusGrosseVictoire?.score||"—"}</div>
                  </div>
                </div>
                {/* Historique FF */}
                <div style={{fontSize:10,color:CJ.muted,fontWeight:700,letterSpacing:1,marginBottom:8}}>TOUTES LES CONFRONTATIONS</div>
                {faceAFace.map(d=>{
                  const isC=d.challenger_id===moi.id;
                  const {sc,sd}=fixManches(d);
                  const monM=isC?sc:sd, sonM=isC?sd:sc;
                  const gagne=d.gagnant_id===moi.id;
                  return(
                    <div key={d.id} style={{...card,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:13}}>{d.mode}</div>
                        <div style={{fontSize:10,color:CJ.muted}}>{new Date(d.date).toLocaleDateString("fr-FR")}</div>
                      </div>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontWeight:800,fontSize:15}}>{monM??'?'}–{sonM??'?'}</span>
                        <VDBadge gagne={gagne} size={28}/>
                      </div>
                    </div>
                  );
                })}
              </>
          }
        </div>
      )}
    </div>
  );
};

// ── ANALYSE JOUEUR (réutilisable) — rapport de scouting, version « soi-même » ───
// Reçoit les données déjà chargées (stats, duels, drixMvts) et rend les sections
// d'analyse : niveau, analyse DartPoint rédigée, forme, forces/faiblesses, style,
// carte de performance, stats réelles, courbe DRIX, exploits.
export const JoueurAnalyse = ({ j, stats, duels:duelsRaw=[], drixMvts=[] }) => {
  const reduceMotion = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sec = (i=0) => reduceMotion ? {} : { animation:"dpFade .45s ease both", animationDelay:`${(0.045*i).toFixed(2)}s` };

  // ── Sous-composants ──
  const CircleGauge = ({ value, max=100, color, size=90, strokeWidth=9 }) => {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const fill = Math.min(1, value / max) * circ;
    const off  = circ - fill;
    return (
      <svg width={size} height={size} style={{ display:"block" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ffffff10" strokeWidth={strokeWidth}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circ} strokeDashoffset={reduceMotion ? off : circ} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={reduceMotion ? undefined : { ["--dp-circ"]: circ, ["--dp-off"]: off, animation:"dpDraw 1.1s ease forwards" }}/>
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" style={{ fill:"#f1f5f9", fontWeight:900, fontSize:size*0.24 }}>{value}</text>
        <text x={size/2} y={size/2+size*0.22} textAnchor="middle" dominantBaseline="middle" style={{ fill:"#94a3b8", fontWeight:400, fontSize:size*0.13 }}>/{max}</text>
      </svg>
    );
  };
  const VDBadge = ({ gagne, size=30 }) => (
    <div style={{ width:size, height:size, borderRadius:"50%", background:gagne?"#16a34a":"#dc2626", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:size*0.42, color:"#fff", flexShrink:0 }}>{gagne?"V":"D"}</div>
  );
  const MiniBar = ({ pct, color }) => (
    <div style={{ height:5, borderRadius:3, background:"#ffffff14", overflow:"hidden", marginTop:7 }}>
      <div style={{ height:"100%", width:`${Math.max(3,Math.min(100,pct))}%`, background:color, borderRadius:3, transformOrigin:"left", animation:reduceMotion?undefined:"dpBar .9s ease both" }}/>
    </div>
  );
  const StatCell = ({ icon:Icon, value, label, color="#f1f5f9", strong=false, gaugePct, gaugeColor, context, delay=0 }) => (
    <div style={{ background: strong ? color+"14" : "#ffffff06", border: strong ? `1px solid ${color}55` : "1px solid transparent", boxShadow: (strong && !reduceMotion) ? `0 0 16px ${color}33` : "none", borderRadius:11, padding:"11px 9px", position:"relative", textAlign:"center", ...sec(delay) }}>
      {strong && <span style={{ position:"absolute", top:6, right:7, display:"flex" }}><Star size={9} color="#fbbf24" fill="#fbbf24"/></span>}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
        {Icon && <Icon size={14} color={color} strokeWidth={2.5}/>}
        <span style={{ fontWeight:900, fontSize:18, color, lineHeight:1 }}>{value}</span>
      </div>
      <div style={{ fontSize:9, color:CJ.muted, fontWeight:600, marginTop:4, lineHeight:1.2 }}>{label}</div>
      {gaugePct!=null && <MiniBar pct={gaugePct} color={gaugeColor||color}/>}
      {context && <div style={{ fontSize:8.5, color, fontWeight:600, marginTop:5, opacity:.85 }}>{context}</div>}
    </div>
  );

  // ── Données dérivées ──
  const joueurId = j.id;
  const duels = (duelsRaw||[]).filter(d=>d.statut==="termine").sort((a,b)=>(b.date||0)-(a.date||0));
  const drix = j.drix||1000;
  const winRate = stats?.parties>0 ? Math.round((stats.victoires/stats.parties)*100) : 0;
  const card = {background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:14,padding:14};
  const labelSt = {fontSize:10,color:CJ.muted,fontWeight:700,letterSpacing:1,marginBottom:6,display:"block"};

  const getScores = (list, id) => list.map(d => parseFloat(d.challenger_id===id ? d.score_challenger : d.score_defie)).filter(s => !isNaN(s) && s > 0);
  const moyAll = getScores(duels, joueurId);
  const moyenneDuels = moyAll.length > 0 ? (moyAll.reduce((a,b)=>a+b,0)/moyAll.length).toFixed(1) : null;

  let nb180=0, plusGrosFinish=0;
  // Même calcul que sur la fiche d'un autre joueur : compte exact si la manche le stocke,
  // sinon volées × 3 (juste sauf sur la dernière volée d'une manche) → mention « environ ».
  let flechettesA = 0, flechAExactes = true;
  duels.forEach(d => { (d.manches_detail||[]).forEach(m => {
    const isChallenger = d.challenger_id === joueurId;
    const myPseudoAtTime = isChallenger ? (d.challenger_pseudo || j.pseudo) : (d.defie_pseudo || j.pseudo);
    const isW = m.winner === myPseudoAtTime || m.winner === j.pseudo;
    nb180 += isW ? (m.winner_180||0) : (m.loser_180||0);
    if (isW) plusGrosFinish = Math.max(plusGrosFinish, m.winner_finish||0);
    const fl = isW ? m.winner_flech : m.loser_flech;
    if (fl != null) flechettesA += fl;
    else { flechettesA += (isW ? (m.winner_volees||0) : (m.loser_volees||0)) * 3; flechAExactes = false; }
  }); });

  let serieActuelle = 0, serieType = null;
  for (const d of duels) {
    const gagne = d.gagnant_id === joueurId;
    if (serieType === null) { serieType = gagne?"win":"loss"; serieActuelle = 1; }
    else if ((gagne && serieType==="win") || (!gagne && serieType==="loss")) serieActuelle++;
    else break;
  }

  const derniers5 = duels.slice(0,5);
  const derniers10 = duels.slice(0, 10);
  const victoires10 = derniers10.filter(d => d.gagnant_id === joueurId).length;
  const formePct = derniers10.length > 0 ? victoires10 / derniers10.length : 0;
  const scores10 = getScores(derniers10, joueurId);
  const moy10 = scores10.length > 0 ? scores10.reduce((a,b)=>a+b,0)/scores10.length : null;
  const deltaScoring = moy10 && moyenneDuels ? Math.round((moy10 - parseFloat(moyenneDuels)) / parseFloat(moyenneDuels) * 100) : null;
  const formeLabel = formePct >= 0.7 ? "🔥 Très en forme" : formePct >= 0.5 ? "✅ En forme" : formePct >= 0.3 ? "😐 Forme moyenne" : "📉 En difficulté";
  const formeColor = formePct >= 0.7 ? "#22c55e" : formePct >= 0.5 ? "#60a5fa" : formePct >= 0.3 ? "#f59e0b" : "#ef4444";
  const tempsDepuisMatch = (date) => { const diff = Date.now()-(date||0); const h = Math.floor(diff/3600000); if(h<1) return "il y a moins d'1h"; if(h<24) return `il y a ${h}h`; return `il y a ${Math.floor(h/24)}j`; };

  // ── Analyse fine des manches ──
  const A = (() => {
    let legsWon=0, legsLost=0, legVol=0, sumMoyW=0, volMoy=0;
    let n180=0, n140=0, n100=0, n26=0, coAttempts=0, coWon=0;
    const legMoys=[]; const finishes=[];
    let firstPlayed=0, firstWon=0, decPlayed=0, decWon=0;
    for (const d of duels) {
      const isChal = d.challenger_id === joueurId;
      const myP = isChal ? (d.challenger_pseudo || j.pseudo) : (d.defie_pseudo || j.pseudo);
      const md = d.manches_detail || [];
      md.forEach(m => {
        const isW = m.winner === myP || m.winner === j.pseudo;
        const vol = (isW ? m.winner_volees : m.loser_volees) || 0;
        const moy = (isW ? m.winner_moy    : m.loser_moy)    || 0;
        if (isW) legsWon++; else legsLost++;
        if (moy>0){ legMoys.push(moy); sumMoyW += moy*Math.max(1,vol); volMoy += Math.max(1,vol); }
        legVol += vol;
        n180 += (isW?m.winner_180:m.loser_180)||0;
        n140 += (isW?m.winner_140plus:m.loser_140plus)||0;
        n100 += (isW?m.winner_100plus:m.loser_100plus)||0;
        n26  += (isW?m.winner_26:m.loser_26)||0;
        const coAtt = (isW?m.winner_checkout_attempts:m.loser_checkout_attempts)||0; coAttempts += coAtt;
        // Checkout % = manches gagnées AVEC tentative / total tentatives (même population que PageProfilStats).
        if (isW){ if (coAtt>0) coWon++; if ((m.winner_finish||0)>0) finishes.push(m.winner_finish); }
      });
      if (md.length>=1){ firstPlayed++; const f=md[0]; if (f.winner===myP||f.winner===j.pseudo) firstWon++; }
      if (md.length>=3){ decPlayed++; const last=md[md.length-1]; if (last.winner===myP||last.winner===j.pseudo) decWon++; }
    }
    const totalLegs = legsWon+legsLost;
    const avgReel = volMoy>0 ? Math.round(sumMoyW/volMoy) : (moyenneDuels?Math.round(parseFloat(moyenneDuels)):null);
    const checkoutPct = coAttempts>0 ? Math.round(coWon/coAttempts*100) : null;
    const tonPlus = n180+n140+n100;
    const tonRate = legVol>0 ? Math.round(tonPlus/legVol*100) : null;
    const rate180 = totalLegs>0 ? +(n180/totalLegs).toFixed(2) : 0;
    const mean = legMoys.length ? legMoys.reduce((a,b)=>a+b,0)/legMoys.length : 0;
    const stdev = legMoys.length>1 ? Math.sqrt(legMoys.map(x=>(x-mean)**2).reduce((a,b)=>a+b,0)/legMoys.length) : null;
    const regularite = stdev==null ? null : Math.max(0,Math.min(100,Math.round(100-stdev*4)));
    const dechetRate = legVol>0 ? Math.round(n26/legVol*100) : null;
    const firstLegPct = firstPlayed>=4 ? Math.round(firstWon/firstPlayed*100) : null;
    const deciderPct  = decPlayed>=3  ? Math.round(decWon/decPlayed*100)    : null;
    const bestFinish  = finishes.length ? Math.max(...finishes) : 0;
    return { totalLegs, legsWon, legsLost, avgReel, checkoutPct, coAttempts, coWon, n180, tonRate, rate180,
             regularite, stdev, dechetRate, firstLegPct, firstPlayed, firstWon, deciderPct, decPlayed, decWon, bestFinish };
  })();

  // Dangerosité (indice de menace)
  const dangerScore = Math.min(100, Math.round(
      (winRate*0.30) + (formePct*20) + Math.min(20, Math.max(0,(drix-900)/50)) +
      (A.avgReel!=null ? Math.min(15, Math.max(0,(A.avgReel-30)/3)) : 0) +
      (A.checkoutPct!=null ? Math.min(10, A.checkoutPct/10) : 0) + Math.min(5, A.n180)
  ));
  const dangerColor = dangerScore>=75?"#ef4444":dangerScore>=50?"#f97316":dangerScore>=25?"#f59e0b":"#22c55e";
  const dangerLabel = dangerScore>=75?"Joueur dangereux":dangerScore>=50?"Adversaire solide":dangerScore>=30?"À surveiller":"Accessible";
  const dangerDriver =
      (A.checkoutPct!=null && A.checkoutPct>=45) ? `porté par ton checkout (${A.checkoutPct}%)` :
      (A.avgReel!=null && A.avgReel>=52)         ? `porté par ton scoring (moy ${A.avgReel})` :
      (winRate>=58)                              ? `porté par ton taux de victoire (${winRate}%)` :
      (formePct>=0.6)                            ? `porté par ta forme du moment` :
      (dangerScore<30)                           ? `profil encore tendre, à consolider` : `profil équilibré`;

  // Tendance DRIX
  const now = Date.now();
  const var7j = drixMvts.filter(m=>(now-(m.date||0))<7*86400000).reduce((s,m)=>s+(m.variation||0),0);

  // Style
  const styleJoueur = (() => {
    if (A.checkoutPct!=null && A.checkoutPct>=50 && winRate>=52) return {label:"Le Finisher",desc:`Tueur au checkout (${A.checkoutPct}%), capitalise chaque ouverture`,emoji:"🎯"};
    if (A.avgReel!=null && A.avgReel>=55 && A.n180>=5)           return {label:"Le Bulldozer",desc:`Scoring lourd (moy ${A.avgReel}, ${A.n180}×180), passe en force`,emoji:"💣"};
    if (A.regularite!=null && A.regularite>=65 && winRate>=48)   return {label:"Le Métronome",desc:`Très constant (régularité ${A.regularite}/100), dur à surprendre`,emoji:"⚙️"};
    if (A.deciderPct!=null && A.deciderPct>=55)                  return {label:"Le Clutch",desc:`Hausse ton niveau dans les manches décisives (${A.deciderPct}%)`,emoji:"🧊"};
    if (winRate>=60 && (stats?.parties||0)>=20)                 return {label:"Le Champion",desc:`Palmarès solide : ${winRate}% sur ${stats.parties} matchs`,emoji:"🏆"};
    if (A.dechetRate!=null && A.dechetRate>=14)                 return {label:"Le Flambeur",desc:`Explosif mais irrégulier (${A.dechetRate}% de volées faibles)`,emoji:"🎲"};
    if (winRate<40)                                            return {label:"En reconstruction",desc:`Cherche encore ton rythme (${winRate}% de victoires)`,emoji:"🌱"};
    if (serieType==="win"&&serieActuelle>=3)                    return {label:"En feu",desc:`Série de ${serieActuelle} victoires en cours`,emoji:"🔥"};
    return {label:"Le Combattant",desc:"Polyvalent, s'accroche dans tous les matchs",emoji:"⚔️"};
  })();

  // Point fort
  const pointFortObj = (() => {
    const forces = [
      A.checkoutPct!=null && A.checkoutPct>=45 ? {k:"Finishing",  detail:`${A.checkoutPct}% au checkout (${A.coWon}/${A.coAttempts} converties)`, emoji:"🎯", score:A.checkoutPct} : null,
      A.avgReel!=null     && A.avgReel>=50     ? {k:"Scoring",    detail:`Moyenne réelle de ${A.avgReel} pts/volée`,                            emoji:"💥", score:A.avgReel} : null,
      A.n180>=3                                ? {k:"Les 180",    detail:`${A.n180} maximums (${A.rate180}/manche)`,                            emoji:"🔥", score:50+A.n180} : null,
      A.regularite!=null  && A.regularite>=60  ? {k:"Régularité", detail:`Très constant — régularité ${A.regularite}/100`,                       emoji:"⚙️", score:A.regularite} : null,
      A.deciderPct!=null  && A.deciderPct>=55  ? {k:"Clutch",     detail:`${A.deciderPct}% de manches décisives gagnées`,                       emoji:"🧊", score:A.deciderPct} : null,
      winRate>=58                              ? {k:"Win rate",   detail:`${winRate}% de victoires sur ${stats?.parties||0} matchs`,             emoji:"🏆", score:winRate} : null,
    ].filter(Boolean).sort((a,b)=>b.score-a.score);
    return forces[0] || {k:"En construction", detail:"Pas encore assez de matchs pour dégager une force nette", emoji:"🌱"};
  })();

  // Point faible
  const pointFaibleAnalyse = (() => {
    const faib = [
      A.checkoutPct!=null && A.checkoutPct<35 && A.coAttempts>=6 ? {k:"Finishing",         detail:`${A.checkoutPct}% au checkout — laisse filer des manches gagnables`, emoji:"🛡️", score:100-A.checkoutPct} : null,
      A.dechetRate!=null  && A.dechetRate>=12                    ? {k:"Déchets",           detail:`${A.dechetRate}% de volées faibles (≤26) — trous de scoring`,       emoji:"🕳️", score:A.dechetRate} : null,
      A.regularite!=null  && A.regularite<40                     ? {k:"Irrégularité",      detail:`En dents de scie (écart-type ${Math.round(A.stdev)})`,              emoji:"🎢", score:100-A.regularite} : null,
      A.firstLegPct!=null && A.firstLegPct<40                    ? {k:"Entames",           detail:`Ne gagne que ${A.firstLegPct}% des 1ʳᵉˢ manches`,                  emoji:"🐢", score:100-A.firstLegPct} : null,
      A.deciderPct!=null  && A.deciderPct<40                     ? {k:"Manches décisives", detail:`${A.deciderPct}% en manche décisive — craque sous pression`,       emoji:"😰", score:100-A.deciderPct} : null,
      winRate<42                                                ? {k:"Taux de victoire",  detail:`${winRate}% seulement — résultats fragiles`,                       emoji:"📉", score:100-winRate} : null,
      formePct<0.4 && derniers10.length>=5                      ? {k:"Forme",             detail:`${victoires10}/${derniers10.length} récemment — en perte de vitesse`, emoji:"❄️", score:100-formePct*100} : null,
    ].filter(Boolean).sort((a,b)=>b.score-a.score);
    return faib[0] || {k:"Peu d'écueils", detail:"Profil équilibré, pas de faiblesse marquée", emoji:"✨"};
  })();

  // Début / fin de match
  const debutObj = A.firstLegPct!=null
    ? (A.firstLegPct>=55 ? {label:"Entame en force",   detail:`Tu gagnes ${A.firstLegPct}% des 1ʳᵉˢ manches (${A.firstWon}/${A.firstPlayed})`, color:CJ.green,  emoji:"⚡"}
      : A.firstLegPct>=40 ? {label:"Entame équilibrée", detail:`${A.firstLegPct}% des 1ʳᵉˢ manches remportées`,                            color:CJ.yellow, emoji:"⚖️"}
      :                     {label:"Démarrage lent",   detail:`${A.firstLegPct}% des 1ʳᵉˢ manches — souvent mené au départ`,              color:CJ.red,    emoji:"🐢"})
    : (A.avgReel!=null
        ? {label: A.avgReel>=48?"Bon rythme":"Monte en régime", detail:`Moyenne ${A.avgReel} pts/volée — trop peu de matchs multi-manches pour juger l'entame`, color: A.avgReel>=48?CJ.green:CJ.yellow, emoji: A.avgReel>=48?"⚡":"😴"}
        : {label:"Données insuffisantes", detail:"Trop peu de matchs pour analyser les entames", color:CJ.muted, emoji:"❔"});
  const finObj = A.deciderPct!=null
    ? (A.deciderPct>=55 ? {label:"Glacé dans le money-time", detail:`${A.deciderPct}% de manches décisives gagnées (${A.decWon}/${A.decPlayed})`, color:CJ.green,  emoji:"🧊"}
      : A.deciderPct>=40 ? {label:"Correct sous pression",   detail:`${A.deciderPct}% dans les manches décisives`,                               color:CJ.yellow, emoji:"🛡"}
      :                    {label:"Craque dans le money-time", detail:`${A.deciderPct}% en manche décisive — perd les matchs serrés`,           color:CJ.red,    emoji:"📉"})
    : (A.checkoutPct!=null
        ? {label: A.checkoutPct>=40?"Finit ses matchs":"Fragile à la conclusion", detail:`Checkout ${A.checkoutPct}% — peu de matchs à rallonge pour juger le money-time`, color: A.checkoutPct>=40?CJ.green:CJ.yellow, emoji: A.checkoutPct>=40?"🛡":"😬"}
        : {label:"Données insuffisantes", detail:"Pas encore de manches décisives jouées", color:CJ.muted, emoji:"❔"});

  // Forces / Faiblesses agrégées
  const forcesList = [
    { emoji: pointFortObj.emoji, k: pointFortObj.k, detail: pointFortObj.detail },
    debutObj.color===CJ.green ? { emoji: debutObj.emoji, k: debutObj.label, detail: debutObj.detail } : null,
    finObj.color===CJ.green   ? { emoji: finObj.emoji,   k: finObj.label,   detail: finObj.detail }   : null,
    (A.tonRate!=null && A.tonRate>=25) ? { emoji:"💥", k:"Gros scoring", detail:`${A.tonRate}% de volées à 100+` } : null,
  ].filter(Boolean).slice(0,4);
  const faiblessesList = [
    { emoji: pointFaibleAnalyse.emoji, k: pointFaibleAnalyse.k, detail: pointFaibleAnalyse.detail },
    debutObj.color===CJ.red ? { emoji: debutObj.emoji, k: debutObj.label, detail: debutObj.detail } : null,
    finObj.color===CJ.red   ? { emoji: finObj.emoji,   k: finObj.label,   detail: finObj.detail }   : null,
  ].filter(Boolean).slice(0,3);

  // Exploits
  const exploitsList = [
    plusGrosFinish>=60 ? { emoji:"🎯", label:`Finish ${plusGrosFinish}`, sub:"meilleur checkout" } : null,
    nb180>0 ? { emoji:"💥", label:`${nb180} × 180`, sub:nb180>1?"maximums":"maximum" } : null,
    (serieType==="win" && serieActuelle>=2) ? { emoji:"🔥", label:`${serieActuelle} de suite`, sub:"série en cours" } : null,
    var7j>0 ? { emoji:"📈", label:`+${var7j} DRIX`, sub:"cette semaine" } : null,
    (A.checkoutPct!=null && A.checkoutPct>=45) ? { emoji:"🏹", label:`${A.checkoutPct}% checkout`, sub:"finisseur" } : null,
    (A.avgReel!=null && A.avgReel>=55) ? { emoji:"⚡", label:`${A.avgReel} moy.`, sub:"scoring lourd" } : null,
  ].filter(Boolean);

  // Analyse DartPoint — rapport rédigé en « tu »
  const analyseParas = (() => {
    const P = [];
    const dWord = dangerScore>=70 ? "élevé" : dangerScore>=45 ? "notable" : dangerScore>=25 ? "modéré" : "faible";
    const dangerNoun = dangerScore>=75 ? "un joueur dangereux" : dangerScore>=50 ? "un adversaire solide" : dangerScore>=30 ? "un adversaire à surveiller" : "un adversaire accessible";
    let appui;
    if (A.avgReel!=null && (A.checkoutPct==null || A.avgReel>=50)) appui = `tu t'appuies avant tout sur ton scoring, avec une moyenne de ${A.avgReel} points par volée`;
    else if (A.checkoutPct!=null && A.checkoutPct>=42)            appui = `tu es redoutable à la conclusion avec ${A.checkoutPct}% au checkout`;
    else if (winRate>=55)                                         appui = `tu es porté par un solide taux de victoire de ${winRate}%`;
    else if (formePct>=0.6)                                       appui = `tu es surtout dangereux par ta dynamique du moment`;
    else                                                          appui = `tu es encore en construction, mais déjà à surveiller`;
    P.push(`Indice de menace ${dWord} (${dangerScore}/100). Pour tes adversaires, tu es ${dangerNoun} : ${appui}.`);

    if (A.firstLegPct!=null || A.deciderPct!=null) {
      const bits = [];
      if (A.firstLegPct!=null) {
        const w = A.firstLegPct>=55 ? "Tu démarres très fort tes rencontres" : A.firstLegPct>=42 ? "Tu négocies correctement tes entames" : "Tu mets du temps à te mettre en route";
        bits.push(`${w} avec ${A.firstLegPct}% de premières manches remportées`);
      }
      if (A.deciderPct!=null) {
        const w = A.deciderPct>=55 ? `tu restes particulièrement performant dans les manches décisives (${A.deciderPct}%)` : A.deciderPct>=42 ? `tu tiens correctement le money-time (${A.deciderPct}%)` : `tu as tendance à lâcher dans les manches décisives (${A.deciderPct}%)`;
        bits.push((bits.length ? "et " : "Tu ")+w);
      }
      P.push(bits.join(" ")+".");
    } else if (A.n180>0 || (A.tonRate!=null && A.tonRate>=15)) {
      P.push(`Ta force, c'est la puissance de frappe : ${A.n180>0 ? `${A.n180}×180` : `${A.tonRate}% de volées à 100+`} sur les manches analysées.`);
    } else if (pointFortObj.k!=="En construction") {
      P.push(`Ta principale force se situe sur ${pointFortObj.k.toLowerCase()} — ${pointFortObj.detail.toLowerCase()}.`);
    } else {
      P.push(`Il te manque encore des matchs pour dégager une tendance nette, mais le potentiel est là.`);
    }

    if (pointFaibleAnalyse.k==="Peu d'écueils") {
      P.push(`Difficile de te trouver une vraie faiblesse : ton profil est équilibré, sans point de rupture évident.`);
    } else {
      P.push(`Ton principal point faible reste ${pointFaibleAnalyse.k.toLowerCase()} : ${pointFaibleAnalyse.detail.toLowerCase()}, ce qui peut te coûter des manches pourtant bien engagées.`);
    }

    if (derniers10.length>=3) {
      const dyn = formePct>=0.7 ? "excellente" : formePct>=0.5 ? "correcte" : formePct>=0.3 ? "en dents de scie" : "compliquée";
      let f = `Ta dynamique est ${dyn} : ${victoires10} victoire${victoires10>1?"s":""} sur tes ${derniers10.length} derniers matchs`;
      if (serieActuelle>=2 && serieType==="win")  f += ` et une série active de ${serieActuelle} succès consécutifs`;
      else if (serieActuelle>=2 && serieType==="loss") f += `, plombée par ${serieActuelle} défaites de rang`;
      if (deltaScoring && Math.abs(deltaScoring)>5) f += `. Ton scoring est d'ailleurs ${deltaScoring>0?"en hausse":"en baisse"} de ${Math.abs(deltaScoring)}% par rapport à ton standard`;
      P.push(f+".");
    }

    const axe = (A.checkoutPct!=null && A.checkoutPct<38) ? "ta finition au checkout — c'est là que tu laisses le plus de points"
              : (A.firstLegPct!=null && A.firstLegPct<45) ? "tes entames de manche pour ne plus courir après le score"
              : (A.deciderPct!=null && A.deciderPct<45)   ? "ta gestion des manches décisives"
              : (A.dechetRate!=null && A.dechetRate>=12)  ? "ta régularité pour éliminer les trous de scoring"
              :                                             "ton scoring pur pour passer un palier";
    const niveauTxt = dangerScore>=60 ? "un profil déjà très solide" : dangerScore>=40 ? "un profil sérieux en pleine montée" : "un profil prometteur encore en construction";
    P.push(`Au global, DartPoint te classe comme ${niveauTxt}. Pour franchir un cap, le plus rentable est de travailler ${axe}.`);
    return P;
  })();

  // Mise en valeur des chiffres dans le texte
  const HL_RE   = /(\d+\s?\/\s?100|\d+\s?%|\d+\s?(?:pts|points?|victoires?|succès|manches?)|\d+×\d+)/g;
  const HL_TEST = /^(?:\d+\s?\/\s?100|\d+\s?%|\d+\s?(?:pts|points?|victoires?|succès|manches?)|\d+×\d+)$/;
  const hlStyle = { color:"#ffffff", fontWeight:800, textShadow:"0 0 9px #a855f7aa" };
  const renderHL = (text) => String(text).split(HL_RE).map((part,i)=> HL_TEST.test(part) ? <span key={i} style={hlStyle}>{part}</span> : part);

  // Carte de performance — Score Joueur
  const moyNum     = moyenneDuels!=null ? parseFloat(moyenneDuels) : (A.avgReel ?? null);
  const moyDisplay = moyenneDuels!=null ? moyenneDuels : (A.avgReel!=null ? A.avgReel : "—");
  const moyPct     = moyNum!=null ? Math.max(0, Math.min(100, ((moyNum-25)/35)*100)) : 0;
  const moyColor   = moyNum==null ? CJ.muted : moyNum>=52 ? "#22c55e" : moyNum>=42 ? "#f59e0b" : "#ef4444";
  const wrColor    = winRate>=60 ? "#22c55e" : winRate>=45 ? "#f59e0b" : "#ef4444";
  const recordFinish = plusGrosFinish || A.bestFinish || 0;
  const scoreJoueur = (() => {
    const wrN  = winRate/100;
    const avgN = moyNum!=null ? Math.max(0, Math.min(1, (moyNum-25)/35)) : 0;
    const finN = A.checkoutPct!=null ? Math.min(1, A.checkoutPct/55) : (recordFinish>0 ? Math.min(1, recordFinish/130) : 0);
    const strN = serieType==="win" ? Math.min(1, serieActuelle/8) : 0;
    const expN = Math.min(1, (stats?.parties||0)/60);
    return Math.max(1, Math.min(100, Math.round(wrN*35 + avgN*25 + finN*15 + strN*10 + expN*15)));
  })();
  const grade      = scoreJoueur>=92?"S":scoreJoueur>=85?"A":scoreJoueur>=78?"A-":scoreJoueur>=70?"B+":scoreJoueur>=62?"B":scoreJoueur>=54?"C+":scoreJoueur>=46?"C":scoreJoueur>=38?"D":"E";
  const scoreColor = scoreJoueur>=85?"#fbbf24":scoreJoueur>=70?"#22c55e":scoreJoueur>=55?"#84cc16":scoreJoueur>=40?"#f59e0b":"#ef4444";
  const tierWord   = scoreJoueur>=85?"Élite":scoreJoueur>=70?"Très bon niveau":scoreJoueur>=55?"Bon niveau":scoreJoueur>=40?"Niveau correct":"En développement";
  const profilJoueur = (() => {
    if (serieType==="win" && serieActuelle>=4)     return { emoji:"🔥", txt:"En confiance, sur une série en cours." };
    if (winRate>=65 && (stats?.parties||0)>=20)    return { emoji:"⚔️", txt:"Gros compétiteur au palmarès solide." };
    if (moyNum!=null && moyNum>=52)                return { emoji:"🎯", txt:"Scoreur régulier avec une grosse moyenne." };
    if (A.checkoutPct!=null && A.checkoutPct>=45)  return { emoji:"🏹", txt:"Finisseur clinique, dangereux à l'arrivée." };
    if (winRate>=55)                               return { emoji:"🏆", txt:"Joueur performant, bon taux de victoire." };
    if ((stats?.parties||0)<8)                     return { emoji:"🌱", txt:"Profil jeune, encore en rodage." };
    if (winRate<40 && (stats?.parties||0)>=8)      return { emoji:"📉", txt:"En reconstruction, cherche son rythme." };
    return { emoji:"⚖️", txt:"Joueur polyvalent et équilibré." };
  })();
  const ctxWR      = winRate>=60?"Excellent":winRate>=50?"Au-dessus de la moyenne":winRate>=42?"Dans la moyenne":"À consolider";
  const ctxMoy     = moyNum==null?null:moyNum>=55?"Très haut niveau":moyNum>=48?"Niveau confirmé":moyNum>=40?"Niveau intermédiaire":"En progression";
  const ctxParties = (stats?.parties||0)>=50?"Très expérimenté":(stats?.parties||0)>=20?"Expérimenté":(stats?.parties||0)>=8?"Joueur régulier":"Débutant";
  const ctxFinish  = recordFinish>=120?"Niveau élite":recordFinish>=100?"Gros finish":recordFinish>=60?"Bon finish":recordFinish>0?"À améliorer":null;


  if (!duels.length && !stats) return null;

  return (
    <div style={{ marginBottom:14 }}>
      <style>{`
@keyframes dpFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes dpDraw{from{stroke-dashoffset:var(--dp-circ)}to{stroke-dashoffset:var(--dp-off)}}
@keyframes dpBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
`}</style>

      <div style={{fontWeight:800,fontSize:14,marginBottom:12,color:CJ.text,letterSpacing:0.5,display:"flex",alignItems:"center",gap:7}}><Sparkles size={15} color={CJ.accent} strokeWidth={2.5}/>ANALYSE DE TON JEU</div>

      {/* 1 ── NIVEAU DE MENACE ── */}
      <div style={{...card,...sec(0),marginBottom:10,display:"flex",gap:14,alignItems:"center",border:`1px solid ${dangerColor}55`,background:`linear-gradient(135deg, ${dangerColor}18, #1a1a1a 65%)`}}>
        <CircleGauge value={dangerScore} color={dangerColor} size={96} strokeWidth={10}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:10,color:CJ.muted,fontWeight:700,letterSpacing:1,marginBottom:5,display:"flex",alignItems:"center",gap:6}}><Crosshair size={13} color={dangerColor} strokeWidth={2.5}/>TON NIVEAU DE MENACE</div>
          <div style={{fontWeight:900,fontSize:19,color:dangerColor,lineHeight:1.1}}>{dangerLabel}</div>
          <div style={{fontSize:11,color:CJ.muted,lineHeight:1.4,marginTop:4}}>{dangerDriver}</div>
        </div>
      </div>

      {/* 2 ── ANALYSE DARTPOINT ── */}
      <div style={{...sec(1),marginBottom:10,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#201b3d,#0f0e16)",border:"1px solid #7c3aed66",borderRadius:16,padding:"18px 18px 20px"}}>
        <div style={{position:"absolute",top:-30,right:-20,width:130,height:130,borderRadius:"50%",background:"radial-gradient(circle,#7c3aed44,transparent 70%)"}}/>
        <div style={{position:"absolute",bottom:-40,left:-30,width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,#6d28d933,transparent 70%)"}}/>
        <div style={{position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:13}}>
            <Sparkles size={16} color="#c4b5fd" strokeWidth={2.5}/>
            <span style={{fontSize:13,color:"#c4b5fd",fontWeight:800,letterSpacing:.6}}>Ton analyse</span>
            <span style={{marginLeft:"auto",fontSize:9,color:"#c4b5fd",fontWeight:800,letterSpacing:.5,background:"#7c3aed22",border:"1px solid #7c3aed44",borderRadius:20,padding:"2px 8px"}}>🤖 DartPoint</span>
          </div>
          {analyseParas.map((para,i)=>(
            <p key={i} style={{color:"#d8cffb",fontSize:13,lineHeight:1.72,margin:i===0?0:"13px 0 0"}}>{renderHL(para)}</p>
          ))}
        </div>
      </div>

      {/* 3 ── FORME ── */}
      <div style={{...card,...sec(2),marginBottom:10}}>
        <SecLabel icon={Flame}>TA FORME ACTUELLE</SecLabel>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
          <div style={{fontWeight:900,fontSize:17,color:formeColor}}>{formeLabel}</div>
          {derniers5.length>0&&(<div style={{display:"flex",gap:4}}>{derniers5.map((d,i)=><VDBadge key={i} gagne={d.gagnant_id===joueurId} size={24}/>)}</div>)}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:3,marginTop:8}}>
          {derniers10.length>0&&<div style={{fontSize:11,color:CJ.muted}}><EmoIcon e="📋" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>{victoires10}/{derniers10.length} sur tes 10 derniers ({Math.round(formePct*100)}%)</div>}
          {serieActuelle>=2&&serieType==="win"&&<div style={{fontSize:11,color:CJ.green}}><EmoIcon e="🔥" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>{serieActuelle} victoires de suite</div>}
          {serieActuelle>=2&&serieType==="loss"&&<div style={{fontSize:11,color:CJ.red}}><EmoIcon e="❄️" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>{serieActuelle} défaites de suite</div>}
          <div style={{fontSize:11,color:var7j>=0?CJ.green:CJ.red}}><EmoIcon e="📈" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>{var7j>=0?"+":""}{var7j} DRIX sur 7 jours</div>
          {deltaScoring&&Math.abs(deltaScoring)>3&&<div style={{fontSize:11,color:deltaScoring>0?CJ.green:CJ.red}}><EmoIcon e="🎯" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>Scoring {deltaScoring>0?"+":""}{deltaScoring}% vs ton standard</div>}
          {duels[0]?.date&&<div style={{fontSize:11,color:CJ.muted}}><EmoIcon e="🕐" size={11} style={{verticalAlign:"-2px",marginRight:4}}/>Dernière partie {tempsDepuisMatch(duels[0].date)}</div>}
        </div>
      </div>

      {/* 4 ── FORCES / FAIBLESSES ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10,...sec(3)}}>
        <div style={{...card,border:"1px solid #22c55e33",background:"linear-gradient(160deg,#0e1f14,#1a1a1a 70%)"}}>
          <div style={{fontSize:10,color:CJ.green,fontWeight:800,letterSpacing:1,marginBottom:9,display:"flex",alignItems:"center",gap:6}}><TrendingUp size={13} color={CJ.green} strokeWidth={2.5}/>TES FORCES</div>
          {forcesList.map((f,i)=>(<div key={i} style={{marginBottom:i<forcesList.length-1?9:0}}><div style={{fontWeight:700,fontSize:12,color:CJ.text}}><EmoIcon e={f.emoji} size={12} style={{verticalAlign:"-2px",marginRight:3}}/>{f.k}</div><div style={{fontSize:10,color:CJ.muted,lineHeight:1.35,marginTop:1}}>{f.detail}</div></div>))}
        </div>
        <div style={{...card,border:"1px solid #ef444433",background:"linear-gradient(160deg,#1f1010,#1a1a1a 70%)"}}>
          <div style={{fontSize:10,color:CJ.red,fontWeight:800,letterSpacing:1,marginBottom:9,display:"flex",alignItems:"center",gap:6}}><TrendingDown size={13} color={CJ.red} strokeWidth={2.5}/>TES FAIBLESSES</div>
          {faiblessesList.map((f,i)=>(<div key={i} style={{marginBottom:i<faiblessesList.length-1?9:0}}><div style={{fontWeight:700,fontSize:12,color:CJ.text}}><EmoIcon e={f.emoji} size={12} style={{verticalAlign:"-2px",marginRight:3}}/>{f.k}</div><div style={{fontSize:10,color:CJ.muted,lineHeight:1.35,marginTop:1}}>{f.detail}</div></div>))}
        </div>
      </div>

      {/* ── STYLE ── */}
      <div style={{...card,...sec(4),marginBottom:10,border:`1px solid ${CJ.accent}33`,background:"linear-gradient(135deg,#1f1407,#1a1a1a 65%)"}}>
        <SecLabel icon={Gamepad2} color={CJ.accent}>TON STYLE DE JEU</SecLabel>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{display:"flex",lineHeight:1}}><EmoIcon e={styleJoueur.emoji} size={30} color={CJ.accent}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:900,fontSize:17,color:CJ.accent,textTransform:"uppercase",letterSpacing:.5}}>{styleJoueur.label}</div>
            <div style={{fontSize:11,color:CJ.muted,lineHeight:1.4,marginTop:2}}>{styleJoueur.desc}</div>
          </div>
        </div>
      </div>

      {/* 6 ── CARTE DE PERFORMANCE ── */}
      <div style={{...card,...sec(6),marginBottom:10}}>
        <SecLabel icon={BarChart2}>TA CARTE DE PERFORMANCE</SecLabel>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:12,padding:"12px",borderRadius:12,background:`linear-gradient(135deg, ${scoreColor}1f, #ffffff05)`,border:`1px solid ${scoreColor}44`}}>
          <div style={{flexShrink:0,filter:reduceMotion?"none":`drop-shadow(0 0 10px ${scoreColor}55)`}}><CircleGauge value={scoreJoueur} color={scoreColor} size={74} strokeWidth={8}/></div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:9,color:CJ.muted,fontWeight:700,letterSpacing:.5,marginBottom:3,display:"flex",alignItems:"center",gap:5}}><Trophy size={11} color={scoreColor} strokeWidth={2.5}/>TON SCORE JOUEUR</div>
            <div style={{display:"flex",alignItems:"baseline",gap:8}}>
              <span style={{fontWeight:900,fontSize:30,color:scoreColor,lineHeight:1,textShadow:reduceMotion?"none":`0 0 14px ${scoreColor}55`}}>{grade}</span>
              <span style={{fontSize:12,color:CJ.text,fontWeight:700}}>{tierWord}</span>
            </div>
            <div style={{fontSize:11,color:CJ.muted,marginTop:5,lineHeight:1.35}}>{profilJoueur.emoji} {profilJoueur.txt}</div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:6}}>
          <StatCell icon={Trophy} value={winRate+"%"} label="Win Rate" color={wrColor} strong={winRate>=60} gaugePct={winRate} gaugeColor={wrColor} context={ctxWR} delay={7}/>
          <StatCell icon={BarChart2} value={moyDisplay} label="Moyenne / volée" color={moyColor} strong={moyNum!=null&&moyNum>=52} gaugePct={moyNum!=null?moyPct:undefined} gaugeColor={moyColor} context={ctxMoy} delay={7.5}/>
          <StatCell icon={Swords} value={stats?.parties??0} label="Matchs joués" color={CJ.text} context={ctxParties} delay={8}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:6}}>
          <StatCell icon={serieType==="loss"?HeartCrack:Flame} value={serieActuelle>0?serieActuelle:"—"} label={serieType==="loss"?"Défaites de suite":"Victoires consécutives"} color={serieType==="loss"?CJ.red:CJ.green} strong={serieType==="win"&&serieActuelle>=3} context={serieType==="win"&&serieActuelle>0?"en cours":null} delay={8.5}/>
          <StatCell icon={Crosshair} value={recordFinish>0?recordFinish:"—"} label="Record finish" color={CJ.green} strong={recordFinish>=100} context={ctxFinish} delay={9}/>
          <StatCell icon={Zap} value={nb180>0?nb180:"—"} label="× 180 réalisés" color="#f59e0b" strong={nb180>=3} delay={9.5}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
          <StatCell icon={Circle} value={stats?.victoires??0} label="Victoires" color={CJ.green} delay={10}/>
          <StatCell icon={Circle} value={stats?.defaites??0} label="Défaites" color={CJ.red} delay={10.5}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:6,marginTop:6}}>
          <StatCell icon={Target} value={flechettesA>0?flechettesA.toLocaleString("fr-FR"):"—"} label="Fléchettes lancées" color="#f59e0b" context={flechettesA>0&&!flechAExactes?"environ":null} delay={11}/>
        </div>
      </div>

      {/* ── STATS DE JEU RÉELLES ── */}
      <div style={{...card,...sec(7),marginBottom:10}}>
        <SecLabel icon={Dices}>TES STATS DE JEU RÉELLES · {A.totalLegs} manche{A.totalLegs>1?"s":""}</SecLabel>
        {A.totalLegs===0
          ? <div style={{fontSize:11,color:CJ.muted,marginTop:6}}>Joue quelques duels au scoreur pour générer tes stats détaillées.</div>
          : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 16px",marginTop:8}}>
              {buildStatsReelles(A).map((s,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"6px 0",borderBottom:"1px solid #ffffff0a"}}>
                  <span style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}>
                    <span style={{flexShrink:0,display:"flex"}}><s.icon size={13} color="#64748b" strokeWidth={2.5}/></span>
                    <span style={{fontSize:10,color:"#94a3b8",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.label}</span>
                  </span>
                  <span style={{textAlign:"right",flexShrink:0,lineHeight:1.05}}>
                    <span style={{display:"block",fontSize:14,fontWeight:900,color:s.color,textShadow:s.record?`0 0 10px ${s.color}66`:"none"}}>{s.value}</span>
                    {s.sub && <span style={{display:"block",fontSize:8,color:"#64748b",fontWeight:500,marginTop:1}}>{s.sub}</span>}
                  </span>
                </div>
              ))}
            </div>}
      </div>

      {/* 7 ── ÉVOLUTION DRIX (onglets période + échelle + dates) ── */}
      {drixMvts.length>=2&&(
        <div style={{...sec(8),marginBottom:10}}>
          <DrixEvolution drixMvts={drixMvts} current={drixMvts[0]?.drix_apres ?? 1000}/>
        </div>
      )}

      {/* 8 ── EXPLOITS ── */}
      {exploitsList.length>0&&(
        <div style={{...card,...sec(9),marginBottom:0,border:"1px solid #f59e0b33"}}>
          <SecLabel icon={Star} color="#f59e0b">TES EXPLOITS</SecLabel>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {exploitsList.map((e,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:9,background:"#f59e0b0f",border:"1px solid #f59e0b22",borderRadius:10,padding:"8px 10px"}}>
                <span style={{fontSize:20}}>{e.emoji}</span>
                <div style={{minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:13,color:CJ.yellow,lineHeight:1.1}}>{e.label}</div>
                  <div style={{fontSize:9,color:CJ.muted}}>{e.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── PRÉSENCE CE SOIR ──────────────────────────────────────────────────────────
export const PresenceSection = ({ barSlug, joueur }) => {
  const [presences, setPresences] = useState([]);
  const [maPresence, setMaPresence] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [p, mp] = await Promise.all([
        dbJ.getPresences(barSlug),
        joueur ? dbJ.getMyPresence(joueur.id, barSlug) : Promise.resolve(null)
      ]);
      setPresences(p||[]); setMaPresence(mp||null); setLoading(false);
    };
    load().catch(() => setLoading(false));
  }, [barSlug, joueur?.id]);

  const togglePresence = async () => {
    if (!joueur) return;
    if (maPresence) {
      await dbJ.deletePresence(maPresence.id);
      setMaPresence(null);
      setPresences(x => x.filter(p => p.id !== maPresence.id));
    } else {
      const r = await dbJ.addPresence({ joueur_id:joueur.id, joueur_pseudo:joueur.pseudo, bar_slug:barSlug, date_jour:todayStr(), heure:Date.now() });
      if (r?.[0]) { setMaPresence(r[0]); setPresences(x => [...x, r[0]]); ajouterXP(joueur.id, 5).catch(()=>{}); } // +5 XP présence
    }
  };

  return (
    <div style={{ background:CJ.card,border:`1px solid ${presences.length>0?CJ.green+"44":CJ.border}`,borderRadius:12,padding:18,marginBottom:16 }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8 }}>
        <h3 style={{ fontWeight:700,fontSize:15,color:presences.length>0?CJ.green:CJ.text }}>
          🟢 Ce soir{presences.length>0?` — ${presences.length} joueur${presences.length>1?"s":""}` : ""}
        </h3>
        {joueur
          ? <button onClick={togglePresence} style={{ background:maPresence?"#14532d":"#111",border:`1px solid ${maPresence?CJ.green:CJ.border}`,color:maPresence?CJ.green:CJ.muted,borderRadius:20,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600 }}>
              {maPresence?"✅ Je serai là":"📍 Je serai là ce soir"}
            </button>
          : <span style={{ color:CJ.muted,fontSize:12 }}>Connectez-vous pour signaler votre présence</span>
        }
      </div>
      {loading ? <SpinnerJ/> : presences.length===0
        ? <p style={{ color:CJ.muted,fontSize:13 }}>Aucun joueur annoncé pour ce soir.</p>
        : <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            {presences.map(p=>(
              <span key={p.id} style={{ background:CJ.accent+"22",color:CJ.accent,border:`1px solid ${CJ.accent}44`,borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:600 }}>
                🎯 {p.joueur_pseudo}
              </span>
            ))}
          </div>
      }
    </div>
  );
};

// ── MEMBRES DU BAR ────────────────────────────────────────────────────────────
export const MembresBarSection = ({ barSlug, setPage }) => {
  const [membres, setMembres] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dbJ.getJoueursByBar(barSlug).then(j=>{setMembres(j||[]);setLoading(false);}).catch(()=>setLoading(false));
  }, [barSlug]);

  if (loading) return null;
  if (membres.length===0) return (
    <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:16,marginBottom:16,textAlign:"center" }}>
      <p style={{ color:CJ.muted,fontSize:13 }}>🏆 Aucun joueur affilié à ce bar pour l'instant.</p>
    </div>
  );

  return (
    <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:18,marginBottom:16 }}>
      <h3 style={{ fontWeight:700,fontSize:15,marginBottom:12,color:CJ.accent }}>
        🏆 Équipe du bar <BadgeJ color={CJ.accent}>{membres.length}</BadgeJ>
      </h3>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
        {membres.map(m=>(
          <div key={m.id} onClick={()=>setPage("profil-joueur-"+m.id)}
            style={{ background:"#111",border:`1px solid ${CJ.border}`,borderRadius:20,padding:"5px 14px",cursor:"pointer",fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:6 }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=CJ.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=CJ.border}>
            🎯 {m.pseudo}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── SYSTÈME DRIX ──────────────────────────────────────────────────────────────
export const getDrixTitre = getDrixTitreLocal;
export const getDrixProgression = getProgression;

// ── Formule DRIX asymétrique ───────────────────────────────────────────────────
//
//   EA = P(A gagne) = 1 / (1 + 10^((DRIX_B − DRIX_A) / 400))
//   EB = P(B gagne) = 1 − EA
//   K  = 32 × manches (double à chaque manche supplémentaire)
//
//   Si A gagne :  variationA = +K × EB   (gagne selon la proba de l'adversaire)
//                 variationB = −K × EA   (perd selon sa propre proba de victoire)
//
//   Conséquences :
//   • Battre un favori rapporte beaucoup, lui fait perdre peu
//   • Battre un outsider rapporte peu, lui fait perdre beaucoup
//   • Perdre contre plus fort → perd peu | Perdre contre plus faible → perd beaucoup
//
//   Architecture extensible via options = { K, bonusA, bonusB }
//   pour futurs bonus (finish parfait, moyenne élevée, série de victoires…)

export const getKFactor = () => 32; // réservé — pourra évoluer par niveau

export const calculerDrix = (drixA, drixB, aGagne, options = {}) => {
  const K      = options.K      ?? 32;
  const bonusA = options.bonusA ?? 0;  // futur : bonus finish / moyenne / série
  const bonusB = options.bonusB ?? 0;

  const EA = 1 / (1 + Math.pow(10, (drixB - drixA) / 400)); // P(A gagne)
  const EB = 1 - EA;                                         // P(B gagne)

  // Règle protection favori (uniquement sur le Défi de la Semaine) :
  // si le plus fort perd contre sa cible hebdo, il ne perd que la moitié
  const isDefiSemaine = options.isDefiSemaine ?? false;
  const aEstPlusFort  = drixA >= drixB;

  const perteA = Math.round(K * EA);
  const perteB = Math.round(K * EB);

  const variationA = aGagne
    ? +Math.round(K * EB) + bonusA
    : -(isDefiSemaine && aEstPlusFort ? Math.round(perteA / 2) : perteA) + bonusA;
  const variationB = aGagne
    ? -(isDefiSemaine && !aEstPlusFort ? Math.round(perteB / 2) : perteB) + bonusB
    : +Math.round(K * EA) + bonusB;

  return { variationA, variationB };
};

// Animations du ladder DRIX (injectées une fois via <style> dans PageDrix)
const LADDER_CSS = `
@keyframes dxRise  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
@keyframes dxGlow  { 0%,100% { box-shadow:0 0 18px #fbbf2433; } 50% { box-shadow:0 0 34px #fbbf2466, 0 0 10px #fbbf2433; } }
@keyframes dxPulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.05); } }
@keyframes dxShine { 0% { transform:translateX(-130%) skewX(-18deg); } 60%,100% { transform:translateX(240%) skewX(-18deg); } }
@keyframes dxFlame { 0%,100% { transform:scale(1) rotate(0deg); } 50% { transform:scale(1.18) rotate(-5deg); } }
@keyframes dxBar   { from { width:0; } }
`;

const dbDrix = {
  updateDrix: (id, drix) => sbJ(`joueurs?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({ drix }), prefer:"return=minimal" }),
  updateXP: (id, xp) => sbJ(`joueurs?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({ xp }), prefer:"return=minimal" }),
  addMouvement: (d) => sbJ("drix_mouvements", { method:"POST", body:JSON.stringify(d) }),
  getClassement: () => sbJ("joueurs?order=drix.desc&select=id,pseudo,drix,bar_slug,asso_slug,photo,xp"),
  getClassementBar: (slug) => sbJ(`joueurs?bar_slug=eq.${encodeURIComponent(slug)}&order=drix.desc&select=id,pseudo,drix,photo,xp`),
  getClassementAsso: (slug) => sbJ(`joueurs?asso_slug=eq.${encodeURIComponent(slug)}&order=drix.desc&select=id,pseudo,drix,photo,xp`),
  getHistorique: (joueur_id) => sbJ(`drix_mouvements?joueur_id=eq.${joueur_id}&order=date.desc&limit=10&select=*`),
  getHallOfFame: () => sbJ("drix_historique?order=saison.desc,classement.asc&select=*"),
};

// ── Bonus de performance (manches + grosses volées + gros finishes) ───────────
// joueursData: [{nom, manchesGagnees, tours:[],...}, ...]  (index 0=challenger, 1=defie)
// manchesDetail: [{winner, winner_finish,...}, ...]
export const calculerBonusPerformance = (joueursData = [], manchesDetail = []) => {
  const BONUS_MANCHE = 5;   // par manche gagnée
  const BONUS_FINISH = 10;  // par finish ≥ 120
  // Bonus par volée selon le palier : 120–139 → 5, 140–179 → 7, 180 → 15
  const bonusVolee = (v) => v >= 180 ? 15 : v >= 140 ? 7 : v >= 120 ? 5 : 0;

  return joueursData.map(j => {
    const manchesGagnees = j.manchesGagnees || 0;
    const bonusManches   = manchesGagnees * BONUS_MANCHE;

    // Grosses volées ≥ 120 (bonus par palier, y compris les finishes)
    const toutes = j.tours || [];
    const grossesVolees = toutes.filter(v => v >= 120);
    const bonusVolees   = toutes.reduce((s, v) => s + bonusVolee(v), 0);

    // Gros finishes ≥ 120 (manches gagnées par ce joueur avec finish ≥ 120)
    const grossesFinishes = manchesDetail.filter(
      m => m.winner === j.nom && (m.winner_finish || 0) >= 120
    );
    const bonusFinish = grossesFinishes.length * BONUS_FINISH;

    const total = bonusManches + bonusVolees + bonusFinish;   // plus de plafond

    return {
      bonusManches,
      bonusVolees,
      bonusFinish,
      nbGrossesVolees: grossesVolees.length,
      nbGrosFinish:    grossesFinishes.length,
      total,
    };
  });
};

// ════ SYSTÈME XP ════════════════════════════════════════════════════════════
// XP = expérience (parallèle au DRIX qui, lui, est l'ELO pur du niveau réel).
// Niveaux CONTINUS 1 → 100. Coût d'XP pour passer du niveau L au niveau L+1 :
//   niv 1→10  : 100,150,…,500   (+50/niv)
//   niv 10→20 : 600,700,…,1500  (+100/niv)
//   niv 20→30 : 1650,…,3000     (+150/niv)
//   niv 30→50 : 3200,…,7000     (+200/niv)
//   niv 50→100: 7500,…,32000    (+500/niv)
export const NIVEAU_MAX = 100;
const coutNiveau = (L) =>
  L <= 9  ? 100  + 50  * (L - 1)  :
  L <= 19 ? 600  + 100 * (L - 10) :
  L <= 29 ? 1650 + 150 * (L - 20) :
  L <= 49 ? 3200 + 200 * (L - 30) :
            7500 + 500 * (L - 50);
// SEUILS_XP[n] = XP cumulé requis pour ATTEINDRE le niveau n (niveau 1 = 0 XP).
export const SEUILS_XP = (() => {
  const s = [0, 0]; // index 0 inutilisé ; s[1] = niveau 1 = 0 XP
  for (let L = 1; L < NIVEAU_MAX; L++) s[L + 1] = s[L] + coutNiveau(L);
  return s;
})();
// Titres conservés, attribués par tranche de niveau (continuité avec l'ancien système).
export const titreNiveau = (n) =>
  n >= 50 ? "Légende" : n >= 20 ? "Vétéran" : n >= 10 ? "Habitué" : n >= 5 ? "Régulier" : "Rookie";

// Niveau (1-100) + titre + progression vers le niveau suivant, à partir d'un total d'XP.
export const getNiveauXP = (xp = 0) => {
  const x = Math.max(0, Math.floor(xp || 0));
  let niveau = 1;
  for (let L = 2; L <= NIVEAU_MAX; L++) { if (x >= SEUILS_XP[L]) niveau = L; else break; }
  const base = SEUILS_XP[niveau];
  const next = niveau < NIVEAU_MAX ? SEUILS_XP[niveau + 1] : null;
  const progres = next != null ? Math.min(100, Math.max(0, Math.round(((x - base) / (next - base)) * 100))) : 100;
  return {
    niveau, titre: titreNiveau(niveau), xp: x,
    palierProchain: next, prochainTitre: next != null ? titreNiveau(niveau + 1) : null,
    restant: next != null ? Math.max(0, next - x) : 0, progres,
  };
};

// XP gagné par un duel terminé. Retourne [{total,lines}, {total,lines}] = [challenger, défié].
// joueursData[i] = { nom, manchesGagnees, tours:[volées] } ; moyennes[i] = moyenne pts/volée du match.
export const calculerXP = (joueursData = [], manchesDetail = [], duel = {}, moyennes = []) => {
  const ids = [duel.challenger_id, duel.defie_id];
  return joueursData.slice(0, 2).map((j, i) => {
    const lines = [];
    const add = (xp, label) => { if (xp > 0) lines.push({ label, xp }); };
    const won = ids[i] === duel.gagnant_id;
    const monManches = j.manchesGagnees || 0;
    const advManches = joueursData[1 - i]?.manchesGagnees || 0;
    const tours = j.tours || [];
    const moyenne = moyennes[i] != null ? Number(moyennes[i]) : (tours.length ? tours.reduce((a, b) => a + b, 0) / tours.length : 0);

    add(25, "Match joué");
    add(15, "Défi accepté");
    if (won) add(100, "Match gagné");
    if (won && monManches >= 3 && advManches === 0) add(100, "Victoire 3-0");
    add(monManches * 25, `${monManches} manche(s) gagnée(s)`);

    let v180 = 0, v140 = 0, v120 = 0;
    for (const v of tours) { if (v >= 180) v180++; else if (v >= 140) v140++; else if (v >= 120) v120++; }
    add(v180 * 180, `${v180} × 180`);
    add(v140 * 20, `${v140} × 140-179`);
    add(v120 * 10, `${v120} × 120-139`);

    const finishes = manchesDetail.filter(m => m.winner === j.nom && (m.winner_finish || 0) >= 120).length;
    add(finishes * 30, `${finishes} finish ≥ 120`);

    if (moyenne >= 90) add(75, "Moyenne ≥ 90");
    else if (moyenne >= 70) add(40, "Moyenne ≥ 70");
    else if (moyenne >= 50) add(20, "Moyenne ≥ 50");

    return { total: lines.reduce((s, l) => s + l.xp, 0), lines };
  });
};

// Bloc d'affichage XP : ⭐ Niveau + titre + barre de progression vers le palier suivant.
export const XpBlock = ({ xp = 0 }) => {
  const n = getNiveauXP(xp);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5, gap: 8 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "#fbbf24" }}>
          <Star size={14} color="#fbbf24" fill="#fbbf24" /> Niveau {n.niveau} · {n.titre}
        </span>
        <span style={{ fontSize: 11, color: CJ.muted, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{n.xp.toLocaleString("fr-FR")} XP</span>
      </div>
      <div style={{ height: 9, borderRadius: 99, background: "#15151f", border: "1px solid #2a2a2a", overflow: "hidden" }}>
        <div style={{ width: `${n.progres}%`, height: "100%", borderRadius: 99, background: "linear-gradient(90deg,#fbbf24,#f59e0b)", boxShadow: "0 0 10px #fbbf2466", transition: "width .6s ease" }} />
      </div>
      <div style={{ fontSize: 10, color: CJ.muted, marginTop: 4, textAlign: "right" }}>
        {n.palierProchain != null ? `Plus que ${n.restant.toLocaleString("fr-FR")} XP → Niveau ${n.niveau + 1}${n.prochainTitre !== n.titre ? ` (${n.prochainTitre})` : ""}` : "Niveau max atteint 🏆"}
      </div>
    </div>
  );
};

// Bulle de niveau XP à superposer sur une photo de profil (le conteneur doit être position:relative).
export const NiveauBulle = ({ xp = 0, size = 22, corner = "bottom-right", style = {} }) => {
  const niveau = getNiveauXP(xp).niveau;
  const pos = corner === "top-right" ? { top: -3, right: -3 } : corner === "top-left" ? { top: -3, left: -3 } : { bottom: -3, right: -3 };
  return (
    <div title={`Niveau ${niveau}`} aria-label={`Niveau ${niveau}`} style={{
      position: "absolute", ...pos,
      minWidth: size, height: size, padding: "0 3px", boxSizing: "border-box",
      background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1a1200",
      border: "2px solid #0f0f0f", borderRadius: 99,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: Math.max(9, Math.round(size * 0.48)), fontWeight: 900, lineHeight: 1,
      boxShadow: "0 1px 5px rgba(0,0,0,.55)", fontVariantNumeric: "tabular-nums",
      zIndex: 3, pointerEvents: "none", ...style,
    }}>{niveau}</div>
  );
};

// Ajoute du XP à un joueur (lecture-écriture ; échelle de l'app, cf. updateBarVues).
export const ajouterXP = async (joueurId, delta, joueurConnu = null) => {
  if (!delta || delta <= 0) return null;
  const j = joueurConnu || await dbJ.getJoueur(joueurId);
  const newXp = (j?.xp || 0) + delta;
  await dbDrix.updateXP(joueurId, newXp).catch(() => {});
  return newXp;
};

// Vérifie si les deux joueurs sont rivaux cette semaine (rivalité hebdo localStorage)
const isRivaliteMatch = (_myId, adversaireId) => {
  try {
    const weekKey = (() => {
      const now = new Date();
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const y = d.getUTCFullYear();
      const w = Math.ceil((((d - Date.UTC(y,0,1)) / 86400000) + 1) / 7);
      return `dp_rivalite_${y}-W${String(w).padStart(2,"0")}`;
    })();
    const stored = localStorage.getItem(weekKey);
    if (!stored) return false;
    const data = JSON.parse(stored);
    // rival ou rival2 (pour les joueurs qui jouent 2 fois)
    return data?.rival?.id === adversaireId || data?.rival2?.id === adversaireId;
  } catch { return false; }
};

export const appliquerDrixDuel = async (duel, perfBonus = null) => {
  // Partie amicale → aucune variation DRIX
  if (duel.type === "amical") return null;
  try {
    const [jC, jD] = await Promise.all([dbJ.getJoueur(duel.challenger_id), dbJ.getJoueur(duel.defie_id)]);
    if (!jC || !jD) return null;
    const drixC = jC.drix || 1000;
    const drixD = jD.drix || 1000;
    const challengerGagne = duel.gagnant_id === duel.challenger_id;
    const manches = Math.max(1, duel.manches || 1);
    const K = 32 * manches;

    // ── Rivalité hebdo ? ────────────────────────────────────────────────────────
    // Détection désormais basée sur duel.type === 'rivalite' (champ persistant en base)
    // au lieu d'un check localStorage. Cela garantit qu'un duel n'est traité comme
    // rivalité QUE s'il a explicitement été créé via le bouton 'Défier mon rival'.
    const isRivalite = duel.type === "rivalite";

    // ── Probabilités ELO (utilisées seulement si pas rivalité) ─────────────────
    const EA = 1 / (1 + Math.pow(10, (drixD - drixC) / 400));
    const EB = 1 - EA;

    // Plancher : un gain / une perte ne descend jamais sous 7 DRIX PAR MANCHE.
    const plancher  = 7 * manches;
    const gainBaseC = Math.max(plancher, Math.round(K * EB));
    const gainBaseD = Math.max(plancher, Math.round(K * EA));
    const perteC    = Math.max(plancher, Math.round(K * EA));
    const perteD    = Math.max(plancher, Math.round(K * EB));

    // ── Calcul ELO / Rivalité ────────────────────────────────────────────────────
    // Rivalité hebdo : vainqueur +50 plat, perdant 0 (pas de perte ELO)
    // Match normal  : ELO standard
    let eloC, eloD;
    if (isRivalite) {
      eloC = challengerGagne ? 50 : 0;
      eloD = challengerGagne ? 0  : 50;
    } else {
      eloC = challengerGagne ? gainBaseC : -perteC;
      eloD = challengerGagne ? -perteD   : gainBaseD;
    }

    // Bonus de performance : DÉSACTIVÉ — l'appelant (AppJeux) passe désormais perfBonus=null,
    // donc bonus = 0 → DRIX = ELO pur (victoire/défaite). Code conservé pour réactivation éventuelle.
    const bonusC = perfBonus?.[0]?.total || 0;
    const bonusD = perfBonus?.[1]?.total || 0;

    const variationC = eloC + bonusC;
    const variationD = eloD + bonusD;

    const newDrixC = Math.max(100, drixC + variationC);
    const newDrixD = Math.max(100, drixD + variationD);

    const resultatC = challengerGagne ? "victoire" : "defaite";
    const resultatD = challengerGagne ? "defaite"  : "victoire";
    const tagRival  = isRivalite ? " ⚔️ Rivalité Hebdo" : "";

    await Promise.all([
      dbDrix.updateDrix(jC.id, newDrixC),
      dbDrix.updateDrix(jD.id, newDrixD),
      dbDrix.addMouvement({ joueur_id:jC.id, joueur_pseudo:jC.pseudo, adversaire_pseudo:jD.pseudo+tagRival, variation:variationC, drix_avant:drixC, drix_apres:newDrixC, resultat:resultatC, duel_id:duel.id, date:Date.now() }),
      dbDrix.addMouvement({ joueur_id:jD.id, joueur_pseudo:jD.pseudo, adversaire_pseudo:jC.pseudo+tagRival, variation:variationD, drix_avant:drixD, drix_apres:newDrixD, resultat:resultatD, duel_id:duel.id, date:Date.now() }),
    ]);

    // Retourne le détail pour affichage
    return {
      isRivalite,
      challenger: { eloVariation:eloC, bonus:perfBonus?.[0]||{bonusManches:0,bonusVolees:0,bonusFinish:0,total:0}, participation:0, totalVariation:variationC },
      defie:      { eloVariation:eloD, bonus:perfBonus?.[1]||{bonusManches:0,bonusVolees:0,bonusFinish:0,total:0}, participation:0, totalVariation:variationD },
    };
  } catch(e) { console.error("Erreur DRIX:", e); return null; }
};

// Finalise un duel : DRIX + stats en un seul appel (utilisé par AppJeux)
// Crée la ligne stats_joueurs si absente, sinon update
const upsertStatsRow = async (statsRow, joueurId, isWinner) => {
  if (statsRow) {
    return dbJ.updateStats(statsRow.id, {
      parties:   (statsRow.parties || 0) + 1,
      victoires: isWinner ? (statsRow.victoires || 0) + 1 : (statsRow.victoires || 0),
      defaites:  !isWinner ? (statsRow.defaites || 0) + 1 : (statsRow.defaites || 0),
    });
  }
  // 🆕 Pas de stats → on crée la ligne avec la 1ère partie
  return dbJ.addStats({
    joueur_id: joueurId,
    saison: String(new Date().getFullYear()),
    parties:   1,
    victoires: isWinner ? 1 : 0,
    defaites:  isWinner ? 0 : 1,
  });
};

export const finaliserDuel = async (duel, matchData = null) => {
  // DRIX = ELO pur (perfBonus toujours null désormais).
  const breakdown = await appliquerDrixDuel(duel, null);
  const gagnantId = duel.gagnant_id;
  const [sC, sD] = await Promise.all([dbJ.getStats(duel.challenger_id), dbJ.getStats(duel.defie_id)]);
  await Promise.all([
    upsertStatsRow(sC, duel.challenger_id, gagnantId === duel.challenger_id).catch(()=>{}),
    upsertStatsRow(sD, duel.defie_id,      gagnantId === duel.defie_id).catch(()=>{}),
  ]);
  // ── XP du duel (volées, finishes, moyenne… calculés depuis les données du match) ──
  let xpOnly = null; // pour les amicales : appliquerDrixDuel renvoie null (pas de DRIX),
  //                     mais l'XP est bien crédité → on le renvoie quand même pour l'afficher.
  if (matchData?.joueursData?.length >= 2) {
    try {
      const xps = calculerXP(matchData.joueursData, matchData.manchesDetail || [], duel, matchData.moyennes || []);
      const [jCx, jDx] = await Promise.all([dbJ.getJoueur(duel.challenger_id), dbJ.getJoueur(duel.defie_id)]);
      await Promise.all([
        ajouterXP(duel.challenger_id, xps[0].total, jCx).catch(()=>{}),
        ajouterXP(duel.defie_id,      xps[1].total, jDx).catch(()=>{}),
      ]);
      if (breakdown) { breakdown.challenger.xp = xps[0]; breakdown.defie.xp = xps[1]; }
      else { xpOnly = { challenger: { xp: xps[0] }, defie: { xp: xps[1] } }; }
    } catch(e) { /* XP best-effort : n'empêche jamais la finalisation du duel */ }
  }
  return breakdown || xpOnly;
};

// ── PAGE CLASSEMENT DRIX ──────────────────────────────────────────────────────
export const PageDrix = ({ setPage, bars=[], associations=[], joueur, setJoueurId }) => {
  const [classement, setClassement]   = useState([]);
  const [hallOfFame, setHallOfFame]   = useState([]);
  const [mouvements, setMouvements]   = useState([]);
  const [amis, setAmis]               = useState([]);
  const [monHistorique, setMonHistorique] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filtre, setFiltre]           = useState(joueur?.asso_slug ? "asso" : "national"); // défaut : mon asso (repli national si aucune asso)
  const [view, setView]               = useState("classement"); // classement|evolution
  const [showVoisinage, setShowVoisinage] = useState(false);
  const [showNonClasses, setShowNonClasses] = useState(false);
  // Cartes déroulantes (MON CLASSEMENT / CIBLES / FILTRES) — fermées par défaut, état mémorisé entre les visites
  const [cardsOpen, setCardsOpen] = useState(() => {
    try { return { mon:false, cibles:false, filtres:false, ...JSON.parse(localStorage.getItem("drix_cards_open_v2") || "{}") }; }
    catch { return { mon:false, cibles:false, filtres:false }; }
  });
  useEffect(() => { try { localStorage.setItem("drix_cards_open_v2", JSON.stringify(cardsOpen)); } catch { /* ignore */ } }, [cardsOpen]);
  const toggleCard = (k) => setCardsOpen(o => ({ ...o, [k]: !o[k] }));
  const saisonActuelle = new Date().getFullYear();

  useEffect(() => {
    Promise.all([
      dbDrix.getClassement(),
      sbJ(`drix_mouvements?resultat=in.(victoire,defaite)&order=date.desc&select=joueur_id,joueur_pseudo,variation,resultat,date,duel_id`).catch(() => []),
      dbDrix.getHallOfFame().catch(() => []),
    ]).then(([c, mvts, hof]) => {
      setClassement(c || []);
      setMouvements(mvts || []);
      setHallOfFame(hof || []);
      setLoading(false);
    }).catch(() => setLoading(false));
    if (joueur?.id) {
      sbJ(`amis?or=(joueur_id.eq.${joueur.id},ami_id.eq.${joueur.id})&statut=eq.accepte&select=joueur_id,ami_id`).catch(() => []).then(a => setAmis(a || []));
      dbDrix.getHistorique(joueur.id).then(h => setMonHistorique(h || [])).catch(() => {});
    }
  }, [joueur?.id]);

  // ── Stats par joueur depuis l'historique complet (mouvements triés date desc) ──
  // "DRIX cette semaine" = tous les mouvements (duels + chrono + entraînement + admin).
  // "matchs" & "séries" = uniquement les vrais duels (duel_id non nul) — les manches
  // ne créent jamais de ligne, et chrono/entraînement/admin n'ont pas de duel_id.
  const statsMap = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const m = {};
    for (const mv of mouvements) {
      const id = mv.joueur_id;
      if (!m[id]) m[id] = { matches:0, wins:0, losses:0, streak:0, streakType:null, weeklyVar:0, lastDate:0, _done:false };
      const s = m[id];
      if (mv.date > weekAgo) s.weeklyVar += (mv.variation || 0);
      if (mv.date > s.lastDate) s.lastDate = mv.date;
      if (mv.duel_id == null) continue;                 // ⬅️ on ignore tout ce qui n'est pas un duel
      s.matches++;
      if (mv.resultat === "victoire") s.wins++; else if (mv.resultat === "defaite") s.losses++;
      if (!s._done) {                                   // streak = série de duels en cours (depuis le + récent)
        if (s.streakType === null) { s.streakType = mv.resultat; s.streak = 1; }
        else if (mv.resultat === s.streakType) { s.streak++; }
        else { s._done = true; }
      }
    }
    return m;
  }, [mouvements]);

  const variationMap = useMemo(() => {
    const m = {};
    Object.entries(statsMap).forEach(([id, s]) => { m[id] = s.weeklyVar; });
    return m;
  }, [statsMap]);

  const joueursClassesIds = useMemo(() => new Set(Object.keys(statsMap)), [statsMap]);

  // Rang de la semaine dernière (drix - variation hebdo) → flèches de mouvement
  const { prevRankMap, rankDeltaMap } = useMemo(() => {
    const prev = classement.map(j => ({ id:j.id, d:(j.drix||1000) - (variationMap[j.id]||0) }));
    prev.sort((a,b) => b.d - a.d);
    const pr = {}; prev.forEach((p,i) => { pr[p.id] = i+1; });
    const delta = {};
    classement.forEach((j,i) => { delta[j.id] = (pr[j.id]||(i+1)) - (i+1); }); // >0 = a grimpé
    return { prevRankMap:pr, rankDeltaMap:delta };
  }, [classement, variationMap]);

  const amisIds = useMemo(() => {
    if (!joueur) return new Set();
    return new Set((amis || []).map(a => a.joueur_id === joueur.id ? a.ami_id : a.joueur_id));
  }, [amis, joueur]);

  const monRangGlobal = useMemo(() => {
    if (!joueur) return null;
    const idx = classement.findIndex(j => j.id === joueur.id);
    return idx >= 0 ? idx + 1 : null;
  }, [classement, joueur]);

  const classementFiltre = useMemo(() => {
    if (filtre === "amis") {
      const ids = new Set([joueur?.id, ...amisIds].filter(Boolean));
      return classement.filter(j => ids.has(j.id));
    }
    if (filtre === "bar"  && joueur?.bar_slug)  return classement.filter(j => j.bar_slug  === joueur.bar_slug);
    if (filtre === "asso" && joueur?.asso_slug) return classement.filter(j => j.asso_slug === joueur.asso_slug);
    if (filtre === "feu") {                              // 🔥 momentum : meilleure progression hebdo
      return [...classement].filter(j => (variationMap[j.id]||0) > 0)
        .sort((a,b) => (variationMap[b.id]||0) - (variationMap[a.id]||0));
    }
    if (filtre === "chasseurs") {                        // ⚔ joueurs derrière moi qui montent
      if (!monRangGlobal) return [];
      return classement.slice(monRangGlobal).filter(j => {
        const s = statsMap[j.id];
        return (variationMap[j.id]||0) > 0 || (s && s.streakType === "victoire" && s.streak >= 2);
      }).slice(0, 12);
    }
    return classement;
  }, [classement, filtre, joueur, amisIds, variationMap, statsMap, monRangGlobal]);

  const moi        = joueur ? classement.find(j => j.id === joueur.id) : null;
  const monDrix    = moi?.drix || joueur?.drix || 1000;
  const monRangInfo = getDrixTitreLocal(monDrix);
  const progression = getProgression(monDrix);
  const monStats   = (joueur && statsMap[joueur.id]) || { matches:0, wins:0, losses:0, streak:0, streakType:null, weeklyVar:0 };
  const monDelta   = joueur ? (rankDeltaMap[joueur.id] || 0) : 0;

  const joueurAvant = monRangGlobal && monRangGlobal > 1 ? classement[monRangGlobal - 2] : null;
  const joueurApres = monRangGlobal ? classement[monRangGlobal] : null;

  const voisinage = useMemo(() => {
    if (!monRangGlobal) return [];
    const start = Math.max(0, monRangGlobal - 4);
    const end   = Math.min(classement.length, monRangGlobal + 3);
    return classement.slice(start, end);
  }, [classement, monRangGlobal]);

  // Projection fin de semaine : rang si chacun garde son rythme hebdo actuel
  const monRangProjete = useMemo(() => {
    if (!joueur) return null;
    const proj = classement.map(j => ({ id:j.id, d:(j.drix||1000) + (variationMap[j.id]||0) }));
    proj.sort((a,b) => b.d - a.d);
    const idx = proj.findIndex(p => p.id === joueur.id);
    return idx >= 0 ? idx + 1 : null;
  }, [classement, joueur, variationMap]);

  // Podium top 3 (classement national)
  const podium = useMemo(() => classement.slice(0, 3), [classement]);

  // Palmarès vivant — saison en cours (leader / progression / série / gain / activité)
  const liveHof = useMemo(() => {
    if (classement.length === 0) return null;
    const byId = Object.fromEntries(classement.map(j => [j.id, j]));
    const leader = classement[0];
    let bestProg = null, bestStreak = null, bestGain = null, mostActive = null;
    Object.entries(variationMap).forEach(([id, v]) => {
      if (v > 0 && byId[id] && (!bestProg || v > bestProg.v)) bestProg = { j:byId[id], v };
    });
    Object.entries(statsMap).forEach(([id, s]) => {
      if (s.streakType === "victoire" && s.streak >= 2 && byId[id] && (!bestStreak || s.streak > bestStreak.v)) bestStreak = { j:byId[id], v:s.streak };
      if (byId[id] && (!mostActive || s.matches > mostActive.v)) mostActive = { j:byId[id], v:s.matches };
    });
    for (const mv of mouvements) {
      if (mv.duel_id == null) continue;               // "sur un match" → duels uniquement
      if ((mv.variation||0) > 0 && (!bestGain || mv.variation > bestGain.v)) bestGain = { j:byId[mv.joueur_id], pseudo:mv.joueur_pseudo, v:mv.variation };
    }
    return { leader, bestProg, bestStreak, bestGain, mostActive };
  }, [classement, variationMap, statsMap, mouvements]);

  // ── Sous-composants ladder ──────────────────────────────────────────────────
  // Identité de ligue forte (icône + nom coloré du rang)
  const LeagueBadge = ({ drix, compact=false }) => {
    const r = getDrixTitreLocal(drix || 1000);
    const RI = r.icon;
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:`${r.color}1c`, border:`1px solid ${r.color}55`, borderRadius:20, padding:compact?"2px 8px":"4px 11px", whiteSpace:"nowrap" }}>
        <RI size={compact?11:13} color={r.color} strokeWidth={2.4}/>
        <span style={{ fontWeight:800, fontSize:compact?9:11, color:r.color, letterSpacing:.5, textTransform:"uppercase" }}>{r.titre}</span>
      </span>
    );
  };

  // Série en cours : 🔥 victoires (orange) / ❄ défaites (bleu)
  const StreakBadge = ({ stats, compact=false }) => {
    if (!stats || !stats.streak || stats.streak < 2 || !stats.streakType) return null;
    const win = stats.streakType === "victoire";
    const color = win ? "#f97316" : "#38bdf8";
    const Ic = win ? Flame : Snowflake;
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:`${color}1f`, border:`1px solid ${color}55`, borderRadius:20, padding:compact?"1px 7px":"2px 9px", whiteSpace:"nowrap" }}>
        <Ic size={compact?11:13} color={color} strokeWidth={2.4} style={win?{ animation:"dxFlame 1.4s ease-in-out infinite" }:undefined}/>
        <span style={{ fontWeight:900, fontSize:compact?10:12, color }}>{stats.streak}</span>
      </span>
    );
  };

  // Mouvement de rang depuis la semaine dernière : ⬆+3 / ⬇-2 / ➡0
  const MovementArrow = ({ delta, compact=false }) => {
    if (delta > 0) return <span style={{ display:"inline-flex", alignItems:"center", gap:1, color:CJ.green, fontWeight:800, fontSize:compact?10:11 }}><ArrowUp size={compact?11:12} strokeWidth={3}/>{delta}</span>;
    if (delta < 0) return <span style={{ display:"inline-flex", alignItems:"center", gap:1, color:CJ.red,   fontWeight:800, fontSize:compact?10:11 }}><ArrowDown size={compact?11:12} strokeWidth={3}/>{Math.abs(delta)}</span>;
    return <span style={{ display:"inline-flex", alignItems:"center", color:CJ.muted, fontWeight:800, fontSize:compact?10:11 }}><Minus size={compact?11:12} strokeWidth={3}/></span>;
  };

  // Badge de performance à côté du pseudo (1 max, priorité décroissante)
  const PerfBadge = ({ j, rang }) => {
    const s  = statsMap[j.id];
    const wk = variationMap[j.id] || 0;
    let label = null, color = CJ.muted, Ic = null;
    if (rang === 1)                                          { label="LEADER";     color="#fbbf24"; Ic=Crown; }
    else if (s && s.streakType==="victoire" && s.streak>=3)  { label="EN SÉRIE";   color="#f97316"; Ic=Flame; }
    else if (wk >= 30)                                       { label="EN FEU";     color="#f97316"; Ic=TrendingUp; }
    else if (s && s.matches>=10 && s.wins/s.matches>=0.6)    { label="REDOUTABLE"; color="#a78bfa"; Ic=Swords; }
    if (!label) return null;
    return (
      <span style={{ display:"inline-flex", alignItems:"center", gap:3, background:`${color}1f`, border:`1px solid ${color}55`, borderRadius:6, padding:"1px 6px", whiteSpace:"nowrap", flexShrink:0 }}>
        {Ic && <Ic size={9} color={color} strokeWidth={2.6}/>}
        <span style={{ fontWeight:900, fontSize:8.5, color, letterSpacing:.4 }}>{label}</span>
      </span>
    );
  };

  // Mini progress bar inside player card
  const MiniBar = ({ drix, color }) => {
    const { pct } = getProgression(drix || 1000);
    return (
      <div style={{ height:3, background:"#2a2a2a", borderRadius:2, marginTop:5, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:color, borderRadius:2 }}/>
      </div>
    );
  };

  // Small neighbor card
  const NeighborCard = ({ j, label, rangOffset, ecartPositif }) => {
    if (!j) return <div style={{ flex:1 }}/>;
    const { color } = getDrixTitreLocal(j.drix || 1000);
    const ecart = Math.abs((j.drix || 1000) - monDrix);
    return (
      <div style={{ flex:1, background:"#0f0f0f", border:`1px solid ${CJ.border}`, borderRadius:10, padding:"10px 10px" }}>
        <div style={{ fontSize:10, color:CJ.muted, fontWeight:800, marginBottom:6, letterSpacing:1 }}>{label}</div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:30, height:30, borderRadius:"50%", background:`${color}22`, border:`1.5px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
            {j.photo ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <RankIcon drix={j.drix||1000} size={14}/>}
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.pseudo}</div>
            <div style={{ fontSize:11, color:CJ.muted }}>#{(monRangGlobal||0)+rangOffset} · {j.drix||1000} DRIX</div>
            <div style={{ fontSize:11, fontWeight:700, color: ecartPositif ? CJ.red : CJ.green }}>Écart : {ecart} DRIX</div>
          </div>
        </div>
      </div>
    );
  };

  // Evolution chart (SVG line chart)
  const EvolutionChart = () => {
    if (monHistorique.length === 0) return <p style={{ color:CJ.muted, fontSize:13, textAlign:"center", padding:30 }}>Aucun historique disponible.</p>;
    const pts = [...monHistorique].reverse();
    const vals = pts.map(p => p.drix_apres || 1000);
    const minV = Math.min(...vals) - 30;
    const maxV = Math.max(...vals) + 30;
    const W = 320, H = 100;
    const x = (i) => (i / (pts.length - 1 || 1)) * W;
    const y = (v) => H - ((v - minV) / (maxV - minV || 1)) * H;
    const polyline = pts.map((p, i) => `${x(i)},${y(vals[i])}`).join(" ");
    const area = `M${x(0)},${H} ` + pts.map((p, i) => `L${x(i)},${y(vals[i])}`).join(" ") + ` L${x(pts.length-1)},${H} Z`;
    return (
      <div>
        <div style={{ fontSize:13, fontWeight:700, color:CJ.text, marginBottom:10, display:"flex", alignItems:"center", gap:6 }}><TrendingUp size={15} color={CJ.green}/> Évolution de mes DRIX</div>
        <div style={{ background:"#0f0f0f", border:`1px solid ${CJ.border}`, borderRadius:12, padding:14, marginBottom:14, overflowX:"auto" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:H }} preserveAspectRatio="none">
            <defs>
              <linearGradient id="drix-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
              </linearGradient>
            </defs>
            <path d={area} fill="url(#drix-grad)"/>
            <polyline points={polyline} fill="none" stroke="#22c55e" strokeWidth="2.5"/>
            {pts.map((p, i) => (
              <circle key={i} cx={x(i)} cy={y(vals[i])} r="4" fill={p.variation > 0 ? "#22c55e" : "#ef4444"} stroke="#0f0f0f" strokeWidth="1.5"/>
            ))}
          </svg>
        </div>
        <div style={{ fontSize:12, fontWeight:700, color:CJ.muted, marginBottom:8 }}>Derniers mouvements</div>
        {monHistorique.slice(0, 8).map((m, i) => {
          const isVictoire = m.resultat === "victoire" || (!m.resultat && m.variation > 0);
          const isDefaite  = m.resultat === "defaite"  || (!m.resultat && m.variation < 0);
          const gainDrix   = m.variation > 0;
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${CJ.border}` }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:isVictoire ? "#16a34a22" : isDefaite ? "#7f1d1d22" : "#1e293b22", border:`1.5px solid ${isVictoire ? "#22c55e44" : isDefaite ? "#ef444444" : "#33415544"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>{isVictoire ? "V" : isDefaite ? "D" : "·"}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:600, fontSize:13 }}>vs {m.adversaire_pseudo}</div>
                <div style={{ fontSize:11, color:CJ.muted }}>{m.drix_avant} → {m.drix_apres} DRIX</div>
              </div>
              <div>
                <div style={{ fontWeight:800, fontSize:15, color:gainDrix ? CJ.green : CJ.red, textAlign:"right" }}>{gainDrix ? "+" : ""}{m.variation}</div>
                <div style={{ fontSize:10, color:CJ.muted }}>{new Date(m.date).toLocaleDateString("fr-FR")}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ maxWidth:520, margin:"0 auto", padding:"0 0 100px", background:CJ.bg, minHeight:"100vh" }}>
      <style>{LADDER_CSS}</style>

      {/* ── HEADER ── */}
      <div style={{ background:"linear-gradient(160deg,#0f0f0f 0%,#1a1000 60%,#0f0f0f 100%)", padding:"20px 16px 16px", borderBottom:`1px solid #2a2a2a22` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <Gem size={28} color="#a78bfa"/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:900, fontSize:20, color:CJ.text }}>Classement <span style={{ color:"#a78bfa" }}>DRIX</span></div>
            <div style={{ color:CJ.muted, fontSize:12 }}>Saison {saisonActuelle} · Système ELO · Remise à zéro le 1er janvier</div>
          </div>
          {classement.length > 0 && (
            <div style={{ textAlign:"center", flexShrink:0 }}>
              <div style={{ fontWeight:900, fontSize:18, color:"#a78bfa", lineHeight:1 }}>{joueursClassesIds.size || classement.length}</div>
              <div style={{ fontSize:8, color:CJ.muted, fontWeight:700, letterSpacing:.5 }}>JOUEURS</div>
            </div>
          )}
        </div>
        {/* View toggle */}
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={() => setView("classement")} style={{ flex:1, padding:"10px 0", borderRadius:10, border:`2px solid ${view==="classement"?CJ.yellow:CJ.border}`, background:view==="classement"?`${CJ.yellow}18`:"transparent", color:view==="classement"?CJ.yellow:CJ.muted, fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <Trophy size={14}/> HALL OF FAME
          </button>
          <button onClick={() => setView("evolution")} style={{ flex:1, padding:"10px 0", borderRadius:10, border:`2px solid ${view==="evolution"?CJ.blue:CJ.border}`, background:view==="evolution"?`${CJ.blue}18`:"transparent", color:view==="evolution"?CJ.blue:CJ.muted, fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
            <TrendingUp size={14}/> ÉVOLUTION
          </button>
        </div>
      </div>

      <div style={{ padding:"14px 12px" }}>

        {/* ── PODIUM TOP 3 ── */}
        {view === "classement" && podium.length >= 3 && (
          <div style={{ background:"linear-gradient(180deg,#1a1407 0%,#141414 100%)", border:`1px solid ${CJ.yellow}33`, borderRadius:18, padding:"18px 12px 16px", marginBottom:12, position:"relative", overflow:"hidden", animation:"dxRise .5s ease both" }}>
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(120% 80% at 50% -20%, #fbbf2418, transparent 60%)", pointerEvents:"none" }}/>
            <div style={{ position:"relative", textAlign:"center", fontSize:10, fontWeight:900, color:CJ.yellow, letterSpacing:2, marginBottom:14, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <Crown size={14} color={CJ.yellow}/> TOP 3 NATIONAL
            </div>
            <div style={{ position:"relative", display:"flex", alignItems:"flex-end", justifyContent:"center", gap:8 }}>
              {[podium[1], podium[0], podium[2]].map((j) => {
                const rang  = j === podium[0] ? 1 : j === podium[1] ? 2 : 3;
                const r     = getDrixTitreLocal(j.drix || 1000);
                const wk    = variationMap[j.id] || 0;
                const medal = rang===1?"#fbbf24":rang===2?"#cbd5e1":"#d97706";
                const size  = rang===1?78:60;
                const isMe  = joueur && j.id === joueur.id;
                return (
                  <div key={j.id} onClick={()=>setPage("profil-joueur-"+j.id)} style={{ flex:1, maxWidth:120, textAlign:"center", cursor:"pointer" }}>
                    <div style={{ fontSize:rang===1?22:18, marginBottom:4 }}>{rang===1?"🥇":rang===2?"🥈":"🥉"}</div>
                    <div style={{ position:"relative", width:size, height:size, margin:"0 auto" }}>
                      <div style={{ width:size, height:size, borderRadius:"50%", border:`3px solid ${medal}`, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", background:`${r.color}22`, boxShadow:rang===1?`0 0 22px ${medal}77`:`0 0 12px ${medal}44`, animation:rang===1?"dxGlow 2.4s ease-in-out infinite":undefined }}>
                        {j.photo ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <RankIcon drix={j.drix||1000} size={rang===1?34:26}/>}
                      </div>
                      <div style={{ position:"absolute", top:-4, right:-4, width:22, height:22, borderRadius:"50%", background:medal, color:"#1a1a1a", fontWeight:900, fontSize:12, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #141414" }}>{rang}</div>
                    </div>
                    <div style={{ fontWeight:800, fontSize:rang===1?14:12.5, color:isMe?CJ.yellow:CJ.text, marginTop:7, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.pseudo}{isMe?" (moi)":""}</div>
                    <div style={{ fontWeight:900, fontSize:rang===1?20:17, color:r.color, lineHeight:1.1 }}>{j.drix||1000}</div>
                    <div style={{ fontSize:8.5, color:CJ.muted, fontWeight:700, letterSpacing:.5, marginBottom:4 }}>DRIX</div>
                    {wk!==0 && <div style={{ display:"inline-flex", alignItems:"center", gap:2, fontSize:10, fontWeight:800, color:wk>0?CJ.green:CJ.red }}>{wk>0?<TrendingUp size={10}/>:<TrendingDown size={10}/>}{wk>0?"+":""}{wk}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── MON CLASSEMENT ── */}
        {joueur && (
          <div style={{ background:CJ.card, border:`1.5px solid ${CJ.yellow}55`, borderRadius:16, padding:16, marginBottom:12, position:"relative", overflow:"hidden", boxShadow:`0 0 24px ${CJ.yellow}18` }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${CJ.yellow},${CJ.accent},${CJ.yellow})` }}/>
            <div onClick={() => toggleCard("mon")} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: cardsOpen.mon?14:0, cursor:"pointer" }}>
              <span style={{ display:"inline-flex", alignItems:"center", gap:6, fontSize:10, fontWeight:900, color:CJ.yellow, letterSpacing:2 }}>
                <ChevronDown size={14} style={{ transition:"transform .2s", transform: cardsOpen.mon?"none":"rotate(-90deg)" }}/>
                MON CLASSEMENT
              </span>
              {monRangGlobal && (
                <span style={{ display:"inline-flex", alignItems:"center", gap:5, background:"#0f0f0f", border:`1px solid ${CJ.border}`, borderRadius:20, padding:"3px 9px" }}>
                  <span style={{ fontSize:9, color:CJ.muted, fontWeight:700 }}>vs semaine&nbsp;-1</span>
                  <MovementArrow delta={monDelta}/>
                </span>
              )}
            </div>
            {cardsOpen.mon && (<>

            {/* Rang + Photo + DRIX */}
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ textAlign:"center", minWidth:48 }}>
                <div style={{ fontSize:9, color:CJ.muted, fontWeight:700, letterSpacing:1 }}>MON RANG</div>
                <div style={{ fontWeight:900, fontSize:28, color:CJ.text, lineHeight:1.1, marginTop:2 }}>#{monRangGlobal || "—"}</div>
              </div>
              <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
                <div style={{ position:"relative" }}>
                  <div style={{ width:72, height:72, borderRadius:"50%", border:`3px solid ${monRangInfo.color}`, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", background:`${monRangInfo.color}22`, fontSize:30, boxShadow:`0 0 18px ${monRangInfo.color}44` }}>
                    {joueur.photo ? <img src={joueur.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <RankIcon drix={monDrix} size={30}/>}
                  </div>
                  <div style={{ position:"absolute", bottom:-7, left:"50%", transform:"translateX(-50%)" }}><LeagueBadge drix={monDrix} compact/></div>
                </div>
              </div>
              <div style={{ textAlign:"center", minWidth:60 }}>
                <div style={{ fontSize:9, color:CJ.muted, fontWeight:700, letterSpacing:1 }}>MES DRIX</div>
                <div style={{ fontWeight:900, fontSize:28, color:CJ.yellow, lineHeight:1.1, marginTop:2 }}>{monDrix}</div>
                <div style={{ fontSize:9, color:monRangInfo.color, fontWeight:700, marginTop:2 }}>{monRangInfo.titre.toUpperCase()}</div>
              </div>
            </div>

            {/* Stat row : semaine / série / matchs */}
            <div style={{ display:"flex", gap:7, marginTop:16 }}>
              <div style={{ flex:1, background:"#0f0f0f", border:`1px solid ${CJ.border}`, borderRadius:10, padding:"9px 4px", textAlign:"center" }}>
                <div style={{ fontSize:9, color:CJ.muted, fontWeight:700, letterSpacing:.5, marginBottom:3 }}>CETTE SEMAINE</div>
                <div style={{ fontWeight:900, fontSize:16, color: monStats.weeklyVar>0?CJ.green : monStats.weeklyVar<0?CJ.red : CJ.text, display:"flex", alignItems:"center", justifyContent:"center", gap:2 }}>
                  {monStats.weeklyVar>0 && <TrendingUp size={13}/>}{monStats.weeklyVar<0 && <TrendingDown size={13}/>}
                  {monStats.weeklyVar>0?"+":""}{monStats.weeklyVar}
                </div>
              </div>
              <div style={{ flex:1, background:"#0f0f0f", border:`1px solid ${CJ.border}`, borderRadius:10, padding:"9px 4px", textAlign:"center" }}>
                <div style={{ fontSize:9, color:CJ.muted, fontWeight:700, letterSpacing:.5, marginBottom:3 }}>SÉRIE</div>
                {monStats.streak>=2 && monStats.streakType
                  ? <div style={{ fontWeight:900, fontSize:16, color:monStats.streakType==="victoire"?"#f97316":"#38bdf8", display:"flex", alignItems:"center", justifyContent:"center", gap:3 }}>
                      {monStats.streakType==="victoire"?<Flame size={14}/>:<Snowflake size={14}/>}{monStats.streak}
                    </div>
                  : <div style={{ fontWeight:900, fontSize:16, color:CJ.muted }}>—</div>}
              </div>
              <div style={{ flex:1, background:"#0f0f0f", border:`1px solid ${CJ.border}`, borderRadius:10, padding:"9px 4px", textAlign:"center" }}>
                <div style={{ fontSize:9, color:CJ.muted, fontWeight:700, letterSpacing:.5, marginBottom:3 }}>MATCHS</div>
                <div style={{ fontWeight:900, fontSize:16, color:CJ.text }}>{monStats.matches}</div>
              </div>
            </div>

            {/* Objectif immédiat : dépasser le joueur juste devant */}
            {joueurAvant && (() => {
              const ecart = Math.max(0, (joueurAvant.drix||1000) - monDrix);
              const pct   = Math.max(6, Math.min(100, Math.round((monDrix / (joueurAvant.drix||1)) * 100)));
              const vics  = Math.max(1, Math.ceil(ecart / 20));
              return (
                <div style={{ marginTop:14, background:`linear-gradient(135deg,${CJ.accent}14,#0f0f0f)`, border:`1px solid ${CJ.accent}44`, borderRadius:12, padding:"12px 13px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                    <Target size={14} color={CJ.accent}/>
                    <span style={{ fontSize:10, fontWeight:900, color:CJ.accent, letterSpacing:1 }}>OBJECTIF IMMÉDIAT</span>
                  </div>
                  <div style={{ fontSize:13, color:CJ.text, fontWeight:600, marginBottom:9, lineHeight:1.35 }}>
                    Plus que <span style={{ color:CJ.accent, fontWeight:900 }}>{ecart} DRIX</span> pour dépasser <span style={{ fontWeight:800 }}>{joueurAvant.pseudo}</span> <span style={{ color:CJ.muted, fontWeight:700 }}>(#{monRangGlobal-1})</span>
                  </div>
                  <div style={{ height:8, background:"#2a2a2a", borderRadius:5, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${CJ.accent},${CJ.yellow})`, borderRadius:5, animation:"dxBar 1s ease both" }}/>
                  </div>
                  <div style={{ fontSize:10, color:CJ.muted, fontWeight:700, marginTop:6, textAlign:"right" }}>≈ {vics} victoire{vics>1?"s":""} pour le doubler</div>
                </div>
              );
            })()}

            {/* Projection fin de semaine */}
            {monRangProjete && monRangGlobal && (
              <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8, background:"#0f0f0f", border:`1px solid ${CJ.border}`, borderRadius:10, padding:"9px 12px" }}>
                <TrendingUp size={15} color={monRangProjete < monRangGlobal ? CJ.green : monRangProjete > monRangGlobal ? CJ.red : CJ.muted}/>
                <span style={{ fontSize:12, color:CJ.muted, fontWeight:600 }}>Projection :</span>
                <span style={{ fontSize:13, fontWeight:900, color:monRangProjete < monRangGlobal ? CJ.green : CJ.text }}>#{monRangProjete} estimé</span>
                <span style={{ fontSize:11, color:CJ.muted, marginLeft:"auto" }}>si tu gardes ce rythme</span>
              </div>
            )}

            {/* Progression de rang (jauge animée) */}
            <div style={{ marginTop:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <span style={{ fontSize:9, fontWeight:800, color:CJ.text, letterSpacing:1 }}>PROGRESSION DE RANG</span>
                {progression.prochain && <span style={{ fontSize:9, color:CJ.yellow, fontWeight:700 }}>{progression.restant} DRIX avant {progression.prochain.titre.toUpperCase()}</span>}
              </div>
              <div style={{ height:10, background:"#2a2a2a", borderRadius:5, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${progression.pct}%`, background:`linear-gradient(90deg,${monRangInfo.color},${CJ.yellow})`, borderRadius:5, transition:"width .6s", animation:"dxBar 1.1s ease both" }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
                <span style={{ fontSize:10, color:CJ.muted }}>{monDrix} / {progression.prochain ? monRangInfo.max : "MAX"} DRIX</span>
                <span style={{ fontSize:10, fontWeight:800, color:CJ.yellow }}>{progression.pct}%</span>
              </div>
            </div>

            {/* Neighbors */}
            {(joueurAvant || joueurApres) && (
              <div style={{ display:"flex", gap:8, marginTop:14 }}>
                <NeighborCard j={joueurAvant} label="JUSTE DEVANT MOI"  rangOffset={-1} ecartPositif={true}/>
                <NeighborCard j={joueurApres} label="JUSTE DERRIÈRE MOI" rangOffset={1} ecartPositif={false}/>
              </div>
            )}

            {/* Voir voisinage */}
            <button onClick={() => setShowVoisinage(v => !v)} style={{ width:"100%", marginTop:12, padding:"10px 0", background:"transparent", border:`1px solid ${CJ.yellow}44`, borderRadius:10, color:CJ.yellow, fontWeight:700, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              <Users size={14}/> VOIR MON VOISINAGE <ChevronRight size={14} style={{ transition:"transform .2s", transform:showVoisinage?"rotate(90deg)":"none" }}/>
            </button>

            {showVoisinage && (
              <div style={{ marginTop:12, borderTop:`1px solid ${CJ.border}`, paddingTop:12 }}>
                {voisinage.map(j => {
                  const rang = classement.findIndex(x => x.id === j.id) + 1;
                  const isMe = joueur && j.id === joueur.id;
                  const { emoji, color } = getDrixTitreLocal(j.drix || 1000);
                  return (
                    <div key={j.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 10px", borderRadius:8, marginBottom:4, background:isMe?`${CJ.yellow}15`:"transparent", border:`1px solid ${isMe?CJ.yellow+"44":"transparent"}` }}>
                      <span style={{ width:28, textAlign:"center", fontWeight:800, fontSize:13, color:isMe?CJ.yellow:CJ.muted }}>#{rang}</span>
                      <div style={{ width:32, height:32, borderRadius:"50%", background:`${color}22`, border:`2px solid ${isMe?CJ.yellow:color+"44"}`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                        {j.photo ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <RankIcon drix={j.drix||1000} size={14}/>}
                      </div>
                      <div style={{ flex:1 }}>
                        <span style={{ fontWeight:700, fontSize:13, color:isMe?CJ.yellow:CJ.text }}>{j.pseudo}{isMe?" (moi)":""}</span>
                      </div>
                      <span style={{ fontWeight:800, fontSize:15, color }}>{j.drix || 1000}</span>
                    </div>
                  );
                })}
              </div>
            )}
            </>)}
          </div>
        )}


        {/* ── FILTRES ── */}
        <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:14, marginBottom:14 }}>
          <div onClick={() => toggleCard("filtres")} style={{ display:"flex", alignItems:"center", gap:7, marginBottom: cardsOpen.filtres?10:0, cursor:"pointer" }}>
            <Settings size={15} color={CJ.text}/>
            <span style={{ fontWeight:800, fontSize:13, color:CJ.text, letterSpacing:1 }}>FILTRES</span>
            {!cardsOpen.filtres && (
              <span style={{ marginLeft:8, fontSize:10, fontWeight:800, color:CJ.accent, background:`${CJ.accent}1f`, border:`1px solid ${CJ.accent}55`, borderRadius:20, padding:"2px 8px", letterSpacing:.5 }}>
                {({ national:"National", amis:"Mes amis", bar:"Mon bar", asso:"Mon asso", feu:"En feu", chasseurs:"Chasseurs" })[filtre]}
              </span>
            )}
            <ChevronDown size={15} color={CJ.muted} style={{ marginLeft:"auto", transition:"transform .2s", transform: cardsOpen.filtres?"none":"rotate(-90deg)" }}/>
          </div>
          {cardsOpen.filtres && (<>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
            {[
              { key:"national",  Icon:Globe,     label:"NATIONAL",  color:CJ.yellow },
              { key:"amis",      Icon:Users,     label:"MES AMIS",  color:CJ.blue },
              { key:"bar",       Icon:MapPin,    label:"MON BAR",   color:CJ.accent },
              { key:"asso",      Icon:Building2, label:"MON ASSO",  color:"#a78bfa" },
              { key:"feu",       Icon:Flame,     label:"EN FEU",    color:"#f97316" },
              { key:"chasseurs", Icon:Swords,    label:"CHASSEURS", color:CJ.red },
            ].map(({ key, Icon:FIcon, label, color }) => (
              <button key={key} onClick={() => setFiltre(key)} style={{ background:filtre===key?`${color}22`:"transparent", border:`1.5px solid ${filtre===key?color:CJ.border}`, borderRadius:10, padding:"9px 6px", color:filtre===key?color:CJ.muted, fontWeight:700, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                <FIcon size={14} color={filtre===key?color:CJ.muted}/>{label}
              </button>
            ))}
          </div>
          {filtre === "feu"       && <p style={{ color:CJ.muted, fontSize:12, marginTop:8, textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}><Flame size={12} color="#f97316"/> Les joueurs avec la meilleure progression cette semaine</p>}
          {filtre === "chasseurs" && <p style={{ color:CJ.muted, fontSize:12, marginTop:8, textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}><Swords size={12} color={CJ.red}/> Les joueurs derrière toi qui montent — surveille-les</p>}
          {filtre === "chasseurs" && !monRangGlobal && <p style={{ color:CJ.red, fontSize:12, marginTop:6, textAlign:"center" }}>Joue un match classé pour apparaître au classement.</p>}
          {filtre === "bar"  && !joueur?.bar_slug  && <p style={{ color:CJ.red, fontSize:12, marginTop:8, textAlign:"center" }}>Associe-toi à un bar depuis ton profil.</p>}
          {filtre === "asso" && !joueur?.asso_slug && <p style={{ color:CJ.red, fontSize:12, marginTop:8, textAlign:"center" }}>Rejoins une association depuis ton profil.</p>}
          </>)}
        </div>

        {/* ── CONTENU PRINCIPAL ── */}
        {view === "evolution" ? (
          <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:16, marginBottom:12 }}>
            {joueur ? <EvolutionChart/> : <p style={{ color:CJ.muted, textAlign:"center", padding:20, fontSize:13 }}>Connecte-toi pour voir ton évolution.</p>}
          </div>
        ) : (
          <div>
            {/* List header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, padding:"0 2px" }}>
              <div style={{ fontWeight:800, fontSize:14, color:CJ.text, display:"flex", alignItems:"center", gap:6 }}>
                {filtre==="national" ? <><Globe size={14} color={CJ.yellow}/> Classement National</>
                 : filtre==="amis"  ? <><Users size={14} color={CJ.blue}/> Mes Amis</>
                 : filtre==="bar"   ? <><MapPin size={14} color={CJ.accent}/> Mon Bar</>
                 : filtre==="asso"  ? <><Building2 size={14} color="#a78bfa"/> Mon Association</>
                 : filtre==="feu"   ? <><Flame size={14} color="#f97316"/> En feu cette semaine</>
                 :                    <><Swords size={14} color={CJ.red}/> Chasseurs</>}
              </div>
              <div style={{ fontSize:10, color:CJ.muted }}>{classementFiltre.filter(j=>joueursClassesIds.size===0||joueursClassesIds.has(j.id)).length} classés</div>
            </div>

            {loading ? <SpinnerJ/> : (() => {
              const classes    = classementFiltre.filter(j => joueursClassesIds.size === 0 || joueursClassesIds.has(j.id));
              const nonClasses = classementFiltre.filter(j => joueursClassesIds.size > 0 && !joueursClassesIds.has(j.id));

              const renderJoueur = (j, rang, isMe) => {
                const { titre, color } = getDrixTitreLocal(j.drix || 1000);
                const variation = variationMap[j.id] || 0;
                const delta     = rankDeltaMap[j.id] || 0;
                const prevRang  = prevRankMap[j.id] || rang;
                const s         = statsMap[j.id];
                const medalColors = ["#fbbf24","#c0c0c0","#cd7f32"];
                return (
                  <div key={j.id} onClick={() => setPage("profil-joueur-"+j.id)}
                    style={{ background:isMe?`linear-gradient(135deg,${CJ.yellow}15,${CJ.card})`:(rang<=3?`${color}0a`:CJ.card), border:`1.5px solid ${isMe?CJ.yellow+"77":rang===1?color:rang<=3?color+"44":CJ.border}`, borderRadius:14, padding:"12px 14px", marginBottom:8, cursor:"pointer", boxShadow:isMe?`0 0 22px ${CJ.yellow}22`:rang===1?`0 0 14px ${color}22`:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                      {/* Rank + mouvement vs semaine -1 */}
                      <div style={{ minWidth:32, textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                        {rang <= 3 ? (
                          <div style={{ width:30, height:30, borderRadius:"50%", background:medalColors[rang-1], display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, boxShadow:`0 2px 8px ${medalColors[rang-1]}66` }}>
                            {rang===1?"🥇":rang===2?"🥈":"🥉"}
                          </div>
                        ) : (
                          <span style={{ fontWeight:900, fontSize:14, color:isMe?CJ.yellow:CJ.muted }}>#{rang}</span>
                        )}
                        <span title={`Semaine -1 : #${prevRang}`}><MovementArrow delta={delta} compact/></span>
                      </div>
                      {/* Avatar + rank badge */}
                      <div style={{ position:"relative", flexShrink:0 }}>
                        <div style={{ width:46, height:46, borderRadius:"50%", background:`${color}22`, border:`2px solid ${isMe?CJ.yellow:color+"55"}`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                          {j.photo ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <RankIcon drix={j.drix||1000} size={20}/>}
                        </div>
                        <NiveauBulle xp={j.xp || 0} size={18} corner="top-right"/>
                        <div style={{ position:"absolute", bottom:-3, right:-4, background:color, borderRadius:"50%", width:17, height:17, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #1a1a1a" }}><RankIcon drix={j.drix||1000} size={10} color="#fff"/></div>
                      </div>
                      {/* Name + badges + ligue + progress */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                          <span style={{ fontWeight:700, fontSize:14, color:isMe?CJ.yellow:CJ.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {j.pseudo}{isMe?" (moi)":""}
                          </span>
                          <PerfBadge j={j} rang={rang}/>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                          <span style={{ fontSize:12, color, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}><RankIcon drix={j.drix||1000} size={11}/> {titre}</span>
                          <StreakBadge stats={s} compact/>
                        </div>
                        <MiniBar drix={j.drix||1000} color={color}/>
                      </div>
                      {/* DRIX + variation */}
                      <div style={{ textAlign:"right", flexShrink:0 }}>
                        <div style={{ fontWeight:900, fontSize:20, color, lineHeight:1 }}>{j.drix||1000}</div>
                        <div style={{ fontSize:10, color:CJ.muted, marginBottom:2 }}>DRIX</div>
                        {variation !== 0
                          ? <div style={{ fontSize:11, fontWeight:700, color:variation>0?CJ.green:CJ.red, display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
                              <span style={{ display:"flex", alignItems:"center", gap:2 }}>
                                {variation>0 ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
                                {variation>0?"+":""}{variation}
                              </span>
                              <span style={{ fontSize:10, color:CJ.muted, fontWeight:400 }}>cette semaine</span>
                            </div>
                          : <div style={{ fontSize:10, color:CJ.muted }}>stable</div>
                        }
                      </div>
                    </div>
                  </div>
                );
              };

              if (classes.length === 0 && nonClasses.length === 0) {
                return (
                  <div style={{ textAlign:"center", padding:"40px 20px", color:CJ.muted, fontSize:13 }}>
                    {filtre === "amis"      ? "Aucun ami dans le classement."
                     : filtre === "feu"      ? "Personne n'est en feu cette semaine — à toi de jouer !"
                     : filtre === "chasseurs"? "Personne ne te talonne. Belle avance ! 🛡"
                     :                         "Aucun joueur trouvé."}
                  </div>
                );
              }

              return (
                <>
                  {classes.map((j, i) => renderJoueur(j, i + 1, joueur && j.id === joueur.id))}

                  {nonClasses.length > 0 && (
                    <div style={{ marginTop:16 }}>
                      <button onClick={() => setShowNonClasses(v => !v)}
                        style={{ width:"100%", background:"#ffffff08", border:`1px solid ${CJ.border}`, borderRadius:12, padding:"12px 16px", color:CJ.muted, fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:showNonClasses?8:0, touchAction:"manipulation" }}>
                        <span style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <Users size={14} color={CJ.muted}/>
                          Joueurs non classés
                          <span style={{ background:"#ffffff14", borderRadius:20, padding:"2px 8px", fontSize:11, fontWeight:600 }}>{nonClasses.length}</span>
                        </span>
                        <ChevronDown size={15} style={{ transform: showNonClasses?"rotate(180deg)":"none", transition:"transform 0.2s" }}/>
                      </button>
                      {showNonClasses && nonClasses.map((j) => {
                        const { color } = getDrixTitreLocal(j.drix || 1000);
                        const isMe = joueur && j.id === joueur.id;
                        return (
                          <div key={j.id} onClick={() => setPage("profil-joueur-"+j.id)}
                            style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:12, padding:"10px 14px", marginBottom:6, cursor:"pointer", opacity:0.7 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:36, height:36, borderRadius:"50%", background:`${color}22`, border:`1.5px solid ${color}33`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
                                {j.photo ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <RankIcon drix={j.drix||1000} size={16}/>}
                              </div>
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ fontWeight:600, fontSize:13, color:isMe?CJ.yellow:CJ.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                                  {j.pseudo}{isMe?" (moi)":""}
                                </div>
                                <div style={{ fontSize:11, color:CJ.muted }}>Aucun match joué</div>
                              </div>
                              <div style={{ textAlign:"right", flexShrink:0 }}>
                                <div style={{ fontWeight:700, fontSize:15, color:CJ.muted }}>{j.drix||1000}</div>
                                <div style={{ fontSize:10, color:CJ.muted }}>DRIX</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}

            {/* ── PALMARÈS VIVANT (saison en cours) ── */}
            {liveHof && filtre === "national" && (
              <div style={{ background:CJ.card, border:`1px solid ${CJ.yellow}44`, borderRadius:16, padding:16, marginTop:16, position:"relative", overflow:"hidden" }}>
                <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${CJ.yellow},${CJ.accent},#a78bfa)` }}/>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:13 }}>
                  <Sparkles size={16} color={CJ.yellow}/>
                  <span style={{ fontWeight:900, fontSize:14, color:CJ.yellow, letterSpacing:.5 }}>PALMARÈS VIVANT</span>
                  <span style={{ fontSize:10, color:CJ.muted, marginLeft:"auto", fontWeight:700 }}>SAISON {saisonActuelle}</span>
                </div>
                {[
                  { Icon:Crown,      color:"#fbbf24", label:"Leader actuel",         pseudo:liveHof.leader?.pseudo,        j:liveHof.leader,        val:`${liveHof.leader?.drix||0} DRIX` },
                  { Icon:TrendingUp, color:CJ.green,  label:"Meilleure progression", pseudo:liveHof.bestProg?.j?.pseudo,   j:liveHof.bestProg?.j,   val:`+${liveHof.bestProg?.v} cette semaine` },
                  { Icon:Flame,      color:"#f97316", label:"Plus longue série",     pseudo:liveHof.bestStreak?.j?.pseudo, j:liveHof.bestStreak?.j, val:`${liveHof.bestStreak?.v} victoires` },
                  { Icon:Zap,        color:"#a78bfa", label:"Plus gros gain",        pseudo:liveHof.bestGain?.pseudo,      j:liveHof.bestGain?.j,   val:`+${liveHof.bestGain?.v} sur un match` },
                  { Icon:Swords,     color:CJ.blue,   label:"Le plus actif",         pseudo:liveHof.mostActive?.j?.pseudo, j:liveHof.mostActive?.j, val:`${liveHof.mostActive?.v} matchs` },
                ].filter(x => x.pseudo).map((x, i, arr) => (
                  <div key={x.label} onClick={() => x.j && setPage("profil-joueur-"+x.j.id)}
                    style={{ display:"flex", alignItems:"center", gap:11, padding:"10px 0", borderBottom:i<arr.length-1?`1px solid ${CJ.border}`:"none", cursor:x.j?"pointer":"default" }}>
                    <div style={{ width:34, height:34, borderRadius:10, background:`${x.color}1f`, border:`1px solid ${x.color}55`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <x.Icon size={16} color={x.color}/>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:10, color:CJ.muted, fontWeight:700, letterSpacing:.4, textTransform:"uppercase" }}>{x.label}</div>
                      <div style={{ fontWeight:800, fontSize:14, color:CJ.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{x.pseudo}</div>
                    </div>
                    <div style={{ fontSize:12, fontWeight:800, color:x.color, flexShrink:0, textAlign:"right" }}>{x.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Hall of Fame section (bottom of classement) */}
            {hallOfFame.length > 0 && filtre === "national" && (
              <div style={{ background:CJ.card, border:`1px solid ${CJ.yellow}33`, borderRadius:14, padding:16, marginTop:16 }}>
                <div style={{ fontWeight:800, fontSize:14, color:CJ.yellow, marginBottom:14, display:"flex", alignItems:"center", gap:7 }}><Trophy size={15} color={CJ.yellow}/> Hall of Fame — Saisons passées</div>
                {(() => {
                  const saisons = [...new Set(hallOfFame.map(h=>h.saison))].sort((a,b)=>b-a);
                  return saisons.map(s => (
                    <div key={s} style={{ marginBottom:16 }}>
                      <div style={{ fontWeight:700, fontSize:13, color:CJ.yellow, marginBottom:8 }}>Saison {s}</div>
                      {hallOfFame.filter(h=>h.saison===s).slice(0,3).map((h,i)=>(
                        <div key={h.id} style={{ background:"#0f0f0f", border:`1px solid ${i===0?CJ.yellow+"55":CJ.border}`, borderRadius:10, padding:"10px 14px", marginBottom:6, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <span style={{ fontSize:18 }}>{i===0?"🥇":i===1?"🥈":"🥉"}</span>
                            <span style={{ fontWeight:700, fontSize:14 }}>{h.joueur_pseudo}</span>
                          </div>
                          <BadgeJ color={CJ.yellow}>{h.score_final} DRIX</BadgeJ>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
        )}

        {/* ── SYSTÈME DE RANGS ── */}
        <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:16, padding:16, marginTop:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
            <Shield size={16} color={CJ.text}/>
            <span style={{ fontWeight:800, fontSize:13, color:CJ.text, letterSpacing:1 }}>SYSTÈME DE RANGS</span>
          </div>
          <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:6 }}>
            {RANGS.map((r) => {
              const isCurrent = joueur && monRangInfo.titre === r.titre;
              const isNext    = joueur && progression.prochain?.titre === r.titre;
              const RIcon     = r.icon;
              const iconColor = isCurrent ? r.color : isNext ? r.color+"dd" : r.color+"66";
              return (
                <div key={r.titre} style={{ textAlign:"center", flexShrink:0, minWidth:76, padding:"12px 6px 10px", borderRadius:12, border:`2px solid ${isCurrent?r.color:isNext?r.color+"55":CJ.border}`, background:isCurrent?`${r.color}20`:isNext?`${r.color}09`:"transparent", transition:"all .2s" }}>
                  <div style={{ display:"flex", justifyContent:"center", marginBottom:7, filter:isCurrent?`drop-shadow(0 0 7px ${r.color}99)`:"none" }}>
                    <RIcon size={26} color={iconColor} strokeWidth={isCurrent?2.5:1.8}/>
                  </div>
                  <div style={{ fontSize:10, fontWeight:900, color:isCurrent?r.color:CJ.muted, textTransform:"uppercase", letterSpacing:0.4 }}>{r.titre}</div>
                  <div style={{ fontSize:10, color:CJ.muted, marginTop:3 }}>{r.max === Infinity ? `${r.min}+` : `${r.min}–${r.max}`}</div>
                  {isCurrent && <div style={{ fontSize:10, marginTop:6, color:r.color, background:`${r.color}22`, borderRadius:5, padding:"2px 5px", fontWeight:800 }}>● MOI</div>}
                  {isNext && !isCurrent && <div style={{ fontSize:10, marginTop:6, color:r.color+"99", borderRadius:5, padding:"2px 5px", fontWeight:700 }}>suivant</div>}
                </div>
              );
            })}
          </div>
          <div style={{ textAlign:"center", marginTop:12, fontSize:12, color:CJ.muted }}>Classement en temps réel · basé sur tes matchs classés</div>
        </div>

      </div>
    </div>
  );
};

// ── BADGE DRIX ────────────────────────────────────────────────────────────────
export const DrixBadge = ({ drix=1000, size="normal" }) => {
  const { titre, color } = getDrixTitreLocal(drix);
  const big = size === "big";
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:color+"22", border:`1px solid ${color}44`, borderRadius:20, padding:big?"8px 16px":"4px 12px" }}>
      <RankIcon drix={drix} size={big?18:14}/>
      <span style={{ fontWeight:700, color, fontSize:big?15:12 }}>{drix}</span>
      <span style={{ color:color+"99", fontSize:big?12:10 }}>DRIX · {titre}</span>
    </div>
  );
};

// ── HISTORIQUE DRIX ───────────────────────────────────────────────────────────
export const HistoriqueDrix = ({ joueurId }) => {
  const [mouvements, setMouvements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dbDrix.getHistorique(joueurId)
      .then(m => { setMouvements(m||[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, [joueurId]);

  if (loading) return <SpinnerJ/>;
  if (mouvements.length === 0) return <p style={{ color:CJ.muted, fontSize:13 }}>Aucun mouvement DRIX pour l'instant.</p>;

  return (
    <div>
      {mouvements.map(m => (
        <div key={m.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${CJ.border}` }}>
          <div>
            <span style={{ fontWeight:600, fontSize:13 }}>vs {m.adversaire_pseudo}</span>
            <span style={{ color:CJ.muted, fontSize:11, marginLeft:8 }}>{new Date(m.date).toLocaleDateString("fr-FR")}</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ color:CJ.muted, fontSize:12 }}>{m.drix_avant} → {m.drix_apres}</span>
            <span style={{ fontWeight:800, fontSize:14, color:m.variation>0?CJ.green:CJ.red }}>
              {m.variation>0?"+":""}{m.variation}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export { dbJ as dbJoueurs };
export { dbDrix as dbDrixPublic };
// FIN AppJoueurs.jsx