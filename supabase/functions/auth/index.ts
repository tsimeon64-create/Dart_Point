// supabase/functions/auth/index.ts
// Edge Function — AUTHENTIFICATION JOUEUR (login / register / reset) CÔTÉ SERVEUR.
//
// Accueil : chaque nouvel inscrit devient ami avec Thomas et reçoit un message de
// bienvenue (voir la fin de l'action "register").
const HOTE_ID = "6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44"; // Thomas
const HOTE_PSEUDO = "Thomas";

const messageBienvenue = (pseudo: string) => `Salut ${pseudo} 👋

Bienvenue sur Dart Point ! Moi c'est Thomas, c'est moi qui ai créé l'appli.

Je t'ai ajouté en ami pour que tu ne démarres pas tout seul. Tu peux me retirer quand tu veux, ça ne me vexera pas 😉

Pour bien commencer :
🎯 Le Scoreur — pour compter tes parties (501, 301, Cricket)
⚔️ Défi — affronte un joueur et fais grimper ton DRIX
🍺 Le Comptoir — vois ce que font les autres joueurs
🗺️ La carte — trouve les bars à fléchettes près de chez toi

Une question, un bug, une idée ? Réponds ici, je lis tout.

Bonnes fléchettes ! 🎯`;
//
// POURQUOI : aujourd'hui le client lit le hash du mot de passe et le compare dans le
// navigateur → le hash est servi à quiconque a la clé anon (cf. audit, faille critique).
// Ici, la vérification se fait avec la SERVICE ROLE KEY : le hash ne sort JAMAIS au client.
// → Permet ensuite de REVOKE SELECT/UPDATE(password_hash) FROM anon
//   (fin de l'exposition des mots de passe ET du takeover par réécriture du hash).
//
// MOTS DE PASSE : PBKDF2-SHA256 salé (Web Crypto intégré à Deno — AUCUNE dépendance externe).
// Migration douce : un ancien hash SHA-256 (non salé) est re-haché en PBKDF2 au 1er login
// réussi, de façon transparente pour le joueur.
//   Format stocké : "pbkdf2$<iterations>$<sel_base64>$<hash_base64>"
//
// DÉPLOIEMENT (dashboard Supabase → Edge Functions → coller → Deploy ; nom "auth").
// SECRETS : SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis automatiquement par Supabase.

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
  // ⚠️ Destructure `headers` hors de opts : sinon `...rest` réécraserait les en-têtes
  // fusionnés et on perdrait apikey/Authorization sur les écritures (insert/patch).
  const { headers, ...rest } = opts;
  return fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", ...((headers as Record<string, string>) || {}) },
    ...rest,
  });
};

// Toutes les colonnes de `joueurs` SAUF password_hash (ce qu'on renvoie au client).
const PUBLIC_COLS =
  "id,pseudo,bar_slug,asso_slug,date_inscription,actif,drix,photo,age,ville,style_jeu," +
  "bull_balance,last_daily_reward,bull_reserved,nom,prenom,email,niveau,cgu_accepte,cgu_date," +
  "anonymise,anonymise_date,xp,xp_badges_credited";
// Champs de profil que l'inscription a le droit de fixer (jamais drix/xp/is_admin/etc.).
const PROFIL_WHITELIST = ["nom", "prenom", "email", "ville", "asso_slug", "niveau", "age", "style_jeu", "bar_slug"];

const ITERATIONS = 150000;
const b64 = (u8: Uint8Array) => btoa(String.fromCharCode(...u8));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const enc = (s: string) => new TextEncoder().encode(s);

// SHA-256 hex — sert UNIQUEMENT à vérifier les anciens mots de passe (avant migration).
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256);
  return b64(new Uint8Array(bits));
}
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const h = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${h}`;
}
async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = String(stored).split("$");
  if (parts[0] !== "pbkdf2" || parts.length !== 4) return false;
  const iterations = parseInt(parts[1], 10);
  const h = await pbkdf2(password, unb64(parts[2]), iterations);
  return h === parts[3];
}
const isPbkdf2 = (h: unknown) => typeof h === "string" && h.startsWith("pbkdf2$");

// ── Jeton de session (HMAC-SHA256 signé avec la SERVICE KEY, donc infalsifiable) ──
// Format : base64url(JSON{jid,exp}) + "." + base64url(HMAC). Sert à prouver l'identité
// du joueur aux autres fonctions (messages, etc.) sans renvoyer le mot de passe.
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 jours
const b64url = (u8: Uint8Array) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmacSign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc(SERVICE_KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, enc(data))));
}
async function makeToken(jid: string): Promise<string> {
  const payload = b64url(enc(JSON.stringify({ jid, exp: Date.now() + TOKEN_TTL_MS })));
  return `${payload}.${await hmacSign(payload)}`;
}
// Vérifie un jeton de session (HMAC + expiration) et renvoie l'id du joueur, sinon null.
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

// ── Récupération de mot de passe par e-mail ──────────────────────────────────
// Code à 6 chiffres cryptographiquement aléatoire.
function genCode(): string {
  return String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
}
// Envoi d'e-mail via Brevo (secrets : BREVO_API_KEY = clé API, RESET_FROM_EMAIL = expéditeur vérifié).
async function sendResetEmail(toEmail: string, pseudo: string, code: string) {
  const apiKey = Deno.env.get("BREVO_API_KEY");
  const fromEmail = Deno.env.get("RESET_FROM_EMAIL");
  if (!apiKey || !fromEmail) throw new Error("email-not-configured");
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      sender: { name: "Dart Point", email: fromEmail },
      to: [{ email: toEmail, name: pseudo || "" }],
      subject: "🎯 Ton code Dart Point",
      htmlContent:
        `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a">` +
        `<h2 style="color:#f97316;margin:0 0 12px">Dart Point — Mot de passe oublié</h2>` +
        `<p>Salut ${pseudo || ""} 👋</p>` +
        `<p>Voici ton code pour réinitialiser ton mot de passe :</p>` +
        `<div style="font-size:34px;font-weight:900;letter-spacing:8px;background:#f1f5f9;border-radius:12px;padding:16px;text-align:center;color:#0f172a;margin:14px 0">${code}</div>` +
        `<p style="color:#64748b;font-size:13px">Ce code est valable <b>15 minutes</b>. Si tu n'es pas à l'origine de cette demande, ignore simplement ce message.</p>` +
        `</div>`,
    }),
  });
  if (!r.ok) { const t = await r.text(); throw new Error("brevo-" + r.status + ":" + t.slice(0, 150)); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "method not allowed" }, 405);

  try {
    const { action, pseudo, password, profil, resetCode, newPassword, token, email } = await req.json();

    // ───────── MOT DE PASSE OUBLIÉ — étape 1 : envoyer un code par e-mail ─────────
    if (action === "requestReset") {
      const em = String(email || "").trim();
      if (!em || !em.includes("@")) return json({ error: "E-mail invalide" }, 400);
      const rows = await api(`joueurs?email=ilike.${encodeURIComponent(em)}&select=id,pseudo,email`).then((r) => r.json());
      const u = Array.isArray(rows) ? rows[0] : null;
      if (u?.id && u.email) {
        const code = genCode();
        await api(`joueurs?id=eq.${u.id}`, {
          method: "PATCH", headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ reset_code: await sha256(code), reset_expiry: Date.now() + 15 * 60 * 1000, reset_attempts: 0 }),
        });
        try { await sendResetEmail(u.email, u.pseudo, code); }
        catch (e) { return json({ error: "Envoi de l'e-mail impossible", detail: String(e) }, 500); }
      }
      // Réponse toujours « ok » : on ne révèle pas si l'e-mail existe (anti-énumération).
      return json({ ok: true });
    }

    // ───────── MOT DE PASSE OUBLIÉ — étape 2 : vérifier le code + nouveau mot de passe ─────────
    if (action === "confirmReset") {
      const em = String(email || "").trim();
      const code = String(resetCode || "").trim();
      if (!em || !code || !newPassword) return json({ error: "Champs manquants" }, 400);
      if (String(newPassword).length < 4) return json({ error: "Nouveau mot de passe trop court (min 4)" }, 400);
      const rows = await api(`joueurs?email=ilike.${encodeURIComponent(em)}&select=id,reset_code,reset_expiry,reset_attempts`).then((r) => r.json());
      const u = Array.isArray(rows) ? rows[0] : null;
      if (!u?.reset_code || !u?.reset_expiry) return json({ error: "Aucune demande en cours. Refais « mot de passe oublié »." }, 400);
      if (Date.now() > Number(u.reset_expiry)) return json({ error: "Code expiré, refais une demande." }, 400);
      if ((u.reset_attempts || 0) >= 5) return json({ error: "Trop d'essais. Refais une demande." }, 429);
      if ((await sha256(code)) !== u.reset_code) {
        await api(`joueurs?id=eq.${u.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ reset_attempts: (u.reset_attempts || 0) + 1 }) });
        return json({ error: "Code incorrect" }, 401);
      }
      await api(`joueurs?id=eq.${u.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ password_hash: await hashPassword(String(newPassword)), reset_code: null, reset_expiry: null, reset_attempts: 0 }),
      });
      return json({ ok: true });
    }

    // ───────────────────────── SESSION ─────────────────────────
    // Rafraîchir MON profil complet (email/nom/prénom inclus) en prouvant mon identité
    // par le jeton de session — sans mot de passe. Sert à réparer un cache local qui aurait
    // perdu l'email (les lectures publiques n'ont plus le droit de renvoyer la PII).
    if (action === "session") {
      const jid = await verifyToken(token);
      if (!jid) return json({ error: "Session invalide ou expirée" }, 401);
      const rows = await api(`joueurs?id=eq.${jid}&select=${PUBLIC_COLS}`).then((r) => r.json());
      const u = Array.isArray(rows) ? rows[0] : null;
      if (!u) return json({ error: "Joueur introuvable" }, 404);
      return json({ ok: true, joueur: u });
    }

    // ───────── SUPPRESSION DE COMPTE (RGPD art.17 / exigence Google Play) ─────────
    // Le joueur supprime SON propre compte, prouvé par son jeton de session.
    // Anonymisation : on efface la PII + le mot de passe (impossible côté client car
    // REVOKE), mais on garde l'historique des matchs (pseudo anonymisé) pour ne pas
    // fausser les stats/DRIX des autres joueurs.
    if (action === "deleteAccount") {
      const jid = await verifyToken(token);
      if (!jid) return json({ error: "Session invalide ou expirée. Reconnecte-toi puis réessaie." }, 401);
      const anonPseudo = `Joueur supprimé #${String(jid).slice(0, 8)}`;
      // password_hash est NOT NULL → on met une valeur sentinelle INVALIDE (aucun mot de
      // passe ne peut produire ce hash) plutôt que null : la connexion devient impossible.
      await api(`joueurs?id=eq.${jid}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          pseudo: anonPseudo, email: null, nom: null, prenom: null, photo: null,
          ville: null, password_hash: "deleted", bar_slug: null, asso_slug: null,
          anonymise: true, anonymise_date: Date.now(),
        }),
      });
      // Efface les données personnelles liées + masque le pseudo dans les flux publics.
      await Promise.allSettled([
        api(`amis?joueur_id=eq.${jid}`,            { method: "DELETE", headers: { Prefer: "return=minimal" } }),
        api(`amis?ami_id=eq.${jid}`,               { method: "DELETE", headers: { Prefer: "return=minimal" } }),
        api(`presences?joueur_id=eq.${jid}`,       { method: "DELETE", headers: { Prefer: "return=minimal" } }),
        api(`presence_joueurs?joueur_id=eq.${jid}`,{ method: "DELETE", headers: { Prefer: "return=minimal" } }),
        api(`messages?or=(from_id.eq.${jid},to_id.eq.${jid})`, { method: "DELETE", headers: { Prefer: "return=minimal" } }),
        api(`wall_posts?joueur_id=eq.${jid}`,      { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ joueur_pseudo: anonPseudo }) }),
        api(`wall_comments?joueur_id=eq.${jid}`,   { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ joueur_pseudo: anonPseudo }) }),
      ]);
      return json({ ok: true });
    }

    // ───────────────────────── LOGIN ─────────────────────────
    if (action === "login") {
      if (!pseudo || !password) return json({ error: "Pseudo et mot de passe requis" }, 400);
      const rows = await api(`joueurs?pseudo=eq.${encodeURIComponent(String(pseudo).trim())}&select=${PUBLIC_COLS},password_hash`).then((r) => r.json());
      const u = Array.isArray(rows) ? rows[0] : null;
      if (!u) return json({ error: "Pseudo ou mot de passe incorrect" }, 401);

      let ok = false;
      if (isPbkdf2(u.password_hash)) {
        ok = await verifyPassword(String(password), u.password_hash);
      } else {
        // ancien hash SHA-256 → on vérifie, et si OK on migre vers PBKDF2 (transparent)
        ok = (await sha256(String(password))) === u.password_hash;
        if (ok) {
          const nh = await hashPassword(String(password));
          await api(`joueurs?id=eq.${u.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ password_hash: nh }) });
        }
      }
      if (!ok) return json({ error: "Pseudo ou mot de passe incorrect" }, 401);

      delete u.password_hash;
      return json({ ok: true, joueur: u, token: await makeToken(u.id) });
    }

    // ───────────────────────── REGISTER ─────────────────────────
    if (action === "register") {
      const ps = String(pseudo || "").trim();
      if (!ps || !password) return json({ error: "Pseudo et mot de passe requis" }, 400);
      if (String(password).length < 4) return json({ error: "Mot de passe trop court (min 4 caractères)" }, 400);

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
        password_hash: await hashPassword(String(password)),
        date_inscription: Date.now(),
        cgu_accepte: true,
        cgu_date: Date.now(),
      };
      const created = await api(`joueurs?select=${PUBLIC_COLS}`, {
        method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row),
      }).then((r) => r.json());
      const joueur = Array.isArray(created) ? created[0] : created;
      if (!joueur?.id) return json({ error: "Erreur lors de la création du compte" }, 500);

      // ── ACCUEIL DU NOUVEAU JOUEUR ────────────────────────────────────────────
      // On l'ajoute en ami avec Thomas et on lui envoie un message de bienvenue.
      // Côté SERVEUR et pas côté client, pour deux raisons : la fonction `messages`
      // déduit l'expéditeur du jeton (un client ne peut donc écrire qu'en SON nom),
      // et les tables `amis`/`messages` sont protégées par RLS.
      // ⚠️ Tout est dans un try/catch silencieux : si ça échoue, l'inscription doit
      // quand même aboutir. Personne ne doit rester bloqué dehors pour un mot d'accueil.
      // ⚠️ Un seul ajout, à l'inscription : le joueur reste libre de retirer Thomas
      // ensuite, et l'appli ne le rajoutera jamais.
      try {
        await api("amis", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            joueur_id: HOTE_ID, joueur_pseudo: HOTE_PSEUDO,
            ami_id: joueur.id, ami_pseudo: ps,
            statut: "accepte", date: Date.now(),
          }),
        });
      } catch { /* l'inscription prime */ }

      try {
        await api("messages", {
          method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            from_id: HOTE_ID, from_pseudo: HOTE_PSEUDO,
            to_id: joueur.id, to_pseudo: ps.slice(0, 40),
            contenu: messageBienvenue(ps),
            date: new Date().toISOString(),
            lu: false, // non lu → pastille de notification
          }),
        });
      } catch { /* l'inscription prime */ }

      return json({ ok: true, joueur, token: await makeToken(joueur.id) });
    }

    // ───────────────────────── RESET ─────────────────────────
    if (action === "reset") {
      const ps = String(pseudo || "").trim();
      if (!ps || !resetCode || !newPassword) return json({ error: "Champs manquants" }, 400);
      if (String(newPassword).length < 4) return json({ error: "Nouveau mot de passe trop court (min 4)" }, 400);

      const okCode = await api("rpc/verify_reset_code", { method: "POST", body: JSON.stringify({ code: resetCode }) })
        .then((r) => r.json()).catch(() => false);
      if (okCode !== true) return json({ error: "Code administrateur incorrect" }, 401);

      const rows = await api(`joueurs?pseudo=eq.${encodeURIComponent(ps)}&select=id`).then((r) => r.json());
      const u = Array.isArray(rows) ? rows[0] : null;
      if (!u) return json({ error: "Pseudo introuvable" }, 404);

      await api(`joueurs?id=eq.${u.id}`, {
        method: "PATCH", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ password_hash: await hashPassword(String(newPassword)) }),
      });
      return json({ ok: true });
    }

    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
