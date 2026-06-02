// src/icons.jsx — Pont emoji → icône SVG Lucide (conforme design-system MASTER).
// Table centrale + composant <EmoIcon e="🎯" /> qui rend l'icône SVG correspondante.
// Les emojis "fun" sans équivalent Lucide (🍌🤡💩🎪🐟🍀😂🎊…) retombent en emoji.
import {
  Target, Crosshair, Trophy, Flame, Zap, Swords, Gamepad2, BarChart2, TrendingUp, TrendingDown,
  Gem, Star, Crown, Sparkles, Medal, Users, User, Beer, MapPin, Cake, Check, X,
  AlertTriangle, Lock, Key, Search, Settings, LogOut, Camera, MessageCircle, Mail, Pencil, Trash2, Plus,
  Save, Hourglass, Clock, ClipboardList, FileText, Home, Brain, Rocket, Link2, RotateCcw, Undo2,
  Play, Pause, Square, Skull, Snowflake, Turtle, Frown, Activity, CircleSlash, Shield, Bomb, Sprout,
  Dices, Scale, Moon, HeartCrack, Circle, HelpCircle, Bug, Calculator, Hash, Lightbulb, Handshake,
  Calendar, Building2, Globe, ArrowLeft, ArrowRight, ArrowLeftRight, ArrowUp, ArrowDown, Palette,
  Delete, Hand, Ban, Eye, Megaphone, Smile, PartyPopper, Heart, ThumbsUp, Send,
  Flag, Smartphone, BookOpen,
} from "lucide-react";

// Map emoji → composant Lucide. Tout emoji absent de la map reste affiché en emoji (secours).
export const EMOJI_ICON = {
  // Scoring / cibles
  "🎯": Target, "🏹": Crosshair, "💥": Zap, "⚡": Zap, "🔥": Flame,
  // Trophées / rangs / récompenses
  "🏆": Trophy, "👑": Crown, "🥇": Medal, "🥈": Medal, "🥉": Medal, "🏅": Medal,
  "💎": Gem, "⭐": Star, "✨": Sparkles,
  // Données / tendances
  "📊": BarChart2, "📈": TrendingUp, "📉": TrendingDown, "🎢": Activity,
  // Duels / jeux
  "⚔️": Swords, "⚔": Swords, "🛡️": Shield, "🛡": Shield, "🎮": Gamepad2, "🕹️": Gamepad2,
  "🎲": Dices, "💣": Bomb, "🦗": Bug, "🏓": Target,
  // Social / utilisateurs
  "👥": Users, "🫂": Users, "👤": User, "🤝": Handshake, "🧑‍🤝‍🧑": Users, "🧑": User,
  // Lieux
  "🍺": Beer, "🍻": Beer, "📍": MapPin, "🏠": Home, "🏛️": Building2, "🌍": Globe, "🌐": Globe,
  // Statuts / validation
  "✅": Check, "✔️": Check, "✔": Check, "✓": Check, "❌": X, "✕": X, "✖️": X, "❎": X,
  "⚠️": AlertTriangle, "🚫": Ban, "❔": HelpCircle, "❓": HelpCircle,
  // Sécurité / compte
  "🔒": Lock, "🔐": Lock, "🔑": Key, "🚪": LogOut, "🔍": Search, "⚙️": Settings,
  // Actions / édition
  "📸": Camera, "📷": Camera, "💬": MessageCircle, "✉️": Mail, "📧": Mail, "✏️": Pencil, "🗑️": Trash2, "🗑": Trash2,
  "➕": Plus, "💾": Save, "🔗": Link2, "🔄": RotateCcw, "↩️": Undo2, "↩": Undo2,
  "▶️": Play, "▶": Play, "⏸️": Pause, "⏹️": Square, "⏹": Square, "👁️": Eye, "📣": Megaphone, "➤": Send,
  // Temps
  "⏳": Hourglass, "⏰": Clock, "🕐": Clock, "🕑": Clock, "📆": Calendar, "🗓️": Calendar, "📅": Calendar,
  // Listes / docs / aide
  "📋": ClipboardList, "📜": FileText, "📝": FileText, "🧠": Brain, "💡": Lightbulb,
  // Profil / forme / analyse
  "🌱": Sprout, "🧊": Snowflake, "❄️": Snowflake, "🐢": Turtle, "🐌": Turtle,
  "😰": Frown, "😬": Frown, "😴": Moon, "💔": HeartCrack, "🕳️": CircleSlash,
  "⚖️": Scale, "🟢": Circle, "🔴": Circle, "🟡": Circle, "🚀": Rocket, "🎨": Palette,
  // Drapeaux / divers
  "🏳️": Flag, "🏳": Flag, "🏴": Flag, "🏁": Flag, "📱": Smartphone, "📲": Smartphone, "📘": BookOpen, "📖": BookOpen,
  // Maths / chiffres
  "🧮": Calculator, "🔢": Hash,
  // Flèches
  "⬅️": ArrowLeft, "←": ArrowLeft, "➡️": ArrowRight, "→": ArrowRight, "↔️": ArrowLeftRight,
  "⬆️": ArrowUp, "⬇️": ArrowDown, "⌫": Delete,
  // Mort / bust
  "💀": Skull, "☠️": Skull,
  // Réactions positives (utilisées comme icônes d'UI)
  "👏": ThumbsUp, "😱": AlertTriangle, "😊": Smile, "🎉": PartyPopper, "❤️": Heart, "👆": Hand,
};

// Composant : rend l'icône SVG si connue, sinon l'emoji d'origine (secours pour les emojis "fun").
export const EmoIcon = ({ e, size = 14, color = "currentColor", strokeWidth = 2.5, style, fill }) => {
  const I = EMOJI_ICON[e];
  if (I) return <I size={size} color={color} strokeWidth={strokeWidth} style={style} fill={fill} />;
  return <span style={{ fontSize: size, lineHeight: 1, ...style }}>{e}</span>;
};

// Détecte un emoji en tête de chaîne (incl. séquences ZWJ + sélecteur de variante).
const LEAD_EMOJI = /^(\p{Extended_Pictographic}(?:‍\p{Extended_Pictographic})*️?)\s*/u;

// Rend une chaîne du type "🎯 Mon label" comme <icône SVG/> + "Mon label".
// Sans emoji en tête → rend le texte tel quel. Pratique pour les libellés d'onglets/boutons.
export const EmoText = ({ s, size = 14, color = "currentColor", gap = 6, style, strokeWidth = 2.5 }) => {
  if (typeof s !== "string") return s ?? null;
  const m = s.match(LEAD_EMOJI);
  if (!m) return s;
  const rest = s.slice(m[0].length);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap, ...style }}>
      <EmoIcon e={m[1]} size={size} color={color} strokeWidth={strokeWidth} />
      {rest}
    </span>
  );
};
