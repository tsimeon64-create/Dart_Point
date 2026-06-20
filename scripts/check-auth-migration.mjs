// TEST du scénario réel : un compte avec ancien hash SHA-256 doit (1) se connecter via la
// fonction `auth`, (2) voir son mot de passe migré en bcrypt automatiquement. Compte JETABLE,
// supprimé à la fin (même en cas d'erreur).
import crypto from "node:crypto";
const SB = "https://secuyejzngzhnnuweuwm.supabase.co";
const K  = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const rest = (p, o = {}) => { const { headers, ...rest } = o; return fetch(`${SB}/rest/v1/${p}`, { ...rest, headers: { ...H, ...(headers || {}) } }); };
const fn = (body) => fetch(`${SB}/functions/v1/auth`, { method: "POST", headers: H, body: JSON.stringify(body) }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) }));

const pseudo = "zzz_probe_" + Date.now();
const pwd = "Probe-" + Math.random().toString(36).slice(2, 9);
let created = false;

try {
  // 1) créer un compte jetable avec un ANCIEN hash SHA-256 (comme les comptes actuels)
  const ins = await rest("joueurs?select=id,password_hash", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ pseudo, password_hash: sha256(pwd) }) });
  const insRows = await ins.json().catch(() => null);
  if (!ins.ok || !insRows?.[0]?.id) { console.log("❌ Insert compte test échoué:", ins.status, JSON.stringify(insRows)); throw new Error("insert"); }
  created = true;
  console.log("1) Compte test créé avec hash SHA-256:", insRows[0].password_hash.slice(0, 18) + "…");

  // 2) bon mot de passe → doit réussir
  const okLogin = await fn({ action: "login", pseudo, password: pwd });
  console.log("2) Login BON mot de passe → status", okLogin.status, "| ok:", okLogin.body?.ok, "| hash renvoyé au client ?", "password_hash" in (okLogin.body?.joueur || {}));

  // 3) le hash en base doit maintenant être bcrypt ($2...)
  const after = await rest(`joueurs?pseudo=eq.${encodeURIComponent(pseudo)}&select=password_hash`).then(r => r.json());
  const h2 = after?.[0]?.password_hash || "";
  console.log("3) Hash en base APRÈS login:", h2.slice(0, 7) + "…", "→ migré en bcrypt ?", /^\$2[aby]\$/.test(h2));

  // 4) re-login (maintenant en bcrypt) → doit encore réussir
  const okLogin2 = await fn({ action: "login", pseudo, password: pwd });
  console.log("4) Re-login (hash bcrypt) → status", okLogin2.status, "| ok:", okLogin2.body?.ok);

  // 5) mauvais mot de passe → doit échouer
  const badLogin = await fn({ action: "login", pseudo, password: pwd + "X" });
  console.log("5) Login MAUVAIS mot de passe → status", badLogin.status, "| message:", badLogin.body?.error);
} finally {
  if (created) {
    const del = await rest(`joueurs?pseudo=eq.${encodeURIComponent(pseudo)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    console.log("\n🧹 Compte test supprimé:", del.status === 204 || del.ok ? "OK" : "ÉCHEC (status " + del.status + ")");
  }
}
