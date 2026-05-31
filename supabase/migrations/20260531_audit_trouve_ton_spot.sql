-- ════════════════════════════════════════════════════════════════════════════
-- AUDIT « Trouve ton spot » — durcissement backend (bars / associations / …)
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query > Run.
-- ⚠️ LIS chaque section AVANT de l'exécuter — certaines parties dépendent de ton
--    modèle d'auth admin (voir §4) et peuvent casser le panneau admin si appliquées
--    telles quelles. Les §1 à §3 sont sûres et recommandées tout de suite.
-- ════════════════════════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────────────────────────────────────
-- §1 · UNICITÉ DES SLUGS  (corrige la corruption en cascade du CRUD par-slug)
-- ─────────────────────────────────────────────────────────────────────────────
-- Le code crée les slugs avec slugify(nom+"-"+ville). Sans contrainte, deux bars
-- homonymes dans la même ville partagent le même slug → updateBar/deleteBar par
-- slug=eq. touchent les DEUX lignes. La contrainte UNIQUE rend ça impossible.

-- 1a. Détecter les doublons AVANT d'ajouter la contrainte (doit renvoyer 0 ligne) :
--     SELECT slug, count(*) FROM public.bars         GROUP BY slug HAVING count(*) > 1;
--     SELECT slug, count(*) FROM public.associations GROUP BY slug HAVING count(*) > 1;

-- 1b. Si des doublons existent, suffixe-les manuellement (exemple, à adapter) :
--     WITH d AS (
--       SELECT id, slug, row_number() OVER (PARTITION BY slug ORDER BY id) AS rn
--       FROM public.bars
--     )
--     UPDATE public.bars b SET slug = b.slug || '-' || d.rn
--     FROM d WHERE b.id = d.id AND d.rn > 1;

-- 1c. Poser les contraintes (une fois les doublons résolus) :
ALTER TABLE public.bars         ADD CONSTRAINT bars_slug_unique         UNIQUE (slug);
ALTER TABLE public.associations ADD CONSTRAINT associations_slug_unique UNIQUE (slug);
-- (Optionnel, si pertinent pour les tournois :)
-- ALTER TABLE public.tournois  ADD CONSTRAINT tournois_slug_unique     UNIQUE (slug);


-- ─────────────────────────────────────────────────────────────────────────────
-- §2 · MODÉRATION DES SIGNALEMENTS « pas de cible »  (remplace la suppression auto)
-- ─────────────────────────────────────────────────────────────────────────────
-- Le client ne supprime plus de bar automatiquement (corrigé côté app). On ajoute
-- un drapeau pour qu'un admin puisse repérer/traiter les bars très signalés.
ALTER TABLE public.bars ADD COLUMN IF NOT EXISTS signale boolean DEFAULT false;

-- Anti-spam des signalements : 1 vote par (bar, joueur). Si la table existe :
-- ALTER TABLE public.bar_cible_reports
--   ADD CONSTRAINT bar_cible_unique UNIQUE (bar_slug, joueur_id);


-- ─────────────────────────────────────────────────────────────────────────────
-- §3 · MODÉRATION DES PHOTOS COMMUNAUTAIRES
-- ─────────────────────────────────────────────────────────────────────────────
-- Les photos s'affichent (et deviennent la cover du spot) immédiatement, sans
-- modération, et sont stockées en base64 dans la colonne `data` (lourd).
-- Étape 1 (rapide) : flag de validation. À câbler ensuite côté UI (n'afficher que
-- valide=true, ou la cover seulement si validée).
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS valide boolean DEFAULT false;

-- Étape 2 (recommandée à terme) : migrer le stockage base64 → Supabase Storage
--   et ne garder qu'une URL en base (gain de bande passante + sécurité).
--   Voir https://supabase.com/docs/guides/storage


-- ─────────────────────────────────────────────────────────────────────────────
-- §4 · RLS — LE POINT CRITIQUE (à lire avant d'appliquer)
-- ─────────────────────────────────────────────────────────────────────────────
-- La clé du bundle est une clé ANON publiable : tout visiteur peut appeler
-- l'API REST directement. Aujourd'hui, si les policies autorisent l'anon en
-- UPDATE/DELETE (souvent `USING (true)`), N'IMPORTE QUI peut supprimer/écraser
-- bars, assos, avis, photos — y compris un `DELETE` sans filtre = toute la table.
--
-- ⚠️ DIFFICULTÉ : le PANNEAU ADMIN de l'app utilise LUI AUSSI la clé anon
--    (validerBar, toggleVerifie, deleteBar admin, updateBar…). Donc bloquer
--    bêtement l'anon en UPDATE/DELETE casserait l'admin.
--
-- Vérifie d'abord les policies actuelles :
--   SELECT tablename, policyname, cmd, roles, qual, with_check
--   FROM pg_policies WHERE schemaname='public'
--     AND tablename IN ('bars','associations','tournois','avis','photos');
--
-- ── Modèle CIBLE recommandé (à mettre en place progressivement) ───────────────
--   • SELECT  : public (anon)                       → lecture OK pour tous
--   • INSERT  : anon autorisé MAIS encadré          → propositions communautaires
--   • UPDATE  : interdit à l'anon SAUF colonnes sûres (vues, signale) via RPC
--   • DELETE  : INTERDIT à l'anon                    → jamais de suppression publique
--   • Admin   : passe par une Edge Function avec la SERVICE ROLE KEY (jamais
--               exposée au client) OU par Supabase Auth + rôle/claim admin.
--
-- Exemple de policies (À ADAPTER — n'applique pas tel quel sans avoir migré
-- l'admin vers une Edge Function/JWT, sinon l'admin ne pourra plus supprimer) :
--
--   ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;
--   -- lecture publique
--   CREATE POLICY bars_select_public ON public.bars FOR SELECT USING (true);
--   -- création communautaire (anon) — la fiche naît non vérifiée
--   CREATE POLICY bars_insert_anon ON public.bars FOR INSERT TO anon
--     WITH CHECK (verifie = false);
--   -- PAS de policy UPDATE/DELETE pour anon  → ces opérations deviennent
--   --   impossibles avec la clé publique. Les faire via Edge Function (service key).
--
-- Compteur de vues atomique (évite le read-modify-write client et permet de
-- garder l'incrément même sans UPDATE anon) :
--   CREATE OR REPLACE FUNCTION public.increment_bar_vues(p_slug text)
--   RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
--     UPDATE public.bars SET vues = COALESCE(vues,0) + 1 WHERE slug = p_slug;
--   $$;
--   -- puis côté app : sb('rpc/increment_bar_vues', {method:'POST', body:{p_slug:slug}})
--
-- ── Action minimale conseillée TOUT DE SUITE ──────────────────────────────────
-- Au strict minimum, retire toute policy DELETE pour le rôle `anon` sur les
-- tables de contenu (un visiteur ne doit jamais pouvoir supprimer) :
--   -- (liste tes policies via la requête pg_policies ci-dessus, puis :)
--   -- DROP POLICY <nom_policy_delete_anon> ON public.bars;
--   -- DROP POLICY <nom_policy_delete_anon> ON public.associations;
--   -- DROP POLICY <nom_policy_delete_anon> ON public.photos;
--   -- DROP POLICY <nom_policy_delete_anon> ON public.avis;
-- et bascule la suppression admin derrière une Edge Function (service key).


-- ─────────────────────────────────────────────────────────────────────────────
-- §5 · Recharger le cache de schéma PostgREST après les ALTER TABLE
-- ─────────────────────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
