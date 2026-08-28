-- ═══════════════════════════════════════════════════════════════════════════
--  FICHIER 2 sur 3 — LE VERROUILLAGE
--  Dart Point — verrouillage du Comptoir
--
--  ⚠️ CE FICHIER ÉCRIT DANS LA BASE.
--  Il retire l'écriture directe. Après ça, seuls la fonction `wall` et toi pouvez écrire.
--
--  À FAIRE : Supabase → SQL Editor → tout coller → Run.
--  Un seul fichier à la fois, dans l'ordre des numéros.
-- ═══════════════════════════════════════════════════════════════════════════
-- La fonction `wall` n'est PAS concernée : elle utilise la clé de service, qui
-- passe outre ces règles. C'est elle qui écrira désormais les commentaires, en
-- déduisant l'auteur du jeton de session au lieu de croire le téléphone sur parole.

revoke insert, update, delete on public.wall_comments from anon, authenticated;
revoke insert, update, delete on public.wall_likes    from anon, authenticated;

-- wall_posts : on ferme seulement MODIFIER et SUPPRIMER. L'écriture reste permise,
-- car les résultats de partie sont encore publiés depuis le téléphone (scoreur,
-- cricket, jeux). La fermer casserait la publication des matchs au Comptoir.
revoke update, delete on public.wall_posts from anon, authenticated;

-- Ceinture et bretelles : un droit accordé au rôle PUBLIC n'est PAS retiré par les
-- lignes ci-dessus, et n'apparaîtrait pas non plus dans la vérification. Ces trois
-- lignes ne font rien si aucun droit PUBLIC n'existe.
revoke insert, update, delete on public.wall_comments from public;
revoke insert, update, delete on public.wall_likes    from public;
revoke update, delete on public.wall_posts            from public;

-- La LECTURE reste ouverte : sans elle, le Comptoir devient vide pour tout le monde.
grant select on public.wall_comments, public.wall_likes, public.wall_posts to anon, authenticated;
