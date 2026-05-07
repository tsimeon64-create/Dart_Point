/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                    SYSTÈME BULL — ARCHIVÉ                       ║
 * ║                                                                  ║
 * ║  Monnaie secondaire "BULL" développée en mai 2026.              ║
 * ║  Désactivée pour simplifier l'expérience utilisateur.           ║
 * ║  Tout le code est conservé ici pour une réactivation future.    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * POUR RÉACTIVER :
 *  1. Exécuter la migration SQL ci-dessous dans Supabase
 *  2. Réimporter les fonctions dans App.jsx, AppEntrainementFinish.jsx, AppRushMode.jsx, AppJeux.jsx
 *  3. Réactiver les sections commentées dans chaque composant
 *
 * MIGRATION SQL SUPABASE :
 *   ALTER TABLE joueurs ADD COLUMN IF NOT EXISTS bull_balance   integer DEFAULT 250;
 *   ALTER TABLE joueurs ADD COLUMN IF NOT EXISTS last_daily_reward date;
 *   ALTER TABLE joueurs ADD COLUMN IF NOT EXISTS bull_reserved  integer DEFAULT 0;
 *   ALTER TABLE duels   ADD COLUMN IF NOT EXISTS type           text    DEFAULT 'drix';
 *   ALTER TABLE duels   ADD COLUMN IF NOT EXISTS bull_mise      integer DEFAULT 0;
 */

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

export const BULL_MAX   = Infinity; // pas de plafond
export const BULL_DAILY = 50;       // recharge quotidienne (+50 par jour)
export const BULL_INIT  = 250;      // solde initial à la création du compte

// Coût en BULL par mode de jeu
export const BULL_COST = {
  paisible : 0,   // Comptage de finish — Mode Paisible (gratuit)
  drix     : 25,  // Comptage de finish — Chasse aux DRIX
  rush     : 2,   // Rush Mode
  capital  : 0,   // Jeu Capital (gratuit)
  tournoi  : 0,   // Tournoi entre potes (gratuit)
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DB (à ajouter dans dbJ dans AppJoueurs.jsx)
// ─────────────────────────────────────────────────────────────────────────────

// updateBull:         (id, bull, date) => sbJ(`joueurs?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({ bull_balance:bull, last_daily_reward:date }), prefer:"return=minimal" }),
// updateBullReserved: (id, bull_balance, bull_reserved) => sbJ(`joueurs?id=eq.${id}`, { method:"PATCH", body:JSON.stringify({ bull_balance, bull_reserved }), prefer:"return=minimal" }),

// ─────────────────────────────────────────────────────────────────────────────
// FONCTIONS BULL (AppJoueurs.jsx)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * checkDailyBull — appeler au chargement du dashboard.
 * Ajoute BULL_DAILY si le joueur ne l'a pas encore reçu aujourd'hui.
 * N'est appliqué que si l'écriture en base réussit (évite les doublons).
 */
// export const checkDailyBull = async (joueur) => {
//   if (!joueur?.id) return joueur;
//   const today = todayStr();
//   if (joueur.last_daily_reward === today) return joueur;
//   const current = joueur.bull_balance ?? BULL_INIT;
//   const bull = current + BULL_DAILY;
//   try {
//     await dbJ.updateBull(joueur.id, bull, today);
//     return { ...joueur, bull_balance: bull, last_daily_reward: today };
//   } catch {
//     return joueur;
//   }
// };

/**
 * spendBull — déduit `amount` BULL du joueur.
 * Lève une erreur si solde insuffisant.
 */
// export const spendBull = async (joueur, amount) => {
//   const bal = joueur.bull_balance ?? BULL_INIT;
//   if (bal < amount) throw new Error(`insuffisant`);
//   const newBal = bal - amount;
//   await dbJ.updateBull(joueur.id, newBal, joueur.last_daily_reward ?? todayStr());
//   return { ...joueur, bull_balance: newBal };
// };

/**
 * reserverBull — réserve `mise` BULL pour un défi accepté.
 * bull_balance -= mise, bull_reserved += mise.
 */
// export const reserverBull = async (joueurId, mise) => {
//   const j = await dbJ.getJoueur(joueurId);
//   if (!j) throw new Error("Joueur introuvable");
//   const balance  = j.bull_balance  ?? BULL_INIT;
//   const reserved = j.bull_reserved ?? 0;
//   if (balance < mise) throw new Error("Solde insuffisant");
//   await dbJ.updateBullReserved(joueurId, balance - mise, reserved + mise);
// };

/**
 * appliquerBullDuel — transfère les BULL à la fin d'un duel de type "bull".
 * Gagnant : +mise (récupère sa mise + prend celle du perdant).
 * Perdant  : sa mise était déjà déduite à l'acceptation.
 *
 * IMPORTANT : dans AppJeux.jsx enregistrerResultatDuel(), remplacer :
 *   await finaliserDuel(...)
 * par :
 *   const isBullDuel = duel.type === "bull" || (duel.bull_mise > 0 && duel.type !== "drix");
 *   if (isBullDuel) await appliquerBullDuel({ ...duel, gagnant_id: gagnantId });
 *   else await finaliserDuel({ ...duel, gagnant_id: gagnantId });
 *
 * Et dans AppJoueurs.jsx validerResultat(), remplacer :
 *   await appliquerDrixDuel(duelFrais);
 * par :
 *   const isBull = duelFrais?.type === "bull" || (duelFrais?.bull_mise > 0 && duelFrais?.type !== "drix");
 *   if (isBull) await appliquerBullDuel(duelFrais);
 *   else await appliquerDrixDuel(duelFrais);
 */
// export const appliquerBullDuel = async (duel) => {
//   try {
//     const mise = duel.bull_mise || 0;
//     if (!mise) return;
//     const gagnantId = duel.gagnant_id;
//     if (!gagnantId) return;
//     const perdantId = gagnantId === duel.challenger_id ? duel.defie_id : duel.challenger_id;
//     const [jG, jP] = await Promise.all([dbJ.getJoueur(gagnantId), dbJ.getJoueur(perdantId)]);
//     if (!jG || !jP) return;
//     const gBull = jG.bull_balance ?? BULL_INIT;
//     const gRes  = jG.bull_reserved ?? 0;
//     const pRes  = jP.bull_reserved ?? 0;
//     await Promise.all([
//       dbJ.updateBullReserved(gagnantId, gBull + mise * 2, Math.max(0, gRes - mise)),
//       dbJ.updateBullReserved(perdantId, jP.bull_balance ?? 0, Math.max(0, pRes - mise)),
//     ]);
//   } catch(e) { console.error("Erreur BULL duel:", e); }
// };

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT BullBadge (AppJoueurs.jsx)
// ─────────────────────────────────────────────────────────────────────────────

// export const BullBadge = ({ bull, size="normal", flash=false }) => {
//   const big = size === "big";
//   const balance = bull ?? BULL_INIT;
//   const col = balance <= 10 ? "#ef4444" : balance <= 50 ? "#f59e0b" : "#f97316";
//   return (
//     <div style={{
//       display:"inline-flex", alignItems:"center", gap:big?6:4,
//       background: flash ? "#78350f" : "#1a0f00",
//       border:`1px solid ${col}44`, borderRadius:big?12:8, padding:big?"8px 14px":"3px 10px",
//       transition:"background .3s", boxShadow: flash ? `0 0 14px ${col}66` : "none",
//     }}>
//       <span style={{ fontSize:big?18:13 }}>🪙</span>
//       <span style={{ fontWeight:900, fontSize:big?18:13, color:col, fontVariantNumeric:"tabular-nums" }}>{balance}</span>
//       <span style={{ fontSize:big?11:10, color:"#a16207", fontWeight:700 }}>BULLS</span>
//     </div>
//   );
// };

// ─────────────────────────────────────────────────────────────────────────────
// AFFICHAGE BULL dans FicheJoueur (AppJoueurs.jsx — profil d'un autre joueur)
// ─────────────────────────────────────────────────────────────────────────────

// Dans la carte profil de FicheJoueur, après le titre DRIX, ajouter :
// {j.bull_balance != null && (
//   <div style={{ display:"inline-flex",alignItems:"center",gap:5,background:"#1a0f00",
//                 border:"1px solid #f9731644",borderRadius:8,padding:"3px 12px",marginBottom:12 }}>
//     <span style={{ fontSize:14 }}>🪙</span>
//     <span style={{ fontWeight:900,fontSize:14,color:"#f97316" }}>{j.bull_balance}</span>
//     <span style={{ fontSize:10,color:"#a16207",fontWeight:700 }}>BULLS</span>
//   </div>
// )}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD — recharge quotidienne (HomeDashboard dans App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

// const [bullFlash, setBullFlash] = useState(false);
//
// Dans le useEffect de chargement :
//   const jAvec = await checkDailyBull(j);
//   if (jAvec.bull_balance !== j.bull_balance) {
//     setBullFlash(true);
//     setTimeout(() => setBullFlash(false), 3000);
//   }
//
// Dans le JSX de la carte profil :
//   <BullBadge bull={j.bull_balance} size="normal" flash={bullFlash}/>
//   {bullFlash && (
//     <div style={{ position:"absolute",top:-22,right:0,background:"#f97316",color:"#fff",
//                   borderRadius:8,padding:"2px 8px",fontSize:11,fontWeight:800,
//                   whiteSpace:"nowrap",animation:"slideUp .3s ease-out" }}>
//       +50 🪙
//     </div>
//   )}

// ─────────────────────────────────────────────────────────────────────────────
// MODE JEU — gating par coût BULL (PageModeJeu dans App.jsx)
// ─────────────────────────────────────────────────────────────────────────────

// const [bullErr, setBullErr] = useState(null);
// const bull = joueur?.bull_balance ?? BULL_INIT;
//
// const lancerMode = async (page, cost, needLogin=false) => {
//   if (needLogin && !joueur) { setPage("connexion"); return; }
//   if (joueur && cost > 0) {
//     if (bull < cost) {
//       setBullErr(`Pas assez de BULLS pour ce mode (${bull}/${cost} 🪙)`);
//       setTimeout(() => setBullErr(null), 3000);
//       return;
//     }
//     try {
//       const jUpdated = await spendBull(joueur, cost);
//       setJoueur(jUpdated);
//       localStorage.setItem("dp_joueur", JSON.stringify(jUpdated));
//     } catch { return; }
//   }
//   setPage(page);
// };
//
// const CostTag = ({ cost }) => cost > 0 ? (
//   <span style={{ display:"inline-flex",alignItems:"center",gap:3,background:"#1a0f00",
//                  border:"1px solid #f97316aa",borderRadius:20,padding:"2px 9px",
//                  fontSize:11,fontWeight:800,color:"#f97316" }}>
//     🪙 {cost} BULLS
//   </span>
// ) : null;

// ─────────────────────────────────────────────────────────────────────────────
// DÉFI BULL — flow complet (PageDefi dans App.jsx)
// ─────────────────────────────────────────────────────────────────────────────
//
// États supplémentaires dans PageDefi :
//   const [bullDefisRecus, setBullDefisRecus] = useState([]);
//   const [bullDefisEnvoyes, setBullDefisEnvoyes] = useState([]);
//   const [defiMode, setDefiMode] = useState(null); // null | "drix" | "bull"
//   const [bullMise, setBullMise] = useState(20);
//   const [bullMiseCustom, setBullMiseCustom] = useState("");
//   const [bullErr, setBullErr] = useState(null);
//
// Dans charger(), ajouter dans Promise.all :
//   sb(`duels?defie_id=eq.${joueur.id}&statut=eq.en_attente&type=eq.bull&select=*`).catch(()=>[]),
//   sb(`duels?challenger_id=eq.${joueur.id}&statut=eq.en_attente&type=eq.bull&select=*`).catch(()=>[]),
//
// Fetch profils amis : ajouter bull_balance dans select=id,pseudo,photo,drix,bull_balance
//
// Fonctions :
//   envoyerDefiBull()  — crée duel statut:"en_attente", type:"bull", bull_mise:X
//   accepterBullDefi() — reserverBull des 2 joueurs, statut:"accepte", lance scoreur
//   refuserBullDefi()  — statut:"refuse"
//   annulerBullDefi()  — statut:"refuse" (côté challenger)
//
// Dans MatchActifCard.abandonner() :
//   if (d.type === "bull" && d.bull_mise > 0) {
//     const adversaireId = d.challenger_id===joueur.id ? d.defie_id : d.challenger_id;
//     await appliquerBullDuel({ ...d, gagnant_id: adversaireId });
//   }
//
// Sections JSX à réactiver dans PageDefi :
//   - "Défis BULLS reçus" (bullDefisRecus)
//   - "Défis BULLS envoyés" (bullDefisEnvoyes)
//   - Sélecteur DRIX / BULL dans le panneau ami
//   - Écran mise BULL (sélecteur 10/20/50/100/autre)
//
// Dans le polling (App.jsx) :
//   sb(`duels?defie_id=eq.${joueur.id}&statut=eq.en_attente&type=eq.bull&select=id`).catch(()=>[])
//   → bullN = bullRecus?.length || 0
//   → setDefisCount(matchsN + contestN + bullN)

// ─────────────────────────────────────────────────────────────────────────────
// COMPTAGE FINISH — coût BULL (AppEntrainementFinish.jsx)
// ─────────────────────────────────────────────────────────────────────────────

// const BULL_COST_PAISIBLE = 0;
// const BULL_COST_DRIX     = 25;
// const BULL_INIT_LOCAL    = 250;
//
// const patchBull = (id, bull) => fetch(`${SB_URL}/rest/v1/joueurs?id=eq.${id}`, {
//   method:"PATCH", headers:{...}, body: JSON.stringify({ bull_balance: bull }),
// });
//
// Dans SelectionMode :
//   const [bullErr, setBullErr] = useState(null);
//   const bull = joueur?.bull_balance ?? BULL_INIT_LOCAL;
//   const cost = mode === "drix" ? BULL_COST_DRIX : BULL_COST_PAISIBLE;
//   if (bull < cost) { setBullErr(...); return; }
//   const newBull = bull - cost;
//   await patchBull(joueur.id, newBull);
//   if (setJoueur) { setJoueur({...joueur, bull_balance: newBull}); ... }
//
// Dans Jeu — header :
//   const [bullLocal, setBullLocal] = useState(joueur?.bull_balance ?? BULL_INIT_LOCAL);
//   useEffect(() => { if (joueur?.bull_balance != null) setBullLocal(joueur.bull_balance); }, [joueur?.bull_balance]);
//   → afficher 🪙 {bullLocal} dans le header en mode DRIX

// ─────────────────────────────────────────────────────────────────────────────
// RUSH MODE — solde BULL (AppRushMode.jsx)
// ─────────────────────────────────────────────────────────────────────────────

// Dans SelectNiveau, prop `bull` :
//   {bull != null && (
//     <div style={{display:"flex",alignItems:"center",gap:4,...}}>
//       <span>🪙</span>
//       <span>{bull}</span>
//       <span>BULLS</span>
//     </div>
//   )}
// → passer bull={joueur?.bull_balance} depuis RushMode

// ─────────────────────────────────────────────────────────────────────────────
// SCOREUR DUEL — écran victoire BULL (AppJeux.jsx)
// ─────────────────────────────────────────────────────────────────────────────

// import { finaliserDuel, appliquerBullDuel } from "./AppJoueurs";
//
// Dans enregistrerResultatDuel() :
//   const isBullDuel = duel.type === "bull" || (duel.bull_mise > 0 && duel.type !== "drix");
//   if (isBullDuel) await appliquerBullDuel({ ...duel, gagnant_id: gagnantId });
//   else await finaliserDuel({ ...duel, gagnant_id: gagnantId });
//
// Dans l'écran de fin (etape === "fin"), section résultat duel :
//   const isBull   = duel?.type === "bull";
//   const bullMise = duel?.bull_mise || 0;
//   // Si isBull : afficher +bullMise 🪙 / -bullMise 🪙 au lieu des DRIX
