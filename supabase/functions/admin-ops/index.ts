// supabase/functions/admin-ops/index.ts
// Edge Function — opérations admin sensibles (DELETE / UPDATE) avec la SERVICE ROLE KEY,
// jamais exposée au navigateur. Permet de verrouiller les policies RLS (retrait des
// droits DELETE/UPDATE anon) tout en gardant un panneau admin fonctionnel.
//
// SÉCURITÉ :
//   • Authentifie chaque appel avec le mot de passe admin existant (RPC verify_admin_password).
//   • N'autorise que des tables sur liste blanche.
//   • EXIGE un filtre `match` non vide → impossible de faire un DELETE/UPDATE « sans WHERE »
//     (donc pas d'effacement de masse).
//
// DÉPLOIEMENT :
//   supabase functions deploy admin-ops --no-verify-jwt
//   (la fonction gère elle-même l'auth via le mot de passe admin)
//
// SECRETS REQUIS (déjà fournis par Supabase pour SUPABASE_*, à vérifier) :
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SB_URL       = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

// Tables sur lesquelles l'admin peut supprimer / modifier
const ALLOWED = new Set([
  "bars", "associations", "tournois", "avis", "photos", "photos_associations",
  "propositions", "signalements",
]);

const api = (path: string, opts: RequestInit = {}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
    ...opts,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "method not allowed" }, 405);

  try {
    const { pw, op, table, match, body } = await req.json();

    // 1) Authentifier l'admin via la RPC existante (mot de passe admin)
    const vr = await api("rpc/verify_admin_password", { method: "POST", body: JSON.stringify({ pw }) });
    const okAuth = await vr.json().catch(() => false);
    if (okAuth !== true) return json({ error: "unauthorized" }, 401);

    // 2) Garde-fous
    if (!ALLOWED.has(table))                 return json({ error: "table non autorisée" }, 400);
    if (op !== "delete" && op !== "update")  return json({ error: "op non autorisée" }, 400);
    if (!match || typeof match !== "object" || Object.keys(match).length === 0)
      return json({ error: "filtre `match` requis (pas d'opération sans WHERE)" }, 400);

    // 3) Construire le filtre PostgREST et exécuter avec la SERVICE KEY
    const filter = Object.entries(match)
      .map(([k, v]) => `${encodeURIComponent(k)}=eq.${encodeURIComponent(String(v))}`)
      .join("&");
    const r = await api(`${table}?${filter}`, {
      method: op === "delete" ? "DELETE" : "PATCH",
      headers: { Prefer: "return=representation" },
      ...(op === "update" ? { body: JSON.stringify(body || {}) } : {}),
    });
    const data = r.status === 204 ? [] : await r.json().catch(() => null);
    return json({ ok: r.ok, status: r.status, data });

  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
