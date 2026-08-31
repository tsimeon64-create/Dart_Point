-- ═══════════════════════════════════════════════════════════════════════════
--  LISTE DES ADRESSES E-MAIL — pour un envoi groupé
--  Dart Point
--
--  ✅ CE FICHIER N'ÉCRIT RIEN. Il ne fait que lire.
--
--  ⚠️⚠️ RÈGLE ABSOLUE : coller ces adresses dans « Cci » (copie cachée),
--  JAMAIS dans « À » ni « Cc ».
--  Dans « À » ou « Cc », chaque joueur reçoit la liste complète des autres :
--  c'est une fuite de données personnelles, interdite par le RGPD, et ça ne se
--  rattrape pas une fois parti. Dans Gmail : mets TON adresse dans « À »,
--  clique sur « Cci » à droite, et colle la liste là.
--
--  Ce qui est exclu automatiquement : les comptes anonymisés (RGPD), les
--  comptes désactivés, les adresses vides ou manifestement invalides.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run,
--            puis copier la cellule du résultat.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── BLOC 1 : combien d'adresses, et combien de joueurs sans adresse ──
select count(*) filter (where email is not null and email like '%@%.%') as avec_email,
       count(*) filter (where email is null or email not like '%@%.%')  as sans_email,
       count(*)                                                        as total
  from public.joueurs
 where coalesce(anonymise, false) = false
   and coalesce(actif, true) = true;


-- ── BLOC 2 : la liste, prête à coller dans « Cci » ──
-- Le résultat tient dans UNE cellule. Clique dessus, copie tout.
select string_agg(distinct lower(trim(email)), ', ' order by lower(trim(email))) as adresses_pour_cci
  from public.joueurs
 where coalesce(anonymise, false) = false
   and coalesce(actif, true) = true
   and email is not null
   and email like '%@%.%';
