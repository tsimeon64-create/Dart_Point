// LECTURE SEULE — réplique la sélection du « Joueur de la semaine » en excluant les comptes test.
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sb = async (p) => (await fetch(`${SB_URL}/rest/v1/${p}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } })).json();
const TEST = new Set(["Thomas", "Toto"]);
const SLUG = "euskal-dardoa";

const membresAll = await sb(`joueurs?asso_slug=eq.${SLUG}&select=id,pseudo,drix`);
const membres = membresAll.filter((m) => !TEST.has((m.pseudo || "").trim()));
const ids = membres.map((m) => m.id);
const duels = await sb(`duels?or=(challenger_id.in.(${ids.join(",")}),defie_id.in.(${ids.join(",")}))&statut=eq.termine&select=challenger_id,defie_id,gagnant_id,score_challenger,score_defie,date&limit=3000`);

const weekTs = Date.now() - 7 * 86400000;
const calc = (list, id) => {
  let wins = 0, losses = 0, sumMoy = 0, nMoy = 0;
  for (const d of list) {
    if (d.gagnant_id === id) wins++; else losses++;
    const sc = parseFloat(d.challenger_id === id ? d.score_challenger : d.score_defie);
    if (!isNaN(sc) && sc > 0) { sumMoy += sc; nMoy++; }
  }
  const games = wins + losses;
  return { games, wins, losses, moyenne: nMoy ? sumMoy / nMoy : 0, winRate: games ? wins / games : 0 };
};
const per = membres.map((m) => {
  const mine = duels.filter((d) => d.challenger_id === m.id || d.defie_id === m.id);
  return { m, week: calc(mine.filter((d) => (d.date || 0) >= weekTs), m.id), all: calc(mine, m.id) };
});
const qWeek = per.filter((p) => p.week.games >= 2);
const useWeek = qWeek.length > 0;
const pool = useWeek ? qWeek : per.filter((p) => p.all.games >= 3);
const score = (st) => st.moyenne + st.winRate * 40;
const ranked = pool.map((p) => ({ pseudo: p.m.pseudo, st: useWeek ? p.week : p.all }))
  .sort((a, b) => score(b.st) - score(a.st));

console.log(`Période : ${useWeek ? "SEMAINE (≥2 matchs/7j)" : "SAISON (≥3 matchs)"} | candidats: ${ranked.length}`);
console.log("");
ranked.slice(0, 8).forEach((r, i) => {
  console.log(`${i === 0 ? "👑" : "  "} ${r.pseudo.padEnd(20)} score=${score(r.st).toFixed(1)}  moy=${r.st.moyenne.toFixed(1)}  ${r.st.wins}-${r.st.losses} (${Math.round(r.st.winRate*100)}%)`);
});
console.log(`\n→ MVP = ${ranked[0]?.pseudo || "(aucun)"}`);
