-- ═══════════════════════════════════════════════════════════════════════════
--  SUPPRIMER L'ASSOCIATION DE TEST « Magny »
--  Dart Point
--
--  ⚠️ CE FICHIER SUPPRIME UNE LIGNE, DÉFINITIVEMENT.
--
--  CE QUI EST SUPPRIMÉ : une seule association.
--     nom      Magny
--     slug     magny-magny-cours
--     ville    Magny-Cours
--     position 46.650934 , 4.3328929  (à ~90 km de Magny-Cours)
--
--  VÉRIFIÉ AVANT : aucun joueur rattaché, aucune annonce de club, aucune photo.
--  Rien ne deviendra orphelin.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Aperçu : doit afficher UNE ligne, la bonne. Regarde avant de continuer.
select nom, slug, ville, lat, lng
  from public.associations
 where slug = 'magny-magny-cours';

-- 2. La suppression.
delete from public.associations
 where slug = 'magny-magny-cours';

-- 3. Vérification : doit renvoyer 0.
select count(*) as restant
  from public.associations
 where slug = 'magny-magny-cours';
