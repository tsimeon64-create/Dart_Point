// Tests de verserBonusBulle (src/bulleXp.js) — lancer : node tests/bulle-xp.test.mjs
import assert from "node:assert/strict";
import { verserBonusBulle, verserBonusBulleFinDeMatch, bonusDejaVerseCeJour, debutDuJour, nouvelEtatBulle, XP_BULLE } from "../src/bulleXp.js";

let ok = 0;
const test = async (nom, f) => { await f(); ok++; console.log("  ✓", nom); };

// localStorage minimal pour node
const stock = new Map();
globalThis.localStorage = { getItem: (k) => (stock.has(k) ? stock.get(k) : null), setItem: (k, v) => stock.set(k, String(v)), removeItem: (k) => stock.delete(k) };

// Une « base » simulée : la colonne bulle_xp_joueur du duel et l'XP du joueur.
const base = (opts = {}) => {
  const b = { reserve: opts.reserve ?? null, xp: opts.xp ?? 500, colonne: opts.colonne ?? true, ecritures: 0, pannes: { ...(opts.pannes || {}) } };
  b.fetch = async (url, o = {}) => {
    const m = (o.method || "GET").toUpperCase();
    const panne = (cle) => { const p = b.pannes[cle]; if (p && p.length) return p.shift(); return null; };
    const rep = (status, corps) => ({ ok: status >= 200 && status < 300, status, json: async () => corps });
    if (m === "PATCH" && url.includes("bulle_xp_joueur=is.null")) {
      const p = panne("reserver"); if (p === "reseau") throw new Error("réseau"); if (p) return rep(p, { message: "panne" });
      if (!b.colonne) return rep(400, { code: "PGRST204", message: "colonne absente" });
      if (b.reserve) return rep(200, []);
      b.reserve = JSON.parse(o.body).bulle_xp_joueur; return rep(200, [{ id: "d1" }]);
    }
    if (m === "GET" && url.includes("select=xp")) {
      const p = panne("lire"); if (p === "reseau") throw new Error("réseau"); if (p) return rep(p, { message: "panne" });
      return rep(200, [{ xp: b.xp }]);
    }
    if (m === "PATCH" && url.includes("joueurs?id=eq.")) {
      const p = panne("ecrire");
      if (p === "perdue") { b.xp = JSON.parse(o.body).xp; b.ecritures++; throw new Error("réponse perdue"); }
      if (p === "reseau") throw new Error("réseau"); if (p) return rep(p, { message: "panne" });
      b.xp = JSON.parse(o.body).xp; b.ecritures++; return rep(204, null);
    }
    throw new Error("requête inattendue " + m + " " + url);
  };
  return b;
};
const appel = (b, etat, cle = "dp_bulle_xp_d1") => verserBonusBulle({ fetchFn: b.fetch, sbUrl: "https://x", sbKey: "k", cible: "duels?id=eq.d1", compteId: "joueurA", cleLocale: cle, etat });

await test("cas normal : +100 une seule fois, même en lançant plusieurs fléchettes", async () => {
  stock.clear(); const b = base(); const etat = nouvelEtatBulle();
  assert.equal(await appel(b, etat), "paye");
  assert.equal(await appel(b, etat), "deja");
  assert.equal(await appel(b, etat), "deja");
  assert.equal(b.xp, 500 + XP_BULLE); assert.equal(b.ecritures, 1); assert.equal(b.reserve, "joueurA");
});

await test("un autre téléphone a déjà réservé : rien", async () => {
  stock.clear(); const b = base({ reserve: "joueurA" }); const etat = nouvelEtatBulle();
  assert.equal(await appel(b, etat), "deja"); assert.equal(b.xp, 500);
});

await test("deux appels en même temps (double tap) : un seul paiement", async () => {
  stock.clear(); const b = base(); const etat = nouvelEtatBulle();
  const [r1, r2] = await Promise.all([appel(b, etat), appel(b, etat)]);
  assert.deepEqual([r1, r2].sort(), ["deja", "paye"]); assert.equal(b.xp, 600);
});

await test("lecture de l'XP ratée APRÈS la réservation : le lancer suivant paie, sans re-réserver", async () => {
  stock.clear(); const b = base({ pannes: { lire: ["reseau"] } }); const etat = nouvelEtatBulle();
  assert.equal(await appel(b, etat), "reessayer"); assert.equal(b.xp, 500);
  assert.equal(await appel(b, etat), "paye"); assert.equal(b.xp, 600); assert.equal(b.ecritures, 1);
});

await test("réponse de l'écriture perdue : on s'arrête (jamais deux fois)", async () => {
  stock.clear(); const b = base({ pannes: { ecrire: ["perdue"] } }); const etat = nouvelEtatBulle();
  assert.equal(await appel(b, etat), "abandon");
  assert.equal(await appel(b, etat), "deja");
  assert.equal(b.xp, 600); assert.equal(b.ecritures, 1);
});

await test("refus net de l'écriture (500) : on réessaie, payé une seule fois", async () => {
  stock.clear(); const b = base({ pannes: { ecrire: [500] } }); const etat = nouvelEtatBulle();
  assert.equal(await appel(b, etat), "reessayer"); assert.equal(b.xp, 500);
  assert.equal(await appel(b, etat), "paye"); assert.equal(b.xp, 600);
});

await test("erreur passagère sur la réservation (503) : PAS de repli local, on réessaie", async () => {
  stock.clear(); const b = base({ pannes: { reserver: [503] } }); const etat = nouvelEtatBulle();
  assert.equal(await appel(b, etat), "reessayer");
  assert.equal(localStorage.getItem("dp_bulle_xp_d1"), null);   // aucune marque posée
  assert.equal(b.reserve, null);
  assert.equal(await appel(b, etat), "paye"); assert.equal(b.reserve, "joueurA"); assert.equal(b.xp, 600);
});

await test("ancien double paiement : erreur passagère puis réouverture du duel → une seule fois", async () => {
  stock.clear(); const b = base({ pannes: { reserver: [503] } });
  const etat1 = nouvelEtatBulle();
  assert.equal(await appel(b, etat1), "reessayer");        // l'appli recharge avant le lancer suivant
  const etat2 = nouvelEtatBulle();                          // réouverture du même duel
  assert.equal(await appel(b, etat2), "paye");
  const etat3 = nouvelEtatBulle();                          // et encore une
  assert.equal(await appel(b, etat3), "deja");
  assert.equal(b.xp, 600);
});

await test("colonne absente (SQL pas lancé) : repli dans le navigateur, une seule fois", async () => {
  stock.clear(); const b = base({ colonne: false });
  assert.equal(await appel(b, nouvelEtatBulle()), "paye");
  assert.equal(await appel(b, nouvelEtatBulle()), "deja");  // réouverture : la marque locale bloque
  assert.equal(b.xp, 600);
});

await test("lecture ratée en boucle : on abandonne après 3 essais, sans rien écrire", async () => {
  stock.clear(); const b = base({ pannes: { lire: [500, 500, 500, 500] } }); const etat = nouvelEtatBulle();
  assert.equal(await appel(b, etat), "reessayer");
  assert.equal(await appel(b, etat), "reessayer");
  assert.equal(await appel(b, etat), "abandon");
  assert.equal(await appel(b, etat), "deja");
  assert.equal(b.xp, 500); assert.equal(b.ecritures, 0);
});

await test("compte introuvable ou sans compte : rien", async () => {
  stock.clear(); const b = base();
  b.fetch = (orig => async (url, o) => (url.includes("select=xp") ? { ok: true, status: 200, json: async () => [] } : orig(url, o)))(b.fetch);
  assert.equal(await appel(b, nouvelEtatBulle()), "abandon"); assert.equal(b.ecritures, 0);
  const vide = await verserBonusBulle({ fetchFn: b.fetch, sbUrl: "x", sbKey: "k", cible: "duels?id=eq.d2", compteId: null, cleLocale: "c2", etat: nouvelEtatBulle() });
  assert.equal(vide, "deja");
});

// ── Anti-farm : 1 bonus par jour contre le même adversaire ──
await test("plafond : déjà payé aujourd'hui contre lui → rien, et la base n'est même pas réservée", async () => {
  stock.clear(); const b = base(); const etat = nouvelEtatBulle();
  const r = await verserBonusBulle({ fetchFn: b.fetch, sbUrl: "https://x", sbKey: "k", cible: "duels?id=eq.d1", compteId: "joueurA", cleLocale: "dp_bulle_xp_d1", etat, plafond: async () => true });
  assert.equal(r, "plafond"); assert.equal(b.reserve, null); assert.equal(b.xp, 500);
});

await test("plafond : pas encore aujourd'hui → payé ; vérification impossible → on réessaie", async () => {
  stock.clear(); const b = base(); const etat = nouvelEtatBulle();
  let reponses = [null, false];
  const plafond = async () => reponses.shift();
  const opts = { fetchFn: b.fetch, sbUrl: "https://x", sbKey: "k", cible: "duels?id=eq.d1", compteId: "joueurA", cleLocale: "dp_bulle_xp_d1", etat, plafond };
  assert.equal(await verserBonusBulle(opts), "reessayer"); assert.equal(b.reserve, null);
  assert.equal(await verserBonusBulle(opts), "paye"); assert.equal(b.xp, 600);
});

await test("bonusDejaVerseCeJour : bonne requête, et null si la base ne répond pas", async () => {
  let vue = null;
  const fetchOk = async (url) => { vue = url; return { ok: true, status: 200, json: async () => [{ id: "autre" }] }; };
  const oui = await bonusDejaVerseCeJour({ fetchFn: fetchOk, sbUrl: "https://x", sbKey: "k", compteId: "A", adversaireId: "B", duelId: "d1", debutJour: 1000 });
  assert.equal(oui, true);
  assert.ok(vue.includes("bulle_xp_joueur=eq.A") && vue.includes("date=gte.1000") && vue.includes("challenger_id.eq.B,defie_id.eq.B") && vue.includes("id=neq.d1"));
  const non = await bonusDejaVerseCeJour({ fetchFn: async () => ({ ok: true, status: 200, json: async () => [] }), sbUrl: "x", sbKey: "k", compteId: "A", adversaireId: "B", duelId: "d1", debutJour: 1 });
  assert.equal(non, false);
  const panne = await bonusDejaVerseCeJour({ fetchFn: async () => { throw new Error("réseau"); }, sbUrl: "x", sbKey: "k", compteId: "A", adversaireId: "B", duelId: "d1", debutJour: 1 });
  assert.equal(panne, null);
  assert.equal(debutDuJour(new Date(2026, 10, 5, 17, 30).getTime()), new Date(2026, 10, 5).getTime());
});

await test("plafond : un match de TOURNOI du jour contre le même adversaire compte aussi", async () => {
  const urls = [];
  const fetchTournoi = (adversaireDuMatch) => async (url) => {
    urls.push(url);
    const rep = (x) => ({ ok: true, status: 200, json: async () => x });
    if (url.includes("/duels?")) return rep([]);                                             // aucun duel payé
    if (url.includes("/tournois_potes_matchs?")) return rep([{ joueur1_id: "insc-A", joueur2_id: "insc-B" }]);
    if (url.includes("/tournois_potes_joueurs?")) return rep([{ joueur_id: "A" }, { joueur_id: adversaireDuMatch }]);
    throw new Error("inattendu " + url);
  };
  const debut = new Date(2026, 10, 5).getTime();
  const memeAdv = await bonusDejaVerseCeJour({ fetchFn: fetchTournoi("B"), sbUrl: "https://x", sbKey: "k", compteId: "A", adversaireId: "B", matchId: "m9", debutJour: debut });
  assert.equal(memeAdv, true);
  assert.ok(urls.some((u) => u.includes(`date_fin=gte.${new Date(debut).toISOString()}`) && u.includes("id=neq.m9")));
  assert.ok(!urls.find((u) => u.includes("/duels?")).includes("id=neq."));   // pas de duel à exclure en tournoi
  const autreAdv = await bonusDejaVerseCeJour({ fetchFn: fetchTournoi("C"), sbUrl: "https://x", sbKey: "k", compteId: "A", adversaireId: "B", duelId: "d1", debutJour: debut });
  assert.equal(autreAdv, false);
  const sansAdversaire = await bonusDejaVerseCeJour({ fetchFn: fetchTournoi("B"), sbUrl: "x", sbKey: "k", compteId: "A", adversaireId: null, debutJour: debut });
  assert.equal(sansAdversaire, false);
});

await test("fin de match : réessaie tout seul après une panne passagère, payé une fois", async () => {
  stock.clear(); const b = base({ pannes: { reserver: [503] } }); const etat = nouvelEtatBulle();
  const r = await verserBonusBulleFinDeMatch({ fetchFn: b.fetch, sbUrl: "https://x", sbKey: "k", cible: "duels?id=eq.d1", compteId: "joueurA", cleLocale: "dp_bulle_xp_d1", etat }, { pauseMs: 0 });
  assert.equal(r, "paye"); assert.equal(b.xp, 600); assert.equal(b.ecritures, 1);
});

console.log(`\n${ok} tests OK`);
