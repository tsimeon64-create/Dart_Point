// Carte du joueur qui joue (scoreurs) : fond JAUNE, et toutes les lettres et tous les chiffres
// écrits en blanc avec un épais contour noir, pour les lire de loin, au bout du bras.
//
// Le contour est fait avec des ombres posées tout autour de la lettre (16 directions), pas avec
// -webkit-text-stroke : ce trait-là est centré sur le bord de la lettre, il en mange la moitié
// (un chiffre fin devient illisible), et « paint-order », qui corrige ça, n'est pas pris en charge
// partout pour du texte HTML.
export const contourNoir = (ep, couleur = "#000") => {
  const directions = 16;
  const ombres = [];
  for (let i = 0; i < directions; i++) {
    const a = (i / directions) * 2 * Math.PI;
    const x = +(Math.cos(a) * ep).toFixed(2);
    const y = +(Math.sin(a) * ep).toFixed(2);
    ombres.push(`${x}px ${y}px 0 ${couleur}`);
  }
  return ombres.join(", ");
};

// Style d'un texte contouré. Le -webkit-text-fill-color est OBLIGATOIRE : le body en impose un
// (#f1f5f9, voir index.css) qui passe devant `color` sur Chrome et Safari.
export const texteContoure = (ep, fond = "#fff") => ({
  color: fond,
  WebkitTextFillColor: fond,
  textShadow: contourNoir(ep),
});

// Épaisseur du contour selon la taille du texte : ~6,5 % de la taille, arrondie au demi-pixel,
// jamais moins de 1 px (64 px → 4 px, 42 px → 2,5 px, 30 px → 2 px, 13 px → 1 px).
export const epaisseurContour = (taille) => Math.max(1, Math.round(taille * 0.065 * 2) / 2);

// Le fond jaune de la carte active, et son anneau noir qui « respire » (même rythme que l'ancien
// halo orange).
export const FOND_CARTE_JAUNE = "linear-gradient(135deg,#fde047,#facc15 55%,#eab308)";
export const KEYFRAMES_CARTE_JAUNE =
  "@keyframes scActiveJaune{0%,100%{box-shadow:0 0 0 2px #000,0 0 16px #facc1540}50%{box-shadow:0 0 0 2px #000,0 0 30px #facc1599}}";
