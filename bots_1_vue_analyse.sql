-- ============================================================================
-- bots_1_vue_analyse.sql — À coller dans Supabase → SQL Editor → Run (une fois)
-- ============================================================================
-- Pourquoi : la liste « Affronter un ami » doit montrer, pour CHAQUE ami, sa
-- moyenne et sa dangerosité AVANT de déplier sa fiche — et permettre de trier
-- par moyenne ou par dangerosité. Ces chiffres viennent du détail de chaque
-- manche (manches_detail) : additionner ça dans le téléphone pour 150 amis
-- voudrait dire télécharger tous les duels (1,7 Mo, 300 requêtes) à chaque
-- ouverture. Ici c'est Supabase qui additionne, et l'appli lit le résultat en
-- une requête de quelques ko.
--
-- Ce script ne MODIFIE aucune donnée : il crée une « vue » (une table calculée
-- à la volée en lisant duels, stats_joueurs et joueurs) et une petite fonction
-- de lecture sûre des nombres. Il peut être relancé sans risque.
--
-- ⚠️ Les additions ici reproduisent EXACTEMENT analyserJoueur (src/AppJoueurs.jsx),
-- le calcul de la fiche profil. La FORMULE de dangerosité, elle, reste dans
-- l'appli (scoreDanger) : la vue ne fournit que les sommes.
-- ============================================================================

-- Un texte → un nombre, ou NULL si ce n'est pas un nombre (jamais d'erreur).
create or replace function public.dp_num(t text) returns numeric
language sql immutable strict
set search_path = pg_catalog   -- évite l'avertissement « search_path mutable » du Security Advisor
as $$
  select case when t ~ '^-?[0-9]+(\.[0-9]+)?([eE][-+]?[0-9]+)?$' then t::numeric else null end
$$;

create or replace view public.v_analyse_joueurs
with (security_invoker = true) as
with
-- Chaque joueur avec ses duels TERMINÉS (comme la fiche profil : statut = 'termine').
-- (Les identifiants sont comparés en texte : uuid ou texte en base, ça marche pareil.)
dj as (
  select j.id as joueur_id,
         coalesce(j.pseudo, '') as pseudo,
         d.id as duel_id, d.date,
         d.gagnant_id::text = j.id::text as gagne,
         -- « myP » de l'appli : le pseudo sous lequel il apparaît dans ce duel
         case when d.challenger_id::text = j.id::text then coalesce(nullif(d.challenger_pseudo, ''), j.pseudo, '')
              else coalesce(nullif(d.defie_pseudo, ''), j.pseudo, '') end as my_p,
         public.dp_num(case when d.challenger_id::text = j.id::text then d.score_challenger::text else d.score_defie::text end) as mon_score,
         d.manches_detail
  from public.joueurs j
  join public.duels d on d.statut = 'termine' and (d.challenger_id::text = j.id::text or d.defie_id::text = j.id::text)
),
-- Une ligne par manche jouée. is_w = il a gagné CETTE manche (winner = son pseudo).
legs as (
  select dj.joueur_id,
         ((m->>'winner') = dj.my_p or (m->>'winner') = dj.pseudo) as is_w,
         m
  from dj
  cross join lateral jsonb_array_elements(
    case when jsonb_typeof(dj.manches_detail::jsonb) = 'array' then dj.manches_detail::jsonb else '[]'::jsonb end
  ) as m
),
-- Ses chiffres de la manche : winner_* s'il l'a gagnée, loser_* sinon (comme l'appli).
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
-- Moyenne de repli (quand aucune manche détaillée) : son score par duel, > 0.
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
           -- id desc en second : même départage que l'appli (getDuels : order=date.desc,id.desc)
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

-- L'appli lit avec la clé publique : elle doit avoir le droit de LIRE la vue.
grant select  on public.v_analyse_joueurs to anon, authenticated;
grant execute on function public.dp_num(text) to anon, authenticated;

-- Aperçu (tu dois voir tes joueurs les mieux classés, avec leur moyenne réelle) :
select pseudo, drix, win_rate, avg_reel, checkout_pct, n180, nb_duels
from public.v_analyse_joueurs
order by drix desc
limit 20;
