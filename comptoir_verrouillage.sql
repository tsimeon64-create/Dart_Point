-- ═══════════════════════════════════════════════════════════════════════════
--  VERROUILLAGE DU COMPTOIR — à lancer dans Supabase (SQL Editor → Run)
--
--  CE QU'IL RÉPARE : aujourd'hui, n'importe quel visiteur peut écrire un
--  commentaire signé d'un autre joueur, ou modifier/supprimer celui de quelqu'un
--  d'autre. La clé publique est dans le code de l'appli (c'est normal), et rien
--  côté base ne vérifiait qui écrit.
--
--  APRÈS CE SQL : les commentaires et les j'aime ne peuvent plus être écrits
--  qu'à travers la fonction Edge `wall`, qui déduit l'auteur du jeton de session.
--  La LECTURE reste ouverte : le Comptoir doit rester visible.
--
--  ⚠️⚠️ ORDRE OBLIGATOIRE — sinon plus personne ne peut commenter :
--     1. déployer la fonction `wall` (dashboard → Edge Functions → coller → Deploy)
--     2. attendre que l'appli soit en ligne (version 114)
--     3. vérifier qu'un commentaire part bien depuis ton téléphone
--     4. SEULEMENT ALORS, lancer ce fichier
--
--  ⚠️ Ce SQL ne touche PAS aux DRIX ni aux comptes joueurs : c'est un autre
--  chantier, plus gros, parce que l'appli écrit les DRIX depuis le téléphone.
-- ═══════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 1 — ÉTAT DES LIEUX (ne modifie RIEN)
-- Montre qui a le droit d'écrire aujourd'hui. `anon` = n'importe quel visiteur.
-- ────────────────────────────────────────────────────────────────────────────
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as droits
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('wall_comments', 'wall_likes', 'wall_posts')
   and grantee in ('anon', 'authenticated')
 group by table_name, grantee
 order by table_name, grantee;


-- ────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 2 — FERMER L'ÉCRITURE DIRECTE (⚠️ ÉCRIT)
-- On retire l'écriture aux visiteurs. La fonction `wall` n'est pas concernée :
-- elle utilise la clé de service, qui passe outre ces règles.
-- ────────────────────────────────────────────────────────────────────────────
revoke insert, update, delete on public.wall_comments from anon, authenticated;
revoke insert, update, delete on public.wall_likes    from anon, authenticated;

-- wall_posts : on ferme seulement MODIFIER et SUPPRIMER. L'écriture reste permise
-- car les résultats de partie sont encore publiés depuis le téléphone (scoreur,
-- cricket, jeux). Les fermer casserait la publication des matchs.
revoke update, delete on public.wall_posts from anon, authenticated;

-- Ceinture et bretelles : un droit accorde au role PUBLIC ne serait PAS retire par le
-- revoke ci-dessus, et n'apparaitrait pas non plus dans la verification de l'etape 3.
-- Ces trois lignes ne font rien si aucun droit PUBLIC n'existe.
revoke insert, update, delete on public.wall_comments from public;
revoke insert, update, delete on public.wall_likes    from public;
revoke update, delete on public.wall_posts            from public;

-- La lecture reste ouverte : sans elle, le Comptoir devient vide pour tout le monde.
grant select on public.wall_comments, public.wall_likes, public.wall_posts to anon, authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 3 — VÉRIFICATION
-- La colonne `droits` ne doit plus contenir que SELECT pour wall_comments et
-- wall_likes, et SELECT + INSERT pour wall_posts.
-- ────────────────────────────────────────────────────────────────────────────
select table_name, grantee, string_agg(privilege_type, ', ' order by privilege_type) as droits
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('wall_comments', 'wall_likes', 'wall_posts')
   and grantee in ('anon', 'authenticated')
 group by table_name, grantee
 order by table_name, grantee;


-- ────────────────────────────────────────────────────────────────────────────
-- EN CAS DE PROBLÈME — tout remettre comme avant
-- (à ne lancer que si les commentaires ne marchent plus)
-- ────────────────────────────────────────────────────────────────────────────
-- grant insert, update, delete on public.wall_comments to anon, authenticated;
-- grant insert, update, delete on public.wall_likes    to anon, authenticated;
-- grant update, delete on public.wall_posts to anon, authenticated;
