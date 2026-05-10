import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Connexion, MonProfil, PageJoueurs, FicheJoueur,
  PageProfilStats, PageProfilAmis, PageProfilBadges, PageProfilHistorique,
  PresenceSection, MembresBarSection,
  PageDrix, DrixBadge, HistoriqueDrix,
  AmiSection,
  appliquerDrixDuel, getDrixTitre, calculerDrix,
  dbJoueurs, todayStr, hashPwd,
  ALL_BADGES, computeBadgeValues, getBadgesStored, storeBadgesSet,
} from "./AppJoueurs";
import { Scoreur } from "./AppJeux";
import { ConfigCricket } from "./AppCricket";
import { JeuCapital } from "./AppJeuDecalePoint";
import { TournoiPotesPage, TournoiPotesDetail, ScoreurPotesWrapper } from "./AppTournoiPotes";
import { EntrainementFinish } from "./AppEntrainementFinish";
import { RushMode } from "./AppRushMode";
import { MessagesPage, dbM } from "./AppMessages";
// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sb = async (path, opts = {}) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}`, "Content-Type": "application/json", "Prefer": opts.prefer || "return=representation", ...opts.headers },
    ...opts,
  });
  if (!res.ok) { const e = await res.text(); throw new Error(e); }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};
const db = {
  getBars: () => sb("bars?order=nom.asc&select=*"),
  getBar: (slug) => sb(`bars?slug=eq.${encodeURIComponent(slug)}&select=*`).then(r => r?.[0]),
  addBar: (d) => sb("bars", { method:"POST", body:JSON.stringify(d) }),
  updateBar: (slug, d) => sb(`bars?slug=eq.${encodeURIComponent(slug)}`, { method:"PATCH", body:JSON.stringify(d), prefer:"return=minimal" }),
  deleteBar: (slug) => sb(`bars?slug=eq.${encodeURIComponent(slug)}`, { method:"DELETE", prefer:"return=minimal" }),
  updateBarVues: (slug, v) => sb(`bars?slug=eq.${encodeURIComponent(slug)}`, { method:"PATCH", body:JSON.stringify({ vues:v+1 }), prefer:"return=minimal" }).catch(()=>{}),
  toggleVerifie: (slug, v) => sb(`bars?slug=eq.${encodeURIComponent(slug)}`, { method:"PATCH", body:JSON.stringify({ verifie:v }), prefer:"return=minimal" }),
  getAssociations: () => sb("associations?order=nom.asc&select=*"),
  addAssociation: (d) => sb("associations", { method:"POST", body:JSON.stringify(d) }),
  updateAssociation: (slug, d) => sb(`associations?slug=eq.${encodeURIComponent(slug)}`, { method:"PATCH", body:JSON.stringify(d), prefer:"return=minimal" }),
  deleteAssociation: (slug) => sb(`associations?slug=eq.${encodeURIComponent(slug)}`, { method:"DELETE", prefer:"return=minimal" }),
  getTournois: () => sb("tournois?order=date.asc&select=*"),
  addTournoi: (d) => sb("tournois", { method:"POST", body:JSON.stringify(d) }),
  updateTournoi: (slug, d) => sb(`tournois?slug=eq.${encodeURIComponent(slug)}`, { method:"PATCH", body:JSON.stringify(d), prefer:"return=minimal" }),
  deleteTournoi: (slug) => sb(`tournois?slug=eq.${encodeURIComponent(slug)}`, { method:"DELETE", prefer:"return=minimal" }),
  getInscrits: (slug) => sb(`tournoi_inscriptions?tournoi_slug=eq.${encodeURIComponent(slug)}&order=date.asc&select=*`),
  addInscription: (d) => sb("tournoi_inscriptions", { method:"POST", body:JSON.stringify(d) }),
  deleteInscription: (tournoi_slug, joueur_id) => sb(`tournoi_inscriptions?tournoi_slug=eq.${encodeURIComponent(tournoi_slug)}&joueur_id=eq.${joueur_id}`, { method:"DELETE", prefer:"return=minimal" }),
  getPropositions: () => sb("propositions?order=date.desc&select=*"),
  addProposition: (d) => sb("propositions", { method:"POST", body:JSON.stringify(d) }),
  updateProposition: (id, d) => sb(`propositions?id=eq.${id}`, { method:"PATCH", body:JSON.stringify(d), prefer:"return=minimal" }),
  getAvis: (slug) => sb(`avis?bar_slug=eq.${encodeURIComponent(slug)}&order=date.desc&select=*`),
  addAvis: (d) => sb("avis", { method:"POST", body:JSON.stringify(d) }),
  updateAvis: (id, d) => sb(`avis?id=eq.${id}`, { method:"PATCH", body:JSON.stringify(d), prefer:"return=minimal" }),
  deleteAvis: (id) => sb(`avis?id=eq.${id}`, { method:"DELETE", prefer:"return=minimal" }),
  getReactions: (slug) => sb(`reactions?bar_slug=eq.${encodeURIComponent(slug)}&select=*`).then(r => r?.[0]),
  getSignalements: () => sb("signalements?order=date.desc&select=*"),
  addSignalement: (d) => sb("signalements", { method:"POST", body:JSON.stringify(d) }),
  updateSignalement: (id, d) => sb(`signalements?id=eq.${id}`, { method:"PATCH", body:JSON.stringify(d), prefer:"return=minimal" }),
  getPhotos: (slug) => sb(`photos?bar_slug=eq.${encodeURIComponent(slug)}&order=date.desc&select=*`),
  addPhoto: (d) => sb("photos", { method:"POST", body:JSON.stringify(d) }),
  deletePhoto: (id) => sb(`photos?id=eq.${id}`, { method:"DELETE", prefer:"return=minimal" }),
  getPhotosAsso: (slug) => sb(`photos_associations?asso_slug=eq.${encodeURIComponent(slug)}&order=date.desc&select=*`),
  addPhotoAsso: (d) => sb("photos_associations", { method:"POST", body:JSON.stringify(d) }),
  deletePhotoAsso: (id) => sb(`photos_associations?id=eq.${id}`, { method:"DELETE", prefer:"return=minimal" }),
};

// ── CONSTANTES ────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "dartpoint2025";
const slugify = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");

const TYPES = [
  { v:"electronique", l:"⚡ Électronique", color:"#f97316" },
  { v:"traditionnel", l:"🎯 Traditionnel", color:"#60a5fa" },
  { v:"trad-auto", l:"🎯📊 Trad. auto-scoring", color:"#34d399" },
  { v:"les deux", l:"🎯⚡ Plusieurs types", color:"#a78bfa" },
];
const typeInfo = (v) => TYPES.find(t=>t.v===v) || TYPES[0];

const REACTIONS_LIST = [
  { id:"ambiance", emoji:"🎉", label:"Bonne ambiance" },
  { id:"equipement", emoji:"🎯", label:"Bon équipement" },
  { id:"accueil", emoji:"😊", label:"Accueil sympa" },
  { id:"accessibilite", emoji:"📍", label:"Facile d'accès" },
  { id:"soirees", emoji:"🏆", label:"Soirées régulières" },
  { id:"debutants", emoji:"🌱", label:"Idéal débutants" },
];

const VILLES_FR = {
  "paris":[48.8566,2.3522],"lyon":[45.7640,4.8357],"marseille":[43.2965,5.3698],"toulouse":[43.6047,1.4442],"nice":[43.7102,7.2620],"nantes":[47.2184,-1.5536],"bordeaux":[44.8378,-0.5792],"lille":[50.6292,3.0573],"strasbourg":[48.5734,7.7521],"rennes":[48.1173,-1.6778],"grenoble":[45.1885,5.7245],"montpellier":[43.6108,3.8767],"dijon":[47.3220,5.0415],"pau":[43.2951,-0.3708],"bayonne":[43.4929,-1.4748],"biarritz":[43.4832,-1.5586],"anglet":[43.4938,-1.5339],"hendaye":[43.3694,-1.7800],"saint-jean-de-luz":[43.3877,-1.6614],"cambo-les-bains":[43.3567,-1.3978],"nevers":[46.9897,3.1572],"mont-de-marsan":[43.8897,-0.5025],"dax":[43.7099,-1.0520],"reims":[49.2583,4.0317],"rouen":[49.4432,1.0993],"caen":[49.1829,-0.3707],"metz":[49.1193,6.1757],"nancy":[48.6921,6.1844],"perpignan":[42.6987,2.8956],"angers":[47.4784,-0.5632],"brest":[48.3904,-4.8861],"toulon":[43.1242,5.9280],"aix-en-provence":[43.5297,5.4474],"avignon":[43.9493,4.8055],"poitiers":[46.5802,0.3404],"la rochelle":[46.1591,-1.1520],"annecy":[45.8992,6.1294],"valence":[44.9334,4.8924],
};

const C = {
  bg:"#0f0f0f", card:"#1a1a1a", border:"#2a2a2a",
  accent:"#f97316", text:"#f1f5f9", muted:"#94a3b8",
  green:"#22c55e", red:"#ef4444", yellow:"#f59e0b", purple:"#a78bfa", blue:"#60a5fa",
};

// ── LEAFLET ───────────────────────────────────────────────────────────────────
function LeafletMap({ bars=[], associations=[], tournois=[], onBarClick, onAssoClick, onTournoiClick, centerSlug=null, centerVille=null, height=400, barsActifs=[], userPos=null }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const [ready, setReady] = useState(!!window.L);

  useEffect(() => {
    if (window.L) { setReady(true); return; }
    const css = document.createElement("link"); css.rel="stylesheet"; css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.appendChild(css);
    const js = document.createElement("script"); js.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; js.onload=()=>setReady(true); document.head.appendChild(js);
  }, []);

  useEffect(() => {
    if (!ready || !divRef.current || mapRef.current) return;
    const map = window.L.map(divRef.current, { scrollWheelZoom:false }).setView([43.47,-1.52], 9);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:"© OpenStreetMap", maxZoom:19 }).addTo(map);
    mapRef.current = map;
  }, [ready]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = window.L; const map = mapRef.current;
    markersRef.current.forEach(m => m.remove()); markersRef.current = [];
    const mkIcon = (emoji, bg, size=30, badge=false) => L.divIcon({ className:"", html:`<div style="width:${size}px;height:${size}px;background:${bg};border:3px solid rgba(255,255,255,0.4);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${size*0.5}px;box-shadow:0 2px 8px rgba(0,0,0,0.5);cursor:pointer;position:relative">${emoji}${badge?`<span style="position:absolute;top:-4px;right:-4px;background:#22c55e;border-radius:50%;width:12px;height:12px;border:2px solid #0f0f0f"></span>`:""}</div>`, iconSize:[size,size], iconAnchor:[size/2,size/2] });
    const popup = (html) => `<div style="font-family:Inter,sans-serif;min-width:160px;color:#111111;background:#ffffff">${html}</div>`;
    bars.forEach(bar => {
      if (!bar.lat || !bar.lng) return;
      const isHL = bar.slug===centerSlug; const isActif = barsActifs.includes(bar.slug);
      const m = L.marker([bar.lat,bar.lng], { icon:mkIcon("🍺", isHL?"#fff":C.accent, isHL?40:32, isActif) }).addTo(map);
      m.bindPopup(popup(`<strong>${bar.nom}</strong><br><span style="color:#555;font-size:12px">📍 ${bar.ville}</span>${isActif?'<br><span style="color:#16a34a;font-size:11px">🟢 Joueurs ce soir</span>':""}<br><button style="margin-top:8px;background:#f97316;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;font-weight:600" onclick="window.__dpBar('${bar.slug}')">Voir →</button>`));
      markersRef.current.push(m);
    });
    associations.forEach(asso => {
      if (!asso.lat || !asso.lng) return;
      const m = L.marker([asso.lat,asso.lng], { icon:mkIcon("👥","#7c3aed", asso.slug===centerSlug?38:28) }).addTo(map);
      m.bindPopup(popup(`<strong>${asso.nom}</strong><br><span style="color:#555;font-size:12px">📍 ${asso.ville}</span>${onAssoClick?`<br><button style="margin-top:8px;background:#7c3aed;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;font-weight:600" onclick="window.__dpAsso('${asso.slug}')">Voir →</button>`:""}`));
      markersRef.current.push(m);
    });
    tournois.forEach(t => {
      if (!t.lat || !t.lng) return;
      const m = L.marker([t.lat,t.lng], { icon:mkIcon("🏆",C.yellow,30) }).addTo(map);
      m.bindPopup(popup(`<strong>${t.nom}</strong><br><span style="color:#555;font-size:12px">📍 ${t.ville}</span>${onTournoiClick?`<br><button style="margin-top:8px;background:#f59e0b;color:#fff;border:none;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;font-weight:600" onclick="window.__dpTournoi('${t.slug}')">Voir →</button>`:""}`));
      markersRef.current.push(m);
    });
    if (centerSlug) { const all=[...bars,...associations,...tournois].find(x=>x.slug===centerSlug); if(all?.lat) map.flyTo([all.lat,all.lng],15,{duration:0.8}); }
    window.__dpBar = s => onBarClick && onBarClick(s);
    window.__dpAsso = s => onAssoClick && onAssoClick(s);
    window.__dpTournoi = s => onTournoiClick && onTournoiClick(s);
  }, [ready, bars, associations, tournois, centerSlug, barsActifs]);

  useEffect(() => {
    if (!ready || !mapRef.current || !centerVille || centerVille.trim().length < 2) return;
    const L = window.L; const map = mapRef.current;
    const timer = setTimeout(() => {
      map.invalidateSize();
      const q = centerVille.toLowerCase().trim();
      const all = [...bars,...associations,...tournois].filter(x=>x.lat&&x.lng&&x.ville?.toLowerCase().includes(q));
      if (all.length===1) { map.flyTo([all[0].lat,all[0].lng],14,{duration:0.8}); return; }
      if (all.length>1) { map.flyToBounds(window.L.latLngBounds(all.map(x=>[x.lat,x.lng])),{padding:[60,60],duration:0.8,maxZoom:14}); return; }
      const found = Object.entries(VILLES_FR).find(([k])=>k.includes(q)||q.includes(k));
      if (found) map.flyTo(found[1],13,{duration:0.8});
    }, 400);
    return () => clearTimeout(timer);
  }, [ready, centerVille, bars, associations, tournois]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const L = window.L; const map = mapRef.current;
    if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current=null; }
    if (!userPos) return;
    const icon = L.divIcon({ className:"", html:`<div style="width:22px;height:22px;background:#60a5fa;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.5);position:relative"><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:8px;height:8px;background:#fff;border-radius:50%"></div></div>`, iconSize:[22,22], iconAnchor:[11,11] });
    const m = L.marker([userPos.lat,userPos.lng],{icon,zIndexOffset:1000}).addTo(map);
    m.bindPopup(`<div style="font-family:Inter,sans-serif;color:#111;font-size:12px;font-weight:600">📍 Vous êtes ici</div>`);
    userMarkerRef.current = m;
    map.flyTo([userPos.lat,userPos.lng],13,{duration:0.8});
  }, [ready, userPos]);

  useEffect(() => { if (mapRef.current) setTimeout(()=>mapRef.current.invalidateSize(),100); });

  return (
    <div style={{ position:"relative", height, borderRadius:12, overflow:"hidden", border:`1px solid ${C.border}` }}>
      {!ready && <div style={{ position:"absolute",inset:0,background:"#1a1f2e",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,zIndex:10 }}><span style={{ fontSize:36 }}>🗺️</span><span style={{ color:C.muted,fontSize:14 }}>Chargement de la carte…</span></div>}
      <div ref={divRef} style={{ width:"100%", height:"100%" }} />
    </div>
  );
}

// ── UI DE BASE ────────────────────────────────────────────────────────────────
const Badge = ({ children, color=C.accent }) => <span style={{ background:color+"22",color,border:`1px solid ${color}44`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:600,whiteSpace:"nowrap" }}>{children}</span>;

const Btn = ({ children, onClick, variant="primary", style={}, disabled=false }) => {
  const variants = {
    primary:{ background:C.accent, color:"#fff", border:"none" },
    ghost:{ background:"transparent", color:C.accent, border:`1px solid ${C.accent}` },
    dark:{ background:C.card, color:C.text, border:`1px solid ${C.border}` },
    danger:{ background:"#7f1d1d", color:C.red, border:`1px solid ${C.red}44` },
    success:{ background:"#14532d", color:C.green, border:`1px solid ${C.green}44` },
    yellow:{ background:"#78350f", color:C.yellow, border:`1px solid ${C.yellow}44` },
  };
  return <button onClick={disabled?undefined:onClick} style={{ cursor:disabled?"not-allowed":"pointer",borderRadius:8,fontWeight:600,fontSize:14,padding:"10px 20px",transition:"all .15s",opacity:disabled?.5:1,...variants[variant],...style }}>{children}</button>;
};

const Field = ({ label, value, onChange, placeholder, type="text", as="input", options }) => (
  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
    {label && <label style={{ fontSize:13, fontWeight:500, color:C.muted }}>{label}</label>}
    {as==="select"
      ? <select value={value} onChange={e=>onChange(e.target.value)} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14 }}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>
      : as==="textarea"
      ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={4} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14,resize:"vertical" }}/>
      : <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 14px",color:C.text,fontSize:14 }}/>}
  </div>
);

const Spinner = () => <div style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:40 }}><div style={{ width:32,height:32,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/></div>;

// ── NAV ───────────────────────────────────────────────────────────────────────
const Nav = ({ page, setPage, isAdmin, joueur, setJoueur, defisCount, demandesAmisCount=0, unreadMessages, onBack, canGoBack }) => {
  const [open, setOpen] = useState(false);
  const links = [["bars","🎯 Bars"],["associations","🫂 Associations"],["tournois","🏅 Tournois"],["joueurs","👥 Joueurs"],["drix","💎 Classement DRIX"],["scoreur","🎯 Scoreur"],["jeux","🎮 Jeux"],["proposer","➕ Proposer un bar"],["proposer-asso","🫂 Proposer une asso"],["proposer-tournoi","🏅 Proposer un tournoi"],["apropos","ℹ️ À propos"],["contact","✉️ Contact"]];
  const navBtnStyle = { background:"none",border:"1px solid #2a2a2a",color:"#94a3b8",cursor:"pointer",borderRadius:8,padding:"4px 10px",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:4,touchAction:"manipulation",transition:"all .15s",whiteSpace:"nowrap" };
  return (
    <nav style={{ background:"#111",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:200 }}>
      <div style={{ maxWidth:1100,margin:"0 auto",padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between",height:58 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
          <div onClick={()=>{setPage("home");setOpen(false);}} style={{ cursor:"pointer",display:"flex",alignItems:"center",flexShrink:0 }}>
            <img src="/logo dart point/logo bandeau.png" alt="DartPoint" style={{ height:44,objectFit:"contain",filter:"drop-shadow(0 2px 8px rgba(0,0,0,0.5))" }}/>
          </div>
          <button onClick={()=>{setPage("home");setOpen(false);}} style={{ ...navBtnStyle,color:"#f97316",borderColor:"#f9731633" }}
            onMouseEnter={e=>{e.currentTarget.style.background="#f9731611";e.currentTarget.style.borderColor="#f97316";}}
            onMouseLeave={e=>{e.currentTarget.style.background="none";e.currentTarget.style.borderColor="#f9731633";}}>
            🏠 Accueil
          </button>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center" }}>
          {joueur && (
            <button onClick={()=>{setPage("messagerie");setOpen(false);}} style={{ background:"#1a1a1a",color:"#60a5fa",border:`1px solid #60a5fa44`,cursor:"pointer",padding:"5px 10px",borderRadius:8,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6 }}>
              💬
              {unreadMessages>0 && <span style={{ background:"#60a5fa",color:"#fff",borderRadius:"50%",width:16,height:16,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800 }}>{unreadMessages>9?"9+":unreadMessages}</span>}
            </button>
          )}
          {joueur && (
            <button onClick={()=>{setPage("mon-profil");setOpen(false);}} style={{ background:"#1a1a1a",color:C.text,border:`1px solid ${C.border}`,cursor:"pointer",padding:"5px 10px",borderRadius:8,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:6,position:"relative" }}>
              👤 {joueur.pseudo}
              {defisCount>0 && <span style={{ background:C.red,color:"#fff",borderRadius:"50%",width:16,height:16,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800 }}>{defisCount}</span>}
              {demandesAmisCount>0 && <span style={{ background:"#10b981",color:"#fff",borderRadius:"50%",width:16,height:16,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800 }}>{demandesAmisCount>9?"9+":demandesAmisCount}</span>}
            </button>
          )}
          {!joueur && <button onClick={()=>{setPage("connexion");setOpen(false);}} style={{ background:C.accent,color:"#fff",border:"none",cursor:"pointer",padding:"5px 12px",borderRadius:8,fontSize:12,fontWeight:600 }}>Connexion</button>}
          {isAdmin && <button onClick={()=>{setPage("admin");setOpen(false);}} style={{ background:"#451a03",color:C.yellow,border:`1px solid #78350f`,cursor:"pointer",padding:"5px 10px",borderRadius:8,fontSize:12,fontWeight:600 }}>⚙️ Admin</button>}
          <button onClick={()=>setOpen(!open)} style={{ background:"none",border:`1px solid ${C.border}`,color:C.text,cursor:"pointer",fontSize:18,padding:"6px 10px",borderRadius:8 }}>{open?"✕":"☰"}</button>
        </div>
      </div>
      {open && (
  <div style={{ background:"#111",borderTop:`1px solid ${C.border}`,padding:"12px 16px 20px" }}>
    {[
      ["🗺️ Découvrir", [["bars","🎯 Bars"],["associations","🫂 Associations"],["tournois","🏅 Tournois"]]],
      ["👥 Communauté", [["joueurs","👥 Joueurs"],["drix","💎 Classement DRIX"],["messagerie","💬 Messages"]]],
      ["🎯 Jouer", [["scoreur","🎯 Scoreur"],["jeux","🎮 Jeux"],["tournois-potes","🍺 Tournoi entre potes"]]],
      ["➕ Proposer", [["proposer","➕ Proposer un bar"],["proposer-asso","🫂 Proposer une asso"],["proposer-tournoi","🏅 Proposer un tournoi"]]],
      ["ℹ️ Infos", [["apropos","ℹ️ À propos"],["contact","✉️ Contact"]]],
    ].map(([titre, items]) => (
      <div key={titre} style={{ marginBottom:14 }}>
        <div style={{ fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6,paddingLeft:2 }}>{titre}</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:5 }}>
          {items.map(([p,l]) => (
            <button key={p} onClick={()=>{setPage(p);setOpen(false);}} style={{ background:page===p?C.accent+"22":"#1a1a1a",color:page===p?C.accent:C.text,border:`1px solid ${page===p?C.accent:C.border}`,cursor:"pointer",padding:"9px 12px",borderRadius:8,fontSize:13,fontWeight:500,textAlign:"left",display:"flex",alignItems:"center",gap:6 }}>
              {l}
              {p==="messagerie"&&unreadMessages>0&&<span style={{ background:"#60a5fa",color:"#fff",borderRadius:"50%",minWidth:16,height:16,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,padding:"0 2px" }}>{unreadMessages>9?"9+":unreadMessages}</span>}
            </button>
          ))}
        </div>
      </div>
    ))}
    <div style={{ borderTop:`1px solid ${C.border}`,paddingTop:12,marginTop:4 }}>
      <div style={{ fontSize:10,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:6,paddingLeft:2 }}>🔒 Compte</div>
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:5 }}>
        {joueur
          ? <button onClick={()=>{setJoueur(null);localStorage.removeItem("dp_joueur");setOpen(false);setPage("home");}} style={{ background:"#1a1a1a",color:C.red,border:`1px solid ${C.border}`,cursor:"pointer",padding:"9px 12px",borderRadius:8,fontSize:13,textAlign:"left" }}>🚪 Déconnexion</button>
          : <button onClick={()=>{setPage("connexion");setOpen(false);}} style={{ background:"#1a1a1a",color:C.muted,border:`1px solid ${C.border}`,cursor:"pointer",padding:"9px 12px",borderRadius:8,fontSize:13,textAlign:"left" }}>🔑 Connexion</button>
        }
        <button onClick={()=>{setPage("adminlogin");setOpen(false);}} style={{ background:"#1a1a1a",color:C.muted,border:`1px solid ${C.border}`,cursor:"pointer",padding:"9px 12px",borderRadius:8,fontSize:13,textAlign:"left" }}>🔐 Admin</button>
      </div>
    </div>
  </div>
)}
    </nav>
  );
}; 

// ── HAVERSINE ─────────────────────────────────────────────────────────────────
const haversine = (lat1,lon1,lat2,lon2) => {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

// ── BAR CARD ──────────────────────────────────────────────────────────────────
const BarCard = ({ bar, onClick, barsActifs=[], dist }) => {
  const ti = typeInfo(bar.type); const isActif = barsActifs.includes(bar.slug);
  return (
    <div onClick={onClick}
      style={{ background:C.card, border:`1px solid ${isActif?C.green:C.border}`, borderRadius:14, padding:"13px 16px", cursor:"pointer", display:"flex", alignItems:"center", gap:14, transition:"all .15s" }}
      onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.background="#1f1f1f"; }}
      onMouseLeave={e=>{ e.currentTarget.style.borderColor=isActif?C.green:C.border; e.currentTarget.style.background=C.card; }}>
      {/* Icône type */}
      <div style={{ width:46,height:46,borderRadius:12,background:ti.color+"18",border:`1px solid ${ti.color}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>🍺</div>
      {/* Infos */}
      <div style={{ flex:1,minWidth:0 }}>
        <div style={{ display:"flex",alignItems:"center",gap:7,flexWrap:"wrap",marginBottom:3 }}>
          <span style={{ fontWeight:700,fontSize:15,color:C.text }}>{bar.nom}</span>
          {bar.verifie&&<span style={{ color:C.green,fontSize:11 }}>✅</span>}
          {isActif&&<span style={{ background:C.green+"22",color:C.green,fontSize:10,padding:"1px 8px",borderRadius:20,fontWeight:700 }}>🟢 Ce soir</span>}
        </div>
        <div style={{ color:C.muted,fontSize:12,marginBottom:6 }}>
          {bar.ville}{bar.adresse?` · ${bar.adresse}`:""}
        </div>
        <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
          <span style={{ background:"#a78bfa18",color:"#a78bfa",border:"1px solid #a78bfa33",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600 }}>🎯 {bar.cibles} cible{bar.cibles>1?"s":""}</span>
          {bar.tournois&&<span style={{ background:C.green+"18",color:C.green,border:`1px solid ${C.green}33`,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600 }}>🏆 Tournois</span>}
          {bar.association&&<span style={{ background:"#7c3aed18",color:"#a78bfa",border:"1px solid #7c3aed33",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600 }}>👥 Asso</span>}
          <span style={{ background:ti.color+"18",color:ti.color,border:`1px solid ${ti.color}33`,fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600 }}>{ti.l}</span>
        </div>
      </div>
      {/* Distance + CTA */}
      <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:7,flexShrink:0 }}>
        {dist!=null&&<span style={{ color:"#60a5fa",fontWeight:700,fontSize:14,lineHeight:1 }}>{dist<1?(dist*1000).toFixed(0)+" m":dist.toFixed(1)+" km"}</span>}
        <span style={{ background:C.accent,color:"#fff",padding:"6px 13px",borderRadius:8,fontSize:12,fontWeight:700,letterSpacing:.3 }}>Voir →</span>
      </div>
    </div>
  );
};

// ── GALERIE ───────────────────────────────────────────────────────────────────
const GalerieSection = ({ slug, type="bar", isAdmin }) => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [pseudo, setPseudo] = useState("");
  const fileRef = useRef(null);
  const getPhotos = type==="bar" ? ()=>db.getPhotos(slug) : ()=>db.getPhotosAsso(slug);
  const addPhoto = type==="bar" ? d=>db.addPhoto({...d,bar_slug:slug}) : d=>db.addPhotoAsso({...d,asso_slug:slug});
  const deletePhoto = type==="bar" ? db.deletePhoto : db.deletePhotoAsso;
  const MAX_PHOTOS = 6;
  useEffect(()=>{ getPhotos().then(p=>{setPhotos(p||[]);setLoading(false);}).catch(()=>setLoading(false)); },[slug]);
  const handleFile = async (e) => {
    const files = Array.from(e.target.files); if (!files.length) return;
    const remaining = MAX_PHOTOS - photos.length; if (remaining<=0) return;
    setUploading(true);
    for (const file of files.slice(0,remaining)) {
      await new Promise(res=>{
        const reader = new FileReader();
        reader.onload = async ev => {
          const img = new Image();
          img.onload = async () => {
            const MAX=900; let w=img.width,h=img.height; if(w>MAX){h=Math.round(h*MAX/w);w=MAX;}
            const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h; canvas.getContext("2d").drawImage(img,0,0,w,h);
            try { const r=await addPhoto({pseudo:pseudo.trim()||"Anonyme",data:canvas.toDataURL("image/jpeg",0.7),date:Date.now()}); if(r?.[0]) setPhotos(p=>[r[0],...p]); } catch{}
            res();
          }; img.src=ev.target.result;
        }; reader.readAsDataURL(file);
      });
    }
    setUploading(false); e.target.value="";
  };
  return (
    <div style={{ marginBottom:24 }}>
      <h3 style={{ fontWeight:700,fontSize:16,marginBottom:14,color:C.accent }}>📸 Photos de la communauté</h3>
      {lightbox!==null&&(
        <div onClick={()=>setLightbox(null)} style={{ position:"fixed",inset:0,background:"#000d",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out" }}>
          <div style={{ position:"relative",maxWidth:"90vw" }}>
            <img src={photos[lightbox]?.data} alt="" style={{ maxWidth:"90vw",maxHeight:"85vh",borderRadius:10,objectFit:"contain" }}/>
            <div style={{ textAlign:"center",color:"#aaa",fontSize:12,marginTop:8 }}>📷 {photos[lightbox]?.pseudo}</div>
            {photos.length>1&&<>
              <button onClick={e=>{e.stopPropagation();setLightbox((lightbox-1+photos.length)%photos.length);}} style={{ position:"absolute",left:-44,top:"50%",transform:"translateY(-50%)",background:"#fff2",border:"none",color:"#fff",fontSize:24,cursor:"pointer",borderRadius:6,padding:"4px 10px" }}>‹</button>
              <button onClick={e=>{e.stopPropagation();setLightbox((lightbox+1)%photos.length);}} style={{ position:"absolute",right:-44,top:"50%",transform:"translateY(-50%)",background:"#fff2",border:"none",color:"#fff",fontSize:24,cursor:"pointer",borderRadius:6,padding:"4px 10px" }}>›</button>
            </>}
          </div>
        </div>
      )}
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:14 }}>
        <p style={{ fontSize:13,color:C.muted,marginBottom:10 }}>Partagez vos photos ({photos.length}/{MAX_PHOTOS})</p>
        <div style={{ display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
          <input value={pseudo} onChange={e=>setPseudo(e.target.value)} placeholder="Votre pseudo" style={{ flex:1,minWidth:130,background:"#111",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:13 }}/>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:"none" }} onChange={handleFile}/>
          <Btn onClick={()=>fileRef.current?.click()} variant="ghost" style={{ fontSize:13,padding:"8px 16px" }} disabled={uploading||photos.length>=MAX_PHOTOS}>{photos.length>=MAX_PHOTOS?"🚫 Maximum":uploading?"⏳ Envoi…":"📷 Ajouter"}</Btn>
        </div>
      </div>
      {loading?<Spinner/>:photos.length===0
        ?<div style={{ textAlign:"center",padding:"28px",background:C.card,border:`1px dashed ${C.border}`,borderRadius:12 }}><div style={{ fontSize:32,marginBottom:8 }}>📷</div><p style={{ color:C.muted,fontSize:13 }}>Aucune photo pour l'instant.</p></div>
        :<div style={{ columns:"repeat(auto-fill, minmax(140px, 1fr))",gap:10 }}>
          {photos.map((p,i)=>(
            <div key={p.id} style={{ breakInside:"avoid",marginBottom:10,position:"relative",borderRadius:10,overflow:"hidden",cursor:"zoom-in",border:`1px solid ${C.border}` }} onClick={()=>setLightbox(i)}>
              <img src={p.data} alt="" style={{ width:"100%",display:"block" }}/>
              <div style={{ position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,#000a)",padding:"14px 8px 5px",fontSize:11,color:"#ccc" }}>📷 {p.pseudo}</div>
              {isAdmin&&<button onClick={e=>{e.stopPropagation();deletePhoto(p.id);setPhotos(x=>x.filter(y=>y.id!==p.id));}} style={{ position:"absolute",top:5,right:5,background:"#000a",border:"none",color:C.red,cursor:"pointer",borderRadius:5,padding:"2px 6px",fontSize:11 }}>🗑</button>}
            </div>
          ))}
        </div>}
    </div>
  );
};

// ── AVIS ──────────────────────────────────────────────────────────────────────
const AvisSection = ({ barSlug, isAdmin }) => {
  const [avis, setAvis] = useState([]);
  const [reactions, setReactions] = useState({});
  const [form, setForm] = useState({ pseudo:"", texte:"", reactions:[] });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    Promise.all([db.getAvis(barSlug).then(a=>(a||[]).filter(x=>x.valide===true)),db.getReactions(barSlug)])
      .then(([a,r])=>{ setAvis(a); setReactions(r?.counts||{}); setLoading(false); }).catch(()=>setLoading(false));
  },[barSlug]);
  const toggleR = id => setForm(f=>({...f,reactions:f.reactions.includes(id)?f.reactions.filter(r=>r!==id):[...f.reactions,id]}));
  const submit = async () => {
    if (!form.texte.trim() && form.reactions.length===0) return;
    await db.addAvis({ bar_slug:barSlug,pseudo:form.pseudo.trim()||"Anonyme",texte:form.texte.trim(),reactions:form.reactions,date:Date.now(),signale:false,valide:false });
    setForm({pseudo:"",texte:"",reactions:[]}); setSent(true); setTimeout(()=>setSent(false),3000);
  };
  return (
    <div style={{ marginBottom:20 }}>
      <h3 style={{ fontWeight:700,fontSize:16,marginBottom:14,color:C.accent }}>💬 Avis de la communauté</h3>
      {Object.values(reactions).some(v=>v>0)&&(
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:14 }}>
          {REACTIONS_LIST.filter(r=>reactions[r.id]>0).map(r=>(
            <div key={r.id} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 12px",display:"flex",alignItems:"center",gap:6,fontSize:13 }}>
              <span>{r.emoji}</span><span style={{ color:C.muted }}>{r.label}</span>
              <span style={{ background:C.accent+"33",color:C.accent,borderRadius:10,padding:"1px 7px",fontSize:11,fontWeight:700 }}>{reactions[r.id]}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:14 }}>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:10 }}>
          {REACTIONS_LIST.map(r=><button key={r.id} onClick={()=>toggleR(r.id)} style={{ background:form.reactions.includes(r.id)?C.accent+"33":"#111",border:`1px solid ${form.reactions.includes(r.id)?C.accent:C.border}`,borderRadius:20,padding:"5px 11px",cursor:"pointer",fontSize:12,color:form.reactions.includes(r.id)?C.accent:C.muted,display:"flex",alignItems:"center",gap:5 }}>{r.emoji} {r.label}</button>)}
        </div>
        <textarea value={form.texte} onChange={e=>setForm(f=>({...f,texte:e.target.value}))} placeholder="Votre commentaire…" rows={3} style={{ width:"100%",background:"#111",border:`1px solid ${C.border}`,borderRadius:8,padding:"9px 12px",color:C.text,fontSize:13,resize:"vertical",marginBottom:10 }}/>
        <div style={{ display:"flex",gap:10,alignItems:"center",flexWrap:"wrap" }}>
          <input value={form.pseudo} onChange={e=>setForm(f=>({...f,pseudo:e.target.value}))} placeholder="Pseudo (optionnel)" style={{ flex:1,minWidth:130,background:"#111",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:13 }}/>
          <Btn onClick={submit} style={{ fontSize:13,padding:"8px 18px" }} disabled={!form.texte.trim()&&form.reactions.length===0}>{sent?"✅ Envoyé !":"Publier →"}</Btn>
        </div>
        {sent&&<p style={{ color:C.muted,fontSize:12,marginTop:8 }}>Avis en attente de modération.</p>}
      </div>
      {loading?<Spinner/>:avis.length===0?<p style={{ color:C.muted,fontSize:13 }}>Aucun avis pour l'instant.</p>
      :avis.map(a=>(
        <div key={a.id} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:14,marginBottom:10 }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap",gap:6 }}>
            <span style={{ fontWeight:600,fontSize:13 }}>👤 {a.pseudo}</span>
            <span style={{ color:C.muted,fontSize:11 }}>{new Date(a.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})}</span>
          </div>
          {a.reactions?.length>0&&<div style={{ display:"flex",gap:6,flexWrap:"wrap",marginBottom:6 }}>{a.reactions.map(rid=>{const r=REACTIONS_LIST.find(x=>x.id===rid);return r?<span key={rid} style={{ background:C.accent+"22",color:C.accent,borderRadius:20,padding:"2px 9px",fontSize:11 }}>{r.emoji} {r.label}</span>:null;})}</div>}
          {a.texte&&<p style={{ color:"#cbd5e1",fontSize:13,lineHeight:1.6,marginBottom:6 }}>{a.texte}</p>}
          <div style={{ display:"flex",gap:8 }}>
            {!isAdmin&&<button onClick={()=>{db.updateAvis(a.id,{signale:true});}} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:11,padding:0 }}>⚠️ Signaler</button>}
            {isAdmin&&<button onClick={()=>{db.deleteAvis(a.id);setAvis(x=>x.filter(y=>y.id!==a.id));}} style={{ background:"none",border:`1px solid ${C.red}44`,borderRadius:6,color:C.red,cursor:"pointer",fontSize:11,padding:"2px 8px" }}>🗑</button>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── AVIS ADMIN ────────────────────────────────────────────────────────────────
const AvisAdminSection = () => {
  const [avis, setAvis] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    fetch(`${SB_URL}/rest/v1/avis?valide=eq.false&order=date.desc&select=*`,{ headers:{ "apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}` } })
      .then(r=>r.json()).then(a=>{ setAvis(a||[]); setLoading(false); }).catch(()=>setLoading(false));
  },[]);
  const valider = async (id) => {
    await fetch(`${SB_URL}/rest/v1/avis?id=eq.${id}`,{ method:"PATCH",headers:{ "apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`,"Content-Type":"application/json","Prefer":"return=minimal" },body:JSON.stringify({valide:true}) });
    setAvis(x=>x.filter(y=>y.id!==id));
  };
  return (
    <div>
      <h3 style={{ fontWeight:700,fontSize:16,marginBottom:14,color:C.yellow }}>💬 Avis en attente ({avis.length})</h3>
      {loading?<Spinner/>:avis.length===0?<p style={{ color:C.muted,textAlign:"center",padding:30 }}>✅ Aucun avis en attente.</p>
      :avis.map(a=>(
        <div key={a.id} style={{ background:C.card,border:`1px solid ${C.yellow}33`,borderRadius:10,padding:14,marginBottom:10 }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6,flexWrap:"wrap" }}>
            <span style={{ fontWeight:600,fontSize:13 }}>👤 {a.pseudo} — <span style={{ color:C.muted,fontSize:11 }}>{a.bar_slug}</span></span>
            <span style={{ color:C.muted,fontSize:11 }}>{new Date(a.date).toLocaleDateString("fr-FR")}</span>
          </div>
          {a.texte&&<p style={{ color:"#cbd5e1",fontSize:13,background:"#111",padding:"8px 12px",borderRadius:8,marginBottom:8 }}>{a.texte}</p>}
          <div style={{ display:"flex",gap:8 }}>
            <Btn variant="success" onClick={()=>valider(a.id)} style={{ fontSize:12,padding:"6px 14px" }}>✅ Valider</Btn>
            <Btn variant="danger" onClick={()=>{db.deleteAvis(a.id);setAvis(x=>x.filter(y=>y.id!==a.id));}} style={{ fontSize:12,padding:"6px 14px" }}>🗑 Supprimer</Btn>
          </div>
        </div>
      ))}
    </div>
  );
};

// ── SIGNALEMENT ───────────────────────────────────────────────────────────────
const SignalForm = ({ barSlug, barNom, onClose }) => {
  const [type,setType]=useState("horaires"); const [msg,setMsg]=useState(""); const [sent,setSent]=useState(false);
  const types=[["horaires","⏰ Horaires"],["ferme","🚫 Bar fermé"],["adresse","📍 Adresse"],["cibles","🎯 Fléchettes"],["autre","💬 Autre"]];
  if (sent) return (
    <div style={{ position:"fixed",inset:0,background:"#000a",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:32,maxWidth:420,width:"90%",textAlign:"center" }}>
        <div style={{ fontSize:44,marginBottom:10 }}>✅</div><h3 style={{ fontWeight:700,marginBottom:8 }}>Signalement envoyé !</h3>
        <Btn onClick={onClose}>Fermer</Btn>
      </div>
    </div>
  );
  return (
    <div style={{ position:"fixed",inset:0,background:"#000a",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:28,maxWidth:440,width:"90%" }}>
        <h3 style={{ fontWeight:700,marginBottom:4 }}>⚠️ Signaler une erreur — {barNom}</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:12,marginTop:14 }}>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>{types.map(([v,l])=><button key={v} onClick={()=>setType(v)} style={{ background:type===v?C.accent+"33":"#111",border:`1px solid ${type===v?C.accent:C.border}`,borderRadius:20,padding:"5px 12px",cursor:"pointer",fontSize:12,color:type===v?C.accent:C.muted }}>{l}</button>)}</div>
          <textarea value={msg} onChange={e=>setMsg(e.target.value)} placeholder="Décrivez l'erreur…" rows={4} style={{ background:"#111",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:13,resize:"vertical" }}/>
          <div style={{ display:"flex",gap:10 }}>
            <Btn onClick={async()=>{if(!msg.trim())return;await db.addSignalement({bar_slug:barSlug,bar_nom:barNom,type,message:msg,date:Date.now()});setSent(true);}} disabled={!msg.trim()} style={{ flex:1 }}>Envoyer</Btn>
            <Btn onClick={onClose} variant="dark" style={{ flex:1 }}>Annuler</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── SHARE ─────────────────────────────────────────────────────────────────────
const ShareBar = ({ bar }) => {
  const [copied,setCopied]=useState(false);
  const url=`https://dartpoint.netlify.app/bars/${bar.slug}`;
  return (
    <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:20 }}>
      <a href={`https://wa.me/?text=${encodeURIComponent("🎯 "+bar.nom+" — "+bar.ville+" sur DartPoint "+url)}`} target="_blank" rel="noreferrer"><Btn variant="dark" style={{ fontSize:12,padding:"7px 14px" }}>📱 WhatsApp</Btn></a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer"><Btn variant="dark" style={{ fontSize:12,padding:"7px 14px" }}>📘 Facebook</Btn></a>
      <Btn onClick={()=>{try{navigator.clipboard.writeText(url);}catch{}setCopied(true);setTimeout(()=>setCopied(false),2000);}} variant="dark" style={{ fontSize:12,padding:"7px 14px" }}>{copied?"✅ Copié !":"🔗 Lien"}</Btn>
    </div>
  );
};

// ── MODALS ÉDITION ────────────────────────────────────────────────────────────
const EditBarModal = ({ bar, onSave, onClose }) => {
  const [f,setF]=useState({ nom:bar.nom||"",ville:bar.ville||"",cp:bar.cp||"",adresse:bar.adresse||"",tel:bar.tel||"",type:bar.type||"electronique",cibles:String(bar.cibles||1),horaires:bar.horaires||"",description:bar.description||"",tournois:bar.tournois?"oui":"non",lat:String(bar.lat||""),lng:String(bar.lng||"") });
  const [saving,setSaving]=useState(false);
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  const save=async()=>{ setSaving(true); await db.updateBar(bar.slug,{nom:f.nom,ville:f.ville,cp:f.cp,adresse:f.adresse,tel:f.tel,type:f.type,cibles:parseInt(f.cibles)||1,horaires:f.horaires,description:f.description,tournois:f.tournois==="oui",lat:parseFloat(f.lat)||null,lng:parseFloat(f.lng)||null}); onSave({...bar,...f,cibles:parseInt(f.cibles)||1,tournois:f.tournois==="oui",lat:parseFloat(f.lat)||null,lng:parseFloat(f.lng)||null}); setSaving(false); onClose(); };
  return (
    <div style={{ position:"fixed",inset:0,background:"#000c",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,maxWidth:600,width:"100%",maxHeight:"90vh",overflowY:"auto" }}>
        <h3 style={{ fontWeight:700,fontSize:18,marginBottom:20 }}>✏️ Modifier — {bar.nom}</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Nom *" value={f.nom} onChange={set("nom")} placeholder="Le Central"/><Field label="Ville *" value={f.ville} onChange={set("ville")} placeholder="Bayonne"/></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Code postal" value={f.cp} onChange={set("cp")} placeholder="64100"/><Field label="Adresse" value={f.adresse} onChange={set("adresse")} placeholder="12 rue..."/></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Téléphone" value={f.tel} onChange={set("tel")} placeholder="05 59..."/><Field label="Horaires" value={f.horaires} onChange={set("horaires")} placeholder="Lun–Sam 10h–2h"/></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
            <Field label="Type" as="select" value={f.type} onChange={set("type")} options={TYPES}/>
            <Field label="Cibles" value={f.cibles} onChange={set("cibles")} placeholder="2" type="number"/>
            <Field label="Tournois" as="select" value={f.tournois} onChange={set("tournois")} options={[{v:"non",l:"Non"},{v:"oui",l:"Oui"}]}/>
          </div>
          <Field label="Description" value={f.description} onChange={set("description")} placeholder="Description…" as="textarea"/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Latitude" value={f.lat} onChange={set("lat")} placeholder="43.49" type="number"/><Field label="Longitude" value={f.lng} onChange={set("lng")} placeholder="-1.47" type="number"/></div>
          <div style={{ display:"flex",gap:10 }}><Btn onClick={save} disabled={saving||!f.nom||!f.ville} style={{ flex:1 }}>{saving?"…":"💾 Sauvegarder"}</Btn><Btn onClick={onClose} variant="dark" style={{ flex:1 }}>Annuler</Btn></div>
        </div>
      </div>
    </div>
  );
};

const EditAssoModal = ({ asso, onSave, onClose }) => {
  const [f,setF]=useState({ nom:asso.nom||"",ville:asso.ville||"",zone:asso.zone||"",type:asso.type||"electronique",jours:asso.jours||"",lieu:asso.lieu||"",tel:asso.tel||"",contact:asso.contact||"",description:asso.description||"",lat:String(asso.lat||""),lng:String(asso.lng||"") });
  const [saving,setSaving]=useState(false);
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  const save=async()=>{ setSaving(true); await db.updateAssociation(asso.slug,{...f,lat:parseFloat(f.lat)||null,lng:parseFloat(f.lng)||null}); onSave({...asso,...f}); setSaving(false); onClose(); };
  return (
    <div style={{ position:"fixed",inset:0,background:"#000c",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,maxWidth:600,width:"100%",maxHeight:"90vh",overflowY:"auto" }}>
        <h3 style={{ fontWeight:700,fontSize:18,marginBottom:20 }}>✏️ Modifier — {asso.nom}</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Nom *" value={f.nom} onChange={set("nom")} placeholder="Club"/><Field label="Ville *" value={f.ville} onChange={set("ville")} placeholder="Bayonne"/></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Zone" value={f.zone} onChange={set("zone")} placeholder="Côte Basque"/><Field label="Type" as="select" value={f.type} onChange={set("type")} options={TYPES.slice(0,3)}/></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Jours" value={f.jours} onChange={set("jours")} placeholder="Vendredi 20h"/><Field label="Lieu" value={f.lieu} onChange={set("lieu")} placeholder="Bar des Sports"/></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Téléphone" value={f.tel} onChange={set("tel")} placeholder="06 XX"/><Field label="Contact" value={f.contact} onChange={set("contact")} placeholder="email"/></div>
          <Field label="Description" value={f.description} onChange={set("description")} placeholder="Description…" as="textarea"/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Latitude" value={f.lat} onChange={set("lat")} placeholder="43.49" type="number"/><Field label="Longitude" value={f.lng} onChange={set("lng")} placeholder="-1.47" type="number"/></div>
          <div style={{ display:"flex",gap:10 }}><Btn onClick={save} disabled={saving||!f.nom||!f.ville} style={{ flex:1 }}>{saving?"…":"💾 Sauvegarder"}</Btn><Btn onClick={onClose} variant="dark" style={{ flex:1 }}>Annuler</Btn></div>
        </div>
      </div>
    </div>
  );
};

const EditTournoiModal = ({ tournoi, onSave, onClose }) => {
  const [f,setF]=useState({ nom:tournoi.nom||"",ville:tournoi.ville||"",date:tournoi.date||"",bar:tournoi.bar||"",association:tournoi.association||"",type:tournoi.type||"electronique",format:tournoi.format||"individuel",niveau:tournoi.niveau||"tous",prix:tournoi.prix||"",dotations:tournoi.dotations||"",places:tournoi.places||"",description:tournoi.description||"",contact:tournoi.contact||"",lien:tournoi.lien||"",lat:String(tournoi.lat||""),lng:String(tournoi.lng||"") });
  const [saving,setSaving]=useState(false);
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  const save=async()=>{ setSaving(true); await db.updateTournoi(tournoi.slug,{...f,lat:parseFloat(f.lat)||null,lng:parseFloat(f.lng)||null}); onSave({...tournoi,...f}); setSaving(false); onClose(); };
  return (
    <div style={{ position:"fixed",inset:0,background:"#000c",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:24,maxWidth:620,width:"100%",maxHeight:"90vh",overflowY:"auto" }}>
        <h3 style={{ fontWeight:700,fontSize:18,marginBottom:20 }}>✏️ Modifier — {tournoi.nom}</h3>
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Nom *" value={f.nom} onChange={set("nom")} placeholder="Open"/><Field label="Ville *" value={f.ville} onChange={set("ville")} placeholder="Bayonne"/></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Date" value={f.date} onChange={set("date")} type="date" placeholder=""/><Field label="Bar" value={f.bar} onChange={set("bar")} placeholder="Le Central"/></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12 }}>
            <Field label="Type" as="select" value={f.type} onChange={set("type")} options={TYPES.slice(0,3)}/>
            <Field label="Format" as="select" value={f.format} onChange={set("format")} options={[{v:"individuel",l:"Individuel"},{v:"equipes",l:"Équipes"},{v:"mixte",l:"Mixte"}]}/>
            <Field label="Niveau" as="select" value={f.niveau} onChange={set("niveau")} options={[{v:"tous",l:"Tous niveaux"},{v:"intermediaire",l:"Intermédiaire"},{v:"competiteur",l:"Compétiteur"}]}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Prix" value={f.prix} onChange={set("prix")} placeholder="5€"/><Field label="Places" value={f.places} onChange={set("places")} placeholder="32"/></div>
          <Field label="Description" value={f.description} onChange={set("description")} placeholder="Description…" as="textarea"/>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Contact" value={f.contact} onChange={set("contact")} placeholder="email ou tél"/><Field label="Lien" value={f.lien} onChange={set("lien")} placeholder="https://..."/></div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}><Field label="Latitude" value={f.lat} onChange={set("lat")} placeholder="43.49" type="number"/><Field label="Longitude" value={f.lng} onChange={set("lng")} placeholder="-1.47" type="number"/></div>
          <div style={{ display:"flex",gap:10 }}><Btn onClick={save} disabled={saving||!f.nom||!f.ville} style={{ flex:1 }}>{saving?"…":"💾 Sauvegarder"}</Btn><Btn onClick={onClose} variant="dark" style={{ flex:1 }}>Annuler</Btn></div>
        </div>
      </div>
    </div>
  );
};

// ── CARTE ACCUEIL ─────────────────────────────────────────────────────────────
const HomeMap = ({ bars, associations, tournois, setPage, setBarSlug, setAssoSlug, setTournoiSlug, centerVille, barsActifs }) => {
  const [showBars,setShowBars]=useState(true);
  const [showAssos,setShowAssos]=useState(true);
  const [showTournois,setShowTournois]=useState(true);
  const upcomingT = useMemo(()=>tournois.filter(t=>new Date(t.date)>=new Date()),[tournois]);
  const FBtn = ({ active, onClick, color, emoji, label, count }) => (
    <button onClick={onClick} style={{ display:"flex",alignItems:"center",gap:6,background:active?color+"22":"#111",border:`1px solid ${active?color:C.border}`,borderRadius:20,padding:"6px 14px",cursor:"pointer",fontSize:13,color:active?color:C.muted,fontWeight:active?600:400 }}>
      <span style={{ width:20,height:20,background:active?color:"#333",borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:10 }}>{emoji}</span>
      {label} <span style={{ background:active?color+"33":"#222",color:active?color:C.muted,borderRadius:10,padding:"0 7px",fontSize:11,fontWeight:700 }}>{count}</span>
    </button>
  );
  return (
    <div>
      <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:10 }}>
        <FBtn active={showBars} onClick={()=>setShowBars(!showBars)} color={C.accent} emoji="🎯" label="Bars" count={bars.length}/>
        <FBtn active={showAssos} onClick={()=>setShowAssos(!showAssos)} color="#7c3aed" emoji="🫂" label="Associations" count={associations.length}/>
        <FBtn active={showTournois} onClick={()=>setShowTournois(!showTournois)} color={C.yellow} emoji="🏅" label="Tournois" count={upcomingT.length}/>
      </div>
      <LeafletMap bars={showBars?bars:[]} associations={showAssos?associations:[]} tournois={showTournois?upcomingT:[]}
        onBarClick={s=>{setBarSlug(s);setPage("bar");}} onAssoClick={s=>{setAssoSlug(s);setPage("asso");}} onTournoiClick={s=>{setTournoiSlug(s);setPage("tournoi-detail");}}
        centerVille={centerVille} height={400} barsActifs={barsActifs}/>
    </div>
  );
};

// ── DASHBOARD (joueur connecté) ───────────────────────────────────────────────
const HomeDashboard = ({ joueur, setJoueur, setPage, bars, defisCount, demandesAmisCount=0, associations=[], tournois=[], barsActifs=[], setBarSlug=()=>{}, setAssoSlug=()=>{}, setTournoiSlug=()=>{} }) => {
  const [stats, setStats] = useState(null);
  const [joueurFrais, setJoueurFrais] = useState(joueur);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    Promise.all([
      dbJoueurs.getJoueur(joueur.id),
      dbJoueurs.getStats(joueur.id),
    ]).then(([j, s]) => {
      if (j) {
        setJoueurFrais(j);
        if (setJoueur) {
          setJoueur(j);
          localStorage.setItem("dp_joueur", JSON.stringify(j));
        }
      }
      if (s) setStats(s);
    }).catch(() => {
      dbJoueurs.getStats(joueur.id).then(setStats).catch(() => {});
    });
  }, [joueur.id]);

  const j = joueurFrais;
  const { titre, emoji, color } = getDrixTitre(j.drix || 1000);

  // Bouton image générique
  const ImgBtn = ({ src, onClick, badge=0 }) => (
    <div onClick={onClick} style={{ position:"relative",cursor:"pointer",borderRadius:16,overflow:"hidden",userSelect:"none",touchAction:"manipulation",transition:"transform .15s, box-shadow .15s" }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 32px #00000088";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
      <img src={src} alt="" style={{ width:"100%",display:"block",borderRadius:16 }}/>
      {badge>0 && (
        <div style={{ position:"absolute",top:10,right:10,background:"#ef4444",color:"#fff",borderRadius:"50%",minWidth:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,boxShadow:"0 2px 8px #00000066" }}>
          {badge>9?"9+":badge}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth:700,margin:"0 auto",padding:"16px 12px 24px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Carte profil ── */}
      <div onClick={()=>setPage("mon-profil")} style={{ position:"relative",overflow:"hidden",display:"flex",alignItems:"center",gap:16,
        background:`linear-gradient(135deg,#0d0d1a 0%,#1a0a00 60%,#0d0d1a 100%)`,
        border:`1px solid ${color}66`,borderRadius:18,padding:"14px 18px",marginBottom:12,
        cursor:"pointer",userSelect:"none",touchAction:"manipulation",
        transition:"transform .15s, box-shadow .15s",
        boxShadow:`0 0 24px ${color}18, 0 0 48px ${color}0a` }}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 32px #0008, 0 0 32px ${color}33`;}}
        onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 0 24px ${color}18`;}}>

        {/* Fond neon décoratif */}
        <div style={{ position:"absolute",top:-30,right:-30,width:140,height:140,borderRadius:"50%",background:`radial-gradient(circle,${color}18 0%,transparent 70%)`,pointerEvents:"none" }}/>
        <div style={{ position:"absolute",bottom:-20,left:-20,width:90,height:90,borderRadius:"50%",background:`radial-gradient(circle,${color}10 0%,transparent 70%)`,pointerEvents:"none" }}/>

        {/* Badge demandes d'amis */}
        {demandesAmisCount > 0 && (
          <div style={{ position:"absolute",top:-8,right:-8,background:"#10b981",color:"#fff",borderRadius:"50%",minWidth:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,boxShadow:"0 2px 8px #00000066",border:"2px solid #0a0a0a",zIndex:2 }}>
            {demandesAmisCount > 9 ? "9+" : demandesAmisCount}
          </div>
        )}

        {/* Photo avec halo */}
        <div style={{ position:"relative",flexShrink:0,zIndex:1 }}>
          <div style={{ position:"absolute",inset:-5,borderRadius:"50%",background:`radial-gradient(circle,${color}44 0%,transparent 70%)`,filter:"blur(6px)",zIndex:0 }}/>
          <div style={{ position:"relative",zIndex:1,width:68,height:68,borderRadius:"50%",
            border:`2px solid ${color}`,
            boxShadow:`0 0 10px ${color}88, 0 0 20px ${color}44`,
            overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",background:color+"22",fontSize:28 }}>
            {j.photo
              ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
              : emoji
            }
          </div>
        </div>

        {/* Infos */}
        <div style={{ flex:1,minWidth:0,position:"relative",zIndex:1 }}>
          <div style={{ fontWeight:900,fontSize:"clamp(16px,4.5vw,22px)",color:"#fff",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
            textShadow:`0 0 16px ${color}66` }}>{j.pseudo}</div>
          <div style={{ color,fontWeight:700,fontSize:"clamp(11px,3vw,13px)",marginTop:2 }}>{emoji} {titre}</div>
          {stats && <div style={{ color:"#94a3b8",fontSize:11,marginTop:3 }}>{stats.victoires}V · {stats.defaites}D · {stats.parties > 0 ? Math.round(stats.victoires/stats.parties*100) : 0}% WR</div>}
        </div>

        {/* DRIX pill neon */}
        <div style={{ textAlign:"center",position:"relative",zIndex:1,
          background:`linear-gradient(135deg,${color}22,${color}11)`,
          border:`1px solid ${color}66`,
          boxShadow:`0 0 12px ${color}44`,
          borderRadius:12,padding:"8px 14px",flexShrink:0 }}>
          <div style={{ fontWeight:900,fontSize:"clamp(16px,4.5vw,24px)",color,lineHeight:1,
            textShadow:`0 0 12px ${color}` }}>{j.drix||1000}</div>
          <div style={{ fontSize:9,color,fontWeight:700,marginTop:2,letterSpacing:1 }}>DRIX</div>
        </div>
      </div>

      {/* ── Grille 2×2 ── */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10 }}>
        <ImgBtn src="/comptoir.png"    onClick={()=>setPage("communaute")}/>
        <ImgBtn src="/defi.png"        onClick={()=>setPage("defi")} badge={defisCount}/>
        <ImgBtn src="/classement.png"  onClick={()=>setPage("drix")}/>
        <ImgBtn src="/mode de jeu.png" onClick={()=>setPage("jeux")}/>
      </div>

      {/* ── Scoreur + Trouve un bar ── */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
        <ImgBtn src="/scoreur.png"        onClick={()=>setPage("scoreur")}/>
        <ImgBtn src="/trouve un bar.png"  onClick={()=>setPage("bars")}/>
      </div>
    </div>
  );
};

// ── CARTE MATCH ACTIF (composant séparé pour pouvoir utiliser useState) ──────
const MatchActifCard = ({ d, joueur, setPage, onAbandon }) => {
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const adversaire = d.challenger_id===joueur.id ? d.defie_pseudo : d.challenger_pseudo;
  const abandonner = async () => {
    await sb(`duels?id=eq.${d.id}`, { method:"PATCH", body:JSON.stringify({ statut:"abandonne" }), prefer:"return=minimal" });
    onAbandon();
  };
  return (
    <div style={{ background:C.card,border:`2px solid ${confirmAbandon?C.red:C.green}`,borderRadius:12,padding:16,marginBottom:10,transition:"border-color .2s" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:confirmAbandon?12:0 }}>
        <div>
          <div style={{ fontWeight:700,fontSize:15 }}>⚔️ vs {adversaire}</div>
          <div style={{ color:C.muted,fontSize:12,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap" }}>
            <span>{d.mode} · {d.manches} manche{d.manches>1?"s":""}</span>
            <span style={{ background:"#1a0030",color:"#a78bfa",borderRadius:20,padding:"1px 8px",fontSize:11,fontWeight:700,border:"1px solid #a78bfa33" }}>💎 DRIX</span>
          </div>
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <Btn onClick={()=>setPage("scoreur-duel-"+d.id)} style={{ fontSize:13 }}>🎯 Reprendre</Btn>
          {!confirmAbandon && <Btn onClick={()=>setConfirmAbandon(true)} variant="danger" style={{ fontSize:13 }}>🏳 Abandonner</Btn>}
        </div>
      </div>
      {confirmAbandon && (
        <div style={{ background:"#1a0000",border:"1px solid #ef444444",borderRadius:10,padding:"12px 14px" }}>
          <p style={{ color:"#f1f5f9",fontSize:13,marginBottom:10,fontWeight:600 }}>
            Confirmer l'abandon ? Le match sera annulé sans attribution de DRIX.
          </p>
          <div style={{ display:"flex",gap:8 }}>
            <Btn onClick={abandonner} variant="danger" style={{ flex:1,fontSize:13 }}>✅ Confirmer</Btn>
            <Btn onClick={()=>setConfirmAbandon(false)} variant="dark" style={{ fontSize:13 }}>← Annuler</Btn>
          </div>
        </div>
      )}
    </div>
  );
};

// ── DOUBLETTE ──────────────────────────────────────────────────────────────────
const couleurPseudo = (pseudo) => {
  const cols=["#f97316","#60a5fa","#22c55e","#a78bfa","#f59e0b","#ec4899"];
  let h=0; for(const c of pseudo||"") h=(h*31+c.charCodeAt(0))%cols.length; return cols[h];
};

const JoueurSelectCard = ({ j, selected, onSelect, disabled }) => {
  const col=couleurPseudo(j.pseudo); const {emoji,color}=getDrixTitre(j.drix||1000);
  return (
    <div onClick={disabled?undefined:onSelect}
      style={{ background:selected?C.accent+"22":C.card,border:`2px solid ${selected?C.accent:C.border}`,borderRadius:12,padding:"11px 14px",cursor:disabled?"not-allowed":"pointer",display:"flex",alignItems:"center",gap:12,opacity:disabled&&!selected?.35:1,transition:"all .12s" }}>
      <div style={{ width:42,height:42,borderRadius:"50%",background:col+"22",border:`2px solid ${col}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,overflow:"hidden" }}>
        {j.photo?<img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<span>{emoji}</span>}
      </div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700,fontSize:14 }}>{j.pseudo}</div>
        <div style={{ fontSize:11,color,marginTop:1 }}>{emoji} {j.drix||1000} DRIX</div>
      </div>
      {selected&&<span style={{ color:C.accent,fontSize:20,fontWeight:700 }}>✓</span>}
    </div>
  );
};

const DoubletteFlow = ({ joueur, amis, amisData, setPage }) => {
  const [step,setStep]=useState(1);
  const [partner,setPartner]=useState(null);
  const [adv1,setAdv1]=useState(null);
  const [adv2,setAdv2]=useState(null);
  const [form,setForm]=useState({ mode:"501",manches:1 });
  const [launching,setLaunching]=useState(false);

  const friendsList=useMemo(()=>amis.map(a=>{
    const id=a.joueur_id===joueur.id?a.ami_id:a.joueur_id;
    const pseudo=a.joueur_id===joueur.id?a.ami_pseudo:a.joueur_pseudo;
    const profil=amisData[id]||{};
    return {id,pseudo,drix:profil.drix||1000,photo:profil.photo||null};
  }),[amis,amisData,joueur.id]);

  const me={id:joueur.id,pseudo:joueur.pseudo,drix:joueur.drix||1000,photo:joueur.photo||null};

  const launch=()=>{
    if(!partner||!adv1||!adv2||launching) return;
    setLaunching(true);
    const config={teamA:[me,partner],teamB:[adv1,adv2],mode:form.mode,manches:form.manches};
    window.__dpDoublette=config;
    try{localStorage.setItem("dp_doublette",JSON.stringify(config));}catch{}
    setPage("scoreur-doublette");
  };

  const noFriends=<div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:24,textAlign:"center" }}><p style={{ color:C.muted,marginBottom:12 }}>Tu n'as pas encore d'amis sur DartPoint.</p><Btn onClick={()=>setPage("joueurs")} style={{ fontSize:13 }}>👥 Trouver des joueurs</Btn></div>;

  // ── Étape 1 : choix équipier ──
  if(step===1) return (
    <div>
      <h2 style={{ fontWeight:700,fontSize:16,marginBottom:4 }}>👥 Choisis ton équipier</h2>
      <p style={{ color:C.muted,fontSize:13,marginBottom:14 }}>Équipe A : toi + 1 équipier</p>
      {friendsList.length===0?noFriends:(
        <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
          {friendsList.map(f=><JoueurSelectCard key={f.id} j={f} selected={partner?.id===f.id} onSelect={()=>setPartner(partner?.id===f.id?null:f)}/>)}
        </div>
      )}
      <Btn onClick={()=>setStep(2)} disabled={!partner} style={{ width:"100%" }}>Choisir les adversaires →</Btn>
    </div>
  );

  // ── Étape 2 : choix adversaires ──
  if(step===2) {
    const available=friendsList.filter(f=>f.id!==partner?.id);
    const isAdv=(id)=>adv1?.id===id||adv2?.id===id;
    const toggleAdv=(f)=>{
      if(adv1?.id===f.id){setAdv1(null);return;}
      if(adv2?.id===f.id){setAdv2(null);return;}
      if(!adv1){setAdv1(f);return;}
      if(!adv2){setAdv2(f);return;}
    };
    return (
      <div>
        <button onClick={()=>setStep(1)} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,marginBottom:12 }}>← Retour</button>
        <h2 style={{ fontWeight:700,fontSize:16,marginBottom:4 }}>⚔️ Choisis vos adversaires</h2>
        <p style={{ color:C.muted,fontSize:13,marginBottom:14 }}>Équipe B : 2 joueurs ({(adv1?1:0)+(adv2?1:0)}/2 sélectionnés)</p>
        {available.length<2?<p style={{ color:C.muted,fontSize:13 }}>Il te faut au moins 3 amis pour jouer en doublette.</p>:(
          <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
            {available.map(f=><JoueurSelectCard key={f.id} j={f} selected={isAdv(f.id)} onSelect={()=>toggleAdv(f)} disabled={!isAdv(f.id)&&!!adv1&&!!adv2}/>)}
          </div>
        )}
        <Btn onClick={()=>setStep(3)} disabled={!adv1||!adv2} style={{ width:"100%" }}>Configurer la partie →</Btn>
      </div>
    );
  }

  // ── Étape 3 : aperçu + config ──
  const teamADrix=Math.round(((me.drix||1000)+(partner?.drix||1000))/2);
  const teamBDrix=Math.round(((adv1?.drix||1000)+(adv2?.drix||1000))/2);
  const K=32*Math.max(1,form.manches);
  const EA=1/(1+Math.pow(10,(teamBDrix-teamADrix)/400));
  const gainV=Math.round(K*(1-EA)); const perteD=Math.round(K*EA);

  const TeamPreview=({label,players,drix,col})=>(
    <div style={{ textAlign:"center",flex:1 }}>
      <div style={{ fontSize:10,color:C.muted,fontWeight:700,marginBottom:8,letterSpacing:.5 }}>{label}</div>
      <div style={{ display:"flex",gap:6,justifyContent:"center",marginBottom:8 }}>
        {players.filter(Boolean).map(p=>(
          <div key={p.id} style={{ width:38,height:38,borderRadius:"50%",background:couleurPseudo(p.pseudo)+"33",border:`2px solid ${couleurPseudo(p.pseudo)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,overflow:"hidden" }}>
            {p.photo?<img src={p.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<span>{p.pseudo[0]?.toUpperCase()}</span>}
          </div>
        ))}
      </div>
      <div style={{ fontWeight:700,fontSize:13,marginBottom:4 }}>{players.filter(Boolean).map(p=>p.pseudo).join(" & ")}</div>
      <div style={{ fontWeight:800,fontSize:18,color:col }}>{drix} <span style={{ fontSize:11,fontWeight:600,color:C.muted }}>DRIX</span></div>
    </div>
  );

  return (
    <div>
      <button onClick={()=>setStep(2)} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,marginBottom:12 }}>← Retour</button>

      {/* Aperçu équipes */}
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18,marginBottom:14 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
          <TeamPreview label="ÉQUIPE A" players={[me,partner]} drix={teamADrix} col="#60a5fa"/>
          <div style={{ textAlign:"center",flexShrink:0 }}>
            <div style={{ fontSize:20,color:C.muted }}>⚔️</div>
            <div style={{ fontSize:10,color:C.muted }}>VS</div>
          </div>
          <TeamPreview label="ÉQUIPE B" players={[adv1,adv2]} drix={teamBDrix} col="#f87171"/>
        </div>
        <div style={{ display:"flex",gap:8,justifyContent:"center" }}>
          <span style={{ background:"#14532d",color:"#22c55e",borderRadius:20,padding:"3px 11px",fontSize:12,fontWeight:700 }}>+{gainV} si victoire</span>
          <span style={{ background:"#7f1d1d",color:"#ef4444",borderRadius:20,padding:"3px 11px",fontSize:12,fontWeight:700 }}>−{perteD} si défaite</span>
        </div>
        <p style={{ textAlign:"center",color:C.muted,fontSize:11,marginTop:8 }}>Chaque joueur reçoit le même montant</p>
      </div>

      {/* Format */}
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14,marginBottom:16 }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <div>
            <div style={{ fontSize:11,color:C.muted,marginBottom:6 }}>Mode</div>
            <div style={{ display:"flex",gap:6 }}>
              {["501","301"].map(m=><button key={m} onClick={()=>setForm(f=>({...f,mode:m}))} style={{ flex:1,padding:"9px 0",borderRadius:8,border:"none",fontWeight:700,cursor:"pointer",background:form.mode===m?C.accent:"#222",color:form.mode===m?"#fff":C.muted }}>{m}</button>)}
            </div>
          </div>
          <div>
            <div style={{ fontSize:11,color:C.muted,marginBottom:6 }}>Manches</div>
            <div style={{ display:"flex",gap:4 }}>
              {[1,2,3,5].map(n=><button key={n} onClick={()=>setForm(f=>({...f,manches:n}))} style={{ flex:1,padding:"9px 0",borderRadius:8,border:"none",fontWeight:700,cursor:"pointer",background:form.manches===n?C.accent:"#222",color:form.manches===n?"#fff":C.muted }}>{n}</button>)}
            </div>
          </div>
        </div>
      </div>

      <Btn onClick={launch} disabled={launching} style={{ width:"100%",fontSize:15,padding:"14px 0" }}>
        {launching?"Lancement…":"🎯 Lancer la Doublette !"}
      </Btn>
    </div>
  );
};

// ── PAGE DÉFI ─────────────────────────────────────────────────────────────────
const PageDefi = ({ joueur, setPage }) => {
  const [amis, setAmis] = useState([]);
  const [amisData, setAmisData] = useState({});
  const [matchsActifs, setMatchsActifs] = useState([]);
  const [resultsAContester, setResultsAContester] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("1v1");
  // ── modal défi premium ──
  const [modalAmi, setModalAmi] = useState(null); // { amiId, amiPseudo, profil }
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [defiForm, setDefiForm] = useState({ mode:"501", manches:1, type:"classe" });
  const [sending, setSending] = useState(false);

  const charger = () => {
    if (!joueur) { setLoading(false); return; }
    const now = Date.now();
    const h24 = 86400000;
    Promise.all([
      sb(`amis?or=(joueur_id.eq.${joueur.id},ami_id.eq.${joueur.id})&statut=eq.accepte&select=*`),
      sb(`duels?or=(challenger_id.eq.${joueur.id},defie_id.eq.${joueur.id})&statut=eq.accepte&select=*`),
      sb(`duels?defie_id=eq.${joueur.id}&statut=eq.termine&valide_defie=eq.false&select=*`),
    ]).then(async ([a, ma, rc]) => {
      setAmis(a||[]);
      setMatchsActifs(ma||[]);
      setResultsAContester((rc||[]).filter(d => now - (d.date||0) < h24));
      // Charger photos + DRIX des amis
      const ids = (a||[]).map(x => x.joueur_id===joueur.id ? x.ami_id : x.joueur_id);
      if (ids.length > 0) {
        const profils = await sb(`joueurs?id=in.(${ids.join(",")})&select=id,pseudo,photo,drix`).catch(()=>[]);
        const map = {};
        (profils||[]).forEach(p => { map[p.id] = p; });
        setAmisData(map);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };
  useEffect(charger, [joueur?.id]);

  const ouvrirModal = async (a) => {
    const amiId = a.joueur_id===joueur.id ? a.ami_id : a.joueur_id;
    const amiPseudo = a.joueur_id===joueur.id ? a.ami_pseudo : a.joueur_pseudo;
    const profil = amisData[amiId] || {};
    setModalAmi({ amiId, amiPseudo, profil });
    setModalData(null);
    setModalLoading(true);
    setDefiForm({ mode:"501", manches:1, type:"classe" });
    try {
      const [duelsAdv, allJ] = await Promise.all([
        sb(`duels?or=(challenger_id.eq.${amiId},defie_id.eq.${amiId})&order=date.desc&select=*`).catch(()=>[]),
        sb(`joueurs?order=drix.desc&select=id,drix`).catch(()=>[]),
      ]);
      setModalData({ duelsAdv: duelsAdv||[], allJoueurs: allJ||[] });
    } catch {}
    setModalLoading(false);
  };

  const envoyerDefi = async () => {
    if (!modalAmi || sending) return;
    setSending(true);
    try {
      const res = await sb("duels", { method:"POST", body:JSON.stringify({
        challenger_id: joueur.id, challenger_pseudo: joueur.pseudo,
        defie_id: modalAmi.amiId, defie_pseudo: modalAmi.amiPseudo,
        statut:"accepte", type: defiForm.type==="classe"?"drix":"amical",
        mode: defiForm.mode === "Cricket" ? "Cricket" : defiForm.mode,
        manches: defiForm.mode === "Cricket" ? 1 : defiForm.manches,
        date: Date.now(), valide_challenger:false, valide_defie:false,
        score_manches_challenger:0, score_manches_defie:0,
      })});
      const newDuel = Array.isArray(res) ? res[0] : res;
      if (newDuel?.id) {
        setModalAmi(null);
        if (defiForm.mode === "Cricket") {
          localStorage.setItem("dp_cricket_duel", JSON.stringify({
            duelId: newDuel.id,
            challengerId: joueur.id, challengerPseudo: joueur.pseudo, challengerDrix: joueur.drix||1000,
            defiId: modalAmi.amiId, defiPseudo: modalAmi.amiPseudo, defiDrix: modalAmi.profil?.drix||1000,
            type: defiForm.type==="classe"?"drix":"amical",
          }));
          setPage("cricket-config");
        } else {
          setPage("scoreur-duel-" + newDuel.id);
        }
      }
    } catch(e) { console.error("Erreur défi:", e); }
    setSending(false);
  };

  if (!joueur) return <div style={{ textAlign:"center",padding:60 }}><p style={{ color:C.muted }}>Connecte-toi pour accéder aux défis.</p><Btn onClick={()=>setPage("connexion")}>Se connecter</Btn></div>;
  if (loading) return <Spinner/>;

  // ── stats calculées pour la modal ──
  const buildModalStats = () => {
    if (!modalData || !modalAmi) return {};
    const { duelsAdv, allJoueurs } = modalData;
    const amiId = modalAmi.amiId;
    const hisDrix = modalAmi.profil?.drix || 1000;
    const myDrix = joueur.drix || 1000;
    const termines = duelsAdv.filter(d => d.statut==="termine");
    const wins = termines.filter(d => d.gagnant_id===amiId).length;
    const winRate = termines.length ? Math.round(wins/termines.length*100) : 50;
    const derniers10 = termines.slice(0,10);
    const wins10 = derniers10.filter(d => d.gagnant_id===amiId).length;
    const formePct = derniers10.length ? wins10/derniers10.length : 0.5;
    const resultats5 = termines.slice(0,5).map(d => d.gagnant_id===amiId ? "V" : "D");
    const wins5 = resultats5.filter(r=>r==="V").length;
    const formeLabel = wins5>=4?"Très en forme":wins5>=3?"En forme":wins5>=2?"Stable":"En difficulté";
    const formeColor = wins5>=4?"#22c55e":wins5>=3?"#60a5fa":wins5>=2?"#f59e0b":"#ef4444";
    const faceAFace = termines.filter(d => (d.challenger_id===amiId&&d.defie_id===joueur.id)||(d.defie_id===amiId&&d.challenger_id===joueur.id));
    const fafWins = faceAFace.filter(d => d.gagnant_id===amiId).length;
    const fafLoses = faceAFace.length - fafWins;
    const avgFinish = termines.length ? Math.round(termines.reduce((s,d)=>s+(d.finish||0),0)/termines.length) : 0;
    const bigFinishes = termines.filter(d => (d.finish||0)>100).length;
    const styleObj = (() => {
      if (winRate>=65&&formePct>=0.6) return {emoji:"🏆",label:"Dominateur",desc:"Écrase ses adversaires"};
      if (avgFinish>=80||bigFinishes>=3) return {emoji:"💥",label:"Finisseur",desc:"Conclut avec de grands finishes"};
      if (formePct>=0.7) return {emoji:"🔥",label:"En feu",desc:"Série impressionnante en cours"};
      if (winRate>=50) return {emoji:"⚔️",label:"Régulier",desc:"Performant sur la durée"};
      return {emoji:"🎯",label:"Imprévisible",desc:"Résultats difficiles à prévoir"};
    })();
    const dangerositeScore = Math.min(100, Math.round((winRate*0.5) + ((hisDrix/2000)*30) + (formePct*20)));
    const dangerColor = dangerositeScore>=80?"#ef4444":dangerositeScore>=60?"#f97316":dangerositeScore>=40?"#f59e0b":"#22c55e";
    const EA = 1/(1+Math.pow(10,(hisDrix-myDrix)/400));
    const probaVictoire = Math.round(EA*100);
    const K = 32 * Math.max(1, defiForm.manches);
    const gainElo = Math.round(K*(1-EA));
    const perteElo = Math.round(K*EA);
    const posAdv = allJoueurs.findIndex(x=>x.id===amiId);
    const classAdv = posAdv>=0 ? posAdv+1 : null;
    const pointFaibleObj = (() => {
      if (formePct<0.4&&derniers10.length>=5) return {emoji:"😰",label:"Pression",desc:"Perd sous la pression"};
      if (avgFinish<60&&termines.length>=5) return {emoji:"🛡️",label:"Finishes",desc:"Peut rater ses finishes"};
      if (winRate<40) return {emoji:"📉",label:"Régularité",desc:"Résultats irréguliers"};
      return {emoji:"🎯",label:"Grands finishes",desc:"Peut rater les grands finishes"};
    })();
    return { winRate, formePct, resultats5, formeLabel, formeColor, faceAFace, fafWins, fafLoses, styleObj, dangerositeScore, dangerColor, probaVictoire, gainElo, perteElo, classAdv, pointFaibleObj, hisDrix, myDrix };
  };
  const ms = modalAmi ? buildModalStats() : {};

  return (
    <div style={{ maxWidth:700,margin:"0 auto",padding:"24px 16px" }}>
      <button onClick={()=>setPage("home")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",marginBottom:16,fontSize:13 }}>← Accueil</button>
      <h1 style={{ fontWeight:800,fontSize:22,marginBottom:4 }}>⚔️ Défis</h1>
      <p style={{ color:C.muted,fontSize:13,marginBottom:14 }}>Défie tes amis et gagne des DRIX</p>

      {/* ── Toggle 1v1 / Doublette ── */}
      <div style={{ display:"flex",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:20 }}>
        <button onClick={()=>setTab("1v1")} style={{ flex:1,padding:"11px 0",background:tab==="1v1"?C.accent:"transparent",color:tab==="1v1"?"#fff":C.muted,border:"none",cursor:"pointer",fontWeight:tab==="1v1"?700:400,fontSize:14,transition:"all .15s" }}>⚔️ Défier un ami</button>
        <button onClick={()=>setTab("doublette")} style={{ flex:1,padding:"11px 0",background:tab==="doublette"?C.accent:"transparent",color:tab==="doublette"?"#fff":C.muted,border:"none",cursor:"pointer",fontWeight:tab==="doublette"?700:400,fontSize:14,transition:"all .15s" }}>👥 Doublette 2v2</button>
      </div>

      {tab==="doublette" && <DoubletteFlow joueur={joueur} amis={amis} amisData={amisData} setPage={setPage}/>}

      {tab==="1v1" && <>
      {resultsAContester.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontWeight:700,fontSize:16,marginBottom:12,color:C.red }}>⚠️ Résultats à contester ({resultsAContester.length})</h2>
          <p style={{ color:C.muted,fontSize:12,marginBottom:12 }}>Tu n'étais peut-être pas présent — tu peux contester dans les 24h.</p>
          {resultsAContester.map(d => {
            const heuresRestantes = Math.max(0, Math.floor((86400000 - (Date.now() - (d.date||0))) / 3600000));
            const { sc, sd } = (() => {
              let sc = d.score_manches_challenger ?? 0, sd = d.score_manches_defie ?? 0;
              if (sc === sd && sc > 0 && d.gagnant_id) { if (d.gagnant_id === d.challenger_id) sd = 0; else sc = 0; }
              return { sc, sd };
            })();
            return (
              <div key={d.id} style={{ background:C.card,border:`2px solid ${C.red}44`,borderRadius:12,padding:16,marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
                  <div>
                    <div style={{ fontWeight:700,fontSize:15 }}>⚔️ vs {d.challenger_pseudo}</div>
                    <div style={{ color:C.muted,fontSize:12 }}>{d.mode} · Résultat : {sc}-{sd} pour {d.gagnant_pseudo}</div>
                  </div>
                  <span style={{ background:C.red+"22",color:C.red,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700 }}>⏱ {heuresRestantes}h</span>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <Btn onClick={async ()=>{ await sb(`duels?id=eq.${d.id}`,{method:"PATCH",body:JSON.stringify({valide_defie:true}),prefer:"return=minimal"}); setResultsAContester(x=>x.filter(r=>r.id!==d.id)); }} style={{ flex:1,fontSize:13,background:C.green }}>✅ J'accepte le résultat</Btn>
                  <Btn onClick={async ()=>{ await sb(`duels?id=eq.${d.id}`,{method:"PATCH",body:JSON.stringify({statut:"conteste"}),prefer:"return=minimal"}); setResultsAContester(x=>x.filter(r=>r.id!==d.id)); }} style={{ fontSize:13,background:"#2a2a2a",color:C.red }}>⚡ Contester</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {matchsActifs.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontWeight:700,fontSize:16,marginBottom:12,color:C.green }}>🎯 Match en cours — Lance le scoreur !</h2>
          {matchsActifs.map(d => (
            <MatchActifCard key={d.id} d={d} joueur={joueur} setPage={setPage} onAbandon={()=>setMatchsActifs(x=>x.filter(m=>m.id!==d.id))}/>
          ))}
        </div>
      )}

      <h2 style={{ fontWeight:700,fontSize:16,marginBottom:12 }}>👥 Défier un ami</h2>
      {amis.length === 0 ? (
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:24,textAlign:"center" }}>
          <p style={{ color:C.muted,fontSize:14,marginBottom:12 }}>Tu n'as pas encore d'amis sur DartPoint.</p>
          <Btn onClick={()=>setPage("joueurs")} style={{ fontSize:13 }}>👥 Trouver des joueurs</Btn>
        </div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:16 }}>
          {amis.map(a => {
            const amiId = a.joueur_id===joueur.id?a.ami_id:a.joueur_id;
            const amiPseudo = a.joueur_id===joueur.id?a.ami_pseudo:a.joueur_pseudo;
            const profil = amisData[amiId];
            const { emoji:amiEmoji, color:amiColor } = getDrixTitre(profil?.drix||1000);
            const hisDrix = profil?.drix || 1000;
            return (
              <div key={amiId} onClick={()=>ouvrirModal(a)}
                style={{ background:C.card,border:`2px solid ${C.border}`,borderRadius:12,padding:"12px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:12,transition:"all .12s" }}>
                <div style={{ width:44,height:44,borderRadius:"50%",background:amiColor+"22",border:`2px solid ${amiColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0,overflow:"hidden" }}>
                  {profil?.photo ? <img src={profil.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span>{amiEmoji}</span>}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:15 }}>{amiPseudo}</div>
                  <div style={{ display:"flex",gap:8,marginTop:2 }}>
                    <span style={{ fontSize:11,color:amiColor,fontWeight:600 }}>{amiEmoji} {hisDrix} DRIX</span>
                  </div>
                </div>
                <span style={{ color:C.muted,fontSize:13,fontWeight:600 }}>⚔️</span>
              </div>
            );
          })}
        </div>
      )}
      </>}

      {/* ── MODAL DÉFI PREMIUM ── */}
      {modalAmi && (
        <div onClick={e=>{if(e.target===e.currentTarget)setModalAmi(null)}} style={{ position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(6px)",overflowY:"auto" }}>
          <div style={{ maxWidth:480,margin:"0 auto",paddingBottom:40 }}>
            {/* EN-TÊTE */}
            <div style={{ position:"sticky",top:0,zIndex:10,background:"#0a0a0a",padding:"16px 20px",borderBottom:`1px solid #222`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <div style={{ fontWeight:900,fontSize:18,background:"linear-gradient(90deg,#f97316,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>⚔️ Préparer le défi</div>
                <div style={{ color:C.muted,fontSize:12,marginTop:2 }}>Analyse complète avant de défier</div>
              </div>
              <button onClick={()=>setModalAmi(null)} style={{ background:"#222",border:"none",color:"#fff",borderRadius:8,width:36,height:36,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
            </div>

            {modalLoading ? (
              <div style={{ textAlign:"center",padding:60,color:C.muted }}>Chargement de l'analyse…</div>
            ) : (<>

            {/* BLOC IDENTITÉ */}
            {(() => {
              const { emoji:advEmoji, color:advColor, titre:advTitre } = getDrixTitre(modalAmi.profil?.drix||1000);
              return (
                <div style={{ margin:"16px 16px 0",background:"linear-gradient(135deg,#111 0%,#1a1a2e 100%)",border:`1px solid ${advColor}44`,borderRadius:16,padding:20 }}>
                  <div style={{ display:"flex",alignItems:"center",gap:16 }}>
                    <div style={{ width:64,height:64,borderRadius:"50%",background:advColor+"33",border:`3px solid ${advColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,overflow:"hidden" }}>
                      {modalAmi.profil?.photo ? <img src={modalAmi.profil.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span>{advEmoji}</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:900,fontSize:20 }}>{modalAmi.amiPseudo}</div>
                      <div style={{ color:advColor,fontWeight:700,fontSize:13,marginTop:2 }}>{advEmoji} {advTitre} · {modalAmi.profil?.drix||1000} DRIX</div>
                      {ms.classAdv && <div style={{ color:C.muted,fontSize:12,marginTop:2 }}>#{ms.classAdv} mondial</div>}
                    </div>
                    {/* Cercle dangerosité */}
                    <div style={{ textAlign:"center",flexShrink:0 }}>
                      <svg width="60" height="60" viewBox="0 0 60 60">
                        <circle cx="30" cy="30" r="24" fill="none" stroke="#222" strokeWidth="5"/>
                        <circle cx="30" cy="30" r="24" fill="none" stroke={ms.dangerColor||"#f97316"} strokeWidth="5"
                          strokeDasharray={`${(ms.dangerositeScore||0)*1.508} 150.8`}
                          strokeLinecap="round" transform="rotate(-90 30 30)"/>
                        <text x="30" y="35" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="900">{ms.dangerositeScore||0}</text>
                      </svg>
                      <div style={{ fontSize:9,color:C.muted,marginTop:2 }}>DANGER</div>
                    </div>
                  </div>
                  {/* Forme */}
                  <div style={{ marginTop:14 }}>
                    <div style={{ fontSize:11,color:C.muted,marginBottom:6 }}>FORME ACTUELLE</div>
                    <div style={{ display:"flex",gap:6,alignItems:"center" }}>
                      {(ms.resultats5||[]).map((r,i) => (
                        <div key={i} style={{ width:32,height:32,borderRadius:8,background:r==="V"?"#14532d":"#7f1d1d",border:`2px solid ${r==="V"?"#22c55e":"#ef4444"}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:r==="V"?"#22c55e":"#ef4444" }}>{r}</div>
                      ))}
                      {!(ms.resultats5||[]).length && <span style={{ color:C.muted,fontSize:12 }}>Pas de données</span>}
                      {(ms.resultats5||[]).length>0 && <span style={{ marginLeft:4,fontSize:12,color:ms.formeColor,fontWeight:700 }}>{ms.formeLabel}</span>}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* BLOC COMPARAISON DRIX */}
            <div style={{ margin:"12px 16px 0",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16 }}>
              <div style={{ fontSize:11,color:C.muted,marginBottom:12,fontWeight:700,letterSpacing:1 }}>COMPARAISON DRIX</div>
              <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                <div style={{ flex:1,textAlign:"center",background:"#111",borderRadius:12,padding:"12px 8px" }}>
                  <div style={{ fontSize:10,color:C.muted,marginBottom:4 }}>TOI</div>
                  <div style={{ fontWeight:900,fontSize:24,color:"#f97316" }}>{ms.myDrix}</div>
                  <div style={{ fontSize:10,color:C.muted }}>DRIX</div>
                </div>
                <div style={{ textAlign:"center",padding:"0 4px" }}>
                  <div style={{ fontSize:20,fontWeight:900 }}>⚔️</div>
                  <div style={{ fontSize:10,color:C.muted }}>VS</div>
                </div>
                <div style={{ flex:1,textAlign:"center",background:"#111",borderRadius:12,padding:"12px 8px" }}>
                  <div style={{ fontSize:10,color:C.muted,marginBottom:4 }}>{modalAmi.amiPseudo.toUpperCase().slice(0,10)}</div>
                  <div style={{ fontWeight:900,fontSize:24,color:getDrixTitre(ms.hisDrix||1000).color }}>{ms.hisDrix}</div>
                  <div style={{ fontSize:10,color:C.muted }}>DRIX</div>
                </div>
              </div>
              <div style={{ display:"flex",gap:8,marginTop:10 }}>
                <div style={{ flex:1,background:"#14532d",borderRadius:10,padding:"10px 8px",textAlign:"center" }}>
                  <div style={{ fontSize:10,color:"#4ade80",marginBottom:2 }}>SI VICTOIRE</div>
                  <div style={{ fontWeight:900,fontSize:18,color:"#22c55e" }}>+{ms.gainElo||"?"}</div>
                  <div style={{ fontSize:9,color:"#4ade80" }}>DRIX</div>
                </div>
                <div style={{ flex:1,background:"#7f1d1d",borderRadius:10,padding:"10px 8px",textAlign:"center" }}>
                  <div style={{ fontSize:10,color:"#fca5a5",marginBottom:2 }}>SI DÉFAITE</div>
                  <div style={{ fontWeight:900,fontSize:18,color:"#ef4444" }}>-{ms.perteElo||"?"}</div>
                  <div style={{ fontSize:9,color:"#fca5a5" }}>DRIX</div>
                </div>
              </div>
            </div>

            {/* BLOC ANALYSE */}
            <div style={{ margin:"12px 16px 0",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16 }}>
              <div style={{ fontSize:11,color:C.muted,marginBottom:12,fontWeight:700,letterSpacing:1 }}>ANALYSE</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                <div style={{ background:"#111",borderRadius:12,padding:"12px 10px" }}>
                  <div style={{ fontSize:10,color:C.muted,marginBottom:6 }}>FACE À FACE</div>
                  <div style={{ fontWeight:900,fontSize:18 }}><span style={{ color:"#22c55e" }}>{ms.fafLoses||0}V</span> – <span style={{ color:"#ef4444" }}>{ms.fafWins||0}D</span></div>
                  <div style={{ fontSize:10,color:C.muted,marginTop:2 }}>{(ms.faceAFace||[]).length} matchs</div>
                </div>
                <div style={{ background:"#111",borderRadius:12,padding:"12px 10px" }}>
                  <div style={{ fontSize:10,color:C.muted,marginBottom:6 }}>STYLE</div>
                  <div style={{ fontSize:16 }}>{ms.styleObj?.emoji}</div>
                  <div style={{ fontWeight:700,fontSize:12,marginTop:2 }}>{ms.styleObj?.label}</div>
                  <div style={{ fontSize:10,color:C.muted }}>{ms.styleObj?.desc}</div>
                </div>
                <div style={{ background:"#111",borderRadius:12,padding:"12px 10px" }}>
                  <div style={{ fontSize:10,color:C.muted,marginBottom:6 }}>POINT FAIBLE</div>
                  <div style={{ fontSize:16 }}>{ms.pointFaibleObj?.emoji}</div>
                  <div style={{ fontWeight:700,fontSize:12,marginTop:2 }}>{ms.pointFaibleObj?.label}</div>
                  <div style={{ fontSize:10,color:C.muted }}>{ms.pointFaibleObj?.desc}</div>
                </div>
                <div style={{ background:"#111",borderRadius:12,padding:"12px 10px",textAlign:"center" }}>
                  <div style={{ fontSize:10,color:C.muted,marginBottom:6 }}>PROB. VICTOIRE</div>
                  <div style={{ fontWeight:900,fontSize:28,color:ms.probaVictoire>=60?"#22c55e":ms.probaVictoire>=40?"#f59e0b":"#ef4444" }}>{ms.probaVictoire||"?"}%</div>
                  <div style={{ fontSize:10,color:C.muted }}>pour toi</div>
                </div>
              </div>
            </div>

            {/* BLOC CONFIGURATION */}
            <div style={{ margin:"12px 16px 0",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16 }}>
              <div style={{ fontSize:11,color:C.muted,marginBottom:12,fontWeight:700,letterSpacing:1 }}>CONFIGURATION</div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11,color:C.muted,marginBottom:6 }}>Mode</div>
                <div style={{ display:"flex",gap:6 }}>
                  {["501","301","Cricket"].map(m=>(
                    <button key={m} onClick={()=>setDefiForm(f=>({...f,mode:m}))} style={{ flex:1,padding:"10px 0",borderRadius:8,border:"none",fontWeight:700,cursor:"pointer",background:defiForm.mode===m?"#7c3aed":"#222",color:defiForm.mode===m?"#fff":C.muted,fontSize:14,transition:"all .12s" }}>{m}</button>
                  ))}
                </div>
              </div>
              {defiForm.mode !== "Cricket" && <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11,color:C.muted,marginBottom:6 }}>Manches</div>
                <div style={{ display:"flex",gap:4 }}>
                  {[1,2,3,4,5].map(n=>(
                    <button key={n} onClick={()=>setDefiForm(f=>({...f,manches:n}))} style={{ flex:1,padding:"10px 0",borderRadius:8,border:"none",fontWeight:700,cursor:"pointer",background:defiForm.manches===n?"#7c3aed":"#222",color:defiForm.manches===n?"#fff":C.muted,fontSize:14,transition:"all .12s" }}>{n}</button>
                  ))}
                </div>
              </div>}
              <div>
                <div style={{ fontSize:11,color:C.muted,marginBottom:6 }}>Type</div>
                <div style={{ display:"flex",gap:6 }}>
                  {[{v:"classe",l:"🏆 Classé"},{v:"amical",l:"🤝 Amical"}].map(t=>(
                    <button key={t.v} onClick={()=>setDefiForm(f=>({...f,type:t.v}))} style={{ flex:1,padding:"10px 0",borderRadius:8,border:"none",fontWeight:700,cursor:"pointer",background:defiForm.type===t.v?"#7c3aed":"#222",color:defiForm.type===t.v?"#fff":C.muted,fontSize:13,transition:"all .12s" }}>{t.l}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* BLOC VALIDATION */}
            <div style={{ margin:"12px 16px 0",background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16 }}>
              <button onClick={envoyerDefi} disabled={sending}
                style={{ width:"100%",padding:"14px 0",borderRadius:12,border:"none",fontWeight:900,fontSize:16,cursor:sending?"not-allowed":"pointer",background:"linear-gradient(135deg,#f97316,#7c3aed)",color:"#fff",opacity:sending?0.6:1,transition:"all .15s",letterSpacing:0.5 }}>
                {sending?"Lancement du match…":`⚔️ DÉFIER ${modalAmi.amiPseudo.toUpperCase()}`}
              </button>
            </div>

            </>)}
          </div>
        </div>
      )}
    </div>
  );
};

// ── SCOREUR DOUBLETTE ──────────────────────────────────────────────────────────
// Thin wrapper: reuses the existing <Scoreur> component entirely.
// Team names displayed as first 3 letters uppercase: "THO / HER" vs "TOT / CYR"
// DRIX applied to all 4 players via onResultat intercept.
const ScoreurDoublette = ({ joueur, setPage }) => {
  const config = (() => {
    try { return JSON.parse(localStorage.getItem("dp_doublette")||"null"); }
    catch { return window.__dpDoublette||null; }
  })();

  if (!config) return <div style={{ textAlign:"center",padding:60,color:C.muted }}>Configuration introuvable.</div>;

  const abbr = (pseudo) => (pseudo||"?").slice(0,3).toUpperCase();
  const teamAName = `${abbr(config.teamA[0]?.pseudo)} / ${abbr(config.teamA[1]?.pseudo)}`;
  const teamBName = `${abbr(config.teamB[0]?.pseudo)} / ${abbr(config.teamB[1]?.pseudo)}`;

  const fakeDuel = {
    challenger_pseudo: teamAName,
    defie_pseudo:      teamBName,
    mode:              config.mode   || "501",
    manches:           config.manches || 1,
  };

  // Pre-compute drixData so Scoreur can show gain/loss on the final screen
  const teamADrix = Math.round(((config.teamA[0]?.drix||1000) + (config.teamA[1]?.drix||1000)) / 2);
  const teamBDrix = Math.round(((config.teamB[0]?.drix||1000) + (config.teamB[1]?.drix||1000)) / 2);
  const K  = 32 * Math.max(1, config.manches || 1);
  const EA = 1 / (1 + Math.pow(10, (teamBDrix - teamADrix) / 400));
  const gainA = Math.round(K * (1 - EA));
  const perteA = Math.round(K * EA);
  const drixData = {
    challenger: { gain: gainA, perte: perteA },
    defie:      { gain: perteA, perte: gainA },
  };

  // Called by Scoreur when the match is over (onResultat bypasses Supabase write)
  const handleResultat = async ({ gagnantNom }) => {
    const teamAWon = gagnantNom === teamAName;
    const winTeam  = teamAWon ? config.teamA : config.teamB;
    const loseTeam = teamAWon ? config.teamB : config.teamA;
    try {
      const ids = [...config.teamA, ...config.teamB].map(p => p?.id).filter(Boolean);
      const players = await sb(`joueurs?id=in.(${ids.join(",")})&select=id,drix`).catch(() => []);
      const getDrix = (id) => players?.find(p => p.id === id)?.drix || 1000;
      const dA1 = getDrix(config.teamA[0]?.id), dA2 = getDrix(config.teamA[1]?.id);
      const dB1 = getDrix(config.teamB[0]?.id), dB2 = getDrix(config.teamB[1]?.id);
      const tAD = Math.round((dA1 + dA2) / 2), tBD = Math.round((dB1 + dB2) / 2);
      const Kf  = 32 * Math.max(1, config.manches || 1);
      const EAf = 1 / (1 + Math.pow(10, (tBD - tAD) / 400));
      const varA = teamAWon ?  Math.round(Kf * (1 - EAf)) : -Math.round(Kf * EAf);
      const varB = teamAWon ? -Math.round(Kf * (1 - EAf)) :  Math.round(Kf * EAf);
      const winVar  = teamAWon ? varA : varB;
      const loseVar = teamAWon ? varB : varA;
      await Promise.all([
        sb(`joueurs?id=eq.${config.teamA[0]?.id}`, { method:"PATCH", body:JSON.stringify({ drix: Math.max(100, dA1 + varA) }), prefer:"return=minimal" }),
        sb(`joueurs?id=eq.${config.teamA[1]?.id}`, { method:"PATCH", body:JSON.stringify({ drix: Math.max(100, dA2 + varA) }), prefer:"return=minimal" }),
        sb(`joueurs?id=eq.${config.teamB[0]?.id}`, { method:"PATCH", body:JSON.stringify({ drix: Math.max(100, dB1 + varB) }), prefer:"return=minimal" }),
        sb(`joueurs?id=eq.${config.teamB[1]?.id}`, { method:"PATCH", body:JSON.stringify({ drix: Math.max(100, dB2 + varB) }), prefer:"return=minimal" }),
      ]);
      // Publier sur le Comptoir
      const contenu =
        `👥 Doublette 2v2 — ${config.mode} · ${config.manches} manche${config.manches > 1 ? "s" : ""}\n` +
        `🏆 ${winTeam.map(p => p.pseudo).join(" & ")} remportent la partie !\n` +
        `💀 ${loseTeam.map(p => p.pseudo).join(" & ")} s'inclinent\n` +
        `📈 +${winVar} DRIX / ${loseVar} DRIX`;
      await sb("wall_posts", {
        method: "POST",
        body: JSON.stringify({
          joueur_id:    joueur.id,
          joueur_pseudo: joueur.pseudo,
          joueur_photo:  joueur.photo || null,
          contenu,
          date: Date.now(),
        }),
      }).catch(e => console.error("Comptoir doublette:", e));
    } catch(e) { console.error("DRIX doublette:", e); }
    try { localStorage.removeItem("dp_doublette"); } catch {}
  };

  return (
    <Scoreur
      duel={fakeDuel}
      drixData={drixData}
      onResultat={handleResultat}
      onDuelTermine={() => { try { localStorage.removeItem("dp_doublette"); } catch {} }}
      setPage={setPage}
    />
  );
};

// ── COMPOSANTS COMMUNAUTÉ ─────────────────────────────────────────────────────
const tempsDepuis = (ts) => {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d}j`;
  return new Date(ts).toLocaleDateString("fr-FR", { day:"numeric", month:"short" });
};

const FeedAvatar = ({ photo, pseudo, size=40 }) => {
  const cols = ["#f97316","#3b82f6","#10b981","#a855f7","#ec4899","#eab308"];
  const col = cols[pseudo ? pseudo.charCodeAt(0) % cols.length : 0];
  return (
    <div style={{ width:size,height:size,borderRadius:"50%",background:col,overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:Math.round(size*0.4),color:"#fff",position:"relative" }}>
      {photo && <img src={photo} alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }} onError={e=>{e.currentTarget.style.display="none";}}/>}
      <span style={{ position:"relative",zIndex:1 }}>{(pseudo?.[0]||"?").toUpperCase()}</span>
    </div>
  );
};

// Bouton like
const LikeButton = ({ refId, joueur, initialCount=0, initialMyLike=false }) => {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialMyLike);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (!joueur || busy) return;
    setBusy(true);
    try {
      if (liked) {
        await sb(`wall_likes?ref_id=eq.${refId}&joueur_id=eq.${joueur.id}`, { method:"DELETE", prefer:"return=minimal" });
        setCount(c=>c-1); setLiked(false);
      } else {
        await sb("wall_likes", { method:"POST", body:JSON.stringify({ ref_id:refId, joueur_id:joueur.id, joueur_pseudo:joueur.pseudo, date:Date.now() }) });
        setCount(c=>c+1); setLiked(true);
      }
    } catch{}
    setBusy(false);
  };
  return (
    <button onClick={toggle} style={{ background:"none", border:`1px solid ${liked?"#f97316":"#2a2a2a"}`, borderRadius:20, padding:"4px 14px", color:liked?"#f97316":"#94a3b8", fontSize:12, fontWeight:600, cursor:joueur?"pointer":"default", display:"flex", alignItems:"center", gap:5, touchAction:"manipulation", transition:"all .15s" }}>
      👍 {count>0?count:""}
    </button>
  );
};

// Section commentaires
const CommentSection = ({ refId, joueur, initialComments=[] }) => {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(initialComments);
  const [texte, setTexte] = useState("");
  const [busy, setBusy] = useState(false);

  const publier = async () => {
    if (!texte.trim() || !joueur || busy) return;
    setBusy(true);
    try {
      const r = await sb("wall_comments", { method:"POST", body:JSON.stringify({ ref_id:refId, joueur_id:joueur.id, joueur_pseudo:joueur.pseudo, joueur_photo:joueur.photo||null, contenu:texte.trim(), date:Date.now() }) });
      if (r?.[0]) setComments(c=>[...c, r[0]]);
      setTexte("");
    } catch{}
    setBusy(false);
  };

  const totalComments = comments.length;
  return (
    <div style={{ marginTop:10, borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <button onClick={()=>setOpen(o=>!o)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:20, padding:"4px 14px", color:C.muted, fontSize:12, fontWeight:600, cursor:"pointer", touchAction:"manipulation" }}>
          💬 {totalComments>0?`${totalComments} commentaire${totalComments>1?"s":""}` : "Commenter"}
        </button>
      </div>
      {open && (
        <div style={{ marginTop:10 }}>
          {comments.map((c,i) => (
            <div key={c.id||i} style={{ display:"flex", gap:8, marginBottom:8, alignItems:"flex-start" }}>
              <FeedAvatar photo={c.joueur_photo} pseudo={c.joueur_pseudo} size={28}/>
              <div style={{ background:"#0f0f0f", borderRadius:10, padding:"6px 10px", flex:1 }}>
                <span style={{ fontWeight:700, fontSize:12, color:C.text }}>{c.joueur_pseudo} </span>
                <span style={{ fontSize:13, color:C.text }}>{c.contenu}</span>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{tempsDepuis(c.date)}</div>
              </div>
            </div>
          ))}
          {joueur && (
            <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:6 }}>
              <FeedAvatar photo={joueur.photo} pseudo={joueur.pseudo} size={28}/>
              <input value={texte} onChange={e=>setTexte(e.target.value)} onKeyDown={e=>e.key==="Enter"&&publier()}
                placeholder="Écrire un commentaire…" maxLength={300}
                style={{ flex:1, background:"#0f0f0f", border:`1px solid ${C.border}`, borderRadius:20, padding:"7px 14px", color:C.text, fontSize:13, outline:"none", fontFamily:"inherit" }}/>
              <button onClick={publier} disabled={!texte.trim()||busy} style={{ background:texte.trim()?C.accent:"#2a2a2a", color:texte.trim()?"#fff":C.muted, border:"none", borderRadius:20, padding:"7px 14px", fontWeight:700, fontSize:12, cursor:texte.trim()?"pointer":"default", touchAction:"manipulation" }}>
                {busy?"…":"Envoyer"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Détail des manches
const MancheDetail = ({ manches, joueur0, joueur1 }) => {
  const [open, setOpen] = useState(false);
  if (!manches || manches.length === 0) return null;
  return (
    <div style={{ marginTop:10, borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ background:"none", border:"none", color:C.muted, fontSize:12, fontWeight:600, cursor:"pointer", padding:0, touchAction:"manipulation" }}>
        {open?"▾":"▸"} Détail manche par manche ({manches.length})
      </button>
      {open && (
        <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6 }}>
          {manches.map((m, i) => (
            <div key={i} style={{ background:"#0f0f0f", borderRadius:10, padding:"10px 12px" }}>
              <div style={{ fontWeight:700, fontSize:12, color:C.accent, marginBottom:6 }}>Manche {i+1} — {m.winner} 🏆</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:11 }}>
                <div>
                  <div style={{ fontWeight:700, color:"#10b981", marginBottom:2 }}>{m.winner}</div>
                  <div style={{ color:C.muted }}>{m.winner_volees} volée{m.winner_volees>1?"s":""}</div>
                  <div style={{ color:C.muted }}>moy. {m.winner_moy} pts/volée</div>
                </div>
                <div>
                  <div style={{ fontWeight:700, color:"#ef4444", marginBottom:2 }}>{m.loser}</div>
                  <div style={{ color:C.muted }}>{m.loser_volees} volée{m.loser_volees>1?"s":""}</div>
                  <div style={{ color:C.muted }}>moy. {m.loser_moy} pts/volée</div>
                  <div style={{ color:"#f59e0b", fontWeight:600 }}>reste : {m.reste_loser} pts</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── PAGE COMMUNAUTÉ ────────────────────────────────────────────────────────────
const PageCommunaute = ({ joueur, setPage, bars }) => {
  const [feed, setFeed] = useState([]);
  const [photosMap, setPhotosMap] = useState({});
  const [likesMap, setLikesMap] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [texte, setTexte] = useState("");
  const [posting, setPosting] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const chargerFeed = useCallback(async () => {
    if (!joueur?.id) return;
    setErreur(null);
    try {
      // 1. Récupérer les IDs amis
      const [amisA, amisB] = await Promise.all([
        sb(`amis?joueur_id=eq.${joueur.id}&statut=eq.accepte&select=ami_id`),
        sb(`amis?ami_id=eq.${joueur.id}&statut=eq.accepte&select=joueur_id`),
      ]);
      const amiIds = [
        joueur.id,
        ...(amisA||[]).map(a=>a.ami_id),
        ...(amisB||[]).map(a=>a.joueur_id),
      ].filter((v,i,arr)=>arr.indexOf(v)===i);

      const inList = amiIds.join(",");

      // 2. Charger posts, duels, presences, photos en parallèle
      const [posts, duels, presences, joueursData] = await Promise.all([
        sb(`wall_posts?joueur_id=in.(${inList})&order=date.desc&limit=30&select=*`).catch(()=>[]),
        sb(`duels?or=(challenger_id.in.(${inList}),defie_id.in.(${inList}))&statut=eq.termine&order=date.desc&limit=40&select=*`).catch(()=>[]),
        sb(`presences?joueur_id=in.(${inList})&order=heure.desc&limit=20&select=*`).catch(()=>[]),
        sb(`joueurs?id=in.(${inList})&select=id,photo`).catch(()=>[]),
      ]);

      // 3. Charger drix_mouvements : paliers amis + tous participants duels + entraînements amis
      const duelIds = (duels||[]).filter(d=>d?.id).map(d=>d.id);
      const [friendDrixMvts, duelDrixMvts, trainingDrixMvts] = await Promise.all([
        sb(`drix_mouvements?joueur_id=in.(${inList})&order=date.desc&limit=100&select=*`).catch(()=>[]),
        duelIds.length > 0
          ? sb(`drix_mouvements?duel_id=in.(${duelIds.join(",")})&select=*`).catch(()=>[])
          : Promise.resolve([]),
        sb(`drix_mouvements?duel_id=is.null&joueur_id=in.(${inList})&order=date.desc&limit=40&select=*`).catch(()=>[]),
      ]);
      // Fusionner et dédoublonner par id
      const seenMvt = new Set();
      const drixMvts = [...(friendDrixMvts||[]), ...(duelDrixMvts||[]), ...(trainingDrixMvts||[])].filter(m => {
        const key = m?.id ?? (m?.joueur_id + "_" + m?.duel_id + "_" + m?.date);
        if (!m || seenMvt.has(key)) return false;
        seenMvt.add(key);
        return true;
      });

      // Construire la map id → photo
      const pMap = {};
      (joueursData||[]).forEach(j => { if (j.photo) pMap[j.id] = j.photo; });
      setPhotosMap(pMap);

      const items = [];

      // Posts texte
      (posts||[]).forEach(p => {
        if (p?.date) items.push({ type:"post", date:p.date, data:p });
      });

      // Map duel_id → { joueur_id: variation } pour afficher DRIX dans les matchs
      const mvtMap = {};
      (drixMvts||[]).forEach(m => {
        if (!m?.duel_id) return;
        if (!mvtMap[m.duel_id]) mvtMap[m.duel_id] = {};
        mvtMap[m.duel_id][m.joueur_id] = m.variation;
      });

      // Matchs terminés (dédoublonnés)
      const seenDuels = new Set();
      (duels||[]).forEach(d => {
        if (!d?.id || seenDuels.has(d.id)) return;
        seenDuels.add(d.id);
        const ts = typeof d.date === "number" ? d.date : new Date(d.date).getTime();
        items.push({ type:"match", date:ts, data:d, drixMvts: mvtMap[d.id] || {} });
      });

      // Mouvements DRIX — seulement les passages de palier
      const PALIERS = [800,900,1000,1100,1200,1300,1500,1800,2000,2500,3000];
      (drixMvts||[]).forEach(m => {
        if (!m?.date) return;
        // Mouvements d'entraînement (Comptage de finish)
        if (m.adversaire_pseudo === "Comptage de finish" && !m.duel_id) {
          const ts = typeof m.date === "number" ? m.date : new Date(m.date).getTime();
          items.push({ type:"training_drix", date:ts, data:m });
          return;
        }
        const avant = m.drix_avant || 1000;
        const apres = m.drix_apres || 1000;
        const franchisUp = PALIERS.filter(t => t > avant && t <= apres);
        const franchisDown = PALIERS.filter(t => t < avant && t >= apres);
        if (franchisUp.length > 0 || franchisDown.length > 0) {
          const ts = typeof m.date === "number" ? m.date : new Date(m.date).getTime();
          const direction = franchisUp.length > 0 ? "up" : "down";
          const palier = direction === "up" ? franchisUp[franchisUp.length-1] : franchisDown[0];
          items.push({ type:"drix_milestone", date:ts, data:{ ...m, direction, palier } });
        }
      });

      // Présences bar
      (presences||[]).forEach(p => {
        if (!p) return;
        const ts = typeof p.heure === "number" ? p.heure
          : p.heure ? new Date(`${p.date_jour}T${p.heure}`).getTime()
          : new Date(p.date_jour).getTime();
        items.push({ type:"presence", date:ts, data:p });
      });

      // Tri par date décroissante
      items.sort((a,b) => b.date - a.date);
      const sliced = items.slice(0, 60);
      setFeed(sliced);

      // 3. Charger les likes et commentaires pour tous les items du fil
      const allIds = sliced.map(item => item.data?.id).filter(Boolean);
      if (allIds.length > 0) {
        const idList = allIds.join(",");
        const [likesData, commentsData] = await Promise.all([
          sb(`wall_likes?ref_id=in.(${idList})&select=*`).catch(()=>[]),
          sb(`wall_comments?ref_id=in.(${idList})&order=date.asc&select=*`).catch(()=>[]),
        ]);
        // Construire likesMap: ref_id → { count, myLike }
        const lMap = {};
        (likesData||[]).forEach(l => {
          if (!lMap[l.ref_id]) lMap[l.ref_id] = { count:0, myLike:false };
          lMap[l.ref_id].count++;
          if (l.joueur_id === joueur?.id) lMap[l.ref_id].myLike = true;
        });
        setLikesMap(lMap);
        // Construire commentsMap: ref_id → comments[]
        const cMap = {};
        (commentsData||[]).forEach(c => {
          if (!cMap[c.ref_id]) cMap[c.ref_id] = [];
          cMap[c.ref_id].push(c);
        });
        setCommentsMap(cMap);
      }
    } catch(e) {
      console.error("Feed error", e);
      setErreur("Impossible de charger le fil d'actualité.");
    } finally {
      setLoading(false);
    }
  }, [joueur?.id, refreshTick]);

  useEffect(() => { chargerFeed(); }, [chargerFeed]);

  const publier = async () => {
    if (!texte.trim() || posting) return;
    setPosting(true);
    setErreur(null);
    try {
      await sb("wall_posts", {
        method:"POST",
        body:JSON.stringify({
          joueur_id: joueur.id,
          joueur_pseudo: joueur.pseudo,
          joueur_photo: joueur.photo || null,
          contenu: texte.trim(),
          date: Date.now(),
        }),
      });
      setTexte("");
      setRefreshTick(t => t+1);
    } catch(e) {
      setErreur("Erreur lors de la publication. Vérifie la table wall_posts dans Supabase.");
    } finally {
      setPosting(false);
    }
  };

  // ─── Renderers ────────────────────────────────────────────────────────────
  const cardBase = { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"14px 16px", marginBottom:10 };

  const renderPost = (item) => {
    const p = item.data;

    // ── Badge post ──────────────────────────────────────────────────────────
    if (p.contenu?.startsWith("__BADGE__|")) {
      let badge = null;
      try { badge = JSON.parse(p.contenu.slice(10)); } catch {}
      if (badge) return (
        <div key={`post-${p.id}`} style={{ ...cardBase,
          background:`linear-gradient(135deg,${badge.couleur}12,#1a1a1a)`,
          border:`1px solid ${badge.couleur}44`,
          boxShadow:`0 0 20px ${badge.couleur}18` }}>
          {/* Header */}
          <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:12 }}>
            <FeedAvatar photo={p.joueur_photo} pseudo={p.joueur_pseudo} size={40}/>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,fontSize:14 }}>
                <span style={{ color:C.text }}>{p.joueur_pseudo}</span>
                <span style={{ color:C.muted,fontWeight:400 }}> a débloqué un badge !</span>
              </div>
              <div style={{ fontSize:11,color:C.muted }}>{tempsDepuis(p.date)}</div>
            </div>
            <span style={{ fontSize:22 }}>🏅</span>
          </div>
          {/* Badge card */}
          <div style={{ display:"flex",alignItems:"center",gap:14,background:badge.couleur+"18",border:`1px solid ${badge.couleur}55`,borderRadius:12,padding:"12px 16px",marginBottom:10 }}>
            <span style={{ fontSize:36,filter:`drop-shadow(0 0 8px ${badge.couleur})` }}>{badge.emoji}</span>
            <div>
              <div style={{ fontWeight:800,fontSize:16,color:badge.couleur }}>{badge.nom}</div>
              <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{badge.desc}</div>
            </div>
            <div style={{ marginLeft:"auto",fontSize:18 }}>✅</div>
          </div>
          {/* Likes */}
          <div style={{ display:"flex",gap:8,marginTop:4 }}>
            <LikeButton refId={p.id} joueur={joueur} initialCount={likesMap[p.id]?.count||0} initialMyLike={likesMap[p.id]?.myLike||false}/>
          </div>
          <CommentSection refId={p.id} joueur={joueur} initialComments={commentsMap[p.id]||[]}/>
        </div>
      );
    }

    // ── Post texte normal ────────────────────────────────────────────────────
    return (
      <div key={`post-${p.id}`} style={cardBase}>
        <div style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:10 }}>
          <FeedAvatar photo={p.joueur_photo} pseudo={p.joueur_pseudo} size={42}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700,fontSize:14,color:C.text }}>{p.joueur_pseudo}</div>
            <div style={{ fontSize:11,color:C.muted }}>{tempsDepuis(p.date)}</div>
          </div>
        </div>
        <div style={{ fontSize:14,lineHeight:1.65,color:C.text,whiteSpace:"pre-wrap",paddingLeft:52 }}>{p.contenu}</div>
        <div style={{ display:"flex",gap:8,marginTop:10,paddingLeft:52 }}>
          <LikeButton refId={p.id} joueur={joueur} initialCount={likesMap[p.id]?.count||0} initialMyLike={likesMap[p.id]?.myLike||false}/>
        </div>
        <CommentSection refId={p.id} joueur={joueur} initialComments={commentsMap[p.id]||[]}/>
      </div>
    );
  };

  const renderMatch = (item) => {
    const d = item.data;
    const drixMap = item.drixMvts || {};
    const cScore = d.score_manches_challenger ?? 0;
    const dScore = d.score_manches_defie ?? 0;
    const moyC = d.score_challenger ? Math.round(d.score_challenger) : null;
    const moyD = d.score_defie ? Math.round(d.score_defie) : null;
    const cWin = cScore > dScore;
    const dWin = dScore > cScore;
    const draw = cScore === dScore;
    return (
      <div key={`match-${d.id}`} style={{ ...cardBase, borderColor:"#f9731622" }}>
        <div style={{ fontSize:11,color:C.accent,fontWeight:700,marginBottom:10,display:"flex",alignItems:"center",gap:6 }}>
          ⚔️ Match terminé
          <span style={{ color:C.muted,fontWeight:400 }}>· {tempsDepuis(item.date)}</span>
        </div>
        {[
          { id:d.challenger_id, pseudo:d.challenger_pseudo, score:cScore, moy:moyC, win:cWin },
          { id:d.defie_id, pseudo:d.defie_pseudo, score:dScore, moy:moyD, win:dWin },
        ].map((p,i) => {
          const variation = drixMap[p.id];
          return (
          <div key={i} style={{ display:"flex",alignItems:"center",gap:10,marginBottom:i===0?8:0 }}>
            <FeedAvatar photo={photosMap[p.id]||null} pseudo={p.pseudo} size={36}/>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,fontSize:14,color:p.win?"#10b981":draw?"#eab308":C.muted }}>
                {p.pseudo} {p.win?"🏆":""}
              </div>
              {p.moy!==null && <div style={{ fontSize:11,color:C.muted }}>moy. {p.moy} pts/volée</div>}
            </div>
            <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2 }}>
              <div style={{ fontWeight:800,fontSize:22,color:p.win?"#10b981":draw?"#eab308":"#ef4444",minWidth:28,textAlign:"right" }}>{p.score}</div>
              {variation !== undefined && (
                <div style={{ fontWeight:800,fontSize:12,color:variation>0?"#22c55e":"#ef4444",background:variation>0?"#14532d":"#7f1d1d",borderRadius:6,padding:"1px 7px",whiteSpace:"nowrap" }}>
                  {variation>0?"+":""}{variation} DRIX
                </div>
              )}
            </div>
          </div>
          );
        })}
        <MancheDetail manches={d.manches_detail}/>
        {/* ── Récap DRIX ── */}
        {(drixMap[d.challenger_id] !== undefined || drixMap[d.defie_id] !== undefined) && (() => {
          const vC = drixMap[d.challenger_id];
          const vD = drixMap[d.defie_id];
          const gagnantId = d.gagnant_id;
          const [gagnantPseudo, perdantPseudo, vGain, vPerte] =
            gagnantId === d.challenger_id
              ? [d.challenger_pseudo, d.defie_pseudo, vC, vD]
              : [d.defie_pseudo, d.challenger_pseudo, vD, vC];
          return (
            <div style={{ marginTop:10, background:"#0f0f0f", borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>💎 DRIX</span>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {vGain !== undefined && (
                  <span style={{ background:"#14532d", color:"#22c55e", borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:800 }}>
                    🏆 {gagnantPseudo} <b>+{vGain}</b>
                  </span>
                )}
                {vPerte !== undefined && (
                  <span style={{ background:"#7f1d1d", color:"#ef4444", borderRadius:20, padding:"3px 10px", fontSize:12, fontWeight:800 }}>
                    {perdantPseudo} <b>{vPerte}</b>
                  </span>
                )}
              </div>
            </div>
          );
        })()}
        <div style={{ display:"flex",gap:8,marginTop:10 }}>
          <LikeButton refId={d.id} joueur={joueur} initialCount={likesMap[d.id]?.count||0} initialMyLike={likesMap[d.id]?.myLike||false}/>
        </div>
        <CommentSection refId={d.id} joueur={joueur} initialComments={commentsMap[d.id]||[]}/>
      </div>
    );
  };

  const renderMilestone = (item) => {
    const m = item.data;
    const up = m.direction === "up";
    const { emoji, titre } = getDrixTitre(m.drix_apres || 1000);
    return (
      <div key={`drix-${m.id||item.date}`} style={{ ...cardBase, borderColor: up?"#10b98133":"#ef444433", background: up?"#10b98108":"#ef444408" }}>
        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          <FeedAvatar photo={photosMap[m.joueur_id]||null} pseudo={m.joueur_pseudo} size={42}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700,fontSize:14,color:C.text }}>{m.joueur_pseudo}</div>
            <div style={{ fontSize:13,color: up?"#10b981":"#ef4444",fontWeight:600,marginTop:3 }}>
              {up ? "⬆️ Nouveau palier DRIX !" : "⬇️ Palier perdu"}
            </div>
            <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{emoji} {titre} — {m.drix_apres} DRIX</div>
          </div>
          <div style={{ fontSize:34 }}>{emoji}</div>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",marginTop:8 }}>
          <span style={{ fontSize:11,color:C.muted }}>{tempsDepuis(item.date)}</span>
          <LikeButton refId={m.id} joueur={joueur} initialCount={likesMap[m.id]?.count||0} initialMyLike={likesMap[m.id]?.myLike||false}/>
        </div>
        <CommentSection refId={m.id} joueur={joueur} initialComments={commentsMap[m.id]||[]}/>
      </div>
    );
  };

  const renderTrainingDrix = (item) => {
    const m = item.data;
    const gain = m.variation > 0;
    return (
      <div key={`tdrix-${m.id||item.date}`} style={{ ...cardBase, borderColor: gain?"#f97316aa":"#ef444433", background: gain?"#f9731608":"#ef444408" }}>
        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          <FeedAvatar photo={photosMap[m.joueur_id]||null} pseudo={m.joueur_pseudo} size={42}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700,fontSize:14,color:C.text }}>{m.joueur_pseudo}</div>
            <div style={{ fontSize:13,color: gain?"#f97316":"#ef4444",fontWeight:600,marginTop:3 }}>
              🎯 {gain ? `+${m.variation} DRIX gagnés` : `${m.variation} DRIX perdus`} en Comptage de finish
            </div>
            <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>
              {m.drix_apres} DRIX au total
            </div>
          </div>
          <div style={{ fontSize:30 }}>{gain ? "🔥" : "💥"}</div>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",marginTop:8 }}>
          <span style={{ fontSize:11,color:C.muted }}>{tempsDepuis(item.date)}</span>
          <LikeButton refId={m.id} joueur={joueur} initialCount={likesMap[m.id]?.count||0} initialMyLike={likesMap[m.id]?.myLike||false}/>
        </div>
        <CommentSection refId={m.id} joueur={joueur} initialComments={commentsMap[m.id]||[]}/>
      </div>
    );
  };

  const renderPresence = (item) => {
    const p = item.data;
    const bar = bars?.find(b=>b.slug===p.bar_slug);
    return (
      <div key={`pres-${p.id||item.date}`} style={{ ...cardBase, borderColor:"#3b82f633" }}>
        <div style={{ display:"flex",gap:10,alignItems:"center" }}>
          <FeedAvatar photo={photosMap[p.joueur_id]||null} pseudo={p.joueur_pseudo} size={42}/>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700,fontSize:14,color:C.text }}>{p.joueur_pseudo}</div>
            <div style={{ fontSize:13,color:"#60a5fa",fontWeight:600,marginTop:3 }}>
              🍺 Est au bar{bar ? ` — ${bar.nom}` : p.bar_slug ? ` (${p.bar_slug})` : ""}
            </div>
          </div>
        </div>
        <div style={{ display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",marginTop:8 }}>
          <span style={{ fontSize:11,color:C.muted }}>{tempsDepuis(item.date)}</span>
          <LikeButton refId={p.id} joueur={joueur} initialCount={likesMap[p.id]?.count||0} initialMyLike={likesMap[p.id]?.myLike||false}/>
        </div>
        <CommentSection refId={p.id} joueur={joueur} initialComments={commentsMap[p.id]||[]}/>
      </div>
    );
  };

  const renderItem = (item, idx) => {
    if (item.type==="post") return renderPost(item);
    if (item.type==="match") return renderMatch(item);
    if (item.type==="drix_milestone") return renderMilestone(item);
    if (item.type==="training_drix") return renderTrainingDrix(item);
    if (item.type==="presence") return renderPresence(item);
    return null;
  };

  return (
    <div style={{ maxWidth:700,margin:"0 auto",padding:"24px 16px" }}>
      <button onClick={()=>setPage("home")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",marginBottom:16,fontSize:13 }}>← Accueil</button>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4 }}>
        <h1 style={{ fontWeight:800,fontSize:22,margin:0 }}>👥 Communauté</h1>
        <button onClick={()=>{ setLoading(true); setRefreshTick(t=>t+1); }} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18,padding:4 }} title="Rafraîchir">🔄</button>
      </div>
      <p style={{ color:C.muted,fontSize:13,marginBottom:20 }}>L'actualité de tes amis</p>

      {/* Compositeur de post */}
      {joueur && (
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:16,marginBottom:20 }}>
          <div style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
            <FeedAvatar photo={joueur.photo} pseudo={joueur.pseudo} size={42}/>
            <div style={{ flex:1 }}>
              <textarea
                value={texte}
                onChange={e=>setTexte(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&e.ctrlKey) publier(); }}
                placeholder="Quoi de neuf ? Partage quelque chose avec tes amis… (Ctrl+Entrée pour publier)"
                style={{ width:"100%",background:"#0f0f0f",border:`1px solid ${texte.trim()?C.accent:C.border}`,borderRadius:10,padding:"10px 12px",color:C.text,fontSize:14,resize:"vertical",minHeight:76,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color .15s" }}
                maxLength={500}
              />
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8 }}>
                <span style={{ fontSize:11,color:C.muted }}>{texte.length}/500</span>
                <button onClick={publier} disabled={!texte.trim()||posting}
                  style={{ background:texte.trim()?C.accent:"#2a2a2a",color:texte.trim()?"#fff":C.muted,border:"none",borderRadius:8,padding:"8px 20px",fontWeight:700,fontSize:14,cursor:texte.trim()?"pointer":"default",transition:"all .15s" }}>
                  {posting ? "⏳" : "Publier"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {erreur && (
        <div style={{ background:"#ef444422",border:"1px solid #ef444455",borderRadius:10,padding:"10px 14px",color:"#ef4444",fontSize:13,marginBottom:16 }}>
          ⚠️ {erreur}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:"center",color:C.muted,padding:48,fontSize:14 }}>⏳ Chargement du fil…</div>
      ) : feed.length === 0 ? (
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:40,textAlign:"center" }}>
          <div style={{ fontSize:52,marginBottom:14 }}>👥</div>
          <h2 style={{ fontWeight:700,fontSize:18,marginBottom:8 }}>Fil vide pour l'instant</h2>
          <p style={{ color:C.muted,fontSize:14,lineHeight:1.6,maxWidth:300,margin:"0 auto" }}>
            Ajoute des amis et jouez des matchs pour voir l'activité ici.
          </p>
        </div>
      ) : (
        <div>{feed.map((item,idx) => renderItem(item,idx))}</div>
      )}
    </div>
  );
};

// ── PAGE MODE JEU ─────────────────────────────────────────────────────────────
const PageModeJeu = ({ joueur, setPage, initCat=null }) => {
  const [categorie, setCategorie] = useState(initCat);

  // Carte jeu active
  const ModeBtn = ({ icon, label, sub, onClick, col, badge }) => (
    <div onClick={onClick}
      style={{ background:"linear-gradient(135deg,#1a1a1a,#141414)",border:`2px solid ${col}33`,borderRadius:16,padding:"18px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,transition:"all .15s",userSelect:"none",position:"relative",overflow:"hidden" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=col;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px ${col}22`;}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=col+"33";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
      <div style={{ fontSize:36,flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:800,fontSize:16,color:"#f1f5f9",marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:12,color:"#94a3b8",lineHeight:1.4 }}>{sub}</div>
      </div>
      {badge && <span style={{ background:`${col}22`,border:`1px solid ${col}55`,color:col,fontSize:11,fontWeight:700,borderRadius:6,padding:"3px 7px",flexShrink:0 }}>{badge}</span>}
      {!badge && <div style={{ fontSize:13,color:col,fontWeight:700,flexShrink:0 }}>→</div>}
    </div>
  );

  // Carte jeu à venir (grisée)
  const SoonBtn = ({ icon, label, sub }) => (
    <div style={{ background:"#111",border:`1px solid #2a2a2a`,borderRadius:16,padding:"16px",display:"flex",alignItems:"center",gap:14,opacity:.5,userSelect:"none" }}>
      <div style={{ fontSize:34,flexShrink:0,filter:"grayscale(1)" }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700,fontSize:15,color:"#94a3b8" }}>{label}</div>
        <div style={{ fontSize:12,color:"#64748b",lineHeight:1.4 }}>{sub}</div>
      </div>
      <span style={{ background:"#1a1a1a",border:"1px solid #2a2a2a",color:"#64748b",fontSize:11,fontWeight:700,borderRadius:6,padding:"3px 7px",flexShrink:0 }}>Bientôt</span>
    </div>
  );

  const CatBtn = ({ icon, label, sub, id, col }) => (
    <div onClick={()=>setCategorie(id)}
      style={{ background:`linear-gradient(135deg,${col}18,${col}08)`,border:`2px solid ${col}55`,borderRadius:20,padding:"28px 22px",cursor:"pointer",transition:"all .15s",userSelect:"none",textAlign:"center" }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=`0 14px 32px ${col}33`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
      <div style={{ fontSize:52,marginBottom:10 }}>{icon}</div>
      <div style={{ fontWeight:900,fontSize:20,color:col,marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:13,color:C.muted,lineHeight:1.6,whiteSpace:"pre-line" }}>{sub}</div>
      <div style={{ marginTop:14,background:col,borderRadius:10,padding:"10px",fontWeight:800,fontSize:14,color:"#fff" }}>Accéder →</div>
    </div>
  );

  if (!categorie) return (
    <div style={{ maxWidth:700,margin:"0 auto",padding:"24px 16px" }}>
      <button onClick={()=>setPage("home")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",marginBottom:16,fontSize:13 }}>← Accueil</button>
      <h1 style={{ fontWeight:800,fontSize:22,marginBottom:4 }}>🎮 Mode de jeu</h1>
      <p style={{ color:C.muted,fontSize:13,marginBottom:24 }}>Choisis ta catégorie</p>
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        <CatBtn id="fleche" icon="🎯" label="Jeux avec fléchettes"
          sub={"501 · 301 · Cricket · Around the Clock\nKiller · Shanghai · Tournoi entre potes"} col="#f59e0b"/>
        <CatBtn id="sans"   icon="🧠" label="Jeux sans fléchettes"
          sub={"Rush Mode · Calcul finish\nQuiz · Défis mentaux · Jeux communautaires"} col="#ef4444"/>
      </div>
    </div>
  );

  const back = categorie === "fleche"
    ? <><h1 style={{ fontWeight:800,fontSize:22,marginBottom:2 }}>🎯 Jeux avec fléchettes</h1><p style={{ color:C.muted,fontSize:13,marginBottom:18 }}>Prends ta cible, on joue !</p></>
    : <><h1 style={{ fontWeight:800,fontSize:22,marginBottom:2 }}>🧠 Jeux sans fléchettes</h1><p style={{ color:C.muted,fontSize:13,marginBottom:18 }}>Entraîne ton mental, n'importe où !</p></>;

  return (
    <div style={{ maxWidth:700,margin:"0 auto",padding:"24px 16px" }}>
      <button onClick={()=>setCategorie(null)} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",marginBottom:16,fontSize:13,padding:0 }}>← Catégories</button>
      {back}
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {categorie==="fleche" && <>
          <ModeBtn icon="🎯" label="501"
            sub="Pars de 501 et descends à 0. Termine sur un double."
            onClick={()=>setPage("scoreur")} col="#f97316"/>
          <ModeBtn icon="🎯" label="301"
            sub="Pars de 301 et descends à 0. Termine sur un double."
            onClick={()=>setPage("scoreur")} col="#f59e0b"/>
          <ModeBtn icon="🦗" label="Cricket"
            sub="Ferme les zones 15 à 20 et Bull avant tes adversaires. Mode points ou Cut Throat."
            onClick={()=>setPage("cricket-config")} col="#22c55e"/>
          <SoonBtn icon="🕐" label="Around the Clock" sub="Vise chaque zone dans l'ordre, de 1 à 20." />
          <SoonBtn icon="🐉" label="Shanghai" sub="Marque le max de points sur une zone spécifique chaque tour." />
          <SoonBtn icon="☠️" label="Killer" sub="Deviens killer et élimine tes adversaires." />
          <ModeBtn icon="🏙️" label="Capital"
            sub="Jeu de précision : descends ton score en visant des zones précises."
            onClick={()=>setPage("jeux-capital")} col="#a78bfa"/>
          <ModeBtn icon="🍺" label="Tournoi entre potes"
            sub="Organise un tournoi avec tes amis. Format libre, ambiance garantie."
            onClick={()=>setPage("tournois-potes")} col="#60a5fa"/>
        </>}
        {categorie==="sans" && <>
          <ModeBtn icon="⚡" label="Rush Mode"
            sub="Calcul mental sous pression : score, finishes, bust, routes. 3 niveaux, combos et badges !"
            onClick={()=>setPage("rush-mode")} col="#ef4444"/>
          <ModeBtn icon="🎯" label="Calcul finish"
            sub="Entraîne-toi à construire tes finishes en 1, 2 ou 3 fléchettes."
            onClick={()=>setPage("entrainement-finish")} col="#f97316"/>
          <SoonBtn icon="🧩" label="Quiz fléchettes" sub="Teste tes connaissances sur les règles, les pros et l'histoire du fléché." />
          <SoonBtn icon="🧠" label="Défis mentaux" sub="Calcul rapide, mémoire des zones, routes optimales..." />
          <SoonBtn icon="👥" label="Jeux communautaires" sub="Défis partagés, classements hebdo, événements spéciaux." />
        </>}
      </div>
    </div>
  );
};

// ── PAGE HOME ─────────────────────────────────────────────────────────────────
const Home = ({ joueur, setJoueur, defisCount, demandesAmisCount=0, bars, associations, tournois, setPage, setBarSlug, setAssoSlug, setTournoiSlug, setVilleFilter, barsActifs }) => {
  if (joueur) return <HomeDashboard joueur={joueur} setJoueur={setJoueur} setPage={setPage} bars={bars} defisCount={defisCount} demandesAmisCount={demandesAmisCount} associations={associations} tournois={tournois} barsActifs={barsActifs} setBarSlug={setBarSlug} setAssoSlug={setAssoSlug} setTournoiSlug={setTournoiSlug}/>;

  // ── Landing page publique ─────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#0a0a0a 0%,#1a0800 50%,#0a0a10 100%)",
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"32px 20px",
      fontFamily:"Inter,sans-serif",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes glow   { 0%,100% { filter:drop-shadow(0 0 18px #f9731655); } 50% { filter:drop-shadow(0 0 36px #f97316aa); } }
        .lp-btn { transition: transform .15s, box-shadow .15s; }
        .lp-btn:active { transform:scale(0.97) !important; }
      `}</style>

      {/* Logo */}
      <div style={{ animation:"fadeUp .5s ease-out both", marginBottom:40 }}>
        <img
          src="/logo dart point/logo 2 accueil.png"
          alt="DartPoint"
          style={{ width:"clamp(160px,42vw,240px)", borderRadius:22, animation:"glow 3s ease-in-out infinite" }}
        />
      </div>

      {/* Boutons */}
      <div style={{ width:"100%", maxWidth:420, display:"flex", flexDirection:"column", gap:16, animation:"fadeUp .5s .1s ease-out both" }}>

        {/* Bouton 1 — Trouve un bar */}
        <div
          className="lp-btn"
          onClick={() => setPage("bars")}
          style={{
            background:"linear-gradient(135deg,#f97316,#ea580c)",
            borderRadius:18, padding:"26px 24px",
            cursor:"pointer", userSelect:"none",
            boxShadow:"0 8px 32px #f9731644",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 14px 40px #f9731666"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.boxShadow="0 8px 32px #f9731644"; }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ fontSize:42, lineHeight:1 }}>🎯</div>
            <div>
              <div style={{ fontWeight:900, fontSize:"clamp(17px,4.5vw,20px)", color:"#fff", marginBottom:4 }}>
                Trouve un bar pour jouer
              </div>
              <div style={{ fontSize:13, color:"#ffffffbb", lineHeight:1.5 }}>
                Trouve un bar près de toi<br/>
                Une association ou un tournoi
              </div>
            </div>
            <div style={{ marginLeft:"auto", fontSize:22, color:"#ffffffaa" }}>›</div>
          </div>
        </div>

        {/* Bouton 2 — Mon profil DRIX */}
        <div
          className="lp-btn"
          onClick={() => setPage("connexion")}
          style={{
            background:"linear-gradient(135deg,#1a1a2e,#0f0f1a)",
            border:"2px solid #a78bfa55",
            borderRadius:18, padding:"26px 24px",
            cursor:"pointer", userSelect:"none",
            boxShadow:"0 8px 32px #a78bfa22",
          }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.borderColor="#a78bfaaa"; e.currentTarget.style.boxShadow="0 14px 40px #a78bfa44"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.borderColor="#a78bfa55"; e.currentTarget.style.boxShadow="0 8px 32px #a78bfa22"; }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <div style={{ fontSize:42, lineHeight:1 }}>💎</div>
            <div>
              <div style={{ fontWeight:900, fontSize:"clamp(17px,4.5vw,20px)", color:"#fff", marginBottom:4 }}>
                Mon profil DRIX
              </div>
              <div style={{ fontSize:13, color:"#ffffffbb", lineHeight:1.5 }}>
                Affronte tes amis<br/>
                Suis ta progression
              </div>
            </div>
            <div style={{ marginLeft:"auto", fontSize:22, color:"#a78bfaaa" }}>›</div>
          </div>
        </div>
      </div>

      {/* Signature discrète */}
      <div style={{ marginTop:40, color:"#ffffff22", fontSize:11, letterSpacing:1, animation:"fadeUp .5s .2s ease-out both" }}>
        DART POINT · Le réseau fléchettes
      </div>
    </div>
  );
};

// ── PAGE BARS ─────────────────────────────────────────────────────────────────
const Bars = ({ bars, setPage, setBarSlug, villeFilter, setVilleFilter, barsActifs }) => {
  const [search,setSearch]=useState("");
  const [view,setView]=useState("carte");
  const [userPos,setUserPos]=useState(null);
  const [geoLoading,setGeoLoading]=useState(false);
  const [geoErr,setGeoErr]=useState("");
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [filterType,setFilterType]=useState("tous");
  const [filterCibles,setFilterCibles]=useState(0);
  const [filterAsso,setFilterAsso]=useState(false);
  const [filterTournoi,setFilterTournoi]=useState(false);
  const [filterDist,setFilterDist]=useState(0);

  useEffect(()=>{ if(villeFilter){setSearch(villeFilter);setVilleFilter(null);} },[villeFilter]);

  const geolocate=()=>{
    if(!navigator.geolocation){setGeoErr("Géolocalisation non supportée par ce navigateur");return;}
    if(userPos){setUserPos(null);setGeoErr("");return;}
    setGeoLoading(true);setGeoErr("");
    navigator.geolocation.getCurrentPosition(
      pos=>{setUserPos({lat:pos.coords.latitude,lng:pos.coords.longitude});setGeoLoading(false);setSearch("");},
      ()=>{setGeoErr("Position non disponible — vérifiez les permissions");setGeoLoading(false);}
    );
  };

  const resetFilters=()=>{setFilterType("tous");setFilterCibles(0);setFilterAsso(false);setFilterTournoi(false);setFilterDist(0);};
  const activeFilters=[filterType!=="tous",filterCibles>0,filterAsso,filterTournoi,filterDist>0].filter(Boolean).length;

  const filtered=useMemo(()=>{
    const q=search.toLowerCase();
    let list=bars.filter(b=>{
      if(q&&!b.ville.toLowerCase().includes(q)&&!b.nom.toLowerCase().includes(q)) return false;
      if(filterType!=="tous"&&b.type!==filterType) return false;
      if(filterCibles>0&&(b.cibles||0)<filterCibles) return false;
      if(filterAsso&&!b.association) return false;
      if(filterTournoi&&!b.tournois) return false;
      return true;
    });
    if(userPos){
      list=list.map(b=>({...b,_dist:b.lat&&b.lng?haversine(userPos.lat,userPos.lng,b.lat,b.lng):Infinity})).sort((a,b)=>a._dist-b._dist);
      if(filterDist>0) list=list.filter(b=>b._dist<=filterDist);
    }
    return list;
  },[bars,search,filterType,filterCibles,filterAsso,filterTournoi,filterDist,userPos]);

  return (
    <div style={{ maxWidth:980,margin:"0 auto",padding:"24px 16px 88px" }}>

      {/* HEADER */}
      <div style={{ marginBottom:20 }}>
        <h1 style={{ fontWeight:800,fontSize:24,marginBottom:4 }}>Bars à fléchettes près de toi</h1>
        <p style={{ color:C.muted,fontSize:13 }}>
          {filtered.length} lieu{filtered.length>1?"x":""} trouvé{filtered.length>1?"s":""}
          {userPos&&<span style={{ color:"#22c55e" }}> · triés par distance</span>}
        </p>
      </div>

      {/* SEARCH + GEO fusionnés */}
      <div style={{ display:"flex",gap:8,marginBottom:12 }}>
        <div style={{ position:"relative",flex:1 }}>
          <span style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:15,pointerEvents:"none",color:C.muted }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un bar ou une ville…"
            style={{ width:"100%",background:C.card,border:`1px solid ${search?C.accent:C.border}`,borderRadius:10,padding:"11px 38px 11px 38px",color:C.text,fontSize:14,boxSizing:"border-box" }}/>
          {search&&<button onClick={()=>setSearch("")} style={{ position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16 }}>✕</button>}
        </div>
        <button onClick={geolocate} disabled={geoLoading}
          style={{ background:userPos?"#22c55e22":C.card,color:userPos?"#22c55e":C.text,border:`1px solid ${userPos?"#22c55e":C.border}`,borderRadius:10,padding:"0 16px",cursor:geoLoading?"default":"pointer",fontSize:13,fontWeight:600,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:6,transition:"all .2s",flexShrink:0 }}>
          <span style={{ fontSize:16 }}>{geoLoading?"⏳":"📍"}</span>
          <span>{geoLoading?"…":userPos?"Actif ✕":"Autour de moi"}</span>
        </button>
      </div>
      {geoErr&&<p style={{ color:"#f87171",fontSize:12,marginBottom:10 }}>⚠️ {geoErr}</p>}

      {/* TOGGLE + FILTRES */}
      <div style={{ display:"flex",gap:8,marginBottom:filtersOpen?0:14,alignItems:"stretch" }}>
        <div style={{ display:"flex",background:C.card,border:`1px solid ${C.border}`,borderRadius:10,overflow:"hidden",flex:1 }}>
          {[["carte","🗺️ Carte"],["liste","📋 Liste"]].map(([v,l])=>(
            <button key={v} onClick={()=>setView(v)} style={{ flex:1,padding:"9px 0",background:view===v?C.accent:"transparent",color:view===v?"#fff":C.muted,border:"none",cursor:"pointer",fontWeight:view===v?700:400,fontSize:13,transition:"all .15s" }}>{l}</button>
          ))}
        </div>
        <button onClick={()=>setFiltersOpen(o=>!o)}
          style={{ background:activeFilters>0?C.accent+"22":C.card,color:activeFilters>0?C.accent:C.muted,border:`1px solid ${activeFilters>0?C.accent:C.border}`,borderRadius:10,padding:"9px 14px",cursor:"pointer",fontSize:13,display:"flex",alignItems:"center",gap:7,flexShrink:0,fontWeight:activeFilters>0?700:400 }}>
          Filtres ⚙️{activeFilters>0&&<span style={{ background:C.accent,color:"#fff",borderRadius:"50%",width:18,height:18,fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center",fontWeight:700 }}>{activeFilters}</span>}
        </button>
      </div>

      {/* PANEL FILTRES */}
      {filtersOpen&&(
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:14,marginTop:8 }}>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12 }}>
            <div>
              <label style={{ fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:6,letterSpacing:.5 }}>TYPE DE LIEU</label>
              <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{ width:"100%",background:"#111",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13 }}>
                <option value="tous">Tous</option>
                {TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:6,letterSpacing:.5 }}>CIBLES MIN.</label>
              <select value={filterCibles} onChange={e=>setFilterCibles(+e.target.value)} style={{ width:"100%",background:"#111",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13 }}>
                <option value={0}>Toutes</option>
                {[1,2,3,4].map(n=><option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
            {userPos&&(
              <div>
                <label style={{ fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:6,letterSpacing:.5 }}>DISTANCE MAX</label>
                <select value={filterDist} onChange={e=>setFilterDist(+e.target.value)} style={{ width:"100%",background:"#111",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13 }}>
                  <option value={0}>Toutes</option>
                  {[5,10,25,50].map(d=><option key={d} value={d}>{d} km</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{ fontSize:11,color:C.muted,fontWeight:700,display:"block",marginBottom:8,letterSpacing:.5 }}>OPTIONS</label>
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                <label style={{ display:"flex",alignItems:"center",gap:9,cursor:"pointer",fontSize:13 }}>
                  <input type="checkbox" checked={filterTournoi} onChange={e=>setFilterTournoi(e.target.checked)} style={{ accentColor:C.accent,width:15,height:15 }}/>
                  🏆 Avec tournois
                </label>
                <label style={{ display:"flex",alignItems:"center",gap:9,cursor:"pointer",fontSize:13 }}>
                  <input type="checkbox" checked={filterAsso} onChange={e=>setFilterAsso(e.target.checked)} style={{ accentColor:C.accent,width:15,height:15 }}/>
                  👥 Avec association
                </label>
              </div>
            </div>
          </div>
          {activeFilters>0&&<button onClick={resetFilters} style={{ marginTop:12,background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:12 }}>✕ Réinitialiser les filtres</button>}
        </div>
      )}

      {/* CARTE — priorité visuelle */}
      {view==="carte"&&(
        <div style={{ marginBottom:16 }}>
          <LeafletMap bars={filtered} onBarClick={s=>{setBarSlug(s);setPage("bar");}} centerVille={search||null} height="55vh" barsActifs={barsActifs} userPos={userPos}/>
        </div>
      )}

      {/* LÉGENDE */}
      <div style={{ display:"flex",gap:14,marginBottom:14,flexWrap:"wrap" }}>
        {[["🍺","Bar"],["👥","Association"],["🏆","Tournoi"]].map(([e,l])=>(
          <span key={l} style={{ display:"flex",alignItems:"center",gap:5,fontSize:12,color:C.muted }}><span style={{ fontSize:14 }}>{e}</span>{l}</span>
        ))}
      </div>

      {/* RÉSULTATS */}
      {filtered.length===0?(
        <div style={{ textAlign:"center",padding:"40px 20px",color:C.muted }}>
          <div style={{ fontSize:44,marginBottom:10 }}>🔍</div>
          <p style={{ marginBottom:10 }}>Aucun bar trouvé.</p>
          {activeFilters>0&&<button onClick={resetFilters} style={{ background:"none",border:"none",color:C.accent,cursor:"pointer",fontSize:13 }}>Effacer les filtres</button>}
        </div>
      ):(
        <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
          {filtered.map(b=><BarCard key={b.id} bar={b} onClick={()=>{setBarSlug(b.slug);setPage("bar");}} barsActifs={barsActifs} dist={b._dist!=null&&b._dist!==Infinity?b._dist:null}/>)}
        </div>
      )}

      {/* FAB */}
      <button onClick={()=>setPage("proposer")}
        style={{ position:"fixed",bottom:24,right:24,zIndex:500,background:C.accent,color:"#fff",border:"none",borderRadius:50,padding:"13px 20px",cursor:"pointer",fontSize:14,fontWeight:700,boxShadow:"0 4px 24px rgba(249,115,22,.45)",display:"flex",alignItems:"center",gap:8,letterSpacing:.3 }}>
        <span style={{ fontSize:18,lineHeight:1 }}>+</span> Ajouter un bar
      </button>
    </div>
  );
};

// ── BAR SCORE BLOCK ───────────────────────────────────────────────────────────
const BarScoreBlock = ({ barSlug }) => {
  const [reactions,setReactions]=useState({});
  useEffect(()=>{ db.getReactions(barSlug).then(r=>setReactions(r?.counts||{})).catch(()=>{}); },[barSlug]);
  const total=Object.values(reactions).reduce((a,b)=>a+b,0);
  if(!total) return null;
  const scores=[
    {id:"ambiance",label:"Ambiance",emoji:"🔥"},
    {id:"accueil",label:"Accueil",emoji:"😊"},
    {id:"equipement",label:"Équipement",emoji:"🎯"},
    {id:"soirees",label:"Soirées",emoji:"🏆"},
    {id:"accessibilite",label:"Accès",emoji:"📍"},
  ].map(s=>({...s,count:reactions[s.id]||0})).filter(s=>s.count>0).sort((a,b)=>b.count-a.count).slice(0,4);
  if(!scores.length) return null;
  const max=scores[0].count;
  return (
    <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18,marginBottom:16 }}>
      <h3 style={{ fontWeight:700,fontSize:16,marginBottom:16,color:C.accent }}>⭐ Score du spot</h3>
      <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
        {scores.map(({id,label,emoji,count})=>(
          <div key={id} style={{ display:"flex",alignItems:"center",gap:12 }}>
            <span style={{ fontSize:17,width:22,flexShrink:0 }}>{emoji}</span>
            <span style={{ fontSize:13,color:C.muted,flexShrink:0,width:84 }}>{label}</span>
            <div style={{ flex:1,height:7,background:"#222",borderRadius:4,overflow:"hidden" }}>
              <div style={{ height:"100%",width:`${Math.round(count/max*100)}%`,background:`linear-gradient(to right,${C.accent},#fbbf24)`,borderRadius:4 }}/>
            </div>
            <span style={{ fontSize:12,fontWeight:700,minWidth:30,textAlign:"right",color:C.text }}>×{count}</span>
          </div>
        ))}
      </div>
      <p style={{ color:C.muted,fontSize:11,marginTop:12 }}>{total} vote{total>1?"s":""} de la communauté</p>
    </div>
  );
};

// ── PAGE BAR DETAIL ───────────────────────────────────────────────────────────
const BarDetail = ({ slug, allBars, associations, setBars, setPage, setAssoSlug, isAdmin, joueur, setJoueurId }) => {
  const [bar,setBar]=useState(null); const [loading,setLoading]=useState(true);
  const [showSignal,setShowSignal]=useState(false); const [showEdit,setShowEdit]=useState(false);
  const [userDist,setUserDist]=useState(null);
  const [cover,setCover]=useState(null);
  const [copied,setCopied]=useState(false);
  const presenceRef=useRef(null);

  useEffect(()=>{
    setLoading(true); setCover(null); setUserDist(null);
    db.getBar(slug).then(b=>{
      if(b){ const nv=(b.vues||0)+1; db.updateBarVues(slug,b.vues||0); setBar({...b,vues:nv}); setBars(p=>p.map(x=>x.slug===slug?{...x,vues:nv}:x)); }
      setLoading(false);
    }).catch(()=>setLoading(false));
    db.getPhotos(slug).then(p=>{ if(p?.[0]) setCover(p[0].data); }).catch(()=>{});
  },[slug]);

  useEffect(()=>{
    if(!bar?.lat||!bar?.lng) return;
    if(navigator.geolocation) navigator.geolocation.getCurrentPosition(
      pos=>setUserDist(haversine(pos.coords.latitude,pos.coords.longitude,bar.lat,bar.lng)),()=>{}
    );
  },[bar]);

  if(loading) return <Spinner/>;
  if(!bar) return <div style={{ maxWidth:860,margin:"0 auto",padding:"36px 20px",textAlign:"center" }}><Btn onClick={()=>setPage("bars")}>← Retour</Btn></div>;

  const asso=associations.find(a=>a.nom===bar.association);
  const ti=typeInfo(bar.type);
  const mapsUrl=`https://www.google.com/maps/search/${encodeURIComponent((bar.adresse||bar.nom)+" "+bar.ville)}`;
  const shareUrl=`https://dartpoint.netlify.app/bars/${bar.slug}`;
  const handleShare=()=>{
    if(navigator.share){ navigator.share({title:bar.nom,text:`${bar.nom} sur DartPoint`,url:shareUrl}).catch(()=>{}); }
    else { try{navigator.clipboard.writeText(shareUrl);}catch{} setCopied(true); setTimeout(()=>setCopied(false),2000); }
  };

  return (
    <div style={{ maxWidth:860,margin:"0 auto",paddingBottom:100 }}>
      {showSignal&&<SignalForm barSlug={bar.slug} barNom={bar.nom} onClose={()=>setShowSignal(false)}/>}
      {showEdit&&<EditBarModal bar={bar} onSave={u=>{setBar(u);setBars(p=>p.map(x=>x.slug===slug?u:x));}} onClose={()=>setShowEdit(false)}/>}

      {/* ── HERO COVER ── */}
      <div style={{ position:"relative",height:220,overflow:"hidden" }}>
        {cover
          ? <img src={cover} alt={bar.nom} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
          : <div style={{ width:"100%",height:"100%",background:`linear-gradient(135deg,${ti.color}44 0%,#111 65%)`,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <span style={{ fontSize:80,opacity:.15 }}>🍺</span>
            </div>
        }
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.5) 0%,transparent 45%,rgba(15,15,15,.97) 100%)" }}/>
        <button onClick={()=>setPage("bars")} style={{ position:"absolute",top:16,left:16,background:"rgba(0,0,0,.55)",border:"none",color:"#fff",cursor:"pointer",borderRadius:10,padding:"7px 14px",fontSize:13,backdropFilter:"blur(10px)",fontWeight:500 }}>← Bars</button>
        {isAdmin&&<button onClick={()=>setShowEdit(true)} style={{ position:"absolute",top:16,right:16,background:"rgba(0,0,0,.55)",border:`1px solid ${C.yellow}66`,color:C.yellow,cursor:"pointer",borderRadius:10,padding:"7px 13px",fontSize:12,backdropFilter:"blur(10px)" }}>✏️ Modifier</button>}
      </div>

      <div style={{ padding:"0 16px" }}>

        {/* ── IDENTITY CARD (overlap hero) ── */}
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 18px",marginTop:-44,position:"relative",zIndex:10,marginBottom:12 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap" }}>
            <div style={{ flex:1,minWidth:0 }}>
              <h1 style={{ fontWeight:800,fontSize:22,marginBottom:8,lineHeight:1.2 }}>{bar.nom}</h1>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
                {bar.verifie&&<Badge color={C.green}>✅ Vérifié</Badge>}
                <Badge color={ti.color}>{ti.l}</Badge>
                {userDist!=null&&<Badge color="#60a5fa">📍 {userDist<1?(userDist*1000).toFixed(0)+" m":userDist.toFixed(1)+" km"}</Badge>}
              </div>
            </div>
            <span style={{ fontSize:11,color:C.muted,flexShrink:0,marginTop:4 }}>👁 {bar.vues||0} vues</span>
          </div>
          <p style={{ color:C.muted,fontSize:12,marginTop:10 }}>📍 {bar.adresse}{bar.adresse?", ":""}{bar.cp} {bar.ville}</p>
        </div>

        {/* ── ACTIONS RAPIDES ── */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20 }}>
          {[
            {icon:"📍",label:"Itinéraire",fn:()=>window.open(mapsUrl,"_blank")},
            {icon:"📞",label:"Appeler",fn:()=>{if(bar.tel)window.open(`tel:${bar.tel}`);},off:!bar.tel},
            {icon:"📤",label:"Partager",fn:handleShare},
            {icon:"🗺️",label:"Maps",fn:()=>window.open(mapsUrl,"_blank")},
          ].map((b,i)=>(
            <button key={i} onClick={b.fn} disabled={b.off}
              style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 6px",cursor:b.off?"default":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,opacity:b.off?.35:1,transition:"border-color .15s" }}
              onMouseEnter={e=>{ if(!b.off) e.currentTarget.style.borderColor=C.accent; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; }}>
              <span style={{ fontSize:22 }}>{b.icon}</span>
              <span style={{ fontSize:11,color:C.muted,fontWeight:500 }}>{b.label}</span>
            </button>
          ))}
        </div>
        {copied&&<p style={{ textAlign:"center",color:C.green,fontSize:12,marginTop:-12,marginBottom:12 }}>✅ Lien copié !</p>}

        {/* ── PRÉSENCE CE SOIR ── */}
        <div ref={presenceRef}>
          <PresenceSection barSlug={bar.slug} joueur={joueur}/>
        </div>

        {/* ── TOP JOUEURS DU SPOT ── */}
        <MembresBarSection barSlug={bar.slug} setPage={setPage} setJoueurId={setJoueurId}/>

        {/* ── PHOTOS COMMUNAUTÉ ── */}
        <GalerieSection slug={bar.slug} type="bar" isAdmin={isAdmin}/>

        {/* ── SCORE DU SPOT ── */}
        <BarScoreBlock barSlug={bar.slug}/>

        {/* ── AVIS ── */}
        <AvisSection barSlug={bar.slug} isAdmin={isAdmin}/>

        {/* ── INFOS DU SPOT (fusionné) ── */}
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18,marginBottom:16 }}>
          <h3 style={{ fontWeight:700,fontSize:16,marginBottom:16,color:C.accent }}>📋 Infos du spot</h3>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            {[
              ["📍","Adresse",(bar.adresse||"—")+(bar.cp?" · "+bar.cp:"")+" "+bar.ville],
              ["⏰","Horaires",bar.horaires||"Non renseignés"],
              ["📞","Téléphone",bar.tel||"Non renseigné"],
              ["🎯","Cibles",bar.cibles+" cible"+(bar.cibles>1?"s":"")],
              ["🏆","Tournois",bar.tournois?"✅ Tournois réguliers":"Non"],
              ["🍺","Type de jeu",ti.l],
            ].map(([icon,label,value])=>(
              <div key={label} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                <span style={{ fontSize:15,marginTop:1,flexShrink:0 }}>{icon}</span>
                <div>
                  <div style={{ fontSize:10,color:C.muted,marginBottom:2,letterSpacing:.5,fontWeight:700 }}>{label.toUpperCase()}</div>
                  <div style={{ fontSize:13,color:C.text }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── DESCRIPTION ── */}
        {bar.description&&<div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18,marginBottom:16 }}>
          <h3 style={{ fontWeight:700,fontSize:14,marginBottom:10,color:C.accent }}>💬 Description</h3>
          <p style={{ color:C.muted,lineHeight:1.7,fontSize:13 }}>{bar.description}</p>
        </div>}

        {/* ── ASSOCIATION PARTENAIRE ── */}
        {asso&&<div onClick={()=>{setAssoSlug(asso.slug);setPage("asso");}}
          style={{ background:"#120a1a",border:`1px solid #f472b644`,borderRadius:14,padding:16,marginBottom:16,cursor:"pointer",display:"flex",alignItems:"center",gap:14 }}>
          <span style={{ fontSize:30,flexShrink:0 }}>👥</span>
          <div>
            <div style={{ fontSize:10,color:"#f472b6",fontWeight:700,marginBottom:4,letterSpacing:.5 }}>ASSOCIATION PARTENAIRE</div>
            <div style={{ fontWeight:700,fontSize:14,marginBottom:2 }}>{asso.nom}</div>
            <div style={{ color:C.muted,fontSize:12 }}>{asso.jours} · Voir la fiche →</div>
          </div>
        </div>}

        {/* ── CARTE (secondaire, réduite) ── */}
        {bar.lat&&<div style={{ marginBottom:16 }}>
          <h3 style={{ fontWeight:600,fontSize:13,marginBottom:10,color:C.muted }}>🗺️ Localisation</h3>
          <LeafletMap bars={allBars} onBarClick={()=>{}} centerSlug={bar.slug} height={180}/>
        </div>}

        {/* ── SIGNALER ── */}
        <div style={{ textAlign:"center",paddingTop:4,paddingBottom:16 }}>
          <button onClick={()=>setShowSignal(true)} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:10,color:C.muted,cursor:"pointer",fontSize:12,padding:"8px 20px" }}>⚠️ Signaler une erreur</button>
        </div>
      </div>

      {/* ── STICKY CTA ── */}
      <div style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:200,padding:"10px 16px 22px",background:"linear-gradient(transparent,#0f0f0f 35%)",pointerEvents:"none" }}>
        <div style={{ maxWidth:860,margin:"0 auto",display:"flex",gap:10,pointerEvents:"auto" }}>
          <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ flex:1,textDecoration:"none" }}>
            <button style={{ width:"100%",background:C.card,color:C.text,border:`1px solid ${C.border}`,borderRadius:14,padding:"13px 0",fontSize:14,fontWeight:600,cursor:"pointer" }}>📍 Itinéraire</button>
          </a>
          <button onClick={()=>{ if(!joueur){setPage("connexion");return;} presenceRef.current?.scrollIntoView({behavior:"smooth",block:"center"}); }}
            style={{ flex:2,background:C.accent,color:"#fff",border:"none",borderRadius:14,padding:"13px 0",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 20px rgba(249,115,22,.4)" }}>
            🎯 Je joue ici ce soir
          </button>
        </div>
      </div>
    </div>
  );
};

// ── ASSOCIATIONS ──────────────────────────────────────────────────────────────
const Associations = ({ associations, setPage, setAssoSlug }) => {
  const [view,setView]=useState("liste");
  return (
    <div style={{ maxWidth:1100,margin:"0 auto",padding:"36px 20px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:6 }}>
        <div><h1 style={{ fontWeight:800,fontSize:26 }}>🫂 Associations & clubs</h1><p style={{ color:C.muted,marginTop:4 }}>{associations.length} associations référencées</p></div>
        <div style={{ display:"flex",gap:4 }}>{[["liste","☰"],["carte","🗺️"]].map(([vv,ll])=><button key={vv} onClick={()=>setView(vv)} style={{ background:view===vv?"#7c3aed":"transparent",color:view===vv?"#fff":C.muted,border:`1px solid ${view===vv?"#7c3aed":C.border}`,borderRadius:8,padding:"9px 14px",cursor:"pointer",fontSize:15 }}>{ll}</button>)}</div>
      </div>
      {view==="carte"?<div style={{ marginBottom:20 }}><LeafletMap associations={associations} onAssoClick={s=>{setAssoSlug(s);setPage("asso");}} height={450}/></div>
      :<div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12,marginBottom:20 }}>
        {associations.map(a=>(
          <div key={a.id} onClick={()=>{setAssoSlug(a.slug);setPage("asso");}} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18,cursor:"pointer" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#7c3aed"} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6,marginBottom:8 }}><h3 style={{ fontWeight:700,fontSize:15 }}>{a.nom}</h3><Badge color={typeInfo(a.type).color}>{typeInfo(a.type).l}</Badge></div>
            <p style={{ color:C.muted,fontSize:12,marginBottom:6 }}>📍 {a.ville}{a.zone?" — "+a.zone:""}</p>
            <p style={{ color:C.muted,fontSize:12,marginBottom:10 }}>{a.description?.slice(0,100)}…</p>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}><Badge color={C.purple}>🗓 {a.jours}</Badge></div>
          </div>
        ))}
      </div>}
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,textAlign:"center" }}>
        <p style={{ color:C.muted,fontSize:14,marginBottom:12 }}>Vous connaissez une association non référencée ?</p>
        <Btn onClick={()=>setPage("proposer-asso")} style={{ background:"#7c3aed",fontSize:13 }}>🫂 Proposer une association</Btn>
      </div>
    </div>
  );
};

const AssoDetail = ({ slug, associations, bars, setPage, setBarSlug, isAdmin }) => {
  const asso=associations.find(a=>a.slug===slug); if(!asso) return null;
  return (
    <div style={{ maxWidth:860,margin:"0 auto",padding:"36px 20px" }}>
      <button onClick={()=>setPage("associations")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",marginBottom:18,fontSize:13 }}>← Retour</button>
      <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:6 }}><h1 style={{ fontWeight:800,fontSize:28 }}>{asso.nom}</h1><Badge color={typeInfo(asso.type).color}>{typeInfo(asso.type).l}</Badge></div>
      <p style={{ color:C.muted,marginBottom:24 }}>📍 {asso.ville}{asso.zone?" — "+asso.zone:""}</p>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginBottom:16 }}>
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18 }}>
          {[["🗓","Entraînements",asso.jours],["📍","Lieu",asso.lieu],["📞","Tél",asso.tel||"—"],["📧","Contact",asso.contact]].map(([i,l,v])=>(
            <div key={l} style={{ display:"flex",gap:8,marginBottom:10 }}><span>{i}</span><div><div style={{ fontSize:11,color:C.muted }}>{l}</div><div style={{ fontSize:13 }}>{v}</div></div></div>
          ))}
        </div>
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18 }}><p style={{ color:C.muted,lineHeight:1.7,fontSize:13 }}>{asso.description}</p></div>
      </div>
      {asso.bars?.length>0&&<div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:16 }}>
        {asso.bars.map(nom=>{const b=bars.find(x=>x.nom===nom);return b?<div key={nom} onClick={()=>{setBarSlug(b.slug);setPage("bar");}} style={{ display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer" }}><span style={{ fontWeight:500 }}>{nom}</span><span style={{ color:C.muted,fontSize:12 }}>📍 {b.ville} →</span></div>:null;})}
      </div>}
      {asso.lat&&<div style={{ marginBottom:16 }}><LeafletMap associations={[asso]} centerSlug={asso.slug} height={200}/></div>}
      <GalerieSection slug={asso.slug} type="asso" isAdmin={isAdmin}/>
    </div>
  );
};

// ── TOURNOIS ──────────────────────────────────────────────────────────────────
const Tournois = ({ tournois, setPage, setTournoiSlug }) => {
  const [view,setView]=useState("liste");
  const upcoming=useMemo(()=>[...tournois].filter(t=>new Date(t.date)>=new Date()).sort((a,b)=>new Date(a.date)-new Date(b.date)),[tournois]);
  const past=useMemo(()=>[...tournois].filter(t=>new Date(t.date)<new Date()).sort((a,b)=>new Date(b.date)-new Date(a.date)),[tournois]);
  const TCard=({t})=>{ const d=new Date(t.date); const isPast=d<new Date(); return (
    <div onClick={()=>{setTournoiSlug(t.slug);setPage("tournoi-detail");}} style={{ background:C.card,border:`1px solid ${isPast?C.border:C.yellow+"44"}`,borderRadius:12,padding:20,cursor:"pointer",opacity:isPast?.7:1 }}
      onMouseEnter={e=>e.currentTarget.style.borderColor=C.yellow} onMouseLeave={e=>e.currentTarget.style.borderColor=isPast?C.border:C.yellow+"44"}>
      <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:10 }}><h3 style={{ fontWeight:700,fontSize:16 }}>{t.nom}</h3><Badge color={isPast?C.muted:C.green}>{isPast?"Passé":"À venir"}</Badge></div>
      <p style={{ color:C.yellow,fontWeight:600,fontSize:14,marginBottom:6 }}>📅 {d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      <p style={{ color:C.muted,fontSize:13 }}>📍 {t.ville}{t.bar?" — "+t.bar:""}</p>
    </div>
  );};
  return (
    <div style={{ maxWidth:1000,margin:"0 auto",padding:"36px 20px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:20 }}>
        <h1 style={{ fontWeight:800,fontSize:26 }}>🏅 Tournois & événements</h1>
        <div style={{ display:"flex",gap:4 }}>{[["liste","☰"],["carte","🗺️"]].map(([vv,ll])=><button key={vv} onClick={()=>setView(vv)} style={{ background:view===vv?C.yellow:"transparent",color:view===vv?"#000":C.muted,border:`1px solid ${view===vv?C.yellow:C.border}`,borderRadius:8,padding:"9px 14px",cursor:"pointer",fontSize:15 }}>{ll}</button>)}</div>
      </div>
      {view==="carte"?<LeafletMap tournois={upcoming} onTournoiClick={s=>{setTournoiSlug(s);setPage("tournoi-detail");}} height={450}/>
      :<>
        {upcoming.length>0&&<><h2 style={{ fontWeight:700,fontSize:18,marginBottom:14,color:C.green }}>📅 À venir</h2><div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14,marginBottom:32 }}>{upcoming.map(t=><TCard key={t.id} t={t}/>)}</div></>}
        {past.length>0&&<><h2 style={{ fontWeight:700,fontSize:18,marginBottom:14,color:C.muted }}>📆 Passés</h2><div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14 }}>{past.map(t=><TCard key={t.id} t={t}/>)}</div></>}
      </>}
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:20,marginTop:28,textAlign:"center" }}>
        <Btn onClick={()=>setPage("proposer-tournoi")} style={{ background:C.yellow,color:"#000",fontSize:13 }}>🏅 Proposer un tournoi</Btn>
      </div>
    </div>
  );
};

const TournoiDetail = ({ slug, tournois, setTournois, bars, setPage, setBarSlug, joueur }) => {
  const [inscrits, setInscrits] = useState([]);
  const [monInscription, setMonInscription] = useState(null);
  const [loadingInscription, setLoadingInscription] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const t = tournois.find(x=>x.slug===slug);
  if (!t) return null;
  const d = new Date(t.date); const isPast = d < new Date(); const bar = bars.find(b=>b.nom===t.bar);
  const isCreateur = joueur && t.createur_id && joueur.id === t.createur_id;
  const placesMax = parseInt(t.places) || null;
  const complet = placesMax && inscrits.length >= placesMax;

  useEffect(() => {
    db.getInscrits(slug).then(r => {
      setInscrits(r||[]);
      if (joueur) setMonInscription((r||[]).find(i => i.joueur_id === joueur.id) || null);
    }).catch(()=>{});
  }, [slug, joueur?.id]);

  const sInscrire = async () => {
    if (!joueur || loadingInscription) return;
    setLoadingInscription(true);
    const r = await db.addInscription({ tournoi_slug: slug, joueur_id: joueur.id, joueur_pseudo: joueur.pseudo, date: Date.now() });
    if (r?.[0]) { setInscrits(x=>[...x,r[0]]); setMonInscription(r[0]); }
    setLoadingInscription(false);
  };

  const seDesinscrire = async () => {
    if (!joueur || loadingInscription) return;
    setLoadingInscription(true);
    await db.deleteInscription(slug, joueur.id);
    setInscrits(x=>x.filter(i=>i.joueur_id!==joueur.id));
    setMonInscription(null);
    setLoadingInscription(false);
  };

  return (
    <div style={{ maxWidth:860,margin:"0 auto",padding:"36px 20px" }}>
      {showEdit && <EditTournoiModal tournoi={t} onSave={u=>{setTournois(ts=>ts.map(x=>x.slug===u.slug?{...x,...u}:x));setShowEdit(false);}} onClose={()=>setShowEdit(false)}/>}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:18 }}>
        <button onClick={()=>setPage("tournois")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13 }}>← Retour</button>
        {isCreateur && <Btn onClick={()=>setShowEdit(true)} style={{ fontSize:12,background:"transparent",border:`1px solid ${C.yellow}`,color:C.yellow,padding:"6px 14px" }}>✏️ Modifier le tournoi</Btn>}
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:6 }}><h1 style={{ fontWeight:800,fontSize:28 }}>{t.nom}</h1><Badge color={isPast?C.muted:C.green}>{isPast?"Passé":"À venir"}</Badge></div>
      <p style={{ color:C.yellow,fontWeight:600,fontSize:16,marginBottom:20 }}>📅 {d.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      {t.createur_pseudo && <p style={{ color:C.muted,fontSize:12,marginBottom:16 }}>🎯 Organisé par <strong style={{ color:C.text }}>{t.createur_pseudo}</strong></p>}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginBottom:16 }}>
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18 }}>
          {[["📍","Ville",t.ville],["🍺","Bar",t.bar||"—"],["📞","Contact",t.contact||"—"]].map(([i,l,v])=>(
            <div key={l} style={{ display:"flex",gap:8,marginBottom:10 }}><span>{i}</span><div><div style={{ fontSize:11,color:C.muted }}>{l}</div><div style={{ fontSize:13 }}>{v}</div></div></div>
          ))}
        </div>
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18 }}>
          {[["Format",t.format||"—"],["Niveau",t.niveau==="tous"?"Tous niveaux":t.niveau||"—"],["Prix",t.prix||"Gratuit"],["Places",placesMax?`${inscrits.length} / ${placesMax}`:"Non limité"]].map(([l,v])=>(
            <div key={l} style={{ display:"flex",justifyContent:"space-between",borderBottom:`1px solid ${C.border}`,paddingBottom:7,marginBottom:7 }}><span style={{ color:C.muted,fontSize:12 }}>{l}</span><span style={{ fontWeight:500,fontSize:13 }}>{v}</span></div>
          ))}
        </div>
      </div>
      {t.description&&<div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:12 }}><p style={{ color:C.muted,lineHeight:1.7,fontSize:14 }}>{t.description}</p></div>}
      {bar&&<div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:18,marginBottom:16,cursor:"pointer" }} onClick={()=>{setBarSlug(bar.slug);setPage("bar");}}><p style={{ fontWeight:600 }}>🍺 {bar.nom} — {bar.ville} →</p></div>}
      {t.lat&&<div style={{ marginBottom:16 }}><LeafletMap tournois={[t]} centerSlug={t.slug} height={200}/></div>}
      {t.lien&&<a href={t.lien} target="_blank" rel="noreferrer"><Btn style={{ marginBottom:16 }}>🔗 Plus d'infos</Btn></a>}

      {/* ── INSCRIPTIONS ── */}
      {!isPast && (
        <div style={{ background:C.card,border:`1px solid ${C.yellow}44`,borderRadius:12,padding:20,marginBottom:16 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14 }}>
            <h3 style={{ fontWeight:700,fontSize:15,color:C.yellow }}>🏅 Inscriptions{inscrits.length>0?` (${inscrits.length}${placesMax?" / "+placesMax:""})`:""}</h3>
            {joueur
              ? monInscription
                ? <button onClick={seDesinscrire} disabled={loadingInscription} style={{ background:"#7f1d1d",border:`1px solid #ef444444`,color:"#ef4444",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontWeight:600,fontSize:13 }}>
                    {loadingInscription?"…":"❌ Se désinscrire"}
                  </button>
                : <button onClick={sInscrire} disabled={loadingInscription||complet} style={{ background:complet?"#1a1a1a":"#14532d",border:`1px solid ${complet?"#555":"#22c55e44"}`,color:complet?C.muted:"#22c55e",borderRadius:8,padding:"7px 14px",cursor:complet?"not-allowed":"pointer",fontWeight:600,fontSize:13 }}>
                    {loadingInscription?"…":complet?"Complet":"✅ S'inscrire"}
                  </button>
              : <span style={{ color:C.muted,fontSize:12 }}>Connectez-vous pour vous inscrire</span>
            }
          </div>
          {inscrits.length===0
            ? <p style={{ color:C.muted,fontSize:13 }}>Aucune inscription pour l'instant.</p>
            : <div style={{ display:"flex",flexWrap:"wrap",gap:8 }}>
                {inscrits.map((i,idx)=>(
                  <div key={i.id} style={{ background:i.joueur_id===joueur?.id?"#14532d":"#111",border:`1px solid ${i.joueur_id===joueur?.id?"#22c55e44":C.border}`,borderRadius:20,padding:"5px 14px",fontSize:13,fontWeight:500,display:"flex",alignItems:"center",gap:6 }}>
                    <span style={{ color:C.muted,fontSize:11 }}>#{idx+1}</span> {i.joueur_pseudo}
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
};

// ── FORMULAIRES PROPOSER ──────────────────────────────────────────────────────
const Proposer = ({ bars, onSubmit }) => {
  const [f,setF]=useState({nom:"",adresse:"",ville:"",cp:"",type:"electronique",cibles:"1",tournois:"non",tel:"",commentaire:""});
  const [sent,setSent]=useState(false); const [doublon,setDoublon]=useState(null);
  const set=k=>v=>setF(p=>({...p,[k]:v})); const valid=f.nom.trim()&&f.ville.trim()&&!doublon;
  useEffect(()=>{ if(!f.nom.trim()||!f.ville.trim()){setDoublon(null);return;} const q=f.nom.toLowerCase(),v=f.ville.toLowerCase(); setDoublon(bars.find(b=>b.nom.toLowerCase().includes(q)&&b.ville.toLowerCase().includes(v))||null); },[f.nom,f.ville,bars]);
  if(sent) return <div style={{ maxWidth:600,margin:"80px auto",padding:"0 20px",textAlign:"center" }}><div style={{ fontSize:50,marginBottom:12 }}>✅</div><h2 style={{ fontWeight:700,marginBottom:8 }}>Merci !</h2><p style={{ color:C.muted }}>Votre proposition est en attente de validation.</p></div>;
  return (
    <div style={{ maxWidth:660,margin:"0 auto",padding:"36px 20px" }}>
      <h1 style={{ fontWeight:800,fontSize:26,marginBottom:24 }}>➕ Proposer un bar</h1>
      <div style={{ display:"flex",flexDirection:"column",gap:13 }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Nom *" value={f.nom} onChange={set("nom")} placeholder="Le Central"/><Field label="Ville *" value={f.ville} onChange={set("ville")} placeholder="Bayonne"/></div>
        {doublon&&<div style={{ background:"#1a0f00",border:`1px solid ${C.yellow}44`,borderRadius:10,padding:14 }}><p style={{ color:C.yellow,fontSize:13 }}>⚠️ "{doublon.nom}" à {doublon.ville} existe déjà.</p></div>}
        <Field label="Adresse" value={f.adresse} onChange={set("adresse")} placeholder="12 rue de la Mairie"/>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Code postal" value={f.cp} onChange={set("cp")} placeholder="64100"/><Field label="Type" as="select" value={f.type} onChange={set("type")} options={TYPES}/></div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Nb de cibles" value={f.cibles} onChange={set("cibles")} placeholder="2" type="number"/><Field label="Tournois ?" as="select" value={f.tournois} onChange={set("tournois")} options={[{v:"non",l:"Non"},{v:"oui",l:"Oui"},{v:"nsp",l:"Je ne sais pas"}]}/></div>
        <Field label="Commentaire" value={f.commentaire} onChange={set("commentaire")} placeholder="Ambiance, infos…" as="textarea"/>
        <Btn onClick={()=>{if(valid){onSubmit(f);setSent(true);}}} disabled={!valid} style={{ marginTop:4,padding:"13px 22px",fontSize:15 }}>Envoyer →</Btn>
      </div>
    </div>
  );
};

const ProposerAsso = ({ onSubmit }) => {
  const [f,setF]=useState({nom:"",ville:"",zone:"",type:"electronique",jours:"",lieu:"",tel:"",contact:"",description:""});
  const [sent,setSent]=useState(false); const set=k=>v=>setF(p=>({...p,[k]:v})); const valid=f.nom.trim()&&f.ville.trim();
  if(sent) return <div style={{ maxWidth:600,margin:"80px auto",padding:"0 20px",textAlign:"center" }}><div style={{ fontSize:50 }}>✅</div><h2 style={{ fontWeight:700,marginTop:12 }}>Merci !</h2></div>;
  return (
    <div style={{ maxWidth:660,margin:"0 auto",padding:"36px 20px" }}>
      <h1 style={{ fontWeight:800,fontSize:26,marginBottom:24 }}>🫂 Proposer une association</h1>
      <div style={{ display:"flex",flexDirection:"column",gap:13 }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Nom *" value={f.nom} onChange={set("nom")} placeholder="Les Darts du Coin"/><Field label="Ville *" value={f.ville} onChange={set("ville")} placeholder="Bayonne"/></div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Zone" value={f.zone} onChange={set("zone")} placeholder="Côte Basque"/><Field label="Type" as="select" value={f.type} onChange={set("type")} options={TYPES.slice(0,3)}/></div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Jours" value={f.jours} onChange={set("jours")} placeholder="Vendredi 20h"/><Field label="Lieu" value={f.lieu} onChange={set("lieu")} placeholder="Bar des Sports"/></div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Tél" value={f.tel} onChange={set("tel")} placeholder="06 XX"/><Field label="Contact" value={f.contact} onChange={set("contact")} placeholder="email"/></div>
        <Field label="Description" value={f.description} onChange={set("description")} placeholder="Présentez votre asso…" as="textarea"/>
        <Btn onClick={()=>{if(valid){onSubmit({...f,type_prop:"association"});setSent(true);}}} disabled={!valid} style={{ marginTop:4,padding:"13px 22px",fontSize:15,background:"#7c3aed" }}>Envoyer →</Btn>
      </div>
    </div>
  );
};

const ProposerTournoi = ({ onSubmit, joueur, onCreated }) => {
  const [f,setF]=useState({nom:"",ville:"",date:"",bar:"",association:"",type:"electronique",format:"individuel",niveau:"tous",prix:"",dotations:"",places:"",description:"",contact:"",lien:""});
  const [sent,setSent]=useState(false); const [loading,setLoading]=useState(false);
  const set=k=>v=>setF(p=>({...p,[k]:v})); const valid=f.nom.trim()&&f.ville.trim()&&f.date;

  const soumettre = async () => {
    if (!valid || loading) return;
    setLoading(true);
    if (joueur) {
      // Joueur connecté → enregistrement direct dans tournois
      const slug = slugify(f.nom+"-"+f.ville+"-"+f.date);
      const r = await db.addTournoi({ ...f, slug, createur_id: joueur.id, createur_pseudo: joueur.pseudo, source:"user", lat:null, lng:null });
      if (r?.[0] && onCreated) onCreated(r[0]);
    } else {
      // Non connecté → proposition admin
      await onSubmit({...f, type_prop:"tournoi"});
    }
    setLoading(false);
    setSent(true);
  };

  if (sent) return (
    <div style={{ maxWidth:600,margin:"80px auto",padding:"0 20px",textAlign:"center" }}>
      <div style={{ fontSize:50 }}>✅</div>
      <h2 style={{ fontWeight:700,marginTop:12 }}>{joueur?"Tournoi créé !":"Merci !"}</h2>
      <p style={{ color:C.muted,marginTop:8 }}>{joueur?"Votre tournoi est en ligne. Vous pouvez le modifier depuis sa page.":"Votre proposition est en attente de validation."}</p>
    </div>
  );

  return (
    <div style={{ maxWidth:660,margin:"0 auto",padding:"36px 20px" }}>
      <h1 style={{ fontWeight:800,fontSize:26,marginBottom:joueur?8:24 }}>🏅 {joueur?"Créer un tournoi":"Proposer un tournoi"}</h1>
      {joueur && <p style={{ color:C.green,fontSize:13,marginBottom:20 }}>✅ Connecté en tant que <strong>{joueur.pseudo}</strong> — le tournoi sera publié directement.</p>}
      <div style={{ display:"flex",flexDirection:"column",gap:13 }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Nom *" value={f.nom} onChange={set("nom")} placeholder="Open Bayonne 2025"/><Field label="Ville *" value={f.ville} onChange={set("ville")} placeholder="Bayonne"/></div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Date *" value={f.date} onChange={set("date")} type="date" placeholder=""/><Field label="Bar organisateur" value={f.bar} onChange={set("bar")} placeholder="Le Central"/></div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:13 }}>
          <Field label="Type" as="select" value={f.type} onChange={set("type")} options={TYPES.slice(0,3)}/>
          <Field label="Format" as="select" value={f.format} onChange={set("format")} options={[{v:"individuel",l:"Individuel"},{v:"equipes",l:"Équipes"},{v:"mixte",l:"Mixte"}]}/>
          <Field label="Niveau" as="select" value={f.niveau} onChange={set("niveau")} options={[{v:"tous",l:"Tous niveaux"},{v:"intermediaire",l:"Intermédiaire"},{v:"competiteur",l:"Compétiteur"}]}/>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Prix" value={f.prix} onChange={set("prix")} placeholder="5€"/><Field label="Places" value={f.places} onChange={set("places")} placeholder="32"/></div>
        <Field label="Description" value={f.description} onChange={set("description")} placeholder="Présentez votre tournoi…" as="textarea"/>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Contact" value={f.contact} onChange={set("contact")} placeholder="email ou tél"/><Field label="Lien" value={f.lien} onChange={set("lien")} placeholder="https://..."/></div>
        <Btn onClick={soumettre} disabled={!valid||loading} style={{ marginTop:4,padding:"13px 22px",fontSize:15,background:C.yellow,color:"#000" }}>
          {loading?"Création…":joueur?"🏅 Créer le tournoi →":"Envoyer →"}
        </Btn>
      </div>
    </div>
  );
};

// ── À PROPOS & CONTACT ────────────────────────────────────────────────────────
const APropos = ({ bars, setPage }) => (
  <div style={{ maxWidth:760,margin:"0 auto",padding:"36px 20px" }}>
    <h1 style={{ fontWeight:800,fontSize:28,marginBottom:32 }}>ℹ️ À propos de DartPoint</h1>
    {[["🎯","Notre mission","DartPoint est né d'un constat simple : trouver un bar où jouer aux fléchettes relevait du bouche-à-oreille. Nous avons créé le premier annuaire dédié, pensé par et pour les joueurs."],
      ["🗺️","Comment ça marche ?","Chaque bar est vérifié par notre équipe ou signalé par la communauté. Les fiches contiennent infos pratiques, équipement, associations, avis et photos."],
      ["🤝","Une plateforme communautaire","Inscrivez-vous, affiliez-vous à un bar, défiez des joueurs, signalez votre présence ce soir !"],
      ["🏆","Associations et tournois","Les clubs sont au cœur du projet. Nous valorisons leurs tournois et événements locaux."]
    ].map(([e,t,tx])=>(
      <div key={t} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:22,marginBottom:14 }}>
        <h2 style={{ fontWeight:700,fontSize:17,marginBottom:10 }}>{e} {t}</h2>
        <p style={{ color:C.muted,lineHeight:1.8,fontSize:14 }}>{tx}</p>
      </div>
    ))}
    <div style={{ background:"linear-gradient(135deg,#1a0800,#111)",border:`1px solid ${C.accent}44`,borderRadius:12,padding:24,textAlign:"center" }}>
      <p style={{ fontWeight:700,fontSize:16,marginBottom:16 }}>{bars.length} bars · {bars.filter(b=>b.verifie).length} vérifiés</p>
      <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
        <Btn onClick={()=>setPage("proposer")} style={{ fontSize:13 }}>Proposer un bar</Btn>
        <Btn onClick={()=>setPage("contact")} variant="ghost" style={{ fontSize:13 }}>Nous contacter</Btn>
      </div>
    </div>
  </div>
);

const MentionsLegales = () => (
  <div style={{ maxWidth:760, margin:"0 auto", padding:"36px 20px" }}>
    <h1 style={{ fontWeight:800, fontSize:28, marginBottom:32 }}>⚖️ Mentions légales</h1>
    {[
      ["🏢 Éditeur du site", `Le site DartPoint (dart-point.vercel.app) est édité par :\n\nThomas Siméon\n32 Eskolako Bidea\n64480 Larressore\nFrance\nContact : t.simeon64(at)gmail.com`],
      ["🎯 Propriété intellectuelle", `L'ensemble du contenu de ce site (textes, structure, logo, code, données) est la propriété exclusive de Thomas Siméon et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.\n\nToute reproduction, représentation, modification ou exploitation, totale ou partielle, sans autorisation écrite préalable de Thomas Siméon est strictement interdite.`],
      ["⚠️ Responsabilité", `Les informations publiées sur DartPoint (adresses, horaires, équipements des bars) sont fournies à titre indicatif et peuvent ne pas être exhaustives ou à jour.\n\nThomas Siméon ne saurait être tenu responsable des erreurs, omissions ou indisponibilités des informations, ni des dommages directs ou indirects résultant de l'utilisation du site.`],
      ["👥 Contenu communautaire", `Les photos et avis publiés par les utilisateurs restent leur propriété. En les soumettant sur DartPoint, ils accordent à Thomas Siméon une licence d'utilisation non exclusive pour les afficher sur le site.\n\nTout contenu illicite, diffamatoire ou portant atteinte aux droits de tiers peut être signalé à t.simeon64(at)gmail.com et sera supprimé dans les meilleurs délais.`],
      ["🔒 Données personnelles", `DartPoint collecte uniquement les données nécessaires au fonctionnement du service (pseudo, mot de passe chiffré).\n\nConformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Contactez : t.simeon64(at)gmail.com`],
      ["🌐 Hébergement", `Ce site est hébergé par :\nVercel Inc.\n440 N Barranca Ave #4133\nCovina, CA 91723\nÉtats-Unis\nhttps://vercel.com`],
    ].map(([titre, texte]) => (
      <div key={titre} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:22, marginBottom:14 }}>
        <h2 style={{ fontWeight:700, fontSize:17, marginBottom:12 }}>{titre}</h2>
        <p style={{ color:C.muted, lineHeight:1.8, fontSize:14, whiteSpace:"pre-line" }}>{texte}</p>
      </div>
    ))}
    <p style={{ color:C.muted, fontSize:12, textAlign:"center", marginTop:20 }}>Dernière mise à jour : avril 2026</p>
  </div>
);

const Contact = () => {
  const [f,setF]=useState({nom:"",email:"",sujet:"",message:""}); const [sent,setSent]=useState(false); const set=k=>v=>setF(p=>({...p,[k]:v}));
  if(sent) return <div style={{ maxWidth:600,margin:"80px auto",padding:"0 20px",textAlign:"center" }}><div style={{ fontSize:50 }}>✉️</div><h2 style={{ fontWeight:700,marginTop:12 }}>Message envoyé !</h2></div>;
  return (
    <div style={{ maxWidth:580,margin:"0 auto",padding:"36px 20px" }}>
      <h1 style={{ fontWeight:800,fontSize:26,marginBottom:24 }}>✉️ Contact</h1>
      <div style={{ display:"flex",flexDirection:"column",gap:13 }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}><Field label="Nom" value={f.nom} onChange={set("nom")} placeholder="Jean Dupont"/><Field label="Email *" value={f.email} onChange={set("email")} placeholder="vous@email.com" type="email"/></div>
        <Field label="Sujet" value={f.sujet} onChange={set("sujet")} placeholder="Partenariat, correction…"/>
        <Field label="Message *" value={f.message} onChange={set("message")} placeholder="Votre message…" as="textarea"/>
        <Btn onClick={()=>f.email&&f.message?setSent(true):null} style={{ padding:"13px 22px",fontSize:15 }}>Envoyer →</Btn>
      </div>
    </div>
  );
};

// ── ADMIN ─────────────────────────────────────────────────────────────────────
const AdminLogin = ({ onLogin }) => {
  const [pw,setPw]=useState(""); const [err,setErr]=useState(false);
  return (
    <div style={{ maxWidth:380,margin:"80px auto",padding:"0 20px" }}>
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:28,textAlign:"center" }}>
        <div style={{ fontSize:38,marginBottom:12 }}>🔐</div>
        <h2 style={{ fontWeight:700,fontSize:19,marginBottom:18 }}>Administration</h2>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Mot de passe" onKeyDown={e=>e.key==="Enter"&&(pw===ADMIN_PASSWORD?onLogin():setErr(true))} style={{ width:"100%",background:"#111",border:`1px solid ${err?C.red:C.border}`,borderRadius:8,padding:"11px 14px",color:C.text,fontSize:14,marginBottom:10 }}/>
        {err&&<p style={{ color:C.red,fontSize:12,marginBottom:10 }}>Mot de passe incorrect</p>}
        <Btn onClick={()=>pw===ADMIN_PASSWORD?onLogin():setErr(true)} style={{ width:"100%",padding:"11px" }}>Accéder →</Btn>
      </div>
    </div>
  );
};

// ── ADMIN COCKPIT ─────────────────────────────────────────────────────────────

// Couleurs priorité
const PRIO = {
  urgent:    { bg:"#ef444418", border:"#ef4444", text:"#ef4444", label:"🔴 Urgent" },
  important: { bg:"#f59e0b18", border:"#f59e0b", text:"#f59e0b", label:"🟠 Important" },
  normal:    { bg:"#22c55e18", border:"#22c55e", text:"#22c55e", label:"🟢 Normal" },
};

const AdminKpiCard = ({ icon, label, count, prio="normal", onClick }) => {
  const p = PRIO[prio];
  return (
    <div onClick={onClick} style={{ background:`linear-gradient(135deg,${p.bg},#1a1a1a)`, border:`1px solid ${p.border}44`, borderRadius:14, padding:"18px 20px", cursor:onClick?"pointer":"default", transition:"transform .15s, box-shadow .15s", display:"flex", flexDirection:"column", gap:6, minWidth:140 }}
      onMouseEnter={e=>{ if(onClick){e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 24px ${p.border}22`;}}}
      onMouseLeave={e=>{ e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}>
      <div style={{ fontSize:22 }}>{icon}</div>
      <div style={{ fontSize:28, fontWeight:900, color:p.text, lineHeight:1 }}>{count ?? "—"}</div>
      <div style={{ fontSize:11, color:C.muted, fontWeight:600, letterSpacing:.5 }}>{label}</div>
      {prio !== "normal" && <div style={{ fontSize:10, color:p.text, marginTop:2 }}>{p.label}</div>}
    </div>
  );
};

const AdminJoueurs = ({ addLog }) => {
  const [recherche, setRecherche] = useState("");
  const [tous, setTous]           = useState([]);       // liste complète chargée
  const [loading, setLoading]     = useState(true);
  const [drixVal, setDrixVal]     = useState({});       // { [id]: string }
  const [setDrix, setSetDrix]     = useState({});       // { [id]: string } valeur absolue
  const [saving, setSaving]       = useState({});
  const [msg, setMsg]             = useState({});
  const [expanded, setExpanded]   = useState({});

  // Chargement initial — tous les joueurs
  useEffect(()=>{
    sb(`joueurs?order=drix.desc&select=id,pseudo,drix,date_inscription,photo,bar_slug,asso_slug&limit=200`)
      .then(r=>{ setTous(r||[]); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  // Filtre local par pseudo
  const joueurs = recherche.trim()
    ? tous.filter(j=>j.pseudo?.toLowerCase().includes(recherche.toLowerCase()))
    : tous;

  const setField = (id, field, val) => setTous(x=>x.map(j=>j.id===id?{...j,[field]:val}:j));

  const appliquerDrix = async (j, delta) => {
    if (!delta || isNaN(delta)) return;
    setSaving(s=>({...s,[j.id]:true}));
    const newDrix = Math.max(0,(j.drix||1000)+Number(delta));
    await Promise.all([
      sb(`joueurs?id=eq.${j.id}`,{method:"PATCH",body:JSON.stringify({drix:newDrix}),prefer:"return=minimal"}),
      sb("drix_mouvements",{method:"POST",body:JSON.stringify({
        joueur_id:j.id, joueur_pseudo:j.pseudo, adversaire_pseudo:"Admin",
        variation:Number(delta), drix_avant:j.drix||1000, drix_apres:newDrix,
        resultat:Number(delta)>0?"victoire":"defaite", date:Date.now(),
      })}),
    ]).catch(()=>{});
    setField(j.id,"drix",newDrix);
    setMsg(m=>({...m,[j.id]:`✅ ${j.drix||1000} → ${newDrix} DRIX`}));
    setDrixVal(d=>({...d,[j.id]:""}));
    addLog?.(`DRIX ${Number(delta)>0?"+":""}${delta}`, j.pseudo, Number(delta)>0?"success":"warning");
    setTimeout(()=>setMsg(m=>({...m,[j.id]:""})),4000);
    setSaving(s=>({...s,[j.id]:false}));
  };

  const fixerDrix = async (j, valeur) => {
    const v = parseInt(valeur);
    if (isNaN(v)||v<0) return;
    const delta = v-(j.drix||1000);
    await appliquerDrix(j, delta);
    setSetDrix(d=>({...d,[j.id]:""}));
  };

  // Nettoyage complet de toutes les tables liées avant suppression
  const nettoyerJoueur = async (id) => {
    await Promise.allSettled([
      // Liens d'amitié (joueur des deux côtés)
      sb(`amis?joueur_id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}),
      sb(`amis?ami_id=eq.${id}`,  {method:"DELETE",prefer:"return=minimal"}),
      // Stats joueur (FK contrainte bloquante)
      sb(`stats_joueurs?joueur_id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}),
      // Mouvements DRIX
      sb(`drix_mouvements?joueur_id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}),
      // Présences (table: presences + presence_joueurs)
      sb(`presences?joueur_id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}),
      sb(`presence_joueurs?joueur_id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}),
      // Duels en cours (marquer comme annulé plutôt que supprimer)
      sb(`duels?or=(challenger_id.eq.${id},defie_id.eq.${id})&statut=eq.en_cours`,
         {method:"PATCH",body:JSON.stringify({statut:"annule"}),prefer:"return=minimal"}),
      // Inscriptions tournois potes
      sb(`tournois_potes_joueurs?joueur_id=eq.${id}`,{method:"DELETE",prefer:"return=minimal"}),
      // Messages
      sb(`messages?or=(expediteur_id.eq.${id},destinataire_id.eq.${id})`,{method:"DELETE",prefer:"return=minimal"}),
    ]);
  };

  const supprimerCompte = async (j) => {
    if (!window.confirm(`⚠️ Supprimer définitivement ${j.pseudo} ?\n\nCela supprimera aussi :\n• Ses liens d'amitié\n• Son historique DRIX\n• Ses présences\n\nCette action est irréversible.`)) return;
    setSaving(s=>({...s,[j.id]:true}));
    try {
      // 1. Nettoyer les tables liées
      await nettoyerJoueur(j.id);
      // 2. Supprimer le joueur
      await sb(`joueurs?id=eq.${j.id}`,{method:"DELETE",prefer:"return=minimal"});
      // 3. Retirer de l'UI
      setTous(x=>x.filter(p=>p.id!==j.id));
      addLog?.("Compte supprimé", j.pseudo, "danger");
      setMsg(m=>({...m,[j.id]:"✅ Compte et données associées supprimés."}));
    } catch(e) {
      alert(`❌ Erreur lors de la suppression de ${j.pseudo} :\n${e.message}`);
      setSaving(s=>({...s,[j.id]:false}));
    }
  };

  const banirJoueur = async (j) => {
    if (!window.confirm(`🚫 BANNIR ${j.pseudo} ?\n\nCela va :\n• Remettre ses DRIX à 0\n• Supprimer son compte et toutes ses données\n\nIrréversible.`)) return;
    setSaving(s=>({...s,[j.id]:true}));
    try {
      // 1. Mettre DRIX à 0 + log du mouvement
      await sb(`joueurs?id=eq.${j.id}`,{method:"PATCH",body:JSON.stringify({drix:0}),prefer:"return=minimal"});
      await sb("drix_mouvements",{method:"POST",body:JSON.stringify({
        joueur_id:j.id, joueur_pseudo:j.pseudo, adversaire_pseudo:"Admin",
        variation:-(j.drix||1000), drix_avant:j.drix||1000, drix_apres:0,
        resultat:"defaite", date:Date.now(),
      })}).catch(()=>{});
      // 2. Nettoyer les tables liées
      await nettoyerJoueur(j.id);
      // 3. Supprimer le joueur
      await sb(`joueurs?id=eq.${j.id}`,{method:"DELETE",prefer:"return=minimal"});
      // 4. Retirer de l'UI
      setTous(x=>x.filter(p=>p.id!==j.id));
      addLog?.("Joueur banni", j.pseudo, "danger");
    } catch(e) {
      alert(`❌ Erreur ban ${j.pseudo} :\n${e.message}`);
      setSaving(s=>({...s,[j.id]:false}));
    }
  };

  const resetDrix = async (j) => {
    if (!window.confirm(`🔄 Remettre les DRIX de ${j.pseudo} à 1000 ?`)) return;
    await appliquerDrix(j, 1000-(j.drix||1000));
    addLog?.("DRIX réinitialisé", j.pseudo, "warning");
  };

  return (
    <div>
      {/* Barre de recherche */}
      <div style={{display:"flex",gap:10,marginBottom:16,alignItems:"center"}}>
        <input
          value={recherche}
          onChange={e=>setRecherche(e.target.value)}
          placeholder="🔍 Filtrer par pseudo…"
          style={{flex:1,background:"#111",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14}}
        />
        {recherche&&<button onClick={()=>setRecherche("")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18}}>✕</button>}
        <div style={{color:C.muted,fontSize:12,whiteSpace:"nowrap"}}>{joueurs.length} joueur{joueurs.length!==1?"s":""}</div>
      </div>

      {loading && <Spinner/>}

      {!loading && joueurs.length === 0 && (
        <div style={{textAlign:"center",padding:50,color:C.muted}}>
          {recherche ? `Aucun joueur correspondant à "${recherche}"` : "Aucun joueur inscrit."}
        </div>
      )}

      {joueurs.map(j=>{
        const isOpen = !!expanded[j.id];
        return (
          <div key={j.id} style={{background:C.card,border:`1px solid ${isOpen?C.accent:C.border}`,borderRadius:14,marginBottom:10,overflow:"hidden",transition:"border-color .2s"}}>
            {/* Header carte — cliquable pour ouvrir */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",cursor:"pointer"}}
              onClick={()=>setExpanded(x=>({...x,[j.id]:!x[j.id]}))}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {j.photo
                  ? <img src={j.photo} style={{width:42,height:42,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.accent}`}} alt=""/>
                  : <div style={{width:42,height:42,borderRadius:"50%",background:`${C.accent}22`,border:`1px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:700}}>{(j.pseudo||"?")[0].toUpperCase()}</div>}
                <div>
                  <div style={{fontWeight:800,fontSize:15}}>{j.pseudo}</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                    {j.date_inscription ? `Inscrit le ${new Date(j.date_inscription).toLocaleDateString("fr-FR")}` : "—"}
                    {j.bar_slug && <span style={{marginLeft:8}}>🍺 {j.bar_slug}</span>}
                  </div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:16}}>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:20,fontWeight:900,color:C.accent}}>{j.drix??1000}</div>
                  <div style={{fontSize:10,color:C.muted,letterSpacing:1}}>DRIX</div>
                </div>
                <span style={{color:C.muted,fontSize:16,transform:isOpen?"rotate(180deg)":"",transition:"transform .2s"}}>▼</span>
              </div>
            </div>

            {/* Panel de gestion */}
            {isOpen && (
              <div style={{borderTop:`1px solid ${C.border}`,padding:"18px 18px",display:"flex",flexDirection:"column",gap:18}}>

                {/* Section DRIX */}
                <div style={{background:"#0a1a0a",border:`1px solid ${C.green}22`,borderRadius:12,padding:16}}>
                  <div style={{fontSize:12,color:C.green,fontWeight:700,letterSpacing:.5,marginBottom:12}}>💎 GESTION DRIX</div>

                  {/* Boutons delta rapides */}
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:11,color:C.muted,marginBottom:6}}>Ajuster (delta)</div>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                      {[-500,-200,-100,-50,-10,10,50,100,200,500].map(v=>(
                        <button key={v} onClick={()=>appliquerDrix(j,v)} disabled={saving[j.id]}
                          style={{background:v>0?"#10b98118":"#ef444418",color:v>0?"#10b981":"#ef4444",border:`1px solid ${v>0?"#10b98133":"#ef444433"}`,borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:700,opacity:saving[j.id]?.5:1}}>
                          {v>0?"+":""}{v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ajustement personnalisé */}
                  <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                    <div style={{flex:1,minWidth:140}}>
                      <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Delta personnalisé (+/-)</div>
                      <div style={{display:"flex",gap:6}}>
                        <input type="number" value={drixVal[j.id]||""} onChange={e=>setDrixVal(d=>({...d,[j.id]:e.target.value}))}
                          placeholder="ex: +150 ou -80"
                          style={{flex:1,background:"#111",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13}}/>
                        <button onClick={()=>appliquerDrix(j,drixVal[j.id])} disabled={saving[j.id]||!drixVal[j.id]}
                          style={{background:"#10b98122",color:"#10b981",border:`1px solid #10b98155`,borderRadius:8,padding:"8px 14px",cursor:"pointer",fontWeight:700,fontSize:13,opacity:(saving[j.id]||!drixVal[j.id])?.5:1}}>
                          Appliquer
                        </button>
                      </div>
                    </div>
                    <div style={{flex:1,minWidth:140}}>
                      <div style={{fontSize:11,color:C.muted,marginBottom:4}}>Fixer à une valeur absolue</div>
                      <div style={{display:"flex",gap:6}}>
                        <input type="number" value={setDrix[j.id]||""} onChange={e=>setSetDrix(d=>({...d,[j.id]:e.target.value}))}
                          placeholder="ex: 1250"
                          style={{flex:1,background:"#111",border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 10px",color:C.text,fontSize:13}}/>
                        <button onClick={()=>fixerDrix(j,setDrix[j.id])} disabled={saving[j.id]||!setDrix[j.id]}
                          style={{background:"#1e3a5f",color:C.blue,border:`1px solid ${C.blue}55`,borderRadius:8,padding:"8px 14px",cursor:"pointer",fontWeight:700,fontSize:13,opacity:(saving[j.id]||!setDrix[j.id])?.5:1}}>
                          Fixer
                        </button>
                      </div>
                    </div>
                  </div>

                  <button onClick={()=>resetDrix(j)} disabled={saving[j.id]}
                    style={{background:"#1a1200",color:C.yellow,border:`1px solid ${C.yellow}44`,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontWeight:600,fontSize:12}}>
                    🔄 Remettre à 1000
                  </button>

                  {msg[j.id] && <div style={{marginTop:10,padding:"8px 12px",background:"#10b98118",border:`1px solid #10b98133`,borderRadius:8,fontSize:13,color:"#10b981",fontWeight:600}}>{msg[j.id]}</div>}
                </div>

                {/* Section actions */}
                <div style={{background:"#1a0000",border:`1px solid ${C.red}22`,borderRadius:12,padding:16}}>
                  <div style={{fontSize:12,color:C.red,fontWeight:700,letterSpacing:.5,marginBottom:12}}>⚠️ ACTIONS ADMINISTRATIVES</div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={()=>supprimerCompte(j)} disabled={saving[j.id]}
                      style={{background:"#1a0000",color:C.red,border:`1px solid ${C.red}55`,borderRadius:8,padding:"9px 16px",cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                      🗑 Supprimer le compte
                    </button>
                    <button onClick={()=>banirJoueur(j)} disabled={saving[j.id]}
                      style={{background:"#1a0014",color:"#f43f5e",border:`1px solid #f43f5e55`,borderRadius:8,padding:"9px 16px",cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                      🚫 Bannir (DRIX 0 + suppression)
                    </button>
                  </div>
                  <div style={{marginTop:10,fontSize:11,color:C.muted}}>⚠️ Ces actions sont irréversibles et seront enregistrées dans les logs.</div>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Admin = ({ bars, setBars, associations, setAssociations, tournois, setTournois, setPage, setBarSlug, setAssoSlug, setTournoiSlug }) => {
  const [tab, setTab]               = useState("dashboard");
  const [propositions, setPropositions] = useState([]);
  const [signalements, setSignalements] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editBar, setEditBar]       = useState(null);
  const [editAsso, setEditAsso]     = useState(null);
  const [editTournoi, setEditTournoi] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [joueursList, setJoueursList] = useState([]);
  const [avisCount, setAvisCount]   = useState(0);
  const [adminLogs, setAdminLogs]   = useState([]);
  const [stats, setStats]           = useState({ matchsDuJour:0, joueursActifs:0, nouveauxJoueurs:0, totalJoueurs:0 });

  const addLog = (action, cible, type="info") =>
    setAdminLogs(l => [{ id:Date.now(), action, cible, type, date:new Date().toLocaleString("fr-FR") }, ...l.slice(0,49)]);

  useEffect(()=>{
    const weekAgo = Date.now() - 7*24*60*60*1000;
    Promise.all([
      db.getPropositions(),
      db.getSignalements(),
      fetch(`${SB_URL}/rest/v1/avis?valide=eq.false&select=id`,{headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`}}).then(r=>r.json()).catch(()=>[]),
      sb(`joueurs?order=date_inscription.desc&limit=200&select=id,pseudo,drix,date_inscription,photo_url`).catch(()=>[]),
      sb(`duels?statut=eq.en_cours&select=id`).catch(()=>[]),
    ]).then(([p,s,av,j,duels])=>{
      setPropositions(p||[]);
      setSignalements(s||[]);
      setAvisCount((av||[]).length);
      const jList = j||[];
      setJoueursList(jList);
      setStats({
        matchsDuJour: (duels||[]).length,
        joueursActifs: 0,
        nouveauxJoueurs: jList.filter(x=>x.date_inscription&&new Date(x.date_inscription).getTime()>weekAgo).length,
        totalJoueurs: jList.length,
      });
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const validerBar=async p=>{const slug=slugify(p.nom+"-"+p.ville);let lat=null,lng=null;try{const q=encodeURIComponent(`${p.adresse||p.nom}, ${p.ville}, France`);const geo=await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);const geoData=await geo.json();if(geoData?.[0]){lat=parseFloat(geoData[0].lat);lng=parseFloat(geoData[0].lon);}if(!lat){const q2=encodeURIComponent(`${p.ville}, France`);const geo2=await fetch(`https://nominatim.openstreetmap.org/search?q=${q2}&format=json&limit=1`);const geoData2=await geo2.json();if(geoData2?.[0]){lat=parseFloat(geoData2[0].lat);lng=parseFloat(geoData2[0].lon);}}}catch(e){}const nb={slug,nom:p.nom,ville:p.ville,cp:p.cp||"",adresse:p.adresse||"",tel:p.tel||"",type:p.type||"electronique",cibles:parseInt(p.cibles)||1,horaires:"",description:"",tournois:p.tournois==="oui",association:null,source:"user",verifie:true,vues:0,lat,lng};const r=await db.addBar(nb);if(r?.[0])setBars(b=>[...b,r[0]]);await db.updateProposition(p.id,{statut:"publie"});setPropositions(x=>x.map(y=>y.id===p.id?{...y,statut:"publie"}:y));addLog("Bar validé",p.nom,"success");};
  const validerAsso=async p=>{const slug=slugify(p.nom+"-"+p.ville);const nb={slug,nom:p.nom,ville:p.ville,zone:p.zone||"",type:p.type||"electronique",jours:p.jours||"À confirmer",lieu:p.lieu||"",tel:p.tel||"",contact:p.contact||"",description:p.description||"",bars:[],source:"user",verifie:true,lat:null,lng:null};const r=await db.addAssociation(nb);if(r?.[0])setAssociations(a=>[...a,r[0]]);await db.updateProposition(p.id,{statut:"publie"});setPropositions(x=>x.map(y=>y.id===p.id?{...y,statut:"publie"}:y));addLog("Association validée",p.nom,"success");};
  const validerTournoi=async p=>{const slug=slugify(p.nom+"-"+p.ville+"-"+(p.date||""));const nb={slug,nom:p.nom,ville:p.ville,date:p.date||"",bar:p.bar||"",association:p.association||"",type:p.type||"electronique",format:p.format||"individuel",niveau:p.niveau||"tous",prix:p.prix||"",dotations:p.dotations||"",places:p.places||"",description:p.description||"",contact:p.contact||"",lien:p.lien||"",source:"user",statut:"publie",lat:null,lng:null};const r=await db.addTournoi(nb);if(r?.[0])setTournois(t=>[...t,r[0]]);await db.updateProposition(p.id,{statut:"publie"});setPropositions(x=>x.map(y=>y.id===p.id?{...y,statut:"publie"}:y));addLog("Tournoi validé",p.nom,"success");};
  const refuser=async(id,nom)=>{await db.updateProposition(id,{statut:"refuse"});setPropositions(x=>x.map(y=>y.id===id?{...y,statut:"refuse"}:y));addLog("Proposition refusée",nom||id,"warning");};

  const allPending = propositions.filter(p=>p.statut==="en_attente");
  const sigPending = signalements.filter(s=>!s.traite);
  const totalUrgent = allPending.length + sigPending.length + avisCount;

  // Global search
  const doSearch = (q) => {
    if (!q.trim()) { setSearchResults(null); return; }
    const lq = q.toLowerCase();
    setSearchResults({
      bars: bars.filter(b=>b.nom?.toLowerCase().includes(lq)||b.ville?.toLowerCase().includes(lq)),
      assos: associations.filter(a=>a.nom?.toLowerCase().includes(lq)||a.ville?.toLowerCase().includes(lq)),
      tournois: tournois.filter(t=>t.nom?.toLowerCase().includes(lq)||t.ville?.toLowerCase().includes(lq)),
      joueurs: joueursList.filter(j=>j.pseudo?.toLowerCase().includes(lq)),
    });
  };

  // ── STYLES ──
  const tabBtn = (t) => ({
    background: tab===t ? `${C.accent}22` : "transparent",
    color: tab===t ? C.accent : C.muted,
    border: `1px solid ${tab===t ? C.accent : C.border}`,
    cursor:"pointer", padding:"8px 14px", borderRadius:10,
    fontSize:12, fontWeight:600, whiteSpace:"nowrap", position:"relative",
  });

  const LOG_COLORS = { success:"#22c55e", warning:"#f59e0b", danger:"#ef4444", info:"#60a5fa" };
  const LOG_ICONS  = { success:"✅", warning:"⚠️", danger:"🗑", info:"ℹ️" };

  // ── RENDER TABS ──
  const renderPending = () => (
    <div>
      {allPending.length===0
        ? <div style={{textAlign:"center",padding:60,color:C.muted}}>📭 Aucune proposition en attente.</div>
        : allPending.map(p=>{
            const isAsso=p.type_prop==="association"; const isTournoi=p.type_prop==="tournoi";
            return (
              <div key={p.id} style={{background:C.card,border:`1px solid ${C.accent}33`,borderRadius:14,padding:20,marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <span style={{fontSize:20}}>{isAsso?"🫂":isTournoi?"🏅":"🎯"}</span>
                  <div>
                    <div style={{fontWeight:800,fontSize:15}}>{p.nom}</div>
                    <div style={{color:C.muted,fontSize:12}}>📍 {p.ville}{p.date?" · "+p.date:""} · {isAsso?"Association":isTournoi?"Tournoi":"Bar"}</div>
                  </div>
                  <div style={{marginLeft:"auto",background:PRIO.urgent.bg,border:`1px solid ${PRIO.urgent.border}`,borderRadius:8,padding:"3px 10px",fontSize:11,color:PRIO.urgent.text}}>🔴 Urgent</div>
                </div>
                {(p.description||p.commentaire)&&<p style={{color:"#cbd5e1",fontSize:12,fontStyle:"italic",background:"#111",padding:"8px 12px",borderRadius:8,marginBottom:12}}>"{(p.description||p.commentaire||"").slice(0,150)}"</p>}
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Btn variant="success" onClick={()=>isAsso?validerAsso(p):isTournoi?validerTournoi(p):validerBar(p)} style={{fontSize:12}}>✅ Valider & Publier</Btn>
                  <Btn variant="danger" onClick={()=>refuser(p.id,p.nom)} style={{fontSize:12}}>❌ Refuser</Btn>
                </div>
              </div>
            );
          })}
    </div>
  );

  const renderBars = () => (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
      {bars.map(b=>(
        <div key={b.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
          <div onClick={()=>{setBarSlug(b.slug);setPage("bar");}} style={{cursor:"pointer",marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:6}}>{b.nom}{b.verifie&&<span style={{color:C.green,fontSize:12}}>✅</span>}</div>
            <div style={{color:C.muted,fontSize:12}}>📍 {b.ville} · 👁 {b.vues||0} vues</div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            <button onClick={()=>db.toggleVerifie(b.slug,!b.verifie).then(()=>{setBars(x=>x.map(y=>y.slug===b.slug?{...y,verifie:!y.verifie}:y));addLog(b.verifie?"Bar dévérifié":"Bar vérifié",b.nom,"info");})} style={{background:b.verifie?"#14532d":"#111",border:`1px solid ${b.verifie?C.green:C.border}`,borderRadius:6,color:b.verifie?C.green:C.muted,cursor:"pointer",fontSize:11,padding:"4px 8px"}}>{b.verifie?"✅ Vérifié":"Vérifier"}</button>
            <button onClick={()=>setEditBar(b)} style={{background:"#1a1200",border:`1px solid ${C.yellow}44`,borderRadius:6,color:C.yellow,cursor:"pointer",fontSize:11,padding:"4px 8px"}}>✏️ Éditer</button>
            <button onClick={async()=>{let lat=null,lng=null;try{const q=encodeURIComponent(`${b.adresse||b.nom}, ${b.ville}, France`);const geo=await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);const gd=await geo.json();if(gd?.[0]){lat=parseFloat(gd[0].lat);lng=parseFloat(gd[0].lon);}if(!lat){const q2=encodeURIComponent(`${b.ville}, France`);const geo2=await fetch(`https://nominatim.openstreetmap.org/search?q=${q2}&format=json&limit=1`);const gd2=await geo2.json();if(gd2?.[0]){lat=parseFloat(gd2[0].lat);lng=parseFloat(gd2[0].lon);}}}catch(e){}if(lat){await db.updateBar(b.slug,{lat,lng});setBars(x=>x.map(y=>y.slug===b.slug?{...y,lat,lng}:y));alert("✅ GPS mis à jour!");}else{alert("❌ Adresse introuvable");}}} style={{background:"#0f1a0f",border:`1px solid ${C.green}44`,borderRadius:6,color:C.green,cursor:"pointer",fontSize:11,padding:"4px 8px"}}>📍 GPS</button>
            <button onClick={async()=>{if(!window.confirm("Supprimer ce bar ?"))return;await db.deleteBar(b.slug);setBars(x=>x.filter(y=>y.slug!==b.slug));addLog("Bar supprimé",b.nom,"danger");}} style={{background:"#1a0000",border:`1px solid ${C.red}44`,borderRadius:6,color:C.red,cursor:"pointer",fontSize:11,padding:"4px 8px"}}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAssos = () => (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
      {associations.map(a=>(
        <div key={a.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
          <div onClick={()=>{setAssoSlug(a.slug);setPage("asso");}} style={{cursor:"pointer",marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:14}}>{a.nom}</div>
            <div style={{color:C.muted,fontSize:12}}>📍 {a.ville} · {a.type}</div>
          </div>
          <div style={{display:"flex",gap:5}}>
            <button onClick={()=>setEditAsso(a)} style={{background:"#1a1200",border:`1px solid ${C.yellow}44`,borderRadius:6,color:C.yellow,cursor:"pointer",fontSize:11,padding:"4px 8px"}}>✏️ Éditer</button>
            <button onClick={async()=>{if(!window.confirm("Supprimer ?"))return;await db.deleteAssociation(a.slug);setAssociations(x=>x.filter(y=>y.slug!==a.slug));addLog("Asso supprimée",a.nom,"danger");}} style={{background:"#1a0000",border:`1px solid ${C.red}44`,borderRadius:6,color:C.red,cursor:"pointer",fontSize:11,padding:"4px 8px"}}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTournois = () => (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
      {tournois.map(t=>(
        <div key={t.id} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14}}>
          <div onClick={()=>{setTournoiSlug(t.slug);setPage("tournoi-detail");}} style={{cursor:"pointer",marginBottom:10}}>
            <div style={{fontWeight:700,fontSize:14}}>{t.nom}</div>
            <div style={{color:C.muted,fontSize:12}}>📍 {t.ville} · 📅 {t.date}</div>
          </div>
          <div style={{display:"flex",gap:5}}>
            <button onClick={()=>setEditTournoi(t)} style={{background:"#1a1200",border:`1px solid ${C.yellow}44`,borderRadius:6,color:C.yellow,cursor:"pointer",fontSize:11,padding:"4px 8px"}}>✏️ Éditer</button>
            <button onClick={async()=>{if(!window.confirm("Supprimer ?"))return;await db.deleteTournoi(t.slug);setTournois(x=>x.filter(y=>y.slug!==t.slug));addLog("Tournoi supprimé",t.nom,"danger");}} style={{background:"#1a0000",border:`1px solid ${C.red}44`,borderRadius:6,color:C.red,cursor:"pointer",fontSize:11,padding:"4px 8px"}}>🗑</button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSignalements = () => (
    sigPending.length===0
      ? <div style={{textAlign:"center",padding:60,color:C.muted}}>✅ Aucun signalement actif.</div>
      : sigPending.map(s=>(
          <div key={s.id} style={{background:C.card,border:`1px solid ${C.red}44`,borderRadius:14,padding:18,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontWeight:800,fontSize:15,color:C.red}}>⚠️ {s.bar_nom}</div>
                <div style={{color:C.muted,fontSize:12}}>{s.type} · {new Date(s.date).toLocaleDateString("fr-FR")}</div>
              </div>
              <div style={{background:PRIO.urgent.bg,border:`1px solid ${PRIO.urgent.border}`,borderRadius:8,padding:"3px 10px",fontSize:11,color:PRIO.urgent.text}}>🔴 Urgent</div>
            </div>
            <p style={{color:"#cbd5e1",fontSize:13,background:"#111",padding:"10px 14px",borderRadius:10,marginBottom:12}}>{s.message}</p>
            <div style={{display:"flex",gap:8}}>
              <Btn variant="ghost" onClick={()=>{setBarSlug(s.bar_slug);setPage("bar");}} style={{fontSize:12}}>👁 Voir le bar</Btn>
              <Btn variant="success" onClick={async()=>{await db.updateSignalement(s.id,{traite:true});setSignalements(x=>x.map(y=>y.id===s.id?{...y,traite:true}:y));addLog("Signalement traité",s.bar_nom,"success");}} style={{fontSize:12}}>✅ Marquer traité</Btn>
            </div>
          </div>
        ))
  );

  const renderDashboard = () => (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      {/* KPI Cards */}
      <div>
        <div style={{fontSize:13,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:12}}>📊 INDICATEURS CLÉS</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <AdminKpiCard icon="⏳" label="En attente" count={allPending.length} prio={allPending.length>0?"urgent":"normal"} onClick={()=>setTab("pending")}/>
          <AdminKpiCard icon="💬" label="Avis à modérer" count={avisCount} prio={avisCount>0?"important":"normal"} onClick={()=>setTab("avismod")}/>
          <AdminKpiCard icon="⚠️" label="Signalements" count={sigPending.length} prio={sigPending.length>0?"urgent":"normal"} onClick={()=>setTab("signalements")}/>
          <AdminKpiCard icon="👥" label="Total joueurs" count={stats.totalJoueurs} prio="normal"/>
          <AdminKpiCard icon="🆕" label="Nouveaux (7j)" count={stats.nouveauxJoueurs} prio={stats.nouveauxJoueurs>0?"important":"normal"}/>
          <AdminKpiCard icon="🎯" label="Bars référencés" count={bars.length} prio="normal"/>
          <AdminKpiCard icon="🫂" label="Associations" count={associations.length} prio="normal"/>
          <AdminKpiCard icon="🏅" label="Tournois" count={tournois.length} prio="normal"/>
        </div>
      </div>

      {/* Analytics */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
        {/* Plateforme */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
          <div style={{fontSize:13,color:C.accent,fontWeight:700,letterSpacing:.5,marginBottom:16}}>📈 ANALYTICS PLATEFORME</div>
          {[
            ["🎯 Bars", bars.length, `${bars.filter(b=>b.verifie).length} vérifiés`],
            ["🫂 Associations", associations.length, `${associations.length} actives`],
            ["🏅 Tournois", tournois.length, `${tournois.filter(t=>new Date(t.date)>new Date()).length} à venir`],
            ["👥 Joueurs", stats.totalJoueurs, `${stats.nouveauxJoueurs} nouveaux cette semaine`],
            ["⏳ Propositions", allPending.length, `en attente de validation`],
          ].map(([label, count, sub])=>(
            <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div>
                <div style={{fontSize:13,fontWeight:600}}>{label}</div>
                <div style={{fontSize:11,color:C.muted}}>{sub}</div>
              </div>
              <div style={{fontSize:22,fontWeight:900,color:C.text}}>{count}</div>
            </div>
          ))}
        </div>

        {/* Sécurité */}
        <div style={{background:C.card,border:`1px solid ${C.red}33`,borderRadius:16,padding:20}}>
          <div style={{fontSize:13,color:C.red,fontWeight:700,letterSpacing:.5,marginBottom:16}}>🔒 SÉCURITÉ</div>
          {[
            { label:"Signalements actifs", count:sigPending.length, prio:sigPending.length>0?"urgent":"normal" },
            { label:"Avis en attente", count:avisCount, prio:avisCount>3?"important":"normal" },
            { label:"Propositions non traitées", count:allPending.length, prio:allPending.length>0?"important":"normal" },
          ].map(sec=>(
            <div key={sec.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
              <div style={{fontSize:13,fontWeight:600}}>{sec.label}</div>
              <div style={{background:PRIO[sec.prio].bg,color:PRIO[sec.prio].text,border:`1px solid ${PRIO[sec.prio].border}44`,borderRadius:8,padding:"2px 10px",fontSize:12,fontWeight:700}}>
                {sec.count} {PRIO[sec.prio].label.split(" ")[0]}
              </div>
            </div>
          ))}
          <div style={{marginTop:14,padding:12,background:"#0f1a0f",borderRadius:10,border:`1px solid ${C.green}22`}}>
            <div style={{fontSize:12,color:C.green,fontWeight:600}}>🛡️ Statut global</div>
            <div style={{fontSize:11,color:C.muted,marginTop:4}}>{totalUrgent===0?"Plateforme saine — aucune urgence.":`${totalUrgent} élément(s) nécessitent attention.`}</div>
          </div>
        </div>

        {/* Actions rapides */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
          <div style={{fontSize:13,color:C.yellow,fontWeight:700,letterSpacing:.5,marginBottom:16}}>⚡ ACTIONS RAPIDES</div>
          {[
            {icon:"➕",label:"Ajouter un bar",color:C.accent,action:()=>setPage("proposer")},
            {icon:"🏅",label:"Ajouter un tournoi",color:C.yellow,action:()=>setPage("proposer-tournoi")},
            {icon:"🫂",label:"Ajouter une association",color:"#a78bfa",action:()=>setPage("proposer-asso")},
            {icon:"👤",label:"Gérer les joueurs",color:C.blue,action:()=>setTab("joueurs")},
            {icon:"⏳",label:`Voir les ${allPending.length} propositions`,color:allPending.length>0?C.red:C.muted,action:()=>setTab("pending")},
            {icon:"⚠️",label:`Signalements (${sigPending.length})`,color:sigPending.length>0?C.red:C.muted,action:()=>setTab("signalements")},
          ].map(a=>(
            <button key={a.label} onClick={a.action} style={{width:"100%",background:"#0f0f0f",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,marginBottom:8,color:a.color,fontWeight:600,fontSize:13,textAlign:"left",transition:"background .15s"}}
              onMouseEnter={e=>e.currentTarget.style.background="#1a1a1a"}
              onMouseLeave={e=>e.currentTarget.style.background="#0f0f0f"}>
              <span style={{fontSize:18}}>{a.icon}</span>{a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs récents */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20}}>
        <div style={{fontSize:13,color:C.muted,fontWeight:700,letterSpacing:.5,marginBottom:14}}>📜 ACTIVITÉ RÉCENTE (session)</div>
        {adminLogs.length===0
          ? <div style={{textAlign:"center",color:C.muted,padding:30,fontSize:13}}>Aucune action effectuée dans cette session.</div>
          : adminLogs.slice(0,10).map(log=>(
              <div key={log.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:16}}>{LOG_ICONS[log.type]||"ℹ️"}</span>
                <div style={{flex:1}}>
                  <span style={{fontWeight:600,fontSize:13}}>{log.action}</span>
                  <span style={{color:C.muted,fontSize:12}}> — {log.cible}</span>
                </div>
                <span style={{fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{log.date}</span>
              </div>
            ))}
      </div>
    </div>
  );

  const renderLogs = () => (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:13,color:C.muted}}>Historique des actions de la session en cours</div>
        {adminLogs.length>0&&<button onClick={()=>setAdminLogs([])} style={{background:"#1a0000",color:C.red,border:`1px solid ${C.red}44`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12}}>🗑 Vider</button>}
      </div>
      {adminLogs.length===0
        ? <div style={{textAlign:"center",padding:60,color:C.muted}}>Aucune action enregistrée.</div>
        : adminLogs.map(log=>(
            <div key={log.id} style={{background:C.card,border:`1px solid ${LOG_COLORS[log.type]||C.border}33`,borderRadius:12,padding:"14px 18px",marginBottom:8,display:"flex",alignItems:"center",gap:14}}>
              <span style={{fontSize:20}}>{LOG_ICONS[log.type]||"ℹ️"}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:14,color:LOG_COLORS[log.type]||C.text}}>{log.action}</div>
                <div style={{fontSize:12,color:C.muted}}>Cible : {log.cible}</div>
              </div>
              <div style={{fontSize:11,color:C.muted,textAlign:"right"}}>
                <div>Admin</div>
                <div>{log.date}</div>
              </div>
            </div>
          ))}
    </div>
  );

  const TABS = [
    ["dashboard","📊 Dashboard"],
    ["pending",`⏳ En attente${allPending.length>0?` (${allPending.length})`:""}`,allPending.length>0?"urgent":null],
    ["avismod",`💬 Avis${avisCount>0?` (${avisCount})`:""}`,avisCount>0?"important":null],
    ["allbars",`🎯 Bars (${bars.length})`],
    ["allassos",`🫂 Assos (${associations.length})`],
    ["alltournois",`🏅 Tournois (${tournois.length})`],
    ["signalements",`⚠️ Signalements${sigPending.length>0?` (${sigPending.length})`:""}`,sigPending.length>0?"urgent":null],
    ["joueurs","👤 Joueurs"],
    ["logs",`📜 Logs${adminLogs.length>0?` (${adminLogs.length})`:""}`,null],
  ];

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"0 0 60px"}}>
      {editBar&&<EditBarModal bar={editBar} onSave={u=>{setBars(b=>b.map(x=>x.slug===u.slug?u:x));setEditBar(null);addLog("Bar édité",u.nom,"info");}} onClose={()=>setEditBar(null)}/>}
      {editAsso&&<EditAssoModal asso={editAsso} onSave={u=>{setAssociations(a=>a.map(x=>x.slug===u.slug?u:x));setEditAsso(null);addLog("Association éditée",u.nom,"info");}} onClose={()=>setEditAsso(null)}/>}
      {editTournoi&&<EditTournoiModal tournoi={editTournoi} onSave={u=>{setTournois(t=>t.map(x=>x.slug===u.slug?u:x));setEditTournoi(null);addLog("Tournoi édité",u.nom,"info");}} onClose={()=>setEditTournoi(null)}/>}

      {/* ── HEADER ── */}
      <div style={{background:"linear-gradient(135deg,#1a0a00,#0f0f0f)",borderBottom:`1px solid ${C.accent}33`,padding:"24px 20px 20px",marginBottom:0}}>
        <div style={{maxWidth:1060,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
            <div>
              <h1 style={{fontWeight:900,fontSize:26,margin:0,background:`linear-gradient(90deg,${C.accent},${C.yellow})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>⚙️ Administration</h1>
              <p style={{color:C.muted,fontSize:13,marginTop:4}}>Centre de contrôle Dart Point</p>
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
              <div style={{background:`${C.accent}15`,border:`1px solid ${C.accent}33`,borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.muted}}>DATE</div>
                <div style={{fontWeight:700,fontSize:13,color:C.accent}}>{new Date().toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"})}</div>
              </div>
              <div style={{background:`${C.green}15`,border:`1px solid ${C.green}33`,borderRadius:10,padding:"8px 14px",textAlign:"center"}}>
                <div style={{fontSize:11,color:C.muted}}>JOUEURS</div>
                <div style={{fontWeight:700,fontSize:13,color:C.green}}>{stats.totalJoueurs} inscrits</div>
              </div>
              {totalUrgent>0&&<div style={{background:`${C.red}15`,border:`1px solid ${C.red}`,borderRadius:10,padding:"8px 14px",textAlign:"center",animation:"pulse 2s infinite"}}>
                <div style={{fontSize:11,color:C.red}}>URGENCES</div>
                <div style={{fontWeight:900,fontSize:16,color:C.red}}>{totalUrgent}</div>
              </div>}
            </div>
          </div>

          {/* Recherche globale */}
          <div style={{position:"relative"}}>
            <input
              value={globalSearch}
              onChange={e=>{setGlobalSearch(e.target.value);doSearch(e.target.value);}}
              placeholder="🔍 Rechercher un joueur, bar, tournoi, association…"
              style={{width:"100%",background:"#111",border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 16px",color:C.text,fontSize:14,boxSizing:"border-box"}}/>
            {searchResults&&(
              <div style={{position:"absolute",top:"100%",left:0,right:0,background:"#1a1a1a",border:`1px solid ${C.border}`,borderRadius:12,zIndex:100,maxHeight:320,overflowY:"auto",marginTop:4,padding:8}}>
                {["bars","assos","tournois","joueurs"].map(cat=>{
                  const items = searchResults[cat]||[];
                  if(!items.length) return null;
                  const labels = {bars:"🎯 Bars",assos:"🫂 Associations",tournois:"🏅 Tournois",joueurs:"👤 Joueurs"};
                  return (
                    <div key={cat}>
                      <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:1,padding:"6px 8px"}}>{labels[cat]}</div>
                      {items.slice(0,4).map(item=>(
                        <div key={item.id||item.slug} style={{padding:"8px 12px",borderRadius:8,cursor:"pointer",fontSize:13}} onClick={()=>{
                          setGlobalSearch(""); setSearchResults(null);
                          if(cat==="bars"){setBarSlug(item.slug);setPage("bar");}
                          else if(cat==="assos"){setAssoSlug(item.slug);setPage("asso");}
                          else if(cat==="tournois"){setTournoiSlug(item.slug);setPage("tournoi-detail");}
                          else setTab("joueurs");
                        }}
                          onMouseEnter={e=>e.currentTarget.style.background="#2a2a2a"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <span style={{fontWeight:600}}>{item.nom||item.pseudo}</span>
                          <span style={{color:C.muted,fontSize:11,marginLeft:8}}>📍 {item.ville||`${item.drix??1000} DRIX`}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {Object.values(searchResults).every(a=>!a.length)&&<div style={{textAlign:"center",padding:20,color:C.muted,fontSize:13}}>Aucun résultat</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{background:"#111",borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:50}}>
        <div style={{maxWidth:1060,margin:"0 auto",padding:"0 20px",overflowX:"auto",display:"flex",gap:4,paddingTop:8,paddingBottom:8}}>
          {TABS.map(([t,l,prio])=>(
            <button key={t} onClick={()=>setTab(t)} style={{...tabBtn(t),position:"relative",flexShrink:0}}>
              {l}
              {prio&&<span style={{position:"absolute",top:-4,right:-4,width:8,height:8,borderRadius:"50%",background:PRIO[prio].border,display:"block"}}/>}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{maxWidth:1060,margin:"0 auto",padding:"24px 20px"}}>
        {loading ? <Spinner/>
          : tab==="dashboard"   ? renderDashboard()
          : tab==="pending"     ? renderPending()
          : tab==="avismod"     ? <AvisAdminSection/>
          : tab==="allbars"     ? renderBars()
          : tab==="allassos"    ? renderAssos()
          : tab==="alltournois" ? renderTournois()
          : tab==="signalements"? renderSignalements()
          : tab==="joueurs"     ? <AdminJoueurs addLog={addLog}/>
          : tab==="logs"        ? renderLogs()
          : null}
      </div>
    </div>
  );
};

// ── BADGES RECAP MODAL ────────────────────────────────────────────────────────
const BadgesRecapModal = ({ badges, onClose, setPage }) => (
  <div style={{ position:"fixed",inset:0,background:"#000c",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }} onClick={onClose}>
    <div style={{ background:"#1a1a1a",border:"1px solid #ffd70066",borderRadius:20,padding:28,maxWidth:380,width:"100%",textAlign:"center" }} onClick={e=>e.stopPropagation()}>
      <div style={{ fontSize:40, marginBottom:8 }}>🏅</div>
      <h2 style={{ fontWeight:900, fontSize:20, color:"#ffd700", marginBottom:4 }}>Badge{badges.length>1?"s":""} débloqué{badges.length>1?"s":""}!</h2>
      <p style={{ color:"#94a3b8", fontSize:13, marginBottom:20 }}>Félicitations !</p>
      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:24 }}>
        {badges.map(b=>(
          <div key={b.id} style={{ background:b.couleur+"18", border:`1px solid ${b.couleur}44`, borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:28 }}>{b.emoji}</span>
            <div style={{ textAlign:"left" }}>
              <div style={{ fontWeight:700, fontSize:14, color:b.couleur }}>{b.nom}</div>
              <div style={{ fontSize:11, color:"#94a3b8" }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:10 }}>
        <button onClick={()=>{onClose();setPage("profil-badges");}} style={{ flex:1,background:"#ffd70022",border:"1px solid #ffd70066",color:"#ffd700",borderRadius:10,padding:"10px",cursor:"pointer",fontWeight:700,fontSize:13 }}>Voir mes badges</button>
        <button onClick={onClose} style={{ flex:1,background:"#ffffff12",border:"1px solid #ffffff22",color:"#fff",borderRadius:10,padding:"10px",cursor:"pointer",fontWeight:700,fontSize:13 }}>Continuer</button>
      </div>
    </div>
  </div>
);

// ── SCOREUR DUEL (charge le duel depuis Supabase) ─────────────────────────────
const ScoreurDuel = ({ duelId, joueur, setPage }) => {
  const [duel, setDuel] = useState(null);
  const [drixData, setDrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newBadges, setNewBadges] = useState([]);

  useEffect(() => {
    sb(`duels?id=eq.${duelId}&select=*`)
      .then(async r => {
        const d = r?.[0];
        if (d) {
          setDuel(d);
          // Calcul DRIX — fallback 1000 si fetch échoue
          let drix1 = 1000, drix2 = 1000;
          try {
            const players = await sb(`joueurs?id=in.(${d.challenger_id},${d.defie_id})&select=id,drix`);
            if (players?.length) {
              const p1 = players.find(p => p.id === d.challenger_id);
              const p2 = players.find(p => p.id === d.defie_id);
              drix1 = p1?.drix || 1000;
              drix2 = p2?.drix || 1000;
            }
          } catch {}
          const K   = 32 * Math.max(1, d.manches || 1);
          const EA1 = 1 / (1 + Math.pow(10, (drix2 - drix1) / 400)); // P(challenger gagne)
          const EA2 = 1 - EA1;                                         // P(défié gagne)
          // gain = K × P(adversaire gagnait) | perte = K × P(soi-même gagnait)
          setDrixData({
            challenger: { gain: Math.round(K * EA2), perte: Math.round(K * EA1) },
            defie:      { gain: Math.round(K * EA1), perte: Math.round(K * EA2) },
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [duelId]);

  const handleDuelTermine = async ({ gagnantId } = {}) => {
    if (!joueur) return;
    try {
      const [stats, duels, drixMvts, amis, trn, wtrn] = await Promise.all([
        sb(`stats_joueurs?joueur_id=eq.${joueur.id}&select=*`).then(r=>r?.[0]),
        sb(`duels?or=(challenger_id.eq.${joueur.id},defie_id.eq.${joueur.id})&order=date.desc&select=*`),
        sb(`drix_mouvements?joueur_id=eq.${joueur.id}&order=date.desc&limit=200&select=drix_apres`).catch(()=>[]),
        sb(`amis?or=(joueur_id.eq.${joueur.id},ami_id.eq.${joueur.id})&select=statut`).catch(()=>[]),
        sb(`tournois_potes_joueurs?joueur_id=eq.${joueur.id}&select=tournoi_id`).catch(()=>[]),
        sb(`tournois_potes?gagnant_id=eq.${joueur.id}&select=id`).catch(()=>[]),
      ]);
      const vals = computeBadgeValues(joueur, stats, duels||[], drixMvts||[], amis||[], (trn||[]).length, (wtrn||[]).length, 0, 0);
      const stored = getBadgesStored(joueur.id);
      const freshUnlocked = ALL_BADGES.filter(b=>b.val(vals)>=b.seuil);
      const justUnlocked = freshUnlocked.filter(b=>!stored.has(b.id));
      const newSet = new Set([...stored, ...freshUnlocked.map(b=>b.id)]);
      storeBadgesSet(joueur.id, newSet);
      if (justUnlocked.length > 0) {
        setNewBadges(justUnlocked);
        // Publier chaque nouveau badge sur le Comptoir
        for (const badge of justUnlocked) {
          sb("wall_posts", { method:"POST", body:JSON.stringify({
            joueur_id: joueur.id,
            joueur_pseudo: joueur.pseudo,
            joueur_photo: joueur.photo || null,
            contenu: `__BADGE__|${JSON.stringify({id:badge.id,emoji:badge.emoji,nom:badge.nom,desc:badge.desc,couleur:badge.couleur})}`,
            date: Date.now(),
          })}).catch(()=>{});
        }
      }
    } catch (e) {
      console.warn("Badge check failed", e);
    }
  };

  if (loading) return <Spinner/>;
  if (!duel) return <div style={{ textAlign:"center",padding:60,color:C.muted }}>Duel introuvable</div>;

  return (
    <>
      <Scoreur duel={duel} drixData={drixData} onDuelTermine={handleDuelTermine} setPage={setPage}/>
      {newBadges.length > 0 && (
        <BadgesRecapModal badges={newBadges} onClose={()=>setNewBadges([])} setPage={setPage}/>
      )}
    </>
  );
};

// ── FOOTER ────────────────────────────────────────────────────────────────────
const Footer = ({ setPage }) => (
  <footer style={{ background:"#111",borderTop:`1px solid ${C.border}`,padding:"24px 20px",marginTop:40 }}>
    <div style={{ maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
      <div><div style={{ fontWeight:800,fontSize:16,color:C.accent,marginBottom:2 }}>🎯 DartPoint</div><p style={{ color:C.muted,fontSize:12 }}>Le guide des bars à fléchettes en France</p></div>
      <div style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
      {[["bars","Bars"],["associations","Assos"],["tournois","Tournois"],["joueurs","Joueurs"],["drix","DRIX"],["scoreur","Scoreur"],["jeux","Jeux"],["proposer","Proposer"],["apropos","À propos"],["contact","Contact"],["mentions","Mentions légales"]].map(([p,l])=>(
          <button key={p} onClick={()=>setPage(p)} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12 }}>{l}</button>
        ))}
      </div>
    </div>
  </footer>
);

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [page,setPage]=useState("home");
  const [barSlug,setBarSlug]=useState(null);
  const [assoSlug,setAssoSlug]=useState(null);
  const [tournoiSlug,setTournoiSlug]=useState(null);
  const [joueurId,setJoueurId]=useState(null);
  const [isAdmin,setIsAdmin]=useState(false);
  const [bars,setBars]=useState([]);
  const [associations,setAssociations]=useState([]);
  const [tournois,setTournois]=useState([]);
  const [loading,setLoading]=useState(true);
  const [villeFilter,setVilleFilter]=useState(null);
  const [history,setHistory]=useState(["home"]);
  const [joueur,setJoueur]=useState(null);
  const [defisCount,setDefisCount]=useState(0);
  const [notifCount,setNotifCount]=useState(0);
  const [demandesAmisCount,setDemandesAmisCount]=useState(0);
  const [unreadMessages,setUnreadMessages]=useState(0);
  const prevDemandesRef = useRef(0);
  const [barsActifs,setBarsActifs]=useState([]);
  const [installPrompt,setInstallPrompt]=useState(null);
  const [isInstalled,setIsInstalled]=useState(false);
  // Vérification de version — mise à jour automatique sans bandeau
  useEffect(()=>{
    const VERSION_KEY = "dp_version";
    const check = async () => {
      try {
        const res = await fetch("/version.txt?t=" + Date.now(), { cache:"no-store" });
        if (!res.ok) return;
        const remote = (await res.text()).trim();
        const local = localStorage.getItem(VERSION_KEY);
        if (!local) { localStorage.setItem(VERSION_KEY, remote); return; }
        if (remote !== local) {
          localStorage.setItem(VERSION_KEY, remote);
          window.location.reload();
        }
      } catch {}
    };
    check();
    // Revérifier toutes les 2 minutes
    const interval = setInterval(check, 2 * 60 * 1000);
    return () => clearInterval(interval);
  },[]);

  // PWA install detection
  useEffect(()=>{
    // Déjà installé si lancé en standalone
    if (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone) {
      setIsInstalled(true); return;
    }
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    const onInstalled = () => { setInstallPrompt(null); setIsInstalled(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  },[]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") { setInstallPrompt(null); setIsInstalled(true); }
  };

  useEffect(()=>{ try{ const j=localStorage.getItem("dp_joueur"); if(j) setJoueur(JSON.parse(j)); }catch{} },[]);

  // Lien de partage tournoi entre potes (#t=UUID)
  useEffect(()=>{
    const hash=window.location.hash;
    if(hash.startsWith("#t=")){
      const tid=hash.replace("#t=","");
      if(tid)nav("tournoi-potes-"+tid);
      window.history.replaceState(null,"",window.location.pathname);
    }
  },[]);

  useEffect(()=>{
    Promise.all([db.getBars(),db.getAssociations(),db.getTournois()])
      .then(([b,a,t])=>{ setBars(b||[]); setAssociations(a||[]); setTournois(t||[]); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  useEffect(()=>{ dbJoueurs.getBarsActifs().then(r=>{ if(r) setBarsActifs([...new Set(r.map(x=>x.bar_slug))]); }).catch(()=>{}); },[]);

  useEffect(()=>{
    if (!joueur) { setDefisCount(0); setNotifCount(0); setDemandesAmisCount(0); setUnreadMessages(0); prevDemandesRef.current=0; return; }
    // Demander la permission de notifications au navigateur
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
    const fetchNotifs = () => {
      const now = Date.now();
      Promise.all([
        sb(`duels?or=(challenger_id.eq.${joueur.id},defie_id.eq.${joueur.id})&statut=eq.accepte&select=id`),
        sb(`amis?ami_id=eq.${joueur.id}&statut=eq.en_attente&select=id`),
        sb(`duels?defie_id=eq.${joueur.id}&statut=eq.termine&valide_defie=eq.false&select=id,date`),
        dbM.getUnreadCount(joueur.id),
      ]).then(([matchsActifs, demandesAmis, aContester, unread]) => {
        const matchsN = matchsActifs?.length || 0;
        const amisN = demandesAmis?.length || 0;
        const contestN = (aContester||[]).filter(d => now - (d.date||0) < 86400000).length;
        const msgN = unread?.length || 0;
        setDefisCount(matchsN + contestN);
        setNotifCount(matchsN + amisN + contestN);
        setDemandesAmisCount(amisN);
        setUnreadMessages(msgN);
        // Notification navigateur si nouvelle demande d'ami détectée
        if (amisN > prevDemandesRef.current && prevDemandesRef.current >= 0) {
          const nouvelles = amisN - prevDemandesRef.current;
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              navigator.serviceWorker?.ready.then(reg => {
                reg.showNotification("🎯 Dart Point", {
                  body: nouvelles === 1
                    ? "Tu as une nouvelle demande d'ami !"
                    : `Tu as ${nouvelles} nouvelles demandes d'ami !`,
                  icon: "/icon-192.png",
                  badge: "/icon-192.png",
                  tag: "demande-ami",
                });
              }).catch(()=>{
                new Notification("🎯 Dart Point", {
                  body: nouvelles === 1
                    ? "Tu as une nouvelle demande d'ami !"
                    : `Tu as ${nouvelles} nouvelles demandes d'ami !`,
                  icon: "/icon-192.png",
                });
              });
            } catch(e) {}
          }
        }
        prevDemandesRef.current = amisN;
      }).catch(()=>{});
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 10000);
    return () => clearInterval(interval);
  },[joueur?.id]);

  const handleLogin=(j)=>{ setJoueur(j); localStorage.setItem("dp_joueur",JSON.stringify(j)); nav("mon-profil"); };
  const handleProposal=async f=>{ await db.addProposition({...f,slug:slugify(f.nom+"-"+f.ville),statut:"en_attente",date:Date.now()}); };
  const handleProposalAsso=async f=>{ await db.addProposition({...f,slug:slugify(f.nom+"-"+f.ville),statut:"en_attente",date:Date.now(),type_prop:"association"}); };
  const handleProposalTournoi=async f=>{ await db.addProposition({...f,slug:slugify(f.nom+"-"+f.ville),statut:"en_attente",date:Date.now(),type_prop:"tournoi"}); };

  const nav=p=>{ setHistory(h=>[...h,p]); setPage(p); try{window.scrollTo(0,0);}catch{} };
  const goBack=()=>{ if(history.length>1){ const nh=history.slice(0,-1); setHistory(nh); setPage(nh[nh.length-1]); try{window.scrollTo(0,0);}catch{} } };

  const [pendingNav, setPendingNav] = useState(null);
  const isGamePage = (p) => p==="jeux-capital" || p==="scoreur" || p.startsWith("scoreur-duel-") || p.startsWith("scoreur-potes-") || p==="scoreur-doublette" || p==="cricket-config";
  const navSafe = (targetPage) => {
    if (isGamePage(page)) { setPendingNav(targetPage); }
    else { nav(targetPage); }
  };

  // Bouton retour — pages normales
  useEffect(()=>{
    if (isGamePage(page) || page === "jeux") return;
    const handlePop=(e)=>{ e.preventDefault(); goBack(); window.history.pushState(null,"",window.location.href); };
    window.history.pushState(null,"",window.location.href);
    window.addEventListener("popstate",handlePop);
    return ()=>window.removeEventListener("popstate",handlePop);
  },[history, page]);

  // Bouton retour — pages de jeu → modale de confirmation
  useEffect(()=>{
    if (!isGamePage(page)) return;
    const handlePop=(e)=>{
      e.preventDefault();
      const prevPage = history.length > 1 ? history[history.length - 2] : "home";
      setPendingNav(prevPage);
      window.history.pushState(null,"",window.location.href);
    };
    window.history.pushState(null,"",window.location.href);
    window.addEventListener("popstate",handlePop);
    return ()=>window.removeEventListener("popstate",handlePop);
  },[history, page]);

  if(loading) return (
    <div style={{ height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,flexDirection:"column",gap:16 }}>
      <span style={{ fontSize:48 }}>🎯</span>
      <div style={{ width:32,height:32,border:"3px solid #2a2a2a",borderTop:"3px solid #f97316",borderRadius:"50%",animation:"spin 0.8s linear infinite" }}/>
      <p style={{ color:"#94a3b8",fontSize:14 }}>Chargement de DartPoint…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",display:"flex",flexDirection:"column",background:C.bg,color:C.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body, #root { background:#0f0f0f !important; color:#f1f5f9 !important; color-scheme:dark; }
        body { font-family:'Inter',sans-serif; -webkit-text-fill-color:#f1f5f9; }
        input, select, textarea, button { font-family:inherit; -webkit-text-fill-color:inherit; }
        ::placeholder { color:#94a3b8; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-track { background:#111; }
        ::-webkit-scrollbar-thumb { background:#333; border-radius:3px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .leaflet-popup-content-wrapper { background:#fff !important; color:#111 !important; }
.leaflet-popup-content { color:#111 !important; -webkit-text-fill-color:#111 !important; }
.leaflet-popup-tip { background:#fff !important; }
      `}</style>
      {/* Bannière installation PWA */}
      {installPrompt && !isInstalled && (
        <div style={{ position:"fixed",bottom:64,left:"50%",transform:"translateX(-50%)",zIndex:999,width:"calc(100% - 32px)",maxWidth:420 }}>
          <div style={{ background:"linear-gradient(135deg,#1a1a1a,#111)",border:`1px solid ${C.accent}55`,borderRadius:16,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,boxShadow:"0 8px 32px #00000088" }}>
            <span style={{ fontSize:28,flexShrink:0 }}>🎯</span>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,fontSize:14,color:C.text }}>Installer DartPoint</div>
              <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>Accès rapide depuis ton écran d'accueil</div>
            </div>
            <button onClick={handleInstall}
              style={{ background:C.accent,color:"#fff",border:"none",borderRadius:10,padding:"8px 16px",fontWeight:700,fontSize:13,cursor:"pointer",flexShrink:0,touchAction:"manipulation" }}>
              Installer
            </button>
            <button onClick={()=>setInstallPrompt(null)}
              style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:18,padding:4,flexShrink:0,lineHeight:1,touchAction:"manipulation" }}>
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Modale confirmation quitter partie */}
      {pendingNav && (
        <div style={{ position:"fixed",inset:0,background:"#000000cc",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:20,padding:32,maxWidth:320,width:"100%",textAlign:"center",boxShadow:"0 24px 64px #000000aa" }}>
            <div style={{ fontSize:44,marginBottom:12 }}>⚠️</div>
            <h2 style={{ fontWeight:800,fontSize:19,marginBottom:8,color:C.text }}>Quitter la partie ?</h2>
            <p style={{ color:C.muted,fontSize:14,marginBottom:28,lineHeight:1.6 }}>Ta partie en cours sera perdue et les scores ne seront pas sauvegardés.</p>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <button onClick={()=>setPendingNav(null)}
                style={{ background:"#14532d",border:"1px solid #22c55e44",borderRadius:12,color:"#22c55e",fontSize:14,fontWeight:700,padding:"13px",cursor:"pointer",touchAction:"manipulation" }}>
                ▶ Continuer
              </button>
              <button onClick={()=>{ nav(pendingNav); setPendingNav(null); }}
                style={{ background:"#7f1d1d",border:"1px solid #ef444444",borderRadius:12,color:"#ef4444",fontSize:14,fontWeight:700,padding:"13px",cursor:"pointer",touchAction:"manipulation" }}>
                🚪 Quitter
              </button>
            </div>
          </div>
        </div>
      )}
      <Nav page={page} setPage={navSafe} isAdmin={isAdmin} joueur={joueur} setJoueur={setJoueur} defisCount={notifCount} demandesAmisCount={demandesAmisCount} unreadMessages={unreadMessages} onBack={goBack} canGoBack={history.length>1}/>
      <main style={{ flex:1 }}>
        {page==="home"             && <Home joueur={joueur} setJoueur={setJoueur} defisCount={notifCount} demandesAmisCount={demandesAmisCount} bars={bars} associations={associations} tournois={tournois} setPage={nav} setBarSlug={setBarSlug} setAssoSlug={setAssoSlug} setTournoiSlug={setTournoiSlug} setVilleFilter={setVilleFilter} barsActifs={barsActifs}/>}
        {page==="defi"             && joueur && <PageDefi joueur={joueur} setPage={nav}/>}
        {page==="communaute"       && <PageCommunaute joueur={joueur} setPage={nav} bars={bars}/>}
        {page==="bars"             && <Bars bars={bars} setPage={nav} setBarSlug={setBarSlug} villeFilter={villeFilter} setVilleFilter={setVilleFilter} barsActifs={barsActifs}/>}
        {page==="bar"              && <BarDetail slug={barSlug} allBars={bars} associations={associations} setBars={setBars} setPage={nav} setAssoSlug={setAssoSlug} isAdmin={isAdmin} joueur={joueur} setJoueurId={setJoueurId}/>}
        {page==="associations"     && <Associations associations={associations} setPage={nav} setAssoSlug={setAssoSlug}/>}
        {page==="asso"             && <AssoDetail slug={assoSlug} associations={associations} bars={bars} setPage={nav} setBarSlug={setBarSlug} isAdmin={isAdmin}/>}
        {page==="tournois"         && <Tournois tournois={tournois} setPage={nav} setTournoiSlug={setTournoiSlug}/>}
        {page==="tournoi-detail"   && <TournoiDetail slug={tournoiSlug} tournois={tournois} setTournois={setTournois} bars={bars} setPage={nav} setBarSlug={setBarSlug} joueur={joueur}/>}
        {page==="joueurs"          && <PageJoueurs joueur={joueur} setPage={nav} setJoueurId={setJoueurId}/>}
        {page==="drix"             && <PageDrix setPage={nav} setJoueurId={setJoueurId} bars={bars} associations={associations} joueur={joueur}/>}
        {page.startsWith("profil-joueur-") && <FicheJoueur joueurId={page.replace("profil-joueur-","")} joueur={joueur} bars={bars} associations={associations} setPage={nav} setBarSlug={setBarSlug}/>}
        {page==="mon-profil"       && joueur && <MonProfil joueur={joueur} setJoueur={setJoueur} bars={bars} associations={associations} setPage={nav} setBarSlug={setBarSlug} setJoueurId={setJoueurId} demandesAmisCount={demandesAmisCount}/>}
        {page==="profil-stats"     && joueur && <PageProfilStats joueur={joueur} setJoueur={setJoueur} bars={bars} associations={associations} setPage={nav}/>}
        {page==="profil-amis"      && joueur && <PageProfilAmis joueur={joueur} setPage={nav}/>}
        {page==="profil-badges"    && joueur && <PageProfilBadges joueur={joueur} setPage={nav}/>}
        {page==="profil-historique" && joueur && <PageProfilHistorique joueur={joueur} setPage={nav}/>}
        {page==="connexion"        && <Connexion onLogin={handleLogin} setPage={nav}/>}
        {page==="scoreur"          && <Scoreur setPage={nav}/>}
        {page==="jeux"             && <PageModeJeu joueur={joueur} setPage={nav}/>}
        {page==="jeux-flechettes"       && <PageModeJeu joueur={joueur} setPage={nav} initCat="fleche"/>}
        {page==="cricket-config"        && <ConfigCricket joueur={joueur} setPage={nav}/>}
        {page==="jeux-capital"          && <JeuCapital setPage={nav}/>}
        {page==="entrainement-finish"   && <EntrainementFinish setPage={nav} joueur={joueur} setJoueur={setJoueur}/>}
        {page==="rush-mode"             && <RushMode setPage={nav} joueur={joueur} setJoueur={setJoueur}/>}
        {page==="tournois-potes"   && <TournoiPotesPage joueur={joueur} setPage={nav}/>}
        {page.startsWith("tournoi-potes-") && <TournoiPotesDetail tournoiId={page.replace("tournoi-potes-","")} joueurConnecte={joueur} setPage={nav}/>}
        {page.startsWith("scoreur-potes-") && <ScoreurPotesWrapper matchId={page.replace("scoreur-potes-","")} joueurConnecte={joueur} setPage={nav}/>}
        {page==="messagerie"       && <MessagesPage joueur={joueur} setPage={nav}/>}
        {page.startsWith("messages-") && (()=>{ const str=page.replace("messages-",""); const parts=str.split("-"); const tid=parts.slice(0,5).join("-"); const tpseudo=decodeURIComponent(parts.slice(5).join("-")); return <MessagesPage joueur={joueur} setPage={nav} targetId={tid} targetPseudo={tpseudo}/>; })()}
        {page.startsWith("scoreur-duel-") && joueur && <ScoreurDuel duelId={page.replace("scoreur-duel-","")} joueur={joueur} setPage={nav}/>}
        {page==="scoreur-doublette"     && joueur && <ScoreurDoublette joueur={joueur} setPage={nav}/>}
        {page==="apropos"          && <APropos bars={bars} setPage={nav}/>}
        {page==="proposer"         && <Proposer bars={bars} onSubmit={handleProposal}/>}
        {page==="proposer-asso"    && <ProposerAsso onSubmit={handleProposalAsso}/>}
        {page==="proposer-tournoi" && <ProposerTournoi onSubmit={handleProposalTournoi} joueur={joueur} onCreated={t=>{setTournois(ts=>[...ts,t]);nav("tournoi-detail");setTournoiSlug(t.slug);}}/>}
        {page==="contact"          && <Contact/>}
      
        {page==="mentions"         && <MentionsLegales/>}
        {page==="adminlogin"       && <AdminLogin onLogin={()=>{setIsAdmin(true);nav("admin");}}/>}
        {page==="admin"            && (isAdmin?<Admin bars={bars} setBars={setBars} associations={associations} setAssociations={setAssociations} tournois={tournois} setTournois={setTournois} setPage={nav} setBarSlug={setBarSlug} setAssoSlug={setAssoSlug} setTournoiSlug={setTournoiSlug}/>:<AdminLogin onLogin={()=>{setIsAdmin(true);nav("admin");}}/>)}
      </main>
      <Footer setPage={nav}/>
    </div>
  );
}