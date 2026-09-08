-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 1 sur 2 — NOUVELLE SAISON DART POINT : L'APERÇU (n'écrit RIEN)
--
--  À lancer AVANT saison_2_cloture.sql, pour voir ce qui va se passer :
--    1) le classement final de la saison 2026 tel qu'il sera archivé
--    2) combien de joueurs recevront le message de nouvelle saison
--    3) l'état de la table d'archive (drix_historique)
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
--  Le résultat affiché en bas est celui de la DERNIÈRE requête ; les autres
--  s'affichent dans les onglets de résultats (ou lance-les une par une).
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) LE CLASSEMENT FINAL QUI SERA ARCHIVÉ
--    Classé = au moins un vrai match (victoire/défaite en duel, non annulé) ou des
--    DRIX qui ont bougé. Comptes anonymisés et compte de test « Toto » exclus.
--    (Exactement le même filtre que l'étape B de saison_2_cloture.sql.)
select row_number() over (order by coalesce(j.drix, 1000) desc, j.pseudo) as rang,
       j.pseudo, coalesce(j.drix, 1000) as drix, j.asso_slug, j.bar_slug,
       s.parties, s.victoires
  from public.joueurs j
  left join lateral (select parties, victoires from public.stats_joueurs s
                      where s.joueur_id::text = j.id::text order by s.id limit 1) s on true
 where coalesce(j.anonymise, false) = false
   and j.pseudo <> 'Toto'
   and (coalesce(j.drix, 1000) <> 1000
        or exists (select 1 from public.drix_mouvements m
                    where m.joueur_id::text = j.id::text and m.duel_id is not null
                      and m.resultat in ('victoire', 'defaite')
                      and not exists (select 1 from public.drix_mouvements a
                                       where a.duel_id = m.duel_id and a.resultat = 'annule')))
 order by rang;

-- 2) COMBIEN DE JOUEURS RECEVRONT LE MESSAGE (tout le monde sauf toi, les anonymisés et Toto)
select count(*) as joueurs_a_prevenir
  from public.joueurs j
 where j.id::text <> '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and coalesce(j.anonymise, false) = false
   and j.pseudo <> 'Toto'
   and not exists (select 1 from public.messages m
                    where m.from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
                      and m.to_id::text = j.id::text
                      and m.contenu like '%saison officielle 2026-2027%');

-- 3) LA TABLE D'ARCHIVE : ses colonnes, et ce qu'elle contient déjà (doit être vide)
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public' and table_name = 'drix_historique'
 order by ordinal_position;

select saison, count(*) as joueurs_archives
  from public.drix_historique
 group by saison
 order by saison desc;
