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
//   avg_ap_over25 / under25, max_ap_*  il consenso sull'over/under **2,5**
//              (15/10/2026). ⚠️ Solo dai bookmaker che quotano **proprio la
//              linea 2,5**: ognuno pubblica la sua linea principale, e mettere
//              insieme un 2,5 e un 3,25 darebbe una media che non è il prezzo
//              di niente. Se meno di tre book quotano il 2,5 la partita resta
//              senza, come per l'1X2.
//   b365_*     NIENTE: The Odds API non ha Bet365. Se la riga esiste già da
//              football-data, Bet365 resta com'era. Non si sovrascrive con null.
//
// I nomi vengono tradotti con lib/nomi-squadre.js e verificati contro
// l'archivio: una squadra sconosciuta viene segnalata e SALTATA, mai inserita
// con un nome che non aggancia lo storico.
//
// Gli orari si salvano in ora del Regno Unito, come fa football-data.
//
// Costo: 3 crediti per campionato — 2 per l'1X2 (eu+uk) e 1 per l'over/under
// (eu) — cioè 45 per giro, ~360 al mese con due giri a settimana sui 500
// gratuiti.
//
// Uso:
//   node --env-file=.env scripts/importa-prossime-odds.js            # prova a vuoto (costa comunque 30 crediti)
//   node --env-file=.env scripts/importa-prossime-odds.js --esegui

import { sql, chiudi } from '../lib/db.js';
import { quote, totali, SPORT } from '../lib/odds-api.js';
import { traduci } from '../lib/nomi-squadre.js';
import { CAMPIONATI } from './import-storico.js';
// ⚠️ I nomi delle competizioni che football-data **non copre**: `CAMPIONATI`
// elenca i file che si scaricano da football-data, e infilarci la Champions
// farebbe cercare un CSV che non esiste. Il nome sta dov'è la competizione.
import { COMPETIZIONI } from '../lib/espn.js';
import { dataOraItaliana } from '../lib/date.js';
import { spostaRinviate, descriviSpostamenti } from '../lib/rinvii.js';

const ESEGUI = process.argv.includes('--esegui');
// Un campionato per volta: ogni chiamata costa un credito, e quando il DNS ne
// fa cadere due o tre non ha senso ripagare tutti gli altri per riprenderli.
const soloArg = process.argv.find(a => a.startsWith('--campionati='));
const SOLO = soloArg ? soloArg.split('=')[1].split(',').map(x => x.trim().toUpperCase()) : null;
const BOOK = process.env.ODDS_BOOK || 'codere_it';

// Nomi validi per campionato: quelli visti nell'archivio negli ultimi due anni.
// ⚠️⚠️ **Per DATA e non per codice stagione** (22/10/2026). Il filtro era
// `stagione in ('2526','2627')`, e va bene finché tutti i campionati hanno il
// calendario europeo: la J1 giapponese va da febbraio a dicembre, quindi la
// sua stagione **è l'anno** (`'2026'`) e non sarebbe mai entrata in
// quell'elenco — ogni squadra giapponese sarebbe risultata sconosciuta.
// La data invece parla la stessa lingua per tutti.
const validi = new Map();
for (const r of await sql`select div, casa as sq from partite where data > current_date - 730 group by div, casa`)
  (validi.get(r.div) || validi.set(r.div, new Set()).get(r.div)).add(r.sq);

// ⚠️⚠️ **L'ora è quella ITALIANA** (23/10/2026). Qui c'era scritto *"nel fuso
// del Regno Unito, come football-data"*, e l'intenzione era giusta — le due
// fonti devono dire la stessa ora — ma il fuso scelto era quello sbagliato:
// Londra è un'ora indietro rispetto a Roma tutto l'anno, e il calendario
// mostrava le partite delle 15 alle 14. Adesso **tutt'e due** convertono a
// Roma, e la conversione sta in `lib/date.js`, una volta sola.

const media = v => v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
const massimo = v => v.length ? Math.max(...v) : null;

const righe = [], sconosciute = new Map(), riepilogo = [];
let creditiUsati = 0, creditiRimasti = null;

const daFare = Object.keys(SPORT).filter(d => !SOLO || SOLO.includes(d));
if (SOLO) {
  const ignoti = SOLO.filter(d => !SPORT[d]);
  if (ignoti.length) { console.error(`✗ campionati senza corrispondenza su The Odds API: ${ignoti.join(', ')}`); process.exit(1); }
  console.log(`Solo: ${daFare.join(' ')}\n`);
}

for (const div of daFare) {
  let dati, ou = new Map();
  try {
    const r = await quote(div);
    dati = r.dati; creditiUsati += r.crediti.usati; creditiRimasti = r.crediti.rimasti;
  } catch (e) { console.error(`✗ ${div}: ${e.message}`); continue; }
  // ⚠️ L'over/under è una **seconda** chiamata e un credito a parte: se cade,
  // le partite entrano comunque con l'1X2. Un mercato in più non deve poter
  // far perdere quello che era già buono.
  try {
    const r = await totali(div);
    creditiUsati += r.crediti.usati; creditiRimasti = r.crediti.rimasti;
    for (const ev of r.dati) ou.set(ev.id, ev);
  } catch (e) { console.error(`  ⚠️ ${div}: over/under non preso (${e.message.slice(0, 80)})`); }

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

    // ── il consenso sull'over/under, linea per linea ──────────────────────
    // ⚠️⚠️ **Anche la 3,5, che prima si buttava** (23/10/2026). Ogni book
    // quota la SUA linea principale: misurato su 2.227 quote era la 2,5 nel
    // 67% dei casi e la **3,5 nel 23%**. Tenevamo solo la prima e il resto
    // finiva nel cestino — a parità di chiamata, cioè **a costo zero**.
    // ⚠️ `point === 2.5` e non "la linea più vicina al 2,5": un over 2,75 è
    // un altro evento, non una versione imprecisa dello stesso. Vale uguale
    // per la 3,5, ed è il motivo per cui si raccolgono **separate** invece di
    // mescolarle in una media sola.
    const linee = { 2.5: { o: [], u: [] }, 3.5: { o: [], u: [] } };
    for (const b of ou.get(ev.id)?.bookmakers || []) {
      const m = b.markets.find(m => m.key === 'totals'); if (!m) continue;
      for (const punto of [2.5, 3.5]) {
        const o = m.outcomes.find(x => x.name === 'Over' && Number(x.point) === punto);
        const u = m.outcomes.find(x => x.name === 'Under' && Number(x.point) === punto);
        if (o?.price > 1 && u?.price > 1) { linee[punto].o.push(o.price); linee[punto].u.push(u.price); }
      }
    }
    const qo = linee[2.5].o, qu = linee[2.5].u;
    // ⚠️ **Tre book come minimo, su ogni linea separatamente.** Una media di
    // due quote non è un consenso, ed è la stessa soglia che vale per la 2,5.
    const abbastanza = qo.length >= 3;
    const ab35 = linee[3.5].o.length >= 3;

    const { data, ora } = dataOraItaliana(ev.commence_time);
    righe.push({
      div, campionato: CAMPIONATI[div] ?? COMPETIZIONI[div]?.nome, data, ora, casa, trasferta, fonte: 'odds-api',
      avg_ap_1: media(q1), avg_ap_x: media(qx), avg_ap_2: media(q2),
      max_ap_1: massimo(q1), max_ap_x: massimo(qx), max_ap_2: massimo(q2),
      bfe_ap_1: bfe?.[0] ?? null, bfe_ap_x: bfe?.[1] ?? null, bfe_ap_2: bfe?.[2] ?? null,
      book: book ? BOOK : null,
      book_1: book?.[0] ?? null, book_x: book?.[1] ?? null, book_2: book?.[2] ?? null,
      avg_ap_over25: abbastanza ? media(qo) : null,
      avg_ap_under25: abbastanza ? media(qu) : null,
      max_ap_over25: abbastanza ? massimo(qo) : null,
      max_ap_under25: abbastanza ? massimo(qu) : null,
      avg_ap_over35: ab35 ? media(linee[3.5].o) : null,
      avg_ap_under35: ab35 ? media(linee[3.5].u) : null,
      max_ap_over35: ab35 ? massimo(linee[3.5].o) : null,
      max_ap_under35: ab35 ? massimo(linee[3.5].u) : null,
      _book: q1.length, _ou: qo.length, _ou35: linee[3.5].o.length,
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
  const conOu = righe.filter(r => r.avg_ap_over25).length;
  console.log(`  con over/under 2,5  ${conOu}/${righe.length}` +
    (conOu ? `  (${media(righe.filter(r => r._ou).map(r => r._ou)).toFixed(0)} book in media)` : '') +
    (conOu < righe.length ? `  ⚠️ manca su: ${[...new Set(righe.filter(r => !r.avg_ap_over25).map(r => r.div))].join(' ')}` : ''));
  const conBook = righe.filter(r => r.book_1).length;
  console.log(`  con ${BOOK.padEnd(11)} ${conBook}/${righe.length}${conBook < righe.length ? '  ⚠️ manca su: ' + [...new Set(righe.filter(r => !r.book_1).map(r => r.div))].join(' ') : ''}`);
}
if (sconosciute.size) {
  console.log(`\n  ⚠️  squadre non riconosciute — partite SALTATE, da aggiungere a lib/nomi-squadre.js:`);
  for (const [k, v] of sconosciute) console.log(`      ${k.replace('|', '  "')}"  →  tradotto in "${v}", non in archivio`);
}

// ⚠️⚠️ **Un nome sconosciuto vale 1 solo nei quindici campionati di
// football-data.** Lì le squadre cambiano tre volte l'anno e un nome nuovo è
// un segnale: va aggiunto alla mappa, e il codice 1 serve a farlo notare
// fermando la routine. In Champions no — le partecipanti **cambiano ogni
// stagione per costruzione**, e i qualificati portano club che non abbiamo mai
// visto. Fermare l'aggiornamento del martedì perché una squadra albanese ha
// superato il turno sarebbe il rimedio peggiore del male: la partita si salta,
// l'avviso resta scritto, la routine prosegue.
const soloEspn = new Set(Object.keys(COMPETIZIONI));
const gravi = [...sconosciute.keys()].filter(k => !soloEspn.has(k.split('|')[0]));
if (sconosciute.size && !gravi.length) console.log('  (tutte in competizioni ESPN: la routine prosegue)');
// ⚠️ Una partita rinviata si SPOSTA alla data nuova invece di nascere due
// volte: la chiave contiene la data (29/10/2026, `lib/rinvii.js`). Si
// guardano solo i campionati presi in questo giro: uno caduto non sposta niente.
const spostate = await spostaRinviate(sql, righe, { esegui: ESEGUI });
if (spostate.length) console.log(`\n  rinviate (${spostate.length}):\n${descriviSpostamenti(spostate).join('\n')}`);
if (!ESEGUI || !righe.length) { await chiudi(); process.exit(gravi.length ? 1 : 0); }

const COL = ['div', 'campionato', 'data', 'ora', 'casa', 'trasferta', 'fonte',
  'avg_ap_1', 'avg_ap_x', 'avg_ap_2', 'max_ap_1', 'max_ap_x', 'max_ap_2', 'bfe_ap_1', 'bfe_ap_x', 'bfe_ap_2',
  'book', 'book_1', 'book_x', 'book_2',
  'avg_ap_over25', 'avg_ap_under25', 'max_ap_over25', 'max_ap_under25',
  'avg_ap_over35', 'avg_ap_under35', 'max_ap_over35', 'max_ap_under35'];
// ⚠️ Queste quattro possono essere **null** quando meno di tre book quotano il
// 2,5, e football-data invece le riempie sempre per il blocco imminente: senza
// `coalesce` un giro di The Odds API cancellerebbe un dato buono con un vuoto.
// È la stessa ragione per cui `b365_*` non è in questa lista.
// ⚠️ La 3,5 entra nella stessa protezione della 2,5: un giro in cui meno di
// tre book quotano quella linea **non deve cancellare** quello che avevamo
// preso prima. Vale ancora di più qui, perché la 3,5 è la linea principale
// solo per un quarto dei bookmaker e capita che per una partita non ci sia.
const NON_CANCELLARE = new Set(['avg_ap_over25', 'avg_ap_under25', 'max_ap_over25', 'max_ap_under25',
  'avg_ap_over35', 'avg_ap_under35', 'max_ap_over35', 'max_ap_under35']);
const daAggiornare = COL.filter(c => !['div', 'data', 'casa', 'trasferta'].includes(c));
const pulite = righe.map(r => Object.fromEntries(COL.map(c => [c, r[c]])));

await sql`
  insert into prossime_partite ${sql(pulite, ...COL)}
  on conflict (div, data, casa, trasferta) do update set
    ${sql(daAggiornare.reduce((acc, c) => ({ ...acc,
      [c]: NON_CANCELLARE.has(c)
        ? sql`coalesce(excluded.${sql(c)}, prossime_partite.${sql(c)})`
        : sql`excluded.${sql(c)}` }), {}))},
    scaricato_il = now()
`;
const [{ tot, future }] = await sql`select count(*)::int as tot, count(*) filter (where data >= current_date)::int as future from prossime_partite`;
console.log(`\n✓ salvate ${righe.length} · in tabella ${tot} partite, ${future} ancora da giocare`);
await chiudi();
