-- ═══════════════════════════════════════════════════════════════════════════
--  ACTUALITÉ DU CLUB — à lancer UNE FOIS dans Supabase
--  (Dashboard → SQL Editor → coller → Run)
--
--  Crée le tiroir qui range les annonces des clubs. Les « j'aime » et les
--  commentaires n'ont besoin de RIEN : ils réutilisent wall_likes et
--  wall_comments, exactement comme les publications du Comptoir.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.asso_posts (
  id            uuid primary key default gen_random_uuid(),
  asso_slug     text not null,
  joueur_id     uuid,
  joueur_pseudo text,
  joueur_photo  text,
  contenu       text not null,
  date          bigint not null
);

-- Retrouver les annonces d'un club, de la plus récente à la plus ancienne.
create index if not exists asso_posts_slug_date_idx
  on public.asso_posts (asso_slug, date desc);

-- Mêmes règles que le reste de l'appli : tout le monde lit, l'appli écrit.
-- (C'est l'écran qui décide qui voit le formulaire : le président et l'admin.)
alter table public.asso_posts enable row level security;

drop policy if exists "asso_posts lecture"     on public.asso_posts;
drop policy if exists "asso_posts ecriture"    on public.asso_posts;
drop policy if exists "asso_posts suppression" on public.asso_posts;

create policy "asso_posts lecture"     on public.asso_posts for select using (true);
create policy "asso_posts ecriture"    on public.asso_posts for insert with check (true);
create policy "asso_posts suppression" on public.asso_posts for delete using (true);

-- Vérification : doit renvoyer 0 ligne, sans erreur.
select count(*) as annonces from public.asso_posts;
