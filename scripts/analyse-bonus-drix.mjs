// LECTURE SEULE — n'écrit RIEN. Reconstruit le bonus de performance cumulé par
// joueur à partir de l'historique, pour estimer l'impact d'un retrait des bonus.
//   bonus_par_duel = variation_stockée − ELO_pur_recalculé
// ELO recalculé = exactement la formule de appliquerDrixDuel (K = 32 × manches).

const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";

const sb = async (path) => {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
};

// Récupère TOUTES les lignes d'une table (pagination 1000).
const fetchAll = async (table, select) => {
  const out = [];
  let off = 0;
  for (;;) {
    const page = await sb(`${table}?select=${select}&order=date.asc&limit=1000&offset=${off}`);
    out.push(...page);
    if (page.length < 1000) break;
    off += 1000;
  }
  return out;
};

const round = (x) => Math.round(x);

(async () => {
  console.log("Lecture de l'historique (lecture seule)…\n");

  const joueurs = await sb("joueurs?select=id,pseudo,drix&limit=2000");
  const duels = await fetchAllNoOrder("duels", "id,challenger_id,defie_id,gagnant_id,manches,type,statut");
  const mvts = await fetchAll("drix_mouvements", "id,joueur_id,joueur_pseudo,adversaire_pseudo,variation,drix_avant,drix_apres,resultat,duel_id,date");

  const jById = new Map(joueurs.map((j) => [j.id, j]));
  const duelById = new Map(duels.map((d) => [d.id, d]));

  // Regroupe les mouvements par duel_id
  const mvtsByDuel = new Map();
  let mvtsSansDuel = 0;
  for (const m of mvts) {
    if (!m.duel_id) { mvtsSansDuel++; continue; }
    if (!mvtsByDuel.has(m.duel_id)) mvtsByDuel.set(m.duel_id, []);
    mvtsByDuel.get(m.duel_id).push(m);
  }

  const bonusParJoueur = new Map(); // joueur_id -> { total, nbDuels }
  const addBonus = (jid, b) => {
    const cur = bonusParJoueur.get(jid) || { total: 0, nbDuels: 0 };
    cur.total += b; cur.nbDuels += 1; bonusParJoueur.set(jid, cur);
  };

  const warnings = [];
  let duelsTraites = 0, duelsIgnores = 0;

  for (const [duelId, ms] of mvtsByDuel) {
    const duel = duelById.get(duelId);
    if (!duel) { duelsIgnores++; warnings.push(`duel ${duelId} introuvable (${ms.length} mvt)`); continue; }
    if (ms.length !== 2) { duelsIgnores++; warnings.push(`duel ${duelId} a ${ms.length} mouvements (attendu 2) — ignoré`); continue; }

    const mC = ms.find((m) => m.joueur_id === duel.challenger_id);
    const mD = ms.find((m) => m.joueur_id === duel.defie_id);
    if (!mC || !mD) { duelsIgnores++; warnings.push(`duel ${duelId} : mvt challenger/défié manquant`); continue; }

    const drixC = mC.drix_avant ?? 1000;
    const drixD = mD.drix_avant ?? 1000;
    const manches = Math.max(1, duel.manches || 1);
    const K = 32 * manches;
    const Cwins = duel.gagnant_id === duel.challenger_id;
    const isRiv = duel.type === "rivalite" || /Rivalit/.test(mC.adversaire_pseudo || "") || /Rivalit/.test(mD.adversaire_pseudo || "");

    const EA = 1 / (1 + Math.pow(10, (drixD - drixC) / 400));
    const EB = 1 - EA;

    let eloC, eloD;
    if (isRiv) { eloC = Cwins ? 50 : 0; eloD = Cwins ? 0 : 50; }
    else {
      eloC = Cwins ? round(K * EB) : -round(K * EA);
      eloD = Cwins ? -round(K * EB) : round(K * EA);
    }

    const bonusC = (mC.variation ?? 0) - eloC;
    const bonusD = (mD.variation ?? 0) - eloD;

    if (bonusC < 0 || bonusD < 0)
      warnings.push(`duel ${duelId} : ELO recalculé décroche (C=${bonusC}, D=${bonusD}) → plafonné à 0`);

    // Un vrai bonus de perf est toujours ≥ 0 : on plafonne (les négatifs = artefacts de reconstruction)
    addBonus(duel.challenger_id, Math.max(0, bonusC));
    addBonus(duel.defie_id, Math.max(0, bonusD));
    duelsTraites++;
  }

  // ── Rapport ──
  const rows = joueurs
    .map((j) => {
      const b = bonusParJoueur.get(j.id) || { total: 0, nbDuels: 0 };
      const drixAct = j.drix ?? 1000;
      const corrige = Math.max(100, drixAct - b.total);
      return { pseudo: j.pseudo, drixAct, bonus: b.total, corrige, nbDuels: b.nbDuels };
    })
    .sort((a, b) => b.drixAct - a.drixAct); // = classement actuel

  // rang après correction
  const parCorrige = [...rows].sort((a, b) => b.corrige - a.corrige);
  const rangCorrige = new Map(parCorrige.map((r, i) => [r.pseudo, i + 1]));

  const totalBonus = rows.reduce((s, r) => s + r.bonus, 0);

  console.log(`Joueurs: ${joueurs.length} | Duels avec mvt: ${mvtsByDuel.size} | traités: ${duelsTraites} | ignorés: ${duelsIgnores} | mvt sans duel_id: ${mvtsSansDuel}\n`);
  console.log("#".padStart(3), "Joueur".padEnd(20), "DRIX".padStart(6), "Bonus".padStart(7), "Corrigé".padStart(8), "→#".padStart(4), "Duels".padStart(6));
  console.log("-".repeat(62));
  rows.forEach((r, i) => {
    const rc = rangCorrige.get(r.pseudo);
    const bonusStr = r.bonus > 0 ? `-${r.bonus}` : r.bonus < 0 ? `+${-r.bonus}?` : "0";
    console.log(
      String(i + 1).padStart(3),
      String(r.pseudo).padEnd(20),
      String(r.drixAct).padStart(6),
      bonusStr.padStart(7),
      String(r.corrige).padStart(8),
      String(rc).padStart(4),
      String(r.nbDuels).padStart(6)
    );
  });
  console.log("-".repeat(62));
  console.log(`TOTAL bonus à retirer (tous joueurs) : ${totalBonus}\n`);

  if (warnings.length) {
    console.log(`⚠️  ${warnings.length} avertissement(s) :`);
    warnings.slice(0, 25).forEach((w) => console.log("   -", w));
    if (warnings.length > 25) console.log(`   … (+${warnings.length - 25} autres)`);
  } else console.log("Aucun avertissement.");
})().catch((e) => { console.error("ERREUR:", e.message); process.exit(1); });

// duels n'a pas de colonne date forcément triable → fetch sans order
async function fetchAllNoOrder(table, select) {
  const out = [];
  let off = 0;
  for (;;) {
    const page = await sb(`${table}?select=${select}&limit=1000&offset=${off}`);
    out.push(...page);
    if (page.length < 1000) break;
    off += 1000;
  }
  return out;
}
