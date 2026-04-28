import { useState, useEffect, useCallback, useRef } from "react";
import { Scoreur } from "./AppJeux";

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

// Phase name from round and total rounds
const phaseName=(round,totalRounds)=>{
  const fromFinal=totalRounds-round;
  if(fromFinal===0)return"finale";
  if(fromFinal===1)return"demi";
  if(fromFinal===2)return"quart";
  return"huitieme";
};

// Generate all poule matches (round-robin)
const genPouleMatchs=(joueurs,groupe,tournoi_id)=>{
  const matchs=[];
  for(let i=0;i<joueurs.length;i++){
    for(let j=i+1;j<joueurs.length;j++){
      matchs.push({tournoi_id,joueur1_id:joueurs[i].id,joueur2_id:joueurs[j].id,score1:0,score2:0,phase:"poules",groupe,statut:"en_attente",round_bracket:0,position_bracket:i*100+j,manches_max:2});
    }
  }
  return matchs;
};

// Generate bracket matches from ordered seeded list
const genBracketMatchs=(seeded,tournoi_id)=>{
  const n=seeded.length; // power of 2
  const totalRounds=Math.log2(n);
  const matchs=[];
  // Round 1
  for(let pos=0;pos<n/2;pos++){
    const j1=seeded[pos*2];
    const j2=seeded[pos*2+1];
    const phase=phaseName(1,totalRounds);
    const statut=j1&&j2?"en_attente":j1?"bye_j2":j2?"bye_j1":"vide";
    matchs.push({tournoi_id,joueur1_id:j1?.id||null,joueur2_id:j2?.id||null,score1:0,score2:0,gagnant_id:j1&&!j2?j1.id:j2&&!j1?j2.id:null,phase,groupe:0,statut,round_bracket:1,position_bracket:pos,manches_max:2});
  }
  // Subsequent rounds (empty placeholders)
  for(let r=2;r<=totalRounds;r++){
    const nb=n/Math.pow(2,r);
    const phase=phaseName(r,totalRounds);
    for(let pos=0;pos<nb;pos++){
      matchs.push({tournoi_id,joueur1_id:null,joueur2_id:null,score1:0,score2:0,gagnant_id:null,phase,groupe:0,statut:"attente_avancement",round_bracket:r,position_bracket:pos,manches_max:r===totalRounds?5:2});
    }
  }
  return matchs;
};

// Sort joueurs by ranking in a group
const rankGroup=(joueurs)=>[...joueurs].sort((a,b)=>{
  if(b.points!==a.points)return b.points-a.points;
  return(b.manches_pour-b.manches_contre)-(a.manches_pour-a.manches_contre);
});

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
        <button onClick={onClose} style={{position:"absolute",top:12,right:12,background:"none",border:"none",color:CT.muted,cursor:"pointer",fontSize:18}}>✕</button>
        <h3 style={{fontWeight:700,fontSize:16,marginBottom:4}}>⚔️ Saisir le score</h3>
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
          {saving?"Enregistrement…":"✅ Valider le score"}
        </Btn>
      </Card>
    </div>
  );
};

// ── VUE LOBBY ─────────────────────────────────────────────────────────────────
const LobbyView=({tournoi,joueurs,isCreateur,onStart,onAddJoueur,onRemoveJoueur,joueurConnecte})=>{
  const [nom,setNom]=useState("");
  const [adding,setAdding]=useState(false);
  const [amis,setAmis]=useState([]);
  const [addingAmi,setAddingAmi]=useState(null); // id de l'ami en cours d'ajout

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
    if(!nom.trim()||joueurs.length>=25)return;
    setAdding(true);
    await onAddJoueur(nom.trim(),null);
    setNom("");
    setAdding(false);
  };

  const handleAddAmi=async(ami)=>{
    if(joueurs.length>=25)return;
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
          <span style={{fontSize:20}}>🔗</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>Lien de partage</div>
            <div style={{fontSize:12,color:CT.muted,wordBreak:"break-all",background:"#111",borderRadius:6,padding:"6px 10px",fontFamily:"monospace"}}>{lien}</div>
          </div>
          <Btn onClick={copyLien} variant="ghost" small>{copied?"✅ Copié !":"📋 Copier"}</Btn>
        </div>
        <div style={{marginTop:10,fontSize:12,color:CT.muted}}>Code : <b style={{color:CT.yellow,fontSize:16,letterSpacing:2}}>{tournoi.code}</b></div>
      </Card>

      {/* Inviter mes amis (si créateur connecté) */}
      {isCreateur&&amis.length>0&&(
        <Card style={{marginBottom:16}}>
          <h3 style={{fontWeight:700,fontSize:14,marginBottom:12,color:CT.blue}}>👥 Inviter mes amis</h3>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {amis.map(ami=>{
              const deja=amiDejaAjoute(ami.id);
              return(
                <div key={ami.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#111",borderRadius:8,border:`1px solid ${deja?CT.green+"44":CT.border}`}}>
                  <span style={{fontSize:18}}>👤</span>
                  <span style={{flex:1,fontWeight:500,fontSize:14}}>{ami.pseudo}</span>
                  {deja
                    ?<Badge color={CT.green}>✅ Ajouté</Badge>
                    :<Btn onClick={()=>handleAddAmi(ami)} disabled={addingAmi===ami.id||joueurs.length>=25} small variant="ghost">
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
          <h3 style={{fontWeight:700,fontSize:15}}>🎯 Joueurs inscrits ({joueurs.length}/25)</h3>
          <Badge color={joueurs.length>=2?CT.green:CT.muted}>{joueurs.length>=2?"Prêt à lancer":"Ajoutez des joueurs"}</Badge>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {joueurs.map((j,i)=>(
            <div key={j.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#111",borderRadius:8,border:`1px solid ${CT.border}`}}>
              <span style={{width:24,height:24,borderRadius:"50%",background:CT.accent+"22",color:CT.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700}}>{i+1}</span>
              <span style={{flex:1,fontWeight:500}}>{j.nom}</span>
              {j.joueur_id&&<Badge color={CT.blue}>Compte 🔗</Badge>}
              {isCreateur&&<button onClick={()=>onRemoveJoueur(j.id)} style={{background:"none",border:"none",color:CT.muted,cursor:"pointer",fontSize:16,padding:"0 4px"}} title="Retirer">✕</button>}
            </div>
          ))}
          {joueurs.length===0&&<p style={{color:CT.muted,fontSize:13,textAlign:"center",padding:12}}>Aucun joueur ajouté</p>}
        </div>

        {/* Add manual player */}
        {isCreateur&&joueurs.length<25&&(
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
          🚀 Lancer le tournoi ({joueurs.length} joueurs)
        </Btn>
      )}
      {!isCreateur&&<p style={{textAlign:"center",color:CT.muted,fontSize:13}}>En attente du lancement par {tournoi.createur_pseudo}…</p>}
    </div>
  );
};

// ── VUE POULES ────────────────────────────────────────────────────────────────
const PoulesView=({tournoi,joueurs,matchs,isCreateur,onSaisirScore,onJouerMatch,onLancerEliminatoires})=>{
  const nbGroupes=Math.max(...joueurs.map(j=>j.groupe),1);
  const groupes=Array.from({length:nbGroupes},(_,i)=>i+1);
  const termines=matchs.filter(m=>m.phase==="poules"&&m.statut==="termine");
  const total=matchs.filter(m=>m.phase==="poules").length;
  const allDone=total>0&&termines.length===total;

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
      </Card>

      {/* Groups */}
      {groupes.map(g=>{
        const jG=rankGroup(joueurs.filter(j=>j.groupe===g));
        const mG=matchs.filter(m=>m.phase==="poules"&&m.groupe===g);
        return(
          <Card key={g} style={{marginBottom:16}}>
            <h3 style={{fontWeight:700,fontSize:15,marginBottom:12,color:CT.accent}}>🏷️ Groupe {g}</h3>
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
                return(
                  <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:`1px solid ${CT.border+"44"}`}}>
                    <span style={{flex:1,fontSize:13,fontWeight:done&&m.gagnant_id===j1?.id?700:400,color:done&&m.gagnant_id===j1?.id?CT.green:CT.text}}>{j1?.nom||"?"}</span>
                    <span style={{fontWeight:800,fontSize:15,minWidth:40,textAlign:"center",color:done?CT.text:CT.muted}}>
                      {done?`${m.score1}–${m.score2}`:"vs"}
                    </span>
                    <span style={{flex:1,fontSize:13,fontWeight:done&&m.gagnant_id===j2?.id?700:400,color:done&&m.gagnant_id===j2?.id?CT.green:CT.text,textAlign:"right"}}>{j2?.nom||"?"}</span>
                    {!done&&(
                      <div style={{display:"flex",gap:6}}>
                        <Btn onClick={()=>onJouerMatch(m)} variant="primary" small>▶ Jouer</Btn>
                        <Btn onClick={()=>onSaisirScore(m)} variant="dark" small>✏️</Btn>
                      </div>
                    )}
                    {done&&<Badge color={CT.green}>✅</Badge>}
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
          🏆 Lancer les éliminatoires
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
        {match.phase==="finale"?"🏆 Finale":match.phase==="demi"?"🥈 Demie":match.phase==="quart"?"⚔️ Quart":"1/8"}
      </div>
      <div style={rowStyle(j1,done&&match.gagnant_id===j1?.id)}>
        <span style={{fontSize:13,fontWeight:done&&match.gagnant_id===j1?.id?700:400}}>{j1?.nom||<span style={{color:CT.muted}}>À définir</span>}</span>
        {done&&<span style={{fontWeight:800,color:match.gagnant_id===j1?.id?CT.green:CT.muted}}>{match.score1}</span>}
      </div>
      <div style={{height:1,background:CT.border}}/>
      <div style={rowStyle(j2,done&&match.gagnant_id===j2?.id)}>
        <span style={{fontSize:13,fontWeight:done&&match.gagnant_id===j2?.id?700:400}}>{j2?.nom||<span style={{color:CT.muted}}>À définir</span>}</span>
        {done&&<span style={{fontWeight:800,color:match.gagnant_id===j2?.id?CT.green:CT.muted}}>{match.score2}</span>}
      </div>
      {!done&&!bye&&j1&&j2&&(
        <div style={{padding:"6px 10px",borderTop:`1px solid ${CT.border}`,display:"flex",gap:6}}>
          <Btn onClick={()=>onJouerMatch(match)} variant="primary" small style={{flex:1,fontSize:11}}>▶ Jouer</Btn>
          {isCreateur&&<Btn onClick={()=>onSaisirScore(match)} variant="dark" small style={{fontSize:11}}>✏️</Btn>}
        </div>
      )}
      {bye&&<div style={{padding:"4px 10px",fontSize:10,color:CT.muted}}>Bye automatique</div>}
    </div>
  );
};

const EliminatoiresView=({tournoi,joueurs,matchs,isCreateur,onSaisirScore,onJouerMatch})=>{
  const rounds=[...new Set(matchs.filter(m=>m.phase!=="poules").map(m=>m.round_bracket))].sort((a,b)=>a-b);

  return(
    <div>
      <div style={{overflowX:"auto",paddingBottom:16}}>
        <div style={{display:"flex",gap:24,alignItems:"flex-start",minWidth:"max-content",padding:"8px 0"}}>
          {rounds.map(r=>{
            const rm=matchs.filter(m=>m.round_bracket===r&&m.phase!=="poules").sort((a,b)=>a.position_bracket-b.position_bracket);
            const phase=rm[0]?.phase||"";
            return(
              <div key={r} style={{display:"flex",flexDirection:"column",gap:16,alignItems:"center"}}>
                <div style={{fontSize:12,fontWeight:700,color:CT.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4,textAlign:"center"}}>
                  {phase==="finale"?"🏆 Finale":phase==="demi"?"Demi-finales":phase==="quart"?"Quarts":phase==="huitieme"?"Huitièmes":"Tour "+r}
                </div>
                {rm.map(m=>(
                  <BracketMatchCard key={m.id} match={m} joueurs={joueurs} isCreateur={isCreateur} onSaisirScore={onSaisirScore} onJouerMatch={onJouerMatch}/>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── VUE RÉSULTATS ─────────────────────────────────────────────────────────────
const ResultatsView=({tournoi,joueurs,matchs,onRejouer})=>{
  const finale=matchs.find(m=>m.phase==="finale"&&m.statut==="termine");
  const gagnant=finale?joueurs.find(j=>j.id===finale.gagnant_id):null;
  const perdant=finale?joueurs.find(j=>j.id===(finale.joueur1_id===finale.gagnant_id?finale.joueur2_id:finale.joueur1_id)):null;

  // MVP = joueur avec le plus de victoires
  const mvp=[...joueurs].sort((a,b)=>b.victoires-a.victoires)[0];

  // Best stats
  const bestPoules=rankGroup(joueurs)[0];

  return(
    <div>
      {/* Podium */}
      {gagnant&&(
        <Card style={{textAlign:"center",marginBottom:16,background:"linear-gradient(135deg,#78350f22,#f97316)",border:`1px solid ${CT.yellow}`}}>
          <div style={{fontSize:60,marginBottom:4}}>🏆</div>
          <div style={{fontWeight:800,fontSize:24,color:CT.yellow}}>{gagnant.nom}</div>
          <div style={{color:CT.muted,fontSize:14}}>Champion du tournoi</div>
          {finale&&<div style={{marginTop:8,fontWeight:700,fontSize:18}}>{finale.gagnant_id===finale.joueur1_id?finale.score1:finale.score2} – {finale.gagnant_id===finale.joueur1_id?finale.score2:finale.score1}</div>}
          {perdant&&<div style={{color:CT.muted,fontSize:13,marginTop:4}}>vs {perdant.nom}</div>}
        </Card>
      )}

      {/* Classement final */}
      <Card style={{marginBottom:16}}>
        <h3 style={{fontWeight:700,fontSize:15,marginBottom:12}}>📋 Classement final</h3>
        {rankGroup(joueurs).map((j,i)=>(
          <div key={j.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:i===0?"#f9731614":i===1?"#94a3b814":i===2?"#f59e0b14":"transparent",borderRadius:8,marginBottom:4}}>
            <span style={{fontSize:18}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":"·"}</span>
            <span style={{flex:1,fontWeight:i<3?700:400}}>{j.nom}</span>
            <span style={{fontSize:12,color:CT.muted}}>{j.victoires}V {j.defaites}D</span>
            <span style={{fontWeight:700,color:CT.accent}}>{j.points} pts</span>
          </div>
        ))}
      </Card>

      {/* MVP */}
      {mvp&&(
        <Card style={{marginBottom:16,background:"#a78bfa11",border:`1px solid ${CT.purple}44`}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:32}}>⭐</span>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:CT.purple}}>MVP du tournoi</div>
              <div style={{fontWeight:800,fontSize:18}}>{mvp.nom}</div>
              <div style={{fontSize:12,color:CT.muted}}>{mvp.victoires} victoires · {mvp.points} points</div>
            </div>
          </div>
        </Card>
      )}

      {/* Rejouer */}
      <Btn onClick={onRejouer} variant="ghost" style={{width:"100%",marginTop:8}}>
        🔄 Rejouer avec les mêmes joueurs
      </Btn>
    </div>
  );
};

// ── DÉTAIL TOURNOI ────────────────────────────────────────────────────────────
export const TournoiPotesDetail=({tournoiId,joueurConnecte,setPage})=>{
  const [tournoi,setTournoi]=useState(null);
  const [joueurs,setJoueurs]=useState([]);
  const [matchs,setMatchs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [matchModal,setMatchModal]=useState(null);
  const [saving,setSaving]=useState(false);
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

  const isCreateur=joueurConnecte&&tournoi&&tournoi.createur_id===joueurConnecte.id;

  // ── Lancer le tournoi (phase poules)
  const lancerTournoi=async()=>{
    if(joueurs.length<2)return;
    setSaving(true);
    try{
      const config=getTournoiConfig(joueurs.length);
      const nb=config.nbGroupes;
      // Assign groups (shuffle then round-robin)
      const shuffled=[...joueurs].sort(()=>Math.random()-.5);
      for(let i=0;i<shuffled.length;i++){
        await dbTP.updateJoueur(shuffled[i].id,{groupe:(i%nb)+1,ordre:i});
      }
      // Generate matches per group
      const joueursUpd=await dbTP.getJoueurs(tournoiId);
      const allMatchs=[];
      for(let g=1;g<=nb;g++){
        const jG=joueursUpd.filter(j=>j.groupe===g);
        allMatchs.push(...genPouleMatchs(jG,g,tournoiId));
      }
      if(allMatchs.length>0)await dbTP.addMatchs(allMatchs);
      await dbTP.updateTournoi(tournoiId,{statut:"poules"});
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

  // Advance winner to next bracket round
  const advancerBracket=async(match,gagnant_id)=>{
    const freshMatchs=await dbTP.getMatchs(tournoiId);
    const nextRound=match.round_bracket+1;
    const nextPos=Math.floor(match.position_bracket/2);
    const isJ1Slot=match.position_bracket%2===0;

    const nextMatch=freshMatchs.find(m=>m.round_bracket===nextRound&&m.position_bracket===nextPos&&m.phase!=="poules");
    if(!nextMatch)return;

    const patch=isJ1Slot?{joueur1_id:gagnant_id}:{joueur2_id:gagnant_id};
    // Check if the other slot is already filled
    const otherFilled=isJ1Slot?nextMatch.joueur2_id:nextMatch.joueur1_id;
    const newStatut=otherFilled?"en_attente":"attente_avancement";
    await dbTP.updateMatch(nextMatch.id,{...patch,statut:newStatut});

    // Check if finale is done → tournoi terminé
    if(match.phase==="finale"){
      await dbTP.updateTournoi(tournoiId,{statut:"termine"});
    }
  };

  // ── Lancer les éliminatoires
  const lancerEliminatoires=async()=>{
    setSaving(true);
    try{
      const nbGroupes=Math.max(...joueurs.map(j=>j.groupe),1);
      // Take top 2 from each group + sort all remaining by points for wildcard
      const topParGroupe=[];
      for(let g=1;g<=nbGroupes;g++){
        const jG=rankGroup(joueurs.filter(j=>j.groupe===g));
        topParGroupe.push(...jG.slice(0,2));
      }
      // Sort all qualifiés by points desc for seeding
      const qualifies=rankGroup(topParGroupe);
      // Pad to nearest power of 2
      const sizes=[2,4,8,16];
      const bracketSize=sizes.find(s=>s>=qualifies.length)||16;
      const seededFlat=seedBracket(qualifies,bracketSize);
      const bracketMatchs=genBracketMatchs(seededFlat,tournoiId);
      if(bracketMatchs.length>0)await dbTP.addMatchs(bracketMatchs);
      await dbTP.updateTournoi(tournoiId,{statut:"eliminatoires"});
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
      for(let i=0;i<noms.length;i++){
        await dbTP.addJoueur({tournoi_id:nt.id,nom:noms[i],joueur_id:null,groupe:1,ordre:i,points:0,victoires:0,defaites:0,manches_pour:0,manches_contre:0});
      }
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
          <button onClick={()=>setPage("tournois-potes")} style={{background:"none",border:"none",color:CT.muted,cursor:"pointer",fontSize:13,padding:0}}>← Retour</button>
          {isCreateur&&tournoi.statut!=="termine"&&(
            <button onClick={supprimerTournoi} style={{background:"none",border:`1px solid ${CT.red}44`,color:CT.red,cursor:"pointer",fontSize:12,padding:"5px 12px",borderRadius:8,fontWeight:600}}>🗑 Supprimer</button>
          )}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
          <div>
            <h1 style={{fontWeight:800,fontSize:22,marginBottom:4}}>🏓 {tournoi.nom}</h1>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <Badge color={CT.blue}>{modeLabel}</Badge>
              <Badge color={tournoi.statut==="termine"?CT.green:CT.yellow}>{statutLabel}</Badge>
              <Badge color={CT.muted}>par {tournoi.createur_pseudo}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Content by statut */}
      {tournoi.statut==="attente"&&(
        <LobbyView tournoi={tournoi} joueurs={joueurs} isCreateur={isCreateur}
          onStart={lancerTournoi} onAddJoueur={addJoueur} onRemoveJoueur={removeJoueur}
          joueurConnecte={joueurConnecte}/>
      )}
      {tournoi.statut==="poules"&&(
        <PoulesView tournoi={tournoi} joueurs={joueurs} matchs={matchs} isCreateur={isCreateur}
          onSaisirScore={m=>setMatchModal(m)}
          onJouerMatch={m=>setPage("scoreur-potes-"+m.id)}
          onLancerEliminatoires={lancerEliminatoires}/>
      )}
      {tournoi.statut==="eliminatoires"&&(
        <EliminatoiresView tournoi={tournoi} joueurs={joueurs}
          matchs={matchs.filter(m=>m.phase!=="poules")} isCreateur={isCreateur}
          onSaisirScore={m=>setMatchModal(m)}
          onJouerMatch={m=>setPage("scoreur-potes-"+m.id)}/>
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
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>🏓 {t.nom}</div>
          <div style={{fontSize:12,color:CT.muted}}>{new Date(t.date).toLocaleDateString("fr-FR")} · {t.mode}</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <Badge color={s}>{sl}</Badge>
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
    dbTP.getTournois(joueur.id).then(r=>{setMesT(r||[]);setLoading(false);}).catch(()=>setLoading(false));
  },[joueur]);

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
        <h1 style={{fontWeight:800,fontSize:24,marginBottom:6}}>🍺 Tournoi entre potes</h1>
        <p style={{color:CT.muted,fontSize:14}}>Mode local et convivial — sans impact sur les stats DRIX</p>
      </div>

      {/* Onglets principaux */}
      <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
        {[["liste","📋 Mes tournois"],["creer","➕ Créer"]].map(([v,l])=>(
          <button key={v} onClick={()=>setVue(v)} style={{background:vue===v?CT.accent+"22":"transparent",color:vue===v?CT.accent:CT.muted,border:`1px solid ${vue===v?CT.accent:CT.border}`,cursor:"pointer",padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:600}}>{l}</button>
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
                  ⚡ En cours {enCours.length>0&&<span style={{background:CT.accent,color:"#fff",borderRadius:20,padding:"1px 7px",fontSize:11,marginLeft:4}}>{enCours.length}</span>}
                </button>
                <button onClick={()=>setFiltre("passes")} style={{flex:1,background:filtre==="passes"?CT.card:"transparent",color:filtre==="passes"?CT.text:CT.muted,border:"none",cursor:"pointer",padding:"8px 12px",borderRadius:8,fontSize:13,fontWeight:600,transition:"all .15s"}}>
                  🏆 Passés {passes.length>0&&<span style={{background:CT.border,color:CT.muted,borderRadius:20,padding:"1px 7px",fontSize:11,marginLeft:4}}>{passes.length}</span>}
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
                    <button key={m} onClick={()=>setForm(f=>({...f,mode:m}))} style={{flex:1,padding:"10px",borderRadius:8,border:`2px solid ${form.mode===m?CT.accent:CT.border}`,background:form.mode===m?CT.accent+"22":"#111",color:form.mode===m?CT.accent:CT.muted,cursor:"pointer",fontWeight:700,fontSize:15}}>🎯 {m}</button>
                  ))}
                </div>
              </div>
              <Btn onClick={creerTournoi} disabled={!form.nom.trim()||creating} style={{marginTop:4}}>
                {creating?"Création…":"🚀 Créer le tournoi"}
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
      // If bracket → advance winner
      if(match.phase!=="poules"&&match.round_bracket>0){
        const allMatchs=await dbTP.getMatchs(match.tournoi_id);
        const nextRound=match.round_bracket+1;
        const nextPos=Math.floor(match.position_bracket/2);
        const isJ1Slot=match.position_bracket%2===0;
        const nextMatch=allMatchs.find(m=>m.round_bracket===nextRound&&m.position_bracket===nextPos&&m.phase!=="poules");
        if(nextMatch){
          const patch=isJ1Slot?{joueur1_id:gagnant_id}:{joueur2_id:gagnant_id};
          const otherFilled=isJ1Slot?nextMatch.joueur2_id:nextMatch.joueur1_id;
          await dbTP.updateMatch(nextMatch.id,{...patch,statut:otherFilled?"en_attente":"attente_avancement"});
        }
        if(match.phase==="finale")await dbTP.updateTournoi(match.tournoi_id,{statut:"termine"});
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
