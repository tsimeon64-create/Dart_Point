import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { C, Z } from "./theme";
import { Menu, X, Settings, User, Mail, LogOut, Search, Trophy, ArrowLeft, Bell, Users, RefreshCw, Swords, TrendingUp, TrendingDown, Medal, Check, AlertCircle, ThumbsUp, MessageCircle, MapPin, Flame, Zap, Target, Clock, ChevronRight, ChevronDown, Map, List, Phone, Share2, Eye, Info, Calendar, Home as HomeIcon, Lock, ExternalLink, Crown, Gem, Pencil, Navigation, Camera, Link2, Building2, Skull, Gamepad2, HelpCircle, Brain, Timer } from "lucide-react";
import {
  Connexion, MonProfil, PageJoueurs, FicheJoueur,
  PageProfilStats, PageProfilAmis, PageProfilBadges, PageProfilHistorique,
  PresenceSection, MembresBarSection,
  PageDrix, DrixBadge, HistoriqueDrix,
  AmiSection,
  appliquerDrixDuel, getDrixTitre, getDrixProgression, calculerDrix,
  dbJoueurs, todayStr, hashPwd,
  ALL_BADGES, computeBadgeValues, getBadgesStored, storeBadgesSet,
} from "./AppJoueurs";
import { Scoreur } from "./AppJeux";
import { ConfigCricket } from "./AppCricket";
import { JeuCapital } from "./AppJeuDecalePoint";
import { TournoiPotesPage, TournoiPotesDetail, ScoreurPotesWrapper } from "./AppTournoiPotes";
import { EntrainementFinish } from "./AppEntrainementFinish";
import { ChronoFinish, checkYesterdayReward } from "./AppChronoFinish";
import { RushMode } from "./AppRushMode";
import { HorlogeDouble } from "./AppHorlogeDouble";
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
  getCibleReports: (slug) => sb(`bar_cible_reports?bar_slug=eq.${encodeURIComponent(slug)}&select=joueur_id`),
  addCibleReport: (d) => sb("bar_cible_reports", { method:"POST", body:JSON.stringify(d), prefer:"return=minimal" }),
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
// Vérification admin via RPC Supabase — le mot de passe n'est plus en clair
// dans le code. Le hash bcrypt est stocké côté serveur dans admin_credentials
// (RLS verrouillée, accessible uniquement via la fonction verify_admin_password)
const verifyAdminPassword = async (pw) => {
  try {
    const r = await sb("rpc/verify_admin_password", { method:"POST", body:JSON.stringify({ pw }) });
    return r === true;
  } catch { return false; }
};
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

// C importé depuis src/theme.js

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
    // Nettoie une ancienne instance Leaflet sur le même div (évite les marqueurs fantômes)
    if (divRef.current._leaflet_id) {
      try { window.L.map(divRef.current).remove(); } catch(e) {}
      divRef.current._leaflet_id = undefined;
    }
    const map = window.L.map(divRef.current, { scrollWheelZoom:false }).setView([43.47,-1.52], 9);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution:"© OpenStreetMap", maxZoom:19 }).addTo(map);
    mapRef.current = map;
    return () => { try { map.remove(); } catch(e) {} mapRef.current = null; };
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

  useEffect(() => { if (mapRef.current) setTimeout(()=>mapRef.current.invalidateSize(),100); }, [ready]);

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
const Nav = ({ page, setPage, isAdmin, joueur, setJoueur, defisCount, demandesAmisCount=0, unreadMessages=0, newBadgesCount=0, onBadgesSeen, onBack, canGoBack, bars=[], barsActifs=[], associations=[], tournois=[], setBarSlug, setAssoSlug }) => {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [liveStats, setLiveStats] = useState({ joueursConnectes:0, matchsLive:0 });
  const [joueurStats, setJoueurStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [chronoRecord, setChronoRecord] = useState(null);

  // Fetch live on mount (for ticker)
  useEffect(() => {
    const today = new Date().toISOString().slice(0,10);
    const fetchLive = () => Promise.all([
      sb(`presences?date_jour=eq.${today}&select=joueur_id`).catch(()=>[]),
      sb(`duels?statut=eq.accepte&select=id&limit=50`).catch(()=>[]),
      sb(`chrono_finish_scores?date_jour=eq.${today}&order=temps_ms.asc&limit=1&select=joueur_pseudo,temps_ms`).catch(()=>[]),
    ]).then(([pres, duels, chrono]) => {
      setLiveStats({ joueursConnectes: new Set((pres||[]).map(p=>p.joueur_id)).size, matchsLive: duels?.length||0 });
      setChronoRecord(chrono?.[0] || null);
    }).catch(()=>{});
    fetchLive();
    const iv = setInterval(fetchLive, 60000);
    return () => clearInterval(iv);
  }, []);

  // Fetch recent activity when menu opens
  useEffect(() => {
    if (!open) return;
    sb(`duels?statut=eq.termine&order=date.desc&limit=8&select=gagnant_pseudo,challenger_pseudo,score_challenger,score_defie,date`).then(r => setRecentActivity(r||[])).catch(()=>{});
  }, [open]);

  useEffect(() => {
    if (!open || !joueur) return;
    sb(`stats?joueur_id=eq.${joueur.id}&select=victoires,defaites,parties`).then(r => setJoueurStats(r?.[0]||null)).catch(()=>{});
  }, [open, joueur?.id]);

  // Close profile dropdown on outside click
  useEffect(() => {
    if (!profileOpen) return;
    const h = (e) => { if (!e.target.closest("[data-pdrop]")) setProfileOpen(false); };
    document.addEventListener("mousedown", h); document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [profileOpen]);

  const go = (p) => { setPage(p); setOpen(false); setProfileOpen(false); };

  const drix = joueur?.drix || 1000;
  const { titre: drixTitre, emoji: drixEmoji, color: drixColor } = getDrixTitre(drix);
  const { pct: drixPct, prochain: drixProchain } = getDrixProgression(drix);
  const wr = joueurStats && joueurStats.parties > 0 ? Math.round((joueurStats.victoires / joueurStats.parties) * 100) : null;
  const tournoisDuJour = useMemo(() => {
    const today = new Date().toISOString().slice(0,10);
    return tournois.filter(t => t.date && String(t.date).startsWith(today)).length;
  }, [tournois]);

  // Status dynamique
  const gamePagesNav = ["jeux-capital","scoreur","scoreur-doublette","cricket-config","rush-mode"];
  const isInGame = gamePagesNav.includes(page) || page.startsWith("scoreur-duel-") || page.startsWith("scoreur-potes-");
  const playerStatus = isInGame
    ? { dot:"🎯", label:"En partie", color:"#f97316" }
    : { dot:"●", label:"En ligne", color:"#4ade80" };

  // Ticker items
  const fmtTickerMs = (ms) => {
    const t=Math.floor(ms/100); const d=t%10; const s=Math.floor(t/10)%60; const m=Math.floor(t/600);
    return m>0?`${m}:${String(s).padStart(2,"0")}.${d}s`:`${s}.${d}s`;
  };
  const tickerItems = [
    liveStats.matchsLive > 0 ? `🔥 ${liveStats.matchsLive} matchs live` : null,
    liveStats.joueursConnectes > 0 ? `👥 ${liveStats.joueursConnectes} joueurs aujourd'hui` : null,
    barsActifs.length > 0 ? `🍺 ${barsActifs.length} bars actifs ce soir` : null,
    tournoisDuJour > 0 ? `🏆 ${tournoisDuJour} tournoi${tournoisDuJour>1?"s":""} aujourd'hui` : null,
    chronoRecord ? `⏱ Chrono Finish — 🥇 ${chronoRecord.joueur_pseudo}  ${fmtTickerMs(chronoRecord.temps_ms)}` : null,
    `🎯 ${bars.length} bars répertoriés`,
    `🫂 ${associations.length} associations`,
  ].filter(Boolean).join("   ·   ");

  // Sub-components
  const SecTitle = ({ children }) => (
    <div style={{ fontSize:10, fontWeight:700, color:"#3d4758", textTransform:"uppercase", letterSpacing:1.8, marginBottom:6, paddingLeft:4, paddingTop:4, display:"flex", alignItems:"center", gap:6 }}>
      {children}
    </div>
  );
  const MenuItem = ({ icon, label, target, badge, badgeColor="#ef4444", liveLabel, liveColor="#4ade80", glow=false, accent=false, danger=false }) => {
    const isAct = page === target;
    const baseStyle = {
      display:"flex", alignItems:"center", gap:10,
      width:"100%", padding:"10px 12px",
      background: accent ? "linear-gradient(135deg,#f9731614,#1a0a0022)" : isAct ? "#f9731618" : "transparent",
      border: `1px solid ${accent ? "#f9731630" : isAct ? "#f9731640" : "transparent"}`,
      borderRadius:11, cursor:"pointer",
      color: danger ? "#f87171" : isAct || accent ? "#f97316" : "#c8ccd4",
      fontSize:14, fontWeight: isAct || accent ? 700 : 500,
      transition:"all .18s", textAlign:"left", touchAction:"manipulation",
      boxShadow: (glow && (isAct || accent)) ? "0 0 18px #f9731625" : "none",
    };
    return (
      <button style={baseStyle} onClick={() => go(target)}
        onMouseEnter={e=>{e.currentTarget.style.background=accent?"linear-gradient(135deg,#f9731624,#1a0a0044)":"#ffffff0a";e.currentTarget.style.borderColor=accent?"#f9731650":"#ffffff14";}}
        onMouseLeave={e=>{e.currentTarget.style.background=baseStyle.background;e.currentTarget.style.borderColor=baseStyle.border.replace("1px solid ","");}}>
        <span style={{ fontSize:18, width:26, textAlign:"center", flexShrink:0 }}>{icon}</span>
        <span style={{ flex:1 }}>{label}</span>
        {liveLabel && (
          <span style={{ fontSize:10, fontWeight:700, color:liveColor, background:liveColor+"15", border:`1px solid ${liveColor}30`, borderRadius:20, padding:"1px 8px", flexShrink:0 }}>{liveLabel}</span>
        )}
        {badge != null && badge > 0 && (
          <span style={{ background:badgeColor, color:"#fff", borderRadius:99, minWidth:18, height:18, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, padding:"0 3px", flexShrink:0 }}>{badge > 9 ? "9+" : badge}</span>
        )}
      </button>
    );
  };

  return (
    <>
      <style>{`
        @keyframes nav-pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.35)} }
        @keyframes nav-fade    { from{opacity:0} to{opacity:1} }
        @keyframes dp-glow     { 0%,100%{box-shadow:0 0 12px #f9731625,0 2px 20px #f9731615} 50%{box-shadow:0 0 28px #f9731650,0 0 56px #f9731622} }
        @keyframes dp-breathe  { 0%,100%{filter:drop-shadow(0 0 6px rgba(249,115,22,.3))} 50%{filter:drop-shadow(0 0 18px rgba(249,115,22,.65))} }
        @keyframes dp-ticker   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes dp-msg-glow { 0%,100%{box-shadow:0 0 0 #7c3aed00} 50%{box-shadow:0 0 14px #7c3aed88,0 0 28px #f9731633} }
        @keyframes dp-pdrop-in { from{opacity:0;transform:translateY(-8px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .dp-menu-scroll::-webkit-scrollbar{width:3px}
        .dp-menu-scroll::-webkit-scrollbar-thumb{background:#2a2a35;border-radius:3px}
        .dp-topbtn:active{transform:scale(.94)}
      `}</style>

      {/* ═══ TOP BAR ══════════════════════════════════════════════════ */}
      <nav style={{ background:"rgba(8,8,13,0.97)", borderBottom:"1px solid #1a1a26", position:"sticky", top:0, zIndex:200, backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)" }}>

        {/* ── Barre principale ─────────────────────────────────────── */}
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"0 10px", position:"relative", display:"flex", alignItems:"center", height:56, gap:4 }}>

          {/* GAUCHE — Hamburger */}
          <div style={{ flex:1, display:"flex", alignItems:"center", gap:5 }}>
            {/* Hamburger */}
            <button className="dp-topbtn" onClick={()=>setOpen(o=>!o)}
              style={{ background: open ? "#f9731620" : "#0f0f18", border:`1px solid ${open?"#f9731660":"#1e1e2e"}`, color: open ? "#f97316" : "#94a3b8", cursor:"pointer", padding:"7px 11px", borderRadius:10, transition:"all .22s", touchAction:"manipulation", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
                boxShadow: open ? "0 0 18px #f9731430" : "none" }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#f9731660";e.currentTarget.style.color="#f97316";e.currentTarget.style.boxShadow="0 0 14px #f9731428";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=open?"#f9731660":"#1e1e2e";e.currentTarget.style.color=open?"#f97316":"#94a3b8";e.currentTarget.style.boxShadow=open?"0 0 18px #f9731430":"none";}}>
              <span style={{ display:"inline-block", transition:"transform .3s cubic-bezier(.4,0,.2,1)", transform:open?"rotate(90deg)":"none", lineHeight:1, display:"flex" }}>
                {open ? <X size={18}/> : <Menu size={18}/>}
              </span>
            </button>
            {/* Admin */}
            {isAdmin && (
              <button className="dp-topbtn" onClick={()=>go("admin")}
                style={{ background:"#120d00", color:C.yellow, border:"1px solid #78350f55", cursor:"pointer", padding:"6px 8px", borderRadius:9, fontWeight:700, touchAction:"manipulation", transition:"all .2s", display:"flex", alignItems:"center", justifyContent:"center" }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#f59e0b88";e.currentTarget.style.boxShadow="0 0 12px #f59e0b33";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#78350f55";e.currentTarget.style.boxShadow="none";}}>
                <Settings size={16}/>
              </button>
            )}
          </div>

          {/* CENTRE — Logo (centré absolument) */}
          <div onClick={()=>go("home")} style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", cursor:"pointer", flexShrink:0, zIndex:1 }}>
            <img src="/logo dart point/logo bandeau.png" alt="DartPoint"
              style={{ height: 40, objectFit:"contain", display:"block",
                animation:"dp-breathe 4s ease-in-out infinite",
                transition:"height .25s" }}/>
          </div>

          {/* DROITE — Profil */}
          <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"flex-end", gap:5 }}>


            {/* Profil joueur */}
            {joueur ? (
              <div style={{ position:"relative" }} data-pdrop>
                <button className="dp-topbtn" data-pdrop onClick={()=>setProfileOpen(o=>!o)}
                  style={{ background: profileOpen ? "#f9731614" : "#0f0f18", border:`1px solid ${profileOpen?"#f9731655":"#1e1e2e"}`, cursor:"pointer", padding:"6px 8px", borderRadius:11, display:"flex", alignItems:"center", gap:6, transition:"all .2s", touchAction:"manipulation",
                    boxShadow: profileOpen ? "0 0 16px #f9731628" : "none", position:"relative" }}>
                  {/* Avatar initiale + dot statut */}
                  <div style={{ position:"relative", flexShrink:0 }}>
                    <div style={{ width:28, height:28, borderRadius:"50%", background:`linear-gradient(135deg,${drixColor}99,${drixColor}44)`, border:`1px solid ${drixColor}66`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, color:"#fff" }}>
                      {joueur.photo
                        ? <img src={joueur.photo} style={{ width:"100%",height:"100%",objectFit:"cover",borderRadius:"50%" }} alt=""/>
                        : (joueur.pseudo||"?")[0].toUpperCase()}
                    </div>
                    <div style={{ position:"absolute", bottom:-1, right:-1, width:8, height:8, borderRadius:"50%", background:playerStatus.color, boxShadow:`0 0 5px ${playerStatus.color}`, border:"1.5px solid #0f0f18" }}/>
                  </div>
                  {/* Badge notif */}
                  {((defisCount||0)+(demandesAmisCount||0)+(unreadMessages||0)+(newBadgesCount||0))>0 && (() => {
                    const total = (defisCount||0)+(demandesAmisCount||0)+(unreadMessages||0)+(newBadgesCount||0);
                    const color = newBadgesCount>0 && defisCount===0 && demandesAmisCount===0 && unreadMessages===0 ? "#f59e0b" : C.red;
                    return (
                      <span style={{ position:"absolute", top:-5, right:-5, background:color, color:"#fff", borderRadius:"50%", minWidth:16, height:16, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, boxShadow:`0 0 8px ${color}88`, animation:"dp-notif-pulse 2s infinite", border:"1.5px solid #0f0f18" }}>
                        {total>9?"9+":total}
                      </span>
                    );
                  })()}
                </button>

                {/* Dropdown profil */}
                {profileOpen && (
                  <div data-pdrop style={{ position:"absolute", top:"calc(100% + 8px)", right:0, width:200, background:"rgba(10,10,16,0.98)", border:"1px solid #f9731630", borderRadius:14, overflow:"hidden", zIndex:500, backdropFilter:"blur(20px)", boxShadow:"0 20px 60px rgba(0,0,0,.9),0 0 30px #f9731618", animation:"dp-pdrop-in .18s ease" }}>
                    {/* Mini profil top */}
                    <div style={{ padding:"12px 14px 10px", borderBottom:"1px solid #1a1a28", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:"50%", border:`2px solid ${drixColor}66`, overflow:"hidden", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                        {joueur.photo ? <img src={joueur.photo} style={{ width:"100%",height:"100%",objectFit:"cover" }} alt=""/> : <span style={{ fontSize:18 }}>👤</span>}
                      </div>
                      <div style={{ minWidth:0 }}>
                        <div style={{ fontWeight:800, fontSize:13, color:"#f1f5f9", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{joueur.pseudo}</div>
                        <div style={{ fontSize:11, color:playerStatus.color, fontWeight:600 }}>{playerStatus.dot==="●"?"● ":""}{playerStatus.label}</div>
                      </div>
                    </div>
                    {/* Menu items */}
                    {[
                      { icon:<User size={15}/>,   label:"Mon profil",    target:"mon-profil", badge: newBadgesCount, badgeColor:"#f59e0b", badgeTitle: newBadgesCount>0 ? "🏅 Nouveaux badges" : null },
                      { icon:<Trophy size={15}/>, label:"Mes stats",     target:"profil-stats" },
                      { icon:<Bell size={15}/>,   label:"Mes amis",      target:"profil-amis",  badge: demandesAmisCount, badgeColor:C.red },
                      { icon:<Search size={15}/>, label:"Mes défis",     target:"defi",         badge: defisCount, badgeColor:C.red },
                      { icon:<Mail size={15}/>,   label:"Messages",      target:"messagerie",   badge: unreadMessages, badgeColor:"#7c3aed" },
                      // Mon bar — visible si le joueur est affilié à un bar
                      joueur?.bar_slug && setBarSlug ? { icon:<Building2 size={15}/>, label:"Mon bar", target:"__bar__", barSlug: joueur.bar_slug } : null,
                      // Mon asso — visible si le joueur est affilié à une asso
                      joueur?.asso_slug && setAssoSlug ? { icon:<Users size={15}/>, label:"Mon asso", target:"__asso__", assoSlug: joueur.asso_slug } : null,
                    ].filter(Boolean).map(({ icon, label, target, badge, badgeColor=C.red, badgeTitle, barSlug, assoSlug }) => (
                      <button key={label} onClick={()=>{
                        if(target==="mon-profil"&&newBadgesCount>0&&onBadgesSeen) onBadgesSeen();
                        if (target === "__bar__" && barSlug) { setBarSlug(barSlug); go("bar"); return; }
                        if (target === "__asso__" && assoSlug) { setAssoSlug(assoSlug); go("asso"); return; }
                        go(target);
                      }}
                        style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 14px", background:"transparent", border:"none", cursor:"pointer", color:"#c8ccd4", fontSize:13, fontWeight:500, textAlign:"left", transition:"background .15s", touchAction:"manipulation" }}
                        onMouseEnter={e=>{e.currentTarget.style.background="#f9731610";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                        <span style={{ width:20, display:"flex", alignItems:"center", justifyContent:"center", color:"#94a3b8" }}>{icon}</span>
                        <span style={{ flex:1 }}>{label}</span>
                        {badge>0 && (
                          <span style={{ background:badgeColor, color:"#fff", borderRadius:99, minWidth:16, height:16, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, padding:"0 3px", boxShadow:`0 0 6px ${badgeColor}88` }} title={badgeTitle||""}>
                            {badge>9?"9+":badge}
                          </span>
                        )}
                      </button>
                    ))}
                    <div style={{ borderTop:"1px solid #1a1a28" }}>
                      <button onClick={()=>{ setJoueur(null); localStorage.removeItem("dp_joueur"); go("home"); }}
                        style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"10px 14px", background:"transparent", border:"none", cursor:"pointer", color:"#f87171", fontSize:13, fontWeight:500, textAlign:"left", touchAction:"manipulation", transition:"background .15s" }}
                        onMouseEnter={e=>{e.currentTarget.style.background="#ef444410";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
                        <span style={{ width:20, display:"flex", alignItems:"center", justifyContent:"center" }}><LogOut size={15}/></span>
                        <span>Déconnexion</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button className="dp-topbtn" onClick={()=>go("connexion")}
                style={{ background:"linear-gradient(135deg,#f97316,#ea580c)", color:"#fff", border:"none", cursor:"pointer", padding:"7px 13px", borderRadius:9, fontSize:12, fontWeight:700, boxShadow:"0 4px 14px #f9731440", touchAction:"manipulation", transition:"all .2s" }}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 22px #f9731466";}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 4px 14px #f9731440";}}>
                Connexion
              </button>
            )}

          </div>
        </div>

        {/* ── Live ticker (tableau de bord uniquement) ─────────────── */}
        {page === "home" && <div style={{ borderTop:"1px solid #f9731612", height:22, overflow:"hidden", background:"rgba(249,115,22,0.03)", position:"relative" }}>
          <div style={{ display:"flex", alignItems:"center", height:"100%", whiteSpace:"nowrap", animation:"dp-ticker 28s linear infinite" }}>
            {[tickerItems, tickerItems].map((t,i) => (
              <span key={i} style={{ fontSize:10, color:"#4a5568", fontWeight:600, letterSpacing:.3, padding:"0 40px" }}>
                {t.split("   ·   ").map((item,j) => (
                  <span key={j}>
                    <span style={{ color:"#64748b" }}>{item}</span>
                    {j < t.split("   ·   ").length-1 && <span style={{ color:"#1e2030", margin:"0 12px" }}>·</span>}
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>}

      </nav>

      {/* ═══ BACKDROP ═════════════════════════════════════════════════ */}
      {open && (
        <div onClick={()=>setOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:399, backdropFilter:"blur(5px)", animation:"nav-fade .22s ease" }}/>
      )}

      {/* ═══ SIDE PANEL ═══════════════════════════════════════════════ */}
      <div className="dp-menu-scroll" style={{
        position:"fixed", top:0, right:0, bottom:0, width:"min(400px,100vw)",
        background:"linear-gradient(180deg,#08080d 0%,#0b0b12 50%,#08080d 100%)",
        borderLeft:"1px solid #f9731618",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition:"transform 0.32s cubic-bezier(0.4,0,0.2,1)",
        zIndex:400, overflowY:"auto", display:"flex", flexDirection:"column",
        boxShadow: open ? "-30px 0 100px rgba(0,0,0,0.95)" : "none",
      }}>
        {/* ── Panel header ──────────────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 16px 12px", borderBottom:"1px solid #1a1a22", flexShrink:0 }}>
          <img src="/logo dart point/logo bandeau.png" alt="" style={{ height:30, objectFit:"contain", filter:"drop-shadow(0 0 12px rgba(249,115,22,0.4))" }}/>
          <button onClick={()=>setOpen(false)} style={{ background:"#12121a", border:"1px solid #252530", color:"#64748b", cursor:"pointer", borderRadius:8, padding:"5px 10px", fontSize:15, fontWeight:700, transition:"all .15s", touchAction:"manipulation" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#f9731644";e.currentTarget.style.color="#f97316";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#252530";e.currentTarget.style.color="#64748b";}}>✕</button>
        </div>

        <div style={{ padding:"14px 14px 24px", flex:1 }}>

          {/* ── 1. HEADER PROFIL ──────────────────────────────────────── */}
          {joueur ? (
            <div style={{ background:`linear-gradient(135deg,#0e0900,#10091a)`, border:`1px solid ${drixColor}28`, borderRadius:18, padding:"16px", marginBottom:14, position:"relative", overflow:"hidden", animation:"dp-glow 4s infinite" }}>
              <div style={{ position:"absolute",top:-50,right:-50,width:160,height:160,borderRadius:"50%",background:`radial-gradient(circle,${drixColor}14,transparent)`,pointerEvents:"none"}}/>
              {/* Avatar + pseudo + DRIX */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:11 }}>
                <div style={{ width:54,height:54,borderRadius:"50%",background:`linear-gradient(135deg,${drixColor}33,#141428)`,border:`2.5px solid ${drixColor}55`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,overflow:"hidden" }}>
                  {joueur.photo ? <img src={joueur.photo} style={{ width:"100%",height:"100%",objectFit:"cover" }} alt=""/> : "👤"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:800, fontSize:17, color:"#f1f5f9", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{joueur.pseudo}</div>
                  <div style={{ display:"flex",alignItems:"center",gap:5 }}>
                    <span style={{ fontSize:15 }}>{drixEmoji}</span>
                    <span style={{ fontWeight:700,fontSize:13,color:drixColor }}>{drixTitre}</span>
                  </div>
                </div>
                <div style={{ textAlign:"center",flexShrink:0,background:`${drixColor}14`,border:`1px solid ${drixColor}30`,borderRadius:12,padding:"6px 10px" }}>
                  <div style={{ fontWeight:900,fontSize:20,color:drixColor,lineHeight:1 }}>{drix}</div>
                  <div style={{ fontSize:9,color:"#475569",fontWeight:700,letterSpacing:1,marginTop:2 }}>DRIX</div>
                </div>
              </div>
              {/* Stats winrate */}
              {joueurStats && (
                <div style={{ display:"flex",gap:12,marginBottom:11,paddingBottom:11,borderBottom:`1px solid #1e1e28` }}>
                  <span style={{ fontSize:12,color:"#4ade80",fontWeight:700 }}>🏆 {joueurStats.victoires}V</span>
                  <span style={{ fontSize:12,color:"#f87171",fontWeight:700 }}>💀 {joueurStats.defaites}D</span>
                  {wr !== null && <span style={{ fontSize:12,color:"#facc15",fontWeight:700 }}>⚡ {wr}% WR</span>}
                  <span style={{ fontSize:12,color:"#475569" }}>· {joueurStats.parties} matchs</span>
                </div>
              )}
              {/* Barre progression */}
              {drixProchain && (
                <div style={{ marginBottom:12 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                    <span style={{ fontSize:11,color:"#475569" }}>Vers <span style={{ color:drixColor,fontWeight:600 }}>{drixProchain.titre}</span></span>
                    <span style={{ fontSize:11,fontWeight:700,color:drixColor }}>{drixPct}%</span>
                  </div>
                  <div style={{ height:5,background:"#1a1a24",borderRadius:99 }}>
                    <div style={{ height:"100%",width:`${drixPct}%`,background:`linear-gradient(90deg,${drixColor},${drixColor}bb)`,borderRadius:99,boxShadow:`0 0 8px ${drixColor}55`,transition:"width .5s" }}/>
                  </div>
                </div>
              )}
              <button onClick={()=>go("mon-profil")} style={{ width:"100%",background:`${drixColor}14`,border:`1px solid ${drixColor}35`,color:drixColor,borderRadius:10,padding:"8px",fontSize:13,fontWeight:700,cursor:"pointer",transition:"all .15s",touchAction:"manipulation" }}
                onMouseEnter={e=>{e.currentTarget.style.background=`${drixColor}28`;}}
                onMouseLeave={e=>{e.currentTarget.style.background=`${drixColor}14`;}}>
                👤 Voir mon profil
              </button>
            </div>
          ) : (
            <div style={{ background:"linear-gradient(135deg,#0e0900,#10091a)",border:"1px solid #f9731625",borderRadius:18,padding:"18px 16px",marginBottom:14,textAlign:"center" }}>
              <div style={{ fontSize:40,marginBottom:8 }}>🎯</div>
              <div style={{ fontWeight:700,fontSize:16,color:C.text,marginBottom:5 }}>Rejoins DartPoint</div>
              <div style={{ fontSize:13,color:"#4a5568",marginBottom:14 }}>Défis · DRIX · Tournois · Communauté</div>
              <button onClick={()=>go("connexion")} style={{ background:"linear-gradient(135deg,#f97316,#ea580c)",color:"#fff",border:"none",borderRadius:12,padding:"11px 24px",fontSize:14,fontWeight:700,cursor:"pointer",width:"100%",boxShadow:"0 4px 18px #f9731440",touchAction:"manipulation" }}>
                🚀 Connexion / Inscription
              </button>
            </div>
          )}

          {/* ── 2. ACTIVITÉ LIVE ──────────────────────────────────────── */}
          <div style={{ background:"#0b0b10",border:"1px solid #1a1a24",borderRadius:14,padding:"11px 14px",marginBottom:14 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
              <div style={{ width:6,height:6,borderRadius:"50%",background:"#4ade80",animation:"nav-pulse 2s infinite",flexShrink:0 }}/>
              <span style={{ fontSize:10,fontWeight:700,color:"#4ade80",textTransform:"uppercase",letterSpacing:1.5 }}>Activité Live</span>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              {[
                { e:"🍺", v:barsActifs.length, l:"bars actifs", c:"#f97316" },
                { e:"👥", v:liveStats.joueursConnectes, l:"joueurs aujourd'hui", c:"#60a5fa" },
                { e:"🔥", v:liveStats.matchsLive, l:"matchs live", c:"#f87171" },
                { e:"🏆", v:tournoisDuJour, l:"tournois", c:"#facc15" },
              ].map(({ e, v, l, c }) => (
                <div key={l} style={{ display:"flex",alignItems:"center",gap:8 }}>
                  <span style={{ fontSize:18 }}>{e}</span>
                  <div>
                    <div style={{ fontWeight:800,fontSize:16,color:c,lineHeight:1 }}>{v}</div>
                    <div style={{ fontSize:10,color:"#374151",marginTop:1 }}>{l}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 3. NAVIGATION ─────────────────────────────────────────── */}

          {/* DÉCOUVRIR */}
          <SecTitle>🗺️ Découvrir</SecTitle>
          <div style={{ display:"flex",flexDirection:"column",gap:2,marginBottom:12 }}>
            <MenuItem icon="🍺" label="Bars" target="bars"
              liveLabel={barsActifs.length>0?`${barsActifs.length} actifs`:null} liveColor="#4ade80" />
            <MenuItem icon="👥" label="Associations" target="associations"
              liveLabel={associations.length>0?`${associations.length}`:null} liveColor="#a78bfa" />
            <MenuItem icon="🏆" label="Tournois" target="tournois"
              liveLabel={tournoisDuJour>0?`${tournoisDuJour} aujourd'hui`:null} liveColor="#facc15" />
          </div>

          {/* COMMUNAUTÉ */}
          <SecTitle>👥 Communauté</SecTitle>
          <div style={{ display:"flex",flexDirection:"column",gap:2,marginBottom:12 }}>
            <MenuItem icon="💬" label="Comptoir" target="communaute" />
            <MenuItem icon="🧑‍🤝‍🧑" label="Joueurs" target="joueurs" />
            <MenuItem icon="💎" label="Classement DRIX" target="drix" />
            <MenuItem icon="✉️" label="Messages" target="messagerie" badge={unreadMessages} badgeColor="#3b82f6" />
          </div>

          {/* JOUER */}
          <SecTitle>🎯 Jouer</SecTitle>
          <div style={{ display:"flex",flexDirection:"column",gap:2,marginBottom:12 }}>
            <MenuItem icon="⚔️" label="Défis" target="defi" badge={defisCount} />
            <MenuItem icon="🎯" label="Scoreur" target="scoreur" accent={true} glow={true} />
            <MenuItem icon="🎮" label="Jeux" target="jeux" />
            <MenuItem icon="🍻" label="Tournoi entre potes" target="tournois-potes" />
          </div>

          {/* CONTRIBUER */}
          <SecTitle>➕ Contribuer</SecTitle>
          <div style={{ display:"flex",flexDirection:"column",gap:2,marginBottom:12 }}>
            <MenuItem icon="🏠" label="Proposer un bar" target="proposer" />
            <MenuItem icon="🫂" label="Proposer une association" target="proposer-asso" />
            <MenuItem icon="🏅" label="Proposer un tournoi" target="proposer-tournoi" />
          </div>

          {/* COMPTE */}
          <SecTitle>🔒 Compte</SecTitle>
          <div style={{ display:"flex",flexDirection:"column",gap:2,marginBottom:12 }}>
            {joueur ? (
              <>
                <MenuItem icon="👤" label="Mon profil" target="mon-profil" />
                <button onClick={()=>{ setJoueur(null); localStorage.removeItem("dp_joueur"); setOpen(false); setPage("home"); }}
                  style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",background:"transparent",border:"1px solid transparent",borderRadius:11,cursor:"pointer",color:"#f87171",fontSize:14,fontWeight:500,transition:"all .18s",textAlign:"left",touchAction:"manipulation" }}
                  onMouseEnter={e=>{e.currentTarget.style.background="#ef444410";e.currentTarget.style.borderColor="#ef444430";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent";}}>
                  <span style={{ fontSize:18,width:26,textAlign:"center",flexShrink:0 }}>🚪</span>
                  <span>Déconnexion</span>
                </button>
              </>
            ) : (
              <>
                <MenuItem icon="🔑" label="Connexion / Inscription" target="connexion" />
                <MenuItem icon="🔐" label="Accès Admin" target="adminlogin" />
              </>
            )}
          </div>

          {/* ADMIN */}
          {isAdmin && (
            <div style={{ marginBottom:14 }}>
              <SecTitle>⚙️ Administration</SecTitle>
              <button onClick={()=>go("admin")} style={{
                display:"flex",alignItems:"center",gap:12,width:"100%",padding:"13px 16px",
                background:"linear-gradient(135deg,#120c00,#16100a)",
                border:"1px solid #f59e0b55",borderRadius:14,cursor:"pointer",
                color:C.yellow,fontSize:14,fontWeight:700,
                transition:"all .2s",textAlign:"left",touchAction:"manipulation",
                boxShadow:"0 0 24px #f59e0b1a",
              }}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 0 36px #f59e0b35";e.currentTarget.style.borderColor="#f59e0b88";}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 0 24px #f59e0b1a";e.currentTarget.style.borderColor="#f59e0b55";}}>
                <span style={{ fontSize:22,width:26,textAlign:"center",flexShrink:0 }}>⚙️</span>
                <div style={{ flex:1 }}>
                  <div>Administration</div>
                  <div style={{ fontSize:11,color:"#92400e",fontWeight:400,marginTop:2 }}>Panneau de contrôle</div>
                </div>
                <span style={{ fontSize:14,color:"#92400e" }}>→</span>
              </button>
            </div>
          )}

          {/* ── 4. ACTIVITÉ RÉCENTE ───────────────────────────────────── */}
          {recentActivity.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <SecTitle>🔥 Activité récente</SecTitle>
              <div style={{ display:"flex",flexDirection:"column",gap:3 }}>
                {recentActivity.slice(0,6).map((d,i) => {
                  const winner = d.gagnant_pseudo || d.challenger_pseudo || "?";
                  const score = (d.score_challenger != null && d.score_defie != null) ? `${d.score_challenger}-${d.score_defie}` : null;
                  return (
                    <div key={i} style={{ display:"flex",alignItems:"center",gap:9,padding:"7px 10px",background:"#0b0b10",borderRadius:10,border:"1px solid #1a1a24" }}>
                      <span style={{ fontSize:13,flexShrink:0 }}>🏆</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <span style={{ fontSize:12,color:"#d1d5db",fontWeight:600 }}>{winner}</span>
                        <span style={{ fontSize:11,color:"#374151" }}> a gagné</span>
                      </div>
                      {score && <span style={{ fontSize:11,color:"#f97316",fontWeight:700,flexShrink:0 }}>{score}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ textAlign:"center",paddingTop:4 }}>
            <div style={{ fontSize:10,color:"#1e1e28",fontWeight:600,letterSpacing:1 }}>🎯 DARTPOINT</div>
          </div>
        </div>
      </div>
    </>
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
          {bar.cibles != null && <span style={{ background:"#a78bfa18",color:"#a78bfa",border:"1px solid #a78bfa33",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600 }}>🎯 {bar.cibles} cible{bar.cibles>1?"s":""}</span>}
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
  const url=`${window.location.origin}/bars/${bar.slug}`;
  return (
    <div style={{ display:"flex",gap:8,flexWrap:"wrap",marginBottom:20 }}>
      <a href={`https://wa.me/?text=${encodeURIComponent("🎯 "+bar.nom+" — "+bar.ville+" sur DartPoint "+url)}`} target="_blank" rel="noreferrer"><Btn variant="dark" style={{ fontSize:12,padding:"7px 14px" }}>📱 WhatsApp</Btn></a>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noreferrer"><Btn variant="dark" style={{ fontSize:12,padding:"7px 14px" }}>📘 Facebook</Btn></a>
      <Btn onClick={()=>{try{navigator.clipboard.writeText(url);}catch{}setCopied(true);setTimeout(()=>setCopied(false),2000);}} variant="dark" style={{ fontSize:12,padding:"7px 14px" }}>{copied?"✅ Copié !":"🔗 Lien"}</Btn>
    </div>
  );
};

// ── MODALS ÉDITION ────────────────────────────────────────────────────────────
const EditBarModal = ({ bar, onSave, onClose, joueur=null }) => {
  const [f,setF]=useState({ nom:bar.nom||"",ville:bar.ville||"",cp:bar.cp||"",adresse:bar.adresse||"",tel:bar.tel||"",type:bar.type||"electronique",cibles:String(bar.cibles||1),horaires:bar.horaires||"",description:bar.description||"",tournois:bar.tournois?"oui":"non",lat:String(bar.lat||""),lng:String(bar.lng||"") });
  const [saving,setSaving]=useState(false);
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  const save=async()=>{
    setSaving(true);
    await db.updateBar(bar.slug,{nom:f.nom,ville:f.ville,cp:f.cp,adresse:f.adresse,tel:f.tel,type:f.type,cibles:parseInt(f.cibles)||1,horaires:f.horaires,description:f.description,tournois:f.tournois==="oui",lat:parseFloat(f.lat)||null,lng:parseFloat(f.lng)||null});
    // Log de modification
    const champs = Object.entries(f).filter(([k,v])=>String(bar[k]||"")!==v).map(([k])=>k).join(", ");
    db.addProposition({ nom:bar.nom, ville:bar.ville, slug:bar.slug, statut:"info", date:Date.now(), type_prop:"modif_bar", commentaire:`Modifié par ${joueur?.pseudo||"admin"} (ID:${joueur?.id||"admin"}). Champs: ${champs||"(aucun changement détecté)"}` }).catch(()=>{});
    onSave({...bar,...f,cibles:parseInt(f.cibles)||1,tournois:f.tournois==="oui",lat:parseFloat(f.lat)||null,lng:parseFloat(f.lng)||null});
    setSaving(false);
    onClose();
  };
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

const EditAssoModal = ({ asso, allBars=[], onSave, onClose, joueur=null }) => {
  const [f,setF]=useState({ nom:asso.nom||"",ville:asso.ville||"",zone:asso.zone||"",type:asso.type||"electronique",president:asso.president||"",contact_nom:asso.contact_nom||"",jours:asso.jours||"",lieu:asso.lieu||"",tel:asso.tel||"",contact:asso.contact||"",description:asso.description||"",lat:String(asso.lat||""),lng:String(asso.lng||"") });
  const [selectedBars, setSelectedBars] = useState(Array.isArray(asso.bars) ? asso.bars : []);
  const [barSearch, setBarSearch] = useState("");
  const [saving,setSaving]=useState(false);
  const [errMsg, setErrMsg]=useState("");
  const set=k=>v=>setF(p=>({...p,[k]:v}));
  const toggleBar = (nom) => setSelectedBars(prev => prev.includes(nom) ? prev.filter(n=>n!==nom) : [...prev, nom]);
  const filteredBars = allBars.filter(b => b.nom.toLowerCase().includes(barSearch.toLowerCase()) || b.ville.toLowerCase().includes(barSearch.toLowerCase()));
  const save=async()=>{
    setSaving(true);
    setErrMsg("");
    try {
      const payload = { nom:f.nom, ville:f.ville, zone:f.zone, type:f.type, president:f.president, contact_nom:f.contact_nom, jours:f.jours, lieu:f.lieu, tel:f.tel, contact:f.contact, description:f.description, bars:selectedBars, lat:parseFloat(f.lat)||null, lng:parseFloat(f.lng)||null };
      await db.updateAssociation(asso.slug, payload);
      // Log de modification
      const champs = Object.entries(f).filter(([k,v])=>String(asso[k]||"")!==v).map(([k])=>k).join(", ");
      db.addProposition({ nom:asso.nom, ville:asso.ville, slug:asso.slug, statut:"info", date:Date.now(), type_prop:"modif_asso", commentaire:`Modifié par ${joueur?.pseudo||"?"} (ID:${joueur?.id||"?"}) — Champs: ${champs||"(aucun changement détecté)"}` }).catch(()=>{});
      onSave({...asso,...payload});
      onClose();
    } catch(e) {
      setErrMsg("❌ Erreur : " + (e?.message || "impossible de sauvegarder"));
    } finally {
      setSaving(false);
    }
  };

  const inp = { width:"100%", background:"#111", border:`1px solid ${C.border}`, borderRadius:10, padding:"12px 14px", color:C.text, fontSize:15, boxSizing:"border-box" };
  const lbl = { fontSize:12, color:C.muted, fontWeight:600, display:"block", marginBottom:6, letterSpacing:.4 };
  const sec = { background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"16px 14px", display:"flex", flexDirection:"column", gap:14 };

  return (
    <div style={{ position:"fixed", inset:0, background:C.bg, zIndex:600, overflowY:"auto", overflowX:"hidden" }}>
      {/* Header fixe */}
      <div style={{ position:"sticky", top:0, zIndex:10, background:C.bg, borderBottom:`1px solid ${C.border}`, padding:"14px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={onClose} style={{ background:"none", border:"none", color:C.muted, fontSize:22, cursor:"pointer", lineHeight:1, padding:"0 4px" }}>‹</button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:16, color:C.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>✏️ {asso.nom}</div>
        </div>
        <button onClick={save} disabled={saving||!f.nom||!f.ville}
          style={{ background:saving||!f.nom||!f.ville?C.border:`linear-gradient(135deg,${C.accent},#ea580c)`, color:"#fff", border:"none", borderRadius:10, padding:"9px 18px", fontWeight:700, fontSize:14, cursor:"pointer", flexShrink:0, touchAction:"manipulation" }}>
          {saving?"⏳…":"💾 Sauvegarder"}
        </button>
      </div>

      <div style={{ padding:"16px 16px 100px", display:"flex", flexDirection:"column", gap:14, maxWidth:600, margin:"0 auto" }}>

        {/* Identification */}
        <div style={sec}>
          <div style={{ fontWeight:700, fontSize:12, color:C.accent, letterSpacing:.8 }}>📋 IDENTIFICATION</div>
          <div><label style={lbl}>Nom du club *</label><input value={f.nom} onChange={e=>set("nom")(e.target.value)} placeholder="Ex : Euskal Dardoa" style={inp}/></div>
          <div><label style={lbl}>Ville *</label><input value={f.ville} onChange={e=>set("ville")(e.target.value)} placeholder="Ex : Bayonne" style={inp}/></div>
          <div><label style={lbl}>Zone / Région</label><input value={f.zone} onChange={e=>set("zone")(e.target.value)} placeholder="Ex : Pays Basque" style={inp}/></div>
          <div>
            <label style={lbl}>Type de jeu</label>
            <select value={f.type} onChange={e=>set("type")(e.target.value)} style={{...inp}}>
              {TYPES.slice(0,3).map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
        </div>

        {/* Contact */}
        <div style={sec}>
          <div style={{ fontWeight:700, fontSize:12, color:C.accent, letterSpacing:.8 }}>👑 CONTACT</div>
          <div><label style={lbl}>Président</label><input value={f.president} onChange={e=>set("president")(e.target.value)} placeholder="Ex : Jean Dupont" style={inp}/></div>
          <div><label style={lbl}>Personne à contacter</label><input value={f.contact_nom} onChange={e=>set("contact_nom")(e.target.value)} placeholder="Ex : Marie Martin" style={inp}/></div>
          <div><label style={lbl}>Téléphone</label><input value={f.tel} onChange={e=>set("tel")(e.target.value)} placeholder="06 XX XX XX XX" style={inp} type="tel"/></div>
          <div><label style={lbl}>Contact / Réseaux sociaux</label><input value={f.contact} onChange={e=>set("contact")(e.target.value)} placeholder="email, Facebook, Instagram…" style={inp}/></div>
        </div>

        {/* Entraînements */}
        <div style={sec}>
          <div style={{ fontWeight:700, fontSize:12, color:C.accent, letterSpacing:.8 }}>🎯 ENTRAÎNEMENTS</div>
          <div><label style={lbl}>Jour et heure d'entraînement</label><input value={f.jours} onChange={e=>set("jours")(e.target.value)} placeholder="Ex : Vendredi 20h00" style={inp}/></div>
          <div><label style={lbl}>Lieu d'entraînement</label><input value={f.lieu} onChange={e=>set("lieu")(e.target.value)} placeholder="Ex : Salle des sports, Bar du Centre…" style={inp}/></div>
        </div>

        {/* Description */}
        <div style={sec}>
          <div style={{ fontWeight:700, fontSize:12, color:C.accent, letterSpacing:.8 }}>ℹ️ DESCRIPTION</div>
          <div>
            <textarea value={f.description} onChange={e=>set("description")(e.target.value)} rows={4} placeholder="Présentez votre association…"
              style={{...inp, resize:"vertical"}}/>
          </div>
        </div>

        {/* Bars affiliés */}
        <div style={sec}>
          <div style={{ fontWeight:700, fontSize:12, color:C.accent, letterSpacing:.8 }}>
            🍺 BARS AFFILIÉS {selectedBars.length>0&&<span style={{ color:C.text }}>({selectedBars.length})</span>}
          </div>
          <input value={barSearch} onChange={e=>setBarSearch(e.target.value)} placeholder="Rechercher un bar…"
            style={{...inp}}/>
          <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:240, overflowY:"auto" }}>
            {filteredBars.length===0 && <span style={{ color:C.muted, fontSize:13 }}>Aucun bar trouvé</span>}
            {filteredBars.map(b => {
              const checked = selectedBars.includes(b.nom);
              return (
                <label key={b.slug} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 12px", borderRadius:10, cursor:"pointer", background:checked?`${C.accent}14`:"#ffffff06", border:`1px solid ${checked?C.accent+"55":C.border}`, transition:"all .15s" }}>
                  <input type="checkbox" checked={checked} onChange={()=>toggleBar(b.nom)} style={{ accentColor:C.accent, width:18, height:18, flexShrink:0 }}/>
                  <span style={{ fontWeight:checked?700:400, fontSize:14, flex:1 }}>{b.nom}</span>
                  <span style={{ fontSize:12, color:C.muted }}>📍 {b.ville}</span>
                </label>
              );
            })}
          </div>
          {selectedBars.length>0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {selectedBars.map(nom=>(
                <span key={nom} style={{ background:`${C.accent}22`, border:`1px solid ${C.accent}44`, borderRadius:20, padding:"4px 12px", fontSize:12, fontWeight:600, color:C.accent, display:"flex", alignItems:"center", gap:6 }}>
                  {nom}
                  <span onClick={()=>toggleBar(nom)} style={{ cursor:"pointer", opacity:.7, fontSize:14 }}>✕</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Localisation */}
        <div style={sec}>
          <div style={{ fontWeight:700, fontSize:12, color:C.accent, letterSpacing:.8 }}>📍 LOCALISATION</div>
          <div><label style={lbl}>Latitude</label><input value={f.lat} onChange={e=>set("lat")(e.target.value)} placeholder="43.49" style={inp} type="number" inputMode="decimal"/></div>
          <div><label style={lbl}>Longitude</label><input value={f.lng} onChange={e=>set("lng")(e.target.value)} placeholder="-1.47" style={inp} type="number" inputMode="decimal"/></div>
        </div>

        {errMsg && <div style={{ fontSize:13, padding:"12px 16px", borderRadius:12, background:"#ef444418", border:"1px solid #ef444444", color:C.red, lineHeight:1.6 }}>{errMsg}</div>}

        {/* Boutons bas de page */}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:C.card, color:C.muted, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 0", fontWeight:600, fontSize:15, cursor:"pointer", touchAction:"manipulation" }}>Annuler</button>
          <button onClick={save} disabled={saving||!f.nom||!f.ville}
            style={{ flex:2, background:saving||!f.nom||!f.ville?C.border:`linear-gradient(135deg,${C.accent},#ea580c)`, color:"#fff", border:"none", borderRadius:12, padding:"14px 0", fontWeight:700, fontSize:15, cursor:"pointer", touchAction:"manipulation" }}>
            {saving?"⏳ Sauvegarde…":"💾 Sauvegarder"}
          </button>
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

// ── HELP MODAL (bottom-sheet, déclenché depuis App globalement) ───────────────
const HelpModal = ({ emoji="📖", title, items=[], visual=null, onClose }) => (
  <div onClick={onClose} style={{ position:"fixed", inset:0, background:"#000000cc", zIndex:2000, display:"flex", alignItems:"flex-end" }}>
    <div onClick={e=>e.stopPropagation()} style={{
      width:"100%", background:"#0b0b16",
      border:"1px solid #1e1e30", borderRadius:"22px 22px 0 0",
      padding:"0 0 32px", maxHeight:"82vh", overflowY:"auto",
      boxShadow:"0 -8px 48px #000000bb",
    }}>
      <div style={{ display:"flex", justifyContent:"center", padding:"14px 0 4px" }}>
        <div style={{ width:40, height:4, borderRadius:2, background:"#2a2a3a" }}/>
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 20px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:24 }}>{emoji}</span>
          <h2 style={{ fontWeight:900, fontSize:18, color:"#f1f5f9", margin:0 }}>{title}</h2>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:"#4b5563", fontSize:22, cursor:"pointer", lineHeight:1 }}>✕</button>
      </div>
      {visual && <div style={{ padding:"0 16px 14px" }}>{visual}</div>}
      <div style={{ padding:"0 16px" }}>
        {items.map((it,i)=>(
          <div key={i} style={{ marginBottom:10, borderRadius:14, background:"linear-gradient(135deg,#111120,#0c0c18)", border:"1px solid #1e1e2e", padding:"14px 16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <span style={{ fontSize:18 }}>{it.icon}</span>
              <span style={{ fontWeight:800, fontSize:14, color:"#f97316" }}>{it.label}</span>
            </div>
            <p style={{ color:"#94a3b8", fontSize:13, lineHeight:1.75, margin:0 }}>{it.text}</p>
          </div>
        ))}
      </div>
      <div style={{ padding:"12px 16px 0" }}>
        <button onClick={onClose} style={{
          width:"100%", padding:"15px", borderRadius:14,
          background:"linear-gradient(135deg,#f97316,#ea580c)",
          border:"none", color:"#fff", fontSize:15, fontWeight:800,
          cursor:"pointer", boxShadow:"0 4px 20px #f9731440", touchAction:"manipulation",
        }}>J'ai compris ✓</button>
      </div>
    </div>
  </div>
);

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
  const prog = getDrixProgression(j.drix || 1000);

  // Bouton image générique
  const ImgBtn = ({ src, onClick, badge=0 }) => (
    <div onClick={onClick}
      style={{ position:"relative",cursor:"pointer",borderRadius:16,overflow:"hidden",userSelect:"none",touchAction:"manipulation",transition:"transform .15s, box-shadow .15s",width:"100%",paddingTop:"100%" }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 32px #00000088";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
      <img src={src} alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",display:"block",borderRadius:16,objectFit:"cover" }}/>
      {badge>0 && (
        <div style={{ position:"absolute",top:10,right:10,background:"#ef4444",color:"#fff",borderRadius:"50%",minWidth:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,boxShadow:"0 2px 8px #00000066",zIndex:2 }}>
          {badge>9?"9+":badge}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth:700,margin:"0 auto",padding:"16px 12px 24px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Carte profil ── */}
      <style>{`
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        @keyframes pulseGlow { 0%,100%{opacity:.7} 50%{opacity:1} }
      `}</style>
      <div onClick={()=>setPage("mon-profil")} style={{
        position:"relative", overflow:"hidden", borderRadius:22, marginBottom:14,
        cursor:"pointer", userSelect:"none", touchAction:"manipulation",
        padding:2,
        background:`linear-gradient(135deg,${color}cc,${color}44,${color}cc)`,
        backgroundSize:"300% 300%",
        animation:"shimmer 3s linear infinite",
        boxShadow:`0 0 32px ${color}44, 0 8px 32px #0008`,
        transition:"transform .15s, box-shadow .15s" }}
        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=`0 0 48px ${color}66, 0 16px 48px #000a`;}}
        onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=`0 0 32px ${color}44, 0 8px 32px #0008`;}}>

        {/* Inner card */}
        <div style={{ position:"relative", borderRadius:20, overflow:"hidden",
          background:`linear-gradient(160deg,#0f0f1a 0%,#111118 40%,#0a0a12 100%)`,
          padding:"12px 14px 10px" }}>

          {/* Orbes décoratifs */}
          <div style={{ position:"absolute",top:-40,right:-20,width:180,height:180,borderRadius:"50%",
            background:`radial-gradient(circle,${color}22 0%,transparent 65%)`,pointerEvents:"none",animation:"pulseGlow 3s ease-in-out infinite" }}/>
          <div style={{ position:"absolute",bottom:-30,left:-10,width:120,height:120,borderRadius:"50%",
            background:`radial-gradient(circle,${color}15 0%,transparent 65%)`,pointerEvents:"none" }}/>

          {/* Badge demandes d'amis */}
          {demandesAmisCount > 0 && (
            <div style={{ position:"absolute",top:10,right:10,background:"#10b981",color:"#fff",borderRadius:"50%",minWidth:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,boxShadow:"0 2px 8px #00000066",border:"2px solid #0f0f1a",zIndex:5 }}>
              {demandesAmisCount > 9 ? "9+" : demandesAmisCount}
            </div>
          )}

          {/* Ligne principale : photo + infos + DRIX */}
          <div style={{ display:"flex", alignItems:"center", gap:12, position:"relative", zIndex:1 }}>

            {/* Photo avec double anneau */}
            <div style={{ position:"relative", flexShrink:0 }}>
              <div style={{ position:"absolute",inset:-3,borderRadius:"50%",
                background:`conic-gradient(${color},${color}44,${color})`,
                animation:"spin 4s linear infinite" }}/>
              <div style={{ position:"absolute",inset:-1,borderRadius:"50%",background:"#0f0f1a" }}/>
              <div style={{ position:"relative",width:62,height:62,borderRadius:"50%",
                overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",
                background:color+"22",fontSize:24,
                boxShadow:`0 0 16px ${color}66` }}>
                {j.photo ? <img src={j.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : emoji}
              </div>
            </div>

            {/* Infos */}
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:900, fontSize:"clamp(15px,4.5vw,20px)", color:"#fff", lineHeight:1.1,
                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                textShadow:`0 0 20px ${color}88` }}>{j.pseudo}</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
                <span style={{ background:`${color}22`, border:`1px solid ${color}55`, borderRadius:20,
                  padding:"1px 8px", fontSize:10, fontWeight:800, color,
                  boxShadow:`0 0 8px ${color}33` }}>{emoji} {titre}</span>
              </div>
              {stats && (
                <div style={{ display:"flex", gap:5, marginTop:5, flexWrap:"wrap" }}>
                  {[
                    { label:"V", val:stats.victoires, c:"#22c55e" },
                    { label:"D", val:stats.defaites, c:"#ef4444" },
                    { label:"WR", val:`${stats.parties>0?Math.round(stats.victoires/stats.parties*100):0}%`, c:"#60a5fa" },
                  ].map(({label,val,c})=>(
                    <div key={label} style={{ background:"#ffffff08", borderRadius:7, padding:"2px 7px", textAlign:"center" }}>
                      <div style={{ fontSize:12, fontWeight:900, color:c, lineHeight:1 }}>{val}</div>
                      <div style={{ fontSize:9, color:"#64748b", fontWeight:700 }}>{label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DRIX badge */}
            <div style={{ textAlign:"center", flexShrink:0,
              background:`linear-gradient(160deg,${color}33,${color}11)`,
              border:`1px solid ${color}88`,
              borderRadius:14, padding:"8px 12px",
              boxShadow:`0 0 14px ${color}55, inset 0 1px 0 ${color}33` }}>
              <div style={{ fontWeight:900, fontSize:"clamp(17px,5vw,24px)", color, lineHeight:1,
                textShadow:`0 0 14px ${color}` }}>{j.drix||1000}</div>
              <div style={{ fontSize:9, color:`${color}cc`, fontWeight:800, letterSpacing:1.5, marginTop:2 }}>DRIX</div>
            </div>
          </div>

          {/* Barre de progression vers prochain rang */}
          {prog && prog.prochain && (
            <div style={{ marginTop:8, position:"relative", zIndex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <span style={{ fontSize:10, color:"#64748b" }}>{titre}</span>
                <span style={{ fontSize:10, color, fontWeight:700 }}>
                  {prog.restant > 0 ? `${prog.restant} DRIX avant ${prog.prochain.titre}` : prog.prochain.titre}
                </span>
              </div>
              <div style={{ height:5, borderRadius:10, background:"#ffffff12", overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${prog.pct}%`, borderRadius:10,
                  background:`linear-gradient(90deg,${color}99,${color})`,
                  boxShadow:`0 0 8px ${color}88`,
                  transition:"width .6s ease" }}/>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Grille 2×3 — tous boutons même taille ── */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
        <ImgBtn src="/lecomptoir3.png"      onClick={()=>setPage("communaute")}/>
        <ImgBtn src="/defi2.png"            onClick={()=>setPage("defi")} badge={defisCount}/>
        <ImgBtn src="/classement.png"       onClick={()=>setPage("drix")}/>
        <ImgBtn src="/minijeux2.png"        onClick={()=>setPage("jeux-sans")}/>
        <ImgBtn src="/scoreur2.png"         onClick={()=>setPage("jeux-flechettes")}/>
        <ImgBtn src="/trouve ton spot.png"  onClick={()=>setPage("bars")}/>
      </div>

      {/* ── Feedback CTA esport — signaler bug / améliorations ── */}
      <style>{`
        @keyframes fbShine    { 0%{transform:translateX(-120%) skewX(-18deg)} 60%,100%{transform:translateX(320%) skewX(-18deg)} }
        @keyframes fbBulb     { 0%,100%{transform:rotate(-6deg) scale(1);filter:drop-shadow(0 0 4px #fbbf2466)} 50%{transform:rotate(6deg) scale(1.08);filter:drop-shadow(0 0 12px #fbbf24cc)} }
        @keyframes fbBorder   { 0%,100%{box-shadow:0 0 0 1px #f9731640,0 0 18px #f9731622,0 6px 24px #00000080,inset 0 1px 0 #ffffff14} 50%{box-shadow:0 0 0 1px #f97316aa,0 0 28px #f9731644,0 6px 24px #00000080,inset 0 1px 0 #ffffff14} }
      `}</style>
      <button onClick={()=>setPage("contact")}
        style={{
          marginTop:18, width:"100%", position:"relative", overflow:"hidden",
          background:"linear-gradient(135deg,#1a0a14 0%,#0f0a1a 50%,#0a0610 100%)",
          border:"none", borderRadius:16, padding:"16px 18px",
          color:C.text, cursor:"pointer", textAlign:"left",
          display:"flex", alignItems:"center", gap:14,
          fontWeight:800, fontSize:14, letterSpacing:.3,
          touchAction:"manipulation", transition:"transform .15s",
          animation:"fbBorder 3s ease-in-out infinite",
        }}
        onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; }}
        onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; }}>
        {/* Halo coin haut gauche */}
        <div style={{ position:"absolute",top:-30,left:-30,width:90,height:90,borderRadius:"50%",background:"radial-gradient(circle,#f9731633 0%,transparent 70%)",pointerEvents:"none" }}/>
        {/* Halo coin bas droit */}
        <div style={{ position:"absolute",bottom:-25,right:-25,width:80,height:80,borderRadius:"50%",background:"radial-gradient(circle,#a855f733 0%,transparent 70%)",pointerEvents:"none" }}/>
        {/* Shine balayage */}
        <div style={{ position:"absolute",top:0,left:0,bottom:0,width:80,background:"linear-gradient(90deg,transparent,#ffffff18,transparent)",animation:"fbShine 4.5s ease-in-out infinite",pointerEvents:"none" }}/>
        {/* Icône ampoule animée */}
        <div style={{ position:"relative",width:42,height:42,borderRadius:12,background:"linear-gradient(135deg,#f9731622,#a855f722)",border:"1px solid #f9731644",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,zIndex:1 }}>
          <span style={{ fontSize:22,animation:"fbBulb 2.4s ease-in-out infinite",display:"inline-block" }}>💡</span>
        </div>
        {/* Texte */}
        <div style={{ position:"relative",zIndex:1,flex:1,minWidth:0 }}>
          <div style={{ fontSize:10,fontWeight:800,letterSpacing:1.5,color:C.accent,marginBottom:2,textTransform:"uppercase",display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ display:"inline-block",width:6,height:6,borderRadius:"50%",background:C.accent,animation:"nav-pulse 1.5s infinite" }}/>
            Ton avis compte
          </div>
          <div style={{ fontSize:14,fontWeight:800,color:"#fff",lineHeight:1.25 }}>
            Signale un bug · Propose une amélioration
          </div>
        </div>
        {/* Flèche */}
        <div style={{ position:"relative",zIndex:1,width:32,height:32,borderRadius:10,background:`linear-gradient(135deg,${C.accent},#ea580c)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:`0 4px 14px ${C.accent}55` }}>
          <span style={{ fontSize:16,fontWeight:900,color:"#fff" }}>→</span>
        </div>
      </button>
    </div>
  );
};

// ── CARTE MATCH ACTIF (composant séparé pour pouvoir utiliser useState) ──────
const MatchActifCard = ({ d, joueur, setPage, onAbandon }) => {
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const adversaire = d.challenger_id===joueur.id ? d.defie_pseudo : d.challenger_pseudo;

  // Poll toutes les 15s — si l'adversaire a abandonné depuis le Scoreur, le match disparaît automatiquement
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await sb(`duels?id=eq.${d.id}&select=statut`);
        if (res?.[0]?.statut === "abandonne") onAbandon();
      } catch {}
    }, 15000);
    return () => clearInterval(poll);
  }, [d.id]); // eslint-disable-line

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
// ── Clé ISO semaine (lundi = début) ──────────────────────────────────────────
const getISOWeekKey = () => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const y = d.getUTCFullYear();
  const w = Math.ceil((((d - Date.UTC(y,0,1)) / 86400000) + 1) / 7);
  return `${y}-W${String(w).padStart(2,"0")}`;
};

// ── Shuffle déterministe (même seed = même résultat sur tous les appareils) ──
const seededShuffle = (arr, seed) => {
  const a = [...arr];
  let s = (seed >>> 0) || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), s | 1) >>> 0;
    s = (s ^ (s + Math.imul(s ^ (s >>> 7), s | 61))) >>> 0;
    s = (s ^ (s >>> 14)) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ── FACE À FACE CARD avec animation shake + compteur DRIX ─────────────────────
const FaceAFaceCard = ({ joueur, rival, myColor, rColor, myEmoji, rEmoji, myTitre, rTitre, myDrix, rvDrix, probMoi, probRival, analyse }) => {
  const [animMy, setAnimMy] = useState(0);
  const [animRv, setAnimRv] = useState(0);
  const [shaking, setShaking] = useState(true);

  useEffect(() => {
    const duration = 3000;
    const start = performance.now();
    let frameId;
    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic — démarre vite, ralentit à la fin (effet dramatique)
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimMy(Math.round(myDrix * eased));
      setAnimRv(Math.round(rvDrix * eased));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        setShaking(false);
      }
    };
    frameId = requestAnimationFrame(tick);
    const t = setTimeout(()=>setShaking(false), 3000);
    return () => { cancelAnimationFrame(frameId); clearTimeout(t); };
  }, [myDrix, rvDrix]);

  return (
    <div style={{
      background:"linear-gradient(135deg,#0d0010,#0a0018,#100010)",
      border:"1px solid rgba(168,85,247,0.18)",
      borderRadius:22, padding:"20px 16px", marginBottom:12,
      position:"relative", overflow:"hidden",
      animation: shaking ? "faceShake 0.45s cubic-bezier(.36,.07,.19,.97) 0s 6.5" : "none",
      transformOrigin:"center center",
    }}>
      <style>{`
        @keyframes faceShake {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          10% { transform: translate(-3px,-2px) rotate(-0.4deg); }
          20% { transform: translate(3px,2px) rotate(0.4deg); }
          30% { transform: translate(-3px,2px) rotate(-0.3deg); }
          40% { transform: translate(3px,-2px) rotate(0.3deg); }
          50% { transform: translate(-2px,3px) rotate(-0.4deg); }
          60% { transform: translate(2px,-3px) rotate(0.4deg); }
          70% { transform: translate(-3px,-1px) rotate(-0.3deg); }
          80% { transform: translate(3px,1px) rotate(0.3deg); }
          90% { transform: translate(-1px,-1px) rotate(0deg); }
        }
        @keyframes drixCountPulse {
          0%,100% { text-shadow: 0 0 8px #f9731644; transform: scale(1); }
          50%     { text-shadow: 0 0 18px #f97316cc, 0 0 32px #f9731666; transform: scale(1.06); }
        }
      `}</style>
      {/* Orbes fond */}
      <div style={{ position:"absolute",top:-50,left:-20,width:160,height:160,borderRadius:"50%",background:`radial-gradient(circle,${myColor}18 0%,transparent 70%)`,pointerEvents:"none" }}/>
      <div style={{ position:"absolute",top:-50,right:-20,width:160,height:160,borderRadius:"50%",background:`radial-gradient(circle,${rColor}18 0%,transparent 70%)`,pointerEvents:"none" }}/>

      <div style={{ fontSize:9,color:"#475569",fontWeight:700,letterSpacing:2,textAlign:"center",marginBottom:16 }}>FACE À FACE</div>

      <div style={{ display:"flex",alignItems:"center" }}>
        {/* MOI */}
        <div style={{ flex:1,textAlign:"center" }}>
          <div style={{ position:"relative",display:"inline-block",marginBottom:10 }}>
            <div style={{ width:74,height:74,borderRadius:"50%",background:`${myColor}20`,border:`3px solid ${myColor}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",boxShadow:`0 0 28px ${myColor}44`,margin:"0 auto" }}>
              {joueur.photo ? <img src={joueur.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span style={{ fontSize:30 }}>{myEmoji}</span>}
            </div>
            <div style={{ position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%)",background:myColor,borderRadius:8,padding:"2px 7px",fontSize:8,fontWeight:900,color:"#000",whiteSpace:"nowrap",letterSpacing:.5 }}>MOI</div>
          </div>
          <div style={{ fontWeight:900,fontSize:14,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:90,margin:"0 auto 3px" }}>{joueur.pseudo}</div>
          <div style={{ color:myColor,fontSize:10,fontWeight:700,marginBottom:4 }}>{myEmoji} {myTitre}</div>
          <div style={{ fontSize:20,fontWeight:900,color:"#f97316",lineHeight:1, animation: shaking ? "drixCountPulse 0.4s ease-in-out infinite" : "none", display:"inline-block" }}>{animMy}</div>
          <div style={{ fontSize:9,color:"#475569" }}>DRIX</div>
        </div>

        {/* VS */}
        <div style={{ textAlign:"center",padding:"0 6px",flexShrink:0 }}>
          <div style={{ width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,#a855f7,#f97316)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 24px rgba(168,85,247,0.45)",margin:"0 auto 8px",animation:"rivalPulse 2.5s ease infinite" }}>
            <Swords size={18} color="#fff"/>
          </div>
          <div style={{ fontSize:10,fontWeight:900,color:"#a855f7",letterSpacing:3 }}>VS</div>
        </div>

        {/* RIVAL */}
        <div style={{ flex:1,textAlign:"center" }}>
          <div style={{ position:"relative",display:"inline-block",marginBottom:10 }}>
            <div style={{ width:74,height:74,borderRadius:"50%",background:`${rColor}20`,border:`3px solid ${rColor}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",boxShadow:`0 0 28px ${rColor}44`,margin:"0 auto" }}>
              {rival.photo ? <img src={rival.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span style={{ fontSize:30 }}>{rEmoji}</span>}
            </div>
            <div style={{ position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%)",background:rColor,borderRadius:8,padding:"2px 7px",fontSize:8,fontWeight:900,color:"#000",whiteSpace:"nowrap",letterSpacing:.5 }}>RIVAL</div>
          </div>
          <div style={{ fontWeight:900,fontSize:14,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:90,margin:"0 auto 3px" }}>{rival.pseudo}</div>
          <div style={{ color:rColor,fontSize:10,fontWeight:700,marginBottom:4 }}>{rEmoji} {rTitre}</div>
          <div style={{ fontSize:20,fontWeight:900,color:"#f97316",lineHeight:1, animation: shaking ? "drixCountPulse 0.4s ease-in-out infinite" : "none", display:"inline-block" }}>{animRv}</div>
          <div style={{ fontSize:9,color:"#475569" }}>DRIX</div>
        </div>
      </div>

      {/* Barre de probabilités */}
      <div style={{ marginTop:20 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
          <span style={{ fontSize:12,fontWeight:800,color:myColor }}>{probMoi}%</span>
          <div style={{ textAlign:"center" }}>
            <span style={{ fontSize:9,color:analyse.color,fontWeight:700,background:`${analyse.color}18`,padding:"3px 8px",borderRadius:20,border:`1px solid ${analyse.color}44` }}>
              {analyse.emoji} {analyse.label}
            </span>
          </div>
          <span style={{ fontSize:12,fontWeight:800,color:rColor }}>{probRival}%</span>
        </div>
        <div style={{ height:7,background:"#ffffff0d",borderRadius:99,overflow:"hidden",position:"relative" }}>
          <div style={{ position:"absolute",left:0,top:0,height:"100%",width:`${probMoi}%`,background:`linear-gradient(90deg,${myColor},${myColor}bb)`,borderRadius:99 }}/>
        </div>
        <div style={{ textAlign:"center",marginTop:7,fontSize:10,color:"#64748b" }}>{analyse.sub}</div>
      </div>
    </div>
  );
};

const PageDefi = ({ joueur, setPage }) => {
  const [amis, setAmis] = useState([]);
  const [amisData, setAmisData] = useState({});
  const [matchsActifs, setMatchsActifs] = useState([]);
  const [resultsAContester, setResultsAContester] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("1v1");
  const [searchDefi, setSearchDefi] = useState("");
  const [searchGlobal, setSearchGlobal] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  // ── modal défi premium ──
  const [modalAmi, setModalAmi] = useState(null); // { amiId, amiPseudo, profil }
  const [modalData, setModalData] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [defiForm, setDefiForm] = useState({ mode:"501", manches:1, type:"classe" });
  const [sending, setSending] = useState(false);
  // ── rivalité hebdo ──
  const [rivaliteHebdo, setRivaliteHebdo] = useState(null);
  const [showRivaliteHebdo, setShowRivaliteHebdo] = useState(false);
  const [rivaliteHistory, setRivaliteHistory] = useState(null);   // duels entre moi et le rival
  const [rivaliteTimerStr, setRivaliteTimerStr] = useState("");   // countdown dynamique
  const [hideAssoLock, setHideAssoLock] = useState(() => localStorage.getItem("dp_defi_hebdo_asso_skip") === "1");
  const [rivaliteResults, setRivaliteResults] = useState({});     // {rivalId: 'won' | 'lost'}

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

  // ── Rivalité hebdo — paires aléatoires déterministes au sein de l'asso ──────
  useEffect(() => {
    if (!joueur?.id || !joueur.asso_slug) return;

    const weekKey  = `dp_rivalite_${getISOWeekKey()}`;
    const shownKey = weekKey + "_shown";
    const alreadyShown = localStorage.getItem(shownKey) === "1";

    // Si déjà calculé cette semaine → on charge depuis le cache
    const stored = localStorage.getItem(weekKey);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setRivaliteHebdo(data);
        if (!alreadyShown) setShowRivaliteHebdo(true);
      } catch {}
      return;
    }

    // Charger tous les membres de l'asso
    sb(`joueurs?asso_slug=eq.${encodeURIComponent(joueur.asso_slug)}&select=id,pseudo,drix,photo&limit=200`)
      .then(membres => {
        if (!Array.isArray(membres) || membres.length < 2) return;

        // Tri déterministe par ID avant le shuffle (garantit même ordre sur tous les appareils)
        const sorted   = [...membres].sort((a, b) => a.id.localeCompare(b.id));
        const weekNum  = parseInt(getISOWeekKey().replace(/\D/g,""), 10) || 1;
        const shuffled = seededShuffle(sorted, weekNum);

        const n     = shuffled.length;
        const myIdx = shuffled.findIndex(j => j.id === joueur.id);
        if (myIdx === -1) return;

        // Calcul de l'index rival
        let rivalIdx;
        if (n % 2 === 1 && myIdx === n - 1) {
          // Impair : dernier joueur → se bat contre le 1er
          rivalIdx = 0;
        } else if (myIdx % 2 === 0) {
          rivalIdx = myIdx + 1;
        } else {
          rivalIdx = myIdx - 1;
        }
        const rival = shuffled[rivalIdx];

        // Si impair ET ce joueur est le 1er → il joue aussi contre le dernier
        const rival2 = (n % 2 === 1 && myIdx === 0) ? shuffled[n - 1] : null;

        const data = { rival, rival2, weekKey };
        localStorage.setItem(weekKey, JSON.stringify(data));
        setRivaliteHebdo(data);
        if (!alreadyShown) {
          setShowRivaliteHebdo(true);
          // Notification push au premier chargement de la semaine
          const notifKey = weekKey + "_notif";
          if (!localStorage.getItem(notifKey)) {
            localStorage.setItem(notifKey, "1");
            if ("Notification" in window) {
              const sendNotif = () => new Notification("⚔️ DartPoint — Rivalité hebdo", {
                body: `Ta rivalité cette semaine : affronte ${rival.pseudo} !`,
                icon: "/icon-192.png",
              });
              if (Notification.permission === "granted") sendNotif();
              else if (Notification.permission !== "denied")
                Notification.requestPermission().then(p => { if (p === "granted") sendNotif(); });
            }
          }
        }
      })
      .catch(() => {});
  }, [joueur?.id, joueur?.asso_slug]); // eslint-disable-line

  const fermerRivaliteHebdo = () => {
    setShowRivaliteHebdo(false);
    if (rivaliteHebdo?.weekKey) localStorage.setItem(rivaliteHebdo.weekKey + "_shown", "1");
  };

  // ── Détection : la rivalité hebdo a-t-elle été jouée cette semaine ? ──────
  // On vérifie les duels termine entre joueur et ses rivaux depuis lundi 00:00.
  useEffect(() => {
    if (!joueur?.id || !rivaliteHebdo?.rival?.id) return;
    const rivalIds = [rivaliteHebdo.rival?.id, rivaliteHebdo.rival2?.id].filter(Boolean);
    if (rivalIds.length === 0) return;
    // Calcul du début de la semaine (lundi 00:00)
    const now = new Date();
    const dayOfWeek = now.getDay() || 7; // 0 (dimanche) → 7
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    monday.setHours(0, 0, 0, 0);
    const weekStart = monday.getTime();

    const filter = rivalIds.map(rid => `and(or(challenger_id.eq.${joueur.id},defie_id.eq.${joueur.id}),or(challenger_id.eq.${rid},defie_id.eq.${rid}))`).join(",");
    sb(`duels?or=(${filter})&statut=eq.termine&date=gte.${weekStart}&order=date.desc&select=challenger_id,defie_id,gagnant_id,date`)
      .then(rows => {
        const results = {};
        for (const d of (rows||[])) {
          const opponentId = d.challenger_id === joueur.id ? d.defie_id : d.challenger_id;
          if (!rivalIds.includes(opponentId)) continue;
          if (results[opponentId]) continue; // garder seulement le 1er (le plus récent)
          results[opponentId] = d.gagnant_id === joueur.id ? "won" : "lost";
        }
        setRivaliteResults(results);
      })
      .catch(()=>{});
  }, [joueur?.id, rivaliteHebdo?.rival?.id, rivaliteHebdo?.rival2?.id]);

  // ── Timer countdown jusqu'à dimanche minuit (tourne dès que rivaliteHebdo est chargé) ──
  useEffect(() => {
    if (!rivaliteHebdo) return;
    const calcTimer = () => {
      const now = new Date();
      const dim = new Date(now);
      const daysUntilSun = (7 - now.getDay()) % 7 || 7;
      dim.setDate(now.getDate() + daysUntilSun);
      dim.setHours(23, 59, 59, 0);
      const diff = dim - now;
      if (diff <= 0) { setRivaliteTimerStr("Terminé"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setRivaliteTimerStr(`${d}j ${h}h`);
      else if (h > 0) setRivaliteTimerStr(`${h}h ${m}min`);
      else setRivaliteTimerStr(`${m}min`);
    };
    calcTimer();
    const t = setInterval(calcTimer, 60000);
    return () => clearInterval(t);
  }, [rivaliteHebdo]);

  // ── Historique des duels entre moi et mon rival ────────────────────────────
  useEffect(() => {
    if (!showRivaliteHebdo || !rivaliteHebdo?.rival?.id || !joueur?.id) return;
    const rid = rivaliteHebdo.rival.id;
    setRivaliteHistory(null);
    sb(`duels?or=(and(challenger_id.eq.${joueur.id},defie_id.eq.${rid}),and(challenger_id.eq.${rid},defie_id.eq.${joueur.id}))&statut=eq.termine&order=date.desc&select=*&limit=20`)
      .then(data => setRivaliteHistory(data || []))
      .catch(() => setRivaliteHistory([]));
  }, [showRivaliteHebdo, rivaliteHebdo?.rival?.id, joueur?.id]); // eslint-disable-line

  // ── Recherche globale debounced ──
  useEffect(() => {
    const q = searchDefi.trim();
    if (q.length < 2) { setSearchGlobal([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await sb(`joueurs?pseudo=ilike.*${encodeURIComponent(q)}*&select=id,pseudo,drix,photo&limit=10`);
        setSearchGlobal(Array.isArray(res) ? res : []);
      } catch { setSearchGlobal([]); }
      setSearchLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDefi]);

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
    <div style={{ maxWidth:700,margin:"0 auto",padding:"20px 16px" }}>

      <style>{`
        @keyframes defisGlow { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes defisIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes defisShine { 0%{transform:translateX(-120%) skewX(-12deg)} 100%{transform:translateX(320%) skewX(-12deg)} }
        @keyframes defisPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.85;transform:scale(1.01)} }
        @keyframes defisTimerBlink { 0%,100%{opacity:1} 50%{opacity:.45} }
      `}</style>

      <button onClick={()=>setPage("home")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",marginBottom:14,fontSize:13,display:"flex",alignItems:"center",gap:6 }}><ArrowLeft size={16}/> Accueil</button>

      {/* ── Hero header ── */}
      <div style={{ position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#0d0010 0%,#0a0a0f 60%,#001012 100%)",border:"1px solid rgba(168,85,247,0.2)",borderRadius:20,padding:"22px 20px",marginBottom:20 }}>
        <div style={{ position:"absolute",top:-40,right:-20,width:160,height:160,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,0.15) 0%,transparent 70%)",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",bottom:-30,left:-10,width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,rgba(249,115,22,0.1) 0%,transparent 70%)",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.025) 50%,transparent 60%)",animation:"defisShine 9s ease infinite",pointerEvents:"none" }}/>
        <div style={{ position:"relative",display:"flex",alignItems:"center",gap:14 }}>
          <div style={{ width:52,height:52,borderRadius:16,background:"linear-gradient(135deg,#a855f7,#7c3aed)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 30px rgba(168,85,247,0.45)",flexShrink:0 }}>
            <Swords size={24} color="#fff"/>
          </div>
          <div style={{ flex:1 }}>
            <h1 style={{ fontWeight:900,fontSize:24,margin:0,letterSpacing:-.3 }}>Défis</h1>
            <p style={{ color:C.muted,fontSize:12,margin:"4px 0 0",display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
              {rivaliteHebdo && <span style={{ background:"#a855f722",color:"#d8b4fe",padding:"1px 8px",borderRadius:20,fontSize:11,fontWeight:700 }}>⚔️ Rivalité active</span>}
              <span>{amis.length} ami{amis.length!==1?"s":""}</span>
            </p>
          </div>
          <div style={{ textAlign:"right",flexShrink:0 }}>
            <div style={{ fontSize:22,fontWeight:900,color:"#f97316",lineHeight:1 }}>{joueur.drix||1000}</div>
            <div style={{ fontSize:9,color:C.muted,fontWeight:700,letterSpacing:1 }}>DRIX</div>
          </div>
        </div>
      </div>

      {/* ── Défi hebdo verrouillé ── */}
      {(amis.length < 10 || !joueur.asso_slug) && !hideAssoLock && (
        <div style={{ background:"#f9731608",border:"1px solid #f9731633",borderRadius:14,padding:"14px 16px",marginBottom:16 }}>
          <div style={{ display:"flex",alignItems:"flex-start",gap:12,marginBottom:!joueur.asso_slug?14:0 }}>
            <Trophy size={18} color="#f97316" style={{ flexShrink:0,marginTop:2 }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontWeight:700,fontSize:13,color:"#fed7aa" }}>Rivalité de la Semaine — verrouillée</div>
              <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>
                {!joueur.asso_slug
                  ? <>Choisis une <strong style={{ color:"#f97316" }}>association</strong> pour débloquer la rivalité hebdomadaire et ses récompenses DRIX.</>
                  : <>Ajoute <strong style={{ color:"#f97316" }}>{10 - amis.length} ami{10 - amis.length > 1 ? "s" : ""}</strong> supplémentaire{10 - amis.length > 1 ? "s" : ""} pour débloquer la rivalité hebdomadaire.</>
                }
              </div>
            </div>
          </div>
          {!joueur.asso_slug && (
            <div style={{ display:"flex",gap:8,marginLeft:30 }}>
              <button onClick={()=>setPage("profil")}
                style={{ flex:2,background:"linear-gradient(135deg,#f97316,#ea580c)",border:"none",color:"#fff",borderRadius:10,padding:"9px 0",fontSize:12,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6,touchAction:"manipulation" }}>
                <Users size={13}/> Choisir une association
              </button>
              <button onClick={()=>{ localStorage.setItem("dp_defi_hebdo_asso_skip","1"); setHideAssoLock(true); }}
                style={{ flex:1,background:"#1a1a1a",border:`1px solid ${C.border}`,color:C.muted,borderRadius:10,padding:"9px 0",fontSize:11,fontWeight:600,cursor:"pointer",touchAction:"manipulation" }}>
                Ne plus demander
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Toggle 1v1 / Doublette ── */}
      <div style={{ display:"flex",gap:10,marginBottom:20 }}>
        <button onClick={()=>setTab("1v1")} style={{
          flex:1, padding:"13px 0", border:"none", cursor:"pointer", fontWeight:800, fontSize:14, borderRadius:12,
          transition:"all .15s",
          background: tab==="1v1"
            ? "linear-gradient(135deg,#f97316,#ea580c)"
            : "#1a1a1a",
          color: tab==="1v1" ? "#fff" : C.muted,
          boxShadow: tab==="1v1"
            ? "0 6px 0 #9a3412, 0 8px 16px rgba(249,115,22,0.35)"
            : "0 4px 0 #0a0a0a, 0 6px 12px rgba(0,0,0,0.4)",
          transform: tab==="1v1" ? "translateY(0)" : "translateY(-2px)",
          letterSpacing:.3, display:"flex", alignItems:"center", justifyContent:"center", gap:7,
        }}><Swords size={14}/>Défier un ami</button>
        <button onClick={()=>setTab("doublette")} style={{
          flex:1, padding:"13px 0", border:"none", cursor:"pointer", fontWeight:800, fontSize:14, borderRadius:12,
          transition:"all .15s",
          background: tab==="doublette"
            ? "linear-gradient(135deg,#a855f7,#7c3aed)"
            : "#1a1a1a",
          color: tab==="doublette" ? "#fff" : C.muted,
          boxShadow: tab==="doublette"
            ? "0 6px 0 #4c1d95, 0 8px 16px rgba(168,85,247,0.35)"
            : "0 4px 0 #0a0a0a, 0 6px 12px rgba(0,0,0,0.4)",
          transform: tab==="doublette" ? "translateY(0)" : "translateY(-2px)",
          letterSpacing:.3, display:"flex", alignItems:"center", justifyContent:"center", gap:7,
        }}><Users size={14}/>Doublette 2v2</button>
      </div>

      {tab==="doublette" && <DoubletteFlow joueur={joueur} amis={amis} amisData={amisData} setPage={setPage}/>}

      {tab==="1v1" && <>
      {resultsAContester.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontWeight:700,fontSize:16,marginBottom:12,color:C.red,display:"flex",alignItems:"center",gap:6 }}><AlertCircle size={16} color={C.red}/>Résultats à contester ({resultsAContester.length})</h2>
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
                    <div style={{ fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:5 }}><Swords size={13} color={C.red}/>vs {d.challenger_pseudo}</div>
                    <div style={{ color:C.muted,fontSize:12 }}>{d.mode} · Résultat : {sc}-{sd} pour {d.gagnant_pseudo}</div>
                  </div>
                  <span style={{ background:C.red+"22",color:C.red,borderRadius:20,padding:"3px 10px",fontSize:12,fontWeight:700,display:"inline-flex",alignItems:"center",gap:4 }}><Clock size={11}/>{heuresRestantes}h</span>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <Btn onClick={async ()=>{ await sb(`duels?id=eq.${d.id}`,{method:"PATCH",body:JSON.stringify({valide_defie:true}),prefer:"return=minimal"}); setResultsAContester(x=>x.filter(r=>r.id!==d.id)); }} style={{ flex:1,fontSize:13,background:C.green,display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}><Check size={13}/>J'accepte le résultat</Btn>
                  <Btn onClick={async ()=>{ await sb(`duels?id=eq.${d.id}`,{method:"PATCH",body:JSON.stringify({statut:"conteste"}),prefer:"return=minimal"}); setResultsAContester(x=>x.filter(r=>r.id!==d.id)); }} style={{ fontSize:13,background:"#2a2a2a",color:C.red,display:"flex",alignItems:"center",gap:6 }}><Zap size={13}/>Contester</Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {matchsActifs.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <h2 style={{ fontWeight:700,fontSize:16,marginBottom:12,color:C.green,display:"flex",alignItems:"center",gap:6 }}><Target size={16} color={C.green}/>Match en cours — Lance le scoreur !</h2>
          {matchsActifs.map(d => (
            <MatchActifCard key={d.id} d={d} joueur={joueur} setPage={setPage} onAbandon={()=>setMatchsActifs(x=>x.filter(m=>m.id!==d.id))}/>
          ))}
        </div>
      )}

      {/* ── Rivalité hebdo — grande carte immersive ── */}
      {rivaliteHebdo && (() => {
        // Carte "Défi accompli" affichée quand la rivalité a déjà été jouée cette semaine
        const renderDefiAccompli = (rival, result, isSecond = false) => {
          const won = result === "won";
          const mainColor = won ? "#22c55e" : "#a855f7"; // vert si gagné, violet doux sinon
          const mainColor2 = won ? "#16a34a" : "#7c3aed";
          const bgGradient = won
            ? "linear-gradient(135deg,#0a1f0d 0%,#051a08 50%,#0f2415 100%)"
            : "linear-gradient(135deg,#0d0010 0%,#0a0018 50%,#100010 100%)";
          return (
            <div key={`done-${rival.id}`} style={{
              position:"relative", overflow:"hidden",
              background: bgGradient,
              border:`2px solid ${mainColor}55`,
              borderRadius:22, padding:"22px 18px", marginBottom:12,
              boxShadow:`0 8px 40px ${mainColor}1a`,
              animation:"defisIn .35s ease both",
            }}>
              {/* Halos lumineux */}
              <div style={{ position:"absolute",top:-50,left:-30,width:180,height:180,borderRadius:"50%",background:`radial-gradient(circle,${mainColor}15 0%,transparent 70%)`,pointerEvents:"none" }}/>
              <div style={{ position:"absolute",bottom:-50,right:-30,width:180,height:180,borderRadius:"50%",background:`radial-gradient(circle,${mainColor2}12 0%,transparent 70%)`,pointerEvents:"none" }}/>
              {/* Stripe haute animée */}
              <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${mainColor2},${mainColor},${mainColor2})`,backgroundSize:"200% 100%",animation:"defisGlow 3s ease infinite" }}/>
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 38%,rgba(255,255,255,0.04) 50%,transparent 62%)",animation:"defisShine 7s ease infinite 1.5s",pointerEvents:"none" }}/>

              {/* Badge + label DÉFI ACCOMPLI */}
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:18,flexWrap:"wrap" }}>
                <div style={{ background:`linear-gradient(135deg,${mainColor},${mainColor2})`,borderRadius:8,padding:"4px 12px",display:"flex",alignItems:"center",gap:6,boxShadow:`0 0 18px ${mainColor}55`,flexShrink:0 }}>
                  {won ? <Trophy size={11} color="#fff"/> : <Check size={11} color="#fff"/>}
                  <span style={{ fontWeight:900,fontSize:11,color:"#fff",letterSpacing:.8 }}>DÉFI ACCOMPLI</span>
                </div>
                <span style={{ fontSize:11, color: won?"#86efac":"#94a3b8", fontWeight:700 }}>
                  {isSecond ? "Rivalité ×2" : "Rivalité hebdo"}
                </span>
              </div>

              {/* Icône hero */}
              <div style={{ textAlign:"center", marginBottom:14 }}>
                <div style={{ display:"inline-flex", width:84, height:84, borderRadius:"50%", background:`radial-gradient(circle,${mainColor}33,${mainColor}11)`, border:`3px solid ${mainColor}`, alignItems:"center", justifyContent:"center", boxShadow:`0 0 30px ${mainColor}66, inset 0 0 20px ${mainColor}33`, marginBottom:10 }}>
                  <span style={{ fontSize:42, filter:`drop-shadow(0 0 8px ${mainColor})` }}>{won ? "🏆" : "🤝"}</span>
                </div>
                <div style={{ fontSize:22, fontWeight:900,
                  background:`linear-gradient(135deg,${mainColor},${mainColor2})`,
                  WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                  textShadow:`0 0 20px ${mainColor}44`,
                  letterSpacing:.5,
                }}>
                  {won ? "VICTOIRE !" : "DÉFI JOUÉ"}
                </div>
                <div style={{ fontSize:13, color:"#cbd5e1", marginTop:4 }}>
                  {won ? `Tu as battu ${rival.pseudo}` : `Match joué contre ${rival.pseudo}`}
                </div>
              </div>

              {/* Récompense ou consolation */}
              {won && (
                <div style={{ background:`linear-gradient(135deg,${mainColor}22,${mainColor}08)`, border:`1px solid ${mainColor}55`, borderRadius:14, padding:"12px 16px", marginBottom:12, textAlign:"center", boxShadow:`0 0 16px ${mainColor}22` }}>
                  <div style={{ fontSize:10, fontWeight:800, color:"#86efac", letterSpacing:1.5, marginBottom:3 }}>RÉCOMPENSE</div>
                  <div style={{ fontSize:24, fontWeight:900, color:mainColor, lineHeight:1, textShadow:`0 0 14px ${mainColor}66` }}>+50 DRIX</div>
                  <div style={{ fontSize:11, color:"#86efac", marginTop:3 }}>Crédités sur ton compte 💎</div>
                </div>
              )}

              {/* Message vivement la semaine prochaine */}
              <div style={{ background:"linear-gradient(135deg,#0a0a14,#050510)", border:"1px solid #ffffff14", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:22, filter:"drop-shadow(0 0 6px #a78bfa66)" }}>⏳</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:800, color:"#a78bfa", letterSpacing:1.2, marginBottom:2 }}>PROCHAINE RIVALITÉ</div>
                  <div style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.4 }}>
                    Vivement la semaine prochaine ! 🔥
                  </div>
                  {rivaliteTimerStr && (
                    <div style={{ fontSize:11, color:"#64748b", marginTop:3 }}>Nouvelle rivalité dans {rivaliteTimerStr}</div>
                  )}
                </div>
              </div>
            </div>
          );
        };

        const renderBigRivalCard = (rival, isSecond = false) => {
          // Si déjà joué cette semaine → on affiche la carte 'défi accompli'
          const result = rivaliteResults[rival.id];
          if (result) {
            return renderDefiAccompli(rival, result, isSecond);
          }

          const { emoji:rEmoji, color:rColor } = getDrixTitre(rival.drix || 1000);
          const { emoji:myEmoji, color:myColor } = getDrixTitre(joueur.drix || 1000);
          const probMoi = Math.round(100 / (1 + Math.pow(10, ((rival.drix||1000) - (joueur.drix||1000)) / 400)));
          const timerIsUrgent = rivaliteTimerStr.includes("min") && !rivaliteTimerStr.includes("h");
          const timerIsSoon   = rivaliteTimerStr.includes("h")   && !rivaliteTimerStr.includes("j");
          const timerColor    = timerIsUrgent ? "#ef4444" : timerIsSoon ? "#f97316" : "#64748b";
          return (
            <div key={rival.id}
              onClick={()=>setShowRivaliteHebdo(true)}
              style={{
                position:"relative",overflow:"hidden",cursor:"pointer",
                background:"linear-gradient(135deg,#0d0010,#0a0018,#100010)",
                border:"2px solid rgba(168,85,247,0.35)",
                borderRadius:22,padding:"22px 18px",marginBottom:12,
                boxShadow:"0 8px 40px rgba(168,85,247,0.1)",
                transition:"border-color .15s,box-shadow .15s",
                animation:"defisIn .35s ease both",
              }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor="rgba(168,85,247,0.7)"; e.currentTarget.style.boxShadow="0 8px 50px rgba(168,85,247,0.2)"; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor="rgba(168,85,247,0.35)"; e.currentTarget.style.boxShadow="0 8px 40px rgba(168,85,247,0.1)"; }}
            >
              <div style={{ position:"absolute",top:-50,left:-30,width:180,height:180,borderRadius:"50%",background:`radial-gradient(circle,${myColor}12 0%,transparent 70%)`,pointerEvents:"none" }}/>
              <div style={{ position:"absolute",top:-50,right:-30,width:180,height:180,borderRadius:"50%",background:`radial-gradient(circle,${rColor}12 0%,transparent 70%)`,pointerEvents:"none" }}/>
              <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#7c3aed,#a855f7,#f97316,#a855f7,#7c3aed)",backgroundSize:"300% 100%",animation:"defisGlow 3s ease infinite" }}/>
              <div style={{ position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 38%,rgba(255,255,255,0.04) 50%,transparent 62%)",animation:"defisShine 7s ease infinite 1.5s",pointerEvents:"none" }}/>

              {/* Badge + Timer */}
              <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:18,flexWrap:"wrap" }}>
                <div style={{ background:"linear-gradient(135deg,#a855f7,#7c3aed)",borderRadius:8,padding:"4px 12px",display:"flex",alignItems:"center",gap:6,boxShadow:"0 0 18px rgba(168,85,247,0.4)",flexShrink:0 }}>
                  <Swords size={11} color="#fff"/>
                  <span style={{ fontWeight:900,fontSize:11,color:"#fff",letterSpacing:.8 }}>{isSecond ? "RIVALITÉ ×2" : "RIVALITÉ HEBDO"}</span>
                </div>
                {rivaliteTimerStr && (
                  <div style={{
                    display:"flex",alignItems:"center",gap:5,
                    background: timerIsUrgent?"#ef444414": timerIsSoon?"#f9731614":"#ffffff0a",
                    border:`1px solid ${timerIsUrgent?"#ef444440":timerIsSoon?"#f9731640":"#ffffff14"}`,
                    borderRadius:20,padding:"3px 10px",
                    animation: timerIsUrgent ? "defisTimerBlink 2s ease infinite" : "none",
                  }}>
                    <span style={{ fontSize:11 }}>⏳</span>
                    <span style={{ fontSize:11,fontWeight:700,color:timerColor }}>{rivaliteTimerStr} restants</span>
                  </div>
                )}
              </div>

              {/* Face à face */}
              <div style={{ display:"flex",alignItems:"center",marginBottom:20 }}>
                <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
                  <div style={{ position:"relative" }}>
                    <div style={{ width:60,height:60,borderRadius:"50%",background:`${myColor}20`,border:`3px solid ${myColor}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",boxShadow:`0 0 22px ${myColor}40` }}>
                      {joueur.photo ? <img src={joueur.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span style={{ fontSize:24 }}>{myEmoji}</span>}
                    </div>
                    <div style={{ position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%)",background:myColor,borderRadius:6,padding:"1px 6px",fontSize:8,fontWeight:900,color:"#000",whiteSpace:"nowrap" }}>MOI</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontWeight:800,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:82 }}>{joueur.pseudo}</div>
                    <div style={{ fontSize:17,fontWeight:900,color:"#f97316",lineHeight:1.1 }}>{joueur.drix||1000}</div>
                    <div style={{ fontSize:9,color:C.muted }}>DRIX</div>
                  </div>
                </div>
                <div style={{ textAlign:"center",padding:"0 10px",flexShrink:0 }}>
                  <div style={{ width:46,height:46,borderRadius:"50%",background:"linear-gradient(135deg,#a855f7,#f97316)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px",boxShadow:"0 0 22px rgba(168,85,247,0.4)",animation:"defisPulse 2.5s ease infinite" }}>
                    <Swords size={18} color="#fff"/>
                  </div>
                  <div style={{ fontSize:11,fontWeight:900,color:"#a855f7",letterSpacing:3 }}>VS</div>
                </div>
                <div style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:8 }}>
                  <div style={{ position:"relative" }}>
                    <div style={{ width:60,height:60,borderRadius:"50%",background:`${rColor}20`,border:`3px solid ${rColor}`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",boxShadow:`0 0 22px ${rColor}40` }}>
                      {rival.photo ? <img src={rival.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span style={{ fontSize:24 }}>{rEmoji}</span>}
                    </div>
                    <div style={{ position:"absolute",bottom:-5,left:"50%",transform:"translateX(-50%)",background:rColor,borderRadius:6,padding:"1px 6px",fontSize:8,fontWeight:900,color:"#000",whiteSpace:"nowrap" }}>RIVAL</div>
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontWeight:800,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:82 }}>{rival.pseudo}</div>
                    <div style={{ fontSize:17,fontWeight:900,color:rColor,lineHeight:1.1 }}>{rival.drix||1000}</div>
                    <div style={{ fontSize:9,color:C.muted }}>DRIX</div>
                  </div>
                </div>
              </div>

              {/* Récompenses */}
              <div style={{ display:"flex",gap:8,marginBottom:16 }}>
                <div style={{ flex:1,background:"#22c55e14",border:"1px solid #22c55e30",borderRadius:12,padding:"11px 8px",textAlign:"center" }}>
                  <div style={{ fontSize:10,color:"#4ade80",fontWeight:700,marginBottom:4 }}>🏆 VICTOIRE</div>
                  <div style={{ fontSize:26,fontWeight:900,color:"#22c55e",lineHeight:1 }}>+50</div>
                  <div style={{ fontSize:9,color:"#4ade80",marginTop:2 }}>DRIX</div>
                </div>
                <div style={{ flex:1,background:"#ffffff06",border:"1px solid #ffffff0d",borderRadius:12,padding:"11px 8px",textAlign:"center" }}>
                  <div style={{ fontSize:10,color:"#475569",fontWeight:700,marginBottom:4 }}>❌ DÉFAITE</div>
                  <div style={{ fontSize:26,fontWeight:900,color:"#334155",lineHeight:1 }}>0</div>
                  <div style={{ fontSize:9,color:"#475569",marginTop:2 }}>perte</div>
                </div>
                <div style={{ flex:1.4,background:"rgba(168,85,247,0.07)",border:"1px solid rgba(168,85,247,0.18)",borderRadius:12,padding:"11px 8px",textAlign:"center" }}>
                  <div style={{ fontSize:10,color:"#d8b4fe",fontWeight:700,marginBottom:4 }}>⚡ CHANCES</div>
                  <div style={{ fontSize:26,fontWeight:900,color:"#a855f7",lineHeight:1 }}>{probMoi}%</div>
                  <div style={{ fontSize:9,color:"#d8b4fe",marginTop:2 }}>victoire</div>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={e=>{ e.stopPropagation(); setShowRivaliteHebdo(true); }}
                style={{
                  width:"100%",padding:"14px 0",border:"none",borderRadius:14,
                  background:"linear-gradient(135deg,#a855f7,#7c3aed)",
                  color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer",
                  boxShadow:"0 6px 28px rgba(168,85,247,0.38)",
                  display:"flex",alignItems:"center",justifyContent:"center",gap:8,
                  letterSpacing:.3,position:"relative",overflow:"hidden",
                  animation:"defisPulse 3s ease infinite",
                }}>
                <div style={{ position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.1) 50%,transparent 60%)",animation:"defisShine 5s ease infinite 2s",pointerEvents:"none" }}/>
                <Swords size={15}/> Voir la rivalité
              </button>
            </div>
          );
        };
        return (
          <div style={{ marginBottom:28 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
              <div style={{ flex:1,height:1,background:"linear-gradient(90deg,transparent,rgba(168,85,247,0.25))" }}/>
              <div style={{ display:"flex",alignItems:"center",gap:7,padding:"4px 13px",background:"rgba(168,85,247,0.08)",border:"1px solid rgba(168,85,247,0.2)",borderRadius:20 }}>
                <Swords size={11} color="#a855f7"/>
                <span style={{ fontSize:11,fontWeight:800,color:"#a855f7",letterSpacing:.8 }}>RIVALITÉ HEBDO</span>
              </div>
              <div style={{ flex:1,height:1,background:"linear-gradient(90deg,rgba(168,85,247,0.25),transparent)" }}/>
            </div>
            {renderBigRivalCard(rivaliteHebdo.rival)}
            {rivaliteHebdo.rival2 && renderBigRivalCard(rivaliteHebdo.rival2, true)}
          </div>
        );
      })()}

      {/* ── Section divider Défier un ami ── */}
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
        <div style={{ flex:1,height:1,background:`linear-gradient(90deg,transparent,${C.border})` }}/>
        <div style={{ display:"flex",alignItems:"center",gap:7,padding:"4px 13px",background:C.card,border:`1px solid ${C.border}`,borderRadius:20 }}>
          <Users size={11} color={C.accent}/>
          <span style={{ fontSize:11,fontWeight:800,color:C.accent,letterSpacing:.8 }}>DÉFIER UN AMI</span>
        </div>
        <div style={{ flex:1,height:1,background:`linear-gradient(90deg,${C.border},transparent)` }}/>
      </div>

      {(() => {
        const amisIds = new Set(amis.map(a => a.joueur_id===joueur.id ? a.ami_id : a.joueur_id));
        const amisTries = [...amis].sort((a, b) => {
          const pa = (a.joueur_id===joueur.id ? a.ami_pseudo : a.joueur_pseudo)||"";
          const pb = (b.joueur_id===joueur.id ? b.ami_pseudo : b.joueur_pseudo)||"";
          return pa.localeCompare(pb, "fr", { sensitivity:"base" });
        });
        const q = searchDefi.trim().toLowerCase();
        // Exclure le(s) rival(aux) de la liste amis (ils ont leur propre bloc)
        const rivalIds = new Set([rivaliteHebdo?.rival?.id, rivaliteHebdo?.rival2?.id].filter(Boolean));
        const amisSansCible = amisTries.filter(a => {
          const aId = a.joueur_id===joueur.id ? a.ami_id : a.joueur_id;
          return !rivalIds.has(aId);
        });
        const amisFiltres = q ? amisSansCible.filter(a => {
          const pseudo = (a.joueur_id===joueur.id ? a.ami_pseudo : a.joueur_pseudo)||"";
          return pseudo.toLowerCase().includes(q);
        }) : amisSansCible;

        return (
          <>
            {/* Barre de recherche premium */}
            <div style={{ display:"flex",alignItems:"center",gap:10,background:"linear-gradient(135deg,#111118,#13131f)",border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 16px",marginBottom:14,boxShadow:"0 2px 20px rgba(0,0,0,0.25)",transition:"border-color .15s" }}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#f9731655"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}
            >
              <Search size={16} color={C.muted} style={{ flexShrink:0 }}/>
              <input
                value={searchDefi}
                onChange={e=>{ setSearchDefi(e.target.value); setSearchGlobal([]); setSearchLoading(false); }}
                placeholder="Rechercher un joueur…"
                style={{ flex:1,background:"transparent",border:"none",color:C.text,fontSize:16,outline:"none",minWidth:0 }}
              />
              {searchDefi && (
                <button onClick={()=>{ setSearchDefi(""); setSearchGlobal([]); }} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",padding:0,display:"flex" }}><X size={14}/></button>
              )}
            </div>

            {/* ── Résultats amis ── */}
            {(amis.length === 0 && !q) ? (
              <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"32px 24px",textAlign:"center",marginBottom:16 }}>
                <div style={{ fontSize:32,marginBottom:10 }}>🎯</div>
                <p style={{ color:C.muted,fontSize:14,marginBottom:8,fontWeight:600 }}>Aucun ami sur DartPoint</p>
                <p style={{ color:C.muted,fontSize:12 }}>Recherche un joueur ci-dessus pour l'ajouter !</p>
              </div>
            ) : amisFiltres.length > 0 ? (
              <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:16 }}>
                {q && <div style={{ fontSize:11,color:C.muted,fontWeight:700,letterSpacing:.6,marginBottom:2 }}>AMIS CORRESPONDANTS</div>}
                {amisFiltres.map(a => {
                  const amiId = a.joueur_id===joueur.id?a.ami_id:a.joueur_id;
                  const amiPseudo = a.joueur_id===joueur.id?a.ami_pseudo:a.joueur_pseudo;
                  const profil = amisData[amiId];
                  const { emoji:amiEmoji, color:amiColor, titre:amiTitre } = getDrixTitre(profil?.drix||1000);
                  const hisDrix = profil?.drix||1000;
                  return (
                    <div key={amiId} onClick={()=>ouvrirModal(a)}
                      style={{
                        background:`linear-gradient(135deg,${C.card},#111118)`,
                        border:`2px solid ${C.border}`,
                        borderRadius:16,padding:"14px 16px",cursor:"pointer",
                        display:"flex",alignItems:"center",gap:14,
                        transition:"all .15s",position:"relative",overflow:"hidden",
                      }}
                      onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.accent; e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow="0 4px 20px rgba(249,115,22,0.12)"; }}
                      onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}
                    >
                      <div style={{ position:"absolute",left:0,top:8,bottom:8,width:3,background:`linear-gradient(180deg,${amiColor},${amiColor}44)`,borderRadius:2 }}/>
                      <div style={{ width:52,height:52,borderRadius:"50%",background:`${amiColor}22`,border:`2px solid ${amiColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,overflow:"hidden" }}>
                        {profil?.photo ? <img src={profil.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span>{amiEmoji}</span>}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontWeight:800,fontSize:15,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{amiPseudo}</div>
                        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                          <span style={{ fontSize:11,color:amiColor,fontWeight:700 }}>{amiEmoji} {amiTitre}</span>
                          <span style={{ fontSize:10,color:C.muted }}>·</span>
                          <span style={{ fontSize:11,color:"#f97316",fontWeight:800 }}>{hisDrix} DRIX</span>
                        </div>
                      </div>
                      <div style={{ width:38,height:38,borderRadius:11,background:"#f9731614",border:"1px solid #f9731628",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                        <Swords size={16} color={C.accent}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : q ? (
              <div style={{ fontSize:12,color:C.muted,textAlign:"center",padding:"8px 0 4px",marginBottom:8 }}>Aucun ami pour « {searchDefi} »</div>
            ) : null}

            {/* ── Résultats globaux (non-amis) ── */}
            {searchGlobal.length > 0 && (() => {
              const nonAmis = searchGlobal.filter(p => p.id !== joueur.id && !amisIds.has(p.id));
              if (nonAmis.length === 0) return null;
              return (
                <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:16 }}>
                  <div style={{ fontSize:11,color:C.muted,fontWeight:700,letterSpacing:.6,marginBottom:2 }}>AUTRES JOUEURS</div>
                  {nonAmis.map(p => {
                    const { emoji:pEmoji, color:pColor } = getDrixTitre(p.drix||1000);
                    return (
                      <div key={p.id} onClick={()=>setPage("profil-joueur-"+p.id)}
                        style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"14px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,transition:"all .12s" }}
                        onMouseEnter={e=>e.currentTarget.style.borderColor=C.blue} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                        <div style={{ width:52,height:52,borderRadius:"50%",background:`${pColor}22`,border:`2px solid ${pColor}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,overflow:"hidden" }}>
                          {p.photo ? <img src={p.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span>{pEmoji}</span>}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:800,fontSize:15,marginBottom:3 }}>{p.pseudo}</div>
                          <div style={{ fontSize:11,color:pColor,fontWeight:700 }}>{pEmoji} {p.drix||1000} DRIX</div>
                        </div>
                        <div style={{ textAlign:"right",flexShrink:0,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2 }}>
                          <ChevronRight size={16} color={C.blue}/>
                          <div style={{ fontSize:11,color:C.muted }}>+ demande d'ami</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {searchLoading && <div style={{ textAlign:"center",color:C.muted,fontSize:13,padding:"8px 0" }}>Recherche…</div>}
          </>
        );
      })()}
      </>}

      {/* ── POP-UP RIVALITÉ HEBDO PREMIUM ── */}
      {showRivaliteHebdo && rivaliteHebdo && (() => {
        const rival = rivaliteHebdo.rival;
        const { color:rColor, emoji:rEmoji, titre:rTitre } = getDrixTitre(rival.drix || 1000);
        const { color:myColor, emoji:myEmoji, titre:myTitre } = getDrixTitre(joueur.drix || 1000);
        const myDrix = joueur.drix || 1000;
        const rvDrix = rival.drix || 1000;

        // Probabilité de victoire (ELO)
        const probMoi   = Math.round(100 / (1 + Math.pow(10, (rvDrix - myDrix) / 400)));
        const probRival = 100 - probMoi;

        // Analyse du duel
        const getAnalyse = () => {
          if (probMoi >= 70) return { label:"Tu es favori", emoji:"🔥", color:"#22c55e", sub:"Confirme ta domination" };
          if (probMoi >= 55) return { label:"Légèrement favori", emoji:"💪", color:"#86efac", sub:"Reste concentré" };
          if (probMoi >= 45) return { label:"Duel équilibré", emoji:"⚖️", color:"#f59e0b", sub:"Tout peut arriver" };
          if (probMoi >= 30) return { label:"Adversaire favori", emoji:"⚠️", color:"#f97316", sub:"Crée la surprise" };
          return { label:"Rival dangereux", emoji:"💀", color:"#ef4444", sub:"Montre ce que tu vaux" };
        };
        const analyse = getAnalyse();

        // Semaine label
        const weekLabel = (() => {
          const now = new Date();
          const lundi = new Date(now);
          lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7));
          const dim = new Date(lundi); dim.setDate(lundi.getDate() + 6);
          return `${lundi.getDate()}/${lundi.getMonth()+1} → ${dim.getDate()}/${dim.getMonth()+1}`;
        })();

        // Historique
        const hist   = rivaliteHistory || [];
        const myWins = hist.filter(d => d.gagnant_id === joueur.id).length;
        const rvWins = hist.filter(d => d.gagnant_id === rival.id).length;
        const lastMatch = hist[0];

        // Ouvrir modal défi
        const ouvrirRivalPopup = () => {
          fermerRivaliteHebdo();
          if (!amisData[rival.id]) setAmisData(prev => ({ ...prev, [rival.id]: rival }));
          const amiRecord = amis.find(a =>
            (a.joueur_id === joueur.id && a.ami_id    === rival.id) ||
            (a.ami_id    === joueur.id && a.joueur_id === rival.id)
          );
          if (amiRecord) { ouvrirModal(amiRecord); return; }
          setModalAmi({ amiId: rival.id, amiPseudo: rival.pseudo, profil: { ...rival } });
          setModalData(null); setModalLoading(true);
          setDefiForm({ mode:"501", manches:1, type:"classe" });
          Promise.all([
            sb(`duels?or=(challenger_id.eq.${rival.id},defie_id.eq.${rival.id})&order=date.desc&select=*`).catch(()=>[]),
            sb(`joueurs?order=drix.desc&select=id,drix`).catch(()=>[]),
          ]).then(([duelsAdv, allJ]) => {
            setModalData({ duelsAdv: duelsAdv||[], allJoueurs: allJ||[] });
            setModalLoading(false);
          }).catch(() => setModalLoading(false));
        };

        // Couleur timer selon urgence
        const timerIsUrgent = rivaliteTimerStr.includes("min") && !rivaliteTimerStr.includes("h");
        const timerIsSoon   = rivaliteTimerStr.includes("h") && !rivaliteTimerStr.includes("j");
        const timerColor = timerIsUrgent ? "#ef4444" : timerIsSoon ? "#f97316" : "#94a3b8";
        const timerLabel = rivaliteTimerStr ? `${rivaliteTimerStr} restants` : "Calcul…";

        return (
          <div onClick={e=>{ if(e.target===e.currentTarget) fermerRivaliteHebdo(); }}
            style={{ position:"fixed",inset:0,zIndex:1900,background:"rgba(0,0,0,0.95)",backdropFilter:"blur(16px)",display:"flex",alignItems:"flex-end",justifyContent:"center" }}>

            <style>{`
              @keyframes rivalGlow { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
              @keyframes rivalPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.88;transform:scale(1.015)} }
              @keyframes rivalShine { 0%{transform:translateX(-120%) skewX(-12deg)} 100%{transform:translateX(320%) skewX(-12deg)} }
              @keyframes rivalIn { from{transform:translateY(48px);opacity:0} to{transform:translateY(0);opacity:1} }
              @keyframes rivalTimerBlink { 0%,100%{opacity:1} 50%{opacity:.55} }
            `}</style>

            {/* Sheet */}
            <div style={{
              width:"100%",maxWidth:520,
              background:"linear-gradient(180deg,#0d0010 0%,#080008 100%)",
              borderRadius:"28px 28px 0 0",
              overflow:"hidden",
              boxShadow:"0 -12px 100px rgba(168,85,247,0.35),0 -4px 40px rgba(249,115,22,0.12)",
              border:"1px solid rgba(168,85,247,0.22)",
              borderBottom:"none",
              animation:"rivalIn .4s cubic-bezier(.34,1.56,.64,1)"
            }}>

              {/* Barre top animée */}
              <div style={{ height:3,background:"linear-gradient(90deg,#7c3aed,#a855f7,#f97316,#a855f7,#7c3aed)",backgroundSize:"300% 100%",animation:"rivalGlow 3s ease infinite" }}/>

              {/* Corps scrollable */}
              <div style={{ overflowY:"auto",maxHeight:"88vh",padding:"22px 20px 40px" }}>

                {/* ── 1. HEADER ── */}
                <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20 }}>
                  <div>
                    <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:7 }}>
                      <div style={{
                        background:"linear-gradient(135deg,#a855f7,#7c3aed)",
                        borderRadius:10,padding:"7px 14px",
                        display:"flex",alignItems:"center",gap:7,
                        boxShadow:"0 0 24px rgba(168,85,247,0.5)",
                        animation:"rivalPulse 3s ease infinite"
                      }}>
                        <Swords size={14} color="#fff"/>
                        <span style={{ fontWeight:900,fontSize:13,color:"#fff",letterSpacing:.8 }}>RIVALITÉ HEBDO</span>
                      </div>
                      <span style={{ fontSize:11,color:"#64748b",background:"#ffffff0d",padding:"3px 8px",borderRadius:6 }}>{weekLabel}</span>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:6,animation: (timerIsUrgent||timerIsSoon) ? "rivalTimerBlink 2.5s ease infinite":"none" }}>
                      <span style={{ fontSize:12 }}>⏳</span>
                      <span style={{ fontSize:12,fontWeight:700,color:timerColor }}>{timerLabel}</span>
                    </div>
                  </div>
                  <button onClick={fermerRivaliteHebdo} style={{ background:"#ffffff0d",border:"none",borderRadius:10,width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#94a3b8",flexShrink:0,marginTop:2 }}>
                    <X size={16}/>
                  </button>
                </div>

                {/* ── 2. FACE À FACE — composant animé (shake + count-up DRIX) ── */}
                <FaceAFaceCard
                  joueur={joueur}
                  rival={rival}
                  myColor={myColor} rColor={rColor}
                  myEmoji={myEmoji} rEmoji={rEmoji}
                  myTitre={myTitre} rTitre={rTitre}
                  myDrix={myDrix} rvDrix={rvDrix}
                  probMoi={probMoi} probRival={probRival}
                  analyse={analyse}
                />

                {/* ── 3. RÉCOMPENSE PREMIUM ── */}
                <div style={{ position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#0a0010,#120a00)",border:"1px solid rgba(168,85,247,0.25)",borderRadius:22,padding:"20px 16px",marginBottom:12,boxShadow:"0 0 50px rgba(168,85,247,0.08) inset" }}>
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.04) 50%,transparent 60%)",animation:"rivalShine 5s ease infinite",pointerEvents:"none" }}/>
                  <div style={{ fontSize:9,color:"#64748b",fontWeight:700,letterSpacing:2,textAlign:"center",marginBottom:14 }}>ENJEUX DU MATCH</div>
                  <div style={{ display:"flex",gap:0,alignItems:"stretch" }}>
                    {/* Victoire */}
                    <div style={{ flex:1,textAlign:"center",padding:"4px 8px" }}>
                      <div style={{ fontSize:11,color:"#4ade80",fontWeight:700,marginBottom:10 }}>🏆 SI VICTOIRE</div>
                      <div style={{ fontSize:38,fontWeight:900,background:"linear-gradient(135deg,#22c55e,#86efac)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1,marginBottom:4 }}>+50</div>
                      <div style={{ fontSize:13,fontWeight:800,color:"#22c55e",marginBottom:6 }}>DRIX GARANTI</div>
                      <div style={{ fontSize:9,color:"#4ade80",background:"#22c55e14",padding:"4px 8px",borderRadius:8,border:"1px solid #22c55e22" }}>+ bonus performance</div>
                    </div>
                    {/* Séparateur */}
                    <div style={{ width:1,background:"linear-gradient(180deg,transparent,rgba(255,255,255,0.08),transparent)",flexShrink:0,margin:"0 4px" }}/>
                    {/* Défaite */}
                    <div style={{ flex:1,textAlign:"center",padding:"4px 8px" }}>
                      <div style={{ fontSize:11,color:"#475569",fontWeight:700,marginBottom:10 }}>❌ SI DÉFAITE</div>
                      <div style={{ fontSize:38,fontWeight:900,color:"#334155",lineHeight:1,marginBottom:4 }}>0</div>
                      <div style={{ fontSize:13,fontWeight:800,color:"#475569",marginBottom:6 }}>AUCUNE PERTE</div>
                      <div style={{ fontSize:9,color:"#64748b",background:"#ffffff06",padding:"4px 8px",borderRadius:8,border:"1px solid #ffffff10" }}>aucune pénalité</div>
                    </div>
                  </div>
                  <div style={{ marginTop:14,textAlign:"center",padding:"8px 12px",background:"rgba(168,85,247,0.08)",borderRadius:12,border:"1px solid rgba(168,85,247,0.18)" }}>
                    <span style={{ fontSize:11,color:"#d8b4fe",fontWeight:600 }}>⚡ Aucun risque — tente ta chance !</span>
                  </div>
                </div>

                {/* ── 4. HISTORIQUE ── */}
                {rivaliteHistory !== null && (
                  <div style={{ background:"#ffffff04",border:"1px solid #ffffff0f",borderRadius:18,padding:"14px 16px",marginBottom:12 }}>
                    <div style={{ fontSize:9,color:"#475569",fontWeight:700,letterSpacing:2,marginBottom:12 }}>📜 HISTORIQUE DES AFFRONTEMENTS</div>
                    {hist.length > 0 ? (<>
                      <div style={{ display:"flex",alignItems:"center",marginBottom:12 }}>
                        <div style={{ flex:1,textAlign:"center" }}>
                          <div style={{ fontSize:26,fontWeight:900,color:"#22c55e",lineHeight:1 }}>{myWins}</div>
                          <div style={{ fontSize:9,color:"#64748b",marginTop:4,fontWeight:600 }}>{joueur.pseudo.slice(0,10).toUpperCase()}</div>
                        </div>
                        <div style={{ padding:"0 12px" }}>
                          <div style={{ fontSize:16,color:"#334155",fontWeight:900 }}>—</div>
                        </div>
                        <div style={{ flex:1,textAlign:"center" }}>
                          <div style={{ fontSize:26,fontWeight:900,color:rColor,lineHeight:1 }}>{rvWins}</div>
                          <div style={{ fontSize:9,color:"#64748b",marginTop:4,fontWeight:600 }}>{rival.pseudo.slice(0,10).toUpperCase()}</div>
                        </div>
                      </div>
                      {lastMatch && (
                        <div style={{ textAlign:"center",fontSize:11,color:"#94a3b8",background:"#ffffff07",borderRadius:8,padding:"6px 12px",border:"1px solid #ffffff0a" }}>
                          Dernier match : <strong style={{ color: lastMatch.gagnant_id === joueur.id ? "#22c55e" : rColor }}>
                            {lastMatch.gagnant_id === joueur.id ? joueur.pseudo : rival.pseudo} gagne
                          </strong>
                        </div>
                      )}
                    </>) : (
                      <div style={{ textAlign:"center",padding:"10px 0" }}>
                        <div style={{ fontSize:22,marginBottom:6 }}>🎯</div>
                        <div style={{ fontSize:12,color:"#64748b",fontWeight:600 }}>Premier affrontement</div>
                        <div style={{ fontSize:11,color:"#334155",marginTop:2 }}>Écris l'histoire !</div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── 5. RÈGLES ── */}
                <div style={{ background:"rgba(168,85,247,0.05)",border:"1px solid rgba(168,85,247,0.14)",borderRadius:18,padding:"14px 16px",marginBottom:20 }}>
                  <div style={{ fontSize:9,color:"#64748b",fontWeight:700,letterSpacing:2,marginBottom:10 }}>📋 RÈGLES HEBDO</div>
                  {[
                    { icon:"⚔️", text:"Les rivalités sont générées chaque lundi parmi les membres de ton association." },
                    { icon:"🏆", text:"Remporte le duel avant dimanche minuit pour gagner tes +50 DRIX." },
                    { icon:"❌", text:"Aucune perte de DRIX en cas de défaite — tente ta chance !" },
                  ].map((r,i) => (
                    <div key={i} style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:i<2?8:0 }}>
                      <span style={{ fontSize:13,flexShrink:0,marginTop:1 }}>{r.icon}</span>
                      <span style={{ fontSize:12,color:"#cbd5e1",lineHeight:1.55 }}>{r.text}</span>
                    </div>
                  ))}
                </div>

                {/* ── 6. BOUTONS ── */}
                <div style={{ display:"flex",gap:10 }}>
                  <button onClick={()=>{ fermerRivaliteHebdo(); setPage("profil-joueur-"+rival.id); }}
                    style={{ flex:1,background:"#ffffff0a",border:"1px solid #ffffff12",color:"#e2e8f0",borderRadius:14,padding:"14px 0",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:7,minHeight:52 }}>
                    <Eye size={14}/> Voir profil
                  </button>
                  <button onClick={ouvrirRivalPopup}
                    style={{ flex:2,position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#a855f7,#7c3aed)",border:"1px solid rgba(168,85,247,0.45)",color:"#fff",borderRadius:14,padding:"14px 0",fontSize:14,fontWeight:900,cursor:"pointer",boxShadow:"0 6px 32px rgba(168,85,247,0.45)",display:"flex",alignItems:"center",justifyContent:"center",gap:8,minHeight:52,letterSpacing:.4,animation:"rivalPulse 3s ease infinite" }}>
                    <div style={{ position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.14) 50%,transparent 60%)",animation:"rivalShine 4s ease infinite",pointerEvents:"none" }}/>
                    <Swords size={16}/> Défier mon rival
                  </button>
                </div>

                <p style={{ textAlign:"center",color:"#334155",fontSize:11,marginTop:14,lineHeight:1.5 }}>
                  Paires tirées au sort le lundi · Se réinitialise chaque semaine
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── MODAL DÉFI PREMIUM ── */}
      {modalAmi && (
        <div onClick={e=>{if(e.target===e.currentTarget)setModalAmi(null)}} style={{ position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(6px)",overflowY:"auto" }}>
          <div style={{ maxWidth:480,margin:"0 auto",paddingBottom:40 }}>
            {/* EN-TÊTE */}
            <div style={{ position:"sticky",top:0,zIndex:10,background:"#0a0a0a",padding:"16px 20px",borderBottom:`1px solid #222`,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
              <div>
                <div style={{ fontWeight:900,fontSize:18,background:"linear-gradient(90deg,#f97316,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",display:"flex",alignItems:"center",gap:7 }}><Swords size={17} color="#f97316"/>Préparer le défi</div>
                <div style={{ color:C.muted,fontSize:12,marginTop:2 }}>Analyse complète avant de défier</div>
              </div>
              <button onClick={()=>setModalAmi(null)} style={{ background:"#222",border:"none",color:"#fff",borderRadius:8,width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}><X size={16}/></button>
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
                    <div onClick={()=>{ setModalAmi(null); setPage("profil-joueur-"+modalAmi.amiId); }} style={{ width:64,height:64,borderRadius:"50%",background:advColor+"33",border:`3px solid ${advColor}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,overflow:"hidden",cursor:"pointer" }}>
                      {modalAmi.profil?.photo ? <img src={modalAmi.profil.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span>{advEmoji}</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div onClick={()=>{ setModalAmi(null); setPage("profil-joueur-"+modalAmi.amiId); }} style={{ fontWeight:900,fontSize:20,cursor:"pointer" }}>{modalAmi.amiPseudo}</div>
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
            {(() => {
              const isRival = rivaliteHebdo?.rival?.id === modalAmi.amiId
                           || rivaliteHebdo?.rival2?.id === modalAmi.amiId;
              const gainAffiche  = isRival ? 50          : (ms.gainElo||"?");
              const perteAffiche = isRival ? 0           : (ms.perteElo||"?");
              return (
                <div style={{ margin:"12px 16px 0",background:C.card,border:`1px solid ${isRival?"#a855f7":C.border}`,borderRadius:16,padding:16 }}>
                  {isRival && (
                    <div style={{ display:"flex",alignItems:"center",gap:6,background:"#a855f718",border:"1px solid #a855f744",borderRadius:8,padding:"6px 10px",marginBottom:10 }}>
                      <Swords size={12} color="#a855f7"/>
                      <span style={{ fontSize:11,fontWeight:700,color:"#a855f7" }}>RIVALITÉ HEBDO — +50 DRIX si victoire, 0 si défaite</span>
                    </div>
                  )}
                  <div style={{ fontSize:11,color:C.muted,marginBottom:12,fontWeight:700,letterSpacing:1 }}>COMPARAISON DRIX</div>
                  <div style={{ display:"flex",alignItems:"center",gap:8 }}>
                    <div style={{ flex:1,textAlign:"center",background:"#111",borderRadius:12,padding:"12px 8px" }}>
                      <div style={{ fontSize:10,color:C.muted,marginBottom:4 }}>TOI</div>
                      <div style={{ fontWeight:900,fontSize:24,color:"#f97316" }}>{ms.myDrix}</div>
                      <div style={{ fontSize:10,color:C.muted }}>DRIX</div>
                    </div>
                    <div style={{ textAlign:"center",padding:"0 4px" }}>
                      <Swords size={20} color={isRival?"#a855f7":C.accent}/>
                      <div style={{ fontSize:10,color:C.muted }}>VS</div>
                    </div>
                    <div style={{ flex:1,textAlign:"center",background:"#111",borderRadius:12,padding:"12px 8px" }}>
                      <div style={{ fontSize:10,color:C.muted,marginBottom:4 }}>{modalAmi.amiPseudo.toUpperCase().slice(0,10)}</div>
                      <div style={{ fontWeight:900,fontSize:24,color:getDrixTitre(ms.hisDrix||1000).color }}>{ms.hisDrix}</div>
                      <div style={{ fontSize:10,color:C.muted }}>DRIX</div>
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:8,marginTop:10 }}>
                    <div style={{ flex:1,background:"#14532d",borderRadius:10,padding:"10px 8px",textAlign:"center",position:"relative" }}>
                      {isRival && <div style={{ position:"absolute",top:-6,right:6,background:"#a855f7",color:"#fff",fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:20 }}>+50</div>}
                      <div style={{ fontSize:10,color:"#4ade80",marginBottom:2 }}>SI VICTOIRE</div>
                      <div style={{ fontWeight:900,fontSize:18,color:"#22c55e" }}>+{gainAffiche}</div>
                      <div style={{ fontSize:9,color:"#4ade80" }}>DRIX</div>
                    </div>
                    <div style={{ flex:1,background:"#1e1e2e",borderRadius:10,padding:"10px 8px",textAlign:"center",position:"relative",border:isRival?"1px solid #a855f744":"none" }}>
                      {isRival && <div style={{ position:"absolute",top:-6,right:6,background:"#6b7280",color:"#fff",fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:20 }}>0</div>}
                      <div style={{ fontSize:10,color:isRival?"#d8b4fe":"#fca5a5",marginBottom:2 }}>SI DÉFAITE</div>
                      <div style={{ fontWeight:900,fontSize:18,color:isRival?"#a855f7":"#ef4444" }}>{isRival ? "0" : `-${perteAffiche}`}</div>
                      <div style={{ fontSize:9,color:isRival?"#d8b4fe":"#fca5a5" }}>DRIX</div>
                    </div>
                  </div>
                  {isRival && (
                    <div style={{ marginTop:8,textAlign:"center",fontSize:10,color:"#a855f7" }}>
                      Bonus performance conservés des deux côtés
                    </div>
                  )}
                </div>
              );
            })()}

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

// ── REPLAY CONFIG MODAL ───────────────────────────────────────────────────────
// Modal partagée pour reconfigurer une partie avant de la rejouer
const ReplayConfigModal = ({ title, players, form, setForm, onLancer, onClose, loading=false, showType=true }) => {
  const CX = { bg:"#0a0a0f", card:"#13131f", border:"#1e1e2e", text:"#e2e8f0", muted:"#64748b", accent:"#f97316" };
  const Pill = ({ options, value, onChange, colorActive="#f97316" }) => (
    <div style={{ display:"flex", gap:8 }}>
      {options.map(o => (
        <div key={o.v} onClick={() => onChange(o.v)} style={{
          flex:1, padding:"10px 0", textAlign:"center", borderRadius:10, cursor:"pointer",
          fontWeight:800, fontSize:14,
          background: value===o.v ? colorActive : "#0a0a14",
          color: value===o.v ? "#fff" : CX.muted,
          border:`2px solid ${value===o.v ? colorActive : CX.border}`,
          transition:"all .15s",
        }}>{o.l}</div>
      ))}
    </div>
  );
  return (
    <div style={{ position:"fixed",inset:0,zIndex:3000,background:"#000000dd",display:"flex",alignItems:"flex-end",justifyContent:"center" }}
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <style>{`@keyframes slideUpReplay{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ width:"100%",maxWidth:520,background:CX.bg,borderRadius:"20px 20px 0 0",padding:"0 0 32px",boxShadow:"0 -8px 40px #000a",animation:"slideUpReplay .22s ease" }}>
        {/* Handle */}
        <div style={{ padding:"14px 20px 0" }}>
          <div style={{ width:40,height:4,borderRadius:2,background:"#2a2a3e",margin:"0 auto 16px" }}/>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <div style={{ fontWeight:900,fontSize:18,color:CX.text }}>🔁 {title}</div>
            <button onClick={onClose} style={{ background:"#2a2a2a",border:"none",color:CX.text,borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:15 }}>✕</button>
          </div>
        </div>
        <div style={{ padding:"0 20px" }}>
          {/* Joueurs (non modifiables) */}
          <div style={{ background:CX.card,borderRadius:12,padding:"12px 16px",marginBottom:16,border:`1px solid ${CX.border}` }}>
            <div style={{ fontSize:11,fontWeight:700,color:CX.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:8 }}>Joueurs</div>
            <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:12,flexWrap:"wrap" }}>
              {players.map((p,i) => (
                <span key={i} style={{ fontWeight:800,fontSize:14,color:CX.text }}>{i===0?"":<span style={{color:CX.muted,margin:"0 4px"}}>vs</span>}{p}</span>
              ))}
            </div>
          </div>
          {/* Mode */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12,fontWeight:700,color:CX.muted,marginBottom:8 }}>MODE DE JEU</div>
            <Pill options={[{v:"501",l:"501"},{v:"301",l:"301"},{v:"701",l:"701"}]} value={form.mode} onChange={v=>setForm(f=>({...f,mode:v}))}/>
          </div>
          {/* Manches */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:12,fontWeight:700,color:CX.muted,marginBottom:8 }}>MANCHES</div>
            <Pill options={[{v:1,l:"1"},{v:3,l:"3"},{v:5,l:"5"},{v:7,l:"7"}]} value={form.manches} onChange={v=>setForm(f=>({...f,manches:v}))}/>
          </div>
          {/* Type classé/amical */}
          {showType && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:12,fontWeight:700,color:CX.muted,marginBottom:8 }}>FORMAT</div>
              <Pill
                options={[{v:"drix",l:"⚔️ Classé"},{v:"amical",l:"🤝 Amical"}]}
                value={form.type}
                onChange={v=>setForm(f=>({...f,type:v}))}
                colorActive={form.type==="drix"?"#22c55e":"#7c3aed"}
              />
            </div>
          )}
          {/* Bouton lancer */}
          <button onClick={onLancer} disabled={loading} style={{
            width:"100%",padding:"16px",borderRadius:14,border:"none",
            background:loading?"#2a2a2a":"linear-gradient(135deg,#f97316,#ea580c)",
            color:loading?"#64748b":"#fff",fontWeight:900,fontSize:17,
            cursor:loading?"not-allowed":"pointer",
            boxShadow:loading?"none":"0 6px 24px #f9731644",
            transition:"all .2s",
          }}>
            {loading ? "⏳ Création..." : "🎯 Lancer la partie"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── SCOREUR DOUBLETTE ──────────────────────────────────────────────────────────
// Thin wrapper: reuses the existing <Scoreur> component entirely.
// Team names displayed as first 3 letters uppercase: "THO / HER" vs "TOT / CYR"
// DRIX applied to all 4 players via onResultat intercept.
const ScoreurDoublette = ({ joueur, setPage }) => {
  const [gameKey, setGameKey] = useState(0);
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayForm, setReplayForm] = useState({ mode:"501", manches:1 });

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

  const handleRejouer = () => {
    setGameKey(k => k + 1);
  };

  const teamPlayersDisplay = [
    `${config.teamA[0]?.pseudo||"?"} & ${config.teamA[1]?.pseudo||"?"}`,
    `${config.teamB[0]?.pseudo||"?"} & ${config.teamB[1]?.pseudo||"?"}`,
  ];

  return (
    <Scoreur
      key={gameKey}
      duel={fakeDuel}
      drixData={drixData}
      onResultat={handleResultat}
      onRejouer={handleRejouer}
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

const FeedAvatar = ({ photo, pseudo, size=40, onClick, status }) => {
  const cols = ["#f97316","#3b82f6","#10b981","#a855f7","#ec4899","#eab308"];
  const col = cols[pseudo ? pseudo.charCodeAt(0) % cols.length : 0];
  const statusRing = { live:"#ef4444", hot:"#f97316", up:"#22c55e", online:"#3b82f6" };
  const ringColor = status ? statusRing[status] : null;
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      {ringColor && (
        <div style={{ position:"absolute", inset:-2, borderRadius:"50%", border:`2px solid ${ringColor}`, boxShadow:`0 0 8px ${ringColor}88`, animation:status==="live"?"livePulse 1.4s infinite":undefined, zIndex:0, pointerEvents:"none" }}/>
      )}
      <div onClick={onClick} style={{ width:size,height:size,borderRadius:"50%",background:col,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:Math.round(size*0.4),color:"#fff",position:"relative",cursor:onClick?"pointer":"default",zIndex:1 }}>
        {photo && <img src={photo} alt="" style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover" }} onError={e=>{e.currentTarget.style.display="none";}}/>}
        {!photo && <span style={{ position:"relative",zIndex:1 }}>{(pseudo?.[0]||"?").toUpperCase()}</span>}
      </div>
      {ringColor && (
        <div style={{ position:"absolute", bottom:-1, right:-1, width:Math.max(8,size*0.22), height:Math.max(8,size*0.22), borderRadius:"50%", background:ringColor, border:`2px solid #0a0a0f`, zIndex:2 }}/>
      )}
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
      <ThumbsUp size={13}/> {count>0?count:""}
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
          <MessageCircle size={13}/> {totalComments>0?`${totalComments} commentaire${totalComments>1?"s":""}` : "Commenter"}
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
                <div style={{ fontSize:11, color:C.muted, marginTop:2 }}>{tempsDepuis(c.date)}</div>
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

// Détail des manches — accordéon classique (utilisé hors DuelPost)
const MancheDetail = ({ manches, joueur0, joueur1 }) => {
  const [open, setOpen] = useState(false);
  if (!manches || manches.length === 0) return null;
  return (
    <div style={{ marginTop:10, borderTop:`1px solid ${C.border}`, paddingTop:8 }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ background:"none", border:"none", color:C.muted, fontSize:12, fontWeight:600, cursor:"pointer", padding:0, touchAction:"manipulation" }}>
        {open?"▾":"▸"} Détail manche par manche ({manches.length})
      </button>
      {open && <MancheDetailList manches={manches}/>}
    </div>
  );
};

// Liste des manches sans accordéon — affichée directement quand on l'inclut
const MancheDetailList = ({ manches }) => (
  <div style={{ marginTop:8, display:"flex", flexDirection:"column", gap:6 }}>
    {manches.map((m, i) => (
      <div key={i} style={{ background:"#0f0f0f", borderRadius:10, padding:"10px 12px" }}>
        <div style={{ fontWeight:700, fontSize:12, color:C.accent, marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>Manche {i+1} — {m.winner} <Trophy size={11} color={C.accent}/></div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:12 }}>
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
);

// ── Duel post avec breakdown DRIX replié ──────────────────────────────────────
// ── Helper : parse le contenu d'un wall_post Chrono Finish ────────────────────
// Détecte le format JSON moderne (__CHRONO__|{...}) ou le format texte legacy.
// Retourne null si ce n'est pas un post Chrono Finish.
const parseChronoFinishContent = (contenu) => {
  if (!contenu) return null;
  // Format JSON moderne
  if (contenu.startsWith("__CHRONO__|")) {
    try { return JSON.parse(contenu.slice(11)); } catch { return null; }
  }
  // Format texte legacy : "⏱ Chrono Finish — Défi du DD/MM/YYYY..." ou "🏆 Chrono Finish — Vainqueur..."
  if (contenu.includes("Chrono Finish")) {
    const isVainqueur = contenu.includes("Vainqueur") || contenu.includes("remporte le défi");
    // Extraction du temps "X.Xs" ou "Xm XX.Xs"
    const tempsMatch = contenu.match(/en\s+([\d:hms.\s]+)\s*!/);
    const tempsStr = tempsMatch ? tempsMatch[1].trim() : null;
    // Extraction erreurs
    let erreurs = 0;
    const errMatch = contenu.match(/(\d+)\s+erreur/);
    if (errMatch) erreurs = parseInt(errMatch[1]);
    if (contenu.includes("Zéro erreur")) erreurs = 0;
    // Extraction DRIX
    const drixMatch = contenu.match(/\+(\d+)\s+DRIX/);
    const drix = drixMatch ? parseInt(drixMatch[1]) : (isVainqueur ? 20 : 5);
    // Extraction date
    const dateMatch = contenu.match(/du\s+(\d{2}\/\d{2}\/\d{4})/);
    const dateLabel = dateMatch ? dateMatch[1] : null;
    return {
      type: isVainqueur ? "vainqueur" : "finish",
      temps_label: tempsStr,
      erreurs,
      drix,
      date_label: dateLabel,
    };
  }
  return null;
};

// ── ChronoFinishPost — Carte SPEEDRUN bleu/violet (chrono classique) ──────────
const ChronoFinishPost = ({ p, info, C, cardBase, joueur, likesMap, commentsMap, tempsDepuis, setPage, FeedAvatar, LikeButton, CommentSection }) => {
  const isVainqueur = info.type === "vainqueur";
  if (isVainqueur) {
    return <ChronoVainqueurPost {...{p, info, C, cardBase, joueur, likesMap, commentsMap, tempsDepuis, setPage, FeedAvatar, LikeButton, CommentSection}}/>;
  }

  const errCol = info.erreurs === 0 ? "#22c55e" : info.erreurs <= 2 ? "#f59e0b" : "#ef4444";
  const errEmoji = info.erreurs === 0 ? "✅" : info.erreurs <= 2 ? "⚠️" : "❌";

  return (
    <div key={`post-${p.id}`} style={{
      position:"relative", overflow:"hidden",
      border: "1px solid #60a5fa44",
      background: "linear-gradient(160deg,#020a1a 0%,#0a0518 50%,#080012 100%)",
      borderRadius:18, marginBottom:12,
      boxShadow: "0 4px 28px rgba(96,165,250,0.18), 0 0 18px rgba(167,139,250,0.10)",
      animation:"feedIn .3s ease-out both",
    }}>
      <style>{`
        @keyframes chronoLines { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
        @keyframes chronoPulse { 0%,100%{text-shadow:0 0 28px #60a5fa88, 0 0 56px #a78bfa44} 50%{text-shadow:0 0 38px #60a5facc, 0 0 80px #a78bfa66} }
        @keyframes chronoScan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100%)} }
      `}</style>

      {/* HEADER BANDE PLEINE LARGEUR — Speedrun */}
      <div style={{
        position:"relative", overflow:"hidden",
        background:"linear-gradient(90deg,#0c1230 0%,#1e3a8a 50%,#0c1230 100%)",
        borderBottom:"1px solid #60a5fa55",
        padding:"6px 16px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        {/* Effet scan vertical pour ambiance HUD speedrun */}
        <div style={{ position:"absolute",inset:0, background:"repeating-linear-gradient(180deg,transparent 0,transparent 3px,#60a5fa08 3px,#60a5fa08 4px)", pointerEvents:"none" }}/>
        {/* Ligne shine horizontale */}
        <div style={{ position:"absolute",top:0,left:0,right:0,height:1, background:"linear-gradient(90deg,transparent,#a78bfacc,#60a5fa,#a78bfacc,transparent)", animation:"chronoLines 3.5s linear infinite" }}/>
        <span style={{ position:"relative", fontSize:11, fontWeight:900, color:"#a78bfa", letterSpacing:3, textShadow:"0 0 8px #a78bfa88" }}>
          ⏱ CHRONO FINISH
        </span>
        {info.date_label && (
          <span style={{ position:"relative", fontSize:10, color:"#60a5fa", fontVariantNumeric:"tabular-nums", fontWeight:700 }}>{info.date_label}</span>
        )}
      </div>

      {/* Lignes vitesse décoratives */}
      <div style={{ position:"absolute", top:60, right:-30, width:160, height:160, borderRadius:"50%", background:"radial-gradient(circle,#60a5fa1a 0%,transparent 70%)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", bottom:-30, left:-30, width:140, height:140, borderRadius:"50%", background:"radial-gradient(circle,#a78bfa15 0%,transparent 70%)", pointerEvents:"none" }}/>

      <div style={{ position:"relative", padding:"14px 16px 12px" }}>
        {/* Avatar + pseudo */}
        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
          <FeedAvatar photo={p.joueur_photo} pseudo={p.joueur_pseudo} size={42} onClick={()=>setPage("profil-joueur-"+p.joueur_id)}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div onClick={()=>setPage("profil-joueur-"+p.joueur_id)} style={{ fontWeight:800, fontSize:14, color:"#fff", cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {p.joueur_pseudo}
            </div>
            <div style={{ fontSize:11, color:"#475569" }}>{tempsDepuis(p.date)}</div>
          </div>
        </div>

        {/* TEMPS MASSIF avec ambiance HUD digital */}
        <div style={{
          position:"relative", overflow:"hidden",
          background:"radial-gradient(ellipse at center, #0a1a3a 0%, #050818 70%, #000308 100%)",
          border:"1px solid #60a5fa66",
          borderRadius:14, padding:"22px 16px",
          marginBottom:12, textAlign:"center",
          boxShadow:"inset 0 0 40px rgba(96,165,250,0.18), 0 0 20px rgba(96,165,250,0.20)",
        }}>
          {/* Scan vertical animé */}
          <div style={{ position:"absolute", left:0, right:0, height:30, background:"linear-gradient(180deg,transparent,#60a5fa22,transparent)", animation:"chronoScan 4s linear infinite", pointerEvents:"none" }}/>
          <div style={{ fontSize:9, fontWeight:800, color:"#60a5faaa", letterSpacing:4, marginBottom:6, textTransform:"uppercase" }}>Temps réalisé</div>
          <div style={{
            fontSize:46, fontWeight:900, lineHeight:1,
            background:"linear-gradient(135deg,#60a5fa,#a78bfa,#60a5fa)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            fontVariantNumeric:"tabular-nums", letterSpacing:2,
            animation:"chronoPulse 2.4s ease-in-out infinite",
            fontFamily:"Inter, system-ui, sans-serif",
          }}>
            ⏱ {info.temps_label || "—"}
          </div>
        </div>

        {/* Stats compactes — chips horizontales fines */}
        <div style={{ display:"flex", gap:6, marginBottom:8 }}>
          <div style={{ flex:1, background:"#001a14", border:"1px solid #22c55e33", borderRadius:8, padding:"5px 8px", display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ fontSize:11 }}>🎯</span>
            <span style={{ fontSize:10, fontWeight:900, color:"#22c55e" }}>5/5</span>
            <span style={{ fontSize:9, color:"#16a34a", marginLeft:"auto", opacity:.7 }}>finishes</span>
          </div>
          <div style={{ flex:1, background: info.erreurs===0?"#001a14":info.erreurs<=2?"#1a1200":"#1a0a0a", border:`1px solid ${errCol}33`, borderRadius:8, padding:"5px 8px", display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ fontSize:11 }}>{errEmoji}</span>
            <span style={{ fontSize:10, fontWeight:900, color:errCol }}>{info.erreurs}</span>
            <span style={{ fontSize:9, color:errCol, marginLeft:"auto", opacity:.7 }}>err.</span>
          </div>
          <div style={{ flex:1, background:"#0a0814", border:"1px solid #60a5fa44", borderRadius:8, padding:"5px 8px", display:"flex", alignItems:"center", gap:5, boxShadow:"0 0 6px rgba(96,165,250,0.15)" }}>
            <span style={{ fontSize:11 }}>💎</span>
            <span style={{ fontSize:10, fontWeight:900, color:"#60a5fa" }}>+{info.drix}</span>
            <span style={{ fontSize:9, color:"#60a5fa", marginLeft:"auto", opacity:.7 }}>DRIX</span>
          </div>
        </div>

        <LikeButton refId={p.id} joueur={joueur} initialCount={likesMap[p.id]?.count||0} initialMyLike={likesMap[p.id]?.myLike||false}/>
        <CommentSection refId={p.id} joueur={joueur} initialComments={commentsMap[p.id]||[]}/>
      </div>
    </div>
  );
};

// ── ChronoVainqueurPost — Carte CHAMPION or/gold (vainqueur du jour) ──────────
const ChronoVainqueurPost = ({ p, info, joueur, likesMap, commentsMap, tempsDepuis, setPage, FeedAvatar, LikeButton, CommentSection }) => {
  return (
    <div key={`post-${p.id}`} style={{
      position:"relative", overflow:"hidden",
      border: "2px solid #fbbf2466",
      background: "linear-gradient(165deg,#1a0f00 0%,#0f0500 40%,#1a0e00 80%,#0a0500 100%)",
      borderRadius:20, marginBottom:14,
      boxShadow: "0 4px 32px rgba(251,191,36,0.30), 0 0 60px rgba(245,158,11,0.12), inset 0 1px 0 rgba(251,191,36,0.18)",
      animation:"finHeroIn .7s cubic-bezier(.34,1.56,.64,1) both",
    }}>
      <style>{`
        @keyframes vainqGlow   { 0%,100%{box-shadow:inset 0 0 60px rgba(251,191,36,0.15), 0 0 30px rgba(251,191,36,0.25)} 50%{box-shadow:inset 0 0 80px rgba(251,191,36,0.28), 0 0 50px rgba(251,191,36,0.45)} }
        @keyframes vainqPulse  { 0%,100%{text-shadow:0 0 30px #fbbf24cc,0 0 60px #f9731699} 50%{text-shadow:0 0 50px #fbbf24,0 0 90px #f97316cc} }
        @keyframes vainqShine  { 0%{transform:translateX(-120%) skewX(-22deg)} 60%,100%{transform:translateX(320%) skewX(-22deg)} }
        @keyframes vainqCrown  { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-2px) rotate(3deg)} }
      `}</style>

      {/* HEADER BANNIÈRE MASSIVE */}
      <div style={{
        position:"relative", overflow:"hidden",
        background:"linear-gradient(90deg,#78350f 0%,#a16207 25%,#fbbf24 50%,#a16207 75%,#78350f 100%)",
        backgroundSize:"200% 100%",
        animation:"feedGlow 4s ease infinite",
        padding:"10px 16px",
        textAlign:"center",
        borderBottom:"2px solid #fbbf2477",
        boxShadow:"0 4px 16px rgba(251,191,36,0.35)",
      }}>
        {/* Effet shine */}
        <div style={{ position:"absolute",top:0,left:0,bottom:0,width:120, background:"linear-gradient(90deg,transparent,#fffacc99,transparent)", animation:"vainqShine 4s ease-in-out infinite", pointerEvents:"none" }}/>
        <div style={{ position:"relative", fontSize:13, fontWeight:900, color:"#3b1f00", letterSpacing:4, textShadow:"0 1px 2px rgba(255,255,255,0.35), 0 -1px 1px rgba(0,0,0,0.5)" }}>
          👑 VAINQUEUR DU JOUR 👑
        </div>
      </div>

      {/* #1 GÉANT SEMI-TRANSPARENT EN ARRIÈRE-PLAN */}
      <div aria-hidden style={{
        position:"absolute", top:50, right:-20,
        fontSize:200, fontWeight:900, color:"#fbbf24",
        opacity:.06, lineHeight:1, fontFamily:"Inter, system-ui",
        pointerEvents:"none", userSelect:"none",
        textShadow:"0 0 40px #fbbf24",
      }}>
        #1
      </div>

      {/* Halo lumineux et particules */}
      <div style={{ position:"absolute", top:30, left:"50%", transform:"translateX(-50%)", width:280, height:280, borderRadius:"50%", background:"radial-gradient(circle,#fbbf2425 0%,#f9731611 40%,transparent 70%)", pointerEvents:"none", animation:"vainqGlow 3s ease-in-out infinite" }}/>

      <div style={{ position:"relative", padding:"18px 16px 14px" }}>
        {/* Avatar + pseudo couronné */}
        <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:14 }}>
          <div style={{ position:"relative", flexShrink:0 }}>
            <FeedAvatar photo={p.joueur_photo} pseudo={p.joueur_pseudo} size={50} onClick={()=>setPage("profil-joueur-"+p.joueur_id)}/>
            {/* Couronne flottante */}
            <div style={{ position:"absolute", top:-14, left:"50%", transform:"translateX(-50%)", fontSize:22, animation:"vainqCrown 2s ease-in-out infinite", filter:"drop-shadow(0 0 8px #fbbf24cc)", pointerEvents:"none" }}>👑</div>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div onClick={()=>setPage("profil-joueur-"+p.joueur_id)} style={{ fontWeight:900, fontSize:16, cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
              background:"linear-gradient(135deg,#fde047,#fbbf24,#f97316)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
              textShadow:"0 0 20px rgba(251,191,36,0.4)",
            }}>
              {p.joueur_pseudo}
            </div>
            <div style={{ fontSize:11, color:"#fbbf24aa", display:"flex", alignItems:"center", gap:6 }}>
              {tempsDepuis(p.date)}
              {info.date_label && <span style={{ color:"#a16207" }}>· {info.date_label}</span>}
            </div>
          </div>
        </div>

        {/* CHRONO SPECTACULAIRE */}
        <div style={{
          position:"relative", overflow:"hidden",
          background:"radial-gradient(ellipse at center,#3b1f00 0%,#1a0e00 60%,#0a0500 100%)",
          border:"2px solid #fbbf24aa",
          borderRadius:16, padding:"24px 16px",
          marginBottom:10, textAlign:"center",
          boxShadow:"inset 0 0 60px rgba(251,191,36,0.20), 0 0 30px rgba(251,191,36,0.35)",
        }}>
          {/* Shine balayage */}
          <div style={{ position:"absolute", top:0, left:0, bottom:0, width:100, background:"linear-gradient(90deg,transparent,#fffacc44,transparent)", animation:"vainqShine 3.5s ease-in-out infinite", pointerEvents:"none" }}/>
          <div style={{ fontSize:10, fontWeight:900, color:"#fbbf24", letterSpacing:5, marginBottom:8, textTransform:"uppercase" }}>🏆 Temps Champion</div>
          <div style={{
            fontSize:54, fontWeight:900, lineHeight:1,
            background:"linear-gradient(135deg,#fde047 0%,#fbbf24 40%,#f97316 100%)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            fontVariantNumeric:"tabular-nums", letterSpacing:2,
            animation:"vainqPulse 2.4s ease-in-out infinite",
          }}>
            ⏱ {info.temps_label || "—"}
          </div>
        </div>

        {/* Message de domination */}
        <div style={{ background:"linear-gradient(135deg,#1a1200,#0a0500)", border:"1px solid #fbbf2466", borderRadius:12, padding:"10px 14px", marginBottom:10, display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>🔥</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:13, fontWeight:900, color:"#fbbf24" }}>Meilleur temps du jour</div>
            <div style={{ fontSize:11, color:"#a16207" }}>Personne n'a fait mieux ! 🏆</div>
          </div>
          <div style={{ background:"linear-gradient(135deg,#fbbf24,#f97316)", color:"#3b1f00", padding:"4px 10px", borderRadius:8, fontSize:11, fontWeight:900, letterSpacing:.5, boxShadow:"0 2px 8px rgba(251,191,36,0.4)", whiteSpace:"nowrap" }}>
            +{info.drix} DRIX
          </div>
        </div>

        <LikeButton refId={p.id} joueur={joueur} initialCount={likesMap[p.id]?.count||0} initialMyLike={likesMap[p.id]?.myLike||false}/>
        <CommentSection refId={p.id} joueur={joueur} initialComments={commentsMap[p.id]||[]}/>
      </div>
    </div>
  );
};

const DuelPost = ({ p, d, C, cardBase, joueur, likesMap, commentsMap, tempsDepuis, setPage }) => {
  const [openManches, setOpenManches] = useState(false);
  const [openDrix, setOpenDrix]       = useState(false);
  // Photos des 2 joueurs (le wall_post est créé avec joueur_photo=null en base
  // donc on doit les fetch via les pseudos)
  const [winnerPhoto, setWinnerPhoto] = useState(p.joueur_photo || null);
  const [loserPhoto, setLoserPhoto]   = useState(null);
  const w = d.winner; const l = d.loser;
  const isRivalite = !!d.isRivalite;

  // Fetch photos des 2 joueurs (gagnant + perdant) en une seule requête
  useEffect(() => {
    if (!w?.nom || !l?.nom) return;
    sb(`joueurs?pseudo=in.("${encodeURIComponent(w.nom)}","${encodeURIComponent(l.nom)}")&select=pseudo,photo`)
      .then(r => {
        const arr = r || [];
        const wp = arr.find(x => x.pseudo === w.nom)?.photo;
        const lp = arr.find(x => x.pseudo === l.nom)?.photo;
        if (wp) setWinnerPhoto(wp);
        if (lp) setLoserPhoto(lp);
      })
      .catch(()=>{});
  }, [w?.nom, l?.nom]);
  const scoreW = w?.nbManches ?? (() => { const m = d.headline?.match(/(\d+)-(\d+)/); return m ? parseInt(m[1]) : null; })();
  const scoreL = l?.nbManches ?? (() => { const m = d.headline?.match(/(\d+)-(\d+)/); return m ? parseInt(m[2]) : null; })();
  const totalManches = (scoreW||0) + (scoreL||0);

  // Détecte le mode et bo depuis headline + manches
  const modeMatch = d.headline?.match(/(\d{3})/);
  const modeLabel = modeMatch ? modeMatch[1] : null;
  const boLabel = scoreW != null ? `BO${(scoreW * 2) - 1}` : null;

  // Highlights auto à partir des manches
  const manches = d.manches || [];
  const bestFinish = manches.reduce((m, x) => Math.max(m, parseInt(x.winner_finish) || 0), 0);
  const bestVolee = manches.reduce((m, x) => Math.max(m, parseInt(x.winner_180) ? 180 : 0, x.winner_volee || 0), 0);
  const all180 = manches.filter(m => parseInt(m.winner_180) > 0).length;

  // Phrase IA dynamique
  const analyseIA = (() => {
    const ecart = (scoreW || 0) - (scoreL || 0);
    const winNom = w.nom;
    const loseNom = l.nom;
    if (ecart >= 3 && bestFinish >= 100) return { emoji:"🔥", text:`${winNom} a dominé avec un finish de classe à ${bestFinish}.` };
    if (ecart >= 3) return { emoji:"⚡", text:`${winNom} n'a laissé aucune chance à ${loseNom}.` };
    if (ecart === 1 && (scoreW || 0) >= 3) return { emoji:"⚔️", text:`Match serré, tout s'est joué dans la dernière manche.` };
    if (bestFinish >= 100) return { emoji:"🎯", text:`Finish à ${bestFinish} — du grand art.` };
    if (all180 > 0) return { emoji:"💥", text:`${all180}×180 dans ce match — explosif.` };
    if (ecart === 0 && (scoreW || 0) > 0) return { emoji:"⚖️", text:`Duel équilibré du début à la fin.` };
    return { emoji:"🏆", text:`Belle victoire de ${winNom}. La revanche attend.` };
  })();

  const themeMain   = isRivalite ? "#a855f7" : "#f97316";
  const themeSecond = isRivalite ? "#7c3aed" : "#ea580c";
  const winColor    = "#22c55e";
  const loseColor   = "#ef4444";

  return (
    <div key={`post-${p.id}`} style={{
      position:"relative", overflow:"hidden",
      border: `1px solid ${isRivalite ? "#a855f788" : "#f9731677"}`,
      background: isRivalite
        ? "linear-gradient(165deg,#15001f 0%,#0a0014 50%,#10051a 100%)"
        : "linear-gradient(165deg,#1f1100 0%,#100600 50%,#0d0700 100%)",
      borderRadius:20, marginBottom:16,
      boxShadow: isRivalite
        ? "0 8px 40px rgba(168,85,247,0.28), 0 0 60px rgba(168,85,247,0.10), inset 0 1px 0 rgba(168,85,247,0.18)"
        : "0 8px 40px rgba(249,115,22,0.25), 0 0 60px rgba(249,115,22,0.10), inset 0 1px 0 rgba(249,115,22,0.18)",
      animation:"feedIn .3s ease-out both",
    }}>
      <style>{`
        @keyframes duelScoreReveal { 0%{transform:scale(.4);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
        @keyframes duelSwordPulse  { 0%,100%{transform:rotate(-6deg) scale(1)} 50%{transform:rotate(6deg) scale(1.12)} }
        @keyframes duelWinGlow     { 0%,100%{text-shadow:0 0 24px #22c55e88, 0 0 48px #22c55e44} 50%{text-shadow:0 0 36px #22c55ecc, 0 0 80px #22c55e77} }
        @keyframes duelShine       { 0%{transform:translateX(-120%) skewX(-20deg)} 60%,100%{transform:translateX(320%) skewX(-20deg)} }
      `}</style>

      {/* HEADER BANDE compacte avec type de match */}
      <div style={{
        position:"relative", overflow:"hidden",
        background: isRivalite
          ? "linear-gradient(90deg,#1a0030,#3b0764,#1a0030)"
          : "linear-gradient(90deg,#1a0a00,#451a03,#1a0a00)",
        borderBottom: `1px solid ${themeMain}55`,
        padding:"6px 14px",
        display:"flex", alignItems:"center", justifyContent:"space-between", gap:8,
      }}>
        <div style={{ position:"absolute",top:0,left:0,right:0,height:1, background:`linear-gradient(90deg,transparent,${themeMain}cc,transparent)`, animation:"feedShine 4s linear infinite" }}/>
        <div style={{ position:"relative", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:11, fontWeight:900, color:themeMain, letterSpacing:2, textShadow:`0 0 8px ${themeMain}88` }}>
            {isRivalite ? "⚔ RIVALITÉ HEBDO" : "⚔ DUEL"}
          </span>
          {modeLabel && (
            <span style={{ fontSize:10, fontWeight:800, color:"#fbbf24", background:"#fbbf2418", border:"1px solid #fbbf2444", borderRadius:6, padding:"2px 7px", letterSpacing:.5 }}>
              🎯 {modeLabel}
            </span>
          )}
          {boLabel && (
            <span style={{ fontSize:10, fontWeight:800, color:"#94a3b8", background:"#ffffff08", border:"1px solid #ffffff15", borderRadius:6, padding:"2px 7px" }}>
              {boLabel}
            </span>
          )}
        </div>
        <span style={{ position:"relative", fontSize:10, color:"#64748b", fontWeight:700, whiteSpace:"nowrap" }}>
          {tempsDepuis(p.date)}
        </span>
      </div>

      {/* Halos lumineux décoratifs */}
      <div style={{ position:"absolute", top:50, left:-30, width:140, height:140, borderRadius:"50%", background:`radial-gradient(circle,${winColor}18 0%,transparent 70%)`, pointerEvents:"none" }}/>
      <div style={{ position:"absolute", top:50, right:-30, width:140, height:140, borderRadius:"50%", background:`radial-gradient(circle,${loseColor}18 0%,transparent 70%)`, pointerEvents:"none" }}/>

      <div style={{ position:"relative", padding:"16px 14px 12px" }}>
        {/* SCORE MASSIF — élément central */}
        <div style={{
          position:"relative", overflow:"hidden",
          background:`radial-gradient(ellipse at center, ${themeMain}10 0%, #0a0500 50%, #000 100%)`,
          border:`1px solid ${themeMain}66`,
          borderRadius:18, padding:"24px 12px 22px",
          marginBottom:14,
          boxShadow:`inset 0 0 50px ${themeMain}20, 0 4px 18px ${themeMain}15`,
        }}>
          {/* Halo VERT à gauche (côté gagnant) */}
          <div style={{ position:"absolute", top:"50%", left:-60, transform:"translateY(-50%)", width:180, height:180, borderRadius:"50%", background:`radial-gradient(circle, ${winColor}28 0%, ${winColor}10 30%, transparent 70%)`, pointerEvents:"none" }}/>
          {/* Halo ROUGE à droite (côté perdant) */}
          <div style={{ position:"absolute", top:"50%", right:-60, transform:"translateY(-50%)", width:180, height:180, borderRadius:"50%", background:`radial-gradient(circle, ${loseColor}22 0%, ${loseColor}0a 30%, transparent 70%)`, pointerEvents:"none" }}/>

          {/* Shine balayage */}
          <div style={{ position:"absolute", top:0, left:0, bottom:0, width:100, background:"linear-gradient(90deg,transparent,#ffffff14,transparent)", animation:"duelShine 5s ease-in-out infinite", pointerEvents:"none" }}/>

          <div style={{ position:"relative", display:"flex", alignItems:"center", gap:8 }}>
            {/* WINNER */}
            <div style={{ flex:1, textAlign:"center", minWidth:0, animation:"duelScoreReveal .6s cubic-bezier(.34,1.56,.64,1) both" }}>
              {/* Avatar */}
              <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
                <FeedAvatar photo={winnerPhoto} pseudo={w.nom} size={42} onClick={()=>setPage("profil-joueur-"+p.joueur_id)}/>
              </div>
              <div title={w.nom} style={{ fontWeight:900, fontSize:12, color:winColor, marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textShadow:`0 0 10px ${winColor}66` }}>
                {w.nom}
              </div>
              <div style={{
                fontSize:72, fontWeight:900, lineHeight:.9, color:winColor,
                fontVariantNumeric:"tabular-nums",
                animation:"duelWinGlow 2.4s ease-in-out infinite",
              }}>
                {scoreW ?? "?"}
              </div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:`linear-gradient(135deg,${winColor}33,${winColor}15)`, border:`1px solid ${winColor}aa`, borderRadius:20, padding:"4px 12px", fontSize:10, fontWeight:900, color:winColor, marginTop:8, letterSpacing:1, boxShadow:`0 0 16px ${winColor}55, inset 0 1px 0 ${winColor}44` }}>
                <Trophy size={11} color={winColor}/> VICTOIRE
              </div>
            </div>

            {/* ⚔ central — anneau orange glow comme inspiration */}
            <div style={{ flexShrink:0, textAlign:"center", padding:"0 4px", animation:"duelScoreReveal .6s .15s cubic-bezier(.34,1.56,.64,1) both" }}>
              <div style={{ position:"relative", width:46, height:46, margin:"0 auto 5px" }}>
                {/* Anneau extérieur lumineux */}
                <div style={{ position:"absolute", inset:-3, borderRadius:"50%", border:`2px solid ${themeMain}`, boxShadow:`0 0 18px ${themeMain}, 0 0 32px ${themeMain}66, inset 0 0 12px ${themeMain}55`, animation:"duelSwordPulse 1.6s ease-in-out infinite" }}/>
                {/* Centre avec épées */}
                <div style={{
                  position:"absolute", inset:0, borderRadius:"50%",
                  background:`radial-gradient(circle,${themeMain} 0%,${themeSecond} 100%)`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  boxShadow:"inset 0 2px 4px rgba(255,255,255,0.30), inset 0 -2px 4px rgba(0,0,0,0.40)",
                }}>
                  <Swords size={20} color="#fff"/>
                </div>
              </div>
              <div style={{ fontSize:10, fontWeight:900, color:themeMain, letterSpacing:3, textShadow:`0 0 6px ${themeMain}` }}>vs</div>
            </div>

            {/* LOSER */}
            <div style={{ flex:1, textAlign:"center", minWidth:0, animation:"duelScoreReveal .6s .1s cubic-bezier(.34,1.56,.64,1) both" }}>
              <div style={{ display:"flex", justifyContent:"center", marginBottom:8 }}>
                <FeedAvatar photo={loserPhoto} pseudo={l.nom} size={42}/>
              </div>
              <div title={l.nom} style={{ fontWeight:900, fontSize:12, color:"#94a3b8", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {l.nom}
              </div>
              <div style={{
                fontSize:72, fontWeight:900, lineHeight:.9, color:loseColor,
                fontVariantNumeric:"tabular-nums", opacity:.65, filter:"grayscale(.2)",
              }}>
                {scoreL ?? "?"}
              </div>
              <div style={{ display:"inline-flex", alignItems:"center", gap:5, background:`linear-gradient(135deg,${loseColor}22,${loseColor}0d)`, border:`1px solid ${loseColor}77`, borderRadius:20, padding:"4px 12px", fontSize:10, fontWeight:900, color:loseColor, marginTop:8, letterSpacing:1, opacity:.85, boxShadow:`0 0 10px ${loseColor}33` }}>
                <X size={11} color={loseColor}/> DÉFAITE
              </div>
            </div>
          </div>

          {/* Timeline manches — intégrée avec label */}
          {totalManches > 0 && manches.length > 0 && (
            <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${themeMain}33` }}>
              <div style={{ fontSize:9, fontWeight:800, color:"#64748b", letterSpacing:2, marginBottom:8, textAlign:"center", textTransform:"uppercase" }}>🎯 Déroulé du match</div>
              <div style={{ display:"flex", justifyContent:"center", gap:6 }}>
                {manches.map((m, i) => {
                  const won = m.winner === w.nom;
                  return (
                    <div key={i} title={`Manche ${i+1} — ${m.winner||""}${m.winner_finish?` · finish ${m.winner_finish}`:""}`} style={{
                      minWidth:38, padding:"5px 8px", borderRadius:10,
                      background: won
                        ? `linear-gradient(135deg,${winColor}33,${winColor}10)`
                        : `linear-gradient(135deg,${loseColor}22,${loseColor}08)`,
                      border: `1px solid ${won ? winColor+"88" : loseColor+"55"}`,
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      boxShadow: won ? `0 0 12px ${winColor}33` : "none",
                    }}>
                      <div style={{ fontSize:8, fontWeight:700, color: won ? "#86efac" : "#fca5a5", letterSpacing:.5, opacity:.8 }}>M{i+1}</div>
                      <div style={{ fontSize:14, fontWeight:900, color: won ? winColor : loseColor, lineHeight:1 }}>
                        {won ? "✓" : "✗"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* DRIX vivants — contours colorés bien distincts */}
        <div style={{ display:"flex", gap:10, marginBottom:14 }}>
          <div style={{ flex:1, position:"relative", overflow:"hidden", background:`linear-gradient(135deg,${winColor}22 0%,${winColor}0a 50%,#000 100%)`, border:`1px solid ${winColor}77`, borderRadius:14, padding:"12px 12px", boxShadow:`0 0 24px ${winColor}28, inset 0 1px 0 ${winColor}33`, textAlign:"center" }}>
            <div style={{ fontSize:9, fontWeight:800, color:"#86efac", letterSpacing:1, marginBottom:3 }}>🔥 {w.nom.split(" ")[0].slice(0,12)}</div>
            <div style={{ fontSize:30, fontWeight:900, color:winColor, lineHeight:1, fontVariantNumeric:"tabular-nums", textShadow:`0 0 18px ${winColor}99, 0 0 30px ${winColor}55` }}>
              {w.total>=0?"+":""}{w.total}
            </div>
            <div style={{ fontSize:9, color:"#86efac", marginTop:3, letterSpacing:.5 }}>DRIX gagnés</div>
          </div>
          <div style={{ flex:1, position:"relative", overflow:"hidden", background: isRivalite ? "linear-gradient(135deg,#ffffff08,#000)" : `linear-gradient(135deg,${loseColor}18 0%,${loseColor}05 50%,#000 100%)`, border: `1px solid ${isRivalite?"#ffffff20":loseColor+"66"}`, borderRadius:14, padding:"12px 12px", boxShadow: isRivalite ? "none" : `0 0 18px ${loseColor}22, inset 0 1px 0 ${loseColor}22`, textAlign:"center" }}>
            <div style={{ fontSize:9, fontWeight:800, color: isRivalite?"#64748b":"#fca5a5", letterSpacing:1, marginBottom:3 }}>{isRivalite?"🛡":"💀"} {l.nom.split(" ")[0].slice(0,12)}</div>
            <div style={{ fontSize:30, fontWeight:900, color: isRivalite?"#334155":loseColor, lineHeight:1, fontVariantNumeric:"tabular-nums", textShadow: isRivalite ? "none" : `0 0 12px ${loseColor}66` }}>
              {isRivalite?"0":`${l.total>=0?"+":""}${l.total}`}
            </div>
            <div style={{ fontSize:9, color: isRivalite?"#475569":"#fca5a5", marginTop:3, letterSpacing:.5 }}>{isRivalite?"protégé":"DRIX perdus"}</div>
          </div>
        </div>

        {/* HIGHLIGHTS du match — bloc violet néon spectaculaire */}
        {(bestFinish > 0 || bestVolee >= 100 || all180 > 0) && (
          <div style={{
            position:"relative", overflow:"hidden",
            background:"linear-gradient(135deg,#1a0a2e 0%,#0a0014 50%,#0a0a14 100%)",
            border:"1px solid #a855f766",
            borderRadius:14, padding:"12px 14px", marginBottom:14,
            boxShadow:"0 0 24px rgba(168,85,247,0.18), inset 0 1px 0 rgba(168,85,247,0.20)",
          }}>
            {/* Shine balayage discret */}
            <div style={{ position:"absolute", top:0, left:0, bottom:0, width:80, background:"linear-gradient(90deg,transparent,#a855f722,transparent)", animation:"duelShine 5s ease-in-out infinite 1s", pointerEvents:"none" }}/>
            <div style={{ position:"relative", fontSize:10, fontWeight:900, color:"#c4b5fd", letterSpacing:2.5, marginBottom:8, textTransform:"uppercase", display:"flex", alignItems:"center", gap:6 }}>
              📌 Highlights du match
            </div>
            <div style={{ position:"relative", display:"flex", gap:8, flexWrap:"wrap" }}>
              {bestFinish > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:7, background:"linear-gradient(135deg,#2a0d4a,#1a0030)", border:"1px solid #a855f788", borderRadius:10, padding:"6px 11px", fontSize:12, boxShadow:"0 0 14px rgba(168,85,247,0.30), inset 0 1px 0 rgba(168,85,247,0.30)" }}>
                  <span style={{ fontSize:14 }}>🎯</span>
                  <span style={{ color:"#c4b5fd", fontWeight:900, textShadow:"0 0 6px #a855f7" }}>Finish {bestFinish}</span>
                </div>
              )}
              {all180 > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:7, background:"linear-gradient(135deg,#451a03,#1a0a00)", border:"1px solid #f9731688", borderRadius:10, padding:"6px 11px", fontSize:12, boxShadow:"0 0 14px rgba(249,115,22,0.28), inset 0 1px 0 rgba(249,115,22,0.30)" }}>
                  <span style={{ fontSize:14 }}>💥</span>
                  <span style={{ color:"#fdba74", fontWeight:900, textShadow:"0 0 6px #f97316" }}>{all180}×180</span>
                </div>
              )}
              {bestVolee >= 100 && bestVolee < 180 && (
                <div style={{ display:"flex", alignItems:"center", gap:7, background:"linear-gradient(135deg,#451a03,#1a1200)", border:"1px solid #fbbf2488", borderRadius:10, padding:"6px 11px", fontSize:12, boxShadow:"0 0 14px rgba(251,191,36,0.28), inset 0 1px 0 rgba(251,191,36,0.30)" }}>
                  <span style={{ fontSize:14 }}>🔥</span>
                  <span style={{ color:"#fde68a", fontWeight:900, textShadow:"0 0 6px #fbbf24" }}>Volée {bestVolee}</span>
                </div>
              )}
              {d.highlights && (
                <div style={{ flex:1, fontSize:11, color:"#94a3b8", alignSelf:"center", minWidth:120 }}>{d.highlights}</div>
              )}
            </div>
          </div>
        )}

        {/* PHRASE IA — citation esport premium avec glow bleu */}
        <div style={{
          position:"relative", overflow:"hidden",
          background:"linear-gradient(135deg,#0a1428 0%,#050518 50%,#0a0a18 100%)",
          border:"1px solid #60a5fa66",
          borderRadius:14, padding:"12px 14px 12px 16px", marginBottom:14,
          boxShadow:"0 0 20px rgba(96,165,250,0.15), inset 0 1px 0 rgba(96,165,250,0.18)",
          display:"flex", alignItems:"flex-start", gap:12,
        }}>
          {/* Guillemet décoratif */}
          <div aria-hidden style={{ position:"absolute", top:-4, left:8, fontSize:36, color:"#60a5fa", opacity:.15, fontWeight:900, lineHeight:1, pointerEvents:"none", userSelect:"none" }}>"</div>
          {/* Glow latéral */}
          <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:"linear-gradient(180deg,#60a5fa,#a78bfa)", boxShadow:"0 0 12px #60a5fa88" }}/>

          <span style={{ position:"relative", fontSize:24, lineHeight:1, filter:"drop-shadow(0 0 10px #60a5faaa)" }}>{analyseIA.emoji}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:9, fontWeight:900, color:"#60a5fa", letterSpacing:2, textTransform:"uppercase", marginBottom:3, opacity:.8 }}>Analyse du match</div>
            <div style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.5, fontStyle:"italic", fontWeight:500 }}>
              {analyseIA.text}
            </div>
          </div>
        </div>

        {/* DÉTAILS MODERNES (accordéons) — boutons premium glow */}
        <div style={{ display:"flex", gap:10 }}>
          {manches.length > 0 && (
            <button onClick={()=>setOpenManches(o=>!o)} style={{
              flex:1,
              background: openManches
                ? `linear-gradient(135deg,${themeMain}22,${themeMain}08)`
                : "linear-gradient(135deg,#15151c,#0a0a10)",
              border:`1px solid ${openManches ? themeMain+"88" : "#ffffff15"}`,
              borderRadius:12, padding:"10px",
              color: openManches ? themeMain : "#cbd5e1",
              fontWeight:800, fontSize:12, cursor:"pointer",
              touchAction:"manipulation",
              display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              boxShadow: openManches ? `0 0 14px ${themeMain}33, inset 0 1px 0 ${themeMain}33` : "inset 0 1px 0 #ffffff08",
              transition:"all .15s",
            }}>
              📊 {openManches?"Masquer":"Voir"} les manches
            </button>
          )}
          <button onClick={()=>setOpenDrix(o=>!o)} style={{
            flex:1,
            background: openDrix
              ? `linear-gradient(135deg,${winColor}22,${winColor}08)`
              : "linear-gradient(135deg,#15151c,#0a0a10)",
            border:`1px solid ${openDrix ? winColor+"88" : "#ffffff15"}`,
            borderRadius:12, padding:"10px",
            color: openDrix ? winColor : "#cbd5e1",
            fontWeight:800, fontSize:12, cursor:"pointer",
            touchAction:"manipulation",
            display:"flex", alignItems:"center", justifyContent:"center", gap:6,
            boxShadow: openDrix ? `0 0 14px ${winColor}33, inset 0 1px 0 ${winColor}33` : "inset 0 1px 0 #ffffff08",
            transition:"all .15s",
          }}>
            💎 {openDrix?"Masquer":"Voir"} les gains
          </button>
        </div>

        {openManches && (
          <div style={{ marginTop:10 }}>
            <MancheDetailList manches={manches} />
          </div>
        )}

        {openDrix && (
          <div style={{ marginTop:10, display:"flex", gap:8 }}>
            <div style={{ flex:1, background:"#0a1a0a", border:`1px solid ${winColor}33`, borderRadius:10, padding:"9px 11px" }}>
              <div style={{ fontSize:11, color:"#86efac", fontWeight:800, marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>
                <Trophy size={10} color="#86efac"/>{w.nom}
              </div>
              <DrixLine icon="📈" label="ELO" val={w.elo} color={w.elo>=0?winColor:loseColor}/>
              {w.bonusManches>0 && <DrixLine icon="💎" label={`${w.nbManches} manche(s)`} val={w.bonusManches} color="#f59e0b"/>}
              {w.bonusVolees>0 && <DrixLine icon="🔥" label={`${w.nbVolees} grosse(s) volée(s)`} val={w.bonusVolees} color="#f97316"/>}
              {w.bonusFinish>0 && <DrixLine icon="🏆" label={`${w.nbFinish} gros finish`} val={w.bonusFinish} color="#a78bfa"/>}
            </div>
            <div style={{ flex:1, background:"#1a0a0a", border:`1px solid ${loseColor}33`, borderRadius:10, padding:"9px 11px" }}>
              <div style={{ fontSize:11, color:"#fca5a5", fontWeight:800, marginBottom:6, display:"flex", alignItems:"center", gap:4 }}>
                <X size={10} color="#fca5a5"/>{l.nom}
              </div>
              <DrixLine icon="📈" label="ELO" val={l.elo} color={l.elo>=0?winColor:loseColor}/>
              {l.bonusManches>0 && <DrixLine icon="💎" label={`${l.nbManches} manche(s)`} val={l.bonusManches} color="#f59e0b"/>}
              {l.bonusVolees>0 && <DrixLine icon="🔥" label={`${l.nbVolees} grosse(s) volée(s)`} val={l.bonusVolees} color="#f97316"/>}
              {l.bonusFinish>0 && <DrixLine icon="🏆" label={`${l.nbFinish} gros finish`} val={l.bonusFinish} color="#a78bfa"/>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:"flex", gap:8, marginTop:10, paddingTop:10, borderTop:"1px solid #ffffff08" }}>
          <LikeButton refId={p.id} joueur={joueur} initialCount={likesMap[p.id]?.count||0} initialMyLike={likesMap[p.id]?.myLike||false}/>
        </div>
        <CommentSection refId={p.id} joueur={joueur} initialComments={commentsMap[p.id]||[]}/>
      </div>
    </div>
  );
};

// Petit helper réutilisable pour les lignes de breakdown DRIX
const DrixLine = ({ icon, label, val, color }) => (
  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, padding:"3px 0", borderBottom:"1px solid #ffffff06" }}>
    <span style={{ color:"#64748b" }}>{icon} {label}</span>
    <span style={{ fontWeight:800, color, fontVariantNumeric:"tabular-nums" }}>{val > 0 ? "+" : ""}{val} DRIX</span>
  </div>
);

// ── LIVE ──────────────────────────────────────────────────────────────────────

// Tronque un pseudo intelligemment
const TruncPseudo = ({ pseudo="", max=11, style={}, onClick }) => {
  const [showFull, setShowFull] = useState(false);
  const truncated = pseudo.length > max ? pseudo.slice(0, max) + "…" : pseudo;
  return (
    <span
      onClick={e=>{ if(pseudo.length>max){ e.stopPropagation(); setShowFull(v=>!v); } if(onClick) onClick(e); }}
      title={pseudo}
      style={{ cursor: pseudo.length > max ? "pointer" : "default", ...style }}>
      {showFull ? pseudo : truncated}
    </span>
  );
};

// Heatmap des 5 dernières volées
const HeatmapStrip = ({ volees=[] }) => {
  const last5 = [...volees].slice(-5);
  const getColor = (v) => {
    if (v.score === -1) return ["#7f1d1d","💥"];
    if (v.score === 180) return ["#4c1d95","💜"];
    if (v.score >= 140) return ["#1e3a5f","💎"];
    if (v.score >= 100) return ["#1c3a1c","🟢"];
    if (v.score >= 60)  return ["#2d2a1c","🟡"];
    return ["#1a1a1a","⚪"];
  };
  if (!last5.length) return null;
  return (
    <div style={{ display:"flex", gap:4, alignItems:"center" }}>
      {Array.from({length:5}).map((_,i) => {
        const v = last5[i];
        if (!v) return <div key={i} style={{ width:28,height:28,borderRadius:6,background:"#111",border:"1px solid #2a2a2a" }}/>;
        const [bg, em] = getColor(v);
        return (
          <div key={i} title={v.score===-1?"Bust":String(v.score)} style={{ width:28,height:28,borderRadius:6,background:bg,border:`1px solid ${bg}88`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12 }}>
            {em}
          </div>
        );
      })}
    </div>
  );
};

// Groupe les volées en manches en détectant reste=0
const groupVoleesByManche = (allVolees, id1, id2) => {
  const sorted = [...allVolees].sort((a,b)=>(a.date||0)-(b.date||0));
  const manches = [];
  let cur = { id:1, volees:[], winner:null };
  for (const v of sorted) {
    cur.volees.push(v);
    if (v.reste === 0 || v.reste === "0") {
      cur.winner = v.joueur_id === id1 ? 1 : 2;
      manches.push({...cur, volees:[...cur.volees]});
      cur = { id: manches.length+1, volees:[], winner:null };
    }
  }
  if (cur.volees.length) manches.push(cur);
  return manches;
};

// Dernier événement notable
const getLastEvent = (volees, pseudo1, pseudo2, id1) => {
  const last = [...volees].sort((a,b)=>(b.date||0)-(a.date||0))[0];
  if (!last) return null;
  const who = last.joueur_id === id1 ? pseudo1 : pseudo2;
  if (last.score === 180) return { emoji:"💥", text:`180 par ${who} !`, color:"#a78bfa" };
  if (last.score === -1)  return { emoji:"💀", text:`Bust de ${who}`, color:"#ef4444" };
  if (last.reste === 0)   return { emoji:"🏆", text:`${who} remporte la manche !`, color:"#f59e0b" };
  if (last.score >= 140)  return { emoji:"🔥", text:`${last.score} par ${who} !`, color:"#f97316" };
  if (last.score >= 100)  return { emoji:"🎯", text:`${last.score} par ${who}`, color:"#22c55e" };
  return null;
};

const generateLiveAI = (s) => {
  const s1 = s.stats_j1||{}, s2 = s.stats_j2||{};
  const lines = [];
  const ea = 1/(1+Math.pow(10, ((s.joueur2_drix||1000)-(s.joueur1_drix||1000))/400));
  const moy1 = s1.moy||0, moy2 = s2.moy||0;
  if (moy1 > 0 && moy2 > 0) {
    const [better, bMoy] = moy1>=moy2 ? [s.joueur1_pseudo, moy1] : [s.joueur2_pseudo, moy2];
    lines.push(`🔥 ${better} domine avec une moyenne de ${typeof bMoy==="number"?bMoy.toFixed(1):bMoy}`);
  } else if (moy1 > 0) { lines.push(`🎯 ${s.joueur1_pseudo} est en jeu — moy. ${moy1}`); }
  else if (moy2 > 0) { lines.push(`🎯 ${s.joueur2_pseudo} est en jeu — moy. ${moy2}`); }
  if ((s1.reste||999) < 120) lines.push(`🎯 ${s.joueur1_pseudo} peut finir — ${s1.reste} restants`);
  if ((s2.reste||999) < 120) lines.push(`🎯 ${s.joueur2_pseudo} peut finir — ${s2.reste} restants`);
  if ((s1.nb180||0) > 0) lines.push(`💥 ${s.joueur1_pseudo} a planté ${s1.nb180}× 180 !`);
  if ((s2.nb180||0) > 0) lines.push(`💥 ${s.joueur2_pseudo} a planté ${s2.nb180}× 180 !`);
  if ((s1.busts||0) > 1) lines.push(`⚠️ ${s.joueur1_pseudo} galère sur les doubles — ${s1.busts} busts`);
  if ((s2.busts||0) > 1) lines.push(`⚠️ ${s.joueur2_pseudo} galère sur les doubles — ${s2.busts} busts`);
  if ((s1.max_finish||0) > 0) lines.push(`✅ Meilleur finish de ${s.joueur1_pseudo} : ${s1.max_finish}`);
  if ((s2.max_finish||0) > 0) lines.push(`✅ Meilleur finish de ${s.joueur2_pseudo} : ${s2.max_finish}`);
  const adjP1 = moy1 > moy2 ? Math.min(Math.round(ea*100)+10, 92) : moy1 < moy2 ? Math.max(Math.round(ea*100)-10, 8) : Math.round(ea*100);
  lines.push(`📊 Probabilité de victoire → ${s.joueur1_pseudo} ${adjP1}% · ${s.joueur2_pseudo} ${100-adjP1}%`);
  return lines;
};

// Génère un commentaire texte pour une volée individuelle (3 fléchettes)
const commentVolee = (v, pseudo, moyGlobal=0) => {
  if (v.score === -1) return { emoji:"💀", text:`Bust ! ${pseudo} dépasse le reste — retour à ${v.reste}`, color:"#ef4444" };
  if (v.reste === 0 || v.reste === "0") return { emoji:"🏆", text:`${pseudo} GAGNE LA MANCHE ! Finish ${v.score}`, color:"#f59e0b" };
  if (v.score === 180) return { emoji:"💥", text:`180 parfait par ${pseudo} ! Score maximal sur 3 fléchettes`, color:"#a78bfa" };
  if (v.score >= 140) return { emoji:"🔥", text:`Excellente volée de ${pseudo} : ${v.score} pts — reste ${v.reste}`, color:"#f97316" };
  if (v.score >= 100) return { emoji:"🎯", text:`Bonne volée de ${pseudo} : ${v.score} pts — reste ${v.reste}`, color:"#22c55e" };
  if (v.score >= 60)  return { emoji:"✅", text:`${pseudo} marque ${v.score} — reste ${v.reste}`, color:"#6b7280" };
  if (v.score < 40 && moyGlobal > 60) return { emoji:"😬", text:`${pseudo} en dessous de sa moyenne : ${v.score} seulement — reste ${v.reste}`, color:"#ef444488" };
  return { emoji:"⚪", text:`${pseudo} : ${v.score} pts — reste ${v.reste}`, color:"#4b5563" };
};

const LiveMatchCard = ({ session:s, onClick, setPage }) => {
  const elapsed = Math.floor((Date.now()-(s.debut||Date.now()))/60000);
  const elStr = elapsed < 60 ? `${elapsed} min` : `${Math.floor(elapsed/60)}h${elapsed%60}`;
  const { emoji:e1, color:c1 } = getDrixTitre(s.joueur1_drix||1000);
  const { emoji:e2, color:c2 } = getDrixTitre(s.joueur2_drix||1000);
  const st1 = s.stats_j1||{}, st2 = s.stats_j2||{};
  const sc1 = s.score1||0, sc2 = s.score2||0;
  const leader = sc1>sc2?1:sc2>sc1?2:0;
  return (
    <div onClick={onClick} style={{ background:"linear-gradient(145deg,#12121e,#0d0d18)", border:"1px solid #ef444428", borderRadius:18, padding:"14px 16px", marginBottom:12, cursor:"pointer", position:"relative", overflow:"hidden", boxShadow:"0 4px 24px #00000066" }}>
      <style>{`@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(1.5)}}`}</style>
      {/* Glow accent bar top */}
      <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#ef444488,transparent)" }}/>

      {/* Header row */}
      <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:12 }}>
        <div style={{ display:"flex",alignItems:"center",gap:5,background:"#ef444418",border:"1px solid #ef444444",borderRadius:20,padding:"3px 9px" }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:"#ef4444",animation:"livePulse 1.4s infinite" }}/>
          <span style={{ fontSize:10,fontWeight:800,color:"#ef4444",letterSpacing:1 }}>LIVE</span>
        </div>
        <span style={{ fontSize:10,color:C.muted }}>⏱ {elStr}</span>
        <span style={{ background:"#f9731618",color:"#f97316",border:"1px solid #f9731630",borderRadius:6,padding:"2px 8px",fontSize:10,fontWeight:700 }}>{s.mode}</span>
        {s.format && <span style={{ background:"#ffffff0a",color:C.muted,borderRadius:6,padding:"2px 8px",fontSize:10 }}>{s.format}</span>}
      </div>

      {/* Scoreboard */}
      <div style={{ display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,alignItems:"center",marginBottom:10 }}>
        {/* J1 */}
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ position:"relative",flexShrink:0 }}>
            <FeedAvatar pseudo={s.joueur1_pseudo} size={38} onClick={e=>{e.stopPropagation();if(s.joueur1_id&&setPage)setPage("profil-joueur-"+s.joueur1_id);}}/>
            {leader===1 && <div style={{ position:"absolute",top:-3,right:-3,width:10,height:10,borderRadius:"50%",background:"#f59e0b",boxShadow:"0 0 8px #f59e0b" }}/>}
          </div>
          <div style={{ minWidth:0 }}>
            <TruncPseudo pseudo={s.joueur1_pseudo} max={10} style={{ fontWeight:800,fontSize:13,color:leader===1?"#fff":C.muted,display:"block" }}/>
            <div style={{ fontSize:10,color:c1,marginTop:1 }}>{e1} {s.joueur1_drix}</div>
            <div style={{ fontSize:10,color:C.muted,marginTop:2 }}>Reste <b style={{ color:leader===1?C.accent:C.muted }}>{st1.reste!=null?st1.reste:"—"}</b></div>
          </div>
        </div>

        {/* Score central */}
        <div style={{ textAlign:"center",padding:"0 6px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:6 }}>
            <span style={{ fontWeight:900,fontSize:28,color:leader===1?"#f59e0b":C.text,textShadow:leader===1?"0 0 14px #f59e0b66":"none",lineHeight:1 }}>{sc1}</span>
            <span style={{ color:"#ef4444",fontSize:14,fontWeight:800 }}>⚔</span>
            <span style={{ fontWeight:900,fontSize:28,color:leader===2?"#f59e0b":C.text,textShadow:leader===2?"0 0 14px #f59e0b66":"none",lineHeight:1 }}>{sc2}</span>
          </div>
          <div style={{ fontSize:9,color:"#ef444466",fontWeight:700,letterSpacing:1,marginTop:2 }}>MANCHES</div>
        </div>

        {/* J2 */}
        <div style={{ display:"flex",alignItems:"center",gap:8,justifyContent:"flex-end" }}>
          <div style={{ minWidth:0,textAlign:"right" }}>
            <TruncPseudo pseudo={s.joueur2_pseudo} max={10} style={{ fontWeight:800,fontSize:13,color:leader===2?"#fff":C.muted,display:"block" }}/>
            <div style={{ fontSize:10,color:c2,marginTop:1 }}>{e2} {s.joueur2_drix}</div>
            <div style={{ fontSize:10,color:C.muted,marginTop:2 }}>Reste <b style={{ color:leader===2?C.accent:C.muted }}>{st2.reste!=null?st2.reste:"—"}</b></div>
          </div>
          <div style={{ position:"relative",flexShrink:0 }}>
            <FeedAvatar pseudo={s.joueur2_pseudo} size={38} onClick={e=>{e.stopPropagation();if(s.joueur2_id&&setPage)setPage("profil-joueur-"+s.joueur2_id);}}/>
            {leader===2 && <div style={{ position:"absolute",top:-3,right:-3,width:10,height:10,borderRadius:"50%",background:"#f59e0b",boxShadow:"0 0 8px #f59e0b" }}/>}
          </div>
        </div>
      </div>

      {/* Mini stats row */}
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:8,borderTop:"1px solid #1e1e2e" }}>
        <div style={{ display:"flex",gap:10,fontSize:10,color:C.muted }}>
          <span>Moy <b style={{ color:"#f97316" }}>{st1.moy||0}</b></span>
          <span>180s <b style={{ color:"#a78bfa" }}>{st1.nb180||0}</b></span>
        </div>
        <div style={{ fontSize:11,color:"#ef444488",fontWeight:700,letterSpacing:.5 }}>👁 Regarder →</div>
        <div style={{ display:"flex",gap:10,fontSize:10,color:C.muted }}>
          <span>180s <b style={{ color:"#a78bfa" }}>{st2.nb180||0}</b></span>
          <span>Moy <b style={{ color:"#f97316" }}>{st2.moy||0}</b></span>
        </div>
      </div>
    </div>
  );
};

const LiveMatchView = ({ session:initSession, joueur, setPage, onBack }) => {
  const [session, setSession] = useState(initSession);
  const [volees, setVolees] = useState([]);
  const [aiLines, setAiLines] = useState([]);
  const [aiTick, setAiTick] = useState(0);
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState({});
  const [activeTab, setActiveTab] = useState("volees");
  const commentsEndRef = useRef(null);

  const REACTIONS = [
    { type:"feu",    emoji:"🔥", label:"Chaud" },
    { type:"finish", emoji:"🎯", label:"Finish" },
    { type:"180",    emoji:"💥", label:"180" },
    { type:"bust",   emoji:"😱", label:"Bust" },
    { type:"bravo",  emoji:"👏", label:"Bravo" },
  ];

  const loadData = useCallback(async () => {
    if (!initSession?.id) return;
    try {
      const [sess, vs, coms, reacs] = await Promise.all([
        sb(`live_sessions?id=eq.${initSession.id}&select=*`).then(d=>d?.[0]||session).catch(()=>session),
        sb(`live_volees?session_id=eq.${initSession.id}&order=date.asc&select=*`).catch(()=>[]),
        sb(`live_comments?session_id=eq.${initSession.id}&order=date.asc&select=*`).catch(()=>[]),
        sb(`live_reactions?session_id=eq.${initSession.id}&select=*`).catch(()=>[]),
      ]);
      setSession(sess);
      setVolees(vs||[]);
      setComments(coms||[]);
      const rMap = {};
      (reacs||[]).forEach(r => { rMap[r.type] = (rMap[r.type]||0)+1; });
      setReactions(rMap);
      const newTick = Math.floor((vs||[]).length/2);
      if (newTick !== aiTick) { setAiLines(generateLiveAI(sess)); setAiTick(newTick); }
    } catch(e) {}
  }, [initSession?.id, aiTick]);

  useEffect(() => { loadData(); const iv = setInterval(loadData, 8000); return () => clearInterval(iv); }, [loadData]);
  useEffect(() => { commentsEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [comments.length]);

  const sendComment = async () => {
    if (!comment.trim() || !joueur) return;
    try {
      await sb("live_comments", { method:"POST", body:JSON.stringify({ session_id:initSession.id, joueur_id:joueur.id, joueur_pseudo:joueur.pseudo, joueur_photo:joueur.photo||null, contenu:comment.trim(), date:Date.now() }) });
      setComment(""); loadData();
    } catch(e) {}
  };

  const sendReaction = async (type) => {
    if (!joueur) return;
    try {
      await sb("live_reactions", { method:"POST", body:JSON.stringify({ session_id:initSession.id, joueur_id:joueur.id, type }) });
      setReactions(r => ({ ...r, [type]:(r[type]||0)+1 }));
    } catch(e) {}
  };

  const s1 = session.stats_j1||{}, s2 = session.stats_j2||{};
  const { emoji:e1, color:c1 } = getDrixTitre(session.joueur1_drix||1000);
  const { emoji:e2, color:c2 } = getDrixTitre(session.joueur2_drix||1000);
  const elapsed = Math.floor((Date.now()-(session.debut||Date.now()))/60000);
  const elStr = elapsed < 60 ? `${elapsed}min` : `${Math.floor(elapsed/60)}h${elapsed%60}`;
  const vJ1 = volees.filter(v=>v.joueur_id===session.joueur1_id);
  const vJ2 = volees.filter(v=>v.joueur_id===session.joueur2_id);
  const sc1 = session.score1||0, sc2 = session.score2||0;
  const leader = sc1 > sc2 ? 1 : sc2 > sc1 ? 2 : 0;
  const totalReacs = Object.values(reactions).reduce((a,b)=>a+b,0);
  const isFinished = session.statut === "termine";
  const lastEvent = getLastEvent(volees, session.joueur1_pseudo, session.joueur2_pseudo, session.joueur1_id);
  const manches = groupVoleesByManche(volees, session.joueur1_id, session.joueur2_id);

  /* ── helpers ── */
  const volee_color = (v) => {
    if (v.score === -1) return "#ef4444";
    if (v.score === 180) return "#a78bfa";
    if (v.score >= 140) return "#60a5fa";
    if (v.score >= 100) return "#f97316";
    if (v.score >= 60)  return "#22c55e";
    return C.muted;
  };

  /* ── Tab bar ── */
  const tabBtn = (key, label, badge=0) => (
    <button key={key} onClick={()=>setActiveTab(key)} style={{ flex:1,padding:"9px 4px",border:"none",borderRadius:9,fontWeight:700,fontSize:11,cursor:"pointer",transition:"all .15s",background:activeTab===key?"#f97316":"transparent",color:activeTab===key?"#fff":C.muted,position:"relative",display:"flex",alignItems:"center",justifyContent:"center",gap:4 }}>
      {label}
      {badge>0&&<span style={{ background:"#ef4444",color:"#fff",borderRadius:"50%",minWidth:14,height:14,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800 }}>{badge}</span>}
    </button>
  );

  /* ── stat comparison row ── */
  const StatCompare = ({ label, v1, v2, higherBetter=true, format=x=>x }) => {
    const n1 = parseFloat(v1)||0, n2 = parseFloat(v2)||0;
    const max = Math.max(n1,n2,1);
    const win1 = higherBetter ? n1>=n2 : n1<=n2;
    const win2 = higherBetter ? n2>=n1 : n2<=n1;
    return (
      <div style={{ marginBottom:10 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4 }}>
          <span style={{ fontWeight:700,fontSize:13,color:win1&&n1>0?"#fff":C.muted }}>{format(v1)||"—"}</span>
          <span style={{ fontSize:10,color:C.muted,textAlign:"center",flex:1 }}>{label}</span>
          <span style={{ fontWeight:700,fontSize:13,color:win2&&n2>0?"#fff":C.muted,textAlign:"right" }}>{format(v2)||"—"}</span>
        </div>
        <div style={{ display:"flex",gap:2,height:4,borderRadius:4,overflow:"hidden" }}>
          <div style={{ flex:n1/max||0,background:win1&&n1>0?c1:"#2a2a2a",borderRadius:4,transition:"flex .4s" }}/>
          <div style={{ flex:n2/max||0,background:win2&&n2>0?c2:"#2a2a2a",borderRadius:4,transition:"flex .4s" }}/>
        </div>
      </div>
    );
  };

  /* ── End-of-match recap ── */
  if (isFinished) {
    const winnerPseudo = sc1>sc2?session.joueur1_pseudo:sc2>sc1?session.joueur2_pseudo:null;
    const winnerColor = sc1>sc2?c1:c2;
    return (
      <div style={{ maxWidth:700,margin:"0 auto",padding:"16px" }}>
        <style>{`@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.35)}} @keyframes liveGoldShine{0%,100%{box-shadow:0 0 24px #f59e0b44}50%{box-shadow:0 0 48px #f59e0baa}}`}</style>
        <button onClick={onBack} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",marginBottom:12,fontSize:13 }}>← Retour aux matchs</button>
        <div style={{ background:"linear-gradient(145deg,#12121e,#0d0d18)",border:"1px solid #f59e0b66",borderRadius:20,padding:24,textAlign:"center",animation:"liveGoldShine 2s infinite" }}>
          <div style={{ fontSize:48,marginBottom:8 }}>🏆</div>
          <div style={{ fontSize:13,color:"#f59e0b",fontWeight:700,letterSpacing:2,marginBottom:4 }}>MATCH TERMINÉ</div>
          {winnerPseudo && <div style={{ fontSize:22,fontWeight:900,color:winnerColor,marginBottom:16 }}>{winnerPseudo} remporte la partie !</div>}
          <div style={{ display:"flex",justifyContent:"center",gap:24,marginBottom:20 }}>
            <div>
              <div style={{ fontSize:11,color:C.muted,marginBottom:2 }}>{session.joueur1_pseudo}</div>
              <div style={{ fontSize:48,fontWeight:900,color:sc1>sc2?"#f59e0b":C.muted,lineHeight:1 }}>{sc1}</div>
            </div>
            <div style={{ fontSize:20,color:C.muted,alignSelf:"center" }}>—</div>
            <div>
              <div style={{ fontSize:11,color:C.muted,marginBottom:2 }}>{session.joueur2_pseudo}</div>
              <div style={{ fontSize:48,fontWeight:900,color:sc2>sc1?"#f59e0b":C.muted,lineHeight:1 }}>{sc2}</div>
            </div>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,maxWidth:320,margin:"0 auto" }}>
            {[["Moy.", s1.moy?.toFixed?.(1)||"—", s2.moy?.toFixed?.(1)||"—"],["180s", s1.nb180||0, s2.nb180||0],["Meilleur finish", s1.max_finish||"—", s2.max_finish||"—"],["Busts", s1.busts||0, s2.busts||0]].map(([lbl,v1,v2])=>(
              <div key={lbl} style={{ background:"#ffffff08",borderRadius:10,padding:"8px 10px" }}>
                <div style={{ fontSize:10,color:C.muted,marginBottom:4 }}>{lbl}</div>
                <div style={{ display:"flex",justifyContent:"space-between" }}>
                  <span style={{ fontWeight:700,fontSize:13,color:c1 }}>{v1}</span>
                  <span style={{ fontWeight:700,fontSize:13,color:c2 }}>{v2}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth:700,margin:"0 auto",padding:"12px 16px 24px" }}>
      <style>{`@keyframes livePulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.35)}} @keyframes liveEventSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Back row ── */}
      <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
        <button onClick={onBack} style={{ background:"#1a1a2a",border:"1px solid #2a2a3a",color:C.muted,cursor:"pointer",borderRadius:10,padding:"6px 12px",fontSize:12,fontWeight:600 }}>← Retour</button>
        <div style={{ display:"flex",gap:6,marginLeft:"auto" }}>
          <span style={{ background:"#1a1a2a",color:C.muted,borderRadius:8,padding:"4px 10px",fontSize:11,fontWeight:600 }}>{session.mode}</span>
          {session.format&&<span style={{ background:"#1a1a2a",color:C.muted,borderRadius:8,padding:"4px 10px",fontSize:11 }}>{session.format}</span>}
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:5,background:"#1a0808",border:"1px solid #ef444430",borderRadius:10,padding:"4px 10px" }}>
          <div style={{ width:6,height:6,borderRadius:"50%",background:"#ef4444",animation:"livePulse 1.2s infinite" }}/>
          <span style={{ fontSize:11,fontWeight:800,color:"#ef4444" }}>LIVE</span>
          <span style={{ fontSize:10,color:C.muted }}>{elStr}</span>
          {totalReacs>0&&<span style={{ fontSize:10,color:C.muted }}>· {totalReacs} 🔥</span>}
        </div>
      </div>

      {/* ── Main scoreboard ── */}
      <div style={{ background:"linear-gradient(145deg,#12121e 0%,#0d0d18 60%,#100a1a 100%)",border:"1px solid #1e1e30",borderRadius:20,padding:"18px 14px 14px",marginBottom:10,position:"relative",overflow:"hidden" }}>
        {/* top glow bar */}
        <div style={{ position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${c1},#f97316,${c2})`,borderRadius:"20px 20px 0 0" }}/>

        {/* ── Joueur 1 ── */}
        <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
          <div style={{ position:"relative",flexShrink:0 }}>
            <FeedAvatar pseudo={session.joueur1_pseudo} size={44} onClick={()=>session.joueur1_id&&setPage("profil-joueur-"+session.joueur1_id)}/>
            {leader===1&&<div style={{ position:"absolute",top:-4,right:-4,width:14,height:14,borderRadius:"50%",background:"#f59e0b",border:"2px solid #12121e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7 }}>★</div>}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <TruncPseudo pseudo={session.joueur1_pseudo} max={13} style={{ fontWeight:800,fontSize:14,color:leader===1?"#fff":C.muted,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}/>
            <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:1 }}>
              <span style={{ fontSize:10,color:c1,fontWeight:700 }}>{e1} {session.joueur1_drix}</span>
              <span style={{ fontSize:10,color:"#f97316",fontWeight:700 }}>Moy {typeof s1.moy==="number"?s1.moy.toFixed(1):s1.moy||"—"}</span>
              {(s1.nb180||0)>0&&<span style={{ fontSize:10,color:"#a78bfa" }}>💥×{s1.nb180}</span>}
            </div>
            <div style={{ fontSize:10,color:C.muted,marginTop:1 }}>Reste : <b style={{ color:leader===1?"#f59e0b":C.text }}>{s1.reste!=null?s1.reste:"—"}</b></div>
            <div style={{ marginTop:4 }}><HeatmapStrip volees={vJ1}/></div>
          </div>
          <div style={{ flexShrink:0,textAlign:"right" }}>
            <div style={{ fontWeight:900,fontSize:40,lineHeight:1,color:leader===1?"#f59e0b":C.text,textShadow:leader===1?"0 0 18px #f59e0b88":"none",transition:"all .3s",minWidth:36,textAlign:"center" }}>{sc1}</div>
          </div>
        </div>

        {/* ── Séparateur ⚔ ── */}
        <div style={{ display:"flex",alignItems:"center",gap:8,margin:"6px 0" }}>
          <div style={{ flex:1,height:1,background:"#1e1e30" }}/>
          <span style={{ fontSize:16,color:"#2a2a3a",fontWeight:900 }}>⚔</span>
          <div style={{ flex:1,height:1,background:"#1e1e30" }}/>
        </div>

        {/* ── Joueur 2 ── */}
        <div style={{ display:"flex",alignItems:"center",gap:10,marginTop:8 }}>
          <div style={{ position:"relative",flexShrink:0 }}>
            <FeedAvatar pseudo={session.joueur2_pseudo} size={44} onClick={()=>session.joueur2_id&&setPage("profil-joueur-"+session.joueur2_id)}/>
            {leader===2&&<div style={{ position:"absolute",top:-4,right:-4,width:14,height:14,borderRadius:"50%",background:"#f59e0b",border:"2px solid #12121e",display:"flex",alignItems:"center",justifyContent:"center",fontSize:7 }}>★</div>}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <TruncPseudo pseudo={session.joueur2_pseudo} max={13} style={{ fontWeight:800,fontSize:14,color:leader===2?"#fff":C.muted,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}/>
            <div style={{ display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginTop:1 }}>
              <span style={{ fontSize:10,color:c2,fontWeight:700 }}>{e2} {session.joueur2_drix}</span>
              <span style={{ fontSize:10,color:"#f97316",fontWeight:700 }}>Moy {typeof s2.moy==="number"?s2.moy.toFixed(1):s2.moy||"—"}</span>
              {(s2.nb180||0)>0&&<span style={{ fontSize:10,color:"#a78bfa" }}>💥×{s2.nb180}</span>}
            </div>
            <div style={{ fontSize:10,color:C.muted,marginTop:1 }}>Reste : <b style={{ color:leader===2?"#f59e0b":C.text }}>{s2.reste!=null?s2.reste:"—"}</b></div>
            <div style={{ marginTop:4 }}><HeatmapStrip volees={vJ2}/></div>
          </div>
          <div style={{ flexShrink:0,textAlign:"right" }}>
            <div style={{ fontWeight:900,fontSize:40,lineHeight:1,color:leader===2?"#f59e0b":C.text,textShadow:leader===2?"0 0 18px #f59e0b88":"none",transition:"all .3s",minWidth:36,textAlign:"center" }}>{sc2}</div>
          </div>
        </div>
      </div>

      {/* ── Last event banner ── */}
      {lastEvent && (
        <div key={lastEvent.text} style={{ background:`${lastEvent.color}18`,border:`1px solid ${lastEvent.color}44`,borderRadius:12,padding:"8px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:8,animation:"liveEventSlide .3s ease" }}>
          <span style={{ fontSize:18 }}>{lastEvent.emoji}</span>
          <span style={{ fontSize:13,fontWeight:700,color:lastEvent.color }}>{lastEvent.text}</span>
        </div>
      )}

      {/* ── Réactions ── */}
      <div style={{ display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:2 }}>
        {REACTIONS.map(r => (
          <button key={r.type} onClick={()=>sendReaction(r.type)} style={{ display:"flex",alignItems:"center",gap:5,background:(reactions[r.type]||0)>0?"#1e1e30":"#111118",border:`1px solid ${(reactions[r.type]||0)>0?"#f9731644":"#1e1e30"}`,borderRadius:20,padding:"6px 12px",cursor:"pointer",flexShrink:0,transition:"all .15s" }}>
            <span style={{ fontSize:15 }}>{r.emoji}</span>
            <span style={{ fontSize:10,color:(reactions[r.type]||0)>0?"#f97316":C.muted,fontWeight:700 }}>{r.label}</span>
            {(reactions[r.type]||0)>0&&<span style={{ fontSize:11,fontWeight:800,color:"#f97316" }}>{reactions[r.type]}</span>}
          </button>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:"flex",background:"#0b0b16",border:"1px solid #1e1e30",borderRadius:12,padding:4,gap:2,marginBottom:14 }}>
        {tabBtn("volees","🎯 Volées")}
        {tabBtn("stats","📊 Stats")}
        {tabBtn("ai","📋 Résumé")}
        {tabBtn("comments","💬 Live",comments.length)}
      </div>

      {/* ══ VOLÉES tab ══ */}
      {activeTab==="volees" && (
        <div>
          {manches.length===0 ? (
            <div style={{ textAlign:"center",padding:"32px 0",color:C.muted,fontSize:14 }}>
              <div style={{ fontSize:32,marginBottom:8 }}>⏳</div>
              En attente des premières volées…
            </div>
          ) : [...manches].reverse().map((manche, mi) => {
            const mancheNum = manches.length - mi;
            const vM1 = manche.volees.filter(v=>v.joueur_id===session.joueur1_id);
            const vM2 = manche.volees.filter(v=>v.joueur_id===session.joueur2_id);
            const maxRows = Math.max(vM1.length, vM2.length);
            const isCurrentManche = mi === 0 && !manche.winner;
            return (
              <div key={manche.id} style={{ marginBottom:12,border:`1px solid ${isCurrentManche?"#f9731644":"#1e1e30"}`,borderRadius:14,overflow:"hidden" }}>
                {/* Manche header */}
                <div style={{ background:isCurrentManche?"#1a0e00":"#0f0f1a",padding:"8px 14px",display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <span style={{ fontSize:12,fontWeight:700,color:isCurrentManche?"#f97316":C.muted }}>
                    {isCurrentManche&&<span style={{ display:"inline-block",width:6,height:6,borderRadius:"50%",background:"#ef4444",animation:"livePulse 1.2s infinite",marginRight:6 }}/>}
                    Manche {mancheNum}
                  </span>
                  {manche.winner && (
                    <span style={{ fontSize:11,fontWeight:700,color:"#f59e0b" }}>
                      🏆 {manche.winner===1?session.joueur1_pseudo:session.joueur2_pseudo}
                    </span>
                  )}
                </div>
                {/* Column headers */}
                <div style={{ display:"grid",gridTemplateColumns:"1fr 40px 40px 1fr",gap:0,background:"#0b0b14",padding:"5px 14px",borderBottom:"1px solid #1e1e30" }}>
                  <span style={{ fontSize:10,fontWeight:700,color:c1 }}>{session.joueur1_pseudo.slice(0,9)}</span>
                  <span style={{ fontSize:9,color:C.muted,textAlign:"center" }}>Score</span>
                  <span style={{ fontSize:9,color:C.muted,textAlign:"center" }}>Score</span>
                  <span style={{ fontSize:10,fontWeight:700,color:c2,textAlign:"right" }}>{session.joueur2_pseudo.slice(0,9)}</span>
                </div>
                {/* Volées rows */}
                {Array.from({length:maxRows}).map((_,ri)=>{
                  const v1 = vM1[ri], v2 = vM2[ri];
                  return (
                    <div key={ri} style={{ display:"grid",gridTemplateColumns:"1fr 40px 40px 1fr",gap:0,padding:"5px 14px",borderBottom:ri<maxRows-1?"1px solid #1a1a28":"none",background:ri%2===0?"transparent":"#ffffff03" }}>
                      {/* J1 reste */}
                      <span style={{ fontSize:11,color:C.muted }}>{v1?v1.reste:""}</span>
                      {/* J1 score */}
                      <span style={{ fontSize:12,fontWeight:700,color:v1?volee_color(v1):"transparent",textAlign:"center" }}>{v1?(v1.score===-1?"💥":v1.score):""}</span>
                      {/* J2 score */}
                      <span style={{ fontSize:12,fontWeight:700,color:v2?volee_color(v2):"transparent",textAlign:"center" }}>{v2?(v2.score===-1?"💥":v2.score):""}</span>
                      {/* J2 reste */}
                      <span style={{ fontSize:11,color:C.muted,textAlign:"right" }}>{v2?v2.reste:""}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* ══ STATS tab ══ */}
      {activeTab==="stats" && (
        <div style={{ background:"#0b0b16",border:"1px solid #1e1e30",borderRadius:16,padding:16 }}>
          {/* player name headers */}
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:16 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              <FeedAvatar pseudo={session.joueur1_pseudo} size={28}/>
              <span style={{ fontSize:12,fontWeight:700,color:c1 }}>{session.joueur1_pseudo}</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:6,flexDirection:"row-reverse" }}>
              <FeedAvatar pseudo={session.joueur2_pseudo} size={28}/>
              <span style={{ fontSize:12,fontWeight:700,color:c2 }}>{session.joueur2_pseudo}</span>
            </div>
          </div>
          <StatCompare label="Moyenne" v1={typeof s1.moy==="number"?s1.moy.toFixed(1):s1.moy||0} v2={typeof s2.moy==="number"?s2.moy.toFixed(1):s2.moy||0} higherBetter={true} format={x=>x}/>
          <StatCompare label="Volées jouées" v1={s1.volees||vJ1.length} v2={s2.volees||vJ2.length} higherBetter={false}/>
          <StatCompare label="180s" v1={s1.nb180||0} v2={s2.nb180||0} higherBetter={true}/>
          <StatCompare label="Meilleur finish" v1={s1.max_finish||0} v2={s2.max_finish||0} higherBetter={true}/>
          <StatCompare label="Busts" v1={s1.busts||0} v2={s2.busts||0} higherBetter={false}/>
          <div style={{ marginTop:14,padding:"10px 12px",background:"#ffffff05",borderRadius:10 }}>
            <div style={{ fontSize:10,color:C.muted,marginBottom:6 }}>RESTE ACTUEL</div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"baseline" }}>
              <span style={{ fontSize:28,fontWeight:900,color:c1 }}>{s1.reste!=null?s1.reste:"—"}</span>
              <span style={{ fontSize:11,color:C.muted }}>restant</span>
              <span style={{ fontSize:28,fontWeight:900,color:c2 }}>{s2.reste!=null?s2.reste:"—"}</span>
            </div>
          </div>
          {/* Heatmaps */}
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:10,color:C.muted,marginBottom:8 }}>5 DERNIÈRES VOLÉES</div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <HeatmapStrip volees={vJ1}/>
              <HeatmapStrip volees={vJ2}/>
            </div>
          </div>
        </div>
      )}

      {/* ══ RÉSUMÉ tab ══ */}
      {activeTab==="ai" && (
        <div>
          {/* Synthèse globale */}
          {aiLines.length > 0 && (
            <div style={{ background:"linear-gradient(145deg,#0d0f1a,#14102a)",border:"1px solid #a78bfa33",borderRadius:14,padding:14,marginBottom:12 }}>
              <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
                <span style={{ fontSize:16 }}>🤖</span>
                <span style={{ fontWeight:800,fontSize:13,color:"#a78bfa" }}>Synthèse</span>
              </div>
              {aiLines.map((line,i)=>(
                <div key={i} style={{ padding:"7px 10px",marginBottom:5,background:"#ffffff08",borderRadius:8,fontSize:12,lineHeight:1.5,color:C.text }}>{line}</div>
              ))}
            </div>
          )}

          {/* Analyse volée par volée */}
          <div style={{ background:"#0b0b16",border:"1px solid #1e1e30",borderRadius:14,padding:14 }}>
            <div style={{ fontWeight:800,fontSize:13,color:C.text,marginBottom:12,display:"flex",alignItems:"center",gap:6 }}>
              🎯 <span>Analyse des 3 fléchettes</span>
              <span style={{ fontSize:10,color:C.muted,fontWeight:400,marginLeft:2 }}>— volée par volée</span>
            </div>
            {volees.length === 0 ? (
              <div style={{ color:C.muted,fontSize:13,textAlign:"center",padding:"20px 0" }}>
                <div style={{ fontSize:26,marginBottom:6 }}>📡</div>
                En attente des premières volées…
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                {[...volees].sort((a,b)=>(b.date||0)-(a.date||0)).map((v,i) => {
                  const pseudo = v.joueur_id === session.joueur1_id ? session.joueur1_pseudo : session.joueur2_pseudo;
                  const moy = v.joueur_id === session.joueur1_id ? (s1.moy||0) : (s2.moy||0);
                  const { emoji, text, color } = commentVolee(v, pseudo, moy);
                  return (
                    <div key={v.id||i} style={{ display:"flex",gap:8,alignItems:"flex-start",padding:"8px 10px",background:"#ffffff05",border:`1px solid ${color}28`,borderRadius:10 }}>
                      <span style={{ fontSize:16,flexShrink:0 }}>{emoji}</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <span style={{ fontSize:12,color,lineHeight:1.5 }}>{text}</span>
                        <div style={{ fontSize:9,color:C.muted,marginTop:2 }}>{tempsDepuis(v.date)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ COMMENTS tab ══ */}
      {activeTab==="comments" && (
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          <div style={{ maxHeight:340,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,paddingRight:4 }}>
            {comments.length===0 ? (
              <div style={{ color:C.muted,fontSize:13,textAlign:"center",padding:"32px 0" }}>
                <div style={{ fontSize:28,marginBottom:8 }}>💬</div>
                Sois le premier à commenter !
              </div>
            ) : comments.map((c,i)=>(
              <div key={c.id||i} style={{ display:"flex",gap:8,alignItems:"flex-start" }}>
                <FeedAvatar photo={c.joueur_photo} pseudo={c.joueur_pseudo} size={30} onClick={()=>c.joueur_id&&setPage("profil-joueur-"+c.joueur_id)}/>
                <div style={{ background:"#12121e",border:"1px solid #1e1e30",borderRadius:12,padding:"7px 12px",flex:1,maxWidth:"100%" }}>
                  <span style={{ fontWeight:700,fontSize:11,color:"#f97316" }}>{c.joueur_pseudo} </span>
                  <span style={{ fontSize:13,color:C.text,wordBreak:"break-word" }}>{c.contenu}</span>
                  <div style={{ fontSize:9,color:C.muted,marginTop:4 }}>{tempsDepuis(c.date)}</div>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef}/>
          </div>
          {joueur ? (
            <div style={{ display:"flex",gap:8,alignItems:"center",background:"#0b0b16",border:"1px solid #1e1e30",borderRadius:14,padding:"8px 10px" }}>
              <FeedAvatar photo={joueur.photo} pseudo={joueur.pseudo} size={28}/>
              <input value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendComment()} placeholder="Commenter le match…" maxLength={200}
                style={{ flex:1,background:"transparent",border:"none",color:C.text,fontSize:13,outline:"none",fontFamily:"inherit" }}/>
              <button onClick={sendComment} disabled={!comment.trim()} style={{ background:comment.trim()?"#f97316":"#1e1e30",border:"none",borderRadius:10,padding:"7px 14px",color:comment.trim()?"#fff":C.muted,cursor:comment.trim()?"pointer":"default",fontWeight:700,fontSize:12,transition:"all .15s",flexShrink:0 }}>
                Envoyer
              </button>
            </div>
          ) : (
            <div style={{ color:C.muted,fontSize:12,textAlign:"center",padding:"8px 0" }}>
              <span style={{ color:"#f97316",cursor:"pointer",fontWeight:700 }} onClick={()=>setPage("connexion")}>Connecte-toi</span> pour commenter
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PageLive = ({ joueur, setPage }) => {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amiIds, setAmiIds] = useState([]);
  const [filter, setFilter] = useState("tous");
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    if (!joueur?.id) { setLoading(false); return; }
    Promise.all([
      sb(`amis?joueur_id=eq.${joueur.id}&statut=eq.accepte&select=ami_id`).catch(()=>[]),
      sb(`amis?ami_id=eq.${joueur.id}&statut=eq.accepte&select=joueur_id`).catch(()=>[]),
    ]).then(([a,b]) => {
      const ids = [joueur.id,...(a||[]).map(x=>x.ami_id),...(b||[]).map(x=>x.joueur_id)].filter((v,i,arr)=>arr.indexOf(v)===i);
      setAmiIds(ids);
    });
  }, [joueur?.id]);

  useEffect(() => {
    if (!amiIds.length) return;
    let cancelled = false;
    const STALE_MS = 2 * 60 * 60 * 1000; // 2 heures sans activité → session zombie
    const load = async () => {
      try {
        const inList = amiIds.join(",");
        const data = await sb(`live_sessions?statut=eq.en_cours&or=(joueur1_id.in.(${inList}),joueur2_id.in.(${inList}))&order=debut.desc`).catch(()=>[]);
        const now = Date.now();
        const fresh = (data||[]).filter(s => (now - (s.debut||now)) < STALE_MS);
        const stale = (data||[]).filter(s => (now - (s.debut||now)) >= STALE_MS);

        // Auto-cleanup des sessions zombies de l'utilisateur courant (et de ses amis qui sont participants)
        const myId = String(joueur?.id||"");
        const myStale = stale.filter(s => String(s.joueur1_id||"") === myId || String(s.joueur2_id||"") === myId);
        for (const z of myStale) {
          sb(`live_sessions?id=eq.${z.id}`, { method:"PATCH", body:JSON.stringify({ statut:"abandonne" }), prefer:"return=minimal" }).catch(()=>{});
        }

        if (!cancelled) { setSessions(fresh); setLoading(false); }
      } catch(e) { if (!cancelled) setLoading(false); }
    };
    load();
    const iv = setInterval(load, 10000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [amiIds, joueur?.id]);

  if (selected) return <LiveMatchView session={selected} joueur={joueur} setPage={setPage} onBack={()=>setSelected(null)}/>;

  const filtered = sessions
    .filter(s => filter==="tous" || s.mode===filter)
    .sort((a,b) => {
      if (sort==="serre") return Math.abs((a.score1||0)-(a.score2||0)) - Math.abs((b.score1||0)-(b.score2||0));
      if (sort==="drix") return ((b.joueur1_drix||1000)+(b.joueur2_drix||1000))-((a.joueur1_drix||1000)+(a.joueur2_drix||1000));
      return (b.debut||0)-(a.debut||0);
    });

  return (
    <div>
      <div style={{ display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center" }}>
        {["tous","501","301","Cricket"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ background:filter===f?"#ef444422":"#1a1a1a",border:`1px solid ${filter===f?"#ef4444":"#2a2a2a"}`,color:filter===f?"#ef4444":C.muted,borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer" }}>
            {f==="tous"?"Tous":f}
          </button>
        ))}
        <select value={sort} onChange={e=>setSort(e.target.value)} style={{ marginLeft:"auto",background:"#1a1a1a",border:`1px solid #2a2a2a`,color:C.text,borderRadius:8,padding:"5px 10px",fontSize:12 }}>
          <option value="recent">Plus récent</option>
          <option value="serre">Plus serré</option>
          <option value="drix">Plus haut niveau</option>
        </select>
      </div>
      {loading ? (
        <div style={{ textAlign:"center",color:C.muted,padding:48 }}>⏳ Chargement…</div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:"center",padding:"48px 16px" }}>
          <div style={{ fontSize:48,marginBottom:12 }}>🎯</div>
          <div style={{ fontWeight:700,fontSize:18,marginBottom:8 }}>Aucun match en cours</div>
          <div style={{ fontSize:13,color:C.muted,lineHeight:1.6 }}>Les parties de tes amis apparaissent ici en temps réel dès qu'ils lancent le scoreur.</div>
        </div>
      ) : filtered.map(s=>(
        <LiveMatchCard key={s.id} session={s} onClick={()=>setSelected(s)} setPage={setPage}/>
      ))}
    </div>
  );
};

// ── PAGE COMMUNAUTÉ ────────────────────────────────────────────────────────────
const PageCommunaute = ({ joueur, setPage, bars }) => {
  const [mainTab, setMainTab] = useState("feed");
  const [feed, setFeed] = useState([]);
  const [photosMap, setPhotosMap] = useState({});
  const [likesMap, setLikesMap] = useState({});
  const [commentsMap, setCommentsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [texte, setTexte] = useState("");
  const [posting, setPosting] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [liveCount, setLiveCount] = useState(0);

  const chargerFeed = useCallback(async () => {
    if (!joueur?.id) return;
    setErreur(null);
    try {
      // 1. Récupérer les IDs amis
      const [amisA, amisB] = await Promise.all([
        sb(`amis?joueur_id=eq.${joueur.id}&statut=eq.accepte&select=ami_id`).catch(()=>[]),
        sb(`amis?ami_id=eq.${joueur.id}&statut=eq.accepte&select=joueur_id`).catch(()=>[]),
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

      // Signatures des DuelPosts déjà dans le feed (fenêtre 10 min + duel_id si dispo)
      const duelPostSignatures = new Set();
      (posts||[]).forEach(p => {
        if (!p.contenu?.startsWith("__DUEL__|")) return;
        try {
          const parsed = JSON.parse(p.contenu.slice(9));
          if (parsed?.duel_id) duelPostSignatures.add(`id_${parsed.duel_id}`);
        } catch {}
        const w = Math.floor(p.date / 600000);
        duelPostSignatures.add(`t_${p.joueur_id}_${w}`);
      });

      // Matchs terminés — on saute ceux couverts par un DuelPost
      const seenDuels = new Set();
      (duels||[]).forEach(d => {
        if (!d?.id || seenDuels.has(d.id)) return;
        seenDuels.add(d.id);
        const ts = typeof d.date === "number" ? d.date : new Date(d.date).getTime();
        const w = Math.floor(ts / 600000);
        if (
          duelPostSignatures.has(`id_${d.id}`) ||
          duelPostSignatures.has(`t_${d.challenger_id}_${w}`) ||
          duelPostSignatures.has(`t_${d.defie_id}_${w}`)
        ) return; // doublon → DuelPost s'en charge
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

  // Live match count badge (refreshes every 30s)
  useEffect(() => {
    if (!joueur?.id) return;
    const fetchLive = () =>
      sb(`live_sessions?statut=eq.en_cours&select=id`).catch(()=>[])
        .then(r => setLiveCount((r||[]).length));
    fetchLive();
    const iv = setInterval(fetchLive, 30000);
    return () => clearInterval(iv);
  }, [joueur?.id]);

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
  const cardBase = {
    position:"relative", overflow:"hidden",
    background:"linear-gradient(160deg,#0e0e14,#0b0b10)",
    border:`1px solid #ffffff0e`,
    borderRadius:16, padding:"14px 16px", marginBottom:12,
    boxShadow:"0 2px 16px rgba(0,0,0,0.35)",
    animation:"feedIn .3s ease-out both",
  };

  const renderPost = (item) => {
    const p = item.data;

    // ── Duel post (breakdown DRIX) ───────────────────────────────────────────
    if (p.contenu?.startsWith("__DUEL__|")) {
      let d = null;
      try { d = JSON.parse(p.contenu.slice(9)); } catch {}
      if (d) return (
        <DuelPost key={`post-${p.id}`} p={p} d={d} C={C} cardBase={cardBase}
          joueur={joueur} likesMap={likesMap} commentsMap={commentsMap}
          tempsDepuis={tempsDepuis} setPage={setPage}/>
      );
    }

    // ── Badge post ──────────────────────────────────────────────────────────
    if (p.contenu?.startsWith("__BADGE__|")) {
      let badge = null;
      try { badge = JSON.parse(p.contenu.slice(10)); } catch {}
      if (badge) {
        // Rarity system
        const rarete = badge.rarete || "commun";
        const rareteConfig = {
          legendaire: { label:"LÉGENDAIRE", color:"#f59e0b", bg:"#451a03", border:"#f59e0b66", glow:"rgba(245,158,11,0.35)", shimmer:true },
          epique:     { label:"ÉPIQUE",     color:"#a855f7", bg:"#2e1065", border:"#a855f766", glow:"rgba(168,85,247,0.3)", shimmer:true },
          rare:       { label:"RARE",       color:"#3b82f6", bg:"#1e3a5f", border:"#3b82f655", glow:"rgba(59,130,246,0.2)", shimmer:false },
          commun:     { label:"COMMUN",     color:"#64748b", bg:"#1e293b", border:"#64748b44", glow:"rgba(100,116,139,0.1)", shimmer:false },
        };
        const rc = rareteConfig[rarete] || rareteConfig.commun;
        const isEpicPlus = rarete === "epique" || rarete === "legendaire";
        return (
          <div key={`post-${p.id}`} style={{
            ...cardBase,
            background:`linear-gradient(160deg,${rc.bg},#0b0b10)`,
            border:`1px solid ${rc.border}`,
            boxShadow:`0 0 30px ${rc.glow}, 0 2px 16px rgba(0,0,0,0.4)`,
          }}>
            {/* Animated top stripe */}
            <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${badge.couleur||rc.color},${rc.color},${badge.couleur||rc.color})`,backgroundSize:"300% 100%",animation:"feedGlow 3s ease infinite" }}/>
            <div style={{ padding:"2px 0 0" }}>
              {/* Rarity banner */}
              <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
                {rarete==="legendaire" && <Crown size={12} color="#f59e0b"/>}
                {rarete==="epique" && <Gem size={12} color="#a855f7"/>}
                {rarete==="rare" && <Medal size={12} color="#3b82f6"/>}
                <span style={{ fontSize:10,fontWeight:900,color:rc.color,letterSpacing:1.5 }}>{rc.label}</span>
              </div>
              {/* Author header */}
              <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:14 }}>
                <FeedAvatar photo={p.joueur_photo} pseudo={p.joueur_pseudo} size={40} onClick={()=>setPage("profil-joueur-"+p.joueur_id)}/>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700,fontSize:14 }}>
                    <span onClick={()=>setPage("profil-joueur-"+p.joueur_id)} style={{ color:C.text,cursor:"pointer" }}>{p.joueur_pseudo}</span>
                    <span style={{ color:C.muted,fontWeight:400 }}> a débloqué un badge !</span>
                  </div>
                  <div style={{ fontSize:12,color:C.muted }}>{tempsDepuis(p.date)}</div>
                </div>
              </div>
              {/* Badge showcase */}
              <div style={{ position:"relative",overflow:"hidden",background:badge.couleur ? `${badge.couleur}18` : `${rc.color}12`,border:`1px solid ${rc.border}`,borderRadius:14,padding:isEpicPlus?"20px 16px":"14px 16px",marginBottom:10,textAlign:isEpicPlus?"center":"left" }}>
                {isEpicPlus && (
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.05) 50%,transparent 65%)",animation:"feedShine 4s ease infinite",pointerEvents:"none" }}/>
                )}
                {isEpicPlus ? (
                  <>
                    <div style={{ fontSize:56,filter:`drop-shadow(0 0 16px ${badge.couleur||rc.color})`,marginBottom:10,animation:"drixPop .5s ease-out both" }}>{badge.emoji}</div>
                    <div style={{ fontWeight:900,fontSize:18,color:badge.couleur||rc.color,marginBottom:4 }}>{badge.nom}</div>
                    <div style={{ fontSize:12,color:C.muted,lineHeight:1.5 }}>{badge.desc}</div>
                  </>
                ) : (
                  <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                    <span style={{ fontSize:36,filter:`drop-shadow(0 0 8px ${badge.couleur||rc.color})` }}>{badge.emoji}</span>
                    <div>
                      <div style={{ fontWeight:800,fontSize:16,color:badge.couleur||rc.color }}>{badge.nom}</div>
                      <div style={{ fontSize:12,color:C.muted,marginTop:2 }}>{badge.desc}</div>
                    </div>
                    <div style={{ marginLeft:"auto" }}><Check size={18} color="#22c55e" strokeWidth={3}/></div>
                  </div>
                )}
              </div>
              <LikeButton refId={p.id} joueur={joueur} initialCount={likesMap[p.id]?.count||0} initialMyLike={likesMap[p.id]?.myLike||false}/>
              <CommentSection refId={p.id} joueur={joueur} initialComments={commentsMap[p.id]||[]}/>
            </div>
          </div>
        );
      }
    }

    // ── Post Chrono Finish (texte legacy ou format JSON) ────────────────────
    const chronoInfo = parseChronoFinishContent(p.contenu);
    if (chronoInfo) {
      return (
        <ChronoFinishPost key={`post-${p.id}`} p={p} info={chronoInfo} C={C} cardBase={cardBase}
          joueur={joueur} likesMap={likesMap} commentsMap={commentsMap}
          tempsDepuis={tempsDepuis} setPage={setPage}
          FeedAvatar={FeedAvatar} LikeButton={LikeButton} CommentSection={CommentSection}/>
      );
    }

    // ── Post texte normal ────────────────────────────────────────────────────
    return (
      <div key={`post-${p.id}`} style={cardBase}>
        <div style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:10 }}>
          <FeedAvatar photo={p.joueur_photo} pseudo={p.joueur_pseudo} size={44} onClick={()=>setPage("profil-joueur-"+p.joueur_id)}/>
          <div style={{ flex:1 }}>
            <div onClick={()=>setPage("profil-joueur-"+p.joueur_id)} style={{ fontWeight:700,fontSize:14,color:C.text,cursor:"pointer" }}>{p.joueur_pseudo}</div>
            <div style={{ fontSize:12,color:C.muted }}>{tempsDepuis(p.date)}</div>
          </div>
        </div>
        <div style={{ fontSize:14,lineHeight:1.7,color:"#e2e8f0",whiteSpace:"pre-wrap",paddingLeft:54,marginBottom:10 }}>{p.contenu}</div>
        <div style={{ paddingLeft:54 }}>
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
    const vC = drixMap[d.challenger_id];
    const vD = drixMap[d.defie_id];
    return (
      <div key={`match-${d.id}`} style={{
        ...cardBase,
        background:"linear-gradient(160deg,#0d0800,#090600)",
        border:"1px solid #f9731622",
        boxShadow:"0 4px 20px rgba(249,115,22,0.08)",
      }}>
        {/* Animated top stripe orange */}
        <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#ea580c,#f97316,#fbbf24,#f97316,#ea580c)",backgroundSize:"300% 100%",animation:"feedGlow 4s ease infinite" }}/>
        <div style={{ padding:"4px 0 0" }}>
          {/* Header */}
          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:12 }}>
            <div style={{ display:"flex",alignItems:"center",gap:5,background:"#f9731618",border:"1px solid #f9731628",borderRadius:8,padding:"3px 10px" }}>
              <Swords size={11} color="#f97316"/>
              <span style={{ fontSize:11,fontWeight:800,color:"#f97316",letterSpacing:.5 }}>DUEL TERMINÉ</span>
            </div>
            <span style={{ fontSize:11,color:C.muted,marginLeft:"auto" }}>{tempsDepuis(item.date)}</span>
          </div>
          {/* Esport score block */}
          <div style={{ background:"#0a0500",border:"1px solid #f9731620",borderRadius:14,padding:"16px 10px",marginBottom:10,position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",inset:0,background:"linear-gradient(105deg,transparent 35%,rgba(255,255,255,0.025) 50%,transparent 65%)",animation:"feedShine 7s ease infinite 1s",pointerEvents:"none" }}/>
            <div style={{ display:"flex",alignItems:"center",gap:4 }}>
              {/* Challenger */}
              <div style={{ flex:1,textAlign:"center" }}>
                <div style={{ marginBottom:6 }}>
                  <FeedAvatar photo={photosMap[d.challenger_id]||null} pseudo={d.challenger_pseudo} size={40} onClick={()=>setPage("profil-joueur-"+d.challenger_id)}/>
                </div>
                <div style={{ fontWeight:800,fontSize:12,color:cWin?"#22c55e":"#ef4444",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:4 }}>{d.challenger_pseudo}</div>
                <div style={{ fontSize:38,fontWeight:900,lineHeight:1,color:cWin?"#22c55e":"#ef4444",textShadow:cWin?"0 0 20px rgba(34,197,94,.35)":"0 0 20px rgba(239,68,68,.25)" }}>{cScore}</div>
                {moyC !== null && <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>{moyC} moy.</div>}
                <div style={{ display:"flex",justifyContent:"center",marginTop:6 }}>
                  <div style={{ background:cWin?"#22c55e22":"#ef444420",border:`1px solid ${cWin?"#22c55e44":"#ef444440"}`,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:800,color:cWin?"#22c55e":"#ef4444",display:"flex",alignItems:"center",gap:3 }}>
                    {cWin ? <><Trophy size={9} color="#22c55e"/> WIN</> : <><X size={9} color="#ef4444"/> DEF</>}
                  </div>
                </div>
              </div>
              {/* VS */}
              <div style={{ flexShrink:0,textAlign:"center",padding:"0 6px" }}>
                <div style={{ width:38,height:38,borderRadius:"50%",background:"linear-gradient(135deg,#f97316,#ea580c)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 4px",boxShadow:"0 0 14px rgba(249,115,22,0.45)" }}>
                  <Swords size={16} color="#fff"/>
                </div>
                <div style={{ fontSize:9,fontWeight:900,color:"#f97316",letterSpacing:2 }}>VS</div>
              </div>
              {/* Defié */}
              <div style={{ flex:1,textAlign:"center" }}>
                <div style={{ marginBottom:6 }}>
                  <FeedAvatar photo={photosMap[d.defie_id]||null} pseudo={d.defie_pseudo} size={40} onClick={()=>setPage("profil-joueur-"+d.defie_id)}/>
                </div>
                <div style={{ fontWeight:800,fontSize:12,color:dWin?"#22c55e":"#ef4444",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:4 }}>{d.defie_pseudo}</div>
                <div style={{ fontSize:38,fontWeight:900,lineHeight:1,color:dWin?"#22c55e":"#ef4444",textShadow:dWin?"0 0 20px rgba(34,197,94,.35)":"0 0 20px rgba(239,68,68,.25)" }}>{dScore}</div>
                {moyD !== null && <div style={{ fontSize:10,color:C.muted,marginTop:4 }}>{moyD} moy.</div>}
                <div style={{ display:"flex",justifyContent:"center",marginTop:6 }}>
                  <div style={{ background:dWin?"#22c55e22":"#ef444420",border:`1px solid ${dWin?"#22c55e44":"#ef444440"}`,borderRadius:20,padding:"2px 8px",fontSize:10,fontWeight:800,color:dWin?"#22c55e":"#ef4444",display:"flex",alignItems:"center",gap:3 }}>
                    {dWin ? <><Trophy size={9} color="#22c55e"/> WIN</> : <><X size={9} color="#ef4444"/> DEF</>}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* DRIX boxes */}
          {(vC !== undefined || vD !== undefined) && (
            <div style={{ display:"flex",gap:8,marginBottom:10 }}>
              {[
                { pseudo:d.challenger_pseudo, val:vC, win:cWin },
                { pseudo:d.defie_pseudo,      val:vD, win:dWin },
              ].map((r,i) => r.val !== undefined ? (
                <div key={i} style={{ flex:1,background:r.win?"#22c55e12":"#ef444412",border:`1px solid ${r.win?"#22c55e33":"#ef444433"}`,borderRadius:10,padding:"8px",textAlign:"center" }}>
                  <div style={{ fontSize:10,color:r.win?"#4ade80":"#fca5a5",fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{r.pseudo.split(" ")[0]}</div>
                  <div style={{ fontSize:22,fontWeight:900,color:r.win?"#22c55e":"#ef4444",lineHeight:1.2,animation:"drixPop .4s ease-out both" }}>{r.val>0?"+":""}{r.val}</div>
                  <div style={{ fontSize:9,color:r.win?"#4ade80":"#fca5a5",fontWeight:700 }}>DRIX</div>
                </div>
              ) : null)}
            </div>
          )}
          <MancheDetail manches={d.manches_detail}/>
          <div style={{ display:"flex",gap:8,marginTop:8 }}>
            <LikeButton refId={d.id} joueur={joueur} initialCount={likesMap[d.id]?.count||0} initialMyLike={likesMap[d.id]?.myLike||false}/>
          </div>
          <CommentSection refId={d.id} joueur={joueur} initialComments={commentsMap[d.id]||[]}/>
        </div>
      </div>
    );
  };

  const renderMilestone = (item) => {
    const m = item.data;
    const up = m.direction === "up";
    const { emoji, titre } = getDrixTitre(m.drix_apres || 1000);
    return (
      <div key={`drix-${m.id||item.date}`} style={{
        ...cardBase,
        background: up ? "linear-gradient(160deg,#052010,#0a0a0f)" : "linear-gradient(160deg,#120406,#0a0a0f)",
        border:`1px solid ${up?"#22c55e33":"#ef444433"}`,
        boxShadow:`0 4px 20px ${up?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)"}`,
      }}>
        <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:up?"linear-gradient(90deg,#16a34a,#22c55e,#4ade80,#22c55e,#16a34a)":"linear-gradient(90deg,#dc2626,#ef4444,#f87171,#ef4444,#dc2626)",backgroundSize:"300% 100%",animation:"feedGlow 4s ease infinite" }}/>
        <div style={{ display:"flex",gap:14,alignItems:"center",padding:"4px 0 0" }}>
          <FeedAvatar photo={photosMap[m.joueur_id]||null} pseudo={m.joueur_pseudo} size={44} onClick={()=>setPage("profil-joueur-"+m.joueur_id)} status={up?"up":undefined}/>
          <div style={{ flex:1,minWidth:0 }}>
            <div onClick={()=>setPage("profil-joueur-"+m.joueur_id)} style={{ fontWeight:700,fontSize:14,color:C.text,cursor:"pointer" }}>{m.joueur_pseudo}</div>
            <div style={{ fontSize:13,color: up?"#22c55e":"#ef4444",fontWeight:700,marginTop:3,display:"flex",alignItems:"center",gap:5 }}>
              {up ? <TrendingUp size={13} color="#22c55e"/> : <TrendingDown size={13} color="#ef4444"/>}
              {up ? "Nouveau palier débloqué !" : "Palier perdu"}
            </div>
            <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{tempsDepuis(item.date)}</div>
          </div>
          {/* Rank badge on right */}
          <div style={{ textAlign:"center",flexShrink:0 }}>
            <div style={{ fontSize:40,lineHeight:1,animation:"drixPop .5s ease-out both" }}>{emoji}</div>
            <div style={{ fontSize:9,fontWeight:800,color:up?"#22c55e":"#ef4444",marginTop:2 }}>{m.drix_apres} DRIX</div>
          </div>
        </div>
        {/* Rank name pill */}
        <div style={{ margin:"10px 0 8px",display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:up?"#22c55e18":"#ef444418",border:`1px solid ${up?"#22c55e44":"#ef444444"}`,borderRadius:20,padding:"4px 12px" }}>
            <span style={{ fontSize:12,fontWeight:800,color:up?"#4ade80":"#fca5a5" }}>{titre}</span>
            <span style={{ fontSize:11,color:C.muted }}>— {m.drix_avant||"?"} → {m.drix_apres} DRIX</span>
          </div>
        </div>
        <LikeButton refId={m.id} joueur={joueur} initialCount={likesMap[m.id]?.count||0} initialMyLike={likesMap[m.id]?.myLike||false}/>
        <CommentSection refId={m.id} joueur={joueur} initialComments={commentsMap[m.id]||[]}/>
      </div>
    );
  };

  const renderTrainingDrix = (item) => {
    const m = item.data;
    const gain = m.variation > 0;
    return (
      <div key={`tdrix-${m.id||item.date}`} style={{
        ...cardBase,
        background: gain ? "linear-gradient(160deg,#0d0500,#0a0a0f)" : "linear-gradient(160deg,#0d0101,#0a0a0f)",
        border:`1px solid ${gain?"#f9731630":"#ef444428"}`,
      }}>
        <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:gain?"linear-gradient(90deg,#c2410c,#f97316,#fb923c,#f97316,#c2410c)":"linear-gradient(90deg,#dc2626,#ef4444,#f87171,#ef4444,#dc2626)",backgroundSize:"300% 100%",animation:"feedGlow 4s ease infinite" }}/>
        <div style={{ display:"flex",gap:12,alignItems:"center",padding:"4px 0 0" }}>
          <FeedAvatar photo={photosMap[m.joueur_id]||null} pseudo={m.joueur_pseudo} size={44} onClick={()=>setPage("profil-joueur-"+m.joueur_id)} status={gain?"hot":undefined}/>
          <div style={{ flex:1,minWidth:0 }}>
            <div onClick={()=>setPage("profil-joueur-"+m.joueur_id)} style={{ fontWeight:700,fontSize:14,color:C.text,cursor:"pointer" }}>{m.joueur_pseudo}</div>
            <div style={{ fontSize:13,color: gain?"#f97316":"#ef4444",fontWeight:700,marginTop:3,display:"flex",alignItems:"center",gap:5 }}>
              <Target size={13} color={gain?"#f97316":"#ef4444"}/>
              Comptage de finish
            </div>
            <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{tempsDepuis(item.date)} · {m.drix_apres} DRIX au total</div>
          </div>
          {/* DRIX badge prominent */}
          <div style={{ flexShrink:0,textAlign:"center",background:gain?"#f9731618":"#ef444418",border:`1px solid ${gain?"#f9731640":"#ef444440"}`,borderRadius:12,padding:"8px 12px",animation:"drixPop .4s ease-out both" }}>
            <div style={{ fontSize:10,color:gain?"#fb923c":"#fca5a5",fontWeight:700,marginBottom:2 }}>DRIX</div>
            <div style={{ fontSize:24,fontWeight:900,color:gain?"#f97316":"#ef4444",lineHeight:1 }}>{gain?"+":""}{m.variation}</div>
          </div>
        </div>
        <div style={{ marginTop:10 }}>
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
      <div key={`pres-${p.id||item.date}`} style={{
        ...cardBase,
        background:"linear-gradient(160deg,#030d1a,#0a0a0f)",
        border:"1px solid #3b82f628",
        boxShadow:"0 4px 20px rgba(59,130,246,0.07)",
      }}>
        <div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#1d4ed8,#3b82f6,#60a5fa,#3b82f6,#1d4ed8)",backgroundSize:"300% 100%",animation:"feedGlow 4s ease infinite" }}/>
        <div style={{ display:"flex",gap:12,alignItems:"center",padding:"4px 0 0" }}>
          <FeedAvatar photo={photosMap[p.joueur_id]||null} pseudo={p.joueur_pseudo} size={44} onClick={()=>setPage("profil-joueur-"+p.joueur_id)} status="online"/>
          <div style={{ flex:1,minWidth:0 }}>
            <div onClick={()=>setPage("profil-joueur-"+p.joueur_id)} style={{ fontWeight:700,fontSize:14,color:C.text,cursor:"pointer" }}>{p.joueur_pseudo}</div>
            <div style={{ fontSize:13,color:"#60a5fa",fontWeight:700,marginTop:3,display:"flex",alignItems:"center",gap:5 }}>
              <MapPin size={13} color="#60a5fa"/>
              {bar ? bar.nom : p.bar_slug || "Bar de fléchettes"}
            </div>
            <div style={{ fontSize:11,color:C.muted,marginTop:2 }}>{tempsDepuis(item.date)}</div>
          </div>
          {/* Live pill */}
          <div style={{ display:"flex",alignItems:"center",gap:5,background:"#3b82f618",border:"1px solid #3b82f640",borderRadius:20,padding:"4px 10px",flexShrink:0 }}>
            <span style={{ width:6,height:6,borderRadius:"50%",background:"#60a5fa",display:"inline-block",animation:"livePulse 1.4s infinite" }}/>
            <span style={{ fontSize:11,fontWeight:800,color:"#60a5fa" }}>PRÉSENT</span>
          </div>
        </div>
        <div style={{ marginTop:10 }}>
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

  // ── Date separator ────────────────────────────────────────────────────────
  const DateSeparator = ({ label, icon: Icon, color="#334155" }) => (
    <div style={{ display:"flex",alignItems:"center",gap:10,margin:"8px 0 14px" }}>
      <div style={{ flex:1,height:1,background:"linear-gradient(90deg,transparent,#ffffff14,transparent)" }}/>
      <div style={{ display:"flex",alignItems:"center",gap:5 }}>
        {Icon && <Icon size={11} color={color}/>}
        <span style={{ fontSize:10,fontWeight:900,color,letterSpacing:1.8 }}>{label}</span>
      </div>
      <div style={{ flex:1,height:1,background:"linear-gradient(90deg,transparent,#ffffff14,transparent)" }}/>
    </div>
  );

  // ── Trending spotlight (derived from feed) ─────────────────────────────────
  const renderTrending = () => {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayTs = todayStart.getTime();
    const todayItems = feed.filter(i => i.date >= todayTs);

    // Top DRIX gainer today
    const drixByPlayer = {};
    todayItems.forEach(i => {
      if (i.type === "training_drix" || i.type === "drix_milestone") {
        const m = i.data;
        const key = m.joueur_pseudo;
        drixByPlayer[key] = (drixByPlayer[key]||0) + (m.variation||0);
      }
    });
    const topPlayer = Object.entries(drixByPlayer).sort((a,b)=>b[1]-a[1])[0];

    // Best training finish today
    const bestFinish = todayItems
      .filter(i => i.type==="training_drix" && i.data.variation > 0)
      .sort((a,b) => b.data.variation - a.data.variation)[0];

    // Hot rivalité from entire feed
    let hotRivalCard = null;
    for (const i of feed) {
      if (i.type !== "post") continue;
      if (!i.data.contenu?.startsWith("__DUEL__|")) continue;
      try {
        const d = JSON.parse(i.data.contenu.slice(9));
        if (d.isRivalite) { hotRivalCard = d; break; }
      } catch {}
    }

    const cards = [];
    if (topPlayer && topPlayer[1] > 0)
      cards.push({ Icon:Crown, color:"#f59e0b", label:"JOUEUR DU JOUR", name:topPlayer[0], val:`+${topPlayer[1]} DRIX` });
    if (bestFinish)
      cards.push({ Icon:Target, color:"#f97316", label:"MEILLEUR FINISH", name:bestFinish.data.joueur_pseudo, val:`+${bestFinish.data.variation} DRIX` });
    if (hotRivalCard)
      cards.push({ Icon:Swords, color:"#a855f7", label:"RIVALITÉ ACTIVE", name:`${hotRivalCard.winner?.nom?.split(" ")[0]||"?"} vs ${hotRivalCard.loser?.nom?.split(" ")[0]||"?"}`, val:"Rivalité hebdo ⚔" });

    if (cards.length === 0) return null;
    return (
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10 }}>
          <Flame size={13} color="#f97316"/>
          <span style={{ fontSize:11,fontWeight:900,color:"#f97316",letterSpacing:1.5 }}>TENDANCES DU JOUR</span>
        </div>
        <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:4,scrollbarWidth:"none",msOverflowStyle:"none" }}>
          {cards.map(({ Icon, color, label, name, val }, i) => (
            <div key={i} style={{ flexShrink:0,background:`linear-gradient(135deg,${color}14,#0e0e14)`,border:`1px solid ${color}2a`,borderRadius:14,padding:"12px 14px",minWidth:145,maxWidth:165,cursor:"default" }}>
              <div style={{ display:"flex",alignItems:"center",gap:5,marginBottom:8 }}>
                <Icon size={11} color={color}/>
                <span style={{ fontSize:9,fontWeight:900,color,letterSpacing:1 }}>{label}</span>
              </div>
              <div style={{ fontSize:13,fontWeight:800,color:"#e2e8f0",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</div>
              <div style={{ fontSize:11,fontWeight:700,color }}>{val}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Feed with date separators ──────────────────────────────────────────────
  const renderFeedWithSeparators = () => {
    if (!feed.length) return null;
    const now = Date.now();
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate()-1);
    const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate()-7);
    const todayTs = todayStart.getTime();
    const yestTs = yesterdayStart.getTime();
    const weekTs = weekStart.getTime();

    const getLabel = (ts) => {
      if (ts >= todayTs) return "AUJOURD'HUI";
      if (ts >= yestTs) return "HIER";
      if (ts >= weekTs) return "CETTE SEMAINE";
      return "PLUS TÔT";
    };
    const labelIcon = { "AUJOURD'HUI":Flame, "HIER":Clock, "CETTE SEMAINE":Clock, "PLUS TÔT":Clock };
    const labelColor = { "AUJOURD'HUI":"#f97316", "HIER":"#64748b", "CETTE SEMAINE":"#475569", "PLUS TÔT":"#334155" };

    let lastLabel = null;
    const result = [];
    feed.forEach((item, idx) => {
      const label = getLabel(item.date);
      if (label !== lastLabel) {
        lastLabel = label;
        result.push(
          <DateSeparator key={`sep-${label}-${idx}`} label={label} icon={labelIcon[label]} color={labelColor[label]}/>
        );
      }
      const el = renderItem(item, idx);
      if (el) result.push(el);
    });
    return result;
  };

  return (
    <div style={{ maxWidth:700,margin:"0 auto",padding:"20px 16px" }}>
      <style>{`
        @keyframes feedGlow { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes feedIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes feedShine { 0%{transform:translateX(-120%) skewX(-12deg)} 100%{transform:translateX(320%) skewX(-12deg)} }
        @keyframes drixPop { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.12)} 100%{transform:scale(1);opacity:1} }
        @keyframes livePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.35)} }
      `}</style>

      <button onClick={()=>setPage("home")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",marginBottom:16,fontSize:13,display:"flex",alignItems:"center",gap:6,touchAction:"manipulation" }}><ArrowLeft size={16}/> Accueil</button>

      {/* ── Hero header ── */}
      <div style={{ position:"relative",overflow:"hidden",background:"linear-gradient(135deg,#0a0014,#050010,#000814)",border:"1px solid rgba(168,85,247,0.15)",borderRadius:20,padding:"20px 20px 18px",marginBottom:20 }}>
        <div style={{ position:"absolute",top:-30,right:-20,width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,rgba(168,85,247,.12),transparent 70%)",pointerEvents:"none" }}/>
        <div style={{ position:"absolute",bottom:-20,left:40,width:80,height:80,borderRadius:"50%",background:"radial-gradient(circle,rgba(249,115,22,.08),transparent 70%)",pointerEvents:"none" }}/>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"relative" }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#7c3aed,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(168,85,247,0.4)",flexShrink:0 }}>
              <Users size={26} color="#fff"/>
            </div>
            <div>
              <h1 style={{ fontWeight:900,fontSize:22,margin:0,color:"#f1f5f9",letterSpacing:-.3 }}>Le Comptoir</h1>
              <p style={{ color:"#64748b",fontSize:12,margin:0,marginTop:3 }}>L'actualité de tes amis</p>
            </div>
          </div>
          <button onClick={()=>{ setLoading(true); setRefreshTick(t=>t+1); }} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",color:C.muted,cursor:"pointer",borderRadius:10,padding:"8px",display:"flex",touchAction:"manipulation",transition:"all .15s" }} title="Rafraîchir">
            <RefreshCw size={16}/>
          </button>
        </div>
      </div>

      {/* ── Onglets ── */}
      <div style={{ display:"flex",background:"#0d0d12",border:"1px solid #ffffff08",borderRadius:14,padding:4,gap:4,marginBottom:20 }}>
        <button onClick={()=>setMainTab("feed")} style={{ flex:1,padding:"10px",borderRadius:10,border:"none",fontWeight:700,fontSize:14,cursor:"pointer",transition:"all .2s",background:mainTab==="feed"?"linear-gradient(135deg,#1e1b2e,#1a1a2e)":"transparent",color:mainTab==="feed"?"#f1f5f9":C.muted,boxShadow:mainTab==="feed"?"0 2px 8px rgba(0,0,0,0.3)":"none",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
          <Users size={14} color={mainTab==="feed"?"#a855f7":C.muted}/>Communauté
        </button>
        <button onClick={()=>setMainTab("live")} style={{ flex:1,padding:"10px",borderRadius:10,border:"none",fontWeight:700,fontSize:14,cursor:"pointer",transition:"all .2s",background:mainTab==="live"?"linear-gradient(135deg,#1a0b0b,#1a0808)":"transparent",color:mainTab==="live"?"#ef4444":C.muted,boxShadow:mainTab==="live"?"0 2px 8px rgba(0,0,0,0.3)":"none",display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
          <span style={{ display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#ef4444",flexShrink:0,animation:"livePulse 1.2s infinite" }}/>
          Live
          {liveCount > 0 && (
            <span style={{ background:"#ef4444",color:"#fff",borderRadius:20,fontSize:10,fontWeight:900,padding:"1px 7px",marginLeft:2,lineHeight:1.6 }}>{liveCount}</span>
          )}
        </button>
      </div>

      {mainTab==="live" ? (
        <PageLive joueur={joueur} setPage={setPage}/>
      ) : (<>

      {/* ── Compositeur de post ── */}
      {joueur && (
        <div style={{ background:"linear-gradient(160deg,#0e0e14,#0b0b10)",border:"1px solid #ffffff0e",borderRadius:16,padding:16,marginBottom:20,boxShadow:"0 2px 16px rgba(0,0,0,0.3)" }}>
          <div style={{ display:"flex",gap:10,alignItems:"flex-start",marginBottom:12 }}>
            <FeedAvatar photo={joueur.photo} pseudo={joueur.pseudo} size={44}/>
            <textarea
              value={texte}
              onChange={e=>setTexte(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"&&e.ctrlKey) publier(); }}
              placeholder="Quoi de neuf au comptoir ? (Ctrl+Entrée pour publier)"
              style={{ flex:1,background:"#070710",border:`1px solid ${texte.trim()?"#a855f755":"#ffffff10"}`,borderRadius:12,padding:"10px 12px",color:"#e2e8f0",fontSize:14,resize:"none",height:70,fontFamily:"inherit",outline:"none",boxSizing:"border-box",transition:"border-color .15s" }}
              maxLength={500}
            />
          </div>
          {/* Quick actions */}
          <div style={{ display:"flex",gap:8,alignItems:"center" }}>
            <button style={{ display:"flex",alignItems:"center",gap:5,background:"transparent",border:"1px solid #ffffff0a",borderRadius:8,padding:"5px 10px",fontSize:12,color:C.muted,cursor:"pointer",touchAction:"manipulation" }} title="Photo">
              <Camera size={13} color="#64748b"/> Photo
            </button>
            <button style={{ display:"flex",alignItems:"center",gap:5,background:"transparent",border:"1px solid #ffffff0a",borderRadius:8,padding:"5px 10px",fontSize:12,color:C.muted,cursor:"pointer",touchAction:"manipulation" }} title="Exploit">
              <Trophy size={13} color="#f59e0b"/> Exploit
            </button>
            <button style={{ display:"flex",alignItems:"center",gap:5,background:"transparent",border:"1px solid #ffffff0a",borderRadius:8,padding:"5px 10px",fontSize:12,color:C.muted,cursor:"pointer",touchAction:"manipulation" }} title="180 !">
              <Flame size={13} color="#f97316"/> 180 !
            </button>
            <div style={{ flex:1 }}/>
            <span style={{ fontSize:11,color:"#334155" }}>{texte.length}/500</span>
            <button onClick={publier} disabled={!texte.trim()||posting}
              style={{ background:texte.trim()?"linear-gradient(135deg,#7c3aed,#a855f7)":"#1e1e1e",color:texte.trim()?"#fff":C.muted,border:"none",borderRadius:10,padding:"8px 18px",fontWeight:700,fontSize:14,cursor:texte.trim()&&!posting?"pointer":"default",transition:"all .15s",opacity:posting?.6:1 }}>
              {posting ? "…" : "Publier"}
            </button>
          </div>
        </div>
      )}

      {erreur && (
        <div style={{ background:"#ef444418",border:"1px solid #ef444440",borderRadius:12,padding:"10px 14px",color:"#ef4444",fontSize:13,marginBottom:16,display:"flex",alignItems:"center",gap:8 }}>
          <AlertCircle size={14}/> {erreur}
        </div>
      )}

      {/* ── Feed ── */}
      {loading ? (
        /* Skeleton loading */
        <div>
          {[1,2,3].map(i=>(
            <div key={i} style={{ background:"#0e0e14",border:"1px solid #ffffff08",borderRadius:16,padding:16,marginBottom:12 }}>
              <div style={{ display:"flex",gap:10,alignItems:"center",marginBottom:12 }}>
                <div style={{ width:44,height:44,borderRadius:"50%",background:"#1a1a24" }}/>
                <div style={{ flex:1 }}>
                  <div style={{ width:"40%",height:12,background:"#1a1a24",borderRadius:6,marginBottom:6 }}/>
                  <div style={{ width:"25%",height:10,background:"#14141e",borderRadius:6 }}/>
                </div>
              </div>
              <div style={{ height:80,background:"#0d0d18",borderRadius:12,marginBottom:10 }}/>
              <div style={{ display:"flex",gap:6 }}>
                <div style={{ width:60,height:28,background:"#14141e",borderRadius:8 }}/>
                <div style={{ width:60,height:28,background:"#14141e",borderRadius:8 }}/>
              </div>
            </div>
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div style={{ background:"linear-gradient(160deg,#0e0e14,#0b0b10)",border:"1px solid #ffffff08",borderRadius:16,padding:48,textAlign:"center" }}>
          <div style={{ fontSize:56,marginBottom:14 }}>🎯</div>
          <h2 style={{ fontWeight:800,fontSize:18,marginBottom:8,color:"#e2e8f0" }}>Le comptoir est calme…</h2>
          <p style={{ color:C.muted,fontSize:14,lineHeight:1.65,maxWidth:280,margin:"0 auto" }}>
            Ajoute des amis et lancez des duels pour faire vibrer le fil d'actu !
          </p>
        </div>
      ) : (
        <div>
          {renderTrending()}
          {renderFeedWithSeparators()}
        </div>
      )}
      </>)}
    </div>
  );
};

// ── PAGE MODE JEU ─────────────────────────────────────────────────────────────
const PageModeJeu = ({ joueur, setPage, initCat=null }) => {
  const [categorie, setCategorie] = useState(initCat);

  // Carte jeu active
  const ModeBtn = ({ icon: IconComp, label, sub, onClick, col, badge }) => (
    <div onClick={onClick}
      style={{ background:"linear-gradient(135deg,#1a1a1a,#141414)",border:`2px solid ${col}33`,borderRadius:16,padding:"18px 16px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,transition:"all .15s",userSelect:"none",position:"relative",overflow:"hidden" }}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=col;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px ${col}22`;}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=col+"33";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
      <div style={{ flexShrink:0 }}><IconComp size={36} color={col}/></div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:800,fontSize:16,color:"#f1f5f9",marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:12,color:"#94a3b8",lineHeight:1.4 }}>{sub}</div>
      </div>
      {badge && <span style={{ background:`${col}22`,border:`1px solid ${col}55`,color:col,fontSize:11,fontWeight:700,borderRadius:6,padding:"3px 7px",flexShrink:0 }}>{badge}</span>}
      {!badge && <ChevronRight size={18} color={col}/>}
    </div>
  );

  // Carte jeu à venir (grisée)
  const SoonBtn = ({ icon: IconComp, label, sub }) => (
    <div style={{ background:"#111",border:`1px solid #2a2a2a`,borderRadius:16,padding:"16px",display:"flex",alignItems:"center",gap:14,opacity:.5,userSelect:"none" }}>
      <div style={{ flexShrink:0,filter:"grayscale(1)" }}><IconComp size={34} color={C.muted}/></div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700,fontSize:15,color:"#94a3b8" }}>{label}</div>
        <div style={{ fontSize:12,color:"#64748b",lineHeight:1.4 }}>{sub}</div>
      </div>
      <span style={{ background:"#1a1a1a",border:"1px solid #2a2a2a",color:"#64748b",fontSize:11,fontWeight:700,borderRadius:6,padding:"3px 7px",flexShrink:0 }}>Bientôt</span>
    </div>
  );

  const CatBtn = ({ icon: IconComp, label, sub, id, col }) => (
    <div onClick={()=>setCategorie(id)}
      style={{ background:`linear-gradient(135deg,${col}18,${col}08)`,border:`2px solid ${col}55`,borderRadius:20,padding:"28px 22px",cursor:"pointer",transition:"all .15s",userSelect:"none",textAlign:"center" }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow=`0 14px 32px ${col}33`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
      <div style={{ marginBottom:10,display:"flex",justifyContent:"center" }}><IconComp size={52} color={col}/></div>
      <div style={{ fontWeight:900,fontSize:20,color:col,marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:13,color:C.muted,lineHeight:1.6,whiteSpace:"pre-line" }}>{sub}</div>
      <div style={{ marginTop:14,background:col,borderRadius:10,padding:"10px",fontWeight:800,fontSize:14,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>Accéder <ChevronRight size={14}/></div>
    </div>
  );

  if (!categorie) return (
    <div style={{ maxWidth:700,margin:"0 auto",padding:"24px 16px" }}>
      <button onClick={()=>setPage("home")} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",marginBottom:16,fontSize:13,display:"flex",alignItems:"center",gap:6,padding:0 }}>
        <ArrowLeft size={16}/> Accueil
      </button>
      <h1 style={{ fontWeight:800,fontSize:22,marginBottom:4,display:"flex",alignItems:"center",gap:8 }}>
        <Gamepad2 size={22} color={C.accent}/> Mode de jeu
      </h1>
      <p style={{ color:C.muted,fontSize:13,marginBottom:24 }}>Choisis ta catégorie</p>
      <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
        <CatBtn id="fleche" icon={Target} label="Jeux avec fléchettes"
          sub={"501 · 301 · Cricket · Around the Clock\nKiller · Shanghai · Tournoi entre potes"} col="#f59e0b"/>
        <CatBtn id="sans" icon={Brain} label="Jeux sans fléchettes"
          sub={"Rush Mode · Calcul finish\nQuiz · Défis mentaux · Jeux communautaires"} col="#ef4444"/>
      </div>
    </div>
  );

  const back = categorie === "fleche"
    ? <><h1 style={{ fontWeight:800,fontSize:22,marginBottom:2,display:"flex",alignItems:"center",gap:8 }}><Target size={22} color={C.yellow}/> Jeux avec fléchettes</h1><p style={{ color:C.muted,fontSize:13,marginBottom:18 }}>Prends ta cible, on joue !</p></>
    : <><h1 style={{ fontWeight:800,fontSize:22,marginBottom:2,display:"flex",alignItems:"center",gap:8 }}><Gamepad2 size={22} color={C.red}/> Mini jeux & défis</h1><p style={{ color:C.muted,fontSize:13,marginBottom:18 }}>Entraîne ton mental, n'importe où !</p></>;

  return (
    <div style={{ maxWidth:700,margin:"0 auto",padding:"24px 16px" }}>
      <button onClick={()=>initCat ? setPage("home") : setCategorie(null)} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",marginBottom:16,fontSize:13,display:"flex",alignItems:"center",gap:6,padding:0 }}>
        <ArrowLeft size={16}/> {initCat ? "Accueil" : "Retour"}
      </button>
      {back}
      <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
        {categorie==="fleche" && <>
          <ModeBtn icon={Target} label="501"
            sub="Pars de 501 et descends à 0. Termine sur un double."
            onClick={()=>setPage("scoreur")} col="#f97316"/>
          <ModeBtn icon={Target} label="301"
            sub="Pars de 301 et descends à 0. Termine sur un double."
            onClick={()=>setPage("scoreur")} col="#f59e0b"/>
          <ModeBtn icon={Swords} label="Cricket"
            sub="Ferme les zones 15 à 20 et Bull avant tes adversaires. Mode points ou Cut Throat."
            onClick={()=>setPage("cricket-config")} col="#22c55e"/>
          <ModeBtn icon={Building2} label="Capital"
            sub="Jeu de précision : descends ton score en visant des zones précises."
            onClick={()=>setPage("jeux-capital")} col="#a78bfa"/>
          <ModeBtn icon={Users} label="Tournoi entre potes"
            sub="Organise un tournoi avec tes amis. Format libre, ambiance garantie."
            onClick={()=>setPage("tournois-potes")} col="#60a5fa"/>
          <SoonBtn icon={Clock} label="Around the Clock" sub="Vise chaque zone dans l'ordre, de 1 à 20." />
          <SoonBtn icon={Flame} label="Shanghai" sub="Marque le max de points sur une zone spécifique chaque tour." />
          <SoonBtn icon={Skull} label="Killer" sub="Deviens killer et élimine tes adversaires." />
        </>}
        {categorie==="sans" && <>
          <ModeBtn icon={Zap} label="Rush Mode"
            sub="Calcul mental sous pression : score, finishes, bust, routes. 3 niveaux, combos et badges !"
            onClick={()=>setPage("rush-mode")} col="#ef4444"/>
          <ModeBtn icon={Target} label="Calcul finish"
            sub="Entraîne-toi à construire tes finishes en 1, 2 ou 3 fléchettes."
            onClick={()=>setPage("entrainement-finish")} col="#f97316"/>
          <ModeBtn icon={Timer} label="Chrono Finish"
            sub="5 finishes à enchaîner le plus vite possible. Chronomètre lancé — à toi de jouer !"
            onClick={()=>setPage("chrono-finish")} col="#a78bfa"/>
          <ModeBtn icon={Clock} label="Horloge Double"
            sub="Enchaîne D1 à D20, Bull et Double Bull. Chrono par cible, stats et double favori."
            onClick={()=>setPage("horloge-double")} col="#a855f7"/>
          <SoonBtn icon={HelpCircle} label="Quiz fléchettes" sub="Teste tes connaissances sur les règles, les pros et l'histoire du fléché." />
          <SoonBtn icon={Brain} label="Défis mentaux" sub="Calcul rapide, mémoire des zones, routes optimales..." />
          <SoonBtn icon={Users} label="Jeux communautaires" sub="Défis partagés, classements hebdo, événements spéciaux." />
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

        {/* Bouton 1 — Trouve ton spot (image 16:9) */}
        <div
          className="lp-btn"
          onClick={() => setPage("bars")}
          style={{ borderRadius:18, overflow:"hidden", cursor:"pointer", userSelect:"none", boxShadow:"0 8px 32px #f9731644" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 14px 40px #f9731666"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.boxShadow="0 8px 32px #f9731644"; }}
        >
          <img src="/trouve ton spot 16.92.png" alt="Trouve ton spot" style={{ width:"100%", display:"block" }}/>
        </div>

        {/* Bouton 2 — Scoreur rapide */}
        <div
          className="lp-btn"
          onClick={() => setPage("scoreur-libre")}
          style={{ borderRadius:18, overflow:"hidden", cursor:"pointer", userSelect:"none", boxShadow:"0 8px 32px #22c55e22" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 14px 40px #22c55e44"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.boxShadow="0 8px 32px #22c55e22"; }}
        >
          <img src="/scoreur 16.9.png" alt="Scoreur" style={{ width:"100%", display:"block" }}/>
        </div>

        {/* Bouton 3 — Créer mon compte */}
        <div
          className="lp-btn"
          onClick={() => setPage("connexion")}
          style={{ borderRadius:18, overflow:"hidden", cursor:"pointer", userSelect:"none", boxShadow:"0 8px 32px #a78bfa22" }}
          onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow="0 14px 40px #a78bfa44"; }}
          onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)";    e.currentTarget.style.boxShadow="0 8px 32px #a78bfa22"; }}
        >
          <img src="/créer un compte 16.9.png" alt="Créer mon compte" style={{ width:"100%", display:"block" }}/>
        </div>
      </div>

      {/* Signature discrète */}
      <div style={{ marginTop:40, color:"#ffffff22", fontSize:11, letterSpacing:1, animation:"fadeUp .5s .2s ease-out both" }}>
        DART POINT · Le réseau fléchettes
      </div>
    </div>
  );
};

// ── PAGE BARS — REWORK COMPLET ────────────────────────────────────────────────
const Bars = ({ bars, associations=[], setPage, setBarSlug, setAssoSlug=()=>{}, villeFilter, setVilleFilter, barsActifs }) => {
  const [search, setSearch]       = useState("");
  const [view, setView]           = useState("carte");
  const [typeVue, setTypeVue]     = useState("bars");
  const [userPos, setUserPos]     = useState(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoErr, setGeoErr]       = useState("");
  const [chipFilter, setChipFilter] = useState("tous"); // pour bars : tous/actifs/traditionnel/electronique/tournois
  const [joueursPresentAujourd, setJoueursPresentAujourd] = useState(0);

  useEffect(() => { if (villeFilter) { setSearch(villeFilter); setVilleFilter(null); } }, [villeFilter]);

  // Stats live : nb joueurs actifs aujourd'hui
  useEffect(() => {
    sb(`presences?date_jour=eq.${new Date().toISOString().slice(0,10)}&select=joueur_id`).then(r => {
      setJoueursPresentAujourd((r||[]).length);
    }).catch(() => {});
  }, []);

  const geolocate = () => {
    if (!navigator.geolocation) { setGeoErr("Géolocalisation non supportée"); return; }
    if (userPos) { setUserPos(null); setGeoErr(""); return; }
    setGeoLoading(true); setGeoErr("");
    navigator.geolocation.getCurrentPosition(
      pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); setSearch(""); },
      ()  => { setGeoErr("Position non disponible — vérifiez les permissions"); setGeoLoading(false); }
    );
  };

  const filteredBars = useMemo(() => {
    const q = search.toLowerCase();
    let list = bars.filter(b => {
      if (q && !b.ville?.toLowerCase().includes(q) && !b.nom?.toLowerCase().includes(q)) return false;
      if (chipFilter === "actifs"        && !barsActifs.includes(b.slug)) return false;
      if (chipFilter === "traditionnel"  && b.type !== "traditionnel")    return false;
      if (chipFilter === "electronique"  && b.type !== "electronique")    return false;
      if (chipFilter === "tournois"      && !b.tournois)                  return false;
      if (typeVue === "tournois"         && !b.tournois)                  return false;
      return true;
    });
    if (userPos) {
      list = list.map(b => ({ ...b, _dist: b.lat&&b.lng ? haversine(userPos.lat,userPos.lng,b.lat,b.lng) : Infinity }))
                 .sort((a,b) => a._dist - b._dist);
    }
    return list;
  }, [bars, search, chipFilter, typeVue, barsActifs, userPos]);

  const filteredAssos = useMemo(() => {
    const q = search.toLowerCase();
    return associations.filter(a => {
      if (q && !a.ville?.toLowerCase().includes(q) && !a.nom?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [associations, search]);

  // ── Thèmes par onglet ────────────────────────────────────────────────────────
  const THEMES = {
    bars:    { accent:"#f97316", glow:"#f9731644", bg:"linear-gradient(160deg,#0f0f0f 0%,#1a0800 60%,#0f0f0f 100%)", chip:"#f97316" },
    assos:   { accent:"#7c3aed", glow:"#7c3aed44", bg:"linear-gradient(160deg,#0a0a14 0%,#0d0722 60%,#0a0a14 100%)", chip:"#a78bfa" },
    tournois:{ accent:"#dc2626", glow:"#dc262644", bg:"linear-gradient(160deg,#0f0a0a 0%,#1a0a0a 60%,#0a0a0f 100%)", chip:"#fbbf24" },
  };
  const T = THEMES[typeVue];

  // ── Styles partagés ──────────────────────────────────────────────────────────
  const tabBtn = (active, col) => ({
    flex:1, padding:"13px 6px", borderRadius:14,
    border: `2px solid ${active ? col : "#2a2a2a"}`,
    background: active ? col+"22" : "transparent",
    color: active ? col : "#64748b",
    fontWeight: active ? 800 : 500, fontSize:13,
    cursor:"pointer", transition:"all .2s",
    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
  });

  return (
    <div style={{ minHeight:"100vh", background:T.bg, fontFamily:"Inter,sans-serif" }}>
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.4)} }
        @keyframes glow-bar { 0%,100%{box-shadow:0 0 20px ${T.glow}} 50%{box-shadow:0 0 40px ${T.glow},0 0 80px ${T.glow}55} }
        .chip-scroll::-webkit-scrollbar{display:none}
      `}</style>

      <div style={{ maxWidth:980, margin:"0 auto", padding:"20px 16px 100px" }}>

        {/* ── ONGLETS PRINCIPAUX ─────────────────────────────────────────────── */}
        <div style={{ display:"flex", gap:8, marginBottom:20 }}>
          <button onClick={()=>{ setTypeVue("bars"); setChipFilter("tous"); }} style={tabBtn(typeVue==="bars","#f97316")}>
            <Building2 size={20}/><span>Bars</span>
          </button>
          <button onClick={()=>{ setTypeVue("assos"); setChipFilter("tous"); }} style={tabBtn(typeVue==="assos","#7c3aed")}>
            <Users size={20}/><span>Associations</span>
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ── VUE BARS ──────────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {typeVue === "bars" && (<>

          {/* Header orange avec stats live */}
          <div style={{ background:"linear-gradient(135deg,#1a0f00,#2a1500)", border:"1px solid #f9731630", borderRadius:20, padding:"20px 20px 16px", marginBottom:16, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", background:"radial-gradient(circle,#f9731620,transparent)", pointerEvents:"none" }}/>
            <h1 style={{ fontWeight:900, fontSize:22, color:"#fff", marginBottom:12, textShadow:"0 0 20px #f9731688", display:"flex", alignItems:"center", gap:10 }}><Building2 size={22} color="#f97316"/> Bars à fléchettes</h1>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:"#f97316", animation:"pulse-dot 2s infinite" }}/>
                <span style={{ fontWeight:700, fontSize:14, color:"#f97316" }}>{bars.length}</span>
                <span style={{ fontSize:12, color:"#94a3b8" }}>bars référencés</span>
              </div>
              {barsActifs.length > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e", animation:"pulse-dot 2s .5s infinite" }}/>
                  <span style={{ fontWeight:700, fontSize:14, color:"#22c55e" }}>{barsActifs.length}</span>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>actifs ce soir</span>
                </div>
              )}
              {joueursPresentAujourd > 0 && (
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:"#60a5fa", animation:"pulse-dot 2s 1s infinite" }}/>
                  <span style={{ fontWeight:700, fontSize:14, color:"#60a5fa" }}>{joueursPresentAujourd}</span>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>joueurs présents aujourd'hui</span>
                </div>
              )}
            </div>
          </div>

          {/* Chips filtres horizontaux scrollables */}
          <div className="chip-scroll" style={{ display:"flex", gap:8, overflowX:"auto", marginBottom:14, paddingBottom:4 }}>
            {[
              { v:"tous", Icon:Building2, l:"Tous" },
              { v:"actifs", Icon:null, l:"Actifs ce soir" },
              { v:"traditionnel", Icon:Target, l:"Traditionnel" },
              { v:"electronique", Icon:Zap, l:"Électronique" },
              { v:"tournois", Icon:Trophy, l:"Avec tournois" },
            ].map(({ v, Icon:FIcon, l }) => (
              <button key={v} onClick={()=>setChipFilter(v)} style={{
                whiteSpace:"nowrap", flexShrink:0,
                padding:"8px 14px", borderRadius:20,
                border:`1.5px solid ${chipFilter===v?"#f97316":"#2a2a2a"}`,
                background: chipFilter===v?"linear-gradient(135deg,#f97316,#ea580c)":"#1a1a1a",
                color: chipFilter===v?"#fff":"#94a3b8",
                fontWeight: chipFilter===v?700:400, fontSize:12,
                cursor:"pointer", transition:"all .15s",
                display:"flex", alignItems:"center", gap:5,
              }}>
                {v==="actifs"
                  ? <div style={{ width:8,height:8,borderRadius:"50%",background:chipFilter==="actifs"?"#fff":"#22c55e",animation:"pulse-dot 2s infinite",flexShrink:0 }}/>
                  : FIcon && <FIcon size={14} color={chipFilter===v?"#fff":"#94a3b8"}/>
                }
                <span>{l}</span>
                {v==="actifs" && barsActifs.length>0 && chipFilter!=="actifs" && (
                  <span style={{ background:"#22c55e", color:"#fff", borderRadius:10, padding:"0 5px", fontSize:10, fontWeight:700, marginLeft:2 }}>{barsActifs.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Search + Geo */}
          <div style={{ display:"flex", gap:8, marginBottom:12 }}>
            <div style={{ position:"relative", flex:1 }}>
              <Search size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",pointerEvents:"none" }} color="#64748b"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un bar ou une ville…"
                style={{ width:"100%",background:"#1a1a1a",border:`1px solid ${search?"#f97316":"#2a2a2a"}`,borderRadius:10,padding:"10px 36px 10px 36px",color:"#f1f5f9",fontSize:16,boxSizing:"border-box",outline:"none" }}/>
              {search&&<button onClick={()=>setSearch("")} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#64748b",cursor:"pointer",display:"flex",alignItems:"center" }}><X size={15}/></button>}
            </div>
            <button onClick={geolocate} disabled={geoLoading}
              style={{ background:userPos?"#22c55e22":"#1a1a1a",color:userPos?"#22c55e":"#94a3b8",border:`1px solid ${userPos?"#22c55e":"#2a2a2a"}`,borderRadius:10,padding:"0 14px",cursor:"pointer",fontSize:12,fontWeight:600,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5,flexShrink:0 }}>
              {geoLoading ? <RefreshCw size={14} style={{ animation:"spin 1s linear infinite" }}/> : <Navigation size={14}/>}
              <span>{geoLoading?"…":userPos?"Désactiver":"Autour de moi"}</span>
            </button>
          </div>
          {geoErr&&<p style={{ color:"#f87171",fontSize:12,marginBottom:10,display:"flex",alignItems:"center",gap:5 }}><AlertCircle size={13}/> {geoErr}</p>}

          {/* Carte/Liste */}
          <div style={{ display:"flex",background:"#1a1a1a",border:"1px solid #2a2a2a",borderRadius:10,overflow:"hidden",marginBottom:14 }}>
            {[
              { v:"carte", Icon:Map, l:"Carte" },
              { v:"liste", Icon:List, l:"Liste" },
            ].map(({ v, Icon:FIcon, l })=>(
              <button key={v} onClick={()=>setView(v)} style={{ flex:1,padding:"9px 0",background:view===v?"#f97316":"transparent",color:view===v?"#fff":"#94a3b8",border:"none",cursor:"pointer",fontWeight:view===v?700:400,fontSize:13,transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                <FIcon size={14}/> {l}
              </button>
            ))}
          </div>

          {/* Carte */}
          {view==="carte"&&(
            <div style={{ marginBottom:16,borderRadius:16,overflow:"hidden",border:"1px solid #f9731620",boxShadow:"0 0 30px #f9731620" }}>
              <LeafletMap bars={filteredBars} associations={[]} onBarClick={s=>{setBarSlug(s);setPage("bar");}} centerVille={search||null} height="48vh" barsActifs={barsActifs} userPos={userPos}/>
            </div>
          )}

          {/* Liste */}
          {(view==="liste")&&(
            filteredBars.length===0
              ? <div style={{ textAlign:"center",padding:"40px 20px",color:"#64748b" }}><div style={{ marginBottom:10,display:"flex",justifyContent:"center" }}><Search size={44} color="#64748b"/></div><p>Aucun bar trouvé.</p></div>
              : <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {filteredBars.map(b=>(
                    <div key={b.id} onClick={()=>{setBarSlug(b.slug);setPage("bar");}}
                      style={{ background:"#1a1a1a",border:`1px solid ${barsActifs.includes(b.slug)?"#22c55e44":"#2a2a2a"}`,borderRadius:14,padding:"14px 16px",cursor:"pointer",transition:"all .15s",position:"relative",overflow:"hidden" }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#f97316";e.currentTarget.style.boxShadow="0 0 20px #f9731620";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor=barsActifs.includes(b.slug)?"#22c55e44":"#2a2a2a";e.currentTarget.style.boxShadow="none";}}>
                      {barsActifs.includes(b.slug)&&<div style={{ position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,#22c55e,transparent)" }}/>}
                      <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                        <div style={{ width:46,height:46,borderRadius:12,background:"#f9731620",border:"1px solid #f9731640",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          {b.type==="traditionnel" ? <Target size={22} color="#f97316"/> : b.type==="electronique" ? <Zap size={22} color="#f97316"/> : <Building2 size={22} color="#f97316"/>}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ display:"flex",alignItems:"center",gap:7,marginBottom:3,flexWrap:"wrap" }}>
                            <span style={{ fontWeight:700,fontSize:15,color:"#f1f5f9" }}>{b.nom}</span>
                            {barsActifs.includes(b.slug)&&<span style={{ background:"#22c55e20",color:"#22c55e",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,display:"inline-flex",alignItems:"center",gap:3 }}><div style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e",animation:"pulse-dot 2s infinite" }}/> Ce soir</span>}
                            {b.tournois&&<span style={{ background:"#fbbf2420",color:"#fbbf24",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,display:"inline-flex",alignItems:"center",gap:3 }}><Trophy size={10}/> Tournois</span>}
                          </div>
                          <div style={{ color:"#64748b",fontSize:12,marginBottom:5,display:"flex",alignItems:"center",gap:4 }}><MapPin size={11}/> {b.ville}{b.adresse?` · ${b.adresse}`:""}</div>
                          <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                            <span style={{ background:"#a78bfa18",color:"#a78bfa",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3 }}><Target size={10}/> {b.cibles} cible{b.cibles>1?"s":""}</span>
                            <span style={{ background:"#f9731618",color:"#f97316",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3 }}>
                              {b.type==="traditionnel" ? <><Target size={10}/> Traditionnel</> : b.type==="electronique" ? <><Zap size={10}/> Électronique</> : <><Building2 size={10}/> Bar</>}
                            </span>
                          </div>
                        </div>
                        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0 }}>
                          {b._dist!=null&&b._dist!==Infinity&&<span style={{ color:"#60a5fa",fontWeight:700,fontSize:13 }}>{b._dist<1?(b._dist*1000).toFixed(0)+" m":b._dist.toFixed(1)+" km"}</span>}
                          <span style={{ background:"linear-gradient(135deg,#f97316,#ea580c)",color:"#fff",padding:"6px 12px",borderRadius:8,fontSize:12,fontWeight:700 }}>Voir →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {/* FABs */}
          <div style={{ position:"fixed",bottom:24,right:16,zIndex:500,display:"flex",flexDirection:"column",gap:10,alignItems:"flex-end" }}>
            {barsActifs.length>0&&(
              <button onClick={()=>{ setChipFilter("actifs"); setView("liste"); }} style={{ background:"linear-gradient(135deg,#22c55e,#16a34a)",color:"#fff",border:"none",borderRadius:50,padding:"11px 18px",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 4px 20px #22c55e55",display:"flex",alignItems:"center",gap:7 }}>
                <Target size={15}/> Trouver une partie
              </button>
            )}
            <button onClick={()=>setPage("proposer")} style={{ background:"linear-gradient(135deg,#f97316,#ea580c)",color:"#fff",border:"none",borderRadius:50,padding:"11px 18px",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 4px 20px #f9731655",display:"flex",alignItems:"center",gap:7 }}>
              <span style={{ fontSize:16 }}>+</span> Ajouter un bar
            </button>
          </div>
        </>)}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ── VUE ASSOCIATIONS ──────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {typeVue === "assos" && (<>

          {/* Header violet */}
          <div style={{ background:"linear-gradient(135deg,#0f0a1e,#1a1030)", border:"1px solid #7c3aed30", borderRadius:20, padding:"20px 20px 16px", marginBottom:16, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,#7c3aed20,transparent)",pointerEvents:"none" }}/>
            <h1 style={{ fontWeight:900,fontSize:22,color:"#fff",marginBottom:8,textShadow:"0 0 20px #a78bfa88",display:"flex",alignItems:"center",gap:10 }}><Users size={22} color="#a78bfa"/> Associations</h1>
            <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
              <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                <span style={{ fontWeight:700,fontSize:14,color:"#a78bfa" }}>{associations.length}</span>
                <span style={{ fontSize:12,color:"#94a3b8" }}>clubs référencés</span>
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                <span style={{ fontWeight:700,fontSize:14,color:"#c4b5fd" }}>{filteredAssos.filter(a=>a.description||a.ville).length}</span>
                <span style={{ fontSize:12,color:"#94a3b8" }}>clubs actifs</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div style={{ position:"relative",marginBottom:14 }}>
            <Search size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",pointerEvents:"none" }} color="#64748b"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une association ou une ville…"
              style={{ width:"100%",background:"#13101e",border:`1px solid ${search?"#7c3aed":"#2a2a3e"}`,borderRadius:10,padding:"10px 36px",color:"#f1f5f9",fontSize:16,boxSizing:"border-box",outline:"none" }}/>
            {search&&<button onClick={()=>setSearch("")} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#64748b",cursor:"pointer",display:"flex",alignItems:"center" }}><X size={15}/></button>}
          </div>

          {/* Carte/Liste */}
          <div style={{ display:"flex",background:"#13101e",border:"1px solid #2a2a3e",borderRadius:10,overflow:"hidden",marginBottom:14 }}>
            {[
              { v:"carte", Icon:Map, l:"Carte" },
              { v:"liste", Icon:List, l:"Liste" },
            ].map(({ v, Icon:FIcon, l })=>(
              <button key={v} onClick={()=>setView(v)} style={{ flex:1,padding:"9px 0",background:view===v?"#7c3aed":"transparent",color:view===v?"#fff":"#94a3b8",border:"none",cursor:"pointer",fontWeight:view===v?700:400,fontSize:13,transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                <FIcon size={14}/> {l}
              </button>
            ))}
          </div>

          {/* Carte */}
          {view==="carte"&&(
            <div style={{ marginBottom:16,borderRadius:16,overflow:"hidden",border:"1px solid #7c3aed20",boxShadow:"0 0 30px #7c3aed15" }}>
              <LeafletMap bars={[]} associations={filteredAssos} onAssoClick={s=>{setAssoSlug(s);setPage("asso");}} centerVille={search||null} height="48vh"/>
            </div>
          )}

          {/* Liste associations */}
          {view==="liste"&&(
            filteredAssos.length===0
              ? <div style={{ textAlign:"center",padding:"40px 20px",color:"#64748b" }}><div style={{ marginBottom:10,display:"flex",justifyContent:"center" }}><Search size={44} color="#64748b"/></div><p>Aucune association trouvée.</p></div>
              : <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {filteredAssos.map(a=>(
                    <div key={a.slug} onClick={()=>{setAssoSlug(a.slug);setPage("asso");}}
                      style={{ background:"#13101e",border:"1px solid #2a2a3e",borderRadius:14,padding:"16px 18px",cursor:"pointer",transition:"all .15s" }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#7c3aed";e.currentTarget.style.boxShadow="0 0 20px #7c3aed20";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a3e";e.currentTarget.style.boxShadow="none";}}>
                      <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                        <div style={{ width:48,height:48,borderRadius:12,background:"linear-gradient(135deg,#7c3aed22,#a78bfa22)",border:"1px solid #7c3aed44",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
                          <Users size={24} color="#a78bfa"/>
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontWeight:700,fontSize:15,color:"#f1f5f9",marginBottom:3 }}>{a.nom}</div>
                          <div style={{ fontSize:12,color:"#64748b",display:"flex",alignItems:"center",gap:4 }}><MapPin size={11}/> {a.ville}{a.zone?` · ${a.zone}`:""}</div>
                          {a.description&&<div style={{ fontSize:11,color:"#94a3b8",marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{a.description}</div>}
                        </div>
                        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0 }}>
                          <span style={{ background:"#7c3aed18",color:"#a78bfa",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600 }}>Club</span>
                          <ChevronRight size={18} color="#a78bfa"/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {/* Bloc président */}
          <div style={{ background:"linear-gradient(135deg,#1a1030,#0f0a1e)",border:"1px solid #7c3aed44",borderRadius:16,padding:"18px 20px",marginTop:20 }}>
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:8 }}>
              <Crown size={28} color="#a78bfa"/>
              <div>
                <div style={{ fontWeight:800,fontSize:15,color:"#f1f5f9" }}>Vous êtes président de club ?</div>
                <div style={{ fontSize:12,color:"#94a3b8" }}>Demandez l'accès admin pour gérer votre association</div>
              </div>
            </div>
            <button onClick={()=>setPage("proposer-asso")} style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)",color:"#fff",border:"none",borderRadius:10,padding:"10px 18px",cursor:"pointer",fontSize:13,fontWeight:700,width:"100%",marginTop:4 }}>
              <Flame size={15}/> Demander accès administrateur
            </button>
          </div>

          {/* FAB asso */}
          <div style={{ position:"fixed",bottom:24,right:16,zIndex:500 }}>
            <button onClick={()=>setPage("proposer-asso")} style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)",color:"#fff",border:"none",borderRadius:50,padding:"11px 18px",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 4px 20px #7c3aed55",display:"flex",alignItems:"center",gap:7 }}>
              <span style={{ fontSize:16 }}>+</span> Ajouter une asso
            </button>
          </div>
        </>)}

        {/* ══════════════════════════════════════════════════════════════════════ */}
        {/* ── VUE TOURNOIS ──────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════════ */}
        {typeVue === "tournois" && (<>

          {/* Header rouge/or */}
          <div style={{ background:"linear-gradient(135deg,#1a0a0a,#2a0f0f)",border:"1px solid #dc262630",borderRadius:20,padding:"20px 20px 16px",marginBottom:16,position:"relative",overflow:"hidden" }}>
            <div style={{ position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle,#dc262620,transparent)",pointerEvents:"none" }}/>
            <h1 style={{ fontWeight:900,fontSize:22,color:"#fff",marginBottom:8,textShadow:"0 0 20px #ef444488",display:"flex",alignItems:"center",gap:10 }}><Trophy size={22} color="#fbbf24"/> Bars avec tournois</h1>
            <div style={{ display:"flex",gap:16,flexWrap:"wrap" }}>
              <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                <div style={{ width:8,height:8,borderRadius:"50%",background:"#fbbf24",animation:"pulse-dot 2s infinite" }}/>
                <span style={{ fontWeight:700,fontSize:14,color:"#fbbf24" }}>{bars.filter(b=>b.tournois).length}</span>
                <span style={{ fontSize:12,color:"#94a3b8" }}>bars avec tournois</span>
              </div>
            </div>
          </div>

          {/* Search */}
          <div style={{ position:"relative",marginBottom:14 }}>
            <Search size={15} style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",pointerEvents:"none" }} color="#64748b"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un bar ou une ville…"
              style={{ width:"100%",background:"#1a0f0f",border:`1px solid ${search?"#dc2626":"#3a1a1a"}`,borderRadius:10,padding:"10px 36px",color:"#f1f5f9",fontSize:16,boxSizing:"border-box",outline:"none" }}/>
            {search&&<button onClick={()=>setSearch("")} style={{ position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#64748b",cursor:"pointer",display:"flex",alignItems:"center" }}><X size={15}/></button>}
          </div>

          {/* Carte/Liste */}
          <div style={{ display:"flex",background:"#1a0f0f",border:"1px solid #3a1a1a",borderRadius:10,overflow:"hidden",marginBottom:14 }}>
            {[
              { v:"carte", Icon:Map, l:"Carte" },
              { v:"liste", Icon:List, l:"Liste" },
            ].map(({ v, Icon:FIcon, l })=>(
              <button key={v} onClick={()=>setView(v)} style={{ flex:1,padding:"9px 0",background:view===v?"#dc2626":"transparent",color:view===v?"#fff":"#94a3b8",border:"none",cursor:"pointer",fontWeight:view===v?700:400,fontSize:13,transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
                <FIcon size={14}/> {l}
              </button>
            ))}
          </div>

          {/* Carte */}
          {view==="carte"&&(
            <div style={{ marginBottom:16,borderRadius:16,overflow:"hidden",border:"1px solid #dc262620",boxShadow:"0 0 30px #dc262615" }}>
              <LeafletMap bars={filteredBars} associations={[]} onBarClick={s=>{setBarSlug(s);setPage("bar");}} centerVille={search||null} height="48vh" barsActifs={barsActifs} userPos={userPos}/>
            </div>
          )}

          {/* Liste tournois */}
          {view==="liste"&&(
            filteredBars.length===0
              ? <div style={{ textAlign:"center",padding:"40px 20px",color:"#64748b" }}><div style={{ marginBottom:10,display:"flex",justifyContent:"center" }}><Trophy size={44} color="#64748b"/></div><p>Aucun bar avec tournois trouvé.</p></div>
              : <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {filteredBars.map(b=>(
                    <div key={b.id} onClick={()=>{setBarSlug(b.slug);setPage("bar");}}
                      style={{ background:"linear-gradient(135deg,#1a0f0f,#1a1a0f)",border:"1px solid #3a1a1a",borderRadius:14,padding:"16px 18px",cursor:"pointer",transition:"all .15s" }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor="#fbbf24";e.currentTarget.style.boxShadow="0 0 20px #fbbf2420";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="#3a1a1a";e.currentTarget.style.boxShadow="none";}}>
                      <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                        <div style={{ width:48,height:48,borderRadius:12,background:"linear-gradient(135deg,#fbbf2420,#dc262620)",border:"1px solid #fbbf2444",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}><Trophy size={24} color="#fbbf24"/></div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontWeight:700,fontSize:15,color:"#f1f5f9",marginBottom:3 }}>{b.nom}</div>
                          <div style={{ fontSize:12,color:"#64748b",marginBottom:5,display:"flex",alignItems:"center",gap:4 }}><MapPin size={11}/> {b.ville}</div>
                          <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                            <span style={{ background:"#fbbf2420",color:"#fbbf24",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,display:"inline-flex",alignItems:"center",gap:3 }}><Trophy size={10}/> Tournois</span>
                            {barsActifs.includes(b.slug)&&<span style={{ background:"#22c55e20",color:"#22c55e",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,display:"inline-flex",alignItems:"center",gap:3 }}><div style={{ width:6,height:6,borderRadius:"50%",background:"#22c55e",animation:"pulse-dot 2s infinite" }}/> Actif ce soir</span>}
                            <span style={{ background:"#f9731618",color:"#f97316",fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:600,display:"inline-flex",alignItems:"center",gap:3 }}><Target size={10}/> {b.cibles} cible{b.cibles>1?"s":""}</span>
                          </div>
                        </div>
                        <span style={{ background:"linear-gradient(135deg,#dc2626,#991b1b)",color:"#fff",padding:"7px 13px",borderRadius:8,fontSize:12,fontWeight:700,flexShrink:0 }}>Voir →</span>
                      </div>
                    </div>
                  ))}
                </div>
          )}
        </>)}

      </div>
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
  const [cibleReports,setCibleReports]=useState([]);
  const [cibleSending,setCibleSending]=useState(false);
  const presenceRef=useRef(null);

  useEffect(()=>{
    setLoading(true); setCover(null); setUserDist(null);
    db.getBar(slug).then(b=>{
      if(b){ const nv=(b.vues||0)+1; db.updateBarVues(slug,b.vues||0); setBar({...b,vues:nv}); setBars(p=>p.map(x=>x.slug===slug?{...x,vues:nv}:x)); }
      setLoading(false);
    }).catch(()=>setLoading(false));
    db.getPhotos(slug).then(p=>{ if(p?.[0]) setCover(p[0].data); }).catch(()=>{});
    db.getCibleReports(slug).then(r=>setCibleReports(r||[])).catch(()=>{});
  },[slug]);

  useEffect(()=>{
    if(!bar?.lat||!bar?.lng) return;
    if(navigator.geolocation) navigator.geolocation.getCurrentPosition(
      pos=>setUserDist(haversine(pos.coords.latitude,pos.coords.longitude,bar.lat,bar.lng)),()=>{}
    );
  },[bar]);

  if(loading) return <Spinner/>;
  if(!bar) return <div style={{ maxWidth:860,margin:"0 auto",padding:"36px 20px",textAlign:"center" }}><Btn onClick={()=>window.history.back()}>← Retour</Btn></div>;

  const CIBLE_SEUIL = 10;
  const alreadyVotedCible = joueur && cibleReports.some(r => r.joueur_id === joueur.id);

  const handlePasDeCible = async () => {
    if (!joueur) { setPage("connexion"); return; }
    if (alreadyVotedCible || cibleSending) return;
    setCibleSending(true);
    try {
      await db.addCibleReport({ bar_slug: bar.slug, joueur_id: joueur.id });
      const newReports = [...cibleReports, { joueur_id: joueur.id }];
      setCibleReports(newReports);
      if (newReports.length >= CIBLE_SEUIL) {
        await db.deleteBar(bar.slug);
        setBars(p => p.filter(x => x.slug !== bar.slug));
        setPage("bars");
      }
    } catch(e) { /* conflit UNIQUE = déjà voté */ }
    setCibleSending(false);
  };

  const asso=associations.find(a=>a.nom===bar.association);
  const ti=typeInfo(bar.type);
  const mapsUrl=`https://www.google.com/maps/search/${encodeURIComponent((bar.adresse||bar.nom)+" "+bar.ville)}`;
  const shareUrl=`${window.location.origin}/bars/${bar.slug}`;
  const handleShare=()=>{
    if(navigator.share){ navigator.share({title:bar.nom,text:`${bar.nom} sur DartPoint`,url:shareUrl}).catch(()=>{}); }
    else { try{navigator.clipboard.writeText(shareUrl);}catch{} setCopied(true); setTimeout(()=>setCopied(false),2000); }
  };

  return (
    <div style={{ maxWidth:860,margin:"0 auto",paddingBottom:100 }}>
      {showSignal&&<SignalForm barSlug={bar.slug} barNom={bar.nom} onClose={()=>setShowSignal(false)}/>}
      {showEdit&&<EditBarModal bar={bar} joueur={joueur} onSave={u=>{setBar(u);setBars(p=>p.map(x=>x.slug===slug?u:x));}} onClose={()=>setShowEdit(false)}/>}

      {/* ── HERO COVER ── */}
      <div style={{ position:"relative",height:220,overflow:"hidden" }}>
        {cover
          ? <img src={cover} alt={bar.nom} style={{ width:"100%",height:"100%",objectFit:"cover" }}/>
          : <div style={{ width:"100%",height:"100%",background:`linear-gradient(135deg,${ti.color}44 0%,#111 65%)`,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <span style={{ fontSize:80,opacity:.15 }}>🍺</span>
            </div>
        }
        <div style={{ position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,.5) 0%,transparent 45%,rgba(15,15,15,.97) 100%)" }}/>
        <button onClick={()=>window.history.back()} style={{ position:"absolute",top:16,left:16,background:"rgba(0,0,0,.55)",border:"none",color:"#fff",cursor:"pointer",borderRadius:10,padding:"7px 14px",fontSize:13,backdropFilter:"blur(10px)",fontWeight:500,display:"flex",alignItems:"center",gap:6 }}><ArrowLeft size={15}/> Retour</button>
        {(isAdmin||joueur)&&<button onClick={()=>joueur?setShowEdit(true):null} style={{ position:"absolute",top:16,right:16,background:"rgba(0,0,0,.55)",border:`1px solid ${isAdmin?C.yellow+"66":"#ffffff44"}`,color:isAdmin?C.yellow:"#fff",cursor:"pointer",borderRadius:10,padding:"7px 13px",fontSize:12,backdropFilter:"blur(10px)",display:"flex",alignItems:"center",gap:5 }}><Pencil size={13}/> Modifier</button>}
      </div>

      <div style={{ padding:"0 16px" }}>

        {/* ── IDENTITY CARD (overlap hero) ── */}
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"16px 18px",marginTop:-44,position:"relative",zIndex:10,marginBottom:12 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,flexWrap:"wrap" }}>
            <div style={{ flex:1,minWidth:0 }}>
              <h1 style={{ fontWeight:800,fontSize:22,marginBottom:8,lineHeight:1.2 }}>{bar.nom}</h1>
              <div style={{ display:"flex",gap:6,flexWrap:"wrap",alignItems:"center" }}>
                {bar.verifie&&<Badge color={C.green} style={{ display:"inline-flex",alignItems:"center",gap:3 }}><Check size={11}/> Vérifié</Badge>}
                <Badge color={ti.color}>{ti.l}</Badge>
                {userDist!=null&&<Badge color="#60a5fa" style={{ display:"inline-flex",alignItems:"center",gap:3 }}><MapPin size={11}/> {userDist<1?(userDist*1000).toFixed(0)+" m":userDist.toFixed(1)+" km"}</Badge>}
              </div>
            </div>
            <span style={{ fontSize:11,color:C.muted,flexShrink:0,marginTop:4,display:"flex",alignItems:"center",gap:4 }}><Eye size={12}/> {bar.vues||0} vues</span>
          </div>
          <p style={{ color:C.muted,fontSize:12,marginTop:10,display:"flex",alignItems:"center",gap:5 }}><MapPin size={13}/> {bar.adresse}{bar.adresse?", ":""}{bar.cp} {bar.ville}</p>
        </div>

        {/* ── ACTIONS RAPIDES ── */}
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20 }}>
          {[
            {Icon:MapPin,label:"Itinéraire",fn:()=>window.open(mapsUrl,"_blank")},
            {Icon:Phone,label:"Appeler",fn:()=>{if(bar.tel)window.open(`tel:${bar.tel}`);},off:!bar.tel},
            {Icon:Share2,label:"Partager",fn:handleShare},
            {Icon:Map,label:"Maps",fn:()=>window.open(mapsUrl,"_blank")},
          ].map((b,i)=>(
            <button key={i} onClick={b.fn} disabled={b.off}
              style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 6px",cursor:b.off?"default":"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,opacity:b.off?.35:1,transition:"border-color .15s" }}
              onMouseEnter={e=>{ if(!b.off) e.currentTarget.style.borderColor=C.accent; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; }}>
              <b.Icon size={22} color={b.off ? C.muted : C.accent}/>
              <span style={{ fontSize:11,color:C.muted,fontWeight:500 }}>{b.label}</span>
            </button>
          ))}
        </div>
        {copied&&<p style={{ textAlign:"center",color:C.green,fontSize:12,marginTop:-12,marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}><Check size={13}/> Lien copié !</p>}

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
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16 }}>
            <h3 style={{ fontWeight:700,fontSize:16,color:C.accent,display:"flex",alignItems:"center",gap:7,margin:0 }}><Info size={16} color={C.accent}/> Infos du spot</h3>
            {joueur
              ? <button onClick={()=>setShowEdit(true)} style={{ background:C.accentTint,border:`1px solid ${C.accentBorder}`,color:C.accent,cursor:"pointer",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5 }}><Pencil size={12}/> Modifier</button>
              : <button onClick={()=>setPage("connexion")} style={{ background:"#1a1a1a",border:`1px solid ${C.border}`,color:C.muted,cursor:"pointer",borderRadius:8,padding:"6px 12px",fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5 }}><Pencil size={12}/> Modifier</button>
            }
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
            {[
              [MapPin,"Adresse",(bar.adresse||"—")+(bar.cp?" · "+bar.cp:"")+" "+bar.ville],
              [Clock,"Horaires",bar.horaires||"Non renseignés"],
              [Phone,"Téléphone",bar.tel||"Non renseigné"],
              [Target,"Cibles",bar.cibles != null ? bar.cibles+" cible"+(bar.cibles>1?"s":"") : "Non renseigné"],
              [Trophy,"Tournois",bar.tournois ? <span style={{ display:"flex",alignItems:"center",gap:4 }}><Check size={12} color={C.green}/> Tournois réguliers</span> : "Non"],
              [Building2,"Type de jeu",ti.l],
            ].map(([IconComp,label,value])=>(
              <div key={label} style={{ display:"flex",gap:10,alignItems:"flex-start" }}>
                <IconComp size={15} style={{ marginTop:1,flexShrink:0 }} color={C.accent}/>
                <div>
                  <div style={{ fontSize:10,color:C.muted,marginBottom:2,letterSpacing:.5,fontWeight:700 }}>{label.toUpperCase()}</div>
                  <div style={{ fontSize:13,color:C.text }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PAS DE CIBLE ── */}
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12 }}>
          <div>
            <div style={{ fontWeight:700,fontSize:13,color:C.text,marginBottom:2 }}>Aucune cible ici ?</div>
            <div style={{ fontSize:12,color:C.muted }}>
              {cibleReports.length === 0 ? "Signale si ce bar n'a plus de fléchettes."
                : alreadyVotedCible ? `Tu as signalé ce bar — ${cibleReports.length}/${CIBLE_SEUIL} signalements`
                : `${cibleReports.length}/${CIBLE_SEUIL} joueurs ont signalé l'absence de cible`}
            </div>
          </div>
          <button
            onClick={handlePasDeCible}
            disabled={alreadyVotedCible || cibleSending}
            style={{ flexShrink:0, background: alreadyVotedCible ? "#1a1a1a" : `linear-gradient(135deg,${C.red},#dc2626)`, border: alreadyVotedCible ? `1px solid ${C.border}` : "none", color: alreadyVotedCible ? C.muted : "#fff", borderRadius:10, padding:"9px 16px", fontSize:13, fontWeight:700, cursor: alreadyVotedCible ? "not-allowed" : "pointer", display:"flex", alignItems:"center", gap:6, opacity: cibleSending ? .6 : 1 }}>
            <AlertCircle size={14}/>
            {alreadyVotedCible ? "Signalé" : "Pas de cible"}
          </button>
        </div>

        {/* ── DESCRIPTION ── */}
        {bar.description&&<div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:18,marginBottom:16 }}>
          <h3 style={{ fontWeight:700,fontSize:14,marginBottom:10,color:C.accent,display:"flex",alignItems:"center",gap:7 }}><MessageCircle size={14} color={C.accent}/> Description</h3>
          <p style={{ color:C.muted,lineHeight:1.7,fontSize:13 }}>{bar.description}</p>
        </div>}

        {/* ── ASSOCIATION PARTENAIRE ── */}
        {asso&&<div onClick={()=>{setAssoSlug(asso.slug);setPage("asso");}}
          style={{ background:"#120a1a",border:`1px solid #f472b644`,borderRadius:14,padding:16,marginBottom:16,cursor:"pointer",display:"flex",alignItems:"center",gap:14 }}>
          <Users size={28} color="#f472b6" style={{ flexShrink:0 }}/>
          <div>
            <div style={{ fontSize:10,color:"#f472b6",fontWeight:700,marginBottom:4,letterSpacing:.5 }}>ASSOCIATION PARTENAIRE</div>
            <div style={{ fontWeight:700,fontSize:14,marginBottom:2 }}>{asso.nom}</div>
            <div style={{ color:C.muted,fontSize:12 }}>{asso.jours} · Voir la fiche →</div>
          </div>
        </div>}

        {/* ── CARTE (secondaire, réduite) ── */}
        {bar.lat&&<div style={{ marginBottom:16 }}>
          <h3 style={{ fontWeight:600,fontSize:13,marginBottom:10,color:C.muted,display:"flex",alignItems:"center",gap:6 }}><Map size={13}/> Localisation</h3>
          <LeafletMap bars={allBars} onBarClick={()=>{}} centerSlug={bar.slug} height={180}/>
        </div>}

        {/* ── SIGNALER ── */}
        <div style={{ textAlign:"center",paddingTop:4,paddingBottom:16 }}>
          <button onClick={()=>setShowSignal(true)} style={{ background:"none",border:`1px solid ${C.border}`,borderRadius:10,color:C.muted,cursor:"pointer",fontSize:12,padding:"8px 20px",display:"flex",alignItems:"center",gap:6,margin:"0 auto" }}><AlertCircle size={13}/> Signaler une erreur</button>
        </div>
      </div>

      {/* ── STICKY CTA ── */}
      <div style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:200,padding:"10px 16px 22px",background:"linear-gradient(transparent,#0f0f0f 35%)",pointerEvents:"none" }}>
        <div style={{ maxWidth:860,margin:"0 auto",display:"flex",gap:10,pointerEvents:"auto" }}>
          <a href={mapsUrl} target="_blank" rel="noreferrer" style={{ flex:1,textDecoration:"none" }}>
            <button style={{ width:"100%",background:C.card,color:C.text,border:`1px solid ${C.border}`,borderRadius:14,padding:"13px 0",fontSize:14,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}><MapPin size={15}/> Itinéraire</button>
          </a>
          <button onClick={()=>{ if(!joueur){setPage("connexion");return;} presenceRef.current?.scrollIntoView({behavior:"smooth",block:"center"}); }}
            style={{ flex:2,background:C.accent,color:"#fff",border:"none",borderRadius:14,padding:"13px 0",fontSize:14,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 20px rgba(249,115,22,.4)",display:"flex",alignItems:"center",justifyContent:"center",gap:6 }}>
            <Target size={15}/> Je joue ici ce soir
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
      {/* FAB */}
      <div style={{ position:"fixed",bottom:24,right:16,zIndex:500 }}>
        <button onClick={()=>setPage("proposer-asso")} style={{ background:"linear-gradient(135deg,#7c3aed,#6d28d9)",color:"#fff",border:"none",borderRadius:50,padding:"11px 18px",cursor:"pointer",fontSize:13,fontWeight:700,boxShadow:"0 4px 20px #7c3aed55",display:"flex",alignItems:"center",gap:7 }}>
          <span style={{ fontSize:16 }}>+</span> Ajouter une asso
        </button>
      </div>
    </div>
  );
};

const AssoDetail = ({ slug, associations, setAssociations, bars, setPage, setBarSlug, isAdmin, joueur }) => {
  const asso = associations.find(a => a.slug === slug);
  if (!asso) return null;

  const [tab, setTab] = useState("club");
  const [membres, setMembres] = useState([]);
  const [loadMembres, setLoadMembres] = useState(true);
  const [events, setEvents] = useState([]);
  const [editingAsso, setEditingAsso] = useState(false);
  const [assoClassesIds, setAssoClassesIds] = useState(new Set());
  const [showAssoNonClasses, setShowAssoNonClasses] = useState(false);
  useEffect(() => {
    sb(`joueurs?asso_slug=eq.${encodeURIComponent(slug)}&order=drix.desc&select=id,pseudo,drix,photo,ville&limit=50`)
      .then(d => setMembres(Array.isArray(d) ? d : []))
      .catch(() => setMembres([]))
      .finally(() => setLoadMembres(false));
    sb(`tournois?association=eq.${encodeURIComponent(asso.nom)}&order=date.desc&select=*&limit=10`)
      .then(d => setEvents(Array.isArray(d) ? d : []))
      .catch(() => []);
    sb(`drix_mouvements?resultat=in.(victoire,defaite)&select=joueur_id`)
      .then(d => setAssoClassesIds(new Set((Array.isArray(d)?d:[]).map(m=>m.joueur_id))))
      .catch(() => {});
  }, [slug]);

  const stats = useMemo(() => {
    const n = membres.length;
    const drixMoyen = n > 0 ? Math.round(membres.reduce((s,m) => s + (m.drix||1000), 0) / n) : null;
    return { n, drixMoyen, totalM: 0, wr: null };
  }, [membres]);

  const badges = useMemo(() => {
    const b = [];
    if (stats.n >= 5) b.push({ Icon:Flame, l:"Club actif" });
    if (stats.wr != null && stats.wr >= 55) b.push({ Icon:Trophy, l:"Club compétitif" });
    if (stats.drixMoyen != null && stats.drixMoyen >= 1100) b.push({ Icon:Gem, l:"Elite" });
    if (events.length > 0) b.push({ Icon:Calendar, l:"Événements" });
    b.push({ Icon:Users, l:"Ambiance" });
    return b;
  }, [stats, events]);

  const ti = typeInfo(asso.type);
  const isUrl = v => v && (v.startsWith("http://") || v.startsWith("https://"));
  const isTel = v => v && /^[0-9 +().-]{6,}$/.test(v);

  const renderContact = (IconComp, label, val) => {
    if (!val) return null;
    return (
      <div style={{ display:"flex", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
        <IconComp size={18} color={C.muted} style={{ width:24, flexShrink:0, marginTop:2 }}/>
        <div>
          <div style={{ fontSize:11, color:C.muted, marginBottom:2 }}>{label}</div>
          {isUrl(val) ? (
            <a href={val} target="_blank" rel="noreferrer"
              style={{ fontSize:13, color:"#60a5fa", textDecoration:"none", wordBreak:"break-all", display:"flex",alignItems:"center",gap:5 }}>
              <ExternalLink size={12}/> {val.includes("facebook") ? "Voir sur Facebook" : val.includes("instagram") ? "Instagram" : val}
            </a>
          ) : isTel(val) ? (
            <a href={`tel:${val.replace(/\s/g,"")}`} style={{ fontSize:13, color:"#4ade80", textDecoration:"none" }}>{val}</a>
          ) : (
            <span style={{ fontSize:13 }}>{val}</span>
          )}
        </div>
      </div>
    );
  };

  const TABS = [
    { id:"club", Icon:HomeIcon, l:"Club" },
    { id:"membres", Icon:Users, l:`Membres${stats.n > 0 ? ` (${stats.n})` : ""}` },
    { id:"events", Icon:Calendar, l:`Événements${events.length > 0 ? ` (${events.length})` : ""}` },
    { id:"photos", Icon:Camera, l:"Photos" },
  ];

  // ── HEADER — JSX inline (pas de composant imbriqué pour éviter le démontage) ──
  const headerJSX = (
    <div style={{ position:"relative", marginBottom:24, borderRadius:20, overflow:"hidden",
      background:"linear-gradient(135deg,#0a0a0a 0%,#1a0a00 50%,#0a0a0a 100%)",
      border:`1px solid ${C.accent}44`, boxShadow:`0 0 40px ${C.accent}22` }}>
      {/* Bannière déco */}
      <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse at 30% 50%, #f9731611 0%, transparent 60%)", pointerEvents:"none" }}/>
      <div style={{ position:"absolute", top:0, right:0, width:200, height:200,
        background:"radial-gradient(circle, #f9731608 0%, transparent 70%)", pointerEvents:"none" }}/>
      <div style={{ padding:"28px 24px 24px" }}>
        {/* Logo + titre */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:18, marginBottom:20 }}>
          <div style={{ width:72, height:72, borderRadius:18, background:`linear-gradient(135deg,${C.accent}33,#7c3aed33)`,
            border:`2px solid ${C.accent}66`, display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0, boxShadow:`0 0 20px ${C.accent}33` }}>
            <Target size={32} color={C.accent}/>
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
              <h1 style={{ fontWeight:900, fontSize:24, lineHeight:1.2, margin:0, flex:1 }}>{asso.nom}</h1>
              {joueur ? (
                <button onClick={()=>setEditingAsso(true)}
                  style={{ background:"#ffffff14", border:"1px solid #ffffff22", borderRadius:8,
                    padding:"5px 12px", color:C.muted, fontSize:12, fontWeight:600, cursor:"pointer",
                    flexShrink:0, touchAction:"manipulation", display:"flex", alignItems:"center", gap:5 }}>
                  <Pencil size={13}/> Modifier
                </button>
              ) : (
                <button onClick={()=>setPage("connexion")}
                  style={{ background:"#f9731614", border:"1px solid #f9731644", borderRadius:8,
                    padding:"5px 12px", color:C.accent, fontSize:11, fontWeight:600, cursor:"pointer",
                    flexShrink:0, touchAction:"manipulation", display:"flex", alignItems:"center", gap:5 }}>
                  <Lock size={13}/> Connexion requise
                </button>
              )}
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center", marginBottom:8 }}>
              <span style={{ color:C.muted, fontSize:13, display:"flex",alignItems:"center",gap:4 }}><MapPin size={13}/> {asso.ville}</span>
              {asso.zone && <span style={{ color:C.muted, fontSize:13 }}>· {asso.zone}</span>}
              <Badge color={ti.color}>{ti.l}</Badge>
            </div>
            {/* Badges */}
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {badges.map(b => {
                const BIcon = b.Icon;
                return (
                  <span key={b.l} style={{ background:"#ffffff0d", border:"1px solid #ffffff22", borderRadius:20,
                    padding:"3px 10px", fontSize:11, fontWeight:600, color:"#e2e8f0", display:"inline-flex", alignItems:"center", gap:5 }}>
                    <BIcon size={13}/> {b.l}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stats rapides */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(90px,1fr))", gap:10 }}>
          {[
            { Icon:Users, v: stats.n > 0 ? stats.n : "—", l:"Membres" },
            { Icon:Gem, v: stats.drixMoyen ? stats.drixMoyen : "—", l:"DRIX moy." },
            { Icon:Swords, v: stats.totalM > 0 ? stats.totalM : "—", l:"Matchs" },
            { Icon:Trophy, v: stats.wr != null ? `${stats.wr}%` : "—", l:"Winrate" },
            { Icon:Calendar, v: events.length > 0 ? events.length : "—", l:"Tournois" },
          ].map(s => (
            <div key={s.l} style={{ background:"#ffffff08", borderRadius:12, padding:"12px 8px", textAlign:"center",
              border:"1px solid #ffffff11" }}>
              {(() => { const SI = s.Icon; return <SI size={20} color={s.v === "—" ? C.muted : C.accent} style={{ marginBottom:4 }}/>; })()}
              <div style={{ fontWeight:800, fontSize:18, color: s.v === "—" ? C.muted : C.accent, lineHeight:1 }}>{s.v}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:3, fontWeight:600, letterSpacing:.5, textTransform:"uppercase" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── TAB CLUB — JSX inline ──
  const tabClubJSX = (
    <div>

      {/* Description */}
      {asso.description && (
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20,marginBottom:16 }}>
          <div style={{ fontWeight:700,fontSize:13,color:C.accent,marginBottom:10,letterSpacing:.5,display:"flex",alignItems:"center",gap:6 }}><Info size={14} color={C.accent}/> À PROPOS</div>
          <p style={{ color:"#cbd5e1",lineHeight:1.8,fontSize:13 }}>{asso.description}</p>
        </div>
      )}

      {/* Infos pratiques */}
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20,marginBottom:16 }}>
        <div style={{ fontWeight:700,fontSize:13,color:C.accent,marginBottom:14,letterSpacing:.5,display:"flex",alignItems:"center",gap:6 }}><Info size={14} color={C.accent}/> INFORMATIONS PRATIQUES</div>
        {renderContact(Crown, "Président", asso.president)}
        {renderContact(User, "Personne à contacter", asso.contact_nom)}
        {renderContact(Phone, "Téléphone", asso.tel)}
        {renderContact(Calendar, "Jour et heure d'entraînement", asso.jours)}
        {renderContact(MapPin, "Lieu d'entraînement", asso.lieu)}
        {renderContact(Link2, "Contact / Réseaux", asso.contact)}
        {!asso.president && !asso.contact_nom && !asso.jours && !asso.lieu && !asso.tel && !asso.contact && (
          <p style={{ color:C.muted,fontSize:13 }}>Aucune information pratique renseignée.</p>
        )}
        {asso.lat && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${asso.lat},${asso.lng}`} target="_blank" rel="noreferrer"
            style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:6,marginTop:14,background:`${C.accent}22`,border:`1px solid ${C.accent}44`,borderRadius:10,
              padding:"10px 0",textAlign:"center",color:C.accent,textDecoration:"none",fontWeight:700,fontSize:13 }}>
            <Navigation size={15}/> Itinéraire Google Maps
          </a>
        )}
      </div>

      {/* Bars affiliés */}
      {asso.bars?.length > 0 && (
        <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:20,marginBottom:16 }}>
          <div style={{ fontWeight:700,fontSize:13,color:C.accent,marginBottom:14,letterSpacing:.5,display:"flex",alignItems:"center",gap:6 }}><Building2 size={14} color={C.accent}/> BARS AFFILIÉS</div>
          {asso.bars.map(nom => {
            const b = bars.find(x => x.nom === nom);
            return (
              <div key={nom} onClick={b ? ()=>{setBarSlug(b.slug);setPage("bar");} : undefined}
                style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",
                  borderBottom:`1px solid ${C.border}`,cursor:b?"pointer":"default" }}>
                <span style={{ fontWeight:600,display:"flex",alignItems:"center",gap:5 }}><Building2 size={13} color={C.accent}/> {nom}</span>
                {b && <span style={{ color:C.muted,fontSize:12,display:"flex",alignItems:"center",gap:4 }}><MapPin size={11}/> {b.ville} <ChevronRight size={12}/></span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Carte */}
      {asso.lat && (
        <div style={{ borderRadius:16,overflow:"hidden",marginBottom:16,border:`1px solid ${C.border}` }}>
          <div style={{ padding:"14px 20px",background:C.card,borderBottom:`1px solid ${C.border}` }}>
            <div style={{ fontWeight:700,fontSize:13,color:C.accent,letterSpacing:.5,display:"flex",alignItems:"center",gap:6 }}><Map size={14} color={C.accent}/> LOCALISATION</div>
          </div>
          <LeafletMap associations={[asso]} centerSlug={asso.slug} height={260}/>
        </div>
      )}
    </div>
  );

  // ── TAB MEMBRES — JSX inline ──
  const tabMembresJSX = (
    <div>
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden",marginBottom:16 }}>
        <div style={{ padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div style={{ fontWeight:700,fontSize:15,display:"flex",alignItems:"center",gap:6 }}><Trophy size={15} color={C.accent}/> Classement interne</div>
          <span style={{ fontSize:12,color:C.muted }}>{membres.length} membre{membres.length>1?"s":""}</span>
        </div>
        {loadMembres ? (
          <div style={{ padding:40,textAlign:"center" }}><Spinner/></div>
        ) : membres.length === 0 ? (
          <div style={{ padding:"32px 20px",textAlign:"center" }}>
            <div style={{ marginBottom:12,display:"flex",justifyContent:"center" }}><Users size={40} color={C.muted}/></div>
            <p style={{ color:C.muted,fontSize:14,marginBottom:8 }}>Aucun membre lié à ce club pour l'instant.</p>
            <p style={{ color:C.muted,fontSize:12 }}>Les membres peuvent rejoindre ce club depuis leur profil.</p>
          </div>
        ) : (() => {
          const membresClasses    = membres.filter(m => assoClassesIds.size === 0 || assoClassesIds.has(m.id));
          const membresNonClasses = membres.filter(m => assoClassesIds.size > 0 && !assoClassesIds.has(m.id));
          return (
            <>
              {membresClasses.map((m, i) => {
                const isTop = i === 0;
                return (
                  <div key={m.id} onClick={()=>setPage("profil-joueur-"+m.id)}
                    style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 20px",
                      borderBottom:`1px solid ${C.border}`, background: isTop ? `${C.accent}08` : "transparent", cursor:"pointer" }}>
                    <div style={{ width:28,textAlign:"center",flexShrink:0 }}>
                      {i < 3 ? (
                        <span style={{ fontSize:18 }}>{["🥇","🥈","🥉"][i]}</span>
                      ) : (
                        <span style={{ fontWeight:700,color:C.muted,fontSize:14 }}>#{i+1}</span>
                      )}
                    </div>
                    <div style={{ width:40,height:40,borderRadius:"50%",flexShrink:0,
                      background:`linear-gradient(135deg,${C.accent}44,#7c3aed44)`,
                      border:`2px solid ${isTop?C.accent:C.border}`,
                      overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {m.photo ? <img src={m.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <Target size={18} color={C.accent}/>}
                    </div>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontWeight:700,fontSize:14 }}>{m.pseudo}</div>
                      {m.ville && <div style={{ fontSize:11,color:C.muted,display:"flex",alignItems:"center",gap:3 }}><MapPin size={10}/> {m.ville}</div>}
                    </div>
                    <div style={{ textAlign:"right",flexShrink:0 }}>
                      <div style={{ fontWeight:800,fontSize:16,color: isTop?C.accent:"#e2e8f0" }}>{m.drix ?? 1000}</div>
                      <div style={{ fontSize:10,color:C.muted,fontWeight:600 }}>DRIX</div>
                    </div>
                  </div>
                );
              })}
              {membresNonClasses.length > 0 && (
                <div style={{ padding:"0 16px 16px" }}>
                  <button onClick={() => setShowAssoNonClasses(v=>!v)}
                    style={{ width:"100%", background:"#ffffff08", border:`1px solid ${C.border}`, borderRadius:10, padding:"10px 14px", color:C.muted, fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:12, touchAction:"manipulation" }}>
                    <span style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <Users size={13} color={C.muted}/>
                      Joueurs non classés
                      <span style={{ background:"#ffffff14",borderRadius:20,padding:"1px 7px",fontSize:11 }}>{membresNonClasses.length}</span>
                    </span>
                    <ChevronDown size={14} style={{ transform:showAssoNonClasses?"rotate(180deg)":"none", transition:"transform 0.2s" }}/>
                  </button>
                  {showAssoNonClasses && membresNonClasses.map(m => (
                    <div key={m.id} onClick={()=>setPage("profil-joueur-"+m.id)}
                      style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:`1px solid ${C.border}`, cursor:"pointer", opacity:0.65 }}>
                      <div style={{ width:34,height:34,borderRadius:"50%",flexShrink:0,background:`${C.accent}22`,border:`1.5px solid ${C.border}`,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center" }}>
                        {m.photo ? <img src={m.photo} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <Target size={14} color={C.muted}/>}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontWeight:600,fontSize:13 }}>{m.pseudo}</div>
                        <div style={{ fontSize:11,color:C.muted }}>Aucun match joué</div>
                      </div>
                      <div style={{ textAlign:"right",flexShrink:0 }}>
                        <div style={{ fontWeight:700,fontSize:14,color:C.muted }}>{m.drix??1000}</div>
                        <div style={{ fontSize:10,color:C.muted }}>DRIX</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );

  // ── TAB ÉVÉNEMENTS — JSX inline via IIFE ──
  const tabEventsJSX = (() => {
    const now = Date.now();
    const upcoming = events.filter(e => new Date(e.date).getTime() >= now).sort((a,b)=>new Date(a.date)-new Date(b.date));
    const past = events.filter(e => new Date(e.date).getTime() < now).sort((a,b)=>new Date(b.date)-new Date(a.date));
    return (
      <div>
        {events.length === 0 ? (
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"40px 20px",textAlign:"center" }}>
            <div style={{ marginBottom:12,display:"flex",justifyContent:"center" }}><Calendar size={40} color={C.muted}/></div>
            <p style={{ color:C.muted,fontSize:14,marginBottom:6 }}>Aucun événement référencé pour ce club.</p>
            <p style={{ color:C.muted,fontSize:12 }}>Les tournois et événements organisés par ce club apparaîtront ici.</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontSize:12,fontWeight:700,color:C.accent,letterSpacing:.5,marginBottom:12 }}>À VENIR</div>
                <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                  {upcoming.map(ev => {
                    const d = new Date(ev.date);
                    return (
                      <div key={ev.id} style={{ background:C.card,border:`1px solid ${C.accent}44`,borderRadius:14,padding:16,
                        boxShadow:`0 0 20px ${C.accent}11` }}>
                        <div style={{ display:"flex",gap:16,alignItems:"flex-start" }}>
                          <div style={{ background:`${C.accent}22`,border:`1px solid ${C.accent}44`,borderRadius:10,padding:"8px 12px",textAlign:"center",minWidth:48,flexShrink:0 }}>
                            <div style={{ fontWeight:800,fontSize:18,color:C.accent,lineHeight:1 }}>{d.getDate()}</div>
                            <div style={{ fontSize:10,color:C.muted,fontWeight:600 }}>{d.toLocaleString("fr",{month:"short"}).toUpperCase()}</div>
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700,fontSize:14,marginBottom:4 }}>{ev.nom}</div>
                            <div style={{ color:C.muted,fontSize:12,display:"flex",alignItems:"center",gap:4 }}><MapPin size={11}/> {ev.ville}{ev.bar ? <><span>·</span><Building2 size={11}/> {ev.bar}</> : ""}</div>
                            {ev.description&&<div style={{ color:C.muted,fontSize:12,marginTop:4 }}>{ev.description.slice(0,80)}…</div>}
                          </div>
                          <Badge color={typeInfo(ev.type).color}>{typeInfo(ev.type).l}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <div style={{ fontSize:12,fontWeight:700,color:C.muted,letterSpacing:.5,marginBottom:12 }}>PASSÉS</div>
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  {past.map(ev => (
                    <div key={ev.id} style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:14,opacity:.7 }}>
                      <div style={{ fontWeight:600,fontSize:13 }}>{ev.nom}</div>
                      <div style={{ color:C.muted,fontSize:12 }}>{new Date(ev.date).toLocaleDateString("fr")} · {ev.ville}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {/* Encart admin */}
        {(isAdmin || joueur) && (
          <div style={{ marginTop:20,background:"#7c3aed11",border:"1px solid #7c3aed33",borderRadius:14,padding:16,textAlign:"center" }}>
            <p style={{ color:C.muted,fontSize:13,marginBottom:10 }}>Un tournoi organisé par ce club n'est pas répertorié ?</p>
            <button onClick={()=>setPage("proposer-tournoi")} style={{ background:"#7c3aed",color:"#fff",border:"none",borderRadius:10,padding:"9px 20px",fontSize:13,fontWeight:700,cursor:"pointer" }}>
              🏅 Proposer un tournoi
            </button>
          </div>
        )}
      </div>
    );
  })();

  return (
    <div style={{ maxWidth:860, margin:"0 auto", padding:"20px 16px 88px" }}>
      {/* Modal édition */}
      {editingAsso && (
        <EditAssoModal
          asso={asso}
          allBars={bars}
          joueur={joueur}
          onSave={u => { setAssociations(a => a.map(x => x.slug === u.slug ? {...x,...u} : x)); setEditingAsso(false); }}
          onClose={() => setEditingAsso(false)}
        />
      )}

      {/* Retour */}
      <button onClick={() => window.history.back()}
        style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",marginBottom:20,fontSize:13,display:"flex",alignItems:"center",gap:6 }}>
        <ArrowLeft size={15}/> Retour
      </button>

      {/* HEADER PREMIUM */}
      {headerJSX}

      {/* ONGLETS */}
      <div style={{ display:"flex",gap:0,marginBottom:20,background:C.card,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden" }}>
        {TABS.map(t => {
          const TabIcon = t.Icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex:1,padding:"11px 4px",background:tab===t.id?C.accent:"transparent",
                color:tab===t.id?"#fff":C.muted,border:"none",cursor:"pointer",fontWeight:tab===t.id?700:400,
                fontSize:12,transition:"all .15s",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                display:"flex",alignItems:"center",justifyContent:"center",gap:5 }}>
              <TabIcon size={14}/> {t.l}
            </button>
          );
        })}
      </div>

      {/* CONTENU ONGLETS */}
      {tab === "club"    && tabClubJSX}
      {tab === "membres" && tabMembresJSX}
      {tab === "events"  && tabEventsJSX}
      {tab === "photos"  && <GalerieSection slug={asso.slug} type="asso" isAdmin={isAdmin}/>}
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
        <button onClick={()=>window.history.back()} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13 }}>← Retour</button>
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
  if(sent) return <div style={{ maxWidth:600,margin:"80px auto",padding:"0 20px",textAlign:"center" }}><div style={{ fontSize:50,marginBottom:12 }}>✅</div><h2 style={{ fontWeight:700,marginBottom:8 }}>Bar ajouté !</h2><p style={{ color:C.muted }}>Il est maintenant visible dans la liste des bars.</p></div>;
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

// ── STATS PREVIEW (partagé onboarding + à propos) ────────────────────────────
const StatsPreviewBlock = ({ gradientIdSuffix="" }) => {
  const drixPts = [118,132,125,148,162,155,178,196,185,218,240,228,262];
  const svgW=280, svgH=76;
  const dMin=Math.min(...drixPts), dMax=Math.max(...drixPts);
  const toX=i=>(i/(drixPts.length-1))*svgW;
  const toY=v=>svgH-((v-dMin)/(dMax-dMin))*(svgH-16)-8;
  const lineD=drixPts.map((v,i)=>`${i===0?"M":"L"}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const areaD=`${lineD} L${svgW},${svgH} L0,${svgH} Z`;
  const lastX=toX(drixPts.length-1), lastY=toY(drixPts[drixPts.length-1]);

  const danger=78, gR=42, gCx=52, gCy=52;
  const gCirc=2*Math.PI*gR, gDash=gCirc*(danger/100), gColor="#ef4444";
  const areaId=`sp-area${gradientIdSuffix}`, glowId=`sp-glow${gradientIdSuffix}`;

  return (
    <div style={{ marginBottom:16, borderRadius:18, background:"linear-gradient(145deg,#0d0d1e,#080812)", border:"1px solid #a78bfa30", padding:"18px 16px", boxShadow:"0 0 40px #a78bfa0a" }}>
      <div style={{ fontWeight:800, fontSize:15, color:"#f1f5f9", marginBottom:3 }}>📊 Retrouve tes stats</div>
      <div style={{ color:"#4b5563", fontSize:12.5, marginBottom:16 }}>Ta progression DRIX, visible en temps réel</div>

      {/* Courbe DRIX */}
      <div style={{ background:"#07071a", borderRadius:14, padding:"12px 10px 6px", marginBottom:16, overflow:"hidden" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, paddingLeft:2, paddingRight:2 }}>
          <span style={{ fontSize:11, color:"#4b5563", fontWeight:600 }}>DRIX</span>
          <span style={{ fontSize:11.5, fontWeight:800, color:"#a78bfa" }}>+144 pts cette saison</span>
        </div>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="none" style={{ display:"block", overflow:"visible" }}>
          <defs>
            <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.28"/>
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0"/>
            </linearGradient>
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path d={areaD} fill={`url(#${areaId})`}/>
          <path d={lineD} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${glowId})`}/>
          <circle cx={lastX} cy={lastY} r="5" fill="#a78bfa" stroke="#07071a" strokeWidth="2.5"/>
          <circle cx={lastX} cy={lastY} r="9" fill="none" stroke="#a78bfa" strokeOpacity="0.3" strokeWidth="1.5">
            <animate attributeName="r" values="6;12;6" dur="2s" repeatCount="indefinite"/>
            <animate attributeName="stroke-opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite"/>
          </circle>
          <text x={lastX} y={lastY-13} textAnchor="middle" fill="#a78bfa" fontSize="11" fontWeight="800">262</text>
        </svg>
        <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 2px 0", marginTop:2 }}>
          {["Jan","Mar","Mai","Juil","Sep","Nov","Jan"].map((m,i)=>(
            <span key={i} style={{ fontSize:9.5, color:"#2a2a3a" }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Jauge dangerosité */}
      <div style={{ display:"flex", alignItems:"center", gap:14, background:"#07071a", borderRadius:14, padding:"14px" }}>
        <div style={{ flexShrink:0 }}>
          <svg width={gCx*2} height={gCy*2} viewBox={`0 0 ${gCx*2} ${gCy*2}`}>
            <circle cx={gCx} cy={gCy} r={gR} fill="none" stroke="#1a0a0a" strokeWidth="9"/>
            <circle cx={gCx} cy={gCy} r={gR} fill="none" stroke={gColor} strokeWidth="9" strokeLinecap="round"
              strokeDasharray={`${gDash.toFixed(1)} ${gCirc.toFixed(1)}`}
              transform={`rotate(-90 ${gCx} ${gCy})`}
              style={{ filter:`drop-shadow(0 0 8px ${gColor}99)` }}/>
            <text x={gCx} y={gCy-5} textAnchor="middle" dominantBaseline="middle" fill="#f1f5f9" fontSize="22" fontWeight="900" fontFamily="Inter,sans-serif">{danger}</text>
            <text x={gCx} y={gCy+14} textAnchor="middle" fill="#64748b" fontSize="9" fontWeight="600" fontFamily="Inter,sans-serif">/100</text>
          </svg>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:900, fontSize:16, color:gColor, marginBottom:4, letterSpacing:.3 }}>⚡ Dangerosité</div>
          <div style={{ fontSize:12.5, color:"#94a3b8", lineHeight:1.65 }}>
            Un score calculé sur tes victoires, ton niveau DRIX et ta régularité. Plus tu joues, plus tu deviens <span style={{ color:gColor, fontWeight:700 }}>redoutable</span>.
          </div>
          <div style={{ marginTop:8, display:"flex", gap:6, flexWrap:"wrap" }}>
            {[["🟢","0–30"],["🟡","30–60"],["🟠","60–80"],["🔴","80+"]].map(([e,l],i)=>(
              <div key={i} style={{ fontSize:10, color:i===2?"#f97316":i===3?"#ef4444":"#4b5563", fontWeight:i>=2?700:400 }}>{e} {l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── À PROPOS & CONTACT ────────────────────────────────────────────────────────
const APropos = ({ bars, setPage }) => (
  <div style={{ maxWidth:680,margin:"0 auto",padding:"36px 20px 60px" }}>
    <h1 style={{ fontWeight:800,fontSize:26,marginBottom:8 }}>ℹ️ À propos de DartPoint</h1>
    <p style={{ color:C.muted,fontSize:14,marginBottom:28 }}>Tout ce qu'il faut savoir pour bien démarrer.</p>

    {/* ── Guide DartPoint (sections onboarding) ── */}
    {ONBOARDING_SECTIONS.slice(0,3).map((s,i)=>(
      <div key={i} style={{
        marginBottom:14, borderRadius:16,
        background: s.highlight
          ? `linear-gradient(135deg,${s.accent}14,#12120a)`
          : `linear-gradient(135deg,#111118,#0d0d14)`,
        border:`1px solid ${s.accent}${s.highlight?"44":"25"}`,
        padding:"18px 16px",
        boxShadow: s.highlight ? `0 0 28px ${s.accent}10` : "none",
      }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
          <div style={{ width:44,height:44,borderRadius:13,background:`${s.accent}18`,border:`1px solid ${s.accent}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:21,flexShrink:0 }}>
            {s.emoji}
          </div>
          <h2 style={{ fontWeight:800,fontSize:16,color:"#f1f5f9",margin:0,lineHeight:1.3 }}>{s.title}</h2>
        </div>
        <p style={{ color:"#94a3b8",fontSize:13.5,lineHeight:1.75,margin:0,marginBottom:s.sub?10:0 }}>{s.body}</p>
        {s.sub&&(
          <div style={{ marginTop:10,background:`${s.accent}12`,border:`1px solid ${s.accent}30`,borderRadius:10,padding:"8px 13px",fontSize:12.5,fontWeight:700,color:s.accent }}>
            {s.sub}
          </div>
        )}
      </div>
    ))}

    {/* ── Bloc visuel stats ── */}
    <StatsPreviewBlock gradientIdSuffix="-ap"/>

    {ONBOARDING_SECTIONS.slice(3).map((s,i)=>(
      <div key={i+3} style={{
        marginBottom:14, borderRadius:16,
        background: s.highlight
          ? `linear-gradient(135deg,${s.accent}14,#12120a)`
          : `linear-gradient(135deg,#111118,#0d0d14)`,
        border:`1px solid ${s.accent}${s.highlight?"44":"25"}`,
        padding:"18px 16px",
        boxShadow: s.highlight ? `0 0 28px ${s.accent}10` : "none",
      }}>
        <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:10 }}>
          <div style={{ width:44,height:44,borderRadius:13,background:`${s.accent}18`,border:`1px solid ${s.accent}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:21,flexShrink:0 }}>
            {s.emoji}
          </div>
          <h2 style={{ fontWeight:800,fontSize:16,color:"#f1f5f9",margin:0,lineHeight:1.3 }}>{s.title}</h2>
        </div>
        <p style={{ color:"#94a3b8",fontSize:13.5,lineHeight:1.75,margin:0,marginBottom:s.sub?10:0 }}>{s.body}</p>
        {s.sub&&(
          <div style={{ marginTop:10,background:`${s.accent}12`,border:`1px solid ${s.accent}30`,borderRadius:10,padding:"8px 13px",fontSize:12.5,fontWeight:700,color:s.accent }}>
            {s.sub}
          </div>
        )}
      </div>
    ))}

    {/* ── Bloc infos + CTA ── */}
    <div style={{ background:"linear-gradient(135deg,#1a0800,#111)",border:`1px solid ${C.accent}44`,borderRadius:14,padding:22,textAlign:"center",marginTop:8 }}>
      <p style={{ fontWeight:700,fontSize:15,marginBottom:16,color:C.text }}>{bars.length} bars référencés · {bars.filter(b=>b.verifie).length} vérifiés</p>
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
  const [f,setF]=useState({nom:"",email:"",sujet:"",message:""});
  const [sent,setSent]=useState(false);
  const [sending,setSending]=useState(false);
  const [err,setErr]=useState("");
  const set=k=>v=>setF(p=>({...p,[k]:v}));

  const send = async () => {
    if(!f.email||!f.message){setErr("Remplis au moins l'email et le message.");return;}
    setSending(true); setErr("");
    try {
      await db.addProposition({
        nom: f.nom||"Anonyme",
        ville: f.email,
        slug: `contact-${Date.now()}`,
        statut: "non_lu",
        date: Date.now(),
        commentaire: f.sujet ? `[${f.sujet}]\n${f.message}` : f.message,
        type_prop: "contact",
      });
      setSent(true);
    } catch(e) {
      console.error("Contact send error:", e);
      setErr("Erreur : " + (e?.message || "envoi impossible") + ". Réessaie plus tard.");
    } finally { setSending(false); }
  };

  if(sent) return (
    <div style={{ maxWidth:580,margin:"80px auto",padding:"0 20px",textAlign:"center" }}>
      <div style={{ fontSize:60,marginBottom:16 }}>✉️</div>
      <h2 style={{ fontWeight:800,fontSize:22,marginBottom:10 }}>Message envoyé !</h2>
      <p style={{ color:"#94a3b8",fontSize:15 }}>On te répondra dès que possible à <strong>{f.email}</strong>.</p>
    </div>
  );

  return (
    <div style={{ maxWidth:580,margin:"0 auto",padding:"36px 20px" }}>
      <h1 style={{ fontWeight:800,fontSize:26,marginBottom:24 }}>✉️ Contact</h1>
      <div style={{ display:"flex",flexDirection:"column",gap:13 }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:13 }}>
          <Field label="Nom" value={f.nom} onChange={set("nom")} placeholder="Jean Dupont"/>
          <Field label="Email *" value={f.email} onChange={set("email")} placeholder="vous@email.com" type="email"/>
        </div>
        <Field label="Sujet" value={f.sujet} onChange={set("sujet")} placeholder="Partenariat, correction…"/>
        <Field label="Message *" value={f.message} onChange={set("message")} placeholder="Votre message…" as="textarea"/>
        {err && <p style={{ color:"#ef4444",fontSize:13,margin:0 }}>{err}</p>}
        <Btn onClick={send} style={{ padding:"13px 22px",fontSize:15 }} disabled={sending}>
          {sending ? "Envoi…" : "Envoyer →"}
        </Btn>
      </div>
    </div>
  );
};

// ── ADMIN ─────────────────────────────────────────────────────────────────────
const AdminLogin = ({ onLogin }) => {
  const [pw,setPw]=useState(""); const [err,setErr]=useState(false);
  const [checking,setChecking]=useState(false);
  const tryLogin = async () => {
    if (!pw || checking) return;
    setChecking(true); setErr(false);
    const ok = await verifyAdminPassword(pw);
    if (ok) onLogin(); else setErr(true);
    setChecking(false);
  };
  return (
    <div style={{ maxWidth:380,margin:"80px auto",padding:"0 20px" }}>
      <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:28,textAlign:"center" }}>
        <div style={{ fontSize:38,marginBottom:12 }}>🔐</div>
        <h2 style={{ fontWeight:700,fontSize:19,marginBottom:18 }}>Administration</h2>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Mot de passe" disabled={checking}
          onKeyDown={e=>e.key==="Enter"&&tryLogin()}
          style={{ width:"100%",background:"#111",border:`1px solid ${err?C.red:C.border}`,borderRadius:8,padding:"11px 14px",color:C.text,fontSize:14,marginBottom:10,opacity:checking?.6:1 }}/>
        {err&&<p style={{ color:C.red,fontSize:12,marginBottom:10 }}>Mot de passe incorrect</p>}
        <Btn onClick={tryLogin} disabled={checking||!pw} style={{ width:"100%",padding:"11px" }}>{checking?"Vérification…":"Accéder →"}</Btn>
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

  const [fiche, setFiche] = useState({}); // { [id]: { stats, duels, presences, mouvements } }
  const [ficheLoading, setFicheLoading] = useState({});

  // Chargement initial — tous les joueurs
  useEffect(()=>{
    sb(`joueurs?order=drix.desc&select=id,pseudo,nom,prenom,email,ville,drix,date_inscription,photo,bar_slug,asso_slug&limit=500`)
      .then(r=>{ setTous(r||[]); setLoading(false); })
      .catch(()=>setLoading(false));
  },[]);

  // Charger la fiche détaillée d'un joueur à l'ouverture
  const chargerFiche = async (j) => {
    if (fiche[j.id] || ficheLoading[j.id]) return;
    setFicheLoading(f=>({...f,[j.id]:true}));
    const [stats, duels, presences, mouvements] = await Promise.all([
      sb(`stats_joueurs?joueur_id=eq.${j.id}&select=victoires,defaites,parties,moyenne`).catch(()=>[]),
      sb(`duels?or=(challenger_id.eq.${j.id},defie_id.eq.${j.id})&statut=eq.termine&select=id,date&order=date.desc&limit=1`).catch(()=>[]),
      sb(`presences?joueur_id=eq.${j.id}&select=date_jour&limit=1000`).catch(()=>[]),
      sb(`drix_mouvements?joueur_id=eq.${j.id}&select=variation,date&order=date.desc&limit=5`).catch(()=>[]),
    ]);
    setFiche(f=>({...f,[j.id]:{ stats:stats?.[0]||null, lastDuel:duels?.[0]||null, nbPresences:(presences||[]).length, mouvements:mouvements||[] }}));
    setFicheLoading(f=>({...f,[j.id]:false}));
  };

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
      sb(`messages?or=(from_id.eq.${id},to_id.eq.${id})`,{method:"DELETE",prefer:"return=minimal"}),
    ]);
  };

  const supprimerCompte = async (j) => {
    if (!window.confirm(`⚠️ Supprimer définitivement ${j.pseudo} ?\n\nCela supprimera aussi :\n• Ses liens d'amitié\n• Son historique DRIX\n• Ses présences\n\nCette action est irréversible.\n\n⚠️ Préférable : utiliser "Anonymiser (RGPD)" pour conserver l'intégrité des stats des autres joueurs.`)) return;
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

  // ── ANONYMISATION RGPD ──────────────────────────────────────────────────────
  // Conforme article 17 RGPD. Garde l'historique des matchs intact pour ne pas
  // fausser les stats des autres joueurs.
  const anonymiserCompte = async (j) => {
    if (!window.confirm(`🕵️ Anonymiser le compte de ${j.pseudo} (RGPD) ?\n\n• Le pseudo devient "Joueur supprimé #${j.id}"\n• Email, nom, prénom, photo, ville → effacés\n• Amis, messages, présences → supprimés\n• Historique des matchs et DRIX → CONSERVÉS (intégrité des stats des autres joueurs)\n\nLe joueur ne pourra plus se connecter.`)) return;
    setSaving(s=>({...s,[j.id]:true}));
    try {
      // 1. Anonymise le profil
      await sb(`joueurs?id=eq.${j.id}`, { method:"PATCH", body:JSON.stringify({
        pseudo: `Joueur supprimé #${j.id}`,
        email: null,
        nom: null,
        prenom: null,
        photo: null,
        ville: null,
        password_hash: null,
        bar_slug: null,
        anonymise: true,
        anonymise_date: Date.now(),
      }), prefer:"return=minimal" });
      // 2. Supprime les données perso liées (amis, messages, présences)
      await Promise.allSettled([
        sb(`amis?joueur_id=eq.${j.id}`,{method:"DELETE",prefer:"return=minimal"}),
        sb(`amis?ami_id=eq.${j.id}`,{method:"DELETE",prefer:"return=minimal"}),
        sb(`presences?joueur_id=eq.${j.id}`,{method:"DELETE",prefer:"return=minimal"}),
        sb(`presence_joueurs?joueur_id=eq.${j.id}`,{method:"DELETE",prefer:"return=minimal"}),
        sb(`messages?or=(from_id.eq.${j.id},to_id.eq.${j.id})`,{method:"DELETE",prefer:"return=minimal"}),
      ]);
      // 3. Retire de l'UI
      setTous(x=>x.filter(p=>p.id!==j.id));
      addLog?.("Compte anonymisé (RGPD)", j.pseudo, "warning");
      setMsg(m=>({...m,[j.id]:"✅ Compte anonymisé. Stats des autres joueurs préservées."}));
    } catch(e) {
      alert(`❌ Erreur lors de l'anonymisation de ${j.pseudo} :\n${e.message}`);
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
              onClick={()=>{ setExpanded(x=>({...x,[j.id]:!x[j.id]})); if(!expanded[j.id]) chargerFiche(j); }}>
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

                {/* ── FICHE CLIENT ── */}
                <div style={{background:"#0a0f1a",border:`1px solid ${C.blue}22`,borderRadius:12,padding:16}}>
                  <div style={{fontSize:12,color:C.blue,fontWeight:700,letterSpacing:.5,marginBottom:12}}>👤 FICHE CLIENT</div>
                  {ficheLoading[j.id] ? (
                    <div style={{color:C.muted,fontSize:13}}>Chargement...</div>
                  ) : (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                      {/* Identité */}
                      <div style={{gridColumn:"1/-1",display:"flex",alignItems:"center",gap:14,marginBottom:4}}>
                        {j.photo
                          ? <img src={j.photo} style={{width:56,height:56,borderRadius:"50%",objectFit:"cover",border:`2px solid ${C.blue}`}} alt=""/>
                          : <div style={{width:56,height:56,borderRadius:"50%",background:`${C.blue}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>{(j.pseudo||"?")[0].toUpperCase()}</div>}
                        <div>
                          <div style={{fontWeight:900,fontSize:17,color:C.text}}>{j.prenom||"—"} {j.nom||""}</div>
                          <div style={{fontSize:13,color:C.accent,fontWeight:700}}>@{j.pseudo}</div>
                        </div>
                      </div>
                      {/* Email */}
                      <div style={{background:"#ffffff08",borderRadius:8,padding:"8px 12px"}}>
                        <div style={{fontSize:10,color:C.muted,marginBottom:2}}>✉️ EMAIL</div>
                        <div style={{fontSize:13,color:C.text,wordBreak:"break-all"}}>{j.email||"—"}</div>
                      </div>
                      {/* Ville */}
                      <div style={{background:"#ffffff08",borderRadius:8,padding:"8px 12px"}}>
                        <div style={{fontSize:10,color:C.muted,marginBottom:2}}>📍 VILLE</div>
                        <div style={{fontSize:13,color:C.text}}>{j.ville||"—"}</div>
                      </div>
                      {/* Inscription */}
                      <div style={{background:"#ffffff08",borderRadius:8,padding:"8px 12px"}}>
                        <div style={{fontSize:10,color:C.muted,marginBottom:2}}>📅 INSCRIPTION</div>
                        <div style={{fontSize:13,color:C.text}}>{j.date_inscription?new Date(j.date_inscription).toLocaleDateString("fr-FR","long"):"—"}</div>
                      </div>
                      {/* Bar */}
                      <div style={{background:"#ffffff08",borderRadius:8,padding:"8px 12px"}}>
                        <div style={{fontSize:10,color:C.muted,marginBottom:2}}>🍺 BAR</div>
                        <div style={{fontSize:13,color:C.text}}>{j.bar_slug||"—"}</div>
                      </div>
                      {/* Connexions */}
                      <div style={{background:"#ffffff08",borderRadius:8,padding:"8px 12px"}}>
                        <div style={{fontSize:10,color:C.muted,marginBottom:2}}>🔌 CONNEXIONS (jours)</div>
                        <div style={{fontSize:20,fontWeight:900,color:C.blue}}>{fiche[j.id]?.nbPresences??"—"}</div>
                      </div>
                      {/* Dernière activité */}
                      <div style={{background:"#ffffff08",borderRadius:8,padding:"8px 12px"}}>
                        <div style={{fontSize:10,color:C.muted,marginBottom:2}}>⏱ DERNIÈRE PARTIE</div>
                        <div style={{fontSize:13,color:C.text}}>{fiche[j.id]?.lastDuel ? new Date(fiche[j.id].lastDuel.date).toLocaleDateString("fr-FR") : "—"}</div>
                      </div>
                      {/* Stats */}
                      {fiche[j.id]?.stats && (
                        <div style={{gridColumn:"1/-1",background:"#ffffff08",borderRadius:8,padding:"8px 12px",display:"flex",gap:20}}>
                          <div><div style={{fontSize:10,color:C.muted}}>🏆 VICTOIRES</div><div style={{fontSize:18,fontWeight:900,color:C.green}}>{fiche[j.id].stats.victoires??0}</div></div>
                          <div><div style={{fontSize:10,color:C.muted}}>💀 DÉFAITES</div><div style={{fontSize:18,fontWeight:900,color:C.red}}>{fiche[j.id].stats.defaites??0}</div></div>
                          <div><div style={{fontSize:10,color:C.muted}}>🎯 PARTIES</div><div style={{fontSize:18,fontWeight:900,color:C.text}}>{fiche[j.id].stats.parties??0}</div></div>
                          <div><div style={{fontSize:10,color:C.muted}}>📊 WR</div><div style={{fontSize:18,fontWeight:900,color:C.yellow}}>{fiche[j.id].stats.parties>0?Math.round((fiche[j.id].stats.victoires/fiche[j.id].stats.parties)*100):0}%</div></div>
                        </div>
                      )}
                      {/* Derniers mouvements DRIX */}
                      {fiche[j.id]?.mouvements?.length>0 && (
                        <div style={{gridColumn:"1/-1",background:"#ffffff08",borderRadius:8,padding:"8px 12px"}}>
                          <div style={{fontSize:10,color:C.muted,marginBottom:6}}>💎 DERNIERS MOUVEMENTS DRIX</div>
                          {fiche[j.id].mouvements.map((m,i)=>(
                            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:m.variation>0?C.green:C.red,padding:"2px 0"}}>
                              <span>{new Date(m.date).toLocaleDateString("fr-FR")}</span>
                              <span style={{fontWeight:700}}>{m.variation>0?"+":""}{m.variation} DRIX</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
                    <button onClick={()=>anonymiserCompte(j)} disabled={saving[j.id]}
                      style={{background:"#1a1a00",color:"#a3a3a3",border:`1px solid #a3a3a355`,borderRadius:8,padding:"9px 16px",cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}
                      title="Anonymise le compte selon RGPD Art. 17 — préserve l'intégrité des stats des autres joueurs">
                      🕵️ Anonymiser (RGPD)
                    </button>
                    <button onClick={()=>supprimerCompte(j)} disabled={saving[j.id]}
                      style={{background:"#1a0000",color:C.red,border:`1px solid ${C.red}55`,borderRadius:8,padding:"9px 16px",cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                      🗑 Supprimer le compte
                    </button>
                    <button onClick={()=>banirJoueur(j)} disabled={saving[j.id]}
                      style={{background:"#1a0014",color:"#f43f5e",border:`1px solid #f43f5e55`,borderRadius:8,padding:"9px 16px",cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                      🚫 Bannir (DRIX 0 + suppression)
                    </button>
                  </div>
                  <div style={{marginTop:10,fontSize:11,color:C.muted}}>⚠️ Ces actions sont irréversibles et seront enregistrées dans les logs.<br/>💡 <strong>Anonymisation</strong> = recommandé pour suppression à la demande du joueur (RGPD). <strong>Suppression</strong> = efface définitivement, casse les stats. <strong>Ban</strong> = pour comportement abusif.</div>
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// AdminDuels — Vue admin des duels avec annulation et correction de score
// ══════════════════════════════════════════════════════════════════════════════
const AdminDuels = ({ addLog }) => {
  const [duels, setDuels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("conteste");
  const [recherche, setRecherche] = useState("");
  const [working, setWorking] = useState({});
  const [editScore, setEditScore] = useState(null); // { id, sc, sd }

  const fetchDuels = useCallback(async () => {
    setLoading(true);
    const q = filtre === "tous"
      ? "duels?order=date.desc&limit=200&select=*"
      : `duels?statut=eq.${filtre}&order=date.desc&limit=200&select=*`;
    const r = await sb(q).catch(()=>[]);
    setDuels(r||[]);
    setLoading(false);
  }, [filtre]);

  useEffect(()=>{ fetchDuels(); }, [fetchDuels]);

  // Annuler un duel terminé → rollback DRIX via drix_mouvements
  const annulerDuel = async (d) => {
    const note = window.prompt(`⚠️ Annuler ce duel et rollback DRIX ?\n\n${d.challenger_pseudo} vs ${d.defie_pseudo}\nStatut : ${d.statut}\n\nMotif de l'annulation (sera enregistré) :`);
    if (!note) return;
    setWorking(w=>({...w,[d.id]:true}));
    try {
      // Récupère les mouvements DRIX liés (par joueur + date proche du duel)
      const dueltime = new Date(d.date).getTime();
      const tmin = dueltime - 60*1000;
      const tmax = dueltime + 30*60*1000;
      const ids = [d.challenger_id, d.defie_id].filter(Boolean);
      if (ids.length === 0) { alert("IDs joueurs manquants"); return; }
      const mvts = await sb(`drix_mouvements?joueur_id=in.(${ids.join(",")})&date=gte.${tmin}&date=lte.${tmax}&select=*`).catch(()=>[]);

      // Rollback : pour chaque mouvement trouvé, inverse la variation
      for (const m of (mvts||[])) {
        const j = await sb(`joueurs?id=eq.${m.joueur_id}&select=drix,pseudo,anonymise`).catch(()=>[]).then(r=>r?.[0]);
        if (!j || j.anonymise) continue;
        const newDrix = Math.max(0, (j.drix||1000) - (m.variation||0));
        await sb(`joueurs?id=eq.${m.joueur_id}`, { method:"PATCH", body:JSON.stringify({ drix:newDrix }), prefer:"return=minimal" });
        await sb("drix_mouvements", { method:"POST", body:JSON.stringify({
          joueur_id: m.joueur_id, joueur_pseudo: m.joueur_pseudo,
          adversaire_pseudo: "Admin (rollback)",
          variation: -(m.variation||0), drix_avant: j.drix||1000, drix_apres: newDrix,
          resultat: "annule_admin", date: Date.now()
        })}).catch(()=>{});
      }

      // PATCH duel
      await sb(`duels?id=eq.${d.id}`, { method:"PATCH", body:JSON.stringify({
        statut:"annule_admin", admin_action:"annule_admin", admin_note: note
      }), prefer:"return=minimal" });

      addLog?.(`Duel annulé (rollback DRIX)`, `${d.challenger_pseudo} vs ${d.defie_pseudo}`, "danger");
      await fetchDuels();
    } catch(e) {
      alert("Erreur annulation : " + e.message);
    }
    setWorking(w=>({...w,[d.id]:false}));
  };

  // Corriger le score → modifie nbManches sans recalcul DRIX automatique
  const corrigerScore = async (d) => {
    if (!editScore || editScore.id !== d.id) return;
    const note = window.prompt("Motif de la correction (sera enregistré) :");
    if (!note) return;
    setWorking(w=>({...w,[d.id]:true}));
    try {
      const scC = parseInt(editScore.sc); const scD = parseInt(editScore.sd);
      if (isNaN(scC)||isNaN(scD)) { alert("Scores invalides"); return; }
      const gagnant_id = scC>scD ? d.challenger_id : d.defie_id;
      await sb(`duels?id=eq.${d.id}`, { method:"PATCH", body:JSON.stringify({
        manches_challenger: scC, manches_defie: scD, gagnant_id,
        admin_action:"score_corrige", admin_note: note
      }), prefer:"return=minimal" });
      addLog?.(`Score corrigé`, `${d.challenger_pseudo} vs ${d.defie_pseudo} → ${scC}-${scD}`, "warning");
      setEditScore(null);
      await fetchDuels();
    } catch(e) {
      alert("Erreur correction : " + e.message);
    }
    setWorking(w=>({...w,[d.id]:false}));
  };

  const filtres = [
    ["conteste", "⚠️ Contestés", C.red],
    ["en_cours", "🎯 En cours", C.accent],
    ["termine",  "✅ Terminés",  C.green],
    ["annule",   "❌ Annulés",   C.muted],
    ["annule_admin", "🛡 Annulés admin", "#a855f7"],
    ["tous",     "📋 Tous",      C.blue],
  ];

  const duelsFiltres = recherche
    ? duels.filter(d => (d.challenger_pseudo||"").toLowerCase().includes(recherche.toLowerCase()) || (d.defie_pseudo||"").toLowerCase().includes(recherche.toLowerCase()))
    : duels;

  const stColor = (s) => s==="conteste"?C.red : s==="en_cours"?C.accent : s==="termine"?C.green : s==="annule_admin"?"#a855f7" : C.muted;

  return (
    <div>
      {/* Filtres */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {filtres.map(([k,l,col])=>(
          <button key={k} onClick={()=>setFiltre(k)} style={{
            background: filtre===k ? `${col}33` : "#1a1a1a",
            border: `1px solid ${filtre===k?col:C.border}`,
            color: filtre===k ? col : C.muted,
            borderRadius: 10, padding: "8px 14px", cursor:"pointer",
            fontWeight: filtre===k?700:500, fontSize:12,
          }}>{l}</button>
        ))}
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center"}}>
        <input value={recherche} onChange={e=>setRecherche(e.target.value)} placeholder="🔍 Filtrer par pseudo…"
          style={{flex:1,background:"#111",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 14px",color:C.text,fontSize:14}}/>
        <div style={{color:C.muted,fontSize:12,whiteSpace:"nowrap"}}>{duelsFiltres.length} duel{duelsFiltres.length!==1?"s":""}</div>
      </div>

      {loading && <Spinner/>}

      {!loading && duelsFiltres.length===0 && (
        <div style={{textAlign:"center",padding:50,color:C.muted}}>Aucun duel pour ce filtre.</div>
      )}

      {duelsFiltres.map(d => {
        const scC = d.manches_challenger ?? 0;
        const scD = d.manches_defie ?? 0;
        const date = d.date ? new Date(d.date).toLocaleString("fr-FR",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}) : "—";
        const editing = editScore?.id === d.id;
        return (
          <div key={d.id} style={{background:C.card,border:`1px solid ${stColor(d.statut)}33`,borderRadius:12,padding:14,marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:8}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700}}>
                  <span style={{color:d.gagnant_id===d.challenger_id?C.green:C.text}}>{d.challenger_pseudo||"?"}</span>
                  <span style={{color:C.muted,margin:"0 8px"}}>vs</span>
                  <span style={{color:d.gagnant_id===d.defie_id?C.green:C.text}}>{d.defie_pseudo||"?"}</span>
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                  {d.mode||"?"} · Premier à {d.manches||"?"} · {date}
                  {d.bar_slug && <span style={{marginLeft:6}}>· 🍺 {d.bar_slug}</span>}
                </div>
              </div>
              <div style={{textAlign:"right"}}>
                {editing ? (
                  <div style={{display:"flex",gap:4,alignItems:"center"}}>
                    <input type="number" min="0" value={editScore.sc} onChange={e=>setEditScore({...editScore,sc:e.target.value})}
                      style={{width:40,background:"#111",border:`1px solid ${C.accent}`,borderRadius:6,padding:"4px 6px",color:C.text,fontSize:14,textAlign:"center"}}/>
                    <span style={{color:C.muted}}>-</span>
                    <input type="number" min="0" value={editScore.sd} onChange={e=>setEditScore({...editScore,sd:e.target.value})}
                      style={{width:40,background:"#111",border:`1px solid ${C.accent}`,borderRadius:6,padding:"4px 6px",color:C.text,fontSize:14,textAlign:"center"}}/>
                  </div>
                ) : (
                  <div style={{fontSize:18,fontWeight:900,color:stColor(d.statut)}}>{scC}–{scD}</div>
                )}
                <div style={{fontSize:10,color:stColor(d.statut),textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginTop:2}}>{d.statut}</div>
              </div>
            </div>

            {/* Trace admin */}
            {d.admin_action && (
              <div style={{background:"#1a0014",border:`1px solid #a855f733`,borderRadius:8,padding:"6px 10px",fontSize:11,color:"#a855f7",marginBottom:8}}>
                🛡 <strong>{d.admin_action}</strong>
                {d.admin_note && <div style={{color:C.muted,marginTop:2,fontStyle:"italic"}}>"{d.admin_note}"</div>}
              </div>
            )}

            {/* Actions */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {!editing && d.statut !== "annule_admin" && (
                <button onClick={()=>setEditScore({id:d.id,sc:String(scC),sd:String(scD)})} disabled={working[d.id]}
                  style={{background:"#1a1200",color:C.yellow,border:`1px solid ${C.yellow}44`,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>
                  ✏️ Corriger score
                </button>
              )}
              {editing && (
                <>
                  <button onClick={()=>corrigerScore(d)} disabled={working[d.id]}
                    style={{background:C.green,color:"#fff",border:"none",borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:700}}>
                    💾 Enregistrer
                  </button>
                  <button onClick={()=>setEditScore(null)}
                    style={{background:"#1a1a1a",color:C.muted,border:`1px solid ${C.border}`,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12}}>
                    Annuler
                  </button>
                </>
              )}
              {!editing && d.statut !== "annule_admin" && (
                <button onClick={()=>annulerDuel(d)} disabled={working[d.id]}
                  style={{background:"#1a0000",color:C.red,border:`1px solid ${C.red}55`,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>
                  🛡 Annuler & rollback DRIX
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// AdminTournois — Gestion complète des tournois publics depuis l'admin
// ══════════════════════════════════════════════════════════════════════════════
const AdminTournois = ({ tournois, setTournois, setEditTournoi, setTournoiSlug, setPage, addLog }) => {
  const [working, setWorking] = useState({});
  const [openId, setOpenId] = useState(null);
  const [inscrits, setInscrits] = useState({});
  const [showResultats, setShowResultats] = useState(null);
  const [filtreStatut, setFiltreStatut] = useState("tous");

  const loadInscrits = async (slug) => {
    const r = await db.getInscrits(slug).catch(()=>[]);
    setInscrits(x=>({...x,[slug]:r||[]}));
  };

  const toggleOpen = (t) => {
    if (openId === t.id) { setOpenId(null); return; }
    setOpenId(t.id);
    if (!inscrits[t.slug]) loadInscrits(t.slug);
  };

  const retirerJoueur = async (t, joueur_id, pseudo) => {
    if (!window.confirm(`Retirer ${pseudo} du tournoi ?`)) return;
    await db.deleteInscription(t.slug, joueur_id).catch(()=>{});
    await loadInscrits(t.slug);
    addLog?.("Joueur retiré du tournoi", `${pseudo} - ${t.nom}`, "warning");
  };

  const cloturerTournoi = async (t) => {
    if (!window.confirm(`Clôturer "${t.nom}" ?\n\nLes inscriptions seront bloquées.`)) return;
    setWorking(w=>({...w,[t.id]:true}));
    await db.updateTournoi(t.slug, { statut:"termine" }).catch(()=>{});
    setTournois(arr=>arr.map(x=>x.slug===t.slug?{...x,statut:"termine"}:x));
    addLog?.("Tournoi clôturé", t.nom, "info");
    setWorking(w=>({...w,[t.id]:false}));
  };

  const annulerTournoi = async (t) => {
    const motif = window.prompt(`Annuler "${t.nom}" ?\n\nMotif (sera affiché aux inscrits) :`);
    if (!motif) return;
    setWorking(w=>({...w,[t.id]:true}));
    await db.updateTournoi(t.slug, { statut:"annule", description: `${t.description||""}\n\n⚠️ ANNULÉ : ${motif}` }).catch(()=>{});
    setTournois(arr=>arr.map(x=>x.slug===t.slug?{...x,statut:"annule"}:x));
    addLog?.("Tournoi annulé", `${t.nom} — ${motif}`, "danger");
    setWorking(w=>({...w,[t.id]:false}));
  };

  const supprimerTournoi = async (t) => {
    if (!window.confirm(`🗑 Supprimer définitivement "${t.nom}" ?\n\nToutes les inscriptions seront supprimées. Irréversible.`)) return;
    setWorking(w=>({...w,[t.id]:true}));
    try {
      // Supprime les inscriptions liées
      await sb(`tournoi_inscriptions?tournoi_slug=eq.${encodeURIComponent(t.slug)}`, { method:"DELETE", prefer:"return=minimal" }).catch(()=>{});
      await db.deleteTournoi(t.slug);
      setTournois(arr=>arr.filter(x=>x.slug!==t.slug));
      addLog?.("Tournoi supprimé", t.nom, "danger");
    } catch(e) {
      alert("Erreur : " + e.message);
    }
    setWorking(w=>({...w,[t.id]:false}));
  };

  const publierResultats = async (t, podium) => {
    setWorking(w=>({...w,[t.id]:true}));
    try {
      const champ = inscrits[t.slug]?.find(i=>i.joueur_id===podium.first);
      const second = inscrits[t.slug]?.find(i=>i.joueur_id===podium.second);
      const third = inscrits[t.slug]?.find(i=>i.joueur_id===podium.third);
      const podiumTxt = `🥇 ${champ?.pseudo||"?"} · 🥈 ${second?.pseudo||"?"} · 🥉 ${third?.pseudo||"?"}`;
      await db.updateTournoi(t.slug, {
        statut: "termine",
        resultats: podiumTxt,
        gagnant_id: podium.first,
        gagnant_pseudo: champ?.pseudo || null,
      }).catch(()=>{});
      // Publication sur le Comptoir (table propositions)
      await db.addProposition({
        nom: t.nom, ville: t.ville, slug: t.slug,
        type_prop: "resultats_tournoi",
        statut: "info",
        date: Date.now(),
        commentaire: `🏆 Résultats publiés : ${podiumTxt}`,
      }).catch(()=>{});
      setTournois(arr=>arr.map(x=>x.slug===t.slug?{...x,statut:"termine",resultats:podiumTxt}:x));
      addLog?.("Résultats tournoi publiés", `${t.nom} — ${podiumTxt}`, "success");
      setShowResultats(null);
    } catch(e) {
      alert("Erreur publication : " + e.message);
    }
    setWorking(w=>({...w,[t.id]:false}));
  };

  const stColor = (s) => s==="termine"?C.green : s==="annule"?C.red : s==="publie"?C.accent : C.muted;
  const stLabel = (s) => s==="termine"?"✅ Terminé" : s==="annule"?"❌ Annulé" : s==="publie"?"📅 À venir" : (s||"—");

  const filtresTournois = [
    ["tous","📋 Tous"],
    ["publie","📅 À venir"],
    ["termine","✅ Terminés"],
    ["annule","❌ Annulés"],
  ];

  const tournoisFiltres = filtreStatut === "tous"
    ? tournois
    : tournois.filter(t => (t.statut||"publie") === filtreStatut);

  return (
    <div>
      {/* Filtres */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
        {filtresTournois.map(([k,l])=>(
          <button key={k} onClick={()=>setFiltreStatut(k)} style={{
            background: filtreStatut===k ? `${C.accent}33` : "#1a1a1a",
            border: `1px solid ${filtreStatut===k?C.accent:C.border}`,
            color: filtreStatut===k ? C.accent : C.muted,
            borderRadius: 10, padding: "8px 14px", cursor:"pointer",
            fontWeight: filtreStatut===k?700:500, fontSize:12,
          }}>{l}</button>
        ))}
        <div style={{marginLeft:"auto",color:C.muted,fontSize:12,alignSelf:"center"}}>{tournoisFiltres.length} tournoi{tournoisFiltres.length!==1?"s":""}</div>
      </div>

      {tournoisFiltres.length === 0 && (
        <div style={{textAlign:"center",padding:50,color:C.muted}}>Aucun tournoi pour ce filtre.</div>
      )}

      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {tournoisFiltres.map(t => {
          const isOpen = openId === t.id;
          const lst = inscrits[t.slug] || [];
          return (
            <div key={t.id} style={{background:C.card,border:`1px solid ${isOpen?C.accent:C.border}`,borderRadius:12,overflow:"hidden"}}>
              <div style={{padding:"14px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>toggleOpen(t)}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{t.nom}</div>
                  <div style={{color:C.muted,fontSize:12}}>📍 {t.ville} · 📅 {t.date||"—"} {t.bar && <span>· 🍺 {t.bar}</span>}</div>
                  {t.resultats && <div style={{color:C.yellow,fontSize:12,marginTop:4,fontWeight:600}}>{t.resultats}</div>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:11,color:stColor(t.statut),fontWeight:700,padding:"3px 8px",background:`${stColor(t.statut)}22`,borderRadius:6}}>{stLabel(t.statut)}</span>
                  <span style={{color:C.muted,fontSize:14,transform:isOpen?"rotate(180deg)":"",transition:"transform .2s"}}>▼</span>
                </div>
              </div>

              {isOpen && (
                <div style={{borderTop:`1px solid ${C.border}`,padding:"14px 16px"}}>
                  {/* Inscrits */}
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:700,letterSpacing:.5,marginBottom:8}}>👥 INSCRITS ({lst.length})</div>
                    {lst.length === 0 ? (
                      <div style={{color:C.muted,fontSize:12,fontStyle:"italic"}}>Aucun inscrit.</div>
                    ) : (
                      <div style={{maxHeight:200,overflowY:"auto",background:"#0a0a0a",borderRadius:8,padding:"4px 8px"}}>
                        {lst.map(i=>(
                          <div key={i.id||i.joueur_id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 4px",borderBottom:`1px solid ${C.border}`,fontSize:13}}>
                            <div>
                              <span style={{fontWeight:600}}>{i.pseudo||"?"}</span>
                              {i.date && <span style={{color:C.muted,fontSize:11,marginLeft:8}}>{new Date(i.date).toLocaleDateString("fr-FR")}</span>}
                            </div>
                            <button onClick={()=>retirerJoueur(t, i.joueur_id, i.pseudo)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:11,padding:"2px 6px"}}>✕ Retirer</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                    <button onClick={()=>setEditTournoi(t)} style={{background:"#1a1200",color:C.yellow,border:`1px solid ${C.yellow}44`,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12}}>✏️ Éditer</button>
                    {t.statut !== "termine" && t.statut !== "annule" && (
                      <button onClick={()=>cloturerTournoi(t)} disabled={working[t.id]} style={{background:`${C.green}22`,color:C.green,border:`1px solid ${C.green}55`,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>✅ Clôturer</button>
                    )}
                    {t.statut !== "annule" && (
                      <button onClick={()=>setShowResultats({...t})} style={{background:`${C.yellow}22`,color:C.yellow,border:`1px solid ${C.yellow}55`,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>🏆 Publier résultats</button>
                    )}
                    {t.statut !== "annule" && t.statut !== "termine" && (
                      <button onClick={()=>annulerTournoi(t)} disabled={working[t.id]} style={{background:"#1a0014",color:"#f43f5e",border:`1px solid #f43f5e55`,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>⚠️ Annuler</button>
                    )}
                    <button onClick={()=>supprimerTournoi(t)} disabled={working[t.id]} style={{background:"#1a0000",color:C.red,border:`1px solid ${C.red}55`,borderRadius:6,padding:"6px 12px",cursor:"pointer",fontSize:12,fontWeight:600}}>🗑 Supprimer</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal publication résultats */}
      {showResultats && (
        <ModalResultats
          tournoi={showResultats}
          inscrits={inscrits[showResultats.slug]||[]}
          onClose={()=>setShowResultats(null)}
          onPublish={(podium)=>publierResultats(showResultats, podium)}
          working={!!working[showResultats.id]}
        />
      )}
    </div>
  );
};

// Modal pour saisir et publier le podium
const ModalResultats = ({ tournoi, inscrits, onClose, onPublish, working }) => {
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [third, setThird] = useState("");

  const peutPublier = first && (first !== second) && (first !== third) && (!second || second !== third);

  return (
    <div style={{position:"fixed",inset:0,background:"#000c",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:14}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:14,padding:22,maxWidth:480,width:"100%",maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:0,fontSize:18,fontWeight:800,marginBottom:6}}>🏆 Publier les résultats</h3>
        <div style={{color:C.muted,fontSize:13,marginBottom:18}}>{tournoi.nom} · {tournoi.ville}</div>

        {inscrits.length === 0 ? (
          <div style={{color:C.muted,fontSize:13,textAlign:"center",padding:30}}>Aucun inscrit dans ce tournoi.</div>
        ) : (
          <>
            {[["🥇","1ʳᵉ place",first,setFirst],["🥈","2ᵉ place",second,setSecond],["🥉","3ᵉ place",third,setThird]].map(([emoji,label,val,setter])=>(
              <div key={label} style={{marginBottom:14}}>
                <label style={{fontSize:12,color:C.muted,display:"block",marginBottom:6}}>{emoji} {label}</label>
                <select value={val} onChange={e=>setter(e.target.value)} style={{width:"100%",background:"#111",border:`1px solid ${C.border}`,borderRadius:8,padding:"10px 12px",color:C.text,fontSize:14}}>
                  <option value="">— Sélectionner —</option>
                  {inscrits.map(i=><option key={i.id||i.joueur_id} value={i.joueur_id}>{i.pseudo}</option>)}
                </select>
              </div>
            ))}
            <div style={{fontSize:11,color:C.muted,marginBottom:14,padding:"8px 10px",background:"#0a0a0a",borderRadius:8}}>
              💡 Les résultats seront publiés sur le Comptoir et le tournoi sera marqué comme terminé.
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={onClose} style={{flex:1,background:"#1a1a1a",color:C.muted,border:`1px solid ${C.border}`,borderRadius:10,padding:"11px",cursor:"pointer",fontSize:14}}>Annuler</button>
              <button onClick={()=>onPublish({first,second,third})} disabled={!peutPublier||working}
                style={{flex:2,background:peutPublier?`linear-gradient(135deg,${C.accent},#ea580c)`:"#1a1a1a",color:peutPublier?"#fff":C.muted,border:"none",borderRadius:10,padding:"11px",cursor:peutPublier?"pointer":"default",fontSize:14,fontWeight:800}}>
                {working ? "Publication…" : "🏆 Publier"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Admin = ({ joueur, bars, setBars, associations, setAssociations, tournois, setTournois, setPage, setBarSlug, setAssoSlug, setTournoiSlug }) => {
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
  const [stats, setStats]           = useState({ matchsDuJour:0, joueursActifs:0, nouveauxJoueurs:0, totalJoueurs:0, connexionsJour:0 });
  const [kpiDetail, setKpiDetail]   = useState(null); // "nouveaux" | "connexions" | null
  const [connexionsDetail, setConnexionsDetail] = useState([]);

  // Charge les logs persistés au montage
  useEffect(()=>{
    sb(`admin_logs?order=date.desc&limit=200&select=*`)
      .then(r=>setAdminLogs((r||[]).map(l=>({
        ...l,
        date: new Date(Number(l.date)).toLocaleString("fr-FR")
      }))))
      .catch(()=>{});
  },[]);

  const addLog = (action, cible, type="info") => {
    const localEntry = { id:Date.now(), action, cible, type, date:new Date().toLocaleString("fr-FR"), admin_pseudo: joueur?.pseudo||"admin" };
    setAdminLogs(l => [localEntry, ...l.slice(0,199)]);
    // Persistance fire-and-forget
    sb("admin_logs", { method:"POST", body:JSON.stringify({
      action, cible, type, admin_pseudo: joueur?.pseudo||"admin", date: Date.now()
    }), prefer:"return=minimal" }).catch(()=>{});
  };

  const viderLogs = async () => {
    if (!window.confirm("⚠️ Supprimer définitivement tous les logs admin ?")) return;
    await sb(`admin_logs?id=gte.0`, { method:"DELETE", prefer:"return=minimal" }).catch(()=>{});
    setAdminLogs([]);
  };

  // Charge le détail connexions quand on ouvre le modal
  useEffect(()=>{
    if (kpiDetail !== "connexions") return;
    const today = new Date().toISOString().split("T")[0];
    sb(`presences?date_jour=eq.${today}&select=joueur_id`).catch(()=>[]).then(async pres=>{
      if (!pres || pres.length===0) { setConnexionsDetail([]); return; }
      const ids = [...new Set(pres.map(p=>p.joueur_id))];
      const joueurs = await sb(`joueurs?id=in.(${ids.join(",")})&select=id,pseudo,photo,ville`).catch(()=>[]);
      setConnexionsDetail((joueurs||[]).map(j=>({...j, joueur_id:j.id})));
    });
  },[kpiDetail]);

  const fetchAdminStats = () => {
    const weekAgo = Date.now() - 7*24*60*60*1000;
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      db.getPropositions(),
      db.getSignalements(),
      fetch(`${SB_URL}/rest/v1/avis?valide=eq.false&select=id`,{headers:{"apikey":SB_KEY,"Authorization":`Bearer ${SB_KEY}`}}).then(r=>r.json()).catch(()=>[]),
      sb(`joueurs?order=date_inscription.desc&limit=500&select=id,pseudo,drix,date_inscription,photo`).catch(()=>[]),
      sb(`duels?statut=eq.en_cours&select=id`).catch(()=>[]),
      sb(`presences?date_jour=eq.${today}&select=joueur_id`).catch(()=>[]),
    ]).then(([p,s,av,j,duels,pres])=>{
      setPropositions(p||[]);
      setSignalements(s||[]);
      setAvisCount((av||[]).length);
      const jList = j||[];
      setJoueursList(jList);
      const uniqueConns = new Set((pres||[]).map(x=>x.joueur_id)).size;
      setStats({
        matchsDuJour: (duels||[]).length,
        joueursActifs: uniqueConns,
        nouveauxJoueurs: jList.filter(x=>x.date_inscription&&new Date(x.date_inscription).getTime()>weekAgo).length,
        totalJoueurs: jList.length,
        connexionsJour: uniqueConns,
      });
      setLoading(false);
    }).catch(()=>setLoading(false));
  };

  useEffect(()=>{
    fetchAdminStats();
    const interval = setInterval(()=>{
      const today = new Date().toISOString().split("T")[0];
      sb(`presences?date_jour=eq.${today}&select=joueur_id`).catch(()=>[]).then(pres=>{
        const uniqueConns = new Set((pres||[]).map(x=>x.joueur_id)).size;
        setStats(s=>({...s, connexionsJour: uniqueConns}));
      });
    }, 30000);
    return () => clearInterval(interval);
  },[]);

  const validerBar=async p=>{const slug=slugify(p.nom+"-"+p.ville);let lat=null,lng=null;try{const q=encodeURIComponent(`${p.adresse||p.nom}, ${p.ville}, France`);const geo=await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`);const geoData=await geo.json();if(geoData?.[0]){lat=parseFloat(geoData[0].lat);lng=parseFloat(geoData[0].lon);}if(!lat){const q2=encodeURIComponent(`${p.ville}, France`);const geo2=await fetch(`https://nominatim.openstreetmap.org/search?q=${q2}&format=json&limit=1`);const geoData2=await geo2.json();if(geoData2?.[0]){lat=parseFloat(geoData2[0].lat);lng=parseFloat(geoData2[0].lon);}}}catch(e){}const nb={slug,nom:p.nom,ville:p.ville,cp:p.cp||"",adresse:p.adresse||"",tel:p.tel||"",type:p.type||"electronique",cibles:parseInt(p.cibles)||1,horaires:"",description:"",tournois:p.tournois==="oui",association:null,source:"user",verifie:true,vues:0,lat,lng};const r=await db.addBar(nb);if(r?.[0])setBars(b=>[...b,r[0]]);await db.updateProposition(p.id,{statut:"publie"});setPropositions(x=>x.map(y=>y.id===p.id?{...y,statut:"publie"}:y));addLog("Bar validé",p.nom,"success");};
  const validerAsso=async p=>{const slug=slugify(p.nom+"-"+p.ville);const nb={slug,nom:p.nom,ville:p.ville,zone:p.zone||"",type:p.type||"electronique",jours:p.jours||"À confirmer",lieu:p.lieu||"",tel:p.tel||"",contact:p.contact||"",description:p.description||"",bars:[],source:"user",verifie:true,lat:null,lng:null};const r=await db.addAssociation(nb);if(r?.[0])setAssociations(a=>[...a,r[0]]);await db.updateProposition(p.id,{statut:"publie"});setPropositions(x=>x.map(y=>y.id===p.id?{...y,statut:"publie"}:y));addLog("Association validée",p.nom,"success");};
  const validerTournoi=async p=>{const slug=slugify(p.nom+"-"+p.ville+"-"+(p.date||""));const nb={slug,nom:p.nom,ville:p.ville,date:p.date||"",bar:p.bar||"",association:p.association||"",type:p.type||"electronique",format:p.format||"individuel",niveau:p.niveau||"tous",prix:p.prix||"",dotations:p.dotations||"",places:p.places||"",description:p.description||"",contact:p.contact||"",lien:p.lien||"",source:"user",statut:"publie",lat:null,lng:null};const r=await db.addTournoi(nb);if(r?.[0])setTournois(t=>[...t,r[0]]);await db.updateProposition(p.id,{statut:"publie"});setPropositions(x=>x.map(y=>y.id===p.id?{...y,statut:"publie"}:y));addLog("Tournoi validé",p.nom,"success");};
  const refuser=async(id,nom)=>{await db.updateProposition(id,{statut:"refuse"});setPropositions(x=>x.map(y=>y.id===id?{...y,statut:"refuse"}:y));addLog("Proposition refusée",nom||id,"warning");};

  const allPending = propositions.filter(p=>p.statut==="en_attente" && p.type_prop !== "president_club");
  const barsAjoutes = propositions.filter(p=>p.statut==="auto_accepte" && !p.type_prop);
  const demandesClubs = propositions.filter(p=>p.type_prop==="president_club");
  const demandesClubsPending = demandesClubs.filter(p=>p.statut==="en_attente");
  const sigPending = signalements.filter(s=>!s.traite);
  const contacts = propositions.filter(p=>p.type_prop==="contact");
  const contactsNonLus = contacts.filter(p=>p.statut==="non_lu");
  const modifications = propositions.filter(p=>p.type_prop==="modif_bar"||p.type_prop==="modif_asso").sort((a,b)=>(b.date||0)-(a.date||0));
  const totalUrgent = allPending.length + sigPending.length + avisCount + demandesClubsPending.length;

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

  const renderTournois = () => <AdminTournois tournois={tournois} setTournois={setTournois} setEditTournoi={setEditTournoi} setTournoiSlug={setTournoiSlug} setPage={setPage} addLog={addLog}/>;

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

  const renderDashboard = () => {
    const weekAgo = Date.now() - 7*24*60*60*1000;
    const nouveauxJoueurs = joueursList.filter(x=>x.date_inscription&&new Date(x.date_inscription).getTime()>weekAgo).sort((a,b)=>new Date(b.date_inscription)-new Date(a.date_inscription));

    return (
    <div style={{display:"flex",flexDirection:"column",gap:24}}>
      {/* KPI Cards */}
      <div>
        <div style={{fontSize:13,color:C.muted,fontWeight:700,letterSpacing:1,marginBottom:12}}>📊 INDICATEURS CLÉS</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          <AdminKpiCard icon="⏳" label="En attente" count={allPending.length} prio={allPending.length>0?"urgent":"normal"} onClick={()=>setTab("pending")}/>
          <AdminKpiCard icon="💬" label="Avis à modérer" count={avisCount} prio={avisCount>0?"important":"normal"} onClick={()=>setTab("avismod")}/>
          <AdminKpiCard icon="⚠️" label="Signalements" count={sigPending.length} prio={sigPending.length>0?"urgent":"normal"} onClick={()=>setTab("signalements")}/>
          <AdminKpiCard icon="👥" label="Total joueurs" count={stats.totalJoueurs} prio="normal" onClick={()=>setTab("joueurs")}/>
          <AdminKpiCard icon="🆕" label="Nouveaux (7j)" count={stats.nouveauxJoueurs} prio={stats.nouveauxJoueurs>0?"important":"normal"} onClick={()=>setKpiDetail("nouveaux")}/>
          <AdminKpiCard icon="📡" label="Connexions aujourd'hui" count={stats.connexionsJour} prio={stats.connexionsJour>0?"important":"normal"} onClick={()=>setKpiDetail("connexions")}/>
          <AdminKpiCard icon="🎯" label="Bars référencés" count={bars.length} prio="normal"/>
          <AdminKpiCard icon="🫂" label="Associations" count={associations.length} prio="normal"/>
          <AdminKpiCard icon="🏅" label="Tournois" count={tournois.length} prio="normal"/>
        </div>
      </div>

      {/* Modal détail KPI */}
      {kpiDetail && (
        <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setKpiDetail(null)}>
          <div style={{background:"#111",border:`1px solid ${C.border}`,borderRadius:18,padding:24,maxWidth:520,width:"100%",maxHeight:"80vh",overflowY:"auto",position:"relative"}} onClick={e=>e.stopPropagation()}>
            <button onClick={()=>setKpiDetail(null)} style={{position:"absolute",top:14,right:14,background:"#222",border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:13}}>✕</button>

            {kpiDetail==="nouveaux" && (<>
              <div style={{fontSize:15,fontWeight:800,marginBottom:16,display:"flex",alignItems:"center",gap:8}}>
                🆕 <span>Nouveaux joueurs (7 derniers jours)</span>
                <span style={{background:"#f59e0b22",color:"#f59e0b",borderRadius:8,padding:"2px 10px",fontSize:12,fontWeight:700,marginLeft:4}}>{nouveauxJoueurs.length}</span>
              </div>
              {nouveauxJoueurs.length===0 ? (
                <div style={{textAlign:"center",padding:40,color:C.muted}}>Aucun nouveau joueur cette semaine</div>
              ) : nouveauxJoueurs.map(j=>(
                <div key={j.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                  {j.photo
                    ? <img src={j.photo} style={{width:38,height:38,borderRadius:"50%",objectFit:"cover",border:`1px solid ${C.border}`}}/>
                    : <div style={{width:38,height:38,borderRadius:"50%",background:C.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,border:`1px solid ${C.border}`}}>👤</div>
                  }
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14}}>{j.pseudo}</div>
                    <div style={{fontSize:11,color:C.muted}}>{j.email||"—"} · {j.ville||"Ville non renseignée"}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:12,color:"#f59e0b",fontWeight:700}}>💎 {j.drix} DRIX</div>
                    <div style={{fontSize:10,color:C.muted}}>{j.date_inscription ? new Date(j.date_inscription).toLocaleDateString("fr-FR") : "—"}</div>
                  </div>
                </div>
              ))}
            </>)}

            {kpiDetail==="connexions" && (<>
              <div style={{fontSize:15,fontWeight:800,marginBottom:4,display:"flex",alignItems:"center",gap:8}}>
                📡 <span>Connexions aujourd'hui</span>
                <span style={{background:"#f59e0b22",color:"#f59e0b",borderRadius:8,padding:"2px 10px",fontSize:12,fontWeight:700,marginLeft:4}}>{stats.connexionsJour}</span>
              </div>
              <div style={{fontSize:11,color:C.muted,marginBottom:16}}>Joueurs uniques connectés ce jour · Se raffraîchit toutes les 30 sec</div>
              {connexionsDetail.length===0 ? (
                <div style={{textAlign:"center",padding:40,color:C.muted}}>Chargement…</div>
              ) : connexionsDetail.map(j=>(
                <div key={j.joueur_id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
                  {j.photo
                    ? <img src={j.photo} style={{width:36,height:36,borderRadius:"50%",objectFit:"cover",border:`1px solid ${C.border}`}}/>
                    : <div style={{width:36,height:36,borderRadius:"50%",background:C.card,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,border:`1px solid ${C.border}`}}>👤</div>
                  }
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:14}}>{j.pseudo||j.joueur_id}</div>
                    <div style={{fontSize:11,color:C.muted}}>{j.ville||""}</div>
                  </div>
                  <div style={{fontSize:11,color:"#10b981",fontWeight:600}}>🟢 Aujourd'hui</div>
                </div>
              ))}
            </>)}
          </div>
        </div>
      )}

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
  );};

  const renderLogs = () => (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:13,color:C.muted}}>Historique des actions de la session en cours</div>
        {adminLogs.length>0&&<button onClick={viderLogs} style={{background:"#1a0000",color:C.red,border:`1px solid ${C.red}44`,borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:12}}>🗑 Vider</button>}
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

  // ── DEMANDES CLUBS (présidents) ──
  const renderBarsAjoutes = () => (
    <div>
      {barsAjoutes.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:C.muted }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🍺</div>
          <p>Aucun bar ajouté par des utilisateurs pour l'instant.</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:12, color:C.muted, marginBottom:4 }}>
            {barsAjoutes.length} bar{barsAjoutes.length>1?"s":""} ajouté{barsAjoutes.length>1?"s":""} directement par des utilisateurs — vérification possible via l'onglet 🎯 Bars.
          </div>
          {barsAjoutes.map(p => (
            <div key={p.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>🍺 {p.nom} <span style={{ color:C.muted, fontWeight:400, fontSize:13 }}>— {p.ville}</span></div>
                  {p.commentaire && <div style={{ fontSize:12, color:C.muted, lineHeight:1.6 }}>{p.commentaire}</div>}
                  <div style={{ fontSize:11, color:"#374151", marginTop:6 }}>{new Date(p.date).toLocaleDateString("fr", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}</div>
                </div>
                <span style={{ background:"#22c55e18", color:"#22c55e", border:"1px solid #22c55e33", borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, flexShrink:0 }}>✅ Ajouté</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDemandes = () => (
    <div>
      {demandesClubs.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:C.muted }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👑</div>
          <div>Aucune demande de club reçue.</div>
        </div>
      ) : (
        <>
          {/* En attente */}
          {demandesClubsPending.length > 0 && (
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>
                ⏳ En attente — {demandesClubsPending.length} demande{demandesClubsPending.length>1?"s":""}
              </div>
              {demandesClubsPending.map(p => {
                const lines = (p.commentaire||"").split("\n");
                const club = lines[0]?.replace("Club: ","") || p.ville || "";
                const role = lines[1]?.replace("Rôle: ","") || "";
                const tel  = lines[2]?.replace("Tél: ","") || "";
                const msg  = lines.slice(4).join("\n").trim();
                return (
                  <div key={p.id} style={{ background:"linear-gradient(135deg,#7c3aed0a,#f9731608)", border:"1px solid #7c3aed44", borderRadius:16, padding:20, marginBottom:12 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:14, marginBottom:14 }}>
                      <div style={{ width:46, height:46, borderRadius:12, background:"#7c3aed22", border:"1px solid #7c3aed44", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>👑</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:800, fontSize:16, marginBottom:3 }}>{p.nom}</div>
                        <div style={{ color:"#a78bfa", fontWeight:600, fontSize:13, marginBottom:2 }}>{role}</div>
                        <div style={{ color:C.muted, fontSize:12 }}>🏛️ {club}</div>
                      </div>
                      <div style={{ background:"#ef444420", border:"1px solid #ef444440", borderRadius:8, padding:"3px 10px", fontSize:11, color:C.red, fontWeight:700, flexShrink:0 }}>🔴 Nouveau</div>
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
                      {tel && (
                        <div style={{ background:"#ffffff08", borderRadius:10, padding:"10px 12px" }}>
                          <div style={{ fontSize:10, color:C.muted, marginBottom:3, fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>📞 Téléphone</div>
                          <div style={{ fontWeight:600, fontSize:13 }}>{tel}</div>
                        </div>
                      )}
                      <div style={{ background:"#ffffff08", borderRadius:10, padding:"10px 12px" }}>
                        <div style={{ fontSize:10, color:C.muted, marginBottom:3, fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>📅 Date</div>
                        <div style={{ fontWeight:600, fontSize:13 }}>{p.date ? new Date(p.date).toLocaleDateString("fr-FR") : "—"}</div>
                      </div>
                    </div>
                    {msg && (
                      <div style={{ background:"#111", borderRadius:10, padding:"10px 14px", marginBottom:14, borderLeft:"3px solid #7c3aed" }}>
                        <div style={{ fontSize:10, color:C.muted, marginBottom:4, fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>💬 Message</div>
                        <p style={{ color:"#cbd5e1", fontSize:13, lineHeight:1.7, margin:0 }}>{msg}</p>
                      </div>
                    )}
                    <div style={{ display:"flex", gap:8 }}>
                      <button onClick={async()=>{ await db.updateProposition(p.id,{statut:"publie"}); setPropositions(x=>x.map(y=>y.id===p.id?{...y,statut:"publie"}:y)); addLog("Demande club acceptée",p.nom,"success"); }}
                        style={{ flex:1, background:"#14532d", color:C.green, border:`1px solid ${C.green}44`, borderRadius:10, padding:"11px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                        ✅ Accepter
                      </button>
                      <button onClick={()=>refuser(p.id,p.nom)}
                        style={{ flex:1, background:"#1a0000", color:C.red, border:`1px solid ${C.red}44`, borderRadius:10, padding:"11px", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                        ❌ Refuser
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Traitées */}
          {demandesClubs.filter(p=>p.statut!=="en_attente").length > 0 && (
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:1, marginBottom:12 }}>✅ Traitées</div>
              {demandesClubs.filter(p=>p.statut!=="en_attente").map(p => {
                const lines = (p.commentaire||"").split("\n");
                const club = lines[0]?.replace("Club: ","") || p.ville || "";
                const role = lines[1]?.replace("Rôle: ","") || "";
                return (
                  <div key={p.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:8, display:"flex", alignItems:"center", gap:12, opacity:0.65 }}>
                    <span style={{ fontSize:20 }}>👑</span>
                    <div style={{ flex:1 }}>
                      <span style={{ fontWeight:700, fontSize:14 }}>{p.nom}</span>
                      <span style={{ color:C.muted, fontSize:12, marginLeft:8 }}>· {role} · {club}</span>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:p.statut==="publie"?C.green:C.red }}>
                      {p.statut==="publie"?"✅ Acceptée":"❌ Refusée"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );

  const markContactLu = async (id) => {
    await db.updateProposition(id, { statut: "lu" }).catch(()=>{});
    setPropositions(x => x.map(p => p.id===id ? {...p, statut:"lu"} : p));
  };

  const renderContacts = () => (
    <div>
      {contacts.length === 0 ? (
        <div style={{ textAlign:"center", padding:60, color:C.muted }}>📭 Aucun message reçu.</div>
      ) : (
        <>
          <div style={{ marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontWeight:800, fontSize:16, color:C.text }}>✉️ Messages reçus</span>
            {contactsNonLus.length > 0 && (
              <span style={{ background:`${C.accent}22`, border:`1px solid ${C.accent}`, borderRadius:8, padding:"2px 10px", fontSize:12, fontWeight:700, color:C.accent }}>
                {contactsNonLus.length} non lu{contactsNonLus.length>1?"s":""}
              </span>
            )}
          </div>
          {contacts.map(p => {
            const isNonLu = p.statut === "non_lu";
            const sujet = p.commentaire?.startsWith("[") ? p.commentaire.match(/^\[([^\]]*)\]/)?.[1] || "" : "";
            const message = p.commentaire?.startsWith("[") ? p.commentaire.replace(/^\[[^\]]*\]\n?/, "") : p.commentaire || "";
            const dateStr = p.date ? new Date(typeof p.date==="number"?p.date:parseInt(p.date)).toLocaleString("fr-FR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
            return (
              <div key={p.id} style={{
                background: isNonLu ? `linear-gradient(135deg,${C.accent}10,#111)` : C.card,
                border: `1px solid ${isNonLu ? C.accent+"55" : C.border}`,
                borderRadius:14, padding:"16px 18px", marginBottom:10,
                boxShadow: isNonLu ? `0 0 20px ${C.accent}12` : "none",
              }}>
                <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:10 }}>
                  <div style={{ width:40, height:40, borderRadius:12, background:`${C.accent}18`, border:`1px solid ${C.accent}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>✉️</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:2 }}>
                      <span style={{ fontWeight:800, fontSize:15, color:C.text }}>{p.nom}</span>
                      {isNonLu && <span style={{ background:C.accent, borderRadius:6, padding:"1px 8px", fontSize:10, fontWeight:700, color:"#fff" }}>NOUVEAU</span>}
                    </div>
                    <div style={{ color:C.muted, fontSize:12 }}>📧 {p.ville} · 🕒 {dateStr}</div>
                    {sujet && <div style={{ marginTop:4, color:"#60a5fa", fontSize:12, fontWeight:600 }}>📌 {sujet}</div>}
                  </div>
                </div>
                <div style={{ background:"#0a0a0a", borderRadius:10, padding:"12px 14px", fontSize:13.5, color:"#cbd5e1", lineHeight:1.7, whiteSpace:"pre-wrap", wordBreak:"break-word" }}>
                  {message}
                </div>
                <div style={{ marginTop:10, display:"flex", gap:8, alignItems:"center" }}>
                  <a href={`mailto:${p.ville}?subject=Re: ${sujet||"DartPoint"}`}
                    style={{ background:"#1a1a2e", border:`1px solid #60a5fa44`, borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, color:"#60a5fa", textDecoration:"none", cursor:"pointer" }}>
                    ↩️ Répondre
                  </a>
                  {isNonLu && (
                    <button onClick={()=>markContactLu(p.id)}
                      style={{ background:"#141a14", border:`1px solid ${C.green}44`, borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, color:C.green, cursor:"pointer" }}>
                      ✅ Marquer comme lu
                    </button>
                  )}
                  <button onClick={async()=>{
                    if(!window.confirm(`Supprimer définitivement ce message de ${p.nom} ?`)) return;
                    try {
                      await sb(`propositions?id=eq.${p.id}`, { method:"DELETE", prefer:"return=minimal" });
                      setPropositions(arr => arr.filter(x => x.id !== p.id));
                      addLog?.("Message supprimé", p.nom, "danger");
                    } catch(e) {
                      alert("Erreur : " + e.message);
                    }
                  }}
                    style={{ marginLeft:"auto", background:"#1a0000", border:`1px solid ${C.red}44`, borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, color:C.red, cursor:"pointer" }}>
                    🗑 Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );

  const TABS = [
    ["dashboard","📊 Dashboard"],
    ["pending",`⏳ En attente${allPending.length>0?` (${allPending.length})`:""}`,allPending.length>0?"urgent":null],
    ["contacts",`✉️ Messages${contactsNonLus.length>0?` (${contactsNonLus.length})`:""}`,contactsNonLus.length>0?"urgent":null],
    ["bars-ajoutes",`🆕 Bars ajoutés${barsAjoutes.length>0?` (${barsAjoutes.length})`:""}`,barsAjoutes.length>0?"important":null],
    ["demandes-clubs",`👑 Clubs${demandesClubsPending.length>0?` (${demandesClubsPending.length})`:""}`,demandesClubsPending.length>0?"urgent":null],
    ["modifications",`✏️ Modifs${modifications.length>0?` (${modifications.length})`:""}`,modifications.length>0?"important":null],
    ["avismod",`💬 Avis${avisCount>0?` (${avisCount})`:""}`,avisCount>0?"important":null],
    ["allbars",`🎯 Bars (${bars.length})`],
    ["allassos",`🫂 Assos (${associations.length})`],
    ["alltournois",`🏅 Tournois (${tournois.length})`],
    ["signalements",`⚠️ Signalements${sigPending.length>0?` (${sigPending.length})`:""}`,sigPending.length>0?"urgent":null],
    ["joueurs","👤 Joueurs"],
    ["duels","⚔️ Duels"],
    ["logs",`📜 Logs${adminLogs.length>0?` (${adminLogs.length})`:""}`,null],
  ];

  return (
    <div style={{maxWidth:1100,margin:"0 auto",padding:"0 0 60px"}}>
      {editBar&&<EditBarModal bar={editBar} onSave={u=>{setBars(b=>b.map(x=>x.slug===u.slug?u:x));setEditBar(null);addLog("Bar édité",u.nom,"info");}} onClose={()=>setEditBar(null)}/>}
      {editAsso&&<EditAssoModal asso={editAsso} allBars={bars} onSave={u=>{setAssociations(a=>a.map(x=>x.slug===u.slug?u:x));setEditAsso(null);addLog("Association éditée",u.nom,"info");}} onClose={()=>setEditAsso(null)}/>}
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
          : tab==="dashboard"       ? renderDashboard()
          : tab==="pending"         ? renderPending()
          : tab==="contacts"        ? renderContacts()
          : tab==="bars-ajoutes"    ? renderBarsAjoutes()
          : tab==="demandes-clubs"  ? renderDemandes()
          : tab==="modifications"    ? (
            <div style={{ padding:"0 20px" }}>
              <h2 style={{ fontWeight:800, fontSize:18, marginBottom:16, color:C.accent }}>✏️ Historique des modifications</h2>
              {modifications.length === 0 ? (
                <div style={{ textAlign:"center", padding:40, color:C.muted }}>Aucune modification enregistrée</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {modifications.map(m => {
                    const isBar = m.type_prop==="modif_bar";
                    const date = m.date ? new Date(m.date).toLocaleString("fr-FR",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
                    return (
                      <div key={m.id} style={{ background:C.card, border:`1px solid ${isBar?C.accent+"44":"#a78bfa44"}`, borderRadius:12, padding:"14px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                          <span style={{ fontSize:16 }}>{isBar?"🍺":"🫂"}</span>
                          <span style={{ fontWeight:800, fontSize:14, color:C.text }}>{m.nom}</span>
                          <span style={{ fontSize:11, color:C.muted }}>📍 {m.ville}</span>
                          <span style={{ marginLeft:"auto", fontSize:11, color:C.muted }}>{date}</span>
                          <span style={{ background:isBar?C.accent+"22":"#a78bfa22", border:`1px solid ${isBar?C.accent+"44":"#a78bfa44"}`, borderRadius:20, padding:"2px 10px", fontSize:10, fontWeight:700, color:isBar?C.accent:"#a78bfa" }}>
                            {isBar?"BAR":"ASSO"}
                          </span>
                        </div>
                        <p style={{ fontSize:12, color:C.muted, margin:0, lineHeight:1.6 }}>{m.commentaire}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )
          : tab==="avismod"         ? <AvisAdminSection/>
          : tab==="allbars"     ? renderBars()
          : tab==="allassos"    ? renderAssos()
          : tab==="alltournois" ? renderTournois()
          : tab==="signalements"? renderSignalements()
          : tab==="joueurs"     ? <AdminJoueurs addLog={addLog}/>
          : tab==="duels"       ? <AdminDuels addLog={addLog}/>
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

// ── SCOREUR LIBRE (sans compte, noms saisis manuellement) ─────────────────────
const ScoreurLibre = ({ setPage }) => {
  const [phase, setPhase] = useState("config"); // "config" | "jeu" | "stats"
  const [config, setConfig] = useState({ nom1:"Joueur 1", nom2:"Joueur 2", mode:"501", manches:1 });
  const [resultat, setResultat] = useState(null);

  const CL = { bg:"#0a0a0f", card:"#13131f", border:"#1e1e2e", text:"#e2e8f0", sub:"#94a3b8", accent:"#f97316", green:"#22c55e" };

  const handleResultat = (r) => {
    setResultat(r);
    setPhase("stats");
  };

  const rejouer = () => {
    setResultat(null);
    setPhase("jeu"); // relance direct le scoreur avec la même config
  };

  const backToConfig = () => {
    setResultat(null);
    setPhase("config");
  };

  // ── Config screen ──
  if (phase === "config") {
    const modeOptions = ["301","501","701"];
    const manchesOptions = [1,3,5,7];
    return (
      <div style={{ minHeight:"100vh", background:CL.bg, fontFamily:"Inter,sans-serif", padding:"24px 16px" }}>
        <div style={{ maxWidth:480, margin:"0 auto" }}>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
            <button onClick={()=>setPage("home")} style={{ background:"none",border:"none",color:CL.sub,cursor:"pointer",padding:0,display:"flex",alignItems:"center" }}>
              <ArrowLeft size={22} color={CL.sub}/>
            </button>
            <div>
              <div style={{ fontWeight:900, fontSize:22, color:CL.text, display:"flex",alignItems:"center",gap:8 }}><Zap size={22} color={CL.accent}/> Scoreur rapide</div>
              <div style={{ fontSize:12, color:CL.sub }}>Sans compte • Aucune donnée enregistrée</div>
            </div>
          </div>

          {/* Noms */}
          <div style={{ background:CL.card, borderRadius:16, padding:20, marginBottom:14, border:`1px solid ${CL.border}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:CL.sub, marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>Joueurs</div>
            {["nom1","nom2"].map((k,i)=>(
              <div key={k} style={{ marginBottom:12 }}>
                <div style={{ fontSize:12, color:CL.sub, marginBottom:6 }}>Joueur {i+1}</div>
                <input
                  value={config[k]}
                  onChange={e=>setConfig(c=>({...c,[k]:e.target.value}))}
                  placeholder={`Joueur ${i+1}`}
                  style={{ width:"100%", background:"#0a0a14", border:`1px solid ${CL.border}`, borderRadius:10, padding:"12px 14px", color:CL.text, fontSize:15, fontWeight:700, boxSizing:"border-box", outline:"none" }}
                />
              </div>
            ))}
          </div>

          {/* Mode */}
          <div style={{ background:CL.card, borderRadius:16, padding:20, marginBottom:14, border:`1px solid ${CL.border}` }}>
            <div style={{ fontSize:13, fontWeight:700, color:CL.sub, marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>Mode de jeu</div>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {modeOptions.map(m=>(
                <div key={m} onClick={()=>setConfig(c=>({...c,mode:m}))} style={{
                  flex:1, padding:"12px 0", textAlign:"center", borderRadius:10, cursor:"pointer", fontWeight:800, fontSize:16,
                  background: config.mode===m ? CL.accent : "#0a0a14",
                  color: config.mode===m ? "#fff" : CL.sub,
                  border: `2px solid ${config.mode===m ? CL.accent : CL.border}`,
                  transition:"all .15s",
                }}>{m}</div>
              ))}
            </div>
            <div style={{ fontSize:13, fontWeight:700, color:CL.sub, marginBottom:10 }}>Nombre de manches</div>
            <div style={{ display:"flex", gap:8 }}>
              {manchesOptions.map(n=>(
                <div key={n} onClick={()=>setConfig(c=>({...c,manches:n}))} style={{
                  flex:1, padding:"10px 0", textAlign:"center", borderRadius:10, cursor:"pointer", fontWeight:800, fontSize:15,
                  background: config.manches===n ? "#7c3aed" : "#0a0a14",
                  color: config.manches===n ? "#fff" : CL.sub,
                  border: `2px solid ${config.manches===n ? "#7c3aed" : CL.border}`,
                  transition:"all .15s",
                }}>{n}</div>
              ))}
            </div>
          </div>

          <button
            onClick={()=>setPhase("jeu")}
            style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", background:`linear-gradient(135deg,${CL.accent},#ea580c)`, color:"#fff", fontWeight:900, fontSize:18, cursor:"pointer", boxShadow:"0 6px 24px #f9731644", display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}
          >
            <Target size={18}/> Lancer la partie
          </button>
        </div>
      </div>
    );
  }

  // ── Jeu screen ──
  if (phase === "jeu") {
    // On passe un faux "duel" null mais on surcharge config via props — on utilise onResultat
    // Le Scoreur en mode non-duel commence par la config screen… on lui passe initialConfig
    return (
      <ScoreurLibreWrapper
        config={config}
        onResultat={handleResultat}
        onBack={backToConfig}
        onRejouer={rejouer}
      />
    );
  }

  // ── Stats screen ──
  if (phase === "stats" && resultat) {
    const { gagnantNom, scoreC, scoreD, moyC, moyD, joueurs: jData = [], manchesDetail = [] } = resultat;
    const j0 = jData[0] || { nom: config.nom1, manchesGagnees: scoreC, tours:[], flechettes:0, totalPoints:0 };
    const j1 = jData[1] || { nom: config.nom2, manchesGagnees: scoreD, tours:[], flechettes:0, totalPoints:0 };
    const gagnantIdx = gagnantNom === j0.nom ? 0 : 1;
    const perdantIdx = 1 - gagnantIdx;

    const playerStat = (j, isWinner) => {
      const tours = j.tours || [];
      const moy = j.flechettes > 0 ? Math.round((j.totalPoints / j.flechettes) * 3 * 10) / 10 : 0;
      const nb180 = tours.filter(v=>v===180).length;
      const nb140 = tours.filter(v=>v>=140&&v<180).length;
      const nb100 = tours.filter(v=>v>=100&&v<140).length;
      const bestVolee = tours.length > 0 ? Math.max(...tours) : 0;
      return { moy, nb180, nb140, nb100, bestVolee, tours };
    };

    const stats = [j0, j1].map((j, i) => ({ ...j, ...playerStat(j, i === gagnantIdx) }));

    const StatRow = ({ label, v0, v1, highlight }) => (
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:8, padding:"8px 0", borderBottom:`1px solid ${CL.border}` }}>
        <div style={{ textAlign:"right", fontWeight: highlight===0?"900":"600", color: highlight===0?CL.green:CL.text, fontSize:15 }}>{v0}</div>
        <div style={{ textAlign:"center", fontSize:11, color:CL.sub, minWidth:90 }}>{label}</div>
        <div style={{ textAlign:"left", fontWeight: highlight===1?"900":"600", color: highlight===1?CL.green:CL.text, fontSize:15 }}>{v1}</div>
      </div>
    );

    const highlight = (a, b, highIsBetter=true) => {
      if (a === b) return -1;
      return highIsBetter ? (a > b ? 0 : 1) : (a < b ? 0 : 1);
    };

    return (
      <div style={{ minHeight:"100vh", background:CL.bg, fontFamily:"Inter,sans-serif", padding:"24px 16px" }}>
        <div style={{ maxWidth:480, margin:"0 auto" }}>
          {/* Winner banner */}
          <div style={{ background:"linear-gradient(135deg,#14532d,#166534)", borderRadius:20, padding:"28px 20px", textAlign:"center", marginBottom:16 }}>
            <div style={{ marginBottom:8, display:"flex",justifyContent:"center" }}><Trophy size={56} color={CL.green}/></div>
            <div style={{ fontSize:13, color:"#86efac", fontWeight:700, marginBottom:4 }}>VAINQUEUR</div>
            <div style={{ fontSize:28, fontWeight:900, color:CL.green }}>{gagnantNom}</div>
            <div style={{ fontSize:15, color:"#86efac", marginTop:6 }}>
              {j0.manchesGagnees} – {j1.manchesGagnees}
            </div>
          </div>

          {/* Stats comparison */}
          <div style={{ background:CL.card, borderRadius:16, padding:20, marginBottom:16, border:`1px solid ${CL.border}` }}>
            {/* Headers */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, marginBottom:12 }}>
              <div style={{ textAlign:"right", fontWeight:800, fontSize:14, color: gagnantIdx===0?CL.green:CL.text, display:"flex",alignItems:"center",justifyContent:"flex-end",gap:4 }}>
                {j0.nom} {gagnantIdx===0?<Trophy size={14} color={CL.green}/>:""}
              </div>
              <div style={{ minWidth:90 }}/>
              <div style={{ textAlign:"left", fontWeight:800, fontSize:14, color: gagnantIdx===1?CL.green:CL.text, display:"flex",alignItems:"center",gap:4 }}>
                {gagnantIdx===1?<Trophy size={14} color={CL.green}/>:""} {j1.nom}
              </div>
            </div>

            <StatRow
              label="Manches gagnées"
              v0={j0.manchesGagnees}
              v1={j1.manchesGagnees}
              highlight={highlight(j0.manchesGagnees, j1.manchesGagnees)}
            />
            <StatRow
              label="Moyenne"
              v0={stats[0].moy}
              v1={stats[1].moy}
              highlight={highlight(stats[0].moy, stats[1].moy)}
            />
            <StatRow
              label="Fléchettes"
              v0={j0.flechettes}
              v1={j1.flechettes}
              highlight={highlight(j0.flechettes, j1.flechettes, false)}
            />
            <StatRow
              label="Volées"
              v0={(j0.tours||[]).length}
              v1={(j1.tours||[]).length}
              highlight={highlight((j0.tours||[]).length, (j1.tours||[]).length, false)}
            />
            <StatRow
              label="Meilleure volée"
              v0={stats[0].bestVolee || "—"}
              v1={stats[1].bestVolee || "—"}
              highlight={highlight(stats[0].bestVolee, stats[1].bestVolee)}
            />
            <StatRow
              label="180"
              v0={stats[0].nb180}
              v1={stats[1].nb180}
              highlight={highlight(stats[0].nb180, stats[1].nb180)}
            />
            <StatRow
              label="140+"
              v0={stats[0].nb140}
              v1={stats[1].nb140}
              highlight={highlight(stats[0].nb140, stats[1].nb140)}
            />
            <StatRow
              label="100+"
              v0={stats[0].nb100}
              v1={stats[1].nb100}
              highlight={highlight(stats[0].nb100, stats[1].nb100)}
            />
          </div>

          {/* Détail manches */}
          {manchesDetail.length > 0 && (
            <div style={{ background:CL.card, borderRadius:16, padding:20, marginBottom:16, border:`1px solid ${CL.border}` }}>
              <div style={{ fontSize:13, fontWeight:700, color:CL.sub, marginBottom:14, textTransform:"uppercase", letterSpacing:1 }}>Détail des manches</div>
              {manchesDetail.map((m, i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom: i<manchesDetail.length-1?`1px solid ${CL.border}`:"none" }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:13, color:CL.green, display:"flex",alignItems:"center",gap:5 }}><Trophy size={12} color={CL.green}/> {m.winner}</div>
                    <div style={{ fontSize:11, color:CL.sub }}>{m.winner_volees} volées · moy {m.winner_moy}</div>
                  </div>
                  <div style={{ fontSize:11, color:CL.sub, padding:"0 12px" }}>Manche {i+1}</div>
                  <div style={{ flex:1, textAlign:"right" }}>
                    <div style={{ fontWeight:700, fontSize:13, color:CL.text }}>{m.loser}</div>
                    <div style={{ fontSize:11, color:CL.sub }}>{m.loser_volees} volées · moy {m.loser_moy} · reste {m.reste_loser}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Boutons */}
          <button onClick={rejouer} style={{
            width:"100%", padding:"15px", borderRadius:14, border:"2px solid #f9731677",
            background:`linear-gradient(135deg,${CL.accent},#ea580c)`, color:"#fff",
            fontWeight:900, fontSize:17, cursor:"pointer", marginBottom:10,
            boxShadow:"0 0 24px #f9731655, 0 4px 20px #ea580c44",
            animation:"rejouer-glow 2.2s ease-in-out infinite",
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          }}><RefreshCw size={16}/> Rejouer le match</button>
          <style>{`@keyframes rejouer-glow{0%,100%{box-shadow:0 0 18px #f9731655,0 4px 20px #ea580c44}50%{box-shadow:0 0 38px #f97316aa,0 6px 36px #ea580c88}}`}</style>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={()=>setPage("home")} style={{ flex:1, padding:"13px", borderRadius:12, border:`1px solid ${CL.border}`, background:CL.card, color:CL.sub, fontWeight:800, fontSize:15, cursor:"pointer", display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}><HomeIcon size={15}/> Accueil</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Wrapper qui initialise le Scoreur en mode libre avec la config personnalisée
const ScoreurLibreWrapper = ({ config, onResultat, onBack, onRejouer }) => {
  // On utilise un duel "fantôme" pour pré-remplir les noms et éviter l'écran de config du Scoreur
  const fakeDuel = {
    id: null,
    challenger_pseudo: config.nom1 || "Joueur 1",
    defie_pseudo: config.nom2 || "Joueur 2",
    mode: config.mode || "501",
    manches: config.manches || 1,
    type: "amical",
    statut: "en_cours",
  };
  // onDuelTermine est volontairement null pour ne pas déclencher onBack après onResultat
  // setPage intercepte "mon-profil" (bouton quitter) pour revenir à la config
  return (
    <Scoreur
      duel={fakeDuel}
      drixData={null}
      onDuelTermine={null}
      setPage={p => { if (p === "mon-profil") onBack(); }}
      onResultat={onResultat}
      onRejouer={onRejouer}
    />
  );
};

// ── SCOREUR DUEL (charge le duel depuis Supabase) ─────────────────────────────
const ScoreurDuel = ({ duelId, joueur, setPage }) => {
  const [duel, setDuel] = useState(null);
  const [drixData, setDrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newBadges, setNewBadges] = useState([]);
  const [replayOpen, setReplayOpen] = useState(false);
  const [replayForm, setReplayForm] = useState({ mode:"501", manches:1, type:"drix" });
  const [replayLoading, setReplayLoading] = useState(false);

  useEffect(() => {
    sb(`duels?id=eq.${duelId}&select=*`)
      .then(async r => {
        const d = r?.[0];
        if (d) {
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
          setDuel({ ...d, challenger_drix: drix1, defie_drix: drix2 });
          // Partie amicale → pas de DRIX affiché
          if (d.type !== "amical") {
            const K   = 32 * Math.max(1, d.manches || 1);
            const EA1 = 1 / (1 + Math.pow(10, (drix2 - drix1) / 400)); // P(challenger gagne)
            const EA2 = 1 - EA1;                                         // P(défié gagne)
            setDrixData({
              challenger: { gain: Math.round(K * EA2), perte: Math.round(K * EA1) },
              defie:      { gain: Math.round(K * EA1), perte: Math.round(K * EA2) },
            });
          }
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
        // Notification navigateur pour les nouveaux badges
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            const cnt = justUnlocked.length;
            const body = cnt === 1
              ? `Tu as débloqué le badge "${justUnlocked[0].nom}" ! 🏅`
              : `Tu as débloqué ${cnt} nouveaux badges ! 🏅`;
            navigator.serviceWorker?.ready.then(reg => {
              reg.showNotification("🎯 DartPoint", { body, icon:"/icon-192.png", badge:"/icon-192.png", tag:"new-badge" });
            }).catch(() => { try { new Notification("🎯 DartPoint", { body, icon:"/icon-192.png" }); } catch {} });
          } catch {}
        }
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

  const handleRejouer = async () => {
    if (!duel || replayLoading) return;
    setReplayLoading(true);
    try {
      const res = await sb("duels", { method:"POST", body:JSON.stringify({
        challenger_id: duel.challenger_id, challenger_pseudo: duel.challenger_pseudo,
        defie_id: duel.defie_id, defie_pseudo: duel.defie_pseudo,
        statut:"accepte", type: duel.type,
        mode: duel.mode, manches: duel.manches,
        date: Date.now(), valide_challenger:false, valide_defie:false,
        score_manches_challenger:0, score_manches_defie:0,
      }) });
      const newDuel = Array.isArray(res) ? res[0] : res;
      if (newDuel?.id) setPage("scoreur-duel-"+newDuel.id);
    } catch(e) { console.error("Replay duel:", e); }
    setReplayLoading(false);
  };

  if (loading) return <Spinner/>;
  if (!duel) return <div style={{ textAlign:"center",padding:60,color:C.muted }}>Duel introuvable</div>;

  return (
    <>
      {/* key={duel.id} force le remount complet du Scoreur quand on rejoue un nouveau duel */}
      <Scoreur key={duel.id} duel={duel} drixData={drixData} onDuelTermine={handleDuelTermine} onRejouer={handleRejouer} setPage={setPage}/>
      {newBadges.length > 0 && (
        <BadgesRecapModal badges={newBadges} onClose={()=>setNewBadges([])} setPage={setPage}/>
      )}
    </>
  );
};

// ── FOOTER ────────────────────────────────────────────────────────────────────
const Footer = ({ setPage, onOpenHelp }) => (
  <footer style={{ background:"#111",borderTop:`1px solid ${C.border}`,padding:"24px 20px",marginTop:40 }}>
    <div style={{ maxWidth:1100,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12 }}>
      <div><div style={{ fontWeight:800,fontSize:16,color:C.accent,marginBottom:2 }}>🎯 DartPoint</div><p style={{ color:C.muted,fontSize:12 }}>Le guide des bars à fléchettes en France</p></div>
      <div style={{ display:"flex",gap:12,flexWrap:"wrap",alignItems:"center" }}>
      {[["bars","Bars"],["associations","Assos"],["tournois","Tournois"],["joueurs","Joueurs"],["drix","DRIX"],["scoreur","Scoreur"],["jeux","Jeux"],["proposer","Proposer"],["apropos","À propos"],["contact","Contact"],["mentions","Mentions légales"]].map(([p,l])=>(
          <button key={p} onClick={()=>setPage(p)} style={{ background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12 }}>{l}</button>
        ))}
        {onOpenHelp && (
          <button onClick={onOpenHelp} style={{ background:"none",border:"1px solid #2a2a3a",borderRadius:8,color:"#6b7280",cursor:"pointer",fontSize:12,padding:"3px 10px",display:"flex",alignItems:"center",gap:5,touchAction:"manipulation" }}>
            <span style={{ fontSize:13 }}>📋</span> Aide
          </button>
        )}
        <button onClick={()=>setPage("adminlogin")} style={{ background:"none",border:"none",color:"#3a3a3a",cursor:"pointer",fontSize:11 }}>⚙</button>
      </div>
    </div>
  </footer>
);

// ── ONBOARDING ────────────────────────────────────────────────────────────────
const ONBOARDING_SECTIONS = [
  {
    emoji: "🎯",
    title: "Bienvenue sur DartPoint",
    body: "Le premier réseau social dédié aux joueurs de fléchettes en France. DartPoint n'est pas un jeu en ligne — tout se passe en physique, dans les bars, entre amis.",
    accent: "#f97316",
  },
  {
    emoji: "🗺️",
    title: "Trouve où jouer près de chez toi",
    body: "DartPoint recense les bars à fléchettes partout en France avec une carte interactive. Retrouve les adresses, horaires, photos et avis de chaque établissement.",
    sub: "Ton bar n'est pas encore référencé ? Propose-le en 2 minutes depuis la section \"Trouve ton spot\" — c'est gratuit et ça aide toute la communauté !",
    accent: "#22c55e",
  },
  {
    emoji: "👥",
    title: "Un réseau social de la fléchette",
    body: "Crée ton profil, affilie-toi à un bar, défie tes amis en physique et enregistre vos scores ensemble.",
    accent: "#60a5fa",
  },
  {
    emoji: "💎",
    title: "Le système DRIX",
    body: "Un classement ELO propre aux fléchettes. Chaque duel physique te fait gagner ou perdre des points DRIX selon le niveau de ton adversaire.",
    sub: "Monte dans les rangs : Débutant → Amateur → Confirmé → Expert → Élite",
    accent: "#a78bfa",
  },
  {
    emoji: "🎮",
    title: "Les mini-jeux",
    body: "Entraîne-toi avec le Scoreur 501/301, apprends à calculer les finishes, et découvre Le Capital et d'autres jeux pour progresser.",
    accent: "#34d399",
  },
  {
    emoji: "🍺",
    title: "Trouve ton bar",
    body: "Recherche les bars à fléchettes près de chez toi, consulte leurs fiches, photos et avis. Tu connais un bar pas encore référencé ? Propose-le en 2 minutes !",
    accent: "#f97316",
  },
  {
    emoji: "📍",
    title: "Important",
    body: "DartPoint est une communauté. Plus vous êtes nombreux à référencer vos bars et enregistrer vos duels, plus le réseau devient puissant.",
    accent: "#facc15",
    highlight: true,
  },
];

const Onboarding = ({ onDone }) => {
  const [btnVisible, setBtnVisible] = useState(false);
  const scrollRef = useRef(null);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) setBtnVisible(true);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight + 60) setBtnVisible(true);
  }, []);

  const done = () => {
    localStorage.setItem("dp_onboarding_done", "true");
    onDone();
  };

  // ── Section card helper ───────────────────────────────────────────────────
  const SCard = ({ s }) => (
    <div style={{ marginBottom:16, borderRadius:18,
      background: s.highlight
        ? `linear-gradient(135deg,${s.accent}18,#12120a)`
        : "linear-gradient(135deg,#111118,#0e0e14)",
      border:`1px solid ${s.accent}${s.highlight?"44":"25"}`,
      padding:"18px 16px",
      boxShadow: s.highlight ? `0 0 32px ${s.accent}14` : "none",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
        <div style={{ width:44, height:44, borderRadius:13, background:`${s.accent}18`, border:`1px solid ${s.accent}33`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:21, flexShrink:0 }}>
          {s.emoji}
        </div>
        <h2 style={{ fontWeight:800, fontSize:16, color:"#f1f5f9", margin:0, lineHeight:1.3 }}>{s.title}</h2>
      </div>
      <p style={{ color:"#94a3b8", fontSize:13.5, lineHeight:1.75, margin:0, marginBottom: s.sub ? 10 : 0 }}>{s.body}</p>
      {s.sub && (
        <div style={{ marginTop:10, background:`${s.accent}12`, border:`1px solid ${s.accent}30`, borderRadius:10, padding:"8px 13px", fontSize:12.5, fontWeight:700, color:s.accent }}>
          {s.sub}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"#090909", display:"flex", flexDirection:"column" }}>
      {/* ── Header ── */}
      <div style={{ flexShrink:0, padding:"18px 20px 16px", textAlign:"center", borderBottom:"1px solid #161616" }}>
        <img src="/logo dart point/logo bandeau.png" alt="DartPoint"
          style={{ height:36, objectFit:"contain", filter:"drop-shadow(0 0 16px rgba(249,115,22,.55))" }}/>
      </div>

      {/* ── Scroll area ── */}
      <div ref={scrollRef} onScroll={onScroll}
        style={{ flex:1, overflowY:"auto", overflowX:"hidden", padding:"20px 18px 28px", WebkitOverflowScrolling:"touch" }}>

        {/* Sections 0 & 1 */}
        {ONBOARDING_SECTIONS.slice(0, 2).map((s, i) => <SCard key={i} s={s}/>)}

        {/* Section DRIX */}
        <SCard s={ONBOARDING_SECTIONS[2]}/>

        {/* ── BLOC VISUEL : Courbe + Dangerosité ── */}
        <StatsPreviewBlock gradientIdSuffix="-ob"/>

        {/* Sections 3, 4, 5 */}
        {ONBOARDING_SECTIONS.slice(3).map((s, i) => <SCard key={i+3} s={s}/>)}

        {/* Indicateur de scroll */}
        {!btnVisible && (
          <div style={{ textAlign:"center", color:"#222230", fontSize:12, marginBottom:10 }}>
            ↓ continue à défiler
          </div>
        )}

        {/* Bouton CTA révélé après scroll */}
        <div style={{ transition:"opacity .45s, transform .45s", opacity: btnVisible?1:0, transform: btnVisible?"translateY(0)":"translateY(18px)", pointerEvents: btnVisible?"auto":"none" }}>
          <button onClick={done}
            style={{ width:"100%", padding:"17px 0", background:"linear-gradient(135deg,#f97316,#dc4e08)", color:"#fff", border:"none", borderRadius:16, fontWeight:900, fontSize:17, cursor:"pointer", boxShadow:"0 8px 32px #f9731460", touchAction:"manipulation", letterSpacing:.4 }}>
            J'ai compris, je me lance ! 🎯
          </button>
          <p style={{ textAlign:"center", color:"#2a2a3a", fontSize:11, marginTop:12 }}>
            Tu peux retrouver ces infos dans "À propos" à tout moment.
          </p>
        </div>
      </div>
    </div>
  );
};

// ── APP ───────────────────────────────────────────────────────────────────────
// ── HELP CONTENT par page ─────────────────────────────────────────────────────
const HELP_CONTENT = {
  home:           { emoji:"🏠", title:"Tableau de bord", items:[
    {icon:"💬",label:"Le Comptoir",text:"Le Comptoir, c'est le fil social de DartPoint. Retrouve les posts, victoires et présences de tes amis. Tu peux aussi publier un message ou partager un résultat depuis cette section."},
    {icon:"⚔️",label:"Défis",text:"Consulte les défis reçus et envoyés. Un badge rouge indique les défis en attente de réponse. Les duels classés impactent ton score DRIX."},
    {icon:"💎",label:"Classement DRIX",text:"Ton classement DRIX évolue à chaque duel enregistré. Clique sur la tuile Classement pour voir ton rang et l'historique de ta progression."},
    {icon:"🎮",label:"Modes de jeu",text:"Accède directement aux mini-jeux : Scoreur 501/301, Cricket, Rush Mode et Le Capital. Lance une partie en solo ou avec des amis."},
    {icon:"🍺",label:"Trouve un bar",text:"Localise les bars à fléchettes près de chez toi. Les bars avec des joueurs présents ce soir sont mis en avant."},
  ]},
  bars:           { emoji:"🍺", title:"Bars & Associations", items:[
    {icon:"🔍",label:"Recherche",text:"Tape le nom d'une ville ou d'un bar pour filtrer les résultats instantanément. Tu peux aussi utiliser ta géolocalisation pour trouver les bars près de toi."},
    {icon:"🗺️",label:"Vue carte / liste",text:"Bascule entre la carte interactive et la liste pour explorer à ta façon. Sur la carte, clique sur un marqueur pour accéder à la fiche du bar."},
    {icon:"⚡",label:"Bars actifs",text:"Le filtre 'Actifs' montre les bars où des joueurs ont signalé leur présence aujourd'hui. Idéal pour trouver où jouer ce soir !"},
    {icon:"👥",label:"Associations",text:"L'onglet Associations liste les clubs affiliés. Clique sur un club pour voir ses membres, son président et ses informations de contact."},
    {icon:"➕",label:"Ajouter un bar",text:"Tu connais un bar pas encore référencé ? Utilise 'Proposer un bar' depuis le menu. Il sera ajouté automatiquement."},
  ]},
  bar:            { emoji:"🍺", title:"Fiche du bar", items:[
    {icon:"📍",label:"Infos pratiques",text:"Adresse, téléphone, type de cibles (électroniques ou sisal), nombre de cibles disponibles et association affiliée."},
    {icon:"👥",label:"Présences",text:"Signale ta présence ce soir pour que les autres joueurs te trouvent. Les présences se réinitialisent chaque jour à minuit."},
    {icon:"⚔️",label:"Défier un joueur",text:"Depuis la liste des joueurs présents, tu peux lancer un défi directement. Le score sera enregistré et affectera vos DRIX."},
    {icon:"📸",label:"Photos",text:"Ajoute des photos du bar pour aider la communauté. Les photos sont modérées avant publication."},
    {icon:"⭐",label:"Avis",text:"Laisse un avis sur le bar (note + commentaire). Les avis des membres de la communauté sont visibles par tous."},
    {icon:"⚠️",label:"Signaler",text:"Si les informations du bar sont incorrectes ou obsolètes, signale-le. Notre équipe corrigera la fiche."},
  ]},
  associations:   { emoji:"🫂", title:"Associations & clubs", items:[
    {icon:"🔍",label:"Trouver un club",text:"Parcours la liste ou la carte pour trouver une association de fléchettes près de chez toi."},
    {icon:"📋",label:"Infos du club",text:"Chaque fiche club affiche les jours et lieux d'entraînement, le président et le contact pour rejoindre le club."},
    {icon:"🍺",label:"Bar affilié",text:"Les associations sont souvent liées à un bar. Clique sur le bar affilié pour voir les présences et les joueurs."},
    {icon:"➕",label:"Proposer un club",text:"Ton club n'est pas encore référencé ? Utilise le bouton 'Proposer une association' en bas de page."},
  ]},
  asso:           { emoji:"🫂", title:"Fiche du club", items:[
    {icon:"🏠",label:"Onglet Club",text:"Infos pratiques du club : jours et lieu d'entraînement, président, contact, bar affilié et carte de localisation."},
    {icon:"👥",label:"Onglet Membres",text:"Classement interne des membres du club par score DRIX. Tu peux cliquer sur un joueur pour voir son profil et le défier."},
    {icon:"📅",label:"Onglet Événements",text:"Les tournois organisés par ce club apparaissent ici, avec les événements à venir et passés."},
    {icon:"✏️",label:"Modifier",text:"Le bouton ✏️ Modifier à côté du nom du club permet de corriger les informations (réservé aux membres et admins)."},
  ]},
  jeux:           { emoji:"🎮", title:"Mini-jeux", items:[
    {icon:"🎯",label:"Jeux avec fléchettes",text:"Lance un Scoreur 501/301 pour t'entraîner ou jouer avec des amis. Tu peux aussi lancer une partie de Cricket, Around the Clock ou un tournoi entre potes."},
    {icon:"🧠",label:"Jeux sans fléchettes",text:"Entraîne ton mental avec le Rush Mode (calcul rapide de finishes), les quiz de règles et d'autres jeux de réflexion."},
    {icon:"⚔️",label:"Duel officiel",text:"Pour enregistrer un duel qui compte dans le classement DRIX, utilise l'onglet Défi depuis ton profil."},
    {icon:"📊",label:"Scores sauvegardés",text:"Les parties jouées via le scoreur sont enregistrées dans ton historique de profil si tu es connecté."},
  ]},
  defi:           { emoji:"⚔️", title:"Défis", items:[
    {icon:"🎯",label:"Lancer un défi",text:"Choisis un ami dans la liste et configure le duel : mode (501/301/Cricket), nombre de manches, et type (classé ou amical). Le duel classé affecte vos DRIX."},
    {icon:"💎",label:"Duels DRIX vs Amical",text:"Un duel 'Classé' modifie vos scores DRIX selon le résultat. Un duel 'Amical' ne change pas les DRIX — idéal pour s'entraîner sans pression."},
    {icon:"📊",label:"Fiche adversaire",text:"Clique sur un ami pour voir sa fiche : dangerosité, taux de victoire, historique face à toi, forme récente et estimation des gains/pertes DRIX."},
    {icon:"⚠️",label:"Contester un résultat",text:"Si un résultat ne correspond pas à la réalité, tu peux le contester dans les 24h. Le duel sera signalé à l'admin."},
    {icon:"👥",label:"Doublette 2v2",text:"Le mode Doublette permet de jouer en équipe de 2. Associe-toi à un ami et affrontez une autre équipe."},
  ]},
  communaute:     { emoji:"👥", title:"Communauté", items:[
    {icon:"📰",label:"Fil d'actualité",text:"Le fil affiche les dernières activités de tes amis : résultats de duels, évolutions DRIX, présences dans les bars et posts publiés."},
    {icon:"✍️",label:"Publier un post",text:"Partage une pensée, une photo de partie ou une victoire avec ta communauté. Tous tes amis verront ton post dans leur fil."},
    {icon:"❤️",label:"Likes & commentaires",text:"Tu peux liker et commenter les posts et résultats de tes amis directement depuis le fil."},
    {icon:"🍺",label:"Présences",text:"Quand un ami signale sa présence dans un bar, ça apparaît dans le fil. Clique pour voir la fiche du bar."},
  ]},
  drix: {
    emoji:"💎", title:"Classement DRIX",
    visual: (
      <div style={{ borderRadius:16, background:"linear-gradient(135deg,#0e0e1e,#0a0a14)", border:"1px solid #1e1e35", padding:"14px 12px" }}>
        {/* Explication ELO — duel visuel */}
        <p style={{ color:"#94a3b8", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Comment les points évoluent ?</p>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-around", marginBottom:14 }}>
          {/* Joueur A */}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:4 }}>🎯</div>
            <div style={{ fontWeight:800, fontSize:13, color:"#f1f5f9" }}>Toi</div>
            <div style={{ fontSize:12, color:"#a78bfa", fontWeight:700 }}>1 200 pts</div>
            <div style={{ fontSize:10, color:"#94a3b8" }}>Confirmé</div>
          </div>
          {/* Flèches duel */}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:18 }}>⚔️</div>
            <div style={{ fontSize:9, color:"#4b5572", marginTop:2 }}>DUEL CLASSÉ</div>
          </div>
          {/* Joueur B */}
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:28, marginBottom:4 }}>🎯</div>
            <div style={{ fontWeight:800, fontSize:13, color:"#f1f5f9" }}>Adversaire</div>
            <div style={{ fontSize:12, color:"#60a5fa", fontWeight:700 }}>1 450 pts</div>
            <div style={{ fontSize:10, color:"#94a3b8" }}>Expert</div>
          </div>
        </div>
        {/* Résultats possibles */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
          <div style={{ borderRadius:10, background:"#0d1f0d", border:"1px solid #166534", padding:"10px 12px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#22c55e", marginBottom:4 }}>✅ Tu gagnes</div>
            <div style={{ fontSize:13, color:"#f1f5f9", fontWeight:800 }}>+32 pts DRIX</div>
            <div style={{ fontSize:10, color:"#4b7c4b", marginTop:2 }}>Adversaire fort → gros gain</div>
          </div>
          <div style={{ borderRadius:10, background:"#1f0d0d", border:"1px solid #7f1d1d", padding:"10px 12px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#ef4444", marginBottom:4 }}>❌ Tu perds</div>
            <div style={{ fontSize:13, color:"#f1f5f9", fontWeight:800 }}>−12 pts DRIX</div>
            <div style={{ fontSize:10, color:"#7c4b4b", marginTop:2 }}>Adversaire fort → petite perte</div>
          </div>
        </div>
        {/* Échelle des rangs */}
        <p style={{ color:"#94a3b8", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Échelle des rangs</p>
        <svg width="100%" height="36" viewBox="0 0 300 36" style={{ display:"block" }}>
          <defs>
            <linearGradient id="hc-ranks" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa"/>
              <stop offset="25%" stopColor="#22c55e"/>
              <stop offset="50%" stopColor="#f59e0b"/>
              <stop offset="75%" stopColor="#f97316"/>
              <stop offset="100%" stopColor="#a78bfa"/>
            </linearGradient>
          </defs>
          <rect x="2" y="14" width="296" height="8" rx="4" fill="url(#hc-ranks)" opacity="0.7"/>
          {[["Déb.",0],["Ama.",75],["Conf.",150],["Exp.",225],["Élite",285]].map(([lbl,x],i)=>(
            <g key={i}>
              <circle cx={x===285?295:x+10} cy="18" r="5" fill={["#60a5fa","#22c55e","#f59e0b","#f97316","#a78bfa"][i]}/>
              <text x={x===285?295:x+10} y="34" textAnchor="middle" fontSize="7" fill="#94a3b8">{lbl}</text>
            </g>
          ))}
        </svg>
      </div>
    ),
    items:[
      {icon:"💎",label:"Qu'est-ce que le DRIX ?",text:"Le DRIX est un classement ELO adapté aux fléchettes physiques. Chaque joueur commence à 1 000 points et évolue selon ses duels."},
      {icon:"⚖️",label:"Calcul des points",text:"Battre un joueur plus fort que toi rapporte beaucoup de points. Perdre contre un joueur plus faible en coûte beaucoup. L'écart entre vos DRIX détermine les gains/pertes."},
      {icon:"🏅",label:"Les 5 rangs",text:"Débutant (< 1 000) → Amateur (1 000–1 200) → Confirmé (1 200–1 500) → Expert (1 500–1 800) → Élite (> 1 800). Chaque rang a son badge."},
      {icon:"📊",label:"Historique DRIX",text:"Depuis ton profil, l'onglet DRIX affiche l'évolution de ton score duel par duel, ton meilleur score et ta série en cours."},
      {icon:"⚔️",label:"Duel classé vs amical",text:"Seuls les duels 'Classés' affectent le DRIX. Un duel 'Amical' te permet de jouer sans pression, sans modifier ton classement."},
    ],
  },
  "mon-profil": {
    emoji:"👤", title:"Mon Profil",
    visual: (
      <div style={{ borderRadius:16, background:"linear-gradient(135deg,#0e0e1e,#0a0a14)", border:"1px solid #1e1e35", padding:"14px 12px" }}>
        <p style={{ color:"#94a3b8", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:10 }}>Ta dangerosité</p>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:14 }}>
          {/* Jauge circulaire dangerosité */}
          <svg width="90" height="90" viewBox="0 0 90 90" style={{ flexShrink:0 }}>
            <defs>
              <linearGradient id="hc-danger" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316"/>
                <stop offset="100%" stopColor="#ef4444"/>
              </linearGradient>
            </defs>
            <circle cx="45" cy="45" r="36" fill="none" stroke="#1e1e2e" strokeWidth="10"/>
            <circle cx="45" cy="45" r="36" fill="none" stroke="url(#hc-danger)" strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${2*Math.PI*36*0.72} ${2*Math.PI*36*(1-0.72)}`}
              strokeDashoffset={2*Math.PI*36*0.25}
              transform="rotate(-90 45 45)"/>
            <text x="45" y="44" textAnchor="middle" fontSize="14" fontWeight="800" fill="#f97316">72%</text>
            <text x="45" y="57" textAnchor="middle" fontSize="8" fill="#94a3b8">Danger</text>
          </svg>
          <div style={{ flex:1 }}>
            <div style={{ marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:11, color:"#94a3b8" }}>Taux victoire</span>
                <span style={{ fontSize:11, color:"#22c55e", fontWeight:700 }}>61%</span>
              </div>
              <div style={{ height:5, borderRadius:3, background:"#1e1e2e" }}>
                <div style={{ height:"100%", width:"61%", borderRadius:3, background:"#22c55e" }}/>
              </div>
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ fontSize:11, color:"#94a3b8" }}>DRIX</span>
                <span style={{ fontSize:11, color:"#a78bfa", fontWeight:700 }}>1 340</span>
              </div>
              <div style={{ height:5, borderRadius:3, background:"#1e1e2e" }}>
                <div style={{ height:"100%", width:"67%", borderRadius:3, background:"#a78bfa" }}/>
              </div>
            </div>
          </div>
        </div>
        {/* Onglets du profil */}
        <p style={{ color:"#94a3b8", fontSize:11, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>Les onglets de ton profil</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          {[["📊","Stats","Tes moyennes, MPR, PPR et évolution"],["👥","Amis","Amis, demandes et joueurs proches"],["🏅","Badges","Tes trophées débloqués"],["📜","Historique","Tous tes duels et résultats"]].map(([ic,lbl,desc],i)=>(
            <div key={i} style={{ borderRadius:10, background:"#111120", border:"1px solid #1e1e2e", padding:"8px 10px" }}>
              <div style={{ fontSize:14, marginBottom:3 }}>{ic} <span style={{ fontWeight:700, fontSize:11, color:"#f97316" }}>{lbl}</span></div>
              <div style={{ fontSize:9, color:"#64748b", lineHeight:1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    items:[
      {icon:"📊",label:"Onglet Stats",text:"Tes statistiques détaillées : moyenne par volée, MPR (Marks Per Round), PPR, finishes réussis, séries en cours et meilleures performances."},
      {icon:"🔥",label:"Dangerosité",text:"La dangerosité est un score entre 0 et 100% calculé à partir de ton DRIX, ton taux de victoire et ta régularité. Plus tu es dangereux, plus tes adversaires gagnent à te battre."},
      {icon:"👥",label:"Onglet Amis",text:"Ajoute des amis pour les défier, voir leur activité dans le fil et comparer vos stats. Les demandes en attente apparaissent en haut."},
      {icon:"🏅",label:"Onglet Badges",text:"Chaque badge correspond à un exploit (première victoire, série de 5 victoires, 100 duels joués…). Certains badges sont rares et difficiles à obtenir."},
      {icon:"📜",label:"Onglet Historique",text:"Retrouve tous tes duels avec le résultat, l'adversaire, la date et l'évolution de ton DRIX. Filtre par mode de jeu ou par mois."},
      {icon:"✏️",label:"Modifier ton profil",text:"Clique sur ✏️ Modifier pour mettre à jour ta pseudo, ta ville, ton bar affilié et ta photo. Ces infos sont visibles par tous les membres."},
    ],
  },
};

export default function App() {
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem("dp_onboarding_done"));
  const [page,setPage]=useState("home");
  // Expose setPage globally so child modules (AppJoueurs CGU links) can navigate
  window.setPageGlobal = (p) => nav(p);
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
  // ── Help modal global ─────────────────────────────────────────────────────
  const [helpOpen,setHelpOpen]=useState(false);
  const [joueur,setJoueur]=useState(null);
  const [defisCount,setDefisCount]=useState(0);
  const [notifCount,setNotifCount]=useState(0);
  const [demandesAmisCount,setDemandesAmisCount]=useState(0);
  const [unreadMessages,setUnreadMessages]=useState(0);
  const [newBadgesCount,setNewBadgesCount]=useState(0);
  const prevDemandesRef = useRef(0);
  const [barsActifs,setBarsActifs]=useState([]);
  const [installPrompt,setInstallPrompt]=useState(null);
  const [isInstalled,setIsInstalled]=useState(false);
  const [showChronoPopup,setShowChronoPopup]=useState(false);
  const [chronoLeader,setChronoLeader]=useState(null);
  const [showEmailRequired,setShowEmailRequired]=useState(false);
  const [emailReqValue,setEmailReqValue]=useState("");
  const [emailReqCgu,setEmailReqCgu]=useState(false);
  const [emailReqLoading,setEmailReqLoading]=useState(false);
  const [emailReqErr,setEmailReqErr]=useState("");
  const [showLegal,setShowLegal]=useState(null); // null | "cgu" | "privacy"
  const [chronoDrixNotif,setChronoDrixNotif]=useState(null);
  const [showDefiHebdoUnlock,setShowDefiHebdoUnlock]=useState(false);

  // ── Récompense Chrono Finish : minuit automatique ─────────────────────────
  // 1) Au démarrage : n'importe quel utilisateur ouvrant l'app déclenche le check
  //    (le flag `rewarded` en DB + le verrou localStorage évitent la double-attribution)
  // 2) Timer minuit : si l'app reste ouverte, re-déclenche à 00h01 chaque jour
  useEffect(()=>{
    const msUntilMidnight = () => {
      const now   = new Date();
      const minuit = new Date(now);
      minuit.setDate(minuit.getDate() + 1);
      minuit.setHours(0, 1, 0, 0); // 00:01:00
      return Math.max(5000, minuit.getTime() - now.getTime());
    };

    // Check immédiat (idempotent — tourne une fois par jour max grâce au verrou DB)
    checkYesterdayReward(null, () => {});

    // Timer récursif qui tire à 00h01 chaque nuit
    let timer;
    const planifier = () => {
      timer = setTimeout(() => {
        checkYesterdayReward(null, () => {});
        planifier(); // reprogram le lendemain
      }, msUntilMidnight());
    };
    planifier();

    return () => clearTimeout(timer);
  },[]); // eslint-disable-line

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

  // Popup email obligatoire pour les comptes sans email
  useEffect(()=>{
    if (joueur?.id && !joueur?.email) {
      setShowEmailRequired(true);
      setEmailReqValue("");
      setEmailReqCgu(false);
      setEmailReqErr("");
    } else {
      setShowEmailRequired(false);
    }
  },[joueur?.id, joueur?.email]);

  // ── Notification déblocage Défi de la Semaine (1 fois, dès 10 amis) ──────────
  useEffect(() => {
    if (!joueur?.id) return;
    const flagKey = "dp_defi_hebdo_unlocked";
    if (localStorage.getItem(flagKey) === "1") return; // déjà notifié
    sb(`amis?or=(joueur_id.eq.${joueur.id},ami_id.eq.${joueur.id})&statut=eq.accepte&select=id&limit=10`)
      .then(a => {
        if (Array.isArray(a) && a.length >= 10) {
          localStorage.setItem(flagKey, "1");
          setTimeout(() => setShowDefiHebdoUnlock(true), 1500);
        }
      }).catch(() => {});
  }, [joueur?.id]); // eslint-disable-line

  // ── Popup défi quotidien Chrono Finish ────────────────────────────────────────
  useEffect(()=>{
    if (!joueur) return;
    const today = new Date().toISOString().split("T")[0];
    const popupKey = `dp_chrono_popup_${today}`;
    const playedKey = `dp_chrono_${today}`;
    if (!localStorage.getItem(popupKey) && !localStorage.getItem(playedKey)) {
      localStorage.setItem(popupKey, "1");
      // Récupérer le leader du jour + sa photo
      sb(`chrono_finish_scores?date_jour=eq.${today}&order=temps_ms.asc&limit=1&select=joueur_id,joueur_pseudo,temps_ms`)
        .then(async r=>{
          if(!r||!r[0]) return;
          const leader = r[0];
          const jArr = await sb(`joueurs?id=eq.${leader.joueur_id}&select=photo`).catch(()=>null);
          leader.photo = jArr?.[0]?.photo || null;
          setChronoLeader(leader);
        })
        .catch(()=>{});
      setTimeout(() => setShowChronoPopup(true), 1200);
    }
  },[joueur?.id]);

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
    if (!joueur) { setDefisCount(0); setNotifCount(0); setDemandesAmisCount(0); setUnreadMessages(0); setNewBadgesCount(0); prevDemandesRef.current=0; return; }
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
        // Nouveaux badges non vus
        let badgesN = 0;
        try {
          const badgeStored = getBadgesStored(joueur.id).size;
          const badgeSeen = parseInt(localStorage.getItem(`dp_badges_seen_${joueur.id}`) || "0");
          badgesN = Math.max(0, badgeStored - badgeSeen);
          setNewBadgesCount(badgesN);
        } catch {}
        // Synchronise le badge icône de l'appli (PWA home screen)
        const totalBadge = (matchsN + amisN + contestN) + msgN + badgesN;
        try {
          if (totalBadge > 0) {
            navigator.setAppBadge?.(totalBadge);
          } else {
            navigator.clearAppBadge?.();
            // Ferme aussi les notifications SW persistantes
            navigator.serviceWorker?.ready.then(reg => {
              reg.getNotifications().then(notifs => notifs.forEach(n => n.close())).catch(()=>{});
            }).catch(()=>{});
          }
        } catch {}
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
    // Resynchro badge quand l'utilisateur revient sur l'appli
    const onVisible = () => { if (document.visibilityState === "visible") fetchNotifs(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  },[joueur?.id]);

  const handleLogin=(j)=>{ setJoueur(j); localStorage.setItem("dp_joueur",JSON.stringify(j)); nav("home"); };
  const handleProposal=async f=>{
    const slug = slugify(f.nom+"-"+f.ville);
    // Ajout direct dans la table bars
    const result = await db.addBar({
      nom:f.nom, ville:f.ville, adresse:f.adresse||"", cp:f.cp||"",
      type:f.type, cibles:parseInt(f.cibles)||1, tournois:f.tournois==="oui",
      tel:f.tel||"", slug, source:"user", verifie:false,
    }).catch(()=>null);
    if (result?.[0]) setBars(prev=>[...prev, result[0]]);
    // Log pour l'admin (info seulement)
    await db.addProposition({ nom:f.nom, ville:f.ville, slug, statut:"auto_accepte", date:Date.now(), commentaire:`Bar ajouté directement. ${f.commentaire||""}`.trim() }).catch(()=>{});
  };
  const handleProposalAsso=async f=>{ await db.addProposition({...f,slug:slugify(f.nom+"-"+f.ville),statut:"en_attente",date:Date.now(),type_prop:"association"}); };
  const handleProposalTournoi=async f=>{ await db.addProposition({...f,slug:slugify(f.nom+"-"+f.ville),statut:"en_attente",date:Date.now(),type_prop:"tournoi"}); };

  // ── NAVIGATION ────────────────────────────────────────────────────────────────
  // nav() : déduplique les pages consécutives identiques, limite l'historique à 60 entrées
  const nav = (p) => {
    setHistory(h => {
      if (h[h.length - 1] === p) return h;   // ne pas doubler la même page
      return [...h.slice(-59), p];            // max 60 entrées
    });
    setPage(p);
    try { window.scrollTo(0, 0); } catch {}
  };

  // goBack() via refs pour éviter les closures périmées
  const historyRef = useRef(history);
  const pageRef    = useRef(page);
  useEffect(() => { historyRef.current = history; }, [history]);
  useEffect(() => { pageRef.current    = page;    }, [page]);

  const goBack = useCallback(() => {
    const h = historyRef.current;
    if (h.length <= 1) return;
    const nh = h.slice(0, -1);
    setHistory(nh);
    setPage(nh[nh.length - 1]);
    try { window.scrollTo(0, 0); } catch {}
  }, []);

  const [pendingNav, setPendingNav] = useState(null);
  const isGamePage = (p) =>
    p === "jeux-capital" || p === "scoreur" || p === "scoreur-doublette" ||
    p === "cricket-config" || p === "rush-mode" || p === "chrono-finish" ||
    p.startsWith("scoreur-duel-") || p.startsWith("scoreur-potes-");

  const navSafe = (targetPage) => {
    if (isGamePage(pageRef.current)) { setPendingNav(targetPage); }
    else { nav(targetPage); }
  };

  // ── Auto-ouvre l'aide à la première visite de chaque page ────────────────────
  useEffect(() => {
    const h = HELP_CONTENT[page];
    if (!h) { setHelpOpen(false); return; }
    const key = `dp_help_seen_${page}`;
    if (!localStorage.getItem(key)) {
      setHelpOpen(true);
      localStorage.setItem(key, "1");
    } else {
      setHelpOpen(false);
    }
  }, [page]);

  // ── Clear badge count quand l'utilisateur arrive sur la page badges ───────────
  useEffect(() => {
    if (page === "profil-badges" && joueur) {
      try {
        const total = getBadgesStored(joueur.id).size;
        localStorage.setItem(`dp_badges_seen_${joueur.id}`, String(total));
      } catch {}
      setNewBadgesCount(0);
    }
  }, [page, joueur?.id]);

  // ── HANDLER POPSTATE — monté UNE SEULE FOIS, utilise les refs ─────────────────
  useEffect(() => {
    // Injecter un état initial pour toujours avoir quelque chose à intercepter
    window.history.pushState({ dp: true }, "");

    const onPop = () => {
      const p = pageRef.current;
      const h = historyRef.current;

      if (isGamePage(p)) {
        // Page de jeu → modale de confirmation
        const prev = h.length > 1 ? h[h.length - 2] : "home";
        setPendingNav(prev);
      } else if (h.length > 1) {
        // Navigation normale → retour dans l'historique interne
        const nh = h.slice(0, -1);
        setHistory(nh);
        setPage(nh[nh.length - 1]);
        try { window.scrollTo(0, 0); } catch {}
      }
      // Toujours réinjecter un état pour bloquer la sortie de l'appli
      window.history.pushState({ dp: true }, "");
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []); // [] = monté une seule fois, les refs gèrent la fraîcheur

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
      {showOnboarding && <Onboarding onDone={()=>setShowOnboarding(false)}/>}

      {/* ── Popup email obligatoire (anciens comptes sans email) ── */}
      {showEmailRequired && (
        <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.96)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div style={{ background:"linear-gradient(160deg,#0e0e14,#0b0b10)",border:"1px solid #a855f733",borderRadius:24,padding:"28px 24px",maxWidth:380,width:"100%",boxShadow:"0 0 60px rgba(168,85,247,0.2)" }}>
            {/* Icône */}
            <div style={{ width:64,height:64,borderRadius:18,background:"linear-gradient(135deg,#7c3aed,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:"0 0 24px rgba(168,85,247,0.4)" }}>
              <Mail size={28} color="#fff"/>
            </div>
            {/* Titre */}
            <h2 style={{ fontWeight:900,fontSize:20,textAlign:"center",marginBottom:8,color:"#f1f5f9" }}>
              Une dernière étape 🎯
            </h2>
            <p style={{ fontSize:13,color:"#64748b",textAlign:"center",lineHeight:1.6,marginBottom:24 }}>
              DartPoint évolue ! Pour protéger ton compte et récupérer ton mot de passe si tu l'oublies, ajoute ton adresse e-mail.
            </p>
            {/* Champ email */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12,fontWeight:700,color:"#94a3b8",display:"block",marginBottom:6 }}>Adresse e-mail *</label>
              <input
                type="email"
                value={emailReqValue}
                onChange={e=>{ setEmailReqValue(e.target.value); setEmailReqErr(""); }}
                placeholder="ton@email.com"
                style={{ width:"100%",background:"#070710",border:`1px solid ${emailReqErr?"#ef4444":emailReqValue.includes("@")?"#a855f755":"#1e1e2e"}`,borderRadius:10,padding:"11px 14px",color:"#f1f5f9",fontSize:14,outline:"none",boxSizing:"border-box",transition:"border-color .15s",fontFamily:"inherit" }}
              />
            </div>
            {/* CGU pour anciens comptes */}
            <label style={{ display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:18,padding:"10px 12px",background:"#0a0a14",borderRadius:10,border:"1px solid #1e1e2e" }}>
              <input type="checkbox" checked={emailReqCgu} onChange={e=>setEmailReqCgu(e.target.checked)}
                style={{ marginTop:2,width:16,height:16,accentColor:"#a855f7",flexShrink:0,cursor:"pointer" }}/>
              <span style={{ fontSize:12,color:"#64748b",lineHeight:1.5 }}>
                J'accepte les{" "}
                <span onClick={e=>{e.preventDefault();e.stopPropagation();setShowLegal("cgu");}} style={{ color:"#a855f7",textDecoration:"underline",cursor:"pointer" }}>
                  Conditions d'utilisation
                </span>
                {" "}et la{" "}
                <span onClick={e=>{e.preventDefault();e.stopPropagation();setShowLegal("privacy");}} style={{ color:"#a855f7",textDecoration:"underline",cursor:"pointer" }}>
                  Politique de confidentialité
                </span>
              </span>
            </label>

            {/* Sous-modal CGU / Politique de confidentialité */}
            {showLegal && (
              <div style={{ position:"fixed",inset:0,zIndex:10000,background:"rgba(0,0,0,0.97)",overflowY:"auto",padding:"20px 16px 40px" }}>
                <div style={{ maxWidth:480,margin:"0 auto" }}>
                  {/* Header */}
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,position:"sticky",top:0,background:"rgba(0,0,0,0.97)",paddingTop:4,paddingBottom:12,borderBottom:"1px solid #1e1e2e",zIndex:1 }}>
                    <h2 style={{ fontWeight:900,fontSize:17,color:"#f1f5f9",margin:0 }}>
                      {showLegal==="cgu" ? "Conditions Générales d'Utilisation" : "Politique de Confidentialité"}
                    </h2>
                    <button onClick={()=>setShowLegal(null)} style={{ background:"#1e1e2e",border:"none",borderRadius:8,padding:"6px 10px",color:"#94a3b8",cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:4 }}>
                      <X size={14}/> Fermer
                    </button>
                  </div>

                  {showLegal==="cgu" && (
                    <div style={{ fontSize:13,color:"#94a3b8",lineHeight:1.8 }}>
                      {[
                        ["1. Objet", "Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application DartPoint, éditée par Thomas Siméon. En créant un compte, l'utilisateur accepte sans réserve les présentes CGU."],
                        ["2. Accès au service", "DartPoint est accessible gratuitement à toute personne physique âgée d'au moins 13 ans disposant d'un accès à Internet. L'éditeur se réserve le droit de modifier, suspendre ou interrompre le service à tout moment sans préavis."],
                        ["3. Création de compte", "L'utilisateur s'engage à fournir des informations exactes lors de son inscription (pseudo, email, mot de passe). Il est seul responsable de la confidentialité de ses identifiants. Tout compte créé avec de fausses informations pourra être supprimé."],
                        ["4. Utilisation acceptable", "L'utilisateur s'engage à ne pas :\n• Usurper l'identité d'un autre utilisateur\n• Publier des contenus injurieux, diffamatoires ou illicites\n• Tenter d'accéder aux données d'autres utilisateurs\n• Utiliser l'application à des fins commerciales sans autorisation"],
                        ["5. Contenu utilisateur", "Les données de scores, résultats de matchs et publications restent la propriété de l'utilisateur. En les publiant sur DartPoint, il accorde à l'éditeur une licence d'affichage non exclusive et gratuite."],
                        ["6. Propriété intellectuelle", "Le nom DartPoint, son logo, son design et ses fonctionnalités sont protégés par le droit de la propriété intellectuelle. Toute reproduction sans autorisation est interdite."],
                        ["7. Responsabilité", "L'éditeur ne saurait être tenu responsable des dommages directs ou indirects résultant de l'utilisation ou de l'impossibilité d'utilisation du service. Les données de jeu sont indicatives et peuvent comporter des erreurs."],
                        ["8. Suspension et résiliation", "L'éditeur se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU, sans préavis ni indemnité. L'utilisateur peut demander la suppression de son compte à tout moment."],
                        ["9. Droit applicable", "Les présentes CGU sont soumises au droit français. En cas de litige, les tribunaux français seront seuls compétents.\n\nDernière mise à jour : mai 2026"],
                      ].map(([titre, texte]) => (
                        <div key={titre} style={{ marginBottom:18 }}>
                          <div style={{ fontWeight:800,color:"#e2e8f0",fontSize:14,marginBottom:6 }}>{titre}</div>
                          <div style={{ whiteSpace:"pre-line" }}>{texte}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showLegal==="privacy" && (
                    <div style={{ fontSize:13,color:"#94a3b8",lineHeight:1.8 }}>
                      {[
                        ["Responsable du traitement", "Thomas Siméon\nContact : t.simeon64@gmail.com\nApplication : DartPoint"],
                        ["1. Données collectées", "Dans le cadre de votre inscription et utilisation de DartPoint, nous collectons :\n• Pseudo (obligatoire)\n• Nom et prénom (obligatoire)\n• Adresse e-mail (obligatoire)\n• Ville de résidence (optionnel)\n• Scores et résultats de matchs\n• Association ou club de fléchettes (optionnel)\n• Date d'inscription"],
                        ["2. Finalités du traitement", "Vos données sont utilisées pour :\n• Gérer votre compte et authentification\n• Afficher votre profil et vos statistiques\n• Permettre les défis entre joueurs\n• Envoyer des notifications liées à l'application (si activées)\n• Récupération de mot de passe\n• Améliorer le service"],
                        ["3. Base légale", "Le traitement est fondé sur l'exécution du contrat (CGU acceptées) et votre consentement explicite recueilli lors de l'inscription."],
                        ["4. Durée de conservation", "Vos données sont conservées pendant toute la durée d'activité de votre compte. En cas de suppression du compte, vos données personnelles sont effacées dans un délai de 30 jours."],
                        ["5. Partage des données", "Vos données ne sont jamais vendues ni cédées à des tiers. Elles sont hébergées sur les serveurs de Supabase (Supabase Inc., États-Unis) dans le cadre d'un accord de traitement conforme au RGPD."],
                        ["6. Vos droits (RGPD)", "Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :\n• Droit d'accès à vos données\n• Droit de rectification\n• Droit à l'effacement (droit à l'oubli)\n• Droit à la portabilité\n• Droit d'opposition\n\nPour exercer ces droits, contactez : t.simeon64@gmail.com\nRéponse sous 30 jours."],
                        ["7. Cookies et stockage local", "DartPoint utilise le stockage local (localStorage) de votre navigateur pour maintenir votre session. Aucun cookie publicitaire ou de tracking tiers n'est utilisé."],
                        ["8. Sécurité", "Les mots de passe sont stockés sous forme de hash cryptographique (SHA-256). Aucun mot de passe n'est stocké en clair. L'accès aux données est protégé par des politiques de sécurité (Row Level Security)."],
                        ["9. Contact et réclamation", "Pour toute question relative à vos données : t.simeon64@gmail.com\n\nVous pouvez également adresser une réclamation à la CNIL : www.cnil.fr\n\nDernière mise à jour : mai 2026"],
                      ].map(([titre, texte]) => (
                        <div key={titre} style={{ marginBottom:18 }}>
                          <div style={{ fontWeight:800,color:"#e2e8f0",fontSize:14,marginBottom:6 }}>{titre}</div>
                          <div style={{ whiteSpace:"pre-line" }}>{texte}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={()=>setShowLegal(null)} style={{ width:"100%",background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",border:"none",borderRadius:12,padding:"13px",fontWeight:800,fontSize:15,cursor:"pointer",marginTop:8 }}>
                    ← Retour au formulaire
                  </button>
                </div>
              </div>
            )}
            {/* Erreur */}
            {emailReqErr && (
              <p style={{ color:"#ef4444",fontSize:12,marginBottom:12,display:"flex",alignItems:"center",gap:6 }}>
                <AlertCircle size={13}/> {emailReqErr}
              </p>
            )}
            {/* Bouton valider */}
            <button
              disabled={!emailReqValue.includes("@") || !emailReqCgu || emailReqLoading}
              onClick={async ()=>{
                const email = emailReqValue.trim().toLowerCase();
                if (!email.includes("@") || !email.includes(".")) { setEmailReqErr("Adresse e-mail invalide"); return; }
                if (!emailReqCgu) { setEmailReqErr("Tu dois accepter les conditions d'utilisation"); return; }
                setEmailReqLoading(true); setEmailReqErr("");
                try {
                  await sb(`joueurs?id=eq.${joueur.id}`, {
                    method:"PATCH",
                    body:JSON.stringify({ email, cgu_accepte:true, cgu_date:Date.now() }),
                    prefer:"return=minimal",
                  });
                  const updated = { ...joueur, email, cgu_accepte:true };
                  setJoueur(updated);
                  localStorage.setItem("dp_joueur", JSON.stringify(updated));
                  setShowEmailRequired(false);
                } catch {
                  setEmailReqErr("Erreur lors de la sauvegarde, réessaie.");
                }
                setEmailReqLoading(false);
              }}
              style={{ width:"100%",background:(!emailReqValue.includes("@")||!emailReqCgu)?"#1e1e2e":"linear-gradient(135deg,#7c3aed,#a855f7)",color:(!emailReqValue.includes("@")||!emailReqCgu)?"#475569":"#fff",border:"none",borderRadius:12,padding:"13px",fontWeight:800,fontSize:15,cursor:(!emailReqValue.includes("@")||!emailReqCgu||emailReqLoading)?"default":"pointer",transition:"all .2s",opacity:emailReqLoading?.6:1 }}>
              {emailReqLoading ? "Enregistrement…" : "Valider mon adresse →"}
            </button>
            <p style={{ fontSize:11,color:"#1e293b",textAlign:"center",marginTop:12 }}>
              Ton email ne sera jamais partagé ni vendu.
            </p>
          </div>
        </div>
      )}

      {/* ── Popup déblocage Défi de la Semaine ── */}
      {showDefiHebdoUnlock && (
        <div onClick={()=>setShowDefiHebdoUnlock(false)}
          style={{ position:"fixed",inset:0,zIndex:3000,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20 }}>
          <div onClick={e=>e.stopPropagation()}
            style={{ background:"#0d0d0d",borderRadius:24,padding:28,maxWidth:360,width:"100%",border:"1px solid #f9731644",boxShadow:"0 0 60px rgba(249,115,22,0.25)",textAlign:"center" }}>
            {/* Icône */}
            <div style={{ width:72,height:72,borderRadius:"50%",background:"linear-gradient(135deg,#f97316,#a855f7)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",boxShadow:"0 0 30px rgba(249,115,22,0.5)" }}>
              <Trophy size={32} color="#fff"/>
            </div>
            {/* Titre */}
            <div style={{ fontWeight:900,fontSize:22,marginBottom:8,background:"linear-gradient(90deg,#f97316,#a855f7)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>
              Défi de la Semaine débloqué !
            </div>
            {/* Texte */}
            <p style={{ color:"#cbd5e1",fontSize:14,lineHeight:1.7,marginBottom:24 }}>
              Tu as atteint <strong style={{ color:"#f97316" }}>10 amis</strong> sur DartPoint 🎉<br/>
              Chaque lundi, un adversaire te sera proposé pour maximiser tes gains DRIX. Bats-le pour remporter un <strong style={{ color:"#f97316" }}>gain × 2</strong> et <strong style={{ color:"#a855f7" }}>+25 DRIX</strong> de participation.
            </p>
            {/* Boutons */}
            <div style={{ display:"flex",gap:10 }}>
              <button onClick={()=>{ setShowDefiHebdoUnlock(false); nav("defi"); }}
                style={{ flex:2,background:"linear-gradient(135deg,#f97316,#ea580c)",border:"none",color:"#fff",borderRadius:14,padding:"14px 0",fontSize:14,fontWeight:800,cursor:"pointer",boxShadow:"0 4px 20px rgba(249,115,22,0.4)",display:"flex",alignItems:"center",justifyContent:"center",gap:7 }}>
                <Swords size={15}/> Voir mes défis
              </button>
              <button onClick={()=>setShowDefiHebdoUnlock(false)}
                style={{ flex:1,background:"#1a1a1a",border:`1px solid ${C.border}`,color:C.muted,borderRadius:14,padding:"14px 0",fontSize:13,fontWeight:600,cursor:"pointer" }}>
                Plus tard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Popup défi quotidien Chrono Finish ── */}
      {showChronoPopup && (()=>{
        const fmtMs = (ms)=>{
          const t=Math.floor(ms/100); const d=t%10; const s=Math.floor(t/10)%60; const m=Math.floor(t/600);
          return m>0?`${m}:${String(s).padStart(2,"0")}.${d}s`:`${s}.${d}s`;
        };
        return (
          <div style={{ position:"fixed",inset:0,background:"#000000cc",zIndex:1500,display:"flex",alignItems:"flex-end",justifyContent:"center",padding:"0 16px 80px" }} onClick={()=>setShowChronoPopup(false)}>
            <div onClick={e=>e.stopPropagation()} style={{ background:"linear-gradient(135deg,#1a1030,#0f0f20)",border:"2px solid #a78bfa",borderRadius:24,padding:"28px 24px 24px",maxWidth:400,width:"100%",textAlign:"center",boxShadow:"0 24px 64px #000000bb,0 0 40px #a78bfa33",position:"relative" }}>
              <button onClick={()=>setShowChronoPopup(false)} style={{ position:"absolute",top:12,right:14,background:"none",border:"none",color:"#64748b",fontSize:20,cursor:"pointer",lineHeight:1,padding:4,touchAction:"manipulation" }}>✕</button>
              <div style={{ fontSize:48,marginBottom:10 }}>⏱️</div>
              <div style={{ fontWeight:900,fontSize:20,color:"#a78bfa",marginBottom:8,lineHeight:1.25 }}>
                Tu n'as pas fait<br/>ton défi quotidien !
              </div>
              <div style={{ fontSize:14,color:"#94a3b8",lineHeight:1.65,marginBottom:chronoLeader?16:24 }}>
                Montre à tes amis dartistes que<br/>tu es le meilleur en comptage finish.
              </div>
              {chronoLeader && (
                <div style={{ background:"#ffffff0d",border:"1px solid #f59e0b55",borderRadius:14,padding:"12px 16px",marginBottom:20 }}>
                  <div style={{ fontSize:11,color:"#64748b",marginBottom:8,letterSpacing:1 }}>🏆 RECORD À BATTRE</div>
                  <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                    {chronoLeader.photo
                      ? <img src={chronoLeader.photo} alt="" style={{ width:44,height:44,borderRadius:"50%",objectFit:"cover",border:"2px solid #f59e0b",flexShrink:0 }}/>
                      : <div style={{ width:44,height:44,borderRadius:"50%",background:"#1a1a2e",border:"2px solid #f59e0b",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0 }}>🎯</div>
                    }
                    <div style={{ flex:1,textAlign:"left" }}>
                      <div style={{ fontWeight:800,fontSize:15,color:"#f1f5f9" }}>{chronoLeader.joueur_pseudo}</div>
                      <div style={{ fontSize:11,color:"#64748b",marginTop:1 }}>meilleur temps du jour</div>
                    </div>
                    <div style={{ fontWeight:900,fontSize:20,color:"#f59e0b",fontVariantNumeric:"tabular-nums",flexShrink:0 }}>{fmtMs(chronoLeader.temps_ms)}</div>
                  </div>
                </div>
              )}
              <button onClick={()=>{ setShowChronoPopup(false); nav("chrono-finish"); }}
                style={{ width:"100%",background:"linear-gradient(135deg,#a78bfa,#7c3aed)",color:"#fff",border:"none",borderRadius:14,padding:"16px",fontWeight:900,fontSize:16,cursor:"pointer",touchAction:"manipulation",boxShadow:"0 4px 20px #a78bfa55" }}>
                🎯 Jouer maintenant
              </button>
            </div>
          </div>
        );
      })()}
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
        @keyframes dp-notif-pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.18);} }
        .leaflet-popup-content-wrapper { background:#fff !important; color:#111 !important; }
.leaflet-popup-content { color:#111 !important; -webkit-text-fill-color:#111 !important; }
.leaflet-popup-tip { background:#fff !important; }
      `}</style>
      {/* ── Help modal ── */}
      {helpOpen && HELP_CONTENT[page] && (
        <HelpModal {...HELP_CONTENT[page]} onClose={()=>setHelpOpen(false)}/>
      )}
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
      <Nav page={page} setPage={navSafe} isAdmin={isAdmin} joueur={joueur} setJoueur={setJoueur} defisCount={notifCount} demandesAmisCount={demandesAmisCount} unreadMessages={unreadMessages} newBadgesCount={newBadgesCount} onBadgesSeen={()=>setNewBadgesCount(0)} onBack={goBack} canGoBack={history.length>1} bars={bars} barsActifs={barsActifs} associations={associations} tournois={tournois} setBarSlug={setBarSlug} setAssoSlug={setAssoSlug}/>
      <main style={{ flex:1 }}>
        {page==="home"             && <Home joueur={joueur} setJoueur={setJoueur} defisCount={notifCount} demandesAmisCount={demandesAmisCount} bars={bars} associations={associations} tournois={tournois} setPage={nav} setBarSlug={setBarSlug} setAssoSlug={setAssoSlug} setTournoiSlug={setTournoiSlug} setVilleFilter={setVilleFilter} barsActifs={barsActifs}/>}
        {page==="defi"             && joueur && <PageDefi joueur={joueur} setPage={nav}/>}
        {page==="communaute"       && <PageCommunaute joueur={joueur} setPage={nav} bars={bars}/>}
        {page==="bars"             && <Bars bars={bars} associations={associations} setPage={nav} setBarSlug={setBarSlug} setAssoSlug={setAssoSlug} villeFilter={villeFilter} setVilleFilter={setVilleFilter} barsActifs={barsActifs}/>}
        {page==="bar"              && <BarDetail slug={barSlug} allBars={bars} associations={associations} setBars={setBars} setPage={nav} setAssoSlug={setAssoSlug} isAdmin={isAdmin} joueur={joueur} setJoueurId={setJoueurId}/>}
        {page==="associations"     && <Associations associations={associations} setPage={nav} setAssoSlug={setAssoSlug}/>}
        {page==="asso"             && <AssoDetail slug={assoSlug} associations={associations} setAssociations={setAssociations} bars={bars} setPage={nav} setBarSlug={setBarSlug} isAdmin={isAdmin} joueur={joueur}/>}
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
        {page==="connexion"        && <Connexion onLogin={handleLogin} setPage={nav} associations={associations}/>}
        {page==="inscription"      && <Connexion onLogin={handleLogin} setPage={nav} associations={associations} initMode="register"/>}
        {page==="scoreur"          && <Scoreur setPage={nav}/>}
        {page==="scoreur-libre"    && <ScoreurLibre setPage={nav}/>}
        {page==="jeux"             && <PageModeJeu joueur={joueur} setPage={nav}/>}
        {page==="jeux-flechettes"       && <PageModeJeu joueur={joueur} setPage={nav} initCat="fleche"/>}
        {page==="jeux-sans"             && <PageModeJeu joueur={joueur} setPage={nav} initCat="sans"/>}
        {page==="cricket-config"        && <ConfigCricket joueur={joueur} setPage={nav}/>}
        {page==="jeux-capital"          && <JeuCapital setPage={nav}/>}
        {page==="entrainement-finish"   && <EntrainementFinish setPage={nav} joueur={joueur} setJoueur={setJoueur}/>}
        {page==="chrono-finish"         && <ChronoFinish setPage={nav} joueur={joueur}/>}
        {page==="horloge-double"        && <HorlogeDouble setPage={nav}/>}
        {page==="rush-mode"             && <RushMode setPage={nav} joueur={joueur} setJoueur={setJoueur}/>}
        {page==="tournois-potes"   && <TournoiPotesPage joueur={joueur} setPage={nav}/>}
        {page.startsWith("tournoi-potes-") && <TournoiPotesDetail tournoiId={page.replace("tournoi-potes-","")} joueurConnecte={joueur} setPage={nav}/>}
        {page.startsWith("scoreur-potes-") && <ScoreurPotesWrapper matchId={page.replace("scoreur-potes-","")} joueurConnecte={joueur} setPage={nav}/>}
        {page==="messagerie"       && <MessagesPage joueur={joueur} setPage={nav}/>}
        {page.startsWith("messages-") && (()=>{
          // Nouveau format : "messages-<id>|<encodedPseudo>" (le | est encodé par encodeURIComponent donc safe)
          // Fallback ancien format : "messages-<uuid-v4>-<encodedPseudo>" (5 segments UUID + reste = pseudo)
          const str = page.replace("messages-","");
          let tid, tpseudo;
          if (str.includes("|")) {
            const pipeIdx = str.indexOf("|");
            tid = str.slice(0, pipeIdx);
            tpseudo = decodeURIComponent(str.slice(pipeIdx + 1));
          } else {
            // Ancien format (legacy) — à supprimer dans une prochaine version
            const parts = str.split("-");
            tid = parts.slice(0,5).join("-");
            tpseudo = decodeURIComponent(parts.slice(5).join("-"));
          }
          return <MessagesPage joueur={joueur} setPage={nav} targetId={tid} targetPseudo={tpseudo}/>;
        })()}
        {page.startsWith("scoreur-duel-") && joueur && <ScoreurDuel duelId={page.replace("scoreur-duel-","")} joueur={joueur} setPage={nav}/>}
        {page==="scoreur-doublette"     && joueur && <ScoreurDoublette joueur={joueur} setPage={nav}/>}
        {page==="apropos"          && <APropos bars={bars} setPage={nav}/>}
        {page==="proposer"         && <Proposer bars={bars} onSubmit={handleProposal}/>}
        {page==="proposer-asso"    && <ProposerAsso onSubmit={handleProposalAsso}/>}
        {page==="proposer-tournoi" && <ProposerTournoi onSubmit={handleProposalTournoi} joueur={joueur} onCreated={t=>{setTournois(ts=>[...ts,t]);nav("tournoi-detail");setTournoiSlug(t.slug);}}/>}
        {page==="contact"          && <Contact/>}
      
        {page==="mentions"         && <MentionsLegales/>}
        {page==="adminlogin"       && <AdminLogin onLogin={()=>{setIsAdmin(true);nav("admin");}}/>}
        {page==="admin"            && (isAdmin?<Admin joueur={joueur} bars={bars} setBars={setBars} associations={associations} setAssociations={setAssociations} tournois={tournois} setTournois={setTournois} setPage={nav} setBarSlug={setBarSlug} setAssoSlug={setAssoSlug} setTournoiSlug={setTournoiSlug}/>:<AdminLogin onLogin={()=>{setIsAdmin(true);nav("admin");}}/>)}
      </main>
      <Footer setPage={nav} onOpenHelp={HELP_CONTENT[page] ? ()=>setHelpOpen(true) : null}/>
    </div>
  );
}