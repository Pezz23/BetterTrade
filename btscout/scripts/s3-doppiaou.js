// S3 — doppia Over/Under sulle 2 partite a confidenza più alta della settimana.
//
// Ogni settimana (bucket di 7 giorni) prende, fra tutti i campionati, le 2
// partite con probabilità Dixon 1X2 più alta (> soglia), le combina in una
// doppia (quota = prodotto, quote reali Bet365 apertura), e applica la
// progressione di Mattia: 1u; se vinci metti via 0,5 e rigioca il resto; se
// perdi riparti da 1. Walk-forward per campionato (niente sguardo al futuro).
//
// Due misure: (1) ROI a puntata fissa = il vero valore della selezione,
// indipendente dallo staking; (2) curva del bankroll con la progressione.
//
// Uso:  node scripts/s3-doppiaou.js [--soglia=0.60] [--quote=bet365|pinnacle]

import { readFileSync } from 'node:fs';
import { modelloGol } from '../lib/modelli.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const a = args.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d; };
const SOGLIA = Number(opt('soglia', 0.60));
const fonte = opt('quote', 'bet365');

const cache = JSON.parse(readFileSync(new URL('../.cache/partite.json', import.meta.url), 'utf8'));
const giorno = d => (typeof d === 'string' ? d : new Date(d).toISOString()).slice(0, 10);
const settimana = d => Math.floor(Date.parse(giorno(d)) / (7 * 86400000)); // bucket 7 giorni
const xi = Math.log(2) / 200;
const MIN_STORICO = 300, MIN_SQ = 8;

// Quote Over/Under 2.5 [over, under]. Bet365 apertura (default) o media di mercato.
// NB: presenti solo dal 2019/20 → S3 gira su ~7 stagioni, non 10.
const quoteOU = r => fonte === 'media' ? [r.avg_over25, r.avg_under25] : [r.b365_over25, r.b365_under25];

// ---- Pass 1: per ogni partita, la scelta del modello (walk-forward per lega) ----
const perDiv = new Map();
for (const r of cache) { if (!perDiv.has(r.div)) perDiv.set(r.div, []); perDiv.get(r.div).push(r); }

const partiteScelte = []; // {sett, data, prob, quota, vinta}
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
        const probs = [pr.pOver25, pr.pUnder25];   // 0 = Over, 1 = Under
        const quote = quoteOU(r);
        // Over o Under, quello col modello più sicuro
        const best = probs[0] >= probs[1] ? 0 : 1;
        if (!quote[best]) continue; // manca la quota (pre-2019/20)
        const esitoReale = (r.gol_casa + r.gol_trasferta) >= 3 ? 0 : 1; // Over : Under
        partiteScelte.push({
          sett: settimana(r.data), data: giorno(r.data),
          prob: probs[best], quota: quote[best], vinta: best === esitoReale ? 1 : 0,
        });
      }
    }
    for (const r of gg.rs) { partiteSq.set(r.casa, conta(r.casa) + 1); partiteSq.set(r.trasferta, conta(r.trasferta) + 1); }
    fine += gg.rs.length;
  }
}

// ---- Pass 2: per settimana, le 2 a prob più alta sopra soglia → doppia ----
const perSett = new Map();
for (const p of partiteScelte) {
  if (p.prob < SOGLIA) continue;
  if (!perSett.has(p.sett)) perSett.set(p.sett, []);
  perSett.get(p.sett).push(p);
}
const doppie = [];
for (const [sett, ps] of [...perSett.entries()].sort((a, b) => a[0] - b[0])) {
  if (ps.length < 2) continue; // servono almeno 2 partite idonee
  ps.sort((a, b) => b.prob - a.prob);
  const [a, b] = ps;
  doppie.push({ sett, quota: a.quota * b.quota, vinta: a.vinta && b.vinta ? 1 : 0, prob: a.prob * b.prob });
}

// ---- (1) puntata fissa: il vero valore della selezione ----
let stakeTot = 0, profitto = 0, vinte = 0, quotaMedia = 0;
for (const d of doppie) {
  stakeTot += 1;
  profitto += d.vinta ? d.quota - 1 : -1;
  vinte += d.vinta;
  quotaMedia += d.quota;
}
quotaMedia /= doppie.length;

// ---- (2) progressione: 1u; vinci→via 0,5 e rigioca il resto; perdi→riparti da 1 ----
let wallet = 0, table = 0, pocketIn = 0;
let picco = 0, maxDD = 0;
const reset = () => { table = 1; pocketIn += 1; };
reset();
for (const d of doppie) {
  if (d.vinta) { table *= d.quota; wallet += 0.5; table -= 0.5; }
  else { table = 0; reset(); }
  const profit = wallet + table - pocketIn;
  picco = Math.max(picco, profit);
  maxDD = Math.max(maxDD, picco - profit);
}
const profitProg = wallet + table - pocketIn;

// ---- report ----
console.log(`S3 — doppia Over/Under · soglia prob ${(SOGLIA * 100).toFixed(0)}% · quote ${fonte}`);
console.log(`Settimane con una doppia: ${doppie.length}  ·  quota media doppia: ${quotaMedia.toFixed(2)}`);
console.log(`Doppie vinte: ${vinte}/${doppie.length} (${(100 * vinte / doppie.length).toFixed(1)}%)  ·  attese a pareggiare: ${(100 / quotaMedia).toFixed(1)}%\n`);

console.log('(1) PUNTATA FISSA (1u a doppia) — il vero valore della selezione:');
console.log(`    ROI: ${(100 * profitto / stakeTot).toFixed(2)}%   (profitto ${profitto.toFixed(1)}u su ${stakeTot} puntate)\n`);

console.log('(2) PROGRESSIONE di Mattia (1u; vinci→via 0,5 e rigioca; perdi→da 1):');
console.log(`    Capitale immesso (1u iniziale + 1u per ogni perdita): ${pocketIn}u`);
console.log(`    Messo da parte (0,5 per vittoria): ${(0.5 * vinte).toFixed(1)}u`);
console.log(`    Profitto netto finale: ${profitProg.toFixed(2)}u`);
console.log(`    Drawdown massimo: ${maxDD.toFixed(2)}u`);

// ---- (3) gestione unità: algoritmi seri, bankroll iniziale 100 ----
// edge di ogni doppia secondo il modello: prob_modello × quota − 1.
// Kelly punta una frazione = edge/(quota−1) del bankroll, 0 se edge ≤ 0.
function simula(nome, sizer) {
  let bank = 100, picco = 100, dd = 0, bets = 0;
  for (const d of doppie) {
    const edge = d.prob * d.quota - 1;
    let stake = sizer(bank, edge, d.quota);
    stake = Math.min(stake, bank);            // non puntare più del bankroll
    if (stake <= 1e-9) continue;
    bets++;
    bank += d.vinta ? stake * (d.quota - 1) : -stake;
  }
  // secondo passaggio solo per il drawdown (curva)
  let b2 = 100, pk = 100; dd = 0;
  for (const d of doppie) {
    const edge = d.prob * d.quota - 1;
    let stake = Math.min(sizer(b2, edge, d.quota), b2);
    if (stake <= 1e-9) continue;
    b2 += d.vinta ? stake * (d.quota - 1) : -stake;
    pk = Math.max(pk, b2); dd = Math.max(dd, (pk - b2) / pk);
  }
  console.log(`    ${nome.padEnd(28)} bank ${bank.toFixed(1).padStart(7)}  ROI ${((bank / 100 - 1) * 100).toFixed(1).padStart(7)}%  puntate ${String(bets).padStart(3)}/${doppie.length}  DD ${(dd * 100).toFixed(0)}%`);
}
const edgePositivi = doppie.filter(d => d.prob * d.quota - 1 > 0).length;
console.log(`\n(3) GESTIONE UNITÀ — algoritmi seri (bankroll iniziale 100):`);
console.log(`    Doppie che il modello crede a valore positivo: ${edgePositivi}/${doppie.length}`);
simula('Frazione fissa 5%', b => 0.05 * b);
simula('Mezzo Kelly (prob modello)', (b, edge, q) => edge > 0 ? 0.5 * edge / (q - 1) * b : 0);
simula('Kelly pieno (prob modello)', (b, edge, q) => edge > 0 ? edge / (q - 1) * b : 0);
console.log('\n    Nota: Kelly è la gestione ottimale del capitale. Se punta poco o');
console.log('    perde, è perché la selezione non ha vantaggio reale — non c\'è');
console.log('    algoritmo che lo crei. La gestione sceglie il rischio, non il segno.');
