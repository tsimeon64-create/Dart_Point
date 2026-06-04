// LECTURE SEULE — audite la distribution des DRIX des défis quotidiens
// (+5 participation, +20 vainqueur du jour) : doublons ? montants ? trous ?
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sb = async (p) => {
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
};
const fetchAll = async (table, sel) => {
  const out = []; let off = 0;
  for (;;) { const pg = await sb(`${table}?select=${sel}&limit=1000&offset=${off}`); out.push(...pg); if (pg.length < 1000) break; off += 1000; }
  return out;
};
const dayOf = (ts) => new Date(ts).toISOString().slice(0, 10);

(async () => {
  const mvts = await fetchAll("drix_mouvements", "id,joueur_id,joueur_pseudo,adversaire_pseudo,variation,date,duel_id");
  const defis = mvts.filter((m) => !m.duel_id && /Speedrun|Vainqueur|Défi complété|Participation/i.test(m.adversaire_pseudo || ""));

  // Catégories distinctes
  const cats = {};
  for (const m of defis) {
    const key = (m.adversaire_pseudo || "").replace(/\s+/g, " ").trim();
    (cats[key] ||= { n: 0, vars: new Set() }).n++;
    cats[key].vars.add(m.variation);
  }
  console.log("=== CATÉGORIES de récompenses de défis (count | variations) ===");
  for (const [k, v] of Object.entries(cats)) console.log(`  ${v.n.toString().padStart(4)} × | var=${[...v.vars].join(",")} | ${k}`);

  const isWinner = (m) => /Vainqueur/i.test(m.adversaire_pseudo || "");
  const isPartic = (m) => !isWinner(m);
  const challenge = (m) => (/Scoreur/i.test(m.adversaire_pseudo) ? "Scoreur" : /Finish/i.test(m.adversaire_pseudo) ? "Finish" : "?");

  // ── +20 Vainqueur : doit être 1 par jour PAR défi ──
  console.log("\n=== +20 VAINQUEUR — unicité par jour & par défi ===");
  const winByDayCh = {}; // `${day}|${challenge}` -> [mvts]
  for (const m of defis.filter(isWinner)) {
    const k = `${dayOf(m.date)}|${challenge(m)}`;
    (winByDayCh[k] ||= []).push(m);
  }
  let winDoublons = 0, winMontantKO = 0, winTotal = 0;
  for (const [k, arr] of Object.entries(winByDayCh).sort()) {
    winTotal++;
    const bad = arr.length > 1;
    const montants = arr.map((a) => a.variation);
    if (bad) winDoublons++;
    if (montants.some((v) => v !== 20)) winMontantKO++;
    if (bad || montants.some((v) => v !== 20))
      console.log(`  ⚠️ ${k} : ${arr.length} récompense(s) — ${arr.map((a) => `${a.joueur_pseudo}(+${a.variation})`).join(", ")}`);
  }
  console.log(`  → ${winTotal} jours×défis | doublons: ${winDoublons} | montants ≠ 20: ${winMontantKO}`);

  // ── +5 Participation : doit être 1 par joueur / jour / défi ──
  console.log("\n=== +5 PARTICIPATION — unicité par joueur/jour/défi ===");
  const partByKey = {}; // `${day}|${challenge}|${joueur_id}` -> [mvts]
  for (const m of defis.filter(isPartic)) {
    const k = `${dayOf(m.date)}|${challenge(m)}|${m.joueur_id}`;
    (partByKey[k] ||= []).push(m);
  }
  let partDoublons = 0, partMontantKO = 0, partTotal = 0;
  for (const [k, arr] of Object.entries(partByKey)) {
    partTotal++;
    const montants = arr.map((a) => a.variation);
    if (arr.length > 1) { partDoublons++; console.log(`  ⚠️ doublon: ${arr[0].joueur_pseudo} ${k.split("|").slice(0,2).join(" ")} → ${arr.length}× (+${montants.join(",+")})`); }
    if (montants.some((v) => v !== 5)) { partMontantKO++; console.log(`  ⚠️ montant: ${arr[0].joueur_pseudo} ${k.split("|").slice(0,2).join(" ")} → +${montants.join(",+")}`); }
  }
  console.log(`  → ${partTotal} (joueur×jour×défi) | doublons: ${partDoublons} | montants ≠ 5: ${partMontantKO}`);

  // Totaux
  const totalWin = defis.filter(isWinner).reduce((s, m) => s + (m.variation || 0), 0);
  const totalPart = defis.filter(isPartic).reduce((s, m) => s + (m.variation || 0), 0);
  console.log(`\nTOTAL distribué : vainqueurs +${totalWin} DRIX (${defis.filter(isWinner).length} récompenses) | participations +${totalPart} DRIX (${defis.filter(isPartic).length})`);
})().catch((e) => { console.error("ERREUR:", e.message); process.exit(1); });
