// src/theme.js — Source de vérité des tokens Dart Point
// Importer C depuis ce fichier dans tous les composants

export const C = {
  // Fonds
  bg:           "#0f0f0f",
  bgCard:       "#1a1a1a",
  bgElevated:   "#111111",
  bgNav:        "#08080d",
  // Rétrocompat (anciens noms)
  card:         "#1a1a1a",
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
  numpadFont:   30,
  numpadRadius: 10,
  touchMinSize: 48,
};
