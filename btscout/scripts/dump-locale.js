// Scarica la tabella `partite` da Neon in una cache locale (.cache/partite.json).
// I backtest di esplorazione leggono da qui invece che dalla rete: più veloce e
// immune ai cali di connessione (es. il Mac che va in sleep). Da rilanciare dopo
// ogni import che cambia i dati.
//
// Uso:  node --env-file=.env scripts/dump-locale.js

import { sql, chiudi } from '../lib/db.js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';


const righe = await sql`SELECT * FROM partite ORDER BY div, data, casa`;

const cacheDir = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache');
mkdirSync(cacheDir, { recursive: true });
const file = join(cacheDir, 'partite.json');
writeFileSync(file, JSON.stringify(righe));

console.log(`Scritte ${righe.length} partite in ${file}`);

// La connessione è un socket aperto: senza chiuderla lo script non termina.
await chiudi();
