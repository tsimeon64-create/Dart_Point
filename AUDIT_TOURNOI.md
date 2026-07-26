# Audit du mode « Tournoi entre potes » — simulation 20 équipes

**Date :** 26 juillet 2026 · **Appli :** Dart Point (`Dart_Point/src/`)
**État :** ✅ **AUDIT COMPLET — 38 défauts sur 38 vérifiés** · **6 corrections déployées** (versions 60 et 61)

---

## 1. VERDICT

🟢 **Oui, tu peux organiser ton tournoi de 20 équipes.**

Avant les corrections, le verdict était orange : trois pièges pouvaient figer un tournoi en cours devant tout le club. Ils sont corrigés et déployés. Il reste 27 défauts confirmés, tous **mineurs ou contournables** — aucun ne bloque un tournoi.

La mécanique de fond (poules, classement, tirage, tableau, consolante, barrages) est **saine**. Les défauts venaient presque tous de l'écran de configuration.

---

## 2. CE QUI A ÉTÉ TESTÉ

| | |
|---|---|
| Méthode | Simulateur headless qui **extrait automatiquement le vrai code** de `AppTournoiPotes.jsx` (aucune recopie manuelle) + `barrage.js` importé réellement. Fausse base en mémoire. 100 % déterministe (seeds fixes). |
| Tournois simulés | **plus de 2 000**, joués de bout en bout (poules → barrages → tableau → consolante → champion) |
| Scénarios | 9 : config nominale, poules inégales, qualifiés/taille de tableau, consolante, égalités/barrages 701, corrections de score, planning des cibles, wizard vs runtime, balayage 2→64 équipes |
| Invariants | 12 (I1–I12) : pas de joueur en double, byes cohérents, aucun match orphelin, champion unique, comptes de matchs, cibles… |
| Vérification | 52 anomalies brutes → **38 défauts canoniques**, chacun attaqué par des vérificateurs adverses chargés de le démolir (3 angles pour D1–D21, 2 pour D22–D38) |
| **Résultat** | **34 confirmés · 4 faux positifs · 0 non vérifié** |

**Note de méthode :** l'exécution a heurté deux fois la limite de session. Les vérificateurs interrompus ont tous été relancés (reprise du 26/07 8h28, puis étape 4). Le rapport de synthèse automatique a échoué : **ce document a été rédigé à la main** à partir des verdicts bruts.

---

## 3. CE QUI MARCHE (solide)

- ✅ **Le cœur du moteur est juste.** 30 seeds sur 30 en config nominale : classement correct, tirage correct, champion désigné, zéro violation.
- ✅ **Classement de poule et barrages 701** : 64 vérifications directes sur `barrage.js`, 0 échec.
- ✅ **Planning des cibles en poules** : 0 écart avec l'appariement optimal sur 84 phases testées.
- ✅ **Verrou anti-double-comptage** (2 téléphones sur le même match) : fonctionne.
- ✅ **Aucun crash** sur 3 024 configurations balayées de 2 à 64 équipes.

---

## 4. LES 6 CORRECTIONS DÉPLOYÉES

| | Défaut | Ce qui a changé | Commit |
|---|---|---|---|
| 🟠 | **D3** consolante et petite finale affichées « activées » mais jamais créées (13 options sur 13) | `resolveBracketConfig()` dans `doLaunch()` : ce que l'écran promet est ce qui est créé | `eed0bc0` v60 |
| 🟡 | **D4** petite finale bloquée quand une demi est un exempt | elle n'est créée que s'il y aura deux vrais perdants | `eed0bc0` v60 |
| 🟠 | **D1 + D5 + D18** la 2ᵉ carte de taille de tableau fabriquait des cases mortes | proposée seulement si `qualifiés >= taille/2` ; plafond 32 retiré ; 2 garde-fous runtime | `eed0bc0` v60 |
| 🔴 | **D2** (partiel) un score du tableau ne pouvait jamais être corrigé | bouton « ✏️ Corriger le score » sur les matchs terminés ; message de blocage réécrit | `eed0bc0` v60 |
| 🟠 | **D24** les égalités parfaites départagées par le tirage au sort | **confrontation directe** ajoutée comme dernier critère, après le barrage 701 | `89428a5` v61 |

**Preuves :** 360 configurations → **0 blocage** (il y en avait **20**) · 20 équipes en 5×4 et 4×5 → champion 25/25, 3ᵉ place 25/25, consolante 25/25 · 7 suites de tests · build · lint · chargement vérifié dans le vrai navigateur.

⚠️ **Reste de D2 :** si le match SUIVANT a déjà été joué, l'inversion reste bloquée (défaire une cascade est trop risqué pour être bricolé). Le message dit maintenant la vérité au lieu d'envoyer sur une manœuvre impossible.

---

## 5. LES 27 DÉFAUTS CONFIRMÉS RESTANTS

### 🟠 Majeurs (5)

| id | défaut | ce que tu verrais | lieu |
|---|---|---|---|
| **D6** | Lecture « déchirée » dans `reload()` | Lancer les éliminatoires dans la seconde qui suit le dernier score → une égalité à 3 passe inaperçue, pas de barrage. 44-53 % des tournois ont au moins une égalité | `AppTournoiPotes.jsx:1726` |
| **D8** | « Les 3 premiers » redevient « les 2 premiers » | Des équipes qualifiées disparaissent sans un mot (15 → 10 mesuré). Dépend d'une colonne absente en base | `AppTournoiPotes.jsx:1843` |
| **D10** | Coupure réseau pendant une saisie du tableau | « Erreur », tu re-saisis, l'appli dit OK, mais le gagnant ne monte jamais. Contournement non documenté : saisir le score inverse puis re-corriger | `AppTournoiPotes.jsx:1917` |
| **D13** | « Revenir aux poules » efface les barrages 701 joués | Il faut les rejouer devant le club — et le résultat peut différer | `AppTournoiPotes.jsx:43` |
| **D14** | Consolante inéquitable | Le vainqueur a joué moins de matchs que les autres dans 13 seeds sur 20 (config par défaut à 10 repêchés) | `AppTournoiPotes.jsx:185` |

### 🟡 Mineurs (14)
D7 corriger un score de poule pendant les finales efface les stats du tableau (course à 2 téléphones) · D9 inscrit de dernière minute toujours en poule 1, parfois sans match · D11 session live zombie gèle les cibles jusqu'à 45 min · D15 aucun planning de cibles en éliminatoires (8 à 14 équipes convoquées pour 2 cibles) · D16 l'alerte « c'est à toi de jouer » consommée pour rien, ne re-sonne jamais · D17 la carte « 3 joueurs par poule » promet 14 qualifiés et en donne 7 · D19 les garde-fous du wizard n'empêchent rien · D20 répartition par arrondi → poule de 2 (élimination après un seul match) · D21 la durée estimée ignore la taille de tableau · D28 `saisirScore` calcule depuis l'état React périmé · D31 fausse bannière « Égalité à départager » avec bouton mort · D33 un exempt s'affiche « Terminé 0-0 contre À définir » · D34 texte faux sous « Consolante » · D37 deux réglages fantômes

### ⚪ Cosmétiques (8)
D22 exempts comptés comme des matchs à jouer · D23 barrages 701 absents des compteurs et de la durée · D25 2ᵉ critère de départage des barrages inopérant (commentaire mensonger) · D30 le compteur « à jouer » peut dépasser le nombre de cibles · D32 21 écritures Supabase par score de poule · D35 aperçu des croisements jamais affiché (code mort) · D36 collision de `position_bracket` entre barrages · D38 commentaire trompeur

### ❌ Écartés après vérification (4)
**D12** barrage orphelin · **D26** abandon silencieux au 30ᵉ tour de barrage · **D27** doublons de barrage (déclencheur principal déjà bloqué) · **D29** corriger un barrage ne recalcule rien (ligne citée fausse, chemin inatteignable)

---

## 6. LA CONFIG RECOMMANDÉE

Vérifiée sur **25 tournois** : 25/25 champions, **0 violation, 0 case morte, 0 exempt**.

> **4 poules de 5 joueurs** · **les 2 premiers qualifiés** · **taille de tableau par défaut** · **consolante 2 repêchés**

→ 40 matchs de poule → 8 qualifiés → tableau de 8 **sans aucun exempt** → consolante à 8 équipes **équitable**.

**Précautions restantes le jour J :**
1. ⏳ **Attendre 2-3 secondes** après le dernier score de poule avant « Lancer les éliminatoires » → évite D6
2. ✍️ **Relire chaque score du tableau** avant de valider — corrigeable, mais pas si le match suivant est déjà joué → D2
3. 📵 En cas d'« Erreur » réseau pendant une saisie du tableau : vérifier que le gagnant est bien monté → D10
4. 🔁 Éviter « Revenir aux poules » si des barrages 701 ont été joués → D13

---

## 7. CE QUI N'A PAS ÉTÉ COUVERT

- ❌ **Aucun test sur de vrais téléphones** ni sur le vrai Supabase. Les problèmes de concurrence et de réseau sont **déduits du code**, pas observés en conditions réelles.
- ❌ **L'interface n'a pas été parcourue visuellement** dans un navigateur (seuls le chargement des modules et la logique pure ont été vérifiés). Rien sur les débordements, la lisibilité mobile à 20 équipes, les listes longues.
- ❌ La partie React de `saisirScore` / `lancerEliminatoires` est **portée ligne à ligne** dans le simulateur (le reste est extrait automatiquement) — une divergence reste possible. Resynchronisée à la main le 26/07.
- ❌ Les corrections déployées n'ont **pas encore été éprouvées sur un vrai tournoi** au club.

---

## 8. ORDRE DE CORRECTION RECOMMANDÉ POUR LA SUITE

1. **D13** — ne plus effacer les barrages au retour aux poules (*correctif d'une ligne*)
2. **D6 + D10 + D28** — fiabiliser les écritures (recalcul depuis les matchs, avancement idempotent, lecture fraîche)
3. **D14** — consolante équitable (byes au 1ᵉʳ tour au lieu de la réduction par moitié)
4. **D15 + D16** — planning des cibles en éliminatoires et alerte « c'est à toi de jouer »
5. **D8 + D17 + D19 + D20** — garde-fous et libellés du wizard
6. **D2 (suite)** — inversion en cascade, si le besoin se confirme à l'usage
7. Le reste (D7, D9, D11, D21, D31, D33, D34, D37 + cosmétiques) au fil de l'eau

---

*Fichiers de l'audit : `NOTICE-SIMULATEUR.md`, `cartes/*.md`, `rapports/*.md`, `sorties/*.txt`, `defauts-canoniques.md`, `anomalies-etape2.json`, `non-verifies.json`.*
