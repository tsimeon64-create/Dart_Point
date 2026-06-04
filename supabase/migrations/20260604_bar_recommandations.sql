-- ════════════════════════════════════════════════════════════════════════════
-- « JE RECOMMANDE CE BAR » — table des recommandations communautaires
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query > Run.
-- Sûr à appliquer tel quel. Tant que cette table n'existe pas, le bouton
-- s'affiche mais la recommandation n'est pas persistée (l'app dégrade en douceur).
-- ════════════════════════════════════════════════════════════════════════════

-- 1 recommandation par (bar, joueur), réversible (le joueur peut retirer la sienne).
-- Calque le modèle de bar_cible_reports : bar_slug (text) + joueur_id (uuid).
CREATE TABLE IF NOT EXISTS public.bar_recommandations (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  bar_slug    text        NOT NULL,
  joueur_id   uuid        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bar_slug, joueur_id)
);

-- Index de comptage par bar (la fiche lit toutes les recos d'un slug).
CREATE INDEX IF NOT EXISTS bar_recommandations_slug_idx
  ON public.bar_recommandations (bar_slug);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS — l'app utilise la clé ANON publiable. On autorise :
--   • SELECT : public (afficher le compteur)
--   • INSERT : public (recommander)         — la contrainte UNIQUE empêche le spam
--   • DELETE : public (retirer SA reco)     — réversibilité du bouton
-- Pas d'UPDATE (une reco ne se modifie pas, elle existe ou non).
-- ⚠️ Un visiteur peut techniquement supprimer la ligne d'un autre via l'API : pour
--    durcir plus tard, basculer le DELETE derrière une RPC SECURITY DEFINER filtrant
--    sur joueur_id. Acceptable ici (impact = un compteur de reco, pas de donnée
--    sensible) et cohérent avec le reste des tables communautaires.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.bar_recommandations ENABLE ROW LEVEL SECURITY;

CREATE POLICY bar_reco_select ON public.bar_recommandations
  FOR SELECT USING (true);
CREATE POLICY bar_reco_insert ON public.bar_recommandations
  FOR INSERT WITH CHECK (true);
CREATE POLICY bar_reco_delete ON public.bar_recommandations
  FOR DELETE USING (true);

-- Recharger le cache de schéma PostgREST (sinon l'API renvoie 404 sur la table neuve).
NOTIFY pgrst, 'reload schema';
