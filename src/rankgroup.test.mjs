// Test du classement de poule (miroir de rankGroup dans AppTournoiPotes.jsx).
// Règle voulue : 1) VICTOIRES  2) moins de DÉFAITES  3) goal average manches  4) barrages.
// Lancer :  node src/rankgroup.test.mjs
//
// ⚠️ Ce fichier reproduit à l'identique le comparateur de rankGroup. Si tu changes
//    l'ordre des critères dans AppTournoiPotes.jsx, mets ce test à jour.

const cmp = (a, b) => {
  if (b.victoires !== a.victoires) return b.victoires - a.victoires;      // 1) victoires
  if (a.defaites !== b.defaites) return a.defaites - b.defaites;          // 2) moins de défaites
  const da = a.manches_pour - a.manches_contre, db = b.manches_pour - b.manches_contre;
  if (db !== da) return db - da;                                         // 3) goal average manches
  return 0;                                                             // 4) (barrages testés ailleurs)
};
const rank = js => [...js].sort(cmp);

let ko = 0;
const check = (label, cond) => { console.log(`${cond ? "OK  " : "ÉCHEC"} — ${label}`); if (!cond) ko++; };

// Cas 1 : le bug signalé. 3V-1D doit passer devant 2V-2D, quelles que soient les manches.
{
  const A = { nom: "A", victoires: 3, defaites: 1, manches_pour: 6, manches_contre: 5 };  // peu de manches
  const B = { nom: "B", victoires: 2, defaites: 2, manches_pour: 12, manches_contre: 4 }; // beaucoup de manches
  const r = rank([B, A]);
  check("3V-1D devant 2V-2D (même si 2V-2D a plus de manches)", r[0].nom === "A");
}

// Cas 2 : l'injustice du point bonus. 2V (défaites sèches) doit passer devant 1V (défaites accrochées).
{
  const P = { nom: "P", victoires: 2, defaites: 2, manches_pour: 6, manches_contre: 6 };  // avant : 4 pts
  const Q = { nom: "Q", victoires: 1, defaites: 3, manches_pour: 5, manches_contre: 9 };  // avant : 5 pts (bonus)
  const r = rank([Q, P]);
  check("2 victoires devant 1 victoire (le point bonus ne renverse plus rien)", r[0].nom === "P");
}

// Cas 3 : égalité de victoires → départage par le goal average des manches.
{
  const X = { nom: "X", victoires: 2, defaites: 1, manches_pour: 9, manches_contre: 4 }; // +5
  const Y = { nom: "Y", victoires: 2, defaites: 1, manches_pour: 8, manches_contre: 6 }; // +2
  const r = rank([Y, X]);
  check("à victoires égales, meilleur goal average devant", r[0].nom === "X");
}

// Cas 4 : à victoires égales, moins de défaites devant (utile avec des exempts).
{
  const M = { nom: "M", victoires: 3, defaites: 0, manches_pour: 9, manches_contre: 3 };
  const N = { nom: "N", victoires: 3, defaites: 1, manches_pour: 15, manches_contre: 4 }; // + de manches mais 1 défaite
  const r = rank([N, M]);
  check("à victoires égales, moins de défaites devant", r[0].nom === "M");
}

// Cas 5 : classement complet d'une poule de 4.
{
  const j = [
    { nom: "1er", victoires: 3, defaites: 0, manches_pour: 9, manches_contre: 2 },
    { nom: "2e",  victoires: 2, defaites: 1, manches_pour: 7, manches_contre: 5 },
    { nom: "3e",  victoires: 1, defaites: 2, manches_pour: 5, manches_contre: 7 },
    { nom: "4e",  victoires: 0, defaites: 3, manches_pour: 2, manches_contre: 9 },
  ];
  const r = rank([j[2], j[0], j[3], j[1]]); // mélangé
  check("poule de 4 classée dans le bon ordre", r.map(x => x.nom).join(",") === "1er,2e,3e,4e");
}

console.log(ko === 0 ? "\n✅ Tous les tests passent." : `\n❌ ${ko} test(s) en échec.`);
process.exit(ko === 0 ? 0 : 1);
