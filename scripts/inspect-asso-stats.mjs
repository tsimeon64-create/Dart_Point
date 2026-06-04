// LECTURE SEULE — inspecte stats_joueurs + affiliations asso pour concevoir
// la carte "Joueur de la semaine de l'asso".
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sb = async (p) => {
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
};
(async () => {
  const stats = await sb("stats_joueurs?limit=3&select=*");
  console.log("=== stats_joueurs : colonnes ===");
  console.log(stats[0] ? Object.keys(stats[0]).join(", ") : "(vide)");
  console.log("exemples:", JSON.stringify(stats.slice(0, 2)));

  const joueurs = await sb("joueurs?select=id,pseudo,asso_slug,drix,photo&limit=200");
  const parAsso = {};
  for (const j of joueurs) { const k = j.asso_slug || "(aucune)"; (parAsso[k] ||= []).push(j.pseudo); }
  console.log("\n=== Affiliations asso (slug → nb joueurs) ===");
  for (const [k, v] of Object.entries(parAsso)) console.log(`  ${k} : ${v.length}  [${v.slice(0, 6).join(", ")}${v.length > 6 ? "…" : ""}]`);

  // Pour la plus grosse asso (hors aucune), montrer membres + stats
  const assoSlugs = Object.entries(parAsso).filter(([k]) => k !== "(aucune)").sort((a, b) => b[1].length - a[1].length);
  if (assoSlugs[0]) {
    const slug = assoSlugs[0][0];
    const membres = joueurs.filter((j) => j.asso_slug === slug);
    const ids = membres.map((m) => m.id);
    const allStats = await sb(`stats_joueurs?joueur_id=in.(${ids.join(",")})&select=*`);
    const sById = new Map(allStats.map((s) => [s.joueur_id, s]));
    console.log(`\n=== Asso "${slug}" : ${membres.length} membres ===`);
    for (const m of membres) {
      const s = sById.get(m.id) || {};
      console.log(`  ${(m.pseudo || "").padEnd(18)} drix=${m.drix ?? "—"}  V=${s.victoires ?? "?"} D=${s.defaites ?? "?"} P=${s.parties ?? "?"}  photo=${m.photo ? "oui" : "non"}`);
    }
  }
})().catch((e) => { console.error("ERREUR:", e.message); process.exit(1); });
