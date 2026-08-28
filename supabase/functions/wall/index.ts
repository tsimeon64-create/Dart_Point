// supabase/functions/wall/index.ts
// Comptoir sécurisé par JETON DE SESSION (délivré par la fonction `auth`).
//
// POURQUOI : jusqu'ici les commentaires et les j'aime partaient DIRECTEMENT du
// téléphone, avec `joueur_id` et `joueur_pseudo` choisis par le navigateur. La clé
// publique étant dans le code de l'appli, n'importe qui pouvait écrire un commentaire
// signé d'un autre joueur, ou modifier/supprimer celui d'un autre.
// Ici l'auteur est DÉDUIT DU JETON : un téléphone ne peut écrire qu'en SON nom.
//
// À déployer comme `auth` et `messages` : dashboard → coller → Deploy.
// ⚠️ git push ne déploie PAS les fonctions Edge.
//
// ⚠️ ORDRE DE MISE EN SERVICE :
//   1. déployer cette fonction ;
//   2. mettre l'appli en ligne (elle appelle alors la fonction) ;
//   3. SEULEMENT APRÈS, lancer le SQL qui ferme l'écriture directe
//      (comptoir_verrouillage.sql). Dans l'autre ordre, plus personne ne peut
//      commenter entre les deux étapes.

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
// ⚠️ `api` ne leve JAMAIS : un refus de la base (402 quota, 503, contrainte...) rendait
// une reponse « ok » au telephone, qui affichait alors une bulle de commentaire VIDE pour
// un commentaire jamais enregistre. `apiOk` transforme ce refus en erreur.
const apiOk = async (path: string, opts: RequestInit = {}) => {
  const r = await api(path, opts);
  if (!r.ok) throw new Error(`base refusee (${r.status}) ${(await r.text()).slice(0, 200)}`);
  return r;
};

const enc = (s: string) => new TextEncoder().encode(s);
const isUuid = (s: unknown) => typeof s === "string" && /^[0-9a-fA-F-]{36}$/.test(s);

// ── Vérification du jeton de session (même secret/algorithme que `auth`) ──
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

// Identité RÉELLE du joueur, lue en base — jamais celle annoncée par le téléphone.
async function moi(jid: string) {
  const r = await api(`joueurs?id=eq.${jid}&select=id,pseudo,photo,actif,anonymise`).then((x) => x.json()).catch(() => null);
  const j = Array.isArray(r) ? r[0] : null;
  if (!j || j.anonymise || j.actif === false) return null;
  return j as { id: string; pseudo: string; photo: string | null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST")    return json({ error: "method not allowed" }, 405);

  try {
    const { action, token, refId, contenu, commentId } = await req.json();
    const jid = await verifyToken(token);
    if (!jid) return json({ error: "Session expirée, reconnecte-toi" }, 401);
    const me = await moi(jid);
    if (!me) return json({ error: "Compte introuvable ou désactivé" }, 403);

    // ── COMMENTER ────────────────────────────────────────────────────────────
    if (action === "addComment") {
      if (!isUuid(refId)) return json({ error: "Publication invalide" }, 400);
      const txt = String(contenu || "").trim();
      if (!txt) return json({ error: "Commentaire vide" }, 400);
      if (txt.length > 1000) return json({ error: "Commentaire trop long (max 1000)" }, 400);
      // L'auteur vient du JETON, pas du corps de la requête.
      const row = {
        ref_id: refId, joueur_id: me.id, joueur_pseudo: me.pseudo,
        joueur_photo: me.photo || null, contenu: txt, date: Date.now(),
      };
      const cree = await apiOk("wall_comments?select=*", {
        method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row),
      }).then((r) => r.json());
      const ligne = Array.isArray(cree) ? cree[0] : cree;
      // Sans ligne renvoyee, le telephone afficherait une bulle vide.
      if (!ligne?.id) return json({ error: "Le commentaire n'a pas pu être enregistré" }, 500);
      return json({ ok: true, comment: ligne });
    }

    // ── SUPPRIMER SON COMMENTAIRE ────────────────────────────────────────────
    // Seul l'auteur peut supprimer. On relit la ligne côté serveur : se fier à ce
    // que le téléphone annonce permettrait d'effacer le commentaire d'un autre.
    if (action === "deleteComment") {
      if (!isUuid(commentId)) return json({ error: "Commentaire invalide" }, 400);
      const c = await api(`wall_comments?id=eq.${commentId}&select=joueur_id`).then((r) => r.json()).catch(() => null);
      const ligne = Array.isArray(c) ? c[0] : null;
      if (!ligne) return json({ error: "Commentaire introuvable" }, 404);
      if (ligne.joueur_id !== me.id) return json({ error: "Ce commentaire n'est pas le tien" }, 403);
      await apiOk(`wall_comments?id=eq.${commentId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
      // Les j'aime du commentaire partent avec lui.
      await api(`wall_likes?ref_id=eq.${commentId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => {});
      return json({ ok: true });
    }

    // ── AIMER / NE PLUS AIMER ────────────────────────────────────────────────
    // Une publication comme un commentaire : ref_id porte l'un ou l'autre.
    if (action === "like" || action === "unlike") {
      if (!isUuid(refId)) return json({ error: "Cible invalide" }, 400);
      if (action === "unlike") {
        await apiOk(`wall_likes?ref_id=eq.${refId}&joueur_id=eq.${me.id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
        return json({ ok: true, aime: false });
      }
      // Anti-doublon : le même joueur ne peut aimer qu'une fois.
      const deja = await api(`wall_likes?ref_id=eq.${refId}&joueur_id=eq.${me.id}&select=id&limit=1`).then((r) => r.json()).catch(() => []);
      if (Array.isArray(deja) && deja.length) return json({ ok: true, aime: true, deja: true });
      await apiOk("wall_likes", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ ref_id: refId, joueur_id: me.id, joueur_pseudo: me.pseudo, date: Date.now() }),
      });
      return json({ ok: true, aime: true });
    }

    // ── RECOPIER SON PSEUDO / SA PHOTO SUR SES ANCIENNES TRACES ──────────────
    // Le Comptoir garde une copie du pseudo et de la photo au moment de l'écriture.
    // Quand le joueur les change, il faut rafraîchir SES lignes — et seulement les
    // siennes : c'est le jeton qui décide, pas le filtre envoyé par le téléphone.
    if (action === "syncIdentite") {
      const maj = { joueur_pseudo: me.pseudo, joueur_photo: me.photo || null };
      await Promise.all([
        apiOk(`wall_comments?joueur_id=eq.${me.id}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(maj) }),
        apiOk(`wall_posts?joueur_id=eq.${me.id}`,    { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify(maj) }),
        api(`wall_likes?joueur_id=eq.${me.id}`,    { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ joueur_pseudo: me.pseudo }) }).catch(() => {}),
      ]);
      return json({ ok: true });
    }

    return json({ error: "action inconnue" }, 400);
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
