// ─────────────────────────────────────────────────────────────────────────────
// TournoiSetupWizard.jsx — Nouvel assistant de configuration du mode
// « Tournoi entre potes » (refonte, cahier des charges 2026-07-24).
//
// Assistant guidé en étapes, remplace à terme PoolConfigModal + BracketConfigModal.
// - Phase "poules"  (avant lancement) : Format → Poules → Résumé → Lancer les poules
// - Phase "tableau" (après les poules) : Tableau → Résumé → Lancer le tableau
//
// TOUTE la logique de calcul vient de ./tournoiConfig.js (le « cerveau », testé).
// Ce fichier ne fait qu'AFFICHER et laisser l'utilisateur choisir.
//
// ⚠️ Construction EN COURS (étape par étape). Cette version contient :
//   • la coquille (stepper + navigation + bouton collant)
//   • l'ÉTAPE 1 « Format » complète
//   • un aperçu de test autonome (TournoiSetupWizardPreview) — sans Supabase
//   Les étapes Poules / Tableau / Résumé arrivent ensuite.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { EmoText } from "./icons";
import {
  getPoolDistributionOptions,
  distributePools,
  poolCountFromSize,
  calculateQualifiedCount,
  getNextBracketSize,
  matchesInPool,
  estimatePoolDuration,
  formatDuration,
  validatePoolConfiguration,
  buildPoolConfigurationSummary,
  roundsForBracket,
  ROUND_LABEL,
  manchesForPhase,
  computeConsolationCount,
  consolationByeCount,
  estimateBracketDuration,
  buildBracketConfigurationSummary,
} from "./tournoiConfig";

// Palette identique à AppTournoiPotes / Dart Point (identité premium sombre).
const CT = {
  bg: "#0f0f0f",
  card: "#1a1a1a",
  cardHi: "#15151c",
  border: "#2a2a2a",
  accent: "#f97316",
  text: "#f1f5f9",
  muted: "#94a3b8",
  green: "#22c55e",
  red: "#ef4444",
  yellow: "#f59e0b",
  purple: "#a78bfa",
  blue: "#60a5fa",
};

// ── Carte de choix réutilisable (4 états visuels du §12) ─────────────────────
// selected | recommended | invalid | disabled. Contenu libre (title/subtitle/lines).
export const ChoiceCard = ({
  selected = false,
  recommended = false,
  invalid = false,
  disabled = false,
  onClick,
  title,
  subtitle,
  lines = [],
  invalidReason,
  emoji,
  ariaLabel,
  style = {},
}) => {
  const borderColor = invalid
    ? CT.red
    : selected
    ? CT.accent
    : recommended
    ? CT.green + "88"
    : CT.border;
  const bg = invalid
    ? CT.red + "11"
    : selected
    ? CT.accent + "1f"
    : CT.card;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-label={ariaLabel || title}
      aria-pressed={selected}
      style={{
        position: "relative",
        width: "100%",
        textAlign: "left",
        border: `1.5px solid ${borderColor}`,
        background: bg,
        borderRadius: 14,
        padding: "14px 14px",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        boxShadow: selected ? `0 0 0 3px ${CT.accent}22` : "none",
        transition: "border-color .15s, background .15s, box-shadow .15s",
        touchAction: "manipulation",
        minHeight: 56,
        ...style,
      }}
    >
      {recommended && (
        <span
          style={{
            position: "absolute",
            top: -10,
            right: 10,
            background: CT.green,
            color: "#04120a",
            fontSize: 10.5,
            fontWeight: 800,
            padding: "2px 8px",
            borderRadius: 20,
            letterSpacing: 0.2,
          }}
        >
          ⭐ Recommandé
        </span>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {emoji != null && (
          <div style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>
            <EmoText s={emoji} size={24} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: selected ? CT.accent : CT.text,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: 12.5, color: CT.muted, marginTop: 2, lineHeight: 1.35 }}>
              {subtitle}
            </div>
          )}
          {lines.length > 0 && (
            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
              {lines.map((l, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 12,
                    color: l.strong ? CT.text : CT.muted,
                    fontWeight: l.strong ? 700 : 500,
                    lineHeight: 1.4,
                  }}
                >
                  {l.icon ? <EmoText s={l.icon} size={12} /> : null} {l.text}
                </div>
              ))}
            </div>
          )}
          {invalid && invalidReason && (
            <div style={{ fontSize: 11.5, color: CT.red, fontWeight: 700, marginTop: 6 }}>
              ⚠️ {invalidReason}
            </div>
          )}
        </div>
        {/* Puce d'état (coché) */}
        <div
          style={{
            flexShrink: 0,
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: `2px solid ${selected ? CT.accent : CT.border}`,
            background: selected ? CT.accent : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 13,
            fontWeight: 900,
          }}
        >
          {selected ? "✓" : ""}
        </div>
      </div>
    </button>
  );
};

// ── Indicateur d'étapes (stepper compact, mobile) ────────────────────────────
export const TournamentSetupStepper = ({ steps, current }) => (
  <div style={{ marginBottom: 18 }}>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        overflowX: "auto",
        paddingBottom: 2,
        WebkitOverflowScrolling: "touch",
      }}
    >
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        const color = active ? CT.accent : done ? CT.green : CT.muted;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  border: `2px solid ${color}`,
                  background: active ? CT.accent : done ? CT.green : "transparent",
                  color: active || done ? "#0b0b0b" : CT.muted,
                  fontSize: 12,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done ? "✓" : i + 1}
              </div>
              <span style={{ fontSize: 12.5, fontWeight: active ? 800 : 600, color }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <span style={{ color: CT.border, fontSize: 13, margin: "0 2px" }}>›</span>
            )}
          </div>
        );
      })}
    </div>
    <div style={{ fontSize: 11, color: CT.muted, marginTop: 6, fontWeight: 600 }}>
      Étape {current + 1} sur {steps.length}
    </div>
  </div>
);

// ── Petit bloc « rappel des participants » (haut de l'étape Format) ──────────
const RecapParticipants = ({ count, mode, format }) => {
  const unite = format === "doublette" ? "équipes" : "joueurs";
  return (
    <div
      style={{
        background: CT.accent + "11",
        border: `1px solid ${CT.accent}33`,
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        marginBottom: 18,
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: CT.text }}>
        <EmoText s="👥" size={15} /> {count} {unite} inscrit{format === "doublette" ? "es" : "s"}
      </div>
      <div style={{ fontSize: 12.5, color: CT.muted }}>
        <EmoText s="🎯" size={12} /> Mode {mode} &nbsp;·&nbsp;{" "}
        <EmoText s={format === "doublette" ? "🤝" : "🙋"} size={12} />{" "}
        {format === "doublette" ? "Doublette (équipes de 2)" : "Simple (chacun pour soi)"}
      </div>
    </div>
  );
};

// ── ÉTAPE 1 : Format général ─────────────────────────────────────────────────
export const StepFormat = ({ config, participantCount, locked, onChange }) => {
  const set = (patch) => onChange({ ...config, ...patch });
  return (
    <div>
      <h2 style={{ fontSize: 19, fontWeight: 800, color: CT.text, margin: "0 0 4px" }}>
        <EmoText s="⚙️" size={18} /> Format général
      </h2>
      <p style={{ fontSize: 13, color: CT.muted, margin: "0 0 16px" }}>
        Le type de jeu et la composition des participants.
      </p>

      <RecapParticipants count={participantCount} mode={config.mode} format={config.format} />

      {locked && (
        <div
          style={{
            background: CT.yellow + "14",
            border: `1px solid ${CT.yellow}44`,
            borderRadius: 10,
            padding: "10px 12px",
            fontSize: 12.5,
            color: CT.yellow,
            fontWeight: 700,
            marginBottom: 16,
            lineHeight: 1.4,
          }}
        >
          🔒 Le tournoi a commencé : le mode et le format ne peuvent plus être changés.
        </div>
      )}

      <div style={{ fontSize: 13.5, fontWeight: 800, color: CT.text, marginBottom: 8 }}>
        Mode de jeu
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
        <ChoiceCard
          emoji="🎯"
          title="501"
          subtitle="Le classique. On part de 501 et on descend à zéro."
          selected={config.mode === "501"}
          disabled={locked}
          onClick={() => set({ mode: "501" })}
        />
        <ChoiceCard
          emoji="🎯"
          title="301"
          subtitle="Plus court et plus rapide. On part de 301."
          selected={config.mode === "301"}
          disabled={locked}
          onClick={() => set({ mode: "301" })}
        />
      </div>

      <div style={{ fontSize: 13.5, fontWeight: 800, color: CT.text, marginBottom: 8 }}>
        Format
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <ChoiceCard
          emoji="🙋"
          title="Simple"
          subtitle="Chacun pour soi : un participant = un joueur."
          selected={config.format === "simple"}
          disabled={locked}
          onClick={() => set({ format: "simple" })}
        />
        <ChoiceCard
          emoji="🤝"
          title="Doublette"
          subtitle="Par équipes de 2 : un participant = une équipe."
          selected={config.format === "doublette"}
          disabled={locked}
          onClick={() => set({ format: "doublette" })}
        />
      </div>
    </div>
  );
};

// ── Petits blocs réutilisables ───────────────────────────────────────────────
const SectionLabel = ({ children, hint }) => (
  <div style={{ fontSize: 13.5, fontWeight: 800, color: CT.text, margin: "18px 0 8px" }}>
    {children}
    {hint && <span style={{ color: CT.muted, fontWeight: 500 }}> {hint}</span>}
  </div>
);

// Bloc repliable (options avancées, aide…). Fermé par défaut.
const Collapsible = ({ title, emoji, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: `1px solid ${CT.border}`,
        borderRadius: 12,
        marginTop: 16,
        overflow: "hidden",
        background: CT.cardHi,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 14px",
          background: "transparent",
          border: "none",
          color: CT.text,
          fontSize: 13.5,
          fontWeight: 700,
          cursor: "pointer",
          textAlign: "left",
          touchAction: "manipulation",
        }}
      >
        <span style={{ flexShrink: 0 }}>{emoji ? <EmoText s={emoji} size={15} /> : null}</span>
        <span style={{ flex: 1 }}>{title}</span>
        <span style={{ color: CT.muted, transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }}>
          ›
        </span>
      </button>
      {open && <div style={{ padding: "0 14px 14px" }}>{children}</div>}
    </div>
  );
};

// Grande carte de synthèse (buildPoolConfigurationSummary). Vert si sans exempt.
const SummaryBanner = ({ summary, title = "Configuration proposée" }) => {
  const color = summary.clean ? CT.green : CT.yellow;
  return (
    <div
      style={{
        border: `1px solid ${color}55`,
        background: color + "12",
        borderRadius: 14,
        padding: "14px 16px",
        marginTop: 18,
      }}
    >
      <div style={{ fontSize: 12.5, fontWeight: 800, color, letterSpacing: 0.3, marginBottom: 8 }}>
        <EmoText s="🏟️" size={13} /> {title.toUpperCase()}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {summary.lines.map((l, i) => (
          <div key={i} style={{ fontSize: 13, color: CT.text, fontWeight: 600, lineHeight: 1.4 }}>
            {l.icon ? <EmoText s={l.icon} size={13} /> : null} {l.text}
          </div>
        ))}
      </div>
    </div>
  );
};

// Messages de validation : erreurs (bloquantes) + avertissements.
const ValidationMessages = ({ result }) => {
  if (!result || (!result.errors.length && !result.warnings.length)) return null;
  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
      {result.errors.map((e, i) => (
        <div
          key={"e" + i}
          style={{
            background: CT.red + "14",
            border: `1px solid ${CT.red}55`,
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 12.5,
            color: CT.red,
            fontWeight: 700,
            lineHeight: 1.4,
          }}
        >
          ⛔ {e}
        </div>
      ))}
      {result.warnings.map((w, i) => (
        <div
          key={"w" + i}
          style={{
            background: CT.yellow + "12",
            border: `1px solid ${CT.yellow}44`,
            borderRadius: 10,
            padding: "9px 12px",
            fontSize: 12.5,
            color: CT.yellow,
            fontWeight: 600,
            lineHeight: 1.4,
          }}
        >
          ⚠️ {w}
        </div>
      ))}
    </div>
  );
};

// Petit sélecteur horizontal de nombres (manches, durée…).
const NumberPills = ({ values, value, onPick, suffix }) => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    {values.map((v) => {
      const sel = value === v;
      return (
        <button
          key={v}
          onClick={() => onPick(v)}
          style={{
            flex: "1 1 44px",
            minWidth: 44,
            minHeight: 44,
            borderRadius: 10,
            border: `1.5px solid ${sel ? CT.accent : CT.border}`,
            background: sel ? CT.accent + "1f" : CT.card,
            color: sel ? CT.accent : CT.text,
            fontWeight: sel ? 800 : 600,
            fontSize: 15,
            cursor: "pointer",
            touchAction: "manipulation",
          }}
        >
          {v}
          {suffix || ""}
        </button>
      );
    })}
  </div>
);

// ── ÉTAPE 2 : Configuration des poules ───────────────────────────────────────
export const StepPoules = ({ config, participantCount, onChange }) => {
  const set = (patch) => onChange({ ...config, ...patch });
  const unite = config.format === "doublette" ? "équipes" : "joueurs";
  const uniteQ = config.format === "doublette" ? "équipes qualifiées" : "qualifiés";
  const qpp = config.qualifiersPerPool || 2;

  // Options de répartition (calculées par le moteur testé). Les tailles candidates
  // ne dépendent QUE du nombre de participants (pas des qualifiés).
  const options = getPoolDistributionOptions(participantCount, { qualifiersPerPool: qpp });
  const recommended = options.find((o) => o.recommended);
  const validSizes = options.map((o) => o.playersPerPool);
  const sel =
    config.playersPerPool && validSizes.includes(config.playersPerPool)
      ? config.playersPerPool
      : recommended
      ? recommended.playersPerPool
      : validSizes[0];

  // Au 1er affichage (ou si le choix devient invalide), on fixe la taille recommandée.
  useEffect(() => {
    if (config.playersPerPool !== sel) set({ playersPerPool: sel });
    // eslint-disable-next-line
  }, [sel]);

  const selectedOption = options.find((o) => o.playersPerPool === sel);
  const groups = selectedOption ? selectedOption.groups : distributePools(participantCount, poolCountFromSize(participantCount, sel));
  const minPool = groups.length ? Math.min(...groups) : 0;

  // Si la taille de poule choisie rend le nb de qualifiés invalide (qualifiés ≥
  // plus petite poule), on le ramène automatiquement à une valeur valide.
  useEffect(() => {
    if (minPool >= 2 && qpp >= minPool) set({ qualifiersPerPool: Math.max(1, minPool - 1) });
    // eslint-disable-next-line
  }, [minPool]);

  // Résumé + validation en direct.
  const summary = buildPoolConfigurationSummary({
    playerCount: participantCount,
    groups,
    qualifiersPerPool: qpp,
    manches: config.manches || 2,
    availableTargets: config.availableTargets || 1,
    averageMatchDuration: config.averageMatchDuration || null,
    format: config.format,
  });
  const validation = validatePoolConfiguration({
    playerCount: participantCount,
    groups,
    qualifiersPerPool: qpp,
    availableTargets: config.availableTargets || 1,
    averageMatchDuration: config.averageMatchDuration || 15,
  });

  // Conséquences d'un choix de « qualifiés par poule » (pour l'affichage).
  const conseqQual = (q) => {
    const qc = calculateQualifiedCount(groups, q);
    const bs = getNextBracketSize(qc);
    return { qc, bs, bye: Math.max(0, bs - qc) };
  };

  const manches = config.manches || 2;
  const cibles = config.availableTargets || 1;
  const avgDur = config.averageMatchDuration || 15;

  return (
    <div>
      <h2 style={{ fontSize: 19, fontWeight: 800, color: CT.text, margin: "0 0 4px" }}>
        <EmoText s="🏟️" size={18} /> Les poules
      </h2>
      <p style={{ fontSize: 13, color: CT.muted, margin: "0 0 4px" }}>
        {participantCount} {unite} · tout le monde joue contre tout le monde dans sa poule.
      </p>

      <SectionLabel hint={recommended ? `(conseillé : ${recommended.playersPerPool}/poule)` : ""}>
        {config.format === "doublette" ? "Équipes" : "Joueurs"} par poule
      </SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {options.map((o) => (
          <ChoiceCard
            key={o.playersPerPool}
            title={`${o.playersPerPool} ${unite} par poule`}
            selected={o.playersPerPool === sel}
            recommended={o.recommended}
            ariaLabel={`${o.playersPerPool} ${unite} par poule`}
            onClick={() => set({ playersPerPool: o.playersPerPool })}
            lines={[
              { icon: "🏟️", text: o.balanced ? `${o.poolCount} poules de ${o.groups[0]}` : `${o.poolCount} poules de ${Math.min(...o.groups)} à ${Math.max(...o.groups)}`, strong: true },
              { icon: "📋", text: `${o.totalPoolMatches} matchs au total${o.balanced ? ` (${o.matchesPerPool}/poule)` : ""}` },
              { icon: "✅", text: `${o.qualifiedCount} ${uniteQ} → tableau de ${o.bracketSize}` },
              o.clean ? { icon: "👍", text: "Aucun exempt" } : { icon: "⚠️", text: `${o.byeCount} exempt${o.byeCount > 1 ? "s" : ""}` },
            ]}
          />
        ))}
      </div>

      <SummaryBanner summary={summary} />
      <ValidationMessages result={validation} />

      <SectionLabel hint="(qui passe au tableau)">
        {config.format === "doublette" ? "Équipes qualifiées" : "Qualifiés"} par poule
      </SectionLabel>
      <div style={{ display: "flex", gap: 8 }}>
        {[1, 2, 3].map((q) => {
          const possible = q < minPool; // au moins un non-qualifié → valide
          const sq = qpp === q;
          const c = conseqQual(q);
          return (
            <button
              key={q}
              onClick={possible ? () => set({ qualifiersPerPool: q }) : undefined}
              disabled={!possible}
              aria-pressed={sq}
              aria-label={`${q} qualifié${q > 1 ? "s" : ""} par poule`}
              style={{
                flex: 1,
                minHeight: 64,
                borderRadius: 12,
                border: `1.5px solid ${sq ? CT.accent : CT.border}`,
                background: sq ? CT.accent + "1f" : CT.card,
                color: sq ? CT.accent : CT.text,
                cursor: possible ? "pointer" : "not-allowed",
                opacity: possible ? 1 : 0.4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                padding: "6px 4px",
                touchAction: "manipulation",
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>
                {q === 1 ? "Le 1er" : `Les ${q} premiers`}
              </span>
              <span style={{ fontSize: 10, color: possible ? (c.bye === 0 ? CT.green : CT.yellow) : CT.muted, fontWeight: 700, textAlign: "center", lineHeight: 1.25 }}>
                {possible ? `${c.qc} qual. · ${c.bye === 0 ? "✅" : `${c.bye} exempt${c.bye > 1 ? "s" : ""}`}` : "poules trop petites"}
              </span>
            </button>
          );
        })}
      </div>

      <SectionLabel hint="(premier à…)">Manches par match</SectionLabel>
      <NumberPills values={[1, 2, 3, 4, 5]} value={manches} onPick={(m) => set({ manches: m })} />
      <div style={{ fontSize: 12, color: CT.muted, marginTop: 8, lineHeight: 1.4 }}>
        Le premier {config.format === "doublette" ? "équipe" : "joueur"} à atteindre <b style={{ color: CT.text }}>{manches} manche{manches > 1 ? "s" : ""}</b> remporte le match.
      </div>

      <SectionLabel hint="(jeux de fléchettes en parallèle)">Cibles disponibles</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <button
          onClick={() => set({ availableTargets: Math.max(1, cibles - 1) })}
          aria-label="Une cible de moins"
          style={{ width: 46, height: 46, borderRadius: 12, border: `1px solid ${CT.border}`, background: CT.card, color: CT.text, fontSize: 24, fontWeight: 800, cursor: "pointer", touchAction: "manipulation" }}
        >
          −
        </button>
        <span style={{ fontWeight: 800, fontSize: 28, color: CT.accent, minWidth: 40, textAlign: "center" }}>{cibles}</span>
        <button
          onClick={() => set({ availableTargets: Math.min(12, cibles + 1) })}
          aria-label="Une cible de plus"
          style={{ width: 46, height: 46, borderRadius: 12, border: `1px solid ${CT.border}`, background: CT.card, color: CT.text, fontSize: 24, fontWeight: 800, cursor: "pointer", touchAction: "manipulation" }}
        >
          +
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: CT.muted, textAlign: "center", marginTop: 8, lineHeight: 1.4 }}>
        🎯 Jusqu'à {cibles === 1 ? "1 match" : `${cibles} matchs`} en même temps (un par cible). Réglable pendant le tournoi.
      </div>

      <SectionLabel hint="(indicative)">Durée moyenne par match</SectionLabel>
      <NumberPills values={[10, 15, 20]} value={avgDur} onPick={(d) => set({ averageMatchDuration: d })} suffix=" min" />
      <div
        style={{
          marginTop: 10,
          background: CT.blue + "12",
          border: `1px solid ${CT.blue}44`,
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 12.5,
          color: CT.blue,
          fontWeight: 700,
        }}
      >
        ⏱️ Durée estimée des poules : environ {formatDuration(estimatePoolDuration({ groups, availableTargets: cibles, averageMatchDuration: avgDur }))}
        <div style={{ fontSize: 10.5, color: CT.muted, fontWeight: 500, marginTop: 2 }}>Estimation indicative selon la durée moyenne choisie.</div>
      </div>

      {/* Note : la répartition se fait par tirage au sort équilibré (poules de tailles proches). */}
      <div style={{ fontSize: 11.5, color: CT.muted, marginTop: 16, lineHeight: 1.4 }}>
        🎲 Les poules sont formées par <b style={{ color: CT.text }}>tirage au sort</b> (tailles équilibrées), au moment du lancement.
      </div>

      <Collapsible title="Comment les équipes sont-elles classées ?" emoji="📊">
        <ol style={{ margin: "8px 0 0", paddingLeft: 20, color: CT.text, fontSize: 12.5, lineHeight: 1.6 }}>
          <li>Nombre de victoires</li>
          <li>Nombre de défaites</li>
          <li>Différence de manches (manches gagnées − perdues)</li>
          <li>Match de barrage en 701 en cas d'égalité persistante</li>
        </ol>
        <div style={{ fontSize: 11, color: CT.muted, marginTop: 8, lineHeight: 1.4 }}>
          Le barrage en 701 est une règle propre à Dart Point pour départager équitablement.
        </div>
      </Collapsible>
    </div>
  );
};

// ── Carte toggle (petite finale / consolante) ───────────────────────────────
const ToggleRow = ({ on, disabled, emoji, title, subtitle, offReason, onToggle }) => (
  <button
    onClick={disabled ? undefined : onToggle}
    disabled={disabled}
    aria-pressed={on && !disabled}
    style={{
      width: "100%",
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      borderRadius: 12,
      border: `1.5px solid ${on && !disabled ? CT.accent : CT.border}`,
      background: on && !disabled ? CT.accent + "18" : CT.card,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      textAlign: "left",
      touchAction: "manipulation",
    }}
  >
    <div style={{ fontSize: 22, flexShrink: 0 }}>
      <EmoText s={emoji} size={22} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: CT.text }}>{title}</div>
      <div style={{ fontSize: 11.5, color: CT.muted, lineHeight: 1.35 }}>{disabled ? offReason : subtitle}</div>
    </div>
    <div
      style={{
        width: 42,
        height: 24,
        borderRadius: 12,
        background: on && !disabled ? CT.accent : CT.border,
        position: "relative",
        flexShrink: 0,
        transition: "background .2s",
      }}
    >
      <div style={{ width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 2, left: on && !disabled ? 20 : 2, transition: "left .2s" }} />
    </div>
  </button>
);

// ── ÉTAPE 3 : Réglages du tableau final ──────────────────────────────────────
export const StepTableau = ({ config, onChange, context = {} }) => {
  const set = (patch) => onChange({ ...config, ...patch });
  const {
    qualifiedCount = 0,
    nbGroupes = 0,
    nbQual = 2,
    poolGroups = [],
    crossings = null,
    format = "simple",
  } = context;
  const unite = format === "doublette" ? "équipes" : "joueurs";
  const uniteQ = format === "doublette" ? "équipes qualifiées" : "qualifiés";

  const minSize = getNextBracketSize(qualifiedCount);
  const sizeOptions = [...new Set([minSize, Math.min(32, minSize * 2)])];
  const bracketSize = config.bracketSize && sizeOptions.includes(config.bracketSize) ? config.bracketSize : minSize;

  const manchesMap = config.manchesMap || { seizieme: 2, huitieme: 2, quart: 2, demi: 3, finale: 5, petite_finale: 2, consolante: 2 };
  const nbConso = config.nbConso || 2;
  const consoCount = computeConsolationCount(poolGroups, nbQual, nbConso);
  const peutConso = consoCount >= 2;
  const peutPetite = bracketSize >= 4;
  const petiteFinale = config.petiteFinale !== false && peutPetite;
  const consolante = config.consolante !== false && peutConso;
  const finalTargets = config.finalTargets || context.poolTargets || 2;

  // Défauts au 1er affichage.
  useEffect(() => {
    const patch = {};
    if (!config.bracketSize) patch.bracketSize = minSize;
    if (!config.finalTargets) patch.finalTargets = context.poolTargets || 2;
    if (!config.manchesMap) patch.manchesMap = manchesMap;
    if (Object.keys(patch).length) set(patch);
    // eslint-disable-next-line
  }, []);

  const byeCount = Math.max(0, bracketSize - qualifiedCount);
  const rounds = roundsForBracket(bracketSize);
  const usedPhases = [
    ...rounds,
    ...(petiteFinale ? ["petite_finale"] : []),
    ...(consolante ? ["consolante"] : []),
  ];
  const setManche = (ph, m) => set({ manchesMap: { ...manchesMap, [ph]: m } });
  const setAllManches = (m) => {
    const mm = { ...manchesMap };
    usedPhases.forEach((ph) => { mm[ph] = m; });
    set({ manchesMap: mm });
  };

  return (
    <div>
      <h2 style={{ fontSize: 19, fontWeight: 800, color: CT.text, margin: "0 0 4px" }}>
        <EmoText s="🏆" size={18} /> Le tableau final
      </h2>
      <p style={{ fontSize: 13, color: CT.muted, margin: "0 0 4px" }}>Élimination directe jusqu'au vainqueur.</p>

      {/* §9.1 Carte de qualification */}
      <div
        style={{
          border: `1px solid ${byeCount === 0 ? CT.green : CT.yellow}55`,
          background: (byeCount === 0 ? CT.green : CT.yellow) + "12",
          borderRadius: 14,
          padding: "14px 16px",
          marginTop: 14,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 800, color: CT.text, marginBottom: 6 }}>
          <EmoText s="🏆" size={16} /> {qualifiedCount} {uniteQ}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, fontSize: 12.5, color: CT.muted, fontWeight: 600 }}>
          {qualifiedCount === nbGroupes * nbQual &&
            Array.from({ length: nbQual }, (_, r) => (
              <div key={r}>
                <EmoText s={r === 0 ? "🥇" : r === 1 ? "🥈" : "🥉"} size={12} /> {nbGroupes} {r === 0 ? "premiers" : r === 1 ? "deuxièmes" : `${r + 1}es`} de poule
              </div>
            ))}
          <div style={{ color: byeCount === 0 ? CT.green : CT.yellow, fontWeight: 800, marginTop: 2 }}>
            <EmoText s="🏆" size={12} /> Tableau final de {bracketSize} {byeCount === 0 ? "· 👍 aucun exempt" : `· ⚠️ ${byeCount} exempt${byeCount > 1 ? "s" : ""}`}
          </div>
        </div>
      </div>

      {/* §9.2 Départ du tableau */}
      <SectionLabel hint={`(${qualifiedCount} ${uniteQ})`}>Départ du tableau</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sizeOptions.map((s) => {
          const ex = s - qualifiedCount;
          const firstRound = ROUND_LABEL[roundsForBracket(s)[0]];
          return (
            <ChoiceCard
              key={s}
              title={firstRound}
              selected={bracketSize === s}
              ariaLabel={`Tableau de ${s}`}
              onClick={() => set({ bracketSize: s })}
              lines={[
                { icon: "🎯", text: `Tableau de ${s} · ${s - 1} matchs`, strong: true },
                ex === 0 ? { icon: "👍", text: "Tout le monde joue (aucun exempt)" } : { icon: "⚠️", text: `${ex} exempt${ex > 1 ? "s" : ""} au 1er tour` },
              ]}
            />
          );
        })}
      </div>

      {/* §9.4 Aperçu des croisements */}
      {Array.isArray(crossings) && crossings.length > 0 && (
        <>
          <SectionLabel>Aperçu des premiers matchs</SectionLabel>
          <div style={{ border: `1px solid ${CT.border}`, borderRadius: 12, padding: "12px 14px", background: CT.cardHi }}>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: CT.accent, marginBottom: 8, letterSpacing: 0.2 }}>
              {(ROUND_LABEL[rounds[0]] || "").toUpperCase()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {crossings.map((c, i) => (
                <div key={i} style={{ fontSize: 12.5, color: CT.text, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ flex: 1, textAlign: "right", fontWeight: 600 }}>{c.a}</span>
                  <span style={{ color: CT.muted, fontWeight: 800, fontSize: 11 }}>VS</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{c.b}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* §9.5 / §9.6 Options podium & repêchage */}
      <SectionLabel>Options</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <ToggleRow
          on={petiteFinale}
          disabled={!peutPetite}
          emoji="🥉"
          title="Petite finale (3e place)"
          subtitle="Les 2 perdants des demies jouent pour le podium."
          offReason="Disponible à partir des demi-finales (tableau de 4)."
          onToggle={() => set({ petiteFinale: !petiteFinale })}
        />
        <ToggleRow
          on={consolante}
          disabled={!peutConso}
          emoji="🎖️"
          title="Consolante (repêchage)"
          subtitle={`Les ${nbConso} meilleures ${unite} non qualifiées de chaque poule (${consoCount} au total) jouent un 2e tableau.`}
          offReason="Il faut au moins 2 équipes repêchables (poules assez grandes)."
          onToggle={() => set({ consolante: !consolante })}
        />
      </div>
      {consolante && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, color: CT.muted, marginBottom: 6 }}>Combien de {unite} non qualifiées par poule ?</div>
          <div style={{ display: "flex", gap: 8 }}>
            {[2, 3].map((n) => {
              const cc = computeConsolationCount(poolGroups, nbQual, n);
              const bye = consolationByeCount(cc);
              const sel = nbConso === n;
              return (
                <button
                  key={n}
                  onClick={() => set({ nbConso: n })}
                  aria-pressed={sel}
                  style={{
                    flex: 1,
                    minHeight: 56,
                    borderRadius: 12,
                    border: `1.5px solid ${sel ? CT.accent : CT.border}`,
                    background: sel ? CT.accent + "1f" : CT.card,
                    color: sel ? CT.accent : CT.text,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    touchAction: "manipulation",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800 }}>Les {n} premières</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: bye === 0 ? CT.green : CT.yellow }}>
                    {cc} {unite} · {bye === 0 ? "✅" : `${bye} exempt${bye > 1 ? "s" : ""}`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* §9.7 Manches par tour */}
      <SectionLabel hint="(premier à…)">Manches par tour</SectionLabel>
      <div style={{ fontSize: 11.5, color: CT.muted, marginBottom: 8 }}>Astuce : des matchs plus longs vers la fin (ex. 2 → 3 → 5).</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: CT.muted, fontWeight: 700, flexShrink: 0 }}>Tous les tours :</span>
        <NumberPills values={[1, 2, 3, 4, 5]} value={null} onPick={setAllManches} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {usedPhases.map((ph) => (
          <div key={ph} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: 1, fontSize: 12.5, color: CT.text, fontWeight: 600 }}>{ROUND_LABEL[ph]}</span>
            <div style={{ display: "flex", gap: 5 }}>
              {[1, 2, 3, 4, 5].map((m) => {
                const sel = manchesForPhase(ph, manchesMap) === m;
                return (
                  <button
                    key={m}
                    onClick={() => setManche(ph, m)}
                    aria-label={`${ROUND_LABEL[ph]} : ${m} manche${m > 1 ? "s" : ""}`}
                    style={{
                      width: 34,
                      height: 38,
                      borderRadius: 9,
                      border: `1.5px solid ${sel ? CT.accent : CT.border}`,
                      background: sel ? CT.accent + "1f" : CT.card,
                      color: sel ? CT.accent : CT.text,
                      fontWeight: sel ? 800 : 600,
                      fontSize: 14,
                      cursor: "pointer",
                      touchAction: "manipulation",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* §9.8 Cibles en phase finale */}
      <SectionLabel hint="(jeux de fléchettes en parallèle)">Cibles pour le tableau final</SectionLabel>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
        <button
          onClick={() => set({ finalTargets: Math.max(1, finalTargets - 1) })}
          aria-label="Une cible de moins (tableau)"
          style={{ width: 46, height: 46, borderRadius: 12, border: `1px solid ${CT.border}`, background: CT.card, color: CT.text, fontSize: 24, fontWeight: 800, cursor: "pointer", touchAction: "manipulation" }}
        >
          −
        </button>
        <span style={{ fontWeight: 800, fontSize: 28, color: CT.accent, minWidth: 40, textAlign: "center" }}>{finalTargets}</span>
        <button
          onClick={() => set({ finalTargets: Math.min(12, finalTargets + 1) })}
          aria-label="Une cible de plus (tableau)"
          style={{ width: 46, height: 46, borderRadius: 12, border: `1px solid ${CT.border}`, background: CT.card, color: CT.text, fontSize: 24, fontWeight: 800, cursor: "pointer", touchAction: "manipulation" }}
        >
          +
        </button>
      </div>
      <div
        style={{
          marginTop: 10,
          background: CT.blue + "12",
          border: `1px solid ${CT.blue}44`,
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 12.5,
          color: CT.blue,
          fontWeight: 700,
        }}
      >
        ⏱️ Durée estimée du tableau : environ{" "}
        {formatDuration(
          estimateBracketDuration({
            qualifiedCount,
            availableTargets: finalTargets,
            manchesMap,
            averageMatchDuration: config.averageMatchDuration || 15,
            petiteFinale,
            consolante,
            consolationTeams: consoCount,
          })
        )}
        <div style={{ fontSize: 10.5, color: CT.muted, fontWeight: 500, marginTop: 2 }}>Estimation indicative.</div>
      </div>

      {/* Note : placement intelligent (têtes de série séparées, pas de retrouvailles trop tôt). */}
      <div style={{ fontSize: 11.5, color: CT.muted, marginTop: 16, lineHeight: 1.4 }}>
        ⚖️ Le placement dans le tableau est <b style={{ color: CT.text }}>intelligent</b> : les 1ers de poule sont séparés et on évite les retrouvailles trop tôt.
      </div>
    </div>
  );
};

// ── Bouton « ✏️ Modifier » discret ───────────────────────────────────────────
const EditBtn = ({ label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      background: "transparent",
      border: `1px solid ${CT.border}`,
      color: CT.muted,
      borderRadius: 8,
      padding: "6px 12px",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      touchAction: "manipulation",
    }}
  >
    ✏️ {label}
  </button>
);

// ── ÉTAPE 4 : Récapitulatif avant lancement ──────────────────────────────────
export const StepResume = ({ phase, config, participantCount, context = {}, onEditStep }) => {
  if (phase === "tableau") {
    const { qualifiedCount = 0, nbQual = 2, poolGroups = [], format = "simple" } = context;
    const nbConso = config.nbConso || 2;
    const consoCount = computeConsolationCount(poolGroups, nbQual, nbConso);
    const bracketSize = config.bracketSize || getNextBracketSize(qualifiedCount);
    const summary = buildBracketConfigurationSummary({
      qualifiedCount,
      bracketSize,
      manchesMap: config.manchesMap || {},
      petiteFinale: config.petiteFinale !== false && bracketSize >= 4,
      consolante: config.consolante !== false && consoCount >= 2,
      consolationTeams: consoCount,
      availableTargets: config.finalTargets || context.poolTargets || 2,
      averageMatchDuration: config.averageMatchDuration || 15,
      format,
    });
    return (
      <div>
        <h2 style={{ fontSize: 19, fontWeight: 800, color: CT.text, margin: "0 0 4px" }}>
          <EmoText s="✅" size={18} /> Résumé du tableau
        </h2>
        <p style={{ fontSize: 13, color: CT.muted, margin: "0 0 8px" }}>Vérifie avant de lancer le tableau final.</p>
        <SummaryBanner summary={summary} title="Résumé du tableau" />
        <div style={{ marginTop: 12 }}>
          <EditBtn label="Modifier le tableau" onClick={() => onEditStep(0)} />
        </div>
      </div>
    );
  }

  // Phase poules : combine Format + Poules.
  const groups = distributePools(participantCount, poolCountFromSize(participantCount, config.playersPerPool || 4));
  const summary = buildPoolConfigurationSummary({
    playerCount: participantCount,
    groups,
    qualifiersPerPool: config.qualifiersPerPool || 2,
    manches: config.manches || 2,
    availableTargets: config.availableTargets || 1,
    averageMatchDuration: config.averageMatchDuration || 15,
    format: config.format,
  });
  return (
    <div>
      <h2 style={{ fontSize: 19, fontWeight: 800, color: CT.text, margin: "0 0 4px" }}>
        <EmoText s="✅" size={18} /> Résumé
      </h2>
      <p style={{ fontSize: 13, color: CT.muted, margin: "0 0 8px" }}>Tout est prêt ? Vérifie avant de lancer les poules.</p>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 13, color: CT.text, fontWeight: 700, flex: 1 }}>
          <EmoText s="🎯" size={13} /> Mode {config.mode} · {config.format === "doublette" ? "Doublette" : "Simple"}
        </span>
        <EditBtn label="Format" onClick={() => onEditStep(0)} />
      </div>

      <SummaryBanner summary={summary} title="Résumé des poules" />
      <div style={{ marginTop: 12 }}>
        <EditBtn label="Modifier les poules" onClick={() => onEditStep(1)} />
      </div>
    </div>
  );
};

// ── Overlay de confirmation avant lancement (§11) ────────────────────────────
const ConfirmLaunch = ({ phase, lines, onCancel, onConfirm, saving }) => (
  <div style={{ position: "absolute", inset: 0, background: "#000000d9", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 5 }}>
    <div style={{ background: CT.cardHi, border: `1px solid ${CT.border}`, borderRadius: 16, padding: 22, maxWidth: 380, width: "100%" }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: CT.text, marginBottom: 10, textAlign: "center" }}>
        {phase === "tableau" ? "🏆 Lancer le tableau ?" : "🏟️ Lancer les poules ?"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: 13.5, color: CT.text, fontWeight: 600, textAlign: "center" }}>{l}</div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: CT.yellow, textAlign: "center", marginBottom: 16, lineHeight: 1.4 }}>
        ⚠️ Une fois lancé, certains réglages principaux ne pourront plus être modifiés.
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={onCancel}
          disabled={saving}
          style={{ flex: 1, background: "transparent", border: `1px solid ${CT.border}`, color: CT.muted, borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, cursor: "pointer", minHeight: 48 }}
        >
          Annuler
        </button>
        <button
          onClick={onConfirm}
          disabled={saving}
          style={{ flex: 1, background: CT.accent, border: "none", color: "#fff", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: saving ? 0.6 : 1, minHeight: 48 }}
        >
          {saving ? "…" : phase === "tableau" ? "Lancer le tableau" : "Lancer les poules"}
        </button>
      </div>
    </div>
  </div>
);

// ── Placeholder d'étape (temporaire, pour les étapes pas encore construites) ─
const StepPlaceholder = ({ titre, emoji }) => (
  <div style={{ textAlign: "center", padding: "40px 10px", color: CT.muted }}>
    <div style={{ fontSize: 40, marginBottom: 10 }}>
      <EmoText s={emoji} size={40} />
    </div>
    <div style={{ fontSize: 17, fontWeight: 800, color: CT.text, marginBottom: 6 }}>{titre}</div>
    <div style={{ fontSize: 13 }}>🚧 Cet écran est en cours de construction.</div>
  </div>
);

// ── Coquille de l'assistant ──────────────────────────────────────────────────
export const TournoiSetupWizard = ({
  phase = "poules", // "poules" | "tableau"
  participants = [],
  initialConfig = {},
  matchsExistent = false,
  saving = false,
  tableauContext = {},
  onCancel,
  onLaunchPoules,
  onLaunchBracket,
}) => {
  const participantCount = participants.length;
  const [config, setConfig] = useState({
    mode: "501",
    format: "simple",
    qualifiersPerPool: 2,
    manches: 2,
    availableTargets: 2,
    averageMatchDuration: 15,
    repartition: "aleatoire",
    ...initialConfig,
  });

  // Étapes selon la phase.
  const steps =
    phase === "tableau" ? ["Tableau", "Résumé"] : ["Format", "Poules", "Résumé"];
  const [step, setStep] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const back = () => (isFirst ? onCancel && onCancel() : setStep((s) => s - 1));
  const next = () => {
    if (!isLast) return setStep((s) => s + 1);
    setConfirming(true); // dernière étape → confirmation (§11)
  };
  const doLaunch = () => {
    if (phase === "tableau") onLaunchBracket && onLaunchBracket(config);
    else onLaunchPoules && onLaunchPoules(config);
  };

  // Récap court pour la confirmation.
  const confirmLines = (() => {
    if (phase === "tableau") {
      const qc = tableauContext.qualifiedCount || 0;
      const bs = config.bracketSize || getNextBracketSize(qc);
      return [`${qc} ${tableauContext.format === "doublette" ? "équipes qualifiées" : "qualifiés"}`, `Tableau de ${bs}`];
    }
    const groups = distributePools(participantCount, poolCountFromSize(participantCount, config.playersPerPool || 4));
    const totalMatches = groups.reduce((t, g) => t + matchesInPool(g), 0);
    const unite = config.format === "doublette" ? "équipes" : "joueurs";
    return [`${participantCount} ${unite}`, `${groups.length} poules`, `${totalMatches} matchs générés`];
  })();

  const primaryLabel = (() => {
    if (isLast) return phase === "tableau" ? "🏆 Lancer le tableau" : "✅ Lancer les poules";
    if (phase === "poules" && step === 0) return "Continuer vers les poules";
    if (phase === "poules" && step === 1) return "Voir le résumé";
    return "Continuer";
  })();

  const renderStep = () => {
    if (phase === "tableau") {
      if (step === 0) return <StepTableau config={config} onChange={setConfig} context={tableauContext} />;
      return <StepResume phase="tableau" config={config} participantCount={participantCount} context={tableauContext} onEditStep={setStep} />;
    }
    if (step === 0)
      return (
        <StepFormat
          config={config}
          participantCount={participantCount}
          locked={matchsExistent}
          onChange={setConfig}
        />
      );
    if (step === 1)
      return <StepPoules config={config} participantCount={participantCount} onChange={setConfig} />;
    return <StepResume phase="poules" config={config} participantCount={participantCount} onEditStep={setStep} />;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: CT.bg,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* En-tête */}
      <div
        style={{
          padding: "16px 16px 0",
          maxWidth: 520,
          width: "100%",
          margin: "0 auto",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: CT.text }}>
            <EmoText s="🍺" size={16} /> Nouveau tournoi
          </div>
          <button
            onClick={onCancel}
            aria-label="Fermer l'assistant"
            style={{
              background: "none",
              border: "none",
              color: CT.muted,
              fontSize: 22,
              lineHeight: 1,
              cursor: "pointer",
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        <TournamentSetupStepper steps={steps} current={step} />
      </div>

      {/* Contenu défilant */}
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ maxWidth: 520, width: "100%", margin: "0 auto", padding: "0 16px 24px" }}>
          {renderStep()}
        </div>
      </div>

      {/* Barre d'action collante (safe-area iOS/Android) */}
      <div
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${CT.border}`,
          background: CT.bg,
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            display: "flex",
            gap: 10,
            alignItems: "center",
          }}
        >
          <button
            onClick={back}
            disabled={saving}
            style={{
              flexShrink: 0,
              background: "transparent",
              border: `1px solid ${CT.border}`,
              color: CT.muted,
              borderRadius: 12,
              padding: "13px 16px",
              fontSize: 13.5,
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              minHeight: 48,
              touchAction: "manipulation",
            }}
          >
            {isFirst ? "Annuler" : "‹ Retour"}
          </button>
          <button
            onClick={next}
            disabled={saving}
            style={{
              flex: 1,
              background: CT.accent,
              border: "none",
              color: "#fff",
              borderRadius: 12,
              padding: "13px 16px",
              fontSize: 15,
              fontWeight: 800,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.6 : 1,
              minHeight: 48,
              touchAction: "manipulation",
            }}
          >
            {saving ? "…" : primaryLabel}
          </button>
        </div>
      </div>

      {confirming && (
        <ConfirmLaunch
          phase={phase}
          lines={confirmLines}
          saving={saving}
          onCancel={() => setConfirming(false)}
          onConfirm={doLaunch}
        />
      )}
    </div>
  );
};

// (L'aperçu de test autonome a été retiré : l'assistant est branché dans le vrai flux du tournoi.)
