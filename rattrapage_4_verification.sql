-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 4 sur 4 — VÉRIFICATION
--  Dart Point — rattrapage de l'accueil des 72 joueurs arrivés sans message
--
--  ✅ CE FICHIER N'ÉCRIT RIEN. Il ne fait que regarder.
--  Il recompte pour confirmer que tout est parti.
--
--  À FAIRE : Dashboard Supabase → SQL Editor → tout coller → Run.
--  Un seul fichier à la fois, dans l'ordre des numéros.
-- ═══════════════════════════════════════════════════════════════════════════
select (select count(*) from public.amis
         where joueur_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44')              as amis_de_thomas,
       (select count(*) from public.messages
         where from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44' and lu = false) as messages_non_lus_envoyes;
