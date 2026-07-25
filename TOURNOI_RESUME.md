# Dart Point — Comment fonctionne le mode « Tournoi entre potes »

> **But de ce fichier** : expliquer, de façon claire et complète, comment marche le mode tournoi
> de l'application Dart Point. Il est écrit pour qu'une autre IA (ChatGPT) puisse le lire, comprendre
> le système actuel, et proposer des améliorations concrètes.
>
> Dart Point = petite appli de fléchettes (React) pour jouer entre amis. Le mode tournoi sert à
> organiser un tournoi **convivial et local** entre potes présents (soirée, bar…).
> **Important : le tournoi n'a AUCUN impact sur les classements/stats officiels (DRIX).** C'est juste
> pour s'amuser sur place.

---

## 1. Vue d'ensemble en une phrase

On crée un tournoi, on inscrit les joueurs, on peut faire une **phase de poules** (petits groupes où
tout le monde joue contre tout le monde), puis une **phase à élimination directe** (un tableau / bracket
comme à la Coupe du monde), et enfin on a un **vainqueur**. Chaque match se joue avec le **Scoreur 501/301**
habituel de l'appli.

---

## 2. Le cycle de vie d'un tournoi (les « statuts »)

Un tournoi passe par ces grandes étapes (colonne `statut` en base) :

| Statut          | Ce que ça veut dire |
|-----------------|---------------------|
| `attente`       | **Salle d'attente / lobby.** On inscrit les joueurs, on règle les options. Rien n'a commencé. |
| `poules`        | **Phase de poules lancée.** Les groupes sont formés, les matchs de poules sont générés et se jouent. |
| `eliminatoires` | **Phase à élimination directe lancée.** Le tableau final (bracket) est généré à partir des qualifiés. |
| `termine`       | **Tournoi fini.** Il y a un vainqueur. Le tournoi passe dans « Mes tournois passés ». |

Remarque : la phase de poules est **optionnelle**. On peut, pour un petit nombre de joueurs, aller
directement en élimination directe (le bracket est alors construit à partir de tous les inscrits).

---

## 3. Les formats et les modes de jeu

Au moment de créer le tournoi, le créateur choisit :

- **Le mode de jeu** : `501` ou `301` (le score de départ aux fléchettes). Tous les matchs du tournoi
  utilisent ce mode.
- **Le format** : `simple` (chaque joueur joue seul) ou `doublette` (équipes de 2). En doublette, une
  « équipe » se comporte comme un seul participant dans le tableau.

---

## 4. Le modèle de données (3 tables Supabase)

Tout est stocké dans 3 tables. Voici les colonnes importantes (les noms sont en français dans le code).

### Table `tournois_potes` — le tournoi lui-même
| Colonne | Rôle |
|---------|------|
| `id` | identifiant du tournoi |
| `nom` | nom donné par le créateur |
| `mode` | `501` ou `301` |
| `format` | `simple` ou `doublette` |
| `createur_id`, `createur_pseudo` | qui a créé le tournoi |
| `statut` | `attente` / `poules` / `eliminatoires` / `termine` (voir §2) |
| `code` | petit code de partage (pour rejoindre / débloquer le jeu à distance, voir §9) |
| `nb_qualifies` | combien de joueurs sortent de chaque poule vers le tableau final |
| `date` | date de création |

### Table `tournois_potes_joueurs` — les participants
| Colonne | Rôle |
|---------|------|
| `id` | identifiant de l'inscription |
| `tournoi_id` | à quel tournoi il appartient |
| `nom` | nom affiché du joueur (ou de l'équipe en doublette) |
| `joueur_id` | lien vers un vrai compte Dart Point si c'est un membre (sinon vide = invité) |
| `groupe` | numéro de poule (1, 2, 3…). Tout le monde est dans le groupe 1 tant qu'on n'a pas fait de poules |
| `ordre` | ordre d'inscription |
| `points`, `victoires`, `defaites` | son bilan dans sa poule |
| `manches_pour`, `manches_contre` | manches (legs) gagnées / perdues → sert au « goal average » |

En doublette, les 2 coéquipiers sont regroupés dans une même ligne d'équipe (le champ `nom` contient
les deux, et il y a de quoi retrouver les 2 joueurs).

### Table `tournois_potes_matchs` — les matchs
| Colonne | Rôle |
|---------|------|
| `id` | identifiant du match |
| `tournoi_id` | à quel tournoi il appartient |
| `joueur1_id`, `joueur2_id` | les 2 participants (ce sont des `id` de la table joueurs). Peut être vide si en attente. |
| `score1`, `score2` | nombre de manches gagnées par chacun dans ce match |
| `gagnant_id` | le vainqueur une fois le match fini |
| `phase` | à quelle phase appartient le match (voir §6 : `poule`, `barrage`, `quart`, `demi`, `finale`, `consolante`…) |
| `groupe` | numéro de poule pour les matchs de poule |
| `statut` | où en est le match (voir tableau ci-dessous) |
| `round_bracket` | numéro de tour dans le tableau (0 = poule/round-robin ; 1, 2, 3… = tours d'élimination) |
| `position_bracket` | position/emplacement du match dans le tableau (sert à savoir qui affronte qui et où va le gagnant) |
| `manches_max` | format du match : en combien de manches gagnantes on joue (ex. « premier à 2 »). |

**Statuts possibles d'un match (`statut`) :**
- `en_attente` : match prêt, pas encore joué.
- `en_cours` : quelqu'un est en train de le jouer.
- `termine` : match fini, il y a un gagnant.
- `attente_avancement` : le match existe mais on attend encore de savoir qui vient d'un tour précédent.
- `bye_j1` / `bye_j2` : un des deux est « exempté » (bye) car il n'y a pas d'adversaire → il passe
  automatiquement au tour suivant.
- `vide` : emplacement vide du tableau (utilisé pour la structure).

---

## 5. La phase de poules (round-robin)

But : répartir les joueurs en petits groupes et faire jouer **tout le monde contre tout le monde**
dans chaque groupe, pour classer les joueurs.

1. Le créateur choisit le nombre de poules (ou l'appli répartit automatiquement selon le nombre de joueurs).
   Chaque joueur reçoit un numéro de `groupe`.
2. Pour chaque poule, on génère tous les matchs « chacun contre chacun » (fonction `genPouleMatchs`).
3. On joue tous ces matchs. Après chaque match, on met à jour `victoires`, `defaites`,
   `manches_pour`, `manches_contre` des joueurs.
4. À la fin, on **classe** chaque poule.

### Comment on classe une poule (règles de départage)

Le classement est calculé par la fonction `rankGroup` (fichier `src/barrage.js`). Ordre des critères :

1. **Plus de victoires** d'abord.
2. En cas d'égalité : **moins de défaites**.
3. Toujours à égalité : **meilleur goal average** = (`manches_pour` − `manches_contre`), càd la
   différence de manches (comme la différence de buts au foot).
4. Toujours à égalité : on joue un **match de barrage** en **701** (un mode plus court) pour départager.
   - Ces barrages sont des matchs à part (`phase = "barrage"`), générés par `creerBarrages`.
   - Il peut y avoir plusieurs tours de barrage si beaucoup d'égalités (`round_bracket` distingue les tours).
   - `src/barrage.js` fournit les outils pour repérer les égalités (`egalitesADepartager`, `memeNiveau`)
     et savoir quels barrages créer (`specsForGroup`).

Une fois chaque poule classée, les **N premiers de chaque poule** (`nb_qualifies`) sont **qualifiés**
pour la phase à élimination directe.

---

## 6. La phase à élimination directe (le tableau / bracket)

But : à partir des qualifiés, faire un tableau à élimination directe jusqu'au vainqueur.
Fonction principale : `lancerEliminatoires`.

### Étapes

1. **On récupère les qualifiés** : les `nb_qualifies` premiers de chaque poule (via `rankGroup`),
   en gardant leur rang de poule (1er de poule, 2e de poule…).
2. **On choisit la taille du tableau** : la plus petite puissance de 2 qui contient tout le monde
   (2, 4, 8, 16 ou 32). S'il y a par ex. 6 qualifiés, le tableau fait 8 places (donc 2 « byes »).
3. **On place les joueurs dans le tableau (seeding)** avec `seedPoolAware` / `seedBracket` :
   - On essaie d'éviter que deux joueurs de la **même poule** se retrouvent trop tôt.
   - On met les têtes de série (1ers de poule) loin les uns des autres.
4. **On génère les matchs du tableau** avec `genBracketMatchs`. Chaque match a une `phase`
   (`seizieme`, `huitieme`, `quart`, `demi`, `finale`, et `petite_finale` pour la 3e place).
5. **Les byes avancent automatiquement** (`propagerByes`) : un joueur sans adversaire est qualifié
   d'office pour le tour suivant, sinon le tableau se bloquerait.
6. On joue les matchs. À chaque match fini, `avancerApresMatch` fait **remonter le gagnant** vers le
   match du tour suivant (via `ciblesAvancement`, qui sait quel emplacement suivant remplir).
7. Le dernier match est la **finale** → le gagnant est le **vainqueur du tournoi** → statut `termine`.

### Options du tableau
- **Petite finale** (`petiteFinale`) : match pour la 3e place entre les 2 perdants des demi-finales.
- **Consolante** (`consolante`) : un **tableau secondaire** pour les joueurs éliminés en poules
  (les « repêchés »). On prend les `nbConso` (2 ou 3, réglable) meilleures équipes **non qualifiées**
  de chaque poule et on leur fait un mini-tournoi à part (`genConsolanteMatchs`). Ça permet à ceux
  qui n'ont pas passé les poules de continuer à jouer quand même.
- **Format des matchs** (`manches_max` / `manchesMap`) : on peut régler « en combien de manches
  gagnantes » on joue, éventuellement différemment selon le tour (ex. finale plus longue).

---

## 7. Comment on joue un match concrètement

- Depuis le tableau ou la poule, on clique sur un match → l'appli ouvre le **Scoreur** habituel de
  Dart Point (le même qu'en partie normale, en 501 ou 301 selon le tournoi), via une page dédiée
  (`scoreur-potes-<id_du_match>`).
- On marque les points normalement jusqu'à ce qu'un joueur gagne le match (au nombre de manches prévu).
- À la fin, le résultat (`score1`, `score2`, `gagnant_id`) est enregistré, le match passe `termine`,
  et l'appli fait avancer le gagnant (poule : mise à jour du classement ; élimination : montée au tour
  suivant).

---

## 8. Qui a le droit de saisir les scores ?

- Le **créateur** du tournoi peut toujours tout gérer et saisir tous les scores.
- Les autres joueurs peuvent saisir un score **s'ils ont débloqué le tournoi avec le `code`** de partage
  (logique `canPlay`). Ça permet de saisir les matchs depuis **plusieurs téléphones** différents.

---

## 9. Jeu à plusieurs téléphones / synchronisation (temps réel)

- Chaque tournoi a un **`code`** court et un **QR code**. On peut le partager pour qu'un pote rejoigne
  le tournoi ou débloque la saisie sur son propre téléphone.
- La synchro « live » d'un match en cours passe par une table `live_sessions` (et des sessions/volées
  live) : ça permet de suivre un match qui se joue sur un autre téléphone.
- **Note technique** : la mise à jour se fait par **polling** (l'appli redemande régulièrement l'état),
  pas par un vrai canal temps réel permanent. C'est simple et suffisant pour une soirée entre potes.

---

## 10. Là où le code vit (pour situer les fonctions)

- **`src/AppTournoiPotes.jsx`** — quasiment tout le mode tournoi :
  - `dbTP` : les fonctions qui lisent/écrivent en base (créer tournoi, ajouter joueur, ajouter matchs…).
  - `getTournoiConfig` : la config par défaut selon le nombre de joueurs.
  - `genPouleMatchs`, `genBracketMatchs`, `genConsolanteMatchs` : génération des matchs.
  - `seedBracket`, `seedPoolAware` : placement des joueurs dans le tableau.
  - `lancerEliminatoires` : passage poules → tableau final.
  - `avancerApresMatch`, `ciblesAvancement`, `propagerByes` : faire avancer les gagnants et les byes.
  - `creerBarrages` : matchs de barrage 701 pour départager les égalités.
  - `TournoiPotesPage` : la liste « Mes tournois » + le formulaire de création.
  - `TournoiPotesDetail` : l'écran principal qui orchestre tout un tournoi (lobby, poules, tableau).
  - `LobbyView` : la salle d'attente (inscrire les joueurs, inviter des amis, régler les options).
  - `ScoreurPotesWrapper` : le pont vers le Scoreur pour jouer un match.
- **`src/barrage.js`** — les règles de **classement d'une poule** et de **départage** :
  - `rankGroup` : classe une poule (victoires → défaites → goal average → barrages).
  - `egalitesADepartager`, `memeNiveau`, `specsForGroup`, `statBarrageTour` : outils autour des barrages.

---

## 11. Résumé ultra court (pour aller vite)

1. On crée un tournoi (`501` ou `301`, `simple` ou `doublette`).
2. On inscrit les joueurs dans le lobby (statut `attente`).
3. (Optionnel) **Poules** : groupes, chacun contre chacun, classement
   (victoires → défaites → goal average → barrage 701). Les N premiers se qualifient.
4. **Élimination directe** : tableau à partir des qualifiés, avec byes automatiques,
   option petite finale (3e place) et option consolante (repêchage des éliminés).
5. La **finale** désigne le **vainqueur** → statut `termine`.
6. Chaque match se joue avec le **Scoreur** normal ; plusieurs téléphones possibles via le `code`/QR.
7. **Aucun impact sur les stats officielles (DRIX)** — c'est du convivial.

---

## 12. Pistes d'amélioration possibles (à débattre)

*(Section ouverte : c'est ici que des idées d'amélioration peuvent s'insérer. Ce ne sont que des
exemples de zones où le système pourrait évoluer, pas des demandes fermes.)*

- **Répartition des poules** : proposer une répartition automatique plus « équilibrée » selon le niveau
  connu des joueurs (têtes de série), plutôt qu'aléatoire.
- **Formats de match par tour** : rendre encore plus simple le réglage « finale plus longue que les
  premiers tours ».
- **Consolante / repêchage** : options plus visuelles pour dire clairement qui est repêché.
- **Historique / palmarès** : mémoriser les vainqueurs passés, un petit palmarès entre potes.
- **Affichage du tableau** : rendre le bracket plus lisible sur téléphone (petit écran).
- **Reprise après coupure** : bien gérer si un téléphone se déconnecte en plein tournoi.
- **Départage sans barrage** : offrir une option « départage par tirage au sort » si on ne veut pas
  rejouer un 701.

> ⚠️ Contraintes à respecter pour toute amélioration :
> - Ça doit rester **simple** à utiliser (public : amis, soirées, pas des pros).
> - **Aucun impact sur les stats/classements officiels (DRIX).**
> - Ça doit marcher **sur téléphone** (mobile d'abord) et **à plusieurs téléphones** (code/QR).
> - Base de données : Supabase (3 tables ci-dessus). Ajouter une colonne = possible mais il faut
>   prévoir une migration SQL, donc éviter si on peut faire autrement.
