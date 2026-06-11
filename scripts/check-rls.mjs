// LECTURE SEULE — confirme si la clé anon publique expose des données sensibles.
// N'affiche AUCUNE donnée réelle (ni hash, ni email, ni message) — juste exposé: oui/non.
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const h = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
const get = async (p) => { const r = await fetch(`${SB_URL}/rest/v1/${p}`, { headers: h }); return { status: r.status, body: await r.json().catch(() => null) }; };

// 1) password_hash + email exposés sur joueurs ?
const j = await get("joueurs?select=pseudo,password_hash,email,nom,prenom&limit=3");
const row = Array.isArray(j.body) ? j.body[0] : null;
console.log("joueurs?select=password_hash,email,nom,prenom :", j.status);
console.log("  -> password_hash exposé :", !!row && "password_hash" in row && row.password_hash != null);
console.log("  -> email exposé         :", !!row && "email" in row && row.email != null);
console.log("  -> nom/prenom exposés   :", !!row && ("nom" in row || "prenom" in row));
console.log("  -> nb de lignes lisibles d'un coup :", Array.isArray(j.body) ? j.body.length : "—");

// 2) messages privés lisibles SANS filtre expéditeur/destinataire ?
const m = await get("messages?select=id,from_pseudo,to_pseudo,contenu&limit=3");
console.log("\nmessages?select=* SANS filtre :", m.status);
console.log("  -> messages privés lisibles par anon :", Array.isArray(m.body) && m.body.length > 0);

// 3) combien de comptes lisibles en une requête (PII de masse) ?
const count = await fetch(`${SB_URL}/rest/v1/joueurs?select=id`, { headers: { ...h, Prefer: "count=exact", Range: "0-0" } });
console.log("\nNb total de comptes joueurs lisibles par anon :", count.headers.get("content-range"));
