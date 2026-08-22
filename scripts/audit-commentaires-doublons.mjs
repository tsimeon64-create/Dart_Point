// LECTURE SEULE — répond à la question « qui a réellement écrit ce commentaire ? »
//
// Usage :  node scripts/audit-commentaires-doublons.mjs [pseudo]
//   ex.    node scripts/audit-commentaires-doublons.mjs Thomas
//
// 1. Cherche les comptes HOMONYMES (plusieurs joueurs avec le même pseudo, ou une
//    variante de casse) — l'explication la plus banale d'un « commentaire que je
//    n'ai pas écrit » signé de mon pseudo.
// 2. Liste les commentaires signés de ce pseudo avec leur joueur_id réel.
// 3. Détecte les VRAIS doublons : même post + même auteur + même texte à moins de
//    2 min d'intervalle (artefact du double-envoi corrigé côté app).
//
// Aucune écriture, aucune donnée personnelle affichée (ni e-mail, ni photo).

const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";

const sb = async (p) => {
  const r = await fetch(`${SB_URL}/rest/v1/${p}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
};

const PSEUDO = (process.argv[2] || "Thomas").trim();
const enc = encodeURIComponent;
const dt = (ts) => (ts ? new Date(Number(ts)).toLocaleString("fr-FR") : "—");
const court = (id) => (id ? String(id).slice(0, 8) : "—");

(async () => {
  console.log(`\n🔎 Audit des commentaires pour le pseudo « ${PSEUDO} »\n${"─".repeat(60)}`);

  // ── 1. Comptes homonymes ────────────────────────────────────────────────────
  const comptes = await sb(`joueurs?pseudo=ilike.*${enc(PSEUDO)}*&select=id,pseudo,photo,date_inscription`);
  console.log(`\n1) COMPTES portant ce pseudo (ou une variante) : ${comptes.length}`);
  for (const c of comptes) {
    console.log(`   • ${c.pseudo.padEnd(18)} id=${court(c.id)}…  photo=${c.photo ? "oui" : "NON"}  inscrit=${c.date_inscription || "?"}`);
  }
  if (comptes.length > 1) {
    console.log(`   ⚠️  ${comptes.length} comptes différents portent ce pseudo.`);
    console.log(`       → un commentaire « ${PSEUDO} » peut donc venir de quelqu'un d'autre,`);
    console.log(`         sans le moindre piratage : c'est juste un homonyme.`);
  }
  const idsConnus = new Set(comptes.map((c) => c.id));

  // ── 2. Commentaires signés de ce pseudo ─────────────────────────────────────
  const comms = await sb(
    `wall_comments?joueur_pseudo=ilike.*${enc(PSEUDO)}*&order=date.desc&limit=60&select=id,ref_id,joueur_id,joueur_pseudo,contenu,date`
  );
  console.log(`\n2) COMMENTAIRES signés « ${PSEUDO} » : ${comms.length} (60 plus récents)`);
  for (const c of comms) {
    // Marque simplement les auteurs qui ne font pas partie des comptes homonymes ;
    // le verdict « compte introuvable » est établi plus bas, contre la table entière.
    const autre = c.joueur_id && !idsConnus.has(c.joueur_id) ? "  ← autre compte" : "";
    console.log(`   ${dt(c.date).padEnd(20)} auteur=${court(c.joueur_id)}…  post=${court(c.ref_id)}…${autre}`);
    console.log(`      « ${String(c.contenu).slice(0, 70)} »`);
  }

  // Répartition par auteur réel.
  // ⚠ On vérifie chaque joueur_id contre la table `joueurs` ENTIÈRE (et pas seulement
  // contre les comptes dont le pseudo contient PSEUDO) : sinon un joueur qui a changé
  // de pseudo depuis son commentaire serait signalé « introuvable » à tort.
  const parAuteur = {};
  for (const c of comms) (parAuteur[c.joueur_id || "null"] ||= []).push(c);
  const auteurs = Object.keys(parAuteur).filter((a) => a !== "null");
  const reels = auteurs.length
    ? await sb(`joueurs?id=in.(${auteurs.join(",")})&select=id,pseudo`)
    : [];
  const pseudoActuel = Object.fromEntries(reels.map((j) => [j.id, j.pseudo]));

  console.log(`\n   → Ces commentaires proviennent de ${auteurs.length} compte(s) distinct(s) :`);
  for (const a of auteurs) {
    const actuel = pseudoActuel[a];
    let etat;
    if (!actuel) etat = "⚠️ COMPTE INTROUVABLE (supprimé/anonymisé… ou ligne forgée)";
    else if (actuel.toLowerCase().includes(PSEUDO.toLowerCase())) etat = `= ${actuel}`;
    else etat = `↪ ce compte s'appelle aujourd'hui « ${actuel} » (pseudo changé — normal)`;
    console.log(`      ${court(a)}…  ${parAuteur[a].length} commentaire(s)  ${etat}`);
  }
  if (parAuteur["null"]) {
    console.log(`      (sans id)   ${parAuteur["null"].length} commentaire(s)  ⚠️ aucun auteur enregistré`);
  }
  const introuvables = auteurs.filter((a) => !pseudoActuel[a]);
  if (introuvables.length) {
    console.log(`\n   ⚠️  ${introuvables.length} identifiant(s) ne correspondent à AUCUN compte.`);
    console.log(`       Causes possibles : compte supprimé/anonymisé depuis (bénin),`);
    console.log(`       ou ligne insérée directement via l'API avec un id inventé (usurpation).`);
    console.log(`       → à recouper avec la date du commentaire et tes suppressions de comptes.`);
  }
  if (auteurs.length > 1) {
    console.log(`   ⚠️  Plusieurs comptes écrivent sous ce pseudo → vérifie lesquels sont bien toi.`);
  }

  // ── 3. Vrais doublons (même post + même auteur + même texte < 2 min) ────────
  console.log(`\n3) DOUBLONS (même post, même auteur, même texte, < 2 min d'écart)`);
  const tous = await sb(`wall_comments?order=date.asc&limit=2000&select=id,ref_id,joueur_id,joueur_pseudo,contenu,date`);
  const vus = new Map();
  const doublons = [];
  for (const c of tous) {
    const cle = `${c.ref_id}|${c.joueur_id}|${c.contenu}`;
    const prec = vus.get(cle);
    if (prec && Math.abs((c.date || 0) - (prec.date || 0)) < 120000) doublons.push([prec, c]);
    else vus.set(cle, c);
  }
  if (doublons.length === 0) {
    console.log(`   ✅ Aucun doublon sur les ${tous.length} commentaires analysés.`);
    console.log(`      → si un message apparaît « deux fois » à l'écran, ce sont donc`);
    console.log(`        DEUX AUTEURS différents (homonymes), pas un double-envoi.`);
  } else {
    console.log(`   ⚠️  ${doublons.length} doublon(s) détecté(s) :`);
    for (const [a, b] of doublons) {
      console.log(`   • ${a.joueur_pseudo} — « ${String(a.contenu).slice(0, 50)} »`);
      console.log(`     ${dt(a.date)}  puis  ${dt(b.date)}   (ids ${court(a.id)}… / ${court(b.id)}…)`);
    }
    console.log(`\n   → C'est l'artefact du double-envoi (touche « Entrée » + clic « Envoyer »),`);
    console.log(`     corrigé côté app. Ces lignes peuvent être supprimées en base sans risque.`);
  }

  console.log(`\n${"─".repeat(60)}\nTerminé — aucune écriture effectuée.\n`);
})().catch((e) => {
  console.error("\n❌ Échec :", e.message);
  console.error("   (Vérifie ta connexion internet — le script lit la base en clé publique.)\n");
  process.exit(1);
});
