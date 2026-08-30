-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 2 sur 2 — INTERDIRE L'EFFACEMENT
--  Dart Point
--
--  ⚠️ CE FICHIER ÉCRIT DANS LA BASE.
--
--  CE QUE ÇA EMPÊCHE : qu'un visiteur efface l'historique DRIX, les statistiques,
--  les bars de la carte, les associations ou les tournois.
--
--  CE QUE ÇA NE CASSE PAS : rien. Vérifié table par table, puis par contrôle
--  croisé sur TOUTES les suppressions lancées depuis le navigateur. La liste
--  complète est : amis, asso_posts, bar_recommandations, duels, live_volees,
--  presences, propositions, tournoi_inscriptions, tournois_potes,
--  tournois_potes_joueurs, tournois_potes_matchs, wall_likes.
--  Aucune des cinq tables ci-dessous n'y figure.
--  ⚠️ Attention aux noms qui se ressemblent : on ferme `tournois`, PAS
--  `tournois_potes` ni `tournoi_inscriptions`, que l'appli supprime vraiment.
--  Les suppressions admin passent par `admin-ops` (clé de service) : non concernées.
--
--  ⚠️ MODIFIER reste possible partout — donc les DRIX aussi. C'est le chantier
--  suivant, l'appli écrit les DRIX depuis le téléphone à ~45 endroits.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
-- ═══════════════════════════════════════════════════════════════════════════

revoke delete on public.drix_mouvements from anon, authenticated;
revoke delete on public.stats_joueurs   from anon, authenticated;
revoke delete on public.bars            from anon, authenticated;
revoke delete on public.associations    from anon, authenticated;
revoke delete on public.tournois        from anon, authenticated;

-- Un droit accordé au rôle PUBLIC ne serait pas retiré par les lignes ci-dessus.
revoke delete on public.drix_mouvements from public;
revoke delete on public.stats_joueurs   from public;
revoke delete on public.bars            from public;
revoke delete on public.associations    from public;
revoke delete on public.tournois        from public;

-- Vérification : plus aucune ligne ne doit contenir DELETE.
select table_name, grantee,
       string_agg(privilege_type, ', ' order by privilege_type) as droits
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('drix_mouvements','stats_joueurs','bars','associations','tournois')
   and grantee in ('anon', 'authenticated', 'PUBLIC')
 group by table_name, grantee
 order by table_name, grantee;

-- ────────────────────────────────────────────────────────────────────────────
-- EN CAS DE PROBLÈME — remettre comme avant
-- ────────────────────────────────────────────────────────────────────────────
-- grant delete on public.drix_mouvements, public.stats_joueurs, public.bars,
--                public.associations, public.tournois to anon, authenticated;
