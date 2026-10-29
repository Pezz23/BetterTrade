// Riempie i FALLI delle partite già in archivio, dai CSV di football-data
// (29/10/2026, `sql/47`).
//
// Perché uno script a parte e non `import-storico.js` su tutte le stagioni:
// quello riscrive **ogni colonna** di 54.000 righe per aggiungerne due. Qui si
// toccano **solo** `falli_casa` e `falli_trasf`, e solo dove sono vuote — il
// resto della riga non si guarda nemmeno.
//
// La chiave è quella dell'import, `(div, stagione, data, casa, trasferta)`, e
// passa dalla stessa `estrai()`: stessi nomi normalizzati, stesse date. Le
// partite delle coppe, dell'Olanda 2 e del Giappone vengono solo da ESPN e
// qui non ci sono: per quelle serve il recupero lento da ESPN.
//
// Uso:
//   node --env-file=.env scripts/recupera-falli.js                    # prova a vuoto
//   node --env-file=.env scripts/recupera-falli.js --esegui
//   node --env-file=.env scripts/recupera-falli.js --stagioni=2627    # solo alcune

import { sql, chiudi } from '../lib/db.js';
import { CAMPIONATI, STAGIONI, scarica, estrai } from './import-storico.js';

const ESEGUI = process.argv.includes('--esegui');
const argSt = process.argv.find(a => a.startsWith('--stagioni='));
const stagioni = argSt ? argSt.split('=')[1].split(',') : STAGIONI;

console.log(ESEGUI ? '── ESECUZIONE\n' : '── PROVA A VUOTO — nessuna scrittura. Aggiungi --esegui per procedere.\n');

// Prima si scarica tutto: se la rete cade a metà non si è scritto niente.
const conFalli = [];
for (const stagione of stagioni) {
  const conteggi = [];
  for (const div of Object.keys(CAMPIONATI)) {
    const { partite } = estrai(await scarica(stagione, div), stagione, div);
    const piene = partite.filter(p => p.falli_casa != null && p.falli_trasf != null);
    conFalli.push(...piene);
    conteggi.push(`${div}:${piene.length}/${partite.length}`);
  }
  console.log(`  ${stagione}  ${conteggi.join(' ')}`);
}

let agganciate = 0, scritte = 0;
const BLOCCO = 1000;
for (let i = 0; i < conFalli.length; i += BLOCCO) {
  const valori = conFalli.slice(i, i + BLOCCO).map(p => [p.div, p.stagione, p.data, p.casa, p.trasferta, p.falli_casa, p.falli_trasf]);
  // ⚠️ `falli_casa is null`: un secondo giro non riscrive niente, e un valore
  // arrivato da ESPN non viene sovrascritto.
  const [r] = await sql`
    with v (div, stagione, data, casa, trasferta, fc, ft) as (values ${sql(valori)}),
    trovate as (
      select p.id, v.fc::int as fc, v.ft::int as ft, p.falli_casa is null as vuota
      from v join partite p
        on p.div = v.div and p.stagione = v.stagione and p.data = v.data::date
       and p.casa = v.casa and p.trasferta = v.trasferta
    ),
    scritte as (
      update partite p set falli_casa = t.fc, falli_trasf = t.ft
      from trovate t
      where ${ESEGUI} and p.id = t.id and t.vuota
      returning 1
    )
    select (select count(*) from trovate)::int as agganciate,
           (select count(*) from trovate where vuota)::int as da_scrivere,
           (select count(*) from scritte)::int as scritte`;
  agganciate += r.agganciate; scritte += ESEGUI ? r.scritte : r.da_scrivere;
}

console.log(`\n  nei CSV con i falli     ${conFalli.length}`);
console.log(`  agganciate all'archivio ${agganciate}${agganciate < conFalli.length ? `  (⚠️ ${conFalli.length - agganciate} non trovate)` : ''}`);
console.log(`  ${ESEGUI ? 'scritte' : 'da scrivere'}             ${scritte}`);
const [t] = await sql`select count(*)::int tot, count(falli_casa)::int con_falli, count(gialli_casa)::int con_gialli from partite`;
console.log(`\n  in archivio: ${t.tot} partite · con i falli ${t.con_falli} · con i cartellini ${t.con_gialli}`);
await chiudi();
