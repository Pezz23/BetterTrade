// Dove siamo nella migrazione delle password. Si legge con la sola chiave anon,
// quindi si può lanciare in qualsiasi momento senza service_role.
//
// Uso:  node --env-file=.env scripts/stato-migrazione.js

import { createClient } from '@supabase/supabase-js';

// Con RLS attiva la chiave anon non legge più niente: per contare gli utenti
// serve la service_role, se disponibile. Il controllo su cosa vede anon resta
// comunque fatto con la chiave anon, più sotto.
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const esito = [];
const riga = (ok, testo, extra = '') => esito.push(`  ${ok ? '✓' : '·'} ${testo}${extra ? '  ' + extra : ''}`);

// 1 — la colonna auth_id esiste?
const { error: errAuthId } = await supabase.from('users').select('auth_id').limit(1);
const haAuthId = !errAuthId;
riga(haAuthId, 'Passo 1 — colonna auth_id', haAuthId ? '' : '→ esegui sql/01-auth-id.sql');

// 2 — quanti utenti sono già agganciati?
let agganciati = 0, totale = 0;
if (haAuthId) {
  const { data } = await supabase.from('users').select('username, auth_id');
  if (data) {
    totale = data.length;
    agganciati = data.filter(u => u.auth_id).length;
  }
}
riga(haAuthId && agganciati === totale && totale > 0,
     `Passo 2 — account Auth creati`,
     haAuthId ? `${agganciati}/${totale}` + (agganciati < totale ? '  → node --env-file=.env scripts/migra-auth.js --esegui' : '') : '');

// 3 — la colonna password esiste ancora?
const { error: errPw } = await supabase.from('users').select('password').limit(1);
const passwordVia = !!errPw;
riga(passwordVia, 'Passo 5 — password in chiaro rimosse', passwordVia ? '' : '→ ancora presenti in users.password');

// 4 — RLS attiva? Senza login, con la sola chiave anon, non si deve leggere niente.
const anonimo = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const { data: visibili } = await anonimo.from('users').select('id');
const rlsAttiva = !visibili || visibili.length === 0;
riga(rlsAttiva, 'Passo 4 — RLS attiva (anon non legge users)',
     rlsAttiva ? '' : `→ anon vede ancora ${visibili.length} righe · esegui sql/02-rls.sql`);

console.log('\nSTATO MIGRAZIONE PASSWORD\n');
console.log(esito.join('\n'));
console.log('\nRunbook completo: MIGRAZIONE-AUTH.md\n');
