// src/AppArcade.jsx
// ───────────────────────────────────────────────────────────────────────────
// ARCADE — un X01 transformé en jeu d'arcade : cadeaux mystères, pouvoirs,
// bonus, malus et retournements de situation. 2 à 8 joueurs sur un téléphone.
//
// ⚠️ NOM DE TRAVAIL. Le cahier des charges parlait de « Mario Darts », mais
// Champignon / Étoile / Carapace sont des objets Nintendo : tout est codé sous
// des noms NEUTRES dès le départ pour ne pas avoir à renommer cartes,
// animations et textes plus tard. Les mécaniques, elles, sont identiques à la
// demande. Un seul endroit à changer si le nom évolue : JEU ci-dessous.
//
// ── ÉTAPE 1 : LE MOTEUR ──
// Ce fichier contient pour l'instant le X01 complet et fiable : configuration,
// saisie fléchette par fléchette, bust, rotation des joueurs, victoire,
// reprise après fermeture de l'appli, statistiques de fin.
// Les cadeaux et les pouvoirs viendront s'y greffer (étape 2), puis les
// animations (étape 3). C'est l'ordre demandé au point 83 du cahier des
// charges : la stabilité du moteur passe avant les effets.
//
// ⚠️ POURQUOI LA SAISIE EST FLÉCHETTE PAR FLÉCHETTE, et pas un total :
// les cadeaux se gagnent sur un SIMPLE / DOUBLE / TRIPLE d'un numéro précis
// (S18, D18, T18). Sans le secteur ET le multiplicateur de chaque fléchette,
// l'étape 2 serait impossible. Le moteur les enregistre donc dès maintenant.
// ───────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, X, RotateCcw, Trophy } from "lucide-react";
import { FriendNameInput } from "./FriendPicker";

export const JEU = "Arcade";

const C = {
  bg: "#0a0a12", card: "#12121c", card2: "#0b0b12", border: "#26263a",
  text: "#f1f5f9", muted: "#8b93a7", faint: "#4a5468",
  green: "#22c55e", orange: "#f97316", red: "#ef4444",
  violet: "#a78bfa", blue: "#60a5fa", gold: "#fbbf24",
};

const SAUVE = "dp_arcade_partie";
const DEPARTS = [
  { v: 301,  t: "Partie rapide" },
  { v: 501,  t: "Partie classique" },
  { v: 701,  t: "Partie longue" },
  { v: 1001, t: "Partie très longue" },
];
const MIN_PERSO = 101;
const MAX_PERSO = 3001;

// ── Une fléchette ────────────────────────────────────────────────────────────
// { s: secteur 1-20 | 25 (bull) | 0 (raté), m: multiplicateur 1|2|3 }
// Le bull compte comme 25 (simple) ou 50 (double). Un triple bull n'existe pas.
const points = (d) => (d?.s || 0) * (d?.m || 1);
const estDouble = (d) => d?.m === 2 || (d?.s === 25 && d?.m === 2);
const libelle = (d) => {
  if (!d || d.s === 0) return "0";
  if (d.s === 25) return d.m === 2 ? "BULL" : "25";
  return (d.m === 3 ? "T" : d.m === 2 ? "D" : "") + d.s;
};

// ── Résultat d'une volée ─────────────────────────────────────────────────────
// Centralisé ici : c'est LE point où les pouvoirs viendront s'insérer à
// l'étape 2 (multiplicateurs, divisions, annulations). Toute la logique de
// score passe par cette fonction, jamais ailleurs — sinon les effets se
// contrediraient les uns les autres.
const resoudreVolee = (scoreAvant, flechettes, doubleOut) => {
  let score = scoreAvant;
  let bust = false;
  let gagne = false;
  let fait = 0;

  for (const d of flechettes) {
    const p = points(d);
    const reste = score - p;
    fait += p;

    if (reste < 0)                      { bust = true; break; }
    if (reste === 1 && doubleOut)       { bust = true; break; }
    if (reste === 0) {
      // Sortie : en Double Out il faut finir sur un double (bull compris).
      if (doubleOut && !estDouble(d))   { bust = true; break; }
      score = 0; gagne = true; break;
    }
    score = reste;
  }

  // ⚠️ Un bust ANNULE toute la volée : le score revient à sa valeur du début,
  // pas à celle d'avant la dernière fléchette.
  return { score: bust ? scoreAvant : score, bust, gagne, fait: bust ? 0 : fait };
};

// ═══════════════════════════════════════════════════════════════════════════
export const Arcade = ({ setPage, joueur }) => {
  const [etape, setEtape] = useState("config");   // config | jeu | fin
  const [noms, setNoms] = useState(["", ""]);
  const [depart, setDepart] = useState(501);
  const [perso, setPerso] = useState("");
  const [doubleOut, setDoubleOut] = useState(true);

  const [joueurs, setJoueurs] = useState([]);     // { nom, score, volees[], flechettes, total }
  const [actif, setActif] = useState(0);
  const [volee, setVolee] = useState([]);         // fléchettes de la volée en cours
  const [mult, setMult] = useState(1);            // multiplicateur armé au pavé
  const [message, setMessage] = useState(null);   // { texte, ton }
  const [gagnant, setGagnant] = useState(null);
  const [reprise, setReprise] = useState(null);

  // ── Reprise après fermeture de l'appli ────────────────────────────────────
  useEffect(() => {
    try {
      const brut = localStorage.getItem(SAUVE);
      if (brut) {
        const s = JSON.parse(brut);
        if (s?.joueurs?.length && s.etape === "jeu") setReprise(s);
      }
    } catch { /* sauvegarde illisible : on repart de zéro */ }
  }, []);

  // Sauvegarde après CHAQUE changement d'état de jeu (point 79 du cahier des
  // charges). On n'enregistre rien pendant la configuration : une partie non
  // commencée n'a pas à être proposée en reprise.
  useEffect(() => {
    if (etape !== "jeu") return;
    try {
      localStorage.setItem(SAUVE, JSON.stringify({
        etape, joueurs, actif, volee, depart, doubleOut, v: 1,
      }));
    } catch { /* stockage plein ou indisponible */ }
  }, [etape, joueurs, actif, volee, depart, doubleOut]);

  const effacerSauvegarde = () => { try { localStorage.removeItem(SAUVE); } catch { /* ignore */ } };

  // ⚠️ Sur téléphone, valider une volée laisse l'écran au niveau du clavier :
  // le joueur suivant arrive et ne voit PAS son score, qui est remonté hors
  // champ. On ramène donc le haut du jeu à l'écran à chaque changement de tour.
  const hautDuJeu = useRef(null);

  // Remontée automatique à chaque changement de joueur (et au lancement de la
  // partie, qui se fait depuis le bas de l'écran de configuration).
  useEffect(() => {
    if (etape !== "jeu") return;
    try { hautDuJeu.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }
    catch { /* navigateur sans scrollIntoView à options */ }
  }, [etape, actif]);

  const reprendre = () => {
    const s = reprise;
    setJoueurs(s.joueurs); setActif(s.actif); setVolee(s.volee || []);
    setDepart(s.depart); setDoubleOut(s.doubleOut ?? true);
    setReprise(null); setEtape("jeu");
  };

  // ── Démarrage ─────────────────────────────────────────────────────────────
  const scoreDepart = useMemo(() => {
    if (depart !== "perso") return depart;
    const n = parseInt(perso, 10);
    return Number.isFinite(n) ? n : 0;
  }, [depart, perso]);

  const departValide = scoreDepart >= MIN_PERSO && scoreDepart <= MAX_PERSO;
  const nomsRemplis = noms.map((n) => n.trim()).filter(Boolean);
  const peutJouer = nomsRemplis.length >= 2 && departValide;

  const demarrer = () => {
    if (!peutJouer) return;
    setJoueurs(nomsRemplis.map((nom) => ({
      nom, score: scoreDepart, volees: [], flechettes: 0, total: 0, busts: 0,
    })));
    setActif(0); setVolee([]); setMult(1); setGagnant(null); setMessage(null);
    setEtape("jeu");
  };

  // ── Saisie ────────────────────────────────────────────────────────────────
  const ajouter = (s) => {
    if (volee.length >= 3 || gagnant) return;
    // Le bull n'a pas de triple : un T armé sur le bull vaut le double (50).
    const m = s === 25 ? Math.min(mult, 2) : s === 0 ? 1 : mult;
    setVolee((v) => [...v, { s, m }]);
    setMult(1);
  };
  const retirer = () => { if (!gagnant) setVolee((v) => v.slice(0, -1)); };

  const j = joueurs[actif];
  const apercu = useMemo(
    () => (j ? resoudreVolee(j.score, volee, doubleOut) : null),
    [j, volee, doubleOut]
  );

  const validerVolee = () => {
    if (!j || volee.length === 0 || gagnant) return;
    const r = resoudreVolee(j.score, volee, doubleOut);

    const maj = joueurs.map((p, i) => i !== actif ? p : {
      ...p,
      score: r.score,
      volees: [...p.volees, { flechettes: volee, fait: r.fait, bust: r.bust }],
      flechettes: p.flechettes + volee.length,
      total: p.total + r.fait,
      busts: p.busts + (r.bust ? 1 : 0),
    });
    setJoueurs(maj);
    setVolee([]); setMult(1);

    if (r.gagne) {
      setGagnant({ ...maj[actif], index: actif });
      setEtape("fin");
      effacerSauvegarde();
      return;
    }
    setMessage(r.bust ? { texte: "BUST !", ton: "mauvais" } : { texte: `${r.fait} points`, ton: "bon" });
    setTimeout(() => setMessage(null), 1100);
    setActif((a) => (a + 1) % maj.length);
  };

  const quitter = () => { effacerSauvegarde(); setPage("jeux"); };

  const revanche = () => {
    // Point 78 : mêmes joueurs, même score, et c'est un AUTRE qui commence.
    const suivant = ((gagnant?.index ?? 0) + 1) % joueurs.length;
    setJoueurs(joueurs.map((p) => ({ ...p, score: scoreDepart, volees: [], flechettes: 0, total: 0, busts: 0 })));
    setActif(suivant); setVolee([]); setMult(1); setGagnant(null); setMessage(null);
    setEtape("jeu");
  };

  // ══════════════════════════════════════════════════════════════ CONFIG ════
  if (etape === "config") return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, padding: "14px 14px 90px" }}>
      <button onClick={() => setPage("jeux")} style={btnRetour}>
        <ArrowLeft size={16} /> Jeux
      </button>

      <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: -0.5, margin: "14px 0 2px" }}>
        {JEU.toUpperCase()}
      </h1>
      <p style={{ color: C.muted, fontSize: 13.5, margin: "0 0 20px", lineHeight: 1.5 }}>
        Un X01 où tout peut basculer. Tente des cadeaux, récupère des pouvoirs,
        protège-toi et envoie des crasses à tes adversaires.
      </p>

      {reprise && (
        <div style={{ ...bloc, borderColor: C.orange, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Partie en cours</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>
            {reprise.joueurs.map((p) => `${p.nom} ${p.score}`).join(" · ")}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reprendre} style={{ ...btnPlein, flex: 1 }}>Reprendre</button>
            <button onClick={() => { effacerSauvegarde(); setReprise(null); }} style={btnVide}>Abandonner</button>
          </div>
        </div>
      )}

      {/* ── Joueurs ── */}
      <div style={bloc}>
        <div style={titreBloc}>JOUEURS</div>
        {noms.map((n, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div style={pastille}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <FriendNameInput
                value={n}
                onChange={(val) => setNoms((l) => l.map((x, k) => (k === i ? val : x)))}
                placeholder={`Joueur ${i + 1}`}
                joueurId={joueur?.id}
                theme={{ bg: C.card2, border: C.border, text: C.text, muted: C.muted, accent: C.orange, panel: C.card }}
              />
            </div>
            {noms.length > 2 && (
              <button onClick={() => setNoms((l) => l.filter((_, k) => k !== i))}
                aria-label={`Retirer le joueur ${i + 1}`} style={btnIcone}>
                <X size={15} />
              </button>
            )}
          </div>
        ))}
        {noms.length < 8 && (
          <button onClick={() => setNoms((l) => [...l, ""])} style={{ ...btnVide, width: "100%" }}>
            + Ajouter un joueur
          </button>
        )}
      </div>

      {/* ── Score de départ ── */}
      <div style={bloc}>
        <div style={titreBloc}>SCORE DE DÉPART</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {DEPARTS.map(({ v, t }) => (
            <button key={v} onClick={() => setDepart(v)} style={carteChoix(depart === v)}>
              <div style={{ fontSize: 24, fontWeight: 900 }}>{v}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{t}</div>
            </button>
          ))}
          <button onClick={() => setDepart("perso")} style={{ ...carteChoix(depart === "perso"), gridColumn: "1 / -1" }}>
            <div style={{ fontSize: 15, fontWeight: 900 }}>PERSONNALISÉ</div>
          </button>
        </div>
        {depart === "perso" && (
          <div style={{ marginTop: 10 }}>
            <input
              value={perso} onChange={(e) => setPerso(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric" placeholder="Ex : 801"
              style={{ width: "100%", background: C.card2, border: `1px solid ${departValide || !perso ? C.border : C.red}`,
                borderRadius: 12, padding: "12px 14px", color: C.text, fontSize: 18, fontWeight: 800,
                textAlign: "center", outline: "none", boxSizing: "border-box", minHeight: 48 }}
            />
            <div style={{ fontSize: 11, color: perso && !departValide ? C.red : C.faint, marginTop: 5, textAlign: "center" }}>
              Entre {MIN_PERSO} et {MAX_PERSO}
            </div>
          </div>
        )}
      </div>

      {/* ── Fin de partie ── */}
      <div style={bloc}>
        <div style={titreBloc}>FIN DE PARTIE</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button onClick={() => setDoubleOut(true)} style={carteChoix(doubleOut)}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>DOUBLE OUT</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Finir sur un double</div>
          </button>
          <button onClick={() => setDoubleOut(false)} style={carteChoix(!doubleOut)}>
            <div style={{ fontSize: 14, fontWeight: 900 }}>SIMPLE OUT</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>N'importe quelle zone</div>
          </button>
        </div>
      </div>

      <button onClick={demarrer} disabled={!peutJouer}
        style={{ ...btnPlein, width: "100%", marginTop: 4, opacity: peutJouer ? 1 : 0.4, fontSize: 16, minHeight: 54 }}>
        {nomsRemplis.length < 2 ? "Il faut au moins 2 joueurs" : "JOUER"}
      </button>
    </div>
  );

  // ═════════════════════════════════════════════════════════════════ FIN ════
  if (etape === "fin" && gagnant) {
    const moy = gagnant.flechettes > 0 ? (gagnant.total / gagnant.flechettes * 3).toFixed(1) : "0.0";
    const meilleure = Math.max(0, ...gagnant.volees.map((v) => v.fait));
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, padding: "14px 14px 90px" }}>
        <div style={{ textAlign: "center", padding: "36px 0 18px" }}>
          <Trophy size={54} color={C.gold} />
          <div style={{ fontSize: 30, fontWeight: 900, marginTop: 10, color: C.gold }}>VICTOIRE !</div>
          <div style={{ fontSize: 17, marginTop: 6 }}>{gagnant.nom} remporte la course</div>
        </div>

        <div style={bloc}>
          <div style={titreBloc}>STATISTIQUES</div>
          {[
            ["Score de départ", scoreDepart],
            ["Volées", gagnant.volees.length],
            ["Fléchettes", gagnant.flechettes],
            ["Moyenne par volée", moy],
            ["Meilleure volée", meilleure],
            ["Busts", gagnant.busts],
          ].map(([k, v]) => (
            <div key={k} style={ligneStat}>
              <span style={{ color: C.muted, fontSize: 13 }}>{k}</span>
              <span style={{ fontWeight: 800 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={bloc}>
          <div style={titreBloc}>CLASSEMENT</div>
          {[...joueurs].sort((a, b) => a.score - b.score).map((p, i) => (
            <div key={p.nom} style={ligneStat}>
              <span style={{ fontWeight: p.nom === gagnant.nom ? 800 : 500 }}>
                {i + 1}. {p.nom}
              </span>
              <span style={{ color: p.score === 0 ? C.green : C.muted, fontWeight: 800 }}>
                {p.score === 0 ? "🏆" : p.score}
              </span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={revanche} style={{ ...btnPlein, flex: 1 }}>
            <RotateCcw size={15} style={{ verticalAlign: -2, marginRight: 5 }} />Revanche
          </button>
          <button onClick={() => { setEtape("config"); setGagnant(null); }} style={btnVide}>Nouvelle partie</button>
        </div>
        <button onClick={quitter} style={{ ...btnVide, width: "100%", marginTop: 8 }}>Retour aux jeux</button>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════ JEU ════
  return (
    <div ref={hautDuJeu} style={{ minHeight: "100vh", background: C.bg, color: C.text, padding: "10px 12px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={quitter} style={btnRetour}><ArrowLeft size={15} /> Quitter</button>
        <div style={{ fontSize: 11, color: C.faint, fontWeight: 700, letterSpacing: 1 }}>
          {JEU.toUpperCase()} · {scoreDepart} · {doubleOut ? "DOUBLE OUT" : "SIMPLE OUT"}
        </div>
      </div>

      {/* ── Joueur actif ── */}
      <div style={{ ...bloc, textAlign: "center", borderColor: C.orange, marginBottom: 10 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.orange }}>{j?.nom}</div>
        <div style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.05, margin: "2px 0",
          color: apercu?.bust ? C.red : C.text }}>
          {apercu ? apercu.score : j?.score}
        </div>
        {volee.length > 0 && (
          <div style={{ fontSize: 12, color: apercu?.bust ? C.red : C.muted, fontWeight: 700 }}>
            {apercu?.bust ? "BUST — la volée sera annulée" : `${apercu.fait} points cette volée`}
          </div>
        )}
        {/* Les 3 fléchettes */}
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              flex: 1, maxWidth: 90, minHeight: 42, borderRadius: 10,
              border: `1px solid ${volee[i] ? C.orange + "77" : C.border}`,
              background: volee[i] ? C.orange + "18" : C.card2,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 900, fontSize: 16, color: volee[i] ? C.text : C.faint,
            }}>
              {volee[i] ? libelle(volee[i]) : "—"}
            </div>
          ))}
        </div>
      </div>

      {message && (
        <div style={{ textAlign: "center", padding: "8px 0", fontWeight: 900, fontSize: 19,
          color: message.ton === "mauvais" ? C.red : C.green }}>
          {message.texte}
        </div>
      )}

      {/* ── Adversaires ── */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 10 }}>
        {joueurs.map((p, i) => i === actif ? null : (
          <div key={p.nom} style={{ flexShrink: 0, minWidth: 74, background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "7px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 74 }}>{p.nom}</div>
            <div style={{ fontSize: 19, fontWeight: 900 }}>{p.score}</div>
          </div>
        ))}
      </div>

      {/* ── Pavé de saisie ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
        {[[1, "SIMPLE"], [2, "DOUBLE"], [3, "TRIPLE"]].map(([m, lbl]) => (
          <button key={m} onClick={() => setMult((x) => (x === m ? 1 : m))}
            style={{ flex: 1, minHeight: 44, borderRadius: 10, fontWeight: 900, fontSize: 12, cursor: "pointer",
              border: `1px solid ${mult === m ? C.violet : C.border}`,
              background: mult === m ? C.violet + "28" : C.card,
              color: mult === m ? C.violet : C.muted }}>
            {lbl}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
        {Array.from({ length: 20 }, (_, i) => i + 1).map((s) => (
          <button key={s} onClick={() => ajouter(s)} disabled={volee.length >= 3} style={touche(volee.length >= 3)}>
            {s}
          </button>
        ))}
        <button onClick={() => ajouter(25)} disabled={volee.length >= 3}
          style={{ ...touche(volee.length >= 3), gridColumn: "span 2", color: C.red, fontSize: 14 }}>
          BULL
        </button>
        <button onClick={() => ajouter(0)} disabled={volee.length >= 3}
          style={{ ...touche(volee.length >= 3), gridColumn: "span 2", color: C.muted }}>
          RATÉ
        </button>
        <button onClick={retirer} disabled={volee.length === 0}
          style={{ ...touche(volee.length === 0), color: C.orange }} aria-label="Effacer la dernière fléchette">
          ←
        </button>
      </div>

      <button onClick={validerVolee} disabled={volee.length === 0}
        style={{ ...btnPlein, width: "100%", marginTop: 10, minHeight: 52, fontSize: 16,
          opacity: volee.length === 0 ? 0.4 : 1,
          background: apercu?.bust ? C.red : C.orange }}>
        {volee.length === 0 ? "Saisis tes fléchettes"
          : apercu?.gagne ? "🏆 VALIDER LA VICTOIRE"
          : apercu?.bust ? "Valider (bust)"
          : `Valider — ${apercu.fait} pts`}
      </button>
    </div>
  );
};

// ── Styles partagés ──────────────────────────────────────────────────────────
const bloc = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, marginBottom: 12 };
const titreBloc = { fontSize: 10.5, fontWeight: 800, color: C.muted, letterSpacing: 1.2, marginBottom: 10 };
const btnRetour = { display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none",
  color: C.muted, fontSize: 13.5, cursor: "pointer", padding: "6px 0", minHeight: 36 };
const btnPlein = { background: C.orange, color: "#fff", border: "none", borderRadius: 14, padding: "13px 18px",
  fontWeight: 900, fontSize: 14, cursor: "pointer", minHeight: 46 };
const btnVide = { background: "transparent", border: `1px solid ${C.border}`, color: C.muted, borderRadius: 14,
  padding: "13px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", minHeight: 46 };
const btnIcone = { background: "none", border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted,
  cursor: "pointer", minWidth: 40, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" };
const pastille = { width: 26, height: 26, borderRadius: "50%", background: C.card2, border: `1px solid ${C.border}`,
  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.muted, flexShrink: 0 };
const ligneStat = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0",
  borderBottom: `1px solid ${C.border}55` };
const carteChoix = (actif) => ({
  background: actif ? C.orange + "1e" : C.card2, border: `1px solid ${actif ? C.orange : C.border}`,
  borderRadius: 12, padding: "12px 8px", cursor: "pointer", color: C.text, minHeight: 62,
});
const touche = (off) => ({
  minHeight: 46, borderRadius: 10, border: `1px solid ${C.border}`, background: C.card,
  color: C.text, fontWeight: 800, fontSize: 15, cursor: off ? "default" : "pointer", opacity: off ? 0.35 : 1,
});
