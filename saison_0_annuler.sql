-- ═══════════════════════════════════════════════════════════════════════════
--  RETOUR ARRIÈRE — annule saison_2_cloture.sql (⚠️ ÉCRIT)
--
--  À n'utiliser QUE si tu changes d'avis TOUT DE SUITE après la clôture,
--  avant que de nouveaux matchs soient joués : ce script remet à chaque joueur
--  les DRIX qu'il avait juste avant la remise à 1000 (la valeur « drix_avant »
--  de sa ligne « Nouvelle saison 2026-2027 »). Un match joué entre temps serait
--  donc « oublié » dans les DRIX.
--
--  Ce qu'il fait :
--    1) remet les DRIX d'avant (seulement aux joueurs encore à 1000)
--    2) efface les lignes « Nouvelle saison 2026-2027 » de l'historique DRIX
--    3) efface l'archive de la saison 2026
--    4) efface le message de nouvelle saison envoyé par Thomas
--  Sans effet si la clôture n'a pas été faite. Relançable.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) Les DRIX d'avant (la ligne « saison » de chaque joueur en garde la trace exacte)
update public.joueurs j
   set drix = m.drix_avant
  from public.drix_mouvements m
 where m.joueur_id::text = j.id::text
   and m.resultat = 'saison'
   and m.adversaire_pseudo = 'Nouvelle saison 2026-2027'
   and j.drix = 1000;

-- 2) Les lignes « saison » (APRÈS l'étape 1, qui en a besoin)
delete from public.drix_mouvements
 where resultat = 'saison' and adversaire_pseudo = 'Nouvelle saison 2026-2027';

-- 3) L'archive
delete from public.drix_historique where saison = 2026;

-- 4) Le message
delete from public.messages
 where from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and contenu like '%saison officielle 2026-2027%';

-- Vérification : archive vide, plus de ligne « saison », DRIX revenus (≈ 59 joueurs ≠ 1000)
select (select count(*) from public.drix_historique where saison = 2026)      as archive_restante,
       (select count(*) from public.drix_mouvements where resultat = 'saison') as lignes_saison_restantes,
       (select count(*) from public.joueurs where drix <> 1000)                as joueurs_pas_a_1000;
