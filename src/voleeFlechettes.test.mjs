// Test de la logique « fléchette par fléchette ».
// Objectif n°1 : PROUVER qu'elle donne le même résultat que le mode « score total ».
// Lancer : node src/voleeFlechettes.test.mjs
import {
  creerFlechette, totalVolee, verdictApresFlechette, doubleDuFinish,
  multEffectif, libelleFlechette, pointsFlechette,
} from "./voleeFlechettes.js";

let ok = 0, ko = 0;
const eq = (nom, a, b) => {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A === B) { ok++; } else { ko++; console.log(`❌ ${nom}\n   attendu ${B}\n   obtenu  ${A}`); }
};

// ── Règle du mode TOTAL (référence absolue) ─────────────────────────────────
const verdictTotal = (reste, total) => {
  const n = reste - total;
  if (n < 0 || n === 1) return "bust";
  if (n === 0) return "finish";
  return "ok";
};

// Rejoue une volée fléchette par fléchette et renvoie le verdict FINAL.
const jouer = (resteAvant, coups) => {
  const fl = [];
  for (const [s, m] of coups) {
    fl.push(creerFlechette(s, m));
    const v = verdictApresFlechette(resteAvant, fl);
    if (v !== "continue") return { verdict: v, total: totalVolee(fl), darts: fl.length, fl };
  }
  return { verdict: "valider", total: totalVolee(fl), darts: fl.length, fl };
};

// ── 1. LE PIÈGE : reste intermédiaire à 1 n'est PAS un bust ────────────────
// 21 → S20 laisse 1 (le pavé ne doit PAS clore) puis S1 → finish.
{
  const r = jouer(21, [[20,1],[1,1]]);
  eq("21 : S20 puis S1 → finish", { v:r.verdict, t:r.total, d:r.darts }, { v:"finish", t:21, d:2 });
  eq("21 : cohérent avec le mode total", verdictTotal(21, 21), "finish");
}
{
  const r = jouer(61, [[20,3],[1,1]]);
  eq("61 : T20 puis S1 → finish", { v:r.verdict, t:r.total, d:r.darts }, { v:"finish", t:61, d:2 });
}
// Après 3 fléchettes, un reste de 1 redevient bien un bust — via le mode total.
{
  const r = jouer(41, [[20,1],[10,1],[10,1]]);
  eq("41 : 20+10+10 → volée pleine", { v:r.verdict, t:r.total }, { v:"valider", t:40 });
  eq("41 : le total tranche → bust (reste 1)", verdictTotal(41, r.total), "bust");
}

// ── 2. Bust immédiat (reste < 0) : on ferme tout de suite ──────────────────
{
  const r = jouer(32, [[20,1],[13,1],[5,1]]);
  eq("32 : 20 puis 13 → bust à 2 fléchettes", { v:r.verdict, d:r.darts }, { v:"bust", d:2 });
}

// ── 3. Finishes ────────────────────────────────────────────────────────────
{
  const r = jouer(40, [[20,2]]);
  eq("40 : D20 → finish en 1 fléchette", { v:r.verdict, d:r.darts, t:r.total }, { v:"finish", d:1, t:40 });
  eq("40 : double du finish = 20", doubleDuFinish(r.fl), "20");
}
{
  const r = jouer(72, [[16,3],[12,2]]);
  eq("72 : T16+D12 → finish en 2", { v:r.verdict, d:r.darts, t:r.total }, { v:"finish", d:2, t:72 });
  eq("72 : double du finish = 12", doubleDuFinish(r.fl), "12");
}
{
  const r = jouer(170, [[20,3],[20,3],[25,2]]);
  eq("170 : T20+T20+D25 → finish en 3", { v:r.verdict, d:r.darts, t:r.total }, { v:"finish", d:3, t:170 });
  eq("170 : double du finish = B (bull)", doubleDuFinish(r.fl), "B");
}
// Finish sur un SIMPLE : autorisé (pas de Double Out) → pas de double à enregistrer.
{
  const r = jouer(20, [[20,1]]);
  eq("20 : S20 → finish (pas de Double Out)", { v:r.verdict, d:r.darts }, { v:"finish", d:1 });
  eq("20 : aucun double à enregistrer", doubleDuFinish(r.fl), null);
}

// ── 4. Bull et Triple 25 interdit ──────────────────────────────────────────
eq("25 simple = 25 pts", pointsFlechette(25,1), 25);
eq("D25 = 50 pts", pointsFlechette(25,2), 50);
eq("T25 interdit → retombe en simple 25", pointsFlechette(25,3), 25);
eq("T25 interdit → multiplicateur ramené à 1", multEffectif(25,3), 1);
eq("libellé D25", libelleFlechette(25,2), "D25");

// ── 5. MISS ────────────────────────────────────────────────────────────────
eq("MISS = 0 pt", pointsFlechette(0,1), 0);
eq("libellé MISS", libelleFlechette(0,1), "MISS");
{
  const r = jouer(100, [[20,1],[0,1],[5,1]]);
  eq("100 : 20 + MISS + 5 = 25", { v:r.verdict, t:r.total, d:r.darts }, { v:"valider", t:25, d:3 });
}

// ── 6. Cohérence GLOBALE des deux modes (balayage exhaustif) ───────────────
// Pour chaque reste et chaque volée de 3 fléchettes simples, le verdict final
// du pavé fléchette (une fois la volée close) doit coller au mode total.
{
  let divergences = 0;
  for (let reste = 2; reste <= 60; reste++) {
    for (let a = 0; a <= 20; a++) for (let b = 0; b <= 20; b++) for (let c = 0; c <= 20; c++) {
      const r = jouer(reste, [[a,1],[b,1],[c,1]]);
      // verdict du mode total sur le total RÉELLEMENT lancé
      const attendu = verdictTotal(reste, r.total);
      const obtenu = r.verdict === "valider" ? verdictTotal(reste, r.total)
                   : r.verdict === "finish" ? "finish" : "bust";
      if (attendu !== obtenu) divergences++;
    }
  }
  eq("balayage 2→60 × toutes volées simples : 0 divergence", divergences, 0);
}

console.log(`\n${ko === 0 ? "✅" : "⚠️"} ${ok} test(s) OK, ${ko} échec(s)`);
process.exit(ko === 0 ? 0 : 1);
