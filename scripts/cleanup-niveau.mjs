// ════════════════════════════════════════════════════════════════════════════
// CLEANUP `niveau` — répare le champ "niveau de jeu" (auto-déclaré à l'inscription)
// que le 1er backfill XP avait écrasé avec des nombres (1/5/10/20/50).
// Le niveau XP est désormais dérivé de `xp` (jamais stocké) → on remet `niveau`
// à NULL partout où ce n'est pas une valeur de skill valide.
//   DRY-RUN par défaut · écriture avec  --apply
// ════════════════════════════════════════════════════════════════════════════
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const APPLY = process.argv.includes("--apply");
const sb = async (p, opts = {}) => {
  const { headers: h, ...rest } = opts;
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, { ...rest, headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", ...(h || {}) } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const t = await r.text(); return t ? JSON.parse(t) : null;
};

const VALID = new Set(["debutant", "intermediaire", "confirme", "expert"]);
(async () => {
  console.log(`Mode : ${APPLY ? "⚠️ ÉCRITURE (--apply)" : "DRY-RUN"}\n`);
  const joueurs = await sb("joueurs?select=id,pseudo,niveau&limit=2000");
  const bad = joueurs.filter(j => j.niveau != null && !VALID.has(String(j.niveau).toLowerCase()));
  console.log(`Joueurs avec un 'niveau' à nettoyer (valeur non-skill) : ${bad.length}`);
  for (const j of bad) console.log(`  ${(j.pseudo||"").padEnd(20)} niveau="${j.niveau}" → null`);
  const conserves = joueurs.filter(j => j.niveau != null && VALID.has(String(j.niveau).toLowerCase()));
  console.log(`\nNiveaux de skill valides conservés : ${conserves.length}`);
  for (const j of conserves) console.log(`  ${(j.pseudo||"").padEnd(20)} niveau="${j.niveau}" (conservé)`);

  if (APPLY) {
    let ok = 0;
    for (const j of bad) {
      try { await sb(`joueurs?id=eq.${j.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ niveau: null }) }); ok++; }
      catch (e) { console.error(`  ✗ ${j.pseudo}: ${e.message}`); }
    }
    console.log(`\n✅ ${ok}/${bad.length} remis à null.`);
  } else {
    console.log("\nDRY-RUN : rien écrit. Relance avec  --apply  pour nettoyer.");
  }
})().catch(e => { console.error("ERREUR:", e.message); process.exit(1); });
