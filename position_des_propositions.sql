-- ═══════════════════════════════════════════════════════════════════════════
--  POSITION DES ASSOCIATIONS PROPOSÉES — à lancer UNE FOIS dans Supabase
--  (Dashboard → SQL Editor → coller → Run)
--
--  Le formulaire « Proposer une association » demande maintenant où se trouve
--  le club (position GPS ou recherche d'adresse). Ces deux colonnes gardent
--  cette position jusqu'à la validation par l'admin — sans elles, il faut
--  retrouver le club sur la carte à la main.
--
--  ⚠️ Pas urgent : le formulaire fonctionne déjà sans. Si la base refuse la
--  position, l'appli renvoie la proposition sans elle plutôt que d'échouer.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.propositions add column if not exists lat double precision;
alter table public.propositions add column if not exists lng double precision;

-- Vérification : doit afficher les deux colonnes, sans erreur.
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'propositions'
   and column_name in ('lat', 'lng')
 order by column_name;
