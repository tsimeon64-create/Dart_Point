# 📋 Backlog d'audit — Dart Point

> Reste à faire, identifié pendant les audits « Trouve ton spot » et « Admin ».
> Ce qui est **fait** est déjà commité/déployé (voir l'historique git). Ce fichier
> ne liste que ce qui **reste**. Mis à jour : audit admin (session du 31/05/2026).

---

## 🔒 Sécurité — le vrai chantier restant
- [ ] **Auth par utilisateur (Supabase Auth).** Aujourd'hui l'app n'a pas de vraie
  auth : `joueur` vient du `localStorage` (falsifiable). Conséquence : les `UPDATE`
  **partagés** entre admin et communauté restent sur la clé anon et **ne peuvent pas
  être verrouillés** sans casser des fonctions publiques :
  - édition communautaire d'un bar / d'une asso (`db.updateBar`, `db.updateAssociation`)
  - DRIX des duels (`joueurs.drix` via résolution de duel)
  → Migrer vers Supabase Auth + RLS basées sur `auth.uid()` (propriétaire) / rôle admin.
  C'est **le** point de fond ; tout le reste de la sécurité (DELETE, validations,
  journal) est déjà routé via l'Edge Function `admin-ops`.
- [ ] **Ne pas garder le mot de passe admin en clair en session.** Le bouton de
  déconnexion existe + `sessionStorage` se vide à la fermeture de l'onglet, mais
  l'idéal = l'Edge Function renvoie un **token de session court** au login, stocké
  à la place du mot de passe. (Option simple en plus : effacer `dp_admin_pw` au
  montage de l'app.)
- [ ] **Router aussi `propositions_delete` / `signalements_delete`** (suppression de
  message de contact) via `admin-ops`, puis retirer ces policies DELETE anon.
- [ ] **Rate-limit / anti-spam** côté serveur sur `addAvis`, `addPhoto`,
  `addSignalement`, `addProposition` (clé anon, aucune limite) — éviter le flood de
  la file de modération.

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
