// La routine di aggiornamento, in un comando solo. Da lanciare martedì e
// venerdì pomeriggio (dopo le 18, quando football-data ha raccolto le quote).
//
// Fa quattro cose, in quest'ordine — l'ordine conta:
//   1. import-storico        i risultati delle partite giocate entrano in `partite`
//   2. riconcilia-prossime   le future già giocate trovano la loro riga nello storico
//   3. importa-prossime      il prossimo blocco da football-data, con Bet365
//   4. importa-prossime-odds tre settimane di partite da The Odds API, col consenso
//                            (30 crediti: si esegue SOLO con --esegui, mai a vuoto)
//
// Se un passo fallisce si ferma lì: i passi dopo dipendono da quello prima.
// È il comando che un giorno il pulsante "Aggiorna" nell'app dovrà eseguire.
//
// Uso:
//   node --env-file=.env scripts/aggiorna.js            # prova a vuoto dove possibile
//   node --env-file=.env scripts/aggiorna.js --esegui

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ESEGUI = process.argv.includes('--esegui');
const qui = dirname(fileURLToPath(import.meta.url));
const stagioneInCorso = '2627';

const passi = [
  ['1/4  risultati → storico',            'import-storico.js',         [`--stagioni=${stagioneInCorso}`]],
  ['2/4  future giocate → collegamento',   'riconcilia-prossime.js',    ESEGUI ? ['--esegui'] : []],
  ['3/4  prossimo blocco (football-data)', 'importa-prossime.js',       ESEGUI ? ['--esegui'] : []],
  // The Odds API costa crediti anche in prova a vuoto: senza --esegui si salta.
  ...(ESEGUI ? [['4/4  tre settimane (The Odds API)', 'importa-prossime-odds.js', ['--esegui']]] : []),
];

console.log(`AGGIORNAMENTO — ${new Date().toLocaleString('it-IT')}${ESEGUI ? '' : '  (prova a vuoto: solo lo storico scrive, The Odds API saltata)'}\n`);
for (const [nome, script, args] of passi) {
  console.log(`━━ ${nome} ━━`);
  try {
    execFileSync(process.execPath, ['--env-file=.env', join(qui, script), ...args], {
      stdio: 'inherit', cwd: join(qui, '..'),
    });
  } catch (e) {
    console.error(`\n✗ fermato al passo "${nome}" (codice ${e.status}). I passi successivi non sono stati eseguiti.`);
    process.exit(e.status || 1);
  }
  console.log();
}
console.log('✓ aggiornamento completato');
