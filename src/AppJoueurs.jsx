import { useState, useMemo, useEffect, useRef } from "react";
import { ArrowLeft, Check, Camera, Pencil, Save, BarChart2, Users, Medal, Clock, Trophy, Skull, Target, ChevronRight, ChevronDown, X, TrendingUp, TrendingDown, Crown, Swords, Search, User, Gem, Globe, Building2, Shield, Settings, MapPin, Navigation, Crosshair, Star, Zap, Flame, Sparkles } from "lucide-react";

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

// ── SYSTÈME BULL ──────────────────────────────────────────────────────────────
export const BULL_MAX   = Infinity; // pas de plafond
export const BULL_DAILY = 50;       // recharge quotidienne
export const BULL_INIT  = 250;      // solde initial à la création du compte
export const BULL_COST  = {
  paisible : 0,  // Comptage de finish — Mode Paisible (gratuit)
  drix     : 25, // Comptage de finish — Chasse aux DRIX
  rush     : 2,  // Rush Mode
  capital  : 0,  // Jeu Capital (gratuit)
  tournoi  : 0,  // Tournoi entre potes (gratuit)
};

export const dbJ = {
  getJoueurs: () => sbJ("joueurs?order=pseudo.asc&select=*"),
  getJoueur: (id) => sbJ(`joueurs?id=eq.${id}&select=*`).then(r => r?.[0]),
  getJoueurByPseudo: (pseudo) => sbJ(`joueurs?pseudo=eq.${encodeURIComponent(pseudo)}&select=*`).then(r => r?.[0]),
  getJoueurByPseudoIlike: (pseudo) => sbJ(`joueurs?pseudo=ilike.${encodeURIComponent(pseudo)}&select=id,pseudo`).then(r => r?.[0]),
  addJoueur: (d) => sbJ("joueurs", { method: "POST", body: JSON.stringify(d) }),
  updateJoueur: (id, d) => sbJ(`joueurs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(d), prefer: "return=minimal" }),
  getJoueursByBar: (slug) => sbJ(`joueurs?bar_slug=eq.${encodeURIComponent(slug)}&select=*`),
  getStats: (joueur_id) => sbJ(`stats_joueurs?joueur_id=eq.${joueur_id}&select=*`).then(r => r?.[0]),
  addStats: (d) => sbJ("stats_joueurs", { method: "POST", body: JSON.stringify(d) }),
  updateStats: (id, d) => sbJ(`stats_joueurs?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(d), prefer: "return=minimal" }),
  getDuels: (joueur_id) => sbJ(`duels?or=(challenger_id.eq.${joueur_id},defie_id.eq.${joueur_id})&order=date.desc&select=*`),
  addDuel: (d) => sbJ("duels", { method: "POST", body: JSON.stringify(d) }),
  updateDuel: (id, d) => sbJ(`duels?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(d), prefer: "return=minimal" }),
  getDuelsEnAttente: (joueur_id) => sbJ(`duels?defie_id=eq.${joueur_id}&statut=eq.en_attente&select=*`),
  deleteDuel: (id) => sbJ(`duels?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
  getPresences: (bar_slug) => sbJ(`presences?bar_slug=eq.${encodeURIComponent(bar_slug)}&date_jour=eq.${todayStr()}&select=*`),
  addPresence: (d) => sbJ("presences", { method: "POST", body: JSON.stringify(d) }),
  deletePresence: (id) => sbJ(`presences?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
  getMyPresence: (joueur_id, bar_slug) => sbJ(`presences?joueur_id=eq.${joueur_id}&bar_slug=eq.${encodeURIComponent(bar_slug)}&date_jour=eq.${todayStr()}&select=*`).then(r => r?.[0]),
  getBarsActifs: () => sbJ(`presences?date_jour=eq.${todayStr()}&select=bar_slug`),
  updateBull: (id, bull, date) => sbJ(`joueurs?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({ bull_balance:bull, last_daily_reward:date }), prefer:"return=minimal" }),
  updateBullReserved: (id, bull_balance, bull_reserved) => sbJ(`joueurs?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({ bull_balance, bull_reserved }), prefer:"return=minimal" }),
};

// ── Fonctions BULL ────────────────────────────────────────────────────────────
// Vérifie à chaque connexion si la recharge quotidienne doit être appliquée.
// La recharge n'est appliquée QUE si l'écriture en base réussit (évite les doublons).
export const checkDailyBull = async (joueur) => {
  if (!joueur?.id) return joueur;
  const today = todayStr();
  if (joueur.last_daily_reward === today) return joueur; // déjà rechargé aujourd'hui
  const current = joueur.bull_balance ?? BULL_INIT;
  const bull = current + BULL_DAILY;
  try {
    await dbJ.updateBull(joueur.id, bull, today);
    // L'écriture a réussi → on met à jour l'état local
    return { ...joueur, bull_balance: bull, last_daily_reward: today };
  } catch {
    // L'écriture a échoué (colonnes manquantes ?) → on ne touche pas à l'état local
    return joueur;
  }
};

// Déduit des BULL et met à jour le serveur. Lance une erreur si solde insuffisant.
export const spendBull = async (joueur, amount) => {
  const bal = joueur.bull_balance ?? BULL_INIT;
  if (bal < amount) throw new Error(`insuffisant`);
  const newBal = bal - amount;
  await dbJ.updateBull(joueur.id, newBal, joueur.last_daily_reward ?? todayStr());
  return { ...joueur, bull_balance: newBal };
};

// Réserve des BULL pour un défi (balance -= mise, reserved += mise).
export const reserverBull = async (joueurId, mise) => {
  const j = await dbJ.getJoueur(joueurId);
  if (!j) throw new Error("Joueur introuvable");
  const balance  = j.bull_balance  ?? BULL_INIT;
  const reserved = j.bull_reserved ?? 0;
  if (balance < mise) throw new Error("Solde insuffisant");
  await dbJ.updateBullReserved(joueurId, balance - mise, reserved + mise);
};

// Applique le transfert BULL après un duel de type "bull".
// Le gagnant récupère les 2 mises (les 2 ont été déduites à l'acceptation).
export const appliquerBullDuel = async (duel) => {
  try {
    const mise = duel.bull_mise || 0;
    if (!mise) return;
    const gagnantId = duel.gagnant_id;
    if (!gagnantId) return;
    const perdantId = gagnantId === duel.challenger_id ? duel.defie_id : duel.challenger_id;
    const [jG, jP] = await Promise.all([dbJ.getJoueur(gagnantId), dbJ.getJoueur(perdantId)]);
    if (!jG || !jP) return;
    const gBull = jG.bull_balance ?? BULL_INIT;
    const gRes  = jG.bull_reserved ?? 0;
    const pRes  = jP.bull_reserved ?? 0;
    await Promise.all([
      // Gagnant : reçoit les 2 mises (+2×mise), libère sa réservation
      dbJ.updateBullReserved(gagnantId, gBull + mise * 2, Math.max(0, gRes - mise)),
      // Perdant : sa mise était déjà déduite — on libère seulement la réservation
      dbJ.updateBullReserved(perdantId, jP.bull_balance ?? 0, Math.max(0, pRes - mise)),
    ]);
  } catch(e) { console.error("Erreur BULL duel:", e); }
};

// ── Couleurs ──────────────────────────────────────────────────────────────────
const CJ = {
  bg:"#0f0f0f", card:"#1a1a1a", border:"#2a2a2a",
  accent:"#f97316", text:"#f1f5f9", muted:"#94a3b8",
  green:"#22c55e", red:"#ef4444", yellow:"#f59e0b", purple:"#a78bfa", blue:"#60a5fa",
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
  return <button onPointerDown={disabled?undefined:(e)=>{e.preventDefault();onClick&&onClick(e);}} style={{ cursor:disabled?"not-allowed":"pointer",borderRadius:8,fontWeight:600,fontSize:14,padding:"10px 20px",transition:"all .15s",opacity:disabled?.5:1,touchAction:"manipulation",WebkitTapHighlightColor:"transparent",...variants[variant],...style }}>{children}</button>;
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
  { titre:"Légende",     min:1700, max:1900,     emoji:"🏆",   color:"#f97316", icon:Trophy     },
  { titre:"Master Bull", min:1900, max:2100,     emoji:"👑",   color:"#ef4444", icon:Crown      },
  { titre:"Titan",       min:2100, max:2500,     emoji:"🔥",   color:"#dc2626", icon:Flame      },
  { titre:"Mythique",    min:2500, max:Infinity, emoji:"✨",   color:"#ffd700", icon:Sparkles   },
];
const getDrixTitreLocal = (drix) => {
  for (const r of RANGS) { if (drix < r.max) return r; }
  return RANGS[RANGS.length - 1];
};
// Helper : icône Lucide du rang — remplace {emoji} dans toute l'UI
const RankIcon = ({ drix, size=16, color:colorOverride }) => {
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

// Code admin pour réinitialiser un mot de passe oublié (à communiquer à voix)
const RESET_ADMIN_CODE = "jesuisunebrele";

// ── CONNEXION / INSCRIPTION ───────────────────────────────────────────────────
export const Connexion = ({ onLogin, setPage, associations=[], initMode="login" }) => {
  const [mode, setMode] = useState(initMode); // "login" | "register" | "reset"
  const [pseudo, setPseudo] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [adminCode, setAdminCode] = useState("");
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

  const assoSuggestions = assoQuery.length >= 1
    ? associations.filter(a => a.nom.toLowerCase().includes(assoQuery.toLowerCase()) || (a.ville||"").toLowerCase().includes(assoQuery.toLowerCase())).slice(0, 6)
    : [];

  const resetFields = () => { setErr(""); setSuccess(""); setPseudo(""); setPwd(""); setPwd2(""); setAdminCode(""); setNom(""); setPrenom(""); setEmail(""); setVille(""); setAssoQuery(""); setSelectedAsso(null); };

  const login = async () => {
    if (!pseudo.trim() || !pwd) return;
    setLoading(true); setErr("");
    try {
      const hash = await hashPwd(pwd);
      const j = await dbJ.getJoueurByPseudo(pseudo.trim());
      if (!j || j.password_hash !== hash) { setErr("Pseudo ou mot de passe incorrect"); setLoading(false); return; }
      onLogin(j);
    } catch { setErr("Erreur de connexion"); }
    setLoading(false);
  };

  const register = async () => {
    if (!prenom.trim() || !nom.trim()) { setErr("Prénom et nom obligatoires"); return; }
    if (!email.trim() || !email.includes("@")) { setErr("Adresse e-mail invalide"); return; }
    if (!pseudo.trim() || !pwd || pwd !== pwd2) { setErr(pwd !== pwd2 ? "Les mots de passe ne correspondent pas" : "Pseudo et mots de passe obligatoires"); return; }
    const pseudoErr = validerPseudo(pseudo);
    if (pseudoErr) { setErr(pseudoErr); return; }
    setLoading(true); setErr("");
    try {
      const exist = await dbJ.getJoueurByPseudoIlike(pseudo.trim());
      if (exist) { setErr(`Ce pseudo est déjà pris${exist.pseudo !== pseudo.trim() ? ` (par "${exist.pseudo}")` : ""}`); setLoading(false); return; }
      const hash = await hashPwd(pwd);
      const payload = {
        pseudo: pseudo.trim(),
        password_hash: hash,
        date_inscription: Date.now(),
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim().toLowerCase(),
        ville: ville.trim() || null,
        asso_slug: selectedAsso?.slug || null,
      };
      const r = await dbJ.addJoueur(payload);
      if (r?.[0]) {
        await dbJ.addStats({ joueur_id: r[0].id, saison: "2025", victoires: 0, defaites: 0, parties: 0 });
        onLogin(r[0]);
      }
    } catch { setErr("Erreur lors de l'inscription"); }
    setLoading(false);
  };

  const resetPwd = async () => {
    setErr(""); setSuccess("");
    if (!pseudo.trim()) { setErr("Entre ton pseudo"); return; }
    if (adminCode !== RESET_ADMIN_CODE) { setErr("Code administrateur incorrect"); return; }
    if (!pwd || pwd.length < 4) { setErr("Nouveau mot de passe trop court (min 4 caractères)"); return; }
    if (pwd !== pwd2) { setErr("Les mots de passe ne correspondent pas"); return; }
    setLoading(true);
    try {
      const j = await dbJ.getJoueurByPseudo(pseudo.trim());
      if (!j) { setErr("Pseudo introuvable"); setLoading(false); return; }
      const hash = await hashPwd(pwd);
      await sbJ(`joueurs?id=eq.${j.id}`, { method:"PATCH", body:JSON.stringify({ password_hash: hash }), prefer:"return=minimal" });
      setSuccess("✅ Mot de passe réinitialisé ! Tu peux te connecter.");
      setPwd(""); setPwd2(""); setAdminCode("");
    } catch { setErr("Erreur lors de la réinitialisation"); }
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

              {/* Compte */}
              <div style={{ fontSize:11,fontWeight:700,color:CJ.muted,letterSpacing:.5,marginTop:4,marginBottom:2 }}>COMPTE</div>
              <FieldJ label="Pseudo *" value={pseudo} onChange={setPseudo} placeholder="VotrePseudo"/>
              <FieldJ label="Mot de passe *" value={pwd} onChange={setPwd} placeholder="••••••••" type="password"/>
              <FieldJ label="Confirmer le mot de passe *" value={pwd2} onChange={setPwd2} placeholder="••••••••" type="password"/>

              {err && <p style={{ color:CJ.red, fontSize:13 }}>⚠️ {err}</p>}
              <BtnJ onClick={register} disabled={loading} style={{ marginTop:6 }}>
                {loading ? "Création en cours…" : "Créer mon compte →"}
              </BtnJ>
              <p style={{ fontSize:11,color:CJ.muted,textAlign:"center",marginTop:2 }}>* Champs obligatoires</p>
            </div>
          )}
        </>) : (<>
          <div style={{ marginBottom:20 }}>
            <div style={{ fontWeight:700,fontSize:16,marginBottom:4 }}>🔑 Réinitialiser le mot de passe</div>
            <div style={{ fontSize:12,color:CJ.muted }}>Demande le code admin à l'organisateur du bar.</div>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <FieldJ label="Pseudo" value={pseudo} onChange={setPseudo} placeholder="Ton pseudo"/>
            <FieldJ label="Code administrateur" value={adminCode} onChange={setAdminCode} placeholder="Code fourni par l'admin" type="password"/>
            <FieldJ label="Nouveau mot de passe" value={pwd} onChange={setPwd} placeholder="••••••••" type="password"/>
            <FieldJ label="Confirmer le nouveau mot de passe" value={pwd2} onChange={setPwd2} placeholder="••••••••" type="password"/>
            {err && <p style={{ color:CJ.red, fontSize:13 }}>⚠️ {err}</p>}
            {success && <p style={{ color:"#22c55e", fontSize:13 }}>{success}</p>}
            <BtnJ onClick={resetPwd} disabled={loading} style={{ marginTop:4 }}>
              {loading ? "Réinitialisation…" : "Réinitialiser le mot de passe"}
            </BtnJ>
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
  const [duels, setDuels]         = useState([]);
  const [drixMvts, setDrixMvts]   = useState([]);
  const [classement, setClassement] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [tournoisPotes, setTournoisPotes] = useState([]);
  const [badgeCount, setBadgeCount] = useState(getBadgesStored(joueur.id).size);
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
  const getPseudoChanges = () => parseInt(localStorage.getItem(PSEUDO_CHANGES_KEY)||"0");
  const [pseudoChanges, setPseudoChanges] = useState(getPseudoChanges);

  // Affiliations expand
  const [affilBar, setAffilBar]   = useState(false);
  const [affilAsso, setAffilAsso] = useState(false);
  const [searchAsso, setSearchAsso] = useState("");
  const [searchBar, setSearchBar]   = useState("");

  const bar  = bars.find(b => b.slug === joueur.bar_slug);
  const asso = associations.find(a => a.slug === joueur.asso_slug);
  const { titre, emoji, color } = getDrixTitreLocal(joueur.drix||1000);
  const prog = getProgression(joueur.drix||1000);
  const STYLES = [["electronique","⚡ Électronique"],["traditionnel","🎯 Traditionnel"],["les deux","🎯⚡ Les deux"]];

  useEffect(() => {
    Promise.all([
      dbJ.getStats(joueur.id),
      dbJ.getDuels(joueur.id),
      sbJ(`drix_mouvements?joueur_id=eq.${joueur.id}&order=date.desc&limit=20&select=*`).catch(()=>[]),
      sbJ(`joueurs?order=drix.desc&select=id`).catch(()=>[]),
      sbJ(`amis?or=(joueur_id.eq.${joueur.id},ami_id.eq.${joueur.id})&select=statut`).catch(()=>[]),
    ]).then(([s, d, mvts, allJ, amis]) => {
      setStats(s); setDuels(d||[]); setDrixMvts(mvts||[]);
      if (allJ?.length) {
        const pos = allJ.findIndex(j => j.id === joueur.id);
        setClassement({ position: pos >= 0 ? pos + 1 : null, total: allJ.length });
      }
      // Calcul badge count réel
      const vals = computeBadgeValues(joueur, s, d||[], mvts||[], amis||[]);
      const unlocked = ALL_BADGES.filter(b=>b.val(vals)>=b.seuil).length;
      setBadgeCount(unlocked);
      storeBadgesSet(joueur.id, new Set(ALL_BADGES.filter(b=>b.val(vals)>=b.seuil).map(b=>b.id)));
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
    if (pseudoChange) patch.pseudo = newPseudo;
    await dbJ.updateJoueur(joueur.id, patch);
    const updated = {...joueur, ...patch};
    setJoueur(updated); localStorage.setItem("dp_joueur", JSON.stringify(updated));

    if (pseudoChange) {
      const newCount = pseudoChanges + 1;
      localStorage.setItem(PSEUDO_CHANGES_KEY, String(newCount));
      setPseudoChanges(newCount);
      // Cascade : mettre à jour joueur_pseudo dans drix_mouvements (affichage uniquement)
      sbJ(`drix_mouvements?joueur_id=eq.${joueur.id}`, { method:"PATCH", body:JSON.stringify({ joueur_pseudo:newPseudo }), prefer:"return=minimal" }).catch(()=>{});
      // NOTE : on ne met PAS à jour challenger_pseudo/defie_pseudo dans les duels,
      // car manches_detail[].winner stocke l'ancien pseudo — les modifier casserait le calcul des stats.
    }
    setSavingEdit(false); setEditMode(false);
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = new Image();
      img.onload = async () => {
        const MAX=300; let w=img.width, h=img.height;
        if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
        const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
        canvas.getContext("2d").drawImage(img,0,0,w,h);
        const data = canvas.toDataURL("image/jpeg",0.8);
        await dbJ.updateJoueur(joueur.id,{photo:data});
        const updated = {...joueur, photo:data};
        setJoueur(updated); localStorage.setItem("dp_joueur", JSON.stringify(updated));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
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
  const moyenneDuels = (() => {
    const scores = termines.map(d=>parseFloat(d.challenger_id===joueur.id?d.score_challenger:d.score_defie)).filter(s=>!isNaN(s)&&s>0);
    return scores.length > 0 ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : null;
  })();

  // Activité récente : les 5 derniers mouvements DRIX
  const activiteRecente = drixMvts.slice(0, 5);

  return (
    <div style={{ maxWidth:600, margin:"0 auto", padding:"16px 16px 80px" }}>

      {/* ── 1. HERO PROFIL ─────────────────────────────────────────────────── */}
      <div style={{
        position:"relative", overflow:"hidden",
        background:`linear-gradient(135deg,#0d0d1a 0%,#1a0a00 50%,#0d0d1a 100%)`,
        border:`1px solid ${color}66`,
        borderRadius:20, padding:20, marginBottom:14,
        boxShadow:`0 0 30px ${color}22, 0 0 60px ${color}11, inset 0 0 40px #00000044`,
      }}>
        {/* Fond neon décoratif */}
        <div style={{ position:"absolute", top:-40, right:-40, width:180, height:180, borderRadius:"50%", background:`radial-gradient(circle,${color}18 0%,transparent 70%)`, pointerEvents:"none" }}/>
        <div style={{ position:"absolute", bottom:-30, left:-30, width:120, height:120, borderRadius:"50%", background:`radial-gradient(circle,${color}10 0%,transparent 70%)`, pointerEvents:"none" }}/>

        <div style={{ display:"flex", gap:16, alignItems:"flex-start", position:"relative" }}>

          {/* Photo avec halo neon */}
          <div style={{ position:"relative", flexShrink:0 }}>
            {/* Halo lumineux derrière la photo */}
            <div style={{ position:"absolute", inset:-6, borderRadius:"50%", background:`radial-gradient(circle,${color}44 0%,transparent 70%)`, filter:"blur(8px)", zIndex:0 }}/>
            <div onClick={()=>photoRef.current?.click()} style={{ position:"relative", zIndex:1,
              width:80, height:80, borderRadius:"50%",
              border:`2px solid ${color}`,
              boxShadow:`0 0 12px ${color}88, 0 0 24px ${color}44`,
              overflow:"hidden", cursor:"pointer",
              background:color+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>
              {joueur.photo
                ? <img src={joueur.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                : <RankIcon drix={joueur.drix||1000} size={32}/>}
            </div>
            <div onClick={()=>photoRef.current?.click()}
              style={{ position:"absolute",bottom:0,right:0,zIndex:2,
                background:"#f97316", borderRadius:"50%", width:22, height:22,
                display:"flex", alignItems:"center", justifyContent:"center",
                cursor:"pointer", border:`2px solid #0d0d1a`,
                boxShadow:"0 0 8px #f9731688" }}>
              <Camera size={11} color="#fff"/>
            </div>
            <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={uploadPhoto}/>
          </div>

          {/* Identité */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
              <h1 style={{ fontWeight:900, fontSize:22, margin:0,
                textShadow:`0 0 20px ${color}88, 0 0 40px ${color}44`,
                color:"#fff", letterSpacing:.5 }}>{joueur.pseudo}</h1>
              {!editMode && (
                <button onClick={()=>{ setEditMode(true); setEditPseudo(joueur.pseudo); setPseudoErreur(""); }}
                  style={{ background:"none",border:`1px solid ${CJ.border}`,color:CJ.muted,cursor:"pointer",borderRadius:6,padding:"4px 8px",touchAction:"manipulation",display:"flex",alignItems:"center" }}>
                  <Pencil size={12}/>
                </button>
              )}
            </div>

            {/* DRIX + rang — pill neon */}
            <div style={{ display:"inline-flex", alignItems:"center", gap:8,
              background:`linear-gradient(90deg,${color}22,${color}11)`,
              border:`1px solid ${color}66`,
              boxShadow:`0 0 12px ${color}33`,
              borderRadius:20, padding:"5px 14px", marginBottom:8 }}>
              <RankIcon drix={joueur.drix||1000} size={18}/>
              <span style={{ fontWeight:900, fontSize:18, color,
                textShadow:`0 0 10px ${color}` }}>{joueur.drix||1000}</span>
              <span style={{ fontSize:11, color, fontWeight:700, opacity:.85 }}>DRIX · {titre}</span>
            </div>

            {/* Stats rapides */}
            {stats && (
              <div style={{ display:"flex", gap:14, marginBottom:8 }}>
                <span style={{ fontSize:12, color:"#94a3b8" }}><span style={{ color:CJ.green, fontWeight:700 }}>{stats.victoires}V</span> · <span style={{ color:CJ.red, fontWeight:700 }}>{stats.defaites}D</span> · <span style={{ color:CJ.yellow, fontWeight:700 }}>{winRate}%</span> WR</span>
              </div>
            )}

            {/* Classement + infos */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
              {classement?.position && (
                <BadgeJ color={CJ.yellow}>🏆 #{classement.position} national</BadgeJ>
              )}
              {joueur.age && <BadgeJ color={CJ.muted}>🎂 {joueur.age} ans</BadgeJ>}
              {joueur.ville && <BadgeJ color={CJ.blue}>📍 {joueur.ville}</BadgeJ>}
              {joueur.style_jeu && <BadgeJ color={CJ.accent}>{STYLES.find(s=>s[0]===joueur.style_jeu)?.[1]||joueur.style_jeu}</BadgeJ>}
            </div>
          </div>
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

      {/* ── 2. PROGRESSION DE RANG ─────────────────────────────────────────── */}
      <div style={{ background:CJ.card, border:`1px solid ${color}33`, borderRadius:14, padding:16, marginBottom:14 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <RankIcon drix={joueur.drix||1000} size={20}/>
            <span style={{ fontWeight:800, fontSize:14, color }}>{titre}</span>
          </div>
          {prog.prochain ? (
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <ChevronRight size={13} color={CJ.muted}/>
              <RankIcon drix={prog.prochain.min} size={16}/>
              <span style={{ fontWeight:700, fontSize:12, color:prog.prochain.color }}>{prog.prochain.titre}</span>
            </div>
          ) : (
            <span style={{ fontSize:11, color:CJ.yellow, fontWeight:700 }}>Rang maximum</span>
          )}
        </div>

        {/* Barre de progression */}
        <div style={{ background:"#ffffff12", borderRadius:8, height:10, overflow:"hidden", marginBottom:8 }}>
          <div style={{
            height:"100%", borderRadius:8,
            background:`linear-gradient(90deg, ${color}aa, ${color})`,
            width:`${prog.pct}%`,
            transition:"width 0.8s cubic-bezier(0.34,1.56,0.64,1)",
            boxShadow:`0 0 8px ${color}88`,
          }}/>
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:CJ.muted }}>
          <span style={{ fontWeight:700, color }}>{joueur.drix||1000} DRIX</span>
          {prog.prochain ? (
            <span style={{ color:CJ.muted }}>{prog.restant} DRIX avant <strong style={{ color:prog.prochain.color }}>{prog.prochain.titre}</strong></span>
          ) : (
            <span style={{ color:CJ.yellow }}>Niveau maximal atteint 🏆</span>
          )}
        </div>
      </div>

      {/* ── 3. STATS RAPIDES ───────────────────────────────────────────────── */}
      {stats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:14 }}>
          {[
            [stats.victoires, "Victoires", CJ.green,  <Trophy size={14} color={CJ.green}/>],
            [stats.defaites,  "Défaites",  CJ.red,    <Skull size={14} color={CJ.red}/>],
            [winRate+"%",     "Winrate",   CJ.yellow, <Target size={14} color={CJ.yellow}/>],
            [moyenneDuels??"—","Moy. pts", CJ.blue,   <BarChart2 size={14} color={CJ.blue}/>],
          ].map(([val, label, col, ic]) => (
            <div key={label} style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:12, padding:"12px 8px", textAlign:"center" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:5 }}>{ic}</div>
              <div style={{ fontWeight:900, fontSize:20, color:col, lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:12, color:CJ.muted, marginTop:4, fontWeight:500 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

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

      {/* ── 5. MON UNIVERS ─────────────────────────────────────────────────── */}
      <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:16, marginBottom:14 }}>
        <div style={{ fontSize:11, color:CJ.muted, fontWeight:700, letterSpacing:1, marginBottom:12 }}>MON UNIVERS</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            { icon:<BarChart2 size={22}/>, label:"Stats",       sub:"Mes performances",  action:()=>setPage("profil-stats"),      color:CJ.blue },
            { icon:<Users size={22}/>,     label:"Amis",        sub:"Mes connexions",    action:()=>setPage("profil-amis"),       color:CJ.green, badge:demandesAmisCount },
            { icon:<Medal size={22}/>,     label:"Badges",      sub:`${badgeCount}/${ALL_BADGES.length} débloqués`, action:()=>{ const n=badgeCount; localStorage.setItem(BADGES_SEEN_KEY,String(n)); setBadgesSeen(n); setPage("profil-badges"); }, color:CJ.yellow, badge:newBadgesCount },
            { icon:<Clock size={22}/>,     label:"Historique",  sub:"Mes duels",         action:()=>setPage("profil-historique"), color:CJ.accent },
          ].map(({ icon, label, sub, action, color: col, badge }) => (
            <button key={label} onClick={action}
              style={{ background:"#ffffff07",border:`1px solid ${CJ.border}`,borderRadius:12,padding:"18px 12px",cursor:"pointer",textAlign:"center",touchAction:"manipulation",position:"relative",transition:"all .15s",display:"flex",flexDirection:"column",alignItems:"center",gap:6 }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor=col; e.currentTarget.style.background=col+"10"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=CJ.border; e.currentTarget.style.background="#ffffff07"; }}>
              {badge > 0 && (
                <div style={{ position:"absolute",top:8,right:8,background:CJ.green,color:"#fff",borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:900 }}>{badge>9?"9+":badge}</div>
              )}
              <div style={{ color:col }}>{icon}</div>
              <div style={{ fontWeight:700, fontSize:14, color:CJ.text }}>{label}</div>
              <div style={{ fontSize:12, color:CJ.muted }}>{sub}</div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 6. ACTIVITÉ RÉCENTE ────────────────────────────────────────────── */}
      {activiteRecente.length > 0 && (
        <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:16, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:11, color:CJ.muted, fontWeight:700, letterSpacing:1 }}>ACTIVITÉ RÉCENTE</div>
            <button onClick={()=>setPage("profil-historique")}
              style={{ background:"none",border:"none",color:CJ.accent,cursor:"pointer",fontSize:11,fontWeight:600,touchAction:"manipulation" }}>
              Tout voir →
            </button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {activiteRecente.map((m, i) => {
              const gain = m.variation > 0;
              const date = m.date ? new Date(m.date).toLocaleDateString("fr-FR",{day:"numeric",month:"short"}) : "";
              return (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:i<activiteRecente.length-1?`1px solid ${CJ.border}33`:"none" }}>
                  <div style={{ width:34,height:34,borderRadius:"50%",background:gain?"#14532d":"#7f1d1d",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0 }}>
                    {gain ? "🏆" : "💀"}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13 }}>
                      {gain ? "Victoire" : "Défaite"} vs {m.adversaire_pseudo || "?"}
                    </div>
                    <div style={{ fontSize:11, color:CJ.muted }}>{date} · {m.drix_avant}→{m.drix_apres} DRIX</div>
                  </div>
                  <div style={{ fontWeight:800, fontSize:14, color:gain?CJ.green:CJ.red, background:gain?"#14532d":"#7f1d1d", borderRadius:8, padding:"3px 9px", flexShrink:0 }}>
                    {gain?"+":""}{m.variation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 7. MES AFFILIATIONS ────────────────────────────────────────────── */}
      <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:16 }}>
        <div style={{ fontSize:11, color:CJ.muted, fontWeight:700, letterSpacing:1, marginBottom:12 }}>MES AFFILIATIONS</div>

        {/* Bar affilié */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:affilBar?10:0 }}>
            <div>
              <div style={{ fontSize:11, color:CJ.muted }}>🍺 Bar affilié</div>
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
              <div style={{ fontSize:11, color:CJ.muted }}>🫂 Association affiliée</div>
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

    </div>
  );
};


// ── PAGE STATS ────────────────────────────────────────────────────────────────
export const PageProfilStats = ({ joueur, setJoueur, bars, associations, setPage }) => {
  const [stats, setStats]         = useState(null);
  const [duels, setDuels]         = useState([]);
  const [drixMvts, setDrixMvts]   = useState([]);
  const [classement, setClassement] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([
      dbJ.getStats(joueur.id),
      dbJ.getDuels(joueur.id),
      sbJ(`drix_mouvements?joueur_id=eq.${joueur.id}&order=date.desc&limit=50&select=*`).catch(()=>[]),
      sbJ(`joueurs?order=drix.desc&select=id`).catch(()=>[]),
    ]).then(([s, d, mvts, allJ]) => {
      setStats(s);
      setDuels(d||[]);
      setDrixMvts(mvts||[]);
      if (allJ?.length) {
        const pos = allJ.findIndex(j => j.id === joueur.id);
        setClassement({ position: pos >= 0 ? pos + 1 : null, total: allJ.length });
      }
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
      if (isW) { manchesGagnees++; if (fin >= 100) nbFinishes100++; }
      // Vrai checkout % : tentatives (score ≤ 170 au début d'une volée)
      const myAttempts = isW ? (m.winner_checkout_attempts||0) : (m.loser_checkout_attempts||0);
      if (myAttempts > 0) { checkoutAttempts += myAttempts; if (isW) checkoutSuccess++; }
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

  // Graphique DRIX
  const chartPts = [...drixMvts].reverse().map(m=>m.drix_apres||m.drix_avant||1000);
  const drixTrend = chartPts.length>=2 ? chartPts[chartPts.length-1]-chartPts[0] : 0;

  // ── Composants internes ───────────────────────────────────────────────────
  const StatCard = ({ label, value, color=CJ.text, sub=null, bientot=false }) => (
    <div style={{ background:"#1a1a1a", border:`1px solid ${CJ.border}`, borderRadius:10, padding:"12px 10px", position:"relative" }}>
      {bientot && <span style={{ position:"absolute",top:6,right:6,background:"#1a1a1a",border:`1px solid ${CJ.border}`,borderRadius:4,fontSize:9,color:CJ.muted,padding:"1px 5px" }}>bientôt</span>}
      <div style={{ fontSize:22, fontWeight:900, color, marginBottom:2 }}>{bientot?"—":value}</div>
      <div style={{ fontSize:12, color:CJ.muted }}>{label}</div>
      {sub && !bientot && <div style={{ fontSize:11, color:CJ.muted, marginTop:1 }}>{sub}</div>}
    </div>
  );
  const SectionTitle = ({ icon: Icon, children }) => (
    <h3 style={{ fontWeight:800, fontSize:14, color:CJ.text, marginBottom:10, marginTop:18, letterSpacing:0.5, display:"flex", alignItems:"center", gap:6 }}>
      {Icon && <Icon size={14} color={CJ.accent}/>}
      {children}
    </h3>
  );

  const { titre:drixTitre, emoji:drixEmoji, color:drixColor } = getDrixTitreLocal(joueur.drix||1000);

  return (
    <div style={{ maxWidth:860, margin:"0 auto", padding:"16px 16px 40px" }}>
      <button onClick={()=>window.history.back()} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",fontSize:14,marginBottom:16,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation" }}><ArrowLeft size={16}/> Retour</button>

      {/* Hero DRIX */}
      <div style={{ background:"#1a1a1a",border:`1px solid ${drixColor}44`,borderRadius:16,padding:20,marginBottom:4,display:"flex",alignItems:"center",gap:16 }}>
        <div style={{ fontSize:48 }}>{drixEmoji}</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13,color:CJ.muted,marginBottom:2 }}>DRIX actuel</div>
          <div style={{ fontSize:42,fontWeight:900,color:drixColor,lineHeight:1 }}>{joueur.drix||1000}</div>
          <div style={{ fontSize:13,color:drixColor,marginTop:3 }}>{drixTitre}</div>
        </div>
        {classement?.position && (
          <div style={{ textAlign:"center",background:"#ffffff0d",borderRadius:12,padding:"10px 16px" }}>
            <div style={{ fontSize:28,fontWeight:900,color:CJ.yellow }}>#{classement.position}</div>
            <div style={{ fontSize:10,color:CJ.muted }}>/ {classement.total} joueurs</div>
          </div>
        )}
      </div>

      {/* Performance */}
      <SectionTitle icon={Target}>Performance</SectionTitle>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
        <StatCard label="Victoires"  value={stats?.victoires??0}  color={CJ.green}/>
        <StatCard label="Défaites"   value={stats?.defaites??0}   color={CJ.red}/>
        <StatCard label="Parties"    value={stats?.parties??0}    color={CJ.muted}/>
        <StatCard label="Win Rate"   value={winRate+"%"}          color={CJ.yellow}/>
        <StatCard label="Ratio V/D"  value={stats?.defaites>0?(stats.victoires/stats.defaites).toFixed(1):"∞"} color={CJ.accent}/>
        <StatCard label="Série actuelle" value={serieActuelle>0?(serieType==="win"?`${serieActuelle}🔥`:`${serieActuelle}💔`):"—"} color={serieType==="win"?CJ.green:CJ.red}/>
      </div>

      {/* Moyennes */}
      <SectionTitle icon={BarChart2}>Moyennes pts/volée</SectionTitle>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8 }}>
        <StatCard label="Générale"        value={moyenneGenerale?? "—"} color={CJ.blue} sub={`sur ${termines.length} match${termines.length>1?"s":""}`}/>
        <StatCard label="Aujourd'hui"     value={moyenneJour??     "—"} color={CJ.blue} sub={nbJour>0?`${nbJour} match${nbJour>1?"s":""}`:null}/>
        <StatCard label="Cette semaine"   value={moyenneSemaine??  "—"} color={CJ.blue} sub={nbSemaine>0?`${nbSemaine} match${nbSemaine>1?"s":""}`:null}/>
        <StatCard label="Ce mois"         value={moyenneMois??     "—"} color={CJ.blue} sub={nbMois>0?`${nbMois} match${nbMois>1?"s":""}`:null}/>
      </div>

      {/* Scoring */}
      <SectionTitle icon={Target}>Scoring</SectionTitle>
      {!hasScoring && <p style={{ color:CJ.muted,fontSize:12,marginBottom:8 }}>Les stats de scoring sont calculées à partir de tes prochains matchs.</p>}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
        <StatCard label="180"  value={hasScoring ? nb180  : "—"} color="#f59e0b" bientot={!hasScoring}/>
        <StatCard label="140+" value={hasScoring ? nb140  : "—"} color={CJ.accent} bientot={!hasScoring}/>
        <StatCard label="100+" value={hasScoring ? nb100  : "—"} color={CJ.yellow} bientot={!hasScoring}/>
        <StatCard label="80+"  value={hasScoring ? nb80   : "—"} color={CJ.muted} bientot={!hasScoring}/>
        <StatCard label="60+"  value={hasScoring ? nb60   : "—"} color={CJ.muted} bientot={!hasScoring}/>
        <StatCard label="Plus gros score" value={hasScoring && plusGrosScore>0 ? plusGrosScore : "—"} color={CJ.accent} bientot={!hasScoring}/>
      </div>

      {/* Finishes */}
      <SectionTitle icon={Crown}>Finishes</SectionTitle>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
        <StatCard label="Plus gros finish" value={hasScoring && plusGrosFinish>0 ? plusGrosFinish : "—"} color={CJ.green} bientot={!hasScoring}/>
        <StatCard label="Finishes 100+"    value={hasScoring ? nbFinishes100 : "—"} color={CJ.yellow} bientot={!hasScoring}/>
        <StatCard label="Checkout %" value={hasCheckout ? `${tauxCheckout}%` : "—"} color={CJ.accent} sub={hasCheckout?`${checkoutSuccess}/${checkoutAttempts} tentatives`:null} bientot={!hasCheckout}/>

      </div>

      {/* Duels */}
      <SectionTitle icon={Swords}>Duels</SectionTitle>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
        <StatCard label="Duels joués"      value={termines.length}                                                     color={CJ.accent}/>
        <StatCard label="Rival principal"  value={rival?rival[0]:"—"}   sub={rival?`${rival[1]} match${rival[1]>1?"s":""}`:null} color={CJ.yellow}/>
        <StatCard label="Max DRIX gagné"   value={maxGain?`+${maxGain}`:"—"}                                           color={CJ.green}/>
        <StatCard label="Max DRIX perdu"   value={maxPerte?`${maxPerte}`:"—"}                                          color={CJ.red}/>
        <StatCard label="Meilleure série"  value={meilleureSerieW>0?`${meilleureSerieW}W`:"—"}                         color={CJ.green} bientot={termines.length===0}/>
        <StatCard label="Nemesis"          value={nemesis?nemesis[0]:"—"} sub={nemesis?`${nemesis[1]} défaite${nemesis[1]>1?"s":""}`:null} color={CJ.red} bientot={defaites.length===0}/>
      </div>

      {/* Graphique + Historique DRIX */}
      {drixMvts.length > 0 && (
        <>
          <SectionTitle icon={TrendingUp}>Évolution DRIX</SectionTitle>
          {/* Graphique */}
          {chartPts.length >= 2 && (
            <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:"14px 16px",marginBottom:10 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
                <span style={{ fontSize:12,color:CJ.muted }}>Courbe DRIX ({chartPts.length} mouvements)</span>
                <span style={{ fontWeight:800,fontSize:14,color:drixTrend>=0?CJ.green:CJ.red }}>
                  {drixTrend>=0?"+":""}{drixTrend} {drixTrend>=0?"▲":"▼"}
                </span>
              </div>
              {/* SVG inline chart */}
              {(() => {
                const h=56, w=300, clr=drixTrend>=0?"#22c55e":"#ef4444";
                const mn=Math.min(...chartPts)-20, mx=Math.max(...chartPts)+20;
                const tx=i=>(i/(chartPts.length-1))*w;
                const ty=v=>h-((v-mn)/(mx-mn||1))*(h-8)-4;
                const path=chartPts.map((v,i)=>`${i===0?"M":"L"}${tx(i).toFixed(1)},${ty(v).toFixed(1)}`).join(" ");
                const gradId=`g${drixTrend>=0?"g":"r"}`;
                return (
                  <svg viewBox={`0 0 ${w} ${h}`} style={{ width:"100%",height:h }} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={clr} stopOpacity="0.3"/>
                        <stop offset="100%" stopColor={clr} stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path d={`${path} L${tx(chartPts.length-1)},${h} L${tx(0)},${h} Z`} fill={`url(#${gradId})`}/>
                    <path d={path} fill="none" stroke={clr} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx={tx(chartPts.length-1).toFixed(1)} cy={ty(chartPts[chartPts.length-1]).toFixed(1)} r="4" fill={clr}/>
                  </svg>
                );
              })()}
              <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:CJ.muted,marginTop:4 }}>
                <span>{new Date(drixMvts[drixMvts.length-1]?.date||0).toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</span>
                <span>Aujourd'hui · {joueur.drix||1000} DRIX</span>
              </div>
            </div>
          )}
          {/* Liste historique */}
          <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,overflow:"hidden" }}>
            {drixMvts.slice(0,10).map((m,i)=>(
              <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:i<Math.min(drixMvts.length,10)-1?`1px solid ${CJ.border}`:"none" }}>
                <div>
                  <div style={{ fontWeight:600,fontSize:13 }}>vs {m.adversaire_pseudo||"?"}</div>
                  <div style={{ fontSize:10,color:CJ.muted,display:"flex",alignItems:"center",gap:3 }}>
                    {m.resultat==="victoire"
                      ? <><Check size={10} color={CJ.green} strokeWidth={3}/><span style={{color:CJ.green}}>Victoire</span></>
                      : <><X size={10} color={CJ.red} strokeWidth={3}/><span style={{color:CJ.red}}>Défaite</span></>
                    }
                    <span>{" · "}{new Date(m.date).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <span style={{ fontSize:11,color:CJ.muted }}>{m.drix_avant}→{m.drix_apres}</span>
                  <span style={{ fontWeight:800,fontSize:14,color:m.variation>0?CJ.green:CJ.red,background:m.variation>0?"#14532d":"#7f1d1d",borderRadius:6,padding:"2px 8px" }}>{m.variation>0?"+":""}{m.variation}</span>
                </div>
              </div>
            ))}
          </div>
        </>
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
export const PageProfilHistorique = ({ joueur, setPage }) => {
  const [duels, setDuels]       = useState([]);
  const [drixMvtMap, setDrixMvtMap] = useState({});
  const [loading, setLoading]   = useState(true);

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
    <div style={{ maxWidth:860, margin:"0 auto", padding:"16px 16px 40px" }}>
      <button onClick={()=>window.history.back()} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",fontSize:14,marginBottom:16,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation" }}><ArrowLeft size={16}/> Retour au profil</button>
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
              return (
                <div key={d.id} style={{ background:"#ffffff0a", border:`1px solid ${gagne?CJ.green+"33":CJ.red+"33"}`, borderRadius:10, padding:12, marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
                    <div>
                      <span style={{ fontWeight:700, fontSize:14 }}>vs{" "}
                        <span onClick={()=>setPage("profil-joueur-"+advId)} style={{ color:CJ.accent, cursor:"pointer", textDecoration:"underline" }}>{adv}</span>
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
  { id:"f_bull",    cat:"finish",    emoji:"🎯",  nom:"Bullseye Killer",       desc:"Finish bull (50 pts)",         seuil:1,   couleur:"#22c55e", val:d=>d.hasBullFinish?1:0 },
  { id:"f_67",      cat:"finish",    emoji:"🍀",  nom:"Six Seven",             desc:"Finish 67",                    seuil:1,   couleur:"#22c55e", val:d=>d.hasSixSevenFinish?1:0 },
  // Duels
  { id:"d_first",   cat:"duels",     emoji:"🥊",  nom:"Premier sang",          desc:"Premier duel joué",            seuil:1,   couleur:"#60a5fa", val:d=>d.parties },
  { id:"d_win1",    cat:"duels",     emoji:"🏆",  nom:"Première victoire",     desc:"Gagner son premier duel",      seuil:1,   couleur:"#22c55e", val:d=>d.victoires },
  { id:"d_win10",   cat:"duels",     emoji:"⚔️",  nom:"Gladiateur",            desc:"10 victoires",                 seuil:10,  couleur:"#22c55e", val:d=>d.victoires },
  { id:"d_win50",   cat:"duels",     emoji:"🛡️",  nom:"Vétéran",               desc:"50 victoires",                 seuil:50,  couleur:"#22c55e", val:d=>d.victoires },
  { id:"d_win100",  cat:"duels",     emoji:"👑",  nom:"Conquérant",            desc:"100 victoires",                seuil:100, couleur:"#ffd700", val:d=>d.victoires },
  { id:"d_serie3",  cat:"duels",     emoji:"🔥",  nom:"Sur série",             desc:"3 victoires d'affilée",        seuil:3,   couleur:"#f97316", val:d=>d.meilleureSerieW },
  { id:"d_serie5",  cat:"duels",     emoji:"💀",  nom:"Intouchable",           desc:"5 victoires d'affilée",        seuil:5,   couleur:"#f97316", val:d=>d.meilleureSerieW },
  { id:"d_serie10", cat:"duels",     emoji:"☠️",  nom:"Légende noire",         desc:"10 victoires d'affilée",       seuil:10,  couleur:"#f97316", val:d=>d.meilleureSerieW },
  { id:"d_giant",   cat:"duels",     emoji:"🦁",  nom:"Tueur de géants",       desc:"Battre un joueur +200 DRIX",   seuil:1,   couleur:"#ffd700", val:d=>d.hasGiantKill?1:0 },
  // Parties
  { id:"p_10",      cat:"parties",   emoji:"🎮",  nom:"Échauffement",          desc:"10 parties jouées",            seuil:10,  couleur:"#a78bfa", val:d=>d.parties },
  { id:"p_50",      cat:"parties",   emoji:"🕹️",  nom:"Habitué",               desc:"50 parties jouées",            seuil:50,  couleur:"#a78bfa", val:d=>d.parties },
  { id:"p_100",     cat:"parties",   emoji:"🎲",  nom:"Marathonien",           desc:"100 parties jouées",           seuil:100, couleur:"#a78bfa", val:d=>d.parties },
  { id:"p_500",     cat:"parties",   emoji:"🏆",  nom:"Pilier du bar",         desc:"500 parties jouées",           seuil:500, couleur:"#ffd700", val:d=>d.parties },
  // Anti-26
  { id:"a26_10",    cat:"anti26",    emoji:"🍌",  nom:"Le 26 classique",       desc:"10 fois 26",                   seuil:10,  couleur:"#f59e0b", val:d=>d.nb26 },
  { id:"a26_50",    cat:"anti26",    emoji:"🤡",  nom:"Abonné au 26",          desc:"50 fois 26",                   seuil:50,  couleur:"#f59e0b", val:d=>d.nb26 },
  { id:"a26_100",   cat:"anti26",    emoji:"💩",  nom:"Roi du 26",             desc:"100 fois 26",                  seuil:100, couleur:"#f59e0b", val:d=>d.nb26 },
  { id:"a26_500",   cat:"anti26",    emoji:"🎪",  nom:"Légende du 26",         desc:"500 fois 26",                  seuil:500, couleur:"#f59e0b", val:d=>d.nb26 },
  // DRIX
  { id:"dr_1200",   cat:"drix",      emoji:"📈",  nom:"Ascension",             desc:"Atteindre 1200 DRIX",          seuil:1,   couleur:"#22c55e", val:d=>d.maxDrix>=1200?1:0 },
  { id:"dr_1500",   cat:"drix",      emoji:"💎",  nom:"Confirmé",              desc:"Atteindre 1500 DRIX",          seuil:1,   couleur:"#a78bfa", val:d=>d.maxDrix>=1500?1:0 },
  { id:"dr_2000",   cat:"drix",      emoji:"🚀",  nom:"Élite",                 desc:"Atteindre 2000 DRIX",          seuil:1,   couleur:"#ffd700", val:d=>d.maxDrix>=2000?1:0 },
  // Social
  { id:"soc_1",     cat:"social",    emoji:"🤝",  nom:"Premier pote",          desc:"Premier ami ajouté",           seuil:1,   couleur:"#10b981", val:d=>d.nbAmis },
  { id:"soc_5",     cat:"social",    emoji:"👥",  nom:"Petit cercle",          desc:"5 amis",                       seuil:5,   couleur:"#10b981", val:d=>d.nbAmis },
  { id:"soc_10",    cat:"social",    emoji:"🫂",  nom:"La bande",              desc:"10 amis",                      seuil:10,  couleur:"#10b981", val:d=>d.nbAmis },
  { id:"soc_20",    cat:"social",    emoji:"🌍",  nom:"Le réseau",             desc:"20 amis",                      seuil:20,  couleur:"#10b981", val:d=>d.nbAmis },
  { id:"soc_trn",   cat:"social",    emoji:"🎯",  nom:"Tournoi entre potes",   desc:"Participer à un tournoi privé",seuil:1,   couleur:"#10b981", val:d=>d.nbTournois },
  { id:"soc_wtrn",  cat:"social",    emoji:"🏆",  nom:"Boss de la bande",      desc:"Gagner un tournoi privé",      seuil:1,   couleur:"#ffd700", val:d=>d.nbTournoisGagnes },
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
  let hasBullFinish=false, hasSixSevenFinish=false;

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
        if(fin===50) hasBullFinish=true;
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
      if(diff<=1.5) { curr++; best=Math.max(best,curr); } else curr=1;
    }
    streakJours=best;
  }

  // Amis acceptés
  const nbAmis=(amis||[]).filter(a=>a.statut==="accepte").length;

  // Tueur de géants : non trackable précisément sans info adversaire au moment du match
  const hasGiantKill=false;

  return {
    nb180, nb140, nb100, nb26, nbFinishes100, plusGrosFinish,
    hasBullFinish, hasSixSevenFinish,
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
export const PageProfilBadges = ({ joueur, setPage }) => {
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
      sbJ(`drix_mouvements?joueur_id=eq.${joueur.id}&order=date.desc&limit=200&select=drix_apres`).catch(()=>[]),
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
        {/* Emoji du badge — contenu, pas icône UI */}
        <div style={{ fontSize: 30, marginBottom: 8, lineHeight: 1, filter: unlocked ? "none" : "grayscale(1)" }}>{b.emoji}</div>

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
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 16px 40px" }}>

      {/* Bouton retour — ArrowLeft SVG (design system) */}
      <button onClick={() => window.history.back()}
        style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14, marginBottom: 20, display: "flex", alignItems: "center", gap: 6, touchAction: "manipulation", padding: 0 }}
        onMouseEnter={e => e.currentTarget.style.color = "#f1f5f9"}
        onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}>
        <ArrowLeft size={16}/> Retour au profil
      </button>

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
    sbJ(`amis?or=(joueur_id.eq.${joueur.id},ami_id.eq.${joueur.id})&or=(joueur_id.eq.${cible.id},ami_id.eq.${cible.id})&select=*`)
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

  const ajouterAmi = async () => {
    await sbJ("amis", { method:"POST", body:JSON.stringify({ joueur_id:joueur.id, ami_id:cible.id, joueur_pseudo:joueur.pseudo, ami_pseudo:cible.pseudo, statut:"en_attente", date:Date.now() }) });
    setAmiStatut("en_attente");
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
  const [loading, setLoading] = useState(true);
  const [searchAmis, setSearchAmis] = useState("");
  const [searchGlobal, setSearchGlobal] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    Promise.all([dbAmis.getAmis(joueur.id), dbAmis.getDemandesRecues(joueur.id)])
      .then(async ([a,d]) => {
        setAmis(a||[]); setDemandes(d||[]);
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
    await dbAmis.accepterAmi(d.id);
    setDemandes(x=>x.filter(x=>x.id!==d.id));
    setAmis(x=>[...x,{...d,statut:"accepte"}]);
  };

  const refuser = async (d) => {
    await dbAmis.refuserAmi(d.id);
    setDemandes(x=>x.filter(x=>x.id!==d.id));
  };

  if (loading) return <SpinnerJ/>;

  const amisIds = new Set(amis.map(a => a.joueur_id===joueur.id ? a.ami_id : a.joueur_id));
  const amisTries = [...amis].sort((a, b) => {
    const pa = (a.joueur_id===joueur.id ? a.ami_pseudo : a.joueur_pseudo)||"";
    const pb = (b.joueur_id===joueur.id ? b.ami_pseudo : b.joueur_pseudo)||"";
    return pa.localeCompare(pb, "fr", { sensitivity:"base" });
  });
  const q = searchAmis.trim().toLowerCase();
  const amisFiltres = q ? amisTries.filter(a => {
    const pseudo = (a.joueur_id===joueur.id ? a.ami_pseudo : a.joueur_pseudo)||"";
    return pseudo.toLowerCase().includes(q);
  }) : amisTries;
  const nonAmis = searchGlobal.filter(p => p.id !== joueur.id && !amisIds.has(p.id));

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

      <h3 style={{ fontWeight:700,fontSize:15,marginBottom:12,color:CJ.text,display:"flex",alignItems:"center",gap:6 }}><Users size={15} color={CJ.accent}/> Mes amis ({amis.length})</h3>

      {/* Barre de recherche globale */}
      <div style={{ display:"flex",alignItems:"center",gap:8,background:CJ.bg,border:`1px solid ${CJ.border}`,borderRadius:10,padding:"10px 14px",marginBottom:12 }}>
        <Search size={15} color={CJ.muted} style={{ flexShrink:0 }}/>
        <input
          value={searchAmis}
          onChange={e=>{ setSearchAmis(e.target.value); setSearchGlobal([]); setSearchLoading(false); }}
          placeholder="Rechercher un joueur…"
          style={{ flex:1,background:"transparent",border:"none",color:CJ.text,fontSize:16,outline:"none",minWidth:0 }}
        />
        {searchAmis && (
          <button onClick={()=>{ setSearchAmis(""); setSearchGlobal([]); }} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",padding:0,lineHeight:1,display:"flex" }}><X size={14}/></button>
        )}
      </div>

      {/* ── Résultats amis ── */}
      {amis.length === 0 && !q ? (
        <p style={{ color:CJ.muted,fontSize:13 }}>Aucun ami pour l'instant. Recherche un joueur ci-dessus pour l'ajouter !</p>
      ) : amisFiltres.length > 0 ? (
        <div style={{ marginBottom:nonAmis.length>0?16:0 }}>
          {q && <div style={{ fontSize:12,color:CJ.muted,fontWeight:700,letterSpacing:.5,marginBottom:6 }}>AMIS</div>}
          {amisFiltres.map(a => {
            const amiId = a.joueur_id === joueur.id ? a.ami_id : a.joueur_id;
            const amiPseudo = a.joueur_id === joueur.id ? a.ami_pseudo : a.joueur_pseudo;
            const profil = photosAmis[amiId];
            const { color } = getDrixTitreLocal(profil?.drix||1000);
            return (
              <div key={a.id} onClick={()=>setPage("profil-joueur-"+amiId)}
                style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:10,padding:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=CJ.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=CJ.border}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:40,height:40,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:`2px solid ${color}`,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {profil?.photo ? <img src={profil.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <RankIcon drix={profil?.drix||1000} size={18}/>}
                  </div>
                  <div>
                    <div style={{ fontWeight:600 }}>{amiPseudo}</div>
                    <div style={{ fontSize:12,color,fontWeight:600,display:"flex",alignItems:"center",gap:4 }}><RankIcon drix={profil?.drix||1000} size={13}/> {profil?.drix||1000} DRIX</div>
                  </div>
                </div>
                <ChevronRight size={16} color={CJ.accent}/>
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
export const FicheJoueur = ({ joueurId, joueur:moi, bars, associations, setPage, setBarSlug }) => {

  // ── SVG helpers ──────────────────────────────────────────────────────────────
  const CircleGauge = ({ value, max=100, color, size=90, strokeWidth=9 }) => {
    const r = (size - strokeWidth) / 2;
    const circ = 2 * Math.PI * r;
    const fill = Math.min(1, value / max) * circ;
    return (
      <svg width={size} height={size} style={{ display:"block" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ffffff10" strokeWidth={strokeWidth}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}/>
        <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
          style={{ fill:"#f1f5f9", fontWeight:900, fontSize:size*0.24 }}>{value}</text>
        <text x={size/2} y={size/2+size*0.22} textAnchor="middle" dominantBaseline="middle"
          style={{ fill:"#94a3b8", fontWeight:400, fontSize:size*0.13 }}>/{max}</text>
      </svg>
    );
  };

  const MiniChart = ({ points, color="#22c55e", height=44 }) => {
    if (!points || points.length < 2) return null;
    const w = 200;
    const min = Math.min(...points) - 10;
    const max = Math.max(...points) + 10;
    const toX = i => (i / (points.length - 1)) * w;
    const toY = v => height - ((v - min) / (max - min || 1)) * (height - 6) - 3;
    const d = points.map((v,i) => `${i===0?"M":"L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${height}`} style={{ width:"100%", height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        <path d={`${d} L${toX(points.length-1)},${height} L${toX(0)},${height} Z`} fill={`url(#grad-${color.replace("#","")})`}/>
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={toX(points.length-1).toFixed(1)} cy={toY(points[points.length-1]).toFixed(1)} r="4" fill={color}/>
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

  // ── Chargement données ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!joueurId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      dbJ.getJoueur(joueurId),
      dbJ.getStats(joueurId),
      dbJ.getDuels(joueurId),
      sbJ(`drix_mouvements?joueur_id=eq.${joueurId}&order=date.desc&limit=60&select=*`).catch(()=>[]),
      sbJ(`joueurs?order=drix.desc&select=id`).catch(()=>[]),
      moi ? dbJ.getStats(moi.id) : Promise.resolve(null),
      moi ? dbJ.getDuels(moi.id) : Promise.resolve(null),
    ]).then(([jd, s, d, mvts, allJ, ms, md]) => {
      setJ(jd);
      setStats(s);
      const termines = (d||[]).filter(x => x.statut==="termine").sort((a,b)=>(b.date||0)-(a.date||0));
      setDuels(termines);
      setDrixMvts(mvts||[]);
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
    sbJ(`amis?or=(joueur_id.eq.${moi.id},ami_id.eq.${moi.id})&or=(joueur_id.eq.${joueurId},ami_id.eq.${joueurId})&select=*`)
      .then(r => {
        const rel = (r||[]).find(a =>
          (a.joueur_id===moi.id && a.ami_id===joueurId) ||
          (a.joueur_id===joueurId && a.ami_id===moi.id)
        );
        setAmiStatut(rel?.statut || null);
      }).catch(()=>{});
  }, [moi?.id, joueurId]);

  const ajouterAmi = async () => {
    if (!moi || !j) return;
    await sbJ("amis", { method:"POST", body:JSON.stringify({ joueur_id:moi.id, ami_id:j.id, joueur_pseudo:moi.pseudo, ami_pseudo:j.pseudo, statut:"en_attente", date:Date.now() }) });
    setAmiStatut("en_attente");
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
  duels.forEach(d => {
    (d.manches_detail||[]).forEach(m => {
      // Gère le changement de pseudo : comparer au pseudo stocké dans le duel au moment de la partie
      const isChallenger = d.challenger_id === joueurId;
      const myPseudoAtTime = isChallenger ? (d.challenger_pseudo || j.pseudo) : (d.defie_pseudo || j.pseudo);
      const isW = m.winner === myPseudoAtTime || m.winner === j.pseudo;
      nb180 += isW ? (m.winner_180||0) : (m.loser_180||0);
      if (isW) plusGrosFinish = Math.max(plusGrosFinish, m.winner_finish||0);
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

  // Dangerosité
  const dangerScore = Math.min(100, Math.round((winRate*0.35)+(formePct*25)+(Math.min(20,Math.max(0,(drix-800)/55)))+(moyenneDuels?Math.min(12,parseFloat(moyenneDuels)/5):0)+(nb180>0?Math.min(8,nb180):0)));
  const dangerColor = dangerScore>=75?"#ef4444":dangerScore>=50?"#f97316":dangerScore>=25?"#f59e0b":"#22c55e";

  // Tendance DRIX
  const now = Date.now();
  const var7j = drixMvts.filter(m=>(now-(m.date||0))<7*86400000).reduce((s,m)=>s+(m.variation||0),0);
  const var30j = drixMvts.filter(m=>(now-(m.date||0))<30*86400000).reduce((s,m)=>s+(m.variation||0),0);

  // Style
  const styleJoueur = (() => {
    const variance = scores10.length>1?Math.sqrt(scores10.map(s=>(s-(moy10||0))**2).reduce((a,b)=>a+b,0)/scores10.length):999;
    if (plusGrosFinish>=100&&winRate>=55) return {label:"Le Finisher",desc:"Excellent finisseur, patient et efficace",emoji:"🎯"};
    if (nb180>=10&&moyenneDuels&&parseFloat(moyenneDuels)>55) return {label:"Le Bulldozer",desc:"Score fort, 180 réguliers",emoji:"💣"};
    if (variance<8&&winRate>=50) return {label:"Le Régulier",desc:"Constant, difficile à surprendre",emoji:"⚙️"};
    if (winRate>=60&&duels.length>=20) return {label:"Le Champion",desc:"Palmarès solide, expérimenté",emoji:"🏆"};
    if (winRate<40) return {label:"Le Fragile",desc:"Résultats irréguliers",emoji:"💔"};
    if (serieType==="win"&&serieActuelle>=3) return {label:"Le Sprinter",desc:"En feu, ride sa série",emoji:"🔥"};
    return {label:"Le Combattant",desc:"Persévérant, ne lâche jamais",emoji:"⚔️"};
  })();

  // Point fort / faible
  const pointFort = nb180>=5?"Scoring":plusGrosFinish>=100?"Finishes":winRate>=60?"Régularité":formePct>=0.6?"Forme actuelle":"En construction";
  const pointFaible = winRate<40?"Taux de victoire":plusGrosFinish<60&&duels.length>=5?"Finishes":formePct<0.4&&derniers10.length>=5?"Forme récente":"Irrégularité";

  // Début / fin de match
  const debutFort = moyenneDuels && parseFloat(moyenneDuels) > 45;
  const finSolide = winRate >= 50 && formePct >= 0.5;

  // Probabilité
  const probaVictoire = Math.round(Math.min(95,Math.max(5,( 1/(1+Math.pow(10,(drix-monDrix)/400)) )*100+(formePct<0.4?8:formePct>0.7?-8:0))));

  // Résultats 5 derniers matchs (pour badges V/D dans la modal défi)
  const resultats5 = duels.slice(0,5).map(d => d.gagnant_id===joueurId ? "V" : "D");
  const wins5 = resultats5.filter(r=>r==="V").length;
  const formeDefi = wins5>=4?"Très en forme":wins5>=3?"En forme":wins5>=2?"Stable":"En difficulté";
  const formeDefiColor = wins5>=4?"#22c55e":wins5>=3?"#60a5fa":wins5>=2?"#f59e0b":"#ef4444";

  // ELO gain/perte ajusté selon le nombre de manches
  const K_ELO = 32 * Math.max(1, defiForm.manches);
  const EA_ELO = 1/(1+Math.pow(10,(drix-monDrix)/400));
  const gainElo = Math.round(K_ELO*(1-EA_ELO));
  const perteElo = Math.round(K_ELO*EA_ELO);

  // Point faible structuré
  const pointFaibleObj = (() => {
    if (!debutFort && duels.length>=5) return {label:"Début de match",desc:"Démarre souvent lentement",emoji:"🐢"};
    if (plusGrosFinish<60&&duels.length>=5) return {label:"Finishes",desc:"Peut rater ses finishes",emoji:"🛡️"};
    if (formePct<0.4&&derniers10.length>=5) return {label:"Pression",desc:"Perd sous la pression",emoji:"😰"};
    if (winRate<40) return {label:"Régularité",desc:"Résultats irréguliers",emoji:"📉"};
    return {label:"Finishes élevés",desc:"Peut rater les grands finishes",emoji:"🎯"};
  })();

  // Résumé
  const resume = [
    dangerScore>=70?"Adversaire à ne pas sous-estimer.":"Joueur accessible si tu es en forme.",
    formePct>=0.6?`En très bonne forme en ce moment (${Math.round(formePct*100)}% sur ses ${derniers10.length} dernières parties).`:formePct<0.4?"Sa forme est en baisse, c'est le bon moment pour le défier.":"Forme correcte.",
    deltaScoring&&Math.abs(deltaScoring)>5?`Son scoring récent est ${deltaScoring>0?"en hausse":"en baisse"} de ${Math.abs(deltaScoring)}% vs sa moyenne habituelle.`:null,
    nb180>=5?"Attention à ses 180.":null,
    plusGrosFinish>=120?"Ses finishes sont redoutables.":null,
    probaVictoire>=60?`Tu as ${probaVictoire}% de chances de gagner.`:`Il reste favori à ${100-probaVictoire}%.`,
  ].filter(Boolean).join(" ");

  // Chart DRIX
  const chartPoints = drixMvts.slice(0,20).reverse().map(m=>m.drix_apres||m.drix_avant||1000);

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

  // Badges
  const BADGES_CIBLE = [
    {emoji:"🥇",nom:"Premier duel",    seuil:1,   valeur:stats?.parties??0,  couleur:"#f59e0b"},
    {emoji:"⚔️", nom:"Combattant",      seuil:10,  valeur:stats?.parties??0,  couleur:"#60a5fa"},
    {emoji:"🔥", nom:"5 victoires",     seuil:5,   valeur:stats?.victoires??0,couleur:"#f97316"},
    {emoji:"🏆", nom:"10 victoires",    seuil:10,  valeur:stats?.victoires??0,couleur:"#22c55e"},
    {emoji:"👑", nom:"50 victoires",    seuil:50,  valeur:stats?.victoires??0,couleur:"#f59e0b"},
    {emoji:"🎯", nom:"Premier 180",     seuil:1,   valeur:nb180>0?1:0,        couleur:"#ef4444"},
    {emoji:"💯", nom:"Finish 100+",     seuil:1,   valeur:plusGrosFinish>=100?1:0,couleur:"#22c55e"},
    {emoji:"⭐", nom:"Confirmé",        seuil:1,   valeur:drix>=1100?1:0,     couleur:"#22c55e"},
    {emoji:"⭐⭐",nom:"Expert",          seuil:1,   valeur:drix>=1300?1:0,     couleur:"#f59e0b"},
    {emoji:"💎", nom:"Élite",           seuil:1,   valeur:drix>=1500?1:0,     couleur:"#a78bfa"},
  ];
  const badgesOk = BADGES_CIBLE.filter(b=>b.valeur>=b.seuil);

  // Vals complets pour l'onglet badges détaillé (même calcul que PageProfilBadges)
  const valsComplets = computeBadgeValues(j, stats, duels, drixMvts, []);
  const totalBadgesOk = ALL_BADGES.filter(b=>b.val(valsComplets)>=b.seuil).length;

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
        <div style={{ fontSize:28, marginBottom:6 }}>{b.emoji}</div>
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
        {unlocked && <div style={{ position:"absolute", top:8, right:8, fontSize:14 }}>✅</div>}
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

  // ── RENDU ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{maxWidth:480,margin:"0 auto",padding:"16px 16px 80px",background:CJ.bg,minHeight:"100vh"}}>

      {/* ── Retour ── */}
      <button onClick={()=>window.history.back()} style={{background:"none",border:"none",color:CJ.muted,cursor:"pointer",marginBottom:14,fontSize:13,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation"}}>← Retour</button>

      {/* ── HEADER ── */}
      <div style={{...card,marginBottom:10}}>
        <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
          {/* Photo */}
          <div style={{position:"relative",flexShrink:0}}>
            <div style={{width:72,height:72,borderRadius:"50%",border:`3px solid ${color}`,overflow:"hidden",background:color+"22",display:"flex",alignItems:"center",justifyContent:"center"}}>
              {j.photo?<img src={j.photo} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<RankIcon drix={drix} size={28}/>}
            </div>
            <div style={{position:"absolute",bottom:2,right:2,width:12,height:12,borderRadius:"50%",background:"#22c55e",border:"2px solid #1a1a1a"}}/>
          </div>
          {/* Infos */}
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap"}}>
              <h1 style={{fontWeight:900,fontSize:18,margin:0}}>{j.pseudo}</h1>
              {moi&&moi.id!==j.id&&(
                amiStatut===null
                  ?<button onClick={ajouterAmi} style={{background:`linear-gradient(135deg,${CJ.accent},#ea580c)`,border:"none",color:"#fff",borderRadius:20,padding:"8px 20px",cursor:"pointer",fontSize:14,fontWeight:800,touchAction:"manipulation",boxShadow:`0 4px 16px ${CJ.accent}55`,letterSpacing:.3}}>👥 Ajouter</button>
                  :amiStatut==="en_attente"
                    ?<span style={{background:"#78350f33",border:`1px solid ${CJ.yellow}44`,color:CJ.yellow,borderRadius:20,padding:"6px 14px",fontSize:13,fontWeight:600}}>⏳ En attente</span>
                    :<span style={{background:"#14532d33",border:`1px solid ${CJ.green}44`,color:CJ.green,borderRadius:20,padding:"6px 14px",fontSize:13,fontWeight:600}}>✅ Ami(e)</span>
              )}
            </div>
            {/* Badges infos */}
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:6}}>
              {j.age&&<BadgeJ color={CJ.muted}>🎂 {j.age} ans</BadgeJ>}
              {j.ville&&<BadgeJ color={CJ.blue}>📍 {j.ville}</BadgeJ>}
              {bar&&<BadgeJ color={CJ.accent}>🍺 {bar.nom}</BadgeJ>}
            </div>
            {asso&&<div style={{marginBottom:6}}><BadgeJ color="#a78bfa">🫂 {asso.nom}</BadgeJ></div>}
            {/* Rang */}
            <div style={{display:"inline-flex",alignItems:"center",gap:6,background:color+"18",border:`1px solid ${color}44`,borderRadius:20,padding:"3px 10px"}}>
              <RankIcon drix={drix} size={14}/>
              <span style={{fontWeight:700,fontSize:12,color}}>{titre}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── DRIX + CLASSEMENT + ÉCART ── */}
      <div style={{...card,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontWeight:900,fontSize:36,color,lineHeight:1}}>{drix} <span style={{fontSize:16,fontWeight:600}}>DRIX</span></div>
          {classement?.position&&<div style={{fontSize:12,color:CJ.muted,marginTop:4}}>Classement régional : <span style={{color:CJ.yellow,fontWeight:700}}>#{classement.position}</span></div>}
        </div>
        {moi&&moi.id!==j.id&&(
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:CJ.muted,marginBottom:4}}>Écart avec vous</div>
            <div style={{fontWeight:900,fontSize:22,color:ecartDrix>0?"#ef4444":"#22c55e"}}>{ecartDrix>0?"+":""}{ecartDrix} <span style={{fontSize:13,fontWeight:600}}>DRIX</span></div>
            <div style={{fontSize:11,color:CJ.muted,marginTop:2}}>{ecartDrix>0?"Il vous devance":"Vous le dépassez"}</div>
          </div>
        )}
      </div>

      {/* ── BOUTONS ── */}
      {moi&&moi.id!==j.id&&(
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <button onClick={()=>setPage("messages-"+j.id+"-"+encodeURIComponent(j.pseudo))}
            style={{flex:1,background:"#1d4ed8",border:"none",color:"#fff",borderRadius:12,padding:"13px 0",cursor:"pointer",fontWeight:700,fontSize:14,touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            💬 Message
          </button>
          <button onClick={()=>setShowDefi(true)}
            style={{flex:1,background:CJ.accent,border:"none",color:"#fff",borderRadius:12,padding:"13px 0",cursor:"pointer",fontWeight:700,fontSize:14,touchAction:"manipulation",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            ⚔️ Défier
          </button>
        </div>
      )}

      {/* ── MODAL DÉFI ── */}
      {showDefi&&moi&&(()=>{
        const lancerDefi = async () => {
          if (sending) return;
          setSending(true);
          try {
            const res = await sbJ("duels", { method:"POST", body:JSON.stringify({
              challenger_id:moi.id, challenger_pseudo:moi.pseudo,
              defie_id:j.id, defie_pseudo:j.pseudo,
              statut:"accepte", type: defiForm.type==="classe"?"drix":"amical",
              mode:defiForm.mode, manches:defiForm.manches,

              date:Date.now(), valide_challenger:false, valide_defie:false,
              score_manches_challenger:0, score_manches_defie:0,
            })});
            const newDuel = Array.isArray(res)?res[0]:res;
            if (newDuel?.id) { setShowDefi(false); setPage("scoreur-duel-"+newDuel.id); }
          } catch(e) { alert("Erreur : "+e.message); }
          setSending(false);
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
                    <div style={{fontSize:18,marginBottom:3}}>{styleJoueur.emoji}</div>
                    <div style={{fontSize:10,fontWeight:700,color:CJ.text,lineHeight:1.3}}>{styleJoueur.label.replace("Le ","")}</div>
                    <div style={{fontSize:9,color:CJ.muted,marginTop:2,lineHeight:1.3}}>{styleJoueur.desc}</div>
                  </div>
                  {/* Point faible */}
                  <div style={{background:"#1a1a1a",borderRadius:10,padding:"10px 8px"}}>
                    <div style={{fontSize:8,color:CJ.muted,fontWeight:700,letterSpacing:.3,marginBottom:6,textTransform:"uppercase"}}>Point faible</div>
                    <div style={{fontSize:18,marginBottom:3}}>{pointFaibleObj.emoji}</div>
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
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                    <div style={{background:"#14532d",border:"1px solid #22c55e33",borderRadius:10,padding:"10px 12px"}}>
                      <div style={{fontWeight:900,fontSize:20,color:"#22c55e"}}>+{gainElo} DRIX</div>
                      <div style={{fontSize:11,color:"#86efac"}}>si victoire</div>
                    </div>
                    <div style={{background:"#7f1d1d",border:"1px solid #ef444433",borderRadius:10,padding:"10px 12px"}}>
                      <div style={{fontWeight:900,fontSize:20,color:"#ef4444"}}>-{perteElo} DRIX</div>
                      <div style={{fontSize:11,color:"#fca5a5"}}>si défaite</div>
                    </div>
                  </div>
                  <div style={{fontSize:10,color:CJ.muted,textAlign:"center"}}>ⓘ Gain / perte de DRIX calculé par notre algorithme (type ELO)</div>
                </div>

                {/* ── Bloc configuration ── */}
                <div style={{padding:"14px 18px",borderBottom:"1px solid #1e1e1e"}}>
                  <div style={{fontWeight:800,fontSize:13,color:CJ.text,marginBottom:12}}>CONFIGURATION DU DÉFI</div>

                  {/* Mode de jeu */}
                  <div style={{marginBottom:12}}>
                    <div style={{fontSize:10,color:CJ.muted,fontWeight:700,marginBottom:7}}>MODE DE JEU</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                      {[["501","🎯","501","Classique"],["301","🎯","301","Classique"],["cricket","🦗","Cricket",""]].map(([v,ic,nm,sub])=>(
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

      {/* ── STATS RAPIDES ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:6}}>
        {[
          [stats?.victoires??0,"Victoires",CJ.green],
          [stats?.defaites??0,"Défaites",CJ.red],
          [stats?.parties??0,"Parties",CJ.muted],
          [winRate+"%","Win Rate",CJ.yellow],
          [moyenneDuels??"—","Moy. pts",CJ.blue],
        ].map(([v,l,c])=>(
          <div key={l} style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:10,padding:"10px 4px",textAlign:"center"}}>
            <div style={{fontWeight:900,fontSize:17,color:c,lineHeight:1}}>{v}</div>
            <div style={{fontSize:9,color:CJ.muted,marginTop:3,lineHeight:1.2}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginBottom:10}}>
        {[
          [nb180>0?nb180:"—","180","#f59e0b"],
          [plusGrosFinish>0?plusGrosFinish:"—","Meilleur finish",CJ.green],
          [serieActuelle>0?(serieType==="win"?`🔥×${serieActuelle}`:`💔×${serieActuelle}`):"—","Série",serieType==="win"?CJ.green:CJ.red],
        ].map(([v,l,c])=>(
          <div key={l} style={{background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:10,padding:"10px 4px",textAlign:"center"}}>
            <div style={{fontWeight:900,fontSize:17,color:c,lineHeight:1}}>{v}</div>
            <div style={{fontSize:9,color:CJ.muted,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

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
          {/* Mini Face-à-face + Derniers résultats */}
          {moi&&moi.id!==j.id&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              {/* Face à face */}
              <div style={{...card}}>
                <span style={labelSt}>Face à face</span>
                <div style={{fontSize:10,color:CJ.muted,marginBottom:8}}>{faceAFace.length} confrontation{faceAFace.length!==1?"s":""}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <div>
                    <div style={{fontSize:11,color:CJ.blue,fontWeight:700}}>{moi?.pseudo?.slice(0,8)}</div>
                    <div style={{fontWeight:900,fontSize:28,color:mesVFF>=sesVFF?CJ.green:CJ.muted,lineHeight:1}}>{mesVFF}</div>
                  </div>
                  <div style={{color:CJ.muted,fontSize:14,fontWeight:700}}>vs</div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:11,color:CJ.accent,fontWeight:700}}>{j.pseudo?.slice(0,8)}</div>
                    <div style={{fontWeight:900,fontSize:28,color:sesVFF>mesVFF?CJ.green:CJ.muted,lineHeight:1}}>{sesVFF}</div>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:CJ.muted}}>
                  <span>Moy. pts</span><span>Moy. pts</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontWeight:700,fontSize:13}}>
                  <span style={{color:CJ.blue}}>{maMoyFF??"—"}</span>
                  <span style={{color:CJ.accent}}>{saMoyFF??"—"}</span>
                </div>
              </div>
              {/* Derniers résultats */}
              <div style={{...card}}>
                <span style={labelSt}>Derniers résultats</span>
                {derniers5.length===0
                  ?<div style={{color:CJ.muted,fontSize:11,textAlign:"center",marginTop:16}}>Aucune partie</div>
                  :<>
                    <div style={{display:"flex",gap:4,marginBottom:8,flexWrap:"wrap"}}>
                      {derniers5.map((d,i)=>{
                        const gagne = d.gagnant_id===joueurId;
                        const monMoy = d.challenger_id===joueurId?d.score_challenger:d.score_defie;
                        return(
                          <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                            <VDBadge gagne={gagne} size={28}/>
                            <div style={{fontSize:8,color:CJ.muted}}>{monMoy?Math.round(parseFloat(monMoy)):"—"}</div>
                          </div>
                        );
                      })}
                    </div>
                    {duels[0]?.date&&<div style={{fontSize:10,color:CJ.muted}}>Dernière partie {tempsDepuisMatch(duels[0].date)}</div>}
                  </>
                }
              </div>
            </div>
          )}

          {/* Évolution DRIX */}
          {chartPoints.length>=2&&(
            <div style={{...card,marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={labelSt}>Évolution DRIX</span>
                <span style={{fontWeight:700,fontSize:14,color:var7j>=0?CJ.green:CJ.red}}>{drix} {var7j>=0?"▲":"▼"}</span>
              </div>
              <MiniChart points={chartPoints} color={var7j>=0?"#22c55e":"#ef4444"} height={48}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:CJ.muted,marginTop:4}}>
                <span>{drixMvts.length>0?new Date(drixMvts[drixMvts.length-1].date||0).toLocaleDateString("fr-FR",{day:"numeric",month:"short"}):""}</span>
                <span>Aujourd'hui</span>
              </div>
            </div>
          )}

          {/* Badges preview */}
          {badgesOk.length>0&&(
            <div style={{...card,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={labelSt}>Badges</span>
                <button onClick={()=>setTab("badges")} style={{background:"none",border:"none",color:CJ.blue,cursor:"pointer",fontSize:11,fontWeight:600,touchAction:"manipulation"}}>Voir tous</button>
              </div>
              <div style={{display:"flex",gap:12,justifyContent:"center"}}>
                {badgesOk.slice(0,3).map(b=>(
                  <div key={b.nom} style={{textAlign:"center"}}>
                    <div style={{width:52,height:52,borderRadius:"50%",background:`radial-gradient(circle at 35% 35%, ${b.couleur}, ${b.couleur}88)`,border:`2px solid ${b.couleur}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 4px",boxShadow:`0 0 12px ${b.couleur}44`}}>{b.emoji}</div>
                    <div style={{fontSize:9,color:CJ.muted,fontWeight:600}}>{b.nom}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Affiliations */}
          {(bar||asso)&&(
            <div style={{display:"grid",gridTemplateColumns:bar&&asso?"1fr 1fr":"1fr",gap:8,marginBottom:14}}>
              {bar&&(
                <div onClick={()=>{setBarSlug(bar.slug);setPage("bar");}} style={{...card,cursor:"pointer"}}>
                  <div style={{fontSize:10,color:CJ.muted}}>🍺 Bar affilié</div>
                  <div style={{fontWeight:700,fontSize:13,color:CJ.accent,marginTop:2}}>{bar.nom}</div>
                  <div style={{fontSize:10,color:CJ.muted}}>📍 {bar.ville}</div>
                  <div style={{fontSize:10,color:CJ.blue,marginTop:4}}>Voir la fiche →</div>
                </div>
              )}
              {asso&&(
                <div onClick={()=>setPage("associations")} style={{...card,cursor:"pointer"}}>
                  <div style={{fontSize:10,color:CJ.muted}}>🎯 Asso affiliée</div>
                  <div style={{fontWeight:700,fontSize:13,color:"#a78bfa",marginTop:2}}>{asso.nom}</div>
                  {asso.ville&&<div style={{fontSize:10,color:CJ.muted}}>📍 {asso.ville}</div>}
                  <div style={{fontSize:10,color:CJ.blue,marginTop:4}}>Voir la fiche →</div>
                </div>
              )}
            </div>
          )}

          {/* === ANALYSE JOUEUR === */}
          <div style={{fontWeight:800,fontSize:14,marginBottom:12,color:CJ.text,letterSpacing:0.5}}>ANALYSE JOUEUR</div>

          {/* Grille 2 colonnes */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
            {/* Forme actuelle */}
            <div style={{...card}}>
              <span style={labelSt}>Forme actuelle</span>
              <div style={{fontWeight:800,fontSize:15,color:formeColor,marginBottom:4}}>{formeLabel}</div>
              {serieActuelle>=2&&serieType==="win"&&<div style={{fontSize:10,color:CJ.muted}}>{serieActuelle} victoires consécutives</div>}
              {deltaScoring&&Math.abs(deltaScoring)>3&&<div style={{fontSize:10,color:deltaScoring>0?CJ.green:CJ.red}}>Moyenne {deltaScoring>0?"+":""}{deltaScoring}% sur ses standards</div>}
            </div>
            {/* Dangerosité */}
            <div style={{...card,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
              <span style={{...labelSt,textAlign:"center"}}>Dangerosité</span>
              <CircleGauge value={dangerScore} color={dangerColor} size={80} strokeWidth={8}/>
            </div>
            {/* Tendance DRIX 7j */}
            <div style={{...card}}>
              <span style={labelSt}>Tendance DRIX (7 jours)</span>
              <div style={{fontWeight:900,fontSize:22,color:var7j>=0?CJ.green:CJ.red,marginBottom:4}}>{var7j>=0?"+":""}{var7j} DRIX</div>
              {chartPoints.length>=2&&<MiniChart points={chartPoints.slice(-7)} color={var7j>=0?"#22c55e":"#ef4444"} height={32}/>}
            </div>
            {/* Point fort */}
            <div style={{...card}}>
              <span style={labelSt}>Point fort</span>
              <div style={{fontWeight:800,fontSize:14,color:CJ.green,marginBottom:4}}>🎯 {pointFort}</div>
              <div style={{fontSize:10,color:CJ.muted}}>Très efficace dans ce domaine</div>
            </div>
            {/* Point faible */}
            <div style={{...card}}>
              <span style={labelSt}>Point faible</span>
              <div style={{fontWeight:800,fontSize:13,color:CJ.red,marginBottom:4}}>⚠️ {pointFaible}</div>
              <div style={{fontSize:10,color:CJ.muted}}>Sous pression, manque de régularité</div>
            </div>
            {/* Début de match */}
            <div style={{...card}}>
              <span style={labelSt}>Début de match</span>
              <div style={{fontWeight:800,fontSize:13,color:debutFort?CJ.green:CJ.yellow,marginBottom:4}}>{debutFort?"⚡ Commence fort":"😴 Démarrage lent"}</div>
              <div style={{fontSize:10,color:CJ.muted}}>{debutFort?"Très bon dans les 3 premières volées":"Monte en régime progressivement"}</div>
            </div>
            {/* Fin de match */}
            <div style={{...card}}>
              <span style={labelSt}>Fin de match</span>
              <div style={{fontWeight:800,fontSize:13,color:finSolide?CJ.green:CJ.red,marginBottom:4}}>{finSolide?"🛡 Solide sous pression":"📉 Perd en régularité"}</div>
              <div style={{fontSize:10,color:CJ.muted}}>{finSolide?"Gère bien les fins de manches":"Peut craquer dans les moments clés"}</div>
            </div>
            {/* Style de joueur */}
            <div style={{...card}}>
              <span style={labelSt}>Style de joueur</span>
              <div style={{fontWeight:800,fontSize:14,color:CJ.accent,marginBottom:4}}>{styleJoueur.emoji} {styleJoueur.label}</div>
              <div style={{fontSize:10,color:CJ.muted}}>{styleJoueur.desc}</div>
            </div>
          </div>

          {/* Comparaison + Probabilité côte à côte */}
          {moi&&moi.id!==j.id&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              {/* Comparaison */}
              <div style={{...card}}>
                <span style={labelSt}>Comparaison avec vous</span>
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
                <span style={{...labelSt,textAlign:"center"}}>Probabilité de victoire</span>
                <CircleGauge value={probaVictoire} color={probaVictoire>=50?CJ.green:"#ef4444"} size={84} strokeWidth={9}/>
                <div style={{fontSize:10,color:CJ.muted,marginTop:6}}>Vous avez {probaVictoire}%<br/>de chance de gagner</div>
              </div>
            </div>
          )}

          {/* Résumé IA */}
          <div style={{background:"linear-gradient(135deg,#1a1a2e,#0f0f0f)",border:`1px solid ${CJ.accent}33`,borderRadius:14,padding:14}}>
            <div style={{fontSize:10,color:CJ.accent,fontWeight:700,letterSpacing:1,marginBottom:8}}>✨ RÉSUMÉ IA</div>
            <p style={{color:CJ.text,fontSize:12,lineHeight:1.7,margin:0}}>{resume}</p>
          </div>
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
      if (r?.[0]) { setMaPresence(r[0]); setPresences(x => [...x, r[0]]); }
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

  console.log("🎯 DRIX:", {
    drixA, drixB, aGagne, K, isDefiSemaine,
    EA: EA.toFixed(3), EB: EB.toFixed(3),
    variationA, variationB,
  });
  return { variationA, variationB };
};

const dbDrix = {
  updateDrix: (id, drix) => sbJ(`joueurs?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({ drix }), prefer:"return=minimal" }),
  addMouvement: (d) => sbJ("drix_mouvements", { method:"POST", body:JSON.stringify(d) }),
  getClassement: () => sbJ("joueurs?order=drix.desc&select=id,pseudo,drix,bar_slug,asso_slug,photo"),
  getClassementBar: (slug) => sbJ(`joueurs?bar_slug=eq.${encodeURIComponent(slug)}&order=drix.desc&select=id,pseudo,drix,photo`),
  getClassementAsso: (slug) => sbJ(`joueurs?asso_slug=eq.${encodeURIComponent(slug)}&order=drix.desc&select=id,pseudo,drix,photo`),
  getHistorique: (joueur_id) => sbJ(`drix_mouvements?joueur_id=eq.${joueur_id}&order=date.desc&limit=10&select=*`),
  getHallOfFame: () => sbJ("drix_historique?order=saison.desc,classement.asc&select=*"),
};

// ── Bonus de performance (manches + grosses volées + gros finishes) ───────────
// joueursData: [{nom, manchesGagnees, tours:[],...}, ...]  (index 0=challenger, 1=defie)
// manchesDetail: [{winner, winner_finish,...}, ...]
export const calculerBonusPerformance = (joueursData = [], manchesDetail = []) => {
  const BONUS_MANCHE = 7;   // par manche gagnée
  const BONUS_VOLEE  = 7;   // par volée ≥ 120
  const BONUS_FINISH = 10;  // par finish ≥ 120
  const PLAFOND      = 80;  // cap anti-abus par joueur par match

  return joueursData.map(j => {
    const manchesGagnees = j.manchesGagnees || 0;
    const bonusManches   = manchesGagnees * BONUS_MANCHE;

    // Grosses volées ≥ 120 (y compris les finishes)
    const toutes = j.tours || [];
    const grossesVolees = toutes.filter(v => v >= 120);
    const bonusVolees   = grossesVolees.length * BONUS_VOLEE;

    // Gros finishes ≥ 120 (manches gagnées par ce joueur avec finish ≥ 120)
    const grossesFinishes = manchesDetail.filter(
      m => m.winner === j.nom && (m.winner_finish || 0) >= 120
    );
    const bonusFinish = grossesFinishes.length * BONUS_FINISH;

    const totalBrut = bonusManches + bonusVolees + bonusFinish;
    const total     = Math.min(totalBrut, PLAFOND);

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

// Vérifie si l'adversaire est la cible du défi hebdo (localStorage)
const isDefiSemaineMatch = (myId, adversaireId) => {
  try {
    const weekKey = (() => {
      const now = new Date();
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const y = d.getUTCFullYear();
      const w = Math.ceil((((d - Date.UTC(y,0,1)) / 86400000) + 1) / 7);
      return `dp_defi_semaine_${y}-W${String(w).padStart(2,"0")}`;
    })();
    const stored = localStorage.getItem(weekKey);
    if (!stored) return false;
    const data = JSON.parse(stored);
    return data?.target?.id === adversaireId;
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

    // ── Défi de la semaine ? ────────────────────────────────────────────────────
    const cEstCibleDefiD = isDefiSemaineMatch(duel.challenger_id, duel.defie_id); // challenger a le défié comme cible
    const dEstCibleDefiC = isDefiSemaineMatch(duel.defie_id, duel.challenger_id); // défié a le challenger comme cible
    const defiSemaine    = cEstCibleDefiD || dEstCibleDefiC;
    const cEstPlusFort   = drixC >= drixD;

    // ── Probabilités ELO ────────────────────────────────────────────────────────
    const EA = 1 / (1 + Math.pow(10, (drixD - drixC) / 400));
    const EB = 1 - EA;

    const gainBaseC = Math.round(K * EB); // gain ELO normal de C s'il gagne
    const gainBaseD = Math.round(K * EA); // gain ELO normal de D s'il gagne
    const perteC    = Math.round(K * EA); // perte ELO normale de C s'il perd
    const perteD    = Math.round(K * EB); // perte ELO normale de D s'il perd

    // ── Règles Défi de la Semaine ────────────────────────────────────────────────
    // Gagnant (ayant la cible comme adversaire) : gain × 2
    // Perdant favori (le plus fort) : perte ÷ 2
    // +25 DRIX participation pour le joueur qui a l'autre comme cible hebdo
    const BONUS_PARTICIPATION = 25;

    let eloC, eloD;
    if (challengerGagne) {
      eloC = cEstCibleDefiD ? gainBaseC * 2 : gainBaseC; // victoire contre sa cible → ×2
      eloD = cEstCibleDefiD ? -Math.round(perteD / 2) : -perteD; // défié perd ÷2 sur défi hebdo
    } else {
      eloC = defiSemaine && cEstPlusFort ? -Math.round(perteC / 2) : -perteC;  // perdant favori → ÷2
      eloD = dEstCibleDefiC ? gainBaseD * 2 : gainBaseD; // victoire contre sa cible → ×2
    }

    // Bonus participation (+25 au joueur qui avait l'adversaire comme cible hebdo)
    const participationC = cEstCibleDefiD ? BONUS_PARTICIPATION : 0;
    const participationD = dEstCibleDefiC ? BONUS_PARTICIPATION : 0;

    // Bonus performance (volées, finishes…)
    const bonusC = perfBonus?.[0]?.total || 0;
    const bonusD = perfBonus?.[1]?.total || 0;

    const variationC = eloC + bonusC + participationC;
    const variationD = eloD + bonusD + participationD;

    const newDrixC = Math.max(100, drixC + variationC);
    const newDrixD = Math.max(100, drixD + variationD);

    const resultatC = challengerGagne ? "victoire" : "defaite";
    const resultatD = challengerGagne ? "defaite"  : "victoire";
    const tagDefi   = defiSemaine ? " 🎯 Défi de la Semaine" : "";

    await Promise.all([
      dbDrix.updateDrix(jC.id, newDrixC),
      dbDrix.updateDrix(jD.id, newDrixD),
      dbDrix.addMouvement({ joueur_id:jC.id, joueur_pseudo:jC.pseudo, adversaire_pseudo:jD.pseudo+tagDefi, variation:variationC, drix_avant:drixC, drix_apres:newDrixC, resultat:resultatC, duel_id:duel.id, date:Date.now() }),
      dbDrix.addMouvement({ joueur_id:jD.id, joueur_pseudo:jD.pseudo, adversaire_pseudo:jC.pseudo+tagDefi, variation:variationD, drix_avant:drixD, drix_apres:newDrixD, resultat:resultatD, duel_id:duel.id, date:Date.now() }),
    ]);

    // ── Post Comptoir si Défi de la Semaine ─────────────────────────────────────
    // Seulement quand le CHALLENGER remporte son défi (l'exploit) → gain ×2
    // Si c'est le défié qui gagne, pas de post (il joue normalement, sans bonus)
    if (defiSemaine && challengerGagne && cEstCibleDefiD) {
      sbJ("wall_posts", {
        method: "POST",
        body: JSON.stringify({
          joueur_id:     jC.id,
          joueur_pseudo: jC.pseudo,
          joueur_photo:  jC.photo || null,
          contenu:       `🎯 Défi de la Semaine accompli !\n⚔️ ${jC.pseudo} bat ${jD.pseudo} et remporte son défi hebdo !\n💎 +${variationC} DRIX (gain × 2)`,
          date:          Date.now(),
        }),
      }).catch(() => {});
    }
    // Si c'est le défié qui avait le challenger comme cible ET qu'il gagne → post aussi
    if (defiSemaine && !challengerGagne && dEstCibleDefiC) {
      sbJ("wall_posts", {
        method: "POST",
        body: JSON.stringify({
          joueur_id:     jD.id,
          joueur_pseudo: jD.pseudo,
          joueur_photo:  jD.photo || null,
          contenu:       `🎯 Défi de la Semaine accompli !\n⚔️ ${jD.pseudo} bat ${jC.pseudo} et remporte son défi hebdo !\n💎 +${variationD} DRIX (gain × 2)`,
          date:          Date.now(),
        }),
      }).catch(() => {});
    }

    // Retourne le détail pour affichage
    return {
      defiSemaine,
      challenger: { eloVariation:eloC, bonus:perfBonus?.[0]||{bonusManches:0,bonusVolees:0,bonusFinish:0,total:0}, participation:participationC, totalVariation:variationC },
      defie:      { eloVariation:eloD, bonus:perfBonus?.[1]||{bonusManches:0,bonusVolees:0,bonusFinish:0,total:0}, participation:participationD, totalVariation:variationD },
    };
  } catch(e) { console.error("Erreur DRIX:", e); return null; }
};

// Finalise un duel : DRIX + stats en un seul appel (utilisé par AppJeux)
export const finaliserDuel = async (duel, perfBonus = null) => {
  const breakdown = await appliquerDrixDuel(duel, perfBonus);
  const gagnantId = duel.gagnant_id;
  const [sC, sD] = await Promise.all([dbJ.getStats(duel.challenger_id), dbJ.getStats(duel.defie_id)]);
  await Promise.all([
    sC && dbJ.updateStats(sC.id, { parties:sC.parties+1, victoires:gagnantId===duel.challenger_id?sC.victoires+1:sC.victoires, defaites:gagnantId!==duel.challenger_id?sC.defaites+1:sC.defaites }),
    sD && dbJ.updateStats(sD.id, { parties:sD.parties+1, victoires:gagnantId===duel.defie_id?sD.victoires+1:sD.victoires, defaites:gagnantId!==duel.defie_id?sD.defaites+1:sD.defaites }),
  ]);
  return breakdown;
};

// ── PAGE CLASSEMENT DRIX ──────────────────────────────────────────────────────
export const PageDrix = ({ setPage, bars=[], associations=[], joueur, setJoueurId }) => {
  const [classement, setClassement]   = useState([]);
  const [hallOfFame, setHallOfFame]   = useState([]);
  const [variationMap, setVariationMap] = useState({});
  const [amis, setAmis]               = useState([]);
  const [monHistorique, setMonHistorique] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filtre, setFiltre]           = useState("national"); // national|amis|bar|asso|proximite
  const [view, setView]               = useState("classement"); // classement|evolution
  const [showVoisinage, setShowVoisinage] = useState(false);
  const [joueursClassesIds, setJoueursClassesIds] = useState(new Set());
  const [showNonClasses, setShowNonClasses] = useState(false);
  const saisonActuelle = new Date().getFullYear();

  useEffect(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    Promise.all([
      dbDrix.getClassement(),
      sbJ(`drix_mouvements?date=gt.${weekAgo}&select=joueur_id,variation`).catch(() => []),
      dbDrix.getHallOfFame().catch(() => []),
      sbJ(`drix_mouvements?resultat=in.(victoire,defaite)&select=joueur_id`).catch(() => []),
    ]).then(([c, mvts, hof, joues]) => {
      setClassement(c || []);
      const vMap = {};
      (mvts || []).forEach(m => { vMap[m.joueur_id] = (vMap[m.joueur_id] || 0) + (m.variation || 0); });
      setVariationMap(vMap);
      setHallOfFame(hof || []);
      setJoueursClassesIds(new Set((joues || []).map(m => m.joueur_id)));
      setLoading(false);
    }).catch(() => setLoading(false));
    if (joueur?.id) {
      sbJ(`amis?or=(joueur_id.eq.${joueur.id},ami_id.eq.${joueur.id})&statut=eq.accepte&select=joueur_id,ami_id`).catch(() => []).then(a => setAmis(a || []));
      dbDrix.getHistorique(joueur.id).then(h => setMonHistorique(h || [])).catch(() => {});
    }
  }, [joueur?.id]);

  const amisIds = useMemo(() => {
    if (!joueur) return new Set();
    return new Set((amis || []).map(a => a.joueur_id === joueur.id ? a.ami_id : a.joueur_id));
  }, [amis, joueur]);

  const classementFiltre = useMemo(() => {
    if (filtre === "amis") {
      const ids = new Set([joueur?.id, ...amisIds].filter(Boolean));
      return classement.filter(j => ids.has(j.id));
    }
    if (filtre === "bar"  && joueur?.bar_slug)  return classement.filter(j => j.bar_slug  === joueur.bar_slug);
    if (filtre === "asso" && joueur?.asso_slug) return classement.filter(j => j.asso_slug === joueur.asso_slug);
    return classement;
  }, [classement, filtre, joueur, amisIds]);

  const monRangGlobal = useMemo(() => {
    if (!joueur) return null;
    const idx = classement.findIndex(j => j.id === joueur.id);
    return idx >= 0 ? idx + 1 : null;
  }, [classement, joueur]);

  const moi        = joueur ? classement.find(j => j.id === joueur.id) : null;
  const monDrix    = moi?.drix || joueur?.drix || 1000;
  const monRangInfo = getDrixTitreLocal(monDrix);
  const progression = getProgression(monDrix);

  const joueurAvant = monRangGlobal && monRangGlobal > 1 ? classement[monRangGlobal - 2] : null;
  const joueurApres = monRangGlobal ? classement[monRangGlobal] : null;

  const aPortee = useMemo(() => {
    if (!monRangGlobal) return [];
    const start = Math.max(0, monRangGlobal - 4);
    return classement.slice(start, monRangGlobal - 1).reverse();
  }, [classement, monRangGlobal]);

  const voisinage = useMemo(() => {
    if (!monRangGlobal) return [];
    const start = Math.max(0, monRangGlobal - 4);
    const end   = Math.min(classement.length, monRangGlobal + 3);
    return classement.slice(start, end);
  }, [classement, monRangGlobal]);

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
        {monHistorique.slice(0, 8).map((m, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 0", borderBottom:`1px solid ${CJ.border}` }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:m.variation > 0 ? "#16a34a22" : "#7f1d1d22", border:`1.5px solid ${m.variation > 0 ? "#22c55e44" : "#ef444444"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>{m.variation > 0 ? "V" : "D"}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:600, fontSize:13 }}>vs {m.adversaire_pseudo}</div>
              <div style={{ fontSize:11, color:CJ.muted }}>{m.drix_avant} → {m.drix_apres} DRIX</div>
            </div>
            <div>
              <div style={{ fontWeight:800, fontSize:15, color:m.variation > 0 ? CJ.green : CJ.red, textAlign:"right" }}>{m.variation > 0 ? "+" : ""}{m.variation}</div>
              <div style={{ fontSize:10, color:CJ.muted }}>{new Date(m.date).toLocaleDateString("fr-FR")}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ maxWidth:520, margin:"0 auto", padding:"0 0 100px", background:CJ.bg, minHeight:"100vh" }}>

      {/* ── HEADER ── */}
      <div style={{ background:"linear-gradient(160deg,#0f0f0f 0%,#1a1000 60%,#0f0f0f 100%)", padding:"20px 16px 16px", borderBottom:`1px solid #2a2a2a22` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <Gem size={28} color="#a78bfa"/>
          <div>
            <div style={{ fontWeight:900, fontSize:20, color:CJ.text }}>Classement <span style={{ color:"#a78bfa" }}>DRIX</span></div>
            <div style={{ color:CJ.muted, fontSize:12 }}>Saison {saisonActuelle} · Système ELO · Remise à zéro le 1er janvier</div>
          </div>
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

        {/* ── MON CLASSEMENT ── */}
        {joueur && (
          <div style={{ background:CJ.card, border:`1.5px solid ${CJ.yellow}55`, borderRadius:16, padding:16, marginBottom:12, position:"relative", overflow:"hidden", boxShadow:`0 0 24px ${CJ.yellow}18` }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${CJ.yellow},${CJ.accent},${CJ.yellow})` }}/>
            <div style={{ fontSize:10, fontWeight:900, color:CJ.yellow, letterSpacing:2, marginBottom:14 }}>MON CLASSEMENT</div>

            {/* Rang + Photo + DRIX */}
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ textAlign:"center", minWidth:48 }}>
                <div style={{ fontSize:9, color:CJ.muted, fontWeight:700, letterSpacing:1 }}>MON RANG</div>
                <div style={{ fontWeight:900, fontSize:28, color:CJ.text, lineHeight:1.1, marginTop:2 }}>#{monRangGlobal || "—"}</div>
              </div>
              <div style={{ flex:1, display:"flex", justifyContent:"center" }}>
                <div style={{ position:"relative" }}>
                  <div style={{ width:72, height:72, borderRadius:"50%", border:`3px solid ${CJ.yellow}`, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", background:`${monRangInfo.color}22`, fontSize:30 }}>
                    {joueur.photo ? <img src={joueur.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <RankIcon drix={monDrix} size={30}/>}
                  </div>
                  <div style={{ position:"absolute", bottom:-5, left:"50%", transform:"translateX(-50%)", background:CJ.yellow, borderRadius:8, padding:"2px 8px", fontSize:8, fontWeight:900, color:"#000", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4 }}><RankIcon drix={monDrix} size={10} color="#000"/> {monRangInfo.titre.toUpperCase()}</div>
                </div>
              </div>
              <div style={{ textAlign:"center", minWidth:60 }}>
                <div style={{ fontSize:9, color:CJ.muted, fontWeight:700, letterSpacing:1 }}>MES DRIX</div>
                <div style={{ fontWeight:900, fontSize:28, color:CJ.yellow, lineHeight:1.1, marginTop:2 }}>{monDrix}</div>
                <div style={{ fontSize:9, color:monRangInfo.color, fontWeight:700, marginTop:2 }}>{monRangInfo.titre.toUpperCase()}</div>
              </div>
            </div>

            {/* Progression */}
            <div style={{ marginTop:18 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <span style={{ fontSize:9, fontWeight:800, color:CJ.text, letterSpacing:1 }}>PROGRESSION DE RANG</span>
                {progression.prochain && <span style={{ fontSize:9, color:CJ.yellow, fontWeight:700 }}>{progression.restant} DRIX avant {progression.prochain.titre.toUpperCase()}</span>}
              </div>
              <div style={{ height:10, background:"#2a2a2a", borderRadius:5, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${progression.pct}%`, background:`linear-gradient(90deg,${monRangInfo.color},${CJ.yellow})`, borderRadius:5, transition:"width .6s" }}/>
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
          </div>
        )}

        {/* ── À PORTÉE ── */}
        {joueur && aPortee.length > 0 && (
          <div style={{ background:CJ.card, border:`1px solid #a78bfa44`, borderRadius:16, padding:16, marginBottom:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <Target size={18} color="#a78bfa"/>
              <span style={{ fontWeight:800, fontSize:14, color:"#a78bfa" }}>À PORTÉE</span>
            </div>
            <div style={{ fontSize:12, color:CJ.muted, marginBottom:12 }}>Gagne tes matchs pour monter dans le classement !</div>
            {aPortee.map(j => {
              const rang = classement.findIndex(x => x.id === j.id) + 1;
              const ecart = (j.drix || 1000) - monDrix;
              const { emoji, color } = getDrixTitreLocal(j.drix || 1000);
              return (
                <div key={j.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${CJ.border}` }}>
                  <span style={{ width:28, fontWeight:700, fontSize:13, color:CJ.muted, textAlign:"center" }}>#{rang}</span>
                  <div style={{ width:38, height:38, borderRadius:"50%", background:`${color}22`, border:`2px solid ${color}44`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                    {j.photo ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <RankIcon drix={j.drix||1000} size={18}/>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:14, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{j.pseudo}</div>
                    <div style={{ fontSize:12, color:CJ.muted }}>{j.drix||1000} DRIX · <span style={{ color:CJ.red }}>Écart : {ecart} DRIX</span></div>
                  </div>
                  <button onClick={() => { setJoueurId && setJoueurId(j.id); setPage("profil-joueur-"+j.id); }} style={{ background:`${CJ.accent}22`, border:`1px solid ${CJ.accent}55`, borderRadius:8, padding:"7px 13px", color:CJ.accent, fontWeight:700, fontSize:12, cursor:"pointer", flexShrink:0 }}>DÉFIER</button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── FILTRES ── */}
        <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:14, marginBottom:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:10 }}>
            <Settings size={15} color={CJ.text}/>
            <span style={{ fontWeight:800, fontSize:13, color:CJ.text, letterSpacing:1 }}>FILTRES</span>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7 }}>
            {[
              { key:"national",  Icon:Globe,      label:"NATIONAL",      color:CJ.yellow },
              { key:"amis",      Icon:Users,      label:"MES AMIS",      color:CJ.blue },
              { key:"bar",       Icon:MapPin,     label:"MON BAR",       color:CJ.accent },
              { key:"asso",      Icon:Building2,  label:"MON ASSO",      color:"#a78bfa" },
              { key:"proximite", Icon:Navigation, label:"AUTOUR DE MOI", color:CJ.green },
            ].map(({ key, Icon:FIcon, label, color }) => (
              <button key={key} onClick={() => setFiltre(key)} style={{ background:filtre===key?`${color}22`:"transparent", border:`1.5px solid ${filtre===key?color:CJ.border}`, borderRadius:10, padding:"9px 6px", color:filtre===key?color:CJ.muted, fontWeight:700, fontSize:11, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                <FIcon size={14} color={filtre===key?color:CJ.muted}/>{label}
              </button>
            ))}
          </div>
          {filtre === "proximite" && <p style={{ color:CJ.muted, fontSize:12, marginTop:8, textAlign:"center", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}><MapPin size={12} color={CJ.muted}/> Affiche les joueurs partageant ton bar</p>}
          {filtre === "bar"  && !joueur?.bar_slug  && <p style={{ color:CJ.red, fontSize:12, marginTop:8, textAlign:"center" }}>Associe-toi à un bar depuis ton profil.</p>}
          {filtre === "asso" && !joueur?.asso_slug && <p style={{ color:CJ.red, fontSize:12, marginTop:8, textAlign:"center" }}>Rejoins une association depuis ton profil.</p>}
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
                 :                    <><Navigation size={14} color={CJ.green}/> Autour de moi</>}
              </div>
              <div style={{ fontSize:10, color:CJ.muted }}>{classementFiltre.filter(j=>joueursClassesIds.size===0||joueursClassesIds.has(j.id)).length} classés</div>
            </div>

            {loading ? <SpinnerJ/> : (() => {
              const classes    = classementFiltre.filter(j => joueursClassesIds.size === 0 || joueursClassesIds.has(j.id));
              const nonClasses = classementFiltre.filter(j => joueursClassesIds.size > 0 && !joueursClassesIds.has(j.id));

              const renderJoueur = (j, rang, isMe) => {
                const { titre, color } = getDrixTitreLocal(j.drix || 1000);
                const variation = variationMap[j.id] || 0;
                const medalColors = ["#ffd700","#c0c0c0","#cd7f32"];
                return (
                  <div key={j.id} onClick={() => setPage("profil-joueur-"+j.id)}
                    style={{ background:isMe?`linear-gradient(135deg,${CJ.yellow}15,${CJ.card})`:(rang<=3?`${color}0a`:CJ.card), border:`1.5px solid ${isMe?CJ.yellow+"77":rang===1?color:rang<=3?color+"44":CJ.border}`, borderRadius:14, padding:"12px 14px", marginBottom:8, cursor:"pointer", boxShadow:isMe?`0 0 22px ${CJ.yellow}22`:rang===1?`0 0 14px ${color}22`:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:11 }}>
                      {/* Rank */}
                      <div style={{ minWidth:30, textAlign:"center" }}>
                        {rang <= 3 ? (
                          <div style={{ width:30, height:30, borderRadius:"50%", background:medalColors[rang-1], display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, boxShadow:`0 2px 8px ${medalColors[rang-1]}66` }}>
                            {rang===1?"🥇":rang===2?"🥈":"🥉"}
                          </div>
                        ) : (
                          <span style={{ fontWeight:900, fontSize:14, color:isMe?CJ.yellow:CJ.muted }}>#{rang}</span>
                        )}
                      </div>
                      {/* Avatar + rank badge */}
                      <div style={{ position:"relative", flexShrink:0 }}>
                        <div style={{ width:46, height:46, borderRadius:"50%", background:`${color}22`, border:`2px solid ${isMe?CJ.yellow:color+"55"}`, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
                          {j.photo ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <RankIcon drix={j.drix||1000} size={20}/>}
                        </div>
                        <div style={{ position:"absolute", bottom:-3, right:-4, background:color, borderRadius:"50%", width:17, height:17, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #1a1a1a" }}><RankIcon drix={j.drix||1000} size={10} color="#fff"/></div>
                      </div>
                      {/* Name + rank + progress */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:14, color:isMe?CJ.yellow:CJ.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {j.pseudo}{isMe?" (moi)":""}
                        </div>
                        <div style={{ fontSize:12, color, fontWeight:600, display:"flex", alignItems:"center", gap:4 }}><RankIcon drix={j.drix||1000} size={11}/> {titre}</div>
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
                    {filtre === "amis" ? "Aucun ami dans le classement." : "Aucun joueur trouvé."}
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
          <div style={{ textAlign:"center", marginTop:12, fontSize:12, color:CJ.muted }}>Classement mis à jour il y a 2 minutes</div>
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

// ── BADGE BULL ────────────────────────────────────────────────────────────────
export const BullBadge = ({ bull, size="normal", flash=false }) => {
  const balance = bull ?? BULL_INIT;
  const big = size === "big";
  const col = balance <= 10 ? "#ef4444" : balance <= 50 ? "#f59e0b" : "#f97316";
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", gap:big?6:4,
      background: flash ? "#78350f" : "#1a0f00",
      border:`1px solid ${col}44`,
      borderRadius:big?12:8,
      padding:big?"8px 14px":"3px 10px",
      transition:"background .3s",
      boxShadow: flash ? `0 0 14px ${col}66` : "none",
    }}>
      <span style={{ fontSize:big?18:13 }}>🪙</span>
      <span style={{ fontWeight:900, fontSize:big?18:13, color:col, fontVariantNumeric:"tabular-nums" }}>{balance}</span>
      <span style={{ fontSize:big?11:10, color:"#a16207", fontWeight:700 }}>BULLS</span>
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