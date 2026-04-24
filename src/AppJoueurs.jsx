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

export const hashPwd = async (pwd) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pwd));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
};

export const todayStr = () => new Date().toISOString().slice(0, 10);

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
  getPresences: (bar_slug) => sbJ(`presences?bar_slug=eq.${encodeURIComponent(bar_slug)}&date_jour=eq.${todayStr()}&select=*`),
  addPresence: (d) => sbJ("presences", { method: "POST", body: JSON.stringify(d) }),
  deletePresence: (id) => sbJ(`presences?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" }),
  getMyPresence: (joueur_id, bar_slug) => sbJ(`presences?joueur_id=eq.${joueur_id}&bar_slug=eq.${encodeURIComponent(bar_slug)}&date_jour=eq.${todayStr()}&select=*`).then(r => r?.[0]),
  getBarsActifs: () => sbJ(`presences?date_jour=eq.${todayStr()}&select=bar_slug`),
};

// ── Couleurs (dupliquées pour autonomie du fichier) ───────────────────────────
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
  return <button onClick={disabled?undefined:onClick} style={{ cursor:disabled?"not-allowed":"pointer",borderRadius:8,fontWeight:600,fontSize:14,padding:"10px 20px",transition:"all .15s",opacity:disabled?.5:1,...variants[variant],...style }}>{children}</button>;
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

// ── CONNEXION / INSCRIPTION ───────────────────────────────────────────────────
export const Connexion = ({ onLogin, setPage }) => {
  const [mode, setMode] = useState("login");
  const [pseudo, setPseudo] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={{ maxWidth:400, margin:"60px auto", padding:"0 20px" }}>
      <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:14, padding:28 }}>
        <div style={{ fontSize:40, textAlign:"center", marginBottom:16 }}>🎯</div>
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
        </div>
      </div>
    </div>
  );
};

// ── MON PROFIL ────────────────────────────────────────────────────────────────
export const MonProfil = ({ joueur, setJoueur, bars, associations, setPage, setBarSlug }) => {
  const [stats, setStats] = useState(null);
  const [duels, setDuels] = useState([]);
  const [defis, setDefis] = useState([]);
  const [joueurs, setJoueurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("profil");
  const [defierPseudo, setDefierPseudo] = useState("");
  const [defierMode, setDefierMode] = useState("501");
  const [defierErr, setDefierErr] = useState("");
  const [defierOk, setDefierOk] = useState(false);

  const bar = bars.find(b => b.slug === joueur.bar_slug);
  const asso = associations.find(a => a.slug === joueur.asso_slug);

  useEffect(() => {
    Promise.all([
      dbJ.getStats(joueur.id),
      dbJ.getDuels(joueur.id),
      dbJ.getDuelsEnAttente(joueur.id),
      dbJ.getJoueurs(),
    ]).then(([s,d,def,j]) => {
      setStats(s); setDuels(d||[]); setDefis(def||[]); setJoueurs(j||[]); setLoading(false);
    }).catch(() => setLoading(false));
  }, [joueur.id]);

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

  const envoyerDefi = async () => {
    setDefierErr(""); setDefierOk(false);
    if (!defierPseudo.trim()) return;
    if (defierPseudo.toLowerCase() === joueur.pseudo.toLowerCase()) { setDefierErr("Vous ne pouvez pas vous défier vous-même"); return; }
    const cible = joueurs.find(j => j.pseudo.toLowerCase() === defierPseudo.toLowerCase());
    if (!cible) { setDefierErr("Joueur introuvable"); return; }
    await dbJ.addDuel({ challenger_id:joueur.id, challenger_pseudo:joueur.pseudo, defie_id:cible.id, defie_pseudo:cible.pseudo, statut:"en_attente", mode:defierMode, date:Date.now() });
    setDefierOk(true); setDefierPseudo("");
    const d = await dbJ.getDuels(joueur.id);
    setDuels(d||[]);
  };

  const accepterDefi = async (duel) => {
    await dbJ.updateDuel(duel.id, { statut:"accepte" });
    setDefis(x => x.filter(d => d.id !== duel.id));
    const d = await dbJ.getDuels(joueur.id);
    setDuels(d||[]);
  };

  const refuserDefi = async (duel) => {
    await dbJ.updateDuel(duel.id, { statut:"refuse" });
    setDefis(x => x.filter(d => d.id !== duel.id));
  };

  const validerScore = async (duel, score) => {
    const isChallenger = duel.challenger_id === joueur.id;
    const patch = isChallenger ? { score_challenger:score, valide_challenger:true } : { score_defie:score, valide_defie:true };
    const autreValide = isChallenger ? duel.valide_defie : duel.valide_challenger;
    if (autreValide) {
      const scoreC = isChallenger ? score : duel.score_challenger;
      const scoreD = isChallenger ? duel.score_defie : score;
      const gagnantId = parseInt(scoreC) >= parseInt(scoreD) ? duel.challenger_id : duel.defie_id;
      await dbJ.updateDuel(duel.id, { ...patch, statut:"termine", gagnant_id:gagnantId });
      const [sC, sD] = await Promise.all([dbJ.getStats(duel.challenger_id), dbJ.getStats(duel.defie_id)]);
      if (sC) await dbJ.updateStats(sC.id, { parties:sC.parties+1, victoires:gagnantId===duel.challenger_id?sC.victoires+1:sC.victoires, defaites:gagnantId!==duel.challenger_id?sC.defaites+1:sC.defaites });
      if (sD) await dbJ.updateStats(sD.id, { parties:sD.parties+1, victoires:gagnantId===duel.defie_id?sD.victoires+1:sD.victoires, defaites:gagnantId!==duel.defie_id?sD.defaites+1:sD.defaites });
    } else {
      await dbJ.updateDuel(duel.id, patch);
    }
    const d = await dbJ.getDuels(joueur.id);
    setDuels(d||[]);
  };

  if (loading) return <SpinnerJ/>;

  const winRate = stats && stats.parties > 0 ? Math.round((stats.victoires / stats.parties) * 100) : 0;

  return (
    <div style={{ maxWidth:860, margin:"0 auto", padding:"36px 20px" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1a0800,#1a1a2e)", border:`1px solid ${CJ.border}`, borderRadius:14, padding:24, marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div style={{ width:64,height:64,background:CJ.accent+"33",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,border:`2px solid ${CJ.accent}` }}>🎯</div>
          <div style={{ flex:1 }}>
            <h1 style={{ fontWeight:800, fontSize:24, marginBottom:6 }}>{joueur.pseudo}</h1>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {bar ? <BadgeJ color={CJ.accent}>🍺 {bar.nom}</BadgeJ> : <BadgeJ color={CJ.muted}>Pas de bar affilié</BadgeJ>}
              {asso && <BadgeJ color="#7c3aed">🫂 {asso.nom}</BadgeJ>}
            </div>
          </div>
          {stats && (
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              {[[stats.victoires,"V",CJ.green],[stats.defaites,"D",CJ.red],[stats.parties,"Parties",CJ.muted],[winRate+"%","Win",CJ.yellow]].map(([v,l,c])=>(
                <div key={l} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:20,fontWeight:800,color:c }}>{v}</div>
                  <div style={{ fontSize:11,color:CJ.muted }}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:6, marginBottom:18, flexWrap:"wrap" }}>
        {[["profil","👤 Profil"],["defis",`⚔️ Défis${defis.length>0?" ("+defis.length+")":""}`],["historique","📋 Historique"],["affiliation","🍺 Affiliation"]].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{ background:tab===t?CJ.accent+"22":"transparent",color:tab===t?CJ.accent:CJ.muted,border:`1px solid ${tab===t?CJ.accent:CJ.border}`,cursor:"pointer",padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:500 }}>{l}</button>
        ))}
      </div>

      {/* Profil */}
      {tab==="profil" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:12, padding:20 }}>
            <h3 style={{ fontWeight:700, fontSize:15, marginBottom:14, color:CJ.accent }}>⚔️ Défier un joueur</h3>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
              <div style={{ flex:1, minWidth:150 }}>
                <label style={{ fontSize:12,color:CJ.muted,display:"block",marginBottom:6 }}>Pseudo du joueur</label>
                <input value={defierPseudo} onChange={e=>setDefierPseudo(e.target.value)} placeholder="Pseudo…"
                  style={{ width:"100%",background:"#111",border:`1px solid ${CJ.border}`,borderRadius:8,padding:"9px 12px",color:CJ.text,fontSize:13 }}
                  list="joueurs-list"/>
                <datalist id="joueurs-list">{joueurs.filter(j=>j.id!==joueur.id).map(j=><option key={j.id} value={j.pseudo}/>)}</datalist>
              </div>
              <div>
                <label style={{ fontSize:12,color:CJ.muted,display:"block",marginBottom:6 }}>Mode</label>
                <select value={defierMode} onChange={e=>setDefierMode(e.target.value)} style={{ background:"#111",border:`1px solid ${CJ.border}`,borderRadius:8,padding:"9px 12px",color:CJ.text,fontSize:13 }}>
                  <option value="501">501</option><option value="301">301</option>
                </select>
              </div>
              <BtnJ onClick={envoyerDefi} style={{ fontSize:13,padding:"9px 18px" }}>⚔️ Défier</BtnJ>
            </div>
            {defierErr && <p style={{ color:CJ.red,fontSize:12,marginTop:8 }}>⚠️ {defierErr}</p>}
            {defierOk && <p style={{ color:CJ.green,fontSize:12,marginTop:8 }}>✅ Défi envoyé !</p>}
          </div>
          <div style={{ background:CJ.card, border:`1px solid ${CJ.border}`, borderRadius:12, padding:20 }}>
            <h3 style={{ fontWeight:700, fontSize:15, marginBottom:12, color:CJ.accent }}>🎮 Scoreur libre</h3>
            <p style={{ color:CJ.muted, fontSize:13, marginBottom:12 }}>Lancez une partie sans compte adverse.</p>
            <BtnJ onClick={()=>setPage("scoreur")} variant="ghost" style={{ fontSize:13 }}>🎯 Ouvrir le scoreur</BtnJ>
          </div>
        </div>
      )}

      {/* Défis */}
      {tab==="defis" && (
        <div>
          <h3 style={{ fontWeight:700,fontSize:16,marginBottom:14 }}>⚔️ Défis reçus</h3>
          {defis.length===0
            ? <p style={{ color:CJ.muted,fontSize:13,marginBottom:24 }}>Aucun défi en attente.</p>
            : defis.map(d=>(
              <div key={d.id} style={{ background:CJ.card,border:`1px solid ${CJ.yellow}44`,borderRadius:12,padding:16,marginBottom:10 }}>
                <p style={{ fontWeight:700,marginBottom:6 }}>⚔️ <strong>{d.challenger_pseudo}</strong> vous défie en <BadgeJ color={CJ.accent}>{d.mode}</BadgeJ></p>
                <p style={{ color:CJ.muted,fontSize:12,marginBottom:10 }}>{new Date(d.date).toLocaleDateString("fr-FR")}</p>
                <div style={{ display:"flex",gap:8 }}>
                  <BtnJ variant="success" onClick={()=>accepterDefi(d)} style={{ fontSize:12,padding:"7px 14px" }}>✅ Accepter</BtnJ>
                  <BtnJ variant="danger" onClick={()=>refuserDefi(d)} style={{ fontSize:12,padding:"7px 14px" }}>❌ Refuser</BtnJ>
                </div>
              </div>
            ))
          }

          <h3 style={{ fontWeight:700,fontSize:16,marginBottom:14,marginTop:8 }}>📤 Défis envoyés</h3>
          {duels.filter(d=>d.challenger_id===joueur.id&&d.statut==="en_attente").length===0
            ? <p style={{ color:CJ.muted,fontSize:13,marginBottom:24 }}>Aucun défi envoyé en attente.</p>
            : duels.filter(d=>d.challenger_id===joueur.id&&d.statut==="en_attente").map(d=>(
              <div key={d.id} style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:16,marginBottom:10 }}>
                <p style={{ fontWeight:600 }}>⚔️ Défi envoyé à <strong>{d.defie_pseudo}</strong> — {d.mode}</p>
                <p style={{ color:CJ.muted,fontSize:12 }}>En attente de réponse…</p>
              </div>
            ))
          }

          {duels.filter(d=>d.statut==="accepte").length>0 && (
            <>
              <h3 style={{ fontWeight:700,fontSize:16,marginBottom:14,color:CJ.green }}>🎮 Duels en cours</h3>
              {duels.filter(d=>d.statut==="accepte").map(d=>{
                const isChallenger = d.challenger_id===joueur.id;
                const monScore = isChallenger ? d.score_challenger : d.score_defie;
                const adversaire = isChallenger ? d.defie_pseudo : d.challenger_pseudo;
                return (
                  <DuelEnCours key={d.id} duel={d} isChallenger={isChallenger} monScore={monScore} adversaire={adversaire} onValider={(score)=>validerScore(d,score)}/>
                );
              })}
            </>
          )}
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
              const monScore = isChallenger ? d.score_challenger : d.score_defie;
              const sonScore = isChallenger ? d.score_defie : d.score_challenger;
              const gagne = d.gagnant_id===joueur.id;
              return (
                <div key={d.id} style={{ background:CJ.card,border:`1px solid ${gagne?CJ.green+"44":CJ.red+"44"}`,borderRadius:10,padding:14,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8 }}>
                  <div>
                    <span style={{ fontWeight:600 }}>vs {adversaire}</span>
                    <span style={{ color:CJ.muted,fontSize:12,marginLeft:8 }}>{d.mode} · {new Date(d.date).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <span style={{ fontWeight:700,fontSize:14 }}>{monScore} – {sonScore}</span>
                    <BadgeJ color={gagne?CJ.green:CJ.red}>{gagne?"Victoire ✅":"Défaite ❌"}</BadgeJ>
                  </div>
                </div>
              );
            })
          }
        </div>
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

// Sous-composant pour éviter les hooks dans .map()
const DuelEnCours = ({ duel, isChallenger, monScore, adversaire, onValider }) => {
  const [scoreInput, setScoreInput] = useState(monScore||"");
  return (
    <div style={{ background:CJ.card,border:`1px solid ${CJ.green}44`,borderRadius:12,padding:16,marginBottom:10 }}>
      <p style={{ fontWeight:700,marginBottom:8 }}>⚔️ vs <strong>{adversaire}</strong> — {duel.mode}</p>
      {monScore
        ? <p style={{ color:CJ.green,fontSize:13 }}>✅ Score soumis : {monScore} — en attente de l'adversaire</p>
        : (
          <div style={{ display:"flex",gap:10,alignItems:"flex-end",flexWrap:"wrap" }}>
            <div>
              <label style={{ fontSize:12,color:CJ.muted,display:"block",marginBottom:4 }}>Legs gagnés</label>
              <input value={scoreInput} onChange={e=>setScoreInput(e.target.value)} placeholder="ex: 3"
                style={{ background:"#111",border:`1px solid ${CJ.border}`,borderRadius:8,padding:"8px 12px",color:CJ.text,fontSize:13,width:100 }}/>
            </div>
            <BtnJ onClick={()=>onValider(scoreInput)} style={{ fontSize:12,padding:"8px 16px" }} disabled={!scoreInput}>Valider</BtnJ>
          </div>
        )
      }
    </div>
  );
};

// ── PAGE JOUEURS (liste publique) ─────────────────────────────────────────────
export const PageJoueurs = ({ joueur, setPage, setJoueurId }) => {
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
          {filtered.map(j=>(
            <div key={j.id} onClick={()=>{setJoueurId(j.id);setPage("profil-joueur");}}
              style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:16,cursor:"pointer",transition:"border-color .15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor=CJ.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=CJ.border}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:8 }}>
                <div style={{ width:40,height:40,background:CJ.accent+"22",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,border:`1px solid ${CJ.accent}44` }}>🎯</div>
                <div>
                  <div style={{ fontWeight:700,fontSize:14 }}>{j.pseudo}</div>
                  {j.bar_slug && <div style={{ color:CJ.muted,fontSize:11 }}>🍺 affilié</div>}
                </div>
              </div>
              {joueur && joueur.id!==j.id && <div style={{ fontSize:11,color:CJ.accent }}>⚔️ Voir le profil →</div>}
            </div>
          ))}
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

// ── FICHE JOUEUR PUBLIC ───────────────────────────────────────────────────────
export const FicheJoueur = ({ joueurId, joueur:moi, bars, associations, setPage, setBarSlug }) => {
  const [j, setJ] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([dbJ.getJoueur(joueurId), dbJ.getStats(joueurId)])
      .then(([j,s]) => { setJ(j); setStats(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, [joueurId]);

  if (loading) return <SpinnerJ/>;
  if (!j) return <div style={{ textAlign:"center",padding:60,color:CJ.muted }}>Joueur introuvable</div>;

  const bar = bars.find(b=>b.slug===j.bar_slug);
  const asso = associations.find(a=>a.slug===j.asso_slug);
  const winRate = stats && stats.parties>0 ? Math.round((stats.victoires/stats.parties)*100) : 0;

  return (
    <div style={{ maxWidth:600, margin:"0 auto", padding:"36px 20px" }}>
      <button onClick={()=>setPage("joueurs")} style={{ background:"none",border:"none",color:CJ.muted,cursor:"pointer",marginBottom:18,fontSize:13 }}>← Retour</button>
      <div style={{ background:"linear-gradient(135deg,#1a0800,#1a1a2e)",border:`1px solid ${CJ.border}`,borderRadius:14,padding:28,marginBottom:20,textAlign:"center" }}>
        <div style={{ width:72,height:72,background:CJ.accent+"33",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,border:`2px solid ${CJ.accent}`,margin:"0 auto 12px" }}>🎯</div>
        <h1 style={{ fontWeight:800,fontSize:24,marginBottom:8 }}>{j.pseudo}</h1>
        <div style={{ display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap" }}>
          {bar && <BadgeJ color={CJ.accent}>🍺 {bar.nom}</BadgeJ>}
          {asso && <BadgeJ color="#7c3aed">🫂 {asso.nom}</BadgeJ>}
        </div>
      </div>
      {stats && (
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20 }}>
          {[[stats.victoires,"Victoires",CJ.green],[stats.defaites,"Défaites",CJ.red],[stats.parties,"Parties",CJ.muted],[winRate+"%","Win Rate",CJ.yellow]].map(([v,l,c])=>(
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
      {moi && moi.id!==j.id && (
        <BtnJ onClick={()=>setPage("mon-profil")} style={{ width:"100%",marginTop:8 }}>⚔️ Défier {j.pseudo}</BtnJ>
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
export const MembresBarSection = ({ barSlug, setPage, setJoueurId }) => {
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
          <div key={m.id} onClick={()=>{setJoueurId(m.id);setPage("profil-joueur");}}
            style={{ background:"#111",border:`1px solid ${CJ.border}`,borderRadius:20,padding:"5px 14px",cursor:"pointer",fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:6 }}
            onMouseEnter={e=>e.currentTarget.style.borderColor=CJ.accent} onMouseLeave={e=>e.currentTarget.style.borderColor=CJ.border}>
            🎯 {m.pseudo}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── SCOREUR ───────────────────────────────────────────────────────────────────
export const Scoreur = () => {
  const [mode, setMode] = useState("501");
  const [noms, setNoms] = useState(["Joueur 1","Joueur 2"]);
  const [joueurs, setJoueurs] = useState(null);
  const [input, setInput] = useState("");
  const [gagnant, setGagnant] = useState(null);

  const startVal = parseInt(mode);

  const demarrer = () => {
    setJoueurs([
      { nom:noms[0], score:startVal, tours:[], actif:true },
      { nom:noms[1], score:startVal, tours:[], actif:false },
    ]);
    setGagnant(null); setInput("");
  };

  const reset = () => { setJoueurs(null); setGagnant(null); setInput(""); };

  const checkouts = {
    170:"T20 T20 Bull",161:"T20 T17 Bull",160:"T20 T20 D20",
    121:"T20 T11 D14",120:"T20 S20 D20",100:"T20 D20",
    99:"T19 T10 D16",98:"T20 D19",96:"T20 D18",
  };

  if (!joueurs) return (
    <div style={{ maxWidth:480, margin:"40px auto", padding:"0 20px" }}>
      <h1 style={{ fontWeight:800,fontSize:26,marginBottom:24 }}>🎯 Scoreur</h1>
      <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:14,padding:24,display:"flex",flexDirection:"column",gap:14 }}>
        <div style={{ display:"flex",gap:8 }}>
          {["501","301"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ flex:1,background:mode===m?CJ.accent:"#111",color:mode===m?"#fff":CJ.muted,border:`1px solid ${mode===m?CJ.accent:CJ.border}`,borderRadius:8,padding:"10px",fontWeight:700,fontSize:16,cursor:"pointer" }}>{m}</button>
          ))}
        </div>
        <FieldJ label="Joueur 1" value={noms[0]} onChange={v=>setNoms([v,noms[1]])} placeholder="Joueur 1"/>
        <FieldJ label="Joueur 2" value={noms[1]} onChange={v=>setNoms([noms[0],v])} placeholder="Joueur 2"/>
        <BtnJ onClick={demarrer} style={{ padding:"13px",fontSize:16 }}>🎯 Démarrer</BtnJ>
      </div>
    </div>
  );

  if (gagnant) return (
    <div style={{ maxWidth:480,margin:"40px auto",padding:"0 20px",textAlign:"center" }}>
      <div style={{ background:CJ.card,border:`2px solid ${CJ.green}`,borderRadius:16,padding:40 }}>
        <div style={{ fontSize:60,marginBottom:16 }}>🏆</div>
        <h2 style={{ fontWeight:800,fontSize:28,color:CJ.green,marginBottom:8 }}>Victoire !</h2>
        <p style={{ fontSize:22,fontWeight:700,marginBottom:24 }}>{gagnant}</p>
        <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
          <BtnJ onClick={demarrer}>Rejouer</BtnJ>
          <BtnJ onClick={reset} variant="dark">Nouvelle partie</BtnJ>
        </div>
      </div>
    </div>
  );

  const actifIdx = joueurs.findIndex(j=>j.actif);

  const validerLancer = () => {
    const val = parseInt(input);
    if (isNaN(val)||val<0||val>180) { setInput(""); return; }
    const nouveau = joueurs[actifIdx].score - val;
    if (nouveau < 0) { setInput(""); return; }
    if (nouveau === 0) {
      const updated = joueurs.map((j,i)=>i===actifIdx?{...j,score:0,tours:[...j.tours,val]}:j);
      setJoueurs(updated); setGagnant(joueurs[actifIdx].nom); return;
    }
    const updated = joueurs.map((j,i)=>
      i===actifIdx ? {...j,score:nouveau,tours:[...j.tours,val],actif:false} : {...j,actif:true}
    );
    setJoueurs(updated); setInput("");
  };

  return (
    <div style={{ maxWidth:540,margin:"0 auto",padding:"24px 20px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
        <h1 style={{ fontWeight:800,fontSize:22 }}>🎯 {mode}</h1>
        <button onClick={reset} style={{ background:"none",border:`1px solid ${CJ.border}`,color:CJ.muted,cursor:"pointer",borderRadius:8,padding:"6px 12px",fontSize:12 }}>↺ Nouvelle partie</button>
      </div>

      {/* Scores */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20 }}>
        {joueurs.map((j,i)=>(
          <div key={i} style={{ background:j.actif?CJ.accent+"22":CJ.card,border:`2px solid ${j.actif?CJ.accent:CJ.border}`,borderRadius:12,padding:18,textAlign:"center",transition:"all .2s" }}>
            <div style={{ fontSize:11,color:j.actif?CJ.accent:CJ.muted,fontWeight:600,marginBottom:4,minHeight:16 }}>{j.actif?"▶ À VOUS":""}</div>
            <div style={{ fontWeight:800,fontSize:14,marginBottom:4 }}>{j.nom}</div>
            <div style={{ fontSize:48,fontWeight:900,color:j.actif?CJ.accent:CJ.text,lineHeight:1 }}>{j.score}</div>
            <div style={{ fontSize:11,color:CJ.muted,marginTop:6 }}>{j.tours.length} tour{j.tours.length>1?"s":""}</div>
          </div>
        ))}
      </div>

      {/* Suggestion checkout */}
      {joueurs[actifIdx]?.score<=170 && checkouts[joueurs[actifIdx].score] && (
        <div style={{ background:"#1a0f00",border:`1px solid ${CJ.yellow}44`,borderRadius:10,padding:12,marginBottom:14,textAlign:"center" }}>
          <span style={{ color:CJ.yellow,fontSize:13,fontWeight:600 }}>💡 Checkout : {checkouts[joueurs[actifIdx].score]}</span>
        </div>
      )}

      {/* Saisie */}
      <div style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:12,padding:20 }}>
        <p style={{ color:CJ.muted,fontSize:13,marginBottom:12,fontWeight:600 }}>Tour de <span style={{ color:CJ.accent }}>{joueurs[actifIdx]?.nom}</span></p>
        <div style={{ display:"flex",gap:10,marginBottom:14 }}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&validerLancer()}
            placeholder="Score (0–180)" type="number" min="0" max="180" autoFocus
            style={{ flex:1,background:"#111",border:`1px solid ${CJ.border}`,borderRadius:8,padding:"12px 14px",color:CJ.text,fontSize:18,fontWeight:700,textAlign:"center" }}/>
          <BtnJ onClick={validerLancer} disabled={!input} style={{ padding:"12px 20px",fontSize:16 }}>✓</BtnJ>
        </div>
        <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
          {[26,45,60,81,100,140,180].map(v=>(
            <button key={v} onClick={()=>setInput(String(v))} style={{ background:"#111",border:`1px solid ${CJ.border}`,color:CJ.muted,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer" }}>{v}</button>
          ))}
          <button onClick={()=>{setInput("0");}} style={{ background:"#1a0000",border:`1px solid ${CJ.red}44`,color:CJ.red,borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer" }}>Bust</button>
        </div>
      </div>

      {/* Historique */}
      {joueurs.some(j=>j.tours.length>0) && (
        <div style={{ marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
          {joueurs.map((j,i)=>(
            <div key={i} style={{ background:CJ.card,border:`1px solid ${CJ.border}`,borderRadius:10,padding:12 }}>
              <p style={{ fontSize:12,fontWeight:600,color:CJ.muted,marginBottom:8 }}>{j.nom}</p>
              <div style={{ display:"flex",flexWrap:"wrap",gap:4 }}>
                {j.tours.slice(-8).map((t,ti)=>(
                  <span key={ti} style={{ background:"#111",borderRadius:4,padding:"2px 7px",fontSize:12,color:t>=100?CJ.green:t>=60?CJ.yellow:CJ.muted }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Export helper pour compter les défis (utilisé dans App.jsx)
export { dbJ as dbJoueurs };
