-- ─────────────────────────────────────────────────────────────────────────────
-- Dart Point — STATS DES MATCHS DE TOURNOI (29/09/2026)
-- À lancer UNE fois dans Supabase → SQL Editor → Run.
-- Ce script AJOUTE 4 colonnes. Il n'efface rien et ne modifie aucune donnée.
--
-- Aujourd'hui, un match de tournoi ne garde que le score en manches. Le scoreur, lui,
-- calcule déjà la moyenne de chaque équipe et le détail manche par manche : après ce
-- script, l'appli les enregistre aussi (et le numéro de la partie, pour retrouver les
-- volées). Les matchs déjà joués ne changent pas ; seuls les PROCHAINS seront complets.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.tournois_potes_matchs
  add column if not exists moy_j1         numeric,   -- moyenne de l'équipe 1 sur ce match
  add column if not exists moy_j2         numeric,   -- moyenne de l'équipe 2
  add column if not exists manches_detail jsonb,     -- détail manche par manche (fléchettes, 180, finish…)
  add column if not exists session_id     uuid;      -- la partie du scoreur (pour retrouver les volées)

-- Droits d'écriture sur ces 4 colonnes (l'appli écrit depuis le téléphone avec la clé publique).
grant select (moy_j1, moy_j2, manches_detail, session_id),
      update (moy_j1, moy_j2, manches_detail, session_id)
  on public.tournois_potes_matchs to anon, authenticated;

-- Vérification : ces 4 lignes doivent s'afficher.
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name   = 'tournois_potes_matchs'
   and column_name in ('moy_j1', 'moy_j2', 'manches_detail', 'session_id')
 order by column_name;
