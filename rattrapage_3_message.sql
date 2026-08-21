-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 3 sur 4 — LE MESSAGE
--  Dart Point — rattrapage de l'accueil des 72 joueurs arrivés sans message
--
--  ⚠️ CE FICHIER ÉCRIT DANS LA BASE.
--  Il envoie le message à ces joueurs. Sans danger si relancé : rien ne part en double.
--
--  À FAIRE : Dashboard Supabase → SQL Editor → tout coller → Run.
--  Un seul fichier à la fois, dans l'ordre des numéros.
-- ═══════════════════════════════════════════════════════════════════════════
-- `lu = false` pour que la pastille de notification s'allume sur leur téléphone.
-- Les joueurs à qui Thomas a DÉJÀ écrit sont sautés : le message dit « je ne t'ai
-- jamais dit bonjour », ce serait faux pour eux.
--
-- messages.date est un timestamptz → now() va direct. Surtout PAS to_char(),
-- qui renvoie du texte et que Postgres refuse en affectation (42804).
-- ───────────────────────────────────────────────────────────────────────────
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
       now(),
       false
  from public.joueurs j
 where j.date_inscription >= 1785403920000
   and j.id::text <> '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
   and not exists (select 1 from public.messages m
                    where m.from_id::text = '6db6b5b2-bdac-4dc5-9e99-3c1f3a253d44'
                      and m.to_id::text = j.id::text);
