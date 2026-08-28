-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 3 sur 3 — VÉRIFICATION
--  Dart Point — verrouillage du Comptoir
--
--  ✅ CE FICHIER N'ÉCRIT RIEN. Il ne fait que regarder.
--  Il recompte les droits. Envoie le résultat à Claude.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
--  Un seul fichier à la fois, dans l'ordre des numéros.
-- ═══════════════════════════════════════════════════════════════════════════
-- ATTENDU :
--   wall_comments  →  SELECT
--   wall_likes     →  SELECT
--   wall_posts     →  INSERT, SELECT
--
-- ⚠️ Ce tableau dit ce que la base DÉCLARE. Claude fera en plus une vraie
-- tentative d'écriture pour vérifier ce qu'elle FAIT vraiment.

select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as droits
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('wall_comments', 'wall_likes', 'wall_posts')
   and grantee in ('anon', 'authenticated', 'PUBLIC')
 group by table_name, grantee
 order by table_name, grantee;
