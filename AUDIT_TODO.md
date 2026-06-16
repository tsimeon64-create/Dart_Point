# 📋 Backlog d'audit — Dart Point

> Reste à faire, identifié pendant les audits « Trouve ton spot » et « Admin ».
> Ce qui est **fait** est déjà commité/déployé (voir l'historique git). Ce fichier
> ne liste que ce qui **reste**. Mis à jour : audit admin (session du 31/05/2026).

---

## 🔒 Sécurité — AUDIT CONFIRMÉ le 16/06/2026 (multi-agents + sonde live)

> **Cause racine UNIQUE** : pas d'auth serveur. L'identité `joueur` vient du
> `localStorage` (falsifiable) et le client tape PostgREST avec la clé **anon**. Les
> tables `joueurs`, `messages`, `duels`, `presences`, `amis`, `drix_mouvements`,
> `stats_joueurs`, `chrono_*_scores` n'ont **aucune RLS restrictive** (policies
> `USING(true)` ou absentes). `admin-ops` protège bien bars/avis/photos mais **n'inclut
> pas** joueurs/messages/duels. → Tant que l'identité est fabriquée côté client, aucune
> RLS par appelant ne marche : il FAUT une vraie identité serveur. Tout le reste découle
> de ça. (Confirmé en live : HTTP 200/204.)

### 🔴 CRITIQUE
- [ ] **Prise de contrôle de n'importe quel compte.** (A) `GET joueurs?select=pseudo,password_hash`
  → les 32 hash (SHA-256 **non salé**), crackables hors-ligne ; (B) `PATCH joueurs?id=eq.<victime>`
  `{password_hash:…}` → 204, on impose un mot de passe et on se connecte. Le code admin de reset
  n'est qu'un contrôle UI, jamais exigé par la base.
- [ ] **Classement entièrement truquable / sabotable.** `PATCH joueurs?id=eq.<moi> {drix:99999,xp:9999999}`
  → n°1 ; `{drix:100}` sur un rival → sabotage. + faux duels (K=32×manches calculé dans le navigateur) ;
  rejouer la récompense Speedrun (`rewarded:false`, policy `scoreur_update_public USING(true)`) pour
  re-créditer +20 DRIX en boucle. Crédit +20/+5 distribué côté client.

### 🟠 MAJEUR
- [ ] **Messagerie privée** : `GET messages?select=*` (sans filtre) lit TOUS les messages ;
  `POST messages {from_id:…}` usurpe l'expéditeur. (RGPD — public potentiellement mineur.)
- [ ] **PII énumérable** : `GET joueurs?select=email,ville,…` = annuaire email/ville/pseudo des comptes.
- [ ] **Graphe social + historique** : `amis`, `duels`, `drix_mouvements`, `stats_joueurs`, `presences`
  lisibles sans filtre (le filtre n'est que dans l'URL client).
- [ ] **IDOR profil/social** : `PATCH joueurs?id=eq.<victime>` défigure/usurpe un profil et contourne
  les limites métier (toutes côté client) ; DELETE/PATCH libres sur `duels` / `presences` / `amis`.

### 🟡 MINEUR
- [ ] Présences falsifiables/supprimables pour autrui (`presences` : pas de RLS ni `UNIQUE`).
- [ ] `bar_recommandations` : policy DELETE `USING(true)` → effacer les reco d'autrui.
- [ ] Mot de passe admin en clair en `sessionStorage` (idéal : token de session court au login + effacer au montage).
- [ ] Rate-limit / anti-spam serveur sur `addAvis`/`addPhoto`/`addSignalement`/`addProposition` (clé anon, aucune limite).
- [ ] Router `propositions_delete` / `signalements_delete` via `admin-ops`, puis retirer ces policies DELETE anon.

### 🗺️ Feuille de route (du plus urgent au moins urgent)
1. **P0 — Pare-feu (jour 0)** : `REVOKE SELECT (password_hash,email,nom,prenom,ville) ON public.joueurs FROM anon`
   (masque hash + PII en gardant pseudo/drix/xp). ⚠️ casse le login actuel → coupler avec l'étape 2 dans la même session.
2. **P0 — Login/register/reset côté serveur** : Edge Function service-role (modèle `admin-ops`) qui compare
   le mot de passe en base (bcrypt salé) et renvoie un **token de session**, jamais le hash. Reset par jeton
   e-mail à usage unique/expirable. Min 8 caractères. Migrer les hash → bcrypt + reset général.
3. **P0 — Verrouiller les écritures `joueurs`** : `ENABLE RLS`, retirer UPDATE/INSERT/DELETE anon ; drix/xp
   recalculés **côté serveur** (RPC `SECURITY DEFINER` / Edge Function). → tue le takeover ET la triche d'un coup.
4. **P1 — Messagerie** : RLS sur `messages` + lecture/envoi via Edge Function (token de session).
5. **P1 — Duels & récompenses recalculés serveur** : retirer `scoreur_update_public`/`scoreur_insert_public`
   et tout UPDATE anon sur `chrono_*_scores`/`duels`/`drix_mouvements`/`stats_joueurs` ; scores immuables ;
   calcul gagnant/points/flag `rewarded` dans l'Edge Function ; exiger la double validation réelle des 2 joueurs.
6. **P2 — Cloisonner le social + PII** : vue `joueurs_public` (id, pseudo, photo, drix, xp, slugs) exposée à anon ;
   RLS d'appartenance sur `amis`/`presences` + SELECT de `duels`/`drix_mouvements`/`stats` via RPC ; `UNIQUE` sur presences.
7. **P3 — Nettoyage** : `bar_reco_delete` filtré au propriétaire ; remplacer les `select=*` (AppJoueurs.jsx:159-161,
   AppMessages.jsx) par des colonnes explicites ; appliquer la §4 RLS commentée de `20260531_audit_trouve_ton_spot.sql` ;
   à terme bascule complète vers **Supabase Auth** (JWT `auth.uid()`).

✅ **Déjà bon (Fable 5 / sessions précédentes)** : `admin-ops` (auth + whitelist `ALLOWED` + filtre match
obligatoire) couvre bars/avis/photos ; RLS DELETE de l'audit « Trouve ton spot » ; déconnexion admin ;
`email` déjà non exposé en lecture anon.

## 🛠 Fiabilité (admin)
- [ ] **`corrigerScore`** (AdminDuels) : recalculer DRIX **et** stats quand on corrige
  le score d'un duel (aujourd'hui ça change juste le nb de manches, sans recalcul ;
  en cas d'égalité, gagnant = `defie_id` par défaut, faux).
- [ ] **`banirJoueur` / `nettoyerJoueur`** : passer la suppression multi-tables en
  **RPC atomique** côté serveur (ordre cohérent, gérer les duels *terminés* et
  `tournoi_inscriptions` orphelines ; éviter les 2 écritures DRIX inutiles avant
  suppression).
- [ ] **« Accepter une demande de club »** ne crée rien aujourd'hui (juste
  `statut:publie`) — à implémenter réellement.

## 🧹 Modération / visibilité
- [ ] **Avis signalés** : `AvisAdminSection` ne charge que `valide=false` → un avis
  publié puis signalé (`signale=true`) n'apparaît jamais. Ajouter une vue des avis
  signalés.
- [ ] **`bars.signale`** : colonne créée mais jamais affichée. Surfacer les bars
  signalés (et/ou agréger `bar_cible_reports` ≥ seuil) dans un écran admin.
- [ ] **Photos** : migrer le stockage **base64 → Supabase Storage** (perf/poids ;
  la modération `valide` est déjà câblée).

## 🧰 Confort admin (usabilité)
- [ ] **Édition de fiche joueur** (pseudo / email / ville) depuis AdminJoueurs.
- [ ] **Liste & dé-bannissement** : le ban est aujourd'hui une **suppression
  irréversible**. Passer en *soft-ban* (drapeau) pour pouvoir lister/débannir.
- [ ] **Recherche + pagination** dans les onglets (bars, joueurs).
- [ ] **Export CSV** (joueurs, logs).
- [ ] **KPIs** : « Nouveaux (7j) » — le détail affiche email/ville non chargés
  (toujours « — ») ; « Joueurs actifs » fait doublon ; « Assos actives » = total.

## 🧱 Dette technique
- [ ] **Factoriser l'analyse joueur.** La logique d'analyse (objet `A`, dangerosité,
  style, forces/faiblesses, paragraphes DartPoint, Score Joueur, exploits) existe en
  double : inline dans `FicheJoueur` (vue adversaire) **et** dans le composant
  `JoueurAnalyse` (vue « soi-même » de Mon Profil). Toute évolution de l'analyse doit
  être faite aux 2 endroits → extraire une fonction pure `computeAnalyse()` + un rendu
  partagé, puis faire pointer `FicheJoueur` dessus.

## ♿ Accessibilité (Trouve ton spot — reste mineur)
- [ ] `aria-label` sur les boutons icône restants (🗑 avis/photos, toggle géoloc).
- [ ] `alt` descriptifs sur les photos de galerie / lightbox.
- [ ] État d'échec de chargement de la carte (si CDN Leaflet / tuiles tombent).

---

### ✅ Déjà fait (pour mémoire)
Refonte Classement DRIX · analyse joueur précise · cartes déroulantes · paliers de
rangs · placement carte (proposer + éditer) · **audit « Trouve ton spot »** (XSS,
slug, propositions, assos, filtres, vues, a11y, RLS DELETE) · **audit admin** :
① sécurité (écritures admin via Edge Function `admin-ops` + RLS verrouillée) ·
② fiabilité (validations honnêtes, annulation de duel + stats, modération photos,
polish journal/KPI) · déconnexion admin.
