// DIAGNOSTIC — la fonction `auth` arrive-t-elle à ÉCRIRE (service-role) un hash PBKDF2 ?
// Crée un compte via l'action register, relit le hash, vérifie le format, supprime.
const SB = "https://secuyejzngzhnnuweuwm.supabase.co";
const K  = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };
const rest = (p, o = {}) => { const { headers, ...rest } = o; return fetch(`${SB}/rest/v1/${p}`, { ...rest, headers: { ...H, ...(headers || {}) } }); };
const fn = (body) => fetch(`${SB}/functions/v1/auth`, { method: "POST", headers: H, body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) }));

const pseudo = "zzz_reg_" + Date.now();
const pwd = "Probe-" + Math.random().toString(36).slice(2, 9);
let toDelete = pseudo;

try {
  const reg = await fn({ action: "register", pseudo, password: pwd, profil: { prenom: "Test", nom: "Probe" } });
  console.log("1) register → status", reg.status, "| ok:", reg.body?.ok, "| id:", reg.body?.joueur?.id ? "présent" : "ABSENT", "| erreur:", reg.body?.error || "—");

  const after = await rest(`joueurs?pseudo=eq.${encodeURIComponent(pseudo)}&select=password_hash`).then(r => r.json());
  const h = after?.[0]?.password_hash || "(rien)";
  console.log("2) Hash écrit en base:", h.slice(0, 16) + "…", "→ format PBKDF2 ?", /^pbkdf2\$/.test(h));

  const login = await fn({ action: "login", pseudo, password: pwd });
  console.log("3) Login sur ce compte PBKDF2 → status", login.status, "| ok:", login.body?.ok);
} finally {
  const del = await rest(`joueurs?pseudo=eq.${encodeURIComponent(toDelete)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  console.log("\n🧹 Compte test supprimé:", del.status === 204 || del.ok ? "OK" : "ÉCHEC " + del.status);
}
