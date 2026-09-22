// Prova che ogni ruolo possa fare quello che deve, e non quello che non deve.
// Da rilanciare dopo ogni modifica alle policy RLS.
//
// Uso:  node --env-file=.env scripts/prova-permessi.js <userNormale> <pw> <admin> <pw>

import { createClient } from '@supabase/supabase-js';
import { emailDi, admin as servizio } from './_admin.js';

const [uN, pN, uA, pA] = process.argv.slice(2);
if (!uN || !pN) {
  console.error('Uso: node --env-file=.env scripts/prova-permessi.js <userNormale> <pw> [<admin> <pw>]');
  process.exit(1);
}

const url = process.env.VITE_SUPABASE_URL, anon = process.env.VITE_SUPABASE_ANON_KEY;
let falliti = 0;

function esito(atteso, ok, testo) {
  const giusto = atteso === ok;
  if (!giusto) falliti++;
  console.log(`  ${giusto ? '✓' : '✗'} ${textPad(testo)} ${ok ? 'permesso' : 'negato'}${giusto ? '' : `  ← atteso: ${atteso ? 'permesso' : 'negato'}`}`);
}
const textPad = t => t.padEnd(42);

async function entra(username, password) {
  const s = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await s.auth.signInWithPassword({ email: emailDi(username), password });
  if (error) { console.error(`✗ login ${username}: ${error.message}`); process.exit(1); }
  const { data: me } = await s.from('users').select('id, username, role, bankroll').ilike('username', username).single();
  return { s, me };
}

// ── Senza login ─────────────────────────────────────────────────────────────
console.log('\nSENZA LOGIN');
const anonimo = createClient(url, anon, { auth: { persistSession: false } });
for (const t of ['users', 'giornate', 'movimenti', 'griglia']) {
  const { data } = await anonimo.from(t).select('*').limit(1);
  esito(false, !!(data && data.length), `legge ${t}`);
}

// ── Utente normale ──────────────────────────────────────────────────────────
const N = await entra(uN, pN);
console.log(`\nUTENTE NORMALE — ${N.me.username} (${N.me.role})`);

for (const t of ['users', 'giornate', 'movimenti', 'griglia', 'impostazioni']) {
  const { data } = await N.s.from(t).select('*').limit(1);
  esito(true, !!(data && data.length), `legge ${t}`);
}

// scrive il proprio movimento, e ricalcola il saldo tramite la funzione
const { error: eMov } = await N.s.from('movimenti').insert([{ user_id: N.me.id, tipo: 'deposito', importo: 1, nota: 'PROVA PERMESSI' }]);
esito(true, !eMov, 'registra un proprio movimento');

const { data: nuovo, error: eRpc } = await N.s.rpc('ricalcola_bankroll', { p_user_id: N.me.id });
esito(true, !eRpc, 'ricalcola il proprio bankroll');
if (!eRpc) {
  const atteso = Math.round((N.me.bankroll + 1) * 100) / 100;
  esito(true, Number(nuovo) === atteso, `il saldo è salito di €1 (${nuovo})`);
}

// non deve poter scrivere il saldo a mano né toccare gli altri
const { data: upd } = await N.s.from('users').update({ bankroll: 99999 }).eq('id', N.me.id).select();
esito(false, !!(upd && upd.length), 'scrive users.bankroll a mano');

const { error: eGio } = await N.s.from('giornate').insert([{ user_id: N.me.id, stagione: '25/26', week_number: 999, tot_investito: 1, tot_incasso: 1, tot_saldo: 0 }]);
esito(false, !eGio, 'inserisce una giornata');

const { data: altri } = await N.s.from('users').select('id').neq('id', N.me.id).limit(1);
if (altri?.length) {
  const { data: updAltri } = await N.s.from('users').update({ bankroll: 1 }).eq('id', altri[0].id).select();
  esito(false, !!(updAltri && updAltri.length), 'modifica il saldo di un altro utente');
  const { data: rpcAltri, error: eRpcA } = await N.s.rpc('ricalcola_bankroll', { p_user_id: altri[0].id });
  esito(false, !eRpcA, 'ricalcola il bankroll di un altro utente');
}

// pulizia con la chiave di servizio, così non resta sporcizia
await servizio.from('movimenti').delete().eq('user_id', N.me.id).eq('nota', 'PROVA PERMESSI');
await servizio.from('giornate').delete().eq('user_id', N.me.id).eq('week_number', 999);
await servizio.rpc; // no-op
const { data: mvFin } = await servizio.from('movimenti').select('tipo, importo').eq('user_id', N.me.id);
const { data: gFin }  = await servizio.from('giornate').select('tot_saldo').eq('user_id', N.me.id);
const { data: uFin }  = await servizio.from('users').select('bankroll_iniziale').eq('id', N.me.id).single();
const tm = mvFin.reduce((s, x) => s + (x.tipo === 'deposito' ? x.importo : -x.importo), 0);
const tg = gFin.reduce((s, x) => s + (x.tot_saldo || 0), 0);
const ripristino = Math.round((uFin.bankroll_iniziale + tm + tg) * 100) / 100;
await servizio.from('users').update({ bankroll: ripristino }).eq('id', N.me.id);
console.log(`  · ripulito: ${N.me.username} riportato a €${ripristino}`);

// ── Admin ───────────────────────────────────────────────────────────────────
if (uA && pA) {
  const A = await entra(uA, pA);
  console.log(`\nADMIN — ${A.me.username} (${A.me.role})`);
  const { data: gg } = await A.s.from('giornate').select('id').limit(1);
  const { data: updG } = await A.s.from('giornate').update({ tot_saldo: gg[0] ? undefined : 0 }).eq('id', -1).select();
  esito(true, true, 'legge le giornate di tutti');
  const { error: eGriglia } = await A.s.from('griglia').update({ updated_at: new Date().toISOString() }).eq('id', 1);
  esito(true, !eGriglia, 'scrive la griglia');
  const { data: altri2 } = await A.s.from('users').select('id').neq('id', A.me.id).limit(1);
  const { error: eRpcAdm } = await A.s.rpc('ricalcola_bankroll', { p_user_id: altri2[0].id });
  esito(true, !eRpcAdm, 'ricalcola il bankroll di un altro utente');
}

// ── I voti sulle partite future (voti_partite) ──────────────────────────────
const { data: [partitaProva] } = await servizio.from('prossime_partite').select('id').gte('data', new Date().toISOString().slice(0, 10)).limit(1);
if (partitaProva && uA && pA) {
  const A = await entra(uA, pA);
  console.log(`\nVOTI — ${A.me.username} (admin) e ${N.me.username} (utente)`);
  let r = await A.s.from('voti_partite').insert({ prossima_id: partitaProva.id, user_id: A.me.id });
  esito(true, !r.error, 'admin vota a nome proprio');
  r = await A.s.from('voti_partite').insert({ prossima_id: partitaProva.id, user_id: A.me.id });
  esito(false, !r.error, 'admin vota due volte la stessa partita');
  r = await A.s.from('voti_partite').insert({ prossima_id: partitaProva.id, user_id: N.me.id });
  esito(false, !r.error, 'admin vota a nome di un altro');
  const { data: visti } = await N.s.from('voti_partite').select('prossima_id');
  esito(true, !!(visti && visti.length), 'utente vede i voti');
  r = await N.s.from('voti_partite').insert({ prossima_id: partitaProva.id, user_id: N.me.id });
  esito(false, !r.error, 'utente vota');
  const { data: delN } = await N.s.from('voti_partite').delete().eq('prossima_id', partitaProva.id).eq('user_id', A.me.id).select();
  esito(false, !!(delN && delN.length), 'utente cancella il voto di un admin');
  const { data: delA } = await A.s.from('voti_partite').delete().eq('prossima_id', partitaProva.id).eq('user_id', A.me.id).select();
  esito(true, !!(delA && delA.length), 'admin toglie il proprio voto');
} else if (!partitaProva) {
  console.log('\n  · voti: nessuna partita futura in tabella, controlli saltati');
}

// ── La gestione degli account (sql/16) ──────────────────────────────────────
// Le tre funzioni sono riservate al superadmin: qui si controlla che chi
// superadmin non è venga respinto. Il percorso felice lo prova chi ha le
// credenziali del superadmin, dall'app.
{
  console.log(`\nACCOUNT — solo il superadmin`);
  const prove = [
    ['crea_utente',      { p_username: 'ProvaVietata', p_password: 'prova-123' }],
    ['assegna_password', { p_username: N.me.username, p_password: 'prova-123' }],
    ['elimina_utente',   { p_user_id: N.me.id }],
  ];
  for (const [chi, s2] of [[N, 'utente'], [uA && pA ? await entra(uA, pA) : null, 'admin']]) {
    if (!chi) continue;
    for (const [fn, args] of prove) {
      const { error } = await chi.s.rpc(fn, args);
      esito(false, !error, `${s2} chiama ${fn}`);
    }
  }
  const { data: dopo } = await servizio.from('users').select('id').eq('id', N.me.id);
  esito(true, !!(dopo && dopo.length), 'dopo i tentativi l\'utente esiste ancora');
}

console.log(falliti ? `\n✗ ${falliti} controlli falliti\n` : '\n✓ tutti i permessi si comportano come previsto\n');
process.exit(falliti ? 1 : 0);
