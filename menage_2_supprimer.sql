-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 2 sur 2 — LE MÉNAGE
--  Dart Point — supprime les commentaires « . » signés Thomas
--
--  ⚠️ CE FICHIER SUPPRIME DÉFINITIVEMENT 149 LIGNES. C'est irréversible.
--  Lance d'abord le fichier 1 et vérifie les nombres (146 et 3).
--
--  CE QUI EST SUPPRIMÉ : uniquement les commentaires signés Thomas, SANS DATE,
--  dont le contenu est « . » ou un message d'erreur technique.
--  CE QUI RESTE : les 22 vrais commentaires, et les 2 sans date qui ressemblent
--  à de vrais messages (« OUAI GG MON POTE » et l'autre).
--
--  ⚠️ LES ::text NE SONT PAS DÉCORATIFS. wall_comments.id est un uuid alors que
--  wall_likes.ref_id est du texte : Postgres refuse de comparer les deux
--  (erreur 42883). Comparer les deux côtés en texte marche quel que soit le
--  type réel des colonnes.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. D'abord les j'aime accrochés à ces commentaires, sinon ils resteraient
--    orphelins (un j'aime pointe le commentaire par ref_id).
delete from public.wall_likes
 where ref_id::text in (
   select id::text from public.wall_comments
    where joueur_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
      and date is null
      and (contenu = '.' or contenu like 'POST http%')
 );

-- 2. Puis les commentaires eux-mêmes.
delete from public.wall_comments
 where joueur_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and date is null
   and (contenu = '.' or contenu like 'POST http%');

-- 3. Vérification : doit renvoyer 0.
select count(*) as restant
  from public.wall_comments
 where joueur_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and date is null
   and (contenu = '.' or contenu like 'POST http%');
