// BACKTEST A1 — la domanda che decide se la "scala a recupero" ha un fondamento:
// giocando il favorito secco, la **resa realizzata** supera il 100%?
//
//   node --env-file=.env scripts/misura-resa-favoriti.js
//
// Resa realizzata = quota giocata × quante volte ha vinto davvero. Sopra 100%
// si guadagna, sotto si perde — e nessuna progressione di puntate lo cambia:
// la scala a recupero rompe il pari esattamente a resa 100% (misurato il
// 10/10/2026, tutte e tre le versioni).
//
// ⚠️ La quota è quella che si **giocava davvero** (Bet365 di apertura,
// `b365_*`), non la media di mercato: quella serve a stimare la probabilità,
// non a incassare. ⚠️ Il favorito è scelto sul consenso di apertura
// (`avg_ap_*`), cioè con l'informazione disponibile prima della partita.
//
// Confronta anche **tre prezzi sulle stesse partite** — Bet365, media e massima
// di mercato all'apertura — perché il 10/10/2026 è venuto fuori che lo scarto
// fra i book vale più di qualunque rifinitura del criterio.

import { sql } from '../lib/db.js';

const FASCE = [[1.20,1.30],[1.30,1.35],[1.35,1.40],[1.40,1.45],[1.45,1.55],[1.55,1.70],[1.70,2.00]];

const t = setTimeout(() => { console.log('✗ il database non risponde'); process.exit(1) }, 120000);

const righe = await sql`
  with base as (
    select stagione, div, b365_1, b365_2, max_ap_1, max_ap_2,
           avg_ap_1, avg_ap_x, avg_ap_2, esito,
           -- il favorito secondo il consenso di apertura: la X non si gioca mai.
           -- ATTENZIONE: esito usa le lettere di football-data (H casa, D
           -- pari, A ospite), non 1/X/2: il primo giro contava zero vittorie.
           -- Qui dentro non si usano apici inversi: chiuderebbero il template.
           case when 1/avg_ap_1 >= 1/avg_ap_2 then 'H' else 'A' end as segno
    from partite
    where avg_ap_1 is not null and avg_ap_x is not null and avg_ap_2 is not null
      and b365_1 is not null and b365_2 is not null and esito is not null
      and max_ap_1 is not null and max_ap_2 is not null
  )
  select stagione, div, segno, esito,
         case when segno = 'H' then b365_1 else b365_2 end as quota,
         case when segno = 'H' then max_ap_1 else max_ap_2 end as q_max,
         case when segno = 'H' then avg_ap_1 else avg_ap_2 end as q_avg,
         -- attendibilità: probabilità implicita del consenso, normalizzata
         case when segno = 'H' then (1/avg_ap_1) else (1/avg_ap_2) end
           / (1/avg_ap_1 + 1/avg_ap_x + 1/avg_ap_2) as att
  from base`;

clearTimeout(t);
console.log(`${righe.length} partite con favorito, quota Bet365 di apertura e risultato\n`);

function misura(lista, etichetta) {
  if (!lista.length) return;
  const n = lista.length;
  const vinte = lista.filter(r => r.esito === r.segno).length;
  const freq = vinte / n;
  const quotaMedia = lista.reduce((a, r) => a + Number(r.quota), 0) / n;
  const attMedia = lista.reduce((a, r) => a + Number(r.att), 0) / n;
  // resa realizzata: 1 € su ciascuna, quanto torna
  const ritorno = lista.reduce((a, r) => a + (r.esito === r.segno ? Number(r.quota) : 0), 0) / n;
  // errore standard sulla resa, per sapere se lo scarto da 1 è rumore
  const varianza = lista.reduce((a, r) => a + Math.pow((r.esito === r.segno ? Number(r.quota) : 0) - ritorno, 2), 0) / n;
  const es = Math.sqrt(varianza / n);
  const segno = ritorno >= 1 ? '+' : '';
  console.log(`${etichetta.padEnd(22)} ${String(n).padStart(6)}  quota ${quotaMedia.toFixed(3)}  att ${(attMedia*100).toFixed(1)}%  vinte ${(freq*100).toFixed(1)}%` +
    `  resa ${(ritorno*100).toFixed(1)}%  [${((ritorno-1.96*es)*100).toFixed(1)} … ${((ritorno+1.96*es)*100).toFixed(1)}]` +
    `  ${ritorno - 1.96*es > 1 ? '✓ sopra 100' : ritorno + 1.96*es < 1 ? '✗ sotto 100' : '· indistinguibile'}`);
}

console.log('── per fascia di quota giocata ──');
for (const [lo, hi] of FASCE) {
  misura(righe.filter(r => Number(r.quota) >= lo && Number(r.quota) < hi), `${lo.toFixed(2)}-${hi.toFixed(2)}`);
}
console.log('');
misura(righe, 'TUTTI i favoriti');

console.log('\n── solo le fasce della scala, per stagione ──');
const scala = righe.filter(r => Number(r.quota) >= 1.30 && Number(r.quota) < 1.45);
for (const st of [...new Set(scala.map(r => r.stagione))].sort()) {
  misura(scala.filter(r => r.stagione === st), `  ${st}`);
}
misura(scala, '  TUTTE 1,30-1,45');

// ── Lo stesso insieme di partite, a tre prezzi diversi ───────────────────────
// ⚠️ È la misura che conta più di tutte: la fascia della scala a recupero rompe
// il pari su Bet365 e lo supera sulla massima di mercato. Il vantaggio sta nel
// **prezzo**, non (ancora) nella selezione.
console.log('\n── le stesse 1,30-1,45, a tre prezzi ──');
for (const [nome, col] of [['Bet365 apertura', 'quota'], ['media di mercato', 'q_avg'], ['massima di mercato', 'q_max']]) {
  const n = scala.length;
  const ret = scala.reduce((a, r) => a + (r.esito === r.segno ? Number(r[col]) : 0), 0) / n;
  const qm = scala.reduce((a, r) => a + Number(r[col]), 0) / n;
  const va = scala.reduce((a, r) => a + Math.pow((r.esito === r.segno ? Number(r[col]) : 0) - ret, 2), 0) / n;
  const es = Math.sqrt(va / n);
  console.log(`${nome.padEnd(20)} quota media ${qm.toFixed(3)}  resa ${(ret*100).toFixed(1)}%` +
    `  [${((ret-1.96*es)*100).toFixed(1)} … ${((ret+1.96*es)*100).toFixed(1)}]` +
    `  ${ret - 1.96*es > 1 ? '✓ sopra 100' : '· indistinguibile da 100'}`);
}
console.log('\n⚠️ La massima di mercato è un prezzo che bisogna POTER giocare: serve il');
console.log('   conto su quel book, e i book che pagano di più limitano i vincenti.');

await sql.end();
