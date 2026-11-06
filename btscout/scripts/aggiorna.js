// La routine di aggiornamento, in un comando solo. Da lanciare martedì e
// venerdì pomeriggio (dopo le 18, quando football-data ha raccolto le quote).
//
// Fa sei cose, in quest'ordine — l'ordine conta:
//   1. import-storico        i risultati delle partite giocate entrano in `partite`
//   2. importa-competizione  le coppe, Olanda 2 e Giappone: lì ESPN è l'unica fonte
//   3. riconcilia-prossime   le future già giocate trovano la loro riga nello storico
//   4. importa-prossime      il prossimo blocco da football-data, con Bet365
//   5. importa-prossime-odds tre settimane di partite da The Odds API, col consenso
//                            (crediti: si esegue SOLO con --esegui, mai a vuoto)
//   6. calcola-andamento     la tabella della pagina Andamento, sui risultati nuovi
//
// Se un passo fallisce si ferma lì: i passi dopo dipendono da quello prima.
// ⚠️ Due eccezioni. Il 6: `andamento` è una tabella **derivata** da `partite`,
// quindi nessuno degli altri passi dipende da lei e un suo errore non deve
// impedire i controlli sui dati veri. E il 2 (6/11/2026, Mattia: mancavano 45
// risultati di coppa, perché football-data non le copre): ESPN è una fonte non
// documentata, e se non risponde i campionati vanno aggiornati lo stesso.
// Tutte e due falliscono rumorosamente e la routine continua.
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
  ['1/6  risultati → storico',            'import-storico.js',         [`--stagioni=${stagioneInCorso}`]],
  ['2/6  coppe e leghe solo ESPN',         'importa-competizione.js',
    ['--comp=UCL,UEL,UECL,N2,JPN1', `--da=${new Date().getFullYear()}`, ...(ESEGUI ? ['--esegui'] : [])], true],
  ['3/6  future giocate → collegamento',   'riconcilia-prossime.js',    ESEGUI ? ['--esegui'] : []],
  ['4/6  prossimo blocco (football-data)', 'importa-prossime.js',       ESEGUI ? ['--esegui'] : []],
  // The Odds API costa crediti anche in prova a vuoto: senza --esegui si salta.
  ...(ESEGUI ? [['5/6  tre settimane (The Odds API)', 'importa-prossime-odds.js', ['--esegui']]] : []),
  // ⚠️ Solo la stagione in corso: il passato non cambia, e rifarlo tutto
  // vorrebbe dire riscrivere 101.000 righe identiche a ogni aggiornamento.
  // Per ricostruire l'archivio si lancia a mano con --stagioni=8.
  ['6/6  pagina Andamento', 'calcola-andamento.js', ESEGUI ? ['--stagioni=1', '--esegui'] : ['--stagioni=1'], true],
];

console.log(`AGGIORNAMENTO — ${new Date().toLocaleString('it-IT')}${ESEGUI ? '' : '  (prova a vuoto: solo lo storico scrive, The Odds API saltata)'}\n`);
let tolleratoFallito = false;
for (const [nome, script, args, tollerato] of passi) {
  console.log(`━━ ${nome} ━━`);
  try {
    execFileSync(process.execPath, ['--env-file=.env', join(qui, script), ...args], {
      stdio: 'inherit', cwd: join(qui, '..'),
    });
  } catch (e) {
    if (tollerato) {
      console.error(`\n⚠️ il passo "${nome}" è fallito (codice ${e.status}): la routine continua, quel pezzo resta indietro.`);
      tolleratoFallito = true;
    } else {
      console.error(`\n✗ fermato al passo "${nome}" (codice ${e.status}). I passi successivi non sono stati eseguiti.`);
      process.exit(e.status || 1);
    }
  }
  console.log();
}
// ⚠️ I controlli alla fine, e **non fermano la routine**: servono a dire cosa
// guardare, non a impedire l'aggiornamento. Il 12/10/2026 due dati sbagliati
// sono passati in silenzio perché nessuno chiedeva mai "è andato bene?".
console.log('━━ controlli ━━');
try {
  execFileSync(process.execPath, ['--env-file=.env', join(qui, 'controlla-dati.js')], {
    stdio: 'inherit', cwd: join(qui, '..'),
  });
} catch { /* esce 1 quando trova qualcosa: l'ha già scritto lui */ }

console.log(tolleratoFallito
  ? '⚠️ aggiornamento completato, ma un passo è fallito: è scritto sopra quale'
  : '✓ aggiornamento completato');
