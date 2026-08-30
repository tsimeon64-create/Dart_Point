-- ═══════════════════════════════════════════════════════════════════════════
--  ⚠️ RETOUR EN ARRIÈRE — À LANCER MAINTENANT SI LES JOUEURS SONT BLOQUÉS
--  Dart Point — remet le Comptoir comme avant le verrouillage
--
--  ⚠️ CE FICHIER ÉCRIT DANS LA BASE.
--  Il rouvre l'écriture directe : les commentaires remarchent tout de suite
--  pour tout le monde, sans que personne ait à se reconnecter.
--
--  CE QUE ÇA COÛTE : la faille est rouverte le temps qu'on corrige. Elle
--  existait déjà depuis des mois, quelques heures de plus ne changent pas
--  grand-chose — alors que 151 joueurs bloqués un vendredi soir, si.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
--  Puis dis-le à Claude : il prépare la version qui règle le problème pour
--  de bon, et on reverrouillera après.
-- ═══════════════════════════════════════════════════════════════════════════

grant insert, update, delete on public.wall_comments to anon, authenticated;
grant insert, update, delete on public.wall_likes    to anon, authenticated;
grant update, delete on public.wall_posts            to anon, authenticated;

-- Vérification : anon doit de nouveau avoir INSERT, UPDATE, DELETE.
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as droits
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('wall_comments', 'wall_likes', 'wall_posts')
   and grantee in ('anon', 'authenticated', 'PUBLIC')
 group by table_name, grantee
 order by table_name, grantee;
