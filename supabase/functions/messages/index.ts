// supabase/functions/messages/index.ts
// Messagerie privée sécurisée par JETON DE SESSION (délivré par la fonction `auth`).
// Le client ne peut LIRE que ses propres conversations, et ENVOIE toujours en son nom
// (from_id = jid du jeton) → fini la lecture globale des messages et l'usurpation d'expéditeur.
// À déployer comme `auth` (dashboard → coller → Deploy, Verify JWT non requis).

// Messages encore visibles POUR MOI. Un fil supprimé ne l'est que de mon côté :
// `supprime_from` si j'étais l'expéditeur, `supprime_to` si j'étais le destinataire.
// L'autre personne garde sa copie intacte — effacer chez elle serait une surprise.
type Msg = { from_id?: string; to_id?: string; supprime_from?: boolean; supprime_to?: boolean };
const visibles = (rows: unknown, me: string): Msg[] => Array.isArray(rows)
  ? (rows as Msg[]).filter((m) => !(m.from_id === me && m.supprime_from === true) && !(m.to_id === me && m.supprime_to === true))
  : [];

const SB_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

const api = (path: string, opts: RequestInit = {}) => {
  const { headers, ...rest } = opts;
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...((headers as Record<string, string>) || {}) },
    ...rest,
  });
};
const enc = (s: string) => new TextEncoder().encode(s);
const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-fA-F-]{36}$/.test(s);

// ── Vérification du jeton de session (même secret/algorithme que la fonction `auth`) ──
const b64url = (u8: Uint8Array) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmacSign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc(SERVICE_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc(data))));
}
async function verifyToken(token: unknown): Promise<string | null> {
  try {
    const [p, sig] = String(token || "").split(".");
    if (!p || !sig) return null;
    if ((await hmacSign(p)) !== sig) return null;
    const pad = (s: string) => s + "===".slice((s.length + 3) % 4);
    const obj = JSON.parse(atob(pad(p.replace(/-/g, "+").replace(/_/g, "/"))));
    if (!obj?.jid || !obj?.exp || Date.now() > obj.exp) return null;
    return String(obj.jid);
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "method not allowed" }, 405);

  try {
    const { action, token, otherId, otherIds, toId, toPseudo, contenu, fromId } = await req.json();
    const me = await verifyToken(token);
    if (!me) return json({ error: "Session expirée, reconnecte-toi" }, 401);

    // Toutes mes conversations (liste)
    if (action === "list") {
      const rows = await api(`messages?or=(from_id.eq.${me},to_id.eq.${me})&order=date.desc&select=*`).then((r) => r.json());
      // On filtre EN JS et pas dans la requête : si les colonnes supprime_from/supprime_to
      // n'existent pas encore en base, la requête filtrée renverrait une erreur 400 et TOUTE
      // la messagerie tomberait. Ici, au pire, rien n'est masqué.
      return json({ ok: true, messages: visibles(rows, me) });
    }

    // Une conversation précise (moi <-> otherId)
    if (action === "conversation") {
      if (!isUuid(otherId)) return json({ error: "Destinataire invalide" }, 400);
      const rows = await api(`messages?or=(and(from_id.eq.${me},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${me}))&order=date.asc&select=*`).then((r) => r.json());
      return json({ ok: true, messages: visibles(rows, me) });
    }

    // Envoyer un message (from_id = MOI, impossible d'usurper)
    if (action === "send") {
      if (!isUuid(toId)) return json({ error: "Destinataire invalide" }, 400);
      const txt = String(contenu || "").trim();
      if (!txt) return json({ error: "Message vide" }, 400);
      if (txt.length > 2000) return json({ error: "Message trop long (max 2000)" }, 400);
      const meRow = await api(`joueurs?id=eq.${me}&select=pseudo`).then((r) => r.json());
      const fromPseudo = meRow?.[0]?.pseudo || "?";
      const row = { from_id: me, from_pseudo: fromPseudo, to_id: toId, to_pseudo: toPseudo ? String(toPseudo).slice(0, 40) : null, contenu: txt, date: new Date().toISOString(), lu: false };
      const created = await api(`messages?select=*`, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) }).then((r) => r.json());
      return json({ ok: true, message: Array.isArray(created) ? created[0] : created });
    }

    // Marquer comme lus les messages reçus de fromId
    // Suppression SOUPLE d'un ou plusieurs fils : on ne les retire que pour MOI.
    // L'autre personne garde sa copie — effacer chez elle serait une surprise très
    // désagréable, et rien dans l'écran ne le laisse deviner.
    if (action === "deleteConvs") {
      const bruts = Array.isArray(otherIds) ? otherIds : [];
      const ids = bruts.filter((x: unknown) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 50);
      if (!ids.length) return json({ error: "Aucune conversation à supprimer" }, 400);
      const liste = ids.join(",");
      let detail = "";
      try {
        await api(`messages?from_id=eq.${me}&to_id=in.(${liste})`, {
          method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ supprime_from: true }),
        });
        await api(`messages?to_id=eq.${me}&from_id=in.(${liste})`, {
          method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ supprime_to: true }),
        });
      } catch (e) {
        detail = String(e);
        // La cause la plus probable : les colonnes n'existent pas encore en base.
        // On le DIT, au lieu d'un « impossible » qui ne guide vers rien.
        const manque = /supprime_from|supprime_to|column|42703/i.test(detail);
        return json({ error: manque
          ? "Il manque les colonnes supprime_from / supprime_to dans la table messages (commande SQL à lancer)."
          : "Suppression impossible : " + detail.slice(0, 120) }, 500);
      }
      return json({ ok: true, supprimees: ids.length });
    }

    if (action === "markRead") {
      if (!isUuid(fromId)) return json({ error: "Expéditeur invalide" }, 400);
      await api(`messages?to_id=eq.${me}&from_id=eq.${fromId}&lu=eq.false`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ lu: true }) });
      return json({ ok: true });
    }

    // Mes messages non lus (pour le compteur)
    if (action === "unread") {
      const rows = await api(`messages?to_id=eq.${me}&lu=eq.false&select=id,from_id`).then((r) => r.json());
      return json({ ok: true, unread: Array.isArray(rows) ? rows : [] });
    }

    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
