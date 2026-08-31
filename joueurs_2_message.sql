-- ═══════════════════════════════════════════════════════════════════════════
--  MESSAGE AUX INSCRITS — remplir ville, departement, ligue, naissance
--  Dart Point — prepare la carte des joueurs
--
--  ⚠️ CE FICHIER ENVOIE UN VRAI MESSAGE A DE VRAIES PERSONNES.
--  Sans danger si relance : protege par NOT EXISTS sur le contenu.
--
--  ⚠️ LES ::text NE SONT PAS DECORATIFS : joueurs.id est un uuid,
--  messages.to_id est du texte. Postgres refuse de les comparer (42883).
--  messages.date est un timestamptz : now() va direct, surtout pas to_char().
--
--  A FAIRE : Supabase → SQL Editor → tout coller → Run.
-- ═══════════════════════════════════════════════════════════════════════════

-- ETAPE 1 — APERCU (n ecrit rien). Combien de joueurs vont le recevoir ?
select count(*) as joueurs_a_prevenir
  from public.joueurs j
 where j.id::text <> '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and coalesce(j.anonymise, false) = false
   and not exists (select 1 from public.messages m
                    where m.from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
                      and m.to_id::text = j.id::text
                      and m.contenu like '%CARTE DES JOUEURS%');


-- ETAPE 2 — L ENVOI (⚠️ ECRIT)
insert into public.messages (from_id, from_pseudo, to_id, to_pseudo, contenu, date, lu)
select '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44', 'Thomas', j.id, left(j.pseudo, 40),
       replace($msg$Salut {PSEUDO} 👋

Petite nouveauté sur Dart Point : on prépare la CARTE DES JOUEURS.

L'idée est simple : pouvoir trouver quelqu'un avec qui jouer près de chez soi, sans passer par vingt messages.

Pour que ça marche, il me manque deux infos sur ton profil :
📍 ta ville
🗺️ ton département

Et si tu veux, deux autres qui aident :
🎯 ta ligue de fléchettes (Aquitaine, Bretagne, Est, Nord, Pays de la Loire, Sud-Est, Sud-Ouest)
🎂 ta date de naissance (elle remplace l'âge, comme ça elle ne se périme plus)

C'est rapide :
1. Va dans Profil
2. Appuie sur le petit crayon ✏️ à côté de ton pseudo
3. Remplis ta ville, puis appuie sur le bouton orange qui te propose ton département
4. ⚠️ N'OUBLIE PAS « Sauvegarder » en bas — sans ça rien n'est enregistré

Rien d'obligatoire pour continuer à jouer — mais sans ta ville, tu n'apparaîtras pas sur la carte, et les joueurs de ton coin ne te trouveront pas.

Merci 🎯
Thomas$msg$, '{PSEUDO}', j.pseudo),
       now(),
       false
  from public.joueurs j
 where j.id::text <> '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and coalesce(j.anonymise, false) = false
   and not exists (select 1 from public.messages m
                    where m.from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
                      and m.to_id::text = j.id::text
                      and m.contenu like '%CARTE DES JOUEURS%');


-- ETAPE 3 — VERIFICATION : doit renvoyer 0.
select count(*) as restant
  from public.joueurs j
 where j.id::text <> '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and coalesce(j.anonymise, false) = false
   and not exists (select 1 from public.messages m
                    where m.from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
                      and m.to_id::text = j.id::text
                      and m.contenu like '%CARTE DES JOUEURS%');
