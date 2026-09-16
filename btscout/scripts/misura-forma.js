// Il segnale "Como": il mercato è in ritardo sulle squadre in forma?
//
// Mattia (16/09/2026): Como e Sunderland, appena promosse, erano nettamente
// superiori e i bookmaker hanno continuato a pagarle tanto fino a marzo. Se è
// un fenomeno generale, si misura così:
//
//   1. Per ogni squadra, prima di ogni partita, la SORPRESA delle ultime N:
//      punti fatti − punti attesi dal consenso di mercato (3·p_vittoria +
//      1·p_pareggio, con le probabilità di apertura normalizzate). Sorpresa
//      positiva = ha fatto meglio di quanto il mercato prevedeva.
//   2. Nella partita successiva: vince più spesso di quanto il consenso dice?
//      Se la sorpresa passata predice uno scarto positivo, il mercato è lento.
//   3. E vale la pena giocarle? CLV di "punta la squadra in forma" contro la
//      chiusura, e ROI a puntata fissa.
//
// Solo apertura per selezionare, chiusura solo per valutare. Walk-forward per
// costruzione: la sorpresa usa solo partite già giocate.
//
// Uso:  node --env-file=.env scripts/misura-forma.js [--finestra=5] [--promosse]

import { sql, chiudi } from '../lib/db.js';

const N = Number((process.argv.find(a => a.startsWith('--finestra=')) || '--finestra=5').split('=')[1]);
const SOLO_PROMOSSE = process.argv.includes('--promosse');

const righe = await sql`
  select id, div, stagione, data, casa, trasferta, esito,
         b365_1, b365_x, b365_2, avg_ap_1, avg_ap_x, avg_ap_2, avg_1, avg_x, avg_2
  from partite
  where avg_ap_1 is not null and b365_1 is not null
  order by div, stagione, data, id`;

const norm = (a, b, c) => { const s = 1 / a + 1 / b + 1 / c; return [1 / a / s, 1 / b / s, 1 / c / s]; };

// Chi era in questa divisione la stagione prima: chi non c'era è "promossa"
// (o retrocessa dalla serie superiore — per le seconde serie vale lo stesso:
// nuova nella categoria).
const presenti = new Map(); // `${div}|${stagione}` → Set squadre
for (const r of righe) {
  const k = `${r.div}|${r.stagione}`;
  if (!presenti.has(k)) presenti.set(k, new Set());
  presenti.get(k).add(r.casa); presenti.get(k).add(r.trasferta);
}
const stagPrec = s => String(Number(s.slice(0, 2)) - 1).padStart(2, '0') + s.slice(0, 2);
const nuova = (div, stag, sq) => { const p = presenti.get(`${div}|${stagPrec(stag)}`); return p ? !p.has(sq) : false; };

// Storia per squadra dentro la stagione: lista di (punti, attesi)
const storia = new Map();
const chiave = (r, sq) => `${r.div}|${r.stagione}|${sq}`;

const osservazioni = []; // una per squadra per partita
for (const r of righe) {
  const [p1, px, p2] = norm(r.avg_ap_1, r.avg_ap_x, r.avg_ap_2);
  const [c1, cx, c2] = norm(r.avg_1, r.avg_x, r.avg_2);
  const lati = [
    { sq: r.casa, pV: p1, pP: px, cV: c1, quota: r.b365_1, vinta: r.esito === 'H', pari: r.esito === 'D', avv: r.trasferta },
    { sq: r.trasferta, pV: p2, pP: px, cV: c2, quota: r.b365_2, vinta: r.esito === 'A', pari: r.esito === 'D', avv: r.casa },
  ];
  for (const l of lati) {
    const k = chiave(r, l.sq);
    const h = storia.get(k) || [];
    if (h.length >= N && (!SOLO_PROMOSSE || nuova(r.div, r.stagione, l.sq))) {
      const ultime = h.slice(-N);
      const sorpresa = ultime.reduce((s, x) => s + (x.punti - x.attesi), 0);
      osservazioni.push({
        stagione: r.stagione, div: r.div, sq: l.sq, sorpresa,
        pV: l.pV, vinta: l.vinta, quota: l.quota, cV: l.cV,
        giornata: h.length + 1,
      });
    }
    const punti = l.vinta ? 3 : l.pari ? 1 : 0;
    const attesi = 3 * l.pV + 1 * l.pP;
    h.push({ punti, attesi });
    storia.set(k, h);
  }
}

// ── Statistiche per fascia di sorpresa ──────────────────────────────────────
const FASCE = [
  ['molto sotto le attese', -99, -3],
  ['sotto', -3, -1],
  ['in linea', -1, 1],
  ['sopra', 1, 3],
  ['molto sopra le attese', 3, 99],
];
const stat = obs => {
  const n = obs.length; if (!n) return null;
  const attese = obs.reduce((s, o) => s + o.pV, 0) / n;
  const reali = obs.filter(o => o.vinta).length / n;
  const diff = reali - attese;
  const icDiff = 1.96 * Math.sqrt(attese * (1 - attese) / n);
  // CLV: quota giocata vs quota equa di chiusura
  const clv = obs.map(o => o.quota / (1 / o.cV) - 1);
  const mClv = clv.reduce((a, b) => a + b, 0) / n;
  const vClv = clv.reduce((a, b) => a + (b - mClv) ** 2, 0) / (n - 1 || 1);
  // ROI a puntata fissa
  const roi = obs.reduce((s, o) => s + (o.vinta ? o.quota - 1 : -1), 0) / n;
  return { n, attese, reali, diff, icDiff, clv: mClv, icClv: 1.96 * Math.sqrt(vClv / n), roi };
};
const pct = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1) + '%';
const riga = (nome, s) => s
  ? `  ${nome.padEnd(24)} ${String(s.n).padStart(6)}  ${(s.attese * 100).toFixed(1).padStart(6)}%  ${(s.reali * 100).toFixed(1).padStart(6)}%  ${pct(s.diff).padStart(7)} ±${(s.icDiff * 100).toFixed(1)}  ${pct(s.clv).padStart(7)} ±${(s.icClv * 100).toFixed(1)}  ${pct(s.roi).padStart(7)}${s.diff - s.icDiff > 0 ? '  ✓' : s.diff + s.icDiff < 0 ? '  ✗' : ''}`
  : `  ${nome.padEnd(24)}      —`;
const testata = () => console.log(`  ${'sorpresa ultime ' + N}`.padEnd(26) + `${'n'.padStart(6)}  ${'attese'.padStart(7)}  ${'reali'.padStart(7)}  ${'scarto'.padStart(7)}        ${'CLV'.padStart(7)}        ${'ROI'.padStart(7)}`);

console.log(`\nIL SEGNALE "COMO" — ${osservazioni.length} osservazioni (squadra × partita)${SOLO_PROMOSSE ? ', SOLO squadre nuove nella categoria' : ''}`);
console.log(`finestra: le ultime ${N} partite della stagione · "attese" = vittorie previste dal consenso · "reali" = vittorie avvenute\n`);

console.log('TUTTE LE SQUADRE');
testata();
for (const [nome, da, a] of FASCE) console.log(riga(nome, stat(osservazioni.filter(o => o.sorpresa >= da && o.sorpresa < a))));

console.log('\nSOLO FAVORITE (consenso ≥ 55%) — quelle che entrano in una spin');
testata();
for (const [nome, da, a] of FASCE) console.log(riga(nome, stat(osservazioni.filter(o => o.pV >= 0.55 && o.sorpresa >= da && o.sorpresa < a))));

console.log('\nSOLO FAVORITE A QUOTA ALTA (consenso ≥ 55%, Bet365 ≥ 1,60) — "attendibili con quota alta"');
testata();
for (const [nome, da, a] of FASCE) console.log(riga(nome, stat(osservazioni.filter(o => o.pV >= 0.55 && o.quota >= 1.6 && o.sorpresa >= da && o.sorpresa < a))));

console.log(`
COME LEGGERE
  scarto   vittorie reali − vittorie attese dal consenso. Se le squadre "molto sopra le
           attese" hanno scarto positivo con ✓, il mercato è in ritardo: vincono più di
           quanto le quote dicono. Se lo scarto è ~0, il mercato le ha già prezzate.
  CLV      quota Bet365 giocata vs quota equa di chiusura: vantaggio atteso per scommessa.
  ROI      a puntata fissa. Rumoroso, come sempre.
`);
await chiudi();
