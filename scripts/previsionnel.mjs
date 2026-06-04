// ════════════════════════════════════════════════════════════════════════════
// PRÉVISIONNEL « Double Progression » — LECTURE SEULE (n'écrit rien)
//   • DRIX = ELO PUR rejoué depuis 1000 (aucun bonus perf, pas de +50 rivalité,
//     amical = 0). Plancher 100.
//   • XP = reconstruit depuis la base (ce qui existe réellement).
// ⚠️ Volées 180/140-179 & finishes ≥120 NE SONT PAS stockés (manches_detail null)
//    → l'XP affiché est un PLANCHER. Idem badges scoring/finish/anti-26/social.
// ════════════════════════════════════════════════════════════════════════════
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sb = async (p) => { const r = await fetch(`${SB_URL}/rest/v1/${p}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); };
const round = Math.round;

// Barème XP (spec utilisateur)
const XP = { match: 25, manche: 10, defi: 15, presence: 5, badge: 100,
             v180: 50, v140: 20, finish: 30 }; // v180/v140/finish = NON reconstituables
// Paliers de niveau
const LEVELS = [ { lvl:1, xp:0, t:"Rookie" }, { lvl:5, xp:500, t:"Régulier" }, { lvl:10, xp:2000, t:"Habitué" }, { lvl:20, xp:8000, t:"Vétéran" }, { lvl:50, xp:50000, t:"Légende" } ];
const niveauDe = (xp) => { let cur = LEVELS[0]; for (const L of LEVELS) if (xp >= L.xp) cur = L; return cur; };

const joueurs = await sb("joueurs?select=id,pseudo,drix&limit=2000");
const nameOf = new Map(joueurs.map(j => [j.id, j.pseudo]));
const drixActuel = new Map(joueurs.map(j => [j.id, j.drix ?? 1000]));

// Tous les duels terminés, ordre chronologique
const duels = await sb("duels?statut=eq.termine&select=challenger_id,defie_id,gagnant_id,manches,type,date,score_manches_challenger,score_manches_defie&order=date.asc&limit=2000");

// Présences (XP +5)
const presences = await sb("presences?select=joueur_id&limit=5000");
const presCount = new Map(); for (const p of presences) presCount.set(p.joueur_id, (presCount.get(p.joueur_id)||0)+1);

// État par joueur
const S = new Map();
const get = (id) => { if (!S.has(id)) S.set(id, { elo:1000, eloMax:1000, matches:0, manches:0, victoires:0, streak:0, maxStreak:0, giant:false }); return S.get(id); };

let amicaux = 0, typeCounts = {};
for (const d of duels) {
  typeCounts[d.type||"(normal)"] = (typeCounts[d.type||"(normal)"]||0)+1;
  const A = get(d.challenger_id), B = get(d.defie_id);
  const smA = d.score_manches_challenger||0, smB = d.score_manches_defie||0;
  const Cwins = d.gagnant_id === d.challenger_id;
  const isAmical = d.type === "amical";

  // ── XP & badges (tous duels terminés) ──
  A.matches++; B.matches++;
  A.manches += smA; B.manches += smB;
  if (Cwins) { A.victoires++; A.streak++; A.maxStreak=Math.max(A.maxStreak,A.streak); B.streak=0; }
  else       { B.victoires++; B.streak++; B.maxStreak=Math.max(B.maxStreak,B.streak); A.streak=0; }

  // ── ELO pur (hors amical) ──
  if (isAmical) { amicaux++; }
  else {
    const K = 32 * Math.max(1, d.manches||1);
    const EA = 1/(1+Math.pow(10,(B.elo-A.elo)/400)); const EB = 1-EA;
    // giant kill : le vainqueur battait un adversaire +200 ELO (avant match)
    if (Cwins && (B.elo - A.elo) >= 200) A.giant = true;
    if (!Cwins && (A.elo - B.elo) >= 200) B.giant = true;
    const dC = Cwins ? round(K*EB) : -round(K*EA);
    const dD = Cwins ? -round(K*EB) : round(K*EA);
    A.elo = Math.max(100, A.elo + dC); B.elo = Math.max(100, B.elo + dD);
    A.eloMax = Math.max(A.eloMax, A.elo); B.eloMax = Math.max(B.eloMax, B.elo);
  }
}

// Badges reconstituables (victoires / parties / DRIX-pur / série / giant)
const badgesCalc = (s) => {
  let n = 0;
  if (s.matches>=1) n++;                                   // d_first
  [1,10,50,100].forEach(t => { if (s.victoires>=t) n++; }); // d_win*
  [3,5,10].forEach(t => { if (s.maxStreak>=t) n++; });      // d_serie*
  if (s.giant) n++;                                         // d_giant
  [10,50,100,500].forEach(t => { if (s.matches>=t) n++; }); // p_*
  [1200,1500,2000].forEach(t => { if (s.eloMax>=t) n++; }); // dr_* (sur ELO pur)
  return n;
};

const rows = [...S.entries()].map(([id, s]) => {
  const pres = presCount.get(id)||0;
  const nBadges = badgesCalc(s);
  const xpCore = s.matches*XP.match + s.manches*XP.manche + s.matches*XP.defi + pres*XP.presence;
  const xpBadges = nBadges*XP.badge;
  const xpTotal = xpCore + xpBadges;
  return { id, pseudo: nameOf.get(id)||id.slice(0,8), elo: s.elo, eloMax: s.eloMax,
           drixAct: drixActuel.get(id)??1000, matches: s.matches, manches: s.manches,
           victoires: s.victoires, badges: nBadges, xpCore, xpBadges, xpTotal,
           niv: niveauDe(xpTotal) };
});

// Classement par ELO pur
rows.sort((a,b) => b.elo - a.elo);
const rangActuel = [...rows].sort((a,b)=>b.drixAct-a.drixAct).reduce((m,r,i)=>(m.set(r.id,i+1),m),new Map());

console.log("════════ PRÉVISIONNEL DOUBLE PROGRESSION — ELO pur + XP plancher ════════");
console.log(`Joueurs actifs (≥1 duel) : ${rows.length} | Duels terminés : ${duels.length} (dont amicaux: ${amicaux}) | Présences totales : ${presences.length}`);
console.log(`Types de duels : ${JSON.stringify(typeCounts)}`);
console.log("");
console.log(
  "#".padStart(3), "Joueur".padEnd(18),
  "ELOpur".padStart(7), "(act.)".padStart(7), "rang→".padStart(6),
  "Mtch".padStart(5), "ManG".padStart(5), "Bdg".padStart(4),
  "XP".padStart(7), "Niv".padStart(4), "Titre".padEnd(10)
);
console.log("─".repeat(92));
rows.forEach((r, i) => {
  const ra = rangActuel.get(r.id);
  const delta = ra - (i+1); // + = monte au classement ELO pur
  const arrow = delta>0?`+${delta}`:delta<0?`${delta}`:"=";
  console.log(
    String(i+1).padStart(3), String(r.pseudo).slice(0,18).padEnd(18),
    String(r.elo).padStart(7), String(r.drixAct).padStart(7), String(arrow).padStart(6),
    String(r.matches).padStart(5), String(r.manches).padStart(5), String(r.badges).padStart(4),
    String(r.xpTotal).padStart(7), String(r.niv.lvl).padStart(4), r.niv.t.padEnd(10)
  );
});
console.log("─".repeat(92));

// Répartition par titre
const parTitre = {};
rows.forEach(r => { parTitre[r.niv.t] = (parTitre[r.niv.t]||0)+1; });
console.log("\nRépartition par titre (XP plancher) :");
for (const L of LEVELS) if (parTitre[L.t]) console.log(`  ${L.t.padEnd(10)} (≥${L.xp} XP) : ${parTitre[L.t]} joueur(s)`);

// Top XP
const topXp = [...rows].sort((a,b)=>b.xpTotal-a.xpTotal).slice(0,5);
console.log("\nTop 5 XP :");
topXp.forEach((r,i)=>console.log(`  ${i+1}. ${r.pseudo.padEnd(18)} ${r.xpTotal} XP  (${r.matches} matchs, ${r.manches} manches gagnées, ${r.badges} badges) → Niv ${r.niv.lvl} ${r.niv.t}`));

// Moyennes
const moy = (f) => Math.round(rows.reduce((s,r)=>s+f(r),0)/rows.length);
console.log("\nMoyennes : ", `XP=${moy(r=>r.xpTotal)} | matchs=${moy(r=>r.matches)} | manches gagnées=${moy(r=>r.manches)} | badges=${moy(r=>r.badges)} | ELO pur=${moy(r=>r.elo)}`);
console.log("\n⚠️ XP = PLANCHER : n'inclut PAS les volées 180/140-179 (+50/+20) ni les finishes ≥120 (+30),");
console.log("   ni les badges scoring/finish/anti-26/social/streak/doublette — données non stockées en base.");
console.log("   Ces sources domineraient l'XP réel et seront comptabilisées à partir de leur mise en place.");
