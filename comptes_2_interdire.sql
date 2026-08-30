-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 2 sur 2 — INTERDIRE LA SUPPRESSION DE COMPTES
--  Dart Point
--
--  ⚠️ CE FICHIER ÉCRIT DANS LA BASE.
--
--  CE QUE ÇA EMPÊCHE : qu'un visiteur efface le compte d'un joueur (ou tous).
--  CE QUE ÇA NE CASSE PAS : rien. Vérifié dans tout le code — l'appli ne
--  supprime JAMAIS de joueur depuis le téléphone. Ta suppression admin passe
--  par la fonction `admin-ops` (opération « supprimeJoueur »), qui utilise la
--  clé de service et n'est donc pas concernée par ces règles.
--  La suppression de compte par le joueur lui-même passe par la fonction
--  `auth` : elle ANONYMISE la ligne au lieu de l'effacer, pour ne pas fausser
--  les statistiques des autres. Elle continue de fonctionner.
--
--  ⚠️ MODIFIER un joueur (donc les DRIX) reste possible : c'est un autre
--  chantier, l'appli écrit les DRIX depuis le téléphone à ~45 endroits.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
-- ═══════════════════════════════════════════════════════════════════════════

revoke delete on public.joueurs from anon, authenticated;

-- Un droit accordé au rôle PUBLIC ne serait pas retiré par la ligne ci-dessus.
-- Celle-ci ne fait rien s'il n'y en a pas.
revoke delete on public.joueurs from public;

-- Vérification : la colonne `droits` ne doit PLUS contenir DELETE.
select grantee, string_agg(privilege_type, ', ' order by privilege_type) as droits
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name = 'joueurs'
   and grantee in ('anon', 'authenticated', 'PUBLIC')
 group by grantee
 order by grantee;

-- ────────────────────────────────────────────────────────────────────────────
-- EN CAS DE PROBLÈME — remettre comme avant (à ne lancer que si nécessaire)
-- ────────────────────────────────────────────────────────────────────────────
-- grant delete on public.joueurs to anon, authenticated;
