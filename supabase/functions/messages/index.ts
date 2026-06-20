// supabase/functions/messages/index.ts
// Messagerie privée sécurisée par JETON DE SESSION (délivré par la fonction `auth`).
// Le client ne peut LIRE que ses propres conversations, et ENVOIE toujours en son nom
// (from_id = jid du jeton) → fini la lecture globale des messages et l'usurpation d'expéditeur.
// À déployer comme `auth` (dashboard → coller → Deploy, Verify JWT non requis).

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
    const { action, token, otherId, toId, toPseudo, contenu, fromId } = await req.json();
    const me = await verifyToken(token);
    if (!me) return json({ error: "Session expirée, reconnecte-toi" }, 401);

    // Toutes mes conversations (liste)
    if (action === "list") {
      const rows = await api(`messages?or=(from_id.eq.${me},to_id.eq.${me})&order=date.desc&select=*`).then((r) => r.json());
      return json({ ok: true, messages: Array.isArray(rows) ? rows : [] });
    }

    // Une conversation précise (moi <-> otherId)
    if (action === "conversation") {
      if (!isUuid(otherId)) return json({ error: "Destinataire invalide" }, 400);
      const rows = await api(`messages?or=(and(from_id.eq.${me},to_id.eq.${otherId}),and(from_id.eq.${otherId},to_id.eq.${me}))&order=date.asc&select=*`).then((r) => r.json());
      return json({ ok: true, messages: Array.isArray(rows) ? rows : [] });
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
