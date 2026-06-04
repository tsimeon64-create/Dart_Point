const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sb = async (p) => (await fetch(`${SB_URL}/rest/v1/${p}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } })).json();
const rows = await sb("live_sessions?statut=eq.en_cours&select=id,debut,statut,joueur1_pseudo,joueur2_pseudo,mode&order=debut.desc");
const now = Date.now();
console.log(`Sessions en_cours : ${rows.length}`);
for (const r of rows) {
  const ageH = r.debut ? ((now - r.debut) / 3600000).toFixed(1) : "?";
  console.log(`  ${r.joueur1_pseudo} vs ${r.joueur2_pseudo} | mode=${r.mode} | debut=${r.debut} (${typeof r.debut}) | âge=${ageH}h`);
}
