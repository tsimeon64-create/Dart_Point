# Daily Cron — Dart Point

Edge Function qui s'exécute chaque nuit à 00:01 (UTC) pour :

1. **Récompenser** le vainqueur Finish Speedrun (+20 DRIX) + post Comptoir
2. **Récompenser** le vainqueur Scoreur Speedrun (+20 DRIX) + post Comptoir
3. **Distribuer** +5 DRIX participation à tous les joueurs qui ont **terminé** un Speedrun
4. **Nettoyer** les photos wall_posts > 14 jours (libère la DB)

## Pourquoi cette fonction ?

Avant, ces tâches dépendaient de la **connexion d'un joueur** côté client :
- Si le vainqueur n'ouvrait pas l'app le lendemain → pas de post de victoire
- Si un participant ne se reconnectait pas → pas de +5 DRIX
- Le cleanup des photos tournait à chaque ouverture du Comptoir (coûteux)
- Risque de race-condition (2 joueurs simultanés → double récompense)

Avec cette fonction côté serveur :
- ✅ Récompenses garanties même si personne ne se connecte
- ✅ Atomicité grâce au flag `rewarded` patché en bloc avant la boucle
- ✅ Cleanup unique par jour au lieu de "à chaque ouverture"

---

## Déploiement (une seule fois)

### 1. Installer Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (via scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Ou télécharger depuis https://supabase.com/docs/guides/cli
```

### 2. Login + Link au projet

```bash
supabase login
supabase link --project-ref <TON_PROJECT_REF>
```

`<TON_PROJECT_REF>` = la partie devant `.supabase.co` dans ton URL Supabase.

### 3. Déployer la fonction

Depuis la racine du projet Dart_Point :

```bash
supabase functions deploy daily-cron --no-verify-jwt
```

### 4. Activer le cron (SQL Editor dans Supabase Dashboard)

```sql
-- Activer les extensions nécessaires
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Planifier l'exécution quotidienne à 00:01 UTC
-- (note : ajuste l'heure selon ton fuseau, ex : '1 23 * * *' pour 00:01 CET hiver)
select cron.schedule(
  'dartpoint-daily-cron',
  '1 0 * * *',
  $$
    select net.http_post(
      url := 'https://<TON_PROJECT_REF>.supabase.co/functions/v1/daily-cron',
      headers := '{"Authorization": "Bearer <TON_ANON_KEY>"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
```

### 5. Tester manuellement (optionnel)

```bash
curl -L -X POST \
  'https://<TON_PROJECT_REF>.supabase.co/functions/v1/daily-cron' \
  -H 'Authorization: Bearer <TON_ANON_KEY>'
```

Tu devrais voir une réponse JSON avec le détail de ce qui a été fait.

---

## Une fois déployé

Tu peux **retirer** les blocs d'auto-cleanup et de récompense côté client :

- `AppChronoFinish.jsx` → `checkYesterdayReward()` peut être désactivée
- `AppChronoScoreur.jsx` → `checkYesterdayScoreurReward()` peut être désactivée
- `App.jsx` (PageCommunaute) → le `useEffect` qui patch `image_url=null` peut être retiré

Mais tu peux aussi les **laisser** : elles deviennent des no-op (le flag `rewarded` est déjà true), sans risque de double récompense.

---

## Monitoring

Pour voir les logs des exécutions :

- Supabase Dashboard → Edge Functions → daily-cron → Logs
- SQL : `select * from cron.job_run_details where jobname = 'dartpoint-daily-cron' order by start_time desc limit 10;`
