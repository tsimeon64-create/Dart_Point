// supabase/functions/daily-cron/index.ts
// Edge Function Supabase — Tâches quotidiennes Dart Point
//
// Cette fonction couvre 3 chantiers :
//   1. Récompense vainqueur Finish Speedrun (+20 DRIX) + post Comptoir
//   2. Récompense vainqueur Scoreur Speedrun (+20 DRIX) + post Comptoir
//   3. Distribution +5 DRIX participation à tous les joueurs qui ont TERMINÉ
//   4. Cleanup des photos wall_posts > 14 jours
//
// Déclenchée chaque nuit à 00:01 par pg_cron.
//
// ─── DÉPLOIEMENT ──────────────────────────────────────────────────────────────
// 1. Installe Supabase CLI : https://supabase.com/docs/guides/cli
// 2. Login : supabase login
// 3. Link : supabase link --project-ref <TON_PROJECT_REF>
// 4. Deploy : supabase functions deploy daily-cron --no-verify-jwt
//
// ─── ACTIVATION DU CRON ───────────────────────────────────────────────────────
// Dans Supabase Dashboard > SQL Editor, exécute :
//
//   create extension if not exists pg_cron;
//   create extension if not exists pg_net;
//
//   select cron.schedule(
//     'dartpoint-daily-cron',
//     '1 0 * * *',  -- 00:01 UTC chaque nuit
//     $$
//       select net.http_post(
//         url := 'https://<TON_PROJECT_REF>.supabase.co/functions/v1/daily-cron',
//         headers := '{"Authorization": "Bearer <TON_ANON_KEY>"}'::jsonb,
//         body := '{}'::jsonb
//       );
//     $$
//   );
//
// Remplace <TON_PROJECT_REF> et <TON_ANON_KEY> par tes vraies valeurs.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SB_URL         = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const api = async (path: string, opts: RequestInit & { prefer?: string } = {}) => {
  const { prefer, ...rest } = opts;
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SB_SERVICE_KEY,
      Authorization: `Bearer ${SB_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    ...rest,
  });
  if (!r.ok) return null;
  if (r.status === 204) return null;
  return r.json();
};

const formatChrono = (ms: number): string => {
  const t = Math.floor(ms / 100);
  const d = t % 10;
  const s = Math.floor(t / 10) % 60;
  const m = Math.floor(t / 600);
  if (m > 0) return `${m}:${String(s).padStart(2, "0")}.${d}`;
  return `${s}.${d}s`;
};

const yesterday = () => new Date(Date.now() - 86400000).toISOString().split("T")[0];

// ─── Récompense un jeu donné (Finish ou Scoreur) ────────────────────────────
async function processGame(table: string, gameName: string, postPrefix: string) {
  const date = yesterday();
  const [yd, mm, dd] = date.split("-");

  // Tous les runs terminés non encore récompensés
  const scores = await api(
    `${table}?date_jour=eq.${date}&statut=eq.termine&rewarded=eq.false&order=temps_ms.asc&limit=100`
  );
  if (!scores || scores.length === 0) {
    return { ok: true, message: `${gameName}: rien à faire` };
  }

  // Marque TOUS les runs d'hier comme rewarded (idempotence anti-double)
  await api(`${table}?date_jour=eq.${date}`, {
    method: "PATCH",
    body: JSON.stringify({ rewarded: true }),
    prefer: "return=minimal",
  });

  // Récupère les joueurs d'un coup pour minimiser les requêtes
  type Score = { joueur_id: string; joueur_pseudo: string; temps_ms: number };
  type Joueur = { id: string; drix?: number; photo?: string | null };
  const joueurIds = [...new Set((scores as Score[]).map(s => s.joueur_id))].join(",");
  const joueurs = await api(`joueurs?id=in.(${joueurIds})&select=id,drix,photo`);
  const jMap: Record<string, Joueur> = {};
  ((joueurs || []) as Joueur[]).forEach(j => { jMap[j.id] = j; });

  const now = Date.now();
  const results = [];

  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    const j = jMap[s.joueur_id];
    if (!j) continue;

    const isWinner = i === 0;
    const drix = isWinner ? 20 : 5;
    const drixAvant = j.drix || 1000;
    const drixApres = drixAvant + drix;
    const label = isWinner ? "🥇 Vainqueur du jour" : "🎯 Participation";

    // Update DRIX joueur
    await api(`joueurs?id=eq.${j.id}`, {
      method: "PATCH",
      body: JSON.stringify({ drix: drixApres }),
      prefer: "return=minimal",
    });

    // Mouvement DRIX
    await api("drix_mouvements", {
      method: "POST",
      body: JSON.stringify({
        joueur_id:         j.id,
        joueur_pseudo:     s.joueur_pseudo,
        adversaire_pseudo: `⏱ ${gameName} — ${label}`,
        variation:         drix,
        drix_avant:        drixAvant,
        drix_apres:        drixApres,
        resultat:          "victoire",
        date:              now,
      }),
    });

    // Post Comptoir pour le vainqueur uniquement
    if (isWinner) {
      const payload = {
        type: `${postPrefix}_vainqueur`,
        temps_ms: s.temps_ms,
        drix: 20,
        date_jour: date,
      };
      const contenu = `__${postPrefix.toUpperCase()}__|${JSON.stringify(payload)}\n\n` +
        `🏆 ${gameName} — Vainqueur du ${dd}/${mm}/${yd}\n` +
        `👑 ${s.joueur_pseudo} remporte le défi en ${formatChrono(s.temps_ms)} !\n` +
        `🥇 +20 DRIX`;
      await api("wall_posts", {
        method: "POST",
        body: JSON.stringify({
          joueur_id:     s.joueur_id,
          joueur_pseudo: s.joueur_pseudo,
          joueur_photo:  j.photo || null,
          contenu, date: now,
        }),
      });
    }

    results.push({ pseudo: s.joueur_pseudo, drix, isWinner });
  }

  return { ok: true, game: gameName, processed: results.length, results };
}

// ─── Cleanup wall_posts.image_url > 14 jours ───────────────────────────────
async function cleanupOldImages() {
  const fortnightAgo = Date.now() - 14 * 86400000;
  await api(`wall_posts?image_url=not.is.null&date=lt.${fortnightAgo}`, {
    method: "PATCH",
    body: JSON.stringify({ image_url: null }),
    prefer: "return=minimal",
  });
  return { ok: true, task: "cleanup_images" };
}

// ─── Point d'entrée ─────────────────────────────────────────────────────────
serve(async () => {
  try {
    const [finishResult, scoreurResult, cleanupResult] = await Promise.all([
      processGame("chrono_finish_scores", "Finish Speedrun", "CHRONO").catch(e => ({ ok: false, error: String(e), game: "finish" })),
      processGame("chrono_scoreur_scores", "Scoreur Speedrun", "CHRONO_SCOREUR").catch(e => ({ ok: false, error: String(e), game: "scoreur" })),
      cleanupOldImages().catch(e => ({ ok: false, error: String(e), task: "cleanup" })),
    ]);

    return new Response(JSON.stringify({
      ok: true,
      date: yesterday(),
      finish: finishResult,
      scoreur: scoreurResult,
      cleanup: cleanupResult,
    }, null, 2), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
