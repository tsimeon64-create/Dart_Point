import { useState } from "react";
import { statsDepuisManches, statsParMancheDepuisDetail } from "./statsMatch";

// ── LA FICHE DE STATS D'UN MATCH (Comptoir + historique du profil) ───────────
// Deux onglets : « Match » (toute la partie) et « Manche par manche » (une manche à la fois,
// choisie avec des boutons). Les mêmes lignes dans les deux cas.
//   stats / statsManches : déjà calculés et rangés avec la partie (matchs récents) ;
//   sinon on recalcule ce qu'on peut à partir du détail des manches — ce qui demande les volées
//   (First 9, 120+, 170+) ou de savoir qui a commencé (keep/break) reste « — » sur les vieilles
//   parties, et s'affiche normalement sur les nouvelles.
export const PanneauStatsMatch = ({ manches = [], stats = null, statsManches = null, nomA, nomB, couleurA = "#22c55e", couleurB = "#94a3b8" }) => {
  const [onglet, setOnglet] = useState("match");
  const [mancheSel, setMancheSel] = useState(0);
  if (!Array.isArray(manches) || manches.length === 0) return null;

  const duo = Array.isArray(stats) && stats.length >= 2 ? stats : statsDepuisManches(manches, [nomA, nomB]);
  const sa = duo.find((x) => x && x.nom === nomA) || duo[0] || {};
  const sb2 = duo.find((x) => x && x.nom === nomB) || duo[1] || {};
  const parManche = Array.isArray(statsManches) && statsManches.length === manches.length
    ? statsManches
    : statsParMancheDepuisDetail(manches, [nomA, nomB]);
  const idxSel = Math.min(Math.max(0, mancheSel), manches.length - 1);

  const val = (o, f) => { const v = f(o || {}); return (v === null || v === undefined || v === "") ? "—" : v; };
  const pourcent = (o) => (o && o.total ? `${Math.round(o.pct)}% (${o.gagnes}/${o.total})` : null);
  const Ligne = ({ label, lire, a, b, petit = false }) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 118px 1fr", alignItems: "center", padding: petit ? "5px 0" : "6px 0", borderBottom: "1px solid #ffffff0d" }}>
      <div style={{ textAlign: "right", fontSize: petit ? 12.5 : 13, fontWeight: 700, color: "#e2e8f0" }}>{val(a, lire)}</div>
      <div style={{ textAlign: "center", fontSize: petit ? 10 : 10.5, color: "#64748b" }}>{label}</div>
      <div style={{ textAlign: "left", fontSize: petit ? 12.5 : 13, fontWeight: 700, color: "#e2e8f0" }}>{val(b, lire)}</div>
    </div>
  );
  const EnTete = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 118px 1fr", marginBottom: 5 }}>
      <div style={{ textAlign: "right", fontWeight: 800, fontSize: 12, color: couleurA }}>{nomA}</div>
      <div />
      <div style={{ textAlign: "left", fontWeight: 800, fontSize: 12, color: couleurB }}>{nomB}</div>
    </div>
  );

  // Les tranches de volées, mêmes libellés dans les deux onglets.
  const TRANCHES = [["60+", (o) => o.p60], ["80+", (o) => o.p80], ["100+", (o) => o.p100],
    ["120+", (o) => o.p120], ["140+", (o) => o.p140], ["170+", (o) => o.p170], ["180", (o) => o.p180]];
  const incomplet = sa.first9 === null || sa.first9 === undefined;

  return (
    <div style={{ marginTop: 10, background: "#0b0b12", border: "1px solid #ffffff12", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, background: "#15151c", borderRadius: 10, padding: 4, border: "1px solid #ffffff10" }}>
        {[["match", "🏆 Match"], ["manches", "🎯 Manche par manche"]].map(([cle, libelle]) => {
          const actif = onglet === cle;
          return (
            <button key={cle} onClick={() => setOnglet(cle)} style={{ flex: 1, background: actif ? "#fbbf24" : "transparent",
              color: actif ? "#0f0f0f" : "#94a3b8", WebkitTextFillColor: actif ? "#0f0f0f" : "#94a3b8",
              border: "none", borderRadius: 8, padding: "7px 4px", fontWeight: 800, fontSize: 11.5, cursor: "pointer", touchAction: "manipulation" }}>{libelle}</button>
          );
        })}
      </div>

      {onglet === "match" ? (<>
        <EnTete />
        <Ligne label="Manches" lire={(o) => o.manchesGagnees} a={sa} b={sb2} />
        <Ligne label="Moyenne" lire={(o) => o.moyenne || null} a={sa} b={sb2} />
        <Ligne label="First 9" lire={(o) => o.first9 || null} a={sa} b={sb2} />
        <Ligne label="Fléchettes" lire={(o) => o.flechettes || null} a={sa} b={sb2} />
        <Ligne label="Volées" lire={(o) => o.volees || null} a={sa} b={sb2} />
        <Ligne label="Meilleure volée" lire={(o) => o.meilleureVolee || null} a={sa} b={sb2} />
        {TRANCHES.map(([label, lire]) => <Ligne key={label} label={label} lire={lire} a={sa} b={sb2} />)}
        <Ligne label="Plus gros finish" lire={(o) => o.highFinish || null} a={sa} b={sb2} />
        <Ligne label="Finishs 100+" lire={(o) => o.finishs100} a={sa} b={sb2} />
        <Ligne label="Meilleure manche" lire={(o) => (o.meilleureManche ? `${o.meilleureManche} fléch.` : null)} a={sa} b={sb2} />
        <Ligne label="Pire manche" lire={(o) => (o.pireManche ? `${o.pireManche} fléch.` : null)} a={sa} b={sb2} />
        <Ligne label="Checkout" lire={(o) => (o.checkout && o.checkout.tentatives ? `${Math.round(o.checkout.pct)}% (${o.checkout.reussis}/${o.checkout.tentatives})` : null)} a={sa} b={sb2} />
        <Ligne label="Keep" lire={(o) => pourcent(o.keep)} a={sa} b={sb2} />
        <Ligne label="Break" lire={(o) => pourcent(o.brk)} a={sa} b={sb2} />
        {incomplet && (
          <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 9, lineHeight: 1.5 }}>
            First 9, 120+, 170+, Keep et Break n&apos;étaient pas enregistrés pour cette partie :
            ils apparaissent sur les matchs joués à partir d&apos;octobre 2026.
          </div>
        )}
      </>) : (<>
        {manches.length > 1 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {manches.map((m, i) => {
              const actif = i === idxSel;
              return (
                <button key={i} onClick={() => setMancheSel(i)} style={{ flex: "1 1 auto", minWidth: 78,
                  background: actif ? "#fbbf2422" : "#15151c", border: `1px solid ${actif ? "#fbbf2488" : "#ffffff12"}`,
                  color: actif ? "#fbbf24" : "#94a3b8", WebkitTextFillColor: actif ? "#fbbf24" : "#94a3b8",
                  borderRadius: 8, padding: "7px 6px", fontWeight: 800, fontSize: 11.5, cursor: "pointer", touchAction: "manipulation" }}>
                  Manche {i + 1}
                </button>
              );
            })}
          </div>
        )}
        {(() => {
          const m = manches[idxSel] || {};
          const duoM = parManche[idxSel] || [];
          const ma = duoM.find((x) => x && x.nom === nomA) || duoM[0] || {};
          const mb = duoM.find((x) => x && x.nom === nomB) || duoM[1] || {};
          return (
            <div style={{ background: "#0f0f17", border: "1px solid #ffffff0d", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#fbbf24", marginBottom: 7, textAlign: "center" }}>
                Manche {idxSel + 1} — gagnée par {m.winner || "?"}
              </div>
              <EnTete />
              <Ligne petit label="Moyenne" lire={(o) => o.moyenne || null} a={ma} b={mb} />
              <Ligne petit label="First 9" lire={(o) => o.first9 || null} a={ma} b={mb} />
              <Ligne petit label="Fléchettes" lire={(o) => o.flechettes || null} a={ma} b={mb} />
              <Ligne petit label="Volées" lire={(o) => o.volees || null} a={ma} b={mb} />
              <Ligne petit label="Meilleure volée" lire={(o) => o.meilleureVolee || null} a={ma} b={mb} />
              {TRANCHES.map(([label, lire]) => <Ligne petit key={label} label={label} lire={lire} a={ma} b={mb} />)}
              <Ligne petit label="Checkout" lire={(o) => (o.checkout && o.checkout.tentatives ? `${o.checkout.reussis}/${o.checkout.tentatives}` : null)} a={ma} b={mb} />
              <Ligne petit label="Fin de manche" lire={(o) => (o.finish ? `finish ${o.finish}` : (o.reste ? `reste ${o.reste}` : null))} a={ma} b={mb} />
            </div>
          );
        })()}
      </>)}
    </div>
  );
};
