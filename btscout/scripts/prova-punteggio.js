// IL PUNTEGGIO DEL PREZZO: attendibilità + conferma del campo.
//
//   node --env-file=.env scripts/prova-punteggio.js
//
// ⚠️ **Cosa misura, detto bene**: non *quanto è probabile* una partita — per
// quello l'attendibilità da sola è migliore, misurato — ma **quanto conviene il
// prezzo**. Alzare la soglia dell'attendibilità porta su quote più corte: si
// vince più spesso e si incassa meno. VPM alto e d'accordo col mercato sceglie
// partite di pari qualità **ancora pagate bene**.
//
// ⚠️⚠️ **Tarato fuori campione.** Il peso si sceglie sulle **prime stagioni** e
// si verifica sulle **ultime due**, mai viste. Un parametro scelto sugli stessi
// dati su cui lo si giudica trova sempre qualcosa: su un segnale di questa
// grandezza (meno di un punto di resa) sarebbe garantito trovare rumore.

import { sql } from '../lib/db.js';
import { ricostruisci } from '../lib/ricostruisci.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const QUOTA_SCELTE = arg('quota', 0.10);          // si gioca il 10% migliore
const { valutate, stagioni } = await ricostruisci({ stagioni: 8 });

const v = valutate.filter(x => x.vpm != null && x.quotaResa > 1);
const taglio = stagioni[stagioni.length - 2];      // le ultime due stagioni sono la verifica
const taratura = v.filter(x => x.stagione < taglio);
const verifica = v.filter(x => x.stagione >= taglio);
console.log(`taratura: ${taratura.length} partite (${stagioni.slice(0, -2).join(', ')})`);
console.log(`verifica: ${verifica.length} partite (${stagioni.slice(-2).join(', ')}) — mai viste\n`);

// ── Il punteggio ────────────────────────────────────────────────────────────
// ⚠️ Due pezzi soli e un peso. Più parametri su un segnale di meno di un punto
// vuol dire tarare sul rumore, e si vedrebbe subito nella verifica.
// ⚠️ Il disaccordo **non si penalizza un po': si esclude**. Misurato: quando il
// campo contraddice il mercato il suo segno vince 27,2% dove il book ne dava
// 29,5%, e giocarli rende 86,8%. Non è un caso da pesare, è un caso da evitare.
const punteggio = (x, peso) => x.accordoVpm === false ? null
  : x.att + peso * ((x.vpm - 5.5) / 4.5);

const resa = (l) => {
  if (!l.length) return null;
  const m = l.reduce((a, x) => a + (x.vinta ? x.quotaResa : 0), 0) / l.length;
  const sd = Math.sqrt(l.reduce((a, x) => a + Math.pow((x.vinta ? x.quotaResa : 0) - m, 2), 0) / l.length);
  return { m, e: 1.96 * sd / Math.sqrt(l.length), ok: l.filter(x => x.vinta).length / l.length, n: l.length };
};
const migliori = (l, peso) => {
  const con = l.map(x => ({ x, s: punteggio(x, peso) })).filter(y => y.s != null);
  con.sort((a, b) => b.s - a.s || a.x.data.localeCompare(b.x.data));
  return con.slice(0, Math.round(l.length * QUOTA_SCELTE)).map(y => y.x);
};

// ── 1. La taratura ──────────────────────────────────────────────────────────
console.log(`── taratura: che peso dare al campo (si gioca il ${(QUOTA_SCELTE * 100).toFixed(0)}% migliore) ──`);
console.log(`   ${'peso'.padStart(5)}  ${'partite'.padStart(7)}  ${'azzeccate'.padStart(9)}  resa`);
let migliore = null;
for (const peso of [0, 0.02, 0.05, 0.08, 0.10, 0.15, 0.20, 0.30]) {
  const r = resa(migliori(taratura, peso));
  if (!r) continue;
  if (!migliore || r.m > migliore.r.m) migliore = { peso, r };
  console.log(`   ${peso.toFixed(2).padStart(5)}  ${String(r.n).padStart(7)}  ${(r.ok * 100).toFixed(1).padStart(8)}%  ${(r.m * 100).toFixed(1)}% ±${(r.e * 100).toFixed(1)}${peso === 0 ? '   ← solo attendibilità' : ''}`);
}
console.log(`\n   peso scelto: ${migliore.peso.toFixed(2)}`);

// ── 2. La verifica, su stagioni mai viste ───────────────────────────────────
console.log(`\n── verifica su ${stagioni.slice(-2).join(' e ')} ──`);
const senza = resa(migliori(verifica, 0));
const con = resa(migliori(verifica, migliore.peso));
const tutte = resa(verifica);
console.log(`   ${'tutte le partite'.padEnd(26)} ${String(tutte.n).padStart(5)}  ${(tutte.ok * 100).toFixed(1)}%  ${(tutte.m * 100).toFixed(1)}% ±${(tutte.e * 100).toFixed(1)}   ← la base`);
console.log(`   ${'solo attendibilità'.padEnd(26)} ${String(senza.n).padStart(5)}  ${(senza.ok * 100).toFixed(1)}%  ${(senza.m * 100).toFixed(1)}% ±${(senza.e * 100).toFixed(1)}`);
console.log(`   ${('col campo (peso ' + migliore.peso.toFixed(2) + ')').padEnd(26)} ${String(con.n).padStart(5)}  ${(con.ok * 100).toFixed(1)}%  ${(con.m * 100).toFixed(1)}% ±${(con.e * 100).toFixed(1)}`);
console.log(`\n   differenza: ${((con.m - senza.m) * 100 >= 0 ? '+' : '')}${((con.m - senza.m) * 100).toFixed(1)} punti di resa`);

// ── 3. Regge su ogni stagione, o vive di una sola? ─────────────────────────
// ⚠️ Una media su otto stagioni può nascere da sette in pari e una fortunata:
// è già successo con la scala a recupero (10/10/2026). Si guarda stagione per
// stagione, e la decisione si prende sulla **mediana**.
console.log(`\n── stagione per stagione (tutte e otto) ──`);
const diffs = [];
for (const s of stagioni) {
  const l = v.filter(x => x.stagione === s);
  const a = resa(migliori(l, 0)), b = resa(migliori(l, migliore.peso));
  if (!a || !b) continue;
  diffs.push((b.m - a.m) * 100);
  console.log(`   ${s}  solo att ${(a.m * 100).toFixed(1)}%  ·  col campo ${(b.m * 100).toFixed(1)}%  ·  ${((b.m - a.m) * 100 >= 0 ? '+' : '')}${((b.m - a.m) * 100).toFixed(1)}`);
}
const ord = [...diffs].sort((x, y) => x - y);
console.log(`\n   mediana della differenza: ${ord[Math.floor(ord.length / 2)].toFixed(1)} punti · positiva in ${diffs.filter(d => d > 0).length} stagioni su ${diffs.length}`);

await sql.end();
