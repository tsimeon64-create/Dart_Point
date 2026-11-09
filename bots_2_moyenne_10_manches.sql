-- ============================================================================
-- bots_2_moyenne_10_manches.sql
-- Copie tout et lance-le dans Supabase → SQL Editor → Run (une seule fois).
-- ============================================================================
-- Ce que ça change : dans la liste « Affronter un ami », la MOY d'un joueur devient
-- sa moyenne sur ses 10 DERNIÈRES MANCHES jouées en match DRIX (vrais duels
-- 'drix' ou 'rivalite', terminés, en 501 ou 301 — pas le Cricket, pas les amicaux,
-- pas les parties contre un bot). Ce sont aussi les manches que son bot rejoue.
-- Avant, c'était sa moyenne sur ses 10 derniers matchs, de tout type.
--
-- Ce script ne MODIFIE aucune donnée : il remplace seulement la « vue »
-- v_analyse_joueurs (une table calculée à la volée). Toutes les autres colonnes
-- restent exactement les mêmes. Il peut être relancé sans risque.
--
-- Colonnes changées (mêmes noms, même place) :
--   avg_10 = sa moyenne sur ses 10 dernières manches DRIX (pondérée par les volées) ;
--   n_10   = combien de manches elle couvre (10, ou moins s'il en a joué moins).
--
-- ⚠️ Les additions reproduisent EXACTEMENT moyenneDernieresManches
-- (src/moyenneRecente.js) : mêmes manches, même ordre, même arrondi.
-- ⚠️ Si un jour tu relances bots_1_vue_analyse.sql, relance CELUI-CI juste après
-- (sinon la MOY redevient celle des 10 derniers matchs).
-- ============================================================================

-- Mêmes préparatifs que bots_1 (sans effet s'ils sont déjà faits) : la colonne de
-- remise à zéro des stats, lisible par l'appli, et la lecture sûre des nombres.
alter table public.joueurs add column if not exists stats_reset_at bigint;
grant select (stats_reset_at) on public.joueurs to anon, authenticated;

create or replace function public.dp_num(t text) returns numeric
language sql immutable strict
set search_path = pg_catalog
as $$
  select case when t ~ '^-?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?$' then t::numeric else null end
$$;

create or replace view public.v_analyse_joueurs
with (security_invoker = true) as
with
-- Chaque joueur avec ses duels TERMINÉS (comme la fiche profil : statut = 'termine').
dj as (
  select j.id as joueur_id,
         coalesce(j.pseudo, '') as pseudo,
         d.id as duel_id, d.date,
         d.gagnant_id::text = j.id::text as gagne,
         case when d.challenger_id::text = j.id::text then coalesce(nullif(d.challenger_pseudo, ''), j.pseudo, '')
              else coalesce(nullif(d.defie_pseudo, ''), j.pseudo, '') end as my_p,
         public.dp_num(case when d.challenger_id::text = j.id::text then d.score_challenger::text else d.score_defie::text end) as mon_score,
         d.manches_detail,
         -- Un « match DRIX » : 'drix' ou 'rivalite', en 501 ou 301 (sert à avg_10 / n_10).
         coalesce(d.type in ('drix', 'rivalite') and d.mode in ('501', '301'), false) as match_drix
  from public.joueurs j
  join public.duels d on d.statut = 'termine' and (d.challenger_id::text = j.id::text or d.defie_id::text = j.id::text)
   -- Remise à zéro des stats (v135) : on ignore tout ce qui est antérieur à stats_reset_at.
   and coalesce(d.date, 0) >= coalesce(j.stats_reset_at, 0)
),
-- Une ligne par manche jouée, avec sa place dans le duel (ord : 1 = la 1re manche).
legs as (
  select dj.joueur_id, dj.duel_id, dj.date, dj.match_drix, t.ord,
         ((t.m->>'winner') = dj.my_p or (t.m->>'winner') = dj.pseudo) as is_w,
         t.m
  from dj
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(dj.manches_detail::jsonb) = 'array' then dj.manches_detail::jsonb else '[]'::jsonb end
  ) with ordinality as t(m, ord)
),
-- Ses chiffres de la manche : winner_* s'il l'a gagnée, loser_* sinon (comme l'appli).
legs_n as (
  select joueur_id, duel_id, date, match_drix, ord, coalesce(is_w, false) as is_w,
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
-- Ses 10 dernières manches DRIX qui ont une moyenne : la plus récente d'abord
-- (date puis id du duel, du plus récent au plus ancien ; dans un duel, la dernière
-- manche d'abord) — exactement l'ordre de dernieresManchesDrix dans l'appli.
legs10 as (
  select joueur_id, moy, vol
  from (
    select joueur_id, moy, vol,
           row_number() over (partition by joueur_id
                              order by date desc nulls last, duel_id desc, ord desc) as rn
    from legs_n
    where match_drix and moy > 0
  ) x
  where rn <= 10
),
agg_legs10 as (
  select joueur_id,
         sum(moy * greatest(1, vol)) as sum_moy_w10,
         sum(greatest(1, vol))       as vol_moy10,
         count(*)                    as n_10
  from legs10
  group by joueur_id
),
-- Moyenne de repli de avg_reel (quand aucune manche détaillée) : son score par duel, > 0.
agg_duels as (
  select joueur_id, count(*) as nb_duels,
         avg(mon_score) filter (where mon_score > 0) as moyenne_duels
  from dj
  group by joueur_id
),
-- Forme : ses 10 derniers duels terminés (du plus récent au plus ancien).
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
       coalesce(al.legs_lost, 0)              as legs_lost,
       -- Toujours EN DERNIER (« create or replace view » l'exige) : moyenne de ses
       -- 10 dernières manches DRIX, et combien de manches elle couvre (≤ 10).
       case when coalesce(a10.vol_moy10, 0) > 0 then round(a10.sum_moy_w10 / a10.vol_moy10)
            else null end                                                          as avg_10,
       coalesce(a10.n_10, 0)                  as n_10
from public.joueurs j
left join stats      s   on s.joueur_id::text = j.id::text
left join forme      f   on f.joueur_id   = j.id
left join agg_legs   al  on al.joueur_id  = j.id
left join agg_duels  ad  on ad.joueur_id  = j.id
left join agg_legs10 a10 on a10.joueur_id = j.id;

-- L'appli lit avec la clé publique : elle doit avoir le droit de LIRE la vue.
grant select  on public.v_analyse_joueurs to anon, authenticated;
grant execute on function public.dp_num(text) to anon, authenticated;

-- Vérification : 5 joueurs, avec leur moyenne de toujours (avg_reel), celle de
-- leurs 10 dernières manches DRIX (avg_10) et le nombre de manches (n_10).
select pseudo, avg_reel, avg_10, n_10
from public.v_analyse_joueurs
where joueur_id::text in ('76f59be1-8bf8-4503-9980-0a89db439281',   -- PATOX
                          '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44',   -- Thomas
                          '8de5212b-204f-448b-a5c0-9a1f2c146551',   -- Cyr-180
                          '483c0603-0a4b-4c85-8097-d21a04b05873',   -- ThejaugDarts
                          'a294f108-5585-4beb-a6eb-ccfe7cfb5864')   -- Bouli64
order by pseudo;
