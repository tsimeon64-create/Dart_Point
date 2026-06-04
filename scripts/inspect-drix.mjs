// LECTURE SEULE — inspection pour choisir la méthode de calcul exact.
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sb = async (p) => {
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
};
const fetchAll = async (table, sel, order = "") => {
  const out = []; let off = 0;
  for (;;) { const pg = await sb(`${table}?select=${sel}${order}&limit=1000&offset=${off}`); out.push(...pg); if (pg.length < 1000) break; off += 1000; }
  return out;
};

(async () => {
  // 1) Structure d'un duel terminé
  const sample = await sb("duels?statut=eq.termine&limit=3&select=*");
  console.log("=== STRUCTURE DUEL (clés) ===");
  if (sample[0]) {
    console.log("Colonnes:", Object.keys(sample[0]).join(", "));
    console.log("\nExemple manches_detail:", JSON.stringify(sample[0].manches_detail)?.slice(0, 600));
    // chercher un champ contenant les volées
    for (const k of Object.keys(sample[0])) {
      const v = sample[0][k];
      if (Array.isArray(v) || (typeof v === "string" && v.startsWith("["))) console.log(`  champ tableau: ${k} =`, JSON.stringify(v).slice(0, 200));
    }
  }

  // 2) Catégoriser les duels à 1 mouvement
  const mvts = await fetchAll("drix_mouvements", "id,joueur_id,joueur_pseudo,adversaire_pseudo,variation,drix_avant,drix_apres,resultat,duel_id,date", "&order=date.asc");
  const duels = await fetchAll("duels", "id,challenger_id,defie_id,gagnant_id,manches,type,statut");
  const duelById = new Map(duels.map((d) => [d.id, d]));
  const byDuel = new Map();
  for (const m of mvts) { if (!m.duel_id) continue; (byDuel.get(m.duel_id) || byDuel.set(m.duel_id, []).get(m.duel_id)).push(m); }
  const single = [...byDuel.entries()].filter(([, ms]) => ms.length === 1);
  console.log(`\n=== DUELS À 1 MOUVEMENT: ${single.length} ===`);
  let duelExiste = 0, duelAbsent = 0;
  const exemples = [];
  for (const [did, ms] of single) {
    const d = duelById.get(did);
    if (d) duelExiste++; else duelAbsent++;
    if (exemples.length < 8) exemples.push({ pseudo: ms[0].joueur_pseudo, adv: ms[0].adversaire_pseudo, var: ms[0].variation, res: ms[0].resultat, duelOK: !!d, type: d?.type });
  }
  console.log(`  duel record existe: ${duelExiste} | absent: ${duelAbsent}`);
  console.table(exemples);

  // 3) Anomalies : Beub / GIZMO / RV ST31 — détail par duel
  const cibles = ["Beub", "GIZMO", "RV ST31"];
  for (const pseudo of cibles) {
    console.log(`\n=== ${pseudo} : duels (variation vs ELO recalculé) ===`);
    const jm = mvts.filter((m) => m.joueur_pseudo === pseudo && m.duel_id && byDuel.get(m.duel_id)?.length === 2);
    const lignes = [];
    for (const m of jm) {
      const d = duelById.get(m.duel_id); if (!d) continue;
      const pair = byDuel.get(m.duel_id);
      const opp = pair.find((x) => x.joueur_id !== m.joueur_id); if (!opp) continue;
      const meChall = d.challenger_id === m.joueur_id;
      const drixMe = m.drix_avant ?? 1000, drixOpp = opp.drix_avant ?? 1000;
      const K = 32 * Math.max(1, d.manches || 1);
      const isRiv = d.type === "rivalite" || /Rivalit/.test(m.adversaire_pseudo || "");
      // EA = P(challenger gagne)
      const drixC = meChall ? drixMe : drixOpp, drixD = meChall ? drixOpp : drixMe;
      const EA = 1 / (1 + Math.pow(10, (drixD - drixC) / 400)); const EB = 1 - EA;
      const iWon = m.resultat === "victoire";
      let elo;
      if (isRiv) elo = iWon ? 50 : 0;
      else if (meChall) elo = iWon ? Math.round(K * EB) : -Math.round(K * EA);
      else elo = iWon ? Math.round(K * EA) : -Math.round(K * EB);
      lignes.push({ var: m.variation, elo, bonus: m.variation - elo, manches: d.manches, type: d.type || "classe", res: m.resultat, adv: (m.adversaire_pseudo || "").slice(0, 14) });
    }
    console.table(lignes);
  }
})().catch((e) => { console.error("ERREUR:", e.message); process.exit(1); });
