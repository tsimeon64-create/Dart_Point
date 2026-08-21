-- ═══════════════════════════════════════════════════════════════════════════
--  RATTRAPAGE DE L'ACCUEIL — à lancer UNE FOIS dans Supabase
--  (Dashboard → SQL Editor → coller → Run)
--
--  POURQUOI : le code qui ajoute Thomas en ami et envoie le message de
--  bienvenue vit dans la fonction Edge `auth`, qui n'a pas été redéployée
--  depuis fin juin 2026. Résultat : tous les joueurs inscrits depuis le
--  30/07/2026 11h32 sont arrivés sans aucun accueil (vérifié : 0 sur 72).
--
--  ⚠️ ORDRE À RESPECTER :
--    1. l'appli doit être en v112 AVANT ce SQL, sinon le bouton WhatsApp
--       s'affichera en texte brut « [INVITER] »
--    2. redéployer la fonction `auth` (pour les FUTURS inscrits)
--    3. ce SQL (pour ceux qui sont DÉJÀ là)
--
--  ⚠️ CE SCRIPT ENVOIE DE VRAIS MESSAGES À DE VRAIES PERSONNES.
--  Il est conçu pour être SANS DANGER si on le relance : les deux insertions
--  sont protégées par NOT EXISTS. Un deuxième passage n'enverra rien.
--
--  ⚠️ LES ::text NE SONT PAS DÉCORATIFS. Les identifiants ne sont pas du même
--  type partout : joueurs.id est un uuid, messages.to_id est du texte, et
--  Postgres REFUSE de comparer les deux (erreur 42883). Comparer les deux
--  côtés en texte marche quel que soit le type réel des colonnes.
-- ═══════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 0 — CONTRÔLE DES TYPES (ne modifie RIEN — à lancer en tout premier)
--
-- Les identifiants ne sont pas du même type d'une table à l'autre : joueurs.id
-- est un uuid, messages.to_id est du texte. Cette requête affiche les types
-- réels ; envoie le résultat à Claude avant de lancer l'ÉTAPE 3.
-- ────────────────────────────────────────────────────────────────────────────
select table_name, column_name, data_type
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('messages', 'amis', 'joueurs')
   and column_name in ('id', 'from_id', 'to_id', 'joueur_id', 'ami_id',
                       'date', 'lu', 'contenu', 'date_inscription')
 order by table_name, column_name;

-- ────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 1 — APERÇU (ne modifie RIEN, à lancer d'abord)
-- Doit afficher le nombre de joueurs qui vont recevoir le message.
-- ────────────────────────────────────────────────────────────────────────────
select count(*) as joueurs_a_contacter
  from public.joueurs j
 where j.date_inscription >= 1785403920000
   and j.id::text <> '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and not exists (select 1 from public.messages m
                    where m.from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
                      and m.to_id::text = j.id::text);


-- ────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 2 — L'AMITIÉ
-- Une seule ligne par joueur, dans le sens Thomas → joueur, comme le fait la
-- fonction `auth`. On saute ceux qui sont déjà amis, dans un sens ou dans
-- l'autre : quelqu'un qui t'aurait retiré volontairement n'est PAS réajouté.
-- ────────────────────────────────────────────────────────────────────────────
insert into public.amis (joueur_id, joueur_pseudo, ami_id, ami_pseudo, statut, date)
select '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44', 'Thomas', j.id, j.pseudo, 'accepte',
       (extract(epoch from now()) * 1000)::bigint
  from public.joueurs j
 where j.date_inscription >= 1785403920000
   and j.id::text <> '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and not exists (select 1 from public.amis a
                    where (a.joueur_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44' and a.ami_id::text = j.id::text)
                       or (a.joueur_id::text = j.id::text and a.ami_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'));


-- ────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 3 — LE MESSAGE
-- `lu = false` pour que la pastille de notification s'allume.
-- On saute tous ceux à qui Thomas a DÉJÀ écrit : le message dit « je ne t'ai
-- jamais dit bonjour », ce serait faux pour eux.
-- ────────────────────────────────────────────────────────────────────────────
insert into public.messages (from_id, from_pseudo, to_id, to_pseudo, contenu, date, lu)
select '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44', 'Thomas', j.id, left(j.pseudo, 40),
       replace($msg$Salut {PSEUDO} 👋

Moi c'est Thomas, c'est moi qui ai créé Dart Point. Je t'écris parce que je viens de me rendre compte d'un truc gênant : tu es inscrit depuis un moment et je ne t'ai jamais dit bonjour. Désolé pour le retard 😅

Je t'ajoute en ami, comme ça tu ne joues plus tout seul. Tu peux me retirer quand tu veux, ça ne me vexera pas 😉

Une question, un bug, une idée ? Réponds ici, je lis tout.

⚡ ET LE PLUS IMPORTANT : AJOUTE TES POTES

Dart Point tout seul, c'est un carnet de scores. Avec tes potes, c'est un championnat qui ne s'arrête jamais.

Une fois qu'ils sont là, tu peux :
⚔️ les défier et leur prendre des DRIX (c'est notre classement, et ça pique)
📊 comparer vos moyennes — et leur rappeler la tienne. Souvent.
🍺 chambrer tout le monde au Comptoir

Parce qu'un joueur sans amis, ça lance des fléchettes dans le vide : personne ne le voit, et surtout personne ne le croit quand il raconte son 180 🙈

Le bouton ci-dessous envoie l'invitation dans le groupe WhatsApp de ton club, en un clic :

[INVITER]

Bonnes fléchettes ! 🎯$msg$, '{PSEUDO}', j.pseudo),
       to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
       false
  from public.joueurs j
 where j.date_inscription >= 1785403920000
   and j.id::text <> '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and not exists (select 1 from public.messages m
                    where m.from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
                      and m.to_id::text = j.id::text);


-- ────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 4 — VÉRIFICATION
-- ────────────────────────────────────────────────────────────────────────────
select (select count(*) from public.amis
         where joueur_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44')              as amis_de_thomas,
       (select count(*) from public.messages
         where from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44' and lu = false) as messages_non_lus_envoyes;
