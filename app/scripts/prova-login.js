// Prova un login vero, come lo farebbe il browser. Serve a distinguere un
// problema di credenziali da un problema dell'app.
//
// Uso:  node --env-file=.env scripts/prova-login.js <username> <password>

import { createClient } from '@supabase/supabase-js';
import { emailDi } from './_admin.js';

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error('Uso: node --env-file=.env scripts/prova-login.js <username> <password>');
  process.exit(1);
}

const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const { data, error } = await s.auth.signInWithPassword({ email: emailDi(username), password });
if (error) { console.log('✗ login fallito:', error.message); process.exit(1); }
console.log('✓ login riuscito · auth uid', data.user.id);

const { data: prof, error: e2 } = await s.from('users')
  .select('username, role, bankroll').eq('auth_id', data.user.id).single();
console.log(e2 ? '✗ profilo non trovato: ' + e2.message
              : `✓ profilo: ${prof.username} · ${prof.role} · €${prof.bankroll}`);
