// LECTURE SEULE — réconcilie les 2 méthodes de "DRIX sans bonus" :
//  A) SOUSTRACTION : DRIX_actuel − bonus_perf_reconstruit (clamp ≥0)  [= tableau de l'autre jour]
//  B) REPLAY : ELO pur rejoué depuis 1000, zéro bonus, amical=0       [= prévisionnel récent]
// Et décompose l'écart (négatifs écrêtés par A, duels rivalité, etc.).
const SB_URL = "https://secuyejzngzhnnuweuwm.supabase.co";
const SB_KEY = "sb_publishable_kx6R8ywhyheCFwYMlYwSdA_L9MfqWyC";
const sb = async (p) => { const r = await fetch(`${SB_URL}/rest/v1/${p}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); };
const round = Math.round;
const fetchAll = async (t, sel, order="") => { const out=[]; let off=0; for(;;){ const pg=await sb(`${t}?select=${sel}${order}&limit=1000&offset=${off}`); out.push(...pg); if(pg.length<1000)break; off+=1000;} return out; };

const joueurs = await sb("joueurs?select=id,pseudo,drix&limit=2000");
const nameOf = new Map(joueurs.map(j=>[j.id,j.pseudo]));
const drixAct = new Map(joueurs.map(j=>[j.id,j.drix??1000]));

// ── Méthode A : reconstruction du bonus (comme analyse-bonus-drix.mjs) ──
const duelsAll = await fetchAll("duels","id,challenger_id,defie_id,gagnant_id,manches,type,statut");
const duelById = new Map(duelsAll.map(d=>[d.id,d]));
const mvts = await fetchAll("drix_mouvements","joueur_id,adversaire_pseudo,variation,drix_avant,duel_id,date","&order=date.asc");
const mvtsByDuel = new Map();
for (const m of mvts){ if(!m.duel_id) continue; if(!mvtsByDuel.has(m.duel_id)) mvtsByDuel.set(m.duel_id,[]); mvtsByDuel.get(m.duel_id).push(m); }

const A = new Map(); // jid -> { bonusClamp, negEcrete, nbRiv }
const getA = id => { if(!A.has(id)) A.set(id,{ bonusClamp:0, negEcrete:0, nbRiv:0 }); return A.get(id); };
for (const [duelId, ms] of mvtsByDuel){
  const duel = duelById.get(duelId); if(!duel || ms.length!==2) continue;
  const mC = ms.find(m=>m.joueur_id===duel.challenger_id), mD = ms.find(m=>m.joueur_id===duel.defie_id);
  if(!mC||!mD) continue;
  const drixC = mC.drix_avant??1000, drixD = mD.drix_avant??1000;
  const K = 32*Math.max(1,duel.manches||1);
  const Cwins = duel.gagnant_id===duel.challenger_id;
  const isRiv = duel.type==="rivalite" || /Rivalit/.test(mC.adversaire_pseudo||"") || /Rivalit/.test(mD.adversaire_pseudo||"");
  const EA = 1/(1+Math.pow(10,(drixD-drixC)/400)), EB=1-EA;
  let eloC, eloD;
  if(isRiv){ eloC=Cwins?50:0; eloD=Cwins?0:50; } else { eloC=Cwins?round(K*EB):-round(K*EA); eloD=Cwins?-round(K*EB):round(K*EA); }
  const bC=(mC.variation??0)-eloC, bD=(mD.variation??0)-eloD;
  const aC=getA(duel.challenger_id), aD=getA(duel.defie_id);
  aC.bonusClamp+=Math.max(0,bC); aD.bonusClamp+=Math.max(0,bD);
  aC.negEcrete+=Math.min(0,bC);  aD.negEcrete+=Math.min(0,bD);   // points qu'A n'a PAS retirés (clamp)
  if(isRiv){ aC.nbRiv++; aD.nbRiv++; }
}

// ── Méthode B : replay ELO pur ──
const duelsT = await sb("duels?statut=eq.termine&select=challenger_id,defie_id,gagnant_id,manches,type,date&order=date.asc&limit=2000");
const B = new Map();
const getB = id => { if(!B.has(id)) B.set(id,{elo:1000}); return B.get(id); };
for(const d of duelsT){
  const a=getB(d.challenger_id), b=getB(d.defie_id);
  if(d.type==="amical") continue;
  const K=32*Math.max(1,d.manches||1);
  const EA=1/(1+Math.pow(10,(b.elo-a.elo)/400)), EB=1-EA;
  const Cwins=d.gagnant_id===d.challenger_id;
  a.elo=Math.max(100,a.elo+(Cwins?round(K*EB):-round(K*EA)));
  b.elo=Math.max(100,b.elo+(Cwins?-round(K*EB):round(K*EA)));
}

// ── Rapport ──
const rows = joueurs.filter(j=>A.has(j.id)||B.has(j.id)).map(j=>{
  const a=A.get(j.id)||{bonusClamp:0,negEcrete:0,nbRiv:0}; const b=B.get(j.id)||{elo:1000};
  const act=drixAct.get(j.id)??1000;
  const corrA=Math.max(100, act - a.bonusClamp);
  return { pseudo:j.pseudo, act, corrA, eloB:b.elo, ecart:corrA-b.elo, negEcrete:Math.round(-a.negEcrete), nbRiv:a.nbRiv };
}).sort((x,y)=>y.eloB-x.eloB);

console.log("Réconciliation des 2 méthodes de DRIX-sans-bonus :\n");
console.log("Joueur".padEnd(18),"Actuel".padStart(7),"A:soustr".padStart(9),"B:replay".padStart(9),"écart A−B".padStart(10),"négÉcrêté".padStart(10),"rivalité".padStart(9));
console.log("─".repeat(76));
for(const r of rows){
  console.log(r.pseudo.slice(0,18).padEnd(18),String(r.act).padStart(7),String(r.corrA).padStart(9),String(r.eloB).padStart(9),String(r.ecart).padStart(10),String(r.negEcrete).padStart(10),String(r.nbRiv).padStart(9));
}
console.log("─".repeat(76));
console.log("\nLecture : 'négÉcrêté' = points que la méthode A n'a PAS retirés (bonus reconstruit négatif, ramené à 0).");
console.log("          'rivalité' = nb de duels rivalité (méthode A garde +50 forfaitaire, méthode B = ELO normal).");
console.log("          écart A−B > 0 ⇒ A laisse le joueur plus haut que le replay pur.");
