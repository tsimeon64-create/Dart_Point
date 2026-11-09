import { useState, useEffect } from "react";
import { EmoIcon } from "./icons";

// ── PARTAGER UNE PARTIE AU COMPTOIR (partie libre, Cricket libre, mini-jeux) ───
// Demande de Thomas (nov. 2026) : « quand on joue une partie libre ou un jeu comme le Capital,
// je veux le bouton Partager sur le Comptoir ». Un seul format pour tous les jeux, une seule
// carte pour l'afficher (PartiePost dans App.jsx) :
//
//   contenu = "__PARTIE__|" + JSON {
//     v: 1, jeu: "x01" | "cricket" | "capital" | "double-down" | "touche-coule" | "horloge-double",
//     titre: "501",                       nom du jeu affiché
//     details: "Premier à 2 manches · Double out",   (facultatif)
//     classement: [{ nom, score, unite?, detail?, gagnant? }],   du meilleur au moins bon
//     faits: [{ label, valeur }],         2 à 4 chiffres marquants (facultatif)
//     manches?, stats?                    x01 à 2 joueurs : la fiche « Plus de stats »
//   }
//
// Comme le partage d'un match contre un bot, la publication s'écrit directement dans
// wall_posts (seuls j'aime et commentaires passent par la fonction Edge « wall »).

export const PREFIXE_PARTIE = "__PARTIE__|";

const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";

// Lit le JSON d'une carte « partie » ; null si ce n'en est pas une ou si elle est illisible.
export const lirePartie = (contenu) => {
  if (!contenu || !String(contenu).startsWith(PREFIXE_PARTIE)) return null;
  try {
    const d = JSON.parse(String(contenu).slice(PREFIXE_PARTIE.length));
    return d && Array.isArray(d.classement) ? d : null;
  } catch { return null; }
};

export const publierPartie = async (joueur, partie) => {
  const r = await fetch(`${SB_URL}/rest/v1/wall_posts`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      joueur_id: joueur.id, joueur_pseudo: joueur.pseudo, joueur_photo: joueur.photo || null,
      contenu: PREFIXE_PARTIE + JSON.stringify({ v: 1, ...partie }),
      date: Date.now(),
    }),
  });
  if (!r.ok) throw new Error(String(r.status));
};

// ⚠️ Le body impose -webkit-text-fill-color : une couleur ne s'affiche qu'avec WebkitTextFillColor.
const enCouleur = (c) => ({ color: c, WebkitTextFillColor: c });

// Le bouton, à poser sur l'écran de fin d'un jeu.
//   construire : () => la partie (voir le format plus haut), appelée AU CLIC (données à jour)
//   cle        : change à chaque nouvelle partie → le bouton redevient « Partager »
export const BoutonPartagerComptoir = ({ joueur, construire, cle = null, style = null }) => {
  const [etat, setEtat] = useState("attente");   // attente | envoi | publie | erreur
  useEffect(() => { setEtat("attente"); }, [cle]);

  if (!joueur?.id) {
    return (
      <div style={{ textAlign: "center", fontSize: 12, padding: "8px 0", ...enCouleur("#64748b"), ...style }}>
        Connecte-toi pour partager ta partie au Comptoir
      </div>
    );
  }
  const partager = async () => {
    if (etat === "envoi" || etat === "publie") return;
    let partie = null;
    try { partie = construire(); } catch { partie = null; }
    if (!partie || !Array.isArray(partie.classement) || partie.classement.length === 0) { setEtat("erreur"); return; }
    setEtat("envoi");
    try {
      await publierPartie(joueur, partie);
      setEtat("publie");
      window.dpToast?.("Partie partagée au Comptoir 🍻", "success");
    } catch {
      setEtat("erreur");
      window.dpToast?.("Le partage n'a pas marché. Réessaie dans un instant.", "error");
    }
  };
  const publie = etat === "publie";
  const libelle = publie ? "Partagée au Comptoir" : etat === "envoi" ? "Partage…" : etat === "erreur" ? "Réessayer le partage" : "Partager au Comptoir";
  return (
    <button onClick={partager} disabled={etat === "envoi" || publie}
      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 14px", borderRadius: 12,
        cursor: etat === "envoi" || publie ? "default" : "pointer", touchAction: "manipulation", fontWeight: 800, fontSize: 14,
        border: `1px solid ${publie ? "#22c55e77" : "#f9731677"}`,
        background: publie ? "#0a1a0a" : "linear-gradient(135deg,#1a0f00,#241300)",
        ...enCouleur(publie ? "#22c55e" : etat === "erreur" ? "#f87171" : "#f97316"), ...style }}>
      <EmoIcon e={publie ? "✅" : "🍻"} size={16}/>
      <span>{libelle}</span>
    </button>
  );
};
