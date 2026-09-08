-- ============================================================================
-- stats_1_reset_colonne.sql — bouton « Réinitialiser mes stats » (v135)
-- À coller dans Supabase → SQL Editor → Run (une fois). Relançable sans risque.
-- ============================================================================
-- Pourquoi : chaque joueur peut désormais remettre SES statistiques à zéro depuis
-- sa page Stats (double confirmation). L'appli n'efface rien : elle note la date de
-- la remise à zéro dans joueurs.stats_reset_at, et n'affiche plus que ce qui s'est
-- passé APRÈS (matchs, moyennes, séries…). Les compteurs parties / victoires /
-- défaites de stats_joueurs sont remis à 0 par l'appli au même moment.
-- DRIX, XP et badges ne sont pas touchés.
--
-- Ce script : 1) crée la colonne, 2) donne à l'appli le droit de la lire et de
-- l'écrire (la table joueurs est protégée colonne par colonne), 3) met à jour la
-- vue v_analyse_joueurs (liste des bots) pour qu'elle ignore aussi les duels
-- d'avant la remise à zéro — sinon la fiche du bot et le profil divergeraient.
-- ============================================================================

-- 1) La colonne (date en millisecondes, comme les autres dates de l'appli)
alter table public.joueurs add column if not exists stats_reset_at bigint;

-- 2) Les droits, colonne par colonne (même principe que joueurs_1b_droits.sql)
grant select (stats_reset_at) on public.joueurs to anon, authenticated;
grant update (stats_reset_at) on public.joueurs to anon, authenticated;

-- 2b) Les compteurs d'AVANT la remise à zéro, gardés dans stats_joueurs : les
--     badges (« 100 victoires »…) continuent de compter tout l'historique, alors
--     que les stats affichées repartent de zéro. Cumulés si le joueur remet à zéro
--     plusieurs fois.
alter table public.stats_joueurs
  add column if not exists parties_avant_reset   integer not null default 0,
  add column if not exists victoires_avant_reset integer not null default 0,
  add column if not exists defaites_avant_reset  integer not null default 0;
grant select (parties_avant_reset, victoires_avant_reset, defaites_avant_reset) on public.stats_joueurs to anon, authenticated;
grant update (parties_avant_reset, victoires_avant_reset, defaites_avant_reset) on public.stats_joueurs to anon, authenticated;

-- 3) La vue des bots : même définition que bots_1_vue_analyse.sql, PLUS le filtre
--    « duels postérieurs à la remise à zéro » dans dj.
create or replace function public.dp_num(t text) returns numeric
language sql immutable strict
set search_path = pg_catalog
as $$
  select case when t ~ '^-?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?$' then t::numeric else null end
$$;

create or replace view public.v_analyse_joueurs
with (security_invoker = true) as
with
dj as (
  select j.id as joueur_id,
         coalesce(j.pseudo, '') as pseudo,
         d.id as duel_id, d.date,
         d.gagnant_id::text = j.id::text as gagne,
         case when d.challenger_id::text = j.id::text then coalesce(nullif(d.challenger_pseudo, ''), j.pseudo, '')
              else coalesce(nullif(d.defie_pseudo, ''), j.pseudo, '') end as my_p,
         public.dp_num(case when d.challenger_id::text = j.id::text then d.score_challenger::text else d.score_defie::text end) as mon_score,
         d.manches_detail
  from public.joueurs j
  join public.duels d on d.statut = 'termine' and (d.challenger_id::text = j.id::text or d.defie_id::text = j.id::text)
   -- ⚠️ Remise à zéro des stats : on ignore tout ce qui est antérieur (comme l'appli :
   -- sans remise à zéro tout passe, même un vieux duel sans date)
   and coalesce(d.date, 0) >= coalesce(j.stats_reset_at, 0)
),
legs as (
  select dj.joueur_id,
         ((m->>'winner') = dj.my_p or (m->>'winner') = dj.pseudo) as is_w,
         m
  from dj
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(dj.manches_detail::jsonb) = 'array' then dj.manches_detail::jsonb else '[]'::jsonb end
  ) as m
),
legs_n as (
  select joueur_id, coalesce(is_w, false) as is_w,
         coalesce(public.dp_num(m->>(case when coalesce(is_w, false) then 'winner_volees' else 'loser_volees' end)), 0) as vol,
         coalesce(public.dp_num(m->>(case when coalesce(is_w, false) then 'winner_moy'    else 'loser_moy'    end)), 0) as moy,
         coalesce(public.dp_num(m->>(case when coalesce(is_w, false) then 'winner_180'    else 'loser_180'    end)), 0) as n180,
         coalesce(public.dp_num(m->>(case when coalesce(is_w, false) then 'winner_checkout_attempts' else 'loser_checkout_attempts' end)), 0) as co_att
  from legs
),
agg_legs as (
  select joueur_id,
         sum(case when moy > 0 then moy * greatest(1, vol) else 0 end) as sum_moy_w,
         sum(case when moy > 0 then greatest(1, vol) else 0 end)       as vol_moy,
         sum(n180)                                                     as n180,
         sum(co_att)                                                   as co_attempts,
         count(*) filter (where is_w and co_att > 0)                   as co_won,
         count(*) filter (where is_w)                                  as legs_won,
         count(*) filter (where not is_w)                              as legs_lost
  from legs_n
  group by joueur_id
),
agg_duels as (
  select joueur_id, count(*) as nb_duels,
         avg(mon_score) filter (where mon_score > 0) as moyenne_duels
  from dj
  group by joueur_id
),
forme as (
  select joueur_id, count(*) as n_forme,
         count(*) filter (where gagne) as v_forme
  from (
    select joueur_id, gagne,
           row_number() over (partition by joueur_id order by date desc nulls last, duel_id desc) as rn
    from dj
  ) x
  where rn <= 10
  group by joueur_id
),
stats as (
  select distinct on (joueur_id) joueur_id, parties, victoires
  from public.stats_joueurs
  order by joueur_id, id
)
select j.id                                   as joueur_id,
       j.pseudo,
       coalesce(j.drix, 1000)                 as drix,
       coalesce(s.parties, 0)                 as parties,
       coalesce(s.victoires, 0)               as victoires,
       case when coalesce(s.parties, 0) > 0
            then round(s.victoires::numeric / s.parties * 100) else 0 end          as win_rate,
       coalesce(f.n_forme, 0)                 as n_forme,
       coalesce(f.v_forme, 0)                 as v_forme,
       case when coalesce(f.n_forme, 0) > 0
            then f.v_forme::numeric / f.n_forme else 0 end                        as forme_pct,
       coalesce(ad.nb_duels, 0)               as nb_duels,
       case when coalesce(al.vol_moy, 0) > 0 then round(al.sum_moy_w / al.vol_moy)
            when ad.moyenne_duels is not null then round(round(ad.moyenne_duels, 1))
            else null end                                                          as avg_reel,
       case when coalesce(al.co_attempts, 0) > 0
            then round(al.co_won::numeric / al.co_attempts * 100) else null end   as checkout_pct,
       coalesce(al.co_attempts, 0)            as co_attempts,
       coalesce(al.co_won, 0)                 as co_won,
       coalesce(al.n180, 0)                   as n180,
       coalesce(al.legs_won, 0)               as legs_won,
       coalesce(al.legs_lost, 0)              as legs_lost
from public.joueurs j
left join stats     s  on s.joueur_id::text = j.id::text
left join forme     f  on f.joueur_id  = j.id
left join agg_legs  al on al.joueur_id = j.id
left join agg_duels ad on ad.joueur_id = j.id;

grant select  on public.v_analyse_joueurs to anon, authenticated;
grant execute on function public.dp_num(text) to anon, authenticated;

-- Vérification : la colonne existe et l'appli (anon) peut la lire et l'écrire
select column_name, privilege_type
  from information_schema.column_privileges
 where table_schema = 'public' and table_name = 'joueurs'
   and grantee = 'anon' and column_name = 'stats_reset_at'
 order by privilege_type;
