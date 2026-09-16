// Le partite in programma da The Odds API, con il consenso di 40+ bookmaker,
// tre-quattro settimane in anticipo. Seconda fonte accanto a football-data.
//
// Cosa scrive in prossime_partite:
//   avg_ap_*   media delle quote di tutti i bookmaker (come l'Avg di football-data)
//   max_ap_*   la migliore
//   bfe_ap_*   Betfair Exchange, se presente
//   book_*     le quote del bookmaker di riferimento — Codere, l'unico con
//              licenza italiana fra quelli presenti (scelto il 16/09/2026).
//              Configurabile con ODDS_BOOK in .env. Il nome del book è salvato
//              nella colonna `book`: se cambia, non c'è niente da rinominare.
//   b365_*     NIENTE: The Odds API non ha Bet365. Se la riga esiste già da
//              football-data, Bet365 resta com'era. Non si sovrascrive con null.
//
// I nomi vengono tradotti con lib/nomi-squadre.js e verificati contro
// l'archivio: una squadra sconosciuta viene segnalata e SALTATA, mai inserita
// con un nome che non aggancia lo storico.
//
// Gli orari si salvano in ora del Regno Unito, come fa football-data.
//
// Costo: 2 crediti per campionato (regioni eu+uk), 30 per giro. Con 4 giri al
// mese, 120 dei 500 gratuiti.
//
// Uso:
//   node --env-file=.env scripts/importa-prossime-odds.js            # prova a vuoto (costa comunque 30 crediti)
//   node --env-file=.env scripts/importa-prossime-odds.js --esegui

import { sql, chiudi } from '../lib/db.js';
import { quote, SPORT } from '../lib/odds-api.js';
import { traduci } from '../lib/nomi-squadre.js';
import { CAMPIONATI } from './import-storico.js';

const ESEGUI = process.argv.includes('--esegui');
const BOOK = process.env.ODDS_BOOK || 'codere_it';

// Nomi validi per campionato: quelli visti nell'archivio nelle ultime due stagioni.
const validi = new Map();
for (const r of await sql`select div, casa as sq from partite where stagione in ('2526','2627') group by div, casa`)
  (validi.get(r.div) || validi.set(r.div, new Set()).get(r.div)).add(r.sq);

// Data e ora nel fuso del Regno Unito, come football-data.
function dataOraUK(iso) {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const p = Object.fromEntries(f.formatToParts(d).map(x => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, ora: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}

const media = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
const massimo = v => v.length ? Math.max(...v) : null;

const righe = [], sconosciute = new Map(), riepilogo = [];
let creditiUsati = 0, creditiRimasti = null;

for (const div of Object.keys(SPORT)) {
  let dati;
  try {
    const r = await quote(div);
    dati = r.dati; creditiUsati += r.crediti.usati; creditiRimasti = r.crediti.rimasti;
  } catch (e) { console.error(`✗ ${div}: ${e.message}`); continue; }

  let prese = 0, saltate = 0;
  for (const ev of dati) {
    const casa = traduci(div, ev.home_team), trasferta = traduci(div, ev.away_team);
    const ok = validi.get(div);
    let salta = false;
    for (const [orig, trad] of [[ev.home_team, casa], [ev.away_team, trasferta]]) {
      if (!ok?.has(trad)) { sconosciute.set(`${div}|${orig}`, trad); salta = true; }
    }
    if (salta) { saltate++; continue; }

    // Per ogni bookmaker, le tre quote 1X2 nell'ordine casa / pareggio / trasferta.
    const q1 = [], qx = [], q2 = []; let bfe = null, book = null;
    for (const b of ev.bookmakers) {
      const m = b.markets.find(m => m.key === 'h2h'); if (!m) continue;
      const o = Object.fromEntries(m.outcomes.map(x => [x.name, x.price]));
      const a = o[ev.home_team], d = o['Draw'], c = o[ev.away_team];
      if (!(a > 1 && d > 1 && c > 1)) continue;
      q1.push(a); qx.push(d); q2.push(c);
      if (b.key.startsWith('betfair_ex') && !bfe) bfe = [a, d, c];
      if (b.key === BOOK) book = [a, d, c];
    }
    if (q1.length < 3) { saltate++; continue; }   // troppo pochi book per un consenso

    const { data, ora } = dataOraUK(ev.commence_time);
    righe.push({
      div, campionato: CAMPIONATI[div], data, ora, casa, trasferta, fonte: 'odds-api',
      avg_ap_1: media(q1), avg_ap_x: media(qx), avg_ap_2: media(q2),
      max_ap_1: massimo(q1), max_ap_x: massimo(qx), max_ap_2: massimo(q2),
      bfe_ap_1: bfe?.[0] ?? null, bfe_ap_x: bfe?.[1] ?? null, bfe_ap_2: bfe?.[2] ?? null,
      book: book ? BOOK : null,
      book_1: book?.[0] ?? null, book_x: book?.[1] ?? null, book_2: book?.[2] ?? null,
      _book: q1.length,
    });
    prese++;
  }
  riepilogo.push(`${div}:${prese}${saltate ? `(−${saltate})` : ''}`);
}

console.log(ESEGUI ? '── ESECUZIONE\n' : '── PROVA A VUOTO — nessuna scrittura. Aggiungi --esegui per procedere.\n');
console.log(`  crediti usati ${creditiUsati} · rimasti ${creditiRimasti}`);
console.log(`  partite prese  ${righe.length}   ${riepilogo.join('  ')}`);
if (righe.length) {
  const date = righe.map(r => r.data).sort();
  console.log(`  periodo        ${date[0]} → ${date[date.length - 1]}`);
  console.log(`  bookmaker per partita: min ${Math.min(...righe.map(r => r._book))} · media ${media(righe.map(r => r._book)).toFixed(0)}`);
  console.log(`  con exchange   ${righe.filter(r => r.bfe_ap_1).length}`);
  const conBook = righe.filter(r => r.book_1).length;
  console.log(`  con ${BOOK.padEnd(11)} ${conBook}/${righe.length}${conBook < righe.length ? '  ⚠️ manca su: ' + [...new Set(righe.filter(r => !r.book_1).map(r => r.div))].join(' ') : ''}`);
}
if (sconosciute.size) {
  console.log(`\n  ⚠️  squadre non riconosciute — partite SALTATE, da aggiungere a lib/nomi-squadre.js:`);
  for (const [k, v] of sconosciute) console.log(`      ${k.replace('|', '  "')}"  →  tradotto in "${v}", non in archivio`);
}

if (!ESEGUI || !righe.length) { await chiudi(); process.exit(sconosciute.size ? 1 : 0); }

const COL = ['div', 'campionato', 'data', 'ora', 'casa', 'trasferta', 'fonte',
  'avg_ap_1', 'avg_ap_x', 'avg_ap_2', 'max_ap_1', 'max_ap_x', 'max_ap_2', 'bfe_ap_1', 'bfe_ap_x', 'bfe_ap_2',
  'book', 'book_1', 'book_x', 'book_2'];
const daAggiornare = COL.filter(c => !['div', 'data', 'casa', 'trasferta'].includes(c));
const pulite = righe.map(r => Object.fromEntries(COL.map(c => [c, r[c]])));

await sql`
  insert into prossime_partite ${sql(pulite, ...COL)}
  on conflict (div, data, casa, trasferta) do update set
    ${sql(daAggiornare.reduce((acc, c) => ({ ...acc, [c]: sql`excluded.${sql(c)}` }), {}))},
    scaricato_il = now()
`;
const [{ tot, future }] = await sql`select count(*)::int as tot, count(*) filter (where data >= current_date)::int as future from prossime_partite`;
console.log(`\n✓ salvate ${righe.length} · in tabella ${tot} partite, ${future} ancora da giocare`);
await chiudi();
