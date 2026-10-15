// IL CONSIGLIO OVER/UNDER: quando parla, quante volte ha ragione?
//
// ⚠️ Il metro **non è il 50%** e nemmeno il mercato: è **"dico sempre la stessa
// cosa"**. Over 1,5 arriva da solo nel 75% delle partite, quindi un consiglio
// che azzecca il 75% non sta dicendo niente. Lo script stampa, accanto a ogni
// numero, la frequenza generale della riga che il consiglio ha scelto.
//
//   node --env-file=.env scripts/prova-consiglio-gol.js --stagioni=8

import { sql } from '../lib/db.js';
import { ricostruisci } from '../lib/ricostruisci.js';
import { consiglioOver, consiglioGg, PAVIMENTI_OVER, BASI_GOL } from '../../app/src/lib/gol.js';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? Number(a.split('=')[1]) : d };
const STAGIONI = arg('stagioni', 8);

const { valutate, stagioni } = await ricostruisci({ stagioni: STAGIONI, daGiornata: 5 });
console.log(`stagioni ${stagioni.join(', ')} · ${valutate.length} partite\n`);

// ⚠️ Le quote over/under 2,5 di **apertura**: sono quelle che esistono quando
// si decide. Con `--mercato` il consiglio sul 2,5 le usa al posto del modello.
const CON_MERCATO = process.argv.includes('--mercato');
const quoteOu = new Map();
for (let i = 0; ; i += 10000) {
  const r = await sql`select id, avg_ap_over25 as o, avg_ap_under25 as u from partite
    where avg_ap_over25 is not null and avg_ap_under25 is not null
    order by id limit 10000 offset ${i}`;
  if (!r.length) break;
  for (const x of r) quoteOu.set(Number(x.id), (1 / Number(x.o)) / (1 / Number(x.o) + 1 / Number(x.u)));
}
const pMerc = v => (CON_MERCATO ? quoteOu.get(Number(v.id)) ?? null : null);
console.log(`quote over 2,5 in archivio: ${quoteOu.size}${CON_MERCATO ? ' — IN USO sul 2,5' : ' (non in uso: aggiungi --mercato)'}\n`);

// l'esito vero della riga consigliata
const avverato = (chiave, gol) => {
  const s = Number(chiave.slice(-1));
  return chiave.startsWith('over') ? gol > s + 0.5 : gol < s + 0.5;
};

const conte = new Map();   // per riga consigliata
let parlato = 0, muto = 0, giusti = 0, baseAttesa = 0;
for (const v of valutate) {
  if (!v.over || v.golTotali == null) continue;
  const c = consiglioOver(v.over, pMerc(v));
  if (!c?.esito) { muto++; continue; }
  parlato++;
  const ok = avverato(c.chiave, v.golTotali);
  if (ok) giusti++;
  baseAttesa += BASI_GOL[c.chiave];          // quanto arriverebbe da sola
  if (!conte.has(c.esito)) conte.set(c.esito, { n: 0, ok: 0, chiave: c.chiave });
  const r = conte.get(c.esito); r.n++; if (ok) r.ok++;
}

const pc = (x, n) => n ? (x / n * 100).toFixed(1) + '%' : '—';
console.log('── IL CONSIGLIO OVER/UNDER ──');
console.log('  pavimenti: ' + Object.entries(PAVIMENTI_OVER)
  .map(([k, v]) => `${k} ${v == null ? 'mai' : (v * 100).toFixed(0) + '%'}`).join(' · '));
console.log(`  parla su     ${parlato} partite (${pc(parlato, parlato + muto)} delle volte)`);
console.log(`  tace su      ${muto}`);
console.log(`  ha ragione   ${pc(giusti, parlato)}`);
console.log(`  la stessa riga, sempre: ${pc(baseAttesa, parlato)}   ← il metro vero`);
console.log(`  scarto       ${((giusti / parlato - baseAttesa / parlato) * 100).toFixed(1)} punti`);
// ⚠️ L'errore si calcola sulle partite su cui il consiglio parla, non su tutte.
const p = giusti / parlato;
console.log(`  margine      ±${(1.96 * Math.sqrt(p * (1 - p) / parlato) * 100).toFixed(1)} punti\n`);

console.log('── per riga consigliata ──');
for (const [esito, r] of [...conte.entries()].sort((a, b) => b[1].n - a[1].n))
  console.log(`  ${esito.padEnd(10)} ${String(r.n).padStart(6)} volte   ${pc(r.ok, r.n)}   (da sola ${(BASI_GOL[r.chiave] * 100).toFixed(1)}%)`);

// ── e il Goal, per confronto: è già misurato, serve a vedere i due insieme ──
let ggParla = 0, ggGiusti = 0;
for (const v of valutate) {
  if (v.gg == null || v.ggVero == null) continue;
  const c = consiglioGg(v.gg);
  if (!c?.esito) continue;
  ggParla++;
  if ((c.esito === 'GOL') === v.ggVero) ggGiusti++;
}
console.log(`\n── IL CONSIGLIO GOAL/NOGOAL ──`);
console.log(`  parla su ${ggParla} partite · ha ragione ${pc(ggGiusti, ggParla)}  (dire sempre GOL: 53,2%)`);

await sql.end();
