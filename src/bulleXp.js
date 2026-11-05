// ── +100 XP AU GAGNANT DE LA BULLE : réservation + versement, partagé 501 / Cricket ──
// Fichier PUR (aucun import React) → testable à part : node tests/bulle-xp.test.mjs
//
// Règle : au PREMIER lancer d'un duel (ou d'un match de tournoi), le joueur qui a gagné la bulle
// reçoit 100 XP, une seule fois par match, même si deux téléphones suivent le match.
//   1. RÉSERVATION atomique : PATCH <cible>&bulle_xp_joueur=is.null (return=representation) ;
//      [] = un autre téléphone a déjà réservé → rien. Faite UNE fois par match : si le versement
//      rate ensuite, on ne la refait pas (elle répondrait [] et le bonus serait perdu).
//   2. VERSEMENT : on relit l'XP (jamais « 0 + 100 » sur une lecture ratée : ça effacerait son
//      XP), puis on écrit +100.
// Sûreté : JAMAIS payer deux fois. Si la réponse de l'écriture se perd (on ne sait pas si elle est
// passée), on s'arrête : au pire 100 XP perdus, jamais donnés deux fois.
// Repli « dans ce navigateur » SEULEMENT si la colonne n'existe pas (SQL xp_1_bulle.sql pas lancé :
// PostgREST répond 400 avec le code PGRST204 ou 42703) — pas sur une erreur passagère (503, 429…),
// sinon la base resterait « libre » et une réouverture du duel payait une 2e fois.

export const XP_BULLE = 100;
const ESSAIS_MAX = 3;   // au-delà, on abandonne (un refus net et répété ne se réglera pas tout seul)

const lireMarque = (cle) => { try { return localStorage.getItem(cle); } catch { return null; } };
const poserMarque = (cle) => { try { localStorage.setItem(cle, "1"); } catch { /* navigation privée */ } };

const colonneManquante = async (r) => {
  if (r.status !== 400) return false;
  try { const j = await r.json(); return j?.code === "PGRST204" || j?.code === "42703"; } catch { return false; }
};

// L'état d'un match, à garder d'un appel à l'autre (useRef côté composant).
export const nouvelEtatBulle = () => ({ reserve: false, paye: false, fini: false, enCours: false, essais: 0 });

// ── Anti-farm (choix de Thomas, nov. 2026) ───────────────────────────────────
// Avant, le bonus tombait au 1er lancer : on créait un défi, une fléchette, +100 XP, on quittait,
// et on recommençait. Désormais : versé seulement à la FIN d'un match terminé (les appelants), et
// au plus UNE fois par jour contre le même adversaire en duel (ci-dessous).
// La règle vaut pour TOUS les matchs (duel 501, duel Cricket, match de tournoi) : un même
// adversaire ne rapporte qu'un bonus par jour, d'où qu'il vienne.
// Renvoie true si un AUTRE match du jour a déjà payé ce bonus à ce joueur contre cet adversaire,
// false sinon, null si on n'a pas pu vérifier (on réessaiera).
//   duelId / matchId : le match en cours, à exclure (l'un ou l'autre selon le type de match).
//   ⚠️ duels.date est en millisecondes ; tournois_potes_matchs.date_fin est une date ISO.
export const bonusDejaVerseCeJour = async ({ fetchFn = globalThis.fetch, sbUrl, sbKey, compteId, adversaireId, duelId = null, matchId = null, debutJour }) => {
  if (!adversaireId) return false;
  const lire = async (chemin) => {
    const r = await fetchFn(`${sbUrl}/rest/v1/${chemin}`, { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } });
    if (!r.ok) throw new Error(String(r.status));
    const rows = await r.json();
    if (!Array.isArray(rows)) throw new Error("réponse illisible");
    return rows;
  };
  try {
    // 1) Les duels du jour qui lui ont payé ce bonus contre cet adversaire
    const duels = await lire(`duels?bulle_xp_joueur=eq.${compteId}&date=gte.${debutJour}`
      + `&or=(challenger_id.eq.${adversaireId},defie_id.eq.${adversaireId})${duelId ? `&id=neq.${duelId}` : ""}&select=id&limit=1`);
    if (duels.length) return true;
    // 2) Les matchs de tournoi du jour qui lui ont payé ce bonus. L'adversaire y est une
    //    INSCRIPTION (joueur1_id / joueur2_id) : on remonte à son compte.
    const matchs = await lire(`tournois_potes_matchs?bulle_xp_joueur=eq.${compteId}&date_fin=gte.${new Date(debutJour).toISOString()}`
      + `${matchId ? `&id=neq.${matchId}` : ""}&select=joueur1_id,joueur2_id`);
    const inscrits = [...new Set(matchs.flatMap((m) => [m.joueur1_id, m.joueur2_id]).filter(Boolean))];
    if (!inscrits.length) return false;
    const comptes = await lire(`tournois_potes_joueurs?id=in.(${inscrits.join(",")})&select=joueur_id`);
    return comptes.some((c) => c.joueur_id === adversaireId);
  } catch { return null; }
};

// Minuit (heure du téléphone), en millisecondes — duels.date est en millisecondes.
export const debutDuJour = (maintenant = Date.now()) => { const d = new Date(maintenant); d.setHours(0, 0, 0, 0); return d.getTime(); };

// cible    : « duels?id=eq.<id> » ou « tournois_potes_matchs?id=eq.<id> » (sans le filtre is.null)
// cleLocale: « dp_bulle_xp_<id du duel> » — la même au 501 et au Cricket pour un même duel
// plafond  : facultatif, async () => true (déjà payé aujourd'hui) | false | null (inconnu)
// Renvoie "paye" | "deja" | "plafond" | "reessayer" | "abandon"
export const verserBonusBulle = async ({ fetchFn = globalThis.fetch, sbUrl, sbKey, cible, compteId, cleLocale, etat, plafond = null }) => {
  if (!compteId || etat.paye || etat.fini || etat.enCours) return "deja";
  etat.enCours = true;
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}`, "Content-Type": "application/json" };
  const echec = () => { etat.essais++; if (etat.essais >= ESSAIS_MAX) etat.fini = true; return etat.fini ? "abandon" : "reessayer"; };
  try {
    // 1) Réservation (une seule fois par match)
    if (!etat.reserve) {
      if (lireMarque(cleLocale)) { etat.fini = true; return "deja"; }   // ce navigateur l'a déjà réservé/payé
      if (plafond) {
        const dejaCeJour = await plafond();
        if (dejaCeJour === null) return echec();                          // pas pu vérifier : on réessaiera
        if (dejaCeJour) { etat.fini = true; return "plafond"; }           // déjà eu son bonus aujourd'hui contre lui
      }
      let r;
      try {
        r = await fetchFn(`${sbUrl}/rest/v1/${cible}&bulle_xp_joueur=is.null`, {
          method: "PATCH", headers: { ...h, Prefer: "return=representation" }, body: JSON.stringify({ bulle_xp_joueur: compteId }),
        });
      } catch { return echec(); }                                        // réseau : on réessaiera
      if (r.ok) {
        let rows = null;
        try { rows = await r.json(); } catch { /* corps illisible */ }
        if (!Array.isArray(rows)) return echec();
        if (rows.length === 0) { etat.fini = true; return "deja"; }      // déjà réservé ailleurs
      } else if (!(await colonneManquante(r))) {
        return echec();                                                  // 5xx, 429… : rien de réservé
      }
      etat.reserve = true;
      poserMarque(cleLocale);
    }
    // 2) Versement : relire, puis écrire +100
    let rows;
    try {
      const rr = await fetchFn(`${sbUrl}/rest/v1/joueurs?id=eq.${compteId}&select=xp`, { headers: h });
      if (!rr.ok) return echec();
      rows = await rr.json();
    } catch { return echec(); }                                          // rien n'a été écrit
    if (!Array.isArray(rows) || rows.length === 0) { etat.fini = true; return "abandon"; }   // compte introuvable
    const nouvelle = (Number(rows[0].xp) || 0) + XP_BULLE;
    let w;
    try {
      w = await fetchFn(`${sbUrl}/rest/v1/joueurs?id=eq.${compteId}`, {
        method: "PATCH", headers: { ...h, Prefer: "return=minimal" }, body: JSON.stringify({ xp: nouvelle }),
      });
    } catch { etat.fini = true; return "abandon"; }                      // réponse perdue : peut-être écrit → stop
    if (!w.ok) return echec();                                           // refus net : rien d'écrit
    etat.paye = true;
    return "paye";
  } finally {
    etat.enCours = false;
  }
};

// À la fin d'un match il n'y a pas de « lancer suivant » pour réessayer : on réessaie ici, un peu
// plus tard, tant que la réponse est « reessayer » (3 fois au plus, cf. ESSAIS_MAX).
export const verserBonusBulleFinDeMatch = async (opts, { pauseMs = 2500 } = {}) => {
  for (let i = 0; i < ESSAIS_MAX; i++) {
    const r = await verserBonusBulle(opts);
    if (r !== "reessayer") return r;
    await new Promise((res) => setTimeout(res, pauseMs));
  }
  return "abandon";
};
