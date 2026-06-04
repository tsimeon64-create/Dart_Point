-- ════════════════════════════════════════════════════════════════════════════
-- SYSTÈME XP — colonnes sur la table joueurs
-- À exécuter dans : Supabase Dashboard > SQL Editor > New query > Run.
-- Sûr : n'ajoute que des colonnes (la colonne `niveau` existe déjà).
-- Tant que ce n'est pas exécuté, l'app affiche « Niveau 1 · Rookie · 0 XP »
-- partout et les gains d'XP échouent en silence (aucun crash).
-- ════════════════════════════════════════════════════════════════════════════

-- XP cumulé du joueur.
ALTER TABLE public.joueurs ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0;

-- Nb de badges déjà crédités en XP (compteur monotone) : évite de re-créditer
-- +100 à chaque ouverture du profil. On ne crédite que (badges_actuels - ce compteur).
ALTER TABLE public.joueurs ADD COLUMN IF NOT EXISTS xp_badges_credited integer NOT NULL DEFAULT 0;

-- Recharger le cache de schéma PostgREST (sinon l'API ignore les colonnes neuves).
NOTIFY pgrst, 'reload schema';
