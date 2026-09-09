// Crea un nuovo utente: account Auth + riga in public.users, agganciati.
//
// Uso:
//   node --env-file=.env scripts/crea-utente.js <username> [ruolo] [bankroll] ["Nome Visualizzato"]
//
// Esempi:
//   node --env-file=.env scripts/crea-utente.js mario
//   node --env-file=.env scripts/crea-utente.js mario user 500 "Mario Rossi"

import { admin, emailDi, generaPassword } from './_admin.js';

const [username, ruolo = 'user', bankrollArg = '0', displayName] = process.argv.slice(2);

if (!username) {
  console.error('Uso: node --env-file=.env scripts/crea-utente.js <username> [ruolo] [bankroll] ["Nome"]');
  process.exit(1);
}
if (!['user', 'admin', 'superadmin'].includes(ruolo)) {
  console.error(`✗ Ruolo "${ruolo}" non valido: user | admin | superadmin`);
  process.exit(1);
}

const bankroll = parseFloat(bankrollArg) || 0;
const email    = emailDi(username);
const password = generaPassword();

const { data: esistente } = await admin.from('users').select('id').ilike('username', username).maybeSingle();
if (esistente) { console.error(`✗ Lo username "${username}" è già preso`); process.exit(1); }

const { data: nuovo, error: errAuth } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
  user_metadata: { username, role: ruolo },
});
if (errAuth) { console.error('✗ Auth:', errAuth.message); process.exit(1); }

const { error: errRiga } = await admin.from('users').insert([{
  username,
  display_name: displayName || username,
  role: ruolo,
  bankroll,
  bankroll_iniziale: bankroll,
  auth_id: nuovo.user.id,
}]);

if (errRiga) {
  // Senza la riga in users l'account Auth è inutile e blocca l'email: si rimuove.
  await admin.auth.admin.deleteUser(nuovo.user.id);
  console.error('✗ users:', errRiga.message);
  process.exit(1);
}

console.log(`\n✓ Utente creato\n`);
console.log(`  username: ${username}`);
console.log(`  ruolo:    ${ruolo}`);
console.log(`  bankroll: €${bankroll.toFixed(2)}`);
console.log(`  password: ${password}\n`);
console.log('Consegnala a voce o di persona, non per iscritto.');
