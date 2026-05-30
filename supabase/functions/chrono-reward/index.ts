// supabase/functions/chrono-reward/index.ts
// Edge Function Supabase — Récompense automatique du vainqueur Chrono Finish
// Déclenchée chaque nuit à 00:01 par pg_cron (voir README ci-dessous)
//
// DÉPLOIEMENT :
//   supabase functions deploy chrono-reward --no-verify-jwt
//
// CRON (SQL à exécuter dans Supabase > SQL Editor) :
//   select cron.schedule(
//     'chrono-reward-midnight',
//     '1 0 * * *',   -- 00:01 chaque nuit (UTC — ajuste selon ton fuseau)
//     $$
//       select net.http_post(
//         url := 'https://<TON_PROJECT_REF>.supabase.co/functions/v1/chrono-reward',
//         headers := '{"Authorization": "Bearer <TON_ANON_KEY>"}'::jsonb,
//         body := '{}'::jsonb
//       );
//     $$
//   );
//
// Remplace <TON_PROJECT_REF> et <TON_ANON_KEY> par tes vraies valeurs.
// L'extension pg_net doit être activée (Supabase > Database > Extensions).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SB_URL            = Deno.env.get("SUPABASE_URL")!;
const SB_SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

serve(async () => {
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const [yd, mm, dd] = yesterday.split("-");

    // 1. Chercher le meilleur score d'hier non encore récompensé
    const scores = await api(
      `chrono_finish_scores?date_jour=eq.${yesterday}&rewarded=eq.false&order=temps_ms.asc&limit=1`
    );

    if (!scores || scores.length === 0) {
      return json({ ok: true, message: "Déjà récompensé ou aucun score hier" });
    }

    const winner = scores[0];

    // 2. Marquer TOUS les scores d'hier comme rewarded (idempotence)
    await api(`chrono_finish_scores?date_jour=eq.${yesterday}`, {
      method: "PATCH",
      body: JSON.stringify({ rewarded: true }),
      prefer: "return=minimal",
    });

    // 3. Récupérer les infos du vainqueur
    const jArr = await api(`joueurs?id=eq.${winner.joueur_id}&select=id,drix,photo`);
    if (!jArr || jArr.length === 0) {
      return json({ ok: false, message: "Joueur introuvable" }, 404);
    }

    const j = jArr[0];
    const drixAvant = j.drix || 1000;
    const drixApres = drixAvant + 20;

    // 4. Mettre à jour les DRIX
    await api(`joueurs?id=eq.${j.id}`, {
      method: "PATCH",
      body: JSON.stringify({ drix: drixApres }),
      prefer: "return=minimal",
    });

    // 5. Enregistrer le mouvement DRIX
    await api("drix_mouvements", {
      method: "POST",
      body: JSON.stringify({
        joueur_id:        j.id,
        joueur_pseudo:    winner.joueur_pseudo,
        adversaire_pseudo:"⏱ Chrono Finish — Vainqueur du jour",
        variation:        20,
        drix_avant:       drixAvant,
        drix_apres:       drixApres,
        resultat:         "victoire",
        date:             Date.now(),
      }),
    });

    // 6. Post sur le Comptoir
    await api("wall_posts", {
      method: "POST",
      body: JSON.stringify({
        joueur_id:     winner.joueur_id,
        joueur_pseudo: winner.joueur_pseudo,
        joueur_photo:  j.photo || null,
        contenu:       `🏆 Chrono Finish — Vainqueur du ${dd}/${mm}/${yd}\n👑 ${winner.joueur_pseudo} remporte le défi du jour en ${formatChrono(winner.temps_ms)} !\n🥇 +20 DRIX`,
        date:          Date.now(),
      }),
    });

    return json({
      ok:     true,
      winner: winner.joueur_pseudo,
      temps:  formatChrono(winner.temps_ms),
      drix:   drixApres,
    });

  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
