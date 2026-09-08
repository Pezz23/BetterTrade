// S5 — BetterTrade: matrice 3×3, 8 schedine accumulator, staking 20%/spin.
//
// Selezione (una spin a settimana, tutti i campionati insieme): l'esito 1X2 più
// probabile secondo il modello gol, con quota Bet365 apertura ≥ 1,4. Si prendono
// le 9 a confidenza più alta e si dispongono nella griglia:
//   - 1ª (più sicura) → centro (5)
//   - 2ª-5ª → angoli (1,3,7,9)   (X col centro)
//   - 6ª-9ª → lati (2,4,6,8)     (croce)
// Dalla geometria 8 schedine (5 tris, 2 quaterne, 1 full); vince se TUTTE le sue
// celle vincono; quota = prodotto. Staking: 20% del bankroll a spin, diviso
// 80% ai 5 tris, 16% alle 2 quaterne, 4% alla full. Bankroll 1000, dinamico,
// fallito sotto 10. Walk-forward. Solo settimane con ≥9 partite idonee.
//
// Uso:  node scripts/s5-bettertrade.js [--quote=bet365|pinnacle] [--soglia=1.4]

import { readFileSync } from 'node:fs';
import { modelloGol } from '../lib/modelli.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
const fonte = opt('quote', 'bet365');
const QMIN = Number(opt('soglia', 1.4));

const cache = JSON.parse(readFileSync(new URL('../.cache/partite.json', import.meta.url), 'utf8'));
const giorno = d => (typeof d === 'string' ? d : new Date(d).toISOString()).slice(0, 10);
const settimana = d => Math.floor(Date.parse(giorno(d)) / (7 * 86400000));
const xi = Math.log(2) / 200;
const MIN_STORICO = 300, MIN_SQ = 8;
const quote1x2 = r => fonte === 'pinnacle' ? [r.ps_1, r.ps_x, r.ps_2] : [r.b365_1, r.b365_x, r.b365_2];

// ---- Pass 1: scelta 1X2 del modello per ogni partita (walk-forward per lega) ----
const perDiv = new Map();
for (const r of cache) { if (!perDiv.has(r.div)) perDiv.set(r.div, []); perDiv.get(r.div).push(r); }

const scelte = []; // {sett, prob, quota, vinta}
for (const [, righe] of perDiv) {
  righe.sort((a, b) => (giorno(a.data) < giorno(b.data) ? -1 : giorno(a.data) > giorno(b.data) ? 1 : 0));
  const perData = [];
  let cur = null;
  for (const r of righe) { const g = giorno(r.data); if (!cur || cur.g !== g) { cur = { g, rs: [] }; perData.push(cur); } cur.rs.push(r); }
  let stato = null, fine = 0;
  const partiteSq = new Map();
  const conta = s => partiteSq.get(s) || 0;
  for (const gg of perData) {
    const training = righe.slice(0, fine).map(r => ({
      casa: r.casa, trasferta: r.trasferta, golCasa: r.gol_casa, golTrasferta: r.gol_trasferta, data: r.data,
    }));
    if (training.length >= MIN_STORICO) {
      stato = modelloGol.fit(training, { xi, iniziale: stato, dataRiferimento: new Date(gg.g), tol: 1e-7, maxIter: 80 });
      for (const r of gg.rs) {
        if (conta(r.casa) < MIN_SQ || conta(r.trasferta) < MIN_SQ) continue;
        const pr = modelloGol.prevedi(stato, r.casa, r.trasferta);
        if (!pr) continue;
        const probs = [pr.pCasa, pr.pPareggio, pr.pOspite];
        const quote = quote1x2(r);
        let best = 0;
        for (let i = 1; i < 3; i++) if (probs[i] > probs[best]) best = i;
        if (!quote[best] || quote[best] < QMIN) continue; // filtro quota minima
        const esitoReale = r.gol_casa > r.gol_trasferta ? 0 : r.gol_casa === r.gol_trasferta ? 1 : 2;
        scelte.push({ sett: settimana(r.data), prob: probs[best], quota: quote[best], vinta: best === esitoReale ? 1 : 0 });
      }
    }
    for (const r of gg.rs) { partiteSq.set(r.casa, conta(r.casa) + 1); partiteSq.set(r.trasferta, conta(r.trasferta) + 1); }
    fine += gg.rs.length;
  }
}

// ---- Pass 2: griglia per settimana + 8 schedine + staking ----
const perSett = new Map();
for (const p of scelte) { if (!perSett.has(p.sett)) perSett.set(p.sett, []); perSett.get(p.sett).push(p); }

// Schedine (posizioni 1-9). Disposizione: idx 0 = centro, 1-4 = angoli, 5-8 = lati.
// pos->tile: 5→0(centro), 1,3,7,9→1..4(angoli), 2,4,6,8→5..8(lati).
const POS = { 1: 1, 2: 5, 3: 2, 4: 6, 5: 0, 6: 7, 7: 3, 8: 8, 9: 4 };
const SCHEDINE = [
  { tipo: 'tris', pos: [1, 2, 3] }, { tipo: 'tris', pos: [4, 5, 6] }, { tipo: 'tris', pos: [7, 8, 9] },
  { tipo: 'tris', pos: [1, 5, 9] }, { tipo: 'tris', pos: [7, 5, 3] },
  { tipo: 'quaterna', pos: [1, 3, 7, 9] }, { tipo: 'quaterna', pos: [2, 4, 6, 8] },
  { tipo: 'full', pos: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
];

let bank = 1000, picco = 1000, maxDD = 0, minBank = 1000, spins = 0, fallitoA = null;
let investitoTot = 0, incassatoTot = 0;
const hit = { tris: [0, 0], quaterna: [0, 0], full: [0, 0] };   // [vinte, giocate]
let flatProfit = 0, flatN = 0;                                    // ROI a puntata fissa (1u/schedina)
const curva = [];

for (const [, ps] of [...perSett.entries()].sort((a, b) => a[0] - b[0])) {
  if (ps.length < 9) continue;                     // servono 9 partite idonee
  if (bank < 10) { fallitoA = fallitoA ?? spins; break; }
  ps.sort((a, b) => b.prob - a.prob);
  const tiles = ps.slice(0, 9);                    // le 9 a confidenza più alta, ordinate
  const cell = i => tiles[POS[i]];                 // cella in posizione i (1-9)

  const pool = 0.20 * bank;
  const stakeDi = { tris: 0.80 * pool / 5, quaterna: 0.16 * pool / 2, full: 0.04 * pool };

  let investito = 0, incassato = 0;
  for (const s of SCHEDINE) {
    const celle = s.pos.map(cell);
    const quota = celle.reduce((q, c) => q * c.quota, 1);
    const vinta = celle.every(c => c.vinta) ? 1 : 0;
    const stake = stakeDi[s.tipo];
    investito += stake;
    if (vinta) incassato += stake * quota;
    hit[s.tipo][1]++; if (vinta) hit[s.tipo][0]++;
    flatN++; flatProfit += vinta ? quota - 1 : -1;
  }
  bank += incassato - investito;
  investitoTot += investito; incassatoTot += incassato;
  spins++;
  picco = Math.max(picco, bank); maxDD = Math.max(maxDD, (picco - bank) / picco);
  minBank = Math.min(minBank, bank);
  curva.push(Math.round(bank));
}

// ---- report ----
console.log(`S5 — BetterTrade · quote ${fonte} · quota minima cella ${QMIN}`);
console.log(`Spin giocate (settimane con ≥9 partite idonee): ${spins}`);
console.log(`Schedine totali: ${flatN}  (5 tris + 2 quaterne + 1 full per spin)\n`);

console.log('Tasso di successo per tipo di schedina:');
for (const t of ['tris', 'quaterna', 'full']) {
  const [v, g] = hit[t];
  console.log(`  ${t.padEnd(9)} ${v}/${g} (${g ? (100 * v / g).toFixed(1) : '—'}%)`);
}

console.log(`\n(1) Valore vero (puntata fissa 1u a schedina): ROI ${(100 * flatProfit / flatN).toFixed(2)}%`);

console.log('\n(2) Staking BetterTrade (20%/spin, split 80/16/4, bankroll 1000 dinamico):');
console.log(`    Investito totale: ${investitoTot.toFixed(0)}   Incassato: ${incassatoTot.toFixed(0)}`);
console.log(`    Bankroll finale: ${bank.toFixed(0)}   (ROI ${((bank / 1000 - 1) * 100).toFixed(1)}%)`);
console.log(`    Minimo toccato: ${minBank.toFixed(0)}   Drawdown massimo: ${(maxDD * 100).toFixed(0)}%`);
console.log(`    ${fallitoA != null ? `⚠️ FALLITO (sotto 10) alla spin ${fallitoA}` : 'Mai fallito (>10)'}`);
console.log(`\n    Curva bankroll (ogni ~10 spin): ${curva.filter((_, i) => i % 10 === 0).join(' ')}`);
