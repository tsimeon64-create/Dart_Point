import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import { Scoreur } from "./AppJeux";
import { EmoIcon, EmoText } from "./icons";
import { rankGroup, egalitesADepartager } from "./barrage";
import { optimizePoolMatchOrder } from "./tournoiConfig";
import { TournoiSetupWizard } from "./TournoiSetupWizard";
import { confirmer } from "./uiConfirm.jsx";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sbTP = async (path, opts={}) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":opts.prefer||"return=representation",...opts.headers},
    ...opts,
  });
  if (!res.ok){const e=await res.text();throw new Error(e);}
  const text=await res.text();
  return text?JSON.parse(text):null;
};

export const dbTP = {
  getTournoi:(id)=>sbTP(`tournois_potes?id=eq.${id}&select=*`).then(r=>r?.[0]),
  getTournois:(createur_id)=>sbTP(`tournois_potes?createur_id=eq.${createur_id}&order=date.desc&select=*`),
  getTournoisParticipant:(joueur_id)=>{
    // 1) Tournois où je suis inscrit directement (capitaine d'équipe ou joueur solo).
    const parId=sbTP(`tournois_potes_joueurs?joueur_id=eq.${joueur_id}&select=tournoi_id,tournois_potes(*)`).then(r=>(r||[]).map(x=>x.tournois_potes).filter(Boolean));
    // 2) Doublette : mon binôme m'a inscrit → mon id est dans le tableau JSON "membres" (pas dans joueur_id).
    //    Recherche par contenance JSON (cs) pour que le tournoi apparaisse AUSSI chez le 2e binôme.
    const filtreMembre="cs."+encodeURIComponent(`[{"id":"${joueur_id}"}]`);
    const parMembre=sbTP(`tournois_potes_joueurs?membres=${filtreMembre}&select=tournoi_id,tournois_potes(*)`).then(r=>(r||[]).map(x=>x.tournois_potes).filter(Boolean)).catch(()=>[]); // repli si la colonne "membres" n'existe pas
    return Promise.all([parId,parMembre]).then(([a,b])=>[...a,...b]);
  },
  getTournoiByCode:(code)=>sbTP(`tournois_potes?code=eq.${encodeURIComponent(code)}&select=*`).then(r=>r?.[0]),
  createTournoi:(d)=>sbTP("tournois_potes",{method:"POST",body:JSON.stringify(d)}).then(r=>r?.[0]),
  updateTournoi:(id,d)=>sbTP(`tournois_potes?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(d),prefer:"return=minimal"}),
  getJoueurs:(tid)=>sbTP(`tournois_potes_joueurs?tournoi_id=eq.${tid}&order=groupe.asc,ordre.asc&select=*`),
  addJoueur:(d)=>sbTP("tournois_potes_joueurs",{method:"POST",body:JSON.stringify(d)}).then(r=>r?.[0]),
  updateJoueur:(id,d)=>sbTP(`tournois_potes_joueurs?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(d),prefer:"return=minimal"}),
  removeJoueur:(id)=>sbTP(`tournois_potes_joueurs?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}),
  getMatchs:(tid)=>sbTP(`tournois_potes_matchs?tournoi_id=eq.${tid}&order=round_bracket.asc,position_bracket.asc&select=*`),
  addMatchs:(arr)=>sbTP("tournois_potes_matchs",{method:"POST",body:JSON.stringify(arr)}),
  updateMatch:(id,d)=>sbTP(`tournois_potes_matchs?id=eq.${id}`,{method:"PATCH",body:JSON.stringify(d),prefer:"return=minimal"}),
  // Supprime le TABLEAU seulement. On garde les poules ET les barrages 701 : ces 701 ont été joués
  // pour de vrai par les équipes, et "Revenir aux poules" est justement la porte de sortie quand le
  // tableau pose problème — les effacer obligeait à refaire jouer les barrages devant tout le club,
  // avec un résultat possiblement différent et donc d'autres qualifiés.
  deleteMatchsTableau:(tid)=>sbTP(`tournois_potes_matchs?tournoi_id=eq.${tid}&phase=not.in.(poules,barrage)`,{method:"DELETE",prefer:"return=minimal"}),
  getAmis:(id)=>sbTP(`amis?or=(joueur_id.eq.${id},ami_id.eq.${id})&statut=eq.accepte&select=*`),
  deleteTournoi:(id)=>sbTP(`tournois_potes?id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}),
};

// ── COULEURS ─────────────────────────────────────────────────────────────────
const CT = {
  bg:"#0f0f0f",card:"#1a1a1a",border:"#2a2a2a",
  accent:"#f97316",text:"#f1f5f9",muted:"#94a3b8",
  green:"#22c55e",red:"#ef4444",yellow:"#f59e0b",purple:"#a78bfa",blue:"#60a5fa",
};

// ── UI ────────────────────────────────────────────────────────────────────────
const Btn=({children,onClick,variant="primary",style={},disabled=false,small=false})=>{
  const v={primary:{background:CT.accent,color:"#fff",border:"none"},ghost:{background:"transparent",color:CT.accent,border:`1px solid ${CT.accent}`},dark:{background:CT.card,color:CT.text,border:`1px solid ${CT.border}`},danger:{background:"#7f1d1d",color:CT.red,border:`1px solid ${CT.red}44`},success:{background:"#14532d",color:CT.green,border:`1px solid ${CT.green}44`},yellow:{background:"#78350f",color:CT.yellow,border:`1px solid ${CT.yellow}44`}};
  return <button onClick={disabled?undefined:onClick} style={{cursor:disabled?"not-allowed":"pointer",borderRadius:8,fontWeight:600,fontSize:small?12:14,padding:small?"6px 12px":"10px 20px",transition:"all .15s",opacity:disabled?.5:1,...v[variant],...style}}>{children}</button>;
};
const Badge=({children,color=CT.accent})=><span style={{background:color+"22",color,border:`1px solid ${color}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{children}</span>;
const Card=({children,style={}})=><div style={{background:CT.card,border:`1px solid ${CT.border}`,borderRadius:12,padding:18,...style}}>{children}</div>;
const Spinner=()=><div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:32,height:32,border:`3px solid ${CT.border}`,borderTop:`3px solid ${CT.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/></div>;

// ── LOGIQUE TOURNOI ───────────────────────────────────────────────────────────
const genCode=()=>Math.random().toString(36).slice(2,8).toUpperCase();

// Determine groups and advancement
const getTournoiConfig=(n)=>{
  if(n<=4)  return{nbGroupes:1,bracket:4};
  if(n<=8)  return{nbGroupes:2,bracket:4};
  if(n<=12) return{nbGroupes:3,bracket:8};
  if(n<=16) return{nbGroupes:4,bracket:8};
  if(n<=20) return{nbGroupes:5,bracket:8};
  return          {nbGroupes:6,bracket:8};
};

// Ordre de placement STANDARD d'un tableau : les têtes de série sont réparties (seed 1 et seed 2
// dans des moitiés opposées → ils ne peuvent se croiser qu'en finale). Ex. taille 8 → [1,8,4,5,2,7,3,6].
const seedOrder=(size)=>{
  let order=[1];
  while(order.length<size){ const n=order.length*2; order=order.flatMap(s=>[s,n+1-s]); }
  return order;
};
// Place les joueurs classés (ranked[0]=meilleur) dans les slots selon l'ordre standard.
// Les seeds manquants (> nb de joueurs) restent null → ce sont les exempts (byes), attribués aux MEILLEURS
// et répartis dans le tableau (jamais 2 exempts collés dans la même paire).
const seedBracket=(ranked,size)=>seedOrder(size).map(s=>ranked[s-1]||null);

// Tirage tenant compte des poules : les 1ers de poule = têtes de série (affrontent des 2es
// d'une AUTRE poule, fort vs faible), et on évite que 2 joueurs d'une même poule se croisent
// au 1er tour. Les exempts (byes) vont aux mieux classés.
const seedPoolAware=(qualifiers,size)=>{
  const byRank=(a,b)=>(b.victoires-a.victoires)||(a.defaites-b.defaites)||((b.manches_pour-b.manches_contre)-(a.manches_pour-a.manches_contre));
  const firsts=qualifiers.filter(q=>q.poolRank===1).sort(byRank);
  const seconds=qualifiers.filter(q=>q.poolRank!==1).sort(byRank);
  const seeded=seedBracket([...firsts,...seconds],size); // têtes de série en haut
  for(let i=0;i<seeded.length;i+=2){
    const a=seeded[i],b=seeded[i+1];
    if(a&&b&&a.groupe===b.groupe){ // derby de poule → on échange
      for(let j=0;j<seeded.length;j+=2){
        if(j===i)continue;
        const c=seeded[j],d=seeded[j+1];
        if(d&&d.groupe!==a.groupe&&c&&c.groupe!==b.groupe){ seeded[i+1]=d; seeded[j+1]=b; break; }
        if(c&&c.groupe!==a.groupe&&d&&d.groupe!==b.groupe){ seeded[i+1]=c; seeded[j]=b; break; }
      }
    }
  }
  return seeded;
};

// Phase name from round and total rounds
const phaseName=(round,totalRounds)=>{
  const fromFinal=totalRounds-round;
  if(fromFinal===0)return"finale";
  if(fromFinal===1)return"demi";
  if(fromFinal===2)return"quart";
  if(fromFinal===3)return"huitieme";
  return"seizieme";
};
const ROUND_LABEL={seizieme:"16es de finale",huitieme:"8es de finale",quart:"Quarts de finale",demi:"Demi-finales",finale:"Finale",petite_finale:"Petite finale (3e place)",consolante:"Consolante"};
const MAIN_PHASES=["seizieme","huitieme","quart","demi","finale"];
const roundsForBracket=(size)=>{ const tr=Math.log2(size); const a=[]; for(let r=1;r<=tr;r++)a.push(phaseName(r,tr)); return a; };

// Generate all poule matches (round-robin)
const genPouleMatchs=(joueurs,groupe,tournoi_id,manches=2)=>{
  const matchs=[];
  for(let i=0;i<joueurs.length;i++){
    for(let j=i+1;j<joueurs.length;j++){
      matchs.push({tournoi_id,joueur1_id:joueurs[i].id,joueur2_id:joueurs[j].id,score1:0,score2:0,phase:"poules",groupe,statut:"en_attente",round_bracket:0,position_bracket:i*100+j,manches_max:manches});
    }
  }
  return matchs;
};

// Generate bracket matches from ordered seeded list
// opts : { consolante:bool (repêchage des perdants du 1er tour), petiteFinale:bool (3e place) }
const genBracketMatchs=(seeded,tournoi_id,manchesMap={},opts={})=>{
  const n=seeded.length; // power of 2
  const totalRounds=Math.log2(n);
  const mm=(phase)=>manchesMap[phase]||(phase==="finale"?5:2);
  const matchs=[];
  // Round 1
  for(let pos=0;pos<n/2;pos++){
    const j1=seeded[pos*2];
    const j2=seeded[pos*2+1];
    const phase=phaseName(1,totalRounds);
    const statut=j1&&j2?"en_attente":j1?"bye_j2":j2?"bye_j1":"vide";
    matchs.push({tournoi_id,joueur1_id:j1?.id||null,joueur2_id:j2?.id||null,score1:0,score2:0,gagnant_id:j1&&!j2?j1.id:j2&&!j1?j2.id:null,phase,groupe:0,statut,round_bracket:1,position_bracket:pos,manches_max:mm(phase)});
  }
  // Subsequent rounds (empty placeholders)
  for(let r=2;r<=totalRounds;r++){
    const nb=n/Math.pow(2,r);
    const phase=phaseName(r,totalRounds);
    for(let pos=0;pos<nb;pos++){
      matchs.push({tournoi_id,joueur1_id:null,joueur2_id:null,score1:0,score2:0,gagnant_id:null,phase,groupe:0,statut:"attente_avancement",round_bracket:r,position_bracket:pos,manches_max:mm(phase)});
    }
  }
  // Petite finale (3e place) : remplie par les 2 perdants des demies. Même colonne que la finale (position 1).
  // On ne la crée QUE si les deux demies auront un VRAI perdant : un exempt n'a pas de perdant, donc la case
  // resterait vide à vie et "Terminer le tournoi" répondrait éternellement "tous les matchs ne sont pas finis".
  const demiesAurontDeuxPerdants=(()=>{
    if(totalRounds<2)return false;
    const r1=matchs.filter(m=>m.round_bracket===1);
    if(r1.some(m=>m.statut==="vide"))return false;                  // case morte : un tour n'aura pas 2 alimentateurs
    if(totalRounds===2)return r1.every(m=>m.statut==="en_attente"); // les demies SONT le 1er tour → aucun exempt admis
    return true;                                                     // demies alimentées par des vainqueurs → 2 perdants
  })();
  if(opts.petiteFinale&&demiesAurontDeuxPerdants){
    matchs.push({tournoi_id,joueur1_id:null,joueur2_id:null,score1:0,score2:0,gagnant_id:null,phase:"petite_finale",groupe:0,statut:"attente_avancement",round_bracket:totalRounds,position_bracket:1,manches_max:mm("petite_finale")});
  }
  // (La consolante n'est PLUS générée ici : c'est un tableau séparé alimenté par les milieux de poule — voir genConsolanteMatchs.)
  return matchs;
};

// Consolante = tableau séparé pour les nbConso PREMIÈRES équipes NON qualifiées de chaque poule
// (voir lancerEliminatoires : jG.slice(nbQual,nbQual+nbConso)). ATTENTION : il n'y a AUCUNE exclusion
// de la dernière de poule — avec des poules de 4, 2 qualifiés et 2 repêchés, la dernière rejoue ici.
// VRAI TABLEAU à taille puissance de 2, comme le tableau principal : TOUS les exempts sont au 1er tour
// et vont aux MIEUX classés (seedBracket). Chaque branche demande donc le même nombre de victoires.
// Avant, on appariait au maximum au 1er tour puis on réduisait par ceil(cases/2) : les exempts
// apparaissaient aux tours SUIVANTS, au petit bonheur, et une branche pouvait gagner la consolante en
// 2 victoires là où les autres en demandaient 4 (mesuré sur 13 tirages sur 20).
const genConsolanteMatchs=(teams,tournoi_id,manches=2)=>{
  const N=teams.length; // vraies équipes ordonnées (meilleures d'abord), SANS null
  if(N<2)return [];
  let size=2; while(size<N)size*=2;              // taille du tableau = puissance de 2 immédiatement ≥ N
  const seeded=seedBracket(teams,size);          // exempts (slots manquants) attribués aux mieux classés
  const totalRounds=Math.log2(size);
  const matchs=[];
  // Tour 1 : paires (graine s contre graine size+1-s). Comme size/2 < N ≤ size, aucune paire n'est vide
  // des deux côtés → aucune case morte, et le tableau va toujours jusqu'au bout.
  for(let pos=0;pos<size/2;pos++){
    const j1=seeded[pos*2], j2=seeded[pos*2+1];
    const statut=j1&&j2?"en_attente":j1?"bye_j2":j2?"bye_j1":"vide";
    matchs.push({tournoi_id,joueur1_id:j1?.id||null,joueur2_id:j2?.id||null,score1:0,score2:0,gagnant_id:j1&&!j2?j1.id:j2&&!j1?j2.id:null,phase:"consolante",groupe:0,statut,round_bracket:1,position_bracket:pos,manches_max:manches});
  }
  // Tours suivants : cases vides, alimentées par floor(pos/2) — exactement 2 alimentateurs chacune.
  for(let r=2;r<=totalRounds;r++){
    const nb=size/Math.pow(2,r);
    for(let pos=0;pos<nb;pos++){
      matchs.push({tournoi_id,joueur1_id:null,joueur2_id:null,score1:0,score2:0,gagnant_id:null,phase:"consolante",groupe:0,statut:"attente_avancement",round_bracket:r,position_bracket:pos,manches_max:manches});
    }
  }
  return matchs;
};

// Après un match de tableau : avance le vainqueur ET route le perdant
// (perdant du 1er tour → consolante ; perdant de demie → petite finale).
const avancerApresMatch=async(match,gagnant_id,allMatchs)=>{
  const perdant_id=match.joueur1_id===gagnant_id?match.joueur2_id:match.joueur1_id;
  const r=match.round_bracket, nextPos=Math.floor(match.position_bracket/2), slotIsJ1=match.position_bracket%2===0;
  const placer=async(target,asJ1,joueur_id)=>{
    if(!target||!joueur_id)return;
    const patch=asJ1?{joueur1_id:joueur_id}:{joueur2_id:joueur_id};
    const otherFilled=asJ1?target.joueur2_id:target.joueur1_id;
    await dbTP.updateMatch(target.id,{...patch,statut:otherFilled?"en_attente":"attente_avancement"});
  };
  // Consolante : avance le vainqueur dans la consolante (perdant éliminé)
  if(match.phase==="consolante"){
    await placer(allMatchs.find(m=>m.phase==="consolante"&&m.round_bracket===r+1&&m.position_bracket===nextPos),slotIsJ1,gagnant_id);
    return;
  }
  if(match.phase==="petite_finale")return; // terminal (3e place)
  if(match.phase==="finale")return; // terminal — le tournoi ne se clôture PAS tout seul : le créateur clique "Clôturer"/"Terminer" quand la 3e place et la consolante sont finies
  // Tableau principal : avance le vainqueur au tour suivant
  await placer(allMatchs.find(m=>MAIN_PHASES.includes(m.phase)&&m.round_bracket===r+1&&m.position_bracket===nextPos),slotIsJ1,gagnant_id);
  // Routage du perdant : SEUL le perdant de demi-finale va en petite finale.
  // (La consolante n'est plus alimentée par le tableau : c'est un tableau séparé rempli par les milieux de poule.)
  const finaleMatch=allMatchs.find(m=>m.phase==="finale");
  const finaleRound=finaleMatch?finaleMatch.round_bracket:r;
  if(r===finaleRound-1){
    const petite=allMatchs.find(m=>m.phase==="petite_finale");
    if(petite){ await placer(petite,slotIsJ1,perdant_id); }
  }
};

// Cases du tableau à corriger si on INVERSE le vainqueur d'un match déjà terminé (mêmes cibles que
// avancerApresMatch, mais renvoyées pour vérif/patch). {target, slotJ1, val} : val = joueur à mettre dans la case.
const ciblesAvancement=(match,nouveauGagnant,allMatchs)=>{
  const r=match.round_bracket, nextPos=Math.floor(match.position_bracket/2), slotJ1=match.position_bracket%2===0;
  const nouveauPerdant=match.joueur1_id===nouveauGagnant?match.joueur2_id:match.joueur1_id;
  const cibles=[];
  if(match.phase==="consolante"){
    const t=allMatchs.find(m=>m.phase==="consolante"&&m.round_bracket===r+1&&m.position_bracket===nextPos);
    if(t)cibles.push({target:t,slotJ1,val:nouveauGagnant});
    return cibles;
  }
  if(match.phase==="petite_finale"||match.phase==="finale")return cibles; // terminal → aucune suite
  const principal=allMatchs.find(m=>MAIN_PHASES.includes(m.phase)&&m.round_bracket===r+1&&m.position_bracket===nextPos);
  if(principal)cibles.push({target:principal,slotJ1,val:nouveauGagnant});
  const finaleMatch=allMatchs.find(m=>m.phase==="finale");
  const finaleRound=finaleMatch?finaleMatch.round_bracket:r;
  if(r===finaleRound-1){
    const petite=allMatchs.find(m=>m.phase==="petite_finale");
    if(petite)cibles.push({target:petite,slotJ1,val:nouveauPerdant}); // le perdant (corrigé) va en petite finale
  }
  return cibles;
};

// Fait AVANCER tous les exempts (byes) du tableau jusqu'a ce qu'il n'en reste plus.
// Re-lit les matchs a CHAQUE etape (jamais de donnee perimee), et marque chaque bye "termine".
// Idempotent : peut etre relance sans risque (sert au lancement ET en auto-reparation).
const propagerByes=async(tid)=>{
  let secu=0;
  while(secu<64){
    secu++;
    const fresh=await dbTP.getMatchs(tid);
    // (1) Exempt classique : statut "bye_*" (généré au 1er tour).
    let bye=(fresh||[]).find(m=>typeof m.statut==="string"&&m.statut.startsWith("bye")&&m.gagnant_id);
    let gag=bye?bye.gagnant_id:null;
    // (2) Exempt ÉMERGENT de consolante : une case (tour ≥2) avec UN SEUL joueur qui n'aura jamais d'adversaire
    //     (nombre impair de matchs au tour précédent → un seul alimentateur). On la fait avancer d'office.
    if(!bye){
      bye=(fresh||[]).find(m=>{
        if(m.phase!=="consolante"||m.statut==="termine"||(m.round_bracket||0)<=1)return false;
        const seul=(m.joueur1_id&&!m.joueur2_id)||(m.joueur2_id&&!m.joueur1_id);
        if(!seul)return false;
        const alim=(fresh||[]).filter(x=>x.phase==="consolante"&&x.round_bracket===m.round_bracket-1&&Math.floor((x.position_bracket||0)/2)===m.position_bracket).length;
        return alim<2; // moins de 2 alimentateurs → le 2e slot restera vide → exempt
      });
      if(bye)gag=bye.joueur1_id||bye.joueur2_id;
    }
    if(!bye||!gag)break;
    await avancerApresMatch(bye,gag,fresh);
    await dbTP.updateMatch(bye.id,{statut:"termine",gagnant_id:gag});
  }
};

// Classement de poule + barrages 701 → extraits dans ./barrage.js (fonctions pures, testées par barrage.test.mjs).
// rankGroup et egalitesADepartager sont importés en tête de fichier.

// Planning des cibles : renvoie l'ensemble des ids de matchs à jouer MAINTENANT.
// Au plus nbCibles matchs en même temps, jamais un même joueur sur 2 cibles à la fois.
// Priorité aux matchs dont les joueurs ont le moins joué (pour que tout le monde joue, peu d'attente).
const matchsSurCibles=(pending,nbCibles,allMatchs,live=null)=>{
  // Historique : combien chaque joueur a joué, et depuis quand il n'a pas joué (pour la rotation)
  const termines=[...allMatchs].filter(m=>m.statut==="termine").sort((a,b)=>new Date(a.date_fin||0)-new Date(b.date_fin||0));
  const played={}, lastIdx={};
  termines.forEach((m,idx)=>{ [m.joueur1_id,m.joueur2_id].forEach(id=>{ if(id!=null){ played[id]=(played[id]||0)+1; lastIdx[id]=idx; } }); });
  const nbT=termines.length;
  const attente=(id)=> lastIdx[id]===undefined ? nbT+1 : nbT-lastIdx[id]; // grand = attend depuis longtemps (jamais joué = max)
  const cmp=(a,b)=>{
    const pa=(played[a.joueur1_id]||0)+(played[a.joueur2_id]||0), pb=(played[b.joueur1_id]||0)+(played[b.joueur2_id]||0);
    if(pa!==pb)return pa-pb;                                                                  // 1) le moins joué d'abord → tout le monde joue
    const wa=Math.max(attente(a.joueur1_id),attente(a.joueur2_id)), wb=Math.max(attente(b.joueur1_id),attente(b.joueur2_id));
    if(wa!==wb)return wb-wa;                                                                  // 2) celui qui attend depuis le + longtemps passe
    return (a.position_bracket||0)-(b.position_bracket||0);                                   // 3) ordre stable
  };
  const ordered=[...pending].sort(cmp);
  const busy=new Set(), actifs=new Set();
  // Un joueur "occupé" = il est en train de scorer un match EN LIVE (live_sessions en_cours).
  const occupe=(id)=> !!live&&!!live.occ&&(live.occ.has(id)||live.occ.has(String(id)));
  const enCours=(m)=> !!live&&!!live.pairs&&live.pairs.has([String(m.joueur1_id),String(m.joueur2_id)].sort().join("|"));
  // 0) On VERROUILLE les matchs déjà en cours (les 2 joueurs scorent le même match) : ils restent
  //    actifs et leurs joueurs occupés → un match en cours ne disparaît pas de l'affichage.
  for(const m of ordered){
    if(enCours(m)&&!busy.has(m.joueur1_id)&&!busy.has(m.joueur2_id)){
      actifs.add(m.id); busy.add(m.joueur1_id); busy.add(m.joueur2_id);
    }
  }
  // 0bis) Tout joueur occupé (même sur un autre match) est indisponible → on ne le rappellera jamais.
  for(const m of ordered){
    if(occupe(m.joueur1_id))busy.add(m.joueur1_id);
    if(occupe(m.joueur2_id))busy.add(m.joueur2_id);
  }
  // 1) On remplit les cibles restantes avec des matchs dont les 2 joueurs sont disponibles.
  for(const m of ordered){
    if(actifs.size>=nbCibles)break;
    if(actifs.has(m.id))continue;
    if(busy.has(m.joueur1_id)||busy.has(m.joueur2_id))continue;                               // jamais 2 fois le même joueur en même temps
    actifs.add(m.id); busy.add(m.joueur1_id); busy.add(m.joueur2_id);
  }
  return actifs;
};

// Combien des matchs élus par le planning sont DÉJÀ EN COURS (un scoreur est ouvert sur un téléphone).
// Sert UNIQUEMENT à l'affichage : la boucle 0 ci-dessus verrouille volontairement les matchs commencés
// SANS plafond (un match commencé ne doit pas disparaître de l'écran). Du coup, si l'organisateur baisse
// le nombre de cibles pendant une partie, actifs.size peut dépasser le nombre de cibles et l'écran
// annonçait « 3 à jouer maintenant » avec 2 cibles. On sépare donc « à lancer » et « en cours ».
const compterEnCours=(liste,actifs,live)=>{
  if(!live||!live.pairs)return 0;
  return liste.filter(m=>actifs.has(m.id)&&live.pairs.has([String(m.joueur1_id),String(m.joueur2_id)].sort().join("|"))).length;
};

// Vrai tirage au sort (Fisher-Yates) : mélange UNIFORME.
// (sort(()=>Math.random()-.5) est biaisé et garde souvent l'ordre de départ sur de petits groupes.)
const melangerAleatoire=(arr)=>{
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
};

// ── MODAL SAISIE SCORE ────────────────────────────────────────────────────────
const MatchModal=({match,joueurs,onSave,onClose})=>{
  const j1=joueurs.find(j=>j.id===match.joueur1_id);
  const j2=joueurs.find(j=>j.id===match.joueur2_id);
  const max=match.manches_max||2;
  const win=max; // manches_max = cible à atteindre (2 manches gagnantes, ou 5 en finale)
  const isEdit=match.statut==="termine"; // correction d'un match déjà joué
  const [s1,setS1]=useState(match.score1||0);
  const [s2,setS2]=useState(match.score2||0);
  const [saving,setSaving]=useState(false);

  const validScore=s1!==s2&&(s1===win||s2===win);

  const handleSave=async()=>{
    if(!validScore)return;
    setSaving(true);
    await onSave(match,s1,s2);
    setSaving(false);
    onClose();
  };

  return(
    <div style={{position:"fixed",inset:0,background:"#000a",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <Card style={{width:"100%",maxWidth:400,position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:12,right:12,background:"none",border:"none",color:CT.muted,cursor:"pointer",display:"inline-flex"}}><EmoIcon e="✕" size={18}/></button>
        <h3 style={{fontWeight:700,fontSize:16,marginBottom:4}}><EmoText s={isEdit?"✏️ Corriger le score":"⚔️ Saisir le score"} size={16}/></h3>
        <p style={{fontSize:12,color:CT.muted,marginBottom:20}}>
          {isEdit?"Corrige le nombre de manches gagnées — le classement sera recalculé.":match.phase==="finale"?"Finale — premier à gagner 5 manches":`Premier à gagner ${win} manche${win>1?"s":""}`}
        </p>
        <div style={{display:"flex",alignItems:"center",gap:16,justifyContent:"center",marginBottom:20}}>
          {/* Joueur 1 */}
          <div style={{textAlign:"center",flex:1}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:10,color:CT.accent}}>{j1?.nom||"?"}</div>
            <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setS1(Math.max(0,s1-1))} style={{width:32,height:32,borderRadius:6,background:CT.card,border:`1px solid ${CT.border}`,color:CT.text,cursor:"pointer",fontSize:18,fontWeight:700}}>−</button>
              <span style={{fontSize:36,fontWeight:800,minWidth:40,textAlign:"center",color:s1===win?CT.green:CT.text}}>{s1}</span>
              <button onClick={()=>setS1(Math.min(win,s1+1))} style={{width:32,height:32,borderRadius:6,background:CT.card,border:`1px solid ${CT.border}`,color:CT.text,cursor:"pointer",fontSize:18,fontWeight:700}}>+</button>
            </div>
          </div>
          <span style={{fontSize:20,color:CT.muted,fontWeight:800}}>–</span>
          {/* Joueur 2 */}
          <div style={{textAlign:"center",flex:1}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:10,color:CT.blue}}>{j2?.nom||"?"}</div>
            <div style={{display:"flex",alignItems:"center",gap:10,justifyContent:"center"}}>
              <button onClick={()=>setS2(Math.max(0,s2-1))} style={{width:32,height:32,borderRadius:6,background:CT.card,border:`1px solid ${CT.border}`,color:CT.text,cursor:"pointer",fontSize:18,fontWeight:700}}>−</button>
              <span style={{fontSize:36,fontWeight:800,minWidth:40,textAlign:"center",color:s2===win?CT.green:CT.text}}>{s2}</span>
              <button onClick={()=>setS2(Math.min(win,s2+1))} style={{width:32,height:32,borderRadius:6,background:CT.card,border:`1px solid ${CT.border}`,color:CT.text,cursor:"pointer",fontSize:18,fontWeight:700}}>+</button>
            </div>
          </div>
        </div>
        {!validScore&&<p style={{textAlign:"center",color:CT.muted,fontSize:12,marginBottom:12}}>Un joueur doit atteindre {win} manche{win>1?"s":""}</p>}
        <Btn onClick={handleSave} disabled={!validScore||saving} style={{width:"100%"}}>
          {saving?"Enregistrement…":<EmoText s="✅ Valider le score" size={14}/>}
        </Btn>
      </Card>
    </div>
  );
};

// ── Scanner QR pour inscrire des joueurs (option C : l'orga scanne les profils) ──
const QRScanModal=({onAdd,dejaIds,onClose})=>{
  const [feedback,setFeedback]=useState("");
  const [erreurCam,setErreurCam]=useState("");
  const scannedRef=useRef(new Set((dejaIds||[]).map(String)));
  const lockRef=useRef(0);
  useEffect(()=>{
    let qr,stopped=false;
    (async()=>{
      try{
        const {Html5Qrcode}=await import("html5-qrcode");
        if(stopped)return;
        qr=new Html5Qrcode("qr-reader");
        await qr.start({facingMode:"environment"},{fps:10,qrbox:{width:230,height:230}},
          (decoded)=>{
            const now=Date.now(); if(now-lockRef.current<1200)return; lockRef.current=now;
            let data; try{data=JSON.parse(decoded);}catch{ setFeedback("⚠️ QR non valide"); return; }
            if(!data||data.app!=="dartpoint"||!data.id){ setFeedback("⚠️ Ce n'est pas un QR de profil DartPoint"); return; }
            if(scannedRef.current.has(String(data.id))){ setFeedback(`⚠️ ${data.pseudo||"Ce joueur"} est déjà inscrit`); return; }
            scannedRef.current.add(String(data.id));
            try{ onAdd(data.pseudo||"Joueur",data.id); setFeedback(`✅ ${data.pseudo||"Joueur"} ajouté !`); }
            catch(e){ setFeedback("Erreur lors de l'ajout"); }
          },
          ()=>{}
        );
      }catch(e){ setErreurCam("Caméra inaccessible (code : "+(e?.name||e?.message||"inconnu")+"). Vérifie l'autorisation Appareil photo, puis réessaie."); }
    })();
    return()=>{ stopped=true; if(qr){ try{ qr.stop().then(()=>qr.clear()).catch(()=>{}); }catch(e){} } };
  },[]); // eslint-disable-line
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000ee",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#15151c",border:`1px solid ${CT.border}`,borderRadius:18,padding:18,maxWidth:380,width:"100%",textAlign:"center"}}>
        <h3 style={{fontWeight:800,fontSize:17,marginBottom:4,color:"#fff"}}><EmoText s="📲 Scanner un joueur" size={16}/></h3>
        <p style={{color:CT.muted,fontSize:12,lineHeight:1.5,marginBottom:12}}>Vise le QR code du profil d'un joueur (Profil → icône QR en haut à droite). Tu peux en scanner plusieurs à la suite.</p>
        {erreurCam
          ? <div style={{color:"#fca5a5",fontSize:13,padding:"24px 8px",lineHeight:1.5}}>{erreurCam}</div>
          : <div id="qr-reader" style={{width:"100%",borderRadius:12,overflow:"hidden"}}/>}
        {feedback&&<div style={{marginTop:12,fontWeight:700,fontSize:14,color:feedback.startsWith("✅")?CT.green:CT.yellow}}>{feedback}</div>}
        <button onClick={onClose} style={{marginTop:14,width:"100%",background:CT.accent,color:"#fff",border:"none",borderRadius:10,padding:"12px",fontWeight:800,fontSize:15,cursor:"pointer",touchAction:"manipulation"}}>Terminer</button>
      </div>
    </div>
  );
};

// ── Scanner le QR d'un TOURNOI (pour le rejoindre) ──
const ScanTournoiModal=({onScan,onClose})=>{
  const [feedback,setFeedback]=useState("");
  const [erreurCam,setErreurCam]=useState("");
  const lockRef=useRef(0);
  useEffect(()=>{
    let qr,stopped=false;
    (async()=>{
      try{
        const {Html5Qrcode}=await import("html5-qrcode");
        if(stopped)return;
        qr=new Html5Qrcode("qr-reader-tournoi");
        await qr.start({facingMode:"environment"},{fps:10,qrbox:{width:230,height:230}},
          (decoded)=>{
            const now=Date.now(); if(now-lockRef.current<1500)return; lockRef.current=now;
            const m=String(decoded).match(/#t=([0-9a-fA-F-]{6,})/);
            const id=m?m[1]:null;
            if(!id){ setFeedback("⚠️ Ce n'est pas un QR de tournoi DartPoint"); return; }
            setFeedback("✅ Tournoi trouvé — ouverture…");
            setTimeout(()=>onScan(id),400);
          },
          ()=>{}
        );
      }catch(e){ setErreurCam("Caméra inaccessible (code : "+(e?.name||e?.message||"inconnu")+"). Vérifie l'autorisation Appareil photo, puis réessaie."); }
    })();
    return()=>{ stopped=true; if(qr){ try{ qr.stop().then(()=>qr.clear()).catch(()=>{}); }catch(e){} } };
  },[]); // eslint-disable-line
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000ee",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#15151c",border:`1px solid ${CT.border}`,borderRadius:18,padding:18,maxWidth:380,width:"100%",textAlign:"center"}}>
        <h3 style={{fontWeight:800,fontSize:17,marginBottom:4,color:"#fff"}}><EmoText s="📷 Scanner un tournoi" size={16}/></h3>
        <p style={{color:CT.muted,fontSize:12,lineHeight:1.5,marginBottom:12}}>Vise le QR code affiché par l'organisateur pour rejoindre son tournoi.</p>
        {erreurCam
          ? <div style={{color:"#fca5a5",fontSize:13,padding:"24px 8px",lineHeight:1.5}}>{erreurCam}</div>
          : <div id="qr-reader-tournoi" style={{width:"100%",borderRadius:12,overflow:"hidden"}}/>}
        {feedback&&<div style={{marginTop:12,fontWeight:700,fontSize:14,color:feedback.startsWith("✅")?CT.green:CT.yellow}}>{feedback}</div>}
        <button onClick={onClose} style={{marginTop:14,width:"100%",background:CT.accent,color:"#fff",border:"none",borderRadius:10,padding:"12px",fontWeight:800,fontSize:15,cursor:"pointer",touchAction:"manipulation"}}>Fermer</button>
      </div>
    </div>
  );
};

// ── Modal PARTAGE : QR + lien (spectateurs) + code joueur / saisie du code ──
const ShareTournoiModal=({tournoi,canPlay,onUnlock,onClose})=>{
  const lien=`${window.location.origin}${window.location.pathname}#t=${tournoi.id}`;
  const [qr,setQr]=useState("");
  useEffect(()=>{ QRCode.toDataURL(lien,{width:220,margin:1,color:{dark:"#000000",light:"#ffffff"}}).then(setQr).catch(()=>{}); },[lien]);
  const [copied,setCopied]=useState(false);
  const copy=()=>{navigator.clipboard.writeText(lien).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);}).catch(()=>{});};
  const estLocalhost=/localhost|127\.0\.0\.1|:5173/.test(lien);
  const [code,setCode]=useState(""); const [err,setErr]=useState("");
  const valider=()=>{ if(code.trim().toUpperCase()===(tournoi.code||"").toUpperCase())onUnlock(); else setErr("Code incorrect"); };
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000e6",zIndex:99999,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#15151c",border:`1px solid ${CT.border}`,borderRadius:18,padding:22,maxWidth:400,width:"100%",margin:"auto"}}>
        <h3 style={{fontWeight:800,fontSize:18,marginBottom:14,color:"#fff",textAlign:"center"}}><EmoText s="📲 Partager le tournoi" size={17}/></h3>
        {qr&&<div style={{display:"flex",justifyContent:"center",marginBottom:12}}><img src={qr} alt="QR du tournoi" style={{width:176,height:176,borderRadius:12,background:"#fff",padding:8}}/></div>}
        <div style={{fontSize:12,fontWeight:700,color:CT.text,marginBottom:6}}>Lien (pour les spectateurs)</div>
        <div style={{display:"flex",gap:8,marginBottom:6}}>
          <div style={{flex:1,fontSize:11,color:CT.muted,wordBreak:"break-all",background:"#111",borderRadius:8,padding:"8px 10px",fontFamily:"monospace"}}>{lien}</div>
          <Btn onClick={copy} variant="ghost" small>{copied?<EmoText s="✅" size={13}/>:<EmoText s="📋" size={13}/>}</Btn>
        </div>
        {estLocalhost&&<div style={{fontSize:10.5,color:"#eab308",marginBottom:8,fontWeight:600,lineHeight:1.4}}>⚠️ Adresse locale — ouvre la version en ligne pour un QR scannable par les téléphones.</div>}
        <div style={{fontSize:11.5,color:CT.muted,marginBottom:16,lineHeight:1.45}}>Avec ce lien/QR on peut <b>regarder</b> le tournoi (spectateur). Pour <b>jouer et marquer les scores</b>, il faut le <b>code joueur</b>.</div>
        {canPlay?(
          <div style={{background:CT.accent+"11",border:`1px solid ${CT.accent}44`,borderRadius:12,padding:"12px 14px",textAlign:"center"}}>
            <div style={{fontSize:11.5,color:CT.muted,marginBottom:4}}><EmoIcon e="🔑" size={12} style={{verticalAlign:"-1px",marginRight:3}}/>Code joueur — à donner aux joueurs</div>
            <div style={{fontWeight:900,fontSize:26,letterSpacing:4,color:CT.yellow}}>{tournoi.code}</div>
          </div>
        ):(
          <div style={{background:CT.accent+"11",border:`1px solid ${CT.accent}44`,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:12.5,fontWeight:700,color:CT.text,marginBottom:8}}>🎯 Tu es un joueur ? Entre le code (donné par l'organisateur) pour marquer les scores :</div>
            <div style={{display:"flex",gap:8}}>
              <input value={code} onChange={e=>{setCode(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&valider()} placeholder="Code…" style={{flex:1,background:"#111",border:`1px solid ${err?"#ef4444":CT.border}`,borderRadius:8,padding:"9px 13px",color:CT.text,fontSize:15,letterSpacing:2,textTransform:"uppercase"}}/>
              <Btn onClick={valider} small>Valider</Btn>
            </div>
            {err&&<div style={{fontSize:11.5,color:"#ef4444",marginTop:6,fontWeight:600}}>{err}</div>}
          </div>
        )}
        <button onClick={onClose} style={{width:"100%",marginTop:14,background:"none",border:"none",color:CT.muted,fontSize:13,cursor:"pointer",padding:8}}>Fermer</button>
      </div>
    </div>
  );
};


// ── VUE LOBBY ─────────────────────────────────────────────────────────────────
const LobbyView=({tournoi,joueurs,isCreateur,onStart,onAddJoueur,onRemoveJoueur,joueurConnecte,onRejoindre})=>{
  const [nom,setNom]=useState("");
  const [nom2,setNom2]=useState("");           // doublette : 2e joueur de l'équipe (ajout manuel)
  const [equipeNom,setEquipeNom]=useState(""); // doublette : nom d'équipe (optionnel)
  const [adding,setAdding]=useState(false);
  const [amis,setAmis]=useState([]);
  const [addingAmi,setAddingAmi]=useState(null); // id de l'ami en cours d'ajout
  const [scanOpen,setScanOpen]=useState(false);
  const [amisOuvert,setAmisOuvert]=useState(false); // liste d'amis repliée par défaut (menu déroulant)

  // Charger la liste d'amis (créateur : pour inviter ; joueur : pour choisir son binôme)
  useEffect(()=>{
    if(!joueurConnecte)return;
    dbTP.getAmis(joueurConnecte.id).then(rows=>{
      if(!rows)return;
      const parsed=rows.map(r=>{
        const estSender=r.joueur_id===joueurConnecte.id;
        return{id:estSender?r.ami_id:r.joueur_id,pseudo:estSender?r.ami_pseudo:r.joueur_pseudo};
      });
      setAmis(parsed);
    }).catch(()=>{});
  },[joueurConnecte]);

  // (B) Si la ligne qu'on avait mémorisée (dp_tp_myrow) n'existe plus dans la liste chargée,
  // c'est que l'organisateur nous a retirés : on nettoie les clés et on ré-affiche le formulaire "Rejoindre".
  useEffect(()=>{
    if(tournoi.statut!=="attente")return; // on ne "dé-inscrit" que dans le lobby (une fois lancé, l'absence de ligne est normale)
    let myRow=null;
    try{ myRow=localStorage.getItem("dp_tp_myrow_"+tournoi.id); }catch(e){}
    if(!myRow)return;                         // pas d'inscription mémorisée avec identifiant de ligne
    if(!joueurs||joueurs.length===0)return;   // liste pas encore chargée : on ne conclut rien
    const encoreLa=joueurs.some(j=>String(j.id)===String(myRow));
    if(!encoreLa){
      try{ localStorage.removeItem("dp_tp_joined_"+tournoi.id); localStorage.removeItem("dp_tp_myrow_"+tournoi.id); }catch(e){}
      setDejaInscrit(false);
      setNomInscrit("");
    }
  },[joueurs,tournoi.id,tournoi.statut]);

  const handleAdd=async()=>{
    if(isDoublette){
      // Ajout d'une ÉQUIPE complète (2 joueurs sans compte) : nom d'équipe optionnel.
      if(!nom.trim()||!nom2.trim())return;
      const membres=[{nom:nom.trim(),id:null},{nom:nom2.trim(),id:null}];
      const teamNom=equipeNom.trim()||`${nom.trim()} & ${nom2.trim()}`;
      setAdding(true);
      await onAddJoueur(teamNom,null,membres);
      setNom("");setNom2("");setEquipeNom("");
      setAdding(false);
      return;
    }
    if(!nom.trim())return;
    setAdding(true);
    await onAddJoueur(nom.trim(),null);
    setNom("");
    setAdding(false);
  };

  const handleAddAmi=async(ami)=>{
    setAddingAmi(ami.id);
    await onAddJoueur(ami.pseudo,ami.id);
    setAddingAmi(null);
  };

  const lien=`${window.location.origin}${window.location.pathname}#t=${tournoi.id}`;
  const [copied,setCopied]=useState(false);
  const copyLien=()=>{navigator.clipboard.writeText(lien).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});};
  const [qrTournoi,setQrTournoi]=useState("");
  useEffect(()=>{ QRCode.toDataURL(lien,{width:220,margin:1,color:{dark:"#000000",light:"#ffffff"}}).then(setQrTournoi).catch(()=>{}); },[lien]);
  const estLocalhost=/localhost|127\.0\.0\.1|:5173/.test(lien);

  const amiDejaAjoute=(amiId)=>joueurs.some(j=>j.joueur_id===amiId);

  // Le lobby n'accepte les inscriptions que tant que le tournoi est en "attente".
  const lobbyOuvert=tournoi.statut==="attente";
  // Inscription (rejoindre) — marche avec OU sans compte (invité)
  const isDoublette=tournoi.format==="doublette";
  const estConnecte=!!joueurConnecte;
  const isParticipant=estConnecte&&joueurs.some(j=>j.joueur_id===joueurConnecte.id||(Array.isArray(j.membres)&&j.membres.some(m=>m&&m.id===joueurConnecte.id)));
  const [dejaInscrit,setDejaInscrit]=useState(()=>{ try{return localStorage.getItem("dp_tp_joined_"+tournoi.id)==="1";}catch(e){return false;} });
  const [nomInscrit,setNomInscrit]=useState("");
  const peutRejoindre=lobbyOuvert&&!isParticipant&&!dejaInscrit; // invité OU joueur connecté non encore inscrit (et pas déjà inscrit cette fois), UNIQUEMENT tant que le lobby est ouvert
  const [teamName,setTeamName]=useState("");
  const [j1Name,setJ1Name]=useState("");       // nom du membre 1 pour un invité (sans compte)
  const [binomeName,setBinomeName]=useState("");
  const [binomeId,setBinomeId]=useState(null);
  const [amiPickerOpen,setAmiPickerOpen]=useState(false);
  const [amiSearch,setAmiSearch]=useState("");
  const [rejoining,setRejoining]=useState(false);
  const [notifOk,setNotifOk]=useState(()=>{ try{return "Notification" in window&&Notification.permission==="granted";}catch(e){return false;} });
  const demanderNotif=()=>{ try{ if("Notification" in window)Notification.requestPermission().then(p=>setNotifOk(p==="granted")); }catch(e){} };
  const membre1Nom=estConnecte?joueurConnecte.pseudo:j1Name.trim();
  const rejoindreValide=isDoublette?(!!membre1Nom&&!!binomeName.trim()&&!!teamName.trim()):!!membre1Nom;
  const handleRejoindre=async()=>{
    if(!rejoindreValide||rejoining||dejaInscrit)return; // une seule inscription
    setRejoining(true);
    try{
      const monId=joueurConnecte?.id||null;
      const nomFinal=isDoublette?teamName.trim():membre1Nom;
      const payload=isDoublette
        ? {nom:nomFinal,joueur_id:monId,membres:[{nom:membre1Nom,id:monId},{nom:binomeName.trim(),id:binomeId||null}]}
        : {nom:nomFinal,joueur_id:monId,membres:null};
      const created=await onRejoindre(payload);
      setNomInscrit(nomFinal);
      setDejaInscrit(true);
      try{
        localStorage.setItem("dp_tp_joined_"+tournoi.id,"1");
        if(created&&created.id)localStorage.setItem("dp_tp_myrow_"+tournoi.id,String(created.id)); // pour la notif "c'est à toi de jouer" (même sans compte)
      }catch(e){}
      try{ if("Notification" in window&&Notification.permission==="default"){ Notification.requestPermission().then(p=>setNotifOk(p==="granted")); } }catch(e){}
    }catch(e){ alert("Erreur : "+(e&&e.message||e)); }
    finally{ setRejoining(false); }
  };

  return(
    <div>
      {/* Rejoindre le tournoi (joueur non inscrit) */}
      {peutRejoindre&&(
        <Card style={{marginBottom:16,background:CT.accent+"11",border:`1px solid ${CT.accent}66`}}>
          {/* Le créateur voit la même carte, mais « Rejoindre » n'a pas de sens pour son propre
              tournoi : on lui parle de PARTICIPER, puisqu'il peut très bien se contenter d'arbitrer. */}
          <h3 style={{fontWeight:800,fontSize:16,marginBottom:4,color:CT.accent,display:"flex",alignItems:"center",gap:6}}><EmoIcon e="🙋" size={16}/>{isCreateur?"Participer au tournoi":"Rejoindre le tournoi"}</h3>
          <p style={{fontSize:12.5,color:CT.muted,marginBottom:14}}>{isCreateur
            ? (isDoublette?"Tu organises ce tournoi. Tu peux aussi y jouer : inscris ton équipe (2 joueurs).":"Tu organises ce tournoi. Tu peux aussi y jouer — sinon, laisse simplement les autres s'inscrire.")
            : (isDoublette?"Tournoi en doublette — inscris ton équipe (2 joueurs).":"Inscris-toi à ce tournoi.")}{!estConnecte&&" Pas besoin de compte."}</p>
          {estConnecte
            ? <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",background:"#111",borderRadius:8,marginBottom:isDoublette?12:14}}>
                <EmoIcon e="👤" size={18} color={CT.accent}/>
                <span style={{flex:1,fontWeight:600,fontSize:14}}>{joueurConnecte.pseudo}</span>
                <Badge color={CT.blue}>Toi</Badge>
              </div>
            : <div style={{marginBottom:isDoublette?12:14}}>
                <label style={{fontSize:12.5,color:CT.muted,fontWeight:600,display:"block",marginBottom:6}}>{isDoublette?"Joueur 1 (toi)":"Ton nom"}</label>
                <input value={j1Name} onChange={e=>setJ1Name(e.target.value)} placeholder={isDoublette?"Nom du joueur 1…":"Ton nom…"} style={{width:"100%",background:"#111",border:`1px solid ${CT.border}`,borderRadius:8,padding:"9px 13px",color:CT.text,fontSize:14}}/>
              </div>}
          {isDoublette&&(<>
            <label style={{fontSize:12.5,color:CT.muted,fontWeight:600,display:"block",marginBottom:6}}>{estConnecte?"Ton binôme":"Joueur 2"}</label>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input value={binomeName} onChange={e=>{setBinomeName(e.target.value);setBinomeId(null);}} placeholder="Nom du binôme…" style={{flex:1,background:"#111",border:`1px solid ${CT.border}`,borderRadius:8,padding:"9px 13px",color:CT.text,fontSize:14}}/>
              {amis.length>0&&<Btn onClick={()=>setAmiPickerOpen(v=>!v)} variant="ghost" small><EmoIcon e="🔍" size={13} style={{verticalAlign:"-2px",marginRight:3}}/>Amis</Btn>}
            </div>
            {binomeId&&<div style={{fontSize:11,color:CT.blue,marginBottom:8}}><EmoIcon e="🔗" size={10} style={{verticalAlign:"-1px",marginRight:3}}/>Binôme lié à son compte Dart Point</div>}
            {amiPickerOpen&&(
              <div style={{background:"#111",border:`1px solid ${CT.border}`,borderRadius:8,padding:10,marginBottom:10}}>
                <input value={amiSearch} onChange={e=>setAmiSearch(e.target.value)} placeholder="🔍 Chercher un ami…" style={{width:"100%",background:"#0d0d0d",border:`1px solid ${CT.border}`,borderRadius:6,padding:"7px 10px",color:CT.text,fontSize:13,marginBottom:8}}/>
                <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:170,overflowY:"auto"}}>
                  {amis.filter(a=>a.pseudo.toLowerCase().includes(amiSearch.toLowerCase())).map(a=>(
                    <button key={a.id} onClick={()=>{setBinomeName(a.pseudo);setBinomeId(a.id);setAmiPickerOpen(false);setAmiSearch("");}} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"#0d0d0d",border:`1px solid ${CT.border}`,borderRadius:6,cursor:"pointer",color:CT.text,fontSize:13,textAlign:"left",touchAction:"manipulation"}}>
                      <EmoIcon e="👤" size={14} color={CT.muted}/>{a.pseudo}
                    </button>
                  ))}
                  {amis.filter(a=>a.pseudo.toLowerCase().includes(amiSearch.toLowerCase())).length===0&&<div style={{fontSize:12,color:CT.muted,padding:6,textAlign:"center"}}>Aucun ami trouvé</div>}
                </div>
              </div>
            )}
            <label style={{fontSize:12.5,color:CT.muted,fontWeight:600,display:"block",marginBottom:6}}>Nom de l'équipe <span style={{fontWeight:400}}>(s'affichera dans le tournoi)</span></label>
            <input value={teamName} onChange={e=>setTeamName(e.target.value)} placeholder={'Ex : "Les Fléchettos"'} style={{width:"100%",background:"#111",border:`1px solid ${CT.border}`,borderRadius:8,padding:"9px 13px",color:CT.text,fontSize:14,marginBottom:14}}/>
          </>)}
          <Btn onClick={handleRejoindre} disabled={!rejoindreValide||rejoining} style={{width:"100%",fontSize:15,padding:"12px"}}>{rejoining?"Inscription…":<EmoText s="✅ Rejoindre le tournoi" size={15}/>}</Btn>
        </Card>
      )}

      {/* Confirmation d'inscription (empêche une 2e inscription) */}
      {!peutRejoindre&&(dejaInscrit||(isParticipant&&!isCreateur))&&(
        <Card style={{marginBottom:16,background:CT.green+"14",border:`1px solid ${CT.green}66`,textAlign:"center"}}>
          <EmoIcon e="✅" size={30} color={CT.green}/>
          <div style={{fontWeight:800,fontSize:16,color:CT.green,marginTop:4}}>Tu es inscrit au tournoi !</div>
          {nomInscrit&&<div style={{fontSize:13,color:CT.text,marginTop:3}}>{isDoublette?"Équipe : ":""}<b>{nomInscrit}</b></div>}
          <div style={{fontSize:12,color:CT.muted,marginTop:6}}>En attente du lancement par l'organisateur…</div>
          {"Notification" in window&&(notifOk
            ? <div style={{marginTop:12,fontSize:12,color:CT.green,fontWeight:700}}>🔔 Alertes activées — ton téléphone te préviendra quand ce sera ton tour</div>
            : <button onClick={demanderNotif} style={{marginTop:14,background:CT.accent+"22",color:CT.accent,border:`1px solid ${CT.accent}`,borderRadius:10,padding:"10px 14px",fontWeight:700,fontSize:13,cursor:"pointer",width:"100%",touchAction:"manipulation"}}>🔔 Activer les alertes de match</button>)}
        </Card>
      )}

      {/* Share link */}
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          <EmoIcon e="🔗" size={20} color={CT.accent}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Lien de partage</div>
            <div style={{fontSize:12,color:CT.muted,wordBreak:"break-all",background:"#111",borderRadius:6,padding:"6px 10px",fontFamily:"monospace"}}>{lien}</div>
          </div>
          <Btn onClick={copyLien} variant="ghost" small>{copied?<EmoText s="✅ Copié !" size={13}/>:<EmoText s="📋 Copier" size={13}/>}</Btn>
        </div>
        {isCreateur&&<div style={{marginTop:10,fontSize:12,color:CT.muted}}>Code joueur (à donner aux joueurs) : <b style={{color:CT.yellow,fontSize:16,letterSpacing:2}}>{tournoi.code}</b></div>}
        {qrTournoi&&(
          <div style={{marginTop:14,display:"flex",flexDirection:"column",alignItems:"center",gap:6,borderTop:`1px solid ${CT.border}`,paddingTop:14}}>
            <img src={qrTournoi} alt="QR du tournoi" style={{width:158,height:158,borderRadius:12,background:"#fff",padding:7}}/>
            {estLocalhost
              ? <div style={{fontSize:11,color:"#eab308",textAlign:"center",lineHeight:1.45,fontWeight:600}}>⚠️ Adresse locale (localhost) — ce QR ne marche que sur cet ordinateur. Ouvre la <b>version en ligne</b> du site pour un QR scannable par les téléphones.</div>
              : <div style={{fontSize:11.5,color:CT.muted,textAlign:"center",lineHeight:1.4}}><EmoIcon e="📷" size={12} style={{verticalAlign:"-1px",marginRight:3}}/>Les joueurs scannent ce QR pour rejoindre le tournoi</div>}
          </div>
        )}
      </Card>

      {/* Inscription par scan QR (option C) — solo uniquement, masqué en doublette (on ajoute des équipes) */}
      {isCreateur&&!isDoublette&&(
        <Btn onClick={()=>setScanOpen(true)} style={{width:"100%",marginBottom:16,fontSize:15,padding:"13px"}}>
          <EmoIcon e="📲" size={16} style={{verticalAlign:"-2px",marginRight:6}}/>Scanner un joueur (QR)
        </Btn>
      )}

      {/* Inviter mes amis (si créateur connecté) — solo uniquement, masqué en doublette */}
      {isCreateur&&!isDoublette&&amis.length>0&&(
        <Card style={{marginBottom:16}}>
          <button onClick={()=>setAmisOuvert(o=>!o)}
            style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,background:"none",border:"none",padding:0,cursor:"pointer",touchAction:"manipulation"}}>
            <h3 style={{fontWeight:700,fontSize:14,margin:0,color:CT.blue}}><EmoText s={`👥 Inviter mes amis (${amis.length})`} size={14}/></h3>
            <span style={{fontSize:13,color:CT.blue,fontWeight:900,transform:amisOuvert?"rotate(90deg)":"none",transition:"transform .18s",display:"inline-block"}}>▸</span>
          </button>
          {amisOuvert&&(
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
            {amis.map(ami=>{
              const deja=amiDejaAjoute(ami.id);
              return(
                <div key={ami.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#111",borderRadius:8,border:`1px solid ${deja?CT.green+"44":CT.border}`}}>
                  <EmoIcon e="👤" size={18} color={CT.muted}/>
                  <span style={{flex:1,fontWeight:500,fontSize:14}}>{ami.pseudo}</span>
                  {deja
                    ?<Badge color={CT.green}><EmoText s="✅ Ajouté" size={11}/></Badge>
                    :<Btn onClick={()=>handleAddAmi(ami)} disabled={addingAmi===ami.id} small variant="ghost">
                      {addingAmi===ami.id?"…":"+ Inviter"}
                    </Btn>
                  }
                </div>
              );
            })}
          </div>
          )}
        </Card>
      )}

      {/* Organisateur — il n'est PAS inscrit d'office comme joueur : organiser et jouer sont deux
          choses différentes. On le montre ici pour qu'on sache qui mène le tournoi, et s'il veut
          jouer il s'inscrit avec le bouton « Rejoindre le tournoi » comme tout le monde. */}
      <Card style={{marginBottom:16,background:CT.blue+"0d",border:`1px solid ${CT.blue}33`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{width:30,height:30,borderRadius:"50%",background:CT.blue+"22",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><EmoIcon e="👑" size={15} color={CT.blue}/></span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,color:CT.muted,fontWeight:700,letterSpacing:.5,textTransform:"uppercase"}}>Créateur du tournoi</div>
            <div style={{fontWeight:800,fontSize:15,color:CT.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tournoi.createur_pseudo||"—"}</div>
          </div>
          {(() => {
            const createurJoue=joueurs.some(j=>j.joueur_id===tournoi.createur_id||(Array.isArray(j.membres)&&j.membres.some(m=>m&&m.id===tournoi.createur_id)));
            return <Badge color={createurJoue?CT.green:CT.muted}>{createurJoue?"joue aussi":"ne joue pas"}</Badge>;
          })()}
        </div>
      </Card>

      {/* Players list */}
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:6}}><EmoIcon e="🎯" size={15}/>Joueurs inscrits ({joueurs.length})</h3>
          <Badge color={joueurs.length>=2?CT.green:CT.muted}>{joueurs.length>=2?"Prêt à lancer":"Ajoutez des joueurs"}</Badge>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {joueurs.map((j,i)=>(
            <div key={j.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#111",borderRadius:8,border:`1px solid ${CT.border}`}}>
              <span style={{width:24,height:24,borderRadius:"50%",background:CT.accent+"22",color:CT.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,flexShrink:0}}>{i+1}</span>
              <span style={{flex:1,fontWeight:500}}>
                {j.nom}
                {Array.isArray(j.membres)&&j.membres.length>0&&<span style={{display:"block",fontSize:11,color:CT.muted,fontWeight:400,marginTop:1}}><EmoIcon e="👥" size={10} style={{verticalAlign:"-1px",marginRight:3}}/>{j.membres.map(m=>m&&m.nom).filter(Boolean).join(" & ")}</span>}
              </span>
              {Array.isArray(j.membres)&&j.membres.length>0&&<Badge color={CT.purple}>Équipe</Badge>}
              {!j.membres&&j.joueur_id&&<Badge color={CT.blue}>Compte <EmoIcon e="🔗" size={10} style={{verticalAlign:"-1px",marginLeft:2}}/></Badge>}
              {isCreateur&&<button onClick={()=>onRemoveJoueur(j.id)} style={{background:"none",border:"none",color:CT.muted,cursor:"pointer",padding:"0 4px",display:"inline-flex"}} title="Retirer"><EmoIcon e="✕" size={15}/></button>}
            </div>
          ))}
          {joueurs.length===0&&<p style={{color:CT.muted,fontSize:13,textAlign:"center",padding:12}}>Aucun joueur ajouté</p>}
        </div>

        {/* Add manual player / team */}
        {isCreateur&&lobbyOuvert&&isDoublette&&(
          <div>
            <div style={{fontSize:12,color:CT.muted,marginBottom:6,fontWeight:500}}><EmoIcon e="👥" size={11} style={{verticalAlign:"-1px",marginRight:4}}/>Ajouter une équipe (joueurs sans compte) :</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <input value={equipeNom} onChange={e=>setEquipeNom(e.target.value)} placeholder="Nom d'équipe (optionnel)" style={{background:"#111",border:`1px solid ${CT.border}`,borderRadius:8,padding:"9px 13px",color:CT.text,fontSize:14}}/>
              <div style={{display:"flex",gap:8}}>
                <input value={nom} onChange={e=>setNom(e.target.value)} placeholder="Joueur 1…" style={{flex:1,minWidth:0,background:"#111",border:`1px solid ${CT.border}`,borderRadius:8,padding:"9px 13px",color:CT.text,fontSize:14}}/>
                <input value={nom2} onChange={e=>setNom2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdd()} placeholder="Joueur 2…" style={{flex:1,minWidth:0,background:"#111",border:`1px solid ${CT.border}`,borderRadius:8,padding:"9px 13px",color:CT.text,fontSize:14}}/>
              </div>
              <Btn onClick={handleAdd} disabled={!nom.trim()||!nom2.trim()||adding} small>+ Ajouter l'équipe</Btn>
            </div>
          </div>
        )}
        {isCreateur&&lobbyOuvert&&!isDoublette&&(
          <div>
            <div style={{fontSize:12,color:CT.muted,marginBottom:6,fontWeight:500}}>Ajouter un joueur sans compte :</div>
            <div style={{display:"flex",gap:8}}>
              <input value={nom} onChange={e=>setNom(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdd()} placeholder="Nom du joueur…" style={{flex:1,background:"#111",border:`1px solid ${CT.border}`,borderRadius:8,padding:"9px 13px",color:CT.text,fontSize:14}}/>
              <Btn onClick={handleAdd} disabled={!nom.trim()||adding} small>+ Ajouter</Btn>
            </div>
          </div>
        )}
      </Card>

      {/* Start button */}
      {isCreateur&&(
        <Btn onClick={onStart} disabled={joueurs.length<2} style={{width:"100%",fontSize:16,padding:"14px"}}>
          <EmoIcon e="🚀" size={16} style={{verticalAlign:"-2px",marginRight:6}}/>Lancer le tournoi ({joueurs.length} joueurs)
        </Btn>
      )}
      {!isCreateur&&<p style={{textAlign:"center",color:CT.muted,fontSize:13}}>En attente du lancement par {tournoi.createur_pseudo}…</p>}

      {scanOpen&&<QRScanModal onAdd={onAddJoueur} dejaIds={joueurs.map(j=>j.joueur_id).filter(Boolean)} onClose={()=>setScanOpen(false)}/>}
    </div>
  );
};


// ── ALERTE "C'EST A TOI DE JOUER" (composant reutilisable, monte dans TOUTES les phases) ──
// Pourquoi un composant separe ? Avant, cette alerte vivait DANS PoulesView, qui n'est affiche
// qu'en phase de poules. Du coup, en eliminatoires/barrages, plus aucune alerte. Ici on la sort
// pour la monter au niveau du tournoi (present en poules, barrages ET eliminatoires).
// monMatch = LE match "a jouer maintenant" qui me concerne (deja calcule par le parent), ou null.
// Mémoire de SESSION : ids des matchs déjà "buzzés". Vit au niveau module → survit au démontage/remontage
// du composant (navigation). Sans ça, l'alerte re-sonnait à CHAQUE retour sur la page tournoi pour le même
// match non joué. Se réinitialise seulement au rechargement complet de l'appli (nouvelle session).
// id du match → horodatage du dernier buzz. AVANT c'était un simple Set « déjà sonné » qu'on ne vidait
// jamais : dès qu'un match devenait mon match actif il était marqué, et si la rotation des cibles le
// désélectionnait juste après (une autre paire passe devant), la convocation était consommée POUR RIEN —
// le match redevenait actif plus tard et le téléphone restait muet. Mesuré : 102 convocations annulées,
// 93 matchs qui ne re-sonnaient jamais.
const dernierBuzzParMatch=new Map();
// Matchs qui ont CESSÉ d'être mon match actif : ils redeviennent « sonnables ».
const matchsRelachables=new Set();
// Anti-rebond : on ne re-sonne pas pour le même match avant ce délai (la rotation peut osciller entre
// deux paires de priorité identique d'un rafraîchissement à l'autre).
const BUZZ_COOLDOWN_MS=60000;
const TurnAlert=({monMatch,joueurs})=>{
  // Qui suis-je ? (compte lie OU ligne memorisee dans localStorage, meme sans compte)
  const isMine=(id)=>false; // (non utilise ici : le parent a deja filtre sur mon match)
  const [alerteMatch,setAlerteMatch]=useState(null);
  const buzzRef=useRef(null), audioRef=useRef(null);
  const stopBuzz=()=>{
    if(buzzRef.current){clearInterval(buzzRef.current);buzzRef.current=null;}
    try{ if(navigator.vibrate)navigator.vibrate(0); }catch(e){}
  };
  const beep=()=>{ try{
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
    if(!audioRef.current)audioRef.current=new AC();
    const ctx=audioRef.current; if(ctx.state==="suspended")ctx.resume().catch(()=>{});
    const o=ctx.createOscillator(),g=ctx.createGain(); o.type="sine"; o.frequency.value=880;
    o.connect(g); g.connect(ctx.destination); const t=ctx.currentTime;
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.3,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.4);
    o.start(t); o.stop(t+0.42);
  }catch(e){} };
  const startBuzz=()=>{
    const buzz=()=>{ try{ if(navigator.vibrate)navigator.vibrate([500,220,500,220,700]); }catch(e){} beep(); };
    buzz(); if(buzzRef.current)clearInterval(buzzRef.current); buzzRef.current=setInterval(buzz,2200);
  };
  const showSystemNotif=(advNom)=>{
    try{
      if(!("Notification" in window)||Notification.permission!=="granted")return;
      if(navigator.serviceWorker&&navigator.serviceWorker.ready){
        navigator.serviceWorker.ready.then(reg=>reg.showNotification("🎯 C'est à toi de jouer !",{
          body:"Ton match"+(advNom?` contre ${advNom}`:"")+" est prêt. Va au pas de tir !",
          vibrate:[500,220,500,220,700],tag:"tp-turn",renotify:true,requireInteraction:true,icon:"/logo.png",badge:"/logo.png",
        }).catch(()=>{})).catch(()=>{});
      }
    }catch(e){}
  };
  // Un scoreur est-il affiche sur ce telephone la ? (battement de coeur pose par <Scoreur/>) → on ne derange pas.
  const scoreurAffiche=()=>{ try{ return !!window.__dpScoreurTs && (Date.now()-window.__dpScoreurTs)<12000; }catch(e){ return false; } };
  // Adversaire = l'AUTRE joueur de mon match (le parent m'a deja marque via monMatch.__moiEstJ1).
  const advId=monMatch?(monMatch.__moiEstJ1?monMatch.joueur2_id:monMatch.joueur1_id):null;
  const dernierAlerteRef=useRef(null);
  useEffect(()=>{
    const id=monMatch?monMatch.id:null;
    // Mon match actif a changé (ou j'en ai perdu un) → l'ancien redevient sonnable : la cible s'était
    // libérée pour quelqu'un d'autre, il reviendra plus tard et il faudra bien me prévenir.
    if(dernierAlerteRef.current&&dernierAlerteRef.current!==id){
      matchsRelachables.add(dernierAlerteRef.current);
      dernierAlerteRef.current=null;
    }
    if(!monMatch)return;
    const ts=dernierBuzzParMatch.get(id);
    const jamaisSonne=ts===undefined;
    // On re-sonne UNIQUEMENT si le match avait cessé d'être le mien ET que l'anti-rebond est écoulé.
    // (Sans la condition « relâchable », l'alerte re-sonnerait à chaque retour sur la page tournoi.)
    const peutResonner=!jamaisSonne&&matchsRelachables.has(id)&&(Date.now()-ts)>=BUZZ_COOLDOWN_MS;
    if(!jamaisSonne&&!peutResonner){ dernierAlerteRef.current=id; return; }
    if(scoreurAffiche())return; // je suis deja en train de scorer → pas d'alerte (elle sonnera au retour)
    matchsRelachables.delete(id);
    dernierBuzzParMatch.set(id,Date.now());
    dernierAlerteRef.current=id;
    setAlerteMatch(monMatch);
    startBuzz();
    showSystemNotif((joueurs.find(j=>j.id===advId)||{}).nom);
  },[monMatch&&monMatch.id]); // eslint-disable-line
  useEffect(()=>()=>stopBuzz(),[]); // eslint-disable-line
  // L'alerte NE LANCE PLUS le scoreur (pour éviter tout scoreur lancé par erreur) : elle ferme juste.
  // Le joueur ouvre le scoreur lui-même depuis sa carte de match (bouton ▶ Lancer), une fois au pas de tir.
  const fermerAlerte=()=>{ stopBuzz(); try{ if("Notification" in window&&Notification.permission==="default")Notification.requestPermission(); }catch(e){} setAlerteMatch(null); };
  if(!alerteMatch)return null;
  const adv=joueurs.find(j=>j.id===(alerteMatch.__moiEstJ1?alerteMatch.joueur2_id:alerteMatch.joueur1_id));
  return(
    <div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:100000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <style>{`@keyframes tpBuzz{0%,100%{transform:translateX(0)}20%{transform:translateX(-7px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`}</style>
      <div style={{background:"linear-gradient(135deg,#14320f,#0f0f1f)",border:`2px solid ${CT.green}`,borderRadius:22,padding:"30px 22px",maxWidth:380,width:"100%",textAlign:"center",boxShadow:`0 0 50px ${CT.green}66`}}>
        <div style={{animation:"tpBuzz .5s infinite",display:"inline-block",marginBottom:8}}><EmoIcon e="🎯" size={52}/></div>
        <div style={{fontWeight:900,fontSize:23,color:CT.green,marginBottom:8,lineHeight:1.2}}>C'est à toi de jouer !</div>
        <div style={{fontSize:15,color:CT.text,marginBottom:4}}>Ton match contre <b>{adv?.nom||"ton adversaire"}</b> est prêt.</div>
        <div style={{fontSize:12.5,color:CT.muted,marginBottom:22}}>Va au pas de tir <EmoIcon e="🎯" size={12} style={{verticalAlign:"-1px"}}/> c'est ton tour !</div>
        <Btn onClick={()=>fermerAlerte()} style={{width:"100%",fontSize:16,padding:"14px"}}>👍 OK, j'y vais !</Btn>
        <div style={{marginTop:12,fontSize:11.5,color:CT.muted,lineHeight:1.45}}>Le scoreur se lance depuis ta <b style={{color:CT.text}}>carte de match</b> (bouton ▶ Lancer), une fois au pas de tir <EmoIcon e="🎯" size={11} style={{verticalAlign:"-1px"}}/></div>
      </div>
    </div>
  );
};

// ── VUE POULES ────────────────────────────────────────────────────────────────
const RED_TP="#ef4444";
// Identité visuelle des groupes + avatars (initiales)
const GROUP_COLORS=["#f97316","#22c55e","#60a5fa","#a78bfa","#f59e0b","#ec4899","#14b8a6","#ef4444"];
const groupCol=(g)=>GROUP_COLORS[(g-1)%GROUP_COLORS.length];
const groupLetter=(g)=>String.fromCharCode(64+((g-1)%26)+1); // 1->A, 2->B…
const initiales=(nom)=>{ const s=(nom||"?").trim(); const p=s.split(/[\s-]+/).filter(Boolean); return (p.length>=2?(p[0][0]+p[1][0]):s.slice(0,2)).toUpperCase(); };

// ── MOYENNE DE JEU DU TOURNOI par équipe, sur TOUS les matchs joués au scoreur ───────────────
// La moyenne d'un match = 3 × points / fléchettes (moyenne aux 3 fléchettes). La moyenne du tournoi
// est donc pondérée : 3 × Σpoints / Σfléchettes. Pour les vieux matchs sans "flech" enregistré,
// on approxime 3 fléchettes par volée. Renvoie { [equipeId]: { moy, best, finish, nb180, pts, flech } }.
const aggStatsSessions=(rows,ids)=>{
  const idset=new Set((ids||[]).map(String)); const agg={};
  (rows||[]).forEach(s=>{
    [[s.joueur1_id,s.stats_j1],[s.joueur2_id,s.stats_j2]].forEach(([pid,st])=>{
      if(!pid||!st||!idset.has(String(pid)))return;
      const pts=parseFloat(st.total_pts)||0, vol=parseInt(st.volees)||0;
      const fl=(parseInt(st.flech)||0)||vol*3; // fléchettes exactes si dispo, sinon ≈ 3/volée
      if(!agg[pid])agg[pid]={pts:0,flech:0,best:0,finish:0,nb180:0};
      agg[pid].pts+=pts; agg[pid].flech+=fl;
      agg[pid].best=Math.max(agg[pid].best,parseFloat(st.moy)||0);
      agg[pid].finish=Math.max(agg[pid].finish,parseFloat(st.max_finish)||0);
      agg[pid].nb180+=parseInt(st.nb180)||0;
    });
  });
  Object.values(agg).forEach(a=>{ a.moy=a.flech>0?(3*a.pts/a.flech):0; }); // moyenne pondérée du tournoi
  return agg;
};
// Hook : récupère et agrège les stats live du tournoi. refreshKey change (ex. nb de matchs finis) → re-fetch.
const useStatsTournoi=(joueurs,refreshKey=0)=>{
  const [stats,setStats]=useState(null);
  const idsKey=joueurs.map(j=>j.id).join(",");
  useEffect(()=>{
    const ids=joueurs.map(j=>j.id).filter(Boolean);
    if(!ids.length){ setStats(null); return; }
    let annule=false;
    sbTP(`live_sessions?or=(joueur1_id.in.(${ids.join(",")}),joueur2_id.in.(${ids.join(",")}))&select=joueur1_id,joueur2_id,stats_j1,stats_j2`)
      .then(rows=>{ if(!annule)setStats(aggStatsSessions(rows,ids)); })
      .catch(()=>{ if(!annule)setStats(null); });
    return()=>{ annule=true; };
  },[idsKey,refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return stats;
};

const PoulesView=({tournoi,joueurs,matchs,isCreateur,nbCibles=1,nbQual=2,ciblesMode="optimise",onSetCibles,onSaisirScore,onJouerMatch,onLancerEliminatoires,onCreerBarrages,onLibererCibles,joueurConnecte,canPlay=false,onOpenShare,onModifier,saving=false,live=null,bracketLance=false,stats=null})=>{
  const nbGroupes=Math.max(...joueurs.map(j=>j.groupe),1);
  const groupes=Array.from({length:nbGroupes},(_,i)=>i+1);
  // Ma poule (celle du joueur connecté) → pour l'⭐ sur l'onglet.
  const myGroup=(()=>{ if(!joueurConnecte)return null; const r=joueurs.find(j=>j.joueur_id===joueurConnecte.id||(Array.isArray(j.membres)&&j.membres.some(m=>m&&m.id===joueurConnecte.id))); return r?r.groupe:null; })();
  // Onglet de poule affiché (au lieu de tout scroller). Défaut : ma poule, sinon la 1re.
  const [poolTab,setPoolTab]=useState(myGroup||1);
  const activeTab=groupes.includes(poolTab)?poolTab:(groupes.includes(myGroup)?myGroup:(groupes[0]||1));
  const termines=matchs.filter(m=>m.phase==="poules"&&m.statut==="termine");
  const total=matchs.filter(m=>m.phase==="poules").length;
  const allDone=total>0&&termines.length===total;
  // Planning des cibles : quels matchs jouer maintenant (vert) vs en attente
  const pending=matchs.filter(m=>m.phase==="poules"&&m.statut!=="termine"&&m.joueur1_id&&m.joueur2_id);
  // Mode « une poule par cible » : chaque poule est installée sur sa cible et s'organise seule.
  // TOUS ses matchs restants sont donc lançables — on n'impose aucune rotation, on propose juste
  // un ordre conseillé (voir ordreConseille) pour que personne n'enchaîne deux matchs de suite.
  const parPoule=ciblesMode==="par_poule";
  const actifs=parPoule?new Set(pending.map(m=>m.id)):matchsSurCibles(pending,nbCibles,matchs,live);
  const enAttente=parPoule?0:Math.max(0,pending.length-actifs.size);
  // Ordre conseillé DANS chaque poule (1, 2, 3…) : id du match → numéro. Uniquement en mode par poule.
  const ordreConseille=(()=>{
    if(!parPoule)return {};
    const par={};
    for(const g of [...new Set(pending.map(m=>m.groupe))]){
      const ordonne=optimizePoolMatchOrder(pending.filter(m=>m.groupe===g),1);
      ordonne.forEach((m,i)=>{ par[m.id]=i+1; });
    }
    return par;
  })();
  // Affichage : on distingue les matchs À LANCER de ceux DÉJÀ EN COURS (voir compterEnCours).
  // Avant, le compteur vert additionnait les deux : il invitait à lancer des matchs déjà commencés,
  // et il pouvait annoncer plus de matchs qu'il n'y a de cibles.
  const nbEnCours=compterEnCours(pending,actifs,live);
  const nbALancer=Math.max(0,actifs.size-nbEnCours);
  // Classement de poule = UNIQUEMENT sur les matchs de poule. (Les V-D stockées sur le joueur incluent aussi
  // les matchs du TABLEAU une fois les éliminatoires lancées → ça faussait l'affichage « 5 vs 4 matchs ».)
  // On recalcule donc ici, à partir des seuls matchs de poule terminés, des équipes avec V/D/manches « poule seule ».
  const joueursPoule=(()=>{
    const st={}; joueurs.forEach(j=>{ st[j.id]={...j,victoires:0,defaites:0,points:0,manches_pour:0,manches_contre:0}; });
    termines.filter(m=>m.gagnant_id).forEach(m=>{
      const w=m.gagnant_id, l=m.gagnant_id===m.joueur1_id?m.joueur2_id:m.joueur1_id;
      const ws=m.gagnant_id===m.joueur1_id?m.score1:m.score2, ls=m.gagnant_id===m.joueur1_id?m.score2:m.score1;
      if(st[w]){ st[w].victoires++; st[w].points+=2; st[w].manches_pour+=ws; st[w].manches_contre+=ls; }
      if(st[l]){ st[l].defaites++; st[l].manches_pour+=ls; st[l].manches_contre+=ws; }
    });
    return joueurs.map(j=>st[j.id]||j);
  })();
  // Barrages (égalités) — détectés une fois les poules terminées
  const barrages=matchs.filter(m=>m.phase==="barrage");
  // Planning des barrages : MEME logique que les poules (matchsSurCibles) → jamais 2 fois le même joueur, au plus nbCibles à la fois.
  const actifsBarrages=matchsSurCibles(barrages.filter(m=>m.statut!=="termine"),nbCibles,matchs,live);
  // Les barrages 701 ne sont PAS comptés dans le "X/Y matchs" (ce compteur ne suit que la phase "poules") :
  // le badge restait donc VERT à 40/40 alors qu'il restait des barrages à jouer juste en dessous.
  const barragesRestants=barrages.filter(m=>m.statut!=="termine").length;
  const barrageExiste=(a,b,round=0)=>barrages.some(m=>(m.round_bracket||0)===round&&((m.joueur1_id===a&&m.joueur2_id===b)||(m.joueur1_id===b&&m.joueur2_id===a)));
  const aCreer=[]; let tieNonTranchee=false;
  if(allDone){
    groupes.forEach(g=>{
      // On départage sur joueursPoule (V/D/manches recalculés SUR LA POULE SEULE, juste au-dessus), et non
      // sur les stats stockées en base : une fois le tableau lancé, celles-ci contiennent AUSSI les
      // victoires du tableau et de la consolante → elles inventaient des égalités qui n'existaient pas
      // dans le classement affiché juste en dessous (lui utilise déjà joueursPoule).
      egalitesADepartager(joueursPoule.filter(j=>j.groupe===g),barrages,nbQual).forEach(({a,b,round})=>{
        tieNonTranchee=true;
        if(!barrageExiste(a.id,b.id,round))aCreer.push({a:a.id,b:b.id,groupe:g,round});
      });
    });
  }

  // (L'alerte "c'est a toi de jouer" a ete DEPLACEE dans <TurnAlert>, monte au niveau du tournoi,
  //  pour qu'elle marche aussi en barrages et en eliminatoires — pas seulement en poules.)

  // ── Carte de match "premium" (avatars, ⚔️, couleur d'état, badge) ──
  const av=(nom,col,win)=>(<span style={{width:32,height:32,borderRadius:"50%",flexShrink:0,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,background:(win?CT.green:col)+"1e",color:win?CT.green:col,border:`1px solid ${(win?CT.green:col)}44`}}>{initiales(nom)}</span>);
  const carteMatch=(m,barrage=false)=>{
    const j1=joueurs.find(j=>j.id===m.joueur1_id), j2=joueurs.find(j=>j.id===m.joueur2_id);
    const done=m.statut==="termine";
    // Un barrage n'est actif que s'il est dans actifsBarrages (rotation cibles) ; un match de poule via actifs.
    const actif=!done&&(barrage?actifsBarrages.has(m.id):actifs.has(m.id));
    // Match "en cours" = le scoreur est lancé (live_sessions en_cours) → étiquette "Match en cours" + plus de bouton "Lancer".
    const enCours=actif&&!!live&&!!live.pairs&&live.pairs.has([String(m.joueur1_id),String(m.joueur2_id)].sort().join("|"));
    const attente=!done&&!actif;
    const col=done?CT.green:barrage?RED_TP:actif?CT.accent:CT.muted;
    const g1=done&&m.gagnant_id===j1?.id, g2=done&&m.gagnant_id===j2?.id;
    const bordC=done?CT.green+"33":actif||barrage?col+"88":CT.border;
    const bg=done?"#16161d":actif||barrage?col+"12":"#16161d";
    return(
      <div key={m.id} style={{borderRadius:12,padding:"11px 13px",marginBottom:8,background:bg,border:`1px solid ${bordC}`,opacity:attente?0.62:1}}>
        {barrage&&<div style={{fontSize:8.5,fontWeight:800,color:RED_TP,letterSpacing:.6,marginBottom:7}}>BARRAGE · 701</div>}
        {/* Ordre CONSEILLÉ (mode une poule par cible) : les joueurs restent libres de choisir, mais
            suivre ces numéros évite qu'un même joueur enchaîne deux matchs de suite. */}
        {!barrage&&!done&&ordreConseille[m.id]&&(
          <div style={{fontSize:9.5,fontWeight:800,color:ordreConseille[m.id]===1?CT.accent:CT.muted,letterSpacing:.5,marginBottom:7,display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:16,height:16,borderRadius:"50%",background:(ordreConseille[m.id]===1?CT.accent:CT.muted)+"22",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9}}>{ordreConseille[m.id]}</span>
            {ordreConseille[m.id]===1?"CONSEILLÉ MAINTENANT":"ORDRE CONSEILLÉ"}
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:8,minWidth:0}}>
            {av(j1?.nom,col,g1)}
            <span style={{fontSize:14,fontWeight:g1?800:500,color:g1?CT.green:CT.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{j1?.nom||"?"}</span>
          </div>
          {done?(
            <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
              <span style={{fontSize:18,fontWeight:800,color:g1?CT.green:CT.muted}}>{m.score1}</span>
              <EmoIcon e="⚔️" size={12}/>
              <span style={{fontSize:18,fontWeight:800,color:g2?CT.green:CT.muted}}>{m.score2}</span>
            </div>
          ):(
            <div style={{width:32,height:32,borderRadius:9,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",background:col+"18"}}><EmoIcon e="⚔️" size={16}/></div>
          )}
          <div style={{flex:1,display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end",minWidth:0}}>
            <span style={{fontSize:14,fontWeight:g2?800:500,color:g2?CT.green:CT.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textAlign:"right"}}>{j2?.nom||"?"}</span>
            {av(j2?.nom,col,g2)}
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {done&&<span style={{fontSize:11,fontWeight:600,color:CT.green,background:CT.green+"18",borderRadius:20,padding:"3px 9px",display:"inline-flex",alignItems:"center",gap:4}}><EmoIcon e="✅" size={11}/>Terminé</span>}
          {enCours&&<span style={{fontSize:11,fontWeight:700,color:"#ef4444",background:"#ef444418",borderRadius:20,padding:"3px 9px",display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:"#ef4444",display:"inline-block",animation:"livePulse 1.4s infinite"}}/>Match en cours</span>}
          {actif&&!enCours&&<span style={{fontSize:11,fontWeight:600,color:col,background:col+"1e",borderRadius:20,padding:"3px 9px",display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:col,display:"inline-block"}}/>{barrage?"Barrage à jouer":"À jouer maintenant"}</span>}
          {attente&&<span style={{fontSize:11,fontWeight:600,color:CT.muted,background:CT.muted+"18",borderRadius:20,padding:"3px 9px",display:"inline-flex",alignItems:"center",gap:4}}><EmoIcon e="⏳" size={11}/>En attente</span>}
          {!done&&<span style={{fontSize:10.5,color:CT.muted}}>Premier à {m.manches_max||2} manche{(m.manches_max||2)>1?"s":""}</span>}
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            {actif&&!enCours&&canPlay&&<Btn onClick={()=>onJouerMatch(m)} variant="primary" small><EmoText s="▶ Lancer" size={12}/></Btn>}
            {isCreateur&&!bracketLance&&<Btn onClick={()=>onSaisirScore(m)} variant="dark" small title={done?"Corriger le score":"Saisir les manches"}><EmoIcon e="✏️" size={13}/></Btn>}
            {actif&&!enCours&&!canPlay&&<span style={{fontSize:11,color:col,fontWeight:700}}>🎯</span>}
          </div>
        </div>
      </div>
    );
  };

  return(
    <div>
      {/* (La pop-up "c'est à toi de jouer" est maintenant rendue par <TurnAlert> au niveau du tournoi.) */}

      {/* Progress */}
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontWeight:600,fontSize:14}}>Phase de poules</span>
          <Badge color={allDone&&barragesRestants===0?CT.green:CT.yellow}>{termines.length}/{total} matchs{barragesRestants>0?` + ${barragesRestants} barrage${barragesRestants>1?"s":""}`:""}</Badge>
        </div>
        <div style={{background:"#111",borderRadius:6,height:8,overflow:"hidden"}}>
          <div style={{background:allDone?CT.green:CT.accent,height:"100%",width:`${total?termines.length/total*100:0}%`,transition:"width .4s",borderRadius:6}}/>
        </div>
        {!allDone&&(
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:12,paddingTop:12,borderTop:`1px solid ${CT.border}`,flexWrap:"wrap"}}>
            <span style={{fontSize:13,fontWeight:600,color:CT.text,display:"inline-flex",alignItems:"center",gap:6}}><EmoIcon e="🎯" size={14}/>Cibles disponibles</span>
            {isCreateur&&onSetCibles?(
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button onClick={()=>onSetCibles(nbCibles-1)} style={{width:32,height:32,borderRadius:9,border:`1px solid ${CT.border}`,background:CT.card,color:CT.text,fontSize:18,fontWeight:800,cursor:"pointer",touchAction:"manipulation"}}>−</button>
                <span style={{fontWeight:800,fontSize:18,minWidth:24,textAlign:"center",color:CT.accent}}>{nbCibles}</span>
                <button onClick={()=>onSetCibles(nbCibles+1)} style={{width:32,height:32,borderRadius:9,border:`1px solid ${CT.border}`,background:CT.card,color:CT.text,fontSize:18,fontWeight:800,cursor:"pointer",touchAction:"manipulation"}}>+</button>
              </div>
            ):<span style={{fontWeight:800,fontSize:16,color:CT.accent}}>{nbCibles}</span>}
          </div>
        )}
        {!allDone&&<div style={{marginTop:10,fontSize:12.5,textAlign:"center"}}><span style={{color:CT.green,fontWeight:800}}>🟢 {nbALancer} à lancer maintenant</span>{nbEnCours>0&&<span style={{color:RED_TP}}> · 🔴 {nbEnCours} en cours</span>}{enAttente>0&&<span style={{color:CT.muted}}> · ⏳ {enAttente} en attente</span>}</div>}
        {/* Aucun match jouable alors qu'il en reste : des scoreurs sont restés ouverts et bloquent les
            cibles. Avant, l'écran affichait juste « 0 à jouer maintenant » sans rien expliquer. */}
        {!allDone&&actifs.size===0&&enAttente>0&&(
          <div style={{marginTop:10,padding:"10px 12px",background:RED_TP+"12",border:`1px solid ${RED_TP}44`,borderRadius:10,textAlign:"center"}}>
            <div style={{fontSize:12,color:"#fca5a5",fontWeight:700,marginBottom:onLibererCibles&&isCreateur?8:0}}>
              <EmoText s="⏳ Toutes les cibles sont occupées" size={12} color="#fca5a5"/>
              <div style={{fontSize:11,color:CT.muted,fontWeight:600,marginTop:3}}>Un scoreur est peut-être resté ouvert (téléphone déchargé).</div>
            </div>
            {onLibererCibles&&isCreateur&&(
              <Btn onClick={onLibererCibles} variant="dark" small disabled={saving} style={{fontSize:12}}><EmoText s="🔓 Débloquer les cibles" size={12}/></Btn>
            )}
          </div>
        )}
        {!canPlay&&(
          <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${CT.border}`,textAlign:"center"}}>
            <div style={{fontSize:12.5,color:CT.text,fontWeight:600,marginBottom:8}}>👀 Tu es en mode spectateur (lecture seule)</div>
            {onOpenShare&&<Btn onClick={onOpenShare} variant="ghost" small><EmoText s="🎯 Entrer le code pour jouer" size={12}/></Btn>}
          </div>
        )}
        {isCreateur&&onModifier&&!bracketLance&&(
          <button onClick={onModifier} style={{marginTop:12,width:"100%",background:"none",border:`1px solid ${CT.border}`,color:CT.muted,borderRadius:9,padding:"9px",fontSize:12.5,fontWeight:600,cursor:"pointer",touchAction:"manipulation",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6}}><EmoIcon e="⚙️" size={13}/>Modifier le tournoi (revenir aux réglages)</button>
        )}
      </Card>

      {/* Avertissement égalité → barrage en 701. VERROUILLÉ pendant le tableau (!bracketLance), comme les
          messages jumeaux plus bas : une fois les éliminatoires lancées, un barrage de poule n'a plus de
          sens, et le bouton ci-dessous serait de toute façon inerte (cette vue-là ne reçoit pas la prop
          onCreerBarrages) → alerte rouge alarmante + bouton qui ne répond pas. */}
      {allDone&&!bracketLance&&tieNonTranchee&&(
        <Card style={{marginBottom:16,background:RED_TP+"14",border:`1px solid ${RED_TP}66`}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
            <EmoIcon e="⚠️" size={20}/>
            <div style={{flex:1}}>
              <div style={{fontWeight:800,fontSize:14,color:RED_TP}}>Égalité à départager</div>
              <div style={{fontSize:12.5,color:CT.text,lineHeight:1.5,marginTop:3}}>
                {aCreer.length>0
                  ? <>Des joueurs sont à <b>égalité parfaite</b> sur une place qui compte. Un <b>match de barrage en 701</b> est nécessaire pour les départager.</>
                  : <>Un <b>barrage en 701</b> (en rouge ci-dessous) est à jouer pour trancher l'égalité.</>}
              </div>
              {isCreateur&&aCreer.length>0&&(
                <button onClick={()=>onCreerBarrages&&onCreerBarrages(aCreer)} disabled={saving} style={{marginTop:10,background:RED_TP,color:"#fff",border:"none",borderRadius:10,padding:"10px 14px",fontWeight:800,fontSize:13.5,cursor:saving?"not-allowed":"pointer",opacity:saving?.6:1,touchAction:"manipulation"}}>
                  🎯 Créer le{aCreer.length>1?"s":""} barrage{aCreer.length>1?"s":""} ({aCreer.length})
                </button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Onglets de poules (une couleur + une lettre par groupe, ⭐ sur ta poule) → plus besoin de scroller */}
      {nbGroupes>1&&(
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:700,color:CT.muted,marginBottom:7,display:"flex",alignItems:"center",gap:5}}><EmoIcon e="👆" size={12}/>Clique sur une poule pour la voir</div>
          <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6,WebkitOverflowScrolling:"touch"}}>
            {groupes.map(g=>{
              const tc=groupCol(g), sel=g===activeTab, mine=g===myGroup;
              return(
                <button key={g} onClick={()=>setPoolTab(g)} style={{flexShrink:0,minWidth:46,padding:"7px 13px",borderRadius:10,border:`1.5px solid ${sel?tc:tc+"55"}`,background:sel?tc:tc+"16",color:sel?"#0f0f0f":tc,fontWeight:800,fontSize:14,cursor:"pointer",touchAction:"manipulation",display:"inline-flex",alignItems:"center",gap:4,transition:"all .15s"}}>
                  {mine&&<span style={{fontSize:12}}>⭐</span>}{groupLetter(g)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Poule sélectionnée */}
      {groupes.filter(g=>g===activeTab).map(g=>{
        const jG=rankGroup(joueursPoule.filter(j=>j.groupe===g),barrages,matchs);
        const barrageG=barrages.filter(m=>m.groupe===g).sort((a,b)=>(a.position_bracket||0)-(b.position_bracket||0));
        // Stats des barrages (701) d'une équipe DANS cette poule → ajoutées au récap V/D/manches/points AFFICHÉ,
        // pour que les barrages joués soient bien comptabilisés à l'écran. (Le classement, lui, reste géré par
        // rankGroup ; les stats STOCKÉES restent "poule seule" car elles servent à détecter l'égalité à départager.)
        const barrTerm=barrageG.filter(m=>m.statut==="termine"&&m.gagnant_id);
        const statsBarr=(id)=>{ let v=0,d=0,mp=0,mc=0; barrTerm.forEach(m=>{ if(m.joueur1_id!==id&&m.joueur2_id!==id)return; const s1=m.score1||0,s2=m.score2||0; if(m.joueur1_id===id){mp+=s1;mc+=s2;}else{mp+=s2;mc+=s1;} if(m.gagnant_id===id)v++;else d++; }); return {v,d,mp,mc,pts:v*2}; };
        // Ordre FIXE (par position) : la liste ne bouge pas, seule la barre verte se déplace
        const mG=matchs.filter(m=>m.phase==="poules"&&m.groupe===g).sort((a,b)=>(a.position_bracket||0)-(b.position_bracket||0));
        const gc=groupCol(g);
        const termG=mG.filter(m=>m.statut==="termine").length, totG=mG.length;
        // Barrages 701 restant à jouer dans CETTE poule : ils ne sont pas dans mG (phase "barrage"),
        // donc sans ça la poule affichait "6/6 matchs" alors qu'un barrage l'attendait juste en dessous.
        const barrRestG=barrageG.filter(m=>m.statut!=="termine").length;
        const groupeFini=totG>0&&termG===totG; // qualifiés affichés SEULEMENT quand la poule est finie
        return(
          <Card key={g} style={{marginBottom:16,border:`1.5px solid ${gc}66`}}>
            {/* En-tête groupe + avancement */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7}}>
              <span style={{width:11,height:11,borderRadius:"50%",background:gc,flexShrink:0}}/>
              <span style={{fontWeight:700,fontSize:16}}>Poule {groupLetter(g)}</span>
              <span style={{marginLeft:"auto",fontSize:12,color:CT.muted}}>{termG}/{totG} matchs{barrRestG>0&&<span style={{color:RED_TP,fontWeight:700}}> + {barrRestG} barrage{barrRestG>1?"s":""}</span>}</span>
            </div>
            <div style={{height:6,borderRadius:6,background:"#26262e",overflow:"hidden",marginBottom:16}}>
              <div style={{width:`${totG?termG/totG*100:0}%`,height:"100%",background:gc,borderRadius:6,transition:"width .4s"}}/>
            </div>
            {/* Classement */}
            {jG.map((j,i)=>{
              const rc=i===0?"#fbbf24":i===1?"#cbd5e1":i===2?"#f59e0b":"#64748b";
              const rbc=groupeFini?rc:"#7a7a88";  // médailles seulement une fois la poule finie
              const qual=groupeFini&&i<nbQual;     // qualifié = poule finie + top nbQual (1 ou 2)
              const sb=statsBarr(j.id); // barrages joués (701), ajoutés à l'affichage
              const V=j.victoires+sb.v, D=j.defaites+sb.d, MP=j.manches_pour+sb.mp, MC=j.manches_contre+sb.mc, PTS=j.points+sb.pts;
              const diff=MP-MC, joue=(V+D)>0;
              return [
                (i===nbQual&&groupeFini)?<div key={"cut"+g} style={{display:"flex",alignItems:"center",gap:8,margin:"6px 4px 8px"}}><div style={{flex:1,height:1,background:"repeating-linear-gradient(90deg,#3a3a44 0 6px,transparent 6px 12px)"}}/><span style={{fontSize:10,color:CT.muted}}>qualification</span><div style={{flex:1,height:1,background:"repeating-linear-gradient(90deg,#3a3a44 0 6px,transparent 6px 12px)"}}/></div>:null,
                <div key={j.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,background:qual?gc+"0e":"transparent",marginBottom:4}}>
                  <span style={{width:22,height:22,borderRadius:"50%",flexShrink:0,background:rbc+"22",color:rbc,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>{i+1}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:14,fontWeight:600,color:(groupeFini&&i>=nbQual)?"#cbd5e1":CT.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",flex:1,minWidth:0}}>{j.nom}</span>
                      {stats&&stats[j.id]&&stats[j.id].moy>0&&<span style={{flexShrink:0,fontSize:11,fontWeight:800,color:CT.purple,background:CT.purple+"1c",border:`1px solid ${CT.purple}44`,borderRadius:20,padding:"1px 8px"}} title="Moyenne de jeu (aux 3 fléchettes) sur tout le tournoi">moy {stats[j.id].moy.toFixed(2)}</span>}
                    </div>
                    <div style={{fontSize:11,color:CT.muted,marginTop:2}}>
                      <b style={{color:CT.green}}>{V}V</b> <b style={{color:"#f87171"}}>{D}D</b>
                      {joue&&<> · manches <b style={{color:CT.text}}>{MP}</b>–<b style={{color:CT.text}}>{MC}</b> <span style={{color:diff>=0?CT.green:"#f87171",fontWeight:600}}>({diff>=0?"+":""}{diff})</span></>}
                      {sb.v+sb.d>0&&<span style={{color:RED_TP,fontWeight:600}}> · dont barrage {sb.v}V {sb.d}D</span>}
                      {qual&&<span style={{color:CT.green,fontWeight:700}}> · ✓ Qualifié</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:17,fontWeight:800,color:qual?gc:CT.text,lineHeight:1}}>{PTS}</div>
                    <div style={{fontSize:9.5,color:CT.muted,marginTop:1,letterSpacing:.5}}>PTS</div>
                  </div>
                </div>
              ];
            })}
            {/* Matchs du groupe */}
            <div style={{borderTop:`1px solid ${CT.border}`,paddingTop:14,marginTop:10}}>
              <div style={{fontSize:11,color:CT.muted,fontWeight:600,letterSpacing:1,marginBottom:10}}>MATCHS</div>
              {mG.map(m=>carteMatch(m,false))}
              {barrageG.map(m=>carteMatch(m,true))}
            </div>
          </Card>
        );
      })}

      {/* Advance to eliminatoires */}
      {allDone&&isCreateur&&!tieNonTranchee&&!bracketLance&&(
        <Btn onClick={onLancerEliminatoires} style={{width:"100%",fontSize:15,padding:14}}>
          <EmoIcon e="🏆" size={15} style={{verticalAlign:"-2px",marginRight:6}}/>Lancer les éliminatoires
        </Btn>
      )}
      {allDone&&isCreateur&&tieNonTranchee&&!bracketLance&&(
        <div style={{textAlign:"center",fontSize:12.5,color:RED_TP,fontWeight:700,padding:"12px 8px",lineHeight:1.5}}>⚠️ Départage l'égalité (barrage en 701) avant de lancer les éliminatoires.</div>
      )}
      {bracketLance&&(
        <div style={{textAlign:"center",fontSize:12,color:CT.muted,padding:"11px 12px",lineHeight:1.5,background:"#16161d",borderRadius:10,border:`1px solid ${CT.border}`}}><EmoIcon e="ℹ️" size={12} style={{verticalAlign:"-1px",marginRight:4}}/>Consultation des poules — le tableau final est déjà lancé (onglet <b style={{color:CT.accent}}>Éliminatoires</b>). Les scores de poule sont maintenant <b style={{color:CT.text}}>verrouillés</b> : le classement qui a servi à créer le tableau ne peut plus changer.</div>
      )}
    </div>
  );
};

// ── VUE BRACKET ───────────────────────────────────────────────────────────────
// ── Identité visuelle par tour (couleur différente selon le stade) ────────────
const bktRoundColor=(phase)=>{
  switch(phase){
    case "finale":        return "#fbbf24"; // OR
    case "petite_finale": return CT.yellow; // bronze / ambre
    case "demi":          return CT.red;    // demi-finales
    case "quart":         return CT.yellow; // quarts
    case "huitieme":      return CT.accent; // huitièmes
    case "seizieme":      return CT.accent; // seizièmes
    case "consolante":    return CT.purple;
    default:              return CT.accent;
  }
};
const bktPhaseLabel=(phase,r)=>{
  switch(phase){
    case "finale":        return <EmoText s="🏆 Finale" size={13}/>;
    case "petite_finale": return <EmoText s="🥉 3e place" size={13}/>;
    case "demi":          return <EmoText s="🥈 Demi-finales" size={12}/>;
    case "quart":         return <EmoText s="⚔️ Quarts" size={12}/>;
    case "huitieme":      return <EmoText s="🎯 Huitièmes" size={12}/>;
    case "seizieme":      return <EmoText s="🎯 Seizièmes" size={12}/>;
    case "consolante":    return "Consolante";
    default:              return "Tour "+r;
  }
};

// ── Keyframes du bracket (injectés une fois) ─────────────────────────────────
const BktStyles=()=>(
  <style>{`
    @keyframes bkt-halo{0%,100%{box-shadow:0 0 0 1px #fbbf2455 inset,0 0 18px 2px #fbbf2433;}50%{box-shadow:0 0 0 1px #fbbf2488 inset,0 0 32px 7px #fbbf2455;}}
    @keyframes bkt-pulse{0%,100%{opacity:.5;}50%{opacity:1;}}
    @keyframes bkt-slidein{0%{opacity:0;transform:translateX(-10px) scale(.85);}100%{opacity:1;transform:translateX(0) scale(1);}}
    @keyframes bkt-glowdot{0%,100%{box-shadow:0 0 4px 0 currentColor;}50%{box-shadow:0 0 10px 2px currentColor;}}
    @keyframes bkt-emblem{0%,100%{transform:scale(1);box-shadow:0 0 14px #fbbf2455;}50%{transform:scale(1.08);box-shadow:0 0 26px #fbbf2299;}}
    @keyframes bkt-crown{0%,100%{transform:translateY(0);}50%{transform:translateY(-2px);}}
  `}</style>
);

// ── Avatar bracket (initiales, garde-fou anti-crash) ─────────────────────────
const bktInit=(nom)=>{ try{ return nom?initiales(nom):"?"; }catch(_){ return "?"; } };
const BktAvatar=({nom,col,win,size=40,animate})=>(
  <span style={{
    width:size,height:size,borderRadius:"50%",flexShrink:0,
    display:"inline-flex",alignItems:"center",justifyContent:"center",
    fontSize:size>42?14:13,fontWeight:800,
    background:(win?CT.green:col)+"22",
    color:win?CT.green:(nom?col:CT.muted),
    border:`2px solid ${(win?CT.green:(nom?col:CT.border))}${win?"":"66"}`,
    boxShadow:win?`0 0 10px ${CT.green}55`:"none",
    animation:animate?"bkt-slidein .5s ease both":"none",
  }}>{bktInit(nom)}</span>
);

// ── Bandeau de statut (haut de chaque carte) ─────────────────────────────────
const BktStatusBanner=({label,color,bg,hero})=>(
  <div style={{
    display:"flex",alignItems:"center",justifyContent:"center",gap:6,
    padding:hero?"6px 10px":"4px 10px",
    fontSize:hero?11.5:10,fontWeight:800,letterSpacing:1,textTransform:"uppercase",
    color:color,background:bg,borderBottom:`1px solid ${color}33`,
  }}>
    <span style={{width:7,height:7,borderRadius:"50%",background:color,color:color,animation:"bkt-glowdot 1.6s ease-in-out infinite"}}/>
    {label}
  </div>
);

// ============================================================================
//  Carte de match du tableau (Match Card e-sport)
// ============================================================================
// `actif` = ce match est élu par le planning des cibles (matchsSurCibles). null = pas de planning
// (rétrocompatible : tout est jouable, comportement d'avant).
const BracketMatchCard=({match,joueurs,isCreateur,onSaisirScore,onJouerMatch,canPlay=false,hero=false,live=null,stats=null,actif=null})=>{
  const j1=joueurs.find(j=>j.id===match.joueur1_id);
  const j2=joueurs.find(j=>j.id===match.joueur2_id);
  const doneBrut=match.statut==="termine";
  // Un exempt qu'on a fait avancer passe au statut "termine" en base (propagerByes) — c'est VOULU :
  // allDone, les stats et le planning des cibles s'appuient dessus. Mais à l'écran il s'affichait alors
  // comme un vrai match « Terminé 0-0 » contre « À définir », et les joueurs demandaient qui avait joué.
  // On le reconnaît ici sans toucher à la base : un seul des deux joueurs est renseigné.
  const exemptAvance=doneBrut&&((match.joueur1_id&&!match.joueur2_id)||(match.joueur2_id&&!match.joueur1_id));
  const done=doneBrut&&!exemptAvance;
  const bye=(match.statut&&match.statut.startsWith("bye"))||exemptAvance;
  // "en attente" seulement si un des deux joueurs manque encore. Si les DEUX sont connus, le match est jouable
  // même si le statut est resté bloqué sur "attente_avancement" (course entre 2 téléphones qui valident 2 demies en même temps).
  const waiting=(match.statut==="attente_avancement"||match.statut==="vide")&&(!j1||!j2);
  const playable=!done&&!bye&&!waiting&&j1&&j2;
  const surCible=actif===null||actif===true; // pas de planning fourni → jouable (comportement d'avant)
  // Match "en cours" = quelqu'un a lancé le scoreur (live_sessions en_cours) → on n'affiche plus "Jouer".
  const enCours=playable&&!!live&&!!live.pairs&&live.pairs.has([String(match.joueur1_id),String(match.joueur2_id)].sort().join("|"));
  const roundCol=bktRoundColor(match.phase);
  const emblemCol=hero?"#fbbf24":roundCol;

  const borderColor=done?CT.green:hero?"#fbbf24":bye?CT.green:waiting?CT.border:roundCol;
  const avSize=hero?46:40;
  const nameSize=hero?16:14;

  // Bandeau de statut (le point coloré porte déjà la couleur → libellés sans emoji)
  let banner;
  if(hero){            banner={label:"Grande finale",color:"#fbbf24",bg:"linear-gradient(90deg,#78350f55,#fbbf2433,#78350f55)"}; }
  else if(done){       banner={label:"Terminé",color:CT.green,bg:CT.green+"14"}; }
  else if(bye){        banner={label:"Qualifié",color:CT.green,bg:CT.green+"14"}; }
  else if(waiting){    banner={label:"En attente",color:CT.muted,bg:"#ffffff08"}; }
  else if(enCours){    banner={label:"Match en cours",color:"#ef4444",bg:"#ef444416"}; }
  else{                banner={label:"À jouer",color:roundCol,bg:roundCol+"14"}; }

  // Ligne joueur (avatar + nom + score) — ghostLabel quand le slot n'a pas encore de joueur
  const playerRow=(j,isWin,score,ghostLabel,crown)=>(
    <div style={{
      display:"flex",alignItems:"center",gap:10,
      padding:hero?"9px 11px":"7px 10px",borderRadius:8,
      background:isWin?CT.green+"1e":done&&j&&!isWin?CT.red+"12":"transparent",
      border:isWin?`1px solid ${CT.green}44`:"1px solid transparent",
    }}>
      <div style={{position:"relative",display:"inline-flex",flexShrink:0}}>
        {crown&&<div style={{position:"absolute",top:-15,left:0,right:0,display:"flex",justifyContent:"center",pointerEvents:"none",animation:"bkt-crown 1.8s ease-in-out infinite",filter:"drop-shadow(0 2px 4px #fbbf2488)"}}><EmoIcon e="👑" size={18} color="#fbbf24"/></div>}
        <BktAvatar nom={j?.nom} col={roundCol} win={isWin} size={avSize} animate={isWin&&done}/>
      </div>
      <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column"}}>
        <span style={{
          fontSize:nameSize,fontWeight:isWin?800:j?600:500,
          color:isWin?CT.green:j?CT.text:CT.muted,
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
        }}>
          {j?.nom || ghostLabel || (bye?"— pas d'adversaire —":"À définir")}
        </span>
        {j&&stats&&stats[j.id]&&stats[j.id].moy>0&&<span style={{fontSize:10,color:CT.purple,fontWeight:700,marginTop:1}}>moy {stats[j.id].moy.toFixed(2)}</span>}
      </div>
      {done&&<span style={{fontSize:hero?22:18,fontWeight:900,minWidth:22,textAlign:"center",color:isWin?CT.green:CT.muted}}>{score}</span>}
      {isWin&&<span style={{display:"inline-flex"}}><EmoIcon e="✅" size={hero?18:15} color={CT.green}/></span>}
    </div>
  );

  // Libellé de la case encore vide : dépend de la phase. Simple et sans numéro inventé.
  // petite finale = on y reçoit les PERDANTS des demies ; consolante = on y repêche les PERDANTS du 1er tour.
  const ghostLabelPhase=
    match.phase==="petite_finale" ? "Perdant de demi-finale"
    : match.phase==="consolante" ? "Vainqueur du tour précédent"
    : "Vainqueur du tour précédent";
  const ghost1=!j1&&waiting?ghostLabelPhase:null;
  const ghost2=!j2&&waiting?ghostLabelPhase:null;
  const crown1=hero&&done&&match.gagnant_id===j1?.id;
  const crown2=hero&&done&&match.gagnant_id===j2?.id;

  return(
    <div style={{
      position:"relative",
      background:hero?"linear-gradient(160deg,#1c1608,#1a1a1a 55%,#140f04)":"linear-gradient(160deg,#1d1d1d,#161616)",
      // texture discrète "points / cible"
      backgroundImage:hero
        ?`radial-gradient(circle at 50% 0%, #fbbf2418, transparent 62%), radial-gradient(#fbbf240c 1px, transparent 1px)`
        :`radial-gradient(${roundCol}0c 1px, transparent 1px)`,
      backgroundSize:hero?"100% 100%, 9px 9px":"9px 9px",
      border:`${hero?3:2}px solid ${borderColor}${hero||done?"":"aa"}`,
      borderRadius:hero?16:12,overflow:"hidden",
      minWidth:hero?226:176,maxWidth:hero?268:210,width:"100%",
      boxShadow:hero?"0 0 0 1px #fbbf2455 inset, 0 0 26px 4px #fbbf2440":done?`0 4px 14px ${CT.green}22`:`0 4px 12px #00000055`,
      animation:hero?"bkt-halo 2.8s ease-in-out infinite":"none",
    }}>
      {hero&&(
        <div style={{display:"flex",justifyContent:"center",alignItems:"flex-end",paddingTop:12,paddingBottom:4,background:"linear-gradient(180deg,#fbbf2418,transparent)"}}>
          <div style={{filter:"drop-shadow(0 3px 8px #fbbf2488)"}}><EmoIcon e="🏆" size={44} color="#fbbf24"/></div>
        </div>
      )}

      <BktStatusBanner label={banner.label} color={banner.color} bg={banner.bg} hero={hero}/>

      <div style={{padding:hero?"12px 11px 11px":"9px 9px 8px",display:"flex",flexDirection:"column",gap:0}}>
        {playerRow(j1,done&&match.gagnant_id===j1?.id,match.score1,ghost1,crown1)}

        {/* Emblème central du duel : badge circulaire lumineux ⚔ */}
        <div style={{display:"flex",alignItems:"center",gap:8,padding:hero?"4px 2px":"2px 2px",margin:"2px 0"}}>
          <div style={{flex:1,height:2,borderRadius:2,background:`linear-gradient(90deg,transparent,${emblemCol}66)`}}/>
          <div style={{
            width:hero?46:36,height:hero?46:36,borderRadius:"50%",flexShrink:0,
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            background:`radial-gradient(circle,${emblemCol}38,${emblemCol}0d 72%)`,
            border:`2px solid ${emblemCol}66`,boxShadow:`0 0 ${hero?18:11}px ${emblemCol}66`,
            animation:hero?"bkt-emblem 2.4s ease-in-out infinite":"none",
          }}>
            <EmoIcon e="⚔️" size={hero?22:16} color={emblemCol}/>
          </div>
          <div style={{flex:1,height:2,borderRadius:2,background:`linear-gradient(270deg,transparent,${emblemCol}66)`}}/>
        </div>

        {playerRow(j2,done&&match.gagnant_id===j2?.id,match.score2,ghost2,crown2)}

        {match.manches_max&&!bye&&(
          <div style={{textAlign:"center",fontSize:10,color:CT.muted,marginTop:6,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>
            <EmoIcon e="🎯" size={10} color={CT.muted}/>Premier à {match.manches_max} manche{match.manches_max>1?"s":""}
          </div>
        )}
      </div>

      {playable&&enCours&&(
        <div style={{padding:hero?"0 11px 12px":"0 9px 9px",display:"flex",gap:8,alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#ef4444",background:"#ef444418",borderRadius:20,padding:"5px 12px",display:"inline-flex",alignItems:"center",gap:6}}><span style={{width:7,height:7,borderRadius:"50%",background:"#ef4444",display:"inline-block",animation:"livePulse 1.4s infinite"}}/>Match en cours</span>
          {isCreateur&&<Btn onClick={()=>onSaisirScore(match)} variant="dark" small style={{fontSize:12,padding:"7px 12px"}}><EmoText s="✏️" size={12}/></Btn>}
        </div>
      )}
      {playable&&!enCours&&canPlay&&surCible&&(
        <div style={{padding:hero?"0 11px 12px":"0 9px 9px",display:"flex",gap:8,justifyContent:"center"}}>
          <Btn onClick={()=>onJouerMatch(match)} variant="primary" small style={{fontSize:12,padding:"7px 16px",boxShadow:`0 3px 10px ${CT.accent}55`}}><EmoText s="▶️ Jouer" size={12} color="#fff"/></Btn>
          {isCreateur&&<Btn onClick={()=>onSaisirScore(match)} variant="dark" small style={{fontSize:12,padding:"7px 12px"}}><EmoText s="✏️ Modifier" size={12}/></Btn>}
        </div>
      )}
      {/* Match jouable mais la cible n'est pas libre : on N'AFFICHE PAS "Jouer", sinon tout un tour de
          tableau (8 à 14 équipes) se lève en même temps pour 2 cibles. Le créateur garde le crayon. */}
      {playable&&!enCours&&canPlay&&!surCible&&(
        <div style={{padding:"0 9px 9px",display:"flex",gap:8,justifyContent:"center",alignItems:"center"}}>
          <div style={{flex:1,padding:"6px 8px",fontSize:10.5,color:CT.muted,fontWeight:700,textAlign:"center",background:"#ffffff08",borderRadius:8,border:`1px dashed ${CT.border}`}}>
            <EmoText s="⏳ En attente d'une cible" size={10.5} color={CT.muted}/>
          </div>
          {isCreateur&&<Btn onClick={()=>onSaisirScore(match)} variant="dark" small style={{fontSize:12,padding:"7px 12px"}}><EmoText s="✏️" size={12}/></Btn>}
        </div>
      )}
      {playable&&!enCours&&!canPlay&&(
        <div style={{padding:"0 9px 9px"}}>
          <div style={{padding:"6px 8px",fontSize:10.5,color:surCible?roundCol:CT.muted,fontWeight:700,textAlign:"center",background:(surCible?roundCol:"#ffffff")+"12",borderRadius:8,border:`1px solid ${surCible?roundCol+"33":CT.border}`}}>
            <EmoText s={surCible?"🎯 Match à jouer":"⏳ En attente d'une cible"} size={10.5} color={surCible?roundCol:CT.muted}/>
          </div>
        </div>
      )}
      {bye&&(
        <div style={{padding:"0 9px 9px"}}>
          <div style={{padding:"6px 8px",fontSize:10.5,color:CT.green,fontWeight:700,textAlign:"center",background:CT.green+"12",borderRadius:8,border:`1px solid ${CT.green}33`}}>
            <EmoText s="✅ Qualifié d'office" size={10.5} color={CT.green}/>
          </div>
        </div>
      )}
      {waiting&&(
        <div style={{padding:"0 9px 9px"}}>
          <div style={{padding:"6px 8px",fontSize:10.5,color:CT.muted,fontWeight:600,textAlign:"center",background:"#ffffff06",borderRadius:8,border:`1px dashed ${CT.border}`,animation:"bkt-pulse 2s ease-in-out infinite"}}>
            <EmoText s="⏳ En attente du tour précédent" size={10.5} color={CT.muted}/>
          </div>
        </div>
      )}
      {/* Match TERMINÉ : le créateur doit pouvoir corriger une faute de frappe (2-1 saisi au lieu de 1-2).
          Sans ce bouton, une erreur de saisie envoyait définitivement la mauvaise équipe au tour suivant. */}
      {done&&!bye&&isCreateur&&j1&&j2&&(
        <div style={{padding:hero?"0 11px 12px":"0 9px 9px",display:"flex",justifyContent:"center"}}>
          <Btn onClick={()=>onSaisirScore(match)} variant="dark" small style={{fontSize:12,padding:"7px 14px"}}><EmoText s="✏️ Corriger le score" size={12}/></Btn>
        </div>
      )}
    </div>
  );
};

// ============================================================================
//  Gouttière de connexion — coudes CSS entre deux tours (auto-alignés en flex)
// ============================================================================
const BktGutter=({pairs,color})=>(
  <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around",flex:1,minHeight:0,alignSelf:"stretch",width:26,flexShrink:0,position:"relative"}}>
    {Array.from({length:pairs}).map((_,i)=>(
      <div key={i} style={{position:"relative",flex:1,minHeight:60}}>
        {/* 2 stubs ENTRANTS à gauche (sortent des 2 cartes du tour source) */}
        <div style={{position:"absolute",left:0,top:"25%",width:13,height:2,background:color+"66"}}/>
        <div style={{position:"absolute",left:0,bottom:"25%",width:13,height:2,background:color+"66"}}/>
        {/* montant vertical au bout des stubs, qui joint les 2 */}
        <div style={{position:"absolute",left:12,top:"25%",bottom:"25%",width:2,background:color+"66",borderRadius:2}}/>
        {/* 1 stub SORTANT à droite (vers le tour suivant / la finale) */}
        <div style={{position:"absolute",left:13,right:0,top:"50%",height:2,background:color+"66",transform:"translateY(-1px)"}}/>
        {/* pastille de jonction à l'entrée du tour suivant */}
        <div style={{position:"absolute",right:-3,top:"50%",transform:"translateY(-50%)",width:6,height:6,borderRadius:"50%",background:color,boxShadow:`0 0 6px ${color}`}}/>
      </div>
    ))}
  </div>
);

// ============================================================================
//  VUE ÉLIMINATOIRES (arbre de championnat)
// ============================================================================
const EliminatoiresView=({tournoi,joueurs,matchs,isCreateur,nbCibles=1,onSaisirScore,onJouerMatch,onRetourPoules,onTerminer,onLibererCibles,canPlay=false,onOpenShare,live=null,stats=null})=>{
  const bracketM=matchs.filter(m=>m.phase!=="poules");
  const mainM=bracketM.filter(m=>MAIN_PHASES.includes(m.phase));
  const petiteM=bracketM.find(m=>m.phase==="petite_finale");
  const consoM=bracketM.filter(m=>m.phase==="consolante");
  const rounds=[...new Set(mainM.map(m=>m.round_bracket))].sort((a,b)=>a-b);
  const consoRounds=[...new Set(consoM.map(m=>m.round_bracket))].sort((a,b)=>a-b);
  // Nombre RÉEL d'équipes repêchées = équipes distinctes présentes au 1er tour de la consolante
  // (exempts compris). Sert à afficher un chiffre juste sous le titre « Consolante » : le texte
  // affirmait avant que la dernière de chaque poule était exclue, ce qui est faux (elle y joue dès
  // que nbQual + nbConso ≥ taille de la poule, c.-à-d. la config par défaut du club).
  const nbConsoTeams=new Set(consoM.filter(m=>(m.round_bracket||0)===1).flatMap(m=>[m.joueur1_id,m.joueur2_id]).filter(Boolean)).size;
  const allDone=bracketM.length>0&&bracketM.every(m=>m.statut==="termine"||(m.statut&&m.statut.startsWith("bye"))||m.statut==="vide");
  const finale=mainM.find(m=>m.phase==="finale");
  const champion=finale&&finale.statut==="termine"&&finale.gagnant_id?joueurs.find(j=>j.id===finale.gagnant_id):null;
  const finaleRoundNum=rounds.length?Math.max(...rounds):0;

  // PLANNING DES CIBLES — même moteur qu'en poules (matchsSurCibles). Sans lui, au lancement des quarts
  // les 8 (jusqu'à 14) équipes encore en lice recevaient toutes « c'est à toi de jouer » en même temps
  // pour 2 cibles : embouteillage au pas de tir. Tableau principal, petite finale et consolante se
  // partagent les MÊMES cibles physiques → un seul planning commun.
  const jouables=bracketM.filter(m=>m.statut!=="termine"&&!(m.statut&&m.statut.startsWith("bye"))&&m.statut!=="vide"&&m.joueur1_id&&m.joueur2_id);
  const actifsBracket=matchsSurCibles(jouables,nbCibles,matchs,live);
  const enAttenteCible=Math.max(0,jouables.length-actifsBracket.size);
  // Même découpage qu'en poules : « à lancer » vs « en cours ». Ici c'était encore plus visible, car le
  // nombre de cibles est affiché juste à côté : l'écran pouvait annoncer 3 matchs pour 2 cibles.
  const nbEnCoursBracket=compterEnCours(jouables,actifsBracket,live);
  const nbALancerBracket=Math.max(0,actifsBracket.size-nbEnCoursBracket);

  const colHeaderH=30;

  const colLabel=(phase,r)=>{
    const col=bktRoundColor(phase);
    return(
      <div style={{
        height:colHeaderH,display:"flex",alignItems:"center",justifyContent:"center",gap:6,
        marginBottom:6,padding:"0 12px",borderRadius:20,alignSelf:"center",
        fontSize:11.5,fontWeight:800,letterSpacing:1,textTransform:"uppercase",
        color:col,background:col+"14",border:`1px solid ${col}44`,whiteSpace:"nowrap",
      }}>
        {bktPhaseLabel(phase,r)}
      </div>
    );
  };

  const roundColWithGutter=(r,withGutter,gutterColor)=>{
    const rm=mainM.filter(m=>m.round_bracket===r).sort((a,b)=>a.position_bracket-b.position_bracket);
    const phase=rm[0]?.phase||"";
    const isFinaleCol=phase==="finale";
    return(
      <div key={r} style={{display:"flex",alignItems:"stretch",flexShrink:0}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,paddingTop:isFinaleCol?26:0}}>
          {colLabel(phase,r)}
          <div style={{flex:1,width:"100%",display:"flex",flexDirection:"column",justifyContent:"space-around",alignItems:"center",gap:24}}>
            {rm.map(m=>(
              <BracketMatchCard key={m.id} match={m} joueurs={joueurs} isCreateur={isCreateur} onSaisirScore={onSaisirScore} onJouerMatch={onJouerMatch} canPlay={canPlay} hero={isFinaleCol} live={live} stats={stats} actif={actifsBracket.has(m.id)}/>
            ))}
          </div>
        </div>
        {withGutter&&rm.length>1&&(
          <div style={{display:"flex",flexDirection:"column",paddingTop:colHeaderH+6}}>
            <BktGutter pairs={Math.max(1,Math.floor(rm.length/2))} color={gutterColor||bktRoundColor(phase)}/>
          </div>
        )}
      </div>
    );
  };

  const petiteCol=()=>(
    <div key="petite-finale" style={{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",gap:24,flexShrink:0}}>
      {colLabel("petite_finale",0)}
      <BracketMatchCard match={petiteM} joueurs={joueurs} isCreateur={isCreateur} onSaisirScore={onSaisirScore} onJouerMatch={onJouerMatch} canPlay={canPlay} live={live} stats={stats} actif={actifsBracket.has(petiteM.id)}/>
    </div>
  );

  const nonFinaleRounds=rounds.filter(r=>r!==finaleRoundNum);

  return(
    <div>
      <BktStyles/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {isCreateur
          ? <button onClick={onRetourPoules} style={{background:"none",border:`1px solid ${CT.border}`,color:CT.muted,cursor:"pointer",fontSize:12,padding:"6px 12px",borderRadius:8,display:"inline-flex",alignItems:"center",gap:6,touchAction:"manipulation"}}>← Retour aux poules</button>
          : <span/>}
        {isCreateur&&<Btn onClick={()=>onTerminer(allDone)} variant={allDone?"primary":"dark"} small style={{fontSize:12}}>🏆 Terminer le tournoi</Btn>}
      </div>

      {!canPlay&&(
        <Card style={{marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:12.5,color:CT.text,fontWeight:600,marginBottom:onOpenShare?8:0}}>👀 Tu es en mode spectateur (lecture seule)</div>
          {onOpenShare&&<Btn onClick={onOpenShare} variant="ghost" small><EmoText s="🎯 Entrer le code pour jouer" size={12}/></Btn>}
        </Card>
      )}

      {champion&&(
        <Card style={{textAlign:"center",marginBottom:16,background:"linear-gradient(135deg,#78350f22,#f97316)",border:`1px solid ${CT.yellow}`,boxShadow:`0 0 26px ${CT.yellow}44`}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:2}}><EmoIcon e="🏆" size={42} color="#fbbf24"/></div>
          <div style={{fontWeight:800,fontSize:19,color:CT.yellow}}>{champion.nom} remporte le tournoi !</div>
          {isCreateur&&<Btn onClick={()=>onTerminer(true)} variant="primary" style={{marginTop:12}}>🏁 Clôturer et voir le classement final</Btn>}
        </Card>
      )}

      {/* Compteur du planning des cibles — même repère qu'en poules */}
      {!allDone&&jouables.length>0&&(
        <div style={{marginTop:10,fontSize:12.5,textAlign:"center"}}>
          <span style={{color:CT.green,fontWeight:800}}>🟢 {nbALancerBracket} à lancer maintenant</span>
          {nbEnCoursBracket>0&&<span style={{color:RED_TP}}> · 🔴 {nbEnCoursBracket} en cours</span>}
          <span style={{color:CT.muted}}> · 🎯 {nbCibles} cible{nbCibles>1?"s":""}</span>
          {enAttenteCible>0&&<span style={{color:CT.muted}}> · ⏳ {enAttenteCible} en attente</span>}
        </div>
      )}
      {/* Cibles toutes occupées alors qu'il reste des matchs : un scoreur est resté ouvert. */}
      {!allDone&&jouables.length>0&&actifsBracket.size===0&&(
        <div style={{marginTop:10,padding:"10px 12px",background:RED_TP+"12",border:`1px solid ${RED_TP}44`,borderRadius:10,textAlign:"center"}}>
          <div style={{fontSize:12,color:"#fca5a5",fontWeight:700,marginBottom:onLibererCibles&&isCreateur?8:0}}>
            <EmoText s="⏳ Toutes les cibles sont occupées" size={12} color="#fca5a5"/>
            <div style={{fontSize:11,color:CT.muted,fontWeight:600,marginTop:3}}>Un scoreur est peut-être resté ouvert (téléphone déchargé).</div>
          </div>
          {onLibererCibles&&isCreateur&&(
            <Btn onClick={onLibererCibles} variant="dark" small style={{fontSize:12}}><EmoText s="🔓 Débloquer les cibles" size={12}/></Btn>
          )}
        </div>
      )}

      {/* Tableau principal — arbre de championnat */}
      <div style={{overflowX:"auto",paddingBottom:16,WebkitOverflowScrolling:"touch"}}>
        <div style={{display:"flex",gap:0,alignItems:"stretch",minWidth:"max-content",padding:"30px 4px 8px"}}>
          {nonFinaleRounds.map((r,i)=>roundColWithGutter(r,true,i===nonFinaleRounds.length-1?"#fbbf24":null))}
          {petiteM&&petiteCol()}
          {rounds.filter(r=>r===finaleRoundNum).map(r=>roundColWithGutter(r,false,null))}
        </div>
      </div>

      {/* Consolante */}
      {consoM.length>0&&(
        <div style={{marginTop:10,borderTop:`1px solid ${CT.border}`,paddingTop:14}}>
          <div style={{fontWeight:800,fontSize:15,color:CT.purple,marginBottom:2,display:"flex",alignItems:"center",gap:6}}><EmoIcon e="🎖️" size={15} color={CT.purple}/>Consolante</div>
          <div style={{fontSize:11.5,color:CT.muted,marginBottom:10}}>{nbConsoTeams>1?`Les ${nbConsoTeams} équipes repêchées`:"Les équipes repêchées"} (les meilleures non qualifiées de chaque poule) jouent ici pour le lot de consolation.</div>
          <div style={{overflowX:"auto",paddingBottom:16,WebkitOverflowScrolling:"touch"}}>
            <div style={{display:"flex",gap:0,alignItems:"stretch",minWidth:"max-content",padding:"8px 4px"}}>
              {consoRounds.map((r,idx)=>{
                const rm=consoM.filter(m=>m.round_bracket===r).sort((a,b)=>a.position_bracket-b.position_bracket);
                const isLast=r===consoRounds[consoRounds.length-1];
                return(
                  <div key={r} style={{display:"flex",alignItems:"stretch",flexShrink:0}}>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
                      <div style={{height:colHeaderH,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:6,padding:"0 12px",borderRadius:20,fontSize:11.5,fontWeight:800,letterSpacing:1,textTransform:"uppercase",color:CT.purple,background:CT.purple+"14",border:`1px solid ${CT.purple}44`,whiteSpace:"nowrap"}}>
                        {isLast?<EmoText s="🎖️ Finale consolante" size={11.5} color={CT.purple}/>:"Tour "+r}
                      </div>
                      <div style={{flex:1,width:"100%",display:"flex",flexDirection:"column",justifyContent:"space-around",alignItems:"center",gap:24}}>
                        {rm.map(m=>(
                          <BracketMatchCard key={m.id} match={m} joueurs={joueurs} isCreateur={isCreateur} onSaisirScore={onSaisirScore} onJouerMatch={onJouerMatch} canPlay={canPlay} live={live} stats={stats} actif={actifsBracket.has(m.id)}/>
                        ))}
                      </div>
                    </div>
                    {!isLast&&rm.length>1&&(
                      <div style={{display:"flex",flexDirection:"column",paddingTop:colHeaderH+6}}>
                        <BktGutter pairs={Math.max(1,Math.floor(rm.length/2))} color={CT.purple}/>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── VUE RÉSULTATS ─────────────────────────────────────────────────────────────
const ResultatsView=({tournoi,joueurs,matchs,onRejouer,onQuitter})=>{
  // Verrou local anti double-clic sur 'Rejouer' (ResultatsView n'a pas l'etat 'saving' du parent)
  const rejouLockRef=useRef(false);
  const [rejouLock,setRejouLock]=useState(false);
  const finale=matchs.find(m=>m.phase==="finale"&&m.statut==="termine");
  const gagnant=finale?joueurs.find(j=>j.id===finale.gagnant_id):null;
  const perdant=finale?joueurs.find(j=>j.id===(finale.joueur1_id===finale.gagnant_id?finale.joueur2_id:finale.joueur1_id)):null;
  // 3e place (petite finale)
  const petite=matchs.find(m=>m.phase==="petite_finale"&&m.statut==="termine"&&m.gagnant_id);
  const troisieme=petite?joueurs.find(j=>j.id===petite.gagnant_id):null;
  // Vainqueur de la consolante : SEULEMENT quand la vraie finale de consolante est finie.
  // maxRoundConso = le dernier tour de la consolante (tous matchs consolante confondus, pas seulement ceux deja joues).
  const consoAll=matchs.filter(m=>m.phase==="consolante");
  const maxRoundConso=consoAll.length?Math.max(...consoAll.map(m=>m.round_bracket||0)):0;
  const consoFinale=consoAll.find(m=>m.round_bracket===maxRoundConso&&m.statut==="termine"&&m.gagnant_id);
  const consoWinner=consoFinale?joueurs.find(j=>j.id===consoFinale.gagnant_id):null;

  // Stats du tournoi par équipe (moyenne pondérée sur TOUS les matchs, meilleure moyenne, plus gros finish, 180).
  const statsTournoi=useStatsTournoi(joueurs, matchs.filter(m=>m.statut==="termine").length);

  // MVP = équipe avec la meilleure MOYENNE DE JEU du tournoi ; à défaut (aucune moyenne enregistrée) → le plus de victoires
  const mvp=(()=>{
    if(statsTournoi){
      const avecMoy=joueurs.filter(j=>statsTournoi[j.id]&&statsTournoi[j.id].moy>0);
      if(avecMoy.length)return [...avecMoy].sort((a,b)=>(statsTournoi[b.id].moy-statsTournoi[a.id].moy)||(b.victoires-a.victoires))[0];
    }
    return [...joueurs].sort((a,b)=>b.victoires-a.victoires)[0];
  })();
  const mvpStats=mvp&&statsTournoi?statsTournoi[mvp.id]:null;
  const palmares=mvpStats?{moyenne:mvpStats.moy>0?mvpStats.moy:null,best:mvpStats.best>0?mvpStats.best:null,finish:mvpStats.finish,nb180:mvpStats.nb180}:null;
  const hasPalmares=!!palmares&&(palmares.moyenne!=null||palmares.finish>0||palmares.nb180>0);

  // Best stats
  const bestPoules=rankGroup(joueurs,[],matchs)[0];

  return(
    <div>
      {/* Podium */}
      {gagnant&&(
        <Card style={{textAlign:"center",marginBottom:16,background:"linear-gradient(135deg,#78350f22,#f97316)",border:`1px solid ${CT.yellow}`}}>
          <div style={{marginBottom:4,display:"flex",justifyContent:"center"}}><EmoIcon e="🏆" size={60} color="#fbbf24"/></div>
          <div style={{fontWeight:800,fontSize:24,color:CT.yellow}}>{gagnant.nom}</div>
          <div style={{color:CT.muted,fontSize:14}}>Champion du tournoi</div>
          {finale&&<div style={{marginTop:8,fontWeight:700,fontSize:18}}>{finale.gagnant_id===finale.joueur1_id?finale.score1:finale.score2} – {finale.gagnant_id===finale.joueur1_id?finale.score2:finale.score1}</div>}
          {perdant&&<div style={{color:CT.muted,fontSize:13,marginTop:4}}>vs {perdant.nom}</div>}
        </Card>
      )}

      {/* Podium du tableau (1er / 2e / 3e) */}
      {gagnant&&(
        <Card style={{marginBottom:16}}>
          <h3 style={{fontWeight:700,fontSize:15,marginBottom:12}}><EmoText s="🏅 Podium" size={15}/></h3>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#f9731614",borderRadius:8,marginBottom:6}}>
            <EmoIcon e="🥇" size={20}/><span style={{flex:1,fontWeight:800}}>{gagnant.nom}</span><span style={{fontSize:12,color:CT.muted}}>Champion</span>
          </div>
          {perdant&&(
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#94a3b814",borderRadius:8,marginBottom:troisieme?6:0}}>
              <EmoIcon e="🥈" size={20}/><span style={{flex:1,fontWeight:700}}>{perdant.nom}</span><span style={{fontSize:12,color:CT.muted}}>Finaliste</span>
            </div>
          )}
          {troisieme&&(
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:"#f59e0b14",borderRadius:8}}>
              <EmoIcon e="🥉" size={20}/><span style={{flex:1,fontWeight:700}}>{troisieme.nom}</span><span style={{fontSize:12,color:CT.muted}}>3e place</span>
            </div>
          )}
        </Card>
      )}

      {/* Vainqueur de la consolante */}
      {consoWinner&&(
        <Card style={{marginBottom:16,background:CT.accent+"11",border:`1px solid ${CT.accent}44`}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <EmoIcon e="🎖️" size={30}/>
            <div><div style={{fontWeight:700,fontSize:14,color:CT.accent}}>Vainqueur de la consolante</div><div style={{fontWeight:800,fontSize:17}}>{consoWinner.nom}</div></div>
          </div>
        </Card>
      )}

      {/* Classement par points (poules + tableau) */}
      <Card style={{marginBottom:16}}>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:12}}><EmoText s="📋 Classement par points" size={15}/></h3>
        {rankGroup(joueurs,[],matchs).map((j,i)=>(
          <div key={j.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:i===0?"#f9731614":i===1?"#94a3b814":i===2?"#f59e0b14":"transparent",borderRadius:8,marginBottom:4}}>
            <span style={{fontSize:18,display:"inline-flex",justifyContent:"center",width:20}}>{i<3&&(j.victoires+j.defaites)>0?<EmoIcon e={i===0?"🥇":i===1?"🥈":"🥉"} size={18}/>:"·"}</span>
            <span style={{flex:1,fontWeight:i<3?700:400,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{j.nom}</span>
            {statsTournoi&&statsTournoi[j.id]&&statsTournoi[j.id].moy>0&&<span style={{fontSize:12,fontWeight:800,color:CT.purple,flexShrink:0}} title="Moyenne de jeu (3 fléchettes) sur tout le tournoi">moy {statsTournoi[j.id].moy.toFixed(2)}</span>}
            <span style={{fontSize:12,color:CT.muted,flexShrink:0}}>{j.victoires}V {j.defaites}D</span>
            <span style={{fontWeight:700,color:CT.accent,flexShrink:0}}>{j.points} pts</span>
          </div>
        ))}
      </Card>

      {/* MVP : uniquement si le MVP a vraiment gagne au moins un match (evite un MVP a 0 victoire sur cloture anticipee) */}
      {mvp&&mvp.victoires>0&&(
        <Card style={{marginBottom:16,background:"#a78bfa11",border:`1px solid ${CT.purple}44`}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:hasPalmares?14:0}}>
            <EmoIcon e="⭐" size={32} color="#fbbf24" fill="#fbbf24"/>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:CT.purple}}>MVP du tournoi</div>
              <div style={{fontWeight:800,fontSize:18}}>{mvp.nom}</div>
              {mvpStats&&mvpStats.moy>0
                ? <div style={{fontSize:12.5,color:CT.muted,display:"flex",alignItems:"center",gap:5}}><span style={{color:CT.purple,fontWeight:800}}><EmoText s={`🎯 Moyenne ${mvpStats.moy.toFixed(2)}`} size={12.5} color={CT.purple}/></span><span>· {mvp.victoires}V</span></div>
                : <div style={{fontSize:12,color:CT.muted}}>{mvp.victoires} victoires · {mvp.points} points</div>}
            </div>
          </div>
          {hasPalmares&&(
            <>
              <div style={{fontSize:10,color:CT.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8,borderTop:`1px solid ${CT.purple}33`,paddingTop:12}}><EmoText s="🏅 Palmarès du tournoi" size={10}/></div>
              <div style={{display:"flex",gap:8}}>
                {[
                  {e:"🎯",l:"Meilleure moyenne (1 match)",v:palmares.best!=null?palmares.best.toFixed(2):"—"},
                  {e:"🏁",l:"Plus gros finish",v:palmares.finish>0?palmares.finish:"—"},
                  {e:"💥",l:"Nombre de 180",v:palmares.nb180||0},
                ].map((s,i)=>(
                  <div key={i} style={{flex:1,background:"#ffffff08",border:`1px solid ${CT.border}`,borderRadius:10,padding:"10px 4px",textAlign:"center"}}>
                    <EmoIcon e={s.e} size={16}/>
                    <div style={{fontWeight:900,fontSize:18,color:CT.purple,margin:"2px 0"}}>{s.v}</div>
                    <div style={{fontSize:9.5,color:CT.muted,lineHeight:1.2}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Tournoi terminé — ferme les résultats et revient à la liste des tournois */}
      {onQuitter&&(
        <Btn onClick={onQuitter} variant="primary" style={{width:"100%",marginTop:8}}>
          <EmoIcon e="🏆" size={15} color="#fff" style={{verticalAlign:"-2px",marginRight:6}}/>Tournoi terminé
        </Btn>
      )}
      {/* Rejouer */}
      <Btn onClick={()=>{ if(rejouLockRef.current)return; rejouLockRef.current=true; setRejouLock(true); onRejouer&&onRejouer(); }} disabled={rejouLock} variant="ghost" style={{width:"100%",marginTop:8}}>
        <EmoIcon e="🔄" size={14} style={{verticalAlign:"-2px",marginRight:6}}/>Rejouer avec les mêmes joueurs
      </Btn>
    </div>
  );
};

// ── DÉTAIL TOURNOI ────────────────────────────────────────────────────────────
export const TournoiPotesDetail=({tournoiId,joueurConnecte,setPage})=>{
  const [tournoi,setTournoi]=useState(null);
  const [joueurs,setJoueurs]=useState([]);
  const [showPoolConfig,setShowPoolConfig]=useState(false);
  const [showBracketConfig,setShowBracketConfig]=useState(false);
  const [matchs,setMatchs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [matchModal,setMatchModal]=useState(null);
  const [saving,setSaving]=useState(false);
  const [cibles,setCibles]=useState(2);
  const [nbQualLocal,setNbQualLocal]=useState(2); // repli d'affichage si la colonne nb_qualifies n'existe pas encore
  // Organisation des cibles : "optimise" (l'appli répartit et convoque) ou "par_poule" (chaque poule
  // sur sa cible, les joueurs s'organisent). Repli local si la colonne cibles_mode n'existe pas encore.
  const [ciblesModeLocal,setCiblesModeLocal]=useState("optimise");
  // Source de vérité : la colonne si elle existe, sinon le réglage de CE téléphone.
  const ciblesMode=(tournoi&&tournoi.cibles_mode)||ciblesModeLocal;
  const [showShare,setShowShare]=useState(false);
  const [codeUnlocked,setCodeUnlocked]=useState(()=>{ try{return localStorage.getItem("dp_tp_player_"+tournoiId)==="1";}catch(e){return false;} });
  const [liveInfo,setLiveInfo]=useState(()=>({occ:new Set(),pairs:new Set()})); // joueurs/matchs en train de scorer maintenant (live_sessions en_cours)
  const [vuePhase,setVuePhase]=useState("elim"); // pendant les éliminatoires : onglet affiché ("poules" pour consulter/corriger, "elim" pour le tableau)
  const pollRef=useRef(null);

  const reload=useCallback(async()=>{
    try{
      const [t,j,m]=await Promise.all([dbTP.getTournoi(tournoiId),dbTP.getJoueurs(tournoiId),dbTP.getMatchs(tournoiId)]);
      // Le tournoi a été supprimé (par le créateur, sur un autre téléphone) → on nettoie et on renvoie à la liste
      if(t===null||t===undefined){
        try{
          const cur=JSON.parse(localStorage.getItem("dp_active_tournoi")||"null");
          if(cur&&cur.id===tournoiId)localStorage.removeItem("dp_active_tournoi");
        }catch(e){}
        if(pollRef.current)clearInterval(pollRef.current);
        setLoading(false);
        alert("Ce tournoi a été supprimé par son organisateur.");
        setPage("tournois-potes");
        return;
      }
      if(t)setTournoi(t);
      if(j)setJoueurs(j);
      if(m)setMatchs(m);
      // Qui est en train de scorer un match EN CE MOMENT ? (live_sessions "en_cours" récentes)
      // → pour ne jamais rappeler un joueur déjà occupé sur un autre match.
      try{
        const ids=(j||[]).map(x=>x.id).filter(Boolean);
        if(ids.length){
          const seuil=Date.now()-45*60*1000; // ignore les sessions "zombies" de +45 min
          const list=ids.join(",");
          const live=await sbTP(`live_sessions?statut=eq.en_cours&debut=gt.${seuil}&or=(joueur1_id.in.(${list}),joueur2_id.in.(${list}))&select=joueur1_id,joueur2_id`).catch(()=>[]);
          const occ=new Set(), pairs=new Set();
          (live||[]).forEach(s=>{
            const a=s.joueur1_id, b=s.joueur2_id;
            if(a!=null)occ.add(String(a));
            if(b!=null)occ.add(String(b));
            if(a!=null&&b!=null)pairs.add([String(a),String(b)].sort().join("|"));
          });
          setLiveInfo({occ,pairs});
        }else setLiveInfo({occ:new Set(),pairs:new Set()});
      }catch(e){/* échec réseau → on n'occupe personne (comportement d'avant) */}
    }catch(e){console.error(e);}
    setLoading(false);
  },[tournoiId]);

  useEffect(()=>{
    reload();
    // Polling toutes les 5s si tournoi actif
    pollRef.current=setInterval(reload,5000);
    return()=>clearInterval(pollRef.current);
  },[reload]);

  // Fenetre 'dirty' : apres un changement local de cibles, on ignore la valeur serveur qq secondes (le temps que l'ecriture se propage) → evite le retour en arriere du compteur.
  const cibleDirtyUntil=useRef(0);
  // Synchronise le nb de cibles depuis le serveur (si la colonne existe), SAUF pendant la fenetre dirty
  useEffect(()=>{ if(Date.now()<cibleDirtyUntil.current)return; if(tournoi&&typeof tournoi.nb_cibles==="number"&&tournoi.nb_cibles>0)setCibles(tournoi.nb_cibles); },[tournoi?.nb_cibles]);
  // Mémorise le tournoi actif (pour le bouton flottant "Reprendre le tournoi") — effacé quand il est terminé
  useEffect(()=>{
    if(!tournoi)return;
    try{
      if(tournoi.statut==="termine"){
        const cur=JSON.parse(localStorage.getItem("dp_active_tournoi")||"null");
        if(cur&&cur.id===tournoiId)localStorage.removeItem("dp_active_tournoi");
      }else{
        // On ne pose le FAB que pour un utilisateur IMPLIQUE : createur, joueur deverrouille, ou deja inscrit.
        const estCreateur=!!(joueurConnecte&&tournoi.createur_id===joueurConnecte.id);
        let dejaInscrit=false; try{dejaInscrit=localStorage.getItem("dp_tp_joined_"+tournoiId)==="1";}catch(e){}
        if(estCreateur||codeUnlocked||dejaInscrit){
          localStorage.setItem("dp_active_tournoi",JSON.stringify({id:tournoiId,nom:tournoi.nom||"Tournoi"}));
        }
      }
    }catch(e){}
  },[tournoi?.statut,tournoi?.nom,tournoiId,codeUnlocked]);
  // Change le nb de cibles (optimiste + persistance serveur si possible)
  const changerCibles=async(n)=>{
    const v=Math.max(1,Math.min(12,n));
    cibleDirtyUntil.current=Date.now()+4000; // 4s : on protege la valeur locale du polling
    setCibles(v);
    setTournoi(t=>t?{...t,nb_cibles:v}:t);
    try{ await dbTP.updateTournoi(tournoiId,{nb_cibles:v}); }catch(e){ /* colonne nb_cibles pas encore créée : on garde l'état local */ }
  };

  const isCreateur=joueurConnecte&&tournoi&&tournoi.createur_id===joueurConnecte.id;
  // canPlay : créateur OU joueur qui a saisi le code (sinon spectateur = lecture seule)
  const canPlay=!!isCreateur||codeUnlocked;
  const deverrouiller=()=>{ setCodeUnlocked(true); try{localStorage.setItem("dp_tp_player_"+tournoiId,"1");}catch(e){} setShowShare(false); };

  // Moyenne de jeu par équipe sur TOUT le tournoi (matchs joués au scoreur). Re-fetch à chaque match terminé.
  const statsTournoi=useStatsTournoi(joueurs||[], (matchs||[]).filter(m=>m.statut==="termine").length);

  // Auto-réparation des exempts (byes) bloqués : si un tableau a été lancé par une ancienne version
  // (bye jamais avancé → tour suivant vide), le CRÉATEUR le répare une fois à l'ouverture. Idempotent.
  const byeHealRef=useRef(false);
  useEffect(()=>{
    if(byeHealRef.current||!tournoi||tournoi.statut!=="eliminatoires"||!isCreateur)return;
    const stuck=matchs.some(m=>typeof m.statut==="string"&&m.statut.startsWith("bye")&&m.gagnant_id);
    if(!stuck)return;
    byeHealRef.current=true;
    (async()=>{ try{ await propagerByes(tournoiId); await reload(); }catch(e){console.error("propagerByes:",e);} })();
  },[tournoi?.statut,isCreateur,matchs,tournoiId,reload]);

  // ── Lancer le tournoi (phase poules)
  const lancerTournoi=async(poolSize=4,poolManches=2,nbCibles=2,nbQualif=2,ciblesMode="optimise")=>{
    if(joueurs.length<2)return;
    setSaving(true);
    setNbQualLocal(nbQualif); // affichage immediat (avant meme la relecture du tournoi)
    setCiblesModeLocal(ciblesMode); // idem : le mode s'applique tout de suite, même si la colonne manque
    // Repères pour le repli en cas d'erreur (voir le catch en bas de la fonction).
    let lobbyFerme=false, matchsCrees=false;
    try{
      // ── On FERME LE LOBBY EN PREMIER, avant même le tirage au sort. ──
      // POURQUOI : écrire les groupes prend plusieurs secondes (une requête réseau PAR équipe). Tant que
      // le tournoi restait en « attente » pendant ce temps, un copain qui scannait le QR passait quand
      // même la garde de rejoindre() et atterrissait dans la poule 1 (le groupe par défaut) : soit une
      // poule à 5 avec des matchs en plus, soit — s'il arrivait après la création des matchs — un inscrit
      // fantôme SANS AUCUN match à jouer, qui attend toute la soirée sans que rien ne le signale.
      // Lobby fermé d'abord ⇒ rejoindre() refuse proprement et la liste des inscrits est figée.
      await dbTP.updateTournoi(tournoiId,{statut:"poules"});
      lobbyFerme=true;
      // Relecture FRAÎCHE des inscrits : celui qui s'est inscrit une seconde avant la fermeture doit être
      // dans le tirage (cet écran peut avoir jusqu'à 5 s de retard). Repli sur la liste locale si la
      // relecture échoue — on ne tire jamais les poules sur une liste vide.
      const frais=await dbTP.getJoueurs(tournoiId).catch(()=>null);
      const inscrits=(frais&&frais.length>=2)?frais:joueurs;
      const nb=Math.max(1,Math.round(inscrits.length/poolSize)); // nb de poules d'après la taille choisie
      // Vrai tirage au sort (Fisher-Yates) puis répartition round-robin → poules équilibrées et aléatoires
      const shuffled=melangerAleatoire(inscrits);
      for(let i=0;i<shuffled.length;i++){
        await dbTP.updateJoueur(shuffled[i].id,{groupe:(i%nb)+1,ordre:i});
      }
      // Generate matches per group (avec les manches choisies)
      const joueursUpd=await dbTP.getJoueurs(tournoiId);
      const allMatchs=[];
      for(let g=1;g<=nb;g++){
        const jG=joueursUpd.filter(j=>j.groupe===g);
        allMatchs.push(...genPouleMatchs(jG,g,tournoiId,poolManches));
      }
      if(allMatchs.length>0)await dbTP.addMatchs(allMatchs);
      matchsCrees=true; // à partir d'ici le tournoi existe vraiment : plus de retour en arrière automatique
      // (le passage en statut "poules" a déjà été fait tout en haut, pour fermer le lobby avant le tirage)
      setCibles(nbCibles);
      // Réglages persistés en base. On ne fait PLUS échouer en silence : si l'écriture n'arrive pas
      // (colonne absente, réseau, permissions), le réglage n'existe que sur CE téléphone — un autre
      // appareil, ou un simple rechargement, repartirait sur la valeur par défaut (2 qualifiés) et des
      // équipes qualifiées disparaîtraient sans un mot. On vérifie donc que la valeur a bien atterri.
      try{ await dbTP.updateTournoi(tournoiId,{nb_cibles:nbCibles}); }catch(e){ /* colonne nb_cibles absente : sans effet sur les qualifiés */ }
      // Colonne cibles_mode facultative : si elle n'existe pas encore, le mode reste valable sur CE
      // téléphone (ciblesModeLocal) et l'appli retombe simplement sur "optimisé" ailleurs.
      try{ await dbTP.updateTournoi(tournoiId,{cibles_mode:ciblesMode}); }catch(e){ /* colonne cibles_mode pas encore créée */ }
      let qualifPersiste=false;
      try{
        await dbTP.updateTournoi(tournoiId,{nb_qualifies:nbQualif});
        const relu=await dbTP.getTournoi(tournoiId);
        qualifPersiste=!!relu&&relu.nb_qualifies===nbQualif;
      }catch(e){ qualifPersiste=false; }
      if(!qualifPersiste){
        alert(`⚠️ Le réglage « ${nbQualif} qualifié(s) par poule » n'a pas pu être enregistré sur le serveur.\n\nIl ne vaut que sur CE téléphone : si quelqu'un d'autre lance le tableau, ou si tu recharges la page, l'appli repartira sur 2 qualifiés par poule.\n\n👉 Lance le tableau depuis CE téléphone, sans recharger.`);
      }
      setShowPoolConfig(false);
      await reload();
    }catch(e){
      // Si ça a cassé AVANT que les matchs existent, on ROUVRE le lobby : sinon le tournoi resterait
      // affiché « en poules » sans un seul match, et plus personne ne pourrait s'inscrire.
      if(lobbyFerme&&!matchsCrees){ try{ await dbTP.updateTournoi(tournoiId,{statut:"attente"}); }catch(e2){} }
      alert("Erreur : "+e.message);
    }
    setSaving(false);
  };

  // ── Libérer les cibles bloquées par une session de scoreur restée ouverte ──
  // Un téléphone déchargé (ou une coupure) laisse une live_session "en_cours" : ses 2 joueurs restent
  // considérés comme occupés, donc plus aucun match ne devient jouable — jusqu'à 45 min, sans que rien
  // à l'écran n'explique pourquoi. On ne baisse PAS ce délai (un vrai 501 peut durer longtemps, et le
  // verrou sert à éviter qu'un même match soit scoré 2 fois) : on donne la main à l'organisateur.
  const libererCibles=async()=>{
    const ids=joueurs.map(j=>j.id).filter(Boolean);
    if(!ids.length)return;
    if(!(await confirmer("Débloquer les cibles ?\n\nÇa ferme les scoreurs restés ouverts (téléphone déchargé, appli fermée en plein match).\n\n⚠️ Si quelqu'un est VRAIMENT en train de scorer, son scoreur ne sera plus reconnu : il devra saisir le score à la main.")))return;
    setSaving(true);
    try{
      const seuil=Date.now()-45*60*1000;
      const list=ids.join(",");
      const zombies=await sbTP(`live_sessions?statut=eq.en_cours&debut=gt.${seuil}&or=(joueur1_id.in.(${list}),joueur2_id.in.(${list}))&select=id`).catch(()=>[]);
      for(const s of (zombies||[])){
        await sbTP(`live_sessions?id=eq.${s.id}`,{method:"PATCH",prefer:"return=minimal",body:JSON.stringify({statut:"termine"})}).catch(()=>{});
      }
      await reload();
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  // ── Saisir un score
  const saisirScore=async(match,score1,score2)=>{
    const gagnant_id=score1>score2?match.joueur1_id:match.joueur2_id;
    try{
      // GARDE anti-double-comptage : on relit le VRAI statut du match dans la base juste avant.
      // Si un autre appareil (ou le scoreur pendant les 5 s de rafraichissement) a deja termine ce match,
      // on NE doit PAS re-compter les points du tableau ni rejouer l'avancement (sinon stats doublees).
      const fraisMatchs=await dbTP.getMatchs(tournoiId);
      const matchFrais=fraisMatchs.find(m=>m.id===match.id);
      const dejaTermine=matchFrais&&matchFrais.statut==="termine";
      const estBracket=match.phase!=="poules"&&match.phase!=="barrage"&&(match.round_bracket||0)>0;
      const ancienGagnant=matchFrais?matchFrais.gagnant_id:null;
      const inversion=dejaTermine&&estBracket&&ancienGagnant&&ancienGagnant!==gagnant_id; // correction qui change le vainqueur d'un match de tableau
      // Si on inverse le vainqueur mais que le match SUIVANT de ce joueur est déjà joué, on ne peut pas
      // corriger proprement (il faudrait défaire un match déjà terminé) → on bloque avec un message clair.
      const cibles=inversion?ciblesAvancement(match,gagnant_id,fraisMatchs):[];
      if(inversion&&cibles.some(c=>c.target&&c.target.statut==="termine")){
        // On ne peut pas défaire un match déjà joué en aval. L'ancien message conseillait de "corriger d'abord
        // le match le plus avancé puis revenir" : impossible, corriger ne le remet pas en "à jouer" — on
        // restait donc bloqué à vie. On dit maintenant la vérité, avec les deux seules issues réelles.
        alert("⚠️ Impossible d'inverser le vainqueur : le match SUIVANT de ce joueur a déjà été joué.\n\nLe tableau est construit sur ce résultat, on ne peut plus le défaire d'ici.\n\nDeux solutions :\n• garder ce résultat et corriger seulement le SCORE (sans changer le vainqueur) ;\n• ou « Revenir à la phase de poules » pour refaire le tableau (⚠️ tous les matchs du tableau seront à rejouer).");
        return;
      }
      // ── Écriture anti-double-comptage (2 téléphones sur le même match) ──
      if(dejaTermine){
        // Correction volontaire : on écrit sans condition (on garde la date_fin d'origine).
        await dbTP.updateMatch(match.id,{score1,score2,gagnant_id,statut:"termine"});
      }else{
        // 1re saisie : "claim" ATOMIQUE côté serveur → on ne passe le match à "termine" QUE s'il ne l'est pas déjà.
        // Si un autre appareil l'a terminé entre notre lecture et notre écriture, le claim renvoie 0 ligne :
        // on NE compte PAS les points une 2e fois et on NE ré-avance PAS le tableau.
        const claim=await sbTP(`tournois_potes_matchs?id=eq.${match.id}&statut=neq.termine`,{method:"PATCH",prefer:"return=representation",body:JSON.stringify({score1,score2,gagnant_id,statut:"termine",date_fin:new Date().toISOString()})});
        if(!Array.isArray(claim)||claim.length===0){ await reload(); return; }
      }

      if(match.phase==="poules"){
        // Recalcule TOUT le classement de poules depuis les matchs terminés
        // → gère la 1re saisie ET les corrections, sans jamais compter les points en double
        const fresh=await dbTP.getMatchs(tournoiId);
        const st={}; joueurs.forEach(j=>{ st[j.id]={victoires:0,defaites:0,points:0,manches_pour:0,manches_contre:0}; });
        fresh.filter(m=>m.phase==="poules"&&m.statut==="termine"&&m.gagnant_id).forEach(m=>{
          const w=m.gagnant_id, l=m.gagnant_id===m.joueur1_id?m.joueur2_id:m.joueur1_id;
          const ws=m.gagnant_id===m.joueur1_id?m.score1:m.score2, ls=m.gagnant_id===m.joueur1_id?m.score2:m.score1;
          if(st[w]){ st[w].victoires++; st[w].points+=2; st[w].manches_pour+=ws; st[w].manches_contre+=ls; } // 2 pts / victoire
          if(st[l]){ st[l].defaites++; st[l].manches_pour+=ls; st[l].manches_contre+=ws; }                   // défaite = 0 pt (plus de point bonus)
        });
        // Même garde que dans le scoreur (voir handleResultat) : une fois le tableau lancé, ce recalcul
        // « poules seules » remettrait à zéro les victoires du tableau de TOUT LE MONDE. Le crayon des
        // poules est déjà masqué à ce moment-là (l'écran des poules passe en lecture seule), mais le
        // tableau peut être lancé depuis un AUTRE téléphone pendant que la fenêtre de saisie est ouverte ici.
        const tableauLance=!!tournoi&&(tournoi.statut==="eliminatoires"||tournoi.statut==="termine");
        if(!tableauLance){
          await Promise.all(joueurs.filter(j=>st[j.id]).map(j=>dbTP.updateJoueur(j.id,st[j.id])));
        }
      }else if(match.phase!=="barrage"){
        // Tableau (bracket) : contribution de CE match aux stats. 1re saisie → on AJOUTE le résultat.
        // Correction → on RETIRE d'abord l'ancien résultat puis on applique le nouveau (gère l'inversion
        // de vainqueur ET le changement de score, sans jamais compter en double).
        // On relit les joueurs FRAIS en base, exactement comme le fait déjà le scoreur (handleResultat) :
        // l'état React n'est rafraîchi que toutes les 5 s, et plus du tout quand le téléphone est en veille.
        // Écrire « ancienne valeur + delta » à partir d'une photo périmée écrase le résultat qu'un autre
        // appareil vient d'enregistrer (le classement par points final devient faux, sans aucun signal).
        const jFrais=await dbTP.getJoueurs(tournoiId);
        const j1=jFrais.find(j=>j.id===match.joueur1_id);
        const j2=jFrais.find(j=>j.id===match.joueur2_id);
        if(j1&&j2){
          const pts_win=2,pts_lose=1;
          const d1={victoires:0,defaites:0,points:0,manches_pour:0,manches_contre:0};
          const d2={victoires:0,defaites:0,points:0,manches_pour:0,manches_contre:0};
          const appliquer=(w,s1,s2,sign)=>{ // sign +1 = ajouter, -1 = retirer
            const lo=Math.min(s1,s2);
            d1.manches_pour+=sign*s1; d1.manches_contre+=sign*s2;
            d2.manches_pour+=sign*s2; d2.manches_contre+=sign*s1;
            if(w===j1.id){ d1.victoires+=sign; d1.points+=sign*pts_win; d2.defaites+=sign; d2.points+=sign*(lo>0?pts_lose:0); }
            else{ d2.victoires+=sign; d2.points+=sign*pts_win; d1.defaites+=sign; d1.points+=sign*(lo>0?pts_lose:0); }
          };
          if(dejaTermine)appliquer(matchFrais.gagnant_id,matchFrais.score1||0,matchFrais.score2||0,-1); // retire l'ancien
          appliquer(gagnant_id,score1,score2,+1);                                                       // applique le nouveau
          await dbTP.updateJoueur(j1.id,{victoires:j1.victoires+d1.victoires,defaites:j1.defaites+d1.defaites,points:j1.points+d1.points,manches_pour:j1.manches_pour+d1.manches_pour,manches_contre:j1.manches_contre+d1.manches_contre});
          await dbTP.updateJoueur(j2.id,{victoires:j2.victoires+d2.victoires,defaites:j2.defaites+d2.defaites,points:j2.points+d2.points,manches_pour:j2.manches_pour+d2.manches_pour,manches_contre:j2.manches_contre+d2.manches_contre});
        }
      }

      // Avancement du tableau. 1re saisie → on avance le vainqueur (pas de double avancement si déjà terminé).
      // Correction qui INVERSE le vainqueur → on remplace le joueur dans la/les case(s) suivante(s) déjà remplies.
      if(estBracket&&!dejaTermine){
        await advancerBracket(match,gagnant_id);
      }else if(inversion){
        for(const c of cibles){
          if(!c.target)continue;
          const patch=c.slotJ1?{joueur1_id:c.val}:{joueur2_id:c.val};
          const otherFilled=c.slotJ1?c.target.joueur2_id:c.target.joueur1_id;
          await dbTP.updateMatch(c.target.id,{...patch,statut:otherFilled?"en_attente":"attente_avancement"});
        }
        if(match.phase==="consolante")await propagerByes(tournoiId); // au cas où l'inversion recrée un exempt
      }else if(estBracket&&dejaTermine){
        // AUTO-RÉPARATION : le match est déjà terminé avec le MÊME vainqueur, mais l'avancement n'a
        // peut-être jamais eu lieu — réseau coupé entre le "claim" (match passé à terminé) et l'écriture
        // de la case suivante. Avant, re-saisir le même score ne réparait rien (on ne rentrait dans
        // aucune branche) et le tableau restait figé pour toujours, sans que personne puisse le savoir.
        // Si la case attendue est encore VIDE, on rejoue l'avancement : l'opération est idempotente.
        const attendues=ciblesAvancement(match,gagnant_id,fraisMatchs);
        const caseVide=attendues.some(c=>c.target&&!(c.slotJ1?c.target.joueur1_id:c.target.joueur2_id));
        if(caseVide)await advancerBracket(match,gagnant_id);
      }

      await reload();
    }catch(e){alert("Erreur : "+e.message);}
  };

  // Advance winner + route loser (consolante / petite finale)
  const advancerBracket=async(match,gagnant_id)=>{
    const freshMatchs=await dbTP.getMatchs(tournoiId);
    await avancerApresMatch(match,gagnant_id,freshMatchs);
    if(match.phase==="consolante")await propagerByes(tournoiId); // résorbe les exempts émergents de consolante
  };

  // ── Lancer les éliminatoires
  const lancerEliminatoires=async(config={})=>{
    const defQual=(tournoi&&tournoi.nb_qualifies!=null)?tournoi.nb_qualifies:nbQualLocal; // defaut = reglage des poules
    const {nbQual=defQual,bracketSize:bsChoisi,manchesMap={},consolante=false,petiteFinale=false,nbConso=2}=config;
    setSaving(true);
    try{
      // ── Lecture FRAÎCHE + classement recalculé depuis les MATCHS (source unique de vérité) ──
      // L'état React peut avoir jusqu'à quelques secondes de retard : saisir le dernier score de poule
      // déclenche une rafale d'écritures, et si on appuie sur "Lancer les éliminatoires" pendant ce
      // laps de temps, on classait sur des stats périmées. Une vraie égalité devenait invisible, le
      // tableau partait sans barrage, et l'équipe écartée n'avait aucun moyen de comprendre.
      const joueursFrais=await dbTP.getJoueurs(tournoiId);
      const matchsFrais=await dbTP.getMatchs(tournoiId);
      const stP={}; joueursFrais.forEach(j=>{ stP[j.id]={victoires:0,defaites:0,points:0,manches_pour:0,manches_contre:0}; });
      matchsFrais.filter(m=>m.phase==="poules"&&m.statut==="termine"&&m.gagnant_id).forEach(m=>{
        const w=m.gagnant_id, l=m.gagnant_id===m.joueur1_id?m.joueur2_id:m.joueur1_id;
        const ws=m.gagnant_id===m.joueur1_id?m.score1:m.score2, ls=m.gagnant_id===m.joueur1_id?m.score2:m.score1;
        if(stP[w]){ stP[w].victoires++; stP[w].points+=2; stP[w].manches_pour+=ws; stP[w].manches_contre+=ls; }
        if(stP[l]){ stP[l].defaites++; stP[l].manches_pour+=ls; stP[l].manches_contre+=ws; }
      });
      const joueursClasse=joueursFrais.map(j=>({...j,...(stP[j.id]||{})}));
      const nbGroupes=Math.max(...joueursClasse.map(j=>j.groupe),1);
      const barragesTP=matchsFrais.filter(m=>m.phase==="barrage");
      // Garde-fou : une égalité qui exige un barrage 701 doit être jouée AVANT de lancer le tableau.
      const restantes=[];
      for(let g=1;g<=nbGroupes;g++){
        const jG=joueursClasse.filter(j=>j.groupe===g);
        if(jG.length>1)egalitesADepartager(jG,barragesTP,nbQual).forEach(s=>restantes.push({g,s}));
      }
      if(restantes.length>0){
        setSaving(false);
        alert(`⏸️ Il reste ${restantes.length} barrage(s) 701 à jouer pour départager des égalités (poule ${[...new Set(restantes.map(r=>groupLetter(r.g)))].join(", ")}).\n\nJoue-les d'abord : sans ça, le tableau partirait sur un classement incomplet et une équipe serait écartée sans avoir pu se départager.`);
        await reload();
        return;
      }
      // Qualifiés : les N premiers de chaque poule (N réglable), taggés par rang de poule
      const topParGroupe=[];
      for(let g=1;g<=nbGroupes;g++){
        const jG=rankGroup(joueursClasse.filter(j=>j.groupe===g),barragesTP,matchsFrais);
        jG.slice(0,nbQual).forEach((j,idx)=>topParGroupe.push({...j,poolRank:idx+1}));
      }
      // Taille du tableau — 2 garde-fous, même si un réglage ancien/erroné arrive :
      //  (1) jamais PLUS PETITE que le nombre de qualifiés → seedBracket en perdrait en silence ;
      //  (2) jamais plus du DOUBLE → les slots sont appariés (graine s contre taille+1-s), donc en dessous
      //      de la moitié certaines paires sont vides des deux côtés : le tableau se fige sans champion.
      const nextPow2TP=(n)=>{ let s=2; while(s<n)s*=2; return s; };
      const minSizeTP=nextPow2TP(Math.max(2,topParGroupe.length));
      let bracketSize=bsChoisi||minSizeTP;
      if(bracketSize<topParGroupe.length||topParGroupe.length<bracketSize/2)bracketSize=minSizeTP;
      const seededFlat=seedPoolAware(topParGroupe,bracketSize);
      const bracketMatchs=genBracketMatchs(seededFlat,tournoiId,manchesMap,{consolante,petiteFinale});
      // Consolante = les nbConso PREMIÈRES équipes non qualifiées de chaque poule (réglable : 2 ou 3 ; tableau séparé).
      let consoMatchs=[];
      if(consolante){
        const consoTeams=[];
        for(let g=1;g<=nbGroupes;g++){
          const jG=rankGroup(joueursClasse.filter(j=>j.groupe===g),barragesTP,matchsFrais);
          // Repêchage : les nbConso PREMIÈRES équipes non qualifiées de la poule (2 ou 3, réglable).
          jG.slice(nbQual,nbQual+nbConso).forEach((j,idx)=>consoTeams.push({...j,consoRank:nbQual+idx+1}));
        }
        if(consoTeams.length>=2){
          // appariement maximal : on passe les équipes ORDONNÉES (meilleures d'abord) ; genConsolanteMatchs apparie tout le monde
          const consoOrdered=[...consoTeams].sort((a,b)=>(a.consoRank-b.consoRank)||(b.victoires-a.victoires)||((b.manches_pour-b.manches_contre)-(a.manches_pour-a.manches_contre)));
          consoMatchs=genConsolanteMatchs(consoOrdered,tournoiId,(manchesMap&&manchesMap.consolante)||2);
        }
      }
      const tousMatchs=[...bracketMatchs,...consoMatchs];
      if(tousMatchs.length>0)await dbTP.addMatchs(tousMatchs);
      // On fait avancer tout de suite les exemptes (byes) : ils ont deja gagne d'office.
      // Sans ca, leur adversaire du tour suivant n'arrive jamais et le tableau se bloque.
      await propagerByes(tournoiId);
      await dbTP.updateTournoi(tournoiId,{statut:"eliminatoires"});
      setShowBracketConfig(false);
      await reload();
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  // ── Créer les matchs de barrage (701) pour départager les égalités
  const creerBarrages=async(paires)=>{
    if(saving)return; // garde anti double-tap : un envoi deja en cours
    if(!paires||!paires.length)return;
    setSaving(true);
    try{
      // round_bracket = tour de barrage (0 = round-robin ; ≥1 = tour décisif).
      // position_bracket ne sert QU'À l'affichage pour un barrage (aucun avancement de tableau ne
      // s'applique aux barrages : saisirScore les exclut de estBracket). On repart donc du plus grand
      // numéro déjà utilisé au lieu de recommencer à 9000+tour*100 : sinon deux clics successifs sur
      // « Créer les barrages » (2e poule qui se départage plus tard, ou égalité apparue après une
      // correction de score) réattribuent les mêmes numéros, et l'ordre des cartes d'une même poule
      // peut sauter d'un rafraîchissement à l'autre. Le plancher 8999 gère le cas "aucun barrage".
      const basePos=Math.max(8999,...matchs.filter(m=>m.phase==="barrage").map(m=>m.position_bracket||0))+1;
      const news=paires.map((p,i)=>({tournoi_id:tournoiId,joueur1_id:p.a,joueur2_id:p.b,score1:0,score2:0,gagnant_id:null,phase:"barrage",groupe:p.groupe,statut:"en_attente",round_bracket:p.round||0,position_bracket:basePos+i,manches_max:1}));
      await dbTP.addMatchs(news);
      await reload();
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  // ── Modifier le tournoi : revenir aux réglages (lobby) SANS perdre les joueurs inscrits
  const retourLobby=async()=>{
    const nbJoues=matchs.filter(m=>m.phase==="poules"&&m.statut==="termine").length;
    const msg=nbJoues>0
      ? `Revenir aux réglages du tournoi ?\n\n⚠️ ${nbJoues} match(s) déjà joué(s) : les résultats des poules seront effacés.\n\n✅ Les ${joueurs.length} joueur(s) inscrit(s) sont CONSERVÉS.`
      : `Revenir aux réglages du tournoi ?\n\nLes poules seront annulées (aucun match joué).\n✅ Les ${joueurs.length} joueur(s) inscrit(s) sont CONSERVÉS.`;
    if(!(await confirmer(msg)))return;
    setSaving(true);
    try{
      await sbTP(`tournois_potes_matchs?tournoi_id=eq.${tournoiId}`,{method:"DELETE",prefer:"return=minimal"}); // supprime TOUS les matchs
      await Promise.all(joueurs.map(j=>dbTP.updateJoueur(j.id,{groupe:0,ordre:0,points:0,victoires:0,defaites:0,manches_pour:0,manches_contre:0}))); // reset stats, on GARDE les joueurs
      await dbTP.updateTournoi(tournoiId,{statut:"attente"});
      await reload();
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  // ── Retour aux poules (annule le tableau, en cas d'erreur de réglage)
  const retourPoules=async()=>{
    const nbBarrages=matchs.filter(m=>m.phase==="barrage"&&m.statut==="termine").length;
    const ligneBarrages=nbBarrages>0?`\n✅ Les ${nbBarrages} match(s) de barrage 701 déjà joué(s) sont CONSERVÉS.`:"";
    if(!(await confirmer(`Revenir à la phase de poules ?\n\nLe tableau actuel sera supprimé.\n✅ Les poules et leurs résultats sont conservés.${ligneBarrages}`)))return;
    setSaving(true);
    try{
      await dbTP.deleteMatchsTableau(tournoiId);
      // Recalcule le classement depuis les matchs de poules (au cas où des matchs du tableau auraient été joués)
      const st={}; joueurs.forEach(j=>{ st[j.id]={victoires:0,defaites:0,points:0,manches_pour:0,manches_contre:0}; });
      matchs.filter(m=>m.phase==="poules"&&m.statut==="termine"&&m.gagnant_id).forEach(m=>{
        const w=m.gagnant_id, l=m.gagnant_id===m.joueur1_id?m.joueur2_id:m.joueur1_id;
        const ws=m.gagnant_id===m.joueur1_id?m.score1:m.score2, ls=m.gagnant_id===m.joueur1_id?m.score2:m.score1;
        if(st[w]){ st[w].victoires++; st[w].points+=2; st[w].manches_pour+=ws; st[w].manches_contre+=ls; } // 2 pts / victoire
        if(st[l]){ st[l].defaites++; st[l].manches_pour+=ls; st[l].manches_contre+=ws; }                   // défaite = 0 pt
      });
      await Promise.all(joueurs.map(j=>dbTP.updateJoueur(j.id,st[j.id])));
      await dbTP.updateTournoi(tournoiId,{statut:"poules"});
      await reload();
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  // ── Terminer le tournoi (clôture manuelle → écran champion + classement final)
  const terminerTournoi=async(allDone=true)=>{
    const msg=allDone
      ? "Terminer le tournoi ?\n\nTu verras le champion et le classement final."
      : "⚠️ Tous les matchs ne sont pas encore terminés.\n\nTerminer le tournoi quand même maintenant ?";
    if(!(await confirmer(msg)))return;
    setSaving(true);
    try{
      await dbTP.updateTournoi(tournoiId,{statut:"termine"});
      await reload();
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  // ── Rejouer
  const rejouer=async()=>{
    if(saving)return; // garde anti double-clic : une creation deja en cours
    setSaving(true);
    try{
      const code=genCode();
      // On recopie TOUT le paramétrage du tournoi d'origine (mode, simple/doublette, nb de cibles)
      const base={
        nom:tournoi.nom+" (replay)",
        createur_id:tournoi.createur_id,
        createur_pseudo:tournoi.createur_pseudo,
        mode:tournoi.mode,
        statut:"attente",
        code,
        date:new Date().toISOString(),
      };
      if(tournoi.format)base.format=tournoi.format;
      if(typeof tournoi.nb_cibles==="number"&&tournoi.nb_cibles>0)base.nb_cibles=tournoi.nb_cibles;
      let nt;
      try{ nt=await dbTP.createTournoi(base); }
      catch(err){ // repli si les colonnes format/nb_cibles n'existent pas encore
        const {format,nb_cibles,...b2}=base;
        nt=await dbTP.createTournoi(b2);
      }
      if(!nt)throw new Error("Création échouée");
      // On ré-inscrit chaque joueur AVEC son compte (joueur_id) et son binôme (membres) d'origine
      await Promise.all(
        joueurs.map((j,i)=>{
          const jb={tournoi_id:nt.id,nom:j.nom,joueur_id:j.joueur_id??null,groupe:1,ordre:i,points:0,victoires:0,defaites:0,manches_pour:0,manches_contre:0};
          const payload=j.membres?{...jb,membres:j.membres}:jb;
          return dbTP.addJoueur(payload).catch(()=>dbTP.addJoueur(jb)); // repli si la colonne "membres" manque
        })
      );
      setPage("tournoi-potes-"+nt.id);
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  // ── Supprimer le tournoi
  const supprimerTournoi=async()=>{
    const ok=await confirmer(`⚠️ Supprimer "${tournoi.nom}" ?\n\nTous les matchs et résultats seront perdus. Cette action est irréversible.`,{danger:true});
    if(!ok)return;
    try{
      await dbTP.deleteTournoi(tournoiId);
      // On efface le raccourci flottant "Reprendre le tournoi" s'il pointait vers CE tournoi (sinon bouton fantôme)
      try{
        const cur=JSON.parse(localStorage.getItem("dp_active_tournoi")||"null");
        if(cur&&cur.id===tournoiId)localStorage.removeItem("dp_active_tournoi");
      }catch(e){}
      setPage("tournois-potes");
    }catch(e){alert("Erreur lors de la suppression : "+e.message);}
  };

  const addJoueur=async(nom,joueur_id=null,membres=null)=>{
    // Sécurité : on vérifie l'état FRAIS du tournoi côté serveur (l'écran peut avoir jusqu'à 5 s de retard).
    // Si le tournoi n'est plus en "attente" (déjà lancé), on refuse : sinon on crée un joueur fantôme sans match.
    const frais=await dbTP.getTournoi(tournoiId).catch(()=>null);
    if(frais&&frais.statut!=="attente"){
      if(frais.statut!==tournoi?.statut)setTournoi(frais); // on rattrape l'écran tout de suite
      alert("Le tournoi est déjà lancé — impossible d'ajouter un joueur maintenant.");
      return;
    }
    const base={tournoi_id:tournoiId,nom,joueur_id,groupe:1,ordre:joueurs.length,points:0,victoires:0,defaites:0,manches_pour:0,manches_contre:0};
    let j;
    try{ j=await dbTP.addJoueur(membres?{...base,membres}:base); }
    catch(err){ j=await dbTP.addJoueur(base); } // repli si la colonne "membres" n'existe pas encore
    if(j)setJoueurs(jj=>[...jj,j]);
  };

  // Un joueur rejoint le tournoi (via QR/lien) — solo ou équipe (doublette avec membres)
  const rejoindre=async({nom,joueur_id=null,membres=null})=>{
    // Sécurité : le tournoi a-t-il déjà été lancé pendant que cet écran attendait ? (rafraîchissement toutes les 5 s)
    const frais=await dbTP.getTournoi(tournoiId).catch(()=>null);
    if(frais&&frais.statut!=="attente"){
      if(frais.statut!==tournoi?.statut)setTournoi(frais);
      throw new Error("Le tournoi vient d'être lancé — les inscriptions sont fermées.");
    }
    const base={tournoi_id:tournoiId,nom,joueur_id,groupe:1,ordre:joueurs.length,points:0,victoires:0,defaites:0,manches_pour:0,manches_contre:0};
    let j;
    try{ j=await dbTP.addJoueur(membres?{...base,membres}:base); }
    catch(err){ j=await dbTP.addJoueur(base); } // repli si la colonne "membres" n'existe pas encore
    // Celui qui s'inscrit devient JOUEUR (peut scorer), pas simple spectateur
    if(j){ try{localStorage.setItem("dp_tp_player_"+tournoiId,"1");}catch(e){} setCodeUnlocked(true); }
    await reload();
    return j;
  };

  const removeJoueur=async(id)=>{
    await dbTP.removeJoueur(id);
    setJoueurs(jj=>jj.filter(j=>j.id!==id));
  };

  if(loading)return<div style={{padding:40}}><Spinner/></div>;
  if(!tournoi)return<div style={{padding:40,textAlign:"center",color:CT.muted}}>Tournoi introuvable.</div>;

  const modeLabel=tournoi.mode==="301"?"🎯 301":"🎯 501";
  const statutLabel={attente:"⏳ Lobby",poules:"🏟️ Phase de poules",eliminatoires:"⚔️ Éliminatoires",termine:"🏆 Terminé"}[tournoi.statut]||tournoi.statut;

  // ── Mon match "a jouer maintenant", TOUTES phases confondues (pour l'alerte <TurnAlert>) ──
  // Qui suis-je dans ce tournoi ? compte lie OU ligne memorisee (meme sans compte, cle dp_tp_myrow_<id>).
  const myRowId=(()=>{
    if(joueurConnecte){ const r=joueurs.find(j=>j.joueur_id===joueurConnecte.id||(Array.isArray(j.membres)&&j.membres.some(m=>m&&m.id===joueurConnecte.id))); if(r)return r.id; }
    try{ return localStorage.getItem("dp_tp_myrow_"+tournoiId)||null; }catch(e){ return null; }
  })();
  const monMatchActifTournoi=(()=>{
    if(myRowId==null)return null;
    const estMoi=(id)=>id!=null&&String(id)===String(myRowId);
    // Un match "en cours" (scoreur déjà lancé sur un appareil) ne doit PLUS déclencher l'alerte "c'est à toi de jouer" → on ne lance pas un 2e scoreur.
    const estEnCours=(m)=>!!liveInfo&&!!liveInfo.pairs&&liveInfo.pairs.has([String(m.joueur1_id),String(m.joueur2_id)].sort().join("|"));
    // Mode « une poule par cible » : chaque poule est autour de sa cible et s'organise seule.
    // Aucune convocation n'a de sens (elle sonnerait chez toute la poule à la fois) → silence.
    if(ciblesMode==="par_poule"&&tournoi.statut==="poules")return null;
    // 1) Poule active : meme regle que PoulesView (rotation des cibles).
    if(tournoi.statut==="poules"){
      const pending=matchs.filter(m=>m.phase==="poules"&&m.statut!=="termine"&&m.joueur1_id&&m.joueur2_id);
      const actifs=matchsSurCibles(pending,cibles,matchs,liveInfo);
      const mp=matchs.find(m=>m.phase==="poules"&&actifs.has(m.id)&&!estEnCours(m)&&(estMoi(m.joueur1_id)||estMoi(m.joueur2_id)));
      if(mp)return{...mp,__moiEstJ1:estMoi(mp.joueur1_id)};
      // 2) Barrage actif (egalites en fin de poules) : meme rotation des cibles.
      const barrages=matchs.filter(m=>m.phase==="barrage"&&m.statut!=="termine"&&m.joueur1_id&&m.joueur2_id);
      const actifsB=matchsSurCibles(barrages,cibles,matchs,liveInfo);
      const mb=matchs.find(m=>m.phase==="barrage"&&actifsB.has(m.id)&&!estEnCours(m)&&(estMoi(m.joueur1_id)||estMoi(m.joueur2_id)));
      if(mb)return{...mb,__moiEstJ1:estMoi(mb.joueur1_id)};
      return null;
    }
    // 3) Eliminatoires : un match du tableau est jouable = pas fini, pas bye, pas en attente, 2 joueurs connus.
    //    ET il doit être élu par la rotation des cibles, comme en poules — sinon tout un tour de tableau
    //    (8 à 14 équipes) recevait l'alerte en même temps pour 2 cibles, et depuis la correction du
    //    planning le bouton "Jouer" n'apparaît même pas : l'alerte enverrait les gens pour rien.
    if(tournoi.statut==="eliminatoires"){
      const jouablesElim=matchs.filter(m=>{
        if(m.phase==="poules"||m.phase==="barrage")return false; // barrage = sous-phase des poules, jamais "à jouer" en éliminatoires
        const done=m.statut==="termine";
        const bye=m.statut&&m.statut.startsWith("bye");
        // Un match du tableau n'est JOUABLE que s'il est "en_attente" avec 2 joueurs. "attente_avancement"/"vide"
        // = il attend encore le vainqueur d'un tour précédent → jamais d'alerte (même si les 2 cases semblent remplies).
        const waiting=m.statut==="attente_avancement"||m.statut==="vide"||!m.joueur1_id||!m.joueur2_id;
        return !done&&!bye&&!waiting;
      });
      const actifsE=matchsSurCibles(jouablesElim,cibles,matchs,liveInfo);
      const me=jouablesElim.find(m=>actifsE.has(m.id)&&!estEnCours(m)&&(estMoi(m.joueur1_id)||estMoi(m.joueur2_id)));
      if(me)return{...me,__moiEstJ1:estMoi(me.joueur1_id)};
    }
    return null;
  })();

  return(
    <div style={{maxWidth:700,margin:"0 auto",padding:"24px 16px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes livePulse{0%,100%{opacity:1}50%{opacity:.25}}`}</style>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <button onClick={()=>window.history.back()} style={{background:"none",border:"none",color:CT.muted,cursor:"pointer",fontSize:13,padding:0}}>← Retour</button>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <button onClick={()=>setShowShare(true)} style={{background:CT.accent+"18",border:`1px solid ${CT.accent}55`,color:CT.accent,cursor:"pointer",fontSize:12,padding:"5px 12px",borderRadius:8,fontWeight:700,display:"inline-flex",alignItems:"center",gap:5,touchAction:"manipulation"}}><EmoIcon e="📲" size={13}/>Partager</button>
            {(tournoi.statut==="poules"||tournoi.statut==="eliminatoires")&&(
              <button onClick={()=>setPage("tournoi-live-"+tournoiId)} style={{background:"#ef444418",border:"1px solid #ef444455",color:"#ef4444",cursor:"pointer",fontSize:12,padding:"5px 12px",borderRadius:8,fontWeight:800,display:"inline-flex",alignItems:"center",gap:5,touchAction:"manipulation"}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:"#ef4444",display:"inline-block",animation:"livePulse 1.4s infinite"}}/>LIVE
              </button>
            )}
            {isCreateur&&tournoi.statut!=="termine"&&(
              <button onClick={supprimerTournoi} style={{background:"none",border:`1px solid ${CT.red}44`,color:CT.red,cursor:"pointer",fontSize:12,padding:"5px 12px",borderRadius:8,fontWeight:600,display:"inline-flex",alignItems:"center",gap:5}}><EmoIcon e="🗑" size={12}/>Supprimer</button>
            )}
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div>
            <h1 style={{fontWeight:800,fontSize:22,marginBottom:4,display:"flex",alignItems:"center",gap:8}}><EmoIcon e="🏓" size={20}/>{tournoi.nom}</h1>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <Badge color={CT.blue}><EmoText s={modeLabel} size={11}/></Badge>
              <Badge color={tournoi.statut==="termine"?CT.green:CT.yellow}><EmoText s={statutLabel} size={11}/></Badge>
              <Badge color={CT.muted}>par {tournoi.createur_pseudo}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Alerte "c'est a toi de jouer" — montee ici pour TOUTES les phases (poules, barrages, eliminatoires) */}
      <TurnAlert monMatch={monMatchActifTournoi} joueurs={joueurs}/>

      {/* Content by statut */}
      {tournoi.statut==="attente"&&(
        <LobbyView tournoi={tournoi} joueurs={joueurs} isCreateur={isCreateur}
          onStart={()=>setShowPoolConfig(true)} onAddJoueur={addJoueur} onRemoveJoueur={removeJoueur}
          joueurConnecte={joueurConnecte} onRejoindre={rejoindre}/>
      )}
      {showPoolConfig&&<TournoiSetupWizard
        phase="poules"
        participants={joueurs}
        initialConfig={{mode:tournoi.mode||"501",format:tournoi.format||"simple"}}
        matchsExistent={matchs.length>0}
        saving={saving}
        onCancel={()=>setShowPoolConfig(false)}
        onLaunchPoules={async(cfg)=>{
          const patch={};
          if(cfg.mode&&cfg.mode!==tournoi.mode)patch.mode=cfg.mode;
          if(cfg.format&&cfg.format!==tournoi.format)patch.format=cfg.format;
          if(Object.keys(patch).length){ try{ await dbTP.updateTournoi(tournoiId,patch); setTournoi(t=>t?{...t,...patch}:t); }catch(e){} }
          await lancerTournoi(cfg.playersPerPool,cfg.manches,cfg.availableTargets,cfg.qualifiersPerPool,cfg.ciblesMode);
        }}
      />}
      {tournoi.statut==="poules"&&(
        <PoulesView tournoi={tournoi} joueurs={joueurs} matchs={matchs} isCreateur={isCreateur}
          nbCibles={cibles} nbQual={tournoi.nb_qualifies!=null?tournoi.nb_qualifies:nbQualLocal} ciblesMode={ciblesMode} onSetCibles={changerCibles} canPlay={canPlay} onOpenShare={()=>setShowShare(true)} onModifier={retourLobby}
          onSaisirScore={m=>setMatchModal(m)}
          onJouerMatch={m=>setPage("scoreur-potes-"+m.id)}
          onLancerEliminatoires={()=>setShowBracketConfig(true)}
          onCreerBarrages={creerBarrages} onLibererCibles={libererCibles} saving={saving} joueurConnecte={joueurConnecte} live={liveInfo} stats={statsTournoi}/>
      )}
      {showBracketConfig&&(()=>{
        const nbGroupesW=Math.max(...joueurs.map(j=>j.groupe),1);
        const nbQualW=tournoi.nb_qualifies!=null?tournoi.nb_qualifies:nbQualLocal;
        const poolGroups=[]; for(let g=1;g<=nbGroupesW;g++)poolGroups.push(joueurs.filter(j=>j.groupe===g).length);
        const qualifiedCount=poolGroups.reduce((t,sz)=>t+Math.min(nbQualW,sz),0);
        return <TournoiSetupWizard
          phase="tableau"
          participants={joueurs}
          initialConfig={{mode:tournoi.mode||"501",format:tournoi.format||"simple"}}
          tableauContext={{qualifiedCount,nbGroupes:nbGroupesW,nbQual:nbQualW,poolGroups,poolTargets:cibles,format:tournoi.format||"simple",
            // Aperçu des 1ers croisements : il dépend de la TAILLE DE TABLEAU choisie DANS l'assistant,
            // donc impossible de le calculer ici une fois pour toutes (c'est pourquoi on envoyait
            // crossings:null et que le bloc d'aperçu n'était jamais affiché) → on passe une FONCTION.
            // On refait exactement ce que fera lancerEliminatoires (classement de poule + seedPoolAware)
            // sur les données déjà à l'écran : à ce moment les poules sont finies, le classement est figé.
            makeCrossings:(bs)=>{
              try{
                const barragesW=matchs.filter(m=>m.phase==="barrage");
                const top=[];
                for(let g=1;g<=nbGroupesW;g++)rankGroup(joueurs.filter(j=>j.groupe===g),barragesW,matchs).slice(0,nbQualW).forEach((j,idx)=>top.push({...j,poolRank:idx+1}));
                const flat=seedPoolAware(top,bs);
                const paires=[];
                for(let i=0;i<flat.length;i+=2)paires.push({a:flat[i]?flat[i].nom:"— exempt —",b:flat[i+1]?flat[i+1].nom:"— exempt —"});
                return paires;
              }catch(e){ return []; } // un aperçu décoratif ne doit JAMAIS faire planter l'écran de réglage
            }
          }}
          saving={saving}
          onCancel={()=>setShowBracketConfig(false)}
          onLaunchBracket={async(cfg)=>{
            if(cfg.finalTargets&&cfg.finalTargets!==cibles){ try{ await changerCibles(cfg.finalTargets); }catch(e){} }
            await lancerEliminatoires({nbQual:nbQualW,bracketSize:cfg.bracketSize,manchesMap:cfg.manchesMap,consolante:cfg.consolante,petiteFinale:cfg.petiteFinale,nbConso:cfg.nbConso});
          }}
        />;
      })()}
      {tournoi.statut==="eliminatoires"&&(<>
        {/* Onglets : revenir CONSULTER les poules, ou voir le tableau final. Cette navigation ne
            supprime rien (contrairement au bouton « Retour aux poules », retourPoules).
            NB : ici les scores de poule sont VERROUILLÉS — ce PoulesView est monté avec
            bracketLance={true}, et carteMatch masque le crayon (isCreateur && !bracketLance).
            C'est VOULU : corriger une poule maintenant changerait le classement qui a servi à
            composer le tableau. Ne pas retirer ce verrou. */}
        <div style={{display:"flex",gap:6,marginBottom:16,background:"#16161d",borderRadius:12,padding:5,border:`1px solid ${CT.border}`}}>
          {[["poules","🏟️ Poules"],["elim","🏆 Éliminatoires"]].map(([k,lab])=>(
            <button key={k} onClick={()=>setVuePhase(k)} style={{flex:1,background:vuePhase===k?CT.accent:"transparent",color:vuePhase===k?"#0f0f0f":CT.muted,border:"none",cursor:"pointer",padding:"9px 12px",borderRadius:9,fontSize:13.5,fontWeight:800,transition:"all .15s",touchAction:"manipulation"}}>{lab}</button>
          ))}
        </div>
        {vuePhase==="poules"
          ? <PoulesView tournoi={tournoi} joueurs={joueurs} matchs={matchs} isCreateur={isCreateur}
              nbCibles={cibles} nbQual={tournoi.nb_qualifies!=null?tournoi.nb_qualifies:nbQualLocal} ciblesMode={ciblesMode} canPlay={canPlay} onOpenShare={()=>setShowShare(true)}
              onSaisirScore={m=>setMatchModal(m)}
              onJouerMatch={m=>setPage("scoreur-potes-"+m.id)}
              saving={saving} joueurConnecte={joueurConnecte} live={liveInfo} bracketLance={true} stats={statsTournoi}/>
          : <EliminatoiresView tournoi={tournoi} joueurs={joueurs} live={liveInfo}
              matchs={matchs.filter(m=>m.phase!=="poules")} isCreateur={isCreateur} canPlay={canPlay} nbCibles={cibles} onOpenShare={()=>setShowShare(true)}
              onSaisirScore={m=>setMatchModal(m)}
              onJouerMatch={m=>setPage("scoreur-potes-"+m.id)}
              onRetourPoules={retourPoules} onTerminer={terminerTournoi} onLibererCibles={libererCibles} stats={statsTournoi}/>}
      </>)}
      {tournoi.statut==="termine"&&(
        <ResultatsView tournoi={tournoi} joueurs={joueurs} matchs={matchs} onRejouer={rejouer} onQuitter={()=>setPage("tournois-potes")}/>
      )}

      {/* Modal partage (QR + lien + code) */}
      {showShare&&<ShareTournoiModal tournoi={tournoi} canPlay={canPlay} onUnlock={deverrouiller} onClose={()=>setShowShare(false)}/>}

      {/* Match modal */}
      {matchModal&&(
        <MatchModal match={matchModal} joueurs={joueurs}
          onSave={saisirScore} onClose={()=>setMatchModal(null)}/>
      )}
    </div>
  );
};

// ── CARTE TOURNOI (définie HORS du render pour éviter le remount React) ────────
const TournoiCard=({t,onOpen})=>{
  const s={attente:CT.yellow,poules:CT.blue,eliminatoires:CT.accent,termine:CT.green}[t.statut]||CT.muted;
  const sl={attente:"⏳ Lobby",poules:"🏟️ Poules",eliminatoires:"⚔️ Éliminatoires",termine:"🏆 Terminé"}[t.statut];
  return(
    <div onClick={()=>onOpen(t.id)} style={{background:CT.card,border:`2px solid ${t.statut!=="termine"?CT.accent+"55":CT.border}`,borderRadius:12,padding:16,marginBottom:10,cursor:"pointer",transition:"border-color .15s"}}
      onMouseEnter={e=>e.currentTarget.style.borderColor=CT.accent}
      onMouseLeave={e=>e.currentTarget.style.borderColor=t.statut!=="termine"?CT.accent+"55":CT.border}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
        <div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4,display:"flex",alignItems:"center",gap:6}}><EmoIcon e="🏓" size={14}/>{t.nom}</div>
          <div style={{fontSize:12,color:CT.muted}}>{new Date(t.date).toLocaleDateString("fr-FR")} · {t.mode}</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <Badge color={s}><EmoText s={sl} size={11}/></Badge>
          {t.statut!=="termine"&&<span style={{fontSize:12,color:CT.accent,fontWeight:700}}>Reprendre →</span>}
        </div>
      </div>
    </div>
  );
};

// ── PAGE LISTE + CRÉATION ─────────────────────────────────────────────────────
export const TournoiPotesPage=({joueur,setPage})=>{
  const [vue,setVue]=useState("liste");    // liste | creer
  const [filtre,setFiltre]=useState("en_cours"); // en_cours | passes
  const [mesT,setMesT]=useState([]);
  const [loading,setLoading]=useState(true);
  const [form,setForm]=useState({nom:"",mode:"501",format:"simple"});
  const [creating,setSaving]=useState(false);
  const [scanOpen,setScanOpen]=useState(false);

  useEffect(()=>{
    if(!joueur){setLoading(false);return;}
    Promise.all([
      dbTP.getTournois(joueur.id),
      dbTP.getTournoisParticipant(joueur.id),
    ]).then(([crees,participe])=>{
      const tous=[...(crees||[]),...(participe||[])];
      const map=new Map(); tous.forEach(t=>{if(t)map.set(t.id,t);});
      setMesT([...map.values()].sort((a,b)=>new Date(b.date)-new Date(a.date)));
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[joueur?.id]);

  const creerTournoi=async()=>{
    if(!form.nom.trim()||!joueur)return;
    setSaving(true);
    try{
      const base={nom:form.nom.trim(),mode:form.mode,createur_id:joueur.id,createur_pseudo:joueur.pseudo,statut:"attente",code:genCode(),date:new Date().toISOString()};
      let t;
      try{ t=await dbTP.createTournoi({...base,format:form.format}); }
      catch(err){ t=await dbTP.createTournoi(base); } // repli si la colonne "format" n'existe pas encore
      if(!t)throw new Error("Création échouée");
      // Le créateur n'est PLUS inscrit d'office comme joueur : organiser un tournoi et y jouer sont
      // deux choses différentes. S'il veut jouer, il s'inscrit comme tout le monde (bouton
      // « Je participe » dans le lobby). Sinon il apparaissait dans les poules sans l'avoir voulu.
      setPage("tournoi-potes-"+t.id);
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  const enCours=mesT.filter(t=>t.statut!=="termine");
  const passes=mesT.filter(t=>t.statut==="termine");
  const listeAffichee=filtre==="en_cours"?enCours:passes;

  return(
    <div style={{maxWidth:700,margin:"0 auto",padding:"24px 16px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{marginBottom:20}}>
        <h1 style={{fontWeight:800,fontSize:24,marginBottom:6}}><EmoText s="🍺 Tournoi entre potes" size={22} gap={8}/></h1>
        <p style={{color:CT.muted,fontSize:14}}>Mode local et convivial — sans impact sur les stats DRIX</p>
      </div>

      {/* Onglets principaux */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[["liste","📋 Mes tournois"],["creer","➕ Créer"]].map(([v,l])=>(
          <button key={v} onClick={()=>setVue(v)} style={{background:vue===v?CT.accent+"22":"transparent",color:vue===v?CT.accent:CT.muted,border:`1px solid ${vue===v?CT.accent:CT.border}`,cursor:"pointer",padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600}}><EmoText s={l} size={13}/></button>
        ))}
        <button onClick={()=>setScanOpen(true)} style={{background:"transparent",color:CT.muted,border:`1px solid ${CT.border}`,cursor:"pointer",padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600,touchAction:"manipulation"}}><EmoText s="📷 Scanner un tournoi" size={13}/></button>
      </div>
      {scanOpen&&<ScanTournoiModal onScan={(id)=>{setScanOpen(false);setPage("tournoi-potes-"+id);}} onClose={()=>setScanOpen(false)}/>}

      {/* VUE LISTE */}
      {vue==="liste"&&(
        <div>
          {!joueur&&<Card><p style={{color:CT.muted,fontSize:14,textAlign:"center"}}>Connecte-toi pour voir tes tournois.</p></Card>}
          {joueur&&loading&&<Spinner/>}
          {joueur&&!loading&&(
            <>
              {/* Sous-onglets En cours / Passés */}
              <div style={{display:"flex",gap:6,marginBottom:16,background:"#111",borderRadius:10,padding:4}}>
                <button onClick={()=>setFiltre("en_cours")} style={{flex:1,background:filtre==="en_cours"?CT.card:"transparent",color:filtre==="en_cours"?CT.accent:CT.muted,border:"none",cursor:"pointer",padding:"8px 12px",borderRadius:8,fontSize:13,fontWeight:600,transition:"all .15s"}}>
                  <EmoIcon e="⚡" size={13} style={{verticalAlign:"-2px",marginRight:4}}/>En cours {enCours.length>0&&<span style={{background:CT.accent,color:"#fff",borderRadius:20,padding:"1px 7px",fontSize:11,marginLeft:4}}>{enCours.length}</span>}
                </button>
                <button onClick={()=>setFiltre("passes")} style={{flex:1,background:filtre==="passes"?CT.card:"transparent",color:filtre==="passes"?CT.text:CT.muted,border:"none",cursor:"pointer",padding:"8px 12px",borderRadius:8,fontSize:13,fontWeight:600,transition:"all .15s"}}>
                  <EmoIcon e="🏆" size={13} style={{verticalAlign:"-2px",marginRight:4}}/>Passés {passes.length>0&&<span style={{background:CT.border,color:CT.muted,borderRadius:20,padding:"1px 7px",fontSize:11,marginLeft:4}}>{passes.length}</span>}
                </button>
              </div>

              {listeAffichee.length===0&&(
                <Card>
                  <p style={{color:CT.muted,fontSize:14,textAlign:"center"}}>
                    {filtre==="en_cours"?"Aucun tournoi en cours. Lance-en un !":"Aucun tournoi terminé pour l'instant."}
                  </p>
                </Card>
              )}
              {listeAffichee.map(t=>(
                <TournoiCard key={t.id} t={t} onOpen={id=>setPage("tournoi-potes-"+id)}/>
              ))}
            </>
          )}
        </div>
      )}

      {/* VUE CRÉER */}
      {vue==="creer"&&(
        <Card>
          {!joueur&&<p style={{color:CT.muted,fontSize:14,textAlign:"center",marginBottom:12}}>Connecte-toi pour créer un tournoi.</p>}
          {joueur&&(
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div>
                <label style={{fontSize:13,color:CT.muted,fontWeight:500,display:"block",marginBottom:6}}>Nom du tournoi</label>
                <input value={form.nom} onChange={e=>setForm(f=>({...f,nom:e.target.value}))} placeholder='Ex : "Tournoi du vendredi soir"' style={{width:"100%",background:"#111",border:`1px solid ${CT.border}`,borderRadius:8,padding:"10px 14px",color:CT.text,fontSize:14}}/>
              </div>
              <div>
                <label style={{fontSize:13,color:CT.muted,fontWeight:500,display:"block",marginBottom:6}}>Mode de jeu</label>
                <div style={{display:"flex",gap:8}}>
                  {["501","301"].map(m=>(
                    <button key={m} onClick={()=>setForm(f=>({...f,mode:m}))} style={{flex:1,padding:"10px",borderRadius:8,border:`2px solid ${form.mode===m?CT.accent:CT.border}`,background:form.mode===m?CT.accent+"22":"#111",color:form.mode===m?CT.accent:CT.muted,cursor:"pointer",fontWeight:700,fontSize:15,display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5}}><EmoIcon e="🎯" size={14}/>{m}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{fontSize:13,color:CT.muted,fontWeight:500,display:"block",marginBottom:6}}>Format</label>
                <div style={{display:"flex",gap:8}}>
                  {[{v:"simple",lab:"Simple",emo:"🧍",sub:"chacun joue seul"},{v:"doublette",lab:"Doublette",emo:"👥",sub:"équipes de 2"}].map(o=>(
                    <button key={o.v} onClick={()=>setForm(f=>({...f,format:o.v}))} style={{flex:1,padding:"10px 8px",borderRadius:8,border:`2px solid ${form.format===o.v?CT.accent:CT.border}`,background:form.format===o.v?CT.accent+"22":"#111",color:form.format===o.v?CT.accent:CT.muted,cursor:"pointer",fontWeight:700,fontSize:14,display:"flex",flexDirection:"column",alignItems:"center",gap:2,touchAction:"manipulation"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5}}><EmoIcon e={o.emo} size={14}/>{o.lab}</span>
                      <span style={{fontSize:10,fontWeight:500,opacity:.8}}>{o.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
              <Btn onClick={creerTournoi} disabled={!form.nom.trim()||creating} style={{marginTop:4}}>
                {creating?"Création…":<EmoText s="🚀 Créer le tournoi" size={15}/>}
              </Btn>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

// ── SCOREUR WRAPPER TOURNOI ───────────────────────────────────────────────────
export const ScoreurPotesWrapper=({matchId,joueurConnecte,setPage})=>{
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    sbTP(`tournois_potes_matchs?id=eq.${matchId}&select=*`).then(async rows=>{
      const match=rows?.[0];
      if(!match){setLoading(false);return;}
      const [joueurs,tournoi]=await Promise.all([dbTP.getJoueurs(match.tournoi_id),dbTP.getTournoi(match.tournoi_id)]);
      const j1=joueurs?.find(j=>j.id===match.joueur1_id);
      const j2=joueurs?.find(j=>j.id===match.joueur2_id);
      setData({match,j1,j2,tournoi,joueurs:joueurs||[]});
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[matchId]);

  if(loading)return<div style={{padding:40,background:CT.bg,minHeight:"100vh"}}><Spinner/><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;
  if(!data||!data.j1||!data.j2)return<div style={{padding:40,textAlign:"center",color:CT.muted}}>Match introuvable ou joueurs manquants.</div>;

  const{match,j1,j2,tournoi,joueurs}=data;

  const fakeDuel={
    id:"potes-"+matchId,
    mode:match.phase==="barrage"?"701":(tournoi.mode||"501"),
    manches:match.manches_max||2,
    challenger_pseudo:j1.nom,
    defie_pseudo:j2.nom,
    challenger_id:j1.id,
    defie_id:j2.id,
  };

  const handleResultat=async({gagnantNom,scoreC,scoreD})=>{
    // Le gagnant est celui qui a le PLUS de manches. scoreC = manches de j1 (challenger), scoreD = manches de j2 (defie).
    // On departage par ces scores plutot que par le nom → juste meme si j1 et j2 s'appellent pareil (homonymes).
    // Si egalite de manches (ne devrait pas arriver a la fin d'un match), on retombe sur le nom.
    const gagnant_id = scoreC!==scoreD ? (scoreC>scoreD?j1.id:j2.id) : (gagnantNom===j1.nom?j1.id:j2.id);
    // scoreC = manches won by challenger (j1), scoreD by defie (j2)
    const score1=gagnant_id===j1.id?Math.max(scoreC,scoreD):Math.min(scoreC,scoreD);
    const score2=gagnant_id===j2.id?Math.max(scoreC,scoreD):Math.min(scoreC,scoreD);
    try{
      // On relit l'état FRAIS du match avant d'écrire (anti-double-comptage + anti-recréation).
      const _fraisMatchs=await dbTP.getMatchs(match.tournoi_id);
      const _matchFrais=_fraisMatchs.find(m=>m.id===match.id);
      // GARDE anti-recreation : si l'organisateur a annule/relance le tournoi sur un autre telephone,
      // le match n'existe plus. On ne DOIT pas le recreer via updateMatch ni compter de stats fantomes.
      if(!_matchFrais){
        alert("Ce match a été annulé par l'organisateur.");
        if(setPage)setPage("tournoi-potes-"+match.tournoi_id);
        return;
      }
      const dejaTermine=_matchFrais.statut==="termine";
      const estBracket=match.phase!=="poules"&&match.phase!=="barrage"&&(match.round_bracket||0)>0;
      const ancienGagnant=_matchFrais.gagnant_id;
      const inversion=dejaTermine&&estBracket&&ancienGagnant&&ancienGagnant!==gagnant_id; // re-jeu qui change le vainqueur
      const cibles=inversion?ciblesAvancement(match,gagnant_id,_fraisMatchs):[];
      if(inversion&&cibles.some(c=>c.target&&c.target.statut==="termine")){
        alert("⚠️ Impossible de changer le vainqueur : le match SUIVANT de ce joueur dans le tableau a déjà été joué. Corrige-le d'abord.");
        return;
      }
      // ── Écriture anti-double-comptage (2 téléphones sur le même match) ──
      if(dejaTermine){
        await dbTP.updateMatch(match.id,{score1,score2,gagnant_id,statut:"termine"}); // correction : garde la date_fin d'origine
      }else{
        // "claim" ATOMIQUE : on ne passe le match à "termine" que si personne ne l'a fait entre-temps.
        const claim=await sbTP(`tournois_potes_matchs?id=eq.${match.id}&statut=neq.termine`,{method:"PATCH",prefer:"return=representation",body:JSON.stringify({score1,score2,gagnant_id,statut:"termine",date_fin:new Date().toISOString()})});
        if(!Array.isArray(claim)||claim.length===0)return; // un autre appareil a déjà terminé ce match → on ne compte pas 2 fois
      }
      // Mise à jour des stats — un BARRAGE ne change pas les points de poule (il départage seulement)
      if(match.phase==="poules"){
        // Recalcule TOUT le classement de la poule depuis les matchs terminés
        // → idempotent : pas de double comptage (si le match est saisi 2 fois) et pas d'inversion des manches.
        const fresh=await dbTP.getMatchs(match.tournoi_id);
        const st={}; joueurs.forEach(j=>{ st[j.id]={victoires:0,defaites:0,points:0,manches_pour:0,manches_contre:0}; });
        fresh.filter(m=>m.phase==="poules"&&m.statut==="termine"&&m.gagnant_id).forEach(m=>{
          const w=m.gagnant_id, l=m.gagnant_id===m.joueur1_id?m.joueur2_id:m.joueur1_id;
          const ws=m.gagnant_id===m.joueur1_id?m.score1:m.score2, ls=m.gagnant_id===m.joueur1_id?m.score2:m.score1;
          if(st[w]){ st[w].victoires++; st[w].points+=2; st[w].manches_pour+=ws; st[w].manches_contre+=ls; } // 2 pts / victoire
          if(st[l]){ st[l].defaites++; st[l].manches_pour+=ls; st[l].manches_contre+=ws; }                   // défaite = 0 pt (plus de point bonus)
        });
        // GARDE : ce recalcul repart de ZÉRO pour tout le monde et ne compte QUE les matchs de poules.
        // Si le tableau final est déjà lancé, l'appliquer EFFACERAIT toutes les victoires du tableau
        // (elles ne sont comptées nulle part ailleurs : elles s'ajoutent au fil de l'eau, match par match).
        // Cas réel : un joueur termine tard, sur son téléphone, un match de poule repris depuis le
        // brouillon du scoreur, alors que le tableau tourne déjà → le classement général retombait à
        // celui des poules, sans un mot. On garde donc le SCORE du match (déjà écrit plus haut) mais on
        // ne retouche plus aux stats stockées ; le classement des poules affiché est de toute façon
        // recalculé depuis les matchs, il reste donc juste à l'écran.
        const _tFrais=await dbTP.getTournoi(match.tournoi_id).catch(()=>null); // .catch → si le réseau tombe, on garde le comportement d'avant
        const _tableauLance=!!_tFrais&&(_tFrais.statut==="eliminatoires"||_tFrais.statut==="termine");
        if(_tableauLance){
          alert("✅ Score enregistré.\n\nLe tableau final est déjà lancé : le classement des poules n'est plus mis à jour, mais ton résultat est bien gardé.");
        }else{
          await Promise.all(joueurs.filter(j=>st[j.id]).map(j=>dbTP.updateJoueur(j.id,st[j.id])));
        }
      }else if(match.phase!=="barrage"){
        // Tableau : on relit les joueurs FRAIS (le snapshot du montage peut être périmé), puis on RETIRE
        // l'ancien résultat (si re-jeu/correction) et on APPLIQUE le nouveau → jamais de double comptage.
        const jFrais=await dbTP.getJoueurs(match.tournoi_id);
        const j1f=jFrais.find(j=>j.id===match.joueur1_id);
        const j2f=jFrais.find(j=>j.id===match.joueur2_id);
        if(j1f&&j2f){
          const pts_win=2,pts_lose=1;
          const d1={victoires:0,defaites:0,points:0,manches_pour:0,manches_contre:0};
          const d2={victoires:0,defaites:0,points:0,manches_pour:0,manches_contre:0};
          const appliquer=(w,s1,s2,sign)=>{ // sign +1 = ajouter, -1 = retirer
            const lo=Math.min(s1,s2);
            d1.manches_pour+=sign*s1; d1.manches_contre+=sign*s2;
            d2.manches_pour+=sign*s2; d2.manches_contre+=sign*s1;
            if(w===j1f.id){ d1.victoires+=sign; d1.points+=sign*pts_win; d2.defaites+=sign; d2.points+=sign*(lo>0?pts_lose:0); }
            else{ d2.victoires+=sign; d2.points+=sign*pts_win; d1.defaites+=sign; d1.points+=sign*(lo>0?pts_lose:0); }
          };
          if(dejaTermine)appliquer(_matchFrais.gagnant_id,_matchFrais.score1||0,_matchFrais.score2||0,-1); // retire l'ancien
          appliquer(gagnant_id,score1,score2,+1);                                                          // applique le nouveau
          await dbTP.updateJoueur(j1f.id,{victoires:j1f.victoires+d1.victoires,defaites:j1f.defaites+d1.defaites,points:j1f.points+d1.points,manches_pour:j1f.manches_pour+d1.manches_pour,manches_contre:j1f.manches_contre+d1.manches_contre});
          await dbTP.updateJoueur(j2f.id,{victoires:j2f.victoires+d2.victoires,defaites:j2f.defaites+d2.defaites,points:j2f.points+d2.points,manches_pour:j2f.manches_pour+d2.manches_pour,manches_contre:j2f.manches_contre+d2.manches_contre});
        }
      }
      // Avancement du tableau. 1re saisie → on avance le vainqueur. Re-jeu qui INVERSE → on re-route le joueur.
      if(estBracket&&!dejaTermine){
        const allMatchs=await dbTP.getMatchs(match.tournoi_id);
        await avancerApresMatch(match,gagnant_id,allMatchs);
        if(match.phase==="consolante")await propagerByes(match.tournoi_id); // résorbe les exempts émergents de consolante
      }else if(inversion){
        for(const c of cibles){
          if(!c.target)continue;
          const patch=c.slotJ1?{joueur1_id:c.val}:{joueur2_id:c.val};
          const otherFilled=c.slotJ1?c.target.joueur2_id:c.target.joueur1_id;
          await dbTP.updateMatch(c.target.id,{...patch,statut:otherFilled?"en_attente":"attente_avancement"});
        }
        if(match.phase==="consolante")await propagerByes(match.tournoi_id);
      }
    }catch(e){
      // On PREVIENT l'organisateur au lieu d'echouer en silence : sinon il croit que le score est enregistre.
      console.error("Erreur save match:",e);
      alert("⚠️ Le résultat n'a PAS pu être enregistré (réseau ?). Note le score et re-saisis-le avec le crayon quand la connexion revient.");
    }
  };

  return(
    <Scoreur
      duel={fakeDuel}
      onResultat={handleResultat}
      onDuelTermine={()=>setPage("tournoi-potes-"+match.tournoi_id)}
      onQuitter={()=>setPage("tournoi-potes-"+match.tournoi_id)}
      setPage={setPage}
    />
  );
};
