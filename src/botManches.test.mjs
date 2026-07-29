// Le bot doit REJOUER les vraies manches du joueur, pas en inventer.
// Né d'un constat de Thomas : le bot de Bouli64 (68 de moyenne au match) a bouclé une manche
// en 11 fléchettes — 136,64 de moyenne. Le vrai joueur ne fait jamais ça.
// Lancer : node src/botManches.test.mjs
import { reconstruireManches, calculerProfilBot, genererScoreBot } from "./botFleche.js";

let ok = 0, ko = 0;
const check = (t, c) => { if (c) { ok++; console.log("  OK    " + t); } else { ko++; console.log("  ECHEC " + t); } };

// Fabrique la suite de volées d'une manche gagnée : les scores donnés, le reste qui descend à 0.
const manche = (depart, scores) => {
  const out = []; let reste = depart;
  for (const sc of scores) {
    if (sc < 0) { out.push({ score: -1, reste }); continue; }   // bust : le reste ne bouge pas
    reste -= sc; out.push({ score: sc, reste });
  }
  return out;
};

console.log("\n1) RECONSTRUCTION DES MANCHES");
{
  const v = [
    ...manche(501, [100, 140, 100, 100, 61]),   // gagnée en 5 volées
    ...manche(501, [100, 100, -1, 100, 100, 60, 41]), // gagnée (501 pile), avec un bust au milieu
  ];
  const m = reconstruireManches(v);
  check("2 manches retrouvées", m.length === 2);
  check("les deux partent de 501", m.every(x => x.depart === 501));
  check("les deux sont gagnées", m.every(x => x.gagnee));
  check("la 1re a 5 volées", m[0].volees.length === 5);
  check("la 2e a 7 volées dont le bust", m[1].volees.length === 7 && m[1].volees.includes(-1));
}
{
  // Manche PERDUE (l'adversaire finit) : le reste ne touche jamais 0, puis il remonte à 501.
  const v = [...manche(501, [60, 60, 60]), ...manche(501, [100, 100, 100, 100, 101])];
  const m = reconstruireManches(v);
  check("une manche perdue est bien séparée de la suivante", m.length === 2);
  check("la perdue n'est pas marquée gagnée", m[0].gagnee === false);
  check("la suivante est gagnée", m[1].gagnee === true);
}

console.log("\n2) LE BOT REJOUE UNE VRAIE MANCHE, À L'IDENTIQUE");
// Le joueur : 6 manches gagnées, sa MEILLEURE fait 6 volées (18 fléchettes).
const SES_MANCHES = [
  [100, 100, 100, 100, 60, 41],   // 6 volées  ← sa meilleure
  [60, 60, 60, 60, 60, 60, 60, 81],
  [80, 60, 45, 60, 100, 60, 96],
  [45, 60, 60, 60, 60, 60, 60, 96],
  [60, 100, 60, 60, 45, 60, 116],
  [-1, 60, 60, 60, 60, 60, 60, 81],
];
const volees = SES_MANCHES.flatMap(sc => manche(501, sc));
const profil = calculerProfilBot({ drix: 1000, duels: [], amiPseudo: "Ami", volees });
check("le profil est en mode rejeu", profil.mode === "replay");
check("il embarque ses manches réelles", (profil.manchesReelles || []).length === SES_MANCHES.length);

// Simule une manche complète du bot.
const jouerUneManche = (p, depart = 501) => {
  let reste = depart; const suite = [];
  for (let garde = 0; garde < 60 && reste > 0; garde++) {
    const sc = genererScoreBot(reste, p);
    suite.push(sc);
    if (sc > reste) continue;      // bust : le reste ne bouge pas
    reste -= sc;
  }
  return { suite, fini: reste === 0 };
};

{
  // Une manche GAGNÉE se rejoue en entier, à l'identique. Une manche PERDUE (441 pts ici, l'adversaire
  // avait fini avant) ne peut être qu'un DÉBUT : le bot la rejoue puis continue à jouer, puisque dans
  // la vraie vie le joueur aurait continué lui aussi.
  const gagnees = SES_MANCHES.filter((sc) => sc.filter((x) => x > 0).reduce((a, b) => a + b, 0) === 501);
  const perdues = SES_MANCHES.filter((sc) => sc.filter((x) => x > 0).reduce((a, b) => a + b, 0) !== 501);
  check(`jeu d'essai : ${gagnees.length} manches gagnées et ${perdues.length} perdue(s)`, gagnees.length === 5 && perdues.length === 1);

  const exactes = new Set(gagnees.map((sc) => sc.join(",")));
  const debuts = SES_MANCHES.map((sc) => sc.filter((x) => x > 0));
  let reconnues = 0, total = 0;
  for (let i = 0; i < 60; i++) {
    const { suite, fini } = jouerUneManche(profil);
    if (!fini) continue;
    total++;
    if (exactes.has(suite.join(","))) { reconnues++; continue; }         // manche gagnée rejouée entière
    // sinon : ça doit au moins COMMENCER par une de ses vraies manches
    const propre = suite.filter((x) => x <= 501);
    if (debuts.some((d) => d.length >= 3 && propre.slice(0, d.length).join(",") === d.join(","))) reconnues++;
  }
  check(`chaque manche du bot vient de son vrai jeu (${reconnues}/${total})`, total > 0 && reconnues === total);
}

console.log("\n3) LE BOT NE PEUT PLUS INVENTER UNE MANCHE IRRÉELLE");
{
  const minReel = Math.min(...SES_MANCHES.map(sc => sc.filter(x => x > 0).length)); // 6 volées
  let pire = 99, essais = 0;
  for (let i = 0; i < 400; i++) {
    const { suite, fini } = jouerUneManche(profil);
    if (!fini) continue;
    essais++;
    pire = Math.min(pire, suite.length);
  }
  check(`sur ${essais} manches, aucune plus rapide que sa meilleure réelle (${minReel} volées) — pire vu : ${pire}`,
    essais > 50 && pire >= minReel);
}

console.log("\n4) UN DÉPART DIFFÉRENT (301) NE REJOUE PAS UNE MANCHE DE 501");
{
  const { suite } = jouerUneManche(profil, 301);
  const somme = suite.filter(s => s <= 301).reduce((a, b) => a + b, 0);
  check("le bot ne dépasse pas 301 en rejouant du 501", somme <= 301);
  check("il joue quand même (repli sur ses volées)", suite.length > 0);
}

console.log("\n5) IL NE JOUE PAS QUE SES BONS JOURS (manches perdues comprises)");
{
  // 3 manches GAGNÉES rapides (6 volées) + 3 manches PERDUES où il traîne (arrêt à 150 restants).
  const gagnees = [
    [100, 100, 100, 100, 60, 41],
    [140, 100, 100, 100, 20, 41],
    [100, 140, 100, 100, 20, 41],
  ];
  const perdues = [
    [45, 60, 45, 60, 45, 60, 36],
    [26, 45, 60, 45, 60, 45, 70],
    [40, 45, 45, 60, 45, 60, 56],
  ];
  const vol = [...gagnees, ...perdues].flatMap((sc) => manche(501, sc));
  const pr = calculerProfilBot({ drix: 1000, duels: [], amiPseudo: "Ami", volees: vol });
  const m = pr.manchesReelles || [];
  check("les 6 manches sont retenues (3 gagnées + 3 perdues)", m.length === 6);
  check("3 seulement sont marquées gagnées", m.filter((x) => x.gagnee).length === 3);

  let en6 = 0, plusLong = 0, total = 0;
  for (let i = 0; i < 600; i++) {
    const { suite, fini } = jouerUneManche(pr);
    if (!fini) continue;
    total++;
    if (suite.length === 6) en6++; else plusLong++;
  }
  // S'il ne rejouait que ses manches gagnées, TOUTES feraient 6 volées → le biais serait revenu.
  check(`il ne fait pas que des manches de 6 volées (${en6} en 6, ${plusLong} plus longues sur ${total})`,
    total > 100 && plusLong > total * 0.2);
}

console.log("\n6) MANCHE PERDUE EN VRAI, ADVERSAIRE QUI NE FINIT PAS → il continue proprement");
{
  // TOUTES ses manches de référence sont PERDUES : chaque suite s'épuise autour de 150 restants.
  // (Il faut au moins 25 volées pour que le mode rejeu s'active — c'est le garde-fou de
  // calculerProfilBot, on lui donne donc 4 manches.)
  const PERDUES = [
    [45, 60, 45, 60, 45, 60, 36],
    [26, 45, 60, 45, 60, 45, 70],
    [40, 45, 45, 60, 45, 60, 56],
    [60, 45, 45, 45, 60, 45, 51],
  ];
  const vol = PERDUES.flatMap((sc) => manche(501, sc));
  const pr = calculerProfilBot({ drix: 1000, duels: [], amiPseudo: "Ami", volees: vol });
  check("le profil est bien en mode rejeu", pr.mode === "replay");
  check("ses 4 manches sont là et AUCUNE n'est gagnée",
    (pr.manchesReelles || []).length === 4 && pr.manchesReelles.every((m) => !m.gagnee));

  // Une volée à 0 point est LÉGITIME (il rate tout) : on ne la compte pas comme une anomalie.
  let finis = 0, impossible = 0, resteUn = 0, maxVolees = 0, zeros = 0;
  for (let i = 0; i < 300; i++) {
    let reste = 501, n = 0;
    for (let g = 0; g < 80 && reste > 0; g++) {
      const sc = genererScoreBot(reste, pr);
      n++;
      if (!Number.isFinite(sc) || sc < 0 || sc > 180) { impossible++; break; }
      if (sc === 0) { zeros++; continue; }        // volée blanche : le reste ne bouge pas
      if (sc > reste) continue;                   // bust
      reste -= sc;
      if (reste === 1) { resteUn++; break; }      // 1 restant = injouable, ça bloquerait la partie
    }
    if (reste === 0) finis++;
    maxVolees = Math.max(maxVolees, n);
  }
  check(`aucun score impossible sur 300 manches (${impossible})`, impossible === 0);
  check(`il ne laisse jamais 1 point restant (${resteUn})`, resteUn === 0);
  check(`il finit ses manches (${finis}/300, ${zeros} volées blanches au total)`, finis >= 290);
  check(`il ne tourne pas en boucle (max ${maxVolees} volées)`, maxVolees <= 40);
}

console.log("\n7) BOUTON « RETOUR » : le curseur se resynchronise (plus de rafale de busts)");
{
  // Reproduit le scenario de la relecture : on annule une volee, donc le score restant du bot
  // REMONTE a sa valeur precedente. Avant, le curseur restait en avance et le bot servait ses
  // grosses volees sur un petit reste -> 6 a 9 busts d'affilee.
  const pr = calculerProfilBot({ drix: 1000, duels: [], amiPseudo: "Ami", volees });
  let bustsMax = 0, bustsTotal = 0, coups = 0;
  for (let essai = 0; essai < 200; essai++) {
    let reste = 501, avant = null, serie = 0;
    for (let g = 0; g < 30 && reste > 0; g++) {
      const sc = genererScoreBot(reste, pr);
      coups++;
      if (sc > reste) { serie++; bustsTotal++; bustsMax = Math.max(bustsMax, serie); continue; }
      serie = 0;
      avant = reste; reste -= sc;
      // 1 fois sur 4 l'humain appuie sur « Retour » : le bot revient a son reste d'avant.
      if (avant != null && Math.random() < 0.25) reste = avant;
    }
  }
  const tauxBust = bustsTotal / coups;
  check(`jamais plus de 2 busts d'affilee malgre les annulations (max vu : ${bustsMax})`, bustsMax <= 2);
  check(`le taux de bust reste realiste (${(tauxBust * 100).toFixed(1)} %)`, tauxBust < 0.15);
}

console.log("\n8) DEUX PARTIES COLLEES NE FORMENT PLUS UNE MANCHE IMPOSSIBLE");
{
  // Partie A abandonnee apres une seule volee (reste 475), puis partie B = manche complete.
  // Le reste DESCEND entre les deux (441 < 475) : sans coupure sur la session, tout fusionnait.
  const a = manche(501, [26]).map((v) => ({ ...v, session_id: "A" }));
  const b = manche(501, [60, 100, 100, 100, 141]).map((v) => ({ ...v, session_id: "B" }));
  const m = reconstruireManches([...a, ...b]);
  check("2 manches distinctes, pas une seule fusionnee", m.length === 2);
  const impossible = m.filter((x) => x.volees.filter((v) => v > 0).reduce((p, q) => p + q, 0) > x.depart);
  check(`aucune manche ne totalise plus que son depart (${impossible.length} impossible)`, impossible.length === 0);
  check("la vraie manche gagnee est bien retrouvee (5 volees)",
    m.some((x) => x.gagnee && x.volees.length === 5 && x.depart === 501));
}

console.log("\n9) PARTIE EN 301 AVEC UN HISTORIQUE 100 % 501 : il rejoue quand meme de vraies flechettes");
{
  const pr = calculerProfilBot({ drix: 1000, duels: [], amiPseudo: "Ami", volees });
  const sesVolees = new Set(volees.filter((v) => v.score > 0).map((v) => v.score));
  check("aucune de ses manches ne part de 301", (pr.manchesReelles || []).every((m) => m.depart !== 301));

  let horsRepertoire = 0, coups = 0, finis = 0, pire = 99;
  for (let i = 0; i < 300; i++) {
    let reste = 301, n = 0;
    for (let g = 0; g < 40 && reste > 0; g++) {
      const sc = genererScoreBot(reste, pr);
      n++; coups++;
      if (sc > reste) continue;                       // bust
      if (sc > 0 && !sesVolees.has(sc)) horsRepertoire++;
      reste -= sc;
    }
    if (reste === 0) { finis++; pire = Math.min(pire, n); }
  }
  // Il reprend le fil la ou il etait A 301 dans une vraie manche de 501 : ce sont ses vraies volees.
  check(`ses volees viennent de son vrai repertoire (${horsRepertoire} hors repertoire sur ${coups})`,
    horsRepertoire < coups * 0.15);
  check(`il finit ses manches de 301 (${finis}/300)`, finis >= 280);
  check(`et pas en 2 volees (le plus rapide : ${pire} volees)`, pire >= 3);
}

console.log("\n" + (ko === 0 ? "TOUT PASSE (" + ok + " verifications)" : ko + " ECHEC(S) sur " + (ok + ko)));
process.exit(ko === 0 ? 0 : 1);
