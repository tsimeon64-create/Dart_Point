// Test live de la nouvelle action "session" de la fonction auth + scenario de reparation
// du cache (email oublie) + rejet d un jeton falsifie. Compte jetable supprime a la fin.
// Ne JAMAIS imprimer la vraie valeur d email, seulement des booleens.
const SB = "https://secuyejzngzhnnuweuwm.supabase.co";
const K  = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };
const fnAuth = (b) => fetch(`${SB}/functions/v1/auth`, { method: "POST", headers: H, body: JSON.stringify(b) })
  .then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
const rest = (p, o = {}) => { const { headers, ...rest } = o; return fetch(`${SB}/rest/v1/${p}`, { ...rest, headers: { ...H, ...(headers || {}) } }); };

const suf = Date.now() + "" + Math.floor(Math.random() * 1e6);
const pseudo = "zzz_sess_" + suf, pwd = "Probe-" + Math.random().toString(36).slice(2, 10);
let id = null;
try {
  const reg = await fnAuth({ action: "register", pseudo, password: pwd, profil: { email: "probe_" + suf + "@example.test", ville: "TestVille" } });
  id = reg.body?.joueur?.id;
  console.log("1) Register compte jetable        ->", reg.status, id ? "OK cree" : "ECHEC " + JSON.stringify(reg.body).slice(0, 80));
  if (!id) throw new Error("no id");

  const log = await fnAuth({ action: "login", pseudo, password: pwd });
  const tok = log.body?.token;
  console.log("2) Login email present ?           ->", !!log.body?.joueur?.email ? "OUI" : "NON", "| jeton:", tok ? "OUI" : "NON");

  // 3) Coeur du test : action session avec le bon jeton -> profil AVEC email
  const sess = await fnAuth({ action: "session", token: tok });
  console.log("3) session(bon jeton)              ->", sess.status, "| ok:", sess.body?.ok === true ? "OUI" : "NON", "| email recupere:", !!sess.body?.joueur?.email ? "OUI (parfait)" : "NON");

  // 4) Scenario reparation : cache sans email + profil de session -> email revient
  const cacheSansEmail = { ...log.body.joueur }; delete cacheSansEmail.email;
  const merged = { ...cacheSansEmail, ...(sess.body?.joueur || {}) };
  console.log("4) Cache repare (merge session)    -> email revenu:", !!merged.email ? "OUI (popup evitee)" : "NON");

  // 5) Securite : un jeton falsifie doit etre refuse
  const bad = await fnAuth({ action: "session", token: "nimportequoi.falsifie" });
  console.log("5) session(jeton bidon)            ->", bad.status, bad.status === 401 ? "REFUSE (bien)" : "ACCEPTE (probleme!)");
} finally {
  if (id) { const d = await rest(`joueurs?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }); console.log("\nNettoyage: compte de test supprime ->", d.status); }
}
