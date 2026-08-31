-- ═══════════════════════════════════════════════════════════════════════════
--  À LANCER JUSTE APRÈS joueurs_1_colonnes.sql
--  Dart Point — ouvrir l'accès aux 3 nouvelles colonnes
--
--  ⚠️ CE FICHIER MODIFIE DES DROITS. Il ne touche aucune donnée.
--
--  POURQUOI CE FICHIER EXISTE :
--  La table `joueurs` est protégée COLONNE PAR COLONNE (c'est le verrouillage
--  fait à l'époque pour que le mot de passe ne sorte jamais). Une colonne
--  ajoutée après coup n'hérite de RIEN : l'appli reçoit « accès refusé »
--  (42501) en essayant de la lire, et les champs restent vides pour toujours.
--
--  Mesuré avant d'écrire ce fichier :
--    ligue / departement / date_naissance  →  401, code 42501 (refusé)
--    ville / age                           →  200 (lisibles)
--  Donc les colonnes existent bien, il leur manque juste le droit d'accès.
--
--  ⚠️ On n'ouvre QUE ces 3 colonnes, une par une. Surtout pas la table entière :
--  ça rouvrirait l'accès au mot de passe.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
-- ═══════════════════════════════════════════════════════════════════════════

grant select (ligue, departement, date_naissance) on public.joueurs to anon, authenticated;
grant update (ligue, departement, date_naissance) on public.joueurs to anon, authenticated;

-- Vérification : les 3 colonnes doivent apparaître avec SELECT et UPDATE.
-- ⚠️ Le mot de passe ne doit PAS être dans cette liste.
select column_name, privilege_type
  from information_schema.column_privileges
 where table_schema = 'public' and table_name = 'joueurs'
   and grantee = 'anon'
   and column_name in ('ligue', 'departement', 'date_naissance', 'password_hash')
 order by column_name, privilege_type;
