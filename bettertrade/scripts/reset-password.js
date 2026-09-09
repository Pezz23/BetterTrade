// Assegna una password nuova a un utente. Da usare quando qualcuno la perde.
//
// Uso:
//   node --env-file=.env scripts/reset-password.js Bermani
//   node --env-file=.env scripts/reset-password.js Bermani "password-scelta-a-mano"

import { admin } from './_admin.js';
import { generaPassword } from './_admin.js';

const [username, passwordScelta] = process.argv.slice(2);

if (!username) {
  console.error('Uso: node --env-file=.env scripts/reset-password.js <username> [password]');
  process.exit(1);
}

const { data: utente, error } = await admin
  .from('users').select('id, username, role, auth_id').ilike('username', username).single();

if (error || !utente) { console.error(`✗ Utente "${username}" non trovato`); process.exit(1); }
if (!utente.auth_id)  { console.error(`✗ "${utente.username}" non è agganciato ad Auth: lancia prima migra-auth.js`); process.exit(1); }

const password = passwordScelta || generaPassword();
const { error: errUpd } = await admin.auth.admin.updateUserById(utente.auth_id, { password });
if (errUpd) { console.error('✗', errUpd.message); process.exit(1); }

console.log(`\n✓ Password aggiornata\n`);
console.log(`  utente:   ${utente.username} (${utente.role})`);
console.log(`  password: ${password}\n`);
console.log('Consegnala a voce o di persona, non per iscritto.');
