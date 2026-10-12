// VPM È UNA PROBABILITÀ? E quando litiga col mercato, chi ha ragione?
//
//   node --env-file=.env scripts/prova-vpm-calibrato.js [--stagioni=8]
//
// ⚠️ **Perché questa misura esiste** (idea di Mattia, 12/10/2026): *"cerco le
// partite dove la quota è alta e la probabilità supera il 50%"*. Per trovarle
// serve una probabilità che **non venga dal mercato**, altrimenti il confronto
// è circolare — l'attendibilità e la quota vengono entrambe dai book.
//
// VPM è l'unico candidato: guarda il campo, non i prezzi. Ma **VPM non è una
// probabilità**: va da 5,5 a 10 e dice quale segno preferiscono le squadre e
// quanto nettamente. Qui si chiede se **si può trasformare** in una:
//   1. quando VPM dice 7,2, quante volte vince il segno che preferisce?
//   2. e soprattutto: **quando VPM e mercato litigano, chi ha ragione?**
//
// ⚠️ Tutto camminando nel tempo: VPM di quel giorno, consenso di apertura,
// quota Bet365 di apertura.

import { sql } from '../lib/db.js';
import { ricostruisci } from '../lib/ricostruisci.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const { valutate, stagioni } = await ricostruisci({ stagioni: arg('stagioni', 8), daGiornata: arg('giornata', 5) });

// solo quelle con VPM e con le quote dei due segni
const v = valutate.filter(x => x.vpm != null && x.segnoVpm && x.q1 > 1 && x.q2 > 1);
console.log(`stagioni ${stagioni.join(', ')} · ${v.length} partite con VPM e quote\n`);

// la probabilità che il MERCATO dà al segno preferito da VPM
const pMercatoVpm = (x) => x.segnoVpm === 'H' ? x.p1 : x.p2;
const quotaVpm    = (x) => x.segnoVpm === 'H' ? x.q1 : x.q2;
const vinceVpm    = (x) => x.esito === x.segnoVpm;

const ic = (k, n) => { const p = k / n; return `${(p * 100).toFixed(1)}% ±${(1.96 * Math.sqrt(p * (1 - p) / n) * 100).toFixed(1)}` };

// ── 1. La calibrazione: VPM promette, la realtà mantiene? ───────────────────
// ⚠️ Il confronto non è col 50%: è con **quanto dice il mercato sullo stesso
// segno**. Se VPM vince quanto dice il mercato, non aggiunge niente.
console.log('── quando VPM preferisce un segno, quel segno vince… ──');
console.log(`   ${'VPM'.padEnd(10)} ${'partite'.padStart(7)}  ${'vince'.padStart(14)}   il mercato gli dava`);
const fasce = [[5.5, 6], [6, 6.5], [6.5, 7], [7, 7.5], [7.5, 8], [8, 8.5], [8.5, 11]];
for (const [a, b] of fasce) {
  const l = v.filter(x => x.vpm >= a && x.vpm < b);
  if (l.length < 100) continue;
  const k = l.filter(vinceVpm).length;
  const m = l.reduce((s, x) => s + pMercatoVpm(x), 0) / l.length;
  console.log(`   ${`${a}-${b}`.padEnd(10)} ${String(l.length).padStart(7)}  ${ic(k, l.length).padStart(14)}   ${(m * 100).toFixed(1)}%`);
}

// ── 2. LA DOMANDA VERA: quando litigano, chi ha ragione? ───────────────────
// ⚠️ "Litigano" = VPM preferisce il segno che il mercato NON dà per favorito.
// Lì il mercato gli dà poco, e se il campo avesse ragione il margine sarebbe
// grande. È il caso di Mattia: *"Levante-Sevilla 2 non ha il 30%, molto di più"*.
console.log('\n── quando VPM e mercato litigano ──');
const contro = v.filter(x => x.accordoVpm === false);
const accordo = v.filter(x => x.accordoVpm === true);
for (const [nome, l] of [["d'accordo", accordo], ['in disaccordo', contro]]) {
  if (!l.length) continue;
  const k = l.filter(vinceVpm).length;
  const m = l.reduce((s, x) => s + pMercatoVpm(x), 0) / l.length;
  const soldi = l.reduce((s, x) => s + (vinceVpm(x) ? quotaVpm(x) : 0), 0) / l.length;
  const dev = Math.sqrt(l.reduce((s, x) => s + Math.pow((vinceVpm(x) ? quotaVpm(x) : 0) - soldi, 2), 0) / l.length);
  console.log(`   ${nome.padEnd(14)} ${String(l.length).padStart(6)} partite · il segno di VPM vince ${ic(k, l.length)}` +
    ` · il mercato gli dava ${(m * 100).toFixed(1)}%` +
    ` · giocandolo ${(soldi * 100).toFixed(1)}% ±${(1.96 * dev / Math.sqrt(l.length) * 100).toFixed(1)}`);
}

// ── 3. Il disaccordo, per quanto è netto ───────────────────────────────────
// ⚠️ Se il campo ha ragione, deve avere **più** ragione quando è più convinto.
// Una riga piatta vuol dire che il disaccordo è rumore.
console.log('\n── il disaccordo, per quanto VPM è convinto ──');
console.log(`   ${'VPM'.padEnd(10)} ${'partite'.padStart(7)}  ${'vince'.padStart(14)}   ${'il mercato dava'.padStart(15)}   giocandolo`);
for (const [a, b] of [[5.5, 6.5], [6.5, 7], [7, 7.5], [7.5, 8], [8, 11]]) {
  const l = contro.filter(x => x.vpm >= a && x.vpm < b);
  if (l.length < 60) { console.log(`   ${`${a}-${b}`.padEnd(10)} ${String(l.length).padStart(7)}  troppo poche`); continue }
  const k = l.filter(vinceVpm).length;
  const m = l.reduce((s, x) => s + pMercatoVpm(x), 0) / l.length;
  const soldi = l.reduce((s, x) => s + (vinceVpm(x) ? quotaVpm(x) : 0), 0) / l.length;
  console.log(`   ${`${a}-${b}`.padEnd(10)} ${String(l.length).padStart(7)}  ${ic(k, l.length).padStart(14)}   ${((m * 100).toFixed(1) + '%').padStart(15)}   ${(soldi * 100).toFixed(1)}%`);
}

// ── 4. Quello che Mattia cerca davvero ─────────────────────────────────────
// Quote alte (il banco chiede poco) dove il campo dice il contrario.
console.log('\n── quota alta + il campo dalla parte opposta ──');
for (const [lo, hi] of [[2.5, 3.5], [3.5, 5], [5, 20]]) {
  const l = contro.filter(x => quotaVpm(x) >= lo && quotaVpm(x) < hi);
  if (l.length < 50) { console.log(`   quota ${lo}-${hi}: ${l.length} partite, troppo poche`); continue }
  const k = l.filter(vinceVpm).length;
  const m = l.reduce((s, x) => s + pMercatoVpm(x), 0) / l.length;
  const soldi = l.reduce((s, x) => s + (vinceVpm(x) ? quotaVpm(x) : 0), 0) / l.length;
  console.log(`   quota ${String(lo).padStart(4)}-${String(hi).padEnd(4)} ${String(l.length).padStart(6)} partite · vince ${ic(k, l.length)}` +
    ` · il mercato dava ${(m * 100).toFixed(1)}% · giocandolo ${(soldi * 100).toFixed(1)}%`);
}

await sql.end();
