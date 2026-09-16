// Collega le partite future già giocate alla loro riga nello storico.
//
// Non sposta niente: `prossime_partite` resta la fotografia di cosa si vedeva
// prima, `partite` è il risultato. Qui si mette solo il puntatore
// (partita_id) e si controlla che la fotografia fosse fedele: le quote Bet365
// che avevamo visto al download devono coincidere con quelle di apertura che
// football-data ha registrato.
//
// Ordine della routine settimanale:
//   1. import-storico --stagioni=2627    (i risultati entrano in partite)
//   2. riconcilia-prossime               (le future giocate trovano la loro riga)
//   3. importa-prossime --esegui         (le nuove future)
//
// Una partita futura può non trovarsi nello storico per tre motivi:
//   · non è ancora stata importata     → rilanciare import-storico
//   · è stata rinviata                 → si cerca anche nei ±7 giorni
//   · le squadre hanno un nome diverso → va aggiunto ad ALIAS in import-storico
//
// Uso:
//   node --env-file=.env scripts/riconcilia-prossime.js            # prova a vuoto
//   node --env-file=.env scripts/riconcilia-prossime.js --esegui

import { sql, chiudi } from '../lib/db.js';

const ESEGUI = process.argv.includes('--esegui');
const TOLLERANZA_QUOTE = 0.05;   // 5%: oltre, la fotografia non è fedele

const daFare = await sql`
  select p.id, p.div, p.data, p.casa, p.trasferta, p.b365_1, p.b365_x, p.b365_2, p.scaricato_il
  from prossime_partite p
  where p.partita_id is null and p.data < current_date
  order by p.data, p.div`;

console.log(ESEGUI ? '── ESECUZIONE\n' : '── PROVA A VUOTO — nessuna scrittura. Aggiungi --esegui per procedere.\n');
console.log(`  partite future già giocate e non ancora collegate: ${daFare.length}\n`);

const collegate = [], rinviate = [], nonTrovate = [], quoteDiverse = [];

for (const p of daFare) {
  // Prima la data esatta, poi i giorni vicini (rinvii).
  let [m] = await sql`select id, data, esito, gol_casa, gol_trasferta, b365_1, b365_x, b365_2
                      from partite where div=${p.div} and data=${p.data} and casa=${p.casa} and trasferta=${p.trasferta}`;
  let rinviata = false;
  if (!m) {
    [m] = await sql`select id, data, esito, gol_casa, gol_trasferta, b365_1, b365_x, b365_2
                    from partite where div=${p.div} and casa=${p.casa} and trasferta=${p.trasferta}
                      and data between ${p.data}::date - 7 and ${p.data}::date + 7
                    order by abs(data - ${p.data}::date) limit 1`;
    rinviata = !!m;
  }
  if (!m) { nonTrovate.push(p); continue; }

  // La fotografia era fedele? Bet365 al download vs Bet365 apertura registrata.
  const scarti = [['1', p.b365_1, m.b365_1], ['X', p.b365_x, m.b365_x], ['2', p.b365_2, m.b365_2]]
    .filter(([, a, b]) => a && b)
    .map(([s, a, b]) => ({ s, nostra: a, loro: b, diff: Math.abs(a / b - 1) }));
  const peggiore = scarti.reduce((x, y) => (y.diff > (x?.diff ?? -1) ? y : x), null);

  const voce = { ...p, partita: m, rinviata, peggiore };
  (rinviata ? rinviate : collegate).push(voce);
  if (peggiore && peggiore.diff > TOLLERANZA_QUOTE) quoteDiverse.push(voce);

  if (ESEGUI) {
    await sql`update prossime_partite set partita_id=${m.id}, riconciliata_il=now() where id=${p.id}`;
  }
}

const fmt = v => `${v.div.padEnd(4)} ${v.data.toISOString().slice(0, 10)}  ${(v.casa + ' - ' + v.trasferta).padEnd(34)}`;
const ris = m => `${m.gol_casa}-${m.gol_trasferta} (${m.esito})`;

if (collegate.length) {
  console.log(`  ✓ collegate (${collegate.length}):`);
  for (const v of collegate) console.log(`      ${fmt(v)} ${ris(v.partita).padEnd(9)} quote: viste ${v.b365_1}/${v.b365_x}/${v.b365_2} · registrate ${v.partita.b365_1}/${v.partita.b365_x}/${v.partita.b365_2}`);
}
if (rinviate.length) {
  console.log(`\n  ↻ trovate a una data diversa — rinviate (${rinviate.length}):`);
  for (const v of rinviate) console.log(`      ${fmt(v)} → giocata il ${v.partita.data.toISOString().slice(0, 10)}  ${ris(v.partita)}`);
}
if (quoteDiverse.length) {
  console.log(`\n  ⚠️  quote viste diverse da quelle registrate oltre il ${TOLLERANZA_QUOTE * 100}% (${quoteDiverse.length}):`);
  for (const v of quoteDiverse) console.log(`      ${fmt(v)} segno ${v.peggiore.s}: vista ${v.peggiore.nostra}, registrata ${v.peggiore.loro} (${(v.peggiore.diff * 100).toFixed(1)}%)`);
  console.log('      → football-data registra l\'apertura; noi vediamo il prezzo al download. Se lo scarto è sistematico, la "apertura" nello storico non è il prezzo che si gioca.');
}
if (nonTrovate.length) {
  console.log(`\n  ✗ non trovate nello storico (${nonTrovate.length}):`);
  for (const v of nonTrovate) console.log(`      ${fmt(v)}`);
  console.log('      → probabilmente lo storico non è aggiornato: node --env-file=.env scripts/import-storico.js --stagioni=2627');
}

const fedeli = collegate.length + rinviate.length - quoteDiverse.length;
console.log(`\n  riepilogo: ${collegate.length + rinviate.length} collegate (${fedeli} con quote fedeli), ${nonTrovate.length} in attesa`);
if (!ESEGUI && daFare.length) console.log('  (nessuna scrittura: rilancia con --esegui per salvare i collegamenti)');
await chiudi();
