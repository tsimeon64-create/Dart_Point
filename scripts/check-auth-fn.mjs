// LECTURE SEULE — teste l'Edge Function `auth` (aucune écriture).
// Confirme : (1) la fonction est joignable (pas bloquée par verify_jwt),
//            (2) le module a démarré (import bcrypt OK), (3) la lecture service-role marche.
const SB = "https://secuyejzngzhnnuweuwm.supabase.co";
const K  = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";

const call = async (body) => {
  const r = await fetch(`${SB}/functions/v1/auth`, {
    method: "POST",
    headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: r.status, body: parsed };
};

console.log("1) login pseudo INEXISTANT — attendu 401 { error: 'Pseudo ou mot de passe incorrect' } :");
console.log("   ", JSON.stringify(await call({ action: "login", pseudo: "___zzz_probe_inexistant___", password: "x" })));

console.log("\n2) action inconnue — attendu 400 { error: 'action inconnue' } :");
console.log("   ", JSON.stringify(await call({ action: "zzz" })));

console.log("\n3) login sans champs — attendu 400 { error: 'Pseudo et mot de passe requis' } :");
console.log("   ", JSON.stringify(await call({ action: "login" })));

console.log("\n→ Si tu vois mes messages (le champ 'error' avec MON texte), la fonction marche.");
console.log("→ Si tu vois plutôt 'Invalid JWT' / 'Missing authorization', c'est verify_jwt qui bloque.");
