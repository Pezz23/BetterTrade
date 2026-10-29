// Riempie le colonne NUOVE delle partite già in archivio, dai CSV di
// football-data: i FALLI (`sql/47`) e l'ORA (`sql/48`), 29/10/2026.
// (Si chiamava `recupera-falli.js`; l'ora è arrivata lo stesso giorno.)
//
// Perché uno script a parte e non `import-storico.js` su tutte le stagioni:
// quello riscrive **ogni colonna** di 54.000 righe per aggiungerne tre. Qui si
// toccano **solo** `falli_casa`, `falli_trasf` e `ora`, e solo dove sono
// vuote — il resto della riga non si guarda nemmeno.
// ⚠️ L'ora c'è dalla 2019/20: le tre stagioni prima restano senza.
// ⚠️ Le partite create da ESPN (football-data non le aveva ancora) prendono
// l'ora dal calendario, a cui sono collegate con `partita_id`.
//
// La chiave è quella dell'import, `(div, stagione, data, casa, trasferta)`, e
// passa dalla stessa `estrai()`: stessi nomi normalizzati, stesse date. Le
// partite delle coppe, dell'Olanda 2 e del Giappone vengono solo da ESPN e
// qui non ci sono: per quelle serve il recupero lento da ESPN.
//
// Uso:
//   node --env-file=.env scripts/recupera-da-csv.js                    # prova a vuoto
//   node --env-file=.env scripts/recupera-da-csv.js --esegui
//   node --env-file=.env scripts/recupera-da-csv.js --stagioni=2627    # solo alcune

import { sql, chiudi } from '../lib/db.js';
import { CAMPIONATI, STAGIONI, scarica, estrai } from './import-storico.js';

const ESEGUI = process.argv.includes('--esegui');
const argSt = process.argv.find(a => a.startsWith('--stagioni='));
const stagioni = argSt ? argSt.split('=')[1].split(',') : STAGIONI;

console.log(ESEGUI ? '── ESECUZIONE\n' : '── PROVA A VUOTO — nessuna scrittura. Aggiungi --esegui per procedere.\n');

// Prima si scarica tutto: se la rete cade a metà non si è scritto niente.
const utili = [];
for (const stagione of stagioni) {
  const conteggi = [];
  for (const div of Object.keys(CAMPIONATI)) {
    const { partite } = estrai(await scarica(stagione, div), stagione, div);
    const piene = partite.filter(p => (p.falli_casa != null && p.falli_trasf != null) || p.ora);
    utili.push(...piene);
    conteggi.push(`${div}:${piene.length}/${partite.length}`);
  }
  console.log(`  ${stagione}  ${conteggi.join(' ')}`);
}

let agganciate = 0;
const scritte = { falli: 0, ora: 0 };
const BLOCCO = 1000;
for (let i = 0; i < utili.length; i += BLOCCO) {
  const valori = utili.slice(i, i + BLOCCO).map(p => [p.div, p.stagione, p.data, p.casa, p.trasferta, p.falli_casa, p.falli_trasf, p.ora]);
  // ⚠️ Solo dove la colonna è vuota: un secondo giro non riscrive niente, e
  // un valore arrivato da ESPN non viene sovrascritto. Ogni colonna per conto
  // suo: una riga che ha già i falli può non avere l'ora.
  const [r] = await sql`
    with v (div, stagione, data, casa, trasferta, fc, ft, ora) as (values ${sql(valori)}),
    trovate as (
      select p.id, v.fc::int as fc, v.ft::int as ft, v.ora::time as ora,
             p.falli_casa is null and v.fc is not null as senza_falli,
             p.ora is null and v.ora is not null as senza_ora
      from v join partite p
        on p.div = v.div and p.stagione = v.stagione and p.data = v.data::date
       and p.casa = v.casa and p.trasferta = v.trasferta
    ),
    scritte as (
      update partite p set
        falli_casa  = case when t.senza_falli then t.fc else p.falli_casa end,
        falli_trasf = case when t.senza_falli then t.ft else p.falli_trasf end,
        ora         = case when t.senza_ora then t.ora else p.ora end
      from trovate t
      where ${ESEGUI} and p.id = t.id and (t.senza_falli or t.senza_ora)
      returning 1
    )
    select (select count(*) from trovate)::int as agganciate,
           (select count(*) from trovate where senza_falli)::int as falli,
           (select count(*) from trovate where senza_ora)::int as ora,
           (select count(*) from scritte)::int as scritte`;
  agganciate += r.agganciate; scritte.falli += r.falli; scritte.ora += r.ora;
}

// Le partite create da ESPN: l'ora dal calendario a cui sono collegate.
const [daEspn] = await sql`
  with s as (
    update partite p set ora = pp.ora
    from prossime_partite pp
    where ${ESEGUI} and pp.partita_id = p.id and p.ora is null and pp.ora is not null
    returning 1
  )
  select (select count(*) from partite p join prossime_partite pp on pp.partita_id = p.id
          where p.ora is null and pp.ora is not null)::int as da_scrivere,
         (select count(*) from s)::int as scritte`;

console.log(`\n  nei CSV, con falli o ora ${utili.length}`);
console.log(`  agganciate all'archivio  ${agganciate}${agganciate < utili.length ? `  (⚠️ ${utili.length - agganciate} non trovate)` : ''}`);
console.log(`  ${ESEGUI ? 'scritte' : 'da scrivere'}: falli ${scritte.falli} · ora ${scritte.ora} · ora dal calendario ${ESEGUI ? daEspn.scritte : daEspn.da_scrivere}`);
const [t] = await sql`select count(*)::int tot, count(falli_casa)::int con_falli, count(ora)::int con_ora,
  count(*) filter (where stagione >= '1920' and fonte = 'football-data')::int fd_recenti,
  count(ora) filter (where stagione >= '1920' and fonte = 'football-data')::int fd_recenti_ora from partite`;
console.log(`\n  in archivio: ${t.tot} partite · con i falli ${t.con_falli} · con l'ora ${t.con_ora}` +
  ` (football-data dalla 2019/20: ${t.fd_recenti_ora}/${t.fd_recenti})`);
await chiudi();
