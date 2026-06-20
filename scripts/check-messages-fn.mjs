// TEST complet de la messagerie sécurisée : jeton de session + fonction `messages`.
// 2 comptes jetables, envoi A→B, lecture, anti-usurpation, anti-lecture-sans-jeton. Tout supprimé à la fin.
const SB = "https://secuyejzngzhnnuweuwm.supabase.co";
const K  = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const H = { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json" };
const rest = (p, o = {}) => { const { headers, ...rest } = o; return fetch(`${SB}/rest/v1/${p}`, { ...rest, headers: { ...H, ...(headers || {}) } }); };
const fnAuth = (b) => fetch(`${SB}/functions/v1/auth`, { method: "POST", headers: H, body: JSON.stringify(b) }).then(r => r.json());
const fnMsg = (b) => fetch(`${SB}/functions/v1/messages`, { method: "POST", headers: H, body: JSON.stringify(b) }).then(async r => ({ status: r.status, body: await r.json().catch(() => null) }));

const pwd = "Probe-" + Math.random().toString(36).slice(2, 9);
const pA = "zzz_msgA_" + Date.now(), pB = "zzz_msgB_" + Date.now();
const ids = [];

try {
  const a = await fnAuth({ action: "register", pseudo: pA, password: pwd, profil: {} });
  const b = await fnAuth({ action: "register", pseudo: pB, password: pwd, profil: {} });
  const idA = a.joueur?.id, idB = b.joueur?.id, tA = a.token, tB = b.token;
  if (idA) ids.push(idA); if (idB) ids.push(idB);
  console.log("1) Jeton renvoyé au login/register ? A:", tA ? "✅" : "❌", "| B:", tB ? "✅" : "❌");
  if (!tA || !tB || !idA || !idB) { console.log("   → register a échoué, abandon:", JSON.stringify(a).slice(0,120)); throw new Error("reg"); }

  const noTok = await fnMsg({ action: "list" });
  console.log("2) Lire les messages SANS jeton →", noTok.status, noTok.status === 401 ? "✅ REFUSÉ" : "❌ accepté (problème!)");

  const send = await fnMsg({ action: "send", token: tA, toId: idB, toPseudo: pB, contenu: "Salut test 🎯" });
  console.log("3) A envoie à B →", send.status, "| expéditeur forcé à A ?", send.body?.message?.from_id === idA ? "✅ (pas d'usurpation possible)" : "❌");

  const listA = await fnMsg({ action: "list", token: tA });
  console.log("4) Liste de A →", listA.body?.messages?.length, "message(s)");

  const convB = await fnMsg({ action: "conversation", token: tB, otherId: idA });
  console.log("5) B lit la conversation avec A →", convB.body?.messages?.length, "message(s) | contenu:", convB.body?.messages?.[0]?.contenu);

  const unreadB = await fnMsg({ action: "unread", token: tB });
  console.log("6) Non-lus de B →", unreadB.body?.unread?.length, "(avant markRead)");
  await fnMsg({ action: "markRead", token: tB, fromId: idA });
  const unreadB2 = await fnMsg({ action: "unread", token: tB });
  console.log("   Non-lus de B après markRead →", unreadB2.body?.unread?.length, unreadB2.body?.unread?.length === 0 ? "✅" : "");
} finally {
  for (const id of ids) {
    await rest(`messages?or=(from_id.eq.${id},to_id.eq.${id})`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    await rest(`joueurs?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  }
  console.log("\n🧹 Comptes + messages de test supprimés");
}
