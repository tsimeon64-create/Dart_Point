// LECTURE SEULE — inspecte les données dispo pour bâtir le prévisionnel XP.
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sb = async (p) => { const r = await fetch(`${SB_URL}/rest/v1/${p}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); };
const cols = (rows) => rows[0] ? Object.keys(rows[0]).join(", ") : "(vide)";

const joueurs = await sb("joueurs?select=*&limit=1");
console.log("JOUEURS colonnes :", cols(joueurs));
console.log("  a xp ?", Object.keys(joueurs[0]||{}).includes("xp"), "| a niveau ?", Object.keys(joueurs[0]||{}).includes("niveau"));

const duels = await sb("duels?select=*&statut=eq.termine&limit=2&order=date.desc");
console.log("\nDUELS colonnes :", cols(duels));
console.log("  exemple:", JSON.stringify(duels[0]||{}, null, 0).slice(0, 500));

const pres = await sb("presences?select=*&limit=2");
console.log("\nPRESENCES colonnes :", cols(pres));

const stats = await sb("stats_joueurs?select=*&limit=2");
console.log("\nSTATS_JOUEURS colonnes :", cols(stats), "| ex:", JSON.stringify(stats[0]||{}));

// distribution DRIX + valeur de départ probable
const allDrix = await sb("joueurs?select=pseudo,drix&order=drix.asc&limit=500");
const vals = allDrix.map(j => j.drix).filter(x => x != null);
console.log("\nDRIX : n=", vals.length, "min=", Math.min(...vals), "max=", Math.max(...vals));
const at1000 = vals.filter(v => v === 1000).length;
console.log("  joueurs exactement à 1000 (départ probable) :", at1000);

// counts globaux
const headCount = async (table, filter="") => {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?select=id${filter?("&"+filter):""}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Prefer: "count=exact", Range: "0-0" } });
  return r.headers.get("content-range");
};
console.log("\nVolumes (content-range) :");
console.log("  duels termine :", await headCount("duels", "statut=eq.termine"));
console.log("  duels total   :", await headCount("duels"));
console.log("  presences     :", await headCount("presences"));
console.log("  drix_mouvements:", await headCount("drix_mouvements"));
