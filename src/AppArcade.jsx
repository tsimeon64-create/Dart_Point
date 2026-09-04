// src/AppArcade.jsx
// ───────────────────────────────────────────────────────────────────────────
// ARCADE — un X01 transformé en jeu d'arcade : cadeaux mystères, pouvoirs,
// bonus, malus et retournements de situation. 2 à 8 joueurs sur un téléphone.
//
// ⚠️ NOM DE TRAVAIL. Le cahier des charges parlait de « Mario Darts », mais
// Champignon / Étoile / Carapace sont des objets Nintendo : tout est codé sous
// des noms NEUTRES dès le départ pour ne pas avoir à renommer cartes,
// animations et textes plus tard. Un seul endroit à changer : JEU ci-dessous.
//
// ── OÙ EST QUOI ──
// arcadePouvoirs.js : TOUTES les règles (score, effets, cadeaux, tirages).
//                     Fonctions pures, testées à part.
// ce fichier        : uniquement l'écran et l'enchaînement des tours.
//
// ⚠️ Aucun calcul de score ici. resoudreVolee() est le seul endroit qui retire
// des points : c'est ce qui garantit l'ordre de priorité du point 38 et évite
// que deux effets se contredisent.
//
// ── OÙ SONT LES EFFETS ──
// arcadeEffets.jsx : boîte cadeau, explosions, particules, flashs, vibrations.
// arcadeTuto.jsx   : le tutoriel en six écrans.
// Rien de tout cela ne connaît les règles : on peut couper les animations sans
// toucher au jeu, et changer une règle sans casser une animation.
// ───────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, X, RotateCcw, Trophy, HelpCircle } from "lucide-react";
import { FriendNameInput } from "./FriendPicker";
import { EmoIcon } from "./icons";
import { ConfettiBurst } from "./DPLottie";
import confettiData from "./lottie/confetti.json";
import {
  StylesArcade, Explosion, FlashEcran, BoiteCadeau, Tampon,
  Projectile, useSecousse, Bulle, vibrer, vibrationsActives, reglerVibrations,
  aideDejaVue, marquerAideVue, oublierLesAides,
} from "./arcadeEffets";
import { TutoArcade, tutoDejaVu } from "./arcadeTuto";
import {
  POUVOIRS, RARETES, NUMEROS_CADEAU, MAX_POUVOIRS, EST_MALUS,
  resoudreVolee, cadeauDeLaVolee, tirerCadeau, tirerPouvoir,
  envoyerMalus, passerLesProtections, pourquoiImpossible, retraitAutorise,
  rangDuJoueur, nouveauJoueur, titresDeFin, libelle,
} from "./arcadePouvoirs";

export const JEU = "Arcade";

const C = {
  bg: "#0a0a12", card: "#12121c", card2: "#0b0b12", border: "#26263a",
  text: "#f1f5f9", muted: "#8b93a7", faint: "#4a5468",
  green: "#22c55e", orange: "#f97316", red: "#ef4444",
  violet: "#a78bfa", blue: "#60a5fa", gold: "#fbbf24",
};

const SAUVE = "dp_arcade_partie";
const VERSION_SAUVE = 2;
const DEPARTS = [
  { v: 301,  t: "Partie rapide" },
  { v: 501,  t: "Partie classique" },
  { v: 701,  t: "Partie longue" },
  { v: 1001, t: "Partie très longue" },
];
const MIN_PERSO = 101;
const MAX_PERSO = 3001;

const hasard = (liste) => liste[Math.floor(Math.random() * liste.length)];

// ── Carte de pouvoir ───────────────────────────────────────────────
// ⚠️ Le « ? » est un bouton à part, posé À CÔTÉ de la carte et non dedans :
// un <button> dans un <button> est du HTML invalide, et le navigateur avale
// alors un clic sur deux.
const CartePouvoir = ({ id, onClick, onAide, petite = false, desactive = false, raison = null }) => {
  const p = POUVOIRS[id];
  if (!p) return null;
  const col = RARETES[p.rarete].couleur;
  const inerte = desactive || !onClick;
  return (
    <div style={{
      display: "flex", alignItems: "stretch", width: "100%",
      background: `linear-gradient(120deg,${col}14,${C.card})`,
      border: `1px solid ${col}${p.rarete === "legendaire" ? "cc" : "66"}`,
      borderRadius: 14, overflow: "hidden", opacity: desactive ? 0.45 : 1,
      boxShadow: p.rarete === "legendaire" ? `0 0 18px ${col}44` : "none",
    }}>
      <button
        type="button" onClick={inerte ? undefined : onClick} disabled={inerte}
        style={{
          flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10,
          textAlign: "left", background: "none", border: "none", font: "inherit",
          color: C.text, padding: petite ? "8px 10px" : "11px 12px",
          cursor: inerte ? "default" : "pointer",
        }}
      >
        <span style={{ flexShrink: 0, display: "flex" }}>
          <EmoIcon e={p.icone} size={petite ? 20 : 26} color={col} strokeWidth={2.2} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 900, fontSize: petite ? 12 : 13.5, color: col }}>{p.nom}</span>
          <span style={{ display: "block", fontSize: petite ? 10.5 : 12, color: C.muted, lineHeight: 1.35 }}>
            {raison || p.texte}
          </span>
        </span>
      </button>
      {onAide && (
        <button type="button" onClick={() => onAide(id)}
          aria-label={`Comment marche ${p.nom} ?`}
          style={{ background: "none", border: "none", borderLeft: `1px solid ${col}33`,
            color: C.faint, cursor: "pointer", padding: "0 10px", display: "flex",
            alignItems: "center", flexShrink: 0 }}>
          <HelpCircle size={16} />
        </button>
      )}
    </div>
  );
};

// ── Révélation d'un cadeau (points 47 à 50) ─────────────────────────────────
// La boîte arrive, tremble, puis explose et laisse la carte. Plus le cadeau est
// rare, plus l'attente est longue et l'explosion forte — c'est TOUT l'intérêt
// du système : un méga doit se faire attendre (point 82).
// Durées du point 72 : petit 0,8 s · super 1,2 s · méga 1,8 s · légendaire 2,5 s.
const ATTENTE = { petit: 260, super: 430, mega: 700, legendaire: 1100 };
const NIVEAU  = { petit: 1, super: 2, mega: 3, legendaire: 4 };

const Revelation = ({ cadeau }) => {
  const [ouvert, setOuvert] = useState(false);
  const col = RARETES[cadeau.rarete].couleur;
  const attente = ATTENTE[cadeau.rarete] || 300;

  useEffect(() => {
    const t = setTimeout(() => setOuvert(true), attente);
    return () => clearTimeout(t);
  }, [attente]);

  return (
    // Toucher accélère : le point 72 l'exige pour les animations longues.
    // ⚠️ overflow caché : une explosion de niveau 3 ou 4 mesure jusqu'à 320 px et
    // débordait de la fenêtre, ce qui faisait apparaître une barre de défilement
    // horizontale en plein moment fort.
    <div onClick={() => setOuvert(true)} style={{
      position: "relative", marginBottom: 12, cursor: "pointer",
      overflow: "hidden", borderRadius: 16, minHeight: ouvert ? 0 : 96,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    }}>
      {/* L'explosion passe PAR-DESSUS la carte au lieu de laisser un trou vide
          là où était la boîte. */}
      {ouvert && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <Explosion niveau={NIVEAU[cadeau.rarete] || 1} couleur={col} />
        </div>
      )}

      {!ouvert && <BoiteCadeau taille={84} couleur={col} etat={cadeau.rarete === "petit" ? "arrive" : "tremble"} />}

      {ouvert && (
        <div className="arc-anim" style={{ width: "100%", animation: "arcCarte 420ms cubic-bezier(.2,1.4,.4,1) both" }}>
          <div style={{
            fontSize: cadeau.rarete === "legendaire" ? 16 : 13, fontWeight: 900, color: col,
            marginBottom: 6, letterSpacing: 0.5,
            textShadow: NIVEAU[cadeau.rarete] >= 3 ? `0 0 18px ${col}` : "none",
          }}>{RARETES[cadeau.rarete].nom}</div>
          <CartePouvoir id={cadeau.id} />
        </div>
      )}
    </div>
  );
};

// ── Emplacement d'inventaire vide ────────────────────────────────────────────
const SlotVide = () => (
  <div style={{ flex: 1, minHeight: 44, borderRadius: 14, border: `1px dashed ${C.border}`,
    display: "flex", alignItems: "center", justifyContent: "center",
    color: C.faint, fontSize: 11, fontWeight: 700 }}>
    vide
  </div>
);

// ── Badge d'effet actif ──────────────────────────────────────────────────────
const BadgeEffet = ({ e }) => {
  const p = POUVOIRS[e.id];
  if (!p) return null;
  const mauvais = !!EST_MALUS[e.id];
  const col = mauvais ? C.red : C.green;
  const suffixe = e.id === "verrouillage" ? ` ${e.num}` : e.id === "jackpot" ? ` ×${e.x}` : "";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4,
      background: col + "1e", border: `1px solid ${col}66`, color: col,
      borderRadius: 8, padding: "3px 7px", fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" }}>
      <EmoIcon e={p.icone} size={11} color={col} /> {p.nom}{suffixe}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
export const Arcade = ({ setPage, joueur }) => {
  const [etape, setEtape] = useState("config");   // config | jeu | fin
  const [noms, setNoms] = useState(["", ""]);
  const [depart, setDepart] = useState(501);
  const [perso, setPerso] = useState("");
  const [doubleOut, setDoubleOut] = useState(true);

  const [joueurs, setJoueurs] = useState([]);
  const [actif, setActif] = useState(0);
  // ⚠️ Plus d'écran de choix « Tenter un cadeau / Jouer normalement » : le cadeau
  // est TOUJOURS en jeu. Une fenêtre annonce le numéro au début du tour, puis il
  // reste rappelé à côté du score. Le joueur arrive donc directement au clavier.
  const [cadeauNum, setCadeauNum] = useState(null);
  const [volee, setVolee] = useState([]);
  const [mult, setMult] = useState(1);
  const [message, setMessage] = useState(null);   // { texte, ton }
  const [panneau, setPanneau] = useState(null);   // fenêtre par-dessus le jeu
  // ⚠️ Ce qu'il reste à faire APRÈS la fenêtre de résumé. Uniquement des données
  // (jamais de fonction) : c'est ce qui permet de l'enregistrer et de reprendre
  // exactement au même endroit si l'appli se ferme pendant que la fenêtre est
  // ouverte. Sinon le joueur rejouait sa volée et perdait son cadeau.
  const [enAttente, setEnAttente] = useState(null);
  // Ce qui vient de se passer, repris en une ligne dans la fenêtre du joueur
  // suivant : sans ça, un « cadeau raté » n'était jamais lu — la main change
  // immédiatement après la volée et efface le bandeau.
  const [dernierTour, setDernierTour] = useState(null);
  const [gagnant, setGagnant] = useState(null);
  const [reprise, setReprise] = useState(null);
  const [confirmQuit, setConfirmQuit] = useState(false);

  // ── Étape 3 : le décor ──
  const [tuto, setTuto] = useState(null);        // { auto } quand le tutoriel est ouvert
  const [bulle, setBulle] = useState(null);      // { cle, texte } aide contextuelle
  const [effet, setEffet] = useState(null);      // { type, ... } animation en cours
  const [confettis, setConfettis] = useState(false);
  const [vibOn, setVibOn] = useState(vibrationsActives);
  const [styleSecousse, secouer] = useSecousse();

  // Le tutoriel s'ouvre TOUT SEUL une seule fois (point 6).
  useEffect(() => { if (!tutoDejaVu()) setTuto({ auto: true }); }, []);

  // Une explication ne s'affiche qu'une fois par joueur (point 14).
  const aider = (cle, texte) => {
    if (aideDejaVue(cle)) return;
    setBulle({ cle, texte });
  };

  // Une animation courte, qui se retire toute seule.
  const jouerEffet = (e, ms = 900) => {
    setEffet(e);
    setTimeout(() => setEffet((x) => (x === e ? null : x)), ms);
  };

  // ── Reprise après fermeture de l'appli (point 79) ─────────────────────────
  useEffect(() => {
    try {
      const brut = localStorage.getItem(SAUVE);
      if (!brut) return;
      const s = JSON.parse(brut);
      if (!s?.joueurs?.length || s.etape !== "jeu") return;
      // Une sauvegarde de l'étape 1 n'a ni pouvoirs ni effets : on la complète
      // au lieu de la jeter, sinon la partie en cours disparaît sans prévenir.
      s.joueurs = s.joueurs.map((p) => ({ ...nouveauJoueur(p.nom, p.score), ...p,
        pouvoirs: p.pouvoirs || [], effets: p.effets || [],
        stats: { ...nouveauJoueur(p.nom, p.score).stats, ...(p.stats || {}) } }));
      setReprise(s);
    } catch { /* sauvegarde illisible : on repart de zéro */ }
  }, []);

  useEffect(() => {
    if (etape !== "jeu") return;
    try {
      localStorage.setItem(SAUVE, JSON.stringify({
        etape, joueurs, actif, cadeauNum, volee, depart, doubleOut,
        // ⚠️ `perso` EST INDISPENSABLE : sans lui, une partie en score
        // personnalisé reprend avec un score de départ de 0, et la revanche
        // devient injouable (chaque volée buste, même trois RATÉ).
        perso,
        enAttente, dernierTour,
        fenetre: panneau && ["resultat", "plein", "tour"].includes(panneau.type) ? panneau.type : null,
        v: VERSION_SAUVE,
      }));
    } catch { /* stockage plein ou indisponible */ }
  }, [etape, joueurs, actif, cadeauNum, volee, depart, doubleOut, perso, enAttente, dernierTour, panneau]);

  const effacerSauvegarde = () => { try { localStorage.removeItem(SAUVE); } catch { /* ignore */ } };

  // ⚠️ À 8 joueurs sur un petit téléphone, la zone des scores peut défiler. Si le
  // joueur précédent l'avait fait glisser, le suivant arriverait sur la liste des
  // adversaires au lieu de son propre score : on la remet en haut à chaque tour.
  const hautDuJeu = useRef(null);
  useEffect(() => {
    if (etape !== "jeu") return;
    try { if (hautDuJeu.current) hautDuJeu.current.scrollTop = 0; } catch { /* ignore */ }
  }, [etape, actif]);

  // ⚠️ Le bandeau vert « 60 points » du joueur precedent restait affiche
  // pendant plus d une seconde sur l ecran du suivant, qui croyait avoir marque.
  // On l efface des que la main change.
  useEffect(() => { setMessage(null); }, [actif]);

  const reprendre = () => {
    const s = reprise;
    setJoueurs(s.joueurs); setActif(s.actif); setVolee(s.volee || []);
    setCadeauNum(s.cadeauNum ?? null);
    setDepart(s.depart); setPerso(s.perso ?? "");
    setDoubleOut(s.doubleOut ?? true);
    setEnAttente(s.enAttente ?? null);
    setDernierTour(s.dernierTour ?? null);
    setPanneau(s.fenetre ? { type: s.fenetre } : null);
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

  // Début d'un tour : on tire le numéro cadeau, on compte la tentative et on
  // ouvre la fenêtre d'annonce. C'est aussi elle qui sert de passage de main
  // (point 68 : nom, score, effets en cours).
  // ⚠️ L'index est passé en argument : setActif n'a pas encore pris effet quand
  // cette fonction est appelée juste après, et on créditerait la tentative au
  // joueur précédent.
  const demarrerTour = (idx) => {
    const num = hasard(NUMEROS_CADEAU);
    setActif(idx);
    setCadeauNum(num);
    setJoueurs((l) => l.map((p, i) => (i !== idx ? p
      : { ...p, stats: { ...p.stats, cadeauxTentes: p.stats.cadeauxTentes + 1 } })));
    setVolee([]); setMult(1);
    setPanneau({ type: "tour" });
  };

  const nouvelleManche = (liste, premier) => {
    setJoueurs(liste);
    setCadeauNum(null); setVolee([]); setMult(1);
    setGagnant(null); setMessage(null); setPanneau(null); setEnAttente(null); setDernierTour(null);
    // La partie proposée en reprise vient d'être remplacée : sans ça, l'écran de
    // configuration reproposait de « reprendre » une partie déjà finie.
    setReprise(null);
    setEtape("jeu");
    demarrerTour(premier);
  };

  const demarrer = () => {
    if (!peutJouer) return;
    nouvelleManche(nomsRemplis.map((nom) => nouveauJoueur(nom, scoreDepart)), 0);
  };

  const revanche = () => {
    // Point 78 : mêmes joueurs, même score, inventaires et malus remis à zéro,
    // et c'est un AUTRE qui commence.
    // ⚠️ Garde-fou : un score de départ à 0 rend la partie injouable (tout buste).
    // Ne devrait plus arriver depuis que `perso` est sauvegardé, mais mieux vaut
    // renvoyer vers la configuration que lancer une partie impossible.
    if (!departValide) { setEtape("config"); setGagnant(null); setReprise(null); return; }
    const suivant = ((gagnant?.index ?? 0) + 1) % joueurs.length;
    nouvelleManche(joueurs.map((p) => nouveauJoueur(p.nom, scoreDepart)), suivant);
  };

  const j = joueurs[actif];
  const effets = j?.effets || [];
  const apercu = useMemo(
    () => (j ? resoudreVolee(j.score, volee, doubleOut, effets) : null),
    [j, volee, doubleOut, effets]
  );
  const maxF = apercu?.maxF ?? 3;
  const cache = !!apercu?.aBrouillard;             // score masqué (Brouillard)

  // ── Saisie ────────────────────────────────────────────────────────────────
  const ajouter = (s) => {
    if (volee.length >= maxF || gagnant) return;
    // Le bull n'a pas de triple : un T armé sur le bull vaut le double (50).
    const m = s === 25 ? Math.min(mult, 2) : s === 0 ? 1 : mult;
    setVolee((v) => [...v, { s, m }]);
    setMult(1);
  };
  const retirer = () => { if (!gagnant) setVolee((v) => v.slice(0, -1)); };

  const flash = (texte, ton = "bon") => {
    setMessage({ texte, ton });
    setTimeout(() => setMessage((m) => (m?.texte === texte ? null : m)), 1800);
  };

  // ══════════════════════════════════════════════ UTILISATION D'UN POUVOIR ══
  const adversaires = joueurs.map((p, i) => ({ p, i })).filter(({ i }) => i !== actif);

  const lancerPouvoir = (id) => {
    const p = POUVOIRS[id];
    if (!p) return;

    // Les pouvoirs qui ne servent à rien maintenant sont refusés AVANT d'être
    // consommés : perdre une carte pour rien serait injuste.
    if (id === "nouvelleBoite" && !cadeauNum) { flash("Aucun cadeau en cours", "mauvais"); return; }
    if (id === "nettoyage" && !effets.some((e) => EST_MALUS[e.id])) { flash("Aucun malus à effacer", "mauvais"); return; }
    if (id === "raccourci" && !retraitAutorise(j.score, 20, doubleOut)) {
      flash("Trop près de zéro : la dernière fléchette doit être lancée", "mauvais"); return;
    }
    // ⚠️ Bouclier et Renvoi ne sont pas des « effets » : pourquoiImpossible ne les
    // voit pas. Sans ce test, rejouer la carte alors qu'elle est déjà armée la
    // faisait disparaître pour rien (true reste true).
    if (id === "bouclier" && j.bouclier) { flash("Ton bouclier est déjà en place", "mauvais"); return; }
    if (id === "renvoi" && j.renvoi) { flash("Ton renvoi est déjà armé", "mauvais"); return; }
    if (id === "espion" && !adversaires.some(({ p: c }) => (c.pouvoirs || []).length || c.bouclier || c.renvoi)) {
      flash("Personne n'a rien à cacher", "mauvais"); return;
    }
    if (p.soi) {
      const raison = pourquoiImpossible(j, id);
      if (raison) { flash(raison, "mauvais"); return; }
    }

    if (p.cible) {
      const dispo = adversaires.filter(({ p: cible }) => {
        if (id === "volPouvoir") return (cible.pouvoirs || []).length > 0;
        if (id === "espion") return (cible.pouvoirs || []).length > 0 || cible.bouclier || cible.renvoi;
        if (p.immediat) return true;
        return !pourquoiImpossible(cible, id);
      });
      if (!dispo.length) { flash("Aucune cible possible", "mauvais"); return; }
      if (dispo.length === 1) { suiteApresCible(id, dispo[0].i); return; }
      setPanneau({ type: "cible", id });
      return;
    }
    appliquer(id, {});
  };

  const suiteApresCible = (id, iCible) => {
    if (POUVOIRS[id].choixNumero) { setPanneau({ type: "numero", id, cible: iCible }); return; }
    if (id === "volPouvoir") { setPanneau({ type: "vol", id, cible: iCible }); return; }
    appliquer(id, { cible: iCible });
  };

  // Retire la carte de la main du joueur actif et compte l'utilisation.
  const consommer = (liste, id) => liste.map((p, i) => {
    if (i !== actif) return p;
    const k = p.pouvoirs.indexOf(id);
    return {
      ...p,
      pouvoirs: k < 0 ? p.pouvoirs : [...p.pouvoirs.slice(0, k), ...p.pouvoirs.slice(k + 1)],
      stats: { ...p.stats, pouvoirsUtilises: p.stats.pouvoirsUtilises + 1 },
    };
  });

  const appliquer = (id, { cible = null, num = null, vole = null, choisi = null }) => {
    setPanneau(null);
    const p = POUVOIRS[id];
    let liste = consommer(joueurs, id);
    let texte = `${p.icone} ${p.nom}`;

    // ⚠️ « ton » decide de la couleur du bandeau. Un coup renvoye sur soi
    // affiche en vert « +100 pour Thomas » : le joueur croit avoir gagne des
    // points alors qu il vient d en prendre 100. On force donc le rouge des
    // qu une protection a devie le coup.
    let ton = "bon";
    const majActif = (fn) => { liste = liste.map((x, i) => (i === actif ? fn(x) : x)); };
    const compterEnvoi = () => majActif((x) => ({ ...x, stats: { ...x.stats, malusEnvoyes: x.stats.malusEnvoyes + 1 } }));

    switch (id) {
      // ── Sur soi, tout de suite ──
      case "raccourci":
        majActif((x) => ({ ...x, score: x.score - 20 }));
        texte = "−20 points d'un coup !";
        break;
      case "bouclier":  majActif((x) => ({ ...x, bouclier: true })); texte = "Bouclier en place"; break;
      case "renvoi":    majActif((x) => ({ ...x, renvoi: true }));   texte = "Renvoi armé"; break;
      case "nettoyage": {
        const k = (j.effets || []).findIndex((e) => EST_MALUS[e.id]);
        if (k < 0) { flash("Aucun malus à effacer", "mauvais"); return; }
        const efface = POUVOIRS[j.effets[k].id]?.nom || "malus";
        majActif((x) => ({ ...x, effets: x.effets.filter((_, i) => i !== k) }));
        texte = `${efface} effacé`;
        break;
      }
      case "nouvelleBoite": {
        const autre = hasard(NUMEROS_CADEAU.filter((n) => n !== cadeauNum));
        setCadeauNum(autre);
        texte = `Nouveau numéro à viser : ${autre}`;
        break;
      }

      // ── Cartes qui en donnent une autre ──
      case "chaos": {
        const neuf = tirerPouvoir("mega", { nbJoueurs: joueurs.length, rang: rangDuJoueur(joueurs, actif), exclure: ["chaos"] });
        setJoueurs(ajouterPouvoir(liste, actif, neuf));
        setPanneau({ type: "cadeau", id: neuf, rarete: "mega", titre: "CHAOS !" });
        return;
      }
      case "arcEnCiel":
        if (!choisi) { setPanneau({ type: "arcEnCiel" }); return; }
        setJoueurs(ajouterPouvoir(liste, actif, choisi));
        setPanneau({ type: "cadeau", id: choisi, rarete: POUVOIRS[choisi].rarete, titre: "ARC-EN-CIEL" });
        return;

      // ── Regarder / voler ──
      case "espion":
        setJoueurs(liste);
        setPanneau({ type: "espion", cible });
        return;
      case "volPouvoir": {
        const { joueurs: apres, iFinal, texte: bloque } = passerLesProtections(liste, actif, cible);
        liste = apres;
        if (iFinal === null) { setJoueurs(liste); flash(bloque, "mauvais"); jouerEffet({ type: "bloque" }, 900); return; }
        // ⚠️ Un RENVOI ferait revenir le vol sur le voleur : l'index de carte
        // choisi ne désignerait plus rien chez lui. On annule au lieu de voler
        // n'importe quelle carte au hasard.
        if (iFinal !== cible) { setJoueurs(liste); flash(bloque || "Vol renvoyé — rien ne bouge", "mauvais"); return; }
        liste = liste.map((x, i) => (i === iFinal
          ? { ...x, pouvoirs: x.pouvoirs.filter((_, k) => k !== vole) }
          : x));
        const idVole = joueurs[cible].pouvoirs[vole];
        liste = ajouterPouvoir(liste, actif, idVole);
        compterEnvoi();
        texte = `${POUVOIRS[idVole].nom} volé à ${joueurs[cible].nom}`;
        break;
      }

      // ── Attaques immédiates sur le score ──
      case "retourArriere":
      case "bombe100": {
        const pts = id === "bombe100" ? 100 : 50;
        const { joueurs: apres, iFinal, texte: bloque } = passerLesProtections(liste, actif, cible);
        liste = apres;
        if (iFinal === null) { setJoueurs(liste); flash(bloque, "mauvais"); jouerEffet({ type: "bloque" }, 900); return; }
        liste = liste.map((x, i) => (i === iFinal
          ? { ...x, score: x.score + pts, stats: { ...x.stats, malusRecus: x.stats.malusRecus + 1 } }
          : x));
        compterEnvoi();
        // Le texte du renvoi vient de passerLesProtections : sans lui, le joueur
        // voit « +100 pour toi » sans comprendre d ou ca sort.
        texte = `${bloque ? bloque + " " : ""}+${pts} pour ${liste[iFinal].nom}`;
        if (iFinal === actif) ton = "mauvais";
        break;
      }
      case "bombeGenerale": {
        // ⚠️ Un adversaire peut BLOQUER (bouclier) ou RENVOYER le coup. Sans les
        // deux gardes ci-dessous, l'attaquant prenait des +50 en silence tout en
        // les voyant comptés comme « adversaires touchés ».
        let touches = 0;
        let retours = 0;
        const dits = [];
        for (const { i } of adversaires) {
          const { joueurs: apres, iFinal, texte: dit } = passerLesProtections(liste, actif, i);
          liste = apres;
          if (dit) dits.push(dit);
          if (iFinal === null) continue;
          liste = liste.map((x, k) => (k === iFinal
            ? { ...x, score: x.score + 50, stats: { ...x.stats, malusRecus: x.stats.malusRecus + 1 } }
            : x));
          if (iFinal === actif) retours++; else touches++;
        }
        compterEnvoi();
        texte = `+50 pour ${touches} adversaire${touches > 1 ? "s" : ""}`;
        if (retours) { texte += ` — et ${retours * 50} points pour toi !`; ton = "mauvais"; }
        if (dits.length) texte = `${dits.join(" ")} ${texte}`;
        break;
      }

      // ── Effets sur la prochaine volée ──
      default: {
        if (p.soi) {
          const effet = { id };
          if (id === "jackpot") effet.x = Math.random() < 0.5 ? 1.5 : 2;
          majActif((x) => ({ ...x, effets: [...x.effets, effet] }));
          texte = id === "jackpot" ? `🎰 Multiplicateur ×${effet.x} !` : `${p.icone} ${p.nom} activé`;
        } else if (p.cible) {
          const effet = { id };
          if (num !== null) effet.num = num;
          const res = envoyerMalus(liste, actif, cible, effet);
          liste = res.joueurs;
          compterEnvoi();
          texte = res.texte || `${p.nom} envoyé à ${joueurs[cible].nom}`;
          // Un coup bloque ou renvoye n est pas une bonne nouvelle pour l attaquant.
          if (res.texte) ton = "mauvais";
          if (/BLOQU/.test(res.texte || "")) jouerEffet({ type: "bloque" }, 900);
        }
        break;
      }
    }

    setJoueurs(liste);
    flash(texte, ton);

    // Une attaque part visiblement vers le bas de l'écran, là où sont affichés
    // les adversaires (point 56 : on doit voir QUI vient d'être attaqué).
    if (p.cible && !p.soi) {
      jouerEffet({ type: "projectile", icone: p.icone, couleur: ton === "mauvais" ? C.red : C.orange }, 700);
      vibrer("malus");
      aider("attaque", "Certains pouvoirs partent chez un adversaire. Il les subira à son prochain tour.");
    } else {
      vibrer("clic");
    }
  };

  // Ajoute une carte à un joueur. Si sa main est pleine, on NE JETTE RIEN
  // automatiquement (point 25) : la fenêtre de choix s'ouvrira.
  const ajouterPouvoir = (liste, idx, id) => liste.map((p, i) => (
    i !== idx || p.pouvoirs.length >= MAX_POUVOIRS ? p : { ...p, pouvoirs: [...p.pouvoirs, id] }
  ));

  // ═════════════════════════════════════════════════════════════ VALIDATION ══
  const validerVolee = () => {
    if (!j || volee.length === 0 || gagnant) return;
    const r = resoudreVolee(j.score, volee, doubleOut, effets);
    const forceCadeau = cadeauNum ? cadeauDeLaVolee(volee, cadeauNum, r.utilisees) : 0;
    const cadeau = forceCadeau
      ? tirerCadeau(forceCadeau, { nbJoueurs: joueurs.length, rang: rangDuJoueur(joueurs, actif) })
      : null;

    // ── Rejouer : Seconde chance après un bust, Tour bonus à 100 points ──
    // Seconde chance garde les AUTRES effets : le joueur n'a pas profité de son
    // turbo, ce serait le punir deux fois. Tour bonus, lui, repart à zéro.
    const rejoueBust  = r.bust && r.aSecondeChance;
    const rejoueBonus = !r.bust && r.aTourBonus && r.fait >= 100;
    const rejoue = rejoueBust || rejoueBonus;

    let liste = joueurs.map((p, i) => {
      if (i !== actif) return p;
      const st = { ...p.stats };
      if (cadeau) {
        st.cadeauxReussis += 1;
        st[cadeau.rarete === "petit" ? "petits" : cadeau.rarete === "super" ? "supers"
          : cadeau.rarete === "mega" ? "megas" : "legendaires"] += 1;
      }
      return {
        ...p,
        score: r.score,
        volees: [...p.volees, { flechettes: volee, fait: r.fait, bust: r.bust }],
        flechettes: p.flechettes + r.utilisees,
        total: p.total + r.fait,
        busts: p.busts + (r.bust ? 1 : 0),
        effets: rejoueBust ? p.effets.filter((e) => e.id !== "secondeChance") : [],
        stats: st,
      };
    });

    if (cadeau) {
      vibrer(cadeau.rarete);
      aider("cadeau", "Tu as gagné un pouvoir ! Tu peux en garder deux au maximum, et les sortir quand tu veux.");
    }

    // Le cadeau rentre dans la main s'il y a de la place.
    const plein = cadeau && liste[actif].pouvoirs.length >= MAX_POUVOIRS;
    if (cadeau && !plein) liste = ajouterPouvoir(liste, actif, cadeau.id);

    // Retard maximum de chacun (sert au titre « MIRACULÉ »).
    const meilleur = Math.min(...liste.map((p) => p.score));
    liste = liste.map((p) => ({ ...p, retardMax: Math.max(p.retardMax || 0, p.score - meilleur) }));

    setJoueurs(liste);
    setVolee([]); setMult(1);

    if (r.gagne) {
      setGagnant({ ...liste[actif], index: actif });
      setEtape("fin");
      setConfettis(true);
      vibrer("victoire");
      effacerSauvegarde();
      return;
    }

    // Point 66 : le bust doit se VOIR. Écran rouge très bref, secousse, vibration
    // sèche. Court : le joueur suivant attend son tour.
    if (r.bust) { jouerEffet({ type: "bust" }, 700); secouer(); vibrer("bust"); }
    else if (r.fait >= 100) vibrer("super");

    setDernierTour({
      nom: j.nom, fait: r.fait, bust: r.bust,
      rate: !!cadeauNum && !cadeau,
      gagne: cadeau ? RARETES[cadeau.rarete].nom : null,
    });

    const suivant = {
      r, cadeau, plein: !!plein,
      rate: !!cadeauNum && !cadeau,
      rejoueBust, rejoueBonus,
      nb: liste.length,
    };

    // ⚠️ Le résumé ne s'ouvre QUE s'il s'est passé quelque chose. Depuis que le
    // cadeau est tenté à chaque tour, s'arrêter sur « cadeau raté » à toutes les
    // volées ferait deux fenêtres par tour : injouable. Un cadeau manqué se dit
    // donc en une ligne, sans couper le jeu (point 81 : une action = un choix).
    // Le brouillard reste dans la liste : c'est le seul moment où le joueur
    // revoit son score.
    const inhabituel = r.bust || cadeau || r.multPos !== 1 || r.facteurNeg !== 1
      || r.verrou !== null || r.maxF !== 3 || r.immunise || r.doubleX2 || rejoue
      || r.aBrouillard;

    if (inhabituel) {
      setEnAttente(suivant);
      setPanneau({ type: "resultat" });
    } else {
      passerLaMain(suivant);
    }
  };

  // Fin d'un tour : la seule porte de sortie. Prend ses décisions dans des
  // DONNÉES (enAttente), jamais dans une fonction gardée en mémoire — sinon la
  // sauvegarde ne peut pas les rejouer après une fermeture de l'appli.
  const passerLaMain = (a) => {
    setEnAttente(null);
    if (a?.rejoueBust || a?.rejoueBonus) {
      // On REJOUE : même joueur, pas de nouvelle fenêtre d'annonce.
      // Le tour bonus ne permet pas de retenter un cadeau (point 33).
      // La seconde chance, si : c'est la même volée qu'on relance, sur le même
      // numéro — mais elle compte alors comme une NOUVELLE tentative, sans quoi
      // le taux de réussite du titre SNIPER pouvait dépasser 100 %.
      if (a.rejoueBonus) setCadeauNum(null);
      else if (cadeauNum) {
        setJoueurs((l) => l.map((x, i) => (i !== actif ? x
          : { ...x, stats: { ...x.stats, cadeauxTentes: x.stats.cadeauxTentes + 1 } })));
      }
      return;
    }
    demarrerTour((actif + 1) % (a?.nb || joueurs.length));
  };

  const fermerResultat = () => {
    const a = enAttente;
    setPanneau(null);
    if (!a) return;
    if (a.plein && a.cadeau) { setPanneau({ type: "plein" }); return; }
    passerLaMain(a);
  };

  // Inventaire plein : le joueur garde 2 cartes sur 3 (point 25).
  const garderDeux = (idAJeter) => {
    const nouveau = enAttente?.cadeau?.id;
    if (!nouveau) { setPanneau(null); passerLaMain(enAttente); return; }
    const main = [...j.pouvoirs, nouveau];
    const gardees = main.filter((_, i) => i !== idAJeter);
    setJoueurs((l) => l.map((p, i) => (i === actif ? { ...p, pouvoirs: gardees } : p)));
    setPanneau(null);
    passerLaMain(enAttente);
  };

  const quitter = () => { effacerSauvegarde(); setPage("jeux"); };

  // ══════════════════════════════════════════════════════════════ CONFIG ════
  if (etape === "config") return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, padding: "14px 14px 90px" }}>
      <StylesArcade />
      {tuto && <TutoArcade auto={tuto.auto} onFermer={() => setTuto(null)} />}
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

      {/* Réglages secondaires : le point 5 demande de ne pas encombrer l'écran
          principal, donc ils vivent tout en bas, après le bouton JOUER. */}
      <div style={bloc}>
        <div style={titreBloc}>OPTIONS</div>
        {/* Revoir les règles remet aussi les petites bulles d'explication : si on
            vient relire le fonctionnement, c'est qu'on a besoin d'être guidé. */}
        <button onClick={() => { oublierLesAides(); setTuto({ auto: false }); }}
          style={{ ...btnVide, width: "100%", marginBottom: 8, color: C.text,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <HelpCircle size={16} /> RÈGLES DU JEU
        </button>
        <button
          onClick={() => { const v = !vibOn; setVibOn(v); reglerVibrations(v); if (v) vibrer("super"); }}
          style={{ ...btnVide, width: "100%", color: vibOn ? C.green : C.muted,
            borderColor: vibOn ? C.green + "77" : C.border,
            display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>Vibrations</span>
          <span style={{ fontWeight: 900 }}>{vibOn ? "OUI" : "NON"}</span>
        </button>
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
    const st = gagnant.stats;
    const titres = titresDeFin(joueurs);
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, padding: "14px 14px 90px" }}>
        <StylesArcade />
        {confettis && <ConfettiBurst data={confettiData} />}
        {/* ⚠️ overflow caché : l'explosion de niveau 4 mesure 320 px de large et
            débordait de l'écran d'un téléphone (452 px de contenu pour 375 px de
            large), ce qui rendait toute la page glissable latéralement. */}
        <div style={{ textAlign: "center", padding: "36px 0 18px", position: "relative",
          overflow: "hidden", borderRadius: 20 }}>
          <Explosion niveau={4} couleur={C.gold} />
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
            ["Cadeaux tentés", st.cadeauxTentes],
            ["Cadeaux réussis", st.cadeauxReussis],
            ["Petits · super · méga", `${st.petits} · ${st.supers} · ${st.megas}`],
            ["Légendaires", st.legendaires],
            ["Pouvoirs utilisés", st.pouvoirsUtilises],
            ["Mauvais coups envoyés", st.malusEnvoyes],
            ["Mauvais coups reçus", st.malusRecus],
          ].map(([k, v]) => (
            <div key={k} style={ligneStat}>
              <span style={{ color: C.muted, fontSize: 13 }}>{k}</span>
              <span style={{ fontWeight: 800 }}>{v}</span>
            </div>
          ))}
        </div>

        {titres.length > 0 && (
          <div style={bloc}>
            <div style={titreBloc}>LES TITRES DE LA PARTIE</div>
            {titres.map((t) => (
              <div key={t.titre} style={ligneStat}>
                <span>
                  <span style={{ fontWeight: 900, color: C.gold, fontSize: 12, letterSpacing: 0.5 }}>{t.titre}</span>
                  <span style={{ display: "block", fontSize: 11.5, color: C.muted }}>{t.texte}</span>
                </span>
                <span style={{ fontWeight: 800 }}>{t.nom}</span>
              </div>
            ))}
          </div>
        )}

        <div style={bloc}>
          <div style={titreBloc}>CLASSEMENT</div>
          {/* ⚠️ On trie des PAIRES {joueur, place d'origine} : avec deux joueurs
              du même prénom, une clé basée sur le nom cassait la liste et les
              mettait tous les deux en gras comme gagnants. */}
          {joueurs.map((p, i) => ({ p, i })).sort((a, b) => a.p.score - b.p.score).map(({ p, i }, rang) => (
            <div key={i} style={ligneStat}>
              <span style={{ fontWeight: i === gagnant.index ? 800 : 500 }}>
                {rang + 1}. {p.nom}
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

  // ═══════════════════════════════════════════════════════════════ JEU ════
  // ⚠️ PLEIN ÉCRAN, comme le scoreur classique : position fixed + inset 0, au-dessus
  // de l'en-tête (z 200), de la barre du bas (z 300) et du menu (z 400).
  return (
    <div className="arc-plein" style={{
      position: "fixed", inset: 0, zIndex: 500, display: "flex", flexDirection: "column",
      background: C.bg, color: C.text, fontFamily: "Inter,sans-serif",
      overflow: "hidden", touchAction: "none", ...styleSecousse,
    }}>
      <StylesArcade />
      <style>{`
        .arc-plein button{touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none}
        .arc-plein button:active:not(:disabled){transform:scale(.96);opacity:.85}
      `}</style>

      {tuto && <TutoArcade auto={tuto.auto} onFermer={() => setTuto(null)} />}

      {/* Effets courts, par-dessus le jeu et sans jamais bloquer un bouton. */}
      {effet?.type === "bust" && <><FlashEcran couleur={C.red} /><Tampon texte="BUST !" /></>}
      {effet?.type === "bloque" && <Tampon texte="BLOQUÉ !" couleur={C.blue} />}
      {effet?.type === "projectile" && (
        <Projectile icone={<EmoIcon e={effet.icone} size={26} color="#fff" />}
          couleur={effet.couleur} onDone={() => setEffet(null)} />
      )}

      {/* ⚠️ Jamais de bulle pendant qu'une fenêtre est ouverte : elle s'affiche
          derrière, illisible et impossible à fermer. Elle attend son tour. */}
      {bulle && !panneau && !confirmQuit && (
        <Bulle texte={bulle.texte} onCompris={() => { marquerAideVue(bulle.cle); setBulle(null); }} />
      )}

      {confirmQuit && (
        <Fenetre>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Quitter la partie ?</div>
          <p style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.5, marginBottom: 20 }}>
            La partie en cours sera perdue. Tu ne pourras pas la reprendre.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setConfirmQuit(false)} style={{ ...btnVide, flex: 1, color: C.text }}>Continuer</button>
            <button onClick={quitter} style={{ ...btnPlein, flex: 1, background: "#7f1d1d" }}>Quitter</button>
          </div>
        </Fenetre>
      )}

      {panneau && <Panneau
        panneau={panneau} enAttente={enAttente} cadeauNum={cadeauNum} dernierTour={dernierTour}
        joueurs={joueurs} actif={actif} j={j} adversaires={adversaires}
        onFermer={() => setPanneau(null)} onResultat={fermerResultat}
        onCible={suiteApresCible} onAppliquer={appliquer} onGarder={garderDeux}
      />}

      {/* ── Barre du haut ── */}
      <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "calc(6px + env(safe-area-inset-top)) 12px 6px" }}>
        <button onClick={() => setConfirmQuit(true)} style={btnRetour}><ArrowLeft size={15} /> Quitter</button>
        <div style={{ fontSize: 11, color: C.faint, fontWeight: 700, letterSpacing: 1 }}>
          {JEU.toUpperCase()} · {scoreDepart} · {doubleOut ? "DOUBLE OUT" : "SIMPLE OUT"}
        </div>
      </div>

      {/* ── Zone qui respire ── */}
      <div ref={hautDuJeu} style={{ flex: 1, minHeight: 0, overflowY: "auto",
        padding: "0 12px", touchAction: "pan-y" }}>

        {/* Joueur actif */}
        <div style={{ ...bloc, textAlign: "center", borderColor: C.orange, marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.orange }}>{j?.nom}</div>
          {/* ⚠️ Le numéro à viser reste sous les yeux pendant TOUTE la volée :
              annoncé une fois puis oublié, personne ne s'en souvient au moment
              de lancer. Il est collé au score, là où le regard se pose. */}
          {cadeauNum && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6,
              background: `linear-gradient(120deg,${C.violet}30,${C.violet}12)`,
              border: `1px solid ${C.violet}88`, borderRadius: 999,
              padding: "4px 12px 4px 9px", marginTop: 4 }}>
              <EmoIcon e="🎁" size={14} color={C.violet} />
              <span style={{ fontSize: 12, fontWeight: 800, color: C.violet, letterSpacing: 0.5 }}>VISE LE</span>
              <span style={{ fontSize: 19, fontWeight: 900, color: "#fff", lineHeight: 1 }}>{cadeauNum}</span>
            </div>
          )}
          {/* ⚠️ Sous Brouillard le « ??? » doit rester BLANC : le passer en rouge
              sur un bust annoncerait exactement ce que le brouillard cache.
              Le score PULSE quand un multiplicateur est armé (point 53) : c'est
              le seul rappel visible qu'une volée va compter double ou triple. */}
          <div className="arc-anim" style={{ fontSize: 62, fontWeight: 900, lineHeight: 1.05, margin: "2px 0",
            color: !cache && apercu?.bust ? C.red : (apercu?.multPos > 1 ? C.gold : C.text),
            animation: apercu?.multPos > 1 ? "arcPulse 1.3s ease-in-out infinite" : "none" }}>
            {cache ? "???" : apercu ? apercu.score : j?.score}
          </div>
          {cache && (
            <div style={{ fontSize: 11.5, color: C.red, fontWeight: 800 }}>
              <EmoIcon e="🌫️" size={12} color={C.red} /> BROUILLARD — tu joues sans voir ton score
            </div>
          )}
          {!cache && volee.length > 0 && (
            <div style={{ fontSize: 12, color: apercu?.bust ? C.red : C.muted, fontWeight: 700 }}>
              {apercu?.bust ? "BUST — la volée sera annulée" : `${apercu.fait} points cette volée`}
            </div>
          )}

          {/* Effets en cours sur ce joueur */}
          {effets.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
              {effets.map((e, i) => <BadgeEffet key={i} e={e} />)}
            </div>
          )}
          {(j?.bouclier || j?.renvoi) && (
            <div style={{ display: "flex", gap: 5, justifyContent: "center", marginTop: 6 }}>
              {j.bouclier && <BadgeEffet e={{ id: "bouclier" }} />}
              {j.renvoi && <BadgeEffet e={{ id: "renvoi" }} />}
            </div>
          )}

          {/* Les fléchettes */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 10 }}>
            {Array.from({ length: maxF }, (_, i) => i).map((i) => (
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
          {maxF < 3 && (
            <div style={{ fontSize: 11, color: C.red, fontWeight: 800, marginTop: 6 }}>
              {maxF === 1 ? "UNE SEULE FLÉCHETTE" : "2 FLÉCHETTES SEULEMENT"}
            </div>
          )}
        </div>

        {message && (
          <div style={{ textAlign: "center", padding: "8px 10px", marginBottom: 10, borderRadius: 12,
            background: (message.ton === "mauvais" ? C.red : C.green) + "18",
            border: `1px solid ${(message.ton === "mauvais" ? C.red : C.green)}55`,
            fontWeight: 800, fontSize: 14, color: message.ton === "mauvais" ? C.red : C.green }}>
            {message.texte}
          </div>
        )}

        {/* Inventaire */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          {[0, 1].map((i) => (
            j?.pouvoirs?.[i]
              ? <div key={i} style={{ flex: 1, minWidth: 0 }}>
                  {/* Une fois la première fléchette saisie, les pouvoirs sont
                      gelés (ils changeraient le calcul en cours de volée). La
                      carte doit alors être VISIBLEMENT éteinte : avant, elle
                      restait normale et ne répondait plus, sans explication. */}
                  <CartePouvoir id={j.pouvoirs[i]} petite
                    desactive={volee.length > 0}
                    raison={volee.length > 0 ? "Trop tard : ta volée est commencée" : null}
                    onAide={(id) => setPanneau({ type: "aide", id })}
                    onClick={() => lancerPouvoir(j.pouvoirs[i])} />
                </div>
              : <SlotVide key={i} />
          ))}
        </div>

        {/* Adversaires */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, marginBottom: 10 }}>
          {adversaires.map(({ p, i }) => (
            <div key={i} style={{ flexShrink: 0, minWidth: 78, background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "7px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 78 }}>{p.nom}</div>
              <div style={{ fontSize: 19, fontWeight: 900 }}>{p.score}</div>
              {/* ⚠️ On montre le NOMBRE de cartes, jamais lesquelles, et surtout
                  pas les protections : c est tout l interet du pouvoir ESPION, et
                  un bouclier doit rester une surprise. */}
              <div style={{ fontSize: 10, color: C.faint, marginTop: 1, display: "flex",
                gap: 2, justifyContent: "center", alignItems: "center" }}>
                {(p.pouvoirs?.length || 0) === 0 ? "—"
                  : Array.from({ length: p.pouvoirs.length }, (_, k) => (
                      <EmoIcon key={k} e="⚡" size={11} color={C.gold} />
                    ))}
                {(p.effets || []).some((e) => EST_MALUS[e.id]) && <EmoIcon e="⚠️" size={11} color={C.red} />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Clavier, toujours à l'écran ── */}
        <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`, background: C.bg,
          padding: "8px 12px calc(10px + env(safe-area-inset-bottom))" }}>

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
              <button key={s} onClick={() => ajouter(s)} disabled={volee.length >= maxF} style={touche(volee.length >= maxF)}>
                {s}
              </button>
            ))}
            <button onClick={() => ajouter(25)} disabled={volee.length >= maxF}
              style={{ ...touche(volee.length >= maxF), gridColumn: "span 2", color: C.red, fontSize: 14 }}>
              BULL
            </button>
            <button onClick={() => ajouter(0)} disabled={volee.length >= maxF}
              style={{ ...touche(volee.length >= maxF), gridColumn: "span 2", color: C.muted }}>
              RATÉ
            </button>
            <button onClick={retirer} disabled={volee.length === 0}
              style={{ ...touche(volee.length === 0), color: C.orange }} aria-label="Effacer la dernière fléchette">
              ←
            </button>
          </div>

          <button onClick={validerVolee} disabled={volee.length === 0}
            style={{ ...btnPlein, width: "100%", marginTop: 8, minHeight: 52, fontSize: 16,
              opacity: volee.length === 0 ? 0.4 : 1,
              background: !cache && apercu?.bust ? C.red : C.orange }}>
            {volee.length === 0 ? "Saisis tes fléchettes"
              : cache ? "Valider"
              : apercu?.gagne ? "VALIDER LA VICTOIRE — tu gagnes !"
              : apercu?.bust ? "Valider (bust)"
              : `Valider — ${apercu.fait} pts`}
          </button>
      </div>
    </div>
  );
};

// ── Fenêtre par-dessus le jeu ────────────────────────────────────────────────
const Fenetre = ({ children, large = false }) => (
  <div style={{ position: "absolute", inset: 0, zIndex: 999, background: "#000000d8",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }}>
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18,
      padding: 20, maxWidth: large ? 400 : 340, width: "100%", textAlign: "center",
      maxHeight: "88%", overflowY: "auto", overflowX: "hidden" }}>
      {children}
    </div>
  </div>
);

// ── Toutes les fenêtres du jeu ───────────────────────────────────────────────
const Panneau = ({ panneau, enAttente, cadeauNum, dernierTour, joueurs, actif, j, adversaires, onFermer, onResultat, onCible, onAppliquer, onGarder }) => {
  const t = panneau.type;

  // ── Passage de main + annonce du cadeau (points 15 et 68) ──
  // Une seule fenêtre pour tout ce que le joueur doit savoir avant de lancer :
  // qui joue, son score, ce qu'il subit, et le numéro à viser.
  if (t === "tour") {
    const effets = j?.effets || [];
    return (
      <Fenetre>
        {dernierTour && (
          <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "7px 10px", marginBottom: 14, fontSize: 12, color: C.muted }}>
            <b style={{ color: C.text }}>{dernierTour.nom}</b>{" "}
            {dernierTour.bust ? <span style={{ color: C.red, fontWeight: 800 }}>a fait BUST</span>
              : <>a marqué <b style={{ color: C.text }}>{dernierTour.fait}</b></>}
            {dernierTour.gagne
              ? <> · <span style={{ color: C.green, fontWeight: 800 }}>{dernierTour.gagne}</span></>
              : dernierTour.rate ? <> · cadeau raté</> : null}
          </div>
        )}
        <div style={{ fontSize: 11, color: C.faint, fontWeight: 800, letterSpacing: 1.5 }}>À TOI DE JOUER</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.orange, marginTop: 4 }}>{j?.nom}</div>
        <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.1 }}>{j?.score}</div>

        {(effets.length > 0 || j?.bouclier || j?.renvoi) && (
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "center", margin: "8px 0 2px" }}>
            {effets.map((e, i) => <BadgeEffet key={i} e={e} />)}
            {j.bouclier && <BadgeEffet e={{ id: "bouclier" }} />}
            {j.renvoi && <BadgeEffet e={{ id: "renvoi" }} />}
          </div>
        )}

        {cadeauNum && (
          <div style={{ margin: "16px 0 4px", padding: "14px 12px", borderRadius: 16,
            background: `linear-gradient(140deg,${C.violet}26,${C.card2})`,
            border: `1px solid ${C.violet}88` }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 2 }}>
              <BoiteCadeau taille={72} couleur={C.violet} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, color: C.violet, letterSpacing: 1.5 }}>CADEAU MYSTÈRE</div>
            <div style={{ fontSize: 34, fontWeight: 900, margin: "6px 0 8px", lineHeight: 1 }}>
              VISE LE <span style={{ color: C.violet }}>{cadeauNum}</span>
            </div>
            <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
              {[["Simple", "petit", "petit"], ["Double", "super", "super"], ["Triple", "méga", "mega"]].map(([z, quoi, rar]) => (
                <span key={z} style={{ flex: 1, background: C.card, borderRadius: 9,
                  border: `1px solid ${RARETES[rar].couleur}55`, padding: "6px 2px" }}>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 800, color: C.text }}>{z}</span>
                  <span style={{ display: "block", fontSize: 10, fontWeight: 800, color: RARETES[rar].couleur }}>{quoi}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {(j?.pouvoirs?.length || 0) > 0 && (
          <p style={{ color: C.muted, fontSize: 12, margin: "12px 0 0", lineHeight: 1.4 }}>
            Tu as {j.pouvoirs.length} carte{j.pouvoirs.length > 1 ? "s" : ""} — touche-la avant de lancer pour t'en servir.
          </p>
        )}

        <button onClick={onFermer} style={{ ...btnPlein, width: "100%", marginTop: 16, minHeight: 52, fontSize: 16 }}>
          C'EST PARTI
        </button>
      </Fenetre>
    );
  }

  // Résumé de volée — le calcul est TOUJOURS montré (point 67), sinon personne
  // ne comprend pourquoi le score a bougé de cette façon.
  if (t === "resultat") {
    if (!enAttente) return null;
    const { r, cadeau, rate, rejoueBust, rejoueBonus } = enAttente;
    const lignes = [];
    if (r.maxF < 3) lignes.push([r.maxF === 1 ? "Une seule fléchette" : "Deux fléchettes", "malus"]);
    if (r.verrou !== null) lignes.push([`Verrouillage du ${r.verrou}`, "malus"]);
    lignes.push(["Volée brute", `${r.brut}`]);
    if (r.multPos !== 1) lignes.push([`Multiplicateur ×${r.multPos}`, "bonus"]);
    if (r.doubleX2) lignes.push(["Meilleure fléchette ×2", "bonus"]);
    if (r.facteurNeg === 0.5) lignes.push(["Divisé par deux", "malus"]);
    if (r.facteurNeg === 0) lignes.push(["Volée annulée", "malus"]);
    if (r.immunise && r.malusBloques.length) lignes.push(["Supernova bloque tout", "bonus"]);
    return (
      <Fenetre>
        <div style={{ fontSize: 26, fontWeight: 900, color: r.bust ? C.red : C.green }}>
          {r.bust ? "BUST !" : `${r.fait} points`}
        </div>
        <div style={{ margin: "12px 0", textAlign: "left" }}>
          {lignes.map(([g, d], i) => (
            <div key={i} style={{ ...ligneStat, borderColor: C.border + "55" }}>
              <span style={{ color: C.muted, fontSize: 12.5 }}>{g}</span>
              <span style={{ fontWeight: 800, fontSize: 12.5,
                color: d === "malus" ? C.red : d === "bonus" ? C.green : C.text }}>
                {d === "malus" ? "✕" : d === "bonus" ? "✓" : d}
              </span>
            </div>
          ))}
          <div style={{ ...ligneStat, borderBottom: "none" }}>
            <span style={{ color: C.muted, fontSize: 12.5 }}>Score restant</span>
            <span style={{ fontWeight: 900, fontSize: 17 }}>{r.score}</span>
          </div>
        </div>

        {cadeau && <Revelation cadeau={cadeau} />}
        {rate && (
          <div style={{ marginBottom: 12, color: C.muted, fontWeight: 800, fontSize: 14 }}>
            CADEAU RATÉ
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>Aucune pénalité, tes points comptent.</div>
          </div>
        )}

        {rejoueBust && <p style={{ color: C.green, fontSize: 13, fontWeight: 800 }}>Seconde chance : tu rejoues !</p>}
        {rejoueBonus && <p style={{ color: C.green, fontSize: 13, fontWeight: 800 }}>Tour bonus : tu rejoues !</p>}

        <button onClick={onResultat} style={{ ...btnPlein, width: "100%", marginTop: 4 }}>CONTINUER</button>
      </Fenetre>
    );
  }

  if (t === "cadeau") {
    return (
      <Fenetre>
        <div style={{ fontSize: 15, fontWeight: 900, color: RARETES[panneau.rarete].couleur, marginBottom: 10 }}>
          {panneau.titre || RARETES[panneau.rarete].nom}
        </div>
        <CartePouvoir id={panneau.id} />
        <p style={{ color: C.muted, fontSize: 12.5, lineHeight: 1.5, margin: "12px 0 14px" }}>
          {POUVOIRS[panneau.id].aide}
        </p>
        <button onClick={onFermer} style={{ ...btnPlein, width: "100%" }}>OK</button>
      </Fenetre>
    );
  }

  if (t === "aide") {
    const p = POUVOIRS[panneau.id];
    return (
      <Fenetre>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <EmoIcon e={p.icone} size={38} color={RARETES[p.rarete].couleur} strokeWidth={2} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, color: RARETES[p.rarete].couleur, margin: "4px 0 8px" }}>{p.nom}</div>
        <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.55, marginBottom: 16 }}>{p.aide}</p>
        <button onClick={onFermer} style={{ ...btnPlein, width: "100%" }}>Compris</button>
      </Fenetre>
    );
  }

  // Choisir sa cible (point 35)
  if (t === "cible") {
    const id = panneau.id;
    return (
      <Fenetre large>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>CHOISIS TA CIBLE</div>
        <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 14 }}>{POUVOIRS[id].nom} — {POUVOIRS[id].texte}</div>
        {adversaires.map(({ p, i }) => {
          const raison = id === "volPouvoir"
            ? ((p.pouvoirs || []).length ? null : "Aucune carte à voler")
            : (POUVOIRS[id].immediat || id === "espion" ? null : pourquoiImpossible(p, id));
          return (
            <button key={i} onClick={() => !raison && onCible(id, i)} disabled={!!raison}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                background: C.card2, border: `1px solid ${C.border}`, borderRadius: 12,
                padding: "11px 12px", marginBottom: 7, cursor: raison ? "default" : "pointer",
                opacity: raison ? 0.45 : 1, color: C.text }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 14 }}>{p.nom}</span>
                <span style={{ display: "block", fontSize: 11.5, color: raison ? C.red : C.muted }}>
                  {raison || `${(p.pouvoirs || []).length} pouvoir${(p.pouvoirs || []).length > 1 ? "s" : ""}`}
                </span>
              </span>
              <span style={{ fontSize: 20, fontWeight: 900 }}>{p.score}</span>
            </button>
          );
        })}
        <button onClick={onFermer} style={{ ...btnVide, width: "100%", marginTop: 4 }}>Annuler</button>
      </Fenetre>
    );
  }

  // Verrouillage : choisir le numéro
  if (t === "numero") {
    return (
      <Fenetre>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>QUEL NUMÉRO ?</div>
        <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 14 }}>
          Il vaudra zéro pour {joueurs[panneau.cible].nom} à sa prochaine volée.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {NUMEROS_CADEAU.map((n) => (
            <button key={n} onClick={() => onAppliquer(panneau.id, { cible: panneau.cible, num: n })}
              style={{ ...touche(false), minHeight: 54, fontSize: 20 }}>{n}</button>
          ))}
        </div>
        <button onClick={onFermer} style={{ ...btnVide, width: "100%", marginTop: 12 }}>Annuler</button>
      </Fenetre>
    );
  }

  // Vol de pouvoir : quelle carte prendre
  if (t === "vol") {
    const cible = joueurs[panneau.cible];
    return (
      <Fenetre>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>QUELLE CARTE ?</div>
        {(cible.pouvoirs || []).map((id, k) => (
          <div key={k} style={{ marginBottom: 7 }}>
            <CartePouvoir id={id} onClick={() => onAppliquer("volPouvoir", { cible: panneau.cible, vole: k })} />
          </div>
        ))}
        <button onClick={onFermer} style={{ ...btnVide, width: "100%", marginTop: 4 }}>Annuler</button>
      </Fenetre>
    );
  }

  // Espion : voir les cartes d'un adversaire
  if (t === "espion") {
    const cible = joueurs[panneau.cible];
    const cartes = cible.pouvoirs || [];
    return (
      <Fenetre>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>LES CARTES DE {cible.nom.toUpperCase()}</div>
        {cartes.length
          ? cartes.map((id, k) => <div key={k} style={{ marginBottom: 7 }}><CartePouvoir id={id} /></div>)
          : <p style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Il n'a aucune carte.</p>}
        {(cible.bouclier || cible.renvoi) && (
          <p style={{ color: C.muted, fontSize: 12.5, marginBottom: 12 }}>
            Protections : {cible.bouclier ? "bouclier " : ""}{cible.renvoi ? "renvoi" : ""}
          </p>
        )}
        <button onClick={onFermer} style={{ ...btnPlein, width: "100%" }}>OK</button>
      </Fenetre>
    );
  }

  // Arc-en-ciel : choisir n'importe quelle carte
  if (t === "arcEnCiel") {
    // ⚠️ Pas de légendaire dans la liste : Arc-en-ciel EST un légendaire, et
    // pouvoir en choisir un autre reviendrait à s'en offrir deux d'affilée.
    const parRarete = ["petit", "super", "mega"];
    return (
      <Fenetre large>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>CHOISIS TA CARTE</div>
        {parRarete.map((rar) => (
          <div key={rar} style={{ marginBottom: 10 }}>
            <div style={{ ...titreBloc, color: RARETES[rar].couleur, textAlign: "left" }}>{RARETES[rar].nom}</div>
            {Object.keys(POUVOIRS)
              .filter((id) => POUVOIRS[id].rarete === rar && (!POUVOIRS[id].min || joueurs.length >= POUVOIRS[id].min))
              .map((id) => (
                <div key={id} style={{ marginBottom: 6 }}>
                  <CartePouvoir id={id} petite onClick={() => onAppliquer("arcEnCiel", { choisi: id })} />
                </div>
              ))}
          </div>
        ))}
        <button onClick={onFermer} style={{ ...btnVide, width: "100%" }}>Annuler</button>
      </Fenetre>
    );
  }

  // Inventaire plein : garder 2 cartes sur 3 (point 25)
  if (t === "plein") {
    if (!enAttente?.cadeau) return null;
    const main = [...j.pouvoirs, enAttente.cadeau.id];
    return (
      <Fenetre>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>INVENTAIRE PLEIN</div>
        <div style={{ color: C.muted, fontSize: 12.5, marginBottom: 14 }}>
          Touche la carte que tu veux <b>jeter</b>. Tu en gardes deux.
        </div>
        {main.map((id, k) => (
          <div key={k} style={{ marginBottom: 7 }}>
            <CartePouvoir id={id} onClick={() => onGarder(k)} />
          </div>
        ))}
      </Fenetre>
    );
  }

  return null;
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
const carteChoix = (on) => ({
  background: on ? C.orange + "1e" : C.card2, border: `1px solid ${on ? C.orange : C.border}`,
  borderRadius: 12, padding: "12px 8px", cursor: "pointer", color: C.text, minHeight: 62,
});
const touche = (off) => ({
  minHeight: 46, borderRadius: 10, border: `1px solid ${C.border}`, background: C.card,
  color: C.text, fontWeight: 800, fontSize: 15, cursor: off ? "default" : "pointer", opacity: off ? 0.35 : 1,
});
