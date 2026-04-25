import { useState } from "react";

// ── AppJeux.jsx ───────────────────────────────────────────────────────────────
// Scoreur DartPoint — optimisé mobile — mode libre et mode duel
// Importé depuis App.jsx

const CHECKOUTS = {
  170:"T20 T20 Bull", 167:"T20 T19 Bull", 164:"T20 T18 Bull", 161:"T20 T17 Bull",
  160:"T20 T20 D20", 158:"T20 T20 D19", 156:"T20 T20 D18", 155:"T20 T19 D19",
  154:"T20 T18 D20", 153:"T20 T19 D18", 152:"T20 T20 D16", 151:"T20 T17 D20",
  150:"T20 T18 D18", 149:"T20 T19 D16", 148:"T20 T16 D20", 147:"T20 T17 D18",
  146:"T20 T18 D16", 145:"T20 T15 D20", 144:"T20 T20 D12", 143:"T20 T17 D16",
  142:"T20 T14 D20", 141:"T20 T15 D18", 140:"T20 T16 D16", 139:"T20 T13 D20",
  138:"T20 T14 D18", 137:"T20 T15 D16", 136:"T20 T20 D8",  135:"T20 T17 D12",
  134:"T20 T14 D16", 133:"T20 T19 D8",  132:"T20 T16 D12", 131:"T20 T13 D16",
  130:"T20 T18 D8",  129:"T19 T16 D12", 128:"T18 T14 D16", 127:"T20 T17 D8",
  126:"T19 T15 D12", 125:"T20 T15 D10", 124:"T20 T16 D8",  123:"T19 T16 D9",
  122:"T18 T16 D10", 121:"T20 T11 D14", 120:"T20 S20 D20", 119:"T19 T12 D13",
  118:"T20 S18 D20", 117:"T20 S17 D20", 116:"T20 S16 D20", 115:"T20 S15 D20",
  114:"T20 S14 D20", 113:"T20 S13 D20", 112:"T20 S12 D20", 111:"T20 S11 D20",
  110:"T20 S10 D20", 109:"T20 S9 D20",  108:"T20 S8 D20",  107:"T19 S10 D20",
  106:"T20 S6 D20",  105:"T20 S5 D20",  104:"T20 S4 D20",  103:"T20 S3 D20",
  102:"T20 S2 D20",  101:"T20 S1 D20",  100:"T20 D20",     99:"T19 S10 D16",
  98:"T20 D19",  97:"T19 D20",  96:"T20 D18",  95:"T19 D19", 94:"T18 D20",
  93:"T19 D18",  92:"T20 D16",  91:"T17 D20",  90:"T18 D18", 89:"T19 D16",
  88:"T20 D14",  87:"T17 D18",  86:"T18 D16",  85:"T15 D20", 84:"T20 D12",
  83:"T17 D16",  82:"T14 D20",  81:"T19 D12",  80:"T20 D10", 79:"T13 D20",
  78:"T18 D12",  77:"T19 D10",  76:"T20 D8",   75:"T17 D12", 74:"T14 D16",
  73:"T19 D8",   72:"T16 D12",  71:"T13 D16",  70:"T18 D8",  69:"T19 D6",
  68:"T20 D4",   67:"T17 D8",   66:"T10 D18",  65:"T19 D4",  64:"T16 D8",
  63:"T17 D6",   62:"T10 D16",  61:"T15 D8",   60:"S20 D20", 59:"S19 D20",
  58:"S18 D20",  57:"S17 D20",  56:"S16 D20",  55:"S15 D20", 54:"S14 D20",
  53:"S13 D20",  52:"S12 D20",  51:"S11 D20",  50:"Bull",
  49:"S9 D20",   48:"S8 D20",   47:"S7 D20",   46:"S6 D20",  45:"S5 D20",
  44:"S4 D20",   43:"S3 D20",   42:"S2 D20",   41:"S1 D20",  40:"D20",
  38:"D19", 36:"D18", 34:"D17", 32:"D16", 30:"D15", 28:"D14",
  26:"D13", 24:"D12", 22:"D11", 20:"D10", 18:"D9",  16:"D8",
  14:"D7",  12:"D6",  10:"D5",   8:"D4",   6:"D3",   4:"D2",  2:"D1",
};

const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";

// ── SCOREUR ───────────────────────────────────────────────────────────────────
export const Scoreur = ({ duel = null, onDuelTermine = null, setPage = null }) => {
  const modeDuel = !!duel;

  const [etape, setEtape] = useState(modeDuel ? "jeu" : "config");
  const [config, setConfig] = useState({
    mode: duel?.mode || "501",
    manches: duel?.manches || 1,
    nom1: duel?.challenger_pseudo || "Joueur 1",
    nom2: duel?.defie_pseudo || "Joueur 2",
  });
  const [input, setInput] = useState("");
  const [joueurs, setJoueurs] = useState(modeDuel ? initJoueursFromDuel(duel) : null);
  const [actifIdx, setActifIdx] = useState(0);
  const [gagnant, setGagnant] = useState(null);
  const [resultEnregistre, setResultEnregistre] = useState(false);

  function initJoueursFromDuel(d) {
    const sv = parseInt(d?.mode || "501");
    return [
      { nom:d?.challenger_pseudo||"Joueur 1", score:sv, manchesGagnees:0, tours:[], flechettes:0, totalPoints:0, scorePrecedent:null },
      { nom:d?.defie_pseudo||"Joueur 2", score:sv, manchesGagnees:0, tours:[], flechettes:0, totalPoints:0, scorePrecedent:null },
    ];
  }

  const startVal = parseInt(config.mode);

  const initJoueurs = () => [
    { nom:config.nom1||"Joueur 1", score:startVal, manchesGagnees:0, tours:[], flechettes:0, totalPoints:0, scorePrecedent:null },
    { nom:config.nom2||"Joueur 2", score:startVal, manchesGagnees:0, tours:[], flechettes:0, totalPoints:0, scorePrecedent:null },
  ];

  const demarrer = () => {
    setJoueurs(initJoueurs());
    setActifIdx(0);
    setGagnant(null);
    setInput("");
    setResultEnregistre(false);
    setEtape("jeu");
  };

  const reset = () => {
    if (modeDuel && setPage) { setPage("mon-profil"); return; }
    setJoueurs(null); setGagnant(null); setInput(""); setResultEnregistre(false); setEtape("config");
  };

  const appuyer = (val) => {
    if (val === "del") { setInput(p => p.slice(0, -1)); return; }
    if (input.length >= 3) return;
    const next = input + val;
    if (parseInt(next) > 180) return;
    setInput(next);
  };

  const enregistrerResultatDuel = async (gagnantNom, scoreC, scoreD) => {
    if (!duel || resultEnregistre) return;
    const gagnantId = gagnantNom === duel.challenger_pseudo ? duel.challenger_id : duel.defie_id;
    try {
      await fetch(`${SB_URL}/rest/v1/duels?id=eq.${duel.id}`, {
        method: "PATCH",
        headers: { "apikey":SB_KEY, "Authorization":`Bearer ${SB_KEY}`, "Content-Type":"application/json", "Prefer":"return=minimal" },
        body: JSON.stringify({
          statut: "en_validation",
          gagnant_id: gagnantId,
          gagnant_pseudo: gagnantNom,
          score_manches_challenger: scoreC,
          score_manches_defie: scoreD,
          valide_challenger: false,
          valide_defie: false,
        })
      });
      setResultEnregistre(true);
      if (onDuelTermine) onDuelTermine();
    } catch(e) { console.error("Erreur enregistrement duel:", e); }
  };

  const envoyer = () => {
    if (!joueurs) return;
    const val = parseInt(input);
    if (!input || isNaN(val) || val < 0 || val > 180) { setInput(""); return; }

    const joueur = joueurs[actifIdx];
    const nouveau = joueur.score - val;

    // Bust
    if (nouveau < 0 || nouveau === 1) {
      const updated = joueurs.map((j, i) => i === actifIdx
        ? { ...j, scorePrecedent: val, flechettes: j.flechettes + 3 }
        : j
      );
      setJoueurs(updated);
      setActifIdx(1 - actifIdx);
      setInput("");
      return;
    }

    // Manche gagnée (double out)
    if (nouveau === 0) {
      const newManches = joueur.manchesGagnees + 1;
      const updated = joueurs.map((j, i) => i === actifIdx
        ? { ...j, score: nouveau, manchesGagnees: newManches, tours: [...j.tours, val], flechettes: j.flechettes + 3, totalPoints: j.totalPoints + val, scorePrecedent: val }
        : j
      );

      const manchesTotal = modeDuel ? (duel?.manches || 1) : config.manches;

      if (newManches >= manchesTotal) {
        setJoueurs(updated);
        const scoreC = actifIdx === 0 ? newManches : updated[1].manchesGagnees;
        const scoreD = actifIdx === 1 ? newManches : updated[0].manchesGagnees;
        const gagnantObj = {...joueur, manchesGagnees:newManches, tours:[...joueur.tours,val], totalPoints:joueur.totalPoints+val, flechettes:joueur.flechettes+3};
        setGagnant(gagnantObj);
        setEtape("fin");
        if (modeDuel) enregistrerResultatDuel(joueur.nom, scoreC, scoreD);
        return;
      }

      const reset_manche = updated.map(j => ({ ...j, score: modeDuel ? parseInt(duel?.mode||"501") : startVal, scorePrecedent: null }));
      setJoueurs(reset_manche);
      setActifIdx(1 - actifIdx);
      setInput("");
      return;
    }

    // Tour normal
    const updated = joueurs.map((j, i) => i === actifIdx
      ? { ...j, score: nouveau, tours: [...j.tours, val], flechettes: j.flechettes + 3, totalPoints: j.totalPoints + val, scorePrecedent: val }
      : j
    );
    setJoueurs(updated);
    setActifIdx(1 - actifIdx);
    setInput("");
  };

  const moyenne = (j) => j && j.tours.length > 0 ? (j.totalPoints / j.tours.length).toFixed(2) : "0.00";
  const checkout = joueurs ? CHECKOUTS[joueurs[actifIdx]?.score] : null;

  // ── ÉCRAN CONFIG (mode libre uniquement) ─────────────────────────────────
  if (etape === "config") return (
    <div style={{ maxWidth:480, margin:"0 auto", padding:"24px 16px", fontFamily:"Inter,sans-serif" }}>
      <h1 style={{ fontWeight:900, fontSize:26, marginBottom:4, color:"#f1f5f9", textAlign:"center" }}>🎯 Scoreur</h1>
      <p style={{ color:"#94a3b8", fontSize:14, marginBottom:28, textAlign:"center" }}>Mode libre</p>
      <div style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:14, padding:24, display:"flex", flexDirection:"column", gap:14 }}>
        <div>
          <label style={{ fontSize:13, fontWeight:600, color:"#94a3b8", display:"block", marginBottom:10 }}>MODE DE JEU</label>
          <div style={{ display:"flex", gap:8 }}>
            {["301","501"].map(m=>(
              <button key={m} onClick={()=>setConfig(c=>({...c,mode:m}))}
                style={{ flex:1, padding:"16px", borderRadius:12, border:"none", fontWeight:900, fontSize:22, cursor:"pointer",
                  background:config.mode===m?"linear-gradient(135deg,#f97316,#ea580c)":"#111", color:config.mode===m?"#fff":"#94a3b8" }}>
                {m}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize:13, fontWeight:600, color:"#94a3b8", display:"block", marginBottom:10 }}>PREMIER À ... MANCHES</label>
          <div style={{ display:"flex", gap:8 }}>
            {[1,2,3,4,5].map(n=>(
              <button key={n} onClick={()=>setConfig(c=>({...c,manches:n}))}
                style={{ flex:1, padding:"14px 0", borderRadius:10, border:"none", fontWeight:800, fontSize:18, cursor:"pointer",
                  background:config.manches===n?"linear-gradient(135deg,#f97316,#ea580c)":"#111", color:config.manches===n?"#fff":"#94a3b8" }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ fontSize:13, fontWeight:600, color:"#94a3b8", display:"block", marginBottom:10 }}>JOUEURS</label>
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {[["nom1","Joueur 1"],["nom2","Joueur 2"]].map(([k,ph])=>(
              <input key={k} value={config[k]} onChange={e=>setConfig(c=>({...c,[k]:e.target.value}))} placeholder={ph}
                style={{ background:"#111", border:"1px solid #2a2a2a", borderRadius:10, padding:"14px 16px", color:"#f1f5f9", fontSize:16, fontWeight:600 }}/>
            ))}
          </div>
        </div>
        <button onClick={demarrer}
          style={{ width:"100%", padding:"18px", borderRadius:14, border:"none", fontWeight:900, fontSize:18, cursor:"pointer",
            background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", marginTop:4 }}>
          🎯 DÉMARRER LA PARTIE
        </button>
      </div>
      <div style={{ background:"#1a1a1a", border:"1px solid #2a2a2a", borderRadius:12, padding:18, marginTop:20 }}>
        <h3 style={{ fontWeight:700, fontSize:14, marginBottom:10, color:"#f97316" }}>📋 Règles rapides</h3>
        <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.7 }}>
          Partez de {config.mode} et descendez à 0. Le dernier lancer doit finir sur un <strong style={{ color:"#f1f5f9" }}>double</strong>.
          Si le score descend en dessous de 0 ou égale 1, le tour est <strong style={{ color:"#ef4444" }}>bust</strong>.
        </p>
      </div>
    </div>
  );

  // ── ÉCRAN FIN ─────────────────────────────────────────────────────────────
  if (etape === "fin") return (
    <div style={{ maxWidth:480, margin:"0 auto", padding:"40px 16px", textAlign:"center", fontFamily:"Inter,sans-serif" }}>
      <div style={{ background:"linear-gradient(135deg,#14532d,#166534)", borderRadius:20, padding:"40px 24px", marginBottom:20 }}>
        <div style={{ fontSize:72, marginBottom:12 }}>🏆</div>
        <h2 style={{ fontWeight:900, fontSize:32, color:"#22c55e", marginBottom:6 }}>VICTOIRE !</h2>
        <p style={{ fontSize:24, fontWeight:800, color:"#fff", marginBottom:20 }}>{gagnant?.nom}</p>
        <div style={{ display:"flex", justifyContent:"center", gap:24 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#22c55e" }}>{moyenne(gagnant)}</div>
            <div style={{ fontSize:12, color:"#86efac" }}>Moyenne</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#22c55e" }}>{gagnant?.flechettes}</div>
            <div style={{ fontSize:12, color:"#86efac" }}>Fléchettes</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:22, fontWeight:900, color:"#22c55e" }}>{gagnant?.tours.length}</div>
            <div style={{ fontSize:12, color:"#86efac" }}>Tours</div>
          </div>
        </div>
      </div>

      {/* Mode duel : message validation */}
      {modeDuel && (
        <div style={{ background:"#1a1200", border:"2px solid #f59e0b", borderRadius:14, padding:20, marginBottom:16 }}>
          <p style={{ fontWeight:700, fontSize:15, color:"#f59e0b", marginBottom:6 }}>⚠️ Résultat enregistré !</p>
          <p style={{ color:"#94a3b8", fontSize:13 }}>
            Les 2 joueurs doivent maintenant valider le résultat depuis leur profil pour que les DRIX soient mis à jour.
          </p>
        </div>
      )}

      <div style={{ display:"flex", gap:10 }}>
        {!modeDuel && <button onClick={demarrer} style={{ flex:1,padding:"16px",borderRadius:12,border:"none",fontWeight:800,fontSize:16,cursor:"pointer",background:"linear-gradient(135deg,#f97316,#ea580c)",color:"#fff" }}>🔄 Rejouer</button>}
        <button onClick={reset} style={{ flex:1,padding:"16px",borderRadius:12,border:"1px solid #2a2a2a",fontWeight:800,fontSize:16,cursor:"pointer",background:"#1a1a1a",color:"#94a3b8" }}>
          {modeDuel?"← Mon profil":"⚙️ Config"}
        </button>
      </div>
    </div>
  );

  // ── ÉCRAN JEU ─────────────────────────────────────────────────────────────
  if (!joueurs) return null;
  const j0 = joueurs[0];
  const j1 = joueurs[1];
  const actif = joueurs[actifIdx];
  const manchesTotal = modeDuel ? (duel?.manches || 1) : config.manches;

  return (
    <div style={{ maxWidth:480, margin:"0 auto", fontFamily:"Inter,sans-serif", display:"flex", flexDirection:"column", minHeight:"calc(100vh - 58px)" }}>

      {/* Header */}
      <div style={{ background:"#111", padding:"10px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #2a2a2a" }}>
        <button onClick={reset} style={{ background:"none", border:"none", color:"#94a3b8", cursor:"pointer", fontSize:22 }}>←</button>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontWeight:900, fontSize:14, color:"#f1f5f9", letterSpacing:1 }}>
            {modeDuel ? "⚔️ DUEL" : "PREMIER À"} {manchesTotal} MANCHE{manchesTotal>1?"S":""}
          </div>
          <div style={{ fontSize:12, color:"#94a3b8" }}>{modeDuel?duel?.mode:config.mode} · Double out</div>
        </div>
        <div style={{ width:32 }}/>
      </div>

      {/* Scores */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", flex:"0 0 auto" }}>
        {[j0, j1].map((j, i) => {
          const isActif = i === actifIdx;
          const moy = moyenne(j);
          return (
            <div key={i} style={{
              padding:"18px 14px",
              background: isActif ? "linear-gradient(135deg,#f97316,#ea580c)" : "#c2410c22",
              borderBottom: `3px solid ${isActif ? "#f97316" : "transparent"}`,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background: isActif ? "#fff" : "transparent", border: isActif ? "none" : "2px solid #f9731644" }}/>
                <span style={{ fontWeight:700, fontSize:14, color: isActif ? "#fff" : "#f97316aa" }}>{j.nom}</span>
              </div>
              <div style={{ fontSize:72, fontWeight:900, color: isActif ? "#fff" : "#f1f5f9aa", lineHeight:1, marginBottom:8 }}>{j.score}</div>
              <div style={{ display:"flex", gap:4, marginBottom:10 }}>
                {Array.from({length: manchesTotal}).map((_,mi)=>(
                  <div key={mi} style={{ width:18, height:18, borderRadius:4, background: mi < j.manchesGagnees ? (isActif?"#fff":"#f97316") : (isActif?"#ffffff33":"#2a2a2a") }}/>
                ))}
              </div>
              <div style={{ fontSize:12, color: isActif ? "#fff9" : "#94a3b855" }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <span>Moyenne</span><span style={{ fontWeight:700, color: isActif?"#fff":"#94a3b8" }}>{moy}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                  <span>Précédent</span><span style={{ fontWeight:700, color: isActif?"#fff":"#94a3b8" }}>{j.scorePrecedent ?? "—"}</span>
                </div>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span>Fléchettes</span><span style={{ fontWeight:700, color: isActif?"#fff":"#94a3b8" }}>{j.flechettes}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message + checkout */}
      <div style={{ padding:"12px 16px", background:"#0f0f0f", flex:"0 0 auto" }}>
        <p style={{ fontWeight:900, fontSize:15, color:"#f97316", textAlign:"center", marginBottom: checkout ? 4 : 0, letterSpacing:0.5 }}>
          C'EST AU TOUR DE {actif.nom.toUpperCase()} DE LANCER !
        </p>
        {checkout && (
          <p style={{ textAlign:"center", color:"#f59e0b", fontSize:13, fontWeight:600 }}>
            💡 Checkout {actif.score} : {checkout}
          </p>
        )}
      </div>

      {/* Saisie */}
      <div style={{ padding:"10px 16px", background:"#0f0f0f", flex:"0 0 auto" }}>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ flex:1, background:"#fff", borderRadius:50, padding:"14px 20px", display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontSize:20, color:"#94a3b8" }}>⌨️</span>
            <span style={{ fontSize:22, fontWeight:700, color: input ? "#111" : "#94a3b8", flex:1 }}>
              {input || "Entrer un score"}
            </span>
          </div>
          <button onClick={envoyer} disabled={!input}
            style={{ background: input ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#1a1a1a", border:"none", borderRadius:50, padding:"14px 24px", fontWeight:800, fontSize:16, color: input ? "#fff" : "#94a3b8", cursor: input ? "pointer" : "not-allowed" }}>
            Envoyer
          </button>
        </div>
      </div>

      {/* Clavier */}
      <div style={{ padding:"8px 16px 16px", background:"#0f0f0f", flex:1 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8 }}>
          {["1","2","3","4","5","6","7","8","9"].map(n=>(
            <button key={n} onClick={()=>appuyer(n)}
              style={{ padding:"20px 0", borderRadius:10, border:"1px solid #2a2a2a", background:"#1a1a1a", color:"#f1f5f9", fontSize:24, fontWeight:700, cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
              {n}
            </button>
          ))}
          <button onClick={()=>appuyer("del")}
            style={{ padding:"20px 0", borderRadius:10, border:"1px solid #2a2a2a", background:"#1a1a1a", color:"#f59e0b", fontSize:20, cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
            ⌫
          </button>
          <button onClick={()=>appuyer("0")}
            style={{ padding:"20px 0", borderRadius:10, border:"1px solid #2a2a2a", background:"#1a1a1a", color:"#f1f5f9", fontSize:24, fontWeight:700, cursor:"pointer", WebkitTapHighlightColor:"transparent" }}>
            0
          </button>
          <button onClick={envoyer} disabled={!input}
            style={{ padding:"20px 0", borderRadius:10, border:"none", background: input ? "linear-gradient(135deg,#22c55e,#16a34a)" : "#1a1a2a", color: input ? "#fff" : "#94a3b8", fontSize:18, fontWeight:800, cursor: input ? "pointer" : "not-allowed", WebkitTapHighlightColor:"transparent" }}>
            ✓
          </button>
        </div>
      </div>
    </div>
  );
};

// ── FUTURS JEUX ───────────────────────────────────────────────────────────────
// export const Cricket = () => { ... };
// export const AroundTheClock = () => { ... };