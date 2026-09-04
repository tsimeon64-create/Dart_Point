// src/arcadeTuto.jsx
// ───────────────────────────────────────────────────────────────────────────
// ARCADE — le tutoriel de première utilisation (points 6 à 12 du cahier des
// charges) : six écrans courts, très visuels, sans un seul paragraphe.
//
// ⚠️ Il ne s'ouvre TOUT SEUL qu'une fois. Ensuite le bouton « ? RÈGLES » de
// l'écran de configuration permet de le revoir quand on veut (point 6).
// ───────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { BoiteCadeau, Etincelles, StylesArcade } from "./arcadeEffets";
import { EmoIcon } from "./icons";

const C = {
  bg: "#0a0a12", card: "#12121c", card2: "#0b0b12", border: "#26263a",
  text: "#f1f5f9", muted: "#8b93a7", faint: "#4a5468",
  green: "#22c55e", orange: "#f97316", red: "#ef4444",
  violet: "#a78bfa", blue: "#60a5fa", gold: "#fbbf24",
};

const CLE_TUTO = "dp_arcade_tuto_vu";
export const tutoDejaVu = () => {
  try { return localStorage.getItem(CLE_TUTO) === "1"; } catch { return true; }
};
export const marquerTutoVu = () => {
  try { localStorage.setItem(CLE_TUTO, "1"); } catch { /* ignore */ }
};
export const oublierTuto = () => {
  try { localStorage.removeItem(CLE_TUTO); } catch { /* ignore */ }
};

// ── Une cible stylisée, avec un secteur mis en avant ────────────────────────
const Cible = ({ secteur = 18, taille = 120 }) => (
  <svg viewBox="0 0 100 100" width={taille} height={taille} aria-hidden>
    <circle cx="50" cy="50" r="48" fill="#0b0713" stroke={C.border} strokeWidth="1.5" />
    {Array.from({ length: 20 }, (_, i) => {
      const a1 = (i * 18 - 99) * Math.PI / 180;
      const a2 = ((i + 1) * 18 - 99) * Math.PI / 180;
      // Le secteur mis en avant doit etre celui du haut, sous le numero affiche :
      // a1 part de -99 degres, donc i = 0 est bien la part du haut.
      const vise = i === 0;
      return (
        <path key={i}
          d={`M50 50 L${50 + 46 * Math.cos(a1)} ${50 + 46 * Math.sin(a1)} A46 46 0 0 1 ${50 + 46 * Math.cos(a2)} ${50 + 46 * Math.sin(a2)} Z`}
          fill={vise ? C.violet : i % 2 ? "#16161f" : "#1e1e2a"} opacity={vise ? 0.9 : 1} />
      );
    })}
    <circle cx="50" cy="50" r="30" fill="none" stroke={C.border} strokeWidth="1" />
    <circle cx="50" cy="50" r="16" fill="none" stroke={C.border} strokeWidth="1" />
    <circle cx="50" cy="50" r="6" fill="#166534" />
    <circle cx="50" cy="50" r="2.5" fill={C.red} />
    <text x="50" y="14" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff"
      style={{ fontFamily: "Inter,sans-serif" }}>{secteur}</text>
  </svg>
);

// ── Une fausse carte de pouvoir, juste pour l'illustration ──────────────────
const CarteDemo = ({ icone, nom, couleur }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12,
    background: `linear-gradient(120deg,${couleur}18,${C.card})`, border: `1px solid ${couleur}77`,
  }}>
    <EmoIcon e={icone} size={18} color={couleur} />
    <span style={{ fontWeight: 900, fontSize: 12, color: couleur }}>{nom}</span>
  </div>
);

const Titre = ({ children }) => (
  <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15, margin: "16px 0 8px" }}>{children}</div>
);
const Sous = ({ children }) => (
  <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.5 }}>{children}</div>
);

// ── Les six écrans ──────────────────────────────────────────────────────────
const ECRANS = [
  {
    visuel: (
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", gap: 14, height: 150 }}>
        <Cible secteur={18} taille={110} />
        <div style={{ position: "absolute", right: 14, bottom: 6 }}><BoiteCadeau taille={64} /></div>
        <div style={{ position: "absolute", left: 10, top: 4 }}><BoiteCadeau taille={44} couleur="#f97316" /></div>
      </div>
    ),
    titre: <>BIENVENUE DANS<br />L'ARCADE</>,
    sous: <>Un X01 presque classique…<br />Mais ici, <b style={{ color: "#fff" }}>tout peut basculer</b>.</>,
  },
  {
    visuel: (
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 150 }}>
        <BoiteCadeau taille={104} />
      </div>
    ),
    titre: <>UN CADEAU À CHAQUE TOUR</>,
    sous: (
      <>
        Avant chaque volée, le jeu te donne un numéro à viser.
        <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 12, background: `${C.violet}1e`, border: `1px solid ${C.violet}77` }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>VISE LE 18</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 13 }}>Tu joues normalement. Si tu le touches, tu gagnes un pouvoir.</div>
      </>
    ),
  },
  {
    visuel: (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 150 }}>
        <Cible secteur={18} taille={130} />
      </div>
    ),
    titre: <>PLUS C'EST DUR,<br />PLUS C'EST FORT</>,
    sous: (
      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 4 }}>
        {[["Simple 18", "PETIT CADEAU", C.blue], ["Double 18", "SUPER CADEAU", C.violet], ["Triple 18", "MÉGA CADEAU", C.orange]].map(([g, d, col]) => (
          <div key={g} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "9px 12px", borderRadius: 11, background: C.card2, border: `1px solid ${col}66`,
          }}>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{g}</span>
            <span style={{ fontSize: 12, fontWeight: 900, color: col }}>{d}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    visuel: (
      <div style={{ display: "flex", flexDirection: "column", gap: 7, justifyContent: "center", height: 150, padding: "0 8px" }}>
        <CarteDemo icone="⚡" nom="TURBO ×2" couleur={C.violet} />
        <CarteDemo icone="🛡️" nom="BOUCLIER" couleur={C.blue} />
        <CarteDemo icone="🔥" nom="SUPER TURBO ×3" couleur={C.orange} />
      </div>
    ),
    titre: <>GARDE TES POUVOIRS</>,
    sous: <>Tu peux en stocker <b style={{ color: "#fff" }}>deux</b> et les sortir au meilleur moment. Touche une carte avant de lancer.</>,
  },
  {
    visuel: (
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 150 }}>
        <Etincelles n={10} couleur={C.red} rayon={62} duree={1200} />
        <div style={{ fontSize: 54 }}><EmoIcon e="💣" size={62} color={C.red} /></div>
      </div>
    ),
    titre: <>ATTENTION<br />AUX AUTRES</>,
    sous: <>Certains cadeaux t'aident. D'autres servent à <b style={{ color: "#fff" }}>pourrir gentiment</b> la partie des adversaires.</>,
  },
  {
    visuel: (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 150 }}>
        <div style={{ fontSize: 64, fontWeight: 900, color: C.green, textShadow: `0 0 30px ${C.green}66` }}>0</div>
      </div>
    ),
    titre: <>GAGNE LA COURSE</>,
    sous: <>Arrive exactement à zéro avant les autres. Et garde un œil sur leurs cartes.</>,
  },
];

// ═══════════════════════════════════════════════════════════════════════════
export const TutoArcade = ({ onFermer, auto = false }) => {
  const [i, setI] = useState(0);
  const [nePlus, setNePlus] = useState(true);
  const e = ECRANS[i];
  const dernier = i === ECRANS.length - 1;

  const terminer = () => {
    // ⚠️ Ouvert automatiquement : on ne le retient que si la case est cochée.
    // Ouvert à la demande par « ? RÈGLES », on ne touche à rien — sinon un
    // joueur qui vient relire les règles se les verrait « désapprises ».
    if (auto && nePlus) marquerTutoVu();
    onFermer();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1200, background: C.bg, color: C.text,
      fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column",
      padding: "calc(14px + env(safe-area-inset-top)) 16px calc(14px + env(safe-area-inset-bottom))",
    }}>
      <StylesArcade />

      {/* Progression */}
      <div style={{ display: "flex", gap: 5, marginBottom: 6 }}>
        {ECRANS.map((_, k) => (
          <span key={k} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: k <= i ? C.violet : C.border,
          }} />
        ))}
      </div>
      <button onClick={terminer} style={{
        alignSelf: "flex-end", background: "none", border: "none", color: C.faint,
        fontSize: 13, cursor: "pointer", padding: "6px 2px", minHeight: 36,
      }}>Passer</button>

      {/* Contenu, centré et jamais coupé */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", justifyContent: "center", textAlign: "center" }}>
        <div key={i} style={{ animation: "arcMonte 300ms ease-out both" }}>
          {e.visuel}
          <Titre>{e.titre}</Titre>
          <Sous>{e.sous}</Sous>
        </div>
      </div>

      {dernier && (
        <label style={{
          display: "flex", alignItems: "center", gap: 9, justifyContent: "center",
          color: C.muted, fontSize: 13, margin: "10px 0 12px", cursor: "pointer",
        }}>
          <input type="checkbox" checked={nePlus} onChange={(ev) => setNePlus(ev.target.checked)}
            style={{ width: 18, height: 18, accentColor: C.violet }} />
          Ne plus afficher automatiquement
        </label>
      )}

      <button onClick={() => (dernier ? terminer() : setI(i + 1))} style={{
        width: "100%", minHeight: 54, borderRadius: 15, border: "none", cursor: "pointer",
        background: dernier ? C.orange : `linear-gradient(120deg,${C.violet},#7c3aed)`,
        color: "#fff", fontWeight: 900, fontSize: 16,
      }}>
        {dernier ? "COMMENCER" : "SUIVANT"}
      </button>
    </div>
  );
};
