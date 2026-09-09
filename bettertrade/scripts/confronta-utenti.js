// Confronta le giornate di due utenti, senza scrivere niente.
//
// Uso:  node --env-file=.env scripts/confronta-utenti.js MarcoM Christian

import { admin } from './_admin.js';

const [nomeA, nomeB] = process.argv.slice(2);
if (!nomeA || !nomeB) {
  console.error('Uso: node --env-file=.env scripts/confronta-utenti.js <utenteA> <utenteB>');
  process.exit(1);
}

const carica = async n => {
  const { data: u } = await admin.from('users')
    .select('id, username, bankroll, bankroll_iniziale').ilike('username', n).single();
  if (!u) { console.error(`✗ utente "${n}" non trovato`); process.exit(1); }
  const { data: g } = await admin.from('giornate').select('*').eq('user_id', u.id);
  return { u, g };
};

const A = await carica(nomeA), B = await carica(nomeB);
const chiave = x => `${x.stagione}|${x.week_number}`;
const mA = new Map(A.g.map(x => [chiave(x), x]));
const mB = new Map(B.g.map(x => [chiave(x), x]));

for (const { u, g } of [A, B])
  console.log(`${u.username.padEnd(12)} iniziale €${u.bankroll_iniziale} · bankroll €${u.bankroll} · ${g.length} giornate`);

const soloA = [...mA.keys()].filter(k => !mB.has(k));
const soloB = [...mB.keys()].filter(k => !mA.has(k));
if (soloA.length) console.log(`\nsolo ${A.u.username}: ${soloA.length} → ${soloA.join(' ')}`);
if (soloB.length) console.log(`solo ${B.u.username}: ${soloB.length} → ${soloB.join(' ')}`);

const diversi = [...mA.keys()].filter(k => {
  const x = mA.get(k), y = mB.get(k);
  return y && (x.tot_investito !== y.tot_investito || x.tot_incasso !== y.tot_incasso || x.tot_saldo !== y.tot_saldo);
});

console.log(`\ngiornate con numeri diversi: ${diversi.length}`);
let scarto = 0;
for (const k of diversi) {
  const x = mA.get(k), y = mB.get(k);
  const d = x.tot_saldo - y.tot_saldo;
  scarto += d;
  console.log(`  ${k.padEnd(11)} ${A.u.username}: inv ${String(x.tot_investito).padStart(6)} inc ${String(x.tot_incasso).padStart(8)} · ${B.u.username}: inv ${String(y.tot_investito).padStart(6)} inc ${String(y.tot_incasso).padStart(8)} · scarto ${d.toFixed(2).padStart(7)}`);
}
if (diversi.length) console.log(`\nscarto complessivo: €${(Math.round(scarto*100)/100).toFixed(2)}`);
if (!diversi.length && !soloA.length && !soloB.length) console.log('→ le giornate dei due utenti sono già identiche');
