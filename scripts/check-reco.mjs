const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sb = async (p) => (await fetch(`${SB_URL}/rest/v1/${p}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } })).json();
const j = await sb("joueurs?select=id&limit=1");
const id = j?.[0]?.id;
console.log("joueurs.id exemple :", JSON.stringify(id), "| type js:", typeof id, "| ressemble uuid:", typeof id === "string" && /[0-9a-f]{8}-/.test(id));
