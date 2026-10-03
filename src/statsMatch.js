// ── STATS DÉTAILLÉES D'UN MATCH 501/301 ──────────────────────────────────────
// Tout est recalculé à partir de ce que le scoreur garde DÉJÀ, sans rien ajouter en base :
//   • joueurs[i].tours      = toutes les volées du match (une volée bustée vaut 0)
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

// Moyenne des 9 premières fléchettes de chaque manche (le « First 9 » des appli de fléchettes).
// Si la manche s'est terminée avant la 3e volée, on compte les fléchettes RÉELLEMENT lancées.
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
      first9: calculFirst9(manches, nom, desManches),
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
