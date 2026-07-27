# Audit du mode « Tournoi entre potes » — simulation 20 équipes

**Audit :** 26 juillet 2026 · **Corrections terminées :** 27 juillet 2026 · **Appli :** Dart Point (`Dart_Point/src/`)
**État :** ✅ **TERMINÉ — 38 défauts vérifiés · 34 confirmés · 32 corrigés et déployés** (versions 60 → 69)

---

## 1. VERDICT

🟢 **Le mode Tournoi est prêt pour un vrai tournoi de 20 équipes.**

Au départ le verdict était orange : trois pièges pouvaient figer un tournoi en cours devant tout le club. Tout ce qui bloquait, faussait un classement ou trompait l'organisateur est corrigé. Les 2 défauts restants sont laissés **volontairement** (§6).

⚠️ **Seule réserve** : ces corrections sont validées par simulation et par les tests, mais **n'ont pas encore tourné lors d'un vrai tournoi** au club (§7).

---

## 2. CE QUI A ÉTÉ FAIT

| | |
|---|---|
| Méthode | Simulateur headless qui **extrait automatiquement le vrai code** de `AppTournoiPotes.jsx` (aucune recopie manuelle) + `barrage.js` importé réellement. Fausse base en mémoire. 100 % déterministe (seeds fixes). |
| Tournois simulés | **plus de 2 000**, joués de bout en bout (poules → barrages → tableau → consolante → champion) |
| Scénarios | 9 : config nominale, poules inégales, qualifiés/taille de tableau, consolante, égalités/barrages 701, corrections de score, planning des cibles, wizard vs runtime, balayage 2→64 équipes |
| Invariants | 12 (I1–I12) : pas de joueur en double, byes cohérents, aucun match orphelin, champion unique, comptes de matchs, cibles… |
| Vérification | 52 anomalies brutes → **38 défauts canoniques**, chacun attaqué par des vérificateurs adverses chargés de le démolir |
| **Résultat de l'audit** | **34 confirmés · 4 faux positifs · 0 non vérifié** |
| **Corrections** | **32 déployées** · 2 écartées volontairement |

---

## 3. CE QUI MARCHE (validé)

- ✅ **Le cœur du moteur est juste** : classement, tirage, barrages 701, planning des cibles, verrou anti-double-comptage.
- ✅ **Aucun crash** sur 3 024 configurations balayées de 2 à 64 équipes.
- ✅ **360 configurations** rejouées après chaque correction : 0 crash, 0 blocage, 0 violation d'invariant.
- ✅ **7 suites de tests** + 5 tests de simulation dédiés aux correctifs, tous verts.

---

## 4. LES 32 CORRECTIONS DÉPLOYÉES

### 🔴 Bloquant
| id | Défaut | Correction | Version |
|---|---|---|---|
| **D2** | Un score du tableau ne pouvait **jamais** être corrigé | Bouton « Corriger le score » + message de blocage réécrit ⚠️ *l'inversion en cascade reste bloquée si le match suivant est déjà joué* | v60 |

### 🟠 Majeurs (8)
| id | Défaut | Correction | Version |
|---|---|---|---|
| **D1 / D5 / D18** | La 2ᵉ carte de taille de tableau fabriquait des cases mortes → aucun champion | Proposée seulement si `qualifiés ≥ taille/2` ; plafond 32 retiré ; 2 garde-fous runtime | v60 |
| **D3** | Consolante et petite finale affichées ACTIVÉES mais jamais créées (13 options sur 13) | `resolveBracketConfig()` dans `doLaunch()` | v60 |
| **D24** | Les égalités parfaites départagées par le **tirage au sort** | **Confrontation directe** ajoutée comme dernier critère, après le barrage 701 | v61 |
| **D6** | Une vraie égalité pouvait devenir invisible au lancement | Relecture fraîche + classement recalculé depuis les matchs + refus de lancer s'il reste un barrage | v62 |
| **D10** | Coupure réseau pendant une saisie → tableau figé | Avancement auto-réparé si la case suivante est vide | v62 |
| **D13** | « Revenir aux poules » effaçait les barrages 701 joués | `phase=not.in.(poules,barrage)` | v62 |
| **D14** | Consolante inéquitable (vainqueur avec 1 seul match) | Vrai tableau puissance de 2, tous les exempts au 1ᵉʳ tour | v63 |
| **D8** | Le réglage « qualifiés par poule » pouvait être perdu en silence | Relecture après écriture + alerte si échec | v63 |

### 🟡 Mineurs et cosmétiques (23)
| Version | Corrections |
|---|---|
| v60 | **D4** petite finale plus jamais bloquée quand une demi est un exempt |
| v64 | **D15** planning des cibles en phase finale (**18 équipes convoquées → 4**) |
| v65 | **D16** l'alerte « c'est à toi de jouer » re-sonne quand il faut (anti-rebond 60 s) |
| v68 | **D33** un exempt ne s'affiche plus « Terminé 0-0 » · **D11** bouton « Débloquer les cibles » |
| v69 | **D9** lobby fermé avant le tirage · **D20** alerte poule de 2 · **D31** fausse bannière d'égalité · **D7** correction de poule refusée pendant le tableau · **D28** lecture fraîche dans `saisirScore` · **D17** cartes annonçant le vrai nombre de qualifiés · **D21/D22/D23** durées et compteurs justes · **D37** réglages qui survivent · **D30** compteur ≤ nombre de cibles · **D34** texte consolante exact · **D35** aperçu des croisements enfin affiché · **D36** collision `position_bracket` · **D25/D38** commentaires trompeurs |

---

## 5. FAUX POSITIFS ÉCARTÉS (4)
**D12** barrage orphelin · **D26** abandon silencieux au 30ᵉ tour · **D27** doublons de barrage · **D29** correction de barrage sans recalcul.

---

## 6. ⛔ LES 2 DÉFAUTS LAISSÉS VOLONTAIREMENT

**Ne pas les « réparer » sans relire ces raisons.**

### D32 — 21 écritures Supabase par score de poule
L'upsert groupé proposé (`Prefer: resolution=merge-duplicates`) est un vrai `INSERT … ON CONFLICT` : un `id` inconnu **créerait une ligne joueur fantôme** visible dans les poules et le classement, et une colonne `NOT NULL` absente ferait **échouer chaque saisie de score**.
Or : les `PATCH` partent **en parallèle** (`Promise.all`, ~6 aller-retours réels), le bouton est déjà désactivé pendant l'attente, l'egress n'est plus un sujet (plan Supabase Pro), et ce bloc est le **cœur auto-guérissant du classement** — il réécrit tout depuis la vérité des matchs à chaque saisie, ce qui répare tout seul une écriture perdue.
→ **Risque de corruption ≫ gain invisible.**

### D19 — Garde-fous du wizard non appliqués
Le constat est exact (le bouton n'est jamais grisé, `validateBracketConfiguration` n'est branché nulle part), mais **aucune erreur n'est plus atteignable** : le lobby bloque déjà moins de 2 participants, le clamp de D17 absorbe les qualifiés trop nombreux, et `sizeOptions` + `nextPow2TP` ont supprimé les configurations mortelles.
Griser le bouton n'attraperait donc plus rien, mais **bloquerait un cas légitime** : un petit tournoi à 1 qualifié par poule, qui fonctionne aujourd'hui (tableau de 2 + `propagerByes`). Et un bouton grisé sans explication est le pire scénario pour un non-technicien un soir de tournoi.
→ **Défaut latent, à laisser tel quel.**

---

## 7. CE QUI N'A PAS ÉTÉ COUVERT

- ❌ **Aucun test sur de vrais téléphones** ni sur le vrai Supabase : tout est simulé en mémoire. Les problèmes de concurrence et de réseau sont **déduits du code**, pas observés.
- ❌ **L'interface n'a pas été parcourue visuellement** : seuls le chargement des modules, l'absence d'erreur console et la logique pure ont été vérifiés.
- ❌ La partie React de `saisirScore` / `lancerEliminatoires` est **portée ligne à ligne** dans le simulateur (le reste est extrait automatiquement) — une divergence reste possible.
- ❌ **Les 32 corrections n'ont pas encore servi lors d'un vrai tournoi.**

👉 **La prochaine étape la plus utile n'est plus du code : c'est un tournoi d'essai à 4-6 joueurs.** Une heure suffit pour éprouver en conditions réelles ce qu'aucune simulation ne peut confirmer.

---

## 8. LA CONFIG RECOMMANDÉE POUR 20 ÉQUIPES

Vérifiée sur **25 tournois** : 25/25 champions, 0 violation, 0 case morte, 0 exempt.

> **4 poules de 5 joueurs** · **les 2 premiers qualifiés** · **taille de tableau par défaut** · **consolante 2 repêchés**

→ 40 matchs de poule → 8 qualifiés → tableau de 8 **sans aucun exempt** → consolante à 8 équipes **équitable**.

**Seule précaution qui reste :** faire relire chaque score du tableau avant de valider — il est corrigeable, sauf si le match suivant a déjà été joué.

*(Les précautions d'origine sur l'égalité invisible, la 2ᵉ carte de tableau, la coupure réseau et les barrages effacés ne sont plus nécessaires : elles sont corrigées dans le code.)*
