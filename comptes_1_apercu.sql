-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 1 sur 2 — ÉTAT DES LIEUX
--  Dart Point — interdire la suppression de comptes joueurs
--
--  ✅ CE FICHIER N'ÉCRIT RIEN.
--  Il montre qui a le droit de supprimer un joueur aujourd'hui.
--  `anon` = n'importe quel visiteur. Tu devrais voir DELETE dans la liste.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
-- ═══════════════════════════════════════════════════════════════════════════
select grantee, string_agg(privilege_type, ', ' order by privilege_type) as droits
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name = 'joueurs'
   and grantee in ('anon', 'authenticated', 'PUBLIC')
 group by grantee
 order by grantee;
