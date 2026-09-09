// Verifica di sanità dello storico importato in Neon.
//
// Uso:  DATABASE_URL='postgres://...' node scripts/verifica-storico.js
//
// Da rilanciare ogni volta che si importa una stagione nuova. Non "passa" o
// "fallisce": stampa i numeri e segnala i sospetti, poi si guardano.

import { sql, chiudi } from '../lib/db.js';
import { CAMPIONATI, STAGIONI } from './import-storico.js';



// 1. Quante partite per stagione e campionato, e quante hanno le quote.
console.log('=== Conteggi e copertura quote ===');
const conteggi = await sql`
  SELECT stagione, div,
         COUNT(*)::int AS partite,
         COUNT(ps_1)::int AS con_pinnacle,
         COUNT(avg_1)::int AS con_media,
         COUNT(avg_over25)::int AS con_ou,
         MIN(data) AS dal, MAX(data) AS al
  FROM partite GROUP BY stagione, div ORDER BY stagione, div
`;
console.log('stag  camp  partite  pinnacle  media  o/u   periodo');
for (const r of conteggi) {
  const soloData = d => (d instanceof Date ? d.toISOString() : String(d)).slice(0, 10);
  console.log(`${r.stagione}  ${r.div.padEnd(4)} ${String(r.partite).padStart(6)}  ${String(r.con_pinnacle).padStart(8)}  ${String(r.con_media).padStart(5)}  ${String(r.con_ou).padStart(4)}  ${soloData(r.dal)} → ${soloData(r.al)}`);
}

const [{ totale }] = await sql`SELECT COUNT(*)::int AS totale FROM partite`;
console.log(`\nTotale: ${totale} partite`);

const mancanti = [];
for (const s of STAGIONI) for (const d of Object.keys(CAMPIONATI)) {
  if (!conteggi.some(r => r.stagione === s && r.div === d)) mancanti.push(`${s}/${d}`);
}
console.log(mancanti.length ? `\n⚠ Combinazioni assenti: ${mancanti.join(', ')}` : '\nTutte le 100 combinazioni stagione/campionato sono presenti.');

// 2. Una squadra con troppe poche partite in una stagione = import parziale
//    o nome incoerente che spezza lo storico in due.
console.log('\n=== Squadre con meno di 10 partite in una stagione ===');
const poche = await sql`
  SELECT stagione, div, squadra, COUNT(*)::int AS n FROM (
    SELECT stagione, div, casa AS squadra FROM partite
    UNION ALL
    SELECT stagione, div, trasferta AS squadra FROM partite
  ) t GROUP BY stagione, div, squadra HAVING COUNT(*) < 10 ORDER BY n
`;
console.log(poche.length ? poche.map(r => `  ${r.stagione}/${r.div}  ${r.squadra}: ${r.n}`).join('\n') : '  (nessuna)');

// 3. Coerenza fra esito e gol: se non torna, il parser ha sbagliato colonna.
const [{ incoerenti }] = await sql`
  SELECT COUNT(*)::int AS incoerenti FROM partite
  WHERE esito <> CASE WHEN gol_casa > gol_trasferta THEN 'H'
                      WHEN gol_casa < gol_trasferta THEN 'A' ELSE 'D' END
`;
console.log(`\nEsiti incoerenti con i gol: ${incoerenti}${incoerenti ? '  ⚠ IL PARSER HA UN BUG' : ''}`);

// 4. Il margine del bookmaker. È la verifica che conta di più: se le probabilità
//    implicite non sommano a ~1.02-1.08, le colonne delle quote sono sbagliate
//    o disallineate — e tutto il backtest sarebbe costruito su un errore.
console.log('\n=== Margine implicito medio (deve stare fra 1.02 e 1.08) ===');
const margini = await sql`
  SELECT stagione,
         ROUND(AVG(1/ps_1 + 1/ps_x + 1/ps_2)::numeric, 4) AS pinnacle,
         ROUND(AVG(1/avg_1 + 1/avg_x + 1/avg_2)::numeric, 4) AS media
  FROM partite WHERE ps_1 IS NOT NULL GROUP BY stagione ORDER BY stagione
`;
for (const r of margini) {
  const ok = r.pinnacle > 1.01 && r.pinnacle < 1.10;
  console.log(`  ${r.stagione}  pinnacle=${r.pinnacle}  media_mercato=${r.media ?? '—'}  ${ok ? '' : '⚠ FUORI RANGE'}`);
}

// 5. Quote impossibili.
const [{ assurde }] = await sql`
  SELECT COUNT(*)::int AS assurde FROM partite
  WHERE ps_1 <= 1 OR ps_x <= 1 OR ps_2 <= 1 OR ps_1 > 100 OR ps_x > 100 OR ps_2 > 100
`;
console.log(`\nQuote fuori scala (<=1 o >100): ${assurde}`);

// La connessione è un socket aperto: senza chiuderla lo script non termina.
await chiudi();
