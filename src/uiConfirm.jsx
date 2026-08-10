// ═══════════════════════════════════════════════════════════════════════════
//  FENÊTRE DE CONFIRMATION DART POINT
// ═══════════════════════════════════════════════════════════════════════════
//  Remplace window.confirm(), qui a deux gros défauts :
//    1. c'est une boîte grise du navigateur, hors du style de l'appli ;
//    2. certains navigateurs (dont la fenêtre d'aperçu de développement) la
//       BLOQUENT et répondent « Annuler » tout seuls, sans rien afficher →
//       le bouton semble mort alors que le code marche.
//
//  UTILISATION (la fonction attend la réponse, donc `await`) :
//      import { confirmer } from "./uiConfirm.jsx";
//      if (!(await confirmer("Supprimer le tournoi ?", { danger:true }))) return;
//
//  Il faut que <ConfirmHost/> soit monté une seule fois, à la racine de App.
// ═══════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from "react";

// Rempli par <ConfirmHost/> au montage. Tant qu'il est vide, on retombe sur la
// boîte du navigateur : mieux vaut une boîte moche qu'un bouton qui ne fait rien.
let _ouvrir = null;

/**
 * Pose une question à l'utilisateur et attend sa réponse.
 * @param {string} message   Texte de la question. La 1re ligne sert de titre,
 *                           les suivantes de corps (les \n sont respectés).
 * @param {object} [options] { danger:true } → bouton rouge (action destructrice)
 *                           { ok:"…" } / { annuler:"…" } → libellés des boutons
 *                           { titre:"…" } → titre explicite (le message reste entier)
 * @returns {Promise<boolean>} true si l'utilisateur confirme, false sinon.
 */
export function confirmer(message, options = {}) {
  if (typeof _ouvrir !== "function") return Promise.resolve(window.confirm(String(message)));
  return _ouvrir(String(message), options);
}

// Un message est rouge s'il annonce un problème. Détecté tout seul pour que les 41
// appels restent de simples alerter("…") : la couleur ne change rien au fonctionnement.
const ROUGE = /erreur|impossible|échec|echec|❌|⚠|n'a pas|invalide|introuvable|trop lourde|trop long/i;

/**
 * Affiche un message à l'utilisateur (un seul bouton). Remplace alert().
 * @param {string} message   1re ligne = titre, lignes suivantes = corps.
 * @param {object} [options] { danger:true|false } force la couleur ; { ok:"…" } libellé du bouton.
 * @returns {Promise<void>} résolue quand l'utilisateur ferme la fenêtre.
 *          À utiliser avec `await` si la fonction appelante est async (on garde alors
 *          exactement le comportement bloquant de alert()).
 */
export function alerter(message, options = {}) {
  const txt = String(message);
  if (typeof _ouvrir !== "function") { window.alert(txt); return Promise.resolve(); }
  const danger = options.danger !== undefined ? options.danger : ROUGE.test(txt);
  return _ouvrir(txt, { ...options, danger, seulOk: true }).then(() => undefined);
}

const CC = {
  fond: "#13131f", bord: "#1e1e2e", texte: "#e2e8f0", doux: "#94a3b8",
  accent: "#f97316", danger: "#ef4444",
};

export function ConfirmHost() {
  const [demande, setDemande] = useState(null);   // { message, options }
  const repondreRef = useRef(null);               // resolve de la promesse en cours
  const boutonRef = useRef(null);
  const ouvertARef = useRef(0);                   // instant d'ouverture (anti-clic fantôme)

  // Branchement du point d'entrée global, une seule fois.
  useEffect(() => {
    _ouvrir = (message, options) =>
      new Promise((resolve) => {
        // Si une question était déjà ouverte, on y répond « non » avant d'empiler.
        if (repondreRef.current) { const p = repondreRef.current; repondreRef.current = null; p(false); }
        repondreRef.current = resolve;
        ouvertARef.current = (typeof performance !== "undefined" ? performance.now() : Date.now());
        setDemande({ message, options: options || {} });
      });
    return () => { _ouvrir = null; };
  }, []);

  const repondre = useCallback((valeur) => {
    const p = repondreRef.current;
    repondreRef.current = null;
    setDemande(null);
    if (p) p(valeur);
  }, []);

  // ⚠️ CLIC FANTÔME — la cause du bug « il ne me propose pas de publier » (signalé le 07/08/2026).
  // Tous les boutons du scoreur réagissent au `pointerdown` (au moment où le doigt se POSE) pour
  // rester réactifs. Quand ce bouton termine la partie, la question « publier ce match ? » s'ouvre
  // pendant que le doigt est ENCORE POSÉ. Au relâchement, le navigateur envoie quand même son
  // `click`, visé là où le doigt se trouve — donc sur cette fenêtre à peine apparue, qui répondait
  // « Non » toute seule sans que personne ne la voie. D'où l'asymétrie : quand le BOT gagne, la
  // partie se termine sur un minuteur, aucun doigt sur l'écran, et la fenêtre s'affichait bien.
  // On reste donc sourd aux CLICS pendant 400 ms (la carte est encore en animation d'entrée).
  // Échap n'est pas concerné : un clavier ne produit pas de clic fantôme.
  const repondreClic = useCallback((valeur) => {
    const t = (typeof performance !== "undefined" ? performance.now() : Date.now());
    if (t - ouvertARef.current < 400) return;
    repondre(valeur);
  }, [repondre]);

  // Échap = annuler. Actif seulement quand la fenêtre est ouverte.
  useEffect(() => {
    if (!demande) return undefined;
    const onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); repondre(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [demande, repondre]);

  // Le focus part sur « Annuler » : sur une action destructrice, la touche Entrée
  // ne doit jamais valider par accident.
  useEffect(() => { if (demande && boutonRef.current) boutonRef.current.focus(); }, [demande]);

  if (!demande) return null;

  const { message, options } = demande;
  const lignes = String(message).split("\n");
  const titre = options.titre || lignes[0] || "Confirmer";
  const corps = (options.titre ? lignes : lignes.slice(1)).filter((l) => l.trim() !== "");
  const danger = !!options.danger;
  const couleur = danger ? CC.danger : CC.accent;

  return (
    <div
      role="alertdialog" aria-modal="true" aria-labelledby="dp-confirm-titre"
      onClick={(e) => { if (e.target === e.currentTarget) repondreClic(false); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100001,
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "16px 12px calc(16px + env(safe-area-inset-bottom))",
      }}
    >
      <style>{`
        @keyframes dpConfirmMonte { from { opacity:0; transform:translateY(22px); } to { opacity:1; transform:translateY(0); } }
        .dp-confirm-carte { animation: dpConfirmMonte .18s ease-out; }
        @media (prefers-reduced-motion: reduce) { .dp-confirm-carte { animation:none; } }
      `}</style>

      <div className="dp-confirm-carte" style={{
        width: "100%", maxWidth: 440, background: CC.fond,
        border: `1px solid ${CC.bord}`, borderTop: `3px solid ${couleur}`,
        borderRadius: 18, padding: 20, boxShadow: "0 18px 50px rgba(0,0,0,0.7)",
        maxHeight: "80vh", overflowY: "auto",
      }}>
        <div id="dp-confirm-titre" style={{
          fontSize: 16, fontWeight: 800, color: CC.texte, lineHeight: 1.35, marginBottom: corps.length ? 10 : 18,
        }}>{titre}</div>

        {corps.map((ligne, i) => (
          <div key={i} style={{
            fontSize: 13.5, color: CC.doux, lineHeight: 1.6, marginBottom: i === corps.length - 1 ? 18 : 5,
          }}>{ligne}</div>
        ))}

        <div style={{ display: "flex", gap: 10 }}>
          {/* Un simple message (alerter) n'a qu'un bouton : pas de choix à faire. */}
          {!options.seulOk && (
          <button
            ref={boutonRef} onClick={() => repondreClic(false)}
            style={{
              flex: 1, minHeight: 46, background: "none", border: `1px solid ${CC.bord}`,
              color: CC.doux, borderRadius: 11, fontSize: 14, fontWeight: 700,
              cursor: "pointer", touchAction: "manipulation",
            }}
          >{options.annuler || "Annuler"}</button>
          )}
          <button
            ref={options.seulOk ? boutonRef : undefined}
            onClick={() => repondreClic(true)}
            style={{
              flex: 1, minHeight: 46, background: couleur, border: "none",
              color: danger ? "#fff" : "#1a0d00", borderRadius: 11, fontSize: 14, fontWeight: 800,
              cursor: "pointer", touchAction: "manipulation", boxShadow: `0 4px 16px ${couleur}55`,
            }}
          >{options.ok || (options.seulOk ? "OK" : danger ? "Supprimer" : "Confirmer")}</button>
        </div>
      </div>
    </div>
  );
}
