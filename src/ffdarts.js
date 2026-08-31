// src/ffdarts.js — Ligues et départements
//
// Sert à la CARTOGRAPHIE DES JOUEURS : savoir qui joue près de chez soi.
// Les 7 ligues sont celles de la Fédération Française de Darts (ffdarts.fr).

export const LIGUES = [
  "Ligue Aquitaine",
  "Ligue Bretagne",
  "Ligue Est",
  "Ligue Nord",
  "Ligue Pays de la Loire",
  "Ligue Sud-Est",
  "Ligue Sud-Ouest",
];

// Départements français. La clé est ce qu'on enregistre (le numéro), le libellé
// n'est là que pour la liste déroulante.
// ⚠️ La Corse s'écrit 2A et 2B, pas 20 : un numéro de département n'est donc PAS
// un nombre. Toujours le traiter comme du texte, sinon "2A" devient 2 et l'Ain.
export const DEPARTEMENTS = [
  ["01","Ain"],["02","Aisne"],["03","Allier"],["04","Alpes-de-Haute-Provence"],
  ["05","Hautes-Alpes"],["06","Alpes-Maritimes"],["07","Ardèche"],["08","Ardennes"],
  ["09","Ariège"],["10","Aube"],["11","Aude"],["12","Aveyron"],
  ["13","Bouches-du-Rhône"],["14","Calvados"],["15","Cantal"],["16","Charente"],
  ["17","Charente-Maritime"],["18","Cher"],["19","Corrèze"],["2A","Corse-du-Sud"],
  ["2B","Haute-Corse"],["21","Côte-d'Or"],["22","Côtes-d'Armor"],["23","Creuse"],
  ["24","Dordogne"],["25","Doubs"],["26","Drôme"],["27","Eure"],
  ["28","Eure-et-Loir"],["29","Finistère"],["30","Gard"],["31","Haute-Garonne"],
  ["32","Gers"],["33","Gironde"],["34","Hérault"],["35","Ille-et-Vilaine"],
  ["36","Indre"],["37","Indre-et-Loire"],["38","Isère"],["39","Jura"],
  ["40","Landes"],["41","Loir-et-Cher"],["42","Loire"],["43","Haute-Loire"],
  ["44","Loire-Atlantique"],["45","Loiret"],["46","Lot"],["47","Lot-et-Garonne"],
  ["48","Lozère"],["49","Maine-et-Loire"],["50","Manche"],["51","Marne"],
  ["52","Haute-Marne"],["53","Mayenne"],["54","Meurthe-et-Moselle"],["55","Meuse"],
  ["56","Morbihan"],["57","Moselle"],["58","Nièvre"],["59","Nord"],
  ["60","Oise"],["61","Orne"],["62","Pas-de-Calais"],["63","Puy-de-Dôme"],
  ["64","Pyrénées-Atlantiques"],["65","Hautes-Pyrénées"],["66","Pyrénées-Orientales"],
  ["67","Bas-Rhin"],["68","Haut-Rhin"],["69","Rhône"],["70","Haute-Saône"],
  ["71","Saône-et-Loire"],["72","Sarthe"],["73","Savoie"],["74","Haute-Savoie"],
  ["75","Paris"],["76","Seine-Maritime"],["77","Seine-et-Marne"],["78","Yvelines"],
  ["79","Deux-Sèvres"],["80","Somme"],["81","Tarn"],["82","Tarn-et-Garonne"],
  ["83","Var"],["84","Vaucluse"],["85","Vendée"],["86","Vienne"],
  ["87","Haute-Vienne"],["88","Vosges"],["89","Yonne"],["90","Territoire de Belfort"],
  ["91","Essonne"],["92","Hauts-de-Seine"],["93","Seine-Saint-Denis"],["94","Val-de-Marne"],
  ["95","Val-d'Oise"],
  ["971","Guadeloupe"],["972","Martinique"],["973","Guyane"],["974","La Réunion"],
  ["975","Saint-Pierre-et-Miquelon"],["976","Mayotte"],["977","Saint-Barthélemy"],
  ["978","Saint-Martin"],["984","Terres australes"],["986","Wallis-et-Futuna"],
  ["987","Polynésie française"],["988","Nouvelle-Calédonie"],
];

const NOMS_DEP = Object.fromEntries(DEPARTEMENTS);
export const nomDepartement = (num) => NOMS_DEP[String(num || "").trim()] || "";

// Numéro de département à partir d'un code postal.
// ⚠️ Trois pièges : la Corse (20xxx → 2A/2B), l'outre-mer (97xxx → 3 chiffres),
// et les codes postaux qui perdent leur zéro de tête quand ils passent par un
// nombre ("1000" pour l'Ain au lieu de "01000").
export const departementDepuisCP = (cp) => {
  const s = String(cp || "").replace(/\D/g, "").padStart(5, "0");
  if (s.length !== 5) return "";
  if (s.startsWith("97") || s.startsWith("98")) return s.slice(0, 3);
  if (s.startsWith("20")) {
    // 20000–20199 = Corse-du-Sud, au-delà = Haute-Corse. Découpage officiel.
    return Number(s) < 20200 ? "2A" : "2B";
  }
  return s.slice(0, 2);
};

// Cherche le département d'une ville via l'annuaire officiel (gratuit, sans clé).
// Renvoie { departement, cp, ville } ou null. Sert à PROPOSER : le joueur garde
// toujours la main sur la liste déroulante.
export const chercherDepartementVille = async (ville, signal) => {
  const q = String(ville || "").trim();
  if (q.length < 2) return null;
  try {
    const r = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&type=municipality&limit=1`,
      { signal }
    );
    if (!r.ok) return null;
    const p = (await r.json())?.features?.[0]?.properties;
    if (!p?.postcode) return null;
    // ⚠️ SCORE DE CONFIANCE. L'annuaire repond TOUJOURS quelque chose : « Geneve »
    // renvoyait « Genevieres » en Haute-Saone avec un score de 0,43. En dessous de
    // 0,6 on ne propose rien plutot que d'envoyer le joueur dans le mauvais
    // departement. Le champ `score` va de 0 a 1.
    if (typeof p.score === "number" && p.score < 0.6) return null;
    const dep = departementDepuisCP(p.postcode);
    // Un numero absent de la liste ne servirait a rien : le menu deroulant resterait
    // vide et le joueur croirait n'avoir rien choisi.
    if (!NOMS_DEP[dep]) return null;
    return { departement: dep, cp: p.postcode, ville: p.city || p.name || q };
  } catch { return null; }
};

// Âge à partir de la date de naissance (format "AAAA-MM-JJ").
// ⚠️ On ne divise PAS le nombre de jours par 365 : on compare mois et jour, sinon
// l'âge saute un jour trop tôt une année sur quatre.
export const ageDepuisNaissance = (dateNaissance) => {
  // ⚠️ On decoupe la chaine a la main au lieu de passer par new Date() : new Date
  // ("1990-05-04") est interprete en UTC, puis relu en heure LOCALE. En Guadeloupe
  // ou en Polynesie, la date recule d'un jour et l'anniversaire tombait 24 h trop tot.
  const m0 = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateNaissance || "").slice(0, 10));
  if (!m0) return null;
  const [, an, mois, jour] = m0.map(Number);
  const now = new Date();
  let a = now.getFullYear() - an;
  const dm = (now.getMonth() + 1) - mois;
  if (dm < 0 || (dm === 0 && now.getDate() < jour)) a--;
  return a >= 0 && a < 120 ? a : null;
};
