import { useState, useMemo, useEffect, useRef } from "react";

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

// ── SYSTÈME BULL ──────────────────────────────────────────────────────────────
export const BULL_MAX   = 500;   // plafond maximum
export const BULL_DAILY = 50;    // recharge quotidienne
export const BULL_INIT  = 250;   // solde initial à la création du compte
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
  const bull = Math.min(BULL_MAX, current + BULL_DAILY); // plafond à 500
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
      dbJ.updateBullReserved(gagnantId, Math.min(BULL_MAX, gBull + mise * 2), Math.max(0, gRes - mise)),
      // Perdant : sa mise était déjà déduite — on libère seulement la réservation
      dbJ.updateBullReserved(perdantId, jP.bull_balance ?? BULL_INIT, Math.max(0, pRes - mise)),
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

// Titres DRIX
const getDrixTitreLocal = (drix) => {
  if (drix < 900)  return { titre:"Novice",    emoji:"🎯",  color:"#94a3b8" };
  if (drix < 1100) return { titre:"Amateur",   emoji:"🎯🎯", color:"#60a5fa" };
  if (drix < 1300) return { titre:"Confirmé",  emoji:"⭐",  color:"#22c55e" };
  if (drix < 1500) return { titre:"Expert",    emoji:"⭐⭐", color:"#f59e0b" };
  if (drix < 1700) return { titre:"Elite",     emoji:"💎",  color:"#a78bfa" };
  if (drix < 1900) return { titre:"Master",    emoji:"👑",  color:"#f97316" };
  return              { titre:"Légende",   emoji:"🏆",  color:"#ef4444" };
};

// Code admin pour réinitialiser un mot de passe oublié (à communiquer à voix)
const RESET_ADMIN_CODE = "jesuisunebrele";

// ── CONNEXION / INSCRIPTION ───────────────────────────────────────────────────
export const Connexion = ({ onLogin, setPage }) => {
  const [mode, setMode] = useState("login"); // "login" | "register" | "reset"
  const [pseudo, setPseudo] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setErr(""); setSuccess(""); setPseudo(""); setPwd(""); setPwd2(""); setAdminCode(""); };

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
    if (!pseudo.trim() || !pwd || pwd !== pwd2) { setErr(pwd !== pwd2 ? "Les mots de passe ne correspondent pas" : "Champs obligatoires"); return; }
    if (pseudo.trim().length < 3) { setErr("Pseudo trop court (min 3 caractères)"); return; }
    setLoading(true); setErr("");
    try {
      const exist = await dbJ.getJoueurByPseudo(pseudo.trim());
      if (exist) { setErr("Ce pseudo est déjà pris"); setLoading(false); return; }
      const hash = await hashPwd(pwd);
      const r = await dbJ.addJoueur({ pseudo: pseudo.trim(), password_hash: hash, date_inscription: Date.now() });
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
    <div style={{ maxWidth:400, margin:"60px auto", padding:"0 20px" }}>
      <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:28 }}>
        <div style={{ fontSize:40, textAlign:"center", marginBottom:16 }}>🎯</div>

        {mode !== "reset" ? (<>
          <div style={{ display:"flex", gap:4, marginBottom:24, background:"#111", borderRadius:10, padding:4 }}>
            {[["login","Connexion"],["register","Inscription"]].map(([m,l])=>(
              <button key={m} onClick={()=>{setMode(m);setErr("");}} style={{ flex:1,background:mode===m?CJ.accent:"transparent",color:mode===m?"#fff":CJ.muted,border:"none",borderRadius:8,padding:"8px",cursor:"pointer",fontWeight:600,fontSize:14 }}>{l}</button>
            ))}
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <FieldJ label="Pseudo" value={pseudo} onChange={setPseudo} placeholder="VotrePseudo"/>
            <FieldJ label="Mot de passe" value={pwd} onChange={setPwd} placeholder="••••••••" type="password"/>
            {mode==="register" && <FieldJ label="Confirmer le mot de passe" value={pwd2} onChange={setPwd2} placeholder="••••••••" type="password"/>}
            {err && <p style={{ color:CJ.red, fontSize:13 }}>⚠️ {err}</p>}
            <BtnJ onClick={mode==="login"?login:register} disabled={loading} style={{ marginTop:4 }}>
              {loading?"Chargement…":mode==="login"?"Se connecter →":"Créer mon compte →"}
            </BtnJ>
            {mode==="login" && (
              <button onClick={()=>{setMode("reset");reset();}} style={{ background:"none",border:"none",color:CJ.muted,fontSize:12,cursor:"pointer",textAlign:"center",marginTop:2 }}>
                Mot de passe oublié ?
              </button>
            )}
          </div>
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
              {loading?"Réinitialisation…":"Réinitialiser le mot de passe"}
            </BtnJ>
            <button onClick={()=>{setMode("login");reset();}} style={{ background:"none",border:"none",color:CJ.muted,fontSize:12,cursor:"pointer",textAlign:"center" }}>
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
  const [stats, setStats] = useState(null);
  const [duels, setDuels] = useState([]);
  const [defis, setDefis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profil");

  const [editMode, setEditMode] = useState(false);
  const [editAge, setEditAge] = useState(joueur.age||"");
  const [editVille, setEditVille] = useState(joueur.ville||"");
  const [editStyle, setEditStyle] = useState(joueur.style_jeu||"electronique");
  const [savingEdit, setSavingEdit] = useState(false);
  const photoRef = useRef(null);

  const bar = bars.find(b => b.slug === joueur.bar_slug);
  const asso = associations.find(a => a.slug === joueur.asso_slug);
  const { titre, emoji, color } = getDrixTitreLocal(joueur.drix||1000);

  const [moyDrix, setMoyDrix] = useState(null);
  const [tournoisPotes, setTournoisPotes] = useState([]);

  useEffect(() => {
    Promise.all([
      dbJ.getStats(joueur.id),
      dbJ.getDuels(joueur.id),
      dbJ.getDuelsEnAttente(joueur.id),
      sbJ(`drix_mouvements?joueur_id=eq.${joueur.id}&select=variation`),
    ]).then(([s,d,def,mv]) => {
      setStats(s); setDuels(d||[]); setDefis(def||[]);
      if (mv && mv.length > 0) {
        const moy = mv.reduce((acc,x)=>acc+x.variation,0) / mv.length;
        setMoyDrix(Math.round(moy * 10) / 10);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [joueur.id]);

  // Tournois entre potes où ce joueur est inscrit
  useEffect(() => {
    sbJ(`tournois_potes_joueurs?joueur_id=eq.${joueur.id}&select=tournoi_id,tournois_potes(id,nom,statut,createur_pseudo)`)
      .then(rows => {
        if (!rows) return;
        const actifs = rows
          .map(r => r.tournois_potes)
          .filter(t => t && t.statut !== "termine");
        setTournoisPotes(actifs);
      }).catch(() => {});
  }, [joueur.id]);

  const sauvegarderProfil = async () => {
    setSavingEdit(true);
    const patch = { age: parseInt(editAge)||null, ville: editVille.trim()||null, style_jeu: editStyle };
    await dbJ.updateJoueur(joueur.id, patch);
    const updated = {...joueur, ...patch};
    setJoueur(updated);
    localStorage.setItem("dp_joueur", JSON.stringify(updated));
    setSavingEdit(false);
    setEditMode(false);
  };

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const img = new Image();
      img.onload = async () => {
        const MAX=300; let w=img.width,h=img.height;
        if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
        const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
        canvas.getContext("2d").drawImage(img,0,0,w,h);
        const data = canvas.toDataURL("image/jpeg",0.8);
        await dbJ.updateJoueur(joueur.id, { photo: data });
        const updated = {...joueur, photo: data};
        setJoueur(updated);
        localStorage.setItem("dp_joueur", JSON.stringify(updated));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const choisirBar = async (slug) => {
    await dbJ.updateJoueur(joueur.id, { bar_slug: slug });
    const updated = {...joueur, bar_slug: slug};
    setJoueur(updated);
    localStorage.setItem("dp_joueur", JSON.stringify(updated));
  };

  const choisirAsso = async (slug) => {
    await dbJ.updateJoueur(joueur.id, { asso_slug: slug });
    const updated = {...joueur, asso_slug: slug};
    setJoueur(updated);
    localStorage.setItem("dp_joueur", JSON.stringify(updated));
  };

  const accepterDefi = async (duel) => {
    await dbJ.updateDuel(duel.id, { statut:"accepte" });
    setPage("scoreur-duel-"+duel.id);
  };

  const refuserDefi = async (duel) => {
    await dbJ.updateDuel(duel.id, { statut:"refuse" });
    setDefis(x => x.filter(d => d.id !== duel.id));
  };

  const annulerDefi = async (duel) => {
    await dbJ.deleteDuel(duel.id);
    setDuels(x => x.filter(d => d.id !== duel.id));
  };

  const validerResultat = async (duel) => {
    const isChallenger = duel.challenger_id === joueur.id;
    const patch = isChallenger ? { valide_challenger: true } : { valide_defie: true };

    // On enregistre d'abord notre validation en base
    await dbJ.updateDuel(duel.id, patch);

    // Puis on relit le duel depuis Supabase pour avoir l'état réel (évite la race condition)
    const duelFrais = await sbJ(`duels?id=eq.${duel.id}&select=*`).then(r => r?.[0]);
    const autreValide = duelFrais
      ? (isChallenger ? duelFrais.valide_defie : duelFrais.valide_challenger)
      : (isChallenger ? duel.valide_defie : duel.valide_challenger);

    if (autreValide && duelFrais?.statut !== "termine") {
      await dbJ.updateDuel(duel.id, { statut:"termine" });
      const gagnantId = duel.gagnant_id;
      const [sC, sD] = await Promise.all([dbJ.getStats(duel.challenger_id), dbJ.getStats(duel.defie_id)]);
      if (sC) await dbJ.updateStats(sC.id, { parties:sC.parties+1, victoires:gagnantId===duel.challenger_id?sC.victoires+1:sC.victoires, defaites:gagnantId!==duel.challenger_id?sC.defaites+1:sC.defaites });
      if (sD) await dbJ.updateStats(sD.id, { parties:sD.parties+1, victoires:gagnantId===duel.defie_id?sD.victoires+1:sD.victoires, defaites:gagnantId!==duel.defie_id?sD.defaites+1:sD.defaites });
      // Utilise appliquerDrixDuel : K variable par niveau + écriture drix_mouvements (badge feed)
      await appliquerDrixDuel(duelFrais);
    }
    const joueurFrais = await dbJ.getJoueur(joueur.id);
    if (joueurFrais) {
      setJoueur(joueurFrais);
      localStorage.setItem("dp_joueur", JSON.stringify(joueurFrais));
    }
    const d = await dbJ.getDuels(joueur.id); setDuels(d||[]);
  };

  const [badgeModal, setBadgeModal] = useState(false);

  if (loading) return <SpinnerJ/>;

  const winRate = stats && stats.parties > 0 ? Math.round((stats.victoires / stats.parties) * 100) : 0;
  const STYLES = [["electronique","⚡ Électronique"],["traditionnel","🎯 Traditionnel"],["les deux","🎯⚡ Les deux"]];
  const moyenneDuels = (() => {
    const termines = duels.filter(d => d.statut === "termine");
    const scores = termines
      .map(d => parseFloat(d.challenger_id === joueur.id ? d.score_challenger : d.score_defie))
      .filter(s => !isNaN(s) && s > 0);
    return scores.length > 0 ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : null;
  })();

  return (
    <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 20px" }}>

      {/* ── CARTE PROFIL ── */}
      <div style={{ background:"linear-gradient(135deg,#1a0800,#1a1a2e)", border:`1px solid ${color}44`, borderRadius:16, padding:24, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"flex-start", gap:20, flexWrap:"wrap" }}>

          <div style={{ position:"relative", flexShrink:0 }}>
            <div onClick={()=>photoRef.current?.click()} style={{ width:80,height:80,borderRadius:"50%",border:`3px solid ${color}`,overflow:"hidden",cursor:"pointer",background:color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32 }}>
              {joueur.photo
                ? <img src={joueur.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                : <span>{emoji}</span>
              }
            </div>
            <div onClick={()=>photoRef.current?.click()} style={{ position:"absolute",bottom:0,right:0,background:CJ.accent,borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:12,border:"2px solid #1a0800" }}>📷</div>
            <input ref={photoRef} type="file" accept="image/*" style={{ display:"none" }} onChange={uploadPhoto}/>
          </div>

          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
              <h1 style={{ fontWeight:900, fontSize:24 }}>{joueur.pseudo}</h1>
              {!editMode && <button onClick={()=>setEditMode(true)} style={{ background:"none",border:`1px solid ${CJ.border}`,color:CJ.muted,cursor:"pointer",borderRadius:6,padding:"3px 10px",fontSize:11 }}>✏️ Modifier</button>}
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:10 }}>
              <div style={{ display:"inline-flex",alignItems:"center",gap:8,background:color+"22",border:`1px solid ${color}44`,borderRadius:20,padding:"5px 14px" }}>
                <span style={{ fontSize:16 }}>{emoji}</span>
                <span style={{ fontWeight:900,fontSize:18,color }}>{joueur.drix||1000}</span>
                <span style={{ fontSize:12,color,fontWeight:600 }}>DRIX · {titre}</span>
              </div>
              <BullBadge bull={joueur.bull_balance} size="normal"/>
            </div>

            {!editMode ? (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {joueur.age && <BadgeJ color={CJ.muted}>🎂 {joueur.age} ans</BadgeJ>}
                {joueur.ville && <BadgeJ color={CJ.blue}>📍 {joueur.ville}</BadgeJ>}
                {joueur.style_jeu && <BadgeJ color={CJ.accent}>{STYLES.find(s=>s[0]===joueur.style_jeu)?.[1]||joueur.style_jeu}</BadgeJ>}
                {bar ? <BadgeJ color={CJ.accent}>🍺 {bar.nom}</BadgeJ> : <BadgeJ color={CJ.muted}>Pas de bar affilié</BadgeJ>}
                {asso && <BadgeJ color="#7c3aed">🫂 {asso.nom}</BadgeJ>}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:8 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div>
                    <label style={{ fontSize:11,color:CJ.muted,display:"block",marginBottom:4 }}>Âge</label>
                    <input value={editAge} onChange={e=>setEditAge(e.target.value)} placeholder="Ex: 28" type="number"
                      style={{ width:"100%",background:"#111",border:`1px solid ${CJ.border}`,borderRadius:8,padding:"8px 10px",color:CJ.text,fontSize:13 }}/>
                  </div>
                  <div>
                    <label style={{ fontSize:11,color:CJ.muted,display:"block",marginBottom:4 }}>Ville</label>
                    <input value={editVille} onChange={e=>setEditVille(e.target.value)} placeholder="Ex: Bayonne"
                      style={{ width:"100%",background:"#111",border:`1px solid ${CJ.border}`,borderRadius:8,padding:"8px 10px",color:CJ.text,fontSize:13 }}/>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize:11,color:CJ.muted,display:"block",marginBottom:4 }}>Style de jeu</label>
                  <div style={{ display:"flex",gap:6 }}>
                    {STYLES.map(([v,l])=>(
                      <button key={v} onClick={()=>setEditStyle(v)} style={{ flex:1,background:editStyle===v?CJ.accent+"33":"#111",border:`1px solid ${editStyle===v?CJ.accent:CJ.border}`,borderRadius:8,padding:"7px 4px",cursor:"pointer",fontSize:11,color:editStyle===v?CJ.accent:CJ.muted,fontWeight:editStyle===v?700:400 }}>{l}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <BtnJ onClick={sauvegarderProfil} disabled={savingEdit} style={{ fontSize:12,padding:"7px 16px" }}>{savingEdit?"…":"💾 Sauvegarder"}</BtnJ>
                  <BtnJ onClick={()=>setEditMode(false)} variant="dark" style={{ fontSize:12,padding:"7px 16px" }}>Annuler</BtnJ>
                </div>
              </div>
            )}
          </div>

          {stats && (
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {[[stats.victoires,"V",CJ.green],[stats.defaites,"D",CJ.red],[stats.parties,"Parties",CJ.muted],[winRate+"%","Win",CJ.yellow]].map(([v,l,c])=>(
                <div key={l} style={{ textAlign:"center", background:"#ffffff11", borderRadius:10, padding:"10px 14px" }}>
                  <div style={{ fontSize:22,fontWeight:900,color:c }}>{v}</div>
                  <div style={{ fontSize:11,color:CJ.muted }}>{l}</div>
                </div>
              ))}
              {moyenneDuels && (
                <div style={{ textAlign:"center", background:"#ffffff11", borderRadius:10, padding:"10px 14px" }}>
                  <div style={{ fontSize:22,fontWeight:900,color:CJ.blue }}>{moyenneDuels}</div>
                  <div style={{ fontSize:11,color:CJ.muted }}>Moy. pts</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tournois entre potes */}
      <div style={{ marginBottom:14 }}>
        {tournoisPotes.length > 0 ? (
          <div style={{ background:"#f9731611", border:`1px solid ${CJ.accent}55`, borderRadius:12, padding:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontWeight:700, fontSize:13, color:CJ.accent }}>🍺 Tournois en cours</span>
              <button onClick={()=>setPage("tournois-potes")} style={{ background:"none", border:"none", color:CJ.muted, cursor:"pointer", fontSize:11 }}>Voir tous →</button>
            </div>
            {tournoisPotes.map(t => {
              const sl = { attente:"⏳ Lobby", poules:"🏟️ Poules", eliminatoires:"⚔️ Élim." }[t.statut] || t.statut;
              return (
                <div key={t.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"#ffffff0d", borderRadius:8, padding:"9px 12px", marginBottom:6, gap:8 }}>
                  <div>
                    <div style={{ fontWeight:600, fontSize:13 }}>🏓 {t.nom}</div>
                    <div style={{ fontSize:11, color:CJ.muted }}>par {t.createur_pseudo} · {sl}</div>
                  </div>
                  <button onClick={()=>setPage("tournoi-potes-"+t.id)} style={{ background:CJ.accent, color:"#fff", border:"none", cursor:"pointer", padding:"6px 14px", borderRadius:8, fontSize:12, fontWeight:700, whiteSpace:"nowrap" }}>
                    Rejoindre →
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <button onClick={()=>setPage("tournois-potes")} style={{ background:"#f9731611", border:`1px solid ${CJ.accent}44`, color:CJ.accent, cursor:"pointer", padding:"9px 16px", borderRadius:10, fontSize:13, fontWeight:600, display:"flex", alignItems:"center", gap:8, width:"100%" }}>
            <span style={{ fontSize:18 }}>🍺</span>
            <span>Tournoi entre potes</span>
            <span style={{ marginLeft:"auto", fontSize:11, color:CJ.muted }}>Voir mes tournois →</span>
          </button>
        )}
      </div>

      {/* ── BOUTONS IMAGE PROFIL ── */}
      <div style={{ display:"flex", gap:10, marginBottom:16 }}>
        {[
          { src:"/profil/stat.png",  label:"Stats",  action:()=>setPage("profil-stats"), badge:0 },
          { src:"/profil/amis.png",  label:"Amis",   action:()=>setPage("profil-amis"),  badge:demandesAmisCount },
          { src:"/profil/badge.png", label:"Badges", action:()=>setPage("profil-badges"),badge:0 },
        ].map(({ src, label, action, badge }) => (
          <div key={label} onClick={action} style={{ flex:1,cursor:"pointer",borderRadius:12,overflow:"hidden",userSelect:"none",touchAction:"manipulation",transition:"transform .15s, box-shadow .15s",position:"relative" }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 20px #0008";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
            <img src={src} alt={label} style={{ width:"100%",display:"block",borderRadius:12 }}/>
            {badge > 0 && (
              <div style={{ position:"absolute",top:8,right:8,background:"#10b981",color:"#fff",borderRadius:"50%",minWidth:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,boxShadow:"0 2px 10px #00000099",border:"2px solid #0a0a0a",zIndex:2 }}>
                {badge > 9 ? "9+" : badge}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Badge modal */}
      {badgeModal && (
        <div style={{ position:"fixed",inset:0,background:"#000000cc",zIndex:3000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={()=>setBadgeModal(false)}>
          <div style={{ background:"#1a1a1a",border:`1px solid ${CJ.border}`,borderRadius:20,padding:32,maxWidth:300,textAlign:"center",width:"100%" }} onClick={e=>e.stopPropagation()}>
            <div style={{ fontSize:52,marginBottom:12 }}>🏅</div>
            <h2 style={{ fontWeight:900,fontSize:20,marginBottom:8 }}>Badges</h2>
            <p style={{ color:CJ.muted,fontSize:14,marginBottom:20 }}>Cette fonctionnalité arrive bientôt !<br/>Débloque des badges selon tes performances.</p>
            <div style={{ background:"#f97316",color:"#fff",fontWeight:700,fontSize:12,padding:"5px 16px",borderRadius:20,display:"inline-block",marginBottom:20 }}>🚧 En construction</div>
            <br/>
            <button onClick={()=>setBadgeModal(false)} style={{ background:"#2a2a2a",border:"none",color:"#f1f5f9",cursor:"pointer",padding:"10px 28px",borderRadius:10,fontSize:14,fontWeight:700,touchAction:"manipulation" }}>Fermer</button>
          </div>
        </div>
      )}

      {/* Onglets */}
      <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
        {[["defis",`⚔️ Défis${defis.length>0?" ("+defis.length+")":""}`],["amis","👥 Amis"],["historique","📋 Historique"],["affiliation","🍺 Affiliation"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ background:tab===t?CJ.accent+"22":"transparent",color:tab===t?CJ.accent:CJ.muted,border:`1px solid ${tab===t?CJ.accent:CJ.border}`,cursor:"pointer",padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:500,touchAction:"manipulation" }}>{l}</button>
        ))}
      </div>

      {/* Défis */}
      {tab==="defis" && (
        <div>
          {duels.filter(d=>d.statut==="termine"&&d.gagnant_id!==joueur.id&&(d.challenger_id===joueur.id?!d.valide_challenger:!d.valide_defie)&&Date.now()-d.date<86400000).length>0&&(
            <div style={{ marginBottom:24 }}>
              <h3 style={{ fontWeight:700,fontSize:16,marginBottom:14,color:CJ.yellow }}>⚠️ Résultats récents — tu peux contester</h3>
              {duels.filter(d=>d.statut==="termine"&&d.gagnant_id!==joueur.id&&(d.challenger_id===joueur.id?!d.valide_challenger:!d.valide_defie)&&Date.now()-d.date<86400000).map(d=>{
                const isChallenger=d.challenger_id===joueur.id;
                const adversaire=isChallenger?d.defie_pseudo:d.challenger_pseudo;
                const {sc,sd}=fixManches(d);
                const monManche=isChallenger?sc:sd; const sonManche=isChallenger?sd:sc;
                const heuresRestantes=Math.max(0,Math.floor((86400000-(Date.now()-d.date))/3600000));
                return(
                  <div key={d.id} style={{ background:CJ.card,border:`2px solid ${CJ.yellow}`,borderRadius:12,padding:18,marginBottom:10 }}>
                    <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                      <p style={{ fontWeight:700,fontSize:14,margin:0 }}>😔 vs <strong>{adversaire}</strong> — {d.mode}</p>
                      <span style={{ fontSize:11,color:CJ.yellow }}>{heuresRestantes}h restantes</span>
                    </div>
                    <p style={{ color:CJ.muted,fontSize:13,marginBottom:12 }}>{d.gagnant_pseudo} a gagné · {monManche} – {sonManche} manches</p>
                    <div style={{ display:"flex",gap:8 }}>
                      <BtnJ variant="dark" onClick={async()=>{await dbJ.updateDuel(d.id,{valide_challenger:true,valide_defie:true});setDuels(x=>x.map(x=>x.id===d.id?{...x,valide_challenger:true,valide_defie:true}:x));}} style={{ flex:1,fontSize:13 }}>✅ J'accepte le résultat</BtnJ>
                      <BtnJ variant="danger" onClick={async()=>{if(window.confirm("Contester ce résultat ?"))await dbJ.updateDuel(d.id,{statut:"conteste"});setDuels(x=>x.filter(x=>x.id!==d.id));}} style={{ fontSize:13 }}>⚠️ Contester</BtnJ>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {duels.filter(d=>d.statut==="accepte").length>0&&(
            <div style={{ marginBottom:24 }}>
              <h3 style={{ fontWeight:700,fontSize:16,marginBottom:14,color:CJ.green }}>🎯 Match accepté — Lance le scoreur !</h3>
              {duels.filter(d=>d.statut==="accepte").map(d=>{
                const adversaire=d.challenger_id===joueur.id?d.defie_pseudo:d.challenger_pseudo;
                return(
                  <div key={d.id} style={{ background:CJ.card,border:`2px solid ${CJ.green}`,borderRadius:12,padding:16,marginBottom:10 }}>
                    <p style={{ fontWeight:700,marginBottom:4 }}>⚔️ vs <strong>{adversaire}</strong> — {d.mode} · {d.manches||1} manche{(d.manches||1)>1?"s":""}</p>
                    <BtnJ onClick={()=>setPage("scoreur-duel-"+d.id)} style={{ fontSize:13,width:"100%",marginTop:8 }}>🎯 Lancer le scoreur</BtnJ>
                  </div>
                );
              })}
            </div>
          )}
          <h3 style={{ fontWeight:700,fontSize:16,marginBottom:14 }}>⚔️ Défis reçus</h3>
          {defis.length===0
            ? <p style={{ color:CJ.muted,fontSize:13,marginBottom:24 }}>Aucun défi en attente.<br/><span style={{ fontSize:12 }}>Utilise le bouton <b>⚔️ Défi</b> pour défier un ami.</span></p>
            : defis.map(d=>(
              <div key={d.id} style={{ background:CJ.card,border:`1px solid ${CJ.yellow}44`,borderRadius:12,padding:16,marginBottom:10 }}>
                <p style={{ fontWeight:700,marginBottom:4 }}>⚔️ <strong>{d.challenger_pseudo}</strong> vous défie</p>
                <p style={{ color:CJ.muted,fontSize:12,marginBottom:10 }}>{d.mode} · {d.manches||1} manche{(d.manches||1)>1?"s":""} · {new Date(d.date).toLocaleDateString("fr-FR")}</p>
                <div style={{ display:"flex",gap:8 }}>
                  <BtnJ variant="success" onClick={()=>accepterDefi(d)} style={{ fontSize:12,padding:"7px 14px" }}>✅ Accepter et jouer</BtnJ>
                  <BtnJ variant="danger" onClick={()=>refuserDefi(d)} style={{ fontSize:12,padding:"7px 14px" }}>❌ Refuser</BtnJ>
                </div>
              </div>
            ))
          }
          <h3 style={{ fontWeight:700,fontSize:16,marginBottom:14,marginTop:16 }}>📤 Défis envoyés</h3>
          {duels.filter(d=>d.challenger_id===joueur.id&&d.statut==="en_attente").length===0
            ? <p style={{ color:CJ.muted,fontSize:13,marginBottom:24 }}>Aucun défi envoyé en attente.</p>
            : duels.filter(d=>d.challenger_id===joueur.id&&d.statut==="en_attente").map(d=>(
              <div key={d.id} style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:16,marginBottom:10 }}>
                <p style={{ fontWeight:600,marginBottom:4 }}>⚔️ Défi envoyé à <strong>{d.defie_pseudo}</strong></p>
                <p style={{ color:CJ.muted,fontSize:12,marginBottom:10 }}>{d.mode} · {d.manches||1} manche{(d.manches||1)>1?"s":""} · En attente…</p>
                <BtnJ variant="danger" onClick={()=>annulerDefi(d)} style={{ fontSize:12,padding:"7px 14px" }}>❌ Annuler le défi</BtnJ>
              </div>
            ))
          }
        </div>
      )}

      {/* Historique */}
      {tab==="historique" && (
        <div>
          <h3 style={{ fontWeight:700,fontSize:16,marginBottom:14 }}>📋 Historique des duels</h3>
          {duels.filter(d=>d.statut==="termine").length===0
            ? <p style={{ color:CJ.muted,fontSize:13 }}>Aucun duel terminé.</p>
            : duels.filter(d=>d.statut==="termine").map(d=>{
              const isChallenger = d.challenger_id===joueur.id;
              const adversaire = isChallenger ? d.defie_pseudo : d.challenger_pseudo;
              const {sc,sd} = fixManches(d);
              const monManche = isChallenger ? sc : sd;
              const sonManche = isChallenger ? sd : sc;
              const monMoy = isChallenger ? d.score_challenger : d.score_defie;
              const sonMoy = isChallenger ? d.score_defie : d.score_challenger;
              const gagne = d.gagnant_id===joueur.id;
              return (
                <div key={d.id} style={{ background:CJ.card,border:`1px solid ${gagne?CJ.green+"44":CJ.red+"44"}`,borderRadius:10,padding:14,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
                  <div>
                    <span style={{ fontWeight:600 }}>vs {adversaire}</span>
                    <span style={{ color:CJ.muted,fontSize:12,marginLeft:8 }}>{d.mode} · {new Date(d.date).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontWeight:700,fontSize:14 }}>{monManche ?? "?"} – {sonManche ?? "?"}</div>
                      {monMoy && <div style={{ fontSize:11,color:CJ.accent }}>Moi : {monMoy} pts</div>}
                      {sonMoy && <div style={{ fontSize:11,color:CJ.muted }}>Adv. : {sonMoy} pts</div>}
                    </div>
                    <BadgeJ color={gagne?CJ.green:CJ.red}>{gagne?"Victoire ✅":"Défaite ❌"}</BadgeJ>
                  </div>
                </div>
              );
            })
          }
        </div>
      )}

      {/* Amis */}
      {tab==="amis" && (
        <AmiSection joueur={joueur} setPage={setPage}/>
      )}

      {/* Affiliation */}
      {tab==="affiliation" && (
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:20 }}>
            <h3 style={{ fontWeight:700,fontSize:15,marginBottom:6,color:CJ.accent }}>🍺 Bar affilié</h3>
            <p style={{ color:CJ.muted,fontSize:13,marginBottom:14 }}>Votre bar = votre équipe.</p>
            {bar && <p style={{ color:CJ.green,fontSize:13,marginBottom:12 }}>Actuellement : <strong>{bar.nom}</strong> à {bar.ville}</p>}
            <div style={{ display:"flex",flexDirection:"column",gap:8,maxHeight:300,overflowY:"auto" }}>
              {bars.map(b=>(
                <div key={b.slug} onClick={()=>choisirBar(b.slug)} style={{ background:joueur.bar_slug===b.slug?"#1a0800":"#111",border:`1px solid ${joueur.bar_slug===b.slug?CJ.accent:CJ.border}`,borderRadius:8,padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span style={{ fontWeight:joueur.bar_slug===b.slug?700:400 }}>{b.nom}</span>
                  <span style={{ color:CJ.muted,fontSize:12 }}>📍 {b.ville}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:20 }}>
            <h3 style={{ fontWeight:700,fontSize:15,marginBottom:6,color:"#7c3aed" }}>🫂 Association affiliée</h3>
            {asso && <p style={{ color:CJ.green,fontSize:13,marginBottom:12 }}>Actuellement : <strong>{asso.nom}</strong></p>}
            <div style={{ display:"flex",flexDirection:"column",gap:8,maxHeight:200,overflowY:"auto" }}>
              {associations.map(a=>(
                <div key={a.slug} onClick={()=>choisirAsso(a.slug)} style={{ background:joueur.asso_slug===a.slug?"#1a0f1a":"#111",border:`1px solid ${joueur.asso_slug===a.slug?"#7c3aed":CJ.border}`,borderRadius:8,padding:"10px 14px",cursor:"pointer",display:"flex",justifyContent:"space-between" }}>
                  <span style={{ fontWeight:joueur.asso_slug===a.slug?700:400 }}>{a.nom}</span>
                  <span style={{ color:CJ.muted,fontSize:12 }}>📍 {a.ville}</span>
                </div>
              ))}
            </div>
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
  const [drixMvtMap, setDrixMvtMap] = useState({});
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState("stats"); // "stats" | "historique"
  const [editMode, setEditMode]   = useState(false);
  const [editAge, setEditAge]     = useState(joueur.age||"");
  const [editVille, setEditVille] = useState(joueur.ville||"");
  const [editStyle, setEditStyle] = useState(joueur.style_jeu||"electronique");
  const [savingEdit, setSavingEdit] = useState(false);

  const bar  = bars.find(b => b.slug === joueur.bar_slug);
  const asso = associations.find(a => a.slug === joueur.asso_slug);
  const STYLES = [["electronique","⚡ Électronique"],["traditionnel","🎯 Traditionnel"],["les deux","🎯⚡ Les deux"]];

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
      const map = {};
      (mvts||[]).forEach(m => { if (m.duel_id) map[m.duel_id] = m.variation; });
      setDrixMvtMap(map);
      if (allJ?.length) {
        const pos = allJ.findIndex(j => j.id === joueur.id);
        setClassement({ position: pos >= 0 ? pos + 1 : null, total: allJ.length });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [joueur.id]);

  const sauvegarderProfil = async () => {
    setSavingEdit(true);
    const patch = { age: parseInt(editAge)||null, ville: editVille.trim()||null, style_jeu: editStyle };
    await dbJ.updateJoueur(joueur.id, patch);
    const updated = {...joueur, ...patch};
    setJoueur(updated); localStorage.setItem("dp_joueur", JSON.stringify(updated));
    setSavingEdit(false); setEditMode(false);
  };
  const choisirBar = async (slug) => {
    await dbJ.updateJoueur(joueur.id, { bar_slug: slug });
    const updated = {...joueur, bar_slug: slug};
    setJoueur(updated); localStorage.setItem("dp_joueur", JSON.stringify(updated));
  };
  const choisirAsso = async (slug) => {
    await dbJ.updateJoueur(joueur.id, { asso_slug: slug });
    const updated = {...joueur, asso_slug: slug};
    setJoueur(updated); localStorage.setItem("dp_joueur", JSON.stringify(updated));
  };

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
  termines.forEach(d => {
    (d.manches_detail||[]).forEach(m => {
      const isW = m.winner === joueur.pseudo;
      nb180        += isW ? (m.winner_180||0)     : (m.loser_180||0);
      nb140        += isW ? (m.winner_140plus||0)  : (m.loser_140plus||0);
      nb100        += isW ? (m.winner_100plus||0)  : (m.loser_100plus||0);
      nb80         += isW ? (m.winner_80plus||0)   : (m.loser_80plus||0);
      nb60         += isW ? (m.winner_60plus||0)   : (m.loser_60plus||0);
      const ms      = isW ? (m.winner_max||0)      : (m.loser_max||0);
      const fin     = isW ? (m.winner_finish||0)   : 0;
      plusGrosScore  = Math.max(plusGrosScore, ms);
      plusGrosFinish = Math.max(plusGrosFinish, fin);
    });
  });
  const hasScoring = termines.some(d=>(d.manches_detail||[]).some(m=>m.winner_180!==undefined));

  // ── Composant card stat ───────────────────────────────────────────────────
  const StatCard = ({ label, value, color=CJ.text, sub=null, bientot=false }) => (
    <div style={{ background:"#ffffff09", border:`1px solid ${CJ.border}`, borderRadius:10, padding:"12px 10px", position:"relative" }}>
      {bientot && <span style={{ position:"absolute",top:6,right:6,background:"#1a1a1a",border:`1px solid ${CJ.border}`,borderRadius:4,fontSize:9,color:CJ.muted,padding:"1px 5px" }}>bientôt</span>}
      <div style={{ fontSize:22, fontWeight:900, color, marginBottom:2 }}>{bientot?"—":value}</div>
      <div style={{ fontSize:11, color:CJ.muted }}>{label}</div>
      {sub && !bientot && <div style={{ fontSize:10, color:CJ.muted, marginTop:1 }}>{sub}</div>}
    </div>
  );
  const SectionTitle = ({ children }) => (
    <h3 style={{ fontWeight:800, fontSize:14, color:CJ.accent, marginBottom:10, marginTop:18, letterSpacing:0.5 }}>{children}</h3>
  );

  const { titre:drixTitre, emoji:drixEmoji, color:drixColor } = getDrixTitreLocal(joueur.drix||1000);

  return (
    <div style={{ maxWidth:860, margin:"0 auto", padding:"16px 16px 40px" }}>
      {/* Header */}
      <button onClick={()=>setPage("mon-profil")} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",fontSize:14,marginBottom:16,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation" }}>← Retour</button>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["stats","📊 Mes stats"],["historique","📋 Historique des duels"]].map(([tab,label])=>(
          <button key={tab} onClick={()=>setActiveTab(tab)} style={{
            flex:1, padding:"12px 8px", borderRadius:12, border:`2px solid ${activeTab===tab?CJ.accent:CJ.border}`,
            background:activeTab===tab?CJ.accent+"22":"#111", color:activeTab===tab?CJ.accent:CJ.muted,
            fontWeight:700, fontSize:13, cursor:"pointer", touchAction:"manipulation"
          }}>{label}</button>
        ))}
      </div>

      {/* ── ONGLET STATS ─────────────────────────────────────────────────── */}
      {activeTab==="stats" && (
        <div>
          {/* Hero DRIX */}
          <div style={{ background:`linear-gradient(135deg,#1a0800,#1a1a2e)`,border:`2px solid ${drixColor}44`,borderRadius:16,padding:20,marginBottom:4,display:"flex",alignItems:"center",gap:16 }}>
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
          <SectionTitle>🎯 Performance</SectionTitle>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
            <StatCard label="Victoires"  value={stats?.victoires??0}  color={CJ.green}/>
            <StatCard label="Défaites"   value={stats?.defaites??0}   color={CJ.red}/>
            <StatCard label="Parties"    value={stats?.parties??0}    color={CJ.muted}/>
            <StatCard label="Win Rate"   value={winRate+"%"}          color={CJ.yellow}/>
            <StatCard label="Ratio V/D"  value={stats?.defaites>0?(stats.victoires/stats.defaites).toFixed(1):"∞"} color={CJ.accent}/>
            <StatCard label="Série actuelle" value={serieActuelle>0?(serieType==="win"?`${serieActuelle}🔥`:`${serieActuelle}💔`):"—"} color={serieType==="win"?CJ.green:CJ.red}/>
          </div>

          {/* Moyennes */}
          <SectionTitle>📊 Moyennes pts/volée</SectionTitle>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8 }}>
            <StatCard label="🌍 Générale"        value={moyenneGenerale?? "—"} color={CJ.blue} sub={`sur ${termines.length} match${termines.length>1?"s":""}`}/>
            <StatCard label="📅 Aujourd'hui"     value={moyenneJour??     "—"} color={CJ.blue} sub={nbJour>0?`${nbJour} match${nbJour>1?"s":""}`:null}/>
            <StatCard label="📆 Cette semaine"   value={moyenneSemaine??  "—"} color={CJ.blue} sub={nbSemaine>0?`${nbSemaine} match${nbSemaine>1?"s":""}`:null}/>
            <StatCard label="🗓️ Ce mois"         value={moyenneMois??     "—"} color={CJ.blue} sub={nbMois>0?`${nbMois} match${nbMois>1?"s":""}`:null}/>
            <StatCard label="🏆 Meilleure moy."  value="—" bientot/>
            <StatCard label="⚔️ Moy. en duel"   value="—" bientot/>
            <StatCard label="Moy. par mode"     value="—" bientot/>
          </div>

          {/* Scoring */}
          <SectionTitle>🎯 Scoring</SectionTitle>
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
          <SectionTitle>👑 Finishes</SectionTitle>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
            <StatCard label="Plus gros finish" value={hasScoring && plusGrosFinish>0 ? plusGrosFinish : "—"} color={CJ.green} bientot={!hasScoring}/>
            <StatCard label="Finishes 100+"    value="—" bientot/>
            <StatCard label="Taux checkout"    value="—" bientot/>
            <StatCard label="Finish 1 flèche"  value="—" bientot/>
            <StatCard label="Finish 2 flèches" value="—" bientot/>
            <StatCard label="Finish 3 flèches" value="—" bientot/>
          </div>

          {/* Duels */}
          <SectionTitle>⚔️ Duels</SectionTitle>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
            <StatCard label="Duels joués" value={termines.length} color={CJ.accent}/>
            <StatCard label="Rival principal" value={rival?rival[0]:"—"} sub={rival?`${rival[1]} match${rival[1]>1?"s":""}`+".":null} color={CJ.yellow}/>
            <StatCard label="Max DRIX gagné" value={maxGain?`+${maxGain}`:"—"} color={CJ.green}/>
            <StatCard label="Max DRIX perdu" value={maxPerte?`${maxPerte}`:"—"} color={CJ.red}/>
            <StatCard label="Meilleure série" value="—" bientot/>
            <StatCard label="Nemesis" value="—" bientot/>
          </div>

          {/* Activité */}
          <SectionTitle>🎮 Activité</SectionTitle>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
            <StatCard label="Bar" value={bar?.nom||"—"} sub={bar?.ville||null} color={CJ.accent}/>
            <StatCard label="Club" value={asso?.nom||"—"} color="#a78bfa"/>
            <StatCard label="Jours actifs" value="—" bientot/>
            <StatCard label="Heure favorite" value="—" bientot/>
            <StatCard label="Jour favori"   value="—" bientot/>
          </div>

          {/* Historique DRIX (mini) */}
          {drixMvts.length > 0 && (
            <>
              <SectionTitle>📈 Historique DRIX</SectionTitle>
              <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,overflow:"hidden" }}>
                {drixMvts.slice(0,8).map((m,i)=>(
                  <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:i<Math.min(drixMvts.length,8)-1?`1px solid ${CJ.border}`:"none" }}>
                    <div>
                      <div style={{ fontWeight:600,fontSize:13 }}>vs {m.adversaire_pseudo||"?"}</div>
                      <div style={{ fontSize:10,color:CJ.muted }}>{m.resultat==="victoire"?"✅ Victoire":"❌ Défaite"} · {new Date(m.date).toLocaleDateString("fr-FR")}</div>
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

          {/* Edit profil */}
          <SectionTitle>👤 Mes informations</SectionTitle>
          <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:14,padding:18,marginBottom:12 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <span style={{ fontWeight:700,fontSize:14 }}>Profil personnel</span>
              {!editMode && <button onClick={()=>setEditMode(true)} style={{ background:"none",border:`1px solid ${CJ.border}`,color:CJ.muted,cursor:"pointer",borderRadius:6,padding:"4px 12px",fontSize:12,touchAction:"manipulation" }}>✏️ Modifier</button>}
            </div>
            {!editMode ? (
              <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                {joueur.age && <BadgeJ color={CJ.muted}>🎂 {joueur.age} ans</BadgeJ>}
                {joueur.ville && <BadgeJ color={CJ.blue}>📍 {joueur.ville}</BadgeJ>}
                {joueur.style_jeu && <BadgeJ color={CJ.accent}>{STYLES.find(s=>s[0]===joueur.style_jeu)?.[1]||joueur.style_jeu}</BadgeJ>}
                {bar  ? <BadgeJ color={CJ.accent}>🍺 {bar.nom}</BadgeJ> : <BadgeJ color={CJ.muted}>Pas de bar affilié</BadgeJ>}
                {asso && <BadgeJ color="#7c3aed">🫂 {asso.nom}</BadgeJ>}
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
                  <div><label style={{ fontSize:11,color:CJ.muted,display:"block",marginBottom:4 }}>Âge</label>
                    <input value={editAge} onChange={e=>setEditAge(e.target.value)} type="number" placeholder="Ex: 28" style={{ width:"100%",background:"#111",border:`1px solid ${CJ.border}`,borderRadius:8,padding:"8px 10px",color:CJ.text,fontSize:13 }}/></div>
                  <div><label style={{ fontSize:11,color:CJ.muted,display:"block",marginBottom:4 }}>Ville</label>
                    <input value={editVille} onChange={e=>setEditVille(e.target.value)} placeholder="Ex: Bayonne" style={{ width:"100%",background:"#111",border:`1px solid ${CJ.border}`,borderRadius:8,padding:"8px 10px",color:CJ.text,fontSize:13 }}/></div>
                </div>
                <div><label style={{ fontSize:11,color:CJ.muted,display:"block",marginBottom:4 }}>Style de jeu</label>
                  <div style={{ display:"flex",gap:6 }}>
                    {STYLES.map(([v,l])=>(<button key={v} onClick={()=>setEditStyle(v)} style={{ flex:1,background:editStyle===v?CJ.accent+"33":"#111",border:`1px solid ${editStyle===v?CJ.accent:CJ.border}`,borderRadius:8,padding:"7px 4px",cursor:"pointer",fontSize:11,color:editStyle===v?CJ.accent:CJ.muted,fontWeight:editStyle===v?700:400,touchAction:"manipulation" }}>{l}</button>))}
                  </div>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <BtnJ onClick={sauvegarderProfil} disabled={savingEdit} style={{ fontSize:12,padding:"7px 16px" }}>{savingEdit?"…":"💾 Sauvegarder"}</BtnJ>
                  <BtnJ onClick={()=>setEditMode(false)} variant="dark" style={{ fontSize:12,padding:"7px 16px" }}>Annuler</BtnJ>
                </div>
              </div>
            )}
          </div>

          {/* Affiliation bar / asso */}
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:14,padding:18 }}>
              <h3 style={{ fontWeight:700,fontSize:14,marginBottom:12,color:CJ.accent }}>🍺 Bar affilié</h3>
              {bar && <p style={{ color:CJ.green,fontSize:12,marginBottom:10 }}>Actuellement : <strong>{bar.nom}</strong> — {bar.ville}</p>}
              <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:220,overflowY:"auto" }}>
                {bars.map(b=>(
                  <div key={b.slug} onClick={()=>choisirBar(b.slug)} style={{ background:joueur.bar_slug===b.slug?"#1a0800":"#111",border:`1px solid ${joueur.bar_slug===b.slug?CJ.accent:CJ.border}`,borderRadius:8,padding:"9px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center",touchAction:"manipulation" }}>
                    <span style={{ fontWeight:joueur.bar_slug===b.slug?700:400,fontSize:13 }}>{b.nom}</span>
                    <span style={{ color:CJ.muted,fontSize:11 }}>📍 {b.ville}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:14,padding:18 }}>
              <h3 style={{ fontWeight:700,fontSize:14,marginBottom:12,color:"#7c3aed" }}>🫂 Association affiliée</h3>
              {asso && <p style={{ color:CJ.green,fontSize:12,marginBottom:10 }}>Actuellement : <strong>{asso.nom}</strong></p>}
              <div style={{ display:"flex",flexDirection:"column",gap:6,maxHeight:180,overflowY:"auto" }}>
                {associations.map(a=>(
                  <div key={a.slug} onClick={()=>choisirAsso(a.slug)} style={{ background:joueur.asso_slug===a.slug?"#1a0f1a":"#111",border:`1px solid ${joueur.asso_slug===a.slug?"#7c3aed":CJ.border}`,borderRadius:8,padding:"9px 12px",cursor:"pointer",display:"flex",justifyContent:"space-between",touchAction:"manipulation" }}>
                    <span style={{ fontWeight:joueur.asso_slug===a.slug?700:400,fontSize:13 }}>{a.nom}</span>
                    <span style={{ color:CJ.muted,fontSize:11 }}>📍 {a.ville}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ONGLET HISTORIQUE ────────────────────────────────────────────── */}
      {activeTab==="historique" && (
        <div>
          <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:14,padding:18 }}>
            <h2 style={{ fontWeight:800,fontSize:16,marginBottom:14,color:CJ.text }}>📋 Historique des duels <span style={{ color:CJ.muted,fontWeight:400,fontSize:13 }}>({termines.length})</span></h2>
            {termines.length === 0
              ? <p style={{ color:CJ.muted,fontSize:13 }}>Aucun duel terminé pour l'instant.</p>
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
                    <div key={d.id} style={{ background:"#ffffff0a",border:`1px solid ${gagne?CJ.green+"33":CJ.red+"33"}`,borderRadius:10,padding:12,marginBottom:8 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
                        <div>
                          <span style={{ fontWeight:700,fontSize:14 }}>vs{" "}
                            <span onClick={()=>setPage("profil-joueur-"+advId)} style={{ color:CJ.accent,cursor:"pointer",textDecoration:"underline" }}>{adv}</span>
                          </span>
                          <div style={{ color:CJ.muted,fontSize:11,marginTop:2 }}>{d.mode} · {d.manches||1} manche{(d.manches||1)>1?"s":""} · {new Date(d.date).toLocaleDateString("fr-FR")}</div>
                        </div>
                        <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
                          <span style={{ fontWeight:800,fontSize:15 }}>{monM??'?'}–{sonM??'?'}</span>
                          {monMoy && <span style={{ fontSize:11,color:CJ.accent }}>Moy. {Math.round(monMoy)}</span>}
                          <BadgeJ color={gagne?CJ.green:CJ.red}>{gagne?"✅ Victoire":"❌ Défaite"}</BadgeJ>
                          {variation !== undefined && (
                            <span style={{ fontWeight:800,fontSize:12,color:variation>0?CJ.green:CJ.red,background:variation>0?"#14532d":"#7f1d1d",borderRadius:6,padding:"2px 8px" }}>
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
      )}
    </div>
  );
};

// ── PAGE AMIS (nouvelle page) ──────────────────────────────────────────────────
export const PageProfilAmis = ({ joueur, setPage }) => (
  <div style={{ maxWidth:860, margin:"0 auto", padding:"24px 20px" }}>
    <button onClick={()=>setPage("mon-profil")} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",fontSize:14,marginBottom:20,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation" }}>← Retour au profil</button>
    <h2 style={{ fontWeight:800,fontSize:22,marginBottom:20 }}>👥 Mes amis</h2>
    <AmiSection joueur={joueur} setPage={setPage}/>
  </div>
);

// ── PAGE BADGES (en construction) ─────────────────────────────────────────────
export const PageProfilBadges = ({ setPage }) => (
  <div style={{ maxWidth:500, margin:"0 auto", padding:"60px 20px", textAlign:"center" }}>
    <button onClick={()=>setPage("mon-profil")} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",fontSize:14,marginBottom:40,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation" }}>← Retour au profil</button>
    <div style={{ fontSize:80,marginBottom:24 }}>🏅</div>
    <h1 style={{ fontWeight:900,fontSize:28,marginBottom:10 }}>Badges</h1>
    <p style={{ color:CJ.muted,fontSize:15,marginBottom:32,lineHeight:1.7 }}>
      Débloque des badges en jouant,<br/>en gagnant des défis et en participant aux tournois.
    </p>
    <div style={{ background:"linear-gradient(135deg,#1a1a1a,#111)",border:`1px solid #f9731644`,borderRadius:20,padding:32,marginBottom:24 }}>
      <div style={{ fontSize:36,marginBottom:12 }}>🚧</div>
      <div style={{ fontWeight:900,fontSize:18,color:"#f97316",marginBottom:8 }}>En construction</div>
      <div style={{ color:CJ.muted,fontSize:13,lineHeight:1.6 }}>
        Les badges arrivent bientôt !<br/>Continue à jouer pour être parmi les premiers à en débloquer.
      </div>
    </div>
    <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,opacity:0.3 }}>
      {["🎯","🏆","⚔️","🔥","💎","👑"].map((e,i)=>(
        <div key={i} style={{ background:CJ.card,borderRadius:14,padding:20,textAlign:"center" }}>
          <div style={{ fontSize:32,marginBottom:6 }}>{e}</div>
          <div style={{ fontSize:11,color:CJ.muted }}>???</div>
        </div>
      ))}
    </div>
  </div>
);

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
            const {titre,emoji,color} = getDrixTitreLocal(drix);
            return (
              <div key={j.id} onClick={()=>setPage("profil-joueur-"+j.id)}
                style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:16,cursor:"pointer",transition:"border-color .15s" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=color} onMouseLeave={e=>e.currentTarget.style.borderColor=CJ.border}>
                <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:8 }}>
                  <div style={{ width:44,height:44,background:color+"22",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,border:`2px solid ${color}44`,flexShrink:0,overflow:"hidden" }}>
                    {j.photo ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span>{emoji}</span>}
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

  useEffect(() => {
    Promise.all([dbAmis.getAmis(joueur.id), dbAmis.getDemandesRecues(joueur.id)])
      .then(async ([a,d]) => {
        setAmis(a||[]); setDemandes(d||[]);
        // Charger les photos des amis
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

  return (
    <div>
      {demandes.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <h3 style={{ fontWeight:700,fontSize:15,marginBottom:12,color:CJ.yellow }}>👥 Demandes d'amis ({demandes.length})</h3>
          {demandes.map(d=>(
            <div key={d.id} style={{ background:CJ.card,border:`1px solid ${CJ.yellow}44`,borderRadius:10,padding:14,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
              <span style={{ fontWeight:600 }}>👤 {d.joueur_pseudo}</span>
              <div style={{ display:"flex",gap:6 }}>
                <BtnJ variant="success" onClick={()=>accepter(d)} style={{ fontSize:12,padding:"6px 12px" }}>✅ Accepter</BtnJ>
                <BtnJ variant="danger" onClick={()=>refuser(d)} style={{ fontSize:12,padding:"6px 12px" }}>❌ Refuser</BtnJ>
              </div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ fontWeight:700,fontSize:15,marginBottom:12,color:CJ.accent }}>👥 Mes amis ({amis.length})</h3>
      {amis.length === 0
        ? <p style={{ color:CJ.muted,fontSize:13 }}>Aucun ami pour l'instant. Va sur la fiche d'un joueur pour l'ajouter !</p>
        : amis.map(a => {
            const amiId = a.joueur_id === joueur.id ? a.ami_id : a.joueur_id;
            const amiPseudo = a.joueur_id === joueur.id ? a.ami_pseudo : a.joueur_pseudo;
            const profil = photosAmis[amiId];
            const { emoji, color } = getDrixTitreLocal(profil?.drix||1000);
            return (
              <div key={a.id} onClick={()=>setPage("profil-joueur-"+amiId)}
                style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:10,padding:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor=CJ.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=CJ.border}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:40,height:40,borderRadius:"50%",overflow:"hidden",flexShrink:0,border:`2px solid ${color}`,background:color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>
                    {profil?.photo
                      ? <img src={profil.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
                      : <span>{emoji}</span>
                    }
                  </div>
                  <span style={{ fontWeight:600 }}>{amiPseudo}</span>
                </div>
                <span style={{ color:CJ.accent,fontSize:12 }}>⚔️ Voir le profil →</span>
              </div>
            );
          })
      }
    </div>
  );
};

// ── FICHE JOUEUR PUBLIC ───────────────────────────────────────────────────────
export const FicheJoueur = ({ joueurId, joueur:moi, bars, associations, setPage, setBarSlug }) => {
  const [j, setJ] = useState(null);
  const [stats, setStats] = useState(null);
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [amiStatut, setAmiStatut] = useState(null);
  const [showHistorique, setShowHistorique] = useState(false);
  const [drixMvtMap, setDrixMvtMap] = useState({}); // { [duel_id]: variation }

  useEffect(() => {
    // Guard : ne pas lancer la requête si l'ID est invalide
    if (!joueurId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      dbJ.getJoueur(joueurId),
      dbJ.getStats(joueurId),
      dbJ.getDuels(joueurId),
      sbJ(`drix_mouvements?joueur_id=eq.${joueurId}&select=duel_id,variation`).catch(()=>[]),
    ])
      .then(([j,s,d,mvts]) => {
        setJ(j);
        setStats(s);
        setDuels((d||[]).filter(x=>x.statut==="termine"));
        const map = {};
        (mvts||[]).forEach(m => { if (m.duel_id) map[m.duel_id] = m.variation; });
        setDrixMvtMap(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
      })
      .catch(() => {});
  }, [moi?.id, joueurId]);

  const ajouterAmi = async () => {
    if (!moi || !j) return;
    await sbJ("amis", { method:"POST", body:JSON.stringify({ joueur_id:moi.id, ami_id:j.id, joueur_pseudo:moi.pseudo, ami_pseudo:j.pseudo, statut:"en_attente", date:Date.now() }) });
    setAmiStatut("en_attente");
  };

  if (loading) return <SpinnerJ/>;
  if (!j) return <div style={{ textAlign:"center",padding:60,color:CJ.muted }}>Joueur introuvable</div>;

  const bar = bars.find(b=>b.slug===j.bar_slug);
  const asso = associations.find(a=>a.slug===j.asso_slug);
  const winRate = stats && stats.parties>0 ? Math.round((stats.victoires/stats.parties)*100) : 0;
  const moyenneDuels = (() => {
    const scores = duels
      .map(d => parseFloat(d.challenger_id === joueurId ? d.score_challenger : d.score_defie))
      .filter(s => !isNaN(s) && s > 0);
    return scores.length > 0 ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : null;
  })();

  return (
    <div style={{ maxWidth:600, margin:"0 auto", padding:"36px 20px" }}>
      <button onClick={()=>setPage("joueurs")} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",marginBottom:18,fontSize:13 }}>← Retour</button>
      {(() => {
        const drix = j.drix||1000;
        const {titre,emoji,color} = getDrixTitreLocal(drix);
        return (
          <div style={{ background:"linear-gradient(135deg,#1a0800,#1a1a2e)",border:`1px solid ${color}44`,borderRadius:14,padding:28,marginBottom:20,textAlign:"center" }}>
            <div style={{ width:72,height:72,background:color+"33",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,border:`2px solid ${color}`,margin:"0 auto 12px" }}>
              {j.photo
                ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%" }}/>
                : <span>{emoji}</span>
              }
            </div>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:10,marginBottom:6,flexWrap:"wrap" }}>
              <h1 style={{ fontWeight:800,fontSize:24,margin:0 }}>{j.pseudo}</h1>
              {moi && moi.id!==j.id && (
                amiStatut===null
                  ? <button onClick={ajouterAmi} style={{ background:"#1a1a1a",border:`1px solid ${CJ.accent}`,color:CJ.accent,borderRadius:20,padding:"4px 12px",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap" }}>👥 Ajouter ami(e)</button>
                  : amiStatut==="en_attente"
                    ? <span style={{ background:"#78350f33",border:`1px solid ${CJ.yellow}44`,color:CJ.yellow,borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:600 }}>⏳ Demande envoyée</span>
                    : <span style={{ background:"#14532d33",border:`1px solid ${CJ.green}44`,color:CJ.green,borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:600 }}>✅ Ami(e)</span>
              )}
            </div>
            <div style={{ fontWeight:900,fontSize:28,color,marginBottom:4 }}>{drix} <span style={{ fontSize:16 }}>DRIX</span></div>
            <div style={{ color,fontSize:13,fontWeight:600,marginBottom:8 }}>{emoji} {titre}</div>
            {j.bull_balance != null && (
              <div style={{ display:"inline-flex",alignItems:"center",gap:5,background:"#1a0f00",border:"1px solid #f9731644",borderRadius:8,padding:"3px 12px",marginBottom:12 }}>
                <span style={{ fontSize:14 }}>🪙</span>
                <span style={{ fontWeight:900,fontSize:14,color:"#f97316" }}>{j.bull_balance}</span>
                <span style={{ fontSize:10,color:"#a16207",fontWeight:700 }}>BULLS</span>
              </div>
            )}
            <div style={{ display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap" }}>
              {j.age && <BadgeJ color={CJ.muted}>🎂 {j.age} ans</BadgeJ>}
              {j.ville && <BadgeJ color={CJ.blue}>📍 {j.ville}</BadgeJ>}
              {bar && <BadgeJ color={CJ.accent}>🍺 {bar.nom}</BadgeJ>}
              {asso && <BadgeJ color="#7c3aed">🫂 {asso.nom}</BadgeJ>}
            </div>
          </div>
        );
      })()}
      {stats && (
        <div style={{ display:"grid",gridTemplateColumns:`repeat(${moyenneDuels?5:4},1fr)`,gap:10,marginBottom:20 }}>
          {[[stats.victoires,"Victoires",CJ.green],[stats.defaites,"Défaites",CJ.red],[stats.parties,"Parties",CJ.muted],[winRate+"%","Win Rate",CJ.yellow],...(moyenneDuels?[[moyenneDuels,"Moy. pts",CJ.blue]]:[])].map(([v,l,c])=>(
            <div key={l} style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:10,padding:14,textAlign:"center" }}>
              <div style={{ fontSize:20,fontWeight:800,color:c }}>{v}</div>
              <div style={{ fontSize:11,color:CJ.muted }}>{l}</div>
            </div>
          ))}
        </div>
      )}
      {bar && (
        <div onClick={()=>{setBarSlug(bar.slug);setPage("bar");}} style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:16,cursor:"pointer",marginBottom:12 }}>
          <h3 style={{ fontWeight:700,fontSize:14,color:CJ.accent,marginBottom:4 }}>🍺 Bar affilié</h3>
          <p style={{ fontWeight:600 }}>{bar.nom}</p>
          <p style={{ color:CJ.muted,fontSize:12 }}>📍 {bar.ville} · Voir la fiche →</p>
        </div>
      )}
      {/* ── BOUTONS ACTIONS ── */}
      {moi && moi.id!==j.id && (
        <div style={{ display:"flex", gap:10, marginBottom:12 }}>
          <button onPointerDown={()=>setPage("messages-"+j.id+"-"+encodeURIComponent(j.pseudo))}
            style={{ flex:1, background:"#1e3a5f", border:`1px solid ${CJ.blue}44`, color:CJ.blue, borderRadius:10, padding:"12px 0", cursor:"pointer", fontWeight:700, fontSize:14, touchAction:"manipulation", WebkitTapHighlightColor:"transparent" }}>
            💬 Message
          </button>
          <button onPointerDown={()=>setShowHistorique(v=>!v)}
            style={{ flex:1, background:showHistorique?"#1e3a5f":"#1a1a1a", border:`1px solid ${showHistorique?CJ.blue:CJ.border}`, color:showHistorique?CJ.blue:CJ.text, borderRadius:10, padding:"12px 0", cursor:"pointer", fontWeight:700, fontSize:14, touchAction:"manipulation", WebkitTapHighlightColor:"transparent" }}>
            📋 Historique{duels.length>0?` (${duels.length})`:""}
          </button>
        </div>
      )}
      {(!moi || moi.id===j.id) && (
        <button onPointerDown={()=>setShowHistorique(v=>!v)}
          style={{ width:"100%", background:showHistorique?"#1e3a5f":"#1a1a1a", border:`1px solid ${showHistorique?CJ.blue:CJ.border}`, color:showHistorique?CJ.blue:CJ.text, borderRadius:10, padding:"12px 0", cursor:"pointer", fontWeight:700, fontSize:14, marginBottom:12, touchAction:"manipulation" }}>
          📋 Historique{duels.length>0?` (${duels.length})`:""}
        </button>
      )}

      {/* ── HISTORIQUE DES PARTIES ── */}
      {showHistorique && (
        <div style={{ background:CJ.card, border:`1px solid ${CJ.blue}44`, borderRadius:12, padding:20, marginBottom:16 }}>
          <h3 style={{ fontWeight:700, fontSize:15, marginBottom:duels.length===0?0:14, color:CJ.blue }}>
            📋 Historique des parties
            {duels.length>0 && <span style={{ color:CJ.muted, fontSize:12, fontWeight:400, marginLeft:8 }}>{duels.length} partie{duels.length>1?"s":""}</span>}
          </h3>
          {duels.length===0
            ? <p style={{ color:CJ.muted, fontSize:13, marginTop:10 }}>Aucune partie jouée pour l'instant.</p>
            : duels.map(d => {
                const isChallenger = d.challenger_id === joueurId;
                const adversaire = isChallenger ? d.defie_pseudo : d.challenger_pseudo;
                const adversaireId = isChallenger ? d.defie_id : d.challenger_id;
                const {sc,sd} = fixManches(d);
                const monManche = isChallenger ? sc : sd;
                const sonManche = isChallenger ? sd : sc;
                const monMoy = isChallenger ? d.score_challenger : d.score_defie;
                const sonMoy = isChallenger ? d.score_defie : d.score_challenger;
                const gagne = d.gagnant_id === joueurId;
                return (
                  <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${CJ.border}`, flexWrap:"wrap", gap:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:18 }}>{gagne?"🏆":"😔"}</span>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14 }}>
                          vs{" "}
                          <span onClick={()=>setPage("profil-joueur-"+adversaireId)} style={{ color:CJ.accent, cursor:"pointer", textDecoration:"underline" }}>
                            {adversaire}
                          </span>
                        </div>
                        <div style={{ color:CJ.muted, fontSize:11 }}>
                          {d.mode} · {d.manches||1} manche{(d.manches||1)>1?"s":""} · {new Date(d.date).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontWeight:800, fontSize:15 }}>{monManche ?? "?"} – {sonManche ?? "?"}</div>
                        {monMoy && <div style={{ fontSize:11, color:CJ.accent }}>{j.pseudo} : {monMoy} pts</div>}
                        {sonMoy && <div style={{ fontSize:11, color:CJ.muted }}>{adversaire} : {sonMoy} pts</div>}
                      </div>
                      <BadgeJ color={gagne?CJ.green:CJ.red}>{gagne?"Victoire ✅":"Défaite ❌"}</BadgeJ>
                      {drixMvtMap[d.id] !== undefined && (
                        <span style={{ fontWeight:800, fontSize:13, color:drixMvtMap[d.id]>0?"#22c55e":"#ef4444", background:drixMvtMap[d.id]>0?"#14532d":"#7f1d1d", borderRadius:6, padding:"2px 8px" }}>
                          {drixMvtMap[d.id]>0?"+":""}{drixMvtMap[d.id]} DRIX
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
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
export const getDrixTitre = (drix) => {
  if (drix < 900)  return { titre:"Novice",    emoji:"🎯",  color:"#94a3b8" };
  if (drix < 1100) return { titre:"Amateur",   emoji:"🎯🎯", color:"#60a5fa" };
  if (drix < 1300) return { titre:"Confirmé",  emoji:"⭐",  color:"#22c55e" };
  if (drix < 1500) return { titre:"Expert",    emoji:"⭐⭐", color:"#f59e0b" };
  if (drix < 1700) return { titre:"Elite",     emoji:"💎",  color:"#a78bfa" };
  if (drix < 1900) return { titre:"Master",    emoji:"👑",  color:"#f97316" };
  return              { titre:"Légende",   emoji:"🏆",  color:"#ef4444" };
};

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

  // Gagnant reçoit K × P(adversaire gagnait) — perdant perd K × P(lui-même gagnait)
  // Formule zéro-somme : gains + pertes = 0 à chaque match
  const variationA = aGagne
    ? +Math.round(K * EB) + bonusA   // A gagne : +K×EB (gagne selon proba adversaire)
    : -Math.round(K * EA) + bonusA;  // A perd  : −K×EA (perd selon sa propre proba)
  const variationB = aGagne
    ? -Math.round(K * EB) + bonusB   // B perd  : −K×EB (perd selon sa propre proba)
    : +Math.round(K * EA) + bonusB;  // B gagne : +K×EA (gagne selon proba adversaire)

  console.log("🎯 DRIX:", {
    drixA, drixB, aGagne, K,
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

export const appliquerDrixDuel = async (duel) => {
  try {
    const [jC, jD] = await Promise.all([dbJ.getJoueur(duel.challenger_id), dbJ.getJoueur(duel.defie_id)]);
    if (!jC || !jD) return;
    const drixC = jC.drix || 1000;
    const drixD = jD.drix || 1000;
    const challengerGagne = duel.gagnant_id === duel.challenger_id;
    const manches = Math.max(1, duel.manches || 1);
    const { variationA, variationB } = calculerDrix(drixC, drixD, challengerGagne, { K: 32 * manches });
    const newDrixC = Math.max(100, drixC + variationA);
    const newDrixD = Math.max(100, drixD + variationB);
    await Promise.all([
      dbDrix.updateDrix(jC.id, newDrixC),
      dbDrix.updateDrix(jD.id, newDrixD),
      dbDrix.addMouvement({ joueur_id:jC.id, joueur_pseudo:jC.pseudo, adversaire_pseudo:jD.pseudo, variation:variationA, drix_avant:drixC, drix_apres:newDrixC, resultat:challengerGagne?"victoire":"defaite", duel_id:duel.id, date:Date.now() }),
      dbDrix.addMouvement({ joueur_id:jD.id, joueur_pseudo:jD.pseudo, adversaire_pseudo:jC.pseudo, variation:variationB, drix_avant:drixD, drix_apres:newDrixD, resultat:challengerGagne?"defaite":"victoire", duel_id:duel.id, date:Date.now() }),
    ]);
  } catch(e) { console.error("Erreur DRIX:", e); }
};

// Finalise un duel : DRIX + stats en un seul appel (utilisé par AppJeux)
export const finaliserDuel = async (duel) => {
  await appliquerDrixDuel(duel);
  const gagnantId = duel.gagnant_id;
  const [sC, sD] = await Promise.all([dbJ.getStats(duel.challenger_id), dbJ.getStats(duel.defie_id)]);
  await Promise.all([
    sC && dbJ.updateStats(sC.id, { parties:sC.parties+1, victoires:gagnantId===duel.challenger_id?sC.victoires+1:sC.victoires, defaites:gagnantId!==duel.challenger_id?sC.defaites+1:sC.defaites }),
    sD && dbJ.updateStats(sD.id, { parties:sD.parties+1, victoires:gagnantId===duel.defie_id?sD.victoires+1:sD.victoires, defaites:gagnantId!==duel.defie_id?sD.defaites+1:sD.defaites }),
  ]);
};

// ── PAGE CLASSEMENT DRIX ──────────────────────────────────────────────────────
export const PageDrix = ({ setPage, bars, associations }) => {
  const [classement, setClassement] = useState([]);
  const [hallOfFame, setHallOfFame] = useState([]);
  const [tab, setTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [barFilter, setBarFilter] = useState("");
  const [assoFilter, setAssoFilter] = useState("");

  useEffect(() => {
    Promise.all([dbDrix.getClassement(), dbDrix.getHallOfFame()])
      .then(([c, h]) => { setClassement(c||[]); setHallOfFame(h||[]); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const classementFiltre = useMemo(() => {
    if (tab === "bar" && barFilter) return classement.filter(j => j.bar_slug === barFilter);
    if (tab === "asso" && assoFilter) return classement.filter(j => j.asso_slug === assoFilter);
    return classement;
  }, [classement, tab, barFilter, assoFilter]);

  const saisonActuelle = new Date().getFullYear();

  const getMedaille = (rang) => {
    if (rang === 1) return "🥇";
    if (rang === 2) return "🥈";
    if (rang === 3) return "🥉";
    return `#${rang}`;
  };

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"36px 20px" }}>
      <div style={{ background:"linear-gradient(135deg,#1a0800,#1a0030)", border:`1px solid #a78bfa44`, borderRadius:14, padding:24, marginBottom:24, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:8 }}>💎</div>
        <h1 style={{ fontWeight:900, fontSize:28, marginBottom:4 }}>Classement <span style={{ color:"#a78bfa" }}>DRIX</span></h1>
        <p style={{ color:CJ.muted, fontSize:14 }}>Saison {saisonActuelle} · Système ELO · Remise à zéro le 1er janvier</p>
        <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:16, flexWrap:"wrap" }}>
          {[["< 900","Novice","#94a3b8"],["900–1099","Amateur","#60a5fa"],["1100–1299","Confirmé","#22c55e"],["1300–1499","Expert","#f59e0b"],["1500–1699","Elite","#a78bfa"],["1700–1899","Master","#f97316"],["1900+","Légende","#ef4444"]].map(([r,t,c])=>(
            <div key={t} style={{ textAlign:"center" }}>
              <div style={{ fontSize:11, color:c, fontWeight:700 }}>{t}</div>
              <div style={{ fontSize:10, color:CJ.muted }}>{r}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
        {[["general","🌍 Général"],["bar","🍺 Par bar"],["asso","🫂 Par asso"],["halloffame","🏆 Hall of Fame"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ background:tab===t?CJ.accent+"22":"transparent",color:tab===t?CJ.accent:CJ.muted,border:`1px solid ${tab===t?CJ.accent:CJ.border}`,cursor:"pointer",padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:500 }}>{l}</button>
        ))}
      </div>

      {tab==="bar" && (
        <select value={barFilter} onChange={e=>setBarFilter(e.target.value)} style={{ width:"100%",background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:8,padding:"10px 14px",color:CJ.text,fontSize:14,marginBottom:16 }}>
          <option value="">-- Choisir un bar --</option>
          {bars.map(b=><option key={b.slug} value={b.slug}>{b.nom} — {b.ville}</option>)}
        </select>
      )}
      {tab==="asso" && (
        <select value={assoFilter} onChange={e=>setAssoFilter(e.target.value)} style={{ width:"100%",background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:8,padding:"10px 14px",color:CJ.text,fontSize:14,marginBottom:16 }}>
          <option value="">-- Choisir une association --</option>
          {associations.map(a=><option key={a.slug} value={a.slug}>{a.nom}</option>)}
        </select>
      )}

      {tab==="halloffame" && (
        <div>
          <h3 style={{ fontWeight:700, fontSize:16, marginBottom:14, color:CJ.yellow }}>🏆 Hall of Fame — Meilleurs joueurs par saison</h3>
          {hallOfFame.length===0
            ? <p style={{ color:CJ.muted, fontSize:13 }}>Aucune saison archivée pour l'instant.</p>
            : (() => {
                const saisons = [...new Set(hallOfFame.map(h=>h.saison))].sort((a,b)=>b-a);
                return saisons.map(s => (
                  <div key={s} style={{ marginBottom:24 }}>
                    <h4 style={{ fontWeight:700, fontSize:15, color:CJ.yellow, marginBottom:10 }}>Saison {s}</h4>
                    {hallOfFame.filter(h=>h.saison===s).slice(0,3).map((h,i)=>(
                      <div key={h.id} style={{ background:CJ.card,border:`1px solid ${i===0?CJ.yellow:CJ.border}`,borderRadius:10,padding:14,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                          <span style={{ fontSize:20 }}>{getMedaille(h.classement)}</span>
                          <span style={{ fontWeight:700 }}>{h.joueur_pseudo}</span>
                        </div>
                        <BadgeJ color={CJ.yellow}>{h.score_final} DRIX</BadgeJ>
                      </div>
                    ))}
                  </div>
                ));
              })()
          }
        </div>
      )}

      {tab!=="halloffame" && (
        loading ? <SpinnerJ/> : classementFiltre.length===0
          ? <p style={{ color:CJ.muted, fontSize:13, textAlign:"center", padding:40 }}>Aucun joueur trouvé.</p>
          : classementFiltre.map((j, i) => {
              const { titre, emoji, color } = getDrixTitreLocal(j.drix || 1000);
              const rang = i + 1;
              return (
                <div key={j.id} onClick={()=>setPage("profil-joueur-"+j.id)}
                  style={{ background:rang<=3?`${color}11`:CJ.card, border:`1px solid ${rang===1?color:rang<=3?color+"44":CJ.border}`, borderRadius:12, padding:"14px 18px", marginBottom:10, cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center", transition:"border-color .15s" }}
                  onMouseEnter={e=>e.currentTarget.style.borderColor=color} onMouseLeave={e=>e.currentTarget.style.borderColor=rang===1?color:rang<=3?color+"44":CJ.border}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:rang<=3?22:16, fontWeight:900, color:rang<=3?color:CJ.muted, minWidth:28, textAlign:"center" }}>{getMedaille(rang)}</span>
                    <div style={{ width:36,height:36,borderRadius:"50%",background:color+"22",border:`2px solid ${color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,overflow:"hidden" }}>
                      {j.photo ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span>{emoji}</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15 }}>{j.pseudo}</div>
                      <div style={{ fontSize:12, color }}>{emoji} {titre}</div>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontWeight:900, fontSize:20, color }}>{j.drix || 1000}</div>
                    <div style={{ fontSize:11, color:CJ.muted }}>DRIX</div>
                  </div>
                </div>
              );
            })
      )}
    </div>
  );
};

// ── BADGE DRIX ────────────────────────────────────────────────────────────────
export const DrixBadge = ({ drix=1000, size="normal" }) => {
  const { titre, emoji, color } = getDrixTitreLocal(drix);
  const big = size === "big";
  return (
    <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:color+"22", border:`1px solid ${color}44`, borderRadius:20, padding:big?"8px 16px":"4px 12px" }}>
      <span style={{ fontSize:big?18:13 }}>{emoji}</span>
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