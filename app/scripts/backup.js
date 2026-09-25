// Backup completo del database Supabase di BetterTrade.
//
// Scarica tutte le tabelle in JSON dentro backup/<timestamp>/, una per file.
// Serve prima di qualsiasi modifica allo schema: è la rete di sicurezza.
//
// ⚠️ Il dump contiene le password in chiaro (finché non le mettiamo al sicuro).
//    La cartella backup/ è gitignorata: NON committarla, non mandarla in chat.
//
// Uso:
//   node --env-file=.env scripts/backup.js
//
// .env richiesto (nella cartella app/):
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY=eyJ...

import { mkdirSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Con RLS attiva la chiave anon non legge più niente: un backup fatto con
// quella tornerebbe vuoto senza dare errore. Serve la service_role.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('✗ Mancano VITE_SUPABASE_URL / SUPABASE_SERVICE_KEY in .env');
  console.error('  La service_role sta in: Supabase → Settings → API → service_role');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// Tutte le tabelle che l'app usa. `users` per prima: è la più importante.
const TABELLE = ['users', 'movimenti', 'giornate', 'griglia', 'impostazioni', 'inserite'];

// Supabase risponde al massimo 1000 righe per volta: si pagina con range().
async function scaricaTutto(tabella) {
  const PAGINA = 1000;
  const righe = [];
  for (let da = 0; ; da += PAGINA) {
    const { data, error } = await supabase.from(tabella).select('*').range(da, da + PAGINA - 1);
    if (error) throw error;
    righe.push(...data);
    if (data.length < PAGINA) return righe;
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dir = new URL(`../backup/${stamp}/`, import.meta.url);
mkdirSync(dir, { recursive: true });

console.log(`Backup in backup/${stamp}/\n`);

let totale = 0;
const esiti = [];

for (const tabella of TABELLE) {
  try {
    const righe = await scaricaTutto(tabella);
    writeFileSync(new URL(`${tabella}.json`, dir), JSON.stringify(righe, null, 2));
    console.log(`  ✓ ${tabella.padEnd(14)} ${String(righe.length).padStart(5)} righe`);
    totale += righe.length;
    esiti.push({ tabella, righe: righe.length });
  } catch (err) {
    // Una tabella che non esiste o è protetta non deve fermare il resto del backup.
    console.log(`  ✗ ${tabella.padEnd(14)} ${err.message}`);
    esiti.push({ tabella, errore: err.message });
  }
}

writeFileSync(new URL('_manifest.json', dir), JSON.stringify({ data: new Date().toISOString(), url: SUPABASE_URL, esiti }, null, 2));

console.log(`\n${totale} righe salvate in backup/${stamp}/`);

if (totale === 0) {
  console.log('\n⚠️  Backup VUOTO: nessuna riga scaricata. Non fidarti di questo backup.');
  process.exit(1);
}

const falliti = esiti.filter(e => e.errore);
if (falliti.length) {
  console.log(`\n⚠️  ${falliti.length} tabelle non scaricate — controlla i messaggi sopra prima di procedere.`);
  process.exit(1);
}
console.log('Backup completo. Ora si può procedere in sicurezza.');
