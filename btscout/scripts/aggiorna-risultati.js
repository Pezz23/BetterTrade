// L'AGGIORNAMENTO ORARIO DEI RISULTATI — leggero, da far girare ogni ora.
//
//   node --env-file=.env scripts/aggiorna-risultati.js            # prova a vuoto
//   node --env-file=.env scripts/aggiorna-risultati.js --esegui
//   pomelli: --giorni=3
//
// ⚠️⚠️ **Non è `aggiorna.js` più spesso, ed è il punto.** La routine del
// martedì e del venerdì scarica football-data, prende le quote da The Odds API
// (30 crediti a giro, 500 al mese) e ricalcola la tabella `andamento`: farla
// ogni ora brucerebbe il mese di crediti in diciassette ore. Questo invece fa
// **una cosa sola** — i risultati da ESPN, che è gratis e senza chiave — e
// costa zero crediti.
//
//   1. i quindici campionati: ESPN riempie i risultati delle partite finite
//      negli ultimi giorni (gol, tiri, angoli, cartellini, possesso);
//   2. le competizioni che solo ESPN copre (Champions, Europa, Olanda 2, J1):
//      le partite nuove entrano in `partite`.
//
// ⚠️ **Niente quote e niente `andamento`.** Le quote servono alle partite
// *future* e cambiano col mercato, non con un risultato; `andamento` è una
// tabella derivata e si ricalcola quando arriva lo storico vero, non a ogni
// gol. Chi guarda l'app vede i risultati aggiornati, e il resto resta
// governato dalla routine.
//
// ⚠️ Se un passo fallisce **la routine continua**: qui nessun passo dipende da
// quello prima, e una fonte non documentata che non risponde per un'ora non
// deve fermare anche l'altra.

import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const qui = dirname(fileURLToPath(import.meta.url));
const ESEGUI = process.argv.includes('--esegui');
const arg = (n, d) => { const a = process.argv.find(x => x.startsWith(`--${n}=`)); return a ? a.split('=')[1] : d };
const GIORNI = arg('giorni', '3');

// I quindici di football-data: qui ESPN **arricchisce**, non crea.
const LEGHE = 'E0,E1,I1,I2,SP1,SP2,D1,D2,F1,F2,P1,N1,T1,B1,SC0';
// Le competizioni dove ESPN è l'unica fonte: qui ESPN **crea** la riga.
const COMPETIZIONI = 'UCL,UEL,UECL,N2,JPN1';

const passi = [
  ['risultati dei campionati', 'importa-espn.js', [`--campionati=${LEGHE}`, `--giorni=${GIORNI}`]],
  // ⚠️ `--da` all'anno in corso e non al 2016: ogni ora si guarda **adesso**,
  // e ripercorrere dieci stagioni sarebbe un recupero, non un aggiornamento.
  ['competizioni solo ESPN', 'importa-competizione.js', [`--comp=${COMPETIZIONI}`, `--da=${new Date().getFullYear()}`]],
];

console.log(`Aggiornamento risultati · ultimi ${GIORNI} giorni${ESEGUI ? '' : '  (prova a vuoto)'}\n`);
let falliti = 0;
for (const [nome, script, args] of passi) {
  console.log(`── ${nome}`);
  try {
    execFileSync(process.execPath, ['--env-file=.env', join(qui, script), ...args, ...(ESEGUI ? ['--esegui'] : [])],
      { cwd: join(qui, '..'), stdio: 'inherit' });
  } catch (e) {
    falliti++;
    console.error(`⚠️ "${nome}" è fallito (codice ${e.status}). Gli altri passi continuano.`);
  }
}
console.log(falliti ? `\n⚠️ finito con ${falliti} passo/i fallito/i` : '\n✓ finito');
process.exit(0);
