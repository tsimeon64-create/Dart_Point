// FriendPicker.jsx — champ « nom du joueur » avec une icône AMI à l'intérieur (à droite).
// Un clic ouvre la liste des amis du joueur connecté ; un clic sur un ami remplit le champ.
// Réutilisé par tous les jeux (Scoreur 501/301, Capital, Touché-Coulé, Double Down…).
import { useState, useEffect, useRef } from "react";
import { Users } from "lucide-react";
import { dbJ } from "./AppJoueurs";

// Cache partagé des amis (par id joueur) → un seul fetch même avec plusieurs champs / plusieurs jeux.
const _cacheAmis = new Map();
const chargerAmis = (jid) => {
  if (!jid) return Promise.resolve([]);
  if (!_cacheAmis.has(jid)) {
    _cacheAmis.set(jid, dbJ.getAmis(jid).then((rows) => {
      const liste = (rows || []).map((a) => {
        const moi1 = a.joueur_id === jid;
        return { id: moi1 ? a.ami_id : a.joueur_id, pseudo: (moi1 ? a.ami_pseudo : a.joueur_pseudo) || "Joueur" };
      });
      const vus = new Set();
      return liste
        .filter((x) => x.id && !vus.has(x.id) && vus.add(x.id))
        .sort((x, y) => x.pseudo.localeCompare(y.pseudo, "fr", { sensitivity: "base" }));
    }).catch(() => []));
  }
  return _cacheAmis.get(jid);
};

/**
 * Champ de saisie de nom + sélecteur d'amis.
 * Props :
 *  - value, onChange(text)  : le champ reste librement modifiable au clavier
 *  - placeholder, joueurId
 *  - onPickFriend(friend)   : optionnel — appelé quand on choisit un ami ({id, pseudo})
 *                             (les jeux qui lient les stats au profil s'en servent)
 *  - theme { bg, border, text, muted, accent, panel } : couleurs (valeurs par défaut sombres)
 *  - fontSize, inputStyle   : ajustements visuels optionnels
 */
export const FriendNameInput = ({
  value, onChange, placeholder, joueurId, onPickFriend,
  theme = {}, fontSize = 15, inputStyle = {},
}) => {
  const t = { bg: "#0b0b12", border: "#26263a", text: "#f1f5f9", muted: "#64748b", accent: "#f97316", panel: "#14141c", ...theme };
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [amis, setAmis] = useState(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open || amis !== null || !joueurId) return;
    setLoading(true);
    chargerAmis(joueurId).then((a) => setAmis(a)).finally(() => setLoading(false));
  }, [open, amis, joueurId]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [open]);

  const filtres = (amis || []).filter((a) => a.pseudo.toLowerCase().includes(q.trim().toLowerCase()));
  const msg = (txt) => <div style={{ padding: "14px 12px", fontSize: 12.5, color: t.muted, textAlign: "center" }}>{txt}</div>;
  const choisir = (a) => { onChange(a.pseudo); onPickFriend && onPickFriend(a); setOpen(false); setQ(""); };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, minWidth: 0 }}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: t.bg, border: `1px solid ${open ? t.accent : t.border}`, borderRadius: 10, padding: "11px 40px 11px 13px", color: t.text, fontSize, boxSizing: "border-box", ...inputStyle }} />
      <button type="button" onClick={() => { setOpen((o) => !o); setQ(""); }}
        aria-label="Choisir un ami" title="Choisir un ami"
        style={{ position: "absolute", right: 5, top: "50%", transform: "translateY(-50%)", width: 30, height: 30, borderRadius: 8, border: "none", background: open ? t.accent : "transparent", color: open ? "#fff" : t.muted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }}>
        <Users size={16} />
      </button>

      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 400, background: t.panel, border: `1px solid ${t.border}`, borderRadius: 12, boxShadow: "0 12px 34px #000c", overflow: "hidden" }}>
          <div style={{ padding: 8, borderBottom: `1px solid ${t.border}` }}>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer mes amis…"
              style={{ width: "100%", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 8, padding: "9px 11px", color: t.text, fontSize: 14, boxSizing: "border-box" }} />
          </div>
          <div style={{ maxHeight: 210, overflowY: "auto" }}>
            {!joueurId ? msg("Connecte-toi pour retrouver tes amis.")
              : loading ? msg("Chargement…")
                : filtres.length === 0 ? msg((amis || []).length === 0 ? "Tu n'as pas encore d'amis." : "Aucun ami à ce nom.")
                  : filtres.map((a) => (
                    <button key={a.id} type="button" onClick={() => choisir(a)}
                      style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: `1px solid ${t.border}55`, color: t.text, padding: "11px 13px", fontSize: 14, fontWeight: 700, cursor: "pointer", touchAction: "manipulation" }}>
                      {a.pseudo}
                    </button>
                  ))}
          </div>
        </div>
      )}
    </div>
  );
};
