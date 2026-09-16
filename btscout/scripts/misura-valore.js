// La misura del criterio: giocare dove Bet365 paga più del prezzo equo
// dell'exchange, guadagna?
//
// ── Regole, per essere onesta ───────────────────────────────────────────────
// 1. Solo quote di APERTURA: b365_* e bfe_ap_*. Sono le uniche che esistono nel
//    momento in cui si gioca. Mai bfe_ch_* (la chiusura): usarla sarebbe scoprire
//    che il metodo funziona con informazioni che non avevi.
// 2. Solo mercati reali: where bfe_ap_valido. I segnaposto 1.02/1.01/1.01 dei
//    mercati vuoti produrrebbero "valore" inesistente.
// 3. Prezzo equo = exchange normalizzato: probabilità implicite divise per la
//    loro somma, quota equa = 1/probabilità. Toglie il margine dell'exchange.
// 4. Puntata fissa: 1 unità per scommessa. Lo staking non crea vantaggio, lo
//    amplifica o lo nasconde. Qui si misura il vantaggio, non lo si veste.
// 5. Intervallo di confidenza al 95% sul ROI: errore standard dei rendimenti per
//    scommessa. Se l'intervallo include lo zero, non abbiamo dimostrato niente.
//
// Nessun modello, nessun parametro da stimare: quindi niente walk-forward da
// fare. Il segnale è un confronto fra due numeri pubblici.
//
// Uso:  node --env-file=.env scripts/misura-valore.js

import { sql, chiudi } from '../lib/db.js';

const righe = await sql`
  select stagione, div, esito, b365_1, b365_x, b365_2, bfe_ap_1, bfe_ap_x, bfe_ap_2
  from partite
  where bfe_ap_valido and b365_1 is not null and b365_x is not null and b365_2 is not null`;

// Per ogni partita, tre possibili scommesse: esito, quota Bet365, quota equa,
// scarto, e rendimento se giocata (quota−1 se vinta, −1 se persa).
const scommesse = [];
for (const r of righe) {
  const s = 1 / r.bfe_ap_1 + 1 / r.bfe_ap_x + 1 / r.bfe_ap_2;
  const esiti = [['1', r.b365_1, r.bfe_ap_1 * s, 'H'], ['X', r.b365_x, r.bfe_ap_x * s, 'D'], ['2', r.b365_2, r.bfe_ap_2 * s, 'A']];
  const quotaMin = Math.min(r.b365_1, r.b365_x, r.b365_2);
  for (const [segno, quota, equo, codice] of esiti) {
    scommesse.push({
      stagione: r.stagione, div: r.div, segno, quota, equo,
      favorito: quota === quotaMin,
      scarto: quota / equo - 1,
      vinta: r.esito === codice,
      rendimento: r.esito === codice ? quota - 1 : -1,
    });
  }
}

function riassunto(lista) {
  const n = lista.length;
  if (!n) return null;
  const vinte = lista.filter(b => b.vinta).length;
  const profitto = lista.reduce((a, b) => a + b.rendimento, 0);
  const roi = profitto / n;
  const media = roi;
  const varianza = lista.reduce((a, b) => a + (b.rendimento - media) ** 2, 0) / (n - 1 || 1);
  const errStd = Math.sqrt(varianza / n);
  const quotaMedia = lista.reduce((a, b) => a + b.quota, 0) / n;
  return { n, vinte, tasso: vinte / n, profitto, roi, ic: 1.96 * errStd, quotaMedia };
}

const pct = v => (v * 100).toFixed(1) + '%';
const segno = v => (v >= 0 ? '+' : '') + pct(v);
const riga = (nome, r) => r
  ? `  ${nome.padEnd(22)} ${String(r.n).padStart(6)} ${pct(r.tasso).padStart(7)} ${r.quotaMedia.toFixed(2).padStart(7)} ${segno(r.roi).padStart(8)}  [${segno(r.roi - r.ic)} … ${segno(r.roi + r.ic)}]${r.roi - r.ic > 0 ? '  ✓ positivo con confidenza' : ''}`
  : `  ${nome.padEnd(22)}      —`;
const testata = () => console.log(`  ${'—'.padEnd(22)} ${'n'.padStart(6)} ${'vinte'.padStart(7)} ${'q.media'.padStart(7)} ${'ROI'.padStart(8)}  IC 95%`);

const stagioni = [...new Set(righe.map(r => r.stagione))].sort();
console.log(`\nMISURA DEL CRITERIO — ${righe.length} partite con exchange reale, stagioni ${stagioni.join(' ')}`);
console.log(`${scommesse.length} scommesse possibili (3 per partita)\n`);

// ── Il punto di partenza: giocare tutto, a caso ─────────────────────────────
console.log('RIFERIMENTO — giocare ogni esito, sempre (misura il margine del banco)');
testata();
console.log(riga('tutti gli esiti', riassunto(scommesse)));
console.log(riga('solo il favorito', riassunto(scommesse.filter(b => b.favorito))));
console.log();

// ── Il criterio, a soglie crescenti ─────────────────────────────────────────
console.log('IL CRITERIO — giocare dove Bet365 paga più del prezzo equo');
testata();
for (const soglia of [0, 0.01, 0.02, 0.03, 0.05, 0.08]) {
  console.log(riga(`scarto > ${pct(soglia)}`, riassunto(scommesse.filter(b => b.scarto > soglia))));
}
console.log();

// ── Il contrario, per controllo: dove Bet365 paga MENO del dovuto ───────────
console.log('CONTROLLO — giocare dove Bet365 paga MENO del prezzo equo (deve perdere di più)');
testata();
console.log(riga('scarto < −5%', riassunto(scommesse.filter(b => b.scarto < -0.05))));
console.log(riga('scarto < −10%', riassunto(scommesse.filter(b => b.scarto < -0.10))));
console.log();

// ── Per segno ───────────────────────────────────────────────────────────────
console.log('PER SEGNO — scarto > 0');
testata();
for (const s of ['1', 'X', '2']) console.log(riga(`segno ${s}`, riassunto(scommesse.filter(b => b.scarto > 0 && b.segno === s))));
console.log();

// ── Per stagione ────────────────────────────────────────────────────────────
console.log('PER STAGIONE — scarto > 0');
testata();
for (const st of stagioni) console.log(riga(st, riassunto(scommesse.filter(b => b.scarto > 0 && b.stagione === st))));
console.log();

// ── Per fascia di quota ─────────────────────────────────────────────────────
console.log('PER FASCIA DI QUOTA — scarto > 0');
testata();
for (const [da, a] of [[1, 1.5], [1.5, 2], [2, 3], [3, 5], [5, 100]])
  console.log(riga(`quota ${da}–${a === 100 ? '∞' : a}`, riassunto(scommesse.filter(b => b.scarto > 0 && b.quota >= da && b.quota < a))));

console.log(`
COME LEGGERE
  ROI      rendimento medio per unità puntata. −6% = su 100 € giocati ne tornano 94.
  IC 95%   intervallo in cui sta il ROI vero con il 95% di confidenza.
           Se include lo zero, il risultato è compatibile con il caso.
  ✓        compare solo se l'intero intervallo è sopra lo zero.

LIMITI DI QUESTA MISURA
  · Bet365 e exchange di apertura possono essere stati raccolti in momenti
    diversi: parte dello scarto può essere movimento del mercato, non errore.
  · L'exchange di apertura è sottile (margine ~1,03): il prezzo equo ricavato
    ha rumore. Il filtro bfe_ap_valido toglie i mercati vuoti, non il rumore.
  · Le quote Bet365 sono quelle pubblicate da football-data, non quelle che un
    conto reale avrebbe ottenuto (limiti, chiusure di conto, variazioni).
`);
await chiudi();
