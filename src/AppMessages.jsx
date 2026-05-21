import { useState, useEffect, useRef, useCallback } from "react";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sbM = async (path, opts={}) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":opts.prefer||"return=representation",...opts.headers},
    ...opts,
  });
  if (!res.ok){const e=await res.text();throw new Error(e);}
  const text=await res.text();
  return text?JSON.parse(text):null;
};

export const dbM = {
  getAllMessages:(id)=>sbM(`messages?or=(from_id.eq.${id},to_id.eq.${id})&order=date.desc&select=*`),
  getConversation:(myId,otherId)=>sbM(`messages?or=(and(from_id.eq.${myId},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${myId}))&order=date.asc&select=*`),
  sendMessage:(d)=>sbM("messages",{method:"POST",body:JSON.stringify(d)}).then(r=>r?.[0]),
  markRead:(toId,fromId)=>sbM(`messages?to_id=eq.${toId}&from_id=eq.${fromId}&lu=eq.false`,{method:"PATCH",body:JSON.stringify({lu:true}),prefer:"return=minimal"}),
  getUnreadCount:(toId)=>sbM(`messages?to_id=eq.${toId}&lu=eq.false&select=id,from_id`),
};

// ── COULEURS ─────────────────────────────────────────────────────────────────
const CM = {
  bg:"#0f0f0f",card:"#1a1a1a",border:"#2a2a2a",
  accent:"#f97316",text:"#f1f5f9",muted:"#94a3b8",
  green:"#22c55e",red:"#ef4444",yellow:"#f59e0b",blue:"#60a5fa",
};

// ── UI ────────────────────────────────────────────────────────────────────────
const Spinner=()=><div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}><div style={{width:28,height:28,border:`3px solid ${CM.border}`,borderTop:`3px solid ${CM.accent}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>;

// ── UTILS ─────────────────────────────────────────────────────────────────────
const formatDate=(d)=>{
  const now=new Date();
  const msg=new Date(d);
  const diff=(now-msg)/1000;
  if(diff<60)return"À l'instant";
  if(diff<3600)return`Il y a ${Math.floor(diff/60)} min`;
  if(diff<86400)return msg.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  if(diff<604800)return msg.toLocaleDateString("fr-FR",{weekday:"short",hour:"2-digit",minute:"2-digit"});
  return msg.toLocaleDateString("fr-FR",{day:"2-digit",month:"short"});
};

const formatHeure=(d)=>new Date(d).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});

const initiales=(pseudo)=>pseudo?.slice(0,2).toUpperCase()||"??";

const couleurPseudo=(pseudo)=>{
  const colors=["#f97316","#60a5fa","#22c55e","#a78bfa","#f59e0b","#ec4899","#14b8a6"];
  let h=0; for(const c of pseudo||"") h=(h*31+c.charCodeAt(0))%colors.length;
  return colors[h];
};

// ── VUE CONVERSATION ──────────────────────────────────────────────────────────
const ConversationView=({joueur,autreId,autrePseudo,onBack})=>{
  const [messages,setMessages]=useState([]);
  const [texte,setTexte]=useState("");
  const [sending,setSending]=useState(false);
  const [loading,setLoading]=useState(true);
  const endRef=useRef(null);
  const scrollRef=useRef(null);
  const textareaRef=useRef(null);
  const pollRef=useRef(null);
  const isAtBottomRef=useRef(true); // on considère qu'on est en bas au départ
  const prevCountRef=useRef(0);

  // Détecte si l'utilisateur est near the bottom (80px de marge)
  const checkAtBottom=()=>{
    const el=scrollRef.current;
    if(!el)return;
    isAtBottomRef.current=(el.scrollHeight-el.scrollTop-el.clientHeight)<80;
  };

  const scrollToBottom=(behavior="smooth")=>{
    endRef.current?.scrollIntoView({behavior});
  };

  const charger=useCallback(async(marqueLu=false)=>{
    const msgs=await dbM.getConversation(joueur.id,autreId);
    setMessages(msgs||[]);
    if(marqueLu)await dbM.markRead(joueur.id,autreId).catch(()=>{});
  },[joueur.id,autreId]);

  // Chargement initial → scroll instantané en bas
  useEffect(()=>{
    setLoading(true);
    charger(true).finally(()=>{
      setLoading(false);
    });
    pollRef.current=setInterval(()=>charger(true),4000);
    return()=>clearInterval(pollRef.current);
  },[charger]);

  // Scroll automatique seulement si on était déjà en bas ou si c'est le chargement initial
  useEffect(()=>{
    if(loading)return;
    const count=messages.length;
    if(prevCountRef.current===0){
      // Premier chargement : scroll instantané
      scrollToBottom("instant");
    } else if(count>prevCountRef.current){
      // Nouveaux messages : scroll seulement si on était en bas
      if(isAtBottomRef.current) scrollToBottom("smooth");
    }
    prevCountRef.current=count;
  },[messages,loading]);

  const envoyer=async()=>{
    if(!texte.trim()||sending)return;
    setSending(true);
    const msg={from_id:joueur.id,from_pseudo:joueur.pseudo,to_id:autreId,to_pseudo:autrePseudo,contenu:texte.trim(),date:new Date().toISOString(),lu:false};
    const sent=await dbM.sendMessage(msg).catch(()=>null);
    if(sent){
      setMessages(m=>[...m,sent]);
      isAtBottomRef.current=true; // après envoi on force le scroll en bas
    }
    setTexte("");
    setSending(false);
    setTimeout(()=>textareaRef.current?.focus(),50);
  };

  const couleur=couleurPseudo(autrePseudo);

  // Grouper les messages par date
  const groupes=[];
  let dernierJour="";
  for(const m of messages){
    const jour=new Date(m.date).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"});
    if(jour!==dernierJour){groupes.push({type:"date",label:jour});dernierJour=jour;}
    groupes.push({type:"msg",msg:m});
  }

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100dvh",maxHeight:"calc(100vh - 58px)",background:CM.bg}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .msg-bubble{animation:fadeUp .18s ease}
        .send-btn:hover:not(:disabled){filter:brightness(1.15);transform:scale(1.05)}
        .send-btn{transition:all .12s}
        textarea:focus{outline:none}
        textarea{scrollbar-width:none}
        textarea::-webkit-scrollbar{display:none}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:"#161616",borderBottom:`1px solid ${CM.border}`,flexShrink:0,boxShadow:"0 2px 12px rgba(0,0,0,.4)"}}>
        <button onClick={onBack} style={{background:"#2a2a2a",border:"none",color:CM.muted,cursor:"pointer",width:36,height:36,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,transition:"background .15s"}}
          onMouseEnter={e=>e.currentTarget.style.background="#333"}
          onMouseLeave={e=>e.currentTarget.style.background="#2a2a2a"}>←</button>
        <div style={{width:42,height:42,borderRadius:"50%",background:couleur+"22",border:`2px solid ${couleur}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:15,color:couleur,flexShrink:0}}>{initiales(autrePseudo)}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:16,lineHeight:1.2}}>{autrePseudo}</div>
          <div style={{fontSize:11,color:CM.muted}}>Joueur DartPoint 🎯</div>
        </div>
      </div>

      {/* ── MESSAGES ── */}
      <div ref={scrollRef} onScroll={checkAtBottom} style={{flex:1,overflowY:"auto",padding:"16px 12px",display:"flex",flexDirection:"column",justifyContent:"flex-end",minHeight:0,gap:2}}>
        {loading&&<Spinner/>}
        {!loading&&messages.length===0&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,gap:12,opacity:.6}}>
            <div style={{fontSize:52}}>💬</div>
            <p style={{color:CM.muted,fontSize:14,textAlign:"center"}}>Commencez la conversation<br/>avec <b style={{color:couleur}}>{autrePseudo}</b> !</p>
          </div>
        )}
        {!loading&&groupes.map((item,i)=>{
          if(item.type==="date") return(
            <div key={"d"+i} style={{display:"flex",alignItems:"center",gap:10,margin:"12px 0 8px"}}>
              <div style={{flex:1,height:1,background:CM.border}}/>
              <span style={{fontSize:11,color:CM.muted,fontWeight:500,whiteSpace:"nowrap",padding:"3px 10px",background:"#1e1e1e",borderRadius:20,border:`1px solid ${CM.border}`}}>{item.label}</span>
              <div style={{flex:1,height:1,background:CM.border}}/>
            </div>
          );
          const m=item.msg;
          const estMoi=m.from_id===joueur.id;
          // Regarder si message suivant est du même auteur
          const next=groupes[i+1];
          const nextSameAuthor=next?.type==="msg"&&next.msg.from_id===m.from_id;
          return(
            <div key={m.id} className="msg-bubble" style={{display:"flex",flexDirection:"column",alignItems:estMoi?"flex-end":"flex-start",marginBottom:nextSameAuthor?2:8}}>
              <div style={{
                maxWidth:"78%",padding:"10px 14px",
                borderRadius:estMoi
                  ?(nextSameAuthor?"18px 18px 4px 18px":"18px 4px 18px 18px")
                  :(nextSameAuthor?"18px 18px 18px 4px":"4px 18px 18px 18px"),
                background:estMoi?"linear-gradient(135deg,#f97316,#ea6a10)":"#242424",
                color:estMoi?"#fff":CM.text,
                fontSize:14,lineHeight:1.5,wordBreak:"break-word",
                boxShadow:estMoi?"0 2px 8px rgba(249,115,22,.3)":"0 1px 4px rgba(0,0,0,.3)",
              }}>
                {m.contenu}
              </div>
              {!nextSameAuthor&&<div style={{fontSize:10,color:CM.muted,marginTop:3,marginLeft:estMoi?0:4,marginRight:estMoi?4:0}}>{formatHeure(m.date)}</div>}
            </div>
          );
        })}
        <div ref={endRef}/>
      </div>

      {/* ── SAISIE ── */}
      <div style={{padding:"10px 12px 14px",background:"#161616",borderTop:`1px solid ${CM.border}`,flexShrink:0}}>
        <div style={{display:"flex",gap:8,alignItems:"flex-end",background:"#1e1e1e",borderRadius:24,padding:"6px 6px 6px 16px",border:`1px solid ${CM.border}`}}>
          <textarea
            ref={textareaRef}
            value={texte}
            onChange={e=>{setTexte(e.target.value);e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px";}}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();envoyer();}}}
            placeholder={`Message à ${autrePseudo}…`}
            rows={1}
            style={{flex:1,background:"transparent",border:"none",color:CM.text,fontSize:14,resize:"none",lineHeight:1.5,maxHeight:120,overflowY:"auto",fontFamily:"inherit",padding:"5px 0",minHeight:34}}
          />
          <button
            className="send-btn"
            onClick={envoyer}
            disabled={!texte.trim()||sending}
            style={{
              width:40,height:40,borderRadius:"50%",border:"none",cursor:texte.trim()&&!sending?"pointer":"default",
              background:texte.trim()&&!sending?"linear-gradient(135deg,#f97316,#ea6a10)":"#2a2a2a",
              display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
              color:texte.trim()&&!sending?"#fff":CM.muted,fontSize:16,
            }}>
            {sending?"⏳":"➤"}
          </button>
        </div>
        <div style={{fontSize:10,color:CM.muted,textAlign:"center",marginTop:6,opacity:.5}}>Entrée pour envoyer · Shift+Entrée pour saut de ligne</div>
      </div>
    </div>
  );
};

// ── LISTE DES CONVERSATIONS ───────────────────────────────────────────────────
const ConversationsList=({joueur,onOpen,activeId})=>{
  const [allMsgs,setAllMsgs]=useState([]);
  const [loading,setLoading]=useState(true);
  const pollRef=useRef(null);

  const charger=useCallback(async()=>{
    const msgs=await dbM.getAllMessages(joueur.id).catch(()=>[]);
    setAllMsgs(msgs||[]);
    setLoading(false);
  },[joueur.id]);

  useEffect(()=>{
    charger();
    pollRef.current=setInterval(charger,5000);
    return()=>clearInterval(pollRef.current);
  },[charger]);

  // Group by conversation partner
  const convs=[];
  const seen=new Set();
  for(const m of allMsgs){
    const otherId=m.from_id===joueur.id?m.to_id:m.from_id;
    const otherPseudo=m.from_id===joueur.id?m.to_pseudo:m.from_pseudo;
    if(seen.has(otherId))continue;
    seen.add(otherId);
    const unread=allMsgs.filter(x=>x.from_id===otherId&&x.to_id===joueur.id&&!x.lu).length;
    convs.push({id:otherId,pseudo:otherPseudo,lastMsg:m,unread});
  }

  if(loading)return<Spinner/>;

  return(
    <div>
      {convs.length===0&&(
        <div style={{textAlign:"center",padding:"60px 20px"}}>
          <div style={{fontSize:52,marginBottom:14}}>💬</div>
          <p style={{color:CM.muted,fontSize:15,marginBottom:6,fontWeight:600}}>Aucune conversation</p>
          <p style={{color:CM.muted,fontSize:13}}>Va sur le profil d'un joueur et clique<br/><b style={{color:CM.text}}>💬 Message</b> pour démarrer.</p>
        </div>
      )}
      {convs.map(c=>{
        const couleur=couleurPseudo(c.pseudo);
        const isActive=c.id===activeId;
        const estMoi=c.lastMsg.from_id===joueur.id;
        return(
          <div key={c.id} onClick={()=>onOpen(c.id,c.pseudo)}
            style={{display:"flex",alignItems:"center",gap:14,padding:"14px 18px",cursor:"pointer",background:isActive?CM.accent+"18":"transparent",borderBottom:`1px solid ${CM.border}22`,transition:"background .12s"}}
            onMouseEnter={e=>!isActive&&(e.currentTarget.style.background="#ffffff08")}
            onMouseLeave={e=>!isActive&&(e.currentTarget.style.background="transparent")}>
            {/* Avatar */}
            <div style={{position:"relative",flexShrink:0}}>
              <div style={{width:50,height:50,borderRadius:"50%",background:couleur+"22",border:`2px solid ${couleur}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:17,color:couleur}}>{initiales(c.pseudo)}</div>
              {c.unread>0&&<div style={{position:"absolute",top:-3,right:-3,background:CM.accent,color:"#fff",borderRadius:"50%",width:19,height:19,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,border:`2px solid ${CM.bg}`}}>{c.unread>9?"9+":c.unread}</div>}
            </div>
            {/* Contenu */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{fontWeight:c.unread>0?700:600,fontSize:15,color:CM.text}}>{c.pseudo}</span>
                <span style={{fontSize:11,color:CM.muted,flexShrink:0}}>{formatDate(c.lastMsg.date)}</span>
              </div>
              <div style={{fontSize:13,color:c.unread>0?CM.text:CM.muted,fontWeight:c.unread>0?500:400,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {estMoi&&<span style={{color:CM.muted}}>Vous : </span>}{c.lastMsg.contenu}
              </div>
            </div>
            {c.unread>0&&<div style={{width:8,height:8,borderRadius:"50%",background:CM.accent,flexShrink:0}}/>}
          </div>
        );
      })}
    </div>
  );
};

// ── PAGE MESSAGERIE ───────────────────────────────────────────────────────────
export const MessagesPage=({joueur,setPage,targetId=null,targetPseudo=null})=>{
  const [convId,setConvId]=useState(targetId);
  const [convPseudo,setConvPseudo]=useState(targetPseudo);

  useEffect(()=>{
    if(targetId)setConvId(targetId);
    if(targetPseudo)setConvPseudo(targetPseudo);
  },[targetId,targetPseudo]);

  if(!joueur){
    return(
      <div style={{maxWidth:500,margin:"0 auto",padding:"60px 20px",textAlign:"center"}}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{fontSize:52,marginBottom:14}}>🔒</div>
        <p style={{color:CM.muted,fontSize:15,marginBottom:20}}>Connecte-toi pour accéder à ta messagerie.</p>
        <button onClick={()=>setPage("connexion")} style={{background:CM.accent,color:"#fff",border:"none",cursor:"pointer",padding:"12px 28px",borderRadius:10,fontSize:14,fontWeight:700}}>Se connecter</button>
      </div>
    );
  }

  if(convId){
    return(
      <ConversationView
        joueur={joueur}
        autreId={convId}
        autrePseudo={convPseudo||"Joueur"}
        onBack={()=>{setConvId(null);setConvPseudo(null);}}
      />
    );
  }

  return(
    <div style={{maxWidth:700,margin:"0 auto",background:CM.bg,minHeight:"calc(100vh - 58px)",display:"flex",flexDirection:"column"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Header liste */}
      <div style={{padding:"20px 18px 14px",borderBottom:`1px solid ${CM.border}`,background:"#161616"}}>
        <h1 style={{fontWeight:800,fontSize:22,marginBottom:4}}>💬 Messages</h1>
        <p style={{fontSize:13,color:CM.muted}}>Tes conversations avec d'autres joueurs</p>
      </div>
      <div style={{flex:1,overflowY:"auto"}}>
        <ConversationsList joueur={joueur} onOpen={(id,pseudo)=>{setConvId(id);setConvPseudo(pseudo);}} activeId={convId}/>
      </div>
    </div>
  );
};

// ── BOUTON ENVOYER UN MESSAGE (utilisé dans FicheJoueur) ──────────────────────
export const BoutonMessage=({joueur,cible,setPage})=>{
  if(!joueur||joueur.id===cible.id)return null;
  return(
    <button
      onClick={()=>setPage("messages-"+cible.id+"|"+encodeURIComponent(cible.pseudo))}
      style={{background:"#60a5fa22",color:"#60a5fa",border:"1px solid #60a5fa44",cursor:"pointer",padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
      💬 Message
    </button>
  );
};
