// S4 — Pari/Dispari (gol totali PARI) sulle squadre più "da pareggio".
//
// Ipotesi di Mattia: le squadre che hanno accumulato più pareggi nelle prime
// stagioni tendono a fare risultati pari (0-0, 1-1, 2-0, 2-2…). Test onesto
// e fuori campione: classifico le squadre coi pareggi delle PRIME 4 stagioni
// (2016/17–2019/20), poi misuro il tasso di "Pari" solo nelle stagioni
// SUCCESSIVE (2020/21→). Niente quote Pari/Dispari nei dati → misuro il tasso e
// lo confronto con la quota assunta (1,8 → pareggio al 55,6%).
//
// Uso:  node scripts/s4-pari.js [--quota=1.8]

import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const quotaAssunta = Number((args.find(a => a.startsWith('--quota=')) || '--quota=1.8').split('=')[1]);

const cache = JSON.parse(readFileSync(new URL('../.cache/partite.json', import.meta.url), 'utf8'));
const EARLY = new Set(['1617', '1718', '1819', '1920']);
const LATE = new Set(['2021', '2122', '2223', '2324', '2425', '2526']);

const pari = r => (r.gol_casa + r.gol_trasferta) % 2 === 0;

// Pareggi e partite di ogni squadra nelle prime stagioni.
const early = new Map(); // squadra -> {pareggi, partite}
for (const r of cache) {
  if (!EARLY.has(r.stagione)) continue;
  const draw = r.gol_casa === r.gol_trasferta;
  for (const sq of [r.casa, r.trasferta]) {
    if (!early.has(sq)) early.set(sq, { pareggi: 0, partite: 0 });
    const e = early.get(sq);
    e.partite++; if (draw) e.pareggi++;
  }
}
// Tasso di pareggio nelle prime stagioni (min 30 partite per essere classificabili).
const classifica = [...early.entries()]
  .filter(([, e]) => e.partite >= 30)
  .map(([sq, e]) => ({ sq, tasso: e.pareggi / e.partite, partite: e.partite }))
  .sort((a, b) => b.tasso - a.tasso);

console.log(`S4 — Pari/Dispari · squadre classificabili (prime 4 stagioni): ${classifica.length}`);
console.log(`Le 8 più "da pareggio": ${classifica.slice(0, 8).map(x => `${x.sq} ${(x.tasso * 100).toFixed(0)}%`).join(', ')}\n`);

// Partite delle stagioni successive.
const lateMatches = cache.filter(r => LATE.has(r.stagione));
const baseRate = lateMatches.filter(pari).length / lateMatches.length;
console.log(`Tasso base "Pari" (tutte le partite, stagioni successive): ${(baseRate * 100).toFixed(1)}%  → pareggio a quota ${(1 / baseRate).toFixed(3)}\n`);

// Per varie soglie di selezione, misura il tasso di Pari nelle partite delle
// squadre selezionate. Due criteri: almeno UNA squadra selezionata, o ENTRAMBE.
function valuta(sel, criterio) {
  const scelte = lateMatches.filter(r => {
    const a = sel.has(r.casa), b = sel.has(r.trasferta);
    return criterio === 'entrambe' ? (a && b) : (a || b);
  });
  if (!scelte.length) return null;
  const tasso = scelte.filter(pari).length / scelte.length;
  return { n: scelte.length, tasso };
}

console.log('Selezione = top X% per pareggi nelle prime stagioni. Tasso "Pari" dopo:');
console.log('  soglia      almeno una          entrambe            (pareggio a 1/tasso)');
for (const pct of [0.5, 0.33, 0.25, 0.10]) {
  const n = Math.max(1, Math.round(classifica.length * pct));
  const sel = new Set(classifica.slice(0, n).map(x => x.sq));
  const a = valuta(sel, 'una'), b = valuta(sel, 'entrambe');
  const fmt = v => v ? `${(v.tasso * 100).toFixed(1)}% (n=${v.n})` : '—';
  const be = v => v ? (1 / v.tasso).toFixed(3) : '—';
  console.log(`  top ${(pct * 100).toFixed(0).padStart(2)}%    ${fmt(a).padEnd(20)} ${fmt(b).padEnd(20)} ${be(a)} / ${be(b)}`);
}

// ROI a quota assunta + progressione (1u, se vinci metti via 0,5) sul criterio
// "almeno una", top 25% (una selezione ragionevole).
const selRef = new Set(classifica.slice(0, Math.round(classifica.length * 0.25)).map(x => x.sq));
const scelteRef = lateMatches.filter(r => selRef.has(r.casa) || selRef.has(r.trasferta));
const tassoRef = scelteRef.filter(pari).length / scelteRef.length;
console.log(`\nA quota assunta ${quotaAssunta} sulla selezione top 25% "almeno una" (${scelteRef.length} partite):`);
console.log(`  Tasso Pari ${(tassoRef * 100).toFixed(1)}%  →  ROI a puntata fissa: ${((tassoRef * quotaAssunta - 1) * 100).toFixed(2)}%`);
console.log(`  (pareggia dal ${(100 / quotaAssunta).toFixed(1)}% in su; qui il tasso è ${(tassoRef * 100).toFixed(1)}%)`);
console.log(`\nNota: niente quote reali Pari/Dispari nei dati. Se il mercato le prezza`);
console.log(`come il tasso base (~2,0), il margine del banco le abbassa sotto 1,8 → si perde.`);
