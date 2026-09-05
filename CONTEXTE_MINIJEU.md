# CONTEXTE — mini-jeu « ARCADE » de Dart Point

Document de passation pour reprendre le mini-jeu et en faire une version 3D.
Tout ce qui suit a été **vérifié dans le code**, pas reconstitué de mémoire.
État au **4 septembre 2026**, commit `383e9bd`, `public/version.txt` = **131**.

---

## ⚠️ À LIRE EN PREMIER — une hypothèse à corriger

La question 4 demande « comment un lancer se traduit en **action de course** ».

**Il n'y a pas de course.** Arcade n'est pas un jeu de course et n'a jamais eu de
boucle de simulation. C'est un **scoreur de fléchettes X01 au tour par tour**,
joué en *pass-and-play* sur **un seul téléphone** que les joueurs se passent.

- Personne ne « lance » dans le jeu : un humain lance de vraies fléchettes sur une
  vraie cible, puis **saisit au clavier** ce qu'il a touché.
- Il n'y a **aucune boucle de rendu**, aucun `requestAnimationFrame`, aucun
  `<canvas>`, aucun WebGL. Vérifié : ces quatre termes apparaissent **0 fois** dans
  les quatre fichiers du jeu.
- Le mot « course » n'existe que dans une phrase de victoire : *« Thomas remporte
  la course »*. C'est une image, pas une mécanique.

**Conséquence pour une version 3D :** il ne s'agit pas de *remplacer* un moteur de
rendu, il s'agit d'en **introduire un là où il n'y en a jamais eu**. Le travail est
donc une addition, pas une substitution — ce qui est une bonne nouvelle : les
règles ne bougeront pas.

---

## 1. Sur quelle pile le mini-jeu est-il codé ?

| | |
|---|---|
| Langage | **JavaScript + JSX**. Pas de TypeScript dans le code applicatif |
| Framework | **React 19.2.5** (`react-dom` 19.2.5) |
| Build | **Vite 8.0.9** — attention, Vite 8 tourne sur **Rolldown**, pas Rollup |
| Moteur de rendu graphique | **AUCUN** |
| Rendu réel | **DOM + CSS + SVG en ligne** |

**Il n'y a aucune bibliothèque 3D ni 2D dans le projet.** Pas de Three.js, pas de
Phaser, pas de PixiJS, pas de Babylon, pas de `@react-three/fiber`. Ni déclarée
dans `package.json`, ni présente dans `node_modules`.

Les **6 seules dépendances de production** du projet entier :

```
html5-qrcode ^2.3.8    lottie-web ^5.13.0    lucide-react ^1.16.0
qrcode ^1.5.4          react ^19.2.5         react-dom ^19.2.5
```

Notamment **absents** : `@supabase/supabase-js`, un routeur, une bibliothèque
d'état (Redux/Zustand), Tailwind. Tout est fait à la main.

TypeScript **est** installé (6.0.3) et `npm run build` lance `tsc -b` avant Vite,
mais `tsconfig.app.json` a `strict: false` et `allowJs: true` : le JS passe sans
typage. Seul `vite.config.ts` est réellement du TypeScript, et il tient en 7 lignes
(plugin React, rien d'autre — aucun alias, aucun réglage de build).

---

## 2. Quels fichiers composent le mini-jeu ?

**Quatre fichiers source + deux fichiers de test. 2 641 lignes en tout.**

```
src/
├── AppArcade.jsx        1567 l.  79 819 o   L'écran et l'enchaînement des tours
├── arcadePouvoirs.js     579 l.  28 771 o   TOUTES les règles — fonctions pures
├── arcadeEffets.jsx      272 l.  16 086 o   Boîte à outils visuelle
└── arcadeTuto.jsx        223 l.  10 796 o   Le tutoriel en 6 écrans
tests/
├── arcade-pouvoirs.test.mjs      12 429 o   82 assertions sur les règles
└── arcade-robustesse.test.mjs     7 277 o   Fuzzing, 360 000 tirages
```

### Rôle exact de chaque fichier

**`arcadePouvoirs.js` — le cœur.** Fonctions **pures** : aucun React, aucun
affichage, aucun `localStorage`, **aucun `import`**. Il ne dépend de rien. C'est
lui qui décide de tous les scores. **25 exports.**

**`AppArcade.jsx` — l'écran.** Ne calcule **aucun** score lui-même. Gère les états
React, l'enchaînement des tours, la sauvegarde, et 9 types de fenêtres modales.
**2 exports seulement** : `JEU` (la chaîne `"Arcade"`) et `Arcade` (le composant).
Tout le reste est privé.

**`arcadeEffets.jsx` — le décor.** Explosions, particules, boîte cadeau, flashs,
tampons, secousses, vibrations. **Ne connaît aucune règle.** 15 exports.

**`arcadeTuto.jsx` — le tutoriel.** 6 écrans. 4 exports.

### Graphe de dépendances — un arbre simple, sans cycle

```
App.jsx ──> AppArcade.jsx ──┬──> arcadePouvoirs.js   (ne dépend de RIEN)
                            ├──> arcadeEffets.jsx    (dépend de react seul)
                            └──> arcadeTuto.jsx ─────> arcadeEffets.jsx
                                                    └> icons.jsx
tests/*.test.mjs ──> arcadePouvoirs.js  (uniquement)
```

**Aucun autre fichier du dépôt ne touche aux modules Arcade.** C'est ce qui rend
la refonte 3D sûre : on peut remplacer `AppArcade.jsx` et `arcadeEffets.jsx`
entièrement sans toucher à `arcadePouvoirs.js` ni au reste de l'application.

### Dépendances externes du composant

`AppArcade.jsx` importe, hors modules Arcade :

- `react` — `useState`, `useEffect`, `useRef`, `useMemo`
- `lucide-react` — `ArrowLeft`, `X`, `RotateCcw`, `Trophy`, `HelpCircle`
- `./icons` — `EmoIcon({e, size, color, strokeWidth, style, fill})`
- `./DPLottie` — `ConfettiBurst({data, loop, style})`
- `./lottie/confetti.json`
- `./FriendPicker` — `FriendNameInput({value, onChange, placeholder, joueurId, theme, ...})`

**`FriendNameInput` est le seul point qui touche au réseau** (il charge la liste
d'amis), et uniquement sur l'écran de configuration.

---

## 3. Comment le jeu est-il intégré, et comment le lancer en local ?

### Intégration : trois lignes dans `App.jsx`, rien d'autre

**Il n'y a aucun routeur.** Toute la navigation de Dart Point repose sur **un seul
état React** : `const [page, setPage] = useState("home")` (`App.jsx:14516`).
L'application entière est un unique arbre React qui affiche ou masque des blocs
selon la valeur de la chaîne `page`.

```jsx
// src/App.jsx:24
import { Arcade, JEU } from "./AppArcade";

// src/App.jsx:8203 — la carte dans la liste des jeux
<GameCardTexte label={JEU.toUpperCase()} badge="BÊTA" onClick={()=>setPage("arcade")} />

// src/App.jsx:15450 — le montage
{page === "arcade" && <Arcade setPage={nav} joueur={joueur} />}
```

**Chemin de l'utilisateur :** Accueil → bouton-image « Lance une partie » →
`setPage("jeux-flechettes")` → `<PageModeJeu initCat="fleche">` → 5ᵉ carte de la
liste → `setPage("arcade")`.

### `isGamePage` — le mécanisme à connaître absolument

`App.jsx:14944` définit une liste de pages considérées comme « en partie », dont
`"arcade"`. Cette liste a **4 effets concrets** :

1. `navSafe(cible)` — quitter une page de jeu **ouvre une modale de confirmation**
   au lieu de naviguer directement
2. Le **bouton Retour Android** (`popstate`) ouvre la même modale au lieu de reculer
3. Le bouton flottant « Reprendre le tournoi » est masqué
4. **La barre de navigation du bas n'est pas rendue du tout**

Si une version 3D crée une nouvelle valeur de `page`, **elle doit être ajoutée à
`isGamePage`**, sinon un joueur perdra sa partie d'un clic sur le bouton Retour.

### Plein écran et z-index

L'écran de **jeu** est `position: fixed; inset: 0; z-index: 500; overflow: hidden;
touchAction: "none"`. Il recouvre physiquement la barre du haut. La zone qui défile
garde `touchAction: "pan-y"`. L'écran de **configuration**, lui, est en flux normal.

Échelle réelle de l'application : barre du haut **200**, barre du bas **300**, menu
latéral **400** (voile 399), menu déroulant du profil **500**, modales **2000**.
L'Arcade est à **500** — donc à égalité avec le menu du profil, pas strictement
au-dessus.

### Filet de sécurité

Un `ErrorBoundary` unique enveloppe le bloc des pages, avec `key={page}` (il se
remonte à chaque changement de page). Son rôle documenté : éviter l'**écran noir**.
La barre du haut, le pied de page et les modales sont **hors** de ce filet.

### Lancer en local

```bash
npm install          # npm, pas yarn ni pnpm (seul package-lock.json existe)
npm run dev          # http://localhost:5173
```

Aucune version de Node n'est imposée (pas de `engines`, pas de `.nvmrc`). La
machine de développement tourne sous Node 24.15.0 / npm 11.12.1.

Les 4 scripts existants : `dev`, `build` (`tsc -b && vite build`), `lint`, `preview`.
**Il n'y a pas de script `test`** — voir §8.

Aucune variable d'environnement n'est nécessaire : `import.meta.env` n'apparaît
nulle part et il n'y a aucun fichier `.env`.

---

## 4. Les règles du jeu

### Le principe

Un **X01 classique** transformé en jeu d'arcade. Chaque joueur part d'un score
(301, 501, 701, 1001, ou personnalisé entre 101 et 3001) et doit arriver
**exactement à 0** avant les autres. **2 à 8 joueurs**, sur un seul téléphone.

Deux modes de fin : **DOUBLE OUT** (il faut finir sur un double) ou **SIMPLE OUT**.

### Ce qu'un « lancer » veut dire ici

Une fléchette est un objet de **deux champs, rien de plus** :

```js
{ s, m }
// s = secteur : 1 à 20, ou 25 (bull), ou 0 (raté)
// m = multiplicateur : 1 (simple), 2 (double), 3 (triple)
```

`points(d) = (d?.s || 0) * (d?.m || 1)`. Le **bull n'a pas de triple** : à la saisie,
`m` est plafonné à 2 quand `s === 25`.

Cette forme n'est pas cosmétique : **c'est elle qui rend les cadeaux possibles**.
Un total de 60 ne dit pas si le joueur a fait T20 ou 20+20+20. Le jeu a besoin du
secteur **et** du multiplicateur de chaque fléchette.

### La boucle d'un tour — l'ordre exact des fonctions

| # | Fonction | Ce qui se passe |
|---|---|---|
| 1 | `demarrerTour(idx)` | Tire un numéro cadeau (15-20), `+1 cadeauxTentes`, ouvre la fenêtre d'annonce |
| 2 | *(le joueur ferme la fenêtre)* | « C'EST PARTI » |
| 3 | `lancerPouvoir(id)` *(optionnel)* | → `suiteApresCible` → `appliquer` |
| 4 | `ajouter({s,m})` × 1 à 3 | Saisie. Un `useMemo` appelle `resoudreVolee` **à chaque frappe** pour l'aperçu live |
| 5 | `validerVolee()` | `resoudreVolee` → `cadeauDeLaVolee` → `tirerCadeau` → mise à jour → victoire ou suite |
| 6 | `fermerResultat()` | Si l'inventaire est plein → `garderDeux(k)` |
| 7 | `passerLaMain(a)` | Rejoue le même joueur, ou `demarrerTour((actif+1) % n)` |

⚠️ **`demarrerTour` reçoit l'index en argument** parce que `setActif` n'a pas encore
pris effet quand la fonction est appelée juste après — sinon la tentative de cadeau
serait créditée au joueur précédent.

### Les cadeaux

À **chaque** tour, le jeu tire un numéro entre 15 et 20 et l'annonce. Le joueur
joue normalement ; s'il touche ce numéro, il gagne un pouvoir. La rareté dépend du
multiplicateur touché :

| Touché | Rareté | Cartes disponibles |
|---|---|---|
| Simple | PETIT | 7 |
| Double | SUPER | 9 |
| Triple | MÉGA | 8 |
| Triple + 2 % | **LÉGENDAIRE** | 4 |

**Un seul cadeau par volée** — on garde le meilleur. Un cadeau raté n'entraîne
aucune pénalité. **28 pouvoirs au total.** Inventaire de **2 cartes maximum** ;
une 3ᵉ carte ouvre une fenêtre « laquelle jeter ? » — jamais de suppression
automatique.

### `resoudreVolee` — la seule autorité sur le score

```js
resoudreVolee(scoreAvant, flechettes, doubleOut, effets = [])
```

**Pure. Ne mute rien. Ne touche ni à React ni au `localStorage`.**

Elle applique les effets dans un **ordre strict qui ne doit pas changer** :

1. **Protections** — Supernova filtre tous les malus, `malusBloques` garde la trace
2. **Nombre de fléchettes** — `maxF` = 1 (Une seule fléchette) / 2 (Gel) / 3
3. **Verrouillage** — les fléchettes sur le numéro verrouillé valent 0
4. **Multiplicateur positif** — le plus fort gagne, **jamais cumulé**, puis
   `Math.floor` (obligatoire : le Jackpot ×1,5 produisait des scores à virgule)
5. **4 bis — Meilleure ×2** — double la fléchette la plus forte, une seule
6. **Division / annulation** — Volée annulée (×0), Bombe 40 (×0 si < 40),
   Frein (×0,5), toujours `Math.floor`
7. **Score, bust, finish** — fléchette par fléchette

Elle retourne **toujours un objet plat de 18 champs** :

```js
{ score, bust, gagne, fait, utilisees, maxF, brut, multPos, facteurNeg,
  verrou, immunise, doubleX2, finishLibre, ignorees, malusBloques,
  aTourBonus, aSecondeChance, aBrouillard }
```

### Trois règles de sécurité à ne jamais casser

- **Un bust annule TOUTE la volée** — retour au score du **début** de la volée,
  pas à celui d'avant la dernière fléchette.
- **Rester à exactement 1 en Double Out est TOUJOURS un bust**, même avec Finish
  Facile. Sans cette règle, le pouvoir expire en fin de volée et depuis 1, en
  Double Out, **aucune** des 63 fléchettes saisissables ne permet plus de finir :
  la partie est perdue à vie.
- **Aucun pouvoir ne peut faire gagner** (`retraitAutorise`). Le dernier point
  vient toujours d'une fléchette.

### Anti-abus et équilibrage

Quatre **groupes** interdisent le cumul : `multiplicateur`, `annulation`, `finish`,
`restriction`. Plus : `MAX_MALUS = 2` (pas de 3ᵉ mauvais coup sur un même joueur),
et le même pouvoir deux fois est refusé.

`rangDuJoueur` renvoie `leader` / `milieu` / `dernier`. Une table de poids module
discrètement le tirage : le meneur reçoit moins d'attaques (×0,6) et plus de
défense (×1,3) ; le dernier reçoit plus d'attaques (×1,3) et plus de boosts (×1,35).
Effet mesuré par le test : **2 240 attaques pour le meneur contre 2 456 pour le
dernier sur 4 000 tirages**.

### Fin de partie

Victoire dès qu'un joueur atteint 0. Écran de statistiques + jusqu'à **6 titres
humoristiques** : ROI DES CADEAUX, SABOTEUR, CHAT NOIR, TANK, MIRACULÉ, SNIPER.
Revanche : mêmes joueurs, même score, inventaires et malus remis à zéro, et c'est
un **autre** joueur qui commence.

---

## 5. Quelles données entrent et sortent du jeu ?

### La réponse courte : **rien ne sort. Le jeu est 100 % local.**

**Arcade n'écrit RIEN et ne lit RIEN dans la base.** Vérifié : `fetch`,
`XMLHttpRequest`, `axios`, `sendBeacon`, `WebSocket`, `EventSource` — **zéro
occurrence** dans les quatre fichiers. Aucune table ne porte la moindre trace
d'une partie Arcade. Pas de DRIX, pas d'XP, pas de statistiques de profil, pas de
classement, aucune publication au Comptoir.

C'est un **choix**, pas un oubli — mais c'est aussi le principal chantier restant
si on veut que l'Arcade compte (voir §8).

### Ce qui entre

**Deux props, et c'est tout :**

```jsx
<Arcade setPage={nav} joueur={joueur} />
```

- **`setPage(chaine)`** — appelé exactement **deux fois**, toujours avec `"jeux"`
- **`joueur`** — utilisé **une seule fois dans tout le fichier** :
  `joueurId={joueur?.id}` passé à `<FriendNameInput>` sur l'écran de configuration

C'est la seule touche indirecte à Supabase : `FriendPicker` fait une **lecture
seule** de la table `amis` pour proposer les noms d'amis, avec cache en mémoire.
Si `joueurId` est absent, le composant **dégrade proprement** en champ texte libre.

### Ce qui sort : 4 clés `localStorage`

| Clé | Contenu |
|---|---|
| `dp_arcade_partie` | La partie en cours (sauvegarde automatique) |
| `dp_arcade_vibrations` | `"1"` ou `"0"` |
| `dp_arcade_vu_<clé>` | Préfixe dynamique — bulles d'aide déjà vues (`_attaque`, `_cadeau`) |
| `dp_arcade_tuto_vu` | `"1"` si le tutoriel a été vu |

Tous les accès sont enveloppés dans `try/catch`.

### Forme exacte de la sauvegarde

```js
localStorage["dp_arcade_partie"] = {
  etape: "jeu",          // toujours "jeu" — rien n'est sauvegardé en configuration
  joueurs: [ /* objets joueur complets */ ],
  actif: 0,              // index du joueur courant
  cadeauNum: 18,         // 15-20, ou null
  volee: [ {s,m}, ... ], // fléchettes déjà saisies
  depart: 501,           // 301|501|701|1001|"perso"
  perso: "801",          // ⚠️ INDISPENSABLE — voir ci-dessous
  doubleOut: true,
  enAttente: { ... },    // ⚠️ DONNÉES PURES, jamais de fonction
  dernierTour: { ... },
  fenetre: "tour",       // "resultat" | "plein" | "tour" | null
  v: 2                   // VERSION_SAUVE
}
```

### Forme exacte d'un joueur

```js
{
  nom, score,
  volees: [],            // [{ flechettes: [{s,m}], fait, bust }]
  flechettes: 0, total: 0, busts: 0,
  pouvoirs: [],          // inventaire, 2 max, tableau d'identifiants
  effets: [],            // [{ id, num?, x?, de? }] — actifs sur SA prochaine volée
  bouclier: false,       // ⚠️ BOOLÉEN à part, PAS une entrée de effets
  renvoi: false,         // ⚠️ idem
  retardMax: 0,
  stats: { cadeauxTentes, cadeauxReussis, petits, supers, megas,
           legendaires, pouvoirsUtilises, malusEnvoyes, malusRecus }
}
```

⚠️ `bouclier` et `renvoi` étant des booléens **hors** du tableau `effets`,
`pourquoiImpossible()` ne les voit pas. Il a fallu un test dédié dans
`lancerPouvoir` pour ne pas consommer une carte déjà armée.

---

## 6. Dépendances, versions, contraintes

### Versions exactes installées

```
react 19.2.5      react-dom 19.2.5     vite 8.0.9        typescript 6.0.3
lottie-web 5.13.0 lucide-react 1.16.0  html5-qrcode 2.3.8  qrcode 1.5.4
@vitejs/plugin-react 6.0.1             eslint 10.2.1
```

npm (`package-lock.json` v2, seul fichier de verrouillage).

### Contraintes qu'une version 3D doit respecter

**Cible : le téléphone, en portrait.** Le manifeste PWA impose
`display: standalone`, `orientation: portrait`. Le jeu est testé en **375 × 812**.

**Performance.** L'objectif écrit dans le code est *60 images par seconde sur un
téléphone moyen*. La règle actuelle est stricte : **aucun canvas, aucune boucle
JavaScript** ; seules `transform` et `opacity` sont animées, les deux seules
propriétés qu'un téléphone traite sans repeindre la page. C'est **le point que la
3D remet directement en cause** — il faudra mesurer sur un vrai appareil, pas
seulement sur un ordinateur de développement.

⚠️ Cet objectif de 60 fps est une **intention écrite en commentaire, pas une
mesure**. Personne n'a profilé le jeu. Impossible de dire de combien une version
3D s'en éloignerait.

**`prefers-reduced-motion`.** Un bloc `@media` ramène toutes les animations à
0,001 ms. Une version 3D doit prévoir l'équivalent.

**Poids du bundle.** Le chunk principal fait déjà **2,52 Mo** et Vite avertit à
chaque build. Ajouter Three.js sans découpage de code aggravera un problème déjà
présent. `vite.config.ts` est vierge de tout réglage : le découpage sera à créer.
⚠️ Vite 8 utilise **Rolldown** : la configuration passe par `build.rolldownOptions`,
**pas** `rollupOptions`.

**Débordement horizontal.** Piège déjà rencontré deux fois : une explosion de
niveau 3 ou 4 mesure jusqu'à **320 px** et faisait apparaître une barre de
défilement latérale (452 px de contenu pour 375 px d'écran). `overflow: hidden`
est obligatoire autour de tout effet qui dépasse.

**HTML valide.** Un `<button>` dans un `<button>` fait avaler un clic sur deux par
le navigateur. Le bouton « ? » des cartes est posé **à côté**, jamais dedans.

---

## 7. Quels assets existent, et où ?

### Pour le mini-jeu : **AUCUN. Zéro fichier.**

Vérifié : aucune référence à `.png`, `.webp`, `.jpg`, `<img>`, `background-image`
ni `src=` dans les quatre fichiers. Les deux seuls `url(...)` sont des références
à des dégradés SVG **internes**.

Tout le visuel est fabriqué avec **quatre briques** :

1. **CSS** — 15 `@keyframes` injectées une seule fois par `<StylesArcade/>` :
   `arcFlotte`, `arcTremble`, `arcArrivee`, `arcEclate`, `arcOnde`, `arcFlash`,
   `arcCarte`, `arcRayons`, `arcSecousse`, `arcPulse`, `arcTampon`, `arcMonte`,
   `arcFile`, `arcBrille`, `arcHalo`
2. **SVG en ligne dessiné à la main** — la boîte cadeau (`arcadeEffets.jsx:150-173`,
   `viewBox 0 0 100 100`, 2 dégradés + 5 tracés + 1 texte) et la cible du tutoriel
   (`arcadeTuto.jsx:33-54`, 20 secteurs calculés en trigonométrie)
3. **Icônes SVG Lucide** via `<EmoIcon>`
4. **Styles React en ligne**

⚠️ **La boîte cadeau doit rester originale.** Le cahier des charges interdit
explicitement de reprendre une boîte de licence existante. Celle-ci est un cube en
perspective avec ruban en croix et gros point d'interrogation, dessiné à la main.

### `src/icons.jsx` — le pont emoji → SVG

L'application n'affiche **pas** d'emojis comme icônes (règle du design system).
`EmoIcon` traduit un emoji en composant Lucide via une table. **Les 28 icônes de
pouvoirs sont toutes couvertes.** Un emoji absent de la table **retombe sur
l'emoji brut** — donc rien ne casse, mais l'icône dénote.

### Sons : **il n'y en a aucun**

Aucun fichier `.mp3`, `.wav`, `.ogg`… dans tout le dépôt. Le seul son de
l'application entière est un bip généré en Web Audio dans le module Tournoi.

C'est **volontaire** : le cahier des charges demandait de ne développer aucun son
dans cette première version, mais de préparer la place. Elle l'est : la table
`MOTIFS` d'`arcadeEffets.jsx` associe déjà **8 évènements** à une signature de
vibration (`petit`, `super`, `mega`, `legendaire`, `malus`, `bust`, `victoire`,
`clic`). C'est là que le son viendra se brancher.

### Lottie

`src/lottie/` contient 2 fichiers : `confetti.json` (68 ko) et `boom.json` (43 ko).
L'Arcade n'utilise que **confetti**, pour la victoire, via `<ConfettiBurst>`.
⚠️ `boom.json` n'est importé par personne — reste à brancher, ou à supprimer.

### Palette du jeu

```js
const C = {
  bg: "#0a0a12", card: "#12121c", card2: "#0b0b12", border: "#26263a",
  text: "#f1f5f9", muted: "#8b93a7", faint: "#4a5468",
  green: "#22c55e", orange: "#f97316", red: "#ef4444",
  violet: "#a78bfa", blue: "#60a5fa", gold: "#fbbf24",
};
```

Couleurs des raretés : petit `#60a5fa`, super `#a78bfa`, méga `#f97316`,
légendaire `#fbbf24`.

⚠️ Cet objet `C` est **dupliqué**, pas partagé : il est redéclaré à l'identique
dans `AppArcade.jsx` et `arcadeTuto.jsx`.

---

## 8. Ce qui est fini, ce qui ne l'est pas

### Terminé et vérifié

| | |
|---|---|
| Moteur X01 | 82 assertions vertes + 360 000 tirages au hasard sans anomalie |
| 28 pouvoirs | Catalogue en données, extensible sans toucher aux mécaniques |
| Cadeaux, inventaire, ciblage | Complets |
| Malus, boucliers, renvoi, anti-abus | Complets |
| Équilibrage par classement | Effet mesuré par test |
| Tutoriel 6 écrans | Complet |
| Animations, explosions, vibrations | Complètes |
| Sauvegarde / reprise | Fonctionne, y compris fenêtre ouverte |
| Lint et build | Zéro message, code de sortie 0 |

Six commits, du 2 au 4 septembre 2026 : `c7b836b` (moteur X01) → `ef2a35b` (plein
écran) → `21f131d` (cadeaux et pouvoirs) → `cc83ebc` (cadeau à chaque tour) →
`71a295a` (tutoriel et animations) → `383e9bd` (pouvoir visible + BÊTA).

Le jeu est **marqué BÊTA** à trois endroits : la carte de la liste des jeux, le
titre de l'écran de configuration, et la barre du haut pendant la partie.

### Non fait, assumé

- **Le son.** Seul point du cahier des charges explicitement déclaré non traité.
- **Aucun lien avec la base.** Une partie d'Arcade ne rapporte ni DRIX, ni XP, ni
  statistique de profil. `AppCricket.jsx` montre à quoi ressemblerait le
  branchement : il écrit dans 5 tables en fin de duel.

### Défauts connus, non corrigés

**1. Le bouton Quitter renvoie au mauvais écran.** Les deux `setPage()` d'Arcade
envoient vers `"jeux"` alors que le joueur est arrivé par `"jeux-flechettes"`. Il
retombe donc sur l'écran de **choix de catégorie**, pas sur la liste des jeux de
fléchettes. Gênant, pas bloquant.

**2. `VERSION_SAUVE` est écrite mais jamais relue.** Le champ `v: 2` part bien
dans le `localStorage`, mais la fonction de reprise ne le teste **jamais**. Une
vieille sauvegarde est acceptée et migrée en silence. ⚠️ **Point critique pour une
refonte 3D** : si la forme de la sauvegarde change, il n'existe aujourd'hui aucun
garde-fou pour rejeter une partie de l'ancienne version.

**3. Code probablement mort** (vérifié par grep, zéro appelant) :
`oublierTuto()`, `infoPouvoir()`, `remettreANeuf()`, et le champ `ignorees` du
retour de `resoudreVolee`.

### Ce qui n'est PAS testé — à lire avant de toucher au code

Les deux fichiers de test n'importent que `arcadePouvoirs.js`.
**Aucun test ne couvre `AppArcade.jsx` (1 567 lignes), `arcadeEffets.jsx` ni
`arcadeTuto.jsx`.** Donc : ni la boucle de jeu React, ni la sauvegarde, ni la
reprise, ni le tutoriel. Ces parties ont été vérifiées **à la main dans un
navigateur**, pas automatiquement.

Il n'y a **pas de script `npm test`**. Les tests se lancent à la main :

```bash
node tests/arcade-pouvoirs.test.mjs      # attendu : 82 OK · 0 ECHEC
node tests/arcade-robustesse.test.mjs    # attendu : Aucun probleme.
```

⚠️ **Le cahier des charges d'origine n'est pas dans le dépôt.** Le code cite une
quarantaine de « points » numérotés (5 à 82). Ces références ne sont documentées
que par les commentaires. Il faudra le retrouver auprès du propriétaire du projet
si la spécification complète est nécessaire.

---

## 9. Ce qui doit rester identique si on passe en 3D

### Le contrat, en cinq points

**1. `arcadePouvoirs.js` ne doit pas être modifié.**
C'est le seul endroit qui a le droit de retirer des points. Le fichier l'écrit
noir sur blanc : *« Aucun autre fichier n'a le droit de retirer des points : sinon
deux effets finissent par se contredire et le score devient faux sans qu'on sache
pourquoi. »* Le module est **pur, sans aucun import**, et déjà portable tel quel :
les tests l'importent directement sous Node, sans navigateur ni shim.

**Corollaire :** ne jamais recalculer un score dans le code de rendu, même « juste
pour l'aperçu ». La version actuelle appelle `resoudreVolee` dans un `useMemo` à
chaque frappe, précisément pour ne pas dupliquer la logique.

**2. Les deux props du composant.**

```jsx
export const Arcade = ({ setPage, joueur }) => { ... }
```

`setPage` doit toujours accepter une chaîne de page. `joueur` reste optionnel : le
composant doit continuer à fonctionner si `joueur` est `undefined` (le champ de
saisie des amis dégrade en champ texte).

**3. Les 4 clés `localStorage` et la forme de la sauvegarde.**
Un joueur qui a une partie en cours au moment de la mise à jour doit pouvoir la
reprendre. Si la forme change, **incrémenter `VERSION_SAUVE` ET écrire la lecture
qui va avec** — elle n'existe pas aujourd'hui (voir §8).

**4. La règle du « données seulement ».**
Ce qui reste à faire après une fenêtre est stocké dans `enAttente` sous forme de
**données pures, jamais de fonction**. C'est ce qui permet de sauvegarder l'état
et de reprendre exactement au même endroit si l'application se ferme fenêtre
ouverte. Une version antérieure stockait une closure : fermer l'appli à ce
moment-là faisait **rejouer le tour et perdre le cadeau**.

**5. `isGamePage` dans `App.jsx`.**
Si la version 3D introduit une nouvelle valeur de `page`, l'ajouter à la liste
`App.jsx:14944`. Sinon : plus de modale de confirmation, et le **bouton Retour
Android fait perdre la partie**.

### Ce qui peut être jeté sans risque

- **`arcadeEffets.jsx` en entier** — c'est du décor pur, il ne connaît aucune règle
- **Toute la couche de présentation d'`AppArcade.jsx`** — les composants privés
  `CartePouvoir`, `Revelation`, `SlotVide`, `BadgeEffet`, `Fenetre`, `Panneau`,
  et tous les objets de style
- **`arcadeTuto.jsx`** — indépendant, réécrivable

Ce qui doit survivre dans `AppArcade.jsx` : **l'enchaînement des tours**
(`demarrerTour` → saisie → `validerVolee` → `passerLaMain`), la **sauvegarde**, et
les **appels au moteur**.

### Pièges d'interface déjà rencontrés — à ne pas refaire

| Piège | Ce qui se passait |
|---|---|
| `overflow: visible` sur un effet | Barre de défilement horizontale en plein moment fort |
| `<button>` dans `<button>` | Un clic sur deux avalé |
| Score non remis en haut au changement de main | À 8 joueurs, le suivant arrive sur la liste des adversaires |
| Bandeau du joueur précédent non effacé | Le suivant croit avoir marqué les points |
| Bulle d'aide affichée sous une fenêtre | Illisible et impossible à fermer |
| Cartes adverses visibles | Le pouvoir Espion perd tout intérêt |
| `setActif` puis lecture immédiate de `actif` | La tentative est créditée au mauvais joueur |

---

## 10. Résumé du projet Dart Point

### Ce que c'est

Un **réseau social pour joueurs de fléchettes en France** : trouver un bar où
jouer, se défier, suivre un classement, organiser des tournois, jouer à des
mini-jeux. **PWA installable**, également publiée sur le Play Store en TWA.

### Architecture — l'essentiel à comprendre

**Une seule page, un seul état.** Pas de routeur. `App.jsx` fait **1 053 427
octets** (~1 Mo) et contient la quasi-totalité de l'application. `page` est une
chaîne, et chaque écran est une ligne `{page === "xxx" && <Composant/>}`.

⚠️ **Ne jamais ouvrir `App.jsx` en entier** dans un éditeur ou un outil : utiliser
`grep` pour trouver la ligne, puis `sed -n 'X,Yp'` pour la lire.

Les gros fichiers : `App.jsx` 1 Mo, `AppJoueurs.jsx` 463 ko,
`AppTournoiPotes.jsx` 227 ko, `AppJeux.jsx` 205 ko, `AppArcade.jsx` 80 ko.

`window.setPageGlobal(p)` est exposé globalement — c'est la porte d'entrée pour
naviguer depuis un module qui n'a pas reçu la prop.

### Base de données : Supabase, en PostgREST brut

**Le SDK `@supabase/supabase-js` n'est PAS utilisé.** Les appels passent par une
fonction maison de 9 lignes :

```js
const sb = async (path, opts = {}) => { /* fetch vers ${SB_URL}/rest/v1/${path} */ }
```

⚠️ **Cette fonction est dupliquée à l'identique dans 5 fichiers** sous 5 noms
différents (`sb`, `sbJ`, `sbC`, `sbT`, `sbTP`…), et les constantes `SB_URL` /
`SB_KEY` sont **écrites en dur dans 11 fichiers**. La clé est une clé
**publiable** (destinée au navigateur), donc ce n'est pas une fuite — mais toute
rotation obligerait à éditer 11 fichiers.

**Une trentaine de tables**, dont : `joueurs`, `duels`, `drix_mouvements`, `amis`,
`wall_posts`, `wall_comments`, `wall_likes`, `messages`, `stats_joueurs`,
`live_sessions`, `live_volees`, `tournois`, `tournois_potes`, `bars`,
`associations`, `asso_posts`, `presences`, `propositions`, `signalements`.

### Authentification : maison, pas Supabase Auth

Un jeton **HMAC-SHA256 signé avec la clé de service** (jamais envoyée au
navigateur), de la forme `b64url({jid, exp}) . b64url(HMAC)`.
**Durée de vie : 30 jours.** Stocké dans `localStorage` sous `dp_token`, le profil
à côté sous `dp_joueur`. Le mot de passe admin vit dans `sessionStorage`.

### Six Edge Functions

`auth`, `messages`, `wall`, `admin-ops`, `chrono-reward`, `daily-cron`.

⚠️ **Elles ne se déploient PAS par `git push`.** Il faut les coller dans le tableau
de bord Supabase et cliquer sur Deploy. Leur propre code le rappelle en
commentaire — parce que l'oubli s'est déjà produit.

### Déploiement

`git push origin main` → **Vercel** déploie automatiquement.

⚠️ **`public/version.txt` doit être incrémenté à CHAQUE déploiement.**
L'application surveille ce fichier et se recharge quand le numéro change. Sans
cela, les applications déjà ouvertes gardent l'ancien code. Valeur actuelle : **131**.

### Conventions du dépôt

- Tout est en **français** : noms de variables, de fonctions, commentaires
- Les commentaires commençant par ⚠️ signalent un **piège déjà rencontré** — ils
  expliquent *pourquoi* le code est écrit ainsi. Il y en a une trentaine dans les
  seuls fichiers Arcade. **Les lire avant de « simplifier ».**
- Les icônes sont des **SVG Lucide**, jamais des emojis (via `EmoIcon`)
- Design system : `design-system/MASTER.md`

---

## Récapitulatif pour démarrer

**Les 6 fichiers à transmettre :**

```
src/AppArcade.jsx          l'écran (remplaçable)
src/arcadePouvoirs.js      les règles (À NE PAS TOUCHER)
src/arcadeEffets.jsx       le décor (remplaçable)
src/arcadeTuto.jsx         le tutoriel (remplaçable)
tests/arcade-pouvoirs.test.mjs
tests/arcade-robustesse.test.mjs
```

**Utiles pour comprendre le contexte :** `src/icons.jsx`, `src/DPLottie.jsx`,
`src/FriendPicker.jsx`, `src/theme.js`, et les lignes 24, 8203 et 15450 de
`src/App.jsx`.

**Le test qui dit si on a cassé quelque chose :**

```bash
node tests/arcade-pouvoirs.test.mjs && node tests/arcade-robustesse.test.mjs
```

Si ces deux commandes passent, les règles sont intactes. Tout le reste est du
rendu, et le rendu peut être entièrement réécrit.
