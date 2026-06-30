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
  "propositions", "signalements", "admin_logs",
]);
// Tables que l'admin peut LIRE en entier via service-role (PII : email/nom/prénom non exposés à anon).
const ALLOWED_READ = new Set(["joueurs"]);

const api = (path: string, opts: RequestInit = {}) => {
  // ⚠️ Destructure `headers` hors de opts : sinon `...rest` réécraserait les en-têtes
  // fusionnés et on perdrait apikey/Authorization sur les écritures (insert/patch).
  const { headers, ...rest } = opts;
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...((headers as Record<string, string>) || {}),
    },
    ...rest,
  });
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "method not allowed" }, 405);

  try {
    const { pw, op, table, match, body } = await req.json();

    // 1) Authentifier l'admin via la RPC existante (mot de passe admin)
    const vr = await api("rpc/verify_admin_password", { method: "POST", body: JSON.stringify({ pw }) });
    const okAuth = await vr.json().catch(() => false);
    if (okAuth !== true) return json({ error: "unauthorized" }, 401);

    // LECTURE admin (service-role) — ex. liste joueurs avec PII (email/nom/prénom).
    // `match` porte les paramètres de requête : { select, order, limit }.
    if (op === "select") {
      if (!ALLOWED_READ.has(table)) return json({ error: "table non autorisée en lecture" }, 400);
      const parts: string[] = [];
      if (match?.select) parts.push(`select=${match.select}`);
      if (match?.order)  parts.push(`order=${match.order}`);
      if (match?.limit)  parts.push(`limit=${match.limit}`);
      const r = await api(`${table}?${parts.join("&")}`);
      const data = r.status === 204 ? [] : await r.json().catch(() => null);
      return json({ ok: r.ok, status: r.status, data });
    }

    // ── OPÉRATIONS JOUEUR encapsulées (service-role) ──────────────────────────────
    // Corrige l'anonymisation/suppression admin qui échouait via la clé anon :
    // password_hash est NOT NULL + colonne protégée (REVOKE UPDATE anon). Ici la SERVICE
    // KEY peut tout écrire ; on encapsule aussi les filtres `or=(...)` que le filtre
    // générique ne sait pas exprimer. `match.id` = l'id (uuid) du joueur ciblé.
    if (op === "anonymiseJoueur" || op === "supprimeJoueur" || op === "banJoueur") {
      const jid = match?.id;
      if (!jid) return json({ error: "match.id (uuid du joueur) requis" }, 400);
      const id = String(jid);
      const del = (path: string) => api(path, { method: "DELETE", headers: { Prefer: "return=minimal" } });

      // Données perso liées (toujours supprimées) — amis, présences, messages.
      const cleanPerso = () => Promise.allSettled([
        del(`amis?joueur_id=eq.${id}`),
        del(`amis?ami_id=eq.${id}`),
        del(`presences?joueur_id=eq.${id}`),
        del(`presence_joueurs?joueur_id=eq.${id}`),
        del(`messages?or=(from_id.eq.${id},to_id.eq.${id})`),
      ]);
      // Nettoyage complet (avant suppression dure) — + stats, mouvements DRIX, duels, tournois.
      const cleanAll = () => Promise.allSettled([
        del(`amis?joueur_id=eq.${id}`),
        del(`amis?ami_id=eq.${id}`),
        del(`stats_joueurs?joueur_id=eq.${id}`),
        del(`drix_mouvements?joueur_id=eq.${id}`),
        del(`presences?joueur_id=eq.${id}`),
        del(`presence_joueurs?joueur_id=eq.${id}`),
        api(`duels?or=(challenger_id.eq.${id},defie_id.eq.${id})&statut=eq.en_cours`,
            { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ statut: "annule" }) }),
        del(`tournois_potes_joueurs?joueur_id=eq.${id}`),
        del(`messages?or=(from_id.eq.${id},to_id.eq.${id})`),
      ]);

      if (op === "anonymiseJoueur") {
        // RGPD art.17 : efface la PII + le mot de passe (sentinelle, NOT NULL), garde
        // l'historique des matchs (pseudo anonymisé) pour ne pas fausser les stats.
        const pr = await api(`joueurs?id=eq.${id}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            pseudo: `Joueur supprimé #${id.slice(0, 8)}`,
            email: null, nom: null, prenom: null, photo: null, ville: null,
            password_hash: "deleted", bar_slug: null, asso_slug: null,
            anonymise: true, anonymise_date: Date.now(),
          }),
        });
        if (!pr.ok) return json({ error: "anonymisation échouée", detail: (await pr.text()).slice(0, 200) }, 500);
        await cleanPerso();
        return json({ ok: true });
      }

      if (op === "banJoueur") {
        const drixAvant = Number(body?.drix ?? 1000) || 1000;
        await api(`joueurs?id=eq.${id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ drix: 0 }) });
        await api("drix_mouvements", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({
          joueur_id: id, joueur_pseudo: body?.pseudo || "", adversaire_pseudo: "Admin",
          variation: -drixAvant, drix_avant: drixAvant, drix_apres: 0, resultat: "defaite", date: Date.now(),
        }) }).catch(() => {});
      }

      // supprimeJoueur + banJoueur : nettoyage complet puis suppression dure du joueur.
      await cleanAll();
      const dr = await del(`joueurs?id=eq.${id}`);
      if (!dr.ok) return json({ error: "suppression échouée", detail: (await dr.text()).slice(0, 200) }, 500);
      return json({ ok: true });
    }

    // 2) Garde-fous
    if (!ALLOWED.has(table)) return json({ error: "table non autorisée" }, 400);

    // INSERT (ex. journal admin) — pas de filtre
    if (op === "insert") {
      const r = await api(table, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(body || {}) });
      const data = r.status === 204 ? [] : await r.json().catch(() => null);
      return json({ ok: r.ok, status: r.status, data });
    }
    // PURGE — réservé au journal admin (vidage complet)
    if (op === "purge") {
      if (table !== "admin_logs") return json({ error: "purge réservée à admin_logs" }, 400);
      const r = await api("admin_logs?id=gte.0", { method: "DELETE", headers: { Prefer: "return=minimal" } });
      return json({ ok: r.ok, status: r.status });
    }

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
