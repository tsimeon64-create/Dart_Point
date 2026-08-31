-- ═══════════════════════════════════════════════════════════════════════════
--  LISTE DES JOUEURS POUR BREVO
--  Dart Point
--
--  ✅ CE FICHIER N'ÉCRIT RIEN. Il ne fait que lire.
--
--  Les colonnes sont nommées comme Brevo les attend (EMAIL, PRENOM, NOM) :
--  l'import les reconnaîtra tout seul, sans rien avoir à associer à la main.
--  PSEUDO est en plus, pour pouvoir écrire « Salut Beub » dans le mail.
--
--  Sont exclus : comptes anonymisés (RGPD), comptes désactivés, adresses vides
--  ou invalides. Les doublons d'adresse aussi (deux comptes, un seul mail).
--
--  À FAIRE : Supabase → SQL Editor → coller → Run,
--            puis bouton « Download CSV » au-dessus du résultat.
-- ═══════════════════════════════════════════════════════════════════════════

select distinct on (lower(trim(email)))
       lower(trim(email)) as "EMAIL",
       coalesce(nullif(trim(prenom), ''), pseudo) as "PRENOM",
       coalesce(nullif(trim(nom), ''), '')        as "NOM",
       pseudo                                     as "PSEUDO"
  from public.joueurs
 where coalesce(anonymise, false) = false
   and coalesce(actif, true) = true
   and email is not null
   and email like '%@%.%'
 order by lower(trim(email));
