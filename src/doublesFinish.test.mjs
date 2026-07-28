// Quels doubles pouvaient VRAIMENT terminer une volée ?
// Né d'un retour de testeur : il finissait à 3 points et l'appli lui a laissé
// valider « D2 » (4 points, impossible) au lieu de « D1 ».
// Lancer : node src/doublesFinish.test.mjs
import { doublesPossiblesFinish } from "./voleeFlechettes.js";

let ok = 0, ko = 0;
const verifie = (titre, reel, attendu) => {
  const a = [...reel].sort(), b = [...attendu].sort();
  const pareil = a.length === b.length && a.every((x, i) => x === b[i]);
  if (pareil) { ok++; console.log("  OK    " + titre); }
  else { ko++; console.log("  ECHEC " + titre + "\n        obtenu  : " + a.join(",") + "\n        attendu : " + b.join(",")); }
};
const contient = (titre, val, nb, cle, doitEtre) => {
  const y = doublesPossiblesFinish(val, nb).has(cle);
  if (y === doitEtre) { ok++; console.log("  OK    " + titre); }
  else { ko++; console.log("  ECHEC " + titre + " (obtenu " + y + ", attendu " + doitEtre + ")"); }
};

console.log("\n1) LE CAS DU TESTEUR : 3 points restants, 3 flechettes");
verifie("seul D1 est jouable (1 + D1 = 3)", doublesPossiblesFinish(3, 3), ["1"]);
contient("D2 est REFUSE (4 > 3)", 3, 3, "2", false);
contient("le Bull est refuse (50 > 3)", 3, 3, "B", false);

console.log("\n2) FINISH EN UNE SEULE FLECHETTE");
verifie("40 en 1 flechette = D20 uniquement", doublesPossiblesFinish(40, 1), ["20"]);
verifie("50 en 1 flechette = Bull uniquement", doublesPossiblesFinish(50, 1), ["B"]);
verifie("2 en 1 flechette = D1 uniquement", doublesPossiblesFinish(2, 1), ["1"]);

console.log("\n3) FINISH EN 2 FLECHETTES");
contient("32 en 2 flechettes : D16 possible (D16 direct)", 32, 2, "16", true);
contient("32 en 2 flechettes : D1 possible (T10 puis D1)", 32, 2, "1", true);
contient("32 en 2 flechettes : D20 refuse (40 > 32)", 32, 2, "20", false);
contient("110 en 2 flechettes : Bull possible (T20 puis Bull)", 110, 2, "B", true);

console.log("\n4) FINISH EN 3 FLECHETTES");
contient("170 en 3 flechettes : Bull possible (T20 T20 Bull)", 170, 3, "B", true);
contient("170 en 3 flechettes : D20 refuse (il resterait 130 en 2 flechettes)", 170, 3, "20", false);
contient("60 en 3 flechettes : D20 possible", 60, 3, "20", true);
contient("60 en 3 flechettes : D1 possible", 60, 3, "1", true);

console.log("\n5) COHERENCE GENERALE");
const max = { 1: 0, 2: 60, 3: 120 };
{
  // Aucun double impossible ne doit jamais etre propose.
  let souci = 0, verifies = 0;
  for (let val = 1; val <= 180; val++) for (const nb of [1, 2, 3])
    for (const cle of doublesPossiblesFinish(val, nb)) {
      verifies++;
      const reste = val - (cle === "B" ? 50 : 2 * Number(cle));
      if (reste < 0 || reste > max[nb] || (nb === 1 && reste !== 0)) souci++;
    }
  if (souci === 0) { ok++; console.log("  OK    aucun double impossible (" + verifies + " propositions verifiees)"); }
  else { ko++; console.log("  ECHEC " + souci + " double(s) impossible(s) proposes"); }
}
{
  // VERIFICATION INDEPENDANTE, contre une verite connue du jeu de flechettes :
  // en 3 flechettes, les seuls scores <= 170 qu'on ne peut PAS finir sont les
  // « bogey numbers » 159, 162, 163, 165, 166, 168 et 169.
  const BOGEY = [159, 162, 163, 165, 166, 168, 169];
  const sansDouble = [];
  for (let val = 2; val <= 170; val++)
    if (doublesPossiblesFinish(val, 3).size === 0) sansDouble.push(val);
  const pareil = sansDouble.length === BOGEY.length && sansDouble.every((v, i) => v === BOGEY[i]);
  if (pareil) { ok++; console.log("  OK    les seuls finishs sans double sont les 7 bogey numbers : " + BOGEY.join(", ")); }
  else { ko++; console.log("  ECHEC obtenu " + sansDouble.join(",") + "\n        attendu " + BOGEY.join(",")); }
}
{
  // Au-dela de 170, plus rien n'est finissable en 3 flechettes.
  let faux = 0;
  for (let val = 171; val <= 180; val++) if (doublesPossiblesFinish(val, 3).size !== 0) faux++;
  if (faux === 0) { ok++; console.log("  OK    aucun finish propose au-dessus de 170"); }
  else { ko++; console.log("  ECHEC " + faux + " score(s) > 170 acceptent un finish"); }
}

console.log("\n" + (ko === 0 ? "TOUT PASSE (" + ok + " verifications)" : ko + " ECHEC(S) sur " + (ok + ko)));
process.exit(ko === 0 ? 0 : 1);
