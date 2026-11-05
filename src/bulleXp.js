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

// L'état d'un match, à garder d'un lancer à l'autre (useRef côté composant).
export const nouvelEtatBulle = () => ({ reserve: false, paye: false, fini: false, enCours: false, essais: 0 });

// cible    : « duels?id=eq.<id> » ou « tournois_potes_matchs?id=eq.<id> » (sans le filtre is.null)
// cleLocale: « dp_bulle_xp_<id du duel> » — la même au 501 et au Cricket pour un même duel
// Renvoie "paye" | "deja" | "reessayer" | "abandon"
export const verserBonusBulle = async ({ fetchFn = globalThis.fetch, sbUrl, sbKey, cible, compteId, cleLocale, etat }) => {
  if (!compteId || etat.paye || etat.fini || etat.enCours) return "deja";
  etat.enCours = true;
  const h = { apikey: sbKey, Authorization: `Bearer ${sbKey}`, "Content-Type": "application/json" };
  const echec = () => { etat.essais++; if (etat.essais >= ESSAIS_MAX) etat.fini = true; return etat.fini ? "abandon" : "reessayer"; };
  try {
    // 1) Réservation (une seule fois par match)
    if (!etat.reserve) {
      if (lireMarque(cleLocale)) { etat.fini = true; return "deja"; }   // ce navigateur l'a déjà réservé/payé
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
