// S6 — Line shopping contro la chiusura di Pinnacle.
//
// L'unico "modello" con basi documentate per piccoli guadagni costanti — e non
// usa affatto il nostro Dixon (che è più debole del mercato, dimostrato):
//   1. Probabilità eque = quote di chiusura Pinnacle senza margine (Shin).
//      Pinnacle in chiusura è il miglior stimatore disponibile del risultato.
//   2. Se la QUOTA MASSIMA di mercato (MaxC*, migliore fra ~40 book, stesso
//      istante della chiusura) supera il prezzo equo → edge = p_equa × max − 1 > 0
//      → scommessa a valore positivo secondo il mercato stesso.
//
// Niente sguardo al futuro: PSC* e MaxC* sono entrambe quote di CHIUSURA.
// (Bet365 apertura NON si può usare qui: confrontarla con la chiusura sarebbe
// barare temporalmente.)
//
// Caveat da non dimenticare: la quota Max è il prezzo migliore fra ~40 book —
// nella pratica servono più conti, e i book limitano chi vince. Il test con
// "taglio" (haircut sulla quota) simula di NON prendere sempre il prezzo top.
//
// Uso:  node scripts/s6-lineshopping.js

import { readFileSync } from 'node:fs';
import { togliMargine } from '../lib/mercato.js';

const cache = JSON.parse(readFileSync(new URL('../.cache/partite.json', import.meta.url), 'utf8'));

// Partite con Pinnacle chiusura e Max chiusura (dal 2019/20).
const righe = cache.filter(r => r.ps_1 && r.ps_x && r.ps_2 && r.max_1 && r.max_x && r.max_2);

function corri(metodo, taglio) {
  // per soglia di edge: {stake, profit, n, perStagione: Map}
  const soglie = [0, 0.01, 0.02, 0.03, 0.05];
  const acc = soglie.map(() => ({ stake: 0, profit: 0, n: 0, profitti: [], perStag: new Map() }));

  for (const r of righe) {
    const fair = togliMargine([r.ps_1, r.ps_x, r.ps_2], metodo);
    const max = [r.max_1, r.max_x, r.max_2].map(q => 1 + (q - 1) * (1 - taglio));
    const esito = r.gol_casa > r.gol_trasferta ? 0 : r.gol_casa === r.gol_trasferta ? 1 : 2;
    for (let i = 0; i < 3; i++) {
      const edge = fair[i] * max[i] - 1;
      for (let s = 0; s < soglie.length; s++) {
        if (edge > soglie[s]) {
          const a = acc[s];
          const p = esito === i ? max[i] - 1 : -1;
          a.stake += 1; a.n += 1; a.profit += p; a.profitti.push(p);
          if (!a.perStag.has(r.stagione)) a.perStag.set(r.stagione, { stake: 0, profit: 0 });
          const st = a.perStag.get(r.stagione);
          st.stake += 1; st.profit += p;
        }
      }
    }
  }
  return { soglie, acc };
}

function ic95(a) {
  const media = a.profit / a.n;
  let v = 0;
  for (const p of a.profitti) v += (p - media) ** 2;
  const se = Math.sqrt(v / (a.n - 1) / a.n);
  return [media - 1.96 * se, media + 1.96 * se];
}

console.log(`S6 — line shopping vs chiusura Pinnacle · ${righe.length} partite (dal 2019/20)\n`);

for (const metodo of ['proporzionale', 'shin']) {
  console.log(`=== probabilità eque: ${metodo} ===`);
  console.log('  soglia edge   n bet     ROI      [IC 95%]');
  const { soglie, acc } = corri(metodo, 0);
  for (let s = 0; s < soglie.length; s++) {
    const a = acc[s];
    if (!a.n) continue;
    const [lo, hi] = ic95(a);
    console.log(`  >${(soglie[s] * 100).toFixed(0)}%        ${String(a.n).padStart(7)}   ${(100 * a.profit / a.stake).toFixed(2).padStart(7)}%   [${(lo * 100).toFixed(2)}%, ${(hi * 100).toFixed(2)}%]`);
  }
  console.log();
}

// Consistenza per stagione (la domanda di Mattia: "costanti?") — config shin, edge >2%.
const { acc } = corri('shin', 0);
const rif = acc[2]; // soglia 2%
console.log('=== Costanza per stagione (shin, edge >2%) ===');
console.log('  stagione   n bet    ROI');
for (const [stag, st] of [...rif.perStag.entries()].sort()) {
  console.log(`  ${stag}      ${String(st.stake).padStart(6)}   ${(100 * st.profit / st.stake).toFixed(2).padStart(7)}%`);
}

// Sensibilità al prezzo: e se non prendo il top di mercato ma un po' meno?
console.log('\n=== Se NON prendi sempre il prezzo migliore (haircut sulla quota Max, shin, >2%) ===');
console.log('  taglio    n bet     ROI');
for (const t of [0, 0.01, 0.02, 0.03]) {
  const { acc } = corri('shin', t);
  const a = acc[2];
  if (!a.n) continue;
  console.log(`  −${(t * 100).toFixed(0)}%      ${String(a.n).padStart(7)}   ${(100 * a.profit / a.stake).toFixed(2).padStart(7)}%`);
}
