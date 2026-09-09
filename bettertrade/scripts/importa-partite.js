// Carica l'archivio storico delle partite in Supabase.
//
// Sorgente: btscout/.cache/partite.json — la copia locale dell'archivio che
// stava su Neon. Si legge da lì e non da Neon di proposito: Neon resta intatto
// come rete di sicurezza finché non abbiamo verificato che qui c'è tutto.
//
// ⚠️ LE DATE. Nel file JSON la data è un istante UTC, perché il driver di Neon
// ha letto una colonna DATE e l'ha resa come Date locale, poi serializzata in
// UTC: "2016-08-25T22:00:00.000Z" sono le 00:00 del 26 agosto ora italiana.
// Tagliare i primi 10 caratteri sposterebbe TUTTO l'archivio indietro di un
// giorno — verificato: succede su tutte e 38.613 le righe. Si ricostruisce la
// data dai componenti locali, che sono quelli con cui è stata scritta.
//
// È ripetibile: il vincolo unique (div, stagione, data, casa, trasferta) fa sì
// che rilanciarlo aggiorni invece di duplicare.
//
// Uso:
//   node --env-file=.env scripts/importa-partite.js            # prova a vuoto
//   node --env-file=.env scripts/importa-partite.js --esegui

import { readFileSync } from 'node:fs';
import { admin } from './_admin.js';

const ESEGUI = process.argv.includes('--esegui');
const LOTTO  = 500;   // righe per richiesta

const COLONNE = [
  'div', 'campionato', 'stagione', 'data', 'casa', 'trasferta',
  'gol_casa', 'gol_trasferta', 'esito',
  'tiri_casa', 'tiri_trasf', 'tirip_casa', 'tirip_trasf',
  'angoli_casa', 'angoli_trasf', 'gialli_casa', 'gialli_trasf',
  'rossi_casa', 'rossi_trasf', 'gol1t_casa', 'gol1t_trasf',
  'ps_1', 'ps_x', 'ps_2', 'avg_1', 'avg_x', 'avg_2',
  'max_1', 'max_x', 'max_2', 'b365_1', 'b365_x', 'b365_2',
  'avg_over25', 'avg_under25', 'b365_over25', 'b365_under25',
];

// La data com'era prima di passare per UTC.
const giornoLocale = d => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

const sorgente = new URL('../../btscout/.cache/partite.json', import.meta.url);
const grezze = JSON.parse(readFileSync(sorgente, 'utf8'));

const righe = grezze.map(r => {
  const out = {};
  for (const c of COLONNE) out[c] = r[c] === undefined ? null : r[c];
  out.data = giornoLocale(r.data);   // l'id di Neon non si porta dietro
  return out;
});

// Due partite non possono avere la stessa chiave: se succede, l'upsert ne
// perderebbe una in silenzio.
const chiavi = new Set(righe.map(r => `${r.div}|${r.stagione}|${r.data}|${r.casa}|${r.trasferta}`));

const date = righe.map(r => r.data).sort();
const campionati = [...new Set(righe.map(r => r.div))].sort();
const stagioni = [...new Set(righe.map(r => r.stagione))].sort();

console.log(ESEGUI ? '── ESECUZIONE\n' : '── PROVA A VUOTO — nessuna scrittura. Aggiungi --esegui per procedere.\n');
console.log(`  righe da caricare   ${righe.length}`);
console.log(`  chiavi distinte     ${chiavi.size}${chiavi.size === righe.length ? '' : '  ⚠️ CI SONO DOPPIONI'}`);
console.log(`  periodo             ${date[0]} → ${date[date.length - 1]}`);
console.log(`  campionati          ${campionati.length}  ${campionati.join(' ')}`);
console.log(`  stagioni            ${stagioni.length}  ${stagioni.join(' ')}`);

const { count: giaPresenti } = await admin.from('partite').select('*', { count: 'exact', head: true });
console.log(`  già in Supabase     ${giaPresenti ?? 0}`);

if (chiavi.size !== righe.length) {
  console.error('\n✗ Ci sono righe con la stessa chiave: l\'upsert ne perderebbe una. Fermo qui.');
  process.exit(1);
}
if (!ESEGUI) process.exit(0);

console.log();
let caricate = 0;
for (let i = 0; i < righe.length; i += LOTTO) {
  const lotto = righe.slice(i, i + LOTTO);
  const { error } = await admin.from('partite')
    .upsert(lotto, { onConflict: 'div,stagione,data,casa,trasferta' });
  if (error) { console.error(`\n✗ lotto a partire da ${i}: ${error.message}`); process.exit(1); }
  caricate += lotto.length;
  process.stdout.write(`\r  caricate ${caricate}/${righe.length}`);
}

const { count: finali } = await admin.from('partite').select('*', { count: 'exact', head: true });
console.log(`\n\n✓ in Supabase ci sono ${finali} partite`);
if (finali !== righe.length) console.log(`⚠️  attese ${righe.length}: controlla prima di dismettere Neon`);
