// Scarica le prossime partite con le loro quote e le mette in `prossime_partite`.
//
// Fonte: https://football-data.co.uk/fixtures.csv — non è una finestra di 7
// giorni ma IL PROSSIMO BLOCCO di partite, sostituito ogni volta. Le quote sono
// raccolte il venerdì pomeriggio (weekend) e il martedì (infrasettimanale).
// Quindi: si lancia due volte a settimana, e ogni volta si accumula.
//
// Non cancella mai niente. Ogni riga è la fotografia delle quote nel momento
// del download (`scaricato_il`). Se la stessa partita è già presente, le quote
// e l'istante vengono aggiornati: la fotografia più recente vince.
//
// Prende solo i campionati che seguiamo (CAMPIONATI in import-storico.js): il
// file contiene anche E2, G1, SC1 e altri che non abbiamo in archivio.
//
// Uso:
//   node --env-file=.env scripts/importa-prossime.js            # prova a vuoto
//   node --env-file=.env scripts/importa-prossime.js --esegui

import { sql, chiudi } from '../lib/db.js';
import { CAMPIONATI, parseCsv, parseData, normalizzaSquadra } from './import-storico.js';
import { scaricaDaFootballData } from '../lib/rete.js';

const ESEGUI = process.argv.includes('--esegui');

// Colonne del CSV → colonne della tabella. Qui sono tutte quote di apertura,
// quindi Avg/Max si chiamano avg_ap/max_ap — in `partite` avg/max sono di
// CHIUSURA e il nome deve dirlo.
const QUOTE = {
  b365_1: 'B365H', b365_x: 'B365D', b365_2: 'B365A',
  bfe_ap_1: 'BFEH', bfe_ap_x: 'BFED', bfe_ap_2: 'BFEA',
  avg_ap_1: 'AvgH', avg_ap_x: 'AvgD', avg_ap_2: 'AvgA',
  max_ap_1: 'MaxH', max_ap_x: 'MaxD', max_ap_2: 'MaxA',
  b365_over25: 'B365>2.5', b365_under25: 'B365<2.5',
  bfe_ap_over25: 'BFE>2.5', bfe_ap_under25: 'BFE<2.5',
  avg_ap_over25: 'Avg>2.5', avg_ap_under25: 'Avg<2.5',
  max_ap_over25: 'Max>2.5', max_ap_under25: 'Max<2.5',
};
const COLONNE = ['div', 'campionato', 'data', 'ora', 'casa', 'trasferta', ...Object.keys(QUOTE)];

const numero = v => { const n = parseFloat(v); return Number.isFinite(n) && n > 1 ? n : null; };

// ── Scarica ─────────────────────────────────────────────────────────────────
let grezze;
try { grezze = parseCsv(await scaricaDaFootballData('/fixtures.csv')); }
catch (e) { console.error(`✗ impossibile scaricare il file: ${e.message}`); await chiudi(); process.exit(1); }

// ── Estrai solo quello che seguiamo ─────────────────────────────────────────
const scartate = {};
const righe = [];
for (const r of grezze) {
  if (!CAMPIONATI[r.Div]) { scartate[r.Div] = (scartate[r.Div] || 0) + 1; continue; }
  const data = parseData(r.Date);
  if (!data || !r.HomeTeam || !r.AwayTeam) continue;
  const riga = {
    div: r.Div,
    campionato: CAMPIONATI[r.Div],
    data,
    ora: r.Time?.match(/^\d{2}:\d{2}$/) ? r.Time : null,
    casa: normalizzaSquadra(r.HomeTeam.trim(), r.Div),
    trasferta: normalizzaSquadra(r.AwayTeam.trim(), r.Div),
  };
  for (const [col, csv] of Object.entries(QUOTE)) riga[col] = numero(r[csv]);
  righe.push(riga);
}

// ── Racconta cosa farebbe ───────────────────────────────────────────────────
console.log(ESEGUI ? '── ESECUZIONE\n' : '── PROVA A VUOTO — nessuna scrittura. Aggiungi --esegui per procedere.\n');
console.log(`  nel file            ${grezze.length} partite`);
console.log(`  dei nostri campionati ${righe.length}`);
if (Object.keys(scartate).length)
  console.log(`  scartate (non seguiti) ${Object.entries(scartate).map(([d, n]) => `${d}:${n}`).join(' ')}`);
if (righe.length) {
  const date = righe.map(r => r.data).sort();
  console.log(`  periodo             ${date[0]} → ${date[date.length - 1]}`);
  const conEx = righe.filter(r => r.bfe_ap_1).length;
  console.log(`  con exchange        ${conEx}/${righe.length}`);
  console.log();
  for (const r of righe) {
    const ex = r.bfe_ap_1 ? `ex ${r.bfe_ap_1}/${r.bfe_ap_x}/${r.bfe_ap_2}` : 'ex —';
    console.log(`  ${r.div.padEnd(4)} ${r.data} ${(r.ora || '     ')}  ${(r.casa + ' - ' + r.trasferta).padEnd(36)} b365 ${r.b365_1}/${r.b365_x}/${r.b365_2}  ${ex}`);
  }
}

if (!ESEGUI || !righe.length) { await chiudi(); process.exit(0); }

// ── Scrivi: la fotografia più recente vince ─────────────────────────────────
const daAggiornare = [...Object.keys(QUOTE), 'ora', 'campionato'];
await sql`
  insert into prossime_partite ${sql(righe, ...COLONNE)}
  on conflict (div, data, casa, trasferta) do update set
    ${sql(daAggiornare.reduce((acc, c) => ({ ...acc, [c]: sql`excluded.${sql(c)}` }), {}))},
    scaricato_il = now()
`;

const [{ tot, future }] = await sql`
  select count(*)::int as tot, count(*) filter (where data >= current_date)::int as future from prossime_partite`;
console.log(`\n✓ salvate ${righe.length} · in tabella ${tot} partite, di cui ${future} ancora da giocare`);
await chiudi();
