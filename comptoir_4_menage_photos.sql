-- ─────────────────────────────────────────────────────────────────────────────
-- Dart Point — MÉNAGE DES VIEILLES PHOTOS DU COMPTOIR (03/10/2026)
-- À lancer dans Supabase → SQL Editor quand tu veux faire le ménage.
--
-- Les photos publiées au Comptoir sont stockées dans la colonne `image_url` de
-- `wall_posts` (image entière, ~150 Ko chacune). Avant août 2026, l'appli les
-- effaçait toute seule au bout de 14 jours ; depuis que le Comptoir est verrouillé,
-- elle n'a plus le droit d'écrire, donc le ménage se fait ici.
--
-- Ce script n'efface AUCUNE publication : il enlève seulement la photo. Le message,
-- les j'aime et les commentaires restent.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) D'ABORD REGARDER : combien de photos ont plus de 14 jours, et ce que ça pèse.
select count(*)                                   as photos_a_nettoyer,
       pg_size_pretty(sum(length(image_url))::bigint) as poids
  from public.wall_posts
 where image_url is not null
   and date < (extract(epoch from now()) * 1000)::bigint - 14 * 86400000;

-- 2) PUIS NETTOYER (décommente la ligne du dessous en enlevant les deux tirets).
-- update public.wall_posts set image_url = null
--  where image_url is not null
--    and date < (extract(epoch from now()) * 1000)::bigint - 14 * 86400000;

-- 3) VÉRIFIER : il doit rester 0 photo de plus de 14 jours.
select count(*) as photos_restantes_de_plus_de_14_jours
  from public.wall_posts
 where image_url is not null
   and date < (extract(epoch from now()) * 1000)::bigint - 14 * 86400000;
