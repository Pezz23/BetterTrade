// IL DISACCORDO FRA I BOOKMAKER: l'attendibilità vale lo stesso quando i book
// sono sparsi?
//
// ⚠️ **La domanda.** L'attendibilità *è* la media di mercato normalizzata. Ma
// una media di 34 opinioni allineate e una media di 34 opinioni sparse non
// sono lo stesso numero, e a schermo le mostriamo identiche. Se dove i book
// litigano l'attendibilità dichiara più di quello che mantiene, allora le
// soglie 75/72/65 che decidono le spin **valgono meno su quelle partite** — e
// oggi niente lo dice.
//
// La misura: `scartoBook` = quota massima / media − 1, sul segno giocato.
//
//   node --env-file=.env scripts/prova-dispersione.js --stagioni=8

import { sql } from '../lib/db.js';
import { ricostruisci } from '../lib/ricostruisci.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 8);

const { valutate, stagioni } = await ricostruisci({ stagioni: STAGIONI, daGiornata: 5 });
const dati = valutate.filter(v => v.scartoBook != null);
console.log(`stagioni ${stagioni.join(', ')} · ${dati.length} partite con la massima di mercato (su ${valutate.length})\n`);

const pc = v => (v * 100).toFixed(1) + '%';
const err = (p, n) => 1.96 * Math.sqrt(p * (1 - p) / n) * 100;

// ── 1. com'è distribuito il disaccordo ──────────────────────────────────────
const ord = [...dati].sort((a, b) => a.scartoBook - b.scartoBook);
const q = k => ord[Math.floor(ord.length * k)].scartoBook;
console.log('── quanto sono sparsi i book (massima / media − 1) ──');
console.log(`  minimo ${pc(ord[0].scartoBook)} · 25% ${pc(q(0.25))} · mediana ${pc(q(0.5))} · 75% ${pc(q(0.75))} · 95% ${pc(q(0.95))} · massimo ${pc(ord[ord.length - 1].scartoBook)}`);

// ── 2. la calibrazione per fascia di disaccordo ──────────────────────────────
// ⚠️ Il metro è lo SCARTO fra dichiarato e avverato, non la percentuale: nelle
// fasce con più disaccordo le quote sono più lunghe, quindi l'attendibilità è
// più bassa per costruzione e confrontare le percentuali nude inganna.
const FASCE = [[0, 0.25, 'allineati'], [0.25, 0.5, 'poco sparsi'], [0.5, 0.75, 'sparsi'], [0.75, 1, 'molto sparsi']];
console.log('\n── l\'attendibilità mantiene quello che dichiara? ──');
console.log(`  ${'fascia'.padEnd(13)} ${'disaccordo'.padEnd(14)} ${'partite'.padStart(7)} ${'dichiarato'.padStart(11)} ${'avverato'.padStart(10)} ${'scarto'.padStart(14)}`);
for (const [da, a, nome] of FASCE) {
  const l = ord.slice(Math.floor(ord.length * da), Math.floor(ord.length * a));
  const dich = l.reduce((s, v) => s + v.att, 0) / l.length;
  const vera = l.filter(v => v.vinta).length / l.length;
  console.log(`  ${nome.padEnd(13)} ${(pc(l[0].scartoBook) + '–' + pc(l[l.length - 1].scartoBook)).padEnd(14)} ${String(l.length).padStart(7)} ${pc(dich).padStart(11)} ${pc(vera).padStart(10)} ${((vera - dich) * 100 >= 0 ? '+' : '') + ((vera - dich) * 100).toFixed(1) + ' ±' + err(vera, l.length).toFixed(1)}`.padEnd(10));
}

// ── 3. e sopra le soglie che decidono le spin? ──────────────────────────────
console.log('\n── sopra soglia, per fascia di disaccordo (è qui che conta) ──');
for (const soglia of [0.60, 0.70, 0.75]) {
  console.log(`\n  attendibilità ≥ ${pc(soglia)}`);
  for (const [da, a, nome] of FASCE) {
    const l = ord.slice(Math.floor(ord.length * da), Math.floor(ord.length * a)).filter(v => v.att >= soglia);
    if (l.length < 30) { console.log(`    ${nome.padEnd(13)} ${String(l.length).padStart(6)} partite — troppe poche`); continue; }
    const dich = l.reduce((s, v) => s + v.att, 0) / l.length;
    const vera = l.filter(v => v.vinta).length / l.length;
    const resa = l.reduce((s, v) => s + (v.vinta ? v.quotaResa : 0), 0) / l.length;
    console.log(`    ${nome.padEnd(13)} ${String(l.length).padStart(6)} partite · dichiarato ${pc(dich)} · avverato ${pc(vera)} (${((vera - dich) * 100 >= 0 ? '+' : '') + ((vera - dich) * 100).toFixed(1)} ±${err(vera, l.length).toFixed(1)}) · resa ${pc(resa)}`);
  }
}

// ── 4. il disaccordo migliora la scelta? le prime 9 di ogni giorno ──────────
// ⚠️ Il confronto onesto: a parità di attendibilità, preferire le partite dove
// i book sono d'accordo cambia qualcosa?
console.log('\n── le prime 9 di ogni giorno per attendibilità, con e senza il filtro ──');
const perGiorno = new Map();
for (const v of dati) { if (!perGiorno.has(v.data)) perGiorno.set(v.data, []); perGiorno.get(v.data).push(v); }
for (const [nome, filtro] of [
  ['tutte', () => true],
  ['solo book allineati (sotto la mediana)', v => v.scartoBook <= q(0.5)],
  ['solo book sparsi (sopra la mediana)', v => v.scartoBook > q(0.5)],
]) {
  let n = 0, ok = 0, resa = 0;
  for (const l of perGiorno.values()) {
    const prime = l.filter(filtro).sort((a, b) => b.att - a.att).slice(0, 9);
    for (const v of prime) { n++; if (v.vinta) { ok++; resa += v.quotaResa } }
  }
  console.log(`  ${nome.padEnd(40)} ${String(n).padStart(6)} giocate · azzeccate ${pc(ok / n)} ±${err(ok / n, n).toFixed(1)} · resa ${pc(resa / n)}`);
}

await sql.end();
