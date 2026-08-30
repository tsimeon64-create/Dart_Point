-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 1 sur 2 — APERÇU DU MÉNAGE
--  Dart Point — les commentaires « . » signés Thomas
--
--  ✅ CE FICHIER N'ÉCRIT RIEN. Il ne fait que compter.
--  Il montre exactement ce que le fichier 2 supprimerait.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- Ces commentaires n'ont PAS de date, alors que l'appli en met toujours une :
-- ils n'ont donc pas été écrits depuis Dart Point.
select case when contenu = '.' then 'un simple point'
            else 'message d''erreur technique' end as sorte,
       count(*) as combien
  from public.wall_comments
 where joueur_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and date is null
   and (contenu = '.' or contenu like 'POST http%')
 group by 1
 order by 2 desc;
