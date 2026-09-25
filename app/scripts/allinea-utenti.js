// Allinea le giornate di un utente a quelle di un altro.
//
// Serve quando due persone hanno giocato le stesse schedine e i numeri
// differiscono per errori di trascrizione: si sceglie quale dei due fa fede.
//
// ⚠️ Sovrascrive dei dati. Fai prima un backup:
//      node --env-file=.env scripts/backup.js
//
// Uso:
//   node --env-file=.env scripts/allinea-utenti.js MarcoM Christian
//     → prova a vuoto: mostra cosa cambierebbe in MarcoM per renderlo uguale a Christian
//   node --env-file=.env scripts/allinea-utenti.js MarcoM Christian --esegui
//     → scrive: MarcoM prende i numeri di Christian

import { admin } from './_admin.js';

const args = process.argv.slice(2).filter(a => !a.startsWith('--'));
const ESEGUI = process.argv.includes('--esegui');
const [daModificare, riferimento] = args;

if (!daModificare || !riferimento) {
  console.error('Uso: node --env-file=.env scripts/allinea-utenti.js <da-modificare> <riferimento> [--esegui]');
  process.exit(1);
}

const carica = async n => {
  const { data: u } = await admin.from('users')
    .select('id, username, bankroll, bankroll_iniziale').ilike('username', n).single();
  if (!u) { console.error(`✗ utente "${n}" non trovato`); process.exit(1); }
  const { data: g } = await admin.from('giornate').select('*').eq('user_id', u.id);
  return { u, g };
};

const A = await carica(daModificare);   // quello che cambia
const B = await carica(riferimento);    // quello che fa fede

const chiave = x => `${x.stagione}|${x.week_number}`;
const perRif = new Map(B.g.map(x => [chiave(x), x]));

const daAggiornare = A.g.filter(x => {
  const y = perRif.get(chiave(x));
  return y && (x.tot_investito !== y.tot_investito || x.tot_incasso !== y.tot_incasso || x.tot_saldo !== y.tot_saldo);
});
const senzaCorrispondenza = A.g.filter(x => !perRif.has(chiave(x)));

console.log(ESEGUI ? '── ESECUZIONE\n' : '── PROVA A VUOTO — nessuna scrittura. Aggiungi --esegui per procedere.\n');
console.log(`  ${A.u.username} prende i numeri di ${B.u.username}`);
console.log(`  giornate da aggiornare: ${daAggiornare.length}`);
if (senzaCorrispondenza.length)
  console.log(`  ⚠️  ${senzaCorrispondenza.length} giornate di ${A.u.username} non esistono in ${B.u.username}: restano invariate`);

let scarto = 0;
for (const x of daAggiornare) {
  const y = perRif.get(chiave(x));
  scarto += x.tot_saldo - y.tot_saldo;
  console.log(`    ${chiave(x).padEnd(11)} saldo ${String(x.tot_saldo).padStart(9)} → ${String(y.tot_saldo).padStart(9)}`);
}
const arr = n => Math.round(n * 100) / 100;
if (daAggiornare.length) console.log(`\n  scarto da recuperare: €${arr(scarto).toFixed(2)}`);
console.log(`  bankroll ${A.u.username}: €${A.u.bankroll} → €${arr(A.u.bankroll - scarto)}`);

if (!ESEGUI || !daAggiornare.length) {
  if (!daAggiornare.length) console.log('\n→ niente da fare: le giornate sono già allineate');
  process.exit(0);
}

for (const x of daAggiornare) {
  const y = perRif.get(chiave(x));
  const { error } = await admin.from('giornate')
    .update({ tot_investito: y.tot_investito, tot_incasso: y.tot_incasso, tot_saldo: y.tot_saldo })
    .eq('id', x.id);
  if (error) { console.error('✗', chiave(x), error.message); process.exit(1); }
}
console.log(`\n✓ ${daAggiornare.length} giornate allineate`);

// Ricalcolo con la stessa formula di src/lib/bankroll.js
const [{ data: mv }, { data: gg }] = await Promise.all([
  admin.from('movimenti').select('tipo, importo').eq('user_id', A.u.id),
  admin.from('giornate').select('tot_saldo').eq('user_id', A.u.id),
]);
const totMov = mv.reduce((s, x) => s + (x.tipo === 'deposito' ? x.importo : -x.importo), 0);
const totGio = gg.reduce((s, x) => s + (x.tot_saldo || 0), 0);
const nuovo = arr(A.u.bankroll_iniziale + totMov + totGio);
const { error } = await admin.from('users').update({ bankroll: nuovo }).eq('id', A.u.id);
if (error) { console.error('✗ bankroll:', error.message); process.exit(1); }

console.log(`✓ ${A.u.username}: bankroll €${nuovo}   (${B.u.username}: €${B.u.bankroll})`);
