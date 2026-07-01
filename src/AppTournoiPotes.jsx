import { useState, useEffect, useCallback, useRef } from "react";
import { Scoreur } from "./AppJeux";
import { EmoIcon, EmoText } from "./icons";

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
  getTournoisParticipant:(joueur_id)=>sbTP(`tournois_potes_joueurs?joueur_id=eq.${joueur_id}&select=tournoi_id,tournois_potes(*)`).then(r=>(r||[]).map(x=>x.tournois_potes).filter(Boolean)),
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
  deleteMatchsTableau:(tid)=>sbTP(`tournois_potes_matchs?tournoi_id=eq.${tid}&phase=neq.poules`,{method:"DELETE",prefer:"return=minimal"}),
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

// Seed players into bracket slots (standard tournament seeding)
const seedBracket=(ranked,size)=>{
  // Pad with null to fill bracket size
  const padded=[...ranked];
  while(padded.length<size) padded.push(null);
  // Standard seeding: 1 vs last, etc.
  // Build pairs for first round
  const build=(arr)=>{
    if(arr.length===2) return arr;
    const mid=arr.length/2;
    const top=arr.slice(0,mid);
    const bot=arr.slice(mid).reverse();
    const result=[];
    for(let i=0;i<top.length;i++){result.push(top[i]);result.push(bot[i]);}
    return result;
  };
  return build(padded);
};

// Tirage tenant compte des poules : les 1ers de poule = têtes de série (affrontent des 2es
// d'une AUTRE poule, fort vs faible), et on évite que 2 joueurs d'une même poule se croisent
// au 1er tour. Les exempts (byes) vont aux mieux classés.
const seedPoolAware=(qualifiers,size)=>{
  const byRank=(a,b)=>(b.points-a.points)||((b.manches_pour-b.manches_contre)-(a.manches_pour-a.manches_contre));
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
  if(opts.petiteFinale&&totalRounds>=2){
    matchs.push({tournoi_id,joueur1_id:null,joueur2_id:null,score1:0,score2:0,gagnant_id:null,phase:"petite_finale",groupe:0,statut:"attente_avancement",round_bracket:totalRounds,position_bracket:1,manches_max:mm("petite_finale")});
  }
  // Consolante : tableau séparé (vide) pour les perdants du 1er tour. Taille = n/2.
  if(opts.consolante&&totalRounds>=3){
    const cSize=n/2, cRounds=Math.log2(cSize);
    for(let cr=1;cr<=cRounds;cr++){
      const nb=cSize/Math.pow(2,cr);
      for(let pos=0;pos<nb;pos++){
        matchs.push({tournoi_id,joueur1_id:null,joueur2_id:null,score1:0,score2:0,gagnant_id:null,phase:"consolante",groupe:0,statut:"attente_avancement",round_bracket:cr,position_bracket:pos,manches_max:mm("consolante")});
      }
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
  // Tableau principal
  if(match.phase==="finale"){
    await dbTP.updateTournoi(match.tournoi_id,{statut:"termine"});
  }else{
    await placer(allMatchs.find(m=>MAIN_PHASES.includes(m.phase)&&m.round_bracket===r+1&&m.position_bracket===nextPos),slotIsJ1,gagnant_id);
  }
  // Routage du perdant
  const finaleMatch=allMatchs.find(m=>m.phase==="finale");
  const finaleRound=finaleMatch?finaleMatch.round_bracket:r;
  if(r===1){
    const conso=allMatchs.find(m=>m.phase==="consolante"&&m.round_bracket===1&&m.position_bracket===nextPos);
    if(conso){ await placer(conso,slotIsJ1,perdant_id); return; }
  }
  if(r===finaleRound-1){
    const petite=allMatchs.find(m=>m.phase==="petite_finale");
    if(petite){ await placer(petite,slotIsJ1,perdant_id); }
  }
};

// Sort joueurs by ranking in a group
const rankGroup=(joueurs)=>[...joueurs].sort((a,b)=>{
  if(b.points!==a.points)return b.points-a.points;
  return(b.manches_pour-b.manches_contre)-(a.manches_pour-a.manches_contre);
});

// Planning des cibles : renvoie l'ensemble des ids de matchs à jouer MAINTENANT.
// Au plus nbCibles matchs en même temps, jamais un même joueur sur 2 cibles à la fois.
// Priorité aux matchs dont les joueurs ont le moins joué (pour que tout le monde joue, peu d'attente).
const matchsSurCibles=(pending,nbCibles,allMatchs)=>{
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
  for(const m of ordered){
    if(actifs.size>=nbCibles)break;
    if(busy.has(m.joueur1_id)||busy.has(m.joueur2_id))continue;                               // jamais 2 fois le même joueur en même temps
    actifs.add(m.id); busy.add(m.joueur1_id); busy.add(m.joueur2_id);
  }
  return actifs;
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
  const [s1,setS1]=useState(0);
  const [s2,setS2]=useState(0);
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
        <h3 style={{fontWeight:700,fontSize:16,marginBottom:4}}><EmoText s="⚔️ Saisir le score" size={16}/></h3>
        <p style={{fontSize:12,color:CT.muted,marginBottom:20}}>
          {match.phase==="finale"?"Finale — premier à gagner 5 manches":`Premier à gagner ${win} manche${win>1?"s":""}`}
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
      }catch(e){ setErreurCam("Caméra inaccessible — autorise l'accès à la caméra dans ton navigateur, puis réessaie."); }
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

// ── Réglages des poules (avant lancement) ──
// Plus petite puissance de 2 ≥ x (taille de tableau)
const nextPow2=(x)=>Math.max(2,Math.pow(2,Math.ceil(Math.log2(Math.max(2,x)))));
// Évalue une taille de poule : nb de poules, qualifiés (les 2 premiers), tableau, exempts
const evalTaillePoule=(nbJoueurs,t)=>{
  const np=Math.max(1,Math.round(nbJoueurs/t));
  const q=Math.min(nbJoueurs,np*2);
  const bs=nextPow2(q);
  return{np,q,bs,exempts:bs-q};
};
const PoolConfigModal=({nbJoueurs,onValider,onClose,saving})=>{
  // Réglage conseillé = celui qui ne laisse AUCUN exempt (sinon le moins d'exempts), en privilégiant le plus de qualifiés
  const reco=[3,4,5].map(t=>({t,...evalTaillePoule(nbJoueurs,t)})).sort((a,b)=>(a.exempts-b.exempts)||(b.q-a.q))[0].t;
  const [taille,setTaille]=useState(reco);
  const [manches,setManches]=useState(2);
  const [cibles,setCibles]=useState(2);
  const ev=evalTaillePoule(nbJoueurs,taille);
  const base=Math.floor(nbJoueurs/ev.np), reste=nbJoueurs%ev.np;
  const apercu=reste===0?`${ev.np} poule${ev.np>1?"s":""} de ${base} joueurs`:`${ev.np} poules de ${base} à ${base+1} joueurs`;
  const clean=ev.exempts===0;
  const opt=(val,sel,onPick)=>(
    <button key={val} onClick={()=>onPick(val)} style={{flex:1,padding:"10px 4px",borderRadius:10,border:`1px solid ${sel?CT.accent:CT.border}`,background:sel?CT.accent+"22":CT.card,color:sel?CT.accent:CT.text,fontWeight:sel?800:600,fontSize:15,cursor:"pointer",touchAction:"manipulation"}}>{val}</button>
  );
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000e6",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#15151c",border:`1px solid ${CT.border}`,borderRadius:18,padding:22,maxWidth:400,width:"100%"}}>
        <h3 style={{fontWeight:800,fontSize:18,marginBottom:4,color:"#fff",textAlign:"center"}}><EmoText s="⚙️ Réglages des poules" size={17}/></h3>
        <p style={{color:CT.muted,fontSize:12,textAlign:"center",marginBottom:18}}>{nbJoueurs} joueurs inscrits</p>
        <div style={{fontSize:13,fontWeight:700,color:CT.text,marginBottom:8}}>Joueurs par poule <span style={{color:CT.muted,fontWeight:500}}>(conseillé : {reco} — sans exempt)</span></div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>{[3,4,5].map(t=>{
          const e=evalTaillePoule(nbJoueurs,t), sel=taille===t;
          return(
            <button key={t} onClick={()=>setTaille(t)} style={{flex:1,padding:"8px 4px",borderRadius:10,border:`1px solid ${sel?CT.accent:CT.border}`,background:sel?CT.accent+"22":CT.card,cursor:"pointer",touchAction:"manipulation",display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
              <span style={{fontWeight:800,fontSize:16,color:sel?CT.accent:CT.text}}>{t}</span>
              <span style={{fontSize:9.5,color:CT.muted,fontWeight:600}}>{e.np} poule{e.np>1?"s":""}</span>
              <span style={{fontSize:11}}>{e.exempts===0?"✅":"⚠️"}</span>
            </button>
          );
        })}</div>
        <div style={{background:(clean?CT.green:"#eab308")+"15",border:`1px solid ${(clean?CT.green:"#eab308")}55`,borderRadius:10,padding:"10px 12px",fontSize:12.5,color:clean?CT.green:"#eab308",fontWeight:700,textAlign:"center",marginBottom:6,lineHeight:1.45}}>
          → {apercu}<br/>{ev.q} qualifiés (les 2 premiers) → tableau de {ev.bs}
        </div>
        <div style={{fontSize:11.5,color:clean?CT.green:"#eab308",textAlign:"center",fontWeight:700,marginBottom:18}}>
          {clean?"✅ Tout le monde joue son 1er match (aucun exempt)":`⚠️ ${ev.exempts} joueur(s) exempté(s) — choisis un réglage ✅ pour que tout le monde joue`}
        </div>
        <div style={{fontSize:13,fontWeight:700,color:CT.text,marginBottom:8}}>Manches par match <span style={{color:CT.muted,fontWeight:500}}>(premier à…)</span></div>
        <div style={{display:"flex",gap:6,marginBottom:16}}>{[1,2,3,4,5].map(m=>opt(m,manches===m,setManches))}</div>
        <div style={{fontSize:13,fontWeight:700,color:CT.text,marginBottom:8}}>Cibles disponibles <span style={{color:CT.muted,fontWeight:500}}>(jeux de fléchettes)</span></div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginBottom:8}}>
          <button onClick={()=>setCibles(c=>Math.max(1,c-1))} style={{width:42,height:42,borderRadius:12,border:`1px solid ${CT.border}`,background:CT.card,color:CT.text,fontSize:22,fontWeight:800,cursor:"pointer",touchAction:"manipulation"}}>−</button>
          <span style={{fontWeight:800,fontSize:26,color:CT.accent,minWidth:36,textAlign:"center"}}>{cibles}</span>
          <button onClick={()=>setCibles(c=>Math.min(12,c+1))} style={{width:42,height:42,borderRadius:12,border:`1px solid ${CT.border}`,background:CT.card,color:CT.text,fontSize:22,fontWeight:800,cursor:"pointer",touchAction:"manipulation"}}>+</button>
        </div>
        <div style={{fontSize:11.5,color:CT.muted,textAlign:"center",marginBottom:20,lineHeight:1.4}}>🎯 L'appli allumera en vert {cibles===1?"le match":`jusqu'à ${cibles} matchs`} à jouer en même temps (un par cible), pour que personne n'attende trop. Réglable pendant le tournoi.</div>
        <Btn onClick={()=>onValider(taille,manches,cibles)} disabled={saving} style={{width:"100%",fontSize:15,padding:"13px"}}>{saving?"Lancement…":"✅ Valider et lancer les poules"}</Btn>
        <button onClick={onClose} style={{width:"100%",marginTop:8,background:"none",border:"none",color:CT.muted,fontSize:13,cursor:"pointer",padding:8}}>Annuler</button>
      </div>
    </div>
  );
};

// ── VUE LOBBY ─────────────────────────────────────────────────────────────────
const LobbyView=({tournoi,joueurs,isCreateur,onStart,onAddJoueur,onRemoveJoueur,joueurConnecte})=>{
  const [nom,setNom]=useState("");
  const [adding,setAdding]=useState(false);
  const [amis,setAmis]=useState([]);
  const [addingAmi,setAddingAmi]=useState(null); // id de l'ami en cours d'ajout
  const [scanOpen,setScanOpen]=useState(false);

  // Charger la liste d'amis
  useEffect(()=>{
    if(!joueurConnecte||!isCreateur)return;
    dbTP.getAmis(joueurConnecte.id).then(rows=>{
      if(!rows)return;
      const parsed=rows.map(r=>{
        const estSender=r.joueur_id===joueurConnecte.id;
        return{id:estSender?r.ami_id:r.joueur_id,pseudo:estSender?r.ami_pseudo:r.joueur_pseudo};
      });
      setAmis(parsed);
    }).catch(()=>{});
  },[joueurConnecte,isCreateur]);

  const handleAdd=async()=>{
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

  const amiDejaAjoute=(amiId)=>joueurs.some(j=>j.joueur_id===amiId);

  return(
    <div>
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
        <div style={{marginTop:10,fontSize:12,color:CT.muted}}>Code : <b style={{color:CT.yellow,fontSize:16,letterSpacing:2}}>{tournoi.code}</b></div>
      </Card>

      {/* Inscription par scan QR (option C) */}
      {isCreateur&&(
        <Btn onClick={()=>setScanOpen(true)} style={{width:"100%",marginBottom:16,fontSize:15,padding:"13px"}}>
          <EmoIcon e="📲" size={16} style={{verticalAlign:"-2px",marginRight:6}}/>Scanner un joueur (QR)
        </Btn>
      )}

      {/* Inviter mes amis (si créateur connecté) */}
      {isCreateur&&amis.length>0&&(
        <Card style={{marginBottom:16}}>
          <h3 style={{fontWeight:700,fontSize:14,marginBottom:12,color:CT.blue}}><EmoText s="👥 Inviter mes amis" size={14}/></h3>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
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
        </Card>
      )}

      {/* Players list */}
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <h3 style={{fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:6}}><EmoIcon e="🎯" size={15}/>Joueurs inscrits ({joueurs.length})</h3>
          <Badge color={joueurs.length>=2?CT.green:CT.muted}>{joueurs.length>=2?"Prêt à lancer":"Ajoutez des joueurs"}</Badge>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {joueurs.map((j,i)=>(
            <div key={j.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#111",borderRadius:8,border:`1px solid ${CT.border}`}}>
              <span style={{width:24,height:24,borderRadius:"50%",background:CT.accent+"22",color:CT.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{i+1}</span>
              <span style={{flex:1,fontWeight:500}}>{j.nom}</span>
              {j.joueur_id&&<Badge color={CT.blue}>Compte <EmoIcon e="🔗" size={10} style={{verticalAlign:"-1px",marginLeft:2}}/></Badge>}
              {isCreateur&&<button onClick={()=>onRemoveJoueur(j.id)} style={{background:"none",border:"none",color:CT.muted,cursor:"pointer",padding:"0 4px",display:"inline-flex"}} title="Retirer"><EmoIcon e="✕" size={15}/></button>}
            </div>
          ))}
          {joueurs.length===0&&<p style={{color:CT.muted,fontSize:13,textAlign:"center",padding:12}}>Aucun joueur ajouté</p>}
        </div>

        {/* Add manual player */}
        {isCreateur&&(
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

// ── Réglages du tableau (après les poules) ──
const BracketConfigModal=({joueurs,onValider,onClose,saving})=>{
  const nbGroupes=Math.max(...joueurs.map(j=>j.groupe),1);
  const [nbQual,setNbQual]=useState(2);
  const totalQual=Math.min(joueurs.length,nbQual*nbGroupes);
  const minSize=nextPow2(totalQual);
  const sizeOptions=[...new Set([minSize,Math.min(32,minSize*2)])];
  const [bracketSize,setBracketSize]=useState(minSize);
  useEffect(()=>{ setBracketSize(s=>sizeOptions.includes(s)?s:minSize); },[nbQual]); // eslint-disable-line
  const rounds=roundsForBracket(bracketSize);
  const [manchesMap,setManchesMap]=useState({seizieme:2,huitieme:2,quart:2,demi:3,finale:5,petite_finale:2,consolante:2});
  const exempts=bracketSize-totalQual;
  // Options : petite finale (3e place) dès qu'il y a des demies ; consolante (repêchage 1er tour) dès 8, sans exempt
  const peutPetite=bracketSize>=4;
  const peutConso=bracketSize>=8&&exempts===0;
  const [consolante,setConsolante]=useState(true);
  const [petiteFinale,setPetiteFinale]=useState(true);
  useEffect(()=>{ if(!peutPetite&&petiteFinale)setPetiteFinale(false); },[peutPetite,petiteFinale]);
  useEffect(()=>{ if(!peutConso&&consolante)setConsolante(false); },[peutConso,consolante]);
  const manchePhases=[...rounds,...(petiteFinale&&peutPetite?["petite_finale"]:[]),...(consolante&&peutConso?["consolante"]:[])];
  const toggleRow=(on,setOn,can,label,sub,offReason)=>(
    <button onClick={can?()=>setOn(v=>!v):undefined} disabled={!can} style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:`1px solid ${on&&can?CT.accent:CT.border}`,background:on&&can?CT.accent+"18":CT.card,cursor:can?"pointer":"not-allowed",opacity:can?1:0.55,touchAction:"manipulation",textAlign:"left",marginBottom:8}}>
      <div style={{width:38,height:22,borderRadius:11,background:on&&can?CT.accent:CT.border,position:"relative",flexShrink:0,transition:"background .2s"}}><div style={{width:18,height:18,borderRadius:9,background:"#fff",position:"absolute",top:2,left:on&&can?18:2,transition:"left .2s"}}/></div>
      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:700,color:CT.text}}>{label}</div><div style={{fontSize:11,color:CT.muted,lineHeight:1.3}}>{can?sub:offReason}</div></div>
    </button>
  );
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"#000000e6",zIndex:99999,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#15151c",border:`1px solid ${CT.border}`,borderRadius:18,padding:22,maxWidth:420,width:"100%",margin:"auto"}}>
        <h3 style={{fontWeight:800,fontSize:18,marginBottom:4,color:"#fff",textAlign:"center"}}><EmoText s="🏆 Réglages du tableau" size={17}/></h3>
        <p style={{color:CT.muted,fontSize:12,textAlign:"center",marginBottom:18}}>{nbGroupes} poule{nbGroupes>1?"s":""}</p>
        <div style={{fontSize:13,fontWeight:700,color:CT.text,marginBottom:8}}>Qualifiés par poule</div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>{[1,2].map(q=>{
          const tq=Math.min(joueurs.length,q*nbGroupes), ex=nextPow2(tq)-tq, sel=nbQual===q;
          return(
            <button key={q} onClick={()=>setNbQual(q)} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`1px solid ${sel?CT.accent:CT.border}`,background:sel?CT.accent+"22":CT.card,cursor:"pointer",touchAction:"manipulation",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontWeight:sel?800:600,fontSize:13,color:sel?CT.accent:CT.text}}>{q>1?"Les 2 premiers":"Le 1er"}</span>
              <span style={{fontSize:10,color:CT.muted,fontWeight:600}}>{tq} qualifiés {ex===0?"✅":"⚠️"}</span>
            </button>
          );
        })}</div>
        <div style={{fontSize:13,fontWeight:700,color:CT.text,marginBottom:8}}>Départ du tableau <span style={{color:CT.muted,fontWeight:500}}>({totalQual} qualifiés)</span></div>
        <div style={{display:"flex",gap:8,marginBottom:exempts>0?8:18}}>{sizeOptions.map(s=>{
          const ex=s-totalQual, sel=bracketSize===s;
          return(
            <button key={s} onClick={()=>setBracketSize(s)} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`1px solid ${sel?CT.accent:CT.border}`,background:sel?CT.accent+"22":CT.card,cursor:"pointer",touchAction:"manipulation",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
              <span style={{fontWeight:sel?800:600,fontSize:13,color:sel?CT.accent:CT.text}}>{ROUND_LABEL[roundsForBracket(s)[0]]}</span>
              <span style={{fontSize:10,fontWeight:700,color:ex===0?CT.green:CT.yellow}}>{ex===0?"✅ sans exempt":`⚠️ ${ex} exempt${ex>1?"s":""}`}</span>
            </button>
          );
        })}</div>
        {exempts>0&&<div style={{fontSize:11,color:CT.yellow,marginBottom:18,lineHeight:1.4}}>ℹ️ {exempts} joueur{exempts>1?"s":""} exempté{exempts>1?"s":""} : ils passent directement le 1er tour. Choisis « {ROUND_LABEL[roundsForBracket(minSize)[0]]} » pour que <b>tout le monde joue</b>.</div>}
        <div style={{fontSize:13,fontWeight:700,color:CT.text,marginBottom:8}}>Options</div>
        {toggleRow(petiteFinale,setPetiteFinale,peutPetite,"🥉 Petite finale (3e place)","Les 2 perdants des demies jouent pour la 3e place.","Dispo dès 4 qualifiés (il faut des demies).")}
        {toggleRow(consolante,setConsolante,peutConso,"🎖️ Consolante (repêchage)","Les perdants du 1er tour ont un 2e tableau pour se rattraper.","Dispo dès 8 qualifiés, sans exempt.")}
        <div style={{fontSize:13,fontWeight:700,color:CT.text,margin:"6px 0 8px"}}>Manches par tour <span style={{color:CT.muted,fontWeight:500}}>(premier à…)</span></div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:8}}>
          {manchePhases.map(ph=>(
            <div key={ph} style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{flex:1,fontSize:13,color:CT.text}}>{ROUND_LABEL[ph]}</span>
              <div style={{display:"flex",gap:4}}>{[1,2,3,4,5].map(m=>(
                <button key={m} onClick={()=>setManchesMap(mm=>({...mm,[ph]:m}))} style={{width:30,height:32,borderRadius:8,border:`1px solid ${manchesMap[ph]===m?CT.accent:CT.border}`,background:manchesMap[ph]===m?CT.accent+"22":CT.card,color:manchesMap[ph]===m?CT.accent:CT.text,fontWeight:manchesMap[ph]===m?800:600,fontSize:13,cursor:"pointer",touchAction:"manipulation"}}>{m}</button>
              ))}</div>
            </div>
          ))}
        </div>
        <div style={{fontSize:11,color:CT.muted,marginBottom:18,lineHeight:1.4}}>💡 Conseillé : des matchs plus longs vers la fin (ex. 2 → 3 → 5). Plus c'est long, plus le résultat est juste.</div>
        <div style={{background:(exempts===0?CT.green:CT.yellow)+"18",border:`1px solid ${(exempts===0?CT.green:CT.yellow)}55`,borderRadius:10,padding:"10px 12px",fontSize:12.5,fontWeight:700,color:exempts===0?CT.green:CT.yellow,textAlign:"center",marginBottom:14,lineHeight:1.5}}>
          🏆 Tableau de {bracketSize} → {totalQual} qualifiés<br/>{exempts===0?"✅ Tout le monde joue son 1er match":`⚠️ ${exempts} exempté${exempts>1?"s":""} (passe${exempts>1?"nt":""} le 1er tour)`}
        </div>
        <Btn onClick={()=>onValider({nbQual,bracketSize,manchesMap,consolante:consolante&&peutConso,petiteFinale:petiteFinale&&peutPetite})} disabled={saving} style={{width:"100%",fontSize:15,padding:"13px"}}>{saving?"Lancement…":"✅ Valider et lancer le tableau"}</Btn>
        <button onClick={onClose} style={{width:"100%",marginTop:8,background:"none",border:"none",color:CT.muted,fontSize:13,cursor:"pointer",padding:8}}>Annuler</button>
      </div>
    </div>
  );
};

// ── VUE POULES ────────────────────────────────────────────────────────────────
const PoulesView=({tournoi,joueurs,matchs,isCreateur,nbCibles=1,onSetCibles,onSaisirScore,onJouerMatch,onLancerEliminatoires})=>{
  const nbGroupes=Math.max(...joueurs.map(j=>j.groupe),1);
  const groupes=Array.from({length:nbGroupes},(_,i)=>i+1);
  const termines=matchs.filter(m=>m.phase==="poules"&&m.statut==="termine");
  const total=matchs.filter(m=>m.phase==="poules").length;
  const allDone=total>0&&termines.length===total;
  // Planning des cibles : quels matchs jouer maintenant (vert) vs en attente
  const pending=matchs.filter(m=>m.phase==="poules"&&m.statut!=="termine"&&m.joueur1_id&&m.joueur2_id);
  const actifs=matchsSurCibles(pending,nbCibles,matchs);
  const enAttente=Math.max(0,pending.length-actifs.size);

  return(
    <div>
      {/* Progress */}
      <Card style={{marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontWeight:600,fontSize:14}}>Phase de poules</span>
          <Badge color={allDone?CT.green:CT.yellow}>{termines.length}/{total} matchs</Badge>
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
        {!allDone&&<div style={{marginTop:10,fontSize:12.5,textAlign:"center"}}><span style={{color:CT.green,fontWeight:800}}>🟢 {actifs.size} à jouer maintenant</span>{enAttente>0&&<span style={{color:CT.muted}}> · ⏳ {enAttente} en attente</span>}</div>}
      </Card>

      {/* Groups */}
      {groupes.map(g=>{
        const jG=rankGroup(joueurs.filter(j=>j.groupe===g));
        // Ordre FIXE (par position) : la liste ne bouge pas, seule la barre verte se déplace
        const mG=matchs.filter(m=>m.phase==="poules"&&m.groupe===g).sort((a,b)=>(a.position_bracket||0)-(b.position_bracket||0));
        return(
          <Card key={g} style={{marginBottom:16}}>
            <h3 style={{fontWeight:700,fontSize:15,marginBottom:12,color:CT.accent,display:"flex",alignItems:"center",gap:6}}><EmoIcon e="🏷️" size={14}/>Groupe {g}</h3>
            {/* Classement */}
            <div style={{marginBottom:14}}>
              {jG.map((j,i)=>(
                <div key={j.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:i<2?"#f9731608":"transparent",borderRadius:7,marginBottom:4}}>
                  <span style={{width:20,fontWeight:800,fontSize:13,color:i<2?CT.accent:CT.muted}}>{i+1}</span>
                  <span style={{flex:1,fontWeight:600,fontSize:14}}>{j.nom}</span>
                  <span style={{fontSize:12,color:CT.muted}}>{j.victoires}V {j.defaites}D</span>
                  <span style={{fontWeight:700,fontSize:14,color:CT.accent}}>{j.points} pts</span>
                  {i<2&&<span style={{fontSize:10,color:CT.green}}>↑ Qualifié</span>}
                </div>
              ))}
            </div>
            {/* Matchs du groupe */}
            <div style={{borderTop:`1px solid ${CT.border}`,paddingTop:12}}>
              <div style={{fontSize:11,color:CT.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Matchs</div>
              {mG.map(m=>{
                const j1=joueurs.find(j=>j.id===m.joueur1_id);
                const j2=joueurs.find(j=>j.id===m.joueur2_id);
                const done=m.statut==="termine";
                const actif=!done&&actifs.has(m.id);
                const attente=!done&&!actif;
                return(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,marginBottom:4,
                    background:actif?CT.green+"14":"transparent",
                    border:`1px solid ${actif?CT.green+"66":"transparent"}`,
                    borderBottom:actif?`1px solid ${CT.green+"66"}`:`1px solid ${CT.border+"44"}`,
                    opacity:attente?0.6:1}}>
                    <span style={{flex:1,fontSize:13,fontWeight:done&&m.gagnant_id===j1?.id?700:400,color:done&&m.gagnant_id===j1?.id?CT.green:CT.text}}>{j1?.nom||"?"}</span>
                    <span style={{fontWeight:800,fontSize:15,minWidth:40,textAlign:"center",color:done?CT.text:CT.muted}}>
                      {done?`${m.score1}–${m.score2}`:"vs"}
                    </span>
                    <span style={{flex:1,fontSize:13,fontWeight:done&&m.gagnant_id===j2?.id?700:400,color:done&&m.gagnant_id===j2?.id?CT.green:CT.text,textAlign:"right"}}>{j2?.nom||"?"}</span>
                    {actif&&(
                      <div style={{display:"flex",gap:6}}>
                        <Btn onClick={()=>onJouerMatch(m)} variant="primary" small>▶ Jouer</Btn>
                        {isCreateur&&<Btn onClick={()=>onSaisirScore(m)} variant="dark" small><EmoIcon e="✏️" size={13}/></Btn>}
                      </div>
                    )}
                    {attente&&<span style={{fontSize:10.5,color:CT.muted,fontWeight:600,whiteSpace:"nowrap"}}>⏳ en attente</span>}
                    {attente&&isCreateur&&<Btn onClick={()=>onSaisirScore(m)} variant="dark" small><EmoIcon e="✏️" size={13}/></Btn>}
                    {done&&<Badge color={CT.green}><EmoIcon e="✅" size={12}/></Badge>}
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}

      {/* Advance to eliminatoires */}
      {allDone&&isCreateur&&(
        <Btn onClick={onLancerEliminatoires} style={{width:"100%",fontSize:15,padding:14}}>
          <EmoIcon e="🏆" size={15} style={{verticalAlign:"-2px",marginRight:6}}/>Lancer les éliminatoires
        </Btn>
      )}
    </div>
  );
};

// ── VUE BRACKET ───────────────────────────────────────────────────────────────
const BracketMatchCard=({match,joueurs,isCreateur,onSaisirScore,onJouerMatch})=>{
  const j1=joueurs.find(j=>j.id===match.joueur1_id);
  const j2=joueurs.find(j=>j.id===match.joueur2_id);
  const done=match.statut==="termine";
  const bye=match.statut.startsWith("bye");

  const rowStyle=(j,isGagnant)=>({
    padding:"6px 10px",display:"flex",justifyContent:"space-between",alignItems:"center",
    background:isGagnant?"#22c55e22":done&&!isGagnant?"#ef444411":"transparent",
    borderRadius:6,
  });

  return(
    <div style={{background:CT.card,border:`2px solid ${done?CT.green:match.statut==="attente_avancement"?CT.border:CT.accent+"66"}`,borderRadius:10,overflow:"hidden",minWidth:180,maxWidth:220,width:"100%"}}>
      <div style={{background:"#111",padding:"4px 10px",fontSize:10,fontWeight:700,color:CT.muted,textTransform:"uppercase",letterSpacing:1}}>
        {match.phase==="finale"?<EmoText s="🏆 Finale" size={13}/>:match.phase==="petite_finale"?<EmoText s="🥉 3e place" size={13}/>:match.phase==="consolante"?<EmoText s="🎖️ Consolante" size={13}/>:match.phase==="demi"?<EmoText s="🥈 Demie" size={13}/>:match.phase==="quart"?<EmoText s="⚔️ Quart" size={13}/>:match.phase==="huitieme"?"1/8":"1/16"}
      </div>
      <div style={rowStyle(j1,done&&match.gagnant_id===j1?.id)}>
        <span style={{fontSize:13,fontWeight:done&&match.gagnant_id===j1?.id?700:400,color:j1?CT.text:CT.muted}}>
          {j1?.nom||(bye?"— pas d'adversaire —":"À définir")}
          {bye&&j1&&<span style={{color:CT.green,fontWeight:800,fontSize:11,marginLeft:6}}>✓</span>}
        </span>
        {done&&<span style={{fontWeight:800,color:match.gagnant_id===j1?.id?CT.green:CT.muted}}>{match.score1}</span>}
      </div>
      <div style={{height:1,background:CT.border}}/>
      <div style={rowStyle(j2,done&&match.gagnant_id===j2?.id)}>
        <span style={{fontSize:13,fontWeight:done&&match.gagnant_id===j2?.id?700:400,color:j2?CT.text:CT.muted}}>
          {j2?.nom||(bye?"— pas d'adversaire —":"À définir")}
          {bye&&j2&&<span style={{color:CT.green,fontWeight:800,fontSize:11,marginLeft:6}}>✓</span>}
        </span>
        {done&&<span style={{fontWeight:800,color:match.gagnant_id===j2?.id?CT.green:CT.muted}}>{match.score2}</span>}
      </div>
      {!done&&!bye&&j1&&j2&&(
        <div style={{padding:"6px 10px",borderTop:`1px solid ${CT.border}`,display:"flex",gap:6}}>
          <Btn onClick={()=>onJouerMatch(match)} variant="primary" small style={{flex:1,fontSize:11}}>▶ Jouer</Btn>
          {isCreateur&&<Btn onClick={()=>onSaisirScore(match)} variant="dark" small style={{fontSize:11}}><EmoIcon e="✏️" size={12}/></Btn>}
        </div>
      )}
      {bye&&<div style={{padding:"5px 10px",fontSize:10.5,color:CT.green,fontWeight:600,borderTop:`1px solid ${CT.border}`,background:CT.green+"11"}}>✅ Qualifié d'office — pas d'adversaire à ce tour</div>}
      {(match.statut==="attente_avancement"||match.statut==="vide")&&<div style={{padding:"5px 10px",fontSize:10.5,color:CT.muted,borderTop:`1px solid ${CT.border}`}}>⏳ En attente du tour précédent</div>}
    </div>
  );
};

const EliminatoiresView=({tournoi,joueurs,matchs,isCreateur,onSaisirScore,onJouerMatch,onRetourPoules,onTerminer})=>{
  const bracketM=matchs.filter(m=>m.phase!=="poules");
  const mainM=bracketM.filter(m=>MAIN_PHASES.includes(m.phase));
  const petiteM=bracketM.find(m=>m.phase==="petite_finale");
  const consoM=bracketM.filter(m=>m.phase==="consolante");
  const rounds=[...new Set(mainM.map(m=>m.round_bracket))].sort((a,b)=>a-b);
  const consoRounds=[...new Set(consoM.map(m=>m.round_bracket))].sort((a,b)=>a-b);
  // Tournoi prêt à clôturer : tous les matchs du tableau sont réglés (joués, exempts, ou vides)
  const allDone=bracketM.length>0&&bracketM.every(m=>m.statut==="termine"||m.statut.startsWith("bye")||m.statut==="vide");
  const finale=mainM.find(m=>m.phase==="finale");
  const champion=finale&&finale.statut==="termine"&&finale.gagnant_id?joueurs.find(j=>j.id===finale.gagnant_id):null;
  const colLabel={fontSize:12,fontWeight:700,color:CT.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4,textAlign:"center"};
  const finaleRoundNum=rounds.length?Math.max(...rounds):0;
  const roundCol=(r)=>{
    const rm=mainM.filter(m=>m.round_bracket===r).sort((a,b)=>a.position_bracket-b.position_bracket);
    const phase=rm[0]?.phase||"";
    return(
      <div key={r} style={{display:"flex",flexDirection:"column",gap:16,alignItems:"center"}}>
        <div style={colLabel}>{phase==="finale"?<EmoText s="🏆 Finale" size={13}/>:phase==="demi"?"Demi-finales":phase==="quart"?"Quarts":phase==="huitieme"?"Huitièmes":phase==="seizieme"?"Seizièmes":"Tour "+r}</div>
        {rm.map(m=>(<BracketMatchCard key={m.id} match={m} joueurs={joueurs} isCreateur={isCreateur} onSaisirScore={onSaisirScore} onJouerMatch={onJouerMatch}/>))}
      </div>
    );
  };
  const petiteCol=()=>(
    <div key="petite-finale" style={{display:"flex",flexDirection:"column",gap:16,alignItems:"center"}}>
      <div style={colLabel}><EmoText s="🥉 3e place" size={13}/></div>
      <BracketMatchCard match={petiteM} joueurs={joueurs} isCreateur={isCreateur} onSaisirScore={onSaisirScore} onJouerMatch={onJouerMatch}/>
    </div>
  );

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {isCreateur
          ? <button onClick={onRetourPoules} style={{background:"none",border:`1px solid ${CT.border}`,color:CT.muted,cursor:"pointer",fontSize:12,padding:"6px 12px",borderRadius:8,display:"inline-flex",alignItems:"center",gap:6,touchAction:"manipulation"}}>← Retour aux poules</button>
          : <span/>}
        {isCreateur&&<Btn onClick={()=>onTerminer(allDone)} variant={allDone?"primary":"dark"} small style={{fontSize:12}}>🏆 Terminer le tournoi</Btn>}
      </div>
      {champion&&(
        <Card style={{textAlign:"center",marginBottom:16,background:"linear-gradient(135deg,#78350f22,#f97316)",border:`1px solid ${CT.yellow}`}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:2}}><EmoIcon e="🏆" size={42} color="#fbbf24"/></div>
          <div style={{fontWeight:800,fontSize:19,color:CT.yellow}}>{champion.nom} remporte le tournoi !</div>
          {isCreateur&&<Btn onClick={()=>onTerminer(true)} variant="primary" style={{marginTop:12}}>🏁 Clôturer et voir le classement final</Btn>}
        </Card>
      )}
      {/* Tableau principal */}
      <div style={{overflowX:"auto",paddingBottom:16}}>
        <div style={{display:"flex",gap:24,alignItems:"flex-start",minWidth:"max-content",padding:"8px 0"}}>
          {/* tours jusqu'aux demies, puis la 3e place JUSTE AVANT la finale */}
          {rounds.filter(r=>r!==finaleRoundNum).map(roundCol)}
          {petiteM&&petiteCol()}
          {rounds.filter(r=>r===finaleRoundNum).map(roundCol)}
        </div>
      </div>
      {/* Consolante (repêchage des perdants du 1er tour) */}
      {consoM.length>0&&(
        <div style={{marginTop:10,borderTop:`1px solid ${CT.border}`,paddingTop:14}}>
          <div style={{fontWeight:800,fontSize:15,color:CT.accent,marginBottom:2,display:"flex",alignItems:"center",gap:6}}><EmoIcon e="🎖️" size={15}/>Consolante</div>
          <div style={{fontSize:11.5,color:CT.muted,marginBottom:10}}>Repêchage : les perdants du 1er tour rejouent ici pour le lot de consolation.</div>
          <div style={{overflowX:"auto",paddingBottom:16}}>
            <div style={{display:"flex",gap:24,alignItems:"flex-start",minWidth:"max-content",padding:"8px 0"}}>
              {consoRounds.map(r=>{
                const rm=consoM.filter(m=>m.round_bracket===r).sort((a,b)=>a.position_bracket-b.position_bracket);
                const isLast=r===consoRounds[consoRounds.length-1];
                return(
                  <div key={r} style={{display:"flex",flexDirection:"column",gap:16,alignItems:"center"}}>
                    <div style={colLabel}>{isLast?<EmoText s="🎖️ Finale consolante" size={12}/>:"Tour "+r}</div>
                    {rm.map(m=>(
                      <BracketMatchCard key={m.id} match={m} joueurs={joueurs} isCreateur={isCreateur} onSaisirScore={onSaisirScore} onJouerMatch={onJouerMatch}/>
                    ))}
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
const ResultatsView=({tournoi,joueurs,matchs,onRejouer})=>{
  const finale=matchs.find(m=>m.phase==="finale"&&m.statut==="termine");
  const gagnant=finale?joueurs.find(j=>j.id===finale.gagnant_id):null;
  const perdant=finale?joueurs.find(j=>j.id===(finale.joueur1_id===finale.gagnant_id?finale.joueur2_id:finale.joueur1_id)):null;
  // 3e place (petite finale)
  const petite=matchs.find(m=>m.phase==="petite_finale"&&m.statut==="termine"&&m.gagnant_id);
  const troisieme=petite?joueurs.find(j=>j.id===petite.gagnant_id):null;
  // Vainqueur de la consolante (dernier tour joué)
  const consoFinale=matchs.filter(m=>m.phase==="consolante"&&m.statut==="termine"&&m.gagnant_id).sort((a,b)=>b.round_bracket-a.round_bracket)[0];
  const consoWinner=consoFinale?joueurs.find(j=>j.id===consoFinale.gagnant_id):null;

  // MVP = joueur avec le plus de victoires
  const mvp=[...joueurs].sort((a,b)=>b.victoires-a.victoires)[0];

  // Palmarès du MVP : meilleure moyenne, plus gros finish, nb de 180 — depuis ses duels 1v1 (si joueur inscrit)
  const [palmares,setPalmares]=useState(null);
  useEffect(()=>{
    const jid=mvp?.joueur_id;
    if(!jid){ setPalmares(null); return; }
    let annule=false;
    sbTP(`duels?or=(challenger_id.eq.${jid},defie_id.eq.${jid})&select=statut,challenger_id,challenger_pseudo,defie_pseudo,score_challenger,score_defie,manches_detail`)
      .then(rows=>{
        if(annule||!rows)return;
        const termines=rows.filter(d=>d.statut==="termine");
        const moys=termines.map(d=>parseFloat(d.challenger_id===jid?d.score_challenger:d.score_defie)).filter(s=>!isNaN(s)&&s>0);
        let nb180=0,plusGrosFinish=0;
        termines.forEach(d=>{
          const monPseudo=d.challenger_id===jid?(d.challenger_pseudo||mvp.nom):(d.defie_pseudo||mvp.nom);
          (d.manches_detail||[]).forEach(m=>{
            const isW=m.winner===monPseudo||m.winner===mvp.nom;
            nb180+=isW?(m.winner_180||0):(m.loser_180||0);
            if(isW)plusGrosFinish=Math.max(plusGrosFinish,m.winner_finish||0);
          });
        });
        setPalmares({moyenne:moys.length?Math.max(...moys):null,finish:plusGrosFinish,nb180});
      }).catch(()=>{ if(!annule)setPalmares(null); });
    return()=>{ annule=true; };
  },[mvp?.joueur_id]);
  const hasPalmares=!!palmares&&(palmares.moyenne!=null||palmares.finish>0||palmares.nb180>0);

  // Best stats
  const bestPoules=rankGroup(joueurs)[0];

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
        {rankGroup(joueurs).map((j,i)=>(
          <div key={j.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:i===0?"#f9731614":i===1?"#94a3b814":i===2?"#f59e0b14":"transparent",borderRadius:8,marginBottom:4}}>
            <span style={{fontSize:18,display:"inline-flex",justifyContent:"center",width:20}}>{i<3?<EmoIcon e={i===0?"🥇":i===1?"🥈":"🥉"} size={18}/>:"·"}</span>
            <span style={{flex:1,fontWeight:i<3?700:400}}>{j.nom}</span>
            <span style={{fontSize:12,color:CT.muted}}>{j.victoires}V {j.defaites}D</span>
            <span style={{fontWeight:700,color:CT.accent}}>{j.points} pts</span>
          </div>
        ))}
      </Card>

      {/* MVP */}
      {mvp&&(
        <Card style={{marginBottom:16,background:"#a78bfa11",border:`1px solid ${CT.purple}44`}}>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:hasPalmares?14:0}}>
            <EmoIcon e="⭐" size={32} color="#fbbf24" fill="#fbbf24"/>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:CT.purple}}>MVP du tournoi</div>
              <div style={{fontWeight:800,fontSize:18}}>{mvp.nom}</div>
              <div style={{fontSize:12,color:CT.muted}}>{mvp.victoires} victoires · {mvp.points} points</div>
            </div>
          </div>
          {hasPalmares&&(
            <>
              <div style={{fontSize:10,color:CT.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:8,borderTop:`1px solid ${CT.purple}33`,paddingTop:12}}><EmoText s="🏅 Palmarès (carrière)" size={10}/></div>
              <div style={{display:"flex",gap:8}}>
                {[
                  {e:"🎯",l:"Meilleure moyenne",v:palmares.moyenne!=null?palmares.moyenne.toFixed(1):"—"},
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

      {/* Rejouer */}
      <Btn onClick={onRejouer} variant="ghost" style={{width:"100%",marginTop:8}}>
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
  const pollRef=useRef(null);

  const reload=useCallback(async()=>{
    try{
      const [t,j,m]=await Promise.all([dbTP.getTournoi(tournoiId),dbTP.getJoueurs(tournoiId),dbTP.getMatchs(tournoiId)]);
      if(t)setTournoi(t);
      if(j)setJoueurs(j);
      if(m)setMatchs(m);
    }catch(e){console.error(e);}
    setLoading(false);
  },[tournoiId]);

  useEffect(()=>{
    reload();
    // Polling toutes les 5s si tournoi actif
    pollRef.current=setInterval(reload,5000);
    return()=>clearInterval(pollRef.current);
  },[reload]);

  // Synchronise le nb de cibles depuis le serveur (si la colonne existe)
  useEffect(()=>{ if(tournoi&&typeof tournoi.nb_cibles==="number"&&tournoi.nb_cibles>0)setCibles(tournoi.nb_cibles); },[tournoi?.nb_cibles]);
  // Change le nb de cibles (optimiste + persistance serveur si possible)
  const changerCibles=async(n)=>{
    const v=Math.max(1,Math.min(12,n));
    setCibles(v);
    setTournoi(t=>t?{...t,nb_cibles:v}:t);
    try{ await dbTP.updateTournoi(tournoiId,{nb_cibles:v}); }catch(e){ /* colonne nb_cibles pas encore créée : on garde l'état local */ }
  };

  const isCreateur=joueurConnecte&&tournoi&&tournoi.createur_id===joueurConnecte.id;

  // ── Lancer le tournoi (phase poules)
  const lancerTournoi=async(poolSize=4,poolManches=2,nbCibles=2)=>{
    if(joueurs.length<2)return;
    setSaving(true);
    try{
      const nb=Math.max(1,Math.round(joueurs.length/poolSize)); // nb de poules d'après la taille choisie
      // Vrai tirage au sort (Fisher-Yates) puis répartition round-robin → poules équilibrées et aléatoires
      const shuffled=melangerAleatoire(joueurs);
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
      await dbTP.updateTournoi(tournoiId,{statut:"poules"});
      setCibles(nbCibles);
      try{ await dbTP.updateTournoi(tournoiId,{nb_cibles:nbCibles}); }catch(e){ /* colonne nb_cibles pas encore créée */ }
      setShowPoolConfig(false);
      await reload();
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  // ── Saisir un score
  const saisirScore=async(match,score1,score2)=>{
    const gagnant_id=score1>score2?match.joueur1_id:match.joueur2_id;
    const perdant_id=score1>score2?match.joueur2_id:match.joueur1_id;
    const win=Math.max(score1,score2);
    const lose=Math.min(score1,score2);

    try{
      // Update match
      await dbTP.updateMatch(match.id,{score1,score2,gagnant_id,statut:"termine",date_fin:new Date().toISOString()});

      // Update joueur stats
      const j1=joueurs.find(j=>j.id===match.joueur1_id);
      const j2=joueurs.find(j=>j.id===match.joueur2_id);
      const pts_win=2,pts_lose=1; // points per victory/defeat regardless of score

      // Winner
      if(gagnant_id===match.joueur1_id){
        await dbTP.updateJoueur(j1.id,{victoires:j1.victoires+1,defaites:j1.defaites,points:j1.points+pts_win,manches_pour:j1.manches_pour+score1,manches_contre:j1.manches_contre+score2});
        await dbTP.updateJoueur(j2.id,{victoires:j2.victoires,defaites:j2.defaites+1,points:j2.points+(lose>0?pts_lose:0),manches_pour:j2.manches_pour+score2,manches_contre:j2.manches_contre+score1});
      }else{
        await dbTP.updateJoueur(j2.id,{victoires:j2.victoires+1,defaites:j2.defaites,points:j2.points+pts_win,manches_pour:j2.manches_pour+score2,manches_contre:j2.manches_contre+score1});
        await dbTP.updateJoueur(j1.id,{victoires:j1.victoires,defaites:j1.defaites+1,points:j1.points+(lose>0?pts_lose:0),manches_pour:j1.manches_pour+score1,manches_contre:j1.manches_contre+score2});
      }

      // If bracket match → advance winner
      if(match.phase!=="poules"&&match.round_bracket>0){
        await advancerBracket(match,gagnant_id);
      }

      await reload();
    }catch(e){alert("Erreur : "+e.message);}
  };

  // Advance winner + route loser (consolante / petite finale)
  const advancerBracket=async(match,gagnant_id)=>{
    const freshMatchs=await dbTP.getMatchs(tournoiId);
    await avancerApresMatch(match,gagnant_id,freshMatchs);
  };

  // ── Lancer les éliminatoires
  const lancerEliminatoires=async(config={})=>{
    const {nbQual=2,bracketSize:bsChoisi,manchesMap={},consolante=false,petiteFinale=false}=config;
    setSaving(true);
    try{
      const nbGroupes=Math.max(...joueurs.map(j=>j.groupe),1);
      // Qualifiés : les N premiers de chaque poule (N réglable), taggés par rang de poule
      const topParGroupe=[];
      for(let g=1;g<=nbGroupes;g++){
        const jG=rankGroup(joueurs.filter(j=>j.groupe===g));
        jG.slice(0,nbQual).forEach((j,idx)=>topParGroupe.push({...j,poolRank:idx+1}));
      }
      const sizes=[2,4,8,16,32];
      const bracketSize=bsChoisi||sizes.find(s=>s>=topParGroupe.length)||32;
      const seededFlat=seedPoolAware(topParGroupe,bracketSize);
      const bracketMatchs=genBracketMatchs(seededFlat,tournoiId,manchesMap,{consolante,petiteFinale});
      if(bracketMatchs.length>0)await dbTP.addMatchs(bracketMatchs);
      await dbTP.updateTournoi(tournoiId,{statut:"eliminatoires"});
      setShowBracketConfig(false);
      await reload();
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  // ── Retour aux poules (annule le tableau, en cas d'erreur de réglage)
  const retourPoules=async()=>{
    if(!window.confirm("Revenir à la phase de poules ?\n\nLe tableau actuel sera supprimé. Les poules et leurs résultats sont conservés."))return;
    setSaving(true);
    try{
      await dbTP.deleteMatchsTableau(tournoiId);
      // Recalcule le classement depuis les matchs de poules (au cas où des matchs du tableau auraient été joués)
      const st={}; joueurs.forEach(j=>{ st[j.id]={victoires:0,defaites:0,points:0,manches_pour:0,manches_contre:0}; });
      matchs.filter(m=>m.phase==="poules"&&m.statut==="termine"&&m.gagnant_id).forEach(m=>{
        const lose=Math.min(m.score1,m.score2);
        const w=m.gagnant_id, l=m.gagnant_id===m.joueur1_id?m.joueur2_id:m.joueur1_id;
        const ws=m.gagnant_id===m.joueur1_id?m.score1:m.score2, ls=m.gagnant_id===m.joueur1_id?m.score2:m.score1;
        if(st[w]){ st[w].victoires++; st[w].points+=2; st[w].manches_pour+=ws; st[w].manches_contre+=ls; }
        if(st[l]){ st[l].defaites++; st[l].points+=(lose>0?1:0); st[l].manches_pour+=ls; st[l].manches_contre+=ws; }
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
    if(!window.confirm(msg))return;
    setSaving(true);
    try{
      await dbTP.updateTournoi(tournoiId,{statut:"termine"});
      await reload();
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  // ── Rejouer
  const rejouer=async()=>{
    setSaving(true);
    try{
      const noms=joueurs.map(j=>j.nom);
      const code=genCode();
      const nt=await dbTP.createTournoi({
        nom:tournoi.nom+" (replay)",
        createur_id:tournoi.createur_id,
        createur_pseudo:tournoi.createur_pseudo,
        mode:tournoi.mode,
        statut:"attente",
        code,
        date:new Date().toISOString(),
      });
      if(!nt)throw new Error("Création échouée");
      await Promise.all(
        noms.map((nom,i)=>dbTP.addJoueur({tournoi_id:nt.id,nom,joueur_id:null,groupe:1,ordre:i,points:0,victoires:0,defaites:0,manches_pour:0,manches_contre:0}))
      );
      setPage("tournoi-potes-"+nt.id);
    }catch(e){alert("Erreur : "+e.message);}
    setSaving(false);
  };

  // ── Supprimer le tournoi
  const supprimerTournoi=async()=>{
    const ok=window.confirm(`⚠️ Supprimer "${tournoi.nom}" ?\n\nTous les matchs et résultats seront perdus. Cette action est irréversible.`);
    if(!ok)return;
    try{
      await dbTP.deleteTournoi(tournoiId);
      setPage("tournois-potes");
    }catch(e){alert("Erreur lors de la suppression : "+e.message);}
  };

  const addJoueur=async(nom,joueur_id=null)=>{
    const j=await dbTP.addJoueur({tournoi_id:tournoiId,nom,joueur_id,groupe:1,ordre:joueurs.length,points:0,victoires:0,defaites:0,manches_pour:0,manches_contre:0});
    if(j)setJoueurs(jj=>[...jj,j]);
  };

  const removeJoueur=async(id)=>{
    await dbTP.removeJoueur(id);
    setJoueurs(jj=>jj.filter(j=>j.id!==id));
  };

  if(loading)return<div style={{padding:40}}><Spinner/></div>;
  if(!tournoi)return<div style={{padding:40,textAlign:"center",color:CT.muted}}>Tournoi introuvable.</div>;

  const modeLabel=tournoi.mode==="301"?"🎯 301":"🎯 501";
  const statutLabel={attente:"⏳ Lobby",poules:"🏟️ Phase de poules",eliminatoires:"⚔️ Éliminatoires",termine:"🏆 Terminé"}[tournoi.statut]||tournoi.statut;

  return(
    <div style={{maxWidth:700,margin:"0 auto",padding:"24px 16px"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Header */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <button onClick={()=>window.history.back()} style={{background:"none",border:"none",color:CT.muted,cursor:"pointer",fontSize:13,padding:0}}>← Retour</button>
          {isCreateur&&tournoi.statut!=="termine"&&(
            <button onClick={supprimerTournoi} style={{background:"none",border:`1px solid ${CT.red}44`,color:CT.red,cursor:"pointer",fontSize:12,padding:"5px 12px",borderRadius:8,fontWeight:600,display:"inline-flex",alignItems:"center",gap:5}}><EmoIcon e="🗑" size={12}/>Supprimer</button>
          )}
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

      {/* Content by statut */}
      {tournoi.statut==="attente"&&(
        <LobbyView tournoi={tournoi} joueurs={joueurs} isCreateur={isCreateur}
          onStart={()=>setShowPoolConfig(true)} onAddJoueur={addJoueur} onRemoveJoueur={removeJoueur}
          joueurConnecte={joueurConnecte}/>
      )}
      {showPoolConfig&&<PoolConfigModal nbJoueurs={joueurs.length} saving={saving} onValider={lancerTournoi} onClose={()=>setShowPoolConfig(false)}/>}
      {tournoi.statut==="poules"&&(
        <PoulesView tournoi={tournoi} joueurs={joueurs} matchs={matchs} isCreateur={isCreateur}
          nbCibles={cibles} onSetCibles={changerCibles}
          onSaisirScore={m=>setMatchModal(m)}
          onJouerMatch={m=>setPage("scoreur-potes-"+m.id)}
          onLancerEliminatoires={()=>setShowBracketConfig(true)}/>
      )}
      {showBracketConfig&&<BracketConfigModal joueurs={joueurs} saving={saving} onValider={lancerEliminatoires} onClose={()=>setShowBracketConfig(false)}/>}
      {tournoi.statut==="eliminatoires"&&(
        <EliminatoiresView tournoi={tournoi} joueurs={joueurs}
          matchs={matchs.filter(m=>m.phase!=="poules")} isCreateur={isCreateur}
          onSaisirScore={m=>setMatchModal(m)}
          onJouerMatch={m=>setPage("scoreur-potes-"+m.id)}
          onRetourPoules={retourPoules} onTerminer={terminerTournoi}/>
      )}
      {tournoi.statut==="termine"&&(
        <ResultatsView tournoi={tournoi} joueurs={joueurs} matchs={matchs} onRejouer={rejouer}/>
      )}

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
  const [form,setForm]=useState({nom:"",mode:"501"});
  const [creating,setSaving]=useState(false);

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
      const t=await dbTP.createTournoi({nom:form.nom.trim(),mode:form.mode,createur_id:joueur.id,createur_pseudo:joueur.pseudo,statut:"attente",code:genCode(),date:new Date().toISOString()});
      if(!t)throw new Error("Création échouée");
      await dbTP.addJoueur({tournoi_id:t.id,nom:joueur.pseudo,joueur_id:joueur.id,groupe:1,ordre:0,points:0,victoires:0,defaites:0,manches_pour:0,manches_contre:0});
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
      </div>

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
    mode:tournoi.mode||"501",
    manches:match.manches_max||2,
    challenger_pseudo:j1.nom,
    defie_pseudo:j2.nom,
    challenger_id:j1.id,
    defie_id:j2.id,
  };

  const handleResultat=async({gagnantNom,scoreC,scoreD})=>{
    const gagnant_id=gagnantNom===j1.nom?j1.id:j2.id;
    const perdant_id=gagnant_id===j1.id?j2.id:j1.id;
    // scoreC = manches won by challenger (j1), scoreD by defie (j2)
    const score1=gagnant_id===j1.id?Math.max(scoreC,scoreD):Math.min(scoreC,scoreD);
    const score2=gagnant_id===j2.id?Math.max(scoreC,scoreD):Math.min(scoreC,scoreD);
    try{
      await dbTP.updateMatch(match.id,{score1,score2,gagnant_id,statut:"termine",date_fin:new Date().toISOString()});
      // Update joueur stats in tournament
      const gJ=joueurs.find(j=>j.id===gagnant_id);
      const lJ=joueurs.find(j=>j.id===perdant_id);
      if(gJ)await dbTP.updateJoueur(gJ.id,{victoires:gJ.victoires+1,points:gJ.points+2,manches_pour:gJ.manches_pour+score1,manches_contre:gJ.manches_contre+score2});
      if(lJ)await dbTP.updateJoueur(lJ.id,{defaites:lJ.defaites+1,points:lJ.points+(Math.min(score1,score2)>0?1:0),manches_pour:lJ.manches_pour+score2,manches_contre:lJ.manches_contre+score1});
      // If bracket → advance winner + route loser (consolante / petite finale)
      if(match.phase!=="poules"&&match.round_bracket>0){
        const allMatchs=await dbTP.getMatchs(match.tournoi_id);
        await avancerApresMatch(match,gagnant_id,allMatchs);
      }
    }catch(e){console.error("Erreur save match:",e);}
  };

  return(
    <Scoreur
      duel={fakeDuel}
      onResultat={handleResultat}
      onDuelTermine={()=>setPage("tournoi-potes-"+match.tournoi_id)}
      setPage={setPage}
    />
  );
};
