-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 1 sur 2 — NOUVELLES INFOS SUR LA FICHE JOUEUR
--  Dart Point — ligue, département, date de naissance
--
--  ⚠️ CE FICHIER MODIFIE LA STRUCTURE DE LA BASE (il ajoute des colonnes).
--  Il ne touche AUCUNE donnée existante : les colonnes arrivent vides.
--
--  POURQUOI : pour pouvoir faire la cartographie des joueurs — trouver
--  quelqu'un près de chez soi.
--
--  ⚠️⚠️ 4 ÉTAPES, DANS CET ORDRE EXACT :
--    1) CE FICHIER (crée les colonnes)
--    2) Recoller la fonction Edge `auth` dans le dashboard
--       (sans ça, ville et département saisis à l'inscription sont jetés en silence)
--    3) Laisser l'appli se mettre en ligne
--    4) joueurs_2_message.sql (le message aux 150 joueurs)
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.joueurs add column if not exists ligue          text;
alter table public.joueurs add column if not exists departement    text;
alter table public.joueurs add column if not exists date_naissance date;

-- La colonne `age` est CONSERVÉE : seuls 18 joueurs sur 152 l'avaient remplie,
-- mais l'effacer ferait disparaître leur info pour rien. L'appli affichera
-- désormais l'âge calculé depuis la date de naissance quand elle existe, et
-- retombera sur l'ancienne colonne sinon.

-- Vérification : les trois colonnes doivent apparaître.
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'joueurs'
   and column_name in ('ligue', 'departement', 'date_naissance', 'age')
 order by column_name;
