// src/arcadePouvoirs.js
// ───────────────────────────────────────────────────────────────────────────
// ARCADE — le moteur des CADEAUX et des POUVOIRS (étape 2 du cahier des
// charges). Tout est ici, en fonctions PURES : aucun affichage, aucun état
// React. C'est ce qui permet de les tester une par une et d'ajouter de
// nouveaux pouvoirs plus tard sans toucher au jeu (point 34).
//
// ⚠️ NOMS NEUTRES. Le cahier des charges parlait de Champignon, Étoile et
// Carapace : ce sont des objets Nintendo. Les mécaniques sont identiques,
// seuls les noms et les icônes sont originaux — Raccourci, Supernova, Frein.
//
// ⚠️ UN SEUL ENDROIT POUR LE SCORE. resoudreVolee() applique les effets dans
// l'ordre imposé au point 38 du cahier des charges. Aucun autre fichier n'a le
// droit de retirer des points : sinon deux effets finissent par se contredire
// et le score devient faux sans qu'on sache pourquoi.
// ───────────────────────────────────────────────────────────────────────────

// ── Une fléchette : { s: secteur 1-20 | 25 (bull) | 0 (raté), m: 1|2|3 } ─────
export const points = (d) => (d?.s || 0) * (d?.m || 1);
export const estDouble = (d) => d?.m === 2;          // le double bull compte
export const libelle = (d) => {
  if (!d || d.s === 0) return "0";
  if (d.s === 25) return d.m === 2 ? "BULL" : "25";
  return (d.m === 3 ? "T" : d.m === 2 ? "D" : "") + d.s;
};

// ── Numéros cadeaux (point 18) ───────────────────────────────────────────────
export const NUMEROS_CADEAU = [15, 16, 17, 18, 19, 20];

// ── Raretés ──────────────────────────────────────────────────────────────────
export const RARETES = {
  petit:      { nom: "PETIT CADEAU",     couleur: "#60a5fa", duree: 800 },
  super:      { nom: "SUPER CADEAU !",   couleur: "#a78bfa", duree: 1200 },
  mega:       { nom: "MÉGA CADEAU !!!",  couleur: "#f97316", duree: 1800 },
  legendaire: { nom: "CADEAU LÉGENDAIRE", couleur: "#fbbf24", duree: 2500 },
};

// Probabilité qu'un MÉGA se transforme en LÉGENDAIRE (point 29 : 1 % à 3 %).
export const CHANCE_LEGENDAIRE = 0.02;

// ── Catalogue des pouvoirs ───────────────────────────────────────────────────
// cible    : demande de choisir un adversaire
// immediat : s'applique au moment où on l'utilise (sinon : effet sur la
//            prochaine volée de la personne visée)
// groupe   : deux pouvoirs du MÊME groupe ne peuvent pas se cumuler (point 37)
// tags     : servent à l'équilibrage selon le classement (point 36)
// min      : nombre de joueurs minimum pour que le pouvoir puisse sortir
export const POUVOIRS = {
  // ── PETITS CADEAUX (point 26) ──
  raccourci: {
    nom: "RACCOURCI", icone: "🍀", rarete: "petit", tags: ["boost"],
    texte: "−20 points tout de suite", immediat: true,
    aide: "Retire 20 points de ton score restant. Ne peut jamais te faire gagner : la dernière fléchette doit toujours être lancée.",
  },
  bouclier: {
    nom: "BOUCLIER", icone: "🛡️", rarete: "petit", tags: ["defense"],
    texte: "Bloque le prochain malus", immediat: true,
    aide: "Le prochain mauvais coup envoyé contre toi est annulé, et le bouclier disparaît.",
  },
  secondeChance: {
    nom: "SECONDE CHANCE", icone: "♻️", rarete: "petit", tags: ["defense"],
    texte: "Un bust ? Tu rejoues", soi: true,
    aide: "Si ta prochaine volée fait bust, tu ne perds pas ton tour : tu la rejoues.",
  },
  meilleureX2: {
    nom: "MEILLEURE ×2", icone: "✨", rarete: "petit", tags: ["boost"],
    texte: "Ta meilleure fléchette compte double", soi: true,
    aide: "Dans ta prochaine volée, la fléchette qui rapporte le plus est doublée.",
  },
  nettoyage: {
    nom: "NETTOYAGE", icone: "🧹", rarete: "petit", tags: ["utilitaire"],
    texte: "Efface un malus qui te vise", immediat: true,
    aide: "Supprime un mauvais coup en attente contre toi.",
  },
  nouvelleBoite: {
    nom: "NOUVELLE BOÎTE", icone: "🔄", rarete: "petit", tags: ["utilitaire"],
    texte: "Change le numéro cadeau", immediat: true,
    aide: "Tire un autre numéro à viser pour ton cadeau en cours.",
  },
  espion: {
    nom: "ESPION", icone: "🔍", rarete: "petit", tags: ["utilitaire"],
    texte: "Regarde les cartes d'un adversaire", immediat: true, cible: true,
    aide: "Montre les pouvoirs que garde un adversaire.",
  },

  // ── SUPER CADEAUX (point 27) ──
  turbo2: {
    nom: "TURBO ×2", icone: "⚡", rarete: "super", tags: ["boost"],
    texte: "Ta prochaine volée compte double", soi: true, groupe: "multiplicateur",
    aide: "Tous les points de ta prochaine volée sont multipliés par deux.",
  },
  frein: {
    nom: "FREIN", icone: "🐢", rarete: "super", tags: ["attaque"],
    texte: "Sa volée divisée par deux", cible: true, groupe: "annulation",
    aide: "La prochaine volée de l'adversaire visé ne lui retire que la moitié des points.",
  },
  finishFacile: {
    nom: "FINISH FACILE", icone: "🎯", rarete: "super", tags: ["boost"],
    texte: "Tu peux finir sur un simple", soi: true, groupe: "finish",
    aide: "Pendant ta prochaine volée, tu peux terminer sur n'importe quelle zone, même en Double Out.",
  },
  gel: {
    nom: "GEL", icone: "❄️", rarete: "super", tags: ["attaque"],
    texte: "Il n'aura que 2 fléchettes", cible: true, groupe: "restriction",
    aide: "L'adversaire visé ne lance que deux fléchettes à son prochain tour.",
  },
  verrouillage: {
    nom: "VERROUILLAGE", icone: "🔒", rarete: "super", tags: ["attaque"],
    texte: "Un numéro vaudra zéro pour lui", cible: true, choixNumero: true,
    aide: "Tu choisis un numéro entre 15 et 20 : pendant sa prochaine volée, toutes ses fléchettes sur ce numéro valent zéro.",
  },
  renvoi: {
    nom: "RENVOI", icone: "↩️", rarete: "super", tags: ["defense"],
    texte: "Le prochain malus repart chez son auteur", immediat: true,
    aide: "Le prochain mauvais coup envoyé contre toi est automatiquement renvoyé à celui qui l'a lancé.",
  },
  jackpot: {
    nom: "JACKPOT", icone: "🎰", rarete: "super", tags: ["boost"],
    texte: "Ta volée ×1,5 ou ×2 (tirage)", soi: true, groupe: "multiplicateur",
    aide: "Le multiplicateur est tiré au sort et affiché avant que tu lances.",
  },
  bombe40: {
    nom: "BOMBE 40", icone: "💣", rarete: "super", tags: ["attaque"],
    texte: "Moins de 40 ? Sa volée vaut zéro", cible: true, groupe: "annulation",
    aide: "Si l'adversaire visé fait moins de 40 points à sa prochaine volée, elle ne compte pas du tout.",
  },
  brouillard: {
    nom: "BROUILLARD", icone: "🌫️", rarete: "super", tags: ["attaque"],
    texte: "Il jouera sans voir son score", cible: true,
    aide: "Pendant sa prochaine volée, son score restant est masqué. Il réapparaît à la fin.",
  },

  // ── MÉGA CADEAUX (point 28) ──
  turbo3: {
    nom: "SUPER TURBO ×3", icone: "🔥", rarete: "mega", tags: ["boost"],
    texte: "Ta prochaine volée compte triple", soi: true, groupe: "multiplicateur",
    aide: "Tous les points de ta prochaine volée sont multipliés par trois.",
  },
  voleeAnnulee: {
    nom: "VOLÉE ANNULÉE", icone: "🚫", rarete: "mega", tags: ["attaque"],
    texte: "Sa prochaine volée ne compte pas", cible: true, groupe: "annulation",
    aide: "Il lance vraiment ses fléchettes, on voit son score… puis tout est annulé.",
  },
  uneFlechette: {
    nom: "UNE SEULE FLÉCHETTE", icone: "🥶", rarete: "mega", tags: ["attaque"],
    texte: "Il n'aura qu'une fléchette", cible: true, groupe: "restriction",
    aide: "L'adversaire visé ne lance qu'une seule fléchette à son prochain tour.",
  },
  volPouvoir: {
    nom: "VOL DE POUVOIR", icone: "🪝", rarete: "mega", tags: ["attaque", "utilitaire"],
    texte: "Prends une carte à un adversaire", cible: true, immediat: true,
    aide: "Choisis un pouvoir stocké chez un adversaire : il passe chez toi.",
  },
  retourArriere: {
    nom: "RETOUR ARRIÈRE", icone: "⏪", rarete: "mega", tags: ["attaque"],
    texte: "+50 sur le score d'un adversaire", cible: true, immediat: true,
    aide: "Son score restant remonte de 50 points. Il aura plus de chemin à faire.",
  },
  bombe100: {
    nom: "BOMBE 100", icone: "💥", rarete: "mega", tags: ["attaque"],
    texte: "+100 sur le score d'un adversaire", cible: true, immediat: true,
    aide: "Son score restant remonte de 100 points. Brutal.",
  },
  finishRoyal: {
    nom: "FINISH ROYAL", icone: "👑", rarete: "mega", tags: ["boost"],
    texte: "Finis sur simple, double ou triple", soi: true, groupe: "finish",
    aide: "Pendant ta prochaine volée, n'importe quelle zone termine la partie.",
  },
  chaos: {
    nom: "CHAOS", icone: "🌀", rarete: "mega", tags: ["boost"],
    texte: "Un méga cadeau au hasard", immediat: true,
    aide: "On ne sait ce que c'est qu'au moment où tu l'utilises.",
  },

  // ── CADEAUX LÉGENDAIRES (points 29 à 33) ──
  supernova: {
    nom: "SUPERNOVA", icone: "🌟", rarete: "legendaire", tags: ["boost", "defense"],
    texte: "Immunisé · volée ×2 · finish sur simple", soi: true, groupe: "multiplicateur",
    aide: "Pendant ta prochaine volée : aucun malus ne t'atteint, tes points comptent double, et tu peux finir sur n'importe quelle zone.",
  },
  arcEnCiel: {
    nom: "ARC-EN-CIEL", icone: "🌈", rarete: "legendaire", tags: ["utilitaire"],
    texte: "Choisis le pouvoir que tu veux", immediat: true,
    aide: "Tu choisis librement n'importe quelle carte du jeu.",
  },
  bombeGenerale: {
    nom: "BOMBE GÉNÉRALE", icone: "☄️", rarete: "legendaire", tags: ["attaque"],
    texte: "+50 sur TOUS les adversaires", immediat: true, min: 3,
    aide: "Tout le monde sauf toi remonte de 50 points.",
  },
  tourBonus: {
    nom: "TOUR BONUS", icone: "🔁", rarete: "legendaire", tags: ["boost"],
    texte: "100 points ou plus ? Tu rejoues", soi: true,
    aide: "Si ta prochaine volée atteint 100 points, tu enchaînes tout de suite une deuxième volée (sans nouveau cadeau).",
  },
};

export const infoPouvoir = (id) => POUVOIRS[id] || null;

// Les effets qui viennent d'un adversaire. Sert au bouclier, à Nettoyage,
// à l'immunité de Supernova et au comptage des malus reçus.
export const EST_MALUS = {
  frein: true, gel: true, verrouillage: true, bombe40: true,
  brouillard: true, voleeAnnulee: true, uneFlechette: true,
};

// ═══════════════════════════════════════════════════ RÉSOLUTION D'UNE VOLÉE ══
// L'ORDRE EST CELUI DU POINT 38 DU CAHIER DES CHARGES. Ne pas le changer sans
// relire ce point : c'est lui qui garantit qu'un bouclier passe avant un gel,
// et qu'un multiplicateur s'applique avant une division.
//
//   1. Boucliers et protections   (l'immunité de Supernova est traitée ici ;
//                                  le bouclier, lui, agit au moment de l'envoi)
//   2. Restriction du nombre de fléchettes
//   3. Verrouillages
//   4. Multiplicateur positif
//   5. Division ou malus adverse
//   6. Calcul du score de la volée
//   7. Vérification du bust
//   8. Vérification du finish
export const resoudreVolee = (scoreAvant, flechettes, doubleOut, effets = []) => {
  // 1. PROTECTIONS — Supernova rend immunisé : les malus reçus sont ignorés.
  const immunise = effets.some((e) => e.id === "supernova");
  const vifs = immunise ? effets.filter((e) => !EST_MALUS[e.id]) : effets;
  const b = (id) => vifs.some((e) => e.id === id);
  const chercher = (id) => vifs.find((e) => e.id === id) || null;

  // 2. NOMBRE DE FLÉCHETTES
  const maxF = b("uneFlechette") ? 1 : b("gel") ? 2 : 3;
  const jouees = flechettes.slice(0, maxF);

  // 3. VERROUILLAGE — la fléchette a bien été lancée, elle vaut simplement zéro.
  const verrou = chercher("verrouillage")?.num ?? null;
  let val = jouees.map((d) => (verrou !== null && d?.s === verrou ? 0 : points(d)));

  // 4. MULTIPLICATEUR POSITIF — jamais cumulé (point 37) : on garde le plus fort.
  const multPos = Math.max(
    1,
    b("turbo3") ? 3 : 1,
    b("turbo2") ? 2 : 1,
    b("supernova") ? 2 : 1,
    chercher("jackpot")?.x || 1,
  );
  // ⚠️ ARRONDI À L'INFÉRIEUR, obligatoire : le Jackpot ×1,5 sur un nombre impair
  // donnait des scores à virgule — « il te reste 406,5 » n'existe pas aux
  // fléchettes. Même sens d'arrondi que la division par deux plus bas : un effet
  // ne donne jamais plus que ce qu'il promet.
  if (multPos !== 1) val = val.map((v) => Math.floor(v * multPos));

  // 4 bis. MEILLEURE FLÉCHETTE ×2 — s'ajoute au multiplicateur, sur une seule.
  if (b("meilleureX2") && val.length) {
    let iMax = 0;
    val.forEach((v, i) => { if (v > val[iMax]) iMax = i; });
    val[iMax] = val[iMax] * 2;
  }

  // 5. DIVISION OU ANNULATION ADVERSE
  // ⚠️ Arrondi à l'INFÉRIEUR sur la division : sur un nombre impair, le joueur
  // ne doit jamais recevoir plus que la moitié promise.
  const brutApresBonus = val.reduce((s, v) => s + v, 0);
  let facteurNeg = 1;
  if (b("voleeAnnulee")) facteurNeg = 0;
  else if (b("bombe40") && brutApresBonus < 40) facteurNeg = 0;
  else if (b("frein")) facteurNeg = 0.5;
  if (facteurNeg !== 1) val = val.map((v) => Math.floor(v * facteurNeg));

  // 6-7-8. SCORE, BUST, FINISH — fléchette par fléchette.
  // Le droit de finir sur autre chose qu'un double vient du mode de partie ou
  // d'un pouvoir.
  const finishLibre = !doubleOut || b("finishFacile") || b("finishRoyal") || b("supernova");

  let score = scoreAvant;
  let bust = false;
  let gagne = false;
  let fait = 0;
  let utilisees = 0;

  for (let i = 0; i < val.length; i++) {
    utilisees = i + 1;
    const v = val[i];
    const reste = score - v;
    fait += v;

    if (reste < 0) { bust = true; break; }
    // ⚠️ RESTER À 1 EST TOUJOURS UN BUST EN DOUBLE OUT, même avec Finish Facile.
    // Sinon le joueur s'enferme : le pouvoir disparaît à la fin de sa volée et il
    // se retrouve à 1 sans lui — or depuis 1, en Double Out, AUCUNE fléchette ne
    // permet plus de finir. Testé : 0 coup sur 63. La partie est perdue à vie.
    if (reste === 1 && doubleOut) { bust = true; break; }
    if (reste === 0) {
      if (!finishLibre && !estDouble(jouees[i])) { bust = true; break; }
      score = 0; gagne = true; break;
    }
    score = reste;
  }

  return {
    // ⚠️ Un bust ANNULE toute la volée : retour au score du DÉBUT de la volée,
    // pas à celui d'avant la dernière fléchette.
    score: bust ? scoreAvant : score,
    bust, gagne,
    fait: bust ? 0 : fait,
    utilisees,                                   // fléchettes réellement comptées
    maxF,                                        // fléchettes autorisées
    brut: jouees.reduce((s, d) => s + points(d), 0),  // avant tout effet
    multPos, facteurNeg, verrou, immunise,
    doubleX2: b("meilleureX2"),
    finishLibre,
    ignorees: Math.max(0, flechettes.length - maxF),
    // a() sert uniquement à savoir si un effet existait AVANT l'immunité, pour
    // pouvoir afficher « bloqué par Supernova » plutôt que de le faire
    // disparaître sans explication.
    malusBloques: immunise ? effets.filter((e) => EST_MALUS[e.id]).map((e) => e.id) : [],
    aTourBonus: b("tourBonus"),
    aSecondeChance: b("secondeChance"),
    aBrouillard: b("brouillard"),
  };
};

// ═════════════════════════════════════════════════════════════════ CADEAUX ══
// Meilleur cadeau de la volée (point 22) : une seule récompense, la plus forte.
// On regarde les fléchettes RÉELLEMENT lancées — après un bust, celles qui
// n'ont pas été jouées ne comptent pas.
export const cadeauDeLaVolee = (flechettes, numero, utilisees) => {
  if (!numero) return 0;
  let best = 0;
  const n = Math.max(0, Math.min(utilisees ?? flechettes.length, flechettes.length));
  for (let i = 0; i < n; i++) {
    const d = flechettes[i];
    if (d && d.s === numero && d.m > best) best = d.m;
  }
  return best;                                  // 0 raté · 1 petit · 2 super · 3 méga
};

export const RARETE_PAR_MULT = { 1: "petit", 2: "super", 3: "mega" };

// ═════════════════════════════════════════════════════════════ ÉQUILIBRAGE ══
// Point 36 : le meneur reçoit un peu moins de grosses attaques, le dernier un
// peu plus de quoi revenir. Volontairement DISCRET — le jeu ne doit jamais
// donner l'impression de choisir le gagnant.
export const rangDuJoueur = (joueurs, index) => {
  const scores = joueurs.map((p) => p.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (min === max) return "milieu";
  if (joueurs[index].score === min) return "leader";
  if (joueurs[index].score === max) return "dernier";
  return "milieu";
};

const POIDS = {
  leader:  { attaque: 0.6, defense: 1.3, utilitaire: 1.3, boost: 0.85 },
  milieu:  { attaque: 1,   defense: 1,   utilitaire: 1,   boost: 1 },
  dernier: { attaque: 1.3, defense: 1,   utilitaire: 0.9, boost: 1.35 },
};

const poidsPouvoir = (id, rang) => {
  const p = POUVOIRS[id];
  if (!p) return 0;
  const table = POIDS[rang] || POIDS.milieu;
  const tags = p.tags || [];
  if (!tags.length) return 1;
  return tags.reduce((s, t) => s + (table[t] ?? 1), 0) / tags.length;
};

// Tire un pouvoir de la rareté demandée.
// alea : injecté pour pouvoir tester (0 → premier, 0.999 → dernier).
export const tirerPouvoir = (rarete, { nbJoueurs = 2, rang = "milieu", exclure = [], alea = Math.random } = {}) => {
  const pool = Object.keys(POUVOIRS).filter((id) => {
    const p = POUVOIRS[id];
    if (p.rarete !== rarete) return false;
    if (p.min && nbJoueurs < p.min) return false;
    if (exclure.includes(id)) return false;
    return true;
  });
  if (!pool.length) return null;

  const poids = pool.map((id) => poidsPouvoir(id, rang));
  const total = poids.reduce((s, w) => s + w, 0);
  if (total <= 0) return pool[0];

  let r = alea() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= poids[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
};

// Un MÉGA peut se transformer en LÉGENDAIRE (point 29).
export const tirerCadeau = (multiplicateur, ctx = {}) => {
  const alea = ctx.alea || Math.random;
  let rarete = RARETE_PAR_MULT[multiplicateur];
  if (!rarete) return null;
  if (rarete === "mega" && alea() < CHANCE_LEGENDAIRE) rarete = "legendaire";
  let id = tirerPouvoir(rarete, { ...ctx, alea });
  // Une rareté peut être vide (Bombe générale exclue à 2 joueurs, par exemple).
  if (!id && rarete === "legendaire") id = tirerPouvoir("mega", { ...ctx, alea });
  return id ? { id, rarete } : null;
};

// ════════════════════════════════════════════════ PROTECTION CONTRE LES ABUS ══
// Point 37 : on ne cumule pas deux effets du même groupe, et on ne s'acharne
// pas sur un joueur déjà lourdement pénalisé.
export const MAX_MALUS = 2;

// Les pouvoirs qui autorisent à finir sur autre chose qu'un double. Supernova
// en fait partie, alors que son « groupe » est multiplicateur : sans cette
// liste, on pouvait empiler Supernova + Finish Royal et brûler une carte méga
// pour rien (le point 37 interdit deux finish en même temps).
export const DONNE_FINISH = { finishFacile: true, finishRoyal: true, supernova: true };

export const pourquoiImpossible = (cible, idPouvoir) => {
  const p = POUVOIRS[idPouvoir];
  if (!p) return "Pouvoir inconnu";
  const effets = cible.effets || [];

  if (DONNE_FINISH[idPouvoir]) {
    const dejaFinish = effets.find((e) => DONNE_FINISH[e.id]);
    if (dejaFinish) return `Déjà sous l'effet de ${POUVOIRS[dejaFinish.id].nom}`;
  }

  if (p.groupe) {
    const conflit = effets.find((e) => POUVOIRS[e.id]?.groupe === p.groupe);
    if (conflit) return `Déjà sous l'effet de ${POUVOIRS[conflit.id].nom}`;
  }
  // Le même pouvoir deux fois n'a aucun sens (deux verrouillages, deux gels…).
  if (effets.some((e) => e.id === idPouvoir)) return `Déjà sous l'effet de ${p.nom}`;

  if (EST_MALUS[idPouvoir]) {
    const nbMalus = effets.filter((e) => EST_MALUS[e.id]).length;
    if (nbMalus >= MAX_MALUS) return "Il encaisse déjà deux mauvais coups";
  }
  return null;
};

// ══════════════════════════════════════════════════════ ENVOI D'UN MAUVAIS COUP ══
// Point 38, étape 1 : les protections passent AVANT tout le reste.
// Renvoi d'abord (le coup repart chez l'attaquant), puis bouclier.
// Renvoie { joueurs, texte } — jamais de mutation, toujours une copie.
// Franchir les protections d'une cible. Renvoie iFinal = null si le coup est
// bloque. Sert AUSSI aux attaques immediates (Retour arriere, Bombe 100,
// Bombe generale) : sans ca, un bouclier protegerait d'un gel mais pas d'un
// +100 points, ce que personne ne comprendrait.
export const passerLesProtections = (joueurs, iDe, iVers) => {
  const out = joueurs.map((p) => ({ ...p, effets: [...(p.effets || [])] }));
  const nomDe = out[iDe]?.nom || "";
  let iFinal = iVers;
  let texte = null;

  if (out[iVers].renvoi) {
    out[iVers] = { ...out[iVers], renvoi: false };
    iFinal = iDe;
    texte = `${out[iVers].nom} renvoie le coup à ${nomDe} !`;
  }

  // ⚠️ Le texte du renvoi ne doit pas disparaitre si un bouclier bloque ensuite :
  // sans les deux phrases, personne ne comprend pourquoi le coup a fait demi-tour.
  const avec = (t) => (texte ? `${texte} ${t}` : t);

  if (out[iFinal].bouclier) {
    out[iFinal] = { ...out[iFinal], bouclier: false };
    return { joueurs: out, iFinal: null, texte: avec(`BLOQUÉ ! Le bouclier de ${out[iFinal].nom} encaisse.`) };
  }

  if ((out[iFinal].effets || []).some((e) => e.id === "supernova")) {
    return { joueurs: out, iFinal: null, texte: avec(`${out[iFinal].nom} est intouchable !`) };
  }

  return { joueurs: out, iFinal, texte };
};

export const envoyerMalus = (joueurs, iDe, iVers, effet) => {
  const { joueurs: out, iFinal, texte } = passerLesProtections(joueurs, iDe, iVers);
  if (iFinal === null) return { joueurs: out, texte };

  // ⚠️ RE-VÉRIFICATION APRÈS UN RENVOI. L'anti-abus du point 37 est contrôlé au
  // moment où on choisit sa cible ; mais un Renvoi change la cible en cours de
  // route. Sans ce second contrôle, l'attaquant pouvait recevoir un 3e mauvais
  // coup, ou un deuxième du même groupe : une seule fléchette ET la volée
  // divisée par deux en même temps. Le coup se perd simplement dans le vide.
  const refus = pourquoiImpossible(out[iFinal], effet.id);
  if (refus) {
    return { joueurs: out, texte: `${texte ? texte + " " : ""}${refus} — le coup se perd.` };
  }

  out[iFinal] = {
    ...out[iFinal],
    effets: [...out[iFinal].effets, { ...effet, de: iDe }],
    stats: { ...out[iFinal].stats, malusRecus: (out[iFinal].stats?.malusRecus || 0) + 1 },
  };
  return { joueurs: out, texte };
};

// ══════════════════════════════════════════════════════════════ INVENTAIRE ══
export const MAX_POUVOIRS = 2;

// ══════════════════════════════════════════════════════ INTERDICTION DE GAGNER ══
// Point 40 : un pouvoir ne doit jamais amener un joueur à zéro. Le dernier
// point vient toujours d'une fléchette.
export const retraitAutorise = (score, retrait, doubleOut) => {
  const apres = score - retrait;
  if (apres <= 0) return false;
  if (apres === 1 && doubleOut) return false;
  return true;
};

// ══════════════════════════════════════════════════════════ JOUEUR NEUF ══════
export const nouveauJoueur = (nom, score) => ({
  nom, score,
  volees: [], flechettes: 0, total: 0, busts: 0,
  pouvoirs: [],            // inventaire, 2 maximum
  effets: [],              // effets actifs sur SA prochaine volée
  bouclier: false,
  renvoi: false,
  retardMax: 0,
  stats: {
    cadeauxTentes: 0, cadeauxReussis: 0,
    petits: 0, supers: 0, megas: 0, legendaires: 0,
    pouvoirsUtilises: 0, malusEnvoyes: 0, malusRecus: 0,
  },
});

// Remet un joueur à neuf pour une revanche (point 78) en gardant son nom.
export const remettreANeuf = (p, score) => nouveauJoueur(p.nom, score);

// ══════════════════════════════════════════════════ TITRES DE FIN (point 77) ══
export const titresDeFin = (joueurs) => {
  const t = [];
  const meilleur = (cle, titre, texte, minimum = 1) => {
    let best = null;
    for (const p of joueurs) {
      const v = cle(p);
      if (v >= minimum && (!best || v > best.v)) best = { p, v };
    }
    if (best) t.push({ titre, nom: best.p.nom, texte: texte(best.v) });
  };

  meilleur((p) => p.stats.cadeauxReussis, "ROI DES CADEAUX",
    (v) => `${v} cadeau${v > 1 ? "x" : ""} gagné${v > 1 ? "s" : ""}`);
  meilleur((p) => p.stats.malusEnvoyes, "SABOTEUR",
    (v) => `${v} mauvais coup${v > 1 ? "s" : ""} envoyé${v > 1 ? "s" : ""}`);
  meilleur((p) => p.stats.cadeauxTentes - p.stats.cadeauxReussis, "CHAT NOIR",
    (v) => `${v} cadeau${v > 1 ? "x" : ""} raté${v > 1 ? "s" : ""}`);
  meilleur((p) => p.stats.malusRecus, "TANK",
    (v) => `${v} mauvais coup${v > 1 ? "s" : ""} encaissé${v > 1 ? "s" : ""}`);
  meilleur((p) => p.retardMax, "MIRACULÉ",
    (v) => `revenu de ${v} points de retard`, 60);

  // SNIPER : meilleur pourcentage sur les numéros cadeaux (3 tentatives mini,
  // sinon un joueur qui tente une fois et réussit rafle le titre).
  let sniper = null;
  for (const p of joueurs) {
    if (p.stats.cadeauxTentes < 3) continue;
    const pct = p.stats.cadeauxReussis / p.stats.cadeauxTentes;
    if (!sniper || pct > sniper.pct) sniper = { p, pct };
  }
  if (sniper && sniper.pct > 0) {
    t.push({ titre: "SNIPER", nom: sniper.p.nom, texte: `${Math.round(sniper.pct * 100)} % de réussite` });
  }

  return t;
};
