-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 1 sur 3 — ÉTAT DES LIEUX
--  Dart Point — verrouillage du Comptoir
--
--  ✅ CE FICHIER N'ÉCRIT RIEN. Il ne fait que regarder.
--  Il montre qui a le droit d'écrire aujourd'hui. `anon` = n'importe quel visiteur.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
--  Un seul fichier à la fois, dans l'ordre des numéros.
-- ═══════════════════════════════════════════════════════════════════════════
-- Tu devrais voir INSERT, UPDATE, DELETE en face de `anon` : c'est le problème.
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as droits
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('wall_comments', 'wall_likes', 'wall_posts')
   and grantee in ('anon', 'authenticated', 'PUBLIC')
 group by table_name, grantee
 order by table_name, grantee;
