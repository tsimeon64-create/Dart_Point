-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 1 sur 2 — ÉTAT DES LIEUX
--  Dart Point — interdire l'effacement de l'historique, de la carte et de l'annuaire
--
--  ✅ CE FICHIER N'ÉCRIT RIEN.
--  Tu devrais voir DELETE en face de `anon` sur plusieurs lignes.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
-- ═══════════════════════════════════════════════════════════════════════════
select table_name, grantee,
       string_agg(privilege_type, ', ' order by privilege_type) as droits
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('drix_mouvements','stats_joueurs','bars','associations','tournois')
   and grantee in ('anon', 'authenticated', 'PUBLIC')
 group by table_name, grantee
 order by table_name, grantee;
