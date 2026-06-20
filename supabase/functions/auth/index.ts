// supabase/functions/auth/index.ts
// Edge Function — AUTHENTIFICATION JOUEUR (login / register / reset) CÔTÉ SERVEUR.
//
// POURQUOI : aujourd'hui le client lit le hash du mot de passe et le compare dans le
// navigateur → le hash est servi à quiconque a la clé anon (cf. audit, faille critique).
// Ici, la vérification se fait avec la SERVICE ROLE KEY : le hash ne sort JAMAIS au client.
// → Une fois cette fonction en place, on peut REVOKE SELECT/UPDATE(password_hash) FROM anon
//   (fin de l'exposition des mots de passe ET du takeover par réécriture du hash).
//
// MOTS DE PASSE : bcrypt salé. Migration douce — un ancien hash SHA-256 (non salé) est
// re-haché en bcrypt au 1er login réussi, de façon transparente pour le joueur.
//
// DÉPLOIEMENT (dashboard Supabase → Edge Functions → Deploy a new function → nom "auth") :
//   • coller ce fichier, puis Deploy.
//   • IMPORTANT : désactiver "Verify JWT" (la fonction doit être appelable sans être déjà connecté).
//   • (CLI équivalent : supabase functions deploy auth --no-verify-jwt)
// SECRETS : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import bcrypt from "https://esm.sh/bcryptjs@2.4.3";

const SB_URL      = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

const api = (path: string, opts: RequestInit = {}) =>
  fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });

// Toutes les colonnes de `joueurs` SAUF password_hash (ce qu'on renvoie au client).
const PUBLIC_COLS =
  "id,pseudo,bar_slug,asso_slug,date_inscription,actif,drix,photo,age,ville,style_jeu," +
  "bull_balance,last_daily_reward,bull_reserved,nom,prenom,email,niveau,cgu_accepte,cgu_date," +
  "anonymise,anonymise_date,xp,xp_badges_credited";

// Champs de profil que l'inscription a le droit de fixer (jamais drix/xp/is_admin/etc.).
const PROFIL_WHITELIST = ["nom", "prenom", "email", "ville", "asso_slug", "niveau", "age", "style_jeu", "bar_slug"];

// SHA-256 hex — sert UNIQUEMENT à vérifier les anciens mots de passe (avant migration bcrypt).
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
const isBcrypt = (h: unknown) => typeof h === "string" && /^\$2[aby]\$/.test(h);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "method not allowed" }, 405);

  try {
    const { action, pseudo, password, profil, resetCode, newPassword } = await req.json();

    // ───────────────────────── LOGIN ─────────────────────────
    if (action === "login") {
      if (!pseudo || !password) return json({ error: "Pseudo et mot de passe requis" }, 400);
      const rows = await api(`joueurs?pseudo=eq.${encodeURIComponent(String(pseudo).trim())}&select=${PUBLIC_COLS},password_hash`).then((r) => r.json());
      const u = Array.isArray(rows) ? rows[0] : null;
      if (!u) return json({ error: "Pseudo ou mot de passe incorrect" }, 401);

      let ok = false;
      if (isBcrypt(u.password_hash)) {
        ok = bcrypt.compareSync(String(password), u.password_hash);
      } else {
        // ancien hash SHA-256 → on vérifie, et si OK on migre vers bcrypt (transparent)
        ok = (await sha256(String(password))) === u.password_hash;
        if (ok) {
          const nh = bcrypt.hashSync(String(password), 10);
          await api(`joueurs?id=eq.${u.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ password_hash: nh }) });
        }
      }
      if (!ok) return json({ error: "Pseudo ou mot de passe incorrect" }, 401);

      const { password_hash: _omit, ...pub } = u;
      return json({ ok: true, joueur: pub });
    }

    // ───────────────────────── REGISTER ─────────────────────────
    if (action === "register") {
      const ps = String(pseudo || "").trim();
      if (!ps || !password) return json({ error: "Pseudo et mot de passe requis" }, 400);
      if (String(password).length < 4) return json({ error: "Mot de passe trop court (min 4 caractères)" }, 400);

      // unicité du pseudo (insensible à la casse)
      const exists = await api(`joueurs?pseudo=ilike.${encodeURIComponent(ps)}&select=id,pseudo`).then((r) => r.json());
      if (Array.isArray(exists) && exists.length) {
        const taken = exists[0]?.pseudo;
        return json({ error: `Ce pseudo est déjà pris${taken && taken !== ps ? ` (par "${taken}")` : ""}` }, 409);
      }

      const safeProfil: Record<string, unknown> = {};
      for (const k of PROFIL_WHITELIST) if (profil && profil[k] != null) safeProfil[k] = profil[k];
      const row = {
        ...safeProfil,
        pseudo: ps,
        password_hash: bcrypt.hashSync(String(password), 10),
        date_inscription: Date.now(),
        cgu_accepte: true,
        cgu_date: Date.now(),
      };
      const created = await api(`joueurs?select=${PUBLIC_COLS}`, {
        method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row),
      }).then((r) => r.json());
      const joueur = Array.isArray(created) ? created[0] : created;
      if (!joueur?.id) return json({ error: "Erreur lors de la création du compte" }, 500);
      return json({ ok: true, joueur });
    }

    // ───────────────────────── RESET ─────────────────────────
    if (action === "reset") {
      const ps = String(pseudo || "").trim();
      if (!ps || !resetCode || !newPassword) return json({ error: "Champs manquants" }, 400);
      if (String(newPassword).length < 4) return json({ error: "Nouveau mot de passe trop court (min 4)" }, 400);

      // vérifie le code admin via la RPC existante (hash bcrypt côté serveur)
      const okCode = await api("rpc/verify_reset_code", { method: "POST", body: JSON.stringify({ code: resetCode }) })
        .then((r) => r.json()).catch(() => false);
      if (okCode !== true) return json({ error: "Code administrateur incorrect" }, 401);

      const rows = await api(`joueurs?pseudo=eq.${encodeURIComponent(ps)}&select=id`).then((r) => r.json());
      const u = Array.isArray(rows) ? rows[0] : null;
      if (!u) return json({ error: "Pseudo introuvable" }, 404);

      await api(`joueurs?id=eq.${u.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ password_hash: bcrypt.hashSync(String(newPassword), 10) }),
      });
      return json({ ok: true });
    }

    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
