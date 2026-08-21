-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 1 sur 4 — APERÇU
--  Dart Point — rattrapage de l'accueil des 72 joueurs arrivés sans message
--
--  ✅ CE FICHIER N'ÉCRIT RIEN. Il ne fait que regarder.
--  Il compte combien de joueurs vont recevoir le message. Note le chiffre.
--
--  À FAIRE : Dashboard Supabase → SQL Editor → tout coller → Run.
--  Un seul fichier à la fois, dans l'ordre des numéros.
-- ═══════════════════════════════════════════════════════════════════════════
select count(*) as joueurs_a_contacter
  from public.joueurs j
 where j.date_inscription >= 1785403920000
   and j.id::text <> '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and not exists (select 1 from public.messages m
                    where m.from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
                      and m.to_id::text = j.id::text);
