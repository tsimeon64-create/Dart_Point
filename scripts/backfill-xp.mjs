// ════════════════════════════════════════════════════════════════════════════
// BACKFILL XP — calcule l'XP historique de CHAQUE joueur et l'écrit en base.
//   • DRY-RUN par défaut (n'écrit RIEN, affiche seulement).
//   • Écriture réelle uniquement avec l'argument  --apply
//   ⚠️ Nécessite que la migration XP soit déjà exécutée (colonnes xp + xp_badges_credited).
//
// XP historique = duels passés (match/défi/gagné/3-0/manches/moyenne/180/140/finish)
//                 + présences (+5) + badges (+100, via réplique de computeBadgeValues).
// Volées 120-139 : non rejouables fidèlement depuis manches_detail → ignorées (mineur).
// ════════════════════════════════════════════════════════════════════════════
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const APPLY = process.argv.includes("--apply");

const sb = async (p, opts = {}) => {
  const { headers: h, ...rest } = opts;
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, {
    ...rest,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(h || {}) },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
};
const fetchAll = async (table, sel) => { const out = []; let off = 0; for (;;) { const pg = await sb(`${table}?select=${sel}&limit=1000&offset=${off}`); out.push(...pg); if (pg.length < 1000) break; off += 1000; } return out; };

// Niveaux (identique à l'app)
const NIVEAUX = [{ n:1, xp:0, t:"Rookie" }, { n:5, xp:500, t:"Régulier" }, { n:10, xp:2000, t:"Habitué" }, { n:20, xp:8000, t:"Vétéran" }, { n:50, xp:50000, t:"Légende" }];
const niveauDe = (xp) => { let c = NIVEAUX[0]; for (const L of NIVEAUX) if (xp >= L.xp) c = L; return c; };

// Seuils badges (identique à ALL_BADGES)
const BADGES = [
  ["nb180",1],["nb180",10],["nb180",50],["nb180",100],["nb100",100],["nb140",50],["nb140",100],
  ["plusGrosFinish>=170",1],["nbFinishes100",10],["nbFinishes100",50],["hasSixSevenFinish",1],
  ["parties",1],["victoires",1],["victoires",10],["victoires",50],["victoires",100],
  ["meilleureSerieW",3],["meilleureSerieW",5],["meilleureSerieW",10],["hasGiantKill",1],
  ["parties",10],["parties",50],["parties",100],["parties",500],
  ["nb26",10],["nb26",50],["nb26",100],["nb26",500],
  ["maxDrix>=1200",1],["maxDrix>=1500",1],["maxDrix>=2000",1],
  ["nbAmis",1],["nbAmis",5],["nbAmis",10],["nbAmis",20],["nbTournois",1],["nbTournoisGagnes",1],
  ["streakJours",7],["streakJours",30],["streakJours",100],
  ["nbDoublettes",1],["nbWinsDoublette",10],["nbWinsDoublette",50],
];
const badgeVal = (key, v) => {
  if (key.includes(">=")) { const [f, n] = key.split(">="); return (v[f] || 0) >= Number(n) ? 1 : 0; }
  if (key.startsWith("has")) return v[key] ? 1 : 0;
  return v[key] || 0;
};
const compteBadges = (v) => BADGES.filter(([k, s]) => badgeVal(k, v) >= s).length;

(async () => {
  console.log(`Mode : ${APPLY ? "⚠️  ÉCRITURE (--apply)" : "DRY-RUN (lecture seule)"}\n`);
  const joueurs = await sb("joueurs?select=id,pseudo,drix,xp,xp_badges_credited&limit=2000");
  const duels = await fetchAll("duels", "id,challenger_id,defie_id,challenger_pseudo,defie_pseudo,gagnant_id,statut,type,date,score_manches_challenger,score_manches_defie,score_challenger,score_defie,manches_detail");
  const mvts = await fetchAll("drix_mouvements", "joueur_id,drix_apres,variation,resultat");
  const stats = await fetchAll("stats_joueurs", "joueur_id,victoires,parties");
  const amis = await fetchAll("amis", "joueur_id,ami_id,statut");
  const presences = await fetchAll("presences", "joueur_id");
  let tournois = []; try { tournois = await fetchAll("tournois_potes", "gagnant_id"); } catch {}

  const termines = duels.filter(d => d.statut === "termine");
  const byId = (arr, k) => { const m = new Map(); for (const x of arr) { const id = x[k]; if (!m.has(id)) m.set(id, []); m.get(id).push(x); } return m; };
  const mvtsBy = byId(mvts, "joueur_id");
  const presBy = byId(presences, "joueur_id");
  const statsBy = new Map(stats.map(s => [s.joueur_id, s]));
  const winsTrnBy = byId(tournois.filter(t => t.gagnant_id), "gagnant_id");

  const moyXP = (m) => m >= 90 ? 75 : m >= 70 ? 40 : m >= 50 ? 20 : 0;

  const rows = [];
  for (const j of joueurs) {
    const pid = j.id;
    const mesDuels = termines.filter(d => d.challenger_id === pid || d.defie_id === pid);
    if (mesDuels.length === 0 && (presBy.get(pid)?.length || 0) === 0) { rows.push({ pseudo: j.pseudo, xp: 0, niveau: 1, badges: 0, duels: 0, skip: true }); continue; }

    let duelXP = 0;
    // agrégats badges
    let nb180 = 0, nb140 = 0, nb100 = 0, nb26 = 0, nbFinishes100 = 0, plusGrosFinish = 0, hasSixSevenFinish = false;
    for (const d of mesDuels) {
      const isCh = d.challenger_id === pid;
      const myManches = (isCh ? d.score_manches_challenger : d.score_manches_defie) || 0;
      const advManches = (isCh ? d.score_manches_defie : d.score_manches_challenger) || 0;
      const won = d.gagnant_id === pid;
      duelXP += 25 + 15;                       // match joué + défi accepté
      if (won) duelXP += 100;                  // gagné
      if (won && myManches >= 3 && advManches === 0) duelXP += 100; // 3-0
      duelXP += myManches * 25;                // manches gagnées
      const moy = parseFloat(isCh ? d.score_challenger : d.score_defie);
      if (!isNaN(moy)) duelXP += moyXP(moy);   // moyenne (palier max)
      // volées/finishes + agrégats badges depuis manches_detail
      const myPseudo = isCh ? (d.challenger_pseudo || j.pseudo) : (d.defie_pseudo || j.pseudo);
      for (const m of (d.manches_detail || [])) {
        const isW = m.winner === myPseudo || m.winner === j.pseudo;
        const n180 = isW ? (m.winner_180 || 0) : (m.loser_180 || 0);
        const n140 = isW ? (m.winner_140plus || 0) : (m.loser_140plus || 0);
        duelXP += n180 * 180 + n140 * 20;      // 180 +180, 140-179 +20 (120-139 ignoré)
        nb180 += n180; nb140 += n140;
        nb100 += isW ? (m.winner_100plus || 0) : (m.loser_100plus || 0);
        nb26 += isW ? (m.winner_26 || 0) : (m.loser_26 || 0);
        if (isW) {
          const fin = m.winner_finish || 0;
          if (fin >= 120) duelXP += 30;        // finish ≥120
          if (fin >= 100) nbFinishes100++;
          if (fin > plusGrosFinish) plusGrosFinish = fin;
          if (fin === 67) hasSixSevenFinish = true;
        }
      }
    }
    const presXP = (presBy.get(pid)?.length || 0) * 5;

    // badges (réplique computeBadgeValues)
    const st = statsBy.get(pid) || {};
    const chron = [...mesDuels].sort((a, b) => (a.date || 0) - (b.date || 0));
    let serieW = 0, tmp = 0; for (const d of chron) { if (d.gagnant_id === pid) { tmp++; serieW = Math.max(serieW, tmp); } else tmp = 0; }
    const myMvts = mvtsBy.get(pid) || [];
    const maxDrix = Math.max(j.drix || 1000, ...myMvts.map(m => m.drix_apres || 0));
    const hasGiantKill = myMvts.some(m => m.resultat === "victoire" && (m.variation || 0) >= 24);
    // streak jours
    let streakJours = 0;
    if (mesDuels.length) {
      const days = [...new Set(mesDuels.map(d => new Date(d.date || 0).toDateString()))].map(s => new Date(s)).sort((a, b) => a - b);
      let curr = 1, best = 1;
      for (let i = 1; i < days.length; i++) { const diff = (days[i] - days[i - 1]) / 86400000; if (diff <= 1) { curr++; best = Math.max(best, curr); } else curr = 1; }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      streakJours = (today - days[days.length - 1]) / 86400000 <= 1 ? curr : 0;
    }
    const nbAmis = amis.filter(a => (a.joueur_id === pid || a.ami_id === pid) && a.statut === "accepte").length;
    const vals = {
      nb180, nb140, nb100, nb26, nbFinishes100, plusGrosFinish, hasSixSevenFinish,
      victoires: st.victoires || 0, parties: st.parties || 0, meilleureSerieW: serieW, maxDrix, streakJours,
      nbAmis, nbTournois: (winsTrnBy.get(pid)?.length || 0), nbTournoisGagnes: (winsTrnBy.get(pid)?.length || 0),
      nbDoublettes: 0, nbWinsDoublette: 0, hasGiantKill,
    };
    const badges = compteBadges(vals);
    const xp = duelXP + presXP + badges * 100;
    rows.push({ id: pid, pseudo: j.pseudo, xp, niveau: niveauDe(xp).n, titre: niveauDe(xp).t, badges, duels: mesDuels.length, duelXP, presXP, oldXp: j.xp });
  }

  rows.sort((a, b) => b.xp - a.xp);
  console.log("Joueur".padEnd(20), "XP".padStart(7), "Niv".padStart(4), "Titre".padEnd(10), "Bdg".padStart(4), "Duels".padStart(6));
  console.log("─".repeat(60));
  for (const r of rows) console.log(String(r.pseudo).slice(0, 20).padEnd(20), String(r.xp).padStart(7), String(r.niveau).padStart(4), (r.titre || "—").padEnd(10), String(r.badges).padStart(4), String(r.duels).padStart(6));
  console.log("─".repeat(60));
  console.log(`Total joueurs: ${rows.length} | XP moyen: ${Math.round(rows.reduce((s, r) => s + r.xp, 0) / rows.length)}`);

  if (APPLY) {
    console.log("\n⚠️  Écriture en base…");
    let ok = 0;
    for (const r of rows) {
      if (r.skip) continue;
      try {
        // NB : on n'écrit PAS `niveau` (= niveau de jeu auto-déclaré à l'inscription).
        // Le niveau XP est dérivé de `xp` à l'affichage (getNiveauXP), jamais stocké.
        await sb(`joueurs?id=eq.${r.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ xp: r.xp, xp_badges_credited: r.badges }) });
        ok++;
      } catch (e) { console.error(`  ✗ ${r.pseudo}: ${e.message}`); }
    }
    console.log(`✅ ${ok}/${rows.filter(r => !r.skip).length} joueurs mis à jour.`);
  } else {
    console.log("\nDRY-RUN : rien écrit. Relance avec  --apply  pour appliquer (après la migration SQL).");
  }
})().catch(e => { console.error("ERREUR:", e.message); process.exit(1); });
