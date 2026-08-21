-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 2 sur 4 — L'AMITIÉ
--  Dart Point — rattrapage de l'accueil des 72 joueurs arrivés sans message
--
--  ⚠️ CE FICHIER ÉCRIT DANS LA BASE.
--  Il te met en ami avec ces joueurs. Sans danger si relancé : rien ne part en double.
--
--  À FAIRE : Dashboard Supabase → SQL Editor → tout coller → Run.
--  Un seul fichier à la fois, dans l'ordre des numéros.
-- ═══════════════════════════════════════════════════════════════════════════
-- Une ligne par joueur, dans le sens Thomas → joueur, comme le fait la fonction
-- `auth` à l'inscription. Les joueurs DÉJÀ amis (dans un sens ou dans l'autre)
-- sont sautés : quelqu'un qui t'aurait retiré volontairement n'est PAS réajouté.
--
-- Les ::text ne sont pas décoratifs : joueurs.id est un uuid et les identifiants
-- des autres tables sont du texte. Sans ça, Postgres refuse de comparer (42883).
-- ───────────────────────────────────────────────────────────────────────────
insert into public.amis (joueur_id, joueur_pseudo, ami_id, ami_pseudo, statut, date)
select '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44', 'Thomas', j.id, j.pseudo, 'accepte',
       (extract(epoch from now()) * 1000)::bigint   -- amis.date est en millisecondes
  from public.joueurs j
 where j.date_inscription >= 1785403920000
   and j.id::text <> '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and not exists (select 1 from public.amis a
                    where (a.joueur_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44' and a.ami_id::text = j.id::text)
                       or (a.joueur_id::text = j.id::text and a.ami_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'));
