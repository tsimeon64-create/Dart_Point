// ── STATS DÉTAILLÉES D'UN MATCH 501/301 ──────────────────────────────────────
// Tout est recalculé à partir de ce que le scoreur garde DÉJÀ, sans rien ajouter en base :
//   • joueurs[i].tours      = toutes les volées du match. ⚠️ Au scoreur, une volée BUSTÉE n'y est
//                             PAS (seules ses fléchettes comptent) ; en ligne (onlineGame.js) elle y vaut 0.
//   • joueurs[i].flechettes = nombre exact de fléchettes lancées
//   • manches               = le détail manche par manche (manchesHistory), dans l'ordre
//   • premierALaBulle       = index du joueur qui a commencé la 1re manche (elles alternent)
// Fichier PUR (aucun import React) → testable à part : node tests/stats-match.test.mjs

// Les tranches de score d'une volée, comme sur les appli de fléchettes : 60+ veut dire « entre
// 60 et 79 », pas « 60 ou plus ». 180 a sa propre ligne.
export const BANDES = [
  { cle: "p60",  label: "60+",  min: 60,  max: 79 },
  { cle: "p80",  label: "80+",  min: 80,  max: 99 },
  { cle: "p100", label: "100+", min: 100, max: 119 },
  { cle: "p120", label: "120+", min: 120, max: 139 },
  { cle: "p140", label: "140+", min: 140, max: 169 },
  { cle: "p170", label: "170+", min: 170, max: 179 },
  { cle: "p180", label: "180",  min: 180, max: 180 },
];

const nb = (v) => (Number.isFinite(+v) ? +v : 0);

// Les deux stats « pour tous les niveaux » : une volée à moins de 30 points, et le fameux 26.
// Une volée bustée n'est comptée dans « <30 » que là où elle est dans `tours` (en ligne, à 0).
const compteMoins30 = (volees) => volees.filter((v) => v < 30).length;
const compte26 = (volees) => volees.filter((v) => v === 26).length;
const arrondi2 = (v) => Math.round(v * 100) / 100;

// Les volées d'une manche appartenant à un joueur : le détail de manche ne garde que des
// compteurs, on redécoupe donc `tours` manche par manche avec le nombre de volées de chacune.
const voleesParManche = (manches, nomJoueur, tours) => {
  const parManche = [];
  let i = 0;
  for (const m of manches || []) {
    const estGagnant = m.winner === nomJoueur;
    const estPerdant = m.loser === nomJoueur;
    if (!estGagnant && !estPerdant) { parManche.push([]); continue; }
    const combien = Math.max(0, Math.round(nb(estGagnant ? m.winner_volees : m.loser_volees)));
    parManche.push(tours.slice(i, i + combien));
    i += combien;
  }
  return parManche;
};

// ⚠️ Redécouper `tours` manche par manche avec winner_volees / loser_volees est FAUX dès qu'une
// volée compte moins de 3 fléchettes (finish en 1 fléchette, bust au pavé fléchette par
// fléchette) : ces compteurs valent round(fléchettes / 3), pas le vrai nombre de volées. Le
// découpage glisse alors d'une volée à chaque fois, et les manches suivantes héritent des volées
// de la précédente (nov. 2026 : 438 manches sur 689 fausses dans « Manche par manche »).
// Le détail d'une manche « complet » (clés d'octobre 2026, dont le First 9) a été calculé À LA FIN
// de la manche, sur ses volées exactes : c'est lui qu'on croit, partout où il existe.
const detailComplet = (m) => m != null && m.winner_f9_flech !== undefined;

// First 9 d'un joueur d'après le détail des manches (points et fléchettes des 9 premières de
// chaque manche, additionnés) ; null si une de ses manches n'a pas ce détail.
export const first9DepuisManches = (manches, nom) => {
  let pts = 0, fl = 0, vu = false;
  for (const m of manches || []) {
    const gagnant = m?.winner === nom, perdant = m?.loser === nom;
    if (!gagnant && !perdant) continue;
    if (!detailComplet(m)) return null;
    vu = true;
    const cote = gagnant ? "winner_" : "loser_";
    pts += nb(m[cote + "f9_pts"]);
    fl += nb(m[cote + "f9_flech"]);
  }
  return vu && fl > 0 ? arrondi2((pts / fl) * 3) : null;
};

// Moyenne des 9 premières fléchettes de chaque manche (le « First 9 » des appli de fléchettes).
// Si la manche s'est terminée avant la 3e volée, on compte les fléchettes RÉELLEMENT lancées.
// Seulement en repli, pour un détail de manche sans First 9 (voir detailComplet).
const calculFirst9 = (manches, nomJoueur, voleesDesManches) => {
  let points = 0, flechettes = 0;
  (manches || []).forEach((m, idx) => {
    const volees = voleesDesManches[idx] || [];
    if (!volees.length) return;
    const troisPremieres = volees.slice(0, 3);
    points += troisPremieres.reduce((s, v) => s + nb(v), 0);
    const gagnant = m.winner === nomJoueur;
    const flechManche = nb(gagnant ? m.winner_flech : m.loser_flech);
    // Manche pliée en 3 volées ou moins : la dernière volée peut valoir 1 ou 2 fléchettes.
    flechettes += (volees.length <= 3 && flechManche > 0) ? Math.min(9, flechManche) : troisPremieres.length * 3;
  });
  return flechettes > 0 ? arrondi2((points / flechettes) * 3) : 0;
};

// Stats d'un match, joueur par joueur (même ordre que `joueurs`).
export const calculerStatsMatch = ({ joueurs = [], manches = [], premierALaBulle = 0 } = {}) => {
  const n = joueurs.length;
  return joueurs.map((j, idx) => {
    const nom = j?.nom;
    const tours = Array.isArray(j?.tours) ? j.tours.map(nb) : [];
    const flechettes = nb(j?.flechettes);
    const points = nb(j?.totalPoints);
    const desManches = voleesParManche(manches, nom, tours);

    const bandes = {};
    for (const b of BANDES) bandes[b.cle] = tours.filter((v) => v >= b.min && v <= b.max).length;
    bandes.moins30 = compteMoins30(tours);
    bandes.n26 = compte26(tours);

    let gagnees = 0, finishMax = 0, finishs100 = 0, meilleureManche = null, pireManche = null;
    let tentatives = 0, commencees = 0, commenceesGagnees = 0, recues = 0, recuesGagnees = 0;
    (manches || []).forEach((m, i) => {
      const gagnant = m.winner === nom, perdant = m.loser === nom;
      if (!gagnant && !perdant) return;
      // Les manches alternent : celui qui a gagné la bulle commence la 1re, l'autre la 2e…
      const aCommence = n > 0 && ((nb(premierALaBulle) + i) % n) === idx;
      if (aCommence) { commencees++; if (gagnant) commenceesGagnees++; }
      else { recues++; if (gagnant) recuesGagnees++; }
      tentatives += nb(gagnant ? m.winner_checkout_attempts : m.loser_checkout_attempts);
      if (gagnant) {
        gagnees++;
        const f = nb(m.winner_finish);
        if (f > finishMax) finishMax = f;
        if (f >= 100) finishs100++;
        const fl = nb(m.winner_flech);
        if (fl > 0) {
          if (meilleureManche === null || fl < meilleureManche) meilleureManche = fl;
          if (pireManche === null || fl > pireManche) pireManche = fl;
        }
      }
    });

    return {
      nom,
      manchesGagnees: gagnees,
      moyenne: flechettes > 0 ? arrondi2((points / flechettes) * 3) : 0,
      first9: first9DepuisManches(manches, nom) ?? calculFirst9(manches, nom, desManches),
      volees: tours.length,
      flechettes,
      points,
      meilleureVolee: tours.length ? Math.max(...tours) : 0,
      ...bandes,
      highFinish: finishMax,
      finishs100,
      meilleureManche,   // le moins de fléchettes pour plier une manche (null si aucune gagnée)
      pireManche,
      checkout: { reussis: gagnees, tentatives, pct: tentatives > 0 ? arrondi2((gagnees / tentatives) * 100) : 0 },
      // « Keep » = je garde ma mise en jeu (je commence la manche et je la gagne).
      // « Break » = je gagne une manche commencée par l'adversaire.
      keep:  { gagnes: commenceesGagnees, total: commencees, pct: commencees > 0 ? arrondi2((commenceesGagnees / commencees) * 100) : 0 },
      brk:   { gagnes: recuesGagnees,     total: recues,     pct: recues     > 0 ? arrondi2((recuesGagnees / recues) * 100)         : 0 },
    };
  });
};

// ── STATS D'UN MATCH DÉJÀ JOUÉ (cartes du Comptoir) ──────────────────────────
// Ici on n'a PLUS les volées : seulement le détail manche par manche enregistré avec le duel
// (`manches_detail`). On en tire tout ce qui s'y trouve ; ce qui demande les volées (First 9,
// tranches 120+ et 170+) ou de savoir qui a commencé (keep / break) vaut null → « — » à l'écran.
export const statsDepuisManches = (manches, noms = []) => {
  const list = Array.isArray(manches) ? manches : [];
  return noms.map((nom) => {
    let gagnees = 0, flech = 0, volees = 0, points = 0, meilleureVolee = 0, nb26 = 0;
    let poids = 0, flechInconnues = false;
    let p60 = 0, p80 = 0, p100 = 0, p140 = 0, p180 = 0;
    let finishMax = 0, finishs100 = 0, meilleureManche = null, pireManche = null, tentatives = 0;
    // Clés ajoutées en octobre 2026 : présentes seulement sur les matchs joués depuis.
    let p120 = 0, p170 = 0, f9pts = 0, f9flech = 0, fin = false, depart = false;
    let moins30 = 0, aMoins30 = false;
    let commencees = 0, commenceesGagnees = 0, recues = 0, recuesGagnees = 0;
    for (const m of list) {
      const gagnant = m.winner === nom, perdant = m.loser === nom;
      if (!gagnant && !perdant) continue;
      const p = (cle) => nb(m[(gagnant ? "winner_" : "loser_") + cle]);
      const brut = (cle) => m[(gagnant ? "winner_" : "loser_") + cle];
      // Les parties EN LIGNE (onlineGame.js) n'enregistraient pas les fléchettes avant nov. 2026 :
      // sans elles la moyenne valait 0 (« — »). On pondère alors sa moyenne de manche par ses volées.
      const flConnu = brut("flech") !== undefined;
      const fl = flConnu ? p("flech") : 0;
      if (!flConnu) flechInconnues = true;
      const poidsManche = flConnu ? fl : p("volees") * 3;
      const avecTranchesFines = brut("120plus") !== undefined;
      if (avecTranchesFines) { fin = true; p120 += p("120plus"); p170 += p("170plus"); }
      if (brut("moins30") !== undefined) { aMoins30 = true; moins30 += p("moins30"); }
      if (brut("f9_flech") !== undefined) { f9pts += p("f9_pts"); f9flech += p("f9_flech"); }
      if (m.starter) {
        depart = true;
        if (m.starter === nom) { commencees++; if (gagnant) commenceesGagnees++; }
        else { recues++; if (gagnant) recuesGagnees++; }
      }
      flech += fl; poids += poidsManche; volees += p("volees");
      points += (nb(p("moy")) * poidsManche) / 3;   // moy = 3 × points / fléchettes
      meilleureVolee = Math.max(meilleureVolee, p("max"));
      nb26 += p("26");
      // Le détail range 100plus = 100 à 139 et 140plus = 140 à 179 (120plus et 170plus COMPRIS) ;
      // l'écran veut les tranches des BANDES (100-119, 140-169) → on retire 120+ et 170+.
      p60 += p("60plus"); p80 += p("80plus"); p180 += p("180");
      p100 += avecTranchesFines ? p("100plus") - p("120plus") : p("100plus");
      p140 += avecTranchesFines ? p("140plus") - p("170plus") : p("140plus");
      tentatives += p("checkout_attempts");
      if (gagnant) {
        gagnees++;
        const f = nb(m.winner_finish);
        if (f > finishMax) finishMax = f;
        if (f >= 100) finishs100++;
        if (fl > 0) {
          if (meilleureManche === null || fl < meilleureManche) meilleureManche = fl;
          if (pireManche === null || fl > pireManche) pireManche = fl;
        }
      }
    }
    return {
      nom, manchesGagnees: gagnees, volees, flechettes: flechInconnues ? null : flech, points: Math.round(points),
      moyenne: poids > 0 ? arrondi2((points / poids) * 3) : 0,
      first9: f9flech > 0 ? arrondi2((f9pts / f9flech) * 3) : null,
      meilleureVolee, nb26,
      moins30: aMoins30 ? moins30 : null, n26: nb26,
      p60, p80, p100, p120: fin ? p120 : null, p140, p170: fin ? p170 : null, p180,
      highFinish: finishMax, finishs100, meilleureManche, pireManche,
      checkout: { reussis: gagnees, tentatives, pct: tentatives > 0 ? arrondi2((gagnees / tentatives) * 100) : 0 },
      // keep / break : seulement si le détail dit qui a commencé chaque manche.
      keep: depart ? { gagnes: commenceesGagnees, total: commencees, pct: commencees > 0 ? arrondi2((commenceesGagnees / commencees) * 100) : 0 } : null,
      brk:  depart ? { gagnes: recuesGagnees,     total: recues,     pct: recues     > 0 ? arrondi2((recuesGagnees / recues) * 100)         : 0 } : null,
    };
  });
};

// ── LES MÊMES STATS, MANCHE PAR MANCHE ───────────────────────────────────────
// Renvoie un tableau [manche][joueur] avec les mêmes clés que calculerStatsMatch, mais calculées
// sur la seule manche. Les volées de chaque manche sont redécoupées dans `tours` avec le nombre
// de volées enregistré pour cette manche.
export const statsParManche = ({ joueurs = [], manches = [] } = {}) => {
  // Détail complet (cas normal depuis octobre 2026) : chaque manche a déjà ses chiffres exacts,
  // calculés sur ses vraies volées. Redécouper `tours` ne ferait que les fausser (voir plus haut).
  if ((manches || []).length > 0 && manches.every(detailComplet)) {
    return statsParMancheDepuisDetail(manches, joueurs.map((j) => j?.nom));
  }
  const tours = joueurs.map((j) => (Array.isArray(j?.tours) ? j.tours.map(nb) : []));
  const curseur = joueurs.map(() => 0);
  return (manches || []).map((m) =>
    joueurs.map((j, idx) => {
      const nom = j?.nom;
      const gagnant = m.winner === nom, perdant = m.loser === nom;
      if (!gagnant && !perdant) return { nom, absent: true };
      const combien = Math.max(0, Math.round(nb(gagnant ? m.winner_volees : m.loser_volees)));
      const volees = tours[idx].slice(curseur[idx], curseur[idx] + combien);
      curseur[idx] += combien;
      const flech = nb(gagnant ? m.winner_flech : m.loser_flech) || volees.length * 3;
      const points = volees.reduce((s, v) => s + v, 0);
      const bandes = {};
      for (const b of BANDES) bandes[b.cle] = volees.filter((v) => v >= b.min && v <= b.max).length;
      bandes.moins30 = compteMoins30(volees);
      bandes.n26 = compte26(volees);
      const troisPremieres = volees.slice(0, 3);
      // Manche pliée en 3 volées ou moins : la dernière peut valoir 1 ou 2 fléchettes.
      const flech9 = volees.length <= 3 && flech > 0 ? Math.min(9, flech) : troisPremieres.length * 3;
      return {
        nom,
        moyenne: flech > 0 ? arrondi2((points / flech) * 3) : 0,
        first9: flech9 > 0 ? arrondi2((troisPremieres.reduce((s, v) => s + v, 0) / flech9) * 3) : 0,
        volees: volees.length || combien,
        flechettes: flech,
        meilleureVolee: volees.length ? Math.max(...volees) : nb(gagnant ? m.winner_max : m.loser_max),
        ...bandes,
        finish: gagnant ? nb(m.winner_finish) : 0,
        reste: perdant ? nb(m.reste_loser) : 0,
        checkout: { reussis: gagnant ? 1 : 0, tentatives: nb(gagnant ? m.winner_checkout_attempts : m.loser_checkout_attempts) },
      };
    })
  );
};

// La même chose à partir des seuls compteurs de chaque manche (cartes déjà publiées, et fin de
// match quand le détail est complet). Sur les très vieux matchs, First 9, 120+ et 170+ manquent
// → null, affichés « — ».
export const statsParMancheDepuisDetail = (manches, noms = []) =>
  (Array.isArray(manches) ? manches : []).map((m) =>
    noms.map((nom) => {
      const gagnant = m.winner === nom, perdant = m.loser === nom;
      if (!gagnant && !perdant) return { nom, absent: true };
      const p = (cle) => nb(m[(gagnant ? "winner_" : "loser_") + cle]);
      const brut = (cle) => m[(gagnant ? "winner_" : "loser_") + cle];
      const fin = brut("120plus") !== undefined;
      const f9f = nb(p("f9_flech"));
      return {
        nom,
        moyenne: p("moy") ? arrondi2(p("moy")) : 0,
        first9: f9f > 0 ? arrondi2((p("f9_pts") / f9f) * 3) : null,
        volees: p("volees"),
        flechettes: p("flech"),
        meilleureVolee: p("max"),
        moins30: brut("moins30") !== undefined ? p("moins30") : null,
        n26: p("26"),
        // 100plus / 140plus du détail englobent 120+ / 170+ : on les retire (tranches des BANDES).
        p60: p("60plus"), p80: p("80plus"),
        p100: fin ? p("100plus") - p("120plus") : p("100plus"), p120: fin ? p("120plus") : null,
        p140: fin ? p("140plus") - p("170plus") : p("140plus"), p170: fin ? p("170plus") : null, p180: p("180"),
        finish: gagnant ? nb(m.winner_finish) : 0,
        reste: perdant ? nb(m.reste_loser) : 0,
        checkout: { reussis: gagnant ? 1 : 0, tentatives: p("checkout_attempts") },
      };
    })
  );
