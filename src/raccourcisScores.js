// src/raccourcisScores.js — Raccourcis du scoreur (26, 45, 60…) PERSONNALISÉS
//
// Chaque joueur inscrit voit SES 8 scores les plus fréquents (tirés de ses 600 dernières
// volées dans live_volees) au lieu des 8 scores fixes. Un invité, un bot, une équipe de
// doublette ou un joueur qui a encore peu joué garde la rangée par défaut.
//
// ⚠️ La rangée ne bouge PAS pendant une partie : elle est figée au premier affichage du
// joueur (ce qui avait été mis de côté la fois d'avant, dans localStorage). La lecture
// fraîche est rangée pour la partie SUIVANTE (revanche comprise). Toute première fois
// (rien de côté) : la rangée par défaut, remplacée dès que la base répond — quelques
// dixièmes de seconde, avant le premier lancer.
import { useEffect, useRef, useState } from "react";

export const RACCOURCIS_DEFAUT = [26, 45, 60, 81, 100, 121, 140, 180];
export const MIN_VOLEES = 30;   // en dessous, pas assez de volées pour savoir ce qu'il marque
const NB = 8;
const DEPARTS = [301, 501, 701, 1001];   // score de départ d'une manche (701 = barrage de tournoi)

// PURE : lignes de live_volees d'UN joueur → les scores de ses vraies volées de SCORING.
// Deux scoreurs écrivent dans cette table, avec deux encodages différents :
//  - scoreur de l'appli : bust = score -1 (reste inchangé), finish = reste 0 ;
//  - « Jouer en ligne » : bust = le score tapé AVEC le reste inchangé, finish = reste égal au
//    nombre de fléchettes (1 à 3, voir onlineGame.js).
// Le test qui marche pour les deux : une vraie volée fait baisser le reste d'EXACTEMENT son
// score. « Reste d'avant » = celui d'une des 2 volées précédentes du joueur dans la même partie
// (une volée annulée avec « Retour » peut être restée en base) ou le score de départ d'une manche.
// Un finish est écarté exprès : il dépend de ce qui reste, pas des habitudes du joueur.
export function voleesDeScoring(rows) {
  const parSession = {};
  for (const r of rows || []) {
    if (!r || r.session_id == null) continue;
    (parSession[r.session_id] || (parSession[r.session_id] = [])).push(r);
  }
  const out = [];
  for (const liste of Object.values(parSession)) {
    liste.sort((a, b) => (Number(a.numero_volee) || 0) - (Number(b.numero_volee) || 0));
    liste.forEach((r, i) => {
      const s = Number(r.score), reste = Number(r.reste);
      // bust de l'appli (-1), no score (0), finish de l'appli (reste 0), valeurs impossibles
      if (!Number.isInteger(s) || s <= 0 || s > 180 || !Number.isFinite(reste) || reste <= 0) return;
      const avant = reste + s;
      const precedents = liste.slice(Math.max(0, i - 2), i).map((p) => Number(p.reste));
      if (precedents.includes(avant) || DEPARTS.includes(avant)) out.push(s);
    });
  }
  return out;
}

// PURE : scores de scoring → les 8 plus fréquents, rangés du plus petit au plus grand
// (l'ordre croissant garde les boutons à une place prévisible). null = pas assez de données.
export function calculerRaccourcis(scores) {
  const ok = (scores || []).map(Number).filter((s) => Number.isInteger(s) && s > 0 && s <= 180);
  if (ok.length < MIN_VOLEES) return null;
  const f = {};
  for (const s of ok) f[s] = (f[s] || 0) + 1;
  // À fréquence égale, le plus gros score passe devant.
  const top = Object.keys(f).map(Number).sort((a, b) => f[b] - f[a] || b - a).slice(0, NB);
  // Joueur très régulier (moins de 8 scores différents) : on complète avec la rangée par défaut.
  for (const d of RACCOURCIS_DEFAUT) { if (top.length >= NB) break; if (!top.includes(d)) top.push(d); }
  return top.sort((a, b) => a - b);
}

const estUuid = (s) => typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const cleLS = (id) => "dp_raccourcis_" + id;
const valide = (v) => Array.isArray(v) && v.length === NB && v.every((n) => Number.isInteger(n) && n > 0 && n <= 180);
const lireCache = (id) => { try { const v = JSON.parse(localStorage.getItem(cleLS(id)) || "null"); return valide(v) ? v : null; } catch { return null; } };
const ecrireCache = (id, liste) => {
  try { if (liste) localStorage.setItem(cleLS(id), JSON.stringify(liste)); else localStorage.removeItem(cleLS(id)); }
  catch { /* stockage indisponible : la rangée reste celle du moment */ }
};

// Les 600 dernières volées d'un joueur → sa rangée (null si trop peu de volées de scoring).
// Toutes les lignes, busts compris : il faut la suite des « restes » pour trier.
export async function chargerRaccourcis(id, lire) {
  const rows = await lire(`live_volees?joueur_id=eq.${id}&order=date.desc&limit=600&select=session_id,numero_volee,score,reste`);
  return calculerRaccourcis(voleesDeScoring(rows));
}

// Partie libre : on TAPE des noms. Un nom identique au pseudo d'un inscrit → son compte.
// Guillemets obligatoires : un pseudo peut contenir une virgule, une parenthèse, un emoji.
async function comptesParPseudo(pseudos, lire) {
  const liste = pseudos.map((p) => `"${String(p).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",");
  const rows = await lire(`joueurs?pseudo=in.(${encodeURIComponent(liste)})&select=id,pseudo`);
  const m = {};
  (rows || []).forEach((r) => { if (r?.pseudo && r?.id) m[r.pseudo] = String(r.id); });
  return m;
}

// sieges : un objet par joueur du scoreur, dans l'ordre — { id } quand le compte est connu,
// { pseudo } pour un nom tapé (partie libre), { bot:true } pour le bot (il tape tout seul),
// {} pour une place sans compte (équipe, invité).
// lire(chemin) : lecture PostgREST fournie par le scoreur (renvoie le JSON).
// clePartie : change à chaque nouvelle partie (revanche comprise) → rangées refigées.
// Renvoie un tableau aligné sur les sièges : la rangée de chacun (toujours 8 scores).
export function useRaccourcis(sieges, lire, clePartie = "") {
  const liste = sieges || [];
  const clePseudos = liste.filter((s) => s && !s.bot && !s.id && s.pseudo).map((s) => s.pseudo).join("");
  const [parPseudo, setParPseudo] = useState({});   // pseudo tapé → id du compte
  const [frais, setFrais] = useState({});           // id → rangée lue en base (sert quand rien n'était de côté)

  const idDe = (s) => (!s || s.bot ? null : (s.id ? String(s.id) : (s.pseudo && parPseudo[s.pseudo]) || null));
  const ids = [...new Set(liste.map(idDe).filter(estUuid))];
  const cleIds = ids.join(",");

  // Rangée FIGÉE par joueur pour cette partie : le cache est lu une seule fois par joueur,
  // à sa première apparition. Un joueur reconnu plus tard (pseudo) ne fait pas relire les autres.
  // (Pas de compilateur React dans ce projet : lire/écrire ce ref pendant le rendu est sans risque.)
  const fige = useRef({ partie: null, rangs: {} });
  /* eslint-disable react-hooks/refs */
  if (fige.current.partie !== clePartie) fige.current = { partie: clePartie, rangs: {} };
  ids.forEach((id) => { if (!(id in fige.current.rangs)) fige.current.rangs[id] = lireCache(id); });
  const rangs = fige.current.rangs;
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (!clePseudos) return;
    comptesParPseudo(clePseudos.split(""), lire)
      .then((m) => setParPseudo(m))
      .catch(() => { /* pas de compte trouvé : rangée par défaut */ });
  }, [clePseudos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Une lecture fraîche par joueur et par partie (même si la liste des joueurs change en route).
  const lus = useRef(new Set());
  useEffect(() => {
    cleIds.split(",").filter(Boolean).forEach((id) => {
      const k = clePartie + "|" + id;
      if (lus.current.has(k)) return;
      lus.current.add(k);
      chargerRaccourcis(id, lire)
        .then((r) => { ecrireCache(id, r); if (r) setFrais((m) => ({ ...m, [id]: r })); })
        .catch(() => { lus.current.delete(k); /* réseau : on réessaiera */ });
    });
  }, [cleIds, clePartie]); // eslint-disable-line react-hooks/exhaustive-deps

  return liste.map((s) => {
    const id = idDe(s);
    return (id && (rangs[id] || frais[id])) || RACCOURCIS_DEFAUT;
  });
}
