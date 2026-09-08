-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 2 sur 2 — NOUVELLE SAISON DART POINT : LA CLÔTURE (⚠️ ÉCRIT)
--
--  Ce que fait ce script, dans l'ordre :
--    0) REFUSE de tourner si la saison 2026 est déjà archivée (rien ne bouge)
--    A) ajoute 4 colonnes à la table d'archive drix_historique (asso, bar, matchs, victoires)
--    B) ARCHIVE le classement final de la saison 2026 (rang, DRIX, asso…) dans drix_historique
--    C) écrit une ligne « Nouvelle saison 2026-2027 » dans l'historique DRIX de chaque joueur
--       (pour que sa courbe explique la descente à 1000)
--    D) REMET TOUS LES DRIX À 1000
--    E) ENVOIE un message de Thomas à chaque joueur (bilan perso + explication)
--
--  ⚠️ Lance d'abord saison_1_apercu.sql pour voir le classement qui sera archivé.
--  ⚠️ Lance-le APRÈS la mise en ligne de la version 134 de l'appli (l'onglet
--     HISTORIQUE et le filtre du fil d'actu en ont besoin).
--  ✅ Tout ou rien : le SQL Editor exécute le collage en une seule transaction.
--     Une erreur à n'importe quelle étape = rien n'est écrit.
--  ✅ Un second lancement s'arrête tout de suite avec le message
--     « Saison 2026 déjà clôturée » : rien ne bouge (étape 0).
--  ↩️ Retour arrière possible avec saison_0_annuler.sql, à condition de le faire
--     tout de suite (avant que de nouveaux matchs soient joués).
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 0) DÉJÀ FAIT ? ALORS ON S'ARRÊTE ICI, SANS RIEN TOUCHER ────────────────
do $$
begin
  if exists (select 1 from public.drix_historique where saison = 2026) then
    raise exception 'Saison 2026 déjà clôturée : rien n''a été modifié. (Retour arrière : saison_0_annuler.sql)';
  end if;
end $$;

-- ── A) COLONNES DE L'ARCHIVE ───────────────────────────────────────────────
alter table public.drix_historique
  add column if not exists asso_slug text,
  add column if not exists bar_slug  text,
  add column if not exists parties   integer,
  add column if not exists victoires integer;

-- ── B) ARCHIVE DU CLASSEMENT FINAL — SAISON 2026 ──────────────────────────
--    Même règle que l'aperçu : classé = au moins un vrai match (non annulé), ou
--    des DRIX qui ont bougé. Comptes anonymisés et compte de test « Toto » exclus.
--    L'identifiant est généré ici même (gen_random_uuid) : pas besoin d'un DEFAULT.
insert into public.drix_historique (id, saison, classement, joueur_id, joueur_pseudo, score_final, date,
                                    asso_slug, bar_slug, parties, victoires)
select gen_random_uuid(),
       2026,
       row_number() over (order by coalesce(j.drix, 1000) desc, j.pseudo),
       j.id, j.pseudo, coalesce(j.drix, 1000),
       (extract(epoch from now()) * 1000)::bigint,
       j.asso_slug, j.bar_slug, s.parties, s.victoires
  from public.joueurs j
  left join lateral (select parties, victoires from public.stats_joueurs s
                      where s.joueur_id::text = j.id::text order by s.id limit 1) s on true
 where coalesce(j.anonymise, false) = false
   and j.pseudo <> 'Toto'
   and (coalesce(j.drix, 1000) <> 1000
        or exists (select 1 from public.drix_mouvements m
                    where m.joueur_id::text = j.id::text and m.duel_id is not null
                      and m.resultat in ('victoire', 'defaite')
                      -- un match annulé (contestation ou admin) ne compte pas
                      and not exists (select 1 from public.drix_mouvements a
                                       where a.duel_id = m.duel_id and a.resultat = 'annule')));

-- ── C) LA LIGNE « NOUVELLE SAISON » DANS L'HISTORIQUE DRIX DE CHACUN ───────
--    resultat = 'saison' : l'appli (v134) sait que ce n'est ni une victoire ni une
--    défaite — pas de « −2114 cette semaine », pas de carte « palier perdu » dans le fil.
--    C'est aussi ce qui permet le retour arrière (drix_avant = la valeur d'avant).
insert into public.drix_mouvements (joueur_id, joueur_pseudo, adversaire_pseudo, variation,
                                    drix_avant, drix_apres, resultat, duel_id, date)
select j.id, j.pseudo, 'Nouvelle saison 2026-2027', 1000 - coalesce(j.drix, 1000),
       coalesce(j.drix, 1000), 1000, 'saison', null,
       (extract(epoch from now()) * 1000)::bigint
  from public.joueurs j
 where coalesce(j.drix, 1000) <> 1000
   and not exists (select 1 from public.drix_mouvements m
                    where m.joueur_id::text = j.id::text
                      and m.resultat = 'saison'
                      and m.adversaire_pseudo = 'Nouvelle saison 2026-2027');

-- ── D) TOUT LE MONDE À 1000 ────────────────────────────────────────────────
update public.joueurs set drix = 1000 where drix is null or drix <> 1000;

-- ── E) LE MESSAGE À CHAQUE JOUEUR (de Thomas, avec son bilan perso) ────────
--    Protégé par NOT EXISTS sur « saison officielle 2026-2027 » (phrase du texte) :
--    jamais envoyé deux fois, et un futur message 2027-2028 ne sera pas bloqué.
--    ⚠️ Les ::text ne sont pas décoratifs : joueurs.id est un uuid, messages.to_id du texte.
insert into public.messages (from_id, from_pseudo, to_id, to_pseudo, contenu, date, lu)
select '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44', 'Thomas', j.id, left(j.pseudo, 40),
       replace(replace($msg$Salut {PSEUDO} 🎯

🏁 NOUVELLE SAISON DART POINT : la saison officielle 2026-2027 est ouverte !

Désormais, chaque année début septembre, une nouvelle saison Dart Point commence et tout le monde repart sur un pied d'égalité : tous les DRIX sont remis à 1000. À toi de grimper 💪

{BILAN}

Le classement de la saison passée n'est pas perdu : tu le retrouves dans Classement → bouton HISTORIQUE (national ou par asso).

Bonne saison à tous, et que le meilleur gagne 🎯
Thomas$msg$,
         '{PSEUDO}', j.pseudo),
         '{BILAN}',
         case when h.classement is not null
              then 'Ton bilan de la saison 2026 : ' || h.classement::text
                   || case when h.classement = 1 then 'er' else 'e' end
                   || ' sur ' || (select count(*) from public.drix_historique where saison = 2026)::text
                   || ' joueurs classés, avec ' || h.score_final::text || ' DRIX. Bravo !'
              else 'Tu n''avais pas encore de match classé : c''est le moment parfait pour te lancer !'
         end),
       now(),
       false
  from public.joueurs j
  left join public.drix_historique h on h.joueur_id = j.id and h.saison = 2026
 where j.id::text <> '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and coalesce(j.anonymise, false) = false
   and j.pseudo <> 'Toto'
   and not exists (select 1 from public.messages m
                    where m.from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
                      and m.to_id::text = j.id::text
                      and m.contenu like '%saison officielle 2026-2027%');

-- ── VÉRIFICATION ───────────────────────────────────────────────────────────
--    Attendu : joueurs_archives ≈ 59 · joueurs_pas_a_1000 = 0 · messages_envoyes ≈ 153
select (select count(*) from public.drix_historique where saison = 2026)          as joueurs_archives,
       (select count(*) from public.joueurs where drix is null or drix <> 1000)    as joueurs_pas_a_1000,
       (select count(*) from public.drix_mouvements where resultat = 'saison')     as lignes_nouvelle_saison,
       (select count(*) from public.messages
         where from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
           and contenu like '%saison officielle 2026-2027%')                       as messages_envoyes;

-- Le podium archivé (doit ressembler à l'aperçu)
select classement, joueur_pseudo, score_final, asso_slug, parties, victoires
  from public.drix_historique
 where saison = 2026
 order by classement
 limit 10;
