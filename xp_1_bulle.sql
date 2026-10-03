-- ─────────────────────────────────────────────────────────────────────────────
-- Dart Point — BONUS DE BULLE : une seule fois par match (03/10/2026)
-- À lancer UNE fois dans Supabase → SQL Editor → Run.
-- Ce script AJOUTE une colonne à deux tables. Il n'efface rien.
--
-- Le joueur qui gagne la bulle reçoit 100 XP à la première volée du match. Cette
-- colonne garde QUI a été payé pour ce match : sans elle, quelqu'un pourrait
-- relancer le même match en boucle et encaisser 100 XP à chaque fois.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.duels
  add column if not exists bulle_xp_joueur uuid;

alter table public.tournois_potes_matchs
  add column if not exists bulle_xp_joueur uuid;

-- Droits : l'appli pose cette marque depuis le téléphone, avec la clé publique.
grant select (bulle_xp_joueur), update (bulle_xp_joueur) on public.duels            to anon, authenticated;
grant select (bulle_xp_joueur), update (bulle_xp_joueur) on public.tournois_potes_matchs to anon, authenticated;

-- Vérification : ces 2 lignes doivent s'afficher.
select table_name, column_name
  from information_schema.columns
 where table_schema = 'public'
   and column_name  = 'bulle_xp_joueur'
 order by table_name;
