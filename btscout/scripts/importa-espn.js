// IMPORTA DA ESPN: completa le partite che abbiamo e recupera quelle che
// football-data non ha ancora pubblicato.
//
//   node --env-file=.env scripts/importa-espn.js --campionati=I1 --giorni=30
//   ... --esegui              per scrivere davvero
//   ... --da=2026-09-01 --a=2026-10-12
//
// ⚠️ **Prova a vuoto di default**, come ogni script che tocca i dati.
//
// ⚠️⚠️ **LA REGOLA CHE TIENE PULITO L'ARCHIVIO: non si indovina mai.**
// Una riga si scrive solo quando esiste **una e una sola** partita nostra che
// combacia su campionato, data (±1 giorno) **e tutt'e due le squadre**. Zero
// candidati, due candidati, un nome mai visto → la riga finisce in
// `importazioni` e **aspetta una persona** (pagina Importazioni nell'app).
// Un risultato messo sulla partita sbagliata non si vede, non si corregge e
// sporca ogni misura che ci sta sopra.

import { sql } from '../lib/db.js';
import { CAMPIONATI } from '../lib/espn.js';
import { aggiornaCampionato } from '../lib/risultati-espn.js';
import { giornoLocale } from '../lib/date.js';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d };
const ESEGUI = process.argv.includes('--esegui');
const DIVS = arg('campionati', 'I1').split(',').filter(x => CAMPIONATI[x]);
const GIORNI = Number(arg('giorni', 30));
const A = arg('a', giornoLocale(new Date()));
const DA = arg('da', giornoLocale(new Date(Date.now() - GIORNI * 864e5)));

if (!DIVS.length) { console.error('✗ nessun campionato valido. Disponibili:', Object.keys(CAMPIONATI).join(' ')); process.exit(1) }
console.log(`ESPN → ${DIVS.join(', ')} · dal ${DA} al ${A}${ESEGUI ? '' : '  (prova a vuoto)'}\n`);

// ⚠️ Il lavoro sta in `lib/risultati-espn.js` dal 30/10/2026: lo stesso che fa
// la funzione di Supabase lanciata dal tasto «Aggiorna risultati» dell'app.
// Qui resta solo il giro sui campionati e la stampa.
const conto = { viste: 0, completate: 0, create: 0, invariate: 0, collegate: 0, dubbie: 0, saltate: 0 };
const saltate = [], dubbie = [], create = [];
for (const div of DIVS) {
  const r = await aggiornaCampionato(sql, div, { da: DA, a: A, esegui: ESEGUI });
  console.log(`${div}: ${r.conto.nomi} nomi nostri in archivio · ${r.conto.giorni} giorni da guardare`);
  for (const k of Object.keys(conto)) conto[k] += r.conto[k];
  saltate.push(...r.saltate); dubbie.push(...r.dubbie); create.push(...r.create);
}

console.log(`\n${conto.viste} partite finite viste su ESPN`);
console.log(`  completate (possesso/tiri aggiunti)  ${conto.completate}`);
console.log(`  create (football-data non le ha)     ${conto.create}`);
console.log(`  già a posto, niente da aggiungere    ${conto.invariate}`);
console.log(`  collegate al calendario             ${conto.collegate}`);
console.log(`  da verificare a mano                 ${conto.dubbie}`);
if (conto.saltate) {
  console.log(`  ⚠️ saltate per errore della fonte     ${conto.saltate}  (rilancia per riprenderle)`);
  saltate.slice(0, 8).forEach(x => console.log(`     ${x}`));
}
if (create.length) {
  console.log('\n── create ──');
  create.forEach(x => console.log('  ' + x));
}
if (dubbie.length) {
  console.log('\n── da verificare ──');
  for (const d of dubbie.slice(0, 20))
    console.log(`  ${d.div} ${d.data}  ${d.casa} ${d.gol} ${d.trasferta}   → ${d.motivo}`);
  if (dubbie.length > 20) console.log(`  … e altre ${dubbie.length - 20}`);
}
if (!ESEGUI) console.log('\nprova a vuoto: non ho scritto niente. Aggiungi --esegui.');
await sql.end();

// ⚠️ `andamento` è derivata da `partite`: se questo import ha portato risultati
// nuovi, la pagina Andamento resta indietro finché qualcuno non la ricalcola a
// mano — ed è esattamente quello che non succedeva (ferma al 4/10 per tre
// giorni). Si ricalcola solo la stagione in corso, e un suo errore non tocca i
// dati appena importati: sono già scritti.
if (ESEGUI && conto.create + conto.completate > 0) {
  console.log('\n── pagina Andamento ──');
  try {
    execFileSync(process.execPath,
      ['--env-file=.env', join(dirname(fileURLToPath(import.meta.url)), 'calcola-andamento.js'), '--stagioni=1', '--esegui'],
      { stdio: 'inherit', cwd: join(dirname(fileURLToPath(import.meta.url)), '..') });
  } catch (e) {
    console.error(`⚠️ ricalcolo fallito (codice ${e.status}): i dati sono a posto, la pagina Andamento resta indietro.`);
  }
}
