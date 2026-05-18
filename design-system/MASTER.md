# Dart Point — Design System Officiel
> Source de vérité unique. Toute décision UI doit être tracée ici.
> Généré le 2026-05-18 | Stack : React + Vite | Outil : ui-ux-pro-max

---

## 0. Contexte produit

Dart Point est une **plateforme web/mobile de sport électronique et traditionnel (fléchettes)** avec :
- Scoreurs en temps réel (libre, duel, cricket, capital)
- Classements DRIX (monnaie de progression)
- Carte interactive des bars/associations
- Tournois et matchs entre joueurs inscrits

**Contrainte critique :** l'application gravite autour de mises, d'enjeux et de scores officiels. L'UI doit inspirer **confiance, rigueur et légitimité sportive** — pas l'excitation d'un casino.

---

## 1. Style visuel principal

### Dark Mode OLED — Variante "Sport Confiance"

**Justification du choix :**
Le Dark Mode OLED est le seul style compatible avec les trois contraintes simultanées :
1. **Usage nocturne en bar** — écrans dans des environnements sombres, OLED économe en batterie
2. **Lisibilité des scores** — les chiffres blancs/orange sur fond noir sont immédiatement lisibles
3. **Signal de sérieux** — le dark mode "propre" (sans néons agressifs) est associé aux outils pro (Bloomberg, ESPN Fantasy)

**Variante choisie :** Dark mode sobre, avec orange chaud comme accent primaire — ni cyberpunk, ni casino.
**Exclure :** Cyberpunk (glitch, scanlines, monospace) — trop agressif pour de l'argent.

```
Performance  : ⚡ Excellent (OLED, SVG icons, CSS transitions)
Accessibilité : ✓ WCAG AAA (contraste texte/fond ≥ 7:1 possible)
Complexité   : Low
```

---

## 2. Palette de couleurs complète

### 2.1 Couleurs de base (existantes — à conserver)

| Rôle | Nom token | Hex | Tailwind eq. | Usage |
|------|-----------|-----|--------------|-------|
| **Fond principal** | `--bg-root` | `#0f0f0f` | — | Background body, root |
| **Fond carte** | `--bg-card` | `#1a1a1a` | — | Cards, modales, sidebars |
| **Fond surélevé** | `--bg-elevated` | `#111111` | — | Inputs, secondaire |
| **Fond navbar** | `--bg-nav` | `#08080d` | — | Navbar sticky |
| **Bordure subtile** | `--border-soft` | `#2a2a2a` | — | Séparateurs, inputs |
| **Bordure nav** | `--border-nav` | `#1a1a26` | — | Navbar border-bottom |

### 2.2 Accent primaire — Orange Dart Point

| Rôle | Token | Hex | Usage |
|------|-------|-----|-------|
| **Accent principal** | `--accent` | `#f97316` | CTAs, icônes actives, score actif |
| **Accent gradient** | `--accent-dark` | `#ea580c` | Gradient CTAs : `135deg, #f97316, #ea580c` |
| **Accent glow** | `--accent-glow` | `#f9731625` | box-shadow glow subtle |
| **Accent glow fort** | `--accent-glow-strong` | `#f9731650` | box-shadow hover |
| **Accent bg teinté** | `--accent-tint` | `#f9731614` | Fond hover menu items |
| **Accent border** | `--accent-border` | `#f9731630` | Bordure cards actives |

### 2.3 Couleurs sémantiques (existantes — standardiser)

| Rôle | Token | Hex | Usage |
|------|-------|-----|-------|
| **Succès / Victoire** | `--green` | `#22c55e` | Résultats positifs, checkouts, live |
| **Succès fond** | `--green-bg` | `#14532d` | Background badges succès |
| **Live / En ligne** | `--green-live` | `#4ade80` | Indicateur de présence |
| **Erreur / Bust** | `--red` | `#ef4444` | Erreurs, quitter, busts |
| **Erreur fond** | `--red-bg` | `#7f1d1d` | Background danger |
| **Erreur texte clair** | `--red-light` | `#f87171` | Texte danger |
| **Warning / Amical** | `--yellow` | `#f59e0b` | Avertissements, badges spéciaux |
| **Warning fond** | `--yellow-bg` | `#78350f` | Background warning |
| **DRIX / Premium** | `--purple` | `#a78bfa` | Monnaie DRIX, points bonus |
| **DRIX foncé** | `--purple-dark` | `#7c3aed` | Associations, premium fort |
| **Info / Trad** | `--blue` | `#60a5fa` | Mode traditionnel, info neutre |
| **Émeraude** | `--emerald` | `#34d399` | Trad. auto-scoring |

### 2.4 Palette de texte

| Rôle | Token | Hex | Contraste sur #0f0f0f |
|------|-------|-----|-----------------------|
| **Texte principal** | `--text` | `#f1f5f9` | 15.3:1 ✓ WCAG AAA |
| **Texte muté** | `--muted` | `#94a3b8` | 7.1:1 ✓ WCAG AAA |
| **Texte nav** | `--text-nav` | `#c8ccd4` | 11.2:1 ✓ |
| **Label uppercase** | `--text-label` | `#3d4758` | 3.2:1 ⚠ (labels uniquement) |

### 2.5 Couleurs à introduire (recommandées)

| Rôle | Token | Hex | Justification |
|------|-------|-----|---------------|
| **Or confiance** | `--gold` | `#f59e0b` | Podium 1er, badges or — déjà partiellement présent |
| **Argent** | `--silver` | `#94a3b8` | Podium 2e |
| **Bronze** | `--bronze` | `#d97706` | Podium 3e |
| **Fond scoreur actif** | `--scorer-active` | gradient `#f97316→#ea580c` | Joueur dont c'est le tour |
| **Fond scoreur inactif** | `--scorer-inactive` | `#c2410c22` | Joueurs en attente |

---

## 3. Typographie

### 3.1 Police actuelle — À conserver

**Inter** (Google Fonts) — seule police en usage dans toute l'appli.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

body { font-family: 'Inter', sans-serif; }
```

**Ajouter le weight 900** qui manque dans l'import actuel (utilisé pour les scores).

### 3.2 Échelle typographique standardisée

| Usage | Taille | Weight | Line-height | Exemple |
|-------|--------|--------|-------------|---------|
| Score géant (jeu) | `56px` | 900 | 1.0 | `476` en plein écran |
| Score grand | `38px` | 900 | 1.0 | Multi-joueurs |
| Score compact | `28px` | 900 | 1.0 | 5-6 joueurs |
| Titre écran | `24px` | 900 | 1.2 | "Qui commence ?" |
| Titre section | `18-20px` | 800 | 1.3 | Titres de cards |
| Bouton CTA | `18px` | 900 | — | "DÉMARRER LA PARTIE" |
| Corps principal | `16px` | 400-600 | 1.6 | Descriptions, champs |
| Label / Meta | `13-14px` | 600 | 1.4 | "MODE DE JEU", labels |
| Caption / Badge | `10-12px` | 700-800 | — | Badges, counters |
| Micro / Label nav | `10px` | 700 | — | Labels uppercase nav |

### 3.3 Letter-spacing

| Usage | Valeur |
|-------|--------|
| Labels uppercase (`MODE DE JEU`, etc.) | `0.08em` à `0.12em` |
| Scores | `0` ou `-0.02em` (optique) |
| Corps | `0` (Inter se suffit) |

---

## 4. Composants UI — Inventaire & Standards

### 4.1 Bouton

```
Variantes  : primary | danger | success | yellow | ghost
Radius     : 10-14px (plus grand = plus accessible)
Padding    : 14-18px vertical, 20-24px horizontal
Font       : 700-900, 16-18px minimum
Touch      : min 48px hauteur (WCAG 2.5.5)
Transition : all 150ms ease-out
```

**CTA Principal :**
```css
background: linear-gradient(135deg, #f97316, #ea580c);
color: #fff;
box-shadow: 0 4px 14px #f9731440;
border-radius: 14px;
font-weight: 900;
font-size: 18px;
padding: 18px 24px;
```

**Règle anti-casino :** Pas de bouton "pulsant" en boucle sur les CTAs liés à l'argent. Réserver les animations (glow, breathe) aux badges de progression.

### 4.2 Card

```
Background  : #1a1a1a
Border      : 1px solid #2a2a2a
Radius      : 12-16px
Padding     : 18-24px
Shadow      : 0 4px 20px rgba(0,0,0,0.4)
Hover       : border-color → #f9731640, transition 200ms
```

### 4.3 Input / Champ

```
Background   : #111
Border       : 1px solid #2a2a2a
Radius       : 10px
Padding      : 13px 16px
Font         : 16px (obligatoire mobile — évite le zoom iOS)
Focus border : #f97316 (accent)
Focus shadow : 0 0 0 2px #f9731430
Placeholder  : #94a3b8
```

### 4.4 Badge

```
Format : bg = color+"22", border = color+"44", radius = 20px
Padding : 2px 10px
Font   : 11px, weight 600
```

### 4.5 Navbar (sticky)

```
Background   : rgba(8,8,13,0.97)
Border-bottom: 1px solid #1a1a26
Backdrop     : blur(20px)
Z-index      : 200
Position     : sticky top-0
```

### 4.6 Modal / Bottom Sheet

```
Overlay      : rgba(0,0,0,0.85)
Card         : #1a1a1a, border 1px solid #2a2a2a
Radius       : 20px (top)
Max-width    : 480px
Animation    : slide-up 220ms ease-out
Z-index      : 1000+
```

### 4.7 Notification / Toast

```
Position  : fixed top-16 center
Min-width : 220px
Radius    : 16px
Duration  : 2500-3000ms auto-dismiss
Z-index   : 10001
```

### 4.8 Scoreur (plein écran)

```
Position  : fixed inset-0
Z-index   : 500
Touch     : touchAction: none (empêche scroll)
Overflow  : hidden
```

**Card joueur actif :**
```css
background: linear-gradient(135deg, #f97316, #ea580c);
border-bottom: 3px solid #f97316;
```

**Card joueur inactif :**
```css
background: rgba(194, 65, 12, 0.133);
border-bottom: 3px solid transparent;
```

---

## 5. Effets & Animations

### 5.1 Timings standards

| Interaction | Durée | Courbe |
|-------------|-------|--------|
| Hover micro | 150ms | ease-out |
| Transition UI standard | 200ms | ease-out |
| Modal in | 220ms | ease-out |
| Glow pulse (badges) | 2000ms | ease infinite |
| Auto-dismiss toast | 2500ms | — |
| Scroll smooth | native | behavior: smooth |

**Règle :** Jamais > 300ms pour une transition interactive. Jamais > 500ms pour une animation décorative répétée.

### 5.2 Effets autorisés

```css
/* Glow accent */
box-shadow: 0 0 18px #f9731625;

/* Glow hover fort */
box-shadow: 0 0 28px #f9731650, 0 0 56px #f9731622;

/* Glow badge DRIX */
box-shadow: 0 0 8px #a78bfa88;

/* Backdrop blur (navbar, dropdown) */
backdrop-filter: blur(20px);
-webkit-backdrop-filter: blur(20px);

/* Animations keyframes */
@keyframes dp-glow     { 0%,100%{box-shadow:0 0 12px #f9731625} 50%{box-shadow:0 0 28px #f9731650} }
@keyframes dp-breathe  { 0%,100%{filter:drop-shadow(0 0 6px rgba(249,115,22,.3))} 50%{filter:drop-shadow(0 0 18px rgba(249,115,22,.65))} }
@keyframes dp-notif-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
```

### 5.3 Règle reduced-motion (OBLIGATOIRE)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. Pattern de page recommandé

### 6.1 Structure globale de l'app

```
┌─────────────────────────────────┐
│  NAVBAR sticky (blur backdrop)  │  z-200
├─────────────────────────────────┤
│  TICKER live (home only)        │  z-100
├─────────────────────────────────┤
│  MAIN CONTENT                   │
│  max-width: 600px, centré       │
│  padding: 16px                  │
│  padding-bottom: 80px (nav bot) │
└─────────────────────────────────┘
```

### 6.2 Ordre des sections dans une page type (profil / dashboard)

1. **Hero compact** — Avatar + Pseudo + Rang DRIX + Stats rapides
2. **Action primaire** — CTA "Jouer" (bouton orange plein largeur)
3. **Cards de contenu** — Statistiques, historique, classements
4. **Section sociale** — Amis, présence, le Comptoir (mur)
5. **Footer / navigation secondaire**

### 6.3 Landing / Onboarding

Pattern recommandé : **App-centric avec feature pills**
1. Hero — score animé, tagline courte
2. Feature pills — 4-6 icônes SVG + label court
3. CTA téléchargement / inscription
4. Preuve sociale — nombre de joueurs, bars référencés
5. Carte des bars (teaser)
6. FAQ rapide (2-3 items)

---

## 7. Anti-patterns — Plateforme avec enjeux

Ces éléments sont **interdits** dans Dart Point car ils miment les codes visuels des casinos et fragilisent la confiance :

| ❌ Anti-pattern | ✅ Alternative |
|----------------|---------------|
| Animations en boucle sur les scores d'argent | Animation uniquement au moment du gain, puis statique |
| Couleurs agressives (rouge/jaune clignotant) sur CTAs de mise | Orange chaud fixe, transitions douces |
| Compteurs qui montent en cascade (slot machine) | Affichage immédiat du résultat, +N badge discret |
| Urgence artificielle ("Plus que 3h !") | Dates réelles uniquement |
| Fond lumineux / blanc éclatant | Toujours dark, OLED |
| Emojis comme icônes UI (🎯 en button icon) | SVG Lucide/Heroicons — les emojis restent dans le contenu textuel |
| Notifications push agressives ("Tu as perdu !") | Ton neutre et factuel |
| Score DRIX caché derrière paywall opaque | Progression toujours visible |
| Bouton "pulsant" sur les CTAs de match classé | Glow statique autorisé, pas de pulse |
| Z-index incontrôlé (modales qui se chevauchent) | Échelle définie : toast 10001, modal 1000, drawer 500, navbar 200, sticky 20 |

---

## 8. Z-index — Échelle officielle

| Couche | Z-index | Composant |
|--------|---------|-----------|
| Base | 0 | Contenu normal |
| Sticky colonnes | 10-21 | Headers/footers sticky (Capital) |
| Navbar | 200 | NavBar principale |
| Drawer mobile | 500 | Scoreur plein écran |
| Dropdown | 200-500 | Menus, player search |
| Modal | 1000 | Bottom sheets, confirm modales |
| Notification toast | 10001 | Toasts live bonus |
| Popup finish | 9998 | Popup fléchettes scoreur |

---

## 9. Responsive — Breakpoints

| Nom | Largeur | Notes |
|-----|---------|-------|
| Mobile S | 375px | iPhone SE — target minimal |
| Mobile M | 390px | iPhone 14 — cible principale |
| Mobile L | 430px | iPhone Plus |
| Tablet | 768px | iPad vertical |
| Desktop | 1024px+ | Usage secondaire (admin, map) |

**Container max-width :** `600px` centré pour tout le contenu app.
**Exception :** Carte et pages admin → `100%` pleine largeur.

---

## 10. Accessibilité — Checklist pre-delivery

### Contrastes (vérifier avec Contrast Ratio tool)
- [ ] Texte principal `#f1f5f9` sur `#0f0f0f` → 15.3:1 ✓
- [ ] Texte muté `#94a3b8` sur `#1a1a1a` → 6.8:1 ✓
- [ ] Labels uppercase `#3d4758` sur `#0f0f0f` → ⚠ 3.2:1 (labels courts seulement)
- [ ] Orange `#f97316` sur fond noir → 3.1:1 ⚠ — **ne jamais utiliser pour du texte corps**

### Interaction
- [ ] Tous les éléments cliquables ont `cursor: pointer`
- [ ] `touch-action: manipulation` sur tous les boutons du scoreur
- [ ] `-webkit-tap-highlight-color: transparent` sur boutons tactiles
- [ ] Taille minimale des zones de touch : **48×48px** (scoreur clavier : OK)
- [ ] Focus visible sur tous les éléments interactifs (pas de `outline: none` sans alternative)

### Formulaires
- [ ] Chaque `<input>` a un `<label>` associé ou `aria-label`
- [ ] Inputs `font-size: 16px` minimum (évite zoom auto iOS)
- [ ] Placeholder ne remplace pas le label

### Motion
- [ ] `@media (prefers-reduced-motion: reduce)` implémenté

### Sémantique HTML
- [ ] Utiliser `<button>` pour les actions, `<a>` pour les navigations
- [ ] Images de profil avec `alt=""`  ou `alt="Photo de {pseudo}"`
- [ ] Titres hiérarchisés (h1 → h2 → h3) dans chaque page

---

## 11. Icônes

**Standard actuel :** emojis inline (🎯, 👤, ✉️, ⚙️...)
**Standard cible :** SVG via **Lucide React** pour les icônes UI, emojis conservés dans le contenu (scores, badges, le Comptoir).

```bash
npm install lucide-react
```

**Exemples de remplacement prioritaires :**

| Emoji actuel | Composant Lucide | Usage |
|-------------|-----------------|-------|
| `👤` | `<User />` | Menu profil |
| `✉️` | `<Mail />` | Messages |
| `⚙️` | `<Settings />` | Config |
| `🚪` | `<LogOut />` | Déconnexion |
| `🔍` | `<Search />` | Recherche joueurs |
| `🏆` | `<Trophy />` | Victoires |
| `⬅` | `<ArrowLeft />` | Retour |

**Exception :** les emojis dans les posts du Comptoir, les badges de joueurs, les scores — ils font partie du contenu et restent.

---

## 12. Incohérences détectées — Correctifs prioritaires

### 🔴 Critique (bloquer le prochain sprint)

**Incohérence #1 — Orange sur texte courant (contraste insuffisant)**
- **Problème :** `color: #f97316` est utilisé pour du texte de corps (noms de joueurs actifs, labels de sections). Le ratio est de ~3.1:1, sous le minimum WCAG AA (4.5:1) pour le texte courant.
- **Correctif :** L'orange ne doit être utilisé que pour les éléments graphiques larges (fond de bouton, bordure, icône ≥ 24px) ou accompagné de `font-weight: 900` + grande taille. Pour les textes courants, utiliser `#f1f5f9` ou `#fff`.

**Incohérence #2 — Emojis comme icônes UI**
- **Problème :** `⚙️`, `👤`, `✉️`, `🚪`, `🔍` sont utilisés comme icônes d'interface dans les boutons et menus. Emojis = rendu variable selon OS, non scalables proprement, inaccessibles.
- **Correctif prioritaire :** Remplacer dans la NavBar et les menus. Laisser les emojis dans les contenus textuels (mur, badges).

### 🟠 Important (sprint suivant)

**Incohérence #3 — Tailles de police inconsistantes entre les scoreurs**
- **Problème :** Le scoreur 501/301 (Inter 30px numpad), le Cricket (Inter 18px) et le Capital (Inter 28px numpad) ont des tailles de police différentes pour des éléments équivalents (touches du pavé numérique).
- **Correctif :** Définir `--numpad-font: 30px` comme token global et l'appliquer uniformément dans les 3 scoreurs.

**Incohérence #4 — Constante `C` non partagée (duplication)**
- **Problème :** La constante `C = { bg, card, border, accent, text, muted, green, red, yellow, purple, blue }` est définie dans `App.jsx` mais les autres fichiers (`AppJeux.jsx`, `AppCricket.jsx`, `AppJeuDecalePoint.jsx`) utilisent des valeurs hex hardcodées identiques, sans référencer `C`.
- **Correctif :** Extraire `C` dans un fichier `src/theme.js` et l'importer dans tous les composants. Cela rendra les changements de thème instantanément globaux.

### 🟡 Opportunité (backlog)

**Incohérence #5 — Fonts Google non optimisées**
- **Problème :** L'import Google Fonts ne charge que les weights 400→800. Le poids 900 (utilisé massivement pour les scores) est absent de l'import mais Inter le supporte.
- **Correctif :** Mettre à jour le `@import` dans `index.css` :
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
```

---

## 13. Variables CSS — Fichier de référence

À créer dans `src/theme.js` :

```js
// src/theme.js — Source de vérité des tokens Dart Point
export const C = {
  // Fonds
  bg:           "#0f0f0f",
  bgCard:       "#1a1a1a",
  bgElevated:   "#111111",
  bgNav:        "#08080d",
  // Bordures
  border:       "#2a2a2a",
  borderNav:    "#1a1a26",
  // Accent orange
  accent:       "#f97316",
  accentDark:   "#ea580c",
  accentGlow:   "#f9731625",
  accentTint:   "#f9731614",
  accentBorder: "#f9731630",
  // Texte
  text:         "#f1f5f9",
  muted:        "#94a3b8",
  textNav:      "#c8ccd4",
  textLabel:    "#3d4758",
  // Sémantique
  green:        "#22c55e",
  greenBg:      "#14532d",
  greenLive:    "#4ade80",
  red:          "#ef4444",
  redBg:        "#7f1d1d",
  redLight:     "#f87171",
  yellow:       "#f59e0b",
  yellowBg:     "#78350f",
  purple:       "#a78bfa",
  purpleDark:   "#7c3aed",
  blue:         "#60a5fa",
  emerald:      "#34d399",
  // Podium
  gold:         "#f59e0b",
  silver:       "#94a3b8",
  bronze:       "#d97706",
};

// Z-index scale
export const Z = {
  sticky:   10,
  navbar:   200,
  drawer:   500,
  dropdown: 300,
  modal:    1000,
  popup:    9998,
  toast:    10001,
};

// Numpad / Scoreur
export const SCORER = {
  numpadFont:    30,
  numpadRadius:  10,
  touchMinSize:  48,
};
```

---

*Design System Dart Point v1.0 — Maintenu par l'équipe technique*
*Prochain review recommandé : après implémentation du fichier `src/theme.js`*
