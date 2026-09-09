// PASSO 2 — Crea un account Supabase Auth per ogni riga di public.users.
//
// Ogni utente riceve:
//   - un'email sintetica <username>@bettertrade.local, che non vedrà mai
//   - una password nuova, generata a caso, robusta
// e la riga users viene agganciata all'account tramite auth_id.
//
// Le password attuali (5 caratteri, in chiaro) NON vengono riusate: sono
// troppo deboli e sono già state esposte. Vengono sostituite.
//
// Lo script è ripetibile: se un utente ha già auth_id, lo salta.
//
// ⚠️ Richiede la chiave service_role — quella che bypassa RLS. Non deve MAI
//    finire nel bundle del frontend né in git. Sta in .env, che è gitignorato.
//
// Uso:
//   node --env-file=.env scripts/migra-auth.js            # prova a vuoto
//   node --env-file=.env scripts/migra-auth.js --esegui   # scrive davvero

import { writeFileSync } from 'node:fs';
import { admin, emailDi, generaPassword } from './_admin.js';

const ESEGUI = process.argv.includes('--esegui');

const { data: utenti, error } = await admin
  .from('users').select('id, username, role, auth_id').order('created_at');
if (error) { console.error('✗ Lettura users:', error.message); process.exit(1); }

if (!ESEGUI) console.log('── PROVA A VUOTO — nessuna scrittura. Aggiungi --esegui per procedere.\n');

const credenziali = [];
let creati = 0, saltati = 0;

for (const u of utenti) {
  if (u.auth_id) {
    console.log(`  · ${u.username.padEnd(14)} già agganciato, salto`);
    saltati++;
    continue;
  }

  const email = emailDi(u.username);
  const password = generaPassword();

  if (!ESEGUI) {
    console.log(`  → ${u.username.padEnd(14)} ${email.padEnd(30)} [password generata all'esecuzione]`);
    creati++;
    continue;
  }

  // email_confirm: true — nessuna mail viene inviata, l'account è subito valido.
  const { data: nuovo, error: errCreate } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: u.username, role: u.role },
  });
  if (errCreate) {
    console.log(`  ✗ ${u.username.padEnd(14)} ${errCreate.message}`);
    continue;
  }

  const { error: errLink } = await admin
    .from('users').update({ auth_id: nuovo.user.id }).eq('id', u.id);
  if (errLink) {
    // L'account Auth esiste ma la riga non è agganciata: va rimosso, altrimenti
    // al rilancio l'email risulterebbe già presa.
    await admin.auth.admin.deleteUser(nuovo.user.id);
    console.log(`  ✗ ${u.username.padEnd(14)} aggancio fallito (${errLink.message}), account rimosso`);
    continue;
  }

  console.log(`  ✓ ${u.username.padEnd(14)} ${email}`);
  credenziali.push({ username: u.username, role: u.role, email, password });
  creati++;
}

console.log(`\n${creati} da creare · ${saltati} già a posto`);

if (ESEGUI && credenziali.length) {
  const file = new URL('../backup/CREDENZIALI-NUOVE.txt', import.meta.url);
  const righe = [
    'CREDENZIALI BETTERTRADE — generate ' + new Date().toLocaleString('it-IT'),
    '',
    'Ogni persona fa login con USERNAME + PASSWORD. L\'email è interna, non serve.',
    'Consegna a mano, poi cancella questo file.',
    '',
    ...credenziali.map(c => `${c.username.padEnd(14)} ${c.role.padEnd(11)} ${c.password}`),
    '',
  ].join('\n');
  writeFileSync(file, righe);
  console.log('\n' + righe);
  console.log('Salvate anche in backup/CREDENZIALI-NUOVE.txt (gitignorato) — distribuiscile e cancella il file.');
}
