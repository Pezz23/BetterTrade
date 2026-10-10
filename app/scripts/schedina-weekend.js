// La schedina del weekend a quota obiettivo, dalle partite vere.
//
//   node --env-file=.env scripts/schedina-weekend.js [--quota=5] [--gambe=8]
//                        [--fascia=1.30,1.50] [--ordine=att|resa|quota]
//
// Compone la schedina con le migliori partite entro il limite del weekend
// (martedì compreso, come le spin) e dice **quanto costa in attesa**, perché la
// quota obiettivo da sola non è un'informazione.
//
// ⚠️ Misurato il 10/10/2026 su otto stagioni: una gamba nella fascia dei
// favoriti corti rende ~98% su Bet365, e **la resa di una combinata è il
// prodotto delle rese** — sei gambe costano ~10%, una ne costa 2.
// ⚠️ `--ordine=att` prende le più probabili, che però stanno sulle quote più
// corte, cioè quelle con resa peggiore: selezionare per attendibilità costa
// ~1,7 punti per gamba rispetto alla fascia intera. `--ordine=resa` prende le
// meglio prezzate. Nessuna delle due è dimostrata migliore: con 2.733 partite
// il minimo visibile è ±2,3%, e la differenza in gioco è più piccola.

import { admin } from './_admin.js';
import { valuta, martediChiusura, oggiLocale } from '../src/lib/attendibilita.js';
import { valutaPartita, verso } from '../src/lib/vpm.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d };
const QUOTA = Number(arg('quota', 5));
const GAMBE_MAX = Number(arg('gambe', 8));
const [FLO, FHI] = String(arg('fascia', '1.30,1.50')).split(',').map(Number);
const ORDINE = arg('ordine', 'att');

const limite = martediChiusura();
const { data, error } = await admin.from('prossime_partite').select('*')
  .gte('data', oggiLocale()).lte('data', limite).order('data');
if (error) { console.error('✗', error.message); process.exit(1); }
const { data: datiVpm } = await admin.rpc('vpm_dati');

// Solo segni secchi: la combinata con l'over non ha una quota da nessuna fonte,
// e qui serve moltiplicare numeri veri.
const righe = (data || []).map(valuta)
  .filter(r => r.prob !== null && r.quotaGiocata && r.quotaGiocata >= FLO && r.quotaGiocata < FHI)
  .map(r => ({ ...r, resa: r.quotaGiocata * r.probGiocata, v: datiVpm ? valutaPartita(datiVpm, r) : null }));

const CHIAVE = { att: r => r.probGiocata, resa: r => r.resa, quota: r => r.quotaGiocata };
// ⚠️ Ordine deterministico anche a pari merito: data, poi squadra.
righe.sort((a, b) => CHIAVE[ORDINE](b) - CHIAVE[ORDINE](a)
  || a.data.localeCompare(b.data) || a.casa.localeCompare(b.casa));

console.log(`${righe.length} partite in fascia ${FLO}-${FHI} da oggi a martedì ${limite} · ordine per ${ORDINE}\n`);

const gambe = [];
let q = 1;
for (const r of righe) {
  if (q >= QUOTA || gambe.length >= GAMBE_MAX) break;
  gambe.push(r); q *= r.quotaGiocata;
}

if (q < QUOTA) {
  console.log(`✗ con queste partite si arriva solo a ${q.toFixed(2)}: non basta per ${QUOTA}.`);
  console.log(`  allarga la fascia (--fascia=1.30,1.60) o abbassa l'obiettivo.`);
} else {
  const p = gambe.reduce((a, g) => a * g.probGiocata, 1);
  const resa = gambe.reduce((a, g) => a * g.resa, 1);
  console.log(`SCHEDINA · ${gambe.length} gambe · quota ${q.toFixed(2)}\n`);
  for (const g of gambe) {
    const vv = g.v?.punti != null ? `${g.v.segno} ${g.v.punti.toFixed(2)} ${verso(g.v) === 'contro' ? '⛔' : verso(g.v) === 'conferma' ? '✅' : '·'}` : '—';
    console.log(`  ${g.data.slice(5)} ${g.div.padEnd(4)} ${`${g.casa} - ${g.trasferta}`.padEnd(34)} ${g.giocata.padEnd(3)}` +
      ` @${g.quotaGiocata.toFixed(2)}  att ${(g.probGiocata * 100).toFixed(1)}%  resa ${(g.resa * 100).toFixed(1)}%  VPM ${vv}`);
  }
  console.log(`\n  probabilità che passi    ${(p * 100).toFixed(1)}%   (1 volta su ${(1 / p).toFixed(1)})`);
  console.log(`  resa attesa              ${(resa * 100).toFixed(1)}%   → su 10 € ne tornano ${(resa * 10).toFixed(2)} in media`);
  console.log(`  con 1 gamba sola (la migliore per resa): ${(Math.max(...righe.map(r => r.resa)) * 100).toFixed(1)}%`);
}
console.log('\nNiente è stato scritto.');
